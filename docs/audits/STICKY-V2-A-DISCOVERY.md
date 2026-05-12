# STICKY-V2-A-DISCOVERY

Generated: 2026-05-12 (autonomous)

## A.1 — Current BottomBarControls

Height: `style={{ height: 64 }}` on content row — already 64px.
But still has expand/collapse (maxHeight 0→200px expanded section).
Has absolute-centered Play + left/right flex clusters.
Has `useBarVisibility` (scroll hide/reveal on mobile).
Has BookmarkDrawer rendered above bar.

**To replace:** Remove expand/collapse entirely. Single always-visible row.
Move A-B / dictation / bookmarks into SettingsPopover (gear icon).

## A.2 — Vocab Word Marker

`data-is-vocab="true"` attribute already set in `KaraokeText.jsx` when `vocabSet.has(wordClean)`.
`vocabSet` prop accepted. Already working — just needs to be wired from tabs.

## A.3 — Vocab Audio Coverage

100% — 13,930/13,930 have `audio_url`. Supabase storage path:
`curriculum-audio/vocabulary/{L}/{unit}/{word}.mp3`

## A.4 — Router

react-router-dom v6. `BrowserRouter` wraps all. `useLocation` available in any component inside router. ✓

## A.5 — WordTooltip

No audio button currently. Adding play/pause button + example_sentence + image_url rendering.

## Schema Note

`curriculum_vocabulary` links via `reading_id`, not `unit_id` directly.
`useUnitVocabSet(unitId)` must JOIN: `curriculum_vocabulary` → `curriculum_readings` → WHERE `unit_id = $1`.
