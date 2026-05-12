-- GOD COMM G7: atomic pin + system message RPC
CREATE OR REPLACE FUNCTION public.pin_message_with_system_note(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg       group_messages;
  v_caller    uuid := auth.uid();
  v_role      text;
  v_name      text;
  v_new_state boolean;
BEGIN
  -- Fetch the message
  SELECT * INTO v_msg FROM group_messages WHERE id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'message not found';
  END IF;

  -- Verify caller is trainer of this group OR admin
  SELECT role INTO v_role FROM profiles WHERE id = v_caller;
  IF v_role NOT IN ('trainer','admin') THEN
    RAISE EXCEPTION 'only trainers and admins can pin messages';
  END IF;
  IF v_role = 'trainer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM groups WHERE id = v_msg.group_id AND trainer_id = v_caller
    ) THEN
      RAISE EXCEPTION 'trainer does not own this group';
    END IF;
  END IF;

  v_new_state := NOT v_msg.is_pinned;

  -- Update the message pin state
  UPDATE group_messages
  SET
    is_pinned  = v_new_state,
    pinned_at  = CASE WHEN v_new_state THEN now() ELSE NULL END,
    pinned_by  = CASE WHEN v_new_state THEN v_caller ELSE NULL END
  WHERE id = p_message_id;

  -- Insert system message only when pinning (not when unpinning)
  IF v_new_state THEN
    SELECT COALESCE(first_name_ar || ' ' || COALESCE(last_name_ar,''), 'المدرب')
    INTO v_name
    FROM profiles WHERE id = v_caller;

    INSERT INTO group_messages
      (group_id, channel_id, sender_id, type, body, content)
    VALUES
      (v_msg.group_id, v_msg.channel_id, v_caller, 'system',
       v_name || ' ثبّت رسالة', v_name || ' ثبّت رسالة');
  END IF;
END;
$$;
