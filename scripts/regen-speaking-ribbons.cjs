// Regenerate ONLY the speaking activity_ribbon for each unit, DERIVED FROM the actual
// curriculum_speaking task — so the context ribbon above the speaking tab always previews
// the REAL conversation topic (no more "Saudi space successes" ribbon over a "dream space
// trip" task). Neutral, gender-neutral, premium Arabic. Merges into activity_ribbons,
// preserving every other key. Idempotent.
//
// Usage: node scripts/regen-speaking-ribbons.cjs [--dry-run] [--level N]
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY missing'); process.exit(1) }
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const levelFilter = args.includes('--level') ? parseInt(args[args.indexOf('--level') + 1]) : null

const SYSTEM = `أنت د. علي الأحمد، مؤسس أكاديمية طلاقة. مهمتك: كتابة "شريط سياق" (Context Ribbon) لنشاط التحدّث في وحدة تعليمية.
الشريط = عبارة وصفية واحدة قصيرة (٥-٩ كلمات) تظهر أعلى صفحة التحدّث وتمهّد لمهمة المحادثة الفعلية.

قواعد صارمة:
١. عبارة واحدة فقط، ٥-٩ كلمات، بلا نقطة في آخرها.
٢. حياد جنسي تام: ممنوع أي ضمير مخاطب (أنتَ/أنتِ) أو فعل أمر/مضارع بصيغة مخاطبة (تحدّث، تحدّثي، احكِ، صِف). استخدم المصدر أو الوصف الحيادي فقط: "الحديث عن…"، "التعبير عن…"، "وصف…"، "تبادل…".
٣. يجب أن تتّسق العبارة تماماً مع مهمة المحادثة المعطاة — يمنع منعاً باتاً ذكر موضوع مختلف عنها.
٤. لا تنسخ نص المهمة حرفياً؛ أطّر المهارة والموقف بإيجاز أنيق دون تكرار.
٥. لا تبدأ بـ"هنا" أو "هذا"، ولا تذكر "تمرين/درس/تسجيل".
٦. عربية فصيحة راقية بنبرة احترافية هادئة.
٧. أخرج JSON فقط بهذا الشكل: {"speaking": "…"}`

const FEMININE_IMPERATIVES = ['تحدّثي', 'تحدثي', 'احكي', 'احكِ', 'صفي', 'تكلمي', 'تكلّمي', 'عبّري', 'عبري', 'شاركي', 'اروي', 'ارويلي']

function extractJSON(t) { const s = t.indexOf('{'), e = t.lastIndexOf('}'); if (s === -1 || e === -1) throw new Error('no JSON'); return JSON.parse(t.slice(s, e + 1)) }

async function genRibbon(unit, sp) {
  const user = `الوحدة ${unit.unit_number}: "${unit.theme_ar || unit.theme_en}" (المستوى ${unit.curriculum_levels?.cefr || ''})
مهمة المحادثة الفعلية:
- العنوان: ${sp.title_en || ''}
- الطلب (إنجليزي): ${sp.prompt_en || ''}
- الطلب (عربي): ${sp.prompt_ar || ''}

اكتب شريط السياق لنشاط التحدّث بحيث يمهّد لهذه المهمة بالضبط ويتّسق معها تماماً.
أخرج JSON: {"speaking": "…"}`
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 200, temperature: 0.6, system: SYSTEM, messages: [{ role: 'user', content: user }] })
    const out = extractJSON(msg.content[0].text)
    const ribbon = (out.speaking || '').trim().replace(/[.۔]\s*$/, '')
    if (ribbon.length < 8) continue
    if (FEMININE_IMPERATIVES.some((w) => ribbon.includes(w))) continue // retry — tone rule violated
    return ribbon
  }
  throw new Error('failed quality gate after 2 attempts')
}

async function main() {
  let q = supabase.from('curriculum_units')
    .select('id, unit_number, theme_en, theme_ar, activity_ribbons, curriculum_levels!inner(level_number, cefr)')
    .order('unit_number')
  if (levelFilter) q = q.eq('curriculum_levels.level_number', levelFilter)
  const { data: units, error } = await q
  if (error) throw error

  let ok = 0, fail = 0
  for (const unit of units) {
    const { data: sp } = await supabase.from('curriculum_speaking').select('title_en, prompt_en, prompt_ar').eq('unit_id', unit.id).order('sort_order').limit(1).maybeSingle()
    if (!sp) { console.log(`U${unit.unit_number}: no speaking task, skip`); continue }
    try {
      const old = unit.activity_ribbons?.speaking || '(none)'
      const ribbon = await genRibbon(unit, sp)
      console.log(`U${unit.unit_number} [L${unit.curriculum_levels?.level_number}] "${(sp.prompt_en || '').slice(0, 50)}"\n   OLD: ${old}\n   NEW: ${ribbon}`)
      if (!dryRun) {
        const merged = { ...(unit.activity_ribbons || {}), speaking: ribbon }
        const { data: upd, error: uErr } = await supabase.from('curriculum_units').update({ activity_ribbons: merged }).eq('id', unit.id).select('id')
        if (uErr) throw uErr
        if (!upd || upd.length !== 1) throw new Error(`expected 1 update got ${upd?.length}`)
      }
      ok++
      await new Promise((r) => setTimeout(r, 700))
    } catch (e) { console.error(`U${unit.unit_number} FAIL: ${e.message}`); fail++ }
  }
  console.log(`\nDone${dryRun ? ' (DRY-RUN)' : ''}. ok=${ok} fail=${fail}`)
  if (fail > 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
