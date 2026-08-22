-- A student who wrote back and got no reply is the most urgent thing on the
-- radar, and it was invisible: the console could start a conversation and then
-- never show that one had continued.

-- DROP first: the return type gains columns, and CREATE OR REPLACE cannot
-- change a function's OUT parameters.
DROP FUNCTION IF EXISTS public.lc_get_radar();
CREATE FUNCTION public.lc_get_radar()
RETURNS TABLE (
  student_id            uuid,
  full_name             text,
  display_name          text,
  avatar_url            text,
  gender                text,
  group_name            text,
  group_code            text,
  academic_level        integer,
  package               text,
  enrollment_date       date,
  last_seen_at          timestamptz,
  silence_days          integer,
  active_days_last_14   integer,
  xp_last_14            integer,
  open_issues           integer,
  last_touchpoint_at    timestamptz,
  days_since_touchpoint integer,
  last_blocker          text,
  last_action           text,
  last_situation_en     text,
  risk_band             text,
  pending_signals       integer,
  unanswered            integer,
  weakest_section       text,
  weakest_score         integer,
  activity_14           jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM lc_guard();

  RETURN QUERY
  WITH base AS (
    SELECT s.id AS sid, lc_last_seen(s.id) AS ls
    FROM students s WHERE s.deleted_at IS NULL AND s.status = 'active'
  ),
  last_tp AS (
    SELECT DISTINCT ON (t.student_id)
      t.student_id, t.created_at, t.blocker_type, t.action, tpl.situation_en
    FROM lc_touchpoints t
    LEFT JOIN lc_message_templates tpl ON tpl.code = t.template_code
    ORDER BY t.student_id, t.created_at DESC
  ),
  weakest AS (
    -- The skill he should open the conversation about. Averaged over at least
    -- two attempts so one bad day does not define a student.
    SELECT DISTINCT ON (c.student_id)
      c.student_id, c.section_type, round(avg(c.score)::numeric, 0)::int AS avg_score
    FROM student_curriculum_progress c
    WHERE c.score IS NOT NULL
    GROUP BY c.student_id, c.section_type
    HAVING count(*) >= 2
    ORDER BY c.student_id, avg(c.score) ASC
  )
  SELECT
    s.id, p.full_name, p.display_name, p.avatar_url, s.gender,
    g.name, g.code, s.academic_level, s.package::text, s.enrollment_date,
    b.ls,
    CASE WHEN b.ls IS NULL THEN NULL
         ELSE GREATEST(0, floor(extract(epoch FROM now() - b.ls) / 86400)::int) END,
    (SELECT count(*)::int FROM student_daily_activity d
      WHERE d.student_id = s.id
        AND d.activity_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 13
        AND d.learning_seconds > 0),
    coalesce((SELECT sum(d.xp_earned)::int FROM student_daily_activity d
      WHERE d.student_id = s.id
        AND d.activity_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 13), 0),
    (SELECT count(*)::int FROM help_requests h
      WHERE h.student_id = s.id AND coalesce(h.status,'open') <> 'resolved')
    + (SELECT count(*)::int FROM bug_reports br
      WHERE br.reporter_id = s.id AND br.status <> 'resolved'),
    lt.created_at,
    CASE WHEN lt.created_at IS NULL THEN NULL
         ELSE floor(extract(epoch FROM now() - lt.created_at) / 86400)::int END,
    lt.blocker_type, lt.action, lt.situation_en,
    CASE
      WHEN b.ls IS NULL THEN 'critical'
      WHEN floor(extract(epoch FROM now() - b.ls) / 86400)::int >= 14 THEN 'critical'
      WHEN floor(extract(epoch FROM now() - b.ls) / 86400)::int >= 6  THEN 'at_risk'
      WHEN floor(extract(epoch FROM now() - b.ls) / 86400)::int >= 3  THEN 'watch'
      ELSE 'ok'
    END,
    (SELECT count(*)::int FROM student_interventions i
      WHERE i.student_id = s.id AND i.status = 'pending'),
    lc_unanswered_count(s.id),
    w.section_type,
    w.avg_score,
    coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d.activity_date, 'seconds', d.learning_seconds)
             ORDER BY d.activity_date)
      FROM student_daily_activity d
      WHERE d.student_id = s.id
        AND d.activity_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 13
    ), '[]'::jsonb)
  FROM students s
  JOIN profiles p ON p.id = s.id
  JOIN base b ON b.sid = s.id
  LEFT JOIN groups g ON g.id = s.group_id
  LEFT JOIN last_tp lt ON lt.student_id = s.id
  LEFT JOIN weakest w ON w.student_id = s.id
  -- A reply waiting for an answer outranks everything else.
  ORDER BY lc_unanswered_count(s.id) DESC, b.ls ASC NULLS FIRST;
END $$;

REVOKE ALL ON FUNCTION public.lc_get_radar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_get_radar() TO authenticated;
