#!/usr/bin/env node
// Seed the "IT & Infrastructure" individual-track specialization + 10 mission modules.
// Mirrors scripts/seed-marketing-track.cjs exactly (structure, upsert, Management-API write path).
// Idempotent: upserts by slug / (specialization_id, module_number). Safe to re-run.
// Usage: node scripts/seed-it-track.cjs
const fs = require('fs')
const path = require('path')

const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'
function readToken() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('No sbp_ token found in .mcp.json')
  return m[0]
}
async function runSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${readToken()}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`)
  try { return JSON.parse(text) } catch { return text }
}
const DQ = (s) => `$sit$${s}$sit$`
const JQ = (o) => `${DQ(JSON.stringify(o))}::jsonb`

const SPEC = {
  slug: 'it_infrastructure',
  title_ar: 'تقنية المعلومات والبنية التحتية',
  title_en: 'IT & Infrastructure',
  tagline_ar: 'إنجليزية العمل لمحلّلي البنية التقنية — شرح الأعطال، إدارة الحوادث، والتواصل مع فِرَق الدعم على المكالمات',
  icon: 'Server',
  accent_color: '#a855f7',
}

// Anti-freeze scaffold woven through every roleplay: Context → Symptom → Impact → What I've checked → What I need.
const MODULES = [
  {
    module_number: 1,
    title_ar: 'شرح انقطاع الخدمة على مكالمة',
    title_en: 'Explaining an Outage on a Call',
    estimated_minutes: 25,
    scenario_ar: 'الساعة ٩:١٤ صباحاً، وخدمة الدفع وقعت فجأة. مدير المناوبة على المكالمة ينتظر منكِ صورة واضحة بأسرع وقت: وش صار، مين تأثّر، ومتى ترجع. هدوءك ووضوحك هنا هما اللي يهدّئون الغرفة.',
    scenario_en: 'It is 09:14 and the payment service just went down. The shift lead is on the call and needs a clear picture fast: what happened, who is affected, when it comes back. Your calm and clarity settle the room.',
    objectives: [
      { ar: 'وصف انقطاع خدمة بالترتيب: وش صار، متى بدأ، مين تأثّر، ومتى رجع', en: 'Describe an outage in order: what happened, when it started, who was affected, when it recovered' },
      { ar: 'شرح الأثر بالأرقام بوضوح يتابعه مستمع غير تقني', en: 'State the impact in numbers, clearly enough for a non-technical listener' },
      { ar: 'فتح المكالمة والانتقال بثقة (Let me walk you through it)', en: 'Open and transition on a call with confidence' },
    ],
    vocabulary: [
      { term: 'server', pos: 'noun', ar: 'الخادم', def_en: 'a computer that provides data or services to others', example: 'The main server went down at 09:14.', example_ar: 'توقّف الخادم الرئيسي الساعة ٩:١٤.' },
      { term: 'outage', pos: 'noun', ar: 'انقطاع الخدمة', def_en: 'a period when a service or system is not working', example: 'The engineer confirmed a full outage of the payment service.', example_ar: 'أكّد المهندس انقطاعاً كاملاً لخدمة الدفع.' },
      { term: 'downtime', pos: 'noun', ar: 'مدة توقّف الخدمة', def_en: 'the length of time a service is unavailable', example: 'The total downtime was twenty-seven minutes.', example_ar: 'بلغت مدة التوقّف ٢٧ دقيقة.' },
      { term: 'impact', pos: 'noun', ar: 'الأثر / التأثير', def_en: 'the effect something has on users or the business', example: 'The impact was larger because it was peak hours.', example_ar: 'كان الأثر أكبر لأنها ساعات ذروة.' },
      { term: 'affected users', pos: 'noun phrase', ar: 'المستخدمون المتأثّرون', def_en: 'the people who could not use the service', example: 'Affected users could not complete their orders.', example_ar: 'لم يتمكّن المستخدمون المتأثّرون من إتمام طلباتهم.' },
      { term: 'restore', pos: 'verb', ar: 'يستعيد / يُعيد الخدمة', def_en: 'to bring a service back to normal', example: 'We restored the service by moving traffic to a backup server.', example_ar: 'استعدنا الخدمة بنقل الحركة إلى خادم احتياطي.' },
      { term: 'peak hours', pos: 'noun phrase', ar: 'ساعات الذروة', def_en: 'the busiest time of day for a service', example: 'The outage happened during peak hours.', example_ar: 'وقع الانقطاع في ساعات الذروة.' },
    ],
    phrases: [
      { en: 'Let me walk you through it.', ar: 'خلّيني أوضّح لك الصورة خطوة بخطوة.', context_ar: 'افتتاحية تهدّئ وتفتح الشرح' },
      { en: "So what's happening is…", ar: 'اللي صاير هو…', context_ar: 'للانتقال إلى العَرَض' },
      { en: 'The impact is…', ar: 'الأثر هو…', context_ar: 'لتقديم الأثر بالأرقام' },
      { en: 'The service went down at…', ar: 'توقّفت الخدمة الساعة…', context_ar: 'لتحديد وقت البدء' },
      { en: "We've restored it, but…", ar: 'استعدناها، لكن…', context_ar: 'لذكر الحالة الحالية والتحفّظ' },
      { en: 'What I need from you is…', ar: 'اللي أحتاجه منك هو…', context_ar: 'لإغلاق المكالمة بطلب واضح' },
    ],
    roleplay: {
      title_en: 'Reporting a live outage to the shift lead',
      ai_role: "You are 'Mark', the calm-but-pressed shift lead on the support desk, on a call during a live payment outage. You need a clear picture fast. Ask one question at a time — what happened, who is affected, what she has checked, and what she needs. If she gives vague detail, ask for numbers or a time.",
      student_role: 'You are the infrastructure analyst reporting the outage you are handling.',
      setting_ar: 'مكالمة أثناء انقطاع مباشر لخدمة الدفع مع مدير المناوبة',
      prompt_en: 'Walk the shift lead through the outage using the scaffold: Context (what system, when) → Symptom → Impact (who/how many) → What you have checked → What you need.',
      prompt_ar: 'امشّي مدير المناوبة خلال الانقطاع بالقالب: السياق ← العَرَض ← الأثر (بالأرقام) ← وش فحصتِ ← وش تحتاجين.',
      useful_phrases: ['Let me walk you through it.', 'The service went down at…', 'The impact is…', 'What I need from you is…'],
    },
    writing_task: {
      title_ar: 'تحديث سريع على القناة',
      prompt_en: 'Write a 2–3 sentence status message for the incident channel: what is down, the impact so far, and the current status. Clear and factual.',
      prompt_ar: 'اكتبي رسالة تحديث من ٢–٣ جُمَل لقناة الحادثة: وش المتوقّف، الأثر حتى الآن، والحالة الحالية.',
      min_words: 25, max_words: 70,
      hints: ['ابدئي بالخدمة المتأثرة ووقت البدء', 'اذكري الأثر بالأرقام', 'اختمي بالحالة: قيد المعالجة / تمت الاستعادة'],
    },
  },
  {
    module_number: 2,
    title_ar: 'وصف مشكلة متقطّعة',
    title_en: 'Describing an Intermittent Issue',
    estimated_minutes: 25,
    scenario_ar: 'مستخدمون قلائل يبلّغون عن لوحة تقارير تتجمّد أحياناً وترجع لحالها. المشكلة متقطّعة، وما تقدرين تعيدين إنتاجها كل مرة. زميلتك المهندسة متشكّكة لأنها ما شافتها. لازم توصفينها بدقّة تقنعها.',
    scenario_en: 'A few users report the reporting dashboard occasionally freezes and recovers on its own. It is intermittent — you cannot reproduce it every time. A skeptical engineer has not seen it. You need to describe it precisely enough to be believed.',
    objectives: [
      { ar: 'وصف مشكلة متقطّعة بدقّة: متى تحدث عادةً وكم مرّة وتحت أي ظروف', en: 'Describe an intermittent issue precisely: when, how often, under what conditions' },
      { ar: 'التفريق بوضوح بين «متقطّع» و«دائم»', en: 'Clearly distinguish intermittent from constant' },
      { ar: 'طمأنة الفريق بأنكِ حاولتِ إعادة الإنتاج وشرح النتيجة', en: 'Reassure the team you tried to reproduce it and explain the result' },
    ],
    vocabulary: [
      { term: 'intermittent', pos: 'adjective', ar: 'متقطّع', def_en: 'happening sometimes, not constantly', example: 'The problem is intermittent, not constant.', example_ar: 'المشكلة متقطّعة، مو دائمة.' },
      { term: 'timeout', pos: 'noun', ar: 'انتهاء المهلة', def_en: 'when a request takes too long and stops', example: 'The dashboard returns a timeout error under heavy load.', example_ar: 'تُظهر اللوحة خطأ انتهاء المهلة عند الضغط العالي.' },
      { term: 'latency', pos: 'noun', ar: 'زمن الاستجابة / التأخير', def_en: 'the delay before a system responds', example: 'Monitoring shows a small latency spike at 2 p.m.', example_ar: 'تُظهر المراقبة ارتفاعاً بسيطاً في زمن الاستجابة الساعة ٢.' },
      { term: 'reproduce', pos: 'verb', ar: 'يعيد إنتاج المشكلة', def_en: 'to make a problem happen again on purpose', example: 'We cannot always reproduce it in the test environment.', example_ar: 'ما نقدر دائماً نعيد إنتاجها في بيئة الاختبار.' },
      { term: 'monitoring', pos: 'noun', ar: 'المراقبة', def_en: 'tools that watch a system for problems', example: 'Our monitoring tools picked up the spike.', example_ar: 'التقطت أدوات المراقبة الارتفاع.' },
      { term: 'spike', pos: 'noun', ar: 'ارتفاع مفاجئ', def_en: 'a sudden, short increase', example: 'There was a latency spike during busy hours.', example_ar: 'كان فيه ارتفاع مفاجئ في التأخير وقت الازدحام.' },
      { term: 'occasionally', pos: 'adverb', ar: 'أحياناً / بين الحين والآخر', def_en: 'sometimes but not often', example: 'The dashboard occasionally freezes for a few seconds.', example_ar: 'تتجمّد اللوحة أحياناً لثوانٍ.' },
    ],
    phrases: [
      { en: "It's intermittent, not constant.", ar: 'إنها متقطّعة، مو دائمة.', context_ar: 'الجملة المفتاحية لوصف السلوك' },
      { en: 'It usually happens when…', ar: 'عادةً تصير لمّا…', context_ar: 'لإعطاء النمط والظروف' },
      { en: "I can't always reproduce it.", ar: 'ما أقدر دائماً أعيد إنتاجها.', context_ar: 'للأمانة حول صعوبة التكرار' },
      { en: 'Monitoring shows a spike around…', ar: 'المراقبة تُظهر ارتفاعاً حوالي…', context_ar: 'لدعم الوصف ببيانات' },
      { en: 'It occasionally returns a timeout.', ar: 'أحياناً تُرجع خطأ انتهاء مهلة.', context_ar: 'لوصف العَرَض بدقّة' },
      { en: 'Not on every visit — only under load.', ar: 'مو في كل مرة — بس تحت الضغط.', context_ar: 'لتحديد الشرط بدقّة' },
    ],
    roleplay: {
      title_en: 'Convincing a skeptical engineer of an intermittent bug',
      ai_role: "You are 'Priya', a senior engineer on the team. You are skeptical about a 'flaky dashboard' report because you cannot reproduce it. Push gently but persistently for specifics: exactly when, how often, under what load, and whether she reproduced it. Warm up once she gives precise, honest detail.",
      student_role: 'You are the analyst who has been tracking the intermittent issue.',
      setting_ar: 'نقاش تقني مع مهندسة متشكّكة حول مشكلة متقطّعة',
      prompt_en: 'Describe the intermittent issue: make clear it is not constant, give the pattern (when/how often/conditions), and say what you tried to reproduce it.',
      prompt_ar: 'صفي المشكلة المتقطّعة: وضّحي أنها ليست دائمة، أعطي النمط، واذكري محاولتك لإعادة إنتاجها.',
      useful_phrases: ["It's intermittent, not constant.", 'It usually happens when…', "I can't always reproduce it.", 'Monitoring shows a spike around…'],
    },
    writing_task: {
      title_ar: 'ملاحظة على التذكرة',
      prompt_en: 'Write a short ticket note describing the intermittent issue for the next engineer: symptom, when it happens, frequency, and reproduction status.',
      prompt_ar: 'اكتبي ملاحظة قصيرة على التذكرة تصف المشكلة المتقطّعة للمهندس التالي: العَرَض، متى تحدث، كم مرّة، وحالة إعادة الإنتاج.',
      min_words: 30, max_words: 80,
      hints: ['ابدئي بـ Intermittent: …', 'اذكري الشرط: only under load / around 2 p.m.', 'اختمي بـ Repro: not consistent'],
    },
  },
  {
    module_number: 3,
    title_ar: 'المرور خلال تحليل السبب الجذري',
    title_en: 'Walking Through Root-Cause Analysis',
    estimated_minutes: 25,
    scenario_ar: 'انتهت الحادثة، وفي جلسة المراجعة يبي الفريق يفهم كيف وصلتِ للسبب الجذري — خطوة خطوة. طريقة سردك للتحقيق تبيّن تفكيرك المنهجي وترفع ثقتهم فيك.',
    scenario_en: 'The incident is over, and in the review the team wants to understand how you found the root cause — step by step. How you narrate the investigation shows methodical thinking and builds their trust.',
    objectives: [
      { ar: 'شرح تحقيق تقني بالترتيب (first, then, so)', en: 'Narrate a technical investigation in order (first, then, so)' },
      { ar: 'التفريق بين العَرَض والسبب الجذري', en: 'Separate the symptom from the root cause' },
      { ar: 'وصف ما تم فحصه واستبعاده قبل الوصول للسبب', en: 'Describe what was checked and ruled out before the cause' },
    ],
    vocabulary: [
      { term: 'root cause', pos: 'noun phrase', ar: 'السبب الجذري', def_en: 'the real underlying reason a problem happened', example: "We're still investigating the root cause.", example_ar: 'ما زلنا نحقّق في السبب الجذري.' },
      { term: 'configuration', pos: 'noun', ar: 'الإعدادات / التهيئة', def_en: 'the settings that control how a system runs', example: 'The issue was a wrong configuration value.', example_ar: 'كانت المشكلة قيمة إعداد خاطئة.' },
      { term: 'threshold', pos: 'noun', ar: 'الحدّ / العتبة', def_en: 'a limit that triggers an action when crossed', example: 'A memory threshold had been set too low.', example_ar: 'كان حد الذاكرة مضبوطاً منخفضاً جداً.' },
      { term: 'mitigate', pos: 'verb', ar: 'يخفّف / يحتوي', def_en: 'to reduce or ease a problem', example: 'We raised the limit to mitigate the problem.', example_ar: 'رفعنا الحد لتخفيف المشكلة.' },
      { term: 'workaround', pos: 'noun', ar: 'حل مؤقّت', def_en: 'a temporary fix that avoids the problem', example: 'For now, there is a workaround.', example_ar: 'حالياً فيه حل مؤقّت.' },
      { term: 'trace', pos: 'verb', ar: 'يتتبّع', def_en: 'to follow a problem back to its source', example: 'We traced it to a caching change.', example_ar: 'تتبّعناها إلى تغيير في التخزين المؤقت.' },
      { term: 'investigate', pos: 'verb', ar: 'يحقّق / يفحص', def_en: 'to examine something carefully to find out why', example: 'We will investigate a permanent fix this week.', example_ar: 'بنحقّق في حل دائم هذا الأسبوع.' },
    ],
    phrases: [
      { en: "What I've already checked is…", ar: 'اللي فحصته أصلاً هو…', context_ar: 'لإظهار ما تم استبعاده' },
      { en: 'We traced it to…', ar: 'تتبّعناها إلى…', context_ar: 'لإعلان مصدر المشكلة' },
      { en: 'The root cause was…', ar: 'السبب الجذري كان…', context_ar: 'للفصل عن العَرَض' },
      { en: 'First we…, then we…, so we…', ar: 'أول سوّينا…، بعدها…، فـ…', context_ar: 'لسرد الخطوات بالترتيب' },
      { en: 'As a workaround, we…', ar: 'كحل مؤقّت، سوّينا…', context_ar: 'لذكر الإجراء المؤقت' },
      { en: 'It turned out to be…', ar: 'طلع إنها…', context_ar: 'للكشف عن السبب النهائي' },
    ],
    roleplay: {
      title_en: 'Post-incident review: how you found the cause',
      ai_role: "You are the team lead in a post-incident review. You want to understand exactly how she found the root cause. Ask follow-ups that make her walk the timeline — what she checked first, what she ruled out, and how she confirmed the cause. Be supportive but curious.",
      student_role: 'You are the analyst who investigated and found the root cause.',
      setting_ar: 'جلسة مراجعة بعد الحادثة مع قائد الفريق',
      prompt_en: 'Walk the lead through the investigation in order: what you checked first, what you ruled out, what you found, and the root cause. Separate symptom from cause.',
      prompt_ar: 'امشّي القائد خلال التحقيق بالترتيب: وش فحصتِ أولاً، وش استبعدتِ، وش لقيتِ، والسبب الجذري.',
      useful_phrases: ["What I've already checked is…", 'We traced it to…', 'The root cause was…', 'First we…, then we…, so we…'],
    },
    writing_task: {
      title_ar: 'ملخّص السبب الجذري',
      prompt_en: 'Write a short root-cause summary for the report: the symptom, what was investigated, the root cause, and the fix/workaround.',
      prompt_ar: 'اكتبي ملخّص سبب جذري قصير للتقرير: العَرَض، وش تم التحقيق فيه، السبب الجذري، والحل/الحل المؤقت.',
      min_words: 40, max_words: 100,
      hints: ['افصلي Symptom عن Root cause', 'استخدمي first/then/so للتسلسل', 'اختمي بـ Fix أو Workaround'],
    },
  },
  {
    module_number: 4,
    title_ar: 'التعامل مع الأسئلة التوضيحية',
    title_en: 'Handling Clarifying Questions',
    estimated_minutes: 25,
    scenario_ar: 'أنتِ تبلّغين وكيل الدعم عن خطأ، وهو يقاطعك بأسئلة توضيحية: أي خدمة؟ أي نقطة وصول؟ رسالة الخطأ بالضبط؟ متى بدأ؟ فنّك إنك تجاوبين بسرعة وترجعين لخيط شرحك بهدوء.',
    scenario_en: 'You are reporting an error to a support agent who keeps interrupting with clarifying questions: which service, which endpoint, the exact error, when it started. The skill is answering quickly and calmly returning to your thread.',
    objectives: [
      { ar: 'الإجابة على أسئلة التوضيح بجُمَل قصيرة واضحة', en: 'Answer clarifying questions with short, clear replies' },
      { ar: 'طلب التوضيح بأدب عند عدم فهم السؤال', en: 'Politely ask for clarification when needed' },
      { ar: 'الرجوع لخيط الشرح بعد المقاطعة من غير ارتباك', en: 'Return to your thread after an interruption without getting lost' },
    ],
    vocabulary: [
      { term: 'confirm', pos: 'verb', ar: 'يؤكّد', def_en: 'to say that something is true or correct', example: 'Can you confirm which service is failing?', example_ar: 'تقدر تأكّد أي خدمة تتعطّل؟' },
      { term: 'clarify', pos: 'verb', ar: 'يوضّح', def_en: 'to make something clearer', example: 'Just to clarify, does it happen on the app or the website?', example_ar: 'بس للتوضيح، تصير على التطبيق أو الموقع؟' },
      { term: 'specify', pos: 'verb', ar: 'يحدّد بدقّة', def_en: 'to state something exactly', example: 'Can you specify the exact error message?', example_ar: 'تقدر تحدّد رسالة الخطأ بالضبط؟' },
      { term: 'endpoint', pos: 'noun', ar: 'نقطة الوصول (في الـAPI)', def_en: 'a specific URL an application calls', example: 'The /auth/session endpoint returns the error.', example_ar: 'نقطة /auth/session تُرجع الخطأ.' },
      { term: 'error message', pos: 'noun phrase', ar: 'رسالة الخطأ', def_en: 'the text a system shows when something fails', example: 'The error message says "session expired".', example_ar: 'رسالة الخطأ تقول «session expired».' },
      { term: 'exactly', pos: 'adverb', ar: 'بالضبط', def_en: 'used to confirm something precisely', example: 'Exactly — it began after the Tuesday deployment.', example_ar: 'بالضبط — بدأت بعد نشر الثلاثاء.' },
      { term: 'whether', pos: 'conjunction', ar: 'ما إذا', def_en: 'used to introduce a yes/no possibility', example: 'Do you know whether it started after the update?', example_ar: 'تعرف إذا بدأت بعد التحديث؟' },
    ],
    phrases: [
      { en: 'Just to confirm…', ar: 'بس للتأكيد…', context_ar: 'قبل المتابعة على معلومة' },
      { en: 'Let me clarify…', ar: 'خلّيني أوضّح…', context_ar: 'لتصحيح أو تدقيق فهم' },
      { en: 'Sorry, could you repeat that?', ar: 'عذراً، تقدر تعيد؟', context_ar: 'لطلب الإعادة بأدب' },
      { en: 'Good question — …', ar: 'سؤال جيّد — …', context_ar: 'لكسب لحظة تفكير بلباقة' },
      { en: 'So, as I was saying…', ar: 'فـ، كما كنت أقول…', context_ar: 'للرجوع لخيط الشرح' },
      { en: 'The exact error is…', ar: 'الخطأ بالضبط هو…', context_ar: 'لإعطاء تفصيل دقيق مطلوب' },
    ],
    roleplay: {
      title_en: 'A support agent keeps interrupting with questions',
      ai_role: "You are 'Rahul', a support agent taking her ticket. You keep interrupting — politely but frequently — with clarifying questions: which service, which endpoint, the exact error, when it started, whether it is on app or web. Interrupt naturally so she has to answer and get back on track.",
      student_role: 'You are the analyst reporting a login error to support.',
      setting_ar: 'مكالمة مع وكيل دعم يقاطع بأسئلة توضيحية',
      prompt_en: 'Report the login error. Answer each interrupting question with a short clear reply, ask for clarification politely if needed, then return to your explanation.',
      prompt_ar: 'بلّغي عن خطأ تسجيل الدخول. جاوبي كل مقاطعة بإجابة قصيرة، واطلبي التوضيح بأدب، ثم ارجعي لشرحك.',
      useful_phrases: ['Just to confirm…', 'Sorry, could you repeat that?', 'So, as I was saying…', 'The exact error is…'],
    },
    writing_task: {
      title_ar: 'ردّ مكتوب على أسئلة الدعم',
      prompt_en: "Reply in writing to a support agent's questions in one short message: service, endpoint, exact error, and when it started.",
      prompt_ar: 'ردّي كتابةً على أسئلة وكيل الدعم في رسالة قصيرة: الخدمة، نقطة الوصول، الخطأ بالضبط، ومتى بدأ.',
      min_words: 30, max_words: 80,
      hints: ['نظّمي الرد كنقاط: Service / Endpoint / Error / Since', 'كوني دقيقة لا مطوّلة', 'اختمي بعرض المساعدة'],
    },
  },
  {
    module_number: 5,
    title_ar: 'تصعيد حادثة بوضوح',
    title_en: 'Escalating an Incident Clearly',
    estimated_minutes: 25,
    scenario_ar: 'قاعدة البيانات على وشك الامتلاء، وبساعتين بتتوقّف كل الكتابات. المشكلة أكبر من مستواك، والاحترافية إنك تصعّدينها بسرعة ووضوح: كم الخطورة، مين تأثّر، وليش لازم الآن.',
    scenario_en: 'The database is nearly full and in two hours all writes will fail. This is above your level, and the professional move is to escalate fast and clearly: how severe, who is affected, and why it must be now.',
    objectives: [
      { ar: 'تصعيد حادثة بذكر الخطورة والأثر في جملتين واضحتين', en: 'Escalate stating severity and impact in two clear sentences' },
      { ar: 'التعبير عن الحاجة والإلحاح (need to / have to / should)', en: 'Express need and urgency correctly' },
      { ar: 'طلب التصعيد بثقة من غير اعتذار زائد', en: 'Ask to escalate confidently, without over-apologizing' },
    ],
    vocabulary: [
      { term: 'escalate', pos: 'verb', ar: 'يُصعِّد', def_en: 'to raise an issue to a higher level for help', example: 'I am escalating this to the database team.', example_ar: 'أصعّد هذا لفريق قاعدة البيانات.' },
      { term: 'severity', pos: 'noun', ar: 'درجة الخطورة', def_en: 'how serious a problem is', example: 'This is a high-severity incident.', example_ar: 'هذه حادثة عالية الخطورة.' },
      { term: 'incident', pos: 'noun', ar: 'الحادثة / العطل', def_en: 'an unplanned event that disrupts a service', example: "I'm opening an incident for this issue.", example_ar: 'أفتح حادثة لهذه المشكلة.' },
      { term: 'SLA', pos: 'noun', ar: 'اتفاقية مستوى الخدمة', def_en: 'a service-level agreement promising a level of service', example: 'A full database would breach our SLA.', example_ar: 'امتلاء قاعدة البيانات يُخِلّ باتفاقية مستوى الخدمة.' },
      { term: 'breach', pos: 'verb', ar: 'يُخِلّ / ينتهك', def_en: 'to fail to meet an agreement', example: 'This delay could breach our SLA.', example_ar: 'هذا التأخير قد يُخِلّ باتفاقيتنا.' },
      { term: 'urgent', pos: 'adjective', ar: 'عاجل', def_en: 'needing action right away', example: 'This is urgent and needs attention now.', example_ar: 'هذا عاجل ويحتاج انتباهاً الآن.' },
      { term: 'priority', pos: 'noun', ar: 'الأولوية', def_en: 'how important something is relative to other work', example: 'It should be treated as top priority.', example_ar: 'لازم يُعامَل كأولوية قصوى.' },
    ],
    phrases: [
      { en: 'This is high-severity.', ar: 'هذه عالية الخطورة.', context_ar: 'الافتتاحية التي تحدّد الجدية' },
      { en: 'We need to escalate this.', ar: 'لازم نصعّد هذا.', context_ar: 'لطلب التصعيد بوضوح' },
      { en: "It's affecting our SLA.", ar: 'إنها تؤثّر على اتفاقية مستوى الخدمة.', context_ar: 'لربط الحادثة بالالتزام' },
      { en: 'The impact is…', ar: 'الأثر هو…', context_ar: 'لتقديم الأثر بالأرقام' },
      { en: 'We have to act within…', ar: 'لازم نتحرّك خلال…', context_ar: 'لتحديد نافذة الوقت' },
      { en: 'I need someone from the DB team now.', ar: 'أحتاج أحد من فريق قاعدة البيانات الآن.', context_ar: 'لطلب محدّد وحازم' },
    ],
    roleplay: {
      title_en: 'Escalating to the on-call engineer',
      ai_role: "You are the busy database on-call engineer she is escalating to. You need severity and impact fast to decide whether to drop everything. Push for numbers, a timeframe, and exactly what she needs. Once she is clear and urgent, agree to jump in.",
      student_role: 'You are the analyst escalating a nearly-full database.',
      setting_ar: 'مكالمة تصعيد مع مهندس المناوبة',
      prompt_en: 'Escalate the incident: open with severity, give the impact in numbers and time, then state exactly what you need and by when. Confident, urgent, not panicked.',
      prompt_ar: 'صعّدي الحادثة: ابدئي بالخطورة، أعطي الأثر بالأرقام والوقت، ثم اطلبي بوضوح وش تحتاجين وبأي وقت.',
      useful_phrases: ['This is high-severity.', 'We need to escalate this.', 'The impact is…', 'We have to act within…'],
    },
    writing_task: {
      title_ar: 'ملاحظة تصعيد',
      prompt_en: 'Write a short escalation note: severity, impact, the deadline, and what you need. Two or three tight sentences.',
      prompt_ar: 'اكتبي ملاحظة تصعيد قصيرة: الخطورة، الأثر، المهلة، وما تحتاجينه.',
      min_words: 25, max_words: 70,
      hints: ['ابدئي بـ High-severity: …', 'اذكري الوقت: within ~2 hours', 'اختمي بطلب واضح'],
    },
  },
  {
    module_number: 6,
    title_ar: 'تحديث الحالة في الاجتماع اليومي',
    title_en: 'Status Update in a Standup',
    estimated_minutes: 20,
    scenario_ar: 'الاجتماع اليومي، وأمامك ثوانٍ معدودة. لو قلتِ بوضوح: «أمس سوّيت… اليوم بسوّي… وأنا معطّلة على…» تبيّنين احترافيتك وتاخذين المساعدة اللي تحتاجينها.',
    scenario_en: 'The daily standup, and you have only seconds. If you clearly say “Yesterday I… Today I’m… I’m blocked on…”, you show professionalism and get the help you need.',
    objectives: [
      { ar: 'تحديث من ثلاثة أجزاء: منجَز / قيد التنفيذ / عائق', en: 'A three-part update: done / in progress / blocker' },
      { ar: 'المضارع التام والمستمر بشكل صحيح (we’ve deployed / we’re monitoring)', en: 'Present perfect + present continuous correctly' },
      { ar: 'ذكر العائق وطلب المساعدة المحدّدة', en: 'Name the blocker and ask for specific help' },
    ],
    vocabulary: [
      { term: 'deployment', pos: 'noun', ar: 'النشر / الإطلاق', def_en: 'releasing new code to production', example: 'The deployment went out in the evening.', example_ar: 'صدر النشر مساءً.' },
      { term: 'rollback', pos: 'noun', ar: 'التراجع / الاسترجاع', def_en: 'returning to a previous working version', example: 'No rollback was needed this time.', example_ar: 'ما احتجنا تراجع هذي المرة.' },
      { term: 'patch', pos: 'noun', ar: 'التحديث / الرقعة', def_en: 'a small fix applied to software', example: 'The patch is stable in production.', example_ar: 'التحديث مستقر في الإنتاج.' },
      { term: 'backup', pos: 'noun', ar: 'النسخة الاحتياطية', def_en: 'a saved copy used to restore data', example: "I'm working on the backup job that failed.", example_ar: 'أشتغل على مهمة النسخ الاحتياطي اللي فشلت.' },
      { term: 'in progress', pos: 'phrase', ar: 'قيد التنفيذ', def_en: 'currently being worked on', example: 'The task is in progress and nearly done.', example_ar: 'المهمة قيد التنفيذ وقريبة من الانتهاء.' },
      { term: 'blocker', pos: 'noun', ar: 'عائق', def_en: 'something stopping you from making progress', example: 'My only blocker is the storage permission.', example_ar: 'عائقي الوحيد هو صلاحية التخزين.' },
      { term: 'on track', pos: 'phrase', ar: 'يسير حسب الخطة', def_en: 'going as planned', example: 'Everything else is on track for Thursday.', example_ar: 'الباقي يسير حسب الخطة للخميس.' },
    ],
    phrases: [
      { en: 'Yesterday I…', ar: 'أمس سوّيت…', context_ar: 'لجزء «المنجَز»' },
      { en: "Today I'm…", ar: 'اليوم أنا…', context_ar: 'لجزء «قيد التنفيذ»' },
      { en: "I'm blocked on…", ar: 'أنا معطّلة على…', context_ar: 'لجزء «العائق»' },
      { en: "We've deployed…", ar: 'نشرنا…', context_ar: 'للمنجَز بأثر حالي' },
      { en: "We're monitoring…", ar: 'نراقب…', context_ar: 'لِما هو جارٍ الآن' },
      { en: 'Everything else is on track.', ar: 'الباقي يسير حسب الخطة.', context_ar: 'لإغلاق التحديث بطمأنينة' },
    ],
    roleplay: {
      title_en: 'A fast daily standup',
      ai_role: "You are the scrum lead running a fast daily standup. You want a crisp three-part update and will move on quickly. If she rambles, ask her to keep it short. Prompt once for her blocker and exactly what she needs to unblock it.",
      student_role: 'You are the analyst giving your standup update.',
      setting_ar: 'اجتماع يومي سريع مع قائد السكرم',
      prompt_en: 'Give a three-part standup: what you finished (present perfect), what you are doing now (present continuous), and your blocker with a specific request.',
      prompt_ar: 'قدّمي تحديثاً من ثلاثة أجزاء: المنجَز، قيد التنفيذ، والعائق مع طلب محدّد.',
      useful_phrases: ['Yesterday I…', "Today I'm…", "I'm blocked on…", 'Everything else is on track.'],
    },
    writing_task: {
      title_ar: 'تحديث مكتوب للاجتماع',
      prompt_en: 'Write your standup as a short async message: Done / Doing / Blocked, with a specific ask under Blocked.',
      prompt_ar: 'اكتبي تحديث الاجتماع كرسالة قصيرة: منجَز / قيد التنفيذ / عائق، مع طلب محدّد تحت العائق.',
      min_words: 25, max_words: 70,
      hints: ['ثلاثة أسطر فقط', 'العائق يحتاج طلباً محدّداً', 'استخدمي التام للمنجَز'],
    },
  },
  {
    module_number: 7,
    title_ar: 'كتابة ملخّص حادثة واضح',
    title_en: 'Writing a Clear Incident Summary',
    estimated_minutes: 25,
    scenario_ar: 'انتهت الحادثة، والناس اللي ما كانوا حاضرين بيقرؤون إيميلك عشان يفهمون. إيميل مرتّب من أربعة أقسام — الملخّص، الأثر، الحل، والخطوات التالية — يخلّي أي أحد يفهم القصة في دقيقة.',
    scenario_en: 'The incident is over, and people who were not there will read your email to understand it. A four-section email — Summary, Impact, Resolution, Next steps — lets anyone grasp the story in a minute.',
    objectives: [
      { ar: 'كتابة إيميل ملخّص حادثة من أربعة أقسام واضحة', en: 'Write a four-section incident-summary email' },
      { ar: 'جُمَل تقرير واضحة والمبني للمجهول عند المناسبة (the issue was resolved at…)', en: 'Clear reporting sentences + passive voice where natural' },
      { ar: 'التمييز بين الأثر والحل والخطوات التالية', en: 'Distinguish impact, resolution, and next steps' },
    ],
    vocabulary: [
      { term: 'summary', pos: 'noun', ar: 'الملخّص', def_en: 'a short statement of the main points', example: 'This is a summary of the incident.', example_ar: 'هذا ملخّص للحادثة.' },
      { term: 'resolution', pos: 'noun', ar: 'الحل / كيفية المعالجة', def_en: 'how a problem was fixed', example: 'The resolution section explains how we fixed it.', example_ar: 'قسم الحل يشرح كيف عالجناها.' },
      { term: 'impact', pos: 'noun', ar: 'الأثر', def_en: 'the effect on users or the business', example: 'Impact: about ninety payments failed.', example_ar: 'الأثر: فشلت نحو تسعين عملية دفع.' },
      { term: 'timeline', pos: 'noun', ar: 'الخط الزمني', def_en: 'the sequence of events with times', example: 'The timeline shows the issue started at 09:14.', example_ar: 'الخط الزمني يبيّن أنها بدأت ٩:١٤.' },
      { term: 'follow-up', pos: 'noun', ar: 'المتابعة / الخطوة التالية', def_en: 'an action to be done after the event', example: 'Follow-up: a full report will be shared by Thursday.', example_ar: 'المتابعة: تقرير كامل الخميس.' },
      { term: 'root cause', pos: 'noun phrase', ar: 'السبب الجذري', def_en: 'the underlying reason for the incident', example: 'The team is investigating the root cause.', example_ar: 'الفريق يحقّق في السبب الجذري.' },
      { term: 'affected', pos: 'adjective', ar: 'متأثّر', def_en: 'impacted by the incident', example: 'The outage affected users during peak hours.', example_ar: 'أثّر الانقطاع على المستخدمين في الذروة.' },
    ],
    phrases: [
      { en: 'Subject: Incident Summary — …', ar: 'الموضوع: ملخّص حادثة — …', context_ar: 'عنوان الإيميل' },
      { en: 'Summary: …', ar: 'الملخّص: …', context_ar: 'القسم الأول' },
      { en: 'Impact: …', ar: 'الأثر: …', context_ar: 'القسم الثاني' },
      { en: 'Resolution: …', ar: 'الحل: …', context_ar: 'القسم الثالث' },
      { en: 'The issue was resolved at…', ar: 'تمّت معالجة المشكلة الساعة…', context_ar: 'المبني للمجهول للتقرير' },
      { en: 'Next steps: …', ar: 'الخطوات التالية: …', context_ar: 'القسم الرابع' },
    ],
    roleplay: {
      title_en: 'Your manager asks you to summarize it first',
      ai_role: "You are her manager who missed the incident. Before she writes it up, ask her to summarize what happened in a few sentences: what went down, the impact, and how it was resolved. Ask one or two follow-ups so she practices tight verbal summary.",
      student_role: 'You are the analyst about to write the incident summary.',
      setting_ar: 'مكالمة قصيرة مع المدير قبل كتابة الملخّص',
      prompt_en: 'Summarize the incident out loud in a few sentences: what happened, the impact, and the resolution — as a warm-up before writing it.',
      prompt_ar: 'لخّصي الحادثة شفهياً في جُمَل قليلة: وش صار، الأثر، والحل — كتمهيد قبل الكتابة.',
      useful_phrases: ['In short, …', 'The impact was…', 'It was resolved at…', 'The next step is…'],
    },
    writing_task: {
      title_ar: 'إيميل ملخّص الحادثة',
      prompt_en: 'Write a short incident-summary email (120–180 words) with four sections: Summary, Impact, Resolution, Next steps. Use clear reporting sentences and the passive where natural. Spell technical terms correctly.',
      prompt_ar: 'اكتبي إيميل ملخّص حادثة (١٢٠–١٨٠ كلمة) بأربعة أقسام: Summary وImpact وResolution وNext steps. استخدمي جُمَل تقرير واضحة والمبني للمجهول عند المناسبة.',
      min_words: 120, max_words: 200,
      hints: ['Subject: Incident Summary — …', 'كل قسم بعنوانه', 'the issue was resolved at… (مبني للمجهول)'],
    },
  },
  {
    module_number: 8,
    title_ar: 'شرح الأثر لغير التقنيين',
    title_en: 'Explaining Impact to Non-Technical Stakeholders',
    estimated_minutes: 25,
    scenario_ar: 'مديرة العمليات ما تعرف التقنية، وتبي تعرف بس: وش يعني هذا للعملاء وللعمل؟ لو استخدمتِ مصطلحات كثيرة تضيع، ولو قلتِ «باختصار…» وشرحتِ الأثر بجُمَل قصيرة، تفهم وتثق فيك.',
    scenario_en: 'The operations VP does not know the tech; she only wants to know what it means for customers and the business. Jargon loses her; short sentences and “in simple terms…” earn her trust.',
    objectives: [
      { ar: 'شرح مشكلة تقنية لغير تقني بجُمَل قصيرة وبدون مصطلحات', en: 'Explain a technical issue to a non-technical person, simply' },
      { ar: 'التركيز على الأثر على المستخدمين والعمل', en: 'Focus on user and business impact, not the internals' },
      { ar: 'استخدام «which means / so» لترجمة التقني إلى نتيجة', en: 'Use “which means / so” to translate tech into a result' },
    ],
    vocabulary: [
      { term: 'impact', pos: 'noun', ar: 'الأثر', def_en: 'the effect on users or the business', example: 'Let me explain the impact on the users.', example_ar: 'خلّيني أشرح الأثر على المستخدمين.' },
      { term: 'affected', pos: 'adjective', ar: 'متأثّر', def_en: 'impacted by the issue', example: 'About ninety users were affected.', example_ar: 'تأثّر نحو تسعين مستخدماً.' },
      { term: 'downtime', pos: 'noun', ar: 'مدة توقّف الخدمة', def_en: 'time a service was unavailable', example: 'That is the downtime you heard about.', example_ar: 'هذي مدة التوقّف اللي سمعتِ عنها.' },
      { term: 'resolve', pos: 'verb', ar: 'يحلّ / يعالج', def_en: 'to fix a problem', example: 'We have already resolved it.', example_ar: 'عالجناها بالفعل.' },
      { term: 'users', pos: 'noun', ar: 'المستخدمون', def_en: 'the people who use the service', example: 'What this means for users is a short delay.', example_ar: 'اللي يعنيه هذا للمستخدمين هو تأخير قصير.' },
      { term: 'in simple terms', pos: 'phrase', ar: 'بعبارات بسيطة', def_en: 'explained in an easy, non-technical way', example: 'In simple terms, one server stopped working.', example_ar: 'بعبارات بسيطة، توقّف خادم واحد.' },
      { term: 'delay', pos: 'noun', ar: 'تأخير', def_en: 'a short wait, not a loss', example: 'It was a short delay for customers, not lost data.', example_ar: 'كان تأخيراً قصيراً للعملاء، مو فقدان بيانات.' },
    ],
    phrases: [
      { en: 'In simple terms…', ar: 'بعبارات بسيطة…', context_ar: 'الافتتاحية التي تبسّط' },
      { en: 'What this means for users is…', ar: 'اللي يعنيه هذا للمستخدمين هو…', context_ar: 'لترجمة الأثر' },
      { en: 'The good news is…', ar: 'الخبر الجيّد هو…', context_ar: 'لإنهاء بنقطة إيجابية' },
      { en: 'So, in short…', ar: 'فـ، باختصار…', context_ar: 'للتلخيص' },
      { en: "We've already resolved it.", ar: 'عالجناها بالفعل.', context_ar: 'للطمأنة' },
      { en: 'No data was lost.', ar: 'ما فُقدت أي بيانات.', context_ar: 'لنفي أسوأ احتمال' },
    ],
    roleplay: {
      title_en: 'Briefing a non-technical VP',
      ai_role: "You are 'Sarah', a non-technical operations VP. You do not know the tech and only care what it means for customers and the business. If she uses jargon, ask 'what does that mean for us?'. Reward plain, short, reassuring explanations.",
      student_role: 'You are the analyst briefing leadership after an incident.',
      setting_ar: 'إحاطة بعد حادثة مع نائبة رئيس غير تقنية',
      prompt_en: 'Explain the technical issue and its business impact simply: short sentences, no jargon, translate with “which means / so”, focus on users, and end with the good news.',
      prompt_ar: 'اشرحي المشكلة وأثرها ببساطة: جُمَل قصيرة، بلا مصطلحات، ترجمي بـ«which means / so»، وركّزي على المستخدم واختمي بالخبر الجيّد.',
      useful_phrases: ['In simple terms…', 'What this means for users is…', 'The good news is…', "We've already resolved it."],
    },
    writing_task: {
      title_ar: 'رسالة لغير التقنيين',
      prompt_en: 'Write a short message to a non-technical stakeholder: what happened in plain words, what it meant for customers, and the reassurance that it is resolved.',
      prompt_ar: 'اكتبي رسالة قصيرة لجهة غير تقنية: وش صار بكلام بسيط، وش عناه للعملاء، والطمأنة أنها عولجت.',
      min_words: 30, max_words: 90,
      hints: ['ابدئي بـ In simple terms', 'ركّزي على العميل لا الخادم', 'اختمي بـ The good news is…'],
    },
  },
  {
    module_number: 9,
    title_ar: 'التواصل مع فريق الدعم على المكالمة',
    title_en: 'Working a Call with the Support Team',
    estimated_minutes: 25,
    scenario_ar: 'مكالمة مع مهندس من فريق الدعم في بنغالور تشتغلون فيها على نفس التذكرة. لهجته تختلف عن اللي تعوّدتِ عليه، والإيقاع سريع. الهدف إنكم زملاء تحلّون المشكلة سوا: تشرحين، تسألين، وتتّفقون على الخطوات التالية بثقة وبدون توقّف.',
    scenario_en: 'A call with a support engineer from the Bangalore team, working the same ticket together. His accent differs from what you are used to, and the pace is quick. The goal: you are teammates solving it together — you explain, ask, and agree on next steps confidently, without freezing.',
    objectives: [
      { ar: 'إدارة مكالمة عمل مع زميل دعم بإيقاع سريع من غير توقّف', en: 'Handle a fast working call with a support colleague without freezing' },
      { ar: 'طلب الإعادة أو التوضيح عند صعوبة اللهجة بلباقة', en: 'Ask for a repeat or clarification when an accent is hard, gracefully' },
      { ar: 'الاتّفاق على المسؤوليات والخطوات التالية بوضوح', en: 'Agree on ownership and next steps clearly' },
    ],
    vocabulary: [
      { term: 'ticket', pos: 'noun', ar: 'التذكرة / طلب الدعم', def_en: 'a logged request or issue to track', example: "I've raised a ticket with the support team.", example_ar: 'فتحت تذكرة مع فريق الدعم.' },
      { term: 'on my end', pos: 'phrase', ar: 'من جهتي / عندي', def_en: 'on my side of the system', example: 'It looks fine on my end.', example_ar: 'يبدو سليماً من جهتي.' },
      { term: 'take it from here', pos: 'phrase', ar: 'أكمل من هنا', def_en: 'to continue handling something', example: "I'll take it from here and update the ticket.", example_ar: 'أكمل من هنا وأحدّث التذكرة.' },
      { term: 'loop in', pos: 'phrase', ar: 'يُشرِك / يُضيف للمحادثة', def_en: 'to add someone to a conversation', example: "Let's loop in the network team.", example_ar: 'نضيف فريق الشبكة للمحادثة.' },
      { term: 'align', pos: 'verb', ar: 'يتّفق / ينسّق', def_en: 'to agree on an approach', example: "Let's align on the next steps.", example_ar: 'نتّفق على الخطوات التالية.' },
      { term: 'follow up', pos: 'phrase', ar: 'يُتابع', def_en: 'to check back on something later', example: "I'll follow up after the deploy.", example_ar: 'أتابع بعد النشر.' },
      { term: 'on the same page', pos: 'phrase', ar: 'على نفس الفهم', def_en: 'in agreement and understanding', example: 'Just to make sure we are on the same page…', example_ar: 'بس أتأكد إننا على نفس الفهم…' },
    ],
    phrases: [
      { en: "Sorry, you're a little faint — could you repeat that?", ar: 'عذراً، صوتك خافت — تقدر تعيد؟', context_ar: 'لطلب الإعادة بلباقة على المكالمة' },
      { en: 'Just to make sure we are on the same page…', ar: 'بس أتأكد إننا على نفس الفهم…', context_ar: 'لتأكيد الفهم المشترك' },
      { en: "On my end, I'm seeing…", ar: 'من جهتي، أشوف…', context_ar: 'لمشاركة ما تلاحظينه' },
      { en: 'Can you check on your side?', ar: 'تقدر تتحقق من جهتك؟', context_ar: 'لتوزيع الفحص' },
      { en: "Let's align on next steps.", ar: 'نتّفق على الخطوات التالية.', context_ar: 'لإغلاق المكالمة باتفاق' },
      { en: "I'll take it from here.", ar: 'أكمل من هنا.', context_ar: 'لتولّي الخطوة التالية' },
    ],
    roleplay: {
      title_en: 'A working call with the offshore support engineer',
      ai_role: "You are 'Arjun', a friendly, quick support engineer on the offshore team in Bangalore, on a call working the same ticket with the learner. Share what you see on your side, ask what she sees on hers, and drive toward agreed next steps. Be collaborative and a little fast-paced — you are teammates, not a helpdesk. If she asks you to repeat, do so naturally.",
      student_role: 'You are the infrastructure analyst working the ticket with support.',
      setting_ar: 'مكالمة عمل مع مهندس الدعم عن بُعد على نفس التذكرة',
      prompt_en: 'Work the ticket with the support engineer: share what you see, ask what he sees, ask for a repeat if you miss something, and agree on who does what next.',
      prompt_ar: 'اشتغلي على التذكرة مع مهندس الدعم: شاركي ما تشوفين، اسألي عمّا يشوف، اطلبي الإعادة إذا فاتك شيء، واتّفقوا على المسؤوليات.',
      useful_phrases: ['On my end, I’m seeing…', 'Could you repeat that?', "Let's align on next steps.", "I'll take it from here."],
    },
    writing_task: {
      title_ar: 'تحديث التذكرة بعد المكالمة',
      prompt_en: 'After the call, update the ticket: what you found together, what each side will do next, and the follow-up time.',
      prompt_ar: 'بعد المكالمة، حدّثي التذكرة: وش لقيتوا سوا، وش بيسوّي كل طرف، ووقت المتابعة.',
      min_words: 30, max_words: 90,
      hints: ['اذكري القرار المشترك بوضوح', 'حدّدي المسؤول لكل خطوة', 'اختمي بوقت المتابعة'],
    },
  },
  {
    module_number: 10,
    title_ar: 'قيادة مكالمة حادثة كبرى',
    title_en: 'Owning a Major-Incident Call',
    estimated_minutes: 30,
    scenario_ar: 'اللحظة الكبرى: حادثة كبرى وعدة فِرَق على «الجسر». قائد الحادثة يطلب منكِ، محلّلة البنية التقنية، تقريراً واضحاً عن الوضع: وش المتوقّف، الأثر، وش تم، ووش تحتاجين — تحت الضغط، بس بهدوء ووضوح. هذي المكالمة اللي كل الشهر يدرّبك عليها.',
    scenario_en: 'The big moment: a major incident with several teams on the bridge. The incident commander asks you, the infrastructure analyst, for a clear situation report: what is down, the impact, what has been done, and what you need — under pressure, but calm and clear. This is the call the whole month has prepared you for.',
    objectives: [
      { ar: 'تقديم تقرير وضع (SITREP) منظّم تحت الضغط', en: 'Give a structured situation report (SITREP) under pressure' },
      { ar: 'دمج كل المهارات: الشرح، الأثر، التصعيد، والوضوح لغير التقني', en: 'Combine every skill: explaining, impact, escalation, non-technical clarity' },
      { ar: 'قيادة اللحظة بثقة والاتفاق على الخطوة التالية', en: 'Own the moment confidently and land the next action' },
    ],
    vocabulary: [
      { term: 'major incident', pos: 'noun phrase', ar: 'حادثة كبرى', def_en: 'a serious, high-impact outage needing coordination', example: 'We have declared a major incident.', example_ar: 'أعلنّا حادثة كبرى.' },
      { term: 'situation report', pos: 'noun phrase', ar: 'تقرير وضع', def_en: 'a brief update on the current state (SITREP)', example: 'Can you give a quick situation report?', example_ar: 'تقدرين تعطين تقرير وضع سريع؟' },
      { term: 'bridge', pos: 'noun', ar: 'جسر الاتصال (المكالمة المشتركة)', def_en: 'the shared call where teams coordinate', example: 'The network team just joined the bridge.', example_ar: 'انضم فريق الشبكة للجسر الآن.' },
      { term: 'contained', pos: 'adjective', ar: 'مُحتوى / تحت السيطرة', def_en: 'stopped from spreading further', example: 'The impact is now contained.', example_ar: 'الأثر الآن تحت السيطرة.' },
      { term: 'workstream', pos: 'noun', ar: 'مسار عمل', def_en: 'a parallel line of work in the response', example: 'One workstream is on recovery, another on comms.', example_ar: 'مسار على الاستعادة وآخر على التواصل.' },
      { term: 'ETA', pos: 'noun', ar: 'الوقت المتوقّع', def_en: 'estimated time of arrival / recovery', example: 'Our current ETA for recovery is 30 minutes.', example_ar: 'الوقت المتوقّع للاستعادة ٣٠ دقيقة.' },
      { term: 'stand down', pos: 'phrase', ar: 'إنهاء حالة الطوارئ', def_en: 'to end the emergency response', example: 'We can stand down once writes are stable.', example_ar: 'نقدر ننهي الطوارئ لما تستقر الكتابات.' },
    ],
    phrases: [
      { en: "Here's the current situation…", ar: 'هذا هو الوضع الحالي…', context_ar: 'افتتاحية تقرير الوضع' },
      { en: 'The impact is… and it is now contained.', ar: 'الأثر هو… وهو الآن تحت السيطرة.', context_ar: 'لتقديم الأثر والحالة' },
      { en: "What we've done so far is…", ar: 'اللي سوّيناه لحد الآن هو…', context_ar: 'لسرد الإجراءات' },
      { en: 'Our current ETA is…', ar: 'الوقت المتوقّع لدينا هو…', context_ar: 'لإعطاء تقدير زمني' },
      { en: 'What I need from this bridge is…', ar: 'اللي أحتاجه من هذا الجسر هو…', context_ar: 'لطلب واضح من الفريق' },
      { en: "I'll give the next update in ten minutes.", ar: 'بعطي التحديث القادم خلال عشر دقائق.', context_ar: 'لضبط إيقاع التحديثات' },
    ],
    roleplay: {
      title_en: 'The major-incident bridge: give the SITREP',
      ai_role: "You are the incident commander running a major-incident bridge with several teams listening. You ask the infrastructure analyst for a clear situation report and keep the pressure realistic but fair: what is down, the impact, what has been done, the ETA, and what she needs from the bridge. Push once for a number or an ETA if she is vague; acknowledge a strong, calm report.",
      student_role: 'You are the infrastructure analyst reporting on the bridge.',
      setting_ar: 'جسر حادثة كبرى مع قائد الحادثة وعدة فِرَق',
      prompt_en: 'Give a calm, structured situation report: what is down, the impact (in numbers), what has been done, your ETA, and what you need from the bridge. Own the moment.',
      prompt_ar: 'قدّمي تقرير وضع منظّماً وهادئاً: وش المتوقّف، الأثر (بالأرقام)، وش تم، الوقت المتوقّع، وش تحتاجين من الجسر.',
      useful_phrases: ["Here's the current situation…", 'The impact is…', "What we've done so far is…", 'Our current ETA is…'],
    },
    writing_task: {
      title_ar: 'تحديث الحادثة الكبرى لأصحاب المصلحة',
      prompt_en: 'Write the stakeholder update for the major incident: current status, impact, actions taken, ETA, and the next update time. Calm, clear, four to six lines.',
      prompt_ar: 'اكتبي تحديث أصحاب المصلحة للحادثة الكبرى: الحالة، الأثر، الإجراءات، الوقت المتوقّع، ووقت التحديث القادم.',
      min_words: 60, max_words: 130,
      hints: ['ابدئي بالحالة الحالية', 'الأثر بالأرقام + «contained»', 'اختمي بوقت التحديث القادم'],
    },
  },
]

async function main() {
  // 1) specialization upsert
  await runSQL(`
    insert into public.specializations (slug, title_ar, title_en, tagline_ar, icon, accent_color, sort_order)
    values (${DQ(SPEC.slug)}, ${DQ(SPEC.title_ar)}, ${DQ(SPEC.title_en)}, ${DQ(SPEC.tagline_ar)}, ${DQ(SPEC.icon)}, ${DQ(SPEC.accent_color)}, 2)
    on conflict (slug) do update set
      title_ar = excluded.title_ar, title_en = excluded.title_en,
      tagline_ar = excluded.tagline_ar, icon = excluded.icon,
      accent_color = excluded.accent_color, is_active = true;
  `)
  const [{ id: specId }] = await runSQL(`select id from public.specializations where slug = ${DQ(SPEC.slug)};`)
  console.log('specialization:', specId, SPEC.slug)

  for (const m of MODULES) {
    await runSQL(`
      insert into public.specialization_modules
        (specialization_id, module_number, title_ar, title_en, scenario_ar, scenario_en,
         objectives, vocabulary, phrases, roleplay, writing_task, estimated_minutes, sort_order)
      values
        ('${specId}', ${m.module_number}, ${DQ(m.title_ar)}, ${DQ(m.title_en)},
         ${DQ(m.scenario_ar)}, ${DQ(m.scenario_en)},
         ${JQ(m.objectives)}, ${JQ(m.vocabulary)}, ${JQ(m.phrases)}, ${JQ(m.roleplay)}, ${JQ(m.writing_task)},
         ${m.estimated_minutes}, ${m.module_number})
      on conflict (specialization_id, module_number) do update set
        title_ar = excluded.title_ar, title_en = excluded.title_en,
        scenario_ar = excluded.scenario_ar, scenario_en = excluded.scenario_en,
        objectives = excluded.objectives, vocabulary = excluded.vocabulary,
        phrases = excluded.phrases, roleplay = excluded.roleplay,
        writing_task = excluded.writing_task, estimated_minutes = excluded.estimated_minutes,
        sort_order = excluded.sort_order, updated_at = now();
    `)
    console.log(`module ${m.module_number}: ${m.title_en} ✓`)
  }

  const counts = await runSQL(`select count(*)::int as n from public.specialization_modules where specialization_id = '${specId}';`)
  console.log(`done — ${counts[0].n} modules seeded for ${SPEC.slug}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
