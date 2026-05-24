#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 Block 3 (v3) — additional pattern families to close gap to 3,500.
// 8 new generator families: idioms, gerund_infinitive, used_to, some_any,
// conjunctions, quantifiers, time_clauses, wish_clauses.

const https = require('https')

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST', family: 4,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0,300)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
const esc = (s) => s == null ? 'NULL' : `$${'g'}$${String(s).replace(/\$g\$/g, '$_g_$')}$${'g'}$`
const jsonbVal = (v) => `${esc(JSON.stringify(v))}::jsonb`
const arrText = (a) => !a || a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

// ─── 1. IDIOMS ────────────────────────────────────────────────────────────
function genIdioms(level) {
  const items = [
    { idiom:'break the ice', meaning_ar:'يكسر الجمود / يبدأ محادثة', example:'She told a joke to break the ice.', distract:['يكسر الثلج حرفياً','ينهي اللقاء','يرفع الصوت'] },
    { idiom:'piece of cake', meaning_ar:'سهل جداً', example:'The test was a piece of cake.', distract:['شيء حلو','صعب','مرهق'] },
    { idiom:'hit the books', meaning_ar:'يبدأ الدراسة بجد', example:"I need to hit the books for finals.", distract:['يضرب الكتاب','يشتري كتباً','يبيع كتباً'] },
    { idiom:'under the weather', meaning_ar:'يشعر بتعب أو مرض خفيف', example:"I'm feeling under the weather today.", distract:['تحت المطر','بارد','حزين جداً'] },
    { idiom:'once in a blue moon', meaning_ar:'نادراً جداً', example:"I see him once in a blue moon.", distract:['مرة في الشهر','تحت ضوء القمر','عند الفجر'] },
    { idiom:'cost an arm and a leg', meaning_ar:'غالٍ جداً', example:"That car cost an arm and a leg.", distract:['أصاب يده وقدمه','مجاني','رخيص'] },
    { idiom:'spill the beans', meaning_ar:'يفشي سراً', example:"Don't spill the beans about the surprise.", distract:['يسكب الفاصوليا','يدفع المال','يطبخ'] },
    { idiom:'kill two birds with one stone', meaning_ar:'يحقق هدفين بفعل واحد', example:"By cycling to work I kill two birds with one stone.", distract:['يصيب طيرين','يخسر','ينتظر'] },
    { idiom:'when pigs fly', meaning_ar:'مستحيل / لن يحدث أبداً', example:"He'll apologize when pigs fly.", distract:['قريباً','بعد سنة','اليوم'] },
    { idiom:'beat around the bush', meaning_ar:'يلف ويدور / لا يدخل في الموضوع', example:"Stop beating around the bush and tell me.", distract:['يخاف','يتأخر','يكذب'] },
    { idiom:'rain on someone\'s parade', meaning_ar:'يفسد فرحته', example:"Sorry to rain on your parade, but the picnic is cancelled.", distract:['يحبه','يساعده','يهديه'] },
    { idiom:'pull someone\'s leg', meaning_ar:'يمزح معه / يخدعه ضحكاً', example:"Are you serious or just pulling my leg?", distract:['يجذبه','يلمسه','يجلسه'] },
    { idiom:'a hot potato', meaning_ar:'موضوع حساس وصعب', example:"This issue is a hot potato in our office.", distract:['طعام لذيذ','شيء سريع','سؤال سهل'] },
    { idiom:'see eye to eye', meaning_ar:'يتفق تماماً', example:"We see eye to eye on most things.", distract:['ينظر إليه','يخاف منه','يجاوبه'] },
    { idiom:'the ball is in your court', meaning_ar:'القرار/الدور عليك الآن', example:"I sent the offer; the ball is in your court.", distract:['تلعب كرة','أنت رياضي','حظك سعيد'] },
  ]
  const out = []
  for (const it of items) {
    out.push({
      level, exercise_type: 'mcq', skill: 'vocab',
      topic_tags: ['idioms','vocabulary','figurative_language'], difficulty: 4,
      prompt_en: `What does "${it.idiom}" mean? Example: ${it.example}`,
      correct_answer: { value: it.meaning_ar },
      distractors: it.distract,
      explanation_ar: `"${it.idiom}" تعني "${it.meaning_ar}". المصطلحات الإنجليزية لا تترجم حرفياً — احفظيها كوحدة كاملة مع المثال. هذا أهم فرق بين المتعلم المبتدئ والمتقدم.`,
    })
  }
  return out
}

// ─── 2. GERUND vs INFINITIVE ─────────────────────────────────────────────
function genGerundInfinitive(level) {
  const items = [
    { stem:"I enjoy ___ books.", correct:'reading', distract:['to read','read','to reading'], expl:'بعد enjoy نستخدم gerund (V-ing) دائماً: enjoy reading, enjoy swimming. لا نقول "enjoy to read".' },
    { stem:"I want ___ a new car.", correct:'to buy', distract:['buying','buy','to buying'], expl:'بعد want نستخدم infinitive (to + V1): want to buy. الفعل want من قائمة الأفعال التي تأخذ to-infinitive: want, decide, plan, hope.' },
    { stem:"She avoids ___ junk food.", correct:'eating', distract:['to eat','eat','to eating'], expl:'بعد avoid نستخدم gerund: avoid eating, avoid talking. القائمة المختصرة: enjoy, avoid, finish, suggest, mind, can\'t help — كلها gerund.' },
    { stem:"They decided ___ to Mecca for Umrah.", correct:'to travel', distract:['traveling','travel','to traveling'], expl:'decide + to + V1. الأفعال الأخرى المثلها: agree, refuse, choose, expect.' },
    { stem:"He kept ___ even when tired.", correct:'working', distract:['to work','work','to working'], expl:'keep (= استمر في) + gerund. keep working = استمر في العمل. لا نقول "keep to work".' },
    { stem:"I plan ___ Spanish next year.", correct:'to learn', distract:['learning','learn','to learning'], expl:'plan + to + V1. الفعل plan يخبر عن المستقبل ولذلك يأخذ to-infinitive.' },
    { stem:"I'm interested in ___ a new language.", correct:'learning', distract:['to learn','learn','to learning'], expl:'بعد حروف الجر (in, at, of, on, for) نستخدم دائماً gerund. interested IN learning, good AT swimming.' },
    { stem:"It started ___ heavily.", correct:'raining', distract:['to rain','rain','to raining'], expl:'start + gerund OR + infinitive (كلاهما صحيح). raining شائع أكثر للأحداث الطبيعية.' },
    { stem:"She suggested ___ a movie.", correct:'watching', distract:['to watch','watch','to watching'], expl:'suggest + gerund دائماً. لا نقول "suggest to watch". أيضاً: suggest that we watch (نمط آخر).' },
    { stem:"I expect ___ home by 9.", correct:'to be', distract:['being','be','to being'], expl:'expect + to + V1. expect to be home = أتوقع أن أكون في البيت.' },
    { stem:"They finished ___ the project last week.", correct:'completing', distract:['to complete','complete','to completing'], expl:'finish + gerund. finished completing = انتهوا من إكمال. لا نقول "finished to complete".' },
    { stem:"I'd like ___ you a question.", correct:'to ask', distract:['asking','ask','to asking'], expl:'would like + to + V1 (مهذّب). would like to ask = أحب أن أسأل.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['gerund_vs_infinitive','verb_patterns'], difficulty:3,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── 3. USED TO / BE USED TO / GET USED TO ───────────────────────────────
function genUsedTo(level) {
  const items = [
    { stem:"I ___ smoke, but I quit two years ago.", correct:'used to', distract:['use to','am used to','get used to'], expl:'used to + V1 = كنتُ في الماضي. للأشياء التي كنا نفعلها وما عدنا نفعلها. used to + V1 (دائماً مع الـ d).' },
    { stem:"She ___ working night shifts now.", correct:'is used to', distract:['used to','use to','get used to'], expl:'be used to + gerund = معتاد على. is used to working = معتادة على العمل. هذه عن حالة حالية، ليس عادة ماضية.' },
    { stem:"It took time but I ___ the new city.", correct:'got used to', distract:['used to','am used to','get use to'], expl:'get used to + gerund/noun = اعتاد على (تدريجياً). got used to (past) = اعتدت على. الفرق عن be used to: get يشير إلى عملية الاعتياد، be يشير إلى الحالة.' },
    { stem:"When I was young, I ___ play football every day.", correct:'used to', distract:['was used to','use to','get used to'], expl:'used to + V1 لعادات الماضي. الإشارات الزمنية (when I was young, in my childhood) تؤكد استخدام used to.' },
    { stem:"After a week, she ___ the cold weather.", correct:'got used to', distract:['used to','was used to','get use to'], expl:'after + period → عملية تدريجية → get used to. got = past tense.' },
    { stem:"Are you ___ working with the new team?", correct:'used to', distract:['use to','using to','get used to'], expl:'(are/is) + used to + gerund. used to working = معتاد على العمل. لاحظي: السؤال يبدأ بـ are لأن used to هنا adjective.' },
    { stem:"He didn\'t ___ live here.", correct:'use to', distract:['used to','using to','get used to'], expl:'في النفي والسؤال مع did/didn\'t نستخدم "use to" (بدون d). didn\'t use to live. السبب: did هو الذي يحمل الزمن الماضي، لا use.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['used_to','past_habits'], difficulty:4,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── 4. SOME / ANY / NO / EVERY / -BODY / -THING ─────────────────────────
function genSomeAny(level) {
  const items = [
    { stem:"I have ___ questions to ask.", correct:'some', distract:['any','no','every'], expl:'في الإثبات نستخدم some مع الأسماء المعدودة والجمع. في النفي والسؤال نستخدم any.' },
    { stem:"Is there ___ milk in the fridge?", correct:'any', distract:['some','no','every'], expl:'في السؤال نستخدم any مع غير المعدودة (milk) والجمع. (استثناء: في عرض الطلب نقول "Would you like SOME tea?" لأنه أدب.)' },
    { stem:"There is ___ time left.", correct:'no', distract:['any','some','every'], expl:'no = نفي قاطع. no time = لا يوجد وقت أبداً. لاحظي: لا نستخدم don\'t مع no (خطأ شائع): not "there isn\'t no time".' },
    { stem:"Would you like ___ coffee?", correct:'some', distract:['any','no','every'], expl:'مع عرض الطلب المهذّب نستخدم some (وليس any) حتى وإن كان سؤالاً. Would you like SOME tea? مهذّب أكثر من Would you like ANY tea?' },
    { stem:"___ knows the answer.", correct:'Nobody', distract:['Anybody','Somebody','Everybody'], expl:'في النفي: nobody/no one. في السؤال: anybody/anyone. في الإثبات: somebody/someone. في العموم: everybody/everyone.' },
    { stem:"Is there ___ in the room?", correct:'anybody', distract:['somebody','nobody','everybody'], expl:'سؤال → anybody. لاحظي القاعدة: -body / -one / -thing تتبع نفس قاعدة some/any.' },
    { stem:"I want to do ___ different today.", correct:'something', distract:['anything','nothing','everything'], expl:'إثبات → something. الجملة مثبتة (I want = أريد).' },
    { stem:"There isn\'t ___ on TV tonight.", correct:'anything', distract:['something','nothing','everything'], expl:'النفي يستخدم anything. خطأ شائع: There isn\'t nothing — هذا نفي مزدوج.' },
    { stem:"___ in the class agreed.", correct:'Everyone', distract:['Anyone','Nobody','Someone'], expl:'everyone (الجميع) = كل شخص. يطلب فعلاً مفرداً: everyone agrees (وليس agree).' },
    { stem:"I have ___ water left, just a sip.", correct:'little', distract:['few','a little','some'], expl:'little (بدون a) = قليل بنبرة سلبية (تقريباً لا شيء). a little (بـ a) = قليل بنبرة إيجابية. few للمعدودة، little لغير المعدودة.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['quantifiers','some_any','indefinite_pronouns'], difficulty:2,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── 5. CONJUNCTIONS ─────────────────────────────────────────────────────
function genConjunctions(level) {
  const items = [
    { stem:"It was raining, ___ we stayed home.", correct:'so', distract:['but','because','although'], expl:'so = نتيجة (لذلك). السبب يأتي قبله، النتيجة بعده. مثال: It was raining, so we stayed home.' },
    { stem:"I'm tired ___ I worked late.", correct:'because', distract:['so','but','although'], expl:'because = سبب (لأن). يأتي قبل السبب نفسه. I\'m tired (نتيجة) because I worked late (سبب).' },
    { stem:"She is rich ___ she is humble.", correct:'but', distract:['so','because','although'], expl:'but = تناقض. غنية لكن متواضعة. (السلوكان لا يجتمعان عادةً.) but أبسط من although في الجملة المركبة.' },
    { stem:"___ it was cold, we went swimming.", correct:'Although', distract:['Because','So','But'], expl:'although = على الرغم من أن. تأتي في بداية الجملة الشرطية المتناقضة. Although + جملة كاملة (بـ فاعل وفعل).' },
    { stem:"I'll wait ___ you finish.", correct:'until', distract:['while','before','during'], expl:'until = حتى. للحدث الذي يستمر حتى وقت محدد. wait until = انتظر حتى.' },
    { stem:"I read a book ___ I waited.", correct:'while', distract:['until','before','because'], expl:'while = بينما (حدثان متزامنان). الفعل الثاني عادة في Past Continuous: while I was waiting.' },
    { stem:"___ leaving, lock the door.", correct:'Before', distract:['After','While','Until'], expl:'before = قبل. before + gerund (V-ing). before leaving = قبل المغادرة. لاحظي: لا نستخدم "to" بعد before في هذه الصيغة.' },
    { stem:"You can have cake ___ ice cream — but not both.", correct:'or', distract:['and','but','so'], expl:'or = اختيار بين شيئين. and = جمع. الجملة هنا اختيار → or.' },
    { stem:"I can speak English ___ Arabic.", correct:'and', distract:['or','but','so'], expl:'and = إضافة (الاثنان معاً). I can speak both English and Arabic.' },
    { stem:"He's smart ___ lazy.", correct:'yet', distract:['so','because','until'], expl:'yet = لكن (في سياق التناقض المفاجئ). أكثر رسمية من but. He\'s smart yet lazy = ذكي لكنه كسول.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['conjunctions','linkers'], difficulty:2,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── 6. QUANTIFIERS (much/many/few/little/a lot of) ─────────────────────
function genQuantifiers(level) {
  const items = [
    { stem:"How ___ coffee do you drink?", correct:'much', distract:['many','few','little'], expl:'coffee غير معدودة → much. السؤال "كم": much للأشياء غير المعدودة، many للأشياء المعدودة.' },
    { stem:"There are ___ people in the park.", correct:'many', distract:['much','little','few'], expl:'people معدودة + جمع → many. الإثبات يقبل many كصفة بدون قيد.' },
    { stem:"I drink ___ water every day.", correct:'a lot of', distract:['many','few','a few'], expl:'a lot of يصلح للمعدودة وغير المعدودة، إثبات. أكثر شيوعاً من much في الإثبات.' },
    { stem:"She has ___ friends — only one or two.", correct:'few', distract:['little','many','much'], expl:'few = قليل، نبرة سلبية. للأسماء المعدودة. a few = قليل بنبرة إيجابية.' },
    { stem:"I have ___ work this week — almost nothing.", correct:'little', distract:['few','many','much'], expl:'little (بدون a) = قليل، نبرة سلبية، غير معدودة. work غير معدودة.' },
    { stem:"He has ___ time to relax.", correct:'a little', distract:['a few','many','much'], expl:'a little (بـ a) = قليل، نبرة إيجابية. الفرق بين little و a little دقيق لكن مهم.' },
    { stem:"___ of the students passed the exam.", correct:'Most', distract:['Many','Much','Few'], expl:'Most of (+ the/my) = معظم. تستخدم للمعدودة وغير المعدودة. Many of = كثير من.' },
    { stem:"There is ___ rain in the desert.", correct:'little', distract:['few','many','any'], expl:'rain غير معدودة → little (وليس few). few للمعدودة فقط.' },
    { stem:"___ of the cake is left?", correct:'How much', distract:['How many','How few','How little'], expl:'cake (غير معدودة) → How much. للسؤال عن الكمية مع غير المعدودة.' },
    { stem:"I have ___ apples to share.", correct:'plenty of', distract:['little','few','much'], expl:'plenty of = كثير جداً (بنبرة سخاء). يصلح للمعدودة وغير المعدودة. plenty of apples = تفاحات كثيرة.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['quantifiers','much_many'], difficulty:2,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── 7. TIME CLAUSES (when/while/before/after/since/until) ───────────────
function genTimeClauses(level) {
  const items = [
    { stem:"I'll call you ___ I arrive.", correct:'when', distract:['until','while','before'], expl:'when = عند. للحدث في وقت محدد مستقبلي/حاضر. لاحظي: في time clauses لا نستخدم will، نستخدم Present Simple: when I arrive (وليس when I will arrive).' },
    { stem:"___ I was sleeping, the phone rang.", correct:'While', distract:['Until','Before','After'], expl:'while = بينما (حدثان متزامنان، أحدهما طويل). الفعل بـ Past Continuous: was sleeping.' },
    { stem:"Wait here ___ I come back.", correct:'until', distract:['while','before','since'], expl:'until = حتى. ينهي الانتظار في لحظة معينة (وصول العائد).' },
    { stem:"I haven't seen her ___ 2020.", correct:'since', distract:['for','until','before'], expl:'since + نقطة بداية محددة (2020, last week). مع Present Perfect دائماً (have/has + V3). for + مدة (5 years).' },
    { stem:"Brush your teeth ___ going to bed.", correct:'before', distract:['after','while','until'], expl:'before = قبل. before + gerund (V-ing). before going to bed = قبل النوم.' },
    { stem:"___ the meeting ended, we went home.", correct:'After', distract:['Before','Until','While'], expl:'after = بعد. After + جملة (After the meeting ended) أو After + gerund (After ending the meeting).' },
    { stem:"I'll wait ___ you call.", correct:'until', distract:['since','before','for'], expl:'until يحدد نهاية فترة الانتظار. لاحظي: لا نستخدم will في الجزء الثاني (you call، وليس you will call).' },
    { stem:"It's been raining ___ this morning.", correct:'since', distract:['for','until','before'], expl:'since this morning = منذ هذا الصباح (نقطة بداية محددة). مع Present Perfect Continuous: has been raining.' },
    { stem:"___ you study harder, you won\'t pass.", correct:'Unless', distract:['If','When','Although'], expl:'Unless = إلا إذا (= If not). Unless you study = إذا لم تدرسي. لاحظي: لا نستخدم not بعد unless (خطأ شائع: "Unless you don\'t study").' },
    { stem:"___ I see her, I'll tell her.", correct:'When', distract:['Until','Since','For'], expl:'when = عندما. للحدث المتوقع حدوثه في المستقبل القريب أو غير المحدد. الجزء الأول Present Simple (I see)، الثاني will + V1.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['time_clauses','linkers'], difficulty:3,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── 8. WISH / IF ONLY (regrets, hopes) ───────────────────────────────────
function genWishClauses(level) {
  const items = [
    { stem:"I wish I ___ rich.", correct:'were', distract:['was','am','will be'], expl:'wish + (that) + Past Simple للأمنيات الحالية. مع I/he/she/it نستخدم WERE (وليس was) — هذا مماثل لـ Second Conditional.' },
    { stem:"I wish I ___ studied harder.", correct:'had', distract:['have','would have','did'], expl:'wish + Past Perfect (had + V3) للندم على الماضي. أمنية أتمنى لو كنت فعلت كذا.' },
    { stem:"I wish it ___ stop raining.", correct:'would', distract:['will','can','could'], expl:'wish + would للأمنيات المستقبلية المُحبَطة (مع أفعال خارج إرادتنا). I wish it would stop = أتمنى لو تتوقف.' },
    { stem:"If only she ___ here right now!", correct:'were', distract:['was','is','will be'], expl:'If only = نفس wish لكن أقوى عاطفياً. If only she WERE here = ليتها كانت هنا الآن.' },
    { stem:"I wish you ___ me earlier.", correct:'had told', distract:['told','have told','would tell'], expl:'wish + Past Perfect (had + V3) للندم على ما لم يحدث في الماضي. I wish you had told me = أتمنى لو كنتِ أخبرتيني.' },
    { stem:"He wishes he ___ to the party.", correct:'had gone', distract:['went','has gone','would go'], expl:'wish + had + V3 = ندم على ماضي. wishes he had gone = يتمنى لو كان ذهب.' },
    { stem:"I wish I ___ speak French.", correct:'could', distract:['can','would','should'], expl:'wish + could = أتمنى لو أستطيع. القدرة الحالية المُمتنعة. could = ماضي can في الجمل التمنّوية.' },
    { stem:"If only I ___ a car!", correct:'had', distract:['have','would have','will have'], expl:'If only + Past Simple = ليت لي. للحالات الافتراضية الحالية (مماثل لـ Second Conditional).' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['wish_clauses','hypothetical'], difficulty:4,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── ORCHESTRATOR ────────────────────────────────────────────────────────

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')
  const LEVELS = ['L1','L2','L3','L4','L5']
  for (const ref of targets) {
    console.log(`\n=== TARGET: ${ref} ===`)
    let totalInserted = 0
    for (const level of LEVELS) {
      const all = [
        genIdioms(level), genGerundInfinitive(level), genUsedTo(level), genSomeAny(level),
        genConjunctions(level), genQuantifiers(level), genTimeClauses(level), genWishClauses(level),
      ].flat()
      console.log(`[${level}] ${all.length} candidates`)
      let inserted = 0, failed = 0, batch = []
      for (let i = 0; i < all.length; i++) {
        const e = all[i]
        const vals = `(${esc(e.exercise_type)}, ${esc(e.level)}, ${esc(e.skill)}, ${arrText(e.topic_tags)}, ${e.difficulty}, ${esc(e.prompt_en)}, NULL, ${jsonbVal(e.correct_answer)}, ${e.distractors ? jsonbVal(e.distractors) : 'NULL'}, ${esc(e.explanation_ar)}, 60)`
        batch.push(vals)
        if (batch.length >= 25 || i === all.length - 1) {
          const sql = `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${batch.join(',')} ON CONFLICT DO NOTHING`
          try { await call(token, ref, sql); inserted += batch.length }
          catch (err) {
            console.error(`  batch failed (${err.message.slice(0,80)}); retrying single`)
            for (const v of batch) {
              try { await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${v} ON CONFLICT DO NOTHING`); inserted++ }
              catch { failed++ }
            }
          }
          batch = []
        }
      }
      console.log(`  [${level}] inserted: ${inserted} (failed: ${failed})`)
      totalInserted += inserted
    }
    const final = await call(token, ref, 'SELECT count(*)::int as c FROM retention_exercises')
    console.log(`[${ref}] total exercises now: ${final[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
