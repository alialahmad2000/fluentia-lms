# READING-POLISH-A-DIAGNOSIS

Generated: 2026-05-12

---

## Issue #1: Bottom Bar Layout

**Root causes:**
1. `BottomBarControls.jsx` uses `z-40`. `PageHelp` button uses `z-50 bottom:20px left:20px`. PageHelp is rendered in a portal and wins z-index → sits on top of play button.
2. The collapsed bar layout is a flat `flex` row — not 3-column grid — so Play is not centered.
3. `FloatingToggle` is NOT used in bottom-bar variant (already correct — the bottom-bar branch doesn't render it). Not the cause.

**Elements involved:**
- `PageHelp` (`src/components/PageHelp.jsx`) — `fixed z-50 bottom:20 left:20` — the "blue circle" FAB
- Bottom bar: `fixed z-40 bottom-0` — **z-40 < z-50, covered by PageHelp**

**Fix plan:**
- Raise bar to `z-[52]`
- Use CSS var `--fab-bottom` to push PageHelp up when bottom-bar is active. SmartAudioPlayer sets it on mount; PageHelp reads it.

---

## Issue #2: VocabPopup Behind Sidebar

**Root cause:**
Current positioning: `left: Math.min(anchorX, window.innerWidth - 340)` — only clamps to total viewport width, ignores RTL sidebar occupying `right-0` of the screen.

Sidebar: `<aside role="navigation">` at `fixed right-0 z-30 width: 264px` (collapsed: 76px).  
A click on the right side of the passage generates `anchorX` near the right edge. Popup at `left: anchorX - 160` → right edge = `anchorX + 160` → can extend under the sidebar.

**Fix plan:**
- Query `document.querySelector('aside[role="navigation"]')` for sidebar bounding rect
- Compute `rightBoundary = sidebarRect ? sidebarRect.left - 16 : window.innerWidth - 16`
- Clamp popup `x` so `x + 360 ≤ rightBoundary`
- Also flip above word if popup bottom would cover bottom bar

---

## Issue #3: Word Click Opens Popup, Not Seek

**Root cause:**
Current: `onClick → onWordClick(word, segIdx, startMs)` → ReadingTab `handleWordClick` → `setVocabPopup(...)`.  
`start_ms` in word_timestamps is absolute audio time ✓ — seek can use it directly.  
`seek()` is exposed by `useAudioEngine` and reachable from SmartAudioPlayer.

**Fix plan:**
- Add `onWordTap(word, segIdx, wordIdx, startMs)` prop: fires on short tap → `seek(startMs)` + `play()` if paused
- Add `onWordLongPress(word, segIdx, position)` prop: fires after 500ms hold → opens VocabPopup
- KaraokeText: use `onPointerDown` + `onPointerUp` timer pattern
- Wire both in SmartAudioPlayer; ReadingTab: `onWordTap` = seek, `onWordLongPress` = popup

---

## Issue #4: Karaoke Collapses Paragraphs + Shows Raw `*italic*`

**Root cause:**
- `text_content` has 17 `*word*` italic markers (e.g., `*ingenuity*`, `*understand*`)
- `word_timestamps` entries are plain words without `*` (ElevenLabs strips them)
- `KaraokeText` wraps ALL words in ONE `<p>` tag → paragraph breaks lost
- Karaoke-disabled fallback renders raw `text_content` including `*markers*` as literal characters

**Evidence:**
- Passage "Nuclear Renaissance": 5 paragraphs in `passage_content.paragraphs`, but all rendered in one `<p>` by KaraokeText
- Sample italic: `*ingenuity*` — appears as `*ingenuity*` in fallback text

**Fix plan:**
- `parseFormattedText.js`: split by `\n\n` → paragraphs; parse `*italic*` inline
- `KaraokeText`: use paragraph structure, assign word_timestamps slices per paragraph
- Each paragraph → separate `<p>`, italic words → `<em>`, plain words → `<span>`
- Karaoke highlighting works per-word across the full timestamps array via global word index
