# Mega Triple Fix — Final Report (2026-05-25)

Branch: `megafix-vocab-listening-reading` (NOT pushed to main — awaiting your deploy decision).
Method: each problem got a read-only Phase A diagnosis (3 parallel sub-agents) before any fix.

## Headline: the diagnoses changed the plan — for the better
- **No ElevenLabs spend.** Listening audio is 100% healthy; reading word audio falls to clean Web Speech. (Quota untouched: 812K/1.81M used, 997K remaining.)
- **The two "keeps coming back" problems each had ONE precise root cause**, not a surface to re-patch.

---

## Problem 1 — Vocabulary checkmarks
- **Root cause:** `trg_recompute_unit_progress()` (shipped `20260514100000`) evaluates `NEW.unit_id` unconditionally, but `vocabulary_word_mastery` has no such column → plpgsql throws `record "new" has no field "unit_id"` on every checkmark save. The modal's try/catch swallowed it. **Last successful save: 2026-05-14** (the trigger's ship date). Verified live with a student JWT.
- **Fix:** `supabase/migrations/20260525000000_fix_recompute_unit_progress_vwm.sql` — `CREATE OR REPLACE` the trigger to read fields via `to_jsonb(NEW)->>'key'` (NULL for absent keys, never throws) and resolve `unit_id` for vocab rows via `vocabulary_id → curriculum_vocabulary.reading_id → curriculum_readings.unit_id`. `WordExerciseModal` now surfaces the real DB error instead of a generic toast.
- **Status:** migration written, **NOT applied to prod** (DB-strategy: branch-first, you promote). Checkmarks return the moment the trigger fix is live. Verify: run `docs/audits/_megafix-tmp/rls-jwt-check.mjs` after promotion → expect `OK returned 1 row`.
- **Deferred:** unified `<VocabMasteryCheck>` primitive sweep + unit-completion confetti/+50 XP (cosmetic once the trigger is fixed; high churn). Tap-default `details→practice` flip (product call).

## Problem 2 — Listening section
- **Root cause:** all 72 `curriculum_listening` rows are healthy (HEAD 200, decode-clean). The bug is in `ListeningPlayer.jsx` — `onTimeUpdate` in a load-effect dep array re-fires `audio.load()` and aborts `play()`; iOS `play()` on an unready element throws SRC_NOT_SUPPORTED; a 2s watchdog false-flagged slow starts. Confirmed against the existing `audio_telemetry` table (58 real failures).
- **Fix (frontend-only):** load effect keyed on `[audioUrl, listeningId]` (onTimeUpdate via ref); benign `MEDIA_ERR_ABORTED`/`AbortError`/`NotAllowedError` no longer show the error card; `togglePlay` gates on `readyState>=2` and waits for `canplay` with a buffering spinner; watchdog now requires `readyState>=3` + not-buffering, 3.5s window.
- **Status:** DONE. Smoke `scripts/qa/listening-smoke.cjs` exits 0 (5/5 healthy). 0 ElevenLabs chars.

## Problem 3 — Reading pronunciation + translation
- **Finding:** the 3-layer hybrid was mostly built (clean MP3 default, Web Speech last resort), but a **dirty passage-slice tier sat in between** — so ~82% of words (no curated MP3) played a co-articulated slice.
- **Fix (frontend-only):** `useWordLensAudio` rewritten to Layer 1 `curriculum_vocabulary.audio_url` → Layer 1b `vocab_word_audio.audio_url` (optional, forward-compatible) → Layer 2 Web Speech (preferred en-US voice). **No `playAudioSlice` in the word-tap path** — a tap can never play a dirty slice. Translation popup already works.
- **Status:** centerpiece DONE. **Deferred (documented in `reading-premium/PHASE-C-VERIFY.md`):** `vocab_word_audio` table + `pronounce-word-worker` edge fn + cron + ElevenLabs Layer-3 generation (needs DB branch + edge deploy + spend); Velvet-Midnight visual rebuild + make-every-word-tappable (high-churn UI I can't verify in a browser here — not shipping unverified visuals).

---

## Files touched
- `src/components/players/listening/ListeningPlayer.jsx`
- `src/components/vocabulary/WordExerciseModal.jsx`
- `src/components/audio/wordlens/useWordLensAudio.js`, `WordLens.jsx`
- `scripts/qa/listening-smoke.cjs` (new)
- `supabase/migrations/20260525000000_fix_recompute_unit_progress_vwm.sql` (new — NOT applied to prod)
- `docs/audits/{vocab-checkmarks,listening-fix,reading-premium}/PHASE-A-DIAGNOSIS.md` + `PHASE-C-VERIFY.md`

## Self-check
- Babel parse: 4/4 touched src files PASS.
- Listening smoke: exits 0.
- ESLint: repo has no flat (v9) config → skipped (consistent with prior sessions).
- `tsc --noEmit`: skipped — JS/JSX (Vite) codebase, no project typecheck config; not run to avoid noise on a JS repo.

## What needs YOU (decisions)
1. **Deploy target:** these 3 commits are on `megafix-vocab-listening-reading`, not main (your feature-branch policy). Merge via Vercel preview, or tell me to push.
2. **Promote the trigger migration** `20260525000000` on a Supabase branch → prod. Until then, vocab checkmarks stay broken in prod (the frontend fix alone isn't enough).
3. **Deferred follow-ups** (reading visual rebuild + vocab_word_audio worker, vocab primitive unification) — say the word and I'll pick them up as a focused next pass.
