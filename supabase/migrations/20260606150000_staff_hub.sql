-- Fluentia — Staff Hub (admin team management). Admin-only RPCs.
-- Reuses is_app_admin() (from the CS-Ops integrations migration).

-- Directory: all staff (admin/trainer/agent) + active(banned) status. Admin-only.
create or replace function public.admin_list_staff()
returns table (id uuid, name text, email text, role text, last_active_at timestamptz, is_banned boolean)
  language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(p.display_name, p.full_name) as name,
         p.email,
         p.role::text,
         p.last_active_at,
         (u.banned_until is not null and u.banned_until > now()) as is_banned
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_app_admin()
    and p.role::text in ('admin', 'trainer', 'agent')
    and coalesce(p.is_test_account, false) = false
  order by p.role::text, name;
$$;

-- Change a staff member's role. Admin-only; can't change your own (lock-out guard).
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'cannot change your own role' using errcode = '42501'; end if;
  if p_role not in ('admin', 'trainer', 'agent', 'student') then
    raise exception 'invalid role %', p_role using errcode = '22023';
  end if;
  update public.profiles set role = p_role::public.user_role where id = p_user;
  if p_role = 'trainer' then
    insert into public.trainers (id) values (p_user) on conflict (id) do nothing;
  end if;
end $$;

grant execute on function public.admin_list_staff()              to authenticated;
grant execute on function public.admin_set_role(uuid, text)      to authenticated;

-- reload PostgREST schema cache so the new RPCs resolve immediately
notify pgrst, 'reload schema';
