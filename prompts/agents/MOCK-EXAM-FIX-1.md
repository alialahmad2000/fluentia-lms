# MOCK EXAM — FIX 1: Submit Bug + Question Instructions + Trainer-Controlled Reveal

## Context

The mock exam was just deployed (commits 3c2a494 → 10d3171). Ali tested on the test student account and found three issues that block launch:

**Bug 1 (blocker):** Submit fails with `f.rpc(...).catch is not a function`. Root cause: Supabase v2's `.rpc()` returns a thenable (`PostgrestBuilder`), not a full Promise — chaining `.catch()` directly doesn't work. Need try/catch + destructured `{ data, error }` everywhere.

**Bug 2:** `error_detection` questions render the stem with `[1] [2] [3] [4]` markers but no instruction. Student sees the sentence with cryptic numbers and 4 options labelled A/B/C/D — confusing. Other question types (`true_false`, `true_false_ng`, `fill_blank`) also lack contextual instructions.

**Feature 3 (Ali explicitly requested):** Trainer-controlled reveal. After submit, the student should NOT see their score immediately. Instead:
- Student sees a "تم استلام إجابتك — النتيجة قيد المراجعة" pending screen
- Trainer sees full per-question detail (their answer, correct answer, ✓/✗, writing text) in the existing trainer results page
- Trainer can adjust the writing score manually (since auto-grade only checks word count)
- Trainer clicks "Reveal" (per attempt) OR "Reveal all" (per exam) → student's pending screen flips to the full enriched result with breakdown + per-question feedback

You will fix all three in one atomic commit.

**Working dir:** `C:\Users\Dr. Ali\Desktop\fluentia-lms` (or wherever the repo lives on this machine — discover if path differs)
**Repo:** `alialahmad2000/fluentia-lms` (branch `main`)
**Supabase ref:** `nmjexpuycmqcxuxljier` (Frankfurt Pro)
**Auto-load skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`

---

## Absolute rules

1. **Do not touch sacred tables / existing curriculum / unit_mastery_* / xp_* / RLS of existing tables.**
2. **Do not re-seed questions.** The 35+39 questions are already in `mock_exam_questions` and correct. Leave them.
3. **Do not change `mock_exam_start` / `mock_exam_save_answer` / `mock_exam_save_writing` / `mock_exam_submit` RPCs.** Add new RPCs alongside them.
4. **All new DB work in a single idempotent migration.**
5. **`visibility='preview'` stays.** Ali still has not gone live; the test accounts are the only consumers.
6. **Hooks at top, role gates after hooks, `profile?.id` always.**
7. **No `vite build` locally** — Vercel handles builds.
8. **Single atomic commit at the end.**

---

## TASK 1 — Fix the `.catch` submit bug

### Scope

Find every spot in `src/pages/student/mock-exam/**` (and any other file under the mock-exam tree) where `supabase.rpc(...)` is followed by `.catch(...)`. Replace with the safe pattern.

### The broken pattern (DO NOT use)

```javascript
// ❌ BROKEN — supabase.rpc returns a PostgrestBuilder, not a Promise.
// .catch() does not exist on it.
supabase.rpc('mock_exam_save_answer', { ... }).catch(() => {});

// ❌ ALSO BROKEN — same issue if you chain .catch on the rpc result.
await supabase.rpc('foo', {}).catch(e => console.log(e));

// ❌ ALSO BROKEN — flush() of useDebouncedCallback may return undefined synchronously.
await saveAnswer.flush().catch(() => {});
```

### The correct pattern (USE this everywhere)

```javascript
// ✅ Auto-save handler — silent on error, doesn't break the submit chain.
const saveAnswer = useDebouncedCallback(async (qid, selectedIndex, textAnswer) => {
  try {
    const { error } = await supabase.rpc('mock_exam_save_answer', {
      p_attempt_id: examData.attempt_id,
      p_question_id: qid,
      p_selected_index: selectedIndex ?? null,
      p_text_answer: textAnswer ?? null,
    });
    if (error) {
      console.error('[mock-exam] save_answer failed:', error.message);
    }
  } catch (e) {
    console.error('[mock-exam] save_answer threw:', e);
  }
}, 800);

// ✅ Same shape for save_writing.

// ✅ Flushing a debounced callback — guard against undefined return.
async function safeFlush(fn) {
  try {
    const r = fn.flush?.();
    if (r && typeof r.then === 'function') await r;
  } catch (e) {
    console.error('[mock-exam] flush failed:', e);
  }
}

async function handleSubmit() {
  if (submitting) return;
  setSubmitting(true);
  setSubmitError(null);
  try {
    await safeFlush(saveAnswer);
    await safeFlush(saveWriting);
    const { data, error } = await supabase.rpc('mock_exam_submit', {
      p_attempt_id: examData.attempt_id,
      p_auto: false,
    });
    if (error) throw error;
    navigate(`/student/mock-exam/result?attempt_id=${examData.attempt_id}`, { replace: true });
  } catch (e) {
    setSubmitError(`فشل الإرسال: ${e?.message || e}. اضغطي مرة ثانية أو تواصلي مع المدرب على WhatsApp +966558669974`);
    setSubmitting(false);
  }
}
```

### Submit-button disabled gating (also a bug — verify and fix)

The screenshot Ali sent shows the submit button as enabled with writing word count = 1 (when min is 50). The disabled state must enforce:
- Submit button is only **visible** on the writing question (the last item)
- Submit button is **disabled** when `writingWordCount < exam.min_writing_words`
- Disabled state must include the standard disabled visual (reduced opacity, cursor not-allowed) AND `disabled` attribute on the `<button>`

Fix this in `MockExamAttempt.jsx` regardless of whether it's the same root cause as Bug 1.

### Search command for this task

Run inside the project root:

```bash
grep -rn "\.catch(" src/pages/student/mock-exam src/pages/trainer 2>/dev/null
grep -rn "\.rpc(" src/pages/student/mock-exam src/pages/trainer 2>/dev/null
```

Inspect every match. Convert any `.catch()` chain on an rpc/builder to the safe try/catch pattern.

---

## TASK 2 — Add instruction labels per question type

### Where

`src/pages/student/mock-exam/MockExamAttempt.jsx` (or whichever component renders one question at a time).

### What to add

A small lookup that prepends an Arabic instruction line above the question stem, based on `question.question_type` and `question.section`:

```javascript
function getInstructionAr(question) {
  const { question_type, section } = question;
  if (question_type === 'mcq') {
    if (section === 'spelling') return 'اختاري الإملاء الصحيح للكلمة';
    if (section === 'vocabulary') return 'اختاري الإجابة الصحيحة';
    if (section === 'reading') return 'اختاري الإجابة الصحيحة بناءً على القطعة';
    return 'اختاري الإجابة الصحيحة';
  }
  if (question_type === 'fill_blank') {
    if (section === 'spelling') return 'اكتبي الكلمة الصحيحة (انتبهي للإملاء)';
    return 'املئي الفراغ بالكلمة المناسبة';
  }
  if (question_type === 'error_detection') {
    return 'في الجملة التالية أربعة أجزاء مرقّمة. اختاري الجزء الذي يحتوي على خطأ.';
  }
  if (question_type === 'true_false') {
    if (section === 'reading') return 'اقرئي العبارة واختاري True أو False بناءً على القطعة';
    return 'اقرئي العبارة واختاري True أو False';
  }
  if (question_type === 'true_false_ng') {
    return 'بناءً على القطعة، اختاري True (صحيح) أو False (خاطئ) أو Not Given (غير مذكور)';
  }
  if (question_type === 'writing_prompt') {
    return null; // writing stem is self-instructional
  }
  return null;
}
```

Render the instruction above the stem with a clearly visible style — slightly muted color but unmistakably present (e.g. `text-sm text-[var(--ds-text-secondary)] mb-2`). Do NOT render an empty div when instruction is null.

### Bonus polish for error_detection

For error_detection questions specifically:
- Keep the `[1] [2] [3] [4]` markers visible in the stem.
- For the 4 options, label them with numbers (1/2/3/4) instead of letters (A/B/C/D) so the student can match marker-to-option visually. This is option-label-only — the underlying `selected_index` stays 0/1/2/3.

You can detect this in the option-rendering code:

```jsx
const optionLabel = question.question_type === 'error_detection'
  ? String(index + 1)        // '1', '2', '3', '4'
  : String.fromCharCode(65 + index);  // 'A', 'B', 'C', 'D'
```

---

## TASK 3 — DB migration: reveal columns + new RPCs

### Single idempotent migration

Apply via `mcp__supabase__apply_migration` named `<timestamp>_mock_exam_reveal_system.sql`:

```sql
-- =============================================================
-- MOCK EXAM — Trainer-controlled reveal + manual writing score
-- Idempotent.
-- =============================================================

ALTER TABLE public.mock_exam_attempts
  ADD COLUMN IF NOT EXISTS is_revealed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS revealed_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_attempts_exam_revealed
  ON public.mock_exam_attempts(exam_id, is_revealed)
  WHERE is_submitted = true;

-- =============================================================
-- RPC: mock_exam_reveal(attempt_id OR exam_code, reveal)
-- Trainer/admin only. Single or batch.
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_reveal(
  p_attempt_id uuid DEFAULT NULL,
  p_exam_code  text DEFAULT NULL,
  p_reveal     boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role    text;
  v_count   int := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role NOT IN ('admin','trainer') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_attempt_id IS NOT NULL THEN
    UPDATE public.mock_exam_attempts
       SET is_revealed = p_reveal,
           revealed_at = CASE WHEN p_reveal THEN now() ELSE NULL END,
           revealed_by = CASE WHEN p_reveal THEN v_user_id ELSE NULL END,
           updated_at  = now()
     WHERE id = p_attempt_id
       AND is_submitted = true;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF p_exam_code IS NOT NULL THEN
    UPDATE public.mock_exam_attempts a
       SET is_revealed = p_reveal,
           revealed_at = CASE WHEN p_reveal THEN now() ELSE NULL END,
           revealed_by = CASE WHEN p_reveal THEN v_user_id ELSE NULL END,
           updated_at  = now()
      FROM public.mock_exams e
     WHERE a.exam_id = e.id
       AND e.code    = p_exam_code
       AND a.is_submitted = true;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'missing_parameters: provide p_attempt_id or p_exam_code';
  END IF;

  RETURN jsonb_build_object('count', v_count, 'revealed', p_reveal);
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_reveal(uuid, text, boolean) TO authenticated;

-- =============================================================
-- RPC: mock_exam_get_result(attempt_id)
-- Returns full per-question detail. Gates students by is_revealed.
-- Always returns full detail for admin/trainer.
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_get_result(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_attempt  public.mock_exam_attempts%ROWTYPE;
  v_exam     public.mock_exams%ROWTYPE;
  v_role     text;
  v_is_staff boolean;
  v_questions jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  v_is_staff := v_role IN ('admin','trainer');

  IF NOT v_is_staff AND v_attempt.student_id <> v_user_id THEN
    RAISE EXCEPTION 'not_your_attempt';
  END IF;

  SELECT * INTO v_exam FROM public.mock_exams WHERE id = v_attempt.exam_id;

  -- Student + not revealed → pending screen
  IF NOT v_is_staff AND NOT v_attempt.is_revealed THEN
    RETURN jsonb_build_object(
      'attempt_id',   v_attempt.id,
      'exam_code',    v_exam.code,
      'exam_title',   v_exam.title_ar,
      'is_submitted', v_attempt.is_submitted,
      'submitted_at', v_attempt.submitted_at,
      'is_revealed',  false,
      'pending_review', true
    );
  END IF;

  -- Full detail
  SELECT jsonb_agg(
    jsonb_build_object(
      'question_id',           q.id,
      'section',               q.section,
      'order_index',           q.order_index,
      'question_type',         q.question_type,
      'stem',                  q.stem,
      'options',               q.options,
      'passage_text',          q.passage_text,
      'passage_title',         q.passage_title,
      'passage_group',         q.passage_group,
      'correct_index',         q.correct_index,
      'acceptable_answers',    q.acceptable_answers,
      'points',                q.points,
      'writing_min_words',     q.writing_min_words,
      'student_selected_index', ans.selected_index,
      'student_text_answer',   ans.text_answer,
      'is_correct',            ans.is_correct,
      'points_awarded',        ans.points_awarded
    )
    ORDER BY
      CASE q.section
        WHEN 'reading'    THEN 1
        WHEN 'vocabulary' THEN 2
        WHEN 'spelling'   THEN 3
        WHEN 'grammar'    THEN 4
        WHEN 'writing'    THEN 5
      END,
      q.order_index
  ) INTO v_questions
  FROM public.mock_exam_questions q
  LEFT JOIN public.mock_exam_answers ans
    ON ans.question_id = q.id AND ans.attempt_id = p_attempt_id
  WHERE q.exam_id = v_attempt.exam_id;

  RETURN jsonb_build_object(
    'attempt_id',          v_attempt.id,
    'exam_code',           v_exam.code,
    'exam_title',          v_exam.title_ar,
    'is_submitted',        v_attempt.is_submitted,
    'is_revealed',         v_attempt.is_revealed,
    'revealed_at',         v_attempt.revealed_at,
    'submitted_at',        v_attempt.submitted_at,
    'score_total',         v_attempt.score_total,
    'score_grammar',       v_attempt.score_grammar,
    'score_reading',       v_attempt.score_reading,
    'score_vocabulary',    v_attempt.score_vocabulary,
    'score_spelling',      v_attempt.score_spelling,
    'score_writing',       v_attempt.score_writing,
    'passed',              v_attempt.passed,
    'pass_threshold',      v_exam.pass_threshold,
    'writing_response',    v_attempt.writing_response,
    'writing_word_count',  v_attempt.writing_word_count,
    'manual_writing_score', v_attempt.manual_writing_score,
    'min_writing_words',   v_exam.min_writing_words,
    'questions',           v_questions,
    'pending_review',      false,
    'viewer_is_staff',     v_is_staff
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_get_result(uuid) TO authenticated;

-- =============================================================
-- RPC: mock_exam_set_manual_writing_score(attempt_id, score)
-- Trainer/admin only. Recomputes score_total + passed.
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_set_manual_writing_score(
  p_attempt_id uuid,
  p_score      numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_role         text;
  v_attempt      public.mock_exam_attempts%ROWTYPE;
  v_exam         public.mock_exams%ROWTYPE;
  v_max_writing  numeric;
  v_new_total    numeric;
  v_new_passed   boolean;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role NOT IN ('admin','trainer') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  IF NOT v_attempt.is_submitted THEN RAISE EXCEPTION 'not_submitted'; END IF;

  SELECT * INTO v_exam FROM public.mock_exams WHERE id = v_attempt.exam_id;
  SELECT points INTO v_max_writing
    FROM public.mock_exam_questions
   WHERE exam_id = v_attempt.exam_id AND section = 'writing'
   LIMIT 1;

  IF p_score < 0 OR p_score > v_max_writing THEN
    RAISE EXCEPTION 'score_out_of_range (0..%)', v_max_writing;
  END IF;

  v_new_total :=
      COALESCE(v_attempt.score_grammar,    0)
    + COALESCE(v_attempt.score_reading,    0)
    + COALESCE(v_attempt.score_vocabulary, 0)
    + COALESCE(v_attempt.score_spelling,   0)
    + p_score;
  v_new_passed := v_new_total >= v_exam.pass_threshold;

  UPDATE public.mock_exam_attempts
     SET manual_writing_score = p_score,
         score_writing        = p_score,
         score_total          = ROUND(v_new_total, 2),
         passed               = v_new_passed,
         updated_at           = now()
   WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id',   p_attempt_id,
    'score_writing', p_score,
    'score_total',   ROUND(v_new_total, 2),
    'passed',        v_new_passed
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_set_manual_writing_score(uuid, numeric) TO authenticated;
```

### Smoke test the migration

```sql
-- Confirm columns exist
SELECT column_name FROM information_schema.columns
 WHERE table_name='mock_exam_attempts'
   AND column_name IN ('is_revealed','revealed_at','revealed_by');
-- expected: 3 rows

-- Confirm new RPCs exist
SELECT routine_name FROM information_schema.routines
 WHERE routine_schema='public'
   AND routine_name IN ('mock_exam_reveal','mock_exam_get_result','mock_exam_set_manual_writing_score');
-- expected: 3 rows
```

---

## TASK 4 — Student result page: pending state + enriched detail

### File

`src/pages/student/mock-exam/MockExamResult.jsx` (location confirmed from previous build).

### Replace the data fetch

Use the new RPC instead of direct table reads:

```jsx
const [searchParams] = useSearchParams();
const attemptId = searchParams.get('attempt_id');

const { data: result, isLoading, refetch } = useQuery({
  queryKey: ['mock-exam-result', attemptId],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('mock_exam_get_result', {
      p_attempt_id: attemptId,
    });
    if (error) throw error;
    return data;
  },
  enabled: !!attemptId,
  // Poll every 30s if pending (so when trainer reveals, student sees it without manual refresh)
  refetchInterval: (q) => q.state.data?.pending_review ? 30_000 : false,
});
```

### Render two states

**State A — Pending review (`result.pending_review === true`):**

A calm, premium pending screen. No score numbers anywhere.

```jsx
<div className="centered card">
  <CheckCircleIcon className="size-16 text-[var(--ds-gold)]" />
  <h1>تم استلام إجابتك بنجاح</h1>
  <p className="muted">
    نتيجتك ستظهر هنا فور انتهاء المدرب من المراجعة.
  </p>
  <div className="info-row">
    <span>وقت التسليم:</span>
    <span>{formatRelativeAr(result.submitted_at)}</span>
  </div>
  <p className="small muted center">
    نقدّر صبركِ — وفّقكِ الله في الاختبار الفعلي.
  </p>
  <button onClick={() => navigate('/student/curriculum')}>العودة إلى المنهج</button>
</div>
```

Use whatever date utility was confirmed in the prior Phase A discovery report. If `formatRelativeAr` doesn't exist, use `date-fns` with the `ar-SA` locale or a small inline helper. Keep it simple.

**State B — Revealed (`result.pending_review === false`):**

The full result. Sections in this order (top → bottom):

1. **Score reveal hero** (existing, keep): animated count-up to `score_total / 100`, pass/fail badge, gold border on pass.

2. **Section breakdown cards** (existing, keep): 5 small cards for Grammar 30, Reading 25, Vocabulary 20, Spelling 15, Writing 10.

3. **NEW — Per-section accordion with per-question feedback.** Group `result.questions` by section. For each section, show a collapsible card with:
   - Section header: "القواعد — 28/30" (translated name + score)
   - On expand: list every question with:
     - The stem (and passage if reading — show the passage once at the top of the reading section, not repeated per question)
     - For MCQ-like questions:
       - Show all options with: ✓ green if it's the correct answer; ✗ red if student picked it AND it's wrong; muted gray for the rest
       - "Your answer: B (like)" + "Correct answer: B (likes)" if needed
     - For fill_blank:
       - "Your answer: <text>" + "Accepted answers: <list>"
     - Small "✓ +3.0 pts" / "✗ 0 pts" badge
   - Writing section special:
     - Show the full writing prompt
     - Show the student's writing text in a read-only block
     - Show word count: "كتبتِ ١٢٣ كلمة (الحد الأدنى ٥٠)"
     - Show writing score: "X/10" + a small note if `manual_writing_score` differs from auto: "تم تعديل الدرجة من المدرب"

4. **Mock notice** (existing, keep): "هذا اختبار تجريبي. الاختبار الفعلي بعدين — راجعي نقاط ضعفك."

5. **CTA** (existing): "العودة إلى المنهج" → `/student/curriculum`

### Visual contract for the revealed state

Premium but readable. Heavy use of `<GlassPanel>` and `var(--ds-*)` tokens. No backdrop-filter on animated elements. The accordion can use a simple `<details>`/`<summary>` for accessibility, styled.

---

## TASK 5 — Trainer results page: enrich + reveal controls

### File

`src/pages/trainer/MockExamResults.jsx` (shared between trainer and admin).

### Top-bar additions

Add two action buttons per exam:

```jsx
<div className="exam-actions">
  <h2>A1 Mock — midterm-mock-a1</h2>
  <button onClick={() => revealAll('midterm-mock-a1', true)}>
    كشف نتائج كل الطلاب
  </button>
  <button onClick={() => revealAll('midterm-mock-a1', false)} variant="ghost">
    إخفاء كل النتائج
  </button>
</div>
```

`revealAll` calls the RPC:

```javascript
async function revealAll(examCode, reveal) {
  if (!confirm(reveal
      ? `تأكيد كشف نتائج كل الطلاب الذين سلموا اختبار ${examCode}؟`
      : `تأكيد إخفاء النتائج عن الطلاب؟`
  )) return;
  const { data, error } = await supabase.rpc('mock_exam_reveal', {
    p_attempt_id: null,
    p_exam_code: examCode,
    p_reveal: reveal,
  });
  if (error) { alert(`فشل: ${error.message}`); return; }
  alert(`${reveal ? 'كشف' : 'إخفاء'} ${data.count} نتيجة`);
  refetch();  // refetch the attempts list
}
```

### Per-row enrichments

Each attempt row in the table now has:

- An **"عرض التفاصيل"** button (or chevron) that expands a detail panel below the row
- A **"كشف"** / **"إخفاء"** toggle button per row that calls `mock_exam_reveal({ p_attempt_id, p_reveal: !current })`
- A column showing reveal status: badge "مكشوف" (gold) or "قيد المراجعة" (gray)
- Existing columns (name, score, passed, submitted_at) stay

### Expanded detail panel (per attempt)

When expanded, fetch the full result via `mock_exam_get_result(attempt_id)` (RLS automatically gives staff everything). Render:

1. **Summary row:** student name, group, exam, submitted time, current scores per section, total, pass/fail.

2. **Writing block** (most important for trainer):
   - The prompt
   - The student's writing text in full (read-only, white-space: pre-wrap, max-height with scroll)
   - Word count
   - Current writing score + a small input "تعديل درجة الكتابة:" with a number input (step 0.5, min 0, max 10) and a save button
   - Save calls `mock_exam_set_manual_writing_score(attempt_id, newScore)` → refetch on success

3. **Per-question breakdown** (collapsible by default; one click to expand all):
   - Same layout as the student revealed view, but always visible to staff regardless of `is_revealed`
   - For each question: stem, options with correct/student/wrong markers, points awarded, ✓ or ✗

4. **Audit footer:** "كُشِفت في <date>" if revealed; "لم تُكشف بعد" otherwise.

### Sidebar

The trainer sidebar entry for the mock-exam results page already exists from the previous build. Verify it still routes correctly to this page.

---

## TASK 6 — QA (run before commit)

### DB sanity (via MCP execute_sql)

```sql
-- New columns
SELECT column_name FROM information_schema.columns
 WHERE table_name='mock_exam_attempts'
   AND column_name IN ('is_revealed','revealed_at','revealed_by');
-- expected: 3

-- New RPCs
SELECT routine_name FROM information_schema.routines
 WHERE routine_schema='public'
   AND routine_name IN ('mock_exam_reveal','mock_exam_get_result','mock_exam_set_manual_writing_score');
-- expected: 3
```

### End-to-end test via real JWT (same pattern as previous build's QA)

1. **Test A1 student submission flow:**
   - Mint a JWT for `mock-test-a1@fluentia.academy`
   - Call `mock_exam_start('midterm-mock-a1')` → expect attempt_id
   - Call `mock_exam_save_answer` for 5 questions → expect no errors
   - Call `mock_exam_save_writing` with 60 valid words → expect word_count=60
   - Call `mock_exam_submit` → expect score returned (this proves Bug 1 is fixed end-to-end at the RPC layer)

2. **Student result is gated:**
   - With the same JWT, call `mock_exam_get_result(attempt_id)` → expect `pending_review: true, is_revealed: false`
   - No `score_total` should be present in the response

3. **Trainer reveal:**
   - Mint a JWT for an admin (or use service_role for this step)
   - Call `mock_exam_reveal({ p_attempt_id, p_reveal: true })` → expect `{ count: 1, revealed: true }`

4. **Student now sees full result:**
   - With student JWT again, call `mock_exam_get_result(attempt_id)` → expect `pending_review: false`, full questions array, scores

5. **Manual writing score:**
   - As admin: call `mock_exam_set_manual_writing_score(attempt_id, 7.5)` → expect `score_writing: 7.5`, `score_total` recomputed
   - Re-call get_result → `score_writing` is 7.5

6. **Frontend smoke (in incognito):**
   - Log in as `mock-test-a1@fluentia.academy` (clear any prior attempt: `DELETE FROM mock_exam_attempts WHERE student_id IN (SELECT id FROM profiles WHERE is_test_account)` BEFORE this step)
   - Navigate to mock exam → intro → start → answer Q24 (error_detection) → confirm the instruction "اختاري الجزء الذي يحتوي على خطأ" is visible above the stem
   - Verify option labels for Q24 are "1, 2, 3, 4" not "A, B, C, D"
   - Jump to Q35 (writing) → type 10 words → submit button is DISABLED
   - Type 60 words → submit button is ENABLED → click submit → expect navigation to result page
   - On result page → expect pending review screen, no score visible
   - Open another incognito → log in as admin (or trainer) → go to trainer results → see the test attempt → click reveal → expect success
   - Switch back to student incognito → wait up to 30s for poll OR manually refetch → expect full revealed result with per-question breakdown
   - On result page, verify Q24 shows "Your answer: B" (or whatever was picked) + "Correct: B (likes)" + ✓ badge

7. **Restore prod state:**
   - Delete the test attempt(s) so Ali can re-test fresh
   - Confirm `visibility='preview'` for both exams (do NOT flip to live)

### Block commit on QA failure

If ANY assertion fails:
- Print which test failed and why
- Do not commit
- Surface the failure clearly so Ali (or you in the next iteration) can see it

---

## TASK 7 — Atomic commit + push

Only after all QA assertions pass:

```bash
git status
git add -A
git commit -m "fix(mock-exam): submit bug + question instructions + trainer-controlled reveal

- Fix submit failure: replace .catch chains on supabase.rpc() with try/catch + destructured error (Supabase v2 returns thenable, not Promise)
- Add safeFlush helper for debounced-callback .flush() guards
- Add Arabic instruction labels per question_type (error_detection, true_false, true_false_ng, fill_blank, mcq context-aware)
- error_detection option labels switch to 1/2/3/4 to match stem markers
- Fix submit button disabled gate on writing question (min_writing_words enforced visually)
- New DB columns: mock_exam_attempts.is_revealed, revealed_at, revealed_by
- 3 new RPCs (SECURITY DEFINER):
    mock_exam_reveal(attempt_id|exam_code, reveal) — single or batch toggle
    mock_exam_get_result(attempt_id) — gated by is_revealed for students, always full for staff
    mock_exam_set_manual_writing_score(attempt_id, score) — trainer adjust + recompute total/passed
- Student result page: pending screen until reveal, enriched per-question breakdown after reveal, 30s poll while pending
- Trainer results page: per-row expand, full per-question detail, writing text + manual score adjust, per-row reveal toggle, exam-wide reveal-all + unreveal-all buttons
- visibility='preview' preserved on both exams
- All sacred tables + existing RPCs untouched"
git push origin main
```

Vercel auto-deploys.

---

## TASK 8 — Final handoff output

After the push completes, print:

```
=== MOCK EXAM FIX 1 DEPLOYED ===
Commit: <sha>
Bugs fixed: submit .catch (blocker), question instructions, submit-disabled gate on writing
Feature added: trainer-controlled reveal + enriched per-question feedback
DB: 3 new columns + 3 new RPCs (idempotent migration)
QA: <N>/<N> assertions PASS

>>> WHAT ALI NEEDS TO DO NEXT <<<
1. Wait ~2 min for Vercel deploy
2. Open incognito → log in as mock-test-a1@fluentia.academy / MockTest2025!
3. Take the full exam end-to-end → submit → confirm pending screen
4. Open second incognito → log in as admin → go to trainer mock-exam results
5. Click "كشف نتائج كل الطلاب" for A1 → confirm count
6. Switch back to test-a1 incognito → confirm result page now shows full breakdown
7. Repeat for B1 test account

>>> WHEN READY TO GO LIVE FOR REAL STUDENTS <<<
UPDATE mock_exams SET visibility='live' WHERE code IN ('midterm-mock-a1','midterm-mock-b1');

>>> TO REVEAL ALL RESULTS LATER (after exam closes) <<<
Either click "كشف نتائج كل الطلاب" in trainer UI, OR:
SELECT mock_exam_reveal(NULL, 'midterm-mock-a1', true);
SELECT mock_exam_reveal(NULL, 'midterm-mock-b1', true);
```

Go.
