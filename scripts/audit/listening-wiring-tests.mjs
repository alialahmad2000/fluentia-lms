import 'dotenv/config'
import fs from 'fs/promises'
import pg from 'pg'

const { Client } = pg
const db = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
})
await db.connect()
const q = (sql, p=[]) => db.query(sql, p).then(r=>r.rows)

let passed = 0, failed = 0
const results = []

function test(name, fn) {
  return fn().then(ok => {
    if (ok) { passed++; results.push(`  ✅ ${name}`) }
    else     { failed++; results.push(`  ❌ ${name}`) }
  }).catch(e => { failed++; results.push(`  ❌ ${name}: ${e.message}`) })
}

// Test 1: Hook file exists and queries correct columns
await test('Hook useListeningTranscriptAudio exists', async () => {
  const src = await fs.readFile('src/hooks/useListeningTranscriptAudio.js', 'utf8')
  return src.includes('listening_audio') &&
    src.includes('segment_index') &&
    src.includes('speaker_label') &&
    src.includes('word_timestamps') &&
    src.includes('isMounted')
})

// Test 2: Storage URL check — 3 transcripts with segments
await test('Multi-segment transcript URLs return 200 (3 checked)', async () => {
  const segs = await q('SELECT transcript_id, audio_url FROM listening_audio WHERE segment_index <= 2 LIMIT 15')
  const sample = segs.sort(() => Math.random() - 0.5).slice(0, 3)
  for (const s of sample) {
    const r = await fetch(s.audio_url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
    if (!r.ok || !r.headers.get('content-type')?.includes('audio')) return false
  }
  return true
})

// Test 2b: Cumulative duration > 15s for dialogues/interviews
await test('Dialogue transcripts have >15s total audio', async () => {
  const rows = await q(`
    SELECT cli.id, sum(la.duration_ms) AS total_ms
    FROM curriculum_listening cli
    JOIN listening_audio la ON la.transcript_id=cli.id
    WHERE cli.audio_type IN ('dialogue','interview')
    GROUP BY cli.id HAVING sum(la.duration_ms) > 15000
    LIMIT 5
  `)
  return rows.length >= 5
})

// Test 3: Static integration check on ListeningTab
await test('ListeningTab imports SmartAudioPlayer', async () => {
  const src = await fs.readFile('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
  return src.includes('SmartAudioPlayer')
})
await test('ListeningTab imports VocabPopup', async () => {
  const src = await fs.readFile('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
  return src.includes('VocabPopup')
})
await test('ListeningTab uses bottom-bar variant', async () => {
  const src = await fs.readFile('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
  return src.includes("variant=\"bottom-bar\"")
})
await test('ListeningTab uses useListeningTranscriptAudio', async () => {
  const src = await fs.readFile('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
  return src.includes('useListeningTranscriptAudio')
})
await test('ListeningTab preserves ListeningExercises', async () => {
  const src = await fs.readFile('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
  return src.includes('ListeningExercises') && src.includes('student_curriculum_progress')
})

// Test 4: Analytics events count
await test('ListeningTab has ≥5 trackEvent calls', async () => {
  const src = await fs.readFile('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
  const matches = src.match(/trackEvent\(/g) || []
  return matches.length >= 5
})

// Test 5: Hooks rule — no hooks after conditional return in ListeningSection
await test('React Hooks Rule: hooks before returns in ListeningSection', async () => {
  const src = await fs.readFile('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
  // Find ListeningSection function body
  const fnStart = src.indexOf('function ListeningSection(')
  const fnBody = src.substring(fnStart, fnStart + 3000)
  // Find first hook after function start
  const firstHook = Math.min(
    ...[/useState\(/, /useRef\(/, /useCallback\(/, /useListening/]
      .map(r => { const m = fnBody.match(r); return m ? m.index : Infinity })
  )
  // Find first return statement (not inside JSX)
  const firstReturn = fnBody.indexOf('\n  return (')
  return firstHook < firstReturn
})

await db.end()

// Summary
console.log('\n=== LISTENING WIRING TESTS ===')
results.forEach(r => console.log(r))
console.log(`\nResult: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  await fs.writeFile('docs/audits/LISTENING-WIRING-D-TESTS-FAILED.md',
    `# Test Failures\n\n${results.join('\n')}\n`)
  process.exit(1)
}
