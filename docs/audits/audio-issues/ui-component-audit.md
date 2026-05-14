# UI Component Audit
Generated: 2026-05-14

---

## Reading Tab

- **File:** `src/pages/student/curriculum/tabs/ReadingTab.jsx`
- **DB source:** `curriculum_readings` ✓
- **Renders hide-text toggle:** NO ✓ (correct — passage is always visible to student)
- **Renders per-word click:** YES ✓ (`handleWordClick`, `handleVocabWordTap` at lines 413–519)
- **Player component:** `ReadingPassagePlayer` (`src/components/players/ReadingPassagePlayer.jsx`)
  - Comment in source explicitly states: *"Reading has NO hide-text toggle — the passage is always visible."*
  - Uses `InteractivePassage` with `wordTimestampsJson` prop for per-word audio seek.
- **Notes:** Reading UX is correctly separated from listening UX. No hide-text confusion detected.

---

## Listening Tab

- **File:** `src/pages/student/curriculum/tabs/ListeningTab.jsx`
- **DB source:** `curriculum_listening` ✓
- **Renders hide-text toggle:** YES ✓ (expected — transcript hidden by default; "إظهار النص" / "إخفاء النص")
- **Renders per-word click:** PARTIAL ⚠️
  - `ListeningAudioPlayer` passes `word_timestamps` to `InteractivePassage` BUT:
  - `curriculum_listening.word_timestamps` is NULL for **all 72 items** (confirmed by Phase B audit).
  - Per-word audio seek via timestamps is therefore non-functional in production.
- **Player component:** `ListeningAudioPlayer` (`src/components/players/ListeningAudioPlayer.jsx`)
  - Has `transcriptHidden` state starting `true`.
  - Renders transcript only after student reveals it.
  - Uses native `<audio controls>` — no custom seek or segment synchronization.
- **Notes:**
  - The `ListeningSection` in `ListeningTab.jsx` (line ~231) passes only `segments[0]?.word_timestamps` to
    `ListeningAudioPlayer`. Even if listening segments were stored with timestamps, only the first
    segment's timestamps are passed — multi-speaker items will lose word sync for all but the first voice.

---

## Shared `InteractivePassage` Component

- **File:** `src/components/players/InteractivePassage.jsx`
- **Used by:** `ReadingPassagePlayer`, `ListeningAudioPlayer`
- **Conclusion:** Shared component, but it is configured differently per caller:
  - Reading → always rendered (no toggle gate), `wordTimestampsJson` populated from `reading_passage_audio`
  - Listening → gated behind `!transcriptHidden`, `wordTimestampsJson` always null in practice
- **No reading-vs-listening UX bleed** detected in the component tree itself.

---

## Summary

| Check | Reading | Listening |
|---|---|---|
| Correct DB table | ✓ `curriculum_readings` | ✓ `curriculum_listening` |
| Hide-text toggle | ✓ Absent (correct) | ✓ Present (correct) |
| Per-word click handlers | ✓ Wired + functional | ⚠️ Wired but non-functional (no timestamps in DB) |
| Audio player | `ReadingPassagePlayer` (custom) | `ListeningAudioPlayer` (native `<audio>`) |

**No reading-vs-listening UI confusion detected.**  
Primary listening UX issue is missing `word_timestamps` in DB, not a component architecture bug.
