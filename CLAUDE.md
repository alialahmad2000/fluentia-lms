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

<!--
Claude Code: Add new entries at the TOP of this section.
Always include: date, what changed, files touched, status.
This is how future sessions know what happened.
-->

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

### 2026-05-12 — Personalization Bank v1: Phase D COMPLETE (all 1,152 variants)
- What: All 6 CEFR levels now have full 8-bucket variant coverage
- Content: 1,152 variants (144 canonical readings × 8 buckets), QA pass rate 100%, avg vocab coverage 0.98, avg word-count ratio 0.87
- Levels: Pre-A1 (192), A1 (192), A2 (192), B1 (192), B2 (192), C1 (192)
- Buckets: medical, business, tech, sports, travel_food, islamic, fashion_beauty, family
- Seed files: scripts/seeds/personalization/L0-L5-variants.json (offline review)
- Insert scripts: fix-and-insert-{a1,a2,b1,b2,c1}.mjs + insert-preA1.mjs (all idempotent)
- DB state: 1,152 rows in personalized_readings, 0 FK orphans, all is_published=TRUE
