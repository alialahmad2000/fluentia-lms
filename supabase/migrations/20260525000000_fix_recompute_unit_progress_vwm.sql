-- Fix: trg_recompute_unit_progress() threw `record "new" has no field "unit_id"`
-- on every write to vocabulary_word_mastery (which has no unit_id column),
-- because line 289 of 20260514100000_compute_unit_progress.sql evaluated
-- NEW.unit_id unconditionally — BEFORE the table-aware fallback could run.
-- Result: every per-word checkmark save (WordExerciseModal -> upsert) raised,
-- was swallowed by the modal's try/catch, and no mastery row was written.
-- Last organic vocabulary_word_mastery write in prod = 2026-05-14 (this trigger's
-- ship date). See docs/audits/vocab-checkmarks/PHASE-A-DIAGNOSIS.md.
--
-- Fix: read NEW/OLD fields via to_jsonb(...)->>'key', which returns NULL for an
-- absent key instead of throwing. Table-agnostic and robust for all 4 attached
-- tables (student_curriculum_progress, speaking_recordings,
-- vocabulary_word_mastery, activity_attempts). No schema/data change; only the
-- trigger function body. compute_unit_progress() and recompute_unit_progress_for()
-- are intentionally left untouched (later migrations own them).
--
-- DB-strategy: apply on a Supabase branch first, then promote to prod manually.

CREATE OR REPLACE FUNCTION trg_recompute_unit_progress()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rec        jsonb;
  v_student_id uuid;
  v_unit_id    uuid;
  v_vocab_id   uuid;
BEGIN
  -- to_jsonb on the whole record never throws on a missing field; ->> yields
  -- NULL for absent keys, so a table without unit_id is handled gracefully.
  v_rec := COALESCE(to_jsonb(NEW), to_jsonb(OLD));

  v_student_id := NULLIF(v_rec->>'student_id', '')::uuid;
  v_unit_id    := NULLIF(v_rec->>'unit_id', '')::uuid;

  -- vocabulary_word_mastery has no unit_id — resolve it via
  -- vocabulary_id -> curriculum_vocabulary.reading_id -> curriculum_readings.unit_id
  IF v_unit_id IS NULL AND (v_rec ? 'vocabulary_id') THEN
    v_vocab_id := NULLIF(v_rec->>'vocabulary_id', '')::uuid;
    IF v_vocab_id IS NOT NULL THEN
      SELECT cr.unit_id INTO v_unit_id
      FROM curriculum_vocabulary cv
      JOIN curriculum_readings cr ON cr.id = cv.reading_id
      WHERE cv.id = v_vocab_id
      LIMIT 1;
    END IF;
  END IF;

  IF v_student_id IS NOT NULL AND v_unit_id IS NOT NULL THEN
    PERFORM recompute_unit_progress_for(v_student_id, v_unit_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
