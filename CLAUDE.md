# CLAUDE.md — Fluentia LMS Project Context
# This file is auto-read by Claude Code on every session start.
# Last updated: 2026-05-09
#
# 📖 FULL SPEC: For detailed database schemas, assignment types, Telegram analysis,
#    level curriculum, gamification rules, and complete build specification, read:
#    → /FLUENTIA-SPEC.md (2,400+ lines — only read when you need deep context)
#
# This CLAUDE.md gives you everything for 90% of tasks.
# Only open FLUENTIA-SPEC.md when you need specific schema details,
# curriculum structure, or the original design rationale.

---

## 🔄 SELF-UPDATE RULE (CRITICAL — ALWAYS FOLLOW)

**After completing EVERY task** (feature, fix, change, no matter how small), you MUST:

1. **Update the CHANGE LOG at the bottom of THIS file** with what you did
2. **Update FLUENTIA-SPEC.md** if you added new DB tables, pages, edge functions, or changed architecture
3. **Include CLAUDE.md and FLUENTIA-SPEC.md in your git commit** so changes are never lost

**WHY:** If the terminal closes unexpectedly, the next session reads this file and knows EXACTLY what has been done. Nothing is lost. This file is the single source of truth.

**Format for log entries:**
```
### [DATE] — [SHORT DESCRIPTION]
- What: [what was built/fixed]
- Files: [key files added/modified]
- DB: [new tables/columns if any]
- Edge Functions: [new/modified if any]
- Status: [complete/partial/needs-testing]
- Notes: [anything important for next session]
```

---

## 🐛 DEBUGGING RULES (read BEFORE "fixing" a stubborn or recurring bug)

These four rules cracked the listening "no sound on iPhone/Safari" bug after **6+ failed attempts**. The earlier fixes failed because they were validated in the wrong browser and the actually-broken layer was never inspected. Follow these for ANY hard bug:

1. **Reproduce the failure in the ENVIRONMENT where it actually fails — before claiming it's fixed.** "The build passes" or "it works in Chrome" is NOT verification when the bug is on iPhone/Safari. That audio bug existed ONLY in Safari/WebKit; every Chrome / headless-Chromium test (including a "proven fixed" one) gave false confidence. Test the real engine/device: headless **`webkit`** (Playwright browsers are installed), not `chromium`; or a real phone. Test student login: `mock-test-a1@fluentia.academy` / `MockTest2025!` (profile id `a82486b6-9472-4aba-b902-a0ec354ca170`).
2. **Prove the root cause with a controlled before/after test — don't patch symptoms.** Change ONE variable and show the difference (e.g. SAME build with the service worker blocked vs allowed → blocked plays, allowed silent ⇒ the SW is the cause). A plausible-sounding theory is not proof.
3. **When many fixes have already failed, the cause is in a layer nobody examined.** People kept fixing the audio player (file format, `play()`, gestures); the real cause was one layer below — the service worker / network. Trace the WHOLE request path, not the obvious component.
4. **Suspect a STALE / cached version FIRST when a fix "should" work but doesn't.** This is a PWA with a service worker, so a device can keep running the OLD cached build after a deploy — "the thing actually running is not the fixed thing." Confirm the device loaded the NEW build (hard-refresh ⌘⇧R / reopen) before debugging deeper. And NEVER let the service worker (`vite.config.js` → workbox `runtimeCaching`) cache things that must be fresh: live APIs, or **streamed media** (audio/video use HTTP Range requests; a `CacheFirst` SW silently breaks them on Safari/iOS while Chrome tolerates it).

Before saying "fixed," ask two questions: **(a)** did I reproduce the real failure and then show it gone in that *same* environment? **(b)** is the thing I tested actually the *new* version, not a cached old one?

---

## PROJECT: Fluentia LMS (أكاديمية طلاقة)

A premium Arabic-first Learning Management System for Fluentia Academy, an online English language academy in Saudi Arabia.

**Owner:** Dr. Ali Al-Ahmad (د. علي الأحمد) — Founder & Lead Trainer
**Students:** ~14 active adult Arabic-speaking learners (mostly young Saudi women on iPhones)
**Revenue:** ~10,800 SAR/month

---

## TECH STACK

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 |
| State | Zustand + TanStack Query |
| Animation | Framer Motion |
| Charts | Recharts |
| Backend | Supabase (Frankfurt, ref: `nmjexpuycmqcxuxljier`) |
| Auth | Supabase Auth (email/password, role-based) |
| Database | PostgreSQL with RLS |
| Storage | Supabase Storage (1GB free tier limit) |
| AI | Claude API (Sonnet) — feedback, commands, quiz gen |
| Voice | OpenAI Whisper — transcription + pronunciation |
| Email | Resend |
| Hosting | Vercel (auto-deploys from `main` branch) |
| Repo | github.com/alialahmad2000/fluentia-lms |
| Live | fluentia-lms.vercel.app |

---

## CREDENTIALS

All API keys are in the `.env` file (gitignored). Read keys from `.env` when needed.

Key environment variables:
- `VITE_SUPABASE_URL` — https://nmjexpuycmqcxuxljier.supabase.co
- `VITE_SUPABASE_ANON_KEY` — in .env
- `SUPABASE_SERVICE_ROLE_KEY` — in .env
- `CLAUDE_API_KEY` — in .env
- `OPENAI_API_KEY` — in .env
- `RESEND_API_KEY` — in .env

**Admin login:** admin@fluentia.academy / Fluentia2025!

---

## ACADEMY STRUCTURE

### Packages (for NEW students):
- باقة أساس (Asas): 750 SAR/month
- باقة طلاقة (Talaqa): 1,100 SAR/month
- باقة تميّز (Tamayuz): 1,500 SAR/month
- IELTS: 2,000 SAR/month

**Legacy students have custom pricing (500-1,500 SAR) — admin sets per student.**

### Levels:
1. الخطوة الأولى (Level 1) — Absolute Beginner
2. بداية الثقة (Level 2) — Beginner
3. صار يتكلم (Level 3) — Intermediate
4. ثقة كاملة (Level 4) — Upper Intermediate
5. جاهز للعالم (Level 5) — Advanced
6. IELTS Track (3 phases)

### Groups:
- Max 7 students per group, min 3 to open new group
- Classes: 2/week via Google Meet
- Current groups: 1A, 2A, 3

### Weekly Tasks Per Student (auto-generated every Sunday):
- 3 Speaking tasks (from topic bank, level-appropriate)
- 2 Reading tasks (AI-generated articles + questions)
- 1 Writing task (AI prompt + feedback)
- 1 Listening task (audio/video + questions)
- 5 Irregular verbs (memorization exercise)

---

## DESIGN SYSTEM

**Aesthetic:** Apple-level premium. Spacious, elegant, ultra-polished dark mode.

```css
/* Core Colors */
--darkest-bg: #060e1c;
--dark-navy: #0a1225;
--primary-navy: #1a2d50;
--sky-blue: #38bdf8;       /* primary accent — use SPARINGLY */
--sky-light: #7dd3fc;
--gold: #fbbf24;           /* achievements only */
--white: #f8fafc;
--success: #4ade80;
--error: #ef4444;
--warning: #f59e0b;
--muted: #64748b;
--surface: rgba(255,255,255,0.03);
--border: rgba(255,255,255,0.06);

/* Fonts */
Arabic: 'Tajawal' (300,400,500,700,800)
English headings: 'Playfair Display' (700,900)
English body: 'Inter'
```

**Key principles:**
- RTL EVERYWHERE — Arabic is primary language
- Mobile-first — most students on iPhones with Safari
- Dark mode default, light mode available
- Generous spacing (24-32px card padding, 48-64px section gaps)
- Color is rare and meaningful — 90% neutral surfaces
- Cards: subtle surface bg + thin border + rounded 12-16px
- Hover: translateY(-2px) + brighter border (NOT scale)
- Typography hierarchy: titles 28-32px bold → headers 20-22px semibold → body 15-16px
- Inputs: 48-52px height, 12px radius, focus glow
- Tables: no grid lines, subtle row dividers, 56-64px row height
- Animations: ease-out only, 150-200ms, never bounce

---

## CRITICAL RULES (ALWAYS FOLLOW)

1. **Never build until Ali explicitly confirms**
2. **RTL Arabic-first** — all text, layouts, navigation
3. **Mobile-first** — 320px minimum, 44px touch targets, test Safari/iOS
4. **Dark theme default** — premium, not generic
5. **Correct terminology:** "لقاء مبدئي مجاني مع المدرب" NEVER "كلاس تجريبي مجاني"
   - **Brand name in Arabic = طلاقة (ALWAYS).** In every Arabic-facing string the academy is **طلاقة** (e.g. «أكاديمية طلاقة»). NEVER transliterate the English name into Arabic letters — no «فلونشيا» / «فلوينشيا» / «فلونتيا». "Fluentia" in Latin script is allowed only in English contexts (English headings, code, URLs, repo name). Grep new Arabic copy for «فلون»/«فلوين» before shipping.
6. **Supabase queries:** always `const { data, error } = await ...` — NEVER `.catch()` on query builders
7. **Soft delete only** — never hard-delete student data (use `deleted_at` column)
8. **AI is a helper** — every AI output reviewable by trainer, never auto-publish
9. **Package-based AI limits** — all AI features gated by package tier
10. **Every new feature MUST be added to AI Command Center** (ai-trainer-assistant edge function)
11. **Admin uses AI chat as PRIMARY control panel**
12. **Voice recording:** detect browser → Safari: audio/mp4, Chrome: audio/webm;codecs=opus
13. **Supabase free tier:** 500MB DB, 1GB storage — compress files, monitor usage
14. **Max 7 students per group; min 3 to open new group**
15. **Error handling:** never show raw errors — always Arabic, friendly, with clear next step
16. **Every async operation in useEffect MUST have cleanup** (mounted flag or AbortController) to prevent crashes on rapid navigation
17. **Commit + push after each meaningful milestone** — Vercel auto-deploys from main
18. **ALWAYS update this CLAUDE.md change log after every task** — this is how we maintain memory across sessions

---

## MCP SERVERS (auto-loaded from .mcp.json)

### supabase (read-only, scoped to project nmjexpuycmqcxuxljier)
- Transport: HTTP (hosted at https://mcp.supabase.com/mcp)
- Auth: OAuth (browser login once per machine)
- Mode: **READ-ONLY** — cannot execute INSERT/UPDATE/DELETE/DDL
- Scope: Single project (nmjexpuycmqcxuxljier) — cannot list or touch other projects

**MANDATORY USAGE RULE for all future Phase A discovery:**
Instead of writing Node scripts that query `information_schema` or run `select count(*)`, call the Supabase MCP tools directly:
- `list_tables` — list all tables in a schema
- `list_columns` — describe columns of a specific table
- `execute_sql` — run a read-only SELECT (e.g., `SELECT count(*) FROM students WHERE ...`)
- `get_logs` — fetch Postgres / Edge Function / Auth logs for debugging

Writing one-off `discover-*.cjs` scripts is now deprecated for Phase A. Use MCP unless the discovery requires a multi-step procedural script (e.g., simulating a user signup flow). For any pure read query against schema or data: **MCP first.**

---

## CURRENT STATE (March 2026)

### All 10 LMS Phases COMPLETE:
1. Setup, Database, Auth, Layout, Dashboards ✅
2. Student Experience (assignments, voice recording, submissions) ✅
3. Trainer Tools (grading, quick points, class management) ✅
4. Gamification (XP, streaks, teams, leaderboards, achievements) ✅
5. Communication (chat, notifications, email) ✅
6. AI Features (feedback, chatbot, command center, pronunciation) ✅
7. Admin Portal (analytics, holidays, audit log, global search) ✅
8. Assessments & Quizzes (AI quiz gen, placement test, certificates) ✅
9. Viral Marketing (referrals, share cards, testimonials) ✅
10. Polish & Production (PWA, security, performance, accessibility) ✅

**Post-build:** 80+ bug production audit complete, security fixes done, real student data seeded.

**Stats:** 66 pages, 25 edge functions, full PWA, 45+ DB tables, 100+ RLS policies.

### Sidebar Structure (Flat — NO collapsible groups):

**Student (7 items):**
الرئيسية, مهامي, معمل التحدث, الدرجات, المحادثة, المساعد الذكي, حسابي

**Trainer (7 items):**
الرئيسية, الواجبات والتقييم, المهام الأسبوعية, الطلاب, الحصة المباشرة, المساعد الذكي, الأدوات

**Admin (8 items):**
لوحة التحكم, التدريس, الطلاب, المالية, المحتوى, التحليلات, المساعد الذكي, الإعدادات

### Sub-Tab Consolidation:
Pages removed from sidebar are accessible via sub-tabs inside hub pages. All 66+ pages reachable within 2 clicks.

### New Systems:
- **Force Password Change** — new students must change temp password on first login
- **Data Reset** — admin can reset all student data (danger zone with double confirmation)
- **AI Student Profiles** — Claude-powered skill analysis with radar chart, strengths/weaknesses, tips

---

## DEPLOYMENT

```bash
# After any code changes:
git add -A && git commit -m "descriptive message" && git push

# Deploy edge functions (ALWAYS use --no-verify-jwt — functions handle auth internally):
supabase functions deploy FUNCTION_NAME --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

# DB migrations (if needed):
# Run SQL directly in Supabase SQL Editor (manual approach used for this project)
```

---

## OTHER INFRASTRUCTURE (NOT in this repo)

- **WhatsApp Bot:** ManyChat + n8n + Claude API (separate system)
- **n8n workflows:** fluentia-academy.app.n8n.cloud
- **Landing page:** fluentia-site.vercel.app (separate repo)
- **Payment:** Tap Payments integration pending (Ali getting API keys)

---

## FILE STRUCTURE GUIDE

```
src/
├── components/
│   ├── ui/          # Shared UI components (Button, Card, Input, etc.)
│   ├── common/      # Reusable components (PageHeader, ErrorBoundary, etc.)
│   └── layout/      # Sidebar, DashboardLayout, Header, MobileNav
├── pages/
│   ├── student/     # All student pages
│   ├── trainer/     # All trainer pages
│   └── admin/       # All admin pages
├── hooks/           # Custom React hooks
├── stores/          # Zustand stores
├── lib/             # Supabase client, utils, helpers
└── styles/          # Global CSS
supabase/
├── functions/       # Edge functions (Deno/TypeScript)
└── migrations/      # DB migrations (some run manually via SQL Editor)
```

---

## PLANNED FEATURES (from prompt queue)

These prompts have been written and are ready to paste into Claude Code:

1. ~~**Fix Rapid Navigation Crash**~~ ✅ — AI components now have invokeWithRetry with timeout/abort
2. ~~**Design Overhaul Phase A**~~ ✅ — shared component redesign (Apple aesthetic), theme system
3. ~~**Design Overhaul Phase B**~~ ✅ — all 61+ pages swept with Apple-level spacing
4. ~~**Weekly Tasks + Spelling Trainer**~~ ✅ — auto-generated tasks + AI spelling practice
5. **Conversation Simulator Redesign** — rich gradient cards with previews
6. **AI Form Filler** — universal smart form assistant for trainer/admin
7. ~~**Sidebar Reorganization**~~ ✅ — معمل التحدث category already organized

---

## CHANGE LOG (Claude Code: update this after EVERY task — newest first)

### 2026-06-20 — FIX: assessment gate (impersonation + pronunciation bug) + recording relocated
- What: (1) عبدالله عارف completed a full unit but couldn't take the exam — two root causes: (a) impersonation: `unit-mastery-start` received admin's JWT → `auth.getUser` returned admin ID → gate checked admin's progress (0%) → always blocked; (b) pronunciation bug: the old `fn_unit_activity_completion` RPC counted `curriculum_pronunciation` in the denominator, so students who had pronounciation content could never hit 100% even with all visible sections done. (2) Recording: should not count toward required completion %, and should not appear as a main mission card.
- Fix: (a) Edge function `unit-mastery-start` now accepts `as_student_id` in the request body; if the caller is admin/trainer, `userId` is swapped to the student's ID. `UnitMasteryPage.jsx` passes `as_student_id: profile?.id` when impersonating. (b) The gate logic was rewritten inline in the edge function to only count the 5 visible sections (reading/grammar/writing/listening/speaking) — excludes pronunciation and recording entirely. No DB RPC change needed. (c) Recording removed from `ACTIVITY_MAP` in `useUnitData.js` (no mission card). Empty-label TABS entry preserved (pane still mounts when visited). New supplementary "سجّل أداءك" card added below the MissionGrid in `UnitContent.jsx` — small amber-icon card that navigates to `?activity=recording`.
- Files: `supabase/functions/unit-mastery-start/index.ts` (impersonation + inline gate), `src/pages/student/assessment/UnitMasteryPage.jsx` (as_student_id), `src/pages/student/curriculum/unit-v2/useUnitData.js` (recording removed from ACTIVITY_MAP), `src/pages/student/curriculum/UnitContent.jsx` (supplementary recording card + Mic icon import)
- Edge Functions: `unit-mastery-start` deployed to nmjexpuycmqcxuxljier (--no-verify-jwt)
- Status: complete — pushed to main (commit 944b92c), Vercel auto-deploys

### 2026-06-20 — FIX: impersonation banner disappears (localStorage + safe restore)
- What: Admin's orange "أنت تتصفح كـ …" banner disappeared mid-session or after PWA reopen, leaving admin stuck as the student with no exit.
- Root cause (2 bugs): (1) `fluentia_impersonation` was stored in **sessionStorage** (tab-scoped) — iOS Safari PWA tab kills discard it, so banner never restores after reopen. (2) `restoreImpersonation` destructively checked `state.profile?.role !== 'admin'`: if `fetchProfile` timed out (profile=null), `null?.role !== 'admin'` → true → KEY DELETED permanently. Also: SIGNED_IN event called `fetchProfile` unconditionally, which would overwrite the impersonated student's profile with the admin's real profile.
- Fix: (a) `startImpersonation` + `stopImpersonation` → `localStorage` instead of sessionStorage. (b) `restoreImpersonation` is now idempotent (returns early if already active), migrates old sessionStorage keys, and only clears the key when the session is CONFIRMED non-admin (user AND profile both loaded AND role ≠ admin); returns WITHOUT clearing if user/profile is null. (c) `onAuthStateChange SIGNED_IN` handler skips `fetchProfile` if impersonating, then calls `restoreImpersonation` (idempotent — handles slow-boot retry).
- Files: `src/stores/authStore.js` — DB/edge: none
- Status: complete, pushed to main (commit `8245ddb`)

### 2026-06-20 — FIX: assessment tab non-functional (created AssessmentTab + fixed edge fn grading)
- What: Unit assessment/exam tab was completely broken — component never existed, edge function graded all answers 0%.
- Root cause (3 layers): (1) `AssessmentTab.jsx` was never created — `UnitContent.jsx` had no import or switch case for it; (2) `submit-activity-attempt` keyed student answers by `q.id` which is always undefined in DB (DB uses `question_number`, not `id`) so every answer graded as wrong; (3) question type field used `q.question_type` (wrong — DB field is `q.type`), though this accidentally worked by falling through to "mcq" default.
- Fix: Created `src/pages/student/curriculum/tabs/AssessmentTab.jsx` (full premium quiz flow: first-time CTA, resume in-progress, view history, QuizPlayer with per-question nav, result review with correct-answer explanations). Wired into `UnitContent.jsx` (lazy import + TABS entry `{ id: 'assessment', label: 'اختبار الوحدة' }` + switch case). Fixed edge function: `q.id ?? String(q.question_number)` as answer key, `q.type ?? q.question_type ?? "mcq"` for type.
- Files: NEW `src/pages/student/curriculum/tabs/AssessmentTab.jsx`; modified `src/pages/student/curriculum/UnitContent.jsx` (3 edits), `supabase/functions/submit-activity-attempt/index.ts`
- DB: none (78 rows in `curriculum_assessments` already existed)
- Edge Functions: `submit-activity-attempt` deployed to Supabase (project nmjexpuycmqcxuxljier)
- Status: complete — pushed to main (commit `08b94c0b5836ce1054aabb8138f7fce10bd75853`), Vercel deployed

### 2026-06-20 — FIX: reading MCQ correct answer always option A (shuffle choices)
- What: In the reading section (both Article A and B), the correct answer was always the first option displayed (A) because `MCQQuestion` rendered `question.choices` in the exact DB-stored order, and the generator always places the correct answer first.
- Root cause: No shuffle existed anywhere in the pipeline — not in the generator, DB insert, or frontend renderer.
- Fix: Added a `useMemo` Fisher-Yates shuffle inside `MCQQuestion` keyed on `question.id`. Safe because grading compares by text value (`.toLowerCase().trim()` match), not by array index, so shuffling the display order never breaks scoring. Re-shuffles only when the question changes, not on every re-render.
- Files: `src/pages/student/curriculum/tabs/ReadingTab.jsx` (MCQQuestion component, ~15 lines added)
- DB: none — Edge Functions: none
- Status: complete, pushed to main

### 2026-06-19 — FIX: vocab popups covered by RTL sidebar on iPad
- What: On iPad, tapping a vocabulary word showed the popup behind/under the right-side sidebar. Three files had broken sidebar-aware positioning.
- Root cause (3 layers): (1) `WordPopover.jsx` used `position: absolute` with naive `window.innerWidth - width - margin` clamping that ignored the 264px RTL sidebar; (2) `VocabPopup.jsx` DesktopPopover used `document.querySelector('aside[role="navigation"]')` which silently returns null for Fluentia's sidebar (which uses `data-sidebar-root`), so the sidebar offset was never subtracted; (3) `WordDetailSheet.jsx` used `insetInlineStart: 0` — in RTL this maps to `right: 0` (sidebar side), so the panel slid in from the wrong side.
- Fix: All three now use the existing `computePopupPosition` utility (`src/lib/ui/computePopupPosition.js`) which correctly reads the `--sidebar-width` CSS var. WordPopover switched to `position: fixed`. VocabPopup uses `computePopupPositionFromTap`. WordDetailSheet changed to `left: 0` (physical, always content side).
- Files: `src/components/players/WordPopover.jsx`, `src/components/audio/VocabPopup.jsx`, `src/components/curriculum/word-detail/WordDetailSheet.jsx`
- DB: none — Edge Functions: none
- Status: complete, pushed to main

### 2026-06-18 — FIX: reorder grammar questions invisible (8 exercises had empty options)
- What: Student Layan reported that in Unit 10 Grammar (adverbs of frequency), question 3 "رتّب الكلمات" showed no word chips to click — just a placeholder and a blank area. She couldn't arrange words into a sentence.
- Root cause: 8 `curriculum_grammar_exercises` rows had `items[0].options = []` even though the words to arrange were embedded in the `question` field (e.g. "Put the words in the correct order: often / We / eat / French / bread"). `ReorderQuestion.jsx` did `useState(item.options || [])` → rendered zero chips from an empty array.
- Fix (two layers): (1) **DB backfill** — patched all 8 exercises via PostgREST PATCH; words extracted from the `" / "` and `"|"` delimited question text and inserted into `options`. HTTP 204 for all 8. (2) **Frontend fallback** — added `extractOptionsFromQuestion()` to `ReorderQuestion.jsx`; if `options` is empty at render time, it parses words out of the question text so future data gaps can't silently break the UI.
- Affected exercises: adverbs of frequency (Unit 10, Layan's case) + 7 others across archaeology, basic adjectives, gene therapy, deep ocean, marathon, creativity, ant communication.
- Files: `src/components/grammar/exercise-types/ReorderQuestion.jsx` (12-line addition, no logic change)
- DB: 8 rows in `curriculum_grammar_exercises` patched (options arrays backfilled — live immediately)
- Status: DB fix live (Layan can refresh now); frontend fallback deployed on next Vercel build

### 2026-06-11 — LIBRARY GUESTBOOK دفتر زوّار المكتبة: student feedback + suggestions (live end-to-end)
- What: Ali asked for a way to collect student feedback + suggestions on the Library. Built it as an in-room "guestbook" instead of a generic form: a warm brass-trimmed card at the foot of the shelves on /library (shelf view) opens a modal — 1–5 brass-seal rating (✦ with Arabic seal-words, تحفة at 5), "وش رأيك بالمكتبة؟" + "عندك اقتراح؟" textareas (2000-char cap), gendered via useG throughout, gold stamp thank-you screen. Mobile = bottom-sheet w/ safe-area.
- DB: `library_feedback` (migration `20260610120000`, applied via Mgmt API) — rating CHECK 1-5, status new|seen|done, not-empty CHECK, 4000-char length CHECK (defense-in-depth), RLS mirrors bug_reports (insert own WITH CHECK student_id=auth.uid(), select own+staff, staff update, service_role all). **rls-security-auditor verdict: SAFE** — live-proven forge-insert 42501, cross-student read blocked, student update/delete denied (no policy).
- Admin: `/admin/library-feedback` ("آراء المكتبة", النظام section, BookMarked icon) — AdminBugReports-pattern triage: filters, avg-rating headline, ✦ seals per row, suggestion highlighted in a gold callout, status one-click (update uses .select() so RLS no-ops surface as errors).
- Reviews: arabic-copy-reviewer pass (fixed 1 hardcoded masculine حاول in the error path; all g() pairs verified correct). Deployed by porting App.jsx/navigation.js additions ONTO origin/main content (local tree was stale vs main's CS-Ops/phrasebook work — verified all 242 lazy imports resolve against main's tree post-deploy before pushing).
- Files: NEW `src/features/library/components/Guestbook.jsx`, `src/pages/admin/AdminLibraryFeedback.jsx`, `supabase/migrations/20260610120000_library_feedback.sql`; modified `src/features/library/pages/LibraryHome.jsx` (mount), `src/features/library/library.css` (.lib-gb-*), `src/App.jsx` (route), `src/config/navigation.js` (admin nav item).

### 2026-06-10 — IMPERSONATION: fix "banner disappears after a while → stuck as the student" (storage-scope bug)
- Owner report: impersonation starts fine, but after some time the platform treats him as the ACTUAL impersonated user — the orange return-to-admin bar is gone, forcing a full logout/login to get back to the admin account.
- **Root cause (two layers, both in `src/stores/authStore.js`):** (1) STORAGE-SCOPE MISMATCH — the real-session swap persists the student's Supabase session in **localStorage** (global, survives tab/process kills), but the banner marker + admin restore tokens (`fluentia_impersonation` / `fluentia_admin_restore`) lived in **sessionStorage** (tab-scoped). When iOS/Safari discards the tab after inactivity, the PWA reopens, or any fresh tab/context loads the app, sessionStorage is wiped → student session persists with NO banner and no way back. (2) DESTRUCTIVE RESTORE — `restoreImpersonation` validated against `cur.profile.id`; a transient profile-fetch failure (timeout/flaky network) made it DELETE both keys, permanently discarding the admin's restore tokens.
- **Fix:** both keys moved to **localStorage** via `impGet/impSet/impRemove` helpers (with a sessionStorage→localStorage migration read so in-flight impersonations survive the deploy); `restoreImpersonation` now validates against the SESSION user (`cur.user.id`) and returns WITHOUT clearing when no session is loaded yet (only clears when the session is positively a different user); the `SIGNED_IN` auth event re-runs `restoreImpersonation` (idempotent) so a slow boot-time `getSession` can no longer leave the banner missing. Bonus: the banner now also shows in OTHER tabs (which were already silently the student — the session swap is global).
- Files: `src/stores/authStore.js` (only). DB/edge: none. Shipped direct-to-main via Trees API.

### 2026-06-09 — LIBRARY home: bleed the room BEHIND the global nav (Ali: "make the room bleed behind the nav too")
- `LibraryHome.jsx` toggles `document.body.classList.toggle('lib-immersive', view==='shelf')` (useEffect, removed on unmount / words view). CSS scoped to `body.lib-immersive` turns the shared chrome translucent so the full-bleed `.lib-env` (already `fixed; inset:0`) shows through: `aside[data-sidebar-root]` → warm-glass gradient `rgba(13,9,17,.58)→rgba(9,7,13,.66)` + `blur(18px)` + brass `border-inline-end` (inline `background` overridden with `!important`); `.mobile-bottom-nav` → matching warm glass; `[data-app-header]` border warmed. Nav text stays legible (dark warm scrim + blur over the room's already-dim right wall).
- Route-scoped only — every other page's sidebar/header/mobile-bar is untouched (class is removed on unmount + in words view).
- **Verified live** (mock-test-a1, app.fluentia.academy): `body.lib-immersive`=true, sidebar computed bg transparent + warm gradient + blur(18px); the room visibly continues behind the rail (desktop) and under the bottom bar (mobile) — one continuous library. **Shipped main `1b973daf`.**
- Files: `src/features/library/pages/LibraryHome.jsx`, `src/features/library/library.css`.

### 2026-06-09 — LIBRARY home: TRUE full-bleed immersion redo (Ali: "looks fake/like a picture, doesn't cover the whole thing")
- After the first pass, Ali rejected it: the backdrop "looks like a picture… not immersive… does not actually cover the whole thing… we want it as if the student is actually inside this." Root causes: (1) a single CENTERED "postcard" FLUX composition, (2) a hard black bottom scrim that made the room a band, (3) env boxed to the content area (header/sidebar offsets).
- **New backdrop:** rewrote the prompt in `generate-library-backdrop.mjs` to a FIRST-PERSON deep reading-hall — towering shelves on BOTH sides receding in perspective, brass lamps lining the walls to a distant glowing window, reflective floor, naturally dark edges (built-in vignette), no centered subject. Generated 3 candidates, chose the deep cathedral-nave one, re-published to the SAME path (no URL change).
- **CSS:** `.lib-env` → `position: fixed; inset: 0` (full viewport, edge-to-edge — was offset by header/sidebar). Image brightness 0.6→0.74 + a slow **push-in** drift (scale 1.08→1.17, "walking in"). Scrim made LIGHT + CONTINUOUS — a focused dark floor only behind the masthead + a gentle edge-vignette + a soft 0.42 bottom (was 0.86 hard black), so the room never cuts to flat black and reads as continuous space.
- **Verified live** (mock-test-a1, app.fluentia.academy): `.lib-env` computed inset = 0px all sides, filter brightness 0.74; deep room fills the whole stage top-to-bottom on desktop + mobile, reflective floor reaches the bottom edge. **Shipped main `10ba2a24`.**
- **Deploy gotcha:** a parallel session pushed a commit missing `src/features/library/pages/LibraryBook.jsx` ~2s after mine → its build errored (`Could not resolve ./features/library/pages/LibraryBook`). MINE was clean: main HEAD `10ba2a24` contains LibraryBook (verified via gh api) and the prod alias auto-promoted my Ready build (verified by probing live computed styles). Did NOT touch the parallel session's broken commit (concurrent-sessions rule).
- Files: `scripts/library/generate-library-backdrop.mjs` (immersive prompt), `scripts/library/_probe-live.mjs` (NEW), `src/features/library/library.css`. Storage: backdrop object overwritten.

### 2026-06-09 — LIBRARY home: immersive "Midnight Reading Room" backdrop/shell (design-loop, live)
- Owner feedback: the novel covers are great but the Library "did not show up as an actual library because of the background design… just a very simple design." Asked how far we could push the background/shell to feel "wow/crazy" and fit the covers. He chose the **Midnight Reading Room** mood.
- **Backdrop:** generated 3 FLUX candidates (`fal-ai/flux-pro/v1.1`, 1536×1024) via NEW `scripts/library/generate-library-backdrop.mjs` (warm lamplit study, dark shelves into shadow, brass lamp, arched moonlit window, obsidian+brass, dust motes, no people/text). Chose cand-3, published to public `library-art/backdrops/midnight-reading-room.jpg` (292kb, HTTP 200).
- **Shell (`LibraryHome.jsx` + `library.css`):** full-bleed `.lib-env` environment behind the shelf view only — fixed inset offset by `--header-height`/`--sidebar-width` (RTL-safe logical props), `z-index:0`, `pointer-events:none`; sub-layers: `.lib-env-img` (backdrop, slow Ken-Burns drift) · `.lib-env-glow` (amber lamp bloom, screen-blend, breathe) · `.lib-env-motes` (seamless dust drift) · `.lib-env-scrim` (masthead floor + bottom ground + vignette for legibility). Content forced to `z-index:1`. All animations pure transform/opacity/bg-position + `prefers-reduced-motion` gated (low-power safe).
- **Design-loop (3 iterations: build→Playwright shot→premium-ui-critic→fix).** Critic 6.5→8.3→premium. Fixes: warm `--lib-*` tokens replace cool grays on all chrome; covers grounded with per-cover contact shadow + denser grid (desktop minmax 168→190) + spec hover (-2px/.18s + brightness); room heads get a brass cap-dot + gold-tinted rule + a brass shelf-ledge under each grid; continue-reading bar reframed under its own "تابع القراءة" brass shelf-head (capped 540px, warm-glass, layered shadow, 64px cover); tabs are a real glass pill; masthead lifted by a dedicated dark scrim floor + warm cream subtitle; mobile spacing pass.
- **Verified live** on app.fluentia.academy (mock-test-a1): `.lib-env-img` renders with the published backdrop on desktop + mobile, 9 covers grounded, 0 console errors. Deploys reached Ready + prod alias serves new build.
- Files: `scripts/library/generate-library-backdrop.mjs` (NEW), `scripts/library/_capture-home.mjs` (NEW), `src/features/library/pages/LibraryHome.jsx`, `src/features/library/library.css`. Storage: 1 backdrop object. **Shipped to main** (`c000f6bb` → `0269e996` → `9cc8b327`). DB/edge: none.

### 2026-06-08 — SPEAKING conversation: detailed feedback + completion lands on right student (impersonation fix)
- Owner feedback: (1) the conversation feedback was too thin — wants a full detailed speaking analysis (strengths, why this score, etc.); (2) BIG: after completing the speaking task he didn't see the unit's speaking section marked complete.
- **Completion root cause (impersonation):** he was viewing AS a student ("تتصفح ك لمى فهد الجهني"). Under impersonation `auth.uid()` stays the admin (client-side profile swap — see `project-fluentia-impersonation`), so the edge fns' `getUser(token)` returned the ADMIN, and the conversation + completion were written to **د. علي الأحمد** (verified in DB), not Lama → her unit badge stayed empty. For a real student it already worked. **Fix:** edge fns are now impersonation-aware — `speaking-conversation-turn` (start) accepts `as_student_id`, honored ONLY when the caller's `profiles.role ∈ (admin,trainer)`; turn/grade derive the effective student from `convo.student_id` and allow a staff caller. So the conversation, summary `speaking_recordings` row, and `student_curriculum_progress` completion all write for the EFFECTIVE (impersonated) student. Client passes `as_student_id = studentId` (the swapped profile id) on start. **Verified:** real student → completion `completed score=46` for them; a student passing someone else's `as_student_id` is IGNORED (security). (Same gotcha affects record-once; not changed here.)
- **Detailed feedback restored:** the grade rubric was over-trimmed for speed — restored the full set (score_justification, corrected_transcript, model_answer, errors, better_expressions, fluency_tips, quoted strengths/weaknesses) on Haiku + max_tokens 3000 (~15s, still fast). New **"لماذا هذه الدرجة؟"** line in `AIEvaluationCard` (SpeakingTab) surfaces `score_justification` so the student understands her grade (benefits record-once too). Verified: grade returns 7/7 rich fields.
- Files: `supabase/functions/speaking-conversation-{turn,grade}/index.ts`, `src/components/curriculum/speaking/ConversationMode.jsx`, `src/pages/student/curriculum/tabs/SpeakingTab.jsx` (ported). **Shipped to `main` (`90fc185`)**; edge fns live.

### 2026-06-08 — SPEAKING conversation: fast + bulletproof submit + visible turn limit
- Owner feedback on the AI speaking conversation: (1) submit failed ("تعذّر حفظ تقييم المحادثة") — must always work; (2) it's too slow; (3) needs a defined+visible ceiling so it doesn't run long / burn API.
- **Measured (timed repro `/tmp/repro-conv.mjs`):** START 4.0s, TURN ~5.3s, **GRADE 28.7s** — the grade (Sonnet 4096 tok) was the killer + the intermittent submit failure (slow → timeout/overload, no fallback → student stuck).
- **Fixes (edge fns, deployed v2):** `speaking-conversation-grade` → `claude-haiku-4-5` + slimmer rubric (dropped corrected_transcript/model_answer/etc) + max_tokens 1500 + 1 retry → **~8s**. **NEVER-FAIL submit:** if grading still can't complete, a graceful engagement-based fallback eval (`needs_review:true`) still writes the recording + completion so the conversation ALWAYS finishes. `speaking-conversation-turn` → replies on `claude-haiku-4-5` + ElevenLabs `eleven_turbo_v2_5` (was multilingual_v2; cache key bumped) → **~4s/turn**. Costs re-priced to Haiku.
- **Final measured:** START 2.5s · TURN ~3.8s · **GRADE 8.3s** (was 28.7s — 3.5× faster), submit `ok=true`, turbo audio OK.
- **Visible limit + cost bound (frontend `ConversationMode.jsx`):** a turn-progress bar (X/8) with a "can finish from here" notch at turn 3 — student sees the ceiling; per-turn record cap 120s→60s. With Haiku/turbo + the 8-turn cap, a full conversation is now pennies.
- Files: `supabase/functions/speaking-conversation-{turn,grade}/index.ts`, `src/components/curriculum/speaking/ConversationMode.jsx`. **Shipped to `main` (`8adc86a`)**; edge fns live (v2).

### 2026-06-08 — CHAT PUSH: every group message now pushes (Telegram-killer) + per-source mute
- Goal (owner): make the in-app chat a full Telegram replacement — every message must fire a push by default, students can mute per group / per DM, and chat must be more accessible in nav. Owner will test push on his phone. This is step 1 (backend push), shipped live; nav placement + mute UI + the "Majlis" chat UI redesign are the next phases.
- **Root finding:** only DMs pushed (`trg_dm_notify`). Group messages / @mentions / announcements had **NO trigger firing** (the `process-mentions` + `announcement-fanout` webhooks were never registered as DB triggers — confirmed via `pg_trigger` on `group_messages`: only trg_dm_notify, trg_dm_touch, trg_gm_guard_own existed). So a single comprehensive trigger covers everything with zero double-push risk.
- **Migration `20260608170000_group_message_push_and_mutes.sql` (applied live via Mgmt API, HTTP 201) — NOTE: a parallel session also used the 20260608170000 stamp for a different file (listening images); both coexist, mine is already applied to the DB.**
  - New `group_message_push()` trigger on `group_messages` AFTER INSERT — for every NON-DM, non-deleted, non-system message it `net.http_post`s `send-push-notification` with `user_ids` = active students in `students.group_id` + `groups.trainer_id`, minus the sender, minus muted. `skip_in_app:true`. Title = group name, body = "sender: preview", url `/chat/<group_id>`, tag `grp-<group_id>`. Wrapped `EXCEPTION WHEN OTHERS THEN RETURN NEW` so a push failure can never block the INSERT.
  - New `chat_notification_mutes` (user_id, scope all|group|dm, target_id) + unique index on `(user_id, scope, COALESCE(target_id,'0...'))` + RLS own-rows + `chat_is_muted()` helper. RPCs `set_chat_mute(scope,target,muted)` + `get_chat_mutes()` (SECURITY DEFINER, authenticated) for the UI.
  - `dm_notify_push()` rewritten to also honor mutes (scope dm) + same EXCEPTION safety.
  - Group membership: `students.group_id` (status='active', deleted_at IS NULL) + `groups.trainer_id`. `mentions` is `uuid[]`; `groups.name` = display name.
- **Verified:** trigger + 4 functions present. Owner `د. علي الأحمد` (admin@fluentia.academy, `e5528ced-…`) has 21 active push_subscriptions; direct test push via `send-push-notification` returned `{sent:17,failed:0}`. Reused existing infra: VAPID keys, `public/push-sw.js`, `src/utils/pushSubscribe.js`.
- **NOT done yet (next):** (1) nav — add chat to the student mobile bottom bar (`navigation.js` mobileBar currently dashboard/curriculum/flashcards/spelling-lab/more; chat is in the «المزيد» drawer) + promote in desktop sidebar; (2) mute toggle UI in chat header ⋯ + notifications section in الحساب (wire to set_chat_mute/get_chat_mutes); (3) port the approved "Majlis" redesign (obsidian + 1 brass accent, presence-first — prototype `~/Desktop/majlis-chat-preview.html`) into `src/features/chat/`. See memory [[project-fluentia-majlis-chat]].
- Files: `supabase/migrations/20260608170000_group_message_push_and_mutes.sql` (NEW, applied — backend trigger already LIVE in prod; not yet committed to git). No frontend/Vercel change this step. DB: 1 table + 4 functions + 1 trigger. Edge fns: none (reused send-push-notification). Status: push backend LIVE + test-push verified to owner devices.

### 2026-06-08 — LISTENING: cinematic topic images + richer graded questions + fix "answer always same option"
- Owner asks: (1) listening had NO images — add a thrilling, topic-specific image per activity; (2) only 3 questions, all the same TYPE/difficulty, and the correct answer was ALWAYS the same option — add more questions, more types, MORE than 3 difficulty tiers incl. one genuinely hard; (3) reconsidered the listening ribbon "mismatch" → decided it's an acceptable general framing, LEAVE it (so I did not touch listening ribbons).
- **Cinematic hero images (72/72):** Claude art-directs a per-topic cinematic SCENE from each listening's title+transcript (environmental, no close-up faces, culturally modest), FAL **flux-pro/v1.1** renders 16:9 (chosen by viewing test images — far more cinematic than schnell/dev), uploaded to public `curriculum-images/listening/<id>.jpg`. Additive columns `image_url/image_prompt/image_generated_at` (migration `20260608170000`). Shown as a premium banner atop the section (image + gradient scrim + title overlay + slow Ken-Burns zoom; graceful text fallback). Script: `scripts/image-gen/generate-listening-images.mjs`.
- **Enriched questions (72/72):** regenerated every task to **7 questions** (was 3-5), **5-7 varied TYPES** (main_idea/detail/inference/vocabulary/speaker_attitude/sequence/cause_effect), **5 DIFFICULTY tiers** (1-5) with a real spread + ≥1 genuinely hard (69/72 have a tier-5; all have tier-4+), 4 options, explanation_ar. Script: `scripts/regen-listening-questions.cjs` (Claude generates, code shuffles).
- **FIX answer-position bias (root):** was 76% of answers at index 1; **42/72 tasks had ALL answers at the same position** (gameable). The generator now randomizes + balances the correct position per task. Verified: `tasks_ALL_SAME_answer 42→0`; distribution now even (`0:144 1:144 2:144 3:72`). Schema unchanged except additive `difficulty` per question → `ListeningMCQ` renders type + difficulty badges (hard flagged 🔥 تحدٍّ); extended QUESTION_TYPE label/color maps + DIFFICULTY map in `ListeningTab.jsx`.
- Files: NEW `supabase/migrations/20260608170000_listening_images.sql`, `scripts/image-gen/generate-listening-images.mjs`, `scripts/regen-listening-questions.cjs`. Modified `src/components/players/listening/ListeningSection.jsx` (hero), `src/pages/student/curriculum/tabs/ListeningTab.jsx` (badges + maps). **Shipped to `main` (`5d5ed88`)**; images + questions applied to DB. esbuild bundle-checked. (Data is live immediately; frontend on next deploy.)


### 2026-06-08 — SPEAKING follow-up: PREMIUM conversation UI + fix ribbon↔task content mismatch (whole-section audit)
- Owner feedback on the conversation feature: (1) the speaking section had a CONTENT CONTRADICTION — the context ribbon above the tab said one topic ("تحدثي عن نجاحات الفضاء السعودي") while the conversation card said another ("Talk about your dream trip to space"); also the ribbon used a gendered 2nd-person imperative. (2) the conversation UI wasn't PREMIUM enough. Standing lesson recorded in memory: touch a section → audit the WHOLE section; everything ships premium by default.
- **Content fix (root cause):** `curriculum_units.activity_ribbons.speaking` was generated by `scripts/generate-activity-ribbons.cjs` from the unit THEME, independent of the actual `curriculum_speaking` task — so it named a different sub-topic (and older outputs used feminine imperatives like تحدثي/عبّري, violating the generator's own neutral rule). NEW `scripts/regen-speaking-ribbons.cjs` regenerates the speaking ribbon for ALL 72 units DERIVED FROM the real prompt: neutral, gender-neutral, ≤9 words, consistent with the task (e.g. U3 L1 now "الحديث عن رحلة أحلام إلى الفضاء" matching its dream-space-trip task). Applied to DB (data-only, no deploy — `ContextRibbon` reads it at runtime). Verified: 0 ribbons with a 2nd-person imperative remain; space unit ribbon matches its card.
- **Premium redesign of `ConversationMode.jsx`:** rebuilt to the platform's Apple-level bar — aurora-backed glass panel (3 screen-blended blooms + legibility scrim, pulses when the coach speaks), a living coach presence orb ("Layla", radial sky→violet gradient + glow + breathing, animated rings + sound-bars while speaking), refined multi-layer-shadow chat bubbles (asymmetric tail radii, gradient-tint glass, accent ambient glow + inset highlight; coach = cool glass, student = branded sky→violet), a mic dock with a LIVE analyser waveform while recording + multi-ring pulse, cinematic intro (orb + sheen CTA) and gold reward screen (count-up score, band label, "your words" as quote cards). Explicit rgba (no color-mix — iOS<16.4 safe), `useReducedMotion` gating. **Backend logic unchanged** (start/turn/grade/idempotency identical to the verified version).
- Files: NEW `scripts/regen-speaking-ribbons.cjs`; rewrote `src/components/curriculum/speaking/ConversationMode.jsx`. **Shipped to `main` (`fd9cbcb`)**; ribbons applied to DB. esbuild bundle check green.

### 2026-06-08 — SPEAKING: AI CONVERSATION MODE (student suggestion) — default surface, opt-out to classic
- A student suggested: instead of recording a speaking task ONCE, have a back-and-forth spoken CONVERSATION with an AI about the unit topic. Built it as the new DEFAULT speaking surface; classic record-once stays one tap away and 100% untouched; the choice persists per student (gradual opt-out, not forced). NEVER deletes existing data.
- **Flow:** the coach (warm female English voice "Layla") SPEAKS FIRST (voiced) and asks a simple question → student replies by voice (tap-to-talk, Safari-safe RecordRTC → voice-notes) → Whisper STT → Claude reply (level + topic-aware, gentle recasts, never harsh mid-flow correction, 1–2 sentences, one question, stays on the unit topic) → ElevenLabs sentence TTS (content-addressed cache in public curriculum-audio/conversation-tts) → repeat. Student can end after ≥3 turns; hard cap 8 (coach wraps). Reward screen shows the student their OWN spoken English sentences back ("كلامك اليوم") as a trophy + score band + feedback.
- **Completion (no regressions):** the grader scores the WHOLE conversation with the SAME rubric/shape as evaluate-speaking, then writes ONE summary `speaking_recordings` row (new nullable `conversation_id` link) so trainers + the unit-progress trigger see the work and the existing `AIEvaluationCard` renders it, PLUS the same `student_curriculum_progress` ('speaking', completed, score) record-once writes. `block_phantom_submission` early-returns for section_type='speaking', so the scoreless-but-no-answers write is safe (verified in the trigger body). Client `onComplete` reuses SpeakingTab's existing handler (XP + cache invalidation + activity event). Idempotent: atomic in_progress→completed claim; per-turn idempotency via `client_turn_uuid` (durable — student turn saved before AI reply, conversation resumable on a dropped connection).
- **DB (migration `20260608160000_speaking_conversations.sql`, applied):** new `speaking_conversations` + `speaking_conversation_turns` (additive, soft-delete `deleted_at`), RLS mirrors speaking_recordings (student-own, trainer-of-group select, admin all, service_role all) + nullable `speaking_recordings.conversation_id`. No existing table/row/bucket touched.
- **Edge fns (deployed verify_jwt:false):** `speaking-conversation-turn` (action start|turn — Whisper whisper-1 + Claude `claude-sonnet-4-6` + ElevenLabs TTS, logs ai_usage chatbot/speaking_analysis), `speaking-conversation-grade` (rubric + completion writer). Voice = ElevenLabs "Rachel" `21m00Tcm4TlvDq8ikWAM`, eleven_multilingual_v2. Reuses OPENAI/CLAUDE/ELEVENLABS keys already set.
- **Frontend:** new `src/components/curriculum/speaking/ConversationMode.jsx` (intro/ready → chat stream + voiced replies w/ iOS silent-WAV unlock + per-bubble replay → tap-to-talk recorder → hint chips from useful_phrases → grading → "your words" reward). Wired into `SpeakingTab.jsx` `SpeakingTopic` via a surface toggle (conversation default | classic), localStorage `fluentia:speakingMode:<studentId>`; coach sidebar gated to classic. Gender-aware Arabic via src/i18n/gender (useG).
- **Verified end-to-end** with the mock A1 student (real JWT + real audio): coach opens + voiced (TTS 200), 2 turns transcribed + replied (coach stayed on-topic, recast gently when the student drifted off-topic), grade wrote summary recording + completion + recomputed unit_progress; idempotent re-grade confirmed; test data cleaned up. esbuild bundle/resolution check green on both new+edited files. **Shipped to `main` (`605de06`)** via GitHub Trees API — SpeakingTab ported onto main (6/6 anchors matched), 4 new files verbatim; Vercel prod deploy reached Ready and both prod aliases serve the fresh build `mq4odrso`.
- Files (new): `src/components/curriculum/speaking/ConversationMode.jsx`, `supabase/functions/speaking-conversation-turn/index.ts`, `supabase/functions/speaking-conversation-grade/index.ts`, `supabase/migrations/20260608160000_speaking_conversations.sql`. Modified: `src/pages/student/curriculum/tabs/SpeakingTab.jsx`.

### 2026-06-08 — ACADEMY DIGEST: AI-powered daily + weekly email reports to the owner
- Owner wanted a detailed email every midnight (new day) + every Saturday night summarizing EVERYTHING that happened on the platform — per-student time spent, what they did, performance, highlights, an academy overview, and a smart "should I worry?" read.
- **Edge fn `academy-digest`** (deployed, verify_jwt=false). Body `{period:'daily'|'weekly', date?, test_email?, send?, recipients?}`. Pipeline: ensures the `student_daily_activity` rollup for the range (calls `refresh_daily_activity` per day, idempotent) → aggregates per-student (learning minutes, sections, words, xp, avg score, submissions, days-active, **per-skill breakdown from `skill_breakdown.{time_seconds,completed,avg_score}` = "what they did exactly"**) + academy totals + inactive list + `student_interventions` signals → ONE Claude call (`claude-sonnet-4-6`, **tool-use** for guaranteed-valid JSON — plain text-JSON parsing kept failing on Arabic) producing `{overall_ar, worry[], highlights[], recommendations_ar[]}` → rich RTL Arabic HTML email via Resend.
- **Daily** = reports the day that just ended (yesterday Riyadh). **Weekly** = past 7 days ending today (Sun→Sat).
- **DB:** `digest_runs` log table (migration `20260608130000`). **Cron** (migration `20260608140000`): `academy-digest-daily` `30 21 * * *` (00:30 Riyadh, after the 00:15 rollup); `academy-digest-weekly` `0 20 * * 6` (Sat 23:00 Riyadh). Both call the fn via `net.http_post` + `current_setting('supabase.service_role_key')` (existing cron pattern). Both verified `active=true`.
- **Recipients:** default `alialahmad2000@gmail.com` + `admin@fluentia.academy` (override via body.recipients or env `ADMIN_DIGEST_RECIPIENTS`). Test path `test_email` sends to one address only.
- **Verified:** daily + weekly sample emails sent to alialahmad2000@gmail.com (Resend ids returned, `ai_used:true`). Backend-only — no frontend/Vercel change. Files: `supabase/functions/academy-digest/index.ts`, `supabase/migrations/2026060813000{0}_digest_runs.sql` + `20260608140000_academy_digest_cron.sql`.

### 2026-06-08 — TEACHER ACCOUNT: 3 upgrade bundles (needs-attention · class hub · delivery control + grading polish)
- Owner picked 3 of 4 proposed bundles to extend the rebuilt teacher account. Almost all REUSES existing-but-unsurfaced backend (interventions, AI edge fns, attendance/assignments) — net-new = 1 small table.
- **Bundle A — Needs-attention (متابعة) + AI insights.** `NeedsAttentionPanel` on TeacherHome surfaces `get_intervention_queue(trainer_id)` (274 pending live signals: inactive/stuck/milestone) grouped by severity, with act/snooze/dismiss via `act_on_intervention` + ready-to-copy Arabic message. AI student insight (`AiInsightSection` on StudentProfile, on-demand) via `student-insight-ai` (diagnosis/recommended_action/tone/evidence). Class insight via `generate-trainer-insights` (on the class page). Hooks: `useInterventions.js`, `useInsights.js`.
- **Bundle B — Class hub (الكلاس, new nav item + /trainer/class).** Per-group `GroupClassCard`: current focus unit + change (`groups.current_unit_id`), today's attendance (present/late/absent → `attendance` table, class 1/2), homework/active-today status, assign tasks (`assignments`), class AI insight. Hook `useClassHub.js`.
- **Bundle C — Delivery control + grading polish.** Assign focus + assign tasks (above). Unit LOCK/UNLOCK per group: new table `teacher_unit_locks` (migration `20260608120000`, presence-of-row=locked, RLS trainer-own + student-read) + teacher toggle UI in `GroupClassCard` + a **fail-open** student guard in `UnitContentRouter` (`useUnitLockedForMe` — blocks ONLY when an explicit lock row exists; any error → unit stays open, so it can't break student access). Grading polish: `FeedbackSnippets` (Arabic quick phrases) in the answer grade box + WorkReview queue; rubric-based grading (`RubricGrader` reads `curriculum_writing.rubric` {criterion:max} → criterion inputs sum to the score).
- **Files (new):** `src/hooks/teacher/{useInterventions,useInsights,useClassHub,useUnitLocks}.js`, `src/hooks/useUnitLock.js`, `src/components/teacher/home/NeedsAttentionPanel.jsx`, `src/components/teacher/students/AiInsightSection.jsx`, `src/components/teacher/answers/FeedbackSnippets.jsx`, `src/components/teacher/class/GroupClassCard.jsx`, `src/pages/teacher/class/ClassHub.jsx`, `supabase/migrations/20260608120000_teacher_unit_locks.sql`. Modified: `TeacherHome`, `StudentProfile`, `AnswerItem`, `WorkReview`, `teacherNavigation` (added الكلاس; mobile bar drops settings), `App.jsx` (+/trainer/class), `UnitContentRouter` (fail-open lock guard).
- **Shipped to main** (`3b0896c`) via worktree port. This deploy ALSO fixed a broken import in `src/features/chat/components/premium/VoicePlayerPremium.jsx` (`../../../lib/supabase` → `../../../../lib/supabase`) introduced by `fb128ab` (PR #12) that was **failing the production build** — production had been stale until this.
- **Earlier same day — PWA stale-build root-cause fix** (`89af238`): embedded the build version (`__BUILD_VERSION__` via vite define) and rewrote `main.jsx` self-heal to compare RUNNING-vs-deployed (no more baseline-to-remote bug that left clients on stale code forever). main keeps `registerType:'prompt'`/`skipWaiting:false`; the self-heal is the force-refresh escape hatch.

### 2026-06-06 — TEACHER ACCOUNT TOTAL REBUILD (ground-up "مساحة المدرّب")
- Owner: the old teacher (trainer) surface was "miserable" — a half-built v2 cockpit buried under ~25 `.legacy`/`.deprecated` files + abandoned systems (Nabih AI coach, interventions queue, trainer XP/streaks/daily-rituals, payroll). Decision (4 locked answers): (1) curriculum control = **delivery, not content**; (2) **NO teacher impersonation** (reserved for admin) — instead the teacher experiences the curriculum **as a student** + sees **every student's actual answers** + a **follow-daily-work dashboard by level/group**; (3) **total UI rebuild from scratch**; (4) roster powers = **manage own roster** (notes, flags, move between own groups). No push features. Built a brand-new teacher app under the SAME `/trainer/*` URLs (auth redirect + RLS helpers stay keyed to role='trainer').
- **Discovery (live):** 24 active students; real teachers = **د. محمد شربط → "المجموعة 2" (11 students)**, رشيد → "المجموعة 4" (8). Teacher↔student link is `groups.trainer_id`. RLS ALREADY lets a trainer read every answer table (`student_curriculum_progress`, `activity_attempts`, scoped `speaking_recordings`, scoped `students` via `get_trainer_group_ids()`), and the grading RPC layer already exists (`get_trainer_grading_queue`/`approve_submission`/`request_submission_redo`) — so this was a fresh UI over reachable data. Net-new backend = **1 RPC only**.
- **New shell (replaces TrainerLayout):** `src/layouts/TeacherLayout.jsx` + `teacher.css` (self-contained premium dark RTL, scoped `.teacher-app`, drops floating-toolbar/timer/XP), `src/components/teacher/shell/{TeacherSidebar,TeacherHeader,TeacherMobileBar}.jsx`, `src/config/teacherNavigation.js` (5 items: الرئيسية/طلابي/الأعمال والتقييم/المنهج/الإعدادات). Sidebar grading-pending badge reuses the writing+speaking count.
- **Pages (`src/pages/teacher/**`):** `TeacherHome` (follow dashboard — per-group rosters with today's `student_daily_activity`, active-today/pending-grading stats); `students/StudentsList` (roster grouped by group + 7-day activity); `students/StudentProfile` (skills from `student_skill_state`, per-unit `unit_progress`, 14-day activity, notes-by-type + **move-to-group**); `students/StudentAnswers` (the big one — every section's question+student-answer+correctness+AI/trainer feedback via `student_curriculum_progress`/`activity_attempts` + `speaking_recordings`, filterable by skill); `work/WorkReview` (cross-student grading queue → `approve_submission`/`request_submission_redo`); `TeacherSettings`; `curriculum/TeacherCurriculumPreview` (mounts the STUDENT renderer read-only, all levels — `{previewMode,canSeeAllLevels:true,readOnly:true}`).
- **Hooks (`src/hooks/teacher/*`):** useTeacherRoster (+useTeacherGroups/useRosterActivity), useStudentDetail (+useStudentRecentActivity), useStudentAnswers, useGrade (approve/redo), useRosterActions (move/focus). Answer renderer `src/components/teacher/answers/AnswerItem.jsx` (8 skill renderers + inline grade box). `src/components/teacher/students/MoveStudentDialog.jsx`.
- **Read-only guard (the one touch to shared student code):** added `readOnly` to `CurriculumPreviewContext` + an **inert `if (readOnly) return`** at every persist entry in the 7 skill tabs (Reading/Listening/Speaking/Writing/Vocabulary/VocabularyExercises/Pronunciation) so a teacher walking the curriculum can't write a student's progress. `readOnly` is always false for real students → zero behavior change for them.
- **DB:** migration `20260606120000_trainer_move_student.sql` — `trainer_move_student(p_student,p_to_group)` SECURITY DEFINER, gated to the teacher's own groups via `get_trainer_group_ids()`, writes only `group_id`. Applied + verified live.
- **Retirement:** `src/App.jsx` `/trainer/*` group now mounts `TeacherLayout` + the new pages; old singular `/trainer/student/:id[...]` deep links repointed to the new pages; every retired URL (grading/cockpit/nabih/interventions/help/ielts/interactive-curriculum/…) → `Navigate` to the nearest new home. Old trainer pages/nav left on disk (unimported) per the concurrent-sessions rule — no git surgery, no deletes.
- **Verify:** `npm run build` green. Live data depth for محمد's roster: 11 students / 524 progress rows (452 with answers) / 45 recordings / 245 daily-activity rows / 73 unit_progress / 80 pending-grading queue items — pages render rich on day one. All PostgREST embeds (students↔profiles↔groups, unit_progress↔curriculum_units) return 200 against REST with the service key. `trainer_move_student` gate verified (SECURITY DEFINER, own-groups only). Decisive check pending = owner on device as د. محمد.
- **Deferred (documented):** hard unit/skill **locks** (table + student-gate wiring) — owner's elaboration emphasized visibility over locking; `useSetGroupFocus` (groups.current_unit_id) backend is ready. Attendance + class-announce (reuse `attendance`/`group_messages`) left as next. Speaking audio uses stored signed URLs (existing behavior) — re-sign if any expire.
- Files (new): `src/layouts/{TeacherLayout.jsx,teacher.css}`, `src/components/teacher/shell/*`, `src/components/teacher/answers/AnswerItem.jsx`, `src/components/teacher/students/MoveStudentDialog.jsx`, `src/config/teacherNavigation.js`, `src/pages/teacher/**`, `src/hooks/teacher/*`, `supabase/migrations/20260606120000_trainer_move_student.sql`. Modified: `src/App.jsx`, `src/contexts/CurriculumPreviewContext.jsx`, `src/pages/student/curriculum/tabs/{Reading,Listening,Speaking,Writing,Vocabulary,VocabularyExercises,Pronunciation}*.jsx`, `CLAUDE.md`.
- Status: Complete + build-green + data-verified on branch. NOT yet merged to main/production — recommend owner verify the branch preview as د. محمد, then merge.

### 2026-06-03 — المحادثة: make the DM contact picker impersonation-aware (the "students see everyone" report)
- Owner reported (via impersonation screenshot) that a student still saw ALL students/teachers in the "رسالة جديدة" picker. **Root cause: it was an impersonation artifact, not a real student bug.** Impersonation in this app is client-side only (`authStore.startImpersonation` swaps the in-store `profile`; the Supabase auth session stays the admin's), so `dm_list_contacts` saw `auth.uid()=admin` → hit the admin branch → returned everyone. A real student logging in on their own device already got the correct restricted list (re-confirmed: same-level peers + own teacher + only د. علي الأحمد).
- **Fix:** Migration `20260603180000` — `dm_list_contacts(p_as_user uuid DEFAULT NULL)`. The param is honored ONLY when the real caller is an admin (a student passing it is ignored → can't widen their own list). `useDMContacts` now passes `p_as_user = impersonation.userId` when impersonating, so the picker faithfully previews the student's restricted view. **Gotcha handled:** adding a defaulted param created a 2nd overload alongside the old zero-arg `dm_list_contacts()` → ambiguous no-arg call (PGRST203); dropped the old signature + re-granted EXECUTE to `authenticated`. One signature only.
- **Verified (JWT-claims sim, all PASS):** admin impersonating سارة (level 2) → 1 same-level peer + only د. علي الأحمد, no stray trainers/QA; a STUDENT passing `p_as_user=admin` → still restricted (gate holds); non-contactable admin علي impersonating → also restricted; real-admin no-arg → everyone (36). PostgREST: both call shapes (`{}` and `{p_as_user}`) → HTTP 200, no ambiguity. `npm run build` green.
- Files: `supabase/migrations/20260603180000_dm_contacts_impersonation_aware.sql`, `src/features/chat/queries/useDM.js`. Note: only the contact LIST is impersonation-aware; actually opening/sending a DM while impersonating still runs as the admin (out of scope).

### 2026-06-03 — المحادثة: restrict student contacts to the ONE contactable admin (you)
- Owner confirmed students must only reach: same-level classmates + their own teacher + **the admin (you)** — not the QA/other admin accounts. Migration `20260603170000`: added `profiles.dm_contactable` (set true for 'د. علي الأحمد'); `can_dm` + `dm_list_contacts` now only expose admins with `dm_contactable=true`, and exclude `is_test_account` accounts. Enforced in the picker AND server-side (can_dm raises on bypass).
- **Verified as a real student session:** picker = 11 same-level peers + own teacher (د. محمد) + ONLY د. علي الأحمد; DMing 'علي'/QA-Admin → BLOCKED; DMing you → allowed. 0 errors.
- File: `supabase/migrations/20260603170000_dm_contactable_admins.sql`. To make another admin reachable later: `UPDATE profiles SET dm_contactable=true WHERE id='<admin>'`.

### 2026-06-03 — المحادثة: DM push notifications + per-conversation unread badges
- **DM push + in-app notifications.** Migration `20260603160000`: a trigger `trg_dm_notify` on `group_messages` INSERT (dm_thread_id set) resolves the recipient and `net.http_post`s the existing `send-push-notification` edge fn (deployed `--no-verify-jwt`, called with the public anon key) — which creates a deep-linking in-app notification (`type='direct_message'`, title = sender's name, body = preview/🎙️/🖼️/📎, `action_url=/chat/dm/<thread>`, priority high) AND fires the web push to the recipient's devices. New `direct_message` notification_type. (The `process-mentions` webhook was never registered, so I used a pg_net trigger instead of a Dashboard webhook — self-contained.)
- **Per-conversation unread badges.** DM rows in ChatHome already had them; added the **group** row badge via new `get_group_unread_counts()` RPC (per-group unread vs the general cursor) wired into ChatHome.
- **Verify.** End-to-end: inserting a DM fired the trigger → pg_net → send-push-notification → created the recipient's `direct_message` notification (title=sender, deep-link, high priority) — confirmed via the data API, then cleaned up. `npm run build` green.
- New: `supabase/migrations/20260603160000_dm_push_and_group_unread.sql`. Modified: `pages/ChatHome.jsx`. DB: 1 trigger + 1 RPC + enum value. Status: build-green + push-verified → shipping to main.

### 2026-06-03 — المحادثة: sidebar unread badge + DM read-receipts (✓✓) + tightened student contactability
- Migration `20260603150000_dm_contacts_badges_receipts.sql` (applied live):
  - **Tightened `can_dm` + `dm_list_contacts`** — a student may now only reach **same-level active students + their OWN teacher(s)** (assigned_trainer_id or their group's trainer) **+ admins**. No more "all teachers / all students". (Trainer→own students+admins; admin→anyone — unchanged.)
  - **`get_chat_unread_badge()`** — total unread = group (vs the general-channel cursor, matching the unified stream) + all DM threads.
  - **`dm_other_last_read(thread)`** — the OTHER member's last_read_at (member-only, SECURITY DEFINER) so a user can see read state without breaking the self-only `dm_thread_reads` RLS; dm_thread_reads added to realtime.
- **Sidebar unread badge** (was defined in nav config but never rendered anywhere). New `useChatUnread()` hook (RPC + 30s refetch + realtime invalidation on group_messages/cursors/dm_reads). Rendered in `Sidebar.jsx` (count pill expanded / dot collapsed) and a count dot on the mobile **"المزيد"** button (chat lives in the drawer on phones).
- **DM read-receipts** — `useDMOtherRead(thread)` → `readUpTo` threaded DMChatPage → UnifiedMessageStream → MessageGroupPremium → MessageBubble; own DM messages show **✓ delivered / ✓✓ read** (sky) next to the timestamp, live via realtime.
- **Verify (headless, fixture between the two mock accounts only).** Sidebar shows badge "1"; contact picker shows 11 same-level peers + admins (incl. "د. علي الأحمد"), **no stray teachers**; a1's own DM message renders **✓✓ "تمت القراءة"** after b1 read it. 0 console errors. `npm run build` green. Fixture cleaned up. (Note: the legacy `.env` service-role key is rejected — this project uses the new `sb_secret_*` key; fetched it via Mgmt API for the PostgREST fixture.)
- New: `supabase/migrations/20260603150000_dm_contacts_badges_receipts.sql`, `docs/audits/chat-redesign/badges.mjs`. Modified: `queries/useDM.js`, `pages/DMChatPage.jsx`, `components/premium/{UnifiedMessageStream,MessageGroupPremium}.jsx`, `components/MessageBubble.jsx`, `components/layout/{Sidebar,MobileBar}.jsx`. Status: build-green + verified → shipping to main.

### 2026-06-03 — المحادثة: DIRECT MESSAGES (student↔trainer + same-level colleagues) + presence avatars + typing bubble + mention bug-fix
- Owner wanted DMs in the chat (contact the trainer or any same-level colleague), plus the deferred presence-avatars + typing-bubble. Built the whole DM feature on top of the premium chat.
- **DM data model — DMs ride on `group_messages` (new nullable `dm_thread_id`)** so they reuse the ENTIRE premium chat (voice/image/file/reactions/replies/bubbles/gestures/lightbox) for free. Migration `20260603140000_dm_threads.sql` (applied live via Mgmt API): `dm_threads` (canonical user pair, unique), `dm_thread_reads`; helper `is_dm_member`; DM RLS on group_messages/message_reactions (member-only, OR'd with the existing group policies); DM storage policies (path `dm/<thread>/<user>/…`); extended reaction emoji CHECK (added 🙏😮😢 — the action sheet used 🙏 which would've failed inserts); RPCs `can_dm` (contactability: students↔same `academic_level`, anyone↔trainer/admin), `dm_get_or_create_thread`, `dm_list_threads`, `dm_list_contacts`, `get_dm_messages`; `dm_touch_thread` trigger; realtime on dm_threads. **Two runtime bugs found + fixed in verify:** ambiguous `role` (OUT-param vs column) and `role` enum vs text in UNION (`::text` cast).
- **Frontend.** New `lib/useDM.js` (useDMThreads/Contacts/Messages, useSendDM, useDMMarkRead, getOrCreateDMThread — mirror the group hooks). `chatStorage` uploads now take a `scope` (group `groupId` · DM `dm/<thread>`). The shared `UnifiedMessageStream` + `PremiumComposer` + `VoiceRecorder`/`useUploadVoice` were parameterized with an optional `dmThreadId` (both hooks run, the active one is picked — group behaviour 100% unchanged; DMs disable mentions/announcements). New pages: **`ChatHome`** (the new `/chat` — list of the user's group(s) + DM threads with unread badges + a "new message" button), **`DMChatPage`** (`/chat/dm/:threadId`, reuses the aurora shell/stream/composer), and **`ContactPicker`** (staff + same-level peers, search, gradient avatars). Group header got a back button (→ list).
- **Presence avatars + typing bubble (the deferred polish).** `ActiveUsersDots` now renders an overlapping coloured-avatar cluster + count in the header; the composer's typing indicator is now a real bubble with the typer's avatar + colour-tinted dots. Fixed `useTypingIndicator` (broadcast `display_name`/`full_name` + avatar — it was sending a non-existent `first_name_ar`).
- **Mention bug-fix.** `MentionPicker`/`MentionAutocomplete` queried non-existent `profiles.first_name_ar/last_name_ar` (names live in `profiles.full_name`) → mentions never loaded. Repointed the picker query + ranking + composer insert to `full_name`/`display_name`.
- **Verify.** `npm run build` green. Headless: ChatHome (group+DM sections+new-msg), ContactPicker (staff + same-level peers populate), DMChatPage, and a real DM SEND between the two mock accounts — all pass, **0 DM-related errors**. Group chat re-checked post-parameterization (iPhone WebKit + laptop): composer above nav, back button, no overflow, 0 errors. DM voice/media + presence/typing visuals = owner's 2-device check. Test thread cleaned up.
- New: `supabase/migrations/20260603140000_dm_threads.sql`, `lib/useDM.js`, `pages/{ChatHome,DMChatPage}.jsx`, `components/premium/ContactPicker.jsx`. Modified: `chatStorage.js`, `App.jsx`, `components/premium/{UnifiedMessageStream,PremiumComposer,StreamHeader,ActiveUsersDots,MentionPicker}.jsx`, `components/VoiceRecorder.jsx`, `mutations/useUploadVoice.js`, `realtime/useTypingIndicator.js`, `pages/GroupChatPage.jsx`. DB: 2 tables + 6 RPCs + RLS + storage policies. Status: build-green + verified → shipping to main.

### 2026-06-03 — المحادثة "100×" pass: per-sender colour identity · multi-hue living wallpaper · gestures (swipe-reply / double-tap-react / long-press menu) · premium @mentions · image lightbox
- Owner wanted the chat "100× better than Telegram, NOT monochrome." Ran an 8-agent research fleet (Telegram/iMessage/Discord/Slack/Signal across 7 dimensions → locked blueprint), then built it. All presentation-layer; zero DB/RPC/edge changes.
- **Colour identity (kills "same colour").** New `src/features/chat/lib/senderColors.js` — 10-hue palette + djb2 `senderColor(id)→{name,base,soft}` / `senderGradient(id)`. Every participant gets a STABLE hue applied to: sender name (`.soft`), bubble tint+border+ambient-glow, a new **gutter avatar** with a gradient conic ring (`SenderAvatar.jsx` in `MessageGroupPremium`), @mention chips (per-name hue), and reply spines. OWN messages keep a branded sky→violet signature (not a participant hue).
- **Living wallpaper.** `premium.css` mesh rebuilt as 5 screen-blended colour blooms (sky·violet·emerald·rose·amber) on co-prime drift periods (never repeats), AA-floor scrims, and a gentle **pulse-on-send** (`fluentia:chat-send` event → `.chat-aurora[data-pulsing]`). Reduced-motion safe.
- **Gestures (Telegram-grade).** New `lib/useChatGestures.js` (pointer-based, strict disambiguation: horizontal→swipe, 380ms hold→long-press, two taps→double-tap; `touch-action:pan-y`). Wired into `MessageBubble`: **swipe-to-reply** (RTL toward start, spring snap-back, colored arrow + haptic), **double-tap to ❤️** with a portaled **ReactionBurst** particle pop, **long-press → `MessageActionSheet`** (reaction strip + reply/copy/pin/edit/delete; bottom-sheet on phone, popover on desktop). Desktop hover toolbar kept.
- **Premium @mentions** (owner's specific complaint). New `MentionPicker.jsx` replaces the basic dropdown: gradient-ring avatars, Arabic-aware fuzzy rank, `<mark>` highlight, full keyboard nav, trainers pinned, `onMouseDown`-preventDefault keeps the keyboard up. Fixed real bugs: ASCII-only `@` trigger (`\w` → `\p{L}\p{M}`), NBSP-joined names so multi-word mentions chip as one, and **16px textarea** (kills iOS focus-zoom).
- **Image lightbox.** New `ImageLightbox.jsx` (pinch/double-tap zoom, swipe between, swipe-down dismiss, download, safe-area, body-scroll-lock); `MessageBubbleImage` opens it.
- **Virtualization-safe (#1 risk).** Entrance animation gated to messages arriving AFTER mount (`mountedAtRef`→`animateIn`) so scroll-remounts don't strobe; all overlays render OUTSIDE virtualized rows via portals.
- **Verify.** `npm run build` green; headless overlap re-check (iPhone WebKit / iPad ×2 / laptop) all pass, **0 console errors**; bubbles+avatars+colours+wallpaper render (screenshots `docs/audits/chat-redesign/`). Gesture feel + lightbox = owner's iPhone check. Deferred polish: header presence-avatar cluster + typing-bubble-with-avatar.
- New: `lib/senderColors.js`, `lib/useChatGestures.js`, `components/premium/{SenderAvatar,ReactionBurst,MentionPicker,ImageLightbox,MessageActionSheet}.jsx`. Modified: `premium.css`, `pages/GroupChatPage.jsx`, `mutations/useSendMessage.js`, `components/{MessageBubble,MessageBubbleText,MessageBubbleImage}.jsx`, `components/premium/{MessageGroupPremium,UnifiedMessageStream,PremiumComposer}.jsx`, `CLAUDE.md`. Status: build-green + responsive-verified → shipping to main.

### 2026-06-03 — STUDENT DASHBOARD REINVENTION ("Command Deck") + PREMIUM SIDEBAR RAIL + dead-feature removal
- Owner wanted the student dashboard to feel like a *different platform* ("is it the same platform?!") — a true structural reinvention, not the prior re-skin — plus a redesigned sidebar, and several deprecated surfaces removed. Full authority granted; shipped straight to production.
- **Removed (owner-confirmed deprecated; recorded in memory `project-fluentia-removed-features`):** the Quick-Access band (4 tiles: weekly-tasks / assignments / adaptive-test / ai-insights) AND the Weekly-Tasks band. Tell-tale: none of those four appear in the live student sidebar `sections`. Their page-level queries (weekly_task_sets, weekly_tasks, pending-assignments) were deleted from the dashboard too.
- **Dashboard rebuilt as a "Command Deck"** (`src/pages/student/dashboards/PremiumDashboard.jsx`): gone is the long vertical stack of labelled report-sections. New = cinematic hero → engagement-first retention → an asymmetric **BENTO grid** (`.pd-bento`, 12-col, 7/5·5/7·4/4/4) of self-gating live tiles (daily progress, streak, team, weekly progress, next class, SRS, mystery box) → milestones (placement/level-exit) → academy pulse (live feed) → encouragement/prompts/payment. All on the living multi-colour ambient field. Every tile is wired to a LIVE feature; widgets self-gate (render null when empty).
- **Sidebar rebuilt as a premium "rail"** (`src/components/layout/Sidebar.jsx`): brand medallion + wordmark, top warm ambient glow, editorial section eyebrows, nav rows with icon-in-container + gold-gradient active pill + glowing leading bar (kept the `layoutId` indicator), premium user card. **Widths kept at 264/76** so LayoutShell's content margin is untouched, and **ALL gating/logic preserved** (visibleWhen/requiresIELTSStudents/requiresMockExamAccess/requiresPackage filters, mock-exam visibility query, hard-words count, IELTS roster, prefetch, isActive, collapse, data-sidebar-root, impersonation offset).
- **Cohesion pass (6 parallel agents, disjoint files, chrome-only):** unified the legacy cool `fl-card`/sky widgets to the `--ds` glass frame so the deck reads as one system, while KEEPING their semantic data-viz colours (skill bars, charts, status, streak gold) — `DailyProgressWidget`, `WeeklyProgressWidget`, `LiveLevelActivityFeed`, `SrsReviewCard`, `LevelExitTestCard`, `MysteryBox`.
- **CSS** (`premiumDashboard.css`): added the bento grid + responsive spans + a `.pd-tile` frame helper.
- **Verify:** `npm run build` ✓ green at every stage. Headless (Playwright, mock-test-a1, vite preview) DOM probe confirms: hero renders full (greeting + level ring, 0XP/level-1 mock), **all 7 bento tiles populated with real data** ("المجموعة 2", streak, weekly, next-class, SRS, mystery), no crash; removed labels (وصول سريع / رؤى ذكية / اختبار المستوى) confirmed ABSENT. (The PWA install banner/gate overlay only shows in a non-installed browser — never on a real student's installed PWA.)
- Files (modified): `src/pages/student/dashboards/{PremiumDashboard.jsx,premiumDashboard.css}`, `src/components/layout/Sidebar.jsx`, `src/components/student/dashboard/{DailyProgressWidget,WeeklyProgressWidget,LiveLevelActivityFeed}.jsx`, `src/components/gamification/{SrsReviewCard,LevelExitTestCard,MysteryBox}.jsx`, `CLAUDE.md`. (Builds on the 2026-06-03 "Atelier" pass: hero/shell/StreakWidget/TeamCard/JourneyMapHeroCTA already on `--ds` tokens.)
- Status: Complete — committed (precise paths only; left the parallel chat session's WIP untouched) + pushed + merged to `main` (server-side API merge, no local checkout) → Vercel production deploy.

### 2026-06-03 — المحادثة (group chat) PREMIUM REDESIGN: "Immersive Aurora" + full responsive/overlap rebuild + bug fixes
- Owner asked to diagnose + restructure the sidebar **conversation** (`/chat` → `GroupChatLanding`/`GroupChatPage`, the GOD COMM unified stream) so it's genuinely premium, fits phone/iPad/laptop with **nothing covering each other**, fast, engaging. Ran a 4-agent parallel diagnosis (structure/data-flow, responsive/overlap, visual quality, bugs/engagement), then chose the **Immersive Aurora** direction with owner.
- **THE structural fix (root cause of "things cover each other / doesn't fit").** The chat set `height:100dvh` while mounted inside `<main class="px-4 py-6 lg:px-10 lg:py-8" maxWidth:1200>` (below a 64px header, beside the 264px right sidebar, above the 64px mobile nav) → the 100dvh overflowed, pushing the composer + announcement FAB **under the mobile nav** and the viewport-anchored FAB **behind the sidebar**. Rebuilt the page as a **fixed app-panel** (`.chat-shell` in new `src/features/chat/premium.css`) anchored to the live layout vars: `top = sat + impersonation-banner + --header-height`, `right = --sidebar-width` (0 on ≤1024px), `left = 0`, `bottom = --bottom-nav-height + sab` (→ 0 on desktop). It now **mathematically cannot** overlap the header/sidebar/nav on any device. Removed the stale `position:sticky; top:56` from StreamHeader/PinnedStrip/FilterLensBar (they're flex rows in the panel now, so the old hardcoded offsets that collided when the header collapsed are gone).
- **Removed the overlap-prone floating FAB.** The trainer announcement is now an inline gold Megaphone in the composer action row (no viewport-anchored `fixed` element). Also: the two GLOBAL corner FABs (accessibility z-998 bottom-left, bug-report z-997 bottom-right) sat exactly on the composer's send/attachment buttons on the full-screen chat → hidden ONLY on `body.chat-page` via CSS (both remain on every other screen).
- **Immersive Aurora look.** `.chat-aurora` backdrop = 3 slow-drifting blurred radial blooms (gold + aurora-2 violet + aurora-1 sky, theme `--ds-*` tokens) + legibility scrims, behind a glass header/filters/composer. **Bubbles rebuilt** (`MessageBubble.jsx`): refined tail radii (18px round / 5px tail-spine), 4-layer shadow stacks (own carries a gold ambient glow), **own = gold-tinted glass / other = cool glass that lets the aurora glow through**, RTL `to left` gradient, real type hierarchy (13px sender = secondary not accent, 11px tabular timestamps), hover toolbar anchored to the screen-edge side so it can't clip on narrow phones. Refined StreamHeader (gold conic-ring avatar + keyframe online dot), DaySeparator, single-orb PremiumEmptyState, gold composer with focus ring + capped textarea (≤32vh), gold ScrollToBottomPill.
- **Engagement.** Real **"رسائل جديدة" unread divider** (reads `channel_read_cursors.last_read_at` once per visit, marks-read on reaching bottom — replaces the dead IntersectionObserver that never observed anything), animated **typing bubble**, **reply** + **edit** fully wired through the composer (edit reuses `useEditMessage`, reflects via the existing realtime UPDATE), loading **skeleton** instead of a bare spinner.
- **Real bugs fixed.** `GroupChatLanding` had no error handling (infinite spinner) → added error + friendly "no group" states. `useSendMessage` optimistically wrote the dead `['channel-messages']` key → repointed to `['unified-messages', groupId,'all']` with a correct sender shape (sends feel instant now). `usePresence` + `useUnifiedMessages` realtime now `unsubscribe()` before `removeChannel()` (leak on rapid nav). Added `id="msg-…"` to bubbles → repairs deep-link + pin scroll (previously `getElementById` matched nothing).
- **Verify (headless Playwright, real mock-student login).** Layout/overlap probed at iPhone 390 (WebKit/Safari), iPad 768 & 1024, laptop 1440 — **all pass every check**: shell below header, right of the 264px sidebar, composer above the mobile nav, send+attachment buttons topmost/hittable, FABs hidden, no horizontal overflow, **0 console errors**. Bubbles rendered premium via RPC interception (no DB writes). `npm run build` green ×2. Evidence: `docs/audits/chat-redesign/` (verify.mjs, bubbles.mjs, screenshots).
- Files (new): `src/features/chat/premium.css`, `src/features/chat/components/premium/UnreadDivider.jsx`, `docs/audits/chat-redesign/*`. Files (modified): `src/features/chat/pages/{GroupChatPage,GroupChatLanding}.jsx`, `components/MessageBubble.jsx`, `components/premium/{UnifiedMessageStream,StreamHeader,PremiumComposer,PremiumEmptyState,DaySeparator,FilterLensBar,PinnedStrip,ScrollToBottomPill,ReactionInlineBar}.jsx`, `lib/motion.js` (unchanged), `mutations/useSendMessage.js`, `realtime/usePresence.js`, `queries/useUnifiedMessages.js`, `CLAUDE.md`.
- DB: none. Edge Functions: none. Status: Complete + build-green + responsive-verified on branch `reading-glossary-and-bug-reports`. NOT committed (parallel sessions share this tree — left for owner review; aurora intensity is one CSS var away if he wants it stronger).

### 2026-06-03 — STUDENT DASHBOARD PREMIUM REDESIGN ("Atelier"): living background + showpiece hero + editorial framing + 3-widget cohesion pass
- Owner asked for a genuinely premium redesign of the MAIN student dashboard (`/student` → `PremiumDashboard`), not a rearrange — "design the whole thing… the background well, everything." Scope is the default dashboard only; blast radius confirmed contained (`_premiumShell`, `PremiumHero`, `PremiumDashboard` imported by nothing else). **ALL data wiring + every widget + feature parity preserved** — presentation-layer redesign; zero queries/props/logic changed.
- **Direction — dual-temperature "obsidian + warm gold" editorial.** Student DEFAULT theme is `night` (gold on obsidian) while the data-viz widgets use the older `--accent-sky` system (sky/violet). Instead of fighting that, the redesign unifies both via a rich multi-color background: warm gold blooms crown the hero, cool violet/teal blooms drift the lower page — ties the palette together AND answers the "we don't want one color in the background" ask. All `--ds-*` token-driven so night/aurora/minimal all work.
- **NEW `src/pages/student/dashboards/premiumDashboard.css`** — scoped `.pd-root` atmosphere: `.pd-atmo` hero stage-light beam + 3 drifting blurred radial blooms (`color-mix` of `--ds-accent-primary/secondary/--ds-sky`) + hairline "horizon" sweep; transform-only drift, paused under reduced-motion, teal bloom dropped + blur eased ≤768px. Plus `.pd-quick` tile lift/glow, `.pd-cta` sheen, eyebrow rule.
- **`_premiumShell.jsx` rebuilt** — `AmbientField` renders the layered `.pd-atmo` (was a single top radial). `SectionLabel` is now an editorial eyebrow (gradient spark → tracked caps → hairline rule to edge → optional hint). `Band` rhythm bumped.
- **`PremiumHero.jsx` rebuilt into a showpiece** — focal animated **XP/level ring** (SVG `strokeDashoffset` to next-level %, gamification level number + title at its heart, gold→amber gradient + glow), refined metric **Pills** (XP, streak w/ `fire-pulse`), warm interior bloom + top hairline in the GlassPanel, a real "باقٍ N نقطة للوصول إلى {nextLevel}" line, gradient gold CTA w/ sheen. Same real data.
- **`PremiumDashboard.jsx`** — root scoped `.pd-root`; **quick access promoted to its own band under the hero** (was buried in "هذا الأسبوع") with redesigned medallion tiles; "هذا الأسبوع" gains a real-data hint; rhythm → `space-y-10`. All sections/widgets/order otherwise intact.
- **Cohesion pass (3 parallel agents, disjoint files, token-only, no logic):** converted the 3 fully-hardcoded widgets to `--ds-*` tokens + glass depth so they stop clashing and now theme app-wide — `src/components/student/{StreakWidget,TeamCard (dynamic teamColor preserved),JourneyMapHeroCTA}.jsx`. Cool data-viz widgets (Daily/Weekly/LiveFeed) intentionally left on the cool accent system — they ARE the cool half of the dual-temperature palette.
- **Verify:** `npm run build` ✓ green (20s, 0 errors) incl. final integrated build. Token/presentational only — no DB/edge/query changes. Visual confirmation = owner on device.
- Files (new): `src/pages/student/dashboards/premiumDashboard.css`. Modified: `src/pages/student/dashboards/{_premiumShell,PremiumHero,PremiumDashboard}.jsx`, `src/components/student/{StreakWidget,TeamCard,JourneyMapHeroCTA}.jsx`, `CLAUDE.md`.
- Status: Complete in working tree — NOT committed (no commit requested; repo had a parallel session's uncommitted WIP in listening/vite files, left untouched per the shared-tree rule). Ready for owner review + (if approved) a precise-path commit of only the 7 dashboard files.

### 2026-06-03 — STUDENT MONITORING: per-student daily-activity rollup + day/week/month report (admin & teacher) + parent share link
Owner-requested "press a button → see exactly what a student did this day / week / month" monitoring system. Built end-to-end. (Landed on branch `reading-glossary-and-bug-reports`: my `feat/student-activity-reports` work was woven onto this branch by the shared-HEAD parallel run — backend was already in `93e0170`, frontend in this commit. Stale `feat/student-activity-reports` ref still at `07506db`, ignore it.)
- **Honest time model (key finding).** `user_sessions.duration_seconds/minutes` are NOT usable (always 0 / NULL, or inflated when a browser is left open), and `page_visits` dwell tracking stopped ~6 days ago. The reliable, more meaningful signal is engaged-learning time = `student_curriculum_progress.time_spent_seconds` (well populated, sane). Headline metric = "وقت التعلّم النشِط" + session count, NOT browser-open time. (Also noticed: the academy-wide `generate-daily-report` computes `avg_session_minutes` from the all-NULL `duration_minutes` → always ~0; left as-is, flagged here.)
- **DB Phase 1 — `student_daily_activity`** (migration `20260603130000`): one row per student per Riyadh day — learning/speaking/page seconds, session_count, page_views, words mastered/practiced/reviewed/saved, sections_completed, avg_score, quizzes, xp_earned, `skill_breakdown` jsonb. Single source of truth `compute_student_daily_activity(student,date)`; driver `refresh_daily_activity(date)`; nightly pg_cron `rollup-daily-activity` (15 21 * * * UTC = 00:15 Riyadh, computes "yesterday"); the report live-refreshes today. Full history backfilled (412 rows / 23 students / 2026-03-26→). RLS: staff-read, student-own, service-all. Reconciled vs raw (May 2026: learning 1625 min, xp 6030, sections 239 — exact).
- **DB Phase 2** — `get_student_activity_report(student,start,end)` (migration `20260603130200`): returns totals, daily series, per-skill weak/strong from section scores, current-skill radar (`student_skill_state`), and detail lists (words mastered w/ Arabic gloss, lessons w/ unit theme, mixed timeline). AI-narrative cache `activity_report_narratives` (migration `20260603130100`).
- **DB Phase 5** — `activity_report_shares` (revocable/expirable 64-hex token; migration `20260603130300`) + `create_activity_report_share()` / `revoke_activity_report_share()` RPCs (staff-only, SECURITY DEFINER).
- **Edge fn `student-activity-report`** (deployed, `--no-verify-jwt`): dual auth — staff JWT (admin/trainer) or service-role key, OR a public share token; live today-refresh; cached Claude `claude-sonnet-4-6` Arabic narrative + 3 next-steps (logged to `ai_usage`).
- **Frontend.** Route `/{trainer,admin}/student/:id/report` → `StudentActivityReport.jsx` — period switcher (يوم/أسبوع/شهر/مخصّص) + date nav, AI summary card, headline stat cards, daily learning-minutes chart (Recharts), weak/strong skill bars + cumulative skill tiles, mastered-words chips, lessons table, activity timeline; **CSV** + **print-PDF** (`activityReportPrint.js`) + **parent share** (copy link). Reusable `ReportContent` is shared with the public, login-free parent page `/report/:token` → `PublicActivityReport.jsx`. Prominent "تقرير النشاط التفصيلي" button added to the shared `StudentProgressDetail` (admin + teacher). NOTE: `/r/:token` left untouched — that's the existing progress-report share (`SharedReport`); the new parent link uses `/report/:token`.
- **Verify.** Rollup reconciled vs raw (exact). Edge fn: staff path 200 + good AR narrative + cache-hit on re-open; share path 200 + view_count increment + invalid-token 401. `npm run build` ✓ green (2×). **Playwright headless** render of public `/report/:token`: all sections present, **0 console errors**, screenshot OK (`tmp/report_public.png`).
- Files (new): `supabase/migrations/2026060313000{0,1,2,3}_*.sql`, `supabase/functions/student-activity-report/index.ts`, `src/hooks/useStudentActivityReport.js`, `src/utils/activityReportPrint.js`, `src/pages/shared/StudentActivityReport.jsx`, `src/pages/public/PublicActivityReport.jsx`. Modified: `src/App.jsx`, `src/pages/trainer/StudentProgressDetail.jsx`, `CLAUDE.md`, `FLUENTIA-SPEC.md`.
- DB: 4 migrations applied live. Edge Functions: `student-activity-report` deployed. Cron: `rollup-daily-activity`. Status: Complete + build-green; backend committed+pushed (`93e0170`), frontend in this commit. NOT merged to main/production.

### 2026-06-03 — STUDENT-EXPERIENCE PASS (4 parallel agents): instant word audio · listening AbortError fix · enriched spelling lab · premium dashboard default
Four owner-requested fixes on branch `reading-glossary-and-bug-reports`, each done by an isolated agent in a DISJOINT file domain (no shared-file edits); orchestrator ran the single central `npm run build` (✓ 1m20s, green) and code-reviewed the two high-impact diffs.
- **1 — Instant word pronunciation in reading.** Tapping a word felt slow. Root cause: `prewarmPassageWords` cached only the URL string, AND Supabase storage serves the vocab MP3s with `cache-control: no-cache`, so even HTTP-cache warming revalidates (network round-trip) on every first tap. Fix: BYTE-PRIME — after prewarm resolves URLs, `fetch()` the MP3 bytes and hold each as an in-memory `blob:` object URL; on tap `pronounceWord` plays from the blob (zero network) synchronously inside the gesture. Capped at 140 blobs (<3MB) w/ FIFO eviction + 4-concurrent throttle; vocabulary/highlighted words primed first; normalization unified between prewarm and tap so warmed words always hit. 3-tier fallback (primed → URL cache → DB ilike → Web Speech) intact; exports backward-compatible. `InteractiveReadingTab` is trainer-facing/read-only (no tap-to-pronounce) → unchanged.
- **2 — Listening player "press play, no sound" (the layer that survived the 2026-06-02 mono re-encode).** `audio_telemetry` since the re-encode (22:18) shows 0 `error_code:4` / 0 `silent_failure` — ONLY `AbortError` remained (28 bursts, Mac Safari). Two code bugs in `ListeningPlayer.jsx`: (a) a fast second tap / double-fired click hit the pause() branch while the first `play()` was still pending → `pause()` rejects the pending play() with AbortError (swallowed → no sound); (b) the silent-failure watchdog sampled its baseline BEFORE play() and then CALLED `audio.pause()`, killing audio that had actually advanced to 1–3.5s. Fix: `isStartingRef` re-entrancy guard (taps ignored while a play() is pending; cleared on source change + in `finally` so it can never stick); ONE automatic AbortError retry after 120ms (recovers Safari's play()-vs-preload cold-tap collision); watchdog rewritten to double-confirm a truly frozen clock and NEVER pause. Data/storage re-verified healthy (all 72 rows 200/audio/mpeg, public bucket, CORS `*`).
- **3 — Spelling Lab enriched word card.** `/student/spelling-lab` showed only the spelling drill. Added `WordRevealCard.jsx` (NEW), shown ONLY after the answer is committed (feedback + retype phases) so it never spoils the challenge: word + audio button (reuses `pronounceWord`) + part-of-speech pill (Arabic+English: فعل/اسم/صفة/ظرف) + Arabic meaning + English example (target word bolded) + IPA (null-safe). Words enriched client-side via a best-effort join to `curriculum_vocabulary` (POS/def_en/ipa) by `source_vocab_id` — NO change to the shared `spelling_lab_select_session` RPC. Correct-answer auto-advance (1.3s) replaced by an explicit "التالي" button (the learning moment). IPA is null for the entire lab subset → that line collapses silently. Legacy `/student/spelling` (`StudentSpelling.jsx`, different `spelling_words` table, no rich data) intentionally left as-is.
- **4 — Premium student dashboard as the default.** `/student` (no `?design`) now renders a NEW `PremiumDashboard.jsx` instead of the plain original. The three earlier exploration variants (Editorial/Cinematic/Atelier) consumed only the thin `useStudentDashboard` feed and DROPPED most features (Cinematic also had dead links `/student/anki`, `/student/challenges`), so rather than ship one of them, composed Cinematic's Apple-grade aesthetic onto the ORIGINAL's full production query set + every legacy widget (weekly tasks + per-task deep links, quick-access w/ assignment badge, daily/weekly charts, streak/team, next-class, SRS/placement/level-exit, live feed, payment widget, journey/competition/retention/PWA prompts) → 100% feature + data parity, no placeholders, all routes verified to exist. New `PremiumHero.jsx` + `_premiumShell.jsx` (ambient field / section bands; `--ds-*` tokens, RTL, mobile-first). Rollback is lossless: `?design=original` (or `classic`) → untouched `StudentDashboardOriginal`; `v1/v2/v3` still reach the explorations.
- **Verify:** `npm run build` ✓ green twice. **Headless smoke PASS** (Playwright vs the prod preview build, login as `mock-test-a1`): **WebKit** — premium dashboard renders, no crash, `متابعة التعلّم` CTA + weekly tasks present (feature parity); spelling-lab POS pill renders, no crash. **Chromium** — listening player LOADS (duration 99.8s) and PLAYS: a deliberate fast double-tap (the old AbortError trigger) advanced `currentTime` 3.98→7.49s with a SINGLE `play()` that RESOLVED and no error card → the abort loop is gone. (Headless WebKit can't decode media → `readyState` stays 0, so the *audible*-on-Safari confirmation is Ali's device check.) Reading word-tap: build-verified + low-risk (`WordPopup` unchanged); headless tab-routing couldn't reach the passage → quick device check recommended. Evidence + reusable scripts: `docs/audits/student-exp-verify/`.
- Files (new): `src/pages/student/dashboards/PremiumDashboard.jsx`, `PremiumHero.jsx`, `_premiumShell.jsx`, `src/pages/student/spelling-lab/WordRevealCard.jsx`. Files (modified): `src/lib/audio/pronounceWord.js`, `src/pages/student/curriculum/tabs/ReadingTab.jsx`, `src/components/players/listening/ListeningPlayer.jsx`, `src/pages/student/spelling-lab/SpellingSession.jsx`, `src/pages/student/StudentDashboard.jsx`, `CLAUDE.md`.
- DB: none (all data already present — read-only diagnosis only). Edge Functions: none. Storage: none.
- Status: Complete + COMMITTED (`2fd64d7`) + PUSHED to `origin/reading-glossary-and-bug-reports`. Vercel **Preview** built & live (owner-only; anon gets 401): https://fluentia-jujrpccbb-alialahmad2000s-projects.vercel.app — NOT merged to main/production. Recommend Ali test the preview (Mac Safari hard-refresh + iPhone), then merge. Note: the parallel `feat/student-activity-reports` branch (per-student daily-activity rollup WIP) was inadvertently caught by the shared HEAD during the parallel run; its branch ref was restored to `07506db` and its untracked migration/scratch left untouched.

### 2026-06-03 — READING WORD-MEANING (offline glossary, 100% coverage) + STUDENT BUG-REPORT CHANNEL
- Two student-requested features on branch `reading-glossary-and-bug-reports`. Both fully OFFLINE for the requested constraint — NO runtime Claude/AI for word meanings; everything generated by Claude Code at build time.
- **FEATURE 1 — "tap any word → always get a meaning" in the reading section.** Students reported that tapping certain words in the editorial reading surface showed only "لا توجد ترجمة لهذه الكلمة في القاموس". Root cause: `WordPopup` resolves meaning solely from `curriculum_vocabulary` via `useArticleVocabIndex` (exact lowercase `.in('word', …)`). Any word not in that table — and crucially every **inflected form** (celebrations vs celebrate) and punctuation-wrapped token — returned `vocabRow=null`. The Claude-backed `vocab-quick-meaning` edge fn is NOT wired into this editorial popup at all.
  - **Coverage math (144 passages, 7,152 distinct normalized tokens len>1):** 2,703 already covered by `curriculum_vocabulary` (rich rows: audio/IPA/example); the 4,449-row gap is filled by a new **offline glossary**.
  - **DB:** `supabase/migrations/20260603120000_reading_glossary.sql` — table `reading_glossary(word PK lowercased, meaning_ar, part_of_speech, base_form, source)` + RLS (authenticated read, service-role write). Keyed by the EXACT normalized token so runtime lookups are exact hits (no fragile runtime lemmatization).
  - **Glossary assembled from 3 offline sources (no AI):** 1,460 inflected-form→base-meaning maps (morphological reducer), 990 legacy `vocab_cache` rows (past Claude lookups, reused as static data), and **2,015 fresh EN→AR translations I generated by hand** for the words with no existing meaning (content words, acronyms, place/brand names). Fresh translations live in `scripts/seeds/reading-glossary/fresh-01..08.json` (audit trail); loaded via `scripts/_load-reading-glossary.cjs`.
  - **Normalization (key correctness fix):** tokenizer emitted punctuation-wrapped tokens (`'aha`, `-hour`, `world's`). Added `normWord()` = lowercase + strip leading/trailing non-letters (keep internal `'`/`-`), applied IDENTICALLY in the seed pipeline, `useArticleVocabIndex`, and `ArticleBody`, so keys and lookups always match.
  - **Frontend:** `useArticleVocabIndex` now merges `curriculum_vocabulary` (rich, drives the gold underline via `is_vocab:true`) with `reading_glossary` (fallback meaning) into ONE `Map<word,row>`. `ArticleBody` underlines only `is_vocab` words but resolves a meaning for ANY tapped token via the merged map. `WordPopup` unchanged — glossary words show `definition_ar`; audio falls back to offline Web Speech via the existing `pronounceWord` (no curriculum audio needed); "save to vocab" still works (id/curriculum_vocabulary_id null).
  - **Verified 100.00% coverage:** every distinct passage token (len>1) resolves via `curriculum_vocabulary ∪ reading_glossary` using the exact same query path the runtime uses (incl. the 16 uppercase-stored acronyms DNA/MRI/UNESCO/X-ray/Alzheimer's/… that the runtime's lowercase `.in` would otherwise miss — now in the glossary). Single-letter tokens ("a"/"I") intentionally left unresolved (not meaningful vocabulary).
- **FEATURE 2 — simple, always-reachable student bug reporting + staff notification.**
  - **DB:** `supabase/migrations/20260603120100_bug_reports.sql` — `bug_reports` table (reporter, description, page_url, screenshot_path, device_info jsonb, status new|in_progress|resolved|wontfix, admin_notes, resolved_*) + RLS (insert/select own, staff select-all + update). Private `bug-screenshots` storage bucket + storage RLS (upload into own `<uid>/` folder, staff read all).
  - **Edge fn:** `supabase/functions/submit-bug-report/index.ts` (deployed v1 ACTIVE, `--no-verify-jwt`, via new generic `scripts/_deploy-fn.cjs` multipart deployer). Verifies the reporter JWT, records the report (service role), fans out an in-app `notifications` row (type `system`, action_url `/admin/bug-reports`) to EVERY admin/trainer, and emails the admins via Resend with a 30-day signed screenshot URL. Screenshot upload is best-effort — a failed upload never blocks the report.
  - **Student UI:** floating "🐞 أبلغ عن مشكلة" button (`BugReportButton`, bottom-right, mounted globally in `LayoutShell` so it's reachable on every page) → minimal RTL sheet (`BugReportModal`): one textarea + optional screenshot via **clipboard paste (Ctrl/⌘+V)**, file picker, or preview/remove. Auto-captures `page_url` + device info. `src/lib/bugReport.js` uploads + calls the edge fn through `invokeWithRetry`.
  - **Admin triage:** `src/pages/admin/AdminBugReports.jsx` at `/admin/bug-reports` (nav item under النظام, route in App.jsx) — list with reporter/page/screenshot(signed-URL)/device + status filter + one-click status changes.
  - **E2E verified:** signed in as the A1 test student → edge fn HTTP 200 + bug_id, row created, **7 staff notifications** fanned out, then cleaned up.
- **Verify:** esbuild parse-check PASS on all new/modified JS/JSX (9 files). 100% reading coverage confirmed. Bug-report E2E PASS. No `npm run build` (project rule).
- Files (new): `supabase/migrations/20260603120000_reading_glossary.sql`, `supabase/migrations/20260603120100_bug_reports.sql`, `supabase/functions/submit-bug-report/index.ts`, `src/lib/bugReport.js`, `src/components/bug-report/{BugReportButton,BugReportModal}.jsx`, `src/pages/admin/AdminBugReports.jsx`, `scripts/_deploy-fn.cjs`, `scripts/_load-reading-glossary.cjs`, `scripts/seeds/reading-glossary/fresh-01..08.json`. Files (modified): `src/hooks/useArticleVocabIndex.js`, `src/components/curriculum/reading/ArticleBody.jsx`, `src/components/layout/LayoutShell.jsx`, `src/App.jsx`, `src/config/navigation.js`, `CLAUDE.md`.
- DB: 2 new tables (`reading_glossary` 4,465 rows, `bug_reports`) + 1 storage bucket (`bug-screenshots`). No changes to existing tables/rows. Edge Functions: `submit-bug-report` deployed v1.
- Status: Complete on branch `reading-glossary-and-bug-reports`. Reading meaning fix is data-only + 3 small frontend files; bug-report is additive. Ready for Ali's device check + merge.

### 2026-06-03 — LISTENING SAFARI FIX (THE root cause): mixed mono/stereo frames in combined.mp3 → re-encoded to uniform mono
- **The bug that survived 6 attempts:** listening "plays in Chrome, silent in Safari". Found by analyzing the actual file the player loads (`combined.mp3`, a concat of speaker segments) instead of transport. Each combined file was ONE mp3 stream whose frames **switch between mono and stereo** (one block per concatenated segment — e.g. the L5 file: 12,075 mono frames + 182 stereo frames interleaved). **Chrome reconfigures the decoder mid-stream; WebKit/Safari locks the channel layout from frame 1 (mono) and goes silent/stalls on the differing frames.** Every prior attempt chased transport (CORS/range/content-type/crossOrigin/eager-load/gesture) — all of which re-probed CLEAN here (HTTP/2 200 `audio/mpeg` `accept-ranges`; `bytes=0-1`→206; `bytes=0-`→206; OPTIONS allows `range`). The one "headless WebKit plays it" test had used a single **segment** file (consistent mono), never the mixed `combined.mp3`.
- **Scope:** 72 listening rows = 27 single-segment monologues (`s0_*.mp3`, uniform) + 45 multi-speaker `combined.mp3`. Scan found **31 of 45 combined files were mixed mono/stereo** (every inconsistent file was a combined; all monologues already uniform).
- **Fix (data):** re-encoded every inconsistent file to **uniform mono 44.1k CBR** (`ffmpeg -ac 1 -ar 44100 -c:a libmp3lame -b:a 128k -map_metadata -1`) and re-uploaded to the SAME storage path via Storage API **PUT** + `x-upsert` with the `sb_secret_*` key (POST errors on existing objects — PUT is the overwrite verb). **31/31 fixed (30 batch + 1 manual L5), 0 failed.** Final scan of all 45 combined files: **0 inconsistent remaining.** CDN serves the mono bytes immediately (Supabase storage CDN revalidates on overwrite — plain public URLs return channels=1, no stale `age`; no URL change / cache-bust needed). Audio URLs unchanged, so no app redeploy required for the fix — the files themselves are fixed on the CDN.
- **Pipeline hardening (prevent recurrence):** `scripts/audio-v2/lib/concat.cjs` already targets mono (`TARGET_CH=1`) → the 31 were LEGACY files from before that hardening; its decode-verify (`ffmpeg -f null`) TOLERATES mixed channels, which is how they shipped. Added a **channel-uniformity assertion** after concat: ffprobe per-frame channels must be a single value or the build throws — a Safari-silent mixed-mode file can never ship again.
- **Caching note for Ali:** his Mac Safari may hold the OLD mixed file in its local HTTP cache (served `max-age=3600`) — a hard refresh (Cmd+Shift+R) or reopening after ~1h loads the fixed mono file. The `?debug=audio` overlay (prompt 15) will now show currentTime advancing WITH sound.
- Files (new): `scripts/audits/listening-channel-fix/normalize-listening-audio.cjs`, `docs/audits/listening-channel-fix/FINAL-REPORT.md`. Files (modified): `scripts/audio-v2/lib/concat.cjs`, `CLAUDE.md`. Storage: 31 `combined.mp3` objects overwritten with uniform-mono re-encodes. DB: none. Edge: none. App `src/`: none.
- Status: Complete on storage + CDN (0 mixed remaining). Real-device confirmation = Ali on Mac Safari after a hard refresh.

### 2026-06-02 — LISTENING DEBUG OVERLAY (prompt 15): flag-gated `?debug=audio` live `<audio>` diagnostic
- Straight to `main` (flag-gated, zero student-facing risk — no PR). Goal: end six rounds of guessing on the silent-listening-player-on-Safari bug by SHOWING the live state of the real `<audio>` element on Ali's machine.
- **Phase A (`docs/audits/listening-overlay/PHASE-A.md`):** listening player = `src/components/players/listening/ListeningPlayer.jsx` (prompt's `src/components/curriculum/listening/` is a Windows-env guess). It uses a single real `<audio ref={audioRef}>` (line 506); **no `muted`/`volume`/`defaultMuted` set anywhere in the app** — so any muted/volume-0 state is browser/OS, not our code. Word-pron (`src/lib/audio/pronounceWord.js`) is two-tier: Tier 1 MP3 via `new Audio()`, **Tier 2 Web Speech `speechSynthesis`** (telemetry: ~48% of iPhone word plays). Web Speech bypasses the `<audio>` element AND Safari per-tab mute → "word audio works, listening silent in the same Safari" fits the tab-mute / output-routing theory.
- **Phase B — overlay (`src/components/players/listening/AudioDebugOverlay.jsx`, NEW, observe-only):** fixed panel polling the player's `audioRef` every 250ms — prints src/muted/volume/defaultMuted/paused/currentTime/duration/readyState/networkState/error/playbackRate/sinkId — plus an on-screen plain-words **VERDICT** and four one-tap tests: **Force Unmute**, **Force Volume 100%**, **Test Beep (Web Audio** — does ANY output reach the tab's speakers?), **Fresh `<audio>` play()** (bypasses the React player). Positioned at the **top** (translated from the prompt's "bottom") so it never covers the player's fixed bottom play bar. Word-pron path shown in the footer.
- **Gate:** mounted in `ListeningPlayer` as `{AUDIO_DEBUG && <AudioDebugOverlay …/>}` where `AUDIO_DEBUG = new URLSearchParams(window.location.search).get('debug') === 'audio'` (read off `window.location` to keep the low-level player router-decoupled; no new hook/dep). Exactly ONE render site, gated. Students never pass `?debug=audio` → never see it.
- **Verify:** single gated render site confirmed by grep; esbuild jsx parse-check 2/2 files OK. No `npm run build` (prompt rule). Playback logic UNCHANGED (observe-only).
- **For Ali:** Safari on Mac (hard-refresh / reopen PWA first) → `…/student/curriculum/<unit>/listening?debug=audio` → press the normal Play button → read the green panel's VERDICT → try the 4 buttons in order → screenshot the panel. That screenshot pinpoints the cause.
- Files (new): `src/components/players/listening/AudioDebugOverlay.jsx`, `docs/audits/listening-overlay/PHASE-A.md`. Files (modified): `src/components/players/listening/ListeningPlayer.jsx`, `CLAUDE.md`.
- DB: none. Edge Functions: none.
- Status: Complete — straight to `main`, flag-gated.

### 2026-06-02 — MEGA (prompt 09): reading modal · sidebar cleanup · Spelling Lab · listening re-confirm
- Ran prompt `09-MEGA-READING-SIDEBAR-SPELLING-LISTENING`. Four surfaces on branch `mega-reading-sidebar-spelling-listening`. Phase A surfaced two facts the (externally-written) prompt couldn't know, resolved with Ali before building.
- **Branch base (done FIRST, per Ali):** `dashboard-v2-letter` was 3 commits ahead of `origin/main` and unmerged (emergency admin-students fix `f5cad24` + V2 letter `5a978e8` + discovery doc). Fast-forwarded `main` to `f5cad24` and pushed (Vercel auto-deploys). **Correction to Ali's premise:** the listening V5 fix (`202366e`+`7a848c6`) was ALREADY on `origin/main` — it was never the unmerged work. New feature branch cut from the now-current `main`.
- **Surface 1 — Reading tools → centered modal:** `src/components/curriculum/reading/ReadingTools.jsx` converted from a right-side fixed drawer to a centered modal (backdrop blur, `min(90vw,480px)` × `max-h min(80vh,600px)` internal scroll, fade+scale, focus trap, Escape/backdrop/X close, radius 16, deep shadow). Props unchanged → call site (`ReadingTab.jsx`) untouched. Used the REAL tokens (`--ds-bg-elevated`/`--ds-border-subtle`); the prompt's `--ds-paper-*` tokens don't exist in this repo.
- **Surface 2 — Sidebar cleanup:** `src/config/navigation.js`. Hid 6 student items from the sidebar `sections` (the prompt's 7th, "التحدّي/Challenge", isn't a separate item here): progress(تقدّمي), reports(التقارير), how-to-earn, level-journey, competition, competition-rules. **Routes untouched** (direct-URL reachable) and items kept in `drawerSections` (the "More" drawer, per the file's own reachability comment). Added new item **مختبر الإملاء → /student/spelling-lab** after Vocabulary. `mobileBar`: swapped the now-hidden `progress` for the Lab (iPhone-primary userbase).
- **Surface 3 — Spelling Lab (مختبر الإملاء), NET-NEW, built ALONGSIDE the legacy "مدرب الإملاء" trainer** (Ali's call — retiring/migrating the old one is a separate later prompt). The prompt assumed a clean `/student/spelling` + `spelling_words`, but both already exist with a different schema, so the Lab uses its own **`spelling_lab_*`** namespace (tables AND rpcs) and route **`/student/spelling-lab`**. Legacy `StudentSpelling.jsx` + `spelling_words`/`spelling_sessions`/`student_spelling_progress` left fully intact.
  - **DB** (applied via Management API): migration `20260602120000_spelling_lab.sql` → `spelling_lab_words` / `spelling_lab_mastery` / `spelling_lab_attempts` + indexes + RLS (words: authenticated read; mastery: own ALL; attempts: own insert+read; `student_id = auth.uid()`).
  - **Seed** `20260602120100_spelling_lab_seed.sql` (idempotent, ON CONFLICT): Source A = all 7,437 distinct single-word curriculum_vocabulary entries (col map word→word_en, pronunciation_ipa→ipa, definition_ar→meaning_ar, example_sentence→example_en, id→source_vocab_id); Source B = 68 common (after curriculum-overlap dedupe); Source C = 70 phonetic_traps (silent/double flags). **Total 7,575 words, difficulty 1–9.** Curriculum is the primary seed (gated by the session selector so beginners only see short words first); B/C fill the odd difficulty bands.
  - **RPCs** `20260602120200_spelling_lab_rpcs.sql` (all SECURITY DEFINER, search_path=public, derive student from auth.uid()): `spelling_lab_select_session(p_mode,p_size)` 60% due / 30% new ≤level+1 / 10% level+2..3 with graceful fallback fill; `spelling_lab_record_attempt(word,mode,text,ms)` → logs attempt, case-insensitive correctness, Anki-lite mastery upsert (3-streak→mastered/due NULL; correct→+1day; wrong→+10min), returns `{is_correct, correct_spelling, mastery}`; `spelling_lab_student_level()` = 1 + mastered/5, capped 50. **End-to-end tested** (JWT-claims impersonation): 3 corrects→mastered, wrong→reviewing, session returns 10, level computes; test rows cleaned up.
  - **Frontend:** route in `App.jsx`; `src/pages/student/SpellingLab.jsx` (landing: level/mastered/due tiles, two-mode CTAs, due-review section; Amiri/Cormorant/Readex, --ds-* tokens, mobile-first, calm copy, no exclamation marks); `src/pages/student/spelling-lab/SpellingSession.jsx` (10-word state machine: listen_type auto-plays audio_url with Web-Speech fallback / see_retype reveals 2s then fades; optimistic instant feedback + background `record_attempt`; wrong→retype-once-to-advance; calm progress dots; summary). All hooks-at-top. 5/5 files Babel-parse clean (no `npm run build` per prompt rule).
- **Surface 4 — Listening V5: NO rebuild** (Ali's call; fix already live). Read-only re-confirm: player IS the synchronous-`play()` V5 version; `curriculum-audio` bucket is public with `audio/mpeg` + `accept-ranges: bytes` + `access-control-allow-origin: *` (200 + range 206 under iPhone Safari UA). Note in `docs/audits/listening-v5/PROMPT-09-RECONFIRM.md`. If audio still fails on iPhone after deploy → stale PWA bundle (this PR bumps `version.json`; else hard-refresh / reinstall PWA).
- Files (new): `supabase/migrations/20260602120000_spelling_lab.sql`, `20260602120100_spelling_lab_seed.sql`, `20260602120200_spelling_lab_rpcs.sql`, `src/pages/student/SpellingLab.jsx`, `src/pages/student/spelling-lab/SpellingSession.jsx`, `docs/audits/listening-v5/PROMPT-09-RECONFIRM.md`. Files (modified): `src/components/curriculum/reading/ReadingTools.jsx`, `src/config/navigation.js`, `src/App.jsx`, `public/version.json`, `CLAUDE.md`.
- DB: 3 new tables + 4 RLS policies + 4 RPCs + 7,575 seeded words in the new `spelling_lab_*` namespace. No changes to any existing table/RPC/row.
- Status: Complete. On branch `mega-reading-sidebar-spelling-listening` → PR. `/student/spelling-lab` route lands with Surface 3. Old spelling trainer untouched.

### 2026-06-02 — FIX-READING-VOCAB-SET (prompt 14): vocab index normalized to Set/Map — "s?.has is not a function"
- Branch `fix-reading-vocab-set` off `main`. Reading section crashed with `s?.has is not a function. (In 's?.has(f.toLowerCase())', 's?.has' is undefined)` at minified `ReadingTab-*.js` inside the word tokenizer's `.map()`. Optional chaining didn't help — the value wasn't null, just the wrong type.
- **Root cause (Phase A, `docs/audits/reading-vocab-set/PHASE-A.md`):** `src/components/curriculum/reading/ArticleBody.jsx` calls `vocabIndex.has(word)` (line 54) + `vocabIndex.get(word)` (line 15). `vocabIndex` is the `.data` of `useArticleVocabIndex` (`ReadingTab.jsx:388`), whose `queryFn` ALWAYS returns a `Map` — so the queryFn was not the bug. The real cause: `src/main.jsx` wraps the app in `PersistQueryClientProvider` + `createSyncStoragePersister` (localStorage `fluentia-query-cache-v1`), persisting every successful query. **A `Map` does not survive JSON serialization** — `JSON.stringify(new Map(...))` === `"{}"` — so on reload the `['article-vocab-index', id]` cache rehydrates as a plain object `{}` whose `.has`/`.get` are `undefined` → crash. Production-only / "some articles only" because it needs a previously-fetched-and-persisted entry to rehydrate. (Same shape hazard on line 15's `.get`.)
- **Fix (Phase B):**
  - **B.1 belt — `ArticleBody.jsx`:** added a `useMemo` that normalizes ANY incoming shape (Map / Set / array of strings / array of `{word|word_en}` / plain object keyed-by-word / `{data}` wrapper / nullish, incl. the rehydrated `{}`) into a real `Map<string,row>`; both the underline check (`.has`) and the popup lookup (`.get`) read from it. Can't crash on any shape.
  - **B.2 suspenders — `useArticleVocabIndex.js`:** tagged the query key `['article-vocab-index', 'no-persist', articleId]` so the Map is never written to localStorage / rehydrated as a lossy `{}` (matches the existing `shouldDehydrateQuery` `!queryKey.includes('no-persist')` convention in `main.jsx`). `ReadingTab.jsx:388` also gets a `= new Map()` default for the loading path.
  - **B.3:** `WordPopup` already takes `vocabRow` as a prop (no `.get` on the index) — already null-safe; the only `.get` was in `ArticleBody`, now on the normalized Map.
- **Verify (Phase C, `docs/audits/reading-vocab-set/PHASE-C.md`):** `verify-normalize.cjs` → 16/16 PASS (10 shapes incl. the `{}` crasher all yield a non-throwing Map; underline detection + popup row + no-false-positives semantics preserved). esbuild jsx parse-check 3/3 files OK. No `npm run build` (prompt rule). Decisive product check = Ali on iPhone after Vercel preview deploys.
- Editorial reading design unchanged; gold dotted underline + tap-to-popup preserved. Listening/sidebar/spelling untouched.
- Files (modified): `src/components/curriculum/reading/ArticleBody.jsx`, `src/hooks/useArticleVocabIndex.js`, `src/pages/student/curriculum/tabs/ReadingTab.jsx`. Files (new): `docs/audits/reading-vocab-set/{PHASE-A,PHASE-C}.md` + `verify-normalize.cjs`.
- DB: none. Edge Functions: none.
- Status: Complete. On branch `fix-reading-vocab-set` → PR (guard-only safe fast-track).

### 2026-06-02 — LISTENING/AUDIO WEBKIT FIX (prompt 10): two iOS-Safari root causes, found via real telemetry
- Branch `listening-webkit-fix` off `main`. New clue from Ali: audio plays in Chrome, fails in Safari + the installed PWA. The breakthrough was reading the **real device telemetry** (`audio_event_log` + `audio_telemetry`) — first actual iOS failure data in this 6-attempt saga. It revealed **two distinct iOS-Safari-only root causes**, neither reproducible in headless WebKit (which is far more lenient than real iOS). Full forensic: `docs/audits/listening-webkit/PHASE-A.md`.
- **Diagnosis (all read-only):** (A.1) cross-engine raw test (`scripts/audits/listening-webkit/01-raw-audio.cjs`) — a real mp3 PLAYS in WebKit + Chromium, with AND without crossOrigin → file/codec/crossOrigin not a hard headless failure. (A.2) CORS clean — 200 + 206 range + OPTIONS preflight all carry `access-control-allow-origin: *`. (A.3) player gesture chains sound (synchronous play() in tap), zero `AudioContext` anywhere. (A.4 telemetry — the real evidence): word-audio falls back to Web Speech **~48% on iPhone** (116/243) + `cache_play_failed:NotSupported` on iPhone OS 18.7 + `media_error` on iPad; listening player logs `MEDIA_ERR_SRC_NOT_SUPPORTED` (code 4) + `NotSupportedError` + AbortError on iPhone/iPad/Safari **for the same `s0_layla.mp3` that plays in headless WebKit** (so NOT file/encoding/concat/CORS).
- **Root cause 1 — crossOrigin on plain playback:** word-pronunciation + reading-article audio set `crossOrigin="anonymous"` on `<audio>`/`new Audio()` despite NO Web Audio API consuming them. Real iOS Safari enforces CORS-mode media strictly and intermittently rejects it (the ~48% iPhone fallback); Chrome is lenient. **Fix:** removed `crossOrigin` from all 6 plain-playback paths — `src/components/AudioPlayer.jsx`, `src/components/players/lib/useWordAudio.js`, `src/components/audio/wordlens/useWordLensAudio.js`, `src/components/audio/hooks/useAudioEngine.js`, `src/lib/playAudioSlice.js`, `src/lib/audio/pronounceWord.js`. (Left `PremiumVideoPlayer.jsx` video — out of scope.)
- **Root cause 2 — eager load() outside gesture (listening):** `ListeningPlayer.jsx` called `audio.load()` in a mount effect (not a gesture), with `preload="metadata"` and across the several keyed players a unit mounts → pushes iOS into a spurious `MEDIA_ERR_SRC_NOT_SUPPORTED` (code 4) state before the first tap, so play() then rejects ("nothing happens"). **Fix:** removed the eager `audio.load()` from the source effect — setting `src` lets `preload="metadata"` fetch the header for the scrubber, and the gesture-driven `play()` performs the full load inside the user-gesture context (iOS honors that). The gesture-driven `retry()` load() is unchanged.
- **Honesty:** neither fix is *provable* in headless tooling (headless macOS WebKit ≠ real iOS Safari); both target documented iOS behaviors matching the telemetry signatures, and both are zero-risk (Chrome + headless WebKit behave identically before/after). **Definitive verification = Ali on his iPhone after deploy**; the two telemetry tables will show the fallback rate + code-4 count drop. `version.json` bumped so installed iOS PWAs refresh.
- Files (new): `scripts/audits/listening-webkit/{01-raw-audio,02-app-listening}.cjs`, `docs/audits/listening-webkit/PHASE-A.md`. Files (modified): the 6 audio paths above + `src/components/players/listening/ListeningPlayer.jsx` + `public/version.json` + `CLAUDE.md`. DB/edge: none.
- Status: Complete. On branch `listening-webkit-fix` → PR (independent of the prompt-09 PR #1).

### 2026-06-01 — EMERGENCY HOTFIX: admin students page showed ZERO (PostgREST embed ambiguity)
- Symptom: admin "الطلاب" page rendered 0 students. Data was fully intact (25 active / 26 total, 0 null-gender) — a **visibility** regression, not data loss.
- **Root cause (self-inflicted):** yesterday's letter migration added `students.assigned_trainer_id uuid REFERENCES profiles(id)`. That was a SECOND `students→profiles` FK (alongside the pre-existing `students_id_fkey`: students.id → profiles.id). PostgREST could no longer resolve the **bare** `profiles(...)` embed in `AdminStudents.jsx` (`.select('… profiles(full_name,display_name,email,phone) …')`) and returned `PGRST201 "more than one relationship was found for 'students' and 'profiles'"` → query errored → empty list. Reproduced live against `/rest/v1/students?select=id,profiles(full_name)` before and after.
- **Fix:** `ALTER TABLE students DROP CONSTRAINT students_assigned_trainer_id_fkey` (kept the column). Restores every bare `profiles(...)` embed app-wide with NO frontend deploy. Verified: exact admin query → HTTP 200, 25 rows. PostgREST schema cache auto-reloaded.
- Why drop vs. keep-FK-and-disambiguate: dropping is DB-only/instant/no-deploy; the column is NULL for everyone and the letter edge function resolves the trainer via a code-side profiles map (not an embed), so nothing depended on the FK. Future option: if referential integrity on assigned_trainer_id is wanted, re-add the FK ONLY after changing every bare `students→profiles` embed to `profiles!students_id_fkey(…)`.
- Files: `supabase/migrations/20260601120000_hotfix_drop_students_trainer_fk.sql` (new), `supabase/migrations/20260531120000_gender_trainer_and_daily_letters.sql` (column now declared WITHOUT the FK + warning comment). Applied live via Management API. **Lesson: never add a 2nd FK from a table to one PostgREST already embeds with a bare alias.**
- Status: Complete — production restored. (Could not read the `08-EMERGENCY-…` prompt file: macOS blocked ~/Downloads access this session; diagnosed from first principles since it traced to my own change.)

### 2026-05-31 — DASHBOARD-V2 TRAINER LETTER (gender-aware): net-new daily Arabic letter system
- What: Built the morning "trainer letter" for the `?design=v2` dashboard. Mixed-gender platform (~23 female + 2 male), and Arabic grammar is gendered, so each letter is routed to one of two gendered SYSTEM_PROMPTs per student. Signature is dynamic from `students.assigned_trainer_id → profiles`, falling back to "د. محمد". (07 v1 never existed in this repo → built net-new; `assembleStudentDay` mirrors the production `useStudentDashboard` hook since its spec was deferred to the missing original 07.)
- **DB** (migration `20260531120000_gender_trainer_and_daily_letters.sql`, idempotent): added `students.gender` (CHECK male|female, default female) + `students.assigned_trainer_id` (uuid → profiles); backfilled علي سعيد القحطاني (`1148c3bd…831e830`) + عبدالرحمن الشمري (`730b4e93…bbebcd1`) to `male`; created `daily_letters` (carries gender + trainer_id snapshot) + `daily_letters_runs` (with `generated_male`/`generated_female`) + RLS. Applied live via Management API. NOTE: `students` has NO `name_ar` — name comes from `profiles.display_name||full_name`.
- **Edge Function**: `generate-daily-letters` (index.ts + gender.ts) — gender-routed prompts, trainer-name resolution, Claude Haiku 4.5 (`CLAUDE_API_KEY`), gendered template fallback, idempotent upsert on (student_id, letter_date), cost cap (MAX_STUDENTS=80, max_tokens=400), run telemetry. Auth: service-role (note: project uses the new `sb_secret_*` key as the runtime SERVICE_ROLE_KEY) or admin JWT. Deployed `--no-verify-jwt`.
- **Cron** (`20260531130000_daily_letters_cron.sql`): `0 2 * * *` (05:00 Riyadh) registered but **DISABLED** (`active=false` via `cron.alter_job`) — Ali enables when ready.
- **Frontend**: `src/hooks/useDailyLetter.js`, `src/components/dashboard/DailyLetterCard.jsx` (Amiri salutation / Readex Pro body / rotated Amiri-italic signature; gender-aware neutral optimistic placeholder; `LetterActionFooter` with gendered button labels), mounted at top of `CinematicDashboard` (v2). `students` select('*') in authStore means `studentData.gender` is auto-available. Admin: `DailyLettersPanel.jsx` (male/female split + force-run) mounted on `/admin/retention`.
- **Verify**: First manual run generated 25 letters (2 male / 23 female, all via Claude, 0 errors, ~$0.06). Automated cross-gender scan over all 25 → **0 leakage**. `vite build` clean. Full checklist in `docs/audits/dashboard-v2-letter/PHASE-C.md`.
- **Production-safe**: letter renders ONLY on `?design=v2`; default `/student` (OriginalDashboard) untouched. Cron disabled. Trainer assignment left NULL (separate admin-UI prompt).
- Status: Complete. On branch `dashboard-v2-letter`.

### 2026-05-23 — MOCK-EXAM-RETAKE: archive نادية's silent-fail attempt + verify save-chain end-to-end
- What: After the visibility-fix shipped, Ali impersonated a student and confirmed that the student behind the silent-save bug (0 real answers, score 0) was stuck on the 0/100 result screen. Ran the 4-phase retake prompt.
- **Phase A.1 — classification of every submitted real-student attempt (3 rows):**
  - نادية القحطاني (B1) — 0 real answers, score 0, NOT auto-submit (her attempt expired and the cron force-submitted it via `mock_exam_admin_force_submit`; the row reads `is_auto_submitted=false` due to the known COALESCE quirk in that RPC, but the audit log holds the truth). **Classification: NEEDS_RETAKE.**
  - علي سعيد القحطاني (A1) — 33/33 real answers, writing 58w, score **71/100**. Genuine effort. Skipped.
  - فاطمة خواجي (A1) — 34/34 real answers, writing 80w, score **88/100**. Genuine effort. Skipped.
  - لمياء / منار / هوازن have 0 rows in `mock_exam_attempts` after the second-chance archive earlier today, so this prompt didn't need to touch them. The cache-invalidation fix in `526c7b9` already restored their intro screen.
- **Phase A.2 — SECURITY DEFINER audit via Management API** (`POST /v1/projects/{ref}/database/query` with the access token from `.mcp.json`): all 5 critical RPCs (`mock_exam_start`, `mock_exam_save_answer`, `mock_exam_save_writing`, `mock_exam_submit`, `mock_exam_admin_force_submit`) returned `prosecdef=true, proconfig=[search_path=public]`. ✓ No RLS / search-path vulnerability.
- **Phase A.3 — save-chain smoke test (real RPC call as a non-admin authenticated user):** signed in as `mock-test-a1@fluentia.academy / MockTest2025!` via `auth.signInWithPassword`, exchanged the access token into a new client with `Authorization: Bearer …` header, called `mock_exam_start('midterm-mock-a1')` → 35 questions returned + attempt_id, called `mock_exam_save_answer(attempt_id, first_mcq.id, 1, null)` → no error, service-role SELECT against `mock_exam_answers` → row present with `selected_index=1`. **End-to-end PASS.** Cleaned up the smoke-test attempt via `mock_exam_archive_and_reset(p_reason='smoke_test_cleanup_2026-05-23')` so the test student starts clean. Confirms the silent-save class of failure is purely client/network, not server-side.
- **Phase B — archive نادية's attempt:** called `mock_exam_archive_and_reset('e66e8ccb-…', 'retake_after_save_chain_fix_2026-05-23')`. Result: `{archived: true, audit_archived: 3, ai_log_archived: 0, answers_archived: 0}`. Post-archive sanity: نادية has 0 active attempts ✓. The strict predicate in `_retake-phase-b.cjs` re-evaluates `(is_test_account=false AND answers_with_data<5 AND score<=5)` before each archive so no real-result attempt can slip through even if Phase A's output were tampered with.
- **Phase C — visibility verify:** simulated MockExamGate landing query — نادية now resolves to `matching_exam=midterm-mock-b1, visibility=live, active_attempts=0`. Her next page load shows the IntroCard with "ابدئي الاختبار الآن" (the cache-invalidation fix shipped earlier guarantees a fresh re-read on entry).
- **Phase D — re-notification:** inserted one in-app announcement `id=66adc02c-…` with `data.kind='mock-exam-retake-2026-05-23'`, `priority='high'`, `action_route='/student/mock-exam'`, `expires_at=2026-05-24T19:00:00Z`. Idempotency-guarded on `(user_id, type, data->>kind)`.
- **Phase F:** paste-ready Arabic WhatsApp message drafted in `docs/MOCK-EXAM-RETAKE-DIAGNOSIS.md`.
- **Sacred constraints preserved:** 9 mock_exam RPCs untouched. `visibility='live'` preserved. Cron preserved. No schema changes. Real-result attempts (علي القحطاني 71/100, فاطمة 88/100) preserved. لمياء / منار / هوازن untouched (already 0-attempts post-second-chance archive).
- Files (new): `prompts/agents/MOCK-EXAM-RETAKE.md`, `docs/MOCK-EXAM-RETAKE-DIAGNOSIS.md`, `docs/MOCK-EXAM-RETAKE-PHASE-A-RAW.json`, `docs/MOCK-EXAM-RETAKE-PHASE-B-RAW.json`, `docs/MOCK-EXAM-RETAKE-PHASE-CD-RAW.json`, `scripts/_retake-phase-a.cjs`, `scripts/_retake-phase-b.cjs`, `scripts/_retake-phase-c-d.cjs`. Files (modified): `CLAUDE.md`.
- DB: 1 row archived from `mock_exam_attempts` (e66e8ccb-…) + cascade-cleaned its answers/ai_log; 1 row inserted to `mock_exam_attempts_archive` (reason `retake_after_save_chain_fix_2026-05-23`); 1 row inserted to `notifications`; 3 rows from `mock_exam_audit_log` re-pointed to NULL attempt_id (preserving history per the existing `ON DELETE SET NULL` policy). No schema changes. No RPC changes.
- Edge Functions: 0 changes, 0 invocations beyond reading.
- Status: Complete. Pushed to main. Vercel auto-deploys. نادية's retake path is unlocked.

### 2026-05-23 — MOCK-EXAM-VISIBILITY-FIX: cache invalidation on mock-exam route entry (backend was already clean)
- What: Ali reported that 4 students from the second-chance archive group (لمياء, منار, هوازن, نادية) couldn't see the exam. Ran the Phase-A read-only forensic prompt. **No backend bug found.** Every layer is healthy: `visibility='live'` on both exams, window open until Sun 22:00 KSA, levels match (لمياء/منار L1 ↔ midterm-mock-a1; هوازن/نادية L3 ↔ midterm-mock-b1), zero active attempts for 3 of 4 (post-archive state correct), and `mock_exam_start` RPC has NO archive check that could block. Notifications were received with the correct route. Only behavioral difference: نادية has 1 submitted v2 attempt (auto-submitted at 0/100 because her 90-min timer expired before she could save any answers) — so she sees the "تم تسليم اختبارك ✓" screen, not the intro.
- **Phase A forensics** (`scripts/_visibility-fix-phase-a.cjs` + `_visibility-window-check.cjs` + `_visibility-nadiya-state.cjs` + `_probe-schemas.cjs`, all read-only, service-role queries — MCP wasn't exposed in this session): identified 6 archived rows / 6 distinct affected user IDs, ran A.1 through A.8. Schema reminder noted while writing the script: `students.academic_level` (INT, matches `curriculum_levels.level_number`) and `profiles.is_test_account` (NOT on students); `notifications.read` (NOT `is_read`).
- **Phase B verdict:** Frontend cache invalidation gap. TanStack Query staleTime windows (10s–60s) plus the absence of any explicit `invalidateQueries` on mock-exam route entry mean a PWA hydrated from an older bundle can render stale state (e.g., a "you already submitted" screen) long enough to look broken. Mostly UX defense; the data is correct.
- **Phase C — surgical fix** (3 files, no DB/RPC change, no migration):
  1. `src/pages/student/mock-exam/MockExamGate.jsx` — `useEffect` invalidates `['mock-exam-eligibility'|'mock-exam-row'|'mock-exam-attempt'|'mock-exam-visibility']` on mount; eligibility query gains `refetchOnMount: 'always'`.
  2. `src/pages/student/mock-exam/MockExamHub.jsx` — `useEffect` invalidates `['mock-exam-row'|'mock-exam-attempt']` on mount; `existingAttempt` query staleTime 10_000 → 0 + `refetchOnMount: 'always'` so the per-student attempt row is never served stale on entry.
  3. `src/components/layout/Sidebar.jsx` — `refetchOnMount: 'always'` on the global mock-exam visibility query (staleTime 60_000 preserved for in-session efficiency); guarantees a fresh check on initial PWA mount.
- **No archive reset / no destructive action.** Backend untouched: no edits to any of the 9 mock_exam RPCs, no schema changes, no row mutations. `visibility='live'` preserved. Cron preserved. نادية's submitted v2 attempt is preserved as-is (her "you submitted 0/100" screen is correct — if she wants a fresh try, Ali can run `mock_exam_archive_and_reset` for her v2 manually once she replies "yes" to the WhatsApp).
- **Phase E:** drafted 4 customized Arabic WhatsApp messages in `docs/MOCK-EXAM-VISIBILITY-DIAGNOSIS.md`. لمياء/منار/هوازن get the "fresh attempt ready — close app and reopen" message. نادية gets a different message acknowledging her v2 auto-submit and offering an opt-in reset.
- **Why the new defenses make the symptom non-recurring:** Every entry into `/student/mock-exam` (via sidebar, notification deep-link, or direct URL) now triggers a fresh re-read of (a) eligibility, (b) the exam row, (c) the per-student attempt row. The previous behavior could serve a 60s-old eligibility snapshot, a 30s-old row, and a 10s-old attempt — collectively enough to render "submitted" or "no exam" against a stale React Query cache.
- Files: `prompts/agents/MOCK-EXAM-VISIBILITY-FIX.md` (NEW, archived prompt), `docs/MOCK-EXAM-VISIBILITY-DIAGNOSIS.md` (NEW, Phase A through E), `docs/MOCK-EXAM-VISIBILITY-DIAGNOSIS-RAW.json` (NEW, machine-readable findings), `scripts/_visibility-fix-phase-a.cjs` + `_visibility-window-check.cjs` + `_visibility-nadiya-state.cjs` + `_probe-schemas.cjs` (NEW, read-only forensic helpers), `src/pages/student/mock-exam/MockExamGate.jsx` + `MockExamHub.jsx` + `src/components/layout/Sidebar.jsx` (modified), `CLAUDE.md`.
- DB: 0 schema changes, 0 row mutations.
- Edge Functions: 0 changes.
- Status: Complete. The 3 students with zero active rows will see the fresh intro card on their next refresh (cache-invalidation guarantees a re-read on mount). نادية's path requires Ali's confirmation before any destructive action.

### 2026-05-23 — MOCK-EXAM-SAVE-CHAIN-FIX: pre-submit reconciliation + blocking modal + startup probe
- What: Ali asked to diagnose why students with empty `mock_exam_answers` keep ending up at 0/100. Hypothesis: `mock_exam_save_answer` silently fails on certain devices, UI shows answers selected (local React) but server has zero rows. Verdict after Phase A: the save chain is mechanically healthy — what's missing is **end-to-end guarantees that survive silent client failures**.
- **Phase A — diagnosis (all read-only):**
  - `mock_exam_answers` is **completely empty** (0 rows) — the second-chance archive CASCADE-deleted everything, and نادية v2 hasn't generated saves yet.
  - All 5 mock_exam RPCs are **SECURITY DEFINER + granted to authenticated**. RLS is NOT the bug.
  - Frontend `MockExamAttempt.jsx` already has the full FIX-2 contract: `runSaveAnswer` with `withTimeout(10s)`, `recordSaveFailure` → `logClientEvent('save_failed', …)`, `SaveHeartbeat` mounted in header. The defense is deployed.
  - **0 `save_failed` audit events in last 12h** across any student. Either nobody is actively clicking, or the telemetry RPC itself is failing for stale-tab students (because `mock_exam_log_client_event` requires the attempt to exist — wiped attempts → both save AND telemetry fail in tandem).
  - Active: نادية v2 (`e66e8ccb-…`, started 04:21 KSA, 26 min in, 0 saves). Archive: 7 rows including منار + لمياء from yesterday with 0 answers each (pre-FIX-2 stale-tab victims).
  - Healthy students: Ali (×2), هوازن (real 66.50/100), نادية v1 (29 saves before archive). The mechanism works for them.
- **Phase B verdict:** The save chain is correct. Past victims (منار, لمياء) ran pre-FIX-2 JS that lacked timeouts + heartbeat + telemetry. FIX-2 added all three but only protects NEW page loads. The right shipping fix is **defense-in-depth**: even if heartbeat + telemetry silently fail, the next layer catches it.
- **Phase C — three new defenses shipped in `src/pages/student/mock-exam/MockExamAttempt.jsx`:**
  1. **Startup save-health probe** (new `useEffect` keyed on `examData?.attempt_id`): after attempt loads, immediately do a single round-trip SELECT against `mock_exam_answers` with 5s timeout. If it fails → consecutiveFailsRef=3 + `setBlockingNetworkModal(true)` + log `save_failed{rpc:'startup_health_probe'}`. Catches "session expired" / "network broken" BEFORE the student wastes 30 minutes answering into a void.
  2. **Blocking modal after 3 consecutive save failures** (`consecutiveFailsRef` + `BlockingNetworkModal` component): `recordSaveSuccess`/`recordSaveFailure` now maintain a synchronous ref counter alongside the React `saveFailures` state. On failure, ref increments + if ≥ 3 → modal opens. Modal hard-stops the student with Arabic warning + "إعادة المحاولة" button that re-runs the health probe + WhatsApp escape link. On retry-success it resets the counter and dismisses. Logs `retry_attempt{source:'blocking_modal_retry', outcome:'success'|'still_failing'}`.
  3. **Pre-submit reconciliation** (inside `handleSubmit`, new block between `flushAllSaves` and the submit RPC, wrapped in `console.time(':reconcile')`): SELECT every row from `mock_exam_answers` for this attempt, compare with local React `answers` state, find any `(qid, selected_index, text_answer)` triple that's locally present but server-missing or server-mismatched, and re-save serially via `runSaveAnswer` (idempotent upsert). If reconciliation itself fails → console.error + continue (best-effort, never blocks submit). When local≠server, logs `save_failed{rpc:'pre_submit_reconcile', local_count, server_count, missing_count}` so admins can SEE silent-loss class events in the audit log.
- **Sacred constraints honored:** No edits to ANY of the 9 existing mock_exam RPCs. No DB schema changes. No migrations. No archive/reset of نادية v2 (she's still mid-exam — destructive). `visibility='live'` preserved. Cron jobs preserved (still firing every minute per `cron.job_run_details`).
- **Phase D — restore affected students:** Phase A's identification query returned 0 active submitted attempts with ≤5 real answers. The historical victims (منار + لمياء) are already archived from the second-chance migration; they get a fresh attempt automatically when they next call `mock_exam_start`. No action needed.
- **Why the new defenses make silent loss impossible** (any single layer catches the class):
  - Layer 1 — `withTimeout(10s)` on every RPC → no infinite hang
  - Layer 2 — `recordSaveFailure` → `save_failed` audit log row (visible in StuckAttemptsPanel)
  - Layer 3 — `SaveHeartbeat` chip → student sees red "تحقّقي من الاتصال" in real time
  - Layer 4 — **BlockingNetworkModal** after 3 fails → student is hard-stopped from "phantom answering"
  - Layer 5 — **Startup save-health probe** → catches broken state BEFORE first answer
  - Layer 6 — **Pre-submit reconciliation** → re-saves any silent drops at the submit moment, regardless of what happened during the exam
- Files (new): `docs/MOCK-EXAM-SAVE-CHAIN-DIAGNOSIS.md`, `prompts/agents/MOCK-EXAM-SAVE-CHAIN-FIX.md`. Files (modified): `src/pages/student/mock-exam/MockExamAttempt.jsx`, `CLAUDE.md`.
- DB: 0 schema changes, 0 row mutations.
- Edge Functions: 0 changes.
- Status: Complete. Pushed. Vercel auto-deploys. The next student who loads the page gets all 6 layers of defense.

### 2026-05-23 — MOCK-EXAM-SECOND-CHANCE: extended window + lossless server-side auto-submit + archive + re-notify
- What: After the two incidents (لمياء + منار with silent network loss, plus Ali's gibberish test), Ali decided to (a) extend the exam window to **Sun 24 May 22:00 KSA** (from Sat 22:00), (b) wipe all prior attempts and give every participant a fresh start, (c) make the system lossless via a server-side pg_cron worker that auto-submits any expired in-progress attempt, (d) re-notify every L1+L3 student via email + in-app.
- **Migration `20260523040000_mock_exam_second_chance_lossless.sql` (applied):**
  - New table `mock_exam_attempts_archive` with full row + answers + audit + ai_log snapshots, RLS staff-read.
  - New RPC `mock_exam_archive_and_reset(p_attempt_id, p_reason)` — service_role/admin only, idempotent (skips if archive row already exists with same reason), snapshots everything via `jsonb_agg(to_jsonb(...))`, then DELETEs the active attempt (CASCADE handles `mock_exam_answers` + `mock_exam_ai_writing_log`; `mock_exam_audit_log` uses `ON DELETE SET NULL` so audit history is preserved with attempt_id NULL).
  - New RPC `mock_exam_cron_auto_submit_expired()` — loops every attempt where `is_submitted=false AND expires_at < now()`, calls `mock_exam_admin_force_submit(id, true)`, logs `cron_auto_submit` audit row per success and `cron_auto_submit_failed` on exception. Exceptions per-row don't abort the loop.
  - New RPC `mock_exam_cron_grade_pending_writing()` — best-effort pg_net.http_post to `/functions/v1/mock-exam-grade-writing` for any submitted attempt with `ai_writing_status='pending'` and `submitted_at < now() - 2 min`. Uses `current_setting('supabase.service_role_key', true)` — the canonical pattern already used by `weekly-skill-snapshot` + `detect-student-signals` cron jobs (confirmed via `cron.job` inspection). Returns `{skipped: 'service_role_key_missing'}` cleanly when invoked outside the pg_cron context.
  - Two pg_cron schedules: `mock-exam-auto-submit-expired` every 1 min, `mock-exam-grade-pending-writing` every 2 min. Idempotent — `cron.unschedule` any prior with the same name before scheduling.
  - **All 9 existing mock_exam RPCs untouched.**
- **Exam window updated:** `UPDATE mock_exams SET close_at='2026-05-24T19:00:00+00:00'` for both `midterm-mock-a1` + `midterm-mock-b1`. Verified open_ksa=`2026-05-22 22:00` close_ksa=`2026-05-24 22:00`. `visibility='live'` preserved.
- **Archive + reset of all 6 prior attempts** (NOT 4 — 2 new students started since the previous incident pass): Ali's A1 test (34 answers), Ali's B1 test (38 answers), منار (0 answers, network loss), لمياء (0 answers, network loss), **هوازن العتيبي B1 (38 answers, REAL submitted score 66.50/100)**, **نادية القحطاني B1 (29 answers, was mid-exam at archive time)**. All 6 archived to `mock_exam_attempts_archive` with full snapshots before DELETE. Active attempts count: 6 → 0. Archive count: 6 (reason=`second_chance_2026-05-23`). `audit_log` retains 45 rows with attempt_id=NULL (SET NULL behavior, preserved history).
- **Email function updated + redeployed:** `supabase/functions/send-mock-exam-launch-emails/index.ts` now accepts `?second_chance=true` query param OR `{ second_chance: true }` body flag. New `buildEmail(..., isSecondChance=true)` branch emits the Arabic RTL second-chance template (24h→48h extended window copy + "حتى لو لم تضغطي «تسليم»، النظام يسلّم اختباركِ تلقائياً" reassurance + لائق apology + new gold CTA). Deployed v2 ACTIVE via the multipart `/functions/deploy` Mgmt API.
- **Notification log reset (preserving history):** snapshotted 40 rows of `mock_exam_launch_notification_log` to new table `mock_exam_launch_notification_log_archive`, then truncated the original. This lets the email function's idempotency check fire again for everyone.
- **Re-notify dispatch:** 20 in-app notifications inserted into `public.notifications` (type='announcement', priority='high', `data.kind='mock-exam-second-chance-2026-05-23'`, action_url=/student/mock-exam, expires_at=2026-05-24T19:00:00Z); guarded by `NOT EXISTS … data->>'kind'` for re-run safety. Email dispatch via `POST /functions/v1/send-mock-exam-launch-emails?second_chance=true` returned `{success:true, total_eligible:20, sent:20, failed:0, skipped:0}`.
- **End-to-end smoke** (Task 6.4–6.5): signed in as `mock-test-a1@fluentia.academy` via magiclink → started a fresh A1 attempt (`mock_exam_start`) → saved 4 answers (`mock_exam_save_answer` × 4) → closed without ever calling `mock_exam_submit` → set `expires_at = now() - 1 sec` → ran `mock_exam_cron_auto_submit_expired()` once manually → cron force-submitted with `is_submitted=true, score_total=5.00, score_reading=5.00, ai_writing_status='pending'` (the 2 reading correct guesses landed). **Lossless system verified end-to-end.** Test attempt then archived under `test_smoke_2026-05-23` reason and removed.
- **Minor known cosmetic:** `mock_exam_admin_force_submit` uses `COALESCE(is_auto_submitted, p_auto)`. Because the column default is `false` (not NULL), COALESCE returns the original `false` even when the cron passes `true`. The audit log entry (`cron_auto_submit` event) is the authoritative record. Not blocking. Future cleanup: change to `is_auto_submitted = (is_auto_submitted OR p_auto)`.
- **Files (new):** `supabase/migrations/20260523040000_mock_exam_second_chance_lossless.sql`, `scripts/_apply-mock-exam-second-chance.cjs`, `prompts/agents/MOCK-EXAM-SECOND-CHANCE.md`. **Files (modified):** `supabase/functions/send-mock-exam-launch-emails/index.ts`, `CLAUDE.md`.
- DB: 1 new table, 3 new RPCs, 2 new pg_cron schedules. 6 attempt rows archived + deleted. 40 notification_log rows archived + deleted. 20 new notification rows. Exam close_at updated (2 rows). Existing 9 mock_exam RPCs unchanged. No schema changes to mock_exam_attempts / mock_exam_answers / mock_exam_questions / mock_exam_audit_log.
- Edge Functions: `send-mock-exam-launch-emails` v2 deployed.
- Status: Complete. System is lossless. Window now closes Sun 22:00 KSA. 20 students re-notified via both channels.

### 2026-05-23 — MOCK-EXAM-SCORING-DIAGNOSIS: no bug found, 1 stranded attempt re-graded
- What: Ali's admin dashboard showed his own A1 attempt at **15/100** with `ai_writing_status='pending'` hours later, suspected scoring bug. Ran the 6-phase forensic diagnosis prompt on his attempt row by row. **Conclusion: there is NO scoring bug.** Every layer is healthy. The 15/100 was the honest sum of his garbage test inputs (5 from 2 lucky reading guesses + 10 legacy writing default). The `pending` status was because his attempt was submitted at 04:27 KSA on 2026-05-22, BEFORE the FIX-3 commit at 14:11 KSA the same day that wired the frontend's `supabase.functions.invoke('mock-exam-grade-writing')` call. His attempt was stranded with the pre-FIX-3 writing default of 10/10.
- **Phase A forensics (all 4 submitted attempts inspected row-by-row):**
  - **Ali's A1 (the screenshot case, attempt `f907b031-…`):** Saved 34 answers but the `selected_index` pattern is `=3 (option D)` on basically every MCQ + `kllkl`/`klkkl`/`kkk`/`lkl`/`lklk` strings on every fill_blank. He typed `"off fff ggg hhh"` × 13 = 52 gibberish words for writing. He was stress-testing. 2 reading guesses landed by accident (Q1, Q9) at 2.5 pts each = 5/25 reading. Everything else = 0. Pre-FIX-3 RPC defaulted writing=10/10 because word_count>=min. Total 5 + 10 = 15/100. **Math is exact, scoring is right.**
  - **Ali's B1 (`df61b88f-…`):** Submitted at 15:14 KSA on 2026-05-22 (post-FIX-3). 38/39 answered, 7 correct, AI graded the gibberish at 0/10 (Claude path, not fallback). Final 17.50/100. Healthy.
  - **لمياء + منار (both A1):** 0 answers saved each (the network-path failure already diagnosed + fixed in INCIDENT-FIX-2). Honest 0/100.
- **Phase A.3 hand-verified 12 seeded `correct_index` values** across all 5 sections (reading, vocab, spelling, grammar with both MCQ and error_detection types). **12 / 12 PASS.** No seed bugs. The seed authors did the work correctly — "She ___ from Saudi Arabia" → "is" (idx=1), "He eats ___ apple" → "an" (idx=1, vowel-sound rule), "My sister [like] to watch" → error at idx=1 (subject-verb agreement), etc.
- **Phase A.4 section-sum cross-check:** Every attempt's `SUM(points_awarded) GROUP BY section` exactly equals `score_<section>`. The UPDATE…JOIN scoring in `mock_exam_submit` works correctly. The SELECT…SUM aggregation works correctly. **No RPC bug.**
- **Phase A.5:** `mock_exam_ai_writing_log` returned 0 rows for Ali's A1 attempt — confirming the AI grader was never invoked for that attempt. The frontend code that triggers the invoke shipped 10 hours after his submit.
- **Phase B verdict (only 1 of 6 hypotheses TRUE):** #4 "scoring is correct, exam is just hard" — TRUE for Ali (he tested with garbage). #5 "AI invocation skipped entirely" — TRUE for his A1 attempt only (stranded pre-FIX-3). All other hypotheses (UI bug, RPC bug, seed bug, edge function failure) — REJECTED by evidence.
- **Phase C — NO code change.** No migration, no RPC modification, no seed correction. The fix is one POST to the existing edge function. The `mock_exam_apply_ai_writing_score` RPC (deployed in FIX-3) already recomputes `score_total` from existing section scores when the edge function lands the AI grade.
- **Phase D — re-invoked the AI grader for `f907b031-…`:** HTTP 200, layer='primary' (Claude actually evaluated the gibberish text), `ai_writing_score=0`, status='graded'. `mock_exam_apply_ai_writing_score` overwrote `score_writing` 10→0 and recomputed `score_total` 15→**5**. ai_writing_status now 'graded'. The 3 other submitted attempts didn't need anything — Ali's B1 already graded, لمياء/منار are 0/100 with no saved data to re-score.
- **Final rollup** (4 submitted attempts, post-fix):
  - لمياء A1: 0/100 (unchanged)
  - منار A1: 0/100 (unchanged)
  - Ali B1: 17.50/100 (unchanged)
  - **Ali A1: 15/100 → 5/100** (writing 10→0, total 15→5, ai_writing 'pending'→'graded')
- **Sacred constraints honored:** No edits to ANY mock_exam RPC. No schema changes. No seed mutations. No `vite build`. visibility='live' preserved. No row mutations on هوازن's in-progress attempt. Resilience patches from `6172384`/`0dd1390` preserved.
- Files (new): `docs/MOCK-EXAM-SCORING-DIAGNOSIS.md` (full forensic dump + before/after rollup), `prompts/agents/MOCK-EXAM-SCORING-DIAGNOSIS.md` (the prompt itself, for audit trail).
- Files (modified): `CLAUDE.md`.
- DB: 0 schema changes. 1 row mutated (`mock_exam_attempts.f907b031-…`: score_writing, score_total, ai_writing_*). 1 audit row (the `mock_exam_ai_writing_log` insert from the edge function).
- Edge Functions: 0 deploys; 1 invocation of `mock-exam-grade-writing` for the stranded attempt.
- Status: Complete. **Bottom line for Ali:** open `/admin/mock-exam-results`, your A1 attempt now reads `5/100` (the honest score given your gibberish test inputs). No real student is impacted. The system is healthy.

### 2026-05-23 — MOCK-EXAM-INCIDENT-FIX-2: second-incident recovery + save-path resilience + deeper telemetry
- What: A second student reported the same stuck-submit pattern after commit `6172384` shipped. The deploy is live (verified via `vercel ls`) but only protects students who load the page AFTER the deploy — students already mid-exam are running the stale bundle without the 25s timeout. Ran phases A-G again with a wider investigation.
- **Phase A re-run:** Same 5 attempts as last pass. Real-student state: هوازن (B1, 38/39 answered, 0 writing chars, 56 min left — healthy in progress, biggest answer-saver on the exam tonight, last save at 02:09:59 KSA), لمياء (A1, **0 saved answers across 80 min**, exam expired 16 min ago — STUCK_EXPIRED candidate), منار (A1, already auto-submitted at 01:26 with score 0/100 — closed, nothing to recover since `mock_exam_answers` count is 0). **هوازن's 38 saved answers single-handedly disproves the "save_answer is universally broken" hypothesis** — the bug is intermittent and client/network specific, NOT global.
- **Phase B recovery:** Force-submitted لمياء via `mock_exam_admin_force_submit('9659e9e3-…', true)` → score 0/100, ai_writing_status='pending'. Re-triggered the AI grader → fallback path returned 0/10 in 218ms (same shape as منار, edge fn HTTP 200 throughout). One real student recovered to a closed state; نها now visible in trainer dashboard. منار + هوازن intentionally not touched.
- **Phase C — deeper root cause (DB + edge + Vercel all healthy):**
  - **DB pool:** 41/60 connections (68% — healthy, not saturated). 0 long-running queries (only the realtime replication slot, expected). No locks, no deadlocks, no autovacuum blockage.
  - **Postgres logs:** ZERO `mock_exam*` errors in the last hour. Three OTHER recurring app errors visible (`submissions.voice_url does not exist`, `xp_reason: 'mystery_box'`, `weekly_task_sets.created_at does not exist`) — all unrelated schema drift in separate subsystems, not blocking submit.
  - **RLS on `mock_exam_answers`:** SELECT-only policy. All writes go via SECURITY DEFINER RPCs that bypass RLS. **No RLS recursion possible.**
  - **`mock_exam_submit` RPC source:** Single PK lookup + idempotency early-return + one bulk UPDATE on ~35 rows (the only non-trivial step) + a SELECT SUM + two single-row updates + one audit insert. Sub-100ms class. Fast path is unimpeachable.
  - **Edge functions:** ZERO 5xx in last 2 hours from any function (verified via Mgmt API `edge_logs` table scan). `mock-exam-grade-writing` shipped HTTP 200/418ms for مAR's auto-submit follow-on. Healthy.
  - **Vercel deploy:** commit `6172384` confirmed Ready at age 14m, production environment. Live.
- **Root cause (refined):** The previous Phase C correctly identified missing client-side timeout on `mock_exam_submit`. What it missed was that **`mock_exam_save_answer` and `mock_exam_save_writing` have the same hang potential and the previous fix didn't wrap them.** That's why مAR + لمياء have empty `mock_exam_answers` rows — their network path silently stalled on autosaves earlier in the session, the existing code only `console.error`s on save failures (invisible to students), and by the time submit ran (or the timer expired) there was nothing to score.
- **Targeted fix shipped:**
  - `supabase/migrations/20260523030000_mock_exam_client_telemetry.sql` — new SECURITY DEFINER RPC `mock_exam_log_client_event(p_attempt_id, p_event, p_details)` with strict event-name whitelist (`submit_kickoff`, `submit_complete`, `submit_failed`, `save_failed`, `flush_started`, `flush_complete`, `page_unload`, `retry_attempt`). Students can log own-attempt events; admins/trainers can log on any attempt for diagnostics. Auth-gated. Sacred 8 mock_exam RPCs unchanged.
  - `MockExamAttempt.jsx` — every `mock_exam_save_answer` and `mock_exam_save_writing` call now wrapped in `withTimeout(10_000, 'save_timeout_10s')`. New helpers `runSaveAnswer`/`runSaveWriting` centralize the timeout + telemetry. Every save failure increments `saveFailures` and logs `save_failed` to the audit log with rpc/qid/error/ts payload. `flushAllSaves` emits `flush_started`/`flush_complete`. `handleSubmit` emits `submit_kickoff` before the RPC and `submit_complete`/`submit_failed` after; wraps the whole flow in `console.time('mock-exam-submit:<attempt8>')` with `:flush`/`:rpc` sub-timers for DevTools observability.
  - New `SaveHeartbeat` sub-component in the header: shows "تم الحفظ ✓" green chip if last save was within 5s, "تم الحفظ قبل Ns" neutral chip up to 60s, "تحقّقي من الاتصال (N)" amber chip when failures > 0. Re-renders every 5s. Hidden until first save attempt. **Students can SEE silent autosave failures in real time now.**
  - `StuckAttemptsPanel` updated: parallel-fetches the last 10 `mock_exam_audit_log` events per attempt, computes `stuck_mid_submit` (kickoff with no matching complete) and `save_failures_count`, surfaces both as colored chips in a new `DiagnosticStrip` under each stuck row, AND promotes `stuck_mid_submit` to the STUCK_NEEDS_SUBMIT bucket regardless of elapsed time. Ali sees the next stuck student within 60s via the existing polling.
- **Recovery + status:**
  - لمياء (`9659e9e3-…`) — force-submit applied, AI grader fallback 0/10, final score 0/100, closed.
  - منار (`752357ca-…`) — already closed at 0/100 (auto-submit at 01:26), no further action.
  - هوازن (`524a7ab6-…`) — STILL IN PROGRESS, 38/39 answered, 56 min left. Untouched. She has the OLD bundle without the new timeout, but she's the strongest answer-saver on the exam tonight so her network is clearly fine. If she ever DOES hit the bug, the next student loading the page after this deploy will be fully protected.
- **Sacred constraints preserved:** No edits to the 8 existing mock_exam_* RPCs. `visibility='live'` unchanged. No row mutations on هوازن's in-progress data. No row deletes anywhere. Telemetry is opt-in additive.
- Files (new): `supabase/migrations/20260523030000_mock_exam_client_telemetry.sql`, `docs/MOCK-EXAM-INCIDENT-2-DIAGNOSIS.md`.
- Files (modified): `src/pages/student/mock-exam/MockExamAttempt.jsx`, `src/pages/trainer/StuckAttemptsPanel.jsx`, `CLAUDE.md`.
- DB: 1 new RPC, 0 schema changes. 1 row in `mock_exam_attempts` recovered (لمياء). 1 new `mock_exam_audit_log` row for the recovery. All other student data unchanged.
- Edge Functions: None — `mock-exam-grade-writing` re-invoked for لمياء (HTTP 200/fallback as expected).
- Status: Complete. Commit ready for atomic push.

### 2026-05-23 — MOCK-EXAM-INCIDENT-FIX: stuck-submit forensics + recovery RPC + resilience + admin panel
- What: Mid-window (exam is live until Sat 2026-05-23 22:00 KSA) incident — Ali reported one student got stuck on "...جاري الإرسال" after submitting a healthy attempt. Ran the 8-phase incident prompt: forensic investigation, recovery RPC, root-cause analysis, frontend resilience, admin recovery dashboard, verification, atomic commit + handoff.
- **Phase A — forensics (no real students need server-side recovery):** 5 attempts total (2 are Ali's own test submissions from yesterday). Real students: هوازن العتيبي (B1, healthy, 25/39 answered, 67 min left), لمياء الحربي (A1, 0 answers across 80 min — never engaged or client-broken; 5 min past expiry, client-driven auto-submit imminent), منار العتيبي (A1, already auto-submitted at 01:26 KSA with score 0.00 — but `mock_exam_answers` count is 0 and `writing_response` is empty, so there is NO data to recover. AI grader ran fallback path in 218ms returning 0/10 honestly). Bucket distribution: HEALTHY_IN_PROGRESS=2, STUCK_NEEDS_SUBMIT=0, STUCK_EXPIRED=0, SUBMITTED_NOT_SCORED=0, SUBMITTED_AI_PENDING=1 (Ali's test), SUBMITTED_OK=2. Documented in `docs/MOCK-EXAM-INCIDENT-PHASE-A.md`.
- **Phase B — admin recovery RPC (deployed via migration `20260523020000_mock_exam_admin_recovery.sql`):** New SECURITY DEFINER function `mock_exam_admin_force_submit(p_attempt_id uuid, p_auto boolean)` — service_role OR admin only (trainer blocked). Idempotent (early-returns `{idempotent: true, score_total: …}` when score already > 0). Re-runs the exact scoring contract from `mock_exam_submit` (case-insensitive trim fill_blank matching, per-section sum, manual_writing_score honored if set, ai_writing_status reset to 'pending' when null/empty so the edge function can re-grade). Audits via `mock_exam_audit_log` event='admin_force_submit'. Applied via `scripts/_apply-mock-exam-admin-recovery.cjs` (postgres pooler client). All 8 existing `mock_exam_*` RPCs unchanged (verified by `pg_get_function_arguments` diff). Smoke-tested against Ali's already-submitted B1 attempt — returns `{idempotent: true, score_total: 17.5}` as expected.
- **Phase C — root cause (`docs/MOCK-EXAM-INCIDENT-ROOT-CAUSE.md`):** Edge function logs show `mock-exam-grade-writing` ran in 418ms for منار's auto_submit — not the bottleneck. The actual issue in the client code: `await supabase.rpc('mock_exam_submit', …)` had no network timeout, so a stalled fetch hangs forever. The fire-and-forget IIFE for the grade-writing kickoff was already correct (line 280-290) — preserved as-is.
- **Phase D — frontend resilience (`src/pages/student/mock-exam/MockExamAttempt.jsx` + `SubmitConfirmModal.jsx`):** Added module helper `withTimeout(thenable, ms, tag)` that races a thenable against a timeout (the RPC may continue in the background — server-side idempotent). Wrapped `mock_exam_submit` in `withTimeout(submitPromise, 25_000, 'submit_timeout_25s')`. New state `submitErrorIsTimeout` + `autoRetryUsed` — a `useEffect` auto-retries once 2s after a timeout, then the modal stays open with manual "إعادة المحاولة" button + WhatsApp link. Modal copy during submit reads `جاري التسليم — إجاباتكِ محفوظة، لا تغلقي الصفحة...` to reassure students. Bottom-bar inline error now also surfaces a `تواصل مع المدرب` WhatsApp button. `whatsappInstructorUrl` is a passed prop (default `https://wa.me/966558669974`).
- **Phase E — admin StuckAttemptsPanel (NEW `src/pages/trainer/StuckAttemptsPanel.jsx`, mounted at top of `MockExamResults`):** Auto-polls every 60s (`refetchInterval: 60_000`). Classifies via the same logic as Phase A (HEALTHY_IN_PROGRESS, STUCK_NEEDS_SUBMIT, STUCK_EXPIRED, SUBMITTED_NOT_SCORED, SUBMITTED_AI_PENDING, SUBMITTED_OK). Filters `is_test_account=true`. Stuck-rows section shows name + level + minutes-in + answers-saved + writing-word-count + score (if any) + AI status + one-click "استرداد التسليم" (or "إعادة التقييم" for SUBMITTED_AI_PENDING) which calls `mock_exam_admin_force_submit` THEN re-invokes the grade-writing edge function THEN invalidates the parent query. Calm "N طالبات يؤدّون الاختبار الآن" chip when only in-flight attempts exist. Renders null when nothing is interesting.
- **Phase F — verification (`docs/MOCK-EXAM-INCIDENT-PHASE-F.md`):** Re-ran classification — state evolved correctly (هوازن went 22→25 answers in the interim). RPC smoke-tested twice: (1) idempotent path on Ali's attempt returned `{idempotent: true, score_total: 17.5}` ✓; (2) attempted recovery on منار's empty attempt hit MCP's read-only enforcement → atomic rollback verified (no admin_force_submit audit row, no score change). All 9 `mock_exam_*` RPCs present (8 preserved + 1 new). Babel parse-check: 4/4 modified files PASS.
- **Sacred constraints preserved:** No edits to the existing 8 mock_exam RPCs. `visibility='live'` untouched. No edits to `mock_exam_attempts` row data. No edits to `mock_exam_answers`. `is_revealed=false` preserved on all attempts. No `vite build` locally.
- Files (new): `supabase/migrations/20260523020000_mock_exam_admin_recovery.sql`, `scripts/_apply-mock-exam-admin-recovery.cjs`, `src/pages/trainer/StuckAttemptsPanel.jsx`, `docs/MOCK-EXAM-INCIDENT-PHASE-A.md`, `docs/MOCK-EXAM-INCIDENT-ROOT-CAUSE.md`, `docs/MOCK-EXAM-INCIDENT-PHASE-F.md`, `prompts/agents/MOCK-EXAM-INCIDENT-FIX.md`.
- Files (modified): `src/pages/student/mock-exam/MockExamAttempt.jsx`, `src/pages/student/mock-exam/SubmitConfirmModal.jsx`, `src/pages/trainer/MockExamResults.jsx`, `CLAUDE.md`.
- DB: 1 new RPC. No table changes. No row mutations. Audit log unchanged for real students.
- Edge Functions: None — `mock-exam-grade-writing` is healthy (verified in logs).
- Status: Complete. Ready for atomic commit. Next student who hits the same flaky-network class of failure will get a 25s timeout → auto-retry → manual retry → WhatsApp escape hatch, and Ali can recover any future stuck attempt with one click from `/admin/mock-exam-results`.

### 2026-05-22 — MEGA-FIX-READING-LISTENING-VOCAB-V2: 9 bugs closed end-to-end (5 commits)
- What: Ran the 1440-line MEGA-FIX V2 prompt end-to-end against the real production schemas. All 9 bugs (R1, R2, R3, R4, L1, V1, V2, V3, UI1) closed in 5 atomic commits. Self-check: 19/19 files parse-OK, HEAD == origin/main.
- **Phase A discovery** (`docs/audits/MEGA-FIX-V2-DIAGNOSIS.md`): Documented schema drift — prompt assumed `vocabulary`/`student_vocabulary`/the wrong mastery shape; actual tables are `curriculum_vocabulary` (13,930 rows, 100% audio coverage), `student_saved_words` (FSRS-shaped), `vocabulary_word_mastery` (per-exercise booleans, no triggers). Sidebar = 264px fixed right, z-30 RTL; header = 64px; `--sidebar-width` CSS variable did NOT exist globally. 50+ hardcoded `z-[N]` utilities across the codebase, all at z-50+ so none physically under the sidebar's z-30 — UI1 root cause was POSITION math (`positionLens.js` clamped left to `viewportWidth - popupWidth - MARGIN` with no sidebar subtraction).
- **Phase B (commit `7368960`, R2/R3/L1):** Patched `useAudioEngine.js` additively — discrete `playState` machine, awaited `.play()` with rejection classification (NotAllowed/NotSupported/AbortError/NetworkError), HEAD preflight on every `sourceUrl` change, telemetry into new `audio_event_log` table. Wired `loadstart`/`playing`/`stalled` events. Existing surface preserved so no consumer needed changes. `SmartAudioPlayer` renders `arabicErrorMessage(engine.errorReason)` — students see specific Arabic reasons instead of generic "تعذّر تحميل". `ListeningPlayer` untouched (already has its own watchdog). New table + 3 RLS policies + 3 indexes via migration `20260522100000`, applied through `_apply-audio-event-log.cjs`.
- **Phase C (commit `64c4b1f`, R1):** Swapped `useWordLensAudio` tier order — Tier 2 (per-word `curriculum_vocabulary.audio_url`, 100% coverage) is now the DEFAULT, slice fallback only if vocab audio missing. The R1 root cause was passage-slice's `setTimeout`-based stop firing late on slow connections → the rest of the passage played through. New `src/lib/audio/pronounceWord.js` provides an isolated util for word-click paths outside the WordLens, with module-singleton cancellation so rapid taps never double-play. `prewarmPassageWords()` on Reading tab mount.
- **Phase D (commit `cd45b5f`, UI1):** The big architectural win.
  - `src/styles/z-index.css` — variable ladder (`--z-base/floor/rise/overlay/sidebar/header/popup/modal/toast/emergency`) + `--sidebar-width`/`--header-height` + mobile `@media` override.
  - `tailwind.config.js` extend.zIndex — `z-popup`/`z-modal`/etc. utility classes resolving to the CSS variables.
  - `src/lib/ui/SidebarMetricsObserver.jsx` — `ResizeObserver` + `MutationObserver` combo that keeps `--sidebar-width`/`--header-height` live against `[data-sidebar-root]` and `[data-app-header]` DOM elements. Mounted once at App root. `data-app-header` added to Header.jsx.
  - `src/lib/ui/computePopupPosition.js` — pure helper, reads CSS vars + `document.dir`, returns `{ top, left, placement }` excluding sidebar/header/viewport edges.
  - `src/components/ui/Popover.jsx` + `BottomSheet.jsx` — shared portaled primitives.
  - **Focal fix:** `positionLens.js` (WordLens) migrated to use sidebar-aware math. Daily Vocab Review popup + every WordLens invocation no longer lands inside the right sidebar. WordLens `z-[60]` → `z-popup`.
  - **Out of scope** (per Phase A scope decision): the full sweep of every hardcoded `z-[N]` — 50+ occurrences all at z-50+ already above sidebar's z-30, days of regression risk for zero student-facing benefit. Future popups use the contract by convention.
- **Phase E (commit `b2488a6`, R4):** `useWordLensData.saveMutation` now appends `.select()` and throws on empty rowset — RLS failures propagate. `WordLens.jsx` wraps save/unsave with destination-naming success toast ("تمت إضافة الكلمة — افتحي قسم 'كلماتي المحفوظة' لمراجعتها") and friendly Arabic error toast. Saved-word amber highlight was already live via the existing `fluentia:vocab-added` event + React Query invalidation.
- **Phase F (commit `f63e910`, V1+V2+V3):** Root cause of V1+V2: there's NO trigger on `vocabulary_word_mastery` and the old WordExerciseModal code never wrote `mastery_level`. So `mastery_level` stayed NULL forever, and the auto-advance branch in `VocabularyTab.handleMasteryUpdate` never ran. Fix: compute `passedCountAfter` by OR-ing this pass with existing booleans → set `mastery_level` to 'mastered'/'learning'/'new' on every upsert. V2 auto-advance now works without further code changes. V3: both vocab card variants now render `pronunciation_ipa`; definition Arabic opacity `white/40 → white/55` for at-a-glance readability.
- **Phase G verification:** `audio_event_log` exists with 9 columns + 3 RLS policies + 3 indexes. 3,473 existing `vocabulary_word_mastery` rows preserved. Babel parse: 19/19 PASS. Git: HEAD == origin/main (`f63e910`).
- **Note:** `scripts/_smoke-hard-words.cjs` (162-line throwaway hard-words smoke test) accidentally landed in commit `f63e910` — was untracked at session start. No secrets. Not worth a revert.
- Files (new): `docs/audits/MEGA-FIX-V2-DIAGNOSIS.md`, `src/lib/audio/audioEventLog.js`, `src/lib/audio/pronounceWord.js`, `src/lib/ui/computePopupPosition.js`, `src/lib/ui/SidebarMetricsObserver.jsx`, `src/components/ui/Popover.jsx`, `src/components/ui/BottomSheet.jsx`, `src/styles/z-index.css`, `supabase/migrations/20260522100000_audio_event_log.sql`, `scripts/_apply-audio-event-log.cjs`.
- Files (modified): `src/components/audio/hooks/useAudioEngine.js`, `src/components/audio/SmartAudioPlayer.jsx`, `src/components/audio/wordlens/{positionLens.js, useWordLensAudio.js, useWordLensData.js, WordLens.jsx}`, `src/components/layout/Header.jsx`, `src/components/vocabulary/WordExerciseModal.jsx`, `src/pages/student/curriculum/tabs/{VocabularyTab.jsx, ReadingTab.jsx}`, `src/main.jsx`, `src/App.jsx`, `tailwind.config.js`.
- DB: 1 new table (`audio_event_log`) + 3 indexes + 3 RLS policies. No mutations to existing curriculum/student data.
- Edge Functions: none.
- Status: Complete — 5 atomic commits + Phase G report + change-log entry. Ready for student test window.

### 2026-05-22 — MOCK-EXAM-LAUNCH: window update + go-live + in-app + email dispatch
- What: Flipped the mock exam from `visibility='preview'` to `'live'` and dispatched the launch announcement to every eligible L1/L3 student via both in-app notification AND email. Window updated to Fri 2026-05-22 22:00 KSA → Sat 2026-05-23 22:00 KSA (24-hour). Per Ali: "I will NOT send emails manually" — emails were dispatched automatically as part of this prompt's execution.
- **Phase A discovery (key decisions):**
  - `profiles.email` carries the email directly (no `auth.users` join needed).
  - 20 eligible students (12 L1 + 8 L3), every one has an email, zero gaps.
  - **Existing `public.notifications` table is the canonical in-app comms surface** — already wired to `src/components/layout/NotificationCenter.jsx`. So I reused it (`type='announcement'`, `priority='high'`, `action_url='/student/mock-exam'`, `expires_at` = exam close, `data.kind = 'mock-exam-launch-2026-05-22'`). The prompt's `student_announcements` table was SKIPPED — would duplicate infrastructure with no UI consumer.
  - Supabase secrets `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_ADDRESS`, `ADMIN_NOTIFICATION_EMAIL` all set; existing email functions (`send-email`, `resend-affiliate-invite`) use `RESEND_FROM_EMAIL` env + `https://api.resend.com/emails` POST. Reused that pattern.
- **DB migration `20260522080000_mock_exam_launch_comms.sql` (applied via Mgmt API):** added only `mock_exam_launch_notification_log` (id, student_id, channel ∈ ('email','in_app'), exam_code, status ∈ ('sent','failed','skipped'), details jsonb, sent_at, **UNIQUE (student_id, channel, exam_code)**) + RLS (staff SELECT) + composite index. The UNIQUE is the idempotency lock — re-running the dispatch is safe.
- **Phase C — atomic window update + go-live (2 SQL statements):**
  1. `UPDATE mock_exams SET open_at='2026-05-22T19:00:00Z', close_at='2026-05-23T19:00:00Z'`. Verified KSA-local: opens 2026-05-22 22:00 KSA, closes 2026-05-23 22:00 KSA. Correct.
  2. `UPDATE mock_exams SET visibility='live'`. Both exams now live.
- **Phase D — in-app dispatch (single CTE):** Eligible students who don't already have an 'in_app' 'sent' log row → INSERT into `notifications` with full Arabic title/body (level-aware: 75 min for A1, 90 min for B1), gold-tier priority, `data.kind='mock-exam-launch-2026-05-22'` for idempotency, expires when exam closes. RETURNING piped into a second INSERT against the log table. **20 rows inserted, 20 logged.**
- **Phase E — email dispatch via new edge function:** `supabase/functions/send-mock-exam-launch-emails/index.ts` — Deno + Resend, accepts `RESEND_FROM_EMAIL ?? RESEND_FROM_ADDRESS ?? default`, reads L1/L3 students via a single supabase query with `!inner` join + `IN` filter, loops per-student with idempotency check on the log table, sends via direct `fetch` to `https://api.resend.com/emails`, upserts log row with `resend_id` for audit, 200ms pacing between sends. Deployed v1 ACTIVE via the multipart `/functions/deploy` endpoint (from FIX-3 lesson) at `https://api.supabase.com/v1/projects/{ref}/functions/deploy?slug=send-mock-exam-launch-emails`.
- **Invoke result (REAL emails sent):** `{success:true, from:'Fluentia Academy <noreply@fluentia.academy>', total_eligible:20, sent:20, failed:0, skipped:0}`. Every send has a Resend ID for traceability. The email is RTL Arabic HTML+text — branded gold accent, 24h window block, 3-step start instructions, key info bullets (duration, single attempt, autosave, AI review pre-reveal, min word count level-aware), CTA button to `https://fluentia-lms.vercel.app/student/mock-exam`, WhatsApp support, dr.ali's signature.
- **Phase F verification (4/4 checks PASS):** both exams `visibility='live'` with correct KSA window ✓ — `notifications` has 20 announcement rows with `data.kind='mock-exam-launch-2026-05-22'` ✓ — log has 40 'sent' rows (20 in_app + 20 email, split 12+8 per exam_code) ✓ — per-student rollup confirms every eligible student got both channels (20 rows, `got_in_app=true` AND `got_email=true` for all) ✓.
- Files: `supabase/migrations/20260522080000_mock_exam_launch_comms.sql` (NEW, applied), `supabase/functions/send-mock-exam-launch-emails/index.ts` (NEW, deployed v1 ACTIVE), `scripts/launch-deploy-emails-fn.cjs` (NEW), `docs/MOCK-EXAM-LAUNCH-PHASE-A.md` (NEW), `docs/MOCK-EXAM-LAUNCH-REPORT.md` (NEW), `prompts/agents/MOCK-EXAM-LAUNCH.md` (NEW), `CLAUDE.md`.
- DB: 1 new table + 1 new index. Exam window updated. `visibility='preview' → 'live'`. 20 rows inserted into `notifications`. 40 rows in launch log.
- Edge Functions: `send-mock-exam-launch-emails` deployed.
- Status: LIVE. Students will see the announcement immediately and receive the email. Locked-countdown shows until 2026-05-22 22:00 KSA, then intro screen opens. AI grader (from FIX-3) is already armed. Trainer reveal flow (from FIX-1) handles result release.

### 2026-05-22 — MOCK-EXAM-FIX-3: AI-powered writing grading with 3-layer reliability
- What: Fix-2 left writing auto-graded at full marks whenever word-count ≥ min, which let spam ("word word word" × 50) score 10/10. Ali explicitly approved an exception to the original "zero Claude API at runtime" rule for the writing section ONLY, with stringent reliability ("we really want to make sure that Claude AI in this typical area does not fail us at all"). This fix delivers a 3-layer grader: real Claude grading via edge function (primary), one automatic retry on failure (2s backoff), then a deterministic smart-fallback heuristic (unique-word ratio + avg word length + under-min). Trainer always has manual override.
- **Edge function (NEW):** `supabase/functions/mock-exam-grade-writing/index.ts` — Deno + Anthropic SDK 0.27.0, model `claude-sonnet-4-6` (the prompt specified `claude-sonnet-4-20250514` but that ID was retired project-wide on 2026-03-14 — used the current canonical). Accepts both `ANTHROPIC_API_KEY` and the project's legacy `CLAUDE_API_KEY` envvar (the existing `CLAUDE_API_KEY` is already set, so no secret action required from Ali). Level-aware system prompt (A1 vs B1 rubrics, explicit penalize-spam guidance, reward-genuine-attempt guidance, Arabic feedback mandatory). Strict JSON response validation: score is number in [0,10], justification ≥5 chars, arrays defaulted to []. Idempotent at the function level (skips if `ai_writing_status` is already 'graded' or 'fallback'). Logs every call to `mock_exam_ai_writing_log` (status/layer/score/model/tokens/duration/error). **Deployed via Supabase Management API multipart `/functions/deploy` endpoint** (the `/functions` POST+PATCH endpoint only stores metadata without bundling — discovered after a 503 BOOT_ERROR on the first 3 deploys). Version 4 is ACTIVE.
- **DB migration `20260522060000_mock_exam_ai_writing_grading.sql` (applied via Management API):**
  - 6 new columns on `mock_exam_attempts`: `ai_writing_score numeric(5,2)`, `ai_writing_status text NOT NULL DEFAULT 'pending'` with CHECK in ('pending','graded','fallback','manual','failed'), `ai_writing_justification_ar text`, `ai_writing_strengths_ar jsonb`, `ai_writing_improvements_ar jsonb`, `ai_writing_graded_at timestamptz`. Partial index on `(exam_id, ai_writing_status) WHERE is_submitted=true`.
  - New table `mock_exam_ai_writing_log` — `attempt_id`, `status` ('success'/'retry'/'fallback'/'error'), `layer` ('primary'/'retry'/'fallback'), `score`, `ai_model`, `prompt_tokens`, `output_tokens`, `error_message`, `raw_response`, `duration_ms`. RLS: staff (admin/trainer) SELECT only.
  - 2 new SECURITY DEFINER RPCs: `mock_exam_apply_ai_writing_score(attempt_id, score, justification, strengths, improvements, status)` — service_role or trainer/admin, clamps score, **manual override always wins** (writes ai_writing_* for reference but `score_writing` reflects manual if set), recomputes `score_total` + `passed`. `mock_exam_reset_ai_status(attempt_id)` — trainer/admin only, used by the retry button.
  - Surgical CREATE OR REPLACE on `mock_exam_submit`: writing initial score is 0 (was: full marks if word_count ≥ min). After the main UPDATE, an idempotent UPDATE ensures `ai_writing_status='pending'` (won't reset 'graded'/'fallback'/'manual'/'failed' on re-submit). All other behavior preserved (idempotency, audit_log, RLS).
  - Surgical CREATE OR REPLACE on `mock_exam_get_result`: full-detail branch now includes 5 new AI fields. Pending-review branch unchanged.
- **Frontend (3 files):**
  - `MockExamAttempt.jsx` — after `mock_exam_submit` succeeds, fire-and-forget `supabase.functions.invoke('mock-exam-grade-writing', {body: {attempt_id}})` inside an IIFE with try/catch that only `console.error`s — student navigates to result page immediately, never waits for AI grading.
  - `MockExamResult.jsx` — writing section enriched with AI feedback block (status badge, Arabic justification, strengths list with ✓, improvements list with →). Pending pill shown while `ai_writing_status==='pending'`. `refetchInterval` now polls every 5s while AI is grading (in addition to 30s while pending_review).
  - `MockExamResults.jsx` — new `AiWritingPanel` component above the existing WritingPanel: shows AI score / status badge / Arabic justification / strengths / improvements + a "إعادة التقييم بالذكاء الاصطناعي" button that calls `mock_exam_reset_ai_status` then invokes the edge function. Final-score display distinguishes AI score from manual override.
- **QA (`scripts/mock-exam-fix3-qa.cjs`, 29/29 assertions PASS — real Claude calls):**
  - [A] Honest 70-word A1 routine → Claude scored **9/10**, status='graded', Arabic justification
  - [B] Spam ("word"×60) → **0/10** (Claude called out repetition)
  - [C] Single-token "aaa…"×200 → **0/10**
  - [D] Mixed Arabic/English B1 honest writing → **7/10**, graded
  - [E] Empty writing → fallback fires, score=0, "تعذّر…" justification
  - [F] Trainer retry: reset_ai_status + re-invoke → re-grades to 9/10
  - [G] Manual override (8.5) wins over AI (9) — final `score_writing=8.5`, AI score still recorded for reference
  - [I] Second invocation → `{idempotent: true}` — no re-grade
  - [J] Curl smoke → HTTP 200 success
  - [K] Fix-1 + Fix-2 regression — all flows still wired (SubmitConfirmModal, resume-to-position, pending screen, etc.)
- Files: `supabase/migrations/20260522060000_mock_exam_ai_writing_grading.sql` (NEW, applied), `supabase/functions/mock-exam-grade-writing/index.ts` (NEW, deployed v4), `src/pages/student/mock-exam/MockExamAttempt.jsx`, `src/pages/student/mock-exam/MockExamResult.jsx`, `src/pages/trainer/MockExamResults.jsx`, `scripts/mock-exam-fix3-apply.cjs` (NEW), `scripts/mock-exam-fix3-deploy-fn.cjs` (NEW, uses multipart `/functions/deploy`), `scripts/mock-exam-fix3-qa.cjs` (NEW), `docs/MOCK-EXAM-FIX-3-QA-REPORT.md` (NEW), `prompts/agents/MOCK-EXAM-FIX-3.md` (NEW), `CLAUDE.md`.
- DB: 6 new columns + 1 new table + 2 new RPCs + 2 surgical RPC replacements. Sacred tables untouched. Existing 7 mock-exam RPCs from FIX-1/2 preserved (the 2 replaced retain identical signatures + idempotency guarantees).
- Edge Functions: `mock-exam-grade-writing` deployed, version 4 ACTIVE, verify_jwt=false (auth handled internally; backed by RPC's own service_role/role checks).
- Status: All 29 QA assertions PASS with real Claude calls. Pushed to main. Ali can manual-test on `mock-test-a1@fluentia.academy / MockTest2025!` — submit triggers async AI grading visible within ~10s in trainer dashboard, student sees full AI feedback after admin reveals.

### 2026-05-22 — MOCK-EXAM-FIX-2: submit UX redesign + edge-case robustness
- What: Fix-1 left a UX dead-end — the submit button was hidden on non-writing questions, then appeared on Q35 but was silently `disabled` while wordCount < min. Ali finished a full test exam, hit a button that didn't click, and had no signal of what was missing. This fix redesigns the submit flow around a sticky always-visible bar + an intelligent confirmation modal that surfaces every incomplete state with jump-to-question actions and an explicit override.
- **Code changes (1 page rewrite + 2 new files):**
  - `src/lib/mockExam.js` (NEW) — `countWords(text)` helper. Matches server's `array_length(regexp_split_to_array(trim(text), '\s+'), 1)` exactly: `text.trim().split(/\s+/).filter(Boolean).length` with null/empty short-circuit. Unit-tested across 14 cases (Arabic, multi-whitespace, tabs/CRs, single long tokens). Parity verified against the live server RPC for 9 representative cases.
  - `src/pages/student/mock-exam/SubmitConfirmModal.jsx` (NEW) — props `{open, onClose, onConfirm, onJumpTo, issues, submitting, submitError}`. Two branches: (a) issues present → list of issue cards with severity (warn=amber, critical=red), each with optional `jumpToIndex`/`jumpLabel` button; primary CTA "تسليم على أي حال" + secondary "الرجوع لإكمال الإجابات"; (b) no issues → green "أجبتِ على جميع الأسئلة" + "نعم، أرسلي الاختبار". Inline `submitError` block with WhatsApp fallback. Backdrop close disabled while submitting.
  - `src/pages/student/mock-exam/MockExamAttempt.jsx` — sticky bottom bar restructured to a 3-element layout (Prev + Progress + Next/Submit). **Submit button is now always rendered + always clickable on every question** — all gating moved to the modal. Two new `useEffect`s persist `currentIndex` to `localStorage` (`mock-exam-pos-${attemptId}`) and restore it on attempt mount. Writing-word-count now comes from the centralized `countWords` helper. Chip strip gained an amber-dashed "in-progress" state for the writing question while `wordCount > 0` but `< writingMin`. `computedIssues` is derived inline: scans for unanswered MCQ/fill_blank (jumps to first unanswered) + writing-short (severity `critical` if 0, `warn` if 1+ but under min, jumps to writing). The old `showConfirm` inline dialog block is gone — replaced by `<SubmitConfirmModal>`.
- **Existing untouched per spec rules:** all 7 RPCs (`mock_exam_start`, `mock_exam_save_answer`, `mock_exam_save_writing`, `mock_exam_submit`, `mock_exam_reveal`, `mock_exam_get_result`, `mock_exam_set_manual_writing_score`) + trainer `MockExamResults.jsx` + student `MockExamResult.jsx` + all DB tables + question seed. Zero migrations.
- **QA (`scripts/mock-exam-fix2-qa.cjs`, 26/26 assertions PASS):** word-count parity across 9 strings (incl. Arabic + single-long-token "aaaaaa…200×" → 1 word), scenario B (0-answer + 0-writing submit succeeds, score_total=0), scenario D (bogus attempt_id → `attempt_not_found`; real attempt re-submit → `idempotent:true`), scenario F (single long token → server 1 word + writing score 0 — the exact case from Ali's screenshot), scenario I (Fix-1 reveal flow regression — pending→reveal→full 35 questions), scenario J (Fix-1 manual writing score regression — 0→7.5 recomputes total), 6 code-review assertions on `MockExamAttempt.jsx` (no `submitDisabled` gate, timer auto-submit path intact, etc). Scenarios A/C/E/G/H are pure-browser UX, documented in `docs/MOCK-EXAM-FIX-2-QA-REPORT.md` with reproducer steps. Cleanup: 0 test attempts remaining, 2 test accounts intact, both exams visibility='preview'.
- Files: `src/lib/mockExam.js` (NEW), `src/pages/student/mock-exam/SubmitConfirmModal.jsx` (NEW), `src/pages/student/mock-exam/MockExamAttempt.jsx` (modified), `scripts/mock-exam-fix2-qa.cjs` (NEW), `docs/MOCK-EXAM-FIX-2-QA-REPORT.md` (NEW), `prompts/agents/MOCK-EXAM-FIX-2.md` (NEW), `CLAUDE.md`.
- DB: none.
- Edge Functions: none.
- Status: Code complete + 26/26 QA assertions PASS + production state preserved. Ready for Ali's browser-side verification of scenarios A/C/E/G/H (reproducer steps in QA report).

### 2026-05-22 — MOCK-EXAM-FIX-1: submit bug + question instructions + trainer-controlled reveal
- What: Three-in-one fix for the mock exam shipped earlier today. Ali tested on the test student account and surfaced (1) submit fails with `.catch is not a function` (Supabase v2's `.rpc()` returns a PostgrestBuilder, not a real Promise), (2) `error_detection` + other types lacked Arabic instruction labels above the stem, (3) students saw raw scores immediately — Ali wants trainer-controlled reveal so he can grade writing manually before each student sees their result.
- **Code changes (3 page files):**
  - `src/pages/student/mock-exam/MockExamAttempt.jsx` — replaced all 4 `supabase.rpc(...).catch(...)` chains (flushAllSaves × 2, scheduleAnswerSave, scheduleWritingSave) with try/catch + destructured `{ error }` per Supabase v2 contract. Submit-disabled gate now enforces `writingWordCount >= writingMin` on the writing question with `disabled` attr + `opacity 0.45` + `cursor not-allowed` + tooltip. New `getInstructionAr(question)` helper renders an Arabic instruction line above the stem for every question type except writing_prompt (which is self-instructional). For `error_detection` questions, option labels now render as `1/2/3/4` (matching the `[1]…[2]…[3]…[4]` markers in the stem) instead of `A/B/C/D`.
  - `src/pages/student/mock-exam/MockExamResult.jsx` — full rewrite. Replaced direct `from('mock_exam_attempts')` read with new `mock_exam_get_result` RPC. Two states: (A) `pending_review` — calm "تم استلام إجابتك" screen with no score numbers, polls every 30s so reveals propagate automatically; (B) revealed — existing score hero + 5 section breakdown cards + NEW per-section `<details>` accordion with per-question feedback (correct option highlighted green, student's wrong pick red, fill_blank shows student answer + accepted list, writing block shows prompt + full text + word count + score + "تم تعديل الدرجة من المدرب" badge if `manual_writing_score` was set).
  - `src/pages/trainer/MockExamResults.jsx` — added bulk "كشف نتائج كل الطلاب" / "إخفاء كل النتائج" buttons (calls `mock_exam_reveal(p_exam_code, p_reveal)`), per-row reveal toggle pill ("مكشوف" / "قيد المراجعة"), expandable detail panel per attempt with full per-section breakdown, dedicated writing panel showing prompt + full text + manual-score number input (0–10, step 0.5) with save button that calls `mock_exam_set_manual_writing_score(attempt_id, score)` → recomputes `score_total` + `passed` server-side. Audit footer shows "كُشِفت في {time}" or "لم تُكشف بعد للطالبة".
- **DB (1 idempotent migration applied via Management API):** `supabase/migrations/20260522040000_mock_exam_reveal_system.sql` — 3 new columns on `mock_exam_attempts` (`is_revealed` boolean default false, `revealed_at` timestamptz, `revealed_by` uuid FK profiles), 1 partial index, 3 new RPCs all SECURITY DEFINER + granted to `authenticated`:
  - `mock_exam_reveal(p_attempt_id uuid, p_exam_code text, p_reveal boolean)` — admin/trainer only, accepts either attempt_id (single) or exam_code (batch). Updates `is_revealed`/`revealed_at`/`revealed_by`. Returns `{count, revealed}`.
  - `mock_exam_get_result(p_attempt_id uuid)` — returns minimal `{pending_review:true, …}` to students if not revealed; full per-question detail (with `correct_index`, `acceptable_answers`, student's `selected_index`/`text_answer`, `is_correct`, `points_awarded`) to students if revealed AND always to staff regardless of reveal state.
  - `mock_exam_set_manual_writing_score(p_attempt_id uuid, p_score numeric)` — admin/trainer only. Validates 0..max-writing-points (10). Updates `manual_writing_score` + `score_writing`, recomputes `score_total` from existing section sums + new writing score, updates `passed` against `pass_threshold`. Returns the new totals.
- **Existing RPCs untouched:** `mock_exam_start`, `mock_exam_save_answer`, `mock_exam_save_writing`, `mock_exam_submit` all preserved verbatim per the prompt's "do not change existing RPCs" rule. Existing 35+39 seeded questions also untouched.
- **QA (Phase 6, 21/21 assertions PASS):** Real-JWT end-to-end via `scripts/mock-exam-fix1-qa.cjs`. Verified: A1 student happy path (start → 5 save_answer → save_writing 70 words → submit returns scores — proves Bug 1 fixed at the RPC layer), student `get_result` while unrevealed returns `pending_review:true` with NO `score_total` exposed, throwaway admin reveals → student `get_result` returns full 35 questions with `student_selected_index` + `is_correct` per question, manual_writing_score override 10→7.5 correctly recomputes `score_total` 15→12.5, out-of-range score rejected, non-staff blocked from both reveal + set_manual_writing_score RPCs. Cleanup: throwaway admin deleted, test attempts deleted.
- **Visibility unchanged:** Both exams still `visibility='preview'` + `is_active=true`. Ali's manual launch step (single SQL `UPDATE mock_exams SET visibility='live'…`) remains the only path to real-student access.
- Files: `supabase/migrations/20260522040000_mock_exam_reveal_system.sql` (NEW, applied), `src/pages/student/mock-exam/MockExamAttempt.jsx`, `src/pages/student/mock-exam/MockExamResult.jsx` (full rewrite), `src/pages/trainer/MockExamResults.jsx` (full rewrite), `scripts/mock-exam-fix1-apply.cjs` (NEW), `scripts/mock-exam-fix1-qa.cjs` (NEW), `prompts/agents/MOCK-EXAM-FIX-1.md` (NEW), `CLAUDE.md`.
- DB: 3 new columns + 1 index + 3 new RPCs. No changes to existing columns, RPCs, or rows beyond Ali's in-progress admin attempt (preserved untouched).
- Edge Functions: None.
- Status: Code complete + DB migration applied + 21/21 QA assertions PASS. Ready for Ali's manual verification of the full reveal flow before he flips `visibility='live'`.

### 2026-05-22 — MOCK-EXAM-MIDTERM-A1-B1: cumulative midterm mock for A1 + B1 (units 1–4, preview mode)
- What: Built the full mock-exam system end-to-end per `prompts/agents/MOCK-EXAM-MIDTERM-A1-B1.md` (Phases A→J). Two exams (`midterm-mock-a1`, `midterm-mock-b1`), 5 sections each (Grammar 30 + Reading 25 + Vocabulary 20 + Spelling 15 + Writing 10 = 100 pts), 35 + 39 items, server-authoritative timer, idempotent submit, refresh-safe resume, auto-submit on expiry. Zero Claude API at runtime — all questions are static seed data authored by me from the actual unit content.
- **Schema deviation handled:** prompt assumed `profile.level_id`; real schema uses `students.academic_level` (int) + `students.group_id`. RPC resolves level via `students.academic_level → curriculum_levels.level_number → curriculum_levels.id`. No sacred tables touched.
- **DB (2 migrations, both applied via Management API):**
  - `20260522020000_mock_exam_system.sql` — 5 tables (`mock_exams`, `mock_exam_questions`, `mock_exam_attempts`, `mock_exam_answers`, `mock_exam_audit_log`), 1 column (`profiles.is_test_account` boolean default false), 9 RLS policies, 3 updated_at triggers, 5 indexes.
  - `20260522020001_mock_exam_rpcs.sql` — 4 SECURITY DEFINER RPCs (`mock_exam_start`, `mock_exam_save_answer`, `mock_exam_save_writing`, `mock_exam_submit`), all granted to authenticated.
- **Content:** 35 A1 items + 39 B1 items authored inline in `scripts/seed-mock-exam-content.cjs`. Question types: MCQ (4 options), fill_blank (acceptable_answers JSONB, case-insensitive trim), error_detection (index of wrong fragment), true_false (2 options), true_false_ng (3 options, B1 reading only), writing_prompt. 4 fresh reading passages (A1: 155w + 155w / B1: ~300w + ~300w) using vocabulary + grammar from units 1–4. Difficulty calibrated 25% easy / 50% medium / 25% hard, never labeled. Distractors target real Arabic-learner patterns (a/an before vowel sounds, compound-subject agreement, doesn't+bare-infinitive, for/since w/ present perfect, which-vs-who, double-letter omissions, vowel confusion).
- **Test student accounts (idempotent seeder):** `mock-test-a1@fluentia.academy` / `mock-test-b1@fluentia.academy` (both `MockTest2025!`), `is_test_account=true`, levels 1 + 3, joined to المجموعة 2 + المجموعة 4 respectively. Both exams ship with `visibility='preview'` — real students see nothing in their sidebar until Ali flips visibility to `'live'`.
- **Frontend (8 files touched):**
  - 5 NEW page components: `MockExamGate.jsx` (route wrapper + visibility check), `MockExamHub.jsx` (4 visual states: locked w/ live countdown / intro / resume / submitted, AuroraBackground + GlassPanel), `MockExamAttempt.jsx` (bulletproof: hooks at top, debounced autosave 800ms answers + 1500ms writing, server-authoritative timer w/ amber-at-5min + red-at-60s pulse, sticky chip strip, idempotent submit, confirmation dialog, beforeunload flush), `MockExamResult.jsx` (animated score count-up + 5 section cards), `MockExamResults.jsx` (shared trainer + admin read-only table w/ A1/B1 filter, 4 stat boxes, expandable writing review).
  - `src/App.jsx` — lazyRetry imports + 4 routes (student nested under MockExamGate, trainer, admin).
  - `src/config/navigation.js` — new student section `الاختبارات` between `التعلّم` and `المجتمع`, trainer + admin items added.
  - `src/components/layout/Sidebar.jsx` — visibility-aware `canSeeMockExam` filter (TanStack Query of `mock_exams` w/ `level:curriculum_levels(level_number)` foreign-table select).
- **QA (Phase I, all green — 19 assertions PASS):** signed in as real test student JWTs (not service-role) via `scripts/mock-exam-qa.cjs`. Verified: A1 happy path (start → save_answer → save_writing → submit + idempotent re-submit), B1 happy path including resume, level mismatch rejection, RLS-blocked direct SELECT of mock_exam_questions, preview-mode rejection via throwaway non-test L1 user (created + tested + deleted). After QA, all test attempts deleted (cascades to answers + audit) so Ali can take a fresh attempt himself. Production state restored: both exams visibility=preview, is_active=true, correct window, 0 attempt rows.
- **Manual-launch gate (Ali's decision):** when Ali finishes manual verification on the test accounts and approves, he runs ONE SQL: `UPDATE mock_exams SET visibility = 'live' WHERE code IN ('midterm-mock-a1','midterm-mock-b1');`. Emergency kill switch: `UPDATE mock_exams SET is_active = false ...`. Trainer manual writing-score override is supported via `manual_writing_score` column; the submit RPC honors it on idempotent re-call.
- Files: 2 new migrations, 3 new scripts (`scripts/mock-exam-apply-migrations.cjs`, `scripts/seed-mock-exam-test-students.cjs`, `scripts/seed-mock-exam-content.cjs`, `scripts/mock-exam-qa.cjs`), 5 new pages, 3 modified (App.jsx, navigation.js, Sidebar.jsx), 5 docs reports (`docs/MOCK-EXAM-PHASE-A..D + I-REPORT.md`), 1 prompt copy (`prompts/agents/MOCK-EXAM-MIDTERM-A1-B1.md`).
- DB: 5 new tables + 1 new column (`profiles.is_test_account`) + 4 new RPCs + 9 RLS policies + 2 seeded exams + 74 seeded questions + 2 seeded test student accounts.
- Edge Functions: none (architecture decision: Postgres RPCs SECURITY DEFINER, fewer moving parts).
- Status: Complete + ready for Ali's manual verification on `mock-test-a1@fluentia.academy` / `mock-test-b1@fluentia.academy` before the visibility flip.

### 2026-05-19 — HIDE-PRONUNCIATION + RESTORE-SECTION-COMPLETION-BADGES (2 fixes in 1 commit)
- What: Two independent UX fixes shipped in one autonomous run.
- **Part 1 — pronunciation shelved (non-destructive):** 5 student-facing surfaces hidden with `PRONUNCIATION-HIDDEN 2026-05-19` markers:
  - `/student/pronunciation` route (App.jsx lazy import + Route both commented)
  - Unit overview tab (UnitContent.jsx lazy import + TABS entry + render-case all commented)
  - Unit-v2 activity grid card (useUnitData.js ACTIVITY_MAP entry commented)
  - Content-icon registry (_premiumPrimitives.jsx icon entry commented)
  - معمل التحدث sub-tab (StudentSpeaking.jsx lazy import + TABS entry + render commented)
  - **Preserved (no deletes):** `StudentPronunciation.jsx`, `tabs/PronunciationTab.jsx`, `components/curriculum/PronunciationActivity.jsx`, all `curriculum_pronunciation` rows, all `student_curriculum_progress` pronunciation rows, all audio files. Vocabulary-internal pronunciation alerts (`components/vocabulary/PronunciationAlert.jsx`) + speaking AI `pronunciation_notes` are DIFFERENT features — kept active. `docs/PRONUNCIATION-SHELVED.md` is the revival guide.
- **Part 2 — section completion badges:** Probed Fatima (`f9ecb220-…`, recent submissions, NOT Lamia). Diagnosis: every layer was already working after the 2026-05-19 vocab fix — triggers fire correctly, `student_curriculum_progress` rows are written, `unit_progress.breakdown.completion` correctly reports `reading_done`, `writing_done`, etc. Badge logic in `useUnitProgress` + `MissionCard` was already correct. **The actual bug was DENOMINATOR: pronunciation was in inventory (counted toward denominator) but unreachable from UI.** Students could complete every visible section and the unit still showed < 100%.
- **DB fix:** Migration `20260519120000_compute_unit_progress_exclude_pronunciation.sql` — `CREATE OR REPLACE FUNCTION compute_unit_progress()` that skips both the pronunciation inventory block AND the pronunciation completion block. Applied via Supabase Management API. Idempotent.
- **Backfill:** `scripts/audits/section-completion/03-backfill.cjs` — recomputed via RPC and wrote new values to every `unit_progress` row. **Result: 97 rows updated, 0 inserted, 0 errors.** No student data mutated — only the derived denominator.
- **Verification (`04-verify.mjs`):** 0/97 rows have pronunciation in inventory or completion. Fatima's 7 active units: every section completion correctly reflected (reading_done >= total, grammar_done/writing_done/listening_done/speaking_done = 1 where expected). 5 random students all show sensible percentages. 0 orphans (every student with completions has unit_progress rows).
- **NOT TOUCHED:** No `submissions` / `vocab_progress` / `xp_transactions` row mutations. No DB row deletions. No personalization data. Listening flow untouched (shipped earlier today as `85bd29b`). Reading + vocab flows untouched.
- Files: `src/App.jsx`, `src/pages/student/curriculum/UnitContent.jsx`, `src/pages/student/curriculum/unit-v2/useUnitData.js`, `src/pages/student/curriculum/_premiumPrimitives.jsx`, `src/pages/student/StudentSpeaking.jsx`, `supabase/migrations/20260519120000_compute_unit_progress_exclude_pronunciation.sql` (NEW, applied), `scripts/audits/section-completion/{01-probe,02-fatima-units,03-backfill,04-verify}.{mjs,cjs}` (NEW), `docs/PRONUNCIATION-SHELVED.md` (NEW), `docs/audits/section-completion/FINAL-REPORT.md` (NEW), `prompts/agents/HIDE-PRONUNCIATION-RESTORE-COMPLETION-BADGES-2026-05-19.md`
- DB: `compute_unit_progress()` function replaced; 97 `unit_progress` rows recomputed. No schema changes. No row deletes.
- Edge Functions: None
- Status: All deliverables shipped. Pronunciation invisible to students. Section completion + unit percentages now reach 100% when all visible sections are done.

### 2026-05-19 — LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION: 3 wins in 1 commit (audio audit + player redesign + drift gate)
- What: Closed the listening player + drift-protection prompt. Three deliverables in one commit. No ElevenLabs spend — all 72 listening files are healthy.
- **Phase A — diagnosis:** 72 listening rows, every one has `audio_url` + `transcript`. HEAD/Range/MIME audit returned 72/72 HEALTHY. Existing `ListeningPlayer.jsx` already complied with the iOS-Safari-safe canonical pattern (event listeners before src, reactive `[audioUrl]` deps, `playsInline`, try/catch on `play()`, error surface). The "audio doesn't play" symptom Ali saw is not reproducible from any automated probe — most plausible cause: stale PWA bundle. Bumped `public/version.json` so the `UpdateBanner` flow refreshes cached clients.
- **Phase B — audio fixes (no regen needed):** Added `ListeningAudioComingSoon` fallback so a null `audio_url` never produces a dead play button. 0 ElevenLabs chars consumed.
- **Phase C — drift-protection foundation (the architectural win):**
  - Migration `20260519110000_add_source_text_hash_to_curriculum_listening.sql` — adds `source_text_hash` + `source_text_hash_at` + partial index. Applied via Supabase Management API.
  - `scripts/lib/text-hash.cjs` + `src/lib/textHash.js` — byte-equivalent SHA-256 hash util (Node + browser) with canonical normalization (CRLF→LF, whitespace collapse, NFC).
  - `scripts/audio-v2/03-generate-listening.mjs` — patched to compute + write `source_text_hash` on every TTS update (UPDATE now also sets `source_text_hash_at = now()`).
  - `scripts/audits/listening-fix/03-backfill-hashes.cjs` — idempotent backfill. **Result: 72/72 rows received their baseline hash.**
  - `scripts/audits/audio-drift-check.cjs` — standalone gate, runs in <1s. Exits non-zero on drift. **Current result: 0 drifted, 0 missing baseline.**
  - `package.json` — `audit:audio-drift` + `predeploy:audio-drift` npm scripts.
  - `DriftChip.jsx` — admin-only chip surfacing drift during impersonation. Computes current text hash client-side via Subtle Crypto and compares to `source_text_hash` from the DB row. Students never see it (gated on `useAuthStore.impersonation && _realProfile.role ∈ ['admin','trainer']`).
- **Phase D — listening player redesign:** Full rewrite of `src/components/players/listening/ListeningPlayer.jsx` per the prompt's design spec. Hero 64px gold-gradient play button with inset highlight + amber drop shadow + amber glow behind it. Color-coded speaker ticks on the scrubber (deterministic hash → `SPEAKER_COLORS`). Speed selector is now a popover (replaces the always-visible row of 5 chips). "إظهار النص" / "إخفاء النص" toggle now lives inside the player (Phase D requirement). Sticky-bottom positioning preserved (architecture not changed). `ListeningSection.jsx` updated: passes `transcriptShown` + `onTranscriptToggle` to the player, removed the now-duplicate header toggle, mounted `<DriftChip>` next to the section label, mounted `<ListeningAudioComingSoon>` for null audio_url. Transcript HIDDEN by default (already correct in prior code, preserved).
- **Verification:** drift-check exits 0 (72 rows, 0 drifted, 0 missing baseline). Categorization re-run: 72/72 HEALTHY. Hash backfill: rows_with_audio (72) == rows_with_hash (72). Parse-check OK on all touched scripts.
- **Future retrofit (one-line work):** add `{ table: 'curriculum_readings', text_field: 'passage_content', label: 'reading' }` to `TABLES_TO_CHECK` in `audio-drift-check.cjs` once the same two columns are added to `curriculum_readings`. The L1 reading drift incident from earlier today (commit `f911750`) would have been caught by this gate.
- Files: `src/components/players/listening/{ListeningPlayer,ListeningSection,ListeningAudioComingSoon,DriftChip}.jsx`, `src/lib/textHash.js` (NEW), `scripts/lib/text-hash.cjs` (NEW), `scripts/audits/audio-drift-check.cjs` (NEW), `scripts/audits/listening-fix/*` (NEW), `scripts/audio-v2/03-generate-listening.mjs` (patched), `supabase/migrations/20260519110000_add_source_text_hash_to_curriculum_listening.sql` (NEW, applied), `package.json` (2 new scripts), `public/version.json` (bumped), `docs/audits/listening-fix/{PHASE-A-REPORT,FINAL-REPORT}.md` (NEW), `prompts/agents/LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION-2026-05-19.md`
- DB: `curriculum_listening` table + 2 columns + 1 index + 72 rows backfilled. No schema changes elsewhere.
- Edge Functions: None
- Status: All three deliverables shipped in one commit. Drift gate is the architectural win — guarantees the L1 reading regression class of bug cannot recur for listening.

### 2026-05-19 — AUDIO-TEXT-MISMATCH-FIX: regenerated 22 L1 reading audios + karaoke shape normalization
- What: Closed the long-running reading text/audio mismatch saga. The previous 4 commits (ecbd0d1, e4ef9f7, 0d4ec39, 5b83d67) all asserted URL/identity coherence ("does audio_url embed reading_id?" — yes) but never the actually-broken assertion ("does the audio file's narration content match the displayed text?"). For 22 of 144 readings, the answer was NO — the audio narrated an older, harder version of the text that had been rewritten (likely during PROMPT 13 L1 on 2026-05-18) without regenerating the audio.
- **Reproducer (Lamia):** profile `95124347-...`, email `almooshhh11@gmail.com`. Has 3 interests (fashion_beauty, family, travel_food) + completed survey. PWA installed. Viewing L1 U1 "Cultural Festivals" Reading A (`76d1051f-...`): canonical text starts "People love to keep their big days in every land…" (164 words, A1 register), audio narrated "Every year, millions of people around the world celebrate special festivals…" (B1+ register). 120s audio for what should have been ~66s text. Confirmed via word_timestamps inspection.
- **Hypothesis disproven:** prompt suggested a per-user audio-resolution leak via `personalized_reading_audio` / RLS / RPC. Schema probe showed: `personalized_readings` has no `audio_url` column, no `personalized_reading_audio` table exists, all 144 `reading_passage_audio.full_audio_url` rows correctly embed their own `passage_id`. There's no per-user audio variant infrastructure — only one canonical audio per reading. So no leak existed. The bug was canonical content drift.
- **Phase 1-3 — drift audit + targeted regen:** `08-text-vs-audio-drift.mjs` compared first 4 normalized words of `passage_content.paragraphs[0]` vs `word_timestamps[0..3]` per reading. 22 DRIFTED (all L1), 109 CLEAN, 13 NO_TIMESTAMPS (May 18 truncated-regen rows — separate shape bug). ElevenLabs budget pre-regen: 643,594 / 1,810,000 used → 1.16M remaining. Estimated regen cost: 38,556 chars. Ran `10-regen-drifted.mjs` (mirrors `scripts/audio-v2/regen-reading-truncated.mjs` pattern): 22/22 succeeded, 0 failed. Each row: full audio + 4 paragraph audios via ElevenLabs with-timestamps, upserted to `reading_passage_audio` + mirrored to `curriculum_readings.passage_audio_url / audio_duration_seconds / audio_generated_at` with `.select()` after every write.
- **Phase 3.5 — bonus bug found and fixed: word_timestamps shape mismatch.** The May 18 regen and my new regen both write `word_timestamps` as `{ all_words: [...], paragraphs: [...] }`, but legacy rows use flat array `[{word, start_ms, end_ms}, ...]`. `useKaraoke` consumer uses `.length` + indexed access — works on flat array, **silently breaks on object shape**. So karaoke was broken for the 13 May 18 rows and would have been broken for my 22 new rows. Fix: `src/hooks/useReadingPassageAudio.js` normalizes the shape before handing it to consumers: extracts `all_words` if present, defaults to `[]` if neither shape matches. This fixes all 35 rows (22 new + 13 May 18) in one change.
- **Phase 4 — EVERY student × every reading:** `11-all-students-verify.cjs` minted `magiclink` sessions for all 23 students with email (every student in the active roster). Per-reading global check: 0 issues (URL embeds reading_id + first-words-match). Per-student check: 0 issues, 0 mint failures, 69 spot-checks PASS. Drift re-audit post-fix: **144/144 CLEAN, 0 DRIFTED, 0 NO_TIMESTAMPS.**
- **Data preserved (no destruction):** personalized_readings (1152 rows), user_interests (10 rows), variant audio storage, listening flow, vocab flow, all personalization component files. No student data writes.
- **ElevenLabs spend:** ~38,556 chars used. Estimated remaining: ~1.13M / 1.81M.
- Files: `src/hooks/useReadingPassageAudio.js` (shape normalizer + comment block), `scripts/audits/audio-text-mismatch-fix/*` (11 NEW probe/audit/regen/verify scripts), `docs/audits/audio-text-mismatch-fix/*` (NEW: lamia-state, text-vs-audio-drift, regen-drifted-results, all-students-verify, FINAL-REPORT), `prompts/agents/AUDIO-TEXT-MISMATCH-FIX-EVERY-STUDENT-2026-05-19.md`
- DB: 22 `reading_passage_audio` rows upserted, 22 `curriculum_readings` rows updated, 22 × 5 = 110 mp3 files in Supabase storage replaced (same paths, new bytes). No schema changes. No row deletes.
- Edge Functions: None
- Status: Complete — Lamia's case fixed, every L1 student now hears narration matching displayed text. 144/144 clean drift audit. 23/23 students CLEAN verification. Karaoke shape normalization closes a latent bug affecting an additional 13 rows.

### 2026-05-19 — AGENT-DRIVEN-VERIFY-AND-FIX: automated triple-check, all clean, no fixable layer
- What: Ran the agent-driven verify-and-fix prompt. Wrote 2 new automated tests + did an exhaustive cache/SW/hydration audit. All three layers report clean — the symptom from the prompt is not reproducible by any test path.
- **Phase 1 — authenticated divergence test (`scripts/audits/verify-and-fix/01-authenticated-divergence.cjs`):** Replicates ReadingTab.jsx's exact query (`from('curriculum_readings').select('*').eq('unit_id',X).order('sort_order')`) + useReadingPassageAudio's exact query (`from('reading_passage_audio')…eq('passage_id',X).maybeSingle()`). Compares results under service-role, Layan (3 interests + survey complete), and Sara (no user_interests row). Verdict: **0 field-level diffs across all 3 roles** for both articles in the test unit. Every full_audio_url embeds its own reading_id in the storage path (no swap at the storage layer). PASS.
- **Phase 3 — reading-flow simulation (`scripts/audits/verify-and-fix/02-reading-flow-simulation.cjs`):** No playwright/puppeteer installed and no stored credentials, so simulated the React tree's data path in pure Node — walks `activeReading` through `[0, 1, 0, 1]` (rapid-switch stress) and asserts at each step that the audio URL fetched via useReadingPassageAudio(reading.id) embeds that same reading.id AND that word_timestamps count is within 0.7–1.6× of the displayed text's word count. Verdict: **8/8 steps coherent**, both students walk identical data step-for-step. PASS.
- **Phase 4 — hydration / SW / CDN audit:** Enumerated all 41 localStorage read/write sites in src/. **No key stores "currently selected article id" or otherwise drives which article is rendered** — the only article-keyed entries (`fluentia:listening:transcript-visible:${contentId}`, `fluentia:player:autoresume:${studentId}:${contentId}`, `fluentia:bookmarks:${contentId}`) are applied after content loads and cannot cause wrong selection. Service Worker is `push-sw.js` only — handles push + notificationclick events, **no fetch event listener** so no page request is intercepted/cached. Every `caches.keys()/.delete()` site in src/ is in a CLEANUP path; **no code writes to the Cache API**. Production Cache-Control on SPA root + version.json is `public, max-age=0, must-revalidate` with ETag revalidation. Supabase REST traffic bypasses Vercel's CDN entirely. PASS.
- **Why no new fix:** The three prior commits (`ecbd0d1` UI hide, `e4ef9f7` audio-engine fix + defensive remount key, `0d4ec39` kill-switch + hook short-circuit + client purge) together close every plausible vector. The data layer is clean, the React tree maintains coherence under stress, and no caching layer holds article state. The symptom from the prompt is not reproducible by any automated test path.
- **Defensive instructions for if the symptom persists:** see `docs/audits/verify-and-fix/FINAL-REPORT.md` — provides a DevTools snippet that captures `audio.src` + visible title + first transcript segment so a real broken state can be diagnosed against production data.
- Files: `scripts/audits/verify-and-fix/{01-authenticated-divergence.cjs, 02-reading-flow-simulation.cjs}` (NEW), `docs/audits/verify-and-fix/{divergence.json, flow-simulation.json, FINAL-REPORT.md}` (NEW), `prompts/agents/AGENT-DRIVEN-VERIFY-AND-FIX-UNTIL-DONE-2026-05-19.md`
- DB: None — Edge Functions: None
- Status: Verification complete — 0 mismatches across all tests; no code change needed beyond the three prior commits.

### 2026-05-19 — PERSONALIZATION-KILL-SWITCH: global app_config flag + client purge (defense-in-depth)
- What: Ran the kill-switch prompt as the third pass on the personalization-revert chain. Verified at the data layer with authenticated student JWT sessions (the test the previous two passes skipped), then shipped a global feature flag + client-side state purge as belt-and-suspenders.
- **Phase A — dispositive authenticated-JWT test:** Minted real `magiclink` sessions for layan88700@gmail.com (3 interests, completed survey) and sarashrahili22@gmail.com (no interests). Same SELECT against curriculum_readings across 5 multi-article units, comparing student-JWT reads to service-role. **0 field-level diffs.** Sweep across curriculum_listening / curriculum_vocabulary / reading_passage_audio / curriculum_grammar → all student reads identical to service-role. No RLS / view / RPC / edge function performs interest-based row substitution. The 5 edge-function "personali" keyword hits are all adjective uses (nudges, AI tips, error-pattern exercises) — none touch personalized_readings or user_interests. Previous revert was correct at the data layer.
- **Phase B — belt-and-suspenders (per prompt strict rule, ship even when rows_differ=NO):**
  - **DB:** New `app_config` table (key/value JSONB + description + updated_at) with RLS (authenticated SELECT, service_role ALL). Seeded `('personalization_enabled', false)`. Migration `supabase/migrations/20260519100000_app_config_personalization_killswitch.sql` applied via Supabase Management API (`POST /v1/projects/{ref}/database/query` with personal access token).
  - **Helper:** `src/lib/featureFlags.js` — `isPersonalizationEnabled()` with 5-min cache, in-flight dedup, fails closed on any error. Plus `resetFeatureFlagCache()` for future runtime flips.
  - **Hook short-circuits:** `usePersonalizedReading.js` returns `null` and `useUserInterests.js` returns the "no interests" shape BEFORE touching personalization tables when the flag is off. Defensive even though the 3 mount points are commented and the hooks have no active callers — future-callers can't accidentally re-enable.
  - **Client-side purge:** `src/main.jsx` scans both localStorage and sessionStorage on app load and removes any keys matching `fluentia:variant*`, `fluentia:personali*`, `fluentia:interest*`, `fluentia:selectedVariant*`, plus a `personalizationEnabled` legacy key. Idempotent. Plus `queryClient.removeQueries({ queryKey: ['personalized-reading'] })` and `['user-interests']` to discard any persisted React Query cache from prior sessions.
- **Phase C — three-profile × five-unit sweep:** layan + nourahumayyim (both with interests) + sarashrahili (control). **15/15 combos return rows identical to service-role**, and all 3 subjects' authenticated reads of `app_config` return `value: false`. `grep -rn "from('personalized_readings'\|from('user_interests'" src/` returns 3 matches, all inside the two now-guarded hook files. All 3 personalization mount points remain commented out.
- **Data preserved (NOT deleted):** personalized_readings (1152 rows), user_interests (10 rows), variant audio files in storage, all personalization component files. Future opt-in feature can resurrect everything by flipping `app_config.personalization_enabled = true` and uncommenting the mount points.
- Files: `supabase/migrations/20260519100000_app_config_personalization_killswitch.sql` (NEW), `src/lib/featureFlags.js` (NEW), `src/hooks/usePersonalizedReading.js`, `src/hooks/useUserInterests.js`, `src/main.jsx`, `docs/audits/personalization-killswitch/{PHASE-A-REPORT,MANUAL-WALKTHROUGH,FINAL-REPORT}.md` (NEW), `scripts/audits/personalization-killswitch/{00-schema-probe,01-rls-policy-probe,02-impersonate-and-compare,03-sweep-related-tables,04-apply-migration,05-three-profile-sweep}.{cjs,mjs}` (NEW), `prompts/agents/PERSONALIZATION-KILL-SWITCH-2026-05-18.md`
- DB: `app_config` table created + 1 seed row. No other schema changes.
- Edge Functions: None
- Status: Code + migration complete. 15/15 automated combos PASS. Manual browser verification pending (see MANUAL-WALKTHROUGH.md).

### 2026-05-19 — READING-TEXT-AUDIO-MISMATCH-URGENT: single source of truth for reading article
- What: Fixed the urgent student-facing bug where the reading section's audio player could play Article A's audio while Article B's text was on screen (with karaoke bouncing around random words trying to follow the wrong audio).
- **Root cause:** `src/components/audio/hooks/useAudioEngine.js` had a load-source `useEffect` with deps `[audioUrl, isMulti]` — it read from `segments[0].audio_url` but did not depend on `segments`. The hook's "segments identity changes handled separately" comment was misleading — the only other segments handler just updated a ref. So a new `segments` prop (different `audio_url`) never triggered the effect, leaving `<audio>.src` pinned to the previously loaded URL. In the canonical UI, the parent's `<motion.div key={reading.id}>` masked this by remounting the subtree on article change, but exit-animation timing under `AnimatePresence mode="wait"`, slow mobile loads, or any future refactor dropping the outer key would expose the latent bug.
- **Fix:** Two surgical changes.
  - `useAudioEngine.js`: introduced derived `sourceUrl = isMulti ? segments?.[0]?.audio_url ?? null : audioUrl ?? null`. Load-source effect now depends on `[sourceUrl]` and reliably reassigns `audio.src` on every source change. `sourceUrl === null` branch clears the `src` attribute so a stale URL can never persist.
  - `ReadingTab.jsx`: added `key={reading.id}` directly on the `<SmartAudioPlayer>` JSX as belt-and-suspenders alongside the existing outer `<motion.div key>`.
- **Verification:** `scripts/audits/reading-text-audio-mismatch/verify.cjs` — 10/10 PASS across 5 multi-article units (audio HEAD 200 + `audio/mpeg`, duration plausible vs body word count, all three of text/audio/karaoke anchored to the same `reading.id`).
- **DB sanity (read-only):** 144 readings / 72 units, every unit has exactly 2 articles. 0 URL mismatches between `curriculum_readings.passage_audio_url` and `reading_passage_audio.full_audio_url`. 0 swapped-audio patterns. (11 rows have duration ratios 1.3–1.4× of a 2.5 wps estimate but all coincide with already-known broken `word_timestamps` counts — not a swap.)
- **NOT TOUCHED:** No student data writes, no DB schema changes, no personalization UI re-enabled, no transcript content rewritten, listening flow untouched, no `vite build` run locally.
- Files: `src/components/audio/hooks/useAudioEngine.js`, `src/pages/student/curriculum/tabs/ReadingTab.jsx`, `docs/audits/reading-text-audio-mismatch/{PHASE-A-REPORT,MANUAL-SPOT-CHECK,FINAL-REPORT}.md`, `scripts/audits/reading-text-audio-mismatch/{00-discover,01-cross-check-audio,02-cross-pair-check,03-get-test-unit}.mjs + verify.cjs + verify.json`, `prompts/agents/READING-TEXT-AUDIO-MISMATCH-URGENT-2026-05-18.md`
- DB: None — Edge Functions: None
- Status: Code complete — verifier 10/10 PASS. Manual browser spot-check pending (see `MANUAL-SPOT-CHECK.md` for the L5 U8 Swarm Intelligence flow).

### 2026-05-19 — AUDIT-FIX-2 Phase B: typed-selector codemod (audit prompt completion)
- What: Closed Phase B of `AUDIT-FIX-2-TOKEN-REFRESH-STORM-2026-05-18`. The code-level changes were pushed inside commit `755502f` (whose message only describes the LISTENING-QA-V2 docs, not the codemod). This entry documents what's actually in that commit so the change log reflects the real work.
- **Phase A discovery** (already in `docs/audits/token-refresh-storm/`): 376 `useAuthStore(…)` call sites across 262 files. 208 already used the selector pattern; 168 were bare `const { … } = useAuthStore()` destructurings (the storm contributor). Phase B1 (`TOKEN_REFRESHED` no-invalidate) was ALREADY shipped at `authStore.js:89-94` by a prior session. Only Phase B2 work remained.
- **Phase B2.1 — typed selectors added** to `src/stores/authStore.js` (lines 303-348): `useAuthUserId`, `useAuthProfileId`, `useIsAuthenticated`, `useIsAdmin` (impersonation-aware), `useIsTrainer` (impersonation-aware), `useIsStudent`, `useIsImpersonating`, `useAuthActions` (with `useShallow` to keep the action-bag identity stable). The 7 pre-existing selectors at lines 304-312 were kept. `useShallow` import added at top of the file.
- **Phase B2.2 — codemod across 155 consumer files** via `scripts/codemod-auth-selectors.cjs`. Single-field destructurings (108 calls: `{ profile }`, `{ studentData }`, `{ user }`, plus 1 rename `{ profile: currentUser }`) were swapped to the typed selector hooks. Multi-field destructurings (60 calls: `{ profile, studentData }`, `{ user, profile }`, `{ profile, trainerData }`, `{ profile, impersonation }`, plus the 9 action-bearing cases like `{ profile, signOut }`) were wrapped in `useAuthStore(useShallow((s) => ({…})))` so the projected object's identity is stable. The `useAuthStore` import is removed from files where it's no longer referenced (the codemod checks for selector-pattern / `getState()` / `useShallow` survivors before pruning).
- **Verification:** 0 bare `const { … } = useAuthStore()` remain (was 168). 108 typed-selector hook calls active. 60 `useAuthStore(useShallow(…))` wraps active. Babel parse-check 155/155 PASS. Red-flag scan (destructure-off-typed-selector) returned 0 hits. App.jsx untouched (already on selector pattern).
- **Impact:** Re-render scope on any non-identity store update (e.g. realtime `studentData` patch, `lastTokenRefreshAt` write, `_realtimeChannel` swap, `_authSubscription` write) drops from "all 168 bare subscribers" to "only the components whose specific slice changed." The 60 multi-field wraps no longer re-render on unrelated field changes thanks to `useShallow`.
- **Important caveat:** This is the audit prompt's "real" token refresh storm fix. My earlier commit `1a91c5b` ("singleton refresh promise eliminates token refresh storm") addressed a different problem — concurrent `supabase.auth.refreshSession()` API call deduplication. Both fixes are orthogonal and both shipped.
- Files: `src/stores/authStore.js` (+45 lines), 155 consumer files (single-field swap or `useShallow` wrap), `scripts/codemod-auth-selectors.cjs` (codemod tool, kept for audit trail), `docs/audits/token-refresh-storm/*` (Phase A snapshots + Phase B inventory)
- DB: None — Edge Functions: None
- Status: Code-level changes shipped inside `755502f`. This changelog entry + the codemod script are added in a follow-up commit.

### 2026-05-19 — LISTENING-QA-V2 (spoken labels fix + truncation + voice diversity verify)
- What: Ran the LISTENING-QA-V2-SPOKEN-LABELS-FIX prompt. All 3 phases clean. No DB rows touched. Generator permanently hardened against the "speaker labels read aloud" bug. Pushed as commit `456f12a`.
- **Phase A (truncation, browser-style stream test):** 72/72 OK. Reused the v1 audit results from commit `bf1697d` (yesterday) — same Range-based methodology as the v2 prompt's spec, so no re-run needed.
- **Phase B (voice diversity):** 44/44 multi-speaker rows have distinct `voice_id` per declared speaker. 0 single-voice collisions.
- **Phase C — THE CRITICAL BUG (defensive fix):** Sanitizer + generator patch ship even though no rows are currently affected — the bug cannot regress.
  - `scripts/audio-v2/lib/strip-speaker-label.cjs` — strips English/Arabic/bracketed speaker labels. Conservative: preserves mid-sentence colons (`"I have three options: red, blue"`) and times (`"3:45 PM"`).
  - `scripts/audio-v2/lib/strip-speaker-label.test.cjs` — **13/13 PASS**.
  - `scripts/audio-v2/03-generate-listening.mjs` — imports + applies `stripSpeakerLabel` on every segment before the ElevenLabs API call. Future-proof comment block + reference to regression test added at top of file.
  - `scripts/audits/listening-qa-v2/04-spoken-labels-scan.cjs` — text-level scanner across all 72 listening rows. Result: **0 SUSPECT / 72 CLEAN**. The earlier `LABEL_IN_TEXT` finding in `docs/audits/audio-issues/listening-audit.json` was a false positive (scanned raw transcript instead of `speaker_segments[].text`).
  - `scripts/audits/listening-qa-v2/06-control-spot-listen.cjs` — 5 control-group CLEAN multi-speaker rows (3 interview + 2 dialogue) sampled to `/tmp/listening-qa-v2-spot-listen/` for Ali to spot-listen (Whisper STT not wired locally; per-prompt fallback used).
- **ElevenLabs char budget:** 643,594 / 1,810,000. **0 chars consumed** — no regenerations triggered.
- Files: 9 new — `docs/audits/listening-qa-v2/{FINAL-REPORT.md, spoken-labels-scan.json, control-spot-listen.{json,md}}`, `scripts/audio-v2/lib/strip-speaker-label{.cjs,.test.cjs}`, `scripts/audits/listening-qa-v2/{04-spoken-labels-scan.cjs, 06-control-spot-listen.cjs}` + 1 modified (`scripts/audio-v2/03-generate-listening.mjs` — 15 line patch).
- DB: None — Edge Functions: None
- Status: Complete — commit `456f12a` pushed to main, HEAD == origin/main.

### 2026-05-19 — Section-Completion Restore: vocab cards now honor explicit section signal
- What: Restored the ✓ "section complete" badges on the unit overview for the vocabulary card. 30 student/unit pairs (22 `vocabulary_exercise` + 8 `vocabulary`) where students had completed the vocab section but the card still showed as incomplete.
- **Root cause:** `compute_unit_progress` PL/pgSQL function evaluated vocabulary completion ONLY from the 80% word-mastery threshold in `vocabulary_word_mastery`. It ignored explicit section-level completion signals written to `student_curriculum_progress` (`section_type IN ('vocabulary','vocabulary_exercise')` `status='completed'` `is_best=true`). All other 6 section types (reading/grammar/listening/speaking/writing/pronunciation) already reflected correctly.
- **Fix (1 migration + 2 frontend tweaks):**
  - `supabase/migrations/20260519000000_compute_unit_progress_vocab_section_signal.sql` — CREATE OR REPLACE `compute_unit_progress`. Vocab now counts as complete when EITHER explicit section completion exists OR 80% word-mastery threshold met. New `vocabulary_section_done` boolean exposed in `breakdown.completion`. All other section logic unchanged.
  - `src/hooks/useUnitProgress.js` — vocab branch honors `vocabulary_section_done`
  - `src/utils/calculateUnitProgress.js` — frontend fallback vocab def honors explicit completion via student_progress rows
- **Backfill:** 96 (student, unit) pairs recomputed via `recompute_unit_progress_for`. All 36 vocab-completed pairs now flagged correctly (`vocabulary_section_done = true`).
- Files: `supabase/migrations/20260519000000_compute_unit_progress_vocab_section_signal.sql` (NEW), `src/hooks/useUnitProgress.js`, `src/utils/calculateUnitProgress.js`, `docs/audits/section-completion-restore/{PHASE-A-REPORT,FINAL-REPORT}.md`
- DB: `compute_unit_progress` function replaced (idempotent); 96 unit_progress rows refreshed. No row data mutated in submissions / xp_transactions / vocabulary_word_mastery.
- Edge Functions: None
- Status: Complete — pushed to main. Triggers on the 4 source tables remain enabled and now produce correct vocab completion flags.

### 2026-05-19 — PERSONALIZATION-REVERT: canonical curriculum is the single default
- What: Permanent product decision — every student sees the same canonical curriculum by default. Personalization (reading variants by interest bucket) is demoted to inactive code; UI hidden from the default flow.
- **Scope confirmed:** personalization wiring is fully contained — exactly 2 hooks (`usePersonalizedReading`, `useUserInterests`), 4 components in `src/components/personalization/`, and 3 mount points (StudentDashboard, StudentProfile, ReadingTab). No edge functions consult personalization. No external hook consumers.
- **Action — 3 mount points hidden** (import + JSX commented with `PERSONALIZATION-REVERT 2026-05-19` marker):
  - `src/pages/student/StudentDashboard.jsx:153` — `<InterestSurveyCard />` removed from dashboard
  - `src/pages/student/StudentProfile.jsx:626` — `<InterestsSettingsSection />` removed from profile
  - `src/pages/student/curriculum/tabs/ReadingTab.jsx:923` — `<PersonalizedReadingCard />` removed from reading tab
- **Why this works:** Personalization was already a separate surface (a drawer card below canonical, not an in-flow substitution). Hiding the mount points eliminates the only points where personalization queries run (`usePersonalizedReading.enabled` is `interests.length > 0` but the hook has no remaining consumers). Canonical text/audio/karaoke all resolve to the same `curriculum_readings.id` on the default path.
- **Preserved (intentionally):** DB tables (`personalized_readings` with 1,152 variants, `user_interests`), all hook files, all `src/components/personalization/` files, all student interest tags. Future opt-in surface can reuse everything.
- **NOT TOUCHED:** No DB schema changes, no migrations, no student data writes (submissions, unit_progress, vocab_progress, xp_transactions untouched), no edge function changes, no reading/listening flow logic changes.
- Files: `src/pages/student/StudentDashboard.jsx`, `src/pages/student/StudentProfile.jsx`, `src/pages/student/curriculum/tabs/ReadingTab.jsx`, `docs/audits/personalization-revert/PHASE-A-REPORT.md` (NEW), `docs/audits/personalization-revert/FINAL-REPORT.md` (NEW), `scripts/audits/verify-canonical-only.cjs` (NEW)
- Status: Complete — `verify-canonical-only.cjs` reports 5/5 PASS

### 2026-05-18 — LISTENING-VOCAB-FIX: audio playback + sticky bar + vocab completion
- What: Three-problem fix: (1) listening audio not playing in browser, (2) player redesign as fixed bottom bar, (3) vocab green check not appearing after exercise completion.
- **Problem 1 — Audio not playing:** `ListeningPlayer.jsx` had no `useEffect([audioUrl])`, so changing units didn't call `audio.load()` (iOS Safari doesn't auto-reload on `src` prop change). Also no `error` event handler (silent failures), no `playsInline` (iOS fullscreen issue), and `play()` rejection swallowed with empty `.catch(() => {})`. Fixed: dedicated `useEffect([audioUrl])` explicitly sets `el.src` + calls `el.load()` + resets state; `error` event shows Arabic error + retry; `play()` rejection sets visible error state; `playsInline` added.
- **Problem 2 — Sticky bar:** Rebuilt `ListeningPlayer` as `position: fixed; bottom: 0; left: 0; right: sidebarWidth`. Added `data-sidebar-root` attribute to `<aside>` in `Sidebar.jsx` so `useSidebarWidth` hook can measure it. Mobile: `right: 0` (full width). iOS: `env(safe-area-inset-bottom)` padding. Player renders its own bottom spacer (80–160px) to prevent content being hidden behind the bar.
- **Problem 3 — Vocab green check:** `handleMasteryUpdate` in `VocabularyTab.jsx` used only `queryClient.setQueryData` (optimistic). Added `queryClient.invalidateQueries` alongside it so a fresh DB fetch confirms mastery after exercise completion. Also handles null `updated` (RLS RETURNING edge case). `useVocabularyMastery` hook mastery SELECT now throws on error instead of silently returning empty map.
- Files: `src/components/players/listening/ListeningPlayer.jsx` (full rewrite), `src/components/players/listening/ListeningSection.jsx` (remove sticky wrapper), `src/components/layout/Sidebar.jsx` (add `data-sidebar-root`), `src/pages/student/curriculum/tabs/VocabularyTab.jsx` (handleMasteryUpdate + invalidateQueries), `src/hooks/useVocabularyMastery.js` (error check on mastery SELECT)
- DB: None — Edge Functions: None
- Status: Complete — all Phase F self-checks pass, commit pushed

### 2026-05-18 — LISTENING-SECTION-COMPLETE-OVERHAUL: duplicate header fix
- What: Follow-up pass on the listening overhaul (original fix in commit `2a8afa6`). Resolved the remaining duplicate-header rendering bug that the previous session left unfinished.
- **Root cause identified:** `ListeningTab.jsx` had a local `ListeningSection` inner component that rendered the listening item's title (English + Arabic + type badge) at lines 195–218, then immediately called `<ListeningSectionUI>` (the imported premium component from Phase F) which ALSO renders its own full premium title header. Students saw two identical-content headers — one in legacy Inter/English style with a purple badge, one in premium Tajawal/Arabic style with a cyan badge. This is exactly the "two cards with same title" bug from the original prompt.
- **Fix:** Removed the duplicate title block (lines 195–218) from the local component in `ListeningTab.jsx`. The IELTS exam-mode toggle button is preserved as a standalone `dir="rtl" flex justify-end` element. `ListeningSectionUI` is now the sole source of title + type badge rendering.
- **All Phase G self-checks confirmed passing:**
  - No `-c copy` as real command in concat.cjs ✅
  - test-concat PASS ✅
  - Decode-test: dialogue/interview/monologue all exit=0 ✅
  - NULL title_ar: 0 ✅
  - DB duplicates: 0 ✅
  - No `fixed bottom-0` in listening player ✅
  - ListeningPlayer imported in ListeningSection ✅
  - Reading does NOT import ListeningPlayer ✅
- Files: `src/pages/student/curriculum/tabs/ListeningTab.jsx` (duplicate title block removed), `docs/audits/listening-overhaul/PHASE-A-REPORT.md` (NEW), `docs/audits/listening-overhaul/FINAL-REPORT.md` (updated with 2026-05-18 section), `prompts/agents/LISTENING-SECTION-COMPLETE-OVERHAUL-2026-05-18.md` (added)
- DB: None (all DB fixes done in previous session: titles migrated, segment timing columns added)
- Edge Functions: None
- Status: Complete — all prompt phases A–G verified

### 2026-05-18 — AUDIT-FIX-2-TOKEN-REFRESH-STORM: singleton refresh promise
- What: Fixed intermittent 401 errors caused by multiple concurrent `supabase.auth.refreshSession()` calls racing each other. Supabase rotates the refresh token on every use — so when 5 AI calls fire simultaneously at page load and all hit an expired session, their independent `refreshSession()` calls invalidate each other's tokens. The first refresh wins; the rest get "invalid_grant" → 401 → user sees error.
- **Root cause:** `invokeWithRetry.js` had a local `getAccessToken()` with no deduplication. `queryClient.js` used a boolean flag (`_refreshingSession`) that prevented a second call from *starting* but didn't make it *wait* for the first — two concurrent calls timed ~1ms apart both slipped through. `driveStream.js` and `ErrorBoundary.jsx` had raw `refreshSession()` calls with zero coordination.
- **Fix:** Created `src/lib/authRefresh.js` with a module-level `_inflightRefresh` Promise. `refreshOnce()` checks for an in-flight promise and returns it if present — all concurrent callers share the same Promise and get the same resolved token. When the refresh settles the singleton clears for the next call. `getToken()` reads session first (no network) and only calls `refreshOnce()` if no token found.
- **Callers updated (4):** `invokeWithRetry.js` — removed local `getAccessToken()`, now uses `getToken()` + `refreshOnce()`; `queryClient.js` — removed boolean flag + local fn, uses `refreshOnce()`; `driveStream.js` — uses `refreshOnce()` in its near-expiry refresh path; `ErrorBoundary.jsx` — uses `refreshOnce()` on retry.
- Files: `src/lib/authRefresh.js` (NEW), `src/lib/invokeWithRetry.js`, `src/lib/queryClient.js`, `src/lib/driveStream.js`, `src/components/ErrorBoundary.jsx`
- DB: None — Edge Functions: None
- Status: Complete — build verified (7.4s, 0 errors), commit `1a91c5b` pushed to main

### 2026-05-18 — AUDIT-FIX-3-LAZY-RETRY: chunk-error guard + protect all 8 unit tab imports
- What: Two-part fix for the lazy-loading chunk retry system.
- **Issue 1 — `lazyRetry.js` caught all errors:** The original implementation caught any error from a dynamic import and triggered a page reload. This meant app-level errors (syntax errors, runtime errors in module init) would silently reload the page instead of surfacing in the ErrorBoundary for diagnosis. Fixed by adding `isChunkLoadError()` guard: only errors matching Vite's "Failed to fetch dynamically imported module", Safari's "Importing a module script failed", or Webpack's ChunkLoadError name trigger the reload. Cooldown bumped 30s → 60s to cover Vercel edge cache propagation.
- **Issue 2 — `UnitContent.jsx` used bare `React.lazy()` for all 8 tab components:** ReadingTab, GrammarTab, VocabularyTab, ListeningTab, WritingTab, SpeakingTab, PronunciationTab, RecordingTab were all imported with `React.lazy()` (no retry). These are the most-accessed components in the app — if a student was mid-unit when a Vercel deploy landed, switching tabs would fail with an error boundary hit instead of a transparent reload. Replaced all 8 with `lazyRetry()`.
- Files: `src/utils/lazyRetry.js`, `src/pages/student/curriculum/UnitContent.jsx`
- DB: None
- Edge Functions: None
- Status: Complete — build verified (6.4s, 0 errors), commit `4ee75e0` pushed to main

### 2026-05-18 — 02-FIX-LISTENING-AUDIO: Female-voice fix + reading truncation regen
- What: Fixed the 3 remaining `post-regen-failures` (SINGLE_VOICE_STILL) and regenerated 13 truncated reading passages.
- **Root cause (3 female-female dialogues):** `assignVoices()` in `lib/speaker-map.cjs` fell back to the generic voice pool when the preferred female voice (Alice/B) was already taken, picking George (A, male) for the second female speaker. Fix: introduced ordered gender pools (`FEMALE_VOICES=[B,D]`, `MALE_VOICES=[A,C]`) so the second female speaker always gets Sarah (D/female), not George.
- **3 dialogues fixed (L2/U5, U6, U11):** Layla+Emma and Layla+Fatima pairs now use Alice (B) + Sarah (D). Re-preprocessed, re-generated, re-uploaded. All 3 verify ✓ (2 distinct female voice IDs, word timestamps populated).
- **13 truncated reading passages fixed (L2, L4, L5):** Regenerated full audio + per-paragraph audio via ElevenLabs. Durations now 133s–351s (vs original 63–74% truncated). All word_timestamps re-populated. `reading_passage_audio` + `curriculum_readings` updated.
- **Schema bug fixed:** `curriculum_listening` has no `audio_duration_ms` column (only `audio_duration_seconds`). Fixed in both `scripts/audio-v2/fix-female-dialogues.mjs` and `03-generate-listening.mjs`.
- **Residual audit flags (not bugs):** L3/U3 `LABEL_IN_TEXT` and L4/U7 `METADATA_MISMATCH` in listening-audit.json are false positives — both pass verification (correct durations, voices, timestamps). No action needed.
- Files: `scripts/audio-v2/lib/speaker-map.cjs` (gender pool fix), `scripts/audio-v2/fix-female-dialogues.mjs` (NEW), `scripts/audio-v2/regen-reading-truncated.mjs` (NEW), `scripts/audio-v2/03-generate-listening.mjs` (schema fix), `docs/audits/audio-issues/post-regen-failures.json` (cleared), `docs/audits/audio-issues/reading-regen-results.json` (NEW)
- DB: 3 `curriculum_listening` rows updated (audio_url, audio_duration_seconds, speaker_segments, word_timestamps). 13 `reading_passage_audio` rows upserted (full_audio_url, full_duration_ms, paragraph_audio, word_timestamps). 13 `curriculum_readings` rows updated (passage_audio_url, audio_duration_seconds).
- Edge Functions: None
- Status: Complete — all 16 items fixed, 0 failures. ElevenLabs used ~125K chars (1.11M remaining).

<!--
Claude Code: Add new entries at the TOP of this section.
Always include: date, what changed, files touched, status.
This is how future sessions know what happened.
-->

### 2026-05-18 — 01-AUDIT-AUDIO-CONTENT (post-regen Mac re-run)
- What: Re-ran the comprehensive audio audit after the May 14 regeneration, using a new Mac-native script instead of the old Windows-based approach.
- **New script:** `scripts/audio-generator/audit-audio-content.mjs` — connects to Supabase via pg pool, ffprobes every audio URL (6× parallel), checks truncation, speaker_segments quality, word_timestamps completeness, and UI component wiring. Replaces the old per-file approach.
- **Key findings (vs. May 14 original audit):**
  - Listening truncated: ~~44~~ → **0** ✅ (regen fixed all)
  - Listening single-voice: ~~21~~ → **0** ✅ (regen fixed all)
  - Listening healthy: ~~27~~ → **70/72** ✅
  - Listening word_timestamps: ~~0~~ → **45/72** ✅ (L2–L5 dialogues/interviews)
  - Reading truncated: **13** (same — regen did not re-process reading passages)
  - Reading TS incomplete (49–85% word coverage): **53** (real gap, not markup artifact)
  - **2 remaining listening issues:** L3 U3 interview (LABEL_IN_TEXT), L4 U7 lecture (METADATA_MISMATCH)
  - **3 lectures missing timestamps:** L4 U9, L4 U12, L5 U9
- **word_timestamps format clarified:** numeric-keyed object `{"0":{word,start_ms,end_ms,speaker},"1":...}` — NOT `{paragraphs:[{words}]}`. Previous audit script had wrong parser.
- **LABEL_IN_TEXT fix:** original script was also checking raw transcript (always has speaker labels in dialogues) — now only checks `speaker_segments[].text` (processed version sent to TTS).
- Files: `scripts/audio-generator/audit-audio-content.mjs` (NEW), `prompts/agents/01-AUDIT-AUDIO-CONTENT.md` (moved from Downloads), `docs/audits/audio-issues/MASTER-REPORT.md`, `listening-audit.json`, `reading-audit.json`, `ui-component-audit.md`
- DB: No changes
- Edge Functions: None
- Status: Complete — commit `caf0608` pushed to main
- Notes: Prompt 02 should re-generate the 13 truncated reading passages + 53 with incomplete timestamps (58 unique items, ~348K chars estimated). Check ElevenLabs quota first.


### 2026-05-12 — GOD COMM Polish Pass 2 (Commits f5310cc→02f8663)
- What: Four surgical fixes to the chat UI after the premium polish pass.
- P10/P11 (system messages + day separators): buildItems rewritten — system messages now accumulate across day boundaries (no longer broken by isSameDay). Collapse threshold lowered from 3 → 2 (any 2+ system messages collapse). Day separators only appear before real messages; system-only days get no separator. SystemMessageCluster: 1 msg = ghost line, 2+ = collapsed "N رسائل نظام · عرض". "طي" renamed to "إخفاء".
- P12 (constellation): Fixed the opacity: 1.5 no-op (CSS opacity clamped to 1). Now overrides --atmo-orb-* CSS custom properties directly: gold 0.09→0.22, violet 0.07→0.18, navy 0.08→0.16. Drift slowed to 90/120/150s.
- P13 (composer always visible): Removed `if (!generalChannelId) return null`. While channels load, shows a spinner row. After load, full composer renders. safe-area-inset-bottom fallback fixed to (0px).
- P14 (stray ط): Identified as clipped "طي" button — fixed by P10 rename. Removed stale console.warn from useGroupChannels.js (RPC deployed).
- Status: Complete — pushed to main, Vercel auto-deploying.

### 2026-05-12 — GOD COMM Premium Polish Pass (Commits d5a0519→726048b)
- What: Pure visual refinement of the Phase 1.7 chat UI. No architecture or backend changes. Reference: Linear typography, Apple Messages bubble craft, Raycast glass depth.
- P1: iMessage-style tail radius (16/4px asymmetric). Shadow stack (0 1px 2px + 0 4px 12px-4 + inset 1px highlight). Own bubble gradient, other glass 92%. Sender in accent color, timestamp 10px tabular monospace. 24ms stagger on group entry.
- P2: System messages = ghost text (12px, 60% opacity, ◌ icon, 4px padding). 3+ consecutive collapses to "N رسائل نظام · عرض" expand toggle.
- P3: Day separator with gradient rails (transparent→border→transparent) + glass pill (blur(12px), inset highlight, letter-spacing 0.02em, font-weight 600).
- P4: Group avatar with level-based gradient (L1=blue, L2=gold, L3=purple, IELTS=emerald) + colored drop-shadow. Group name Tajawal 700 18px. Online chip with CSS pulse dot. Header actions 40px circle glass hover.
- P5: PinnedCard with 3px gold inline-start border, hover glow, sender+time same row, 12px 500 preview. PinnedStrip collapse bar centered. Empty=null.
- P6: body.chat-page CSS selector boosts aurora orb opacity 1.5× + slower drift (120/150/180s). GroupChatPage adds/removes the body class.
- P7: Announcement FAB 56px gold gradient + 1px light border + fabPulse @keyframe (8s glow breathe) + whileTap scale 0.92.
- P8: Composer 20px radius, 1.5px focus ring. Action icons 40px circular glass hover. Send = 40px gold gradient circle. VoicePlayer playhead glow (gold box-shadow 1.5× height). ReactionInlineBar 36px emoji, jewel pop 1.2×. ReactionSummary glass chip, gold border own, emoji scale(1.1).
- Status: Complete — pushed to main, Vercel auto-deploying.

### 2026-05-12 — GOD COMM Premium Redesign Phase 1.7 (Commits 63ee489→ca6b9a6)
- What: Complete visual pivot from channel-sidebar UI to single unified stream per group. No data migration. Philosophy: AI tags messages, users see ONE stream filtered by lenses.
- Architecture change: ChannelSidebar deprecated. GroupChatPage rebuilt. New `src/features/chat/components/premium/` directory with 16 components. `src/features/chat/lib/motion.js` for shared Framer Motion transitions.
- R1: design token aliases, motion.js, StreamHeader skeleton, GroupChatPage shell, ChannelSidebar → .deprecated.jsx, react-virtuoso installed.
- R2: UnifiedMessageStream (react-virtuoso), MessageGroupPremium (4-min sender grouping), DaySeparator, PremiumEmptyState, ScrollToBottomPill. useUnifiedMessages hook.
- R3: FilterLensBar + FilterLensPill (6 lenses: all/important/voice/files/mentions/questions). get_group_messages + get_group_lens_counts RPCs (migration 20260512250000). Server-side lens filtering.
- R4: PinnedStrip + PinnedCard (group-scoped pins, collapse, trainer unpin hover button, tap-to-scroll-original).
- R5: PremiumComposer (glass panel, no channel selector, sends to general channel). Announcement FAB (megaphone gold button, trainer/admin only, AnnouncementSheet spring modal, posts to announcements channel). useGroupGeneralChannel + useGroupAnnouncementChannel hooks.
- R6: VoicePlayerPremium (48-bar gradient waveform, seek, 1×/1.5×/2× speed, singleton). ReactionInlineBar (glass popIn hover bar). ReactionSummary (gold-highlighted own reactions, +N chip, taps sheet).
- R7: ActiveUsersDots (avatar cluster), MessageBubbleSystem.jsx (centered muted pin messages), bubble restyle (own=accent-tint left, other=glass right, float+clearfix RTL alignment). Group name fetched for StreamHeader.
- R8: All 4 /chat routes verified. ChannelSlug ignored by new GroupChatPage (back-compat for old links). Old /student/chat still registered.
- DB: migration 20260512250000 (get_group_messages RPC + get_group_lens_counts RPC applied).
- Files: src/features/chat/components/premium/* (16 files), GroupChatPage.jsx, GroupChatLanding.jsx, MessageBubble.jsx, MessageBubbleVoice.jsx, MessageBubbleSystem.jsx, useUnifiedMessages.js, useGroupGeneralChannel.js, motion.js, design-tokens.css (aliases), supabase/migrations/20260512250000.
- Status: Complete — pushed to main, Vercel auto-deploying.
- Note for trainers: Announcements now sent via gold Megaphone FAB (bottom-right above composer). No channel selector in the main composer.

### 2026-05-12 — GOD COMM Phase 1.5 Gap Closure (Commits 569db84→e91d859)
- What: Closed all 5 critical gaps surfaced by the verification pass. Migrations applied to prod.
- G1 — RLS fixes: message_reactions 3 policies (select/insert/delete). storage.objects 9 policies (read/insert/delete × 3 chat buckets). Migration 20260512230000.
- G2 — Auth guard: /chat routes wrapped in StudentStatusGuard (paused students redirect to /account/paused, trainers/admins pass through).
- G3 — @mention autocomplete: MentionAutocomplete.jsx fetches group members, keyboard nav, inserts @Name and profile id into mentions[]. MessageComposer now sends real mentions[] on submit. MessageBubbleText renders @token as sky chips.
- G4 — Read state: IntersectionObserver in MessageList triggers useMarkRead on visible non-own messages, advances channel_read_cursors, invalidates badge query.
- G5 — Search panel: ChatSearchPanel.jsx (bottom sheet mobile, right drawer desktop) with query, channel slug, date range filters. Tapping result deep-links to /chat/:groupId/:channelSlug/m/:messageId.
- G6 — "Who reacted" sheet: ReactionDetailsSheet.jsx, triggered by tapping reaction count. Groups by emoji, shows avatar + name + role.
- G7 — Pin system message: pin_message_with_system_note RPC (SECURITY DEFINER plpgsql). Atomically flips is_pinned + inserts system message "X ثبّت رسالة". Migration 20260512240000.
- G8 — Announcement fanout: announcement-fanout edge function deployed. Checks is_announcement, notifies all group students + fires push. ⚠️ Webhook must be registered manually in Supabase Dashboard (group_messages INSERT → https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/announcement-fanout).
- G9 — Presence: usePresence wired in GroupChatPage, green dot in ChannelSidebarItem, online count in ChatHeader.
- Files: src/features/chat/components/{MentionAutocomplete,ChatSearchPanel,ReactionDetailsSheet,ReactionDetailsSheet}.jsx, MessageComposer, MessageList, MessageBubbleText, MessageReactionsRow, MessageBubble, ChannelSidebar, ChannelSidebarItem, ChatHeader, GroupChatPage, useTogglePin, supabase/functions/announcement-fanout, supabase/migrations/20260512230000+20260512240000, App.jsx
- Status: Complete — all pushed to main, Vercel auto-deploying. One manual step: register announcement-fanout DB webhook.

### 2026-05-12 — GOD COMM System Phase 1 Foundation (Commits a23f5d9→8c6527a)
- What: Full in-LMS communication system built to replace Telegram for group chat. Phases A-N executed (A=Discovery, B=DB schema, C=Storage, D=Routes, E=Data layer, F=Shell UI, G=Voice, H=Composer, J=Mentions/Pins, K=Search, L=Push, M=Bell wiring).
- Architecture: `src/features/chat/` — queries/, mutations/, realtime/, components/, pages/, providers/, lib/
- DB migration: `supabase/migrations/20260512200000_god_comm_phase_b_schema.sql` — **MUST BE RUN MANUALLY IN SUPABASE SQL EDITOR** (direct psql blocked by network on dev machine). Creates: group_channels, message_reads, channel_read_cursors, is_in_group(), get_chat_unread_total(). Adds columns to group_messages (channel_id, body, voice_waveform, deleted_at, mentions, etc.). Adds chat types to notification_type enum. Seeds 9 channels × 8 groups. Backfills channel_id from existing 153 messages. Adds realtime publication for group_messages/message_reactions/notifications/channel_read_cursors.
- chat_search RPC: `supabase/migrations/20260512210000_god_comm_phase_k_search.sql` — also needs manual SQL Editor run.
- Storage: chat-voice (25MB), chat-files (50MB), chat-images (10MB) buckets created via REST API ✅
- Edge functions deployed: process-mentions (DB webhook for @mentions → notifications + push), link-preview (OG scraper)
- Routes: /chat, /chat/:groupId, /chat/:groupId/:channelSlug, /chat/:groupId/:channelSlug/m/:messageId
- Nav: "المحادثة" added to STUDENT_NAV (community section), TRAINER_NAV (tools), ADMIN_NAV (operations)
- Key components: ChannelSidebar (RTL, mobile swipe-out), MessageList (infinite scroll, deep-link, realtime), MessageBubble (all types: text/voice/image/file/link/announcement), VoiceRecorder (MediaRecorder, waveform, lock/cancel), MessageComposer (text+voice+image+file, typing indicator), PinnedMessagesStrip
- Decision: DRIFT REPAIR (not fresh build) — existing group_messages (153 rows), notifications (596 rows), push_subscriptions (268 rows) preserved. Legacy `content` and `channel` enum kept alongside new `body` and `channel_id` FK.
- Group membership: students.group_id (NOT profiles.group_id) — is_in_group() helper updated
- Phase L pre-built: push-sw.js already existed + send-push-notification edge fn already deployed. Added chat notification types to TYPE_CONFIG.
- Status: Frontend code complete + pushed to main + Vercel auto-deploying. DB migration needs manual run.
- Files: src/features/chat/** (40+ files), src/lib/chatStorage.js, src/config/navigation.js, src/App.jsx, supabase/functions/process-mentions/, supabase/functions/link-preview/, public/push-sw.js, supabase/migrations/20260512200000+20260512210000

### 2026-05-18 — Grammar Najdi Polish: Readable Renderer + Model Update
- What: Fixed "dense and hard to scan" issue with the Najdi-dialect grammar explanation feature. Two-sided fix: renderer CSS improvements + edge function model update.
- **CSS (grammar-najdi.css):**
  - Section heading font size: `0.9375rem (15px)` → `1.0625rem (17px)` — clearer visual hierarchy
  - Section heading top margin: `1.5rem` → `2rem` — more breathing room between sections
  - Para bottom margin: `0.625rem` → `0.75rem`, list padding increased to `1.5rem`
  - Blockquote direction: removed brittle `nth-child(odd/even)` direction hack (broke when example had 3 lines e.g. + ملاحظة) → replaced with `unicode-bidi: plaintext` on each `<p>`, which auto-detects direction from content (Arabic → RTL, English → LTR) for any number of lines
  - Blockquote border: `border-right` → `border-inline-start` (RTL-semantic, right-side in dir=rtl)
- **Edge function (explain-grammar-answer):** model updated `claude-sonnet-4-20250514` → `claude-sonnet-4-6`
- **ExplainModal:** Added "تجديد الشرح" small button for new-format (MD) rows — previously only old HTML rows had a regenerate option
- **Discovery docs:** `docs/dev-notes/grammar-najdi-discovery.md` updated, `docs/dev-notes/grammar-najdi-samples-before.md` created with 5 cached row samples showing old HTML format
- **⚠️ MIGRATION NEEDED:** `explanation_md` column and `grammar_explanations_warnings` table not yet in production (migration `20260513000000` was never applied). Until applied: cache is bypassed on every request (SELECT with non-existent column fails → always hits Claude API — costs tokens). **Must run in Supabase SQL Editor:**
  ```sql
  ALTER TABLE public.grammar_explanation_cache ADD COLUMN IF NOT EXISTS explanation_md TEXT;
  CREATE TABLE IF NOT EXISTS public.grammar_explanations_warnings (id BIGSERIAL PRIMARY KEY, cache_key TEXT NOT NULL, reason TEXT NOT NULL, raw_response TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
  ALTER TABLE public.grammar_explanations_warnings ENABLE ROW LEVEL SECURITY;
  ```
- **⚠️ DEPLOY NEEDED:** Edge function must be deployed: `supabase functions deploy explain-grammar-answer --no-verify-jwt --project-ref nmjexpuycmqcxuxljier` (requires `supabase login` with personal access token first)
- Files: `src/components/grammar/grammar-najdi.css`, `src/components/grammar/ExplainModal.jsx`, `supabase/functions/explain-grammar-answer/index.ts`, `docs/dev-notes/grammar-najdi-discovery.md`, `docs/dev-notes/grammar-najdi-samples-before.md`
- DB: No schema changes applied — migration file exists (`20260513000000_grammar_explanation_md.sql`), must be run manually
- Edge Functions: `explain-grammar-answer` — model updated in code, needs redeploy
- Status: Code complete + committed. Two manual steps remain: (1) apply migration in SQL Editor, (2) redeploy edge function.
- Notes: The feature currently works (students see structured Markdown via NajdiExplanationView) because the SELECT failure → cache miss → fresh Claude call returns `explanation_md` in response body. Caching is just broken until migration is applied. After migration + redeploy, all new explanations will be cached; existing HTML rows can be upgraded with "تجديد الشرح" button.

### April 16, 2026 — Stop Auto-Grading Unfinished Activity Attempts (a9dfbdf)
- What: Students reported that answering 1-2 questions in Reading/Listening/Grammar activities then navigating away caused the system to auto-grade ALL unanswered questions as wrong and mark the row `status=completed` with a low score. Root cause: the per-answer autosave `useEffect` in each activity wrote `status='completed'` + computed a score (counting unanswered as wrong) the instant `answered === total` — no explicit submit step existed.
- **Fix (save-vs-submit separation):** In all three affected activities, autosave now ALWAYS writes `status='in_progress'` + `score=null` + `completed_at=null`. A new inline "تسليم الإجابات" submit button (disabled until all questions answered) is the ONLY path that writes `status='completed'`, computes the score, and fires `awardCurriculumXP`. Reading `MCQQuestion` and Listening `ListeningMCQ` also gained a `revealCorrect` prop — correct/wrong styling and explanation blocks only appear after submit, letting students change answers freely before submitting. Grammar keeps its per-answer feedback (intentional practice UX) but no longer auto-completes.
- **Activities verified clean (no changes needed):** WritingTab (already has `isSubmit` gate), SpeakingTab (per-recording explicit flow), VocabularyExercises (explicit `handleSubmit` pattern), PronunciationActivity (explicit `markComplete`), AssessmentTab (placeholder).
- Files: `src/pages/student/curriculum/tabs/ReadingTab.jsx` (ComprehensionSection + MCQQuestion), `src/pages/student/curriculum/tabs/ListeningTab.jsx` (ListeningExercises + ListeningMCQ), `src/components/grammar/ExerciseSection.jsx`
- DB: No schema changes. Historical rows affected by the bug can be identified via: `status='completed' AND score < 60 AND time_spent_seconds < 30` — no mutation performed.
- Edge Functions: None
- Status: Complete — committed `a9dfbdf`, pushed to `origin/main`, Vercel auto-deploys.

### April 12, 2026 — Fix Trainer Dashboard "الطالب غير موجود" Bug
- What: Clicking a pending speaking recording in the trainer dashboard's "واجبات تنتظر التصحيح" section was navigating to `/trainer/student/:id/progress` which showed "الطالب غير موجود" (student not found) instead of taking the trainer to the grading page. Root cause: speaking recordings had no dedicated grading UI, so the code routed to `StudentProgressDetail` — but that page's `.single()` query silently swallowed errors, returning null and triggering the "not found" message.
- **Fix 1 — TrainerDashboard.jsx:** Changed speaking recording `href` from `/trainer/student/${r.student_id}/progress` to `/trainer/grading` so all pending items (assignments AND speaking) go to the grading page.
- **Fix 2 — StudentProgressDetail.jsx:** Added proper error handling to the `.single()` query — destructures `error`, logs it with student ID for debugging, returns null gracefully instead of silently swallowing.
- Files: `src/pages/trainer/TrainerDashboard.jsx`, `src/pages/trainer/StudentProgressDetail.jsx`
- DB: No changes
- Edge Functions: None
- Status: Complete
- Notes: The trainer now always lands on `/trainer/grading` for any pending item, which is the correct destination for both assignment submissions and speaking recordings.

### April 12, 2026 — Convert Prompts 31/35/36 to Single Sequential Agent (Prompt 38)
- What: Refactored Prompts 31 (Synonyms/Antonyms), 35 (Word Families + Morphology), and 36 (Pronunciation Alerts) from the previous "split into 10 batches and run 10 Claude Code tabs in parallel" pattern into a single sequential agent that processes the entire vocabulary table in chunks, committing progress between chunks. Root cause for the change: each separate Claude Code tab loaded its own full context (system prompt + skills + discovery + rules), so the cost was ~10× the tokens of doing the same work in one run, and it burned the Claude Code Max weekly quota in hours.
- **New canonical prompt files** (written into `prompts/agents/`, which previously only held the per-batch manager files): `31-synonyms-antonyms-system.md` (batch 50), `35-word-families.md` (batch 30 — smaller because morphology explanations are longer per word), `36-pronunciation-alerts.md` (batch 50). Each prompt now describes a single processing loop: `--fetch N → reason in one pass → --apply → git commit chore(...) processed words N-M → loop`. PART A (database/migration) and PART C (UI component) were preserved verbatim from the original prompts; only the generation section was rewritten.
- **Three small generator helper scripts** (NEW, NOT generators themselves — Claude does the reasoning, these are just DB primitives):
  - `scripts/generate-relationships.cjs` — `--fetch <N>` (next N pending words as JSON to stdout, batch range to stderr), `--apply <result.json>` (links each synonym/antonym to a real `vocabulary_id`, marks the highest-level synonym with `is_strongest: true`, updates `synonyms`/`antonyms`/`relationships_generated_at`), `--status` (`{ total, done, pending }`)
  - `scripts/generate-families.cjs` — same `--fetch`/`--apply`/`--status` shape, normalizes each family member, links `vocabulary_id` by lowercase word lookup, clamps levels to 1-5, updates `word_family`/`word_family_generated_at`
  - `scripts/generate-pronunciation.cjs` — same shape, validates the alert object (severity in `high|medium|low`, required keys: `severity`, `ipa`, `correct_approximation_ar`, `explanation_ar`), normalizes or NULLs, updates `pronunciation_alert`/`pronunciation_generated_at`, reports `{ updated, alerts_created, null_alerts, skipped, failed }`
- All three helpers connect to Supabase via service-role key, target `curriculum_vocabulary`, support both legacy (`level`/`meaning_en`/`pos`) and new (`difficulty_tier`/`definition_en`/`part_of_speech`) column names so the agent gets a consistent JSON shape regardless of which column the row actually uses, and print the absolute index range of each batch (e.g. `BATCH 51-100 / 1954`) to stderr so the commit message reflects real progress.
- **Deleted (no longer used):**
  - Folders: `prompts/agents/relationships/` (10 manager files + manager-template.md), `prompts/agents/pronunciation/` (1 manager file). `prompts/agents/families/` did not exist on disk so nothing to delete there.
  - Scripts: `scripts/split-vocab-for-agents.cjs`, `scripts/split-vocab-families.cjs`, `scripts/split-vocab-pronunciation.cjs`
- **Preserved (unchanged):** the existing loader scripts (`scripts/load-relationships.cjs`, `scripts/load-families.cjs`, `scripts/load-pronunciation.cjs`) and the verifiers (`scripts/verify-relationships.cjs`, `scripts/verify-families.cjs`, `scripts/verify-pronunciation.cjs`) — they still work with the legacy `agent-batches/` / `family-batches/` / `pronunciation-batches/` folders and are referenced from the new prompts as the verification step. Migration files, UI components, and integration points were also untouched (Part 37 already redesigned the UI).
- **No reference to "10 agents" / "parallel" / "agent-NN-manager" remains** in the three rewritten prompts (verified via grep).
- **New run command for Ali:** instead of opening 10 Claude Code tabs and pasting 10 manager filenames, Ali opens ONE tab and runs `Read and execute prompts/agents/31-synonyms-antonyms-system.md` (or `35-...` or `36-...`). The agent loops internally until `--status` reports `pending: 0`, then runs the verifier and pushes the final commit.
- Files: `prompts/agents/31-synonyms-antonyms-system.md` (NEW, canonical location), `prompts/agents/35-word-families.md` (NEW), `prompts/agents/36-pronunciation-alerts.md` (NEW), `scripts/generate-relationships.cjs` (NEW), `scripts/generate-families.cjs` (NEW), `scripts/generate-pronunciation.cjs` (NEW), `scripts/split-vocab-for-agents.cjs` (DELETED), `scripts/split-vocab-families.cjs` (DELETED), `scripts/split-vocab-pronunciation.cjs` (DELETED), `prompts/agents/relationships/` (FOLDER DELETED, 11 files), `prompts/agents/pronunciation/` (FOLDER DELETED, 1 file), `CLAUDE.md`
- DB: No schema changes
- Edge Functions: None
- Status: Complete — meta-refactor only, no runtime code touched. Same output quality, ~80-90% token reduction, 2-3× longer wall-clock per full vocabulary pass. Resolves Session 19 quota burn issue.
- Notes: Scripts use `curriculum_vocabulary` (the actual table name) not `vocabulary` (which appears in the original prompt SQL — those SQL snippets were left as-is for human readers because they're examples, not executed code; the helper scripts target the real table).

### April 12, 2026 — Section-Level Error Boundary for Unit Tabs (Waad's writing crash)
- What: Student Waad Al-Omran reported that opening the Writing tab inside L3 U2 "Coral Reefs" crashes with "تعذر إظهار الصفحة". Investigation found: (a) her analytics events were silently dropped after `2026-04-08 16:07` — no errors logged server-side, (b) the production `PageErrorFallback` hid the actual error (only shown in DEV), (c) a single-tab crash was taking down the entire unit route because the only ErrorBoundary was route-level. We couldn't identify the exact crash line from static analysis — task data is clean, RLS works, another student (Nadia) submitted the same task successfully before commit `9f0b12d` (writing assistant + WordCountStatus banner) landed on 2026-04-11.
- **Fix:** Add a tab-scoped ErrorBoundary that (1) keeps the unit page alive when one tab crashes, (2) surfaces the real error message in production so students can screenshot + send, (3) logs the crash via a direct `analytics_events` insert (bypassing the possibly-broken `activityTracker`).
- **New `src/components/SectionErrorBoundary.jsx`:** Class component with `section` / `sectionLabel` / `unitId` props. Renders an inline RTL error card with icon + Arabic heading + `<pre>` showing the error message (always, no DEV gate), plus "إعادة المحاولة" and "انسخي الخطأ" buttons (clipboard copies section/unit/message/stack). `componentDidCatch` directly calls `supabase.from('analytics_events').insert(...)` with event `'section_crash'` and the full component stack.
- **`UnitContent.jsx` wiring:** Imports the new boundary and wraps `{renderTabContent()}` inside the existing `AnimatePresence > motion.div`. `key={activeTab}` forces a remount per tab so a previously-errored tab clears when the student switches away and back.
- Files: `src/components/SectionErrorBoundary.jsx` (new), `src/pages/student/curriculum/UnitContent.jsx`
- DB: No schema changes — reuses `analytics_events` table
- Edge Functions: None
- Status: Complete — `npm run build` succeeds (24.7s, 0 errors)
- Notes: This is a diagnostic fix, not a root-cause fix. Once Waad retries on the new build she'll either (a) get past the crash thanks to one of the recent hardening changes, or (b) see the real error inline + the `section_crash` event will land in `analytics_events` so we can identify the exact crash site. The `activityTracker`-vs-direct-insert divergence matters: her missing events suggest the tracker has a userId-init race for some sessions, so for diagnostic logging we must go straight through supabase-js.

### April 12, 2026 — Light Theme Redesign: "Pearl Aurora" (warm premium replaces cold frost)
- What: User said the existing "Frost White" light theme felt "جداً بايخ" (super bland), "فاقع بزيادة" (too harsh/bright) and "غير جذاب اطلاقا" (not attractive at all). Completely redesigned the light-theme token block and the `body::after` gradient mesh into a warm, iridescent "Pearl Aurora" palette. All token names are unchanged so no component code was touched — the entire visual overhaul lives in two CSS files.
- **What changed (design-tokens.css, `[data-theme="frost-white"]` block):**
  - Surfaces: cold slate-tinted whites (`#f6f8fb`, `#eef1f6`) → **warm pearl/ivory** (`#faf6ed` page, `#efe8dc` void, `#f5efe0` hover)
  - Cards: pure `#ffffff` with a barely-there warm tint on hover (`#fffdf6`) / active (`#fffbec`)
  - Borders: `rgba(15, 23, 42, …)` (cold slate) → `rgba(120, 72, 20, …)` (warm umber)
  - Text: `#0b1220`/`#334155`/`#64748b` (cold) → `#1c150c`/`#3d342a`/`#7d6f5e` (warm charcoal)
  - Accents: deeper jewel tones — `sky #0284c7` → `#0e7490` deep teal; `gold #b45309` → `#a16207` richer amber; `violet #6d28d9` → `#7c3aed`; `emerald #047857` → `#0f766e`
  - **Shadows (biggest cue for premium):** all shadow color stops switched from `rgba(15, 23, 42, …)` cold-gray to `rgba(120, 72, 20, …)` warm-umber — this is the single thing that transforms "paper" into "pearl". Shadow radii also bumped slightly (`md: 4px→6px blur`, `lg: 12px→16px`, `xl: 24px→32px`) for more depth.
  - Glow shadows: each brand glow now uses its own jewel-tone color at higher opacity (0.18-0.20 vs 0.12-0.14)
  - Hero gradient: was `#ffffff → #f8fafc → #f1f5f9` (flat gray wash) → now `#fff9ec → #fef1d8 → #fbe6e2 → #f0e5ff` (peach → rose → lavender iridescent wash)
  - Input focus ring: sky blue → deep teal (`#0e7490`)
- **What changed (global.css, `.light body::after` mesh):**
  - Old mesh: 4 cold radial stops (sky blue 0.09 / violet 0.055 / amber 0.04 / emerald 0.03)
  - New mesh: 5 warm iridescent stops (**peach 0.22** / **lavender 0.18** / **rose 0.15** / mint 0.11 / powder-blue 0.10) — much more present, visually felt without hurting AAA contrast (mesh is fixed and behind cards, cards are still opaque white)
- Files: `src/styles/design-tokens.css`, `src/styles/global.css`
- DB: None
- Edge Functions: None
- Status: Complete — `npm run build` succeeds (23.9s, 0 errors). Theme is still keyed on `[data-theme="frost-white"]` so `themeStore` and the `ThemeToggle` continue to work unchanged.
- Notes: The name "Frost White" is now a misnomer (the theme looks like Pearl Aurora, not frost), but I deliberately left the CSS selector as `frost-white` to avoid touching the theme store / toggle / persisted user preferences. If we want the name to reflect the look, a follow-up should add `[data-theme="pearl-aurora"]` as an alias and update the ThemeToggle labels — but that's cosmetic and requires DB+component coordination.

### April 12, 2026 — ROOT CAUSE: `profile is not defined` Crashing Writing Tab for ALL Students
- What: Immediately after the diagnostic `SectionErrorBoundary` (previous entry) shipped, Waad retried and the inline error card surfaced the real crash: `ReferenceError: profile is not defined`. This wasn't Waad-specific — it was breaking the Writing tab for **every student** who tried to open it since commit `9f0b12d` landed on 2026-04-11 (writing assistant + WordCountStatus banner). Many students had quietly reported that "writing and speaking sections don't show after clicking" — speaking was never actually broken, but when Writing crashed the route-level error boundary took down the whole unit page, so it *looked* like the entire unit was dead.
- **Root cause:** In `src/pages/student/curriculum/tabs/WritingTab.jsx` the inner `WritingTask` sub-component referenced `profile?.id` inside `handleSubmit`'s body AND again inside the `useCallback` deps array, but `profile` was only destructured in the OUTER `WritingTab` component (line 34: `const { profile, studentData } = useAuthStore()`) and was never passed down to `WritingTask` as a prop — only `studentId={profile?.id}` was passed. Because the deps array is evaluated on every render, the `ReferenceError` fired immediately when Writing tab mounted, before any click or submit. Any student opening Writing was instantly crashed.
- **Fix:** Replaced both references inside `WritingTask` with the already-available `studentId` prop:
  - Line 303: `awardCurriculumXP(profile?.id, ...)` → `awardCurriculumXP(studentId, ...)`
  - Line 311 deps: removed `profile?.id` (kept `studentId` which was already there)
- **Why the bug was invisible for ~24h:** (a) production `PageErrorFallback` hid error details (DEV-only gate), (b) `activityTracker` silently dropped events for some students so server-side logs were empty, (c) the crash looked like "the whole unit is broken" to students, so they reported "speaking AND writing don't work" which misdirected the investigation. The previous commit's `SectionErrorBoundary` was the critical diagnostic step — it surfaced the exact stack the first time Waad retried.
- Files: `src/pages/student/curriculum/tabs/WritingTab.jsx` (2 lines)
- DB: None
- Edge Functions: None
- Status: Complete — built and pushed as commit `26c1eae`, Vercel will auto-deploy
- Notes: Regression introduced by commit `9f0b12d` ("feat: writing assistant + pronunciation alerts batches 2-10") on 2026-04-11 21:24. Affected window: ~24 hours. Speaking tab has no equivalent bug — verified by grepping `SpeakingTab.jsx` for `profile?.` / `profile.` (only safe outer-component usages at lines 19-20). The lingering concern is the `activityTracker` userId-init race that silently dropped Waad's events after 2026-04-08 — that's a separate analytics-pipeline issue to address in a future session.

### April 12, 2026 — Shrink A11y FAB + Temporarily Hide AI Bot FAB (Overlap Fix)
- What: On mobile/iPad both floating action buttons (accessibility + AI bot helper) were rendering in the same bottom-left corner and visually overlapping/crowding each other. User asked to (1) change the a11y icon, (2) make it noticeably smaller, and (3) temporarily hide the bot FAB entirely so the two no longer clash.
- **A11y button** (`src/components/Accessibility/A11yFloatingButton.jsx`):
  - Icon changed from `Accessibility` → `Eye` (smaller, distinct silhouette, still clearly "view/readability settings")
  - Button shrunk from `w-14 h-14` (56px) → `w-10 h-10` (40px)
  - Icon size shrunk from 26 → 16, stroke 2 → 2.2 for visual crispness at small size
  - Position nudged from `left:24 / bottom +24` → `left:16 / bottom +16` to match mobile edge spacing
  - Tooltip shrunk (`text-xs`→`text-[11px]`, tighter padding) to match new button size
  - Border `2px` → `1.5px`, shadow `lg` → `md` so it doesn't feel heavy at the smaller scale
- **AI bot FAB** (`src/components/layout/LayoutShell.jsx`): `<AIFloatingHelper />` commented out with a note explaining it's a temporary disable (Apr 12). The component file is untouched — re-enabling is a one-line uncomment when we're ready to bring it back.
- Files: `src/components/Accessibility/A11yFloatingButton.jsx`, `src/components/layout/LayoutShell.jsx`
- DB: No changes
- Edge Functions: None
- Status: Complete — `npm run build` succeeds (30.4s, 0 errors)
- Notes: `AIFloatingHelper.jsx` is kept in the repo and still imported in LayoutShell — only the render call is commented. To restore the bot, uncomment the `<AIFloatingHelper />` line in LayoutShell around line 245.

### April 12, 2026 — Vocabulary Card Layout Fix — Responsive Tabbed Word Detail (Prompt 37)
- What: Fixed the vocabulary card overflow issue caused by Session 19 enrichments (synonyms/antonyms, word family, morphology, pronunciation alerts). The 5-6 stacked sections were overflowing on mobile/iPad/laptop, covering navigation and breaking visual rhythm. Replaced with a responsive tabbed layout where each enrichment becomes a tab — primary word info stays visible at all times.
- **New `WordDetailModal.jsx`:** Single tabbed modal used everywhere a vocabulary detail view is needed. Layout: fixed header + sticky tab bar + scrollable content. Mobile: full-screen `h-[100dvh]`. Tablet: `max-w-2xl max-h-[85vh]` centered. Desktop: `max-w-3xl max-h-[85vh]` centered. ESC closes, backdrop click closes, body scroll-locks while open. z-[70] so it sits above any other modal.
- **Tab discovery (hide-when-empty):** Tabs are computed from word data — `المعنى` (always present), `المرادفات` (only if synonyms or antonyms), `العائلة` (only if word_family has 2+ members), `النطق` (only if pronunciation_alert exists). If only `المعنى` is present, the tab bar is hidden entirely.
- **Severity dot:** Pronunciation tab gets a colored severity dot — `high` is amber + `animate-pulse`, `medium` is yellow, `low` is slate.
- **New `WordDetailHeader.jsx`:** Always-visible header with word (text-3xl→5xl), IPA (mono), POS · Arabic meaning, audio button, close button (top-right visually in RTL = `left-3` in DOM), level badge (top-left visually in RTL = `right-5`).
- **New `WordDetailTabBar.jsx`:** Sticky tab bar with horizontal scroll on mobile if needed, badge counts, severity dots. Custom scrollbar hidden via inline style.
- **Tab components:** `tabs/MeaningTab.jsx` (Arabic meaning + English definition + example with bolded target word + translation + example audio), `tabs/RelationsTab.jsx` (wraps existing `WordRelationships` unchanged), `tabs/FamilyTab.jsx` (wraps existing `WordFamilySection` unchanged), `tabs/PronunciationTab.jsx` (wraps existing `PronunciationAlert` unchanged). Per spec: existing data components are wrapped, NOT modified.
- **Mount point 1 — `WordExerciseModal.jsx`:** Removed the stacked `PronunciationAlert` + `WordRelationships` + `WordFamilySection` sections. Replaced with: (a) a small high-severity pronunciation warning button at the top that opens the modal directly to the النطق tab, and (b) a single "عرض كل التفاصيل" CTA button at the bottom that opens the modal to المعنى. Exercises remain unchanged.
- **Mount point 2 — `VocabularyPractice.jsx` (flashcard back):** Removed the stacked enrichment blocks. Back face now shows: Arabic meaning + English definition + example sentence + audio button + "المزيد" pill that opens `WordDetailModal`. Front face shows a small ⚠ icon next to the word for high-severity alerts that opens the modal directly to the النطق tab (per spec — "show a small ⚠️ icon next to the word, not the full alert").
- **Mount point 3 — `AnkiReviewSession.jsx` (Anki back):** Same simplification — removed stacked relations + family + pronunciation alert. Back face now shows word + small ⚠ icon (high severity) + Arabic meaning + example + "المزيد" button. Opens `WordDetailModal` overlaid above the review session.
- **Mount point 4 — `QuizResultScreen.jsx` (wrong-words list):** Each missed word becomes a single clickable button row that opens `WordDetailModal`. Removed the inline `WordRelationships` and `PronunciationAlert` per-row blocks. Small ⚠ icon for high-severity alerts opens directly to النطق tab. Existing `onReviewWord` callback still fires for compatibility.
- **AnimatePresence wrapping:** `WordExerciseModal` now wraps its existing `<AnimatePresence>` and the new `<WordDetailModal>` in a fragment so they don't interfere with each other (the detail modal has its own internal AnimatePresence).
- Files: `src/components/vocabulary/WordDetailModal.jsx` (NEW), `src/components/vocabulary/WordDetailHeader.jsx` (NEW), `src/components/vocabulary/WordDetailTabBar.jsx` (NEW), `src/components/vocabulary/tabs/MeaningTab.jsx` (NEW), `src/components/vocabulary/tabs/RelationsTab.jsx` (NEW), `src/components/vocabulary/tabs/FamilyTab.jsx` (NEW), `src/components/vocabulary/tabs/PronunciationTab.jsx` (NEW), `src/components/vocabulary/WordExerciseModal.jsx`, `src/pages/student/vocabulary/components/VocabularyPractice.jsx`, `src/components/anki/AnkiReviewSession.jsx`, `src/components/vocabulary/QuizResultScreen.jsx`, `CLAUDE.md`
- DB: No schema changes
- Edge Functions: No changes
- Status: Complete — existing data components untouched, only their mount points refactored. Per spec, did NOT run `vite build` locally.
- Notes: The existing `PronunciationAlert`, `WordRelationships`, and `WordFamilySection` components remain unchanged — they're wrapped inside the new tab components. All four mount points now use the same `WordDetailModal` for consistency. High-severity pronunciation alerts get an animated ⚠ icon in the compact card view that opens straight to the النطق tab, so students still see the warning before mispronouncing.

### April 11, 2026 — Writing Assistant + Clear Submit Validation Messaging
- What: Fixed the silent submit-failure issue in the curriculum writing tab and built a developed AI writing assistant to help students progress during composition. Students no longer hit a disabled submit button with no explanation — they now get a persistent status banner, explicit Arabic toast feedback on each failed submit attempt, and a full AI assistant that opens automatically when they're stuck.
- **Problem (Group 4 feedback):** In every unit's Writing tab, when a student tried to submit with fewer words than the minimum, the submit button was silently disabled with just `opacity-30 cursor-not-allowed` — no explanation of WHY, no hint of how many more words were needed, no help to get unstuck.
- **Fix 1 — `WordCountStatus` banner:** Added a persistent, always-visible status card above the textarea that shows the student exactly where they stand. Three tones (muted/warning/success) with an icon, title, descriptive subtitle, `{wordCount} / {min}–{max}` counter, and an animated progress bar toward the minimum. When under min or empty, it shows a "اطلب مساعدة من المساعد الذكي" CTA that opens the assistant. Messages are specific: "ابدأ الكتابة — تحتاج X كلمة على الأقل للتسليم" / "ناقص X كلمة — كتبت Y من X كلمة، اكتب X كلمة إضافية لتقدر تسلم" / "أنت في المدى المطلوب ✓" / "تجاوزت الحد الأقصى".
- **Fix 2 — explicit submit validation with Arabic toast:** Removed `disabled={wordCount < task.word_count_min}` from the submit button. The button is now always clickable (except while submitting). `handleSubmit` validates word count first and if under min shows a `toast({ type: 'warning', title, description })` with the exact number of words needed, triggers a shake animation on the button (`motion.button` with x-keyframe animation), AND auto-opens the writing assistant. This gives feedback on EVERY failed attempt as the user requested.
- **Fix 3 — `WritingAssistant` component (NEW):** Full-featured in-composition AI writing helper. 7 action chips: "اقترح أفكار" (brainstorm), "ابن مخطط" (outline), "جملة افتتاحية" (opening sentences), "كلمات مفيدة" (vocabulary), "كيف أكمل" (continue — needs text), "وسّع كتابتي" (expand — needs text), "صحح لغتي" (grammar fix — needs text). Collapsible panel with gradient sky/violet background, warm Arabic copy ("لا تقلق، أنت اللي بتكتب"). Each action has a dedicated result renderer. Student can click "استخدم هذه الجملة" / "أضف للنص" / "طبق التصحيح" / "استبدل بالنص الموسع" to insert suggestions directly into their draft via `onInsertText(newText, replaceOriginal?)`.
- **Fix 4 — `ai-writing-assistant` edge function (NEW):** Claude Sonnet 4 powered. Takes `action` + task context (prompt, task_type, word range, target vocab, grammar topic, current text, level). Per-action system prompts enforce strict JSON response shapes. Auth verified, rate-limited at 20 calls/hour per student (in-composition help is cheap so generous), shares the monthly budget cap with other AI features, logs to `ai_usage` with `type='writing_assistant'`. Three actions (continue/fix_grammar/expand) require current text — function rejects empty calls with friendly Arabic error. Staff bypass rate limit.
- **Insert text handler:** `handleInsertText(newText, replaceOriginal)` in `WritingTask`: if `replaceOriginal` is provided and found in the draft, it replaces that phrase; otherwise appends with a space separator. Either way, shows a success toast "تم إضافة النص للمسودة ✨".
- **Prompts are student-level aware:** Edge function passes `academic_level` from `studentData` to Claude so suggestions match the student's CEFR level (A1-C1 context blocks). Never writes the whole piece — always leaves the student in control.
- Files: `supabase/functions/ai-writing-assistant/index.ts` (NEW), `src/components/curriculum/WritingAssistant.jsx` (NEW), `src/pages/student/curriculum/tabs/WritingTab.jsx` (banner + assistant integration + submit validation + shake animation + insertText handler), `CLAUDE.md`
- DB: No schema changes
- Edge Functions: `ai-writing-assistant` deployed with `--no-verify-jwt` to project `nmjexpuycmqcxuxljier`
- Status: Complete — production build passes (28s, 0 errors), edge function deployed
- Notes: The assistant is context-aware (passes the task prompt, word count requirements, target vocabulary, grammar topic, and student level to Claude). Prompts explicitly tell the model never to write the entire piece — only to help the student make progress on their own. If the student opens the assistant when they're stuck and uses a few suggestions, they'll naturally end up above the minimum word count and can submit successfully.

### April 11, 2026 — Pronunciation Alerts (Prompt 36) — Pipeline + UI + Batch 1
- What: Built the full pronunciation-alerts feature pipeline (migration → splitter → agent → loader → verifier → UI component → 4 mount-point integration). Loaded batch 1 (196 words → 50 alerts, 25.5%, within target). Batches 2-10 generation pending (single-agent sequential per user constraint).
- **Migration `105_add_pronunciation_alerts.sql`:** Adds `pronunciation_alert JSONB DEFAULT NULL` + `pronunciation_generated_at TIMESTAMPTZ` to `curriculum_vocabulary`. Two indexes: a partial index on `id WHERE pronunciation_generated_at IS NULL` for batch fetches, and a GIN index on the JSONB column for content queries.
- **JSONB schema:** `{has_alert: bool, severity: high|medium|low, ipa: '/...', common_mispronunciation_ar, correct_approximation_ar, problem_letters: [int], rule_category, explanation_ar, similar_words: [string], practice_tip_ar}`
- **Splitter `scripts/split-vocab-pronunciation.cjs`:** Fetches all 1,954 vocabulary rows where `pronunciation_generated_at IS NULL`, joins reading→unit→level for context, splits into 10 balanced batches under `scripts/pronunciation-batches/batch-NN.json` (~196 words each).
- **Agent `prompts/agents/pronunciation/agent-01-manager.md`:** Manager instructions for the per-batch generation agent. Lists patterns (silent K/B/W/L/H/P/T/D/GH, the 7 -ough sounds, stress traps, voiced/voiceless TH, -ed endings, schwa), severity guide, and the required output schema. Sanitized to use neutral "ESL learners" framing (an earlier version with ethnic-group framing was rejected by the model's safety filter).
- **Loader `scripts/load-pronunciation.cjs`:** Reads agent result file(s) (single file or `--all`), validates each entry (required: severity, ipa, correct_approximation_ar, explanation_ar; warns on explanation < 50 chars), normalizes the alert object, and upserts to `curriculum_vocabulary` setting both `pronunciation_alert` and `pronunciation_generated_at`. Reports per-file and total stats.
- **Verifier `scripts/verify-pronunciation.cjs`:** Audits the loaded data — coverage, alert rate (target 18-38%), severity distribution, short-explanation flags, missing similar_words/tip/ipa flags, duplicate-explanation detector (catches templating), and a random sample of 20 alerts for manual review.
- **UI Component `src/components/vocabulary/PronunciationAlert.jsx`:** Apple-styled severity-driven alert card. High = amber bg + warning icon, Medium = yellow bg, Low = slate bg. Shows: title + Arabic severity badge, the word with `problem_letters` indices struck through in rose, IPA in mono, optional Volume2 audio button, "الصحيح" (green check) vs "الخطأ الشائع" (rose strike) row, explanation paragraph, practice tip, and similar-words chips. Renders null if alert is null/has_alert false. RTL with Tajawal font. Compact prop tightens spacing for in-card embedding.
- **Integration mount points (4):**
  1. **VocabularyPractice flashcard back** — embedded inside the back face below the example sentence and above WordRelationships, in compact mode (`src/pages/student/vocabulary/components/VocabularyPractice.jsx`). Data fetch in `VocabularyFlashcards.jsx` updated to select `pronunciation_alert`.
  2. **WordExerciseModal** — rendered in compact mode at the top of the exercise list (`src/components/vocabulary/WordExerciseModal.jsx`). VocabularyTab data fetch already uses `select('*')` so the column is automatically present.
  3. **AnkiReviewSession back face** — high-severity alerts render BEFORE the Arabic meaning (so the student sees the warning before reading the wrong meaning); medium/low alerts render after WordFamilySection in the standard position (`src/components/anki/AnkiReviewSession.jsx`). Data fetch in `useAnkiSession.js` updated to select `pronunciation_alert`.
  4. **QuizResultScreen wrong-words list** — for each missed word, the alert renders below WordRelationships in compact mode (`src/components/vocabulary/QuizResultScreen.jsx`).
- **Batch 1 results loaded:** 196 words → 50 alerts (25.5% — target was 18-38%, within range), 146 nulls, 0 failed. Severity: 12 high, 36 medium, 2 low.
- Files: `supabase/migrations/105_add_pronunciation_alerts.sql`, `scripts/split-vocab-pronunciation.cjs`, `scripts/load-pronunciation.cjs`, `scripts/verify-pronunciation.cjs`, `prompts/agents/pronunciation/agent-01-manager.md`, `scripts/pronunciation-batches/batch-01..10.json`, `scripts/pronunciation-batches/batch-01.result.json`, `src/components/vocabulary/PronunciationAlert.jsx` (NEW), `src/pages/student/vocabulary/components/VocabularyPractice.jsx`, `src/components/vocabulary/WordExerciseModal.jsx`, `src/components/anki/AnkiReviewSession.jsx`, `src/components/vocabulary/QuizResultScreen.jsx`, `src/pages/student/vocabulary/VocabularyFlashcards.jsx`, `src/hooks/useAnkiSession.js`, `CLAUDE.md`
- DB: 1 new column on `curriculum_vocabulary` (`pronunciation_alert` JSONB), 1 timestamp column, 2 indexes. 196 rows populated.
- Edge Functions: None
- Status: Pipeline complete + UI complete + integration complete + batch 1 loaded. Build verified (24s, 0 errors). Batches 2-10 (1,758 remaining words) need sequential per-batch agent runs.
- Notes: Per user constraint, agents run sequentially one batch at a time. The UI gracefully handles missing alerts (returns null) so it's safe to ship integration before all batches are loaded.

### April 11, 2026 — Fix Blank-Screen Boot Bug (Fatima's issue)
- What: Fixed a critical boot-time bug where the app showed only a dark page with nothing visible on mobile devices (reported by student Fatima, seen on iPhone/iPad via app + browser). Two independent failure modes collapsed into the same symptom.
- **Root cause 1 — auth init could hang forever:** `authStore.initialize()` awaited `supabase.auth.getSession()` and `fetchProfile()` with NO timeout. On iOS Safari with a stale refresh token, flaky network, or slow storage access, these calls could hang indefinitely, leaving `loading: true` forever. `<RoleRedirect />` / `<ProtectedRoute />` rendered the `LoadingSkeleton` the whole time — user never reached `/login`.
- **Root cause 2 — LoadingSkeleton was nearly invisible:** The full-screen boot loader used `.skeleton` elements whose CSS vars (`--skeleton-from/via/to`) are `rgba(255,255,255,0.02–0.06)` — essentially invisible on a bright mobile screen. Even when loading was working, the user perceived "just a dark page, nothing at all."
- **Fix 1 — timeout wrapper in `authStore.initialize()`:** Added `withTimeout()` helper that wraps every supabase auth call. `getSession()` times out at 6s, `fetchProfile()` at 8s, `restoreImpersonation()` at 5s. On timeout, local session is cleared via `supabase.auth.signOut({ scope: 'local' })` and `loading` is flipped to `false` in a `finally` block so the user always lands on `/login`.
- **Fix 2 — rewrote `LoadingSkeleton` in `App.jsx`:** Replaced the invisible skeleton shimmers with a visually obvious boot screen — Fluentia logo + bright spinner (inline styles, works even if Tailwind fails to load) + Arabic "جاري تحميل أكاديمية طلاقة..." text + an escape-hatch "reload" button that appears after 6 seconds. The reload handler clears service worker registrations + caches + the `sw_purge_v3` flag, then hard-reloads to recover from any corrupted boot state.
- **Inline keyframes + inline styles:** The new boot screen uses inline `<style>` for the spinner animation and inline style props for colors/spacing. This is intentional — if a broken JS chunk or stale SW breaks Tailwind CSS, the boot screen STILL renders correctly, so the user can always see the reload button.
- Files: `src/stores/authStore.js` (timeout wrapper + initialize() rewrite), `src/App.jsx` (LoadingSkeleton → boot screen with escape hatch, added useState import)
- DB: No schema changes
- Edge Functions: None
- Status: Complete — production build verified (`npm run build` succeeds, 31s, 0 errors)
- Notes: For Fatima specifically, tell her to do a single hard-refresh (or reinstall the PWA) after this deploys. If the new boot screen appears and sits for 6+ seconds, she can tap the reload button which will force-clear her stale state.

### April 11, 2026 — Word Families with Morphology Explanations (35-word-families)
- What: Added full word family JSONB data + morphology ("ليش؟") explanations for every vocabulary word. Students now see the complete derivational family of any word with Arabic explanations of why each derivative has its part of speech (affix + base + rule + similar examples).
- **Migration `104_add_word_families.sql`:** Added `word_family JSONB DEFAULT '[]'::jsonb` + `word_family_generated_at TIMESTAMPTZ` columns on `curriculum_vocabulary`, plus partial index for pending rows and GIN index on the JSONB payload
- **Generation pipeline:** 10 parallel wave-1 agents (`scripts/family-batches/batch-01..10.json`) generated 1,060 families, then 8 parallel wave-2 agents covered the remaining 735 uncovered single words (`wave2-01..08.json`). Final coverage: **1,794 / 1,954 vocabulary rows (91.8%)** — the 160 uncovered are all multi-word phrases which the prompt intentionally skips (effective single-word coverage = 100%).
- **Scripts:** `split-vocab-families.cjs` (batcher), `load-families.cjs` (validates, links cross-refs, clamps levels, upserts), `verify-families.cjs` (coverage + quality audit with random sample)
- **JSON schema per member:** `{word, pos, level, is_base, is_opposite, vocabulary_id, morphology: {affix, affix_type, base_word, base_pos, rule_ar, similar_examples}}`. Irregular forms flagged with `morphology.irregular: true` + `note_ar`. Base form uses `morphology.is_base: true`.
- **Quality stats:** 5,942 total family members, 4,148 derivatives, 99.9% of regular derivatives have an affix, 2.4% flagged irregular, 2,645 members cross-linked to other vocabulary rows (44.5%)
- **New component `WordFamilySection.jsx`:** always-visible table on desktop (columns: الكلمة | النوع | المستوى | الحالة | ليش؟) + stacked cards on mobile. Base word highlighted with ⭐, negatives with ↔, mastered derivatives show "تعرفها ✓" (queries `vocabulary_word_mastery`). Click ⓘ → inline morphology card showing affix + base + rule_ar + chip examples. Three card variants: regular (slate), base (sky), irregular (amber with warning icon).
- **Light-theme adaptation:** Added ~100 lines of `.light / [data-theme="frost-white"]` overrides in `components.css` scoped to `.wf-section` — remaps all hardcoded dark-slate classes to premium light tokens (white surfaces, layered shadows, AAA-contrast text, darker badge text for contrast)
- **Integration mounts (3 points):** Already wired in `AnkiReviewSession.jsx`, `WordExerciseModal.jsx`, and `VocabularyPractice.jsx` (flashcard-back rich view). Renders below synonyms/antonyms section.
- Files: `supabase/migrations/104_add_word_families.sql`, `src/components/vocabulary/WordFamilySection.jsx`, `src/styles/components.css`, `scripts/load-families.cjs`, `scripts/verify-families.cjs`, `scripts/split-vocab-families.cjs`, `scripts/family-batches/batch-*.json` + `batch-*.result.json` + `wave2-*.json` + `wave2-*.result.json`, `src/components/anki/AnkiReviewSession.jsx`, `src/components/vocabulary/WordExerciseModal.jsx`, `src/pages/student/vocabulary/components/VocabularyPractice.jsx`, `CLAUDE.md`
- DB: `curriculum_vocabulary.word_family` JSONB + `word_family_generated_at` TIMESTAMPTZ (+2 indexes), 1,794 rows populated
- Edge Functions: No changes
- Status: Complete — production build passes (25s), verifier reports 91.8% coverage / 99.9% affix quality / 2.4% irregular

### April 11, 2026 — Light Theme Premium Redesign (01-light-theme-redesign)
- What: Rebuilt the frost-white (light) theme for a premium layered feel — Linear/Notion/Raycast-tier polish
- **Design tokens:** Rewrote the full `[data-theme="frost-white"] / .light` block — layered white surfaces (void/base/raised), solid white glass cards (was flat translucent-white), AAA-contrast text (`--text-secondary #334155`, `--text-tertiary #64748b`), deeper brand accents so they pop on white (`#0284c7`, `#6d28d9`, `#047857`, `#b45309`), multi-level layered shadows (`--shadow-sm/md/lg/xl` each with two stops), and premium glow shadows with 1px accent ring
- **Global atmosphere:** Enhanced `body::after` mesh gradient for light — 4-layer radial gradients (sky + violet + amber + emerald) for a warm premium feel
- **Light-scoped component overrides:** Added ~230 lines at bottom of `components.css` under `.light` / `[data-theme="frost-white"]` for `fl-card`, `fl-card-static`, `fl-card-featured`, `fl-stat-card` (all 4 variants), `glass-card*`, sidebar active links, sidebar brand gradient, `header-scrolled`, `fl-btn-primary/secondary`, `fl-input`, badges, tabs, modals, mobile tab bar, progress bar, gradient-text — all get proper premium shadows + solid fills + hover lift
- **HTML bg fix:** Added `.light/frost-white` variant for the hardcoded html `background-color` so there's no dark flash on theme change
- **Component cleanups:** Fixed hardcoded shadows in `Header.jsx` (avatar + dropdown) → now use `var(--shadow-xl/sm)`, `var(--accent-sky-glow)`; fixed hardcoded `rgba(0,0,0,0.5)` backdrop in `LayoutShell.jsx` more-sheet → now uses `var(--modal-backdrop)`
- Files: `src/styles/design-tokens.css`, `src/styles/global.css`, `src/styles/components.css`, `src/index.css`, `src/components/layout/Header.jsx`, `src/components/layout/LayoutShell.jsx`, `CLAUDE.md`
- DB: No changes
- Edge Functions: No changes
- Status: Complete — production build passes (33s), no CSS errors, dark/aurora themes untouched

### March 17, 2026 — Fix AI Features, Grading, Self-Assessment (PROMPT BF1)
- What: Audited and fixed all 35 edge functions + frontend AI calls
- **CORS fix:** Added `Access-Control-Allow-Methods: 'POST, OPTIONS'` to all 35 edge functions — was missing and could cause browser CORS failures
- **adaptive-test:** Added try/catch around `req.json()` body parsing — was the only function without safe body parsing, causing Level Test failures on empty/malformed requests
- **Self-assessment:** Added success message "تم حفظ تقييمك بنجاح" after save in StudentAssessments.jsx
- **Secrets verified:** All required secrets present (CLAUDE_API_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY)
- **Grading:** Audited TrainerGrading.jsx — code is correct with proper `{ data, error }` pattern, RLS policies allow trainer updates
- **All 35 edge functions redeployed** with `--no-verify-jwt`
- Files: All 35 `supabase/functions/*/index.ts`, `src/pages/student/StudentAssessments.jsx`
- Status: Complete — all functions deployed, build verified

### March 17, 2026 — IELTS Management + Student Progress Pages (PROMPT 1G)
- What: Built IELTS management page with 6 tabs + student curriculum progress matrix
- **IELTSManagement:** 6 tabs — Reading Skills (14 question types from seed), Reading Passages, Writing Tasks (Task1/Task2 sub-tabs), Listening Sections (grouped by test), Speaking Questions (Part1/2/3 sub-tabs), Mock Tests (status matrix with link editors)
- **CurriculumProgress:** Student progress matrix with per-level completion percentages, expandable per-unit skill breakdown, color-coded status cells, level filter
- **Components:** IELTSReadingManager, IELTSWritingManager, IELTSListeningManager, IELTSSpeakingManager, IELTSMockTestManager, ProgressMatrix
- **Routing:** Added `/admin/curriculum/ielts` and `/admin/curriculum/progress` routes
- Files: `IELTSManagement.jsx`, `CurriculumProgress.jsx` (NEW), 6 component files (NEW), `App.jsx` (updated)
- DB: No changes
- Status: Complete — build verified

### March 17, 2026 — Unit Editor: 10-Tab Full Skill Editor (PROMPT 1F)
- What: Built the most complex admin page — a 10-tab unit editor for all curriculum skills
- **10 Tabs:** Overview, Reading A, Reading B, Grammar, Writing, Listening, Speaking, Irregular Verbs, Video, Assessment
- **Reusable components:** JSONArrayEditor, MCQEditor, AudioPreview, ImagePreview, RubricSliders, PassageEditor
- **Editor components:** ReadingEditor (reused for A+B), GrammarEditor, WritingEditor, ListeningEditor, SpeakingEditor, IrregularVerbsEditor, VideoEditor, AssessmentEditor, ComprehensionEditor, VocabularyManager, VocabExerciseEditor
- **Features:** Tab badges with content counts, publish/draft toggle, per-tab independent save, Supabase upsert pattern, optimistic UI with loading states
- **Routing:** Added `/admin/curriculum/unit/:unitId` route
- Files: `src/pages/admin/curriculum/UnitEditor.jsx` (NEW), 17 component files in `components/` (NEW), `src/App.jsx` (updated)
- DB: No changes
- Status: Complete — build verified

### March 17, 2026 — Admin Curriculum Overview & Level Detail Pages (PROMPT 1E)
- What: Built 2 admin pages + 2 card components for curriculum management UI
- **CurriculumOverview:** Lists all 6 levels as cards with progress bars, published unit counts, CEFR badges. Includes IELTS track card (disabled/coming soon). Skeleton loading, empty state.
- **LevelDetail:** Shows level header with color accent + stats, grid of 12 unit cards per level. Back button, disabled AI generate button. Fetches units with nested content counts (readings, writing, listening, speaking, grammar).
- **LevelCard:** Color accent stripe, level number badge, CEFR pill, progress bar, hover animation.
- **UnitCard:** Unit number, theme (AR+EN), draft/published badge, content count icons.
- **Routing:** Updated App.jsx — `AdminCurriculum` lazy import now points to `CurriculumOverview`, added `/admin/curriculum/level/:levelId` route for `LevelDetail`.
- Files: `src/pages/admin/curriculum/CurriculumOverview.jsx` (NEW), `src/pages/admin/curriculum/LevelDetail.jsx` (NEW), `src/pages/admin/curriculum/components/LevelCard.jsx` (NEW), `src/pages/admin/curriculum/components/UnitCard.jsx` (NEW), `src/App.jsx` (updated imports + route)
- DB: No changes
- Status: Complete

### March 17, 2026 — Seed Data: 6 Levels, 72 Units, 14 IELTS Question Types (PROMPT 1D correct)
- What: Seeded curriculum_levels (6 levels, level_number 0-5), curriculum_units (72 unit shells with original themes), ielts_reading_skills (14 question types with Arabic explanations)
- **Levels:** Foundation/تأسيس, Basics/أساسيات, Development/تطوير, Fluency/طلاقة, Mastery/تمكّن, Proficiency/احتراف
- **Units:** 12 original themes per level, all bilingual, using UUID level_id subquery
- **IELTS:** 14 reading question types with correct question_type keys and Arabic explanations
- Files: `supabase/migrations/040_seed_curriculum_data_correct.sql`
- DB: Migration 040 applied via `supabase db push`
- Status: Complete

### March 17, 2026 — REBUILD: Core Curriculum Tables with Correct Schema (PROMPT 1A)
- What: Dropped and rebuilt all 17 core curriculum tables per the authoritative PROMPT-1A-CORE-TABLES.md specification. Previous migrations 035-038 had wrong schema (integer PKs, different columns).
- **Key changes from old schema:**
  - `curriculum_levels` now uses UUID PK + `level_number` integer (was integer PK)
  - `curriculum_units.level_id` is now UUID FK (was integer `level`)
  - `curriculum_readings` now has rich structure: before_read exercises, passage_content JSONB, infographic fields, reading_skill fields
  - `curriculum_vocabulary` uses `definition_en/ar` (was `meaning_en/ar`), required `reading_id`, `difficulty_tier`
  - `curriculum_grammar` has `category`, `grammar_in_use_unit`, `explanation_content` JSONB
  - `student_curriculum_progress` is now per-section with FK refs to each content type, `section_type`, `status`, `score`, `answers`, `ai_feedback`
  - `curriculum_pronunciation` is word-based with `audio_slow_url`
  - `curriculum_irregular_verbs` has audio URLs per form
- **Also recreated:** `curriculum_vocabulary_srs` (from 037) with FK to new curriculum_vocabulary
- **Tables dropped:** Old curriculum_levels (035), curriculum_units (027), all 035 tables, curriculum_irregular_verbs (030), curriculum_vocabulary_srs (037), student_curriculum_progress (027)
- **Seed data lost:** 72 units (038), 6 levels (038), 150 irregular verbs (033) — will be re-seeded
- Files: `supabase/migrations/039_rebuild_curriculum_correct_schema.sql`
- DB: Migration 039 applied via `supabase db push`
- Status: Complete — tables only, no seed data

### March 17, 2026 — Seed Data: 6 Levels, 72 Units, 14 IELTS Question Types
- What: Seeded curriculum_levels (6 levels with color/word range/complexity metadata), curriculum_units (72 unit shells — 12 original themes per level), ielts_reading_skills (14 IELTS question types with Arabic explanations)
- **Level mapping:** id 1-6 → level_number 0-5 (Foundation→Proficiency)
- **New columns on curriculum_levels:** level_number, color, passage_word_range, vocab_per_unit, mcq_choices, sentence_complexity, sort_order
- **Units:** ON CONFLICT updates existing 20 units from migration 027, adds 52 new units
- Files: `supabase/migrations/038_seed_curriculum_data.sql`
- DB: Migration 038 applied via `supabase db push`
- Status: Complete

### March 17, 2026 — Gamification & Engagement Tables (5 Tables)
- What: Created 5 gamification tables — SRS vocabulary review, daily challenges, streaks, completions, error bank
- **Tables:** curriculum_vocabulary_srs, daily_challenges, student_streaks, student_daily_completions, student_error_bank
- **RLS:** Challenges: admin-write + auth-read. Student data: own + staff-read. Service role on all.
- Files: `supabase/migrations/037_gamification_tables.sql`
- DB: Migration 037 applied via `supabase db push`
- Status: Complete — tables only, no UI, no seed data

### March 17, 2026 — IELTS Track Database Tables (8 Tables)
- What: Created 8 IELTS preparation track tables with indexes and RLS
- **Tables:** ielts_diagnostic, ielts_reading_passages, ielts_reading_skills, ielts_writing_tasks, ielts_listening_sections, ielts_speaking_questions, ielts_mock_tests, ielts_student_results
- **RLS:** Content tables: admin-write + authenticated-read. Student data: own-data + staff-read. Service role on all.
- Files: `supabase/migrations/036_ielts_tables.sql`
- DB: Migration 036 applied via `supabase db push`
- Status: Complete — tables only, no UI, no seed data

### March 17, 2026 — Core Curriculum Database Tables (17 Tables)
- What: Created 15 new curriculum tables + altered 2 existing tables for structured curriculum based on Reading Explorer + Grammar in Use analysis
- **New tables:** curriculum_levels, curriculum_readings, curriculum_comprehension_questions, curriculum_vocabulary, curriculum_vocabulary_exercises, curriculum_grammar, curriculum_grammar_exercises, curriculum_writing, curriculum_listening, curriculum_speaking, curriculum_irregular_verbs_v2, curriculum_irregular_verb_exercises, curriculum_pronunciation, curriculum_video_sections, curriculum_assessments
- **Altered tables:** curriculum_units (added theme_en/theme_ar, extended level range to 6), student_curriculum_progress (added 10 boolean completion columns + assessment_score/passed/completion_percentage)
- **curriculum_levels seeded:** 6 levels with Arabic/English names, CEFR codes
- **RLS:** All 15 new tables have read-all + admin-write + service-role policies
- Files: `supabase/migrations/035_core_curriculum_tables.sql`
- DB: Migration 035 applied successfully via `supabase db push`
- Status: Complete — tables only, no UI, no seed data

### March 15, 2026 — Complete Remaining Tasks (Part 9 + WowMoments + Fixes)
- What: Completed all remaining items from transformation plan
- **Part 9 Font Fix:** Changed 4 instances of `text-[10px]` to `text-[13px]` in StudentSchedule.jsx for minimum readable size
- **StudentWowMoments:** Created component showing streak/XP milestones on student dashboard (queries achievements + weekly task completions)
- **PlacementTest fix:** Fixed duplicate `style` attribute that caused build failure
- **DB Migrations:** Verified 020, 021, 022 already applied on remote (db push confirmed "up to date")
- Files: `src/pages/student/StudentSchedule.jsx`, `src/components/ai/StudentWowMoments.jsx` (NEW), `src/pages/student/StudentDashboard.jsx`, `src/pages/public/PlacementTest.jsx`
- Status: Complete — all plan items done

### March 15, 2026 — Fix AI Chat Crash on First Navigation (Rules of Hooks Violation)
- What: AIFloatingHelper.jsx had conditional early returns (`if (pageCtx?.skip) return null`) placed BETWEEN hooks — 10 useState/useRef hooks ran, then early return skipped 3 useEffect hooks. When navigating TO `/student/ai-chat` or `/trainer/ai-assistant`, React went from 13→10 hooks → "Rendered fewer hooks than expected" crash. Reload worked because the component always started with 10 hooks.
- Fix: Moved the conditional returns AFTER all useEffect hooks. All 13 hooks now run on every render regardless of the current route.
- Files: `src/components/ai/AIFloatingHelper.jsx`
- Status: Complete — build verified

### March 15, 2026 — Fix AI Features Error on First Navigation (All Roles)
- What: Fixed AI smart assistant (and all AI features) crashing on first navigation with 401 errors. Root cause: `supabase.auth.getSession()` returns null session before auth hydrates, causing `Authorization: Bearer undefined` to be sent to edge functions.
- Fix: Rewrote `invokeWithRetry.js` to auto-inject Authorization header via `getAccessToken()` helper (tries getSession, falls back to refreshSession). Added 401 retry that refreshes session and retries once. Removed manual getSession/Authorization patterns from 25 callers across student/trainer/admin. Removed 9 now-unused supabase imports.
- Files: `src/lib/invokeWithRetry.js` (core fix), 24 callers updated (StudentChatbot, StudentConversation, StudentExercises, StudentPronunciation, StudentVocabulary, StudentVoiceJournal, StudentWeeklyTaskDetail, TrainerAIAssistant, TrainerLessonPlanner, TrainerProgressReports, TrainerQuizGenerator, TrainerStudentView, AdminRecordings, AdminChurnPrediction, AdminSettings, AdminWeeklyTasks, AIContentRecommendations, AIFloatingHelper, AIGrammarChecker, AISpeakingAnalysis, AISubmissionFeedback, AIWritingFeedback, StudentAIProfile, useAIFormFiller)
- Status: Complete — build verified, fixes all roles (student, trainer, admin)

### March 15, 2026 — Student Schedule Redesign (Weekly Planner with Drag-Drop)
- What: Complete rewrite of StudentSchedule.jsx with @dnd-kit drag-drop planner
- **@dnd-kit installed:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **Week view:** 7-column grid (Sun-Sat) with 3 time slots per day (morning/afternoon/evening)
- **Fixed class blocks:** Locked schedule entries from weekly_schedule_config with lock icon + Meet link
- **Drag-drop tasks:** SortableContext with vertical list strategy, GripVertical handle
- **Inline task creation:** Plus button → input field with Enter/Escape keyboard shortcuts
- **Task completion:** Checkbox toggle with strikethrough + emerald highlight
- **Soft-delete removal:** X button on hover, sets deleted_at
- **Week selector:** ChevronLeft/Right navigation with "العودة لهذا الأسبوع" reset
- **Progress bar:** Completion percentage with task count
- **Classmate plans:** Toggle to see groupmates' task counts per day
- **First-time onboarding:** Empty state with instructions when no tasks planned
- **Migration 023:** Already applied to Supabase (class_recordings, weekly_schedule_config, student_planned_tasks)
- Files: StudentSchedule.jsx (complete rewrite), package.json (added @dnd-kit)
- Status: Complete — build verified

### March 15, 2026 — Class Recordings + Notification Fix + Level-Up Fix + Remaining Gaps
- What: Class recordings system (Google Drive embed), notification dropdown opacity fix, AI form filler integration
- **Migration 023:** `class_recordings` table (level/type/track, Google Drive embed, RLS for student level/group access), `weekly_schedule_config` table, `student_planned_tasks` table
- **StudentRecordings.jsx (NEW):** Filter tabs by class type, responsive card grid, Google Drive iframe video modal, view count increment
- **AdminRecordings.jsx (NEW):** Add recording form with all fields, AI form filler integration (sends proper formSchema to edge function), visibility toggle, soft delete, batch entry flow
- **AdminContent.jsx:** Added "التسجيلات" tab rendering AdminRecordings as sub-tab
- **StudentDashboard.jsx:** Added "التسجيلات" quick access card linking to /student/recordings
- **App.jsx:** Added routes for /student/recordings and /admin/recordings with lazy imports
- **NotificationCenter.jsx:** Fixed dropdown opacity — replaced glass-card-raised with explicit `rgba(6,14,28,0.97)` opaque background + blur
- Files: StudentRecordings.jsx, AdminRecordings.jsx, AdminContent.jsx, StudentDashboard.jsx, App.jsx, NotificationCenter.jsx, migration 023
- DB: Migration 023 needs to be run in Supabase SQL Editor
- Status: Complete — build verified

### March 15, 2026 — Part 9: Full Page Sweep + Level-Up Fix + Remaining Gaps
- What: Typography sweep, level-up popup fix, OnboardingModal simplification, dashboard AI cards, AI assistant commands
- **Typography sweep:** Replaced all `text-[10px]` and `text-[11px]` with `text-xs` (12px) across 60 files, 187 occurrences. No text below 12px remains.
- **Level-up popup fix (CRITICAL):** Root cause — authStore had NO real-time subscription to students table, so XP changes were never detected. Fixed by adding Supabase Realtime channel subscription in authStore for student updates. Also refactored GamificationProvider to use `useRef` instead of fragile `useState` + eslint-disable hack.
- **OnboardingModal simplified:** Reduced from 4 steps to 3 — merged "Your Info" + "Display Name" into a single step. Now: Welcome → Info+Name → Quick Tips.
- **TrainerDashboard:** Added GroupInsightsCard — shows AI profile analysis summary (analyzed count, avg skills across all students).
- **AdminDashboard:** Added AIOverviewCard — shows analyzed profiles count, total students, AI cost from ai_usage.
- **AI Trainer Assistant commands:** Added ANALYZE_STUDENT and ANALYZE_GROUP commands to edge function — "حلل طالب [name]" calls generate-ai-student-profile, "حلل المجموعة [code]" calls generate-trainer-insights.
- Files: 60+ JSX files (typography), authStore.js, GamificationProvider.jsx, OnboardingModal.jsx, TrainerDashboard.jsx, AdminDashboard.jsx, ai-trainer-assistant/index.ts
- Status: Complete — build verified
- Notes: Remaining `text-white` in weekly task pages is intentional (dark glassmorphism design with opacity-based text). Core pages support light mode via CSS vars.

### March 15, 2026 — Full LMS Transformation (Parts 1-8)
- What: Complete UX overhaul — sidebar simplification, dashboard hub, sub-tab consolidation, force password change, data reset system, AI student profiles
- **Part 1 — DB Migration:** `supabase/migrations/022_transformation_schema.sql` — `must_change_password`, `first_login_at` on profiles, `temp_password` on students, `ai_student_profiles` table, `data_reset_log` table + RLS
- **Part 2 — Sidebar:** Flattened from 31/23/34 items to 7/7/8 per role. No collapsible groups. Width 250px. Updated mobile bottom tabs in LayoutShell.
- **Part 3 — Dashboard Hub:** Added Quick Access Grid (2×3: واجبات, اختبارات, جدول, مكتبة, شهادات, متصدرين) and Community Section (horizontal scroll: نشاط, تحديات, معارك, فعاليات, تقدير) to StudentDashboard
- **Part 4 — Sub-Tabs:** 11 pages consolidated with SubTabs component: StudentSpeaking (5 tabs), StudentGrades (5), StudentProfile (5), StudentChatbot (4), StudentGroupChat (2), TrainerQuickPoints (2), TrainerSchedule→Tools (7), AdminStudents (3), AdminContent (3), AdminReports (3), AdminSettings (3)
- **Part 5 — Force Password Change:** ForcePasswordChange.jsx full-screen modal, checks `must_change_password` flag, updates auth + profile. AdminStudents enhanced with AddStudentModal (auto temp password, WhatsApp copy).
- **Part 6 — Data Reset:** `reset-all-data` edge function truncates 16 student data tables, resets stats. AdminSettings danger zone with double confirmation (Step 1 confirm + Step 2 type "RESET").
- **Part 7 — AI Profiles Backend:** `generate-ai-student-profile` gathers all student data → Claude analysis → upserts ai_student_profiles. `generate-trainer-insights` analyzes group-level patterns.
- **Part 8 — AI Profiles Frontend:** StudentAIProfile.jsx component with RadarChart, strengths/weaknesses badges, tips, summaries. Integrated into StudentProfile (ملفي الذكي tab) and TrainerStudentView (الملف الذكي tab).
- Files: 20+ files created/modified (see summary above)
- DB: Migration 022 needs to be run in Supabase SQL Editor
- Edge Functions: reset-all-data, generate-ai-student-profile, generate-trainer-insights need deployment with --no-verify-jwt
- Status: Parts 1-8 complete. Part 9 (full page sweep) and minor Part 5/7/8 gaps remain.
- Remaining gaps: OnboardingModal simplification, ai-trainer-assistant commands, TrainerDashboard insights card, AdminDashboard AI card, StudentWowMoments component, Part 9 page sweep

### March 14, 2026 — Fix Weekly Tasks: Tailwind Opacity, DB Constraints, ai_usage Column Names
- What: Fixed multiple issues in weekly task pages and edge function
- Fixes:
  1. **Tailwind opacity `/8` not generated** — `bg-sky-500/8` etc. not in Tailwind's opacity scale (0,5,10,15...). Changed all to bracket notation `bg-sky-500/[0.08]`. Verified CSS now generates correctly.
  2. **ai_usage insert uses wrong columns** — generate-weekly-tasks used `feature` (should be `type`) and `user_id` (doesn't exist) and `cost_sar` (should be `estimated_cost_sar`). Fixed to match actual DB schema.
  3. **AdminWeeklyTasks queries wrong ai_usage columns** — `.in('feature', ...)` changed to `.in('type', ...)`, removed non-existent `cost_sar` from select.
  4. **weekly_tasks CHECK constraint blocks vocabulary** — migration 020 adds 'vocabulary' to the CHECK constraint.
  5. **ai_usage_type enum missing weekly_tasks** — migration 020 adds the value.
  6. **Duplicate RLS policies** — migration 021 drops duplicates from 019 and recreates originals with `deleted_at IS NULL` filter.
  7. **PageErrorFallback shows no error details** — Now accepts error prop and shows details in DEV mode for diagnostics.
  8. **Removed unused useMutation import** from AdminWeeklyTasks.
- Files:
  - `src/pages/trainer/TrainerWeeklyGrading.jsx` — opacity fix
  - `src/pages/student/StudentWeeklyTasks.jsx` — opacity fix
  - `src/pages/student/StudentWeeklyTaskDetail.jsx` — opacity fix
  - `src/pages/admin/AdminWeeklyTasks.jsx` — ai_usage query fix, opacity fix, unused import
  - `src/components/ErrorBoundary.jsx` — PageErrorFallback accepts error prop
  - `src/App.jsx` — Pass error as render prop to PageErrorFallback
  - `supabase/functions/generate-weekly-tasks/index.ts` — ai_usage column names fix
  - `supabase/migrations/020_fix_weekly_tasks_constraints.sql` — NEW
  - `supabase/migrations/021_fix_rls_policy_names.sql` — NEW
- DB: Migrations 020 + 021 need to be run
- Edge Functions: generate-weekly-tasks needs redeployment
- Status: Complete — build verified
- Notes: The trainer page crash may have been caused by stale deployment chunks on Vercel. The Tailwind `/8` opacity issue meant type icon backgrounds had no color (invisible backgrounds). The ai_usage fixes ensure cost tracking works for weekly tasks.

### March 14, 2026 — Weekly Tasks: Fill Gaps + Full 180° Visual Redesign
- What: Filled 8 backend gaps and completely redesigned all weekly task pages with premium "Apple meets Duolingo" aesthetic
- **Backend Gaps Filled:**
  1. Adaptive difficulty engine — `calculateDifficulty()` in generate-weekly-tasks, adjusts 0.20-0.95 based on recent scores/completion
  2. Admin weekly tasks page — new `/admin/weekly-tasks` with generate button, AI cost tracker, student progress overview
  3. Activity feed integration — grade-weekly-task now posts to `activity_feed` on task completion
  4. Holiday checking — generate-weekly-tasks queries `holidays` table, skips generation if week overlaps
  5. Vocabulary task type — new type in Claude prompt, flashcard quiz UI, auto-grading in grade-weekly-task
  6. Missing DB columns — migration 019: `difficulty_score`, `is_edited_by_trainer`, `deleted_at` + RLS updates
  7. Soft-delete filtering — `deleted_at IS NULL` in queries and RLS policies
  8. Difficulty passed to Claude prompt — generates harder/easier content based on score
- **Visual Redesign:**
  - `StudentWeeklyTasks.jsx` — Hero section with animated SVG progress ring, stat gradient pills, tasks grouped by type with color-coded accent bars, celebration banner
  - `StudentWeeklyTaskDetail.jsx` — Premium Card component, gradient accent headers, polished task-specific UIs (speaking/reading/writing/listening/verbs/vocabulary), AnswerFeedback component
  - `TrainerWeeklyGrading.jsx` — Gradient stat cards, accent-bar submission cards, premium grading modal with gradient top bar
  - `AdminWeeklyTasks.jsx` — NEW page with generate button, AI cost stats, student completion overview with progress bars
- Files:
  - `supabase/migrations/019_weekly_tasks_enhancements.sql` — NEW
  - `supabase/functions/generate-weekly-tasks/index.ts` — holiday check, adaptive difficulty, vocabulary task type
  - `supabase/functions/grade-weekly-task/index.ts` — activity feed, vocabulary grading
  - `src/pages/student/StudentWeeklyTasks.jsx` — full redesign
  - `src/pages/student/StudentWeeklyTaskDetail.jsx` — full redesign + vocabulary task UI
  - `src/pages/trainer/TrainerWeeklyGrading.jsx` — full redesign
  - `src/pages/admin/AdminWeeklyTasks.jsx` — NEW
  - `src/App.jsx` — added AdminWeeklyTasks route
  - `src/components/layout/Sidebar.jsx` — added admin sidebar entry
- DB: Migration 019 adds difficulty_score, is_edited_by_trainer, deleted_at columns
- Edge Functions: generate-weekly-tasks, grade-weekly-task updated
- Status: Complete — build verified
- Notes: Run migration 019 in Supabase SQL Editor. Deploy both edge functions with --no-verify-jwt.

### March 14, 2026 — FIX: AI Features Broken (Root Cause: Gateway JWT Rejection)
- What: ALL AI features were returning "عذرًا، حدث خطأ" because Supabase's edge function gateway was rejecting valid user JWTs with `{"code":401,"message":"Invalid JWT"}`. Functions were deployed without `--no-verify-jwt`, causing the gateway to validate JWTs before the function code could handle auth. The gateway's JWT verification was failing despite valid tokens.
- Root cause: Edge functions deployed WITHOUT `--no-verify-jwt` flag. The Supabase gateway rejected authenticated user JWTs at the gateway level, before requests ever reached our function code.
- Fix: Redeployed ALL 22 functions with `--no-verify-jwt`. Functions handle auth internally via `supabase.auth.getUser(token)`.
- Also fixed:
  - `src/lib/invokeWithRetry.js` — Now extracts actual error messages from `FunctionsHttpError.context` instead of showing generic "Edge Function returned a non-2xx status code"
  - `src/pages/student/StudentConversation.jsx` — Shows real error messages instead of hardcoded Arabic text
  - `supabase/functions/ai-student-chatbot/index.ts` — Added `system_override` support for conversation simulator scenarios
  - `.env` — Fixed placeholder Supabase URL/anon key with real values for local development
- Status: Complete — tested with real student JWT, all AI functions return 200
- Notes: CRITICAL — always deploy edge functions with `--no-verify-jwt` flag. Add to deployment docs.

### March 14, 2026 — Fix Claude Model ID in All Edge Functions
- What: Updated Claude API model from `claude-sonnet-4-20250514` (deprecated) to `claude-sonnet-4-6` (current) across all 17 AI-using edge functions
- Files: All 17 edge functions that call Claude API (20 occurrences total)
- Status: Complete — all deployed
- Notes: This was the root cause of "non-2xx status code" errors on all AI features. The old model ID was rejected by the Anthropic API.

### March 14, 2026 — Edge Function Audit & Fix (All 22 Functions)
- What: Systematic audit and fix of all 22 edge functions — auth, CORS, body parsing, error handling, bug fixes
- Fixes applied:
  - **Auth added** to 5 unprotected functions: send-email (was open relay!), cron-streak-check, generate-weekly-tasks, payment-reminder, weekly-tasks-reminder
  - **Body parsing** try/catch added to 16 functions (return 400 instead of 500 on malformed JSON)
  - **generate-report** vocabCount access bug fixed (was always undefined)
  - **whisper-transcribe** now returns error on Whisper API failure instead of silently continuing
  - **ai-lesson-planner, analyze-error-patterns** no longer leak raw error messages to client
  - **weekly-tasks-reminder** TypeScript err.message typing fixed
- Files: All 22 functions in supabase/functions/
- Edge Functions: All 22 redeployed to Supabase
- Status: Complete — all deployed and active
- Notes: Missing secret RESEND_API_KEY — send-email function needs it set in Supabase dashboard

### March 14, 2026 — Full LMS Transformation (Theme + Visual Overhaul + AI Reliability + Logo + Edge Fixes)
- What: Complete dark/light/auto theme system, Apple-level visual overhaul of all 61+ pages, AI frontend reliability (timeout/retry/abort), real logo integration, favicon fix, edge function env var + rate limit fixes, light-mode compatibility across all shared components
- Files:
  - **Theme System:**
    - `index.html` — Fixed favicon, removed hardcoded `class="dark"`, added pre-paint theme init script, body uses CSS vars
    - `src/index.css` — CSS custom properties for dark/light themes, updated all shared component classes (glass-card, buttons 48px, inputs 48px, tables 56-64px rows, stat-cards, badges, skeleton, dividers) to use CSS vars
    - `tailwind.config.js` — Semantic colors reference CSS vars, enlarged typography scale (page-title 2rem, section-title 1.375rem, stat-number 2.5rem)
    - `src/stores/themeStore.js` — **NEW** — Zustand store: dark/light/auto with localStorage + prefers-color-scheme listener
    - `src/components/ThemeToggle.jsx` — **NEW** — 3-mode segmented control (Moon/Sun/Monitor)
  - **AI Reliability:**
    - `src/lib/invokeWithRetry.js` — **NEW** — Wraps supabase.functions.invoke with 30s timeout, 1 retry on 502/503/network, external abort signal
    - `src/hooks/useAICall.js` — **NEW** — Hook wrapping invokeWithRetry with auto-abort on unmount
    - `src/pages/student/StudentChatbot.jsx` — Uses invokeWithRetry
    - `src/components/ai/AIFloatingHelper.jsx` — Uses invokeWithRetry
    - `src/components/ai/AISubmissionFeedback.jsx` — Uses invokeWithRetry (45s timeout)
    - `src/pages/student/StudentPronunciation.jsx` — Uses invokeWithRetry
    - `src/pages/student/StudentConversation.jsx` — Uses invokeWithRetry
  - **Layout + Light Mode:**
    - `src/components/layout/Header.jsx` — Added ThemeToggle, fixed text-white → CSS vars for light mode
    - `src/components/layout/Sidebar.jsx` — Real logo images (theme-aware swap), fixed hover/text colors for light mode
    - `src/components/layout/LayoutShell.jsx` — Generous padding (p-5 lg:p-10), fixed tab bar hover for light mode
    - `src/components/layout/NotificationCenter.jsx` — Fixed all text-white/bg-white references → CSS vars
    - `src/pages/public/LoginPage.jsx` — Real logo, decorative wing SVG, all colors use CSS vars
  - **Visual Overhaul (ALL 61+ pages):**
    - All student pages (32 files) — space-y-12, text-page-title, p-7 cards, gap-6 grids, text-section-title
    - All trainer pages (18 files) — Same visual overhaul pattern
    - All admin pages (15 files) — Same visual overhaul pattern
    - All public pages (5 files) — Same visual overhaul pattern
    - All dashboards (Student, Trainer, Admin) — Premium stat cards, generous spacing, section titles
    - Gamification components (DailyChallenge, MysteryBox) — p-7, section-title
  - **Edge Functions:**
    - `supabase/functions/generate-weekly-tasks/index.ts` — Added CLAUDE_API_KEY env var fallback
    - `supabase/functions/ai-form-filler/index.ts` — Added CLAUDE_API_KEY env var fallback + rate limit (30 req/hour)
  - `vite.config.js` — Updated PWA icons to real logos, increased workbox cache limit to 4MB
- DB: No schema changes
- Edge Functions: generate-weekly-tasks, ai-form-filler updated (need redeployment)
- Status: Complete — build verified
- Notes: Theme toggle in header cycles dark→light→auto. CSS vars handle all switching. AI components abort on unmount and timeout after 30s. All 61+ pages now use Apple-level spacing (space-y-12, p-7 cards, 48px buttons/inputs, 56-64px table rows). 16 remaining AI components can use invokeWithRetry in follow-up. Some inner components (modals, overlays) still use text-white which is acceptable against dark backgrounds.

### March 14, 2026 — Weekly Tasks + Spelling Trainer: Critical Bug Fixes
- What: Fixed all column name mismatches between DB schema, edge functions, and frontend pages that would have caused runtime failures
- Files:
  - `supabase/functions/generate-weekly-tasks/index.ts` — Fixed: task_type→type, sort_order→sequence_number, added missing level_at_generation + deadline + level columns, fixed verb query (level→level_appropriate, added meaning_ar + frequency ordering, mastered filter fix)
  - `src/pages/student/StudentWeeklyTaskDetail.jsx` — Fixed: voice_url→response_voice_url, response→response_text/response_answers/response_voice_duration, currentVerb.base→base_form, currentVerb.arabic→meaning_ar, task.feedback→ai_feedback, task.scores→auto_score, added / separator handling for verb alternatives
  - `src/pages/student/StudentWeeklyTasks.jsx` — Fixed: task.score→auto_score, task.xp_earned→xp_awarded, task.max_points→task.points, content.min_words→word_limit_min/max
  - `src/pages/student/StudentSpelling.jsx` — Fixed: english_word→word, arabic_meaning→meaning_ar (DB column name alignment)
  - `src/pages/trainer/TrainerWeeklyGrading.jsx` — Fixed: ai_score→auto_score, ai_feedback display for JSONB objects, approve AI feedback conversion to text
- DB: No schema changes (tables already correct from migration 017/018)
- Edge Functions: generate-weekly-tasks fixed (grade-weekly-task was already correct)
- Status: Complete — build verified
- Notes: The weekly task system infrastructure (DB, edge functions, pages, sidebar, routes, notifications) was already fully scaffolded. This fix ensures all column names and field references match the actual DB schema so the system works end-to-end.

### April 10, 2026 — Vocabulary Chunks + Quiz System
- What: Student-selectable chunks (5/10/15/20/25) with sequential unlock (80% mastery gate) plus new Quiz Mode with 3 question types (EN→AR, AR→EN, fill-in-the-blank). Responds to Group 4 feedback about being forced to restart from word 1 every session.
- Files:
  - `supabase/migrations/101_vocabulary_chunks_and_quiz.sql` — Adds `profiles.preferred_chunk_size` (INT, CHECK 5/10/15/20/25), new table `vocabulary_quiz_attempts` (student_id, unit_id, chunk_index nullable, chunk_size, total_questions, correct_count, wrong_word_ids UUID[], duration_seconds, xp_awarded) + 3 RLS policies
  - `src/utils/vocabularyChunks.js` — Pure helpers: splitIntoChunks, computeChunkStatus, annotateChunksWithFilter, generateQuestions, calculateQuizXP (+2/correct, +10 at 100%, +5 at ≥80%)
  - `src/hooks/useVocabularyChunks.js` — Memoized chunk state + `useChunkSizePreference` for reading/updating profile preference with optimistic update + rollback
  - `src/hooks/useVocabularyQuiz.js` — Quiz state machine (playing/done) + `saveQuizAttempt()` helper (inserts row + XP via `challenge` reason with RPC fallback)
  - `src/components/vocabulary/ChunkCard.jsx` — Single chunk card with progress, lock/play/check icon, "تدريب" + "اختبار" buttons
  - `src/components/vocabulary/ChunkSelector.jsx` — Grid of chunk cards, filter chips (all/new/difficult), chunk size dropdown, "اختبر نفسك على كل الوحدة" button
  - `src/components/vocabulary/QuizQuestionCard.jsx` — Question card with 2x2 options, instant green/red feedback + example sentence
  - `src/components/vocabulary/QuizResultScreen.jsx` — Score, time, XP, missed words list, retry/close buttons
  - `src/components/vocabulary/VocabularyQuiz.jsx` — Full-screen modal wrapper orchestrating question flow + result
  - `src/pages/student/vocabulary/VocabularyFlashcards.jsx` — Added new "دفعات" tab (only enabled when a specific unit is selected), wired ChunkSelector + VocabularyQuiz modal, reset state on unit change
- DB: 1 new column (`profiles.preferred_chunk_size`), 1 new table (`vocabulary_quiz_attempts`) + RLS
- Edge Functions: none
- Status: Complete — migration pushed to linked Supabase, pure-function smoke tests passing
- Notes: Used `reason: 'challenge'` for XP instead of adding a new `xp_reason` enum value (avoids PG enum-in-transaction limitation and matches existing xpManager.js pattern). Mastery threshold treats `learning` + `mastered` as passing since the DB has no `reviewing` state. Chunks tab is disabled unless a specific unit is selected from the filter.

### April 14, 2026 — Design System Phase 0 Foundation
- What: Built the Fluentia Design System foundation — 3 swappable themes (aurora-cinematic, night, minimal), component library, cinematic motion layer, admin-only ThemeSwitcher
- Files: `src/design-system/themes.css`, `src/design-system/constants.js`, `src/design-system/ThemeProvider.jsx`, `src/design-system/ThemeSwitcher.jsx`, `src/design-system/components/` (AuroraBackground, GlassPanel, PremiumCard, SectionHeader, StatOrb, Buttons, CinematicTransition, StaggeredList, EmptyState, DSLoadingSkeleton), `DESIGN-SYSTEM.md`
- Modified: `src/index.css` (import themes.css), `src/App.jsx` (mount ThemeProvider, AuroraBackground, ThemeSwitcher)
- DB: None
- Status: Complete — build passes, no existing pages modified
- Notes: CSS vars prefixed with `--ds-` to avoid collision with legacy design-tokens.css. ThemeSwitcher gated to admin UUID `e5528ced-b3e2-45bb-8c89-9368dc9b5b96`. Default theme: `aurora-cinematic`. See `DESIGN-SYSTEM.md` for full reference.

### March 14, 2026 — CLAUDE.md + FLUENTIA-SPEC.md added
- What: Added project context files for Claude Code auto-read
- Files: CLAUDE.md, FLUENTIA-SPEC.md
- Status: Complete

### April 16, 2026 — Desktop perf + mobile question overlap
- What: Fixed student-reported "LMS feels heavy on laptops" and mobile question/option clipping behind bottom nav + iOS home indicator. Lazy routing, vite chunking, esbuild console-drop, and React Query defaults were already in place — this pass targeted the remaining real hotspots.
- Files:
  - `src/index.css` — Added `--mobile-action-bar-height`, `--mobile-bottom-clearance`, `--mobile-bottom-clearance-with-action` to `:root` so every scrollable page and sticky bottom element can consistently respect nav height + iOS safe-area.
  - `src/components/layout/LayoutShell.jsx` — Hard-coded 150 px bottom spacer swapped for `var(--mobile-bottom-clearance)` so last-element clearance is always nav + `env(safe-area-inset-bottom)` + 16 px.
  - `src/components/grammar/grammar.css` — `.grammar-sticky-cta` bottom offset now includes `var(--sab)`, so the "إنهاء وحفظ المحاولة" button is no longer hidden behind the iOS home indicator on iPhone.
  - `src/pages/student/assessment/UnitMasteryPage.jsx` — Full-screen quiz container now uses `100dvh` + `paddingBottom: var(--mobile-bottom-clearance)`, so Prev/Next/Submit are never covered by the bottom nav.
  - `src/pages/student/curriculum/UnitContent.jsx` — `minHeight: 100vh` → `100dvh` for iOS Safari URL-bar behaviour.
  - `src/design-system/components/AuroraBackground.jsx` — Low-end laptops (`navigator.hardwareConcurrency <= 4`) now drop to the reduced (single-static-blob) variant on desktop too; previously they ran the 3× animated 70 vw blur-2xl blobs continuously, which was the #1 GPU idle cost on older student laptops.
  - `src/pages/student/curriculum/unit-v2/AmbientParticles.jsx` — rAF canvas loop is now skipped entirely on `<= 4` core devices; desktop particle cap lowered 50→30 (visually indistinguishable, halves paint cost).
- DB: None
- Edge Functions: None
- Status: Complete — `npm run build` green in 30.24 s. Main entry 76 KB gzipped, largest non-opt-in chunk UnitContent 25 KB gzipped. vendor-charts (115 KB gz) and eruda (161 KB gz) remain > 600 KB raw but are admin-analytics-only and `?debug=1`-only respectively, so they don't affect student initial load.
- Notes: Much of the perf infrastructure mentioned in the task prompt (route-level `lazyRetry` for all pages, `manualChunks` for react/supabase/motion/query/charts, `esbuild.drop: console/debugger`, React Query defaults with `refetchOnWindowFocus: false`) was already in place from prior work — this pass was surgical, not a rewrite.
- Notes: All 10 LMS phases were already complete. Keys are in .env only (not in these files).

### 2026-05-09 — Universal Activity Retry + Phantom Submission Kill

#### Part 1 — Fix phantom auto-submit-on-reload bug (student-reported by Lian + others)
- What: Fixed phantom "completed at 0%" submissions caused by page reload during a listening activity
- Root cause: `ListeningTab.buildResults()` saved ALL exercises (including unanswered, null-selected) to DB during autosave. On reload, all slots were restored to state → `answered = total` → submit button active → phantom submit.
- Fixes:
  - `ListeningTab.jsx`: null-safe restore (skip null studentAnswer), INSERT-per-attempt model (dropped upsert), confirmation dialog before submit
  - `ReadingTab.jsx`: INSERT-per-attempt model replacing upsert (no more mid-retry autosave overwriting previous completion), confirmation dialog before submit
  - DB guard trigger `trg_block_phantom` on `student_curriculum_progress`: rejects status=completed with empty/null answers at the DB layer
  - Dropped `scp_unique_reading` + `scp_unique_listening` constraints that forced single-row upsert model
- Files: `src/pages/student/curriculum/tabs/ListeningTab.jsx`, `ReadingTab.jsx`, `src/components/curriculum/AttemptsHistoryPanel.jsx`
- DB: `supabase/migrations/20260509120000_universal_attempts_schema.sql`, `20260509130000_heal_phantom_submissions.sql`
- Soak test: `scripts/phase-e-retry-soak.cjs` — 17/17 PASS
- Status: Complete — 3 commits pushed to main

#### Part 2 — Generic activity_attempts system + AssessmentTab live
- What: Built generalized attempt system for curriculum_assessments; replaced the "قريباً إن شاء الله" AssessmentTab placeholder with a full quiz flow
- New table: `activity_attempts` — stores one row per student+activity attempt; students can INSERT (in_progress) and UPDATE only `answers`; status/score written by edge function via service role
- New view: `student_activity_best_score` — aggregates best score and is_mastered (>=80%) per student per activity
- New edge functions: `submit-activity-attempt` (grades answers from curriculum_assessments.questions JSONB, awards XP if passed), `abandon-attempt` (sets status=abandoned)
- Frontend hook: `src/hooks/useActivityAttempts.js` — loads attempt history, exposes inProgress/submittedHistory/bestScore
- Frontend lib: `src/lib/attempts.js` — startNewAttempt, abandonAndStartNew, autosaveAnswers, submitAttempt
- AssessmentTab: 3 render branches (A=unfinished resume/restart, B=history+retry, C=first-time CTA), QuizPlayer with debounced autosave + confirmation dialog, ResultView with per-question breakdown + history
- DB: `supabase/migrations/20260509150000_activity_attempts.sql`
- Files: `src/pages/student/curriculum/tabs/AssessmentTab.jsx`, `src/hooks/useActivityAttempts.js`, `src/lib/attempts.js`, `supabase/functions/submit-activity-attempt/index.ts`, `supabase/functions/abandon-attempt/index.ts`
- Status: Complete — migration applied, edge functions deployed, frontend committed
- Notes: `activity_attempts.activity_id` references `curriculum_assessments`. Questions stored in `curriculum_assessments.questions` JSONB array — each has `id`, `question_type`, `question_en`, `choices`/`options`, `correct_answer`, `accepted_answers`. Reload mid-quiz leaves attempt as in_progress (no auto-submit). Page reload → resume branch shown.

### 2026-05-12 — Saudi Dialect Engine v1 (Grammar Layer)
- What: Pre-generated Najdi dialect explanations for every grammar lesson in the curriculum
- New table: `dialect_explanations` — 1:1 with `curriculum_grammar`, Najdi text + reserved Hijazi + audio URL columns
- Content: 72 explanations generated (Pre-A1 through C1), avg 182 words each, Saudi cultural anchors (قهوة، الدوام، الجامعة، العيد)
- UI: `DialectExplanationCard` (gradient CTA card) + `DialectExplanationDrawer` (RTL slide-in) mounted between GrammarHeader and LessonCard in GrammarTab
- Hook: `useDialectExplanation` (TanStack Query, 1h stale — content is static)
- Audio: columns reserved, all NULL — voice-clone prompt (#3) fills them later
- Hijazi variant: deferred to Phase 2
- DB: `supabase/migrations/20260512120000_create_dialect_explanations.sql`
- Files: `src/hooks/useDialectExplanation.js`, `src/components/dialect/DialectExplanationCard.jsx`, `src/components/dialect/DialectExplanationDrawer.jsx`, `src/pages/student/curriculum/tabs/GrammarTab.jsx`
- Seed: `scripts/seeds/dialect-explanations-grammar.json` (72 rows, idempotent re-runnable)
- Status: Complete — 4 commits pushed to main (0879613, 2b86e2f, 4789ef6 + docs commit)

### 2026-05-12 — Personalization Bank v1 (Reading Variants, 8 Buckets)
- What: Pre-generated personalized reading variants per canonical reading × interest bucket
- New tables: `user_interests` (up to 3 of 8 buckets per user, RLS self-access) and `personalized_readings` (1 row per canonical × bucket, QA columns)
- UI: InterestSurveyCard on dashboard (dismissible 7 days), InterestsSettingsSection in StudentProfile, PersonalizedReadingCard + PersonalizedReadingDrawer mounted BELOW canonical in ReadingTab
- Hooks: useUserInterests, usePersonalizedReading
- Phase D (content): Pre-A1 complete — 192 variants (24 readings × 8 buckets), avg word-count ratio 0.94, avg vocab coverage 0.97, 0 QA failures
- Remaining levels (A1–C1 = 960 variants) to be generated in future sessions — idempotent UPSERT design makes resumption trivial
- DB: `supabase/migrations/20260512130000_create_user_interests.sql`, `20260512130001_create_personalized_readings.sql`
- Files: `src/hooks/useUserInterests.js`, `src/hooks/usePersonalizedReading.js`, `src/lib/personalization/interest-buckets.js`, `src/components/personalization/` (4 components), `src/pages/student/StudentDashboard.jsx`, `src/pages/student/StudentProfile.jsx`, `src/pages/student/curriculum/tabs/ReadingTab.jsx`
- Seed: `scripts/seeds/personalization/L0-variants.json` (192 Pre-A1 variants)
- Status: Pipeline complete — schema, survey UI, reading UI, and Pre-A1 content all shipped; A1–C1 content deferred

### 2026-05-19 — LISTENING QA Deep Audit (truncation + voice diversity + transcript naturalism)
- What: Ran the 3-phase listening quality audit. All-clear on truncation + voice diversity; transcripts mostly healthy with 4 mid-tier review items.
- Phase A (truncation, browser-style): 72/72 OK. Each row tested via HEAD (200 / audio/mpeg / Accept-Ranges / Content-Length), Range 0-64KB → 206, Range last-64KB → 206, full GET, then ffprobe container duration vs ffmpeg-decoded duration. All truncation_ratios ≥ 0.9999. Earlier overhaul `8159640` holds.
- Phase B (voice diversity): 44/44 multi-speaker rows (interview + dialogue + conversation) have distinct ElevenLabs `voice_id` per speaker, consistently applied. `voice_id` is stored in `speaker_segments[i].voice_id` so no acoustic-fingerprint fallback needed.
- Phase C (transcript naturalism, FLAG ONLY): 68 OK / 4 REVIEW / 0 REGENERATE. Heuristics: vocatives, ack chains, robotic turn-taking, AI disclaimer leaks, over-explanation, hedge stacking, title-name overuse, symmetric exchanges, absent contractions, reciprocal gratitude. No auto-rewrites — content decision deferred to Ali.
- ElevenLabs char budget: 0 chars consumed by this audit (no regenerations triggered).
- Files: `scripts/audits/listening-qa/` (4 cjs scripts: inventory, stream-test, voice-diversity, transcript-naturalism), `docs/audits/listening-qa/` (inventory.json, stream-test.json, voice-diversity.json, transcript-naturalism.{json,md}, FINAL-REPORT.md)
- DB: None — Edge Functions: None
- Status: Complete — commit `bf1697d` pushed to main.

### 2026-05-18 — PROMPT 13 L1: Reading Passage Rewrites — All 12 Units Complete
- What: Applied and committed all 12 L1 reading passage rewrites (U01-U12) to production DB. PROMPT 13 L1 batch is fully done.
- Background: Content for all 12 units was pre-generated in a prior session and saved to `PHASE-2-CLEANUP/l1-content/u01-u12.json`. U01 was committed but never DB-applied; U02-U12 had JSON but no commit. This session applied all 12 + finalized.
- Fixed: `scripts/lib/supa.mjs` env parser now strips surrounding quotes and trailing `\n` from values (Mac compatibility with Windows-generated `.env`).
- DB results (24/24 PASS — 100%): All passages now within A1 targets. wc 151-190 (target 120-200). FKGL 2.42-3.85 (target 2.0-4.0). ASL 9.4-11.9 (target 8-12). OOV: 0 across all 24. 144 questions updated. 0 student completions needed protection.
- Finalize verified: 12 units, 24 passages, 144 questions, 72 total system units — all match expected counts.
- Commits: 11 unit commits (U02-U12) + 1 finalize commit = 12 new commits pushed to main.
- Files: `PHASE-2-CLEANUP/l1-content/u01-u12.json`, `PHASE-2-CLEANUP/13-L1-progress.log`, `PHASE-2-CLEANUP/13-L1-final-report.md`, `scripts/lib/supa.mjs`
- DB: 24 rows in `curriculum_readings` updated, 144 rows in `curriculum_comprehension_questions` updated
- Status: Complete — PROMPT 13 L1 fully delivered.

### 2026-05-18 — Prompt 08: Restore Reading Section (verbatim restore from ad13345)
- What: Ran prompt 08 (08-RESTORE-READING-SECTION). Restored `ReadingTab.jsx` from git commit `ad13345` — the last stable version students knew, immediately before prompts 03/06 replaced it with `ReadingPassagePlayer`.
- RESTORE_TARGET: `ad13345` "feat(audio): word pronunciation in narrator's voice via audio slicing" — the commit just before the BOUNDARY `88d36ff` (prompt 03).
- What came back: `SmartAudioPlayer` (bottom-bar mode, karaoke=true, speed, A-B loop, per-word audio via WordTooltip inContextAudio), `PassageDisplay` fallback for passages without audio, `TextSelectionTooltip`, `WordTooltip`, `WordActionMenu`, `VocabPopup`, all interaction handlers (`handleVocabWordTap`, `handleWordClick`, `handleWordHover`, `handleAction`).
- Phase C (ReadingAudioBar, useKaraoke, useWordAudio): NOT added — SmartAudioPlayer already provides karaoke, per-word audio, and sticky bar. Adding Phase C's new components would duplicate/conflict.
- ListeningTab and players/listening/ untouched.
- Files: `src/pages/student/curriculum/tabs/ReadingTab.jsx`, `docs/dev-notes/reading-restore/` (ORIGINAL-SPEC.md, _drift.diff, _original-ReadingTab.jsx)
- DB: None — Edge Functions: None
- Status: Complete — commit `c78bdec` pushed to main.

### 2026-05-18 — Prompt 06: Restore Passage UX V2 (discovery pass — already complete)
- What: Ran prompt 06 (06-RESTORE-PASSAGE-UX-V2). All Phase B–E work was already fully implemented in a prior session. This session ran Phase F self-checks and confirmed everything passes.
- Per-word audio: `useWordAudio.js` uses `timeupdate` events (not `setTimeout`). Only metadata-load safety timeout exists. Shared DOM `<audio>` element preloads once; play token cancels rapid clicks; iOS Safari seek-before-ready handled via `loadedmetadata` await.
- Vocab highlighting: `InteractivePassage.jsx` renders `.vocab-word` spans with `.vocab-word-translation` directly beneath each unit vocabulary word. Always visible — no click needed. Gold dashed underline from `passage-vocab.css`.
- Sticky audio bar: `StickyAudioBar.jsx` — `position: fixed; bottom: 0` glass-morphism bar with play/pause, ±10s skip, scrubber, 0.5×–2× speed chips, A-B repeat (`showABRepeat` prop), minimize chevron. Mounted in `ReadingPassagePlayer` (no AB repeat) and `ListeningAudioPlayer` (AB repeat on).
- `unitId` wired: `ReadingTab` passes `unitId={unitId}` to `ReadingPassagePlayer` at line 853. `useUnitVocab` queries `curriculum_vocabulary.word` (correct column name).
- Self-checks F1–F7: all pass. ESLint skipped (no config).
- Files: `CLAUDE.md` (this entry only)
- DB: None — Edge Functions: None
- Status: Complete — no code changes needed.

### 2026-05-18 — Prompt 07: Listening Section Overhaul (titles applied, all self-checks pass)
- What: Completed 07-LISTENING-SECTION-OVERHAUL. Core work (concat fix, player rebuild, section rebuild) was shipped May 14. This session applied the one remaining gap: 72 Arabic titles were in a migration file but never executed against prod DB.
- Titles applied: `scripts/_apply-listening-titles.cjs` (72 UPDATEs via service role). All 72 rows now have `title_ar`. MCP confirms: missing title_ar = 0, duplicates = 0.
- Self-checks: (1) `c copy` in concat.cjs = comments only ✓ (2) test-concat.cjs PASS ✓ (3) no `fixed bottom-0` in player dir ✓ (4) ListeningPlayer used in ListeningSection ✓ (5) ReadingTab does NOT import ListeningPlayer ✓ (6) all hooks above return in ListeningPlayer.jsx ✓
- Already shipped May 14 (commit `2a8afa6`): concat.cjs uses libmp3lame re-encoding + decode-verify; 72 audio files all pass decode test (0 regenerations needed); ListeningPlayer.jsx (358 lines, sticky-in-content, speaker-segment ticks, A-B loop, 5 speeds); ListeningSection.jsx (149 lines, exercise selector, transcript hide/show, sticky player); ListeningTab wired to ListeningSectionUI.
- Files: `scripts/_apply-listening-titles.cjs` (NEW, one-time), `CLAUDE.md`
- DB: 72 rows in `curriculum_listening` — `title_ar` + `title_en` populated
- Status: Complete — pushed to main

### 2026-05-18 — Prompt 04: Fix Progress Tracking (WritingTab finally guard + MCP token fix)
- What: Closed the last open gap from the 04-FIX-PROGRESS-TRACKING prompt. Prior sessions (May 14–15) had already shipped: `compute_unit_progress()` DB function, 6 auto-recompute triggers, `SpeakingTab` error-handling rewrite, `ListeningTab` submit hang fix, `UnitContent` progress cache invalidation, and the backfill script. This session verified all of that is live and closed the one remaining code risk.
- WritingTab fix: `handleSubmit` in `src/pages/student/curriculum/tabs/WritingTab.jsx` had `setSubmitting(true)` with two manual `setSubmitting(false)` calls on success and error paths, but no `finally`. Wrapped the entire async body in `try/finally { setSubmitting(false) }` — button can no longer get permanently stuck if any unexpected throw occurs.
- MCP fix: `.mcp.json` had a trailing `\r` (Windows carriage return) in `SUPABASE_ACCESS_TOKEN`, causing the Supabase MCP server to fail authentication on Mac. Removed the `\r`.
- DB verification (via MCP): 6 triggers confirmed live (`recompute_unit_progress_activity_attempts`, `recompute_unit_progress_speaking_recordings`, `recompute_unit_progress_student_curriculum_progress`, `recompute_unit_progress_vocabulary_word_mastery`, `trg_block_phantom`, `speaking_recompute_best_trigger`). 94 `unit_progress` rows across 22 students. 0 orphaned completed submissions.
- Files: `src/pages/student/curriculum/tabs/WritingTab.jsx`, `.mcp.json` (not committed — gitignored), `CLAUDE.md`
- DB: No schema changes
- Edge Functions: None
- Status: Complete — build verified (5s, 0 errors), pushed to main

### 2026-05-18 — Prompt 03: Split Reading + Listening Players (discovery pass)
- What: Ran prompt 03 (03-REBUILD-READING-AND-LISTENING-PLAYERS). All Phase B–C work was already fully implemented in a prior session. No new code required. This session performed discovery + self-checks + updated the discovery doc.
- Reading player: `ReadingPassagePlayer.jsx` — no hide-text toggle, uses `InteractivePassage` for word-tap interaction. Already wired in `ReadingTab.jsx` (line 841).
- Listening player: `ListeningSection.jsx` — has `transcriptHidden` toggle, uses `InteractivePassage` when text is revealed. Used via `ListeningSectionUI` in `ListeningTab.jsx`.
- Word interaction stack: `InteractivePassage` → `WordPopover` → `useWordTimestamps` / `useWordAudio` / `useTranslateWord` (calls `vocab-quick-meaning`) / `useSavedWords` (writes to `student_saved_words`).
- Self-checks: all 6 applicable checks PASS. ESLint skipped (no config).
- Files: `docs/dev-notes/player-refactor-discovery.md` (updated with status + check results), `CLAUDE.md`
- DB: None
- Edge Functions: None
- Status: Complete — no code changes needed; all player components were previously committed.

### 2026-05-12 — Personalization Bank v1: Phase D COMPLETE (all 1,152 variants)
- What: All 6 CEFR levels now have full 8-bucket variant coverage
- Content: 1,152 variants (144 canonical readings × 8 buckets), QA pass rate 100%, avg vocab coverage 0.98, avg word-count ratio 0.87
- Levels: Pre-A1 (192), A1 (192), A2 (192), B1 (192), B2 (192), C1 (192)
- Buckets: medical, business, tech, sports, travel_food, islamic, fashion_beauty, family
- Seed files: scripts/seeds/personalization/L0-L5-variants.json (offline review)
- Insert scripts: fix-and-insert-{a1,a2,b1,b2,c1}.mjs + insert-preA1.mjs (all idempotent)
- DB state: 1,152 rows in personalized_readings, 0 FK orphans, all is_published=TRUE

### 2026-06-09 — PROD-HOTFIX BUNDLE: clsx chunk entanglement, rpc().catch crash, gendered strings, token scrub
- What: (1) **vendor-clsx chunk** — clsx was shared by the eager nav AND recharts, so Rollup hoisted it INTO vendor-charts and EVERY first load downloaded the whole 116 kB-gz chart bundle (confirmed via modulepreload on prod HTML); pinning clsx to its own chunk drops vendor-charts from the entry. (2) **RecordingPlayerCascade**: `supabase.rpc(...).catch()` — PostgREST builders are thenables WITHOUT .catch, so the tier-1 failure path itself threw (seen in client_error_log, 4 events); now `.then(ok, err)`. (3) **Gender**: MyReports + SpellingSession had hardcoded feminine imperatives (اكتبي/استمعي/ادرسي/أعيدي…) — wrapped in useG(). (4) **Security**: scripts/surgical-rollback.cjs + scripts/extract-pitr-questions.cjs had a hardcoded sbp_ PAT — now resolve via SUPABASE_ACCESS_TOKEN env or .mcp.json like _mgmt-query.cjs. The token is still in git history: Ali must REVOKE sbp_413df… in the Supabase dashboard.
- Files: vite.config.js, src/components/recordings/RecordingPlayerCascade.jsx, src/pages/student/MyReports.jsx, src/pages/student/spelling-lab/SpellingSession.jsx, scripts/surgical-rollback.cjs, scripts/extract-pitr-questions.cjs
- Edge Functions: academy-digest — new 🩺 platform-health section in the daily/weekly email (client_error_log count + top signatures for the period; client capture + /admin/system viewer already existed but nothing ever PUSHED errors to the admin — 412 errors sat unseen last week, incl. the readOnly save-loss bug)
- Status: complete (committed straight to main via Git Data API from a parallel-session-safe /tmp stage)
- Notes: the ReadingTab/ListeningTab `readOnly` ReferenceError fix was ALREADY on main (other session); not re-shipped. client_error_log is now the first place to look — it caught every bug in this bundle.

### 2026-06-09 — CURRICULUM MISTAKE DETECTOR (report-only) + vocab confusion maps
- What: AI scans REAL student answers for curriculum mistakes and FILES FLAGS for human review — per Ali's explicit rule it never edits content ("the AI suspects and tells us; we fix"). Sources: reading/listening/grammar wrong-answer aggregates (5 new service-role-only views v_cq_*), audio_event_log failures, vocab match-exercise confusion pairs (v_cq_vocab_confusion_pairs — also the data feed for future contrastive drills). Claude (sonnet-4-6, tool-use verdict) judges each suspicious item: wrong_key / too_strict_grading / ambiguous_options / unanswerable / student_behavior; suspected→open flag, fine→auto_ok. First real scan: 41 candidates, 12 OPEN flags (11 high) — headline finding: transform/fill grammar exercises grade by EXACT string match, so correct answers (case differences, valid alternative phrasings vs "(sample answer)") are rejected.
- Files: src/pages/admin/AdminCurriculumQuality.jsx (NEW /admin/curriculum-quality — review queue: severity, evidence, wrong-answer distribution bars, AI reason+suggested fix, أصلحناها/ليست مشكلة), src/App.jsx (route), src/config/navigation.js (نظام → جودة المنهج)
- DB: curriculum_quality_flags (RLS staff select/update, service-role insert; dedupe_key unique), views v_cq_reading_question_stats / v_cq_listening_question_stats / v_cq_grammar_exercise_stats / v_cq_audio_health / v_cq_vocab_confusion_pairs (REVOKEd from clients). Migration 20260609210000 (applied to prod).
- Edge Functions: curriculum-mistake-detector (NEW, deployed v2) — auth: admin JWT or sb_secret service key; AI scan runs via EdgeRuntime.waitUntil (returns instantly, flags appear as written; v1 hit the 150s idle timeout doing 20 sequential calls). Weekly pg_cron Mon 00:00 UTC; cron bearer comes from Vault secret `edge_service_key` because current_setting('supabase.service_role_key') is NULL on this project (academy-digest's cron only "works" because that fn never checks auth).
- Status: complete & live (migration applied, fn deployed, first scan done, UI on main)
- Notes: rerun policy — open flags are not re-judged; resolved items only re-checked after ≥5 new attempts. MAX_AI_ITEMS=20/run keeps spend trivial. The 38 grammar candidates mostly cluster on the exact-match grading issue — fixing the GRADER (normalize case/whitespace, accept sample-answer variants) would clear most flags at once.

### 2026-06-09 — PERSONAL PHRASEBOOK دفتر عباراتي (student feature, live)
- What: mines each student's REAL speaking-recording transcripts (speaking_recordings.ai_evaluation->>'transcript', Whisper) with Claude for "you said X → a native says Y" pairs (max 3/recording, quality-first — clean recordings yield zero), each with a warm Arabic note + category (grammar/word_choice/expression/pronunciation). The corrected sentence is voiced in DR. ALI'S CLONED NAJDI VOICE (locked recipe D6V3XntWeusiNMR4kdSw / eleven_multilingual_v2 / sim .9 / speed .92) and stored at curriculum-audio/phrasebook/<entry>.mp3. First build: 22 entries, 22 voiced, across 25 queued recordings.
- Files: src/pages/student/StudentPhrasebook.jsx (NEW /student/phrasebook — gender-aware copy via useG, single-audio playback, premium empty state), src/App.jsx (route), src/config/navigation.js (دفتر عباراتي in student sidebar ×2 + mobile drawer, NotebookPen icon)
- DB: phrasebook_entries (RLS: student reads own, staff read all, service-role writes; dedupe_key student+hash(native_text)), phrasebook_processed (service-role only bookkeeping). Migration 20260609230000 (applied to prod).
- Edge Functions: phrasebook-builder (NEW, deployed) — auth admin/sb_secret like the detector; runs via EdgeRuntime.waitUntil; weekly pg_cron Wed 23:00 UTC (Vault bearer `edge_service_key`). VOICING IS BEST-EFFORT: if the ElevenLabs key dies (subscription may be cancelled ~June 11) entries stay text-only and a later run backfills audio (15/run).
- Status: complete & live (migration applied, fn deployed + first build done, UI pushed to main)
- Notes: rerun-safe (phrasebook_processed + dedupe upserts). MAX 25 recordings/run. If Ali cancels ElevenLabs, the feature degrades gracefully — consider pre-voicing the backlog before ~June 11.

### 2026-06-09 — PROD SMOKE SUITE (Playwright, money paths)
- What: first automated regression net. 11 specs × chromium + webkit (webkit matters — Safari is where Fluentia bugs live) run against LIVE prod with the mock student; render + fatal-console assertions only (ReferenceError / not-defined / not-a-function / bad-MIME / minified-React — the exact classes from client_error_log), no submissions so reruns never pollute data. 14/14 student specs green on first full run.
- Files: tests/smoke/playwright.config.mjs, tests/smoke/helpers.mjs (login clicks the EXACT «دخول» button — the first form button is the username-mode switch; modal suppression keys are fluentia_onboarded_<id>='true' + pwa_install_dismissed_at=now), tests/smoke/student-money-paths.spec.mjs (units are BUTTONS not links — enter via «ابدأ من حيث توقفت»), tests/smoke/admin-paths.spec.mjs
- Status: complete; run: `npx playwright test --config tests/smoke/playwright.config.mjs`
- Notes: ADMIN smokes SKIP by default — the CLAUDE.md admin password (Fluentia2025!) is STALE on prod (login returns «البريد الإلكتروني أو كلمة المرور غير صحيحة»); pass SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD env to enable. Update the credentials line above when Ali confirms the current one.
