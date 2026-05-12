# READING-WIRING-DISCOVERY

Generated: 2026-05-12

## Reading Tab File

**Primary:** `src/pages/student/curriculum/tabs/ReadingTab.jsx` (1862 lines)
- Main export: `ReadingTab({ unitId })` — fetches all readings for unit, renders tab-switcher
- Inner component: `ReadingContent({ reading, studentId, unitId })` — per-reading rendering
- `PassageDisplay` (line 1003) — renders paragraphs with vocabMap highlights, TextSelectionTooltip, focus mode, notes

**Also exists:** `src/components/interactive-curriculum/InteractiveReadingTab.jsx` (536 lines) — separate (older?) tab used in a different context. Not modified.

## Data Loading

- `curriculum_readings` via `useQuery` (react-query)
- `curriculum_vocabulary` by `reading_id` → builds `vocabMap` (word → vocab object)
- `curriculum_comprehension_questions` by `reading_id`
- `reading_passage_audio` — NOT yet fetched (this prompt adds it)

## Existing Audio

`<AudioButton>` inline in header flex row (line 588) — simple play/pause button, no karaoke.
Replaced by SmartAudioPlayer in this prompt.

## Vocab Highlighting

`PassageDisplay` splits paragraph text by regex, looks up each word in `vocabMap`. Highlighted vocab words have their own hover tooltip system (`TextSelectionTooltip`). SmartAudioPlayer word-click fires **only for non-vocabMap words**.

## Completion Tracking

`student_curriculum_progress` table — INSERT/UPDATE pattern, `status='completed'`, `score`. Existing logic preserved.

## reading_passage_audio Schema (actual)

ONE row per passage:
- `passage_id` (uuid, PK)
- `full_audio_url` (text)
- `full_duration_ms` (int)
- `paragraph_audio` (jsonb) — array of `{index, text, audio_url, start_ms, end_ms}`
- `word_timestamps` (jsonb) — flat array of `{word, start_ms, end_ms}`
- `voice_id` (text)

Maps to ONE SmartAudioPlayer segment (full passage as single audio).

## Vocabulary Columns (curriculum_vocabulary)

Key: `id, reading_id, word, definition_ar, example_sentence, pronunciation_ipa, audio_url`
Lookup: by `reading_id` (not unit_id — linked to specific reading)

## analytics_events

Already exists. Columns: `id, user_id, event, properties, session_id, device, browser, created_at, page_path`
RLS: INSERT allowed for authenticated users; SELECT for admins only.

## Insertion Points

1. SmartAudioPlayer: between header divider (line ~693) and Before-You-Read section
2. Remove AudioButton lines 588–595
3. VocabPopup: after ReadingContent JSX return (before closing tags)
4. New state/hook: inside ReadingContent before any returns
