-- ============================================================================
-- VOCAB JOURNEY — advance on COVERAGE, not mastery.
--
-- Bug: vocab_get_journey picked the "current stop" as the first constellation
-- where `mastered < total`. But a word only becomes `mastered` after ~21 days of
-- FSRS-spaced reviews (or passing all 3 exercise types) — studying it once just
-- moves it to `learning`. So finishing a stop never lit it, the pointer never
-- advanced, and clicking "ابدئي" re-served the SAME 12 words forever.
--
-- Fix: the Path of Light advances when you've STUDIED (practiced ≥ once) every
-- word in a constellation — i.e. mastery_level <> 'new'. Mastery (gold) still
-- accrues separately through the daily-review system; the journey just stops
-- blocking forward progress on it. We expose both `studied_*` (drives the path)
-- and keep `mastered_*` (the deeper gold metric) so the UI can show each.
-- ============================================================================

create or replace function public.vocab_get_journey(p_student uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := coalesce(p_student, auth.uid());
  v_level   int;
  v_size    int := 12;            -- constellation size
  v_known   int;                  -- mastered (gold stars)
  v_studied int;                  -- practiced at least once
  v_due     int;
  v_regions jsonb;
  v_current jsonb;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  select academic_level into v_level from public.students where id = v_student;
  v_level := coalesce(v_level, 1);

  -- headline stats (whole sky)
  select count(*) filter (where mastery_level = 'mastered')::int,
         count(*) filter (where mastery_level <> 'new')::int,
         count(*) filter (where state <> 'new' and due <= now())::int
    into v_known, v_studied, v_due
  from public.vocab_cards where student_id = v_student;

  -- words in reach (units within the student's working band), chunked into
  -- constellations, each marked studied/mastered for this student.
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
    where cl.level_number between greatest(0, v_level - 1) and v_level + 1
  ),
  state_words as (   -- this student's practiced words, once, with mastered flag
    select distinct word_normalized, bool_or(mastery_level = 'mastered') as mastered
    from public.vocab_cards
    where student_id = v_student and mastery_level <> 'new'
    group by word_normalized
  ),
  marked as (
    select w.*, ((w.rn - 1) / v_size) as constellation_index,
      (sw.word_normalized is not null) as studied,
      coalesce(sw.mastered, false) as mastered
    from words w
    left join state_words sw on sw.word_normalized = w.wn
  ),
  cons as (   -- per constellation
    select unit_id, unit_number, level_number, theme_ar, constellation_index,
           count(*)::int total,
           count(*) filter (where studied)::int studied,
           count(*) filter (where mastered)::int mastered
    from marked
    group by unit_id, unit_number, level_number, theme_ar, constellation_index
  ),
  regions as (   -- per region (unit)
    select unit_id, unit_number, level_number, theme_ar,
           count(*)::int constellations,
           count(*) filter (where studied >= total and total > 0)::int constellations_done,
           sum(total)::int total_words,
           sum(studied)::int studied_words,
           sum(mastered)::int mastered_words
    from cons
    group by unit_id, unit_number, level_number, theme_ar
  ),
  ordered as (   -- the journey order
    select c.*, row_number() over (order by level_number, unit_number, constellation_index) as journey_pos
    from cons c
  ),
  cur as (   -- the current stop = first not-fully-STUDIED constellation
    select * from ordered where studied < total order by journey_pos limit 1
  )
  select
    (select jsonb_agg(jsonb_build_object(
      'unit_id', r.unit_id, 'unit_number', r.unit_number, 'level_number', r.level_number,
      'theme_ar', r.theme_ar, 'constellations', r.constellations,
      'constellations_done', r.constellations_done,
      'total_words', r.total_words, 'studied_words', r.studied_words, 'mastered_words', r.mastered_words,
      'status', case
        when r.constellations_done >= r.constellations then 'complete'
        when exists (select 1 from cur where cur.unit_id = r.unit_id) then 'current'
        when r.studied_words > 0 then 'in_progress'
        else 'available' end
    ) order by r.level_number, r.unit_number) from regions r),
    (select jsonb_build_object(
      'unit_id', c.unit_id, 'unit_number', c.unit_number, 'level_number', c.level_number,
      'theme_ar', c.theme_ar, 'constellation_index', c.constellation_index,
      'total', c.total, 'studied', c.studied, 'mastered', c.mastered
    ) from cur c)
  into v_regions, v_current;

  return jsonb_build_object(
    'words_known', v_known,        -- mastered (gold)
    'words_studied', v_studied,    -- practiced at least once
    'due_count', v_due,
    'level', v_level,
    'regions', coalesce(v_regions, '[]'::jsonb),
    'current', v_current           -- null when the whole reachable journey is studied
  );
end $$;
grant execute on function public.vocab_get_journey(uuid) to authenticated;
