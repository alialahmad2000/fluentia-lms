-- Chat P1: allow any emoji reaction + let users edit/delete (soft) their OWN group messages.

-- 1) Any-emoji reactions (drop the 8-emoji whitelist).
alter table public.message_reactions drop constraint if exists reactions_emoji_check;

-- 2) Let the SENDER update their own group message (students couldn't before — only
--    trainers/admins could). Soft-delete is an UPDATE of deleted_at, so this covers
--    both "edit own" and "delete own". A guard trigger limits non-staff to safe fields.
drop policy if exists gm_own_update on public.group_messages;
create policy gm_own_update on public.group_messages for update
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create or replace function public.gm_guard_own_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- staff (admin, or trainer in this group) may change anything
  if public.is_admin() or (public.is_trainer() and new.group_id = any (public.get_trainer_group_ids())) then
    return new;
  end if;
  -- everyone else (the sender editing their own) may only touch content / soft-delete
  if new.sender_id   is distinct from old.sender_id
     or new.is_pinned   is distinct from old.is_pinned
     or new.type        is distinct from old.type
     or new.channel_id  is distinct from old.channel_id
     or new.group_id    is distinct from old.group_id
     or new.mentions    is distinct from old.mentions then
    raise exception 'not_allowed_field' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_gm_guard_own on public.group_messages;
create trigger trg_gm_guard_own before update on public.group_messages
  for each row execute function public.gm_guard_own_update();

notify pgrst, 'reload schema';
