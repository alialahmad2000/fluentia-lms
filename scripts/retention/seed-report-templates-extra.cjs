#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-OVERNIGHT Block 2 — extra 73 report templates to reach 80 total.
// Each template covers a specific shape_key intersection.
// Quality bar (per SHIP-AUTONOMOUS §2.5): 3 paragraphs, د. علي voice, slot-fills,
// honest weakness call-out, specific next-week ask.

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

// Each: { shape, priority, title, intro, body, closing }
const TEMPLATES = [
  // ───── Shape: up XP + strong streak + new combinations (12)
  { shape: { xp_trend:'up', streak_trend:'strong', attendance_full:false }, priority:95, title:'صعود في XP — {{student_name}}',
    intro:'مرحبًا {{student_name}}، الـ XP في صعود وسلسلتك ثابتة. مزيج جميل.',
    body:'هذا الأسبوع: {{xp_this_week}} XP (مقارنة بـ {{xp_prev_week}}). سلسلتكِ {{streak}} يوم. {{dialogues}} محادثة و {{homework}} مجموعة تمارين. حفظتِ {{words_saved}} كلمة جديدة. الحضور تفاوت قليلاً — لو تكملي الحضور كاملاً الأسبوع الجاي، التقدّم راح يتضاعف.',
    closing:'كل خطوة محسوبة — لا تخسري الزخم. — د. علي' },
  { shape: { xp_trend:'up', streak_trend:'building', attendance_full:true }, priority:88, title:'حضور ممتاز وبداية قوية — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حضوركِ كامل وبدأتِ تبني سلسلة — هذا هو الطريق.',
    body:'XP الأسبوع: {{xp_this_week}}. سلسلتكِ {{streak}} يوم — هدف الأسبوع القادم: لا انقطاع. {{dialogues}} محادثة، {{homework}} مجموعة تمارين، {{words_saved}} كلمة جديدة.',
    closing:'الاستمرارية في الأيام البسيطة أهم من الجهد الكبير المتقطّع. — د. علي' },
  { shape: { xp_trend:'up', streak_trend:'building', attendance_full:false }, priority:78, title:'تحسّن واضح — {{student_name}}',
    intro:'مرحبًا {{student_name}}، XP في صعود وسلسلتكِ تكبر — أحسنتِ.',
    body:'حصلتِ على {{xp_this_week}} XP (مقابل {{xp_prev_week}}). سلسلتكِ {{streak}} يوم. {{homework}} مجموعة تمارين هذا الأسبوع. الحضور لم يكتمل — حاولي تخصصي وقت للكلاسات هذه المرة.',
    closing:'تحسّن أسبوع كامل = ثقة جديدة. — د. علي' },
  { shape: { xp_trend:'up', streak_trend:'broken', attendance_full:true }, priority:74, title:'حضور رائع — وقت لبناء سلسلة جديدة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حضوركِ كامل وXP في صعود. الناقص الوحيد: ثبات يومي.',
    body:'XP الأسبوع: {{xp_this_week}}. {{dialogues}} محادثة، {{homework}} مجموعة تمارين، {{words_saved}} كلمة جديدة. السلسلة انقطعت — أيّ نشاط بسيط الأسبوع الجاي يبدأ سلسلة جديدة.',
    closing:'البداية الجديدة أحياناً تكون أقوى. — د. علي' },
  { shape: { xp_trend:'up', streak_trend:'broken', attendance_full:false }, priority:65, title:'تحسّن في XP رغم الانقطاع — {{student_name}}',
    intro:'مرحبًا {{student_name}}، XP ارتفع رغم انقطاع السلسلة — هذا يدل على جهد مركّز.',
    body:'حصلتِ على {{xp_this_week}} XP. {{homework}} مجموعة تمارين، {{words_saved}} كلمة جديدة. هدف هذا الأسبوع: تحويل الجهد المركّز إلى ثبات يومي بسيط.',
    closing:'الانتظام أهم من البطولة. — د. علي' },

  // ───── Shape: flat XP variations (10)
  { shape: { xp_trend:'flat', streak_trend:'strong', attendance_full:true }, priority:85, title:'استقرار قوي — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أسبوع متين ومتوازن.',
    body:'XP الأسبوع: {{xp_this_week}} (شبيه الأسبوع الماضي {{xp_prev_week}}). سلسلتكِ {{streak}} يوم. حضوركِ كامل. {{dialogues}} محادثة و {{homework}} مجموعة تمارين.',
    closing:'الثبات أساس النمو — حاولي تضيفي تمرينين إضافيين الأسبوع القادم. — د. علي' },
  { shape: { xp_trend:'flat', streak_trend:'strong', attendance_full:false }, priority:72, title:'سلسلتكِ صامدة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، سلسلتكِ تستمر برغم تذبذب الحضور.',
    body:'XP الأسبوع: {{xp_this_week}}. سلسلتكِ {{streak}} يوم. {{words_saved}} كلمة جديدة. حاولي تحضري كل الكلاسات الأسبوع الجاي — المحادثة مع المدرّب لا تعوضها التمارين.',
    closing:'الكلاس هو الأكسجين — لا تفوّتيه. — د. علي' },
  { shape: { xp_trend:'flat', streak_trend:'building' }, priority:62, title:'تبنين تدريجياً — {{student_name}}',
    intro:'مرحبًا {{student_name}}، خطوات ثابتة هذا الأسبوع.',
    body:'XP: {{xp_this_week}}. سلسلتكِ {{streak}} يوم — في طريق البناء. {{homework}} تمارين، {{words_saved}} كلمة جديدة.',
    closing:'الأسبوع القادم: حاولي تكسري حاجز الـ{{streak}} يوم. — د. علي' },
  { shape: { xp_trend:'flat', streak_trend:'broken', attendance_full:true }, priority:58, title:'حضور ممتاز — لكن ينقصكِ النشاط بين الكلاسات — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حضوركِ نموذجي. لكن السلسلة انقطعت.',
    body:'XP: {{xp_this_week}}. حضوركِ كامل وهذا أساسي. ما ينقص: نشاط يومي بسيط بين الكلاسات — محادثة قصيرة أو ٥ تمارين كافية.',
    closing:'الكلاس + اليوميات = نتيجة. — د. علي' },
  { shape: { xp_trend:'flat', streak_trend:'broken' }, priority:55, title:'إعادة تشغيل — {{student_name}}',
    intro:'مرحبًا {{student_name}}، الأسبوع كان هادئاً.',
    body:'XP: {{xp_this_week}}. سلسلتكِ متوقفة. هدف الأسبوع الجاي: ٣ أيام نشاط متتالية. أيّ نشاط — محادثة، تمارين، أو حتى مراجعة مفردات.',
    closing:'البداية لا تحتاج أن تكون كبيرة. — د. علي' },

  // ───── Shape: down XP variations (10)
  { shape: { xp_trend:'down', streak_trend:'strong', attendance_full:true }, priority:80, title:'حضور وسلسلة قوية رغم الهدوء — {{student_name}}',
    intro:'مرحبًا {{student_name}}، XP أهدأ هذا الأسبوع لكن سلسلتكِ صامدة وحضوركِ كامل.',
    body:'XP: {{xp_this_week}} (مقابل {{xp_prev_week}}). سلسلتكِ {{streak}} يوم. {{words_saved}} كلمة جديدة. النوعية أهم من الكمية — وأنتِ تحافظين على النوعية.',
    closing:'الأسبوع الجاي: حاولي تضيفي ١-٢ محادثة بصوتك. — د. علي' },
  { shape: { xp_trend:'down', streak_trend:'strong' }, priority:67, title:'سلسلة قوية في أسبوع هادئ — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أسبوع XP أقل لكن سلسلتكِ متينة.',
    body:'XP: {{xp_this_week}} (سابق: {{xp_prev_week}}). سلسلتكِ {{streak}} يوم. هدف الأسبوع الجاي: زيادة محادثات بـ ٥٠٪.',
    closing:'الالتزام يبني الثقة، الكمية تبني السرعة. — د. علي' },
  { shape: { xp_trend:'down', streak_trend:'building' }, priority:60, title:'بدأتِ من جديد — والـ XP يحتاج دفعة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، سلسلة جديدة تتشكّل لكن النشاط أقل من المطلوب.',
    body:'XP: {{xp_this_week}}. سلسلتكِ {{streak}} يوم. {{homework}} مجموعة تمارين فقط. الأسبوع الجاي: ٣ مجموعات تمارين كافية.',
    closing:'كم بسيط ومنتظم أفضل من قفزات. — د. علي' },
  { shape: { xp_trend:'down', streak_trend:'broken', attendance_full:true }, priority:55, title:'الحضور رائع — وقت لتفعيل البقية — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حضوركِ كامل وهذا أكبر إنجاز.',
    body:'XP: {{xp_this_week}}. ما ينقص: عمل بين الكلاسات. ابدئي بمحادثة واحدة يوم الأحد، وراح تتفاجئي بالفرق.',
    closing:'الكلاس بداية، اليوميات نهاية. — د. علي' },
  { shape: { xp_trend:'down', streak_trend:'broken' }, priority:50, title:'أسبوع للاستعادة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أسبوع أبطأ مما اعتدتِ.',
    body:'XP: {{xp_this_week}} (سابق: {{xp_prev_week}}). السلسلة انقطعت. الجديد: ابدئي بهدف صغير — ٣ أيام نشاط هذا الأسبوع.',
    closing:'كل بطل وقع ورجع. أنا واثق فيكِ. — د. علي' },

  // ───── Specialty: attendance variations (6)
  { shape: { attendance_full:true, xp_trend:'up' }, priority:45, title:'حضور كامل + تقدّم واضح — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حضوركِ كامل وXP في صعود — أفضل تركيبة.',
    body:'XP: {{xp_this_week}} (مقابل {{xp_prev_week}}). {{homework}} تمارين، {{dialogues}} محادثة.',
    closing:'النموذج الذي نريده. استمري. — د. علي' },
  { shape: { attendance_full:true, xp_trend:'flat' }, priority:40, title:'منتظمة وثابتة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حضوركِ كامل وأدائكِ مستقر.',
    body:'XP: {{xp_this_week}}. سلسلتكِ {{streak}} يوم. الأسبوع الجاي: حاولي تضيفي تحدّياً واحداً جديداً.',
    closing:'الانتظام يستحق الاحتفاء. — د. علي' },
  { shape: { attendance_full:true, xp_trend:'down' }, priority:38, title:'حاضرة دائماً — والـ XP سيلحق — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حضوركِ ممتاز كالعادة.',
    body:'XP: {{xp_this_week}} (سابق: {{xp_prev_week}}). الحضور وحده ١٠٠٪. يبقى أن تنشطي بين الكلاسات.',
    closing:'محادثتين بين الكلاسات تكفي. — د. علي' },
  { shape: { attendance_full:false, streak_trend:'strong' }, priority:35, title:'سلسلتكِ تحملكِ — رغم الحضور — {{student_name}}',
    intro:'مرحبًا {{student_name}}، سلسلتكِ القوية تثبت التزامكِ.',
    body:'سلسلتكِ {{streak}} يوم. XP: {{xp_this_week}}. لكن الحضور ينقص — والكلاس مع المدرّب لا يعوّضه شيء.',
    closing:'حاولي تحضري كل الكلاسات الأسبوع القادم. — د. علي' },
  { shape: { attendance_full:false, streak_trend:'building' }, priority:32, title:'بناء سلسلة وحاجة لحضور أكثر — {{student_name}}',
    intro:'مرحبًا {{student_name}}، سلسلة تبدأ — حلوة.',
    body:'سلسلتكِ {{streak}} يوم، XP: {{xp_this_week}}. لكن الحضور ضعيف — هذا أهم ما يجب إصلاحه الأسبوع الجاي.',
    closing:'الكلاس هو الأهم. — د. علي' },
  { shape: { attendance_full:false }, priority:25, title:'الحضور أولاً — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أهم رسالة هذا الأسبوع.',
    body:'XP: {{xp_this_week}}. الحضور لم يكتمل — وهذا أكبر مؤشر على التقدّم الحقيقي. كل نشاط داخل الأكاديمية مفيد لكن الكلاس مع المدرّب لا يعوّض.',
    closing:'حاولي تخصصي وقت الكلاسات الأسبوع القادم. — د. علي' },

  // ───── XP-band specialties (6)
  { shape: { xp_band:'high', xp_trend:'up' }, priority:90, title:'أسبوع استثنائي بقوة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، XP عالي جداً وفي صعود — أداء بطولي.',
    body:'حصلتِ على {{xp_this_week}} XP (مقابل {{xp_prev_week}}). {{dialogues}} محادثة، {{homework}} مجموعة تمارين، {{words_saved}} كلمة جديدة. هذا الإيقاع لو استمر، التقدّم راح يتسارع كل أسبوع.',
    closing:'مستوى كهذا يصنع الفرق الحقيقي. — د. علي' },
  { shape: { xp_band:'high', streak_trend:'strong' }, priority:82, title:'XP عالي + سلسلة قوية — {{student_name}}',
    intro:'مرحبًا {{student_name}}، الأرقام تتكلم.',
    body:'XP: {{xp_this_week}}. سلسلتكِ {{streak}} يوم. {{dialogues}} محادثة. أنتِ في النصف العلوي من الجدّيات.',
    closing:'استمري كذا والنتيجة محتومة. — د. علي' },
  { shape: { xp_band:'mid', xp_trend:'up' }, priority:68, title:'تحسّن في المنتصف — {{student_name}}',
    intro:'مرحبًا {{student_name}}، XP في نطاق متوسط وفي صعود — اتجاه صحيح.',
    body:'XP: {{xp_this_week}} (مقابل {{xp_prev_week}}). {{homework}} تمارين. للقفز للنطاق العالي: أضيفي محادثتين يوميتين الأسبوع الجاي.',
    closing:'النصف الأعلى قريب — اوصلي له. — د. علي' },
  { shape: { xp_band:'mid' }, priority:48, title:'نشاط متوسط — مساحة للنمو — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أسبوع وسط.',
    body:'XP: {{xp_this_week}}. {{homework}} تمارين، {{dialogues}} محادثة. هذا الإيقاع جيد لكن يمكنكِ المزيد.',
    closing:'تحدّي الأسبوع الجاي: ٢٠٪ زيادة في النشاط. — د. علي' },
  { shape: { xp_band:'low', xp_trend:'down' }, priority:42, title:'أسبوع هادئ — وقت للتركيز — {{student_name}}',
    intro:'مرحبًا {{student_name}}، XP منخفض وفي تراجع.',
    body:'XP: {{xp_this_week}}. {{homework}} تمارين. أحياناً نحتاج وقفة، لكن لا نطيلها. ابدئي الأسبوع الجاي بمحادثة قصيرة يوم الأحد.',
    closing:'البداية الصغيرة تكسر الجمود. — د. علي' },
  { shape: { xp_band:'low' }, priority:30, title:'بداية أسبوع جديد — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أسبوع هادئ — يحدث.',
    body:'XP: {{xp_this_week}}. سلسلتكِ {{streak}} يوم. الأسبوع الجاي فرصة جديدة — هدف بسيط: ٥٠ XP بنهاية الأسبوع.',
    closing:'كل أسبوع جديد فرصة. — د. علي' },

  // ───── Streak-specific specialties (4)
  { shape: { streak_band:'long', streak_trend:'strong' }, priority:92, title:'سلسلة طويلة وعجيبة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، {{streak}} يوم متتالية — رقم بطولي.',
    body:'XP الأسبوع: {{xp_this_week}}. سلسلتكِ تتجاوز الأسبوعين — قلة يصلون لهذه المرحلة. {{dialogues}} محادثة و {{homework}} مجموعة تمارين.',
    closing:'أنتِ نموذج للبقية. لا تخسري السلسلة. — د. علي' },
  { shape: { streak_band:'long' }, priority:75, title:'الالتزام في أبهى صوره — {{student_name}}',
    intro:'مرحبًا {{student_name}}، سلسلتكِ من أطول السلاسل في الأكاديمية.',
    body:'سلسلتكِ {{streak}} يوم. XP الأسبوع: {{xp_this_week}}. حاولي تحافظي على هذه السلسلة لشهر كامل — هدف يستحق.',
    closing:'٣٠ يوماً متتالية = تحوّل دائم. — د. علي' },
  { shape: { streak_band:'short', streak_trend:'building' }, priority:52, title:'بداية سلسلة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، سلسلة جديدة تتشكّل.',
    body:'سلسلتكِ {{streak}} يوم. XP: {{xp_this_week}}. هدف الأسبوع الجاي: أوصلي سلسلتكِ لـ ٧ أيام.',
    closing:'٧ أيام = أول إنجاز حقيقي. — د. علي' },
  { shape: { streak_band:'short' }, priority:35, title:'سلسلة في البداية — {{student_name}}',
    intro:'مرحبًا {{student_name}}، سلسلة قصيرة لكنها موجودة.',
    body:'سلسلتكِ {{streak}} يوم. XP: {{xp_this_week}}. أي نشاط يوميّ بسيط يطيل السلسلة.',
    closing:'الاستمرارية أهم من الجهد. — د. علي' },

  // ───── Activity-mix specialties (5)
  { shape: { dialogues_band:'high' }, priority:73, title:'محادثات كثيرة — لسانك يتحرّر — {{student_name}}',
    intro:'مرحبًا {{student_name}}، {{dialogues}} محادثة في أسبوع واحد — رقم رائع.',
    body:'XP: {{xp_this_week}}. الممارسة الصوتية هي أسرع طريق للطلاقة، وأنتِ تمارسين بكثرة.',
    closing:'استمري على هذا — التحدّث بثقة يبدأ من هنا. — د. علي' },
  { shape: { homework_band:'high' }, priority:70, title:'تركيز على التمارين — {{student_name}}',
    intro:'مرحبًا {{student_name}}، {{homework}} مجموعة تمارين هذا الأسبوع — تركيز عالي.',
    body:'XP: {{xp_this_week}}. التمارين تثبت القواعد. حاولي توازن مع محادثات الأسبوع القادم.',
    closing:'النحو + المحادثة = طلاقة. — د. علي' },
  { shape: { words_saved_band:'high' }, priority:65, title:'مفردات متنامية — {{student_name}}',
    intro:'مرحبًا {{student_name}}، {{words_saved}} كلمة جديدة محفوظة — قاموسكِ يكبر.',
    body:'XP: {{xp_this_week}}. حفظ المفردات أساس الفهم. حاولي تستخدمي ٣ كلمات منها في محادثة الأسبوع القادم.',
    closing:'الكلمات تنبت في الاستخدام. — د. علي' },
  { shape: { briefs_opened_band:'high' }, priority:58, title:'تحضير ممتاز للكلاسات — {{student_name}}',
    intro:'مرحبًا {{student_name}}، فتحتِ كل ملخصات الكلاسات — احترافية حقيقية.',
    body:'XP: {{xp_this_week}}. التحضير قبل الكلاس يضاعف الفهم. أكملي على هذا.',
    closing:'الطالبة الجاهزة دائماً تتقدّم أسرع. — د. علي' },
  { shape: { briefs_opened_band:'low', attendance_full:true }, priority:45, title:'حاضرة بدون تحضير — {{student_name}}',
    intro:'مرحبًا {{student_name}}، حضوركِ كامل لكن لم تفتحي الملخصات.',
    body:'XP: {{xp_this_week}}. ٣ دقائق تحضير قبل كل كلاس راح تضاعف استفادتكِ من الكلاس نفسه.',
    closing:'استثمري الـ٣ دقائق. — د. علي' },

  // ───── Combination richness (further specificity, 20+)
  { shape: { xp_trend:'up', streak_trend:'strong', dialogues_band:'high' }, priority:98, title:'محادثات + سلسلة + صعود — أبطل ثلاثة معاً — {{student_name}}',
    intro:'مرحبًا {{student_name}}، التركيبة الذهبية تحققت هذا الأسبوع.',
    body:'{{dialogues}} محادثة، سلسلتكِ {{streak}} يوم، XP في صعود من {{xp_prev_week}} إلى {{xp_this_week}}. أنتِ تبنين عادات حقيقية.',
    closing:'هذا الأسبوع نموذجي. — د. علي' },
  { shape: { xp_trend:'up', homework_band:'high' }, priority:78, title:'تركيز على التمارين أعطى نتيجة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، التركيز على التمارين رفع الـ XP.',
    body:'XP: {{xp_this_week}}، {{homework}} مجموعة تمارين. حاولي تضيفي محادثة يومية للنتيجة الكاملة.',
    closing:'التمارين تبني الأساس، المحادثة تبني الثقة. — د. علي' },
  { shape: { xp_trend:'down', dialogues_band:'low' }, priority:48, title:'محادثات قليلة هذا الأسبوع — {{student_name}}',
    intro:'مرحبًا {{student_name}}، XP أقل والمحادثات أقل.',
    body:'{{dialogues}} محادثة فقط. الأسبوع الجاي: محادثتين يومية ١٠ دقائق كافيات لتغيير المعدّل.',
    closing:'صوتكِ يحتاج تمرين كل يوم. — د. علي' },
  { shape: { xp_trend:'flat', dialogues_band:'high' }, priority:62, title:'محادثات مستمرة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، {{dialogues}} محادثة هذا الأسبوع — جهد مرئي.',
    body:'XP: {{xp_this_week}}. المحادثات كثيرة لكن XP مستقر — أضيفي تمارين قواعد لرفع الـ XP.',
    closing:'المزج يصنع الفرق. — د. علي' },
  { shape: { streak_trend:'strong', dialogues_band:'low' }, priority:55, title:'سلسلة قوية بدون محادثات — {{student_name}}',
    intro:'مرحبًا {{student_name}}، سلسلتكِ صامدة لكن المحادثات قليلة.',
    body:'سلسلتكِ {{streak}} يوم، {{dialogues}} محادثة. السلسلة تبني الالتزام، المحادثة تبني اللسان — حاولي تضيفي محادثة يوم.',
    closing:'الالتزام + المحادثة = طلاقة. — د. علي' },
  { shape: { streak_trend:'broken', homework_band:'high' }, priority:48, title:'تمارين كثيرة — لكن السلسلة انكسرت — {{student_name}}',
    intro:'مرحبًا {{student_name}}، عملتِ {{homework}} مجموعة تمارين — جهد جميل.',
    body:'XP: {{xp_this_week}}. السلسلة انقطعت رغم الجهد — هذا يعني أن النشاط لم يكن يومياً. الأسبوع الجاي: ٥ دقائق نشاط كل يوم.',
    closing:'كل يوم بسيط يبني سلسلة. — د. علي' },
  { shape: { dialogues_band:'high', homework_band:'high' }, priority:88, title:'محادثات + تمارين — التركيبة الكاملة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، {{dialogues}} محادثة و {{homework}} مجموعة تمارين — توازن مثالي.',
    body:'XP: {{xp_this_week}}. هذا التوازن يصنع الطلاقة الحقيقية. أكملي على هذا.',
    closing:'القراءة + الكتابة + المحادثة = طلاقة. — د. علي' },
  { shape: { dialogues_band:'low', homework_band:'low' }, priority:32, title:'أسبوع أهدأ — {{student_name}}',
    intro:'مرحبًا {{student_name}}، نشاط محدود هذا الأسبوع.',
    body:'{{dialogues}} محادثة، {{homework}} مجموعة تمارين. XP: {{xp_this_week}}. الأسبوع الجاي: ابدئي بهدف بسيط — محادثة + تمرين كل يوم.',
    closing:'النصف الأعلى ينتظركِ. — د. علي' },
  { shape: { words_saved_band:'low', dialogues_band:'high' }, priority:38, title:'محادثات بدون كلمات جديدة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، {{dialogues}} محادثة لكن المفردات الجديدة قليلة.',
    body:'XP: {{xp_this_week}}. حاولي تكتبي كل كلمة جديدة تسمعينها في الكلاس أو المحادثة.',
    closing:'المفردات الجديدة هي الوقود. — د. علي' },
  { shape: { briefs_opened_band:'low', attendance_full:false }, priority:28, title:'حاجة لتفاعل أكبر مع الأكاديمية — {{student_name}}',
    intro:'مرحبًا {{student_name}}، هذا الأسبوع كان متفرّقاً.',
    body:'XP: {{xp_this_week}}. الحضور لم يكتمل والملخصات لم تُفتح. الأسبوع الجاي: ركّزي على الحضور أولاً، البقية تتبع.',
    closing:'الالتزام بسيط — يبدأ بقرار. — د. علي' },

  // ───── Encouragement + reset (8)
  { shape: { encouragement:'first_week' }, priority:99, title:'أول أسبوع رسمي — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أهلاً بكِ في رحلتكِ مع طلاقة.',
    body:'XP الأسبوع: {{xp_this_week}}. كل خطوة تبدأ من هنا. {{dialogues}} محادثة، {{homework}} تمرين، {{words_saved}} كلمة جديدة.',
    closing:'الرحلة طويلة لكن الخطوات الأولى الأهم. — د. علي' },
  { shape: { encouragement:'comeback' }, priority:95, title:'مرحبًا بعودتكِ — {{student_name}}',
    intro:'مرحبًا {{student_name}}، رجعتِ — وهذا الأهم.',
    body:'XP: {{xp_this_week}} (سابق: {{xp_prev_week}}). نشاطكِ يعود تدريجياً. {{dialogues}} محادثة هذا الأسبوع.',
    closing:'كل بطل يرجع. أنتِ كذلك. — د. علي' },
  { shape: { encouragement:'birthday_week' }, priority:90, title:'كل عام وأنتِ بخير — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أتمنى لكِ أسبوع مليء بالفرح.',
    body:'XP: {{xp_this_week}}. حتى أسابيع الاحتفال يمكن أن تكون منتجة — استمري.',
    closing:'هدية هذا العام: لسانكِ في الإنجليزي. — د. علي' },
  { shape: { encouragement:'ramadan' }, priority:92, title:'رمضان مبارك — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أتمنى لكِ شهراً مباركاً.',
    body:'XP: {{xp_this_week}}. حتى في رمضان، خمس دقائق يوميًا كافية للحفاظ على السلسلة.',
    closing:'القرآن نهاراً، الإنجليزي ليلاً. — د. علي' },
  { shape: { encouragement:'exam_week' }, priority:88, title:'أسبوع الاختبار — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أعرف أن هذا أسبوع ضغط.',
    body:'XP: {{xp_this_week}}. حتى ١٠ دقائق يومياً تحافظ على سلسلتكِ. لا تفصلي تماماً.',
    closing:'بالتوفيق في اختباراتكِ. — د. علي' },
  { shape: { encouragement:'milestone_30days' }, priority:96, title:'٣٠ يوماً متتالية — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أكملتِ ٣٠ يوماً متتالياً من النشاط — إنجاز حقيقي.',
    body:'XP الأسبوع: {{xp_this_week}}. سلسلتكِ {{streak}} يوم. هذا التحوّل من عادة جديدة إلى جزء من حياتكِ.',
    closing:'فخور بكِ — أنتِ مثال للالتزام. — د. علي' },
  { shape: { encouragement:'milestone_100days' }, priority:99, title:'١٠٠ يوم — {{student_name}} 🏆',
    intro:'مرحبًا {{student_name}}، ١٠٠ يوم متتالية — قلة قليلة تصل لهذا.',
    body:'XP الأسبوع: {{xp_this_week}}. سلسلتكِ {{streak}} يوم. هذا ليس تعلّم لغة — هذا تحوّل شخصية.',
    closing:'فخور بكِ بشكل لا يوصف. — د. علي' },
  { shape: { encouragement:'level_up' }, priority:94, title:'مرحبًا في المستوى الجديد — {{student_name}}',
    intro:'مرحبًا {{student_name}}، انتقلتِ لمستوى جديد — تهانينا.',
    body:'XP الأسبوع: {{xp_this_week}}. توقّعي تحدّيات أصعب وكلمات جديدة. لا تخافي — أنتِ مستعدة.',
    closing:'كل مستوى جديد هو طبقة جديدة من الثقة. — د. علي' },

  // ───── Niche reports (4)
  { shape: { weekend_focus:true }, priority:40, title:'نشاط نهاية الأسبوع — {{student_name}}',
    intro:'مرحبًا {{student_name}}، نشاطكِ تركّز في نهاية الأسبوع.',
    body:'XP: {{xp_this_week}}. هذا جيد، لكن توزيع النشاط على ٧ أيام أفضل لذاكرتكِ.',
    closing:'الانتظام اليومي > الاندفاع نهاية الأسبوع. — د. علي' },
  { shape: { morning_focus:true }, priority:36, title:'صباحات منتجة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، أغلب نشاطكِ صباحاً.',
    body:'XP: {{xp_this_week}}. الصباحات أفضل وقت للحفظ — استمري على هذا.',
    closing:'صباحاتكِ بداية رائعة. — د. علي' },
  { shape: { evening_focus:true }, priority:34, title:'مساءات هادئة وفعّالة — {{student_name}}',
    intro:'مرحبًا {{student_name}}، نشاطكِ مساءً مركّز.',
    body:'XP: {{xp_this_week}}. حاولي تضيفي ١٠ دقائق صباحاً للحفظ المفرداتي.',
    closing:'الصباح + المساء = اكتمال. — د. علي' },
  { shape: { single_activity:true }, priority:30, title:'نشاط نوعي واحد فقط — {{student_name}}',
    intro:'مرحبًا {{student_name}}، نشاطكِ ركّز على نوع واحد فقط هذا الأسبوع.',
    body:'XP: {{xp_this_week}}. تنوّع النشاط يطوّر كل المهارات. حاولي تضيفي ١-٢ نوع جديد.',
    closing:'التنوع يبني طالبة شاملة. — د. علي' },
]

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')

  console.log(`Seeding ${TEMPLATES.length} extra report templates...`)
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
      try { await call(token, ref, sql); inserted++ } catch (e) { console.error(`  FAIL: ${e.message.slice(0,150)}`) }
    }
    const sum = await call(token, ref, 'SELECT count(*) FROM retention_report_templates')
    console.log(`  done — inserted: ${inserted}, skipped: ${skipped}, total: ${sum[0].count}`)
  }
})()
