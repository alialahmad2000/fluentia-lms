// End-to-end convergence test: impersonate a throwaway student via jwt claims and
// drive every write path (save / exercise / drill) through the RPCs, then verify
// the unified vocab_cards store reflects all of it. Self-cleans.
const { query } = require('./_db.cjs')
const S = '00000000-0000-0000-0000-0000000000bb'
const CLAIMS = JSON.stringify({ sub: S, role: 'authenticated' })

;(async () => {
  // clean slate
  await query(`DELETE FROM public.srs_review_logs WHERE student_id='${S}';
               DELETE FROM public.hard_words_drill_log WHERE student_id='${S}';
               DELETE FROM public.vocab_cards WHERE student_id='${S}';`)

  // pick a deterministic real curriculum word to run exercises on
  const cv = (await query(`SELECT id, word FROM public.curriculum_vocabulary ORDER BY id LIMIT 1;`))[0]

  // one transaction: set claims, run all write paths, return verification
  const sql = `
    SELECT set_config('request.jwt.claims', '${CLAIMS}', true);
    -- 1) reading save (+ idempotent re-save with messy casing/punct -> same card)
    SELECT public.vocab_add_card('Serendipity', NULL, 'صدفة سعيدة', NULL, 'a happy accident', 'reading');
    SELECT public.vocab_add_card('  SERENDIPITY! ', NULL, NULL, NULL, NULL, 'reading');
    -- 2) exercises on a real curriculum word -> should reach 'mastered' + scheduled
    SELECT public.vocab_record_exercise('${cv.id}', 'meaning', NULL, NULL);
    SELECT public.vocab_record_exercise('${cv.id}', 'sentence', NULL, NULL);
    SELECT public.vocab_record_exercise('${cv.id}', 'listening', NULL, NULL);
    -- (drill RPC requires a real profile for its FK-backed log; verified separately)
    -- verify
    SELECT word_normalized, source, state, mastery_level,
           meaning_exercise_passed AND sentence_exercise_passed AND listening_exercise_passed AS all_exercises,
           hw_correct_streak, lapses, meaning_ar
    FROM public.vocab_cards WHERE student_id='${S}' ORDER BY word_normalized;`
  const res = await query(sql)
  const rows = Array.isArray(res) ? res : []
  console.log('=== unified store after all write paths ===')
  console.log(JSON.stringify(rows, null, 2))

  const total = (await query(`SELECT count(*)::int n FROM public.vocab_cards WHERE student_id='${S}';`))[0].n
  console.log(`\ncards=${total} (expect 2: serendipity reading-save + 1 curriculum exercise word)`)

  // cleanup
  await query(`DELETE FROM public.srs_review_logs WHERE student_id='${S}';
               DELETE FROM public.hard_words_drill_log WHERE student_id='${S}';
               DELETE FROM public.vocab_cards WHERE student_id='${S}';`)
  console.log('cleanup ✓')
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
