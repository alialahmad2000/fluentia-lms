// Fluentia LMS — Complete IELTS Diagnostic Edge Function
// Grades Reading+Listening objectively, calls evaluate-writing for Task 2,
// evaluates speaking inline via Claude, then writes results + adaptive plan.
// Deploy: supabase functions deploy complete-ielts-diagnostic --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// IELTS band conversion — scales proportionally from raw score to 40-question equivalent
function rawToBand(correct: number, total: number): number {
  if (total === 0) return 0
  const scaled = Math.round((correct / total) * 40)
  if (scaled >= 39) return 9.0
  if (scaled >= 37) return 8.5
  if (scaled >= 35) return 8.0
  if (scaled >= 33) return 7.5
  if (scaled >= 30) return 7.0
  if (scaled >= 27) return 6.5
  if (scaled >= 23) return 6.0
  if (scaled >= 19) return 5.5
  if (scaled >= 15) return 5.0
  if (scaled >= 13) return 4.5
  if (scaled >= 10) return 4.0
  if (scaled >= 8)  return 3.5
  if (scaled >= 6)  return 3.0
  return 2.5
}

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2
}

interface ObjectiveResult {
  correct: number
  total: number
  band: number
  per_question_type: Record<string, { correct: number; total: number }>
  wrong_question_ids: string[]
}

// Grade reading/listening by comparing student answers to answer_key in content rows
function gradeObjective(
  contentList: Array<{ id: string; questions: unknown; answer_key: unknown }> | null,
  studentAnswers: Record<string, string>
): ObjectiveResult {
  let correct = 0
  let total = 0
  const per_question_type: Record<string, { correct: number; total: number }> = {}
  const wrong_question_ids: string[] = []

  for (const content of contentList || []) {
    const key = content.answer_key
    if (!key || typeof key !== 'object') continue

    for (const [qId, expected] of Object.entries(key as Record<string, unknown>)) {
      const entry = expected as Record<string, string> | string
      const correctAnswer = typeof entry === 'object' ? entry.answer : entry
      const questionType = typeof entry === 'object' ? (entry.type || 'other') : 'other'
      const studentAnswer = studentAnswers[qId]

      total++
      if (!per_question_type[questionType]) {
        per_question_type[questionType] = { correct: 0, total: 0 }
      }
      per_question_type[questionType].total++

      if (
        studentAnswer != null &&
        String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()
      ) {
        correct++
        per_question_type[questionType].correct++
      } else {
        wrong_question_ids.push(qId)
      }
    }
  }

  return { correct, total, band: rawToBand(correct, total), per_question_type, wrong_question_ids }
}

async function evaluateSpeakingInline(
  transcript: string,
  part: string,
  questionContext: string
): Promise<{ band: number; fluency: number; vocabulary: number; pronunciation: number; coherence: number; feedback_ar: string }> {
  if (!transcript || transcript.trim().length < 10) {
    return { band: 3.5, fluency: 3.5, vocabulary: 3.5, pronunciation: 3.5, coherence: 3.5, feedback_ar: 'لم يتم التعرف على إجابة واضحة.' }
  }

  const prompt = `You are an expert IELTS examiner. Evaluate this speaking response for IELTS ${part} and return ONLY valid JSON.

Question context: ${questionContext}
Transcript: ${transcript}

Evaluate on IELTS 4-criteria:
- Fluency & Coherence (FC)
- Lexical Resource (LR)
- Grammatical Range & Accuracy (GRA)
- Pronunciation (P)

Return JSON: {"band": <0.5-9.0>, "fluency": <0.5-9.0>, "vocabulary": <0.5-9.0>, "pronunciation": <0.5-9.0>, "coherence": <0.5-9.0>, "feedback_ar": "<brief Arabic feedback for student, 1-2 sentences>"}`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!resp.ok) throw new Error(`Claude API error: ${resp.status}`)
  const respJson = await resp.json()
  const raw = respJson.content?.[0]?.text || '{}'
  try {
    return JSON.parse(raw)
  } catch {
    return { band: 5.0, fluency: 5.0, vocabulary: 5.0, pronunciation: 5.0, coherence: 5.0, feedback_ar: 'تم تقييم إجابتك.' }
  }
}

async function transcribeAudio(supabase: ReturnType<typeof createClient>, audioPath: string): Promise<string> {
  const { data: fileData, error } = await supabase.storage
    .from('ielts-speaking-submissions')
    .download(audioPath)
  if (error || !fileData) return ''

  const arrayBuffer = await fileData.arrayBuffer()
  const ext = audioPath.split('.').pop() || 'webm'
  const mime = ext === 'mp4' ? 'audio/mp4' : 'audio/webm'

  const formData = new FormData()
  formData.append('file', new Blob([arrayBuffer], { type: mime }), `audio.${ext}`)
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY') || ''}` },
    body: formData,
  })
  if (!resp.ok) return ''
  const json = await resp.json()
  return json.text || ''
}

function skillLabelAr(skill: string): string {
  return { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }[skill] || skill
}

function findWeakestSkill(bands: Record<string, number | null>): string {
  let weakest = 'reading'
  let lowestBand = 999
  for (const [skill, band] of Object.entries(bands)) {
    if (band != null && band < lowestBand) {
      lowestBand = band
      weakest = skill
    }
  }
  return weakest
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const body = await req.json()
    const { attempt_id } = body

    if (!attempt_id) return jsonResponse({ error: 'attempt_id required' }, 400)

    // 1. Load attempt with mock test
    const { data: attempt, error: attemptErr } = await supabase
      .from('ielts_mock_attempts')
      .select('*, ielts_mock_tests(*)')
      .eq('id', attempt_id)
      .single()
    if (attemptErr || !attempt) return jsonResponse({ error: 'Attempt not found' }, 404)

    const mock = attempt.ielts_mock_tests
    if (!mock) return jsonResponse({ error: 'Mock test not found' }, 404)

    // 2. Load reading + listening content
    const [{ data: passages }, { data: listeningSections }] = await Promise.all([
      supabase.from('ielts_reading_passages')
        .select('id, questions, answer_key')
        .in('id', mock.reading_passage_ids || []),
      supabase.from('ielts_listening_sections')
        .select('id, questions, answer_key')
        .eq('test_id', mock.listening_test_id),
    ])

    // 3. Auto-grade Reading
    const readingResult = gradeObjective(passages, attempt.answers?.reading || {})

    // 4. Auto-grade Listening
    const listeningResult = gradeObjective(listeningSections, attempt.answers?.listening || {})

    // 5. Grade Writing via evaluate-writing edge function
    let writingBand: number | null = null
    let writingFeedback: Record<string, unknown> = {}

    const writingSubmission = attempt.writing_task2_submission || attempt.answers?.writing?.task2
    if (writingSubmission && writingSubmission.trim().length > 50) {
      const { data: writingData, error: writingErr } = await supabase.functions.invoke('evaluate-writing', {
        body: {
          student_id: attempt.student_id,
          task_type: 'ielts_task2',
          task_id: mock.writing_task2_id,
          submission: writingSubmission,
          test_variant: attempt.test_variant || 'academic',
          purpose: 'ielts_diagnostic',
        },
      })
      if (!writingErr && writingData) {
        writingBand = writingData.overall_band || writingData.band_score || null
        writingFeedback = writingData
      }
    }

    // 6. Grade Speaking — transcribe + evaluate each submitted part
    const speakingSubmissions: Record<string, string> = attempt.speaking_submissions || {}
    const speakingPerPart: Record<string, unknown> = {}
    const speakingQuestions = mock.speaking_questions || {}

    for (const part of ['part1', 'part2']) {
      const path = speakingSubmissions[part]
      if (!path) continue

      const transcript = await transcribeAudio(supabase, path)

      // Build question context from inline JSONB
      let questionContext = part === 'part1'
        ? (speakingQuestions.part1?.questions || []).join('; ')
        : JSON.stringify(speakingQuestions.part2?.cue_card || {})

      const evalResult = await evaluateSpeakingInline(transcript, part, questionContext)
      speakingPerPart[part] = { ...evalResult, transcript }
    }

    const partBands = Object.values(speakingPerPart)
      .map((x: unknown) => (x as { band?: number }).band)
      .filter((b): b is number => b != null)
    const speakingBand = partBands.length
      ? roundToHalf(partBands.reduce((a, b) => a + b, 0) / partBands.length)
      : null

    // 7. Overall band
    const skillBands = {
      reading: readingResult.band,
      listening: listeningResult.band,
      writing: writingBand,
      speaking: speakingBand,
    }
    const validBands = Object.values(skillBands).filter((b): b is number => b != null)
    const rawAvg = validBands.length ? validBands.reduce((a, b) => a + b, 0) / validBands.length : 0
    const overallBand = roundToHalf(rawAvg)

    // 8. Derive strengths/weaknesses from skill bands
    const entries = Object.entries(skillBands).filter(([, b]) => b != null) as [string, number][]
    entries.sort(([, a], [, b]) => b - a)
    const strengths = entries.slice(0, 2).map(([s]) => skillLabelAr(s))
    const weaknesses = entries.slice(-2).reverse().map(([s]) => skillLabelAr(s))

    // 9. Write ielts_student_results
    const { data: resultRow, error: resultErr } = await supabase
      .from('ielts_student_results')
      .insert({
        student_id: attempt.student_id,
        mock_test_id: mock.id,
        result_type: 'diagnostic',
        test_variant: attempt.test_variant || 'academic',
        reading_score: readingResult.band,
        reading_details: readingResult,
        listening_score: listeningResult.band,
        listening_details: listeningResult,
        writing_score: writingBand,
        writing_feedback: writingFeedback,
        speaking_score: speakingBand,
        speaking_feedback: { per_part: speakingPerPart },
        overall_band: overallBand,
        strengths,
        weaknesses,
        recommendations: [
          `ركّز على تحسين ${weaknesses[0] || 'مهاراتك'} أولاً`,
          `أكمل ${Math.ceil(Math.max(0, ((plan_target || overallBand + 1) - overallBand) / 0.5))} مستوى تدريب`,
        ],
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (resultErr) throw resultErr

    // 10. Write ielts_adaptive_plans
    const weakestSkill = findWeakestSkill(skillBands)
    const targetBand = Math.min(9.0, roundToHalf(overallBand + 1.0))

    const { data: planRow } = await supabase
      .from('ielts_adaptive_plans')
      .upsert({
        student_id: attempt.student_id,
        test_variant: attempt.test_variant || 'academic',
        target_band: targetBand,
        current_band_estimate: overallBand,
        weak_areas: weaknesses,
        strong_areas: strengths,
        next_recommended_action: {
          skill_type: weakestSkill,
          title_ar: `ركّز على ${skillLabelAr(weakestSkill)}`,
          subtitle_ar: 'نقطة ضعفك الحالية — ٣٠ دقيقة تدريب مستهدف',
          cta_ar: 'ابدأ الآن',
          route_path: `/student/ielts/${weakestSkill}`,
        },
        last_regenerated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' })
      .select()
      .single()

    // 11. Seed ielts_student_progress (one row per skill)
    const now = new Date().toISOString()
    const progressRows = [
      { student_id: attempt.student_id, skill_type: 'reading', attempts_count: 1, correct_count: readingResult.correct, estimated_band: readingResult.band, last_attempt_at: now },
      { student_id: attempt.student_id, skill_type: 'listening', attempts_count: 1, correct_count: listeningResult.correct, estimated_band: listeningResult.band, last_attempt_at: now },
      { student_id: attempt.student_id, skill_type: 'writing', attempts_count: 1, estimated_band: writingBand, last_attempt_at: now },
      { student_id: attempt.student_id, skill_type: 'speaking', attempts_count: 1, estimated_band: speakingBand, last_attempt_at: now },
    ]
    for (const row of progressRows) {
      await supabase.from('ielts_student_progress').upsert(row, {
        onConflict: 'student_id,skill_type',
        ignoreDuplicates: false,
      })
    }

    // 12. Mark attempt complete + link result
    await supabase
      .from('ielts_mock_attempts')
      .update({ status: 'completed', completed_at: now, result_id: resultRow.id })
      .eq('id', attempt_id)

    return jsonResponse({
      result_id: resultRow.id,
      plan_id: planRow?.id,
      overall_band: overallBand,
      per_skill: skillBands,
    })
  } catch (err) {
    console.error('complete-ielts-diagnostic error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})

// Suppress unused variable — plan_target is a future hook point
const plan_target: number | null = null
