# LEGENDARY-B1: L0 Vocabulary Expansion

## Summary
Expanded Level 0 (Pre-A1) vocabulary from 169 unique words to 455 unique CEFR-A1-aligned words, distributed across 12 existing L0 units using the Core / Extended / Mastery tier system.

## Per-Unit Breakdown

| Unit | Theme | Existing | Added | Total | Core | Extended | Mastery |
|------|-------|----------|-------|-------|------|----------|---------|
| 1 | Daily Life | 16 | 25 | 41 | ~28 | ~9 | ~4 |
| 2 | Food & Cooking | 17 | 20 | 37 | ~24 | ~9 | ~4 |
| 3 | My City | 16 | 25 | 41 | ~28 | ~9 | ~4 |
| 4 | Animals Around Us | 16 | 28 | 44 | ~30 | ~10 | ~4 |
| 5 | Weather & Seasons | 16 | 20 | 36 | ~24 | ~8 | ~4 |
| 6 | Family & Friends | 16 | 23 | 39 | ~26 | ~9 | ~4 |
| 7 | Shopping & Money | 16 | 22 | 38 | ~26 | ~8 | ~4 |
| 8 | Health & Body | 16 | 23 | 39 | ~26 | ~9 | ~4 |
| 9 | Hobbies & Free Time | 16 | 25 | 41 | ~28 | ~9 | ~4 |
| 10 | Travel Basics | 17 | 21 | 38 | ~26 | ~8 | ~4 |
| 11 | Technology Today | 16 | 28 | 44 | ~30 | ~10 | ~4 |
| 12 | Jobs & Careers | 15 | 26 | 41 | ~28 | ~9 | ~4 |

## Word Source Attribution
- Existing (passage-derived): 169 words (marked `appears_in_passage = true`)
- New CEFR-J: ~100 words
- New NGSL: ~100 words
- New GSL: ~86 words
- All new words marked `added_in_prompt = 'LEGENDARY-B1'`

## Tier Definitions

### Core (الأساسية)
- Most essential A1 vocabulary for the unit theme
- Displayed expanded by default in the student UI
- ~15-18 per unit from the new batch + all existing passage words

### Extended (الإضافية)
- Related but less frequent words
- Collapsed by default, one tap to expand
- ~8-12 per unit

### Mastery (المتقدمة)
- Recognition-level vocabulary for spiral review
- Collapsed by default, marked "للمراجعة لاحقاً"
- ~3-4 per unit

## `appears_in_passage` Convention
- `true` = word was extracted from the unit's reading passage (original 169 words)
- `false` = word was added in LEGENDARY-B1 expansion (new 286 words)
- Future migrations MUST preserve this distinction
- Reading passages were NOT modified — only vocabulary entries were added

## Schema Extensions
New columns on `curriculum_vocabulary`:
- `tier` (text): 'core' / 'extended' / 'mastery'
- `cefr_level` (text): 'A1' / 'A2' / etc.
- `source_list` (text): 'CEFR-J' / 'NGSL' / 'GSL'
- `appears_in_passage` (boolean): whether word appears in reading text
- `tier_order` (integer): display order within tier
- `added_in_prompt` (text): migration traceability

Unique index: `idx_vocab_reading_word ON (reading_id, lower(word))`

## Idempotency
Re-running `scripts/insert-l0-vocab.mjs` produces the same final state:
- Deduplicates against existing words (case-insensitive)
- Unique index prevents double-insertion
- No existing rows are modified (INSERT only)

## Forward Compatibility
LEGENDARY-B2 through B6 (L1-L5) follow identical pattern:
- Same schema columns (already added globally)
- Same script structure, different level filter
- Increment `added_in_prompt` to 'LEGENDARY-B2', etc.
- Each level targets its CEFR band (A1→A2→B1→B2→C1)
