# Interactive Curriculum — Discovery Notes

## Central Table: `student_curriculum_progress`

All student answers are stored in ONE table with a JSONB `answers` column.
The `section_type` column differentiates which tab the progress belongs to.

### Reading
- **Unique key:** `student_id + reading_id`
- **section_type:** `'reading'`
- **answers format:** `{ [questionId]: { selected: "choice text", correct: true/false } }`
- **Related content tables:** `curriculum_readings`, `curriculum_comprehension_questions`
- **Score:** percentage (0-100)

### Grammar
- **Unique key:** `student_id + grammar_id`
- **section_type:** `'grammar'`
- **answers format:** `{ exercises: [{ id, type, studentAnswer, correctAnswer, isCorrect }] }`
- **Related content tables:** `curriculum_grammar`, `curriculum_grammar_exercises`

### Vocabulary
- **Unique key:** `student_id + unit_id + section_type`
- **section_type:** `'vocabulary'`
- **answers format:** `{ reviewedWords: [...], totalWords: N }`
- **Related content tables:** `curriculum_vocabulary`

### Listening
- **Unique key:** `student_id + listening_id`
- **section_type:** `'listening'`
- **answers format:** `{ questions: [{ questionIndex, question, studentAnswer, correctAnswer, isCorrect }] }`
- **Related content tables:** `curriculum_listening`

### Writing
- **Unique key:** `student_id + writing_id`
- **section_type:** `'writing'`
- **answers format:** `{ draft: "text", wordCount: N, lastSavedAt: "ISO date" }`
- **Related content tables:** `curriculum_writing`

### Speaking & Assessment
- Not yet implemented (placeholder UIs only)

## Key Tables

### curriculum_levels
- id (UUID), level_number (int), name_ar, name_en, cefr, color, icon, is_active, sort_order

### curriculum_units
- id (UUID), level_id (UUID FK → curriculum_levels), unit_number (int), theme_ar, theme_en, cover_image_url, is_published, sort_order

### student_curriculum_progress
- id, student_id, unit_id, section_type, status, score, answers (JSONB)
- reading_id, grammar_id, writing_id, listening_id, speaking_id (FK columns)
- time_spent_seconds, completed_at, attempt_number, attempt_history (JSONB)
- created_at, updated_at

## Query Pattern for Interactive Curriculum

```sql
-- Get all reading answers for a unit + group
SELECT
  scp.student_id,
  p.full_name,
  p.avatar_url,
  scp.reading_id,
  scp.answers,
  scp.score,
  scp.status,
  scp.completed_at
FROM student_curriculum_progress scp
JOIN profiles p ON p.id = scp.student_id
JOIN students s ON s.user_id = scp.student_id
WHERE scp.unit_id = $unitId
  AND scp.section_type = 'reading'
  AND s.group_id = $groupId
ORDER BY p.full_name;
```

## Groups → Levels Relationship
- `groups` table has a `level` column (integer 1-5)
- `curriculum_units` has `level_id` (UUID FK to curriculum_levels)
- `curriculum_levels` has `level_number` (integer)
- To match: groups.level = curriculum_levels.level_number
