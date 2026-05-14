# Listening Section — Discovery Report

**Date:** 2026-05-14

## Concat Bug

`scripts/audio-v2/03-generate-listening.mjs` line 70 (original):
```
ffmpeg -y -f concat -safe 0 -i list.txt -c copy out.mp3
```
The `-c copy` flag stream-copies MP3 segments without re-encoding. When segments are produced by separate ElevenLabs API calls, each carries its own encoder-delay drift. The resulting file has a correct-looking header duration but the audio only decodes up to the first segment boundary.

**Decode test result (5 multi-voice samples):** All 5 files passed decode. The concat bug was dormant in these files but the fix is in place going forward.

**Primary truncation bug (active):** `ListeningTab.jsx` line 234 passed `segments[0]?.audio_url` (first segment only) to the player instead of `listening.audio_url` (combined.mp3). This was the actual cause of students hearing only the first speaker.

## Duplicate Detection

Zero duplicates in `curriculum_listening`. The "two identical cards" in Unit 10 was one row — the duplicate visual was caused by null `title_ar` rendering as the generic fallback "Listening: interview" twice (the UI showed the item once in the list but visually appeared doubled due to styling).

## Component Map

| Component | Path | Role |
|---|---|---|
| `ListeningTab` | `src/pages/student/curriculum/tabs/ListeningTab.jsx` | Main tab, data fetch, inner ListeningSection |
| `ListeningAudioPlayer` | `src/components/players/ListeningAudioPlayer.jsx` | Old wrapper — REPLACED |
| `StickyAudioBar` | `src/components/players/StickyAudioBar.jsx` | Fixed-viewport player (used by reading) |
| `InteractivePassage` | `src/components/players/InteractivePassage.jsx` | Word-tap transcript |
| `ListeningPlayer` *(new)* | `src/components/players/listening/ListeningPlayer.jsx` | Premium sticky-in-content player |
| `ListeningSection` *(new)* | `src/components/players/listening/ListeningSection.jsx` | Premium section layout |

## Layout / Sidebar

- Sidebar: **right-side**, 264px expanded / 76px collapsed
- Main content: `lg:mr-[264px]` (expanded) or `lg:mr-[76px]` (collapsed)
- `StickyAudioBar` uses `fixed bottom-0 left-0 right-0` — will bleed under the sidebar on desktop
- **Fix:** `ListeningPlayer` uses `position: sticky; bottom: 1rem` inside the content column — automatically constrained to the column width, no sidebar context needed

## Segment Timing

`speaker_segments` at discovery had NO timing fields (`start_ms`/`end_ms` absent). Structure was:
```json
{ "text": "...", "order": 1, "gender": "male", "speaker": "Host", "voice_id": "...", "char_count": 229, "voice_name": "A" }
```
The regeneration script now enriches this JSON with `start_ms`/`end_ms` after concat. Existing rows remain untouched (backward compat — `ListeningPlayer` only shows segment ticks when `start_ms` is a number).

## Missing Titles

All 72 rows had `title_ar = null`. Fixed via migration `20260513020000_listening_titles.sql`.

## ffmpeg

Version 8.1.1-full_build installed and available in PATH.
