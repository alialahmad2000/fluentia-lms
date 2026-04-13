-- ============================================================
-- DASH-V2 Backend: Privacy flag, indexes, functions, triggers
-- ============================================================

-- ─── PHASE 1: Privacy opt-out column on students ─────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students' AND column_name='show_in_leaderboard'
  ) THEN
    ALTER TABLE public.students
      ADD COLUMN show_in_leaderboard BOOLEAN NOT NULL DEFAULT TRUE;
    COMMENT ON COLUMN public.students.show_in_leaderboard IS
      'If FALSE, student is excluded from peer activity feed and leaderboards. Student-controlled.';
  END IF;
END $$;

-- ─── PHASE 2: Performance indexes ───────────────────────
CREATE INDEX IF NOT EXISTS idx_xp_tx_student_created
  ON public.xp_transactions(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created
  ON public.activity_feed(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_students_academic_level
  ON public.students(academic_level);

CREATE INDEX IF NOT EXISTS idx_saved_words_student_created
  ON public.student_saved_words(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mastery_student_word
  ON public.vocabulary_word_mastery(student_id, vocabulary_id);

-- ─── PHASE 4a: Add missing columns to activity_feed ─────
ALTER TABLE public.activity_feed ADD COLUMN IF NOT EXISTS event_text_ar TEXT;
ALTER TABLE public.activity_feed ADD COLUMN IF NOT EXISTS xp_amount INTEGER;

-- ─── PHASE 3.1: get_student_today_summary ────────────────
CREATE OR REPLACE FUNCTION public.get_student_today_summary(p_student_id UUID)
RETURNS TABLE (
  xp_today INT,
  activities_count INT,
  units_touched_count INT,
  units_touched_names TEXT[],
  vocab_added_today INT,
  streak_days INT,
  daily_goal_xp INT,
  daily_goal_pct INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH today_xp AS (
    SELECT COALESCE(SUM(amount), 0)::INT AS xp_sum,
           COUNT(*)::INT AS act_count
    FROM public.xp_transactions
    WHERE student_id = p_student_id
      AND created_at::date = CURRENT_DATE
  ),
  today_units AS (
    SELECT array_agg(DISTINCT cu.theme_ar) FILTER (WHERE cu.theme_ar IS NOT NULL) AS names,
           COUNT(DISTINCT scp.unit_id)::INT AS cnt
    FROM public.student_curriculum_progress scp
    JOIN public.curriculum_units cu ON cu.id = scp.unit_id
    WHERE scp.student_id = p_student_id
      AND scp.updated_at::date = CURRENT_DATE
  ),
  today_vocab AS (
    SELECT COUNT(*)::INT AS cnt
    FROM public.student_saved_words
    WHERE student_id = p_student_id
      AND created_at::date = CURRENT_DATE
  ),
  streak AS (
    SELECT COALESCE(s.current_streak, 0)::INT AS days
    FROM public.students s WHERE s.id = p_student_id
  )
  SELECT
    tx.xp_sum,
    tx.act_count,
    COALESCE(tu.cnt, 0),
    COALESCE(tu.names, ARRAY[]::TEXT[]),
    tv.cnt,
    COALESCE(sk.days, 0),
    50,
    LEAST(100, GREATEST(0, (tx.xp_sum * 100 / GREATEST(50, 1))))::INT
  FROM today_xp tx
  CROSS JOIN today_units tu
  CROSS JOIN today_vocab tv
  CROSS JOIN streak sk;
END $$;

GRANT EXECUTE ON FUNCTION public.get_student_today_summary(UUID) TO authenticated;

-- ─── PHASE 3.2: get_student_week_summary ─────────────────
CREATE OR REPLACE FUNCTION public.get_student_week_summary(p_student_id UUID)
RETURNS TABLE (
  xp_week INT,
  xp_last_week INT,
  comparison_pct INT,
  weekly_goal_xp INT,
  weekly_goal_pct INT,
  activities_by_type JSONB,
  units_completed_this_week JSONB,
  active_days_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_week_start TIMESTAMPTZ;
  v_last_week_start TIMESTAMPTZ;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_week_start := date_trunc('week', NOW());
  v_last_week_start := v_week_start - INTERVAL '7 days';

  RETURN QUERY
  WITH this_week_xp AS (
    SELECT COALESCE(SUM(amount), 0)::INT AS xp_sum
    FROM public.xp_transactions
    WHERE student_id = p_student_id AND created_at >= v_week_start
  ),
  last_week_xp AS (
    SELECT COALESCE(SUM(amount), 0)::INT AS xp_sum
    FROM public.xp_transactions
    WHERE student_id = p_student_id
      AND created_at >= v_last_week_start AND created_at < v_week_start
  ),
  activities_breakdown AS (
    SELECT jsonb_object_agg(
      COALESCE(scp.section_type, 'other'),
      cnt
    ) AS breakdown
    FROM (
      SELECT section_type, COUNT(*)::INT AS cnt
      FROM public.student_curriculum_progress
      WHERE student_id = p_student_id
        AND updated_at >= v_week_start
        AND is_latest = TRUE
      GROUP BY section_type
    ) scp
  ),
  completed_units AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'unit_id', scp.unit_id,
      'theme_ar', cu.theme_ar,
      'completed_at', scp.completed_at
    )), '[]'::jsonb) AS units_list
    FROM public.student_curriculum_progress scp
    JOIN public.curriculum_units cu ON cu.id = scp.unit_id
    WHERE scp.student_id = p_student_id
      AND scp.status = 'completed'
      AND scp.completed_at >= v_week_start
      AND scp.is_best = TRUE
    GROUP BY scp.unit_id, cu.theme_ar, scp.completed_at
  ),
  active_days AS (
    SELECT COUNT(DISTINCT created_at::date)::INT AS cnt
    FROM public.xp_transactions
    WHERE student_id = p_student_id AND created_at >= v_week_start
  )
  SELECT
    tw.xp_sum,
    lw.xp_sum,
    CASE WHEN lw.xp_sum > 0 THEN ((tw.xp_sum - lw.xp_sum) * 100 / lw.xp_sum)::INT ELSE 0 END,
    350,
    LEAST(100, GREATEST(0, (tw.xp_sum * 100 / GREATEST(350, 1))))::INT,
    COALESCE(ab.breakdown, '{}'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'unit_id', sub.unit_id,
      'theme_ar', sub.theme_ar,
      'completed_at', sub.completed_at
    )) FROM (
      SELECT DISTINCT ON (scp2.unit_id) scp2.unit_id, cu2.theme_ar, scp2.completed_at
      FROM public.student_curriculum_progress scp2
      JOIN public.curriculum_units cu2 ON cu2.id = scp2.unit_id
      WHERE scp2.student_id = p_student_id
        AND scp2.status = 'completed'
        AND scp2.completed_at >= v_week_start
        AND scp2.is_best = TRUE
      ORDER BY scp2.unit_id, scp2.completed_at DESC
    ) sub), '[]'::jsonb),
    ad.cnt
  FROM this_week_xp tw
  CROSS JOIN last_week_xp lw
  CROSS JOIN activities_breakdown ab
  CROSS JOIN active_days ad;
END $$;

GRANT EXECUTE ON FUNCTION public.get_student_week_summary(UUID) TO authenticated;

-- ─── PHASE 3.3: get_personal_dictionary ──────────────────
CREATE OR REPLACE FUNCTION public.get_personal_dictionary(
  p_student_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_source TEXT DEFAULT NULL,
  p_mastery TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  saved_word_id UUID,
  vocabulary_id UUID,
  word_en TEXT,
  word_ar TEXT,
  pronunciation TEXT,
  audio_url TEXT,
  example_sentence TEXT,
  source TEXT,
  source_label_ar TEXT,
  mastery_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    ssw.id AS saved_word_id,
    cv.id AS vocabulary_id,
    ssw.word AS word_en,
    cv.definition_ar AS word_ar,
    cv.pronunciation_ipa AS pronunciation,
    cv.audio_url,
    COALESCE(ssw.context_sentence, cv.example_sentence) AS example_sentence,
    ssw.source,
    CASE ssw.source
      WHEN 'reading_passage' THEN 'من قطعة قراءة'
      WHEN 'unit_vocabulary' THEN 'من وحدة'
      ELSE 'أضفت يدوياً'
    END AS source_label_ar,
    COALESCE(vwm.mastery_level, 'new') AS mastery_status,
    ssw.created_at
  FROM public.student_saved_words ssw
  LEFT JOIN public.curriculum_vocabulary cv ON LOWER(cv.word) = LOWER(ssw.word)
  LEFT JOIN public.vocabulary_word_mastery vwm
    ON vwm.student_id = p_student_id AND vwm.vocabulary_id = cv.id
  WHERE ssw.student_id = p_student_id
    AND (p_source IS NULL OR ssw.source = p_source)
    AND (p_mastery IS NULL OR COALESCE(vwm.mastery_level, 'new') = p_mastery)
    AND (p_search IS NULL OR p_search = '' OR ssw.word ILIKE '%' || p_search || '%' OR cv.definition_ar ILIKE '%' || p_search || '%')
  ORDER BY ssw.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END $$;

GRANT EXECUTE ON FUNCTION public.get_personal_dictionary(UUID, INT, INT, TEXT, TEXT, TEXT) TO authenticated;

-- ─── PHASE 3.4: get_dictionary_stats ─────────────────────
CREATE OR REPLACE FUNCTION public.get_dictionary_stats(p_student_id UUID)
RETURNS TABLE (
  total_words INT,
  added_this_week INT,
  mastered_count INT,
  learning_count INT,
  new_count INT,
  from_reading INT,
  from_units INT,
  from_manual INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH word_stats AS (
    SELECT
      COUNT(*)::INT AS total,
      COUNT(*) FILTER (WHERE ssw.created_at >= date_trunc('week', NOW()))::INT AS this_week,
      COUNT(*) FILTER (WHERE ssw.source = 'reading_passage')::INT AS reading_src,
      COUNT(*) FILTER (WHERE ssw.source = 'unit_vocabulary')::INT AS unit_src,
      COUNT(*) FILTER (WHERE ssw.source IS NULL OR ssw.source NOT IN ('reading_passage','unit_vocabulary'))::INT AS manual_src
    FROM public.student_saved_words ssw
    WHERE ssw.student_id = p_student_id
  ),
  mastery_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE vwm.mastery_level = 'mastered')::INT AS mastered,
      COUNT(*) FILTER (WHERE vwm.mastery_level = 'learning')::INT AS learning,
      COUNT(*) FILTER (WHERE vwm.mastery_level = 'new' OR vwm.mastery_level IS NULL)::INT AS new_words
    FROM public.student_saved_words ssw
    LEFT JOIN public.curriculum_vocabulary cv ON LOWER(cv.word) = LOWER(ssw.word)
    LEFT JOIN public.vocabulary_word_mastery vwm
      ON vwm.student_id = p_student_id AND vwm.vocabulary_id = cv.id
    WHERE ssw.student_id = p_student_id
  )
  SELECT ws.total, ws.this_week, ms.mastered, ms.learning, ms.new_words,
         ws.reading_src, ws.unit_src, ws.manual_src
  FROM word_stats ws CROSS JOIN mastery_stats ms;
END $$;

GRANT EXECUTE ON FUNCTION public.get_dictionary_stats(UUID) TO authenticated;

-- ─── PHASE 3.5: get_level_activity_feed ──────────────────
CREATE OR REPLACE FUNCTION public.get_level_activity_feed(
  p_student_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  feed_id UUID,
  actor_id UUID,
  actor_name TEXT,
  actor_avatar_url TEXT,
  event_type TEXT,
  event_text_ar TEXT,
  event_title TEXT,
  xp_amount INT,
  created_at TIMESTAMPTZ,
  relative_time_ar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_caller_level INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT academic_level INTO v_caller_level
  FROM public.students WHERE id = p_student_id;

  IF v_caller_level IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    af.id AS feed_id,
    af.student_id AS actor_id,
    COALESCE(p.display_name, p.full_name, 'طالب') AS actor_name,
    p.avatar_url AS actor_avatar_url,
    af.type::TEXT AS event_type,
    af.event_text_ar,
    af.title AS event_title,
    af.xp_amount,
    af.created_at,
    CASE
      WHEN NOW() - af.created_at < INTERVAL '1 minute' THEN 'الآن'
      WHEN NOW() - af.created_at < INTERVAL '1 hour' THEN
        'منذ ' || EXTRACT(MINUTE FROM (NOW() - af.created_at))::INT::TEXT || ' دقيقة'
      WHEN NOW() - af.created_at < INTERVAL '24 hours' THEN
        'منذ ' || EXTRACT(HOUR FROM (NOW() - af.created_at))::INT::TEXT || ' ساعة'
      ELSE 'منذ ' || EXTRACT(DAY FROM (NOW() - af.created_at))::INT::TEXT || ' يوم'
    END AS relative_time_ar
  FROM public.activity_feed af
  JOIN public.students s ON s.id = af.student_id
  JOIN public.profiles p ON p.id = af.student_id
  WHERE s.academic_level = v_caller_level
    AND s.show_in_leaderboard = TRUE
    AND af.student_id <> p_student_id
    AND af.created_at > NOW() - INTERVAL '48 hours'
  ORDER BY af.created_at DESC
  LIMIT p_limit;
END $$;

GRANT EXECUTE ON FUNCTION public.get_level_activity_feed(UUID, INT) TO authenticated;

-- ─── PHASE 3.6: get_level_top_movers ─────────────────────
CREATE OR REPLACE FUNCTION public.get_level_top_movers(p_student_id UUID)
RETURNS TABLE (
  period TEXT,
  rank INT,
  student_id UUID,
  first_name TEXT,
  avatar_url TEXT,
  xp_in_period INT,
  is_caller BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_caller_level INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT academic_level INTO v_caller_level
  FROM public.students WHERE id = p_student_id;

  IF v_caller_level IS NULL THEN
    RETURN;
  END IF;

  -- Today's top 3
  RETURN QUERY
  SELECT
    'today'::TEXT AS period,
    ROW_NUMBER() OVER (ORDER BY SUM(xt.amount) DESC)::INT AS rank,
    xt.student_id,
    COALESCE(p.display_name, split_part(p.full_name, ' ', 1), 'طالب') AS first_name,
    p.avatar_url,
    SUM(xt.amount)::INT AS xp_in_period,
    (xt.student_id = p_student_id) AS is_caller
  FROM public.xp_transactions xt
  JOIN public.students s ON s.id = xt.student_id AND s.academic_level = v_caller_level AND s.show_in_leaderboard = TRUE
  JOIN public.profiles p ON p.id = xt.student_id
  WHERE xt.created_at::date = CURRENT_DATE
  GROUP BY xt.student_id, p.display_name, p.full_name, p.avatar_url
  ORDER BY xp_in_period DESC
  LIMIT 3;

  -- This week's top 3
  RETURN QUERY
  SELECT
    'week'::TEXT AS period,
    ROW_NUMBER() OVER (ORDER BY SUM(xt.amount) DESC)::INT AS rank,
    xt.student_id,
    COALESCE(p.display_name, split_part(p.full_name, ' ', 1), 'طالب') AS first_name,
    p.avatar_url,
    SUM(xt.amount)::INT AS xp_in_period,
    (xt.student_id = p_student_id) AS is_caller
  FROM public.xp_transactions xt
  JOIN public.students s ON s.id = xt.student_id AND s.academic_level = v_caller_level AND s.show_in_leaderboard = TRUE
  JOIN public.profiles p ON p.id = xt.student_id
  WHERE xt.created_at >= date_trunc('week', NOW())
  GROUP BY xt.student_id, p.display_name, p.full_name, p.avatar_url
  ORDER BY xp_in_period DESC
  LIMIT 3;
END $$;

GRANT EXECUTE ON FUNCTION public.get_level_top_movers(UUID) TO authenticated;

-- ─── PHASE 4b: Activity feed triggers ────────────────────

-- Trigger: word saved → activity_feed
CREATE OR REPLACE FUNCTION public.tg_feed_on_word_added()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.activity_feed (student_id, group_id, type, title, description, event_text_ar, created_at)
  VALUES (
    NEW.student_id,
    (SELECT group_id FROM public.students WHERE id = NEW.student_id),
    'achievement',
    'إضافة مفردة جديدة',
    'أضاف كلمة "' || NEW.word || '" لقاموسه الشخصي',
    'أضاف كلمة جديدة لقاموسه الشخصي',
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_feed_word_added ON public.student_saved_words;
CREATE TRIGGER trg_feed_word_added
AFTER INSERT ON public.student_saved_words
FOR EACH ROW EXECUTE FUNCTION public.tg_feed_on_word_added();

-- Trigger: XP earned → activity_feed
CREATE OR REPLACE FUNCTION public.tg_feed_on_xp_earned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  -- Only log XP amounts >= 10 to avoid feed spam from tiny awards
  IF NEW.amount < 10 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.activity_feed (student_id, group_id, type, title, description, event_text_ar, xp_amount, created_at)
  VALUES (
    NEW.student_id,
    (SELECT group_id FROM public.students WHERE id = NEW.student_id),
    'achievement',
    COALESCE(NEW.description, 'حصل على XP'),
    'حصل على ' || NEW.amount || ' نقطة خبرة',
    'حصل على ' || NEW.amount || ' نقطة خبرة',
    NEW.amount,
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_feed_xp_earned ON public.xp_transactions;
CREATE TRIGGER trg_feed_xp_earned
AFTER INSERT ON public.xp_transactions
FOR EACH ROW EXECUTE FUNCTION public.tg_feed_on_xp_earned();

-- Trigger: unit section completed → activity_feed
CREATE OR REPLACE FUNCTION public.tg_feed_on_section_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_theme TEXT;
  v_section_ar TEXT;
BEGIN
  -- Only fire when status transitions to 'completed'
  IF NEW.status <> 'completed' OR (OLD IS NOT NULL AND OLD.status = 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT theme_ar INTO v_theme FROM public.curriculum_units WHERE id = NEW.unit_id;

  v_section_ar := CASE NEW.section_type
    WHEN 'reading' THEN 'القراءة'
    WHEN 'grammar' THEN 'القواعد'
    WHEN 'vocabulary' THEN 'المفردات'
    WHEN 'listening' THEN 'الاستماع'
    WHEN 'speaking' THEN 'التحدث'
    WHEN 'writing' THEN 'الكتابة'
    WHEN 'pronunciation' THEN 'النطق'
    WHEN 'assessment' THEN 'التقييم'
    ELSE NEW.section_type
  END;

  INSERT INTO public.activity_feed (student_id, group_id, type, title, description, event_text_ar, created_at)
  VALUES (
    NEW.student_id,
    (SELECT group_id FROM public.students WHERE id = NEW.student_id),
    'submission',
    'أكمل ' || v_section_ar,
    'أكمل قسم ' || v_section_ar || ' في ' || COALESCE(v_theme, 'وحدة'),
    'أكمل قسم ' || v_section_ar || ' في ' || COALESCE(v_theme, 'وحدة'),
    NOW()
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_feed_section_completed ON public.student_curriculum_progress;
CREATE TRIGGER trg_feed_section_completed
AFTER INSERT OR UPDATE ON public.student_curriculum_progress
FOR EACH ROW EXECUTE FUNCTION public.tg_feed_on_section_completed();

-- ─── PHASE 5: Realtime publication ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='activity_feed'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
  END IF;
END $$;
