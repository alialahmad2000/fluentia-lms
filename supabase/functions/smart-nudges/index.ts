// Fluentia LMS — Smart Nudges (Rule-Based)
// Analyzes student behavior and generates personalized nudges
// Triggered by cron job (POST, service role key auth)
// Deploy: supabase functions deploy smart-nudges --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Study Tips (rotated by student index) ──────────────────────
const STUDY_TIPS: { title_ar: string; body_ar: string }[] = [
  {
    title_ar: 'نصيحة: التكرار المتباعد',
    body_ar: 'راجع الكلمات الجديدة بعد يوم، ثم بعد 3 أيام، ثم بعد أسبوع — هذه الطريقة تثبّت المعلومات في الذاكرة طويلة المدى.',
  },
  {
    title_ar: 'نصيحة: تحدّث بصوت عالٍ',
    body_ar: 'اقرأ الجمل الإنجليزية بصوت مسموع كل يوم ولو لمدة 5 دقائق — السمع والنطق معاً يعزّزان التعلّم.',
  },
  {
    title_ar: 'نصيحة: اكتب يومياً',
    body_ar: 'اكتب 3 جمل يومياً عن يومك بالإنجليزية — الكتابة المنتظمة تطوّر مهاراتك بشكل ملحوظ.',
  },
  {
    title_ar: 'نصيحة: استمع بانتظام',
    body_ar: 'استمع لبودكاست أو أغنية إنجليزية يومياً — حتى لو لم تفهم كل شيء، أذنك تتعوّد على الأصوات.',
  },
  {
    title_ar: 'نصيحة: لا تخف من الأخطاء',
    body_ar: 'الأخطاء جزء طبيعي من التعلّم — كل خطأ هو فرصة لتتعلم شيئاً جديداً. استمر ولا تتردد!',
  },
  {
    title_ar: 'نصيحة: تعلّم بالسياق',
    body_ar: 'بدل حفظ كلمات منفردة، تعلّمها في جمل كاملة — السياق يساعدك على تذكّر المعنى والاستخدام.',
  },
  {
    title_ar: 'نصيحة: حدّد وقتاً ثابتاً',
    body_ar: 'خصّص 15-20 دقيقة يومياً في نفس الوقت للتعلّم — الانتظام أهم من المدة.',
  },
  {
    title_ar: 'نصيحة: استخدم التطبيق يومياً',
    body_ar: 'حتى لو كان لديك وقت قصير، افتح التطبيق وأكمل مهمة واحدة — الاستمرارية هي مفتاح النجاح.',
  },
  {
    title_ar: 'نصيحة: تابع تقدّمك',
    body_ar: 'راجع تقارير مهاراتك أسبوعياً — رؤية تقدّمك تحفّزك على الاستمرار والتحسّن.',
  },
  {
    title_ar: 'نصيحة: تعلّم مع صديق',
    body_ar: 'شارك زميلك في المجموعة وتدرّبوا معاً — التعلّم الجماعي ممتع وأكثر فعالية.',
  },
]

// ─── XP Milestones ──────────────────────────────────────────────
const XP_MILESTONES = [1000, 2000, 5000, 10000]

// ─── Nudge Definitions ─────────────────────────────────────────
interface NudgeData {
  nudge_type: string
  title: string
  title_ar: string
  body: string
  body_ar: string
  priority: 'low' | 'medium' | 'high'
  action_url: string
  metadata: Record<string, unknown>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth: require service-role key
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
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
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat

    // Current week start (Sunday)
    const weekStart = new Date(now)
    weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay())
    weekStart.setUTCHours(0, 0, 0, 0)

    const results: string[] = []
    let totalNudges = 0

    // ─── 1. Fetch all active students ──────────────────────
    const { data: students, error: studentsErr } = await supabase
      .from('students')
      .select('id, current_streak, academic_level, status, total_xp')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (studentsErr) throw studentsErr
    if (!students?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No active students', nudges_created: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    results.push(`Found ${students.length} active students`)

    // ─── 2. Fetch existing nudges from last 24h (dedup) ────
    const { data: recentNudges } = await supabase
      .from('smart_nudges')
      .select('student_id, nudge_type')
      .gte('created_at', twentyFourHoursAgo)

    const recentNudgeSet = new Set(
      (recentNudges || []).map((n: any) => `${n.student_id}:${n.nudge_type}`)
    )

    // Helper: check if nudge already exists
    function hasRecentNudge(studentId: string, nudgeType: string): boolean {
      return recentNudgeSet.has(`${studentId}:${nudgeType}`)
    }

    // Helper: insert nudge + notification
    async function createNudge(studentId: string, nudge: NudgeData) {
      if (hasRecentNudge(studentId, nudge.nudge_type)) return false

      // Insert into smart_nudges
      const { error: nudgeErr } = await supabase.from('smart_nudges').insert({
        student_id: studentId,
        nudge_type: nudge.nudge_type,
        title: nudge.title,
        title_ar: nudge.title_ar,
        body: nudge.body,
        body_ar: nudge.body_ar,
        priority: nudge.priority,
        action_url: nudge.action_url,
        metadata: nudge.metadata,
        expires_at: fortyEightHoursFromNow,
      })

      if (nudgeErr) {
        console.error(`[smart-nudges] Nudge insert error for ${studentId}:`, nudgeErr.message)
        return false
      }

      // Insert into notifications for immediate visibility
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: studentId,
        type: 'system',
        title: nudge.title_ar,
        body: nudge.body_ar,
        read: false,
      })

      if (notifErr) {
        console.error(`[smart-nudges] Notification insert error for ${studentId}:`, notifErr.message)
      }

      // Track for dedup within this run
      recentNudgeSet.add(`${studentId}:${nudge.nudge_type}`)
      return true
    }

    // ─── 3. Process each student ───────────────────────────
    for (let idx = 0; idx < students.length; idx++) {
      const student = students[idx]
      const studentId = student.id

      try {
        // Fetch all needed data in parallel
        const [
          { data: profile },
          { data: weeklyTaskSets },
          { data: recentXp },
          { data: skillSnapshots },
        ] = await Promise.all([
          // Profile for last_seen
          supabase
            .from('profiles')
            .select('last_seen, updated_at')
            .eq('id', studentId)
            .single(),
          // Weekly task sets for current week
          supabase
            .from('weekly_task_sets')
            .select('id, completion_percentage, status')
            .eq('student_id', studentId)
            .gte('week_start', weekStart.toISOString())
            .order('week_start', { ascending: false })
            .limit(1),
          // Recent XP transactions (last 7 days)
          supabase
            .from('xp_transactions')
            .select('amount, created_at')
            .eq('student_id', studentId)
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false }),
          // Skill snapshots (last 2 most recent)
          supabase
            .from('skill_snapshots')
            .select('snapshot_date, grammar, vocabulary, speaking, listening, reading, writing')
            .eq('student_id', studentId)
            .order('snapshot_date', { ascending: false })
            .limit(2),
        ])

        const lastSeen = profile?.last_seen || profile?.updated_at
        const lastSeenDate = lastSeen ? new Date(lastSeen) : null
        const hoursSinceActive = lastSeenDate
          ? (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
          : null

        // ─── Check: streak_at_risk ───────────────────────
        if (
          student.current_streak >= 3 &&
          hoursSinceActive !== null &&
          hoursSinceActive >= 24
        ) {
          const created = await createNudge(studentId, {
            nudge_type: 'streak_at_risk',
            title: 'Your streak is at risk!',
            title_ar: 'سلسلتك في خطر!',
            body: `You have a ${student.current_streak}-day streak. Don't let it break!`,
            body_ar: `لديك سلسلة ${student.current_streak} يوم متواصل — لا تخلّيها تضيع! ادخل اليوم وأكمل أي نشاط للحفاظ عليها.`,
            priority: 'high',
            action_url: '/student',
            metadata: { streak: student.current_streak, hours_inactive: Math.round(hoursSinceActive) },
          })
          if (created) totalNudges++
        }

        // ─── Check: weekly_tasks_reminder ────────────────
        // Wednesday (3) or later, and less than 50% completion
        if (dayOfWeek >= 3) {
          const taskSet = weeklyTaskSets?.[0]
          const completionPct = taskSet?.completion_percentage ?? null

          if (taskSet && completionPct !== null && completionPct < 50) {
            const created = await createNudge(studentId, {
              nudge_type: 'weekly_tasks_reminder',
              title: 'Weekly tasks need attention',
              title_ar: 'مهامك الأسبوعية بانتظارك',
              body: `You've completed ${completionPct}% of your weekly tasks. The week is almost over!`,
              body_ar: `أكملت ${completionPct}% فقط من مهامك الأسبوعية — الأسبوع يقارب على الانتهاء! خلّنا نكمّلها معاً.`,
              priority: dayOfWeek >= 5 ? 'high' : 'medium',
              action_url: '/student/weekly-tasks',
              metadata: { completion_percentage: completionPct, day_of_week: dayOfWeek },
            })
            if (created) totalNudges++
          }
        }

        // ─── Check: improvement_praise ───────────────────
        if (skillSnapshots && skillSnapshots.length >= 2) {
          const latest = skillSnapshots[0]
          const previous = skillSnapshots[1]
          const skills = ['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing'] as const
          const skillNamesAr: Record<string, string> = {
            grammar: 'القواعد',
            vocabulary: 'المفردات',
            speaking: 'المحادثة',
            listening: 'الاستماع',
            reading: 'القراءة',
            writing: 'الكتابة',
          }

          for (const skill of skills) {
            const latestScore = latest[skill]
            const previousScore = previous[skill]
            if (latestScore != null && previousScore != null && latestScore - previousScore >= 5) {
              const created = await createNudge(studentId, {
                nudge_type: 'improvement_praise',
                title: `Great improvement in ${skill}!`,
                title_ar: `تحسّن رائع في ${skillNamesAr[skill]}!`,
                body: `Your ${skill} score improved by ${latestScore - previousScore} points!`,
                body_ar: `ما شاء الله! نتيجتك في ${skillNamesAr[skill]} تحسّنت بـ ${latestScore - previousScore} نقطة. استمر على هذا المستوى الممتاز!`,
                priority: 'medium',
                action_url: '/student/progress',
                metadata: { skill, previous_score: previousScore, new_score: latestScore, improvement: latestScore - previousScore },
              })
              if (created) totalNudges++
              break // Only one praise nudge per student per run
            }
          }
        }

        // ─── Check: skill_gap ────────────────────────────
        if (skillSnapshots && skillSnapshots.length >= 1) {
          const latest = skillSnapshots[0]
          const skills = ['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing'] as const
          const skillNamesAr: Record<string, string> = {
            grammar: 'القواعد',
            vocabulary: 'المفردات',
            speaking: 'المحادثة',
            listening: 'الاستماع',
            reading: 'القراءة',
            writing: 'الكتابة',
          }

          const scores = skills.map(s => ({ skill: s, score: latest[s] as number | null })).filter(s => s.score != null) as { skill: string; score: number }[]

          if (scores.length >= 3) {
            for (const entry of scores) {
              const others = scores.filter(s => s.skill !== entry.skill)
              const othersAvg = others.reduce((sum, s) => sum + s.score, 0) / others.length

              if (othersAvg - entry.score >= 20) {
                const created = await createNudge(studentId, {
                  nudge_type: 'skill_gap',
                  title: `Focus area: ${entry.skill}`,
                  title_ar: `مهارة تحتاج تركيز: ${skillNamesAr[entry.skill]}`,
                  body: `Your ${entry.skill} score is ${Math.round(othersAvg - entry.score)} points below your average.`,
                  body_ar: `مهارة ${skillNamesAr[entry.skill]} تحتاج شوية اهتمام — ركّز عليها هالأسبوع وراح تلاحظ فرق كبير بإذن الله!`,
                  priority: 'medium',
                  action_url: '/student/progress',
                  metadata: { weak_skill: entry.skill, score: entry.score, others_avg: Math.round(othersAvg), gap: Math.round(othersAvg - entry.score) },
                })
                if (created) totalNudges++
                break // Only one skill gap nudge per student per run
              }
            }
          }
        }

        // ─── Check: inactive_warning ─────────────────────
        if (hoursSinceActive !== null && hoursSinceActive >= 72) {
          const daysMissing = Math.round(hoursSinceActive / 24)
          const created = await createNudge(studentId, {
            nudge_type: 'inactive_warning',
            title: 'We miss you!',
            title_ar: 'وحشتنا!',
            body: `You haven't logged in for ${daysMissing} days. Come back and continue learning!`,
            body_ar: `مرّت ${daysMissing} أيام من غيابك — نتمنى تكون بخير! ارجع وأكمل رحلتك، كل يوم يفرق.`,
            priority: 'high',
            action_url: '/student',
            metadata: { days_inactive: daysMissing },
          })
          if (created) totalNudges++
        }

        // ─── Check: milestone_celebration ────────────────
        const totalXp = student.total_xp || 0
        for (const milestone of XP_MILESTONES) {
          // Check if student just crossed this milestone (within last 7 days of XP)
          const recentXpTotal = (recentXp || []).reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0)
          const xpBeforeRecent = totalXp - recentXpTotal

          if (xpBeforeRecent < milestone && totalXp >= milestone) {
            const milestoneLabel = milestone >= 1000 ? `${milestone / 1000}K` : `${milestone}`
            const created = await createNudge(studentId, {
              nudge_type: 'milestone_celebration',
              title: `Milestone reached: ${milestoneLabel} XP!`,
              title_ar: `إنجاز جديد: ${milestoneLabel} نقطة خبرة!`,
              body: `Congratulations! You've earned ${milestone} XP!`,
              body_ar: `مبروك عليك! وصلت لـ ${milestone.toLocaleString()} نقطة خبرة — إنجاز يستاهل الاحتفال! واصل تألّقك.`,
              priority: 'low',
              action_url: '/student/progress',
              metadata: { milestone, total_xp: totalXp },
            })
            if (created) totalNudges++
            break // Only the highest milestone
          }
        }

        // ─── Check: level_up_ready ───────────────────────
        if (skillSnapshots && skillSnapshots.length >= 1) {
          const latest = skillSnapshots[0]
          const skills = ['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing'] as const
          const scores = skills.map(s => latest[s] as number | null).filter(s => s != null) as number[]

          if (scores.length >= 4) {
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
            // If average skill score is 80+ they may be ready to level up
            if (avgScore >= 80) {
              const created = await createNudge(studentId, {
                nudge_type: 'level_up_ready',
                title: 'You might be ready for the next level!',
                title_ar: 'قد تكون جاهز للمستوى التالي!',
                body: `Your average skill score is ${Math.round(avgScore)}. Consider taking a level assessment!`,
                body_ar: `معدّل مهاراتك وصل ${Math.round(avgScore)} نقطة — يبدو إنك جاهز للمستوى التالي! تواصل مع مدرّبك لتقييم مستواك.`,
                priority: 'medium',
                action_url: '/student/progress',
                metadata: { average_score: Math.round(avgScore), academic_level: student.academic_level },
              })
              if (created) totalNudges++
            }
          }
        }

        // ─── Check: study_tip ────────────────────────────
        // Send a study tip to students who have been active (seen in last 48h)
        // and haven't received a tip in 24h. Use student index to rotate tips.
        if (hoursSinceActive !== null && hoursSinceActive < 48) {
          const tip = STUDY_TIPS[idx % STUDY_TIPS.length]
          const created = await createNudge(studentId, {
            nudge_type: 'study_tip',
            title: 'Study tip',
            title_ar: tip.title_ar,
            body: 'Here is a helpful study tip for you.',
            body_ar: tip.body_ar,
            priority: 'low',
            action_url: '/student',
            metadata: { tip_index: idx % STUDY_TIPS.length },
          })
          if (created) totalNudges++
        }
      } catch (studentErr: any) {
        console.error(`[smart-nudges] Error processing student ${studentId}:`, studentErr.message)
        results.push(`Error for ${studentId}: ${studentErr.message}`)
      }
    }

    results.push(`Total nudges created: ${totalNudges}`)

    return new Response(
      JSON.stringify({ success: true, students_processed: students.length, nudges_created: totalNudges, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[smart-nudges] Error:', error)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
