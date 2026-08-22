-- ═══════════════════════════════════════════════════════════════════════════
-- The coach's student dossier — performance, the AI's own assessment, and the
-- conversation.
--
-- He was working from silence days and a ticket count. To actually help a
-- student he needs to know WHAT they are struggling with, WHAT the platform has
-- already told them about it, and WHAT has already been said between them.
--
-- All three exist and none of it was reaching him:
--   · student_curriculum_progress — 400 rows across 13 of the 14 active
--     students, 374 of them scored, broken down by section
--   · ai_feedback (jsonb on the same table) — 38 real evaluations. Critically
--     it carries ENGLISH fields (overall_comment_en, explanation_en, the
--     corrected text, per-skill scores), so the coach can read the academy's
--     own assessment of a student without a word of Arabic or a translator.
--   · group_messages / dm_threads — the conversation lc_send_message starts.
--
-- student_unit_skill_snapshots (0 rows) and students.ai_insight_cache (1 row)
-- are NOT used. Never build on an empty table.
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.lc_get_student(uuid);
CREATE FUNCTION public.lc_get_student(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_thread uuid;
BEGIN
  PERFORM lc_guard();

  -- The DM thread, if one exists. Not created here: this function is STABLE
  -- and read-only, and a thread should only exist once someone has spoken.
  SELECT t.id INTO v_thread
  FROM dm_threads t
  WHERE (t.user_lo = auth.uid() AND t.user_hi = p_student_id)
     OR (t.user_hi = auth.uid() AND t.user_lo = p_student_id);

  SELECT jsonb_build_object(
    'student', jsonb_build_object(
      'id', s.id,
      'full_name', p.full_name,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'gender', s.gender,
      'academic_level', s.academic_level,
      'package', s.package::text,
      'track', s.track::text,
      'status', s.status::text,
      'enrollment_date', s.enrollment_date,
      'days_enrolled', CASE WHEN s.enrollment_date IS NULL THEN NULL
                            ELSE (CURRENT_DATE - s.enrollment_date) END,
      'goals', s.goals,
      'interests', s.interests,
      'group_name', g.name,
      'group_code', g.code,
      'trainer_name', tp.full_name,
      'last_seen_at', lc_last_seen(s.id),
      'silence_days', CASE WHEN lc_last_seen(s.id) IS NULL THEN NULL
        ELSE GREATEST(0, floor(extract(epoch FROM now() - lc_last_seen(s.id)) / 86400)::int) END,
      'xp_total', s.xp_total,
      'current_streak', s.current_streak
    ),

    -- ── how they are actually doing ──────────────────────────────────────
    -- Per skill, so "her reading is 86 and her grammar is 62" is the first
    -- thing he sees rather than something he has to work out.
    'by_section', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'attempts')::int DESC)
      FROM (
        SELECT jsonb_build_object(
                 'section_type', c.section_type,
                 'attempts', count(*),
                 'avg_score', round(avg(c.score)::numeric, 0),
                 'best_score', round(max(c.score)::numeric, 0),
                 'last_score', round((array_agg(c.score ORDER BY c.completed_at DESC NULLS LAST))[1]::numeric, 0),
                 'last_at', max(c.completed_at)
               ) AS x
        FROM student_curriculum_progress c
        WHERE c.student_id = s.id AND c.score IS NOT NULL
        GROUP BY c.section_type
      ) q
    ), '[]'::jsonb),

    'recent_work', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'section_type', c.section_type,
               'score', round(c.score::numeric, 0),
               'status', c.status,
               'attempt_number', c.attempt_number,
               'completed_at', c.completed_at,
               'unit_number', u.unit_number,
               'unit_title', coalesce(u.theme_en, u.theme_ar)
             ) ORDER BY c.completed_at DESC NULLS LAST)
      FROM (
        SELECT * FROM student_curriculum_progress
        WHERE student_id = s.id AND completed_at IS NOT NULL
        ORDER BY completed_at DESC LIMIT 12
      ) c
      LEFT JOIN curriculum_units u ON u.id = c.unit_id
    ), '[]'::jsonb),

    'units', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'unit_number', u.unit_number,
               'unit_title', coalesce(u.theme_en, u.theme_ar),
               'percentage', up.percentage,
               'updated_at', up.updated_at
             ) ORDER BY u.unit_number)
      FROM unit_progress up JOIN curriculum_units u ON u.id = up.unit_id
      WHERE up.student_id = s.id AND up.percentage > 0
    ), '[]'::jsonb),

    -- ── what the platform's AI has already told them ─────────────────────
    -- Read in English by the coach, delivered in Arabic to the student. He
    -- can open a conversation already knowing what she was told to work on.
    'ai_feedback', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'section_type', c.section_type,
               'at', c.completed_at,
               'unit_number', u.unit_number,
               'unit_title', coalesce(u.theme_en, u.theme_ar),
               'overall_score', c.ai_feedback->'overall_score',
               'grammar_score', c.ai_feedback->'grammar_score',
               'vocabulary_score', c.ai_feedback->'vocabulary_score',
               'fluency_score', c.ai_feedback->'fluency_score',
               'structure_score', c.ai_feedback->'structure_score',
               'comment_en', c.ai_feedback->>'overall_comment_en',
               'corrected_text', c.ai_feedback->>'corrected_text',
               'corrections', (
                 SELECT jsonb_agg(jsonb_build_object(
                          'error', e->>'error', 'correction', e->>'correction', 'rule', e->>'rule'))
                 FROM jsonb_array_elements(coalesce(c.ai_feedback->'grammar_errors', '[]'::jsonb)) e
               ),
               'model_sentences', c.ai_feedback->'model_sentences'
             ) ORDER BY c.completed_at DESC NULLS LAST)
      FROM (
        SELECT * FROM student_curriculum_progress
        WHERE student_id = s.id
          AND ai_feedback IS NOT NULL AND ai_feedback::text <> 'null'
        ORDER BY completed_at DESC NULLS LAST LIMIT 5
      ) c
      LEFT JOIN curriculum_units u ON u.id = c.unit_id
    ), '[]'::jsonb),

    -- Work the platform accepted but never graded. A student waiting on
    -- feedback that never arrived looks identical to a student who lost
    -- interest — except this is our fault, and it is fixable.
    'awaiting_feedback', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'section_type', c.section_type,
               'submitted_at', c.completed_at,
               'evaluation_status', c.evaluation_status,
               'attempts', c.evaluation_attempts
             ) ORDER BY c.completed_at DESC)
      FROM student_curriculum_progress c
      WHERE c.student_id = s.id
        AND c.evaluation_status IN ('pending','failed','escalated','failed_manual')
    ), '[]'::jsonb),

    -- ── the conversation ─────────────────────────────────────────────────
    'conversation', jsonb_build_object(
      'thread_id', v_thread,
      'messages', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', m.id,
                 'body', coalesce(m.body, m.content),
                 'type', m.type::text,
                 'created_at', m.created_at,
                 'from_student', m.sender_id = p_student_id,
                 'sender_name', sp.full_name,
                 'read_at', NULL
               ) ORDER BY m.created_at)
        FROM (
          SELECT * FROM group_messages
          WHERE dm_thread_id = v_thread AND deleted_at IS NULL
          ORDER BY created_at DESC LIMIT 40
        ) m
        LEFT JOIN profiles sp ON sp.id = m.sender_id
      ), '[]'::jsonb),
      -- Anything the student sent that arrived after the coach's last message
      -- is unanswered. This is the number that should pull him back in.
      'unanswered_from_student', coalesce((
        SELECT count(*)::int FROM group_messages m
        WHERE m.dm_thread_id = v_thread AND m.deleted_at IS NULL
          AND m.sender_id = p_student_id
          AND m.created_at > coalesce((
            SELECT max(m2.created_at) FROM group_messages m2
            WHERE m2.dm_thread_id = v_thread AND m2.sender_id <> p_student_id
          ), 'epoch'::timestamptz)
      ), 0)
    ),

    'touchpoints', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', t.id, 'created_at', t.created_at, 'action', t.action,
               'template_code', t.template_code, 'rendered_body_ar', t.rendered_body_ar,
               'blocker_type', t.blocker_type, 'note_en', t.note_en,
               'silence_days_at_time', t.silence_days_at_time,
               'coach_name', cp.full_name,
               'situation_en', tpl.situation_en
             ) ORDER BY t.created_at DESC)
      FROM lc_touchpoints t
      LEFT JOIN profiles cp ON cp.id = t.coach_id
      LEFT JOIN lc_message_templates tpl ON tpl.code = t.template_code
      WHERE t.student_id = s.id
    ), '[]'::jsonb),

    'activity_30d', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'date', d.activity_date,
               'learning_seconds', d.learning_seconds,
               'xp_earned', d.xp_earned,
               'sections_completed', d.sections_completed
             ) ORDER BY d.activity_date)
      FROM student_daily_activity d
      WHERE d.student_id = s.id AND d.activity_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 29
    ), '[]'::jsonb),

    'help_requests', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', h.id, 'created_at', h.created_at, 'status', h.status,
               'section_type', h.section_type,
               'unit_title', coalesce(u.theme_en, u.theme_ar), 'unit_number', u.unit_number
             ) ORDER BY h.created_at DESC)
      FROM help_requests h LEFT JOIN curriculum_units u ON u.id = h.unit_id
      WHERE h.student_id = s.id AND coalesce(h.status,'open') <> 'resolved'
    ), '[]'::jsonb),

    'bug_reports', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', b.id, 'created_at', b.created_at, 'status', b.status,
               'description', b.description, 'page_url', b.page_url,
               'reporter_status', b.reporter_status
             ) ORDER BY b.created_at DESC)
      FROM bug_reports b
      WHERE b.reporter_id = s.id AND b.status <> 'resolved'
    ), '[]'::jsonb),

    'escalations', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', e.id, 'created_at', e.created_at, 'reason', e.reason,
               'body_en', e.body_en, 'status', e.status
             ) ORDER BY e.created_at DESC)
      FROM lc_escalations e WHERE e.student_id = s.id
    ), '[]'::jsonb)
  )
  INTO v
  FROM students s
  JOIN profiles p ON p.id = s.id
  LEFT JOIN groups g ON g.id = s.group_id
  LEFT JOIN profiles tp ON tp.id = coalesce(s.assigned_trainer_id, g.trainer_id)
  WHERE s.id = p_student_id AND s.deleted_at IS NULL;

  IF v IS NULL THEN RAISE EXCEPTION 'student not found'; END IF;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.lc_get_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_get_student(uuid) TO authenticated;

-- ── the radar needs the unanswered count too ─────────────────────────────
-- A student who wrote back and got no reply is the most urgent thing on the
-- screen, and it was invisible.

CREATE OR REPLACE FUNCTION public.lc_unanswered_count(p_student_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(count(*)::int, 0)
  FROM group_messages m
  JOIN dm_threads t ON t.id = m.dm_thread_id
  WHERE m.deleted_at IS NULL
    AND m.sender_id = p_student_id
    AND ((t.user_lo = auth.uid() AND t.user_hi = p_student_id)
      OR (t.user_hi = auth.uid() AND t.user_lo = p_student_id))
    AND m.created_at > coalesce((
      SELECT max(m2.created_at) FROM group_messages m2
      WHERE m2.dm_thread_id = t.id AND m2.sender_id <> p_student_id
    ), 'epoch'::timestamptz);
$$;

REVOKE ALL ON FUNCTION public.lc_unanswered_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_unanswered_count(uuid) TO authenticated;
