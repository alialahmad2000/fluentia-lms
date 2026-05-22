// scripts/mock-exam-fix3-qa.cjs
// FIX-3 QA — runs the scriptable parts of scenarios A through K against the
// LIVE deployed edge function. Scenarios that require pure browser UX (e.g.
// front-end pending-spinner display) are covered by code-review assertions.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const URL = process.env.SUPABASE_URL;
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_A1_EMAIL = 'mock-test-a1@fluentia.academy';
const TEST_B1_EMAIL = 'mock-test-b1@fluentia.academy';
const TEST_PW = 'MockTest2025!';

const PASS = (l) => console.log(`  PASS  ${l}`);
const FAIL = (l, e) => {
  const msg = e?.message ?? (typeof e === 'object' ? JSON.stringify(e).slice(0, 300) : String(e));
  console.log(`  FAIL  ${l} — ${msg}`);
  process.exitCode = 1;
};

async function signIn(email, pw) {
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: pw });
  if (error) throw error;
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function clearTestAttempts(admin) {
  const { data: tp } = await admin.from('profiles').select('id').eq('is_test_account', true);
  if (tp?.length) {
    const ids = tp.map((p) => p.id);
    await admin.from('mock_exam_ai_writing_log').delete().in('attempt_id',
      (await admin.from('mock_exam_attempts').select('id').in('student_id', ids)).data?.map(r=>r.id) || ['00000000-0000-0000-0000-000000000000']
    ).then(() => {}).catch(() => {});
    await admin.from('mock_exam_attempts').delete().in('student_id', ids);
  }
}

async function takeExamAndSubmit(stuClient, examCode, writingText) {
  const { data: s, error: sErr } = await stuClient.rpc('mock_exam_start', { p_exam_code: examCode });
  if (sErr) throw sErr;
  // Answer 5 random MCQs so submit isn't entirely blank
  const mcqs = (s.questions || []).filter((q) => q.question_type === 'mcq').slice(0, 5);
  for (const q of mcqs) {
    await stuClient.rpc('mock_exam_save_answer', {
      p_attempt_id: s.attempt_id, p_question_id: q.id, p_selected_index: 1, p_text_answer: null,
    });
  }
  if (writingText !== null) {
    const { error } = await stuClient.rpc('mock_exam_save_writing', {
      p_attempt_id: s.attempt_id, p_writing_text: writingText,
    });
    if (error) throw error;
  }
  const { data: sub, error: subErr } = await stuClient.rpc('mock_exam_submit', {
    p_attempt_id: s.attempt_id, p_auto: false,
  });
  if (subErr) throw subErr;
  return { attemptId: s.attempt_id, submitData: sub };
}

async function invokeGrader(client, attemptId) {
  const { data, error } = await client.functions.invoke('mock-exam-grade-writing', {
    body: { attempt_id: attemptId },
  });
  if (error) {
    // supabase-js wraps non-2xx as FunctionsHttpError — extract response
    try {
      const ctx = await error.context?.json?.();
      return { data: ctx ?? null, error };
    } catch { return { data: null, error }; }
  }
  return { data, error: null };
}

async function getRow(admin, attemptId) {
  const { data } = await admin
    .from('mock_exam_attempts')
    .select('id, ai_writing_status, ai_writing_score, ai_writing_justification_ar, ai_writing_strengths_ar, ai_writing_improvements_ar, score_writing, score_total, manual_writing_score, passed')
    .eq('id', attemptId).single();
  return data;
}

async function pollUntilGraded(admin, attemptId, maxMs = 30_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const row = await getRow(admin, attemptId);
    if (row?.ai_writing_status && row.ai_writing_status !== 'pending') return row;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return await getRow(admin, attemptId);
}

async function main() {
  console.log('=== FIX-3 QA ===\n');
  const admin = createClient(URL, SR_KEY, { auth: { persistSession: false } });
  await clearTestAttempts(admin);

  // ───────────────────────────────────────────────────────
  // [A] Real AI grading — genuine 60-word writing
  // ───────────────────────────────────────────────────────
  console.log('[A] Real AI grading — genuine writing');
  const stuA = await signIn(TEST_A1_EMAIL, TEST_PW);
  const genuineA1 = `I wake up at six in the morning every day. I drink a cup of warm tea with my mother in the kitchen. I pray and then I read a short book in English for ten minutes. After that I take a shower and I wear my clean clothes for school. I eat a small breakfast with bread and cheese before I leave the house.`;
  let aResult;
  try {
    const r = await takeExamAndSubmit(stuA, 'midterm-mock-a1', genuineA1);
    PASS('[A] submit succeeded');
    const inv = await invokeGrader(stuA, r.attemptId);
    if (inv.error) FAIL('[A] grader returned error', inv.error);
    else PASS(`[A] grader returned: layer=${inv.data?.layer}, score=${inv.data?.score}`);
    aResult = await pollUntilGraded(admin, r.attemptId);
    if (aResult?.ai_writing_status === 'graded') PASS(`[A] DB status='graded'`);
    else FAIL(`[A] DB status='graded'`, `got ${aResult?.ai_writing_status}`);
    if (aResult?.ai_writing_score >= 4) PASS(`[A] AI score reasonable for honest A1 (${aResult.ai_writing_score})`);
    else FAIL(`[A] AI score reasonable (>=4)`, aResult?.ai_writing_score);
    if (aResult?.ai_writing_justification_ar?.length > 20) PASS(`[A] Arabic justification present`);
    else FAIL(`[A] Arabic justification present`, aResult?.ai_writing_justification_ar);
  } catch (e) { FAIL('[A]', e); }

  // ───────────────────────────────────────────────────────
  // [B] Spam writing — should score 0–3
  // ───────────────────────────────────────────────────────
  console.log('\n[B] Spam writing — repetitive');
  await clearTestAttempts(admin);
  try {
    const stuB = await signIn(TEST_A1_EMAIL, TEST_PW);
    const spam = ('word ').repeat(60).trim();
    const r = await takeExamAndSubmit(stuB, 'midterm-mock-a1', spam);
    await invokeGrader(stuB, r.attemptId);
    const row = await pollUntilGraded(admin, r.attemptId);
    if (row.ai_writing_status === 'graded' || row.ai_writing_status === 'fallback') PASS(`[B] graded (status=${row.ai_writing_status})`);
    else FAIL(`[B] graded`, row.ai_writing_status);
    if (Number(row.ai_writing_score) <= 4) PASS(`[B] spam scored low (${row.ai_writing_score} ≤ 4)`);
    else FAIL(`[B] spam scored low (≤4)`, row.ai_writing_score);
  } catch (e) { FAIL('[B]', e); }

  // ───────────────────────────────────────────────────────
  // [C] Single long token (1 word) — under min → fallback or low
  // ───────────────────────────────────────────────────────
  console.log('\n[C] Single long token writing');
  await clearTestAttempts(admin);
  try {
    const stuC = await signIn(TEST_A1_EMAIL, TEST_PW);
    const r = await takeExamAndSubmit(stuC, 'midterm-mock-a1', 'a'.repeat(200));
    await invokeGrader(stuC, r.attemptId);
    const row = await pollUntilGraded(admin, r.attemptId);
    if (Number(row.ai_writing_score) <= 3) PASS(`[C] single token scored low (${row.ai_writing_score} ≤ 3)`);
    else FAIL(`[C] single token scored low`, row.ai_writing_score);
  } catch (e) { FAIL('[C]', e); }

  // ───────────────────────────────────────────────────────
  // [D] Mixed Arabic/English honest writing — B1
  // ───────────────────────────────────────────────────────
  console.log('\n[D] Mixed Arabic/English B1');
  await clearTestAttempts(admin);
  try {
    const stuD = await signIn(TEST_B1_EMAIL, TEST_PW);
    const mixed = `I think both methods can be useful but I prefer studying in a classroom because the teacher gives immediate feedback. When I make a mistake the teacher can stop me and explain why — مع التعليق المباشر I learn faster. Apps are good for vocabulary practice and for review at night, especially when I want to repeat exercises. However, real conversations with classmates help me feel more confident and motivate me to actually speak.`;
    const r = await takeExamAndSubmit(stuD, 'midterm-mock-b1', mixed);
    await invokeGrader(stuD, r.attemptId);
    const row = await pollUntilGraded(admin, r.attemptId);
    if (row.ai_writing_status === 'graded') PASS(`[D] mixed writing graded`);
    else FAIL(`[D] mixed writing graded`, row.ai_writing_status);
    if (Number(row.ai_writing_score) >= 5) PASS(`[D] mixed honest B1 scored reasonable (${row.ai_writing_score} ≥ 5)`);
    else FAIL(`[D] mixed honest B1 scored reasonable`, row.ai_writing_score);
  } catch (e) { FAIL('[D]', e); }

  // ───────────────────────────────────────────────────────
  // [E] Fallback path — emulate by deleting writing_response just before grading
  //     (we can't unset the secret without affecting other AI features).
  //     Instead: invoke grader on an attempt whose writing_response is empty
  //     string — grader.smartFallbackScore returns {0, "النص فارغ"}.
  // ───────────────────────────────────────────────────────
  console.log('\n[E] Fallback path — empty writing forces fallback');
  await clearTestAttempts(admin);
  try {
    const stuE = await signIn(TEST_A1_EMAIL, TEST_PW);
    const r = await takeExamAndSubmit(stuE, 'midterm-mock-a1', '');
    await invokeGrader(stuE, r.attemptId);
    const row = await pollUntilGraded(admin, r.attemptId);
    if (row.ai_writing_status === 'fallback') PASS(`[E] fallback triggered (empty text)`);
    else FAIL(`[E] fallback triggered`, row.ai_writing_status);
    if (Number(row.ai_writing_score) === 0) PASS(`[E] empty-writing fallback score 0`);
    else FAIL(`[E] empty-writing fallback score 0`, row.ai_writing_score);
    if (/تعذّر/.test(row.ai_writing_justification_ar || '')) PASS(`[E] Arabic "تعذّر" prefix in justification`);
    else FAIL(`[E] justification mentions fallback`, row.ai_writing_justification_ar?.slice(0,80));
  } catch (e) { FAIL('[E]', e); }

  // ───────────────────────────────────────────────────────
  // [F] Retry from trainer dashboard
  // ───────────────────────────────────────────────────────
  console.log('\n[F] Retry from trainer dashboard');
  await clearTestAttempts(admin);
  let fAttempt;
  let adminId = null;
  const adminEmail = `qa-admin-${Date.now()}@fluentia.academy`;
  try {
    const stuF = await signIn(TEST_A1_EMAIL, TEST_PW);
    const r = await takeExamAndSubmit(stuF, 'midterm-mock-a1', '');  // forces fallback first
    fAttempt = r.attemptId;
    await invokeGrader(stuF, r.attemptId);
    const fb = await pollUntilGraded(admin, r.attemptId);
    if (fb.ai_writing_status !== 'fallback') FAIL('[F] first grade is fallback', fb.ai_writing_status);
    // Throwaway admin → reset + re-grade with REAL text
    const au = (await admin.auth.admin.createUser({ email: adminEmail, password: 'QAAdmin2025!', email_confirm: true })).data;
    adminId = au?.user?.id;
    await admin.from('profiles').upsert({
      id: adminId, role: 'admin', full_name: 'QA Admin', email: adminEmail, is_test_account: false, must_change_password: false,
    });
    // Update writing_response so the retry produces a real grade
    await admin.from('mock_exam_attempts').update({
      writing_response: 'I usually wake up at seven and drink coffee with my family. We talk for some minutes before everyone leaves the house. I love this quiet time in the morning because it makes me feel calm and ready for the day.',
      writing_word_count: 41,  // intentionally < 50 so fallback would say "under min"; AI should still grade content
    }).eq('id', r.attemptId);
    // We can also pump it above min:
    await admin.from('mock_exam_attempts').update({
      writing_response: 'I usually wake up at seven in the morning and drink hot coffee with my family. We talk for some minutes before everyone leaves the house for work or school. I love this quiet time in the morning because it makes me feel calm and ready for the long day ahead. After breakfast I take my bag and go to the bus stop near our house.',
      writing_word_count: 64,
    }).eq('id', r.attemptId);
    const adC = await signIn(adminEmail, 'QAAdmin2025!');
    const { error: rstErr } = await adC.rpc('mock_exam_reset_ai_status', { p_attempt_id: r.attemptId });
    if (rstErr) FAIL('[F] reset_ai_status', rstErr);
    else PASS('[F] reset_ai_status OK');
    const inv = await invokeGrader(adC, r.attemptId);
    if (inv.error) FAIL('[F] retry invoke', inv.error);
    else PASS(`[F] retry returned layer=${inv.data?.layer}, score=${inv.data?.score}`);
    const reGrade = await pollUntilGraded(admin, r.attemptId);
    if (reGrade.ai_writing_status === 'graded') PASS('[F] post-retry status=graded');
    else FAIL('[F] post-retry status=graded', reGrade.ai_writing_status);
  } catch (e) { FAIL('[F]', e); }

  // ───────────────────────────────────────────────────────
  // [G] Manual override wins
  // ───────────────────────────────────────────────────────
  console.log('\n[G] Manual override wins');
  try {
    if (!fAttempt) throw new Error('no attempt from [F]');
    const adC = await signIn(adminEmail, 'QAAdmin2025!');
    const { data: ms, error: msE } = await adC.rpc('mock_exam_set_manual_writing_score', {
      p_attempt_id: fAttempt, p_score: 8.5,
    });
    if (msE) FAIL('[G] set_manual_writing_score', msE);
    else PASS(`[G] manual override set to 8.5`);
    // Trigger another retry — final writing_score should stay 8.5
    await adC.rpc('mock_exam_reset_ai_status', { p_attempt_id: fAttempt });
    const inv = await invokeGrader(adC, fAttempt);
    const row = await pollUntilGraded(admin, fAttempt);
    if (Number(row.score_writing) === 8.5) PASS('[G] final score_writing stays at manual 8.5 after AI re-grade');
    else FAIL('[G] manual override wins', row.score_writing);
    if (row.ai_writing_score !== null && row.ai_writing_score !== undefined) PASS(`[G] AI score still recorded for reference (${row.ai_writing_score})`);
    else FAIL('[G] AI score still recorded', row.ai_writing_score);
  } catch (e) { FAIL('[G]', e); }

  // ───────────────────────────────────────────────────────
  // [I] Idempotent edge function (call twice → 2nd is idempotent)
  // ───────────────────────────────────────────────────────
  console.log('\n[I] Edge function idempotency');
  try {
    if (!fAttempt) throw new Error('no attempt from [F]');
    const stuI = await signIn(TEST_A1_EMAIL, TEST_PW);
    const inv = await invokeGrader(stuI, fAttempt);
    if (inv.error) FAIL('[I] idempotent invoke', inv.error);
    else if (inv.data?.idempotent === true) PASS('[I] returns {idempotent: true} on second call');
    else FAIL('[I] returns idempotent:true', inv.data);
  } catch (e) { FAIL('[I]', e); }

  // ───────────────────────────────────────────────────────
  // [J] Curl smoke — direct edge function call w/ anon key
  // ───────────────────────────────────────────────────────
  console.log('\n[J] curl smoke');
  try {
    if (!fAttempt) throw new Error('no attempt from [F]');
    const r = await fetch(`${URL}/functions/v1/mock-exam-grade-writing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ attempt_id: fAttempt }),
    });
    const j = await r.json();
    if (r.ok && j.success === true) PASS(`[J] curl OK (status=${r.status}, success=true)`);
    else FAIL('[J] curl', `${r.status} ${JSON.stringify(j).slice(0,200)}`);
  } catch (e) { FAIL('[J]', e); }

  // ───────────────────────────────────────────────────────
  // [K] Regression: Fix-1 + Fix-2 flows still work
  // ───────────────────────────────────────────────────────
  console.log('\n[K] Regression — Fix-1 + Fix-2 still work');
  const fs = require('fs');
  const attempt = fs.readFileSync('src/pages/student/mock-exam/MockExamAttempt.jsx', 'utf8');
  if (attempt.includes('SubmitConfirmModal')) PASS('[K] SubmitConfirmModal still wired');
  else FAIL('[K] SubmitConfirmModal still wired', null);
  if (attempt.includes('mock-exam-pos-')) PASS('[K] resume-to-position still wired');
  else FAIL('[K] resume-to-position still wired', null);
  if (attempt.includes('mock-exam-grade-writing')) PASS('[K] fire-and-forget AI invoke wired');
  else FAIL('[K] fire-and-forget AI invoke wired', null);
  const result = fs.readFileSync('src/pages/student/mock-exam/MockExamResult.jsx', 'utf8');
  if (result.includes('pending_review')) PASS('[K] pending screen branch present');
  else FAIL('[K] pending screen branch present', null);
  if (result.includes('ai_writing_status')) PASS('[K] AI feedback block wired in student result');
  else FAIL('[K] AI feedback block wired in student result', null);
  const trainer = fs.readFileSync('src/pages/trainer/MockExamResults.jsx', 'utf8');
  if (trainer.includes('AiWritingPanel')) PASS('[K] trainer AI panel wired');
  else FAIL('[K] trainer AI panel wired', null);
  if (trainer.includes('mock_exam_reset_ai_status')) PASS('[K] trainer retry path wired');
  else FAIL('[K] trainer retry path wired', null);

  // ───────────────────────────────────────────────────────
  // Cleanup
  // ───────────────────────────────────────────────────────
  console.log('\n[cleanup]');
  if (adminId) {
    await admin.from('profiles').delete().eq('id', adminId).then(() => {}).catch(() => {});
    await admin.auth.admin.deleteUser(adminId).then(() => {}).catch(() => {});
  }
  await clearTestAttempts(admin);
  console.log('  test attempts cleared, test accounts intact');

  console.log('\n=== QA done ===');
  process.exit(process.exitCode || 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
