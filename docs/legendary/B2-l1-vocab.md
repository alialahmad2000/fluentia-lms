# LEGENDARY-B2: L1 Vocabulary Expansion

**Date:** 2026-04-14
**Commit:** (see git log)
**Prompt:** LEGENDARY-B2-L1-VOCAB-EXPANSION

## Summary

Expanded Level 1 (Basics) vocabulary from 177 to **657 unique CEFR-aligned words** using the Core/Extended/Mastery tier system established in B1.

## Per-Unit Breakdown

| Unit | Theme | Before | Added | Final | Core | Ext | Mastery |
|------|-------|--------|-------|-------|------|-----|---------|
| 1 | Cultural Festivals | 18 | 40 | 58 | 35 | 14 | 10 |
| 2 | Ocean Life | 20 | 40 | 60 | 37 | 14 | 10 |
| 3 | Space Exploration | 20 | 40 | 60 | 35 | 14 | 11 |
| 4 | Music & Art | 19 | 40 | 59 | 36 | 14 | 10 |
| 5 | Famous Places | 18 | 40 | 58 | 34 | 16 | 9 |
| 6 | Inventions | 19 | 40 | 59 | 34 | 16 | 10 |
| 7 | Sports Stars | 16 | 40 | 56 | 35 | 15 | 9 |
| 8 | Ancient Civilizations | 19 | 40 | 59 | 34 | 14 | 12 |
| 9 | Photography | 20 | 40 | 60 | 33 | 14 | 13 |
| 10 | World Cuisines | 20 | 40 | 60 | 36 | 14 | 10 |
| 11 | Social Media | 19 | 40 | 59 | 35 | 16 | 9 |
| 12 | Green Living | 18 | 40 | 58 | 34 | 16 | 10 |
| **Total** | | **177** | **480** | **657** | | | |

## Source Attribution

- **CEFR-J A1 remainders:** ~60% of new words
- **CEFR-J A2 starter tier:** ~30% of new words
- **NGSL high-frequency gaps:** ~10% of new words

## CEFR Ratio

- A1: ~18% (84 words)
- A2: ~82% (396 words)

## Student Protection Audit

- L1 active students at time of expansion: **0**
- No student XP, completions, or answers affected
- Result: **PASS**

## Idempotency

- Staging table used `ON CONFLICT (word) DO NOTHING` for dedup
- Final insert used `ON CONFLICT (reading_id, lower(word)) DO NOTHING`
- All new rows marked `added_in_prompt = 'LEGENDARY-B2'`
- All new rows have `appears_in_passage = false`

## Safety Verification

- L1 readings unchanged: 24 before → 24 after
- L1 passages: untouched (0 in reading_passages for L1)
- Existing vocabulary rows: unmodified (INSERT only)

## Forward Note

B3 (L2) will target ~1,300 words — same pattern, first true A2 level, more ambitious.
