# AUDIO-PLAYER-A-DISCOVERY

Generated: 2026-05-12

## Existing Audio Files

- `src/components/AudioPlayer.jsx` — simple play/pause with progress bar, single URL, no karaoke
- `src/components/ielts/diagnostic/AudioPlayer.jsx` — IELTS-specific player
- `src/components/interactive-curriculum/InteractiveReadingTab.jsx` — uses inline `AudioButton` (local component, line 416)
- `src/components/interactive-curriculum/InteractiveListeningTab.jsx` — uses inline `AudioPlayer` (local, line 169)
- No `src/components/audio/` directory exists — creating fresh

## Current Reading/Listening Tab Audio Usage

- **Reading**: `<AudioButton url={reading.passage_audio_url} label="استمع للقراءة" />` (line 205). Simple button, no karaoke.
- **Listening**: `<AudioPlayer url={listening.audio_url} duration={...} />` (line 151). Simple player, no multi-voice.
- Neither tab modified in this prompt (foundation only).

## Admin Route Pattern

```jsx
<Route element={<ProtectedRoute allowedRoles={['admin']} />}>
  <Route path="/admin" element={<Page><AdminDashboard /></Page>} />
</Route>
```

`ProtectedRoute` reads from `useAuthStore`. Dev route mirrors this pattern.

## DB Schema — word_timestamps

```json
[{"word": "Riyadh", "start_ms": 0, "end_ms": 488}, ...]
```
Standard `{word, start_ms, end_ms}` — no remapping needed.

## Speaker Labels (real names, not A/B)

| Label | Voice ID prefix |
|-------|----------------|
| Host | JBFqnCBsd6RM |
| Layla | Xb7hH8MSUJpS |
| Dr. Sarah Mitchell | Xb7hH8MSUJpS |
| Interviewer | Xb7hH8MSUJpS |
| Noor | XrExE9yKIg1W |

Labels are full names — color assignment uses string hash, not fixed A/B map.

## Test Data IDs

- Reading: `97e8ad3c-...` (L0), `13869905-...` (L0)
- Listening (multi-segment): `0767ef9b-...`, `126e9fea-...`
- Vocab: `0f01178c-...` word="popular"

## reading_passage_audio Schema

- `full_audio_url` — single MP3 for whole passage
- `word_timestamps` — flat JSONB array, all words
- `paragraph_audio` — JSONB array `[{index, text, audio_url, start_ms, end_ms, word_count}]`

Single-URL mode used for reading (full passage as one audio).

## listening_audio Schema

Per-segment: `transcript_id, segment_index, speaker_label, voice_id, audio_url, duration_ms, text_content, word_timestamps`
