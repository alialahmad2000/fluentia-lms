// Fluentia LMS — Automated Payment Reminder
// Sends notifications to students with upcoming/overdue payments
// Deploy: supabase functions deploy payment-reminder --no-verify-jwt
// Schedule: Call via cron or Supabase scheduled function

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

    // Get reminder settings
    const { data: reminderSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_reminder_days')
      .maybeSingle()
    const reminderDays = reminderSetting?.value || 3

    const now = new Date()
    const reminderDate = new Date()
    reminderDate.setDate(now.getDate() + reminderDays)

    // Find overdue payments
    const { data: overduePayments } = await supabase
      .from('payments')
      .select('id, student_id, amount, period_end, profiles:student_id(full_name, display_name)')
      .eq('status', 'overdue')
      .is('deleted_at', null)

    // Find pending payments due within reminder window
    const { data: upcomingPayments } = await supabase
      .from('payments')
      .select('id, student_id, amount, period_end, profiles:student_id(full_name, display_name)')
      .eq('status', 'pending')
      .lte('period_end', reminderDate.toISOString())
      .is('deleted_at', null)

    const notifications: any[] = []
    const processed = new Set<string>()

    // Send overdue reminders
    for (const payment of overduePayments || []) {
      if (processed.has(payment.student_id)) continue
      processed.add(payment.student_id)

      notifications.push({
        user_id: payment.student_id,
        type: 'payment_reminder',
        title: '⚠️ دفعة متأخرة',
        body: `لديك دفعة متأخرة بقيمة ${payment.amount} ر.س. يرجى السداد في أقرب وقت.`,
        data: { payment_id: payment.id, amount: payment.amount },
      })
    }

    // Send upcoming reminders
    for (const payment of upcomingPayments || []) {
      if (processed.has(payment.student_id)) continue
      processed.add(payment.student_id)

      const dueDate = new Date(payment.period_end)
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      notifications.push({
        user_id: payment.student_id,
        type: 'payment_reminder',
        title: '💳 تذكير بالدفع',
        body: daysLeft <= 0
          ? `موعد الدفع اليوم — ${payment.amount} ر.س`
          : `موعد الدفع بعد ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} — ${payment.amount} ر.س`,
        data: { payment_id: payment.id, amount: payment.amount },
      })
    }

    // Insert notifications
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    // WhatsApp integration (if configured)
    const { data: whatsappKey } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'whatsapp_api_key')
      .maybeSingle()

    const { data: whatsappInstance } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'whatsapp_instance_id')
      .maybeSingle()

    let whatsappSent = 0
    if (whatsappKey?.value && whatsappInstance?.value) {
      // Get phone numbers for students with reminders
      const studentIds = [...processed]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('id', studentIds)
        .not('phone', 'is', null)

      for (const profile of profiles || []) {
        const notif = notifications.find(n => n.user_id === profile.id)
        if (!notif || !profile.phone) continue

        try {
          // Generic WhatsApp API call (UltraMsg format)
          await fetch(`https://api.ultramsg.com/${whatsappInstance.value}/messages/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: whatsappKey.value,
              to: profile.phone,
              body: `${notif.title}\n${notif.body}\n\nأكاديمية طلاقة 🎓`,
            }),
          })
          whatsappSent++
        } catch (err) {
          console.error(`[WhatsApp] Failed to send to ${profile.id}:`, err)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notifications.length,
        whatsapp_sent: whatsappSent,
        overdue: overduePayments?.length || 0,
        upcoming: upcomingPayments?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[payment-reminder] Error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
