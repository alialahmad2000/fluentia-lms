# Listening Section — Phase C Verification

Date: 2026-05-25
Branch: `megafix-vocab-listening-reading`

## Root cause (Phase A)
All 72 `curriculum_listening` rows are healthy (HEAD 200, `audio/mpeg`, decode-clean, public, Range-enabled, 0 signed URLs). **No audio regeneration needed → 0 ElevenLabs chars spent.** The "press play, nothing happens" symptom is a **player bug** in `src/components/players/listening/ListeningPlayer.jsx`, confirmed against the existing `audio_telemetry` table (58 real failures):
1. `code=0` AbortError (~67%, mostly Mac/iOS Safari) — load/play race + benign aborts surfaced as hard errors.
2. `code=4` SRC_NOT_SUPPORTED (iOS/iPad) — `play()` called before the element buffered enough.
3. `code=-1` watchdog false-positives (Windows Chrome, `readyState:4`) — 2s watchdog too aggressive, fired on slow starts.

## Fix
Frontend-only, `ListeningPlayer.jsx`:
- Load effect keyed on `[audioUrl, listeningId]` only; `onTimeUpdate` moved to a ref so parent re-renders never re-fire `audio.load()` (which aborts in-flight `play()`).
- `MEDIA_ERR_ABORTED` (code 1) logged but never shows the red error card (benign source-swap).
- `togglePlay` gates on `readyState >= 2`; if not ready, shows a buffering spinner and waits for `canplay` instead of calling `play()` on an unready element (kills iOS SRC_NOT_SUPPORTED).
- `AbortError`/`NotAllowedError` from `play()` are logged but treated as retryable — no scary error card.
- Watchdog now requires `readyState >= 3` (HAVE_FUTURE_DATA) AND not buffering before flagging silent failure; window widened 2s→3.5s. Added `waiting`/`playing` listeners + `isBuffering` state.
- Play button shows a spinner while buffering (`aria-busy`) — never a dead-looking button.

| Check | Pass/Fail | Notes |
|---|---|---|
| 0 rows NEVER_GENERATED | PASS | 72/72 have audio_url |
| 0 rows HAS_URL_404 | PASS | all HEAD 200 |
| 0 rows HAS_URL_CORRUPT | PASS | 72/72 decode-clean (Phase A) |
| NULL audio_url → "coming soon" badge | PASS (pre-existing) | `ListeningAudioComingSoon` already mounted in `ListeningSection.jsx`; 0 null rows currently |
| Load error → visible error UI + retry | PASS | `ErrorCard` for codes 2/3/4 + retry/full-refresh; abort/benign no longer false-alarm |
| No silent failure path | PASS | abort/notallowed logged; watchdog hardened; buffering spinner shown |
| Telemetry writes | PASS (pre-existing) | `audio_telemetry` table active; failures logged with readyState/code |
| Smoke `scripts/qa/listening-smoke.cjs` exits 0 | PASS | 5/5 healthy |
| Babel parse | PASS | |
| React hooks order (all hooks before early return) | PASS | `if (!audioUrl) return null` is after all hooks |

## Notes / deferred
- Telemetry success event (`first_play` for a real denominator) — deferred. The prompt proposed a NEW `listening_load_telemetry` table; per the DB-strategy rule (branch-first, Ali promotes) I did not create a new table. The existing `audio_telemetry` already captures failures with `readyState`, which is sufficient to monitor the fix.
- No new player rewrite — surgical hardening only, per the "working simple player > broken sophisticated one" rule.
