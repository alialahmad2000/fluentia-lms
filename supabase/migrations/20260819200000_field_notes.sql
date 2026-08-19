-- «دفتر الميدان» — Field Notes: the reusable, owner-scoped engine for corrections
-- captured from a student's REAL working life (a client WhatsApp thread, a meeting,
-- a work email) rather than from the curriculum. One note = one real mistake or one
-- real phrasing upgrade, with the rule in Arabic, the natural native alternative,
-- and drills that keep resurfacing it until it is genuinely owned.
--
-- Built ONCE and gated per student (students.uses_field_notes), exactly like the
-- «عبارات جاهزة» phrase bank (20260728120000_phrase_bank.sql). Every future private
-- student gets the whole feature with zero new code — only new rows.
--
-- CONVENTIONS DELIBERATELY MIRRORED FROM THE PHRASE BANK:
--   • owner column is `student_id uuid references profiles(id)` (there is no
--     students.profile_id — students.id IS profiles.id IS auth.uid()).
--   • students get SELECT on their own rows and NOTHING else; the only write path
--     for a student is the SECURITY DEFINER RPC below, which gates POSITIVELY on
--     ownership (auth.uid() is also NULL for anon, so "no uid" is never trusted).
--   • staff (admin/trainer) get full access so the admin console can author notes.
--
-- NOTE ON `field_note_exercises.answer`: it is readable by the owning student.
-- That is intended, not an oversight — grading runs client-side through the app's
-- existing answerValidator (no runtime API call anywhere in this feature), and the
-- correct sentence is already printed on the note card above the drill. This is a
-- study surface, not an exam; nothing is being protected.

-- ── entitlement flag ────────────────────────────────────────────────────────
alter table students add column if not exists uses_field_notes boolean not null default false;

-- ── notes ───────────────────────────────────────────────────────────────────
create table if not exists field_notes (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references profiles(id) on delete cascade,
  created_by            uuid references profiles(id) on delete set null,  -- the trainer
  occurred_on           date,                    -- when the real conversation happened
  context_label         text,                    -- e.g. «محادثة عميل — واتساب»
  note_type             text not null default 'error'
                          check (note_type in ('error','upgrade','spelling','register')),
  original_text         text,                    -- verbatim; NULL for a pure `upgrade`
  corrected_text        text not null,
  natural_text          text,                    -- what a native would actually say
  rule_title_ar         text not null,
  rule_explanation_ar   text not null,
  why_it_matters_ar     text,
  audio_url             text,
  status                text not null default 'new'
                          check (status in ('new','practicing','mastered')),
  mastered_at           timestamptz,
  next_review_at        timestamptz,
  -- mastery bookkeeping: a "clean session" = every exercise on the note answered
  -- correctly, with no miss, inside one sitting. Two of them ≥3 days apart = mastered.
  clean_session_count   int  not null default 0,
  last_clean_session_on date,
  sort_order            int  not null default 0,
  -- ⚠ default TRUE on purpose. A `false` default on a published-content table caused
  -- a zero-row outage on this platform before: content was seeded, nothing rendered.
  is_published          boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists field_notes_student_idx
  on field_notes(student_id, is_published, sort_order desc, created_at desc);
create index if not exists field_notes_due_idx
  on field_notes(student_id, status, next_review_at);

-- ── exercises ───────────────────────────────────────────────────────────────
create table if not exists field_note_exercises (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references field_notes(id) on delete cascade,
  kind       text not null default 'correct_the_error'
               check (kind in ('correct_the_error','gap_fill','choose','rewrite')),
  prompt     text not null,
  answer     text not null,
  options    jsonb,        -- for `choose`
  hint_ar    text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists field_note_exercises_note_idx
  on field_note_exercises(note_id, sort_order);

-- ── attempts ────────────────────────────────────────────────────────────────
create table if not exists field_note_attempts (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references field_notes(id) on delete cascade,
  exercise_id uuid not null references field_note_exercises(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  response    text,
  is_correct  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists field_note_attempts_note_idx
  on field_note_attempts(student_id, note_id, created_at desc);

-- ── updated_at ──────────────────────────────────────────────────────────────
create or replace function field_notes_touch() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_field_notes_touch on field_notes;
create trigger trg_field_notes_touch before update on field_notes
  for each row execute function field_notes_touch();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table field_notes          enable row level security;
alter table field_note_exercises enable row level security;
alter table field_note_attempts  enable row level security;

-- Students: SELECT own PUBLISHED notes only. Staff: everything (incl. unpublished,
-- so the admin console can edit a hidden note back into view). Same inlined role
-- check the phrase-bank policies use — no new helper, no parallel style.
drop policy if exists fn_select_own on field_notes;
create policy fn_select_own on field_notes for select to authenticated
  using ((student_id = auth.uid() and is_published)
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

drop policy if exists fn_staff_write on field_notes;
create policy fn_staff_write on field_notes for all to authenticated
  using      (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

drop policy if exists fne_select_own on field_note_exercises;
create policy fne_select_own on field_note_exercises for select to authenticated
  using (exists (select 1 from field_notes n
                  where n.id = field_note_exercises.note_id
                    and ((n.student_id = auth.uid() and n.is_published)
                         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')))));

drop policy if exists fne_staff_write on field_note_exercises;
create policy fne_staff_write on field_note_exercises for all to authenticated
  using      (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

-- Attempts are READ-ONLY to the student. There is deliberately NO insert policy:
-- the sole write path is record_field_note_attempt() below, so a student cannot
-- hand-write a row that marks their own note mastered.
drop policy if exists fna_select_own on field_note_attempts;
create policy fna_select_own on field_note_attempts for select to authenticated
  using (student_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

drop policy if exists fna_staff_write on field_note_attempts;
create policy fna_staff_write on field_note_attempts for all to authenticated
  using      (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

-- ── RPC: record one attempt and advance the parent note ─────────────────────
-- Status machine (pure SQL — no model call anywhere):
--   new → practicing        on the first attempt of any kind
--   any miss                → clean streak reset, note resurfaces in 2 days
--   whole note clean in one sitting, ≥3 days after the previous clean sitting
--                           → +1 clean session; the 2nd one masters the note
--   mastered                → sticky. A later miss records the attempt but never
--                             demotes her; this is her own mistake from her own job
--                             and the tone stays calm. Mastered notes stay visible.
create or replace function record_field_note_attempt(
  p_exercise_id uuid,
  p_response    text,
  p_is_correct  boolean
) returns table (status text, clean_session_count int, next_review_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_student   uuid := auth.uid();
  v_note      uuid;
  v_owner     uuid;
  v_status    text;
  v_clean     int;
  v_last      date;
  v_total     int;
  v_done      int;
  v_since     timestamptz := now() - interval '2 hours';   -- "one sitting"
begin
  if v_student is null then raise exception 'not authenticated'; end if;

  -- positively gate on ownership: auth.uid() is also null for anon, so never
  -- treat "no uid" as service-role.
  select e.note_id, n.student_id, n.status, n.clean_session_count, n.last_clean_session_on
    into v_note, v_owner, v_status, v_clean, v_last
    from field_note_exercises e
    join field_notes n on n.id = e.note_id
   where e.id = p_exercise_id;

  if v_owner is null or v_owner <> v_student then raise exception 'note not yours'; end if;

  insert into field_note_attempts (note_id, exercise_id, student_id, response, is_correct)
  values (v_note, p_exercise_id, v_student, p_response, coalesce(p_is_correct, false));

  if v_status = 'new' then
    update field_notes n set status = 'practicing' where n.id = v_note;
    v_status := 'practicing';
  end if;

  if not coalesce(p_is_correct, false) then
    if v_status <> 'mastered' then
      update field_notes n
         set clean_session_count = 0,
             next_review_at      = now() + interval '2 days'
       where n.id = v_note;
    end if;
  elsif v_status <> 'mastered' then
    select count(*) into v_total from field_note_exercises e where e.note_id = v_note;

    select count(distinct a.exercise_id) into v_done
      from field_note_attempts a
     where a.note_id = v_note and a.student_id = v_student
       and a.created_at >= v_since and a.is_correct;

    -- every exercise cleared in this sitting AND not a single miss inside it
    if v_total > 0 and v_done >= v_total and not exists (
      select 1 from field_note_attempts a
       where a.note_id = v_note and a.student_id = v_student
         and a.created_at >= v_since and not a.is_correct
    ) then
      -- a second clean sitting only counts once the memory has had time to fade
      if v_last is null or (current_date - v_last) >= 3 then
        v_clean := coalesce(v_clean, 0) + 1;
        update field_notes n set
          clean_session_count   = v_clean,
          last_clean_session_on = current_date,
          status                = case when v_clean >= 2 then 'mastered'  else 'practicing' end,
          mastered_at           = case when v_clean >= 2 then now()       else n.mastered_at end,
          next_review_at        = case when v_clean >= 2 then null        else now() + interval '3 days' end
        where n.id = v_note;
      end if;
    end if;
  end if;

  return query
    select n.status, n.clean_session_count, n.next_review_at
      from field_notes n where n.id = v_note;
end $$;

revoke all on function record_field_note_attempt(uuid, text, boolean) from public, anon;
grant execute on function record_field_note_attempt(uuid, text, boolean) to authenticated;

-- ── RPC: set a note's status directly (owner or staff) ──────────────────────
create or replace function set_field_note_status(p_note_id uuid, p_status text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_staff boolean;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_status not in ('new','practicing','mastered') then raise exception 'bad status %', p_status; end if;

  select n.student_id into v_owner from field_notes n where n.id = p_note_id;
  if v_owner is null then raise exception 'no such note'; end if;

  select exists (select 1 from profiles p where p.id = v_actor and p.role in ('admin','trainer')) into v_staff;
  if v_owner <> v_actor and not v_staff then raise exception 'note not yours'; end if;

  update field_notes n set
    status                = p_status,
    mastered_at           = case when p_status = 'mastered' then coalesce(n.mastered_at, now()) else null end,
    next_review_at        = case when p_status = 'mastered' then null else n.next_review_at end,
    clean_session_count   = case when p_status = 'new' then 0 else n.clean_session_count end,
    last_clean_session_on = case when p_status = 'new' then null else n.last_clean_session_on end
  where n.id = p_note_id;

  return p_status;
end $$;

revoke all on function set_field_note_status(uuid, text) from public, anon;
grant execute on function set_field_note_status(uuid, text) to authenticated;

-- ── entitlement guard: uses_field_notes is admin-only, like every other ─────
-- entitlement column. Without this the new flag would be the ONE gate a student
-- could flip on themselves via a plain PATCH on /students.
create or replace function public.guard_student_account_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
begin
  if auth.uid() is null then return new; end if;

  select p.role into v_role from public.profiles p where p.id = auth.uid();

  -- ── Tier A: admin-only columns (entitlements, subscription, level, billing, lifecycle) ──
  if (new.study_mode                is distinct from old.study_mode)
     or (new.specialization_id      is distinct from old.specialization_id)
     or (new.uses_biz_track         is distinct from old.uses_biz_track)
     or (new.uses_tech_track        is distinct from old.uses_tech_track)
     or (new.uses_env_track         is distinct from old.uses_env_track)
     or (new.uses_step_track        is distinct from old.uses_step_track)
     or (new.uses_pro_desk          is distinct from old.uses_pro_desk)
     or (new.home_surface           is distinct from old.home_surface)
     or (new.uses_class_notes       is distinct from old.uses_class_notes)
     or (new.uses_phrase_bank       is distinct from old.uses_phrase_bank)
     or (new.uses_dialogues         is distinct from old.uses_dialogues)
     or (new.uses_field_notes       is distinct from old.uses_field_notes)
     or (new.uses_custom_curriculum is distinct from old.uses_custom_curriculum)
     or (new.uses_standard_curriculum is distinct from old.uses_standard_curriculum)
     or (new.uses_ielts_home        is distinct from old.uses_ielts_home)
     or (new.uses_speaking_track    is distinct from old.uses_speaking_track)
     or (new.extra_curriculum_levels is distinct from old.extra_curriculum_levels)
     or (new.can_access_lower_levels is distinct from old.can_access_lower_levels)
     or (new.keep_academy_access    is distinct from old.keep_academy_access)
     or (new.access_expires_at      is distinct from old.access_expires_at)
     or (new.academic_level         is distinct from old.academic_level)
     or (new.ielts_phase            is distinct from old.ielts_phase)
     or (new.track                  is distinct from old.track)
     or (new.package                is distinct from old.package)
     or (new.custom_price           is distinct from old.custom_price)
     or (new.payment_day            is distinct from old.payment_day)
     or (new.payment_link           is distinct from old.payment_link)
     or (new.status                 is distinct from old.status)
     or (new.deleted_at             is distinct from old.deleted_at)
     or (new.writing_limit_override is distinct from old.writing_limit_override)
     or (new.custom_access          is distinct from old.custom_access)
     or (new.custom_mission_ar      is distinct from old.custom_mission_ar)
  then
    if v_role is distinct from 'admin' then
      raise exception 'account/entitlement changes are admin-only';
    end if;
  end if;

  -- ── Tier B: staff columns (admin or trainer) ──
  if (new.group_id            is distinct from old.group_id)
     or (new.assigned_trainer_id is distinct from old.assigned_trainer_id)
  then
    if v_role not in ('admin', 'trainer') then
      raise exception 'group/trainer assignment is staff-only';
    end if;
  end if;

  return new;
end;
$function$;
