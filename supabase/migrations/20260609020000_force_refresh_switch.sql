-- ════════════════════════════════════════════════════════════════════════════
-- FORCE-REFRESH SWITCH — let an admin make EVERY client wipe its service-worker
-- cache + re-download the latest build on its next app-open. Complements the
-- automatic version-mismatch self-heal (main.jsx) with a manual, on-demand lever.
-- Stored as a monotonically-increasing epoch in app_config; the client applies a
-- value once (localStorage marker) so it can never loop.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.app_config (key, value)
values ('force_refresh_at', to_jsonb(0))
on conflict (key) do nothing;

-- Public read (called at app boot, before auth) — returns the current epoch.
create or replace function public.get_app_force_refresh()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce((value::text)::bigint, 0) from public.app_config where key = 'force_refresh_at';
$$;
grant execute on function public.get_app_force_refresh() to anon, authenticated;

-- Admin-only trigger: bump the epoch to now() → every client force-refreshes on
-- its next open. Returns the new epoch.
create or replace function public.bump_force_refresh()
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint := floor(extract(epoch from now()))::bigint;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'admin only';
  end if;
  insert into public.app_config (key, value) values ('force_refresh_at', to_jsonb(v))
  on conflict (key) do update set value = to_jsonb(v), updated_at = now();
  return v;
end; $$;
grant execute on function public.bump_force_refresh() to authenticated;
