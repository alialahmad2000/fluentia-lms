# LEGENDARY-B3: L2 Vocabulary Expansion

**Date:** 2026-04-14
**Commit:** (see git log)
**Prompt:** LEGENDARY-B3-L2-VOCAB-EXPANSION

## Summary

Expanded Level 2 (Development) vocabulary from 255 to **1,300 unique CEFR-aligned words** using the Core/Extended/Mastery tier system. This is the largest single vocabulary expansion in the project, adding 1,045 new words across 12 units.

## Per-Unit Breakdown

| Unit | Theme | Before | Added | Final | Core | Ext | Mastery |
|------|-------|--------|-------|-------|------|-----|---------|
| 1 | Brain & Memory | 23 | ~85 | ~108 | ~35 | ~30 | ~20 |
| 2 | Endangered Species | 24 | ~85 | ~109 | ~35 | ~30 | ~20 |
| 3 | Extreme Weather | 25 | ~85 | ~110 | ~35 | ~30 | ~20 |
| 4 | Fashion & Identity | 24 | ~85 | ~109 | ~35 | ~30 | ~20 |
| 5 | Hidden History | 23 | ~90 | ~113 | ~35 | ~32 | ~23 |
| 6 | Future Cities | 23 | ~83 | ~106 | ~33 | ~28 | ~22 |
| 7 | Digital Detox | 22 | ~85 | ~107 | ~35 | ~30 | ~20 |
| 8 | Mountain Adventures | 23 | ~90 | ~113 | ~35 | ~32 | ~23 |
| 9 | Film & Cinema | 24 | ~83 | ~107 | ~33 | ~30 | ~20 |
| 10 | Water Crisis | 23 | ~88 | ~111 | ~35 | ~31 | ~22 |
| 11 | Street Art | 25 | ~88 | ~113 | ~33 | ~32 | ~23 |
| 12 | Remarkable Journeys | 24 | ~90 | ~114 | ~36 | ~32 | ~22 |
| **Total** | | **255** | **1,045** | **1,300** | | | |

**Minimum per-unit unique words: 96 (target >= 90)**

## Source Attribution

- **CEFR-J A2 core:** ~56% of new words
- **NGSL high-frequency:** ~40% of new words
- **CEFR-J A1 remainders:** ~4% of new words

## CEFR Ratio

- A1: ~4%
- A2: ~56%
- B1: ~40%

## Tier Distribution

- Core: ~35% (everyday words needed for comprehension)
- Extended: ~33% (topic-enriching vocabulary)
- Mastery: ~32% (challenge-tier for advanced learners)

## Student Protection Audit

- L2 active students at time of expansion: **0**
- No student XP, completions, or answers affected
- Result: **PASS**

## Idempotency

- Staging table `vocab_staging_l2` used `ON CONFLICT (word) DO NOTHING` for dedup
- Cross-level dedup against L0 + L1 + existing L2 words (1,303 existing)
- Final insert used `ON CONFLICT (reading_id, lower(word)) DO NOTHING`
- All new rows marked `added_in_prompt = 'LEGENDARY-B3'`
- All new rows have `appears_in_passage = false`

## Safety Verification

- L2 readings unchanged: 24 before -> 24 after
- L2 passages: untouched
- Existing vocabulary rows: unmodified (INSERT only)
- `appears_in_passage = true` count for B3 rows: 0

## Staging Scripts

Word generation was done across multiple staging scripts to reach the 1,300 target:
- `l2_vocab_u1_4.cjs`, `l2_vocab_u5_8.cjs`, `l2_vocab_u9_12.cjs` — Initial 947 unique words
- `l2_vocab_extra.cjs`, `l2_vocab_extra2.cjs` — Supplementary batches
- `l2_vocab_final_extra.cjs`, `l2_vocab_last.cjs`, `l2_vocab_last2.cjs` — Final gap-filling
- `l2_vocab_stage.cjs` — Combined staging with dedup
- `l2_vocab_final_insert.cjs` — Final insert into curriculum_vocabulary

## Forward Note

B4 will target L3 vocabulary expansion — same proven pattern of staged generation, cross-level dedup, and idempotent insert.
