import { supabase } from '../lib/supabase'

/**
 * Send a notification to a user.
 * @param {Object} params
 * @param {string} params.userId - Target user ID
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {string} [params.url] - Action URL
 * @param {string} params.type - notification_type enum value
 * @param {string} [params.priority] - low | normal | high | urgent
 * @param {boolean} [params.sendPush] - Whether to also send push (via edge function)
 * @param {object} [params.data] - Additional data
 */
export async function notifyUser({
  userId,
  title,
  body,
  url,
  type = 'system',
  priority = 'normal',
  sendPush = false,
  data = null,
}) {
  if (sendPush) {
    // Use edge function (handles both push + in-app insert)
    return supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: [userId],
        title,
        body,
        url,
        type,
        priority,
        data,
      },
    })
  } else {
    // Direct insert (in-app only)
    return supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      action_url: url,
      type,
      priority,
      data,
    })
  }
}
