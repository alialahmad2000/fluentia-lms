-- إنجليزي يومي (Everyday English) — an OPTIONAL daily real-life English practice surface,
-- BESIDE the curriculum (never graded into it). A short voiced roleplay conversation about a
-- real-life situation (ordering coffee, a job interview, asking for directions…).
--
-- This is a SIBLING of the speaking-conversation engine but fully ISOLATED: its own tables,
-- its own edge function (everyday-english-turn). It NEVER writes student_curriculum_progress
-- or speaking_recordings, so it cannot affect the live curriculum speaking/grading flow.
-- RLS mirrors speaking_conversations (student-own, trainer-of-group read, admin all, service all).

-- ── Scenario library (curated content) ──────────────────────────────────────
create table if not exists public.everyday_english_scenarios (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title_en      text not null,
  title_ar      text not null,
  emoji         text,
  category      text not null default 'daily_life',   -- daily_life | work | travel | social | shopping | phone | health
  level_min     int  not null default 1,              -- CEFR 1..5 this scenario suits
  level_max     int  not null default 5,
  situation_en  text not null,                          -- the scene (fed to the AI)
  ai_role       text not null,                          -- who the AI plays + how it behaves
  student_role  text,                                   -- the learner's mission
  goal_en       text,                                   -- what success looks like (used in the recap)
  useful_phrases text[] not null default '{}',          -- handy phrases shown as chips
  sort_order    int  not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_ee_scenarios_pub on public.everyday_english_scenarios (is_published, sort_order);

-- ── One row per practice attempt (header) ───────────────────────────────────
create table if not exists public.everyday_english_sessions (
  id                     uuid primary key default gen_random_uuid(),
  student_id             uuid not null,                 -- = profiles.id = students.id (RLS auth.uid())
  scenario_id            uuid not null references public.everyday_english_scenarios(id) on delete restrict,
  session_date           date not null default ((now() at time zone 'Asia/Riyadh')::date),  -- Riyadh day (daily streak)
  status                 text not null default 'in_progress'
                           check (status in ('in_progress','completed','abandoned')),
  turn_count             int  not null default 0,       -- student turns
  total_speaking_seconds int  not null default 0,
  recap                  jsonb,                          -- warm closing recap (no harsh grade)
  your_best_line         text,                           -- the student's strongest spoken line
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  completed_at           timestamptz,
  deleted_at             timestamptz
);
create index if not exists idx_ee_sessions_student      on public.everyday_english_sessions (student_id, session_date desc);
create index if not exists idx_ee_sessions_student_stat on public.everyday_english_sessions (student_id, status);

-- ── Per-turn rows (durable: a student turn is saved before the AI reply) ─────
create table if not exists public.everyday_english_turns (
  id                     uuid primary key default gen_random_uuid(),
  session_id             uuid not null references public.everyday_english_sessions(id) on delete cascade,
  student_id             uuid not null,                 -- denormalized for RLS without a join
  turn_index             int  not null,
  role                   text not null check (role in ('student','ai')),
  content                text,                           -- student: Whisper transcript; ai: spoken reply
  audio_path             text,                           -- student: voice-notes path; ai: public TTS url
  audio_duration_seconds int,
  client_turn_uuid       uuid,                           -- idempotency for a student turn submit
  created_at             timestamptz not null default now()
);
create index if not exists idx_ee_turns_session on public.everyday_english_turns (session_id, turn_index);
create unique index if not exists uq_ee_turns_client
  on public.everyday_english_turns (session_id, client_turn_uuid) where client_turn_uuid is not null;

-- ── RLS (mirror speaking_conversations) ─────────────────────────────────────
alter table public.everyday_english_scenarios enable row level security;
alter table public.everyday_english_sessions  enable row level security;
alter table public.everyday_english_turns     enable row level security;

-- scenarios: authenticated read of published; admin + service manage
drop policy if exists ee_scn_read    on public.everyday_english_scenarios;
drop policy if exists ee_scn_admin   on public.everyday_english_scenarios;
drop policy if exists ee_scn_service on public.everyday_english_scenarios;
create policy ee_scn_read on public.everyday_english_scenarios
  for select using (
    is_published
    or auth.role() = 'service_role'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy ee_scn_admin on public.everyday_english_scenarios
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy ee_scn_service on public.everyday_english_scenarios
  for all using (auth.role() = 'service_role');

-- sessions
drop policy if exists ee_sess_student_select  on public.everyday_english_sessions;
drop policy if exists ee_sess_student_insert  on public.everyday_english_sessions;
drop policy if exists ee_sess_student_update  on public.everyday_english_sessions;
drop policy if exists ee_sess_trainer_select  on public.everyday_english_sessions;
drop policy if exists ee_sess_admin           on public.everyday_english_sessions;
drop policy if exists ee_sess_service         on public.everyday_english_sessions;
create policy ee_sess_student_select on public.everyday_english_sessions
  for select using (student_id = auth.uid());
create policy ee_sess_student_insert on public.everyday_english_sessions
  for insert with check (student_id = auth.uid());
create policy ee_sess_student_update on public.everyday_english_sessions
  for update using (student_id = auth.uid());
create policy ee_sess_trainer_select on public.everyday_english_sessions
  for select using (
    exists (
      select 1 from public.students s
      join public.groups g on g.id = s.group_id
      where s.id = everyday_english_sessions.student_id and g.trainer_id = auth.uid()
    )
  );
create policy ee_sess_admin on public.everyday_english_sessions
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy ee_sess_service on public.everyday_english_sessions
  for all using (auth.role() = 'service_role');

-- turns
drop policy if exists ee_turn_student_select on public.everyday_english_turns;
drop policy if exists ee_turn_student_insert on public.everyday_english_turns;
drop policy if exists ee_turn_trainer_select on public.everyday_english_turns;
drop policy if exists ee_turn_admin          on public.everyday_english_turns;
drop policy if exists ee_turn_service         on public.everyday_english_turns;
create policy ee_turn_student_select on public.everyday_english_turns
  for select using (student_id = auth.uid());
create policy ee_turn_student_insert on public.everyday_english_turns
  for insert with check (student_id = auth.uid());
create policy ee_turn_trainer_select on public.everyday_english_turns
  for select using (
    exists (
      select 1 from public.students s
      join public.groups g on g.id = s.group_id
      where s.id = everyday_english_turns.student_id and g.trainer_id = auth.uid()
    )
  );
create policy ee_turn_admin on public.everyday_english_turns
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy ee_turn_service on public.everyday_english_turns
  for all using (auth.role() = 'service_role');
