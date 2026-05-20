# VOCAB PREMIUM — PROMPT 01 — AUDIT (PHASE A, READ-ONLY)

> Part 1 of 8 in the Premium Vocabulary rebuild series.
> **READ-ONLY.** No migrations, no code changes. Output is a single truth document.

---

## 🎯 GOAL

Probe production Supabase, the codebase, the routes, the npm dependencies, and live data — then produce ONE comprehensive truth document at `docs/vocab-section/PHASE-A-AUDIT.md`.

This document will dictate the exact shape of Prompts 02–08. Without it, we risk re-building things that already exist (waste) or assuming things that don't exist (outage). It must be exhaustive, scannable, and honest.

---

## 🧭 CONTEXT

- **Repo**: `alialahmad2000/fluentia-lms` — branch `main`
- **Stack**: React 18 + Vite + Tailwind + Supabase (Frankfurt Pro, ref `nmjexpuycmqcxuwljier`) + Vercel
- **Supabase MCP**: use `mcp__supabase__list_tables`, `mcp__supabase__execute_sql` — always preferred over Dashboard SQL
- **Vocabulary system** spans Sessions 16 (mastery) + 19 (chunks, FSRS, hard words, enrichment) + 19-followup (responsive tabbed layout). Some Session 19 prompts shipped, some didn't, some shipped partially. Your job is to find out exactly what.

---

## 📋 SCOPE — WHAT TO PROBE

### A) DATABASE (Supabase MCP)

For each item below: report **exists yes/no**, **column inventory** (where applicable), and **row count**.

**A.1 — Core tables (expected to exist):**
- `vocabulary` — also list ALL its columns including any JSONB enrichment columns (`synonyms`, `antonyms`, `word_family`, `pronunciation_alert`, `relationships_generated_at`, `enrichment_generated_at`)
- `vocabulary_word_mastery`
- `xp_transactions`
- `profiles` — list any vocab/anki-related columns (`preferred_chunk_size`, `anki_daily_new_cards`, `anki_daily_max_reviews`, `anki_review_order`, `anki_autoplay_audio`)

**A.2 — Session 19 tables (may or may not exist):**
- `vocabulary_quiz_attempts` (Prompt 30)
- `anki_cards` (Prompt 32)
- `anki_review_logs` (Prompt 32)

**A.3 — DB functions / triggers:**
- `update_vocabulary_mastery_level()` — confirm exists
- Any trigger on `vocabulary_word_mastery`
- Any trigger or function whose name contains `anki` or `vocab_quiz` or `chunk`

**A.4 — RLS policies (just count, list policy names) for:**
- `vocabulary`
- `vocabulary_word_mastery`
- `vocabulary_quiz_attempts` (if exists)
- `anki_cards` (if exists)
- `anki_review_logs` (if exists)

**A.5 — Vocabulary data quality probe:**

Run these SQL queries via Supabase MCP and put the raw results in the audit doc:

```sql
-- Total words + per-level breakdown
SELECT level, COUNT(*) AS total_words
FROM vocabulary
GROUP BY level
ORDER BY level;
```

```sql
-- Per-unit vocabulary distribution (top 20 + bottom 20)
SELECT unit_id, COUNT(*) AS word_count
FROM vocabulary
GROUP BY unit_id
ORDER BY word_count DESC
LIMIT 20;
```

```sql
-- Audio coverage
SELECT
  COUNT(*) AS total,
  COUNT(audio_url) AS with_audio,
  COUNT(*) FILTER (WHERE audio_url IS NULL) AS without_audio
FROM vocabulary;
```

```sql
-- Enrichment coverage — ONLY run for columns that exist (check first via information_schema)
-- For each JSONB column that exists on vocabulary, report:
-- total rows, rows where column IS NOT NULL, rows where it's an empty object/array
-- Example for synonyms:
SELECT
  COUNT(*) AS total,
  COUNT(synonyms) AS populated,
  COUNT(*) FILTER (WHERE synonyms IS NULL) AS null_rows,
  COUNT(*) FILTER (WHERE synonyms::text = '{}' OR synonyms::text = '[]') AS empty_rows
FROM vocabulary;
```

Repeat the enrichment probe for: `antonyms`, `word_family`, `pronunciation_alert`. **Skip any column that does not exist** (don't error — log "column not found" in the audit).

**A.6 — Mastery activity (alive system probe):**

```sql
-- How many students have any mastery data
SELECT COUNT(DISTINCT user_id) AS students_with_mastery
FROM vocabulary_word_mastery;
```

```sql
-- Words mastered across the system
SELECT mastery_level, COUNT(*) AS rows
FROM vocabulary_word_mastery
GROUP BY mastery_level;
```

```sql
-- Most recent mastery activity (newest 5 rows)
SELECT user_id, vocabulary_id, mastery_level, updated_at
FROM vocabulary_word_mastery
ORDER BY updated_at DESC
LIMIT 5;
```

If `anki_cards` exists, also run:
```sql
SELECT COUNT(DISTINCT user_id) AS students_using_anki, COUNT(*) AS total_cards FROM anki_cards;
SELECT state, COUNT(*) FROM anki_cards GROUP BY state;
```

---

### B) CODEBASE FILES

For each path below: report **exists yes/no**, file size in bytes, and last commit date if `git log -1 --format=%ci -- <path>` returns anything.

**B.1 — Vocabulary tab + supporting:**
- `src/components/curriculum/VocabularyTab.jsx`
- `src/hooks/useVocabularyMastery.js` (or `.jsx`)
- `src/components/vocabulary/WordExerciseModal.jsx` (or wherever it lives — `grep -rl "WordExerciseModal" src/` to find it)
- `src/components/vocabulary/WordRelationships.jsx` (Prompt 31)
- `src/components/vocabulary/WordFamilySection.jsx` (Prompt 35)
- `src/components/vocabulary/PronunciationAlert.jsx` (Prompt 36)
- `src/components/vocabulary/VocabularyChunkCard.jsx` or similar (Prompt 30)
- `src/components/vocabulary/QuizModal.jsx` or similar (Prompt 30)

**B.2 — Anki components (Prompt 32):**
- `src/pages/student/AnkiHome.jsx` (or `AnkiPage.jsx` or `Anki.jsx` — grep for it)
- `src/components/anki/AnkiReviewSession.jsx`
- `src/components/anki/AnkiSessionComplete.jsx`
- `src/components/anki/AnkiSettings.jsx`
- `src/components/anki/AnkiStatsCard.jsx`

**B.3 — Hard Words Training (Prompt 33):**
- `src/pages/student/HardWords*.jsx` — grep for any file containing "HardWords" or "hard-words"

**B.4 — Utility scripts and migrations:**
- `supabase/migrations/` — list ALL migration files whose filename contains `vocab`, `anki`, `mastery`, `chunk`, `quiz`, `synonym`, `family`, `pronunciation`
- `prompts/agents/` — list any vocab/anki-related prompt files that exist there (legacy from Session 19)

**B.5 — Generic search for orphaned references:**

Run these and include results:
```bash
grep -rl "preferred_chunk_size" src/ 2>/dev/null
grep -rl "ts-fsrs" src/ 2>/dev/null
grep -rl "anki_cards" src/ 2>/dev/null
grep -rl "vocabulary_quiz_attempts" src/ 2>/dev/null
grep -rl "pronunciation_alert" src/ 2>/dev/null
grep -rl "word_family" src/ 2>/dev/null
```

---

### C) ROUTES

Read `src/App.jsx` (or wherever the router lives — `grep -rl "createBrowserRouter\|<Routes>" src/`). Extract and report any route paths that match:
- `/student/anki*`
- `/student/hard-words*`
- `/student/vocabulary*`
- Routes that contain "vocab", "anki", "review", "drill", "chunk"

Also check `src/config/navigation.js` for any nav items pointing to these routes.

---

### D) DEPENDENCIES

Read `package.json` and report whether these are installed (and what version):
- `ts-fsrs` (FSRS algorithm for Anki — Prompt 32)
- `framer-motion`
- `recharts`
- `@tanstack/react-query`
- `zustand`
- `lucide-react`

---

### E) LIVE STATE (one quick sanity check)

The current `VocabularyTab.jsx` rendered for a real unit — describe what UI sections it contains by reading the JSX. For each section say: section name, what data it shows, what user interactions it supports. Don't infer, **read the file**.

---

## 📄 OUTPUT — `docs/vocab-section/PHASE-A-AUDIT.md`

Create this exact file. Use this structure:

```markdown
# Premium Vocabulary Rebuild — PHASE A AUDIT
**Generated**: <ISO timestamp>
**Auditor**: Claude Code (read-only Phase A)
**Repo HEAD**: <commit hash>

## 1 — VERDICT IN ONE TABLE

| Session 19 Prompt | Status | Evidence |
|---|---|---|
| 30 — Chunks + Quiz | SHIPPED / PARTIAL / NOT SHIPPED | <files exist + table exists + columns populated> |
| 31 — Synonyms + Antonyms | … | <coverage % on `vocabulary.synonyms`> |
| 32 — Anki FSRS Core | … | <tables, components, route, ts-fsrs> |
| 33 — Hard Words Training | … | <route, component> |
| 34 — Section Restructure | … | <new tab/route layout> |
| 35 — Word Families | … | <coverage % on `vocabulary.word_family`> |
| 36 — Pronunciation Alerts | … | <coverage % on `vocabulary.pronunciation_alert`> |
| 37 — Responsive Tabbed Layout | … | <code patterns> |

## 2 — DATABASE

### 2.1 Tables present
…

### 2.2 Vocabulary table — full column inventory
…

### 2.3 Profiles — vocab/anki columns
…

### 2.4 Enrichment coverage (% populated)
| Column | Total rows | Populated | NULL | Empty |
|---|---|---|---|---|
| synonyms | … | … | … | … |
…

### 2.5 Vocabulary distribution
- Per level: …
- Per unit (top 20): …
- Audio coverage: …

### 2.6 Mastery activity
- Students using mastery: …
- Mastery state breakdown: …
- Last activity: …

### 2.7 Anki activity (if exists)
…

### 2.8 DB functions & triggers
…

### 2.9 RLS policies
…

## 3 — CODEBASE FILES

### 3.1 Vocabulary tab + supporting
| Path | Exists | Size | Last commit |
|---|---|---|---|
…

### 3.2 Anki components
…

### 3.3 Hard Words components
…

### 3.4 Migrations matching vocab/anki/mastery/chunk/quiz/synonym/family/pronunciation
…

### 3.5 Orphaned reference grep results
…

## 4 — ROUTES
…

## 5 — DEPENDENCIES
…

## 6 — LIVE STATE — VocabularyTab.jsx today
- Section 1: <name> — <data> — <interactions>
- Section 2: …
…

## 7 — RECOMMENDED PROMPT 02–08 SHAPE

Based on findings, recommend:

- **Prompt 02 (Enrichment Fill)**: needed for which JSONB columns? Skip entirely? Run for how many rows?
- **Prompt 03 (Anki FSRS)**: full build? Or only finish missing pieces? List exactly what's missing.
- **Prompt 04 (Hard Words)**: full build? Or extend existing?
- **Prompt 05 (Hero Shell)**: any existing structure to wrap, or full rewrite?
- **Prompt 06 (Journey Lane)**: chunks system exists? Reuse, extend, or rebuild?
- **Prompt 07 (Library + Detail Sheet)**: existing premium cards reusable? What gets replaced?
- **Prompt 08 (Polish + Gaps)**: top 5 gaps to fill based on what was found.

## 8 — RISK FLAGS

Anything that looks broken, half-built, contradictory, or risky to touch:
- …
- …
```

---

## ⚠️ RULES

1. **READ-ONLY.** Do not modify any production data, schema, migration, or component. The only write is creating `docs/vocab-section/PHASE-A-AUDIT.md`.
2. **No assumptions.** Every claim in the audit must reference a SQL result, a file path + line, a grep hit, or a `package.json` line.
3. **No silence on missing things.** If a probe returns empty/missing, that's an explicit data point — record it.
4. **No re-running prompts from Session 19.** If a Prompt 30/31/32/35/36 file exists in `prompts/agents/`, do NOT execute it. Just record that it exists.
5. **Discovery before query.** Before SELECT-ing from a column, confirm it exists via `information_schema.columns`. Before SELECT-ing from a table, confirm it exists via `information_schema.tables` or the Supabase MCP `list_tables`.

---

## ✅ FINAL STEP — COMMIT + PUSH

```bash
mkdir -p docs/vocab-section
# (audit file already created at docs/vocab-section/PHASE-A-AUDIT.md)

git add docs/vocab-section/PHASE-A-AUDIT.md
git commit -m "docs(vocab-premium): phase A audit — read-only truth document for prompts 02-08"
git push origin main
```

After push: print the **last 80 lines of the audit file** to stdout so Ali can scan the verdict table + risk flags directly in his terminal without opening the file.

Then stop. Phase B prompts (02–08) come after Ali reads the audit and confirms.
