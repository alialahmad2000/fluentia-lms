-- HR hub (/admin/team) didn't know the new `coordinator` role:
--  * admin_list_staff filtered roles to admin/trainer/agent → هاجر invisible
--  * admin_set_role rejected 'coordinator'
-- Both updated to include coordinator. (Applied to prod via Management API.)

create or replace function public.admin_list_staff()
returns table(id uuid, name text, email text, role text, last_active_at timestamptz, is_banned boolean)
language sql stable security definer set search_path to 'public'
as $$
  select p.id,
         coalesce(p.display_name, p.full_name) as name,
         p.email,
         p.role::text,
         p.last_active_at,
         (u.banned_until is not null and u.banned_until > now()) as is_banned
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_app_admin()
    and p.role::text in ('admin', 'trainer', 'agent', 'coordinator')
    and coalesce(p.is_test_account, false) = false
  order by p.role::text, name;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_app_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'cannot change your own role' using errcode = '42501'; end if;
  if p_role not in ('admin', 'trainer', 'agent', 'student', 'coordinator') then
    raise exception 'invalid role %', p_role using errcode = '22023';
  end if;
  update public.profiles set role = p_role::public.user_role where id = p_user;
  if p_role = 'trainer' then
    insert into public.trainers (id) values (p_user) on conflict (id) do nothing;
  end if;
end $$;
