import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------------------------------------------------------------------------
// Level descriptions used in every prompt
// ---------------------------------------------------------------------------
const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Level 1 (الخطوة الأولى): Absolute beginner. Simple present tense only. 150-200 word passages.',
  2: 'Level 2 (بداية الثقة): Elementary. Past tense introduced. 200-300 word passages.',
  3: 'Level 3 (صار يتكلم): Intermediate. All tenses. 300-400 word passages.',
  4: 'Level 4 (ثقة كاملة): Upper-intermediate. Complex sentences. 350-450 word passages.',
  5: 'Level 5 (جاهز للعالم): Advanced. Academic vocabulary. 400-550 word passages.',
  6: 'Level 6 (IELTS): Test-prep focus. 450-600 word passages. IELTS-style.',
}

const READING_TOPICS = [
  'science', 'nature', 'technology', 'culture', 'daily_life', 'health',
  'travel', 'education', 'environment', 'history', 'sports', 'food',
]

const SPEAKING_CATEGORIES: Record<number, string[]> = {
  1: ['personal', 'descriptive'],
  2: ['personal', 'descriptive'],
  3: ['opinion', 'comparison', 'descriptive'],
  4: ['opinion', 'comparison', 'descriptive'],
  5: ['debate', 'academic', 'IELTS-style'],
  6: ['debate', 'academic', 'IELTS-style'],
}

const WRITING_TYPES: Record<number, { types: string[]; min: number; max: number }> = {
  1: { types: ['sentences', 'paragraph'], min: 50, max: 100 },
  2: { types: ['paragraph', 'email'], min: 80, max: 120 },
  3: { types: ['paragraph', 'email', 'essay'], min: 120, max: 180 },
  4: { types: ['essay', 'opinion', 'compare'], min: 150, max: 220 },
  5: { types: ['essay', 'formal', 'analysis'], min: 200, max: 300 },
  6: { types: ['ielts_task1', 'ielts_task2'], min: 250, max: 400 },
}

const GRAMMAR_TOPICS: Record<number, string[]> = {
  1: [
    'be verb', 'present simple', 'articles', 'pronouns', 'prepositions',
    'plurals', 'there is/are', 'can/can\'t', 'imperatives', 'adjectives',
    'this/that', 'have/has',
  ],
  2: [
    'past simple regular/irregular', 'future will/going to',
    'present/past continuous', 'comparatives', 'superlatives', 'adverbs',
    'conjunctions', 'quantifiers', 'modals',
  ],
  3: [
    'present perfect', 'past perfect', 'conditionals 0/1', 'passive voice',
    'relative clauses', 'reported speech', 'used to', 'phrasal verbs',
    'gerunds/infinitives',
  ],
  4: [
    'conditionals 2/3', 'advanced passive', 'advanced reported speech',
    'wish/if only', 'causatives', 'inversion', 'emphasis',
  ],
  5: [
    'mixed conditionals', 'subjunctive', 'cleft sentences',
    'participle clauses', 'advanced modals', 'register',
  ],
  6: [
    'IELTS grammar focus', 'error correction', 'sentence transformation',
    'academic structures',
  ],
}

const VERB_DISTRIBUTION: Record<number, number> = {
  1: 30, 2: 30, 3: 25, 4: 25, 5: 20, 6: 20,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LogEntry {
  level: number
  type: string
  batch: number
  count: number
  status: 'success' | 'error'
  error?: string
}

type ContentType = 'reading' | 'speaking' | 'writing' | 'listening' | 'verbs' | 'grammar' | 'all'

// ---------------------------------------------------------------------------
// Helper — call Claude API
// ---------------------------------------------------------------------------
async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<unknown> {
  const apiKey =
    Deno.env.get('CLAUDE_API_KEY') ?? Deno.env.get('ANTHROPIC_API_KEY') ?? ''

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API ${res.status}: ${errText}`)
  }

  const data = await res.json()
  let text: string = data?.content?.[0]?.text ?? ''

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  text = text.trim()

  return JSON.parse(text)
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

async function generateReading(
  supabase: ReturnType<typeof createClient>,
  level: number,
  log: LogEntry[],
  errors: string[],
): Promise<number> {
  let total = 0
  const desc = LEVEL_DESCRIPTIONS[level]

  const systemPrompt = `You are an expert ESL curriculum designer. You create high-quality English reading passages for Arab learners. Always respond with valid JSON only — no markdown, no commentary.`

  // 4 batches of 3 = 12 passages
  for (let batch = 0; batch < 4; batch++) {
    const topicSlice = READING_TOPICS.slice(batch * 3, batch * 3 + 3)
    const userPrompt = `Generate exactly 3 reading passages for ${desc}

Topics for this batch: ${topicSlice.join(', ')}

Return a JSON array where each element has:
- "title_en": string
- "title_ar": string (Arabic translation of title)
- "passage": string (full text matching the word count spec for this level)
- "word_count": number
- "topic": string (one of: ${topicSlice.join(', ')})
- "difficulty": "easy" | "medium" | "hard"
- "questions": array of 5-8 MCQ objects, each with:
    - "question": string
    - "question_ar": string
    - "options": array of 4 strings
    - "correct_answer": number (0-3)
    - "explanation": string
- "vocabulary_words": array of objects, each with:
    - "word": string
    - "meaning_ar": string
    - "example": string

Respond ONLY with the JSON array.`

    try {
      const result = await callClaude(systemPrompt, userPrompt, 8000) as unknown[]

      for (const item of result) {
        const row = item as Record<string, unknown>
        const { error } = await supabase.from('reading_passages').insert({
          level,
          title_en: row.title_en,
          title_ar: row.title_ar,
          passage: row.passage,
          word_count: row.word_count,
          topic: row.topic,
          difficulty: row.difficulty,
          questions: row.questions,
          vocabulary_words: row.vocabulary_words,
        })
        if (error) {
          // Try upsert on conflict — skip gracefully
          console.warn('Insert reading warning:', error.message)
        } else {
          total++
        }
      }

      log.push({ level, type: 'reading', batch: batch + 1, count: (result as unknown[]).length, status: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`Reading L${level} batch ${batch + 1}: ${msg}`)
      log.push({ level, type: 'reading', batch: batch + 1, count: 0, status: 'error', error: msg })
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  return total
}

async function generateSpeaking(
  supabase: ReturnType<typeof createClient>,
  level: number,
  log: LogEntry[],
  errors: string[],
): Promise<number> {
  let total = 0
  const desc = LEVEL_DESCRIPTIONS[level]
  const categories = SPEAKING_CATEGORIES[level]

  const systemPrompt = `You are an expert ESL curriculum designer specializing in speaking practice for Arab learners. Always respond with valid JSON only — no markdown, no commentary.`

  // 3 batches of 8 = 24 topics
  for (let batch = 0; batch < 3; batch++) {
    const startNum = batch * 8 + 1
    const userPrompt = `Generate exactly 8 speaking topics for ${desc}

Categories to use: ${categories.join(', ')}
Starting topic_number: ${startNum}

Return a JSON array where each element has:
- "topic_number": number (starting at ${startNum})
- "title_en": string
- "title_ar": string
- "category": string (one of: ${categories.join(', ')})
- "guiding_questions": array of 3 strings
- "vocabulary_hints": array of 5 strings (useful words/phrases)
- "tips": array of 2 strings (speaking tips)
- "duration_min": number (minutes)
- "duration_max": number (minutes)

Respond ONLY with the JSON array.`

    try {
      const result = await callClaude(systemPrompt, userPrompt, 6000) as unknown[]

      for (const item of result) {
        const row = item as Record<string, unknown>
        const { error } = await supabase.from('speaking_topics').upsert(
          {
            level,
            topic_number: row.topic_number,
            title_en: row.title_en,
            title_ar: row.title_ar,
            category: row.category,
            guiding_questions: row.guiding_questions,
            vocabulary_hints: row.vocabulary_hints,
            tips: row.tips,
            duration_min: row.duration_min,
            duration_max: row.duration_max,
          },
          { onConflict: 'level,topic_number' },
        )
        if (error) {
          console.warn('Upsert speaking warning:', error.message)
        } else {
          total++
        }
      }

      log.push({ level, type: 'speaking', batch: batch + 1, count: (result as unknown[]).length, status: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`Speaking L${level} batch ${batch + 1}: ${msg}`)
      log.push({ level, type: 'speaking', batch: batch + 1, count: 0, status: 'error', error: msg })
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  return total
}

async function generateWriting(
  supabase: ReturnType<typeof createClient>,
  level: number,
  log: LogEntry[],
  errors: string[],
): Promise<number> {
  let total = 0
  const desc = LEVEL_DESCRIPTIONS[level]
  const wSpec = WRITING_TYPES[level]

  const systemPrompt = `You are an expert ESL curriculum designer specializing in writing tasks for Arab learners. Always respond with valid JSON only — no markdown, no commentary.`

  // 2 batches of 4 = 8 prompts
  for (let batch = 0; batch < 2; batch++) {
    const userPrompt = `Generate exactly 4 writing prompts for ${desc}

Allowed prompt types: ${wSpec.types.join(', ')}
Word count range: ${wSpec.min}-${wSpec.max} words

Return a JSON array where each element has:
- "title_en": string
- "title_ar": string
- "prompt_type": string (one of: ${wSpec.types.join(', ')})
- "prompt": string (the writing prompt in English)
- "prompt_ar": string (the writing prompt in Arabic)
- "instructions": array of strings (step-by-step instructions)
- "word_count_min": number
- "word_count_max": number
- "hints": array of strings (helpful hints)
- "example_starter": string (an example opening sentence)
- "evaluation_criteria": array of strings (what will be evaluated)

Respond ONLY with the JSON array.`

    try {
      const result = await callClaude(systemPrompt, userPrompt, 6000) as unknown[]

      for (const item of result) {
        const row = item as Record<string, unknown>
        const { error } = await supabase.from('writing_prompts').insert({
          level,
          title_en: row.title_en,
          title_ar: row.title_ar,
          prompt_type: row.prompt_type,
          prompt: row.prompt,
          prompt_ar: row.prompt_ar,
          instructions: row.instructions,
          word_count_min: row.word_count_min,
          word_count_max: row.word_count_max,
          hints: row.hints,
          example_starter: row.example_starter,
          evaluation_criteria: row.evaluation_criteria,
        })
        if (error) {
          console.warn('Insert writing warning:', error.message)
        } else {
          total++
        }
      }

      log.push({ level, type: 'writing', batch: batch + 1, count: (result as unknown[]).length, status: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`Writing L${level} batch ${batch + 1}: ${msg}`)
      log.push({ level, type: 'writing', batch: batch + 1, count: 0, status: 'error', error: msg })
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  return total
}

async function generateGrammar(
  supabase: ReturnType<typeof createClient>,
  level: number,
  log: LogEntry[],
  errors: string[],
): Promise<number> {
  let total = 0
  const desc = LEVEL_DESCRIPTIONS[level]
  const topics = GRAMMAR_TOPICS[level]

  const systemPrompt = `You are an expert ESL grammar teacher who creates detailed, clear grammar lessons for Arab learners. Explanations in Arabic should be thorough and natural. Always respond with valid JSON only — no markdown, no commentary.`

  // 3 batches of 4 = 12 lessons
  for (let batch = 0; batch < 3; batch++) {
    const startUnit = batch * 4 + 1
    const batchTopics = topics.slice(batch * 4, batch * 4 + 4)
    // If fewer topics than 4, pad with related sub-topics
    const topicList = batchTopics.length > 0 ? batchTopics : topics.slice(0, 4)

    const userPrompt = `Generate exactly ${Math.min(4, topicList.length)} grammar lessons for ${desc}

Grammar topics for this batch: ${topicList.join(', ')}
Starting unit_number: ${startUnit}

Return a JSON array where each element has:
- "unit_number": number (starting at ${startUnit})
- "title_en": string
- "title_ar": string
- "explanation_ar": string (300-500 words, detailed Arabic explanation)
- "explanation_en": string (200-400 words, English explanation)
- "examples": array of 6-10 objects, each with:
    - "sentence": string
    - "translation": string (Arabic)
    - "highlighted_part": string (the grammar point in the sentence)
- "practice_questions": array of 8-12 MCQ objects, each with:
    - "question": string
    - "options": array of 4 strings
    - "correct_answer": number (0-3)
    - "explanation": string
- "common_mistakes": array of 3-5 objects, each with:
    - "mistake": string
    - "correction": string
    - "explanation_ar": string

Respond ONLY with the JSON array.`

    try {
      const result = await callClaude(systemPrompt, userPrompt, 8000) as unknown[]

      for (const item of result) {
        const row = item as Record<string, unknown>
        const { error } = await supabase.from('grammar_lessons').upsert(
          {
            level,
            unit_number: row.unit_number,
            title_en: row.title_en,
            title_ar: row.title_ar,
            explanation_ar: row.explanation_ar,
            explanation_en: row.explanation_en,
            examples: row.examples,
            practice_questions: row.practice_questions,
            common_mistakes: row.common_mistakes,
          },
          { onConflict: 'level,unit_number' },
        )
        if (error) {
          console.warn('Upsert grammar warning:', error.message)
        } else {
          total++
        }
      }

      log.push({ level, type: 'grammar', batch: batch + 1, count: (result as unknown[]).length, status: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`Grammar L${level} batch ${batch + 1}: ${msg}`)
      log.push({ level, type: 'grammar', batch: batch + 1, count: 0, status: 'error', error: msg })
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  return total
}

async function generateVerbs(
  supabase: ReturnType<typeof createClient>,
  log: LogEntry[],
  errors: string[],
): Promise<number> {
  let total = 0

  const systemPrompt = `You are an expert ESL vocabulary specialist. You create comprehensive irregular verb lists for Arab learners, organized by difficulty level. Always respond with valid JSON only — no markdown, no commentary.`

  const distributionDesc = Object.entries(VERB_DISTRIBUTION)
    .map(([lvl, count]) => `Level ${lvl}: ${count} verbs`)
    .join(', ')

  const userPrompt = `Generate exactly 150 irregular English verbs for Arab ESL learners.

Distribution across levels: ${distributionDesc}

Categories to cover: movement, communication, cognition, creation, daily_actions, perception, emotion, possession, transformation, academic

Return a JSON array of 150 objects, each with:
- "level": number (1-6)
- "difficulty_order": number (ordering within the level, starting at 1)
- "base": string (base form)
- "past": string (past simple)
- "past_participle": string
- "meaning_ar": string (Arabic meaning)
- "example_sentence": string (using the verb in context)
- "category": string (one of the categories above)

Order them by level ascending, then difficulty_order ascending.
Respond ONLY with the JSON array.`

  try {
    const result = await callClaude(systemPrompt, userPrompt, 8000) as unknown[]

    for (const item of result) {
      const row = item as Record<string, unknown>
      const { error } = await supabase.from('irregular_verbs').upsert(
        {
          level: row.level,
          difficulty_order: row.difficulty_order,
          base: row.base,
          past: row.past,
          past_participle: row.past_participle,
          meaning_ar: row.meaning_ar,
          example_sentence: row.example_sentence,
          category: row.category,
        },
        { onConflict: 'base' },
      )
      if (error) {
        console.warn('Upsert verb warning:', error.message)
      } else {
        total++
      }
    }

    log.push({ level: 0, type: 'verbs', batch: 1, count: (result as unknown[]).length, status: 'success' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(`Verbs: ${msg}`)
    log.push({ level: 0, type: 'verbs', batch: 1, count: 0, status: 'error', error: msg })
  }

  return total
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ------ Auth: admin only ------
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ------ Parse body ------
    const body = await req.json().catch(() => ({}))
    const requestedLevel: number | undefined = body.level
    const contentType: ContentType = body.content_type ?? 'all'

    const levels = requestedLevel
      ? [requestedLevel]
      : [1, 2, 3, 4, 5, 6]

    // Validate level
    if (requestedLevel && (requestedLevel < 1 || requestedLevel > 6)) {
      return new Response(
        JSON.stringify({ error: 'Level must be between 1 and 6' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ------ Generate content ------
    const log: LogEntry[] = []
    const errorsArr: string[] = []
    const contentGenerated = {
      reading: 0,
      speaking: 0,
      writing: 0,
      grammar: 0,
      verbs: 0,
    }

    const typesToGenerate: ContentType[] =
      contentType === 'all'
        ? ['reading', 'speaking', 'writing', 'grammar', 'verbs']
        : [contentType]

    for (const level of levels) {
      for (const type of typesToGenerate) {
        switch (type) {
          case 'reading':
            contentGenerated.reading += await generateReading(supabase, level, log, errorsArr)
            break
          case 'speaking':
            contentGenerated.speaking += await generateSpeaking(supabase, level, log, errorsArr)
            break
          case 'writing':
            contentGenerated.writing += await generateWriting(supabase, level, log, errorsArr)
            break
          case 'grammar':
            contentGenerated.grammar += await generateGrammar(supabase, level, log, errorsArr)
            break
          case 'verbs':
            // Verbs are generated once for all levels, not per-level
            if (contentGenerated.verbs === 0) {
              contentGenerated.verbs += await generateVerbs(supabase, log, errorsArr)
            }
            break
          case 'listening':
            // Listening not yet implemented — skip silently
            log.push({ level, type: 'listening', batch: 0, count: 0, status: 'success' })
            break
        }
      }
    }

    // ------ Response ------
    return new Response(
      JSON.stringify({
        success: true,
        levels_processed: levels,
        content_generated: contentGenerated,
        log,
        errors: errorsArr,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
