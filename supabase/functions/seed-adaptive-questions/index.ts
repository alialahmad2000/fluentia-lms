// Fluentia LMS — Seed Adaptive Questions Edge Function
// Generates hundreds of adaptive test questions via Claude API and inserts them
// into the adaptive_question_bank table.
// POST body: { level?: number, skill?: string, count_per_batch?: number }
// Deploy: supabase functions deploy seed-adaptive-questions
// Env: CLAUDE_API_KEY or ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const CLAUDE_MODEL = 'claude-sonnet-4-6'
const ANTHROPIC_VERSION = '2023-06-01'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------------------------------------------------------------------------
// CEFR & Level mappings
// ---------------------------------------------------------------------------

const LEVEL_CEFR: Record<number, string> = {
  1: 'A1 (Beginner)',
  2: 'A2 (Elementary)',
  3: 'B1 (Intermediate)',
  4: 'B2 (Upper-Intermediate)',
  5: 'C1 (Advanced)',
  6: 'C2 (Proficiency)',
}

const GRAMMAR_TOPICS: Record<number, string> = {
  1: 'be verb, present simple, articles, pronouns, prepositions, plurals, there is/are, can/can\'t',
  2: 'past simple, future will/going to, present/past continuous, comparatives, superlatives, modals',
  3: 'present perfect, past perfect, conditionals 0/1, passive voice, relative clauses, reported speech',
  4: 'conditionals 2/3, advanced passive, wish/if only, causatives, inversion, emphasis',
  5: 'mixed conditionals, subjunctive, cleft sentences, participle clauses, advanced modals',
  6: 'IELTS grammar, error correction, sentence transformation, academic structures',
}

const READING_WORD_COUNTS: Record<number, string> = {
  1: '50-80 words',
  2: '80-120 words',
  3: '120-180 words',
  4: '180-250 words',
  5: '250-350 words',
  6: '300-400 words',
}

// ---------------------------------------------------------------------------
// Claude API helper
// ---------------------------------------------------------------------------

interface AIUsageLog {
  call: string
  inputTokens: number
  outputTokens: number
}

async function callClaude(
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ data: unknown[]; usage: AIUsageLog }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API error ${res.status}: ${errText}`)
  }

  const body = await res.json()
  const text: string = body.content?.[0]?.text ?? '[]'
  const usage: AIUsageLog = {
    call: '',
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  }

  // Parse JSON — strip markdown fences if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }

  let parsed: unknown[]
  try {
    parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) parsed = [parsed]
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${cleaned.slice(0, 200)}...`)
  }

  return { data: parsed, usage }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildGrammarPrompt(level: number, count: number): { system: string; user: string } {
  const cefr = LEVEL_CEFR[level]
  const topics = GRAMMAR_TOPICS[level]
  const system = 'You are an expert English language test question writer specializing in adaptive testing. Return ONLY valid JSON arrays — no markdown, no explanation.'

  const user = `Generate ${count} grammar MCQ questions for Level ${level} (${cefr}) English learners.
Topics: ${topics}
Difficulty: assign 0.0-1.0 for each (distribute evenly: ~1/3 easy 0.2-0.4, ~1/3 medium 0.4-0.7, ~1/3 hard 0.7-0.9).

Mix question types: sentence completion, error identification, sentence transformation, best answer.

For each question return:
{
  "skill": "grammar",
  "level": ${level},
  "difficulty": 0.35,
  "discrimination": 1.0,
  "question_type": "mcq",
  "question": "She ___ to school every day.",
  "question_ar": "هي ___ إلى المدرسة كل يوم.",
  "options": ["go", "goes", "going", "gone"],
  "correct_answer": 1,
  "explanation": "We use 'goes' with she/he/it in present simple.",
  "explanation_ar": "نستخدم goes مع he/she/it في المضارع البسيط",
  "tags": ["present_simple", "third_person"]
}

Return ONLY valid JSON array. No markdown.`

  return { system, user }
}

function buildVocabularyPrompt(level: number, count: number): { system: string; user: string } {
  const cefr = LEVEL_CEFR[level]
  const system = 'You are an expert English language test question writer specializing in adaptive testing. Return ONLY valid JSON arrays — no markdown, no explanation.'

  const user = `Generate ${count} vocabulary MCQ questions for Level ${level} (${cefr}).
Test: word meanings, synonyms, collocations, contextual usage.
Each has 4 options, one correct. Include Arabic translation in explanation.
Difficulty: assign 0.0-1.0 for each (distribute evenly: ~1/3 easy 0.2-0.4, ~1/3 medium 0.4-0.7, ~1/3 hard 0.7-0.9).

For each question return:
{
  "skill": "vocabulary",
  "level": ${level},
  "difficulty": 0.5,
  "discrimination": 1.0,
  "question_type": "mcq",
  "question": "Choose the word that means 'happy':",
  "question_ar": "اختر الكلمة التي تعني 'سعيد':",
  "options": ["sad", "glad", "angry", "tired"],
  "correct_answer": 1,
  "explanation": "Glad means happy or pleased. (سعيد / مسرور)",
  "explanation_ar": "glad تعني سعيد أو مسرور",
  "tags": ["synonyms", "adjectives"]
}

Return ONLY valid JSON array. No markdown.`

  return { system, user }
}

function buildReadingPrompt(level: number, count: number): { system: string; user: string } {
  const cefr = LEVEL_CEFR[level]
  const wordCount = READING_WORD_COUNTS[level]
  const passageCount = Math.ceil(count / 3)
  const system = 'You are an expert English language test question writer specializing in adaptive testing and reading comprehension. Return ONLY valid JSON arrays — no markdown, no explanation.'

  const user = `Generate ${passageCount} reading comprehension sets for Level ${level} (${cefr}).
Each set: short passage (${wordCount}) + 3 MCQ questions.
Difficulty: assign 0.0-1.0 for each (distribute evenly: ~1/3 easy 0.2-0.4, ~1/3 medium 0.4-0.7, ~1/3 hard 0.7-0.9).

For each question:
{
  "skill": "reading",
  "level": ${level},
  "difficulty": 0.5,
  "discrimination": 1.0,
  "question_type": "mcq",
  "question": "What is the main idea?",
  "question_ar": "ما هي الفكرة الرئيسية؟",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": 2,
  "context": "The full passage text here...",
  "explanation": "The passage primarily discusses...",
  "explanation_ar": "يناقش النص بشكل رئيسي...",
  "tags": ["main_idea"]
}

Return flat array of all questions (${passageCount} passages × 3 questions = ${passageCount * 3} total).

Return ONLY valid JSON array. No markdown.`

  return { system, user }
}

// ---------------------------------------------------------------------------
// Generation plan
// ---------------------------------------------------------------------------

interface GenerationTask {
  level: number
  skill: string
  batchIndex: number
  count: number
  maxTokens: number
  buildPrompt: (level: number, count: number) => { system: string; user: string }
}

function buildGenerationPlan(
  levels: number[],
  skills: string[],
  countPerBatch: number,
): GenerationTask[] {
  const tasks: GenerationTask[] = []

  for (const level of levels) {
    if (skills.includes('grammar')) {
      const grammarCount = Math.min(countPerBatch, 25)
      tasks.push({ level, skill: 'grammar', batchIndex: 0, count: grammarCount, maxTokens: 8000, buildPrompt: buildGrammarPrompt })
      tasks.push({ level, skill: 'grammar', batchIndex: 1, count: grammarCount, maxTokens: 8000, buildPrompt: buildGrammarPrompt })
    }
    if (skills.includes('vocabulary')) {
      const vocabCount = Math.min(countPerBatch, 25)
      tasks.push({ level, skill: 'vocabulary', batchIndex: 0, count: vocabCount, maxTokens: 8000, buildPrompt: buildVocabularyPrompt })
      tasks.push({ level, skill: 'vocabulary', batchIndex: 1, count: vocabCount, maxTokens: 8000, buildPrompt: buildVocabularyPrompt })
    }
    if (skills.includes('reading')) {
      const readingCount = Math.min(Math.floor(countPerBatch * 0.6), 15)
      tasks.push({ level, skill: 'reading', batchIndex: 0, count: readingCount, maxTokens: 10000, buildPrompt: buildReadingPrompt })
      tasks.push({ level, skill: 'reading', batchIndex: 1, count: readingCount, maxTokens: 10000, buildPrompt: buildReadingPrompt })
    }
  }

  return tasks
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ---- Auth: admin only ----
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check admin role
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ---- Parse request ----
    const body = await req.json().catch(() => ({}))
    const requestedLevel: number | undefined = body.level
    const requestedSkill: string | undefined = body.skill
    const countPerBatch: number = body.count_per_batch ?? 25

    const levels = requestedLevel ? [requestedLevel] : [1, 2, 3, 4, 5, 6]
    const allSkills = ['grammar', 'vocabulary', 'reading']
    const skills = requestedSkill ? [requestedSkill] : allSkills

    // Validate inputs
    for (const l of levels) {
      if (l < 1 || l > 6) {
        return new Response(JSON.stringify({ error: `Invalid level: ${l}. Must be 1-6.` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
    for (const s of skills) {
      if (!allSkills.includes(s)) {
        return new Response(JSON.stringify({ error: `Invalid skill: ${s}. Must be one of: ${allSkills.join(', ')}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'CLAUDE_API_KEY or ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ---- Build plan & execute ----
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const tasks = buildGenerationPlan(levels, skills, countPerBatch)

    const byLevel: Record<number, Record<string, number>> = {}
    const errors: string[] = []
    const usageLogs: AIUsageLog[] = []
    let totalGenerated = 0

    // Process levels sequentially
    const groupedByLevel: Record<number, GenerationTask[]> = {}
    for (const task of tasks) {
      if (!groupedByLevel[task.level]) groupedByLevel[task.level] = []
      groupedByLevel[task.level].push(task)
    }

    for (const level of levels) {
      const levelTasks = groupedByLevel[level] ?? []
      if (!byLevel[level]) byLevel[level] = {}

      for (const task of levelTasks) {
        const callLabel = `L${task.level}_${task.skill}_batch${task.batchIndex}`
        try {
          console.log(`[seed] Generating: ${callLabel} (${task.count} questions)`)
          const { system, user: userPrompt } = task.buildPrompt(task.level, task.count)
          const { data: questions, usage } = await callClaude(system, userPrompt, task.maxTokens)
          usage.call = callLabel
          usageLogs.push(usage)

          console.log(`[seed] ${callLabel}: received ${questions.length} questions, tokens: in=${usage.inputTokens} out=${usage.outputTokens}`)

          if (questions.length === 0) {
            errors.push(`${callLabel}: received 0 questions`)
            await delay(300)
            continue
          }

          // Prepare rows for insertion
          const rows = questions.map((q: any) => ({
            skill: q.skill ?? task.skill,
            level: q.level ?? task.level,
            difficulty: typeof q.difficulty === 'number' ? q.difficulty : 0.5,
            discrimination: typeof q.discrimination === 'number' ? q.discrimination : 1.0,
            question_type: q.question_type ?? 'mcq',
            question: q.question,
            question_ar: q.question_ar ?? null,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation ?? null,
            explanation_ar: q.explanation_ar ?? null,
            context: q.context ?? null,
            tags: q.tags ?? [],
            is_active: true,
          }))

          // Insert batch — on conflict skip
          const { data: inserted, error: insertErr } = await supabase
            .from('adaptive_question_bank')
            .upsert(rows, { onConflict: 'question', ignoreDuplicates: true })
            .select('id')

          if (insertErr) {
            console.error(`[seed] ${callLabel} insert error:`, insertErr.message)
            errors.push(`${callLabel}: insert error — ${insertErr.message}`)
          }

          const insertedCount = inserted?.length ?? rows.length
          byLevel[level][task.skill] = (byLevel[level][task.skill] ?? 0) + insertedCount
          totalGenerated += insertedCount

          console.log(`[seed] ${callLabel}: inserted ${insertedCount} rows`)
        } catch (err: any) {
          console.error(`[seed] ${callLabel} error:`, err.message)
          errors.push(`${callLabel}: ${err.message}`)
        }

        // Rate-limit delay between Claude calls
        await delay(300)
      }
    }

    // ---- Response ----
    const result = {
      success: errors.length === 0,
      questions_generated: totalGenerated,
      by_level: byLevel,
      ai_usage: usageLogs.map((u) => ({
        call: u.call,
        input_tokens: u.inputTokens,
        output_tokens: u.outputTokens,
      })),
      errors,
    }

    console.log(`[seed] Complete: ${totalGenerated} questions generated, ${errors.length} errors`)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[seed] Fatal error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
