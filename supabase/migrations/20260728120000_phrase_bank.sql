-- «عبارات جاهزة» — per-student phrase bank.
-- Whole sentences a student memorises and can actually deploy, each with its
-- meaning, the situation it belongs to, and a drill that tests WHEN to use it
-- (situation shown, phrase chosen) rather than mere translation.
-- Applied to production 2026-07-28.

alter table students add column if not exists uses_phrase_bank boolean not null default false;

create table if not exists phrase_bank_phrases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  group_key text not null,
  group_label_ar text not null,
  group_label_en text,
  register text not null default 'work' check (register in ('work','life')),
  phrase_en text not null,
  meaning_ar text not null,
  when_to_use_ar text not null,
  example_en text,
  example_ar text,
  situation_ar text,              -- the drill prompt
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (student_id, phrase_en)
);
create index if not exists phrase_bank_phrases_student_idx
  on phrase_bank_phrases(student_id, group_key, sort_order);

create table if not exists phrase_bank_progress (
  student_id uuid not null references profiles(id) on delete cascade,
  phrase_id uuid not null references phrase_bank_phrases(id) on delete cascade,
  status text not null default 'learning' check (status in ('learning','known')),
  correct_count int not null default 0,
  attempt_count int not null default 0,
  last_seen_at timestamptz not null default now(),
  primary key (student_id, phrase_id)
);

alter table phrase_bank_phrases enable row level security;
alter table phrase_bank_progress enable row level security;

-- Read-only for students (own rows); staff read everything. There is deliberately
-- NO insert/update policy on progress: the only write path is the RPC below, so a
-- student cannot mark their own phrases 'known' by hand.
drop policy if exists pbp_select_own on phrase_bank_phrases;
create policy pbp_select_own on phrase_bank_phrases for select to authenticated
  using (student_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

drop policy if exists pbpr_select_own on phrase_bank_progress;
create policy pbpr_select_own on phrase_bank_progress for select to authenticated
  using (student_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','trainer')));

create or replace function phrase_bank_record(p_phrase_id uuid, p_correct boolean)
returns table (status text, correct_count int, attempt_count int)
language plpgsql security definer set search_path = public as $$
declare v_student uuid := auth.uid(); v_owner uuid;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  -- positively gate on ownership: auth.uid() is also null for anon, so never
  -- treat "no uid" as service-role.
  select student_id into v_owner from phrase_bank_phrases where id = p_phrase_id;
  if v_owner is null or v_owner <> v_student then raise exception 'phrase not yours'; end if;

  insert into phrase_bank_progress (student_id, phrase_id, correct_count, attempt_count, last_seen_at)
  values (v_student, p_phrase_id, case when p_correct then 1 else 0 end, 1, now())
  on conflict (student_id, phrase_id) do update set
    correct_count = phrase_bank_progress.correct_count + case when p_correct then 1 else 0 end,
    attempt_count = phrase_bank_progress.attempt_count + 1,
    last_seen_at  = now();

  -- 'known' after two clean recalls; a wrong answer sends it back to learning.
  update phrase_bank_progress g set status =
    case when not p_correct then 'learning'
         when g.correct_count >= 2 then 'known' else 'learning' end
  where g.student_id = v_student and g.phrase_id = p_phrase_id;

  return query select g.status, g.correct_count, g.attempt_count
    from phrase_bank_progress g where g.student_id = v_student and g.phrase_id = p_phrase_id;
end $$;

revoke all on function phrase_bank_record(uuid, boolean) from public, anon;
grant execute on function phrase_bank_record(uuid, boolean) to authenticated;
