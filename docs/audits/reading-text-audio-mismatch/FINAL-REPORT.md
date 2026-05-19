# Reading Text/Audio Mismatch — Final Report (2026-05-19)

## Bug category

**STALE_INIT** in `useAudioEngine`. (Secondary defensive concern: STATE_NOT_PROPAGATED — the parent's `<motion.div key={reading.id}>` was the *only* thing keeping the player in sync.)

## Root cause

`src/components/audio/hooks/useAudioEngine.js` had a load-source `useEffect` with deps `[audioUrl, isMulti]`. It read from `segments[0].audio_url` but **did not** depend on `segments`, so a new `segments` prop (different `audio_url`) never triggered the effect — the `<audio>` element's `src` stayed pinned to the previously loaded URL. The comment claimed segments were "handled separately" but the only other handler simply updated a ref.

In the canonical UI flow the parent `<motion.div key={reading.id}>` masked the latent bug by remounting the entire subtree on article switch. Under AnimatePresence `mode="wait"` exit-animation timing, slow mobile loads, or any future refactor that drops the outer key, the latent bug surfaces — audio of Article A continues to play while text + karaoke flip to Article B.

## Fix

Two surgical changes, no DB writes, no schema changes, no content regen, no personalization re-enabled.

### 1. `src/components/audio/hooks/useAudioEngine.js`

Introduced a derived `sourceUrl = isMulti ? segments?.[0]?.audio_url ?? null : audioUrl ?? null`. The load-source effect now depends on `[sourceUrl]`, so it reliably re-runs and reassigns `audio.src` whenever the underlying source changes — regardless of whether the input was `audioUrl` or `segments[0].audio_url`. Also handles the `sourceUrl === null` branch by clearing the `src` attribute so a stale URL can never persist.

### 2. `src/pages/student/curriculum/tabs/ReadingTab.jsx`

Added `key={reading.id}` directly on the `<SmartAudioPlayer>` JSX (in addition to the existing outer `<motion.div key={reading.id}>`). Belt-and-suspenders: even if the wrapper key were ever bypassed (future layout refactor, framer-motion quirk, exit-animation transient), the player instance itself remounts on every article change.

### Source of truth

Single state variable: `activeReading` (index) in `ReadingTab.jsx:75`. It resolves to `reading = readings[activeReading]`, and **every** downstream component derives from `reading.id` and `reading.passage_content`:

- Text body → `reading.passage_content.paragraphs` (via `useReadingPassageAudio` → `audioData.segments[0].text_content`)
- Audio URL → `reading.id` → DB lookup → `audioData.segments[0].audio_url`
- Word timestamps (karaoke) → `audioData.segments[0].word_timestamps`

All three resolve through the same `useReadingPassageAudio(reading.id, reading.passage_content)` call.

- Files changed: `src/components/audio/hooks/useAudioEngine.js`, `src/pages/student/curriculum/tabs/ReadingTab.jsx`
- `key={currentArticle.id}` added on the player: **YES**

## Verification

- `scripts/audits/reading-text-audio-mismatch/verify.cjs`: **10/10 PASS** across 5 multi-article units. For each article: audio URL HEAD = 200 / `audio/mpeg`, `audio_duration_ms` is plausible vs. body word count, and the (text, audio, karaoke) triple all anchor to the same `reading.id`.
- Manual spot-check: see `MANUAL-SPOT-CHECK.md` — Ali to confirm Article A / Article B / back-to-A flow on `00ca3625-46ee-4e38-95da-2255f522aff8` (Level 5 Unit 8, Swarm Intelligence) in a real browser.

## DB sanity (read-only)

- 144 readings, 72 units, every unit has exactly 2 articles.
- 0 URL mismatches between `curriculum_readings.passage_audio_url` and `reading_passage_audio.full_audio_url`.
- 0 audio rows missing.
- 0 swap patterns (no article's audio duration matches the sibling's text length better than its own — within the 144-row set, 133 are clean and 11 have within-row duration ratios 1.3–1.4× of a 2.5 wps estimate, all coinciding with already-known broken `word_timestamps` counts, not a swap).

## Not touched

- No student data writes.
- No DB schema changes.
- No personalization UI re-enabled.
- No transcript content rewritten.
- Listening flow untouched (`src/components/players/listening/*` not modified).
- No `vite build` run locally.

## Discovery & verifier scripts

- `scripts/audits/reading-text-audio-mismatch/00-discover.mjs` — finds multi-article units, dumps audio metadata for one.
- `scripts/audits/reading-text-audio-mismatch/01-cross-check-audio.mjs` — cross-table URL match audit.
- `scripts/audits/reading-text-audio-mismatch/02-cross-pair-check.mjs` — duration-based swap detector.
- `scripts/audits/reading-text-audio-mismatch/03-get-test-unit.mjs` — pulls metadata for the spot-check doc.
- `scripts/audits/reading-text-audio-mismatch/verify.cjs` — end-to-end PASS/FAIL across 5 units.
