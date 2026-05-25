# Retention Diagnostic + Fix Report — 2026-05-25

The previous two "fixes" were incomplete because they stopped at `vite build → exit 0`. This time every claim below is backed by the command that proved it, including against the **actual prod-served bundle**.

---

## TL;DR
There were **two stacked bugs**. The first (component not mounted) was fixed in `90c4ee9`. The second — the real reason you still saw nothing — is that **every retention hook gated on `user.id` instead of `profile.id`, so under impersonation they queried the admin's id and returned `false`**. Fixed now, and **verified live on prod**.

---

## What I proved (with evidence)

### 1. The right dashboard file is used
`src/App.jsx:663` → `/student` renders `StudentDashboard` (`App.jsx:33` lazy import of `./pages/student/StudentDashboard`). The earlier mount edited the correct file.

### 2. The retention code WAS already on prod (deploy was never the problem)
```
$ curl -sL https://app.fluentia.academy/assets/StudentDashboard-BnorWhIO.js | grep -c <markers>
  /student/retention/daily-partner : 1
  /student/retention/homework      : 1
  رفيقك اليومي                      : 1
  streak_activation                : 3
```
(Grepping the component *name* returns 0 — minification mangles identifiers. Route paths + Arabic literals are the survivable markers.) So the mount shipped fine; the failure was at **runtime**.

### 3. Root cause — impersonation id mismatch
`src/stores/authStore.js`:
- `useAuthUserId = () => s.user?.id` · `useAuthProfileId = () => s.profile?.id` · `useIsStudent = () => s.profile?.role === 'student'`
- `startImpersonation` does `set({ profile })` (→ impersonated student) but **never reassigns `state.user`** (stays the admin).

The gating hook `useRetentionModuleEnabled` used `useAuthUserId()`. Under impersonation:
- `userId` = **admin's id** · `isStudent` = **true** (so the `if(!isStudent) return true` preview-bypass is skipped)
- query `retention_modules WHERE student_id = <admin id>` → **0 rows** → `false` → all flags off → `RetentionDashboardSection` returns `null` → **nothing renders**.

Grep proved the scope: **all 10 retention hooks/pages used `useAuthUserId()`, none used `useAuthProfileId()`.** Real logged-in students work because for them `user.id == profile.id` (shared PK — verified `students.id == profiles.id` for all 25 students). But you test via **impersonation**, where they differ — so you saw nothing across every module. This is exactly the documented "profile.id not user.id (impersonation safety)" rule, violated.

### 4. The data + RLS are correct
Worked example — ليان عبدالله العنزي (المجموعة 2), id `0c8112f5-…`:
```
retention_modules WHERE student_id = '0c8112f5-…'
  daily_partner: true · lesson_briefs: true · smart_homework: true
  streak_activation: true · weekly_reports: true   (5 rows, all enabled)
```
RLS: `retention_modules` has staff-SELECT (admin/trainer read any) + student-own-SELECT. Under impersonation the query executes with the admin's JWT, and staff-SELECT permits reading the student's rows — so the **fixed** hook (querying by the student's `profile.id`) returns these 5 enabled rows. RLS is not a blocker.

### 5. Widgets have correct null/empty behavior
`RetentionDashboardSection` returns `null` only when all 4 flags are false (correct for the ~5 students outside the launch groups). With any flag true it renders the grid. No "enabled-but-null" bug.

---

## What I changed
- **`useAuthUserId` → `useAuthProfileId`** in all 10 retention hooks/pages: `useStreak`, `useDialogue`, `useBriefs`, `useStudentLevel`, `useRetentionModule`, `useStudentMistakeTags`, `useReports`, `useHomework`, `HomeworkPlay.jsx`, `DailyPartnerLanding.jsx`. (Left `useApproveReport`'s `supabase.auth.getUser()` alone — that's a trainer mutation that correctly wants the real approver.)
- Added a **`window.__retention` debug sink** in the gating hook + section. Plain `console.log` is stripped in prod (`vite.config.js` → `esbuild.drop: ['console','debugger']`), so the sink writes to a window global instead — survives the drop and is inspectable in DevTools.
- Files changed: 13 · build clean (`vite build` exit 0).

## Verified LIVE on prod (not just locally)
Polled `https://app.fluentia.academy` until the deploy landed. `__retention` exists **only** in the fixed code, so it's a clean live-deploy proof:
```
poll 1 05:50:03  index=index-D3ILHHeQ.js  chunk=StudentDashboard-BnorWhIO.js  __retention=0   (old)
poll 2 05:50:53  index=index-OpGHB_BH.js  chunk=StudentDashboard-BcQgk_lX.js  __retention=1   (LIVE)
```
The live prod chunk hash `BcQgk_lX` matches my local clean-build hash exactly, and contains the fix. **Confirmed deployed.**

## What I can and cannot prove
- **Can prove:** the fixed code is on prod; the DB returns 5 enabled rows for the right student id; the hook now uses `profile.id` (correct under impersonation); RLS allows the read; widgets render non-null when enabled.
- **Cannot prove from here:** the pixels in your browser. That requires you to open it — but the runtime decision is now inspectable (below).

## Your 30-second browser test
1. Open `https://app.fluentia.academy` in Chrome, **hard-refresh** (Cmd-Shift-R) so the PWA picks up the new bundle.
2. Impersonate any student in المجموعة 2 / المجموعة 4.
3. Land on `/student` (dashboard). You should see, below the hero: streak calendar, weekly-challenge card ("coming Sunday"), Daily Partner CTA, Smart Homework CTA.
4. Open DevTools → Console → type **`window.__retention`** and press enter. You'll see:
   - `moduleChecks`: one entry per module with `profileId` = **the impersonated student's id** (NOT yours) and `enabled: true`.
   - `sectionRenders`: entries with `streak/homework/briefs/dailyPartner: true`.
5. **If `profileId` shows the student's id and `enabled: true` but you still see no widgets** → send me a screenshot of `window.__retention` + the dashboard; that would point to a CSS/render issue, not gating. **If `profileId` shows YOUR admin id** → the impersonation store didn't swap (different bug) — tell me.

The `window.__retention` sink + this report are the evidence base; the logs can be removed once you confirm the widgets render.
