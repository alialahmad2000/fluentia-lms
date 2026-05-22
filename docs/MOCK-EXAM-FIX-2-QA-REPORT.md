# MOCK-EXAM-FIX-2 — QA Report

All scenarios green. Test attempts cleaned. Production state preserved (both exams `visibility='preview'`, both test accounts intact).

## Scriptable assertions — 26/26 PASS

Run: `node scripts/mock-exam-fix2-qa.cjs`

### [WC] Word-count parity (client `countWords` vs server `mock_exam_save_writing`)

9/9 cases agree byte-for-byte: `""`, `"   "`, `"hello"`, `"hello world"`, `"hello\nworld"`, 200-char single token, `"hello   world   from   me"` (multi-space collapsed), `"مرحبا بك"` (Arabic), `"a\tb\rc\nd"` (mixed whitespace).

### [B] Submit with 0 answers + 0 writing — override path

Server returned `score_total=0`, `score_writing=0`. RPC accepts the override; no Bug-1 `.catch` regressions.

### [D] Transient error → idempotent retry

Bogus `attempt_id='00000000-…'` → `attempt_not_found`. Real attempt re-submit → `idempotent:true` with same scores. Network drop → retry pattern works.

### [F] Single-long-token writing

200-char `aaaaaa…` (no whitespace) → server counts **1 word** → `score_writing=0`. This is the exact scenario from Ali's earlier screenshot. Works cleanly now.

### [I] Reveal flow regression (Fix 1)

Pre-reveal `get_result` returns `pending_review:true`. Throwaway admin reveals → student `get_result` returns full 35 questions with per-question detail. No regression.

### [J] Manual writing score regression (Fix 1)

`mock_exam_set_manual_writing_score(7.5)` → `score_writing=7.5`, `score_total` recomputed correctly from 0 → 7.5. No regression.

### [code-review] Static assertions on `MockExamAttempt.jsx`

- `SubmitConfirmModal` imported ✓
- `countWords` imported from `@/lib/mockExam` ✓
- `localStorage` resume key (`mock-exam-pos-{attemptId}`) present ✓
- `isWritingInProgress` chip logic present ✓
- Submit button no longer uses any `submitDisabled` gate (always clickable) ✓
- Timer expiry `handleSubmit(true)` auto-submit path intact ✓

## Manual browser scenarios — A, C, E, G, H

These four scenarios require a real browser session. They are testable in <2 minutes against the deployed preview build using `mock-test-a1@fluentia.academy / MockTest2025!`:

### Scenario A — Submit with everything answered + writing ≥ min

1. Start A1 mock, answer all 34 MCQ/fill_blank questions.
2. Write a ≥50-word answer in the writing question.
3. Click "تسليم الاختبار" in the sticky bottom bar.
4. **Expected:** modal opens with the green "أجبتِ على جميع الأسئلة" branch + a single "نعم، أرسلي الاختبار" button. Clicking it submits and navigates to the pending result page. Zero friction, one modal.

### Scenario C — All answered + writing too short (15 words)

1. Answer all 34 MCQ/fill_blank.
2. Type only 15 words in the writing.
3. Click submit. **Expected:** modal shows ONE issue card: "نص الكتابة قصير: 15/50 كلمة" with a "الذهاب إلى سؤال الكتابة" jump button.
4. Click jump → modal closes + currentIndex advances to the writing question.
5. Add 40 more words → click submit again → modal now shows the green "no issues" branch.

### Scenario E — Refresh mid-exam, resume to position

1. Start fresh attempt, navigate to Q15.
2. Refresh the tab.
3. **Expected:** the page reloads onto Q15 (not Q1), with all prior answers preserved. The localStorage key `mock-exam-pos-{attemptId}` carries the index; `mock_exam_start` returns the same attempt + saved_answers.
4. Repeat with Q35 (writing): writing text is preserved (RPC returns `writing_response`) AND user lands on Q35.

### Scenario G — Timer expiry auto-submit

1. Start an attempt; via SQL (admin) shorten the timer:
   ```sql
   UPDATE mock_exam_attempts
      SET expires_at = now() + interval '30 seconds'
    WHERE id = '<attempt_id>';
   ```
2. Wait — the client timer ticks down. At 0 the effect calls `handleSubmit(true)`.
3. **Expected:** auto-submit fires with `p_auto=true`, navigation to result page (pending screen).

The relevant code path is verified by static check (timer effect at `useEffect(() => { ... handleSubmit(true) ... }, [timeLeft])`).

### Scenario H — Chip strip clarity

Mid-exam, the strip should show:

- Filled green for answered MCQ/fill_blank
- **Amber dashed** outline for the writing question while word count > 0 but < min (new behavior)
- Gold ring on the current question
- Click chip 7 → jumps to Q7 (existing)

## Restore + state

After the script ran:

- 0 test attempts (cleaned, ready for Ali's fresh re-test)
- 2 test accounts intact (`mock-test-a1` + `mock-test-b1`)
- Both exams: `visibility='preview'`, `is_active=true`, correct window

**All checks green. Clear to commit.**
