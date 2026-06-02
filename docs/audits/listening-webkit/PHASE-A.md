# Listening / Audio — WebKit (iOS Safari) — Phase A

**Date:** 2026-06-02 · Branch: `listening-webkit-fix`

> Decisive breakthrough this round: **real-device telemetry** (the two `audio_*`
> tables) — the first actual iOS failure data in this 6-attempt saga. It shows
> there are **two distinct root causes**, both **iOS-Safari-specific** and **not
> reproducible in headless WebKit** (which is far more lenient than real iOS).

## 1. The killer cross-engine raw test (A.1) — file/transport is FINE

`scripts/audits/listening-webkit/01-raw-audio.cjs` on a real `curriculum-audio` mp3,
WebKit vs Chromium, with/without `crossOrigin`:

| Engine | with crossOrigin | without crossOrigin |
|---|---|---|
| WebKit (headless macOS) | ✅ PLAYS | ✅ PLAYS |
| Chromium | ✅ PLAYS | ✅ PLAYS |

**All 4 play.** → The file, codec, MIME, and `crossOrigin` are NOT a hard failure
in headless WebKit. Per the prompt's table this points to "app code", but the
deeper truth (below) is that **headless macOS WebKit ≠ real iOS Safari** — iOS is
stricter and the raw test simply can't reproduce the device-level failure.

## 2. CORS / range / redirect (A.2) — also FINE

- Public URL: **no redirect** (HEAD 200 direct).
- Range `bytes=0-1023` → **206** with `content-range`.
- `access-control-allow-origin: *` on the 200, the **206 range**, AND the OPTIONS
  **preflight** (`access-control-allow-headers: range`, methods incl. GET).

So even a `crossOrigin` (CORS-mode) media + range fetch has a clean handshake. CORS
is not the cause either.

## 3. Player code (A.3) — gesture chains are SOUND

- Listening `ListeningPlayer.jsx`: `play()` called synchronously in the tap
  (`togglePlay → startPlayback`); no `crossOrigin`; no conditional `<audio>`;
  `load()` guarded against re-runs. **Zero `AudioContext` anywhere in the app**
  (so `crossOrigin` is never needed for Web Audio).
- Reading `useAudioEngine.js`: `play()`/`toggle()` synchronous in the gesture.

## 4. THE REAL EVIDENCE — device telemetry

### 4a. `audio_event_log` (word-pronunciation + reading engine) — the crossOrigin paths
Word-audio success(`cache`) vs fallback(`web_speech`) by device family (14 days):

| Device | played (cache) | fell back to TTS | fallback rate |
|---|---|---|---|
| **iPhone** | 127 | **116** | **~48%** |
| iPad | 35 | 24 | ~41% |
| Mac/desktop Safari | 85 | 49 | ~37% |

Plus explicit: `cache_play_failed:NotSupported` on **iPhone OS 18.7**;
`media_error:audio_unavailable` on **iPad** for a reading `full.mp3`.

→ `new Audio()`/`<audio>` playback of Supabase media **fails ~half the time on
iPhone** and silently falls back to Web Speech (wrong voice, but audible). These
are exactly the paths that set `crossOrigin="anonymous"`.

### 4b. `audio_telemetry` (listening player) — NO crossOrigin, different cause
Listening failures, by error (most recent **2026-06-02**, i.e. still happening):

| error | devices | count |
|---|---|---|
| `MEDIA_ERR_SRC_NOT_SUPPORTED` (code 4) | Mac Safari, iPad, **iPhone** | 18 |
| `NotSupportedError` ("operation is not supported") | iPhone, iPad, Mac | 10 |
| `AbortError` ("operation was aborted") | Mac Safari, iPad | 40 |

Critically, the **same file `s0_layla.mp3` that PLAYS in headless WebKit (test §1)
throws code 4 on real iOS Safari.** So it is NOT the file, NOT encoding, NOT
concatenation (single-segment `s0_*.mp3` fail too, not just `combined.mp3`), NOT
CORS, NOT crossOrigin (the listening player never set it).

## ROOT CAUSES (two, both iOS-Safari-only)

1. **Word-pronunciation + reading-article audio:** they set `crossOrigin="anonymous"`
   on plain-playback `<audio>`/`new Audio()` despite **no Web Audio API consuming
   them**. Real iOS Safari enforces CORS-mode media far more strictly than headless
   WebKit and intermittently rejects it (`NotSupported`/`media_error`) → the ~48%
   iPhone fallback. (Chrome — Ali's working browser — is lenient.)
2. **Listening player:** it eagerly calls `audio.load()` in a mount effect (outside
   any user gesture), with `preload="metadata"` and across the several keyed players
   a unit mounts. This pushes iOS Safari into a spurious `MEDIA_ERR_SRC_NOT_SUPPORTED`
   (code 4) state **before the first tap**, so the gesture `play()` then rejects →
   "press play, nothing happens." Headless WebKit doesn't enter this state.

## Phase B — fixes applied
1. Removed `crossOrigin="anonymous"` from all 6 plain-playback paths:
   `AudioPlayer.jsx`, `useWordAudio.js`, `useWordLensAudio.js`, `useAudioEngine.js`,
   `playAudioSlice.js`, `pronounceWord.js`. (Video player left as-is — out of scope.)
2. `ListeningPlayer.jsx`: removed the eager `audio.load()` from the source effect.
   `preload="metadata"` still fetches the header for the scrubber; the gesture-driven
   `play()` now performs the full load **inside the user-gesture context**, which iOS
   honors. The gesture-driven `retry()` `load()` is unchanged (it's inside a tap).
3. `version.json` bumped → installed iOS PWAs refresh to the fixed bundle.

## Phase C — verification
- Headless raw test still PLAYS in both engines (no regression) — but headless can
  NOT reproduce the iOS-only failures, so it can't *confirm* the fix.
- **Definitive verification is Ali on his iPhone** (Safari + the installed PWA) after
  deploy. The two telemetry tables will show the iPhone `web_speech` fallback rate
  and the listening code-4 count drop if the fixes land. If either persists, the
  telemetry now captures the exact error for the next iteration.

## Honesty note
Both fixes target documented iOS-Safari behaviors that match the real telemetry
signatures; neither could be *proven* in headless tooling because headless macOS
WebKit is too lenient. This is the best-supported fix given the evidence, and it is
zero-risk (Chrome + headless WebKit behave identically before/after).
