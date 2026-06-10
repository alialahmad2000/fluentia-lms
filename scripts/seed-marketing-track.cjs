#!/usr/bin/env node
// Seed the "Marketing Manager" individual-track specialization + 10 modules.
// Idempotent: upserts by slug / (specialization_id, module_number). Safe to re-run.
// Applies via the Management API (token from .mcp.json) using dollar-quoted JSON,
// because the legacy .env service-role key is rejected on this project.
//
// Usage: node scripts/seed-marketing-track.cjs
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
    headers: {
      Authorization: `Bearer ${readToken()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'curl/8.4.0',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`)
  try { return JSON.parse(text) } catch { return text }
}

// Dollar-quote a string for SQL (content never contains the tag below)
const DQ = (s) => `$smkt$${s}$smkt$`
const JQ = (o) => `${DQ(JSON.stringify(o))}::jsonb`

const SPEC = {
  slug: 'marketing_manager',
  title_ar: 'إدارة التسويق',
  title_en: 'Marketing Manager',
  tagline_ar: 'إنجليزية العمل لقادة التسويق — اجتماعات، عروض، تفاوض، وكتابة احترافية',
  icon: 'Megaphone',
  accent_color: '#e9b949',
}

// NOTE (Arabic tone): briefs/prompts below are written gender-NEUTRAL (no 2nd-person
// imperatives) per the project rule for DB-stored copy; UI chrome genderizes via useG().
const MODULES = [
  {
    module_number: 1,
    title_ar: 'التعريف المهني بالنفس',
    title_en: 'Your Professional Introduction',
    estimated_minutes: 25,
    scenario_ar: 'مؤتمر تسويقي في الرياض، وأمامك ٣٠ ثانية للتعريف بنفسك ودورك أمام شريك محتمل. الانطباع الأول هنا يفتح الأبواب — أو يغلقها.',
    scenario_en: 'A marketing conference in Riyadh. You have 30 seconds to introduce yourself and your role to a potential partner. The first impression opens doors — or closes them.',
    objectives: [
      { ar: 'تقديم النفس والدور الوظيفي بثقة في أقل من دقيقة', en: 'Introduce yourself and your role confidently in under a minute' },
      { ar: 'وصف المسؤوليات اليومية بمفردات تسويقية صحيحة', en: 'Describe day-to-day responsibilities with accurate marketing vocabulary' },
      { ar: 'فتح حديث مهني وإبقاؤه مستمرًا', en: 'Open a professional conversation and keep it going' },
    ],
    vocabulary: [
      { term: 'marketing manager', pos: 'noun', ar: 'مدير/مديرة تسويق', def_en: 'the person responsible for planning and running marketing activities', example: "I'm the marketing manager at a retail company.", example_ar: 'أعمل في إدارة التسويق لدى شركة تجزئة.' },
      { term: 'brand', pos: 'noun', ar: 'علامة تجارية', def_en: 'the identity and image of a company or product', example: 'Our brand is well known in the Gulf market.', example_ar: 'علامتنا التجارية معروفة في السوق الخليجي.' },
      { term: 'campaign', pos: 'noun', ar: 'حملة تسويقية', def_en: 'an organized series of marketing activities with one goal', example: 'We launched a campaign for the new product.', example_ar: 'أطلقنا حملة للمنتج الجديد.' },
      { term: 'target audience', pos: 'noun', ar: 'الجمهور المستهدف', def_en: 'the specific group of people a product is aimed at', example: 'Our target audience is young professionals.', example_ar: 'جمهورنا المستهدف هم المهنيون الشباب.' },
      { term: 'responsible for', pos: 'phrase', ar: 'مسؤول عن', def_en: 'having the duty of managing something', example: "I'm responsible for digital marketing.", example_ar: 'أتولّى مسؤولية التسويق الرقمي.' },
      { term: 'experience', pos: 'noun', ar: 'خبرة', def_en: 'knowledge and skill gained from doing a job', example: 'I have eight years of experience in marketing.', example_ar: 'لديّ ثماني سنوات من الخبرة في التسويق.' },
      { term: 'industry', pos: 'noun', ar: 'قطاع / صناعة', def_en: 'a particular field of business', example: 'I work in the retail industry.', example_ar: 'أعمل في قطاع التجزئة.' },
      { term: 'specialize in', pos: 'verb', ar: 'يتخصص في', def_en: 'to focus your work on one area', example: 'I specialize in social media marketing.', example_ar: 'أتخصص في تسويق وسائل التواصل.' },
      { term: 'network', pos: 'verb/noun', ar: 'يبني علاقات مهنية / شبكة علاقات', def_en: 'to meet people who can help your work', example: 'Conferences are a great place to network.', example_ar: 'المؤتمرات مكان ممتاز لبناء العلاقات المهنية.' },
      { term: 'business card', pos: 'noun', ar: 'بطاقة عمل', def_en: 'a small card with your name and job details', example: 'Here is my business card.', example_ar: 'هذه بطاقة عملي.' },
    ],
    phrases: [
      { en: "I'm the marketing manager at …", ar: 'أتولّى إدارة التسويق في …', context_ar: 'الافتتاحية الأساسية لأي تعريف مهني' },
      { en: 'I lead a team of five.', ar: 'أقود فريقًا من خمسة أشخاص.', context_ar: 'لإظهار حجم المسؤولية بشكل طبيعي' },
      { en: 'We focus mainly on digital channels.', ar: 'نركّز بشكل أساسي على القنوات الرقمية.', context_ar: 'لوصف طبيعة العمل' },
      { en: "It's a pleasure to meet you.", ar: 'سعدت بلقائك.', context_ar: 'تحية مهنية دافئة عند اللقاء الأول' },
      { en: 'What line of business are you in?', ar: 'في أي مجال تعملون؟', context_ar: 'سؤال يفتح الحديث ويظهر الاهتمام' },
      { en: "Let's stay in touch.", ar: 'لنبقَ على تواصل.', context_ar: 'إنهاء اللقاء بباب مفتوح' },
    ],
    roleplay: {
      title_en: 'Conference networking: introduce yourself',
      ai_role: 'You are "Daniel", a friendly business development director from a Dubai e-commerce company, meeting the learner at a marketing conference coffee break. You are curious about their role, their company, and what they work on. Ask natural networking questions one at a time (their role, their team, their current campaigns, their industry).',
      student_role: 'You are yourself — a marketing manager networking at a conference.',
      setting_ar: 'استراحة قهوة في مؤتمر تسويقي — حديث تعارف مهني',
      prompt_en: 'Introduce yourself professionally: your role, your company, what you are responsible for, and one thing you are working on now.',
      prompt_ar: 'محادثة تعارف مهني: التعريف بالنفس والدور والمسؤوليات ومشروع حالي.',
      useful_phrases: ["I'm the marketing manager at …", 'I lead a team of …', 'We focus mainly on …', 'I specialize in …'],
    },
    writing_task: {
      title_ar: 'نبذة لينكدإن',
      prompt_en: 'Write your LinkedIn "About" section: who you are, your experience, what you specialize in, and what value you bring. Professional but human.',
      prompt_ar: 'كتابة نبذة «About» للينكدإن: التعريف، الخبرة، التخصص، والقيمة المهنية — بأسلوب احترافي إنساني.',
      min_words: 50, max_words: 120,
      hints: ['الجملة الأولى تختصر الدور والخبرة', 'ذكر تخصص واحد واضح أقوى من قائمة طويلة', 'الختام بقيمة ملموسة: "I help brands …"'],
    },
  },
  {
    module_number: 2,
    title_ar: 'وصف المنتج وقيمته',
    title_en: 'Product & Value Proposition',
    estimated_minutes: 25,
    scenario_ar: 'عميل محتمل يسأل: «وش يميز منتجكم عن المنافسين؟». الإجابة تحتاج وصفًا واضحًا للمنتج، وقيمة مقنعة، ولغة تبيع بدون مبالغة.',
    scenario_en: 'A potential client asks: "What makes your product different?" The answer needs a clear product description, a convincing value proposition, and language that sells without exaggerating.',
    objectives: [
      { ar: 'وصف منتج أو خدمة بوضوح وإيجاز', en: 'Describe a product or service clearly and concisely' },
      { ar: 'صياغة قيمة مقنعة تجيب على «لماذا أنتم؟»', en: 'Phrase a value proposition that answers "why you?"' },
      { ar: 'المقارنة مع المنافسين بلغة مهنية', en: 'Compare with competitors in professional language' },
    ],
    vocabulary: [
      { term: 'value proposition', pos: 'noun', ar: 'القيمة المقدَّمة', def_en: 'the clear reason a customer should choose your product', example: 'Our value proposition is speed at a fair price.', example_ar: 'قيمتنا المقدّمة هي السرعة بسعر عادل.' },
      { term: 'feature', pos: 'noun', ar: 'ميزة (خاصية)', def_en: 'something a product has or does', example: 'The app has a delivery-tracking feature.', example_ar: 'التطبيق فيه خاصية تتبّع التوصيل.' },
      { term: 'benefit', pos: 'noun', ar: 'فائدة', def_en: 'the good result a feature gives the customer', example: 'The main benefit is saving time.', example_ar: 'الفائدة الأساسية هي توفير الوقت.' },
      { term: 'competitor', pos: 'noun', ar: 'منافس', def_en: 'another company selling similar products', example: 'Our biggest competitor lowered their prices.', example_ar: 'أكبر منافسينا خفّض أسعاره.' },
      { term: 'unique', pos: 'adj', ar: 'فريد', def_en: 'unlike anything else', example: 'This service is unique in the Saudi market.', example_ar: 'هذه الخدمة فريدة في السوق السعودي.' },
      { term: 'quality', pos: 'noun', ar: 'جودة', def_en: 'how good something is', example: 'Customers come back because of the quality.', example_ar: 'العملاء يعودون بسبب الجودة.' },
      { term: 'affordable', pos: 'adj', ar: 'بسعر مناسب', def_en: 'not expensive for what it offers', example: 'We keep the product affordable for families.', example_ar: 'نحافظ على سعر مناسب للعائلات.' },
      { term: 'stand out', pos: 'verb', ar: 'يتميّز / يبرز', def_en: 'to be clearly better or different', example: 'Good design makes our brand stand out.', example_ar: 'التصميم الجيد يجعل علامتنا تبرز.' },
      { term: 'customer need', pos: 'noun', ar: 'حاجة العميل', def_en: 'what the customer truly wants to solve', example: 'We built the product around a real customer need.', example_ar: 'بنينا المنتج حول حاجة حقيقية للعميل.' },
      { term: 'solution', pos: 'noun', ar: 'حل', def_en: 'a product seen as the answer to a problem', example: 'We offer a complete solution for small shops.', example_ar: 'نقدّم حلًا متكاملًا للمتاجر الصغيرة.' },
    ],
    phrases: [
      { en: 'What makes us different is …', ar: 'ما يميّزنا هو …', context_ar: 'الجملة الذهبية للإجابة عن سؤال المنافسة' },
      { en: 'In simple terms, our product helps you …', ar: 'ببساطة، منتجنا يساعدك على …', context_ar: 'تبسيط المنتج لغير المتخصصين' },
      { en: 'Unlike our competitors, we …', ar: 'على خلاف منافسينا، نحن …', context_ar: 'مقارنة مهنية بدون تجريح' },
      { en: 'The real benefit for you is …', ar: 'الفائدة الحقيقية لك هي …', context_ar: 'تحويل الميزة إلى فائدة' },
      { en: 'Let me give you an example.', ar: 'دعوني أعطيكم مثالًا.', context_ar: 'قبل قصة قصيرة تقنع العميل' },
      { en: 'Does that answer your question?', ar: 'هل أجبت على سؤالك؟', context_ar: 'إغلاق مهذب يتأكد من الوضوح' },
    ],
    roleplay: {
      title_en: 'A skeptical client asks why you',
      ai_role: 'You are "Reem", a procurement manager at a large Saudi company, considering the learner\'s product but skeptical. Ask what the product does, what makes it different from two cheaper competitors, and for a concrete example of value. Push back politely once ("Honestly, the other offer is cheaper — why should we pay more?").',
      student_role: 'You are the marketing manager presenting your own product (real or imagined).',
      setting_ar: 'اجتماع تعريفي مع مسؤولة مشتريات متردّدة',
      prompt_en: 'Present your product, explain its value proposition, and handle one price objection.',
      prompt_ar: 'عرض المنتج وقيمته والرد على اعتراض سعري واحد.',
      useful_phrases: ['What makes us different is …', 'The real benefit for you is …', 'Unlike our competitors, we …', 'Let me give you an example.'],
    },
    writing_task: {
      title_ar: 'فقرة «لماذا نحن؟»',
      prompt_en: 'Write the "Why choose us?" section of your company website: 3 reasons, each with one sentence of proof.',
      prompt_ar: 'كتابة قسم «لماذا نحن؟» لموقع الشركة: ثلاثة أسباب، مع جملة إثبات لكل سبب.',
      min_words: 60, max_words: 130,
      hints: ['كل سبب يبدأ بفائدة للعميل لا بميزة للمنتج', 'الإثبات رقم أو مثال — ليس وصفًا عامًا', 'بدون مبالغات مثل best / number one إلا بدليل'],
    },
  },
  {
    module_number: 3,
    title_ar: 'قيادة اجتماع الفريق',
    title_en: 'Leading the Team Meeting',
    estimated_minutes: 30,
    scenario_ar: 'اجتماع الفريق الأسبوعي صباح الأحد: مراجعة الأسبوع الماضي، توزيع المهام، وحسم نقاش بين رأيين مختلفين — كل ذلك بالإنجليزية لأن في الفريق زملاء غير ناطقين بالعربية.',
    scenario_en: 'The Sunday weekly team meeting: reviewing last week, assigning tasks, and settling a debate between two opinions — all in English because the team includes non-Arabic speakers.',
    objectives: [
      { ar: 'افتتاح اجتماع وإدارة جدول أعماله بثقة', en: 'Open a meeting and run its agenda confidently' },
      { ar: 'توزيع المهام وتحديد المواعيد النهائية بوضوح', en: 'Assign tasks and set deadlines clearly' },
      { ar: 'إدارة الخلاف في الرأي وحسم القرار', en: 'Manage disagreement and close the decision' },
    ],
    vocabulary: [
      { term: 'agenda', pos: 'noun', ar: 'جدول الأعمال', def_en: 'the list of topics for a meeting', example: 'There are three items on the agenda today.', example_ar: 'لدينا ثلاثة بنود في جدول أعمال اليوم.' },
      { term: 'deadline', pos: 'noun', ar: 'الموعد النهائي', def_en: 'the time by which work must be finished', example: 'The deadline for the report is Thursday.', example_ar: 'الموعد النهائي للتقرير يوم الخميس.' },
      { term: 'task', pos: 'noun', ar: 'مهمة', def_en: 'a piece of work to be done', example: 'I will assign the tasks after the meeting.', example_ar: 'سأوزّع المهام بعد الاجتماع.' },
      { term: 'priority', pos: 'noun', ar: 'أولوية', def_en: 'the most important thing to do first', example: 'The launch is our top priority this month.', example_ar: 'الإطلاق هو أولويتنا الأولى هذا الشهر.' },
      { term: 'update', pos: 'noun/verb', ar: 'مستجدات / يُحدّث', def_en: 'the latest news about progress', example: 'Can you give us a quick update?', example_ar: 'هل يمكن إعطاؤنا آخر المستجدات باختصار؟' },
      { term: 'follow up', pos: 'verb', ar: 'يتابع', def_en: 'to check on something after it was discussed', example: 'I will follow up with the design team.', example_ar: 'سأتابع الموضوع مع فريق التصميم.' },
      { term: 'action item', pos: 'noun', ar: 'بند تنفيذي', def_en: 'a specific task agreed in a meeting', example: 'We ended the meeting with five action items.', example_ar: 'أنهينا الاجتماع بخمسة بنود تنفيذية.' },
      { term: 'on track', pos: 'phrase', ar: 'يسير حسب الخطة', def_en: 'progressing as planned', example: 'The campaign is on track for next week.', example_ar: 'الحملة تسير حسب الخطة للأسبوع القادم.' },
      { term: 'behind schedule', pos: 'phrase', ar: 'متأخر عن الجدول', def_en: 'later than planned', example: 'The video is two days behind schedule.', example_ar: 'الفيديو متأخر يومين عن الجدول.' },
      { term: 'wrap up', pos: 'verb', ar: 'يختتم', def_en: 'to finish a meeting or discussion', example: "Let's wrap up — thank you everyone.", example_ar: 'لنختتم الاجتماع — شكرًا للجميع.' },
    ],
    phrases: [
      { en: "Let's get started — first item on the agenda is …", ar: 'لنبدأ — أول بند في جدول الأعمال هو …', context_ar: 'افتتاحية الاجتماع القيادية' },
      { en: 'Sara, can you take this task?', ar: 'سارة، هل يمكنك تولّي هذه المهمة؟', context_ar: 'توزيع مهمة بصيغة محترمة' },
      { en: 'I need this by Thursday, end of day.', ar: 'أحتاج هذا قبل نهاية دوام الخميس.', context_ar: 'موعد نهائي واضح لا لبس فيه' },
      { en: 'Good point — but let’s stay on topic.', ar: 'نقطة جيدة — لكن لنبقَ في صلب الموضوع.', context_ar: 'إعادة النقاش لمساره بلطف' },
      { en: 'I hear both sides. Here’s what we’ll do.', ar: 'أسمع الرأيين، وهذا ما سنفعله.', context_ar: 'حسم القرار بعد خلاف' },
      { en: "To summarize, our action items are …", ar: 'تلخيصًا، بنودنا التنفيذية هي …', context_ar: 'الختام المهني للاجتماع' },
    ],
    roleplay: {
      title_en: 'Run the weekly marketing meeting',
      ai_role: 'You are "Omar", a member of the learner\'s marketing team in the weekly meeting. Give a short update when asked (the social media posts are ready, but the product photos are two days late). At some point, politely disagree with a colleague\'s idea of pausing ads, and ask your manager (the learner) to decide. Accept their decision and ask what your next task is.',
      student_role: 'You are the marketing manager leading your weekly team meeting.',
      setting_ar: 'الاجتماع الأسبوعي لفريق التسويق — بقيادتك',
      prompt_en: 'Open the meeting, ask for updates, make a decision about the ads, and assign one task with a deadline.',
      prompt_ar: 'إدارة الاجتماع: الافتتاح، طلب المستجدات، حسم قرار الإعلانات، وتوزيع مهمة بموعد نهائي.',
      useful_phrases: ["Let's get started", 'Can you give us a quick update?', "Here's what we'll do", 'I need this by …'],
    },
    writing_task: {
      title_ar: 'محضر اجتماع مختصر',
      prompt_en: 'Write a short meeting summary email to your team: what was discussed, the decision made, and 3 action items with owners and deadlines.',
      prompt_ar: 'كتابة ملخص اجتماع للفريق: ما نوقش، القرار المتخذ، وثلاثة بنود تنفيذية بأسماء ومواعيد.',
      min_words: 60, max_words: 130,
      hints: ['البنود التنفيذية بصيغة: Task — Owner — Deadline', 'القرار في جملة واحدة واضحة', 'الافتتاح بشكر قصير غير متكلف'],
    },
  },
  {
    module_number: 4,
    title_ar: 'الموجز التسويقي (Brief)',
    title_en: 'The Marketing Brief',
    estimated_minutes: 30,
    scenario_ar: 'حملة جديدة على وشك الانطلاق، والوكالة الإبداعية تنتظر موجزًا (Brief) واضحًا: الهدف، الجمهور، الرسالة، الميزانية، والجدول الزمني. الموجز الضعيف يعني حملة ضعيفة.',
    scenario_en: 'A new campaign is about to launch, and the creative agency is waiting for a clear brief: objective, audience, message, budget, and timeline. A weak brief means a weak campaign.',
    objectives: [
      { ar: 'شرح عناصر الموجز التسويقي الخمسة بالإنجليزية', en: 'Explain the five elements of a marketing brief in English' },
      { ar: 'تحديد هدف ذكي قابل للقياس', en: 'Define a measurable, specific objective' },
      { ar: 'الإجابة على أسئلة الوكالة التوضيحية', en: "Answer the agency's clarifying questions" },
    ],
    vocabulary: [
      { term: 'brief', pos: 'noun', ar: 'موجز تسويقي', def_en: 'a short document explaining what a campaign must achieve', example: 'I sent the agency a one-page brief.', example_ar: 'أرسلت للوكالة موجزًا من صفحة واحدة.' },
      { term: 'objective', pos: 'noun', ar: 'هدف', def_en: 'the specific result a campaign must achieve', example: 'The objective is 1,000 new subscribers.', example_ar: 'الهدف هو ألف مشترك جديد.' },
      { term: 'key message', pos: 'noun', ar: 'الرسالة الأساسية', def_en: 'the one idea the audience must remember', example: 'The key message is "fast delivery, every time".', example_ar: 'الرسالة الأساسية: «توصيل سريع، في كل مرة».' },
      { term: 'budget', pos: 'noun', ar: 'ميزانية', def_en: 'the money available for the campaign', example: 'The budget for this campaign is 50,000 riyals.', example_ar: 'ميزانية هذه الحملة خمسون ألف ريال.' },
      { term: 'timeline', pos: 'noun', ar: 'الجدول الزمني', def_en: 'the schedule of when things happen', example: 'The timeline is six weeks from brief to launch.', example_ar: 'الجدول الزمني ستة أسابيع من الموجز إلى الإطلاق.' },
      { term: 'deliverables', pos: 'noun', ar: 'المخرجات المطلوبة', def_en: 'the actual things the agency must produce', example: 'The deliverables are three videos and ten posts.', example_ar: 'المخرجات: ثلاثة فيديوهات وعشرة منشورات.' },
      { term: 'tone of voice', pos: 'noun', ar: 'نبرة الخطاب', def_en: 'the personality of the brand in its words', example: 'Our tone of voice is warm and simple.', example_ar: 'نبرة خطابنا دافئة وبسيطة.' },
      { term: 'launch date', pos: 'noun', ar: 'تاريخ الإطلاق', def_en: 'the day the campaign goes live', example: 'The launch date is the first of Ramadan.', example_ar: 'تاريخ الإطلاق أول رمضان.' },
      { term: 'measurable', pos: 'adj', ar: 'قابل للقياس', def_en: 'possible to measure with numbers', example: 'Every objective must be measurable.', example_ar: 'كل هدف يجب أن يكون قابلًا للقياس.' },
      { term: 'scope', pos: 'noun', ar: 'نطاق العمل', def_en: 'what is included in the project and what is not', example: 'Printing is outside the scope of this brief.', example_ar: 'الطباعة خارج نطاق هذا الموجز.' },
    ],
    phrases: [
      { en: 'The main objective of this campaign is …', ar: 'الهدف الأساسي لهذه الحملة هو …', context_ar: 'فتح شرح الموجز' },
      { en: "We're targeting … aged … in …", ar: 'نستهدف … بأعمار … في …', context_ar: 'وصف الجمهور بدقة' },
      { en: 'The one thing people should remember is …', ar: 'الشيء الوحيد الذي يجب أن يتذكره الناس هو …', context_ar: 'تثبيت الرسالة الأساسية' },
      { en: 'The budget is capped at …', ar: 'سقف الميزانية هو …', context_ar: 'تحديد الميزانية بصيغة حازمة' },
      { en: 'Is anything unclear so far?', ar: 'هل هناك أي نقطة غير واضحة حتى الآن؟', context_ar: 'فحص الفهم قبل الانتقال' },
      { en: "That's out of scope for this phase.", ar: 'هذا خارج نطاق هذه المرحلة.', context_ar: 'رد مهني على طلبات إضافية' },
    ],
    roleplay: {
      title_en: 'Brief the creative agency',
      ai_role: 'You are "Lina", an account manager at a creative agency, on a call to receive a campaign brief from the learner. Ask about the objective, the target audience, the key message, the budget, and the launch date — one at a time. Ask one tricky clarifying question ("Should the ads be in Arabic, English, or both?") and one out-of-scope request ("Could we also redesign your logo?") to see how they respond.',
      student_role: 'You are the marketing manager briefing the agency on a new campaign (real or imagined).',
      setting_ar: 'مكالمة تسليم الموجز مع مديرة حسابات في الوكالة',
      prompt_en: 'Deliver a complete campaign brief: objective, audience, message, budget, timeline — and handle questions.',
      prompt_ar: 'تسليم موجز حملة كامل: الهدف، الجمهور، الرسالة، الميزانية، والجدول الزمني، مع الرد على الأسئلة.',
      useful_phrases: ['The main objective is …', "We're targeting …", 'The budget is capped at …', "That's out of scope."],
    },
    writing_task: {
      title_ar: 'كتابة موجز من صفحة واحدة',
      prompt_en: 'Write a one-page campaign brief with these headings: Objective, Target Audience, Key Message, Budget, Timeline, Deliverables.',
      prompt_ar: 'كتابة موجز حملة من صفحة واحدة بالعناوين: الهدف، الجمهور المستهدف، الرسالة الأساسية، الميزانية، الجدول الزمني، المخرجات.',
      min_words: 80, max_words: 160,
      hints: ['الهدف رقم + مدة: "X خلال Y"', 'الرسالة الأساسية جملة واحدة فقط', 'المخرجات قائمة محددة بالعدد'],
    },
  },
  {
    module_number: 5,
    title_ar: 'عرض نتائج الحملة',
    title_en: 'Presenting Campaign Results',
    estimated_minutes: 30,
    scenario_ar: 'انتهت الحملة، وغدًا اجتماع النتائج. الأرقام جيدة في الوصول والتفاعل، لكن التحويل أقل من المستهدف. المطلوب: عرض صادق وواثق يشرح الأرقام ويقترح الخطوة القادمة.',
    scenario_en: 'The campaign has ended, and tomorrow is the results meeting. Reach and engagement are good, but conversion is below target. Needed: an honest, confident presentation that explains the numbers and proposes the next step.',
    objectives: [
      { ar: 'قراءة مؤشرات الأداء الأساسية بالإنجليزية', en: 'Read the core performance metrics in English' },
      { ar: 'عرض نتائج مختلطة (جيدة وضعيفة) بمصداقية', en: 'Present mixed results (good and weak) credibly' },
      { ar: 'تحويل الأرقام إلى توصية عملية', en: 'Turn numbers into a practical recommendation' },
    ],
    vocabulary: [
      { term: 'ROI (return on investment)', pos: 'noun', ar: 'العائد على الاستثمار', def_en: 'how much money you got back compared to what you spent', example: 'The campaign ROI was 3 to 1.', example_ar: 'العائد على الاستثمار كان ٣ مقابل ١.' },
      { term: 'reach', pos: 'noun', ar: 'الوصول', def_en: 'how many people saw the campaign', example: 'The reach passed two million users.', example_ar: 'تجاوز الوصول مليوني مستخدم.' },
      { term: 'engagement', pos: 'noun', ar: 'التفاعل', def_en: 'likes, comments, shares — how people interacted', example: 'Engagement doubled compared to last campaign.', example_ar: 'تضاعف التفاعل مقارنة بالحملة السابقة.' },
      { term: 'conversion rate', pos: 'noun', ar: 'معدل التحويل', def_en: 'the percentage of people who took the action you wanted', example: 'The conversion rate was 2.1%.', example_ar: 'كان معدل التحويل ٢٫١٪.' },
      { term: 'click-through rate (CTR)', pos: 'noun', ar: 'معدل النقر', def_en: 'the percentage of viewers who clicked', example: 'A 4% CTR is strong for this industry.', example_ar: 'معدل نقر ٤٪ يُعد قويًا في هذا القطاع.' },
      { term: 'impressions', pos: 'noun', ar: 'مرات الظهور', def_en: 'the number of times an ad was shown', example: 'We bought five million impressions.', example_ar: 'اشترينا خمسة ملايين ظهور.' },
      { term: 'increase / decrease', pos: 'verb', ar: 'يرتفع / ينخفض', def_en: 'to go up / to go down', example: 'Sales increased by 18% during the campaign.', example_ar: 'ارتفعت المبيعات ١٨٪ خلال الحملة.' },
      { term: 'below target', pos: 'phrase', ar: 'دون المستهدف', def_en: 'less than what was planned', example: 'Conversions came in below target.', example_ar: 'جاءت التحويلات دون المستهدف.' },
      { term: 'insight', pos: 'noun', ar: 'خلاصة تحليلية', def_en: 'a useful lesson learned from the data', example: 'The key insight: video outperformed images.', example_ar: 'الخلاصة الأهم: الفيديو تفوّق على الصور.' },
      { term: 'recommendation', pos: 'noun', ar: 'توصية', def_en: 'the suggested next action', example: 'My recommendation is to move budget to video.', example_ar: 'توصيتي نقل الميزانية إلى الفيديو.' },
    ],
    phrases: [
      { en: 'Let me walk you through the numbers.', ar: 'دعوني أستعرض الأرقام معكم.', context_ar: 'افتتاح عرض النتائج' },
      { en: 'Reach exceeded our target by 30%.', ar: 'تجاوز الوصول مستهدفنا بنسبة ٣٠٪.', context_ar: 'تقديم الخبر الجيد بالأرقام' },
      { en: 'To be transparent, conversion fell short.', ar: 'بكل شفافية، التحويل جاء أقل من المطلوب.', context_ar: 'مصارحة تبني الثقة' },
      { en: 'The data tells us that …', ar: 'تخبرنا البيانات أن …', context_ar: 'الانتقال من الأرقام إلى الخلاصة' },
      { en: 'Based on this, I recommend …', ar: 'بناءً على ذلك، أوصي بـ …', context_ar: 'الانتهاء بتوصية عملية' },
      { en: 'Happy to take questions.', ar: 'يسعدني الإجابة على أسئلتكم.', context_ar: 'فتح باب الأسئلة بثقة' },
    ],
    roleplay: {
      title_en: 'Present results to a sharp stakeholder',
      ai_role: 'You are "Mr. Khalid", a results-focused commercial director listening to the learner present campaign results. Ask for the numbers (reach, engagement, conversion). When they mention the weak conversion, ask "Why did that happen?" and "What will you do differently next time?". Be demanding but fair, and end by asking for their single recommendation.',
      student_role: 'You are the marketing manager presenting your campaign results.',
      setting_ar: 'اجتماع عرض النتائج أمام المدير التجاري',
      prompt_en: 'Present mixed campaign results honestly, explain the weak metric, and close with one recommendation.',
      prompt_ar: 'عرض نتائج مختلطة بصدق، تفسير المؤشر الضعيف، والختام بتوصية واحدة.',
      useful_phrases: ['Let me walk you through the numbers.', 'To be transparent, …', 'The data tells us that …', 'Based on this, I recommend …'],
    },
    writing_task: {
      title_ar: 'ملخص تنفيذي للنتائج',
      prompt_en: 'Write an executive summary of campaign results: 3 key numbers, one honest weakness, one insight, and one recommendation.',
      prompt_ar: 'كتابة ملخص تنفيذي لنتائج الحملة: ثلاثة أرقام رئيسية، نقطة ضعف بصدق، خلاصة تحليلية، وتوصية.',
      min_words: 70, max_words: 140,
      hints: ['كل رقم مع مقارنة: vs target / vs last campaign', 'نقطة الضعف بدون تبرير مفرط', 'التوصية قابلة للتنفيذ خلال شهر'],
    },
  },
  {
    module_number: 6,
    title_ar: 'استراتيجية المحتوى والسوشيال',
    title_en: 'Social & Content Strategy',
    estimated_minutes: 25,
    scenario_ar: 'جلسة عصف ذهني لخطة محتوى الربع القادم: أي منصات؟ أي نوع محتوى؟ وكيف نرد على ترند انتشر فجأة؟ النقاش كله بالإنجليزية مع مستشار المحتوى الجديد.',
    scenario_en: "A brainstorming session for next quarter's content plan: which platforms? What content types? And how to react to a sudden trend? The whole discussion is in English with the new content consultant.",
    objectives: [
      { ar: 'مناقشة خطة محتوى عبر المنصات المختلفة', en: 'Discuss a content plan across platforms' },
      { ar: 'اقتراح أفكار والدفاع عنها في عصف ذهني', en: 'Pitch and defend ideas in a brainstorm' },
      { ar: 'اتخاذ موقف من الترندات بمنطق العلامة', en: "Take a position on trends using the brand's logic" },
    ],
    vocabulary: [
      { term: 'content', pos: 'noun', ar: 'محتوى', def_en: 'the posts, videos, and articles a brand publishes', example: 'We publish content three times a week.', example_ar: 'ننشر محتوى ثلاث مرات في الأسبوع.' },
      { term: 'platform', pos: 'noun', ar: 'منصة', def_en: 'a social network like X, Instagram or TikTok', example: 'TikTok is our fastest-growing platform.', example_ar: 'تيك توك أسرع منصاتنا نموًا.' },
      { term: 'trend', pos: 'noun', ar: 'ترند / موجة رائجة', def_en: 'a topic suddenly popular online', example: 'The trend exploded overnight.', example_ar: 'انفجر الترند بين ليلة وضحاها.' },
      { term: 'audience', pos: 'noun', ar: 'الجمهور', def_en: 'the people who follow and watch you', example: 'Our audience is mostly under thirty.', example_ar: 'معظم جمهورنا دون الثلاثين.' },
      { term: 'post', pos: 'noun/verb', ar: 'منشور / ينشر', def_en: 'one piece of published content', example: 'The post reached half a million views.', example_ar: 'وصل المنشور إلى نصف مليون مشاهدة.' },
      { term: 'influencer', pos: 'noun', ar: 'مؤثر', def_en: 'a person with a large online following used in marketing', example: 'We partnered with two local influencers.', example_ar: 'تعاوننا مع مؤثرَين محليين.' },
      { term: 'organic', pos: 'adj', ar: 'غير مدفوع (طبيعي)', def_en: 'reach you get without paying for ads', example: 'Organic reach is harder every year.', example_ar: 'الوصول غير المدفوع يصعب عامًا بعد عام.' },
      { term: 'paid ads', pos: 'noun', ar: 'إعلانات مدفوعة', def_en: 'advertising you pay platforms to show', example: 'We support every launch with paid ads.', example_ar: 'ندعم كل إطلاق بإعلانات مدفوعة.' },
      { term: 'consistent', pos: 'adj', ar: 'متّسق / منتظم', def_en: 'always the same in style and schedule', example: 'A consistent posting schedule builds trust.', example_ar: 'جدول النشر المنتظم يبني الثقة.' },
      { term: 'brand voice', pos: 'noun', ar: 'صوت العلامة', def_en: 'the consistent personality in everything the brand says', example: 'The trend joke does not fit our brand voice.', example_ar: 'دعابة الترند لا تناسب صوت علامتنا.' },
    ],
    phrases: [
      { en: 'What if we tried …?', ar: 'ماذا لو جرّبنا …؟', context_ar: 'طرح فكرة في العصف الذهني' },
      { en: 'Building on your idea, we could …', ar: 'بالبناء على فكرتك، يمكننا …', context_ar: 'تطوير فكرة زميل بدل رفضها' },
      { en: "I'm not sure that fits our brand.", ar: 'لا أظن أن هذا يناسب علامتنا.', context_ar: 'اعتراض مهذب بمنطق العلامة' },
      { en: "Let's test it on a small budget first.", ar: 'لنجرّبها بميزانية صغيرة أولًا.', context_ar: 'حل وسط عملي لفكرة مختلَف عليها' },
      { en: 'Our audience expects … from us.', ar: 'جمهورنا يتوقع منا …', context_ar: 'تحكيم الجمهور في القرار' },
      { en: "Let's lock the plan for Q3.", ar: 'لنعتمد خطة الربع الثالث.', context_ar: 'إغلاق الجلسة بقرار' },
    ],
    roleplay: {
      title_en: 'Brainstorm with the content consultant',
      ai_role: 'You are "Maya", an energetic content consultant brainstorming next quarter\'s content plan with the learner. Suggest a bold idea (jumping on a viral comedy trend) and ask for their opinion. Ask which platforms they want to prioritize and why, and what content their audience loves most. If they disagree with the trend idea, ask them to propose an alternative.',
      student_role: 'You are the marketing manager deciding the content strategy.',
      setting_ar: 'جلسة عصف ذهني مع مستشارة المحتوى',
      prompt_en: 'Discuss the content plan: priorities, platforms, and take a clear position on a trend idea.',
      prompt_ar: 'نقاش خطة المحتوى: الأولويات والمنصات وموقف واضح من فكرة ترند.',
      useful_phrases: ['What if we tried …?', "I'm not sure that fits our brand.", "Let's test it on a small budget first.", 'Our audience expects …'],
    },
    writing_task: {
      title_ar: 'خطة محتوى أسبوعية',
      prompt_en: 'Write a one-week content plan: for each of 3 platforms, the content type, the topic, and why it fits that platform.',
      prompt_ar: 'كتابة خطة محتوى لأسبوع: لكل منصة من ثلاث منصات، نوع المحتوى والموضوع وسبب مناسبته للمنصة.',
      min_words: 60, max_words: 130,
      hints: ['لكل منصة جمهور وأسلوب مختلف — إظهار هذا الفهم', 'نوع المحتوى محدد: reel / thread / story', 'سطر واحد يشرح "لماذا هنا؟" لكل منصة'],
    },
  },
  {
    module_number: 7,
    title_ar: 'التفاوض مع الوكالات والموردين',
    title_en: 'Negotiating with Agencies & Vendors',
    estimated_minutes: 30,
    scenario_ar: 'عرض سعر الوكالة جاء أعلى من الميزانية بـ ٤٠٪. الإلغاء ليس خيارًا، والقبول ليس خيارًا. الحل الوحيد: تفاوض هادئ يصل لاتفاق يحفظ العلاقة والميزانية معًا.',
    scenario_en: "The agency's quote came in 40% over budget. Cancelling is not an option, and accepting is not an option. The only way: a calm negotiation that protects both the relationship and the budget.",
    objectives: [
      { ar: 'فتح تفاوض سعري بدون توتر', en: 'Open a price negotiation without tension' },
      { ar: 'تقديم عرض مقابل ومقايضات ذكية', en: 'Make counter-offers and smart trade-offs' },
      { ar: 'إغلاق اتفاق واضح البنود', en: 'Close an agreement with clear terms' },
    ],
    vocabulary: [
      { term: 'quote / quotation', pos: 'noun', ar: 'عرض سعر', def_en: 'the price a supplier offers for work', example: 'Their quote was higher than expected.', example_ar: 'جاء عرض سعرهم أعلى من المتوقع.' },
      { term: 'negotiate', pos: 'verb', ar: 'يتفاوض', def_en: 'to discuss until both sides agree', example: 'We negotiated for two weeks.', example_ar: 'تفاوضنا لأسبوعين.' },
      { term: 'discount', pos: 'noun', ar: 'خصم', def_en: 'a reduction in price', example: 'They offered a 10% discount for annual contracts.', example_ar: 'قدّموا خصم ١٠٪ للعقود السنوية.' },
      { term: 'counter-offer', pos: 'noun', ar: 'عرض مقابل', def_en: 'a different offer you make in response', example: 'We sent a counter-offer the next morning.', example_ar: 'أرسلنا عرضًا مقابلًا صباح اليوم التالي.' },
      { term: 'terms', pos: 'noun', ar: 'الشروط / البنود', def_en: 'the conditions of an agreement', example: 'The payment terms are 30 days.', example_ar: 'شروط الدفع ثلاثون يومًا.' },
      { term: 'compromise', pos: 'noun/verb', ar: 'حل وسط / يتنازل جزئيًا', def_en: 'an agreement where each side gives something', example: 'We reached a fair compromise.', example_ar: 'وصلنا إلى حل وسط عادل.' },
      { term: 'contract', pos: 'noun', ar: 'عقد', def_en: 'the signed legal agreement', example: 'The contract runs for one year.', example_ar: 'مدة العقد سنة واحدة.' },
      { term: 'win-win', pos: 'adj', ar: 'مكسب للطرفين', def_en: 'good for both sides', example: 'A longer contract at a lower rate is win-win.', example_ar: 'عقد أطول بسعر أقل مكسب للطرفين.' },
      { term: 'walk away', pos: 'verb', ar: 'ينسحب من الصفقة', def_en: 'to leave a deal that is not good enough', example: 'We were ready to walk away at that price.', example_ar: 'كنا مستعدين للانسحاب عند ذلك السعر.' },
      { term: 'value for money', pos: 'phrase', ar: 'قيمة مقابل السعر', def_en: 'getting enough quality for what you pay', example: 'It must be value for money, not just cheap.', example_ar: 'المطلوب قيمة مقابل السعر، لا الأرخص فقط.' },
    ],
    phrases: [
      { en: 'We value the partnership, and I want this to work.', ar: 'نقدّر هذه الشراكة، وأريد لهذا الاتفاق أن ينجح.', context_ar: 'افتتاحية تحفظ العلاقة قبل الأرقام' },
      { en: "Honestly, that's above our budget.", ar: 'بصراحة، هذا فوق ميزانيتنا.', context_ar: 'رفض السعر بدون رفض الشراكة' },
      { en: 'What can you do at … ?', ar: 'ما الذي يمكنكم تقديمه بمبلغ …؟', context_ar: 'قلب التفاوض: السعر ثابت والمحتوى متغير' },
      { en: 'If we commit to six months, can you improve the rate?', ar: 'إذا التزمنا ستة أشهر، هل يتحسن السعر؟', context_ar: 'مقايضة ذكية: التزام مقابل خصم' },
      { en: "Let's meet in the middle.", ar: 'لنلتقِ في منتصف الطريق.', context_ar: 'اقتراح الحل الوسط' },
      { en: 'Can you send the updated terms in writing?', ar: 'هل يمكن إرسال الشروط المحدّثة كتابيًا؟', context_ar: 'إغلاق احترافي يوثّق الاتفاق' },
    ],
    roleplay: {
      title_en: 'Negotiate the agency quote down',
      ai_role: 'You are "James", an account director at a creative agency defending a 150,000-riyal quote that is 40% over the learner\'s budget. Justify the price (senior team, video production costs). Resist the first request for a discount, but respond to smart trade-offs (longer commitment, fewer deliverables, phased payment). Aim to land near 115,000 if they negotiate well. Stay friendly and professional.',
      student_role: 'You are the marketing manager negotiating to fit a 105,000-riyal budget.',
      setting_ar: 'مكالمة تفاوض على عرض سعر الوكالة',
      prompt_en: 'Negotiate the quote: open warmly, push back on price, propose a trade-off, and close with clear terms.',
      prompt_ar: 'التفاوض على عرض السعر: افتتاح ودّي، اعتراض على السعر، اقتراح مقايضة، وإغلاق ببنود واضحة.',
      useful_phrases: ["Honestly, that's above our budget.", 'What can you do at …?', 'If we commit to …, can you improve the rate?', "Let's meet in the middle."],
    },
    writing_task: {
      title_ar: 'إيميل ما بعد التفاوض',
      prompt_en: 'Write a follow-up email confirming the negotiated agreement: the agreed price, what is included, the timeline, and the next step.',
      prompt_ar: 'كتابة إيميل يؤكد الاتفاق بعد التفاوض: السعر المتفق عليه، ما يشمله، الجدول الزمني، والخطوة التالية.',
      min_words: 60, max_words: 120,
      hints: ['البداية بشكر على المرونة', 'البنود بنقاط واضحة لا فقرة واحدة', 'الختام بخطوة تالية وتاريخ'],
    },
  },
  {
    module_number: 8,
    title_ar: 'البريد التسويقي الاحترافي',
    title_en: 'Professional Marketing Emails',
    estimated_minutes: 25,
    scenario_ar: 'صندوق الوارد مليء: إيميل لإقناع شريك محتمل، رد على عميل غاضب من حملة، وإيميل داخلي للإدارة. لكل واحد نبرة مختلفة — والكلمة المكتوبة تبقى.',
    scenario_en: 'A full inbox: an email to win a potential partner, a reply to a client upset about a campaign, and an internal email to management. Each needs a different tone — and the written word stays.',
    objectives: [
      { ar: 'كتابة إيميلات بثلاث نبرات: إقناعية، اعتذارية، داخلية', en: 'Write emails in three tones: persuasive, apologetic, internal' },
      { ar: 'صياغة سطر عنوان يُفتح', en: 'Write a subject line that gets opened' },
      { ar: 'الرد على الانزعاج بمهنية تحفظ العلاقة', en: 'Respond to frustration professionally, keeping the relationship' },
    ],
    vocabulary: [
      { term: 'subject line', pos: 'noun', ar: 'سطر العنوان', def_en: 'the title of an email', example: 'A clear subject line doubles open rates.', example_ar: 'سطر العنوان الواضح يضاعف نسبة الفتح.' },
      { term: 'recipient', pos: 'noun', ar: 'المستلِم', def_en: 'the person who receives the email', example: 'Know your recipient before you write.', example_ar: 'معرفة المستلِم تسبق الكتابة.' },
      { term: 'attach / attachment', pos: 'verb/noun', ar: 'يرفق / مرفق', def_en: 'to add a file to an email', example: 'Please find the report attached.', example_ar: 'التقرير في المرفقات.' },
      { term: 'regarding', pos: 'prep', ar: 'بخصوص', def_en: 'about; on the subject of', example: "I'm writing regarding our meeting on Sunday.", example_ar: 'أكتب بخصوص اجتماعنا يوم الأحد.' },
      { term: 'apologize', pos: 'verb', ar: 'يعتذر', def_en: 'to say sorry formally', example: 'We apologize for the confusion the ad caused.', example_ar: 'نعتذر عن اللبس الذي سبّبه الإعلان.' },
      { term: 'appreciate', pos: 'verb', ar: 'يقدّر', def_en: 'to be thankful for', example: 'I appreciate your quick reply.', example_ar: 'أقدّر سرعة ردّك.' },
      { term: 'follow-up email', pos: 'noun', ar: 'إيميل متابعة', def_en: 'an email checking on something previously discussed', example: 'Send a follow-up email if there is no reply in three days.', example_ar: 'يُرسل إيميل متابعة إذا لم يصل رد خلال ثلاثة أيام.' },
      { term: 'call to action', pos: 'noun', ar: 'دعوة لاتخاذ إجراء', def_en: 'the one thing you want the reader to do', example: 'End every marketing email with one call to action.', example_ar: 'يُختتم كل إيميل تسويقي بدعوة واحدة لاتخاذ إجراء.' },
      { term: 'concise', pos: 'adj', ar: 'موجز', def_en: 'short and clear', example: 'Busy people only read concise emails.', example_ar: 'المشغولون لا يقرؤون إلا الإيميلات الموجزة.' },
      { term: 'best regards', pos: 'phrase', ar: 'مع أطيب التحيات', def_en: 'a polite professional closing', example: 'Best regards, Sara — Marketing Manager.', example_ar: 'مع أطيب التحيات، سارة — إدارة التسويق.' },
    ],
    phrases: [
      { en: "I hope this email finds you well.", ar: 'أتمنى أن يصلك هذا الإيميل وأنت بخير.', context_ar: 'افتتاحية كلاسيكية آمنة' },
      { en: "I'm reaching out because …", ar: 'أتواصل معك لأن …', context_ar: 'دخول مباشر في سبب الإيميل' },
      { en: 'Thank you for bringing this to our attention.', ar: 'شكرًا لتنبيهنا إلى هذا الأمر.', context_ar: 'أول سطر في الرد على شكوى' },
      { en: 'We take full responsibility, and here is what we will do.', ar: 'نتحمل المسؤولية كاملة، وهذا ما سنفعله.', context_ar: 'اعتذار مهني يتبعه إجراء' },
      { en: 'Would you be available for a quick call this week?', ar: 'هل لديك وقت لمكالمة قصيرة هذا الأسبوع؟', context_ar: 'دعوة لإجراء واضحة وسهلة' },
      { en: 'Looking forward to hearing from you.', ar: 'بانتظار ردّك الكريم.', context_ar: 'إغلاق يستدعي الرد بلطف' },
    ],
    roleplay: {
      title_en: 'The upset client calls about the campaign',
      ai_role: 'You are "Ms. Huda", a client whose ad campaign showed the wrong discount (20% instead of 15%) and customers are now demanding it. You are upset but reasonable. Explain the problem, ask how this happened, and ask what they will do about it. Calm down if the learner apologizes professionally, takes responsibility, and proposes a concrete fix; stay firm if they make excuses.',
      student_role: 'You are the marketing manager handling the mistake your team made.',
      setting_ar: 'مكالمة مع عميلة منزعجة بسبب خطأ في الحملة',
      prompt_en: 'Handle the complaint: listen, apologize professionally, take responsibility, and propose a concrete fix.',
      prompt_ar: 'إدارة الشكوى: الإصغاء، الاعتذار المهني، تحمّل المسؤولية، واقتراح حل ملموس.',
      useful_phrases: ['Thank you for bringing this to our attention.', 'We take full responsibility.', 'Here is what we will do.', 'I appreciate your patience.'],
    },
    writing_task: {
      title_ar: 'إيميل الاعتذار والحل',
      prompt_en: 'Write the follow-up email to the upset client: acknowledge the mistake, apologize without excuses, state the fix and the compensation, and end with a relationship-building line.',
      prompt_ar: 'كتابة إيميل المتابعة للعميلة: الإقرار بالخطأ، اعتذار بدون تبريرات، توضيح الحل والتعويض، وختام يرمم العلاقة.',
      min_words: 60, max_words: 120,
      hints: ['سطر العنوان يطمئن لا يخيف', 'الاعتذار أولًا ثم الحل — بدون "لكن"', 'تعويض محدد: ماذا ومتى'],
    },
  },
  {
    module_number: 9,
    title_ar: 'فهم العميل وبحوث السوق',
    title_en: 'Customer Insights & Market Research',
    estimated_minutes: 25,
    scenario_ar: 'قبل إطلاق منتج جديد، جلسة مع باحثة سوق لقراءة نتائج الاستبيان ومجموعة التركيز: من هو العميل فعلًا؟ ماذا يريد؟ ولماذا اختار المنافس في آخر مرة؟',
    scenario_en: 'Before a new product launch, a session with a market researcher to read the survey and focus-group results: who is the customer really? What do they want? And why did they choose the competitor last time?',
    objectives: [
      { ar: 'مناقشة نتائج بحث سوقي بالإنجليزية', en: 'Discuss market research findings in English' },
      { ar: 'وصف شرائح العملاء واحتياجاتهم', en: 'Describe customer segments and their needs' },
      { ar: 'تحويل البحث إلى قرار تسويقي', en: 'Turn research into a marketing decision' },
    ],
    vocabulary: [
      { term: 'market research', pos: 'noun', ar: 'بحوث السوق', def_en: 'studying customers and competitors before deciding', example: 'Market research saved us from a bad launch.', example_ar: 'أنقذتنا بحوث السوق من إطلاق فاشل.' },
      { term: 'survey', pos: 'noun', ar: 'استبيان', def_en: 'a set of questions sent to many people', example: 'Two thousand customers answered the survey.', example_ar: 'أجاب على الاستبيان ألفا عميل.' },
      { term: 'focus group', pos: 'noun', ar: 'مجموعة تركيز', def_en: 'a small group discussion to understand opinions deeply', example: 'The focus group hated the old packaging.', example_ar: 'لم تعجب العبوة القديمة مجموعة التركيز.' },
      { term: 'segment', pos: 'noun', ar: 'شريحة عملاء', def_en: 'a group of customers with similar needs', example: 'Young families are our biggest segment.', example_ar: 'العائلات الشابة هي أكبر شرائحنا.' },
      { term: 'consumer behavior', pos: 'noun', ar: 'سلوك المستهلك', def_en: 'how people decide and buy', example: 'Ramadan changes consumer behavior completely.', example_ar: 'رمضان يغيّر سلوك المستهلك تمامًا.' },
      { term: 'demand', pos: 'noun', ar: 'الطلب', def_en: 'how much customers want a product', example: 'Demand doubles in the summer.', example_ar: 'يتضاعف الطلب في الصيف.' },
      { term: 'pain point', pos: 'noun', ar: 'نقطة معاناة', def_en: 'a problem customers struggle with', example: 'Slow delivery is the biggest pain point.', example_ar: 'بطء التوصيل هو أكبر نقطة معاناة.' },
      { term: 'feedback', pos: 'noun', ar: 'آراء وملاحظات', def_en: 'what customers tell you about your product', example: 'We collect feedback after every order.', example_ar: 'نجمع الملاحظات بعد كل طلب.' },
      { term: 'positioning', pos: 'noun', ar: 'التموضع', def_en: 'the place a brand takes in the customer\'s mind', example: 'Our positioning is "premium but reachable".', example_ar: 'تموضعنا: «فاخر وفي المتناول».' },
      { term: 'data-driven', pos: 'adj', ar: 'مبني على البيانات', def_en: 'decided using data, not guessing', example: 'Every decision here is data-driven.', example_ar: 'كل قرار هنا مبني على البيانات.' },
    ],
    phrases: [
      { en: 'What does the data say about …?', ar: 'ماذا تقول البيانات عن …؟', context_ar: 'سؤال البحث الأساسي' },
      { en: 'The most surprising finding is …', ar: 'النتيجة الأكثر مفاجأة هي …', context_ar: 'إبراز أهم خلاصة' },
      { en: 'Our core segment is … who want …', ar: 'شريحتنا الأساسية هي … ويريدون …', context_ar: 'وصف الشريحة باحتياجها' },
      { en: 'Customers told us their biggest frustration is …', ar: 'أخبرنا العملاء أن أكبر إحباط لديهم هو …', context_ar: 'تقديم نقطة المعاناة بلسان العميل' },
      { en: 'Based on these findings, we should …', ar: 'بناءً على هذه النتائج، علينا أن …', context_ar: 'الانتقال من البحث إلى القرار' },
      { en: 'We need more data before deciding.', ar: 'نحتاج بيانات أكثر قبل القرار.', context_ar: 'موقف مهني عند نقص الأدلة' },
    ],
    roleplay: {
      title_en: 'Debrief with the market researcher',
      ai_role: 'You are "Dr. Sara", a market researcher presenting findings to the learner: 60% of surveyed customers find the current product "too complicated", the strongest segment is working mothers 28–40, and the competitor wins on faster delivery. Share these findings one at a time, then ask the learner: what surprised them, which segment to focus on and why, and what they will change in the next campaign based on the data.',
      student_role: 'You are the marketing manager turning research into decisions.',
      setting_ar: 'جلسة قراءة نتائج البحث مع باحثة السوق',
      prompt_en: 'Discuss the findings, choose a focus segment with reasons, and state one data-driven change.',
      prompt_ar: 'مناقشة النتائج، اختيار شريحة تركيز مع التعليل، وتحديد تغيير واحد مبني على البيانات.',
      useful_phrases: ['The most surprising finding is …', 'Our core segment is …', 'Based on these findings, we should …', 'What does the data say about …?'],
    },
    writing_task: {
      title_ar: 'ملف شخصية العميل',
      prompt_en: 'Write a customer persona for your main segment: name, age, job, goals, pain points, and how your product fits their life.',
      prompt_ar: 'كتابة ملف شخصية للعميل الأساسي: الاسم، العمر، العمل، الأهداف، نقاط المعاناة، وكيف يدخل المنتج في حياته.',
      min_words: 60, max_words: 130,
      hints: ['شخصية واحدة محددة أفضل من وصف عام', 'نقطتا معاناة على الأكثر — الأهم فقط', 'الربط بين المنتج ولحظة حقيقية في يومهم'],
    },
  },
  {
    module_number: 10,
    title_ar: 'عرض الحملة أمام الإدارة',
    title_en: 'Pitching to Leadership',
    estimated_minutes: 35,
    scenario_ar: 'اللحظة الكبرى: عرض حملة الربع القادم أمام الرئيس التنفيذي لطلب ميزانية ٢٠٠ ألف ريال. عشر دقائق، أسئلة صعبة، وقرار واحد: تمويل أو رفض. كل وحدات المسار السابقة تتجمع هنا.',
    scenario_en: "The big moment: pitching next quarter's campaign to the CEO to request a 200,000-riyal budget. Ten minutes, hard questions, one decision: funded or not. Everything from the previous modules comes together here.",
    objectives: [
      { ar: 'بناء عرض مقنع: مشكلة، حل، أرقام، طلب', en: 'Build a persuasive pitch: problem, solution, numbers, ask' },
      { ar: 'الرد على أسئلة تنفيذية صعبة تحت الضغط', en: 'Handle hard executive questions under pressure' },
      { ar: 'طلب الميزانية بثقة وإغلاق الموافقة', en: 'Ask for the budget confidently and close the approval' },
    ],
    vocabulary: [
      { term: 'pitch', pos: 'noun/verb', ar: 'عرض إقناعي / يقدّم عرضًا', def_en: 'a short persuasive presentation to win approval', example: 'The pitch lasted ten minutes.', example_ar: 'استغرق العرض الإقناعي عشر دقائق.' },
      { term: 'proposal', pos: 'noun', ar: 'مقترح', def_en: 'a written plan asking for approval', example: 'The proposal is on your desk.', example_ar: 'المقترح على مكتبك.' },
      { term: 'forecast', pos: 'noun/verb', ar: 'توقعات / يتوقع', def_en: 'a prediction of future numbers', example: 'We forecast a 25% sales increase.', example_ar: 'نتوقع ارتفاع المبيعات ٢٥٪.' },
      { term: 'projected revenue', pos: 'noun', ar: 'الإيرادات المتوقعة', def_en: 'the money expected to come in', example: 'Projected revenue is 1.2 million riyals.', example_ar: 'الإيرادات المتوقعة ١٫٢ مليون ريال.' },
      { term: 'risk', pos: 'noun', ar: 'مخاطرة', def_en: 'something that could go wrong', example: 'The main risk is a competitor launching first.', example_ar: 'المخاطرة الأساسية أن يسبقنا منافس بالإطلاق.' },
      { term: 'opportunity', pos: 'noun', ar: 'فرصة', def_en: 'a chance to gain something', example: 'Ramadan is our biggest opportunity.', example_ar: 'رمضان هو فرصتنا الأكبر.' },
      { term: 'approve / approval', pos: 'verb/noun', ar: 'يوافق / موافقة', def_en: 'to officially say yes', example: 'The CEO approved the budget.', example_ar: 'وافق الرئيس التنفيذي على الميزانية.' },
      { term: 'stakeholder', pos: 'noun', ar: 'صاحب مصلحة', def_en: 'anyone affected by or deciding on the project', example: 'All stakeholders attended the pitch.', example_ar: 'حضر العرضَ جميعُ أصحاب المصلحة.' },
      { term: 'bottom line', pos: 'noun', ar: 'خلاصة الأرباح / الخلاصة', def_en: 'the final profit; or the most important point', example: 'The bottom line: this campaign pays for itself.', example_ar: 'الخلاصة: هذه الحملة تغطي تكلفتها بنفسها.' },
      { term: 'confident', pos: 'adj', ar: 'واثق', def_en: 'sure about what you are saying', example: 'A confident pitch wins budgets.', example_ar: 'العرض الواثق يكسب الميزانيات.' },
    ],
    phrases: [
      { en: 'Thank you for your time — I’ll get straight to the point.', ar: 'شكرًا لوقتكم — سأدخل في صلب الموضوع مباشرة.', context_ar: 'افتتاحية تنفيذية تحترم الوقت' },
      { en: 'The opportunity in front of us is …', ar: 'الفرصة الماثلة أمامنا هي …', context_ar: 'بداية بالفرصة لا بالطلب' },
      { en: 'For an investment of …, we project …', ar: 'مقابل استثمار قدره …، نتوقع …', context_ar: 'ربط الطلب بالعائد في جملة واحدة' },
      { en: "That's a fair question. Here's the data.", ar: 'سؤال وجيه، وهذه البيانات.', context_ar: 'استقبال السؤال الصعب بثبات' },
      { en: 'The biggest risk is …, and our mitigation is …', ar: 'أكبر مخاطرة هي …، وخطتنا لاحتوائها هي …', context_ar: 'المصارحة بالمخاطرة مع حلها — مصدر ثقة' },
      { en: 'What I need from you today is approval for …', ar: 'ما أحتاجه منكم اليوم هو الموافقة على …', context_ar: 'الطلب الواضح — أهم جملة في العرض' },
    ],
    roleplay: {
      title_en: 'Pitch the campaign to the CEO',
      ai_role: 'You are "Mr. Fahad", a sharp, time-poor CEO hearing a budget pitch from the learner. Listen to the idea, then ask hard questions one at a time: "What is the expected return?", "What if it fails — what do we lose?", "Why now and not next quarter?". If their answers are reasonable and confident, approve the budget at the end and congratulate them warmly. If they avoid the questions, push once more before deciding.',
      student_role: 'You are the marketing manager pitching for a 200,000-riyal campaign budget.',
      setting_ar: 'اجتماع طلب الميزانية أمام الرئيس التنفيذي — تحدّي المسار الختامي',
      prompt_en: 'Deliver the pitch: opportunity, plan, numbers, risk, and a clear ask — then defend it under questioning.',
      prompt_ar: 'تقديم العرض: الفرصة، الخطة، الأرقام، المخاطرة، وطلب واضح — ثم الدفاع عنه أمام الأسئلة.',
      useful_phrases: ['I’ll get straight to the point.', 'For an investment of …, we project …', "That's a fair question. Here's the data.", 'What I need from you today is …'],
    },
    writing_task: {
      title_ar: 'المقترح التنفيذي النهائي',
      prompt_en: 'Write the one-page executive proposal for your campaign: the opportunity, the plan in 3 lines, the budget and projected return, the main risk with its mitigation, and the ask.',
      prompt_ar: 'كتابة المقترح التنفيذي النهائي: الفرصة، الخطة في ثلاثة أسطر، الميزانية والعائد المتوقع، المخاطرة الأساسية وحلها، والطلب.',
      min_words: 90, max_words: 180,
      hints: ['السطر الأول يلخص كل شيء: الطلب والعائد', 'رقمان فقط في الميزانية: التكلفة والعائد', 'الختام: قرار مطلوب بتاريخ محدد'],
    },
  },
]

async function main() {
  // 1) specialization upsert
  await runSQL(`
    insert into public.specializations (slug, title_ar, title_en, tagline_ar, icon, accent_color, sort_order)
    values (${DQ(SPEC.slug)}, ${DQ(SPEC.title_ar)}, ${DQ(SPEC.title_en)}, ${DQ(SPEC.tagline_ar)}, ${DQ(SPEC.icon)}, ${DQ(SPEC.accent_color)}, 1)
    on conflict (slug) do update set
      title_ar = excluded.title_ar, title_en = excluded.title_en,
      tagline_ar = excluded.tagline_ar, icon = excluded.icon,
      accent_color = excluded.accent_color, is_active = true;
  `)
  const [{ id: specId }] = await runSQL(`select id from public.specializations where slug = ${DQ(SPEC.slug)};`)
  console.log('specialization:', specId)

  // 2) modules upsert (one statement per module — content is large)
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
