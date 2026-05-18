# Audio Issues — Master Audit Report
Generated: 2026-05-18 (re-run post-regen, Mac)
Auditor: 01-AUDIT-AUDIO-CONTENT prompt (read-only, no content changes)
Script: `scripts/audio-generator/audit-audio-content.mjs`

---

## Executive Summary

The May 14 audio regeneration was **highly successful** — all listening truncation (44 items),
single-voice (21 items), and most label-in-text issues are resolved.
**70/72 listening items are now fully healthy.**

> ✅ **POST-AUDIT UPDATE (commit d718fb4, 2026-05-18):** All 13 truncated reading passages
> were subsequently regenerated and 3 female-dialogue single-voice issues (L2 U5/U6/U11) fixed.
> The per-audit findings below reflect state at time of measurement (caf0608).

Remaining work after d718fb4: **53 reading passages with incomplete word timestamps** (49–85%
coverage) + 3 minor listening issues.

---

## Summary

### Listening (72 items audited — `curriculum_listening`)

| Issue | Count | % | vs. May 14 |
|---|---|---|---|
| Truncated (actual < 75% expected duration) | **0** | **0%** | ~~44~~ → ✅ Fixed |
| Single voice when should be multi | **0** | **0%** | ~~21~~ → ✅ Fixed |
| Speaker labels in segment text (LABEL_IN_TEXT) | **1** | **1%** | ~~24~~ → 1 remains |
| Metadata mismatch (lecture with multi-segments) | **1** | **1%** | — |
| **Healthy (zero flags)** | **70** | **97%** | ~~27~~ → 70 ✅ |
| Has `word_timestamps` | **45/72** | **63%** | ~~0~~ → 45 ✅ |

**Timestamps breakdown:**
- L0+L1 monologues (24 items): no timestamps → **expected** (generated before timestamp feature was built)
- L4 U9, L4 U12, L5 U9 lectures (3 items): no timestamps → **gap to fix in Prompt 02**
- L2–L5 dialogues/interviews (45 items): timestamps present ✅ with `{word, start_ms, end_ms, speaker}` per entry

**Real issues remaining (2 items):**
1. **L3 U3 interview** — LABEL_IN_TEXT: a segment's `.text` contains a "Name: " prefix (preprocessing missed it)
2. **L4 U7 lecture** — METADATA_MISMATCH: `audio_type=lecture` but `speaker_segments.length > 1`

---

### Reading (144 items audited — `reading_passage_audio`)

| Issue | Count | % | vs. May 14 |
|---|---|---|---|
| Truncated (actual < 75% expected duration) | **13** | **9%** | Same 13 items — not fixed by regen |
| No timestamps | **0** | **0%** | — |
| Timestamps incomplete (word coverage < 85%) | **53** | **37%** | Same 53 items |
| Paragraph audio mismatch | **0** | **0%** | — |
| **Healthy (zero flags)** | **91** | **63%** | ✅ |
| Has `word_timestamps` | **144/144** | **100%** | ✅ |

> ⚠️ The 53 "TS incomplete" items have real gaps: word timestamp coverage ranges **49–85%**
> (median 64%). This is NOT a markdown-markup false positive — passages genuinely missing
> 15–51% of word timestamps. Requires re-generation with proper timestamp output.

> ℹ️ `word_timestamps` format is a numeric-keyed object:
> `{"0": {word, start_ms, end_ms}, "1": {...}, ...}` — NOT `{paragraphs: [{words}]}`.

---

### UI Components (audio-related files)

| File | DB source | Hide-text | Per-word click | Notes |
|---|---|---|---|---|
| `src/pages/student/curriculum/tabs/ReadingTab.jsx` | reading ✓ | NO ✓ | YES ✓ | SmartAudioPlayer, `hideTranscript:false` |
| `src/pages/student/curriculum/tabs/ListeningTab.jsx` | listening ✓ | YES ✓ | YES ✓ | via ListeningSection → InteractivePassage |
| `src/components/players/listening/ListeningSection.jsx` | listening | YES ✓ | YES ✓ | `wordTimestampsJson={listening.word_timestamps}` |
| `src/components/players/ListeningAudioPlayer.jsx` | listening | YES ✓ | YES ✓ | utility component |
| `src/components/players/ReadingPassagePlayer.jsx` | reading | NO ✓ | YES ✓ | utility component |

**No reading-vs-listening UX bleed detected. ✅**
Reading: `hideTranscript: false` (passage always visible, correct) + per-word click ✓.
Listening: transcript hidden by default (correct for comprehension practice) + per-word seek wired via
`InteractivePassage wordTimestampsJson={listening.word_timestamps}` — works for 45/72 items with timestamps.
See `ui-component-audit.md` for full deep analysis.

---

### Word-level Pronunciation Feasibility

| Content type | Items | Has timestamps | Per-word audio feasible |
|---|---|---|---|
| Reading passages (fully complete) | 91 | 91 (100%) | ✅ Yes |
| Reading passages (partial 49–85%) | 53 | 53 (partial) | ⚠️ Partial — needs regen |
| Listening dialogues/interviews L2–L5 | 45 | 45 (100%) | ✅ Yes |
| Listening L0+L1 monologues | 24 | 0 (0%) | ❌ No (low priority — simple audio) |
| Listening L4/L5 lectures (gap) | 3 | 0 (0%) | ❌ No — fix in Prompt 02 |

---

## Per-item Details

### Listening — items with real flags

| Level | Unit | Type | Flag | Duration ratio | Notes |
|---|---|---|---|---|---|
| 3 | 3 | interview | LABEL_IN_TEXT | 0.946 | one segment.text has "Name: " prefix |
| 4 | 7 | lecture | METADATA_MISMATCH | 1.254 | audio_type=lecture but speaker_segments.length > 1 |

### Listening — 3 lectures missing timestamps (unexpected gap)

| Level | Unit | Type |
|---|---|---|
| 4 | 9 | lecture |
| 4 | 12 | lecture |
| 5 | 9 | lecture |

### Reading — 13 TRUNCATED items (need full regeneration)

| Level | Unit | Label | Title | Duration ratio |
|---|---|---|---|---|
| 2 | 5 | B | Voices from the Sand | 0.708 |
| 4 | 1 | B | Designer Genes: The CRISPR Revolution | 0.711 |
| 4 | 4 | A | Nature's Blueprint for Innovation | 0.681 |
| 4 | 5 | B | The Digital Nomad Revolution | 0.740 |
| 4 | 8 | A | Silent Witnesses Speak | 0.687 |
| 4 | 11 | B | Living Buildings that Breathe | 0.696 |
| 5 | 1 | B | The Silent Collapse of Maya Cities | 0.705 |
| 5 | 2 | B | Breaking Barriers in STEM | 0.711 |
| 5 | 5 | B | The Nuclear Renaissance Paradox | 0.627 |
| 5 | 7 | B | Healing the Mind's Architecture | 0.671 |
| 5 | 10 | A | Quantum Frontiers Unveiled | 0.663 |
| 5 | 12 | A | The Water-Energy Nexus Challenge | 0.694 |
| 5 | 12 | B | The Water-Energy Nexus Revolution | 0.688 |

> Most are L4–L5 (advanced, longer passages). Worst ratio: 0.627 (L5 U5B cuts off at 63%).
> All 13 also have TIMESTAMPS_INCOMPLETE — regen must include full timestamp output.

### Reading — 53 TIMESTAMPS_INCOMPLETE items

Word coverage 49–85% (median 64%). Timestamps exist but only partially. Need regeneration.
See `reading-audit.json` for full list with UUIDs and per-item coverage.

---

### Total ElevenLabs Budget Estimate for Prompt 02

| Category | Items | Est. Characters | Status |
|---|---|---|---|
| Reading TRUNCATED — full regen | 13 | ~81,000 | ✅ Fixed by d718fb4 |
| Reading TS_INCOMPLETE — regen for timestamps | 40 | ~250,000 | ⏳ Still needed |
| Listening LABEL_IN_TEXT + METADATA_MISMATCH | 2 | ~8,400 | ⏳ Still needed |
| Listening lectures missing timestamps (L4/L5) | 3 | ~9,000 | ⏳ Still needed |
| **Total remaining** | **45** | **~267,400** | |

**ElevenLabs Quota (checked 2026-05-18):**
- Plan: `growing_business`
- Used: 643,594 / 1,810,000 (35.6%)
- **Remaining: 1,166,406 characters** → **64.4% headroom**
- Resets: 2026-06-11
- Required for remaining regen: ~267,400 → **comfortably within budget** ✅

> Run `curl -s https://api.elevenlabs.io/v1/user/subscription -H "xi-api-key: $ELEVENLABS_API_KEY"` to re-check before starting Prompt 02.

---

## Artifact Index

| File | Description |
|---|---|
| `docs/audits/audio-issues/listening-audit.json` | Per-item listening audit (72 rows) |
| `docs/audits/audio-issues/reading-audit.json` | Per-item reading audit (144 rows, ts coverage) |
| `docs/audits/audio-issues/ui-component-audit.md` | UI component analysis |
| `docs/audits/audio-issues/MASTER-REPORT.md` | This file — input for Prompts 02 and 03 |

---

## Schema Notes (for Prompt 02)

| Spec name | Actual name |
|---|---|
| `curriculum_reading_passages` | `curriculum_readings` |
| `content` | `passage_content` (jsonb: `{paragraphs: string[]}`) |
| `audio_duration_ms` (listening) | `audio_duration_seconds` |
| `audio_duration_ms` (reading) | `full_duration_ms` in `reading_passage_audio` |
| `audio_url` (reading) | `full_audio_url` in `reading_passage_audio` |
| `word_timestamps` format | `{"0": {word, start_ms, end_ms, speaker}, "1":...}` |

---

*No DB rows were modified. No audio was generated. No storage objects were touched.*
