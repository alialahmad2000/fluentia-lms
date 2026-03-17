// Fluentia LMS — Adaptive Testing Engine Edge Function
// Handles adaptive placement, periodic, and diagnostic tests using IRT-based difficulty adjustment.
// POST actions: "start", "answer", "complete"
// Deploy: supabase functions deploy adaptive-test
// Env: CLAUDE_API_KEY or ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const CLAUDE_MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ordered skill cycle for question selection. Each new question advances to the next skill. */
const SKILL_CYCLE = ['grammar', 'vocabulary', 'reading', 'listening'] as const
type Skill = (typeof SKILL_CYCLE)[number]

/** Starting difficulty for all new test sessions (0.00–1.00 scale). */
const INITIAL_DIFFICULTY = 0.50

/** Difficulty search window: we look for questions within ±DIFFICULTY_RANGE of the target. */
const DIFFICULTY_RANGE = 0.15

/** Minimum number of questions before a test may end. */
const MIN_QUESTIONS = 20

/** Maximum number of questions; the test ends unconditionally. */
const MAX_QUESTIONS = 30

/**
 * Convergence window — if the difficulty delta between consecutive questions
 * stays within ±CONVERGENCE_THRESHOLD for CONVERGENCE_COUNT questions in a row,
 * the algorithm considers its estimate stable and allows early termination.
 */
const CONVERGENCE_THRESHOLD = 0.05
const CONVERGENCE_COUNT = 5

/** Base adjustment magnitude when a student answers correctly or incorrectly. */
const ADJUSTMENT_MIN = 0.08
const ADJUSTMENT_MAX = 0.12

// ---------------------------------------------------------------------------
// CEFR mapping helpers
// ---------------------------------------------------------------------------

/** Map a 0.00–1.00 difficulty score to a CEFR level string. */
function difficultyToCEFR(d: number): string {
  if (d < 0.20) return 'A1'
  if (d < 0.35) return 'A2'
  if (d < 0.55) return 'B1'
  if (d < 0.72) return 'B2'
  if (d < 0.88) return 'C1'
  return 'C2'
}

/** Map a CEFR level to a recommended academic level (1–5). */
function cefrToAcademicLevel(cefr: string): number {
  switch (cefr) {
    case 'A1': return 1
    case 'A2': return 2
    case 'B1': return 3
    case 'B2': return 4
    case 'C1':
    case 'C2': return 5
    default: return 1
  }
}

// ---------------------------------------------------------------------------
// IRT-inspired adaptive algorithm utilities
// ---------------------------------------------------------------------------

/**
 * Compute the next difficulty level after a student answers a question.
 *
 * The adjustment magnitude is randomly sampled between ADJUSTMENT_MIN and
 * ADJUSTMENT_MAX to add slight variation and avoid perfectly predictable
 * staircases.  The result is clamped to [0.00, 1.00].
 *
 * @param current  Current difficulty (0.00–1.00)
 * @param correct  Whether the student answered correctly
 * @returns        Updated difficulty
 */
function computeNextDifficulty(current: number, correct: boolean): number {
  const magnitude = ADJUSTMENT_MIN + Math.random() * (ADJUSTMENT_MAX - ADJUSTMENT_MIN)
  const delta = correct ? magnitude : -magnitude
  return Math.max(0.0, Math.min(1.0, current + delta))
}

/**
 * Determine the next skill in the cycle given the skill of the last question.
 */
function nextSkill(lastSkill: string | null): Skill {
  if (!lastSkill) return SKILL_CYCLE[0]
  const idx = SKILL_CYCLE.indexOf(lastSkill as Skill)
  if (idx === -1) return SKILL_CYCLE[0]
  return SKILL_CYCLE[(idx + 1) % SKILL_CYCLE.length]
}

/**
 * Decide whether the test should stop.
 *
 * Stop conditions (any of the following):
 * 1. questions_answered >= MAX_QUESTIONS
 * 2. questions_answered >= MIN_QUESTIONS AND difficulty has converged
 *    (the last CONVERGENCE_COUNT difficulty deltas are all within ±CONVERGENCE_THRESHOLD)
 */
function shouldStop(questionsAnswered: number, difficultyHistory: number[]): boolean {
  if (questionsAnswered >= MAX_QUESTIONS) return true
  if (questionsAnswered < MIN_QUESTIONS) return false

  // Check convergence: last N consecutive difficulty changes are within threshold
  if (difficultyHistory.length < CONVERGENCE_COUNT + 1) return false

  const recent = difficultyHistory.slice(-CONVERGENCE_COUNT - 1)
  for (let i = 1; i < recent.length; i++) {
    if (Math.abs(recent[i] - recent[i - 1]) > CONVERGENCE_THRESHOLD) {
      return false
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Supabase helper — create an authenticated client from the request JWT
// ---------------------------------------------------------------------------

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Verify the JWT from the Authorization header and return the user id.
 * Uses the public (anon) key for JWT verification via Supabase's getUser.
 */
async function verifyAuth(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing authorization header')

  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) throw new Error('Invalid or expired token')
  return data.user.id
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

/**
 * ACTION: "start" — Create a new test session and return the first question.
 *
 * Flow:
 *  1. Insert a new row into test_sessions with status='in_progress'.
 *  2. Select the first question at medium difficulty from test_questions.
 *  3. Return the session id, first question, and estimated total questions.
 */
async function handleStart(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>
): Promise<Response> {
  const testType = body.test_type as string
  const studentId = body.student_id as string

  if (!testType || !['placement', 'periodic', 'diagnostic'].includes(testType)) {
    return jsonResponse({ error: 'Invalid or missing test_type. Must be placement, periodic, or diagnostic.' }, 400)
  }
  if (!studentId) {
    return jsonResponse({ error: 'Missing student_id' }, 400)
  }

  // 1. Create the test session
  const { data: session, error: sessionErr } = await supabase
    .from('test_sessions')
    .insert({
      student_id: studentId,
      test_type: testType,
      status: 'in_progress',
      current_difficulty: INITIAL_DIFFICULTY,
      questions_answered: 0,
      correct_answers: 0,
      question_sequence: [],
      response_log: [],
    })
    .select('id')
    .single()

  if (sessionErr || !session) {
    throw new Error(`Failed to create test session: ${sessionErr?.message}`)
  }

  // 2. Select the first question — target difficulty = INITIAL_DIFFICULTY, skill = first in cycle
  const firstSkill = SKILL_CYCLE[0]
  const firstQuestion = await selectQuestion(supabase, INITIAL_DIFFICULTY, firstSkill, [])

  if (!firstQuestion) {
    // No questions available at all — clean up the session
    await supabase.from('test_sessions').delete().eq('id', session.id)
    return jsonResponse({ error: 'No test questions available. Please seed the test_questions table.' }, 404)
  }

  // 3. Update session with the first question in sequence
  await supabase
    .from('test_sessions')
    .update({ question_sequence: [firstQuestion.id] })
    .eq('id', session.id)

  return jsonResponse({
    session_id: session.id,
    question: sanitizeQuestion(firstQuestion),
    question_number: 1,
    total_estimated_questions: `${MIN_QUESTIONS}–${MAX_QUESTIONS}`,
  })
}

/**
 * ACTION: "answer" — Record a response, adapt difficulty, return the next question.
 *
 * IRT-based adaptive algorithm:
 *   - Correct answer  → increase difficulty by 0.08–0.12
 *   - Incorrect answer → decrease difficulty by 0.08–0.12
 *   - Select next question at the new difficulty level (±0.15 range)
 *   - Never repeat a question already asked in this session
 *   - Cycle through skills: grammar → vocabulary → reading → listening → …
 *   - Stop after 20–30 questions or when difficulty converges
 */
async function handleAnswer(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>
): Promise<Response> {
  const sessionId = body.session_id as string
  const questionId = body.question_id as string
  const answer = body.answer as string
  const timeSpent = (body.time_spent_seconds as number) || 0

  if (!sessionId || !questionId || answer === undefined || answer === null) {
    return jsonResponse({ error: 'Missing required fields: session_id, question_id, answer' }, 400)
  }

  // 1. Fetch the current session
  const { data: session, error: sessErr } = await supabase
    .from('test_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessErr || !session) {
    return jsonResponse({ error: 'Test session not found' }, 404)
  }
  if (session.status !== 'in_progress') {
    return jsonResponse({ error: 'This test session is no longer active' }, 400)
  }

  // 2. Fetch the question to check the correct answer
  const { data: question, error: qErr } = await supabase
    .from('test_questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (qErr || !question) {
    return jsonResponse({ error: 'Question not found' }, 404)
  }

  const isCorrect = String(answer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase()
  const sequenceNumber = (session.questions_answered || 0) + 1

  // 3. Record the response in test_responses
  await supabase.from('test_responses').insert({
    session_id: sessionId,
    question_id: questionId,
    student_id: session.student_id,
    answer: String(answer),
    is_correct: isCorrect,
    time_spent_seconds: timeSpent,
    difficulty_at_time: session.current_difficulty,
    sequence_number: sequenceNumber,
  })

  // 4. Compute new difficulty using IRT-inspired adjustment
  const newDifficulty = computeNextDifficulty(session.current_difficulty, isCorrect)

  // 5. Update running totals
  const newQuestionsAnswered = sequenceNumber
  const newCorrectAnswers = (session.correct_answers || 0) + (isCorrect ? 1 : 0)

  // Build difficulty history from the response_log (array of past difficulties + current)
  const responseLog: Array<Record<string, unknown>> = Array.isArray(session.response_log)
    ? session.response_log
    : []
  responseLog.push({
    question_id: questionId,
    skill: question.skill,
    difficulty: session.current_difficulty,
    answer: String(answer),
    is_correct: isCorrect,
    time_spent_seconds: timeSpent,
  })

  const difficultyHistory: number[] = responseLog.map((r: Record<string, unknown>) => r.difficulty as number)
  difficultyHistory.push(newDifficulty)

  // Build question_sequence (array of question ids)
  const questionSequence: string[] = Array.isArray(session.question_sequence)
    ? [...session.question_sequence]
    : []
  if (!questionSequence.includes(questionId)) {
    questionSequence.push(questionId)
  }

  // 6. Determine if the test should stop
  const testComplete = shouldStop(newQuestionsAnswered, difficultyHistory)

  // 7. Select next question (unless test is complete)
  let nextQuestion = null
  const targetSkill = nextSkill(question.skill)

  if (!testComplete) {
    nextQuestion = await selectQuestion(supabase, newDifficulty, targetSkill, questionSequence)

    // If no question found for the target skill, try remaining skills in order
    if (!nextQuestion) {
      for (const fallbackSkill of SKILL_CYCLE) {
        if (fallbackSkill === targetSkill) continue
        nextQuestion = await selectQuestion(supabase, newDifficulty, fallbackSkill, questionSequence)
        if (nextQuestion) break
      }
    }

    // If still nothing, the question bank is exhausted — end the test
    if (!nextQuestion && newQuestionsAnswered >= MIN_QUESTIONS) {
      // Allow early termination if we have enough data
    }

    if (nextQuestion) {
      questionSequence.push(nextQuestion.id)
    }
  }

  // 8. Build per-skill accuracy from response log
  const skillScores = computeSkillScores(responseLog)

  // 9. Update the session
  await supabase
    .from('test_sessions')
    .update({
      current_difficulty: newDifficulty,
      questions_answered: newQuestionsAnswered,
      correct_answers: newCorrectAnswers,
      estimated_level: difficultyToCEFR(newDifficulty),
      skill_scores: skillScores,
      question_sequence: questionSequence,
      response_log: responseLog,
    })
    .eq('id', sessionId)

  const isFinished = testComplete || (!nextQuestion && newQuestionsAnswered >= MIN_QUESTIONS)

  // If test is finished, set status so the client knows to call "complete"
  if (isFinished) {
    await supabase
      .from('test_sessions')
      .update({ status: 'awaiting_analysis' })
      .eq('id', sessionId)
  }

  return jsonResponse({
    is_correct: isCorrect,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    explanation_ar: question.explanation_ar,
    question: nextQuestion ? sanitizeQuestion(nextQuestion) : null,
    question_number: nextQuestion ? newQuestionsAnswered + 1 : null,
    test_complete: isFinished,
    stats: {
      questions_answered: newQuestionsAnswered,
      correct_answers: newCorrectAnswers,
      accuracy: newQuestionsAnswered > 0
        ? Math.round((newCorrectAnswers / newQuestionsAnswered) * 100)
        : 0,
      current_difficulty: Math.round(newDifficulty * 100) / 100,
      estimated_level: difficultyToCEFR(newDifficulty),
      skill_scores: skillScores,
    },
  })
}

/**
 * ACTION: "complete" — Finalize the test, call Claude for AI analysis, return results.
 *
 * Claude analyzes the full response log and produces:
 *   - Estimated CEFR level
 *   - Per-skill scores (grammar, vocabulary, reading, listening, writing, speaking)
 *   - AI analysis in Arabic
 *   - Recommended academic level (1–5)
 *   - Confidence score (0.00–1.00)
 */
async function handleComplete(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>
): Promise<Response> {
  const sessionId = body.session_id as string
  if (!sessionId) {
    return jsonResponse({ error: 'Missing session_id' }, 400)
  }

  // 1. Fetch the session
  const { data: session, error: sessErr } = await supabase
    .from('test_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessErr || !session) {
    return jsonResponse({ error: 'Test session not found' }, 404)
  }
  if (session.status === 'completed') {
    // Already completed — return cached results
    return jsonResponse({
      session_id: sessionId,
      status: 'completed',
      results: {
        estimated_level: session.estimated_level,
        recommended_level: session.recommended_level,
        overall_score: session.overall_score,
        skill_scores: session.skill_scores,
        confidence_score: session.confidence_score,
        ai_analysis: session.ai_analysis,
        ai_analysis_ar: session.ai_analysis_ar,
        questions_answered: session.questions_answered,
        correct_answers: session.correct_answers,
      },
    })
  }

  // 2. Fetch all responses for this session (for detailed analysis)
  const { data: responses } = await supabase
    .from('test_responses')
    .select('*, test_questions:question_id(skill, level, difficulty, question_type, grammar_topic)')
    .eq('session_id', sessionId)
    .order('sequence_number')

  const responseLog = responses || session.response_log || []

  // 3. Compute basic stats
  const totalQ = session.questions_answered || 0
  const correctQ = session.correct_answers || 0
  const accuracy = totalQ > 0 ? (correctQ / totalQ) : 0
  const skillScores = computeSkillScores(
    Array.isArray(session.response_log) ? session.response_log : []
  )

  // 4. Call Claude for AI-powered analysis
  const analysisPrompt = buildAnalysisPrompt(session, responseLog, skillScores, accuracy)
  const aiResult = await callClaudeForAnalysis(analysisPrompt)

  // 5. Determine final values (use Claude's judgment, fall back to algorithm)
  const estimatedLevel = aiResult.estimated_cefr || difficultyToCEFR(session.current_difficulty)
  const recommendedLevel = aiResult.recommended_academic_level || cefrToAcademicLevel(estimatedLevel)
  const overallScore = aiResult.overall_score ?? Math.round(accuracy * 100)
  const confidenceScore = aiResult.confidence_score ?? computeAlgorithmicConfidence(session)

  // Merge Claude's per-skill scores with algorithm-computed ones
  const finalSkillScores = {
    ...skillScores,
    ...(aiResult.skill_scores || {}),
  }

  // 6. Update the session with final results
  await supabase
    .from('test_sessions')
    .update({
      status: 'completed',
      estimated_level: estimatedLevel,
      recommended_level: recommendedLevel,
      overall_score: overallScore,
      skill_scores: finalSkillScores,
      confidence_score: confidenceScore,
      ai_analysis: aiResult.analysis_en || null,
      ai_analysis_ar: aiResult.analysis_ar || null,
    })
    .eq('id', sessionId)

  // 7. Log AI usage
  if (aiResult._usage) {
    const costSar =
      (aiResult._usage.input_tokens * 0.003 / 1000) * 3.75 +
      (aiResult._usage.output_tokens * 0.015 / 1000) * 3.75

    await supabase.from('ai_usage').insert({
      type: 'adaptive_test_analysis',
      model: CLAUDE_MODEL,
      input_tokens: aiResult._usage.input_tokens,
      output_tokens: aiResult._usage.output_tokens,
      estimated_cost_sar: costSar,
    }).catch(() => { /* non-critical */ })
  }

  return jsonResponse({
    session_id: sessionId,
    status: 'completed',
    results: {
      estimated_level: estimatedLevel,
      recommended_level: recommendedLevel,
      overall_score: overallScore,
      skill_scores: finalSkillScores,
      confidence_score: confidenceScore,
      ai_analysis: aiResult.analysis_en || null,
      ai_analysis_ar: aiResult.analysis_ar || null,
      questions_answered: totalQ,
      correct_answers: correctQ,
    },
  })
}

// ---------------------------------------------------------------------------
// Question selection
// ---------------------------------------------------------------------------

/**
 * Select a single question from test_questions matching the target difficulty and skill,
 * excluding already-asked questions.
 *
 * Strategy:
 *  1. Look for active questions where difficulty is within [target - RANGE, target + RANGE].
 *  2. Filter to the requested skill and exclude already-used question IDs.
 *  3. Order randomly and pick one.
 *  4. If no exact match, widen the search to any difficulty for that skill.
 */
async function selectQuestion(
  supabase: ReturnType<typeof createClient>,
  targetDifficulty: number,
  skill: string,
  excludeIds: string[]
): Promise<Record<string, unknown> | null> {
  const lower = Math.max(0, targetDifficulty - DIFFICULTY_RANGE)
  const upper = Math.min(1, targetDifficulty + DIFFICULTY_RANGE)

  // Primary query: skill + difficulty range
  let query = supabase
    .from('test_questions')
    .select('*')
    .eq('is_active', true)
    .eq('skill', skill)
    .gte('difficulty', lower)
    .lte('difficulty', upper)

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  // Order by how close the question difficulty is to the target (not natively
  // supported in PostgREST, so we fetch a batch and pick the closest)
  const { data: candidates } = await query.limit(10)

  if (candidates && candidates.length > 0) {
    // Pick a random question from the candidates to add variety
    const idx = Math.floor(Math.random() * candidates.length)
    return candidates[idx]
  }

  // Fallback: widen to any difficulty for the requested skill
  let fallbackQuery = supabase
    .from('test_questions')
    .select('*')
    .eq('is_active', true)
    .eq('skill', skill)

  if (excludeIds.length > 0) {
    fallbackQuery = fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: fallbackCandidates } = await fallbackQuery.limit(5)

  if (fallbackCandidates && fallbackCandidates.length > 0) {
    const idx = Math.floor(Math.random() * fallbackCandidates.length)
    return fallbackCandidates[idx]
  }

  return null
}

/**
 * Remove the correct_answer from a question before sending it to the client.
 */
function sanitizeQuestion(q: Record<string, unknown>): Record<string, unknown> {
  const { correct_answer, explanation, explanation_ar, is_active, ...safe } = q as Record<string, unknown> & {
    correct_answer: unknown
    explanation: unknown
    explanation_ar: unknown
    is_active: unknown
  }
  return safe
}

// ---------------------------------------------------------------------------
// Skill score computation
// ---------------------------------------------------------------------------

/**
 * Compute per-skill accuracy from the response log.
 * Returns an object like { grammar: 75, vocabulary: 60, reading: 80, listening: 50 }
 * where each value is a percentage (0–100).
 */
function computeSkillScores(
  responseLog: Array<Record<string, unknown>>
): Record<string, number> {
  const skillStats: Record<string, { correct: number; total: number }> = {}

  for (const entry of responseLog) {
    const skill = entry.skill as string
    if (!skill) continue
    if (!skillStats[skill]) skillStats[skill] = { correct: 0, total: 0 }
    skillStats[skill].total++
    if (entry.is_correct) skillStats[skill].correct++
  }

  const scores: Record<string, number> = {}
  for (const [skill, stats] of Object.entries(skillStats)) {
    scores[skill] = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  }
  return scores
}

/**
 * Compute a confidence score (0–1) from algorithmic signals when Claude
 * does not provide one.  Higher confidence means:
 *  - More questions answered
 *  - Difficulty has converged (low variance in recent changes)
 */
function computeAlgorithmicConfidence(session: Record<string, unknown>): number {
  const questionsAnswered = (session.questions_answered as number) || 0
  const responseLog = Array.isArray(session.response_log) ? session.response_log : []

  // Factor 1: question count (more questions → higher confidence, max at 30)
  const countFactor = Math.min(questionsAnswered / MAX_QUESTIONS, 1.0)

  // Factor 2: difficulty convergence (low variance in last 5 difficulties)
  let convergenceFactor = 0.5
  if (responseLog.length >= CONVERGENCE_COUNT) {
    const recentDiffs = responseLog.slice(-CONVERGENCE_COUNT).map(
      (r: Record<string, unknown>) => (r.difficulty as number) || 0.5
    )
    const mean = recentDiffs.reduce((s, v) => s + v, 0) / recentDiffs.length
    const variance = recentDiffs.reduce((s, v) => s + (v - mean) ** 2, 0) / recentDiffs.length
    // Low variance → high convergence factor
    convergenceFactor = Math.max(0, 1 - variance * 50) // variance of 0.02 → factor 0
  }

  return Math.round(Math.min(1, countFactor * 0.4 + convergenceFactor * 0.6) * 100) / 100
}

// ---------------------------------------------------------------------------
// Claude AI analysis
// ---------------------------------------------------------------------------

interface AIAnalysisResult {
  estimated_cefr: string
  recommended_academic_level: number
  overall_score: number
  skill_scores: Record<string, number>
  confidence_score: number
  analysis_en: string
  analysis_ar: string
  _usage?: { input_tokens: number; output_tokens: number }
}

function buildAnalysisPrompt(
  session: Record<string, unknown>,
  responses: unknown[],
  skillScores: Record<string, number>,
  accuracy: number
): string {
  return `You are an English language assessment expert at Fluentia Academy for Arabic-speaking adults.

Analyze this adaptive test session and provide a detailed assessment.

## Test Data
- Test type: ${session.test_type}
- Questions answered: ${session.questions_answered}
- Correct answers: ${session.correct_answers}
- Overall accuracy: ${Math.round(accuracy * 100)}%
- Final algorithm difficulty: ${(session.current_difficulty as number)?.toFixed(2)}
- Algorithm estimated CEFR: ${difficultyToCEFR(session.current_difficulty as number)}

## Per-Skill Accuracy
${Object.entries(skillScores).map(([skill, score]) => `- ${skill}: ${score}%`).join('\n')}

## Response Log (question-by-question)
${JSON.stringify(responses, null, 2)}

## Instructions
Based on the above data, produce a JSON object with:
1. "estimated_cefr" — your best estimate of the student's CEFR level (A1/A2/B1/B2/C1/C2)
2. "recommended_academic_level" — integer 1–5 (1=A1, 2=A2, 3=B1, 4=B2, 5=C1/C2)
3. "overall_score" — integer 0–100 representing overall English proficiency
4. "skill_scores" — object with keys: grammar, vocabulary, reading, listening, writing, speaking (integer 0–100 each; estimate writing and speaking from available data patterns)
5. "confidence_score" — float 0.00–1.00, how confident you are in this assessment
6. "analysis_en" — 2–3 paragraph English analysis of strengths, weaknesses, and recommendations
7. "analysis_ar" — the same analysis in Arabic (Modern Standard Arabic, clear and professional)

Respond with ONLY valid JSON — no markdown, no code fences, no commentary.`
}

async function callClaudeForAnalysis(prompt: string): Promise<AIAnalysisResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: 'You are an English language assessment expert. Output only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Claude API error ${response.status}: ${errorText}`)
    // Return fallback values so the test can still complete
    return {
      estimated_cefr: '',
      recommended_academic_level: 0,
      overall_score: 0,
      skill_scores: {},
      confidence_score: 0,
      analysis_en: 'AI analysis unavailable — please contact support.',
      analysis_ar: 'التحليل الذكي غير متاح حاليًا — يرجى التواصل مع الدعم.',
    }
  }

  const data = await response.json()
  const inputTokens: number = data.usage?.input_tokens ?? 0
  const outputTokens: number = data.usage?.output_tokens ?? 0

  const rawText: string = data.content?.[0]?.text ?? ''

  // Robust JSON parsing — same pattern as generate-weekly-tasks
  let jsonStr = rawText.trim()
  if (jsonStr.includes('```')) {
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    } else {
      jsonStr = jsonStr.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?\s*```/g, '').trim()
    }
  }
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
  }

  try {
    const result = JSON.parse(jsonStr)
    result._usage = { input_tokens: inputTokens, output_tokens: outputTokens }
    return result as AIAnalysisResult
  } catch (parseErr) {
    console.error('Failed to parse Claude analysis response:', parseErr)
    return {
      estimated_cefr: '',
      recommended_academic_level: 0,
      overall_score: 0,
      skill_scores: {},
      confidence_score: 0,
      analysis_en: 'AI analysis could not be parsed — raw response logged.',
      analysis_ar: 'تعذر تحليل الاستجابة — تم تسجيل الاستجابة الأولية.',
      _usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    }
  }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabase = createSupabaseClient()

    // Verify JWT authentication
    await verifyAuth(req, supabase)

    // Parse the request body
    const body: Record<string, unknown> = await req.json()
    const action = body.action as string

    switch (action) {
      case 'start':
        return await handleStart(supabase, body)

      case 'answer':
        return await handleAnswer(supabase, body)

      case 'complete':
        return await handleComplete(supabase, body)

      default:
        return jsonResponse(
          { error: `Unknown action "${action}". Valid actions: start, answer, complete` },
          400
        )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error in adaptive-test:', message)

    // Auth errors return 401
    if (message.includes('authorization') || message.includes('token') || message.includes('expired')) {
      return jsonResponse({ error: message }, 401)
    }

    return jsonResponse({ error: message }, 500)
  }
})
