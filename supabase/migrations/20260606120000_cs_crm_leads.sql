-- Fluentia CS Ops — System A, Phase B1
-- CRM leads + activities, RLS, and SECURITY DEFINER RPCs.
-- Idempotent / re-runnable. No changes to any existing table.

-- ───────────────────────── tables ─────────────────────────
create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,                          -- E.164 digits only, no '+'
  source text not null default 'tiktok_dm',        -- tiktok_dm|manual|referral|other
  status text not null default 'new',              -- new|contacted|qualified|trial_booked|won|lost
  interest text,                                   -- hot|warm|cold
  package_interest text,                           -- L0|L1|L2|L3|IELTS (names only)
  assigned_to uuid references public.profiles(id),
  next_followup_at timestamptz,
  last_activity_at timestamptz not null default now(),
  lost_reason text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  actor uuid references public.profiles(id),
  type text not null,   -- created|note|status_change|contacted|sent_link|whatsapp_opened|followup_set|booked|won|lost
  detail text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_leads_status    on public.crm_leads(status);
create index if not exists idx_crm_leads_assigned   on public.crm_leads(assigned_to);
create index if not exists idx_crm_leads_followup   on public.crm_leads(next_followup_at);
create index if not exists idx_crm_act_lead         on public.crm_lead_activities(lead_id, created_at desc);
create index if not exists idx_crm_act_actor        on public.crm_lead_activities(actor, created_at desc);
create index if not exists idx_crm_act_type_time    on public.crm_lead_activities(type, created_at desc);

-- updated_at touch trigger
create or replace function public.crm_touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists trg_crm_leads_touch on public.crm_leads;
create trigger trg_crm_leads_touch before update on public.crm_leads
  for each row execute function public.crm_touch_updated_at();

-- ───────────────────── staff predicate ─────────────────────
-- role::text comparison decouples this from the user_role enum (the 'agent'
-- value is added in B2); the function compiles regardless of enum state.
create or replace function public.is_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text in ('admin','agent')
  );
$$;

-- ─────────────────────────── RLS ───────────────────────────
alter table public.crm_leads            enable row level security;
alter table public.crm_lead_activities  enable row level security;

drop policy if exists crm_leads_staff_rw on public.crm_leads;
create policy crm_leads_staff_rw on public.crm_leads
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists crm_act_staff_rw on public.crm_lead_activities;
create policy crm_act_staff_rw on public.crm_lead_activities
  for all using (public.is_staff()) with check (public.is_staff());

-- ─────────────────────────── RPCs ──────────────────────────
-- Insert an activity as the calling staff user + bump the lead's last_activity_at.
create or replace function public.crm_log_activity(
  p_lead uuid, p_type text, p_detail text default null, p_meta jsonb default null
) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into public.crm_lead_activities (lead_id, actor, type, detail, meta)
  values (p_lead, auth.uid(), p_type, p_detail, p_meta)
  returning id into v_id;
  update public.crm_leads set last_activity_at = now() where id = p_lead;
  return v_id;
end $$;

-- Change a lead's status (+ lost_reason, clear follow-up on won/lost), and log it.
create or replace function public.crm_set_status(
  p_lead uuid, p_status text, p_lost_reason text default null
) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('new','contacted','qualified','trial_booked','won','lost') then
    raise exception 'invalid status %', p_status using errcode = '22023';
  end if;
  update public.crm_leads set
    status           = p_status,
    lost_reason      = case when p_status = 'lost' then p_lost_reason else lost_reason end,
    next_followup_at = case when p_status in ('won','lost') then null else next_followup_at end,
    last_activity_at = now()
  where id = p_lead;
  insert into public.crm_lead_activities (lead_id, actor, type, detail)
  values (p_lead, auth.uid(), 'status_change', p_status);
end $$;

grant execute on function public.is_staff()                                   to authenticated;
grant execute on function public.crm_log_activity(uuid, text, text, jsonb)    to authenticated;
grant execute on function public.crm_set_status(uuid, text, text)             to authenticated;
