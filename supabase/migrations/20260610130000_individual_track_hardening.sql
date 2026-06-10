-- INDIVIDUAL TRACK — security hardening (audit findings MED-1/2/3, LOW-1/2/3)
--
-- MED-1: students could forge their own module progress/score via direct REST.
--   → progress writes become server-authoritative: clients call track_complete_stage()
--     (whitelisted stages, no client score, atomic jsonb merge); direct INSERT/UPDATE
--     policies for students are dropped. Roleplay completion is written ONLY by the
--     grade edge fn via track_mark_roleplay() (service_role-gated).
-- MED-2: a student could self-flip students.study_mode/specialization_id.
--   → BEFORE UPDATE trigger: those two columns change only for admins (or service paths).
-- MED-3: read-merge-write race between client stage writes and the grade fn.
--   → both paths now merge stage_state in ONE SQL statement.
-- LOW-1: trainer-of-group SELECT on module progress (template parity).
-- LOW-2: explicit WITH CHECK on sc_student_update.
-- LOW-3: unique(student_id,module_id) → partial unique index (deleted_at IS NULL).

-- ── LOW-3: soft-delete-aware uniqueness ─────────────────────────────────────
alter table public.specialization_module_progress
  drop constraint if exists specialization_module_progress_student_id_module_id_key;
create unique index if not exists uq_smp_student_module_live
  on public.specialization_module_progress (student_id, module_id)
  where deleted_at is null;

-- ── MED-1: drop direct student write policies (reads stay) ──────────────────
drop policy if exists smp_student_insert on public.specialization_module_progress;
drop policy if exists smp_student_update on public.specialization_module_progress;

-- ── LOW-1: trainer-of-group SELECT (future-proof parity with speaking_conversations) ──
drop policy if exists smp_trainer_select on public.specialization_module_progress;
create policy smp_trainer_select on public.specialization_module_progress
  for select using (
    exists (
      select 1 from public.students s
      join public.groups g on g.id = s.group_id
      where s.id = specialization_module_progress.student_id and g.trainer_id = auth.uid()
    )
  );

-- ── MED-1 + MED-3: atomic, whitelisted client stage completion ──────────────
-- Students may complete brief/vocab/phrases/writing for THEMSELVES only.
-- 'roleplay' (and any score) is rejected — that is the grade edge fn's job.
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
  if not exists (
    select 1 from public.specialization_modules m
    where m.id = p_module_id and m.is_published = true
  ) then
    raise exception 'module not found';
  end if;

  -- sanitize extra: only the writing payload is accepted, nothing else
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
revoke all on function public.track_complete_stage(uuid, text, jsonb) from public;
grant execute on function public.track_complete_stage(uuid, text, jsonb) to authenticated;

-- ── MED-3: atomic roleplay completion, callable ONLY by the service role ────
create or replace function public.track_mark_roleplay(
  p_student_id uuid,
  p_module_id uuid,
  p_score numeric,
  p_conversation_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row public.specialization_module_progress;
  v_all_done boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role only';
  end if;

  insert into public.specialization_module_progress (student_id, module_id, stage_state, score, updated_at)
  values (
    p_student_id, p_module_id,
    jsonb_build_object('roleplay', jsonb_build_object('done', true, 'at', now(), 'score', p_score, 'conversation_id', p_conversation_id)),
    p_score, now()
  )
  on conflict (student_id, module_id) where deleted_at is null
  do update set
    stage_state = specialization_module_progress.stage_state
      || jsonb_build_object('roleplay', jsonb_build_object('done', true, 'at', now(), 'score', p_score, 'conversation_id', p_conversation_id)),
    score = p_score,
    updated_at = now()
  returning * into v_row;

  v_all_done := (v_row.stage_state->'brief'->>'done')::boolean is true
            and (v_row.stage_state->'vocab'->>'done')::boolean is true
            and (v_row.stage_state->'phrases'->>'done')::boolean is true
            and (v_row.stage_state->'roleplay'->>'done')::boolean is true
            and (v_row.stage_state->'writing'->>'done')::boolean is true;
  if v_all_done and v_row.status <> 'completed' then
    update public.specialization_module_progress
      set status = 'completed', completed_at = now(), updated_at = now()
      where id = v_row.id;
  end if;
end $$;
revoke all on function public.track_mark_roleplay(uuid, uuid, numeric, uuid) from public;
grant execute on function public.track_mark_roleplay(uuid, uuid, numeric, uuid) to service_role;

-- ── MED-2: study_mode / specialization_id are admin-only post-creation ──────
create or replace function public.guard_student_account_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.study_mode is distinct from old.study_mode)
     or (new.specialization_id is distinct from old.specialization_id) then
    -- service paths (edge fns, mgmt scripts) have no auth.uid(); admins pass the check
    if auth.uid() is not null and not exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    ) then
      raise exception 'account type changes are admin-only';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_student_account on public.students;
create trigger trg_guard_student_account
  before update on public.students
  for each row execute function public.guard_student_account_columns();

-- ── LOW-2: explicit WITH CHECK on the conversations student-update policy ───
drop policy if exists sc_student_update on public.speaking_conversations;
create policy sc_student_update on public.speaking_conversations
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());
