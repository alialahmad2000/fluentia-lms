# Architecture Audit — Universal Stuck-Loading Bug

**Audited:** 2026-04-20
**Symptom:** Any page, any user, can get stuck on loading skeleton indefinitely
**Prior fix attempts:** 5 (Perf V1 console strip, Perf V2 desktop hotspots, Perf V3 runtime overhaul, curriculum tab remount, Realtime channel leak) — symptom persists
**Approach:** Diagnosis-first, no code changes in this pass

---

## Executive Summary

The universal stuck-loading symptom has one dominant root cause and two compounding amplifiers — none of which were touched by the five prior fixes.

**Root cause #1 (HIGH confidence):** Every Supabase database query (`.from().select()`) runs with no per-request timeout. On mobile with a degraded connection — TCP established but data not flowing — the fetch hangs indefinitely. React Query sees `isFetching: true` → `isLoading: true` → the skeleton stays visible until the browser's HTTP connection finally errors (Chrome has no default HTTP timeout; requests can hang 60–300+ seconds). A page refresh closes the hung TCP connection and starts fresh. This is the only mechanism in this codebase that produces "stuck forever until refresh" at universal scale.

**Amplifier #2 (MEDIUM confidence):** On every tab return after ≥2 minutes, the visibility handler fires `supabase.auth.refreshSession()` → TOKEN_REFRESHED → `queryClient.invalidateQueries({ type: 'active' })` + `set({ user })`. The invalidation marks all current-page queries stale; the set() triggers re-renders on all 179 bare `useAuthStore()` subscribers simultaneously. On low-end mobile CPUs, 179 synchronous Zustand re-renders produce a 100–500ms UI freeze that users describe as "stuck loading." This compounds with the timeout problem because the frozen UI delays the retry.

**Amplifier #3 (LOW–MEDIUM confidence):** The Workbox SW applies `NetworkFirst` with `networkTimeoutSeconds: 3` to all JS chunks. On poor mobile signal, the 3s timeout causes the SW to fall back to its runtime cache. The 54 `React.lazy()` imports inside components (UnitContent tabs, AdminContent sub-tabs, etc.) are NOT wrapped in `lazyRetry`. If these stale/incompatible chunks error, the nearest `<ErrorBoundary>` catches them — showing an error fallback rather than a stuck skeleton — but the error screen is invisible if the boundary's fallback is minimal, leaving users uncertain whether the app is loading or broken.

All five prior fixes improved local symptoms (bundle size, tab remounting, channel leaks, animations) without addressing the fetch-timeout gap, the Zustand re-render storm, or the SW chunk protection coverage.

---

## Architecture Snapshot

### Auth Flow

- **Client:** `src/lib/supabase.js` — single `createClient()` call, singleton. `auth.autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: true`. No custom `fetch` option (no global timeout).
- **Store:** `src/stores/authStore.js` (Zustand). State: `user`, `profile`, `studentData`, `trainerData`, `loading`, `impersonation`, `_realProfile/Data/TrainerData`.
- **Initialize:** `initialize()` called once in `App.jsx` `useEffect`. Uses `withTimeout()` wrappers: `getSession` → 6 000ms, `fetchProfile` → 8 000ms. `loading: false` set in `finally` block regardless of outcome.
- **fetchProfile:** Two sequential `set()` calls — `set({ user, profile })` then `set({ studentData })`. Between the two calls, `profile` is non-null but `studentData` is null. Queries gated on `!!studentData?.id` briefly go `enabled: false`.
- **TOKEN_REFRESHED handler:** `set({ user: session.user })` + `queryClient.invalidateQueries({ type: 'active' })`. Does NOT call `fetchProfile`. Profile stays set. However all currently-mounted queries are marked stale.
- **SIGNED_IN handler:** Calls `await fetchProfile(session.user)`. Fires on initial login. Also fires if Supabase detects session in URL (OAuth callbacks). Does NOT fire on token refresh.
- **Profile → null scenarios:** Only on (a) SIGNED_OUT, (b) `fetchProfile` error path (`set({ user, profile: null })`). ProtectedRoute only checks `!user` for redirect; a profile:null + user:non-null state renders the route with all profile-gated queries disabled.
- **onAuthStateChange:** Registered in exactly ONE place (`authStore.initialize`). Also registered in `src/pages/public/ResetPassword.jsx` — but this is a public page that unmounts when navigating away; subscription cleaned up on unmount.
- **Visibility handler (App.jsx):** On tab focus, throttled to 120 000ms (2 min), calls `supabase.auth.refreshSession()`. Triggers TOKEN_REFRESHED → see above.
- **Atomicity:** `user` and `profile` set in one `set()` call in `fetchProfile`. `studentData` set in a separate subsequent call. Not atomic.

### Query Flow

- **QueryClient:** `src/lib/queryClient.js` — single instance, passed to `QueryClientProvider` in `src/main.jsx`.
- **Defaults:**
  - `staleTime: 5 min`
  - `gcTime: 30 min`
  - `retry: custom` — 0 retries on auth errors (401/JWT), 2 retries otherwise. Each retry triggers `refreshSessionOnce()` on the first auth error.
  - `retryDelay: min(2000 × 2^attempt, 15000)` — exponential backoff, max 15s
  - `refetchOnWindowFocus: false`
  - `refetchOnReconnect: 'always'` ← refetches ALL queries on any network reconnect
  - `refetchOnMount: true` ← refetches stale queries when component mounts
  - `networkMode: 'offlineFirst'` ← queries fire even when offline; no pausing in pending state
  - `placeholderData: previousData` ← shows stale data during refetch (prevents skeleton on cached revisits)
- **Per-query timeout:** NONE. No `AbortController`, no `signal`. Supabase `.from().select()` queries can hang indefinitely on a degraded network.
- **Edge Function calls:** Use `src/lib/invokeWithRetry.js` which wraps with `AbortController` and a configurable `timeoutMs` (default 30s). These DO have timeout protection.
- **useQuery count:** 550 total `useQuery()` calls in the codebase.
- **Auth-gated queries:** 114 queries use `enabled: !!profile?.id` or similar.
- **Double-condition enabled:** 6 queries require two async-loaded values (e.g., `!!studentData?.id && !!unitId`). These are at higher risk of the brief null-window between fetchProfile's two `set()` calls.
- **isLoading usage:** 464 occurrences (v4 semantics style).
- **isPending usage:** 274 occurrences. In pages, `isPending` is used primarily for mutation state (button disabled/loading) — not for rendering loading skeletons. The pattern `if (isPending) return <Skeleton>` was NOT found in page components.
- **Global error handler:** Mutation `onError` calls `refreshSessionOnce()` on JWT errors. No global query `onError`.

### Routing + Lazy Loading

- **Route-level lazy:** ALL route pages in `App.jsx` use `lazyRetry()` — a custom wrapper that catches chunk-load errors, writes `chunk_reload_at` to sessionStorage, calls `window.location.reload()` once (30s cooldown), then throws on subsequent failures. Covers ~130 route pages.
- **Component-level lazy:** 54 `lazy()` / `React.lazy()` calls inside components (UnitContent.jsx: 9 tab imports; AdminContent.jsx: 3; AdminReports.jsx: 2; AdminSettings.jsx: 2; AdminStudents.jsx: 2; StudentChatbot.jsx: 3; StudentGrades.jsx: 4; StudentGroupChat.jsx: 1; StudentProfile.jsx: 1; LayoutShell.jsx: 1; others). These are NOT wrapped in `lazyRetry`.
- **Suspense fallback:** One global `<Suspense fallback={<PageSkeleton />}>` in `App.jsx` wrapping all routes (line 218). Also per-section `<SectionErrorBoundary>` + `<Suspense>` inside UnitContent for tab lazy loads.
- **ErrorBoundary:** `<ErrorBoundary fallback={<PageErrorFallback />}>` wraps each route page via the `<Page>` component. Catches both JS errors and failed lazy imports (after they propagate from Suspense). Shows `<PageErrorFallback>` — NOT a stuck skeleton.
- **lazyRetry mechanism:** On chunk failure → `return new Promise(() => {})` (keeps Suspense showing skeleton) → immediately calls `window.location.reload()`. The skeleton visible window is typically <100ms before reload fires.
- **startTransition:** 0 usages. React Router v6 handles navigation transitions internally.

### Service Worker + Caching

- **Registration:** `VitePWA({ registerType: 'autoUpdate' })` — new SW downloads and activates automatically on deploy without waiting for tab close. Implies `skipWaiting`.
- **Precached assets:** `globPatterns: ['**/*.{css,html,ico,png,svg,woff2}', 'push-sw.js']` — HTML and static assets only. **JS chunks are NOT precached.**
- **JS chunk strategy:** `NetworkFirst` with `networkTimeoutSeconds: 3`. On slow mobile (>3s), falls back to SW runtime cache. Runtime cache populated on first fetch — empty on first-ever page visit per device.
- **Supabase API:** `NetworkOnly` — never cached. Correct.
- **Custom SW script:** `push-sw.js` (imported via `importScripts`) — handles push notifications only. No fetch interception that would affect app loading.
- **index.html caching:** Precached by SW (included in `**/*.html` glob). SW serves fresh `index.html` on reload/navigation after SW update. But `vercel.json` sets NO explicit `Cache-Control: no-cache` header for `index.html`. Browser-level cache headers depend on Vercel defaults (typically `cache-control: public, max-age=0, must-revalidate` for the CDN edge, which is adequate, but not explicitly set).
- **Stale chunk window:** During a deploy, the old SW continues serving until the new SW activates. Users with the app open during deploy have old `index.html` (old chunk URLs). When new SW activates, `index.html` is updated in precache. On next navigation/reload: new chunk URLs requested → runtime cache miss → NetworkFirst → 3s timeout → if slow network, stale chunk served (wrong version). `lazyRetry` handles this for route-level pages.

### Realtime

- **Channel count:** 12 channels (post `791e52b` fix).
- **Cleanup count:** 13 removeChannel calls (authStore has 2 for its 1 channel: one on SIGNED_OUT, one on re-subscribe).
- **All channels verified:** Every channel has a matching `removeChannel` in useEffect cleanup or on SIGNED_OUT.
- **onAuthStateChange:** Registered in exactly one place (authStore). ResetPassword.jsx registers its own for the password-change flow only.
- **Deps after fix:** All channel useEffects use stable deps (IDs only). WritingTab.jsx fixed in `791e52b` to use `useRef` guard instead of `aiFeedback` in deps.

---

## Anti-Pattern Audit (10 patterns)

| # | Pattern | Status | Count | Notes |
|---|---------|--------|-------|-------|
| A | Stale chunks / no lazyRetry | AMBIGUOUS | 54 inner lazy() without retry | Route pages covered; inner tabs/components not covered |
| B | `enabled` auth race | FOUND | 114 profile-gated, 6 double-condition | Profile briefly null on fetchProfile error; two-set() atomicity gap |
| C | `isLoading` vs `isPending` (v5) | NOT FOUND (for skeletons) | 464 isLoading / 274 isPending | isPending in pages is for mutations, not skeleton guards |
| D | No error state, no empty state | AMBIGUOUS | ~20% of pages | Error handling present but inconsistent depth |
| E | `invalidateQueries` in auth handler | FOUND | 1 location: TOKEN_REFRESHED | Marks all active queries stale on every token refresh |
| F | Multiple Supabase client instances | NOT FOUND | 1 createClient call | Singleton confirmed |
| G | Router blocks on suspended content | NOT FOUND | 0 startTransition calls | React Router v6 handles internally |
| H | SW serves stale chunks | AMBIGUOUS | NetworkFirst 3s timeout | Stale fallback possible on slow mobile; lazyRetry covers routes only |
| I | Zustand bare store selector | FOUND | 179 useAuthStore() with no selector | All 179 re-render on any store change |
| J | RLS silent-empty-return | AMBIGUOUS | Cannot verify without DB access | Known to have caused is_published=true outage; present risk |

---

## Top 3 Root Cause Candidates (ranked)

### #1 — No Per-Query Fetch Timeout on Supabase DB Queries

**Evidence:**
- `src/lib/supabase.js:10` — `createClient()` has no `global: { fetch: ... }` option (no timeout wrapper)
- `src/lib/invokeWithRetry.js:68` — Edge Function calls DO have `AbortController` timeout (default 30s); DB queries do not
- `src/lib/queryClient.js` — React Query `retry` logic only fires AFTER the fetch returns an error; a hanging fetch (no error, no response) bypasses retry entirely

**Mechanism:** On mobile with degraded signal, a TCP connection is established to Supabase PostgREST, but data never flows. The `fetch()` call hangs indefinitely — it will not timeout unless the OS/browser terminates it (Chrome has no default HTTP timeout; connections can hang 60–300+ seconds). React Query sees `fetchStatus: 'fetching'` → `isLoading: true` the entire time. The skeleton shows. The user can't interact. A page refresh calls `window.location.reload()` which aborts all in-flight fetches and starts clean. Network resumes → fetch completes in <1s. User thinks the app "fixed itself."

**Matches symptom tests:**
- ✅ Any page — every page has at least 3–8 Supabase queries; all are vulnerable
- ✅ Any user — any user on a degraded mobile connection (subway, elevator, weak WiFi)
- ✅ Intermittent — only happens when TCP hangs, not on normal connections
- ✅ Worse after navigation — navigating to a new page fires additional queries; more chances to hang
- ✅ Survives prior fixes — none of the 5 fixes touched query timeout or Supabase client config

**Fix scope:** 1 file (`src/lib/supabase.js`) — add `global: { fetch: timeoutFetch(20000) }` wrapper. Or 1 utility + 1 config file change. ~30 lines, low risk. Alternatively, add `.abortSignal(AbortSignal.timeout(20000))` to critical queries via a shared `queryFn` wrapper.

**Confidence: HIGH**

---

### #2 — TOKEN_REFRESHED + `queryClient.invalidateQueries` + 179 Bare Zustand Subscribers

**Evidence:**
- `src/stores/authStore.js:85` — `queryClient.invalidateQueries({ type: 'active' })` on every TOKEN_REFRESHED
- `src/App.jsx:486` — visibility handler calls `supabase.auth.refreshSession()` throttled to 2 min (every tab return after 2+ min idle = new token refresh = new invalidation)
- 179 `useAuthStore()` calls with no selector (grep confirmed): every authStore `set()` re-renders all 179 simultaneously
- TOKEN_REFRESHED fires `set({ user: session.user })` → all 179 subscribers re-render

**Mechanism:** User switches to another tab (email, WhatsApp) for ≥2 minutes, then returns. Visibility handler fires `refreshSession()`. Supabase fires TOKEN_REFRESHED → authStore does two things in sequence: (a) `set({ user })` — 179 Zustand consumers re-render simultaneously; (b) `queryClient.invalidateQueries({ type: 'active' })` — all queries on the current page are marked stale. On low-end phones (entry-level Android, common among students), 179 synchronous React re-renders produce a 100–500ms UI freeze. Combined with the stale queries, the next user action (tap navigation) triggers `refetchOnMount: true` on remounted queries. If any of those refetches hang (→ #1), the effect is compounded: the UI is already jank from the re-renders, then freezes further from the hanging fetch.

**Matches symptom tests:**
- ✅ Any page — all pages use authStore consumers
- ✅ Any user — all users on any device get token refreshes
- ✅ Intermittent — only after 2+ minute tab background
- ✅ Worse after navigation — navigation is what triggers the refetch storm on stale queries
- ✅ Survives prior fixes — none touched authStore TOKEN_REFRESHED or Zustand selectors

**Fix scope:** 2 files — (a) authStore.js: change TOKEN_REFRESHED to NOT invalidate queries (or use `invalidateQueries({ stale: true })` with a grace period); (b) convert 179 bare `useAuthStore()` calls to field-specific selectors (e.g., `useAuthStore(s => s.profile)`). The Zustand selector change is large surface area (~30 files) but mechanical. ~2–4 hours.

**Confidence: MEDIUM** (explains jank and cascading slowness, but alone doesn't explain "stuck forever until refresh" — that requires #1)

---

### #3 — SW NetworkFirst 3s Timeout + 54 Inner `lazy()` Without `lazyRetry`

**Evidence:**
- `vite.config.js:68` — `handler: 'NetworkFirst', options: { networkTimeoutSeconds: 3 }` — comment in the file explicitly says this was the cause of prior stuck loading
- `vite.config.js:52` — `globPatterns: ['**/*.{css,html,ico,png,svg,woff2}']` — JS chunks NOT precached; only runtime-cached after first fetch
- `src/pages/student/curriculum/UnitContent.jsx:22–30` — 9 tab imports using `React.lazy()` without `lazyRetry`
- Total inner component lazy: 54 imports without retry coverage

**Mechanism:** After a new deploy, a user with the app open (old `index.html` in memory) navigates to a page. The new SW has taken over. When the user opens a tab inside UnitContent (e.g., Grammar tab), `React.lazy()` fetches the grammar chunk URL from the old `index.html`. The new SW tries NetworkFirst for the old chunk URL. If:
- (a) Network is fast → 404 from Vercel (old hash gone) → no SW cache fallback → `React.lazy` rejects → `<SectionErrorBoundary>` catches → shows section error UI (not stuck skeleton)
- (b) Network is slow (>3s) → SW serves old cached version → stale chunk imports correctly (same code, just old) → works but potentially inconsistent behavior

On route-level pages, `lazyRetry` handles case (a) with a page reload. But the 54 inner lazy imports have no retry: case (a) shows error UI; users may not realize what happened.

This does NOT cause "stuck skeleton forever" — it causes error states. But error fallback UIs in some components are minimal or invisible, which users may interpret as "loading but never resolves."

**Matches symptom tests:**
- ✅ Any page — inner lazy() calls are across student, admin, trainer pages
- ✅ Any user — affects any user post-deploy
- ⚠️ Intermittent — only during/after deploy transitions
- ✅ Worse after navigation — each navigation might trigger a new inner lazy() import
- ✅ Survives prior fixes — NetworkFirst was the fix; inner lazy() was never addressed

**Fix scope:** 1 utility file (already exists: `lazyRetry.js`) + edit to 54 call sites. Or: wrap all inner `lazy()` with a shared `safeLazy()` that calls `lazyRetry`. ~1–2 hours. Low risk.

**Confidence: LOW–MEDIUM** (explains post-deploy errors, not the day-to-day persistent stuck loading)

---

## Why Prior Fixes Missed This

All five prior fixes (console stripping, desktop hotspot profiling, runtime overhaul with AuroraBackground, tab remounting elimination, Realtime channel leak cleanup) optimized local performance — bundle size, mount frequency, JS object accumulation. None of them examined the **network layer between React Query and Supabase**: the fact that `.from().select()` queries have no timeout means any network degradation produces an indefinite loading state that is architecturally invisible to React, React Query, and the service worker. The symptom looks identical to a "page loading" state because the loading skeleton is correctly shown — it's just never dismissed. This is the failure mode that survived all five rounds: not too much JS, not too many re-renders, not too many channels — **a missing exit condition on the network I/O itself.**

---

## Recommended Next Step

**Fix #1 only (surgical, lowest risk):** Wrap the Supabase client's `fetch` option with a `AbortController` timeout (20 seconds). All Supabase DB queries inherit the timeout automatically. When a request hangs >20s, it aborts → React Query sees a network error → retries up to 2× → after retries exhausted, query enters `status: 'error'` → `isLoading: false` → components that handle `isError` show retry UI; components that don't show empty state. Either is better than an indefinitely stuck skeleton.

This is 1 file change (`src/lib/supabase.js`), ~10 lines, no behavior change on normal connections (timeout is well beyond the P99 response time for Supabase queries on good network). It can be verified immediately: open DevTools → Network tab → throttle to "Slow 4G" → navigate to a page → observe that query now fails after 20s with an error (instead of hanging indefinitely).

**Alternatives considered:**
- Fix all 3 simultaneously: higher scope, harder to attribute regression if introduced
- Fix #2 (Zustand selectors) first: improves perceived performance but doesn't fix the fundamental hang
- Add browser-level instrumentation before any fix: cleanest data, but Ali's time has already been spent on 5 guesses; #1 is clear enough from the code to act on

**Rejected approach:** Adding per-query `signal` to every `useQuery` call — too many call sites (550 queries), too much churn. The Supabase client `fetch` wrapper applies globally with one change.

---

## Open Questions for Ali

1. **Is the stuck loading always on mobile, or also on laptop?** If laptop only → suspect #3 (deploy-related). If mobile only → confirms #1 (network hang). If both → #1 and #2 together.

2. **Does it happen immediately after opening the app, or only after using it for 10+ minutes?** Immediately → likely #3. After extended use → likely #1 (#2 amplifies after 2+ minutes idle).

3. **When it gets stuck, does refreshing always fix it? Or does it sometimes fix after 30–60 seconds by itself?** If self-heals → request eventually completed (slow network, not infinite hang). If ONLY refresh fixes it → confirms #1 (request was hung until aborted by reload).

4. **Which students are most affected?** Students on mobile data (not WiFi) would confirm #1. All students equally → points toward #2 or #3.
