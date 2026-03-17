// Fluentia LMS — AI Speaking Analysis Edge Function
// Analyzes student speaking task transcripts and provides detailed feedback
// Deploy: supabase functions deploy analyze-speaking --no-verify-jwt
// Env: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Helpers ──

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

const LEVEL_CONTEXT: Record<number, string> = {
  1: 'A1 beginner — very simple sentences, basic vocabulary. Be extra encouraging.',
  2: 'A2 elementary — short responses, everyday topics. Celebrate small wins.',
  3: 'B1 intermediate — connected speech, familiar topics. Push for more complexity.',
  4: 'B2 upper-intermediate — detailed responses, variety of topics. Expect more accuracy.',
  5: 'C1 advanced — complex speech, nuanced expression. Hold to high standards.',
}

const SPEAKING_SYSTEM_PROMPT = `You are an experienced, warm English speaking coach at Fluentia Academy. Your students are Arabic-speaking adults learning English. You understand common Arabic interference patterns in English pronunciation and grammar (e.g., "p/b" confusion, missing articles, subject-verb agreement, th-sounds, vowel reduction).

Your role is to analyze a student's spoken English (transcribed by Whisper) and provide detailed, constructive, and culturally appropriate feedback. Be encouraging — many Arab adult learners feel shy about speaking English. Celebrate what they did well before pointing out errors.

IMPORTANT RULES:
- All Arabic text must be in Modern Standard Arabic or simple colloquial Arabic that any Arab adult would understand
- Grammar error explanations MUST be in Arabic
- Overall feedback and improvement tips MUST be in Arabic
- Be warm, respectful, and use a teacher-to-adult-student tone (not childish)
- Consider that Whisper transcription may introduce minor artifacts — don't penalize obvious transcription errors

Respond ONLY with valid JSON (no markdown, no code blocks, no backticks) using this exact structure:
{
  "fluency_score": <number 1-10>,
  "grammar_accuracy": <number 0-100>,
  "vocabulary_richness": "<basic|intermediate|advanced>",
  "topic_relevance": <number 0-100>,
  "grammar_errors": [
    {
      "error": "<the incorrect phrase>",
      "correction": "<the correct form>",
      "explanation_ar": "<explanation in Arabic>"
    }
  ],
  "vocabulary_suggestions": [
    {
      "original": "<word/phrase used>",
      "better": "<stronger alternative>",
      "context": "<brief English usage note>"
    }
  ],
  "pronunciation_notes": [
    {
      "pattern": "<detected pattern from transcript>",
      "tip_ar": "<Arabic tip for improvement>"
    }
  ],
  "overall_feedback_ar": "<2-4 sentences of encouraging feedback in Arabic>",
  "improvement_tips_ar": ["<tip 1 in Arabic>", "<tip 2>", "<tip 3>"],
  "strengths": ["<strength 1 in Arabic>", "<strength 2 in Arabic>"]
}`

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
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error('[analyze-speaking] Claude API error:', res.status, errBody)
    throw new Error(`Claude API error ${res.status}`)
  }

  const data = await res.json()
  let text = data.content?.[0]?.text || '{}'
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    console.error('[analyze-speaking] Failed to parse Claude response:', text.substring(0, 200))
    parsed = { raw_response: text }
  }

  return {
    parsed,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
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

    // Verify role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['student', 'trainer', 'admin'].includes(userProfile.role)) {
      return jsonResponse({ error: 'Unauthorized role' }, 403)
    }

    // ── Parse body ──
    let body
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const { transcript, task_id, topic, guiding_questions, level, duration_seconds } = body

    // ── Validate inputs ──
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 5) {
      return jsonResponse({ error: 'النص المكتوب قصير جداً للتحليل. يرجى التحدث لمدة أطول.' }, 400)
    }

    if (!task_id || typeof task_id !== 'string') {
      return jsonResponse({ error: 'Missing or invalid task_id' }, 400)
    }

    // ── Verify task exists and belongs to user ──
    const { data: task, error: taskErr } = await supabase
      .from('weekly_tasks')
      .select('id, student_id, status, title, type, task_set_id, deadline, submitted_at')
      .eq('id', task_id)
      .single()

    if (taskErr || !task) {
      return jsonResponse({ error: `Task not found: ${taskErr?.message || 'null'}` }, 404)
    }

    // Students can only analyze their own tasks
    if (userProfile.role === 'student' && task.student_id !== user.id) {
      return jsonResponse({ error: 'You can only analyze your own tasks' }, 403)
    }

    // ── Check AI service availability ──
    if (!CLAUDE_API_KEY) {
      return jsonResponse({
        error: 'التقييم التلقائي غير متاح حالياً — سيراجع المدرب عملك مباشرة',
        ai_unavailable: true,
      }, 503)
    }

    // ── Check budget cap ──
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_monthly_budget')
      .single()

    const budgetCap = parseFloat(settings?.value || '50')

    const { data: totalCostData } = await supabase
      .from('ai_usage')
      .select('estimated_cost_sar')
      .gte('created_at', monthStart.toISOString())

    const totalCost = (totalCostData || []).reduce(
      (sum: number, r: any) => sum + (parseFloat(r.estimated_cost_sar) || 0), 0
    )

    if (totalCost >= budgetCap) {
      return jsonResponse({
        error: 'تم الوصول للحد الشهري لخدمات الذكاء الاصطناعي',
        budget_reached: true,
      }, 429)
    }

    // ── Build context for Claude ──
    const studentLevel = level || 1
    const levelCtx = LEVEL_CONTEXT[studentLevel] || LEVEL_CONTEXT[1]

    const questionsText = Array.isArray(guiding_questions) && guiding_questions.length > 0
      ? `\nGuiding questions the student should address:\n${guiding_questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`
      : ''

    const durationCtx = duration_seconds
      ? `\nSpeaking duration: ${duration_seconds} seconds`
      : ''

    const userMessage = `Student level: ${levelCtx}

Topic: ${topic || 'General speaking practice'}${questionsText}${durationCtx}

Student's spoken response (Whisper transcription):
"${transcript}"`

    // ── Call Claude ──
    const { parsed: analysis, inputTokens, outputTokens } = await callClaude(
      SPEAKING_SYSTEM_PROMPT,
      userMessage
    )

    // ── Normalize and validate analysis fields ──
    const normalizedAnalysis = {
      fluency_score: Math.min(10, Math.max(1, analysis.fluency_score ?? 5)),
      grammar_accuracy: Math.min(100, Math.max(0, analysis.grammar_accuracy ?? 50)),
      vocabulary_richness: ['basic', 'intermediate', 'advanced'].includes(analysis.vocabulary_richness)
        ? analysis.vocabulary_richness
        : 'basic',
      topic_relevance: Math.min(100, Math.max(0, analysis.topic_relevance ?? 50)),
      grammar_errors: Array.isArray(analysis.grammar_errors) ? analysis.grammar_errors.slice(0, 10) : [],
      vocabulary_suggestions: Array.isArray(analysis.vocabulary_suggestions) ? analysis.vocabulary_suggestions.slice(0, 5) : [],
      pronunciation_notes: Array.isArray(analysis.pronunciation_notes) ? analysis.pronunciation_notes.slice(0, 5) : [],
      overall_feedback_ar: analysis.overall_feedback_ar || 'أحسنت! استمر في التدريب على المحادثة.',
      improvement_tips_ar: Array.isArray(analysis.improvement_tips_ar) ? analysis.improvement_tips_ar.slice(0, 5) : [],
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 5) : [],
    }

    // ── Calculate auto_score (fluency_score * 10, out of 100) ──
    const autoScore = normalizedAnalysis.fluency_score * 10

    // ── Calculate XP (5-15 based on quality) ──
    let xpEarned: number
    if (autoScore >= 80) {
      xpEarned = 15
    } else if (autoScore >= 60) {
      xpEarned = 10
    } else if (autoScore >= 40) {
      xpEarned = 8
    } else {
      xpEarned = 5
    }

    // ── Update the task record ──
    const now = new Date().toISOString()
    const taskUpdate: any = {
      ai_feedback: normalizedAnalysis,
      auto_score: autoScore,
      ai_feedback_generated_at: now,
    }

    // Only update status to 'graded' if it's currently 'submitted'
    if (task.status === 'submitted') {
      taskUpdate.status = 'graded'
    }

    const { error: updateErr } = await supabase
      .from('weekly_tasks')
      .update(taskUpdate)
      .eq('id', task_id)

    if (updateErr) {
      console.error('[analyze-speaking] Task update error:', updateErr.message)
      throw new Error(`Failed to update task: ${updateErr.message}`)
    }

    // ── Award XP ──
    const { error: xpErr } = await supabase.from('xp_transactions').insert({
      student_id: task.student_id,
      amount: xpEarned,
      reason: 'custom',
      description: `تحليل مهمة التحدث: ${task.title || topic || 'speaking task'}`,
      related_id: task.id,
    })
    if (xpErr) console.error('[analyze-speaking] XP insert error:', xpErr.message)

    // Update xp_awarded on the task
    await supabase
      .from('weekly_tasks')
      .update({ xp_awarded: xpEarned })
      .eq('id', task_id)

    // Update student's xp_total
    const { data: student } = await supabase
      .from('students')
      .select('xp_total')
      .eq('id', task.student_id)
      .single()

    if (student) {
      await supabase
        .from('students')
        .update({ xp_total: (student.xp_total || 0) + xpEarned })
        .eq('id', task.student_id)
    }

    // ── Log AI usage ──
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75

    const { error: usageErr } = await supabase.from('ai_usage').insert({
      type: 'speaking_analysis',
      student_id: task.student_id,
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    })
    if (usageErr) console.error('[analyze-speaking] AI usage log error:', usageErr.message)

    // ── Post to activity feed ──
    try {
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', task.student_id)
        .single()

      const studentName = studentProfile?.display_name || studentProfile?.full_name || 'طالب'

      await supabase.from('activity_feed').insert({
        student_id: task.student_id,
        type: 'submission',
        title: 'أكمل مهمة تحدث',
        description: `${studentName} أكمل مهمة التحدث "${task.title || topic}" وحصل على ${autoScore}%`,
        data: {
          task_id: task.id,
          task_type: 'speaking',
          score: autoScore,
          xp_earned: xpEarned,
          fluency_score: normalizedAnalysis.fluency_score,
          vocabulary_richness: normalizedAnalysis.vocabulary_richness,
        },
      })
    } catch (feedErr) {
      console.error('[analyze-speaking] Activity feed error:', feedErr)
      // Non-critical — don't fail the analysis
    }

    // ── Return response ──
    return jsonResponse({
      analysis: normalizedAnalysis,
      xp_earned: xpEarned,
      auto_score: autoScore,
    })
  } catch (error: any) {
    console.error('[analyze-speaking] Error:', error.message)
    return jsonResponse({ error: error.message }, 500)
  }
})
