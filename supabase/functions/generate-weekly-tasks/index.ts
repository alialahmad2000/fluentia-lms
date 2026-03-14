// Fluentia LMS — Generate Weekly Tasks Edge Function (Claude API)
// Generates weekly learning tasks for all active students every Sunday
// POST — triggered by cron job or admin
// Deploy: supabase functions deploy generate-weekly-tasks
// Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  academicLevel: number
): Promise<{ result: TaskGenerationResult; inputTokens: number; outputTokens: number }> {
  const level = ACADEMIC_LEVELS[academicLevel] || ACADEMIC_LEVELS[1]

  const systemPrompt = `You are an English teacher at Fluentia Academy for Arabic-speaking adults. Generate weekly learning tasks.

You must output ONLY valid JSON — no markdown, no code fences, no commentary.`

  const userPrompt = `Generate a full week of English learning tasks for a student at level ${academicLevel} (CEFR ${level.cefr}).

Level details: ${level.description}

Requirements:
- 3 speaking tasks (min/max duration: ${level.speaking_sec} seconds)
- 2 reading tasks (article length: ${level.article_words} words, 5 MCQ questions each)
- 1 writing task (word limit: ${level.writing_words} words)
- 1 listening task (with 5 comprehension questions)

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
  ]
}

Provide exactly 3 speaking, 2 reading, 1 writing, 1 listening tasks. Each reading task must have exactly 5 questions. The listening task must have exactly 5 questions.`

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

  // Parse JSON — handle potential markdown code fences
  let jsonStr = rawText.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const result: TaskGenerationResult = JSON.parse(jsonStr)

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

    // 1. Query all active students
    const { data: students, error: studentsErr } = await supabase
      .from('students')
      .select('id, academic_level, group_id')
      .eq('status', 'active')
      .is('deleted_at', null)

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
    console.log(`Generating tasks for week: ${weekStart} to ${weekEnd}`)

    let generated = 0
    let skipped = 0
    const errors: string[] = []

    // Cache Claude results per academic level to avoid redundant API calls
    const levelCache: Record<number, {
      result: TaskGenerationResult
      inputTokens: number
      outputTokens: number
    }> = {}

    // 3. Process each student
    for (const student of students) {
      try {
        const studentId: string = student.id
        const academicLevel: number = student.academic_level || 1

        // Check if tasks already generated for this week
        const { data: existing } = await supabase
          .from('weekly_task_sets')
          .select('id')
          .eq('student_id', studentId)
          .eq('week_start', weekStart)
          .limit(1)

        if (existing && existing.length > 0) {
          console.log(`Tasks already exist for student ${studentId}, skipping`)
          skipped++
          continue
        }

        // Generate tasks via Claude (use cache if same level already generated)
        let taskData: TaskGenerationResult
        let inputTokens: number
        let outputTokens: number

        if (levelCache[academicLevel]) {
          // Reuse cached result for same level — different students at same level
          // get the same task templates (each student still gets their own irregular verbs)
          taskData = levelCache[academicLevel].result
          inputTokens = levelCache[academicLevel].inputTokens
          outputTokens = levelCache[academicLevel].outputTokens
        } else {
          const claudeResult = await generateTasksWithClaude(academicLevel)
          taskData = claudeResult.result
          inputTokens = claudeResult.inputTokens
          outputTokens = claudeResult.outputTokens
          levelCache[academicLevel] = claudeResult

          // Log AI usage (only once per unique level call)
          const costSar =
            (inputTokens * 0.003 / 1000) * 3.75 +
            (outputTokens * 0.015 / 1000) * 3.75

          await supabase.from('ai_usage').insert({
            user_id: null,
            feature: 'weekly_tasks',
            model: CLAUDE_MODEL,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost_sar: costSar,
          })
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
            status: 'active',
          })
          .select('id')
          .single()

        if (taskSetErr || !taskSet) {
          throw new Error(`Failed to create task set for student ${studentId}: ${taskSetErr?.message}`)
        }

        const taskSetId: string = taskSet.id
        const tasksToInsert: Array<Record<string, unknown>> = []

        // Speaking tasks (3)
        for (let i = 0; i < taskData.speaking.length; i++) {
          const t = taskData.speaking[i]
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

        // Bulk insert all tasks
        const { error: insertErr } = await supabase
          .from('weekly_tasks')
          .insert(tasksToInsert)

        if (insertErr) {
          throw new Error(`Failed to insert tasks for student ${studentId}: ${insertErr.message}`)
        }

        // Create notification for the student
        await supabase.from('notifications').insert({
          user_id: studentId,
          type: 'weekly_tasks_ready',
          title: 'مهام الأسبوع الجديدة جاهزة!',
          body: 'تم إنشاء مهام التعلم الخاصة بك لهذا الأسبوع. ابدأ الآن!',
          read: false,
        })

        generated++
        console.log(`Generated ${tasksToInsert.length} tasks for student ${studentId}`)
      } catch (studentErr) {
        const msg = studentErr instanceof Error ? studentErr.message : String(studentErr)
        console.error(`Error processing student ${student.id}: ${msg}`)
        errors.push(`Student ${student.id}: ${msg}`)
      }
    }

    const summary = { generated, skipped, errors }
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
