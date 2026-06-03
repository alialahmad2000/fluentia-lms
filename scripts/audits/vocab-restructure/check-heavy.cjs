const { query } = require('./_db.cjs')
const one = async (s) => (await query(s))[0]
;(async () => {
  // resolve the full id for the heavy account
  const row = await one("SELECT student_id FROM vocab_cards GROUP BY student_id ORDER BY count(*) DESC LIMIT 1;")
  const sid = row.student_id
  console.log('heaviest student:', sid)

  const due = await one(`
    SELECT count(*)::int total_due,
      count(*) FILTER (WHERE stability IN (0,1,2,10) AND difficulty IN (0,5))::int looks_seeded,
      count(*) FILTER (WHERE NOT (stability IN (0,1,2,10) AND difficulty IN (0,5)))::int looks_real_fsrs
    FROM vocab_cards WHERE student_id = '${sid}' AND state <> 'new' AND due <= now();`)
  console.log('vocab_cards due-now:', JSON.stringify(due))

  const existing = await one(`
    SELECT count(*)::int existing_fsrs_due
    FROM curriculum_vocabulary_srs
    WHERE student_id = '${sid}' AND state IN ('review','learning','relearning') AND due <= now();`)
  console.log('EXISTING curriculum_vocabulary_srs due-now (what /student/srs shows today):', existing.existing_fsrs_due)

  const tot = await one(`SELECT count(*)::int n FROM curriculum_vocabulary_srs WHERE student_id = '${sid}';`)
  console.log('her total FSRS rows:', tot.n)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
