# Listening QA — Final Report (2026-05-19)

## Phase A — Truncation verification (browser-style stream test)

**Method:** for each of the 72 listening audio URLs, performed a HEAD request (200 / Content-Type / Accept-Ranges / Content-Length), two Range-byte requests (first 64KB and last 64KB) to confirm 206 Partial Content, a full GET, then compared `ffprobe` container duration vs `ffmpeg`-decoded duration. A row is `TRUNCATED` if `decoded / container < 0.95`, `NO_RANGE` if Range requests don't return 206, `WRONG_MIME` if Content-Type isn't `audio/mpeg`, `FETCH_FAIL` otherwise.

| Verdict | Count |
|---------|-------|
| OK | 72 |
| TRUNCATED | 0 |
| NO_RANGE | 0 |
| WRONG_MIME | 0 |
| FETCH_FAIL | 0 |

**Verdict: ALL-CLEAR.** Every listening audio is fully streamable end-to-end with Range support, correct MIME type, and decoded duration matching container duration (truncation ratios all ≥ 0.9999).

No regenerations needed. The earlier overhaul (`8159640` — root-cause concat truncation fix) plus subsequent listening fixes have held.

## Phase B — Voice diversity

**Method:** for every multi-speaker row (`audio_type` ∈ {`dialogue`, `interview`, `conversation`}), inspect `speaker_segments` JSON, extract `voice_id` per segment, group by speaker name. Flag if `distinct_voices < distinct_speakers` (SINGLE_VOICE_COLLISION) or if any single speaker uses 2+ different voices across segments (INCONSISTENT_VOICE_PER_SPEAKER).

| Verdict | Count |
|---------|-------|
| OK | 44 |
| SINGLE_VOICE_COLLISION | 0 |
| INCONSISTENT_VOICE_PER_SPEAKER | 0 |
| voice_id not stored | 0 |

**Verdict: ALL-CLEAR.** Every multi-speaker row has a distinct ElevenLabs `voice_id` per speaker, consistently applied across every segment of that speaker. No acoustic-fingerprint fallback required because `voice_id` is stored.

## Phase C — Transcript naturalism (FLAGGING ONLY, no auto-rewrites)

**Method:** scored every transcript on 10 heuristic signals (excessive vocatives, acknowledgment chains, robotic turn-taking, AI disclaimer leaks, over-explanation, hedge stacking, title-name overuse, symmetric exchanges, absent contractions, reciprocal gratitude). Verdict: OK (0-3), REVIEW (4-7), REGENERATE (8+).

| Verdict | Count |
|---------|-------|
| OK | 68 |
| REVIEW | 4 |
| REGENERATE | 0 |

**Verdict: HEALTHY with minor review opportunities.** No transcript scored high enough to warrant regeneration. 4 rows scored in the REVIEW range — see `docs/audits/listening-qa/transcript-naturalism.md` for details.

### Top REVIEW items

The 4 REVIEW-flagged rows are mid-tier scores (4–7) on signals like:
- `acknowledgment_chains` (recurring "I agree with you", "great point")
- `title_name_overuse` ("Dr. X" used 4+ times)
- `absent_contractions` (formal "I am" / "do not" dominating informal "I'm" / "don't")

None of these break immersion outright. Recommend a human content pass on those specific rows when convenient, not urgent.

## Action required from Ali

**None blocking.** The listening curriculum is in healthy state per all three audits.

Optional next steps:
1. Open `docs/audits/listening-qa/transcript-naturalism.md` and skim the 4 REVIEW rows. Decide per-row whether to hand-tighten or leave as-is.
2. If you ever expand the listening curriculum, re-run this audit on the new rows.

## ElevenLabs char budget

- **Pre-run:** 643,594 / 1,810,000 (1,166,406 remaining)
- **Consumed this run:** 0 (no regenerations)
- **Post-run:** 643,594 / 1,810,000 (1,166,406 remaining)
