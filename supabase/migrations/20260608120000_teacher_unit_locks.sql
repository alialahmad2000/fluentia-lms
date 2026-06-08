-- Teacher delivery control: a teacher can LOCK a unit for one of their groups
-- (pacing / gating). Presence of a row = that unit is locked for that group.
-- No row = open (default). Student enforcement is fail-open: any read error
-- leaves the unit accessible, so this can never break student access.
CREATE TABLE IF NOT EXISTS public.teacher_unit_locks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES profiles(id),
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  unit_id    uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, unit_id)
);

ALTER TABLE public.teacher_unit_locks ENABLE ROW LEVEL SECURITY;

-- Teacher manages locks for their OWN groups (admins all).
DROP POLICY IF EXISTS tul_trainer_all ON public.teacher_unit_locks;
CREATE POLICY tul_trainer_all ON public.teacher_unit_locks FOR ALL
  USING (is_admin() OR (is_trainer() AND group_id = ANY (get_trainer_group_ids())))
  WITH CHECK (is_admin() OR (is_trainer() AND group_id = ANY (get_trainer_group_ids())));

-- Students may READ the locks for their own group (to know a unit is locked).
DROP POLICY IF EXISTS tul_student_read ON public.teacher_unit_locks;
CREATE POLICY tul_student_read ON public.teacher_unit_locks FOR SELECT
  USING (group_id = get_student_group_id() OR is_admin() OR is_trainer());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_unit_locks TO authenticated;
