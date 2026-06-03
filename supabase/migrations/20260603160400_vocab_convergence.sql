-- ============================================================================
-- VOCAB RESTRUCTURE — Phase 2: write-convergence RPCs so every entry point
-- feeds the unified vocab_cards store (exercises, hard-words drills).
-- ============================================================================

-- hard_words_drill_log: allow non-curriculum cards to log drills.
alter table public.hard_words_drill_log
  add column if not exists vocab_card_id uuid references public.vocab_cards(id) on delete set null;
alter table public.hard_words_drill_log
  alter column vocabulary_id drop not null;

-- Record an exercise pass into the unified store. Idempotent: ensures the card
-- exists, ORs the passed flag, recomputes mastery, and on first full mastery
-- schedules the word into the review queue. (Curriculum progress continues to
-- use vocabulary_word_mastery independently — this mirrors into vocab_cards so
-- the standalone vocabulary experience reflects curriculum work.)
create or replace function public.vocab_record_exercise(
  p_curriculum_vocabulary_id uuid,
  p_exercise text,
  p_word text default null,
  p_meaning_ar text default null
) returns public.vocab_cards
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_word    text;
  v_meaning text;
  v_norm    text;
  v_row     public.vocab_cards;
  v_all     boolean;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  if p_exercise not in ('meaning', 'sentence', 'listening') then raise exception 'bad exercise'; end if;

  select coalesce(p_word, cv.word), coalesce(p_meaning_ar, cv.definition_ar)
    into v_word, v_meaning
    from public.curriculum_vocabulary cv
   where cv.id = p_curriculum_vocabulary_id;
  v_word := coalesce(v_word, p_word);
  if v_word is null then raise exception 'word not found'; end if;
  v_norm := public.vocab_norm(v_word);

  insert into public.vocab_cards (
    student_id, curriculum_vocabulary_id, word, word_normalized, meaning_ar, source, state, due, mastery_level
  ) values (
    v_student, p_curriculum_vocabulary_id, v_word, v_norm, v_meaning, 'curriculum', 'new', now(), 'new'
  )
  on conflict (student_id, word_normalized) do update set
    curriculum_vocabulary_id = coalesce(public.vocab_cards.curriculum_vocabulary_id, excluded.curriculum_vocabulary_id),
    meaning_ar               = coalesce(public.vocab_cards.meaning_ar, excluded.meaning_ar);

  update public.vocab_cards set
    meaning_exercise_passed   = meaning_exercise_passed   or (p_exercise = 'meaning'),
    sentence_exercise_passed  = sentence_exercise_passed  or (p_exercise = 'sentence'),
    listening_exercise_passed = listening_exercise_passed or (p_exercise = 'listening'),
    last_practiced_at         = now()
  where student_id = v_student and word_normalized = v_norm
  returning * into v_row;

  v_all := v_row.meaning_exercise_passed and v_row.sentence_exercise_passed and v_row.listening_exercise_passed;

  update public.vocab_cards set
    mastery_level = case when v_all then 'mastered'
                         when meaning_exercise_passed or sentence_exercise_passed or listening_exercise_passed then 'learning'
                         else mastery_level end,
    mastered_at   = case when v_all then coalesce(mastered_at, now()) else mastered_at end,
    state         = case when v_all and state = 'new' then 'review' else state end,
    stability     = case when v_all and state = 'new' then 2 else stability end,
    difficulty    = case when v_all and state = 'new' then 5 else difficulty end,
    due           = case when v_all and state = 'new' then now() + interval '2 days' else due end
  where student_id = v_student and word_normalized = v_norm
  returning * into v_row;

  return v_row;
end $$;
grant execute on function public.vocab_record_exercise(uuid, text, text, text) to authenticated;

-- Record a hard-words drill attempt into the unified store.
create or replace function public.vocab_record_drill(
  p_card_id uuid,
  p_drill_mode text,
  p_is_correct boolean
) returns public.vocab_cards
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_row     public.vocab_cards;
begin
  if v_student is null then raise exception 'not authenticated'; end if;

  update public.vocab_cards set
    hw_correct_streak   = case when p_is_correct then hw_correct_streak + 1 else 0 end,
    hw_drill_modes_seen = case when p_drill_mode is not null and not (p_drill_mode = any(hw_drill_modes_seen))
                               then array_append(hw_drill_modes_seen, p_drill_mode) else hw_drill_modes_seen end,
    hw_last_drill_at    = now(),
    last_practiced_at   = now(),
    lapses              = case when p_is_correct then lapses else lapses + 1 end,
    difficulty          = case when p_is_correct then greatest(1, difficulty - 0.3) else least(10, difficulty + 0.5) end
  where id = p_card_id and student_id = v_student
  returning * into v_row;

  if v_row.id is not null then
    insert into public.hard_words_drill_log (student_id, vocab_card_id, vocabulary_id, drill_mode, is_correct)
    values (v_student, p_card_id, v_row.curriculum_vocabulary_id, p_drill_mode, p_is_correct);
  end if;
  return v_row;
end $$;
grant execute on function public.vocab_record_drill(uuid, text, boolean) to authenticated;
