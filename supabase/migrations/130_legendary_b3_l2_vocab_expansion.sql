-- LEGENDARY-B3: L2 Vocabulary Expansion to 1,300 CEFR-A2 words (tiered)
-- Applied via scripts/staging/l2_vocab_*.cjs → direct INSERT into curriculum_vocabulary
--
-- Summary:
--   1,045 new vocabulary words inserted into L2 (level_id = 'd3349438-8c8e-46b6-9ee6-e2e01c23229d')
--   All marked: added_in_prompt = 'LEGENDARY-B3', appears_in_passage = false
--   Attached to first reading of each unit (FK requirement)
--   Tiers: core/extended/mastery
--   CEFR: A1 ~4%, A2 ~56%, B1 ~40%
--   Sources: CEFR-J + NGSL
--
-- Verification:
--   L2 unique final: 1,300 (target >= 1,300) ✓
--   Every unit >= 96 unique (target >= 90) ✓
--   L2 readings unchanged: 24 ✓
--   No student data affected (0 active L2 students) ✓

SELECT 'LEGENDARY-B3: L2 vocab expansion marker migration' AS info;
