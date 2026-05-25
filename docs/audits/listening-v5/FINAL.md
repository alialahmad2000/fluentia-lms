# Listening Forensic V5 — Final Report

## Why the previous 4 fixes didn't work
They validated the **wrong layer**. "72 files healthy" came from server-side HEAD requests + ffmpeg decode — both prove the *file* is fine, neither exercises **iOS Safari's synchronous-user-gesture requirement for `play()`**. Desktop browsers (lenient autoplay policy) also passed. So every smoke test was green while Ali's iPhone stayed silent. The failure is 100% client-side iOS gesture policy.

## The actual root cause (one sentence)
On iOS Safari the listening player uses `preload="metadata"`, so `audio.readyState` is `< 2` when the user taps play; `togglePlay` therefore took the `readyState < 2` branch that **deferred `play()` to an asynchronous `canplay` listener**, and that deferred `play()` executed outside the user-gesture context — which iOS rejects with `NotAllowedError` (caught and swallowed) — so nothing happened.

## Evidence (not "verified ✓" — actual results)
- **Storage ruled out:** iOS-UA HEAD on a real prod file → `200 · content-type: audio/mpeg · accept-ranges: bytes · access-control-allow-origin: * `; Range `0-1023` → `206`. The files + CORS + MIME are correct for iOS.
- **Surface confirmed:** live `app_config.unit_layout = "v2"` → `UnitContent` → `ListeningTab` → `ListeningSection` → `ListeningPlayer`. The diagnosed player is the one that renders.
- **Mechanism located:** `ListeningPlayer.jsx` lines 288–305 (the `readyState < 2 → addEventListener('canplay', …) → return` deferral) + `preload="metadata"` on line 505.

## What changed (Phase B — Pattern B.1)
`src/components/players/listening/ListeningPlayer.jsx` `togglePlay`: removed the `readyState < 2` deferral; **`play()` is now called synchronously inside the tap handler**. The tap authorizes the fetch and `play()` kicks buffering; `startPlayback` invokes `audio.play()` with no preceding `await`, preserving the gesture context. Buffering UI is still driven by real `playing`/`waiting`/`timeupdate` events. Net diff: +9 / −16 lines. Build clean.

## Verification — honest status
- Shipped to **preview branch `listening-forensic-v5`** (NOT main). Vercel builds a preview URL per push.
- **I cannot certify it on a real iPhone from here.** Headless WebKit has no audio device and treats Playwright `.click()` as a trusted gesture, so it does not reproduce iOS's gesture *rejection* — a "plays" there would be a false negative. Certifying this is exactly what only your iPhone can do.

## Your 60-second confirmation (the only test that counts)
1. Open the **Vercel preview** for branch `listening-forensic-v5` on your iPhone (or, if you prefer, say "merge it" and test prod after deploy).
2. Go to a listening lesson, tap play.
   - **Plays → ** done; reply "merge" and I'll merge `listening-forensic-v5` → main.
   - **Still silent → ** connect iPhone to Mac → Safari → Develop → [your iPhone] → on the page, tap play, and screenshot the **Console** (look for `NotAllowedError` / any red) + the **Network** row for the `.mp3`. Send those — that trace is the last mile of diagnosis I can't get remotely.

## Ongoing protection (after confirmation)
- The repro harness (`scripts/audits/listening-v5/01-repro.cjs`) is committed; once we add a `media-playback-requires-user-gesture` WebKit launch flag it can become a real CI gate. (Documented as a follow-up — not claimed as working iOS proof today.)
- `ListeningPlayer` already logs `play()` failures via `logAudioFailure`; those land server-side for ongoing visibility.

## Bottom line
This is the first pass that (a) ruled out the file/storage layer **empirically with an iOS user-agent**, (b) confirmed the exact rendered surface, and (c) named a specific iOS-only mechanism that explains why desktop passed every prior test. The fix removes that exact anti-pattern. It is on a **preview branch awaiting your iPhone confirmation** — not auto-shipped to prod with a false "verified", which is the pattern that failed four times.
