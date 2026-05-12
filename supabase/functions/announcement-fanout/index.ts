// Triggered by Supabase DB Webhook on INSERT into group_messages.
// Fires only for messages in announcement channels (is_announcement=true).
// Inserts notifications for all group members + fires push notifications.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let payload: any
  try { payload = await req.json() } catch {
    return new Response('Bad request', { status: 400, headers: corsHeaders })
  }

  const msg = payload?.record ?? payload

  // Only handle announcement channel messages
  if (!msg?.id || !msg?.channel_id || !msg?.group_id) {
    return new Response('skip: missing fields', { headers: corsHeaders })
  }

  // Check if this is an announcement channel
  const { data: channel } = await supabase
    .from('group_channels')
    .select('is_announcement, label_ar')
    .eq('id', msg.channel_id)
    .maybeSingle()

  if (!channel?.is_announcement) {
    return new Response('skip: not announcement channel', { headers: corsHeaders })
  }

  // Get sender name
  const { data: sender } = await supabase
    .from('profiles')
    .select('first_name_ar, last_name_ar')
    .eq('id', msg.sender_id)
    .maybeSingle()

  const senderName = [sender?.first_name_ar, sender?.last_name_ar].filter(Boolean).join(' ') || 'المدرب'
  const body = (msg.body || msg.content || '').substring(0, 80)
  const link = `/chat/${msg.group_id}/${msg.channel ?? 'announcements'}/m/${msg.id}`

  // Fetch all active students in the group (exclude sender)
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('group_id', msg.group_id)
    .eq('status', 'active')
    .neq('id', msg.sender_id)

  if (!students || students.length === 0) {
    return new Response('ok: no recipients', { headers: corsHeaders })
  }

  const recipientIds = students.map((s: any) => s.id)

  // Insert notifications for all recipients
  const { error: notifError } = await supabase.from('notifications').insert(
    recipientIds.map((userId: string) => ({
      user_id: userId,
      type: 'channel_announcement',
      title: `إعلان من ${senderName}`,
      body,
      link,
      action_url: link,
      data: { message_id: msg.id, group_id: msg.group_id, channel_id: msg.channel_id },
    }))
  )

  if (notifError) {
    console.error('notification insert error:', notifError)
  }

  // Fire push notifications via existing send-push-notification edge function
  const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: recipientIds,
      title: `إعلان من ${senderName}`,
      body,
      url: link,
      type: 'channel_announcement',
      tag: msg.channel_id,
      skip_in_app: true,
    },
  })

  if (pushError) {
    console.error('push error:', pushError)
  }

  return new Response(
    JSON.stringify({ ok: true, recipients: recipientIds.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
