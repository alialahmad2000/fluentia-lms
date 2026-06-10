-- ─────────────────────────────────────────────────────────────────────────────
-- CLASS COORDINATOR (منسّقة الأكاديمية) — schedules for individual & group classes
--
-- A new `coordinator` staff role records the class timetable (fixed weekly
-- templates + one-off sessions) so students and teachers see times + meeting
-- links in-app instead of over WhatsApp.
--
-- NOTE: `ALTER TYPE user_role ADD VALUE 'coordinator'` is applied SEPARATELY
-- (cannot be used in the same transaction it is added in). See part 0 below.
--
-- Design decisions (Ali, 2026-06-10):
--  * does NOT reuse cs_bookings — that table models ONE CS calendar with a
--    GLOBAL no-overlap constraint; classes need many teachers concurrently.
--  * class_schedules = weekly template; class_sessions = dated occurrences
--    (materialized 14 days ahead by cron) + ad-hoc one-offs (schedule_id null).
--  * per-TRAINER and per-STUDENT scoped EXCLUDE constraints prevent
--    double-booking without blocking parallel teachers.
--  * all writes go through SECURITY DEFINER coord_* RPCs gated on
--    is_coordinator_staff() (admin or coordinator).
-- ─────────────────────────────────────────────────────────────────────────────

-- part 0 (run alone, before this file):
--   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coordinator';

create extension if not exists btree_gist;

-- ── helper: coordinator-or-admin gate ────────────────────────────────────────
create or replace function public.is_coordinator_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('admin', 'coordinator')
  );
$$;

revoke all on function public.is_coordinator_staff() from public;
grant execute on function public.is_coordinator_staff() to authenticated;

-- ── tables ───────────────────────────────────────────────────────────────────
create table if not exists public.class_schedules (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('individual', 'group')),
  student_id       uuid references public.students(id),
  group_id         uuid references public.groups(id),
  trainer_id       uuid not null references public.trainers(id),
  day_of_week      int  not null check (day_of_week between 0 and 6),  -- 0 = Sunday
  start_time       time not null,                                      -- Riyadh local
  duration_minutes int  not null default 60 check (duration_minutes between 15 and 240),
  meeting_link     text,
  status           text not null default 'active' check (status in ('active', 'paused', 'ended')),
  notes            text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint class_schedules_target check (
    (type = 'individual' and student_id is not null and group_id is null) or
    (type = 'group'      and group_id   is not null and student_id is null)
  )
);

create table if not exists public.class_sessions (
  id            uuid primary key default gen_random_uuid(),
  schedule_id   uuid references public.class_schedules(id) on delete cascade, -- null = ad-hoc one-off
  -- the slot this occurrence was materialized for; reschedules keep it so the
  -- materializer never resurrects the original slot (unique below).
  orig_start_at timestamptz,
  type          text not null check (type in ('individual', 'group')),
  student_id    uuid references public.students(id),
  group_id      uuid references public.groups(id),
  trainer_id    uuid not null references public.trainers(id),
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  meeting_link  text,
  status        text not null default 'scheduled' check (status in ('scheduled', 'done', 'cancelled', 'no_show')),
  notes         text,
  reminded_60   boolean not null default false,
  reminded_15   boolean not null default false,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint class_sessions_target check (
    (type = 'individual' and student_id is not null and group_id is null) or
    (type = 'group'      and group_id   is not null and student_id is null)
  ),
  constraint class_sessions_times check (end_at > start_at)
);

create unique index if not exists class_sessions_schedule_slot
  on public.class_sessions (schedule_id, orig_start_at)
  where schedule_id is not null;

-- scoped double-booking protection (only live sessions block)
alter table public.class_sessions
  add constraint class_sessions_no_trainer_overlap
  exclude using gist (trainer_id with =, tstzrange(start_at, end_at) with &&)
  where (status = 'scheduled');

alter table public.class_sessions
  add constraint class_sessions_no_student_overlap
  exclude using gist (student_id with =, tstzrange(start_at, end_at) with &&)
  where (status = 'scheduled' and student_id is not null);

create index if not exists class_sessions_trainer_time on public.class_sessions (trainer_id, start_at);
create index if not exists class_sessions_student_time on public.class_sessions (student_id, start_at);
create index if not exists class_sessions_group_time   on public.class_sessions (group_id, start_at);
create index if not exists class_sessions_reminders    on public.class_sessions (start_at)
  where status = 'scheduled' and (not reminded_60 or not reminded_15);
create index if not exists class_schedules_trainer     on public.class_schedules (trainer_id) where status = 'active';

-- updated_at maintenance
create or replace function public.class_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_class_schedules_touch on public.class_schedules;
create trigger trg_class_schedules_touch before update on public.class_schedules
  for each row execute function public.class_touch_updated_at();

drop trigger if exists trg_class_sessions_touch on public.class_sessions;
create trigger trg_class_sessions_touch before update on public.class_sessions
  for each row execute function public.class_touch_updated_at();

-- ── RLS: read-only for the people involved; ALL writes via coord_* RPCs ─────
alter table public.class_schedules enable row level security;
alter table public.class_sessions  enable row level security;

drop policy if exists class_schedules_staff_read on public.class_schedules;
create policy class_schedules_staff_read on public.class_schedules
  for select to authenticated using (public.is_coordinator_staff());

drop policy if exists class_schedules_trainer_read on public.class_schedules;
create policy class_schedules_trainer_read on public.class_schedules
  for select to authenticated using (trainer_id = auth.uid());

drop policy if exists class_schedules_student_read on public.class_schedules;
create policy class_schedules_student_read on public.class_schedules
  for select to authenticated using (
    student_id = auth.uid()
    or (type = 'group' and exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.group_id = class_schedules.group_id
        and s.deleted_at is null
    ))
  );

drop policy if exists class_sessions_staff_read on public.class_sessions;
create policy class_sessions_staff_read on public.class_sessions
  for select to authenticated using (public.is_coordinator_staff());

drop policy if exists class_sessions_trainer_read on public.class_sessions;
create policy class_sessions_trainer_read on public.class_sessions
  for select to authenticated using (trainer_id = auth.uid());

drop policy if exists class_sessions_student_read on public.class_sessions;
create policy class_sessions_student_read on public.class_sessions
  for select to authenticated using (
    student_id = auth.uid()
    or (type = 'group' and exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.group_id = class_sessions.group_id
        and s.deleted_at is null
    ))
  );

-- service_role bypasses RLS; no client INSERT/UPDATE/DELETE policies on purpose.

-- ── notification plumbing (reuses send-push-notification, in-app + web push) ─
create or replace function public.class_notify(
  p_user_ids uuid[], p_title text, p_body text, p_url text, p_tag text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  anon constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjU2MTgsImV4cCI6MjA4ODcwMTYxOH0.Lznjnw2Pmrr04tFjQD6hRfWp-12JlRagZaCmo59KG8A';
begin
  if p_user_ids is null or array_length(p_user_ids, 1) is null then return; end if;
  perform net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon,
      'Authorization', 'Bearer ' || anon),
    body := jsonb_build_object(
      'user_ids', to_jsonb(p_user_ids),
      'title',    p_title,
      'body',     p_body,
      'url',      p_url,
      'type',     'class_reminder',
      'priority', 'high',
      'tag',      p_tag)
  );
exception when others then
  null;  -- a notification failure must never block a schedule write
end $$;

revoke all on function public.class_notify(uuid[], text, text, text, text) from public, anon, authenticated;

-- Arabic helpers for notification copy
create or replace function public.class_dow_ar(p_dow int)
returns text language sql immutable as $$
  select (array['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'])[p_dow + 1];
$$;

create or replace function public.class_time_ar(p_at timestamptz)
returns text language sql stable as $$
  select trim(to_char(p_at at time zone 'Asia/Riyadh', 'HH12:MI'))
         || case when to_char(p_at at time zone 'Asia/Riyadh', 'AM') = 'AM' then ' صباحًا' else ' مساءً' end;
$$;

-- session participants: returns the student ids + trainer id involved
create or replace function public.class_session_students(p_type text, p_student uuid, p_group uuid)
returns uuid[] language sql stable security definer set search_path = public as $$
  select case
    when p_type = 'individual' then array[p_student]
    else coalesce(
      (select array_agg(s.id) from public.students s
        where s.group_id = p_group and s.status = 'active' and s.deleted_at is null),
      '{}'::uuid[])
  end;
$$;

revoke all on function public.class_session_students(text, uuid, uuid) from public, anon, authenticated;

-- ── materializer: weekly templates → dated sessions ──────────────────────────
create or replace function public.materialize_one_schedule(p_schedule uuid, p_days int default 14)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  r public.class_schedules%rowtype;
  d date; i int; n int := 0;
  v_start timestamptz; v_end timestamptz;
begin
  select * into r from public.class_schedules where id = p_schedule;
  if not found or r.status <> 'active' then return 0; end if;

  for i in 0..p_days loop
    d := (now() at time zone 'Asia/Riyadh')::date + i;
    if extract(dow from d)::int = r.day_of_week then
      v_start := (d + r.start_time) at time zone 'Asia/Riyadh';
      if v_start > now() then
        v_end := v_start + make_interval(mins => r.duration_minutes);
        begin
          insert into public.class_sessions
            (schedule_id, orig_start_at, type, student_id, group_id, trainer_id,
             start_at, end_at, meeting_link, created_by)
          values
            (r.id, v_start, r.type, r.student_id, r.group_id, r.trainer_id,
             v_start, v_end, r.meeting_link, r.created_by)
          on conflict (schedule_id, orig_start_at) where schedule_id is not null do nothing;
          if found then n := n + 1; end if;
        exception when exclusion_violation then
          null;  -- teacher/student already booked at this instant — skip occurrence
        end;
      end if;
    end if;
  end loop;
  return n;
end $$;

revoke all on function public.materialize_one_schedule(uuid, int) from public, anon, authenticated;

create or replace function public.materialize_class_sessions(p_days int default 14)
returns int
language plpgsql volatile security definer set search_path = public
as $$
declare r record; n int := 0; v_days int := least(greatest(coalesce(p_days, 14), 1), 30);
begin
  -- callable by: cron/service (no auth.uid) or coordinator/admin users.
  -- p_days clamped to 30 so no caller can request a runaway materialization range.
  if auth.uid() is not null and not public.is_coordinator_staff() then
    raise exception 'not_allowed';
  end if;
  for r in select id from public.class_schedules where status = 'active' loop
    n := n + public.materialize_one_schedule(r.id, v_days);
  end loop;
  return n;
end $$;

-- anon must NOT reach this (auth.uid() is null for anon, which is the cron
-- bypass) — only authenticated (gated internally) + the postgres cron owner.
revoke all on function public.materialize_class_sessions(int) from public, anon;
grant execute on function public.materialize_class_sessions(int) to authenticated;

-- ── coordinator RPCs ─────────────────────────────────────────────────────────
create or replace function public.coord_assert()
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_coordinator_staff() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end $$;

revoke all on function public.coord_assert() from public, anon, authenticated;

-- pickers ---------------------------------------------------------------------
create or replace function public.coord_list_students()
returns table (id uuid, full_name text, group_id uuid, group_name text, academic_level int, gender text)
language sql stable security definer set search_path = public as $$
  select s.id, coalesce(p.display_name, p.full_name), s.group_id, g.name, s.academic_level, s.gender
  from public.students s
  join public.profiles p on p.id = s.id
  left join public.groups g on g.id = s.group_id
  where s.status = 'active' and s.deleted_at is null
    and public.is_coordinator_staff()
  order by coalesce(p.display_name, p.full_name);
$$;

create or replace function public.coord_list_trainers()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select t.id, coalesce(p.display_name, p.full_name)
  from public.trainers t
  join public.profiles p on p.id = t.id
  where coalesce(t.is_active, true) and public.is_coordinator_staff()
  order by 2;
$$;

create or replace function public.coord_list_groups()
returns table (id uuid, name text, trainer_id uuid, trainer_name text, member_count bigint)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.trainer_id, coalesce(p.display_name, p.full_name),
         (select count(*) from public.students s
           where s.group_id = g.id and s.status = 'active' and s.deleted_at is null)
  from public.groups g
  left join public.profiles p on p.id = g.trainer_id
  where g.is_active and public.is_coordinator_staff()
  order by g.name;
$$;

grant execute on function public.coord_list_students() to authenticated;
grant execute on function public.coord_list_trainers() to authenticated;
grant execute on function public.coord_list_groups()   to authenticated;

-- week view (flattened, with names) --------------------------------------------
create or replace function public.coord_week_sessions(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, schedule_id uuid, type text, status text,
  start_at timestamptz, end_at timestamptz, meeting_link text, notes text,
  trainer_id uuid, trainer_name text,
  student_id uuid, student_name text,
  group_id uuid, group_name text
)
language sql stable security definer set search_path = public as $$
  select cs.id, cs.schedule_id, cs.type, cs.status,
         cs.start_at, cs.end_at, cs.meeting_link, cs.notes,
         cs.trainer_id, coalesce(tp.display_name, tp.full_name),
         cs.student_id, coalesce(sp.display_name, sp.full_name),
         cs.group_id, g.name
  from public.class_sessions cs
  left join public.profiles tp on tp.id = cs.trainer_id
  left join public.profiles sp on sp.id = cs.student_id
  left join public.groups g    on g.id  = cs.group_id
  where cs.start_at >= p_from and cs.start_at < p_to
    and public.is_coordinator_staff()
  order by cs.start_at;
$$;

create or replace function public.coord_list_schedules()
returns table (
  id uuid, type text, status text, day_of_week int, start_time time,
  duration_minutes int, meeting_link text, notes text,
  trainer_id uuid, trainer_name text,
  student_id uuid, student_name text,
  group_id uuid, group_name text,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.type, c.status, c.day_of_week, c.start_time,
         c.duration_minutes, c.meeting_link, c.notes,
         c.trainer_id, coalesce(tp.display_name, tp.full_name),
         c.student_id, coalesce(sp.display_name, sp.full_name),
         c.group_id, g.name, c.created_at
  from public.class_schedules c
  left join public.profiles tp on tp.id = c.trainer_id
  left join public.profiles sp on sp.id = c.student_id
  left join public.groups g    on g.id  = c.group_id
  where public.is_coordinator_staff()
  order by c.status = 'active' desc, c.day_of_week, c.start_time;
$$;

grant execute on function public.coord_week_sessions(timestamptz, timestamptz) to authenticated;
grant execute on function public.coord_list_schedules() to authenticated;

-- conflict preview (for inline UI warning before save) --------------------------
create or replace function public.coord_check_conflicts(
  p_trainer uuid, p_student uuid, p_start timestamptz, p_end timestamptz,
  p_exclude_session uuid default null
) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', cs.id, 'start_at', cs.start_at, 'end_at', cs.end_at, 'type', cs.type,
      'with', case when cs.trainer_id = p_trainer then 'trainer' else 'student' end)), '[]'::jsonb)
  from public.class_sessions cs
  where cs.status = 'scheduled'
    and tstzrange(cs.start_at, cs.end_at) && tstzrange(p_start, p_end)
    and (cs.id is distinct from p_exclude_session)
    and (cs.trainer_id = p_trainer or (p_student is not null and cs.student_id = p_student))
    and public.is_coordinator_staff();
$$;

grant execute on function public.coord_check_conflicts(uuid, uuid, timestamptz, timestamptz, uuid) to authenticated;

-- create weekly template ---------------------------------------------------------
create or replace function public.coord_create_schedule(
  p_type text, p_student uuid, p_group uuid, p_trainer uuid,
  p_day_of_week int, p_start_time time, p_duration int,
  p_meeting_link text default null, p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid; v_created int;
  v_trainer_name text; v_target_name text;
  v_students uuid[];
  v_when text;
begin
  perform public.coord_assert();

  insert into public.class_schedules
    (type, student_id, group_id, trainer_id, day_of_week, start_time,
     duration_minutes, meeting_link, notes, created_by)
  values
    (p_type, p_student, p_group, p_trainer, p_day_of_week, p_start_time,
     coalesce(p_duration, 60), nullif(trim(p_meeting_link), ''), p_notes, auth.uid())
  returning id into v_id;

  v_created := public.materialize_one_schedule(v_id, 14);

  select coalesce(display_name, full_name) into v_trainer_name from public.profiles where id = p_trainer;
  v_students := public.class_session_students(p_type, p_student, p_group);
  v_when := 'كل ' || public.class_dow_ar(p_day_of_week) || ' الساعة '
            || trim(to_char(('2000-01-01'::date + p_start_time)::timestamp, 'HH12:MI'))
            || case when extract(hour from p_start_time) < 12 then ' صباحًا' else ' مساءً' end;

  if p_type = 'individual' then
    select coalesce(display_name, full_name) into v_target_name from public.profiles where id = p_student;
    perform public.class_notify(v_students,
      'موعد حصتك الفردية 🗓️',
      v_when || ' مع ' || coalesce(v_trainer_name, 'مدرب الأكاديمية') || '. الرابط متوفر في حسابك.',
      '/student', 'class-sched-' || v_id);
    perform public.class_notify(array[p_trainer],
      'حصة فردية جديدة في جدولك 🗓️',
      v_when || ' — ' || coalesce(v_target_name, 'طالب') || '.',
      '/trainer/schedule', 'class-sched-' || v_id);
  else
    select name into v_target_name from public.groups where id = p_group;
    perform public.class_notify(v_students,
      'موعد حصة ' || coalesce(v_target_name, 'مجموعتك') || ' 🗓️',
      v_when || ' مع ' || coalesce(v_trainer_name, 'مدرب الأكاديمية') || '. الرابط متوفر في حسابك.',
      '/student', 'class-sched-' || v_id);
    perform public.class_notify(array[p_trainer],
      'حصة جماعية جديدة في جدولك 🗓️',
      v_when || ' — ' || coalesce(v_target_name, 'مجموعة') || '.',
      '/trainer/schedule', 'class-sched-' || v_id);
  end if;

  return jsonb_build_object('schedule_id', v_id, 'sessions_created', v_created);
end $$;

grant execute on function public.coord_create_schedule(text, uuid, uuid, uuid, int, time, int, text, text) to authenticated;

-- update / pause / resume / end a template ---------------------------------------
create or replace function public.coord_update_schedule(
  p_id uuid,
  p_day_of_week int default null, p_start_time time default null,
  p_duration int default null, p_meeting_link text default null,
  p_notes text default null, p_status text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.class_schedules%rowtype;
  v_created int := 0;
  v_students uuid[]; v_when text; v_time_changed boolean;
begin
  perform public.coord_assert();
  select * into r from public.class_schedules where id = p_id;
  if not found then raise exception 'schedule_not_found'; end if;

  v_time_changed := (p_day_of_week is not null and p_day_of_week <> r.day_of_week)
                 or (p_start_time is not null and p_start_time <> r.start_time)
                 or (p_duration   is not null and p_duration   <> r.duration_minutes)
                 or (p_status     is not null and p_status     <> r.status);

  update public.class_schedules set
    day_of_week      = coalesce(p_day_of_week, day_of_week),
    start_time       = coalesce(p_start_time, start_time),
    duration_minutes = coalesce(p_duration, duration_minutes),
    meeting_link     = coalesce(nullif(trim(p_meeting_link), ''), meeting_link),
    notes            = coalesce(p_notes, notes),
    status           = coalesce(p_status, status)
  where id = p_id
  returning * into r;

  if v_time_changed then
    -- drop untouched future occurrences and rebuild from the new template
    delete from public.class_sessions
      where schedule_id = p_id and status = 'scheduled' and start_at > now();
    if r.status = 'active' then
      v_created := public.materialize_one_schedule(p_id, 14);
    end if;

    v_students := public.class_session_students(r.type, r.student_id, r.group_id);
    v_when := 'كل ' || public.class_dow_ar(r.day_of_week) || ' الساعة '
              || trim(to_char(('2000-01-01'::date + r.start_time)::timestamp, 'HH12:MI'))
              || case when extract(hour from r.start_time) < 12 then ' صباحًا' else ' مساءً' end;

    if r.status = 'active' then
      perform public.class_notify(v_students, 'تحديث موعد الحصة 🔄',
        'الموعد الجديد: ' || v_when || '. التفاصيل في حسابك.', '/student', 'class-sched-' || p_id);
      perform public.class_notify(array[r.trainer_id], 'تحديث في جدولك 🔄',
        'الموعد الجديد: ' || v_when || '.', '/trainer/schedule', 'class-sched-' || p_id);
    elsif r.status in ('paused', 'ended') then
      perform public.class_notify(v_students, 'إيقاف موعد الحصة ⏸️',
        'تم إيقاف الموعد الأسبوعي الحالي. سيصلك إشعار عند تحديد موعد جديد.', '/student', 'class-sched-' || p_id);
      perform public.class_notify(array[r.trainer_id], 'إيقاف حصة من جدولك ⏸️',
        'تم إيقاف الموعد الأسبوعي.', '/trainer/schedule', 'class-sched-' || p_id);
    end if;
  end if;

  return jsonb_build_object('schedule_id', p_id, 'sessions_created', v_created, 'status', r.status);
end $$;

grant execute on function public.coord_update_schedule(uuid, int, time, int, text, text, text) to authenticated;

-- one-off session -----------------------------------------------------------------
create or replace function public.coord_create_session(
  p_type text, p_student uuid, p_group uuid, p_trainer uuid,
  p_start timestamptz, p_duration int,
  p_meeting_link text default null, p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid; v_end timestamptz;
  v_trainer_name text; v_target_name text; v_students uuid[];
  v_when text;
begin
  perform public.coord_assert();
  v_end := p_start + make_interval(mins => coalesce(p_duration, 60));

  begin
    insert into public.class_sessions
      (type, student_id, group_id, trainer_id, start_at, end_at, meeting_link, notes, created_by)
    values
      (p_type, p_student, p_group, p_trainer, p_start, v_end,
       nullif(trim(p_meeting_link), ''), p_notes, auth.uid())
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'conflict' using errcode = '23P01';
  end;

  select coalesce(display_name, full_name) into v_trainer_name from public.profiles where id = p_trainer;
  v_students := public.class_session_students(p_type, p_student, p_group);
  v_when := public.class_dow_ar(extract(dow from (p_start at time zone 'Asia/Riyadh'))::int)
            || ' ' || to_char(p_start at time zone 'Asia/Riyadh', 'DD-MM')
            || ' الساعة ' || public.class_time_ar(p_start);

  if p_type = 'individual' then
    select coalesce(display_name, full_name) into v_target_name from public.profiles where id = p_student;
  else
    select name into v_target_name from public.groups where id = p_group;
  end if;

  perform public.class_notify(v_students,
    case when p_type = 'individual' then 'حصتك الفردية — موعد جديد 🗓️'
         else 'حصة ' || coalesce(v_target_name, 'مجموعتك') || ' — موعد جديد 🗓️' end,
    v_when || ' مع ' || coalesce(v_trainer_name, 'مدرب الأكاديمية') || '. الرابط متوفر في حسابك.',
    '/student', 'class-sess-' || v_id);
  perform public.class_notify(array[p_trainer],
    'حصة جديدة في جدولك 🗓️',
    v_when || ' — ' || coalesce(v_target_name, '') || '.',
    '/trainer/schedule', 'class-sess-' || v_id);

  return jsonb_build_object('session_id', v_id);
end $$;

grant execute on function public.coord_create_session(text, uuid, uuid, uuid, timestamptz, int, text, text) to authenticated;

-- cancel / reschedule / edit one occurrence -----------------------------------------
create or replace function public.coord_cancel_session(p_id uuid, p_notify boolean default true)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare r public.class_sessions%rowtype; v_students uuid[]; v_when text;
begin
  perform public.coord_assert();
  update public.class_sessions set status = 'cancelled'
    where id = p_id and status = 'scheduled'
    returning * into r;
  if not found then raise exception 'session_not_found_or_closed'; end if;

  if p_notify then
    v_students := public.class_session_students(r.type, r.student_id, r.group_id);
    v_when := public.class_dow_ar(extract(dow from (r.start_at at time zone 'Asia/Riyadh'))::int)
              || ' الساعة ' || public.class_time_ar(r.start_at);
    perform public.class_notify(v_students, 'إلغاء حصة ❌',
      'حصة ' || v_when || ' أُلغيت. نعتذر عن أي إزعاج.', '/student', 'class-sess-' || p_id);
    perform public.class_notify(array[r.trainer_id], 'إلغاء حصة من جدولك ❌',
      'حصة ' || v_when || ' أُلغيت.', '/trainer/schedule', 'class-sess-' || p_id);
  end if;
  return jsonb_build_object('session_id', p_id, 'status', 'cancelled');
end $$;

grant execute on function public.coord_cancel_session(uuid, boolean) to authenticated;

create or replace function public.coord_reschedule_session(
  p_id uuid, p_new_start timestamptz, p_duration int default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare r public.class_sessions%rowtype; v_students uuid[]; v_when text; v_mins int;
begin
  perform public.coord_assert();
  select * into r from public.class_sessions where id = p_id and status = 'scheduled';
  if not found then raise exception 'session_not_found_or_closed'; end if;

  v_mins := coalesce(p_duration, greatest(15, round(extract(epoch from (r.end_at - r.start_at)) / 60)::int));
  begin
    update public.class_sessions
      set start_at = p_new_start,
          end_at   = p_new_start + make_interval(mins => v_mins),
          reminded_60 = false, reminded_15 = false
      where id = p_id;
  exception when exclusion_violation then
    raise exception 'conflict' using errcode = '23P01';
  end;

  v_students := public.class_session_students(r.type, r.student_id, r.group_id);
  v_when := public.class_dow_ar(extract(dow from (p_new_start at time zone 'Asia/Riyadh'))::int)
            || ' ' || to_char(p_new_start at time zone 'Asia/Riyadh', 'DD-MM')
            || ' الساعة ' || public.class_time_ar(p_new_start);
  perform public.class_notify(v_students, 'تغيير موعد الحصة 🔄',
    'الموعد الجديد: ' || v_when || '. التفاصيل في حسابك.', '/student', 'class-sess-' || p_id);
  perform public.class_notify(array[r.trainer_id], 'تغيير موعد في جدولك 🔄',
    'الموعد الجديد: ' || v_when || '.', '/trainer/schedule', 'class-sess-' || p_id);

  return jsonb_build_object('session_id', p_id, 'start_at', p_new_start);
end $$;

grant execute on function public.coord_reschedule_session(uuid, timestamptz, int) to authenticated;

create or replace function public.coord_update_session(
  p_id uuid, p_meeting_link text default null, p_notes text default null, p_status text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  perform public.coord_assert();
  update public.class_sessions set
    meeting_link = coalesce(nullif(trim(p_meeting_link), ''), meeting_link),
    notes        = coalesce(p_notes, notes),
    status       = coalesce(p_status, status)
  where id = p_id;
  if not found then raise exception 'session_not_found'; end if;
  return jsonb_build_object('session_id', p_id);
end $$;

grant execute on function public.coord_update_session(uuid, text, text, text) to authenticated;

-- ── trainer + student read RPCs (names resolved server-side) ─────────────────
create or replace function public.trainer_my_sessions(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, type text, status text, start_at timestamptz, end_at timestamptz,
  meeting_link text, notes text,
  student_id uuid, student_name text, group_id uuid, group_name text
)
language sql stable security definer set search_path = public as $$
  select cs.id, cs.type, cs.status, cs.start_at, cs.end_at, cs.meeting_link, cs.notes,
         cs.student_id, coalesce(sp.display_name, sp.full_name),
         cs.group_id, g.name
  from public.class_sessions cs
  left join public.profiles sp on sp.id = cs.student_id
  left join public.groups g    on g.id  = cs.group_id
  where cs.trainer_id = auth.uid()
    and cs.start_at >= p_from and cs.start_at < p_to
  order by cs.start_at;
$$;

grant execute on function public.trainer_my_sessions(timestamptz, timestamptz) to authenticated;

create or replace function public.student_upcoming_sessions(p_limit int default 8)
returns table (
  id uuid, type text, status text, start_at timestamptz, end_at timestamptz,
  meeting_link text, trainer_name text, group_name text
)
language sql stable security definer set search_path = public as $$
  select cs.id, cs.type, cs.status, cs.start_at, cs.end_at, cs.meeting_link,
         coalesce(tp.display_name, tp.full_name), g.name
  from public.class_sessions cs
  left join public.profiles tp on tp.id = cs.trainer_id
  left join public.groups g    on g.id  = cs.group_id
  where cs.status = 'scheduled'
    and cs.end_at > now()
    and (cs.student_id = auth.uid()
         or (cs.type = 'group' and cs.group_id in (
              select s.group_id from public.students s
              where s.id = auth.uid() and s.deleted_at is null)))
  order by cs.start_at
  limit least(coalesce(p_limit, 8), 50);
$$;

grant execute on function public.student_upcoming_sessions(int) to authenticated;

-- ── reminder sweep (cron every 5 min) ────────────────────────────────────────
create or replace function public.class_session_reminder_sweep()
returns int
language plpgsql security definer set search_path = public
as $$
declare r record; v_students uuid[]; v_label text; n int := 0;
begin
  if auth.uid() is not null and not public.is_coordinator_staff() then
    raise exception 'not_allowed';
  end if;

  for r in
    select cs.*,
      (not cs.reminded_60 and cs.start_at <= now() + interval '60 minutes'
                          and cs.start_at >  now() + interval '20 minutes') as due_60,
      (not cs.reminded_15 and cs.start_at <= now() + interval '15 minutes'
                          and cs.start_at >  now()) as due_15
    from public.class_sessions cs
    where cs.status = 'scheduled'
      and cs.start_at <= now() + interval '60 minutes'
      and cs.start_at > now()
      and (not cs.reminded_60 or not cs.reminded_15)
  loop
    begin
      v_students := public.class_session_students(r.type, r.student_id, r.group_id);
      v_label := case when r.type = 'individual' then 'حصتك الفردية' else 'حصة المجموعة' end
                 || ' الساعة ' || public.class_time_ar(r.start_at);

      if r.due_15 then
        perform public.class_notify(v_students, 'الحصة بعد قليل ⏰',
          v_label || ' تبدأ خلال دقائق. الرابط في حسابك.', '/student', 'class-rem-' || r.id);
        perform public.class_notify(array[r.trainer_id], 'حصتك تبدأ بعد قليل ⏰',
          v_label || ' تبدأ خلال دقائق.', '/trainer/schedule', 'class-rem-' || r.id);
        update public.class_sessions set reminded_15 = true, reminded_60 = true where id = r.id;
        n := n + 1;
      elsif r.due_60 then
        perform public.class_notify(v_students, 'تذكير بالحصة 🔔',
          v_label || ' — خلال أقل من ساعة.', '/student', 'class-rem-' || r.id);
        perform public.class_notify(array[r.trainer_id], 'تذكير بحصة في جدولك 🔔',
          v_label || ' — خلال أقل من ساعة.', '/trainer/schedule', 'class-rem-' || r.id);
        update public.class_sessions set reminded_60 = true where id = r.id;
        n := n + 1;
      end if;
    exception when others then
      null;  -- one bad session must not abort the sweep
    end;
  end loop;
  return n;
end $$;

revoke all on function public.class_session_reminder_sweep() from public, anon;
grant execute on function public.class_session_reminder_sweep() to authenticated;  -- gated internally

-- ── cron jobs ────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from cron.job where jobname = 'class-sessions-materialize') then
    perform cron.unschedule('class-sessions-materialize');
  end if;
  if exists (select 1 from cron.job where jobname = 'class-session-reminders') then
    perform cron.unschedule('class-session-reminders');
  end if;
  perform cron.schedule('class-sessions-materialize', '20 21 * * *',  -- 00:20 Riyadh
    $job$select public.materialize_class_sessions(14)$job$);
  perform cron.schedule('class-session-reminders', '*/5 * * * *',
    $job$select public.class_session_reminder_sweep()$job$);
end $$;

-- ── defense-in-depth: strip the default PUBLIC/anon execute from every RPC ───
-- (each is already gated internally; this removes the anon REST surface entirely)
revoke all on function public.coord_create_schedule(text,uuid,uuid,uuid,int,time,int,text,text) from public, anon;
revoke all on function public.coord_update_schedule(uuid,int,time,int,text,text,text) from public, anon;
revoke all on function public.coord_create_session(text,uuid,uuid,uuid,timestamptz,int,text,text) from public, anon;
revoke all on function public.coord_cancel_session(uuid,boolean) from public, anon;
revoke all on function public.coord_reschedule_session(uuid,timestamptz,int) from public, anon;
revoke all on function public.coord_update_session(uuid,text,text,text) from public, anon;
revoke all on function public.coord_list_students() from public, anon;
revoke all on function public.coord_list_trainers() from public, anon;
revoke all on function public.coord_list_groups() from public, anon;
revoke all on function public.coord_week_sessions(timestamptz,timestamptz) from public, anon;
revoke all on function public.coord_list_schedules() from public, anon;
revoke all on function public.coord_check_conflicts(uuid,uuid,timestamptz,timestamptz,uuid) from public, anon;
revoke all on function public.trainer_my_sessions(timestamptz,timestamptz) from public, anon;
revoke all on function public.student_upcoming_sessions(int) from public, anon;
revoke all on function public.class_session_reminder_sweep() from public, anon;
