# INLINE-PLAYER-A-AUDIT

Generated: 2026-05-12

## A.1 — Current Default Variant

Rendered as a single `<div>` with:
1. **Topbar**: settings gear + speaker badge + bookmarks button
2. **Auto-resume prompt** (conditional)
3. **Error state** (conditional)
4. **Transcript/Karaoke** — `max-h-60 overflow-y-auto` (hard cap, scrollable box — cramped)
5. **Dictation panel** + start button
6. **ABLoopControls** (below text)
7. **ProgressBar**
8. **PlayerControls** (existing flat component)
9. **BookmarkDrawer** (popover)

**Missing from default variant** (only wired in bottom-bar):
- `highlightLookup` prop not passed to KaraokeText
- `vocabSet` prop not passed
- `onWordHover`/`onWordHoverEnd` not passed
- `hoveredVocab` + `WordTooltip` not rendered
- `onWordTap`/`onWordLongPress` ARE wired (correct)

**Visual**: `rgba(255,255,255,0.03)` bg, `rgba(255,255,255,0.07)` border, `rounded-2xl` — minimal.

## A.2 — Bottom-Bar-Only Elements (NOT in default)

- `position: fixed; bottom: 0` — BottomBarControls
- Heavy `backdrop-filter: blur(24px)` on the bar
- `useBarVisibility` hook (scroll reveal/hide)
- `env(safe-area-inset-bottom)` padding
- Expand/collapse animation + tap-to-expand
- `--fab-bottom` CSS var set via useEffect in SmartAudioPlayer
- `pb-32`/`pb-40` clearance in ReadingTab/ListeningTab
- `min-h-screen pb-36` on ListeningSection

## A.3 — Shared Components (variant-agnostic)

All confirmed:
- `KaraokeText.jsx` ✓
- `useKaraoke.js` ✓ (isBottomBarMode only affects scroll offset)
- `useWordHighlights.js` ✓
- `WordTooltip.jsx` ✓
- `WordActionMenu.jsx` ✓
- `ProgressBar.jsx` ✓ (dir="ltr" already in)
- `useAudioEngine.js` ✓ (multi-segment transitions)
- `VocabPopup.jsx` ✓

## Proposed Changes

1. Redesign default variant: 4-row premium inline layout
2. Fix missing prop wiring: highlightLookup, vocabSet, onWordHover, WordTooltip
3. Remove `max-h-60` cap — KaraokeText flows naturally below player card
4. Switch ReadingTab + ListeningTab to `variant="default"`
5. Remove bottom-bar-specific CSS/clearance from tabs
