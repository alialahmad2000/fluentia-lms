// Fluentia LMS — Generate Weekly Tasks Edge Function (Claude API)
// Generates weekly learning tasks for all active students every Sunday
// POST — triggered by cron job or admin
// Deploy: supabase functions deploy generate-weekly-tasks
// Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const CLAUDE_MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ACADEMIC_LEVELS: Record<number, {
  cefr: string
  description: string
  article_words: string
  speaking_sec: string
  writing_words: string
}> = {
  1: {
    cefr: 'A1',
    description: 'Simple topics, basic vocabulary, present tense focus',
    article_words: '100-150',
    speaking_sec: '30-60',
    writing_words: '50-100',
  },
  2: {
    cefr: 'A2',
    description: 'Intermediate topics, past tense, common expressions',
    article_words: '200-300',
    speaking_sec: '60-90',
    writing_words: '100-150',
  },
  3: {
    cefr: 'B1',
    description: 'Varied topics, mixed tenses, opinions and descriptions',
    article_words: '300-500',
    speaking_sec: '90-120',
    writing_words: '150-250',
  },
  4: {
    cefr: 'B2',
    description: 'Complex topics, advanced grammar, argumentation',
    article_words: '500-700',
    speaking_sec: '120-180',
    writing_words: '250-400',
  },
  5: {
    cefr: 'C1',
    description: 'Advanced/IELTS-level, nuanced discussion, academic writing',
    article_words: '700+',
    speaking_sec: '180+',
    writing_words: '400-600',
  },
}

interface TaskGenerationResult {
  speaking: Array<{
    title: string
    title_ar: string
    instructions: string
    instructions_ar: string
    topic: string
    guiding_questions: string[]
    min_duration_sec: number
    max_duration_sec: number
  }>
  reading: Array<{
    title: string
    title_ar: string
    instructions: string
    instructions_ar: string
    article_title: string
    article_text: string
    word_count: number
    questions: Array<{
      question: string
      type: string
      options: string[]
      correct_answer: string
      explanation: string
    }>
  }>
  writing: Array<{
    title: string
    title_ar: string
    instructions: string
    instructions_ar: string
    prompt: string
    word_limit_min: number
    word_limit_max: number
    focus_areas: string[]
  }>
  listening: Array<{
    title: string
    title_ar: string
    instructions: string
    instructions_ar: string
    topic_description: string
    questions: Array<{
      question: string
      type: string
      options: string[]
      correct_answer: string
      explanation: string
    }>
  }>
  vocabulary: Array<{
    title: string
    title_ar: string
    instructions: string
    instructions_ar: string
    words: Array<{
      word: string
      definition: string
      translation_ar: string
      example_sentence: string
      part_of_speech: string
    }>
  }>
}

/**
 * Calculate the current week boundaries (Sunday to Saturday).
 */
function getWeekBoundaries(): { weekStart: string; weekEnd: string } {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0 = Sunday
  const sunday = new Date(now)
  sunday.setUTCDate(now.getUTCDate() - dayOfWeek)
  sunday.setUTCHours(0, 0, 0, 0)

  const saturday = new Date(sunday)
  saturday.setUTCDate(sunday.getUTCDate() + 6)
  saturday.setUTCHours(23, 59, 59, 999)

  const weekStart = sunday.toISOString().split('T')[0]
  const weekEnd = saturday.toISOString().split('T')[0]

  return { weekStart, weekEnd }
}

/**
 * Call Claude API to generate weekly tasks for a student.
 */
async function generateTasksWithClaude(
  academicLevel: number,
  difficultyScore: number = 0.50
): Promise<{ result: TaskGenerationResult; inputTokens: number; outputTokens: number }> {
  const level = ACADEMIC_LEVELS[academicLevel] || ACADEMIC_LEVELS[1]

  const difficultyLabel = difficultyScore >= 0.75 ? 'challenging' : difficultyScore >= 0.50 ? 'moderate' : 'easier'

  const systemPrompt = `You are an English teacher at Fluentia Academy for Arabic-speaking adults. Generate weekly learning tasks.

You must output ONLY valid JSON — no markdown, no code fences, no commentary.`

  const userPrompt = `Generate a full week of English learning tasks for a student at level ${academicLevel} (CEFR ${level.cefr}).

Level details: ${level.description}
Difficulty: ${difficultyLabel} (${difficultyScore.toFixed(2)} on 0-1 scale). ${difficultyScore >= 0.70 ? 'Push the student with more complex topics and grammar.' : difficultyScore <= 0.35 ? 'Keep it simple and encouraging. Use familiar topics.' : 'Standard difficulty for this level.'}

Requirements:
- 3 speaking tasks (min/max duration: ${level.speaking_sec} seconds)
- 2 reading tasks (article length: ${level.article_words} words, 5 MCQ questions each)
- 1 writing task (word limit: ${level.writing_words} words)
- 1 listening task (with 5 comprehension questions)
- 1 vocabulary task (10 words appropriate for this level with definitions, Arabic translations, example sentences, and part of speech)

All tasks must include both English and Arabic titles/instructions (title, title_ar, instructions, instructions_ar).
Content should be culturally appropriate for Arabic-speaking adult learners.
Topics should be varied and engaging (daily life, travel, work, culture, technology, health, etc.).

Respond with this exact JSON structure:
{
  "speaking": [
    { "title": "...", "title_ar": "...", "instructions": "...", "instructions_ar": "...", "topic": "...", "guiding_questions": ["..."], "min_duration_sec": 30, "max_duration_sec": 60 }
  ],
  "reading": [
    { "title": "...", "title_ar": "...", "instructions": "...", "instructions_ar": "...", "article_title": "...", "article_text": "...", "word_count": 150, "questions": [{"question": "...", "type": "mcq", "options": ["A","B","C","D"], "correct_answer": "B", "explanation": "..."}] }
  ],
  "writing": [
    { "title": "...", "title_ar": "...", "instructions": "...", "instructions_ar": "...", "prompt": "...", "word_limit_min": 50, "word_limit_max": 100, "focus_areas": ["grammar","vocabulary"] }
  ],
  "listening": [
    { "title": "...", "title_ar": "...", "instructions": "...", "instructions_ar": "...", "topic_description": "...", "questions": [{"question": "...", "type": "mcq", "options": ["A","B","C","D"], "correct_answer": "...", "explanation": "..."}] }
  ],
  "vocabulary": [
    { "title": "...", "title_ar": "...", "instructions": "...", "instructions_ar": "...", "words": [{"word": "...", "definition": "...", "translation_ar": "...", "example_sentence": "...", "part_of_speech": "noun/verb/adjective/adverb"}] }
  ]
}

Provide exactly 3 speaking, 2 reading, 1 writing, 1 listening, 1 vocabulary tasks. Each reading task must have exactly 5 questions. The listening task must have exactly 5 questions. The vocabulary task must have exactly 10 words.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  const inputTokens: number = data.usage?.input_tokens ?? 0
  const outputTokens: number = data.usage?.output_tokens ?? 0

  const rawText: string = data.content?.[0]?.text ?? ''

  // Robust JSON parsing — handle markdown fences, leading text, trailing text
  let jsonStr = rawText.trim()

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  if (jsonStr.includes('```')) {
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    } else {
      // Fallback: strip all code fences
      jsonStr = jsonStr.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?\s*```/g, '').trim()
    }
  }

  // If there's text before the first {, strip it
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace > 0 || lastBrace < jsonStr.length - 1) {
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
    }
  }

  let result: TaskGenerationResult
  try {
    result = JSON.parse(jsonStr)
  } catch (parseErr) {
    console.error('JSON parse failed. Raw text (first 500 chars):', rawText.slice(0, 500))
    throw new Error(`Failed to parse Claude response as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
  }

  // Validate that required keys exist
  if (!result.speaking || !result.reading || !result.writing || !result.listening || !result.vocabulary) {
    throw new Error(`Incomplete task generation — missing keys. Got: ${Object.keys(result).join(', ')}`)
  }

  return { result, inputTokens, outputTokens }
}

/**
 * Fetch irregular verbs appropriate for student level that they haven't mastered.
 */
async function getIrregularVerbs(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  academicLevel: number
): Promise<Array<{ id: string; base_form: string; past_simple: string; past_participle: string; meaning_ar: string }>> {
  // Get verbs the student has already mastered
  const { data: masteredVerbs } = await supabase
    .from('student_verb_progress')
    .select('verb_id')
    .eq('student_id', studentId)
    .eq('mastery', 'mastered')

  const masteredIds = (masteredVerbs || []).map((v: { verb_id: string }) => v.verb_id)

  // Query irregular verbs appropriate for the student's level
  let query = supabase
    .from('irregular_verbs')
    .select('id, base_form, past_simple, past_participle, meaning_ar')
    .lte('level_appropriate', academicLevel)
    .order('frequency_rank')
    .limit(5)

  if (masteredIds.length > 0) {
    // Exclude already-mastered verbs
    query = query.not('id', 'in', `(${masteredIds.join(',')})`)
  }

  const { data: verbs, error } = await query

  if (error) {
    console.error('Error fetching irregular verbs:', error.message)
    return []
  }

  return verbs || []
}

/**
 * Pull content from curriculum bank tables. Returns TaskGenerationResult format
 * or null if insufficient content is available.
 * Requires: 2 reading passages, 3 speaking topics, 1 writing prompt, 1 listening exercise.
 */
async function pullFromCurriculumBank(
  supabase: ReturnType<typeof createClient>,
  academicLevel: number,
  studentId: string
): Promise<{ result: TaskGenerationResult; sourceIds: Array<{ id: string; table: string }> } | null> {
  const level = ACADEMIC_LEVELS[academicLevel] || ACADEMIC_LEVELS[1]

  // Determine this month's boundaries for excluding recently-used content
  const now = new Date()
  const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString()

  // Get source_ids already used by this student this month
  const { data: recentTasks } = await supabase
    .from('weekly_tasks')
    .select('content')
    .eq('student_id', studentId)
    .gte('created_at', monthStart)

  const usedSourceIds = new Set<string>()
  if (recentTasks) {
    for (const task of recentTasks) {
      const content = task.content as Record<string, unknown> | null
      if (content?.source_id) {
        usedSourceIds.add(content.source_id as string)
      }
    }
  }

  // --- Query reading passages (need 2) ---
  const { data: readingRows } = await supabase
    .from('curriculum_reading_passages')
    .select('*')
    .eq('level', academicLevel)
    .order('times_used', { ascending: true })
    .limit(10) // fetch extra to filter out used ones

  const filteredReading = (readingRows || []).filter((r: any) => !usedSourceIds.has(r.id)).slice(0, 2)
  if (filteredReading.length < 2) return null

  // --- Query speaking topics (need 3) ---
  const { data: speakingRows } = await supabase
    .from('curriculum_speaking_topics')
    .select('*')
    .eq('level', academicLevel)
    .order('times_used', { ascending: true })
    .limit(15)

  const filteredSpeaking = (speakingRows || []).filter((r: any) => !usedSourceIds.has(r.id)).slice(0, 3)
  if (filteredSpeaking.length < 3) return null

  // --- Query writing prompts (need 1) ---
  const { data: writingRows } = await supabase
    .from('curriculum_writing_prompts')
    .select('*')
    .eq('level', academicLevel)
    .order('times_used', { ascending: true })
    .limit(5)

  const filteredWriting = (writingRows || []).filter((r: any) => !usedSourceIds.has(r.id)).slice(0, 1)
  if (filteredWriting.length < 1) return null

  // --- Query listening exercises (need 1) ---
  const { data: listeningRows } = await supabase
    .from('curriculum_listening_exercises')
    .select('*')
    .eq('level', academicLevel)
    .order('times_used', { ascending: true })
    .limit(5)

  const filteredListening = (listeningRows || []).filter((r: any) => !usedSourceIds.has(r.id)).slice(0, 1)
  if (filteredListening.length < 1) return null

  // All content available — track source IDs for times_used update
  const sourceIds: Array<{ id: string; table: string }> = []

  // Helper: convert 0-3 index correct_answer to "A"/"B"/"C"/"D"
  const indexToLetter = (idx: number | string): string => {
    if (typeof idx === 'string') {
      // Already a letter
      if (['A', 'B', 'C', 'D'].includes(idx.toUpperCase())) return idx.toUpperCase()
      // Might be a numeric string
      const n = parseInt(idx, 10)
      if (!isNaN(n)) return ['A', 'B', 'C', 'D'][n] || 'A'
      return idx
    }
    return ['A', 'B', 'C', 'D'][idx] || 'A'
  }

  // --- Transform reading passages ---
  const reading: TaskGenerationResult['reading'] = filteredReading.map((r: any) => {
    sourceIds.push({ id: r.id, table: 'curriculum_reading_passages' })
    const questions = (r.questions || []).map((q: any) => ({
      question: q.question || q.text || '',
      type: q.type || 'mcq',
      options: q.options || [],
      correct_answer: indexToLetter(q.correct_answer),
      explanation: q.explanation || '',
    }))
    return {
      title: r.title_en,
      title_ar: r.title_ar,
      instructions: `Read the passage carefully and answer the comprehension questions. The passage is approximately ${r.word_count} words.`,
      instructions_ar: `اقرأ النص بعناية ثم أجب عن أسئلة الفهم. النص يتكون من حوالي ${r.word_count} كلمة.`,
      article_title: r.title_en,
      article_text: r.passage,
      word_count: r.word_count,
      questions,
    }
  })

  // --- Transform speaking topics ---
  const speaking: TaskGenerationResult['speaking'] = filteredSpeaking.map((s: any) => {
    sourceIds.push({ id: s.id, table: 'curriculum_speaking_topics' })
    return {
      title: s.title_en,
      title_ar: s.title_ar,
      instructions: `Speak about the following topic. Use the guiding questions to help structure your response. Aim for ${s.duration_min}-${s.duration_max} seconds.`,
      instructions_ar: `تحدث عن الموضوع التالي. استخدم الأسئلة الإرشادية لتنظيم إجابتك. استهدف ${s.duration_min}-${s.duration_max} ثانية.`,
      topic: s.title_en,
      guiding_questions: s.guiding_questions || [],
      min_duration_sec: s.duration_min || 60,
      max_duration_sec: s.duration_max || 90,
    }
  })

  // --- Transform writing prompt ---
  const writing: TaskGenerationResult['writing'] = filteredWriting.map((w: any) => {
    sourceIds.push({ id: w.id, table: 'curriculum_writing_prompts' })
    return {
      title: w.title_en,
      title_ar: w.title_ar,
      instructions: `Write a ${w.prompt_type} about the topic below. Aim for ${w.word_count_min}-${w.word_count_max} words.`,
      instructions_ar: `اكتب ${w.prompt_type} عن الموضوع أدناه. استهدف ${w.word_count_min}-${w.word_count_max} كلمة.`,
      prompt: w.prompt,
      word_limit_min: w.word_count_min,
      word_limit_max: w.word_count_max,
      focus_areas: w.evaluation_criteria || ['grammar', 'vocabulary', 'structure', 'clarity'],
    }
  })

  // --- Transform listening exercise ---
  const listening: TaskGenerationResult['listening'] = filteredListening.map((l: any) => {
    sourceIds.push({ id: l.id, table: 'curriculum_listening_exercises' })
    const questions = (l.questions || []).map((q: any) => ({
      question: q.question || q.text || '',
      type: q.type || 'mcq',
      options: q.options || [],
      correct_answer: indexToLetter(q.correct_answer),
      explanation: q.explanation || '',
    }))
    return {
      title: l.title_en,
      title_ar: l.title_ar,
      instructions: `Listen to the audio and answer the comprehension questions.`,
      instructions_ar: `استمع إلى المقطع الصوتي ثم أجب عن أسئلة الفهم.`,
      topic_description: l.description_ar || l.youtube_title || '',
      questions,
    }
  })

  // Vocabulary is left empty — will still be generated by Claude or handled separately
  const vocabulary: TaskGenerationResult['vocabulary'] = []

  // Increment times_used for all selected items
  // supabase-js doesn't support SQL increment, so fetch current value and update
  for (const src of sourceIds) {
    const { data: currentRow } = await supabase
      .from(src.table)
      .select('times_used')
      .eq('id', src.id)
      .single()
    if (currentRow) {
      await supabase
        .from(src.table)
        .update({ times_used: (currentRow.times_used || 0) + 1 })
        .eq('id', src.id)
    }
  }

  return {
    result: { speaking, reading, writing, listening, vocabulary },
    sourceIds,
  }
}

/**
 * Calculate adaptive difficulty score (0.00-1.00) based on recent performance.
 * Higher score = student is doing well = increase difficulty next week.
 */
async function calculateDifficulty(
  supabase: ReturnType<typeof createClient>,
  studentId: string
): Promise<number> {
  // Get last 2 weeks of graded task sets
  const { data: recentSets } = await supabase
    .from('weekly_task_sets')
    .select('difficulty_score, completion_percentage')
    .eq('student_id', studentId)
    .order('week_start', { ascending: false })
    .limit(2)

  if (!recentSets || recentSets.length === 0) return 0.50 // Default

  // Get recent graded tasks average score
  const { data: recentTasks } = await supabase
    .from('weekly_tasks')
    .select('auto_score, status')
    .eq('student_id', studentId)
    .eq('status', 'graded')
    .order('submitted_at', { ascending: false })
    .limit(16) // ~2 weeks worth

  if (!recentTasks || recentTasks.length === 0) return 0.50

  const avgScore = recentTasks.reduce((sum, t) => sum + (t.auto_score || 0), 0) / recentTasks.length
  const completionRate = recentSets[0]?.completion_percentage || 50

  const lastDifficulty = recentSets[0]?.difficulty_score || 0.50

  // Adjust: good performance → increase, poor → decrease
  let adjustment = 0
  if (avgScore >= 85 && completionRate >= 80) adjustment = 0.08
  else if (avgScore >= 70 && completionRate >= 60) adjustment = 0.03
  else if (avgScore < 50 || completionRate < 40) adjustment = -0.08
  else if (avgScore < 65) adjustment = -0.03

  // Clamp between 0.20 and 0.95
  return Math.max(0.20, Math.min(0.95, lastDifficulty + adjustment))
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  // Auth: require service-role key or admin JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body for optional filters
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { body = {} }
    const forceRegenerate = body.force === true
    const missingOnly = body.missing_only === true
    const filterGroupId = body.group_id as string | undefined
    const filterStudentIds = body.student_ids as string[] | undefined

    // 1. Query all active students
    let studentsQuery = supabase
      .from('students')
      .select('id, academic_level, group_id')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (filterGroupId) studentsQuery = studentsQuery.eq('group_id', filterGroupId)
    if (filterStudentIds?.length) studentsQuery = studentsQuery.in('id', filterStudentIds)

    const { data: students, error: studentsErr } = await studentsQuery

    if (studentsErr) {
      throw new Error(`Failed to fetch students: ${studentsErr.message}`)
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ generated: 0, skipped: 0, errors: [], message: 'No active students found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 2. Calculate week boundaries
    const { weekStart, weekEnd } = getWeekBoundaries()

    // If missing_only mode: filter to only students who DON'T have tasks this week
    let targetStudents = students
    if (missingOnly) {
      const { data: existingSets } = await supabase
        .from('weekly_task_sets')
        .select('student_id')
        .eq('week_start', weekStart)

      const hasTasksSet = new Set((existingSets || []).map((s: { student_id: string }) => s.student_id))
      const before = students.length
      targetStudents = students.filter(s => !hasTasksSet.has(s.id))
      console.log(`Missing-only mode: ${before} total students, ${targetStudents.length} without tasks this week`)

      if (targetStudents.length === 0) {
        return new Response(
          JSON.stringify({
            generated: 0, skipped: 0, errors: [],
            message: `جميع الطلاب لديهم مهام هذا الأسبوع (${before} طالب)`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }
    console.log(`Generating tasks for week: ${weekStart} to ${weekEnd}`)

    // 2.5. Check for holidays that overlap with this week
    const { data: holidays } = await supabase
      .from('holidays')
      .select('id, name, start_date, end_date')
      .lte('start_date', weekEnd)
      .gte('end_date', weekStart)

    if (holidays && holidays.length > 0) {
      const holidayNames = holidays.map((h: any) => h.name).join(', ')
      console.log(`Week overlaps with holiday(s): ${holidayNames} — skipping generation`)
      return new Response(
        JSON.stringify({
          generated: 0,
          skipped: 0,
          errors: [],
          message: `تم تخطي الأسبوع بسبب العطلة: ${holidayNames}`,
          holidays: holidays.map((h: any) => h.name),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    let generated = 0
    let skipped = 0
    const errors: string[] = []

    // Cache Claude results per level+difficulty band to avoid redundant API calls
    // Key format: "${academicLevel}_${difficultyLabel}" so students at same level
    // but very different difficulties get different content
    const levelCache: Record<string, {
      result: TaskGenerationResult
      inputTokens: number
      outputTokens: number
    }> = {}

    // Pre-warm the Claude cache: generate for each unique level BEFORE the student loop
    // This prevents timeout issues when processing many students sequentially
    const uniqueLevels = [...new Set(targetStudents.map(s => s.academic_level || 1))]
    for (const level of uniqueLevels) {
      // Try curriculum bank first for this level (using a dummy student check)
      const bankTest = await pullFromCurriculumBank(supabase, level, targetStudents[0].id)
      if (!bankTest) {
        // No bank content — pre-generate with Claude for all difficulty bands
        for (const diffLabel of ['easier', 'moderate', 'challenging'] as const) {
          const diffScore = diffLabel === 'challenging' ? 0.80 : diffLabel === 'moderate' ? 0.55 : 0.35
          const cacheKey = `${level}_${diffLabel}`
          if (!levelCache[cacheKey]) {
            try {
              const claudeResult = await generateTasksWithClaude(level, diffScore)
              levelCache[cacheKey] = claudeResult
              const costSar =
                (claudeResult.inputTokens * 0.003 / 1000) * 3.75 +
                (claudeResult.outputTokens * 0.015 / 1000) * 3.75
              await supabase.from('ai_usage').insert({
                type: 'weekly_tasks',
                model: CLAUDE_MODEL,
                input_tokens: claudeResult.inputTokens,
                output_tokens: claudeResult.outputTokens,
                estimated_cost_sar: costSar,
              })
              console.log(`Pre-warmed cache for level ${level}, ${diffLabel}`)
            } catch (err) {
              console.error(`Failed to pre-warm cache for level ${level}, ${diffLabel}:`, err)
            }
          }
        }
      }
    }

    // 3. Process each student — helper function for concurrent processing
    async function processStudent(student: { id: string; academic_level: number; group_id: string }) {
      const studentId: string = student.id
      const academicLevel: number = student.academic_level || 1

      // Check if tasks already generated for this week
      const { data: existing } = await supabase
        .from('weekly_task_sets')
        .select('id')
        .eq('student_id', studentId)
        .eq('week_start', weekStart)
        .limit(1)

      // Remember old set IDs for deferred deletion (Bug fix: don't delete before Claude succeeds)
      let oldSetIds: string[] = []

      if (existing && existing.length > 0) {
        if (forceRegenerate) {
          oldSetIds = existing.map((s: { id: string }) => s.id)
          console.log(`Force regenerate: will replace ${oldSetIds.length} existing set(s) for student ${studentId}`)
        } else {
          console.log(`Tasks already exist for student ${studentId}, skipping`)
          return 'skipped' as const
        }
      }

      // Calculate adaptive difficulty for this student
      const difficultyScore = await calculateDifficulty(supabase, studentId)

      const difficultyLabel = difficultyScore >= 0.75 ? 'challenging' : difficultyScore >= 0.50 ? 'moderate' : 'easier'
      const cacheKey = `${academicLevel}_${difficultyLabel}`

      // Generate tasks — try curriculum bank first (instant, no API cost)
      let taskData: TaskGenerationResult
      let inputTokens: number
      let outputTokens: number
      let bankSourceIds: Array<{ id: string; table: string }> = []

      const bankResult = await pullFromCurriculumBank(supabase, academicLevel, studentId)
      if (bankResult) {
        taskData = bankResult.result
        inputTokens = 0
        outputTokens = 0
        bankSourceIds = bankResult.sourceIds
        console.log(`Used curriculum bank for student ${studentId} (level ${academicLevel})`)
      } else if (levelCache[cacheKey]) {
        taskData = levelCache[cacheKey].result
        inputTokens = levelCache[cacheKey].inputTokens
        outputTokens = levelCache[cacheKey].outputTokens
        console.log(`Used cached Claude result for student ${studentId} (level ${academicLevel}, ${difficultyLabel})`)
      } else {
        // Fallback: generate with Claude (should rarely happen since we pre-warmed)
        const claudeResult = await generateTasksWithClaude(academicLevel, difficultyScore)
        taskData = claudeResult.result
        inputTokens = claudeResult.inputTokens
        outputTokens = claudeResult.outputTokens
        levelCache[cacheKey] = claudeResult

        const costSar =
          (inputTokens * 0.003 / 1000) * 3.75 +
          (outputTokens * 0.015 / 1000) * 3.75

        await supabase.from('ai_usage').insert({
          type: 'weekly_tasks',
          model: CLAUDE_MODEL,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          estimated_cost_sar: costSar,
        })
        console.log(`Used Claude API for student ${studentId} (level ${academicLevel}, ${difficultyLabel})`)
      }

        // Fetch irregular verbs for this student
        const irregularVerbs = await getIrregularVerbs(supabase, studentId, academicLevel)

        // Calculate deadline (Saturday 23:59 AST)
        const deadlineDate = new Date(weekEnd + 'T23:59:59+03:00')
        const deadlineISO = deadlineDate.toISOString()

        // Insert weekly_task_set
        const { data: taskSet, error: taskSetErr } = await supabase
          .from('weekly_task_sets')
          .insert({
            student_id: studentId,
            week_start: weekStart,
            week_end: weekEnd,
            level_at_generation: academicLevel,
            difficulty_score: difficultyScore,
            status: 'active',
          })
          .select('id')
          .single()

        if (taskSetErr || !taskSet) {
          throw new Error(`Failed to create task set for student ${studentId}: ${taskSetErr?.message}`)
        }

        const taskSetId: string = taskSet.id
        const tasksToInsert: Array<Record<string, unknown>> = []

        // Helper: build a map from bank source index to source info for content tracking
        // bankSourceIds order: reading[0], reading[1], speaking[0..2], writing[0], listening[0]
        // We track per-type index counters
        let bankReadingIdx = 0
        let bankSpeakingIdx = 0
        let bankWritingIdx = 0
        let bankListeningIdx = 0

        const getBankSource = (type: string): { source_id: string; source_table: string } | undefined => {
          if (bankSourceIds.length === 0) return undefined
          let idx: number
          switch (type) {
            case 'reading':
              idx = bankReadingIdx++
              break
            case 'speaking':
              idx = bankSpeakingIdx++
              break
            case 'writing':
              idx = bankWritingIdx++
              break
            case 'listening':
              idx = bankListeningIdx++
              break
            default:
              return undefined
          }
          const src = bankSourceIds.find((s, i) => {
            // Count how many of this table we've seen before index i
            const tableMap: Record<string, string> = {
              'curriculum_reading_passages': 'reading',
              'curriculum_speaking_topics': 'speaking',
              'curriculum_writing_prompts': 'writing',
              'curriculum_listening_exercises': 'listening',
            }
            if (tableMap[s.table] !== type) return false
            const countBefore = bankSourceIds.slice(0, i).filter(x => x.table === s.table).length
            return countBefore === idx
          })
          return src ? { source_id: src.id, source_table: src.table } : undefined
        }

        // Speaking tasks (3)
        for (let i = 0; i < taskData.speaking.length; i++) {
          const t = taskData.speaking[i]
          const bankSrc = getBankSource('speaking')
          tasksToInsert.push({
            task_set_id: taskSetId,
            student_id: studentId,
            type: 'speaking',
            title: t.title,
            title_ar: t.title_ar,
            instructions: t.instructions,
            instructions_ar: t.instructions_ar,
            content: {
              topic: t.topic,
              guiding_questions: t.guiding_questions,
              min_duration_sec: t.min_duration_sec,
              max_duration_sec: t.max_duration_sec,
              ...(bankSrc ? { source_id: bankSrc.source_id, source_table: bankSrc.source_table } : {}),
            },
            sequence_number: i + 1,
            level: academicLevel,
            deadline: deadlineISO,
            status: 'pending',
          })
        }

        // Reading tasks (2)
        for (let i = 0; i < taskData.reading.length; i++) {
          const t = taskData.reading[i]
          const bankSrc = getBankSource('reading')
          tasksToInsert.push({
            task_set_id: taskSetId,
            student_id: studentId,
            type: 'reading',
            title: t.title,
            title_ar: t.title_ar,
            instructions: t.instructions,
            instructions_ar: t.instructions_ar,
            content: {
              article_title: t.article_title,
              article_text: t.article_text,
              word_count: t.word_count,
              questions: t.questions,
              ...(bankSrc ? { source_id: bankSrc.source_id, source_table: bankSrc.source_table } : {}),
            },
            sequence_number: taskData.speaking.length + i + 1,
            level: academicLevel,
            deadline: deadlineISO,
            status: 'pending',
          })
        }

        // Writing task (1)
        for (let i = 0; i < taskData.writing.length; i++) {
          const t = taskData.writing[i]
          const bankSrc = getBankSource('writing')
          tasksToInsert.push({
            task_set_id: taskSetId,
            student_id: studentId,
            type: 'writing',
            title: t.title,
            title_ar: t.title_ar,
            instructions: t.instructions,
            instructions_ar: t.instructions_ar,
            content: {
              prompt: t.prompt,
              word_limit_min: t.word_limit_min,
              word_limit_max: t.word_limit_max,
              focus_areas: t.focus_areas,
              ...(bankSrc ? { source_id: bankSrc.source_id, source_table: bankSrc.source_table } : {}),
            },
            sequence_number: taskData.speaking.length + taskData.reading.length + i + 1,
            level: academicLevel,
            deadline: deadlineISO,
            status: 'pending',
          })
        }

        // Listening task (1)
        for (let i = 0; i < taskData.listening.length; i++) {
          const t = taskData.listening[i]
          const bankSrc = getBankSource('listening')
          tasksToInsert.push({
            task_set_id: taskSetId,
            student_id: studentId,
            type: 'listening',
            title: t.title,
            title_ar: t.title_ar,
            instructions: t.instructions,
            instructions_ar: t.instructions_ar,
            content: {
              topic_description: t.topic_description,
              questions: t.questions,
              ...(bankSrc ? { source_id: bankSrc.source_id, source_table: bankSrc.source_table } : {}),
            },
            sequence_number:
              taskData.speaking.length +
              taskData.reading.length +
              taskData.writing.length +
              i +
              1,
            level: academicLevel,
            deadline: deadlineISO,
            status: 'pending',
          })
        }

        // Irregular verbs exercise (1)
        if (irregularVerbs.length > 0) {
          tasksToInsert.push({
            task_set_id: taskSetId,
            student_id: studentId,
            type: 'irregular_verbs',
            title: 'Irregular Verbs Practice',
            title_ar: 'تمرين الأفعال الشاذة',
            instructions: 'Practice the following irregular verbs. Learn their base form, past simple, and past participle.',
            instructions_ar: 'تدرّب على الأفعال الشاذة التالية. تعلّم صيغة المصدر والماضي البسيط واسم المفعول.',
            content: {
              verbs: irregularVerbs.map((v) => ({
                id: v.id,
                base_form: v.base_form,
                past_simple: v.past_simple,
                past_participle: v.past_participle,
                meaning_ar: v.meaning_ar,
              })),
            },
            sequence_number:
              taskData.speaking.length +
              taskData.reading.length +
              taskData.writing.length +
              taskData.listening.length +
              1,
            level: academicLevel,
            deadline: deadlineISO,
            status: 'pending',
          })
        }

        // Vocabulary task (1)
        if (taskData.vocabulary && taskData.vocabulary.length > 0) {
          const t = taskData.vocabulary[0]
          tasksToInsert.push({
            task_set_id: taskSetId,
            student_id: studentId,
            type: 'vocabulary',
            title: t.title,
            title_ar: t.title_ar,
            instructions: t.instructions,
            instructions_ar: t.instructions_ar,
            content: {
              words: t.words,
            },
            sequence_number:
              taskData.speaking.length +
              taskData.reading.length +
              taskData.writing.length +
              taskData.listening.length +
              (irregularVerbs.length > 0 ? 2 : 1), // +2 if irregular_verbs exists, +1 otherwise
            level: academicLevel,
            deadline: deadlineISO,
            status: 'pending',
          })
        }

        // Bulk insert all tasks
        const { error: insertErr } = await supabase
          .from('weekly_tasks')
          .insert(tasksToInsert)

        if (insertErr) {
          throw new Error(`Failed to insert tasks for student ${studentId}: ${insertErr.message}`)
        }

        // NOW that new tasks are safely inserted, delete old sets if force-regenerating
        if (oldSetIds.length > 0) {
          console.log(`Deleting ${oldSetIds.length} old task set(s) for student ${studentId}`)
          for (const oldSetId of oldSetIds) {
            await supabase.from('weekly_tasks').delete().eq('task_set_id', oldSetId)
            await supabase.from('weekly_task_sets').delete().eq('id', oldSetId)
          }
        }

        // Update task set with total_tasks count
        await supabase
          .from('weekly_task_sets')
          .update({ total_tasks: tasksToInsert.length })
          .eq('id', taskSetId)

        // Create notification AFTER tasks saved successfully
        try {
          await supabase.from('notifications').insert({
            user_id: studentId,
            type: 'weekly_tasks_ready',
            title: 'مهام الأسبوع الجديدة جاهزة!',
            body: `تم إنشاء ${tasksToInsert.length} مهام تعلم خاصة بك لهذا الأسبوع. ابدأ الآن!`,
            read: false,
          })
        } catch (notifErr) {
          // Notification failure should not fail the whole generation
          console.error(`Notification insert failed for student ${studentId}:`, notifErr)
        }

        console.log(`Generated ${tasksToInsert.length} tasks for student ${studentId}`)
        return 'generated' as const
      } // end processStudent

    // Process students in concurrent batches of 5 to avoid timeout
    const BATCH_SIZE = 5
    for (let i = 0; i < targetStudents.length; i += BATCH_SIZE) {
      const batch = targetStudents.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (student) => {
          try {
            return await processStudent(student)
          } catch (studentErr) {
            const msg = studentErr instanceof Error ? studentErr.message : String(studentErr)
            console.error(`Error processing student ${student.id}: ${msg}`)
            errors.push(`Student ${student.id}: ${msg}`)
            return 'failed' as const
          }
        })
      )
      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value === 'generated') generated++
          else if (result.value === 'skipped') skipped++
        } else {
          errors.push(result.reason?.message || String(result.reason))
        }
      }
    }

    const summary = {
      generated,
      skipped,
      errors,
      week_start: weekStart,
      week_end: weekEnd,
      total_students: targetStudents.length,
      message: generated > 0
        ? `تم إنشاء المهام لـ ${generated} طالب بنجاح`
        : skipped > 0
        ? `المهام موجودة بالفعل لهذا الأسبوع (${weekStart}). استخدم "إعادة إنشاء" لإنشائها من جديد.`
        : errors.length > 0
        ? `فشل الإنشاء لجميع الطلاب. تحقق من الأخطاء.`
        : 'لا يوجد طلاب نشطون',
    }
    console.log('Weekly task generation complete:', JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Fatal error in generate-weekly-tasks:', message)

    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
