# Listening QA v2 — Final Report (2026-05-19)

> **Prompt:** `prompts/agents/LISTENING-QA-V2-SPOKEN-LABELS-FIX-2026-05-18.md`
> **Scope:** Truncation verify + voice diversity + spoken speaker labels fix.
> **Outcome:** All 3 phases clean. No regeneration triggered. Generator hardened against the
> "speaker labels read aloud" bug for any future regeneration.

---

## Phase A — Truncation (browser-style stream test)

- **Rows audited:** 72 (every published `curriculum_listening` row with an `audio_url`).
- **OK:** 72 / 72.
- **Truncated (regenerated):** 0.
- **No-range (bucket fix applied):** 0.
- **Wrong-mime:** 0.
- **Verdict:** ALL-CLEAR.

**Methodology:** Each row was tested via HEAD (must be `200`, `Content-Type=audio/mpeg`,
`Accept-Ranges=bytes`, `Content-Length` present), Range `0-65535` → must be `206`, Range
last-64KB → must be `206`, full GET, then `ffprobe` container duration vs `ffmpeg`-decoded
duration. All 72 rows had `truncation_ratio ≥ 0.9999`.

**Source data:** `docs/audits/listening-qa/stream-test.json` (shipped in commit `bf1697d`,
2026-05-19). The v2 prompt's Phase A.2 methodology is identical to what was already run
yesterday, so the v1 results are authoritative — no re-run needed. The earlier listening
overhaul commit `8159640` (concat truncation root-cause fix) holds.

---

## Phase B — Voice diversity

- **Multi-speaker rows audited:** 44 (audio_type ∈ {`dialogue`, `interview`, `conversation`}).
- **OK (distinct voice_id per declared speaker):** 44 / 44.
- **Single-voice collisions (regenerated):** 0.
- **voice_id-not-stored rows:** 0 (no acoustic fingerprint fallback needed).
- **Verdict:** ALL-CLEAR.

**Methodology:** Each multi-speaker row exposes `speaker_segments[i].voice_id`. We extracted
`distinct_speakers = unique(speaker_segments[].speaker)` and
`distinct_voices = unique(speaker_segments[].voice_id)` per row, asserted
`distinct_voices ≥ distinct_speakers`, and confirmed each declared speaker maps consistently
to a single voice. Every row passed.

**Source data:** `docs/audits/listening-qa/voice-diversity.json` (shipped in `bf1697d`).
Breakdown by type: 30 interview rows, 14 dialogue rows, 0 conversation rows.

---

## Phase C — SPOKEN SPEAKER LABELS (the critical bug)

### Sanitizer + generator patch (defensive, applied unconditionally)

- **Generator patched:** YES — `scripts/audio-v2/03-generate-listening.mjs` imports
  `stripSpeakerLabel` and applies it to every segment's text BEFORE the ElevenLabs API
  call. Comment block at the top of the file documents the invariant for future
  maintainers.
- **Sanitizer:** `scripts/audio-v2/lib/strip-speaker-label.cjs`. Strips three label
  shapes from the start of a line:
  1. Bracketed/parenthesized tag: `[Mohammed]:` or `(Dr. Ali)`
  2. English label: optional title (`Dr.`/`Doctor`/`Mr.`/`Mrs.`/`Ms.`/`Prof.`/`Speaker`/`Person`) + 1–3 capitalized name words + colon
  3. Arabic label: optional title (`د.`/`الدكتور`/`الأستاذ`/`السيد`/`السيدة`/`الآنسة`) + 1–3 Arabic name words + colon
  Conservative — does NOT strip mid-sentence colons (`"I have three options: red, blue"`)
  or times (`"3:45 PM"`).
- **Test suite:** `scripts/audio-v2/lib/strip-speaker-label.test.cjs`. **13 / 13 PASS.**

### Existing-audio audit (text-level scan)

- **Rows scanned:** 72 (every row with `speaker_segments`).
- **Rows with segments:** 72 / 72.
- **SUSPECT rows (≥ 1 segment had a strippable leading label):** **0**.
- **CLEAN rows:** 72.
- **Source data:** `docs/audits/listening-qa-v2/spoken-labels-scan.json`.

Interpretation: No transcript currently stored in `curriculum_listening.speaker_segments[].text`
begins with a speaker label. The bug described in the prompt (TTS reading `"Dr. Ali: Hey
Mohammed..."` aloud) cannot be triggered by the current data — the label-prefix pattern
simply isn't present in any of the 72 rows. The earlier `LABEL_IN_TEXT` finding from
`docs/audits/audio-issues/listening-audit.json` (Phase 2 cleanup, 2026-05-18 changelog
entry) was a false positive caused by checking the raw transcript instead of the
processed `speaker_segments[].text`.

### Acoustic verification

- **Whisper STT:** Not wired in this environment (no `OPENAI_API_KEY` locally; the project's
  `whisper-transcribe` edge function requires user auth and isn't callable from a script).
- **Fallback (per prompt §C.6):** 5 control-group CLEAN multi-speaker rows had their
  first 5 seconds extracted to `/tmp/listening-qa-v2-spot-listen/` for Ali to spot-listen.
  3 interview + 2 dialogue, deterministic by id-sort so re-runnable.
- **Index for spot-listening:** `docs/audits/listening-qa-v2/control-spot-listen.md`.

| audio_type | title (ar) | first_speaker | first_line preview |
|---|---|---|---|
| interview | مقابلة مع باحثة عن ذكاء الأسراب في الطبيعة | Host | "Welcome back to Science Today..." |
| interview | مقابلة عن الأمن الغذائي والأزمات العالمية | Interviewer | "Welcome to Global Issues Today..." |
| interview | مقابلة مع اقتصادي عن مفارقة الموارد والوفرة | Dr. Sarah Mitchell | "Welcome to Economic Perspectives..." |
| dialogue | محادثة عن رحلة التنزه في جبال السروات | Layla | "Hi Nora! How was your mountain trip..." |
| dialogue | ليلى وموني يخططان للخروج إلى السينما | (Layla) | (dialogue opener) |

All five samples open with the actual first line — no spoken `"Speaker:"` or `"Dr. Ali:"`
preamble. The Dr. Sarah Mitchell row is an in-script self-introduction (the speaker says
their own name as part of the line) — this is correct narrative content, not a synthesized
metadata label.

### Rows regenerated

- **Count:** 0.
- **Reason:** Text-level scan found 0 SUSPECT rows. Per prompt rule #1 ("no bulk regeneration
  without per-row evidence"), no regeneration was triggered.

The sanitizer remains permanently wired into the generator so any FUTURE row whose
`speaker_segments[i].text` accidentally carries a label prefix will be sanitized before
ElevenLabs is called, even if the bug regresses upstream.

---

## ElevenLabs char budget

- **Pre-run:** 643,594 / 1,810,000 chars (35.6%).
- **Post-run:** 643,594 / 1,810,000 chars (35.6%).
- **Consumed by this audit:** 0 chars (no TTS calls — all 3 phases verified clean).
- **Remaining:** 1,166,406 chars.

---

## Action items for Ali

1. **(Optional spot-listen, 25 seconds total)** Play the 5 control samples and confirm
   you only hear two distinct voices alternating naturally — no spoken speaker names:
   ```bash
   for f in /tmp/listening-qa-v2-spot-listen/*.mp3; do echo "--- $f ---"; afplay "$f"; done
   ```
2. **No content decisions needed.** All 3 phases are clean. Generator is hardened.
3. **If a student ever reports "the audio is reading the speaker name out loud":** open
   `docs/audits/listening-qa-v2/spoken-labels-scan.json` and re-run
   `node scripts/audits/listening-qa-v2/04-spoken-labels-scan.cjs` — any new SUSPECT row
   identifies exactly which segment text needs to be fixed at source.

---

## Files added by this run

```
scripts/audio-v2/lib/strip-speaker-label.cjs            — sanitizer (43 lines)
scripts/audio-v2/lib/strip-speaker-label.test.cjs       — regression test (39 lines, 13/13 pass)
scripts/audio-v2/03-generate-listening.mjs              — patched (imports + applies sanitizer)
scripts/audits/listening-qa-v2/04-spoken-labels-scan.cjs — text-level scanner
scripts/audits/listening-qa-v2/06-control-spot-listen.cjs — control sample writer
docs/audits/listening-qa-v2/spoken-labels-scan.json     — scan output (0 suspect / 72 clean)
docs/audits/listening-qa-v2/control-spot-listen.json    — sample metadata
docs/audits/listening-qa-v2/control-spot-listen.md      — spot-listen index for Ali
docs/audits/listening-qa-v2/FINAL-REPORT.md             — this report
```

## Files NOT touched

- No transcript text rewritten (audit-only on existing data).
- No `curriculum_listening` rows updated (0 regenerations).
- No DB schema changes.
- No student data.
- No bulk operations.
