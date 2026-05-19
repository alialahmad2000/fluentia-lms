# Listening — Audio Fix + Player Redesign + Drift Protection — Final Report

Date: 2026-05-19

## Phase A — Diagnosis

- Inventory: 72 total rows, 72 with `audio_url`, 72 with `transcript`, 0 missing. One listening row per unit — no multi-player stacking risk.
- Categorization after HEAD/Range/MIME/Content-Length checks: **72/72 HEALTHY**. The single transient "RANGE_ERROR" hit was a network blip — the row re-probed clean (HEAD 200, audio/mpeg, range 206).
- Player code path audit: existing `ListeningPlayer.jsx` already complied with the canonical iOS-Safari-safe pattern (event listeners attach before `el.src`, `useEffect` deps `[audioUrl]`, `playsInline`, `play()` from synchronous click handler, error surface, proper cleanup). No code-path bug was reproducible. **The "audio doesn't play" symptom Ali observed is not reproducible from any automated test** — most plausible explanation is a stale PWA bundle from before recent listening-related deploys. Bumping `public/version.json` triggers the `UpdateBanner` flow on next visit.

## Phase B — Audio fixes

- **Bucket-level fixes:** None needed (no WRONG_MIME, no NO_RANGE, no BROKEN_URL).
- **Player code path fixes:** Already correct — preserved the canonical pattern in the Phase D rewrite (event listeners before src, reactive `useEffect` deps, `playsInline`, try/catch on `play()`).
- **Conditional render improvement:** Added `ListeningAudioComingSoon` fallback for the null-`audio_url` case in `ListeningSection.jsx`. Defensive — covers future MISSING_AUDIO rows without ever rendering a dead play button.
- **Rows regenerated: 0.** Per the strict rule ("don't regenerate without per-row evidence"), no audio was regenerated this run. All 72 files are healthy.
- **ElevenLabs chars consumed: 0** (the drift-protection foundation itself does no TTS).
- **Quota at start of run:** ~682K used / 1.81M limit → 1.13M remaining. **End-of-run: identical, no spend.**

## Phase C — Drift protection (the architectural win)

The L1 reading regression on 2026-05-19 (commit `f911750`) happened because canonical text was rewritten without regenerating audio, and there was no system to detect it. This phase ensures it cannot happen again for listening.

| Deliverable | Path |
|-------------|------|
| Migration: `source_text_hash` + `source_text_hash_at` columns + index | `supabase/migrations/20260519110000_add_source_text_hash_to_curriculum_listening.sql` |
| Hash utility (Node + browser, byte-equivalent) | `scripts/lib/text-hash.cjs` + `src/lib/textHash.js` |
| Generator patch — writes hash on every TTS run | `scripts/audio-v2/03-generate-listening.mjs` (lines 188-205) |
| Backfill script (idempotent) | `scripts/audits/listening-fix/03-backfill-hashes.cjs` |
| Drift-check gate (exits non-zero on drift) | `scripts/audits/audio-drift-check.cjs` |
| npm scripts (`audit:audio-drift`, `predeploy:audio-drift`) | `package.json` |
| Admin-only drift chip (impersonation view) | `src/components/players/listening/DriftChip.jsx` |

**Backfill result:** 72/72 rows received their baseline hash (`updated: 72, errors: 0`).

**Drift-check verdict:** ✅ No audio drift detected. 72 rows checked, 0 drifted, 0 missing baseline.

**Future retrofit:** the same `source_text_hash` column + drift-check pattern slots into `curriculum_readings` (passage text) and `curriculum_vocabulary` (example sentences) by adding a row to `TABLES_TO_CHECK` in `audio-drift-check.cjs`. Out of scope for this prompt.

## Phase D — Player redesign

- **File:** `src/components/players/listening/ListeningPlayer.jsx` — independent file, no inheritance from any reading-player code. Custom design language per the Phase D spec.
- **Hero play button:** 64px gold-gradient with inset highlight + amber drop shadow. The visual focal point of the section.
- **Decorative amber glow behind the play button** — audio-feel, not reading-feel.
- **Color-coded speaker ticks:** each speaker gets a stable color from `SPEAKER_COLORS = ['#FBBF24', '#A78BFA', '#34D399', '#F472B6', '#60A5FA']` via deterministic hash of speaker name.
- **Speed selector:** popover (replaces the always-visible row of 5 chips). Cleaner surface.
- **Transcript toggle:** owned by the player at the bottom (Phase D requirement). `ListeningSection.jsx` now passes `transcriptShown` + `onTranscriptToggle` props; the toggle in the section header was removed.
- **Sticky positioning preserved:** fixed bottom bar, respects sidebar width (RTL right side). Bottom spacer accounts for safe-area-inset-bottom + the larger bar.
- **Hidden audio element:** never sets src inline. `src` is set inside the `useEffect` AFTER event listeners attach.
- **`ListeningAudioComingSoon`** fallback when `audio_url` is null. No dead-button state possible.

## Phase E — Verification

- Categorization re-run: **72/72 HEALTHY** ✅
- Drift audit (`node scripts/audits/audio-drift-check.cjs`): exit 0, "✅ No audio drift detected." ✅
- Hash backfill complete: `rows_with_audio (72) == rows_with_hash (72)` ✅
- Parse-check on touched files: text-hash.cjs OK, audio-drift-check.cjs OK, backfill OK ✅
- Generator patch confirmed: `sourceTextHash` imported + `source_text_hash` written on UPDATE ✅
- `is_published=false` on all rows is informational only — does not gate reads (verified through earlier authenticated-session sweeps in commit `5b83d67` / `f911750`).

## Not touched (per strict rules)

- Reading flow (pattern retrofits in a future prompt)
- Vocab flow
- Student data tables (no submissions / unit_progress / xp_transactions writes)
- Variant tables (`personalized_readings`, `user_interests`) — already disabled by the kill-switch from commit `0d4ec39`

## Files changed

### Source (frontend)
- `src/components/players/listening/ListeningPlayer.jsx` — full Phase D rewrite
- `src/components/players/listening/ListeningSection.jsx` — coming-soon fallback, transcript toggle moved into player, drift chip mount
- `src/components/players/listening/ListeningAudioComingSoon.jsx` — NEW
- `src/components/players/listening/DriftChip.jsx` — NEW
- `src/lib/textHash.js` — NEW (browser-side mirror of the hash util)

### Backend / scripts
- `supabase/migrations/20260519110000_add_source_text_hash_to_curriculum_listening.sql` — NEW (applied via Supabase Management API)
- `scripts/lib/text-hash.cjs` — NEW
- `scripts/audits/audio-drift-check.cjs` — NEW
- `scripts/audits/listening-fix/01-inventory.cjs` — NEW
- `scripts/audits/listening-fix/02-categorize.cjs` — NEW
- `scripts/audits/listening-fix/03-backfill-hashes.cjs` — NEW
- `scripts/audio-v2/03-generate-listening.mjs` — patched to write `source_text_hash`
- `package.json` — `audit:audio-drift` + `predeploy:audio-drift` scripts
- `public/version.json` — bumped to trigger PWA update banner

### Audit artifacts
- `docs/audits/listening-fix/inventory.json`
- `docs/audits/listening-fix/categorized.json`
- `docs/audits/listening-fix/PHASE-A-REPORT.md`
- `docs/audits/listening-fix/FINAL-REPORT.md` (this file)

## Commit

Will be filled after `git commit`.
