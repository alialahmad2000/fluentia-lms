import { admin as sb } from '../../lib/supa.mjs'

const LAMIA_ID = '95124347-7ad8-46b7-b745-b6c085bf3a6f'

// 1. Find unit_number for her recently-accessed units
const recentUnits = ['f3a651e1', '34f36fbb', '49ed7c2c']
for (const prefix of recentUnits) {
  const { data: units } = await sb
    .from('curriculum_units')
    .select('id, unit_number, level_id, theme_en, theme_ar, sort_order')
    .like('id', `${prefix}%`)
    .limit(2)
  for (const u of units || []) {
    const { data: lvl } = await sb.from('curriculum_levels').select('level_number, slug, code').eq('id', u.level_id).maybeSingle()
    console.log(`  ${u.id}  L${lvl?.level_number ?? '?'} U${u.unit_number}  theme="${u.theme_en}" / "${u.theme_ar}"`)
  }
}

// 2. Schema check: where is a student's level tracked? Try multiple known tables
console.log('\n--- where is Lamia\'s level stored? probing… ---')
const candidates = ['students', 'student_profiles', 'student_levels', 'student_enrollments']
for (const t of candidates) {
  const r = await sb.from(t).select('*').limit(1).maybeSingle().then(x => x, e => ({ error: e }))
  if (r?.error) console.log(`  ${t}: ❌ ${r.error.message || r.error}`)
  else console.log(`  ${t}: ✅ cols ${r.data ? Object.keys(r.data).join(', ') : 'empty'}`)
}

// 3. profile cols (already known) — but check for level/group columns we missed
console.log('\n--- Lamia profile (every column) ---')
const { data: p } = await sb.from('profiles').select('*').eq('id', LAMIA_ID).maybeSingle()
console.log(JSON.stringify(p, null, 2))

// 4. find L1 unit 1
console.log('\n--- L1 Unit 1 ---')
const { data: lvls } = await sb.from('curriculum_levels').select('id, level_number, slug, code').order('level_number')
for (const lvl of lvls || []) {
  const { data: u1 } = await sb
    .from('curriculum_units')
    .select('id, unit_number, theme_en, theme_ar')
    .eq('level_id', lvl.id)
    .eq('unit_number', 1)
    .maybeSingle()
  if (u1) console.log(`  L${lvl.level_number} U1: id=${u1.id} theme="${u1.theme_en}" / "${u1.theme_ar}"`)
}
