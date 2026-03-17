// Fluentia LMS — AI Writing Correction & Feedback Edge Function (Claude API)
// Provides detailed writing correction with error analysis for Arabic speakers
// Deploy: supabase functions deploy correct-writing
// Env: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Monthly writing correction limits per package
const WRITING_LIMITS: Record<string, number> = {
  asas: 2,
  talaqa: 4,
  tamayuz: 8,
  ielts: 8,
}

const CEFR_LEVELS: Record<number, string> = {
  1: 'A1 beginner — very simple sentences, basic vocabulary',
  2: 'A2 elementary — short paragraphs, everyday topics',
  3: 'B1 intermediate — connected paragraphs, familiar topics',
  4: 'B2 upper-intermediate — detailed text, variety of topics',
  5: 'C1 advanced — complex writing, nuanced expression',
}

// ─── System prompts ─────────────────────────────────────────

const GENERAL_SYSTEM_PROMPT = (level: string) => `You are an expert English writing tutor specializing in teaching Arabic speakers at ${level}.

The student has submitted a piece of writing for correction and feedback. Analyze it thoroughly and respond with ONLY valid JSON (no markdown) containing these exact fields:

- corrected_text: string (the full corrected version of their writing, preserving their intended meaning)
- overall_score: number 0-100 (holistic writing quality score)
- feedback_ar: string (3-4 sentences of constructive feedback in Arabic, encouraging tone)
- feedback_en: string (3-4 sentences of constructive feedback in English)
- errors: array of objects, each with:
  - original: string (the incorrect text)
  - corrected: string (the corrected version)
  - type: "grammar" | "spelling" | "vocabulary" | "punctuation" | "style"
  - explanation_ar: string (explanation in Arabic)
  - explanation_en: string (explanation in English)
- strengths: array of strings in Arabic (2-4 things the student did well)
- improvements: array of strings in Arabic (2-4 specific areas to improve)

Pay special attention to common errors Arabic speakers make:
- Article usage (a/an/the)
- Subject-verb agreement
- Verb tense consistency
- Preposition usage
- Word order differences from Arabic
- Plural forms
- Countable vs uncountable nouns

Respond ONLY with valid JSON, no markdown fences.`

const IELTS_TASK1_SYSTEM_PROMPT = (level: string) => `You are an expert IELTS Academic Writing examiner and tutor specializing in teaching Arabic speakers at ${level}.

The student wrote an IELTS Academic Task 1 response (graph/chart/table/diagram description, 150+ words expected).
Evaluate using official IELTS Writing Task 1 band descriptors and respond with ONLY valid JSON (no markdown) containing these exact fields:

- corrected_text: string (corrected version preserving intended meaning)
- overall_score: number 0-100 (holistic quality score)
- feedback_ar: string (3-4 sentences in Arabic, constructive and specific)
- feedback_en: string (3-4 sentences in English)
- errors: array of objects, each with:
  - original: string
  - corrected: string
  - type: "grammar" | "spelling" | "vocabulary" | "punctuation" | "style"
  - explanation_ar: string
  - explanation_en: string
- strengths: array of strings in Arabic (2-4 strengths)
- improvements: array of strings in Arabic (2-4 areas to improve)
- ielts_scores: object with:
  - task_achievement: number 1-9 (0.5 increments allowed)
  - coherence: number 1-9
  - lexical_resource: number 1-9
  - grammar: number 1-9
  - overall_band: number 1-9 (average of the four criteria, rounded to nearest 0.5)

Respond ONLY with valid JSON, no markdown fences.`

const IELTS_TASK2_SYSTEM_PROMPT = (level: string) => `You are an expert IELTS Academic Writing examiner and tutor specializing in teaching Arabic speakers at ${level}.

The student wrote an IELTS Task 2 essay (opinion/discussion/problem-solution, 250+ words expected).
Evaluate using official IELTS Writing Task 2 band descriptors and respond with ONLY valid JSON (no markdown) containing these exact fields:

- corrected_text: string (corrected version preserving intended meaning)
- overall_score: number 0-100 (holistic quality score)
- feedback_ar: string (3-4 sentences in Arabic, constructive and specific)
- feedback_en: string (3-4 sentences in English)
- errors: array of objects, each with:
  - original: string
  - corrected: string
  - type: "grammar" | "spelling" | "vocabulary" | "punctuation" | "style"
  - explanation_ar: string
  - explanation_en: string
- strengths: array of strings in Arabic (2-4 strengths)
- improvements: array of strings in Arabic (2-4 areas to improve)
- ielts_scores: object with:
  - task_achievement: number 1-9 (0.5 increments allowed)
  - coherence: number 1-9
  - lexical_resource: number 1-9
  - grammar: number 1-9
  - overall_band: number 1-9 (average of the four criteria, rounded to nearest 0.5)

Respond ONLY with valid JSON, no markdown fences.`

const EMAIL_SYSTEM_PROMPT = (level: string) => `You are an expert English writing tutor specializing in teaching Arabic speakers at ${level}.

The student wrote an email (formal or informal). Analyze the email for tone, structure, grammar, and appropriateness. Respond with ONLY valid JSON (no markdown) containing these exact fields:

- corrected_text: string (the corrected email)
- overall_score: number 0-100
- feedback_ar: string (3-4 sentences in Arabic about email quality, tone, and structure)
- feedback_en: string (3-4 sentences in English)
- errors: array of objects, each with:
  - original: string
  - corrected: string
  - type: "grammar" | "spelling" | "vocabulary" | "punctuation" | "style"
  - explanation_ar: string
  - explanation_en: string
- strengths: array of strings in Arabic (2-4 strengths)
- improvements: array of strings in Arabic (2-4 areas to improve)

Respond ONLY with valid JSON, no markdown fences.`

const ESSAY_SYSTEM_PROMPT = (level: string) => `You are an expert English writing tutor specializing in teaching Arabic speakers at ${level}.

The student wrote a general essay. Evaluate structure, argumentation, coherence, grammar, and vocabulary. Respond with ONLY valid JSON (no markdown) containing these exact fields:

- corrected_text: string (the corrected essay)
- overall_score: number 0-100
- feedback_ar: string (3-4 sentences in Arabic about essay quality)
- feedback_en: string (3-4 sentences in English)
- errors: array of objects, each with:
  - original: string
  - corrected: string
  - type: "grammar" | "spelling" | "vocabulary" | "punctuation" | "style"
  - explanation_ar: string
  - explanation_en: string
- strengths: array of strings in Arabic (2-4 strengths)
- improvements: array of strings in Arabic (2-4 areas to improve)

Respond ONLY with valid JSON, no markdown fences.`

function getSystemPrompt(taskType: string, level: string): string {
  switch (taskType) {
    case 'ielts_task1': return IELTS_TASK1_SYSTEM_PROMPT(level)
    case 'ielts_task2': return IELTS_TASK2_SYSTEM_PROMPT(level)
    case 'email': return EMAIL_SYSTEM_PROMPT(level)
    case 'essay': return ESSAY_SYSTEM_PROMPT(level)
    default: return GENERAL_SYSTEM_PROMPT(level)
  }
}

serve(async (req) => {
  // ── CORS preflight ──
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

    const { text, task_type = 'general', level, submission_id } = body
    const isIELTS = task_type === 'ielts_task1' || task_type === 'ielts_task2'

    if (!text || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'النص قصير جداً للتحليل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // ── Get user profile ──
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, current_package')
      .eq('id', user.id)
      .single()

    const isTrainerOrAdmin = userProfile?.role === 'trainer' || userProfile?.role === 'admin'

    // ── Rate limiting (students only) ──
    if (!isTrainerOrAdmin) {
      const packageName = userProfile?.current_package || 'asas'

      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'writing_correction')
        .gte('created_at', monthStart.toISOString())

      const limit = WRITING_LIMITS[packageName] || 2
      const used = count || 0
      if (used >= limit) {
        return new Response(
          JSON.stringify({
            error: `وصلت للحد الشهري (${limit} تصحيح). الباقة الأعلى تعطيك أكثر!`,
            limit_reached: true,
            remaining: 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        )
      }
    }

    // ── Skip if no API key ──
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    // ── Determine CEFR level ──
    const cefrLevel = level ? Math.min(5, Math.max(1, level)) : 3
    const levelCtx = CEFR_LEVELS[cefrLevel] || CEFR_LEVELS[3]
    const systemPrompt = getSystemPrompt(task_type, levelCtx)
    const maxTokens = isIELTS ? 2048 : 1536

    // ── Call Claude API ──
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
      console.error('[correct-writing] Claude API error:', err)
      return new Response(
        JSON.stringify({ error: 'التصحيح التلقائي غير متاح حالياً — حاول مرة أخرى', ai_unavailable: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // ── Parse AI response (robust) ──
    let correction: any
    try {
      let cleanText = responseText
      // Strip markdown fences if present
      const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) cleanText = fenceMatch[1]
      // Find JSON object
      const firstBrace = cleanText.indexOf('{')
      const lastBrace = cleanText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.slice(firstBrace, lastBrace + 1)
      }
      correction = JSON.parse(cleanText)
    } catch {
      console.error('[correct-writing] JSON parse failed, raw:', responseText.slice(0, 500))
      correction = {
        corrected_text: text,
        overall_score: 50,
        feedback_ar: responseText,
        feedback_en: 'Could not parse structured feedback.',
        errors: [],
        strengths: [],
        improvements: [],
      }
    }

    // ── Update assignment submission if submission_id provided ──
    if (submission_id) {
      const { error: updateErr } = await supabase
        .from('assignment_submissions')
        .update({ ai_feedback: correction })
        .eq('id', submission_id)

      if (updateErr) {
        console.error('[correct-writing] Submission update error:', updateErr.message)
      }
    }

    // ── Estimate cost (Sonnet: ~$3/M input, ~$15/M output -> SAR ~3.75x) ──
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75

    // ── Log usage ──
    const usageRecord: any = {
      user_id: user.id,
      type: 'writing_correction',
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
      metadata: { task_type, level: cefrLevel, submission_id: submission_id || null },
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
    if (usageErr) console.error('[correct-writing] Usage insert error:', usageErr.message)

    // ── Calculate remaining uses ──
    let remaining = null
    if (!isTrainerOrAdmin) {
      const packageName = userProfile?.current_package || 'asas'
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'writing_correction')
        .gte('created_at', monthStart.toISOString())

      const limit = WRITING_LIMITS[packageName] || 2
      remaining = Math.max(0, limit - (count || 0))
    }

    return new Response(
      JSON.stringify({ correction, remaining }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[correct-writing] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
