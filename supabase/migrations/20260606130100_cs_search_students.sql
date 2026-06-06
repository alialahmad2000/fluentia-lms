-- Fluentia CS Ops — C2 helper: staff-only student search for booking private classes.
-- SECURITY DEFINER + is_staff() gate so agents can find students WITHOUT changing students RLS.
create or replace function public.cs_search_students(p_term text default null)
returns table (id uuid, name text, phone text)
  language sql stable security definer set search_path = public as $$
  select s.id, coalesce(p.display_name, p.full_name) as name, p.phone
  from public.students s
  join public.profiles p on p.id = s.id
  where public.is_staff()
    and s.deleted_at is null
    and (p_term is null or p_term = '' or coalesce(p.display_name, p.full_name) ilike '%' || p_term || '%')
  order by name
  limit 10;
$$;
grant execute on function public.cs_search_students(text) to authenticated;
