-- ============================================================================
-- 003_triggers_and_functions.sql
-- Database triggers, functions, and views for Fluentia LMS
-- ============================================================================


-- ============================================================================
-- 1. UPDATED_AT AUTO-UPDATE TRIGGER
-- Automatically sets updated_at to now() on every row update.
-- Applied to: profiles, submissions, settings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Apply to submissions
CREATE TRIGGER set_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Apply to settings
CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- 2. AUTO-CREATE PROFILE ON AUTH SIGNUP
-- When a new user is created in auth.users, automatically create a
-- corresponding row in public.profiles with defaults from user metadata.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role public.user_role := 'student';
  _name text := '';
BEGIN
  -- Safely extract metadata
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    _name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    BEGIN
      _role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
      _role := 'student';
    END;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, _name, _role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires after a new auth user is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 3. XP TOTAL UPDATE TRIGGER
-- When a new xp_transaction is inserted, increment the student's xp_total.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_student_xp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.students
  SET xp_total = xp_total + NEW.amount
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_xp_transaction_insert
  AFTER INSERT ON public.xp_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_student_xp();


-- ============================================================================
-- 4. TEAM XP UPDATE TRIGGER
-- When a student's xp_total changes, recalculate the team's total_xp
-- by summing all team members' XP.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_team_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if xp_total actually changed
  IF OLD.xp_total IS DISTINCT FROM NEW.xp_total THEN
    -- Update the team's total_xp by summing all team members' XP
    IF NEW.team_id IS NOT NULL THEN
      UPDATE public.teams
      SET total_xp = (
        SELECT COALESCE(SUM(s.xp_total), 0)
        FROM public.students s
        WHERE s.team_id = NEW.team_id
      )
      WHERE id = NEW.team_id;
    END IF;

    -- If student moved teams, also update the old team
    IF OLD.team_id IS DISTINCT FROM NEW.team_id AND OLD.team_id IS NOT NULL THEN
      UPDATE public.teams
      SET total_xp = (
        SELECT COALESCE(SUM(s.xp_total), 0)
        FROM public.students s
        WHERE s.team_id = OLD.team_id
      )
      WHERE id = OLD.team_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_student_xp_change
  AFTER UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_team_xp();


-- ============================================================================
-- 5. SOFT DELETE VIEWS
-- Default views that exclude soft-deleted records (deleted_at IS NOT NULL).
-- Use these views in application queries for convenience.
-- ============================================================================

CREATE OR REPLACE VIEW public.active_students AS
SELECT * FROM public.students WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_assignments AS
SELECT * FROM public.assignments WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_submissions AS
SELECT * FROM public.submissions WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_payments AS
SELECT * FROM public.payments WHERE deleted_at IS NULL;


-- ============================================================================
-- 6. GAMIFICATION LEVEL CALCULATION
-- Determines the player level based on total XP.
-- Level thresholds follow an incremental pattern:
--   Level 1: 0 XP      Level 6: 1500 XP    Level 11: 5500 XP   Level 16: 12000 XP
--   Level 2: 100 XP    Level 7: 2100 XP    Level 12: 6600 XP   Level 17: 13600 XP
--   Level 3: 300 XP    Level 8: 2800 XP    Level 13: 7800 XP   Level 18: 15300 XP
--   Level 4: 600 XP    Level 9: 3600 XP    Level 14: 9100 XP   Level 19: 17100 XP
--   Level 5: 1000 XP   Level 10: 4500 XP   Level 15: 10500 XP  Level 20: 19000 XP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_gamification_level(xp integer)
RETURNS integer AS $$
DECLARE
  thresholds integer[] := ARRAY[
    0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500,
    5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000
  ];
  lvl integer := 1;
BEGIN
  -- Iterate from highest level downward to find the matching threshold
  FOR i IN REVERSE 20..1 LOOP
    IF xp >= thresholds[i] THEN
      lvl := i;
      EXIT;
    END IF;
  END LOOP;
  RETURN lvl;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- 7. AUTO-UPDATE GAMIFICATION LEVEL
-- When xp_total changes on the students table, recalculate gamification_level.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_gamification_level()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.xp_total IS DISTINCT FROM NEW.xp_total THEN
    NEW.gamification_level := public.calculate_gamification_level(NEW.xp_total);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BEFORE UPDATE so we can modify NEW before it's written
CREATE TRIGGER on_student_level_update
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_gamification_level();


-- ============================================================================
-- 8. STREAK CHECK FUNCTION
-- Designed to be called by a cron job (e.g., pg_cron or Supabase Edge Function).
-- For each active student:
--   - If last_active_at is more than 24 hours ago AND no streak freeze available,
--     reset the streak to 0 and notify the student.
--   - If a streak freeze IS available, consume it instead of breaking the streak.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_streaks()
RETURNS void AS $$
DECLARE
  student_record RECORD;
BEGIN
  FOR student_record IN
    SELECT s.id, s.current_streak, s.last_active_at, s.streak_freeze_available, p.full_name
    FROM public.students s
    JOIN public.profiles p ON p.id = s.id
    WHERE s.deleted_at IS NULL
      AND s.current_streak > 0
      AND s.last_active_at < now() - interval '24 hours'
  LOOP
    IF student_record.streak_freeze_available = true THEN
      -- Consume the streak freeze instead of breaking the streak
      UPDATE public.students
      SET streak_freeze_available = false,
          last_active_at = now()  -- extend the window
      WHERE id = student_record.id;

      -- Notify the student that a freeze was used
      INSERT INTO public.notifications (user_id, title, body, type)
      VALUES (
        student_record.id,
        'تم استخدام تجميد السلسلة!',
        'سلسلتك ' || student_record.current_streak || ' يوم تم حمايتها بتجميد السلسلة.',
        'streak_warning'
      );
    ELSE
      -- No freeze available — reset streak to 0
      UPDATE public.students
      SET current_streak = 0
      WHERE id = student_record.id;

      -- Notify the student that their streak was broken
      INSERT INTO public.notifications (user_id, title, body, type)
      VALUES (
        student_record.id,
        'انتهت السلسلة',
        'سلسلتك ' || student_record.current_streak || ' يوم انتهت. سجّل دخولك يومياً لبناء سلسلة جديدة!',
        'streak_warning'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 9. GENERATE REFERRAL CODE
-- Trigger on student insert to auto-generate a unique referral_code.
-- Format: uppercase first name (transliterated/trimmed) + random 4 digits.
-- Example: ALHANOUF1234
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  base_name text;
  code text;
  code_exists boolean;
BEGIN
  -- Get the student's full name from profiles
  SELECT UPPER(
    REGEXP_REPLACE(
      -- Take only the first name (first word), strip non-alpha characters
      SPLIT_PART(COALESCE(p.full_name, 'STUDENT'), ' ', 1),
      '[^A-Za-z]', '', 'g'
    )
  )
  INTO base_name
  FROM public.profiles p
  WHERE p.id = NEW.id;

  -- Fallback if name is empty after cleanup
  IF base_name IS NULL OR base_name = '' THEN
    base_name := 'STUDENT';
  END IF;

  -- Generate unique code with retry loop
  LOOP
    code := base_name || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');

    -- Check for uniqueness
    SELECT EXISTS (
      SELECT 1 FROM public.students WHERE referral_code = code
    ) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  NEW.referral_code := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire BEFORE INSERT so we can set the referral_code on NEW
CREATE TRIGGER on_student_generate_referral
  BEFORE INSERT ON public.students
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();


-- ============================================================================
-- END OF TRIGGERS AND FUNCTIONS
-- ============================================================================
