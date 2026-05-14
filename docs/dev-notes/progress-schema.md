# Progress Schema — fluentia-lms

## Primary progress table: `student_curriculum_progress`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → profiles(id) |
| unit_id | uuid | FK → curriculum_units(id) |
| reading_id | uuid | FK → curriculum_readings(id) |
| grammar_id | uuid | FK → curriculum_grammar(id) |
| assessment_id | uuid | FK → curriculum_assessments(id) |
| writing_id | uuid | FK → curriculum_writing(id) |
| listening_id | uuid | FK → curriculum_listening(id) |
| speaking_id | uuid | FK → curriculum_speaking(id) |
| section_type | text | 'reading','grammar','listening','speaking','writing','vocabulary','pronunciation','assessment' |
| status | text | 'not_started','in_progress','completed','submitted','graded','abandoned' |
| score | numeric | 0–100 |
| answers | jsonb | Student answers payload |
| recording_url | text | For speaking (legacy) |
| ai_feedback | jsonb | AI evaluation result |
| time_spent_seconds | int | |
| completed_at | timestamptz | |
| attempt_number | int | For multi-attempt sections |
| is_latest | bool | DEFAULT true — most recent attempt |
| is_best | bool | DEFAULT true — highest score |
| is_phantom | bool | DEFAULT false — blocked by guard trigger |
| phantom_healed_at | timestamptz | |

**Active unique constraints:**
- `scp_unique_speaking UNIQUE (student_id, speaking_id)` — one row per speaking topic
- `scp_unique_writing UNIQUE (student_id, writing_id)` — one row per writing item

**Dropped constraints (multi-attempt enabled):**
- `scp_unique_reading` — dropped migration 20260509
- `scp_unique_listening` — dropped migration 20260509
- `scp_unique_grammar` — dropped migration 118
- `scp_unique_vocab` — never landed in prod (migration 066 attempted, rolled back)

**Guard trigger:** `trg_block_phantom` — blocks INSERT/UPDATE to completed/submitted/graded with empty answers

## Speaking recordings: `speaking_recordings`

Separate table for voice note audio files and AI evaluation results. Tracked by `(student_id, unit_id, question_index)`.

## Vocabulary mastery: `vocabulary_word_mastery`

Tracks mastery level ('new','learning','mastered') per word per student. Used by `calculateUnitProgress` for the vocabulary weight (18%).

## Progress calculation location

**Frontend only** — no DB-side progress function exists.

- Individual unit page: `useUnitProgress(studentId, unitId)` in `src/hooks/useUnitProgress.js`
  - Fetches real content existence from each curriculum table
  - Calculates via `calculateUnitProgress()` from `src/utils/calculateUnitProgress.js`
  - **staleTime: 60,000ms** — does NOT auto-invalidate on activity completion
  
- Level browser: `useLevelProgress(studentId, units)` in same hook file
  - Batch version with same real content checks
  - **staleTime: 120,000ms**

- Progress calculation: **dynamic denominator** — only activity types that have curriculum content for the unit are included. Weights: reading A=10, reading B=10, grammar=13, vocabulary=18, listening=8, writing=13, speaking=13, pronunciation=10, assessment=5.
