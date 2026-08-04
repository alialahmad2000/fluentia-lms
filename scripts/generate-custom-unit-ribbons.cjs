/**
 * generate-custom-unit-ribbons.cjs
 *
 * Fills curriculum_units.activity_ribbons for CUSTOM-TRACK units only
 * (owner_student_id IS NOT NULL). These ribbons are the per-station description
 * shown on the Spread unit overview (unit-v2/spread/UnitSpread.jsx). Without them
 * the UI falls back to BEAT_WHY_FALLBACK, which is generic and still speaks the
 * old "scene" language.
 *
 * Behaviour:
 *   - By default NEVER overwrites an existing ribbon key — only ADDS missing ones,
 *     so ملاك's and سارة's hand-tuned reading/grammar/speaking/vocabulary text is
 *     untouched and only their missing listening/writing keys get filled.
 *     --overwrite rewrites every key (use with --student, only to repair bad copy).
 *   - Writes in the student's own grammatical gender. Female students follow the
 *     platform convention (store feminine; src/i18n/gender.js flips it for males),
 *     but a male student's units are written masculine directly — genderizeText()'s
 *     word map cannot cover open-ended subordinate forms like لتصفي / لتشرحي.
 *
 * Usage:
 *   node scripts/generate-custom-unit-ribbons.cjs --dry-run       # print, write nothing
 *   node scripts/generate-custom-unit-ribbons.cjs --student <uuid> [--overwrite]
 *   node scripts/generate-custom-unit-ribbons.cjs                 # all custom units
 */

const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
if (!API_KEY) { console.error('ERROR: set ANTHROPIC_API_KEY or CLAUDE_API_KEY in .env'); process.exit(1) }
if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env'); process.exit(1)
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const studentFilter = args.includes('--student') ? args[args.indexOf('--student') + 1] : null
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null
// Rewrite keys that already exist. Only ever use with --student, and only when the
// stored copy is wrong (e.g. mixed gender) — otherwise hand-tuned copy is lost.
const overwrite = args.includes('--overwrite')

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: API_KEY })

// Must match ACTIVITY_MAP in unit-v2/useUnitData.js and SCENE_BEATS in scene/sceneConfig.js
const KEYS = ['reading', 'vocabulary', 'grammar', 'listening', 'speaking', 'writing']
const LABEL_AR = {
  reading: 'القراءة', vocabulary: 'المفردات', grammar: 'القواعد',
  listening: 'الاستماع', speaking: 'المحادثة', writing: 'الكتابة',
}

// Gender matters here. Convention: store FEMININE and let src/i18n/gender.js
// genderizeText() flip it for male students — EXCEPT that its map cannot cover
// open-ended subordinate forms (لتصفي، لتشرحي). So for a male student we ask for
// masculine directly; his units are his alone, so nothing else reads them.
const systemPrompt = (gender) => {
  const fem = gender !== 'male'
  return `أنت د. علي الأحمد، مؤسس أكاديمية طلاقة.

مهمتك: كتابة سطر واحد لكل نشاط في وحدة من مقرّر مصمَّم خصيصاً ${fem ? 'لطالبة واحدة' : 'لطالب واحد'}، يظهر تحت اسم النشاط في صفحة الوحدة ويجيب على سؤال${fem ? 'ها' : 'ه'}: «ليش أسوي هذا؟».

قواعد صارمة:
1. جملة واحدة لكل نشاط، من ٦ إلى ١٤ كلمة، تنتهي بنقطة.
2. ${fem
    ? 'مخاطبة المؤنّث المفرد في كل الجملة (اقرئي، أتقني، استمعي، تحدّثي، اكتبي، لاحظي، ركّزي) — وأيضاً في الأفعال التابعة (لتشرحي، لتصفي، لتفهمي) والضمائر (عملكِ، فريقكِ).'
    : 'مخاطبة المذكّر المفرد في كل الجملة (اقرأ، أتقن، استمع، تحدّث، اكتب، لاحظ، ركّز) — وأيضاً في الأفعال التابعة (لتشرح، لتصف، لتفهم) والضمائر (عملك، فريقك). ممنوع تماماً أي صيغة مؤنّثة.'}
3. اربط كل نشاط بموقف الوحدة وبالعمل الحقيقي — لا كلام عام يصلح لأي وحدة.
4. ممنوع تماماً كلمة «المشهد» أو «مشهد» — هذه لغة تصميم قديم.
5. ممنوع «تمرين» و«درس» و«نشاط» و«سجّل أداءك». تكلّم عن القدرة أو الموقف.
6. لا تبدأ كل الجمل بنفس الفعل — نوّع.
7. القواعد: اذكر الأداة اللغوية بالإنجليزية عند اللزوم (has/have، will، used to) لتوضيح المقصود.
8. أخرج JSON فقط، بلا أي نص قبله أو بعده.`
}

function buildPrompt(unit, who, keys) {
  const outcomes = Array.isArray(unit.outcomes) ? unit.outcomes.filter(Boolean) : []
  return `الطالبة: ${who.name} — ${who.about}

الوحدة ${unit.custom_sort ?? unit.unit_number}: «${unit.theme_ar}»${unit.theme_en ? ` (${unit.theme_en})` : ''}
${unit.description_ar ? `الوصف: ${unit.description_ar}` : ''}
${unit.why_matters ? `لماذا تهمّ: ${unit.why_matters}` : ''}
${outcomes.length ? `المخرجات:\n${outcomes.map((o) => `- ${o}`).join('\n')}` : ''}

اكتبي سطراً لكل نشاط من هذه الأنشطة فقط:
${keys.map((k) => `- ${k} (${LABEL_AR[k]})`).join('\n')}

أخرجي JSON بهذا الشكل بالضبط:
{
${keys.map((k) => `  "${k}": "..."`).join(',\n')}
}`
}

// Short profile per track so the copy lands in the student's real world.
const WHO = {
  maktaba: { name: 'أنوار', about: 'أمينة مكتبة في مدرسة النور، تدير نادي قراءة لطالباتها. المستوى B1.' },
  studio:  { name: 'ملاك', about: 'قائدة تسويق تعرض الحملات والاستراتيجيات على فريقها وعملائها. المستوى B1.' },
  control: { name: 'سارة', about: 'مختصّة تقنية معلومات تدير الأنظمة وتتعامل مع الأعطال والمستخدمين. المستوى B1.' },
  insight: { name: 'يسرا', about: 'محلّلة أعمال تقرأ المؤشّرات وتعرض تحليلاتها على الإدارة. المستوى B2.' },
  fardi:   { name: 'مصعب', about: 'موظّف يتعامل مع العملاء والاجتماعات ومتابعة الأعمال بالإنجليزية. المستوى A2.', gender: 'male' },
}

function extractJson(text) {
  const s = text.indexOf('{')
  const e = text.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('no JSON in response')
  return JSON.parse(text.slice(s, e + 1))
}

function validate(obj, keys) {
  const out = {}
  for (const k of keys) {
    const v = obj[k]
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!t) continue
    if (t.includes('مشهد')) { console.warn(`      ! dropped ${k}: contains «مشهد»`); continue }
    const words = t.split(/\s+/).length
    if (words < 4 || words > 20) { console.warn(`      ! dropped ${k}: ${words} words`); continue }
    out[k] = t
  }
  return out
}

async function main() {
  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('id, theme_key, profiles!students_id_fkey(display_name)')
    .eq('uses_custom_curriculum', true)
    .is('deleted_at', null)
  if (sErr) throw sErr

  const byId = {}
  for (const s of students) byId[s.id] = s

  let q = supabase
    .from('curriculum_units')
    .select('id, unit_number, custom_sort, theme_ar, theme_en, description_ar, why_matters, outcomes, activity_ribbons, owner_student_id')
    .not('owner_student_id', 'is', null)
    .order('owner_student_id')
    .order('custom_sort')
  if (studentFilter) q = q.eq('owner_student_id', studentFilter)

  const { data: units, error: uErr } = await q
  if (uErr) throw uErr

  const work = []
  for (const u of units) {
    if (!byId[u.owner_student_id]) continue
    const existing = u.activity_ribbons && typeof u.activity_ribbons === 'object' ? u.activity_ribbons : {}
    const missing = overwrite ? KEYS.slice() : KEYS.filter((k) => !existing[k] || !String(existing[k]).trim())
    if (missing.length) work.push({ unit: u, existing, missing })
  }

  const todo = limit ? work.slice(0, limit) : work
  console.log(`custom units: ${units.length} · needing ribbons: ${work.length}${limit ? ` · running ${todo.length}` : ''}`)
  if (dryRun) {
    for (const w of todo) {
      const st = byId[w.unit.owner_student_id]
      console.log(`  [${st.theme_key}] «${w.unit.theme_ar}» → missing: ${w.missing.join(', ')}`)
    }
    return
  }

  let ok = 0, failed = 0
  for (const w of todo) {
    const st = byId[w.unit.owner_student_id]
    const who = WHO[st.theme_key] || { name: st.profiles?.display_name || 'الطالبة', about: 'طالبة بمقرّر مخصّص.' }
    const tag = `[${st.theme_key}] «${w.unit.theme_ar}»`
    try {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 900,
        system: systemPrompt(who.gender),
        messages: [{ role: 'user', content: buildPrompt(w.unit, who, w.missing) }],
      })
      const parsed = validate(extractJson(res.content[0].text), w.missing)
      if (!Object.keys(parsed).length) throw new Error('nothing valid returned')

      // merge — existing keys win unless --overwrite was passed
      const merged = overwrite ? { ...w.existing, ...parsed } : { ...parsed, ...w.existing }
      const { error } = await supabase
        .from('curriculum_units')
        .update({ activity_ribbons: merged, ribbons_generated_at: new Date().toISOString() })
        .eq('id', w.unit.id)
        .select('id')
      if (error) throw error

      ok++
      console.log(`  ✓ ${tag} +${Object.keys(parsed).length}`)
      for (const k of Object.keys(parsed)) console.log(`      ${LABEL_AR[k]}: ${parsed[k]}`)
    } catch (e) {
      failed++
      console.error(`  ✗ ${tag} — ${e.message}`)
    }
  }
  console.log(`\ndone — updated ${ok}, failed ${failed}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
