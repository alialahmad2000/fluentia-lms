-- Prompt 31: Vocabulary synonyms & antonyms network learning
-- Table in this project is `curriculum_vocabulary` (not `vocabulary`)

ALTER TABLE curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS synonyms JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS antonyms JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS relationships_generated_at TIMESTAMPTZ;

-- Format for each array element:
-- {
--   "word": "enraged",
--   "level": 4,
--   "vocabulary_id": "uuid-or-null", -- set if word exists in curriculum_vocabulary
--   "is_strongest": false             -- true for the highest-level synonym
-- }

-- Partial index for agents to pick up unprocessed rows
CREATE INDEX IF NOT EXISTS idx_curriculum_vocab_relationships_pending
  ON curriculum_vocabulary(id)
  WHERE relationships_generated_at IS NULL;

-- GIN indexes for potential future lookups
CREATE INDEX IF NOT EXISTS idx_curriculum_vocab_synonyms_gin
  ON curriculum_vocabulary USING GIN (synonyms);
CREATE INDEX IF NOT EXISTS idx_curriculum_vocab_antonyms_gin
  ON curriculum_vocabulary USING GIN (antonyms);
