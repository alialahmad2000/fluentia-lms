// scripts/mock-exam-fix1-qa.cjs
// Phase 6 QA for FIX-1: end-to-end reveal flow via real JWTs.
//   1. A1 test student submits w/ 60-word writing → get_result returns pending_review:true
//   2. Throwaway admin reveals the attempt → get_result for the student returns full detail
//   3. Throwaway admin sets manual_writing_score=7.5 → score_total recomputes, passed flips correctly
//   4. Cleanup: delete throwaway admin + all test-account attempts

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const URL = process.env.SUPABASE_URL;
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const TEST_A1_EMAIL = 'mock-test-a1@fluentia.academy';
const TEST_PW = 'MockTest2025!';

const PASS = (l) => console.log(`  PASS  ${l}`);
const FAIL = (l, e) => { console.log(`  FAIL  ${l} — ${e?.message || JSON.stringify(e) || e}`); process.exitCode = 1; };

async function signInPw(email, password) {
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function main() {
  console.log('=== MOCK-EXAM-FIX-1 QA ===\n');
  const admin = createClient(URL, SR_KEY, { auth: { persistSession: false } });

  // -------------------------------------------------------------
  // [Pre] Cleanup any existing test attempts so the flow is fresh
  // -------------------------------------------------------------
  console.log('[pre] clearing existing test attempts');
  const { data: testProfiles } = await admin.from('profiles').select('id').eq('is_test_account', true);
  if (testProfiles?.length) {
    const ids = testProfiles.map((p) => p.id);
    await admin.from('mock_exam_attempts').delete().in('student_id', ids);
  }

  // -------------------------------------------------------------
  // [1] A1 student takes the exam end-to-end
  // -------------------------------------------------------------
  console.log('\n[1] A1 test student — full happy path');
  const stu = await signInPw(TEST_A1_EMAIL, TEST_PW);

  let attemptId, questions;
  try {
    const { data, error } = await stu.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-a1' });
    if (error) throw error;
    attemptId = data.attempt_id;
    questions = data.questions;
    PASS('mock_exam_start returns attempt + 35 questions');
    if (questions.length !== 35) FAIL('A1 question count = 35', `got ${questions.length}`);
  } catch (e) { FAIL('mock_exam_start', e); return; }

  // Save 5 answers
  const firstFive = questions.filter((q) => q.question_type === 'mcq' || q.question_type === 'true_false').slice(0, 5);
  let saveOk = 0;
  for (const q of firstFive) {
    try {
      const { error } = await stu.rpc('mock_exam_save_answer', {
        p_attempt_id: attemptId, p_question_id: q.id,
        p_selected_index: 1, p_text_answer: null,
      });
      if (!error) saveOk++;
      else FAIL(`save_answer for ${q.id}`, error);
    } catch (e) { FAIL(`save_answer for ${q.id}`, e); }
  }
  if (saveOk === 5) PASS('5 save_answer calls all succeeded (no .catch errors)');

  // Save writing (>50 words to score full points)
  const writing = 'My morning routine is calm and simple. I wake up at six in the morning every day. I pray and then I drink a cup of warm tea with my mother in the kitchen. I read for ten minutes from a small English book. Then I take a shower and wear my clean clothes. I eat a light breakfast with bread and cheese before I leave for school by car.';
  let wWords;
  try {
    const { data, error } = await stu.rpc('mock_exam_save_writing', {
      p_attempt_id: attemptId, p_writing_text: writing,
    });
    if (error) throw error;
    wWords = data;
    if (data >= 50) PASS(`save_writing returned word count ${data} (≥50)`);
    else FAIL('save_writing word count ≥ 50', `got ${data}`);
  } catch (e) { FAIL('save_writing', e); }

  // Submit — this is the path that was broken pre-fix
  let submitData;
  try {
    const { data, error } = await stu.rpc('mock_exam_submit', { p_attempt_id: attemptId, p_auto: false });
    if (error) throw error;
    submitData = data;
    PASS('mock_exam_submit returned score (bug 1 fixed end-to-end)');
    if (data.score_writing === 10) PASS('writing scored full 10 (≥50 words)');
    else FAIL('writing scored 10', `got ${data.score_writing}`);
  } catch (e) { FAIL('mock_exam_submit', e); return; }

  // -------------------------------------------------------------
  // [2] Student calls get_result → expect pending_review:true
  // -------------------------------------------------------------
  console.log('\n[2] Student get_result while unrevealed');
  try {
    const { data, error } = await stu.rpc('mock_exam_get_result', { p_attempt_id: attemptId });
    if (error) throw error;
    if (data.pending_review === true) PASS('pending_review: true (gated)');
    else FAIL('pending_review: true', data);
    if (data.is_revealed === false) PASS('is_revealed: false');
    else FAIL('is_revealed: false', data);
    if (data.score_total === undefined) PASS('no score_total exposed to unrevealed student');
    else FAIL('no score_total exposed', `score_total=${data.score_total}`);
  } catch (e) { FAIL('student get_result pending', e); }

  // -------------------------------------------------------------
  // [3] Throwaway admin reveals the attempt
  // -------------------------------------------------------------
  console.log('\n[3] Throwaway admin reveals the attempt');
  const adminEmail = `qa-admin-${Date.now()}@fluentia.academy`;
  const adminPw = 'QAAdmin2025!';
  let adminId = null;
  try {
    const { data: au, error: auErr } = await admin.auth.admin.createUser({
      email: adminEmail, password: adminPw, email_confirm: true,
    });
    if (auErr) throw auErr;
    adminId = au.user.id;
    await admin.from('profiles').upsert({
      id: adminId, role: 'admin', full_name: 'QA Admin', email: adminEmail,
      is_test_account: false, must_change_password: false,
    });
    const adminClient = await signInPw(adminEmail, adminPw);

    // Single-attempt reveal
    const { data: rev, error: revErr } = await adminClient.rpc('mock_exam_reveal', {
      p_attempt_id: attemptId, p_exam_code: null, p_reveal: true,
    });
    if (revErr) throw revErr;
    if (rev?.count === 1 && rev?.revealed === true) PASS('mock_exam_reveal single attempt → {count:1, revealed:true}');
    else FAIL('mock_exam_reveal output', rev);

    // [3b] Manual writing score override
    console.log('\n[3b] Manual writing score override (10 → 7.5)');
    const { data: ms, error: msErr } = await adminClient.rpc('mock_exam_set_manual_writing_score', {
      p_attempt_id: attemptId, p_score: 7.5,
    });
    if (msErr) throw msErr;
    if (ms?.score_writing === 7.5) PASS('writing score updated to 7.5');
    else FAIL('writing score = 7.5', ms);
    const beforeTotal = Number(submitData.score_total);
    const expectedAfter = beforeTotal - 10 + 7.5;
    if (Math.abs(Number(ms.score_total) - expectedAfter) < 0.01)
      PASS(`score_total recomputed: ${beforeTotal} → ${ms.score_total} (expected ${expectedAfter})`);
    else FAIL('score_total recomputed correctly', ms);

    // [3c] Try invalid score (out of range)
    const { error: bad } = await adminClient.rpc('mock_exam_set_manual_writing_score', {
      p_attempt_id: attemptId, p_score: 99,
    });
    if (bad && (bad.message || '').includes('score_out_of_range')) PASS('out-of-range score rejected');
    else FAIL('out-of-range score rejected', bad);

    // [3d] Non-staff can't reveal
    const stuClient = await signInPw(TEST_A1_EMAIL, TEST_PW);
    const { error: stuRev } = await stuClient.rpc('mock_exam_reveal', {
      p_attempt_id: attemptId, p_exam_code: null, p_reveal: true,
    });
    if (stuRev && (stuRev.message || '').includes('not_authorized')) PASS('student blocked from reveal RPC');
    else FAIL('student blocked from reveal RPC', stuRev);

    const { error: stuMs } = await stuClient.rpc('mock_exam_set_manual_writing_score', {
      p_attempt_id: attemptId, p_score: 5,
    });
    if (stuMs && (stuMs.message || '').includes('not_authorized')) PASS('student blocked from set_manual_writing_score');
    else FAIL('student blocked from set_manual_writing_score', stuMs);
  } catch (e) { FAIL('throwaway admin flow', e); }

  // -------------------------------------------------------------
  // [4] Student now sees full result
  // -------------------------------------------------------------
  console.log('\n[4] Student get_result post-reveal');
  try {
    const stu2 = await signInPw(TEST_A1_EMAIL, TEST_PW);
    const { data, error } = await stu2.rpc('mock_exam_get_result', { p_attempt_id: attemptId });
    if (error) throw error;
    if (data.pending_review === false) PASS('pending_review: false');
    else FAIL('pending_review: false', data);
    if (data.is_revealed === true) PASS('is_revealed: true');
    else FAIL('is_revealed: true', data);
    if (Array.isArray(data.questions) && data.questions.length === 35) PASS('full 35 questions returned');
    else FAIL('full questions returned', data.questions?.length);
    if (typeof data.score_total === 'number') PASS(`score_total exposed (${data.score_total})`);
    else FAIL('score_total exposed', data.score_total);
    if (data.score_writing === 7.5) PASS('writing score reflects manual override');
    else FAIL('writing score reflects manual override', data.score_writing);
    // Spot-check one question has student_selected_index + is_correct
    const aq = data.questions.find((q) => q.student_selected_index !== null && q.student_selected_index !== undefined);
    if (aq && typeof aq.is_correct === 'boolean') PASS('per-question student_selected_index + is_correct present');
    else FAIL('per-question feedback fields present', aq);
  } catch (e) { FAIL('student post-reveal get_result', e); }

  // -------------------------------------------------------------
  // [5] Cleanup throwaway admin + test attempts
  // -------------------------------------------------------------
  console.log('\n[5] Cleanup');
  if (adminId) {
    await admin.from('profiles').delete().eq('id', adminId).then(() => {}).catch(() => {});
    await admin.auth.admin.deleteUser(adminId).then(() => {}).catch(() => {});
    console.log(`  removed throwaway admin ${adminEmail}`);
  }
  const { data: tps } = await admin.from('profiles').select('id').eq('is_test_account', true);
  if (tps?.length) {
    const ids = tps.map((p) => p.id);
    const { count } = await admin.from('mock_exam_attempts').delete({ count: 'exact' }).in('student_id', ids);
    console.log(`  deleted ${count ?? 0} test attempt(s) (cascade)`);
  }

  console.log('\n=== QA done ===');
  process.exit(process.exitCode || 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
