# CONTEXT-AUDIO-A-DISCOVERY

Generated: 2026-05-12

## word_timestamps Shape

`{word, start_ms, end_ms}` — milliseconds ✓

### Reading (reading_passage_audio)
- One row per passage, `full_audio_url` = single MP3 for whole passage
- `start_ms` is absolute from start of the audio file
- Coverage: 144 rows

### Listening (listening_audio)
- One row per segment, `audio_url` = individual segment MP3
- `start_ms` resets to 0 for each segment (relative to that segment's audio file)
- Coverage: 531 segments with timestamps

## Word Index Alignment (CRITICAL)

KaraokeText renders ONE segment per instance. The `globalIdx` counter inside
each KaraokeText render is LOCAL to that segment (0..N-1). Therefore:

- `segIdx` prop = which segment
- `wordIdx` from handlePointerUp = local to that segment's `word_timestamps`

`findWordTimestamp(segments, segIdx, wordIdx)` simply does:
`segments[segIdx].word_timestamps[wordIdx]`

## Current WordTooltip API

Props: `word, definition_ar, ipa, audio_url, example_sentence, image_url, anchorEl, onClose, onMoreInfo`

Has Play/Pause button for `audio_url` (standard pronunciation). No in-context audio yet.

## Data Verification

Timestamps: {word: "Riyadh", start_ms: 0, end_ms: 488} — first word confirmed.
Listening: start_ms=0 for first word of each segment (segment-relative) ✓
Audio URLs: Supabase storage public URLs ✓

## Pass-through Chain

`handleVocabWordTap(word, segIdx, wordIdx, anchorEl, position)` in ReadingTab/ListeningTab
→ look up `segments[segIdx].word_timestamps[wordIdx]` for {audioUrl, startMs, endMs}
→ pass as `inContextAudio` prop to WordTooltip
