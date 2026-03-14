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

**Stats:** 61 pages, 17 edge functions, full PWA, 43+ DB tables, 96+ RLS policies.

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

# Deploy edge functions:
supabase functions deploy FUNCTION_NAME --project-ref nmjexpuycmqcxuxljier

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
