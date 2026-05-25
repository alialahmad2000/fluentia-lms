# Retention "students see nothing" — diagnostic findings (2026-05-25)

Evidence-based diagnosis per RETENTION-AGGRESSIVE-DIAGNOSIS. No claim below is made without the command that proved it.

## 1.1 — Which dashboard renders on the student route
`src/App.jsx:663` → `<Route path="/student" element={<Page><StudentDashboard /></Page>} />`
`src/App.jsx:33` → `const StudentDashboard = lazyRetry(() => import('./pages/student/StudentDashboard'))`
**→ `src/pages/student/StudentDashboard.jsx` is the correct, rendered component.** The previous mount edited the right file.

## 1.2 — Is the retention code on PROD? (the rigorous check)
- Prod URL: `https://app.fluentia.academy` (HTTP 200).
- Prod index references `index-D3ILHHeQ.js`; the dashboard is lazy-split into `StudentDashboard-BnorWhIO.js`.
- Downloaded `https://app.fluentia.academy/assets/StudentDashboard-BnorWhIO.js` (119,129 bytes) and grepped **strings that survive minification**:
  - `/student/retention/daily-partner` → 1
  - `/student/retention/homework` → 1
  - `رفيقك اليومي` → 1
  - `streak_activation` → 3
- **The retention mount IS deployed to prod.** (Grepping the component *name* `RetentionDashboardSection` returns 0 even locally — minification mangles identifiers — which is why the earlier "grep the name" instinct is misleading. Route strings + Arabic literals are the correct survivable markers.)

**Conclusion of 1.1/1.2: deploy is fine, code is on prod. The bug is at runtime, not in the build/deploy.**

## 1.3 — The impersonation flow (THE BUG)
- `src/stores/authStore.js` selectors:
  - `useAuthUserId = () => s.user?.id` (line 305)
  - `useAuthProfileId = () => s.profile?.id` (line 307)
  - `useIsStudent = () => s.profile?.role === 'student'` (line 334)
- `startImpersonation` (lines 178–216): sets `_realProfile`, `impersonation`, then **`set({ profile })`** with the impersonated student's profile + `studentData`. It **never reassigns `state.user`** — `user` stays the admin's auth user.
- The gating hook `useRetentionModuleEnabled` used **`useAuthUserId()`** (= `user.id`). So during impersonation:
  - `userId` = **admin's id** (user unchanged)
  - `isStudent` = **true** (profile.role = 'student') → the `if (!isStudent) return true` preview-bypass is **skipped**
  - query: `retention_modules WHERE student_id = <admin id>` → **0 rows** → returns `false`
  - → all 4 module flags false → `RetentionDashboardSection` hits `return null` → **nothing renders under impersonation.**
- This violates Ali's standing rule: *"Always `profile.id` not `user.id` (impersonation safety)."*
- **Scope:** EVERY retention hook used `useAuthUserId()` — confirmed via grep (10 files, 0 used `useAuthProfileId`). Real logged-in students happen to work because for them `user.id == profile.id` (shared PK, verified: `students.id == profiles.id` for all 25 students). But Ali only tests via **impersonation**, where `user.id != profile.id`, so he sees nothing across all modules.

## 1.4 — Data path (prod) for a real target student
- 20 active students in المجموعة 2 (12) + المجموعة 4 (8); `students.id == profiles.id` for all.
- `retention_modules WHERE student_id = <student>` → 5 rows, all `enabled=true` (verified for the cohort: 100 enabled rows, 20 per module).
- RLS: `retention_modules` has staff-SELECT (admin/trainer read all) + student-own-SELECT. Under impersonation the query runs with the **admin's** JWT, and staff-SELECT permits reading any student's row — so the fixed hook (querying by the student's `profile.id`) returns the correct rows under impersonation. For real students, student-own-SELECT covers it. **RLS is not the blocker.**

## 1.5 — Widget empty states
- `RetentionDashboardSection` returns null only when ALL four module flags are false (correct — for the ~5 students outside the launch groups). With any module enabled it renders the grid. Sub-cards (streak calendar, challenge, homework CTA, daily-partner CTA) render their own enabled-state content; `PendingBriefsCard` is intentionally null when no brief is pending. No "enabled-but-null" bug found.

## 1.6 — Service worker / caching
- PWA SW is `push-sw.js` (push only) + vite-pwa generateSW. `version.json` was bumped on the prior mount commit. Not the cause — the prod chunk already contains the mount; the runtime hook was the failure.

## Root cause (single, confirmed)
Two independent bugs stacked:
1. **(fixed previously, 90c4ee9)** `RetentionDashboardSection` was never mounted in `StudentDashboard.jsx`.
2. **(this fix)** All retention hooks gated on `useAuthUserId()` (admin's `user.id` under impersonation) instead of `useAuthProfileId()` (the impersonated student's `profile.id`). Under impersonation — Ali's only test path — every module resolved to `false` and the section rendered null.

## Fix applied
- Renamed `useAuthUserId` → `useAuthProfileId` across all 10 retention hooks/pages (left the trainer-approval `supabase.auth.getUser()` in `useReports.useApproveReport` alone — that correctly wants the real approver).
- Added a `window.__retention` debug sink (survives the production `console` drop) in the gating hook + section so the runtime decision is inspectable in DevTools.
