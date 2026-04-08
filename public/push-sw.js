// ═══════════════════════════════════════════════════════════════
// Fluentia Push Service Worker — Premium Notification Experience
// v3 — fetch-based Arabic text fix
// ═══════════════════════════════════════════════════════════════

var SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjU2MTgsImV4cCI6MjA4ODcwMTYxOH0.Lznjnw2Pmrr04tFjQD6hRfWp-12JlRagZaCmo59KG8A'

// Vibration patterns per notification category
const VIBRATION_PATTERNS = {
  achievement: [100, 50, 100, 50, 200],   // celebration pulse
  level_up:    [200, 100, 200, 100, 400],  // epic level up
  urgent:      [300, 100, 300, 100, 300],  // attention needed
  gentle:      [80],                        // soft tap
  default:     [100, 50, 100],             // standard double-tap
}

// Type-based emoji badges (shown as notification icon context)
const TYPE_CONFIG = {
  assignment_new:      { emoji: '\u{1F4DD}', vibrate: 'default',     group: 'tasks' },
  assignment_deadline: { emoji: '\u{23F0}',  vibrate: 'urgent',      group: 'tasks' },
  assignment_graded:   { emoji: '\u{2705}',  vibrate: 'achievement', group: 'tasks' },
  class_reminder:      { emoji: '\u{1F514}', vibrate: 'gentle',      group: 'schedule' },
  trainer_note:        { emoji: '\u{1F4AC}', vibrate: 'default',     group: 'messages' },
  achievement:         { emoji: '\u{1F3C6}', vibrate: 'achievement', group: 'xp' },
  level_up:            { emoji: '\u{2B06}\u{FE0F}',  vibrate: 'level_up', group: 'xp' },
  team_update:         { emoji: '\u{1F465}', vibrate: 'default',     group: 'social' },
  xp_update:           { emoji: '\u{2B50}',  vibrate: 'achievement', group: 'xp' },
  streak_warning:      { emoji: '\u{1F525}', vibrate: 'urgent',      group: 'xp' },
  smart_nudge:         { emoji: '\u{1F4A1}', vibrate: 'gentle',      group: 'tips' },
  writing_feedback:    { emoji: '\u{270D}\u{FE0F}',  vibrate: 'achievement', group: 'tasks' },
  speaking_feedback:   { emoji: '\u{1F3A4}', vibrate: 'achievement', group: 'tasks' },
  curriculum_progress: { emoji: '\u{1F4DA}', vibrate: 'achievement', group: 'progress' },
  announcement:        { emoji: '\u{1F4E2}', vibrate: 'default',     group: 'system' },
  system:              { emoji: '\u{2699}\u{FE0F}',  vibrate: 'gentle', group: 'system' },
}

self.addEventListener('push', function(event) {
  if (!event.data) return

  event.waitUntil(handlePush(event))
})

async function handlePush(event) {
  var payload
  try {
    var raw = event.data.json()

    // Strategy: fetch notification content from server via HTTPS
    // This completely bypasses web-push encoding issues with Arabic text
    if (raw.notificationId) {
      try {
        var resp = await fetch(
          SUPABASE_URL + '/rest/v1/rpc/get_notification_text',
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notif_id: raw.notificationId }),
          }
        )
        if (resp.ok) {
          var rows = await resp.json()
          if (rows && rows[0]) {
            var notif = rows[0]
            payload = {
              title: notif.title || raw.title,
              body: notif.body || raw.body,
              type: notif.ntype || raw.type,
              url: notif.action_url || raw.url,
              priority: notif.priority || raw.priority,
              image: notif.image_url || raw.image,
              notificationId: raw.notificationId,
              badgeCount: raw.badgeCount,
              tag: raw.tag,
              actions: raw.actions,
              actionLabel: raw.actionLabel,
            }
          }
        }
      } catch (fetchErr) {
        // Fetch failed (offline?) — fall through to payload decode below
      }
    }

    // Fallback: decode from push payload if fetch didn't work
    if (!payload) {
      if (raw._b64) {
        var bin = atob(raw._b64)
        var bytes = new Uint8Array(bin.length)
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        payload = JSON.parse(new TextDecoder('utf-8').decode(bytes))
      } else {
        payload = raw
      }
    }
  } catch (e) {
    payload = { title: 'Fluentia', body: '' }
  }

  var type = payload.type || 'system'
  var config = TYPE_CONFIG[type] || TYPE_CONFIG.system
  var priority = payload.priority || 'normal'

  // Pick vibration pattern
  var vibratePattern = VIBRATION_PATTERNS.default
  if (priority === 'urgent' || priority === 'high') {
    vibratePattern = VIBRATION_PATTERNS.urgent
  } else if (config.vibrate && VIBRATION_PATTERNS[config.vibrate]) {
    vibratePattern = VIBRATION_PATTERNS[config.vibrate]
  }

  // Build action buttons
  var actions = []
  if (payload.actions && Array.isArray(payload.actions)) {
    for (var j = 0; j < payload.actions.length; j++) {
      var a = payload.actions[j]
      actions.push({ action: a.action || 'open', title: a.title, icon: a.icon })
    }
  } else if (payload.actionLabel) {
    actions.push({ action: 'open', title: payload.actionLabel })
  }
  if (actions.length > 0 && actions.length < 2) {
    actions.push({ action: 'dismiss', title: '\u274C Close' })
  }

  var title = payload.title || 'Fluentia Academy'
  var options = {
    body: payload.body || '',
    icon: payload.icon || '/logo-icon-dark.png',
    badge: '/logo-icon-dark.png',
    image: payload.image || undefined,
    dir: 'rtl',
    lang: 'ar',
    tag: payload.tag || config.group + '-' + Date.now(),
    renotify: true,
    vibrate: vibratePattern,
    timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
    requireInteraction: priority === 'high' || priority === 'urgent',
    silent: priority === 'silent',
    data: {
      url: payload.url || '/',
      notificationId: payload.notificationId,
      type: type,
      priority: priority,
    },
    actions: actions,
  }

  if (!options.image) delete options.image

  await self.registration.showNotification(title, options)

  if (navigator.setAppBadge && payload.badgeCount !== undefined) {
    await navigator.setAppBadge(payload.badgeCount)
  }
}

self.addEventListener('notificationclick', function(event) {
  const action = event.action
  const notification = event.notification
  notification.close()

  // Dismiss action — just close
  if (action === 'dismiss') return

  const url = notification.data?.url || '/'
  const notificationId = notification.data?.notificationId

  event.waitUntil(
    (async () => {
      // Mark as read via API if we have an ID
      if (notificationId) {
        try {
          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
          // Post message to any open client to mark read
          for (const client of allClients) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              notificationId: notificationId,
              url: url,
            })
          }
        } catch (e) { /* ignore */ }
      }

      // Navigate to the target URL
      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })()
  )
})

// Listen for notification close (swipe away) — clear badge
self.addEventListener('notificationclose', function(event) {
  if (navigator.clearAppBadge) {
    // Don't clear entirely — decrement would be better but API doesn't support it
    // So we leave it for now; the app will sync badge count on next open
  }
})

// Handle messages from the main app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    if (navigator.setAppBadge && event.data.count > 0) {
      navigator.setAppBadge(event.data.count)
    } else if (navigator.clearAppBadge && event.data.count === 0) {
      navigator.clearAppBadge()
    }
  }
})
