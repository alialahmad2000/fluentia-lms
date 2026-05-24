#!/usr/bin/env node
/* eslint-disable no-console */
const https = require('https')

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

const esc = (s) => s == null ? 'NULL' : `$${'r'}$${s}$${'r'}$`
const jsonbVal = (v) => `${esc(JSON.stringify(v))}::jsonb`

const TEMPLATES = [
  // Strongest shape — celebratory
  {
    shape: { xp_trend: 'up', streak_trend: 'strong', attendance_full: true },
    priority: 100,
    title: 'أسبوع استثنائي — {{student_name}} 🏆',
    intro: 'مرحبًا {{student_name}}،\n\nهذا الأسبوع كان مذهلاً. كل مؤشر يقول إنكِ في أفضل حالاتكِ.',
    body: 'حصلتِ على {{xp_this_week}} XP (مقارنة بـ {{xp_prev_week}} الأسبوع الماضي). سلسلتكِ على {{streak}} يوم. أكملتِ {{dialogues}} محادثة و {{homework}} مجموعة تمارين. حفظتِ {{words_saved}} كلمة جديدة. حضورُكِ كامل.',
    closing: 'استمري على هذا الإيقاع — أسابيع كهذه هي اللي تصنع الفرق. أنا فخور بكِ. — د. علي',
  },
  // Up + strong streak (no attendance check)
  {
    shape: { xp_trend: 'up', streak_trend: 'strong' },
    priority: 90,
    title: 'صعود واضح هذا الأسبوع — {{student_name}}',
    intro: 'مرحبًا {{student_name}}، أسبوع جيد جداً والأرقام تشهد.',
    body: 'XP الأسبوع: {{xp_this_week}} (السابق: {{xp_prev_week}}). سلسلتكِ {{streak}} يوم. {{dialogues}} محادثة و {{homework}} مجموعة تمارين. {{words_saved}} كلمة جديدة.',
    closing: 'حافظي على الزخم — كل يوم يبني ثقتكِ. — د. علي',
  },
  // Up XP but new/broken streak
  {
    shape: { xp_trend: 'up', streak_trend: 'building' },
    priority: 80,
    title: 'تقدّم ملحوظ — {{student_name}}',
    intro: 'مرحبًا {{student_name}}، الجهد بدأ يثمر.',
    body: 'حصلتِ على {{xp_this_week}} XP (مقارنة بـ {{xp_prev_week}}). أكملتِ {{dialogues}} محادثة، {{homework}} مجموعة تمارين، وحفظتِ {{words_saved}} كلمة. سلسلتكِ {{streak}} يوم — هدف هذا الأسبوع: لا انقطاع.',
    closing: 'العمل اليومي البسيط أهم من الجهد الكبير المتقطّع. — د. علي',
  },
  // Flat — neither up nor down
  {
    shape: { xp_trend: 'flat' },
    priority: 60,
    title: 'استقرار هذا الأسبوع — {{student_name}}',
    intro: 'مرحبًا {{student_name}}، أسبوع متوازن.',
    body: 'XP الأسبوع: {{xp_this_week}}. أكملتِ {{dialogues}} محادثة و {{homework}} مجموعة تمارين. حفظتِ {{words_saved}} كلمة جديدة. سلسلتكِ {{streak}} يوم.',
    closing: 'الاستقرار جيد — جربي تضيفي تمرينين إضافيين الأسبوع القادم وشوفي الفرق. — د. علي',
  },
  // Down — needs gentle nudge
  {
    shape: { xp_trend: 'down' },
    priority: 70,
    title: 'أسبوع أهدأ — كل شي بخير {{student_name}}',
    intro: 'مرحبًا {{student_name}}، لاحظت أن هذا الأسبوع كان أبطأ من السابق.',
    body: 'XP الأسبوع: {{xp_this_week}} (السابق: {{xp_prev_week}}). {{dialogues}} محادثة، {{homework}} مجموعة تمارين، {{words_saved}} كلمة جديدة. سلسلتكِ {{streak}} يوم.',
    closing: 'الأسابيع تتفاوت — المهم نرجع للإيقاع. ابدئي بمحادثة قصيرة يوم الأحد. — د. علي',
  },
  // Broken streak warning
  {
    shape: { streak_trend: 'broken' },
    priority: 75,
    title: 'لنرجع للإيقاع — {{student_name}}',
    intro: 'مرحبًا {{student_name}}، سلسلتكِ انقطعت — لا بأس، نبدأ من جديد.',
    body: 'XP الأسبوع: {{xp_this_week}}. {{dialogues}} محادثة و {{homework}} مجموعة تمارين. {{words_saved}} كلمة جديدة. الأهم: يوم واحد بسيط يبدأ سلسلة جديدة.',
    closing: 'كل بطل وقع ورجع. أنا واثق فيكِ. — د. علي',
  },
  // Fallback (matches anything)
  {
    shape: {},
    priority: 10,
    title: 'تقريركِ الأسبوعي — {{student_name}}',
    intro: 'مرحبًا {{student_name}}، هذا تقريركِ لهذا الأسبوع.',
    body: 'XP الأسبوع: {{xp_this_week}}. {{dialogues}} محادثة. {{homework}} مجموعة تمارين. {{words_saved}} كلمة محفوظة. سلسلتكِ {{streak}} يوم.',
    closing: 'استمري على هذا. — د. علي',
  },
]

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const ref = process.env.BRANCH_REF
  if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and BRANCH_REF required')

  console.log(`Seeding ${TEMPLATES.length} report templates...`)
  for (const t of TEMPLATES) {
    const sql = `INSERT INTO retention_report_templates (shape_key, title_ar, intro_ar, body_ar, closing_ar, priority, active)
      VALUES (${jsonbVal(t.shape)}, ${esc(t.title)}, ${esc(t.intro)}, ${esc(t.body)}, ${esc(t.closing)}, ${t.priority}, true)`
    await call(token, ref, sql)
  }
  const summary = await call(token, ref, `SELECT count(*) FROM retention_report_templates`)
  console.log('Templates count:', summary)
})()
