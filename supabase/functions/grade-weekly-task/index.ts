// Fluentia LMS — AI Grade Weekly Task Edge Function
// Grades weekly task submissions: speaking, reading, writing, listening, irregular_verbs
// Deploy: supabase functions deploy grade-weekly-task --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ──

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function getMasteryLevel(timesCorrect: number): string {
  if (timesCorrect >= 5) return 'mastered'
  if (timesCorrect >= 3) return 'familiar'
  if (timesCorrect >= 1) return 'learning'
  return 'new'
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<{
  parsed: any
  inputTokens: number
  outputTokens: number
}> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error('[grade-weekly-task] Claude API error:', res.status, errBody)
    throw new Error(`Claude API error ${res.status}`)
  }

  const data = await res.json()
  let text = data.content?.[0]?.text || '{}'
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { raw_response: text }
  }

  return {
    parsed,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  }
}

const SYSTEM_BASE = `You are an English teacher at Fluentia Academy, grading assignments for Arabic-speaking adult students learning English. Be encouraging but honest. Respond ONLY with valid JSON — no markdown, no code blocks, no backticks.`

// ── Task Graders ──

async function gradeSpeaking(task: any): Promise<{ feedback: any; inputTokens: number; outputTokens: number }> {
  const transcript = task.response_voice_transcript || ''
  if (!transcript) {
    return {
      feedback: { overall_score: 0, error: 'No transcript available for grading' },
      inputTokens: 0,
      outputTokens: 0,
    }
  }

  const content = task.content || {}
  const topic = content.topic || content.title || task.title || ''
  const guidingQuestions = (content.guiding_questions || content.questions || [])
    .map((q: any) => typeof q === 'string' ? q : q.question || q.text || '')
    .filter(Boolean)
    .join('\n- ')

  const systemPrompt = `${SYSTEM_BASE}

You are grading a SPEAKING task. The student was asked to speak about a topic and their speech has been transcribed.

Return JSON with these exact fields:
- overall_score: number 0-100
- fluency_score: number 0-100
- grammar_score: number 0-100
- vocabulary_score: number 0-100
- pronunciation_notes: string (observations based on transcript patterns, in Arabic)
- suggestions: array of strings (2-4 improvement tips in Arabic)
- corrected_text: string (the transcript with grammar/vocabulary corrections applied)`

  const userMsg = `Topic: ${topic}
${guidingQuestions ? `Guiding questions:\n- ${guidingQuestions}` : ''}

Student's spoken response (transcribed):
"${transcript}"`

  const { parsed, inputTokens, outputTokens } = await callClaude(systemPrompt, userMsg)

  // Ensure required fields with defaults
  const feedback = {
    overall_score: parsed.overall_score ?? 50,
    fluency_score: parsed.fluency_score ?? 50,
    grammar_score: parsed.grammar_score ?? 50,
    vocabulary_score: parsed.vocabulary_score ?? 50,
    pronunciation_notes: parsed.pronunciation_notes ?? '',
    suggestions: parsed.suggestions ?? [],
    corrected_text: parsed.corrected_text ?? transcript,
  }

  return { feedback, inputTokens, outputTokens }
}

async function gradeReadingOrListening(task: any): Promise<{ feedback: any; inputTokens: number; outputTokens: number }> {
  const content = task.content || {}
  const questions = content.questions || []
  const studentAnswers = task.response_answers || []

  const questionResults: any[] = []
  let autoCorrect = 0
  let autoTotal = 0
  const openEndedQuestions: { index: number; question: any; studentAnswer: string }[] = []

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const studentEntry = studentAnswers[i] || studentAnswers.find((a: any) => a.question_index === i)
    const studentAnswer = studentEntry?.answer ?? studentEntry?.selected ?? studentEntry ?? ''

    if (q.type === 'mcq' || q.type === 'multiple_choice' || q.correct_answer !== undefined && q.options) {
      // Auto-grade MCQ
      autoTotal++
      const correctAnswer = q.correct_answer
      const isCorrect = String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()
      if (isCorrect) autoCorrect++

      questionResults.push({
        question_index: i,
        is_correct: isCorrect,
        feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswer}`,
      })
    } else {
      // Open-ended question — queue for Claude grading
      openEndedQuestions.push({
        index: i,
        question: q,
        studentAnswer: String(studentAnswer),
      })
    }
  }

  // Grade open-ended questions with Claude if any
  let totalInputTokens = 0
  let totalOutputTokens = 0

  if (openEndedQuestions.length > 0 && CLAUDE_API_KEY) {
    const questionsText = openEndedQuestions.map((oq) => {
      const qText = oq.question.question || oq.question.text || oq.question.prompt || ''
      return `Question ${oq.index + 1}: ${qText}\nStudent's answer: "${oq.studentAnswer}"`
    }).join('\n\n')

    const passage = content.passage || content.text || content.transcript || ''

    const systemPrompt = `${SYSTEM_BASE}

You are grading open-ended questions from a ${task.type} task. Grade each answer based on comprehension, accuracy, and language quality.

Return JSON with:
- question_results: array of { question_index: number, score: number (0-100), is_correct: boolean, feedback: string (in Arabic) }`

    const userMsg = `${passage ? `Passage/Content:\n"${passage}"\n\n` : ''}${questionsText}`

    const { parsed, inputTokens, outputTokens } = await callClaude(systemPrompt, userMsg)
    totalInputTokens = inputTokens
    totalOutputTokens = outputTokens

    const aiResults = parsed.question_results || []
    for (const oq of openEndedQuestions) {
      const aiResult = aiResults.find((r: any) => r.question_index === oq.index) || {}
      const score = aiResult.score ?? 50
      const isCorrect = score >= 60

      if (isCorrect) autoCorrect++
      autoTotal++

      questionResults.push({
        question_index: oq.index,
        is_correct: isCorrect,
        score,
        feedback: aiResult.feedback || '',
      })
    }
  } else if (openEndedQuestions.length > 0) {
    // No API key — mark open-ended as pending
    for (const oq of openEndedQuestions) {
      autoTotal++
      questionResults.push({
        question_index: oq.index,
        is_correct: null,
        feedback: 'Pending manual review — AI grading unavailable',
      })
    }
  }

  // Sort results by question index
  questionResults.sort((a, b) => a.question_index - b.question_index)

  const autoScore = autoTotal > 0 ? Math.round((autoCorrect / autoTotal) * 100) : 0

  return {
    feedback: {
      auto_score: autoScore,
      question_results: questionResults,
      total_questions: questions.length,
      correct_count: autoCorrect,
    },
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  }
}

async function gradeWriting(task: any): Promise<{ feedback: any; inputTokens: number; outputTokens: number }> {
  const studentText = task.response_text || ''
  if (!studentText.trim()) {
    return {
      feedback: { overall_score: 0, error: 'No written response found' },
      inputTokens: 0,
      outputTokens: 0,
    }
  }

  const content = task.content || {}
  const prompt = content.prompt || content.topic || content.instructions || task.instructions || ''

  const systemPrompt = `${SYSTEM_BASE}

You are grading a WRITING task. The student was given a writing prompt and submitted their text.

Return JSON with these exact fields:
- overall_score: number 0-100
- grammar_score: number 0-100
- vocabulary_score: number 0-100
- structure_score: number 0-100
- suggestions: array of strings (2-4 improvement tips in Arabic)
- corrected_text: string (the student's text with corrections applied)`

  const userMsg = `Writing prompt: ${prompt}

Student's written response:
"${studentText}"`

  const { parsed, inputTokens, outputTokens } = await callClaude(systemPrompt, userMsg)

  const feedback = {
    overall_score: parsed.overall_score ?? 50,
    grammar_score: parsed.grammar_score ?? 50,
    vocabulary_score: parsed.vocabulary_score ?? 50,
    structure_score: parsed.structure_score ?? 50,
    suggestions: parsed.suggestions ?? [],
    corrected_text: parsed.corrected_text ?? studentText,
  }

  return { feedback, inputTokens, outputTokens }
}

function gradeIrregularVerbs(task: any): {
  feedback: any
  verbResults: { verb_base: string; student_answer: any; correct_answer: any; is_correct: boolean }[]
} {
  const content = task.content || {}
  const verbs = content.verbs || []
  const studentAnswers = task.response_answers || []

  const results: any[] = []
  let correct = 0

  for (let i = 0; i < verbs.length; i++) {
    const verb = verbs[i]
    const studentEntry = studentAnswers[i] || studentAnswers.find((a: any) => a.verb_index === i || a.base_form === verb.base_form) || {}

    // What the student needs to provide: past_simple and past_participle
    const studentPast = String(studentEntry.past_simple || studentEntry.past || '').trim().toLowerCase()
    const studentParticiple = String(studentEntry.past_participle || studentEntry.participle || '').trim().toLowerCase()

    const correctPast = String(verb.past_simple || '').trim().toLowerCase()
    const correctParticiple = String(verb.past_participle || '').trim().toLowerCase()

    // Handle alternatives separated by /
    const pastCorrect = correctPast.split('/').map((s: string) => s.trim()).includes(studentPast)
    const participleCorrect = correctParticiple.split('/').map((s: string) => s.trim()).includes(studentParticiple)

    const isCorrect = pastCorrect && participleCorrect

    if (isCorrect) correct++

    results.push({
      verb: verb.base_form,
      meaning_ar: verb.meaning_ar || '',
      student_answer: {
        past_simple: studentEntry.past_simple || studentEntry.past || '',
        past_participle: studentEntry.past_participle || studentEntry.participle || '',
      },
      correct_answer: {
        past_simple: verb.past_simple,
        past_participle: verb.past_participle,
      },
      is_correct: isCorrect,
      past_correct: pastCorrect,
      participle_correct: participleCorrect,
    })
  }

  const autoScore = verbs.length > 0 ? Math.round((correct / verbs.length) * 100) : 0

  return {
    feedback: {
      auto_score: autoScore,
      results,
      total_verbs: verbs.length,
      correct_count: correct,
    },
    verbResults: results.map((r) => ({
      verb_base: r.verb,
      student_answer: r.student_answer,
      correct_answer: r.correct_answer,
      is_correct: r.is_correct,
    })),
  }
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // ── Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // Verify role: student, trainer, or admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['student', 'trainer', 'admin'].includes(userProfile.role)) {
      return jsonResponse({ error: 'Unauthorized role' }, 403)
    }

    // ── Parse body ──
    let body;
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }
    const { task_id } = body

    if (!task_id || typeof task_id !== 'string') {
      return jsonResponse({ error: 'Missing or invalid task_id' }, 400)
    }

    // ── Fetch task ──
    const { data: task, error: taskErr } = await supabase
      .from('weekly_tasks')
      .select('*')
      .eq('id', task_id)
      .single()

    if (taskErr || !task) {
      return jsonResponse({ error: `Task not found: ${taskErr?.message || 'null'}` }, 404)
    }

    // Students can only grade their own tasks
    if (userProfile.role === 'student' && task.student_id !== user.id) {
      return jsonResponse({ error: 'You can only grade your own tasks' }, 403)
    }

    // Task must be submitted
    if (task.status !== 'submitted') {
      return jsonResponse({ error: `Task is not submitted (status: ${task.status})` }, 400)
    }

    // ── Grade based on type ──
    let feedback: any
    let totalInputTokens = 0
    let totalOutputTokens = 0

    switch (task.type) {
      case 'speaking': {
        const result = await gradeSpeaking(task)
        feedback = result.feedback
        totalInputTokens = result.inputTokens
        totalOutputTokens = result.outputTokens
        break
      }

      case 'reading': {
        const result = await gradeReadingOrListening(task)
        feedback = result.feedback
        totalInputTokens = result.inputTokens
        totalOutputTokens = result.outputTokens
        break
      }

      case 'writing': {
        if (!CLAUDE_API_KEY) {
          return jsonResponse({ error: 'AI service not configured for writing grading' }, 503)
        }
        const result = await gradeWriting(task)
        feedback = result.feedback
        totalInputTokens = result.inputTokens
        totalOutputTokens = result.outputTokens
        break
      }

      case 'listening': {
        const result = await gradeReadingOrListening(task)
        feedback = result.feedback
        totalInputTokens = result.inputTokens
        totalOutputTokens = result.outputTokens
        break
      }

      case 'irregular_verbs': {
        const { feedback: verbFeedback, verbResults } = gradeIrregularVerbs(task)
        feedback = verbFeedback

        // Update student_verb_progress for each verb
        const content = task.content || {}
        const verbs = content.verbs || []

        for (const result of verbResults) {
          // Find the verb_id from content or look it up
          const verbData = verbs.find((v: any) => v.base_form === result.verb_base)
          const verbId = verbData?.verb_id || verbData?.id

          if (!verbId) continue

          // Check if progress record exists
          const { data: existing } = await supabase
            .from('student_verb_progress')
            .select('id, times_tested, times_correct')
            .eq('student_id', task.student_id)
            .eq('verb_id', verbId)
            .single()

          if (existing) {
            const newTimesTested = (existing.times_tested || 0) + 1
            const newTimesCorrect = (existing.times_correct || 0) + (result.is_correct ? 1 : 0)
            const mastery = getMasteryLevel(newTimesCorrect)

            await supabase
              .from('student_verb_progress')
              .update({
                times_tested: newTimesTested,
                times_correct: newTimesCorrect,
                mastery,
                last_tested_at: new Date().toISOString(),
              })
              .eq('id', existing.id)
          } else {
            const timesCorrect = result.is_correct ? 1 : 0
            const mastery = getMasteryLevel(timesCorrect)

            await supabase
              .from('student_verb_progress')
              .insert({
                student_id: task.student_id,
                verb_id: verbId,
                times_tested: 1,
                times_correct: timesCorrect,
                mastery,
                last_tested_at: new Date().toISOString(),
              })
          }
        }
        break
      }

      case 'vocabulary': {
        // Auto-grade vocabulary quiz (similar to irregular verbs — no AI needed)
        const vocabContent = task.content || {}
        const vocabWords = vocabContent.words || []
        const vocabAnswers = task.response_answers || []

        let vocabCorrect = 0
        const vocabResults: any[] = []

        for (let i = 0; i < vocabWords.length; i++) {
          const word = vocabWords[i]
          const studentEntry = vocabAnswers[i] || vocabAnswers.find((a: any) => a.word_index === i) || {}
          const userAnswer = String(studentEntry.user_answer || studentEntry.answer || '').trim().toLowerCase()
          const correctWord = String(word.word || '').trim().toLowerCase()
          const isCorrect = userAnswer === correctWord

          if (isCorrect) vocabCorrect++

          vocabResults.push({
            word: word.word,
            translation_ar: word.translation_ar,
            user_answer: studentEntry.user_answer || studentEntry.answer || '',
            is_correct: isCorrect,
          })
        }

        const vocabScore = vocabWords.length > 0 ? Math.round((vocabCorrect / vocabWords.length) * 100) : 0

        feedback = {
          auto_score: vocabScore,
          results: vocabResults,
          total_words: vocabWords.length,
          correct_count: vocabCorrect,
        }
        break
      }

      default:
        return jsonResponse({ error: `Unknown task type: ${task.type}` }, 400)
    }

    // ── Determine auto_score ──
    const autoScore = feedback.auto_score ?? feedback.overall_score ?? 0

    // ── Update the task with grading results ──
    const now = new Date().toISOString()
    const taskUpdate: any = {
      ai_feedback: feedback,
      auto_score: autoScore,
      status: 'graded',
    }

    // Only set ai_feedback_generated_at if AI was used
    if (totalInputTokens > 0 || totalOutputTokens > 0) {
      taskUpdate.ai_feedback_generated_at = now
    } else if (task.type === 'irregular_verbs') {
      // Auto-graded without AI, still mark feedback time
      taskUpdate.ai_feedback_generated_at = now
    }

    const { error: updateErr } = await supabase
      .from('weekly_tasks')
      .update(taskUpdate)
      .eq('id', task_id)

    if (updateErr) {
      console.error('[grade-weekly-task] Task update error:', updateErr.message)
      throw new Error(`Failed to update task: ${updateErr.message}`)
    }

    // ── Update weekly_task_sets ──
    const { data: taskSet } = await supabase
      .from('weekly_task_sets')
      .select('id, total_tasks, completed_tasks')
      .eq('id', task.task_set_id)
      .single()

    if (taskSet) {
      // Count graded tasks in this set
      const { count: gradedCount } = await supabase
        .from('weekly_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('task_set_id', task.task_set_id)
        .eq('status', 'graded')

      const newCompleted = gradedCount || 0
      const totalTasks = taskSet.total_tasks || 8
      const completionPct = Math.round((newCompleted / totalTasks) * 100)

      const setUpdate: any = {
        completed_tasks: newCompleted,
        completion_percentage: completionPct,
      }

      if (newCompleted >= totalTasks) {
        setUpdate.status = 'completed'
      }

      await supabase
        .from('weekly_task_sets')
        .update(setUpdate)
        .eq('id', taskSet.id)

      // ── Award XP ──
      const isOnTime = task.deadline ? new Date(task.deadline) >= new Date(task.submitted_at || now) : true
      const xpAmount = isOnTime ? 10 : 5 // 10 XP on time, 5 XP late

      // Insert XP transaction for task completion
      const { error: xpErr } = await supabase.from('xp_transactions').insert({
        student_id: task.student_id,
        amount: xpAmount,
        reason: isOnTime ? 'assignment_on_time' : 'assignment_late',
        description: `Weekly task completed: ${task.title} (${task.type})`,
        related_id: task.id,
      })
      if (xpErr) console.error('[grade-weekly-task] XP insert error:', xpErr.message)

      // Update task xp_awarded
      await supabase
        .from('weekly_tasks')
        .update({ xp_awarded: xpAmount })
        .eq('id', task_id)

      let totalXpAwarded = xpAmount

      // Bonus: 25 XP if all 8 tasks completed
      if (newCompleted >= totalTasks) {
        const { error: bonusErr } = await supabase.from('xp_transactions').insert({
          student_id: task.student_id,
          amount: 25,
          reason: 'streak_bonus',
          description: `All ${totalTasks} weekly tasks completed! Bonus XP awarded.`,
          related_id: taskSet.id,
        })
        if (bonusErr) console.error('[grade-weekly-task] Bonus XP error:', bonusErr.message)
        totalXpAwarded += 25
      }

      // Update student's xp_total
      const { data: student } = await supabase
        .from('students')
        .select('xp_total')
        .eq('id', task.student_id)
        .single()

      if (student) {
        await supabase
          .from('students')
          .update({ xp_total: (student.xp_total || 0) + totalXpAwarded })
          .eq('id', task.student_id)
      }
    }

    // ── Post to activity feed ──
    try {
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', task.student_id)
        .single()

      const studentName = studentProfile?.display_name || studentProfile?.full_name || 'طالب'
      const typeLabels: Record<string, string> = {
        speaking: 'تحدث',
        reading: 'قراءة',
        writing: 'كتابة',
        listening: 'استماع',
        irregular_verbs: 'أفعال شاذة',
        vocabulary: 'مفردات',
      }
      const typeLabel = typeLabels[task.type] || task.type
      const wasOnTime = task.deadline ? new Date(task.deadline) >= new Date(task.submitted_at || now) : true

      await supabase.from('activity_feed').insert({
        user_id: task.student_id,
        type: 'task_completed',
        title: `أكمل مهمة ${typeLabel}`,
        description: `${studentName} أكمل مهمة "${task.title}" وحصل على ${autoScore}%`,
        metadata: {
          task_id: task.id,
          task_type: task.type,
          score: autoScore,
          xp_earned: wasOnTime ? 10 : 5,
        },
      })
    } catch (feedErr) {
      console.error('[grade-weekly-task] Activity feed error:', feedErr)
      // Non-critical — don't fail the grading
    }

    // ── Log AI usage ──
    if (totalInputTokens > 0 || totalOutputTokens > 0) {
      const costSAR = ((totalInputTokens * 3 + totalOutputTokens * 15) / 1_000_000) * 3.75
      const usageType = task.type === 'speaking' ? 'speaking_analysis' : 'writing_feedback'

      const { error: usageErr } = await supabase.from('ai_usage').insert({
        type: usageType,
        student_id: task.student_id,
        model: 'claude-sonnet',
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        estimated_cost_sar: costSAR.toFixed(4),
      })
      if (usageErr) console.error('[grade-weekly-task] AI usage log error:', usageErr.message)
    }

    return jsonResponse({
      success: true,
      task_id,
      type: task.type,
      auto_score: autoScore,
      feedback,
    })
  } catch (error: any) {
    console.error('[grade-weekly-task] Error:', error.message)
    return jsonResponse({ error: error.message }, 500)
  }
})
