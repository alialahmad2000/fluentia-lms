# Audio-Text Mismatch Fix — Final Report (2026-05-19)

## What the previous 4 commits missed

| Commit | What it did | What it missed |
|--------|-------------|----------------|
| `ecbd0d1` | Hid 3 personalization UI mount points | Didn't audit actual audio file content vs displayed text |
| `e4ef9f7` | Fixed `useAudioEngine` stale-deps + remount key | Verified URL/identity coherence but not narration-content vs displayed-text |
| `0d4ec39` | Kill-switch + hook short-circuits + client purge | Validated with Layan / Sara — neither had the specific affected unit on their flow |
| `5b83d67` | Automated triple-check at URL / id / flow level | Asserted `audio_url` embeds `reading_id`, not that the narration matches the text it's paired with |

The blind spot: every test asked **"is the audio paired correctly with this reading id?"** Every test answered **"yes."** The actual bug was **"is the audio file CONTENT in sync with the TEXT CONTENT of the reading?"** — a different question. The answer for 22 of 144 readings was **no.**

## Phase 1 — Lamia reproducer

- **Profile:** `95124347-7ad8-46b7-b745-b6c085bf3a6f` — لمياء سعود الحربي / `almooshhh11@gmail.com` / `display_name = "Lamia"` / `pwa_installed=true`.
- **State at audit time:** `user_interests.interests = ['fashion_beauty', 'family', 'travel_food']`, `has_completed_survey=true`. `students.academic_level=1`, `group_id=bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb`. No per-user `personalized_readings` rows (the table is keyed by `(canonical_reading_id, interest_bucket)`, not by user — there is no `user_id` column. So per-student variant content cannot exist; only generic per-bucket variants do).
- **Test unit:** L1 U1 "Cultural Festivals" — `49ed7c2c-fa1b-47b2-bb5c-34074beeafdc`. Reading A `76d1051f-3e7c-4263-af48-98700a879bad`.
- **Reproduced divergence:** in the canonical `curriculum_readings.passage_content.paragraphs[0]` the text begins with **"People love to keep their big days in every land…"** (164 words, simple A1 register). The matching `reading_passage_audio.word_timestamps` first-word entries say the narration begins **"Every year, millions of people around the world celebrate special festivals that bring color, music, and…"** — a completely different text register (B1+). The audio file is **120.2 s** long for a text that's 164 words at ~2.5 wps = ~66 s expected. The audio file narrates an older, harder version of the same passage that was later rewritten to A1.

This is exactly what Ali observed: canonical-looking text on screen, audio plays "something different."

## Phase 2 — Layer hypothesis was wrong; correct layer found

The prompt's hypothesis was a **per-user audio-resolution leak** (RLS/RPC/edge function reading audio from `personalized_reading_audio` for students with `user_interests`).

What the data actually showed:
- `personalized_readings` schema has **no `audio_url` column** (`id, canonical_reading_id, interest_bucket, title, body, word_count, cefr_level, …`).
- No `personalized_reading_audio` table exists in the schema (probed: `personalized_reading_audio`, `personalized_audio`, `reading_variant_audio`, `variant_audio`, `audio_files`, `reading_audio_variants`, `student_audio` — all return "table not found").
- All 144 `reading_passage_audio.full_audio_url` rows embed the correct `passage_id` in the storage path — **0 swap pattern at the URL layer.**

So no audio-resolution leak existed. The bug was **content drift** within canonical rows: text was rewritten (e.g., as part of PROMPT 13 L1 — see CLAUDE.md changelog 2026-05-18 "PROMPT 13 L1: Reading Passage Rewrites — All 12 Units Complete") but the corresponding audio files in `reading_passage_audio` were never regenerated.

The scope: **22 of 144 readings** had audio narrating an older/different text. All 22 were L1 readings — every L1 reading. Other levels were clean.

## Phase 3 — Data integrity fix

Built `scripts/audits/audio-text-mismatch-fix/08-text-vs-audio-drift.mjs`: for every `curriculum_readings` row, compare the first 4 normalized words of `passage_content.paragraphs[0]` vs the first 4 normalized words of `reading_passage_audio.word_timestamps`. If they disagree, the audio is from an older text → flagged DRIFTED.

Initial audit:
- **22/144 DRIFTED** (audio narrates different text than displayed)
- **109/144 CLEAN** (audio + text in sync)
- **13/144 NO_TIMESTAMPS** (the May 18 truncated-regen rows — different bug, broken word_timestamps shape — addressed by the parser fix below)

ElevenLabs budget pre-regen: **643,594 / 1,810,000 used → 1,166,406 remaining.** Estimated regen cost (full + per-paragraph for 22 rows): **38,556 chars** — well within budget.

Built `scripts/audits/audio-text-mismatch-fix/10-regen-drifted.mjs` based on the proven `scripts/audio-v2/regen-reading-truncated.mjs` pattern from 2026-05-18. Regenerated:

| Row | Full duration | wts |
|-----|---------------|-----|
| L1/U1/A `76d1051f…` (Lamia's reading) | 60 s | 164 |
| L1/U1/B `0d3b261d…` | 65 s | 181 |
| L1/U2/A `fd8f24d7…` | 50 s | 151 |
| L1/U3/A `facd74da…` | 58 s | 155 |
| L1/U3/B `d7fa776f…` | 57 s | 161 |
| … 17 more L1 readings … | | |

**Result: 22 succeeded, 0 failed.** Each regen updates `reading_passage_audio` (full_audio_url, full_audio_path, full_duration_ms, paragraph_audio, word_timestamps, voice_id, generated_at) AND mirrors back to `curriculum_readings` (passage_audio_url, audio_duration_seconds, audio_generated_at). `.select()` used after every `.upsert()` / `.update()`.

## Phase 3.5 — A second bug surfaced and was fixed: word_timestamps shape mismatch

The May 18 regen and my new regen both write `word_timestamps` as `{ all_words: [ … ], paragraphs: [ … ] }`, but the corpus's older rows use the flat array shape `[ { word, start_ms, end_ms }, … ]`. The `useKaraoke` consumer hook (`src/components/audio/hooks/useKaraoke.js`) uses `timestamps.length` + indexed access — works on the flat array, **silently breaks on the object shape**.

That means karaoke was broken for the May 18 truncated regen rows (13 L4/L5 readings) AND would have been broken for my 22 new regen rows.

**Fix:** `src/hooks/useReadingPassageAudio.js` now normalizes the shape before handing it to `useKaraoke`:

```js
let normalizedWts = data.word_timestamps
if (normalizedWts && !Array.isArray(normalizedWts) && Array.isArray(normalizedWts.all_words)) {
  normalizedWts = normalizedWts.all_words
} else if (!Array.isArray(normalizedWts)) {
  normalizedWts = []
}
// then segments[0].word_timestamps = normalizedWts
```

This fixes both the 22 newly-regenerated rows and the 13 May 18 rows in one change.

## Phase 4 — verification across EVERY student

`scripts/audits/audio-text-mismatch-fix/11-all-students-verify.cjs`:

Two assertions:
1. **Per-reading (applies to all students equally):**
   - URL embeds `reading_id` in storage path
   - First 4 normalized words of `word_timestamps` == first 4 normalized words of `passage_content.paragraphs[0]`
2. **Per-student (authenticated JWT sweep):**
   - Mint `magiclink` session for every `profiles` row WHERE `role='student'` AND `email IS NOT NULL`
   - Confirm authenticated reads of `curriculum_readings` and `reading_passage_audio` return identical counts + spot-checked rows to service-role

Results:
- **23 students with email** swept (including Lamia + the rest of the active roster)
- **0 mint failures**
- **0 global reading-level issues** (drift, missing wts, URL mismatches — all eliminated)
- **0 per-student issues** across 69 spot-checks (3 readings × 23 students)

**Final verdict: ALL STUDENTS CLEAN. ✅**

## Files changed

- **Source code:** `src/hooks/useReadingPassageAudio.js` — word_timestamps shape normalization
- **DB content:**
  - 22 `reading_passage_audio` rows updated (full_audio_url stays at the same path, but the underlying mp3 file now matches the displayed text; full_duration_ms / paragraph_audio / word_timestamps / voice_id / generated_at all rewritten)
  - 22 `curriculum_readings` rows updated (passage_audio_url, audio_duration_seconds, audio_generated_at)
  - Storage: 22 × (1 full mp3 + 4 paragraph mp3s) = 110 audio files upserted under existing paths (same URLs, new bytes — clients with stale browser cache may need a hard refresh, but version.json + UpdateBanner mechanism handles this automatically on next visit)
- **Audit artifacts** (this prompt's run):
  - `scripts/audits/audio-text-mismatch-fix/01-find-lamia.mjs`
  - `scripts/audits/audio-text-mismatch-fix/02-lamia-state.mjs`
  - `scripts/audits/audio-text-mismatch-fix/03-audio-table-probe.mjs`
  - `scripts/audits/audio-text-mismatch-fix/04-find-unit1.mjs`
  - `scripts/audits/audio-text-mismatch-fix/05-lamia-level-and-unit1.mjs`
  - `scripts/audits/audio-text-mismatch-fix/06-l1-u1-deep-probe.mjs`
  - `scripts/audits/audio-text-mismatch-fix/07-l1-u1-full-text.mjs`
  - `scripts/audits/audio-text-mismatch-fix/08-text-vs-audio-drift.mjs`
  - `scripts/audits/audio-text-mismatch-fix/09-check-no-timestamps.mjs`
  - `scripts/audits/audio-text-mismatch-fix/10-regen-drifted.mjs`
  - `scripts/audits/audio-text-mismatch-fix/11-all-students-verify.cjs`
  - `docs/audits/audio-text-mismatch-fix/lamia-state.json`
  - `docs/audits/audio-text-mismatch-fix/text-vs-audio-drift.json`
  - `docs/audits/audio-text-mismatch-fix/regen-drifted-results.json`
  - `docs/audits/audio-text-mismatch-fix/all-students-verify.json`
  - `docs/audits/audio-text-mismatch-fix/FINAL-REPORT.md` (this file)

## Data preserved (no destruction)

- `personalized_readings` (1152 rows): untouched. Hidden via earlier kill-switch (`0d4ec39`).
- `user_interests` (10 rows): untouched.
- Listening flow: untouched.
- Vocab flow: untouched.
- No student data writes (no submissions / unit_progress / xp_transactions modified).

## ElevenLabs budget consumed

Pre-regen: 643,594 / 1,810,000 chars used → 1,166,406 remaining.
Regen cost: ~38,556 chars (22 full + 88 per-paragraph audios).
Post-regen estimated: ~682,150 / 1,810,000 used → ~1,127,850 remaining.

## Commit

Will be filled after `git commit`.
