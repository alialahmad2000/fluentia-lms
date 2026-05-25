# Auto-Recovery System — Phase A Discovery

Date: 2026-05-25 · Branch: `auto-recovery-system` (feature branch, NOT main)

## Key context correction
The prompt's founding premise — "the mock exam is LIVE right now, students are mid-exam" — is **stale**. Both mock exams have `close_at = 2026-05-24 22:00 KSA` and there are **0 active (unsubmitted, unexpired) attempts** now (verified via Management API). So the "don't disrupt mid-exam" urgency is moot — but active-exam protection is still built in as defensive hygiene for the next exam.

## A.1 — Build/version pipeline — ALREADY EXISTS
- `vite.config.js` has a `version-stamp` plugin that writes `public/version.json` (`{ version: Date.now().toString(36), buildTime }`) on every build. Unique per build. → Layer 1's version injection already done (timestamp, not git hash — sufficient).
- `src/components/UpdateBanner.jsx` already existed: polled `/version.json` every **5 min**, compared to `localStorage.app_version`, showed a **manual** banner. No exam guard, no auto-apply.
- `src/main.jsx` already has a boot-time `selfHealStaleClient()` IIFE: on version mismatch it clears caches + unregisters SWs + reloads **once per session** (guarded against loops). This is real version-based auto-recovery on boot.
- `vercel.json` exists (rewrites + security headers; no version headers needed).

## A.2 — TanStack Query defaults — INTENTIONALLY DIVERGENT from the prompt
`src/lib/queryClient.js`: `staleTime 60s`, `gcTime 24h`, `refetchOnMount: true`, `refetchOnReconnect: 'always'`, and **`refetchOnWindowFocus: false` ON PURPOSE** (comment: "causes blank page bug — token may be expired when user returns to tab"). Smart auth-aware retry already present (refreshOnce on JWT errors).
→ **Layer 3's global flip to `refetchOnWindowFocus: true` is REJECTED, not skipped** — it would reintroduce a known blank-page bug this codebase already fixed. Critical mock-exam queries already use per-query `staleTime: 0` / `refetchOnMount: 'always'` (commit 526c7b9). No change made.

## A.3 — Error tracking — partial
`main.jsx` already has `window.addEventListener('error'|'unhandledrejection')` (console + chunk-reload) but **no persistence**. `ErrorBoundary`, `SectionErrorBoundary`, `TrainerErrorBoundary` exist. → Layer 6 adds a Supabase sink (extends existing handlers + boundary, no duplicate listeners).

## A.4 — Admin pages
Routes in `src/App.jsx`; admin nav in `src/config/navigation.js` (`system` group: audio-telemetry, settings). → Layer 8 page added at `/admin/system`, nav item "تشخيص النظام".

## A.5 — Active-exam helper — did NOT exist
No `useActiveExamAttempt`. → Created `src/hooks/useActiveExamAttempt.js` (polls `mock_exam_attempts` for unsubmitted+unexpired, 30s).

## What was built (this branch)
- **Layer 1 (extend):** `UpdateBanner` now polls 60s + on tab focus, defers during active exam (calm amber banner), 10s auto-apply countdown otherwise, applies via `refreshAppSession({ keepAuth: true })` (keeps the student logged in + on the same page). `refreshAppSession` gained `keepAuth` (preserves `sb-*-auth-token`, skips IndexedDB wipe). New `useActiveExamAttempt`.
- **Layer 3:** REJECTED (see A.2). Documented, no code change.
- **Layer 5:** `useNetworkStatus` + `NetworkStatusIndicator` (bottom amber bar when offline/server-unreachable), mounted in `LayoutShell`.
- **Layer 6:** migration `20260525010000_client_error_log.sql` (table + rate-limited `log_client_error` RPC, SECURITY DEFINER); `src/lib/errorTracker.js` (`captureError`); wired into `main.jsx` handlers + `ErrorBoundary.componentDidCatch`.
- **Layer 7:** `useAdminBroadcastListener` (Supabase Realtime **broadcast** channel `admin-broadcasts`, exam-guarded) mounted in `LayoutShell`; `broadcastForceRefresh()` helper.
- **Layer 8:** `src/pages/admin/SystemDiagnostics.jsx` at `/admin/system` + nav item.

## DEFERRED (see AUTO-RECOVERY-DEFERRED.md)
Layer 2 (Vite PWA Plugin / Service Worker) and Layer 4 (Supabase Realtime **table subscriptions**) — risky, not built.

## Deploy notes
- Feature branch only (per deploy policy). NOT pushed to main.
- Migration `20260525010000` NOT applied to prod — apply on a Supabase branch, promote manually. Until then `log_client_error` won't exist; `captureError` fails silently (by design) and `/admin/system` shows empty.
