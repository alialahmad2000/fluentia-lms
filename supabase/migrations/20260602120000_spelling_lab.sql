-- ════════════════════════════════════════════════════════════════════════════
-- SPELLING LAB (مختبر الإملاء) — prompt 09, Surface 3
-- ════════════════════════════════════════════════════════════════════════════
-- NET-NEW, built ALONGSIDE the existing "مدرب الإملاء" trainer.
-- The legacy trainer (StudentSpelling.jsx) and its tables
--   spelling_words / spelling_sessions / student_spelling_progress
-- are deliberately UNTOUCHED. To avoid a name collision (the legacy
-- spelling_words has a different schema: word/meaning_ar/difficulty/...),
-- the Lab uses its own spelling_lab_* namespace for tables AND rpcs.
--
-- profiles.id == auth.uid() (profiles.id → auth.users.id), so student_id checks
-- use auth.uid() directly, matching the project's profile?.id convention.
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Master word bank (curated, indexed by difficulty) ──────────────────────
CREATE TABLE IF NOT EXISTS public.spelling_lab_words (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_en         text NOT NULL UNIQUE,
  difficulty      smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
  category        text NOT NULL, -- 'curriculum' | 'common' | 'phonetic_traps'
  source_vocab_id uuid REFERENCES public.curriculum_vocabulary(id) ON DELETE SET NULL,
  audio_url       text,
  ipa             text,
  meaning_ar      text,
  example_en      text,
  char_count      smallint GENERATED ALWAYS AS (char_length(word_en)) STORED,
  has_silent_letters boolean DEFAULT false,
  has_double_letters boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_lab_words_difficulty ON public.spelling_lab_words(difficulty);
CREATE INDEX IF NOT EXISTS idx_spelling_lab_words_category   ON public.spelling_lab_words(category);

-- ── Per-student per-word state (Anki-lite) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spelling_lab_mastery (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id          uuid NOT NULL REFERENCES public.spelling_lab_words(id) ON DELETE CASCADE,
  attempts_total   int NOT NULL DEFAULT 0,
  attempts_correct int NOT NULL DEFAULT 0,
  current_streak   int NOT NULL DEFAULT 0,   -- consecutive correct
  best_streak      int NOT NULL DEFAULT 0,
  state            text NOT NULL DEFAULT 'new' CHECK (state IN ('new','learning','reviewing','mastered')),
  due_at           timestamptz,              -- next review (null = not in queue)
  last_seen_at     timestamptz,
  last_correct_at  timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (student_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_spelling_lab_mastery_student_due
  ON public.spelling_lab_mastery(student_id, due_at) WHERE due_at IS NOT NULL;

-- ── Attempt log (audit + analytics, append-only) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.spelling_lab_attempts (
  id           bigserial PRIMARY KEY,
  student_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id      uuid NOT NULL REFERENCES public.spelling_lab_words(id) ON DELETE CASCADE,
  mode         text NOT NULL CHECK (mode IN ('listen_type','see_retype')),
  attempt_text text NOT NULL,
  is_correct   boolean NOT NULL,
  ms_to_submit int,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_lab_attempts_student
  ON public.spelling_lab_attempts(student_id, created_at DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.spelling_lab_words    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spelling_lab_mastery  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spelling_lab_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spelling_lab_words read"        ON public.spelling_lab_words;
DROP POLICY IF EXISTS "spelling_lab_mastery own"       ON public.spelling_lab_mastery;
DROP POLICY IF EXISTS "spelling_lab_attempts insert"   ON public.spelling_lab_attempts;
DROP POLICY IF EXISTS "spelling_lab_attempts read"     ON public.spelling_lab_attempts;

CREATE POLICY "spelling_lab_words read" ON public.spelling_lab_words
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "spelling_lab_mastery own" ON public.spelling_lab_mastery
  FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "spelling_lab_attempts insert" ON public.spelling_lab_attempts
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "spelling_lab_attempts read" ON public.spelling_lab_attempts
  FOR SELECT TO authenticated USING (student_id = auth.uid());
