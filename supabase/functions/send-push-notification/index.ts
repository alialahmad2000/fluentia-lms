// Deploy: supabase functions deploy send-push-notification --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.39.0'
// Buffer import removed — using base64 wrapping instead

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@fluentia.academy',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface SendPushBody {
  user_ids?: string[]
  target_roles?: string[]
  title: string
  body: string
  url?: string
  action_label?: string
  icon?: string
  image?: string
  type?: string
  priority?: string
  tag?: string
  data?: any
  announcement_id?: string
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: SendPushBody = await req.json()

    // Resolve target users
    let targetUserIds: string[] = []

    if (payload.user_ids?.length) {
      targetUserIds = payload.user_ids
    } else if (payload.target_roles?.length) {
      const { data: users, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('role', payload.target_roles)

      if (error) throw error
      targetUserIds = users.map((u: any) => u.id)
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0 }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Insert in-app notifications first
    const notificationRows = targetUserIds.map(userId => ({
      user_id: userId,
      title: payload.title,
      body: payload.body,
      icon_url: payload.icon,
      image_url: payload.image,
      action_url: payload.url,
      action_label: payload.action_label,
      type: payload.type || 'announcement',
      priority: payload.priority || 'normal',
      data: payload.data,
      source_announcement_id: payload.announcement_id,
    }))

    const { data: insertedNotifications, error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationRows)
      .select('id, user_id')

    if (insertError) throw insertError

    // Get active push subscriptions for target users (exclude install-tracking records)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', targetUserIds)
      .eq('is_active', true)
      .not('endpoint', 'like', 'app-install://%')

    if (subError) throw subError

    // Build user_id -> notification_id map
    const userToNotifId = new Map()
    for (const n of insertedNotifications || []) {
      userToNotifId.set(n.user_id, n.id)
    }

    // Send push to each subscription
    let sent = 0, failed = 0

    for (const sub of subscriptions || []) {
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/logo-icon-dark.png',
        image: payload.image,
        url: payload.url || '/',
        tag: payload.tag,
        priority: payload.priority,
        actionLabel: payload.action_label,
        notificationId: userToNotifId.get(sub.user_id),
      })

      try {
        // Base64-wrap the JSON payload so only ASCII goes through web-push encryption
        // This fixes Arabic text showing as ???? in Deno's npm compat layer
        const b64 = btoa(unescape(encodeURIComponent(pushPayload)))
        const wrappedPayload = JSON.stringify({ _b64: b64 })
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          wrappedPayload
        )
        sent++

        // Mark notification as pushed
        const notifId = userToNotifId.get(sub.user_id)
        if (notifId) {
          await supabaseAdmin
            .from('notifications')
            .update({ pushed: true, pushed_at: new Date().toISOString() })
            .eq('id', notifId)
        }
      } catch (err: any) {
        failed++

        // Deactivate dead subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('endpoint', sub.endpoint)
        }
      }
    }

    return new Response(JSON.stringify({ sent, failed, inAppCreated: insertedNotifications?.length || 0 }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
