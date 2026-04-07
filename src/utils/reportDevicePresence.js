import { supabase } from '../lib/supabase'
import { detectDeviceLabel } from './pushSubscribe'

const REPORT_KEY = 'device_presence_reported_at'
const REPORT_COOLDOWN = 6 * 60 * 60 * 1000 // Report at most once every 6 hours per device

/**
 * Reports the current device to push_subscriptions as an install-tracking record.
 * This runs on every app load and ensures the admin widget can see which devices
 * each user has used, even if they haven't enabled push notifications.
 *
 * Uses a special endpoint format: "app-install://{deviceLabel}" to distinguish
 * from real push subscription records. One record per user per device type.
 */
export async function reportDevicePresence(userId) {
  if (!userId) return

  // Throttle: don't report more than once every 6 hours
  try {
    const lastReport = parseInt(localStorage.getItem(REPORT_KEY) || '0', 10)
    if (Date.now() - lastReport < REPORT_COOLDOWN) return
  } catch { return }

  const deviceLabel = detectDeviceLabel()
  const endpoint = `app-install://${deviceLabel}`

  try {
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint,
      p256dh: null,
      auth: null,
      user_agent: navigator.userAgent,
      device_label: deviceLabel,
      is_active: true,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' })

    localStorage.setItem(REPORT_KEY, Date.now().toString())
  } catch {
    // Silent fail — non-critical tracking
  }
}
