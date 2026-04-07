-- ============================================
-- PUSH SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_active
  ON push_subscriptions(user_id, is_active);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- EXTEND NOTIFICATIONS TABLE (add push tracking)
-- ============================================
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS pushed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS action_label TEXT,
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS source_announcement_id UUID,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add 'announcement' to notification_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'announcement'
    AND enumtypid = 'notification_type'::regtype
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'announcement';
  END IF;
END$$;

-- ============================================
-- ANNOUNCEMENTS (admin broadcasts)
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_admin TEXT,
  body_admin TEXT,
  title_trainer TEXT,
  body_trainer TEXT,
  title_student TEXT,
  body_student TEXT,
  title_default TEXT NOT NULL,
  body_default TEXT NOT NULL,
  target_roles TEXT[] NOT NULL DEFAULT ARRAY['student','trainer','admin'],
  target_user_ids UUID[],
  exclude_user_ids UUID[],
  send_push BOOLEAN NOT NULL DEFAULT TRUE,
  send_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  action_url TEXT,
  action_label TEXT,
  icon_url TEXT,
  image_url TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'announcement',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage announcements"
  ON announcements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- HELPER: Get unread count (or replace if exists)
-- ============================================
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = p_user_id
    AND read = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());
$$;

GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;

-- ============================================
-- RLS: allow service_role insert to notifications
-- (edge functions use service_role key)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Service role inserts notifications'
  ) THEN
    CREATE POLICY "Service role inserts notifications"
      ON notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END$$;
