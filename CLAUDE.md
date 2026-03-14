# CLAUDE.md — Fluentia LMS Project Context
# This file is auto-read by Claude Code on every session start.
# Last updated: March 14, 2026
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

**Stats:** 62 pages, 17 edge functions, full PWA, 43+ DB tables, 96+ RLS policies.

### Sidebar Structure (Student):
```
الرئيسية

التعلم ▾
  الواجبات
  الاختبارات
  الجدول
  المكتبة

معمل التحدث ▾
  المحادثه
  يوميات صوتية
  مدرب النطق
  محاكي المحادثات

التقدم ▾
  الدرجات
  التقييمات
```

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

<!--
Claude Code: Add new entries at the TOP of this section.
Always include: date, what changed, files touched, status.
This is how future sessions know what happened.
-->

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

### March 14, 2026 — CLAUDE.md + FLUENTIA-SPEC.md added
- What: Added project context files for Claude Code auto-read
- Files: CLAUDE.md, FLUENTIA-SPEC.md
- Status: Complete
- Notes: All 10 LMS phases were already complete. Keys are in .env only (not in these files).
