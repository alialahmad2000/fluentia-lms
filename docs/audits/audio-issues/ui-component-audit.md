# UI Component Audit — Reading vs Listening
Generated: 2026-05-18 (Phase D deep read — 01-AUDIT-AUDIO-CONTENT)

---

## Reading Tab (PRIMARY — student-facing)

- **File:** `src/pages/student/curriculum/tabs/ReadingTab.jsx`
- **DB source:** `curriculum_readings` (`.from('curriculum_readings')`, line 80) ✓
- **Audio data:** `reading_passage_audio` via `useReadingPassageAudio(reading.id)` hook
- **Player component:** `SmartAudioPlayer` (bottom-bar variant)
- **Renders hide-text toggle:** NO ✓ — explicitly `features.hideTranscript: false`
  - The passage is always visible (correct — reading IS the content)
- **Renders per-word click:** YES ✓ — `wordClickToLookup: true`, `onWordLongPress` → vocab popup, `onWordHover` → WordTooltip
- **word_timestamps flow:** `useReadingPassageAudio` → `audioData.segments` → `SmartAudioPlayer`
- **Notes:** No bugs. Architecture correct. Per-word seek works for 91 fully-complete passages. 53 with 49–85% TS coverage degrade gracefully.

---

## Listening Tab (PRIMARY — student-facing)

- **File:** `src/pages/student/curriculum/tabs/ListeningTab.jsx`
- **DB source:** `curriculum_listening` via `select('*')` (line 44) — `word_timestamps` included ✓
- **Player component:** `ListeningSectionUI` (`src/components/players/listening/ListeningSection.jsx`)
- **Renders hide-text toggle:** YES ✓ — expected for listening (transcript hidden by default)
- **Renders per-word click:** YES ✓ (wired; data-dependent)
  - `ListeningSection.jsx` line 124: `wordTimestampsJson={listening.word_timestamps}` → `InteractivePassage`
  - Works for 45/72 items (L2–L5 dialogues/interviews have populated `word_timestamps`)
  - Degrades gracefully for 24 L0/L1 monologues and 3 lectures where `word_timestamps` is NULL
- **word_timestamps flow:** `curriculum_listening.word_timestamps` → `ListeningSectionUI` → `InteractivePassage`
- **Notes:** Architecture correct. No bleed. The `handleWordTap` in `ListeningTab.jsx` only fires analytics (`trackEvent`); actual seek is handled inside `InteractivePassage`/`SmartAudioPlayer` via `wordTimestampsJson`.

---

## ListeningSection (premium player — used by primary ListeningTab)

- **File:** `src/components/players/listening/ListeningSection.jsx`
- **Prop interface:** `{ listening: full curriculum_listening row, unitId, audioLoading }`
- **Renders hide-text toggle:** YES ✓ (`transcriptHidden` state, "إظهار النص / إخفاء النص")
- **Renders per-word click:** YES ✓ via `InteractivePassage wordTimestampsJson={listening.word_timestamps}`

---

## ListeningAudioPlayer (utility — not in primary path)

- **File:** `src/components/players/ListeningAudioPlayer.jsx`
- **Prop interface:** `{ item: { id, title_en, title_ar, transcript, audio_url, word_timestamps, audio_type }, unitId }`
- **Renders hide-text toggle:** YES ✓
- **Renders per-word click:** YES ✓ — `wordTimestampsJson={item.word_timestamps}`

---

## ReadingPassagePlayer (utility — not in primary path)

- **File:** `src/components/players/ReadingPassagePlayer.jsx`
- **Prop interface:** `{ passage, audio: { full_audio_url, word_timestamps, full_duration_ms } | null, unitId }`
- **Renders hide-text toggle:** NO ✓
- **Renders per-word click:** YES ✓ — `wordTimestampsJson={audio?.word_timestamps}`

---

## SmartAudioPlayer (shared core engine)

- **File:** `src/components/audio/SmartAudioPlayer.jsx`
- **Key design:** Feature-flag object controls behavior per caller
  - `features.hideTranscript` — reading: `false`, listening: `true` → **no bleed-over**
  - `wordTimestamps` → `KaraokeText` for karaoke highlighting + per-word seek
- **Notes:** Single shared engine with correct feature isolation between reading and listening.

---

## Admin / Trainer / Dev pages (reference only)

These pages reference `curriculum_listening` or `curriculum_readings` for content management
(editors, content banks, diagnostics) — **not student-facing audio players**. They do not
render per-word click handlers because they don't need them. No issue.

| File | Purpose | DB | Hide-text | Per-word |
|---|---|---|---|---|
| `src/pages/admin/curriculum/UnitEditor.jsx` | content editing | listening | — | — |
| `src/pages/admin/curriculum/ListeningEditor.jsx` | content editing | listening | — | — |
| `src/pages/admin/AdminContentBank.jsx` | content bank | listening | — | — |
| `src/pages/admin/StudentProgressDiagnostic.jsx` | diagnostics | listening | — | — |
| `src/pages/dev/AudioPlayerTest.jsx` | dev testing | listening | ✗ | ✓ |
| `src/pages/trainer/TrainerCurriculum.legacy.jsx` | legacy trainer view | reading | ✗ | ✗ |
| `src/pages/shared/InteractiveCurriculumPage.jsx` | shared shell | — | ✗ | ✗ |
| `src/components/interactive-curriculum/InteractiveListeningTab.jsx` | alternative view | listening | ✗ | ✗ |
| `src/components/interactive-curriculum/InteractiveReadingTab.jsx` | alternative view | reading | ✗ | ✗ |

---

## Key Findings

### Reading vs Listening Confusion
**NONE DETECTED. ✅**
Reading tab: `hideTranscript: false` (correct — passage always visible).
Listening tab: transcript hidden by default (correct — test comprehension before revealing).
No shared component causes bleed-over. SmartAudioPlayer's feature-flag design prevents it.

### Per-word Click
Wired correctly in both primary paths. Status depends entirely on data availability:

| Scope | Per-word seek | Reason |
|---|---|---|
| Reading — 91 passages (full TS) | ✅ Full | `word_timestamps` complete |
| Reading — 53 passages (partial TS) | ⚠️ Partial | 49–85% word coverage |
| Listening — 45 L2-L5 items | ✅ Full | `word_timestamps` populated |
| Listening — 24 L0/L1 monologues | ✗ | `word_timestamps` NULL (not generated yet) |
| Listening — 3 lectures (L4/L5) | ✗ | `word_timestamps` NULL (unexpected gap) |

### Items needing UI rebuild (Prompt 03 input)
**None required.** All component architecture is correct.
Prompt 03 can proceed with UX enhancements (karaoke polish, word-tap UX, etc.)
without any prerequisite component restructuring.

