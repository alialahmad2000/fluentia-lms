const { query } = require('./_db.cjs')
;(async () => {
  console.log('=== source vocabulary_word_mastery.mastery_level distribution ===')
  for (const r of await query("SELECT mastery_level, count(*)::int n, count(distinct student_id)::int students FROM vocabulary_word_mastery GROUP BY mastery_level ORDER BY n DESC;")) console.log(`  ${r.mastery_level}: ${r.n} rows / ${r.students} students`)

  console.log('\n=== saved words mastered_at (not null) ===')
  console.log('  ' + JSON.stringify((await query("SELECT count(*) FILTER (WHERE mastered_at IS NOT NULL)::int mastered, count(*)::int total FROM student_saved_words;"))[0]))

  console.log('\n=== who are the heavy accounts? ===')
  const heavy = await query(`
    SELECT vc.student_id, count(*)::int cards, count(*) FILTER (WHERE vc.mastery_level='mastered')::int mastered,
           p.email, p.role, p.full_name
    FROM vocab_cards vc LEFT JOIN profiles p ON p.id = vc.student_id
    GROUP BY vc.student_id, p.email, p.role, p.full_name
    ORDER BY cards DESC LIMIT 10;`)
  for (const r of heavy) console.log(`  ${r.student_id.slice(0,8)} cards=${String(r.cards).padStart(4)} mastered=${String(r.mastered).padStart(4)} role=${r.role||'?'} ${r.email||''} ${r.full_name||''}`)

  console.log('\n=== faithfulness: vocab_cards mastered vs source (per student, top 6) ===')
  const f = await query(`
    WITH src AS (
      SELECT m.student_id, count(DISTINCT public.vocab_norm(cv.word))::int src_mastered
      FROM vocabulary_word_mastery m JOIN curriculum_vocabulary cv ON cv.id=m.vocabulary_id
      WHERE m.mastery_level='mastered' GROUP BY m.student_id
    )
    SELECT vc.student_id, count(*) FILTER (WHERE vc.mastery_level='mastered')::int card_mastered, COALESCE(src.src_mastered,0) src_mastered
    FROM vocab_cards vc LEFT JOIN src ON src.student_id=vc.student_id
    GROUP BY vc.student_id, src.src_mastered ORDER BY card_mastered DESC LIMIT 6;`)
  for (const r of f) console.log(`  ${r.student_id.slice(0,8)} card_mastered=${r.card_mastered} src_exercise_mastered=${r.src_mastered} (cards >= src expected; saved mastered + dedupe)`)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
