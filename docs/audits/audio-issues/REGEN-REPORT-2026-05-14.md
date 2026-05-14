# Listening Audio Regeneration — 2026-05-14

## Inputs
- Audit: `docs/audits/audio-issues/listening-audit.json` (72 rows, from Prompt 01)
- Flagged for regen: **45 items** (TRUNCATED | SINGLE_VOICE_WRONG | LABEL_IN_TEXT)

## Results
- **Successfully regenerated: 45 / 45**
- **Post-regen failures: 0**
- Characters consumed: ~99,896
- ElevenLabs remaining: 1,234,172 / 1,810,000 (68%)

## Parser test results
- Test cases passed: **6 / 6**

## Issues encountered and fixed mid-run

### 1. DB schema mismatch — `audio_path` column
`curriculum_listening` has no `audio_path` column (the column exists only on `listening_audio`).
Fixed in `03-generate-listening.mjs` before the full run completed.

### 2. `assignVoices` — same voice for two female speakers
When both speakers in a dialogue are female (e.g. Layla / Emma, Layla / Fatima),
the second speaker was assigned the same voice as the first.
Fixed by scanning for the next unused voice in the pool instead of rotating by index.
Three items (L2/U5, U6, U11) were re-preprocessed and re-generated.

### 3. `assertNoLabelResidue` false positives
Two items (L3/U3, L5/U2) contained prose like `"Remember: drop, cover..."` and
`"I'd leave them with this: extreme achievement..."` which tripped the assertion.
Fixed with a prose-word allowlist in `assertNoLabelResidue`.

## Phase E — Verification (all 45 items)

| Check | Result |
|---|---|
| Duration ≥ 80% expected | ✅ 45/45 |
| ≥ 2 unique voices (dialogues/interviews) | ✅ 45/45 |
| No label residue in segments | ✅ 45/45 |
| Word timestamps present | ✅ 45/45 |

## Spot-check samples

| Item | Was | Now |
|---|---|---|
| L2/U1 f7bc89f9 | TRUNCATED (old seg-only) | 123s, 2 voices, 336 wts ✓ |
| L3/U11 ab69e89c | TRUNCATED + SINGLE_VOICE_WRONG + LABEL_IN_TEXT | 196s, **3 voices**, 498 wts ✓ |
| L5/U5 6b6e7a26 | TRUNCATED + SINGLE_VOICE_WRONG + LABEL_IN_TEXT | 340s, **3 voices**, 667 wts ✓ |
| L4/U8 a9e49ba8 | TRUNCATED + SINGLE_VOICE_WRONG + LABEL_IN_TEXT | 278s, 2 voices, 605 wts ✓ |
| L3/U3 8dbff5e6 | LABEL_IN_TEXT (false-positive assertion fixed) | 178s, 2 voices, 457 wts ✓ |

## Files changed

| File | Change |
|---|---|
| `scripts/audio-v2/lib/speaker-map.cjs` | Hardened parser, fixed voice assignment, smarter assertion |
| `scripts/audio-v2/test-parser.cjs` | 6 test cases |
| `scripts/audio-v2/01-preprocess-listening.cjs` | Re-preprocesses flagged rows via audit JSON |
| `scripts/audio-v2/03-generate-listening.mjs` | Generates, concatenates (ffmpeg), uploads combined audio |
| `scripts/audio-v2/05-verify-regen.mjs` | Post-regen E1–E4 verification |
| `docs/audits/audio-issues/verify-results.json` | 45/45 pass |
| `docs/audits/audio-issues/generate-results.json` | Generation log |

## Storage
- All audio uploaded to `listening/L{level}/{id}/combined.mp3` with `upsert: true`
- `curriculum_listening.audio_url` updated for all 45 rows
- `curriculum_listening.word_timestamps` populated for all 45 rows (was NULL for all 72)
- `listening_audio` per-segment rows refreshed

*No student `submissions` or `unit_progress` rows were modified.*
