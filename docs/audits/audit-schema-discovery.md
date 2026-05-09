# Curriculum Audit — Phase A: Schema Discovery

**Generated:** 2026-05-09T21:48:49.693Z

## Curriculum Tables Found

| Table | Row Count |
|---|---|
| `curriculum_assessments` | 78 |
| `curriculum_comprehension_questions` | 1152 |
| `curriculum_grammar` | 72 |
| `curriculum_grammar_exercises` | 696 |
| `curriculum_grammar_lessons` | 0 |
| `curriculum_irregular_verb_exercises` | 85 |
| `curriculum_irregular_verbs` | 85 |
| `curriculum_levels` | 6 |
| `curriculum_listening` | 72 |
| `curriculum_listening_exercises` | 12 |
| `curriculum_pronunciation` | 72 |
| `curriculum_reading_passages` | 0 |
| `curriculum_readings` | 144 |
| `curriculum_speaking` | 72 |
| `curriculum_speaking_topics` | 0 |
| `curriculum_units` | 72 |
| `curriculum_video_sections` | 0 |
| `curriculum_vocabulary` | 14383 |
| `curriculum_vocabulary_exercises` | 1536 |
| `curriculum_vocabulary_srs` | 97 |
| `curriculum_writing` | 72 |
| `curriculum_writing_prompts` | 0 |

## Key Findings

- **Reading table:** `curriculum_readings` (exists: true)
- **Reading content field:** `passage_content`
- **Comprehension questions table:** `curriculum_comprehension_questions` (exists: true)
- **Listening table:** `curriculum_listening` (exists: true)
- **Listening audio_type values:** dialogue, interview, lecture, monologue
- **Vocabulary table:** `curriculum_vocabulary` (exists: true)
- **Irregular verbs table:** `curriculum_irregular_verbs` (exists: true)

## Column Schemas

### `curriculum_assessments` (78 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `unit_id` | uuid | YES | - |
| `level_id` | uuid | YES | - |
| `assessment_type` | text | YES | 'unit_quiz'::text |
| `title_ar` | text | YES | - |
| `title_en` | text | YES | - |
| `questions` | jsonb | NO | '[]'::jsonb |
| `passing_score` | integer | YES | 70 |
| `time_limit_minutes` | integer | YES | 30 |
| `is_published` | boolean | YES | false |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |
| `is_promotion_gate` | boolean | YES | false |

### `curriculum_comprehension_questions` (1152 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `reading_id` | uuid | NO | - |
| `section` | text | NO | - |
| `question_type` | text | YES | - |
| `question_en` | text | NO | - |
| `question_ar` | text | YES | - |
| `choices` | jsonb | YES | - |
| `correct_answer` | text | YES | - |
| `explanation_en` | text | YES | - |
| `explanation_ar` | text | YES | - |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |

### `curriculum_grammar` (72 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level_id` | uuid | NO | - |
| `unit_id` | uuid | YES | - |
| `topic_name_en` | text | NO | - |
| `topic_name_ar` | text | NO | - |
| `category` | text | NO | - |
| `grammar_in_use_unit` | integer | YES | - |
| `explanation_content` | jsonb | NO | '{"sections": []}'::jsonb |
| `sort_order` | integer | YES | 0 |
| `is_published` | boolean | YES | false |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |
| `exceptions` | jsonb | YES | - |

### `curriculum_grammar_exercises` (696 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `grammar_id` | uuid | NO | - |
| `exercise_type` | text | NO | - |
| `instructions_en` | text | YES | - |
| `instructions_ar` | text | YES | - |
| `items` | jsonb | NO | '[]'::jsonb |
| `is_auto_gradeable` | boolean | YES | true |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |

### `curriculum_grammar_lessons` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level` | integer | NO | - |
| `unit_number` | integer | NO | - |
| `title_en` | text | NO | - |
| `title_ar` | text | NO | - |
| `explanation_ar` | text | NO | - |
| `explanation_en` | text | NO | - |
| `examples` | jsonb | NO | '[]'::jsonb |
| `practice_questions` | jsonb | NO | '[]'::jsonb |
| `common_mistakes` | jsonb | YES | '[]'::jsonb |
| `created_at` | timestamp with time zone | YES | now() |

### `curriculum_irregular_verb_exercises` (85 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level_id` | uuid | NO | - |
| `exercise_type` | text | NO | - |
| `instructions_ar` | text | YES | - |
| `instructions_en` | text | YES | - |
| `items` | jsonb | NO | '[]'::jsonb |
| `is_auto_gradeable` | boolean | YES | true |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |

### `curriculum_irregular_verbs` (85 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level_id` | uuid | NO | - |
| `verb_base` | text | NO | - |
| `verb_past` | text | NO | - |
| `verb_past_participle` | text | NO | - |
| `meaning_ar` | text | NO | - |
| `example_sentence` | text | YES | - |
| `audio_base_url` | text | YES | - |
| `audio_past_url` | text | YES | - |
| `audio_pp_url` | text | YES | - |
| `group_tag` | text | YES | - |
| `difficulty` | integer | YES | 1 |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |
| `audio_generated_at` | timestamp with time zone | YES | - |

### `curriculum_levels` (6 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level_number` | integer | NO | - |
| `name_ar` | text | NO | - |
| `name_en` | text | NO | - |
| `cefr` | text | NO | - |
| `description_ar` | text | YES | - |
| `description_en` | text | YES | - |
| `color` | text | NO | - |
| `icon` | text | YES | - |
| `passage_word_range` | text | YES | - |
| `vocab_per_unit` | integer | YES | 16 |
| `mcq_choices` | integer | YES | 3 |
| `sentence_complexity` | text | YES | - |
| `is_active` | boolean | YES | true |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### `curriculum_listening` (72 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `unit_id` | uuid | NO | - |
| `listening_number` | integer | YES | 1 |
| `title_en` | text | NO | - |
| `title_ar` | text | YES | - |
| `audio_url` | text | YES | - |
| `audio_duration_seconds` | integer | YES | - |
| `transcript` | text | YES | - |
| `audio_type` | text | YES | 'monologue'::text |
| `before_listen` | jsonb | YES | - |
| `exercises` | jsonb | NO | '[]'::jsonb |
| `discussion_prompts` | jsonb | YES | '[]'::jsonb |
| `difficulty` | text | YES | 'standard'::text |
| `is_published` | boolean | YES | false |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |
| `audio_generated_at` | timestamp with time zone | YES | - |

### `curriculum_listening_exercises` (12 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level` | integer | NO | - |
| `title_en` | text | NO | - |
| `title_ar` | text | NO | - |
| `youtube_url` | text | NO | - |
| `youtube_title` | text | NO | - |
| `channel` | text | NO | - |
| `duration_minutes` | integer | YES | - |
| `description_ar` | text | YES | - |
| `mode` | text | NO | 'mcq'::text |
| `questions` | jsonb | NO | '[]'::jsonb |
| `times_used` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |

### `curriculum_pronunciation` (72 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level_id` | uuid | NO | - |
| `unit_id` | uuid | YES | - |
| `word` | text | YES | - |
| `phonetic_ipa` | text | YES | - |
| `audio_url` | text | YES | - |
| `audio_slow_url` | text | YES | - |
| `common_mistakes_ar` | text | YES | - |
| `tips_ar` | text | YES | - |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |
| `focus_type` | text | YES | - |
| `title_en` | text | YES | - |
| `title_ar` | text | YES | - |
| `description_ar` | text | YES | - |
| `content` | jsonb | YES | '{}'::jsonb |
| `updated_at` | timestamp with time zone | YES | now() |

### `curriculum_reading_passages` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level` | integer | NO | - |
| `title_en` | text | NO | - |
| `title_ar` | text | NO | - |
| `passage` | text | NO | - |
| `word_count` | integer | NO | - |
| `topic` | text | NO | - |
| `difficulty` | text | NO | - |
| `questions` | jsonb | NO | '[]'::jsonb |
| `vocabulary_words` | jsonb | YES | '[]'::jsonb |
| `times_used` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |

### `curriculum_readings` (144 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `unit_id` | uuid | NO | - |
| `reading_label` | text | NO | - |
| `title_en` | text | NO | - |
| `title_ar` | text | YES | - |
| `before_read_exercise_a` | jsonb | YES | - |
| `before_read_exercise_b` | jsonb | YES | - |
| `before_read_image_url` | text | YES | - |
| `before_read_caption` | text | YES | - |
| `passage_content` | jsonb | NO | '{"paragraphs": []}'::jsonb |
| `passage_word_count` | integer | YES | - |
| `passage_footnotes` | jsonb | YES | '[]'::jsonb |
| `passage_image_urls` | jsonb | YES | '[]'::jsonb |
| `infographic_type` | text | YES | - |
| `infographic_data` | jsonb | YES | - |
| `infographic_image_url` | text | YES | - |
| `reading_skill_name_en` | text | YES | - |
| `reading_skill_name_ar` | text | YES | - |
| `reading_skill_explanation` | text | YES | - |
| `reading_skill_exercises` | jsonb | YES | '[]'::jsonb |
| `critical_thinking_type` | text | YES | - |
| `critical_thinking_prompt_en` | text | YES | - |
| `critical_thinking_prompt_ar` | text | YES | - |
| `passage_audio_url` | text | YES | - |
| `sort_order` | integer | YES | 0 |
| `is_published` | boolean | YES | false |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |
| `audio_duration_seconds` | integer | YES | - |
| `audio_generated_at` | timestamp with time zone | YES | - |

### `curriculum_speaking` (72 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `unit_id` | uuid | NO | - |
| `topic_number` | integer | YES | 1 |
| `topic_type` | text | NO | - |
| `title_en` | text | NO | - |
| `title_ar` | text | YES | - |
| `prompt_en` | text | NO | - |
| `prompt_ar` | text | YES | - |
| `preparation_notes` | jsonb | YES | '[]'::jsonb |
| `useful_phrases` | jsonb | YES | '[]'::jsonb |
| `model_audio_url` | text | YES | - |
| `min_duration_seconds` | integer | YES | 30 |
| `max_duration_seconds` | integer | YES | 120 |
| `evaluation_criteria` | jsonb | YES | '{"content": 25, "fluency": 25, "grammar": 25, "pronunciation": 25}'::jsonb |
| `difficulty` | text | YES | 'standard'::text |
| `is_published` | boolean | YES | false |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### `curriculum_speaking_topics` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level` | integer | NO | - |
| `topic_number` | integer | NO | - |
| `title_en` | text | NO | - |
| `title_ar` | text | NO | - |
| `category` | text | NO | - |
| `guiding_questions` | jsonb | NO | '[]'::jsonb |
| `vocabulary_hints` | jsonb | YES | '[]'::jsonb |
| `tips` | jsonb | YES | '[]'::jsonb |
| `duration_min` | integer | YES | 60 |
| `duration_max` | integer | YES | 90 |
| `times_used` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |

### `curriculum_units` (72 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level_id` | uuid | NO | - |
| `unit_number` | integer | NO | - |
| `theme_ar` | text | NO | - |
| `theme_en` | text | NO | - |
| `description_ar` | text | YES | - |
| `description_en` | text | YES | - |
| `cover_image_url` | text | YES | - |
| `warmup_questions` | jsonb | YES | '[]'::jsonb |
| `grammar_topic_ids` | jsonb | YES | '[]'::jsonb |
| `estimated_minutes` | integer | YES | 90 |
| `is_published` | boolean | YES | false |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |
| `why_matters` | text | YES | - |
| `outcomes` | ARRAY | YES | - |
| `brief_questions` | jsonb | YES | - |
| `brief_generated_at` | timestamp with time zone | YES | - |
| `brief_locale` | text | YES | 'ar'::text |
| `activity_ribbons` | jsonb | YES | - |
| `ribbons_generated_at` | timestamp with time zone | YES | - |

### `curriculum_video_sections` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `unit_id` | uuid | NO | - |
| `video_title_en` | text | NO | - |
| `video_title_ar` | text | YES | - |
| `video_url` | text | YES | - |
| `video_thumbnail_url` | text | YES | - |
| `before_watch` | jsonb | YES | - |
| `while_watch` | jsonb | YES | - |
| `after_watch` | jsonb | YES | - |
| `vocabulary_review` | jsonb | YES | '[]'::jsonb |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### `curriculum_vocabulary` (14383 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `reading_id` | uuid | NO | - |
| `word` | text | NO | - |
| `definition_en` | text | NO | - |
| `definition_ar` | text | YES | - |
| `example_sentence` | text | YES | - |
| `part_of_speech` | text | YES | - |
| `pronunciation_ipa` | text | YES | - |
| `audio_url` | text | YES | - |
| `image_url` | text | YES | - |
| `difficulty_tier` | text | YES | 'high_frequency'::text |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |
| `audio_generated_at` | timestamp with time zone | YES | - |
| `synonyms` | jsonb | YES | '[]'::jsonb |
| `antonyms` | jsonb | YES | '[]'::jsonb |
| `relationships_generated_at` | timestamp with time zone | YES | - |
| `word_family` | jsonb | YES | '[]'::jsonb |
| `word_family_generated_at` | timestamp with time zone | YES | - |
| `pronunciation_alert` | jsonb | YES | - |
| `pronunciation_generated_at` | timestamp with time zone | YES | - |
| `tier` | text | YES | - |
| `cefr_level` | text | YES | - |
| `source_list` | text | YES | - |
| `appears_in_passage` | boolean | NO | false |
| `tier_order` | integer | YES | - |
| `added_in_prompt` | text | YES | - |

### `curriculum_vocabulary_exercises` (1536 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `reading_id` | uuid | NO | - |
| `exercise_label` | text | NO | - |
| `exercise_type` | text | NO | - |
| `instructions_en` | text | YES | - |
| `instructions_ar` | text | YES | - |
| `mini_passage` | text | YES | - |
| `items` | jsonb | NO | '[]'::jsonb |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |

### `curriculum_vocabulary_srs` (97 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `student_id` | uuid | NO | - |
| `vocabulary_id` | uuid | NO | - |
| `ease_factor` | numeric | YES | 2.5 |
| `interval_days` | integer | YES | 1 |
| `repetitions` | integer | YES | 0 |
| `next_review_at` | timestamp with time zone | YES | now() |
| `last_quality` | integer | YES | - |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### `curriculum_writing` (72 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `unit_id` | uuid | NO | - |
| `task_number` | integer | YES | 1 |
| `task_type` | text | NO | - |
| `title_en` | text | NO | - |
| `title_ar` | text | YES | - |
| `prompt_en` | text | NO | - |
| `prompt_ar` | text | YES | - |
| `hints` | jsonb | YES | '[]'::jsonb |
| `word_count_min` | integer | YES | 50 |
| `word_count_max` | integer | YES | 200 |
| `vocabulary_to_use` | jsonb | YES | '[]'::jsonb |
| `grammar_to_use` | jsonb | YES | - |
| `model_answer` | text | YES | - |
| `rubric` | jsonb | YES | '{"content": 25, "grammar": 25, "vocabulary": 25, "organization": 25}'::jsonb |
| `difficulty` | text | YES | 'standard'::text |
| `is_published` | boolean | YES | false |
| `sort_order` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### `curriculum_writing_prompts` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `level` | integer | NO | - |
| `title_en` | text | NO | - |
| `title_ar` | text | NO | - |
| `prompt_type` | text | NO | - |
| `prompt` | text | NO | - |
| `prompt_ar` | text | NO | - |
| `instructions` | jsonb | NO | '[]'::jsonb |
| `word_count_min` | integer | NO | - |
| `word_count_max` | integer | NO | - |
| `hints` | jsonb | YES | '[]'::jsonb |
| `example_starter` | text | YES | - |
| `evaluation_criteria` | jsonb | YES | '["grammar", "vocabulary", "structure", "clarity"]'::jsonb |
| `times_used` | integer | YES | 0 |
| `created_at` | timestamp with time zone | YES | now() |

