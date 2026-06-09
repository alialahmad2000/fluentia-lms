# Fluentia LMS — Feature Roadmap & Status Ledger

> **Purpose:** the single answer to "is X live, shelved, or dead?" — so no session
> re-discovers this by archaeology. FLUENTIA-SPEC.md is the *historical* build spec;
> CLAUDE.md's change log is the *event* record; THIS file is the *current state*.
> Update it whenever a feature flips state.
>
> Last updated: 2026-06-09

---

## ✅ ACTIVE — live for students/staff

| Area | Feature | Notes |
|---|---|---|
| Curriculum | 6 levels × 72 units × 7 skill tabs (reading, grammar, listening, speaking, writing, vocabulary, assessment) | Assessment & pronunciation excluded from unit-% |
| Speaking | AI conversation mode (coach "Layla") + classic record-once | Graded like record-once via summary row |
| Writing | AI assistant (7 action chips, level-aware, never writes the piece) | Rate-limited 20/h |
| Grammar | 72 lessons voiced in Dr. Ali's Najdi clone + sectioned layout | TTS recipe locked |
| Listening | FLUX hero images + 7Q/task ×7 types ×5 difficulty tiers | Difficulty badges shipping from the parallel session |
| Vocabulary | Chunked flashcards, quiz, SRS daily review, Hard Words, Spelling Lab (7,575 words) | Constellation/unified vocab_cards UI is on branch `vocab-restructure` — NOT merged; never re-run its backfill |
| Library | Bilingual novels, veil-lift reader, midnight reading room | Awaiting Ali's final design approval |
| Chat | Premium group+DM chat (presence, voice notes, reactions, mentions, pins, lenses) | P0+P1 merged; P2 (video, transcription) on branch `chat-p2`; "Majlis" obsidian redesign approved but prototype not ported |
| Assessments | Unit Mastery (70%), Level Exit, Placement, Mock Exam (reveal gates, AI writing grading + fallback) | |
| Retention | Smart Homework, Daily Partner, Weekly Reports, Lesson Briefs, auto-submit on expiry | Modules 1–5 |
| Gamification | XP, streaks, teams, leaderboard, duels, mystery box, achievements, streak battles | Competition page sidebar-hidden, drawer/URL only |
| IELTS | Atelier track (10 sub-routes), package-gated | Admin IELTSManagement tabs partly stubs |
| Access | SubscriptionGate via `students.access_expires_at` (+ /admin/subscriptions control) | Lapsed → blurred renew screen |
| Trainer | Teacher App rebuild (home, students, grading, class hub, curriculum preview, unit locks) | Legacy v2 cockpit routes still mounted |
| Admin | Users (+impersonation = REAL session swap — test on throwaway students), groups, curriculum editor, content, payments, affiliates, announcements, analytics, AI dashboard, audit log, bug reports (two-way tickets), audio telemetry, system diagnostics | |
| CS Ops | Lead CRM + scheduling (/team, /admin HR hub, agent role) | gcal reminders + Hajar/Manal accounts pending Ali |
| Ops/AI | Academy digest (daily/weekly email, now incl. 🩺 platform-health from client_error_log), daily letters, churn prediction, trainer insights, error-pattern analysis | 25+ edge functions; ~0.5 SAR/student/mo |
| Health | client_error_log capture (global handlers + ErrorBoundary + rate-limited RPC) + /admin/system viewer + digest alerting | **Check this FIRST when students report bugs** |

## 🟡 SHELVED — built, intentionally hidden (do NOT resurface without Ali)

| Feature | State | Where |
|---|---|---|
| Pronunciation tab & alerts | Hidden 2026-05-19 (UX issues); files preserved | UnitContent/StudentSpeaking markers |
| Personalization (interest-based reading variants) | Backend + 1,152 seeded rows live; UI mount points commented 2026-05-19 | `usePersonalizedReading.js` |
| Weekly tasks quick-access CTA | Feature live, CTA hidden | dashboard band |
| Adaptive test | Route exists, placeholder | `StudentAdaptiveTest.jsx` |
| AI insights (student-facing) | Sidebar-hidden, drawer/URL reachable | |
| Trainer v2 legacy pages | Shadowed by Teacher App, routes still mounted | `trainer/v2/*` |

## ❌ REMOVED — deprecated; never re-surface on dashboard/nav

`weekly-tasks (surface)`, `assignments`, `adaptive-test (nav)`, `ai-insights (nav)`, `pronunciation (nav)`, `StudentSchedule/Recordings/Challenges/Conversation/CreatorChallenge (.deprecated.jsx)`, 25 IELTS v1 `.legacy` pages (redirect to Atelier).

## 🔭 APPROVED BACKLOG (Ali, 2026-06-09)

1. **Curriculum Mistake Detector** — *report-only*: AI aggregates wrong-answer/distractor stats + audio failures, flags SUSPECTED curriculum mistakes for human review. **Explicitly NOT self-healing — the AI suspects, we fix.**
2. **Vocab confusion maps** — per-student confused word pairs → contrastive drills + trainer insights.
3. **Personal Phrasebook (Najdi voice)** — Claude diffs speaking transcripts vs native phrasing; corrected sentences voiced in Dr. Ali's clone.
4. **Offline submission queue** — answers survive network drops mid-quiz.
5. **Playwright smokes** — login → unit → save → grade money paths (suppress onboarding modals via `fluentia_onboarded_<id>`).
6. ~~Class-that-writes-itself~~ — **rejected by Ali 2026-06-09.**

## ⚠️ STANDING RULES (cost real pain when violated)

- A push is NOT a deploy — verify Vercel **Ready** + prod alias serves the new build.
- Suspect a stale PWA/service-worker build FIRST; never let the SW cache streamed media (Safari Range bug).
- Reproduce in the real failing environment (headless **webkit** for Safari bugs) before claiming fixed.
- "Remove" a UI item = HIDE it (keep data + route) unless Ali explicitly confirms deletion.
- Arabic brand name is **طلاقة** — never transliterate Fluentia.
- All student-facing 2nd-person Arabic goes through `src/i18n/gender.js` (`useG`/`pickGender`).
- Guard vars (`readOnly` etc.) must be declared IN the component that uses them — parent-scope guards in fire-and-forget callbacks = silent save loss (bit us twice).
- Parallel sessions share this tree: no branch/HEAD surgery; isolated prod fixes go via the Git Data API from a `/tmp` stage (`scripts/_commit-to-main.cjs` pattern); `git add` precise paths only.
- Never tell a student "fixed" unless genuinely fixed + verified.
