# Phase 0 — Audio Files Diagnosis

**Date:** 2026-05-23
**Sample:** 12 files (9 Phase 0 + 3 multi-speaker follow-up)
**Tools:** ffmpeg 8.1.1, ffprobe 8.1.1
**Scripts:** `scripts/audio-fix/{00-sample-and-download,01-probe-and-decode,03-multispeaker-discovery,04-probe-multispeaker}.cjs`
**Raw outputs:** `tmp/audio-diagnose/<id>.mp3.{probe.json,decode-errors.txt}`
**Manifests:** `tmp/audio-diagnose/_{sample,probe-summary,multispeaker-picks,multispeaker-probe}.json`

---

## Verdict: REJECTED

The file-corruption hypothesis is **NOT supported by evidence**. Do not batch re-encode.

---

## Evidence summary

### Coverage
- **9/72** initial sample (8 random + known-suspected fixture `2992edc4-d68d-4f16-99d1-ab7b7a2683c3`)
- **3/72** follow-up sample of multi-speaker files (`ab69e89c` dialogue, `62666f53` interview, `7dc9e208` interview) — picked after Ali noted the original pilot was on a single-speaker file and might not exercise the failure mode

### Per-file probe results (12/12 files)

| Group | Files probed | Decode-clean | Xing/Info present | TOC flag set | Notes |
|---|---|---|---|---|---|
| Single-speaker (Phase 0) | 9 | 9/9 | 9/9 | 9/9 | mono 44100Hz CBR/VBR 128kbps |
| Multi-speaker (Phase 0 follow-up) | 3 | 3/3 | 3/3 | 3/3 | mono 44100Hz, same encoder profile |
| **Total** | **12** | **12/12 ✓** | **12/12 ✓** | **12/12 ✓** | |

### Speaker-type distribution across all 72 production files

`curriculum_listening.audio_type`:
- monologue: 24 (single-speaker)
- lecture: 4 (single-speaker)
- dialogue: 14 (multi-speaker)
- interview: 30 (multi-speaker)
- **Multi-speaker total: 44/72 (61%)**

Cross-checked via `listening_audio.speaker_label` distinct count: 27 single / 43 two-speaker / 2 three-speaker. Matches within ±1.

### Multi-speaker vs single-speaker pathology profile

| Property | Single-speaker (n=9) | Multi-speaker (n=3) | Verdict |
|---|---|---|---|
| Codec | mp3 | mp3 | Same |
| Sample rate | 44100 Hz | 44100 Hz | Same |
| Channels | mono | mono | Same |
| Bitrate | 128081 (CBR) | 125644–126056 (VBR) | Comparable |
| Xing/Info header | offset 21 | offset 21 | Same |
| LAME-extension bytes | "Lavf" or "Lavc62.28.101 libmp3lame" | "Lavf" | Same placeholder pattern |
| Encoder tag | Lavf60.16.100 / Lavf62.12.101 | Lavf62.12.101 | Same family |
| Decode errors | 0/9 | 0/3 | **Both clean** |

**Conclusion: multi-speaker files are NOT more pathological than single-speaker files.** The pilot exercised the same encoder profile that all 72 files share.

### Original observation is no longer reproducing

Ali opened the production `s0_nadia.mp3` URL in a fresh browser tab today (2026-05-23) — the same test that originally produced the play-a-few-seconds-stop pattern. **It played end-to-end without stopping. Seek worked cleanly.** The pilot re-encoded copy played the same way. No regression visible against either URL today.

### `audio_event_log` does not pinpoint a specific failed listening file

100 events in the table, **0 with `player_id` matching `listening:*`** or `audio_url` matching `/listening/`. The "telemetry shows 3 distinct failure modes" claim in the parent prompt referenced events I cannot find in the current log. So we have no production-grade evidence pinpointing which file Ali originally saw misbehave.

### Pilot result for `2992edc4-...`

Re-encoded the fixture via libmp3lame at 128 kbps / 44.1 kHz / mono. Uploaded to `listening/_pilot_reencoded_2992edc4-...mp3`. **Both pilot AND original played cleanly end-to-end in Ali's fresh-tab test.** The re-encode did not change observable behavior because the original was already working today.

---

## What this means for L1

**File-level pathology is rejected.** The root cause sits downstream of file encoding. Candidates ranked by my read of the evidence:

1. **iOS 26.4 Safari quirk** — Playwright WebKit (and possibly real iOS) hits a probe-storm + readyState=0 pattern from time to time. Was not file-deterministic.
2. **Supabase Range-request handling** — the `cf-cache-status: REVALIDATED` vs `MISS` differential may produce inconsistent latency that triggers Safari retry loops.
3. **`ListeningPlayer.jsx` state machine** — the production Listening tab uses ListeningPlayer (NOT useAudioEngine / SmartAudioPlayer). MEGA-FIX V2's patches landed on the wrong file. Resilience there is still warranted (Phase 5 in the parent prompt).

**Real-iPhone Safari Remote Debugging on the live LMS is the next ground truth.** If a failure reproduces there, we'll capture the URL + iOS version + Network tab response (especially `cf-cache-status` and Content-Range), and we'll know which root cause to address.

---

## Files preserved for future investigation

- `scripts/audio-fix/00..04*.cjs` — all probe scripts, idempotent
- `tmp/audio-diagnose/*.mp3` and `*.probe.json` — local only (gitignored), retained for one diagnostic cycle
- `tmp/audio-diagnose/_*.json` manifests — committed; tell anyone re-running which files were sampled

---

## What was NOT done (and why)

- ❌ Batch re-encode of remaining 71 files — no confirmed pathology to fix
- ❌ Phase 3.1 Playwright 5/5 — no confirmed pathology means Playwright would pass trivially and prove nothing
- ❌ Phase 4 reading audio re-encode — same family, same lack of evidence
- ❌ Phase 5 ListeningPlayer refactor — separate concern; can be reopened if iPhone test reproduces a failure
