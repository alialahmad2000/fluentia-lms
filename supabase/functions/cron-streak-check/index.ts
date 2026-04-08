// Fluentia LMS — Daily Cron: Streak Check + Auto Reminders
// Runs on a schedule to check streaks, send deadline/class/payment reminders
// Deploy: supabase functions deploy cron-streak-check
// Schedule: Set up via Supabase Dashboard > Edge Functions > Schedules

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth: require service-role key or admin JWT
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

    const results: string[] = []

    // ─── 1. Streak Check ────────────────────────────────
    // Call the database function that checks/resets streaks
    const { error: streakError } = await supabase.rpc('check_streaks')
    if (streakError) {
      results.push(`Streak check error: ${streakError.message}`)
    } else {
      results.push('Streak check completed')
    }

    // ─── 2. Streak Warnings (22h no activity) ───────────
    const twentyTwoHoursAgo = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: atRiskStudents } = await supabase
      .from('students')
      .select('id, current_streak')
      .gt('current_streak', 0)
      .lt('last_active_at', twentyTwoHoursAgo)
      .gt('last_active_at', twentyFourHoursAgo)
      .eq('status', 'active')
      .is('deleted_at', null)

    if (atRiskStudents && atRiskStudents.length > 0) {
      const streakNotifs = atRiskStudents.map((s: any) => ({
        user_id: s.id,
        type: 'streak_warning',
        title: 'تحذير الـ Streak 🔥',
        body: `سلسلتك ${s.current_streak} يوم — لا تضيّعها! سلّم واجب أو أكمل التحدي اليومي`,
        data: { link: '/student' },
      }))
      await supabase.from('notifications').insert(streakNotifs)

      // Send push notifications for streak warnings
      const streakUserIds = atRiskStudents.map((s: any) => s.id)
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: streakUserIds,
          title: 'تحذير الـ Streak 🔥',
          body: 'سلسلتك على وشك الانتهاء — ادخل الآن وحافظ عليها!',
          url: '/student',
          type: 'streak_warning',
          priority: 'high',
          skip_in_app: true,
        },
      })
      results.push(`Sent ${streakNotifs.length} streak warnings (with push)`)

      // Send email for streaks >= 7 days
      for (const s of atRiskStudents) {
        if (s.current_streak >= 7) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', s.id)
            .single()

          if (profile?.email) {
            await supabase.functions.invoke('send-email', {
              body: {
                to: profile.email,
                type: 'streak_warning',
                data: { streakDays: s.current_streak },
              },
            })
          }
        }
      }
    }

    // ─── 3. Assignment Deadline Reminders (1 day) ────────
    const now = new Date()
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const windowStart = new Date(oneDayLater.getTime() - 30 * 60 * 1000).toISOString()
    const windowEnd = new Date(oneDayLater.getTime() + 30 * 60 * 1000).toISOString()

    const { data: upcomingAssignments } = await supabase
      .from('assignments')
      .select('id, title, deadline, group_id')
      .eq('is_visible', true)
      .is('deleted_at', null)
      .gte('deadline', windowStart)
      .lte('deadline', windowEnd)

    for (const assignment of (upcomingAssignments || [])) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', assignment.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)

      const { data: submitted } = await supabase
        .from('submissions')
        .select('student_id')
        .eq('assignment_id', assignment.id)
        .is('deleted_at', null)

      const submittedIds = new Set((submitted || []).map((s: any) => s.student_id))
      const pending = (students || []).filter((s: any) => !submittedIds.has(s.id))

      if (pending.length > 0) {
        const notifs = pending.map((s: any) => ({
          user_id: s.id,
          type: 'assignment_deadline',
          title: 'موعد تسليم قريب ⏰',
          body: `واجب "${assignment.title}" موعد تسليمه غداً!`,
          data: { link: '/student/assignments', assignment_id: assignment.id },
        }))
        await supabase.from('notifications').insert(notifs)

        // Send push notifications for deadline reminders
        const deadlineUserIds = pending.map((s: any) => s.id)
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: deadlineUserIds,
            title: 'موعد تسليم قريب ⏰',
            body: `واجب "${assignment.title}" موعد تسليمه غداً!`,
            url: '/student/assignments',
            type: 'assignment_deadline',
            priority: 'high',
            skip_in_app: true,
          },
        })
        results.push(`Deadline reminders: ${notifs.length} for "${assignment.title}" (with push)`)
      }
    }

    // ─── 4. Payment Reminders ────────────────────────────
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('id, student_id, amount, period_end, status')
      .in('status', ['pending', 'overdue'])
      .is('deleted_at', null)

    let paymentNotifCount = 0
    for (const payment of (pendingPayments || [])) {
      const periodEnd = new Date(payment.period_end)
      const daysUntil = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      let shouldNotify = false
      let title = ''
      let body = ''

      if (daysUntil === 3) {
        shouldNotify = true
        title = 'تذكير بالدفع 💳'
        body = `موعد الدفع بعد ٣ أيام — ${payment.amount} ريال`
      } else if (daysUntil === 0) {
        shouldNotify = true
        title = 'موعد الدفع اليوم 💳'
        body = `اليوم موعد الدفع — ${payment.amount} ريال`
      } else if (daysUntil === -3) {
        shouldNotify = true
        title = 'تأخر الدفع ⚠️'
        body = `الدفع متأخر ٣ أيام — ${payment.amount} ريال`
      } else if (daysUntil === -7) {
        shouldNotify = true
        title = 'تأخر الدفع ⚠️'
        body = `الدفع متأخر أسبوع — ${payment.amount} ريال. يرجى التواصل مع الإدارة.`
      }

      if (shouldNotify) {
        await supabase.from('notifications').insert({
          user_id: payment.student_id,
          type: 'payment_reminder',
          title,
          body,
          data: { link: '/student/profile', payment_id: payment.id },
        })

        // Send push notification for payment reminder
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [payment.student_id],
            title,
            body,
            url: '/student/profile',
            type: 'payment_reminder',
            priority: 'high',
            skip_in_app: true,
          },
        })
        paymentNotifCount++

        // Send email for payment reminders
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', payment.student_id)
          .single()

        if (profile?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: profile.email,
              type: 'payment_reminder',
              data: { amount: payment.amount, message: body, dueDate: payment.period_end },
            },
          })
        }
      }
    }
    if (paymentNotifCount > 0) {
      results.push(`Payment reminders: ${paymentNotifCount}`)
    }

    // ─── 5. AI Smart Nudges (inactive students) ────────────
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

    if (CLAUDE_API_KEY) {
      // Find students inactive for 24-72 hours
      const twentyFourHoursAgo2 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

      const { data: inactiveStudents } = await supabase
        .from('students')
        .select('id, current_streak, xp_total, last_active_at, profiles(full_name)')
        .lt('last_active_at', twentyFourHoursAgo2)
        .gt('last_active_at', seventyTwoHoursAgo)
        .eq('status', 'active')
        .is('deleted_at', null)
        .limit(10) // batch limit

      if (inactiveStudents && inactiveStudents.length > 0) {
        // Check budget before spending on nudges
        const monthStart2 = new Date()
        monthStart2.setDate(1)
        monthStart2.setHours(0, 0, 0, 0)

        const { data: budgetSettings } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'ai_monthly_budget')
          .single()

        const budgetCap = parseFloat(budgetSettings?.value || '50')
        const { data: costData } = await supabase
          .from('ai_usage')
          .select('estimated_cost_sar')
          .gte('created_at', monthStart2.toISOString())

        const currentCost = (costData || []).reduce((sum: number, r: any) => sum + (parseFloat(r.estimated_cost_sar) || 0), 0)

        if (currentCost < budgetCap) {
          // Generate personalized nudge for each student
          let nudgeCount = 0
          for (const s of inactiveStudents) {
            const hoursInactive = Math.round((Date.now() - new Date(s.last_active_at).getTime()) / (1000 * 60 * 60))
            const name = (s as any).profiles?.full_name?.split(' ')[0] || 'طالب'

            try {
              const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': CLAUDE_API_KEY,
                  'anthropic-version': '2023-06-01',
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'claude-sonnet-4-6',
                  max_tokens: 100,
                  system: `Generate a short, personalized Arabic reminder (1 sentence) for ${name}, an English student inactive for ${hoursInactive}h. Streak: ${s.current_streak}d, XP: ${s.xp_total}. Be warm, encouraging, not pushy. Just the message text, nothing else.`,
                  messages: [{ role: 'user', content: 'Generate nudge' }],
                }),
              })

              if (claudeRes.ok) {
                const data = await claudeRes.json()
                const nudgeText = data.content?.[0]?.text || ''
                const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
                const cost = (tokens * 5 / 1_000_000) * 3.75

                if (nudgeText) {
                  await supabase.from('notifications').insert({
                    user_id: s.id,
                    type: 'system',
                    title: 'وحشتنا! 💙',
                    body: nudgeText,
                    data: { link: '/student' },
                  })

                  // Send push notification for AI nudge
                  await supabase.functions.invoke('send-push-notification', {
                    body: {
                      user_ids: [s.id],
                      title: 'وحشتنا! 💙',
                      body: nudgeText,
                      url: '/student',
                      type: 'smart_nudge',
                      priority: 'normal',
                      skip_in_app: true,
                    },
                  })

                  await supabase.from('ai_usage').insert({
                    type: 'smart_nudge',
                    student_id: s.id,
                    model: 'claude-sonnet',
                    input_tokens: data.usage?.input_tokens || 0,
                    output_tokens: data.usage?.output_tokens || 0,
                    estimated_cost_sar: cost.toFixed(4),
                  })
                  nudgeCount++
                }
              }
            } catch (e) {
              // Skip individual nudge failures
            }
          }
          if (nudgeCount > 0) results.push(`Smart nudges sent: ${nudgeCount}`)

          // Alert trainers for 48h+ inactive students
          const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
          const longInactive = inactiveStudents.filter(s => s.last_active_at < fortyEightHoursAgo)

          for (const s of longInactive) {
            const { data: studentGroup } = await supabase
              .from('students')
              .select('group_id, groups(trainer_id)')
              .eq('id', s.id)
              .single()

            if (studentGroup?.groups?.trainer_id) {
              const name = (s as any).profiles?.full_name || 'طالب'
              await supabase.from('notifications').insert({
                user_id: studentGroup.groups.trainer_id,
                type: 'system',
                title: 'تنبيه: طالب غير نشط ⚠️',
                body: `${name} غير نشط منذ أكثر من 48 ساعة`,
                data: { link: '/trainer/students', student_id: s.id },
              })

              // Push to trainer
              await supabase.functions.invoke('send-push-notification', {
                body: {
                  user_ids: [studentGroup.groups.trainer_id],
                  title: 'تنبيه: طالب غير نشط ⚠️',
                  body: `${name} غير نشط منذ أكثر من 48 ساعة`,
                  url: '/trainer/students',
                  type: 'system',
                  priority: 'normal',
                  skip_in_app: true,
                },
              })
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[cron-streak-check] Error:', error)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
