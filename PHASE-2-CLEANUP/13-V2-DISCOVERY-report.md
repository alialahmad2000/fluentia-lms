# V2-PATCH Discovery Report

Generated: 2026-04-08

## Student Tables Found

| Table Name | Purpose (inferred) | Row Count | Distinct Students |
|---|---|---|---|
| students | Core student profiles | 12 | 12 |
| student_curriculum_progress | **Reading/writing/grammar/speaking completion & scores** | 73 | 8 |
| student_saved_words | Vocabulary bookmarks | 6 | 2 |
| speaking_recordings | Audio recordings for speaking tasks | 5 | 4 |
| writing_history | Free writing practice history | 3 | 1 |
| student_planned_tasks | Weekly planner tasks | 2 | 1 |
| student_achievements | Badge/achievement awards | 0 | 0 |
| student_bookmarks | Unit section bookmarks | 0 | 0 |
| student_daily_completions | Daily challenge completions | 0 | 0 |
| student_error_bank | Error pattern tracking | 0 | 0 |
| student_level_assessment_attempts | Level exit exam attempts | 0 | 0 |
| student_level_exit_status | Level pass/fail status (view?) | 0 | 0 |
| student_notes | Student notes per unit | 0 | 0 |
| student_speaking_progress | Speaking topic progress | 0 | 0 |
| student_spelling_progress | Spelling drill mastery | 0 | 0 |
| student_streaks | Streak/XP/badge tracking | 0 | 0 |
| student_verb_progress | Irregular verb mastery | 0 | 0 |
| submissions | Assignment submissions (writing/speaking) | 0 | 0 |
| quiz_attempts | Quiz session tracking | 0 | 0 |
| quiz_answers | Individual quiz answers | 0 | 0 |
| test_responses | Placement/assessment test answers | 0 | 0 |
| progress_reports | AI-generated progress reports | 0 | 0 |
| ai_student_profiles | AI skill profile summaries | 0 | 0 |

## Schema Per Table

### student_curriculum_progress (CRITICAL — has reading_id FK)
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| unit_id | uuid | YES |
| reading_id | uuid | YES |
| grammar_id | uuid | YES |
| assessment_id | uuid | YES |
| writing_id | uuid | YES |
| listening_id | uuid | YES |
| speaking_id | uuid | YES |
| section_type | text | NO |
| status | text | YES |
| score | numeric | YES |
| answers | jsonb | YES |
| recording_url | text | YES |
| ai_feedback | jsonb | YES |
| time_spent_seconds | integer | YES |
| completed_at | timestamptz | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |
| attempt_number | integer | YES |
| attempt_history | jsonb | YES |
| trainer_feedback | text | YES |
| trainer_grade | text | YES |
| trainer_graded_at | timestamptz | YES |
| trainer_graded_by | uuid | YES |
| pronunciation_id | uuid | YES |

### speaking_recordings
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| unit_id | uuid | NO |
| question_index | integer | NO |
| audio_url | text | NO |
| audio_duration_seconds | integer | YES |
| audio_format | text | YES |
| audio_size_bytes | integer | YES |
| ai_evaluation | jsonb | YES |
| ai_evaluated_at | timestamptz | YES |
| ai_model | text | YES |
| trainer_reviewed | boolean | YES |
| trainer_feedback | text | YES |
| trainer_grade | text | YES |
| trainer_reviewed_at | timestamptz | YES |
| trainer_id | uuid | YES |
| xp_awarded | integer | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |
| audio_path | text | YES |

### writing_history
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| task_type | text | NO |
| original_text | text | NO |
| feedback | jsonb | YES |
| band_score | numeric | YES |
| fluency_score | integer | YES |
| xp_earned | integer | YES |
| prompt_used | text | YES |
| created_at | timestamptz | YES |

### student_saved_words
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| word | text | NO |
| meaning | text | YES |
| source_unit_id | uuid | YES |
| context_sentence | text | YES |
| created_at | timestamptz | YES |

### student_planned_tasks
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| task_type | text | NO |
| task_reference_id | uuid | YES |
| title | text | NO |
| planned_day | integer | NO |
| planned_slot | text | NO |
| week_start | date | NO |
| is_completed | boolean | YES |
| completed_at | timestamptz | YES |
| sort_order | integer | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |
| deleted_at | timestamptz | YES |

### students
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| academic_level | integer | YES |
| ielts_phase | integer | YES |
| package | USER-DEFINED | YES |
| track | USER-DEFINED | YES |
| group_id | uuid | YES |
| team_id | uuid | YES |
| xp_total | integer | YES |
| current_streak | integer | YES |
| longest_streak | integer | YES |
| gamification_level | integer | YES |
| streak_freeze_available | boolean | YES |
| enrollment_date | date | YES |
| status | USER-DEFINED | YES |
| custom_price | integer | YES |
| payment_day | integer | YES |
| payment_link | text | YES |
| referral_code | text | YES |
| referred_by | uuid | YES |
| writing_limit_override | integer | YES |
| goals | text | YES |
| interests | ARRAY | YES |
| public_goal | text | YES |
| last_active_at | timestamptz | YES |
| onboarding_completed | boolean | YES |
| deleted_at | timestamptz | YES |
| temp_password | text | YES |
| custom_access | jsonb | YES |

### student_achievements
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | YES |
| achievement_id | uuid | YES |
| earned_at | timestamptz | YES |
| shared | boolean | YES |

### student_bookmarks
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| unit_id | uuid | NO |
| section_type | text | NO |
| note | text | YES |
| created_at | timestamptz | YES |

### student_error_bank
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| error_type | text | NO |
| error_category | text | NO |
| original_text | text | YES |
| correct_text | text | YES |
| explanation_ar | text | YES |
| explanation_en | text | YES |
| source_section | text | YES |
| occurrence_count | integer | YES |
| is_resolved | boolean | YES |
| last_occurred_at | timestamptz | YES |
| created_at | timestamptz | YES |

### student_level_assessment_attempts
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| assessment_id | uuid | NO |
| level_id | uuid | NO |
| started_at | timestamptz | NO |
| submitted_at | timestamptz | YES |
| score_percent | numeric | YES |
| total_questions | integer | YES |
| correct_answers | integer | YES |
| answers | jsonb | YES |
| passed | boolean | YES |
| attempt_number | integer | NO |
| duration_seconds | integer | YES |

### student_notes
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| unit_id | uuid | NO |
| content | text | NO |
| section_type | text | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

### student_speaking_progress
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | YES |
| topic_id | uuid | YES |
| completed | boolean | YES |
| submission_id | uuid | YES |
| completed_at | timestamptz | YES |

### student_spelling_progress
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| word_id | uuid | NO |
| times_tested | integer | YES |
| times_correct | integer | YES |
| accuracy_rate | numeric | YES |
| mastery | text | YES |
| last_wrong_spelling | text | YES |
| last_tested_at | timestamptz | YES |

### student_streaks
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| current_streak | integer | YES |
| longest_streak | integer | YES |
| last_activity_date | date | YES |
| total_xp | integer | YES |
| current_level | integer | YES |
| badges | jsonb | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

### student_verb_progress
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| verb_id | uuid | NO |
| times_tested | integer | YES |
| times_correct | integer | YES |
| mastery | text | YES |
| last_tested_at | timestamptz | YES |

### submissions
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| assignment_id | uuid | YES |
| student_id | uuid | YES |
| assignment_version | integer | YES |
| content_text | text | YES |
| content_voice_url | text | YES |
| content_voice_duration | integer | YES |
| content_voice_transcript | text | YES |
| content_image_urls | ARRAY | YES |
| content_file_urls | jsonb | YES |
| content_link | text | YES |
| difficulty_rating | USER-DEFINED | YES |
| status | USER-DEFINED | YES |
| submitted_at | timestamptz | YES |
| is_late | boolean | YES |
| grade | text | YES |
| grade_numeric | integer | YES |
| trainer_feedback | text | YES |
| trainer_feedback_template | text | YES |
| ai_feedback | jsonb | YES |
| ai_feedback_approved | boolean | YES |
| points_awarded | integer | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |
| deleted_at | timestamptz | YES |

### quiz_attempts
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| quiz_id | uuid | YES |
| student_id | uuid | YES |
| started_at | timestamptz | YES |
| completed_at | timestamptz | YES |
| time_spent_seconds | integer | YES |
| total_score | integer | YES |
| max_score | integer | YES |
| percentage | numeric | YES |
| skill_breakdown | jsonb | YES |
| xp_awarded | integer | YES |
| status | USER-DEFINED | YES |

### quiz_answers
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| attempt_id | uuid | YES |
| question_id | uuid | YES |
| student_answer | text | YES |
| is_correct | boolean | YES |
| points_earned | integer | YES |
| ai_grade | jsonb | YES |

### test_responses
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| session_id | uuid | NO |
| question_id | uuid | NO |
| student_id | uuid | NO |
| answer | text | YES |
| is_correct | boolean | YES |
| time_spent_seconds | integer | YES |
| difficulty_at_time | numeric | YES |
| sequence_number | integer | NO |
| created_at | timestamptz | YES |

### ai_student_profiles
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| skills | jsonb | YES |
| strengths | ARRAY | YES |
| weaknesses | ARRAY | YES |
| tips | ARRAY | YES |
| summary_ar | text | YES |
| summary_en | text | YES |
| raw_analysis | jsonb | YES |
| generated_at | timestamptz | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

### progress_reports
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | YES |
| period_start | date | NO |
| period_end | date | NO |
| type | USER-DEFINED | NO |
| ai_summary | text | YES |
| trainer_notes | text | YES |
| data | jsonb | YES |
| pdf_url | text | YES |
| status | USER-DEFINED | YES |
| published_at | timestamptz | YES |
| trainer_id | uuid | YES |
| generated_at | timestamptz | YES |
| language | text | YES |

### student_daily_completions
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| student_id | uuid | NO |
| challenge_id | uuid | NO |
| score | numeric | YES |
| xp_earned | integer | YES |
| completed_at | timestamptz | YES |

## Foreign Keys (Curriculum-linked)

| Source Table.Column | -> Target Table.Column |
|---|---|
| student_curriculum_progress.reading_id | -> curriculum_readings.id |
| student_curriculum_progress.unit_id | -> curriculum_units.id |
| student_bookmarks.unit_id | -> curriculum_units.id |
| student_notes.unit_id | -> curriculum_units.id |
| student_saved_words.source_unit_id | -> curriculum_units.id |
| speaking_recordings.unit_id | -> curriculum_units.id |
| student_level_assessment_attempts.level_id | -> curriculum_levels.id |
| curriculum_comprehension_questions.reading_id | -> curriculum_readings.id |
| curriculum_readings.unit_id | -> curriculum_units.id |
| curriculum_vocabulary.reading_id | -> curriculum_readings.id |
| curriculum_vocabulary_exercises.reading_id | -> curriculum_readings.id |

## L1 Baseline

- L1 level ID: `2755b494-c7ff-4bdc-96ac-7ab735dc038c`
- L1 CEFR: A1
- L1 unit count: 12
- L1 reading count: 24
- L1 question count: 144 (matches expected: 24 passages x 5 questions + 24 passages x 1 bonus = confirmed 144)

### L1 Units
| Unit | Theme |
|---|---|
| 1 | Cultural Festivals |
| 2 | Ocean Life |
| 3 | Space Exploration |
| 4 | Music & Art |
| 5 | Famous Places |
| 6 | Inventions |
| 7 | Sports Stars |
| 8 | Ancient Civilizations |
| 9 | Photography |
| 10 | World Cuisines |
| 11 | Social Media |
| 12 | Green Living |

## L1 Student Activity (CRITICAL — determines protection scope)

### student_curriculum_progress breakdown by section_type
| Section Type | L1 Records | L1 Students |
|---|---|---|
| reading | 11 | 5 |
| vocabulary | 11 | 5 |
| grammar | 7 | 4 |
| vocabulary_exercise | 5 | 4 |
| writing | 5 | 3 |
| speaking | 4 | 3 |
| pronunciation | 3 | 3 |
| **TOTAL** | **46** | **5 (unique)** |

### Other student tables with L1 data
| Student Table | L1 Records | L1 Students Affected |
|---|---|---|
| student_curriculum_progress (reading_id match) | 11 | 5 |
| student_curriculum_progress (all sections) | 46 | 5 |
| speaking_recordings | 4 | 3 |
| student_saved_words | unknown (linked by unit, not filtered) | 2 |
| writing_history | unknown (no unit FK) | 1 |

## Sample Records

### student_curriculum_progress (reading section)
```json
[
  {
    "id": "31881344-7a87-4ff7-a303-5f9d092f9cdc",
    "student_id": "cad66f17-4471-4e64-acce-aa2836e1a814",
    "unit_id": "1de8e161-81eb-416e-af87-c136d93f3930",
    "reading_id": "c812db3e-470a-40bd-b10e-40188e5699dc",
    "section_type": "reading",
    "status": "completed",
    "score": "100",
    "completed_at": "2026-04-07 19:34:42.779+00",
    "attempt_number": 1
  },
  {
    "id": "d179e39a-203f-4016-bfd5-3c1caca434a8",
    "student_id": "cad66f17-4471-4e64-acce-aa2836e1a814",
    "unit_id": "49ed7c2c-fa1b-47b2-bb5c-34074beeafdc",
    "reading_id": "0d3b261d-f139-4dec-9958-581a35986661",
    "section_type": "reading",
    "status": "completed",
    "score": "100",
    "completed_at": "2026-04-04 11:35:17.063+00",
    "attempt_number": 1
  },
  {
    "id": "f4ca7e05-a4e0-4c86-abf1-8daaa9f88067",
    "student_id": "d1a3b497-c15b-42e5-83d8-864ce311fb5b",
    "unit_id": "49ed7c2c-fa1b-47b2-bb5c-34074beeafdc",
    "reading_id": "0d3b261d-f139-4dec-9958-581a35986661",
    "section_type": "reading",
    "status": "completed",
    "score": "100",
    "completed_at": "2026-04-05 00:42:33.106+00",
    "attempt_number": 1
  }
]
```

### student_curriculum_progress (non-reading sections)
```json
[
  {
    "id": "ef3fbbbf-8794-4068-9aec-8312296dafea",
    "student_id": "af56ca47-2637-494a-b0b1-64a83e29f942",
    "unit_id": "1de8e161-81eb-416e-af87-c136d93f3930",
    "section_type": "pronunciation",
    "status": "in_progress",
    "score": null,
    "completed_at": null
  },
  {
    "id": "0bdd864b-ba5f-4b0a-94e7-d5c111af911f",
    "student_id": "e5528ced-b3e2-45bb-8c89-9368dc9b5b96",
    "unit_id": "49ed7c2c-fa1b-47b2-bb5c-34074beeafdc",
    "section_type": "vocabulary",
    "status": "completed",
    "score": "100",
    "completed_at": "2026-04-03 10:31:04.982+00"
  },
  {
    "id": "3c29a6a5-fa32-464b-8db3-a76074e6bbd7",
    "student_id": "cad66f17-4471-4e64-acce-aa2836e1a814",
    "unit_id": "1de8e161-81eb-416e-af87-c136d93f3930",
    "section_type": "writing",
    "status": "completed",
    "score": "60",
    "completed_at": "2026-04-07 17:50:40.692+00"
  }
]
```

### speaking_recordings (L1)
```json
[
  {
    "id": "08b2f886-1802-4f84-a44f-c887162457b5",
    "student_id": "af56ca47-2637-494a-b0b1-64a83e29f942",
    "unit_id": "49ed7c2c-fa1b-47b2-bb5c-34074beeafdc",
    "question_index": 0,
    "created_at": "2026-04-05 15:29:21.52045+00"
  },
  {
    "id": "aef0a955-52a6-4053-8912-a00df15b54d4",
    "student_id": "cad66f17-4471-4e64-acce-aa2836e1a814",
    "unit_id": "1de8e161-81eb-416e-af87-c136d93f3930",
    "question_index": 0,
    "created_at": "2026-04-06 18:03:38.519143+00"
  },
  {
    "id": "01cf5f6a-b5fd-4e2c-9e04-28f2e1652ebe",
    "student_id": "f9ecb220-107e-436e-a4b7-80fd9df0cba4",
    "unit_id": "1de8e161-81eb-416e-af87-c136d93f3930",
    "question_index": 0,
    "created_at": "2026-04-07 13:58:49.488762+00"
  }
]
```

## Conclusions

### Mechanical task tables (auto-complete eligible)
- **student_curriculum_progress** (section_type = 'reading'): These store MCQ scores. After passage rewrite, the old score is meaningless but harmless. The `answers` JSONB references question IDs that still exist (just rewritten). Auto-completion is safe: preserve `status=completed`, `score`, `completed_at`.

### Creative work tables (archive required)
- **speaking_recordings**: Contains actual student audio files. These are linked by `unit_id`, NOT by `reading_id`. Passage rewrites do NOT invalidate speaking recordings (speaking topics are separate from reading passages). **No action needed.**
- **writing_history**: No `unit_id` or `reading_id` FK. Not linked to readings at all. **No action needed.**
- **student_curriculum_progress** (section_type = 'writing' or 'speaking'): Contains `recording_url`, `ai_feedback`. These reference the curriculum_writing/curriculum_speaking tables, NOT readings. **No action needed for passage rewrites.**

### Tables NOT linked to readings (ignore for L1 batch)
- student_achievements (no data)
- student_bookmarks (linked to unit_id, not reading_id; no data)
- student_daily_completions (linked to challenges; no data)
- student_error_bank (no data)
- student_level_assessment_attempts (linked to level_id; no data)
- student_notes (linked to unit_id; no data)
- student_planned_tasks (linked to task_reference_id, not reading_id)
- student_saved_words (linked to source_unit_id; words don't change)
- student_speaking_progress (linked to topic_id)
- student_spelling_progress (linked to word_id)
- student_streaks (global)
- student_verb_progress (linked to verb_id)
- submissions (linked to assignment_id)
- quiz_attempts / quiz_answers (linked to quiz_id)
- test_responses (linked to session_id)
- progress_reports (periodic summaries)
- ai_student_profiles (global profiles)

### Total L1 student work to protect
- **11 records** across **5 students** in `student_curriculum_progress` where `reading_id` matches an L1 reading
- All 11 are `status=completed` with `score=100` and `attempt_number=1`
- These students answered MCQ questions on the old passage text. After rewrite, the questions change but their completion status should be preserved.

## Schema Bug Found in MANIFEST V2

**curriculum_units** uses `theme_en` (not `title_en` as V2 assumes in Phase 0/A SQL).
This must be corrected in V2-PATCH or the queries will fail.
