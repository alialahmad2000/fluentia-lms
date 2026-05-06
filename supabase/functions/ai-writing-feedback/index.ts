// Fluentia LMS — AI Writing Feedback Edge Function (Claude API)
// Supports two modes:
//   1. Frontend mode: receives writing_text directly (backward compat)
//   2. Queue mode: receives progress_id, reads writing from DB (used by sweeper)
// Deploy: supabase functions deploy ai-writing-feedback --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const WRITING_LIMITS: Record<string, number> = {
  asas: 2, talaqa: 4, tamayuz: 8, ielts: 8,
}

const LEVEL_CONTEXT: Record<number, string> = {
  0: 'pre-A1 foundation — very basic words and phrases',
  1: 'A1 beginner — very simple sentences, basic vocabulary',
  2: 'A2 elementary — short paragraphs, everyday topics',
  3: 'B1 intermediate — connected paragraphs, familiar topics',
  4: 'B2 upper-intermediate — detailed text, variety of topics',
  5: 'C1 advanced — complex writing, nuanced expression',
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ error: 'Missing authorization' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const isServiceRole = token === serviceRoleKey

    let userId: string | null = null

    if (isServiceRole) {
      // Service role call (from sweeper) — no user auth needed
      userId = null
    } else {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
      if (authErr || !user) return jsonRes({ error: 'Unauthorized' }, 401)
      userId = user.id
    }

    let body: any
    try { body = await req.json() } catch {
      return jsonRes({ error: 'Invalid request body' }, 400)
    }

    // ─── Queue mode: progress_id provided ─────────────────
    const progressId = body.progress_id
    if (progressId) {
      return await handleQueueMode(supabase, progressId)
    }

    // ─── Frontend mode: writing_text provided (backward compat) ───
    const writingText = body.writing_text || body.text || ''
    const writingPrompt = body.writing_prompt || ''
    const assignmentType = body.assignment_type || ''
    const studentLevel = body.student_level || null
    const studentName = body.student_name || ''

    if (!writingText || writingText.trim().length < 10) {
      return jsonRes({ error: 'النص قصير جداً للتحليل' }, 400)
    }

    // Role check
    let isStaff = isServiceRole
    let student: any = null

    if (userId) {
      const { data: userProfile } = await supabase
        .from('profiles').select('role').eq('id', userId).single()
      isStaff = userProfile?.role === 'trainer' || userProfile?.role === 'admin'

      // Rate limiting for students
      if (!isStaff) {
        const { data: studentData } = await supabase
          .from('students').select('id, package, academic_level').eq('id', userId).single()
        student = studentData
        if (!student) throw new Error('Student not found')

        const monthStart = new Date()
        monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

        const { count } = await supabase
          .from('ai_usage')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', userId).eq('type', 'writing_feedback')
          .gte('created_at', monthStart.toISOString())

        const limit = WRITING_LIMITS[student.package] || 2
        if ((count || 0) >= limit) {
          return jsonRes({
            error: `وصلت للحد الشهري (${limit} تحليل). الباقة الأعلى تعطيك أكثر!`,
            limit_reached: true,
          }, 429)
        }
      }
    }

    // Budget cap
    const budgetOk = await checkBudget(supabase)
    if (!budgetOk) {
      return jsonRes({ error: 'تم الوصول للحد الشهري لخدمات الذكاء الاصطناعي', budget_reached: true }, 429)
    }

    const level = studentLevel || student?.academic_level || 3
    const feedback = await callClaude(writingText, writingPrompt, assignmentType, level, studentName)

    // Log usage
    await logUsage(supabase, feedback._tokens, userId, isStaff)

    // If frontend mode called with a known student, also update evaluation_status
    if (userId && body._writing_id) {
      try {
        await supabase
          .from('student_curriculum_progress')
          .update({
            ai_feedback: feedback,
            score: feedback.fluency_score ? feedback.fluency_score * 10 : null,
            evaluation_status: 'completed',
            evaluation_completed_at: new Date().toISOString(),
            evaluation_attempts: 1,
          })
          .eq('student_id', userId)
          .eq('writing_id', body._writing_id)
      } catch {}
    }

    return jsonRes({ feedback, ok: true })

  } catch (error: any) {
    console.error('[ai-writing-feedback] Error:', error.message)
    return jsonRes({ error: 'حدث خطأ', fallback: true })
  }
})

// ─── Queue Mode Handler ─────────────────────────────────
async function handleQueueMode(supabase: any, progressId: string) {
  // Load the row
  const { data: row, error: loadErr } = await supabase
    .from('student_curriculum_progress')
    .select('*, curriculum_writing!inner(prompt_en, task_type)')
    .eq('id', progressId)
    .single()

  if (loadErr || !row) return jsonRes({ ok: false, error: 'Row not found' })

  // Idempotency: already completed
  if (row.evaluation_status === 'completed' && row.ai_feedback) {
    return jsonRes({ ok: true, cached: true, ai_feedback: row.ai_feedback })
  }

  // Already being evaluated by another worker (prevent races)
  if (row.evaluation_status === 'evaluating') {
    const lastAttempt = row.evaluation_last_attempt_at ? new Date(row.evaluation_last_attempt_at).getTime() : 0
    if (Date.now() - lastAttempt < 5 * 60 * 1000) {
      return jsonRes({ ok: false, error: 'Already evaluating', status: 'evaluating' })
    }
    // Stale evaluating state (>5 min) — proceed
  }

  // Max attempts reached
  if ((row.evaluation_attempts || 0) >= 5) {
    return jsonRes({ ok: false, error: 'Max attempts reached', status: 'escalated' })
  }

  const writingText = row.answers?.draft || ''
  if (!writingText || writingText.trim().length < 10) {
    return jsonRes({ ok: false, error: 'No writing text found' })
  }

  // Mark as evaluating
  const newAttempts = (row.evaluation_attempts || 0) + 1
  await supabase
    .from('student_curriculum_progress')
    .update({
      evaluation_status: 'evaluating',
      evaluation_attempts: newAttempts,
      evaluation_last_attempt_at: new Date().toISOString(),
    })
    .eq('id', progressId)

  try {
    // Budget check
    const budgetOk = await checkBudget(supabase)
    if (!budgetOk) throw new Error('Budget cap reached')

    // Get student level
    const { data: studentData } = await supabase
      .from('students').select('academic_level, package').eq('id', row.student_id).single()
    const level = studentData?.academic_level || 3

    const writingPrompt = row.curriculum_writing?.prompt_en || ''
    const assignmentType = row.curriculum_writing?.task_type || ''

    const feedback = await callClaude(writingText, writingPrompt, assignmentType, level, '')

    // Success — save feedback
    await supabase
      .from('student_curriculum_progress')
      .update({
        ai_feedback: feedback,
        score: feedback.fluency_score ? feedback.fluency_score * 10 : null,
        evaluation_status: 'completed',
        evaluation_completed_at: new Date().toISOString(),
        evaluation_last_error: null,
      })
      .eq('id', progressId)

    // Notify student
    await supabase.from('notifications').insert({
      user_id: row.student_id,
      type: 'writing_evaluated',
      title: 'تم تصحيح كتابتك ✨',
      body: 'وصل تصحيح تمرين الكتابة — اضغط للاطلاع على التغذية الراجعة',
      data: { unit_id: row.unit_id, progress_id: progressId },
    })

    // Log usage
    await logUsage(supabase, feedback._tokens, row.student_id, false)

    return jsonRes({ ok: true, ai_feedback: feedback })

  } catch (err: any) {
    const errorMsg = String(err).substring(0, 500)
    const newStatus = newAttempts >= 5 ? 'escalated' : 'failed'

    await supabase
      .from('student_curriculum_progress')
      .update({
        evaluation_status: newStatus,
        evaluation_last_error: errorMsg,
        escalated_to_trainer_at: newStatus === 'escalated' ? new Date().toISOString() : null,
      })
      .eq('id', progressId)

    // Escalate to trainer if max attempts reached
    if (newStatus === 'escalated') {
      await notifyTrainer(supabase, row)
    }

    return jsonRes({ ok: false, error: errorMsg, status: newStatus })
  }
}

// ─── Claude API Call with 55s timeout ─────────────────────
async function callClaude(writingText: string, writingPrompt: string, assignmentType: string, level: number, studentName: string) {
  const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
  if (!CLAUDE_API_KEY) throw new Error('AI service not configured')

  const levelCtx = LEVEL_CONTEXT[level] || LEVEL_CONTEXT[3]

  const systemPrompt = `You are an expert English teacher for Arabic-speaking students at a Saudi Arabian English academy. A student has submitted a writing exercise at ${levelCtx} level.${studentName ? ` Student: ${studentName}.` : ''} Your job is NOT just to score — you must TEACH.

Provide comprehensive educational feedback. Respond ONLY with valid JSON (no markdown, no backticks):

{
  "overall_score": <1-10>,
  "grammar_score": <1-10>,
  "vocabulary_score": <1-10>,
  "structure_score": <1-10>,
  "fluency_score": <1-10>,

  "corrected_text": "The full student text rewritten with all corrections applied. Keep their ideas but fix grammar, vocabulary, and structure.",

  "errors": [
    {
      "type": "grammar|vocabulary|spelling|punctuation",
      "original": "exact error text from student writing",
      "correction": "fixed version",
      "explanation_ar": "شرح القاعدة بالعربي — لماذا هذا خطأ وكيف نصححه",
      "explanation_en": "English explanation of the rule"
    }
  ],

  "vocabulary_upgrades": [
    {
      "basic": "good",
      "advanced": "beneficial / advantageous",
      "example": "AI can be highly beneficial for education."
    }
  ],

  "model_sentences": [
    "Example sentence showing how to express the same idea at a higher level"
  ],

  "strengths_ar": ["نقطة قوة بالعربي — وش سوى الطالب صح"],
  "improvements_ar": ["نصيحة محددة للتطوير بالعربي"],

  "strengths": "ملاحظة إيجابية مفصلة عن أداء الطالب بالعربي — جملتين على الأقل",
  "improvement_tip": "نصيحة واحدة محددة وعملية يقدر الطالب يطبقها فوراً بالعربي",

  "overall_comment_ar": "ملخص التقييم بالعربي — 3-4 جمل تشمل الإيجابيات + نقاط التحسين + التشجيع",
  "overall_comment_en": "Same summary in English"
}

RULES:
- Adapt feedback complexity to student level (simpler explanations for Level 1-2, more detailed for 3-5)
- Grammar rules explained in Arabic (students understand Arabic better)
- Be encouraging but honest — highlight real strengths before weaknesses
- Corrected text should keep the student's original ideas, just fix the English
- errors array: include ALL meaningful errors (up to 10), not just 2-3
- vocabulary_upgrades: 2-5 basic words the student used with better alternatives appropriate for their level
- model_sentences: 2-3 example sentences showing what a perfect answer looks like at THEIR level
- strengths_ar: 2-3 specific things the student did well
- improvements_ar: 2-3 specific actionable suggestions
- strengths: a warm encouraging paragraph in Arabic about what they did well
- improvement_tip: ONE specific next step they can practice immediately

Keep your response concise but complete:
- errors: top 5-7 most important errors only
- vocabulary_upgrades: 2-4 most impactful ones
- model_sentences: 2-3 sentences only
- All Arabic feedback: 2-3 sentences each, not paragraphs`

  const userContent = writingPrompt
    ? `Prompt: ${writingPrompt}\n\nWriting:\n${writingText}`
    : assignmentType
      ? `Assignment type: ${assignmentType}\n\nWriting:\n${writingText}`
      : `Writing:\n${writingText}`

  // 55s timeout (edge function wall clock is 60s)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 55000)

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      throw new Error(`Claude API ${claudeRes.status}: ${errText.substring(0, 200)}`)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    let feedback: any
    const jsonStart = rawText.indexOf('{')
    const jsonEnd = rawText.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      feedback = { overall_comment_ar: rawText.slice(0, 500), fluency_score: 5, overall_score: 5 }
    } else {
      try {
        feedback = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1))
      } catch {
        feedback = { overall_comment_ar: rawText.slice(0, 500), fluency_score: 5, overall_score: 5 }
      }
    }

    // Normalize backward compat fields
    if (!feedback.fluency_score && feedback.overall_score) feedback.fluency_score = feedback.overall_score
    if (!feedback.overall_score && feedback.fluency_score) feedback.overall_score = feedback.fluency_score
    if (!feedback.grammar_errors && feedback.errors) {
      feedback.grammar_errors = feedback.errors.map((e: any) => ({
        error: e.original, correction: e.correction, rule: e.explanation_en || e.explanation_ar,
      }))
    }
    if (!feedback.overall_feedback && feedback.overall_comment_ar) feedback.overall_feedback = feedback.overall_comment_ar
    if (!feedback.improvement_tips && feedback.improvements_ar) feedback.improvement_tips = feedback.improvements_ar
    if (!feedback.strengths && feedback.strengths_ar) feedback.strengths = feedback.strengths_ar

    // Attach token info for logging (stripped before sending to client)
    feedback._tokens = { input: inputTokens, output: outputTokens }

    return feedback
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') throw new Error('Claude API timeout (55s)')
    throw err
  }
}

// ─── Budget check ─────────────────────────────────────────
async function checkBudget(supabase: any): Promise<boolean> {
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  const { data: settings } = await supabase
    .from('system_settings').select('value').eq('key', 'ai_monthly_budget').single()
  const budgetCap = parseFloat(settings?.value || '50')

  const { data: totalCostData } = await supabase
    .from('ai_usage').select('estimated_cost_sar').gte('created_at', monthStart.toISOString())
  const totalCost = (totalCostData || []).reduce((sum: number, r: any) => sum + (parseFloat(r.estimated_cost_sar) || 0), 0)

  return totalCost < budgetCap
}

// ─── Usage logging ────────────────────────────────────────
async function logUsage(supabase: any, tokens: any, userId: string | null, isStaff: boolean) {
  if (!tokens) return
  const costSAR = ((tokens.input * 3 + tokens.output * 15) / 1_000_000) * 3.75
  const record: any = {
    type: 'writing_feedback',
    model: 'claude-sonnet',
    input_tokens: tokens.input,
    output_tokens: tokens.output,
    estimated_cost_sar: costSAR.toFixed(4),
  }
  if (userId) {
    if (isStaff) record.trainer_id = userId
    else record.student_id = userId
  }
  try { await supabase.from('ai_usage').insert(record) } catch {}
}

// ─── Trainer notification on escalation ───────────────────
async function notifyTrainer(supabase: any, row: any) {
  try {
    // Find student's group trainer
    const { data: studentGroup } = await supabase
      .from('students').select('group_id, profiles!inner(full_name)').eq('id', row.student_id).single()

    if (!studentGroup?.group_id) return

    const { data: group } = await supabase
      .from('groups').select('trainer_id').eq('id', studentGroup.group_id).single()

    if (!group?.trainer_id) return

    const studentName = studentGroup.profiles?.full_name || 'طالب'

    // Find unit number
    const { data: unit } = await supabase
      .from('curriculum_units').select('unit_number').eq('id', row.unit_id).single()

    await supabase.from('notifications').insert({
      user_id: group.trainer_id,
      type: 'writing_needs_review',
      title: 'كتابة طالب تحتاج تصحيح يدوي',
      body: `${studentName} في الوحدة ${unit?.unit_number || '?'} — لم نتمكن من التصحيح التلقائي`,
      data: { link: `/trainer/students/${row.student_id}/curriculum?unit=${row.unit_id}&tab=writing` },
      priority: 'high',
    })
  } catch (err) {
    console.error('[ai-writing-feedback] Trainer notification error:', err)
  }
}
