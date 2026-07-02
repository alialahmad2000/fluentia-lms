# PROJECT-STATUS-001.md — Fluentia Academy (أكاديمية طلاقة)

**Last updated:** 2026-07-02
**Authority:** This is the current source of truth. Supersedes the unnumbered `PROJECT-STATUS.md` (Session 20, April) and `FLUENTIA-LMS-MEGA-PROMPT-V2.md` (March vision doc). `FLUENTIA-SOURCE-OF-TRUTH.md` remains valid for locked design-system/nav decisions.

---

## 🆕 CHANGELOG (what's new in 001)

**The Fardi custom-curriculum engine shipped — and the first fully-custom private student is live.**

1. **Reusable per-student custom curriculum** (commit `6bf2237`): `curriculum_units.owner_student_id` + `custom_sort`, `students.uses_custom_curriculum`. Generic units (`owner_student_id IS NULL`) are byte-for-byte unchanged for everyone. The `(level_id, unit_number)` UNIQUE became a partial index so many Fardi students can each own a `unit_number=1` unit at the same level. Migration `20260702130000`.
2. **RLS isolation fix (real security work):** every curriculum table's read policy was `auth.role()='authenticated'` — any student could read all curriculum. Now owner-scoped via three SECURITY-DEFINER helpers (`cc_unit_visible` / `cc_reading_visible` / `cc_grammar_visible`); `admin_all_*` / `service_*` untouched.
3. **Sara Al-Asmari's "Career English for IT" track** (commit `9787b5f`): 8 custom B1 units in her field, original content, mirroring the real L3 blueprint (Arabic Unit Brief + IT reading + MCQs + 7 vocab + grammar-in-context + speaking/writing task).
4. **Goal-framed home + Fardi accent** (commit `1255426`): `FardiHero` branch in the live `SpotlightDashboard` (mission headline → X من 8 → next 1:1 session → XP demoted → purple CTA); scoped purple via `--accent-individual` + `html[data-track="fardi"]` remapping both `--accent-sky*` (legacy) and `--ds-accent-primary*` (design-system). `LayoutShell` sets `data-track` only for custom students. No global leak. `useLevelJourney` made custom-aware (was showing 12 generic + 8 custom = 20 mixed).
5. **Audio for Sara's units** (commit `ebfdd65`): 8 passages + 56 vocab via ElevenLabs (voice Alice), each re-encoded **mono (`ffmpeg -ac 1`)** — the fix for the Safari channel-drift silent-audio bug — in `curriculum-audio`; wired to `reading_passage_audio` + `curriculum_readings.passage_audio_url` + `curriculum_vocabulary.audio_url`.
6. **ElevenLabs is BACK** — memory said it was retired ~June 8; Ali now has a fresh pay-as-you-go key (small char budget, verify balance before big runs). Not dead.
7. **Sara's 12 sessions** given the recurring Meet link `https://meet.google.com/qrc-paov-ruw`.

**Deferred (not built):** karaoke / word-level highlight synced to audio (needs ElevenLabs with-timestamps generation).

---

## 🏢 BUSINESS

Premium online English academy for Saudi adult learners. TikTok → WhatsApp lead gen. Ali is founder, admin, primary instructor, sole developer. ~20 active students.

**Packages (SAR/mo, monthly rolling):** L0 Student 750 · L1 Group 1,200 · L2 تميّز 2,200 · L3 الفردي (private) 3,000 · IELTS 5,000. B2B/corporate deferred 6–12 months. **Pricing integrity: never discount below package floor.**

**Brand voice:** No معهد / دورة / مذهل / مميز / استثنائية / الأفضل / حبيبتي. No discount framing. Free intro = "لقاء مبدئي مجاني" not "حصة تجريبية." Arabic UI respects grammatical gender per `student.gender`. Daily letters signed by the student's assigned trainer.

## 👥 PEOPLE

- **Ali** — founder, admin, primary instructor, sole dev.
- **Rasheed Osman** (kingnamzo21@gmail.com) — trainer, A1 + B1 groups, English UI.
- **Manal** — lead qualification (TikTok DM → WhatsApp). **Hajar** — scheduling.
- **Ibrahim Mtotomeka** — teacher onboarding (Malawi, smartphone-only constraint).
- **د. محمد (Dr. Mohammed)** — trainer (goldmohmmed@gmail.com), B1 (المجموعة 4) + A1 (المجموعة 2).
- **وجدان الحارثي** (wejdan.alharthi02@gmail.com) — first private (Fardi) student; the config template for private students.
- **سارة علي الأسمري** (Sarahasmari6@gmail.com, 25) — NEW private student, July. Analyst II — Infrastructure Services (IT/digital transformation). Goal: **speak & explain IT system issues fluently on live calls (esp. with the Indian support team) without freezing or translating.** B1. Fully provisioned + fully custom (see below). Trainer: **Ali**.

## 🧱 TECH STACK

React 18 + Vite + Tailwind + Framer Motion + TanStack Query + Zustand + **Supabase** (Frankfurt, ref `nmjexpuycmqcxuxljier`, Pro) + Vercel auto-deploy + Claude API (runtime eval only) + **ElevenLabs** (payg key, back online) + ManyChat (4473853) + WhatsApp Business (+966558669974).
Dev: `/Users/dr.ali/projects/fluentia-lms` (repo `alialahmad2000/fluentia-lms`) and `/Users/dr.ali/projects/fluentia-site` (`alialahmad2000/fluentia-site`).
**Supabase access:** MCP stdio + `SUPABASE_ACCESS_TOKEN` in the launching shell (read-only). When MCP isn't loaded: repo's `_mgmt-query.cjs` (Management API) for reads, service-role Node script for writes — both proven this session. Always `information_schema` first.

## 📚 LMS STATE (fluentia-lms)

Built across 10+ phases. **Curriculum:** `curriculum_units` (72 units, L0–L5) + Unit Journey V3 (Unit Brief → Mission Grid → Debrief → Level Journey Map). Child content: `curriculum_readings` (+ `reading_passage_audio`), comprehension questions, `curriculum_vocabulary`, speaking tasks, grammar-in-context.

**Active systems:** IELTS Atelier V3 (Phases 0–5), retention system (17 tables), Speaking Hub, grammar PDFs (Atelier series Vols I–V), Nabih AI mentor, unit mastery assessments, trainer portal V3 (5 routes), communication system, gamification/XP/streaks/leaderboard, SRS vocabulary (`vocabulary_bank`, per-student), progress reports, push notifications (VAPID), PWA.

**Live dashboard:** "Living Atlas" `SpotlightDashboard`. Token system: new code `var(--ds-*)`; legacy `--accent-*` still valid (theme-aware). Themes: Aurora Cinematic, Night Sky Luxurious (default), Modern Minimal.

**NEW — per-student custom curriculum engine (reusable for all Fardi):** see changelog. Files: `_useCurriculumData.js` (branches on `uses_custom_curriculum`), `useLevelJourney` (custom-aware), `FardiHero` in `SpotlightDashboard`, `LayoutShell` (`data-track="fardi"`).

**Open issues:** push subscription auto-retry (permission-granted-but-no-subscription edge case). *(Safari listening silence now mitigated for custom audio via `-ac 1`; apply the same on any future ElevenLabs concat audio.)*

### Sara's fully-custom account (reference implementation)
- **profiles/students:** B1 (`academic_level=3`), `package='private'`, `track='foundation'` (mirrors Wejdan), `group_id=المجموعة 4` (content access only — she doesn't attend group; her real teaching is her private sessions), `status='active'`, `custom_price=3000`, `writing_limit_override=30`, `must_change_password=true`, gender female, `uses_custom_curriculum=true`, `custom_mission_ar` set.
- **8 custom units** (`custom_sort` 1–8), each with audio.
- **12 `private_sessions`** with Ali, Jul 4–29, Meet link set. Schedule: Sat & Wed 11:00 PM (around Ali's 2–10 PM shift), Mon 6:00 PM (his day off).
- **IT vocab** in `vocabulary_bank` (32 words) + the 56 unit-vocab words (with audio).
- **Note:** `students.payment_day` DOES exist (left unset). `must_change_password` lives on **profiles**.

## 🌐 LANDING (fluentia-site)

Aurora constellation hero locked. Build surface `/atelier`; live `/` untouched until approval. Velvet Midnight palette: navy #060e1c, sky #38bdf8, gold #fbbf24. TikTok Pixel `D79DFR3C77UA3HU6E70G`, GA4, UTM must never break. `DESIGN.md` is the next deliverable before section-by-section build.

## 📣 MARKETING

**TikTok:** account `7612136214443016209`, Pixel `D79DFR3C77UA3HU6E70G`. Active DM Lead Gen campaign (July, 100 SAR/day, female 18–34 Saudi, Spark Ad). Bottleneck is post-click funnel (~1.2% lead-to-paid), not lead volume. **ManyChat WhatsApp qualifier = highest-leverage unbuilt piece:** edit Default Reply Flow (account 4473853) → AI Step with Fluentia prompt (Arabic, 3–4 lines, free-trial CTA, 500–1,500 SAR/mo). Spark Ads auth: always use the app Copy button (preserves `+`).

## 🧠 KEY PRINCIPLES

- **Cost:** Claude Code = ALL generation during dev. Claude API at runtime = ONLY open-ended eval (writing/speaking feedback, Whisper). Never runtime API for plan/schedule/rule-encodable logic.
- **Schema discovery before every DB query** (information_schema + a real-count probe). `is_published=false` caused a 0-units outage (2026-04-14).
- **Debug:** Phase A read-only diagnosis first; 5 Whys not symptom-patching; audit fundamentals (RPC SECURITY DEFINER, RLS, auth chain) before adding complexity.
- **Pre-launch (student-facing):** every write-RPC verified SECURITY DEFINER; end-to-end test as a real non-admin; rollback plan; observability live; never launch same session it was built.
- **Student trust erodes fast, rebuilds slow.** Working simple > broken sophisticated. Delay over ship-broken.
- **conversation_search first** before assuming Fluentia strategy/pricing/decisions.

## 🔧 PATTERNS

- Every Claude Code prompt = downloadable `.md` (via `create_file` + `present_files`), invoked `Read and execute /Users/dr.ali/Downloads/FILENAME.md`. Prompts stay in Downloads. Never inline. Complete, no manual find-and-replace.
- No confirmation gates in build prompts: discover → build → self-check → commit → push → Vercel deploys → Ali reacts to live result. (Read-only discovery is not a gate — it's mandatory.)
- React Hooks: ALL hooks at top before any conditional return; role/flag gates AFTER hooks (React #310).
- Always `profile.id` (not `user.id`) for student reads/writes; `.select()` after every write to surface RLS blocks.
- No local `vite build` (machine OOMs) — Vercel builds on push.
- No hardcoded hex in new code — design tokens only.
- Student account emails: `message_compose_v1 (kind=email)`, Arabic, self-contained. Teacher outreach: minimal first reply, no salary/details until live call.
- Playwright/Chromium PDF: `wait_until="load"` → `document.fonts.ready` → `wait_for_timeout(1400)` → capture. Arabic in `.arx` spans, Readex Pro, `letter-spacing:0`.

## 🗺️ ON THE HORIZON

- ManyChat Default Reply Flow AI Step (immediate — lead conversion).
- Landing: lock direction → `DESIGN.md` → section-by-section build on `/atelier`.
- Push notification auto-retry fix.
- Vercel deploy-fail alert (Slack/WhatsApp) — 42-min silent outage 2026-04-14 precedent; 24k+ unread inbox.
- (Optional) Karaoke word-highlight audio; Sara's plan PDF; B2B tier (deferred).

## 🎨 ATELIER PDF DESIGN TOKENS

Cream #FBF6EC, emerald #15604B, gold #A9842A, rust #9C4324. Fonts: Cormorant Garamond, Space Grotesk, Inter, Readex Pro. ElevenLabs cast: Alice (British female), George (British male), Daniel/Matilda (IELTS).

---
*Highest-numbered PROJECT-STATUS file is source of truth. Older files are history — never overwrite them.*
