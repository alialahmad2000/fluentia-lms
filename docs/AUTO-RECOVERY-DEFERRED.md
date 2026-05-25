# Auto-Recovery — Deferred Layers (do NOT ship without dedicated testing)

These were intentionally NOT built in the auto-recovery branch. Both can persist
in user browsers for a long time and need careful, isolated testing.

## Layer 2 — Service Worker / Vite PWA Plugin
- Add `vite-plugin-pwa` with `registerType: 'autoUpdate'`, cache strategies
  (NetworkFirst for API, CacheFirst for hashed assets).
- Risk: a bad SW persists for weeks and needs a migration path. The repo already
  has `public/push-sw.js` (push only, no fetch handler) — any PWA SW must coexist
  with it. The existing boot `selfHealStaleClient()` in `main.jsx` already covers
  the "stuck old bundle" case without a fetch-intercepting SW.
- Test extensively (incognito + returning-session + offline) before shipping.

## Layer 4 — Supabase Realtime table subscriptions
- Subscribe to `mock_exam_attempts` / `notifications` so UI reflects server
  changes without polling.
- Risk: subscriptions leak memory / channels if not cleaned up on unmount;
  reconnection storms on flaky mobile networks. (Note: Layer 7's broadcast channel
  is fine — it's a single app-level channel, not per-row table subscriptions.)
- Build only when there's time to load-test subscription cleanup.

## Also rejected (not merely deferred)
- **Layer 3 global `refetchOnWindowFocus: true`** — `queryClient.js` sets it to
  `false` on purpose to avoid a blank-page bug (expired token on tab return). Do
  not flip it globally. Use per-query `staleTime: 0` / `refetchOnMount: 'always'`
  for specific "current state" queries instead (already done for mock-exam).
