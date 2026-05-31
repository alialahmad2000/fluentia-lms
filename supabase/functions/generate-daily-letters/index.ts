// generate-daily-letters — gender + trainer aware daily Arabic letter generator.
//
// Two use cases (same pattern as retention-daily-cron):
//   1. pg_cron HTTP-triggered (02:00 UTC = 05:00 Riyadh) — generates today's
//      letter for every active student, idempotently.
//   2. Admin "force run" / single-student preview (POST body overrides).
//
// Per student we route to one of two gendered SYSTEM_PROMPTs (Arabic grammar is
// gendered) and resolve the signature from students.assigned_trainer_id, falling
// back to "د. محمد". Wrong-gender Arabic is worse than no letter, so a NULL-gender
// student gets a gender-neutral template fallback, never a guessed-gender letter.
//
// Data assembly mirrors the production useStudentDashboard hook exactly (same
// tables/columns) so the letter's facts always agree with the dashboard.
//
// Deploy: supabase functions deploy generate-daily-letters --no-verify-jwt --project-ref nmjexpuycmqcxuxljier
// verify_jwt=false — auth handled internally (service-role bearer or admin JWT).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  StudentDay,
  Gender,
  getSystemPrompt,
  buildUserPrompt,
  templateFallback,
} from './gender.ts'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 400
const MAX_STUDENTS = 80 // hard cost cap per run (≈ $0.05/run worst case at Haiku pricing)
const FALLBACK_TRAINER = 'د. محمد'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// ── Date helpers (everything anchored to Riyadh) ────────────────────────────
function riyadhDateISO(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
function arabicDate(d: Date): string {
  return new Intl.DateTimeFormat('ar-u-ca-gregory-nu-arab', {
    timeZone: 'Asia/Riyadh',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}
function enWeekday(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Riyadh', weekday: 'long' }).format(d)
}

const LEVEL_CEFR: Record<number, string> = { 0: 'Pre-A1', 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1' }

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('CLAUDE_API_KEY') || ''

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { ok: false, error: 'Server misconfiguration (missing SUPABASE_URL or SERVICE_ROLE_KEY)' })
  }

  // ── Auth: service-role bearer (cron) OR admin JWT ──
  const authHeader = req.headers.get('Authorization') ?? ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return json(401, { ok: false, error: 'Missing Authorization header' })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  let invokedBy: 'service_role' | 'admin' = 'service_role'
  if (bearer !== SERVICE_ROLE_KEY) {
    const { data: userResult, error: userErr } = await supabase.auth.getUser(bearer)
    if (userErr || !userResult?.user) return json(401, { ok: false, error: 'Invalid token' })
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userResult.user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') return json(403, { ok: false, error: 'Forbidden — admin only' })
    invokedBy = 'admin'
  }

  // ── Body options ──
  let body: { student_id?: string; date?: string; force?: boolean } = {}
  try {
    const raw = await req.text()
    if (raw) body = JSON.parse(raw)
  } catch {
    /* cron sends empty body */
  }

  const now = new Date()
  const runDate = body.date || riyadhDateISO(now)
  const date_ar = arabicDate(now)
  const todayWeekday = enWeekday(now)
  const weekAgoISO = new Date(now.getTime() - 7 * 86400_000).toISOString()

  // ── Load roster: active students + their profile names ──
  const settle = async <T,>(p: PromiseLike<{ data: T; error: unknown }>, fb: T): Promise<T> => {
    try {
      const r = await p
      return r?.error ? fb : (r.data ?? fb)
    } catch {
      return fb
    }
  }

  // Students (only this student if a preview was requested).
  let studentQuery = supabase
    .from('students')
    .select('id, gender, assigned_trainer_id, current_streak, academic_level, group_id, team_id, xp_total')
    .is('deleted_at', null)
  if (body.student_id) studentQuery = studentQuery.eq('id', body.student_id)
  const studentRows = await settle<any[]>(studentQuery, [])

  // Profiles: names + role gate (keep only role='student').
  const ids = studentRows.map((s) => s.id)
  const profileRows = ids.length
    ? await settle<any[]>(
        supabase.from('profiles').select('id, display_name, full_name, role').in('id', ids),
        [],
      )
    : []
  const profMap = new Map(profileRows.map((p) => [p.id, p]))

  let roster = studentRows
    .filter((s) => profMap.get(s.id)?.role === 'student')
    .map((s) => {
      const p = profMap.get(s.id)
      return { ...s, name_ar: p?.display_name || p?.full_name || 'صديقنا' }
    })

  const totalStudents = roster.length
  let cappedNote: string | null = null
  if (roster.length > MAX_STUDENTS) {
    cappedNote = `capped ${roster.length} → ${MAX_STUDENTS} (cost guard)`
    roster = roster.slice(0, MAX_STUDENTS)
  }

  if (roster.length === 0) {
    return json(200, { ok: true, run_date: runDate, invoked_by: invokedBy, total_students: 0, note: 'no active students matched' })
  }

  // ── Bulk lookups (constant query count regardless of roster size) ──
  const groupIds = [...new Set(roster.map((s) => s.group_id).filter(Boolean))]
  const teamIds = [...new Set(roster.map((s) => s.team_id).filter(Boolean))]

  const [levelRows, xpRows, srsRows, groupRows, achRows, existingRows, trainerRows] = await Promise.all([
    settle<any[]>(supabase.from('curriculum_levels').select('level_number, name_ar, cefr'), []),
    settle<any[]>(
      supabase.from('xp_transactions').select('student_id, amount, created_at').in('student_id', ids).gte('created_at', weekAgoISO),
      [],
    ),
    settle<any[]>(
      supabase.from('curriculum_vocabulary_srs').select('student_id').in('student_id', ids).lte('due', now.toISOString()),
      [],
    ),
    groupIds.length
      ? settle<any[]>(supabase.from('groups').select('id, name, google_meet_link, schedule, trainer_id').in('id', groupIds), [])
      : Promise.resolve([] as any[]),
    settle<any[]>(
      supabase
        .from('student_achievements')
        .select('student_id, earned_at, achievement:achievements(name_ar)')
        .in('student_id', ids)
        .order('earned_at', { ascending: false }),
      [],
    ),
    settle<any[]>(supabase.from('daily_letters').select('student_id').eq('letter_date', runDate), []),
    settle<any[]>(supabase.from('profiles').select('id, display_name, full_name').neq('role', 'student'), []),
  ])

  const levelMap = new Map(levelRows.map((l) => [l.level_number, l]))
  const groupMap = new Map(groupRows.map((g) => [g.id, g]))
  const trainerMap = new Map(trainerRows.map((t) => [t.id, t.display_name || t.full_name]))
  const existing = new Set(existingRows.map((r) => r.student_id))

  // xp buckets per student
  const xpToday = new Map<string, number>()
  const xpWeek = new Map<string, number>()
  for (const r of xpRows) {
    const amt = r.amount || 0
    xpWeek.set(r.student_id, (xpWeek.get(r.student_id) || 0) + amt)
    if (riyadhDateISO(new Date(r.created_at)) === runDate) {
      xpToday.set(r.student_id, (xpToday.get(r.student_id) || 0) + amt)
    }
  }
  // anki due counts per student
  const ankiDue = new Map<string, number>()
  for (const r of srsRows) ankiDue.set(r.student_id, (ankiDue.get(r.student_id) || 0) + 1)
  // first (latest) achievement per student
  const achMap = new Map<string, string>()
  for (const r of achRows) {
    if (!achMap.has(r.student_id) && r.achievement?.name_ar) achMap.set(r.student_id, r.achievement.name_ar)
  }
  // peers by group (other active students with a streak), gendered
  const byGroup = new Map<string, typeof roster>()
  for (const s of roster) {
    if (!s.group_id) continue
    if (!byGroup.has(s.group_id)) byGroup.set(s.group_id, [])
    byGroup.get(s.group_id)!.push(s)
  }

  function assemble(s: (typeof roster)[number]): StudentDay {
    const lvl = s.academic_level != null ? levelMap.get(s.academic_level) : null
    const grp = s.group_id ? groupMap.get(s.group_id) : null
    const days: string[] = Array.isArray(grp?.schedule?.days) ? grp.schedule.days : []
    const hasClassToday = !!grp?.google_meet_link && days.includes(todayWeekday)
    const xpTotal = s.xp_total ?? 0
    const peers = (byGroup.get(s.group_id) || [])
      .filter((o) => o.id !== s.id && (o.current_streak ?? 0) > 0)
      .sort((a, b) => (b.current_streak ?? 0) - (a.current_streak ?? 0))
      .slice(0, 2)
      .map((o) => ({
        name_ar: (o.name_ar || '').split(' ')[0] || o.name_ar,
        gender: (o.gender === 'male' ? 'male' : 'female') as Gender,
        streak_days: o.current_streak ?? 0,
      }))

    return {
      student_id: s.id,
      name_ar: s.name_ar,
      gender: (s.gender as Gender | null) ?? null,
      trainer_id: s.assigned_trainer_id || null,
      trainer_name: s.assigned_trainer_id ? trainerMap.get(s.assigned_trainer_id) || FALLBACK_TRAINER : FALLBACK_TRAINER,
      date_ar,
      streak_days: s.current_streak ?? 0,
      level: lvl?.name_ar || (s.academic_level != null ? `المستوى ${s.academic_level}` : 'المستوى'),
      level_cefr: lvl?.cefr || LEVEL_CEFR[s.academic_level] || '',
      level_percent: Math.min(100, Math.round(((xpTotal % 500) / 500) * 100)),
      xp_today: xpToday.get(s.id) || 0,
      xp_week: xpWeek.get(s.id) || 0,
      anki_due: ankiDue.get(s.id) || 0,
      has_class_today: hasClassToday,
      last_achievement: achMap.get(s.id) || null,
      peers,
    }
  }

  // ── Claude call ──
  async function callClaude(data: StudentDay): Promise<{ text: string; inTok: number; outTok: number } | null> {
    if (!ANTHROPIC_KEY) return null
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: getSystemPrompt(data),
          messages: [{ role: 'user', content: buildUserPrompt(data) }],
        }),
      })
      if (!resp.ok) return null
      const j = await resp.json()
      const text = (j?.content?.[0]?.text || '').trim()
      if (!text) return null
      return { text, inTok: j?.usage?.input_tokens || 0, outTok: j?.usage?.output_tokens || 0 }
    } catch {
      return null
    }
  }

  // ── Run record ──
  const runStarted = Date.now()
  const tally = {
    generated_total: 0,
    generated_male: 0,
    generated_female: 0,
    via_claude: 0,
    via_fallback: 0,
    skipped_existing: 0,
    skipped_no_gender: 0,
    errors: 0,
    input_tokens: 0,
    output_tokens: 0,
  }

  for (const s of roster) {
    if (!body.force && existing.has(s.id)) {
      tally.skipped_existing++
      continue
    }
    try {
      const data = assemble(s)
      const t0 = Date.now()

      let letterBody: string
      let source: 'claude_haiku' | 'template_fallback'
      let inTok = 0
      let outTok = 0

      if (data.gender == null) {
        // DO NOT guess gender — neutral template fallback + flag for manual backfill.
        letterBody = templateFallback(data)
        source = 'template_fallback'
        tally.skipped_no_gender++
      } else {
        const out = await callClaude(data)
        if (out) {
          letterBody = out.text
          source = 'claude_haiku'
          inTok = out.inTok
          outTok = out.outTok
          tally.via_claude++
        } else {
          letterBody = templateFallback(data)
          source = 'template_fallback'
          tally.via_fallback++
        }
      }

      const genForRow: Gender = data.gender === 'male' ? 'male' : 'female'
      const payload = {
        student_id: s.id,
        letter_date: runDate,
        body_ar: letterBody,
        salutation: `${data.name_ar}،`,
        signature: `— ${data.trainer_name}`,
        gender: genForRow,
        trainer_id: data.trainer_id,
        source,
        model_id: source === 'claude_haiku' ? MODEL : null,
        input_tokens: inTok || null,
        output_tokens: outTok || null,
        generation_ms: Date.now() - t0,
        data_snapshot: data as unknown as Record<string, unknown>,
      }

      const { error: upErr } = await supabase
        .from('daily_letters')
        .upsert(payload, { onConflict: 'student_id,letter_date' })
      if (upErr) {
        tally.errors++
        continue
      }

      tally.generated_total++
      if (genForRow === 'male') tally.generated_male++
      else tally.generated_female++
      tally.input_tokens += inTok
      tally.output_tokens += outTok
    } catch {
      tally.errors++
    }
  }

  const durationMs = Date.now() - runStarted
  await supabase.from('daily_letters_runs').insert({
    run_date: runDate,
    finished_at: new Date().toISOString(),
    invoked_by: invokedBy,
    total_students: totalStudents,
    ...tally,
    notes: cappedNote ? { capped: cappedNote, duration_ms: durationMs } : { duration_ms: durationMs },
  })

  return json(200, {
    ok: true,
    run_date: runDate,
    invoked_by: invokedBy,
    duration_ms: durationMs,
    total_students: totalStudents,
    ...tally,
    male_pct: tally.generated_total ? Math.round((tally.generated_male / tally.generated_total) * 100) : 0,
    female_pct: tally.generated_total ? Math.round((tally.generated_female / tally.generated_total) * 100) : 0,
  })
})
