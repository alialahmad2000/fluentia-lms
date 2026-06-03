// Fluentia LMS — Per-Student Activity Report API
// Returns a consolidated day/week/month activity & progress report for one student:
// engaged time, words learned, lessons completed, quiz/scores, weak/strong skills, XP,
// daily series, detail lists, plus a cached AI Arabic narrative.
//
// Auth (two modes):
//   1. Staff JWT (admin/trainer) — or the service-role key (cron/testing).
//   2. share_token — a public, revocable/expirable parent link (activity_report_shares).
//
// Deploy: supabase functions deploy student-activity-report --no-verify-jwt
// Env: CLAUDE_API_KEY|ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Riyadh-local date helpers ────────────────────────────────────────────────
function riyadhToday(): string {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)
}
function addDays(s: string, n: number): string {
  const d = new Date(s + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function monthStart(s: string): string { return s.slice(0, 7) + '-01' }
function monthEnd(s: string): string {
  const [y, m] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}
function resolveRange(range: string, date?: string, start?: string, end?: string) {
  const anchor = date || riyadhToday()
  switch (range) {
    case 'day':    return { rt: 'day',    s: anchor, e: anchor }
    case 'month':  return { rt: 'month',  s: monthStart(anchor), e: monthEnd(anchor) }
    case 'custom': return { rt: 'custom', s: start || anchor, e: end || anchor }
    case 'week':
    default:       return { rt: 'week',   s: addDays(anchor, -6), e: anchor }
  }
}

const SKILL_AR: Record<string, string> = {
  reading: 'القراءة', writing: 'الكتابة', speaking: 'المحادثة',
  listening: 'الاستماع', grammar: 'القواعد', vocabulary: 'المفردات',
  pronunciation: 'النطق', vocabulary_exercise: 'تمارين المفردات',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    let body: any = {}
    try { body = await req.json() } catch { return json({ error: 'Invalid request body' }, 400) }

    const locale: string = body.locale === 'en' ? 'en' : 'ar'
    let studentId: string | null = null
    let rangeType: string, periodStart: string, periodEnd: string
    let callerId: string | null = null
    let viaToken = false

    // ── Mode 2: share token (public parent link) ───────────────────────────
    if (body.share_token && typeof body.share_token === 'string') {
      if (body.share_token.length > 80) return json({ error: 'رمز غير صالح' }, 400)
      let share: any = null
      try {
        const { data } = await sb
          .from('activity_report_shares')
          .select('*')
          .eq('token', body.share_token)
          .is('revoked_at', null)
          .maybeSingle()
        share = data
      } catch (_e) { share = null }

      if (!share) return json({ error: 'الرابط غير صالح أو منتهي الصلاحية' }, 401)
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        return json({ error: 'انتهت صلاحية هذا الرابط' }, 401)
      }
      viaToken = true
      studentId = share.student_id
      rangeType = share.range_type
      periodStart = share.period_start
      periodEnd = share.period_end

      // best-effort view tracking
      try {
        await sb.from('activity_report_shares')
          .update({ view_count: (share.view_count || 0) + 1, last_viewed_at: new Date().toISOString() })
          .eq('id', share.id)
      } catch (_e) { /* non-fatal */ }
    } else {
      // ── Mode 1: staff JWT (or service-role key) ──────────────────────────
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) return json({ error: 'Missing authorization' }, 401)
      const token = authHeader.replace('Bearer ', '')

      if (token !== SERVICE_KEY) {
        const { data: { user }, error: authErr } = await sb.auth.getUser(token)
        if (authErr || !user) return json({ error: 'Unauthorized' }, 401)
        const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'trainer'].includes(profile.role)) {
          return json({ error: 'Unauthorized — trainers/admins only' }, 403)
        }
        callerId = user.id
      }

      if (!body.student_id || typeof body.student_id !== 'string') {
        return json({ error: 'Missing student_id' }, 400)
      }
      studentId = body.student_id
      const r = resolveRange(body.range || 'week', body.date, body.start, body.end)
      rangeType = r.rt; periodStart = r.s; periodEnd = r.e
    }

    // ── Freshness: refresh today & yesterday (Riyadh) if within range ────────
    const today = riyadhToday()
    const yest = addDays(today, -1)
    for (const d of [yest, today]) {
      if (d >= periodStart && d <= periodEnd) {
        try { await sb.rpc('compute_student_daily_activity', { p_student: studentId, p_date: d }) }
        catch (_e) { /* non-fatal */ }
      }
    }

    // ── Aggregate ───────────────────────────────────────────────────────────
    const { data: report, error: rpcErr } = await sb.rpc('get_student_activity_report', {
      p_student: studentId, p_start: periodStart, p_end: periodEnd,
    })
    if (rpcErr) return json({ error: 'Aggregation failed: ' + rpcErr.message }, 500)
    if (!report || report.error) return json({ error: report?.error || 'No data' }, 404)

    // ── AI narrative (cached) ───────────────────────────────────────────────
    let ai: { narrative: string | null; next_steps: string[]; cached: boolean } = {
      narrative: null, next_steps: [], cached: false,
    }
    const wantAI = body.with_ai !== false && !!CLAUDE_API_KEY
    if (wantAI) {
      const t = report.totals || {}
      const sk = report.skills || {}
      const signature = [
        t.xp_earned, t.sections_completed, t.words_mastered, t.learning_minutes,
        t.active_days, t.avg_score, sk.strongest, sk.weakest, locale,
      ].join('|')

      // cache lookup
      let cached: any = null
      try {
        const { data } = await sb.from('activity_report_narratives')
          .select('narrative, next_steps, data_signature')
          .eq('student_id', studentId).eq('range_type', rangeType)
          .eq('period_start', periodStart).eq('period_end', periodEnd)
          .eq('locale', locale).maybeSingle()
        cached = data
      } catch (_e) { cached = null }

      if (cached && cached.data_signature === signature && !body.force_ai) {
        ai = { narrative: cached.narrative, next_steps: cached.next_steps || [], cached: true }
      } else {
        const gen = await generateNarrative(report, rangeType, locale)
        if (gen) {
          ai = { narrative: gen.narrative, next_steps: gen.next_steps, cached: false }
          try {
            await sb.from('activity_report_narratives').upsert({
              student_id: studentId, range_type: rangeType,
              period_start: periodStart, period_end: periodEnd, locale,
              narrative: gen.narrative, next_steps: gen.next_steps,
              data_signature: signature, model: 'claude-sonnet-4-6', updated_at: new Date().toISOString(),
            }, { onConflict: 'student_id,range_type,period_start,period_end,locale' })
          } catch (_e) { /* non-fatal */ }
          // best-effort usage logging
          try {
            await sb.from('ai_usage').insert({
              type: 'activity_report_narrative', student_id: studentId, trainer_id: callerId,
              model: 'claude-sonnet-4-6',
              input_tokens: gen.usage.input, output_tokens: gen.usage.output,
              tokens_used: gen.usage.input + gen.usage.output,
              estimated_cost_sar: (((gen.usage.input * 3 + gen.usage.output * 15) / 1_000_000) * 3.75).toFixed(4),
            })
          } catch (_e) { /* non-fatal */ }
        }
      }
    }

    return json({
      success: true,
      via: viaToken ? 'share' : 'staff',
      range_type: rangeType,
      period: { start: periodStart, end: periodEnd },
      report,
      ai,
    })
  } catch (e) {
    console.error('[student-activity-report]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})

async function generateNarrative(report: any, rangeType: string, locale: string):
  Promise<{ narrative: string; next_steps: string[]; usage: { input: number; output: number } } | null> {
  const t = report.totals || {}
  const sk = report.skills || {}
  const periodWord = locale === 'ar'
    ? ({ day: 'هذا اليوم', week: 'هذا الأسبوع', month: 'هذا الشهر', custom: 'هذه الفترة' } as any)[rangeType] || 'هذه الفترة'
    : ({ day: 'today', week: 'this week', month: 'this month', custom: 'this period' } as any)[rangeType] || 'this period'

  const compact = {
    student: report.student?.name,
    level: report.student?.level,
    period: report.range,
    learning_minutes: t.learning_minutes,
    active_days: t.active_days,
    sessions: t.session_count,
    words_mastered: t.words_mastered,
    words_practiced: t.words_practiced,
    sections_completed: t.sections_completed,
    avg_score: t.avg_score,
    xp_earned: t.xp_earned,
    strongest_skill: sk.strongest ? (SKILL_AR[sk.strongest] || sk.strongest) : null,
    weakest_skill: sk.weakest ? (SKILL_AR[sk.weakest] || sk.weakest) : null,
    skills_period: sk.period,
    current_streak: report.student?.current_streak,
  }

  const prompt = locale === 'ar'
    ? `أنت معلّم لغة إنجليزية عربيّ تكتب ملخّصاً قصيراً لوليّ أمر أو لمعلّم عن نشاط الطالب/ة خلال ${periodWord}. اكتب فقرتين قصيرتين بالعربية الفصحى البسيطة، دافئتين ومهنيّتين، تذكر فيهما الأرقام الحقيقيّة (الوقت، الكلمات المتقنة، الدروس، نقاط القوة والضعف). لا تبالغ؛ إن كان النشاط ضعيفاً اذكر ذلك بلطف. ثمّ اقترح ٣ خطوات تالية ملموسة.

البيانات:
${JSON.stringify(compact, null, 2)}

أعِد JSON فقط بهذا الشكل: {"narrative":"...","next_steps":["...","...","..."]} — بدون أي نص خارج الـ JSON، وبدون markdown.`
    : `You are an English teacher writing a short summary for a parent or teacher about a student's activity during ${periodWord}. Write two short, warm, professional paragraphs citing the real numbers (time, words mastered, lessons, strongest/weakest skill). Do not exaggerate; if activity was low, say so kindly. Then suggest 3 concrete next steps.

Data:
${JSON.stringify(compact, null, 2)}

Return ONLY JSON: {"narrative":"...","next_steps":["...","...","..."]} — no text outside the JSON, no markdown.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text: string = data.content?.[0]?.text || ''
    const a = text.indexOf('{'); const b = text.lastIndexOf('}')
    let narrative = text; let next_steps: string[] = []
    if (a !== -1 && b !== -1) {
      try {
        const parsed = JSON.parse(text.slice(a, b + 1))
        narrative = parsed.narrative || text
        if (Array.isArray(parsed.next_steps)) next_steps = parsed.next_steps.slice(0, 4)
      } catch { /* fall back to raw text */ }
    }
    return {
      narrative,
      next_steps,
      usage: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
    }
  } catch (_e) {
    return null
  }
}
