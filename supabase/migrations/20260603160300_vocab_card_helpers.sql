-- ============================================================================
-- VOCAB RESTRUCTURE — Phase 1: write-path helpers.
-- 1) A trigger so word_normalized is ALWAYS public.vocab_norm(word) regardless
--    of how a row is inserted/updated — the single normalization authority, so
--    a word saved while reading collapses onto its backfilled card (no JS drift).
-- 2) vocab_add_card RPC — the ONE atomic, idempotent save path (replaces the 4
--    inconsistent client save paths). Enriches missing meaning/context on
--    conflict; never resets review progress.
-- ============================================================================
create or replace function public.vocab_cards_normalize()
returns trigger language plpgsql as $$
begin
  new.word_normalized := public.vocab_norm(new.word);
  return new;
end $$;

drop trigger if exists vocab_cards_normalize_trg on public.vocab_cards;
create trigger vocab_cards_normalize_trg
  before insert or update of word on public.vocab_cards
  for each row execute function public.vocab_cards_normalize();

create or replace function public.vocab_add_card(
  p_word text,
  p_curriculum_vocabulary_id uuid default null,
  p_meaning_ar text default null,
  p_meaning_en text default null,
  p_context text default null,
  p_source text default 'manual'
) returns public.vocab_cards
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_norm    text := public.vocab_norm(p_word);
  v_row     public.vocab_cards;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  if length(v_norm) < 1 then raise exception 'empty word'; end if;

  insert into public.vocab_cards (
    student_id, curriculum_vocabulary_id, word, word_normalized,
    meaning_ar, meaning_en, context_sentence, source, state, due, mastery_level
  ) values (
    v_student, p_curriculum_vocabulary_id, btrim(p_word), v_norm,
    p_meaning_ar, p_meaning_en, p_context, coalesce(p_source, 'manual'), 'new', now(), 'new'
  )
  on conflict (student_id, word_normalized) do update set
    meaning_ar               = coalesce(public.vocab_cards.meaning_ar, excluded.meaning_ar),
    meaning_en               = coalesce(public.vocab_cards.meaning_en, excluded.meaning_en),
    context_sentence         = coalesce(public.vocab_cards.context_sentence, excluded.context_sentence),
    curriculum_vocabulary_id = coalesce(public.vocab_cards.curriculum_vocabulary_id, excluded.curriculum_vocabulary_id)
  returning * into v_row;

  return v_row;
end $$;

grant execute on function public.vocab_add_card(text, uuid, text, text, text, text) to authenticated;
