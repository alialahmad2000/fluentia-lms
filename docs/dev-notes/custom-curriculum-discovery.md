# Custom Curriculum — Phase A Discovery + Blueprint (for Prompt 2)

Reusable **Fardi custom-curriculum engine** discovery. A custom student's units are ordinary
`curriculum_units` rows with `owner_student_id` set; everything else (render path, child tables)
is identical to generic units. Prompt 2 generates Sara's full 8 IT units against this exact shape.

## Level / identity facts
- Units link to a level via **`curriculum_units.level_id`** (uuid → `curriculum_levels`). There is **no `academic_level`** on units.
- Level 3 (B1) = **Fluency / طلاقة**, `level_id = f7e8dbfb-ec8e-4491-a62d-f54fd4c41aab` (`curriculum_levels.level_number = 3`).
- Sara `fc68652d-c4cb-402f-a271-f17a5a4483b1`, academic_level 3, now `uses_custom_curriculum = true`.
- Student units page: `/student/curriculum` → auto-redirects to `/student/curriculum/level/{academic_level}` → `LevelUnits` → hook `src/pages/student/curriculum/_useCurriculumData.js`.
  - The units query has **NO publish/visibility filter** — every row for the level is returned, ordered by `unit_number`. (All 12 generic L3 units are `is_published=false` yet students see them.)
  - Identity is impersonation-safe: `studentData.academic_level` / `studentData.uses_custom_curriculum` / `profile.id` from `useAuthStore` (never `user.id`).
- Unit render: `/student/curriculum/unit/:unitId` → `UnitContentRouter` → `UnitContent` (V2 Mission Grid). Unit row via `useUnitData.js` (`select('*, level:curriculum_levels(*)').eq('id', unitId)`). Each tab fetches its own child table by `unit_id` / `reading_id`, ordered by `sort_order`, no publish filter.

## `curriculum_units` columns the render path depends on
`id, level_id, unit_number, theme_ar, theme_en, description_ar, description_en, cover_image_url,`
`estimated_minutes, why_matters, outcomes (text[]), brief_questions (jsonb string[]), activity_ribbons (jsonb),`
`+ NEW: owner_student_id (uuid→students), custom_sort (int)`.
`activity_ribbons` = `{ "<section>": "<one Arabic line>" }` keyed by reading/vocabulary/grammar/listening/writing/speaking/assessment/pronunciation (ContextRibbon renders the string; hidden if absent).

## Child content tables (structural template — a generic L3 unit has exactly this)
Per unit (blueprint = L3 U1 "Artificial Intelligence"): **2 readings**, each with ~8 comprehension Qs + ~80 vocab; **1 speaking**, **1 grammar** (+ exercises), **1 listening**, **1 writing**, **1 assessment**.

| Table | FK | Key columns / JSONB shape |
|---|---|---|
| `curriculum_readings` | `unit_id` (NOT NULL) | `reading_label` ('A'/'B'), `title_en/ar`, `passage_content` `{paragraphs: string[]}` (use `*word*` to mark vocab), `passage_word_count`, `reading_skill_name_en/ar`, `sort_order`, `is_published` |
| `curriculum_comprehension_questions` | `reading_id` (NOT NULL) | `section` ('mcq'), `question_type` (main_idea/detail/inference/…), `question_en/ar`, `choices` (string[]), `correct_answer` (exact match of a choice), `explanation_ar`, `sort_order` |
| `curriculum_vocabulary` | `reading_id` (NOT NULL) | `word`, `definition_en` (NOT NULL), `definition_ar`, `example_sentence`, `part_of_speech`, `difficulty_tier` ('high_frequency'), `appears_in_passage` (bool), `tier` ('core'), `cefr_level`, `sort_order` |
| `curriculum_vocabulary_exercises` | `reading_id` (NOT NULL) | `exercise_label`, `exercise_type`, `instructions_en/ar`, `items` (jsonb[]), `sort_order` |
| `curriculum_speaking` | `unit_id` (NOT NULL) | `topic_number`, `topic_type` (opinion/roleplay/…), `title_en/ar`, `prompt_en` (NOT NULL) `/ar`, `preparation_notes` (jsonb[]), `useful_phrases` (jsonb[]), `evaluation_criteria` (jsonb, has default), `min/max_duration_seconds`, `is_published` |
| `curriculum_grammar` | `unit_id` (nullable) | `level_id` (NOT NULL), `topic_name_en/ar`, `category`, `explanation_content` `{sections:[]}` (NOT NULL), `sort_order`, `is_published`; children `curriculum_grammar_exercises(grammar_id, exercise_type, items jsonb[])` |
| `curriculum_listening` | `unit_id` (NOT NULL) | `title_en/ar`, `audio_url`, `transcript`, `audio_type`, `exercises` (jsonb[]), `is_published` |
| `curriculum_writing` | `unit_id` (NOT NULL) | `task_type`, `title_en/ar`, `prompt_en` (NOT NULL) `/ar`, `hints` (jsonb[]), `word_count_min/max`, `rubric` (jsonb, default), `is_published` |
| `curriculum_assessments` | `unit_id` (nullable) | `assessment_type` ('unit_quiz'), `title_en/ar`, `questions` (jsonb[], NOT NULL), `passing_score` (70), `is_published` |
| `curriculum_pronunciation` | `unit_id` (nullable) | `level_id` (NOT NULL), word/title fields, `content` jsonb |
| `curriculum_video_sections` | `unit_id` (NOT NULL) | `video_title_en/ar`, `video_url`, before/while/after_watch jsonb |

Full raw blueprint (every column + real content of L3 U1) is captured locally in `docs/dev-notes/custom-curriculum-blueprint-L3U1.json` (not committed — 512 KB).

## RLS design (the isolation guarantee)
Every curriculum table previously had `auth_read_* = (auth.role()='authenticated')` — **any student read everything**. Now owner-scoped:
- `curriculum_units`: readable if `owner_student_id IS NULL` OR `= auth.uid()` OR caller is admin/trainer.
- Child tables: gated by the parent unit's owner via SECURITY-DEFINER helpers `cc_unit_visible(unit_id)` / `cc_reading_visible(reading_id)` / `cc_grammar_visible(grammar_id)`. Rows whose `unit_id IS NULL` (level-shared grammar/assessment/pronunciation) stay public.
- `admin_all_*` + `service_*` policies untouched (admins + service role keep full access).
- `curriculum_listening_exercises` is a level-scoped shared bank (no unit link) → left public.

## Page branch (Phase C)
`_useCurriculumData.js` units query branches on `studentData.uses_custom_curriculum`:
- custom → `.eq('owner_student_id', profile.id).order('custom_sort')`
- else → `.eq('level_id', level.id).is('owner_student_id', null).order('unit_number')` (unchanged for everyone else).

## Prompt-2 gotchas
- `(level_id, unit_number)` uniqueness now applies to generic units only (partial index), so custom units may reuse `unit_number` 1..8 at level 3.
- Set each custom unit `owner_student_id = <sara>`, `level_id = <L3>`, `custom_sort = 1..8`, `is_published = false` (page has no publish filter). Populate `why_matters`, `outcomes`, `brief_questions`, `activity_ribbons` for a rich Unit Brief.
- Vocabulary attaches to a **reading** (`reading_id`), not the unit. Comprehension `correct_answer` must be the exact text of one `choices` entry.
- Arabic copy: feminine 2nd-person, Dr. Ali's voice, brand = طلاقة (never transliterate Fluentia).
