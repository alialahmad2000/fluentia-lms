# MOCK-EXAM-FIX-3 — QA Report

29/29 scriptable assertions PASS. Real Claude calls performed against the LIVE deployed edge function with the project's existing `CLAUDE_API_KEY` secret.

Run: `node scripts/mock-exam-fix3-qa.cjs`

## Migration smoke

- 6 new columns on `mock_exam_attempts`: `ai_writing_score`, `ai_writing_status`, `ai_writing_justification_ar`, `ai_writing_strengths_ar`, `ai_writing_improvements_ar`, `ai_writing_graded_at` ✓
- `mock_exam_ai_writing_log` table + RLS (staff SELECT) + composite index ✓
- New RPCs (3): `mock_exam_apply_ai_writing_score`, `mock_exam_reset_ai_status`, plus surgical replacements of `mock_exam_submit` + `mock_exam_get_result` ✓

## Edge function deployment

- Slug: `mock-exam-grade-writing` — version 4 ACTIVE — verify_jwt=false
- Deployed via Supabase Management API multipart `/functions/deploy` endpoint
- Model: `claude-sonnet-4-6` (prompt's `claude-sonnet-4-20250514` is deprecated — retired project-wide on 2026-03-14)
- Env key support: `ANTHROPIC_API_KEY ?? CLAUDE_API_KEY` (project's existing `CLAUDE_API_KEY` secret is being used)

## Scenarios — 29/29 PASS

### [A] Real AI grading — primary path
- A1 student submits a 70-word genuine morning-routine writing
- Edge function returns: `layer=primary, score=9` within ~10s
- DB: `ai_writing_status='graded'`, Arabic justification present, score reasonable for honest A1 ✓

### [B] Spam writing — `word word word…` × 60
- Claude correctly recognized repetition → scored **0/10** with Arabic justification calling out the repetition
- DB: `ai_writing_status='graded'` (Claude evaluated it; the score itself is the deterrent) ✓

### [C] Single long token — `aaa…` × 200
- Server word count = 1 (no whitespace)
- Edge function processed via AI path → scored **0/10** (under min + gibberish) ✓

### [D] Mixed Arabic/English honest B1 writing
- Student wrote 70+ words mixing English with a few Arabic phrases
- Claude graded gracefully → `score=7/10`, status='graded' ✓

### [E] Fallback path — empty writing forces fallback
- Student submits with empty writing → edge function detects `writingText.length === 0`, skips Claude, runs `smartFallbackScore`
- DB: `ai_writing_status='fallback'`, `score=0`, justification starts with "تعذّر التقييم التلقائي…" + reason in Arabic ✓

### [F] Retry from trainer dashboard
- Existing fallback-scored attempt has its writing_response updated by admin to a real 64-word answer
- Admin calls `mock_exam_reset_ai_status` (sets status='pending') → edge function re-invoked
- Result: `layer=primary, score=9, status='graded'` ✓

### [G] Manual override always wins
- After step [F]'s 9/10 AI score, admin sets `manual_writing_score=8.5` via `mock_exam_set_manual_writing_score`
- Admin resets AI status + re-invokes edge function — AI grades it 9 again, BUT:
  - `score_writing` stays at 8.5 (manual override preserved) ✓
  - `ai_writing_score=9` still recorded for reference ✓

### [I] Edge function idempotency
- After successful grade, calling the function again returns `{success: true, idempotent: true, status: 'graded'}` — no re-grade ✓

### [J] Curl smoke
- Direct POST with anon key → HTTP 200, `{success: true, idempotent: true, ...}` ✓

### [K] Regression — Fix-1 + Fix-2 flows preserved
Static checks confirm:
- `SubmitConfirmModal` still imported + used in `MockExamAttempt.jsx` ✓
- `localStorage 'mock-exam-pos-'` resume-to-position still wired ✓
- New fire-and-forget `mock-exam-grade-writing` invoke present ✓
- Pending-screen branch present in `MockExamResult.jsx` ✓
- AI feedback block (status/score/justification/strengths/improvements) wired ✓
- Trainer `AiWritingPanel` wired with retry button + status badge ✓
- Trainer retry path uses `mock_exam_reset_ai_status` RPC ✓

## Cost telemetry (from one full QA run)

A1 genuine + B1 mixed-language + spam + retry → ~6 real Claude calls × Sonnet pricing ≈ negligible (< $0.05 for the entire QA run).

`mock_exam_ai_writing_log` has full audit trail: `attempt_id, status, layer, score, ai_model, prompt_tokens, output_tokens, error_message, duration_ms, created_at`.

## Production state restored

- Both exams: `visibility='preview'`, `is_active=true`, correct window ✓
- 0 test-account attempts (cleaned) ✓
- 2 test accounts intact (`mock-test-a1`, `mock-test-b1`) ✓
- Throwaway admin removed ✓

**All checks green. Clear to commit.**
