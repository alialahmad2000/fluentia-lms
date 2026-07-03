-- Pro Desk — Stage 1 hardening, from the rls-security-auditor pass (verdict SAFE; these
-- are the LOW/defense-in-depth items). Applied to prod via the Management API 2026-07-03.

-- (1) These RPCs are SECURITY DEFINER; the null-check on auth.uid() is the sole barrier for
--     anon (which got EXECUTE via Postgres's default PUBLIC grant). Revoke it — belt & braces.
revoke execute on function public.desk_start_scenario(uuid) from public, anon;
revoke execute on function public.desk_complete_stage(uuid, text, jsonb) from public, anon;
revoke execute on function public.desk_mark_roleplay(uuid, uuid) from public, anon;

-- (2) Completion must require a REAL graded roleplay. desk_complete_stage now only merges
--     stage_state and never flips status to 'completed' — completion is owned solely by
--     desk_mark_roleplay (which validates conversation ownership + records the score).
create or replace function public.desk_complete_stage(
  p_module_id uuid,
  p_stage text,
  p_payload jsonb default '{}'::jsonb
)
returns public.desk_module_progress
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_student uuid := auth.uid();
  v_row public.desk_module_progress;
begin
  if v_student is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_stage not in ('brief','vocab','phrases','roleplay','writing','drill') then
    raise exception 'invalid stage: %', p_stage using errcode = '22023';
  end if;

  insert into public.desk_module_progress (student_id, module_id, status, stage_state)
  values (v_student, p_module_id, 'in_progress',
          jsonb_build_object(p_stage, true) || coalesce(p_payload, '{}'::jsonb))
  on conflict (student_id, module_id) do update
    set stage_state = public.desk_module_progress.stage_state
                       || jsonb_build_object(p_stage, true)
                       || coalesce(p_payload, '{}'::jsonb),
        updated_at = now(),
        deleted_at = null
  returning * into v_row;

  return v_row;
end;
$fn$;
grant execute on function public.desk_complete_stage(uuid, text, jsonb) to authenticated;

-- (3) 1-on-1 audience: the group-based trainer SELECT never matches individual students
--     (group_id NULL). Add the assigned_trainer_id path so Sara's assigned trainer can
--     monitor her Desk progress. Still SELECT-only, still no student write path.
drop policy if exists dmp_trainer_select on public.desk_module_progress;
create policy dmp_trainer_select on public.desk_module_progress
  for select using (exists (
    select 1 from public.students s
    where s.id = desk_module_progress.student_id
      and (
        s.assigned_trainer_id = auth.uid()
        or exists (select 1 from public.groups g where g.id = s.group_id and g.trainer_id = auth.uid())
      )
  ));
