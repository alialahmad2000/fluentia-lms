// Fluentia LMS — AI Writing Feedback Edge Function (Claude API)
// Analyzes student writing and returns structured feedback
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    let body: any
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    // Support both old and new param names
    const writingText = body.writing_text || body.text || ''
    const writingPrompt = body.writing_prompt || ''
    const assignmentType = body.assignment_type || ''
    const studentLevel = body.student_level || null
    const studentName = body.student_name || ''

    if (!writingText || writingText.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'النص قصير جداً للتحليل' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    // Role check
    const { data: userProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const isStaff = userProfile?.role === 'trainer' || userProfile?.role === 'admin'

    // Rate limiting for students
    let student: any = null
    if (!isStaff) {
      const { data: studentData } = await supabase
        .from('students').select('id, package, academic_level').eq('id', user.id).single()
      student = studentData
      if (!student) throw new Error('Student not found')

      const monthStart = new Date()
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id).eq('type', 'writing_feedback')
        .gte('created_at', monthStart.toISOString())

      const limit = WRITING_LIMITS[student.package] || 2
      if ((count || 0) >= limit) {
        return new Response(JSON.stringify({
          error: `وصلت للحد الشهري (${limit} تحليل). الباقة الأعلى تعطيك أكثر!`,
          limit_reached: true,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 })
      }
    }

    // Budget cap
    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

    const { data: settings } = await supabase
      .from('system_settings').select('value').eq('key', 'ai_monthly_budget').single()
    const budgetCap = parseFloat(settings?.value || '50')

    const { data: totalCostData } = await supabase
      .from('ai_usage').select('estimated_cost_sar').gte('created_at', monthStart.toISOString())
    const totalCost = (totalCostData || []).reduce((sum: number, r: any) => sum + (parseFloat(r.estimated_cost_sar) || 0), 0)

    if (totalCost >= budgetCap) {
      return new Response(JSON.stringify({
        error: 'تم الوصول للحد الشهري لخدمات الذكاء الاصطناعي', budget_reached: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 })
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured', skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503,
      })
    }

    const level = studentLevel || student?.academic_level || 3
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
- improvement_tip: ONE specific next step they can practice immediately`

    const userContent = writingPrompt
      ? `Prompt: ${writingPrompt}\n\nWriting:\n${writingText}`
      : assignmentType
        ? `Assignment type: ${assignmentType}\n\nWriting:\n${writingText}`
        : `Writing:\n${writingText}`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!claudeRes.ok) {
      console.error('[ai-writing-feedback] Claude API error:', await claudeRes.text())
      return new Response(JSON.stringify({
        error: 'التقييم التلقائي غير متاح حالياً — سيراجع المدرب عملك مباشرة',
        ai_unavailable: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    let feedback: any
    try {
      feedback = JSON.parse(rawText.replace(/```json\n?|```\n?/g, '').trim())
    } catch {
      console.error('[ai-writing-feedback] Parse failed:', rawText.slice(0, 300))
      // Fallback: try to extract what we can
      feedback = { overall_comment_ar: rawText.slice(0, 500), fluency_score: 5, overall_score: 5 }
    }

    // Normalize: ensure backward compat fields exist
    if (!feedback.fluency_score && feedback.overall_score) feedback.fluency_score = feedback.overall_score
    if (!feedback.overall_score && feedback.fluency_score) feedback.overall_score = feedback.fluency_score
    // Map old format fields for backward compat
    if (!feedback.grammar_errors && feedback.errors) {
      feedback.grammar_errors = feedback.errors.map((e: any) => ({
        error: e.original, correction: e.correction, rule: e.explanation_en || e.explanation_ar,
      }))
    }
    if (!feedback.overall_feedback && feedback.overall_comment_ar) {
      feedback.overall_feedback = feedback.overall_comment_ar
    }
    if (!feedback.improvement_tips && feedback.improvements_ar) {
      feedback.improvement_tips = feedback.improvements_ar
    }
    if (!feedback.strengths && feedback.strengths_ar) {
      feedback.strengths = feedback.strengths_ar
    }

    // Cost
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75

    // Log usage
    const usageRecord: any = {
      type: 'writing_feedback',
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    }
    if (isStaff) {
      const { data: trainerRecord } = await supabase
        .from('trainers').select('id').eq('id', user.id).single()
      usageRecord.trainer_id = trainerRecord ? user.id : null
    } else {
      usageRecord.student_id = user.id
    }
    const { error: usageErr } = await supabase.from('ai_usage').insert(usageRecord)
    if (usageErr) console.error('[ai-writing-feedback] Usage insert error:', usageErr.message)

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[ai-writing-feedback] Error:', error.message)
    return new Response(JSON.stringify({ error: 'حدث خطأ', fallback: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  }
})
