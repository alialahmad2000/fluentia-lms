// Regenerate ONLY the writing activity_ribbon for each unit, DERIVED FROM the actual
// curriculum_writing task — so the ribbon above the writing tab previews the REAL
// assignment.
//
// Why: the ribbons were generated from the unit THEME, independent of the task, so a
// student could read "اكتبي قائمة مشتريات من خمسة أشياء" in the ribbon and then find
// "Write a paragraph about your last shopping trip" in the brief directly beneath it.
// All 72 also used a feminine imperative, which misgenders every male student (the
// ribbon renders raw — it never passes through genderizeText).
//
// Same shape as scripts/regen-speaking-ribbons.cjs (2026-06-08). Merges into
// activity_ribbons, preserving every other key. Idempotent.
//
// Usage: node scripts/regen-writing-ribbons.cjs [--dry-run] [--limit N]
const fs = require('fs')
const path = require('path')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY missing'); process.exit(1) }
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null

// Writes go through the Management API — the legacy service-role key in .env is not
// reliable on this project (see CLAUDE.md, 2026-07-02).
const PROJECT = 'nmjexpuycmqcxuxljier'
const MGMT = (() => {
  const mcp = fs.readFileSync(path.join(process.env.HOME, 'projects/fluentia-lms/.mcp.json'), 'utf8')
  const t = mcp.match(/sbp_[A-Za-z0-9]+/)
  if (!t) throw new Error('no Supabase access token in .mcp.json')
  return t[0]
})()

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await r.json()
  if (!r.ok || body?.message) throw new Error(body?.message || `HTTP ${r.status}`)
  return body
}

const SYSTEM = `أنت د. علي الأحمد، مؤسس أكاديمية طلاقة. مهمتك: كتابة "شريط سياق" (Context Ribbon) لنشاط الكتابة في وحدة تعليمية.
الشريط = عبارة وصفية واحدة قصيرة (٥-٩ كلمات) تظهر أعلى صفحة الكتابة وتمهّد لمهمة الكتابة الفعلية.

قواعد صارمة:
١. عبارة واحدة فقط، ٥-٩ كلمات، بلا نقطة في آخرها.
٢. حياد جنسي تام: ممنوع أي ضمير مخاطب (أنتَ/أنتِ) أو فعل أمر/مضارع بصيغة مخاطبة (اكتب، اكتبي، صف، صفي، عبّر، عبّري، دوّن، دوّني). استخدم المصدر أو الوصف الحيادي فقط: "كتابة…"، "وصف…"، "صياغة…"، "تحرير…"، "التعبير عن…".
٣. يجب أن تتّسق العبارة تماماً مع مهمة الكتابة المعطاة — يمنع منعاً باتاً ذكر موضوع أو مطلب مختلف عنها (لا تخترع "قائمة" أو "ثلاث جمل" أو عدداً لم يرد في المهمة).
٤. لا تنسخ نص المهمة حرفياً؛ أطّر المهارة والموقف بإيجاز أنيق دون تكرار.
٥. لا تبدأ بـ"هنا" أو "هذا"، ولا تذكر "تمرين/درس/واجب".
٦. عربية فصيحة راقية بنبرة احترافية هادئة.
٧. أخرج JSON فقط بهذا الشكل: {"writing": "…"}`

// Any 2nd-person imperative disqualifies the line — the ribbon is rendered raw, so a
// gendered verb here reaches every student of the other gender unchanged.
const IMPERATIVES = new Set([
  'اكتب', 'اكتبي', 'أكتب', 'أكتبي', 'صف', 'صفي', 'صِف', 'صِفي',
  'عبر', 'عبري', 'عبّر', 'عبّري', 'دون', 'دوني', 'دوّن', 'دوّني',
  'حرر', 'حرري', 'حرّر', 'حرّري', 'اسرد', 'اسردي', 'ارو', 'اروي',
  'اشرح', 'اشرحي', 'حدد', 'حددي', 'حدّد', 'حدّدي',
])

function isAddressed(ribbon) {
  const tokens = ribbon.split(/[\s،.]+/).filter(Boolean)
  return tokens.some((t) => {
    if (IMPERATIVES.has(t)) return true
    if (t === 'أنتِ' || t === 'أنتَ' || t === 'أنت') return true
    if (/كِ$/.test(t)) return true          // feminine 2nd-person possessive: مدينتكِ
    if (/^(لديك|عندك|كتابتك|نصك)ِ?$/.test(t)) return true
    return false
  })
}

function extractJSON(t) {
  const s = t.indexOf('{'), e = t.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('no JSON in model output')
  return JSON.parse(t.slice(s, e + 1))
}

async function genRibbon(unit) {
  const user = `الوحدة ${unit.unit_number}: "${unit.theme_ar || unit.theme_en}" (المستوى ${unit.level_ar})
مهمة الكتابة الفعلية:
- نوع المهمة: ${unit.task_type || ''}
- الطلب (إنجليزي): ${unit.prompt_en || ''}
- الطلب (عربي): ${unit.prompt_ar || ''}
- عدد الكلمات المطلوب: ${unit.word_count_min}-${unit.word_count_max}

اكتب شريط السياق لنشاط الكتابة بحيث يمهّد لهذه المهمة بالضبط ويتّسق معها تماماً.
أخرج JSON: {"writing": "…"}`

  for (let attempt = 0; attempt < 3; attempt++) {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 200, temperature: 0.6,
      system: SYSTEM, messages: [{ role: 'user', content: user }],
    })
    const out = extractJSON(msg.content[0].text)
    const ribbon = (out.writing || '').trim().replace(/[.۔]\s*$/, '')
    if (ribbon.length < 8) continue
    if (isAddressed(ribbon)) continue // retry — addressed the student
    const words = ribbon.split(/\s+/).length
    if (words < 4 || words > 11) continue
    return ribbon
  }
  throw new Error('failed quality gate after 3 attempts')
}

const esc = (s) => String(s).replace(/'/g, "''")

async function main() {
  const rows = await sql(`
    select u.id, u.unit_number, u.theme_en, u.theme_ar,
           l.name_ar as level_ar, l.level_number,
           u.activity_ribbons->>'writing' as old_ribbon,
           w.task_type, w.prompt_en, w.prompt_ar, w.word_count_min, w.word_count_max
    from curriculum_units u
    join curriculum_levels l on l.id = u.level_id
    join curriculum_writing w on w.unit_id = u.id
    where u.owner_student_id is null
    order by l.level_number, u.unit_number
    ${limit ? `limit ${limit}` : ''};`)

  console.log(`${rows.length} units with a writing task\n`)
  let ok = 0, fail = 0
  const results = []

  for (const u of rows) {
    try {
      const ribbon = await genRibbon(u)
      console.log(`L${u.level_number} U${u.unit_number}  "${(u.prompt_en || '').slice(0, 58)}…"`)
      console.log(`   OLD: ${u.old_ribbon || '(none)'}`)
      console.log(`   NEW: ${ribbon}\n`)
      results.push({ id: u.id, ribbon })
      ok++
      await new Promise((r) => setTimeout(r, 400))
    } catch (e) {
      console.error(`L${u.level_number} U${u.unit_number} FAIL: ${e.message}`)
      fail++
    }
  }

  if (!dryRun && results.length) {
    // One statement, merging into the existing jsonb so no other ribbon key is lost.
    const values = results.map((r) => `('${r.id}'::uuid, '${esc(r.ribbon)}')`).join(',\n      ')
    const upd = await sql(`
      with v(id, ribbon) as (values
      ${values}
      )
      update curriculum_units u
      set activity_ribbons = coalesce(u.activity_ribbons, '{}'::jsonb) || jsonb_build_object('writing', v.ribbon),
          ribbons_generated_at = now()
      from v where u.id = v.id
      returning u.id;`)
    console.log(`applied to ${upd.length} rows`)
    if (upd.length !== results.length) throw new Error(`expected ${results.length} updates, got ${upd.length}`)
  }

  console.log(`\nDone${dryRun ? ' (DRY-RUN)' : ''}. ok=${ok} fail=${fail}`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
