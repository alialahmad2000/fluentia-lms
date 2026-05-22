// scripts/mock-exam-fix2-qa.cjs
// FIX-2 QA: scriptable scenarios + word-count parity check.
// Scenarios A/C/E/H are pure browser UX and are covered in the QA report's
// "Manual verification" block. The scriptable scenarios are:
//   B — submit with 0 answers + 0 writing (override path)
//   D — simulate transient error (bad attempt id), then idempotent recovery
//   F — single long token in writing ("aaaaaa…") server counts 1
//   I — reveal flow regression (Fix 1)
//   J — manual writing score regression (Fix 1)
// Plus a server-vs-client word-count parity check across 9 cases.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const URL = process.env.SUPABASE_URL;
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const TEST_A1_EMAIL = 'mock-test-a1@fluentia.academy';
const TEST_PW = 'MockTest2025!';

const PASS = (l) => console.log(`  PASS  ${l}`);
const FAIL = (l, e) => { console.log(`  FAIL  ${l} — ${e?.message || JSON.stringify(e) || e}`); process.exitCode = 1; };

async function signIn(email, password) {
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

function countWordsClient(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

async function clearTestAttempts(admin) {
  const { data: tp } = await admin.from('profiles').select('id').eq('is_test_account', true);
  if (tp?.length) {
    await admin.from('mock_exam_attempts').delete().in('student_id', tp.map((p) => p.id));
  }
}

async function main() {
  console.log('=== FIX-2 QA ===\n');
  const admin = createClient(URL, SR_KEY, { auth: { persistSession: false } });
  await clearTestAttempts(admin);

  // ───────────────────────────────────────────────────────────
  // [WC] Server vs client word-count parity
  // ───────────────────────────────────────────────────────────
  console.log('[WC] server vs client word count parity');
  // Sign in to get a real attempt — need an attempt_id so save_writing has something to write to
  const stu = await signIn(TEST_A1_EMAIL, TEST_PW);
  const { data: startData, error: startErr } = await stu.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-a1' });
  if (startErr) { FAIL('mock_exam_start (for WC test)', startErr); return; }
  const attemptId = startData.attempt_id;
  const cases = [
    '',
    '   ',
    'hello',
    'hello world',
    'hello\nworld',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'hello   world   from   me',
    'مرحبا بك',
    'a\tb\rc\nd',
  ];
  for (const t of cases) {
    const clientCount = countWordsClient(t);
    const { data: serverCount, error: e } = await stu.rpc('mock_exam_save_writing', {
      p_attempt_id: attemptId, p_writing_text: t,
    });
    if (e) { FAIL(`save_writing("${t.slice(0,20)}…")`, e); continue; }
    if (serverCount === clientCount) PASS(`"${t.length<=20 ? t.replace(/\n/g,'\\n').replace(/\t/g,'\\t').replace(/\r/g,'\\r') : t.slice(0,17)+'…'}" → ${serverCount} (client agrees)`);
    else FAIL(`parity ${JSON.stringify(t.slice(0,30))}`, `server=${serverCount} client=${clientCount}`);
  }
  // Clear the writing back to empty so the rest of the scenarios start clean
  await stu.rpc('mock_exam_save_writing', { p_attempt_id: attemptId, p_writing_text: '' });

  // ───────────────────────────────────────────────────────────
  // [B] Submit with 0 answers + 0 writing — override path
  // ───────────────────────────────────────────────────────────
  console.log('\n[B] submit with 0 answers + 0 writing');
  try {
    const { data, error } = await stu.rpc('mock_exam_submit', { p_attempt_id: attemptId, p_auto: false });
    if (error) throw error;
    if (data.score_total === 0 || data.score_total < 5) PASS(`submit with no work succeeded, score=${data.score_total}`);
    else FAIL('blank submit yields low score', `got ${data.score_total}`);
    if (data.score_writing === 0) PASS('writing scored 0 (no text)');
    else FAIL('writing scored 0 for blank text', data.score_writing);
  } catch (e) { FAIL('blank submit', e); }

  // ───────────────────────────────────────────────────────────
  // [D] Transient error simulation + idempotent retry
  // ───────────────────────────────────────────────────────────
  console.log('\n[D] transient error → idempotent retry');
  try {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const { error: badErr } = await stu.rpc('mock_exam_submit', { p_attempt_id: fakeUuid, p_auto: false });
    if (badErr && (badErr.message || '').toLowerCase().includes('attempt_not_found')) PASS('bad attempt_id → attempt_not_found');
    else FAIL('bad attempt_id rejected', badErr);
    // Real retry should succeed idempotently (we already submitted in [B])
    const { data, error } = await stu.rpc('mock_exam_submit', { p_attempt_id: attemptId, p_auto: false });
    if (error) throw error;
    if (data.idempotent === true) PASS('real attempt re-submit → idempotent:true');
    else FAIL('real attempt re-submit → idempotent:true', data);
  } catch (e) { FAIL('transient + idempotent', e); }

  // ───────────────────────────────────────────────────────────
  // [F] Single-long-token writing — needs a FRESH attempt
  // ───────────────────────────────────────────────────────────
  console.log('\n[F] single long token in writing');
  await clearTestAttempts(admin);
  const stu2 = await signIn(TEST_A1_EMAIL, TEST_PW);
  const { data: s2 } = await stu2.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-a1' });
  const attemptId2 = s2.attempt_id;
  const longTok = 'a'.repeat(200);
  const { data: w } = await stu2.rpc('mock_exam_save_writing', { p_attempt_id: attemptId2, p_writing_text: longTok });
  if (w === 1) PASS(`200-char single token → server count = 1`);
  else FAIL('200-char single token → 1', `got ${w}`);
  const { data: sub2 } = await stu2.rpc('mock_exam_submit', { p_attempt_id: attemptId2, p_auto: false });
  if (sub2.score_writing === 0) PASS('writing score = 0 (under min)');
  else FAIL('writing score = 0 (single token)', sub2.score_writing);

  // ───────────────────────────────────────────────────────────
  // [I] Reveal flow regression (Fix 1)
  // ───────────────────────────────────────────────────────────
  console.log('\n[I] reveal flow regression');
  // Throwaway admin
  const adminEmail = `qa-admin-${Date.now()}@fluentia.academy`;
  const adminPw = 'QAAdmin2025!';
  let adminId = null;
  try {
    const { data: au, error: e1 } = await admin.auth.admin.createUser({ email: adminEmail, password: adminPw, email_confirm: true });
    if (e1) throw e1;
    adminId = au.user.id;
    await admin.from('profiles').upsert({ id: adminId, role: 'admin', full_name: 'QA Admin', email: adminEmail, is_test_account: false, must_change_password: false });
    const adC = await signIn(adminEmail, adminPw);

    // Pre-reveal: student should see pending_review:true
    const { data: gr1 } = await stu2.rpc('mock_exam_get_result', { p_attempt_id: attemptId2 });
    if (gr1.pending_review === true) PASS('pre-reveal get_result → pending_review:true');
    else FAIL('pre-reveal pending_review:true', gr1);

    // Reveal
    const { data: rev, error: revErr } = await adC.rpc('mock_exam_reveal', {
      p_attempt_id: attemptId2, p_exam_code: null, p_reveal: true,
    });
    if (revErr) throw revErr;
    if (rev?.count === 1 && rev?.revealed === true) PASS('mock_exam_reveal single attempt');
    else FAIL('mock_exam_reveal', rev);

    // Post-reveal: student should see full questions
    const { data: gr2 } = await stu2.rpc('mock_exam_get_result', { p_attempt_id: attemptId2 });
    if (gr2.pending_review === false && Array.isArray(gr2.questions) && gr2.questions.length === 35)
      PASS('post-reveal get_result → full 35 questions');
    else FAIL('post-reveal full questions', { pending: gr2.pending_review, count: gr2.questions?.length });

    // ───────────────────────────────────────────────────────
    // [J] Manual writing score regression
    // ───────────────────────────────────────────────────────
    console.log('\n[J] manual writing score regression');
    const beforeTotal = Number(gr2.score_total);
    const { data: ms, error: msE } = await adC.rpc('mock_exam_set_manual_writing_score', {
      p_attempt_id: attemptId2, p_score: 7.5,
    });
    if (msE) throw msE;
    if (ms?.score_writing === 7.5) PASS('manual writing score set to 7.5');
    else FAIL('manual writing score = 7.5', ms);
    const expectedAfter = beforeTotal - Number(gr2.score_writing) + 7.5;
    if (Math.abs(Number(ms.score_total) - expectedAfter) < 0.01)
      PASS(`score_total recomputed (${beforeTotal} → ${ms.score_total})`);
    else FAIL('score_total recomputed', ms);
  } catch (e) { FAIL('[I/J] reveal + manual score', e); }
  if (adminId) {
    await admin.from('profiles').delete().eq('id', adminId).then(() => {}).catch(() => {});
    await admin.auth.admin.deleteUser(adminId).then(() => {}).catch(() => {});
  }

  // ───────────────────────────────────────────────────────────
  // [G/A/C/E/H] Code-review assertions (browser-only scenarios verified by file content)
  // ───────────────────────────────────────────────────────────
  console.log('\n[code] code-review assertions');
  const fs = require('fs');
  const attempt = fs.readFileSync('src/pages/student/mock-exam/MockExamAttempt.jsx', 'utf8');
  if (attempt.includes('SubmitConfirmModal')) PASS('attempt imports SubmitConfirmModal');
  else FAIL('attempt imports SubmitConfirmModal', null);
  if (attempt.includes("countWords") && attempt.includes("from '@/lib/mockExam'")) PASS('countWords imported from src/lib/mockExam');
  else FAIL('countWords imported', null);
  if (attempt.includes('mock-exam-pos-')) PASS('localStorage resume key present');
  else FAIL('localStorage resume key present', null);
  if (attempt.includes('isWritingInProgress')) PASS('chip strip in-progress logic present');
  else FAIL('chip strip in-progress logic present', null);
  // No `disabled={submitDisabled}` on submit (always-clickable rule)
  if (!attempt.match(/disabled=\{\s*submitDisabled\s*\}/)) PASS('submit button no longer uses submitDisabled gate');
  else FAIL('submit button no longer uses submitDisabled', null);
  // Timer expiry auto-submit path still intact
  if (attempt.includes("handleSubmit(true)")) PASS('timer expiry auto-submit path present');
  else FAIL('timer auto-submit path present', null);

  // ───────────────────────────────────────────────────────────
  // Final cleanup — leave the table clean for Ali
  // ───────────────────────────────────────────────────────────
  console.log('\n[cleanup]');
  await clearTestAttempts(admin);
  const { data: pStillTest } = await admin.from('profiles').select('id, email').eq('is_test_account', true);
  console.log(`  test accounts intact: ${pStillTest?.length ?? 0}`);
  console.log('\n=== QA done ===');
  process.exit(process.exitCode || 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
