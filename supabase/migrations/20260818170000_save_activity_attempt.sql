-- ============================================================================
-- ONE WRITE PATH FOR STUDENT ACTIVITY WORK
--
-- Every "I did the section and it didn't show" incident traced back to the same
-- structural gap: seven bespoke client save paths, no server-side contract, and
-- no way to tell a lost answer from an answer never given. This migration moves
-- the contract into the database.
--
--   1. de-duplicate the rows the old race produced (archived, never dropped)
--   2. activity_ref  — one identity column for every section shape
--   3. UNIQUE keys   — duplicate attempt rows become impossible, not just rare
--   4. updated_at    — actually maintained (it never was)
--   5. save_activity_attempt() — the single, idempotent, verified write
--   6. activity_feed — RLS on with ZERO policies: reads empty, writes 403
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Archive + collapse duplicate attempt rows
--    Two groups exist (منار grammar attempt 2, مصعب speaking attempt 1), both
--    created ~0.1ms apart by the autosave INSERT race. Nothing is deleted
--    without a copy: the loser rows are archived first, so this is reversible.
-- ---------------------------------------------------------------------------
-- Archived as jsonb rather than a mirrored table: a mirror silently breaks the
-- moment the parent gains a column (it did — activity_ref, below).
create table if not exists public.scp_row_archive (
  id              uuid primary key,
  archived_at     timestamptz not null default now(),
  archived_reason text,
  row_data        jsonb not null
);

alter table public.scp_row_archive enable row level security;
drop policy if exists scp_archive_service on public.scp_row_archive;
create policy scp_archive_service on public.scp_row_archive
  for all using (auth.role() = 'service_role');

-- Carry over anything the first cut of this migration archived, then retire it.
do $$
begin
  if to_regclass('public.student_curriculum_progress_dupe_archive') is not null then
    insert into public.scp_row_archive (id, archived_at, archived_reason, row_data)
    select a.id, a.archived_at, a.archived_reason, to_jsonb(a)
      from public.student_curriculum_progress_dupe_archive a
    on conflict (id) do nothing;
    drop table public.student_curriculum_progress_dupe_archive;
  end if;
end $$;

-- How many answers a payload actually holds, across all three stored shapes.
-- IMMUTABLE so it can be used in index/where clauses and stays cheap.
create or replace function public.scp_answer_count(p jsonb)
returns integer
language sql
immutable
parallel safe
as $$
  select case
    when p is null or jsonb_typeof(p) <> 'object' then 0
    -- vocabulary_exercise: { exercises: { drillKey: {...} } } — an OBJECT
    when p ? 'exercises' and jsonb_typeof(p->'exercises') = 'object' then
      (select count(*)::int from jsonb_object_keys(p->'exercises'))
    -- grammar: { exercises: [ { studentAnswer } ] }
    when p ? 'exercises' and jsonb_typeof(p->'exercises') = 'array' then (
      select count(*)::int from jsonb_array_elements(p->'exercises') e
      where e->>'studentAnswer' is not null and e->>'studentAnswer' <> ''
    )
    -- listening: { questions: [ { studentAnswer } ] }
    when p ? 'questions' and jsonb_typeof(p->'questions') = 'array' then (
      select count(*)::int from jsonb_array_elements(p->'questions') e
      where e->>'studentAnswer' is not null and e->>'studentAnswer' <> ''
    )
    -- writing: a single draft
    when p ? 'draft' then (case when coalesce(p->>'draft','') = '' then 0 else 1 end)
    -- reading: flat { [questionId]: answer }
    else (select count(*)::int from jsonb_object_keys(p))
  end;
$$;

with keyed as (
  select id, student_id, section_type, attempt_number, status, score, answers, created_at,
         coalesce(reading_id, grammar_id, listening_id, writing_id,
                  speaking_id, assessment_id, pronunciation_id, unit_id) as ref
  from public.student_curriculum_progress
),
ranked as (
  select id, row_number() over (
      partition by student_id, section_type, ref, attempt_number
      order by (status = 'completed') desc,
               public.scp_answer_count(answers) desc,
               (score is not null) desc,
               created_at desc
    ) as rn
  from keyed
),
losers as (select id from ranked where rn > 1)
insert into public.scp_row_archive (id, archived_reason, row_data)
select p.id, 'autosave INSERT race — collapsed by 20260818170000', to_jsonb(p)
from public.student_curriculum_progress p join losers l on l.id = p.id
on conflict (id) do nothing;

delete from public.student_curriculum_progress p
using public.scp_row_archive a
where a.id = p.id
  and a.archived_reason = 'autosave INSERT race — collapsed by 20260818170000';

-- ---------------------------------------------------------------------------
-- 2. activity_ref — one identity for every section shape
--    reading/grammar/listening/writing carry an activity id; speaking,
--    vocabulary, vocabulary_exercise and pronunciation carry none and are
--    identified by their unit. This collapses both cases into one column.
-- ---------------------------------------------------------------------------
alter table public.student_curriculum_progress
  add column if not exists activity_ref uuid
  generated always as (
    coalesce(reading_id, grammar_id, listening_id, writing_id,
             speaking_id, assessment_id, pronunciation_id, unit_id)
  ) stored;

-- ---------------------------------------------------------------------------
-- 3. The keys that make a duplicate impossible
--    Writing keeps SINGLE-row semantics (its loader uses .maybeSingle() and its
--    attempt_number is a counter on one row), so it keeps its own unique key
--    and is excluded here.
-- ---------------------------------------------------------------------------
create unique index if not exists scp_unique_attempt
  on public.student_curriculum_progress (student_id, section_type, activity_ref, attempt_number)
  where section_type <> 'writing';

-- ---------------------------------------------------------------------------
-- 4. updated_at was never maintained — no trigger existed, so every row still
--    reported its INSERT time after any number of PATCHes. Every "last active"
--    report built on it was wrong.
-- ---------------------------------------------------------------------------
create or replace function public.scp_touch_updated_at()
returns trigger language plpgsql as $$
begin
  -- clock_timestamp(), not now(): now() is the TRANSACTION start time, so a row
  -- written and updated in one transaction reports an unchanged updated_at.
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists trg_scp_touch_updated_at on public.student_curriculum_progress;
create trigger trg_scp_touch_updated_at
  before update on public.student_curriculum_progress
  for each row execute function public.scp_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. save_activity_attempt() — the single write path
--
-- Guarantees the client cannot provide:
--   * idempotent      — keyed on (student, section, activity, attempt), so a
--                       retried or raced call updates, never duplicates
--   * never shrinks   — an autosave carrying FEWER answers than the row already
--                       holds keeps the richer payload. A stale flush landing
--                       late can no longer erase newer work.
--   * never downgrades— an in_progress write can never reopen or overwrite an
--                       attempt already submitted
--   * atomic flags    — is_best / is_latest are recomputed in the SAME
--                       transaction as the write, so a completion can never be
--                       left invisible to compute_unit_progress
--   * proven          — returns the persisted row, so the caller verifies
--                       against reality instead of trusting HTTP 200
--
-- Authorization is POSITIVE: service_role, or the student herself. auth.uid()
-- IS NULL is anon, never service_role. Admin impersonation keeps the ADMIN's
-- JWT, so "view as student" is structurally unable to write to a student's
-- record — the readOnly guard is now enforced by the database, not by the UI.
-- ---------------------------------------------------------------------------
drop function if exists public.save_activity_attempt(
  uuid, uuid, text, uuid, jsonb, boolean, numeric, integer, integer, boolean, jsonb);

create or replace function public.save_activity_attempt(
  p_student_id     uuid,
  p_unit_id        uuid,
  p_section_type   text,
  p_activity_id    uuid    default null,
  p_answers        jsonb   default '{}'::jsonb,
  p_submit         boolean default false,
  p_score          numeric default null,
  p_time_spent     integer default null,
  p_attempt_number integer default null,
  p_new_attempt    boolean default false,
  p_write_score    boolean default false,
  p_extra          jsonb   default '{}'::jsonb
)
returns public.student_curriculum_progress
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- COALESCE is load-bearing. With no JWT claims at all, auth.role() is NULL, so
  -- `auth.role() = 'service_role'` is NULL — and `not (NULL or false)` is NULL,
  -- which is not TRUE, so the guard below would silently NOT fire and an
  -- unauthenticated caller would be allowed through. Three-valued logic turns a
  -- correct-looking positive gate into an open door.
  v_caller     uuid    := auth.uid();
  v_is_service boolean := coalesce(auth.role() = 'service_role', false);
  v_is_writing boolean := (p_section_type = 'writing');
  v_ref        uuid;
  v_attempt    integer;
  v_existing   public.student_curriculum_progress;
  v_row        public.student_curriculum_progress;
  v_answers    jsonb;
  v_status     text;
  v_best_id    uuid;
begin
  if p_section_type is null or p_section_type not in (
       'reading','grammar','listening','writing',
       'speaking','vocabulary','vocabulary_exercise','pronunciation') then
    raise exception 'save_activity_attempt: unsupported section_type %', p_section_type
      using errcode = '22023';
  end if;

  if p_student_id is null or p_unit_id is null then
    raise exception 'save_activity_attempt: student_id and unit_id are required'
      using errcode = '22023';
  end if;

  if v_is_service is not true
     and (v_caller is null or v_caller is distinct from p_student_id) then
    raise exception 'save_activity_attempt: not allowed to write this student''s work'
      using errcode = '42501';
  end if;

  -- Existence only — deliberately NOT `deleted_at is null`. Soft-deleted
  -- accounts still sign in (the mock test accounts do, and so do a few former
  -- students), and RLS never blocked their writes. Refusing them here would
  -- silently drop answers from someone holding a valid session — the exact
  -- failure this pass exists to end. Access belongs at the login/subscription
  -- gate; if she can log in and answer, her work gets saved.
  if not exists (select 1 from public.students s where s.id = p_student_id) then
    raise exception 'save_activity_attempt: unknown student'
      using errcode = '42501';
  end if;

  v_ref := coalesce(p_activity_id, p_unit_id);

  -- ---- resolve the attempt -------------------------------------------------
  -- Attempt bookkeeping lived in the client, where two autosaves in one tick
  -- both read a stale value. It is resolved here, under the row lock, instead.
  if v_is_writing then
    select * into v_existing from public.student_curriculum_progress
     where student_id = p_student_id and writing_id = v_ref
     for update;
    v_attempt := coalesce(p_attempt_number, v_existing.attempt_number, 1);
  else
    if p_new_attempt then
      select coalesce(max(attempt_number), 0) + 1 into v_attempt
        from public.student_curriculum_progress
       where student_id = p_student_id and section_type = p_section_type
         and activity_ref = v_ref;
    else
      v_attempt := coalesce(
        p_attempt_number,
        (select max(attempt_number) from public.student_curriculum_progress
          where student_id = p_student_id and section_type = p_section_type
            and activity_ref = v_ref),
        1);
    end if;

    select * into v_existing from public.student_curriculum_progress
     where student_id = p_student_id and section_type = p_section_type
       and activity_ref = v_ref and attempt_number = v_attempt
     for update;
  end if;

  -- ---- never downgrade a submitted attempt --------------------------------
  if v_existing.id is not null and v_existing.status = 'completed' and not p_submit then
    return v_existing;
  end if;

  -- ---- never shrink ---------------------------------------------------------
  v_answers := coalesce(p_answers, '{}'::jsonb);
  if v_existing.id is not null
     and public.scp_answer_count(v_answers) < public.scp_answer_count(v_existing.answers) then
    v_answers := v_existing.answers;
  end if;

  v_status := case when p_submit then 'completed' else 'in_progress' end;

  if v_existing.id is not null then
    update public.student_curriculum_progress set
      unit_id             = p_unit_id,
      status              = v_status,
      answers             = v_answers,
      score               = case when p_submit or coalesce(p_write_score, false)
                                 then coalesce(p_score, score) else score end,
      time_spent_seconds  = greatest(coalesce(p_time_spent, time_spent_seconds, 0),
                                     coalesce(time_spent_seconds, 0)),
      completed_at        = case when p_submit then coalesce(completed_at, now()) else completed_at end,
      is_latest           = true,
      recording_url       = coalesce(p_extra->>'recording_url', recording_url),
      ai_feedback         = coalesce(p_extra->'ai_feedback', ai_feedback),
      hint_usage          = coalesce(p_extra->'hint_usage', hint_usage),
      evaluation_status   = coalesce(p_extra->>'evaluation_status', evaluation_status),
      evaluation_attempts = coalesce((p_extra->>'evaluation_attempts')::int, evaluation_attempts),
      evaluation_last_error = case when p_extra ? 'evaluation_last_error'
                                   then p_extra->>'evaluation_last_error'
                                   else evaluation_last_error end
    where id = v_existing.id
    returning * into v_row;
  else
    insert into public.student_curriculum_progress (
      student_id, unit_id, section_type,
      reading_id, grammar_id, listening_id, writing_id, speaking_id, pronunciation_id,
      status, answers, score, time_spent_seconds, completed_at,
      attempt_number, is_latest, is_best,
      recording_url, ai_feedback, hint_usage,
      evaluation_status, evaluation_attempts, evaluation_last_error
    ) values (
      p_student_id, p_unit_id, p_section_type,
      case when p_section_type = 'reading'   then p_activity_id end,
      case when p_section_type = 'grammar'   then p_activity_id end,
      case when p_section_type = 'listening' then p_activity_id end,
      case when p_section_type = 'writing'   then p_activity_id end,
      case when p_section_type = 'speaking'  then p_activity_id end,
      case when p_section_type = 'pronunciation' then p_activity_id end,
      v_status, v_answers,
      case when p_submit or coalesce(p_write_score, false) then p_score end,
      coalesce(p_time_spent, 0),
      case when p_submit then now() end,
      v_attempt, true, false,
      -- hint_usage is NOT NULL DEFAULT '[]'; passing an explicit NULL overrides
      -- the default and trips the constraint, so coalesce it here.
      p_extra->>'recording_url', p_extra->'ai_feedback',
      coalesce(p_extra->'hint_usage', '[]'::jsonb),
      p_extra->>'evaluation_status',
      coalesce((p_extra->>'evaluation_attempts')::int, 0),
      p_extra->>'evaluation_last_error'
    )
    returning * into v_row;
  end if;

  -- ---- flags, in the same transaction as the write -------------------------
  -- Doing this client-side meant a failed second write could leave every row
  -- is_best = false, making a real completion invisible to the progress engine.
  update public.student_curriculum_progress
     set is_latest = false
   where student_id = p_student_id and section_type = p_section_type
     and activity_ref = v_ref and id <> v_row.id and is_latest;

  if p_submit then
    select id into v_best_id
      from public.student_curriculum_progress
     where student_id = p_student_id and section_type = p_section_type
       and activity_ref = v_ref and status = 'completed'
     order by score desc nulls last, attempt_number desc
     limit 1;

    if v_best_id is not null then
      update public.student_curriculum_progress
         set is_best = (id = v_best_id)
       where student_id = p_student_id and section_type = p_section_type
         and activity_ref = v_ref
         and is_best <> (id = v_best_id);
    end if;

    select * into v_row from public.student_curriculum_progress where id = v_row.id;
  end if;

  return v_row;
end;
$$;

revoke all on function public.save_activity_attempt(
  uuid, uuid, text, uuid, jsonb, boolean, numeric, integer, integer, boolean, boolean, jsonb) from public, anon;
grant execute on function public.save_activity_attempt(
  uuid, uuid, text, uuid, jsonb, boolean, numeric, integer, integer, boolean, boolean, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. activity_feed: RLS was enabled with NO policies at all, so every student
--    read returned an empty list (200, silently) and every write was a 403.
--    نورة's session threw three of them on Aug 16. The whole feed was dead.
-- ---------------------------------------------------------------------------
drop policy if exists activity_feed_service on public.activity_feed;
create policy activity_feed_service on public.activity_feed
  for all using (auth.role() = 'service_role');

drop policy if exists activity_feed_staff_read on public.activity_feed;
create policy activity_feed_staff_read on public.activity_feed
  for select using (
    exists (select 1 from public.profiles p
             where p.id = auth.uid() and p.role in ('admin','trainer'))
  );

-- A student sees her own events and her group's; she may only write her own.
drop policy if exists activity_feed_student_read on public.activity_feed;
create policy activity_feed_student_read on public.activity_feed
  for select using (
    student_id = auth.uid()
    or group_id in (select s.group_id from public.students s
                     where s.id = auth.uid() and s.group_id is not null)
  );

drop policy if exists activity_feed_student_insert on public.activity_feed;
create policy activity_feed_student_insert on public.activity_feed
  for insert with check (student_id = auth.uid());
