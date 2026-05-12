# READING-DEEPFIX-A-DISCOVERY

Generated: 2026-05-12

## Passage Under Test

"The Nuclear Renaissance" — ID: `f857de92-78c6-4e48-b034-20d015270081`

---

## Q1: word_timestamps Shape

Shape: `{"word": "In", "start_ms": 0, "end_ms": 209}`
- Property names: `word`, `start_ms`, `end_ms` ✓ exactly what SmartAudioPlayer expects
- Times in **milliseconds** ✓
- Sample entries:
  - `{"word":"In","end_ms":209,"start_ms":0}`
  - `{"word":"the","end_ms":348,"start_ms":267}`
  - `{"word":"sprawling","end_ms":1057,"start_ms":406}`
- Last entry: `{"word":"before.","end_ms":421671,"start_ms":420812}` — punctuation attached to word

**NO normalization needed.** Shape is correct.

---

## Q2: Text Mismatch

Rendered text (passage_content.paragraphs.join('\n\n')) first 100 chars:
`"In the sprawling desert of the United Arab Emirates, approximately 300 kilometers from Saudi Arabia'"`

Last 100 chars:
`"lutions that make atomic energy safer, more affordable, and more widely accessible than ever before."`

**Result: MATCH.** Text content is identical between what ReadingTab renders and what was used for audio generation.

---

## Q3: Word Count Alignment

- Rendered text word count (whitespace split): **783**
- word_timestamps entries: **783**
- Diff: **0 — perfect alignment**

Punctuation is attached to words in both the rendered text and timestamps (e.g., "Emirates," "border," "before."). No mismatch.

---

## Q4: ReadingTab Render Path — ROOT CAUSE 1 🔴

Current wiring (from Prompt 2):

```jsx
<SmartAudioPlayer
  ...
  showTranscriptByDefault={false}  // ← KARAOKE NEVER SHOWS
/>
// ... then later ...
<PassageDisplay paragraphs={...} />  // ← separate text, no karaoke
```

**Root cause**: `showTranscriptByDefault={false}` means `showTranscript` state starts as `false`. The player's `KaraokeText` is inside the `{showTranscript && ...}` branch. Since it starts false, karaoke is never rendered unless the user manually clicks the eye toggle.

Even if the user enables karaoke via the toggle:
- The passage text appears TWICE (once in player's KaraokeText, once in PassageDisplay below)
- PassageDisplay's text has NO karaoke wiring

**Fix**: Switch to `bottom-bar` variant with `showTranscriptByDefault={true}`. The KaraokeText becomes the primary passage renderer. PassageDisplay is removed when audio is available.

---

## Q5: Duration Display Shows "7:01 / 0:01" — ROOT CAUSE 2 🟡

`full_duration_ms` = 421671 = 7 minutes 1.671 seconds. **The duration value is correct.**

The display reversal is a ProgressBar layout bug:
```jsx
// ProgressBar.jsx — time display container
<div className="flex justify-between mt-1 px-0.5">  // ← NO dir="ltr"
  <span dir="ltr">{fmt(currentTime)}</span>  // 0:00 — should be on LEFT
  <span dir="ltr">{fmt(duration)}</span>       // 7:01 — should be on RIGHT
</div>
```

In an RTL page (`dir="rtl"` on html element), the flex container reverses child order:
- currentTime (0:00) appears on the **RIGHT** visually
- duration (7:01) appears on the **LEFT** visually

Result: student sees "7:01 / 0:01" (total first, current second) — reversed.

**Fix**: Add `dir="ltr"` to the container `<div>` in ProgressBar.

---

## Q6: Feature State Matrix

Without browser access, assessed from code review:

| Feature | State | Reason |
|---------|-------|--------|
| Play/pause | ✅ | AudioEngine wired, toggle works |
| Speed control | ✅ | setRate wired |
| Skip ±10s | ✅ | skip() wired |
| Progress bar (seek) | 🟡 | RTL reversal on time display; seek click itself works |
| **Karaoke highlighting** | ❌ | showTranscriptByDefault=false — KaraokeText never rendered |
| Sentence navigation | ❌ | Depends on karaoke being visible |
| A-B loop | ✅ | Logic correct; UI hidden unless user expands settings |
| Bookmarks | ✅ | localStorage wired |
| Hide transcript toggle | ⚠️ | Toggle works but transcript was already hidden |
| Word click → VocabPopup | ❌ | Fires from KaraokeText which is hidden |
| Settings menu | ✅ | Opens |
| Keyboard shortcuts | ✅ | Wired |

---

## Root Cause Ranking

1. **🔴 CRITICAL**: `showTranscriptByDefault={false}` + separate PassageDisplay = karaoke never visible. **Fix: bottom-bar variant + remove PassageDisplay when audio present.**
2. **🟡 MEDIUM**: ProgressBar time display container missing `dir="ltr"` = RTL reversal. **Fix: 1-line change in ProgressBar.jsx.**
3. **✅ DATA**: All DB data (timestamps, duration, text) is correct. No regeneration needed.

---

## Proposed Fix Architecture

1. `src/components/audio/parts/ProgressBar.jsx` — add `dir="ltr"` to time container div
2. `src/components/audio/parts/BottomBarControls.jsx` — new component for fixed bottom bar
3. `src/components/audio/hooks/useBarVisibility.js` — scroll direction tracking for mobile hide/reveal
4. `src/components/audio/hooks/useKaraoke.js` — update auto-scroll to account for bar height
5. `src/components/audio/SmartAudioPlayer.jsx` — add `bottom-bar` variant
6. `src/pages/student/curriculum/tabs/ReadingTab.jsx` — switch to `variant="bottom-bar"`, remove duplicate PassageDisplay when audio present
7. `src/pages/dev/AudioPlayerTest.jsx` — add variant selector to Section 2
