-- GOD COMM Phase R3: server-side lens RPCs for unified message stream

-- ── get_group_messages: paginated with lens filter ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_group_messages(
  p_group_id  uuid,
  p_lens      text    DEFAULT 'all',
  p_before    timestamptz DEFAULT NULL,
  p_limit     int     DEFAULT 60
)
RETURNS SETOF group_messages
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.*
  FROM group_messages m
  WHERE public.is_in_group(m.group_id)
    AND m.group_id  = p_group_id
    AND m.deleted_at IS NULL
    AND (p_before IS NULL OR m.created_at < p_before)
    AND (
      p_lens = 'all'

      OR (p_lens = 'voice'     AND m.type = 'voice')

      OR (p_lens = 'files'     AND m.type IN ('file','image'))

      OR (p_lens = 'important' AND (
            m.type = 'announcement'
            OR m.is_pinned = true
            OR (
              SELECT COUNT(*) FROM message_reactions r WHERE r.message_id = m.id
            ) >= 3
          ))

      OR (p_lens = 'questions' AND (
            m.body    ILIKE '%?%' OR m.body    ILIKE '%؟%' OR
            m.content ILIKE '%?%' OR m.content ILIKE '%؟%'
          ))

      OR (p_lens = 'mentions'  AND auth.uid() = ANY(m.mentions))
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;

-- ── get_group_lens_counts: count per lens for last 7 days ─────────────────────
CREATE OR REPLACE FUNCTION public.get_group_lens_counts(p_group_id uuid)
RETURNS TABLE(
  cnt_all       bigint,
  cnt_important bigint,
  cnt_voice     bigint,
  cnt_files     bigint,
  cnt_mentions  bigint,
  cnt_questions bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE m.deleted_at IS NULL) AS cnt_all,
    COUNT(*) FILTER (
      WHERE m.deleted_at IS NULL AND (
        m.type = 'announcement' OR m.is_pinned = true OR
        (SELECT COUNT(*) FROM message_reactions r WHERE r.message_id = m.id) >= 3
      )
    ) AS cnt_important,
    COUNT(*) FILTER (WHERE m.deleted_at IS NULL AND m.type = 'voice')             AS cnt_voice,
    COUNT(*) FILTER (WHERE m.deleted_at IS NULL AND m.type IN ('file','image'))   AS cnt_files,
    COUNT(*) FILTER (WHERE m.deleted_at IS NULL AND auth.uid() = ANY(m.mentions)) AS cnt_mentions,
    COUNT(*) FILTER (
      WHERE m.deleted_at IS NULL AND (
        m.body ILIKE '%?%' OR m.body ILIKE '%؟%' OR
        m.content ILIKE '%?%' OR m.content ILIKE '%؟%'
      )
    ) AS cnt_questions
  FROM group_messages m
  WHERE m.group_id = p_group_id
    AND m.created_at >= NOW() - INTERVAL '7 days'
    AND public.is_in_group(m.group_id);
$$;
