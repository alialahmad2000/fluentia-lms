// Seed the mock-test-a1 account with a realistic spread of vocab_cards so the
// headless screenshots show the POPULATED Constellation. Reversible (cleanup.cjs).
const { query } = require('./_db.cjs')
;(async () => {
  const p = (await query(`SELECT id FROM public.profiles WHERE email='mock-test-a1@fluentia.academy' LIMIT 1;`))[0]
  if (!p) { console.error('test account not found'); process.exit(1) }
  const S = p.id
  console.log('mock-test-a1 id:', S)
  await query(`DELETE FROM public.vocab_cards WHERE student_id='${S}';`)

  const rows = [
    // mastered (gold stars) — words known
    ['celebrate', 'يحتفل', 'mastered', 'review', 30, 12],
    ['journey', 'رحلة', 'mastered', 'review', 45, 18],
    ['achieve', 'يحقق', 'mastered', 'review', 21, 9],
    ['discover', 'يكتشف', 'mastered', 'review', 60, 24],
    ['confident', 'واثق', 'mastered', 'review', 33, 14],
    ['imagine', 'يتخيّل', 'mastered', 'review', 28, 11],
    ['progress', 'تقدّم', 'mastered', 'review', 40, 16],
    // learning
    ['curious', 'فضولي', 'learning', 'learning', 3, -1],
    ['gather', 'يجمع', 'learning', 'learning', 2, -1],
    ['remarkable', 'رائع', 'learning', 'review', 5, -1],
    // due now (state review/learning, due in the past) -> the due badge + queue
    ['persuade', 'يقنع', 'learning', 'review', 4, -2],
    ['reliable', 'موثوق', 'learning', 'review', 6, -1],
    ['fascinate', 'يفتن', 'learning', 'learning', 2, -3],
    // new (dim stars)
    ['serene', 'هادئ', 'new', 'new', 0, 0],
    ['venture', 'مغامرة', 'new', 'new', 0, 0],
    ['eloquent', 'فصيح', 'new', 'new', 0, 0],
  ]
  const HARD = ['persuade', 'reliable', 'fascinate'] // give these high difficulty so the hard-words surface populates
  const values = rows
    .map(([w, m, ml, st, stab, dueDays]) => {
      const diff = HARD.includes(w) ? 8 : st === 'new' ? 0 : 4
      const lapses = HARD.includes(w) ? 2 : 0
      return `('${S}', '${w}', '${w}', '${m}', '${ml}', '${st}', ${stab}, ${diff}, ${lapses}, now() + interval '${dueDays} days', 'curriculum')`
    })
    .join(',\n')
  await query(`
    INSERT INTO public.vocab_cards
      (student_id, word, word_normalized, meaning_ar, mastery_level, state, stability, difficulty, lapses, due, source)
    VALUES ${values};`)
  const c = await query(`SELECT mastery_level, count(*)::int n FROM public.vocab_cards WHERE student_id='${S}' GROUP BY mastery_level;`)
  console.log('seeded:', JSON.stringify(c))
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
