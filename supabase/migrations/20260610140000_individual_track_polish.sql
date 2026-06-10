-- INDIVIDUAL TRACK — code-review follow-ups
-- 1. Trainer visibility: individual students have group_id NULL by design, so the
--    group-join SELECT policy could never match. The 1-on-1 trainer is linked via
--    students.assigned_trainer_id (column exists; FK was dropped 2026-06-01) —
--    grant SELECT through that path so the promised "مدربك سيطلع عليها" is real.
-- 2. track_complete_stage: a student could complete modules of a DIFFERENT
--    specialization via direct RPC — now gated to their own assigned track.
-- 3. specialization_modules.vocab_count: real per-module term count (generated)
--    so dashboard KPIs don't assume "10 terms per module" for future personas.

drop policy if exists smp_trainer_assigned_select on public.specialization_module_progress;
create policy smp_trainer_assigned_select on public.specialization_module_progress
  for select using (
    exists (
      select 1 from public.students s
      where s.id = specialization_module_progress.student_id
        and s.assigned_trainer_id = auth.uid()
    )
  );

alter table public.specialization_modules
  add column if not exists vocab_count int generated always as (jsonb_array_length(vocabulary)) stored;

create or replace function public.track_complete_stage(
  p_module_id uuid,
  p_stage text,
  p_extra jsonb default '{}'::jsonb
) returns public.specialization_module_progress
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_extra jsonb := '{}'::jsonb;
  v_row public.specialization_module_progress;
  v_all_done boolean;
begin
  if v_student is null then
    raise exception 'not authenticated';
  end if;
  if p_stage not in ('brief','vocab','phrases','writing') then
    raise exception 'invalid stage';
  end if;
  -- the module must be published AND belong to the student's OWN assigned track
  if not exists (
    select 1
    from public.specialization_modules m
    join public.students st on st.id = v_student
    where m.id = p_module_id
      and m.is_published = true
      and m.specialization_id = st.specialization_id
  ) then
    raise exception 'module not found';
  end if;

  if p_stage = 'writing' then
    v_extra := jsonb_strip_nulls(jsonb_build_object(
      'text',  left(coalesce(p_extra->>'text', ''), 8000),
      'words', coalesce((p_extra->>'words')::int, 0)
    ));
  end if;

  insert into public.specialization_module_progress (student_id, module_id, stage_state, updated_at)
  values (
    v_student, p_module_id,
    jsonb_build_object(p_stage, jsonb_build_object('done', true, 'at', now()) || v_extra),
    now()
  )
  on conflict (student_id, module_id) where deleted_at is null
  do update set
    stage_state = specialization_module_progress.stage_state
      || jsonb_build_object(p_stage, jsonb_build_object('done', true, 'at', now()) || v_extra),
    updated_at = now()
  returning * into v_row;

  v_all_done := (v_row.stage_state ? 'brief')   and (v_row.stage_state->'brief'->>'done')::boolean
            and (v_row.stage_state ? 'vocab')   and (v_row.stage_state->'vocab'->>'done')::boolean
            and (v_row.stage_state ? 'phrases') and (v_row.stage_state->'phrases'->>'done')::boolean
            and (v_row.stage_state ? 'roleplay') and (v_row.stage_state->'roleplay'->>'done')::boolean
            and (v_row.stage_state ? 'writing') and (v_row.stage_state->'writing'->>'done')::boolean;
  if v_all_done and v_row.status <> 'completed' then
    update public.specialization_module_progress
      set status = 'completed', completed_at = now(), updated_at = now()
      where id = v_row.id
      returning * into v_row;
  end if;

  return v_row;
end $$;
