-- Fluentia CS Ops — C3: integration tokens (Google Calendar) + admin gate.
-- Stores the academy's single Google refresh token. Written only by the
-- gcal-oauth edge function (service role); readable by admins.

create table if not exists public.integration_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,            -- 'google'
  refresh_token text,
  access_token text,
  token_expires_at timestamptz,
  calendar_id text not null default 'primary',
  connected_by uuid references public.profiles(id),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integration_tokens enable row level security;

create or replace function public.is_app_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin');
$$;

drop policy if exists integration_tokens_admin_read on public.integration_tokens;
create policy integration_tokens_admin_read on public.integration_tokens
  for select using (public.is_app_admin());

create or replace function public.cs_disconnect_integration(p_provider text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  delete from public.integration_tokens where provider = p_provider;
end $$;

grant execute on function public.is_app_admin()                  to authenticated;
grant execute on function public.cs_disconnect_integration(text) to authenticated;
