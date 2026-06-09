-- ── Curriculum Mistake Detector (REPORT-ONLY) ────────────────────────────────
-- Ali's rule (2026-06-09): the AI SUSPECTS curriculum mistakes and tells us —
-- it NEVER edits curriculum content itself. Humans fix; the flag tracks it.
--
-- Sources scanned:
--   reading_question   — student_curriculum_progress.answers (object keyed by
--                        comprehension-question uuid) vs curriculum_comprehension_questions
--   listening_question — answers->'questions' array (questionIndex/studentAnswer)
--                        vs curriculum_listening.exercises[idx]
--   grammar_exercise   — answers->'exercises' array (item uuid) vs
--                        curriculum_grammar_exercises.items
--   audio_health       — audio_event_log stalls/errors per audio_url (14 days)
--   vocab_confusion    — match-exercise wrong pairings (word A matched to word B)
--
-- The views below are SERVICE-ROLE-ONLY raw aggregates consumed by the
-- curriculum-mistake-detector edge function; the admin UI reads only the
-- curriculum_quality_flags table (RLS: staff).

-- ── 1. Flags table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.curriculum_quality_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL CHECK (source IN ('reading_question','listening_question','grammar_exercise','audio_health','vocab_confusion')),
  unit_id     uuid,
  item_ref    jsonb NOT NULL,           -- pointer to the suspect item (ids/indexes/urls)
  evidence    jsonb NOT NULL,           -- the stats that triggered suspicion
  ai_verdict  jsonb,                    -- {suspected, confidence, reason_ar, suggested_fix_ar}
  severity    text NOT NULL DEFAULT 'medium' CHECK (severity IN ('high','medium','low')),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','fixed','dismissed','auto_ok')),
  dedupe_key  text NOT NULL UNIQUE,     -- stable per item; reruns update evidence, never duplicate
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cqf_status ON public.curriculum_quality_flags(status, severity, created_at DESC);

ALTER TABLE public.curriculum_quality_flags ENABLE ROW LEVEL SECURITY;

-- Staff read; staff may update review fields (status/resolution). No client INSERT:
-- only the detector edge function (service role) writes flags.
DROP POLICY IF EXISTS cqf_staff_select ON public.curriculum_quality_flags;
CREATE POLICY cqf_staff_select ON public.curriculum_quality_flags FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

DROP POLICY IF EXISTS cqf_staff_update ON public.curriculum_quality_flags;
CREATE POLICY cqf_staff_update ON public.curriculum_quality_flags FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- ── 2. Raw aggregate views (service-role only) ──────────────────────────────

CREATE OR REPLACE VIEW public.v_cq_reading_question_stats AS
WITH raw AS (
  SELECT scp.student_id,
         t.key::uuid  AS question_id,
         (t.value->>'correct')::boolean AS is_correct,
         t.value->>'selected'           AS selected
  FROM public.student_curriculum_progress scp,
       jsonb_each(scp.answers) AS t(key, value)
  WHERE scp.section_type = 'reading'
    AND jsonb_typeof(scp.answers) = 'object'
    AND t.key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND jsonb_typeof(t.value) = 'object'
),
per_q AS (
  SELECT question_id,
         count(*)                                  AS attempts,
         count(DISTINCT student_id)                AS students,
         count(*) FILTER (WHERE NOT is_correct)    AS wrong_n
  FROM raw GROUP BY 1
),
dist AS (
  SELECT question_id, jsonb_object_agg(selected, n) AS wrong_distribution, max(n) AS top_wrong_n
  FROM (
    SELECT question_id, selected, count(*) n
    FROM raw WHERE NOT is_correct AND selected IS NOT NULL
    GROUP BY 1, 2
  ) s GROUP BY 1
)
SELECT q.id AS question_id, r.unit_id, q.reading_id, q.question_en, q.choices, q.correct_answer,
       p.attempts, p.students, p.wrong_n,
       round(100.0 * p.wrong_n / p.attempts, 1) AS wrong_pct,
       d.wrong_distribution, coalesce(d.top_wrong_n, 0) AS top_wrong_n
FROM per_q p
JOIN public.curriculum_comprehension_questions q ON q.id = p.question_id
JOIN public.curriculum_readings r ON r.id = q.reading_id
LEFT JOIN dist d ON d.question_id = p.question_id;

CREATE OR REPLACE VIEW public.v_cq_listening_question_stats AS
WITH raw AS (
  SELECT scp.student_id, scp.listening_id,
         (q->>'questionIndex')::int     AS qidx,
         (q->>'isCorrect')::boolean     AS is_correct,
         q->>'studentAnswer'            AS student_answer
  FROM public.student_curriculum_progress scp,
       jsonb_array_elements(scp.answers->'questions') q
  WHERE scp.section_type = 'listening'
    AND scp.listening_id IS NOT NULL
    AND jsonb_typeof(scp.answers->'questions') = 'array'
    AND q ? 'questionIndex'
),
per_q AS (
  SELECT listening_id, qidx,
         count(*)                               AS attempts,
         count(DISTINCT student_id)             AS students,
         count(*) FILTER (WHERE NOT is_correct) AS wrong_n
  FROM raw GROUP BY 1, 2
),
dist AS (
  SELECT listening_id, qidx, jsonb_object_agg(student_answer, n) AS wrong_distribution, max(n) AS top_wrong_n
  FROM (
    SELECT listening_id, qidx, student_answer, count(*) n
    FROM raw WHERE NOT is_correct AND student_answer IS NOT NULL
    GROUP BY 1, 2, 3
  ) s GROUP BY 1, 2
)
SELECT cl.id AS listening_id, cl.unit_id, cl.title_en, p.qidx,
       cl.exercises->p.qidx AS exercise,
       p.attempts, p.students, p.wrong_n,
       round(100.0 * p.wrong_n / p.attempts, 1) AS wrong_pct,
       d.wrong_distribution, coalesce(d.top_wrong_n, 0) AS top_wrong_n
FROM per_q p
JOIN public.curriculum_listening cl ON cl.id = p.listening_id
LEFT JOIN dist d ON d.listening_id = p.listening_id AND d.qidx = p.qidx;

CREATE OR REPLACE VIEW public.v_cq_grammar_exercise_stats AS
WITH raw AS (
  SELECT scp.student_id, scp.grammar_id, scp.unit_id,
         e->>'id'                      AS item_id,
         (e->>'isCorrect')::boolean    AS is_correct,
         e->>'studentAnswer'           AS student_answer,
         e->>'correctAnswer'           AS correct_answer,
         e->>'type'                    AS exercise_type
  FROM public.student_curriculum_progress scp,
       jsonb_array_elements(scp.answers->'exercises') e
  WHERE scp.section_type = 'grammar'
    AND jsonb_typeof(scp.answers->'exercises') = 'array'
    AND e ? 'id'
),
per_q AS (
  SELECT item_id, min(unit_id::text)::uuid AS unit_id, min(grammar_id::text)::uuid AS grammar_id,
         min(correct_answer) AS correct_answer, min(exercise_type) AS exercise_type,
         count(*)                               AS attempts,
         count(DISTINCT student_id)             AS students,
         count(*) FILTER (WHERE NOT is_correct) AS wrong_n
  FROM raw GROUP BY item_id
),
dist AS (
  SELECT item_id, jsonb_object_agg(student_answer, n) AS wrong_distribution, max(n) AS top_wrong_n
  FROM (
    SELECT item_id, student_answer, count(*) n
    FROM raw WHERE NOT is_correct AND student_answer IS NOT NULL
    GROUP BY 1, 2
  ) s GROUP BY 1
)
SELECT p.item_id, p.unit_id, p.grammar_id, p.correct_answer, p.exercise_type,
       gi.item AS item,
       p.attempts, p.students, p.wrong_n,
       round(100.0 * p.wrong_n / p.attempts, 1) AS wrong_pct,
       d.wrong_distribution, coalesce(d.top_wrong_n, 0) AS top_wrong_n
FROM per_q p
LEFT JOIN dist d ON d.item_id = p.item_id
LEFT JOIN LATERAL (
  SELECT it.item
  FROM public.curriculum_grammar_exercises ge,
       jsonb_array_elements(ge.items) AS it(item)
  WHERE it.item->>'id' = p.item_id
  LIMIT 1
) gi ON true;

CREATE OR REPLACE VIEW public.v_cq_audio_health AS
SELECT audio_url,
       count(*) FILTER (WHERE event IN ('media_error','error'))            AS errors,
       count(*) FILTER (WHERE event = 'stalled')                           AS stalls,
       count(DISTINCT student_id)                                          AS students,
       array_agg(DISTINCT reason) FILTER (WHERE reason IS NOT NULL)        AS reasons,
       max(created_at)                                                     AS latest_at
FROM public.audio_event_log
WHERE created_at > now() - interval '14 days'
  AND event IN ('media_error','error','stalled')
  AND audio_url IS NOT NULL
GROUP BY audio_url;

CREATE OR REPLACE VIEW public.v_cq_vocab_confusion_pairs AS
WITH m AS (
  SELECT scp.student_id, t.key AS target_id, t.value AS chosen_id
  FROM public.student_curriculum_progress scp,
       jsonb_each_text(scp.answers->'exercises'->'match'->'answers') AS t(key, value)
  WHERE scp.section_type IN ('vocabulary', 'vocabulary_exercise')
    AND jsonb_typeof(scp.answers->'exercises'->'match'->'answers') = 'object'
    AND t.key <> t.value
)
SELECT vt.id AS target_id, vc.id AS chosen_id,
       vt.word AS target_word, vc.word AS chosen_word,
       vt.reading_id,
       count(*) AS n, count(DISTINCT m.student_id) AS students
FROM m
JOIN public.curriculum_vocabulary vt ON vt.id::text = m.target_id
JOIN public.curriculum_vocabulary vc ON vc.id::text = m.chosen_id
GROUP BY vt.id, vc.id, vt.word, vc.word, vt.reading_id;

-- Raw aggregates are for the detector only — keep clients out.
REVOKE ALL ON public.v_cq_reading_question_stats,
              public.v_cq_listening_question_stats,
              public.v_cq_grammar_exercise_stats,
              public.v_cq_audio_health,
              public.v_cq_vocab_confusion_pairs
  FROM anon, authenticated;

-- ── 3. Weekly cron (Mon 03:00 Riyadh = Mon 00:00 UTC) ───────────────────────
-- NOTE: current_setting('supabase.service_role_key') is NULL on this project
-- (the academy-digest cron only "works" because that fn never checks auth).
-- The bearer comes from Vault instead: secret 'edge_service_key' holds the
-- sb_secret_* key (stored at runtime via the Management API — NEVER committed).
DO $$ BEGIN PERFORM cron.unschedule('curriculum-mistake-detector-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('curriculum-mistake-detector-weekly', '0 0 * * 1', $cron$
  SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/curriculum-mistake-detector',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='edge_service_key')
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 300000
  );
$cron$);
