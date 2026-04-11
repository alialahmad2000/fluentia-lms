-- Prompt 35: Word families with morphology explanations
-- Target table is `curriculum_vocabulary` in this project.

ALTER TABLE curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS word_family JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS word_family_generated_at TIMESTAMPTZ;

-- Format for each family member:
-- {
--   "word": "different",
--   "pos": "adjective",
--   "level": 2,
--   "vocabulary_id": "uuid-or-null",
--   "is_base": false,
--   "is_opposite": false,
--   "morphology": {
--     "affix": "-ent",
--     "affix_type": "suffix",
--     "base_word": "differ",
--     "base_pos": "verb",
--     "rule_ar": "... natural 1-2 sentence Arabic explanation ...",
--     "similar_examples": ["depend → dependent", "persist → persistent"]
--   }
-- }
-- Base word: { "is_base": true, ... morphology: { "is_base": true, "note_ar": "..." } }
-- Irregular: morphology.irregular = true, with note_ar

CREATE INDEX IF NOT EXISTS idx_curriculum_vocab_family_pending
  ON curriculum_vocabulary(id)
  WHERE word_family_generated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_curriculum_vocab_family_gin
  ON curriculum_vocabulary USING GIN (word_family);
