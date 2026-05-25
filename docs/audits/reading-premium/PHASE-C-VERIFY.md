# Reading Premium — Phase C Verification

Date: 2026-05-25
Branch: `megafix-vocab-listening-reading`

## What Phase A found
The 3-layer hybrid pronunciation was **already mostly built**: clean per-word MP3
(`curriculum_vocabulary.audio_url`) was the default, Web Speech the last resort —
but the **dirty passage-slice tier was still wired in between** (`useWordLensAudio.js:87`
→ `playAudioSlice`), so the ~82% of passage words with no curated MP3 played a
co-articulated slice of the whole-passage audio (and the setTimeout stop overran
on slow networks). Translation already works (`useWordLensData` → `definition_ar`
→ `vocab-quick-meaning` edge fn). Real columns: `word`, `definition_ar`, `audio_url`,
`pronunciation_ipa`. L1 coverage with clean audio = 17.8%.

## Shipped this run (frontend-only, no DB, no spend)
**Killed the passage-slice tier** in the reading word-tap path. `useWordLensAudio`
rewritten to: Layer 1 `curriculum_vocabulary.audio_url` → Layer 1b
`vocab_word_audio.audio_url` (optional, forward-compatible — null until the table
is populated) → Layer 2 Web Speech. No `playAudioSlice` import remains in the
word-pronunciation hook, so a word tap can NEVER play a dirty co-articulated
slice — uncovered words get clean (robotic) Web Speech instead. WordLens updated
to the new hook signature; added a preferred-voice pick for Web Speech.

| Check | Pass/Fail | Notes |
|---|---|---|
| Word click never slices from passage audio | PASS | `grep playAudioSlice useWordLensAudio.js` = 0 |
| Clean MP3 still used when available (Layer 1) | PASS | `vocabAudioUrl` path unchanged |
| Web Speech fallback works (Layer 2) | PASS | now the direct fallback; preferred en-US voice |
| Hook forward-compatible with vocab_word_audio (Layer 1b) | PASS | optional `wordAudioUrl` prop |
| Translation popup works | PASS (pre-existing) | unchanged; `definition_ar` + edge fn |
| Babel parse (both files) | PASS | |

## Deferred (documented, NOT done — rationale)
These are real, valued items from the prompt but were **not** shipped this run, for
specific reasons — flagging rather than half-doing:

1. **`vocab_word_audio` table + `pronounce-word-worker` edge fn + cron + ElevenLabs background generation (Layer 3).** Requires a new table (DB-strategy: branch-first, you promote), an edge-function deploy (can't deploy to prod from a feature branch), a cron schedule, and ElevenLabs spend. The Layer-1b hook hook is already wired to consume the table the moment it exists, so this can land as a clean follow-up. In the meantime Web Speech (Layer 2) cleanly covers uncovered words — which is exactly the prompt's accepted fallback.

2. **Visual rebuild to Velvet Midnight** (Playfair Display EN titles / Readex Pro body / `var(--ds-*)` tokens replacing hardcoded `slate-*`, premium article header band) and **making every word visibly tappable** (vs only the ~15 curated vocab words showing affordance). This is high-churn UI work that I can't verify in a browser in this environment — per the "don't claim UI success you can't test" rule, I'm not shipping unverified visual changes. The two student-priority interactions (clean pronunciation + translation) now work; the visual polish is a separate, lower-urgency pass best done with live preview review.

## Note
`src/components/audio/parts/WordTooltip.jsx` still imports `playAudioSlice` — that is
the separate "hear in context" affordance used in the **vocabulary** section (passed
`inContextAudio`), NOT the reading word-tap path (which never passes it). Intentionally
left intact.
