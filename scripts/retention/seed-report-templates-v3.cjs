#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 Block 1 — extra 15 report templates to reach 80 total.
// Each is a NEW shape_key not in seed-report-templates-extra.cjs (v2).
// Quality bar: د. علي voice, slot-fills, honest weakness call-out, specific next-week ask.

const https = require('https')

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0,400)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
const esc = (s) => s == null ? 'NULL' : `$${'r'}$${s}$${'r'}$`
const jsonbVal = (v) => `${esc(JSON.stringify(v))}::jsonb`

const TEMPLATES = [
  // 1. Mistake-pattern pivot — student fixed a tagged weakness
  { shape: { mistake_pattern_pivot:true, xp_trend:'up' }, priority:86, title:'تجاوزتِ نقطة ضعف — {{student_name}}',
    intro:'مرحبًا {{student_name}}، الأسبوع هذا أنجزتِ تحولاً في نقطة كانت تتكرر معكِ.',
    body:'XP الأسبوع: {{xp_this_week}}. {{homework}} مجموعة تمارين. الملاحظ: الأخطاء التي كانت تتكرر معكِ السابق أقل بشكل واضح هذه المرة. هذا ليس صدفة — هذا أثر التركيز المتكرر على نفس النوع من التمارين. خصصي ٥ دقائق يومياً للنوع التالي من الأخطاء.',
    closing:'كل نقطة ضعف تنحل تفتح نافذة لطلاقة جديدة. — د. علي' },

  // 2. Saved many vocab words but no usage in dialogues
  { shape: { words_saved_band:'high', dialogues_band:'low' }, priority:42, title:'كلمات كثيرة محفوظة — لكن غير مستخدمة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حفظتِ {{words_saved}} كلمة جديدة — جهد جميل.',
    body:'XP الأسبوع: {{xp_this_week}}. لكن المحادثات قليلة ({{dialogues}}) — الكلمات بدون استخدام تنسى بسرعة. تحدّي الأسبوع الجاي: استخدمي ٣ كلمات من اللي حفظتيها في كل محادثة.',
    closing:'الكلمة تعيش في الاستخدام، تموت في الدفتر. — د. علي' },

  // 3. Comeback after 14-day silence
  { shape: { comeback_band:'medium', xp_trend:'up' }, priority:90, title:'رجوع جميل بعد أسبوعين — {{student_name}}',
    intro:'مرحبًا {{student_name}}، رجعتِ بعد غياب — وأنا فرحان بصدق.',
    body:'XP الأسبوع: {{xp_this_week}}. {{homework}} تمارين، {{dialogues}} محادثة. لا تستعجلي على نفسكِ هذا الأسبوع — هدف الأسبوع: ٣ أيام نشاط متتالية وبس. لو حقّقتيها، الباقي راح يأتي طبيعي.',
    closing:'الرجوع أقوى من البقاء بكثير من الأحيان. — د. علي' },

  // 4. Comeback after 30+ day silence
  { shape: { comeback_band:'long' }, priority:97, title:'مرحبًا من جديد — {{student_name}}',
    intro:'مرحبًا {{student_name}}، بعد غياب طويل — كل شيء بإذن الله يبدأ من جديد.',
    body:'XP الأسبوع: {{xp_this_week}}. لا تنظري لما فاتكِ — انظري لما بين يديكِ. التمارين والمحادثات والملخصات كلها بانتظاركِ، وأنا بانتظاركِ. هدف هذا الأسبوع البسيط: تمرين واحد كل يومين.',
    closing:'كل قصة طلاقة فيها فصل غياب. هذا فصل، ليس النهاية. — د. علي' },

  // 5. 14-day streak milestone
  { shape: { streak_band:'medium', streak_trend:'strong', encouragement:'milestone_14days' }, priority:93, title:'أسبوعان متتاليان — {{student_name}}',
    intro:'مرحبًا {{student_name}}، ١٤ يوماً متتالياً من النشاط — العبور لمنطقة العادة.',
    body:'XP الأسبوع: {{xp_this_week}}. سلسلتكِ {{streak}} يوم. ١٤ يوماً هي اللحظة العلمية اللي يصير فيها النشاط جزء من روتينكِ. ما عاد تفكري فيه — يصير تلقائي. أنتِ هنا الآن.',
    closing:'الأهم: لا تكسري سلسلة الأسبوعين. ٣٠ يوماً قريبة. — د. علي' },

  // 6. Group rank climber — moved up multiple ranks
  { shape: { group_rank_change:'climber_big' }, priority:85, title:'صعدتِ في ترتيب المجموعة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، قفزتِ في ترتيب المجموعة هذا الأسبوع.',
    body:'XP الأسبوع: {{xp_this_week}}. هذا القفز ما جاء من فراغ — جاء من الجهد المتواصل. زميلاتكِ في المجموعة لاحظنكِ. استمري على هذا الإيقاع راح تكوني في المقدمة بنهاية الشهر.',
    closing:'الترتيب ثمرة، النشاط هو الأصل. واصلي. — د. علي' },

  // 7. Quiet in chat but high XP
  { shape: { group_chat_band:'low', xp_band:'high' }, priority:50, title:'صامتة في المجموعة — قوية في العمل — {{student_name}}',
    intro:'مرحبًا {{student_name}}، نشاطكِ في التمارين عالٍ، لكنكِ هادئة في الدردشة.',
    body:'XP الأسبوع: {{xp_this_week}}. جهدكِ الفردي مرئي وأقدّره. لكن مشاركة المجموعة تضيف بعداً آخر — اطرحي سؤالاً، شاركي ملاحظة، شجّعي زميلة. ٥ دقائق في الدردشة الأسبوع الجاي تكفي.',
    closing:'الطلاقة تبنى مع الناس، لا في عزلة. — د. علي' },

  // 8. Brief opened + self-check correct
  { shape: { briefs_opened_band:'high', self_check_correct_rate:'high' }, priority:80, title:'تحضير ممتاز + إجابات صحيحة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، فتحتِ كل الملخصات وأجبتِ بشكل صحيح على معظم أسئلة المراجعة.',
    body:'XP الأسبوع: {{xp_this_week}}. التحضير + المراجعة الذاتية = الفهم العميق. هذا التركيب نادر، وأنتِ تحققينه. الكلاسات راح تكون أسهل بكثير لكِ من هنا فصاعداً.',
    closing:'الطالبة المتحضرة دائماً متقدّمة بخطوة. — د. علي' },

  // 9. Brief opened + self-check wrong
  { shape: { briefs_opened_band:'high', self_check_correct_rate:'low' }, priority:55, title:'تفتحين الملخصات — لكن أسئلة المراجعة تربككِ — {{student_name}}',
    intro:'مرحبًا {{student_name}}، فتحتِ الملخصات — حلو. لكن إجاباتكِ على أسئلة المراجعة كانت تحتاج تركيز أكبر.',
    body:'XP الأسبوع: {{xp_this_week}}. الحل: قبل ما تجيبي، اقرئي الجملة مرتين. خذي وقتكِ — أسئلة المراجعة ليست اختباراً، هي فرصة لتقوية الفهم.',
    closing:'التحضير الصحيح بطيء وعميق. واصلي. — د. علي' },

  // 10. High dialogue completion but low vocab utilization
  { shape: { dialogues_band:'high', vocab_utilization:'low' }, priority:54, title:'محادثات كثيرة — لكن المفردات الجديدة لم تظهر — {{student_name}}',
    intro:'مرحبًا {{student_name}}، {{dialogues}} محادثة هذا الأسبوع — رقم رائع.',
    body:'XP الأسبوع: {{xp_this_week}}. لكن المفردات الجديدة اللي حفظتيها لم تستخدميها في المحادثات. التحدّي: قبل كل محادثة، اختاري ٢ كلمة من قائمتكِ المحفوظة وحاولي تدخليها بطريقة طبيعية.',
    closing:'المفردات تظهر في الاستخدام أو تختفي. — د. علي' },

  // 11. Dialogue full-completion specialist
  { shape: { dialogues_band:'high', completion_rate:'high' }, priority:78, title:'تكملين المحادثات للنهاية — {{student_name}}',
    intro:'مرحبًا {{student_name}}، الملاحظ هذا الأسبوع: تكملين كل محادثة بدأتيها للنهاية.',
    body:'XP الأسبوع: {{xp_this_week}}. {{dialogues}} محادثة، كلها مكتملة. هذا أهم من العدد — يعني أن تركيزكِ كامل ومنتبه. الكثير يتركون المحادثة في المنتصف. أنتِ لا.',
    closing:'الالتزام بإنهاء ما بدأتيه عادة بطل. — د. علي' },

  // 12. Excellence week: full attendance + every brief + 5+ activities
  { shape: { excellence_week:true }, priority:99, title:'أسبوع الكمال — {{student_name}}',
    intro:'مرحبًا {{student_name}}، الأسبوع هذا كان شبه مثالي.',
    body:'XP: {{xp_this_week}}. حضوركِ كامل، كل الملخصات فتحتيها، {{dialogues}} محادثة، {{homework}} مجموعة تمارين، {{words_saved}} كلمة جديدة. هذا التوازن في كل المهارات نادر. لا أبالغ لو قلت أن هذا الأسبوع هو "أسبوع نموذجي" بحرفية الكلمة.',
    closing:'فخور بكِ بصدق. استمري — هذا اللي يصنع طلاقة حقيقية. — د. علي' },

  // 13. Recent exam/assessment passed
  { shape: { assessment_passed:true }, priority:88, title:'اختبار اجتزتيه — {{student_name}}',
    intro:'مرحبًا {{student_name}}، نجحتِ في اختبار هذا الأسبوع — مبارك.',
    body:'XP الأسبوع: {{xp_this_week}}. النجاح في الاختبار يعني أن الجهد المتراكم بدأ يثمر. لا تستهيني بهذه اللحظة — احتفظي بإحساس النجاح، هو وقود الأسابيع القادمة.',
    closing:'نجاح اليوم بذرة طلاقة الغد. — د. علي' },

  // 14. Recent assessment struggle
  { shape: { assessment_struggled:true }, priority:60, title:'اختبار صعب — لكن لكِ درس فيه — {{student_name}}',
    intro:'مرحبًا {{student_name}}، الاختبار هذا الأسبوع كان صعباً عليكِ — أعرف.',
    body:'XP الأسبوع: {{xp_this_week}}. لا تقاسي نفسكِ بالنتيجة — قاسي بالجهد. الأهم الآن: راجعي الأسئلة اللي أخطأتي فيها، حاولي تفهمي السبب. الأسبوع الجاي راح يكون أقوى لكِ، شرط واحد: لا تتوقفي.',
    closing:'الاختبار الصعب يبني، الاختبار السهل ينسى. — د. علي' },

  // 15. Returning from summer/seasonal break
  { shape: { encouragement:'after_summer_break' }, priority:91, title:'بعد إجازة الصيف — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أرجو أن الإجازة كانت ممتعة — والآن نبدأ من جديد.',
    body:'XP الأسبوع: {{xp_this_week}}. لا تتوقعي من نفسكِ النشاط القديم في الأسبوع الأول — العقل يحتاج تسخيناً. هدفي لكِ هذا الأسبوع: مراجعة قائمة الكلمات المحفوظة + محادثة واحدة. هذا كافٍ.',
    closing:'العودة الهادئة أنجح من الاندفاع. — د. علي' },
]

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) { console.error('Missing SUPABASE_ACCESS_TOKEN'); process.exit(1) }
  console.log(`Seeding ${TEMPLATES.length} v3 report templates...`)
  for (const ref of targets) {
    console.log(`\n--- target: ${ref} ---`)
    let inserted = 0, skipped = 0
    for (const t of TEMPLATES) {
      const titleEscaped = t.title.replace(/'/g, "''")
      const exists = await call(token, ref,
        `SELECT id FROM retention_report_templates WHERE title_ar = '${titleEscaped}' LIMIT 1`
      )
      if (Array.isArray(exists) && exists.length > 0) { skipped++; continue }
      const sql = `INSERT INTO retention_report_templates (shape_key, title_ar, intro_ar, body_ar, closing_ar, priority, active)
        VALUES (${jsonbVal(t.shape)}, ${esc(t.title)}, ${esc(t.intro)}, ${esc(t.body)}, ${esc(t.closing)}, ${t.priority}, true)`
      try { await call(token, ref, sql); inserted++ } catch (e) { console.error(`  FAIL [${t.title}]: ${e.message.slice(0,200)}`) }
    }
    const sum = await call(token, ref, 'SELECT count(*)::int as c FROM retention_report_templates')
    console.log(`  done — inserted: ${inserted}, skipped: ${skipped}, total: ${sum[0].c}`)
  }
})()
