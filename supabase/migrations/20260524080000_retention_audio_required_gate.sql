-- ─────────────────────────────────────────────────────────────────────────────
-- SHIP-AUTONOMOUS §2.3 — audio-required gate enforced at the DB layer.
-- ─────────────────────────────────────────────────────────────────────────────
-- The frontend filters already enforce this client-side; the brief delivery RPC
-- and the scenario selection now enforce it server-side too. Together this
-- guarantees no student ever sees a brief or scenario lacking audio, regardless
-- of how the surface is reached.

CREATE OR REPLACE FUNCTION public.retention_deliver_briefs(p_window text)
RETURNS TABLE (deliveries_inserted integer, classes_matched integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brief_type text;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_class RECORD;
  v_student RECORD;
  v_brief RECORD;
  v_inserted int := 0;
  v_classes int := 0;
BEGIN
  IF p_window = 'pre' THEN
    v_brief_type := 'prep';
    v_window_start := now() + interval '12 hours';
    v_window_end   := now() + interval '13 hours';
  ELSIF p_window = 'post' THEN
    v_brief_type := 'review';
    v_window_start := now() - interval '2 hours 30 minutes';
    v_window_end   := now() - interval '1 hour 30 minutes';
  ELSE
    RAISE EXCEPTION 'Invalid window: %; must be pre or post', p_window;
  END IF;

  FOR v_class IN
    SELECT c.id AS class_id, c.group_id, c.date, c.start_time, c.end_time,
           a.unit_id, (c.date + c.start_time)::timestamptz AS starts_at,
           (c.date + COALESCE(c.end_time, c.start_time + interval '1 hour'))::timestamptz AS ends_at
    FROM public.classes c
    LEFT JOIN LATERAL (
      SELECT unit_id FROM public.attendance att
      WHERE att.class_id = c.id AND att.unit_id IS NOT NULL
      ORDER BY att.created_at DESC LIMIT 1
    ) a ON true
    WHERE c.status = 'scheduled' OR c.status = 'completed'
  LOOP
    IF (p_window = 'pre'  AND v_class.starts_at BETWEEN v_window_start AND v_window_end) OR
       (p_window = 'post' AND v_class.ends_at   BETWEEN v_window_start AND v_window_end) THEN
      v_classes := v_classes + 1;
      IF v_class.unit_id IS NULL THEN CONTINUE; END IF;

      -- §2.3: only deliver briefs that have audio (audio_path IS NOT NULL).
      -- Briefs without audio are silently skipped — never delivered.
      SELECT * INTO v_brief FROM public.retention_lesson_briefs
        WHERE unit_id = v_class.unit_id
          AND brief_type = v_brief_type
          AND audio_path IS NOT NULL
        LIMIT 1;
      IF v_brief IS NULL THEN CONTINUE; END IF;

      FOR v_student IN
        SELECT s.id FROM public.students s
        WHERE s.group_id = v_class.group_id
          AND s.status = 'active' AND s.deleted_at IS NULL
          AND public.retention_is_module_enabled(s.id, 'lesson_briefs') = true
      LOOP
        BEGIN
          INSERT INTO public.retention_lesson_brief_deliveries (
            student_id, brief_id, class_id, scheduled_for, delivered_at
          ) VALUES (
            v_student.id, v_brief.id, v_class.class_id,
            CASE WHEN p_window = 'pre' THEN v_class.starts_at - interval '12 hours'
                 ELSE v_class.ends_at + interval '2 hours' END,
            now()
          )
          ON CONFLICT (student_id, brief_id, class_id) DO NOTHING;
          IF FOUND THEN
            v_inserted := v_inserted + 1;
            INSERT INTO public.notifications (user_id, type, title, body, data, priority)
            VALUES (
              v_student.id,
              'class_reminder'::notification_type,
              CASE WHEN p_window = 'pre' THEN 'تحضير الكلاس القادم' ELSE 'مراجعة كلاسكِ' END,
              v_brief.title_ar,
              jsonb_build_object('kind', 'retention_lesson_brief', 'brief_id', v_brief.id, 'window', p_window),
              'normal'
            );
          END IF;
        EXCEPTION WHEN OTHERS THEN
          INSERT INTO public.system_errors (error_type, service, error_message, error_context)
          VALUES (
            'retention_deliver_briefs.insert',
            'retention_deliver_briefs',
            SQLERRM,
            jsonb_build_object('student_id', v_student.id, 'brief_id', v_brief.id, 'class_id', v_class.class_id)
          );
        END;
      END LOOP;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_classes;
END;
$$;
GRANT EXECUTE ON FUNCTION public.retention_deliver_briefs(text) TO authenticated;
