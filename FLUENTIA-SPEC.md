# ═══════════════════════════════════════════════════════════════
# FLUENTIA ACADEMY LMS — COMPLETE BUILD SPECIFICATION
# Target: Claude Code (CLI terminal agent)
# ═══════════════════════════════════════════════════════════════
#
# INSTRUCTIONS FOR CLAUDE CODE:
#
# 1. Read this ENTIRE spec first. Do NOT write any code until
#    you have read and understood ALL sections.
#
# 2. This spec contains the FULL system design. However, you
#    must build ONE SUB-PHASE at a time. Start with Phase 1A.
#    Do NOT touch anything from later phases.
#
# 3. After completing each sub-phase:
#    - Summarize what you built
#    - List any decisions you made
#    - List any issues or questions
#    - STOP and wait for my approval before the next sub-phase
#
# 4. This is a REAL academy with REAL students — not a demo.
#    Every design decision should account for production use.
#
# 5. When you see future-phase features referenced in the
#    database schema, BUILD the tables now (they're in Phase 1A)
#    but do NOT build the UI or logic until that phase arrives.
#
# 6. Commit to git after each meaningful milestone within a
#    sub-phase. Use clear Arabic-friendly commit messages.
#
# ═══════════════════════════════════════════════════════════════

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1: PROJECT OVERVIEW
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## What We're Building

Fluentia LMS — a premium Learning Management System for Fluentia Academy (أكاديمية طلاقة), an online English language academy based in Saudi Arabia.

This is NOT a generic LMS. Every feature is designed based on REAL student behavior data from actual Telegram group analysis (1,077 messages across 2 groups analyzed).

## The Mission

Replace Telegram groups + Google Sheets + manual tracking with ONE platform that:
1. Automates 80% of what the trainer does manually (he sends 269 messages/month = 38% of all group messages)
2. Makes students addicted to learning through gamification + social psychology
3. Turns every student achievement into viral marketing content
4. Looks and feels like a $20M product (think Linear, Vercel, Raycast level design)

## Critical Principle

The system MUST preserve the WARMTH and FAMILY atmosphere of the current Telegram groups. Students call each other by name, help each other, share summaries. The trainer (Dr. Ali) knows every student personally and encourages them individually ("You are a sun that shines all the planets around it — Amazing as always Alhanouf 👏"). This is NOT a cold corporate LMS.

## What NOT to Build

- Do NOT build a landing page — it exists at fluentia-site.vercel.app
- Just add a "Student Login" button on the landing page that links to the LMS login
- The Telegram groups STAY — the LMS works alongside them, not as a replacement
- Telegram = social/motivation/family vibe. LMS = assignments/grading/tracking/payments/reports
- Do NOT build any WhatsApp automation or integration — this is handled separately via n8n
- Do NOT build any Telegram bot — this may come later as a separate project

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2: REAL ACADEMY DATA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Academy Info
- Name: Fluentia Academy (أكاديمية طلاقة)
- Founder/Lead Trainer: Dr. Ali (د. علي الأحمد)
- Phone/Contact: +966 55 866 9974 (contact info only — no WhatsApp integration in LMS)
- Landing Page: fluentia-site.vercel.app
- TikTok: @fluentia_
- Instagram: @fluentia__
- Google Meet: one fixed link per group for all classes

## CRITICAL TERMINOLOGY:
- The free initial session is called "لقاء مبدئي مجاني مع المدرب" (complimentary initial meeting with the trainer)
- NEVER call it "كلاس تجريبي مجاني" (free trial class) — this is a deliberate positioning choice
- Use this correct term everywhere in the LMS: buttons, notifications, onboarding, emails

## Current Students & Finances (March 2026)
- Active students: ~14 (target: 25)
- Monthly revenue: ~10,800 SAR
- Collected: ~8,000 SAR (74% collection rate)
- Monthly target: 5,000 SAR (exceeding at 216%)
- Prices vary per student: 500-1,500 SAR (not standardized — legacy pricing)
- Payment dates differ per student (1st, 10th, 16th, 20th)

## Current Student List (from Google Sheet):
1. نادية خيار القحطاني — 600 SAR — Full Payment — Level 2 — Group 2A
2. الهنوف البقمي — 800 SAR — Full Payment — Level 2 — Group 2A
3. هوازن العتيبي — 500 SAR — Not Yet — Level 2 — Group 3
4. منار العتيبي — 500 SAR — Full Payment — Level 1 — Group 3
5. بسيرين — 950 SAR — Not Yet — Level 1
6. غيداء — 800 SAR — Not Yet — Level 2 — IELTS A
7. نورة الياسي — 500 SAR — Full Payment — Level 2
8. سارة خالد منصور — 1200 SAR — Full Payment
9. سارة شرائحي — 1500 SAR — Full Payment — Level 1
10. لين الشهري — 1250 SAR — Full Payment — Level 1
11. وعد محمد العمران — 1350 SAR — Part (650 paid, 350 left)
12. فاطمة خواجي — 850 SAR — Part (650 paid, 200 left)

## Official Packages (for NEW students):
- باقة أساس (Asas): 750 SAR/month — 8 group classes, monthly assessment, basic materials
- باقة طلاقة (Talaqa): 1,100 SAR/month — 8 group + 1 private/month + daily follow-up + recorded content + bi-weekly assessment + monthly report
- باقة تميّز (Tamayuz): 1,500 SAR/month — 8 group + 4 private/month + intensive follow-up + weekly assessment + weekly report + personal development plan
- IELTS Course: 2,000 SAR/month — intensive IELTS preparation

## CRITICAL — Legacy Pricing:
Existing students pay custom amounts (500-1500 SAR) that don't match official packages. The admin sets a custom price per student. The subscription charges that custom amount. New students only pay official package prices.

## Groups:
- Group 1A, Group 2A, Group 3
- Max 7 students per group
- Min 3 to open a new group
- Classes: 2 per week (8 per month) via Google Meet

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3: REAL TELEGRAM GROUP ANALYSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Why This Matters:
This data shows EXACTLY how the academy operates. The LMS must replicate and enhance these patterns.

## Group 1: Fluentia (Level 2) — Intermediate Students
- Period: Feb 1 - Mar 10, 2026 | 707 messages | 7 members
- Trainer: 269 msgs (38%) | Alhanouf: 242 (34%) | Hawazin: 83 (12%) | Nader: 59 (8%) | Ghaida: 17 (2%) | Waad: 3

### Trainer Behavioral Patterns (must replicate in LMS):
- Uses 🚨 for assignments: "🚨Listening Task: Send a voice note summary..."
- Encourages by name: "Amazing as always Alhanouf 👏"
- Follows up missing submissions: "@N_moh0 @Aa_9172 whenever u do the reading task"
- Welcomes new students: "Please join me in welcoming our new family member @ghaida_talha"
- Shares PDF summaries after grammar classes
- Adjusts schedule per student requests

### Assignment Types (Level 2):
1. Listening: YouTube link → voice note summary (40-165 sec) → trainer feedback
2. Speaking (2/week): Presentations, webinars, group conversations
3. Reading (3/week): Articles → difficulty rating → screenshot proof
4. Writing (1/week): Via bot → auto-feedback → share result
5. Grammar Worksheets: PDF after class → solve → share solution

### Student Archetypes (design for ALL of these):
- SUPER ACTIVE (Alhanouf): 242 msgs, sends voice notes regularly, coordinates with classmates, engages with everything
- IELTS FOCUSED (Hawazin): Tracks band scores, focused on test prep
- MODERATE (Nader): Sometimes absent ("I'm exhausted"), completes work but not always on time
- SHY/NEW (Ghaida): Short polite messages, submits quietly, joined mid-course
- VERY NEW (Waad): 3 messages only, just started

## Group 2: Fluentia (Level 1) — Beginner Students
- Period: Feb 16 - Mar 10, 2026 | 370 messages | 7 members
- Trainer: 132 msgs (38%) | Manar: 77 (22%) | Sereen: 54 (15%) | Norah: 51 (15%)

### Key Differences from Level 2:
- Simpler content (question words, basic tenses vs presentations)
- Students help each other MORE (Manar organizes, explains, creates summaries)
- Trainer explains grammar in Arabic: "Whose → للملكية... Whom → للمفعول به"
- Trainer uses Telegram Topics (7 channels: Reading, Speaking, Listening, Writing, Vocabulary, Irregular Verbs, Class Summary)
- Fewer assignment types (mainly Reading 3x/week + Speaking 2x/week)
- Shared Google Sheet for speaking topics tracking

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4: LEVEL SYSTEM (6 LEVELS + IELTS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Teaching Materials:

**Reading — National Geographic Reading Explorer:**
- 6 books: Foundation + Level 1 + Level 2 + Level 3 + Level 4 + Level 5
- Each book: 12 units, each unit = Unit A + Unit B (2 articles + exercises per sub-unit)
- In class: 1 sub-unit per class (article + exercises)
- Weekly: 2 sub-units (2 classes/week)
- Each book realistically: ~4 months (with grammar classes mixed in)

**Grammar — Grammar in Use Intermediate (Raymond Murphy):**
- 145 units total — trainer selects ~60-70 most important, distributed across levels
- 2 units per grammar class
- Grammar classes are mixed between reading classes as needed — trainer is flexible

**Speaking — Topic Bank per Level:**
- Each level has its OWN topic bank (not shared)
- 3 voice notes per week recorded directly from the LMS
- Topics progress automatically: this week topic 34 → next week topic 35
- Student sees checklist of all topics, checks off completed ones

**Reading Homework (outside class):**
- Beginner/Intermediate: articles from external websites (links)
- Advanced: IELTS passages from test prep sites
- Student reads + solves + uploads screenshot as proof

**Writing:**
- Claude API feedback inside the LMS
- Limits per package: Asas = 2/month, Talaqa = 4/month, Tamayuz = 8/month
- Admin can increase/decrease limit for any student
- Trainer can review manually after AI feedback
- Must be smart with tokens — don't overconsume

## The 6 Levels:

### ═══ FOUNDATION TRACK (تأسيس) — ~8 months ═══

**Level 1 — "الخطوة الأولى" (~4 months)**
- Reading: Explorer Foundation (Units 1-12)
- Grammar: Core 12 units (absolute basics)
- Speaking: Level 1 topic bank (simple: introduce yourself, family, daily routine, hobbies)
- Reading HW: Easy articles
- Writing: Simple sentences and basic paragraphs
- Note: Most students start at Level 2 — Level 1 is for absolute beginners only
- Estimated speaking topics: ~48 topics (3/week × 16 weeks)

**Level 2 — "بداية الثقة" (~4 months)**
- Reading: Explorer 1 (Units 1-12)
- Grammar: 12 additional units (past, future, modals)
- Speaking: Level 2 topic bank (describe places, past experiences, simple opinions)
- Reading HW: Medium difficulty articles
- Writing: Paragraphs + simple emails
- Most beginner students start here
- Estimated speaking topics: ~48 topics

### ═══ DEVELOPMENT TRACK (تطوير) — ~12 months ═══

**Level 3 — "صار يتكلم" (~4 months)**
- Reading: Explorer 2 (Units 1-12)
- Grammar: 12 units (perfect tenses, conditionals)
- Speaking: Level 3 topic bank (explain concepts, compare things, give opinions with reasons)
- Reading HW: Difficult articles
- Writing: Essays + opinions + Claude AI feedback
- Estimated speaking topics: ~48 topics

**Level 4 — "ثقة كاملة" (~4 months)**
- Reading: Explorer 3 (Units 1-12)
- Grammar: 12 advanced units
- Speaking: Level 4 topic bank (academic discussions, presentations, debates)
- Reading HW: IELTS passages (beginning)
- Writing: Academic writing
- Estimated speaking topics: ~48 topics

**Level 5 — "جاهز للعالم" (~4 months)**
- Reading: Explorer 4-5 (selected articles)
- Grammar: Final 12 units
- Speaking: Level 5 topic bank (complex topics, persuasion, formal speech)
- Reading HW: Intensive IELTS passages
- Writing: Advanced writing
- Estimated speaking topics: ~48 topics

### ═══ IELTS TRACK — ~3 months ═══

**Phase 1 — "بناء المهارات" (Month 1)**
- Reading: 1 passage daily (easy → medium)
- Writing: Task 1 + Task 2 once/week + Claude feedback
- Speaking: Part 1 + 2
- Listening: Section 1 + 2
- Mock test #1: baseline score

**Phase 2 — "التكثيف" (Month 2)**
- Reading: 1 passage daily (hard)
- Writing: Twice/week
- Speaking: Part 1 + 2 + 3
- Listening: All sections
- Mock test #2

**Phase 3 — "الجاهزية" (Month 3)**
- Reading: Harder than real test
- Writing: 3 times/week
- Speaking: Full mock interviews
- Listening: Full timed tests
- Final mock test → if target not reached = additional month

## Level-Package Relationship:
- Package determines SERVICE quality (follow-up, private sessions, reports)
- Level determines CONTENT (which book, which topics)
- A Level 2 student on Asas and Level 2 on Tamayuz = same content, different service

## Level Promotion:
- NOT automatic — trainer or admin decides (one button click)
- Student sees: "مبروك! انتقلت لـ Level 3 🎉" + completion certificate
- Shareable achievement card generated automatically

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5: TECH STACK & CREDENTIALS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Frontend:
- React 18 + Vite
- Tailwind CSS (dark theme)
- React Router v6
- React Query / TanStack Query (data fetching + caching)
- Zustand (state management)
- Framer Motion (animations)
- Recharts (charts/visualization)
- PWA (service worker + manifest + installable)
- date-fns (dates with locale)

### ⚠️ CRITICAL — VOICE RECORDING ON iOS/Safari:
- Most students are young Saudi women using iPhones with Safari
- Safari does NOT fully support MediaRecorder API the same way Chrome does
- Supported format on Safari: audio/mp4 (NOT audio/webm)
- You MUST detect the browser and use the correct MIME type:
  - Chrome/Android: audio/webm;codecs=opus
  - Safari/iOS: audio/mp4 or audio/aac
- Use a polyfill or wrapper library (e.g., RecordRTC, or audio-recorder-polyfill) to handle cross-browser
- Test voice recording flow on both Chrome AND Safari
- The voice recorder must handle: permission denied, microphone not found, recording interrupted (phone call, lock screen)
- On iOS PWA: microphone access may behave differently — test in both Safari and PWA mode

## Backend — Supabase (all-in-one):
- PostgreSQL (relational database)
- Supabase Auth (email/password login, role-based)
- Supabase Storage (files, voice notes, PDFs)
- Supabase Realtime (live updates, activity feed)
- Row Level Security (RLS) — students see only their data
- Edge Functions (AI calls, report generation)
- Cron jobs (reminders, streak checks, weekly reports)

### ⚠️ SUPABASE FREE TIER CONSTRAINTS (current plan):
- Database: 500MB limit — sufficient for now, monitor growth
- Storage: 1GB limit — THIS IS THE BOTTLENECK. Voice notes must be compressed (see Storage Strategy section)
- Edge Functions: 500K invocations/month — sufficient for 25 students
- Realtime: 200 concurrent connections — sufficient
- Backups: Weekly only (no daily) — see Backup Strategy section
- NOTE: Upgrade to Pro ($25/month) will be needed before reaching ~20 active students
- Design all features to work within these limits. Add admin dashboard warning when approaching 80% of any limit.

## AI:
- Claude API (Sonnet) — writing feedback, grammar, reports, chatbot, smart nudges, trainer assistant
- OpenAI Whisper API — voice note transcription
- AI is ALWAYS a helper, NEVER a replacement. Every AI output can be reviewed/edited by trainer.

## Hosting & Deployment:
- Vercel (frontend)
- Supabase (backend — hosted)

### Deployment Pipeline:
- GitHub repo: push to `main` triggers Vercel production deploy
- Branch strategy: `main` (production), `dev` (development/testing)
- Vercel preview deployments: every push to `dev` or PR gets a preview URL
- Supabase database migrations: use Supabase CLI migrations (stored in `/supabase/migrations/`)
- Environment variables: set in Vercel dashboard (never hardcode in code)
- Pre-deploy checklist: RLS policies verified, no console.log in production, .env not committed

## Credentials:

### Supabase:
```
VITE_SUPABASE_URL=https://nmjexpuycmqcxuxljier.supabase.co
VITE_SUPABASE_ANON_KEY=<see .env file>
SUPABASE_SERVICE_ROLE_KEY=<see .env file>
```

### Claude API:
```
CLAUDE_API_KEY=<see .env file>
```

### OpenAI (Whisper):
```
OPENAI_API_KEY=<see .env file>
```

### Resend (Email):
```
RESEND_API_KEY=<see .env file>
```

### Moyasar (Payment):
```
# PENDING APPROVAL — Use payment link approach for now
# Admin sets a Moyasar payment link in settings
# Student clicks "Pay" → opens Moyasar payment page in new tab → pays → comes back
# Admin manually marks payment as "paid" in the LMS
# Once Moyasar API is approved, we integrate: auto-subscriptions, webhooks, auto-status updates
# The billing page and payment tracking are built now — only the API connection is deferred
MOYASAR_API_KEY=pending
```

### GitHub:
```
GITHUB_REPO=https://github.com/alialahmad2000/fluentia-lms.git
```

### Environment:
- All keys go in `.env` file (gitignored)
- Create `.env.example` with placeholder values
- Vercel environment variables set during deployment

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6: DESIGN SYSTEM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Philosophy:
Premium dark-theme design inspired by Linear, Vercel, Raycast, Arc Browser. NOT a typical colorful LMS. This should feel like a luxury tech product. Every pixel matters.

## Colors:
```css
--primary-navy: #1a2d50;
--dark-navy: #0a1225;
--darkest-bg: #060e1c;
--sky-blue: #38bdf8;       /* primary accent */
--sky-light: #7dd3fc;      /* secondary accent */
--gold: #fbbf24;           /* achievements, premium */
--white: #f8fafc;          /* primary text */
--success: #4ade80;        /* completed, correct */
--error: #ef4444;          /* overdue, wrong */
--warning: #f59e0b;        /* pending, attention */
--muted: #64748b;          /* secondary text */
--surface: rgba(255,255,255,0.03);  /* cards */
--border: rgba(255,255,255,0.06);   /* subtle borders */
```

## Fonts:
```
Arabic body & UI: 'Tajawal', sans-serif (300,400,500,700,800)
English headings: 'Playfair Display', serif (700,900)
English body: 'Inter', sans-serif
Load from Google Fonts
```

## Layout:
- Direction: RTL (right-to-left) EVERYTHING
- Sidebar: Collapsible, icons + labels, role-based nav
- Mobile: Bottom tab bar replacing sidebar
- Content: Max-width 1200px, centered, generous padding
- Cards: Rounded 16-20px, subtle glass morphism, soft borders
- Spacing: 8px grid system

## Animations:
- Page transitions: Subtle fade + slide (Framer Motion)
- Card hover: scale(1.02) + border glow
- Loading: Skeleton screens (NOT spinners)
- Achievement unlock: Confetti + glow
- Level up: Full-screen celebration (2 seconds)
- Points added: Floating "+10 XP" animation
- Streak: Fire emoji pulsing
- Leaderboard: Smooth reorder animation
- Empty states: Illustrated with Arabic text + CTA

## Mobile-First:
- 320px minimum width
- Touch targets: minimum 44px
- Swipe gestures (tabs, dismiss)
- PWA: installable, push notifications, offline cache
- Voice recording directly from browser

## Dark/Light Mode:
- Default: Dark (matches academy brand)
- Toggle available, follows system preference
- Both modes fully designed

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7: DATABASE SCHEMA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design these tables in Supabase PostgreSQL with proper relationships, indexes, RLS policies, and triggers.

## Core Tables:

### profiles (extends auth.users)
```sql
- id (uuid, PK, references auth.users)
- full_name (text, not null)
- display_name (text)
- avatar_url (text)
- role (enum: 'student','trainer','admin')
- phone (text)
- email (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### students
```sql
- id (uuid, PK, references profiles)
- academic_level (integer, 1-5) -- current level
- ielts_phase (integer, nullable, 1-3) -- for IELTS students
- package (enum: 'asas','talaqa','tamayuz','ielts')
- track (enum: 'foundation','development','ielts')
- group_id (uuid, FK → groups)
- team_id (uuid, FK → teams, nullable)
- xp_total (integer, default 0)
- current_streak (integer, default 0)
- longest_streak (integer, default 0)
- gamification_level (integer, default 1)
- streak_freeze_available (boolean, default false)
- enrollment_date (date)
- status (enum: 'active','paused','graduated','withdrawn')
- custom_price (integer, nullable) -- for legacy students, overrides package price
- payment_day (integer, 1-31) -- day of month for billing
- payment_link (text, nullable) -- Moyasar payment link
- referral_code (text, unique)
- referred_by (uuid, FK → students)
- writing_limit_override (integer, nullable) -- admin can override
- goals (text)
- interests (text[])
- public_goal (text, nullable) -- displayed in group feed
- last_active_at (timestamptz)
- onboarding_completed (boolean, default false)
- deleted_at (timestamptz, nullable) -- soft delete — never hard-delete students
```

### trainers
```sql
- id (uuid, PK, references profiles)
- specialization (text[])
- per_session_rate (integer) -- SAR per private session
- is_active (boolean, default true)
```

### groups
```sql
- id (uuid, PK)
- name (text) -- 'Level 1 - Group A'
- code (text) -- '1A', '2A', '3'
- level (integer, 1-5)
- trainer_id (uuid, FK → trainers)
- max_students (integer, default 7)
- google_meet_link (text)
- schedule (jsonb) -- {days: ['Sunday','Tuesday'], time: '20:00', timezone: 'Asia/Riyadh'}
- is_active (boolean, default true)
- created_at (timestamptz)
```

### teams
```sql
- id (uuid, PK)
- name (text) -- 'النجوم'
- emoji (text)
- color (text) -- hex
- group_id (uuid, FK → groups)
- total_xp (integer, default 0)
- created_at (timestamptz)
```

### team_members
```sql
- team_id (uuid, FK → teams)
- student_id (uuid, FK → students)
- joined_at (timestamptz)
- PRIMARY KEY (team_id, student_id)
```

## Assignment System:

### assignments
```sql
- id (uuid, PK)
- trainer_id (uuid, FK → trainers)
- group_id (uuid, FK → groups, nullable)
- title (text, not null)
- description (text)
- type (enum: 'reading','speaking','listening','writing','grammar','vocabulary','irregular_verbs','custom')
- instructions (text)
- attachments (jsonb[]) -- [{url, name, type}]
- youtube_url (text)
- external_link (text) -- for reading articles
- deadline (timestamptz)
- points_on_time (integer, default 10)
- points_late (integer, default 5)
- allow_late (boolean, default true)
- allow_resubmit (boolean, default true)
- is_recurring (boolean, default false)
- recurrence_rule (jsonb) -- {frequency:'weekly', day:'Sunday'}
- is_visible (boolean, default true)
- version (integer, default 1) -- content versioning
- version_history (jsonb[], default '{}') -- [{version, title, description, edited_at, edited_by}]
- created_at (timestamptz)
- deleted_at (timestamptz, nullable) -- soft delete
```

### submissions
```sql
- id (uuid, PK)
- assignment_id (uuid, FK → assignments)
- student_id (uuid, FK → students)
- assignment_version (integer, default 1) -- which version of the assignment this submission is for
- content_text (text) -- written response
- content_voice_url (text) -- voice note file URL
- content_voice_duration (integer) -- seconds
- content_voice_transcript (text) -- Whisper transcription
- content_image_urls (text[]) -- screenshots
- content_file_urls (jsonb[]) -- [{url, name, type}]
- content_link (text) -- external link
- difficulty_rating (enum: 'easy','medium','hard', nullable) -- for reading tasks
- status (enum: 'draft','submitted','graded','resubmit_requested')
- submitted_at (timestamptz)
- is_late (boolean, default false)
- grade (text) -- 'A+','A','B+','B','C','D','F' or '1-10'
- grade_numeric (integer) -- 1-100 for calculations
- trainer_feedback (text)
- trainer_feedback_template (text) -- quick template used
- ai_feedback (jsonb) -- {grammar_score, vocabulary_score, fluency_score, suggestions[], corrected_text}
- ai_feedback_approved (boolean, default false) -- trainer approved AI feedback
- points_awarded (integer, default 0)
- created_at (timestamptz)
- updated_at (timestamptz)
- deleted_at (timestamptz, nullable) -- soft delete
```

## Speaking Topics:

### speaking_topic_banks
```sql
- id (uuid, PK)
- level (integer, 1-5)
- topic_number (integer) -- sequential within level
- title_en (text) -- English topic
- title_ar (text) -- Arabic description
- category (text) -- 'personal','academic','opinion','debate'
- difficulty (enum: 'easy','medium','hard')
- prompt_questions (text[]) -- guiding questions
- created_at (timestamptz)
```

### student_speaking_progress
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- topic_id (uuid, FK → speaking_topic_banks)
- completed (boolean, default false)
- submission_id (uuid, FK → submissions, nullable)
- completed_at (timestamptz)
```

## Gamification:

### xp_transactions
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- amount (integer) -- positive or negative
- reason (enum: 'assignment_on_time','assignment_late','class_attendance','correct_answer','helped_peer','shared_summary','streak_bonus','achievement','peer_recognition','challenge','daily_challenge','voice_note_bonus','writing_bonus','early_bird','custom','penalty_absent','penalty_unknown_word','penalty_pronunciation')
- description (text) -- human readable
- related_id (uuid, nullable) -- assignment_id, class_id, etc.
- awarded_by (uuid, FK → profiles, nullable) -- trainer who awarded
- created_at (timestamptz)
```

### achievements
```sql
- id (uuid, PK)
- code (text, unique) -- 'fire_starter','bookworm','voice_hero', etc.
- name_ar (text)
- name_en (text)
- description_ar (text)
- icon (text) -- emoji
- xp_reward (integer)
- condition (jsonb) -- {type:'submission_count', target:10, assignment_type:'reading'}
- is_active (boolean, default true)
```

### student_achievements
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- achievement_id (uuid, FK → achievements)
- earned_at (timestamptz)
- shared (boolean, default false) -- shared on social
```

### challenges
```sql
- id (uuid, PK)
- title_ar (text)
- description_ar (text)
- type (enum: 'weekly','team','one_v_one','thirty_day','trainer_custom','social')
- target (jsonb) -- {type:'submit_assignments', count:5, period:'week'}
- xp_reward (integer)
- start_date (timestamptz)
- end_date (timestamptz)
- group_id (uuid, FK → groups, nullable)
- created_by (uuid, FK → profiles)
- is_active (boolean, default true)
```

### challenge_participants
```sql
- id (uuid, PK)
- challenge_id (uuid, FK → challenges)
- student_id (uuid, FK → students)
- progress (integer, default 0)
- completed (boolean, default false)
- completed_at (timestamptz)
```

### peer_recognitions
```sql
- id (uuid, PK)
- from_student (uuid, FK → students)
- to_student (uuid, FK → students)
- message (text)
- xp_awarded (integer, default 5)
- created_at (timestamptz)
-- Limit: 3 per day per student (enforce in application)
```

## Classes & Attendance:

### classes
```sql
- id (uuid, PK)
- group_id (uuid, FK → groups)
- trainer_id (uuid, FK → trainers)
- type (enum: 'group','private')
- title (text)
- topic (text)
- date (date)
- start_time (time)
- end_time (time)
- google_meet_link (text)
- recording_url (text, nullable)
- summary_text (text, nullable) -- trainer's class summary
- summary_file_url (text, nullable) -- PDF summary
- attendance_code (text, nullable) -- 4-digit code for self-check-in
- status (enum: 'scheduled','in_progress','completed','cancelled','rescheduled')
- created_at (timestamptz)
```

### attendance
```sql
- id (uuid, PK)
- class_id (uuid, FK → classes)
- student_id (uuid, FK → students)
- status (enum: 'present','absent','excused')
- checked_in_via (enum: 'trainer','code','auto')
- xp_awarded (integer, default 0)
- created_at (timestamptz)
```

### private_sessions
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- trainer_id (uuid, FK → trainers)
- date (date)
- start_time (time)
- end_time (time)
- google_meet_link (text)
- status (enum: 'scheduled','completed','cancelled','no_show')
- notes (text)
- trainer_rate (integer) -- SAR for this session
- created_at (timestamptz)
```

## Communication:

### group_messages (Activity Feed + Group Chat)
```sql
- id (uuid, PK)
- group_id (uuid, FK → groups)
- sender_id (uuid, FK → profiles)
- channel (enum: 'general','reading','speaking','listening','writing','vocabulary','grammar','announcements','class_summary')
- type (enum: 'text','image','voice','file','system','announcement')
- content (text)
- file_url (text)
- voice_url (text)
- voice_duration (integer)
- is_pinned (boolean, default false)
- reply_to (uuid, FK → group_messages, nullable)
- created_at (timestamptz)
```

### message_reactions
```sql
- id (uuid, PK)
- message_id (uuid, FK → group_messages)
- user_id (uuid, FK → profiles)
- emoji (text)
- created_at (timestamptz)
```

### direct_messages
```sql
- id (uuid, PK)
- from_id (uuid, FK → profiles)
- to_id (uuid, FK → profiles)
- content (text)
- file_url (text)
- voice_url (text)
- read_at (timestamptz, nullable)
- created_at (timestamptz)
-- Only student↔trainer, not student↔student
```

### notifications
```sql
- id (uuid, PK)
- user_id (uuid, FK → profiles)
- type (enum: 'assignment_new','assignment_deadline','assignment_graded','class_reminder','trainer_note','achievement','peer_recognition','team_update','payment_reminder','level_up','streak_warning','system')
- title (text)
- body (text)
- data (jsonb) -- {link, related_id, etc.}
- read (boolean, default false)
- created_at (timestamptz)
```

## Payments:

### payments
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- amount (integer) -- SAR
- status (enum: 'paid','partial','pending','overdue','failed')
- method (enum: 'moyasar','bank_transfer','cash','free')
- period_start (date)
- period_end (date)
- paid_at (timestamptz, nullable)
- moyasar_payment_id (text, nullable) -- for future API integration
- notes (text)
- recorded_by (uuid, FK → profiles) -- admin who recorded
- created_at (timestamptz)
- deleted_at (timestamptz, nullable) -- soft delete
```

### trainer_payroll
```sql
- id (uuid, PK)
- trainer_id (uuid, FK → trainers)
- period_month (date) -- first day of month
- private_sessions_count (integer, default 0)
- rate_per_session (integer)
- total_amount (integer)
- status (enum: 'pending','paid')
- paid_at (timestamptz, nullable)
- notes (text)
```

## Assessments:

### assessments
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- type (enum: 'placement','periodic','self')
- level_at_time (integer)
- scores (jsonb) -- {grammar:75, vocabulary:60, speaking:80, listening:70, reading:85, writing:65}
- overall_score (integer)
- ai_analysis (text)
- trainer_notes (text)
- created_at (timestamptz)
```

### skill_snapshots (for Skill Radar over time)
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- grammar (integer, 0-100)
- vocabulary (integer, 0-100)
- speaking (integer, 0-100)
- listening (integer, 0-100)
- reading (integer, 0-100)
- writing (integer, 0-100)
- snapshot_date (date)
```

## Activity Feed:

### activity_feed
```sql
- id (uuid, PK)
- group_id (uuid, FK → groups)
- student_id (uuid, FK → students, nullable)
- type (enum: 'submission','achievement','streak','level_up','team_rank','peer_recognition','challenge_complete','new_member','class_summary','announcement')
- title (text)
- description (text)
- data (jsonb) -- flexible data per type
- created_at (timestamptz)
```

## Vocabulary & Flashcards:

### vocabulary_bank
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- word (text)
- meaning_en (text)
- meaning_ar (text)
- example_sentence (text)
- source (text) -- 'class','reading_hw','assignment'
- level (integer)
- mastery (enum: 'new','learning','reviewing','mastered')
- next_review (timestamptz) -- spaced repetition
- review_count (integer, default 0)
- created_at (timestamptz)
```

## Class Notes:

### class_notes
```sql
- id (uuid, PK)
- class_id (uuid, FK → classes)
- author_id (uuid, FK → profiles) -- student or trainer
- content (text)
- file_url (text) -- PDF or image
- is_trainer_summary (boolean, default false)
- is_pinned (boolean, default false) -- trainer can pin best student notes
- xp_awarded (integer, default 0) -- bonus for sharing
- created_at (timestamptz)
```

## Reports:

### progress_reports
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- period_start (date)
- period_end (date)
- type (enum: 'weekly','biweekly','monthly')
- ai_summary (text)
- trainer_notes (text)
- data (jsonb) -- {assignments_completed, attendance_rate, xp_earned, skill_changes, etc.}
- pdf_url (text, nullable)
- status (enum: 'draft','trainer_review','published')
- published_at (timestamptz, nullable)
```

## Holidays:

### holidays
```sql
- id (uuid, PK)
- name (text)
- start_date (date)
- end_date (date)
- reschedule_info (text) -- how classes are redistributed
- created_by (uuid, FK → profiles)
```

## Share Tracking:

### social_shares
```sql
- id (uuid, PK)
- student_id (uuid, FK → students)
- type (enum: 'achievement','level_up','streak','report','certificate','challenge','placement_test')
- platform (enum: 'twitter','instagram','tiktok','snapchat','whatsapp','threads','copy_link')
- shared_at (timestamptz)
- xp_awarded (integer, default 0)
-- Limit: 1 share XP per week (enforce in application)
```

## Referrals:

### referrals
```sql
- id (uuid, PK)
- referrer_id (uuid, FK → students)
- referred_email (text)
- referred_student_id (uuid, FK → students, nullable) -- once they sign up
- status (enum: 'pending','signed_up','subscribed')
- xp_awarded (integer, default 0)
- discount_applied (boolean, default false)
- created_at (timestamptz)
```

## System Settings:

### settings
```sql
- key (text, PK) -- 'moyasar_payment_link','default_xp_values','ramadan_mode', etc.
- value (jsonb)
- updated_at (timestamptz)
- updated_by (uuid, FK → profiles)
```

## System & Monitoring Tables:

### system_errors
```sql
- id (uuid, PK)
- error_type (text) -- 'api_failure','upload_failure','auth_error','rls_violation','unknown'
- service (text) -- 'claude_api','whisper_api','supabase_storage','supabase_realtime','resend','moyasar'
- user_id (uuid, FK → profiles, nullable)
- error_message (text)
- error_context (jsonb) -- {page, action, request_data}
- stack_trace (text, nullable)
- resolved (boolean, default false)
- created_at (timestamptz)
```

### ai_usage
```sql
- id (uuid, PK)
- type (enum: 'writing_feedback','speaking_analysis','smart_nudge','progress_report','grammar_check','chatbot','quiz_generation','trainer_assistant','content_recommendation','whisper_transcription')
- student_id (uuid, FK → students, nullable)
- trainer_id (uuid, FK → trainers, nullable)
- model (text) -- 'claude-sonnet','whisper-1'
- input_tokens (integer, nullable)
- output_tokens (integer, nullable)
- audio_seconds (integer, nullable) -- for Whisper
- estimated_cost_sar (numeric)
- created_at (timestamptz)
```

### analytics_events
```sql
- id (uuid, PK)
- user_id (uuid, FK → profiles, nullable)
- event (text) -- 'page_view','assignment_submit','voice_record_start','voice_record_complete','quiz_start','quiz_complete','login','share_click','payment_link_click'
- properties (jsonb) -- {page, assignment_type, duration_seconds, etc.}
- session_id (text)
- device (text) -- 'mobile','desktop','tablet'
- browser (text) -- 'safari','chrome','other'
- created_at (timestamptz)
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8: STUDENT PORTAL — ALL FEATURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8.1 Dashboard
- Personalized greeting ("صباح الخير يا هنوف 👋" — changes by time of day)
- Current level indicator with progress bar (e.g., Level 2 — 65% complete)
- XP points + gamification level
- Current streak with fire animation 🔥
- Team rank + team name/color
- Next 3 upcoming assignments with countdown timers
- Latest trainer quick note
- Next class (date + time + Google Meet link + countdown)
- Smart stat: "أنجزت ١٢ واجب هالشهر — أكثر من ٨٠٪ من زملائك"
- Mini activity feed (last 5 activities from groupmates)
- Daily motivation quote (Arabic + English)
- Payment status (subtle, friendly — not aggressive)
- Daily challenge card (quick 30-second task)

## 8.2 Assignments Page
- Tabs/filters by type: All | Reading | Speaking | Listening | Writing | Grammar | Vocabulary | Irregular Verbs
- Each assignment card shows: title, type icon, deadline countdown, status badge, points
- Status flow: Not Started → In Progress → Submitted → Graded
- Submission supports: text, voice note (record in browser), image upload, file upload, external link
- Voice recording: built-in recorder with waveform visualization, timer, playback before submitting
- After submission: see AI feedback (if applicable) + trainer feedback + grade + personal note
- Resubmission allowed (configurable per assignment)
- Late submissions allowed with reduced points (configurable)
- "الي سلّم" board: shows who submitted (✅) and who hasn't (⏳ "بانتظار") — NO names for pending, just count
- Peer visibility: students can see classmates' submissions (summaries, voice notes, screenshots) and react with emoji (👏❤️) — reactions give +2 XP to submitter
- Progress indicator: "٤ من ٧ زملائك سلّموا هالواجب"

## 8.3 Speaking Topics
- List of all topics for student's current level
- Checklist: completed ✅ vs pending
- Progress bar: "أنجزت ٢٤ من ٤٨ موضوع"
- Auto-advance: this week's topic highlighted
- Click topic → record voice note → submit
- Can re-record before submitting
- See AI analysis after submission (fluency, grammar, vocabulary)
- Trainer reviews and gives final feedback

## 8.4 Class Schedule
- Monthly calendar view
- Each class: date, time, topic, Google Meet link, type (group/private)
- Countdown to next class
- Reminder: 30 min + 5 min before (push notification)
- Attendance record: "حضرت ٦ من ٨ حصص هالشهر"
- Request reschedule (sends notification to trainer)
- Class recording link (after class, if uploaded)

## 8.5 Class Notes
- After each class: section for notes
- Trainer summary (if uploaded): PDF or text — displayed prominently
- Student can write and save their own notes
- Student can SHARE their notes (submission) — visible to whole group
- Trainer can PIN best student notes
- Sharing notes = bonus XP (+15)
- Pinned notes = extra bonus (+10)

## 8.6 Library
- Class recordings (organized by week/topic)
- Grammar summaries (PDFs)
- Vocabulary bank (all words learned — personal)
- Teaching materials (Reading Explorer references)
- Useful links (ReadTheory, etc.)
- Filter by: skill, level, date

## 8.7 Progress & Reports
- Skill Radar (spider chart): Grammar, Vocabulary, Speaking, Listening, Reading, Writing (0-100 each)
- Progress over time (line chart — monthly snapshots)
- Assessment history (placement test + periodic)
- Monthly/bi-weekly/weekly report (based on package)
- AI-generated insights: "تحسنت بالقرامر ١٥٪ — ركّز أكثر على الكتابة"
- Before/After voice comparison (first voice note vs latest)
- Export data as PDF

## 8.8 Profile
- Name, avatar, level, track, package, group, team
- Achievements gallery (earned badges with dates)
- Stats: total XP, assignments completed, longest streak, total study hours
- Personal goals (public + private)
- Enrollment date
- Referral code + share link
- Settings: notifications, dark/light mode, language

## 8.9 Billing
- Current package + price
- Payment history (dates + amounts + status)
- Next payment date + amount
- "ادفع الآن" button → opens Moyasar payment link in new tab
- Receipt download (PDF)
- Upgrade package option → shows comparison → pay difference
- Status: مدفوع / جزئي / بانتظار الدفع

## 8.10 Notifications Center
- Bell icon in header with unread count
- Types: assignment, deadline, graded, class reminder, trainer note, achievement, peer recognition, team update, payment, level up, streak warning
- Mark as read / mark all as read
- Click → navigate to relevant page
- Settings: toggle each notification type on/off

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 9: GAMIFICATION — ALL FEATURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9.1 XP Points System

### Earning XP:
- Submit assignment on time: +10
- Submit assignment late: +5
- Attend class: +15
- Correct answer in class (trainer awards via Quick Points): +5 to +20
- Help a classmate (Peer Recognition): +10
- Share class notes/summary: +15
- 7-day streak: +50 bonus
- 14-day streak: +100 bonus
- 30-day streak: +200 bonus
- Self-assessment completed: +10
- Improvement in periodic assessment: +100
- Receive Peer Recognition: +5
- First ever submission: +25 (welcome bonus)
- Placement test completed: +20
- Voice note > 60 seconds: +5 bonus
- Writing > 100 words: +5 bonus
- Daily challenge completed: +5
- Early bird (first to join class): +5
- Reaction on your submission (from classmate): +2

### Losing XP (trainer awards via Quick Points):
- Didn't know pronunciation of learned word: -5
- Didn't know meaning of learned word: -5 to -10
- Absent without excuse: -20
- Custom penalty (trainer writes reason): configurable

### Configurable:
- Admin can change ALL point values
- Admin can add new XP types
- Trainer can give custom bonus with description

## 9.2 Streak System
- Counts consecutive days with at least 1 activity (assignment submission, daily challenge, voice diary, habit check)
- Visual: fire emoji with number, pulsing animation
- Milestones: 7, 14, 30, 60, 90 days — each with bonus XP
- Streak Freeze: earned after 10 consecutive submissions — allows 1 day skip without breaking streak
- Breaking streak: lose streak counter (NOT XP), notification: "ضاع الـ streak — ابدأ من جديد!"
- Streak warning: notification when 22 hours without activity

## 9.3 Teams
- Each group divided into 2+ teams
- Team has: name, emoji, color
- Trainer/admin creates teams: manually (drag & drop) OR random (shuffle button)
- Can redistribute anytime
- Individual XP contributes to team XP
- Team multiplier: if ALL team members submit on time → +20% bonus for entire team
- Team of the Week: automatically calculated, announced in feed
- Team leaderboard within group

## 9.4 Leaderboard
- **Group level**: Top 3 individuals + student's own rank ("أنت المركز ٤ من ٧")
- **Team level**: Team rankings within group
- **Academy level**: Only "طالب الأسبوع" + "فريق الأسبوع" (never shows total count)
- Filters: This week / This month / All time
- Real-time updates
- Animation when position changes
- Confetti for #1

## 9.5 Achievements (Badges)
- 🔥 Fire Starter: First assignment submitted
- 📚 Bookworm: 10 Reading Tasks completed
- 🎤 Voice Hero: 10 voice notes submitted
- ✍️ Grammar Guru: 5 A+ grammar grades
- 🤝 Helper: 5 Peer Recognitions received
- 🏆 MVP: Top of leaderboard for 1 week
- ⚡ Streak Master: 30-day streak
- 📈 Level Up: Promoted to next academic level
- 🎯 Sniper: 10 correct answers in a row in class
- 📝 Note Taker: 5 class summaries shared
- 🌟 Perfect Week: All week's assignments submitted on time
- 💎 Diamond Student: All other badges earned
- 🎖️ Ambassador: 3 successful referrals
- 📱 Social Warrior: 5 social media shares
- Custom badges creatable by admin

## 9.6 Gamification Levels
- Level 1 (0 XP) → Level 2 (100) → Level 3 (300) → Level 4 (600) → ... → Level 20 (10,000)
- Different from academic level — this is engagement level
- Each level up: celebration animation + notification to group
- Level badge shown next to name everywhere
- XP curve gets steeper (harder to level up at higher levels)

## 9.7 Daily Challenge
- Small daily task (30 seconds - 1 minute)
- Grammar question / new vocabulary word / pronunciation challenge
- +5 XP for completion
- Maintains streak even without a formal assignment
- Different for each level
- Shown as a card on dashboard

## 9.8 Variable Rewards (Mystery System)
- Every 5 consecutive submissions → Mystery Box 🎁
- Random reward: +50 XP / special badge / trainer shoutout / double XP for a day
- Occasional random bonus: "مفاجأة! Double XP لكل اللي سلّموا اليوم"
- Weekly lucky draw (only among students who completed all assignments)

## 9.9 Challenges
- Weekly challenge: "اقرأ ٥ مقالات هالأسبوع" → reward
- Team challenge: "أول فريق يسلّم كل واجباته" → double XP
- 1v1 challenge: Two students compete on vocab quiz
- 30-day challenge: "سلّم واجب كل يوم لمدة ٣٠ يوم" → badge + certificate
- Social challenges: "شارك إنجازك على TikTok مع #تحدي_الطلاقة" → XP

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 10: SOCIAL PSYCHOLOGY ENGINE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10.1 Group Activity Feed
- FIRST thing student sees when opening group page
- Live feed showing: "الهنوف سلّمت Reading Task ✅", "منار شاركت ملخص 📝", "سيرين حققت streak ٧ أيام 🔥"
- NO notifications per activity (noisy) — just visible in feed
- Students see each other's submissions (summaries, voice notes, writing, screenshots)
- Can react with emoji (👏❤️🔥) — reaction gives submitter +2 XP
- Subtle pressure: "٤ من ٧ زملائك سلّموا" with progress bar
- "First to submit" highlight: "منار أول من سلّم! ⚡"

## 10.2 Social Proof
- "الأكثر نشاطاً هالأسبوع" — photo + name on dashboard
- Weekly Spotlight: one student featured with their story
- Academy counter: "٣٤٢ واجب تم تسليمه هالشهر"
- Success stories within the system

## 10.3 Loss Aversion
- Streak protection warnings: "🔥 streak ١٤ يوم — لا تضيّعه!"
- "فريقك يحتاجك" — team needs your submission
- Rank drop notification: "كنت المركز ٣ — الحين المركز ٥"
- Streak Freeze as a reward (earned, not given)

## 10.4 Commitment & Consistency
- Public Goal Setting: student sets monthly goal, visible in group
- Weekly Check-in: "هل حققت هدفك هالأسبوع?" (yes/partial/no)
- Goal progress bar on profile

## 10.5 Reciprocity
- Peer Recognition: "منار ساعدتك — تبي تشكرها? 🤝"
- Group Milestone: all submitted → everyone gets bonus
- Help chain: helping others earns XP for yourself

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 11: VIRAL MARKETING ENGINE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11.1 Share Card Generator
- Every achievement/milestone generates a beautiful card image
- Card includes: student name, achievement, Fluentia branding, registration link
- Designed in academy colors (navy + sky blue + gold)
- One-tap share buttons: Twitter/X, Instagram (Stories), Threads, TikTok, Snapchat, WhatsApp, Copy Link
- Each button opens the target app directly (deep links)
- Pre-written captions in Arabic: "🔥 حققت streak ٣٠ يوم في Fluentia! #تعلم_إنجليزي"

## 11.2 Shareable Moments (each has a share button):
- Achievement unlocked → share card
- Level up → share card
- Academic level promotion → share card + certificate
- Streak milestones (7/14/30/60/90) → share card
- Student of the Week → special premium card
- Placement test result → "اختبر مستواك مجاناً!" with test link
- Monthly progress report → summary image
- Challenge completion → share card
- First assignment → "بديت رحلة الطلاقة! 🚀"
- Skill Radar → radar chart image

## 11.3 Social Engagement Rewards
- WEEKLY limit (not daily — prevents spam):
  - Share achievement on any platform: +10 XP (once/week)
  - Share placement test with friend: +15 XP
  - Friend signs up via your link: +100 XP + 10% discount
- Social Warrior badge: 5 shares
- Influencer badge: 3 referral sign-ups

## 11.4 Public Placement Test
- Public page (no login required): anyone can test their English level
- Quick test: 6-10 adaptive questions
- Result: level + recommendation + "احجز لقاء مبدئي مجاني"
- Shareable result card
- Each test = potential lead (collect data)
- URL: /test or /quiz (public route)

## 11.5 Referral System
- Each student gets unique link: /ref/ALHANOUF
- Referrer gets: +100 XP + 10% discount next month
- After 3 referrals: 50% off or free month
- Referred person: 10% off first month
- Referral leaderboard
- Admin dashboard: referrals → sign-ups → conversions

## 11.6 User-Generated Content
- Before/After Voice Comparison: system generates audio comparison after 3 months
- Progress Timelapse: animated Skill Radar over months (GIF/video)
- Testimonial prompt after big achievements: "تبي تكتب كلمة عن تجربتك?"
- Auto-approved by admin before publishing

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 12: TRAINER PORTAL — ALL FEATURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 12.1 Trainer Dashboard
- All assigned groups overview
- Pending assignments to grade (count + list)
- Students who haven't submitted (name + assignment + days overdue)
- Students with streak about to break
- Today's/this week's classes
- Quick Actions: Add points, Assign homework, Send note, Record attendance

## 12.2 Quick Points Panel (CRITICAL — used during live class)
- Designed for use alongside Google Meet
- Large student name buttons (easy to tap)
- Each student: green (+) and red (-) buttons
- Quick reason selection:
  - Correct answer: +5 / +10 / +15 / +20
  - Great participation: +10
  - Helped classmate: +10
  - Didn't know learned word: -5 / -10
  - Didn't know pronunciation: -5
  - Custom reason (type)
- Student sees instant notification: "حصلت +10 نقاط! 🎉"
- Attendance check-in from same panel
- Quick note on any student (10 seconds)
- Undo last action (in case of mispress)

## 12.3 Grading & Feedback
- Queue of pending submissions (sorted by oldest first)
- Grading interface:
  - View submission (text/voice/image/file)
  - Listen to voice notes with playback controls
  - See AI feedback (if available)
  - Approve AI feedback OR edit it
  - Give grade (A+/A/B+/B/C/D/F or 1-10)
  - Write personal note OR use quick templates:
    - "Good job 👏" / "ممتاز!" / "يحتاج تحسين بالقرامر" / "أعد المحاولة" / custom
  - Award bonus XP
- Batch grading: same grade for multiple students
- See student's previous submissions (comparison)

## 12.4 Assignment Creation
- Choose type (Reading/Speaking/Listening/Writing/Grammar/Vocabulary/Irregular Verbs/Custom)
- Assign to: entire group / specific students
- Set: deadline, points, late policy, resubmission
- Attach: files, images, YouTube link, external URL
- Recurring: "repeat weekly" / "repeat daily"
- Clone: copy previous assignment and modify
- AI suggestion: "suggest an assignment for Group 2A based on last class"

## 12.5 Group Management
- View all groups with students
- Class schedule (edit times, reschedule)
- Add/remove student from group
- Create/edit teams (manual or random shuffle)
- Group stats: average attendance, submission rate, engagement

## 12.6 Quick Notes
- Select student → write note (10 seconds)
- Note types: encouragement / observation / warning / reminder
- Templates: "ملاحظتك بالكلاس كانت ممتازة!" / "حاول تركّز أكثر على النطق"
- Full history per student

## 12.7 Class Summary
- After each class: optionally upload summary
- Text or PDF
- Auto-posted to group activity feed
- Students notified

## 12.8 Student Profile View
- All student data: level, XP, streak, team, attendance, submissions, grades
- Skill radar
- Notes history
- Payment status (hidden from trainer — only visible to admin)
- Quick actions: send note, award points, view submissions

## 12.9 Trainer Permissions
- Sees only their own groups and students
- Cannot see payments/financial data
- Cannot see other trainers' groups
- Cannot change student levels (admin only) or admin settings

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 13: ADMIN PORTAL — ALL FEATURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Admin has ALL trainer capabilities PLUS:

## 13.1 Admin Dashboard
- Total active students / new this month / churned
- Revenue: this month / last month / growth %
- Collection rate (paid vs owed)
- Empty seats per group and level
- Churn risk: students with low activity
- New students needing onboarding
- Upcoming subscription renewals this week
- Quick actions: add student, record payment, manage groups

## 13.2 Student Management
- Full table: Name, Level, Group, Package, Price, Paid, Remaining, Status, Last Active
- Add new student (creates account + assigns group + sends welcome email)
- Edit any student data
- Set custom price (legacy students)
- Move between groups
- Pause / unpause subscription
- Withdraw student (data preserved 1 year)
- Promote level (one button → student gets celebration)
- Override writing AI limit
- Filter: by group / package / status / payment status / level
- Export: Excel / CSV

## 13.3 Payment Management
- Per student: amount due, paid, remaining, payment day, history
- Status: Full / Partial / Pending / Overdue
- Record manual payment
- Automatic reminders: 3 days before + on due date + 3 days after + 7 days after (lockout)
- 7 days overdue → LMS shows "جدد اشتراكك" and limits access
- Financial summary: monthly revenue, expenses, net
- Revenue chart over months
- Collection rate trends
- Export: Excel

## 13.4 Moyasar Integration (FUTURE — after approval)
- Currently: payment link approach (admin sets link, student pays via link, admin records manually)
- Future: automatic subscriptions, webhooks for payment status, auto-renewal, auto-receipt
- The billing UI and payment tracking are built now — only the API connection is deferred
- Admin panel has setting to enter Moyasar API keys when ready

## 13.5 Trainer Management
- Add/edit/deactivate trainers
- Assign groups to trainers
- Set per-session rate for private sessions
- View: trainer activity, sessions conducted, student feedback
- Payroll: monthly private sessions count × rate = amount owed
- Payroll status: pending / paid
- Export: Excel

## 13.6 Group Management
- Create/edit/archive groups
- Smart group assignment:
  - New student pays → system finds a group at their level with space (<7)
  - All groups full + 3 waiting same level → suggest "open new group?"
  - Group dropped below 3 → suggest "merge with another group?"
- View: students per group, capacity, attendance rates

## 13.7 Content Management
- Upload teaching materials (PDFs, videos, links)
- Organize by: level, skill, topic
- Set visibility: all students / specific group / specific package
- Question bank for assessments
- Speaking topic banks per level (add/edit/reorder)

## 13.8 Analytics & Reports
- Student engagement: who's active, who's declining
- Submission rates by group/student/assignment type
- Attendance rates by group/student
- Churn risk AI: predicts who might leave (based on: activity drop, payment delay, absence pattern)
- Revenue analytics: monthly/weekly charts
- Growth: new students vs churned per month
- Trainer performance comparison
- Marketing funnel: placement tests → meetings → subscriptions
- Referral analytics: who referred, conversions
- Export all reports: PDF / Excel

## 13.9 Holidays & Schedule
- Set holiday periods (e.g., Eid, Ramadan break)
- Classes redistributed (not cancelled — same 8/month)
- Ramadan mode: shift reminder times to post-Iftar
- Students notified of schedule changes

## 13.10 System Settings
- Package prices
- XP point values (all configurable)
- Notification templates
- Moyasar payment link (until API ready)
- Moyasar API keys (when ready)
- Academy branding (logo, colors)
- Roles and permissions
- Data backup/export
- AI monthly budget cap (SAR)
- Storage usage monitoring + cleanup tool
- System errors log viewer
- Analytics dashboard (DAU, completion rates, drop-offs)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 14: AI FEATURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All AI features use Claude API (Sonnet). Be smart with tokens — cache where possible, batch requests.

## 14.1 AI Writing Feedback
- Student submits paragraph/essay → Claude analyzes:
  - Grammar errors (corrections + rule explanations)
  - Vocabulary suggestions (better word choices)
  - Structure assessment (intro/body/conclusion)
  - Fluency score (1-10)
  - Improvement suggestions with examples
- Result shown as "AI Feedback" — clearly labeled as AI
- Trainer sees AI feedback, can approve/edit/override
- Rate limited per package: Asas=2/month, Talaqa=4/month, Tamayuz=8/month
- Admin can override limit per student

## 14.2 AI Speaking Analysis
- Student records voice note → Whisper transcribes → Claude analyzes:
  - Grammar in speech
  - Vocabulary range
  - Fluency assessment
  - Confidence level
  - Suggestions for improvement
- Trainer reviews and can edit AI feedback

## 14.3 AI Smart Nudges
- System detects: student hasn't submitted for 24h/48h/72h
- AI generates personalized reminder based on student pattern:
  - Active student: "باقي واجب واحد بس وتكمل الأسبوع!"
  - Shy student: "خذ وقتك بس لا تنسى 😊"
  - Absent student: "ما شفناك من يومين — كل شيء تمام؟"
- After 48h no activity → alert to trainer
- After 7 days → alert to admin (churn risk)

## 14.4 AI Progress Reports
- Analyzes all student data (assignments, attendance, XP, assessments, engagement)
- Generates Arabic summary:
  - Performance overview
  - Strengths and weaknesses
  - Comparison to last period
  - Specific recommendations
  - Charts and data
- Trainer reviews and adds personal notes before publishing
- Published as PDF + dashboard view
- Frequency based on package: Asas=monthly, Talaqa=bi-weekly, Tamayuz=weekly

## 14.5 AI Grammar Checker
- In writing areas: underline errors (like Grammarly)
- Suggest correction + explain rule
- Optional — student can enable/disable
- Works in: assignments, chat, notes

## 14.6 AI Chatbot (Learning Assistant)
- Students ask English questions: "وش الفرق بين whose و whom؟"
- Explains rules + gives examples
- Can practice conversation
- NOT a replacement for trainer — a quick helper
- Limited messages per day based on package

## 14.7 AI Vocabulary Builder
- Every new word encountered → auto-added to vocabulary bank
- AI generates: flashcard (word + meaning + sentence + pronunciation)
- Spaced repetition scheduling (Anki-like)
- "كلمة اليوم" personalized per level
- Quiz mode: tests on words student is learning

## 14.8 AI Trainer Assistant
- Helps trainer:
  - "Suggest assignment for Group 2A"
  - "What are Nader's weaknesses this month?"
  - "Write encouraging note for Alhanouf"
  - "Summarize Group 1 performance this week"
- Saves trainer time significantly

## 14.9 AI Content Recommendations
- Suggests articles/exercises based on: level, weaknesses, interests
- "بناءً على أداءك — جرّب هالمقال"
- Appropriate difficulty (zone of proximal development)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 15: COMMUNICATION SYSTEM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTE: Telegram stays for social/family vibe. LMS chat is for structured communication.

## 15.1 Group Chat (within LMS)
- Each group has a chat area
- Channels/Topics (like Telegram): General, Reading, Speaking, Listening, Writing, Vocabulary, Announcements, Class Summary
- Messages: text, images, voice notes, files, links
- Reactions (emoji) on messages
- Pin important messages
- @mention with notification
- Trainer announcements (highlighted, strong notification)
- Auto-welcome for new students
- Activity feed integrated into the group view

## 15.2 Direct Messages
- Student ↔ Trainer only (NOT student ↔ student — keep interaction in groups)
- Same features: text, voice, files
- Trainer can respond when available

## 15.3 Peer Recognition
- Student sends "شكر" to classmate → +5 XP to receiver
- Visible in activity feed: "سيرين شكرت منار 🤝"
- Limited: 3 per day per student
- "Helper of the Week" — most recognized student

## 15.4 Notifications
- In-app: bell icon with count
- Email backup (via Resend) for important notifications
- Push notifications (PWA)
- Types: assignment, deadline, graded, class, trainer note, achievement, peer recognition, team, payment, level up, streak
- Student controls: toggle each type

## 15.5 Auto-Messages
- Welcome message for new students (customizable template)
- Streak warning (22h no activity)
- Assignment deadline reminders (1 day before, 2 hours before)
- Class reminders (30 min, 5 min)
- Payment reminders (3 days before, on day, 3 days after, 7 days after)
- Weekly summary: "هالأسبوع أنجزت ٤ واجبات وحضرت ٢ كلاسات — استمر! 💪"

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 16: ADDITIONAL FEATURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 16.1 Onboarding (New Student First Experience)
- Guided tour of the LMS
- Shows: level, trainer, group, first class date, Google Meet link
- First assignment: easy warm-up
- "Introduce yourself" prompt for group chat
- Welcome message from trainer (auto or personal)

## 16.2 Assessments
- Placement test (at registration) — adaptive questions
- Periodic assessments: monthly (Asas), bi-weekly (Talaqa), weekly (Tamayuz)
- Self-assessment: weekly mood + confidence check
- Skill Radar updated after each assessment
- Results comparison over time

## 16.3 Vocabulary Flashcards (Spaced Repetition)
- Auto-generated from assignments and classes
- Anki-like review schedule
- "عندك ٤٥ كلمة متقنة من ١٢٠"
- Daily review reminder

## 16.4 Voice Diary
- Daily 30-60 second voice recording (any topic)
- AI tracks fluency/grammar/vocabulary over time
- After 3 months: before/after comparison (shareable!)

## 16.5 Mini Games
- Word Scramble, Sentence Builder, Vocab Match, Speed Quiz, Grammar Challenge
- Each gives XP
- Multiplayer: play with groupmate (real-time)
- Difficulty adapts to level

## 16.6 Study Timer (Pomodoro)
- 25 min study + 5 min break
- Tracks total hours
- "درست ١٢ ساعة هالشهر — أكثر من ٧٥٪ من زملائك"

## 16.7 Habit Tracker
- Student sets daily habits: "أقرأ ١٠ دقائق" / "أسمع بودكاست"
- Daily check-in (✓)
- +3 XP per habit
- Contributes to streak

## 16.8 Certificates
- Level completion certificate (PDF, beautiful design)
- QR code for verification
- Shareable — auto-generates share card
- Academy branding

## 16.9 Student Portfolio
- Collection of best work (best writing, best voice note, best grade)
- Exportable as PDF
- Useful for jobs/scholarships

## 16.10 Waiting List
- When all groups at a level are full
- "سجّل بقائمة الانتظار — بنبلغك أول ما يتوفر مكان"
- Admin sees waiting list per level

## 16.11 Session Rating
- After each class: 1-5 stars + optional comment
- Anonymous — trainer sees average only
- Admin sees details
- Alert if rating drops

## 16.12 Student Mood Tracker
- Weekly: "كيف حاسس بمستواك؟" 😊😐😞
- Trainer/admin see mood trends
- Mood drop → alert trainer "follow up with this student"

## 16.13 Attendance Gamification
- 4 consecutive classes: +25 XP bonus
- 8/8 monthly (perfect): badge "Perfect Attendance" 🎯
- First to join class: +5 XP "Early Bird"
- Absence without excuse: team feels it (social pressure)

## 16.14 Trainer Lesson Planner
- Plan lessons: topic, objectives, materials, related assignments
- AI suggests lesson plan based on group level
- Link lessons to assignments automatically

## 16.15 Waiting Room (Pre-Class)
- 10 minutes before class: warm-up area
- Quick quiz or vocabulary game
- See who's online and ready
- Reduces late arrivals

## 16.16 Data Export for Students
- Download all personal data (assignments, grades, vocab, reports)
- Sense of ownership

## 16.17 Parent/Sponsor View (Optional)
- For students 15-18 or sponsored
- Special link: attendance + performance + monthly report
- No chat or interaction visibility
- Builds trust, reduces cancellations

## 16.18 Pronunciation Lab
- Listen to correct pronunciation
- Record own pronunciation
- AI compares and scores
- Focus on common Arabic speaker errors (th, p/b, v/f)

## 16.19 IELTS Mock Tests
- IELTS mock tests are hosted EXTERNALLY (links to test prep sites)
- LMS stores the link as an assignment of type 'custom' with external_link
- Student takes the test externally → reports score back → trainer records result
- Listening section: YouTube video links (already supported as youtube_url in assignments)
- Full in-LMS mock test environment is NOT in scope — may be added later

## 16.20 Smart Scheduling
- Student sets preferred times → system suggests best group
- Google Calendar integration (add classes automatically)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 17: SECURITY & PERMISSIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Role-Based Access:
- **Student**: sees only their own data, their group chat, their submissions, their grades
- **Trainer**: sees their assigned groups/students only, NO financial data, NO other trainers' data
- **Admin**: sees EVERYTHING, controls EVERYTHING, has all trainer capabilities plus financial/system management

## Supabase RLS Policies:
- Every table must have RLS enabled
- Policies enforce role-based access at database level
- Students cannot access other students' private data
- Trainers cannot access other trainers' students
- Service role key used only in Edge Functions (never client-side)

## Auth:
- Email + password login
- Magic link option (passwordless)
- Password reset via email
- Session management (auto-logout after 30 days)
- Admin can create accounts for students (sends invite email)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 18: EMAIL SYSTEM (Resend)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Emails to send:
- Welcome email (new student account created)
- Password reset
- Assignment deadline reminder (1 day before)
- Class reminder (day of class)
- Payment reminder (3 days before, on day, 3 days overdue)
- Monthly progress report
- Level promotion celebration
- Account reactivation (paused student returns)

## Email Design:
- Beautiful HTML templates
- Academy branding (navy + sky blue)
- Arabic RTL
- Mobile responsive
- Unsubscribe link (per type)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 19: PWA CONFIGURATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- manifest.json with Fluentia branding
- Service worker for offline caching
- Install prompt (Add to Home Screen)
- Push notifications via Supabase + web push
- App icon (Fluentia logo — can use placeholder, admin uploads real one)
- Splash screen
- Offline: show last cached data with "offline" indicator
- Background sync: queue submissions when offline, send when back online

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 20: ERROR HANDLING & FALLBACK STRATEGY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every external dependency WILL fail at some point. The LMS must handle failures gracefully.

## 20.1 Claude API Failures
- **Timeout/500 error**: Show "التقييم التلقائي غير متاح حالياً — سيراجع المدرب عملك مباشرة" and queue for manual trainer review
- **Rate limit hit**: Queue the request and retry with exponential backoff (1s, 2s, 4s, max 3 retries)
- **Over budget**: If monthly AI spend exceeds budget cap (see Cost Control section), disable AI features gracefully and notify admin: "تم الوصول للحد الشهري لخدمات الذكاء الاصطناعي"
- **NEVER block a student submission** because AI is down. Always accept the submission first, then process AI separately.

## 20.2 Whisper API (Voice Transcription) Failures
- **Timeout/error**: Save the voice note without transcription. Show "التفريغ النصي غير متاح — صوتك محفوظ وسيراجعه المدرب"
- **Queue system**: Failed transcriptions go to a retry queue (Supabase Edge Function cron, every 15 min)
- **Fallback**: Trainer can always listen to the original audio regardless of transcription status

## 20.3 Voice Recording Failures (Client-Side)
- **Permission denied**: Clear Arabic message "السماح بالوصول للمايكروفون مطلوب — اضغط هنا للتعليمات" + link to instructions per browser
- **Microphone not found**: "لم يتم العثور على مايكروفون — تأكد من توصيل سماعة أو استخدم جهاز آخر"
- **Recording interrupted** (phone call, lock screen, tab switch on iOS): Auto-save what was recorded so far. Show "تم حفظ التسجيل حتى نقطة الانقطاع — تقدر تكمل أو تعيد التسجيل"
- **Upload failure after recording**: Save locally (IndexedDB), show "التسجيل محفوظ بجهازك — سيتم رفعه تلقائياً عند عودة الاتصال" and retry when online

## 20.4 Supabase Realtime Disconnection
- **Lost connection**: Show subtle "غير متصل" indicator in header (yellow dot)
- **Auto-reconnect**: Attempt reconnection every 5 seconds
- **Stale data warning**: If disconnected >30 seconds, show "البيانات قد لا تكون محدثة — جاري إعادة الاتصال"
- **Activity feed**: Queue locally and sync on reconnect

## 20.5 Network/Offline Handling
- **PWA offline mode**: Show cached data with "وضع عدم الاتصال" banner
- **Submission queue**: If student submits while offline, queue in IndexedDB, sync when back online
- **Conflict resolution**: Last-write-wins for simple data. For submissions, always keep the student's version.

## 20.6 Payment Link Failures
- **Moyasar link broken/expired**: Show "رابط الدفع غير متاح حالياً — تواصل مع الإدارة" + admin phone number
- **Admin notified**: If multiple students report payment link failure

## 20.7 General Principles
- NEVER show raw error messages or stack traces to students
- All error messages in Arabic, friendly tone, with clear next step
- Log all errors to a `system_errors` table (error type, user_id, context, timestamp) for admin debugging
- Admin dashboard: "أخطاء النظام" section showing recent errors and frequency

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 21: BACKUP & DISASTER RECOVERY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 21.1 Supabase Backups
- Free tier: weekly automatic backups only
- Implement additional protection:
  - **Daily data export**: Supabase Edge Function cron job at 3 AM Riyadh time
  - Exports critical tables (students, payments, submissions, attendance, xp_transactions) as JSON
  - Stores export in a separate Supabase Storage bucket `backups/` (auto-delete after 30 days to save space)

## 21.2 Accidental Deletion Protection
- **Soft delete**: Never hard-delete student records, submissions, or payments. Use `deleted_at` timestamp column.
- **Undo window**: For trainer actions (delete assignment, remove student from group), show "تراجع" button for 10 seconds
- **Admin restore**: Admin can view and restore soft-deleted records within 30 days
- **Audit log**: Every destructive action logged (see Audit Log section)

## 21.3 Voice Notes & Files
- Voice notes are the hardest to recover. Once deleted from Storage, they're gone.
- Policy: Voice notes are NEVER auto-deleted. Only admin can manually clean old files (see Storage Strategy).
- Before cleanup: admin sees list of files to be deleted and must confirm.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 22: AI COST CONTROL & RATE LIMITING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 22.1 Monthly Budget Cap
- Admin sets a monthly AI budget in system settings (default: 50 SAR/month ≈ $13)
- System tracks all API costs in an `ai_usage` table:
  ```sql
  - id (uuid, PK)
  - type (enum: 'writing_feedback','speaking_analysis','smart_nudge','progress_report','grammar_check','chatbot','quiz_generation','trainer_assistant','content_recommendation')
  - student_id (uuid, nullable)
  - model (text) -- 'claude-sonnet','whisper'
  - input_tokens (integer)
  - output_tokens (integer)
  - estimated_cost_sar (numeric) -- calculated based on current pricing
  - created_at (timestamptz)
  ```
- When 80% of budget reached → notify admin
- When 100% reached → disable non-essential AI (chatbot, content recommendations, smart nudges). Keep essential AI (writing feedback, speaking analysis) but with reduced limits.
- Admin can increase budget anytime

## 22.2 Per-Student Limits (already in spec, reinforced here)
- Writing feedback: Asas=2/month, Talaqa=4/month, Tamayuz=8/month (admin can override per student)
- Chatbot messages: Asas=10/day, Talaqa=20/day, Tamayuz=unlimited
- Speaking analysis: follows writing feedback limits
- Student sees remaining limit: "باقي لك ٣ تقييمات كتابة هالشهر"

## 22.3 Token Optimization
- **Caching**: If two students in the same level submit similar writing (e.g., same assignment), use cached AI feedback as template and only personalize
- **Smart prompts**: Keep system prompts short and cached. Don't repeat full context every call.
- **Batch processing**: For progress reports, batch multiple students into fewer API calls where possible
- **Model selection**: Use Claude Sonnet (not Opus) for all LMS AI tasks

## 22.4 Whisper Cost Awareness
- Whisper costs ~$0.006/minute of audio
- 14 students × 3 voice notes/week × 1.5 min average = ~$0.38/week = ~$1.50/month
- At 25 students: ~$2.70/month — manageable
- **Compress audio before sending to Whisper**: reduce from WAV/MP4 to compressed format, trim silence
- Track Whisper usage in same `ai_usage` table

## 22.5 Admin AI Dashboard
- Total AI spend this month vs budget
- Breakdown by feature type (pie chart)
- Spend trend over months (line chart)
- Top AI consumers (which students use most)
- Projected monthly spend based on current trajectory

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 23: FILE STORAGE STRATEGY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 23.1 The Problem
- Supabase Free tier: 1GB storage limit
- Voice notes are the biggest consumer: ~1MB per minute of audio
- 14 students × 3 voice notes/week × 1.5 min avg = ~60MB/month
- At 25 students: ~110MB/month → hits 1GB in ~9 months

## 23.2 Compression Strategy
- **Voice notes**: Compress client-side before upload
  - Target: 64kbps bitrate (reduces ~1MB/min to ~500KB/min)
  - Format: Opus codec in WebM container (Chrome) or AAC in MP4 (Safari)
  - Max recording length: 3 minutes (configurable by admin)
  - Trim silence from beginning and end (client-side using Web Audio API)
- **Images** (screenshots for reading tasks):
  - Compress client-side before upload (max 1200px width, 80% JPEG quality)
  - Max file size: 2MB per image
- **PDFs**: No compression needed (trainer uploads are usually small)

## 23.3 Storage Buckets
- `voice-notes/` — student voice recordings
- `submissions/` — images, files from assignments
- `materials/` — teaching materials (PDFs, links)
- `recordings/` — class recordings (if trainer uploads — these are LARGE, consider external hosting like YouTube unlisted)
- `reports/` — generated PDF reports
- `avatars/` — profile pictures (max 200KB, auto-resize)
- `backups/` — daily data exports (auto-delete after 30 days)

## 23.4 Cleanup Policy
- Admin dashboard: "إدارة التخزين" page showing:
  - Total used vs limit (progress bar)
  - Breakdown by bucket (chart)
  - Largest files list
  - Usage projection: "بهالمعدل بتوصل للحد خلال X شهر"
- **Manual cleanup only**: Admin reviews and approves deletion of old files
- **Suggestion engine**: "هذي ملفات أقدم من 6 شهور — تبي تحذفها؟" (with list and total size)
- **Class recordings**: Recommend hosting on YouTube (unlisted) and linking, not uploading to Supabase
- **NEVER auto-delete** voice notes or submissions without admin approval

## 23.5 When to Upgrade
- Show admin warning at 800MB (80%): "التخزين يقارب الحد — فكّر بالترقية لـ Supabase Pro ($25/شهر) للحصول على 100GB"
- At 950MB: restrict new uploads temporarily, urgent admin notification

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 24: ACCESSIBILITY (BASIC)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keep it simple — don't over-engineer, but don't ignore it:

- **Semantic HTML**: Use proper tags (button, nav, main, section, heading hierarchy). No div-only soup.
- **ARIA labels**: On icon-only buttons (notifications bell, close buttons, voice recorder controls)
- **Keyboard navigation**: Tab through all interactive elements. Enter/Space to activate. Escape to close modals.
- **Focus indicators**: Visible focus ring on all interactive elements (don't remove outlines)
- **Color contrast**: Text on dark backgrounds must be at least 4.5:1 ratio. The current design system colors are fine — just don't use #64748b (muted) for essential text on dark backgrounds.
- **Touch targets**: Minimum 44×44px on mobile (already in spec)
- **No motion sickness**: Respect `prefers-reduced-motion` media query — disable animations for users who set this

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 25: ANALYTICS & EVENT TRACKING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 25.1 Simple Analytics (Supabase-based — no external tools)
Track key events in an `analytics_events` table:
```sql
- id (uuid, PK)
- user_id (uuid, FK → profiles, nullable) -- null for anonymous (placement test)
- event (text) -- 'page_view','assignment_submit','voice_record_start','voice_record_complete','quiz_start','quiz_complete','login','share_click','payment_link_click'
- properties (jsonb) -- {page:'/student/assignments', assignment_type:'speaking', duration_seconds:45}
- session_id (text) -- group events by session
- device (text) -- 'mobile','desktop','tablet'
- browser (text) -- 'safari','chrome','other'
- created_at (timestamptz)
```

## 25.2 Key Metrics for Admin Dashboard
- **DAU/WAU/MAU**: Daily/Weekly/Monthly active users
- **Assignment completion rate**: by type, by group, by student
- **Voice recording success rate**: started vs completed (catches iOS issues)
- **Average session duration**
- **Most visited pages**
- **Drop-off points**: where do students stop using the LMS?
- **Payment link click-through**: how many click "ادفع الآن" vs actually pay

## 25.3 Implementation
- Lightweight: just insert rows into `analytics_events` on key actions
- Admin sees: "تحليلات الاستخدام" page with charts
- Auto-cleanup: delete raw events older than 90 days (keep aggregated monthly summaries)
- No external tracking tools (privacy-friendly, no cookies banner needed)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 26: CONTENT VERSIONING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## The Problem:
If a trainer edits an assignment after students have already submitted, the student's submission was based on the OLD version. We need to track this.

## Solution:
- Add `version` (integer, default 1) and `version_history` (jsonb[]) columns to the `assignments` table
- Every edit increments version and stores the previous state in version_history:
  ```json
  [{version: 1, title: "...", description: "...", edited_at: "...", edited_by: "..."}]
  ```
- Each `submission` records `assignment_version` (integer) — the version at time of submission
- If trainer edits after submissions exist: show warning "فيه طلاب سلّموا على النسخة السابقة — متأكد تبي تعدل؟"
- Student sees: if assignment was updated after their submission, show badge "تم تحديث الواجب بعد تسليمك"
- Trainer can view submissions grouped by version

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 27: BUILD PHASES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build in this order. Complete each sub-phase fully before moving to next. Ask before proceeding.

## PHASE 1A: Project Setup + Database + Environment
- [ ] Project setup: React + Vite + Tailwind + Supabase client
- [ ] PWA configuration (manifest, service worker — basic shell)
- [ ] Environment variables setup (.env + .env.example)
- [ ] Supabase: ALL database tables with proper types, constraints, indexes
- [ ] Supabase: ALL RLS policies for every table (test each one)
- [ ] Supabase: Triggers (updated_at auto-update, soft delete, etc.)
- [ ] Supabase: Storage buckets creation (voice-notes, submissions, materials, recordings, reports, avatars, backups)
- [ ] Supabase: Edge Functions skeleton (AI calls, report generation — empty shells for now)
- [ ] `system_errors` table + `ai_usage` table + `analytics_events` table (from new sections)
- [ ] Content versioning columns on assignments table
- [ ] Git repo setup + initial commit + push to GitHub
- [ ] Seed data script: create admin account + sample group + sample students for testing

## PHASE 1B: Authentication + Role System
- [ ] Auth: login page (email/password) — beautiful, RTL, dark theme
- [ ] Auth: registration (admin-created accounts only — no public signup except placement test)
- [ ] Auth: password reset via email (Resend)
- [ ] Auth: magic link option (passwordless)
- [ ] Role detection: after login, detect role from profiles table → redirect to correct portal
- [ ] Protected routes: /student/*, /trainer/*, /admin/* — unauthorized users redirected
- [ ] Session management (auto-logout after 30 days)

## PHASE 1C: Layout Shell + Navigation
- [ ] Layout component: collapsible sidebar (desktop) + bottom tab bar (mobile)
- [ ] Role-based navigation (different menu items per role)
- [ ] Header: notifications bell (placeholder), profile avatar, search icon (placeholder)
- [ ] Dark/light mode toggle (dark default) — stored in localStorage
- [ ] RTL layout everywhere
- [ ] Responsive breakpoints: mobile-first (320px min → tablet → desktop)
- [ ] Page transition animations (Framer Motion — subtle fade + slide)
- [ ] Loading states: skeleton screens (NOT spinners)
- [ ] Empty states: illustrated with Arabic text

## PHASE 1D: Basic Dashboards (Structure + Real Data)
- [ ] Student dashboard: all cards and widgets with real structure (data from seed)
  - Greeting, level indicator, XP, streak, next assignments, next class, payment status
- [ ] Trainer dashboard: pending work, student status, quick actions
- [ ] Admin dashboard: student count, revenue, collection rate, empty seats, churn risk
- [ ] All dashboards fetch real data from Supabase (not mocked)
- [ ] Verify RLS policies work correctly from each role's perspective

## PHASE 2: Core Student Experience
- [ ] Student dashboard (full — all cards and widgets)
- [ ] Assignment system: list, detail, ALL submission types (text, voice recording in browser, image, file, link)
- [ ] Voice recorder component (waveform, timer, playback)
- [ ] Speaking topics page (per-level topic bank, checklist, progress)
- [ ] Class schedule (calendar view, next class, Google Meet link)
- [ ] Class notes (trainer summary + student notes + sharing)
- [ ] Library (recordings, materials, vocabulary bank)
- [ ] Profile page
- [ ] Onboarding flow for new students
- [ ] Daily challenge component

## PHASE 3: Trainer Tools
- [ ] Trainer dashboard (pending work, student status, quick actions)
- [ ] Quick Points Panel (full implementation — designed for live class use)
- [ ] Assignment creation (all types, recurring, attachments)
- [ ] Grading interface (queue, AI feedback display, templates, batch grading)
- [ ] Quick Notes system
- [ ] Class management (schedule, attendance recording, code check-in)
- [ ] Class summary upload
- [ ] Student profile view (from trainer perspective)
- [ ] Group management (view, teams)

## PHASE 4: Gamification
- [ ] XP system (all earning/losing rules, transactions)
- [ ] Streak system (calculation, freeze, warnings, milestones)
- [ ] Teams (creation, manual/random assignment, team XP)
- [ ] Leaderboard (group, team, academy levels)
- [ ] Achievements system (all badges, auto-detection, unlock animation)
- [ ] Gamification levels (XP thresholds, level-up celebration)
- [ ] Challenges (weekly, team, 1v1, 30-day, social)
- [ ] Daily challenge (per-level questions)
- [ ] Variable rewards (Mystery Box, random bonus)
- [ ] Peer Recognition system
- [ ] Activity Feed (group-level, real-time via Supabase Realtime)

## PHASE 5: Communication
- [ ] Group chat with channels/topics (Supabase Realtime)
- [ ] Direct messages (student ↔ trainer)
- [ ] Message reactions
- [ ] Pin messages
- [ ] @mentions
- [ ] Announcements
- [ ] Auto-welcome messages
- [ ] Notification center (in-app)
- [ ] Push notifications (PWA)
- [ ] Email notifications (Resend)
- [ ] Auto-reminders (assignments, classes, payments, streaks)

## PHASE 6: AI Features
- [ ] AI Writing Feedback (Claude API, rate-limited per package)
- [ ] AI Speaking Analysis (Whisper + Claude)
- [ ] AI Smart Nudges (personalized reminders)
- [ ] AI Progress Reports (monthly/bi-weekly/weekly)
- [ ] AI Grammar Checker (optional, toggle)
- [ ] AI Chatbot (learning assistant, rate-limited)
- [ ] AI Vocabulary Builder (spaced repetition, flashcards)
- [ ] AI Trainer Assistant
- [ ] AI Content Recommendations

## PHASE 7: Admin Portal + System Tools
- [ ] Admin dashboard (full analytics)
- [ ] Student management (CRUD, custom pricing, level promotion)
- [ ] Payment management (manual recording, reminders, status tracking)
- [ ] Payment link integration (Moyasar link approach)
- [ ] Trainer management (CRUD, payroll, session tracking)
- [ ] Group management (smart assignment, capacity alerts)
- [ ] Content management
- [ ] Analytics & reports (all charts, exports)
- [ ] Holiday management + Ramadan mode
- [ ] System settings (all configurable values)
- [ ] Data export (Excel/CSV)
- [ ] Global Search (Cmd+K) — searches everything based on role
- [ ] Audit Log (admin only — tracks all important actions)
- [ ] Bulk Actions (batch assignments, bulk notifications, CSV import, batch payments)

## PHASE 8: Assessments, Quizzes & Reports
- [ ] AI Quiz Generator (trainer enters context → Claude generates questions → review → publish)
- [ ] Quick Quiz interface (student-facing: timer, progress, drag-drop, instant results)
- [ ] Full Assessment interface (scheduled, timed, detailed skill breakdown)
- [ ] All question types: multiple choice, true/false, fill blank, reorder, matching, short answer (AI graded)
- [ ] Quiz analytics (class averages, question-level analysis, weak area detection)
- [ ] Placement test (adaptive, public page for marketing)
- [ ] Periodic assessments (based on package frequency)
- [ ] Self-assessment (weekly mood + confidence)
- [ ] Skill Radar (spider chart, historical comparison)
- [ ] Progress reports (AI-generated, trainer-reviewed, PDF)
- [ ] Before/After voice comparison
- [ ] Certificate generation (PDF with QR code)

## PHASE 9: Viral Marketing & Social
- [ ] Share Card Generator (canvas-based image generation)
- [ ] Share buttons for all shareable moments (deep links to each platform)
- [ ] Social share tracking
- [ ] Referral system (unique links, tracking, rewards)
- [ ] Public placement test page (marketing funnel)
- [ ] Testimonial collection system
- [ ] Marketing funnel analytics (tests → meetings → subscriptions)

## PHASE 10: Polish & Advanced
- [ ] Mini games (Word Scramble, Vocab Match, Speed Quiz, etc.)
- [ ] Study timer (Pomodoro)
- [ ] Habit tracker
- [ ] Voice diary
- [ ] Student portfolio
- [ ] Pronunciation lab
- [ ] Session rating
- [ ] Mood tracker
- [ ] Waiting room / pre-class warm-up
- [ ] Parent/sponsor view
- [ ] Smart scheduling
- [ ] Waiting list system
- [ ] Performance optimization (lazy loading, code splitting, image optimization)
- [ ] Final PWA polish (offline support, background sync)
- [ ] Vercel deployment + custom domain setup

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 28: AI QUIZ & ASSESSMENT GENERATOR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## The Problem:
Creating quizzes manually takes hours. With Claude API, the trainer generates professional quizzes in SECONDS.

## How It Works:
1. Trainer opens LMS → "أنشئ كويز"
2. Enters context (free text): specific words, grammar rule, article name, or "comprehensive quiz for Level 2 last month"
3. Selects: type (Quick Quiz or Full Assessment) + target group + question count
4. Claude API generates questions instantly
5. Trainer reviews, edits if needed, publishes
6. Students take the quiz → grades appear instantly → saved to records → XP awarded

## Two Types:

### Quick Quiz (كويز سريع):
- 5-10 questions
- Single topic or skill
- Surprise / anytime (no advance notice needed)
- Student completes in ~5 minutes
- Instant grade display
- +10 XP for completion, +5 bonus for 100% score
- Trainer can set as "pop quiz" during class

### Full Assessment (اختبار تفصيلي):
- 20-40 questions
- Covers large content (month or entire level)
- Students notified in advance (scheduled)
- Timed: configurable (30, 45, 60, 90 minutes)
- Detailed breakdown by skill: grammar, vocabulary, comprehension, writing
- Score contributes to Skill Radar
- Part of periodic assessment (monthly/bi-weekly/weekly per package)
- +50 XP for completion, +25 bonus for 90%+ score

## Question Types:
- **Multiple choice** (اختيار من متعدد) — 4 options, 1 correct
- **True/False** (صح/غلط)
- **Fill in the blank** (أكمل الفراغ) — AI validates answer variations
- **Reorder sentence** (رتّب الجملة) — drag and drop words
- **Matching** (وصّل) — drag and drop pairs
- **Short answer** (إجابة قصيرة) — AI grades using Claude API (compares to model answer)

## Database Tables:

### quizzes
```sql
- id (uuid, PK)
- trainer_id (uuid, FK → trainers)
- group_id (uuid, FK → groups)
- title (text)
- description (text)
- type (enum: 'quick_quiz','full_assessment')
- context_prompt (text) -- what trainer typed to generate
- level (integer, 1-5)
- skill_focus (text[]) -- ['grammar','vocabulary','reading','writing']
- time_limit_minutes (integer, nullable) -- null = no limit
- total_questions (integer)
- total_points (integer)
- xp_reward (integer)
- xp_bonus_perfect (integer) -- bonus for high score
- is_scheduled (boolean, default false)
- scheduled_at (timestamptz, nullable)
- deadline (timestamptz, nullable)
- shuffle_questions (boolean, default true)
- shuffle_options (boolean, default true)
- show_answers_after (boolean, default true) -- show correct answers after submission
- status (enum: 'draft','published','closed')
- created_at (timestamptz)
```

### quiz_questions
```sql
- id (uuid, PK)
- quiz_id (uuid, FK → quizzes)
- order_number (integer)
- type (enum: 'multiple_choice','true_false','fill_blank','reorder','matching','short_answer')
- question_text (text)
- question_image_url (text, nullable)
- options (jsonb) -- [{id:'a', text:'goes', is_correct:true}, ...] for MC
- correct_answer (text) -- for fill_blank, short_answer
- accepted_answers (text[]) -- variations for fill_blank/short_answer
- matching_pairs (jsonb) -- [{left:'word', right:'meaning'}, ...] for matching
- reorder_correct (text[]) -- correct order for reorder
- points (integer, default 1)
- explanation (text) -- shown after answering (why this is correct)
- skill_tag (text) -- 'grammar','vocabulary','comprehension','writing'
```

### quiz_attempts
```sql
- id (uuid, PK)
- quiz_id (uuid, FK → quizzes)
- student_id (uuid, FK → students)
- started_at (timestamptz)
- completed_at (timestamptz, nullable)
- time_spent_seconds (integer)
- total_score (integer)
- max_score (integer)
- percentage (numeric)
- skill_breakdown (jsonb) -- {grammar:80, vocabulary:60, comprehension:90}
- xp_awarded (integer)
- status (enum: 'in_progress','completed','timed_out')
```

### quiz_answers
```sql
- id (uuid, PK)
- attempt_id (uuid, FK → quiz_attempts)
- question_id (uuid, FK → quiz_questions)
- student_answer (text) -- what the student selected/typed
- is_correct (boolean)
- points_earned (integer)
- ai_grade (jsonb, nullable) -- for short_answer: {score, feedback, model_answer}
```

## Trainer Quiz Interface:
- "أنشئ كويز" button on trainer dashboard
- Step 1: Write context/prompt (free text field)
- Step 2: Choose type (Quick/Full), question count, target group, skills to focus on
- Step 3: Click "Generate" → Claude API creates questions
- Step 4: Review screen — edit any question, delete, add manually, reorder
- Step 5: Publish → students get notified
- Can save as draft
- Can clone and modify previous quizzes

## Student Quiz Interface:
- Quiz appears in assignments or as notification
- Timer visible (if timed)
- One question at a time (mobile-friendly) or all at once (option)
- Progress bar: "سؤال ٣ من ١٠"
- For reorder/matching: drag and drop (touch-friendly)
- Submit → instant results with:
  - Total score + percentage
  - Per-question review (correct/wrong + explanation)
  - Skill breakdown chart
  - XP earned animation
  - Share card: "حصلت ٩٠٪ في كويز القرامر! 🎯"

## Admin/Trainer Analytics:
- Class average per quiz
- Question-level analysis (which questions most students got wrong → identifies weak areas)
- Student comparison across quizzes over time
- Export results as Excel

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 29: GLOBAL SEARCH, AUDIT LOG & BULK ACTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 22.1 Global Search (Cmd+K / Ctrl+K)
- Search bar accessible from anywhere (keyboard shortcut + icon in header)
- Students search: assignments, vocabulary words, class notes, messages, topics
- Trainers search: students, assignments, submissions, class notes
- Admin searches: everything (students, trainers, payments, groups, settings)
- Results grouped by category with icons
- Click result → navigate directly to it
- Recent searches saved

## 22.2 Audit Log (Admin Only)
- Every important action is logged:
  - Student created/edited/deleted/paused/promoted
  - Payment recorded/edited
  - Level changed
  - Group changed
  - Trainer assigned/removed
  - Settings changed
  - Assignment created/deleted
  - Custom price set
- Each log entry: who, what, when, old value → new value
- Filterable by: action type, user, date range
- Exportable

### audit_log table:
```sql
- id (uuid, PK)
- actor_id (uuid, FK → profiles) -- who did it
- action (text) -- 'student.create','payment.record','level.promote', etc.
- target_type (text) -- 'student','payment','group', etc.
- target_id (uuid)
- old_data (jsonb, nullable)
- new_data (jsonb, nullable)
- description (text) -- human readable: "Admin promoted الهنوف from Level 2 to Level 3"
- ip_address (text, nullable)
- created_at (timestamptz)
```

## 22.3 Bulk Actions
- **Trainer:**
  - Assign one assignment to multiple groups at once
  - Send announcement to all groups
  - Batch grade (same grade for multiple submissions)
- **Admin:**
  - Send notification/email to all students or filtered group
  - Export all student data at once
  - Record payments for multiple students
  - Change settings for multiple students (e.g., package upgrade for a group)
  - Create accounts in bulk (CSV upload with name, email, level, group)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 30: CRITICAL REMINDERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **RTL EVERYWHERE** — Arabic is the primary language. All text, layouts, navigation = RTL.
2. **MOBILE FIRST** — Most students are young Saudi women on iPhones. Design mobile first, then desktop.
3. **SAFARI/iOS VOICE RECORDING** — Test voice recording on Safari. Use correct MIME types per browser. Handle interruptions gracefully.
4. **WARMTH** — This is NOT a corporate tool. Use friendly language, emojis, personal touches.
5. **REAL DATA** — The database schema must handle ALL the complexity (custom pricing, legacy students, multiple roles, teams, etc.)
6. **PERFORMANCE** — Lazy load everything. Skeleton screens. Fast first paint. Under 3 seconds.
7. **DARK MODE DEFAULT** — Matches academy branding. Light mode as option.
8. **VOICE RECORDING** — Must work flawlessly in mobile browsers. This is core functionality.
9. **AI IS A HELPER** — Every AI output must be reviewable by the trainer. Never auto-publish without option to review.
10. **MOYASAR** — Use payment link approach for now. Build the billing UI fully. Add API integration later when approved. Admin has a settings field to paste payment link. Student sees "ادفع الآن" button that opens the link.
11. **TELEGRAM COEXISTS** — Don't try to replace Telegram. The LMS is for structured learning; Telegram is for the social warmth.
12. **NO WHATSAPP IN LMS** — WhatsApp automation is handled separately. No WhatsApp integration in the LMS.
13. **PREMIUM DESIGN** — Every screen should look like it belongs in a $20M product. No generic UI. No stock templates. Custom, polished, beautiful.
14. **SUPABASE RLS** — Security is non-negotiable. Every table needs proper RLS policies. Test each one.
15. **SUPABASE FREE TIER** — We're on the free tier. Respect the 1GB storage and 500MB database limits. Compress files. Monitor usage.
16. **GAMIFICATION IS CORE** — Not an afterthought. Points, streaks, teams, leaderboards, achievements should be visible and integrated into every interaction.
17. **SOCIAL PROOF** — Students must see each other's activity. This drives engagement more than anything else.
18. **SHAREABLE EVERYTHING** — Every achievement, every milestone = one-tap share with beautiful card.
19. **ERROR HANDLING** — Never show raw errors. Always Arabic, always friendly, always with a clear next step.
20. **SOFT DELETE** — Never hard-delete student data. Always use soft delete with restore capability.
21. **AI COST CONTROL** — Track every API call. Respect budget caps. Cache where possible.
22. **CORRECT TERMINOLOGY** — "لقاء مبدئي مجاني مع المدرب" NOT "كلاس تجريبي مجاني". This matters.
23. **CONTENT VERSIONING** — Track assignment versions. Submissions record which version they were based on.
24. **ANALYTICS** — Track key events in Supabase. Admin needs to see DAU, completion rates, drop-off points.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# END OF SPECIFICATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# This spec is your source of truth.
#
# START WITH PHASE 1A ONLY.
# Complete it, summarize what you built, then STOP.
# Wait for approval before moving to Phase 1B.
#
# Build this. Make it extraordinary.
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
