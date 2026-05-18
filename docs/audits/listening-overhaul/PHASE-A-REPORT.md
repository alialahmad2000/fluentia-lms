# Phase A — Listening Overhaul Discovery
Generated: 2026-05-18

---

## Environment

| Item | Value |
|---|---|
| ffmpeg | 8.1.1 |
| ffprobe | 8.1.1 |
| node | v26.0.0 |
| NODE_OPTIONS | `--dns-result-order=ipv4first` (exported at session start) |

---

## File Inventory (listening-related)

| File | Lines | Last commit |
|---|---|---|
| `src/components/players/listening/ListeningPlayer.jsx` | 358 | `2a8afa6` fix(listening): root-cause concat truncation + premium player + section rebuild |
| `src/components/players/listening/ListeningSection.jsx` | 149 | `2a8afa6` |
| `src/pages/student/curriculum/tabs/ListeningTab.jsx` | 997 | `2a8afa6` |
| `scripts/audio-v2/lib/concat.cjs` | — | `2a8afa6` |
| `scripts/audio-v2/test-concat.cjs` | — | `2a8afa6` |
| `scripts/audio-v2/audit-listening-decode.cjs` | — | `2a8afa6` |
| `scripts/audio-v2/03-generate-listening.mjs` | — | `d718fb4` |

---

## Concat Bug Status

- **File:** `scripts/audio-v2/lib/concat.cjs`
- **Contains `-c copy` as a real command:** NO — the string appears ONLY in comments
- **Fix applied (commit `2a8afa6`):** Re-encodes with `libmp3lame` at every stage; decode-verifies output

**Decode-test results (sampled 2026-05-18):**

| Audio type | Header dur | Decode exit | Verdict |
|---|---|---|---|
| dialogue (combined.mp3) | 121s | 0 | PASS |
| interview (combined.mp3) | 190s | 0 | PASS |
| monologue (s0_narrator.mp3) | 75s | 0 | PASS |

All 72 rows audited by `03-generate-listening.mjs` pass decode verification. 0 broken files.

---

## Duplicate Header Diagnosis

- **DB duplicates:** 0 (confirmed by `GROUP BY … HAVING COUNT(*) > 1` query)
- **Null titles:** 0 (72/72 rows have `title_ar` and `title_en` populated)
- **Rendering duplicate:** YES — root cause identified in `ListeningTab.jsx`
  - Local `ListeningSection` component (line 78) rendered English title + Arabic title + type badge (lines 195–218)
  - Then called `<ListeningSectionUI>` (the imported premium component) which rendered the SAME title in its own premium header
  - Result: two visible headers — one in legacy English style, one in premium Tajawal Arabic style
- **Verdict:** RENDERING_ONLY
- **Fix applied:** Removed the duplicate title block (lines 195–218) from the local component, retaining the IELTS exam-mode toggle as a standalone element

---

## Current Player + Section (post-fix state)

| Attribute | Value |
|---|---|
| Player file | `src/components/players/listening/ListeningPlayer.jsx` (358 lines) |
| Section file | `src/components/players/listening/ListeningSection.jsx` (149 lines) |
| Player positioning | `sticky bottom-4` (inside content column — auto-inherits sidebar width) |
| Reused on reading | NO (separate component) |
| speaker_segments consumed | YES — tick marks + live "يتحدث الآن:" label |
| Question rendering | `ListeningExercises` inside `ListeningTab.jsx` line 237 |
| `InteractivePassage` wired | YES — `wordTimestampsJson={listening.word_timestamps}` |

---

## Estimated Regeneration Scope

- Listening rows total: 72
- Broken (decode failures): 0
- Rows regenerated (since initial fix): 0 additional needed
- ElevenLabs quota remaining: 1,166,406 chars (checked 2026-05-18)
