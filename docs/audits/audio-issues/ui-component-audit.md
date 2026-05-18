# UI Component Audit (audio-content)
Generated: 2026-05-18T00:33:13.971Z

## src/components/interactive-curriculum/InteractiveListeningTab.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/components/interactive-curriculum/InteractiveReadingTab.jsx
- DB source: curriculum_readings/reading_passage_audio
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/components/players/listening/ListeningSection.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: YES ✓ (expected for listening)
- Renders per-word click: YES ✓
- Player component: custom

## src/components/players/ListeningAudioPlayer.jsx
- DB source: unknown
- Renders hide-text toggle: YES ✓ (expected for listening)
- Renders per-word click: YES ✓
- Player component: ListeningAudioPlayer

## src/components/players/ReadingPassagePlayer.jsx
- DB source: unknown
- Renders hide-text toggle: NO
- Renders per-word click: YES ✓
- Player component: ReadingPassagePlayer

## src/pages/student/curriculum/tabs/ReadingTab.jsx
- DB source: curriculum_readings/reading_passage_audio
- Renders hide-text toggle: NO
- Renders per-word click: YES ✓
- Player component: ReadingPassagePlayer

## src/pages/student/curriculum/tabs/ListeningTab.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/student/curriculum/UnitContentOriginal.jsx
- DB source: unknown
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/student/curriculum/UnitContent.jsx
- DB source: unknown
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/admin/curriculum/CurriculumMap.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/admin/curriculum/components/ListeningEditor.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/admin/curriculum/components/UnitCard.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/admin/curriculum/LevelDetail.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/admin/curriculum/UnitEditor.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/admin/AdminContentBank.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/admin/StudentProgressDiagnostic.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/shared/InteractiveCurriculumPage.jsx
- DB source: unknown
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

## src/pages/dev/AudioPlayerTest.jsx
- DB source: curriculum_listening
- Renders hide-text toggle: NO
- Renders per-word click: YES ✓
- Player component: custom

## src/pages/trainer/TrainerCurriculum.legacy.jsx
- DB source: curriculum_readings/reading_passage_audio
- Renders hide-text toggle: NO
- Renders per-word click: NO ⚠️
- Player component: custom

