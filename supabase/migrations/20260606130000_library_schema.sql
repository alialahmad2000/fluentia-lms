-- ============================================================================
-- FLUENTIA LIBRARY — P1: schema + RLS + gating  (additive, library_* prefix)
-- Source of truth: docs/FLUENTIA-LIBRARY-SPEC.md
-- Rules honored: purely additive; never touches curriculum_*/students/profiles;
-- RLS on every table; gating enforced server-side via SECURITY DEFINER helpers.
-- Level gating uses students.academic_level (0=Pre-A1 .. 5=C1).
-- ============================================================================

-- ---------- TABLES ----------
CREATE TABLE IF NOT EXISTS public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_ar text,
  synopsis_en text,
  synopsis_ar text,
  theme text NOT NULL CHECK (theme IN ('mystery','grief','ambition')),
  cefr text NOT NULL,                 -- display label: 'A1','A1-A2','B1','B2'...
  level_number int NOT NULL,          -- gating key: matches students.academic_level
  cover_data jsonb DEFAULT '{}'::jsonb,
  author_label text,
  total_chapters int DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published')),
  required_packages text[],           -- null = all packages (tier gating layered later)
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.library_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  chapter_number int NOT NULL,
  title_en text,
  title_ar text,
  word_count int DEFAULT 0,
  audio_url text,                     -- nullable until audio milestone (M5)
  audio_timestamps jsonb,             -- word-level, nullable until M5
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (book_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS public.library_paragraphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.library_chapters(id) ON DELETE CASCADE,
  paragraph_index int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (chapter_id, paragraph_index)
);

-- powers REVEAL mode (tap sentence -> Arabic)
CREATE TABLE IF NOT EXISTS public.library_sentence_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id uuid NOT NULL REFERENCES public.library_paragraphs(id) ON DELETE CASCADE,
  sentence_index int NOT NULL,
  text_en text NOT NULL,
  text_ar text,
  is_dialogue boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (paragraph_id, sentence_index)
);

-- resume position + mode + book completion (one row per student+book)
CREATE TABLE IF NOT EXISTS public.library_reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  current_chapter_id uuid REFERENCES public.library_chapters(id) ON DELETE SET NULL,
  last_sentence_index int DEFAULT 0,
  mode text NOT NULL DEFAULT 'reveal' CHECK (mode IN ('reveal','assist')),
  book_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (student_id, book_id)
);

-- chapter completions (REVEAL-only counts; one row per student+chapter)
CREATE TABLE IF NOT EXISTS public.library_chapter_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.library_chapters(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'reveal',
  completed_at timestamptz DEFAULT now(),
  UNIQUE (student_id, chapter_id)
);

-- separate vocab deck, mirroring student_saved_words SM-2 fields
CREATE TABLE IF NOT EXISTS public.library_saved_vocab (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.library_books(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.library_chapters(id) ON DELETE SET NULL,
  word text NOT NULL,
  meaning text,
  context_sentence text,
  source text DEFAULT 'library',
  ease_factor numeric DEFAULT 2.5,
  interval_days int DEFAULT 0,
  repetition int DEFAULT 0,
  next_review_at timestamptz DEFAULT now(),
  last_reviewed_at timestamptz,
  review_count int DEFAULT 0,
  success_count int DEFAULT 0,
  failure_count int DEFAULT 0,
  mastered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, word, book_id)
);

-- trophies / book completions / unlock celebrations
CREATE TABLE IF NOT EXISTS public.library_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind text NOT NULL,                 -- 'trophy' | 'book_completed' | 'unlock'
  code text NOT NULL,                 -- 'first_book','5_books','streak_7'...
  book_id uuid REFERENCES public.library_books(id) ON DELETE SET NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  earned_at timestamptz DEFAULT now(),
  UNIQUE (student_id, code, book_id)
);

-- ---------- INDEXES ----------
CREATE INDEX IF NOT EXISTS idx_library_books_pub ON public.library_books(status, level_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_chapters_book ON public.library_chapters(book_id, chapter_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_paragraphs_ch ON public.library_paragraphs(chapter_id, paragraph_index);
CREATE INDEX IF NOT EXISTS idx_library_pairs_par ON public.library_sentence_pairs(paragraph_id, sentence_index);
CREATE INDEX IF NOT EXISTS idx_library_progress_student ON public.library_reading_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_library_compl_student ON public.library_chapter_completions(student_id, book_id);
CREATE INDEX IF NOT EXISTS idx_library_vocab_due ON public.library_saved_vocab(student_id, next_review_at);

-- ---------- SECURITY-DEFINER HELPERS ----------
-- student's CEFR level number (auth.uid() = profiles.id = students.id for a student)
CREATE OR REPLACE FUNCTION public.library_student_level()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT academic_level FROM public.students WHERE id = auth.uid() AND deleted_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.library_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer'))
$$;

-- is THIS chapter visible to the current student? (load-bearing gate)
--  level <= mine          -> all chapters
--  level  = mine + 1      -> chapter 1 only (taste-and-tease)
--  level >= mine + 2      -> none
CREATE OR REPLACE FUNCTION public.library_chapter_visible(p_chapter_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.library_chapters c
    JOIN public.library_books b ON b.id = c.book_id
    WHERE c.id = p_chapter_id
      AND c.deleted_at IS NULL
      AND b.deleted_at IS NULL
      AND b.status = 'published'
      AND (
        b.level_number <= COALESCE(public.library_student_level(), -1)
        OR (b.level_number = COALESCE(public.library_student_level(), -1) + 1 AND c.chapter_number = 1)
      )
  )
$$;

-- ---------- RLS ----------
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_sentence_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_chapter_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_saved_vocab ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_achievements ENABLE ROW LEVEL SECURITY;

-- BOOKS: any authenticated user sees published book metadata (covers/synopsis are not sensitive;
-- content is gated at the chapter level). Staff see everything.
DROP POLICY IF EXISTS lib_books_read ON public.library_books;
CREATE POLICY lib_books_read ON public.library_books FOR SELECT TO authenticated
  USING (public.library_is_staff() OR (status = 'published' AND deleted_at IS NULL));
DROP POLICY IF EXISTS lib_books_staff ON public.library_books;
CREATE POLICY lib_books_staff ON public.library_books FOR ALL TO authenticated
  USING (public.library_is_staff()) WITH CHECK (public.library_is_staff());

-- CHAPTERS / PARAGRAPHS / SENTENCE-PAIRS: gated by library_chapter_visible()
DROP POLICY IF EXISTS lib_chapters_read ON public.library_chapters;
CREATE POLICY lib_chapters_read ON public.library_chapters FOR SELECT TO authenticated
  USING (public.library_is_staff() OR public.library_chapter_visible(id));
DROP POLICY IF EXISTS lib_chapters_staff ON public.library_chapters;
CREATE POLICY lib_chapters_staff ON public.library_chapters FOR ALL TO authenticated
  USING (public.library_is_staff()) WITH CHECK (public.library_is_staff());

DROP POLICY IF EXISTS lib_paras_read ON public.library_paragraphs;
CREATE POLICY lib_paras_read ON public.library_paragraphs FOR SELECT TO authenticated
  USING (public.library_is_staff() OR public.library_chapter_visible(chapter_id));
DROP POLICY IF EXISTS lib_paras_staff ON public.library_paragraphs;
CREATE POLICY lib_paras_staff ON public.library_paragraphs FOR ALL TO authenticated
  USING (public.library_is_staff()) WITH CHECK (public.library_is_staff());

DROP POLICY IF EXISTS lib_pairs_read ON public.library_sentence_pairs;
CREATE POLICY lib_pairs_read ON public.library_sentence_pairs FOR SELECT TO authenticated
  USING (
    public.library_is_staff()
    OR public.library_chapter_visible((SELECT p.chapter_id FROM public.library_paragraphs p WHERE p.id = paragraph_id))
  );
DROP POLICY IF EXISTS lib_pairs_staff ON public.library_sentence_pairs;
CREATE POLICY lib_pairs_staff ON public.library_sentence_pairs FOR ALL TO authenticated
  USING (public.library_is_staff()) WITH CHECK (public.library_is_staff());

-- STUDENT-OWNED rows: own only (auth.uid() = student_id). Staff read all.
DROP POLICY IF EXISTS lib_progress_own ON public.library_reading_progress;
CREATE POLICY lib_progress_own ON public.library_reading_progress FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.library_is_staff())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS lib_compl_own ON public.library_chapter_completions;
CREATE POLICY lib_compl_own ON public.library_chapter_completions FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.library_is_staff())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS lib_vocab_own ON public.library_saved_vocab;
CREATE POLICY lib_vocab_own ON public.library_saved_vocab FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.library_is_staff())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS lib_ach_own ON public.library_achievements;
CREATE POLICY lib_ach_own ON public.library_achievements FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.library_is_staff());
-- (achievements are written by service-role edge functions, which bypass RLS)
