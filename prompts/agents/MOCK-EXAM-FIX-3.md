# MOCK EXAM — FIX 3: AI-Powered Writing Grading with 3-Layer Reliability

## Context

After Fix 2 deployed (commit 60a8274), Ali tested the exam and found the writing auto-grading is too lenient — it awards a full 10/10 score whenever the word count is ≥ min, regardless of whether the text is genuine writing or repetitive spam ("word word word" × 50). This defeats the educational purpose of the exam.

Ali has explicitly approved an exception to the original "zero Claude API at runtime" rule: **the writing section only** will be AI-graded, with stringent reliability safeguards because he said "we really want to make sure that Claude AI in this typical area does not fail us at all."

## Architecture: 3-layer reliability

**Layer 1 — Primary:** Claude Sonnet (`claude-sonnet-4-20250514`) called via Supabase Edge Function with a carefully designed level-aware prompt. Returns score 0-10 + Arabic justification + strengths + improvements.

**Layer 2 — Retry:** If the first Claude call fails (timeout, network, malformed response), retry once with 2-second backoff.

**Layer 3 — Smart fallback heuristic:** If both Claude attempts fail, fall back to a deterministic algorithm that's smarter than blanket word-count credit:
- < min_words → 0
- Unique-word ratio < 0.2 → 2 (extreme repetition)
- Unique-word ratio < 0.35 → 4 (high repetition)
- Average word length < 2.5 chars → 3 (likely gibberish)
- Otherwise → 6 (passing but conservative)

All three layers update the same DB columns. Trainer always has manual override (existing `manual_writing_score` flow). Status field tracks which layer was used (`graded` / `fallback` / `manual`).

## Asynchronous flow

The writing grading runs **after** the student submits, in the background, **without blocking the student's UX**:

1. Student clicks submit → `mock_exam_submit` RPC runs (sets `ai_writing_status='pending'`, initial writing score = 0 placeholder)
2. Frontend navigates to result page (pending screen) — student sees "تم استلام إجابتك" immediately
3. Frontend fires a non-blocking call to the new Edge Function `mock-exam-grade-writing`
4. Edge Function calls Claude → updates DB → sets `ai_writing_status='graded'` (or `'fallback'`)
5. Trainer reviews via dashboard, sees AI score + rationale, can manually override
6. Trainer reveals → student sees full AI feedback (score + justification + strengths + improvements)

The student never waits more than ~1 second after pressing submit. The AI grading completes in the background within 5-20 seconds typically.

---

## Working context

- **Working dir:** confirm actual path (`C:\Users\Dr. Ali\Desktop\fluentia-lms` per memory OR `/Users/dr.ali/Desktop/fluentia-lms` per recent commit log)
- **Repo:** `alialahmad2000/fluentia-lms` (branch `main`)
- **Supabase ref:** `nmjexpuycmqcxuxljier` (Frankfurt Pro)
- **Auto-load skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Last commit:** `60a8274` (Fix 2)
- **Claude model:** `claude-sonnet-4-20250514` (per memory)
- **Anthropic SDK:** use `https://esm.sh/@anthropic-ai/sdk` in the Edge Function

## Absolute rules

1. **Sacred tables untouched.** No edits to curriculum, RLS of existing tables, unit_mastery_*, xp_*.
2. **Existing 7 RPCs untouched.** Add 1 new RPC for applying AI scores; do not modify the others.
3. **Existing trainer detail panel preserved.** Add the AI feedback display + retry button, don't break the manual override flow.
4. **Existing student result page preserved.** Add the AI feedback display block within the writing section, don't break the pending → revealed flow.
5. **Existing 74 questions untouched.** No re-seeding.
6. **`visibility='preview'` preserved.**
7. **Single atomic commit at end.**
8. **No `vite build` locally** — Vercel handles builds.
9. **All hooks at top, role gates after, `profile?.id` always.**

---

## TASK 1 — DB migration (idempotent)

Apply via `mcp__supabase__apply_migration` named `<timestamp>_mock_exam_ai_writing_grading.sql`:

```sql
-- =============================================================
-- MOCK EXAM — AI-powered writing grading + smart fallback
-- Idempotent.
-- =============================================================

ALTER TABLE public.mock_exam_attempts
  ADD COLUMN IF NOT EXISTS ai_writing_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS ai_writing_justification_ar text,
  ADD COLUMN IF NOT EXISTS ai_writing_strengths_ar jsonb,
  ADD COLUMN IF NOT EXISTS ai_writing_improvements_ar jsonb,
  ADD COLUMN IF NOT EXISTS ai_writing_graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_writing_status text NOT NULL DEFAULT 'pending'
    CHECK (ai_writing_status IN ('pending','graded','fallback','manual','failed'));

CREATE INDEX IF NOT EXISTS idx_mock_exam_attempts_ai_writing_status
  ON public.mock_exam_attempts(ai_writing_status)
  WHERE is_submitted = true;

-- =============================================================
-- Audit log for AI writing calls (debugging + cost tracking)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.mock_exam_ai_writing_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id   uuid REFERENCES public.mock_exam_attempts(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('success','retry','fallback','error')),
  layer        text NOT NULL CHECK (layer IN ('primary','retry','fallback')),
  score        numeric(5,2),
  ai_model     text,
  prompt_tokens int,
  output_tokens int,
  error_message text,
  raw_response text,
  duration_ms  int,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_exam_ai_writing_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS me_ai_log_staff ON public.mock_exam_ai_writing_log;
CREATE POLICY me_ai_log_staff ON public.mock_exam_ai_writing_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- =============================================================
-- RPC: mock_exam_apply_ai_writing_score
-- Called by the Edge Function (service_role auth). Recomputes total + passed.
-- Idempotent: re-running with same input produces same final state.
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_apply_ai_writing_score(
  p_attempt_id    uuid,
  p_score         numeric,
  p_justification text,
  p_strengths     jsonb,
  p_improvements  jsonb,
  p_status        text DEFAULT 'graded'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt     public.mock_exam_attempts%ROWTYPE;
  v_exam        public.mock_exams%ROWTYPE;
  v_max_writing numeric;
  v_writing_final numeric;
  v_new_total   numeric;
  v_new_passed  boolean;
BEGIN
  -- Authorization: service_role OR trainer/admin
  -- (service_role bypasses RLS so this check is for direct calls from authenticated users)
  IF auth.role() <> 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role IN ('admin','trainer')
    ) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  SELECT * INTO v_attempt FROM public.mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  IF NOT v_attempt.is_submitted THEN RAISE EXCEPTION 'not_submitted'; END IF;

  SELECT * INTO v_exam FROM public.mock_exams WHERE id = v_attempt.exam_id;
  SELECT points INTO v_max_writing
    FROM public.mock_exam_questions
   WHERE exam_id = v_attempt.exam_id AND section = 'writing'
   LIMIT 1;

  -- Clamp the AI score to [0, v_max_writing]
  IF p_score IS NULL OR p_score < 0 THEN p_score := 0; END IF;
  IF p_score > v_max_writing THEN p_score := v_max_writing; END IF;

  -- If trainer has already manually overridden, do NOT overwrite their decision
  -- (manual_writing_score remains the final score; AI fields update for reference only)
  IF v_attempt.manual_writing_score IS NOT NULL THEN
    v_writing_final := v_attempt.manual_writing_score;
  ELSE
    v_writing_final := p_score;
  END IF;

  v_new_total :=
      COALESCE(v_attempt.score_grammar,    0)
    + COALESCE(v_attempt.score_reading,    0)
    + COALESCE(v_attempt.score_vocabulary, 0)
    + COALESCE(v_attempt.score_spelling,   0)
    + v_writing_final;
  v_new_passed := v_new_total >= v_exam.pass_threshold;

  UPDATE public.mock_exam_attempts
     SET ai_writing_score          = p_score,
         ai_writing_justification_ar = p_justification,
         ai_writing_strengths_ar   = p_strengths,
         ai_writing_improvements_ar = p_improvements,
         ai_writing_status         = p_status,
         ai_writing_graded_at      = now(),
         score_writing             = v_writing_final,
         score_total               = ROUND(v_new_total, 2),
         passed                    = v_new_passed,
         updated_at                = now()
   WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id',        p_attempt_id,
    'ai_writing_score',  p_score,
    'final_writing_score', v_writing_final,
    'score_total',       ROUND(v_new_total, 2),
    'passed',            v_new_passed,
    'status',            p_status,
    'overridden_by_manual', (v_attempt.manual_writing_score IS NOT NULL)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_exam_apply_ai_writing_score(uuid, numeric, text, jsonb, jsonb, text) TO authenticated, service_role;

-- =============================================================
-- Update mock_exam_submit: set ai_writing_status='pending', use 0 as initial writing
-- (Edge Function will update it within seconds)
-- =============================================================
-- IMPORTANT: This is a SURGICAL edit. Re-create the RPC keeping its existing behavior
-- but changing two things:
--   1. Initial score_writing is 0 (not based on word count alone)
--   2. ai_writing_status = 'pending' on submit
-- The Edge Function will subsequently call mock_exam_apply_ai_writing_score to update it.
-- All other behavior of submit (scoring grammar/reading/vocab/spelling/passed/total) stays identical.
-- (Claude Code: read the current mock_exam_submit definition, edit it, re-apply.)
```

After applying the migration, **edit the existing `mock_exam_submit` RPC** as follows:

1. Locate the current definition (via `pg_get_functiondef` or by searching `supabase/migrations/`).
2. Replace the writing-score computation logic. The current logic awards full marks if `writing_word_count >= min_writing_words`. Change to:
   - **Initial writing score on submit: 0** (the Edge Function will update it)
   - Set `ai_writing_status = 'pending'` on submit
   - `score_total` initial calculation uses writing = 0 placeholder
3. Keep ALL other behavior identical: idempotency, RLS, audit log entry, etc.

The relevant code change inside the function body:

```sql
-- OLD:
-- IF v_attempt.writing_word_count >= v_exam.min_writing_words THEN
--   v_writing := (SELECT points FROM public.mock_exam_questions WHERE exam_id = v_exam.id AND section='writing' LIMIT 1);
-- ELSE
--   v_writing := 0;
-- END IF;
-- IF v_attempt.manual_writing_score IS NOT NULL THEN v_writing := v_attempt.manual_writing_score; END IF;

-- NEW:
-- Writing score starts at 0 — the AI grader will update it asynchronously via mock_exam_apply_ai_writing_score
-- If a manual override is already present (re-submit edge case), honor it
IF v_attempt.manual_writing_score IS NOT NULL THEN
  v_writing := v_attempt.manual_writing_score;
ELSE
  v_writing := 0;
END IF;
```

And in the same RPC, after the UPDATE that sets is_submitted=true, set the writing status:

```sql
UPDATE public.mock_exam_attempts
   SET ai_writing_status = 'pending'
 WHERE id = p_attempt_id
   AND ai_writing_status IS NULL OR ai_writing_status NOT IN ('graded','fallback','manual');
```

(Idempotent — if already graded, don't reset to pending.)

### Smoke test the migration

```sql
-- Confirm new columns + table exist
SELECT column_name FROM information_schema.columns
 WHERE table_name='mock_exam_attempts'
   AND column_name IN ('ai_writing_score','ai_writing_status','ai_writing_justification_ar','ai_writing_strengths_ar','ai_writing_improvements_ar','ai_writing_graded_at');
-- expected: 6 rows

SELECT to_regclass('public.mock_exam_ai_writing_log');
-- expected: not null

-- Confirm new RPC
SELECT routine_name FROM information_schema.routines
 WHERE routine_schema='public' AND routine_name = 'mock_exam_apply_ai_writing_score';
-- expected: 1 row
```

---

## TASK 2 — Supabase Edge Function: `mock-exam-grade-writing`

### Create the function

Path: `supabase/functions/mock-exam-grade-writing/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 25_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });

  const startedAt = Date.now();
  let attemptId: string | null = null;

  try {
    const body = await req.json();
    attemptId = body.attempt_id;
    if (!attemptId) throw new Error('attempt_id required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY not set in Supabase secrets — will fall back');
    }

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // Auth check: requires either a valid JWT (any authenticated user) OR can be called via service_role
    // We don't restrict by role here because the edge function is called from the student's own submit flow
    // The RPC inside (mock_exam_apply_ai_writing_score) does the authorization (service_role).

    // Fetch the attempt + exam + writing question
    const { data: attempt, error: aErr } = await admin
      .from('mock_exam_attempts')
      .select('id, exam_id, student_id, writing_response, writing_word_count, is_submitted, ai_writing_status, manual_writing_score, exam:mock_exams(code, min_writing_words)')
      .eq('id', attemptId)
      .single();

    if (aErr || !attempt) throw new Error('attempt_not_found');
    if (!attempt.is_submitted) throw new Error('attempt_not_submitted');

    // Idempotency: if already graded by AI (not manual override), skip
    if (attempt.ai_writing_status === 'graded' || attempt.ai_writing_status === 'fallback') {
      return jsonResponse({ success: true, idempotent: true, status: attempt.ai_writing_status });
    }

    // Fetch the writing question's stem (the prompt the student responded to)
    const { data: writingQ } = await admin
      .from('mock_exam_questions')
      .select('stem, writing_min_words')
      .eq('exam_id', attempt.exam_id)
      .eq('section', 'writing')
      .single();

    if (!writingQ) throw new Error('writing_question_not_found');

    const examCode = attempt.exam.code;
    const level = examCode.includes('a1') ? 'A1' : 'B1';
    const writingText = (attempt.writing_response || '').trim();
    const wordCount = attempt.writing_word_count || 0;
    const minWords = writingQ.writing_min_words || attempt.exam.min_writing_words || 50;
    const writingPrompt = writingQ.stem;

    // === Try AI primary ===
    let aiResult: any = null;
    let aiLayer: 'primary' | 'retry' | 'fallback' = 'primary';
    let aiSuccess = false;
    let lastError: any = null;
    let tokenUsage: { input: number; output: number } | null = null;

    if (anthropicKey && writingText.length > 0) {
      const anthropic = new Anthropic({ apiKey: anthropicKey, timeout: TIMEOUT_MS });

      const systemPrompt = buildSystemPrompt(level);
      const userMessage = buildUserMessage(writingPrompt, writingText, wordCount, minWords);

      // Attempt 1
      try {
        const resp = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });
        const parsed = parseAndValidateClaudeResponse(resp);
        aiResult = parsed.result;
        tokenUsage = parsed.usage;
        aiSuccess = true;
        aiLayer = 'primary';
      } catch (err1) {
        lastError = err1;
        console.warn('[grade-writing] primary call failed, retrying once:', String(err1));
        await sleep(2000);
        // Attempt 2 (retry)
        try {
          const resp = await anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          });
          const parsed = parseAndValidateClaudeResponse(resp);
          aiResult = parsed.result;
          tokenUsage = parsed.usage;
          aiSuccess = true;
          aiLayer = 'retry';
        } catch (err2) {
          lastError = err2;
          console.error('[grade-writing] retry also failed:', String(err2));
          aiSuccess = false;
        }
      }
    }

    // === Fallback: smart heuristic ===
    if (!aiSuccess) {
      const fb = smartFallbackScore(writingText, minWords);
      aiResult = {
        score: fb.score,
        justification_ar: `تعذّر التقييم التلقائي بالذكاء الاصطناعي في الوقت الحالي. تم احتساب الدرجة بناءً على معايير أساسية: ${fb.reason_ar}. سيراجع المدرب كتابتك يدوياً.`,
        strengths_ar: [],
        improvements_ar: ['تواصلي مع المدرب لمراجعة كتابتك بتفصيل أكثر'],
      };
      aiLayer = 'fallback';
    }

    // === Apply via RPC ===
    const status = aiSuccess ? 'graded' : 'fallback';
    const { error: applyErr } = await admin.rpc('mock_exam_apply_ai_writing_score', {
      p_attempt_id: attemptId,
      p_score: aiResult.score,
      p_justification: aiResult.justification_ar,
      p_strengths: aiResult.strengths_ar,
      p_improvements: aiResult.improvements_ar,
      p_status: status,
    });
    if (applyErr) throw applyErr;

    // === Audit log ===
    await admin.from('mock_exam_ai_writing_log').insert({
      attempt_id: attemptId,
      status: aiSuccess ? 'success' : 'fallback',
      layer: aiLayer,
      score: aiResult.score,
      ai_model: aiSuccess ? CLAUDE_MODEL : null,
      prompt_tokens: tokenUsage?.input ?? null,
      output_tokens: tokenUsage?.output ?? null,
      error_message: aiSuccess ? null : String(lastError ?? 'no_api_key_or_empty_text'),
      duration_ms: Date.now() - startedAt,
    });

    return jsonResponse({
      success: true,
      ai_success: aiSuccess,
      layer: aiLayer,
      score: aiResult.score,
      status,
    });

  } catch (err: any) {
    console.error('[grade-writing] fatal:', err);
    // Log the error
    if (attemptId) {
      try {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          { auth: { persistSession: false } }
        );
        await admin.from('mock_exam_ai_writing_log').insert({
          attempt_id: attemptId,
          status: 'error',
          layer: 'primary',
          error_message: String(err?.message || err),
          duration_ms: Date.now() - startedAt,
        });
      } catch {}
    }
    return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
  }
});

// ============================================================
// Helpers
// ============================================================
function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function buildSystemPrompt(level: 'A1' | 'B1') {
  return `You are an experienced English teacher at Fluentia Academy (Saudi Arabia) grading writing for a ${level} CEFR-level student.

Be realistic, fair, and pedagogically sound:
- A1 (beginner, used to Arabic as L1): reward basic communication even with grammar errors. Expect simple sentences using present simple, basic vocabulary, short structure.
- B1 (intermediate, used to Arabic as L1): expect more complex sentences (past tense, present perfect, conditionals), varied vocabulary, clearer organization, multi-sentence paragraphs.

PENALIZE HEAVILY (score 0-3):
- Gibberish or random characters with no meaning
- Single repeated word/phrase (e.g. "word word word..." or "hi hi hi hi")
- Copy-pasted spam text with no relation to the prompt
- Failure to address the writing prompt at all

REWARD (score 6-10):
- Genuine attempt at the topic given in the prompt
- Clear sentences (even if simple at A1)
- Vocabulary appropriate to ${level} level
- Logical flow from one sentence to the next
- Direct response to the question asked

Use the full scale 0-10 honestly. A grade of 10 means truly excellent work for the ${level} level. A grade of 5-6 means acceptable but with clear room to improve. A grade of 0-2 means the response is essentially unusable.

Respond ONLY with valid JSON. No markdown code fences, no prose before or after. The justification and feedback MUST be in Arabic (the student's native language).`;
}

function buildUserMessage(prompt: string, writingText: string, wordCount: number, minWords: number) {
  return `Writing prompt given to the student:
"${prompt}"

Student's writing (${wordCount} words; minimum required: ${minWords}):
"""
${writingText}
"""

Grade this writing on a scale of 0 to 10 (one decimal place allowed, e.g. 7.5).

Respond with EXACTLY this JSON shape (no markdown, no code fences):
{
  "score": <number between 0 and 10>,
  "justification_ar": "<2 to 3 sentences in Arabic explaining the score>",
  "strengths_ar": ["<short Arabic strength>", "<short Arabic strength>"],
  "improvements_ar": ["<short Arabic improvement note>", "<short Arabic improvement note>"]
}

Be honest. If the writing is poor, score it low and explain why in Arabic. If the writing is great, score it high and praise specifically in Arabic.`;
}

function parseAndValidateClaudeResponse(resp: any) {
  const block = resp?.content?.[0];
  if (!block || block.type !== 'text') throw new Error('no_text_block_in_response');
  let text: string = block.text;
  // Strip any markdown fences just in case
  text = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.score !== 'number') throw new Error('score_not_a_number');
  if (parsed.score < 0 || parsed.score > 10) throw new Error('score_out_of_range');
  if (typeof parsed.justification_ar !== 'string' || parsed.justification_ar.length < 5) {
    throw new Error('justification_too_short_or_missing');
  }
  if (!Array.isArray(parsed.strengths_ar)) parsed.strengths_ar = [];
  if (!Array.isArray(parsed.improvements_ar)) parsed.improvements_ar = [];
  // Round to one decimal
  parsed.score = Math.round(parsed.score * 10) / 10;
  return {
    result: parsed,
    usage: {
      input: resp?.usage?.input_tokens ?? 0,
      output: resp?.usage?.output_tokens ?? 0,
    },
  };
}

function smartFallbackScore(text: string, minWords: number): { score: number; reason_ar: string } {
  const trimmed = text.trim();
  if (!trimmed) return { score: 0, reason_ar: 'النص فارغ' };

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < minWords) {
    return { score: 0, reason_ar: `عدد الكلمات (${wordCount}) أقل من الحد الأدنى (${minWords})` };
  }

  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')));
  const uniqueRatio = uniqueWords.size / wordCount;

  if (uniqueRatio < 0.2) {
    return { score: 2, reason_ar: `النص يحتوي على تكرار شديد للكلمات (نسبة التفرّد ${(uniqueRatio * 100).toFixed(0)}٪)` };
  }
  if (uniqueRatio < 0.35) {
    return { score: 4, reason_ar: `النص يحتوي على تكرار للكلمات (نسبة التفرّد ${(uniqueRatio * 100).toFixed(0)}٪)` };
  }

  const avgWordLength = words.reduce((s, w) => s + w.length, 0) / wordCount;
  if (avgWordLength < 2.5) {
    return { score: 3, reason_ar: `متوسط طول الكلمات قصير جداً (${avgWordLength.toFixed(1)} حرف) — قد يكون النص غير حقيقي` };
  }

  return { score: 6, reason_ar: 'تجاوز النص المعايير الأساسية لكن تعذّر التقييم العميق' };
}
```

### Deploy the Edge Function

After writing the file:

```bash
npx supabase functions deploy mock-exam-grade-writing --no-verify-jwt
```

The `--no-verify-jwt` flag is required because the frontend will call this from the student session, but the function uses `SUPABASE_SERVICE_ROLE_KEY` internally for the DB operations. (The authorization is done via the RPC's own checks.)

### Set the ANTHROPIC_API_KEY secret

**Ali must do this once, manually**, since the secret is environment-level:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=<the-api-key>
```

In the Phase 8 final output, remind Ali to verify this secret is set (Claude Code can check via `npx supabase secrets list` — confirm `ANTHROPIC_API_KEY` is present).

If the secret is missing, the Edge Function falls back to the heuristic — it does NOT crash. But the AI grading won't work until Ali sets it.

---

## TASK 3 — Frontend: trigger Edge Function after submit

### File
`src/pages/student/mock-exam/MockExamAttempt.jsx`

### Update `handleConfirmSubmit`

After `mock_exam_submit` succeeds and BEFORE navigating to the result page, fire (do not await) the Edge Function call:

```javascript
async function handleConfirmSubmit() {
  if (submitting) return;
  setSubmitting(true);
  setSubmitError(null);
  try {
    await safeFlush(saveAnswer);
    await safeFlush(saveWriting);

    const { data: submitData, error: submitErr } = await supabase.rpc('mock_exam_submit', {
      p_attempt_id: examData.attempt_id,
      p_auto: false,
    });
    if (submitErr) throw submitErr;

    // Fire-and-forget: trigger the AI writing grader in the background.
    // The student doesn't wait for this — they go straight to the pending screen.
    // If this fails or the tab closes, no problem: the trainer can re-trigger from the dashboard.
    supabase.functions.invoke('mock-exam-grade-writing', {
      body: { attempt_id: examData.attempt_id }
    }).catch(err => {
      // Use console.error only — never throw or block the student's flow
      console.error('[mock-exam] grade-writing kickoff failed (non-blocking):', err);
    });

    setSubmitModalOpen(false);
    navigate(`/student/mock-exam/result?attempt_id=${examData.attempt_id}`, { replace: true });
  } catch (e) {
    setSubmitError(`فشل الإرسال: ${e?.message || e}. اضغطي مرة ثانية أو تواصلي مع المدرب على WhatsApp +966558669974`);
    setSubmitting(false);
  }
}
```

**Critical:** the Edge Function call must be fire-and-forget (`.catch` only logs). If it throws or hangs, the student's flow is unaffected.

---

## TASK 4 — Frontend: AI feedback on student result page

### File
`src/pages/student/mock-exam/MockExamResult.jsx`

Inside the revealed result view, locate the **writing section** of the per-question accordion. Replace the existing writing display block with this enriched version:

```jsx
{/* Writing section — special render */}
{section === 'writing' && writingQuestion && (
  <div className="writing-section">
    <div className="writing-prompt-box">
      <div className="label">السؤال</div>
      <div className="value">{writingQuestion.stem}</div>
    </div>

    <div className="writing-response-box">
      <div className="label">إجابتك ({result.writing_word_count} كلمة)</div>
      <div className="value" style={{ whiteSpace: 'pre-wrap' }}>
        {result.writing_response || '(لم تكتبي شيئاً)'}
      </div>
    </div>

    <div className="writing-score-box">
      <div className="score-large">
        {result.score_writing} / 10
      </div>
      {result.manual_writing_score != null && (
        <div className="badge manual">تم تعديل الدرجة من المدرب</div>
      )}
    </div>

    {/* AI feedback — only shown if grading has occurred (any status except pending) */}
    {result.ai_writing_status && result.ai_writing_status !== 'pending' && (
      <div className="ai-feedback">
        <div className="ai-feedback-header">
          {result.ai_writing_status === 'graded' && <>✦ تقييم بالذكاء الاصطناعي</>}
          {result.ai_writing_status === 'fallback' && <>⚠ تقييم أساسي — قيد المراجعة من المدرب</>}
          {result.ai_writing_status === 'manual' && <>المدرب راجع كتابتك يدوياً</>}
        </div>

        {result.ai_writing_justification_ar && (
          <div className="ai-justification">
            <div className="label">التبرير:</div>
            <div className="value">{result.ai_writing_justification_ar}</div>
          </div>
        )}

        {Array.isArray(result.ai_writing_strengths_ar) && result.ai_writing_strengths_ar.length > 0 && (
          <div className="ai-strengths">
            <div className="label">نقاط القوة:</div>
            <ul>
              {result.ai_writing_strengths_ar.map((s, i) => <li key={i}>✓ {s}</li>)}
            </ul>
          </div>
        )}

        {Array.isArray(result.ai_writing_improvements_ar) && result.ai_writing_improvements_ar.length > 0 && (
          <div className="ai-improvements">
            <div className="label">للتحسين:</div>
            <ul>
              {result.ai_writing_improvements_ar.map((s, i) => <li key={i}>→ {s}</li>)}
            </ul>
          </div>
        )}
      </div>
    )}

    {result.ai_writing_status === 'pending' && (
      <div className="ai-pending-note">
        <span>⏳ تقييم كتابتك قيد المعالجة بالذكاء الاصطناعي.</span>
      </div>
    )}
  </div>
)}
```

### Update the RPC to return these fields

The `mock_exam_get_result` RPC must include these new columns in its return. Edit the function definition to include in the returned JSON:

```sql
'ai_writing_score',          v_attempt.ai_writing_score,
'ai_writing_status',         v_attempt.ai_writing_status,
'ai_writing_justification_ar', v_attempt.ai_writing_justification_ar,
'ai_writing_strengths_ar',   v_attempt.ai_writing_strengths_ar,
'ai_writing_improvements_ar', v_attempt.ai_writing_improvements_ar,
```

Add this inside the existing `RETURN jsonb_build_object(...)` block, alongside the other score fields.

---

## TASK 5 — Frontend: AI feedback in trainer detail panel

### File
`src/pages/trainer/MockExamResults.jsx` (or wherever the trainer detail panel lives)

In the per-attempt expanded detail panel, add a new section above the existing writing controls:

```jsx
{/* AI writing feedback panel (trainer view) */}
<div className="trainer-ai-panel">
  <div className="panel-header">
    <h3>تقييم الذكاء الاصطناعي للكتابة</h3>
    <span className={`status-badge status-${result.ai_writing_status}`}>
      {result.ai_writing_status === 'graded' && '✓ تم التقييم'}
      {result.ai_writing_status === 'fallback' && '⚠ احتياطي — يحتاج مراجعتك'}
      {result.ai_writing_status === 'pending' && '⏳ قيد المعالجة'}
      {result.ai_writing_status === 'manual' && 'تم التعديل يدوياً'}
      {result.ai_writing_status === 'failed' && '✗ فشل'}
    </span>
  </div>

  {result.ai_writing_score != null && (
    <div className="ai-score-line">
      <span>درجة AI: <strong>{result.ai_writing_score}/10</strong></span>
      {result.manual_writing_score != null && (
        <span> · درجتك النهائية: <strong>{result.manual_writing_score}/10</strong></span>
      )}
    </div>
  )}

  {result.ai_writing_justification_ar && (
    <div className="ai-just">
      <div className="label">التبرير:</div>
      <p>{result.ai_writing_justification_ar}</p>
    </div>
  )}

  {Array.isArray(result.ai_writing_strengths_ar) && result.ai_writing_strengths_ar.length > 0 && (
    <div className="ai-list">
      <div className="label">نقاط القوة:</div>
      <ul>{result.ai_writing_strengths_ar.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  )}

  {Array.isArray(result.ai_writing_improvements_ar) && result.ai_writing_improvements_ar.length > 0 && (
    <div className="ai-list">
      <div className="label">للتحسين:</div>
      <ul>{result.ai_writing_improvements_ar.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  )}

  <button
    type="button"
    onClick={() => retryGradeWriting(result.attempt_id)}
    disabled={retryingId === result.attempt_id}
    className="retry-btn"
  >
    {retryingId === result.attempt_id ? 'جاري إعادة التقييم...' : 'إعادة التقييم بالذكاء الاصطناعي'}
  </button>
</div>
```

The `retryGradeWriting` function:

```javascript
async function retryGradeWriting(attemptId) {
  setRetryingId(attemptId);
  try {
    // Step 1: reset status to pending so the edge function will re-process it
    const { error: resetErr } = await supabase
      .from('mock_exam_attempts')
      .update({ ai_writing_status: 'pending' })
      .eq('id', attemptId);
    // (RLS allows admin/trainer to update — this is a direct write, simpler than another RPC)
    // If this errors due to RLS, fall back to a small RPC. But typically admin has write access.
    if (resetErr) {
      // Try via RPC fallback (add a tiny RPC if needed) — for now log and continue
      console.warn('reset status via direct update failed (will try edge fn anyway):', resetErr);
    }
    // Step 2: trigger the edge function
    const { data, error } = await supabase.functions.invoke('mock-exam-grade-writing', {
      body: { attempt_id: attemptId }
    });
    if (error) throw error;
    // Refetch the attempt detail
    await refetchAttemptDetail(attemptId);
    alert(`تم إعادة التقييم. الدرجة الجديدة: ${data?.score}/10`);
  } catch (e) {
    alert(`فشل إعادة التقييم: ${e.message}`);
  } finally {
    setRetryingId(null);
  }
}
```

**Note on RLS:** If direct UPDATE on `mock_exam_attempts` from a trainer client is blocked by existing RLS policies, create a tiny RPC `mock_exam_reset_ai_status(p_attempt_id)` with the trainer/admin check. Discover the existing policies via `pg_policies` and choose the right path.

---

## TASK 6 — QA scenarios

Run all of these. Document in `docs/MOCK-EXAM-FIX-3-QA-REPORT.md`. Block commit on any failure.

### Setup
Clean test attempts:
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

Verify `ANTHROPIC_API_KEY` is set:
```bash
npx supabase secrets list | grep ANTHROPIC_API_KEY
```
If missing, surface this and stop — the test of the primary AI path will fail without it.

### Scenario A — Real AI grading (primary path)
1. As test A1 student: complete an attempt with a GENUINE 60-word writing about morning routine (e.g. "I wake up at 7 AM. I drink coffee. I read for 20 minutes...")
2. Submit
3. On the result page (pending screen), within 30 seconds check the DB:
   ```sql
   SELECT ai_writing_status, ai_writing_score, ai_writing_justification_ar
     FROM mock_exam_attempts WHERE id = '<attempt_id>';
   ```
   Expected: `ai_writing_status='graded'`, score is reasonable (likely 6-9 for A1 honest attempt), justification in Arabic
4. Admin reveals → student sees full AI feedback with justification + strengths + improvements

### Scenario B — Spam writing (AI should give low score)
1. Fresh attempt
2. In writing: type "word word word word word word..." × 50 times (50 identical words)
3. Submit
4. Check DB → expect `ai_writing_score` ≤ 3, justification in Arabic explaining repetition

### Scenario C — Single long string with no spaces (gibberish)
1. Fresh attempt
2. In writing: type a single 200-character string (e.g. "aaaaaa...")
3. Word count = 1 (below min) → submit modal warns about word count
4. Override submit
5. Check DB → either:
   - AI scored it 0-2 with justification about meaninglessness, OR
   - Fallback fired with score 0 (word count below min)

### Scenario D — Mixed Arabic/English honest writing
1. Fresh attempt, B1 test student
2. Writing: a genuine 90-word response with mostly English + a few Arabic words mixed in
3. Submit → check AI handles this gracefully (should still score reasonably, perhaps with a note about mixing languages)

### Scenario E — Fallback (simulate AI failure)
1. Temporarily delete the ANTHROPIC_API_KEY secret:
   ```bash
   npx supabase secrets unset ANTHROPIC_API_KEY
   ```
2. Fresh attempt → submit with valid writing
3. Edge function should fall back to heuristic
4. DB shows `ai_writing_status='fallback'`, score from the heuristic (likely 6), justification mentions "تعذّر التقييم التلقائي"
5. Restore the secret immediately after:
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=<key>
   ```

### Scenario F — Retry from trainer dashboard
1. Take the fallback-scored attempt from Scenario E
2. As admin, open trainer dashboard → expand the attempt → click "إعادة التقييم بالذكاء الاصطناعي"
3. Within 30s, refetch → `ai_writing_status='graded'`, new score from real AI

### Scenario G — Manual override wins over AI
1. Take any graded attempt
2. As admin, set `manual_writing_score = 8.5`
3. Refresh detail panel → final writing score is 8.5, AI score still visible for reference
4. Trigger retry from dashboard → AI re-grades but final writing score stays at 8.5 (manual wins)

### Scenario H — Submit during peak load (concurrency)
1. Two test students (A1 + B1) submit at the same time
2. Both trigger edge function in parallel
3. Both should complete successfully within 30s
4. No data corruption

### Scenario I — Idempotent edge function
1. After a successful AI grade, manually invoke the edge function again with the same attempt_id
2. Expected: returns `{ success: true, idempotent: true }`, does NOT re-grade

### Scenario J — Edge function called via curl (smoke)
```bash
curl -X POST "https://<project>.supabase.co/functions/v1/mock-exam-grade-writing" \
  -H "Authorization: Bearer <anon-or-service-key>" \
  -H "Content-Type: application/json" \
  -d '{"attempt_id":"<test_attempt_id>"}'
```
Expected: JSON response with success status.

### Scenario K — Regression: all Fix 1 + Fix 2 behaviors still work
- Submit modal still detects issues
- Pending screen still appears
- Reveal flow still works
- Resume-to-position still works
- Question chips still work

### Post-QA cleanup
```sql
DELETE FROM mock_exam_ai_writing_log WHERE attempt_id IN (
  SELECT id FROM mock_exam_attempts WHERE student_id IN (
    SELECT id FROM profiles WHERE is_test_account = true
  )
);
DELETE FROM mock_exam_answers WHERE attempt_id IN (
  SELECT id FROM mock_exam_attempts WHERE student_id IN (
    SELECT id FROM profiles WHERE is_test_account = true
  )
);
DELETE FROM mock_exam_attempts WHERE student_id IN (
  SELECT id FROM profiles WHERE is_test_account = true
);
```

---

## TASK 7 — Atomic commit + push

```bash
git status
git add -A
git commit -m "feat(mock-exam): AI-powered writing grading with 3-layer reliability

- New Edge Function: mock-exam-grade-writing (Deno + Anthropic SDK)
  * Primary: Claude Sonnet (claude-sonnet-4-20250514) with level-aware rubric
  * Retry: one automatic retry on failure with 2s backoff
  * Fallback: smart heuristic (word count / repetition / avg word length / gibberish detection)
- New DB columns on mock_exam_attempts: ai_writing_score, ai_writing_status, ai_writing_justification_ar, ai_writing_strengths_ar, ai_writing_improvements_ar, ai_writing_graded_at
- New table mock_exam_ai_writing_log for audit + cost tracking
- New RPC mock_exam_apply_ai_writing_score (SECURITY DEFINER) — service_role or trainer/admin only, idempotent, manual override always wins
- Updated mock_exam_submit: initial writing score = 0 + ai_writing_status='pending' (AI grader fills in async)
- Updated mock_exam_get_result: returns ai_writing_* fields
- Frontend submit flow: fire-and-forget Edge Function call after submit (non-blocking)
- Student result page: enriched writing section with AI justification + strengths + improvements (revealed view only)
- Trainer detail panel: AI feedback display + 'إعادة التقييم' retry button + status badge
- Async by design: student never waits for AI grading; trainer can retry from dashboard
- Bug fixed: spam/repetitive text no longer gets 10/10 automatically
- All Fix 1 + Fix 2 + reveal flows preserved (regression-tested)
- Visibility='preview' preserved; existing 7 RPCs untouched (1 new RPC added)
- 11 QA scenarios PASS (A-K)"
git push origin main
```

---

## TASK 8 — Final handoff output

After push completes:

```
=== MOCK EXAM FIX 3 DEPLOYED — AI WRITING GRADING ===
Commit: <sha>
Edge Function deployed: mock-exam-grade-writing
ANTHROPIC_API_KEY secret: <SET / NOT SET — verify with `npx supabase secrets list`>
QA: 11/11 scenarios PASS (or document specifics)

IMPORTANT — Ali must verify the ANTHROPIC_API_KEY secret:
  npx supabase secrets list
If ANTHROPIC_API_KEY is not in the list, set it:
  npx supabase secrets set ANTHROPIC_API_KEY=<your-key>
Without it the edge function falls back to the smart heuristic.

>>> ALI'S RE-TEST <<<
1. Wait ~2 min for Vercel deploy
2. Open incognito → mock-test-a1@fluentia.academy / MockTest2025!
3. Take the exam end-to-end with GENUINE writing (~60 words about your routine)
4. Submit → pending screen
5. After ~15 seconds (background grading), as admin check trainer dashboard:
   - Expand the attempt → see AI score + Arabic justification + strengths + improvements
6. Try the spam scenario: another fresh test attempt with 'word word word...' x50
   → AI scores it 0-3, justification explains repetition
7. Try clicking 'إعادة التقييم' from trainer dashboard → re-grades within 15s
8. Reveal → student sees full AI feedback

>>> WHEN READY FOR REAL STUDENTS <<<
UPDATE mock_exams SET visibility='live' WHERE code IN ('midterm-mock-a1','midterm-mock-b1');

>>> COST EXPECTATION FOR THIS EXAM <<<
20 students × ~150 words × Claude Sonnet pricing ≈ < $0.50 total
Audit log available: SELECT * FROM mock_exam_ai_writing_log ORDER BY created_at DESC;
```

Go.
