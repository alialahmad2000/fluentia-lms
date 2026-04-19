// Fluentia LMS — Trainer Signals Engine
// Detects 6 student signal types and writes to student_interventions (idempotent via UNIQUE).
// Called by pg_cron every 4h and by manual /refresh button on Interventions page.
// Deploy: supabase functions deploy detect-student-signals --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface Signal {
  student_id: string
  trainer_id: string
  group_id: string | null
  severity: 'urgent' | 'attention' | 'celebrate'
  reason_code: string
  reason_ar: string
  signal_data: Record<string, unknown>
  suggested_action_ar: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Load active students with group trainer context + profile name for reason strings
    const { data: students, error: sErr } = await supabase
      .from('students')
      .select(`
        id, xp_total, current_streak, group_id, last_active_at, enrollment_date,
        profile:profiles!inner(full_name),
        group:groups!inner(id, name, trainer_id)
      `)
      .eq('status', 'active')
      .is('deleted_at', null)

    if (sErr) throw new Error(`students query: ${sErr.message}`)

    if (!students?.length) {
      return new Response(JSON.stringify({ ok: true, signals_created: 0, reason: 'no_students' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const now = Date.now()
    const signals: Signal[] = []

    for (const s of students) {
      const profile = (s as any).profile
      const group = (s as any).group
      const trainerId = group?.trainer_id
      if (!trainerId) continue

      const fullName: string = profile?.full_name || 'الطالب'
      const isFem = fullName.split(' ').some(w => w.endsWith('ة') || w.endsWith('ى'))
      const lastActiveRaw = s.last_active_at ? new Date(s.last_active_at).getTime() : null
      const hoursIdle = lastActiveRaw ? (now - lastActiveRaw) / 3600000 : 9999

      const base: Omit<Signal, 'severity' | 'reason_code' | 'reason_ar' | 'signal_data' | 'suggested_action_ar'> = {
        student_id: s.id,
        trainer_id: trainerId,
        group_id: s.group_id,
      }

      // ── SIGNAL 0: Never logged in ──────────────────────────────
      if (!lastActiveRaw) {
        signals.push({
          ...base,
          severity: 'urgent',
          reason_code: 'never_logged_in',
          reason_ar: `${fullName} لم ${isFem ? 'تدخل' : 'يدخل'} المنصة بعد`,
          signal_data: { enrollment_date: (s as any).enrollment_date || null },
          suggested_action_ar: 'ابعث تعليمات الدخول + رقم ٠٠٠٠٠٠ للواتساب',
        })
        continue // skip remaining signals for this student
      }

      // ── SIGNAL 1: Silent 48h–7d ────────────────────────────────
      if (hoursIdle >= 48 && hoursIdle < 168) {
        signals.push({
          ...base,
          severity: 'urgent',
          reason_code: 'silent_48h',
          reason_ar: `${isFem ? 'صامتة' : 'صامت'} منذ ${Math.floor(hoursIdle)} ساعة`,
          signal_data: { hours_idle: Math.floor(hoursIdle), last_active_at: s.last_active_at },
          suggested_action_ar: 'ابعث رسالة ودية للاطمئنان',
        })
      }

      // ── SIGNAL 2: Silent >7 days ───────────────────────────────
      if (hoursIdle >= 168) {
        signals.push({
          ...base,
          severity: 'urgent',
          reason_code: 'silent_7d',
          reason_ar: `${isFem ? 'غائبة' : 'غائب'} أكثر من أسبوع`,
          signal_data: { hours_idle: Math.floor(hoursIdle), last_active_at: s.last_active_at },
          suggested_action_ar: 'اتصل مباشرة — قد يكون في موقف يستدعي الدعم',
        })
      }

      // ── SIGNAL 3: Streak at risk ───────────────────────────────
      if ((s.current_streak || 0) >= 3 && hoursIdle >= 18 && hoursIdle < 24) {
        signals.push({
          ...base,
          severity: 'attention',
          reason_code: 'streak_at_risk',
          reason_ar: `streak ${s.current_streak} يوم على وشك الانكسار`,
          signal_data: {
            streak: s.current_streak,
            hours_remaining: Math.max(0, Math.round(24 - hoursIdle)),
          },
          suggested_action_ar: 'ابعث تذكير خفيف — دقيقتان تكفيان',
        })
      }

      // ── SIGNAL 4: Near milestone (celebrate) ──────────────────
      const milestones = [500, 1000, 2500, 5000, 10000]
      for (const t of milestones) {
        if ((s.xp_total || 0) >= t - 30 && (s.xp_total || 0) <= t + 20) {
          signals.push({
            ...base,
            severity: 'celebrate',
            reason_code: `milestone_${t}`,
            reason_ar: `${fullName} ${isFem ? 'قريبة' : 'قريب'} من ${t.toLocaleString('ar')} XP`,
            signal_data: { current: s.xp_total, target: t, remaining: t - (s.xp_total || 0) },
            suggested_action_ar: 'شجعه بذكر هذا الإنجاز القريب',
          })
          break
        }
      }
    }

    // ── SIGNAL 5: Stuck on same unit >14 days ─────────────────────
    const since14 = new Date(now - 14 * 24 * 3600000).toISOString()
    const { data: stuckRows } = await supabase
      .from('student_curriculum_progress')
      .select('student_id, unit_id, updated_at')
      .neq('status', 'completed')
      .lt('updated_at', since14)

    const stuckByStudent = new Map<string, number>()
    stuckRows?.forEach((r) => {
      stuckByStudent.set(r.student_id, (stuckByStudent.get(r.student_id) || 0) + 1)
    })

    for (const [studentId, stuckCount] of stuckByStudent.entries()) {
      const student = students.find((s) => s.id === studentId)
      if (!student) continue
      const profile = (student as any).profile
      const group = (student as any).group
      const fullName: string = profile?.full_name || 'الطالب'
      const isFem = fullName.split(' ').some(w => w.endsWith('ة') || w.endsWith('ى'))
      signals.push({
        student_id: studentId,
        trainer_id: group.trainer_id,
        group_id: student.group_id,
        severity: 'attention',
        reason_code: 'stuck_on_unit',
        reason_ar: `${isFem ? 'متعثرة' : 'متعثر'} على نفس النقطة منذ أسبوعين+`,
        signal_data: { stuck_units: stuckCount },
        suggested_action_ar: 'راجع معه/معها الصعوبات في الكلاس القادم',
      })
    }

    // ── INSERT (idempotent via UNIQUE student_id + reason_code + day_of) ──
    let created = 0
    let skipped = 0

    for (const sig of signals) {
      const { error } = await supabase
        .from('student_interventions')
        .insert({
          student_id: sig.student_id,
          trainer_id: sig.trainer_id,
          group_id: sig.group_id,
          severity: sig.severity,
          reason_code: sig.reason_code,
          reason_ar: sig.reason_ar,
          signal_data: sig.signal_data,
          suggested_action_ar: sig.suggested_action_ar,
          generated_by: 'signals_engine_v1',
        })

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          skipped++
        } else {
          console.error('Insert error:', error.message, JSON.stringify(sig))
        }
      } else {
        created++
      }
    }

    // Cleanup: unsnooze expired + expire stale
    const { data: unsnoozed } = await supabase.rpc('unsnooze_expired_interventions')
    const { data: expired } = await supabase.rpc('expire_stale_interventions', { p_days: 7 })

    return new Response(JSON.stringify({
      ok: true,
      students_scanned: students.length,
      signals_evaluated: signals.length,
      signals_created: created,
      signals_skipped_duplicate: skipped,
      unsnoozed: unsnoozed || 0,
      expired: expired || 0,
      ran_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Signals engine error:', e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
