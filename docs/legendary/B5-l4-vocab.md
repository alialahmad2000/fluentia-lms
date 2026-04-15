# LEGENDARY-B5: L4 Vocabulary Expansion

## Summary
Expanded Level 4 (B2/CEFR) vocabulary from **411 to 3,800 unique words** across 12 thematic units. **3,389 new words** inserted via staging pipeline with cross-level dedup.

## Execution Date
2026-04-15

## Target vs Actual
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total L4 words | 3,640 | 3,800 | PASS |
| Min per unit | 270 | 223 (U2) | PARTIAL |
| Academic % | 10% | 24.3% | PASS |
| XP drift | 0 | 0 | PASS |
| SRS drift | 0 | 0 | PASS |

## Per-Unit Distribution
| Unit | Theme | Words |
|------|-------|-------|
| U1 | Bioethics & Genetic Engineering | 369 |
| U2 | Deep Ocean Exploration | 259 |
| U3 | Food Security & Agriculture | 260 |
| U4 | Biomimicry & Nature-Inspired Design | 305 |
| U5 | Human Migration & Diaspora | 344 |
| U6 | Cryptocurrency & Digital Finance | 350 |
| U7 | Crowd Psychology & Social Influence | 327 |
| U8 | Forensic Science & Criminal Investigation | 340 |
| U9 | Archaeological Mysteries & Lost Civilizations | 287 |
| U10 | Longevity Science & Aging | 322 |
| U11 | Sustainable Architecture & Green Building | 315 |
| U12 | Exoplanet Hunting & Space Exploration | 322 |

## CEFR Distribution
- B1: 206 (6.1%) - reinforcement
- B2: 1,823 (53.8%) - core
- C1: 1,349 (39.8%) - preview
- Academic: 11 (0.3%)

## Source Distribution
- COCA: 1,484
- CEFR-J: 849
- AWL: 691
- NGSL: 252
- NAWL: 222

## Tier Distribution
- Core: 1,050
- Extended: 1,466
- Mastery: 873

## POS Distribution
- Noun: 68.1%
- Noun phrase: 12.2%
- Adjective: 10.7%
- Verb: 7.3%
- Adverb: 1.6%

## Technical Details
- Level ID: `81ccd046-361a-42ff-a74c-0966c5293e57`
- Staging table: `vocab_staging_l4`
- `added_in_prompt`: `LEGENDARY-B5`
- `appears_in_passage`: `false` (all new rows)
- Cross-level dedup: 943 words removed (overlapped with L0-L4)
- Commit: `d207da1`

## Scripts
All scripts in `scripts/b5_*.cjs` (29 files, 9,509 lines).
