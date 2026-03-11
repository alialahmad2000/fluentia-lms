// Fluentia LMS — Daily Cron: Streak Check + Auto Reminders
// Runs on a schedule to check streaks, send deadline/class/payment reminders
// Deploy: supabase functions deploy cron-streak-check
// Schedule: Set up via Supabase Dashboard > Edge Functions > Schedules

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      results.push(`Sent ${streakNotifs.length} streak warnings`)

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
        results.push(`Deadline reminders: ${notifs.length} for "${assignment.title}"`)
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

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[cron-streak-check] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
