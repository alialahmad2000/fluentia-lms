-- Multi-image albums: one message (type='album') holds several images in a jsonb
-- array [{ path, w, h }]. Additive + nullable — existing rows/queries unaffected,
-- and get_group_messages / get_dm_messages are SELECT * so the column flows through.
alter table public.group_messages add column if not exists album jsonb;
notify pgrst, 'reload schema';
