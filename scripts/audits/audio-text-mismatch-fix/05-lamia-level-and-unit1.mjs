import { admin as sb } from '../../lib/supa.mjs'

const LAMIA_ID = '95124347-7ad8-46b7-b745-b6c085bf3a6f'

// students.id likely IS the profile id (it's an FK to profiles)
const { data: stu } = await sb.from('students').select('*').eq('id', LAMIA_ID).maybeSingle()
console.log('--- Lamia students row ---')
console.log(JSON.stringify(stu, null, 2))

// Find her academic level mapping
if (stu?.academic_level) {
  console.log(`\nLamia academic_level: ${stu.academic_level}`)

  // Match to curriculum_levels
  const { data: lvls } = await sb.from('curriculum_levels').select('id, level_number, slug, code, name_en, name_ar')
  console.log('\nAll curriculum levels:')
  for (const l of lvls || []) console.log(`  L${l.level_number} id=${l.id} slug=${l.slug} code=${l.code} en="${l.name_en}" ar="${l.name_ar}"`)
}

// Find the most recently accessed unit details
const recentUnits = ['f3a651e1', '34f36fbb', '49ed7c2c']
console.log('\n--- Lamia\'s recently-accessed units ---')
for (const prefix of recentUnits) {
  const { data: u } = await sb
    .from('curriculum_units')
    .select('id, unit_number, level_id, theme_en, theme_ar, sort_order')
    .ilike('id', `${prefix}%`)
    .maybeSingle()
  if (!u) continue
  const { data: lvl } = await sb.from('curriculum_levels').select('level_number, slug, name_en').eq('id', u.level_id).maybeSingle()
  console.log(`  ${u.id}  L${lvl?.level_number ?? '?'} ${lvl?.slug ?? '?'} U${u.unit_number}  theme="${u.theme_en}"`)

  // Readings of this unit
  const { data: rs } = await sb.from('curriculum_readings').select('id, reading_label, title_en, title_ar, passage_content').eq('unit_id', u.id).order('sort_order')
  for (const r of rs || []) {
    const firstP = (r.passage_content?.paragraphs || [])[0] || ''
    console.log(`    label=${r.reading_label}  id=${r.id}  title="${r.title_en}"`)
    console.log(`      first 100: "${firstP.slice(0, 100)}..."`)
  }
}

// Now look at every L1 unit_number (smallest unit_number per level should be "Unit 1")
console.log('\n--- All L1 units (sort_order ascending) ---')
const { data: lvl1 } = await sb.from('curriculum_levels').select('id').eq('level_number', 1).maybeSingle()
if (lvl1) {
  const { data: u1 } = await sb.from('curriculum_units').select('id, unit_number, theme_en, theme_ar, sort_order').eq('level_id', lvl1.id).order('sort_order').limit(5)
  for (const u of u1 || []) console.log(`  U${u.unit_number} (sort=${u.sort_order}) id=${u.id} theme="${u.theme_en}"`)
}

// Same for L0 (pre-A1)
console.log('\n--- All L0 units ---')
const { data: lvl0 } = await sb.from('curriculum_levels').select('id').eq('level_number', 0).maybeSingle()
if (lvl0) {
  const { data: u0 } = await sb.from('curriculum_units').select('id, unit_number, theme_en, theme_ar, sort_order').eq('level_id', lvl0.id).order('sort_order').limit(5)
  for (const u of u0 || []) console.log(`  U${u.unit_number} (sort=${u.sort_order}) id=${u.id} theme="${u.theme_en}"`)
}
