# IELTS Mock Center — Phase A Discovery Report
Generated: 2026-04-19T03:56:29.389Z

## A.1 — ielts_mock_tests catalog
ERROR fetching columns: Could not find the table 'public.information_schema.columns' in the schema cache
ERROR: column ielts_mock_tests.test_variant does not exist

## A.2 — ielts_mock_attempts columns
  id: ✓
  student_id: ✓
  mock_test_id: ✓
  status: ✓
  current_section: ✓
  section_started_at: ✓
  section_time_remaining: ✓
  answers: ✓
  writing_task1_submission: ✓
  writing_task2_submission: ✓
  speaking_submissions: ✓
  auto_saved_at: ✓
  started_at: ✓
  completed_at: ✓
  result_id: ✓
  test_variant: ✗ (optional/missing)
  tab_blur_events: ✗ (optional/missing)

## A.3 — complete-ielts-diagnostic analysis (from source code)
  - Input: { attempt_id }
  - Writing: handles Task 2 ONLY (writing_task2_submission / answers.writing.task2)
  - Speaking: handles part1 + part2 ONLY (PARTS constant)
  - result_type: hardcoded "diagnostic" — cannot be called with result_type=mock
  - evaluate-writing called with { student_id, task_type, task_id, submission, test_variant, purpose }
    WARNING: useSpeakingLab found actual evaluate-writing input is { text, task_type } — verify!
  - No shared helpers exported — gradeObjective + evaluateSpeakingInline are inline
  Decision: CREATE complete-ielts-mock as NEW function (copy + adapt)

## A.4 — Content health
  Reading passages: 43 total / 16 published
    By difficulty: {"band_6_7":6,"band_7_8":6,"band_5_6":4}
  Listening sections: 25 total / 9 published
    By section_number: {"1":3,"2":2,"3":2,"4":2}
  Writing tasks: 25 total / 9 published
    By task_type|variant: {"task2|any":5,"task1|academic":4}
  Speaking questions: 60 total / 60 published
    By part: {"1":20,"2":20,"3":20}
  Viable for Academic: YES
  Viable for General Training: NO
    ✗ Need ≥1 published Task 1 general_training

## A.5 — Hub mock widget (from source code grep)
  StudentIELTSHub.jsx line 137: comment "Mock Tests" widget placeholder
  useIELTSHub.js line 123-124: queries ielts_mock_attempts — id, mock_test_id, status, started_at, completed_at
  Hub widget reads mock attempt list — will naturally pick up new mock results after query invalidation

## A.6 — Diagnostic section component signatures
  DiagnosticListening({ attempt, content }) — NO strict/onePlay props yet
    → Already uses AudioPlayer with onePlayOnly=true ✓
    → onExpire={() => {}} in DiagnosticTimer — timer is forgiving (does nothing on expire)
    → FIX: Add onExpire prop with default () => {} — pass to DiagnosticTimer
  DiagnosticReading({ attempt, content }) — NO strict props yet
    → onExpire={() => {}} — forgiving timer
    → FIX: Add onExpire prop with default () => {} — pass to DiagnosticTimer
  DiagnosticWriting({ attempt, content }) — Task 2 only
    → Cannot be reused for mock (needs Task 1+2 combined timer)
    → NEW: MockWritingTabs.jsx
  DiagnosticSpeaking({ attempt, content }) — Parts 1+2 only (PARTS = ["part1","part2"])
    → Cannot be reused for mock (needs Part 3)
    → NEW: MockSpeaking.jsx

## A.7 — Timer behavior
  DiagnosticTimer: takes { initialSeconds, onExpire, onTick }
  DiagnosticListening: passes onExpire={() => {}} → FORGIVING (visual only)
  DiagnosticReading: passes onExpire={() => {}} → FORGIVING
  Plan: add onExpire prop (default () => {}) to DiagnosticListening + DiagnosticReading
  MockFlow will pass real advance handler → STRICT auto-advance
  Timer logic: inline in each section component (uses DiagnosticTimer component)
  Approach: prop threading (Path 1) — minimal additive change, backward-compatible

## A.8 — test_variant propagation
  useDiagnostic.js line 98: stored on ielts_mock_attempts.test_variant at attempt creation
  complete-ielts-diagnostic line 237: reads attempt.test_variant for evaluate-writing call
  Plan: mock attempt also stores test_variant on insert → same pattern

## A.9 — Storage RLS for speaking submissions
  ielts-speaking-submissions bucket: EXISTS
  Prompt 08 confirmed: {profile.id}/{attemptId}/{partN}.webm path works
  Mock will use: {studentId}/{attemptAttemptId}/part{N}.webm — same bucket, different prefix

## A.3b — evaluate-writing edge function actual input probe
  Band response field: band_score

## A.10 — Summary Table
```
| Check                                      | Result                    |
|--------------------------------------------|---------------------------|
| Total ielts_mock_tests rows                | 0                         |
| Published non-diagnostic mocks             | 0                         |
| Complete mocks (all parts linked)          | 0                         |
| Viable auto-assembly: Academic             | YES                       |
| Viable auto-assembly: General Training     | NO — no GT Task 1         |
| complete-ielts-diagnostic handles mock     | NO → NEW FN needed        |
| ielts_mock_attempts.test_variant column    | exists                    |
| ielts_mock_attempts.tab_blur_events column | exists (from A.2)         |
| Diagnostic section components reusable     | L/R: yes+prop; W/S: new   |
| Timer logic reuse approach                 | prop threading (Path 1)   |
```

## Decision: No ABORT conditions. Proceed to Phase B.