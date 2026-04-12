// L1 FINALIZE — verify DB state, rebuild per-passage quality report,
// audit student work protection, and write PHASE-2-CLEANUP/13-L1-final-report.md
import { readFileSync, writeFileSync } from 'fs'
import { admin } from './lib/supa.mjs'
import { analyzePassage } from './lib/text-analysis.mjs'

const fulldata = JSON.parse(readFileSync('PHASE-2-CLEANUP/13-L1-fulldata.json', 'utf8'))
const baseline = JSON.parse(readFileSync('PHASE-2-CLEANUP/13-L1-baseline.json', 'utf8'))
const allowlist = new Set(fulldata.allowlist)
const L1_ID = fulldata.L1_id

console.log('=== L1 FINALIZE ===\n')

// Phase A — DB verification
const { count: unitCount } = await admin
  .from('curriculum_units').select('*', { count: 'exact', head: true })
  .eq('level_id', L1_ID)
console.log(`L1 units: ${unitCount} (expected 12)`)

const { data: units, error: uErr } = await admin
  .from('curriculum_units').select('*')
  .eq('level_id', L1_ID)
if (uErr) { console.error('units err:', uErr); process.exit(1) }
units.sort((a, b) => (a.unit_number ?? 0) - (b.unit_number ?? 0))

const unitIds = units.map(u => u.id)
const { data: readings } = await admin
  .from('curriculum_readings')
  .select('id, unit_id, reading_label, title_en, passage_content, passage_word_count')
  .in('unit_id', unitIds)
console.log(`L1 passages: ${readings.length} (expected 24)`)

const readingIds = readings.map(r => r.id)
const { count: qCount } = await admin
  .from('curriculum_comprehension_questions')
  .select('*', { count: 'exact', head: true })
  .in('reading_id', readingIds)
console.log(`L1 questions: ${qCount} (expected 144)`)

const { count: systemUnitCount } = await admin
  .from('curriculum_units').select('*', { count: 'exact', head: true })
console.log(`System unit count: ${systemUnitCount} (expected 72)`)

const { count: vocabCount } = await admin
  .from('curriculum_vocabulary').select('*', { count: 'exact', head: true })
console.log(`Vocabulary count: ${vocabCount}`)

// Phase B — quality re-analysis
console.log('\n=== QUALITY ANALYSIS ===')
function extractText(passage_content) {
  if (!passage_content) return ''
  if (typeof passage_content === 'string') return passage_content
  const paragraphs = passage_content.paragraphs || passage_content.content || []
  if (Array.isArray(paragraphs)) {
    return paragraphs.map(p => typeof p === 'string' ? p : (p?.text || p?.content || '')).join('\n\n')
  }
  return JSON.stringify(passage_content)
}

const rows = []
let totalWc = 0, totalFkgl = 0, totalAsl = 0, pass = 0
for (const u of units) {
  const unitReadings = readings.filter(r => r.unit_id === u.id).sort((a, b) => a.reading_label.localeCompare(b.reading_label))
  for (const r of unitReadings) {
    const text = extractText(r.passage_content)
    const a = analyzePassage(text, allowlist)
    const status =
      a.word_count >= 120 && a.word_count <= 200 &&
      a.fkgl >= 2.0 && a.fkgl <= 4.0 &&
      a.avg_sentence_length >= 8 && a.avg_sentence_length <= 12 &&
      a.oov.length === 0 ? 'PASS' : 'FAIL'
    if (status === 'PASS') pass++
    totalWc += a.word_count; totalFkgl += a.fkgl; totalAsl += a.avg_sentence_length
    rows.push({
      unit: u.unit_number, label: r.reading_label, wc: a.word_count,
      fkgl: a.fkgl, asl: a.avg_sentence_length, oov: a.oov.length, status,
    })
    console.log(`  U${String(u.unit_number).padStart(2,'0')} ${r.reading_label}  wc=${a.word_count.toString().padStart(3)}  fkgl=${a.fkgl.toFixed(2).padStart(5)}  asl=${a.avg_sentence_length.toFixed(2).padStart(5)}  oov=${a.oov.length}  ${status}`)
  }
}

const passRate = (pass / rows.length * 100).toFixed(1)
const avgWc = (totalWc / rows.length).toFixed(0)
const avgFkgl = (totalFkgl / rows.length).toFixed(2)
const avgAsl = (totalAsl / rows.length).toFixed(2)
console.log(`\nPass rate: ${pass}/${rows.length} (${passRate}%)`)
console.log(`Avg wc=${avgWc} fkgl=${avgFkgl} asl=${avgAsl}`)

// Phase C — Student work protection audit
const { count: studentCompCount } = await admin
  .from('student_curriculum_progress')
  .select('*', { count: 'exact', head: true })
  .in('reading_id', readingIds)
  .eq('section_type', 'comprehension')
  .eq('status', 'completed')

const today = new Date().toISOString().slice(0, 10)
const { count: todayUpdated } = await admin
  .from('student_curriculum_progress')
  .select('*', { count: 'exact', head: true })
  .in('reading_id', readingIds)
  .eq('section_type', 'comprehension')
  .eq('status', 'completed')
  .gte('updated_at', today + 'T00:00:00.000Z')

console.log(`\nStudent comprehension completions on L1: ${studentCompCount}`)
console.log(`Updated today (via protection): ${todayUpdated}`)

// Write final report
const reportLines = []
reportLines.push('# L1 Reading Rewrites — Final Report\n')
reportLines.push(`**Date:** ${new Date().toISOString()}\n`)
reportLines.push(`**Level:** L1 (A1)\n`)
reportLines.push(`**Pass rate:** ${pass}/${rows.length} (${passRate}%)\n`)
reportLines.push(`**Averages:** wc=${avgWc}, fkgl=${avgFkgl}, asl=${avgAsl}\n`)
reportLines.push('\n## Per-Passage Metrics\n')
reportLines.push('| Unit | Part | Word Count | FKGL | Avg Sent | OOV | Status |')
reportLines.push('|------|------|------------|------|----------|-----|--------|')
for (const r of rows) {
  reportLines.push(`| U${String(r.unit).padStart(2, '0')} | ${r.label} | ${r.wc} | ${r.fkgl.toFixed(2)} | ${r.asl.toFixed(2)} | ${r.oov} | ${r.status} |`)
}
reportLines.push('\n## Student Work Protection\n')
reportLines.push(`- Total L1 comprehension completions: ${studentCompCount}`)
reportLines.push(`- Auto-updated via protection today: ${todayUpdated}`)
reportLines.push(`- Writing/speaking submissions: untouched (separate FK columns)`)
reportLines.push('\n## DB Verification\n')
reportLines.push(`- L1 units: ${unitCount} (expected 12)`)
reportLines.push(`- L1 passages: ${readings.length} (expected 24)`)
reportLines.push(`- L1 questions: ${qCount} (expected 144)`)
reportLines.push(`- System total units: ${systemUnitCount} (expected 72)`)
reportLines.push(`- Vocabulary rows: ${vocabCount}`)

writeFileSync('PHASE-2-CLEANUP/13-L1-final-report.md', reportLines.join('\n') + '\n')
console.log('\nWrote PHASE-2-CLEANUP/13-L1-final-report.md')

// Machine-readable summary for downstream steps
writeFileSync('PHASE-2-CLEANUP/13-L1-final-summary.json', JSON.stringify({
  unitCount, passageCount: readings.length, questionCount: qCount,
  systemUnitCount, vocabCount, pass, total: rows.length, passRate: +passRate,
  avgWc: +avgWc, avgFkgl: +avgFkgl, avgAsl: +avgAsl,
  studentCompCount, todayUpdated,
}, null, 2))
