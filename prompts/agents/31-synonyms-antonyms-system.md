# PROMPT 31: Vocabulary Synonyms & Antonyms System

## 🎯 Goal
Enrich every vocabulary word with **synonyms** and **antonyms**, each tagged with its CEFR level and linked to the vocabulary table when the related word exists in our system. Students see a "word network" that helps them connect new words to ones they already know, with "تعرفها ✓" tags on mastered synonyms and a ⭐ on the strongest (highest-level) synonym.

This creates **Vocabulary Network Learning** — the Cambridge approach where a student learning `furious` sees it's the stronger form of `angry` (which they already know from L1).

## 📋 Student Insight (Root Cause)
Student requested: when I learn a new word, show me synonyms and antonyms, each with its level, so I understand "this is just a stronger version of a word I already know". This turns memorization into connection-making.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART A: DATABASE + CORE INFRASTRUCTURE
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 Discovery (DO FIRST)

```bash
# Find vocabulary table schema
grep -rn "CREATE TABLE.*vocabulary\b" supabase/migrations/

# Find vocabulary list/detail components
find src -type f \( -name "*.jsx" -o -name "*.js" \) | xargs grep -l -i "vocabulary" 2>/dev/null

# Confirm vocabulary_mastery table structure
grep -rn "vocabulary_mastery" supabase/migrations/
```

**Report before changes:**
- Total vocabulary row count + breakdown per level
- Exact column names on `vocabulary` table
- Whether the word column is `word`, `term`, or something else

### A.2 Migration: `add_synonyms_antonyms.sql`

```sql
-- Add relationship columns as JSONB for flexibility
ALTER TABLE vocabulary
  ADD COLUMN IF NOT EXISTS synonyms JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS antonyms JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS relationships_generated_at TIMESTAMPTZ;

-- Format for each array element:
-- {
--   "word": "enraged",
--   "level": 4,
--   "vocabulary_id": "uuid-or-null",  -- set if word exists in our vocabulary table
--   "is_strongest": false              -- true for the highest-level synonym
-- }

-- Index for picking up unprocessed rows
CREATE INDEX IF NOT EXISTS idx_vocab_relationships_pending
  ON vocabulary(id)
  WHERE relationships_generated_at IS NULL;

-- GIN index for potential future lookups
CREATE INDEX IF NOT EXISTS idx_vocab_synonyms_gin ON vocabulary USING GIN (synonyms);
CREATE INDEX IF NOT EXISTS idx_vocab_antonyms_gin ON vocabulary USING GIN (antonyms);
```

Apply via: `npx supabase db push --linked`

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART B: SINGLE-AGENT SEQUENTIAL GENERATION
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ONE Claude Code agent processes the entire vocabulary table in order, batching by 50 words and committing progress between batches.

### B.1 Why single-sequential

- Context loaded ONCE for the entire run
- Discovery done ONCE
- Schema + rules read ONCE
- Each batch of 50 words is just: query → reason → update → commit → next
- Memory usage grows linearly
- ~80-90% reduction in token usage compared to spawning many independent agents

### B.2 Generator helper script

`scripts/generate-relationships.cjs` is a small DB/progress helper (NOT a generator — Claude itself generates the content). It exposes:

- `node scripts/generate-relationships.cjs --fetch 50` → prints next 50 pending words as JSON to stdout
- `node scripts/generate-relationships.cjs --apply <result.json>` → batch-updates vocabulary rows from a result file
- `node scripts/generate-relationships.cjs --status` → prints `{ total, done, pending }` counts

This keeps DB credentials and SQL out of the agent prompt and makes batches restartable.

### B.3 Processing Loop

The agent runs this loop until no pending rows remain:

1. **Query pending work** (batch size 50):
   ```bash
   node scripts/generate-relationships.cjs --fetch 50 > /tmp/batch.json
   ```
   Result format: `[{ id, word, level, meaning_en, meaning_ar, pos }, ...]`
   If empty → loop is done, jump to step 7.

2. **Generate enrichment for all 50 words in a single reasoning pass.** Use Claude's own linguistic knowledge — NO external API, NO per-word LLM call. One reasoning pass produces a JSON array with one entry per input word:
   ```json
   [
     {
       "id": "uuid-from-input",
       "synonyms": [
         { "word": "angry",    "level": 1 },
         { "word": "mad",      "level": 1 },
         { "word": "enraged",  "level": 4 }
       ],
       "antonyms": [
         { "word": "calm",     "level": 2 },
         { "word": "peaceful", "level": 2 }
       ]
     },
     ...
   ]
   ```

   ### Quality rules (apply per word)
   1. **Exactly 3 synonyms** per word (fewer only if the word truly has fewer)
   2. **2-3 antonyms** per word (0 allowed for words with no antonym, e.g. "table")
   3. **CEFR levels: 1-5** (never 0, never 6+)
   4. **Quality over quantity**: each synonym must genuinely share ≥80% meaning in at least one context. No loose associations.
   5. **Level accuracy**: use CEFR-J wordlist knowledge. `happy`=L1, `joyful`=L2, `elated`=L4, `ecstatic`=L5. If unsure, bias toward commonly-taught level.
   6. **POS match**: synonym must share part of speech with the original word
   7. **No self-reference**: the word itself can't be its own synonym
   8. **No duplicates** within synonyms or antonyms arrays

   Save the result array to `/tmp/batch.result.json`.

3. **Apply the batch update** (the helper script does the linking + strongest-flag step + DB write):
   ```bash
   node scripts/generate-relationships.cjs --apply /tmp/batch.result.json
   ```

   The helper:
   - Looks up `vocabulary_id` for each synonym/antonym word (case-insensitive)
   - Marks the highest-level synonym with `is_strongest: true`
   - Updates each row: `synonyms`, `antonyms`, `relationships_generated_at = NOW()`
   - Verifies with `.select()` after the update batch
   - Reports `{ updated, skipped, failed }`

4. **Commit progress** (no push):
   ```bash
   git add -A
   git commit -m "chore(relations): processed words N-M"
   ```
   where N-M is the index range of the batch within the original total (the helper prints these for you).

5. **Loop back to step 1** until `--fetch` returns an empty array.

6. **Final verification:**
   ```bash
   node scripts/verify-relationships.cjs
   ```

7. **Final commit + push:** see `📝 Git Commit (final)` below.

#### Expected wall-clock time
- ~30-45 minutes for ~1,500 words

### B.4 Verification Script (after the loop ends)

`scripts/verify-relationships.cjs` already exists. It:

1. Counts: total words, words with synonyms, words with antonyms, words still NULL
2. Samples 20 random words and prints their relationships for manual spot-check
3. Checks for common issues: empty synonym arrays, invalid level values (not 1-5), missing `is_strongest` flag
4. Reports linked vs unlinked percentage (how many synonyms point to real vocabulary IDs)

Run: `node scripts/verify-relationships.cjs`

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART C: UI COMPONENT
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 Create `src/components/vocabulary/WordRelationships.jsx`

Props:
- `synonyms: Array`, `antonyms: Array`, `studentId: string`

Behavior:
1. Collects all `vocabulary_id` values that exist (not null)
2. Single query: `SELECT vocabulary_id FROM vocabulary_mastery WHERE student_id = $1 AND vocabulary_id = ANY($2) AND mastery_level IN ('reviewing', 'mastered')`
3. Builds a Set of mastered IDs
4. Renders each synonym/antonym as a badge

### C.2 Badge Design (use Fluentia dark theme tokens)

**Synonym badge:**
- Base: `bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5`
- Level color ring on the left side (dot):
  - L1: `bg-emerald-400`
  - L2: `bg-sky-400`
  - L3: `bg-amber-400`
  - L4: `bg-orange-400`
  - L5: `bg-rose-400`
- Word in English (LTR) — `text-slate-100`
- Level label next to dot: `L3` — `text-slate-400 text-xs`
- If `is_strongest`: gold ⭐ icon + `ring-2 ring-amber-400/50`
- If student mastered this synonym: green ✓ icon + tooltip "تعرفها"

**Antonym badge:**
- Same structure but with a small ↔ or X icon prefix
- Border: `border-rose-900/40`

### C.3 Layout

```
المرادفات ⭐
[🟢 angry L1 ✓] [🟢 mad L1 ✓] [🟠 enraged L4 ⭐]

الأضداد
[🔵 calm L2 ✓] [🔵 peaceful L2]
```

- Arabic section titles
- Grid: `flex flex-wrap gap-2`
- Section heading: `text-slate-300 text-sm font-medium mb-2`

### C.4 Integration Points

Mount `<WordRelationships />` inside:
1. **Flashcard back** (card-flip view) — below the example sentence
2. **Vocabulary detail modal** — dedicated section
3. **Quiz result screen** (from Prompt 30) — show relationships for words the student got wrong

Do NOT mount inside chunk selector or list views (too noisy).

---

## 🚫 What NOT to Change
- ❌ Do NOT modify `vocabulary_mastery` schema
- ❌ Do NOT regenerate existing vocabulary Arabic definitions
- ❌ Do NOT run `vite build` locally
- ❌ Do NOT call external APIs in the agent — Claude's own knowledge only
- ❌ Do NOT spawn sub-agents — this prompt is intentionally single-sequential

## ✅ Integration Test

1. Run `--fetch 50` → verify a JSON batch comes back
2. Generate one batch → run `--apply` → verify DB updated
3. Open LMS → navigate to a processed word → open flashcard
4. Verify `WordRelationships` component renders
5. Verify level badges colored correctly
6. Verify "تعرفها ✓" appears on synonyms the student has mastered
7. Verify ⭐ on the highest-level synonym
8. Click a linked synonym → (optional future: opens that word's detail)
9. Run `verify-relationships.cjs` → ≥98% coverage, no level errors

## 🏃 How Ali Runs It

Open ONE Claude Code tab and run:

```
Read and execute prompts/agents/31-synonyms-antonyms-system.md
```

The agent loops internally through all batches of 50 until no pending rows remain.

## 📝 Git Commit (final, after the loop ends)

```bash
cd C:\Users\Dr. Ali\Desktop\fluentia-lms

git add -A
git commit -m "feat(vocabulary): synonyms + antonyms network learning

- Added JSONB synonyms/antonyms columns to vocabulary table
- Generated relationships for all ~1,500 words via single sequential agent
- Each synonym/antonym tagged with CEFR level (1-5)
- Linked to vocabulary_id when word exists in our system
- Strongest synonym marked with is_strongest flag
- New WordRelationships component with level color coding
- Shows 'تعرفها ✓' tag on mastered synonyms
- Integrated into flashcard back, detail modal, quiz results

Enables Cambridge-style Vocabulary Network Learning."

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

## ✅ Definition of Done
- [ ] Migration applied
- [ ] Single-agent loop ran to completion (helper `--status` reports `pending: 0`)
- [ ] Verification script: ≥98% coverage, 0 invalid levels
- [ ] `WordRelationships` component renders in all 3 integration points
- [ ] Level colors correct
- [ ] "تعرفها ✓" tag works
- [ ] ⭐ appears on strongest synonym
- [ ] Pushed to main, Vercel deployed
