-- ============================================================
-- VOCAB-PREMIUM Prompt 08 (Polish + Gaps)
-- 5 additive profile columns for unit-vocab settings gear,
-- onboarding completion tracking, and smart-nudge return-greeting.
-- Idempotent.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vocab_view_mode_default TEXT DEFAULT 'grid'
    CHECK (vocab_view_mode_default IN ('grid', 'list')),
  ADD COLUMN IF NOT EXISTS vocab_card_autoplay_audio BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vocab_tap_behavior TEXT DEFAULT 'details'
    CHECK (vocab_tap_behavior IN ('details', 'practice')),
  ADD COLUMN IF NOT EXISTS vocab_onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_vocab_visit_at TIMESTAMPTZ;
