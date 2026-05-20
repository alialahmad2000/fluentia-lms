# Premium Vocabulary Rebuild — PHASE A AUDIT

- **Generated**: 2026-05-20 (Asia/Riyadh)
- **Auditor**: Claude Code (read-only Phase A, no schema or data writes)
- **Repo HEAD**: `7b15596` (branch `main`)
- **Supabase project**: `nmjexpuycmqcxuxljier` (Frankfurt, Pro)
- **Method**: All DB facts come from Supabase MCP (`list_tables`, `information_schema.*`, direct `SELECT`). All file facts come from `ls`/`git log -1`. All code facts cite a path + line.

> ⚠️ **Naming correction up front.** The prompt asked about a `vocabulary` table. **There is no such table.** The real vocab table is `curriculum_vocabulary` (13,930 rows). A separate empty `vocabulary_bank` table exists (0 rows, dormant). Every reference below uses the actual production name.

---

## 1 — VERDICT IN ONE TABLE

| Session 19 Prompt | Status | Evidence |
|---|---|---|
| 30 — Chunks + Quiz | **PARTIAL — code shipped, mounted in `/student/flashcards`, quiz used only 13× by 3 students** | `vocabulary_quiz_attempts` table exists (13 rows, 3 students); `profiles.preferred_chunk_size` exists; `ChunkSelector` + `VocabularyQuiz` imported in `VocabularyFlashcards.jsx:15-16`; NOT wired into curriculum `VocabularyTab.jsx` (sub-tab inside a unit) |
| 31 — Synonyms + Antonyms | **PARTIAL — schema present, populated only on the original 1,954-word subset** | `curriculum_vocabulary.synonyms` JSONB exists; only `13,930 − 12,452 = 1,478` rows (10.6%) have non-empty data; same for `antonyms` (`13,930 − 12,728 = 1,202` rows, 8.6%). Component `WordRelationships.jsx` (4.2 KB) committed 2026-04-11. |
| 32 — Anki FSRS Core | **PARTIAL — tables + components + ts-fsrs installed, NO route, NO student data** | `anki_cards` (0 rows), `anki_review_logs` (0 rows), 5 RLS policies on `anki_cards`. `ts-fsrs ^5.3.2` in `package.json`. Six `src/components/anki/*` files + `useAnkiSession.js` + `lib/fsrs.js` exist. `AnkiContainer` is mounted as a viewMode (`'anki'`) **inside** `VocabularyFlashcards.jsx:17`, but **no `/student/anki` route exists in `App.jsx`** and no nav entry points to it. Students never use it (0 cards, 0 logs). |
| 33 — Hard Words Training | **NOT SHIPPED** | Zero matches for `HardWords` / `hard-words` / `hard.word` anywhere in `src/`. No route. No component. No nav. |
| 34 — Section Restructure | **PARTIAL — flat nav already in place; new tabs delivered as viewMode inside Flashcards page** | Nav has a single `المفردات` entry → `/student/flashcards`. Inside the page, viewMode supports `'cards' \| 'list' \| 'chunks' \| 'games' \| 'anki'` (`VocabularyFlashcards.jsx:65`). The curriculum `VocabularyTab.jsx` (49 KB) remains the per-unit experience and was NOT restructured. |
| 35 — Word Families | **PARTIAL — schema present, populated on 10.4% of rows** | `curriculum_vocabulary.word_family` JSONB exists; `13,930 − 12,582 = 1,348` rows (9.7%) have non-empty data. Component `WordFamilySection.jsx` (13.3 KB) committed 2026-04-11. |
| 36 — Pronunciation Alerts | **PARTIAL — schema present, populated on only 2.9% of rows** | `curriculum_vocabulary.pronunciation_alert` JSONB exists; only **399 / 13,930 = 2.9%** rows populated (13,531 NULL, 0 empty). Component `PronunciationAlert.jsx` (6.4 KB) committed 2026-04-11. |
| 37 — Responsive Tabbed Layout | **SHIPPED** | `WordDetailModal.jsx` (5.9 KB), `WordDetailHeader.jsx`, `WordDetailTabBar.jsx`, and four tab components in `src/components/vocabulary/tabs/` all committed 2026-04-17. Wired via `WordExerciseModal.jsx`. |

**TL;DR on Session 19:** Schema + UI scaffolding shipped for nearly everything. **Content fill stalled** — only ~10% of rows got enriched, and the vocab table tripled in size (~1,954 → 13,930) after the B1/B2/B3 expansion migrations (126, 129, 130), so coverage % dropped accordingly. Anki & Hard Words have **zero student usage** (Hard Words has no UI at all).

---

## 2 — DATABASE

### 2.1 Tables present

All RLS-enabled. Live row counts (production):

| Table | Rows | Comment |
|---|---:|---|
| `curriculum_vocabulary` | 13,930 | The real vocab table — replaces the never-built `vocabulary` from the prompt |
| `vocabulary_word_mastery` | 3,473 | 18 students with any rows |
| `vocabulary_quiz_attempts` | 13 | 3 distinct students — Prompt 30 quiz lightly used |
| `anki_cards` | 0 | Schema ready; zero student usage |
| `anki_review_logs` | 0 | Schema ready; zero student usage |
| `curriculum_vocabulary_srs` | 97 | Separate older SRS system (still active — used by `WordExerciseModal`, `DailyReview`, `SrsReviewCard`) |
| `student_saved_words` | 788 | "Save word" feature |
| `student_word_highlights` | 139 | Word-highlight feature |
| `vocab_cache` | 1,831 | AI dictionary lookup cache |
| `xp_transactions` | 1,702 | Includes vocab-driven XP via `reason` enum |
| `vocabulary_bank` | 0 | **Dormant** — older table, unused |

### 2.2 `curriculum_vocabulary` — full column inventory (32 cols)

```
id (uuid PK, NOT NULL)
reading_id (uuid FK → curriculum_readings, NOT NULL)
word (text, NOT NULL)
definition_en (text, NOT NULL)
definition_ar (text, NULL)
example_sentence (text, NULL)
part_of_speech (text, NULL)
pronunciation_ipa (text, NULL)
audio_url (text, NULL)
image_url (text, NULL)
difficulty_tier (text, NULL)
sort_order (integer, NULL)
created_at (timestamptz, NULL)
audio_generated_at (timestamptz, NULL)
synonyms (jsonb, NULL)                       -- Prompt 31
antonyms (jsonb, NULL)                       -- Prompt 31
relationships_generated_at (timestamptz, NULL)
word_family (jsonb, NULL)                    -- Prompt 35
word_family_generated_at (timestamptz, NULL)
pronunciation_alert (jsonb, NULL)            -- Prompt 36
pronunciation_generated_at (timestamptz, NULL)
tier (text, NULL)                            -- core / extended / mastery
cefr_level (text, NULL)                      -- A1..C2 + 'academic'
source_list (text, NULL)
appears_in_passage (boolean, NOT NULL)
tier_order (integer, NULL)
added_in_prompt (text, NULL)
regenerated_at (timestamptz, NULL)
cleanup_run_id (text, NULL)
original_example_sentence (text, NULL)
audio_duration_ms (integer, NULL)
audio_voice_name (text, NULL)
```

Note: **there is no `level` column on `curriculum_vocabulary`** — level/CEFR is derived two ways: via `tier`/`cefr_level` text columns, or via the join `cv → curriculum_readings → curriculum_units.level_id → curriculum_levels`.

### 2.3 `profiles` — vocab/anki columns

| Column | Type | Present? |
|---|---|---|
| `preferred_chunk_size` | `integer` | ✅ |
| `anki_daily_new_cards` | – | ❌ does not exist |
| `anki_daily_max_reviews` | – | ❌ does not exist |
| `anki_review_order` | – | ❌ does not exist |
| `anki_autoplay_audio` | – | ❌ does not exist |

→ Prompt 32's Anki preferences live **only in client state**; they have no DB column to persist into.

### 2.4 Enrichment coverage

| Column | Total rows | Populated (non-NULL) | NULL | Empty `{}`/`[]` | **Effective coverage** |
|---|---:|---:|---:|---:|---:|
| `synonyms` | 13,930 | 13,930 | 0 | 12,452 | **1,478 (10.6%)** |
| `antonyms` | 13,930 | 13,930 | 0 | 12,728 | **1,202 (8.6%)** |
| `word_family` | 13,930 | 13,930 | 0 | 12,582 | **1,348 (9.7%)** |
| `pronunciation_alert` | 13,930 | 399 | 13,531 | 0 | **399 (2.9%)** |
| `audio_url` | 13,930 | 13,930 | 0 | – | **100%** |

→ Synonyms / antonyms / word_family were back-filled with `'{}'`/`'[]'` defaults on the rows that never got generated content, so the column is "non-NULL" but semantically empty. Pronunciation alerts use real NULL.

### 2.5 Vocabulary distribution

**Per level (via reading→unit→level join):**

| Level | Name (AR) | CEFR | Word count |
|---:|---|---|---:|
| 0 | تأسيس | Pre-A1 | 455 |
| 1 | أساسيات | A1 | 662 |
| 2 | تطوير | A2 | 1,300 |
| 3 | طلاقة | B1 | 1,961 |
| 4 | تمكّن | B2 | 3,663 |
| 5 | احتراف | C1 | 5,889 |
| | **Total** | | **13,930** |

**Per tier:** `core` 5,442 · `extended` 4,999 · `mastery` 3,489

**Per CEFR tag** (the `cefr_level` text column): A1 1,573 · A2 1,142 · B1 1,555 · B2 2,527 · C1 6,427 · C2 695 · academic 11

**Top 5 units by word count (level 5):**
- L5/U1 "انهيار الحضارات" — 532
- L5/U2 "الإنجاز المتطرف" — 508
- L5/U5 "جدل الطاقة النووية" — 496
- L5/U11 "التبادل الثقافي" — 490
- L5/U3 "الشك العلمي" — 489

**Bottom 5 units by word count (level 0):**
- L0/U8 "الصحة والجسم" — 33
- L0/U5 "الطقس والفصول" — 34
- L0/U6 "العائلة والأصدقاء" — 35
- L0/U7 "التسوق والمال" — 35
- L0/U2 "الطعام والطبخ" — 36

**Audio coverage: 13,930 / 13,930 = 100% ✅**

### 2.6 Mastery activity

- Students with any mastery rows: **18 / 23 active students** (~78%)
- Mastery state breakdown: `mastered` 3,470 · `learning` 3 · (no other states)
- Most recent activity: 2026-05-14 10:14:28 UTC — student `cad66f17-...` mastering 5 words in 3 minutes
- **Note:** the `mastery_level` text column only ever takes `mastered` or `learning` in practice — no `new`/`reviewing` states ever recorded.

### 2.7 Anki activity

- Students using Anki: **0**
- Total cards: **0**
- Review logs: **0**

→ Zero engagement. Either students don't know it exists (no nav, no route) or it's broken at the integration layer.

### 2.8 DB functions & triggers

Functions matching `vocab|anki|mastery|chunk|quiz`:

| Function | Type |
|---|---|
| `get_vocab_counts_per_unit` | FUNCTION |
| `get_vocab_for_unit` | FUNCTION |
| `set_anki_cards_updated_at` | FUNCTION |
| `update_vocabulary_mastery_level` | FUNCTION |

Triggers on `vocabulary_word_mastery`, `vocabulary_quiz_attempts`, `anki_cards`, `anki_review_logs`, `curriculum_vocabulary` or with `anki|vocab|chunk` in the name: **none returned** by `information_schema.triggers`. (`set_anki_cards_updated_at` is a function but no trigger appears to be bound to it in production.)

### 2.9 RLS policies

| Table | Count | Policies |
|---|---:|---|
| `curriculum_vocabulary` | 3 | `admin_all_curriculum_vocabulary`, `auth_read_curriculum_vocabulary`, `service_curriculum_vocabulary` |
| `vocabulary_word_mastery` | 5 | `admin_mastery_all`, `staff_mastery_select`, `students_own_mastery_insert`, `students_own_mastery_select`, `students_own_mastery_update` |
| `vocabulary_quiz_attempts` | 3 | `Students insert own quiz attempts`, `Students read own quiz attempts`, `Trainers read their students quiz attempts` |
| `anki_cards` | 5 | `anki_cards_staff_select`, `anki_cards_student_delete`, `anki_cards_student_insert`, `anki_cards_student_select`, `anki_cards_student_update` |
| `anki_review_logs` | 3 | `anki_logs_staff_select`, `anki_logs_student_insert`, `anki_logs_student_select` |

All five tables have the policy shape needed for the student/staff split. No obvious gaps.

---

## 3 — CODEBASE FILES

### 3.1 Vocabulary tab + supporting

| Path | Exists | Size | Last commit |
|---|---|---:|---|
| `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | ✅ | 49,137 B | 2026-05-19 |
| `src/hooks/useVocabularyMastery.js` | ✅ | 2,255 B | 2026-05-18 |
| `src/components/vocabulary/WordExerciseModal.jsx` | ✅ | 22,182 B | 2026-04-17 |
| `src/components/vocabulary/WordRelationships.jsx` (P31) | ✅ | 4,218 B | 2026-04-11 |
| `src/components/vocabulary/WordFamilySection.jsx` (P35) | ✅ | 13,344 B | 2026-04-11 |
| `src/components/vocabulary/PronunciationAlert.jsx` (P36) | ✅ | 6,441 B | 2026-04-11 |
| `src/components/vocabulary/WordDetailModal.jsx` (P37) | ✅ | 5,911 B | 2026-04-17 |
| `src/components/vocabulary/QuizResultScreen.jsx` (P30) | ✅ | 6,704 B | 2026-04-12 |
| `src/components/vocabulary/ChunkCard.jsx` (P30) | ✅ | 3,812 B | 2026-04-10 |
| `src/components/vocabulary/ChunkSelector.jsx` (P30) | ✅ | 5,380 B | 2026-04-10 |
| `src/components/vocabulary/VocabularyQuiz.jsx` (P30) | ✅ | 5,680 B | 2026-04-17 |
| `src/components/vocabulary/QuizQuestionCard.jsx` (P30) | ✅ | 5,624 B | 2026-04-10 |
| `src/hooks/useVocabularyChunks.js` (P30) | ✅ | 3,101 B | 2026-04-10 |
| `src/hooks/useVocabularyQuiz.js` (P30) | ✅ | 4,903 B | 2026-04-13 |
| `src/utils/vocabularyChunks.js` | ✅ | – | – (deferred — pure helpers) |
| `src/components/vocabulary/tabs/{MeaningTab,RelationsTab,FamilyTab,PronunciationTab}.jsx` (P37) | ✅ (4) | – | 2026-04-17 |
| `src/components/vocabulary/{WordDetailHeader,WordDetailTabBar}.jsx` (P37) | ✅ (2) | – | 2026-04-17 |
| `src/pages/student/StudentVocabulary.jsx` | ✅ | 28,104 B | 2026-05-19 |
| `src/pages/student/vocabulary/VocabularyFlashcards.jsx` | ✅ | 27,466 B | 2026-05-19 |
| `src/pages/student/vocabulary/components/VocabularyPractice.jsx` | ✅ | 15,827 B | 2026-04-12 |
| `src/pages/student/vocabulary/components/{Flashcard,FlashcardDeck}.jsx` | ✅ (2) | – | – |
| `src/pages/student/curriculum/tabs/VocabularyExercises.jsx` | ✅ | – | – |
| `src/components/student/vocabulary/{ReviewOverlay,ReviewSessionStats}.jsx` | ✅ (2) | – | – |
| `src/components/audio/VocabPopup.jsx` | ✅ | – | – |
| `src/components/curriculum/VocabGainTicker.jsx` | ✅ | – | – |
| `src/components/interactive-curriculum/InteractiveVocabularyTab.jsx` | ✅ | – | – |
| `src/components/players/passage-vocab.css` | ✅ | – | – |
| `src/pages/admin/curriculum/components/{VocabularyManager,VocabExerciseEditor}.jsx` | ✅ (2) | – | – |
| `src/hooks/{useUnitVocab,useUnitVocabSet,useSRS}.js` | ✅ (3) | – | – |

### 3.2 Anki components (Prompt 32)

| Path | Exists | Size | Last commit |
|---|---|---:|---|
| `src/components/anki/AnkiHome.jsx` | ✅ | 5,837 B | 2026-04-11 |
| `src/components/anki/AnkiContainer.jsx` | ✅ | 2,236 B | 2026-04-11 |
| `src/components/anki/AnkiReviewSession.jsx` | ✅ | 9,922 B | 2026-04-12 |
| `src/components/anki/AnkiSessionComplete.jsx` | ✅ | 2,822 B | 2026-04-11 |
| `src/components/anki/AnkiSettings.jsx` | ✅ | 5,027 B | 2026-04-11 |
| `src/components/anki/AnkiStatsCard.jsx` | ✅ | 2,767 B | 2026-04-11 |
| `src/hooks/useAnkiSession.js` | ✅ | 12,426 B | 2026-04-11 |
| `src/lib/fsrs.js` | ✅ | 2,991 B | 2026-04-11 |
| `src/pages/student/AnkiHome.jsx` / `AnkiPage.jsx` / `Anki.jsx` | ❌ | – | No top-level Anki page exists |

### 3.3 Hard Words components (Prompt 33)

**Nothing.** `find src -ipath "*hard*word*"` returned zero results. `grep -ril "hardwords\|hard-words\|HardWords" src/` returned zero results. Prompt 33 was never implemented.

### 3.4 Migrations matching `vocab|anki|mastery|chunk|quiz|synonym|family|pronunciation`

```
078_vocabulary_word_mastery.sql                                 (Session 16 — mastery base)
086_pronunciation_schema_prep.sql                               (curriculum_pronunciation prep)
090_pronunciation_progress.sql                                  (pronunciation progress)
100_vocab_uniqueness_constraint.sql                             (unique constraint)
101_vocabulary_chunks_and_quiz.sql                              (P30 — preferred_chunk_size + vocabulary_quiz_attempts)
102_add_synonyms_antonyms.sql                                   (P31)
103_add_anki_fsrs.sql                                           (P32 — anki_cards + anki_review_logs + RLS)
105_add_pronunciation_alerts.sql                                (P36)
113_vocab_progress_verification.sql
126_legendary_b1_l0_vocab_expansion.sql                         (B1 expansion — pushed total toward 13,930)
129_legendary_b2_l1_vocab_expansion.sql                         (B2 expansion)
130_legendary_b3_l2_vocab_expansion.sql                         (B3 expansion)
133_unit_mastery_assessments.sql                                (unrelated — unit mastery quiz feature)
20260509160000_unit_mastery_attempts_v2.sql                     (unrelated)
20260510130000_vocab_cleanup_tracking_columns.sql               (cleanup tracking)
20260510140000_vocab_audio_cols.sql                             (audio metadata cols)
20260519000000_compute_unit_progress_vocab_section_signal.sql   (compute_unit_progress vocab signal)
20260519120000_compute_unit_progress_exclude_pronunciation.sql  (exclude pronunciation from progress denominator)
```

> Migration `104_add_word_families.sql` referenced in the changelog is **not in `supabase/migrations/`**. If the column exists but the migration file is missing, it was likely applied via the Supabase SQL Editor and never committed. The column is present, so this is cosmetic — but Prompt 04 should not assume `104_…` is on disk.

### 3.5 `prompts/agents/` vocab/anki-related files

```
HIDE-PRONUNCIATION-RESTORE-COMPLETION-BADGES-2026-05-19.md
LISTENING-VOCAB-FIX-2026-05-18.md
UNIT-MASTERY-DISCOVERY.md
VOCAB-PREMIUM-01-AUDIT.md                  (this prompt — just landed)
```

The Session 19 prompts (`31-synonyms-antonyms-system.md`, `35-word-families.md`, `36-pronunciation-alerts.md`) referenced in `CLAUDE.md` are **not in the current `prompts/agents/` directory** — they have been pruned or moved. The deletion is referenced in the 2026-04-12 changelog entry ("Convert Prompts 31/35/36 to Single Sequential Agent").

### 3.6 Orphaned reference grep

```
preferred_chunk_size   →  src/hooks/useVocabularyChunks.js  (1 hit, used)
ts-fsrs                →  src/lib/fsrs.js                   (1 hit, used)
anki_cards             →  AnkiHome.jsx, AnkiStatsCard.jsx, useAnkiSession.js, lib/fsrs.js  (4 hits — alive but unused by students)
vocabulary_quiz_attempts → src/hooks/useVocabularyQuiz.js   (1 hit, used)
pronunciation_alert    →  10 hits across vocab + anki + flashcards (alive everywhere)
word_family            →  6 hits (alive — including in TextSelectionTooltip + Anki + Detail modal)
```

Nothing is orphaned. Everything that references Session 19 tables/columns is wired into at least one render path.

---

## 4 — ROUTES

`src/App.jsx` is the router (`<Routes>` at line 556). All vocab/anki-related routes:

| Path | Component | In nav? |
|---|---|---|
| `/student/vocabulary` | `StudentVocabulary` (28 KB) | ❌ not in `src/config/navigation.js` |
| `/student/flashcards` | `VocabularyFlashcards` (27 KB) | ✅ **labelled "المفردات"** — appears 3× (student, trainer-as-student-preview, possibly admin preview) |
| `/student/daily-review` | `DailyReview` | ❌ not in nav |
| `/student/anki*` | — | ❌ **route does not exist** |
| `/student/hard-words*` | — | ❌ **route does not exist** |

→ The only route a student naturally reaches is `/student/flashcards`. `StudentVocabulary` (28 KB!) and `DailyReview` are dark routes — reachable only by direct URL or in-page link.

---

## 5 — DEPENDENCIES

| Package | Installed version |
|---|---|
| `ts-fsrs` | ^5.3.2 |
| `framer-motion` | ^11.12.0 |
| `recharts` | ^2.13.3 |
| `@tanstack/react-query` | ^5.62.0 |
| `zustand` | ^5.0.2 |
| `lucide-react` | ^0.460.0 |

All Prompt 02–08 dependencies are present. Nothing needs to be installed for Phase B.

---

## 6 — LIVE STATE — `VocabularyTab.jsx` today

Reading `src/pages/student/curriculum/tabs/VocabularyTab.jsx` top-down (this is the **per-unit** vocab experience that lives inside `UnitContent.jsx`):

- **① Hero header** (`L:359-389`) — gradient card with `ProgressRing` (animated SVG, sky→indigo gradient, displays mastery %), unit title `مفردات الوحدة`, and 3 stat chips: `new` / `learning` / `mastered`. Data: `masteredCount`, `learningCount`, `newCount` from `useVocabularyMastery`.
- **② Filter bar + search + view-mode + quick-practice** (`L:392-450`) — chips for `all / new / learning / mastered`, expandable search input, cards/list view toggle, and a "تمرّن" button that opens `WordExerciseModal` in quick-practice mode through unmastered words. Quick-practice button only renders when `unmasteredLeft > 0`.
- **③ SRS Due bar** (`L:453-477`) — small banner shown when `unitDueWords.length > 0`; tapping opens `ReviewOverlay`. Data source: `useSRSDue(studentId)` filtered to this unit. Backed by the **older** `curriculum_vocabulary_srs` table (97 rows), NOT the Anki FSRS tables.
- **④ Reading × Tier sections** (`L:487-578`) — for each reading in the unit, words are split into 3 collapsible tiers (`core` / `extended` / `mastery`). Each tier renders a `PaginatedTier` (`PAGE_SIZE = 40`) of `WordCard` or `WordListItem`. Each word card supports: tap to mark "reviewed", "practice" button → opens `WordExerciseModal`, save-word star (writes `student_saved_words`), and click-to-play audio (`audio_url`). Mastery state per word is read via `getMastery(id)`.
- **⑤ Completion / progress banner** (`L:581-594`) — full `CompletionBanner` when `masteredCount >= totalWords`, else a slim progress strip.
- **⑥ VocabularyExercises** (`L:597`) — child component for passage-level vocab drills (separate file, not detailed here).
- **⑦ WordExerciseModal** (`L:600-608`) — full-screen drawer for per-word practice (meaning / sentence / listening) + the responsive tabbed `WordDetailModal` (Prompt 37) for synonyms / antonyms / word family / pronunciation alert.
- **⑧ Quick-practice indicator** (`L:611-615`) — floating pill showing "كلمة X من Y" while quick-practice is active.
- **⑨ ReviewOverlay** (`L:618-622`) — modal that walks the student through SRS-due words for the unit.

**Crucially:** `VocabularyTab.jsx` (the per-unit unit-content tab) does **NOT** import `ChunkSelector`, `VocabularyQuiz`, or `AnkiContainer`. Those three Session 19 surfaces live exclusively inside `src/pages/student/vocabulary/VocabularyFlashcards.jsx:15-17` as part of its 5 viewMode tabs (`cards | list | chunks | games | anki`). The two surfaces are diverged.

---

## 7 — RECOMMENDED PROMPT 02–08 SHAPE

### Prompt 02 — Enrichment Fill
- **Yes, needed, but a much bigger job than originally planned.** Coverage % numbers are based on a 13,930-row table now, not the 1,954-row table the Session 19 prompts were written against.
- Target columns + rows to fill:
  - `synonyms`: **12,452 rows** (89.4%)
  - `antonyms`: **12,728 rows** (91.4%)
  - `word_family`: **12,582 rows** (90.3%)
  - `pronunciation_alert`: **13,531 rows** (97.1%) — by far the biggest gap
- Budget consideration: the original Session 19 single-agent script processed ~1,954 words. At the same per-row cost, the full backfill is ~7× the original token spend. **Recommend tiering: complete L0 + L1 first (1,117 rows), then L2 (1,300), then opportunistic top-down.**
- Use the existing `scripts/generate-relationships.cjs`, `scripts/generate-families.cjs`, `scripts/generate-pronunciation.cjs` helpers — they already support `--fetch N` / `--apply` / `--status` and target `curriculum_vocabulary` (not the no-longer-extant `vocabulary`).
- **Skip pronunciation_alert if budget tight** — it's the most expensive (longest model outputs) and only 2.9% of rows have it today, so we'd be doing nearly 100% of the job. Synonyms/antonyms/word_family have a clearer marginal ROI.

### Prompt 03 — Anki FSRS
- **NOT a full rebuild. Finish the missing pieces.** Tables, RLS, components, `ts-fsrs`, and `AnkiContainer` are all done. What's missing:
  1. **No route** at `/student/anki*` (or `/student/flashcards/anki` if we want it nested).
  2. **No nav entry** — students literally cannot find it. The only path is open `/student/flashcards` → switch viewMode to 'anki'.
  3. **No DB columns** for Anki settings (`anki_daily_new_cards`, `anki_daily_max_reviews`, `anki_review_order`, `anki_autoplay_audio`) — settings currently can't persist across sessions/devices.
  4. **Zero seeded cards** — students need a flow to add words to Anki (the current "add to Anki" call sites should be re-verified; `useAnkiSession.js` has all the FSRS scheduling logic but the `INSERT` path may not be hit).
  5. **Decision needed:** keep the older `curriculum_vocabulary_srs` table (97 rows of student data!) in parallel with `anki_cards`, or migrate? They're both "SRS for vocab" — having two parallel systems is the single biggest risk flag of this audit.

### Prompt 04 — Hard Words
- **Full build.** Nothing exists. Concept: surface words from `vocabulary_word_mastery` where `meaning_exercise_attempts >= 2` OR `sentence_exercise_attempts >= 2` (or similar "struggling" signal), pin them on a dedicated `/student/hard-words` page (or as the 6th `viewMode` inside Flashcards), and let students drill them with priority. The mastery table already has the data — no new schema needed.

### Prompt 05 — Hero Shell
- **Wrap, don't rewrite.** Both `VocabularyFlashcards.jsx` (27 KB) and `VocabularyTab.jsx` (49 KB) have premium hero treatments. The hero work should converge them on a **single shared `VocabularyHero` component** (mastery ring + 3 stat chips + filter row) that both surfaces use, so we stop building duplicate hero variations.

### Prompt 06 — Journey Lane
- **Chunks system exists** in `useVocabularyChunks.js`, `ChunkSelector.jsx`, `ChunkCard.jsx` and is mounted inside Flashcards. **Reuse and extend** — wire it into the per-unit `VocabularyTab.jsx` too (currently absent). The "lane" framing (sequential unlock with 80% mastery gate) is already implemented in `utils/vocabularyChunks.js` (`computeChunkStatus`).

### Prompt 07 — Library + Detail Sheet
- **Detail sheet is already done** — `WordDetailModal.jsx` (Prompt 37) ships with `MeaningTab`, `RelationsTab`, `FamilyTab`, `PronunciationTab` and a tab bar that hides empty tabs. Reuse as-is. The **library** side is what needs work: there is no global "all vocabulary I've ever seen, searchable" view today. `StudentVocabulary.jsx` (28 KB, dark route, no nav entry) may already be partially that — read it before building from scratch.

### Prompt 08 — Polish + Gaps
Top 5 gaps surfaced by Phase A:

1. **Two parallel SRS systems** (`curriculum_vocabulary_srs` 97 rows vs `anki_cards` 0 rows). Pick one, migrate, deprecate the other. This is the single most confusing thing in the system today.
2. **`StudentVocabulary.jsx` is a 28 KB orphan** — reachable by URL, not in nav. Decide: promote it to the canonical vocab home, fold its content into Flashcards, or delete it.
3. **Anki nav + route entirely missing** — the feature is built and gated behind a viewMode tab no one knows about.
4. **No Hard Words feature** despite 2 students having `mastery_level='learning'` rows that are clearly stuck mid-drill — there's data to power it.
5. **Mastery state has effectively only 2 states** (`mastered` 3,470 / `learning` 3) — either the `new` and `reviewing` states aren't being written, or they're being skipped over. The `update_vocabulary_mastery_level` function probably needs an audit.

---

## 8 — RISK FLAGS

- 🔴 **`vocabulary` table doesn't exist.** Every Session 19 doc, prompt, and script that references `vocabulary` actually means `curriculum_vocabulary`. Prompts 02–08 must use the correct name or `apply_migration` calls will silently target the wrong (empty) `vocabulary_bank` and produce no observable change.
- 🔴 **Two SRS systems coexist.** `curriculum_vocabulary_srs` (97 rows, actively used by `DailyReview.jsx` + `WordExerciseModal.jsx` + `SrsReviewCard.jsx`) and `anki_cards` (0 rows, only hit if a student finds the hidden Flashcards `viewMode='anki'` tab). They are not synchronized. Adding a word to one does not add it to the other. Touching either without a strategy will fork further.
- 🟠 **`profiles` lacks all Anki preference columns** — anything UI lets the student configure (daily new cards, max reviews, review order, autoplay audio) is lost on next login. Prompt 03 must add columns + migration before claiming Anki is "shipped."
- 🟠 **Migration `104_add_word_families.sql` is not in `supabase/migrations/`** despite being referenced in `CLAUDE.md`. Either re-create the file from the live schema (`pg_dump --schema-only --table=curriculum_vocabulary`) or update the changelog. Don't write a migration that "adds" the column — `apply_migration` is non-idempotent on column conflicts and would fail.
- 🟠 **`vocabulary_bank` and `vocabulary_word_mastery` use `student_id`, not `user_id`**, despite the Session 19 prompts using `user_id` in their SQL templates. Any audit query in future prompts must use `student_id`.
- 🟠 **97% of `pronunciation_alert` is NULL.** Component `PronunciationAlert.jsx` renders fine for the 399 populated rows, but for the remaining 13,531 words, the UI just hides the section. That's safe but invisible — there's no "we haven't generated this yet" treatment that would let trainers see progress.
- 🟠 **Anki has 0 student users despite being built 6 weeks ago.** Before investing in FSRS polish, verify what's gating discovery — is it the missing nav entry, the missing route, the hidden viewMode, the unfamiliar word "Anki" in the UI, or all four?
- 🟡 **`curriculum_vocabulary` has 32 columns**, many introduced incrementally (`added_in_prompt`, `cleanup_run_id`, `original_example_sentence`, `regenerated_at`, etc.) — they look like operational columns from the cleanup/regen passes. Prompt 02 shouldn't reference them as user-facing data. They're audit/maintenance only.
- 🟡 **Mastery only ever takes `mastered` or `learning`** in 3,473 rows. If the design assumed `new` / `learning` / `reviewing` / `mastered`, the state machine is degenerate. `update_vocabulary_mastery_level()` should be inspected before any new code is written that branches on these states.
- 🟡 **DB triggers are absent.** `set_anki_cards_updated_at()` and `update_vocabulary_mastery_level()` are functions, but no triggers in `information_schema.triggers` bind them to `anki_cards` or `vocabulary_word_mastery`. Updates to `updated_at` likely rely on client-side `new Date()` (already seen in code), and mastery level transitions may rely on application-level calls. Confirm before assuming triggers exist.

---

*End of audit. No data was modified. The only write was creating this file.*
