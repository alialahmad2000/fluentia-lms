// scripts/mock-exam-qa.cjs
// End-to-end Phase I QA: signs in as the test students (real JWT, NOT service-role),
// exercises every RPC happy + failure path, and verifies idempotency.
// At the end, restores production state by deleting any test attempts so Ali can
// take a fresh attempt himself.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const URL = process.env.SUPABASE_URL;
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const TEST_A1_EMAIL = 'mock-test-a1@fluentia.academy';
const TEST_B1_EMAIL = 'mock-test-b1@fluentia.academy';
const TEST_PW = 'MockTest2025!';

const PASS = (label) => console.log(`  PASS  ${label}`);
const FAIL = (label, e) => { console.log(`  FAIL  ${label} — ${e?.message || e}`); process.exitCode = 1; };

async function expectErr(label, p, code) {
  try {
    const { data, error } = await p;
    if (error && error.message && error.message.includes(code)) {
      PASS(label);
    } else {
      FAIL(label, `expected error containing "${code}", got: ` + JSON.stringify({ data, error }));
    }
  } catch (e) {
    if ((e?.message || '').includes(code)) PASS(label);
    else FAIL(label, e);
  }
}

async function expectOk(label, p) {
  try {
    const { data, error } = await p;
    if (error) { FAIL(label, error); return null; }
    PASS(label);
    return data;
  } catch (e) {
    FAIL(label, e);
    return null;
  }
}

async function signIn(email) {
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: TEST_PW });
  if (error) throw error;
  // Build an authed client with the access token (so RPCs see auth.uid())
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function main() {
  console.log('=== Phase I QA — Mock exam RPCs ===\n');
  const admin = createClient(URL, SR_KEY, { auth: { persistSession: false } });

  // Capture exam ids
  const { data: a1exam } = await admin.from('mock_exams').select('id').eq('code', 'midterm-mock-a1').single();
  const { data: b1exam } = await admin.from('mock_exams').select('id').eq('code', 'midterm-mock-b1').single();
  console.log(`A1 id=${a1exam.id}  B1 id=${b1exam.id}`);

  // -------------------------------------------------------------
  // I.3 — A1 happy path as TEST A1 student
  // -------------------------------------------------------------
  console.log('\n[I.3] A1 test-account happy path');
  const a1 = await signIn(TEST_A1_EMAIL);
  const startA1 = await expectOk('A1 mock_exam_start succeeds in preview mode (test account)',
    a1.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-a1' }));

  if (startA1) {
    if (startA1.questions.length === 35) PASS('A1 returns 35 questions');
    else FAIL('A1 returns 35 questions', `got ${startA1.questions.length}`);
    if (Array.isArray(startA1.saved_answers) && startA1.saved_answers.length === 0)
      PASS('A1 saved_answers initially empty');
    else FAIL('A1 saved_answers initially empty', startA1.saved_answers);

    // Pick first grammar question + answer it
    const firstMcq = startA1.questions.find((q) => q.question_type === 'mcq');
    await expectOk('A1 mock_exam_save_answer (single mcq)',
      a1.rpc('mock_exam_save_answer', {
        p_attempt_id: startA1.attempt_id,
        p_question_id: firstMcq.id,
        p_selected_index: 1,
        p_text_answer: null,
      }));

    // Save writing with < min words (should be allowed; submit will score 0)
    const writeWords = await expectOk('A1 mock_exam_save_writing (returns word count)',
      a1.rpc('mock_exam_save_writing', {
        p_attempt_id: startA1.attempt_id,
        p_writing_text: 'hello world this is a test',
      }));
    if (writeWords === 6) PASS('A1 writing word count = 6');
    else FAIL('A1 writing word count = 6', `got ${writeWords}`);

    // Submit
    const result = await expectOk('A1 mock_exam_submit returns scores',
      a1.rpc('mock_exam_submit', { p_attempt_id: startA1.attempt_id, p_auto: false }));
    if (result?.idempotent === false) PASS('A1 first submit idempotent=false');
    else FAIL('A1 first submit idempotent=false', result);
    if (result?.score_writing === 0) PASS('A1 writing scored 0 (under min)');
    else FAIL('A1 writing scored 0 (under min)', result?.score_writing);

    // Idempotent re-submit
    const result2 = await expectOk('A1 mock_exam_submit (idempotent re-call)',
      a1.rpc('mock_exam_submit', { p_attempt_id: startA1.attempt_id, p_auto: false }));
    if (result2?.idempotent === true && result2?.score_total === result?.score_total)
      PASS('A1 re-submit returns same scores with idempotent=true');
    else FAIL('A1 re-submit idempotent + same scores', result2);

    // Starting a new attempt after submit → already_submitted
    await expectErr('A1 start after submit → already_submitted',
      a1.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-a1' }), 'already_submitted');
  }

  // -------------------------------------------------------------
  // I.4 — failure paths via the A1 test student
  // -------------------------------------------------------------
  console.log('\n[I.4] Failure paths');
  // Already-submitted student tries B1 → level_mismatch (level 1 ≠ level 3)
  await expectErr('A1 student starting B1 → student_level_mismatch',
    a1.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-b1' }), 'student_level_mismatch');

  // Direct query of mock_exam_questions as student → should return 0 rows (RLS)
  const { data: qRows } = await a1.from('mock_exam_questions').select('id').limit(5);
  if (Array.isArray(qRows) && qRows.length === 0) PASS('A1 student cannot SELECT mock_exam_questions (RLS)');
  else FAIL('A1 student cannot SELECT mock_exam_questions (RLS)', qRows);

  // B1 test student happy path (smaller smoke)
  console.log('\n[I.3b] B1 test-account smoke');
  const b1 = await signIn(TEST_B1_EMAIL);
  const startB1 = await expectOk('B1 mock_exam_start succeeds (test account)',
    b1.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-b1' }));
  if (startB1) {
    if (startB1.questions.length === 39) PASS('B1 returns 39 questions');
    else FAIL('B1 returns 39 questions', `got ${startB1.questions.length}`);
    // Idempotent start — same attempt_id
    const startB1b = await expectOk('B1 mock_exam_start called again (resume)',
      b1.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-b1' }));
    if (startB1b.attempt_id === startB1.attempt_id) PASS('B1 second start returns same attempt_id (resume)');
    else FAIL('B1 second start returns same attempt_id (resume)', { a: startB1.attempt_id, b: startB1b.attempt_id });
  }

  // Create a throwaway non-test L1 student → verify preview-mode rejects them.
  console.log('\n[I.4b] Throwaway non-test L1 student rejected in preview');
  const throwawayEmail = `qa-throwaway-${Date.now()}@fluentia.academy`;
  const throwawayPw = 'QAThrow2025!';
  let throwawayId = null;
  try {
    const { data: ta, error: taErr } = await admin.auth.admin.createUser({
      email: throwawayEmail,
      password: throwawayPw,
      email_confirm: true,
    });
    if (taErr) throw taErr;
    throwawayId = ta.user.id;
    await admin.from('profiles').upsert({
      id: throwawayId,
      role: 'student',
      full_name: 'QA Throwaway L1',
      email: throwawayEmail,
      is_test_account: false,
      must_change_password: false,
    });
    await admin.from('students').upsert({
      id: throwawayId,
      academic_level: 1,
      package: 'asas',
      track: 'foundation',
      status: 'active',
    });
    // Sign in as the throwaway and try to start
    const c2 = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: sess, error: sErr } = await c2.auth.signInWithPassword({
      email: throwawayEmail, password: throwawayPw,
    });
    if (sErr) throw sErr;
    const realAuthed = createClient(URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${sess.session.access_token}` } },
    });
    await expectErr('Non-test L1 student → exam_in_preview_mode',
      realAuthed.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-a1' }), 'exam_in_preview_mode');
  } catch (e) {
    console.log('  SKIP  throwaway path failed:', e.message);
  } finally {
    // Cleanup: delete the throwaway user
    if (throwawayId) {
      await admin.from('students').delete().eq('id', throwawayId).then(() => {}).catch(() => {});
      await admin.from('profiles').delete().eq('id', throwawayId).then(() => {}).catch(() => {});
      await admin.auth.admin.deleteUser(throwawayId).then(() => {}).catch(() => {});
      console.log(`  cleanup: throwaway user ${throwawayEmail} removed`);
    }
  }

  // -------------------------------------------------------------
  // I.7 — Restore: delete test attempts created during QA so Ali can take a fresh attempt
  // -------------------------------------------------------------
  console.log('\n[I.7] Cleanup — delete test attempts so Ali can take a fresh attempt');
  const { data: testProfiles } = await admin.from('profiles').select('id').eq('is_test_account', true);
  if (testProfiles?.length) {
    const ids = testProfiles.map((p) => p.id);
    const { count } = await admin
      .from('mock_exam_attempts')
      .delete({ count: 'exact' })
      .in('student_id', ids);
    console.log(`  deleted ${count ?? 0} test attempt(s) (cascades to answers + audit_log via ON DELETE)`);
  }

  console.log('\n=== QA finished ===');
  process.exit(process.exitCode || 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
