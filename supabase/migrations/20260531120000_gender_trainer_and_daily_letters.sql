-- ============================================================================
-- DASHBOARD V2 — Trainer Letter · gender + trainer assignment + letter storage
-- 07-V2-DASHBOARD-V2-TRAINER-LETTER-GENDERED  (Phase B.0 + B.1)
--
-- Fully idempotent (safe to re-run). Additive only — no destructive changes.
--   B.0: students.gender, students.assigned_trainer_id, backfill 2 male students
--   B.1: daily_letters, daily_letters_runs (+ RLS, indexes)
--
-- NOTE: students has NO name_ar column — the student's name lives on
-- profiles (display_name || full_name), keyed by students.id = profiles.id.
-- Verified against live schema 2026-05-31.
-- ============================================================================

BEGIN;

-- ── B.0.a — students.gender ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students' AND column_name='gender'
  ) THEN
    ALTER TABLE students ADD COLUMN gender text
      CHECK (gender IN ('male','female')) DEFAULT 'female';
    COMMENT ON COLUMN students.gender IS
      'Arabic grammatical gender for generated content. Default female (majority); explicit set required for male students.';
  END IF;
END $$;

-- ── B.0.b — students.assigned_trainer_id ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students' AND column_name='assigned_trainer_id'
  ) THEN
    ALTER TABLE students ADD COLUMN assigned_trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
    COMMENT ON COLUMN students.assigned_trainer_id IS
      'Trainer who signs daily letters and is primary point of contact. NULL falls back to founder voice (د. محمد).';
  END IF;
END $$;

-- ── B.0.1 — backfill the 2 known male students ───────────────────────────
-- علي سعيد القحطاني / عبدالرحمن الشمري — UUIDs verified live 2026-05-31.
UPDATE students
SET gender = 'male'
WHERE id IN ('1148c3bd-efe2-425e-a420-3421e831e830','730b4e93-548d-4823-b693-b5387bbebcd1')
  AND gender IS DISTINCT FROM 'male';

-- B.0.2 — trainer assignment is left NULL for everyone on purpose; letters
-- sign as "د. محمد" until Ali assigns trainers via a follow-up admin screen.

-- ── B.1 — daily_letters ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_letters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  letter_date   date NOT NULL,
  body_ar       text NOT NULL,
  salutation    text NOT NULL,
  signature     text NOT NULL,
  gender        text NOT NULL CHECK (gender IN ('male','female')),
  trainer_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,   -- nullable → د. محمد fallback
  source        text NOT NULL CHECK (source IN ('claude_haiku','template_fallback')),
  model_id      text,
  input_tokens  int,
  output_tokens int,
  generation_ms int,
  data_snapshot jsonb,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (student_id, letter_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_letters_student_date
  ON daily_letters (student_id, letter_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_letters_date
  ON daily_letters (letter_date DESC);

-- ── B.1 — daily_letters_runs (one row per cron/manual run) ───────────────
CREATE TABLE IF NOT EXISTS daily_letters_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date          date NOT NULL,
  started_at        timestamptz DEFAULT now(),
  finished_at       timestamptz,
  invoked_by        text,                       -- 'cron' | 'admin' | 'service_role'
  total_students    int DEFAULT 0,
  generated_total   int DEFAULT 0,
  generated_male    int DEFAULT 0,              -- ✨ gender distribution (Phase B.5)
  generated_female  int DEFAULT 0,
  via_claude        int DEFAULT 0,
  via_fallback      int DEFAULT 0,
  skipped_existing  int DEFAULT 0,
  skipped_no_gender int DEFAULT 0,
  errors            int DEFAULT 0,
  input_tokens      int DEFAULT 0,
  output_tokens     int DEFAULT 0,
  notes             jsonb
);

CREATE INDEX IF NOT EXISTS idx_daily_letters_runs_date
  ON daily_letters_runs (run_date DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE daily_letters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_letters_runs ENABLE ROW LEVEL SECURITY;

-- A student reads only their own letters.
DROP POLICY IF EXISTS daily_letters_select_own ON daily_letters;
CREATE POLICY daily_letters_select_own ON daily_letters
  FOR SELECT USING (student_id = auth.uid());

-- Admins read all letters.
DROP POLICY IF EXISTS daily_letters_select_admin ON daily_letters;
CREATE POLICY daily_letters_select_admin ON daily_letters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Run telemetry is admin-only.
DROP POLICY IF EXISTS daily_letters_runs_select_admin ON daily_letters_runs;
CREATE POLICY daily_letters_runs_select_admin ON daily_letters_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- (Writes happen only via the service-role edge function, which bypasses RLS.)

COMMIT;
