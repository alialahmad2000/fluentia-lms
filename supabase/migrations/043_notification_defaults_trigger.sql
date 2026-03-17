-- Migration 043: Auto-populate notification defaults for new users (idempotent)

-- Trigger function to populate default notification preferences
CREATE OR REPLACE FUNCTION populate_notification_defaults()
RETURNS trigger AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, category, notification_type, enabled) VALUES
    -- المهام
    (NEW.id, 'tasks', 'assignment_new', true),
    (NEW.id, 'tasks', 'assignment_deadline', true),
    (NEW.id, 'tasks', 'assignment_graded', true),
    (NEW.id, 'tasks', 'weekly_tasks_ready', true),
    (NEW.id, 'tasks', 'weekly_tasks_remind', true),
    (NEW.id, 'tasks', 'weekly_tasks_urgent', true),
    -- الحضور
    (NEW.id, 'attendance', 'class_reminder', true),
    -- الإنجازات
    (NEW.id, 'achievements', 'achievement', true),
    (NEW.id, 'achievements', 'level_up', true),
    (NEW.id, 'achievements', 'streak_warning', true),
    (NEW.id, 'achievements', 'spelling_milestone', true),
    -- التواصل
    (NEW.id, 'communication', 'trainer_note', true),
    (NEW.id, 'communication', 'peer_recognition', true),
    (NEW.id, 'communication', 'team_update', true),
    -- المالية
    (NEW.id, 'financial', 'payment_reminder', true),
    -- الذكاء الاصطناعي
    (NEW.id, 'ai', 'smart_nudge', true),
    (NEW.id, 'ai', 'test_result', true),
    (NEW.id, 'ai', 'curriculum_progress', true),
    (NEW.id, 'ai', 'speaking_feedback', true),
    -- النظام
    (NEW.id, 'system', 'system', true)
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS populate_notifications_on_profile_create ON profiles;
CREATE TRIGGER populate_notifications_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION populate_notification_defaults();

-- Populate defaults for existing users who don't have preferences yet
INSERT INTO notification_preferences (user_id, category, notification_type, enabled)
SELECT p.id, v.category, v.notification_type, true
FROM profiles p
CROSS JOIN (VALUES
  ('tasks', 'assignment_new'),
  ('tasks', 'assignment_deadline'),
  ('tasks', 'assignment_graded'),
  ('tasks', 'weekly_tasks_ready'),
  ('tasks', 'weekly_tasks_remind'),
  ('tasks', 'weekly_tasks_urgent'),
  ('attendance', 'class_reminder'),
  ('achievements', 'achievement'),
  ('achievements', 'level_up'),
  ('achievements', 'streak_warning'),
  ('achievements', 'spelling_milestone'),
  ('communication', 'trainer_note'),
  ('communication', 'peer_recognition'),
  ('communication', 'team_update'),
  ('financial', 'payment_reminder'),
  ('ai', 'smart_nudge'),
  ('ai', 'test_result'),
  ('ai', 'curriculum_progress'),
  ('ai', 'speaking_feedback'),
  ('system', 'system')
) AS v(category, notification_type)
ON CONFLICT (user_id, notification_type) DO NOTHING;
