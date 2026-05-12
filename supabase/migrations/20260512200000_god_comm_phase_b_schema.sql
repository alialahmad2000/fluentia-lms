-- GOD COMM Phase B: Schema, RLS, Indexes, Realtime, Seed Channels
-- Date: 2026-05-12
-- Decision: DRIFT REPAIR — 153 live group_messages rows preserved intact
-- Group membership pattern confirmed: students.group_id (NOT profiles.group_id)
-- NOTE: tables created in dependency order; functions placed AFTER their referenced tables

-- ── 1. Extension ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 2. group_channels (new table — must exist before any FK or function) ──────
CREATE TABLE IF NOT EXISTS group_channels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  label_ar        text NOT NULL,
  icon            text,
  position        integer NOT NULL DEFAULT 0,
  is_announcement boolean NOT NULL DEFAULT false,
  is_archived     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, slug)
);

-- ── 3. Alter group_messages: add missing columns ──────────────────────────────
-- DRIFT REPAIR: existing `content` and `channel` enum kept for backward compat.
-- New `body` used by chat UI; `channel_id` FK replaces enum-based channel routing.
ALTER TABLE group_messages
  ADD COLUMN IF NOT EXISTS channel_id            uuid REFERENCES group_channels(id),
  ADD COLUMN IF NOT EXISTS body                  text,
  ADD COLUMN IF NOT EXISTS file_name             text,
  ADD COLUMN IF NOT EXISTS file_size             bigint,
  ADD COLUMN IF NOT EXISTS file_mime             text,
  ADD COLUMN IF NOT EXISTS voice_duration_ms     integer,
  ADD COLUMN IF NOT EXISTS voice_waveform        jsonb,
  ADD COLUMN IF NOT EXISTS voice_transcript      text,
  ADD COLUMN IF NOT EXISTS voice_transcript_lang text,
  ADD COLUMN IF NOT EXISTS image_url             text,
  ADD COLUMN IF NOT EXISTS image_width           integer,
  ADD COLUMN IF NOT EXISTS image_height          integer,
  ADD COLUMN IF NOT EXISTS link_url              text,
  ADD COLUMN IF NOT EXISTS link_title            text,
  ADD COLUMN IF NOT EXISTS link_description      text,
  ADD COLUMN IF NOT EXISTS link_image_url        text,
  ADD COLUMN IF NOT EXISTS link_domain           text,
  ADD COLUMN IF NOT EXISTS mentions              uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_edited             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at             timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_at             timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by             uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS deleted_at            timestamptz;

-- ── 4. message_reads (new table) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reads (
  message_id  uuid NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- ── 5. channel_read_cursors (new table) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_read_cursors (
  channel_id           uuid NOT NULL REFERENCES group_channels(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_message_id uuid REFERENCES group_messages(id),
  last_read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

-- ── 6. is_in_group helper ─────────────────────────────────────────────────────
-- Adapted for actual schema: students.group_id, groups.trainer_id = auth.uid()
CREATE OR REPLACE FUNCTION public.is_in_group(target_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM students WHERE id = auth.uid() AND group_id = target_group_id
  )
  OR EXISTS (
    SELECT 1 FROM groups WHERE id = target_group_id AND trainer_id = auth.uid()
  );
$$;

-- ── 7. get_chat_unread_total RPC ──────────────────────────────────────────────
-- Placed AFTER group_channels and channel_read_cursors tables exist.
CREATE OR REPLACE FUNCTION public.get_chat_unread_total()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread), 0)::integer FROM (
    SELECT (
      SELECT COUNT(*) FROM group_messages m
      WHERE m.channel_id = c.id
        AND m.deleted_at IS NULL
        AND m.created_at > COALESCE(
          (SELECT last_read_at FROM channel_read_cursors
           WHERE channel_id = c.id AND user_id = auth.uid()),
          '-infinity'::timestamptz
        )
        AND m.sender_id <> auth.uid()
    ) AS unread
    FROM group_channels c
    WHERE is_in_group(c.group_id)
  ) sub;
$$;

-- ── 8. message_reactions constraints (0 rows, safe to add) ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reactions_unique' AND conrelid = 'message_reactions'::regclass
  ) THEN
    ALTER TABLE message_reactions ADD CONSTRAINT reactions_unique UNIQUE (message_id, user_id, emoji);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reactions_emoji_check' AND conrelid = 'message_reactions'::regclass
  ) THEN
    ALTER TABLE message_reactions ADD CONSTRAINT reactions_emoji_check
      CHECK (emoji IN ('👍','🔥','❤️','😂','👏'));
  END IF;
END $$;

-- ── 9. Extend notification_type enum with chat-specific kinds ─────────────────
DO $$
BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_mention';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_reply';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'channel_announcement';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'voice_note_received';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reaction_received';
END $$;

-- Add link column to notifications (chat uses this; legacy uses action_url)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS link text;

-- ── 10. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gm_channel_created
  ON group_messages (channel_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gm_group_created
  ON group_messages (group_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gm_sender
  ON group_messages (sender_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gm_reply
  ON group_messages (reply_to) WHERE reply_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gm_pinned
  ON group_messages (channel_id) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_gm_body_trgm
  ON group_messages USING gin (body gin_trgm_ops)
  WHERE deleted_at IS NULL AND body IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reactions_message
  ON message_reactions (message_id);

CREATE INDEX IF NOT EXISTS idx_reads_user
  ON message_reads (user_id, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_channels_group
  ON group_channels (group_id, position);

CREATE INDEX IF NOT EXISTS idx_cursors_user
  ON channel_read_cursors (user_id);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_push_user_active
  ON push_subscriptions (user_id)
  WHERE is_active = true;

-- ── 11. RLS on new tables ─────────────────────────────────────────────────────
ALTER TABLE group_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_read_cursors ENABLE ROW LEVEL SECURITY;

-- group_channels policies
CREATE POLICY "channels_select_in_group" ON group_channels
  FOR SELECT USING (is_in_group(group_id));
CREATE POLICY "channels_admin_write" ON group_channels
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "channels_trainer_write" ON group_channels
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM groups WHERE id = group_id AND trainer_id = auth.uid())
  );
CREATE POLICY "channels_service_role" ON group_channels
  FOR ALL USING (auth.role() = 'service_role');

-- message_reads policies
CREATE POLICY "reads_self_only" ON message_reads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- channel_read_cursors policies
CREATE POLICY "cursors_self_only" ON channel_read_cursors
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Announcements-only restriction: RESTRICTIVE (AND'd with permissive policies)
-- Students cannot post to is_announcement=true channels
CREATE POLICY "announcements_restrict_students" ON group_messages
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    channel_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM group_channels c
      WHERE c.id = channel_id AND c.is_announcement = true
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer','admin')
  );

-- ── 12. Seed 9 channels for all 8 existing groups ────────────────────────────
DO $$
DECLARE g RECORD;
BEGIN
  FOR g IN SELECT id FROM groups LOOP
    INSERT INTO group_channels (group_id, slug, label_ar, icon, position, is_announcement) VALUES
      (g.id, 'announcements', 'الإعلانات',      'megaphone',   0, true),
      (g.id, 'general',       'عام',             'hash',         1, false),
      (g.id, 'class_summary', 'ملخصات الحصص',   'book-open',    2, false),
      (g.id, 'reading',       'قراءة',           'book',         3, false),
      (g.id, 'speaking',      'محادثة',          'mic',          4, false),
      (g.id, 'listening',     'استماع',          'headphones',   5, false),
      (g.id, 'writing',       'كتابة',           'pen-line',     6, false),
      (g.id, 'vocabulary',    'مفردات',          'library',      7, false),
      (g.id, 'grammar',       'قواعد',           'spell-check',  8, false)
    ON CONFLICT (group_id, slug) DO NOTHING;
  END LOOP;
END $$;

-- ── 13. Backfill channel_id from existing channel enum (153 rows) ─────────────
UPDATE group_messages gm
SET channel_id = gc.id
FROM group_channels gc
WHERE gc.group_id = gm.group_id
  AND gc.slug    = gm.channel::text
  AND gm.channel_id IS NULL;

-- ── 14. Add chat tables to realtime publication ───────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_read_cursors;
