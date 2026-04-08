-- Enforce vocabulary uniqueness per reading + word + POS
-- Created in PROMPT 12B after full duplicate cleanup
-- Prevents the duplicate generation issue identified in PROMPT 11
-- (generate-vocab-l4-l5.cjs ran multiple times without dedup check)

CREATE UNIQUE INDEX uq_vocab_word_pos_per_reading
ON curriculum_vocabulary (reading_id, LOWER(word), part_of_speech);

COMMENT ON INDEX uq_vocab_word_pos_per_reading IS
  'Prevents duplicate vocabulary entries (same word + same POS) within a single reading. Added after PROMPT 12B cleanup. Allows different POS of same word (e.g., "run" verb + "run" noun). Allows same word across different readings (intentional spiral repetition).';
