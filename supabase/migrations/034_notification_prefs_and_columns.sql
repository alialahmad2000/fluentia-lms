-- 1. Add planned_date to weekly_tasks
ALTER TABLE weekly_tasks ADD COLUMN IF NOT EXISTS planned_date date;

-- 2. Add username to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- 3. Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  notification_type text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);
