-- Fluentia CS Ops — System A, Phase B5
-- Read-only admin performance RPC. SECURITY DEFINER, admin-only.
-- Returns one JSON object: funnel counts, per-rep activity, daily series, going-stale list.
-- All time math anchored to Asia/Riyadh.

create or replace function public.crm_performance(p_period text default 'today')
returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_start timestamptz;
  v_result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'admin') then
    raise exception 'admin only' using errcode = '42501';
  end if;

  v_start := case p_period
    when 'today' then (v_today::timestamp) at time zone 'Asia/Riyadh'
    when '7'     then ((v_today - 6)::timestamp)  at time zone 'Asia/Riyadh'
    when '30'    then ((v_today - 29)::timestamp) at time zone 'Asia/Riyadh'
    else              (v_today::timestamp) at time zone 'Asia/Riyadh'
  end;

  with win_leads as (
    select * from public.crm_leads where created_at >= v_start
  ),
  funnel as (
    select
      count(*) filter (where status = 'new')          as c_new,
      count(*) filter (where status = 'contacted')     as c_contacted,
      count(*) filter (where status = 'qualified')     as c_qualified,
      count(*) filter (where status = 'trial_booked')  as c_trial_booked,
      count(*) filter (where status = 'won')           as c_won,
      count(*) filter (where status = 'lost')          as c_lost,
      count(*)                                         as total
    from win_leads
  ),
  reps as (
    select p.id, coalesce(p.display_name, p.full_name) as name
    from public.profiles p
    where p.role::text in ('agent', 'admin') and coalesce(p.is_test_account, false) = false
  ),
  per_rep as (
    select
      r.name,
      (select count(*) from win_leads wl where wl.created_by = r.id) as leads_added,
      (select count(*) from public.crm_lead_activities a where a.actor = r.id and a.created_at >= v_start and a.type = 'contacted') as marked_contacted,
      (select count(*) from public.crm_lead_activities a where a.actor = r.id and a.created_at >= v_start and a.type = 'whatsapp_opened') as whatsapp_opened,
      (select count(*) from public.crm_lead_activities a where a.actor = r.id and a.created_at >= v_start and a.type = 'sent_link') as sent_link,
      (select count(*) from public.crm_lead_activities a where a.actor = r.id and a.created_at >= v_start and (a.type = 'booked' or (a.type = 'status_change' and a.detail = 'trial_booked'))) as trials_booked,
      (select count(*) from public.crm_lead_activities a where a.actor = r.id and a.created_at >= v_start and a.type = 'status_change' and a.detail = 'won') as won,
      (select count(*) from public.crm_lead_activities a where a.actor = r.id and a.created_at >= v_start and a.type = 'status_change' and a.detail = 'lost') as lost,
      (select count(*) from public.crm_leads l where l.assigned_to = r.id and l.next_followup_at < now() and l.status not in ('won','lost')) as overdue_followups
    from reps r
  ),
  daily as (
    select to_char((a.created_at at time zone 'Asia/Riyadh')::date, 'YYYY-MM-DD') as day, count(*) as cnt
    from public.crm_lead_activities a
    where a.created_at >= v_start
    group by 1 order by 1
  ),
  stale as (
    select l.id, l.name, l.last_activity_at, coalesce(p.display_name, p.full_name) as assignee
    from public.crm_leads l
    left join public.profiles p on p.id = l.assigned_to
    where l.status not in ('won','lost') and l.last_activity_at < now() - interval '3 days'
    order by l.last_activity_at asc
    limit 50
  )
  select jsonb_build_object(
    'period',  p_period,
    'start',   v_start,
    'funnel',  (select to_jsonb(f) from funnel f),
    'per_rep', coalesce((select jsonb_agg(to_jsonb(pr)) from per_rep pr), '[]'::jsonb),
    'daily',   coalesce((select jsonb_agg(to_jsonb(d)) from daily d), '[]'::jsonb),
    'stale',   coalesce((select jsonb_agg(to_jsonb(s)) from stale s), '[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;

grant execute on function public.crm_performance(text) to authenticated;
