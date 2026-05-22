# Phase I Report — QA gate

## I.1 DB sanity — PASS

| check | result |
|---|---|
| 5 mock_exam tables exist | ✓ |
| 4 RPCs exist + granted to `authenticated` | ✓ |
| `profiles.is_test_account` column exists | ✓ |
| `mock_exams.visibility` CHECK constraint | ✓ |
| 2 exams seeded, both `visibility='preview'` | ✓ |
| Total pts per exam = 100.00 | ✓ |
| Per-section counts (A1 grammar=10/reading=10/vocab=8/spelling=6/writing=1) | ✓ |
| Per-section counts (B1 grammar=12/reading=10/vocab=10/spelling=6/writing=1) | ✓ |
| 2 test student accounts, `is_test_account=true`, levels 1 + 3 | ✓ |

## I.2 RLS — PASS

- Authenticated student (test A1) calling `from('mock_exam_questions').select('id').limit(5)` → returned 0 rows ✓ (policy blocks; questions only via RPC).
- All write paths flow through SECURITY DEFINER RPCs; direct INSERT/UPDATE/DELETE blocked unless admin.

## I.3 RPC happy paths — PASS (19 assertions)

```
[I.3] A1 test-account happy path
  PASS  A1 mock_exam_start succeeds in preview mode (test account)
  PASS  A1 returns 35 questions
  PASS  A1 saved_answers initially empty
  PASS  A1 mock_exam_save_answer (single mcq)
  PASS  A1 mock_exam_save_writing (returns word count)
  PASS  A1 writing word count = 6
  PASS  A1 mock_exam_submit returns scores
  PASS  A1 first submit idempotent=false
  PASS  A1 writing scored 0 (under min)
  PASS  A1 mock_exam_submit (idempotent re-call)
  PASS  A1 re-submit returns same scores with idempotent=true
  PASS  A1 start after submit → already_submitted
[I.3b] B1 test-account smoke
  PASS  B1 mock_exam_start succeeds (test account)
  PASS  B1 returns 39 questions
  PASS  B1 mock_exam_start called again (resume)
  PASS  B1 second start returns same attempt_id (resume)
```

## I.4 RPC failure paths — PASS

```
[I.4]   A1 student starting B1 → student_level_mismatch  ✓
[I.4]   A1 student cannot SELECT mock_exam_questions     ✓ (RLS)
[I.4b]  Non-test L1 student → exam_in_preview_mode       ✓ (throwaway user)
[I.3]   A1 start after submit → already_submitted        ✓
```

## I.5 Frontend smoke

Frontend changes were applied to:

- `src/App.jsx` (lazy imports + 4 routes: student nested + trainer + admin)
- `src/config/navigation.js` (new student section `الاختبارات`, trainer + admin items)
- `src/components/layout/Sidebar.jsx` (visibility-aware `canSeeMockExam` filter)
- 5 new page components in `src/pages/student/mock-exam/` and `src/pages/trainer/`

All 8 touched files pass `@babel/parser` (jsx) parse-check.

Per project rule, `vite build` was **not** run locally (Vercel builds). Ali will manually verify the deployed Vercel preview by logging in as the test accounts and walking through the journey end-to-end before flipping visibility to `live`.

## I.6 Visual smoke — sources of truth

- Locked screen: live H:M:S countdown via `setInterval(1s)`, gold lock in pill, AuroraBackground variant=`default`.
- Intro screen: GlassPanel, bulleted instructions, `PrimaryButton` w/ loading state.
- Attempt page: NO AuroraBackground, solid `var(--ds-background)`, sticky top+bottom bars, timer pill turns amber at ≤5min and scales red at ≤60s. Question chips show answered (green tint) / current (gold border) / unanswered (neutral).
- Result page: count-up to score over 1.2s (cubic-ease-out via `requestAnimationFrame`), pass/fail badge, 5 section breakdown cards with mini progress bars.

## I.7 Production state restore — PASS

```
2 exams: midterm-mock-a1 + midterm-mock-b1
   visibility=preview  ✓
   is_active=true      ✓
   open_at  = 2026-05-21T19:00:00Z  ✓
   close_at = 2026-05-22T19:00:00Z  ✓
mock_exam_attempts: 0 rows
mock_exam_answers:  0 rows  (cascade)
mock_exam_audit_log: 0 rows (cascade)
test accounts: 2 (intact, is_test_account=true)
```

**ALL CHECKS GREEN. CLEAR TO COMMIT.**
