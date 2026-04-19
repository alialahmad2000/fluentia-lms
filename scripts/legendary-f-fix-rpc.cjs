const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected');

  // Fix the attendance part of the aggregator — use created_at instead of date, join with classes for date
  const fixSQL = `
CREATE OR REPLACE FUNCTION public.build_progress_report_data(
  p_student_id  uuid,
  p_period_start date,
  p_period_end   date
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_result jsonb;
  v_prev_start date := p_period_start - (p_period_end - p_period_start);
  v_prev_end   date := p_period_start - 1;
  v_student    record;
  v_xp_now     int;
  v_xp_prev    int;
  v_xp_total   int;
  v_conf       text;
  v_streak_cur int;
  v_streak_lng int;
  v_skills     record;
  v_skill_gain record;
  v_vocab      record;
  v_vocab_rev  record;
  v_units      record;
  v_attend     record;
BEGIN
  SELECT
    p.full_name, p.display_name,
    s.academic_level, s.package, s.group_id,
    g.name AS group_name, g.trainer_id,
    tp.full_name AS trainer_name
  INTO v_student
  FROM students s
  JOIN profiles p ON p.id = s.id
  LEFT JOIN groups g ON g.id = s.group_id
  LEFT JOIN profiles tp ON tp.id = g.trainer_id
  WHERE s.id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'student_not_found');
  END IF;

  SELECT COALESCE(SUM(xp_delta), 0)::int INTO v_xp_now
  FROM unified_activity_log
  WHERE student_id = p_student_id
    AND (occurred_at AT TIME ZONE 'Asia/Riyadh')::date BETWEEN p_period_start AND p_period_end;

  SELECT COALESCE(SUM(xp_delta), 0)::int INTO v_xp_prev
  FROM unified_activity_log
  WHERE student_id = p_student_id
    AND (occurred_at AT TIME ZONE 'Asia/Riyadh')::date BETWEEN v_prev_start AND v_prev_end;

  SELECT COALESCE(SUM(xp_delta), 0)::int INTO v_xp_total
  FROM unified_activity_log WHERE student_id = p_student_id;

  SELECT COALESCE(xa.confidence_band, 'high') INTO v_conf
  FROM student_xp_audit xa WHERE xa.student_id = p_student_id;
  IF NOT FOUND THEN v_conf := 'high'; END IF;

  SELECT COALESCE(s.current_streak, 0), COALESCE(s.longest_streak, 0)
  INTO v_streak_cur, v_streak_lng
  FROM students s WHERE s.id = p_student_id;

  SELECT vocabulary, reading, writing, speaking, listening, grammar
  INTO v_skills FROM student_skill_state WHERE student_id = p_student_id;

  SELECT
    COALESCE(SUM((skill_impact->>'vocabulary')::int), 0) AS vocabulary,
    COALESCE(SUM((skill_impact->>'reading')::int), 0) AS reading,
    COALESCE(SUM((skill_impact->>'writing')::int), 0) AS writing,
    COALESCE(SUM((skill_impact->>'speaking')::int), 0) AS speaking,
    COALESCE(SUM((skill_impact->>'listening')::int), 0) AS listening,
    COALESCE(SUM((skill_impact->>'grammar')::int), 0) AS grammar
  INTO v_skill_gain FROM unified_activity_log
  WHERE student_id = p_student_id
    AND (occurred_at AT TIME ZONE 'Asia/Riyadh')::date BETWEEN p_period_start AND p_period_end;

  SELECT
    COUNT(*) FILTER (WHERE created_at::date BETWEEN p_period_start AND p_period_end)::int AS new_added,
    COUNT(*) FILTER (WHERE mastered_at IS NOT NULL AND mastered_at::date BETWEEN p_period_start AND p_period_end)::int AS mastered,
    COUNT(*) FILTER (WHERE mastered_at IS NULL)::int AS queue_size
  INTO v_vocab FROM student_saved_words WHERE student_id = p_student_id;

  SELECT
    COUNT(*)::int AS sessions,
    CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE (metadata->>'quality')::int >= 3) / NULLIF(COUNT(*), 0))::int
    END AS accuracy_pct
  INTO v_vocab_rev FROM unified_activity_log
  WHERE student_id = p_student_id AND event_type = 'vocab_reviewed'
    AND (occurred_at AT TIME ZONE 'Asia/Riyadh')::date BETWEEN p_period_start AND p_period_end;

  SELECT
    COUNT(*)::int AS completed,
    ARRAY_AGG(DISTINCT (metadata->>'unit_title')) FILTER (WHERE metadata->>'unit_title' IS NOT NULL) AS names
  INTO v_units FROM unified_activity_log
  WHERE student_id = p_student_id AND event_type = 'unit_completed'
    AND (occurred_at AT TIME ZONE 'Asia/Riyadh')::date BETWEEN p_period_start AND p_period_end;

  -- Attendance: join with classes for date, use created_at as fallback
  SELECT
    COUNT(*)::int AS scheduled,
    COUNT(*) FILTER (WHERE att.status = 'present')::int AS attended,
    CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE att.status = 'present') / COUNT(*))::int
    END AS rate_pct
  INTO v_attend
  FROM attendance att
  LEFT JOIN classes c ON c.id = att.class_id
  WHERE att.student_id = p_student_id
    AND COALESCE(c.date, att.created_at::date) BETWEEN p_period_start AND p_period_end;

  v_result := jsonb_build_object(
    'student', jsonb_build_object(
      'name', COALESCE(v_student.display_name, v_student.full_name),
      'level', v_student.academic_level,
      'package', v_student.package,
      'group', v_student.group_name
    ),
    'trainer', jsonb_build_object('name', v_student.trainer_name),
    'period', jsonb_build_object('start', p_period_start, 'end', p_period_end, 'days', (p_period_end - p_period_start + 1)),
    'xp', jsonb_build_object(
      'total_all_time', v_xp_total, 'period_earned', v_xp_now,
      'previous_period_earned', v_xp_prev,
      'change_pct', CASE WHEN v_xp_prev = 0 THEN NULL ELSE ROUND(100.0 * (v_xp_now - v_xp_prev) / NULLIF(v_xp_prev, 0))::int END,
      'confidence_band', v_conf
    ),
    'streak', jsonb_build_object('current', COALESCE(v_streak_cur, 0), 'longest', COALESCE(v_streak_lng, 0)),
    'skills', jsonb_build_object(
      'current', CASE WHEN v_skills IS NULL THEN NULL ELSE jsonb_build_object(
        'vocabulary', COALESCE(v_skills.vocabulary, 0), 'reading', COALESCE(v_skills.reading, 0),
        'writing', COALESCE(v_skills.writing, 0), 'speaking', COALESCE(v_skills.speaking, 0),
        'listening', COALESCE(v_skills.listening, 0), 'grammar', COALESCE(v_skills.grammar, 0)
      ) END,
      'period_gain', jsonb_build_object(
        'vocabulary', COALESCE(v_skill_gain.vocabulary, 0), 'reading', COALESCE(v_skill_gain.reading, 0),
        'writing', COALESCE(v_skill_gain.writing, 0), 'speaking', COALESCE(v_skill_gain.speaking, 0),
        'listening', COALESCE(v_skill_gain.listening, 0), 'grammar', COALESCE(v_skill_gain.grammar, 0)
      )
    ),
    'vocabulary', jsonb_build_object(
      'new_added', COALESCE(v_vocab.new_added, 0), 'mastered', COALESCE(v_vocab.mastered, 0),
      'queue_size', COALESCE(v_vocab.queue_size, 0),
      'reviewed_sessions', COALESCE(v_vocab_rev.sessions, 0),
      'review_accuracy_pct', COALESCE(v_vocab_rev.accuracy_pct, 0)
    ),
    'units', jsonb_build_object(
      'completed_in_period', COALESCE(v_units.completed, 0),
      'names', COALESCE(to_jsonb(v_units.names), '[]'::jsonb)
    ),
    'classes', jsonb_build_object(
      'scheduled', COALESCE(v_attend.scheduled, 0),
      'attended', COALESCE(v_attend.attended, 0),
      'rate_pct', COALESCE(v_attend.rate_pct, 0)
    )
  );

  RETURN v_result;
END;
$fn$;
`;

  try {
    await client.query(fixSQL);
    console.log('Aggregator RPC fixed');
  } catch(e) {
    console.error('Fix error:', e.message);
  }

  // Test
  try {
    const test = await client.query(
      "SELECT build_progress_report_data($1, $2, $3) AS result",
      ['f8d2f203-975f-4b0f-a607-ad1a05694f42', '2026-03-15', '2026-04-15']
    );
    console.log('\nAggregator test result:');
    console.log(JSON.stringify(test.rows[0].result, null, 2));
  } catch(e) {
    console.error('Test error:', e.message);
  }

  await client.end();
}

run().catch(function(e) { console.error(e.message); });
