-- Library engagement: comprehension questions, shadowing scores, book-club discussions.
-- Reads gated by the existing library_chapter_visible() / library_is_staff() helpers.

-- 1) per-chapter comprehension questions (authored offline; zero runtime AI)
create table if not exists public.library_chapter_questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.library_chapters(id) on delete cascade,
  book_id uuid not null references public.library_books(id) on delete cascade,
  q_index int not null,
  type text not null check (type in ('comprehension','inference','vocabulary','opinion')),
  question_en text not null,
  question_ar text,
  options jsonb,                 -- [{id,en,ar}]; null for opinion
  correct_id text,               -- e.g. 'B'; null for opinion
  explanation_ar text,
  jump_p int, jump_s int,        -- sentence to replay ("اسمعيها من هنا")
  created_at timestamptz default now(),
  unique (chapter_id, q_index)
);
create index if not exists idx_lcq_chapter on public.library_chapter_questions(chapter_id);
alter table public.library_chapter_questions enable row level security;
drop policy if exists lcq_read on public.library_chapter_questions;
create policy lcq_read on public.library_chapter_questions for select to authenticated
  using (public.library_is_staff() or public.library_chapter_visible(chapter_id));
drop policy if exists lcq_staff_write on public.library_chapter_questions;
create policy lcq_staff_write on public.library_chapter_questions for all to authenticated
  using (public.library_is_staff()) with check (public.library_is_staff());

-- 2) student answers (self-check) — drives the per-novel "you understood X%" rollup
create table if not exists public.library_question_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.library_chapter_questions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null,
  book_id uuid not null,
  selected_id text,
  text_answer text,
  is_correct boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (question_id, student_id)
);
create index if not exists idx_lqa_student_book on public.library_question_attempts(student_id, book_id);
alter table public.library_question_attempts enable row level security;
drop policy if exists lqa_own on public.library_question_attempts;
create policy lqa_own on public.library_question_attempts for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists lqa_staff_read on public.library_question_attempts;
create policy lqa_staff_read on public.library_question_attempts for select to authenticated
  using (public.library_is_staff());

-- 3) shadowing (read-aloud) pronunciation scores
create table if not exists public.library_shadow_attempts (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.library_chapters(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null,
  p int not null, s int not null,
  target_text text,
  transcript text,
  score int,                     -- 0..100
  created_at timestamptz default now()
);
create index if not exists idx_lsa_student_chapter on public.library_shadow_attempts(student_id, chapter_id);
alter table public.library_shadow_attempts enable row level security;
drop policy if exists lsa_own on public.library_shadow_attempts;
create policy lsa_own on public.library_shadow_attempts for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists lsa_staff_read on public.library_shadow_attempts;
create policy lsa_staff_read on public.library_shadow_attempts for select to authenticated
  using (public.library_is_staff());

-- 4) book-club discussions per novel (spoiler-tagged by chapter)
create table if not exists public.library_discussions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.library_books(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  chapter_number int,            -- max chapter the post references (spoiler gate)
  body text not null check (char_length(body) between 1 and 4000),
  parent_id uuid references public.library_discussions(id) on delete cascade,
  is_pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_ld_book on public.library_discussions(book_id, created_at);
alter table public.library_discussions enable row level security;
drop policy if exists ld_read on public.library_discussions;
create policy ld_read on public.library_discussions for select to authenticated
  using (deleted_at is null or public.library_is_staff());
drop policy if exists ld_insert on public.library_discussions;
create policy ld_insert on public.library_discussions for insert to authenticated
  with check (student_id = auth.uid());
drop policy if exists ld_update_own on public.library_discussions;
create policy ld_update_own on public.library_discussions for update to authenticated
  using (student_id = auth.uid() or public.library_is_staff());
drop policy if exists ld_delete_staff on public.library_discussions;
create policy ld_delete_staff on public.library_discussions for delete to authenticated
  using (student_id = auth.uid() or public.library_is_staff());

-- live book club
do $$ begin
  alter publication supabase_realtime add table public.library_discussions;
exception when duplicate_object then null; end $$;

-- author name for discussion display (read-only helper view; avoids exposing profiles broadly)
create or replace view public.library_discussion_authors as
  select d.id as discussion_id, p.display_name, p.full_name
  from public.library_discussions d join public.profiles p on p.id = d.student_id;
