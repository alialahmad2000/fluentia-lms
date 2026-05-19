# Phase A — Listening Audio Diagnosis

Date: 2026-05-19

## Inventory

- **Total `curriculum_listening` rows:** 72
- **`audio_url` populated:** 72/72 (100%)
- **`transcript` populated:** 72/72 (100%)
- **One listening row per unit** (72 units × 1 row = 72). No multi-player stacking risk.
- **`is_published`:** 0/72 → all `false`. (Doesn't gate reads — the field is informational.)

## Categorization (HEAD + Range + MIME + duration sanity)

`scripts/audits/listening-fix/02-categorize.cjs` runs HEAD, GET Range, content-type and Content-Length-vs-duration ratio against every audio file:

| Category | Count |
|----------|-------|
| HEALTHY | **71** |
| RANGE_ERROR (transient) | 1 |
| BROKEN_URL | 0 |
| WRONG_MIME | 0 |
| NO_RANGE | 0 |
| MISSING_AUDIO | 0 |

Re-probing the single RANGE_ERROR row (`546730cd-2a01-4d69-96ac-673610a25524`, L3 "Dr Hassan on Urban Farming Solutions") with a longer timeout returned **HEAD 200 / audio/mpeg / 2.95 MB / accept-ranges: bytes** and **GET Range 0-65535 → 206**. The audit miss was a transient network blip, **not a real bug**. All 72 audio files are healthy at the storage layer.

## Suspected row Ali hit

Ali didn't specify the row. Best guess: an L1 row (lowest-level student-flow entry point). Spot-checked L1 U1 listening `2a2a3ca3-…` — HEAD 200, audio/mpeg, range 206. Audio file is fine. The "press play, heard nothing" symptom is **not a file-level bug.**

## Player code path audit

File: `src/components/players/listening/ListeningPlayer.jsx` (478 lines). What's currently in place:

| Concern | Current state | OK? |
|---------|--------------|-----|
| Event listeners attach BEFORE `el.src = audioUrl` | YES (lines 83-89) | ✅ |
| `useEffect` depends on `[audioUrl]` (reactive) | YES (line 94) | ✅ |
| State reset on URL change | YES (lines 64-67) | ✅ |
| `playsInline` on `<audio>` | YES (line 183) | ✅ |
| `preload="metadata"` | YES (line 182) | ✅ |
| `play()` wrapped in try/catch with visible error surface | YES (lines 131-134 + error UI lines 453-470) | ✅ |
| `play()` called synchronously from `onClick` (iOS Safari user-gesture rule) | YES (`onClick={toggle}` → `toggle` calls `el.play()` synchronously) | ✅ |
| Audio cleanup on unmount / URL change | YES (return cleanup lines 90-93) | ✅ |
| Conditional render when `audio_url` is null | Player is GUARDED in parent (`ListeningSection.jsx:132`: `{!audioLoading && listening.audio_url && <ListeningPlayer>}`) so player never mounts with null URL. **But** no "audio coming soon" fallback is rendered in its place — section just goes silent. | ⚠️ (defensive gap) |
| Force remount on listening item change | `<ListeningSection key={listening.id}>` at `ListeningTab.jsx:68` cascades to a fresh ListeningPlayer instance | ✅ |

## ListeningSection.jsx behaviors

- `transcriptHidden = useState(true)` — **transcript HIDDEN by default ✅** (matches Phase D requirement)
- "إظهار النص" / "إخفاء النص" toggle exists at line 86 ✅
- Section header + audio type label ✅
- Player guard: `{!audioLoading && listening.audio_url && <ListeningPlayer>}` ✅
- No "audio coming soon" fallback for null `audio_url` ⚠️

## Why Ali likely "heard nothing"

The data is clean. The code path is correct. The most plausible explanations that I can verify programmatically:

1. **Stale build / PWA caching.** If Ali was on a PWA-installed instance from before a recent listening-related deploy, his cached bundle might have an older buggy ListeningPlayer. Auto-handled by `UpdateBanner` on the next visit. Not actionable in this run beyond bumping `public/version.json`.
2. **Volume / hardware mute** — out of code scope.
3. **A latent bug in the player code path that doesn't manifest on every load** — speculative, no specific suspect.

## Architectural verdict (irrespective of "audio doesn't play")

The current player works correctly when given a healthy audio_url. The prompt's bigger ask is to:
1. Add the "audio coming soon" fallback for the null case (defensive — even though currently 0/72 are null)
2. Redesign the visual treatment (Phase D — hero element, premium feel)
3. **Build the drift-protection foundation (Phase C)** so the L1 reading regression that happened on 2026-05-19 (commit `f911750`) cannot repeat for listening

These three deliverables are the substance of this prompt. The "audio doesn't play" symptom is real for Ali but unreproducible by automated testing — every diagnostic shows healthy data and a correct player. I'll apply the Phase B canonical-pattern polish (which can only help) and ship the architectural fixes (C + D) that prevent the next class of bug.

## Fix plan

- **B.1** Conditional render: add `<ListeningAudioComingSoon>` fallback to `ListeningSection.jsx` for when `audio_url` is null. (Defensive — covers future MISSING_AUDIO rows.)
- **B.2** Bump `public/version.json` so cached PWAs see the UpdateBanner.
- **C.1–C.7** Drift-protection foundation: `source_text_hash` column + hash util + generator patch + backfill + `audio-drift-check.cjs` gate + `predeploy:audio-drift` npm script + admin-only DriftChip component.
- **D.1–D.7** ListeningPlayer redesign per the Phase D spec (hero play button, color-coded speaker ticks, transcript-toggle, speed popover, mobile responsive).
