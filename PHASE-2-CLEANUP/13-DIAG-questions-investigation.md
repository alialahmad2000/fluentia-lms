# Questions Update Investigation -- L0 Batch

## Schema Findings
- Question source: `curriculum_comprehension_questions` (separate table)
- FK relationship: `curriculum_comprehension_questions.reading_id` -> `curriculum_readings.id`
- Total questions in DB: 1,152
- Columns: id, reading_id, section, question_type, question_en, question_ar, choices (jsonb), correct_answer, explanation_en, explanation_ar, sort_order, created_at
- Additionally, `curriculum_readings` has a `reading_skill_exercises` JSONB column (was checked during PROMPT 13, found empty for L0)

## L0 Question Counts
- L0 passages: 24
- L0 questions: 120 (5 per passage)
- Updated today (after PROMPT 13): 0
- Untouched (still old content): 120

## Per-Level Comparison
| Level | CEFR | Passages | Questions | Qs/Passage |
|-------|------|----------|-----------|------------|
| L0    | Pre-A1 | 24 | 120 | 5.0 |
| L1    | A1     | 24 | 144 | 6.0 |
| L2    | A2     | 24 | 168 | 7.0 |
| L3    | B1     | 24 | 192 | 8.0 |
| L4    | B2     | 24 | 240 | 10.0 |
| L5    | C1     | 24 | 288 | 12.0 |

All levels have questions. L0 is not special.

## Sample Passages Inspection

### Passage A (Unit 1, Reading A — id 3bb6f744)
- Content updated: YES (updated_at today, new simplified text about daily life in Riyadh)
- Questions found: 5
- Questions match new content: **NO**
- Mismatches:
  - Q: "What time does the work day usually start?" A: "8:00 AM" -- new passage mentions no specific times
  - Q: "When do families usually have dinner together?" A: "8:00 PM" -- new passage has no dinner time
  - Q: "Why do young Saudis probably use the new metro system?" -- new passage never mentions metro

### Passage B (Unit 6, Reading A — id 13869905)
- Content updated: YES (new simplified "My Family" text)
- Questions found: 5
- Questions match new content: **NO**
- Mismatches:
  - Q: "When do Saudi families often gather together?" A: "Friday afternoons" -- not in new passage
  - Q: "What does the word 'gather' mean?" -- word 'gather' not in new passage
  - Q: "In Mexico, what do families do on the Day of the Dead?" -- Mexico/Day of Dead not in new passage at all
  - Q: "Why do Japanese families eat together every evening?" -- Japan not in new passage

### Passage C (Unit 12, Reading A — id a2f9c20c)
- Content updated: YES (new simplified "Different Jobs" text)
- Questions found: 5
- Questions match new content: **NO**
- Mismatches:
  - Q: "What do social media managers do?" -- not in new passage
  - Q: "How many smartphone users are there in Saudi Arabia?" -- not in new passage
  - Q: "What does 'earn' mean?" -- word 'earn' not in new passage
  - Q: "Why did food delivery become very important during COVID-19?" -- COVID-19 not in new passage

## Workflow Inspection
- MANIFEST Phase E (question rewrite) instructions: PRESENT in manifest (references `passage_questions` table name)
- MANIFEST assumed table name `passage_questions` -- actual table is `curriculum_comprehension_questions`
- During execution, the schema cache noted `reading_skill_exercises` JSONB was empty for L0
- The workflow incorrectly concluded L0 had no questions based on the empty JSONB field
- It never discovered or queried `curriculum_comprehension_questions`
- Progress log mentions of questions: 0
- Conclusion: Phase E was entirely skipped due to wrong table name assumption + reliance on JSONB field

## Root Cause
- [x] Questions exist but FK uses different column name than expected -> workflow skipped silently
- The MANIFEST referenced `passage_questions` (non-existent table)
- The actual table is `curriculum_comprehension_questions` with `reading_id` FK
- The workflow found empty `reading_skill_exercises` JSONB and concluded "no questions"
- It never searched for or discovered the real questions table

## Severity for L1 Run
- [x] CRITICAL -- L1 must wait, students would see broken content
- L0 has 0 students so current mismatch is low-impact
- But L1 HAS live students -- if the same workflow runs on L1, 144 questions will become mismatched
- Students would see questions about old passage content that no longer exists

## Recommended Action
1. **Before L1**: Fix the PROMPT 13 workflow to discover and update `curriculum_comprehension_questions`
2. **For L0 now**: Write new questions for all 24 L0 passages (120 questions total) to match new content
3. **Question rewrite approach**: For each passage, keep the same question_types (main_idea, detail, vocabulary, detail, inference) but rewrite question_en, correct_answer, choices, explanation_en/ar to match the new passage text
4. **Verify**: After rewriting, confirm each question's correct_answer is actually answerable from the new passage
