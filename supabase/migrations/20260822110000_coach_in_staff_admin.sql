-- The coach was invisible to the people who manage staff.
--
-- Adding a role to the enum is not the same as adding it to the company. Four
-- separate allow-lists still named only the roles that existed before it:
--   · admin_list_staff()  — filtered the coach out of /admin/team entirely
--   · admin_set_role()    — refused 'coach', so nobody could be promoted to it
--   · admin-staff edge fn — refused 'coach' on create (patched separately)
--   · AdminTeam.jsx ROLES — had no entry, and roleMeta() falls back to ROLES[2]
--                           (agent), so a coach would have been mislabelled
-- The account could only be created by CLI and could not be found afterwards.

CREATE OR REPLACE FUNCTION public.admin_list_staff()
 RETURNS TABLE(id uuid, name text, email text, role text, last_active_at timestamp with time zone, is_banned boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id,
         coalesce(p.display_name, p.full_name) as name,
         p.email,
         p.role::text,
         p.last_active_at,
         (u.banned_until is not null and u.banned_until > now()) as is_banned
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_app_admin()
    and p.role::text in ('admin', 'trainer', 'agent', 'coordinator', 'coach')
    and coalesce(p.is_test_account, false) = false
  order by p.role::text, name;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_role(p_user uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_app_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'cannot change your own role' using errcode = '42501'; end if;
  if p_role not in ('admin', 'trainer', 'agent', 'student', 'coordinator', 'coach') then
    raise exception 'invalid role %', p_role using errcode = '22023';
  end if;
  update public.profiles set role = p_role::public.user_role where id = p_user;
  if p_role = 'trainer' then
    insert into public.trainers (id) values (p_user) on conflict (id) do nothing;
  end if;
  -- Same shape as the trainer branch: the console reads the coach's timezone
  -- from lc_coaches, so promoting someone without the row leaves them with a
  -- working login and a console that cannot tell them what time it is.
  if p_role = 'coach' then
    insert into public.lc_coaches (id) values (p_user) on conflict (id) do nothing;
  end if;
end $function$;
