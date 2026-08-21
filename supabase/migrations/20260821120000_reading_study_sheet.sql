-- «ورقة المذاكرة» — the study layer distilled from each reading passage.
-- APPLIED to production 2026-08-21.
--
-- The reading section was read → listen → answer → a few highlighted words:
-- nothing in it survived the session. This column carries what a teacher says
-- at the board after the class finishes reading — the patterns that are
-- actually in THIS passage, the phrases worth stealing whole, and a short
-- check that can only be answered by someone who studied the explanation
-- rather than re-scanning the text.
--
-- Purely ADDITIVE. The passage, the audio, curriculum_vocabulary and the
-- comprehension questions are untouched; the sheet renders between the article
-- and the questions, so those questions now test something that was taught.
-- A reading with no sheet renders nothing, so this is safe on all 260 rows.
--
-- Shape (version 1):
-- {
--   "version": 1,
--   "digest_ar": ["…", "…", "…"],
--   "teach": [{ "id","title_ar","title_en","from_text","highlights":[],
--               "explain_ar","watch_out_ar","examples_en":[],"try_ar" }],
--   "phrases": [{ "en","ar" }],
--   "map": { "kind","label_ar","nodes":[] },
--   "check": [{ "id","type":"mcq|order|produce","teaches","stem_en",
--               "options":[],"answer","tokens":[],"prompt_ar","model_en","why_ar" }]
-- }
--
-- Authoring rules the Arabic prose must follow (each one is a bug we hit):
--   • an Arabic sentence must never END on a Latin word — the final «.» jumps
--     to the wrong side under RTL bidi (".so" instead of "so.")
--   • never glue «و» / «بـ» straight onto a Latin word: "وwhen" paints as
--     "wheng". Always separate the two scripts with a space.
--   • no tatweel followed by Latin ("ـer") for the same reason — write "-er".
--   • write second person FEMININE, and only with imperatives that
--     src/i18n/gender.js FEM_TO_MASC covers, so male students are converted.
alter table public.curriculum_readings
  add column if not exists study_sheet jsonb;

comment on column public.curriculum_readings.study_sheet is
  '«ورقة المذاكرة» — teacher-voice study layer distilled from this passage (patterns, phrases, text map, and a study check). Additive: does not replace comprehension questions or vocabulary. See this migration for the v1 shape.';

-- Fast "which readings still need a sheet" scans for the authoring backfill.
create index if not exists curriculum_readings_study_sheet_missing_idx
  on public.curriculum_readings (unit_id)
  where study_sheet is null;
