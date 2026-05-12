// Triggered by Supabase Database Webhook on group_messages INSERT
// Inserts notifications for all mentioned users + sends push notifications
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
  if (!msg?.id || !Array.isArray(msg.mentions) || msg.mentions.length === 0) {
    return new Response('no mentions', { headers: corsHeaders })
  }

  // Get channel + sender info
  const [{ data: channel }, { data: sender }] = await Promise.all([
    supabase.from('group_channels').select('id, label_ar').eq('id', msg.channel_id).maybeSingle(),
    supabase.from('profiles').select('first_name_ar, last_name_ar').eq('id', msg.sender_id).maybeSingle(),
  ])

  const senderName = [sender?.first_name_ar, sender?.last_name_ar].filter(Boolean).join(' ')
  const channelName = channel?.label_ar ?? 'القناة'
  const body = msg.body || msg.content || '...'
  const link = `/chat/${msg.group_id}/${msg.channel ?? 'general'}/m/${msg.id}`

  // Insert notifications (skip self-mentions)
  const recipients = msg.mentions.filter((id: string) => id !== msg.sender_id)
  if (recipients.length === 0) return new Response('ok (self-mentions skipped)', { headers: corsHeaders })

  await supabase.from('notifications').insert(
    recipients.map((userId: string) => ({
      user_id: userId,
      type: 'message_mention',
      title: `${senderName} ذكرك في #${channelName}`,
      body: body.substring(0, 120),
      link,
      action_url: link,
      data: { message_id: msg.id, group_id: msg.group_id, channel_id: msg.channel_id },
    }))
  )

  // Fire push notifications via existing send-push-notification edge function
  await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: recipients,
      title: 'Fluentia Academy',
      body: `${senderName} ذكرك في #${channelName}`,
      url: link,
      type: 'message_mention',
      tag: msg.id,
      skip_in_app: true,
    },
  }).catch(console.error)

  return new Response('ok', { headers: corsHeaders })
})
