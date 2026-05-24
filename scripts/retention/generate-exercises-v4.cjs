#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 Block 3 (v4) — additional pattern families to close gap to 3,500.
// 8 generator families: question_formation, confusable_verbs, adverbs_frequency,
// comparatives_deep, mixed_conditionals, punctuation_fix, more_phrasals, sentence_patterns.

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

// 1. QUESTION FORMATION (wh- + yes/no)
function genQuestionFormation(level) {
  const items = [
    { stem:"___ do you live?", correct:'Where', distract:['What','When','Why'], expl:'Where = أين، للسؤال عن المكان. What للأشياء، When للوقت، Why للسبب.' },
    { stem:"___ is your name?", correct:'What', distract:['Where','Who','When'], expl:'What للسؤال عن الاسم/الشيء. Who للسؤال عن شخص. السؤال عن الاسم بـ What في الإنجليزية (وليس Who).' },
    { stem:"___ time is it?", correct:'What', distract:['When','Which','How'], expl:'What time = أيّ وقت. سؤال شائع: What time is it? = كم الساعة؟' },
    { stem:"___ many books do you have?", correct:'How', distract:['What','How much','Which'], expl:'How many + معدودة (books). How much + غير معدودة (money, water).' },
    { stem:"___ much does it cost?", correct:'How', distract:['What','How many','Which'], expl:'How much + سعر/كمية. cost غير معدودة في هذا السياق.' },
    { stem:"___ are you crying?", correct:'Why', distract:['What','How','When'], expl:'Why = لماذا. للسؤال عن السبب. الإجابة عادة بـ because.' },
    { stem:"___ shirt is yours?", correct:'Which', distract:['What','Who','Where'], expl:'Which = أيّ (للاختيار من مجموعة محدودة معروفة). What = ماذا (مفتوح). Which shirt = أيّ قميص من المعروضة.' },
    { stem:"___ wrote this book?", correct:'Who', distract:['What','When','Where'], expl:'Who للسؤال عن الشخص الفاعل. لاحظي: لا نضع did هنا (Who wrote، وليس Who did wrote)، لأن Who هو الفاعل.' },
    { stem:"___ does she go to school?", correct:'How', distract:['Where','When','Why'], expl:'How للسؤال عن الطريقة/الوسيلة. مثال: How does she go to school? — By bus.' },
    { stem:"___ you tired?", correct:'Are', distract:['Do','Does','Is'], expl:'مع tired (صفة) نستخدم am/is/are. مع الضمير you نستخدم Are. السؤال يبدأ بـ are (الفعل المساعد).' },
    { stem:"___ he speak English?", correct:'Does', distract:['Do','Is','Are'], expl:'مع he/she/it في Present Simple نستخدم does. القاعدة: السؤال يبدأ بـ does + ضمير + فعل بصورته الأساسية.' },
    { stem:"___ they finished?", correct:'Have', distract:['Did','Do','Are'], expl:'مع finished (V3) + ضمير، الفعل المساعد have/has → Have they finished? (Present Perfect Question).' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['question_formation','wh_questions'], difficulty:2,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// 2. CONFUSABLE VERBS (lend/borrow, bring/take, say/tell, do/make, win/beat)
function genConfusableVerbs(level) {
  const items = [
    { stem:"Can you ___ me your pen?", correct:'lend', distract:['borrow','give back','use'], expl:'lend = يعير (يعطي). borrow = يستعير (يأخذ). الفعل المطلوب من الـ receiver: Can I borrow? من الـ giver: Can you lend?' },
    { stem:"I want to ___ a book from the library.", correct:'borrow', distract:['lend','return','give'], expl:'borrow = يستعير (يأخذ مؤقتاً). الذي يأخذ يستعير، الذي يعطي يعير (lend).' },
    { stem:"Don\'t forget to ___ your jacket — it\'s cold.", correct:'bring', distract:['take','carry','wear'], expl:'bring = إحضار (إلى المتكلم). take = أخذ (بعيداً عن المتكلم). الجملة: عند المغادرة من بيتك للخروج إلى البرد، نقول bring (إلى الخارج).' },
    { stem:"Could you ___ the trash out, please?", correct:'take', distract:['bring','carry','give'], expl:'take = يأخذ (من هنا إلى هناك). take out = يخرج. take the trash out = يخرج القمامة من المنزل إلى الخارج.' },
    { stem:"She ___ that she was tired.", correct:'said', distract:['told','spoke','talked'], expl:'said + شيء (بدون مفعول شخصي): said that, said hello. told + شخص (مع مفعول شخصي): told me, told her. هنا لا يوجد شخص → said.' },
    { stem:"He ___ me a funny story.", correct:'told', distract:['said','spoke','talked'], expl:'told + شخص (me) + شيء. told me a story. لو كانت said، يجب: said a story TO me. الأبسط: told + person.' },
    { stem:"Did you ___ your homework?", correct:'do', distract:['make','have','take'], expl:'do مع المهام والواجبات: do homework, do exercise, do work. make مع الإبداع/الصناعة: make a cake, make a decision.' },
    { stem:"She wants to ___ a cake for her birthday.", correct:'make', distract:['do','bake','build'], expl:'make + الإبداع/الإنتاج: make a cake, make a sandwich. do + المهام: do the dishes, do the laundry.' },
    { stem:"He always ___ a great impression.", correct:'makes', distract:['does','takes','gives'], expl:'make an impression (تعبير محفوظ). أيضاً make sense, make a difference, make a mistake. هذه تعابير ثابتة مع make.' },
    { stem:"We ___ the game 3-1.", correct:'won', distract:['beat','gained','earned'], expl:'win + game/match (يفوز بالمباراة). beat + opponent (يهزم الخصم). نقول won the game أو beat them.' },
    { stem:"They ___ us in the final.", correct:'beat', distract:['won','defeated us','lost'], expl:'beat + المنافس (us). beat us = هزمنا. لو قلنا "won us" يكون خطأ — won يتبعها game/match، beat يتبعها person/team.' },
    { stem:"___ you remind me later?", correct:'Will', distract:['Do','Are','Does'], expl:'will مع طلب التذكير (للمستقبل). Will you = هل ستفعل؟ سؤال مهذّب يبدأ بـ Will you...' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'vocab',
    topic_tags:['confusable_verbs','vocabulary','common_mistakes'], difficulty:3,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// 3. ADVERBS OF FREQUENCY (always, usually, often, sometimes, rarely, never)
function genAdverbsFrequency(level) {
  const items = [
    { stem:"I ___ drink coffee in the morning.", correct:'usually', distract:['rarely','seldom','hardly ever'], expl:'usually = عادةً (90%+). تأتي بين الفاعل والفعل: I usually drink. القاعدة: ظرف التكرار بين الفاعل والفعل الأساسي.' },
    { stem:"She ___ goes to bed before 11.", correct:'never', distract:['ever','always not','no never'], expl:'never = أبداً (0%). نقول never + فعل (وليس never + not). She never goes (صحيح)، She doesn\'t never go (خطأ — نفي مزدوج).' },
    { stem:"He is ___ late.", correct:'always', distract:['never','always always','very always'], expl:'مع الفعل to be (is)، ظرف التكرار يأتي بعده: He is always (وليس He always is). القاعدة: مع كل الأفعال الأخرى — قبل الفعل. مع be — بعد الفعل.' },
    { stem:"They ___ visit their grandmother on Fridays.", correct:'often', distract:['hardly','rarely','no'], expl:'often = غالباً (60-70%). المعنى يطابق visit on Fridays (تكرار).' },
    { stem:"___ I see her smile.", correct:'Rarely', distract:['Often','Always','Sometimes'], expl:'Rarely = نادراً. عند بداية الجملة (للتأكيد)، يأتي معه inversion: Rarely DO I see. لكن في النمط البسيط Rarely I see صحيح في الكتابة العامة.' },
    { stem:"___ she sometimes comes early?", correct:'Does', distract:['Do','Is','Has'], expl:'في الأسئلة، ظرف التكرار يبقى في موضعه الطبيعي بين الفاعل والفعل: Does she sometimes come? القاعدة: السؤال يبدأ بالمساعد، لا بظرف التكرار.' },
    { stem:"I ___ ever go to the cinema.", correct:'hardly', distract:['barely','rarely','seldom'], expl:'hardly ever = نادراً جداً (تقريباً أبداً). تركيب ثابت. lazy + ever → hardly ever.' },
    { stem:"She ___ watches TV — only once a month.", correct:'seldom', distract:['often','always','usually'], expl:'seldom = نادراً (مرة في الشهر = قليل جداً → seldom).' },
    { stem:"Are you ___ free on weekends?", correct:'ever', distract:['always','sometimes','never'], expl:'ever = في أي وقت. تستخدم في الأسئلة والنفي. Are you ever free? = هل أنتِ متفرغة في أي وقت؟' },
    { stem:"We have ___ been to Italy.", correct:'never', distract:['ever','always','already'], expl:'never مع Present Perfect (have/has + V3) للخبرة الحياتية: have never been = لم أذهب أبداً.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['adverbs_of_frequency','word_order'], difficulty:2,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// 4. COMPARATIVES DEEPER (as...as, less...than, the same as)
function genComparativesDeep(level) {
  const items = [
    { stem:"Riyadh is as big ___ Jeddah.", correct:'as', distract:['than','that','of'], expl:'as + adj + as = تساوي. as big as = بنفس الحجم. القاعدة: as + الصفة + as. لا نقول "as big than".' },
    { stem:"This year was ___ exciting than last year.", correct:'less', distract:['more','as','the'], expl:'less + adj + than = أقل من. less exciting than = أقل إثارة من. أيضاً: less + noun (less time, less money).' },
    { stem:"My phone is the same ___ yours.", correct:'as', distract:['than','of','that'], expl:'the same as = نفس الشيء كـ. تعبير ثابت. لا نقول "the same than".' },
    { stem:"She is ___ tall as her brother.", correct:'as', distract:['so','as so','than'], expl:'as adjective as = مساواة. نقول as tall as (بـ as الأولى). الـ as الثانية مع المقارنة (as her brother).' },
    { stem:"This book is ___ interesting than that one.", correct:'more', distract:['most','as','no'], expl:'more + adj + than للصفات الطويلة (3+ مقاطع). interesting = طويلة → more interesting. الصفات القصيرة تأخذ -er.' },
    { stem:"He is the ___ student in the class.", correct:'best', distract:['better','most best','goodest'], expl:'the + superlative. good → best (شاذة). the best (وليس the goodest). للأفضل في مجموعة.' },
    { stem:"My grade is far ___ than I expected.", correct:'better', distract:['gooder','more good','goodest'], expl:'good → better (شاذة، Comparative). far better = أفضل بكثير. far يضخّم المقارنة (far better, much better).' },
    { stem:"It\'s much ___ today than yesterday.", correct:'colder', distract:['cold','more cold','coldest'], expl:'cold (قصيرة) → colder (Comparative بإضافة -er). much + comparative = أبرد بكثير.' },
    { stem:"The more you study, the ___ you learn.", correct:'more', distract:['most','many','much'], expl:'تركيب double comparative: The + comparative, the + comparative. كلما + …، كلما + …. The more you study, the more you learn = كلما درست أكثر، تعلمت أكثر.' },
    { stem:"This is by far the ___ movie I have ever seen.", correct:'worst', distract:['baddest','more bad','worse'], expl:'bad → worst (شاذة، Superlative). by far = بكل تأكيد، يضخّم.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['comparatives','superlatives','as_as'], difficulty:3,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// 5. MIXED CONDITIONALS + advanced conditional forms
function genMixedConditionals(level) {
  const items = [
    { stem:"If I had studied medicine, I ___ a doctor now.", correct:'would be', distract:['was','would have been','am'], expl:'Mixed Conditional: شرط ماضي (had studied) → نتيجة حاضرة (would be). هذا أكثر طبيعية من Third Conditional الذي يكون كله ماضي.' },
    { stem:"If I were taller, I ___ played basketball professionally.", correct:'would have', distract:['would','will have','had'], expl:'شرط حاضر/دائم (were taller) → نتيجة ماضية (would have played). صفة دائمة + نتيجة في الماضي.' },
    { stem:"Had I known, I ___ helped.", correct:'would have', distract:['will have','had','would'], expl:'inversion conditional: Had + S + V3 = If S had V3. شكل رسمي. Had I known = If I had known.' },
    { stem:"Were I in your position, I ___ accept.", correct:'would', distract:['will','would have','should'], expl:'inversion: Were I = If I were. شكل رسمي وأنيق. الجزء الثاني: would + V1.' },
    { stem:"Provided that you finish on time, you ___ get a bonus.", correct:'will', distract:['would','have','can have'], expl:'provided that = بشرط أن. مماثل لـ If. Provided that you finish → الجزء الثاني: will + V1 (مثل First Conditional).' },
    { stem:"Unless you change, things ___ improve.", correct:"won't", distract:['will','would not','will not have'], expl:'unless = إلا إذا (= If not). Unless you change = If you don\'t change. الجزء الثاني: won\'t (= will not). انتبهي للنفي المضمر.' },
    { stem:"In case it ___, take an umbrella.", correct:'rains', distract:['will rain','rained','would rain'], expl:'in case + Present Simple (للاحتياط من احتمال مستقبلي). in case it rains = تحسّباً لحدوث المطر.' },
    { stem:"Suppose you ___ a million dollars, what would you do?", correct:'won', distract:['win','had won','will win'], expl:'suppose = افترض (مماثل لـ if). مع Second Conditional: Suppose + Past Simple → would.' },
  ]
  return items.map(it => ({
    level, exercise_type:'mcq', skill:'grammar',
    topic_tags:['mixed_conditionals','conditionals','advanced'], difficulty:5,
    prompt_en: it.stem, correct_answer:{value:it.correct}, distractors:it.distract,
    explanation_ar: it.expl,
  }))
}

// 6. PUNCTUATION / CAPITALIZATION (sentence_correction)
function genPunctuation(level) {
  const items = [
    { wrong:"i live in saudi arabia.", correct:"I live in Saudi Arabia.", expl:'I دائماً كبير. أسماء الدول كبيرة: Saudi Arabia. الجملة تبدأ بحرف كبير دائماً.' },
    { wrong:"My friend, sara is from jeddah.", correct:"My friend, Sara, is from Jeddah.", expl:'أسماء الأشخاص كبيرة (Sara). الفاصلة بعد التقدمة تتطلب فاصلة بعد الاسم أيضاً (Sara,).' },
    { wrong:"do you speak english?", correct:"Do you speak English?", expl:'بداية الجملة كبيرة (Do). أسماء اللغات كبيرة (English, Arabic, French).' },
    { wrong:"on monday i went to riyadh.", correct:"On Monday I went to Riyadh.", expl:'أيام الأسبوع كبيرة (Monday). I دائماً كبير. أسماء المدن كبيرة (Riyadh). بداية الجملة كبيرة (On).' },
    { wrong:"He said i love you", correct:'He said, "I love you."', expl:'الكلام المباشر يحتاج فاصلة قبل العلامتين، والاقتباس بعلامتي ". الكلام داخل الاقتباس يبدأ بحرف كبير. نقطة قبل علامة الاقتباس الأخيرة.' },
    { wrong:"my mother she is a teacher.", correct:"My mother is a teacher.", expl:'لا نكرر الفاعل (my mother / she). إما "My mother is" أو "She is" — وليس الاثنين معاً. هذا خطأ شائع للناطقين بالعربية.' },
    { wrong:"i was born in january 2000.", correct:"I was born in January 2000.", expl:'أشهر السنة كبيرة (January, February). I دائماً كبير. السنوات بدون اسم شهر لا تحتاج كبير: in 2000 (the year is just a number).' },
    { wrong:"the quran is a holy book", correct:"The Quran is a holy book.", expl:'أسماء الكتب المقدسة (Quran, Bible) كبيرة. كل جملة تنتهي بنقطة (.).' },
    { wrong:"my favorite subjects are math english and science.", correct:"My favorite subjects are math, English, and science.", expl:'القائمة تحتاج فواصل (math, English, and science). English كبيرة (لغة). الفاصلة قبل and (Oxford comma — شائعة في الكتابة الأمريكية).' },
    { wrong:"its a beautiful day isnt it", correct:"It\'s a beautiful day, isn\'t it?", expl:'it\'s = it is (مع apostrophe). its (بدون) = ضمير ملكية. السؤال الذيلي يحتاج علامة استفهام (?). فاصلة قبل tag question.' },
  ]
  return items.map(it => ({
    level, exercise_type:'sentence_correction', skill:'grammar',
    topic_tags:['punctuation','capitalization','writing_mechanics'], difficulty:2,
    prompt_en: it.wrong, correct_answer:{value:it.correct}, distractors:null,
    explanation_ar: it.expl,
  }))
}

// 7. MORE PHRASAL VERBS (different set from v2)
function genMorePhrasals(level) {
  const items = [
    { phrasal:'set up', meaning_ar:'يؤسّس / يُعدّ', example:'They set up a new business.', distract:['ينهي','يجلس','يضع جانباً'] },
    { phrasal:'figure out', meaning_ar:'يكتشف / يفهم', example:"I can't figure out this puzzle.", distract:['يحسب','يخمّن','ينسى'] },
    { phrasal:'show up', meaning_ar:'يحضر / يظهر', example:"She didn't show up to the meeting.", distract:['يختفي','يصرخ','يستيقظ'] },
    { phrasal:'hang out', meaning_ar:'يقضي وقتاً (مع أصدقاء)', example:"We hang out at the cafe every weekend.", distract:['يعلّق','يفصل','يستلقي'] },
    { phrasal:'check in', meaning_ar:'يسجّل الدخول (فندق/مطار)', example:"We checked in at 3 PM.", distract:['يدفع','يخرج','يغادر'] },
    { phrasal:'check out', meaning_ar:'يسجّل الخروج', example:"You must check out by 11 AM.", distract:['يفتش','يدخل','ينظر'] },
    { phrasal:'log in', meaning_ar:'يسجّل الدخول إلكترونياً', example:"Log in with your email.", distract:['يخرج','يكتب','يبحث'] },
    { phrasal:'log out', meaning_ar:'يسجّل الخروج إلكترونياً', example:"Don\'t forget to log out.", distract:['يدخل','يقفز','يحفظ'] },
    { phrasal:'fill out', meaning_ar:'يملأ (نموذجاً)', example:"Please fill out this form.", distract:['يفرغ','يكتب','يقرأ'] },
    { phrasal:'cheer up', meaning_ar:'يفرح / يبتهج', example:"Cheer up — tomorrow is a new day!", distract:['يحزن','يبكي','ينام'] },
    { phrasal:'calm down', meaning_ar:'يهدأ', example:"Calm down, everything will be fine.", distract:['يغضب','يستيقظ','يقفز'] },
    { phrasal:'speak up', meaning_ar:'يرفع صوته', example:"Could you speak up? I can\'t hear.", distract:['يسكت','يتكلم بهدوء','يقاطع'] },
    { phrasal:'pass away', meaning_ar:'يتوفى (مهذّب)', example:"His grandmother passed away last month.", distract:['يمرّ','يسافر','يهرب'] },
    { phrasal:'take care of', meaning_ar:'يعتني بـ', example:"She takes care of her elderly parents.", distract:['يأخذ','يحذر','يطبخ'] },
    { phrasal:'get along with', meaning_ar:'ينسجم مع', example:"I get along with my coworkers.", distract:['يهرب من','يقاتل','يلتقي'] },
  ]
  const out = []
  for (const it of items) {
    out.push({
      level, exercise_type:'mcq', skill:'vocab',
      topic_tags:['phrasal_verbs','vocabulary'], difficulty:3,
      prompt_en: `What does "${it.phrasal}" mean? Example: ${it.example}`,
      correct_answer: { value: it.meaning_ar },
      distractors: it.distract,
      explanation_ar: `"${it.phrasal}" تعني "${it.meaning_ar}". الأفعال المركّبة جزء أساسي من الإنجليزية الطبيعية — احفظيها مع أمثلتها لتثبت معانيها.`,
    })
  }
  return out
}

// 8. SENTENCE PATTERNS (S+V+O, S+V+C, etc.) — reorder
function genSentencePatterns(level) {
  const items = [
    { en:"morning / good / Layla / a / had", correct:"Layla had a good morning.", expl:'S+V+O: الفاعل (Layla) + الفعل (had) + المفعول (a good morning). الصفة (good) قبل الاسم (morning).' },
    { en:"loudly / dog / barked / very / the", correct:"The dog barked very loudly.", expl:'S+V+Adv: الفاعل (The dog) + الفعل (barked) + الظرف (very loudly). الظرف بعد الفعل.' },
    { en:"is / sky / the / blue", correct:"The sky is blue.", expl:'S+V+C (Linking verb): The sky (S) + is (linking V) + blue (C/complement). is لا يأخذ مفعولاً بل مكمّلاً.' },
    { en:"to / her / mother / gave / a / gift / she", correct:"She gave her mother a gift.", expl:'S+V+IO+DO: She + gave + her mother (Indirect Object) + a gift (Direct Object). البديل: She gave a gift TO her mother.' },
    { en:"a / book / writing / I / am", correct:"I am writing a book.", expl:'Present Continuous: am/is/are + V-ing. I + am + writing + a book (مفعول).' },
    { en:"interesting / very / found / I / the / movie", correct:"I found the movie very interesting.", expl:'S+V+O+C: I (S) + found (V) + the movie (O) + very interesting (C). الـ complement يصف الـ object.' },
    { en:"book / boring / this / is", correct:"This book is boring.", expl:'S+V+C: This book + is + boring. boring يصف الكتاب نفسه. (الكتاب يشعر بالملل؟ لا — الكتاب ممل = boring.)' },
    { en:"made / happy / very / news / the / her", correct:"The news made her very happy.", expl:'S+V+O+C: The news + made + her + very happy. حالة جعل (made) شخصاً يصبح صفة.' },
    { en:"painting / the / hung / wall / the / on", correct:"The painting hung on the wall.", expl:'S+V+Prep phrase: The painting + hung + on the wall. on the wall هو ظرف مكان (prepositional phrase).' },
    { en:"talented / brother / a / pianist / is / her", correct:"Her brother is a talented pianist.", expl:'S+V+C: Her brother + is + a talented pianist. الـ complement اسم (noun phrase): a talented pianist.' },
  ]
  return items.map(it => ({
    level, exercise_type:'reorder', skill:'grammar',
    topic_tags:['sentence_patterns','word_order','syntax'], difficulty:3,
    prompt_en: it.en, correct_answer:{value:it.correct}, distractors:null,
    explanation_ar: it.expl,
  }))
}

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
        genQuestionFormation(level), genConfusableVerbs(level), genAdverbsFrequency(level),
        genComparativesDeep(level), genMixedConditionals(level), genPunctuation(level),
        genMorePhrasals(level), genSentencePatterns(level),
      ].flat()
      console.log(`[${level}] ${all.length} candidates`)
      let inserted = 0, skipped = 0, batch = []
      for (let i = 0; i < all.length; i++) {
        const e = all[i]
        const vals = `(${esc(e.exercise_type)}, ${esc(e.level)}, ${esc(e.skill)}, ${arrText(e.topic_tags)}, ${e.difficulty}, ${esc(e.prompt_en)}, NULL, ${jsonbVal(e.correct_answer)}, ${e.distractors ? jsonbVal(e.distractors) : 'NULL'}, ${esc(e.explanation_ar)}, 60)`
        batch.push(vals)
        if (batch.length >= 25 || i === all.length - 1) {
          const sql = `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${batch.join(',')} ON CONFLICT DO NOTHING`
          try { await call(token, ref, sql); inserted += batch.length }
          catch (err) {
            console.error(`  batch fail (${err.message.slice(0,80)})`);
            for (const v of batch) {
              try { await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${v} ON CONFLICT DO NOTHING`); inserted++ } catch { skipped++ }
            }
          }
          batch = []
        }
      }
      console.log(`  [${level}] tried: ${inserted}, fail: ${skipped}`)
      totalInserted += inserted
    }
    const f = await call(token, ref, 'SELECT count(*)::int as c FROM retention_exercises')
    console.log(`[${ref}] total exercises now: ${f[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
