// Fluentia LMS — Weekly Tasks Reminder Cron
// Runs Wednesday (mid-week reminder) and Friday (urgent last-day reminder)
// Deploy: supabase functions deploy weekly-tasks-reminder --no-verify-jwt

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

    // Determine if this is a Wednesday (mid-week) or Friday (urgent) reminder
    const today = new Date()
    const dayOfWeek = today.getUTCDay() // 0=Sun, 3=Wed, 5=Fri
    const isUrgent = dayOfWeek === 5 // Friday = urgent (Saturday is deadline)

    // Get current week boundaries (Sunday to Saturday)
    const weekStart = new Date(today)
    weekStart.setUTCDate(today.getUTCDate() - today.getUTCDay())
    weekStart.setUTCHours(0, 0, 0, 0)

    // Find all task sets for this week that are NOT completed
    const { data: incompleteSets, error: setsErr } = await supabase
      .from('weekly_task_sets')
      .select('id, student_id, total_tasks, completed_tasks, completion_percentage')
      .gte('week_start', weekStart.toISOString())
      .neq('status', 'completed')

    if (setsErr) throw setsErr
    if (!incompleteSets?.length) {
      return new Response(JSON.stringify({ message: 'No incomplete task sets found', reminded: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For Wednesday: only remind if less than 50% done
    // For Friday: remind everyone who hasn't completed all tasks
    const setsToRemind = isUrgent
      ? incompleteSets
      : incompleteSets.filter(s => (s.completion_percentage || 0) < 50)

    let reminded = 0
    const errors: string[] = []

    for (const taskSet of setsToRemind) {
      try {
        const remaining = (taskSet.total_tasks || 8) - (taskSet.completed_tasks || 0)
        const pct = taskSet.completion_percentage || 0

        const notificationType = isUrgent ? 'weekly_tasks_urgent' : 'weekly_tasks_remind'

        const title = isUrgent
          ? '\u0622\u062E\u0631 \u064A\u0648\u0645 \u0644\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629! \u23F0'
          : '\u062A\u0630\u0643\u064A\u0631 \u0628\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629 \uD83D\uDCDD'

        const body = isUrgent
          ? `\u0628\u0627\u0642\u064A ${remaining} \u0645\u0647\u0627\u0645 \u0644\u0645 \u062A\u0643\u0645\u0644\u0647\u0627 \u2014 \u063A\u062F\u0627\u064B \u0622\u062E\u0631 \u064A\u0648\u0645! \u0623\u0643\u0645\u0644\u0647\u0627 \u0627\u0644\u0622\u0646 \u0648\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 XP \u0625\u0636\u0627\u0641\u064A \uD83C\uDFC6`
          : `\u0623\u0643\u0645\u0644\u062A ${pct}% \u0645\u0646 \u0645\u0647\u0627\u0645\u0643 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629 \u2014 \u0628\u0627\u0642\u064A ${remaining} \u0645\u0647\u0627\u0645. \u0627\u0633\u062A\u0645\u0631! \uD83D\uDCAA`

        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: taskSet.student_id,
          type: notificationType,
          title,
          body,
          data: { link: '/student/weekly-tasks' },
        })

        if (notifErr) {
          errors.push(`Notification error for ${taskSet.student_id}: ${notifErr.message}`)
          continue
        }

        // Try to send email for urgent reminders
        if (isUrgent) {
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', taskSet.student_id)
            .single()

          if (studentProfile?.email) {
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  to: studentProfile.email,
                  type: 'deadline_reminder',
                  data: {
                    studentName: studentProfile.full_name || '\u0637\u0627\u0644\u0628',
                    assignmentName: '\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629',
                    deadline: '\u063A\u062F\u0627\u064B (\u0627\u0644\u0633\u0628\u062A)',
                    remainingCount: remaining,
                  },
                },
              })
            } catch (emailErr) {
              // Email failure shouldn't stop the process
              console.error(`Email error for ${taskSet.student_id}:`, emailErr)
            }
          }
        }

        reminded++
      } catch (err) {
        errors.push(`Error for set ${taskSet.id}: ${err.message}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reminded,
      total_incomplete: incompleteSets.length,
      is_urgent: isUrgent,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[weekly-tasks-reminder] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
