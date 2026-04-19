-- ============================================================================
-- 148: Nabih AI Coach — helper RPCs
-- Tables + RLS came from migrations 139 + 141. This migration adds only RPCs.
-- nabih_messages.role values: 'trainer' | 'nabih' | 'system'
-- nabih_conversations: started_at, last_message_at, context_type, context_data, archived
-- ============================================================================

-- A. RPC: new_nabih_conversation — atomic create and return
CREATE OR REPLACE FUNCTION new_nabih_conversation(
  p_title text DEFAULT NULL,
  p_first_message text DEFAULT NULL,
  p_context_type text DEFAULT 'general'
)
RETURNS jsonb AS $$
DECLARE
  v_trainer_id uuid;
  v_conv_id uuid;
  v_role text;
  v_msg_id uuid;
BEGIN
  v_trainer_id := auth.uid();

  SELECT role INTO v_role FROM profiles WHERE id = v_trainer_id;
  IF v_role NOT IN ('trainer', 'admin') THEN
    RAISE EXCEPTION 'Only trainers can create Nabih conversations';
  END IF;

  INSERT INTO nabih_conversations (trainer_id, title, context_type, started_at, last_message_at)
  VALUES (
    v_trainer_id,
    COALESCE(p_title, 'محادثة جديدة'),
    COALESCE(p_context_type, 'general'),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_conv_id;

  IF p_first_message IS NOT NULL THEN
    INSERT INTO nabih_messages (conversation_id, role, content, created_at)
    VALUES (v_conv_id, 'trainer', p_first_message, NOW())
    RETURNING id INTO v_msg_id;
  END IF;

  RETURN jsonb_build_object(
    'conversation_id', v_conv_id,
    'first_message_id', v_msg_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION new_nabih_conversation(text, text, text) TO authenticated;

-- B. RPC: get_nabih_conversation_list — sidebar list
CREATE OR REPLACE FUNCTION get_nabih_conversation_list(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  title text,
  last_message_at timestamptz,
  started_at timestamptz,
  message_count bigint,
  preview text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.last_message_at,
    c.started_at,
    (SELECT COUNT(*) FROM nabih_messages m WHERE m.conversation_id = c.id),
    (SELECT SUBSTRING(m.content FROM 1 FOR 80)
     FROM nabih_messages m
     WHERE m.conversation_id = c.id
     ORDER BY m.created_at DESC LIMIT 1)
  FROM nabih_conversations c
  WHERE c.trainer_id = auth.uid()
    AND c.archived = false
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_nabih_conversation_list(integer) TO authenticated;

-- C. RPC: rename_nabih_conversation
CREATE OR REPLACE FUNCTION rename_nabih_conversation(
  p_conversation_id uuid,
  p_new_title text
)
RETURNS jsonb AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE nabih_conversations
  SET title = p_new_title
  WHERE id = p_conversation_id AND trainer_id = auth.uid();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Conversation not found or permission denied';
  END IF;

  RETURN jsonb_build_object('renamed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rename_nabih_conversation(uuid, text) TO authenticated;

-- D. RPC: delete_nabih_conversation (soft-archive)
CREATE OR REPLACE FUNCTION delete_nabih_conversation(p_conversation_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE nabih_conversations
  SET archived = true
  WHERE id = p_conversation_id AND trainer_id = auth.uid();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Conversation not found or permission denied';
  END IF;

  RETURN jsonb_build_object('deleted', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_nabih_conversation(uuid) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Migration 148 applied — Nabih helper RPCs ready';
END $$;
