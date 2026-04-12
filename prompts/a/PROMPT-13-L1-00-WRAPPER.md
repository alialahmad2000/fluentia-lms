# PROMPT 13 — L1 Reading Passage Rewrites — LEVEL WRAPPER

## Level: L1 (A1)
## Students: YES — المجموعة 2 (7 students, trainer = د. محمد شربط)
## Student Work Protection: ACTIVE (Phase A.5 applies)

## Execution Order

```
1.  PROMPT-13-L1-00-WRAPPER.md    ← you're reading it now
2.  PROMPT-13-L1-U01.md
3.  PROMPT-13-L1-U02.md
4.  PROMPT-13-L1-U03.md
5.  PROMPT-13-L1-U04.md
6.  PROMPT-13-L1-U05.md
7.  PROMPT-13-L1-U06.md
8.  PROMPT-13-L1-U07.md
9.  PROMPT-13-L1-U08.md
10. PROMPT-13-L1-U09.md
11. PROMPT-13-L1-U10.md
12. PROMPT-13-L1-U11.md
13. PROMPT-13-L1-U12.md
14. PROMPT-13-L1-99-FINALIZE.md
```

## Master Manifest
**Read `prompts/agents/PROMPT-13-MANIFEST-V2.md` FIRST.** It contains:
- Correct table names (curriculum_readings, curriculum_comprehension_questions, etc.)
- Phase 0 discovery (run once at start)
- Phases A-H per-unit workflow
- Phase A.5 Student Work Protection (ACTIVE for this level)
- Phase F rowcount assertions
- Rule 16

All rules from MANIFEST V2 apply to every L1 unit file.

## L1 Quality Targets (from MANIFEST V2)

| Metric | Target | Hard Limit |
|---|---|---|
| Word count per passage | 120-200 | 110-220 |
| FKGL | 2.0-4.0 | 1.5-4.5 |
| Avg sentence length | 8-12 words | ≤14 words |
| Vocabulary | L1 vocab + L0 vocab + function words | Zero non-L0/L1 content words |
| Tense | Simple present + simple past | Limited present continuous |
| Sentence structure | SVO dominant | Max 1 subordinate clause |
| Passive voice | Rare | Max 1 per passage |

## L1-Specific Rules

1. **Student Work Protection is ACTIVE** — Phase A.5 runs for every unit. Even though current DB shows 0 completed comprehension records, students may complete exercises between now and when this batch runs.

2. **Vocabulary allowlist includes L0 + L1** — L1 passages can use any word from both L0 and L1 vocabulary tables. Query both:
   ```sql
   SELECT LOWER(word) AS word, part_of_speech FROM curriculum_vocabulary
   WHERE level_id IN ($L0_ID, $L1_ID);
   ```

3. **L1 passages should be slightly more complex than L0** — longer sentences, more varied tense, but still very accessible. Target audience: absolute beginners who completed L0.

4. **Questions per L1 passage: 6** (vs L0's 5). Verify in Phase 0.

## Phase 0 — L1-Specific Discovery (Run Once)

In addition to MANIFEST V2's Phase 0, also run:

```sql
-- L1 level ID
SELECT id, cefr, level_number FROM curriculum_levels WHERE level_number = 1;
-- Cache as $L1_ID

-- Also get L0 level ID for vocabulary allowlist
SELECT id FROM curriculum_levels WHERE level_number = 0;
-- Cache as $L0_ID

-- L1 units in order
SELECT id, title_en, unit_number FROM curriculum_units
WHERE level_id = $L1_ID ORDER BY unit_number;
-- Cache: 12 units

-- L1 + L0 vocabulary combined allowlist
SELECT LOWER(word) AS word, part_of_speech FROM curriculum_vocabulary
WHERE level_id IN ($L0_ID, $L1_ID);

-- L1 question baseline (should be 6 per passage = 144 total)
SELECT cr.id, cr.reading_label, cu.unit_number, COUNT(ccq.id) as q_count
FROM curriculum_readings cr
JOIN curriculum_units cu ON cu.id = cr.unit_id
LEFT JOIN curriculum_comprehension_questions ccq ON ccq.reading_id = cr.id
WHERE cu.level_id = $L1_ID
GROUP BY cr.id, cr.reading_label, cu.unit_number
ORDER BY cu.unit_number, cr.reading_label;

-- Student completions baseline (Phase A.5 prep)
SELECT COUNT(*) AS total_completions,
       COUNT(DISTINCT student_id) AS distinct_students
FROM student_curriculum_progress
WHERE reading_id IN (
  SELECT cr.id FROM curriculum_readings cr
  JOIN curriculum_units cu ON cu.id = cr.unit_id
  WHERE cu.level_id = $L1_ID
)
AND section_type = 'comprehension'
AND status = 'completed';
```

Log all results. If question count != 144 or != 6 per passage, log the deviation but continue.

## Confirmation
After reading this wrapper + MANIFEST V2 + completing Phase 0:
```
✓ L1 WRAPPER loaded. Phase 0 discovery complete.
  L1 units: 12
  L1 passages: 24
  L1 questions: <N> (expected 144)
  L1+L0 vocab allowlist: <N> words
  Student completions: <N> records across <N> students
  Student Work Protection: ACTIVE
```

Then read `PROMPT-13-L1-U01.md`.
