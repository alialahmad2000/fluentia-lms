# Audio Issues — Master Audit Report
Generated: 2026-05-14T00:00:00Z
Auditor: 01-AUDIT-AUDIO-CONTENT prompt (read-only, no content changes)

---

## Summary

### Listening (72 items audited — `curriculum_listening`)

| Issue | Count | % |
|---|---|---|
| Truncated (actual < 75% expected duration) | 44 | 61% |
| Single voice when should be multi | 21 | 29% |
| Speaker labels in TTS text | 24 | 33% |
| Metadata mismatch (monologue has multi-speaker) | 0 | 0% |
| ffprobe failed | 0 | 0% |
| **Healthy (zero flags)** | **27** | **38%** |
| Has `word_timestamps` | **0** | **0%** |

> ⚠️ `curriculum_listening.word_timestamps` is NULL for every single item (72/72).
> Per-word audio seek is therefore completely non-functional for listening tab in production,
> despite `ListeningAudioPlayer` being wired to pass `wordTimestampsJson` to `InteractivePassage`.

**Levels affected:**
- L1 (monologue units 1–24): All 24 healthy — no truncation, no voice issues.
- L2 (dialogue units 1–12): All 12 truncated. No speaker/label issues.
- L3 (interview/dialogue units 1–12): All 12 have TRUNCATED + SINGLE_VOICE_WRONG + LABEL_IN_TEXT.
- L4 (interview/lecture units 1–12): Mix of TRUNCATED, SINGLE_VOICE_WRONG, LABEL_IN_TEXT.
- L5 (interview units 1–12): Mostly TRUNCATED; many have SINGLE_VOICE_WRONG + LABEL_IN_TEXT.

---

### Reading (144 items audited — `curriculum_readings` + `reading_passage_audio`)

| Issue | Count | % |
|---|---|---|
| No audio | 0 | 0% |
| Truncated (actual < 75% expected duration) | 13 | 9% |
| Timestamps incomplete (word coverage mismatch > 15%) | 53 | 37% |
| Paragraph audio mismatch | 0 | 0% |
| ffprobe failed | 0 | 0% |
| **Healthy (zero flags)** | **91** | **63%** |
| Has `word_timestamps` | **144** | **100%** |

> ℹ️ **Timestamps incomplete** note: The 53 "incomplete" items have word_timestamps present but the
> word count in timestamps differs from `passage_word_count` by >15%. This is likely caused by
> markdown markup (`*word*`) being counted differently in DB vs. audio generation. These may not
> represent real broken timestamps — further investigation in Prompt 02 recommended.

> ✅ `reading_passage_audio.word_timestamps` is present for all 144 items.
> Per-word audio seek is fully feasible for the Reading tab.

---

### UI Components

| Check | Reading Tab | Listening Tab |
|---|---|---|
| Correct DB table | ✓ `curriculum_readings` | ✓ `curriculum_listening` |
| Hide-text toggle | ✓ Absent (correct) | ✓ Present (correct) |
| Per-word click | ✓ Functional | ⚠️ Wired but non-functional (no timestamps in DB) |
| Player component | `ReadingPassagePlayer` | `ListeningAudioPlayer` |

**No reading-vs-listening UX bleed detected.**  
The `ReadingPassagePlayer` comment explicitly documents: *"Reading has NO hide-text toggle — the passage is always visible."*  
The only per-word issue is the absent timestamps on the listening side.

---

### Word-level Pronunciation Feasibility

| Content type | Items | Has word_timestamps | Per-word audio feasible |
|---|---|---|---|
| Reading passages | 144 | 144 (100%) | ✅ Yes |
| Listening items | 72 | 0 (0%) | ❌ No — requires regen or Web Speech API |

---

## Per-item Details

### Items needing audio REGENERATION (Prompt 02 input)

#### Listening — 45 items flagged

| Level | Unit | Type | Flags |
|---|---|---|---|
| 2 | 1–12 | dialogue | TRUNCATED |
| 3 | 1–3, 5–10, 12 | interview | TRUNCATED, SINGLE_VOICE_WRONG, LABEL_IN_TEXT |
| 3 | 4, 11 | dialogue | TRUNCATED, (LABEL_IN_TEXT for U11) |
| 4 | 1, 4–6, 11 | interview | TRUNCATED |
| 4 | 2, 3, 8, 10 | interview | TRUNCATED, SINGLE_VOICE_WRONG, LABEL_IN_TEXT |
| 4 | 7 | lecture | LABEL_IN_TEXT only |
| 5 | 1, 3, 11, 12 | interview | TRUNCATED |
| 5 | 2, 4, 6, 7, 8, 10 | interview | TRUNCATED, SINGLE_VOICE_WRONG, LABEL_IN_TEXT |
| 5 | 5 | interview | TRUNCATED, LABEL_IN_TEXT |

**Full list in:** `docs/audits/audio-issues/listening-audit.json` → items where `flags.length > 0`

#### Reading — 13 items flagged

| Level | Unit | Title | Flags |
|---|---|---|---|
| 2 | 5 | Voices from the Sand | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 4 | 1 | Designer Genes: The CRISPR Revolution | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 4 | 4 | Nature's Blueprint for Innovation | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 4 | 5 | The Digital Nomad Revolution | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 4 | 8 | Silent Witnesses Speak | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 4 | 11 | Living Buildings that Breathe | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 5 | 1 | The Silent Collapse of Maya Cities | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 5 | 2 | Breaking Barriers in STEM | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 5 | 5 | The Nuclear Renaissance Paradox | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 5 | 7 | Healing the Mind's Architecture | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 5 | 10 | Quantum Frontiers Unveiled | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 5 | 12 | The Water-Energy Nexus Challenge | TRUNCATED, TIMESTAMPS_INCOMPLETE |
| 5 | 12 | The Water-Energy Nexus Revolution | TRUNCATED, TIMESTAMPS_INCOMPLETE |

**Full list in:** `docs/audits/audio-issues/reading-audit.json` → items where `flags.length > 0`

---

### Items needing UI rebuild (Prompt 03 input)

No component rebuild required for reading-vs-listening confusion — none found.

**However:** The `ListeningAudioPlayer` needs the `word_timestamps` fix to be actually useful:
- `src/components/players/ListeningAudioPlayer.jsx` — currently passes null timestamps always
- `src/pages/student/curriculum/tabs/ListeningTab.jsx` (line ~233) — passes only `segments[0]?.word_timestamps`
  which is null because timestamps were never generated for listening items.

These will become relevant after Prompt 02 regenerates listening audio with timestamps.

---

### Total ElevenLabs Budget Estimate for Regeneration

| Category | Items | Estimated Characters |
|---|---|---|
| Listening (TRUNCATED / SINGLE_VOICE / LABEL fixes) | 45 | ~140,880 |
| Reading (TRUNCATED fixes) | 13 | ~80,706 |
| **Total** | **58** | **~221,586** |

> Character estimate: word_count × 6 (average 5 chars/word + 1 space).
> ElevenLabs free tier = 10,000 chars/month. Pro = 500,000/month.
> At ~222K chars, a Pro subscription has ~56% headroom remaining for this batch.
> **Check current remaining quota at elevenlabs.io before running Prompt 02.**

---

## Artifact Index

| File | Description |
|---|---|
| `docs/audits/audio-issues/listening-audit.json` | Per-item listening audit (72 rows, flags, durations) |
| `docs/audits/audio-issues/reading-audit.json` | Per-item reading audit (144 rows, flags, timestamps) |
| `docs/audits/audio-issues/ui-component-audit.md` | Reading vs. listening component analysis |
| `docs/audits/audio-issues/MASTER-REPORT.md` | This file — drives Prompts 02 and 03 |

---

## Schema Notes (for Prompt 02)

Actual table/column names differ from the audit prompt spec:

| Spec name | Actual name |
|---|---|
| `curriculum_reading_passages` | `curriculum_readings` |
| `content` | `passage_content` (jsonb: `{paragraphs: string[]}`) |
| `audio_duration_ms` | `audio_duration_seconds` (listening) / `full_duration_ms` (reading) |
| `audio_url` (reading) | `full_audio_url` in `reading_passage_audio` |

---

*No DB rows were modified. No audio was generated. No storage objects were touched.*
