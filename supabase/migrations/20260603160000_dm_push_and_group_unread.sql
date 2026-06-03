-- DM push + in-app notifications via a trigger that calls send-push-notification
-- (deployed --no-verify-jwt) through pg_net. Plus a per-group unread RPC.

-- notification type for DMs (additive)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'direct_message';

-- per-group unread counts (vs the general-channel cursor, matching the unified stream)
CREATE OR REPLACE FUNCTION public.get_group_unread_counts()
RETURNS TABLE(group_id uuid, unread int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $fn$
  SELECT gr.id, (
    SELECT count(*)::int FROM group_messages m
    WHERE m.group_id = gr.id AND m.dm_thread_id IS NULL AND m.deleted_at IS NULL AND m.sender_id <> auth.uid()
      AND m.created_at > COALESCE((
        SELECT cur.last_read_at FROM channel_read_cursors cur
        JOIN group_channels gc ON gc.id = cur.channel_id
        WHERE gc.slug = 'general' AND gc.group_id = gr.id AND cur.user_id = auth.uid()), '-infinity'::timestamptz)
  )
  FROM groups gr WHERE public.is_in_group(gr.id)
$fn$;
GRANT EXECUTE ON FUNCTION public.get_group_unread_counts() TO authenticated;

-- DM notification trigger
CREATE OR REPLACE FUNCTION public.dm_notify_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE recipient uuid; sender_name text; preview text;
BEGIN
  IF NEW.dm_thread_id IS NULL THEN RETURN NEW; END IF;
  SELECT CASE WHEN user_lo = NEW.sender_id THEN user_hi ELSE user_lo END INTO recipient
    FROM dm_threads WHERE id = NEW.dm_thread_id;
  IF recipient IS NULL OR recipient = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  preview := CASE NEW.type
    WHEN 'voice' THEN '🎙️ رسالة صوتية'
    WHEN 'image' THEN '🖼️ صورة'
    WHEN 'file'  THEN '📎 ملف'
    ELSE left(COALESCE(NEW.body, NEW.content, ''), 140) END;
  PERFORM net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjU2MTgsImV4cCI6MjA4ODcwMTYxOH0.Lznjnw2Pmrr04tFjQD6hRfWp-12JlRagZaCmo59KG8A','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjU2MTgsImV4cCI6MjA4ODcwMTYxOH0.Lznjnw2Pmrr04tFjQD6hRfWp-12JlRagZaCmo59KG8A'),
    body := jsonb_build_object(
      'user_ids', jsonb_build_array(recipient),
      'title', COALESCE(NULLIF(sender_name,''), 'رسالة جديدة'),
      'body', preview,
      'url', '/chat/dm/' || NEW.dm_thread_id::text,
      'type', 'direct_message',
      'priority', 'high',
      'tag', 'dm-' || NEW.dm_thread_id::text,
      'data', jsonb_build_object('thread_id', NEW.dm_thread_id, 'message_id', NEW.id)
    )
  );
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_dm_notify ON group_messages;
CREATE TRIGGER trg_dm_notify AFTER INSERT ON group_messages FOR EACH ROW EXECUTE FUNCTION dm_notify_push();
NOTIFY pgrst, 'reload schema';
