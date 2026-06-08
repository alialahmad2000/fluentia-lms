-- Chat P0: make dm_get_or_create_thread atomic (kills the SELECT-then-INSERT race
-- that could create duplicate DM threads for the same user pair).
create or replace function public.dm_get_or_create_thread(p_other uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare lo uuid; hi uuid; tid uuid;
begin
  if not public.can_dm(p_other) then raise exception 'not_allowed'; end if;
  lo := least(auth.uid(), p_other); hi := greatest(auth.uid(), p_other);
  insert into dm_threads(user_lo, user_hi) values (lo, hi)
  on conflict (user_lo, user_hi) do update set user_lo = excluded.user_lo
  returning id into tid;
  return tid;
end $function$;
