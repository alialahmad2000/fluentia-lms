// Phase A — Schema Discovery for all curriculum_* tables
// READ-ONLY. Zero writes to curriculum content.
'use strict'
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DB = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
}

async function main() {
  const client = new Client(DB)
  await client.connect()
  console.log('Phase A — Schema Discovery\n')

  // 1. List all curriculum_* tables in public schema
  const { rows: tables } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'curriculum%'
    ORDER BY table_name
  `)
  console.log('curriculum_* tables found:')
  tables.forEach(t => console.log(' ', t.table_name))
  console.log()

  // Also check legacy table names from the prompt
  const probeNames = [
    'levels','units','reading_passages','comprehension_questions',
    'passage_questions','reading_questions',
  ]
  const { rows: legacy } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1)
  `, [probeNames])
  console.log('Legacy name probes found:', legacy.map(r => r.table_name).join(', ') || '(none)')
  console.log()

  // 2. Get columns for every curriculum_* table
  const schemas = {}
  for (const { table_name } of tables) {
    const { rows: cols } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table_name])
    schemas[table_name] = cols
  }

  // Also levels + units
  for (const t of ['levels', 'units']) {
    const { rows: cols } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [t]).catch(() => ({ rows: [] }))
    if (cols.length) schemas[t] = cols
  }

  // 3. Quick row counts
  const counts = {}
  for (const tname of Object.keys(schemas)) {
    const { rows: [{ c }] } = await client.query(`SELECT count(*) AS c FROM "${tname}"`).catch(() => ({ rows: [{ c: 'ERR' }] }))
    counts[tname] = c
  }

  // 4. Special probes
  // Check if comprehension questions are in a separate table or JSONB column
  const hasComprehensionTable = !!schemas['curriculum_comprehension_questions']
  const readingTableName = schemas['curriculum_readings'] ? 'curriculum_readings' : 'reading_passages'
  const hasReadingTable = !!schemas[readingTableName]
  const hasListeningTable = !!schemas['curriculum_listening']
  const hasVocabTable = !!schemas['curriculum_vocabulary']
  const hasIrregularVerbs = !!schemas['curriculum_irregular_verbs']

  // Check reading for content field names
  let readingContentField = null
  let readingTranscriptField = null
  if (hasReadingTable) {
    const rCols = schemas[readingTableName].map(c => c.column_name)
    readingContentField = rCols.find(c => ['content_en','content','passage_content','passage_en','text_en','body'].includes(c)) || '(not found)'
  }

  // Check listening for transcript + audio_type values
  let listeningAudioTypes = []
  if (hasListeningTable) {
    const { rows: atypes } = await client.query(`
      SELECT DISTINCT audio_type FROM curriculum_listening WHERE audio_type IS NOT NULL ORDER BY audio_type
    `).catch(() => ({ rows: [] }))
    listeningAudioTypes = atypes.map(r => r.audio_type)
  }

  // Build markdown output
  let md = `# Curriculum Audit — Phase A: Schema Discovery\n\n`
  md += `**Generated:** ${new Date().toISOString()}\n\n`
  md += `## Curriculum Tables Found\n\n`
  md += `| Table | Row Count |\n|---|---|\n`
  for (const [t, c] of Object.entries(counts)) {
    md += `| \`${t}\` | ${c} |\n`
  }
  md += `\n## Key Findings\n\n`
  md += `- **Reading table:** \`${readingTableName}\` (exists: ${hasReadingTable})\n`
  md += `- **Reading content field:** \`${readingContentField}\`\n`
  md += `- **Comprehension questions table:** \`curriculum_comprehension_questions\` (exists: ${hasComprehensionTable})\n`
  md += `- **Listening table:** \`curriculum_listening\` (exists: ${hasListeningTable})\n`
  md += `- **Listening audio_type values:** ${listeningAudioTypes.join(', ') || '(none)'}\n`
  md += `- **Vocabulary table:** \`curriculum_vocabulary\` (exists: ${hasVocabTable})\n`
  md += `- **Irregular verbs table:** \`curriculum_irregular_verbs\` (exists: ${hasIrregularVerbs})\n`
  md += `\n## Column Schemas\n\n`
  for (const [tname, cols] of Object.entries(schemas)) {
    md += `### \`${tname}\` (${counts[tname]} rows)\n\n`
    md += `| Column | Type | Nullable | Default |\n|---|---|---|---|\n`
    for (const c of cols) {
      md += `| \`${c.column_name}\` | ${c.data_type} | ${c.is_nullable} | ${c.column_default || '-'} |\n`
    }
    md += '\n'
  }

  const outDir = path.join(__dirname, '..', '..', 'docs', 'audits')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'audit-schema-discovery.md'), md)
  console.log('Schema map saved → docs/audits/audit-schema-discovery.md')

  const result = {
    tables: Object.keys(schemas),
    counts,
    readingTableName,
    readingContentField,
    hasComprehensionTable,
    hasListeningTable,
    hasVocabTable,
    hasIrregularVerbs,
    listeningAudioTypes,
    schemas,
  }

  await client.end()
  return result
}

module.exports = { main }

if (require.main === module) {
  main().then(() => { console.log('\nPhase A done.'); process.exit(0) })
        .catch(e => { console.error(e.message); process.exit(1) })
}
