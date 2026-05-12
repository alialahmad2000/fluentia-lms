# LISTENING-WIRING-A-DISCOVERY

Generated: 2026-05-12 (autonomous)

## ListeningTab Location

**Primary file:** `src/pages/student/curriculum/tabs/ListeningTab.jsx` (888 lines)

Structure:
- `ListeningTab({ unitId })` — queries `curriculum_listening`, renders N `ListeningSection` per unit
- `ListeningSection({ listening, studentId, unitId })` — title + AudioPlayer + transcript toggle + exercises
- `AudioPlayer({ url, duration })` — **LEGACY: plays single URL only, never queries listening_audio table**
- `ListeningExercises(...)` — ~420 lines of MCQ rendering + completion tracking

## Multi-Speaker Bug Origin

`ListeningSection` line 88: `<AudioPlayer url={listening.audio_url} />`

`curriculum_listening.audio_url` = the **first segment's URL** (set during audio generation for frontend compat). The legacy AudioPlayer has no knowledge of `listening_audio` table and never iterates segments.

Result: All multi-speaker content (dialogues, interviews) plays only segment 0 (~10-25s) then stops.

## Data Audit Results

| Level | Transcripts | With Audio | Total Segs | Avg Segs |
|-------|-------------|------------|-----------|---------|
| L0 | 12 | 12 | 12 | 1.0 |
| L1 | 12 | 12 | 12 | 1.0 |
| L2 | 12 | 12 | 2121 | 13.3 |
| L3 | 12 | 12 | 600 | 7.1 |
| L4 | 12 | 12 | 1778 | 14.3 |
| L5 | 12 | 12 | 1912 | 13.7 |

**L0/L1 avg 1.0** — correct: these are monologues (single speaker, single segment).
**L2-L5 avg 7-14** — rich multi-speaker content, all present.

**28 transcripts with ≤2 segments**: 24 of these are L0/L1 monologues (expected). ~4 may be thin but not blocking.

## Storage

10/10 sampled audio URLs return HTTP 200 + `audio/mpeg`. ✅

## Word Timestamps

Shape: `{word, start_ms, end_ms}` in milliseconds — identical to reading. No normalization needed.

## Speaker Distribution (top voices)

Host, Layla, Dr. Sarah Mitchell, Interviewer, Noor, Fatima — 5+ distinct speakers with deterministic color mapping.

## Completion Tracking

`student_curriculum_progress` table via `ListeningExercises` component. INSERT-per-attempt model. **Preserved unchanged.**

## useAudioEngine Status

Already implements seamless transitions: `onEnded → loadSegment(next) → audio.play()`. Bug is purely UI-side. ✅

## Decision: ✅ PROCEED

All health checks pass. Data is intact. Proceeding to Phase B+C.
