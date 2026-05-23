# Phase 0 — Audio Files Diagnosis

**Date:** 2026-05-23
**Latest revision:** correction after deeper per-frame audit

---

## Verdict: CONFIRMED — file pathology in 31/72 listening files

> ⚠️ **Correction notice (2026-05-23, second pass):** an earlier revision of this
> file concluded REJECTED based on `ffprobe -show_format` + `ffmpeg -f null -`.
> Both tools tolerate per-frame metadata changes. A deeper audit using
> `ffprobe -show_frames` (per-frame inspection) found a real pathology that
> the surface-level probe missed. The REJECTED commit (`9c7287d`) has been
> superseded by this revision.

---

## The real pathology: midstream channel-count change

`audio_telemetry` row #1 (production failure, Chrome 148 on Windows, L2 listening row `896ab711-ea14-47bc-9e36-f4d09931ffab`):

```
error_code: 3  (MEDIA_ERR_DECODE)
error_message: "PipelineStatus::PIPELINE_ERROR_DECODE: Unsupported midstream
                configuration change! Sample Rate: 44100 vs 44100, Channels: 2 vs 1"
```

This message is Chromium's decoder refusing an MP3 in which channel count changes
mid-file. Per-frame audit of the failed fixture:

- Total frames: **4,604**
- 1-channel (mono) frames: **4,448 (96.6%)**
- 2-channel (stereo) frames: **156 (3.4%)** — interleaved across the timeline

The mono and stereo frames are NOT contiguous (e.g. "first half mono, second
half stereo"). They're scattered. Each transition between channel counts is a
decoder boundary. iOS Safari and Chromium both reject these boundaries.

## Reproduction-shape match

Ali's original observation: "Audio plays a few seconds, stops. Click anywhere
on the timeline → plays a few seconds → stops again."

This is the exact behavior expected from midstream channel-count changes:
the decoder plays the run of frames in one config, hits the first boundary
to a different channel count, errors out and stops. The user seeks → browser
loads frames around the new position → plays until the next boundary → stops
again. Repeat.

## Per-file scan results (full 72 production files)

| Group | n | midstream change | clean | broken rate |
|---|---|---|---|---|
| Single-speaker (monologue + lecture) | 28 | **1** | 27 | 3.6% |
| Multi-speaker (dialogue + interview) | 44 | **30** | 14 | 68.2% |
| **TOTAL** | **72** | **31** | **41** | **43.1%** |

### The one single-speaker "broken" file
`674ff56a-0738-4683-aa7a-60b30f22e921` (lecture, L4 U?): 11,429 mono frames + 13
stereo frames. The 13 stereo frames are likely a concat-stitch artifact at a
segment boundary. Pathological but tiny.

### Multi-speaker pattern
Every broken multi-speaker file shows the same pattern: ~95-98% of frames are
mono, ~2-5% are stereo, scattered. The stereo frames likely come from the
original ElevenLabs segments that were stereo by default, while other segments
were rendered as mono. The TTS concat pipeline did not normalize channel count
before muxing them together.

## Why the surface probe missed this

- `ffprobe -show_format` reports a single channel count from the FIRST frame.
- `ffmpeg -i ... -f null -` resamples internally and accepts midstream changes.
- The Xing/Info header is correct and present. The MP3 IS technically valid.
- Browsers are stricter than ffmpeg. Chromium and Safari both reject midstream
  config changes — the decode pipeline can't recover.

The discriminating tool is `ffprobe -show_frames` with `-show_entries
frame=channels` and unique-count aggregation. That's what `scripts/audio-fix/
07-midstream-channel-audit.cjs` and `08-single-speaker-frame-audit.cjs` do.

## Why `s0_nadia.mp3` played cleanly today

The fixture I used in the first pilot (`2992edc4-...s0_nadia.mp3`) is a
SINGLE-SPEAKER monologue. Single-speaker files have only one speaker's
encoder output; they don't need concat normalization; they're uniform-mono
throughout. My audit confirms: 0/28 single-speaker files have midstream
issues (other than the one lecture). So my pilot was on a clean file and was
never going to reproduce Ali's bug. The seek-stop pattern Ali observed must
have been on one of the 30 broken multi-speaker files; without specific URL
provenance, we can't pinpoint which one without retesting.

## What still passes the previous probes

The 41 clean files (27 single-speaker + 14 multi-speaker) still pass every
test I ran. Their channel count is uniform end-to-end. They are NOT in need
of re-encoding for THIS reason. Whether to re-encode them for normalization
hygiene is a separate decision.

## Next: Phase 1 pilot, then targeted batch

1. Re-encode the `896ab711-...` fixture (the file telemetry caught Chromium
   refusing) with `-ac 1` to force uniform mono. Upload to temporary path.
2. Surface URL to Ali. Wait for fresh-tab test.
3. If pilot plays cleanly + Chromium does NOT log MEDIA_ERR_DECODE on it →
   batch the remaining 30 broken files.
4. Skip the 41 clean files (no pathology to fix).

## Files / artifacts

- `scripts/audio-fix/07-midstream-channel-audit.cjs` — per-frame audit of all
  44 multi-speaker files
- `scripts/audio-fix/08-single-speaker-frame-audit.cjs` — same for the 28
  single-speaker files
- `tmp/audio-diagnose/_midstream-audit.json` — multi-speaker results
- `tmp/audio-diagnose/_single-speaker-frame-audit.json` — single-speaker results
- `tmp/audio-diagnose/*.mp3` — local-only originals retained for the
  diagnostic cycle (gitignored)
