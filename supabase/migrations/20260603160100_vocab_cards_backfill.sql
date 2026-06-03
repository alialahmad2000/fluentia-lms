-- ============================================================================
-- VOCAB RESTRUCTURE — Phase 1 backfill into vocab_cards.
-- One-time merge of the three live stores into the unified card table, deduped
-- per (student, normalized word). Precedence for scheduling state:
--   1) curriculum_vocabulary_srs (real FSRS schedule — authoritative)
--   2) student_saved_words (SM-2 — re-seeded by FSRS on next review)
--   3) vocabulary_word_mastery (exercise mastery — derived state)
-- Mastery is OR'd across sources. Mastered-exercise words get their `due`
-- SPREAD over the next 14 days (and learning over 3) so flipping reads in
-- Phase 2 doesn't dump hundreds of "due now" cards on a student at once.
-- vocabulary_bank is empty (0 rows) so it is intentionally not a source.
-- Idempotent (ON CONFLICT DO UPDATE). MUST NOT be re-run after go-live — once
-- the app writes vocab_cards, re-running would clobber live progress with stale
-- source-table values. Safe to re-run now (nothing writes vocab_cards yet).
-- ============================================================================
with signals as (
  -- (1) FSRS queue — authoritative schedule
  select
    s.student_id,
    public.vocab_norm(cv.word)               as word_normalized,
    cv.word                                   as word,
    cv.id                                     as curriculum_vocabulary_id,
    cv.definition_ar                          as meaning_ar,
    cv.definition_en                          as meaning_en,
    cv.example_sentence                       as context_sentence,
    'curriculum'::text                        as source_kind,
    coalesce(s.state, 'new')                  as state,
    1                                         as state_priority,
    coalesce(s.stability, 0)::double precision   as stability,
    coalesce(s.difficulty, 0)::double precision  as difficulty,
    coalesce(s.due, now())                    as due,
    s.last_review                             as last_review,
    coalesce(s.reps, 0)                       as reps,
    coalesce(s.lapses, 0)                     as lapses,
    coalesce(s.elapsed_days, 0)::double precision   as elapsed_days,
    coalesce(s.scheduled_days, 0)::double precision as scheduled_days,
    case coalesce(s.state,'new') when 'new' then 0 else 1 end as mastery_rank,
    false as meaning_passed, false as sentence_passed, false as listening_passed,
    coalesce(s.hw_correct_streak, 0)          as hw_correct_streak,
    coalesce(s.hw_drill_modes_seen, '{}'::text[]) as hw_drill_modes_seen,
    s.hw_last_drill_at                        as hw_last_drill_at,
    coalesce(s.created_at, now())             as first_seen_at,
    null::timestamptz                         as mastered_at,
    s.last_review                             as last_practiced_at
  from public.curriculum_vocabulary_srs s
  join public.curriculum_vocabulary cv on cv.id = s.vocabulary_id

  union all
  -- (2) exercise mastery — derived state, due SPREAD to avoid flooding
  select
    m.student_id,
    public.vocab_norm(cv.word),
    cv.word,
    cv.id,
    cv.definition_ar, cv.definition_en, cv.example_sentence,
    'curriculum'::text,
    case coalesce(m.mastery_level,'new') when 'mastered' then 'review' when 'learning' then 'learning' else 'new' end,
    3,
    -- seed FSRS stability/difficulty so ts-fsrs reschedules sanely on first review (never 0 for review cards)
    case coalesce(m.mastery_level,'new') when 'mastered' then 10::double precision when 'learning' then 1::double precision else 0::double precision end,
    case coalesce(m.mastery_level,'new') when 'new' then 0::double precision else 5::double precision end,
    -- spread mastered re-reviews over days 7..60 (nothing due in week 1); learning over days 1..6
    case coalesce(m.mastery_level,'new')
      when 'mastered' then now() + (7 + abs(hashtext(m.id::text)) % 54) * interval '1 day'
      when 'learning' then now() + (1 + abs(hashtext(m.id::text)) % 6) * interval '1 day'
      else now() end,
    m.last_practiced_at,
    case coalesce(m.mastery_level,'new') when 'mastered' then 2 when 'learning' then 1 else 0 end, 0,
    0::double precision, 0::double precision,
    case coalesce(m.mastery_level,'new') when 'mastered' then 2 when 'learning' then 1 else 0 end,
    coalesce(m.meaning_exercise_passed,false), coalesce(m.sentence_exercise_passed,false), coalesce(m.listening_exercise_passed,false),
    0, '{}'::text[], null::timestamptz,
    coalesce(m.created_at, now()),
    case when coalesce(m.mastery_level,'new')='mastered' then coalesce(m.meaning_exercise_passed_at, m.updated_at) else null end,
    m.last_practiced_at
  from public.vocabulary_word_mastery m
  join public.curriculum_vocabulary cv on cv.id = m.vocabulary_id

  union all
  -- (3) saved words — SM-2; unreviewed saves become 'new' (introduced gradually, not "due")
  select
    w.student_id,
    public.vocab_norm(w.word),
    w.word,
    w.curriculum_vocabulary_id,
    coalesce(w.meaning, cv.definition_ar), cv.definition_en, coalesce(w.context_sentence, cv.example_sentence),
    case w.source when 'manual' then 'manual' when 'unit_complete' then 'curriculum' else 'reading' end,
    case
      when w.mastered_at is not null then 'review'
      when w.review_count >= 1 and w.repetition >= 2 then 'review'
      when w.review_count >= 1 then 'learning'
      else 'new' end,
    2,
    case when w.mastered_at is not null then 10::double precision when w.review_count >= 1 then 2::double precision else 0::double precision end,
    case when w.review_count >= 1 or w.mastered_at is not null then 5::double precision else 0::double precision end,
    case when w.review_count >= 1 or w.mastered_at is not null then coalesce(w.next_review_at, now()) else now() end,
    w.last_reviewed_at,
    coalesce(w.repetition,0), coalesce(w.failure_count,0),
    0::double precision, 0::double precision,
    case when w.mastered_at is not null then 2 when w.review_count >= 1 then 1 else 0 end,
    false, false, false,
    0, '{}'::text[], null::timestamptz,
    coalesce(w.created_at, now()),
    w.mastered_at,
    w.last_reviewed_at
  from public.student_saved_words w
  left join public.curriculum_vocabulary cv on cv.id = w.curriculum_vocabulary_id
),
-- Union of hard-words drill modes per (student, word) — array_agg of an array
-- column yields a 2-D array, so flatten via unnest then re-aggregate distinct.
hw as (
  select s.student_id, s.word_normalized, array_agg(distinct e) as modes
  from signals s, unnest(s.hw_drill_modes_seen) e
  group by s.student_id, s.word_normalized
),
agg as (
  select
    student_id,
    word_normalized,
    (array_agg(word ORDER BY state_priority))[1]                                                   as word,
    (array_agg(curriculum_vocabulary_id ORDER BY (curriculum_vocabulary_id is null), state_priority))[1] as curriculum_vocabulary_id,
    (array_agg(meaning_ar ORDER BY (meaning_ar is null), state_priority))[1]                       as meaning_ar,
    (array_agg(meaning_en ORDER BY (meaning_en is null), state_priority))[1]                       as meaning_en,
    (array_agg(context_sentence ORDER BY (context_sentence is null), state_priority))[1]           as context_sentence,
    case when bool_or(source_kind='curriculum') then 'curriculum' else (array_agg(source_kind ORDER BY state_priority))[1] end as source,
    (array_agg(state ORDER BY state_priority))[1]                                                  as state,
    (array_agg(stability ORDER BY state_priority))[1]                                              as stability,
    (array_agg(difficulty ORDER BY state_priority))[1]                                             as difficulty,
    (array_agg(due ORDER BY state_priority))[1]                                                    as due,
    (array_agg(last_review ORDER BY (last_review is null), state_priority))[1]                     as last_review,
    (array_agg(reps ORDER BY state_priority))[1]                                                   as reps,
    (array_agg(lapses ORDER BY state_priority))[1]                                                 as lapses,
    (array_agg(elapsed_days ORDER BY state_priority))[1]                                           as elapsed_days,
    (array_agg(scheduled_days ORDER BY state_priority))[1]                                         as scheduled_days,
    max(mastery_rank)                                                                              as mastery_rank,
    bool_or(meaning_passed)                                                                        as meaning_passed,
    bool_or(sentence_passed)                                                                       as sentence_passed,
    bool_or(listening_passed)                                                                      as listening_passed,
    max(hw_correct_streak)                                                                         as hw_correct_streak,
    max(hw_last_drill_at)                                                                          as hw_last_drill_at,
    min(first_seen_at)                                                                             as first_seen_at,
    min(mastered_at)                                                                               as mastered_at,
    max(last_practiced_at)                                                                         as last_practiced_at
  from signals
  where length(word_normalized) >= 2 and student_id is not null
  group by student_id, word_normalized
)
insert into public.vocab_cards (
  student_id, curriculum_vocabulary_id, word, word_normalized, meaning_ar, meaning_en, context_sentence, source,
  state, stability, difficulty, due, last_review, reps, lapses, elapsed_days, scheduled_days,
  mastery_level, meaning_exercise_passed, sentence_exercise_passed, listening_exercise_passed,
  hw_correct_streak, hw_drill_modes_seen, hw_last_drill_at, first_seen_at, mastered_at, last_practiced_at
)
select
  agg.student_id, curriculum_vocabulary_id, word, agg.word_normalized, meaning_ar, meaning_en, context_sentence, source,
  state, stability, difficulty, due, last_review, reps, lapses, elapsed_days, scheduled_days,
  case mastery_rank when 2 then 'mastered' when 1 then 'learning' else 'new' end,
  meaning_passed, sentence_passed, listening_passed,
  hw_correct_streak, coalesce(hw.modes, '{}'::text[]), hw_last_drill_at, first_seen_at, mastered_at, last_practiced_at
from agg
left join hw on hw.student_id = agg.student_id and hw.word_normalized = agg.word_normalized
on conflict (student_id, word_normalized) do update set
  curriculum_vocabulary_id  = excluded.curriculum_vocabulary_id,
  word                      = excluded.word,
  meaning_ar                = excluded.meaning_ar,
  meaning_en                = excluded.meaning_en,
  context_sentence          = excluded.context_sentence,
  source                    = excluded.source,
  state                     = excluded.state,
  stability                 = excluded.stability,
  difficulty                = excluded.difficulty,
  due                       = excluded.due,
  last_review               = excluded.last_review,
  reps                      = excluded.reps,
  lapses                    = excluded.lapses,
  elapsed_days              = excluded.elapsed_days,
  scheduled_days            = excluded.scheduled_days,
  mastery_level             = excluded.mastery_level,
  meaning_exercise_passed   = excluded.meaning_exercise_passed,
  sentence_exercise_passed  = excluded.sentence_exercise_passed,
  listening_exercise_passed = excluded.listening_exercise_passed,
  hw_correct_streak         = excluded.hw_correct_streak,
  hw_drill_modes_seen       = excluded.hw_drill_modes_seen,
  hw_last_drill_at          = excluded.hw_last_drill_at,
  first_seen_at             = excluded.first_seen_at,
  mastered_at               = excluded.mastered_at,
  last_practiced_at         = excluded.last_practiced_at;
