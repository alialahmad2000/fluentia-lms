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
  // Skip cooldown if last report used old detection (force re-report after detection fix)
  const DETECTION_FIX_TS = 1744156800000 // 2026-04-09T00:00:00Z — deploy date of tablet detection fix v2
  try {
    const lastReport = parseInt(localStorage.getItem(REPORT_KEY) || '0', 10)
    if (lastReport > DETECTION_FIX_TS && Date.now() - lastReport < REPORT_COOLDOWN) return
  } catch { return }

  const deviceLabel = detectDeviceLabel()
  const endpoint = `app-install://${deviceLabel}`

  // Clean up misclassified Android records (tablets previously detected as phones and vice versa)
  // This handles the case where screen-size detection corrects a previous UA-based misclassification
  const androidCounterpart = deviceLabel === 'Android Tablet' ? 'Android Phone'
    : deviceLabel === 'Android Phone' ? 'Android Tablet'
    : null

  try {
    if (androidCounterpart) {
      await supabase.from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', `app-install://${androidCounterpart}`)
    }

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
