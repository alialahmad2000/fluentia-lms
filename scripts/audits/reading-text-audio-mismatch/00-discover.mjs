import { admin as sb } from '../../lib/supa.mjs'

const { data: counts, error } = await sb
  .from('curriculum_readings')
  .select('unit_id')
  .order('unit_id')

if (error) { console.error(error); process.exit(1) }

const byUnit = {}
counts.forEach(r => { byUnit[r.unit_id] = (byUnit[r.unit_id] || 0) + 1 })
const multi = Object.entries(byUnit).filter(([,n]) => n > 1).sort((a,b) => b[1]-a[1])
console.log('Total units with readings:', Object.keys(byUnit).length)
console.log('Units with >1 reading:', multi.length)
console.log('Top 10 multi-article units:')
console.log(multi.slice(0, 10).map(([u,n]) => `  ${u}: ${n} articles`).join('\n'))

if (multi.length === 0) { console.log('NO MULTI-ARTICLE UNITS'); process.exit(0) }

const [topUnit, topCount] = multi[0]
console.log(`\n=== Inspecting top unit ${topUnit} (${topCount} articles) ===`)
const { data: rows } = await sb
  .from('curriculum_readings')
  .select('id, unit_id, reading_label, title_ar, title_en, passage_content, sort_order')
  .eq('unit_id', topUnit)
  .order('sort_order')

for (const r of rows) {
  const paras = r.passage_content?.paragraphs || []
  const wc = paras.join(' ').split(/\s+/).filter(Boolean).length
  console.log(`  id=${r.id} label=${r.reading_label} sort=${r.sort_order} title="${r.title_en}" wc=${wc}`)
  console.log(`    excerpt: "${(paras[0]||'').slice(0,80)}..."`)
}

console.log(`\n=== Audio rows for unit ${topUnit} ===`)
const ids = rows.map(r => r.id)
const { data: audio } = await sb
  .from('reading_passage_audio')
  .select('passage_id, full_audio_url, full_duration_ms, voice_id, paragraph_audio, word_timestamps')
  .in('passage_id', ids)

console.log('Audio rows found:', (audio||[]).length, 'of', ids.length)
for (const a of audio || []) {
  const matchedRow = rows.find(r => r.id === a.passage_id)
  const expectedWords = (matchedRow?.passage_content?.paragraphs || []).join(' ').split(/\s+/).filter(Boolean).length
  const expectedSecs = expectedWords / 2.5
  const actualSecs = (a.full_duration_ms || 0) / 1000
  const ratio = actualSecs / Math.max(1, expectedSecs)
  const wts = a.word_timestamps
  const wtCount = Array.isArray(wts) ? wts.length : (wts && typeof wts === 'object' ? Object.keys(wts).length : 0)
  console.log(`  passage_id=${a.passage_id} dur=${actualSecs.toFixed(1)}s (expected~${expectedSecs.toFixed(1)}s, ratio=${ratio.toFixed(2)}) wts=${wtCount} voice=${a.voice_id}`)
  console.log(`    audio_url: ${a.full_audio_url?.slice(0,100)}`)
}

// Show 5 multi units summary
console.log(`\n=== 5 multi-article unit ids for verify.cjs ===`)
console.log(JSON.stringify(multi.slice(0, 5).map(([u,n]) => ({ unit_id: u, article_count: n }))))
