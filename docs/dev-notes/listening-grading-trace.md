# Listening Grading — Bug Trace

## Architecture

Listening MCQ is handled entirely in `src/pages/student/curriculum/tabs/ListeningTab.jsx` — the `ListeningExercises` component.

**Flow:**
1. Student selects answers → autosave fires (INSERT/UPDATE with `status='in_progress'`)
2. All questions answered → submit button activates
3. Student clicks submit → confirmation dialog
4. Student confirms → `handleConfirmSubmit` → `saveProgress(answers, true)`
5. DB UPDATE/INSERT with `status='completed'` + score
6. Recompute `is_best` flags
7. `setIsCompleted(true)` → score displayed inline
8. `window.dispatchEvent('fluentia:activity:complete')` → `UnitContent.jsx` starts 2.5s navigation timer

## Bug: Page hangs without revealing scores/corrections

### Root cause

`handleConfirmSubmit` sets `hasSaved.current = true` **before** the async `saveProgress` call:

```js
const handleConfirmSubmit = useCallback(() => {
  setConfirmOpen(false)
  hasSaved.current = true       // ← SET BEFORE DB COMPLETES
  saveProgress(answers, true)   // ← async, can fail silently
}, [answers, saveProgress])
```

If `saveProgress` fails (network timeout, DB error, RLS issue), it returns early with `console.error` — `setIsCompleted(true)` is never called. The UI enters limbo:
- `hasSaved.current = true` → `handleFinish` returns immediately on click (no action)
- `isCompleted = false` → score display never appears
- No loading spinner, no error toast
- Submit button appears enabled but does nothing

**Result:** Student sees their answered questions, button appears active, nothing happens on click → appears to "hang."

### Secondary cause: no loading state

Between dialog close and `setIsCompleted(true)`, there's no visual indicator (spinner/loading). Students immediately try to click submit again and nothing happens.

### Secondary cause: navigation timer races with feedback display

The `UnitContent.jsx` handler starts a 2.5s countdown on `fluentia:activity:complete`. `setIsCompleted(true)` is called BEFORE dispatching the event, so the score appears before navigation. However 2.5s is insufficient to review per-question correctness details.

## Affected students
1 student has a listening row in `in_progress` status with non-null answers — confirmed stuck in limbo from a failed submit.

## No edge function involved
Listening MCQ grading is 100% client-side. No Supabase Edge Function needed. Score is calculated in `saveProgress`: `Math.round((correct / total) * 100)`. The feedback display (`isCorrect` per question, `explanation_ar`) is rendered from the already-loaded `exercises` data and the `answers` state — available immediately after `setIsCompleted(true)`.
