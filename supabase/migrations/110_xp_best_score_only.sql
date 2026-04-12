-- ============================================
-- 110: XP awards only for best score attempt
-- Writing: revoke previous XP when new best comes in
-- Speaking: XP recomputed on evaluation update
-- ============================================

-- ─── 1. Update add_xp to accept optional reference_id ───
CREATE OR REPLACE FUNCTION add_xp(
  p_student_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'writing',
  p_description text DEFAULT 'Writing Lab XP',
  p_reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE students SET xp_total = COALESCE(xp_total, 0) + p_amount WHERE id = p_student_id;
  INSERT INTO xp_transactions (student_id, amount, reason, description, related_id)
  VALUES (p_student_id, p_amount, p_reason, p_description, p_reference_id);
END;
$$;

-- ─── 2. Trigger: writing — adjust XP when is_best changes ───
-- After the before-insert trigger sets is_best, this after-insert trigger
-- handles XP: if new attempt is best and there was a previous best, revoke old XP
CREATE OR REPLACE FUNCTION writing_xp_best_score()
RETURNS TRIGGER AS $$
DECLARE
  prev_xp integer;
  prev_id uuid;
BEGIN
  -- Only act if this is the new best
  IF NOT NEW.is_best THEN
    -- Not the best: revoke the XP that was just awarded by the edge function
    -- (edge function always calls add_xp before this trigger runs)
    IF COALESCE(NEW.xp_earned, 0) > 0 THEN
      UPDATE students SET xp_total = GREATEST(0, COALESCE(xp_total, 0) - NEW.xp_earned)
      WHERE id = NEW.student_id;

      INSERT INTO xp_transactions (student_id, amount, reason, description)
      VALUES (NEW.student_id, -NEW.xp_earned, 'writing_adjustment', 'تعديل XP — ليست أفضل محاولة');
    END IF;
    RETURN NEW;
  END IF;

  -- This IS the best: check if there was a previous best whose XP we need to revoke
  SELECT id, COALESCE(xp_earned, 0) INTO prev_id, prev_xp
  FROM writing_history
  WHERE student_id = NEW.student_id
    AND task_type = NEW.task_type
    AND COALESCE(prompt_used, '') = COALESCE(NEW.prompt_used, '')
    AND id != NEW.id
    AND xp_earned > 0
    AND attempt_number < NEW.attempt_number
  ORDER BY fluency_score DESC, created_at DESC
  LIMIT 1;

  IF prev_id IS NOT NULL AND prev_xp > 0 THEN
    -- Revoke old best's XP
    UPDATE students SET xp_total = GREATEST(0, COALESCE(xp_total, 0) - prev_xp)
    WHERE id = NEW.student_id;

    INSERT INTO xp_transactions (student_id, amount, reason, description)
    VALUES (NEW.student_id, -prev_xp, 'writing_adjustment', 'تعديل XP — محاولة أفضل جديدة');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS writing_xp_best_score_trigger ON writing_history;
CREATE TRIGGER writing_xp_best_score_trigger
  AFTER INSERT ON writing_history
  FOR EACH ROW
  EXECUTE FUNCTION writing_xp_best_score();
