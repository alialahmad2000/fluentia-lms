-- GOD COMM Phase K: chat_search RPC
-- Depends on Phase B migration (group_messages, group_channels, is_in_group)
CREATE OR REPLACE FUNCTION public.chat_search(
  p_group_id   uuid,
  p_query      text DEFAULT NULL,
  p_channel_id uuid DEFAULT NULL,
  p_sender_id  uuid DEFAULT NULL,
  p_from_date  timestamptz DEFAULT NULL,
  p_to_date    timestamptz DEFAULT NULL,
  p_limit      int DEFAULT 50
)
RETURNS TABLE (
  id uuid, group_id uuid, channel_id uuid, sender_id uuid,
  type text, body text, content text, created_at timestamptz,
  channel_slug text, channel_label text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    m.id, m.group_id, m.channel_id, m.sender_id,
    m.type::text, m.body, m.content, m.created_at,
    c.slug AS channel_slug, c.label_ar AS channel_label
  FROM group_messages m
  JOIN group_channels c ON c.id = m.channel_id
  WHERE is_in_group(m.group_id)
    AND m.group_id = p_group_id
    AND m.deleted_at IS NULL
    AND (p_channel_id IS NULL OR m.channel_id = p_channel_id)
    AND (p_sender_id  IS NULL OR m.sender_id  = p_sender_id)
    AND (p_from_date  IS NULL OR m.created_at >= p_from_date)
    AND (p_to_date    IS NULL OR m.created_at <= p_to_date)
    AND (
      p_query IS NULL OR p_query = ''
      OR m.body  ILIKE '%' || p_query || '%'
      OR m.content ILIKE '%' || p_query || '%'
      OR m.file_name ILIKE '%' || p_query || '%'
      OR m.link_title ILIKE '%' || p_query || '%'
      OR m.voice_transcript ILIKE '%' || p_query || '%'
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;
