# VOCAB PREMIUM — PROMPT 02A — RELATIONSHIPS TRACK (L1 + L3)

> Parallel track A of 3. Synonyms + antonyms ONLY. Scoped to L1 and L3 (active student groups). Run this in its own Claude Code tab. Tabs B and C run independently in their own tabs — zero conflict, different columns.

---

## 🎯 GOAL

Fill `curriculum_vocabulary.synonyms` and `curriculum_vocabulary.antonyms` for all L1 + L3 rows where they are currently NULL/empty. Write both columns together in one batch trip (matches the production helper script that the previous agent used).

**Scope only**: `WHERE level IN (1, 3) AND (synonyms IS NULL OR synonyms::text IN ('{}', '[]', 'null'))`

L0, L2, L4, L5 are explicitly out of scope for this session — they have no active student groups. We fill them later.

---

## 📍 RESUME STATE (from previous session, commit 59e6d26)

The previous agent completed 60 L1 rows ending at id `0e5aa0c6-1170-413e-8b41-cfab5cc83d26`. The idempotency filter (`synonyms IS NULL`) handles resume automatically — just start fresh and the WHERE clause skips done rows. No special offset handling needed.

See `docs/vocab-section/PHASE-B-CHECKPOINT.md` for the full context.

---

## 🧭 INHERIT FROM PROMPT 02

Read `docs/vocab-section/PHASE-A-AUDIT.md` and `docs/vocab-section/PHASE-B-CHECKPOINT.md` first. Use the same JSON schemas and quality gates from the original VOCAB-PREMIUM-02-ENRICHMENT-FILL.md **with these two production-confirmed corrections**:

1. **No `meaning_ar` per item** in the synonyms/antonyms JSON. The 1,478 pre-existing rows do not have it, and the production helper script doesn't write it. Match the existing schema exactly. Synonym/antonym items have: `word`, `cefr_level`, `is_strongest`, optional `known_word_id` (the UUID of a matching `curriculum_vocabulary` row when one exists).

2. **Write synonyms + antonyms together.** Both columns are set in a single UPDATE per word, sharing one `relationships_generated_at` timestamp. The previous agent built a helper for this — reuse it. Don't split into two passes.

Everything else (quality gates, CEFR levels, is_strongest = exactly one per array, `known_word_id` cross-linking via SELECT lookup, batch size = 30, single-sequential within this session, transaction per batch, commit per batch, push per batch) stays identical.

---

## 🔁 LOOP

```
Pass 1: L1
  while count(L1 NULL rows) > 0:
    fetch 30 rows ORDER BY id ASC
    generate synonyms + antonyms for each
    validate JSON (parse, schema, is_strongest count, cefr range)
    UPDATE in single transaction
    git add -A && git commit -m "chore(vocab-enrich): relationships L1 batch ending id <last_id> (+<n> rows)" && git push

Pass 2: L3
  same loop, level = 3
```

Don't process L0/L2/L4/L5. If a query returns rows from those levels, stop and report — something is wrong with the filter.

---

## 📊 RESUME-STATUS PRINT (on startup)

Before the first batch, print:

```
=== Relationships Track — L1 + L3 ===
L1 synonyms:  <done>/<total>  remaining: <null_count>
L1 antonyms:  <done>/<total>  remaining: <null_count>
L3 synonyms:  <done>/<total>  remaining: <null_count>
L3 antonyms:  <done>/<total>  remaining: <null_count>
Next: L1 batch starting at id <next_id>
======================================
```

Then begin.

---

## 🛑 STOP CONDITIONS

Stop when any of:
- Both L1 and L3 reach zero NULL rows for synonyms (done — antonyms are filled in lockstep so they'll be done too)
- 50 consecutive batches commit successfully → write a midpoint progress note, then continue
- Claude Code session approaches context limit → write a short checkpoint appendix to `docs/vocab-section/PHASE-B-CHECKPOINT.md` (track name, last batch id, time) and exit. Don't try to do "one more batch" — clean exit beats a half-write.
- Validation failures exceed 3 in a row → stop and report. Something is off in the upstream lookup or schema.

Don't ask permission to continue at any point. Don't pause to "verify a sample with the user." Just run and commit; Ali watches GitHub.

---

## 📁 OUTPUT ARTIFACTS

- Live commits to `main` with messages `chore(vocab-enrich): relationships L<n> batch ending id <id> (+<n> rows)`
- On clean completion: append a section to `docs/vocab-section/PHASE-B-CHECKPOINT.md` titled `## Track A — Relationships — COMPLETE (L1 + L3)` with start/end times, total rows filled, and any failed rows.
- On context-limit exit: append a section titled `## Track A — Relationships — checkpoint <ISO>` with last batch id + remaining counts.

Final commit for the doc:
```bash
git add docs/vocab-section/PHASE-B-CHECKPOINT.md
git commit -m "docs(vocab-enrich): track A relationships checkpoint"
git push origin main
```

---

## ⚠️ HARD RULES (RECAP)

1. L1 + L3 ONLY. Filter must include `level IN (1, 3)`.
2. Synonyms + antonyms together, no `meaning_ar` per item, match the existing helper script schema exactly.
3. Idempotent — never overwrite. `WHERE synonyms IS NULL OR synonyms::text IN ('{}', '[]', 'null')`.
4. Discovery before any UPDATE if you suspect schema drift — check `information_schema.columns` once at startup, then assume the schema holds for the rest of the run.
5. No touching of any column other than `synonyms`, `antonyms`, `relationships_generated_at`.
6. Commit + push per batch — don't accumulate 10 batches before pushing. Granular commits = granular recovery.

Begin.
