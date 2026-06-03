-- ============================================================================
-- VOCAB "PATH OF LIGHT" — the journey structure.
-- Two-tier: a REGION = a themed curriculum unit; within it, CONSTELLATIONS =
-- ~12-word stops. The student walks region→region, constellation→constellation.
-- Built on the unified vocab_cards store (mastery by normalized word).
--
-- vocab_get_journey(student): the trail (regions + progress) + the current stop
--   summary + headline stats (words known, due) — renders the Path surface.
-- vocab_get_stop(student, unit_id, constellation_index): the actual word list
--   for one micro-session = the constellation's new/learning words + a few
--   folded-in due reviews + a couple hard words, each enriched.
-- ============================================================================

create or replace function public.vocab_get_journey(p_student uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := coalesce(p_student, auth.uid());
  v_level   int;
  v_size    int := 12;            -- constellation size
  v_known   int;
  v_due     int;
  v_regions jsonb;
  v_current jsonb;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  select academic_level into v_level from public.students where id = v_student;
  v_level := coalesce(v_level, 1);

  -- headline stats (whole sky)
  select count(*) filter (where mastery_level = 'mastered')::int,
         count(*) filter (where state <> 'new' and due <= now())::int
    into v_known, v_due
  from public.vocab_cards where student_id = v_student;

  -- words in reach (units up to one level above the student), chunked into
  -- constellations, each marked mastered/not for this student.
  with words as (
    select
      cu.id as unit_id, cu.unit_number, cl.level_number, cu.theme_ar,
      cv.id as cvid, public.vocab_norm(cv.word) as wn,
      row_number() over (
        partition by cu.id
        order by coalesce(cv.tier_order, 9999), coalesce(cv.sort_order, 0), cv.word, cv.id
      ) as rn
    from public.curriculum_units cu
    join public.curriculum_levels cl on cl.id = cu.level_id
    join public.curriculum_readings cr on cr.unit_id = cu.id
    join public.curriculum_vocabulary cv on cv.reading_id = cr.id
    -- the journey focuses on the student's working band (one level below to one above),
    -- not the entire curriculum — so advanced students don't start at L0 basics.
    where cl.level_number between greatest(0, v_level - 1) and v_level + 1
  ),
  mastered_words as (   -- this student's mastered normalized words, once
    select distinct word_normalized from public.vocab_cards
    where student_id = v_student and mastery_level = 'mastered'
  ),
  marked as (
    select w.*, ((w.rn - 1) / v_size) as constellation_index,
      (mw.word_normalized is not null) as mastered
    from words w
    left join mastered_words mw on mw.word_normalized = w.wn
  ),
  cons as (   -- per constellation
    select unit_id, unit_number, level_number, theme_ar, constellation_index,
           count(*)::int total, count(*) filter (where mastered)::int mastered
    from marked
    group by unit_id, unit_number, level_number, theme_ar, constellation_index
  ),
  regions as (   -- per region (unit)
    select unit_id, unit_number, level_number, theme_ar,
           count(*)::int constellations,
           count(*) filter (where mastered >= total and total > 0)::int constellations_done,
           sum(total)::int total_words,
           sum(mastered)::int mastered_words
    from cons
    group by unit_id, unit_number, level_number, theme_ar
  ),
  ordered as (   -- the journey order
    select c.*, row_number() over (order by level_number, unit_number, constellation_index) as journey_pos
    from cons c
  ),
  cur as (   -- the current stop = first not-fully-complete constellation
    select * from ordered where mastered < total order by journey_pos limit 1
  )
  select
    (select jsonb_agg(jsonb_build_object(
      'unit_id', r.unit_id, 'unit_number', r.unit_number, 'level_number', r.level_number,
      'theme_ar', r.theme_ar, 'constellations', r.constellations,
      'constellations_done', r.constellations_done,
      'total_words', r.total_words, 'mastered_words', r.mastered_words,
      'status', case
        when r.constellations_done >= r.constellations then 'complete'
        when exists (select 1 from cur where cur.unit_id = r.unit_id) then 'current'
        when r.mastered_words > 0 then 'in_progress'
        else 'available' end
    ) order by r.level_number, r.unit_number) from regions r),
    (select jsonb_build_object(
      'unit_id', c.unit_id, 'unit_number', c.unit_number, 'level_number', c.level_number,
      'theme_ar', c.theme_ar, 'constellation_index', c.constellation_index,
      'total', c.total, 'mastered', c.mastered
    ) from cur c)
  into v_regions, v_current;

  return jsonb_build_object(
    'words_known', v_known,
    'due_count', v_due,
    'level', v_level,
    'regions', coalesce(v_regions, '[]'::jsonb),
    'current', v_current   -- null when the whole reachable journey is complete
  );
end $$;
grant execute on function public.vocab_get_journey(uuid) to authenticated;


create or replace function public.vocab_get_stop(
  p_student uuid,
  p_unit_id uuid,
  p_constellation_index int,
  p_review_limit int default 4,
  p_hard_limit int default 2
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := coalesce(p_student, auth.uid());
  v_size    int := 12;
  v_new     jsonb;
  v_review  jsonb;
  v_hard    jsonb;
begin
  if v_student is null then raise exception 'not authenticated'; end if;

  -- the constellation's words (the ~12 in this chunk), with the student's state
  with words as (
    select cv.id as cvid, cv.word, cv.definition_ar, cv.definition_en, cv.example_sentence,
           cv.part_of_speech, cv.pronunciation_ipa, cv.audio_url, cv.pronunciation_alert,
           public.vocab_norm(cv.word) as wn,
           row_number() over (order by coalesce(cv.tier_order,9999), coalesce(cv.sort_order,0), cv.word, cv.id) as rn
    from public.curriculum_readings cr
    join public.curriculum_vocabulary cv on cv.reading_id = cr.id
    where cr.unit_id = p_unit_id
  )
  select jsonb_agg(jsonb_build_object(
           'curriculum_vocabulary_id', w.cvid, 'word', w.word, 'definition_ar', w.definition_ar,
           'definition_en', w.definition_en, 'example_sentence', w.example_sentence,
           'part_of_speech', w.part_of_speech, 'pronunciation_ipa', w.pronunciation_ipa,
           'audio_url', w.audio_url, 'pronunciation_alert', w.pronunciation_alert,
           'card', (select to_jsonb(vc) from public.vocab_cards vc where vc.student_id=v_student and vc.word_normalized=w.wn)
         ) order by w.rn)
    into v_new
  from (select * from words where ((rn - 1) / v_size) = p_constellation_index) w;

  -- folded-in due reviews from anywhere (keeps the trail behind you glowing)
  select jsonb_agg(to_jsonb(t)) into v_review from (
    select vc.id, vc.curriculum_vocabulary_id, vc.word, vc.meaning_ar, vc.state, vc.stability,
           vc.difficulty, vc.due, vc.last_review, vc.reps, vc.lapses, vc.elapsed_days, vc.scheduled_days,
           cv.definition_en, cv.example_sentence, cv.pronunciation_ipa, cv.audio_url, cv.pronunciation_alert
    from public.vocab_cards vc
    left join public.curriculum_vocabulary cv on cv.id = vc.curriculum_vocabulary_id
    where vc.student_id = v_student and vc.state in ('learning','review','relearning') and vc.due <= now()
    order by vc.due asc limit p_review_limit
  ) t;

  -- a couple of struggling stars to repair
  select jsonb_agg(to_jsonb(t)) into v_hard from (
    select vc.id, vc.curriculum_vocabulary_id, vc.word, vc.meaning_ar, vc.hw_correct_streak,
           cv.definition_en, cv.example_sentence, cv.audio_url
    from public.vocab_cards vc
    left join public.curriculum_vocabulary cv on cv.id = vc.curriculum_vocabulary_id
    where vc.student_id = v_student and vc.mastery_level <> 'mastered'
      and (vc.lapses >= 2 or vc.difficulty >= 7)
    order by vc.difficulty desc limit p_hard_limit
  ) t;

  return jsonb_build_object(
    'new', coalesce(v_new, '[]'::jsonb),
    'review', coalesce(v_review, '[]'::jsonb),
    'hard', coalesce(v_hard, '[]'::jsonb)
  );
end $$;
grant execute on function public.vocab_get_stop(uuid, uuid, int, int, int) to authenticated;
