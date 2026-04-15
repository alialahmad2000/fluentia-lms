# Unit Mastery Assessment Discovery Report

**Date:** 2026-04-15

## 0.1 Core curriculum tables

### curriculum_units
id (uuid), level_id (uuid), unit_number (int), theme_ar (text), theme_en (text), description_ar, description_en, cover_image_url, warmup_questions (jsonb), grammar_topic_ids (jsonb), estimated_minutes (int), is_published (bool), sort_order (int), created_at, updated_at

**NOTE:** No `level` integer column — has `level_id` UUID referencing `curriculum_levels`.

### curriculum_activities — DOES NOT EXIST
The prompt assumed `curriculum_activities` exists. It does NOT. Activities are individual curriculum tables:
- curriculum_readings (FK: unit_id)
- curriculum_grammar (FK: unit_id)
- curriculum_writing (FK: unit_id — to verify)
- curriculum_listening (FK: unit_id — to verify)
- curriculum_speaking (FK: unit_id — to verify)
- curriculum_pronunciation (FK: unit_id — to verify)

## 0.2 Activity completion tracking

**ACTIVITY_COMPLETION_TABLE:** `student_curriculum_progress`

Key columns:
- student_id (uuid), unit_id (uuid), section_type (text), completed_at (timestamptz)
- FK columns: reading_id, grammar_id, assessment_id, writing_id, listening_id, speaking_id, pronunciation_id
- status (text), score (numeric), answers (jsonb), ai_feedback (jsonb)

**section_type values in use:**
- reading: 44, grammar: 40, vocabulary: 29, writing: 23, pronunciation: 17, vocabulary_exercise: 16, speaking: 14, listening: 7

**ACTIVITY_COMPLETION_COLUMNS:** student_id, unit_id, section_type, completed_at

## 0.4 Activity type enum — N/A

No curriculum_activities table. Section types come from student_curriculum_progress.section_type.

## 0.5 Counts

- total_units: 72
- No curriculum_activities table

## 0.6 curriculum_levels

- L0 Foundation: cd96175e-76d4-48dc-b34f-83f3228a28b8
- L1 Basics: 2755b494-c7ff-4bdc-96ac-7ab735dc038c
- L2 Development: d3349438-8c8e-46b6-9ee6-e2e01c23229d
- L3 Fluency: f7e8dbfb-ec8e-4491-a62d-f54fd4c41aab
- L4 Mastery: 81ccd046-361a-42ff-a74c-0966c5293e57
- L5 Proficiency: 1013dc05-72a1-45e9-926e-fbef8669ccee

## 0.7 XP Award Method

**XP_AWARD_METHOD:** Direct INSERT into `xp_transactions` table.

Columns: id, student_id, amount (int), reason (xp_reason enum), description (text), related_id (uuid), awarded_by (uuid), created_at

Available reasons: assignment_on_time, correct_answer, achievement, challenge, daily_challenge, voice_note_bonus, custom, duel_win, recording_complete, etc.

**For mastery assessment:** Use `achievement` reason for pass XP, `custom` for attempt XP.

## 0.8 Notifications

Table: `notifications` with columns: id, user_id, type, title, body, data (jsonb), read, pushed, action_url, etc.

## 0.9 Design system

- CinematicBackground: EXISTS ✓ (CSS-based, supports variant prop)
- GlassPanel: EXISTS ✓
- PremiumCard: EXISTS ✓
- CinematicTransition: EXISTS ✓

## 0.10 Existing unit_mastery tables

NONE — safe to create.

## Critical Adaptation

Since `curriculum_activities` doesn't exist, the gating function `fn_unit_activity_completion` must be rewritten to:
1. Count total distinct section_types available per unit from `student_curriculum_progress` (for any student) OR count content tables that have rows for this unit
2. Count completed section_types for the student (completed_at IS NOT NULL)

Approach: count how many content sections exist per unit (readings, grammar, writing, etc.) and how many the student completed.

## Blockers

**NONE** — curriculum_units exists, student_curriculum_progress tracks completion, CinematicBackground + GlassPanel exist. Proceed with adapted schema.
