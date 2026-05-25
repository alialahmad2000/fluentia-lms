-- Teacher-preview flag: lets a student account click into curriculum levels
-- BELOW their academic_level (for staff studying the curriculum). Default false
-- = zero behavior change for every existing student.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS can_access_lower_levels boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.students.can_access_lower_levels IS
  'When true, the student can click into curriculum levels BELOW their academic_level (staff/teacher-preview accounts). Default false = normal student behavior.';
