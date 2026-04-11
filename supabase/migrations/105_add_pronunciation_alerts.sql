-- Migration 105: Pronunciation alerts for vocabulary
-- Adds per-word pronunciation trap warnings (silent letters, stress issues,
-- Arab-specific confusions) with individual Arabic explanations.
--
-- Schema per alert (NULL if the word has no trap):
-- {
--   "has_alert": true,
--   "severity": "high" | "medium" | "low",
--   "ipa": "/naɪt/",
--   "common_mispronunciation_ar": "كاي-نايت (غلط)",
--   "correct_approximation_ar": "نايت",
--   "problem_letters": [0],
--   "rule_category": "silent_k_before_n",
--   "explanation_ar": "...",
--   "similar_words": ["knee", "know", "knife"],
--   "practice_tip_ar": "..."
-- }

ALTER TABLE curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS pronunciation_alert JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pronunciation_generated_at TIMESTAMPTZ;

-- Partial index for the generation pipeline (finds rows still needing processing)
CREATE INDEX IF NOT EXISTS idx_vocab_pronunciation_pending
  ON curriculum_vocabulary(id)
  WHERE pronunciation_generated_at IS NULL;

-- GIN index on the JSONB payload for future filtering by severity / rule_category
CREATE INDEX IF NOT EXISTS idx_vocab_pronunciation_alert_gin
  ON curriculum_vocabulary USING GIN (pronunciation_alert)
  WHERE pronunciation_alert IS NOT NULL;
