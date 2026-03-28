// Fluentia LMS — Generate Daily Report
// Aggregates all platform metrics for the past 24 hours into daily_reports table
// Can be triggered by pg_cron (automated) or manually via API call
// Deploy: supabase functions deploy generate-daily-report --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startMs = Date.now()

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // Determine which date to report on
    let body: any = {}
    try { body = await req.json() } catch { /* empty body is fine for cron */ }

    // Default: yesterday (for cron running at midnight)
    // Can override with ?date=2026-03-27 or body.date
    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date') || body.date
    const reportDate = dateParam || new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const dayStart = `${reportDate}T00:00:00Z`
    const dayEnd = `${reportDate}T23:59:59.999Z`

    console.log(`📊 Generating daily report for ${reportDate}`)

    // ── Parallel data fetching ──────────────────────────────────────────

    const [
      studentsRes,
      newStudentsRes,
      sessionsRes,
      xpRes,
      submissionsRes,
      submissionsGradedRes,
      attendanceRes,
      classesRes,
      paymentsRes,
      overdueRes,
      achievementsRes,
      streakRes,
      curriculumProgressRes,
    ] = await Promise.all([
      // Total students
      supabase.from('students')
        .select('id, status, group_id, last_active_at, profiles(display_name, full_name)')
        .is('deleted_at', null),

      // New students today
      supabase.from('students')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .is('deleted_at', null),

      // Sessions today
      supabase.from('user_sessions')
        .select('id, user_id, duration_minutes, started_at')
        .gte('started_at', dayStart)
        .lte('started_at', dayEnd),

      // XP earned today
      supabase.from('xp_transactions')
        .select('student_id, amount')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd),

      // Submissions today
      supabase.from('submissions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .is('deleted_at', null),

      // Graded submissions today
      supabase.from('submissions')
        .select('id', { count: 'exact', head: true })
        .gte('graded_at', dayStart)
        .lte('graded_at', dayEnd)
        .eq('status', 'graded')
        .is('deleted_at', null),

      // Attendance today
      supabase.from('attendance')
        .select('id, student_id, status', { count: 'exact' })
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd),

      // Classes today
      supabase.from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('date', reportDate),

      // Payments received today
      supabase.from('payments')
        .select('id, amount')
        .eq('status', 'paid')
        .gte('paid_at', dayStart)
        .lte('paid_at', dayEnd)
        .is('deleted_at', null),

      // Overdue payments
      supabase.from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'overdue')
        .is('deleted_at', null),

      // Achievements earned today
      supabase.from('student_achievements')
        .select('id', { count: 'exact', head: true })
        .gte('earned_at', dayStart)
        .lte('earned_at', dayEnd),

      // Students with active streaks
      supabase.from('students')
        .select('id', { count: 'exact', head: true })
        .gt('current_streak', 0)
        .is('deleted_at', null),

      // Curriculum progress changes today
      supabase.from('student_curriculum_progress')
        .select('id, status')
        .gte('updated_at', dayStart)
        .lte('updated_at', dayEnd),
    ])

    // ── Compute metrics ─────────────────────────────────────────────────

    const allStudents = studentsRes.data || []
    const sessions = sessionsRes.data || []
    const xpTxns = xpRes.data || []
    const payments = paymentsRes.data || []
    const progressChanges = curriculumProgressRes.data || []

    // Active students: those who had a session today
    const activeStudentIds = new Set(sessions.map((s: any) => s.user_id))

    // Total XP earned
    const totalXp = xpTxns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

    // Revenue
    const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

    // Session stats
    const totalSessionMinutes = sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0)
    const avgSessionMinutes = sessions.length > 0 ? totalSessionMinutes / sessions.length : 0

    // Curriculum
    const unitsCompleted = progressChanges.filter((p: any) => p.status === 'completed').length

    // Per-student activity breakdown (top 50 most active)
    const studentActivityMap: Record<string, any> = {}
    for (const txn of xpTxns) {
      if (!studentActivityMap[txn.student_id]) {
        studentActivityMap[txn.student_id] = { xp: 0, sessions: 0 }
      }
      studentActivityMap[txn.student_id].xp += txn.amount || 0
    }
    for (const s of sessions) {
      if (!studentActivityMap[s.user_id]) {
        studentActivityMap[s.user_id] = { xp: 0, sessions: 0 }
      }
      studentActivityMap[s.user_id].sessions += 1
    }

    const studentDetails = Object.entries(studentActivityMap)
      .map(([id, data]: [string, any]) => {
        const student = allStudents.find((s: any) => s.id === id)
        const name = student?.profiles?.display_name || student?.profiles?.full_name || 'Unknown'
        return { id, name, xp: data.xp, sessions: data.sessions }
      })
      .sort((a: any, b: any) => b.xp - a.xp)
      .slice(0, 50)

    // Hourly activity distribution
    const hourlyActivity: number[] = new Array(24).fill(0)
    for (const s of sessions) {
      const hour = new Date(s.started_at).getUTCHours()
      hourlyActivity[hour]++
    }

    // Group breakdown
    const groupMap: Record<string, { students: number; active: number; xp: number }> = {}
    for (const student of allStudents) {
      const gid = student.group_id || 'ungrouped'
      if (!groupMap[gid]) groupMap[gid] = { students: 0, active: 0, xp: 0 }
      groupMap[gid].students++
      if (activeStudentIds.has(student.id)) groupMap[gid].active++
    }
    for (const txn of xpTxns) {
      const student = allStudents.find((s: any) => s.id === txn.student_id)
      const gid = student?.group_id || 'ungrouped'
      if (groupMap[gid]) groupMap[gid].xp += txn.amount || 0
    }
    const groupDetails = Object.entries(groupMap).map(([id, data]) => ({ id, ...data }))

    // ── Build report ────────────────────────────────────────────────────

    const report = {
      report_date: reportDate,
      total_students: allStudents.filter((s: any) => s.status === 'active').length,
      active_students: activeStudentIds.size,
      new_students: newStudentsRes.count || 0,
      total_sessions: sessions.length,
      total_page_views: 0, // would need page_visits table query
      avg_session_minutes: Math.round(avgSessionMinutes * 10) / 10,
      xp_earned: totalXp,
      submissions_count: submissionsRes.count || 0,
      submissions_graded: submissionsGradedRes.count || 0,
      attendance_count: attendanceRes.count || 0,
      classes_held: classesRes.count || 0,
      readings_completed: 0,
      units_completed: unitsCompleted,
      vocab_practiced: 0,
      payments_received: payments.length,
      revenue_amount: totalRevenue,
      payments_overdue: overdueRes.count || 0,
      students_with_streak: streakRes.count || 0,
      achievements_earned: achievementsRes.count || 0,
      student_details: studentDetails,
      group_details: groupDetails,
      hourly_activity: hourlyActivity,
      generated_at: new Date().toISOString(),
      generation_ms: Date.now() - startMs,
    }

    // ── Upsert into daily_reports ────────────────────────────────────────

    const { error: upsertErr } = await supabase
      .from('daily_reports')
      .upsert(report, { onConflict: 'report_date' })

    if (upsertErr) {
      console.error('❌ Failed to save report:', upsertErr.message)
      return new Response(
        JSON.stringify({ error: 'Failed to save report', details: upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const elapsed = Date.now() - startMs
    console.log(`✅ Daily report for ${reportDate} generated in ${elapsed}ms`)

    return new Response(
      JSON.stringify({ success: true, report_date: reportDate, elapsed_ms: elapsed, metrics: report }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('❌ Fatal error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
