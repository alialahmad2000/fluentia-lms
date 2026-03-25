-- ============================================================
-- Migration 047: Reset ALL student activity/testing data
-- Purpose: Clean up testing artifacts before production launch
-- Keeps: accounts, curriculum, recordings, content, groups
-- ============================================================

-- ─── 1. Delete deepest FK-dependent tables first ─────────────

-- Quiz answers (depends on quiz_attempts)
DELETE FROM quiz_answers WHERE true;

-- Quiz attempts (depends on quizzes, students)
DELETE FROM quiz_attempts WHERE true;

-- Attendance (depends on classes, students)
DELETE FROM attendance WHERE true;

-- Class notes (depends on classes, profiles)
DELETE FROM class_notes WHERE true;

-- Submissions (depends on assignments, students)
DELETE FROM submissions WHERE true;

-- Student speaking progress (depends on students, speaking_topic_banks)
DELETE FROM student_speaking_progress WHERE true;

-- ─── 2. XP & Gamification ───────────────────────────────────

-- XP transactions
DELETE FROM xp_transactions WHERE true;

-- Student achievements
DELETE FROM student_achievements WHERE true;

-- Challenge participants (depends on challenges)
DELETE FROM challenge_participants WHERE true;

-- Peer recognitions
DELETE FROM peer_recognitions WHERE true;

-- Social shares
DELETE FROM social_shares WHERE true;

-- ─── 3. Messaging ───────────────────────────────────────────

-- Message reactions (depends on group_messages)
DELETE FROM message_reactions WHERE true;

-- Group messages
DELETE FROM group_messages WHERE true;

-- Direct messages
DELETE FROM direct_messages WHERE true;

-- AI chat messages
DELETE FROM ai_chat_messages WHERE true;

-- ─── 4. Weekly Tasks & Spelling ─────────────────────────────

-- Weekly tasks (depends on weekly_task_sets)
DELETE FROM weekly_tasks WHERE true;

-- Weekly task sets
DELETE FROM weekly_task_sets WHERE true;

-- Student spelling progress
DELETE FROM student_spelling_progress WHERE true;

-- Spelling sessions
DELETE FROM spelling_sessions WHERE true;

-- Student verb progress
DELETE FROM student_verb_progress WHERE true;

-- ─── 5. Assessments & Progress ──────────────────────────────

-- Assessments
DELETE FROM assessments WHERE true;

-- Skill snapshots
DELETE FROM skill_snapshots WHERE true;

-- Progress reports
DELETE FROM progress_reports WHERE true;

-- Vocabulary bank (student personal vocabulary)
DELETE FROM vocabulary_bank WHERE true;

-- Voice journals
DELETE FROM voice_journals WHERE true;

-- ─── 6. Error Patterns & Exercises ──────────────────────────

-- Targeted exercises (depends on error_patterns)
DELETE FROM targeted_exercises WHERE true;

-- Error patterns
DELETE FROM error_patterns WHERE true;

-- Churn predictions
DELETE FROM churn_predictions WHERE true;

-- ─── 7. Activity & Events ──────────────────────────────────

-- Activity feed
DELETE FROM activity_feed WHERE true;

-- Event participants
DELETE FROM event_participants WHERE true;

-- ─── 8. Notifications ──────────────────────────────────────

DELETE FROM notifications WHERE true;

-- ─── 9. Assignments (trainer will recreate) ─────────────────

DELETE FROM assignments WHERE true;

-- ─── 10. Analytics & Logging ────────────────────────────────

DELETE FROM analytics_events WHERE true;

DELETE FROM audit_log WHERE true;

DELETE FROM ai_usage WHERE true;

-- ─── 11. Reset student activity fields ──────────────────────

UPDATE students SET
  xp_total = 0,
  current_streak = 0,
  longest_streak = 0,
  gamification_level = 1,
  last_active_at = NULL
WHERE deleted_at IS NULL;

-- ─── 12. Reset team XP ─────────────────────────────────────

UPDATE teams SET total_xp = 0;

-- ============================================================
-- COMPLETE: All student activity data has been reset.
-- Preserved: profiles, students, groups, curriculum, recordings,
--            vocabulary content, speaking topic banks, settings
-- ============================================================
