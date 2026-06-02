# Listening audio: Safari "plays in Chrome, silent in Safari" — ROOT CAUSE + FIX

## The real root cause (after 6 failed attempts that never looked at the file's internals)
The listening player loads `combined.mp3` — a **concatenation of multiple speaker
segments**. Each `combined.mp3` was a single MP3 stream whose frames **switch between
mono and stereo** (one block per concatenated segment): e.g. the L5 file probed as
**12,075 mono frames + 182 stereo frames** interleaved.

- **Chrome / Chromium** reconfigure the audio output when the channel mode changes
  mid-stream → it plays.
- **WebKit / Safari** lock the channel layout from the **first** frame (mono) and go
  **silent / stall** on the differing frames → "press play, nothing".

This is why every prior attempt failed: they investigated transport (CORS, range,
content-type, crossOrigin, eager `load()`, gesture) — all of which probe **clean**
(verified again here: HTTP/2 200, `audio/mpeg`, `accept-ranges`, proper `206` on
`bytes=0-1` and `bytes=0-`, CORS `*`, OPTIONS allows `range`). And the one "headless
WebKit plays it" test used a single **segment** file (`s0_*.mp3`, consistent mono),
NOT the mixed `combined.mp3` the player actually loads.

## Evidence
```
ffprobe per-frame channels on combined.mp3 → distinct values: {1, 2}   ← mixed
probe_score=51 (low), start_time=0.025  ← ffmpeg unsure / non-clean stream
```
Transport probe (Safari UA): HEAD 200 audio/mpeg accept-ranges; Range 0-1 → 206 +
content-range; Range 0- → 206; OPTIONS → 200 allow range. Transport was never the bug.

## Scope
72 listening rows = 27 single-segment monologues (`s0_*.mp3`, uniform by construction) +
45 multi-speaker `combined.mp3`. Initial scan: **31 of 45 combined files were mixed**
(every inconsistent file was a `combined.mp3`; all monologues were already uniform).

## Fix (data)
Re-encoded every inconsistent file to **uniform mono 44.1kHz CBR**
(`ffmpeg -ac 1 -ar 44100 -c:a libmp3lame -b:a 128k -map_metadata -1`) and re-uploaded to
the SAME storage path (HTTP `PUT` with `x-upsert`, `sb_secret_*` key). One config
throughout → Safari decodes it; Chrome unaffected; mono is correct for speech.

- Tooling: `scripts/audits/listening-channel-fix/normalize-listening-audio.cjs`
  (`--apply`; scan-only without the flag; concurrency 2; download-retry; per-file
  post-encode uniformity assertion before upload).
- **Result: 31/31 fixed (30 batch + 1 manual L5), 0 failed.** Final scan of all 45
  combined files: **0 inconsistent remaining.**
- **CDN:** Supabase storage CDN revalidated on overwrite — plain public URLs already
  serve the mono bytes (channels=`1`, no stale `age`). No URL change / cache-bust needed.

## Pipeline hardening (prevent recurrence)
`scripts/audio-v2/lib/concat.cjs` already targets mono (`TARGET_CH=1`), so these 31 were
**legacy** files generated before that hardening. Its decode-verify (`ffmpeg -f null`)
TOLERATES mixed channels, which is how they shipped. Added a **channel-uniformity
assertion** to the verify step: after concat, ffprobe per-frame channels must be a single
value or the build throws — a mixed-mode (Safari-silent) file can never ship again.

## Verification status
- Storage + CDN: 100% uniform mono across all 45 combined files (probed fresh). ✅
- The mixed-channel-mode-in-one-mp3-stream → WebKit-silent behavior is a documented
  Safari limitation; uniform mono is the definitive fix. Real-device confirmation =
  Ali on Mac Safari after a hard refresh (his local HTTP cache holds the old file for
  up to its 1h max-age). The `?debug=audio` overlay (prompt 15) will now show
  currentTime advancing with sound.
