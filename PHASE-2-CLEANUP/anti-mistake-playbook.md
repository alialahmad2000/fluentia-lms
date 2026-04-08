# Anti-Mistake Playbook — Canonical Reference for Phase 2.2+

**Source:** PROMPT 10 (Deep Curriculum Quality Audit) + PROMPT 11 (Investigation)
**Last updated:** 2026-04-08

---

Every Phase 2 content generation prompt MUST follow ALL 14 rules below.

## RULE 1 — Vocabulary Uniqueness

**Trigger:** 514 within-unit duplicates found (448 in L4, 451 in L5), caused by running `generate-vocab-l4-l5.cjs` multiple times without dedup.

**Rule:** Before inserting any new vocab word, the prompt MUST query:
```sql
SELECT id FROM curriculum_vocabulary v
JOIN curriculum_readings r ON r.id = v.reading_id
WHERE LOWER(v.word) = LOWER(?) AND r.unit_id = ?
```
If a match exists with the same `part_of_speech`, **ABORT** the insert.

**Allowed exception:** Spiral repetition across levels where the new example sentence has FKGL > previous + 1.0.

## RULE 2 — CEFR Vocabulary Alignment

**Trigger:** 586 words potentially misplaced relative to CEFR targets.

**Rule:** Every new vocab word MUST be classified against frequency lists before insertion. If classified above the target CEFR level of the unit, abort and pick a different word.

Level mapping: L0=Pre-A1, L1=A1, L2=A2, L3=B1, L4=B2, L5=C1

## RULE 3 — Reading Passage Length

**Trigger:** Passage word count ranges defined in `curriculum_levels.passage_word_range`.

**Rule:** Every new/rewritten passage MUST be within the target range:
- L0: 200-300 words
- L1: 300-400 words
- L2: 400-500 words
- L3: 500-600 words
- L4: 700-1000 words
- L5: 1000-1200 words

## RULE 4 — Reading Passage FKGL

**Trigger:** 137 passages with FKGL outside target ranges.

**Rule:** Compute Flesch-Kincaid Grade Level on every generated passage. Must fall within the target range for the level. Reject otherwise.

## RULE 5 — Grammar Prerequisites

**Trigger:** Grammar dependency analysis identified potential gaps.

**Rule:** Before inserting any grammar topic, check the dependency map. If prerequisites are not in the same or earlier level, abort. Key chain: present simple → continuous → perfect → perfect continuous.

## RULE 6 — Writing/Speaking Smoothness

**Rule:** New writing prompts must follow the level's min/max word range. No level may have a `word_count_max` more than 1.6x the previous level.

## RULE 7 — Leap Smoothness

**Trigger:** Weakest transition L4→L5 (score: 0.46).

**Rule:** After any Phase 2 batch, re-run the leap test. Any transition with leap score < 0.8 must be addressed before commit.

## RULE 8 — Translation Validation

**Rule:** Every generated Arabic translation (`definition_ar`) must be:
- Non-empty
- Contain no English alphabetic characters (2+ consecutive)
- At least 2 characters long

Reject and regenerate otherwise.

## RULE 9 — Example Sentence Validation

**Rule:** Every `example_sentence` MUST:
- Contain the target word (case-insensitive substring match)
- Have FKGL within ±1.5 of the level's target
- Be 5-25 words long (at A1-A2) or 5-35 words (at B1+)

## RULE 10 — Topic Diversity

**Rule:** When generating new units, no single theme may appear in more than 2 units per level.

## RULE 11 — POS Balance

**Rule:** After any Phase 2 batch, the per-level part-of-speech distribution must remain within healthy ranges (nouns 30-60%, verbs 10-40%, adj 5-35%).

## RULE 12 — Discovery First (META RULE)

**CRITICAL:** Every Phase 2 content prompt MUST begin with schema queries before any INSERT. **Never assume column names.** Actual schema:

- Table: `curriculum_vocabulary`
- Columns: `id`, `reading_id` (FK), `word` (not english_word), `definition_en`, `definition_ar` (not arabic_translation), `example_sentence`, `part_of_speech`, `pronunciation_ipa`, `audio_url`, `image_url`, `difficulty_tier`, `sort_order`, `created_at`, `audio_generated_at`
- Link path: `vocabulary.reading_id` → `readings.id` → `readings.unit_id` → `units.id` → `units.level_id` → `levels.id`
- Active tables: `curriculum_readings` (not reading_passages), `curriculum_writing` (not writing_prompts), `curriculum_speaking` (not speaking_topics), `curriculum_grammar` (not grammar_lessons)

## RULE 13 — Student Work Protection

Any modification to units with existing student progress must:
1. Query affected `vocabulary_word_mastery` records
2. Identify the "kept" row for each word
3. UPDATE mastery records to point to the kept vocabulary_id
4. Preserve mastery_level, attempts, timestamps
5. Only then DELETE the duplicate row

Current mastery data: 158 records in L1 (21 vocab IDs, 63 records) and L3 (57 vocab IDs, 95 records), 6 students total.

## RULE 14 — Atomic Commits

Each Phase 2 prompt should commit ONE level's content at a time. Never batch L2 + L3 + L4 in a single commit. If something is wrong, Ali must be able to revert one level cleanly.

---

## Additional Rule from PROMPT 11 Investigation

## RULE 15 — Script Idempotency

**Trigger:** `generate-vocab-l4-l5.cjs` was run multiple times, inserting ~2.7x the intended vocabulary.

**Rule:** Every content generation script MUST:
1. Check for existing entries before inserting (SELECT before INSERT)
2. Use `ON CONFLICT DO NOTHING` or explicit dedup logic
3. Log what was skipped vs inserted
4. Be safely re-runnable without creating duplicates
