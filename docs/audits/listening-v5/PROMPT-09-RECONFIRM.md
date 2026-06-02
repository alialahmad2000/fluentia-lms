# Listening V5 — Prompt 09 Surface 4: read-only re-confirmation

**Date:** 2026-06-02 · **Verdict:** No code change needed. The fix is already on production `main` and the audio-delivery layer is healthy.

Prompt 09 re-bundled the listening forensic as "5th attempt." Phase A (read-only) confirmed the V5 fix (prompt 06) is already shipped, merged, and live — so per the prompt's own §4A.7 ("if the matrix already passes, stop and document"), we stop here and do not re-patch.

## What was verified (read-only)

### 1. The fix is on `main` (it was NOT unmerged)
- Commits `202366e` *(fix(listening): iOS gesture-chain — synchronous play() on tap)* and `7a848c6` *(docs: shipped to prod — verified live)* are both **ancestors of `origin/main`** (`git merge-base --is-ancestor … origin/main` → true for both).
- This contradicted the initial hypothesis that "the fix never reached production." It did. The genuinely-unmerged branch was `dashboard-v2-letter` (emergency admin-students fix + V2 letter), which this session merged to `main` separately.

### 2. Player code path is the correct synchronous-play version
`src/components/players/listening/ListeningPlayer.jsx` → `togglePlay` calls `startPlayback(audio)` **synchronously inside the click handler** (no `await` before it), preserving the iOS user-gesture context. The in-file comment documents the exact prior root cause (deferring `play()` to an async `canplay` listener when `readyState < 2`, which is always true on the first iOS tap with `preload="metadata"` → `NotAllowedError`, swallowed). That anti-pattern is gone.

### 3. Audio delivery (CORS / MIME / range) is healthy under iPhone Safari
Tested a real `curriculum-audio` file with an `iPhone OS 17.5 / Version/17.5 Mobile Safari` UA + `Origin: https://app.fluentia.academy`:

| Check | Result |
|---|---|
| HEAD status | `200` |
| `content-type` | `audio/mpeg` ✓ (not octet-stream) |
| `accept-ranges` | `bytes` ✓ (iOS needs range requests) |
| `access-control-allow-origin` | `*` ✓ |
| `content-length` | present ✓ |
| Range `bytes=0-1023` | `206 Partial Content`, `content-range: bytes 0-1023/…` ✓ |

Bucket `curriculum-audio` is **public**, `allowed_mime_types` includes `audio/mpeg`/`audio/mp3`. No signed-URL async step (which would break the gesture chain). Nothing to fix at the storage/CORS layer.

## If audio still fails on Ali's iPhone after deploy

The fix and the delivery layer are both correct, so a remaining failure is almost certainly a **stale PWA bundle** cached on the device (a recurring pattern in this repo's history). Remedies, in order:
1. This PR bumps `public/version.json` → the in-app `UpdateBanner` flow prompts cached clients to refresh on next load.
2. Manual: hard-refresh the page, or remove + reinstall the PWA from the home screen.
3. Only if it *still* fails after a confirmed-fresh bundle: create a test-student account, store creds in `.env.test-student`, and run the WebKit device matrix from prompt 06/09 §4A.5 to capture the live `<audio>` element state + console.

No test-student credentials exist in this environment, so the production-login WebKit matrix was intentionally **not** run (and isn't needed given the above).
