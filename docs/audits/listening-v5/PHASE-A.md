# Listening Forensic V5 — Phase A

Read-only forensic. Evidence for each layer, then the root-cause sentence and an honest statement of what the harness can and cannot prove.

## A.1 — Surfaces inventoried
Live student listening chain (verified):
- Route `/student/curriculum/unit/:unitId` → `UnitContentRouter`
- `UnitContentRouter` renders `UnitContentV3Wrapper` only when version === 'v3'; otherwise `<UnitContent />`. **Live `app_config.unit_layout = "v2"` → falls through to `UnitContent`.**
- `UnitContent` tab `{ id:'listening', label:'الاستماع' }` → `ListeningTab` → `ListeningSectionUI` (`components/players/listening/ListeningSection`) → **`ListeningPlayer`** (`components/players/listening/ListeningPlayer.jsx`).
- **Hypothesis #6 (wrong surface) ruled out** — the player I diagnosed is the one that actually renders. (Other players exist — `ListeningAudioPlayer.jsx`, IELTS `*.legacy.jsx` — but they are not on this route.)

## A.2 — Service worker
- `vite-plugin-pwa` with `registerType: 'autoUpdate'` (vite.config.js) → generates `dist/sw.js`; plus `public/push-sw.js` (push only).
- `ListeningPlayer` already ships a `fullRefresh()` (clears `caches` + unregisters SWs) behind its error card. Stale-SW is a *possible* contributor for clients on an old bundle, but is not the primary mechanism (see A.4). Not the root cause.

## A.3 — Storage / CORS / MIME (EMPIRICALLY RULED OUT)
Bucket `curriculum-audio`: public, mime allowlist includes `audio/mpeg`.
HEAD on a real file with **iOS Safari UA + Origin: https://app.fluentia.academy**:
```
HTTP/2 200
content-type: audio/mpeg          ✓ (not application/octet-stream)
content-length: 1504279
accept-ranges: bytes              ✓ (iOS range requests honored)
access-control-allow-origin: *    ✓
cache-control: no-cache
```
Range request `bytes=0-1023` → **206** ✓.
**Verdict: storage/CORS/MIME are correct for iOS. Hypotheses #2 and #3 ruled out empirically.**

## A.4 — Player code path (ROOT CAUSE)
`src/components/players/listening/ListeningPlayer.jsx`:
- `<audio ref={audioRef} preload="metadata" playsInline ... />` (line 505). `preload="metadata"` loads duration but not playable audio data, so on iOS Safari `readyState` stays **< 2 (HAVE_CURRENT_DATA)** until a real play attempt inside a gesture.
- `togglePlay` (lines 278–305):
  ```js
  if (audio.readyState < 2) {                 // ALWAYS true on iOS first tap (preload=metadata)
    setIsBuffering(true)
    const onCanPlay = () => { ...; startPlayback(audio) }   // play() deferred to async event
    audio.addEventListener('canplay', onCanPlay)
    audio.load()
    return                                     // <-- returns WITHOUT calling play() in the gesture
  }
  startPlayback(audio)                         // synchronous path only when readyState >= 2
  ```
- `startPlayback` → `await audio.play()` (line 219). When reached via the `canplay` listener, this runs **outside the user-gesture context**.
- iOS Safari requires `play()` to be called synchronously within the user-gesture handler. The deferred `play()` is rejected with **NotAllowedError**, which the catch (lines 252–262) treats as benign — `setIsPlaying(false)` + log, **no error card**. Result: tap → nothing.
- On desktop Chrome / Android Chrome the autoplay policy is lenient and/or `readyState` reaches 2 quickly, so playback works there — which is why every prior server-side smoke test (HEAD + ffmpeg) and desktop check passed while Ali's iPhone failed.

**Hypotheses #1 (gesture chain) = confirmed mechanism. #4 (signed URL) N/A — public bucket, no signing. #7 (audio element null) N/A — element rendered unconditionally on mount.**

## A.5 — Repro harness (honest limitation)
`scripts/audits/listening-v5/01-repro.cjs` (Playwright WebKit iPhone 13 + Chromium desktop, real prod, real student `mock-test-a1`):
- Login ✓ and unit navigation ✓ (lands on `/student/curriculum/unit/<id>`).
- Could not complete an automated play-tap snapshot in this pass: the listening-tab locator needs more iteration, AND — more fundamentally — **headless WebKit cannot faithfully reproduce iOS Safari's autoplay-gesture *rejection***: it has no audio output device, and Playwright's `.click()` is always a trusted gesture, so a deferred `play()` is not rejected the way real iOS rejects it. A "PLAYS" in this harness would be a **false negative** and must not be treated as proof the real device works. This is exactly the "wrong layer" trap that made the previous 4 smoke tests misleading.

## ROOT CAUSE (one sentence)
On iOS Safari the listening player uses `preload="metadata"`, so the `<audio>` element's `readyState` is `< 2` when the user taps play; `togglePlay` therefore takes the `readyState < 2` branch that **defers `play()` to an asynchronous `canplay` listener**, and that deferred `play()` runs outside the user-gesture context — which iOS Safari rejects with `NotAllowedError` (caught and swallowed) — so playback never starts and the student sees nothing happen.

## Why the previous 4 fixes missed it
They validated the **server/storage layer** (HEAD 200 + ffmpeg decode) and/or desktop browsers — neither of which exercises iOS Safari's synchronous-gesture requirement. The failure is purely client-side iOS gesture policy; the audio files themselves are fine (A.3 proves it).

## Phase B plan (Pattern B.1 — synchronous play in the gesture)
1. In `togglePlay`, **call `audio.play()` synchronously on every tap** (remove the `readyState < 2` deferral). On iOS the tap authorizes both the load and the playback; calling `play()` triggers the fetch itself. Keep the catch to surface genuine decode errors.
2. Keep `audioRef` + listeners attached on mount; leave `preload="metadata"` (or bump to `auto`) but never gate `play()` on readyState.
3. Surface real `play()` rejections (decode/network) in the existing error card; do NOT swallow them silently.

## Honest verification limit
Final proof that real iOS Safari now plays requires testing on the device (or a Safari Web Inspector trace from the iPhone). The harness here cannot certify it. See FINAL.md for the 60-second Web-Inspector confirmation steps for Ali.
