# Original Reading Section Spec — Restored from ad13345

## Restore boundary
- **BOUNDARY** commit: `88d36ff` — "feat(players): split reading + listening players, add word-level interaction" (Prompt 03)
- **RESTORE_TARGET** commit: `ad13345` — "feat(audio): word pronunciation in narrator's voice via audio slicing"
  - This is the last state of the reading section as students knew it, immediately before prompt 03 rewrote it.

## File inventory (single file — no separate CSS)
| File | Path | Status |
|------|------|--------|
| Main reading tab | `src/pages/student/curriculum/tabs/ReadingTab.jsx` | RESTORED |
| SmartAudioPlayer | `src/components/audio/SmartAudioPlayer.jsx` | exists, unchanged |
| VocabPopup | `src/components/audio/VocabPopup.jsx` | exists, unchanged |
| WordActionMenu | `src/components/audio/parts/WordActionMenu.jsx` | exists, unchanged |
| WordTooltip | `src/components/audio/parts/WordTooltip.jsx` | exists, unchanged |
| TextSelectionTooltip | `src/components/student/TextSelectionTooltip.jsx` | exists, unchanged |
| findWordTimestamp | `src/lib/findWordTimestamp.js` | exists, unchanged |
| useReadingPassageAudio | `src/hooks/useReadingPassageAudio.js` | exists, unchanged |
| useUnitVocabSet | `src/hooks/useUnitVocabSet.js` | exists, unchanged |
| useWordHighlights | `src/hooks/useWordHighlights.js` | exists, unchanged |

## Layout
- Sub-tabs for Reading A / B (if multiple readings)
- Each reading: infographic card, pre-read section, passage (SmartAudioPlayer or PassageDisplay), questions, critical thinking, personalized variant, AI summary
- Word action menu overlay (long-press / right-click)
- WordTooltip overlay (vocab tap)
- VocabPopup overlay (detailed vocab from action menu)

## Vocabulary highlighting
- Matched via `useUnitVocabSet(unitId)` — returns a Set of lowercase words for the unit
- `vocabMap` = useMemo mapping word → vocab entry from curriculum_vocabulary rows
- Visual treatment: handled inside `SmartAudioPlayer` via `vocabSet` prop (gold highlight on vocab words in karaoke passage render), and in `PassageDisplay` via inline word rendering
- PassageDisplay marks vocab words with a distinct inline hover treatment (shows Arabic meaning on hover)

## Word tokenization
- SmartAudioPlayer (when audio exists): handles full tokenization internally, renders every word as an interactive span with karaoke-active highlighting
- PassageDisplay (when no audio): tokenizes paragraphs, every word is clickable for translation hover

## Tap-to-translate
- **Vocab words**: `handleVocabWordTap` → fetches full vocab entry from `curriculum_vocabulary` → shows `WordTooltip` immediately (instant, no loading)
  - `WordTooltip` shows: word, Arabic definition, IPA, audio button (🔊 standard vocab audio + 🎤 in-context passage audio)
  - `inContextAudio` built from `findWordTimestamp(segments, segIdx, wordIdx)` — plays the word's audio slice from the passage recording
- **Any word (long-press / right-click)**: `handleWordClick` → shows `WordActionMenu` with options: translate, highlight (multiple colors), add note, save to vocab

## Saved-words / add-to-vocabulary
- Integrated in both SmartAudioPlayer's word interaction and TextSelectionTooltip
- `savedWordSet` (from supabase `student_saved_words`) tracks already-saved words
- Word saving shows a quick-add flow

## Audio system (built into the restore — no Phase C needed)
- **When audio exists**: `SmartAudioPlayer` in `variant="bottom-bar"` with:
  - Built-in karaoke (word-by-word highlight synced to audio)
  - Speed control (0.5× – 2×)
  - A-B loop, skip buttons, sentence navigation
  - Word click to lookup (calls `onWordLongPress` → `handleWordClick`)
  - Vocab word tap (calls `onVocabWordTap` → `handleVocabWordTap`)
  - Segment tracking and analytics
- **When no audio**: `PassageDisplay` fallback + `TextSelectionTooltip` — pure original experience

## What prompts 03/06 changed (the drift)
- Removed `SmartAudioPlayer` (import + render)
- Removed `TextSelectionTooltip` (import + render)
- Removed `PassageDisplay` + `WordActionMenu` + `WordTooltip` + `VocabPopup` from render
- Removed all interaction handlers from render output (state/handlers stayed in code but weren't wired to UI)
- Added `ReadingPassagePlayer` from `components/players/` — a simplified replacement

## Phase C status
Phase C's ReadingAudioBar, useKaraoke, and useWordAudio are NOT needed separately.
The restored `ad13345` already provides ALL of these via SmartAudioPlayer:
- Karaoke: built into SmartAudioPlayer
- Per-word audio: WordTooltip's inContextAudio (via findWordTimestamp + playAudioSlice)
- Sticky audio bar: SmartAudioPlayer variant="bottom-bar"
Adding Phase C's components would duplicate this functionality and risk conflicts.
