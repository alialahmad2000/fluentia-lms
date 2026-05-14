# Player Refactor Discovery — 2026-05-14

## A.1 — Current player files

| Role | File |
|------|------|
| Student Reading tab | `src/pages/student/curriculum/tabs/ReadingTab.jsx` |
| Student Listening tab | `src/pages/student/curriculum/tabs/ListeningTab.jsx` |
| Shared audio engine | `src/components/audio/SmartAudioPlayer.jsx` |
| Interactive Reading (trainer) | `src/components/interactive-curriculum/InteractiveReadingTab.jsx` |
| Interactive Listening (trainer) | `src/components/interactive-curriculum/InteractiveListeningTab.jsx` |

**ReadingTab** uses `SmartAudioPlayer` with `features.hideTranscript: false` — no hide-text toggle exposed.
Audio data via `useReadingPassageAudio(reading.id, reading.passage_content)` → `reading_passage_audio` table.
Passage stored in `curriculum_readings.passage_content.paragraphs[]` (string array).

**ListeningTab** uses `SmartAudioPlayer` with `features.hideTranscript: true` — hide/show transcript toggle active.
Audio segments via `useListeningTranscriptAudio(listening.id)` → `listening_audio` table (multi-segment, multi-speaker).
Transcript text in `curriculum_listening.transcript`.

## A.2 — Existing translation infrastructure

`vocab-quick-meaning` edge function ALREADY EXISTS:
- Input: `{ word: string }`
- Cache table: `vocab_cache` (columns: word, meaning_ar, part_of_speech)
- Calls Claude Haiku on cache miss
- Returns `{ word, meaning_ar, part_of_speech }`

→ `useTranslateWord` hook will call `vocab-quick-meaning` and map `meaning_ar` → `translation_ar`.
→ NO new edge function needed. NO new DB table needed.

## A.3 — Vocabulary "add" infrastructure

Table: `student_saved_words`
Schema observed from codebase:
- `student_id` (uuid)
- `word` (text)
- `source` (text) — e.g. 'reading', 'reading_passage'
- Additional fields from vocab item (definition_ar, audio_url, etc.)

Canonical insert pattern (from `TextSelectionTooltip.jsx:198`):
```js
supabase.from('student_saved_words').insert({ student_id, word, source, ... })
```

No standalone `useSavedWords` hook exists — build new.

## Decision log

- Use `vocab-quick-meaning` (not new `translate-word`) — already cached, Haiku-powered
- `useTranslateWord` maps `meaning_ar` field from response
- `useSavedWords` uses `student_saved_words` table, gets studentId from `useAuthStore` → `profile.id ?? user.id`
- ListeningTab keeps `useListeningTranscriptAudio` for segments; extracts `audio_url + word_timestamps` from `segments[0]` to pass to `ListeningAudioPlayer`
- ReadingPassagePlayer gets audio props extracted from `audioData.segments[0]`
