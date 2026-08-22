-- ═══════════════════════════════════════════════════════════════════════════
-- The AI coach learns a third kind of task: a pattern from «ورقة المذاكرة».
--
-- The owner wants a tutor the student can actually talk to about a specific
-- pattern in the study sheet — ask questions, get more examples, check that she
-- understood — and he wants every one of those conversations kept, so effort
-- and what was ACTIVELY learned are both visible.
--
-- All of that already exists for writing and speaking: coach_conversations +
-- coach_messages, cost tracking, and /admin/coach-activity. So this extends the
-- existing model rather than building a parallel one — the admin view and the
-- effort reporting then work for reading with no extra wiring.
--
-- Additive and non-destructive: pattern_id is nullable, so all 30 existing
-- conversations and 162 messages are untouched and keep working.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.coach_conversations
  add column if not exists pattern_id text;

comment on column public.coach_conversations.pattern_id is
  'For task_type=reading_pattern: which pattern inside curriculum_readings.study_sheet->teach (its "id", e.g. p1). NULL for writing/speaking.';

alter table public.coach_conversations
  drop constraint if exists coach_conversations_task_type_check;
alter table public.coach_conversations
  add constraint coach_conversations_task_type_check
  check (task_type in ('writing','speaking','reading_pattern'));

-- A reading has several patterns, so the conversation key has to include which
-- one. COALESCE keeps the writing/speaking rows (pattern_id NULL) unique on the
-- original three columns exactly as before.
-- uq_conversation is backed by a CONSTRAINT, so the constraint is what has to go.
alter table public.coach_conversations drop constraint if exists uq_conversation;
drop index if exists public.uq_conversation;
create unique index if not exists uq_conversation
  on public.coach_conversations (student_id, task_id, task_type, coalesce(pattern_id, ''));
