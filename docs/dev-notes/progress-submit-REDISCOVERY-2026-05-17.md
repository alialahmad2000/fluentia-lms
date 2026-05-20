# Re-Discovery — May 17, 2026 (Phase A only)

The prompt `FIX-PROGRESS-AND-SUBMIT-HANG-2026-05-14.md` was re-invoked today. This file documents what is already in place, what is **not** in place, and why I stopped at Phase A instead of proceeding to Phase B.

## Environment notes (different from prompt header)

| Prompt expected | Actual |
|---|---|
| Windows, `C:\Users\Dr. Ali\Desktop\fluentia-lms` | macOS, `/Users/dr.ali/projects/fluentia-lms` |
| `/mnt/skills/user/fluentia-lms/SKILL.md` | Not present on this machine |
| `.env.local` with Supabase service-role key | Only `.env.example` — no creds available locally |
| Supabase MCP (read-only) | Configured in `.mcp.json` but command is `cmd /c npx` (Windows) and `SUPABASE_ACCESS_TOKEN` is unset; MCP tools are not loaded in this session |

Implication: the Node-based discovery scripts in Phase A.1, A.3, A.4 cannot run. Discovery is limited to git history + file/source inspection.

## What is already deployed (from May 14 + May 15)

### Commit 39fda4f (May 14) — the prompt's Phase B work
- ✅ `supabase/migrations/20260514100000_compute_unit_progress.sql` — contains `compute_unit_progress()` PL/pgSQL function, `unit_progress` table + RLS, `recompute_unit_progress_for()` helper, `trg_recompute_unit_progress()` trigger function, `DO $$ ... LOOP ... CREATE TRIGGER` block attaching triggers to source tables, and `ALTER PUBLICATION supabase_realtime ADD TABLE unit_progress`.
  - The migration explicitly accounts for the schema-reality differences documented in the May 14 diagnosis (unified `student_curriculum_progress`, vocab join via `curriculum_readings`, assessments via `activity_attempts`).
- ✅ `src/hooks/useResilientActivitySubmit.js` — 81 lines, has `AbortController` + 15 s timeout (line 53), `finally { setSubmitting(false) }` (lines 74-77), `.select()` after upsert, invalidates `['unit-progress', …]`, `['unit-progress-comprehensive', …]`, `['level-progress', …]`.
- ✅ `src/hooks/useUnitProgress.js` — 374 lines, includes both `useUnitProgress` and `useLevelUnitsProgress` with `postgres_changes` Realtime channels.
- ✅ `src/pages/admin/StudentProgressDiagnostic.jsx` — 460 lines, mounted at `/admin/progress-diagnostic`, has `recomputeMutation` (one-click recompute button).
- ✅ `scripts/backfill-unit-progress-2026-05-14.cjs` — present.

### Commit 4991bdf (May 15) — follow-up that actually closed the user-facing bugs
- ✅ `SpeakingTab.handleUploadComplete` rewritten with full error handling + RLS-safe `.select()` + cache invalidation.
- ✅ `UnitContent.jsx` `fluentia:activity:complete` handler now invalidates the progress cache.
- ✅ `block_phantom_submission` trigger updated to exempt `section_type='speaking'` (migration `20260514000000`).
- ✅ `scripts/backfill-unit-progress.cjs` ran successfully: 4 missing speaking rows inserted, 0 real-student listening limbo rows graduated, all verifications passed (per the commit message).

## ⚠️ Gap: `useResilientActivitySubmit` is unused

```
grep -rln "useResilientActivitySubmit" src/
src/hooks/useResilientActivitySubmit.js     ← only the hook itself; no callers
```

Phase B.2 of the prompt ("Migrate every activity submit handler to use the hook") was **not done**. The hook exists but is dead code.

The three known raw submit paths instead:

| File | Pattern | Hang risk? |
|---|---|---|
| `src/pages/student/curriculum/tabs/ListeningTab.jsx:483` | Manual try/catch, `setSubmitting(false)` in each error branch (no central `finally`) | Low — every documented branch resets state; was the specific fix in 4991bdf |
| `src/pages/student/curriculum/tabs/WritingTab.jsx:341` | `setSubmitting(true)` at 341, manual `setSubmitting(false)` at 348 and 359, **no `finally`** | **Real** — an uncaught throw between 341 and 348/359 leaves the button stuck. Different code path than the original Listening hang, so 4991bdf didn't cover it. |
| `src/components/curriculum/RecordingTab.jsx:366` | `setLoading(true)` with explicit `finally { setLoading(false) }` at 413-414 | None |

So the prompt's promised "every activity uses one bulletproof primitive" is not the deployed reality — but it's also not the urgent reality, because the May 15 follow-up patched the specific listening + speaking write-path issues that students were complaining about.

## What this means for Hawazin's stuck-percentage complaint

I cannot verify her current DB state from this Mac (no creds, no MCP). The hawazin-diagnosis.md file written on May 14 plus the backfill commit message claim the issue was resolved. If she is still reporting a stuck percentage as of May 17, the next step is to run the admin `/admin/progress-diagnostic` page against her account (read-only, in-browser) before assuming code work is needed.

## Why I stopped at Phase A

Per the prompt's strict rule #8: "Two-phase pattern: Phase A is read-only discovery. **Stop and write `docs/dev-notes/progress-submit-DIAGNOSIS-2026-05-14.md` before any write.** Then Phase B builds the fix."

Phase A's discovery confirmed that ~95 % of Phase B is already shipped, and the 5 % gap (migrating handlers to the hook) is a question of code preference, not a live student-facing bug. Re-running Phase B as written would mean overwriting the existing migration (timestamp clash) and the existing hook files with the prompt's verbatim spec — losing the schema-reality adaptations that were made on May 14.

## Recommended next actions (for the human to choose between)

1. **Verify the bug is actually back.** If Hawazin or another student is still seeing stuck progress or a hang in May 17, get a fresh trace (DevTools Network + the activity + the unit) before any code change.
2. **Close the hook-adoption gap intentionally.** Migrate `WritingTab` (real `finally`-gap risk) and optionally `ListeningTab` to use `useResilientActivitySubmit`. This is a focused 2-file diff, not a full re-run of the prompt.
3. **Re-run the backfill script** if the suspicion is that a recent migration or trigger change left progress rows stale.
4. **Open Supabase MCP** (set `SUPABASE_ACCESS_TOKEN`, fix the `cmd /c npx` command for macOS) so the next Phase A on this machine can actually query the DB.

End of re-discovery.
