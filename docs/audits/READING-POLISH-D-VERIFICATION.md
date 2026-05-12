# READING-POLISH-D-VERIFICATION

Generated: 2026-05-12

---

## Issue #1: Bottom Bar Layout

**Root cause:** BottomBarControls z-index was 40; PageHelp button z-index is 50. PageHelp covered the Play button. Layout used flat flex row, not centered.

**Fix applied:**
- BottomBarControls: raised to `z-[52]`
- Collapsed bar layout changed from flat flex to 3-column grid (`grid-cols-3`): LEFT (skip-back + time), CENTER (Play — always centered), RIGHT (skip-forward + speed + settings + expand)
- SmartAudioPlayer: `useEffect` sets `--fab-bottom` CSS var to `bar-height + 16px` when bottom-bar mounts
- PageHelp: `bottom: 'var(--fab-bottom, 20px)'` — smoothly transitions to clear the bar

**Verification (code-level):**
- [x] Play button in center column of 3-column grid
- [x] Bar z-[52] > PageHelp z-50 > sidebar z-30
- [x] PageHelp button animates upward when bar mounts
- [x] FloatingToggle not rendered in bottom-bar variant (already correct from 2.5)

---

## Issue #2: VocabPopup Behind Sidebar

**Root cause:** Desktop popover used `Math.min(anchorX, window.innerWidth - 340)` — clamped to viewport but not to sidebar left edge.

**Fix applied:**
- `DesktopPopover`: `computePopoverPosition` queries `aside[role="navigation"]` for sidebar rect
- Right boundary = `sidebarRect.left - 16` (accounts for both collapsed 76px and expanded 264px)
- Bottom boundary = `window.innerHeight - BAR_H - MARGIN` (avoids bottom bar)
- Popup flips above word if would go below boundary
- Mobile sheet backdrop: z-[55], sheet: z-[60] (above bar z-[52])
- Desktop popover: z-60

**Verification (code-level):**
- [x] Sidebar detected via `aside[role="navigation"]`
- [x] Right boundary computed from sidebar bounding rect
- [x] Popup x clamped to `rightBoundary - POPUP_W`
- [x] Flip above word if bottom overflow

---

## Issue #3: Word Click = Seek

**Root cause:** Single click fired `onWordClick` → ReadingTab `handleWordClick` → `setVocabPopup`. No seek behavior.

**Fix applied:**
- `KaraokeText`: uses `onPointerDown` + `onPointerUp` timer pattern
  - Short tap (< 500ms) → `onWordTap(word, segIdx, wordIdx, startMs)` → seek + play
  - Long press (≥ 500ms) → `onWordLongPress(word, segIdx, position)` → VocabPopup
  - Right-click (`onContextMenu`) → `onWordLongPress`
  - Haptic: `navigator.vibrate(30)` on long-press trigger
  - iOS: `userSelect: none, WebkitTouchCallout: none` on word spans
- `SmartAudioPlayer`: `onWordTap` → `engine.seek(startMs) + engine.play()`; `onWordLongPress` passed through
- `ReadingTab`: `onWordLongPress={handleWordClick}` (wires popup to long-press)

**Verification (code-level):**
- [x] `start_ms` from word_timestamps is absolute audio time (ms) — seek works directly
- [x] `engine.seek()` exposed by useAudioEngine
- [x] Long-press = popup; short tap = seek
- [x] iOS touch-callout suppressed

---

## Issue #4: Karaoke Text Formatting

**Root cause:** KaraokeText wrapped all words in ONE `<p>` — paragraph breaks collapsed. Karaoke-disabled fallback rendered raw `*italic*` as text.

**Fix applied:**
- `src/components/audio/lib/parseFormattedText.js` — new parser:
  - Splits by `\n\n` → paragraph array
  - Parses `**bold**` and `*italic*` inline tokens
  - `tokenizeWords()` splits text preserving whitespace for alignment
- `KaraokeText` rewritten:
  - Uses `parseFormattedText` to build paragraph structure
  - Each paragraph → `<p>` with `mb-8 leading-[2] text-[19px]`
  - Inline types: `<em>` with `italic text-sky-200`, `<strong>` with `font-semibold text-white`
  - Per-word spans with global index tracking across paragraphs
  - Karaoke-disabled fallback also renders italic/bold via same parser

**Verification (code-level):**
- [x] 5 paragraphs in Nuclear Renaissance → 5 `<p>` elements
- [x] `*ingenuity*` → `<em>ingenuity</em>` (not `*ingenuity*`)
- [x] Word count alignment: 783 tokens → 783 timestamp entries (verified in Phase A)
- [x] Hooks rule: `useMemo` + `useRef` declared before early return

---

## Regressions

None expected. Changes are isolated to:
- BottomBarControls (layout only, no logic)
- VocabPopup (positioning only)
- KaraokeText (new rendering path, same hook signatures)
- SmartAudioPlayer (new props + CSS var effect)
- ReadingTab (onWordLongPress instead of onWordClick)
- PageHelp (CSS var for bottom position only)

Default/compact/minimal variants unaffected — they use `onWordClick` legacy prop or skip KaraokeText entirely.

---

## Known Limitations

- Browser/student testing not possible from CLI
- Long-press vibration requires device support (`navigator.vibrate` is not available on iOS Safari)
- VocabPopup sidebar detection assumes `aside[role="navigation"]` is present; falls back to full viewport if not found
