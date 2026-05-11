# AUDIO-PHASE-A-DISCOVERY

Generated: 2026-05-11T00:32:10.004Z

## A.1 — Environment

- Node version: v24.14.0
- NODE_OPTIONS: --dns-result-order=ipv4first
- ELEVENLABS_API_KEY: present
- SUPABASE_SERVICE_ROLE_KEY: present
- VITE_SUPABASE_URL: present

## A.2 — ElevenLabs Quota

- Tier: growing_business
- Limit: 1,810,000
- Used: 0
- Remaining: 1,810,000
- Budget gate (1,500,000): PASS ✓

## A.3 — DB Schema Discovery

### Table: `reading_passages` — DOES NOT EXIST

### Table: `reading_passage_audio` (EXISTS)
  - passage_id (uuid, NOT NULL)
  - full_audio_url (text, NOT NULL)
  - full_audio_path (text, NOT NULL)
  - full_duration_ms (integer, NOT NULL)
  - paragraph_audio (jsonb, NOT NULL)
  - word_timestamps (jsonb, NOT NULL)
  - voice_id (text, NOT NULL)
  - generated_at (timestamp with time zone, NOT NULL)

### Table: `listening_transcripts` — DOES NOT EXIST

### Table: `listening_content` — DOES NOT EXIST

### Table: `unit_listening` — DOES NOT EXIST

### Table: `listening_audio` — DOES NOT EXIST

### Table: `curriculum_readings` (EXISTS)
  - id (uuid, NOT NULL)
  - unit_id (uuid, NOT NULL)
  - reading_label (text, NOT NULL)
  - title_en (text, NOT NULL)
  - title_ar (text)
  - before_read_exercise_a (jsonb)
  - before_read_exercise_b (jsonb)
  - before_read_image_url (text)
  - before_read_caption (text)
  - passage_content (jsonb, NOT NULL)
  - passage_word_count (integer)
  - passage_footnotes (jsonb)
  - passage_image_urls (jsonb)
  - infographic_type (text)
  - infographic_data (jsonb)
  - infographic_image_url (text)
  - reading_skill_name_en (text)
  - reading_skill_name_ar (text)
  - reading_skill_explanation (text)
  - reading_skill_exercises (jsonb)
  - critical_thinking_type (text)
  - critical_thinking_prompt_en (text)
  - critical_thinking_prompt_ar (text)
  - passage_audio_url (text)
  - sort_order (integer)
  - is_published (boolean)
  - created_at (timestamp with time zone)
  - updated_at (timestamp with time zone)
  - audio_duration_seconds (integer)
  - audio_generated_at (timestamp with time zone)

### Table: `curriculum_listening` (EXISTS)
  - id (uuid, NOT NULL)
  - unit_id (uuid, NOT NULL)
  - listening_number (integer)
  - title_en (text, NOT NULL)
  - title_ar (text)
  - audio_url (text)
  - audio_duration_seconds (integer)
  - transcript (text)
  - audio_type (text)
  - before_listen (jsonb)
  - exercises (jsonb, NOT NULL)
  - discussion_prompts (jsonb)
  - difficulty (text)
  - is_published (boolean)
  - sort_order (integer)
  - created_at (timestamp with time zone)
  - updated_at (timestamp with time zone)
  - audio_generated_at (timestamp with time zone)
  - speaker_segments (jsonb)
  - segments_processed_at (timestamp with time zone)
  - word_timestamps (jsonb)

### Table: `curriculum_vocabulary` (EXISTS)
  - id (uuid, NOT NULL)
  - reading_id (uuid, NOT NULL)
  - word (text, NOT NULL)
  - definition_en (text, NOT NULL)
  - definition_ar (text)
  - example_sentence (text)
  - part_of_speech (text)
  - pronunciation_ipa (text)
  - audio_url (text)
  - image_url (text)
  - difficulty_tier (text)
  - sort_order (integer)
  - created_at (timestamp with time zone)
  - audio_generated_at (timestamp with time zone)
  - synonyms (jsonb)
  - antonyms (jsonb)
  - relationships_generated_at (timestamp with time zone)
  - word_family (jsonb)
  - word_family_generated_at (timestamp with time zone)
  - pronunciation_alert (jsonb)
  - pronunciation_generated_at (timestamp with time zone)
  - tier (text)
  - cefr_level (text)
  - source_list (text)
  - appears_in_passage (boolean, NOT NULL)
  - tier_order (integer)
  - added_in_prompt (text)
  - regenerated_at (timestamp with time zone)
  - cleanup_run_id (text)
  - original_example_sentence (text)
  - audio_duration_ms (integer)
  - audio_voice_name (text)

### Table: `vocabulary` — DOES NOT EXIST

### Table: `vocabulary_audio` — DOES NOT EXIST

### Table: `irregular_verbs` (EXISTS)
  - id (uuid, NOT NULL)
  - base_form (text, NOT NULL)
  - past_simple (text, NOT NULL)
  - past_participle (text, NOT NULL)
  - meaning_ar (text, NOT NULL)
  - example_sentence (text)
  - frequency_rank (integer)
  - level_appropriate (integer)
  - created_at (timestamp with time zone)

### Table: `curriculum_irregular_verbs` (EXISTS)
  - id (uuid, NOT NULL)
  - level_id (uuid, NOT NULL)
  - verb_base (text, NOT NULL)
  - verb_past (text, NOT NULL)
  - verb_past_participle (text, NOT NULL)
  - meaning_ar (text, NOT NULL)
  - example_sentence (text)
  - audio_base_url (text)
  - audio_past_url (text)
  - audio_pp_url (text)
  - group_tag (text)
  - difficulty (integer)
  - sort_order (integer)
  - created_at (timestamp with time zone)
  - audio_generated_at (timestamp with time zone)

### Table: `ai_usage` (EXISTS)
  - id (uuid, NOT NULL)
  - type (USER-DEFINED, NOT NULL)
  - student_id (uuid)
  - trainer_id (uuid)
  - model (text)
  - input_tokens (integer)
  - output_tokens (integer)
  - audio_seconds (integer)
  - estimated_cost_sar (numeric)
  - created_at (timestamp with time zone)

### Table: `levels` — DOES NOT EXIST

### Table: `units` — DOES NOT EXIST

### Searching for any table containing audio_url...
Tables with audio_url column: curriculum_listening, curriculum_pronunciation, curriculum_vocabulary, curriculum_vocabulary_tier1_snapshot, curriculum_vocabulary_tier2_snapshot, curriculum_vocabulary_tier3_snapshot, ielts_listening_sections, ielts_submissions, speaking_recordings, voice_journals

### All public tables:
  - achievements
  - active_assignments
  - active_payments
  - active_students
  - active_submissions
  - activity_attempts
  - activity_events
  - activity_feed
  - adaptive_question_bank
  - affiliate_clicks
  - affiliate_conversions
  - affiliate_materials
  - affiliate_payouts
  - affiliates
  - ai_chat_messages
  - ai_student_profiles
  - ai_usage
  - analytics_events
  - anki_cards
  - anki_review_logs
  - announcements
  - archived_landing_pages
  - assessments
  - assignments
  - attendance
  - audit_log
  - challenge_participants
  - challenges
  - churn_predictions
  - class_debriefs
  - class_notes
  - class_recordings
  - class_summaries
  - classes
  - coach_conversations
  - coach_messages
  - competition_announcements_seen
  - competition_notifications_log
  - competition_snapshots
  - competition_team_bonuses
  - competition_team_streaks
  - competition_weekly_goals
  - competitions
  - content_library
  - creator_challenges
  - creator_submissions
  - curriculum_assessments
  - curriculum_comprehension_questions
  - curriculum_grammar
  - curriculum_grammar_exercises
  - curriculum_grammar_lessons
  - curriculum_irregular_verb_exercises
  - curriculum_irregular_verbs
  - curriculum_levels
  - curriculum_listening
  - curriculum_listening_exercises
  - curriculum_pronunciation
  - curriculum_reading_passages
  - curriculum_readings
  - curriculum_speaking
  - curriculum_speaking_topics
  - curriculum_units
  - curriculum_video_sections
  - curriculum_vocabulary
  - curriculum_vocabulary_exercises
  - curriculum_vocabulary_srs
  - curriculum_vocabulary_tier1_snapshot
  - curriculum_vocabulary_tier2_snapshot
  - curriculum_vocabulary_tier3_snapshot
  - curriculum_writing
  - curriculum_writing_prompts
  - daily_challenges
  - daily_reports
  - data_reset_log
  - direct_messages
  - duel_leaderboard_weekly
  - duel_queue
  - duel_rounds
  - duel_stats
  - duels
  - error_patterns
  - evaluation_health_log
  - event_participants
  - game_sessions
  - grading_events
  - grammar_explanation_cache
  - group_messages
  - groups
  - help_requests
  - holidays
  - ielts_adaptive_plans
  - ielts_diagnostic
  - ielts_error_bank
  - ielts_listening_sections
  - ielts_mock_attempts
  - ielts_mock_tests
  - ielts_reading_passages
  - ielts_reading_skills
  - ielts_skill_sessions
  - ielts_speaking_questions
  - ielts_student_progress
  - ielts_student_results
  - ielts_submissions
  - ielts_writing_tasks
  - iot_answers
  - iot_collections
  - iot_images
  - iot_reading_passages
  - iot_student_attempts
  - iot_tests
  - iot_volumes
  - irregular_verbs
  - leads
  - message_reactions
  - nabih_conversations
  - nabih_messages
  - notification_preferences
  - notifications
  - page_visits
  - parent_links
  - passage_ai_content
  - payments
  - peer_recognitions
  - placement_question_bank
  - placement_responses
  - placement_results
  - placement_sessions
  - private_sessions
  - profiles
  - progress_reports
  - push_subscriptions
  - quiz_answers
  - quiz_attempts
  - quiz_questions
  - quizzes
  - reading_notes
  - reading_passage_audio
  - recording_bookmarks
  - recording_chapters
  - recording_fallback_events
  - recording_health
  - recording_notes
  - recording_progress
  - recording_requests
  - recording_tier_stats
  - referrals
  - seasonal_events
  - settings
  - skill_snapshots
  - smart_nudges
  - social_shares
  - speaking_hub_assignments
  - speaking_hub_student_progress
  - speaking_hubs
  - speaking_practice_attempts
  - speaking_recordings
  - speaking_topic_banks
  - spelling_sessions
  - spelling_words
  - student_achievements
  - student_activity_best_score
  - student_bookmarks
  - student_curriculum_progress
  - student_daily_completions
  - student_error_bank
  - student_interventions
  - student_level_assessment_attempts
  - student_level_exit_status
  - student_notes
  - student_planned_tasks
  - student_player_preference
  - student_saved_words
  - student_skill_state
  - student_speaking_progress
  - student_spelling_progress
  - student_streaks
  - student_unit_skill_snapshots
  - student_verb_progress
  - student_xp_audit
  - students
  - submissions
  - system_errors
  - targeted_exercises
  - task_briefings_cache
  - team_members
  - teams
  - test_questions
  - test_responses
  - test_sessions
  - testimonials
  - trainer_daily_rituals
  - trainer_notes
  - trainer_onboarding
  - trainer_payroll
  - trainer_streaks
  - trainer_xp_events
  - trainers
  - unified_activity_log
  - unit_mastery_answers
  - unit_mastery_assessments
  - unit_mastery_attempts
  - unit_mastery_questions
  - unit_mastery_variants
  - user_sessions
  - vocab_cache
  - vocabulary_bank
  - vocabulary_quiz_attempts
  - vocabulary_word_mastery
  - voice_journals
  - weekly_schedule_config
  - weekly_task_sets
  - weekly_tasks
  - writing_history
  - xp_event_flags
  - xp_transactions

## Resolved Table Names

- Reading: curriculum_readings
- Listening: curriculum_listening
- Vocabulary: curriculum_vocabulary
- Irregular Verbs: irregular_verbs
- Levels: NOT FOUND
- Units: NOT FOUND

## A.4 — Content Counts Per Level

Cannot query counts — levels or units table not found.

Total vocab items: 13930
Total irregular verbs: 150

## A.5 — Audio Coverage

Reading: total=144, passages with audio rows=0, gap=144
Listening: total=72, with audio_url=0, gap=72
Vocab: total=13930, with audio_url=1497, gap=12433
Verbs: total=150, no base audio column found

## A.6 — Listening Speaker Structure

Columns: id, unit_id, listening_number, title_en, title_ar, audio_url, audio_duration_seconds, transcript, audio_type, before_listen, exercises, discussion_prompts, difficulty, is_published, sort_order, created_at, updated_at, audio_generated_at, speaker_segments, segments_processed_at, word_timestamps

### Sample 1 (id=2992edc4-d68d-4f16-99d1-ab7b7a2683c3)
- id: 2992edc4-d68d-4f16-99d1-ab7b7a2683c3
- unit_id: 49ed7c2c-fa1b-47b2-bb5c-34074beeafdc
- listening_number: 1
- title_en: Listening: monologue
- audio_duration_seconds: 105
- transcript: [text, 1497 chars] Nadia: Hi everyone! My name is Nadia and I want to tell you about my favorite festival. Last month, I went to the Cherry Blossom Festival in Japan. It was amazing! I traveled there with my sister Fatima. We stayed for one week. The festival happens every spring when the cherry trees have beautiful p...
- audio_type: monologue
- exercises: [JSON] [{"type":"mcq","options":["In summer","In spring","In winter"],"sort_order":0,"question_en":"When does the Cherry Blossom Festival happen?","question_type":"detail","explanation_ar":"المهرجان يحدث في الربيع عندما تزهر أشجار الكرز","correct_answer_index":1},{"type":"mcq","options":["Her friend","Her 
- discussion_prompts: [JSON] []
- difficulty: standard
- is_published: false
- sort_order: 0
- created_at: [JSON] "2026-03-17T14:41:33.169Z"
- updated_at: [JSON] "2026-03-17T14:41:33.169Z"
- speaker_segments: [JSON] [{"text":"Hi everyone! My name is Nadia and I want to tell you about my favorite festival. Last month, I went to the Cherry Blossom Festival in Japan. It was amazing! I traveled there with my sister Fatima. We stayed for one week. The festival happens every spring when the cherry trees have beautifu
- segments_processed_at: [JSON] "2026-05-09T23:06:33.059Z"

### Sample 2 (id=44b25ac5-ed1e-4b8d-84d9-ec23614417b6)
- id: 44b25ac5-ed1e-4b8d-84d9-ec23614417b6
- unit_id: 1de8e161-81eb-416e-af87-c136d93f3930
- listening_number: 1
- title_en: Listening: monologue
- audio_duration_seconds: 105
- transcript: [text, 1443 chars] Layla: Hi everyone! My name is Layla, and I want to tell you about my amazing trip to the Red Sea last month. I went with my family to Jeddah, and we visited the beautiful coral reefs there.

The ocean was so blue and clear! I could see many different sea animals. There were colorful fish swimming e...
- audio_type: monologue
- exercises: [JSON] [{"type":"mcq","options":["Dubai","Jeddah","Riyadh"],"sort_order":0,"question_en":"Where did Layla go last month?","question_type":"detail","explanation_ar":"لیلى ذهبت إلى جدة الشهر الماضي لرؤية الشعاب المرجانية في البحر الأحمر","correct_answer_index":1},{"type":"mcq","options":["A dolphin","A sea t
- discussion_prompts: [JSON] []
- difficulty: standard
- is_published: false
- sort_order: 0
- created_at: [JSON] "2026-03-18T01:22:42.403Z"
- updated_at: [JSON] "2026-03-18T01:22:42.403Z"
- speaker_segments: [JSON] [{"text":"Hi everyone! My name is Layla, and I want to tell you about my amazing trip to the Red Sea last month. I went with my family to Jeddah, and we visited the beautiful coral reefs there.\n\nThe ocean was so blue and clear! I could see many different sea animals. There were colorful fish swimm
- segments_processed_at: [JSON] "2026-05-09T23:06:33.939Z"

### Sample 3 (id=89982954-2326-40a8-9227-62a9dd8af906)
- id: 89982954-2326-40a8-9227-62a9dd8af906
- unit_id: 9a560631-9d0b-4b5a-a3d5-567c1779ab6e
- listening_number: 1
- title_en: Listening: monologue
- audio_duration_seconds: 105
- transcript: [text, 1446 chars] Sarah: Hi everyone! I'm Sarah, and I love to travel. Today I want to tell you about some amazing places I visited last year. First, I went to Paris in France. Paris is a beautiful city, and it's famous for the Eiffel Tower. The Eiffel Tower is very tall and made of metal. I took many photos there. T...
- audio_type: monologue
- exercises: [JSON] [{"type":"mcq","options":["The Eiffel Tower and the Louvre","Big Ben and Tower Bridge","The Colosseum and churches"],"sort_order":0,"question_en":"What did Sarah see in London?","question_type":"detail","explanation_ar":"سارة رأت بيغ بن وجسر تاور في لندن","correct_answer_index":1},{"type":"mcq","opt
- discussion_prompts: [JSON] []
- difficulty: standard
- is_published: false
- sort_order: 0
- created_at: [JSON] "2026-03-18T01:35:07.676Z"
- updated_at: [JSON] "2026-03-18T01:35:07.676Z"
- speaker_segments: [JSON] [{"text":"Hi everyone! I'm Sarah, and I love to travel. Today I want to tell you about some amazing places I visited last year. First, I went to Paris in France. Paris is a beautiful city, and it's famous for the Eiffel Tower. The Eiffel Tower is very tall and made of metal. I took many photos there
- segments_processed_at: [JSON] "2026-05-09T23:06:38.916Z"

## A.7 — Existing Scripts in scripts/audio-generator/

- analyze-listening-voices.cjs [OBSOLETE CANDIDATE]
- check-quota.cjs [OBSOLETE CANDIDATE]
- config.cjs [OBSOLETE CANDIDATE]
- elevenlabs-client.cjs [OBSOLETE CANDIDATE]
- generate-ielts-listening.cjs [OBSOLETE CANDIDATE]
- generate-verbs-audio.cjs [OBSOLETE CANDIDATE]
- generate-vocab.mjs
- generate-vocabulary-audio.cjs [OBSOLETE CANDIDATE]
- list-voices.cjs [OBSOLETE CANDIDATE]
- listening-voice-map.json [OBSOLETE CANDIDATE]
- phase-a-discovery.mjs
- preprocess-dialogues.mjs
- speaker-gender-map.json [OBSOLETE CANDIDATE]
- supabase-uploader.cjs [OBSOLETE CANDIDATE]
- test-output
- test-voice.cjs [OBSOLETE CANDIDATE]

## A.8 — ai_usage table

Columns: id(uuid), type(USER-DEFINED), student_id(uuid), trainer_id(uuid), model(text), input_tokens(integer), output_tokens(integer), audio_seconds(integer), estimated_cost_sar(numeric), created_at(timestamp with time zone)
Row count: 385
