# Push Notifications — Troubleshooting & Architecture Guide

## Architecture Overview

```
Frontend (notifyUser)  →  Edge Function (send-push-notification)  →  web-push library  →  FCM/APNs/WNS
                              ↓                                                              ↓
                        Supabase DB (notifications table)                          Service Worker (push-sw.js)
                              ↓                                                              ↓
                        In-app NotificationCenter                              SW fetches text from DB via RPC
                                                                                             ↓
                                                                                    showNotification()
```

## The Arabic Text Problem (Solved April 2026)

### Symptom
Push notifications showed `??????` (question marks) instead of Arabic text on iOS and Android.

### Root Cause
The web-push encryption pipeline corrupts non-ASCII (Arabic) text. The exact failure point is that `web-push` library running in Deno edge functions doesn't reliably preserve UTF-8 multi-byte characters through the AES-GCM encryption.

### Solution — Fetch-from-DB Pattern
Instead of embedding Arabic text in the push payload (which gets encrypted by web-push), we:

1. **Edge function** inserts the notification into the DB first (with correct Arabic via Supabase client)
2. **Edge function** sends a push payload containing only the `notificationId` (pure ASCII UUID) + metadata
3. **Service Worker** receives the push, extracts `notificationId`, then fetches the actual Arabic text from Supabase via HTTPS using the `get_notification_text` RPC function
4. **Service Worker** displays the fetched Arabic text via `showNotification()`

This works because regular HTTPS `fetch()` handles UTF-8 perfectly — the Arabic text never goes through web-push encryption.

### Key Files
| File | Role |
|------|------|
| `supabase/functions/send-push-notification/index.ts` | Edge function — inserts notification, sends push with notificationId |
| `public/push-sw.js` | Service Worker — receives push, fetches text from DB, shows notification |
| `src/utils/notify.js` | Frontend utility — calls edge function (handles both in-app + push) |
| `src/utils/pushSubscribe.js` | Manages browser push subscriptions (VAPID keys) |
| `src/components/notifications/EnableNotificationsPrompt.jsx` | UI for enabling push + auto-resubscribe logic |

### Database
- `notifications` table — stores all notification content (Arabic text stored correctly here)
- `push_subscriptions` table — stores device push endpoints (FCM, APNs, WNS)
- `get_notification_text(notif_id UUID)` — SECURITY DEFINER RPC function that lets the SW read notification text with anon key (bypasses RLS)

---

## Common Issues & Fixes

### 1. Push notifications not received outside the app
**Cause:** Code uses `supabase.from('notifications').insert()` directly instead of `notifyUser()`.
**Fix:** Always use `notifyUser()` from `src/utils/notify.js` — it calls the edge function which handles both in-app AND push delivery.

### 2. Arabic text shows as `??????` in push notifications
**Cause:** Arabic text went through web-push encryption and got corrupted.
**Fix:** The SW fetches text from DB via `get_notification_text` RPC. If this breaks:
- Check that the `get_notification_text` function exists in the DB
- Check that anon has EXECUTE permission on it
- Check that `push-sw.js` has the fetch logic in the push handler
- Check that the edge function sends `notificationId` in the push payload

### 3. Arabic shows as `?` in the database itself
**Cause:** The notification was sent via a tool that doesn't use UTF-8 (e.g., Git Bash `curl` on Windows sends CP1252).
**Fix:** Always send test notifications using Node.js, not curl:
```bash
node -e "
fetch('https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/send-push-notification', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer SERVICE_ROLE_KEY',
    'Content-Type': 'application/json; charset=utf-8'
  },
  body: JSON.stringify({
    user_ids: ['USER_UUID'],
    title: 'عنوان بالعربي',
    body: 'نص الإشعار بالعربي',
    url: '/',
    type: 'system',
    priority: 'high'
  })
}).then(r => r.json()).then(console.log)
"
```
**NEVER use `curl` on Windows to send Arabic text — it corrupts UTF-8.**

### 4. Push subscription expired (FCM returns 410)
**Cause:** Browser push subscription expired server-side but browser still reports it as valid.
**Fix:** `EnableNotificationsPrompt.jsx` has auto-resubscribe logic — on app open, it checks if the DB subscription is `is_active: false`, and if so, forces the browser to unsubscribe and creates a fresh subscription.

### 5. Service Worker not updating on user devices
**Cause:** `push-sw.js` changes weren't triggering SW updates because it wasn't in the precache manifest.
**Fix:** `push-sw.js` is included in workbox `globPatterns` in `vite.config.js`:
```js
globPatterns: ['**/*.{css,html,ico,png,svg,woff2}', 'push-sw.js'],
```
Any change to `push-sw.js` now triggers a SW update. Users must open the app once for the update to install.

### 6. `app-install://` endpoints in push_subscriptions
These are **NOT real push subscriptions** — they're device presence tracking records from `reportDevicePresence.js`. The edge function filters them out with:
```sql
.not('endpoint', 'like', 'app-install://%')
```

---

## Testing Push Notifications

### Send a test notification (use Node.js, NOT curl)
```bash
node -e "
fetch('https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/send-push-notification', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer SERVICE_ROLE_KEY',
    'Content-Type': 'application/json; charset=utf-8'
  },
  body: JSON.stringify({
    user_ids: ['TARGET_USER_UUID'],
    title: 'اختبار',
    body: 'هذا اختبار للإشعارات',
    url: '/',
    type: 'system',
    priority: 'high'
  })
}).then(r => r.json()).then(console.log)
"
```

### Check if a user has active push subscriptions
```sql
SELECT id, device_label, is_active, endpoint, last_used_at
FROM push_subscriptions
WHERE user_id = 'USER_UUID'
  AND is_active = true
  AND endpoint NOT LIKE 'app-install://%'
ORDER BY last_used_at DESC;
```

### Verify notification stored correctly in DB
```sql
SELECT id, title, body FROM notifications
WHERE id = 'NOTIFICATION_UUID';
-- Arabic text should display correctly, not as ?????
```

---

## Deployment Checklist

When modifying push notification code:

1. **Edge function changed?** → `npx supabase functions deploy send-push-notification --no-verify-jwt --project-ref nmjexpuycmqcxuxljier`
2. **push-sw.js changed?** → `npm run build && npx vercel --prod` (SW is precached, so build triggers SW update)
3. **Frontend notification code changed?** → `npm run build && npx vercel --prod`
4. **Database function changed?** → Create migration in `supabase/migrations/` and `npx supabase db push --linked`
5. **After deploying SW changes** → Users must open the app once for the new SW to install
