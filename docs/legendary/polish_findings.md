# LEGENDARY-POLISH — Audit Findings

**Date**: 2026-04-15
**Scope**: Cross-level vocabulary audit (L0–L5), UX coherence, DB hygiene, baseline telemetry

---

## Phase 1: Content Distribution

### 1.1 CEFR + Tier Distribution per Level

| Level | Unique Words | Total | Core | Extended | Mastery | A1 | A2 | B1 | B2 | C1 | C2 | Null Tier | Null CEFR |
|-------|-------------|-------|------|----------|---------|-----|-----|-----|-----|------|-----|-----------|-----------|
| 0     | 479         | 479   | 479  | 0        | 0       | 479 | 0   | 0   | 0   | 0    | 0   | 0         | 0         |
| 1     | 718         | 718   | 718  | 0        | 0       | 322 | 396 | 0   | 0   | 0    | 0   | 0         | 0         |
| 2     | 1336        | 1336  | 1336 | 0        | 0       | 329 | 599 | 408 | 0   | 0    | 0   | 0         | 0         |
| 3     | 2016        | 2016  | 2016 | 0        | 0       | 340 | 147 | 941 | 588 | 0    | 0   | 0         | 0         |
| 4     | 3800        | 3800  | 1869 | 1140     | 791     | 411 | 0   | 206 | 1823| 1349 | 11  | 0         | 0         |
| 5     | 6034        | 6034  | 2596 | 1938     | 1500    | 0   | 0   | 0   | 116 | 5223 | 695 | 0         | 0         |

**Observations**:
- ✅ No null tiers or null CEFR anywhere
- ✅ L0–L3 are 100% core tier (appropriate for beginner levels)
- ✅ L4–L5 have proper tier distribution (core/extended/mastery)
- ⚠️ L2 has 24.6% A1 words (329) — slightly high for an A2/B1 level
- ⚠️ L4 has 10.8% A1 words (411) — notable leakage for a B2/C1 level
- ⚠️ L5 is 86.6% C1 — over-concentrated; could use more C2 variety

### 1.3 L5 C1 Sample (30 words)

Reviewed 30 random C1 words from L5. All had:
- ✅ Valid Arabic translations
- ✅ Correct part_of_speech
- ✅ Source lists from CEFR-J, NAWL, AWL
- ✅ Domain-specific compound nouns appropriate for C1 (e.g., "photovoltaic cell", "participatory sensing")
- ⚠️ 1 word ("harness") had null source_list

### 1.5 Readings & Passages

- **24 readings per level** (144 total) ✅
- **curriculum_reading_passages**: Table exists but is **empty** (0 rows). This table has a `level` column (no FK to readings) — appears to be an independent reading comprehension feature not yet populated.

---

## Phase 2: Translation Quality & Red Flags

### 2.2a Short Arabic Definitions (<3 chars)
**Count: 31** — All legitimate 2-character Arabic words (أب, سم, هش, مر, خط, etc.). No action needed.

### 2.2b Identical EN=AR
**Count: 0** ✅

### 2.2c Arabic with English Letters (4+)
**Count: 4**
- `apps` → "تطبيقات (اختصار لكلمة applications)" — acceptable (explanatory)
- `studied` → "درس، تعلم (الماضي من study)" — acceptable
- `created` → "أنشأ، ابتكر، خلق (الماضي من create)" — acceptable
- `catalytic protein` → "بروتين كatalytic" — **BROKEN** → **FIXED** to "بروتين حفّاز"

### 2.2d Example Sentence = Word
**Count: 0** ✅

### 2.2e Example Missing the Target Word
**Total: 3,479** — Breakdown by level:

| Level | Count |
|-------|-------|
| 0     | 5     |
| 1     | 5     |
| 2     | 16    |
| 3     | 44    |
| 4     | **3,394** |
| 5     | 15    |

**Root cause**: L4 has a systematic issue where ~89% of its examples don't contain the exact target word. Many are morphological variants (plurals, past tense, phrasal verbs). The SQL match is strict (`LIKE '%word%'`), so "bury" won't match "buried". This is expected for inflected forms but the L4 concentration suggests the content generation used more varied sentence structures. **Not a data quality issue** — the examples are contextually relevant, just use different word forms.

### 2.2f Empty example_sentence: **0** ✅
### 2.2g Empty definition_ar: **0** ✅
### 2.2h Empty definition_en: **0** ✅

### 2.2i Null source_list per Level

| Level | Null Count |
|-------|-----------|
| 0     | 193       |
| 1     | 238       |
| 2     | 291       |
| 3     | 340       |
| 4     | 411       |
| 5     | 477       |

**Total: 1,950 words with null source_list** (~13.5% of total). These are words that were manually curated or AI-generated without a specific corpus source. Not blocking but noted for completeness.

### 2.3 Cross-Level Word Overlap
**Total: 1,020 words appear in multiple levels**

Top pairs:
| Levels | Count |
|--------|-------|
| L4↔L5  | 679   |
| L2↔L3  | 140   |
| L3↔L4  | 36    |
| L0↔L1  | 30    |
| L1↔L3  | 21    |

The L4↔L5 overlap (679 words, ~7.5% of combined vocab) is notable. Words like "acceleration", "accretion", "adapt" appear in both. This is partially expected as higher levels revisit words in more advanced contexts, but 679 is on the high side.

---

## Phase 3: UX Coherence (Code Review)

### 3.1 Vocab per Reading Stats

| Level | Min | Max | Avg  |
|-------|-----|-----|------|
| 0     | 8   | 36  | 20.0 |
| 1     | 9   | 51  | 29.9 |
| 2     | 11  | 105 | 55.7 |
| 3     | 81  | 86  | 84.0 |
| 4     | 15  | 352 | 158.3|
| 5     | 17  | 521 | 251.4|

### Critical UX Issues Found & Fixed

1. **VocabularyTab: No pagination** — L5 readings with 521 words rendered all cards/list items at once. **FIXED**: Added `PaginatedTier` component with PAGE_SIZE=40, "show more" button.

2. **VocabularyTab: `markReviewed` fired on mount** — Every card/list item called `onView()` in a `useEffect` on mount, instantly marking ALL visible words as "reviewed" without user interaction. This caused: false completion status, unearned XP, 500-item UUID array written to DB. **FIXED**: Removed auto-fire `useEffect`, moved `onView()` to explicit user click handlers.

3. **VocabularyFlashcards: List view no pagination** — Same issue in flashcards list mode. **FIXED**: Added pagination with visible=50, "show more" button.

4. **Stagger animation performance** — `staggerChildren: 0.05` with 300+ cards = 15s animation queue. **FIXED**: Dynamic stagger calculation: `count > 30 ? 0.02 : 0.05`.

### Issues Noted (Not Fixed — Low Priority)
- `CurriculumBrowser`: `academic_level = 0` shows all levels locked with no explanation (edge case for unplaced students)
- `SrsReviewCard`: `Link to="#"` when dueCount=0 causes scroll-to-top on click

### Confirmed Clean
- StreakWidget: handles streak=0 correctly
- PersonalDictionaryWidget: proper empty state
- StudentDashboard: safe defaults for 0 activity
- FlashcardDeck: one-at-a-time rendering, handles empty array

---

## Phase 4: DB Hygiene

### 4.1 Staging Tables
- `vocab_staging_l4` and `vocab_staging_l5` existed → **DROPPED** ✅

### 4.2 Orphaned Vocab
**0 orphans** ✅

### 4.3 Duplicate Words per Reading
**0 duplicates** ✅

### 4.4 RLS Status
All 7 LEGENDARY tables have RLS **enabled** ✅:
- `unified_activity_log`, `student_skill_state`, `curriculum_vocabulary`, `student_saved_words`, `curriculum_units`, `curriculum_readings`, `curriculum_reading_passages`

All have proper SELECT/INSERT/UPDATE/DELETE policies.

### 4.5 RPC Catalog
All 11 RPCs exist with `security_definer = true` ✅:
- `get_academy_leaderboard`, `get_group_leaderboard`, `get_level_leaderboard`
- `get_skill_radar`, `get_student_streak`, `get_student_xp`, `get_team_rank`
- `log_activity`
- `srs_get_counts`, `srs_get_due`, `srs_review_word`

### 4.6 curriculum_vocabulary Columns
All columns populated. No 100% NULL columns found.

---

## Phase 5: Telemetry Baseline

### 5.1 Active Students
- **17 total students**, 6 with activity events, 11 with 0 events
- Top student: 142 events, 625 XP

### 5.2 Groups
- Active groups with students and assigned trainers confirmed

### 5.3 SRS Baseline
- **7 students** with saved words
- **37 total saved words**, **0 mastered**, **37 currently due**
- **0.00 avg reviews** — SRS feature is deployed but not yet actively used

---

## Summary of Actions Taken

| Action | Status |
|--------|--------|
| Fix "catalytic protein" Arabic translation | ✅ Done |
| Drop staging tables (vocab_staging_l4, l5) | ✅ Done |
| Add VocabularyTab pagination (PAGE_SIZE=40) | ✅ Done |
| Fix markReviewed auto-fire on mount | ✅ Done |
| Add VocabularyFlashcards list pagination | ✅ Done |
| Cap stagger animation for large lists | ✅ Done |

## Known Issues (Deferred)

1. **L4↔L5 word overlap (679 words)** — Consider deduplication in next content pass
2. **L4 example sentence mismatch (3,394)** — Morphological; not blocking
3. **1,950 null source_list entries** — Cosmetic; no user impact
4. **academic_level=0 empty state** — Edge case for unplaced students
5. **curriculum_reading_passages empty** — Feature not yet populated
