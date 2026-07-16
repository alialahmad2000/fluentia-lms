#!/usr/bin/env node
/**
 * Render every IELTS Writing Task-1 chart_data → a deterministic, accurate SVG,
 * upload it to the public `curriculum-images` bucket at ielts-writing/<id>.svg,
 * set ielts_writing_tasks.image_url, and publish the task.
 *
 * Accuracy comes from rendering straight from chart_data (no AI image-gen).
 *
 *   node scripts/ielts/gen-task1-charts.mjs           # generate + upload + publish
 *   node scripts/ielts/gen-task1-charts.mjs --dry <dir>  # write SVGs to <dir>, no DB/storage
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderTask1ChartSVG } from '../../src/lib/ielts/task1Chart.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
// minimal .env loader (strip quotes + CR, Mac/Win safe)
const env = {}
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].replace(/\r$/, '').replace(/^["']|["']$/g, '')
}
const URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const supa = createClient(URL, KEY, { auth: { persistSession: false } })

const DRY = process.argv.includes('--dry')
const dryDir = DRY ? (process.argv[process.argv.indexOf('--dry') + 1] || '/tmp/task1-charts') : null

async function main() {
  const { data: tasks, error } = await supa
    .from('ielts_writing_tasks')
    .select('id, title, sub_type, chart_data, is_published')
    .eq('task_type', 'task1')
    .order('sub_type')
  if (error) throw error
  console.log(`Task-1 tasks: ${tasks.length}`)
  if (DRY) fs.mkdirSync(dryDir, { recursive: true })

  let ok = 0, fail = 0
  for (const t of tasks) {
    let cd = t.chart_data
    if (typeof cd === 'string') { try { cd = JSON.parse(cd) } catch { cd = null } }
    const svg = renderTask1ChartSVG(cd, { title: t.title })
    if (!svg || svg.length < 200) { console.log(`  ✗ ${t.sub_type} ${t.title} — empty render`); fail++; continue }

    if (DRY) {
      const f = path.join(dryDir, `${t.sub_type}__${t.id}.svg`)
      fs.writeFileSync(f, svg)
      console.log(`  ✓ ${t.sub_type} ${t.title} → ${f} (${svg.length}b)`)
      ok++
      continue
    }

    // Store the exact SVG as a data-URI in image_url. Renders via <img> in the
    // Writing lab AND the Mock writing segment with zero storage/MIME dependency;
    // stays pixel-crisp because it's vector. (~10–14 KB per task — trivial.)
    const imageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    const { error: dbErr } = await supa.from('ielts_writing_tasks')
      .update({ image_url: imageUrl, is_published: true })
      .eq('id', t.id)
    if (dbErr) { console.log(`  ✗ db ${t.title}: ${dbErr.message}`); fail++; continue }
    console.log(`  ✓ ${t.sub_type.padEnd(11)} ${t.title.slice(0, 42)} (${imageUrl.length}b uri)`)
    ok++
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
