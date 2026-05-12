import 'dotenv/config'
import fs from 'fs/promises'
import pg from 'pg'
import { execSync } from 'child_process'

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

// 1. Migration applied
await test('student_word_highlights table exists', async () => {
  const r = await q("SELECT 1 FROM information_schema.tables WHERE table_name='student_word_highlights'")
  return r.length > 0
})

// 2. RLS policies
await test('RLS: 3 policies on student_word_highlights', async () => {
  const r = await q("SELECT policyname FROM pg_policies WHERE tablename='student_word_highlights'")
  return r.length >= 3
})

// 3. KaraokeText has highlight logic
await test('KaraokeText contains highlight rendering', async () => {
  const src = await fs.readFile('src/components/audio/parts/KaraokeText.jsx', 'utf8')
  return src.includes('HIGHLIGHT_CLASSES') && src.includes('highlightLookup')
})

// 4. KaraokeText has hover handler
await test('KaraokeText contains hover handler', async () => {
  const src = await fs.readFile('src/components/audio/parts/KaraokeText.jsx', 'utf8')
  return src.includes('onMouseEnter') && src.includes('onWordHover')
})

// 5. KaraokeText has data-is-vocab attribute
await test('KaraokeText marks vocab words with data-is-vocab', async () => {
  const src = await fs.readFile('src/components/audio/parts/KaraokeText.jsx', 'utf8')
  return src.includes('data-is-vocab')
})

// 6. ProgressBar has dir="ltr" on bar container
await test('ProgressBar bar container has dir="ltr"', async () => {
  const src = await fs.readFile('src/components/audio/parts/ProgressBar.jsx', 'utf8')
  return src.includes('dir="ltr"') && src.includes('h-2 rounded-full')
})

// 7. BottomBarControls has absolute Play centering
await test('BottomBarControls uses absolute left-1/2 centering for Play', async () => {
  const src = await fs.readFile('src/components/audio/parts/BottomBarControls.jsx', 'utf8')
  return src.includes('absolute left-1/2') && src.includes('-translate-x-1/2')
})

// 8. VocabPopup queries image_url
await test('VocabPopup queries image_url column', async () => {
  const src = await fs.readFile('src/components/audio/VocabPopup.jsx', 'utf8')
  return src.includes('image_url')
})

// 9. WordTooltip exists and has z-58 (above bar, below popup)
await test('WordTooltip.jsx exists with correct z-index (58)', async () => {
  const src = await fs.readFile('src/components/audio/parts/WordTooltip.jsx', 'utf8')
  return src.includes('zIndex: 58')
})

// 10. Syntax check of new files
await test('New files pass esbuild syntax check', async () => {
  try {
    for (const f of ['src/components/audio/parts/WordTooltip.jsx','src/components/audio/parts/WordActionMenu.jsx','src/hooks/useWordHighlights.js']) {
      execSync(`npx esbuild --bundle=false "${f}" 2>&1`, { stdio: 'pipe' })
    }
    return true
  } catch (e) {
    results[results.length - 1] += ': ' + e.stdout?.toString().substring(0, 200)
    return false
  }
})

await db.end()

console.log('\n=== AUDIO PREMIUM POLISH TESTS ===')
results.forEach(r => console.log(r))
console.log(`\nResult: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  await fs.writeFile('docs/audits/AUDIO-PREMIUM-POLISH-TESTS-FAILED.md', `# Test Failures\n\n${results.join('\n')}\n`)
  process.exit(1)
}
