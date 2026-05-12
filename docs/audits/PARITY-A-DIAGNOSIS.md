# PARITY-A-DIAGNOSIS — Karaoke Parity + Listening UX Audit
Date: 2026-05-12

## A.1 — KaraokeText rendering paths (BEFORE fix)

**When `enabled === true`** (and `timestamps.length > 0`):
- Rendered word-by-word `<span>` elements
- Each span had: `data-word-idx`, `data-is-vocab`, all pointer/context/mouse handlers
- Visual classes: `bg-sky-500/25` (current), `text-slate-400` (past), `text-inherit` (future)
- Highlights and vocab underline rendered conditionally

**When `enabled === false` OR `timestamps.length === 0`** (LINE 112 — THE BUG):
```jsx
if (!karaokeEnabled || timestamps.length === 0) {
  return (
    <div dir="ltr" ...>
      {paragraphs.map(...renderInlineNoKaraoke...)}
    </div>
  )
}
```
- Rendered plain `<em>`, `<strong>`, or `<span>` elements via `renderInlineNoKaraoke()`
- `renderInlineNoKaraoke` returned bare elements with NO interaction handlers
- No `data-word-idx`, no `data-is-vocab`
- No `onPointerDown/Up`, no `onContextMenu`, no `onMouseEnter/Leave`
- No `highlightLookup` consulted → highlights invisible
- No `vocabSet` consulted → vocab underline invisible
- No `setWordRef` called

## A.2 — Parity gaps (BEFORE fix)

| Feature | Karaoke ON | Karaoke OFF | Status |
|---|---|---|---|
| Tap vocab word → tooltip | ✅ | ❌ | FIXED |
| Tap regular word → seek | ✅ | ❌ | FIXED |
| Long-press → action menu | ✅ | ❌ | FIXED |
| Hover → quick tooltip (desktop) | ✅ | ❌ | FIXED |
| Student highlights rendering | ✅ | ❌ | FIXED |
| Highlight new word from menu | ✅ | ❌ | FIXED |
| Vocab dotted underline | ✅ | ❌ | FIXED |
| 🎤 context voice slicing | ✅ | ❌ | FIXED |

**Root cause:** A completely separate render path (`renderInlineNoKaraoke`) was used when
karaoke was off, stripping all interactivity. The fix unifies both paths into a single
word-by-word span render; `karaokeEnabled` only controls visual classes.

## A.3 — Current Listening defaults (BEFORE fix)

- `ListeningTab.jsx:237`: `showTranscriptByDefault={true}` — text always visible
- `SmartAudioPlayer.jsx:67`: prop default `showTranscriptByDefault = true`
- Bottom-bar variant: KaraokeText always rendered, no visibility check

**Problem:** Listening is ear training. Showing text immediately defeats the pedagogical
purpose. Students should listen first, then verify with text.

## A.4 — Pre-existing hidden transcript UI

- The **default** variant (not bottom-bar) had an `Eye`/`EyeOff` toggle button at line 442,
  gated by `localFeatures.hideTranscript`. When hidden, it rendered nothing (no replacement UI).
- The **bottom-bar** variant had NO transcript toggle at all — text always visible.
- There was NO "listening focus" state — hiding text left a blank area.

## Phase B — Fix Applied

Rewrote `KaraokeText.jsx` to:
1. Remove the `if (!karaokeEnabled || timestamps.length === 0)` early return
2. Always render word-by-word `<span>` elements with all handlers and data attributes
3. `karaokeEnabled` only affects visual class computation:
   - ON + current word → `bg-sky-500/25 text-sky-50 font-semibold`
   - ON + past word → `text-slate-400` (or highlight color at 70% opacity)
   - OFF (or future) → highlight class | vocab underline | `text-slate-100`
4. Highlights and vocab underline always render independently of karaoke state

## Phase C — Listening UX Applied

1. `ListeningTab`: `showTranscriptByDefault={false}` — hidden by default
2. `ListeningFocusMode.jsx`: new component with:
   - Large speaker badge (SpeakerBadge size="lg") with status line
   - CSS-only audio waveform (7 bars, `waveformBar` keyframe animation)
   - Segment progress dots (current segment highlighted wider)
   - Reveal button (disabled in one-play before completion)
   - Pedagogical hint: listen first, verify later
3. `SmartAudioPlayer` bottom-bar:
   - `showTranscript` state initialized from localStorage per contentId
   - When hidden: renders `ListeningFocusMode` instead of KaraokeText
   - When visible: renders KaraokeText with "إخفاء النص" toggle button
   - `hasPlayedComplete` state tracks audio completion
   - `canRevealText = !onePlayMode || hasPlayedComplete`
   - Auto-reveal after completion: 1500ms delay, one-time, persists to localStorage
4. `src/styles/animations.css`: `waveformBar` keyframe + `.animate-waveform` class added

## Self-check

| Check | Result |
|---|---|
| All word handlers always attached | ✅ |
| data-is-vocab always rendered | ✅ |
| Highlights independent of karaoke | ✅ |
| Hover independent of karaoke | ✅ |
| Long-press independent of karaoke | ✅ |
| 🎤 context voice in karaoke-OFF | ✅ |
| Listening default hidden | ✅ |
| ListeningFocusMode component | ✅ |
| Speaker badge large | ✅ |
| CSS waveform 7 bars | ✅ |
| Segment progress dots | ✅ |
| Reveal button | ✅ |
| One-play locks reveal | ✅ |
| Auto-reveal on completion | ✅ |
| Per-transcript localStorage | ✅ |
| Reading default UNCHANGED | ✅ |
| 23/23 programmatic tests | ✅ |
