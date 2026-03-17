// Fluentia LMS — Auto Nudge Scheduler (Rule-Based Cron)
// Runs as a scheduled cron job to automatically generate and send smart nudges
// to all active students based on their activity patterns.
// Deploy: supabase functions deploy auto-nudge-scheduler --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Nudge type breakdown tracker ────────────────────────────────
interface NudgeBreakdown {
  streak_risk: number
  weekly_incomplete: number
  assignment_deadline: number
  inactive: number
  improvement: number
  milestone: number
}

// ─── XP Level Thresholds ─────────────────────────────────────────
const XP_LEVEL_THRESHOLDS = [
  { level: 2, xp: 500 },
  { level: 3, xp: 1000 },
  { level: 4, xp: 2000 },
  { level: 5, xp: 3500 },
  { level: 6, xp: 5000 },
  { level: 7, xp: 7500 },
  { level: 8, xp: 10000 },
  { level: 9, xp: 15000 },
  { level: 10, xp: 20000 },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ─── Auth: verify cron secret or service-role key ────────────
  const cronSecret = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('Authorization')
  const expectedSecret = Deno.env.get('CRON_SECRET')

  const hasValidCronSecret = expectedSecret && cronSecret === expectedSecret
  const hasServiceRoleAuth = authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '__none__')

  if (!hasValidCronSecret && !hasServiceRoleAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const dayOfWeek = now.getUTCDay() // 0=Sun ... 6=Sat

    // Current week start (Sunday)
    const weekStart = new Date(now)
    weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay())
    weekStart.setUTCHours(0, 0, 0, 0)

    const breakdown: NudgeBreakdown = {
      streak_risk: 0,
      weekly_incomplete: 0,
      assignment_deadline: 0,
      inactive: 0,
      improvement: 0,
      milestone: 0,
    }
    let totalNudges = 0

    // ─── 1. Fetch all active students ────────────────────────────
    const { data: students, error: studentsErr } = await supabase
      .from('students')
      .select('id, current_streak, xp_total, gamification_level, group_id, status')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (studentsErr) throw studentsErr
    if (!students?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          students_processed: 0,
          nudges_sent: 0,
          breakdown_by_type: breakdown,
          message: 'No active students found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── 2. Fetch existing nudges from last 24h for dedup ────────
    const { data: recentNudges } = await supabase
      .from('smart_nudges')
      .select('student_id, nudge_type')
      .gte('created_at', twentyFourHoursAgo)

    const recentNudgeSet = new Set(
      (recentNudges || []).map((n: any) => `${n.student_id}:${n.nudge_type}`)
    )

    function hasRecentNudge(studentId: string, nudgeType: string): boolean {
      return recentNudgeSet.has(`${studentId}:${nudgeType}`)
    }

    // ─── Helper: insert nudge + notification ─────────────────────
    async function createNudge(
      studentId: string,
      nudgeType: string,
      titleAr: string,
      messageAr: string,
      priority: string,
      actionUrl: string,
      metadata: Record<string, unknown>
    ): Promise<boolean> {
      if (hasRecentNudge(studentId, nudgeType)) return false

      // Insert into smart_nudges
      const { error: nudgeErr } = await supabase.from('smart_nudges').insert({
        student_id: studentId,
        nudge_type: nudgeType,
        title: titleAr,       // title field (EN fallback = AR for this cron)
        title_ar: titleAr,
        body: messageAr,      // body field (EN fallback = AR for this cron)
        body_ar: messageAr,
        priority,
        action_url: actionUrl,
        metadata,
        expires_at: fortyEightHoursFromNow,
      })

      if (nudgeErr) {
        console.error(`[auto-nudge-scheduler] Nudge insert error for ${studentId}:`, nudgeErr.message)
        return false
      }

      // Insert into notifications table
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: studentId,
        type: 'system',
        title: titleAr,
        body: messageAr,
        read: false,
        data: { nudge_type: nudgeType, action_url: actionUrl },
      })

      if (notifErr) {
        console.error(`[auto-nudge-scheduler] Notification insert error for ${studentId}:`, notifErr.message)
      }

      // Track for dedup within this run
      recentNudgeSet.add(`${studentId}:${nudgeType}`)
      return true
    }

    // ─── 3. Process each student ─────────────────────────────────
    for (const student of students) {
      const studentId = student.id

      try {
        // Fetch all needed data in parallel
        const [
          { data: profile },
          { data: weeklyTaskSets },
          { data: upcomingAssignments },
          { data: testSessions },
        ] = await Promise.all([
          // Profile for last_seen / updated_at
          supabase
            .from('profiles')
            .select('last_seen, updated_at')
            .eq('id', studentId)
            .single(),
          // Weekly task sets for current week
          supabase
            .from('weekly_task_sets')
            .select('id, completion_percentage, total_tasks, completed_tasks, status')
            .eq('student_id', studentId)
            .gte('week_start', weekStart.toISOString())
            .order('week_start', { ascending: false })
            .limit(1),
          // Upcoming assignments due within 24 hours for student's group
          supabase
            .from('assignments')
            .select('id, title, deadline, group_id')
            .eq('group_id', student.group_id)
            .gte('deadline', now.toISOString())
            .lte('deadline', twentyFourHoursFromNow)
            .order('deadline', { ascending: true }),
          // Last 2 completed test sessions for score comparison
          supabase
            .from('test_sessions')
            .select('id, overall_score, skill_scores, completed_at')
            .eq('student_id', studentId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(2),
        ])

        const lastSeen = profile?.last_seen || profile?.updated_at
        const lastSeenDate = lastSeen ? new Date(lastSeen) : null
        const hoursSinceActive = lastSeenDate
          ? (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
          : null

        // ─── Rule 1: streak_risk ─────────────────────────────
        // If streak > 3 days but no activity today
        if (
          student.current_streak >= 3 &&
          hoursSinceActive !== null &&
          hoursSinceActive >= 20 // ~no activity today (generous buffer)
        ) {
          const created = await createNudge(
            studentId,
            'streak_at_risk',
            'حافظ على السلسلة!',
            `لديك سلسلة ${student.current_streak} يوم متواصل — لا تخلّيها تنقطع! ادخل اليوم وأكمل أي نشاط للحفاظ عليها.`,
            'high',
            '/student',
            { streak: student.current_streak, hours_inactive: Math.round(hoursSinceActive) }
          )
          if (created) {
            totalNudges++
            breakdown.streak_risk++
          }
        }

        // ─── Rule 2: weekly_incomplete ───────────────────────
        // If Thursday (4) or later and weekly tasks < 80% done
        if (dayOfWeek >= 4) {
          const taskSet = weeklyTaskSets?.[0]
          const completionPct = taskSet?.completion_percentage ?? null

          if (taskSet && completionPct !== null && completionPct < 80) {
            const remaining = (taskSet.total_tasks || 8) - (taskSet.completed_tasks || 0)
            const created = await createNudge(
              studentId,
              'weekly_tasks_reminder',
              'أكمل مهامك الأسبوعية',
              `أكملت ${Math.round(completionPct)}% فقط من مهامك الأسبوعية — باقي ${remaining} مهام. الأسبوع يقارب على الانتهاء!`,
              dayOfWeek >= 5 ? 'high' : 'medium',
              '/student/weekly-tasks',
              { completion_percentage: completionPct, remaining_tasks: remaining, day_of_week: dayOfWeek }
            )
            if (created) {
              totalNudges++
              breakdown.weekly_incomplete++
            }
          }
        }

        // ─── Rule 3: assignment_deadline ─────────────────────
        // If assignment due within 24h and not submitted
        if (upcomingAssignments?.length) {
          for (const assignment of upcomingAssignments) {
            // Check if student already submitted
            const { data: existingSub } = await supabase
              .from('submissions')
              .select('id')
              .eq('assignment_id', assignment.id)
              .eq('student_id', studentId)
              .neq('status', 'draft')
              .limit(1)

            if (!existingSub?.length) {
              const hoursUntilDue = assignment.deadline
                ? Math.round((new Date(assignment.deadline).getTime() - now.getTime()) / (1000 * 60 * 60))
                : 0

              const created = await createNudge(
                studentId,
                'challenge_invite', // reusing existing nudge_type that fits the CHECK constraint
                'تذكير: موعد التسليم قريب!',
                `الواجب "${assignment.title}" موعد تسليمه بعد ${hoursUntilDue} ساعة — لا تنسى تسلّمه قبل الموعد!`,
                'high',
                '/student/assignments',
                { assignment_id: assignment.id, title: assignment.title, hours_until_due: hoursUntilDue }
              )
              if (created) {
                totalNudges++
                breakdown.assignment_deadline++
              }
              break // Only one assignment reminder per student per run
            }
          }
        }

        // ─── Rule 4: inactive ────────────────────────────────
        // If no activity for 3+ days
        if (hoursSinceActive !== null && hoursSinceActive >= 72) {
          const daysMissing = Math.round(hoursSinceActive / 24)
          const created = await createNudge(
            studentId,
            'inactive_warning',
            'نفتقدك!',
            `مرّت ${daysMissing} أيام من غيابك — نتمنى تكون بخير! ارجع وأكمل رحلتك التعليمية، كل يوم يفرق.`,
            'high',
            '/student',
            { days_inactive: daysMissing }
          )
          if (created) {
            totalNudges++
            breakdown.inactive++
          }
        }

        // ─── Rule 5: improvement ─────────────────────────────
        // If latest test score improved over previous
        if (testSessions && testSessions.length >= 2) {
          const latest = testSessions[0]
          const previous = testSessions[1]

          if (
            latest.overall_score != null &&
            previous.overall_score != null &&
            latest.overall_score > previous.overall_score
          ) {
            const improvement = Math.round(latest.overall_score - previous.overall_score)
            const created = await createNudge(
              studentId,
              'improvement_praise',
              'أحسنت! نتائجك تتحسّن!',
              `نتيجتك في آخر اختبار تحسّنت بـ ${improvement} نقطة مقارنة بالاختبار السابق. ما شاء الله، استمر على هذا المستوى!`,
              'medium',
              '/student/progress',
              {
                latest_score: latest.overall_score,
                previous_score: previous.overall_score,
                improvement,
                test_id: latest.id,
              }
            )
            if (created) {
              totalNudges++
              breakdown.improvement++
            }
          }
        }

        // ─── Rule 6: milestone (XP near next level) ─────────
        const totalXp = student.xp_total || 0
        const currentLevel = student.gamification_level || 1

        // Find next level threshold
        const nextLevelInfo = XP_LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1)
        if (nextLevelInfo) {
          const xpNeeded = nextLevelInfo.xp - totalXp
          const xpRange = nextLevelInfo.xp - (XP_LEVEL_THRESHOLDS.find((t) => t.level === currentLevel)?.xp || 0)
          const progressPct = xpRange > 0 ? ((xpRange - xpNeeded) / xpRange) * 100 : 0

          // If within 15% of next level (i.e., 85%+ progress)
          if (xpNeeded > 0 && progressPct >= 85) {
            const created = await createNudge(
              studentId,
              'milestone_celebration',
              'أنت قريب من المستوى التالي!',
              `باقي ${xpNeeded} نقطة خبرة فقط للوصول للمستوى ${nextLevelInfo.level} — أكمل بعض الأنشطة اليوم وحقّق الإنجاز!`,
              'medium',
              '/student/progress',
              {
                current_xp: totalXp,
                next_level: nextLevelInfo.level,
                xp_needed: xpNeeded,
                progress_pct: Math.round(progressPct),
              }
            )
            if (created) {
              totalNudges++
              breakdown.milestone++
            }
          }
        }
      } catch (studentErr: any) {
        console.error(`[auto-nudge-scheduler] Error processing student ${studentId}:`, studentErr.message)
      }
    }

    // ─── 4. Return summary ───────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        students_processed: students.length,
        nudges_sent: totalNudges,
        breakdown_by_type: breakdown,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[auto-nudge-scheduler] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
