// Phase A — DB schema + phantom scan via direct pg connection
'use strict'

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DB_CONFIG = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
}

async function main() {
  const client = new Client(DB_CONFIG)
  await client.connect()
  console.log('Connected to DB\n')

  const results = {}

  // ── A.2: Schema of student_curriculum_progress ──
  console.log('A.2 — Schema of student_curriculum_progress...')
  const { rows: schemaCols } = await client.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_curriculum_progress'
    ORDER BY ordinal_position
  `)
  results.schema = schemaCols
  console.log('\nColumns:')
  schemaCols.forEach(c => {
    console.log(`  ${c.column_name.padEnd(30)} ${c.data_type.padEnd(25)} nullable=${c.is_nullable}  default=${c.column_default || '-'}`)
  })

  // ── Check for other submission-related tables ──
  console.log('\nAll public tables with submission/attempt/progress in name...')
  const { rows: otherTables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name ILIKE '%submission%'
        OR table_name ILIKE '%attempt%'
        OR table_name ILIKE '%progress%'
        OR table_name ILIKE '%exercise%'
        OR table_name ILIKE '%quiz%')
    ORDER BY table_name
  `)
  results.submission_related_tables = otherTables.map(t => t.table_name)
  console.log('Tables:', results.submission_related_tables.join(', ') || '(none)')

  // ── Check unique constraints ──
  console.log('\nUnique constraints on student_curriculum_progress...')
  const { rows: constraints } = await client.query(`
    SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'student_curriculum_progress'
      AND tc.constraint_type IN ('UNIQUE','PRIMARY KEY')
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `)
  results.constraints = constraints
  console.log('Constraints:')
  const grouped = {}
  constraints.forEach(c => {
    if (!grouped[c.constraint_name]) grouped[c.constraint_name] = []
    grouped[c.constraint_name].push(c.column_name)
  })
  Object.entries(grouped).forEach(([name, cols]) => {
    console.log(`  ${name}: (${cols.join(', ')})`)
  })

  // ── A.5: Multi-attempt columns ──
  const colNames = schemaCols.map(c => c.column_name)
  results.has_attempt_number = colNames.includes('attempt_number')
  results.has_is_latest      = colNames.includes('is_latest')
  results.has_is_best        = colNames.includes('is_best')
  results.has_status         = colNames.includes('status')
  console.log(`\nA.5 — Multi-attempt column presence:`)
  console.log(`  attempt_number: ${results.has_attempt_number}`)
  console.log(`  is_latest:      ${results.has_is_latest}`)
  console.log(`  is_best:        ${results.has_is_best}`)
  console.log(`  status:         ${results.has_status}`)

  // ── A.3: Phantom scan ──
  console.log('\nA.3 — Phantom scan on student_curriculum_progress...')

  // Total completed rows
  const { rows: [{ count: totalCompleted }] } = await client.query(`
    SELECT COUNT(*) FROM student_curriculum_progress
    WHERE status IN ('completed','submitted','graded')
  `)
  console.log(`  Total completed rows: ${totalCompleted}`)

  // Pattern A: completed with zero score AND empty/null answers
  const { rows: phantomA } = await client.query(`
    SELECT id, student_id, section_type, grammar_id, reading_id, listening_id,
           score, status, answers, created_at, completed_at
    FROM student_curriculum_progress
    WHERE status IN ('completed','submitted','graded')
      AND COALESCE(score, 0) = 0
      AND (
        answers IS NULL
        OR answers::text = '{}'
        OR answers::text = '[]'
        OR answers::text = 'null'
        OR (jsonb_typeof(answers) = 'object' AND answers = '{}'::jsonb)
        OR (jsonb_typeof(answers) = 'array' AND jsonb_array_length(answers) = 0)
      )
  `)
  results.phantomA = phantomA
  console.log(`  Pattern A (score=0 + empty answers): ${phantomA.length} rows`)

  // Pattern B: completed within < 3 seconds
  const { rows: phantomB } = await client.query(`
    SELECT id, student_id, section_type, score, status, created_at, completed_at
    FROM student_curriculum_progress
    WHERE status IN ('completed','submitted','graded')
      AND completed_at IS NOT NULL
      AND created_at IS NOT NULL
      AND (completed_at - created_at) < INTERVAL '3 seconds'
      AND COALESCE(score, 0) < 30
  `)
  results.phantomB = phantomB
  console.log(`  Pattern B (completed in <3 sec + score<30): ${phantomB.length} rows`)

  // Pattern C: per-student breakdown
  const { rows: perStudent } = await client.query(`
    SELECT student_id, COUNT(*) AS phantom_count
    FROM student_curriculum_progress
    WHERE status IN ('completed','submitted','graded')
      AND COALESCE(score, 0) = 0
      AND (
        answers IS NULL
        OR answers::text = '{}'
        OR answers::text = '[]'
        OR answers::text = 'null'
      )
    GROUP BY student_id
    ORDER BY phantom_count DESC
    LIMIT 20
  `)
  results.top_affected_students = perStudent
  console.log('\n  Top affected students by phantom count:')
  perStudent.slice(0, 10).forEach(s => {
    console.log(`    ${s.student_id}: ${s.phantom_count}`)
  })

  // Breakdown by section_type
  const { rows: bySection } = await client.query(`
    SELECT section_type, COUNT(*) AS count
    FROM student_curriculum_progress
    WHERE status IN ('completed','submitted','graded')
      AND COALESCE(score, 0) = 0
      AND (
        answers IS NULL
        OR answers::text = '{}'
        OR answers::text = '[]'
        OR answers::text = 'null'
      )
    GROUP BY section_type
    ORDER BY count DESC
  `)
  results.phantomA_by_section = bySection
  console.log('\n  Pattern A by section_type:')
  bySection.forEach(r => console.log(`    ${r.section_type || 'NULL'}: ${r.count}`))

  // Breakdown of Pattern B by section
  const { rows: bySectionB } = await client.query(`
    SELECT section_type, COUNT(*) AS count
    FROM student_curriculum_progress
    WHERE status IN ('completed','submitted','graded')
      AND completed_at IS NOT NULL
      AND created_at IS NOT NULL
      AND (completed_at - created_at) < INTERVAL '3 seconds'
      AND COALESCE(score, 0) < 30
    GROUP BY section_type
    ORDER BY count DESC
  `)
  results.phantomB_by_section = bySectionB
  console.log('\n  Pattern B by section_type:')
  bySectionB.forEach(r => console.log(`    ${r.section_type || 'NULL'}: ${r.count}`))

  // ── Check if reading/listening have unique constraints ──
  // These use onConflict in the code — let's verify the actual constraint
  console.log('\nChecking all unique constraints across relevant tables...')
  const { rows: allConstraints } = await client.query(`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
           string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'student_curriculum_progress'
    GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
    ORDER BY tc.constraint_type, tc.constraint_name
  `)
  results.all_constraints = allConstraints
  console.log('All constraints on student_curriculum_progress:')
  allConstraints.forEach(c => {
    console.log(`  [${c.constraint_type}] ${c.constraint_name}: (${c.columns})`)
  })

  // ── Check if assessment_type column exists in activities tables ──
  console.log('\nA.6 — Looking for assessment_type discriminator...')
  const { rows: assessmentCols } = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name ILIKE '%assessment_type%'
        OR column_name ILIKE '%is_assessment%'
        OR column_name ILIKE '%is_final%')
    ORDER BY table_name, column_name
  `)
  results.assessment_discriminator_cols = assessmentCols
  assessmentCols.forEach(c => console.log(`  ${c.table_name}.${c.column_name} (${c.data_type})`))

  // Check curriculum_assessments table if it exists
  const { rows: assessmentTableCols } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_assessments'
    ORDER BY ordinal_position
  `).catch(() => ({ rows: [] }))
  if (assessmentTableCols.length > 0) {
    console.log('\ncurriculum_assessments columns:', assessmentTableCols.map(c => c.column_name).join(', '))
    results.curriculum_assessments_schema = assessmentTableCols
  }

  // ── Save results ──
  const outDir = path.join(__dirname, '..', 'discovery')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'phantom-scan.json')
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
  console.log(`\nResults saved to ${outPath}`)
  console.log('\n=== Scan complete ===')

  await client.end()
}

main().catch(async e => {
  console.error('Error:', e.message)
  process.exit(1)
})
