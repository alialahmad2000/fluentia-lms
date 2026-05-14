# Progress Tracking — Diagnosis (Phase A)

## Root causes

### Bug 1: Unit completion stuck < 100% (specifically: speaking completion missing)

**ROOT CAUSE:** `handleUploadComplete` in `src/pages/student/curriculum/tabs/SpeakingTab.jsx:90–120` inserts/updates the `student_curriculum_progress` speaking row with **zero error handling**. If the INSERT or UPDATE fails (silent), no row is written. `useUnitProgress` then finds no `section_type='speaking'` row → speaking = 0% → unit never reaches 100%.

**EVIDENCE:**
- 4 students confirmed with rows in `speaking_recordings` (actual audio submitted) but no corresponding `student_curriculum_progress` row with `section_type='speaking' AND status='completed'`
- The `handleUploadComplete` INSERT/UPDATE has no `{ error }` destructuring or toast/logging on failure
- `useUnitProgress` query `.neq('is_best', false)` correctly finds completed rows — the problem is the rows were never written

**FIX STRATEGY:** Wrap the INSERT/UPDATE in proper error handling; add toast on failure; add `queryClient.invalidateQueries` for `unit-progress-comprehensive` after successful write.

---

### Bug 2: Speaking submission not marking section complete (same root cause as Bug 1)

**ROOT CAUSE:** Same as above — `handleUploadComplete` silent failure leaves no progress row.

**ADDITIONAL ISSUE:** After a successful write, `window.dispatchEvent('fluentia:activity:complete')` fires but `UnitContent.jsx` only uses this to navigate back — it does NOT call `queryClient.invalidateQueries` for the progress query. So even successful writes take up to 60s (staleTime) to appear in the UI.

**EVIDENCE:** `UnitContent.jsx:244–252` — the `handleActivityComplete` handler only calls `handleBackToGrid()` with a 2.5s delay; no progress cache invalidation.

**FIX STRATEGY:** In `handleUploadComplete`, after successful DB write, call `queryClient.invalidateQueries({ queryKey: ['unit-progress-comprehensive', studentId, unitId] })`.

---

### Bug 3: Listening submitted but no feedback shown

**ROOT CAUSE:** In `src/pages/student/curriculum/tabs/ListeningTab.jsx:712–716` (`handleConfirmSubmit`):

```js
hasSaved.current = true       // SET BEFORE async DB call
saveProgress(answers, true)   // can fail silently
```

If `saveProgress` fails (any reason), it returns early without calling `setIsCompleted(true)`. Because `hasSaved.current = true` was already set, the submit button becomes a no-op. The page appears frozen — answers shown, button visible but unresponsive.

**EVIDENCE:**
- 1 student confirmed with `section_type='listening'`, `status='in_progress'`, non-null answers — exact signature of a failed submit
- `saveProgress` error paths: both UPDATE-fail (line 582) and INSERT-fail (line 652) do `console.error + return` before `setIsCompleted(true)`
- No loading spinner or error toast in the failure path

**FIX STRATEGY:**
1. Move `hasSaved.current = true` to INSIDE `saveProgress` after successful DB write
2. Add `submitting` state with spinner during async call
3. On DB failure: show error toast, reset `hasSaved.current = false` so student can retry

---

## Affected students (DB-confirmed as of 2026-05-14)

| Bug | Count |
|---|---|
| Speaking recordings without progress row | 4 students |
| Listening stuck in limbo (in_progress with answers) | 1 student |

## Hawazin's actual state

Hawazin (profile `050ebad7`) has NOT submitted speaking or listening for either of her two active units. Her units are at 38% and 46% because she genuinely hasn't completed those sections — not because of a bug. However, she IS the typical student profile for Bug 1 (if she records speaking, the progress row may not be written).

See `hawazin-diagnosis.md` for full breakdown.
