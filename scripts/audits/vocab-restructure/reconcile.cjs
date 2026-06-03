const { query } = require('./_db.cjs')
const one = async (sql) => (await query(sql))[0]
;(async () => {
  // 1) totals
  const tot = await one("SELECT count(*)::int n, count(distinct student_id)::int students FROM vocab_cards;")
  console.log(`vocab_cards: ${tot.n} cards across ${tot.students} students`)

  // 2) expected deduped union from the 3 sources == actual
  const exp = await one(`
    SELECT count(*)::int n FROM (
      SELECT DISTINCT s.student_id, public.vocab_norm(cv.word) wn
        FROM curriculum_vocabulary_srs s JOIN curriculum_vocabulary cv ON cv.id=s.vocabulary_id
      UNION
      SELECT DISTINCT m.student_id, public.vocab_norm(cv.word)
        FROM vocabulary_word_mastery m JOIN curriculum_vocabulary cv ON cv.id=m.vocabulary_id
      UNION
      SELECT DISTINCT w.student_id, public.vocab_norm(w.word) FROM student_saved_words w
    ) u WHERE length(wn) >= 2 AND student_id IS NOT NULL;`)
  console.log(`expected deduped (student,word) union: ${exp.n}  -> ${exp.n === tot.n ? 'MATCH ✓' : 'MISMATCH ✗ (' + (tot.n - exp.n) + ')'}`)

  // 3) state + mastery distributions
  console.log('\nstate distribution:')
  for (const r of await query("SELECT state, count(*)::int n FROM vocab_cards GROUP BY state ORDER BY n DESC;")) console.log(`  ${r.state}: ${r.n}`)
  console.log('mastery_level distribution:')
  for (const r of await query("SELECT mastery_level, count(*)::int n FROM vocab_cards GROUP BY mastery_level ORDER BY n DESC;")) console.log(`  ${r.mastery_level}: ${r.n}`)
  console.log('source distribution:')
  for (const r of await query("SELECT source, count(*)::int n FROM vocab_cards GROUP BY source ORDER BY n DESC;")) console.log(`  ${r.source}: ${r.n}`)

  // 4) FK orphans (should be 0; FK enforces SET NULL but verify cvid validity)
  const orph = await one("SELECT count(*)::int n FROM vocab_cards vc WHERE vc.curriculum_vocabulary_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM curriculum_vocabulary cv WHERE cv.id=vc.curriculum_vocabulary_id);")
  console.log(`\nFK orphans (cvid -> missing curriculum_vocabulary): ${orph.n} ${orph.n === 0 ? '✓' : '✗'}`)

  // 5) "due now" load per student (state != new AND due <= now) — ensure NOT flooding
  console.log('\n"due now" per student (top 8 by load):')
  for (const r of await query(`
    SELECT student_id, count(*)::int due_now,
      count(*) FILTER (WHERE mastery_level='mastered')::int mastered,
      count(*)::int total
    FROM vocab_cards vc
    WHERE state <> 'new' AND due <= now()
    GROUP BY student_id ORDER BY due_now DESC LIMIT 8;`)) {
    console.log(`  ${r.student_id.slice(0,8)}  due_now=${r.due_now}`)
  }
  const dueAgg = await one("SELECT count(*)::int total_due, round(avg(c),1) avg_per_student FROM (SELECT student_id, count(*) c FROM vocab_cards WHERE state<>'new' AND due<=now() GROUP BY student_id) x;")
  console.log(`  total due-now cards: ${dueAgg.total_due}, avg per active student: ${dueAgg.avg_per_student}`)

  // 6) words-known per student (mastered) — spot check vs sources
  console.log('\nwords-known (mastered) per student — top 8:')
  for (const r of await query("SELECT student_id, count(*) FILTER (WHERE mastery_level='mastered')::int known, count(*)::int total FROM vocab_cards GROUP BY student_id ORDER BY known DESC LIMIT 8;")) {
    console.log(`  ${r.student_id.slice(0,8)}  known=${r.known}  total=${r.total}`)
  }

  // 7) sanity: every card has a non-empty normalized word + word
  const bad = await one("SELECT count(*)::int n FROM vocab_cards WHERE word_normalized IS NULL OR length(word_normalized)<1 OR word IS NULL;")
  console.log(`\nmalformed cards (empty word/normalized): ${bad.n} ${bad.n===0?'✓':'✗'}`)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
