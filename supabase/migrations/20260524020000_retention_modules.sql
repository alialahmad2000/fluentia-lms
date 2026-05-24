-- ─────────────────────────────────────────────────────────────────────────────
-- Retention System — Block 1 (Shared Infrastructure)
-- ─────────────────────────────────────────────────────────────────────────────
-- Creates the per-student per-module enable flag table that ALL retention
-- modules are gated on. Every row defaults to enabled=false. Ali enables
-- modules per student (or per group via the admin RPC) after his manual
-- review. No student sees any retention surface until a row exists here
-- with enabled=true for that (student, module) pair.
--
-- This migration is ADDITIVE only — no existing table touched.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_key text NOT NULL CHECK (module_key IN (
    'daily_partner',
    'smart_homework',
    'weekly_reports',
    'streak_activation',
    'lesson_briefs'
  )),
  enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  enabled_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, module_key)
);

COMMENT ON TABLE public.retention_modules IS
  'Per-student per-module enable flag for the retention system. Defaults to false; admin flips manually via /admin/retention after review.';

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS retention_modules_student_idx
  ON public.retention_modules (student_id, enabled);
CREATE INDEX IF NOT EXISTS retention_modules_module_idx
  ON public.retention_modules (module_key, enabled);

-- updated_at trigger (reuses existing helper if it exists; otherwise inlines)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $fn$;
  END IF;
END$$;

DROP TRIGGER IF EXISTS trg_retention_modules_updated_at ON public.retention_modules;
CREATE TRIGGER trg_retention_modules_updated_at
  BEFORE UPDATE ON public.retention_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.retention_modules ENABLE ROW LEVEL SECURITY;

-- Student can SELECT their own rows
DROP POLICY IF EXISTS retention_modules_student_select ON public.retention_modules;
CREATE POLICY retention_modules_student_select
  ON public.retention_modules
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Trainer + admin can SELECT all
DROP POLICY IF EXISTS retention_modules_staff_select ON public.retention_modules;
CREATE POLICY retention_modules_staff_select
  ON public.retention_modules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'trainer')
    )
  );

-- Admin-only INSERT (in practice everyone goes through the RPC, but RLS belt-and-braces)
DROP POLICY IF EXISTS retention_modules_admin_insert ON public.retention_modules;
CREATE POLICY retention_modules_admin_insert
  ON public.retention_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin-only UPDATE
DROP POLICY IF EXISTS retention_modules_admin_update ON public.retention_modules;
CREATE POLICY retention_modules_admin_update
  ON public.retention_modules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service role bypasses RLS by default; no explicit policy needed.

-- ─── 3. Module-key helper ────────────────────────────────────────────────────
-- Used by RLS on per-module retention_* tables and by the frontend hook.
-- STABLE + SECURITY DEFINER so it can see all rows regardless of caller's RLS.
CREATE OR REPLACE FUNCTION public.retention_is_module_enabled(
  p_student_id uuid,
  p_module_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.retention_modules
    WHERE student_id = p_student_id
      AND module_key = p_module_key
      AND enabled = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.retention_is_module_enabled(uuid, text) TO authenticated;

-- ─── 4. Admin bulk-enable RPC ────────────────────────────────────────────────
-- Single entry point for the admin UI to flip modules on/off for one or more
-- students at once. SECURITY DEFINER + admin-only check inside.
CREATE OR REPLACE FUNCTION public.retention_set_module_enabled(
  p_student_ids uuid[],
  p_module_key text,
  p_enabled boolean,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (student_id uuid, module_key text, enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
  v_caller_id uuid := auth.uid();
BEGIN
  -- Admin gate
  SELECT p.role INTO v_caller_role
  FROM public.profiles p
  WHERE p.id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can set retention module flags. Caller role: %', COALESCE(v_caller_role, 'unknown')
      USING ERRCODE = '42501';
  END IF;

  -- Validate module_key
  IF p_module_key NOT IN ('daily_partner','smart_homework','weekly_reports','streak_activation','lesson_briefs') THEN
    RAISE EXCEPTION 'Invalid module_key: %', p_module_key USING ERRCODE = '22023';
  END IF;

  -- Upsert one row per student
  RETURN QUERY
  INSERT INTO public.retention_modules AS rm (
    student_id, module_key, enabled, enabled_at, enabled_by, notes
  )
  SELECT s_id, p_module_key, p_enabled,
         CASE WHEN p_enabled THEN now() ELSE NULL END,
         v_caller_id,
         p_notes
  FROM unnest(p_student_ids) AS s_id
  ON CONFLICT (student_id, module_key) DO UPDATE
    SET enabled    = EXCLUDED.enabled,
        enabled_at = CASE WHEN EXCLUDED.enabled THEN now() ELSE NULL END,
        enabled_by = v_caller_id,
        notes      = COALESCE(EXCLUDED.notes, rm.notes),
        updated_at = now()
  RETURNING rm.student_id, rm.module_key, rm.enabled;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retention_set_module_enabled(uuid[], text, boolean, text) TO authenticated;

-- ─── 5. Diagnostic view for admin dashboard ──────────────────────────────────
CREATE OR REPLACE VIEW public.retention_module_status AS
SELECT
  s.id AS student_id,
  p.full_name,
  s.academic_level,
  s.group_id,
  bool_or(rm.module_key = 'daily_partner'     AND rm.enabled) AS daily_partner_enabled,
  bool_or(rm.module_key = 'smart_homework'    AND rm.enabled) AS smart_homework_enabled,
  bool_or(rm.module_key = 'weekly_reports'    AND rm.enabled) AS weekly_reports_enabled,
  bool_or(rm.module_key = 'streak_activation' AND rm.enabled) AS streak_activation_enabled,
  bool_or(rm.module_key = 'lesson_briefs'     AND rm.enabled) AS lesson_briefs_enabled,
  count(rm.id) FILTER (WHERE rm.enabled = true) AS modules_enabled_count
FROM public.students s
JOIN public.profiles p ON p.id = s.id
LEFT JOIN public.retention_modules rm ON rm.student_id = s.id
WHERE s.status = 'active'
  AND s.deleted_at IS NULL
GROUP BY s.id, p.full_name, s.academic_level, s.group_id;

COMMENT ON VIEW public.retention_module_status IS
  'Wide view of all active students × 5 retention modules for the admin dashboard.';
