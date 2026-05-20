# VOCAB PREMIUM — PROMPT 02 — ENRICHMENT FILL

> Part 2 of 8 in the Premium Vocabulary rebuild series.
> **Long-running data generation.** Single-sequential-agent. Idempotent. Resume-safe. Commits per batch.
> Reference: `docs/vocab-section/PHASE-A-AUDIT.md` (commit `240dede`) for ground truth.

---

## 🎯 GOAL

Fill the four enrichment JSONB columns on `curriculum_vocabulary` for every row currently NULL/empty:

| Column | Current coverage | Target | Format |
|---|---|---|---|
| `synonyms` | 10.6% | 100% | array of 3 objects, CEFR-tagged |
| `antonyms` | 8.6% | 100% | array of 2–3 objects, CEFR-tagged |
| `word_family` | 9.7% | 100% | object with derivatives (verb/noun/adj/adv) + flags |
| `pronunciation_alert` | 2.9% | 100% of WORDS THAT NEED IT (expected 20–35% of all rows; the rest stay NULL) | object with IPA + Arabic explanation + flags, OR NULL (no false alerts) |

Generation runs from **Claude Code's own linguistic knowledge** — no external API call, $0 with Claude Max.

---

## 🧭 CONTEXT

- **Repo**: `alialahmad2000/fluentia-lms` — branch `main`
- **Supabase**: ref `nmjexpuycmqcxuwljier` — use MCP (`mcp__supabase__execute_sql`, `mcp__supabase__apply_migration`)
- **Table**: `curriculum_vocabulary` (NOT `vocabulary` — historical confusion in older prompts)
- **Rows**: 13,930 total
- **Why this matters**: Prompts 05–08 build a premium Word Detail Sheet that surfaces all four enrichments. Without them populated, ~90% of word cards show empty sections. Enrichment fill is the data foundation for everything visual that follows.

---

## 🚦 STRATEGY

### Priority order (process levels in this exact sequence):
1. **Active student levels first** — confirm via `SELECT DISTINCT level FROM profiles p JOIN group_members gm ON gm.user_id = p.id JOIN groups g ON g.id = gm.group_id WHERE g.is_active = true` (or however active groups are tracked — verify via schema first). Typically L1 + L3.
2. **Then remaining levels** in ascending order.

### Per column, per level, the loop:
```
FOR each (column, level) pair in priority order:
  Step 1: Count remaining NULL rows for (column, level)
  Step 2: While count > 0:
    a) Fetch next batch of 30 words where column IS NULL (deterministic ORDER BY id)
    b) Generate enrichment data for each word using linguistic knowledge
    c) Validate output against schema (Phase Q below)
    d) UPDATE curriculum_vocabulary SET column = ... WHERE id = ...
    e) Commit + push: `chore(vocab-enrich): {column} L{n} batch starting at id {x}`
    f) Refresh count
```

### Why single-sequential-agent (not 10 parallel):
- 10 parallel was abandoned in Session 19 (Prompt 38) — burned 50%+ of weekly Max quota in hours.
- Single agent at 30 words/batch ≈ identical throughput when accounting for restart overhead, and ~80% lower token usage.

### Idempotency contract:
- A row is "needs enrichment" iff `column IS NULL` **OR** `column::text IN ('{}', '[]', 'null')`.
- A row is "done" if column is a non-empty JSON value, even if generated long ago by Session 19. Never overwrite existing data.
- The agent can be killed mid-run and restarted — it picks up at the next NULL row automatically.

---

## 📋 PHASE A — DISCOVERY (5 minutes, read-only)

Run and print:

```sql
-- 1. Confirm column types match expected JSONB
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'curriculum_vocabulary'
  AND column_name IN ('synonyms', 'antonyms', 'word_family', 'pronunciation_alert');

-- 2. NULL counts per column per level
SELECT
  level,
  COUNT(*) FILTER (WHERE synonyms IS NULL OR synonyms::text IN ('{}', '[]', 'null')) AS synonyms_null,
  COUNT(*) FILTER (WHERE antonyms IS NULL OR antonyms::text IN ('{}', '[]', 'null')) AS antonyms_null,
  COUNT(*) FILTER (WHERE word_family IS NULL OR word_family::text IN ('{}', '[]', 'null')) AS family_null,
  COUNT(*) FILTER (WHERE pronunciation_alert IS NULL) AS pronun_null,
  COUNT(*) AS total
FROM curriculum_vocabulary
GROUP BY level
ORDER BY level;

-- 3. Identify active levels
-- Adapt this query to the actual schema — confirm column/table names first via information_schema
SELECT DISTINCT p.current_level AS level
FROM profiles p
WHERE p.role = 'student'
  AND p.current_level IS NOT NULL;
```

Also check for existing enrichment scripts:
```bash
ls -la prompts/agents/ 2>/dev/null | grep -iE "synonym|antonym|famil|pronunci|enrich"
```

If any Session 19 enrichment scripts exist, **read them** — reuse the JSON schemas and validation logic if compatible. Do not re-execute the old prompts; they may target wrong table/column names.

Print the discovery results before starting Phase B.

---

## 📦 PHASE B — GENERATION LOOP

Process in this order:
- Pass 1: `synonyms` × (L1, L3, L2, L4, L0, L5)
- Pass 2: `antonyms` × (L1, L3, L2, L4, L0, L5)
- Pass 3: `word_family` × (L1, L3, L2, L4, L0, L5)
- Pass 4: `pronunciation_alert` × (L1, L3, L2, L4, L0, L5)

**Adjust the level order in Phase A** if discovery reveals active levels are different from L1/L3.

### Batch fetch (30 words per batch):

```sql
SELECT id, word, meaning_ar, level, unit_id, part_of_speech, example_sentence
FROM curriculum_vocabulary
WHERE level = $1
  AND ({column} IS NULL OR {column}::text IN ('{}', '[]', 'null'))
ORDER BY id ASC
LIMIT 30;
```

### Generation prompts per column

#### B.1 — `synonyms` schema

For each word, produce exactly 3 synonyms:

```json
{
  "items": [
    {
      "word": "<English synonym>",
      "meaning_ar": "<Arabic meaning>",
      "cefr_level": 1,
      "is_strongest": false
    },
    ...
  ],
  "generated_at": "<ISO timestamp>",
  "model": "claude-code"
}
```

Rules:
- Exactly 3 synonyms unless the word is technical/rare and only 1–2 exist (minimum 1).
- `cefr_level`: 1=A1, 2=A2, 3=B1, 4=B2, 5=C1/C2. Use your judgment.
- `is_strongest = true` on the highest-CEFR synonym (most "advanced register"). Exactly one per word.
- Synonyms must match the **same part of speech** as the base word (use `part_of_speech` field).
- If a synonym happens to also exist in our `curriculum_vocabulary` table, additionally set `"known_word_id": <uuid>` — check with a single `SELECT id FROM curriculum_vocabulary WHERE word = $1 LIMIT 1` per candidate.

#### B.2 — `antonyms` schema

Same structure as synonyms but 2–3 items (minimum 2). Set `is_strongest` on highest-CEFR antonym. If the word has no meaningful antonym (e.g., proper nouns, "Tuesday"), write `{"items": [], "generated_at": "...", "model": "claude-code", "no_antonym_reason": "<short reason>"}` instead of skipping — this prevents the row from being re-processed on restart.

#### B.3 — `word_family` schema

```json
{
  "derivatives": [
    {
      "word": "<derivative>",
      "part_of_speech": "verb|noun|adj|adv",
      "meaning_ar": "<Arabic meaning>",
      "cefr_level": 2,
      "is_base": false,
      "is_opposite": false,
      "known_word_id": "<uuid or null>"
    },
    ...
  ],
  "generated_at": "<ISO>",
  "model": "claude-code"
}
```

Rules:
- Mark exactly one derivative as `is_base = true` — the original word OR its closest derivational root.
- Mark `is_opposite = true` on any derivative formed by prefix negation (un-, in-, dis-, mis-, etc.).
- Include all common derivatives across all four POS where they exist. A word like "decide" yields decide/decision/decisive/decisively/indecisive/indecision — 6 derivatives.
- If a word has no derivatives (rare — only certain function words / proper nouns), write `{"derivatives": [{"word": <base>, "part_of_speech": <pos>, "is_base": true, ...}], ...}` with just the base entry.

#### B.4 — `pronunciation_alert` schema (CONDITIONAL — most rows stay NULL)

Only generate an alert if the word has a **genuine pronunciation trap for Arabic-speaking learners**:
- Silent letters (knight, debt, listen, often)
- TH sounds (think, this) — V/F confusion (very/fairy)
- P/B confusion (people, pepper)
- "ough" variants (though, through, thought, tough, cough, bough — 6 different sounds)
- Stress shifts (PHOto vs photoGRApher)
- Exceptional vowel patterns (sword, colonel, choir)
- Tricky consonant clusters (twelfth, sixths)
- Words that look like a familiar Arabic loan but aren't pronounced like it

**If no alert is needed, UPDATE the row to write `pronunciation_alert = NULL` but ALSO set a separate marker column to record "checked, no alert needed"**:

Add this to the schema during Phase A:
```sql
ALTER TABLE curriculum_vocabulary
ADD COLUMN IF NOT EXISTS pronunciation_checked_at TIMESTAMPTZ;
```

Then for words that need an alert, write the full object:
```json
{
  "ipa": "/ˈnaɪt/",
  "correct_ar": "نايت",
  "wrong_ar": "كنايت",
  "problem_letters": [0],
  "explanation_ar": "حرف K في بداية الكلمة صامت تماماً — لا تنطقه. تقرأ كأن الكلمة تبدأ بـ N.",
  "practice_tip_ar": "تذكر: قبل N في بداية الكلمة، K صامتة دائماً — knight, knee, know, knife.",
  "similar_words": ["knee", "know", "knife", "knock"],
  "severity": "high",
  "rule_category": "silent_letter",
  "generated_at": "<ISO>",
  "model": "claude-code"
}
```

Field rules:
- `problem_letters`: 0-indexed positions of the letters that are pronounced wrong by default. For "knight", silent K is at index 0.
- `severity`:
  - `high` = totally wrong word produced (knight → kah-night)
  - `medium` = recognizable but accented
  - `low` = subtle mispronunciation
- `rule_category` ∈ `silent_letter`, `th_sound`, `vowel_irregular`, `stress_shift`, `consonant_cluster`, `loan_false_friend`, `exception`
- `similar_words`: 3–5 other words from the same trap pattern. Prefer words from our `curriculum_vocabulary` if any match (light check).
- All Arabic explanations and tips written **individually with linguistic judgment** — no copy-paste templates. Each word's explanation must address THAT word's specific trap.

For every row processed (alert or no alert), set:
```sql
UPDATE curriculum_vocabulary
SET pronunciation_alert = $1,  -- JSON object or NULL
    pronunciation_checked_at = NOW()
WHERE id = $2;
```

After Phase B.4, the idempotency filter for pronunciation_alert becomes `WHERE pronunciation_checked_at IS NULL` instead of `WHERE pronunciation_alert IS NULL`, so unchecked rows are processed but NULL-but-checked rows are skipped.

---

## ✅ QUALITY GATE PER BATCH

Before writing 30 rows, the agent self-checks:
1. JSON schema validity for every record (parse it — reject if it fails).
2. `cefr_level` is an integer in [1, 5].
3. `is_strongest` appears exactly once in synonyms (and exactly once in antonyms if length ≥ 2).
4. `is_base` appears exactly once in word_family.
5. All `meaning_ar` fields are non-empty Arabic strings (basic regex check for Arabic Unicode range).
6. `known_word_id` values (if present) are valid UUIDs and refer to existing `curriculum_vocabulary.id`.

If any record fails: log the failure, skip that record only (don't kill the batch), continue.

Write the UPDATEs in a single transaction per batch so a mid-batch failure doesn't leave partial state.

---

## 💾 COMMIT CADENCE

After each batch of 30 successful UPDATEs:

```bash
git add -A  # picks up the migration if you added pronunciation_checked_at on first run
git commit -m "chore(vocab-enrich): {column} L{level} batch ending id {last_id} (+{n} rows)"
git push origin main
```

Commit messages should let Ali scan `git log --oneline | grep vocab-enrich` and see exactly which level/column is done.

---

## 🔄 RESUME-SAFETY CHECK

On startup, before any generation, the agent prints:

```
=== Enrichment Fill — Resume Status ===
synonyms     L0: x/y done  L1: x/y  L2: x/y  L3: x/y  L4: x/y  L5: x/y
antonyms     L0: x/y       L1: x/y  L2: x/y  L3: x/y  L4: x/y  L5: x/y
word_family  L0: x/y       L1: x/y  L2: x/y  L3: x/y  L4: x/y  L5: x/y
pronunci.    L0: x/y       L1: x/y  L2: x/y  L3: x/y  L4: x/y  L5: x/y
Next pass: synonyms L1 (resumes at id <id>)
========================================
```

This prints when started fresh OR when restarted after kill.

---

## 📊 FINAL REPORT

When all four passes complete (or after Ali manually halts), write `docs/vocab-section/PHASE-B-ENRICHMENT-REPORT.md`:

```markdown
# Enrichment Fill — Final Report

| Column | Pre | Post | Generated | Skipped/Empty | Failures |
|---|---|---|---|---|---|
| synonyms | 1,478 | 13,930 | 12,452 | 0 | 0 |
| antonyms | 1,198 | 13,930 | 12,732 | <words w/ no_antonym_reason> | 0 |
| word_family | 1,352 | 13,930 | 12,578 | 0 | 0 |
| pronunciation_alert | 404 | <X w/ alert> + <Y NULL but checked> | <generated> | <NULL by design> | 0 |

## Per-level breakdown
…

## Failures
<list any rows that failed validation, with reason>

## Time
- Start: <ISO>
- End: <ISO>
- Total elapsed: <hours>
- Batches committed: <n>
```

Commit + push this report at the end:
```bash
git add docs/vocab-section/PHASE-B-ENRICHMENT-REPORT.md
git commit -m "docs(vocab-enrich): final fill report"
git push origin main
```

---

## ⚠️ HARD RULES

1. **Never overwrite existing enrichment data.** Always filter `WHERE column IS NULL OR column::text IN ('{}', '[]', 'null')`.
2. **Discovery before query.** Before touching `curriculum_vocabulary`, verify column types via `information_schema.columns`. Before joining `profiles`, verify the level-tracking column name. Don't assume.
3. **No `vite build` locally.** This prompt makes zero frontend changes — only DB writes.
4. **Don't touch any column other than the four enrichment fields + `pronunciation_checked_at`.**
5. **Never delete vocabulary rows. Never modify `word`, `meaning_ar`, `example_sentence`, `audio_url`, `level`, or `unit_id`.**
6. **Quality > speed.** A premium Arab-learner-facing word card needs accurate, idiomatic, register-appropriate Arabic. A wrong synonym is worse than a missing one. If a word is ambiguous (multiple senses), generate enrichment for the sense that matches `example_sentence`.

---

## 🟢 START

After Phase A discovery prints clean, begin Phase B Pass 1 (synonyms × L1). Don't ask for confirmation — Ali sees the live commits on GitHub and reacts. If anything looks structurally wrong in discovery (e.g., column missing, wrong type), stop and report; otherwise run end-to-end across all 4 passes and 6 levels.
