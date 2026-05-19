import { admin as sb } from '../../lib/supa.mjs'

const L1_UNIT_1 = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const LAMIA_ID = '95124347-7ad8-46b7-b745-b6c085bf3a6f'
const LAMIA_INTERESTS = ['fashion_beauty', 'family', 'travel_food']

// 1. Canonical readings for L1 U1
console.log('=== Canonical readings — L1 U1 "Cultural Festivals" ===')
const { data: rs } = await sb
  .from('curriculum_readings')
  .select('id, reading_label, title_en, title_ar, passage_content, passage_audio_url, audio_duration_seconds, sort_order')
  .eq('unit_id', L1_UNIT_1)
  .order('sort_order')

for (const r of rs || []) {
  const firstP = (r.passage_content?.paragraphs || [])[0] || ''
  const wc = firstP.split(/\s+/).filter(Boolean).length
  console.log(`\n  Reading ${r.reading_label} (id=${r.id}):`)
  console.log(`    title_en: "${r.title_en}"`)
  console.log(`    title_ar: "${r.title_ar}"`)
  console.log(`    passage_audio_url: ${r.passage_audio_url}`)
  console.log(`    first 200 chars of paragraph 1 (wc=${wc}): "${firstP.slice(0,200)}..."`)
}

// 2. reading_passage_audio for each
console.log('\n=== reading_passage_audio for these ===')
const readingIds = (rs || []).map(r => r.id)
const { data: audio } = await sb.from('reading_passage_audio').select('*').in('passage_id', readingIds)
for (const a of audio || []) {
  const matchedReading = rs.find(r => r.id === a.passage_id)
  console.log(`  ${matchedReading?.reading_label}: passage_id=${a.passage_id}  url=${a.full_audio_url}`)
  console.log(`    voice_id=${a.voice_id} duration_ms=${a.full_duration_ms}`)
}

// 3. personalized_readings for these canonical readings, filtered to Lamia's buckets
console.log('\n=== personalized_readings rows matching Lamia\'s interests for these canonicals ===')
const { data: prs } = await sb
  .from('personalized_readings')
  .select('id, canonical_reading_id, interest_bucket, title, body, word_count, is_published')
  .in('canonical_reading_id', readingIds)
  .in('interest_bucket', LAMIA_INTERESTS)

console.log(`  found ${prs?.length || 0} variants`)
for (const pr of prs || []) {
  const matchedReading = rs.find(r => r.id === pr.canonical_reading_id)
  console.log(`\n  variant id=${pr.id} bucket=${pr.interest_bucket} for canonical "${matchedReading?.title_en}" (${matchedReading?.reading_label})`)
  console.log(`    variant title: "${pr.title}"`)
  console.log(`    variant first 200: "${pr.body.slice(0, 200)}..."`)
  console.log(`    word_count: ${pr.word_count}  is_published: ${pr.is_published}`)
}

// 4. ALL personalized_readings for canonical = L1 U1's A reading
console.log('\n=== ALL 8 buckets for L1 U1 Reading A ===')
if (rs?.[0]) {
  const { data: allPrs } = await sb
    .from('personalized_readings')
    .select('id, interest_bucket, title, is_published')
    .eq('canonical_reading_id', rs[0].id)
    .order('interest_bucket')
  for (const p of allPrs || []) console.log(`  ${p.interest_bucket}: "${p.title}" (published=${p.is_published})`)
}
