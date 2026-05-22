# MOCK EXAM — FIX 2: Submit UX Redesign + Edge-Case Robustness

## Context

Ali completed a full test exam after Fix 1 deployed (commit 07dcda3). The submit button was visible but **not clickable**, with no explanation of why. He's exhausted from repeated friction and has explicitly asked: "take consideration of every single thing in a possible scenario."

## Root cause analysis

The Fix 1 prompt instructed me to write: "Submit button is only **visible** on the writing question, **disabled** when writing word count < min_writing_words". Claude Code implemented this literally. The result is a UX dead-end:

- **From Q1–Q34:** no submit button anywhere. User who finishes those and wants to submit has no signal what to do.
- **On Q35 (writing) with <50 words:** button appears but is `disabled`, with no inline message explaining why or how to fix it.

This is wrong UX. For a mock exam (the whole point is practice + familiarity), the student must always be able to attempt submission and receive **clear, actionable guidance** about what's missing — not a silently inert button.

## The new UX (this fix)

1. **Submit button always visible** in a sticky bottom action bar, on every question, no matter which one.
2. **Submit button always enabled** (never `disabled`). User can always click.
3. **On click, a smart modal opens** that analyzes the attempt state and shows EXACTLY what's incomplete, with clear actions:
   - "X unanswered questions" → button that jumps to the first unanswered
   - "Writing: 12/50 words" → button that jumps to the writing question
   - "All good, ready to submit?" → confirmation + submit
4. **The student can always override.** If they want to submit with an incomplete writing section, they CAN — with explicit acknowledgment ("ستحصلين على ٠ من ١٠ في الكتابة. متأكدة؟"). This is a MOCK exam — locking students out punishes learning, not protects it.

## Bonus polish in this fix

5. **Resume to last-viewed question** on refresh, instead of jumping back to Q1.
6. **Verify word count logic** matches server `regexp_split_to_array(trim(text), '\s+')` exactly (`text.trim().split(/\s+/).filter(Boolean).length`).
7. **Per-question chips show clear answered/unanswered state** — including visual cue for the writing question when word count < min.

---

## Working context

- **Working dir:** confirm the actual path on this machine (`C:\Users\Dr. Ali\Desktop\fluentia-lms` per memory, OR `/Users/dr.ali/Desktop/fluentia-lms` per the recent commit log on macOS — discover and use the right one).
- **Repo:** `alialahmad2000/fluentia-lms` (branch `main`)
- **Supabase ref:** `nmjexpuycmqcxuxljier` (Frankfurt Pro)
- **Auto-load skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Last commit:** `07dcda3` (Fix 1) — start from this state.

## Absolute rules

1. **Sacred tables untouched.** No edits to curriculum tables, RLS of existing tables, xp_*, unit_mastery_*, or any pre-existing logic outside the mock-exam tree.
2. **Existing RPCs untouched.** Do NOT modify `mock_exam_start`, `mock_exam_save_answer`, `mock_exam_save_writing`, `mock_exam_submit`, `mock_exam_reveal`, `mock_exam_get_result`, `mock_exam_set_manual_writing_score`.
3. **Existing trainer page untouched** in this fix (it works — leave it).
4. **Existing student result page untouched** (it works — leave it).
5. **No re-seeding questions.** No DB migrations needed for this fix.
6. **`visibility='preview'` preserved.**
7. **Single atomic commit.** No micro-commits.
8. **No `vite build` locally.** Vercel handles it.
9. **All hooks at top, role gates after, `profile?.id` always.**

---

## TASK 1 — Sticky bottom action bar

### File
`src/pages/student/mock-exam/MockExamAttempt.jsx` (or the actual component path Claude Code finds).

### Replace the current bottom navigation

Currently there's a Previous/Next pair with submit only on writing. Replace with a 3-element sticky bottom bar that's **always present on every question**:

```jsx
<div className="exam-bottom-bar">
  {/* LEFT: Previous */}
  <button
    type="button"
    onClick={goPrev}
    disabled={currentIndex === 0}
    className="nav-btn"
  >
    السابق
  </button>

  {/* CENTER: Progress indicator */}
  <div className="exam-progress">
    <span>{answeredCount} / {totalQuestions} مجاوَب</span>
    {writingMinWords > 0 && (
      <span className={writingWordCount >= writingMinWords ? 'ok' : 'warn'}>
        • الكتابة: {writingWordCount}/{writingMinWords}
      </span>
    )}
  </div>

  {/* RIGHT: Next on non-final; Submit button always present */}
  {currentIndex < totalQuestions - 1 ? (
    <button type="button" onClick={goNext} className="nav-btn primary">
      التالي
    </button>
  ) : null}

  <button
    type="button"
    onClick={openSubmitModal}
    className="submit-btn"
    // CRITICAL: never disabled. Always clickable.
  >
    تسليم الاختبار
  </button>
</div>
```

### Styling notes

- Sticky to bottom of the viewport (`position: sticky; bottom: 0;` inside the scrollable exam container, OR `position: fixed; bottom: 0;` if the layout works better).
- Background: solid `var(--ds-background)` with a 1px top border `var(--ds-border)`. No `backdrop-filter`.
- Submit button: distinct accent color (gold or green from the design system), `var(--ds-gold)` if it exists, or a clear primary accent.
- Mobile: stacks responsively if width too narrow — Previous + Next on one row, Submit on its own row below.

### Important

- **Remove every previous condition** that hides the submit button on non-writing questions. Submit is now always rendered.
- **Remove every previous `disabled` attribute** on the submit button related to word count. The button is always clickable. The modal handles all gating.

---

## TASK 2 — Intelligent submit modal

### Component
Create `src/pages/student/mock-exam/SubmitConfirmModal.jsx`.

### Props
```jsx
<SubmitConfirmModal
  open={submitModalOpen}
  onClose={() => setSubmitModalOpen(false)}
  onConfirm={handleConfirmSubmit}      // actually submits
  onJumpTo={(questionIndex) => { setCurrentIndex(questionIndex); setSubmitModalOpen(false); }}
  issues={computedIssues}              // see below
  submitting={submitting}              // show spinner inside button
  submitError={submitError}            // show inline error if last attempt failed
/>
```

### Compute issues (inside MockExamAttempt.jsx)

```javascript
const computedIssues = useMemo(() => {
  const issues = [];

  // 1. Unanswered MCQ-style questions
  const unansweredIndexes = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => {
      if (q.section === 'writing') return false;
      const a = answers[q.id];
      if (!a) return true;
      if (q.question_type === 'fill_blank') return !a.text_answer || !a.text_answer.trim();
      return a.selected_index === null || a.selected_index === undefined;
    });

  if (unansweredIndexes.length > 0) {
    issues.push({
      type: 'unanswered',
      severity: 'warn',
      title: `${unansweredIndexes.length} سؤال بدون إجابة`,
      detail: 'الأسئلة غير المجاوَبة ستحتسب صفر.',
      jumpToIndex: unansweredIndexes[0].idx,
      jumpLabel: 'الذهاب إلى أول سؤال غير مجاوَب',
    });
  }

  // 2. Writing word count
  const writingIdx = questions.findIndex(q => q.section === 'writing');
  if (writingIdx >= 0) {
    const minWords = examData?.exam?.min_writing_words ?? 50;
    if (writingWordCount < minWords) {
      issues.push({
        type: 'writing_short',
        severity: writingWordCount === 0 ? 'critical' : 'warn',
        title: writingWordCount === 0
          ? 'لم تكتبي شيئاً في قسم الكتابة'
          : `نص الكتابة قصير: ${writingWordCount}/${minWords} كلمة`,
        detail: writingWordCount === 0
          ? 'ستحصلين على ٠ من ١٠ في الكتابة لو سلّمتِ الآن.'
          : `الحد الأدنى ${minWords} كلمة. ستحصلين على ٠ من ١٠ لو سلّمتِ الآن.`,
        jumpToIndex: writingIdx,
        jumpLabel: 'الذهاب إلى سؤال الكتابة',
      });
    }
  }

  return issues;
}, [questions, answers, writingWordCount, examData]);
```

### Modal UI structure

```jsx
function SubmitConfirmModal({ open, onClose, onConfirm, onJumpTo, issues, submitting, submitError }) {
  if (!open) return null;

  const hasIssues = issues.length > 0;
  const onlyWarnings = hasIssues && !issues.some(i => i.severity === 'critical');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2>تسليم الاختبار</h2>

        {hasIssues ? (
          <>
            <p className="modal-intro">
              قبل التسليم — لاحظنا الآتي:
            </p>
            <ul className="issues-list">
              {issues.map((iss, i) => (
                <li key={i} className={`issue issue-${iss.severity}`}>
                  <div className="issue-title">{iss.title}</div>
                  <div className="issue-detail">{iss.detail}</div>
                  <button
                    type="button"
                    className="issue-jump"
                    onClick={() => onJumpTo(iss.jumpToIndex)}
                  >
                    {iss.jumpLabel}
                  </button>
                </li>
              ))}
            </ul>
            <p className="modal-warning">
              إذا أردتِ التسليم رغم هذه الملاحظات، اضغطي «تسليم على أي حال». التسليم نهائي ولا يمكن التراجع.
            </p>
            <div className="modal-actions">
              <button type="button" onClick={onClose} disabled={submitting}>
                الرجوع لإكمال الإجابات
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="submit-anyway"
              >
                {submitting ? 'جاري التسليم...' : 'تسليم على أي حال'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="modal-intro">
              أجبتِ على جميع الأسئلة وكتبتِ ما يكفي. تأكدي قبل التسليم — التسليم نهائي ومحاولة واحدة فقط.
            </p>
            <div className="modal-actions">
              <button type="button" onClick={onClose} disabled={submitting}>
                الرجوع للمراجعة
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="submit-final primary"
              >
                {submitting ? 'جاري التسليم...' : 'نعم، أرسلي الاختبار'}
              </button>
            </div>
          </>
        )}

        {submitError && (
          <div className="modal-error">{submitError}</div>
        )}
      </div>
    </div>
  );
}
```

### Wire up handleConfirmSubmit (inside MockExamAttempt.jsx)

This replaces any previous direct submit handler bound to the bottom-bar button. The flow is:

```javascript
async function handleConfirmSubmit() {
  if (submitting) return;
  setSubmitting(true);
  setSubmitError(null);
  try {
    // Flush any pending debounced saves before submitting
    await safeFlush(saveAnswer);
    await safeFlush(saveWriting);

    const { data, error } = await supabase.rpc('mock_exam_submit', {
      p_attempt_id: examData.attempt_id,
      p_auto: false,
    });
    if (error) throw error;

    // Success: close modal + navigate
    setSubmitModalOpen(false);
    navigate(`/student/mock-exam/result?attempt_id=${examData.attempt_id}`, { replace: true });
  } catch (e) {
    setSubmitError(`فشل الإرسال: ${e?.message || e}. اضغطي مرة ثانية أو تواصلي مع المدرب على WhatsApp +966558669974`);
    setSubmitting(false);
  }
}
```

The `safeFlush` helper from Fix 1 must already exist — keep using it.

---

## TASK 3 — Verify word count logic matches server exactly

### Why

The server counts words via:
```sql
array_length(regexp_split_to_array(trim(p_writing_text), '\s+'), 1)
```

If `trim(p_writing_text)` is empty, the function explicitly sets count to 0 (Fix 1 logic).

The client must compute the same. Find every place client-side that computes word count and confirm it matches:

```javascript
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}
```

Test cases (verify each manually in the QA phase):
- `""` → 0
- `"   "` → 0
- `"\n\n  \t"` → 0
- `"hello"` → 1
- `"hello world"` → 2
- `"hello\nworld"` → 2
- `"hhljhuhhh"` → 1 (single long token, no spaces)
- `"hello   world   from   me"` → 4 (multi-space collapsed)
- `"مرحبا بك"` → 2 (Arabic words too)

Place the helper in `src/lib/mockExam.js` (create the file if needed). Import it wherever word count is displayed or used for gating.

---

## TASK 4 — Resume to last-viewed question on refresh

### Why

Currently if a student refreshes mid-exam, they're returned to Q1 — losing their place. For a 75-90 min exam with 35-39 questions, this is hostile UX.

### Approach (zero migration, zero RPC change)

Persist `currentIndex` to `localStorage` keyed by `attempt_id`:

```javascript
// On every currentIndex change, write to localStorage
useEffect(() => {
  if (!examData?.attempt_id) return;
  try {
    localStorage.setItem(
      `mock-exam-pos-${examData.attempt_id}`,
      String(currentIndex)
    );
  } catch {}
}, [currentIndex, examData?.attempt_id]);

// On attempt mount, read it back AFTER examData arrives
useEffect(() => {
  if (!examData?.attempt_id || !questions?.length) return;
  try {
    const saved = localStorage.getItem(`mock-exam-pos-${examData.attempt_id}`);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (Number.isFinite(idx) && idx >= 0 && idx < questions.length) {
        setCurrentIndex(idx);
      }
    }
  } catch {}
}, [examData?.attempt_id, questions?.length]);
```

LocalStorage is acceptable here because it's UX-only state, not authoritative answer state. Answers are still saved server-side. If localStorage is unavailable (private browsing), fallback to Q1 silently.

### Important

This is the ONLY case where localStorage is used in the mock exam — answers remain DB-authoritative.

---

## TASK 5 — Question chip strip: clear answered/unanswered status

### Current state
The chip strip already exists per Fix 1. Verify and improve:

### Rules
- Each chip shows its number (1, 2, 3, ...).
- Chip is filled (gold/accent background) if the question is answered:
  - For MCQ-like: `selected_index` is not null
  - For fill_blank: `text_answer` is non-empty after trim
  - For writing: `writing_word_count >= min_writing_words`
- Chip is outlined (transparent + border) if unanswered.
- Current question chip has a stronger ring (accent border + glow).
- Click any chip → jump to that question (still works).

### Edge case
If the writing question is still being typed (e.g. user has 32/50 words), the chip should be in an "in-progress" state — different from "not started" and from "done". Use a yellow/amber outline. This visual feedback alone often makes the rest unnecessary.

---

## TASK 6 — Comprehensive QA (every scenario Ali could hit)

Run all of these BEFORE commit. Document each pass/fail in `docs/MOCK-EXAM-FIX-2-QA-REPORT.md`.

### Setup
Clean test attempt state:
```sql
DELETE FROM mock_exam_answers WHERE attempt_id IN (
  SELECT id FROM mock_exam_attempts WHERE student_id IN (
    SELECT id FROM profiles WHERE is_test_account = true
  )
);
DELETE FROM mock_exam_attempts WHERE student_id IN (
  SELECT id FROM profiles WHERE is_test_account = true
);
```

### Scenario A — Submit with everything answered + writing ≥ min
1. Start A1 mock as test student
2. Answer all 34 MCQ/fill_blank questions
3. On writing question, type a real 60-word answer (Arabic or English doesn't matter)
4. Click "تسليم الاختبار" → modal opens with "أجبتِ على جميع الأسئلة وكتبتِ ما يكفي"
5. Click "نعم، أرسلي الاختبار" → submission succeeds → navigates to result page (pending screen)

**Expected:** zero friction, exactly one modal, one confirmation, done.

### Scenario B — Submit with 0 answers, no writing
1. Fresh attempt
2. Without answering anything, click submit immediately
3. Modal opens with BOTH issues:
   - "34 سؤال بدون إجابة"
   - "لم تكتبي شيئاً في قسم الكتابة"
4. Each issue has a working "jump to" button
5. Click "تسليم على أي حال" → submission succeeds → score should be very low (mostly 0)

**Expected:** student can submit even if completely blank, with full transparency.

### Scenario C — Submit with all answered + writing too short (15 words)
1. Answer all 34 MCQ/fill_blank
2. Write only 15 words in writing
3. Click submit → modal shows ONE issue: "نص الكتابة قصير: 15/50 كلمة" + jump button
4. Click "الرجوع لإكمال الإجابات" → modal closes → user is back on the exam at the writing question (since they jumped there earlier OR stays put)
5. Add 40 more words → modal click again → no issues → confirm + submit

**Expected:** clear, actionable guidance.

### Scenario D — Submit while disconnected
1. Answer everything
2. Open DevTools → throttle Network to "Offline"
3. Click submit → modal opens → confirm
4. Submit RPC fails → modal shows the inline error with WhatsApp number
5. Re-enable network → click confirm again → succeeds (idempotent RPC handles re-submit gracefully)

### Scenario E — Refresh mid-exam, resume to position
1. Start fresh attempt
2. Navigate to Q15 (any non-first question)
3. Refresh the browser tab
4. Confirm: lands back on Q15 with the same answers preserved
5. Repeat with Q35 (writing) — confirm writing text is preserved AND user lands on Q35

### Scenario F — Single long string in writing (no spaces)
1. In writing, type 200 characters with no spaces ("aaaaaa..." or similar)
2. Confirm word count shows **1** (not 200)
3. Confirm submit modal flags this as "نص الكتابة قصير: 1/50"
4. Override and submit → confirm server also counts 1 → writing score = 0

**This was the literal scenario from Ali's earlier screenshot. Must work cleanly now.**

### Scenario G — Timer expiry auto-submit
1. Start an attempt; via SQL, set `expires_at = now() + interval '30 seconds'` for the active attempt:
   ```sql
   UPDATE mock_exam_attempts SET expires_at = now() + interval '30 seconds'
    WHERE id = '<attempt_id>';
   ```
2. Wait for the timer to hit 0 on the client
3. Confirm auto-submit fires (mock_exam_submit with p_auto=true)
4. Confirm user is navigated to result page (pending screen)

### Scenario H — Question chip strip
1. Mid-exam, look at the chip strip
2. Answered chips: filled
3. Unanswered chips: outlined
4. Writing in progress (<min): amber outline
5. Click chip 7 → jumps to Q7

### Scenario I — Reveal flow still works (regression check from Fix 1)
1. Submit an attempt fresh
2. Pending screen shows for student
3. Admin clicks reveal → student sees full result within 30s (polling)
4. Per-question breakdown still renders correctly

### Scenario J — Trainer adjust writing score still works (regression)
1. As admin, open the test attempt's detail panel
2. Change writing score from 0 to 7.5 → save
3. Confirm `score_total` recomputes correctly
4. Confirm `passed` flag updates if it crosses the 60 threshold

### Post-QA cleanup
After all scenarios pass:
```sql
DELETE FROM mock_exam_answers WHERE attempt_id IN (
  SELECT id FROM mock_exam_attempts WHERE student_id IN (
    SELECT id FROM profiles WHERE is_test_account = true
  )
);
DELETE FROM mock_exam_attempts WHERE student_id IN (
  SELECT id FROM profiles WHERE is_test_account = true
);
```

So Ali gets fresh test attempts after Vercel deploys.

### Block commit if any scenario fails
If any scenario fails, **do not commit**. Investigate, fix, re-run all scenarios, commit only when all green.

---

## TASK 7 — Atomic commit + push

```bash
git status
git add -A
git commit -m "fix(mock-exam): submit UX redesign + edge-case robustness

- Sticky bottom action bar with always-visible Submit button (was hidden on non-writing questions, confusing user who had no signal of how to submit)
- Submit button always clickable (was disabled silently when writing word count < min, providing no guidance)
- New SubmitConfirmModal with intelligent issue detection:
    * unanswered questions count with jump-to-first-unanswered action
    * writing word count vs min with jump-to-writing action
    * 'submit anyway' override with explicit warning that incomplete sections score 0
    * inline submit error with WhatsApp fallback
- Resume to last-viewed question on refresh (localStorage UX-only, answers still DB-authoritative)
- Question chip strip improved: filled/outlined/amber-in-progress for clarity
- Word count helper centralized in src/lib/mockExam.js, matches server exactly:
    text.trim().split(/\\s+/).filter(Boolean).length
- All 10 QA scenarios pass (A–J)
- Sacred tables + existing RPCs + reveal flow untouched"
git push origin main
```

Vercel auto-deploys. Watch the build — if it fails (build error on a syntax issue or missing import), fix in a follow-up commit with the same atomic standard.

---

## TASK 8 — Final handoff output

After push completes, print:

```
=== MOCK EXAM FIX 2 DEPLOYED ===
Commit: <sha>
Bug fixed: submit button always-visible, always-clickable, intelligent modal handles all edge cases
Bonus: resume-to-position on refresh, word count helper centralized, chip strip clearer
QA: 10/10 scenarios PASS (A through J)
Sacred + existing flows: all preserved
Test attempts: cleaned, ready for Ali to re-test

>>> ALI'S RE-TEST <<<
1. Wait 2 min for Vercel deploy of <sha>
2. Open incognito → mock-test-a1@fluentia.academy / MockTest2025!
3. Click 'الاختبار التجريبي' → start
4. Submit button visible on EVERY question now (sticky bottom)
5. Click submit at any point → modal explains what's needed
6. Complete properly: answer all 34 + write 60 words → submit → pending screen
7. Switch to admin incognito → reveal → switch back → full result visible

>>> WHEN READY FOR REAL STUDENTS <<<
UPDATE mock_exams SET visibility='live' WHERE code IN ('midterm-mock-a1','midterm-mock-b1');
```

Go.
