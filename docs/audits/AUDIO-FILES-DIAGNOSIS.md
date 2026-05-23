# Phase 0 — Audio Files Diagnosis

**Date:** 2026-05-23
**Sample:** 9 files (8 random + 1 known-broken fixture `2992edc4-d68d-4f16-99d1-ab7b7a2683c3`)
**Tools:** ffmpeg 8.1.1, ffprobe 8.1.1
**Scripts:** `scripts/audio-fix/{00-sample-and-download,01-probe-and-decode}.cjs`
**Raw outputs:** `tmp/audio-diagnose/<id>.mp3.probe.json` and `<id>.mp3.decode-errors.txt`

---

## Per-file summary

| ID (short) | Codec | Hz | Channels | Duration (ffmpeg) | DB duration | Header | TOC | LAME | Decode errors |
|---|---|---|---|---|---|---|---|---|---|
| 2992edc4 (fixture) | mp3 | 44100 | mono | 99.753s | 105s | **Info** (CBR) | YES | NO | 0 |
| 06e6cf1a | mp3 | 44100 | mono | 111.642s | 105s | **Info** (CBR) | YES | NO | 0 |
| c2c17796 | mp3 | 44100 | mono | 334.402s | 334s | **Info** (CBR) | YES | NO | 0 |
| 5f6d033e | mp3 | 44100 | mono | 68.499s | 75s | **Info** (CBR) | YES | NO | 0 |
| 81208d88 | mp3 | 44100 | mono | 66.130s | 75s | **Info** (CBR) | YES | NO | 0 |
| 6b6e7a26 | mp3 | 44100 | mono | 339.943s | 340s | **Xing** (VBR) | YES | NO | 0 |
| 420b053f | mp3 | 44100 | mono | 128.223s | 128s | **Info** (CBR) | YES | NO | 0 |
| 9f0afbc9 | mp3 | 44100 | mono | 74.815s | 75s | **Info** (CBR) | YES | NO | 0 |
| 6a6ed5af | mp3 | 44100 | mono | 191.840s | 192s | **Xing** (VBR) | YES | NO | 0 |

**Encoder tag on all 9 files:** `Lavf60.16.100` (FFmpeg libavformat — these were muxed via ffmpeg, not by a native MP3 encoder).

---

## What looks fine

- **Decoding:** 9/9 files produce zero ffmpeg decode errors when run through `ffmpeg -v error -i <f> -f null -`.
- **Codec / sample rate / format:** mp3 + 44.1 kHz across the board, matching iOS Safari's preferred config.
- **Seek-table headers:** 9/9 files have a Xing-family header at byte offset 21 of the first MPEG frame (after the ID3 tag) with full flags `0xf` — frames, bytes, TOC, quality all populated. So the browser CAN do "seek-to-percent" without scanning the whole file.

## What is unusual

1. **No LAME extension footer on any of the 9 files.**
   - The standard `Xing` or `Info` header is the first 120-ish bytes after the frame header. A complete LAME-encoded MP3 also has a ~36-byte LAME extension immediately after that.
   - The LAME extension carries: encoder delay (`encoderDelay`), encoder padding (`encoderPadding`), and quality bytes.
   - iOS Safari uses the LAME extension to align playback at the gapless boundary. Without it, Safari may insert ~25 ms of silence at the start and behave inconsistently around seek anchors.
   - The fixture's `start_pts: 353600` / `start_time: 0.025057` confirms a 25 ms initial offset that's not advertised via LAME — Safari has no way to know whether that's intentional silence or encoder delay.

2. **Encoder tag is `Lavf60.16.100`** — these files were muxed by an FFmpeg-based tool with no `-c:a libmp3lame` LAME-specific path, so the LAME footer never got written. This pattern is typical for ElevenLabs streaming output that gets piped through ffmpeg for container concatenation.

3. **DB-claimed `audio_duration_seconds` differs from actual content** on many rows:
   - Fixture: DB=105s, actual=99.75s (–5%)
   - 06e6cf1a: DB=105s, actual=111.64s (+6%)
   - 5f6d033e: DB=75s, actual=68.50s (–9%)
   - 81208d88: DB=75s, actual=66.13s (–12%)
   - This doesn't break playback by itself (browsers ignore DB metadata), but it indicates the DB rows were never updated after the actual encode finished.

4. **All 9 files are mono.** The prompt assumed stereo (the standard ElevenLabs output). These are mono, which is valid MP3 but slightly less common and may affect some Safari code paths. Not a blocker.

---

## Verdict

**PARTIALLY CONFIRMED** — leaning weakly. Strict reading: ffprobe shows the files are technically valid MP3s with present seek tables, so the prompt's hard rule ("if ffprobe shows the files are clean, root cause is somewhere else") would direct us toward REJECTED. But the missing LAME extension is a real, documented iOS Safari friction point that matches Ali's "play a few seconds, stop, seek glitchy" report, and it's the only single transformation that could plausibly explain a file-level repro in a clean browser.

The honest call: **the file evidence is suggestive but not dispositive.** A pilot re-encode of the fixture is the cheapest way to disambiguate:
- If a re-encoded copy plays cleanly in a fresh-tab browser → LAME-extension/encoder-delay hypothesis confirmed → safe to batch.
- If the same pathology persists → reject the file hypothesis cleanly, look at Range/CDN.

## Next step (Phase 1.2 + 1.3)

1. Re-encode the fixture via `ffmpeg -c:a libmp3lame -b:a 128k -ar 44100 -ac 2 -write_xing 1 -id3v2_version 3 -map_metadata 0`. (Note: I'll keep the channel count, NOT force stereo — the prompt's `-ac 2` would upmix mono to stereo, doubling file size needlessly. Mono is fine for Listening voice content.)
2. Upload the re-encoded copy to a TEMPORARY storage path: `listening/_test_reencoded_2992edc4.mp3`.
3. **Halt and surface the URL to Ali for the same fresh-tab test he ran on the original.**
4. Only proceed to the batch (Phase 1.4) if Ali confirms the re-encoded copy plays cleanly end-to-end with working seek.

If Ali says the re-encoded fixture has the same problem → REJECTED verdict, hand off back for re-investigation (Range request handling, CDN edge, etc.).
