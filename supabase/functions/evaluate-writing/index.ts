// Fluentia LMS — AI Writing Evaluation Edge Function (Claude API)
// Handles both general writing feedback AND IELTS-specific band scoring
// Deploy: supabase functions deploy evaluate-writing
// Env: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Monthly rate limits per package
const WRITING_LIMITS: Record<string, number> = {
  asas: 5,
  talaqa: 10,
  tamayuz: 20,
  ielts: 30,
}

const LEVEL_CONTEXT: Record<number, string> = {
  1: 'A1 beginner — very simple sentences, basic vocabulary',
  2: 'A2 elementary — short paragraphs, everyday topics',
  3: 'B1 intermediate — connected paragraphs, familiar topics',
  4: 'B2 upper-intermediate — detailed text, variety of topics',
  5: 'C1 advanced — complex writing, nuanced expression',
}

// ─── System prompts per task type ────────────────────────────

const SENTENCE_PROMPT = (level: string) => `You are an English language tutor for Arab students at ${level}.
The student typed one or more English sentences. Analyze and respond in JSON with these exact fields:
- corrected_text: string (the full corrected version of their writing)
- grammar_errors: array of {error: string, correction: string, rule_ar: string} (max 5 errors — rule_ar is Arabic explanation)
- vocabulary_level: string ("beginner" | "intermediate" | "advanced")
- vocabulary_suggestions: array of {original: string, better: string, reason_ar: string} (max 3)
- suggested_version: string (a better way to write the same meaning)
- fluency_score: number 1-10
- overall_feedback_ar: string (2-3 sentences in Arabic, encouraging and constructive)
- improvement_tips_ar: array of strings (2-3 tips in Arabic)
- xp_earned: number (5 for attempt, +5 for good grammar, +5 for vocabulary variety, +5 for structure — max 20)
Respond ONLY with valid JSON, no markdown.`

const IELTS_TASK1_PROMPT = (level: string) => `You are an expert IELTS Academic Writing examiner and tutor for Arab students at ${level}.
The student wrote an IELTS Academic Task 1 response (graph/chart description, 150+ words expected).
Evaluate using official IELTS Writing Task 1 criteria and respond in JSON with these exact fields:
- band_score: number (1-9, can use 0.5 increments like 6.5)
- task_achievement: {score: number 1-9, feedback_ar: string, feedback_en: string}
- coherence_cohesion: {score: number 1-9, feedback_ar: string, feedback_en: string}
- lexical_resource: {score: number 1-9, feedback_ar: string, feedback_en: string}
- grammatical_range: {score: number 1-9, feedback_ar: string, feedback_en: string}
- corrected_text: string (corrected version with improvements)
- grammar_errors: array of {error: string, correction: string, rule_ar: string} (max 5)
- vocabulary_suggestions: array of {original: string, better: string, reason_ar: string} (max 3)
- overall_feedback_ar: string (3-4 sentences in Arabic — strengths, weaknesses, next steps)
- paragraph_feedback: array of {paragraph: string, feedback_ar: string, score_label: string} (score_label: "ممتاز" | "جيد" | "يحتاج تحسين")
- improvement_tips_ar: array of strings (3-4 IELTS-specific tips in Arabic)
- word_count: number
- xp_earned: number (10 base + up to 20 bonus for high scores — max 30)
Respond ONLY with valid JSON, no markdown.`

const IELTS_TASK2_PROMPT = (level: string) => `You are an expert IELTS Academic Writing examiner and tutor for Arab students at ${level}.
The student wrote an IELTS Task 2 essay (opinion/discussion/problem-solution, 250+ words expected).
Evaluate using official IELTS Writing Task 2 criteria and respond in JSON with these exact fields:
- band_score: number (1-9, can use 0.5 increments like 6.5)
- task_response: {score: number 1-9, feedback_ar: string, feedback_en: string}
- coherence_cohesion: {score: number 1-9, feedback_ar: string, feedback_en: string}
- lexical_resource: {score: number 1-9, feedback_ar: string, feedback_en: string}
- grammatical_range: {score: number 1-9, feedback_ar: string, feedback_en: string}
- corrected_text: string (corrected version with improvements)
- grammar_errors: array of {error: string, correction: string, rule_ar: string} (max 5)
- vocabulary_suggestions: array of {original: string, better: string, reason_ar: string} (max 3)
- overall_feedback_ar: string (3-4 sentences in Arabic — strengths, weaknesses, next steps)
- paragraph_feedback: array of {paragraph: string, feedback_ar: string, score_label: string} (score_label: "ممتاز" | "جيد" | "يحتاج تحسين")
- improvement_tips_ar: array of strings (3-4 IELTS-specific tips in Arabic)
- word_count: number
- xp_earned: number (10 base + up to 20 bonus for high scores — max 30)
Respond ONLY with valid JSON, no markdown.`

function getSystemPrompt(taskType: string, level: string): string {
  switch (taskType) {
    case 'ielts_task1': return IELTS_TASK1_PROMPT(level)
    case 'ielts_task2': return IELTS_TASK2_PROMPT(level)
    default: return SENTENCE_PROMPT(level)
  }
}

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
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // ── Parse body ──
    let body
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const { text, task_type = 'sentence_building', prompt_used } = body
    const isIELTS = task_type === 'ielts_task1' || task_type === 'ielts_task2'

    if (!text || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'النص قصير جداً للتحليل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // ── Get user role ──
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isTrainerOrAdmin = userProfile?.role === 'trainer' || userProfile?.role === 'admin'

    // ── Student checks ──
    let student: any = null
    if (!isTrainerOrAdmin) {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, package, academic_level, custom_access')
        .eq('id', user.id)
        .single()

      student = studentData
      if (!student) throw new Error('Student not found')

      // ── IELTS access control ──
      if (isIELTS) {
        const hasAccess = student.package === 'ielts' ||
          (Array.isArray(student.custom_access) && student.custom_access.includes('ielts_writing'))
        if (!hasAccess) {
          return new Response(
            JSON.stringify({ error: 'هذا القسم متاح لباقة آيلتس فقط. تواصل مع المدرب لترقية باقتك.', access_denied: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          )
        }
      }

      // ── Monthly rate limit ──
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('type', 'writing_evaluation')
        .gte('created_at', monthStart.toISOString())

      const limit = WRITING_LIMITS[student.package] || 5
      const remaining = Math.max(0, limit - (count || 0))
      if (remaining <= 0) {
        return new Response(
          JSON.stringify({
            error: `وصلت للحد الشهري (${limit} تقييم). الباقة الأعلى تعطيك أكثر!`,
            limit_reached: true,
            remaining: 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        )
      }
    }

    // ── Budget cap ──
    const budgetMonthStart = new Date()
    budgetMonthStart.setDate(1)
    budgetMonthStart.setHours(0, 0, 0, 0)

    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_monthly_budget')
      .single()

    const budgetCap = parseFloat(settings?.value || '50')

    const { data: totalCostData } = await supabase
      .from('ai_usage')
      .select('estimated_cost_sar')
      .gte('created_at', budgetMonthStart.toISOString())

    const totalCost = (totalCostData || []).reduce((sum: number, r: any) => sum + (parseFloat(r.estimated_cost_sar) || 0), 0)
    if (totalCost >= budgetCap) {
      return new Response(
        JSON.stringify({ error: 'تم الوصول للحد الشهري لخدمات الذكاء الاصطناعي', budget_reached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // ── Skip if no API key ──
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    // ── Call Claude API ──
    const levelCtx = LEVEL_CONTEXT[student?.academic_level || 3] || LEVEL_CONTEXT[3]
    const systemPrompt = getSystemPrompt(task_type, levelCtx)
    const maxTokens = isIELTS ? 2048 : 1024

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: text.trim() }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('[evaluate-writing] Claude API error:', err)
      return new Response(
        JSON.stringify({ error: 'التقييم التلقائي غير متاح حالياً — حاول مرة أخرى', ai_unavailable: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // ── Parse AI response (robust) ──
    let feedback: any
    try {
      // Strip markdown fences if present
      let cleanText = responseText
      const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) cleanText = fenceMatch[1]
      // Find JSON object
      const firstBrace = cleanText.indexOf('{')
      const lastBrace = cleanText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.slice(firstBrace, lastBrace + 1)
      }
      feedback = JSON.parse(cleanText)
    } catch {
      console.error('[evaluate-writing] JSON parse failed, raw:', responseText.slice(0, 500))
      feedback = { overall_feedback_ar: responseText, fluency_score: 5 }
    }

    // ── Estimate cost (Sonnet: ~$3/M input, ~$15/M output → SAR ~3.75x) ──
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75

    // ── Log usage ──
    const usageRecord: any = {
      type: 'writing_evaluation',
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
      metadata: { task_type, prompt_used: prompt_used || null },
    }
    if (isTrainerOrAdmin) {
      const { data: trainerRecord } = await supabase
        .from('trainers')
        .select('id')
        .eq('id', user.id)
        .single()
      usageRecord.trainer_id = trainerRecord ? user.id : null
    } else {
      usageRecord.student_id = user.id
    }
    const { error: usageErr } = await supabase.from('ai_usage').insert(usageRecord)
    if (usageErr) console.error('[evaluate-writing] Usage insert error:', usageErr.message)

    // ── Award XP (students only) ──
    const xpEarned = feedback.xp_earned || 5
    if (!isTrainerOrAdmin && student?.id) {
      try {
        await supabase.rpc('add_xp', { p_student_id: student.id, p_amount: xpEarned, p_reason: `writing_${task_type}` })
      } catch (e: any) {
        console.error('[evaluate-writing] XP award error:', e.message)
      }
    }

    // ── Save to writing_history (for sentence history) ──
    if (!isTrainerOrAdmin && student?.id) {
      try {
        await supabase.from('writing_history').insert({
          student_id: student.id,
          task_type,
          original_text: text.trim(),
          feedback,
          band_score: feedback.band_score || null,
          fluency_score: feedback.fluency_score || null,
          xp_earned: xpEarned,
          prompt_used: prompt_used || null,
        })
      } catch (e: any) {
        // Table may not exist yet — non-critical
        console.error('[evaluate-writing] History insert error:', e.message)
      }
    }

    // ── Calculate remaining uses ──
    let remaining = null
    if (!isTrainerOrAdmin && student) {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('type', 'writing_evaluation')
        .gte('created_at', monthStart.toISOString())
      const limit = WRITING_LIMITS[student.package] || 5
      remaining = Math.max(0, limit - (count || 0))
    }

    return new Response(
      JSON.stringify({ feedback, xp_earned: xpEarned, remaining }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[evaluate-writing] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
