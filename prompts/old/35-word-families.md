# PROMPT 35: Word Families + Morphology Explanation

## 🎯 Goal
Enrich every vocabulary word with its complete word family (verb/noun/adjective/adverb/negatives), and for each derivative explain WHY it has that part of speech — identifying the affix, base word, rule in Arabic, and similar examples.

## 🔍 Discovery (DO FIRST)

```bash
grep -rn "CREATE TABLE.*vocabulary\b" supabase/migrations/
grep -rn "word\|meaning_en\|meaning_ar\|level" supabase/migrations/ | grep vocabulary
find src -type f -name "*.jsx" | xargs grep -l -i "vocabulary" 2>/dev/null
grep -rn "mastery_level" supabase/migrations/
```

Report: total vocab count, column names, current components rendering a word card.

## 🗄️ Migration: `add_word_family.sql`

```sql
ALTER TABLE vocabulary
  ADD COLUMN IF NOT EXISTS word_family JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS word_family_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vocab_family_pending
  ON vocabulary(id) WHERE word_family_generated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vocab_family_gin ON vocabulary USING GIN (word_family);
```

Apply: `npx supabase db push --linked`

## 📋 JSON Schema

Each family member:
```json
{
  "word": "different",
  "pos": "adjective",
  "level": 2,
  "vocabulary_id": "uuid-or-null",
  "is_base": false,
  "is_opposite": false,
  "morphology": {
    "affix": "-ent",
    "affix_type": "suffix",
    "base_word": "differ",
    "base_pos": "verb",
    "rule_ar": "اللاحقة -ent (أو -ant) تُضاف على الفعل فتحوّله إلى صفة تصف من يقوم بالفعل أو ما يتصف به",
    "similar_examples": ["depend → dependent", "persist → persistent", "differ → different"]
  }
}
```

Base word morphology:
```json
"morphology": { "is_base": true, "note_ar": "الصيغة الأصلية — منها تشتق باقي العائلة" }
```

Irregular (better, went, children):
```json
"morphology": {
  "affix": null,
  "irregular": true,
  "base_word": "good",
  "base_pos": "adjective",
  "note_ar": "صيغة غير قياسية — 'better' هي الصيغة المقارنة الشاذة من good. يجب حفظها كما هي."
}
```

## 🤖 Single-Agent Sequential Generation

ONE Claude Code agent processes the entire vocabulary table in order, batching by **30 words** (smaller than other prompts because morphology explanations are longer per word) and committing progress between batches.

### Why single-sequential

Context, discovery, and rules are loaded ONCE for the entire run. Each batch is just: query → reason → update → commit → next. ~80-90% reduction in token usage compared to spawning many independent agents.

### Generator helper script

`scripts/generate-families.cjs` is a small DB/progress helper (NOT a generator — Claude itself generates the content):

- `node scripts/generate-families.cjs --fetch 30` → prints next 30 pending words as JSON to stdout
- `node scripts/generate-families.cjs --apply <result.json>` → batch-updates vocabulary rows from a result file
- `node scripts/generate-families.cjs --status` → prints `{ total, done, pending }` counts

### Processing Loop

The agent runs this loop until no pending rows remain:

1. **Query pending work** (batch size 30):
   ```bash
   node scripts/generate-families.cjs --fetch 30 > /tmp/families-batch.json
   ```
   Result format: `[{ id, word, level, meaning_en, meaning_ar, pos }, ...]`
   If empty → loop is done, jump to step 5.

2. **Generate the word family for all 30 words in a single reasoning pass.** Use Claude's own linguistic knowledge — NO external API. Output a JSON array with one entry per input word:
   ```json
   [
     { "id": "uuid-from-input", "word_family": [ ...family members... ] },
     ...
   ]
   ```

   ### Per-word process
   1. Identify the base/root form
   2. List ALL standard derivatives that genuinely exist in English: verb, noun (action/result/doer), adjective forms, adverb form (-ly), negative forms (un-, in-, dis-)
   3. For each non-base derivative, write the morphology explanation
   4. Use your own linguistic knowledge — NO external API

   ### Family rules
   - 2-6 members typical. Some words have only themselves
   - Include the original word as a family member
   - Mark root with `is_base: true`
   - Mark negatives/opposites with `is_opposite: true`
   - CEFR level 1-5 per word
   - NEVER invent derivatives that don't exist
   - Set `vocabulary_id: null` — the helper script handles linking by querying `vocabulary` for each derivative word

   ### Morphology rules (per non-base derivative)
   1. Identify exact affix letters added
   2. Set affix_type: 'suffix' or 'prefix'
   3. Base word must be a real English word
   4. Base POS must be correct
   5. `rule_ar` — naturally written 1-2 Arabic sentences explaining WHY the transformation happens (not templated)
   6. `similar_examples` — 2-3 other words using the SAME affix with the SAME function

   ### Quality bar
   - Affix must actually be in the word (differ + -ent = different ✓)
   - `rule_ar` naturally written, not mechanical
   - `similar_examples` follow the same rule exactly
   - Irregular derivatives flagged with `irregular: true`

   ### Affix Reference

   **Suffixes**
   - -tion/-sion: verb → noun (decide → decision)
   - -ment: verb → noun (develop → development)
   - -ness: adj → noun (happy → happiness)
   - -ity/-ty: adj → noun (able → ability)
   - -er/-or: verb → noun/doer (teach → teacher)
   - -ing: verb → noun/adj (read → reading)
   - -able/-ible: verb → adj (read → readable)
   - -ful: noun → adj (care → careful)
   - -less: noun → adj (care → careless)
   - -ous: noun → adj (danger → dangerous)
   - -al: noun → adj (nation → national)
   - -ic: noun → adj (hero → heroic)
   - -ive: verb → adj (act → active)
   - -ent/-ant: verb → adj (differ → different)
   - -ly: adj → adverb (quick → quickly)
   - -ize/-ise: noun/adj → verb (modern → modernize)
   - -en: adj → verb (wide → widen)
   - -ify: noun/adj → verb (simple → simplify)

   **Prefixes**
   - un-: not/opposite (happy → unhappy)
   - in-/im-/il-/ir-: not (possible → impossible)
   - dis-: not/reverse (agree → disagree)
   - non-: not (sense → nonsense)
   - mis-: wrong (understand → misunderstand)
   - re-: again (do → redo)
   - pre-: before (view → preview)
   - over-: too much (eat → overeat)
   - under-: too little (paid → underpaid)

   Save the result array to `/tmp/families-batch.result.json`.

3. **Apply the batch update:**
   ```bash
   node scripts/generate-families.cjs --apply /tmp/families-batch.result.json
   ```

   The helper:
   - Validates each entry
   - Looks up `vocabulary_id` for each family member word (case-insensitive)
   - Clamps levels to 1-5
   - Updates each row: `word_family`, `word_family_generated_at = NOW()`
   - Verifies with `.select()` after the batch
   - Reports `{ updated, skipped, failed }`

4. **Commit progress** (no push):
   ```bash
   git add -A
   git commit -m "chore(families): processed words N-M"
   ```
   where N-M is the index range printed by the helper.

5. **Loop back to step 1** until `--fetch` returns an empty array.

6. **Final verification:**
   ```bash
   node scripts/verify-families.cjs
   ```

7. **Final commit + push:** see `📝 Git Commit (final)` below.

### Verification Script

`scripts/verify-families.cjs` already exists. It:
- Counts: total, with word_family, still NULL
- Checks ≥90% of non-base derivatives have non-null `morphology.affix`
- 5-10% flagged irregular
- Samples 10 random families → prints for manual review
- Flags `rule_ar` shorter than 30 chars
- Flags entries with fewer than 2 similar_examples
- Reports linked vs unlinked percentage

Run: `node scripts/verify-families.cjs`

## 🎨 UI Component

### Create `src/components/vocabulary/WordFamilySection.jsx`

Props: `wordFamily: Array, studentId: string`

Behavior:
1. Collect all non-null `vocabulary_id` from family
2. Query: `SELECT vocabulary_id FROM vocabulary_mastery WHERE student_id = $1 AND vocabulary_id = ANY($2) AND mastery_level IN ('reviewing', 'mastered')`
3. Build Set of mastered IDs
4. Render as ALWAYS-VISIBLE table (NOT collapsible)

### Desktop Table

Columns: الكلمة | النوع | المستوى | الحالة | ليش؟

- Container: `bg-slate-800/40 border border-slate-700 rounded-xl p-4 mt-4`
- Title: "📚 عائلة الكلمة" — `text-slate-300 text-sm font-medium mb-3`
- Base word row: `bg-sky-950/40 ring-1 ring-sky-500/30`
- Other rows: `hover:bg-slate-800/60 transition-colors`
- ⭐ before base word, ↔ before opposites
- POS in Arabic: فعل / اسم / صفة / ظرف / صفة مضادة
- Level badge colors (match Prompt 31):
  - L1: `bg-emerald-500/20 text-emerald-300 border-emerald-500/40`
  - L2: `bg-sky-500/20 text-sky-300 border-sky-500/40`
  - L3: `bg-amber-500/20 text-amber-300 border-amber-500/40`
  - L4: `bg-orange-500/20 text-orange-300 border-orange-500/40`
  - L5: `bg-rose-500/20 text-rose-300 border-rose-500/40`
- "تعرفها ✓": `bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full`
- ⓘ icon: `text-slate-400 hover:text-amber-400 cursor-pointer`

### Mobile Layout
On `< sm` screens, collapse table into stacked cards.

### "ليش؟" Interaction
- Desktop: click ⓘ → inline expand below row (accordion) OR hover tooltip
- Mobile: tap ⓘ → bottom sheet modal

### Modal/Expand Content
```
ليش "different" صفة؟

📐 اللاحقة: -ent
📍 الأصل: differ (فعل)

💡 القاعدة:
اللاحقة -ent (أو -ant) تُضاف على الفعل
فتحوّله إلى صفة تصف من يقوم بالفعل
أو ما يتصف به.

📚 أمثلة مشابهة:
• depend → dependent
• persist → persistent
• differ → different
```

Styling:
- Container: `bg-slate-900 border border-slate-700 rounded-xl p-4`
- Affix: `text-amber-400 font-mono text-base`
- Section labels: `text-slate-400 text-xs uppercase mb-1`
- Rule text: `text-slate-200 leading-relaxed`
- Examples chips: `bg-slate-800 text-slate-300 rounded-md px-2 py-1 text-xs`

### Irregular Display
```
ليش "better" صفة مقارنة؟

⚠️ صيغة غير قياسية

💡 'better' هي الصيغة المقارنة الشاذة من good.
ما تتبع القاعدة العادية (good + er).
يجب حفظها كما هي.
```
Use `bg-amber-950/30 border border-amber-700/50` for irregular cases.

## 🔗 Integration Points

Mount `<WordFamilySection />` in:
1. Flashcard back (below synonyms/antonyms from Prompt 31)
2. Vocabulary detail modal
3. Anki review card back (after flip)

Do NOT mount in chunk grid views.

Order on card back:
1. Arabic meaning
2. Example sentence
3. Pronunciation alert (if exists, from Prompt 36)
4. Synonyms/Antonyms (from Prompt 31)
5. Word Family (this component)

## 🚫 What NOT to Change
- ❌ Do NOT modify vocabulary_mastery schema
- ❌ Do NOT touch synonyms/antonyms columns
- ❌ Do NOT touch pronunciation_alert column
- ❌ Do NOT regenerate Arabic definitions
- ❌ Do NOT run `vite build` locally
- ❌ Do NOT spawn sub-agents — this prompt is intentionally single-sequential

## ✅ Integration Test

1. Run `--fetch 30` → verify a JSON batch comes back
2. Generate one batch → run `--apply` → verify DB updated
3. Open LMS → find a word with rich family (e.g. "decide")
4. Flashcard back shows WordFamilySection as visible table
5. Base word has ⭐ and row highlight
6. "decision" row shows ✓ if student mastered it
7. Click ⓘ on "decision" → see morphology: -sion / decide / rule / examples
8. Test irregular word (e.g. "better") → shows irregular warning
9. Test on mobile → table becomes stacked cards, ⓘ opens bottom sheet
10. Run `verify-families.cjs` → ≥95% coverage, ≥90% of derivatives have morphology

## 🏃 How Ali Runs It

Open ONE Claude Code tab and run:

```
Read and execute prompts/agents/35-word-families.md
```

The agent loops internally through all batches of 30 until no pending rows remain.

## 📝 Git Commit (final, after the loop ends)

```bash
cd C:\Users\Dr. Ali\Desktop\fluentia-lms

git add -A
git commit -m "feat(vocabulary): word families with morphology explanations

- Added word_family JSONB column with affix/base/rule/examples
- Generated for all vocabulary via single sequential Claude Code agent
- Each derivative explains WHY it has its POS (affix + base + rule_ar)
- Handles 30+ common English suffixes and prefixes
- Irregular cases (went, better, children) flagged separately
- New WordFamilySection component with always-visible table
- Click ⓘ to see morphology explanation per derivative
- Base word highlighted, mastered derivatives show 'تعرفها ✓'
- Mobile: stacked cards + bottom sheet modals

Part of Session 19 vocabulary overhaul."

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

## ✅ Definition of Done
- [ ] Migration applied
- [ ] Single-agent loop ran to completion (helper `--status` reports `pending: 0`)
- [ ] Verification: ≥95% coverage, ≥90% of derivatives have morphology, 5-10% irregular
- [ ] WordFamilySection renders in all 3 integration points
- [ ] Base word highlighted with ⭐
- [ ] Mastered derivatives show ✓
- [ ] "ليش؟" tooltip/modal works on desktop and mobile
- [ ] Irregular words display correctly
- [ ] Pushed and deployed
