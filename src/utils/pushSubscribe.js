import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export function getPushPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function subscribeUserToPush(userId) {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported on this device')
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID public key not configured')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const sub = subscription.toJSON()

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: navigator.userAgent,
      device_label: detectDeviceLabel(),
      is_active: true,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' })
    .select()

  if (error) throw error
  return data
}

export async function unsubscribeFromPush(userId) {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    await subscription.unsubscribe()
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
  }
}

export function detectDeviceLabel() {
  const ua = navigator.userAgent
  if (/iPad/.test(ua)) return 'iPadOS'
  // iPadOS 13+ reports as Macintosh — detect via touch support
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'iPadOS'
  if (/iPhone|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) {
    // Detect Android tablet vs phone using multiple signals:
    // 1. Screen size (CSS px) — lowered to 500px to catch smaller tablets
    //    (Galaxy Tab A7 Lite ~534px, some 7" tabs ~480px)
    // 2. UA keywords — Samsung tabs have "SM-T", some include "Tab" or "Tablet"
    const minDim = Math.min(screen.width, screen.height)
    const uaHasTabletHint = /\bSM-T|Tablet|Tab\b/i.test(ua)
    return (minDim >= 500 || uaHasTabletHint) ? 'Android Tablet' : 'Android Phone'
  }
  if (/Mac/.test(ua)) return 'Mac'
  if (/Win/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}
