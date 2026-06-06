-- Teacher roster control: move a student between the teacher's OWN groups.
-- RLS already scopes students_update to the trainer's groups, but it is
-- column-unrestricted. This SECURITY DEFINER RPC constrains the write to
-- group_id only and double-checks both source and destination belong to the
-- calling teacher (or an admin).
CREATE OR REPLACE FUNCTION public.trainer_move_student(p_student uuid, p_to_group uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from uuid;
  v_groups uuid[];
BEGIN
  IF NOT (is_trainer() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT group_id INTO v_from FROM students WHERE id = p_student;
  IF v_from IS NULL THEN
    RAISE EXCEPTION 'student has no group';
  END IF;

  IF NOT is_admin() THEN
    v_groups := get_trainer_group_ids();
    IF NOT (v_from = ANY(v_groups)) OR NOT (p_to_group = ANY(v_groups)) THEN
      RAISE EXCEPTION 'move not permitted: both groups must belong to you';
    END IF;
  END IF;

  -- Destination must be a real group
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = p_to_group) THEN
    RAISE EXCEPTION 'destination group not found';
  END IF;

  UPDATE students SET group_id = p_to_group WHERE id = p_student;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trainer_move_student(uuid, uuid) TO authenticated;
