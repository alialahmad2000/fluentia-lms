-- Fardi custom-curriculum engine: per-student custom curriculum units.
-- Applied live via the Management API on 2026-07-02; this file is the repo record.
-- Generic units (owner_student_id IS NULL) keep EXACTLY their previous behaviour.
-- Custom units (owner_student_id IS NOT NULL) are readable only by their owner + admin/trainer.

-- 1. Scoping columns ---------------------------------------------------------
ALTER TABLE curriculum_units ADD COLUMN IF NOT EXISTS owner_student_id uuid REFERENCES students(id);
ALTER TABLE curriculum_units ADD COLUMN IF NOT EXISTS custom_sort integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS uses_custom_curriculum boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_curriculum_units_owner ON curriculum_units(owner_student_id);

-- 2. (level_id, unit_number) uniqueness now applies to GENERIC units only,
--    so many students can each own a unit_number=1 custom unit at the same level.
ALTER TABLE curriculum_units DROP CONSTRAINT IF EXISTS curriculum_units_level_id_unit_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS curriculum_units_level_unit_generic_uniq
  ON curriculum_units(level_id, unit_number) WHERE owner_student_id IS NULL;

-- 3. Owner-visibility resolvers (SECURITY DEFINER → bypass RLS on parents, no recursion) ----
CREATE OR REPLACE FUNCTION public.cc_unit_visible(p_unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM curriculum_units u
    WHERE u.id = p_unit_id AND (
      u.owner_student_id IS NULL
      OR u.owner_student_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin','trainer'))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.cc_reading_visible(p_reading_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE r.id = p_reading_id AND (
      u.owner_student_id IS NULL
      OR u.owner_student_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin','trainer'))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.cc_grammar_visible(p_grammar_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM curriculum_grammar g
    WHERE g.id = p_grammar_id AND (
      g.unit_id IS NULL
      OR EXISTS (SELECT 1 FROM curriculum_units u WHERE u.id = g.unit_id AND (
           u.owner_student_id IS NULL
           OR u.owner_student_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin','trainer'))))
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.cc_unit_visible(uuid), public.cc_reading_visible(uuid), public.cc_grammar_visible(uuid)
  TO authenticated, anon, service_role;

-- 4. Owner-scoped SELECT policies (replace the "any authenticated can read everything" reads).
--    admin_all_* / service_* policies are unchanged (admins + service role keep full access).
DROP POLICY IF EXISTS auth_read_curriculum_units ON curriculum_units;
CREATE POLICY auth_read_curriculum_units ON curriculum_units FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND (
  owner_student_id IS NULL OR owner_student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin','trainer'))));

-- unit_id NOT NULL content tables
DROP POLICY IF EXISTS auth_read_curriculum_readings ON curriculum_readings;
CREATE POLICY auth_read_curriculum_readings ON curriculum_readings FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_unit_visible(unit_id));
DROP POLICY IF EXISTS auth_read_curriculum_speaking ON curriculum_speaking;
CREATE POLICY auth_read_curriculum_speaking ON curriculum_speaking FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_unit_visible(unit_id));
DROP POLICY IF EXISTS auth_read_curriculum_listening ON curriculum_listening;
CREATE POLICY auth_read_curriculum_listening ON curriculum_listening FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_unit_visible(unit_id));
DROP POLICY IF EXISTS auth_read_curriculum_writing ON curriculum_writing;
CREATE POLICY auth_read_curriculum_writing ON curriculum_writing FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_unit_visible(unit_id));
DROP POLICY IF EXISTS auth_read_curriculum_video_sections ON curriculum_video_sections;
CREATE POLICY auth_read_curriculum_video_sections ON curriculum_video_sections FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_unit_visible(unit_id));

-- unit_id NULLABLE content tables (NULL unit_id = level-scoped shared row → stays visible)
DROP POLICY IF EXISTS auth_read_curriculum_grammar ON curriculum_grammar;
CREATE POLICY auth_read_curriculum_grammar ON curriculum_grammar FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND (unit_id IS NULL OR public.cc_unit_visible(unit_id)));
DROP POLICY IF EXISTS auth_read_curriculum_assessments ON curriculum_assessments;
CREATE POLICY auth_read_curriculum_assessments ON curriculum_assessments FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND (unit_id IS NULL OR public.cc_unit_visible(unit_id)));
DROP POLICY IF EXISTS auth_read_curriculum_pronunciation ON curriculum_pronunciation;
CREATE POLICY auth_read_curriculum_pronunciation ON curriculum_pronunciation FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND (unit_id IS NULL OR public.cc_unit_visible(unit_id)));

-- reading_id-scoped tables
DROP POLICY IF EXISTS auth_read_curriculum_vocabulary ON curriculum_vocabulary;
CREATE POLICY auth_read_curriculum_vocabulary ON curriculum_vocabulary FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_reading_visible(reading_id));
DROP POLICY IF EXISTS auth_read_curriculum_comprehension_questions ON curriculum_comprehension_questions;
CREATE POLICY auth_read_curriculum_comprehension_questions ON curriculum_comprehension_questions FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_reading_visible(reading_id));
DROP POLICY IF EXISTS auth_read_curriculum_vocabulary_exercises ON curriculum_vocabulary_exercises;
CREATE POLICY auth_read_curriculum_vocabulary_exercises ON curriculum_vocabulary_exercises FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_reading_visible(reading_id));

-- grammar_id-scoped table
DROP POLICY IF EXISTS auth_read_curriculum_grammar_exercises ON curriculum_grammar_exercises;
CREATE POLICY auth_read_curriculum_grammar_exercises ON curriculum_grammar_exercises FOR SELECT TO public
USING (auth.role() = 'authenticated'::text AND public.cc_grammar_visible(grammar_id));

-- NOTE: curriculum_listening_exercises is a level-scoped shared YouTube bank (no unit_id/reading_id),
-- so it can never hold custom-unit content and is intentionally left with its public read policy.
