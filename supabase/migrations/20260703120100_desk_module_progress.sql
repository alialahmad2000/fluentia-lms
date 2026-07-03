-- Pro Desk — Stage 1e: per-student progress for authored scenarios
-- (specialization_modules), plus server-authoritative RPCs. Mirrors the
-- speaking_conversations RLS pattern but STRICTER: students may only SELECT their
-- own rows — every write goes through a SECURITY DEFINER RPC that derives the
-- student from auth.uid(), so a student can never write another student's row
-- (a forged cross-student call raises 42501 / does nothing). Staff impersonation
-- swaps the real session (auth.uid() = target) via the `impersonate` edge fn, so
-- the same RPCs write correctly for an admin viewing-as a student.
--
-- Applied to prod via the Management API on 2026-07-03.

-- ── Table ───────────────────────────────────────────────────────────────────
create table if not exists public.desk_module_progress (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.students(id) on delete cascade,
  module_id            uuid not null references public.specialization_modules(id) on delete cascade,
  status               text not null default 'in_progress' check (status in ('in_progress','completed')),
  -- which stages the learner has finished, e.g. {"brief":true,"vocab":true,"roleplay":true}
  stage_state          jsonb not null default '{}'::jsonb,
  best_conversation_id uuid references public.speaking_conversations(id) on delete set null,
  best_score           numeric,
  started_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  completed_at         timestamptz,
  deleted_at           timestamptz,
  unique (student_id, module_id)
);

create index if not exists idx_desk_progress_student on public.desk_module_progress (student_id) where deleted_at is null;

alter table public.desk_module_progress enable row level security;

-- SELECT: own rows, the student's trainer (via group), or any admin.
drop policy if exists dmp_student_select on public.desk_module_progress;
create policy dmp_student_select on public.desk_module_progress
  for select using (student_id = auth.uid());

drop policy if exists dmp_trainer_select on public.desk_module_progress;
create policy dmp_trainer_select on public.desk_module_progress
  for select using (exists (
    select 1 from public.students s
    join public.groups g on g.id = s.group_id
    where s.id = desk_module_progress.student_id and g.trainer_id = auth.uid()
  ));

drop policy if exists dmp_admin_all on public.desk_module_progress;
create policy dmp_admin_all on public.desk_module_progress
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists dmp_service_all on public.desk_module_progress;
create policy dmp_service_all on public.desk_module_progress
  for all using (auth.role() = 'service_role');
-- NO student INSERT/UPDATE/DELETE policies — writes are RPC-only (below).

-- ── RPCs (server-authoritative, student derived from auth.uid()) ─────────────

-- Begin (or resume) a scenario. Idempotent.
create or replace function public.desk_start_scenario(p_module_id uuid)
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
  if not exists (select 1 from public.specialization_modules where id = p_module_id) then
    raise exception 'module not found' using errcode = 'P0002';
  end if;

  insert into public.desk_module_progress (student_id, module_id, status)
  values (v_student, p_module_id, 'in_progress')
  on conflict (student_id, module_id) do update
    set updated_at = now(), deleted_at = null
  returning * into v_row;

  return v_row;
end;
$fn$;

-- Mark a stage done. Whitelisted stages only. Merges into stage_state.
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

  -- The live roleplay is the core deliverable: finishing it completes the scenario.
  if p_stage = 'roleplay' and v_row.status <> 'completed' then
    update public.desk_module_progress
      set status = 'completed', completed_at = now(), updated_at = now()
      where id = v_row.id
      returning * into v_row;
  end if;

  return v_row;
end;
$fn$;

-- Link a graded roleplay conversation to the scenario (called after grading).
-- Validates the conversation belongs to the caller before copying its score.
create or replace function public.desk_mark_roleplay(
  p_module_id uuid,
  p_conversation_id uuid
)
returns public.desk_module_progress
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_student uuid := auth.uid();
  v_score numeric;
  v_owner uuid;
  v_row public.desk_module_progress;
begin
  if v_student is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select student_id, score into v_owner, v_score
    from public.speaking_conversations where id = p_conversation_id;
  if v_owner is null then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  if v_owner <> v_student then
    raise exception 'conversation does not belong to caller' using errcode = '42501';
  end if;

  insert into public.desk_module_progress
    (student_id, module_id, status, stage_state, best_conversation_id, best_score, completed_at)
  values
    (v_student, p_module_id, 'completed',
     jsonb_build_object('roleplay', true), p_conversation_id, v_score, now())
  on conflict (student_id, module_id) do update
    set stage_state = public.desk_module_progress.stage_state || jsonb_build_object('roleplay', true),
        status = 'completed',
        completed_at = coalesce(public.desk_module_progress.completed_at, now()),
        best_conversation_id = case
          when public.desk_module_progress.best_score is null
            or coalesce(excluded.best_score, -1) > public.desk_module_progress.best_score
          then excluded.best_conversation_id
          else public.desk_module_progress.best_conversation_id end,
        best_score = greatest(coalesce(public.desk_module_progress.best_score, -1), coalesce(excluded.best_score, -1)),
        updated_at = now(),
        deleted_at = null
  returning * into v_row;

  return v_row;
end;
$fn$;

grant execute on function public.desk_start_scenario(uuid) to authenticated;
grant execute on function public.desk_complete_stage(uuid, text, jsonb) to authenticated;
grant execute on function public.desk_mark_roleplay(uuid, uuid) to authenticated;
