# VOCAB PREMIUM — PROMPT 02B — WORD FAMILIES TRACK (L1 + L3)

> Parallel track B of 3. `word_family` ONLY. Scoped to L1 and L3. Runs in its own Claude Code tab. Zero conflict with tracks A and C — they touch different columns.

---

## 🎯 GOAL

Fill `curriculum_vocabulary.word_family` for all L1 + L3 rows where it is currently NULL/empty.

**Scope only**: `WHERE level IN (1, 3) AND (word_family IS NULL OR word_family::text IN ('{}', '[]', 'null'))`

L0, L2, L4, L5 are out of scope for this session.

---

## 🧭 INHERIT FROM PROMPT 02

Read `docs/vocab-section/PHASE-A-AUDIT.md` and `docs/vocab-section/PHASE-B-CHECKPOINT.md` first.

Use the `word_family` schema from the original VOCAB-PREMIUM-02-ENRICHMENT-FILL.md:

```json
{
  "derivatives": [
    {
      "word": "<derivative>",
      "part_of_speech": "verb|noun|adj|adv",
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

**Production-confirmed correction**: do NOT include `meaning_ar` per derivative item. The existing 1,352 populated rows omit it. Match the existing schema. If the production helper script for `word_family` exists (look in `prompts/agents/families/` or grep for `word_family.*helper`), prefer reusing it.

Rules from the original prompt that stay:
- Exactly one `is_base = true` per array.
- `is_opposite = true` on prefix-negation derivatives (un-, in-, dis-, mis-, im-, ir-, non-, a-).
- All four POS where they exist (verb/noun/adj/adv).
- `known_word_id` set when a derivative matches an existing `curriculum_vocabulary.word` (single SELECT per candidate).
- For words with no derivatives, write `{"derivatives": [{"word": <base>, "part_of_speech": <base_pos>, "is_base": true, ...}], ...}` with the base entry only — not an empty array.

Batch size = 30. Single-sequential within this session. Transaction per batch. Commit per batch.

---

## 🔁 LOOP

```
Pass 1: L1
  while count(L1 word_family NULL rows) > 0:
    fetch 30 rows ORDER BY id ASC
    generate word_family for each
    validate JSON (parse, schema, is_base count == 1, cefr range, POS enum)
    UPDATE in single transaction
    git add -A && git commit -m "chore(vocab-enrich): families L1 batch ending id <last_id> (+<n> rows)" && git push

Pass 2: L3
  same loop, level = 3
```

---

## 📊 RESUME-STATUS PRINT (on startup)

```
=== Word Families Track — L1 + L3 ===
L1 word_family: <done>/<total>  remaining: <null_count>
L3 word_family: <done>/<total>  remaining: <null_count>
Next: L1 batch starting at id <next_id>
======================================
```

Then begin.

---

## 🛑 STOP CONDITIONS

Same as track A:
- Both L1 and L3 reach zero NULL rows for `word_family`
- 50 consecutive successful batches → midpoint note, continue
- Approaching context limit → checkpoint to `docs/vocab-section/PHASE-B-CHECKPOINT.md`, clean exit
- 3 consecutive validation failures → stop and report

Don't pause for confirmation. Run and commit.

---

## 📁 OUTPUT ARTIFACTS

- Commits: `chore(vocab-enrich): families L<n> batch ending id <id> (+<n> rows)`
- On completion: append `## Track B — Word Families — COMPLETE (L1 + L3)` to `PHASE-B-CHECKPOINT.md`.
- On checkpoint exit: append `## Track B — Word Families — checkpoint <ISO>` with last batch id + remaining counts.

```bash
git add docs/vocab-section/PHASE-B-CHECKPOINT.md
git commit -m "docs(vocab-enrich): track B families checkpoint"
git push origin main
```

---

## ⚠️ HARD RULES

1. L1 + L3 ONLY.
2. Don't include `meaning_ar` per derivative — match existing schema.
3. Idempotent — never overwrite. Filter: `WHERE word_family IS NULL OR word_family::text IN ('{}', '[]', 'null')`.
4. Only touch `word_family` and `enrichment_generated_at` (if that column exists — verify first).
5. Commit + push per batch.

Begin.
