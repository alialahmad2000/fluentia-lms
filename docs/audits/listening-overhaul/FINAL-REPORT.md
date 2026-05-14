# Listening Section Overhaul — Final Report

**Date:** 2026-05-14

---

## Concat Bug (Root Cause)

**Finding:** `03-generate-listening.mjs` used `ffmpeg -f concat -c copy`. Stream-copying MP3 segments with per-call encoder-delay drift can produce files whose header duration looks correct but whose audio truncates at the first segment boundary. This is the exact bug described in the prompt.

**Fix:** `scripts/audio-v2/lib/concat.cjs` — new dedicated concat module that:
- Normalises every segment to identical codec params (`libmp3lame 44100 Hz 128k mono`) before concat
- Concatenates **with re-encoding** — never `-c copy`
- Runs `ffmpeg -v error -f null -` decode verification on the output and raises if it fails
- Returns `{ buffer, durationMs, segmentOffsets, segmentDurations }` for accurate per-segment timing

**Proof test:** `node scripts/audio-v2/test-concat.cjs` — PASSED
```
Decode verify: ✓ PASS
Duration: 6600ms (expected ~6600ms): ✓ PASS
Segment offsets (ms): [0,2300,4100]
```

**03-generate-listening.mjs updated** to import and use the new lib, decode-verify before upload, and enrich `speaker_segments` with `start_ms`/`end_ms`.

---

## Truncation in the UI (Actual Active Bug)

**Finding (from discovery):** `ListeningTab.jsx` line 234 passed `segments[0]?.audio_url` (the per-segment audio for only the first speaker from the `listening_audio` table) INSTEAD of `listening.audio_url` (the pre-built `combined.mp3`). Students heard only the first speaker's contribution then silence — not because the combined file was corrupt, but because the wrong URL was reaching the player.

**Fix:** Replaced `<ListeningAudioPlayer>` with `<ListeningSectionUI>` which reads `listening.audio_url` directly (the combined.mp3).

---

## Decode Audit Results

- **Rows audited:** 72
- **Decode failures:** 0
- **Truncation failures (real duration < 75% of expected):** 0
- **Rows regenerated:** 0

All 72 combined.mp3 files pass the ffmpeg decode test. No regeneration was needed for existing files. The concat fix and decode verification are now in place for all future regenerations.

---

## Duplicate Listening Rows

- **Duplicates found:** 0 (the two "identical" cards in Unit 10 were a single row — the duplicate visual was caused by null `title_ar` falling back to a generic English title)

---

## Arabic Titles

- **Rows with missing `title_ar`:** 72 (the entire table)
- **Rows updated:** 72
- **Migration:** `20260513020000_listening_titles.sql`
- Titles generated from transcript content at dev-time (no runtime AI call)
- Both `title_ar` and `title_en` updated with specific, descriptive titles

---

## Premium Player + Section Rebuild

### ListeningPlayer (`src/components/players/listening/ListeningPlayer.jsx`)
- `position: sticky; bottom: 1rem` — respects sidebar width in both expanded (264px) and collapsed (76px) states
- Velvet-Midnight glass aesthetic with gold accents; distinct from the reading player
- Scrubber with speaker-segment tick marks (using `start_ms` from enriched `speaker_segments`)
- Live current-speaker label (animates on transition)
- Replay/forward **5s** (better for language re-listening)
- Speed control: 0.5×/0.75×/1×/1.25×/1.5×
- A-B loop with clear button
- Collapse/expand toggle
- `onTimeUpdate` callback for transcript karaoke

### ListeningSection (`src/components/players/listening/ListeningSection.jsx`)
- Premium section header with Headphones icon, `title_ar`, and audio-type badge
- Before-listen notice hidden by default; "إظهار النص" reveals `InteractivePassage`
- Accepts `renderTranscript` render prop for fully interactive transcripts
- `children` slot for exercises (plugged in from `ListeningTab.jsx`)
- `ListeningPlayer` as the last child — sticky in content column

### ListeningTab.jsx
- Old `ListeningAudioPlayer` import removed; replaced with `ListeningSectionUI`
- `pb-[100px]` removed (no more fixed-footer player overlap needed)
- Reading flow (`ReadingPassagePlayer`, `StickyAudioBar`) untouched

---

## DB Migrations

| File | Purpose |
|---|---|
| `20260513010000_listening_segment_timing.sql` | Adds `audio_duration_ms` (integer) column |
| `20260513020000_listening_titles.sql` | Populates `title_ar` + `title_en` for all 72 rows |

---

## Self-Check Results

| Check | Result |
|---|---|
| `grep -n "c copy" scripts/audio-v2/lib/concat.cjs` | 0 command matches (appears only in comments) |
| `node scripts/audio-v2/test-concat.cjs` | ✓ PASS |
| 72/72 listening files pass ffmpeg decode test | ✓ PASS |
| `SELECT COUNT(*) WHERE title_ar IS NULL` | 0 (after migration) |
| Duplicate-transcript check | 0 rows |
| `grep "fixed bottom-0" src/components/players/listening/` | 0 matches |
| `grep "ListeningPlayer" src/components/players/listening/ListeningSection.jsx` | ✓ present |
| Reading player (`ReadingPassagePlayer`) does NOT import `ListeningPlayer` | ✓ confirmed |
| All hooks above conditional returns in new components | ✓ confirmed |
