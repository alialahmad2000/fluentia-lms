-- When the coach acts on a student, the signals engine's own pending rows for
-- that student are closed too.
--
-- Why: detect-student-signals re-raises the same alert every night and expires
-- it unworked after 7 days. That is how 2,740 rows became noise. Now that a
-- human is actually working these students, leaving the engine's queue to rot
-- in parallel would recreate the exact problem the coach was hired to end —
-- and would leave two contradictory answers to "has anyone contacted her?".
--
-- This is the one deliberate coupling between the lc_ world and the older
-- intervention engine. It is one-directional: the coach's work closes engine
-- rows, never the reverse.

CREATE OR REPLACE FUNCTION public.lc_close_engine_signals(p_student_id uuid, p_blocker text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE student_interventions
     SET status = 'acted',
         acted_at = now(),
         acted_by = auth.uid(),
         action_channel = 'in_app_message',
         blocker_type = p_blocker,
         acted_notes = coalesce(acted_notes, 'Closed by the learning coach acting on this student.')
   WHERE student_id = p_student_id
     AND status IN ('pending','snoozed');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.lc_close_engine_signals(uuid, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.lc_send_message(
  p_student_id uuid, p_template_code text, p_blocker text, p_note text DEFAULT NULL
) RETURNS lc_touchpoints
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_body text; v_thread uuid; v_silence int; r lc_touchpoints;
BEGIN
  PERFORM lc_guard();

  IF p_blocker IS NULL OR btrim(p_blocker) = '' THEN
    RAISE EXCEPTION 'blocker_type is required';
  END IF;
  IF p_blocker NOT IN ('motivation','platform_issue','schedule','personal','unknown') THEN
    RAISE EXCEPTION 'invalid blocker_type: %', p_blocker;
  END IF;

  v_body := lc_render_message(p_student_id, p_template_code);

  SELECT CASE WHEN lc_last_seen(p_student_id) IS NULL THEN NULL
              ELSE GREATEST(0, floor(extract(epoch FROM now() - lc_last_seen(p_student_id)) / 86400)::int)
         END INTO v_silence;

  v_thread := dm_get_or_create_thread(p_student_id);

  INSERT INTO group_messages (dm_thread_id, sender_id, body)
  VALUES (v_thread, auth.uid(), v_body);

  INSERT INTO lc_touchpoints (
    coach_id, student_id, action, template_code, rendered_body_ar,
    blocker_type, note_en, silence_days_at_time
  )
  VALUES (
    auth.uid(), p_student_id, 'message_sent', p_template_code, v_body,
    p_blocker, p_note, v_silence
  )
  RETURNING * INTO r;

  PERFORM lc_close_engine_signals(p_student_id, p_blocker);
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.lc_send_message(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_send_message(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.lc_log_touchpoint(
  p_student_id uuid, p_action text, p_blocker text, p_note text DEFAULT NULL
) RETURNS lc_touchpoints
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_silence int; r lc_touchpoints;
BEGIN
  PERFORM lc_guard();

  IF p_action NOT IN ('observation','escalated','no_action_needed') THEN
    RAISE EXCEPTION 'invalid action for a non-message touchpoint: %', p_action;
  END IF;
  IF p_blocker IS NULL OR p_blocker NOT IN ('motivation','platform_issue','schedule','personal','unknown') THEN
    RAISE EXCEPTION 'blocker_type is required';
  END IF;
  IF p_action = 'no_action_needed' AND coalesce(btrim(p_note),'') = '' THEN
    RAISE EXCEPTION 'a note is required when marking no action needed';
  END IF;

  SELECT CASE WHEN lc_last_seen(p_student_id) IS NULL THEN NULL
              ELSE GREATEST(0, floor(extract(epoch FROM now() - lc_last_seen(p_student_id)) / 86400)::int)
         END INTO v_silence;

  INSERT INTO lc_touchpoints (coach_id, student_id, action, blocker_type, note_en, silence_days_at_time)
  VALUES (auth.uid(), p_student_id, p_action, p_blocker, p_note, v_silence)
  RETURNING * INTO r;

  PERFORM lc_close_engine_signals(p_student_id, p_blocker);
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.lc_log_touchpoint(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_log_touchpoint(uuid, text, text, text) TO authenticated;
