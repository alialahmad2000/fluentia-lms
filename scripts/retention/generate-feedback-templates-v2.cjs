#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 Block 2 — feedback templates generator.
// Creates 5 feedback templates per scenario (target: 5 × ~200 scenarios = 1,000).
// Each template covers a distinct trigger_condition shape.
//
// Idempotent: dedupes by (scenario_id, trigger_condition).
//
// Slot bindings supported in templates:
//   {{student_name}}, {{best_moment}}, {{vocab_used}}, {{turns_completed}}

const https = require('https')

const BACKOFFS = [2000, 5000, 10000, 20000, 40000]
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
async function callOnce(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST', family: 4,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => resolve({ statusCode: res.statusCode, body }))
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
async function call(token, ref, query) {
  for (let attempt = 0; attempt <= BACKOFFS.length; attempt++) {
    const res = await callOnce(token, ref, query)
    if (res.statusCode === 429 && attempt < BACKOFFS.length) {
      await sleep(BACKOFFS[attempt]); continue
    }
    if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}: ${res.body.slice(0,300)}`)
    try { return JSON.parse(res.body) } catch { return res.body }
  }
}
const esc = (s) => s == null ? 'NULL' : `$${'f'}$${String(s).replace(/\$f\$/g, '$_f_$')}$${'f'}$`
const jsonbVal = (v) => `${esc(JSON.stringify(v))}::jsonb`

// 5 base trigger conditions × variant phrasings for diversity per scenario.
// Each scenario gets 5 templates. The phrasings rotate based on scenario hash
// so that students don't see identical feedback across scenarios.

const TRIGGER_KINDS = [
  { key: 'full_completion_high_vocab',
    cond: { completion: 'full', vocab_usage: 'high' },
    variants: [
      "أحسنتِ {{student_name}}! أكملتِ كل المحادثة ({{turns_completed}} جولة) واستخدمتِ المفردات الجديدة بطلاقة. أعجبتني بشكل خاص لحظة \"{{best_moment}}\". هذا المستوى من المشاركة الطبيعية هو ما يفصل المتعلم العادي عن المتحدث. استمري على هذا — كل محادثة كهذه تبني ثقتكِ خطوة جديدة. أحسنتِ بصدق.",
      "ممتاز {{student_name}}! محادثة كاملة من {{turns_completed}} جولات + مفردات حية. لحظة \"{{best_moment}}\" كانت بطولية — استخدمتِ المفردات الصحيحة في الوقت الصحيح. الإنجليزية ليست حفظ، هي استخدام، وأنتِ تستخدمين. خذيها كدليل: لسانكِ يتحرر شيئاً فشيئاً.",
      "رائعة {{student_name}}! {{turns_completed}} جولات كاملة، مفردات مستخدمة بثقة، وأفضل لحظة كانت \"{{best_moment}}\". هذا ليس مجرد فهم — هذا تحوّل. كل محادثة من هذا النوع تبني خلية ذاكرة جديدة لكِ في الإنجليزية. استمري.",
    ],
    priority: 9 },

  { key: 'full_completion_low_vocab',
    cond: { completion: 'full', vocab_usage: 'low' },
    variants: [
      "أحسنتِ {{student_name}}! أكملتِ المحادثة ({{turns_completed}} جولة) وهذا إنجاز. لكن لاحظت أن المفردات الجديدة المقترحة لم تظهر كثيراً في إجاباتكِ. لحظة \"{{best_moment}}\" كانت جيدة — لو دمجتِ مفردتين جديدتين فيها، لصارت ممتازة. المحادثة القادمة: اختاري ٢ كلمات من المفردات المستهدفة وحاولي إدخالهما بشكل طبيعي.",
      "جيد جداً {{student_name}}! أكملتِ كل {{turns_completed}} جولات. الإكمال نفسه إنجاز. الخطوة التالية: المفردات. قبل المحادثة القادمة، اقرئي قائمة المفردات المستهدفة بعمق، ثم حاولي استخدامها فعلاً. الاستخدام أعمق بمراحل من القراءة.",
      "ممتاز الإكمال {{student_name}}! {{turns_completed}} جولات كاملة بدون توقّف. الآن الهدف: استخدام أعمق للمفردات. \"{{best_moment}}\" كان حلواً — تخيلي لو كانت كل لحظة بهذه القوة. سأقترح: قبل بدء أي محادثة جديدة، احفظي ٣ مفردات وأدخلهنّ بقصد.",
    ],
    priority: 7 },

  { key: 'partial_completion',
    cond: { completion: 'partial' },
    variants: [
      "بداية جيدة {{student_name}}! أكملتِ {{turns_completed}} جولات قبل التوقّف. لحظة \"{{best_moment}}\" أظهرت قدرتكِ — لكن المحادثة لم تكتمل. سؤال: هل توقّفتِ لأنها صعبت؟ لو نعم، عودي وحاولي مرة أخرى — الإكمال يبني الثقة. لو حدث ظرف خارجي، فلا بأس، المرة القادمة سنكمل.",
      "خطوة جيدة {{student_name}}! {{turns_completed}} جولات هي إنجاز بحد ذاته. الفرق بين الجيد والممتاز: الإكمال. حاولي تعودي وتنهي المحادثة — كل جولة بعد الإحساس بالصعوبة تبني عضلة جديدة في عقلكِ.",
      "بداية رائعة {{student_name}}! {{turns_completed}} جولات + لحظة \"{{best_moment}}\" جميلة. لم تنتهِ المحادثة هذه المرة — لا تأخذيها على أنها فشل. خذيها على أنها استراحة. عودي بعد ساعة وأكملي. عقلكِ سيكون أكثر استعداداً.",
    ],
    priority: 5 },

  { key: 'off_topic_branch',
    cond: { branch: 'off_topic' },
    variants: [
      "تفاعل جميل {{student_name}} — أكملتِ {{turns_completed}} جولات. لاحظت أنكِ أخذتِ المحادثة في اتجاه مختلف عن الهدف الأصلي. هذا ليس خطأ — أحياناً المحادثة الحقيقية تتجه حيث لا نتوقع. لكن لو أردتِ تدريب الهدف المعيّن، حاولي المرة القادمة الالتزام بالسياق. كلا الأسلوبين له مكان.",
      "محادثة ممتعة {{student_name}}! أعجبتني مرونتكِ. أحياناً المحادثة تأخذنا لمسارات جديدة — هذا طبيعي. الموضوع الأصلي لم يكتمل بالكامل، لكن استخدمتِ الإنجليزية بحرية. المرة القادمة: حاولي تبقي على الهدف لتدربي المفردات المحددة. هذه المحادثة كانت تدريب طلاقة عام.",
      "إجابات حية {{student_name}}! لحظة \"{{best_moment}}\" أظهرت أنكِ تستخدمين اللغة طبيعياً. لاحظت أن المحادثة تطوّرت بطريقة شخصية — وهذا جميل لكنه ابتعد عن السيناريو المُصمَّم. الفائدة: حصلتِ على ممارسة حقيقية. الفرصة الضائعة: المفردات المستهدفة. المرة القادمة، حاولي الجمع بين الطبيعة والالتزام.",
    ],
    priority: 4 },

  { key: 'terminal_default',
    cond: { fallback: true },
    variants: [
      "أحسنتِ {{student_name}} على المحاولة. كل محادثة، حتى التي تشعرين أنها لم تكن مثالية، تبني خبرة. لحظة \"{{best_moment}}\" أظهرت قدرة. الخطوة القادمة: محادثة جديدة، نفس الطاقة. التراكم — وليس الكمال — هو ما يصنع الطلاقة.",
      "شكراً {{student_name}} على المحاولة. كل تفاعل مع الإنجليزية مهم، حتى لو شعرتِ أنه لم يكن ممتازاً. {{turns_completed}} جولات هي تدريب. عقلكِ يبني روابط جديدة الآن. استمري — الفرق بين متقن وغير متقن هو عدد المحاولات.",
      "محاولة محسوبة {{student_name}}. الإنجليزية لا تأتي دفعة واحدة — تأتي عبر مئات المحاولات الصغيرة. هذه واحدة منها. لحظة \"{{best_moment}}\" دليل على قدرتكِ. غداً، محادثة جديدة بنفس الإصرار.",
    ],
    priority: 2 },
]

// Hash a string to int for variant selection (so each scenario consistently
// gets the same variants across reruns)
function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 }
  return Math.abs(h)
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  for (const ref of targets) {
    console.log(`\n=== TARGET: ${ref} ===`)
    const scenarios = await call(token, ref, 'SELECT id, slug FROM retention_scenarios WHERE active=true')
    console.log(`  ${scenarios.length} active scenarios`)

    let inserted = 0, skipped = 0, failed = 0
    for (const sc of scenarios) {
      const variantIdx = hashStr(sc.slug) % 3 // pick which variant of the 3
      for (const kind of TRIGGER_KINDS) {
        // Idempotency check: if a row exists with same (scenario_id, trigger_condition), skip
        const existsQ = `SELECT id FROM retention_feedback_templates WHERE scenario_id='${sc.id}' AND trigger_condition = ${jsonbVal(kind.cond)} LIMIT 1`
        try {
          const exists = await call(token, ref, existsQ)
          if (Array.isArray(exists) && exists.length > 0) { skipped++; continue }
        } catch (e) {
          // Continue trying to insert; check is best-effort
        }
        const template = kind.variants[variantIdx]
        const sql = `INSERT INTO retention_feedback_templates (scenario_id, trigger_condition, template_ar) VALUES ('${sc.id}', ${jsonbVal(kind.cond)}, ${esc(template)})`
        try { await call(token, ref, sql); inserted++ }
        catch (e) { console.error(`  fail ${sc.slug}/${kind.key}: ${e.message.slice(0,100)}`); failed++ }
      }
      if (inserted % 50 === 0 && inserted > 0) console.log(`  progress: +${inserted} (scenario ${sc.slug})`)
    }
    console.log(`  done — inserted: ${inserted}, skipped: ${skipped}, failed: ${failed}`)
    const c = await call(token, ref, 'SELECT count(*)::int as c FROM retention_feedback_templates')
    console.log(`  total: ${c[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
