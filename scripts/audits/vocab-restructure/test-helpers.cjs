// Verify the normalize trigger + on-conflict idempotency (the data layer the
// vocab_add_card RPC relies on). Uses a throwaway student_id, self-cleans.
const { query } = require('./_db.cjs')
const TEST = '00000000-0000-0000-0000-0000000000aa'
;(async () => {
  await query(`DELETE FROM public.vocab_cards WHERE student_id = '${TEST}';`)

  // 1) trigger normalizes messy word on insert
  await query(`INSERT INTO public.vocab_cards (student_id, word, source, state, due)
    VALUES ('${TEST}', '  Hello-World! ', 'manual', 'new', now());`)
  const r1 = (await query(`SELECT word, word_normalized FROM public.vocab_cards WHERE student_id='${TEST}';`))[0]
  console.log('trigger:', JSON.stringify(r1), r1.word_normalized === 'hello-world' ? '✓' : '✗ expected hello-world')

  // 2) on-conflict idempotency (same shape as the RPC) — different casing collapses to same key
  await query(`INSERT INTO public.vocab_cards (student_id, word, word_normalized, source, state, due, meaning_ar)
    VALUES ('${TEST}', 'HELLO-world', 'ignored', 'manual', 'new', now(), 'مرحبا')
    ON CONFLICT (student_id, word_normalized) DO UPDATE SET
      meaning_ar = COALESCE(public.vocab_cards.meaning_ar, excluded.meaning_ar);`)
  const cnt = (await query(`SELECT count(*)::int n FROM public.vocab_cards WHERE student_id='${TEST}';`))[0].n
  const r2 = (await query(`SELECT word_normalized, meaning_ar FROM public.vocab_cards WHERE student_id='${TEST}';`))[0]
  console.log('idempotent:', cnt === 1 ? '✓ still 1 row' : `✗ ${cnt} rows`, '| enriched meaning_ar:', JSON.stringify(r2))

  // 3) RPC exists + correct signature
  const fn = (await query(`SELECT proname, pg_get_function_arguments(oid) args FROM pg_proc WHERE proname='vocab_add_card';`))[0]
  console.log('RPC vocab_add_card:', fn ? '✓ ' + fn.args.slice(0, 60) + '…' : '✗ missing')

  await query(`DELETE FROM public.vocab_cards WHERE student_id = '${TEST}';`)
  console.log('cleanup ✓')
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
