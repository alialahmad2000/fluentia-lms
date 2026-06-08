-- Speaking AI Conversation mode (additive — coexists with record-once, never deletes data)
-- A student-suggested feature: instead of one-shot recording a speaking task, have a
-- back-and-forth spoken conversation with an AI about the unit topic. The new mode is the
-- default; classic record-once stays fully intact (untouched). On completion the conversation
-- writes ONE summary speaking_recordings row (so trainers + the unit-progress trigger see it)
-- plus the same student_curriculum_progress 'speaking' completion row record-once writes.
--
-- Tables mirror speaking_recordings / coach_conversations patterns. RLS mirrors
-- speaking_recordings (student-own, trainer-of-group read, admin all, service_role all).

-- ── Conversation header ────────────────────────────────────────────────────
create table if not exists public.speaking_conversations (
  id                       uuid primary key default gen_random_uuid(),
  student_id               uuid not null,                 -- = profiles.id = students.id (RLS auth.uid())
  unit_id                  uuid not null,
  speaking_id              uuid,                          -- curriculum_speaking.id (the topic), nullable
  question_index           int  not null default 0,
  status                   text not null default 'in_progress'
                             check (status in ('in_progress','completed','abandoned')),
  turn_count               int  not null default 0,       -- student turns
  total_speaking_seconds   int  not null default 0,
  ai_evaluation            jsonb,                         -- same shape as speaking_recordings.ai_evaluation
  ai_evaluated_at          timestamptz,
  ai_model                 text,
  score                    numeric,                       -- overall_score (0-10)
  speaking_recording_id    uuid,                          -- the summary speaking_recordings row created on completion
  xp_awarded               int  not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  completed_at             timestamptz,
  deleted_at               timestamptz                    -- soft delete only
);

create index if not exists idx_speaking_conversations_student_unit
  on public.speaking_conversations (student_id, unit_id);

-- ── Per-turn rows (durable: a student turn is saved before the AI reply is requested) ──
create table if not exists public.speaking_conversation_turns (
  id                       uuid primary key default gen_random_uuid(),
  conversation_id          uuid not null references public.speaking_conversations(id) on delete cascade,
  student_id               uuid not null,                 -- denormalized for RLS without a join
  turn_index               int  not null,
  role                     text not null check (role in ('student','ai')),
  content                  text,                          -- student: Whisper transcript; ai: the spoken reply text
  audio_path               text,                          -- student: voice-notes storage path; ai: public TTS url
  audio_duration_seconds   int,
  client_turn_uuid         uuid,                          -- idempotency for a student turn submit
  created_at               timestamptz not null default now()
);

create index if not exists idx_sct_conversation
  on public.speaking_conversation_turns (conversation_id, turn_index);
create unique index if not exists uq_sct_client_turn
  on public.speaking_conversation_turns (conversation_id, client_turn_uuid)
  where client_turn_uuid is not null;

-- ── Link the summary speaking_recordings row back to its conversation (additive, nullable) ──
alter table public.speaking_recordings
  add column if not exists conversation_id uuid;

-- ── RLS (mirror speaking_recordings) ───────────────────────────────────────
alter table public.speaking_conversations      enable row level security;
alter table public.speaking_conversation_turns enable row level security;

-- conversations
drop policy if exists sc_student_select  on public.speaking_conversations;
drop policy if exists sc_student_insert  on public.speaking_conversations;
drop policy if exists sc_student_update  on public.speaking_conversations;
drop policy if exists sc_trainer_select  on public.speaking_conversations;
drop policy if exists sc_admin_all       on public.speaking_conversations;
drop policy if exists sc_service_all     on public.speaking_conversations;

create policy sc_student_select on public.speaking_conversations
  for select using (student_id = auth.uid());
create policy sc_student_insert on public.speaking_conversations
  for insert with check (student_id = auth.uid());
create policy sc_student_update on public.speaking_conversations
  for update using (student_id = auth.uid());
create policy sc_trainer_select on public.speaking_conversations
  for select using (
    exists (
      select 1 from public.students s
      join public.groups g on g.id = s.group_id
      where s.id = speaking_conversations.student_id and g.trainer_id = auth.uid()
    )
  );
create policy sc_admin_all on public.speaking_conversations
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy sc_service_all on public.speaking_conversations
  for all using (auth.role() = 'service_role');

-- turns
drop policy if exists sct_student_select on public.speaking_conversation_turns;
drop policy if exists sct_student_insert on public.speaking_conversation_turns;
drop policy if exists sct_trainer_select on public.speaking_conversation_turns;
drop policy if exists sct_admin_all      on public.speaking_conversation_turns;
drop policy if exists sct_service_all    on public.speaking_conversation_turns;

create policy sct_student_select on public.speaking_conversation_turns
  for select using (student_id = auth.uid());
create policy sct_student_insert on public.speaking_conversation_turns
  for insert with check (student_id = auth.uid());
create policy sct_trainer_select on public.speaking_conversation_turns
  for select using (
    exists (
      select 1 from public.students s
      join public.groups g on g.id = s.group_id
      where s.id = speaking_conversation_turns.student_id and g.trainer_id = auth.uid()
    )
  );
create policy sct_admin_all on public.speaking_conversation_turns
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy sct_service_all on public.speaking_conversation_turns
  for all using (auth.role() = 'service_role');
