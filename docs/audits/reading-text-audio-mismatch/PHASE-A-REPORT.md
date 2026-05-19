# Phase A — Reading Text/Audio Mismatch Diagnosis

Date: 2026-05-19

## Component map

| Role | File:line |
|------|-----------|
| Article tab buttons (A/B selector) | `src/pages/student/curriculum/tabs/ReadingTab.jsx:111-123` |
| `activeReading` state holder | `src/pages/student/curriculum/tabs/ReadingTab.jsx:75` |
| `reading = readings[activeReading]` resolver | `src/pages/student/curriculum/tabs/ReadingTab.jsx:104` |
| AnimatePresence wrapper + `key={reading.id}` | `src/pages/student/curriculum/tabs/ReadingTab.jsx:127-138` |
| ReadingContent (consumer of `reading` prop) | `src/pages/student/curriculum/tabs/ReadingTab.jsx:148` |
| Audio data fetch hook | `src/hooks/useReadingPassageAudio.js:8-54` |
| SmartAudioPlayer mount | `src/pages/student/curriculum/tabs/ReadingTab.jsx:846-890` |
| Audio engine (`<audio>` element + src logic) | `src/components/audio/hooks/useAudioEngine.js:46-125` |
| Karaoke highlighter | `src/components/audio/hooks/useKaraoke.js` |

## Article selection flow (intended)

1. User clicks button → `setActiveReading(i)` updates index state in ReadingTab.
2. ReadingTab re-renders → `reading = readings[activeReading]` resolves to a new row.
3. `<motion.div key={reading.id}>` sees a new key → AnimatePresence runs exit on the old subtree then mounts the new subtree.
4. ReadingContent mounts fresh with the new `reading` prop.
5. `useReadingPassageAudio(reading.id, reading.passage_content)` fires, sets `audioData = null` then fetches.
6. Until `audioData` is loaded the player isn't rendered.
7. Once data lands, `<SmartAudioPlayer segments={audioData.segments} contentId={reading.id} … />` mounts.
8. `useAudioEngine` creates a fresh `new Audio()` and runs its "load source" effect, setting `audio.src = segments[0].audio_url`.

## Source of truth audit

| Component | Reads from | Independent fetch? |
|-----------|------------|--------------------|
| Text (`KaraokeText` inside SmartAudioPlayer) | `segments[i].text_content` derived from `passageContent.paragraphs` in `useReadingPassageAudio` | NO — derived from the same hook call as audio |
| Audio player (`useAudioEngine`) | `segments[i].audio_url` from `audioData.segments` | NO — same hook |
| Karaoke (`useKaraoke`) | `segments[i].word_timestamps` from `audioData.segments` | NO — same hook |

All three derive from a single `useReadingPassageAudio(reading.id, reading.passage_content)` call — text, audio URL, and word timestamps land in one `audioData.segments[0]` object. **No independent fetch.**

## Test unit (Phase A.4 — DB query)

- `unit_id`: `00ca3625-46ee-4e38-95da-2255f522aff8` (L5 unit, 2 articles)
- Article A: `db633fd4-6a47-46c9-8013-4aa32a472f03` "Nature's Hidden Networks" — 866 words, audio 419.9 s, word_timestamps count = 866
- Article B: `095aecf4-ed0a-40d8-bda6-77051f8c2d86` "Nature's Architects of Innovation" — 815 words, audio 416.9 s, word_timestamps count = 815

## Per-row data sanity (test unit articles)

| Article id | Title | Words | audio sec | Duration ratio (actual/expected at 2.5 wps) | Plausible? |
|-----------|-------|-------|-----------|---------------------------------------------|------------|
| `db633fd4…` | Nature's Hidden Networks | 866 | 419.9 | 1.21 | YES |
| `095aecf4…` | Nature's Architects of Innovation | 815 | 416.9 | 1.28 | YES |

Both audio durations are plausibly consistent with each row's own text length (1.0×–1.5× of the 2.5 wps estimate is normal narration). Word-timestamp counts match passage word counts. URLs differ between rows. **DB data is not swapped.**

## Cross-pair sanity across all 144 readings

Ran `scripts/audits/reading-text-audio-mismatch/02-cross-pair-check.mjs`:
- 133/144 articles: audio duration matches the article's own text length better than its sibling's (CLEAN).
- 11 articles: audio is somewhat longer than expected (ratio 1.3–1.4× of 2.5 wps), but those are also the rows with broken `word_timestamps` (count = 2 instead of ~600+) — a separate previously-known regen artifact, **not a swapped-audio mismatch**. Plausible explanation: a slower-narrating voice. Not a swap pattern.

Cross-table URL audit (`01-cross-check-audio.mjs`): 0/144 mismatches between `curriculum_readings.passage_audio_url` and `reading_passage_audio.full_audio_url`. URLs are consistent across both tables.

## Diagnosis

The mismatch happens because: **`useAudioEngine`'s "load source" `useEffect` has a stale dependency array `[audioUrl, isMulti]` — it does not react to a `segments` prop change. When the parent passes a new `segments` array (different `audio_url`) without forcing the player to remount, the underlying `<audio>` element's `src` is never reassigned and continues to play the old article's audio.**

`src/components/audio/hooks/useAudioEngine.js:106-125` (the offending hook):

```js
useEffect(() => {
  const audio = audioRef.current
  if (!audio) return
  // … resets state …
  if (isMulti && segments.length > 0) {
    audio.src = segments[0].audio_url   // ← only assigned when isMulti changes or audioUrl changes
    audio.load()
  } else if (audioUrl) {
    audio.src = audioUrl
    audio.load()
  }
}, [audioUrl, isMulti]) // ← segments is missing; comment says "handled separately" but no other handler exists
```

The dep comment claims segments are "handled separately," but the only other place that mentions `segments` writes to a ref (`segmentsRef.current = segments`) — it does **not** reload `audio.src`.

### Why students see the symptom

In the current canonical flow, `ReadingTab.jsx` does wrap ReadingContent in `<motion.div key={reading.id}>`, which **should** remount the entire subtree on article change and sidestep the bug. The bug is latent there — **but** the report ("students are actively frustrated") means it IS triggering for at least some students. The most plausible triggers, given the data is clean:

1. **AnimatePresence `mode="wait"` exit timing.** During the 200 ms exit animation of the old motion.div, framer-motion keeps the old subtree mounted. If the student's browser fires the click handler while the previous audio is still loading and the old player is still in-flight (slow networks, mobile Safari), a transient render cycle can momentarily render the new SmartAudioPlayer in the *old* motion.div's React subtree before the actual remount — and then the new instance hits the stale-deps bug on the next prop update.
2. **Future regressions.** Any change to the parent wrapper that drops or changes the key (e.g., adding a layout wrapper, switching off AnimatePresence) would expose the latent bug.
3. **Hot Module Reload / development edge cases** that preserve the player's state across prop changes.

Either way, the audio engine should be reactive to its `segments` input on its own — the parent's key gymnastics should be a belt, not the only suspenders.

### Bug category

**STALE_INIT** (audio engine's load-source effect doesn't react to its source-prop change), with secondary defensive concerns from STATE_NOT_PROPAGATED (the parent relies entirely on a remount key to "fix" a stale player).

NOT: INDEPENDENT_FETCH (text + audio + karaoke already share one hook), NOT CONTENT_LAYER (DB data is clean), NOT READ_PATH_VARIANT (no personalization variant reads remain).

## Fix plan

Two minimal, surgical changes:

1. **`src/components/audio/hooks/useAudioEngine.js:106-125`** — replace `[audioUrl, isMulti]` with a derived `sourceUrl` value (the URL the engine should actually be playing) and use that as the dep. The effect then reliably re-runs and reassigns `audio.src` whenever the source URL changes, regardless of whether `audioUrl` or `segments` was the input.

2. **`src/pages/student/curriculum/tabs/ReadingTab.jsx:846`** — add an explicit `key={reading.id}` directly on the `<SmartAudioPlayer>` JSX so even if the outer wrapper key is bypassed (future refactor, framer-motion quirk, exit-animation transient), the player itself gets a fresh React instance on every article change.

No DB writes. No schema changes. No data regeneration (none warranted).
