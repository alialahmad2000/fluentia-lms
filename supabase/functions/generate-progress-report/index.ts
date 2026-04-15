// LEGENDARY-F — Generate AI-Powered Progress Report
// Uses build_progress_report_data() aggregator RPC + Claude for narrative + goals
// Deploy: supabase functions deploy generate-progress-report --no-verify-jwt
// Env: CLAUDE_API_KEY or ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Package → default period
const PACKAGE_PERIOD: Record<string, string> = {
  asas: 'monthly',
  talaqa: 'biweekly',
  tamayuz: 'weekly',
  ielts: 'weekly',
}

const PERIOD_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { data: callerProfile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['trainer', 'admin'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'Unauthorized — trainers/admins only' }, 403)
    }

    // ── Parse body ───────────────────────────────────────────────────
    let body: { student_id?: string; period?: string; period_start?: string; period_end?: string } = {}
    try { body = await req.json() } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const { student_id } = body
    if (!student_id || typeof student_id !== 'string') {
      return jsonResponse({ error: 'Missing student_id' }, 400)
    }

    // Resolve period
    let periodType = body.period || 'monthly'
    if (!['weekly', 'biweekly', 'monthly'].includes(periodType)) {
      // Auto-detect from student package
      const { data: student } = await sb
        .from('students')
        .select('package')
        .eq('id', student_id)
        .single()
      periodType = PACKAGE_PERIOD[student?.package || ''] || 'monthly'
    }

    const periodDays = PERIOD_DAYS[periodType] || 30
    const periodEnd = body.period_end
      ? new Date(body.period_end)
      : new Date()
    const periodStart = body.period_start
      ? new Date(body.period_start)
      : new Date(periodEnd.getTime() - periodDays * 86400000)

    const pStart = periodStart.toISOString().split('T')[0]
    const pEnd = periodEnd.toISOString().split('T')[0]

    // ── Aggregator RPC ───────────────────────────────────────────────
    const { data: reportData, error: rpcErr } = await sb.rpc('build_progress_report_data', {
      p_student_id: student_id,
      p_period_start: pStart,
      p_period_end: pEnd,
    })

    if (rpcErr) {
      console.error('[generate-progress-report] RPC error:', rpcErr.message)
      return jsonResponse({ error: 'Failed to aggregate report data: ' + rpcErr.message }, 500)
    }

    if (reportData?.error) {
      return jsonResponse({ error: reportData.error }, 404)
    }

    // ── Build highlights ─────────────────────────────────────────────
    const highlights: string[] = []
    const d = reportData as any

    if (d.units?.completed_in_period > 0) {
      highlights.push(`أكمل/ت ${d.units.completed_in_period} وحدة دراسية`)
    }
    if (d.vocabulary?.mastered > 0) {
      highlights.push(`أتقن/ت ${d.vocabulary.mastered} كلمة جديدة`)
    }
    if (d.classes?.attended > 0 && d.classes?.scheduled > 0) {
      highlights.push(`حضر/ت ${d.classes.attended} من ${d.classes.scheduled} حصة`)
    }
    if (d.streak?.current >= 7) {
      highlights.push(`حقّق/ت سلسلة يومية ${d.streak.current} يوم`)
    }
    if (d.xp?.period_earned > 0) {
      highlights.push(`كسب/ت ${d.xp.period_earned} نقطة خبرة`)
    }

    const enrichedData = { ...reportData, highlights }

    // ── Claude API: Narrative ────────────────────────────────────────
    let aiNarrative: string | null = null
    let nextGoals: string[] = []

    if (CLAUDE_API_KEY) {
      // Narrative
      try {
        const narrativeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            messages: [{
              role: 'user',
              content: `أنت معلّم لغة إنجليزية عربيّ، تكتب تقرير تقدّم شهريّ لطالبك/طالبتك بأسلوب دافئ ومهنيّ. اكتب فقرتين أو ثلاث فقط. اذكر الإنجازات الحقيقيّة بناءً على البيانات، ولاحظ الأنماط (تحسّن في مهارة، تراجع في أخرى)، واختم بجملة تشجيعيّة صادقة ومحدّدة - ليست عامّة. تجنّب المبالغة. إذا كانت الأرقام ضعيفة، اعترف بذلك بلطف واربطها بخطوة تالية ملموسة.

إليك البيانات:
${JSON.stringify(enrichedData, null, 2)}

اكتب التقرير باللغة العربيّة الفصحى (بعض العاميّة السلسة مقبولة)، بدون عناوين، بدون بلوكات markdown، فقرات سردية فقط.`,
            }],
          }),
        })

        if (narrativeRes.ok) {
          const narrativeData = await narrativeRes.json()
          aiNarrative = narrativeData.content?.[0]?.text || null

          // Log AI usage
          const inputTokens = narrativeData.usage?.input_tokens || 0
          const outputTokens = narrativeData.usage?.output_tokens || 0
          await sb.from('ai_usage').insert({
            type: 'progress_report_narrative',
            student_id,
            trainer_id: user.id,
            model: 'claude-sonnet-4-6',
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            tokens_used: inputTokens + outputTokens,
            estimated_cost_sar: (((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75).toFixed(4),
          })
        }
      } catch (e) {
        console.error('[generate-progress-report] Narrative generation failed:', (e as Error).message)
      }

      // Goals
      try {
        const goalsRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 500,
            messages: [{
              role: 'user',
              content: `بناءً على التقرير التالي، اقترح ٣ أهداف ملموسة وقابلة للقياس لشهر الطالب/ة القادم. كل هدف في جملة واحدة، يبدأ بفعل أمر، ويتضمّن رقماً محدّداً.

${JSON.stringify(enrichedData, null, 2)}

أعد JSON فقط: {"goals":["...","...","..."]}`,
            }],
          }),
        })

        if (goalsRes.ok) {
          const goalsData = await goalsRes.json()
          const goalsText = goalsData.content?.[0]?.text || ''
          const openBrace = goalsText.indexOf('{')
          const closeBrace = goalsText.lastIndexOf('}')
          if (openBrace !== -1 && closeBrace !== -1) {
            try {
              const parsed = JSON.parse(goalsText.substring(openBrace, closeBrace + 1))
              if (Array.isArray(parsed.goals)) nextGoals = parsed.goals.slice(0, 3)
            } catch { /* use empty goals */ }
          }

          const inputTokens = goalsData.usage?.input_tokens || 0
          const outputTokens = goalsData.usage?.output_tokens || 0
          await sb.from('ai_usage').insert({
            type: 'progress_report_goals',
            student_id,
            trainer_id: user.id,
            model: 'claude-sonnet-4-6',
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            tokens_used: inputTokens + outputTokens,
            estimated_cost_sar: (((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75).toFixed(4),
          })
        }
      } catch (e) {
        console.error('[generate-progress-report] Goals generation failed:', (e as Error).message)
      }
    }

    // ── Insert report ────────────────────────────────────────────────
    // Table uses: type (enum), ai_summary, trainer_notes, data, pdf_url, status (enum)
    const { data: insertedReport, error: insertErr } = await sb
      .from('progress_reports')
      .insert({
        student_id,
        trainer_id: user.id,
        type: periodType,
        period_start: pStart,
        period_end: pEnd,
        status: 'trainer_review',
        data: enrichedData,
        ai_summary: aiNarrative,
        ai_narrative_ar: aiNarrative,
        trainer_notes: null,
        next_goals: nextGoals,
        confidence_band: d.xp?.confidence_band || 'high',
        generated_by: 'LEGENDARY-F',
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[generate-progress-report] Insert error:', insertErr.message)
      // Non-fatal — return the report data anyway
    }

    return jsonResponse({
      success: true,
      report_id: insertedReport?.id || null,
      data: enrichedData,
      ai_narrative_ar: aiNarrative,
      next_goals: nextGoals,
      confidence_band: d.xp?.confidence_band || 'high',
      period_type: periodType,
      period_start: pStart,
      period_end: pEnd,
    })

  } catch (error: unknown) {
    console.error('[generate-progress-report] Error:', (error as Error).message)
    return jsonResponse({ error: (error as Error).message }, 500)
  }
})
