import { admin as sb } from '../../lib/supa.mjs'
const unit_id = '00ca3625-46ee-4e38-95da-2255f522aff8'
const { data: u } = await sb.from('curriculum_units').select('id, unit_number, level_id, theme_en, theme_ar').eq('id', unit_id).single()
const { data: lvl } = await sb.from('curriculum_levels').select('id, level_number, slug').eq('id', u.level_id).single()
const { data: rows } = await sb
  .from('curriculum_readings')
  .select('id, reading_label, title_ar, title_en, passage_content, sort_order')
  .eq('unit_id', unit_id)
  .order('sort_order')
console.log('UNIT:', JSON.stringify(u))
console.log('LEVEL:', JSON.stringify(lvl))
for (const r of rows) {
  const firstP = (r.passage_content?.paragraphs || [])[0] || ''
  const firstSentence = firstP.split(/[.!?]/)[0] + '.'
  console.log(`Article ${r.reading_label}: id=${r.id}`)
  console.log(`  title_ar: ${r.title_ar}`)
  console.log(`  title_en: ${r.title_en}`)
  console.log(`  first 6 words: ${firstP.split(/\s+/).slice(0,6).join(' ')}`)
  console.log(`  first sentence: ${firstSentence.slice(0,140)}`)
}
