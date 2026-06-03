-- ============================================================================
-- VOCAB RESTRUCTURE — Phase 1: let the shared review log work for ALL cards.
-- srs_review_logs.vocabulary_id is NOT NULL and FK-bound to curriculum_vocabulary,
-- so reviews of non-curriculum words (saved-while-reading, manual) couldn't be
-- logged there. Add a nullable vocab_card_id and relax vocabulary_id so the
-- unified vocab service can log every review (streak + new-per-day rely on it).
-- Existing srs.ts logging (vocabulary_id) keeps working unchanged.
-- ============================================================================
alter table public.srs_review_logs
  add column if not exists vocab_card_id uuid references public.vocab_cards(id) on delete set null;

alter table public.srs_review_logs
  alter column vocabulary_id drop not null;

create index if not exists srs_review_logs_card_idx
  on public.srs_review_logs (student_id, vocab_card_id);
