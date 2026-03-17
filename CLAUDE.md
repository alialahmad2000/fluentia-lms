# CLAUDE.md — Fluentia LMS Project Context
# This file is auto-read by Claude Code on every session start.
# Last updated: March 15, 2026
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

<!--
Claude Code: Add new entries at the TOP of this section.
Always include: date, what changed, files touched, status.
This is how future sessions know what happened.
-->

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

### March 14, 2026 — CLAUDE.md + FLUENTIA-SPEC.md added
- What: Added project context files for Claude Code auto-read
- Files: CLAUDE.md, FLUENTIA-SPEC.md
- Status: Complete
- Notes: All 10 LMS phases were already complete. Keys are in .env only (not in these files).
