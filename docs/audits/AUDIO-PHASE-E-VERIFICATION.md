# AUDIO-PHASE-E-VERIFICATION

Generated: 2026-05-11T23:31:33.176Z

## Coverage

| Type | Done | Total | % |
|------|------|-------|---|
| Vocabulary | 13930 | 13930 | 100% |
| Reading passages | 144 | 144 | 100% |
| Listening transcripts | 72 | 72 | 100% |
| Listening audio segments | 531 | — | — |
| Irregular verbs | 85 | 85 | 100% |

## Reading Coverage by Level

| Level | Done | Expected |
|-------|------|---------|
| L0 | 24 | 24 |
| L1 | 24 | 24 |
| L2 | 24 | 24 |
| L3 | 24 | 24 |
| L4 | 24 | 24 |
| L5 | 24 | 24 |

## Storage Spot-checks

5/5 HEAD requests returned HTTP 200 + Content-Type: audio/mpeg
- [reading] ✓ random passage
- [listening] ✓ random segment
- [vocab] ✓ "remittance" (L2)
- [verb] ✓ irregular verb base form
- [vocab-L5] ✓ "sublimate" (L5)

## Word Timestamp Integrity

3 random reading_passage_audio rows — all PASS:
- passage 1a265b48: 384 words, start_ms < end_ms ✓
- passage 17a10da6: 424 words, start_ms < end_ms ✓
- passage 8e1083bc: 414 words, start_ms < end_ms ✓

## Cost

- ai_usage rows logged: 13108
- Total estimated cost: 1172.67 SAR (~$312.71 USD)
- ElevenLabs balance before: 1,810,000 chars
- ElevenLabs balance after:  ~1,335,000 chars (remaining)
- Total chars consumed:      ~475,000 chars

## Failures at Completion

Net failures: **0** (all retried successfully)
- 1 reading passage (959d951d) — network timeout on first attempt, retried ✓
- 1 listening segment (1f6723b1, seg 8) — network error on first attempt, retried ✓