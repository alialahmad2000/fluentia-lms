-- Fluentia CS Ops — System B, Phase C1
-- Availability rules + bookings (hard DB-level double-booking guard) + booking RPCs.
-- Idempotent / re-runnable. Reuses is_staff() from B1.

create extension if not exists btree_gist;

create table if not exists public.cs_availability_rules (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 0 and 6),  -- 0=Sunday … 6=Saturday (matches extract(dow))
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true
);

create table if not exists public.cs_bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.crm_leads(id),
  student_id uuid references public.students(id),
  contact_name text,
  contact_whatsapp text,
  type text not null,                                   -- initial_meeting | private_class
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'scheduled',             -- scheduled | done | cancelled | no_show
  is_override boolean not null default false,
  override_reason text,
  notes text,
  booked_by uuid references public.profiles(id),
  gcal_event_id text,
  gcal_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_at > start_at)
);

-- HARD double-booking prevention at the DB level (cancelled bookings ignored):
alter table public.cs_bookings drop constraint if exists cs_bookings_no_overlap;
alter table public.cs_bookings add constraint cs_bookings_no_overlap
  exclude using gist (tstzrange(start_at, end_at) with &&) where (status <> 'cancelled');

create index if not exists idx_cs_bookings_start on public.cs_bookings(start_at);

-- updated_at touch
create or replace function public.cs_touch_updated_at() returns trigger
  language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_cs_bookings_touch on public.cs_bookings;
create trigger trg_cs_bookings_touch before update on public.cs_bookings
  for each row execute function public.cs_touch_updated_at();

-- RLS — staff (agent + admin) read/write
alter table public.cs_availability_rules enable row level security;
alter table public.cs_bookings           enable row level security;
drop policy if exists cs_avail_staff_rw on public.cs_availability_rules;
create policy cs_avail_staff_rw on public.cs_availability_rules
  for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists cs_bookings_staff_rw on public.cs_bookings;
create policy cs_bookings_staff_rw on public.cs_bookings
  for all using (public.is_staff()) with check (public.is_staff());

-- Ali's weekly availability (seed once, never overwrite custom edits)
insert into public.cs_availability_rules (day_of_week, start_time, end_time)
select v.d, v.s, v.e from (values
  (0, '15:00'::time, '23:00'::time),
  (1, '15:00'::time, '23:00'::time),
  (2, '15:00'::time, '23:00'::time),
  (3, '15:00'::time, '23:00'::time),
  (4, '15:00'::time, '23:00'::time),
  (6, '13:00'::time, '20:00'::time)
) v(d, s, e)
where not exists (select 1 from public.cs_availability_rules);

-- ───────────────────── helpers + RPCs ─────────────────────
-- True when [start,end] fits inside an active availability window (Riyadh weekday/time).
create or replace function public.cs_within_availability(p_start timestamptz, p_end timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cs_availability_rules r
    where r.is_active
      and r.day_of_week = extract(dow from (p_start at time zone 'Asia/Riyadh'))::int
      and r.start_time <= (p_start at time zone 'Asia/Riyadh')::time
      and r.end_time   >= (p_end   at time zone 'Asia/Riyadh')::time
  );
$$;

-- Create a booking. Returns the booking id. Friendly errors on slot-taken / outside-availability.
create or replace function public.cs_book(
  p_type text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_lead_id uuid default null,
  p_student_id uuid default null,
  p_contact_name text default null,
  p_contact_whatsapp text default null,
  p_notes text default null,
  p_is_override boolean default false,
  p_override_reason text default null
) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_type not in ('initial_meeting','private_class') then
    raise exception 'invalid booking type %', p_type using errcode = '22023';
  end if;
  if p_end_at <= p_start_at then
    raise exception 'end must be after start' using errcode = '22023';
  end if;
  if p_is_override then
    if p_override_reason is null or btrim(p_override_reason) = '' then
      raise exception 'override requires a reason' using errcode = '22023';
    end if;
  elsif not public.cs_within_availability(p_start_at, p_end_at) then
    raise exception 'outside availability' using errcode = '22023';
  end if;

  begin
    insert into public.cs_bookings (lead_id, student_id, contact_name, contact_whatsapp, type,
                                    start_at, end_at, is_override, override_reason, notes, booked_by)
    values (p_lead_id, p_student_id, p_contact_name, p_contact_whatsapp, p_type,
            p_start_at, p_end_at, p_is_override, p_override_reason, p_notes, auth.uid())
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot taken' using errcode = '23P01';
  end;

  if p_lead_id is not null then
    perform public.crm_set_status(p_lead_id, 'trial_booked', null);
    perform public.crm_log_activity(p_lead_id, 'booked', p_type, null);
  end if;

  return v_id;
end $$;

create or replace function public.cs_reschedule(
  p_booking uuid, p_start_at timestamptz, p_end_at timestamptz,
  p_is_override boolean default false, p_override_reason text default null
) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_end_at <= p_start_at then raise exception 'end must be after start' using errcode = '22023'; end if;
  if p_is_override then
    if p_override_reason is null or btrim(p_override_reason) = '' then
      raise exception 'override requires a reason' using errcode = '22023';
    end if;
  elsif not public.cs_within_availability(p_start_at, p_end_at) then
    raise exception 'outside availability' using errcode = '22023';
  end if;
  begin
    update public.cs_bookings
      set start_at = p_start_at, end_at = p_end_at,
          is_override = p_is_override, override_reason = coalesce(p_override_reason, override_reason),
          gcal_synced_at = null
      where id = p_booking;
  exception when exclusion_violation then
    raise exception 'slot taken' using errcode = '23P01';
  end;
end $$;

create or replace function public.cs_set_booking_status(p_booking uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status not in ('scheduled','done','cancelled','no_show') then
    raise exception 'invalid status %', p_status using errcode = '22023';
  end if;
  update public.cs_bookings set status = p_status, gcal_synced_at = null where id = p_booking;
end $$;

grant execute on function public.cs_within_availability(timestamptz, timestamptz)                                          to authenticated;
grant execute on function public.cs_book(text, timestamptz, timestamptz, uuid, uuid, text, text, text, boolean, text)      to authenticated;
grant execute on function public.cs_reschedule(uuid, timestamptz, timestamptz, boolean, text)                              to authenticated;
grant execute on function public.cs_set_booking_status(uuid, text)                                                         to authenticated;
