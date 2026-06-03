-- ============================================================================
-- VOCAB RESTRUCTURE — Phase 1: unified per-student-per-word card table.
-- Single source of truth for a student's relationship with a word: ONE FSRS
-- review queue, ONE mastery model, ONE "words known" total. Replaces the
-- fragmented set: curriculum_vocabulary_srs (FSRS), vocabulary_word_mastery
-- (exercise mastery), student_saved_words (SM-2), vocabulary_bank (legacy).
-- curriculum_vocabulary stays the shared content catalog (unchanged).
-- ADDITIVE: legacy tables are NOT touched here; they are backfilled FROM and
-- only deprecated after reconciliation passes. No student data is destroyed.
-- ============================================================================

-- Deterministic word normalization: lowercase, trim, strip surrounding
-- non-alphanumerics. Used as the per-student dedupe key and for joining the
-- unit's curriculum_vocabulary list to a student's cards.
create or replace function public.vocab_norm(w text)
returns text language sql immutable parallel safe as $$
  select lower(btrim(regexp_replace(coalesce(w, ''), '(^[^[:alnum:]]+)|([^[:alnum:]]+$)', '', 'g')))
$$;

create table if not exists public.vocab_cards (
  id                          uuid primary key default gen_random_uuid(),
  student_id                  uuid not null,
  curriculum_vocabulary_id    uuid references public.curriculum_vocabulary(id) on delete set null,
  word                        text not null,
  word_normalized             text not null,
  meaning_ar                  text,
  meaning_en                  text,
  context_sentence            text,
  source                      text not null default 'curriculum',  -- curriculum|reading|manual|bank|quiz

  -- FSRS scheduling state (ts-fsrs; text-encoded state new|learning|review|relearning)
  state                       text not null default 'new',
  stability                   double precision not null default 0,
  difficulty                  double precision not null default 0,
  due                         timestamptz not null default now(),
  last_review                 timestamptz,
  reps                        integer not null default 0,
  lapses                      integer not null default 0,
  elapsed_days                double precision not null default 0,
  scheduled_days              double precision not null default 0,

  -- derived mastery (kept in sync by the vocab service on every write)
  mastery_level               text not null default 'new',  -- new|learning|mastered

  -- exercise completion record (from vocabulary_word_mastery)
  meaning_exercise_passed     boolean not null default false,
  sentence_exercise_passed    boolean not null default false,
  listening_exercise_passed   boolean not null default false,

  -- hard-words drill state
  hw_correct_streak           integer not null default 0,
  hw_drill_modes_seen         text[] not null default '{}',
  hw_last_drill_at            timestamptz,

  -- timing / provenance
  first_seen_at               timestamptz not null default now(),
  mastered_at                 timestamptz,
  last_practiced_at           timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- One card per student per normalized word (the dedupe contract).
create unique index if not exists vocab_cards_student_word_uniq
  on public.vocab_cards (student_id, word_normalized);
-- Due-queue lookups (new cards are introduced via a separate "new per day" cap, not "due").
create index if not exists vocab_cards_due_idx
  on public.vocab_cards (student_id, due) where state <> 'new';
create index if not exists vocab_cards_student_mastery_idx
  on public.vocab_cards (student_id, mastery_level);
create index if not exists vocab_cards_student_state_idx
  on public.vocab_cards (student_id, state);
create index if not exists vocab_cards_cvid_idx
  on public.vocab_cards (curriculum_vocabulary_id);

alter table public.vocab_cards enable row level security;

-- Mirror the curriculum_vocabulary_srs policy shape: own CRUD, service-role all, staff read.
drop policy if exists own_vocab_cards on public.vocab_cards;
create policy own_vocab_cards on public.vocab_cards for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists service_vocab_cards on public.vocab_cards;
create policy service_vocab_cards on public.vocab_cards for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists staff_read_vocab_cards on public.vocab_cards;
create policy staff_read_vocab_cards on public.vocab_cards for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin','trainer')
  ));

create or replace function public.vocab_cards_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists vocab_cards_touch_trg on public.vocab_cards;
create trigger vocab_cards_touch_trg before update on public.vocab_cards
  for each row execute function public.vocab_cards_touch();
