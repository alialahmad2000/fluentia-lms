# Personalization Rollback — Phase A Audit Report
**Generated:** 2026-05-17T10:52:13Z
**Auditor:** Claude Code (Opus 4.7, 1M context)
**Scope:** Read-only inventory of where personalization touches the LMS
**Trigger:** Ali's directive 2026-05-14 — unified curriculum is the single default; personalization may only exist as clearly-secondary bonus that never replaces canonical content. Applies to listening and every future skill.

---

## ⚠️ EXECUTION CAVEAT — DB SECTIONS BLOCKED

**Sections 1 (DB Surface) and 4 (Student Impact) could not be executed in this session.**

- The Supabase MCP server is not loaded in the active session (no `mcp__supabase__*` tools surfaced).
- `.mcp.json` at repo root specifies a Windows-only invocation (`command: "cmd"`, `/c`, `npx …`), which does not run on macOS. The accurate production setup (per memory of prior sessions) is HTTP OAuth at `https://mcp.supabase.com/mcp` — that transport is what the project actually uses, but it still requires a Claude Code restart in the project directory + `/mcp` OAuth to surface the tools in-session.
- **Remediation to unblock these sections:** restart Claude Code from inside `/Users/dr.ali/Projects/fluentia-lms`, run `/mcp` to OAuth-authenticate against the hosted Supabase MCP, then re-run only Sections 1 + 4 of the prompt; the rest of this report stands.

DB facts in this report are inferred from migrations and code (DDL, RLS policies, queries) — they are **structural**, not row-counted. CLAUDE.md's change log records that Phase D content generation completed with `1,152 rows in personalized_readings, 0 FK orphans, all is_published=TRUE`. That figure is cited where relevant but was not re-verified live.

---

## 1. DB SURFACE

### Tables found
Source: `supabase/migrations/20260512130000_create_user_interests.sql` and `supabase/migrations/20260512130001_create_personalized_readings.sql`. No other personalization tables exist in the migrations tree — see Section 1.5.

| Table | Rows (per CLAUDE.md log) | Purpose | Has student-progress references? |
|-------|--------------------------|---------|----------------------------------|
| `public.user_interests` | not re-verified (one row per opted-in student max) | Stores `interests TEXT[]` (≤3 of 8 buckets) per `user_id`, plus `has_completed_survey BOOLEAN`, `dismissed_at TIMESTAMPTZ`, `survey_completed_at TIMESTAMPTZ`. RLS: self-read / self-upsert / self-update only. CHECK constraint pins values to the 8-bucket whitelist. | No |
| `public.personalized_readings` | 1,152 (per CLAUDE.md 2026-05-12 entry) | One row per `canonical_reading_id × interest_bucket`. Columns: `id`, `canonical_reading_id` (FK → `curriculum_readings.id` ON DELETE CASCADE), `interest_bucket` (CHECK list), `title`, `body`, `word_count`, `cefr_level`, `grammar_focus[]`, `target_vocabulary[]`, `tags[]`, `is_published`, `generated_by`, `generation_batch`, `qa_word_count_ratio`, `qa_vocab_coverage`, `qa_passed`, `created_at`. | **No** — no `*_progress` or `*_submission` column anywhere references `personalized_reading_id` or `variant_reading_id` (verified via grep across `src/` and `supabase/migrations/` — 0 hits outside the create-table file and the read-side hook/components). |

### Variant coverage matrix (by CEFR × bucket)
**Not re-verified live.** Per CLAUDE.md's 2026-05-12 "Phase D COMPLETE" entry, every (level × bucket) cell holds 24 variants for a total of 1,152 (144 canonical readings × 8 buckets), QA pass rate 100%, avg vocab coverage 0.98, avg word-count ratio 0.87. Levels covered: Pre-A1 (192), A1 (192), A2 (192), B1 (192), B2 (192), C1 (192).

To verify live once MCP is restored, run:
```sql
SELECT cefr_level, interest_bucket, COUNT(*)
FROM public.personalized_readings
GROUP BY 1, 2 ORDER BY 1, 2;
```

### Students with interests set
**Not measured live.** To verify once MCP is restored, run:
```sql
SELECT COUNT(*) AS total_rows,
       COUNT(*) FILTER (WHERE COALESCE(array_length(interests, 1), 0) > 0) AS rows_with_interests,
       AVG(array_length(interests, 1))::NUMERIC(4,2) AS avg_interests_per_student
FROM public.user_interests;
```

### Listening / grammar / vocab personalization tables present?
**None.** The migrations tree (`supabase/migrations/`) contains no table named `personalized_listening`, `personalized_grammar`, `personalized_vocab`, or anything matching `%listening_variant%` / `%per_interest%`. Only `user_interests` and `personalized_readings` exist.

---

## 2. CODE SURFACE

### Files touching personalization
Source: `rg -l 'personali|user_interests|interest_bucket|PersonalizedReading|usePersonalizedReading|useUserInterests|InterestSurvey|getBucketByKey' src/` (after removing false-positive hits where "interest"/"personali" appears in unrelated content — see Section 2.5).

| Path | Imports | Mount point | Notes |
|------|---------|-------------|-------|
| `src/lib/personalization/interest-buckets.js` | (none — defines the 8 buckets + `MAX_INTERESTS=3` + `getBucketByKey`) | — | Source of truth for buckets. |
| `src/hooks/useUserInterests.js` | `supabase`, `useAuthStore` | — | Reads/writes `user_interests` row. `shouldShowInterestSurvey()` enforces the 7-day cooldown after dismissal. |
| `src/hooks/usePersonalizedReading.js` | `useUserInterests` | — | Reads `personalized_readings` filtered by student's interests; returns the first matching variant by priority order. Returns `null` when no interests set. |
| `src/components/personalization/InterestSurveyCard.jsx` | `useUserInterests`, `useUpdateUserInterests`, `shouldShowInterestSurvey` | `StudentDashboard.jsx:152` (between CompetitionBanner and HeroBlock) | Dismissible card — dismissal sets `dismissed_at`; 7-day cooldown then re-shows. Returns `null` when `shouldShowInterestSurvey()` is false. |
| `src/components/personalization/PersonalizedReadingCard.jsx` | `usePersonalizedReading`, `PersonalizedReadingDrawer`, `getBucketByKey` | `ReadingTab.jsx:860` (BELOW canonical passage card) | Renders `null` when no variant. Opens drawer on click. |
| `src/components/personalization/PersonalizedReadingDrawer.jsx` | (Framer Motion, lucide) | (rendered by PersonalizedReadingCard) | Slide-in right-aligned aside, `w-full max-w-[640px]`, full-height (`inset-y-0`), with `bg-black/60 backdrop-blur-sm` overlay covering canonical. |
| `src/components/personalization/InterestsSettingsSection.jsx` | `useUserInterests`, `useUpdateUserInterests`, `INTEREST_BUCKETS` | `StudentProfile.jsx:624` (Settings tab) | View/edit interests. No explicit "bonus / optional" label — copy reads "تستخدم هذه الاهتمامات لتخصيص النسخ البديلة من القراءات." Empty state: "لم تختر أي اهتمامات بعد. اضغط 'تعديل' للبدء." |
| `src/pages/student/StudentDashboard.jsx` | `InterestSurveyCard` | — | See above. |
| `src/pages/student/StudentProfile.jsx` | `InterestsSettingsSection` | — | See above. |
| `src/pages/student/curriculum/tabs/ReadingTab.jsx` | `PersonalizedReadingCard` | line 7 import / line 860 render | The only curriculum-tab file that imports a personalization component. |
| `src/components/ai/AIContentRecommendations.jsx` | (false positive — does NOT touch `user_interests` / `interest_bucket` / `personalized_readings`; the word "personali" appears only in unrelated AI-recommendation copy) | — | Excluded from the personalization surface. |

### 2.2 Reading page render path
- **File:** `src/pages/student/curriculum/tabs/ReadingTab.jsx`
- **Canonical always rendered?** **YES.** The canonical passage card is structural — its render block (lines ~666–857) is unconditional with respect to `user_interests`. The only conditionals on the canonical body are content-driven (`reading.before_read_exercise_a`, `reading.passage_image_urls?.length > 0`, `audioData`), not personalization-driven. Evidence (canonical wrapper, line 666):
  ```jsx
  <div className="relative rounded-2xl overflow-hidden bg-slate-900/50 border border-slate-800/60 hover:border-slate-700 transition-colors duration-300">
  ```
  and the personalized card sits OUTSIDE that container, at line 860:
  ```jsx
  {/* Personalized variant — shown below canonical for students with interests */}
  <PersonalizedReadingCard canonicalReadingId={reading.id} />
  ```
- **Variant card mount position:** **BELOW** the canonical passage card (line 860, after the `</div>` that closes the canonical card at line 857). It precedes the AI Arabic Summary block and the Vocab Quiz block.
- **Visual prominence (card itself):** **subordinate** — see Section 3 for class comparison.
- **Visual prominence (drawer when opened):** **dominant** — the drawer is `fixed inset-y-0 end-0 z-50 w-full max-w-[640px]` with a `fixed inset-0 z-40 bg-black/60 backdrop-blur-sm` backdrop. While open, it covers the canonical passage and dims the rest of the page.
- **Canonical progress preserved?** **YES.** The student's reading-comprehension answers, vocabulary submissions, audio progress, and "completion" status are all written against `curriculum_readings.id` and tracked through `student_curriculum_progress` / `activity_attempts` — none of which reference `personalized_readings.id` (verified via grep; 0 hits). Opening or skipping the drawer has zero effect on canonical progress; there is no submit, no questions, no scoring inside the drawer (Drawer only renders `{variant.body}` text + header chrome).

### 2.3 Dashboard survey card
- **File:** `src/components/personalization/InterestSurveyCard.jsx` (rendered from `src/pages/student/StudentDashboard.jsx:152`)
- **Placement:** Slot 1.5 of the dashboard's `StaggeredList`, between `<CompetitionBanner />` (slot 1) and `<HeroBlock />` (slot 1). That is, **above the dashboard hero**, very near the top of the page on every student dashboard load.
- **Dismissible:** **YES** — both the top-right `X` button and the "ليس الآن" CTA call `useUpdateUserInterests().mutateAsync({ interests: [], dismissed: true })`, which sets `dismissed_at` on the `user_interests` row.
- **Skippable:** Same as dismissible — yes.
- **Persistent / re-prompts:** **YES with a 7-day cooldown.** `shouldShowInterestSurvey()` returns `true` if `dismissed_at` is older than 7 days AND the student has not completed the survey. So a student who dismisses today will see it again next week, indefinitely, until they either (a) save interests with "حفظ" (which sets `has_completed_survey = true` permanently) or (b) keep dismissing weekly.
- **Blocks other content:** **NO** — it is an inline card in the dashboard flow; the rest of the dashboard renders normally below it. It does not modally block.
- **Appears on every load until completed?** Yes, subject to the 7-day re-prompt window.

### 2.4 Settings surface
- **File:** `src/components/personalization/InterestsSettingsSection.jsx`, mounted at `src/pages/student/StudentProfile.jsx:624`.
- **Labeled as bonus/optional?** **NO explicit "bonus" / "اختياري" / "إضافي" label.** The subtitle reads "تستخدم هذه الاهتمامات لتخصيص النسخ البديلة من القراءات." — descriptive, not framed as optional bonus.
- **Opt-out possible (i.e. clear all interests)?** **PARTIAL.** A student in edit mode can deselect all chips and click "حفظ"; the `useUpdateUserInterests` mutation accepts `interests: []` and sets `has_completed_survey = true`. However, the `حفظ` button is `disabled` when `selected.length === 0` ONLY on the initial `InterestSurveyCard` flow (`disabled={selected.length === 0 || updateMutation.isPending}` at `InterestSurveyCard.jsx:142`). The `InterestsSettingsSection` save button has no such disable rule (`disabled={updateMutation.isPending}` at `InterestsSettingsSection.jsx:136`), so once an existing user opens edit mode they CAN clear everything and save. Net: a student who never enters interests cannot opt out via Settings (they would need to open survey, but that lets them save 0 only via dismiss, not "save"); a student who already has interests CAN clear all and save.

### 2.5 Listening / other-skills bleed
- **Listening reads interests:** **NO.** `rg -l 'interest|personali' src/components/listening` returned no results.
- **Grammar reads interests:** **NO.** Same grep, no results in `src/components/grammar`.
- **Vocab reads interests:** **NO.** `src/components/vocabulary` returned no results. (`src/pages/student/StudentVocabulary.jsx` has 1 hit — line 37, the word "interesting" appearing as a literal vocabulary item in a hard-coded word list — false positive, not a `user_interests` read.)
- **Writing reads interests:** **NO.** No file in `src/components/writing` or `src/pages/student/curriculum/tabs/WritingTab.jsx` references `user_interests` / `interest_bucket`.
- **Speaking reads interests:** **NO.** Same.
- **Other student-page false positives** confirmed unrelated:
  - `StudentPronunciation.jsx:185` — example sentence text contains "interested in world history".
  - `StudentExercises.jsx:202` — example sentence text contains "uninterested" / "interesting".
- **Edge functions reading interests:** **NO.** `rg -l 'user_interests|personalized_readings|interest_bucket' supabase/functions/` returned **0 hits**. Five edge functions did appear in a broader grep for "interest|personali" — all are false positives:
  - `generate-targeted-exercises/index.ts` — comment "Creates personalized exercises based on detected error patterns" (about `student_error_bank`, not `user_interests`).
  - `generate-ai-student-profile/index.ts` — uses "personality_summary_ar", "personalized tips" in Arabic.
  - `cron-streak-check/index.ts` — generates "personalized nudge" copy via Claude.
  - `generate-task-briefing/index.ts` — uses a `personalized_section.show` field gated on profile existence (not interests).
  - `smart-nudges/index.ts` — generates "personalized nudges" copy via Claude.
  Definitive check: `rg -n 'user_interests|personalized_readings|interest_bucket' supabase/functions/` → **0 hits.**

---

## 3. VISUAL DOMINANCE

**Canonical reading container (outer card) — `ReadingTab.jsx:666`:**
```
relative rounded-2xl overflow-hidden
bg-slate-900/50
border border-slate-800/60 hover:border-slate-700
transition-colors duration-300
```
Plus an internal gradient accent line (`absolute top-0 ... bg-gradient-to-r from-transparent via-sky-500/30 to-transparent`), an optional hero image (`rounded-t-2xl overflow-hidden border-b border-slate-700/40`), and inner body padding `p-6 md:p-8 space-y-6`. Title classes: `text-2xl md:text-3xl font-bold text-white tracking-tight font-['Inter']`.

**Variant card (PersonalizedReadingCard) — `PersonalizedReadingCard.jsx:18-20`:**
```
relative overflow-hidden rounded-2xl
border border-white/10 p-5 mt-6 cursor-pointer
transition-all duration-300
```
Inline style: `background: linear-gradient(135deg, var(--vm-surface-elevated,#1a1530), var(--vm-surface,#0f0a1f))`. Decorative gold blob (`absolute -top-12 -end-12 h-40 w-40 rounded-full blur-3xl, rgba(212,165,116,0.1)`). Icon tile `h-12 w-12 rounded-xl, rgba(212,165,116,0.15)`. Gold "نسخة على اهتماماتك" badge (`rounded-full px-2.5 py-0.5 text-[11px] font-semibold`, gold tint). Title `text-base sm:text-lg font-bold` (smaller than canonical's `text-2xl md:text-3xl`). Body copy: "نفس الدرس بسياق يخصّك — كمكافأة لمن يحب يضيف قراءة." Gold CTA button `rounded-xl px-4 py-2.5 text-sm font-semibold` reading "اقرأ النسخة".

**Drawer when opened — `PersonalizedReadingDrawer.jsx:11-25`:**
```
fixed inset-0 z-40 bg-black/60 backdrop-blur-sm    (backdrop)
fixed inset-y-0 end-0 z-50 w-full max-w-[640px]     (aside)
```
Inline: `background: var(--vm-surface,#0f0a1f); borderLeft: 1px solid rgba(255,255,255,0.1); boxShadow: -12px 0 48px rgba(0,0,0,0.6)`. Title `text-xl sm:text-2xl font-bold`.

**Verdict (card-in-place):** The variant card is **clearly subordinate** to the canonical container in three dimensions — it is positioned BELOW the canonical card; its title is `text-base sm:text-lg` vs canonical `text-2xl md:text-3xl`; its body is a single line of explanatory copy vs the canonical's full passage + audio + comprehension exercises.

**Verdict (drawer-when-opened):** The drawer is **dominant while open** — full-height fixed aside (up to 640px wide on desktop, full-width on mobile) over a `bg-black/60 backdrop-blur-sm` backdrop that covers and visually mutes the canonical card. The student must explicitly close it to return to canonical view.

**Rationale:** The mounted card respects "secondary bonus" framing in size and placement. However, two stylistic decisions push closer to "premium feature" than "subordinate disclosure": (1) the gold accent palette (`#d4a574`) is the same accent used elsewhere in the app for premium / featured states, and the radial gold glow + gold-tinted icon tile + gold CTA button visually elevate the card; (2) when opened, the drawer takes over the screen rather than expanding inline beneath the canonical, briefly making the variant the dominant on-screen artifact. Together with the dashboard `InterestSurveyCard` (which carries a "ميزة جديدة" / "new feature" badge and Sparkles icon at the very top of the dashboard), the cumulative framing reads as "premium upgrade" more than "optional supplement." Under the new iron rule that personalization "must appear as clearly secondary 'bonus' cards," this is a *partial* violation — architectural placement is correct, but visual framing and the drawer interaction are not subordinate enough.

---

## 4. STUDENT IMPACT IF REMOVED

**Not measured live** (MCP blocked — see top of report). The structural answer derived from migrations and grep is below.

- **Tables referencing `personalized_reading_id` / `variant_reading_id`:** **NONE.** A repo-wide grep (`rg -n 'personalized_reading|variant_reading' supabase/migrations/ src/` minus the create-table file and the read-side hook/components) returned 0 hits. There is no `*_progress`, `*_submission`, `*_attempts`, `*_bookmarks`, or `*_history` table holding student work against a variant.
- **Estimated student work lost on full removal:** **0 submissions, 0 progress rows, 0 graded attempts.** The drawer is read-only — it renders `{variant.body}` text only; there is no submit form, no questions, no scoring, no recorded view event tied to the variant.
- **The only student-owned data is `user_interests`** — at most one row per student, containing the chosen 3 bucket keys and survey state. Removing the feature drops this table; the impact is the loss of stored bucket preferences, which the new iron rule deems unwanted anyway.
- **Safe to remove cleanly:** **YES.** Dropping `personalized_readings` and `user_interests` would not break any FK (the only outbound FK is `personalized_readings.canonical_reading_id → curriculum_readings.id ON DELETE CASCADE`, which is one-way) and would not orphan any student progress data.

To verify live once MCP is restored:
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name ILIKE '%personalized_reading%' OR column_name ILIKE '%variant_reading%');
```
Expected result: 0 rows (the FK from `personalized_readings.canonical_reading_id` will appear; no inverse references).

---

## 5. ANSWER TO THE CORE QUESTION

> **Is the canonical curriculum currently the default, primary, and visually dominant experience for every student in every place, regardless of `user_interests`?**

**Answer: YES — with caveats on visual framing.**

**Evidence in two sentences:** The canonical reading is unconditionally rendered for every student in `ReadingTab.jsx` — the personalized card sits OUTSIDE and BELOW the canonical container, returns `null` when the student has no interests (which is true by default since the dashboard survey only sets interests after explicit opt-in), and no listening / grammar / vocab / writing / speaking page or edge function reads `user_interests` at all; the variant card itself is smaller than canonical and labels itself "نسخة على اهتماماتك … كمكافأة لمن يحب يضيف قراءة" (a bonus extra). The caveats are that (a) the dashboard `InterestSurveyCard` carries premium "ميزة جديدة" / Sparkles framing at the top of the dashboard and re-prompts every 7 days after dismissal, and (b) when opened, the variant drawer becomes a full-height fixed overlay with a darkened backdrop that covers the canonical content — so while canonical is the *default* and *primary* experience, it is not always the *visually dominant* one on screen.

---

## 6. RECOMMENDED PHASE B SCOPE

**Recommendation: A — LIGHT.**

The architecture already complies with the iron rule's substantive requirement: canonical is the unconditional default in every skill (reading included), personalization never replaces the canonical passage in place, no listening / grammar / vocab / writing / speaking surface reads `user_interests`, and there are zero downstream tables holding student work against variants. The violations are stylistic and discoverability-driven, not structural — gold "premium" framing on a survey card pinned at the top of the dashboard, weekly re-prompts after dismissal, and a full-screen drawer when the bonus card is opened.

A light hardening pass would (1) remove `<InterestSurveyCard />` from `StudentDashboard.jsx` outright (so no student is ever nudged to opt in), (2) demote `<PersonalizedReadingCard />` from a gold-accented CTA card to a small text-link disclosure beneath the canonical (e.g. "نسخة على اهتماماتك متاحة" → opens an inline expandable, not a full-screen drawer), (3) keep `<InterestsSettingsSection />` in `StudentProfile.jsx` but reframe its copy explicitly as "ميزة إضافية اختيارية" and ensure the empty-state opt-out is reachable, (4) codify the iron rule in `CLAUDE.md` (no per-interest variants for listening or any other skill, ever), and (5) explicitly kill any in-flight or planned listening-personalization work in prompts/notes/seeds. This preserves all 1,152 already-generated variants (per CLAUDE.md), wastes no content-generation work, and leaves a clean reversible path. Medium (B) and Heavy (C) would discard real content investment to fix a problem that's primarily visual — A is the right scope for the visual-dominance verdict and the zero-student-impact removal count.

---

## 7. FILES TOUCHED (NONE — read-only verification)

Confirm: **0 writes, 0 edits, 0 commits, 0 pushes.** Only this report was created at `docs/audits/personalization-rollback/PHASE-A-REPORT.md`.

No git operations were performed. No DB writes were issued (DB queries were skipped entirely — see top of report). No `vite build` or `npm run build` was run. The fluentia-lms skill at `/mnt/skills/user/fluentia-lms/SKILL.md` does not exist on this machine — it is a container path from the prompt-generation environment — and the prompt explicitly allowed falling back to `CLAUDE.md` conventions, which were followed.
