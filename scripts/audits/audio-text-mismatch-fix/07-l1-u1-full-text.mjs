import { admin as sb } from '../../lib/supa.mjs'

const L1_U1_A = '76d1051f-3e7c-4263-af48-98700a879bad'
const L1_U1_B = '0d3b261d-f139-4dec-9958-581a35986661'

for (const rid of [L1_U1_A, L1_U1_B]) {
  console.log(`\n========== reading_id ${rid} ==========`)
  const { data: r } = await sb
    .from('curriculum_readings')
    .select('id, reading_label, title_en, title_ar, passage_content, passage_word_count, passage_audio_url, audio_duration_seconds')
    .eq('id', rid)
    .single()

  console.log(`  label=${r.reading_label}  title_en="${r.title_en}"`)
  console.log(`  passage_word_count: ${r.passage_word_count}`)
  console.log(`  audio_duration_seconds: ${r.audio_duration_seconds}`)
  console.log(`  paragraphs.length: ${r.passage_content?.paragraphs?.length}`)

  let total = 0
  for (let i = 0; i < (r.passage_content?.paragraphs?.length || 0); i++) {
    const p = r.passage_content.paragraphs[i]
    const w = p.split(/\s+/).filter(Boolean).length
    total += w
    console.log(`\n  ── paragraph ${i + 1} (${w} words) ──`)
    console.log(`  ${p}`)
  }
  console.log(`\n  TOTAL words across all paragraphs: ${total}`)

  // word_timestamps count
  const { data: a } = await sb
    .from('reading_passage_audio')
    .select('full_audio_url, full_duration_ms, word_timestamps, paragraph_audio')
    .eq('passage_id', rid)
    .maybeSingle()

  const wts = a?.word_timestamps
  const wtCount = Array.isArray(wts) ? wts.length : (wts && typeof wts === 'object' ? Object.keys(wts).length : 0)
  console.log(`\n  audio_duration_ms: ${a?.full_duration_ms} (${(a?.full_duration_ms/1000).toFixed(1)}s)`)
  console.log(`  word_timestamps count: ${wtCount}`)
  console.log(`  paragraph_audio count: ${Array.isArray(a?.paragraph_audio) ? a.paragraph_audio.length : 'n/a'}`)

  // Sample of word_timestamps to see what words are spoken
  if (wts && typeof wts === 'object') {
    const sample = []
    let count = 0
    for (const k in wts) {
      sample.push(wts[k])
      count++
      if (count > 15) break
    }
    console.log(`  first 15 spoken words:`, sample.map(w => w?.word || w?.text || w?.w).join(' '))
  }
}
