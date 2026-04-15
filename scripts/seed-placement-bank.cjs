const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

// ═══════════════════════════════════════════════════════
// 120 placement questions: 20 per CEFR level × 6 levels
// Per level: grammar(8) + vocabulary(6) + reading(4) + context(2) = 20
// Difficulty spread: 0.0-3.0 (IRT theta proxy)
// ═══════════════════════════════════════════════════════

const questions = [

// ═══════════════════════════════════════════════════════
// PRE_A1 (difficulty 0.0 - 0.4)
// ═══════════════════════════════════════════════════════

// pre_a1 grammar (8)
{cefr_level:'pre_a1',skill:'grammar',difficulty:0.05,question_text:'I ___ a student.',options:[{id:'a',text:'am'},{id:'b',text:'is'},{id:'c',text:'are'},{id:'d',text:'be'}],correct_option_id:'a',explanation_ar:'نستخدم am مع الضمير I'},
{cefr_level:'pre_a1',skill:'grammar',difficulty:0.08,question_text:'This is ___ apple.',options:[{id:'a',text:'an'},{id:'b',text:'a'},{id:'c',text:'the'},{id:'d',text:'is'}],correct_option_id:'a',explanation_ar:'نستخدم an قبل الكلمات التي تبدأ بحرف متحرك'},
{cefr_level:'pre_a1',skill:'grammar',difficulty:0.12,question_text:'She ___ a teacher.',options:[{id:'a',text:'is'},{id:'b',text:'am'},{id:'c',text:'are'},{id:'d',text:'be'}],correct_option_id:'a',explanation_ar:'نستخدم is مع الضمائر he/she/it'},
{cefr_level:'pre_a1',skill:'grammar',difficulty:0.15,question_text:'They ___ happy.',options:[{id:'a',text:'are'},{id:'b',text:'is'},{id:'c',text:'am'},{id:'d',text:'be'}],correct_option_id:'a',explanation_ar:'نستخدم are مع الضمير they'},
{cefr_level:'pre_a1',skill:'grammar',difficulty:0.20,question_text:'___ is your name?',options:[{id:'a',text:'What'},{id:'b',text:'Who'},{id:'c',text:'Where'},{id:'d',text:'When'}],correct_option_id:'a',explanation_ar:'نستخدم What للسؤال عن الاسم'},
{cefr_level:'pre_a1',skill:'grammar',difficulty:0.25,question_text:'I have two ___.',options:[{id:'a',text:'cats'},{id:'b',text:'cat'},{id:'c',text:'a cat'},{id:'d',text:'the cat'}],correct_option_id:'a',explanation_ar:'نضيف s للجمع مع الأعداد'},
{cefr_level:'pre_a1',skill:'grammar',difficulty:0.30,question_text:'The book is ___ the table.',options:[{id:'a',text:'on'},{id:'b',text:'in'},{id:'c',text:'at'},{id:'d',text:'to'}],correct_option_id:'a',explanation_ar:'نستخدم on عندما يكون الشيء فوق سطح'},
{cefr_level:'pre_a1',skill:'grammar',difficulty:0.35,question_text:'He ___ not like coffee.',options:[{id:'a',text:'does'},{id:'b',text:'do'},{id:'c',text:'is'},{id:'d',text:'are'}],correct_option_id:'a',explanation_ar:'نستخدم does مع he/she/it في النفي'},

// pre_a1 vocabulary (6)
{cefr_level:'pre_a1',skill:'vocabulary',difficulty:0.05,question_text:'What color is the sky?',options:[{id:'a',text:'Blue'},{id:'b',text:'Red'},{id:'c',text:'Green'},{id:'d',text:'Yellow'}],correct_option_id:'a',explanation_ar:'لون السماء أزرق'},
{cefr_level:'pre_a1',skill:'vocabulary',difficulty:0.10,question_text:'Monday, Tuesday, ___.',options:[{id:'a',text:'Wednesday'},{id:'b',text:'Friday'},{id:'c',text:'Sunday'},{id:'d',text:'Saturday'}],correct_option_id:'a',explanation_ar:'الأربعاء يأتي بعد الثلاثاء'},
{cefr_level:'pre_a1',skill:'vocabulary',difficulty:0.15,question_text:'The opposite of "big" is ___.',options:[{id:'a',text:'small'},{id:'b',text:'tall'},{id:'c',text:'long'},{id:'d',text:'fast'}],correct_option_id:'a',explanation_ar:'عكس كبير هو صغير'},
{cefr_level:'pre_a1',skill:'vocabulary',difficulty:0.20,question_text:'A ___ is a place where you sleep.',options:[{id:'a',text:'bedroom'},{id:'b',text:'kitchen'},{id:'c',text:'bathroom'},{id:'d',text:'garden'}],correct_option_id:'a',explanation_ar:'غرفة النوم هي المكان الذي ننام فيه'},
{cefr_level:'pre_a1',skill:'vocabulary',difficulty:0.28,question_text:'You eat breakfast in the ___.',options:[{id:'a',text:'morning'},{id:'b',text:'night'},{id:'c',text:'evening'},{id:'d',text:'afternoon'}],correct_option_id:'a',explanation_ar:'نتناول الفطور في الصباح'},
{cefr_level:'pre_a1',skill:'vocabulary',difficulty:0.35,question_text:'Your mother\'s sister is your ___.',options:[{id:'a',text:'aunt'},{id:'b',text:'uncle'},{id:'c',text:'cousin'},{id:'d',text:'grandmother'}],correct_option_id:'a',explanation_ar:'أخت الأم هي الخالة'},

// pre_a1 reading (4)
{cefr_level:'pre_a1',skill:'reading',difficulty:0.10,question_text:'What is the boy\'s name?',question_context:'My name is Ali. I am seven years old. I have a cat.',options:[{id:'a',text:'Ali'},{id:'b',text:'Ahmed'},{id:'c',text:'Omar'},{id:'d',text:'Sami'}],correct_option_id:'a',explanation_ar:'النص يقول اسمه علي'},
{cefr_level:'pre_a1',skill:'reading',difficulty:0.18,question_text:'What pet does he have?',question_context:'My name is Ali. I am seven years old. I have a cat.',options:[{id:'a',text:'A cat'},{id:'b',text:'A dog'},{id:'c',text:'A bird'},{id:'d',text:'A fish'}],correct_option_id:'a',explanation_ar:'النص يقول عنده قطة'},
{cefr_level:'pre_a1',skill:'reading',difficulty:0.25,question_text:'Where does Sara go every day?',question_context:'Sara goes to school every day. She likes math. Her teacher is nice.',options:[{id:'a',text:'School'},{id:'b',text:'The park'},{id:'c',text:'Home'},{id:'d',text:'The shop'}],correct_option_id:'a',explanation_ar:'سارة تذهب إلى المدرسة كل يوم'},
{cefr_level:'pre_a1',skill:'reading',difficulty:0.33,question_text:'What subject does Sara like?',question_context:'Sara goes to school every day. She likes math. Her teacher is nice.',options:[{id:'a',text:'Math'},{id:'b',text:'English'},{id:'c',text:'Science'},{id:'d',text:'Art'}],correct_option_id:'a',explanation_ar:'سارة تحب الرياضيات'},

// pre_a1 context (2)
{cefr_level:'pre_a1',skill:'context',difficulty:0.15,question_text:'Someone says "Hello, how are you?" You say:',options:[{id:'a',text:'I\'m fine, thank you.'},{id:'b',text:'My name is Ali.'},{id:'c',text:'I am a student.'},{id:'d',text:'Goodbye.'}],correct_option_id:'a',explanation_ar:'الرد الطبيعي على كيف حالك هو أنا بخير'},
{cefr_level:'pre_a1',skill:'context',difficulty:0.30,question_text:'You want to buy something. You say:',options:[{id:'a',text:'How much is this?'},{id:'b',text:'What is your name?'},{id:'c',text:'Where are you from?'},{id:'d',text:'How old are you?'}],correct_option_id:'a',explanation_ar:'نسأل بكم هذا عند الشراء'},

// ═══════════════════════════════════════════════════════
// A1 (difficulty 0.3 - 0.8)
// ═══════════════════════════════════════════════════════

// a1 grammar (8)
{cefr_level:'a1',skill:'grammar',difficulty:0.35,question_text:'She ___ to school every day.',options:[{id:'a',text:'goes'},{id:'b',text:'go'},{id:'c',text:'going'},{id:'d',text:'gone'}],correct_option_id:'a',explanation_ar:'نضيف es للفعل go مع she في المضارع البسيط'},
{cefr_level:'a1',skill:'grammar',difficulty:0.40,question_text:'___ you like pizza?',options:[{id:'a',text:'Do'},{id:'b',text:'Does'},{id:'c',text:'Are'},{id:'d',text:'Is'}],correct_option_id:'a',explanation_ar:'نستخدم Do مع you في السؤال'},
{cefr_level:'a1',skill:'grammar',difficulty:0.45,question_text:'I ___ TV last night.',options:[{id:'a',text:'watched'},{id:'b',text:'watch'},{id:'c',text:'watching'},{id:'d',text:'watches'}],correct_option_id:'a',explanation_ar:'نستخدم الماضي البسيط مع last night'},
{cefr_level:'a1',skill:'grammar',difficulty:0.50,question_text:'There ___ many students in the class.',options:[{id:'a',text:'are'},{id:'b',text:'is'},{id:'c',text:'was'},{id:'d',text:'has'}],correct_option_id:'a',explanation_ar:'نستخدم are مع الجمع في there are'},
{cefr_level:'a1',skill:'grammar',difficulty:0.55,question_text:'She ___ reading a book now.',options:[{id:'a',text:'is'},{id:'b',text:'are'},{id:'c',text:'am'},{id:'d',text:'do'}],correct_option_id:'a',explanation_ar:'نستخدم is مع she في المضارع المستمر'},
{cefr_level:'a1',skill:'grammar',difficulty:0.60,question_text:'This is the ___ car in the parking lot.',options:[{id:'a',text:'biggest'},{id:'b',text:'big'},{id:'c',text:'bigger'},{id:'d',text:'most big'}],correct_option_id:'a',explanation_ar:'نستخدم صيغة التفضيل the biggest مع the'},
{cefr_level:'a1',skill:'grammar',difficulty:0.68,question_text:'I ___ never been to London.',options:[{id:'a',text:'have'},{id:'b',text:'has'},{id:'c',text:'am'},{id:'d',text:'was'}],correct_option_id:'a',explanation_ar:'نستخدم have مع I في المضارع التام'},
{cefr_level:'a1',skill:'grammar',difficulty:0.75,question_text:'He can ___ English very well.',options:[{id:'a',text:'speak'},{id:'b',text:'speaks'},{id:'c',text:'speaking'},{id:'d',text:'spoke'}],correct_option_id:'a',explanation_ar:'بعد can نستخدم المصدر بدون أي إضافات'},

// a1 vocabulary (6)
{cefr_level:'a1',skill:'vocabulary',difficulty:0.35,question_text:'A person who teaches at a school is a ___.',options:[{id:'a',text:'teacher'},{id:'b',text:'doctor'},{id:'c',text:'driver'},{id:'d',text:'cook'}],correct_option_id:'a',explanation_ar:'المعلم هو الشخص الذي يُدرّس في المدرسة'},
{cefr_level:'a1',skill:'vocabulary',difficulty:0.42,question_text:'The ___ is very hot in summer.',options:[{id:'a',text:'weather'},{id:'b',text:'water'},{id:'c',text:'window'},{id:'d',text:'winter'}],correct_option_id:'a',explanation_ar:'الطقس يكون حاراً في الصيف'},
{cefr_level:'a1',skill:'vocabulary',difficulty:0.50,question_text:'I need to ___ the bus to get to work.',options:[{id:'a',text:'catch'},{id:'b',text:'hold'},{id:'c',text:'bring'},{id:'d',text:'carry'}],correct_option_id:'a',explanation_ar:'نستخدم catch the bus بمعنى نلحق بالباص'},
{cefr_level:'a1',skill:'vocabulary',difficulty:0.58,question_text:'Please ___ the door when you leave.',options:[{id:'a',text:'close'},{id:'b',text:'open'},{id:'c',text:'break'},{id:'d',text:'push'}],correct_option_id:'a',explanation_ar:'أغلق الباب عند المغادرة'},
{cefr_level:'a1',skill:'vocabulary',difficulty:0.65,question_text:'She felt ___ because she lost her keys.',options:[{id:'a',text:'worried'},{id:'b',text:'happy'},{id:'c',text:'excited'},{id:'d',text:'proud'}],correct_option_id:'a',explanation_ar:'شعرت بالقلق لأنها فقدت مفاتيحها'},
{cefr_level:'a1',skill:'vocabulary',difficulty:0.75,question_text:'The ___ of this shirt is twenty dollars.',options:[{id:'a',text:'price'},{id:'b',text:'size'},{id:'c',text:'color'},{id:'d',text:'weight'}],correct_option_id:'a',explanation_ar:'سعر القميص عشرون دولاراً'},

// a1 reading (4)
{cefr_level:'a1',skill:'reading',difficulty:0.40,question_text:'What time does the shop close?',question_context:'The shop opens at 9 AM and closes at 6 PM. It is closed on Fridays.',options:[{id:'a',text:'6 PM'},{id:'b',text:'9 AM'},{id:'c',text:'5 PM'},{id:'d',text:'7 PM'}],correct_option_id:'a',explanation_ar:'المحل يغلق الساعة 6 مساءً'},
{cefr_level:'a1',skill:'reading',difficulty:0.50,question_text:'When is the shop closed?',question_context:'The shop opens at 9 AM and closes at 6 PM. It is closed on Fridays.',options:[{id:'a',text:'On Fridays'},{id:'b',text:'On Mondays'},{id:'c',text:'Every day'},{id:'d',text:'On weekends'}],correct_option_id:'a',explanation_ar:'المحل مغلق يوم الجمعة'},
{cefr_level:'a1',skill:'reading',difficulty:0.60,question_text:'Why is Tom happy?',question_context:'Tom got a new job last week. He works in a hospital. He is very happy because he always wanted to help people.',options:[{id:'a',text:'He got a new job he wanted.'},{id:'b',text:'He bought a new car.'},{id:'c',text:'He passed an exam.'},{id:'d',text:'He moved to a new city.'}],correct_option_id:'a',explanation_ar:'توم سعيد لأنه حصل على وظيفة أحلامه'},
{cefr_level:'a1',skill:'reading',difficulty:0.72,question_text:'Where does Tom work?',question_context:'Tom got a new job last week. He works in a hospital. He is very happy because he always wanted to help people.',options:[{id:'a',text:'In a hospital'},{id:'b',text:'In a school'},{id:'c',text:'In a shop'},{id:'d',text:'In an office'}],correct_option_id:'a',explanation_ar:'يعمل توم في مستشفى'},

// a1 context (2)
{cefr_level:'a1',skill:'context',difficulty:0.45,question_text:'A friend invites you to dinner. You want to accept. You say:',options:[{id:'a',text:'That sounds great, thank you!'},{id:'b',text:'I don\'t know you.'},{id:'c',text:'How much does it cost?'},{id:'d',text:'What is your job?'}],correct_option_id:'a',explanation_ar:'نقبل الدعوة بشكل لطيف'},
{cefr_level:'a1',skill:'context',difficulty:0.65,question_text:'You are lost. You want to ask for directions. You say:',options:[{id:'a',text:'Excuse me, could you tell me where the station is?'},{id:'b',text:'What time is it?'},{id:'c',text:'Do you have a pen?'},{id:'d',text:'How old are you?'}],correct_option_id:'a',explanation_ar:'نسأل عن الاتجاهات بأدب'},

// ═══════════════════════════════════════════════════════
// A2 (difficulty 0.8 - 1.5)
// ═══════════════════════════════════════════════════════

// a2 grammar (8)
{cefr_level:'a2',skill:'grammar',difficulty:0.85,question_text:'If it rains, I ___ stay at home.',options:[{id:'a',text:'will'},{id:'b',text:'would'},{id:'c',text:'am'},{id:'d',text:'do'}],correct_option_id:'a',explanation_ar:'نستخدم will في جملة الشرط الأول (if + present, will + base)'},
{cefr_level:'a2',skill:'grammar',difficulty:0.92,question_text:'She has lived here ___ 2015.',options:[{id:'a',text:'since'},{id:'b',text:'for'},{id:'c',text:'from'},{id:'d',text:'at'}],correct_option_id:'a',explanation_ar:'نستخدم since مع نقطة زمنية محددة'},
{cefr_level:'a2',skill:'grammar',difficulty:1.00,question_text:'The cake ___ by my mother yesterday.',options:[{id:'a',text:'was made'},{id:'b',text:'made'},{id:'c',text:'is made'},{id:'d',text:'makes'}],correct_option_id:'a',explanation_ar:'نستخدم المبني للمجهول was made لأن الكعكة لم تصنع نفسها'},
{cefr_level:'a2',skill:'grammar',difficulty:1.08,question_text:'You should ___ more water every day.',options:[{id:'a',text:'drink'},{id:'b',text:'drinks'},{id:'c',text:'drinking'},{id:'d',text:'drank'}],correct_option_id:'a',explanation_ar:'بعد should نستخدم المصدر'},
{cefr_level:'a2',skill:'grammar',difficulty:1.15,question_text:'I ___ to the gym three times a week.',options:[{id:'a',text:'go'},{id:'b',text:'goes'},{id:'c',text:'went'},{id:'d',text:'going'}],correct_option_id:'a',explanation_ar:'نستخدم المضارع البسيط مع العادات المتكررة'},
{cefr_level:'a2',skill:'grammar',difficulty:1.22,question_text:'He is ___ than his brother.',options:[{id:'a',text:'taller'},{id:'b',text:'tallest'},{id:'c',text:'tall'},{id:'d',text:'more tall'}],correct_option_id:'a',explanation_ar:'نستخدم صيغة المقارنة taller عند المقارنة بين اثنين'},
{cefr_level:'a2',skill:'grammar',difficulty:1.35,question_text:'I wish I ___ more time to study.',options:[{id:'a',text:'had'},{id:'b',text:'have'},{id:'c',text:'has'},{id:'d',text:'having'}],correct_option_id:'a',explanation_ar:'بعد wish نستخدم الماضي البسيط للتعبير عن أمنية'},
{cefr_level:'a2',skill:'grammar',difficulty:1.45,question_text:'Neither the students ___ the teacher was ready.',options:[{id:'a',text:'nor'},{id:'b',text:'or'},{id:'c',text:'and'},{id:'d',text:'but'}],correct_option_id:'a',explanation_ar:'neither يأتي مع nor'},

// a2 vocabulary (6)
{cefr_level:'a2',skill:'vocabulary',difficulty:0.85,question_text:'The train was ___ because of the bad weather.',options:[{id:'a',text:'delayed'},{id:'b',text:'destroyed'},{id:'c',text:'delivered'},{id:'d',text:'designed'}],correct_option_id:'a',explanation_ar:'تأخر القطار بسبب سوء الطقس'},
{cefr_level:'a2',skill:'vocabulary',difficulty:0.95,question_text:'She wants to ___ her English skills.',options:[{id:'a',text:'improve'},{id:'b',text:'remove'},{id:'c',text:'approve'},{id:'d',text:'prove'}],correct_option_id:'a',explanation_ar:'تريد تحسين مهاراتها في الإنجليزية'},
{cefr_level:'a2',skill:'vocabulary',difficulty:1.08,question_text:'The ___ of the movie was very surprising.',options:[{id:'a',text:'ending'},{id:'b',text:'beginning'},{id:'c',text:'ticket'},{id:'d',text:'screen'}],correct_option_id:'a',explanation_ar:'نهاية الفيلم كانت مفاجئة'},
{cefr_level:'a2',skill:'vocabulary',difficulty:1.18,question_text:'He received a ___ for his hard work.',options:[{id:'a',text:'reward'},{id:'b',text:'result'},{id:'c',text:'reason'},{id:'d',text:'record'}],correct_option_id:'a',explanation_ar:'حصل على مكافأة لعمله الجاد'},
{cefr_level:'a2',skill:'vocabulary',difficulty:1.30,question_text:'The government plans to ___ new laws next year.',options:[{id:'a',text:'introduce'},{id:'b',text:'produce'},{id:'c',text:'reduce'},{id:'d',text:'include'}],correct_option_id:'a',explanation_ar:'تخطط الحكومة لتقديم قوانين جديدة'},
{cefr_level:'a2',skill:'vocabulary',difficulty:1.42,question_text:'She has a strong ___ in education.',options:[{id:'a',text:'background'},{id:'b',text:'backyard'},{id:'c',text:'backward'},{id:'d',text:'backbone'}],correct_option_id:'a',explanation_ar:'لديها خلفية قوية في التعليم'},

// a2 reading (4)
{cefr_level:'a2',skill:'reading',difficulty:0.90,question_text:'What is the main problem with smartphones according to the text?',question_context:'Many people spend too much time on their smartphones. Studies show this can affect sleep quality and reduce face-to-face conversations with family.',options:[{id:'a',text:'They reduce sleep quality and family interaction.'},{id:'b',text:'They are too expensive.'},{id:'c',text:'They break easily.'},{id:'d',text:'They are hard to use.'}],correct_option_id:'a',explanation_ar:'الهواتف تؤثر على النوم والتواصل العائلي'},
{cefr_level:'a2',skill:'reading',difficulty:1.10,question_text:'What does the word "reduce" mean in this text?',question_context:'Many people spend too much time on their smartphones. Studies show this can affect sleep quality and reduce face-to-face conversations with family.',options:[{id:'a',text:'Make less'},{id:'b',text:'Make more'},{id:'c',text:'Remove completely'},{id:'d',text:'Change the type of'}],correct_option_id:'a',explanation_ar:'reduce تعني تقليل'},
{cefr_level:'a2',skill:'reading',difficulty:1.25,question_text:'Why does the writer recommend walking?',question_context:'Walking for 30 minutes a day can improve your health. It helps you stay fit, reduces stress, and is free. You don\'t need any special equipment.',options:[{id:'a',text:'It is healthy, reduces stress, and costs nothing.'},{id:'b',text:'It is faster than driving.'},{id:'c',text:'Doctors require it.'},{id:'d',text:'It builds muscle quickly.'}],correct_option_id:'a',explanation_ar:'المشي صحي ويقلل التوتر ومجاني'},
{cefr_level:'a2',skill:'reading',difficulty:1.40,question_text:'What does "equipment" mean in the text?',question_context:'Walking for 30 minutes a day can improve your health. It helps you stay fit, reduces stress, and is free. You don\'t need any special equipment.',options:[{id:'a',text:'Tools or items you need for an activity'},{id:'b',text:'A type of exercise'},{id:'c',text:'Medicine from a doctor'},{id:'d',text:'A kind of food'}],correct_option_id:'a',explanation_ar:'equipment تعني المعدات أو الأدوات'},

// a2 context (2)
{cefr_level:'a2',skill:'context',difficulty:1.00,question_text:'Your colleague looks tired and stressed. You say:',options:[{id:'a',text:'Is everything alright? You look tired.'},{id:'b',text:'You should go to the gym.'},{id:'c',text:'What did you eat today?'},{id:'d',text:'When is your birthday?'}],correct_option_id:'a',explanation_ar:'نسأل عن حال الشخص عندما يبدو متعباً'},
{cefr_level:'a2',skill:'context',difficulty:1.30,question_text:'You disagree with a friend\'s opinion politely. You say:',options:[{id:'a',text:'I see your point, but I think differently.'},{id:'b',text:'You are completely wrong.'},{id:'c',text:'I don\'t care about your opinion.'},{id:'d',text:'That\'s the worst idea ever.'}],correct_option_id:'a',explanation_ar:'نعبر عن الاختلاف بأدب'},

// ═══════════════════════════════════════════════════════
// B1 (difficulty 1.5 - 2.2)
// ═══════════════════════════════════════════════════════

// b1 grammar (8)
{cefr_level:'b1',skill:'grammar',difficulty:1.55,question_text:'By the time she arrived, the meeting ___.',options:[{id:'a',text:'had already started'},{id:'b',text:'already started'},{id:'c',text:'has already started'},{id:'d',text:'was already starting'}],correct_option_id:'a',explanation_ar:'نستخدم الماضي التام للحدث الذي وقع أولاً'},
{cefr_level:'b1',skill:'grammar',difficulty:1.62,question_text:'He asked me where I ___.',options:[{id:'a',text:'lived'},{id:'b',text:'live'},{id:'c',text:'living'},{id:'d',text:'was live'}],correct_option_id:'a',explanation_ar:'في الكلام المنقول نحول المضارع إلى ماضي'},
{cefr_level:'b1',skill:'grammar',difficulty:1.70,question_text:'The project must ___ by Friday.',options:[{id:'a',text:'be completed'},{id:'b',text:'complete'},{id:'c',text:'completed'},{id:'d',text:'completing'}],correct_option_id:'a',explanation_ar:'المبني للمجهول بعد must يكون be + past participle'},
{cefr_level:'b1',skill:'grammar',difficulty:1.78,question_text:'I would have called you if I ___ your number.',options:[{id:'a',text:'had had'},{id:'b',text:'have'},{id:'c',text:'would have'},{id:'d',text:'had'}],correct_option_id:'a',explanation_ar:'الشرط الثالث: if + past perfect, would have + past participle'},
{cefr_level:'b1',skill:'grammar',difficulty:1.85,question_text:'___ she been waiting long before you arrived?',options:[{id:'a',text:'Had'},{id:'b',text:'Has'},{id:'c',text:'Was'},{id:'d',text:'Did'}],correct_option_id:'a',explanation_ar:'الماضي التام المستمر: Had + been + verb-ing'},
{cefr_level:'b1',skill:'grammar',difficulty:1.92,question_text:'The more you practice, the ___ you will become.',options:[{id:'a',text:'better'},{id:'b',text:'best'},{id:'c',text:'good'},{id:'d',text:'well'}],correct_option_id:'a',explanation_ar:'the more... the better — تركيب المقارنة التدريجية'},
{cefr_level:'b1',skill:'grammar',difficulty:2.00,question_text:'She insisted ___ paying for the dinner.',options:[{id:'a',text:'on'},{id:'b',text:'to'},{id:'c',text:'for'},{id:'d',text:'in'}],correct_option_id:'a',explanation_ar:'insist يأتي مع on + verb-ing'},
{cefr_level:'b1',skill:'grammar',difficulty:2.10,question_text:'Not only ___ the exam, but she also got the highest mark.',options:[{id:'a',text:'did she pass'},{id:'b',text:'she passed'},{id:'c',text:'she did pass'},{id:'d',text:'passed she'}],correct_option_id:'a',explanation_ar:'بعد Not only نستخدم الانعكاس (auxiliary + subject)'},

// b1 vocabulary (6)
{cefr_level:'b1',skill:'vocabulary',difficulty:1.55,question_text:'The company plans to ___ into new markets next year.',options:[{id:'a',text:'expand'},{id:'b',text:'extend'},{id:'c',text:'expose'},{id:'d',text:'express'}],correct_option_id:'a',explanation_ar:'expand تعني التوسع في أسواق جديدة'},
{cefr_level:'b1',skill:'vocabulary',difficulty:1.68,question_text:'The ___ between the two countries has improved recently.',options:[{id:'a',text:'relationship'},{id:'b',text:'relative'},{id:'c',text:'relation'},{id:'d',text:'reliability'}],correct_option_id:'a',explanation_ar:'العلاقة بين البلدين تحسنت'},
{cefr_level:'b1',skill:'vocabulary',difficulty:1.80,question_text:'She ___ her opinion clearly during the meeting.',options:[{id:'a',text:'expressed'},{id:'b',text:'impressed'},{id:'c',text:'compressed'},{id:'d',text:'depressed'}],correct_option_id:'a',explanation_ar:'عبّرت عن رأيها بوضوح'},
{cefr_level:'b1',skill:'vocabulary',difficulty:1.90,question_text:'The experiment ___ that the theory was correct.',options:[{id:'a',text:'confirmed'},{id:'b',text:'confused'},{id:'c',text:'contained'},{id:'d',text:'connected'}],correct_option_id:'a',explanation_ar:'التجربة أكدت صحة النظرية'},
{cefr_level:'b1',skill:'vocabulary',difficulty:2.02,question_text:'The project was ___ due to lack of funding.',options:[{id:'a',text:'abandoned'},{id:'b',text:'adapted'},{id:'c',text:'adopted'},{id:'d',text:'absorbed'}],correct_option_id:'a',explanation_ar:'تم التخلي عن المشروع بسبب نقص التمويل'},
{cefr_level:'b1',skill:'vocabulary',difficulty:2.15,question_text:'The new policy had a significant ___ on the economy.',options:[{id:'a',text:'impact'},{id:'b',text:'import'},{id:'c',text:'imprint'},{id:'d',text:'impulse'}],correct_option_id:'a',explanation_ar:'السياسة الجديدة كان لها تأثير كبير على الاقتصاد'},

// b1 reading (4)
{cefr_level:'b1',skill:'reading',difficulty:1.60,question_text:'What is the main argument of the passage?',question_context:'Remote work has become increasingly popular since 2020. While it offers flexibility and eliminates commuting time, some researchers argue it can lead to isolation and difficulty separating work from personal life.',options:[{id:'a',text:'Remote work has both advantages and disadvantages.'},{id:'b',text:'Remote work is always better than office work.'},{id:'c',text:'Remote work should be banned.'},{id:'d',text:'Everyone prefers working from home.'}],correct_option_id:'a',explanation_ar:'النص يناقش مزايا وعيوب العمل عن بُعد'},
{cefr_level:'b1',skill:'reading',difficulty:1.80,question_text:'What can be inferred about the author\'s view?',question_context:'Remote work has become increasingly popular since 2020. While it offers flexibility and eliminates commuting time, some researchers argue it can lead to isolation and difficulty separating work from personal life.',options:[{id:'a',text:'The author presents a balanced perspective.'},{id:'b',text:'The author strongly supports remote work.'},{id:'c',text:'The author opposes remote work.'},{id:'d',text:'The author has no opinion.'}],correct_option_id:'a',explanation_ar:'الكاتب يقدم وجهة نظر متوازنة'},
{cefr_level:'b1',skill:'reading',difficulty:1.95,question_text:'According to the text, what is the effect of social media on news?',question_context:'Social media has changed how people consume news. While it makes information more accessible, it has also made it harder to distinguish between reliable sources and misinformation. Critical thinking skills are more important than ever.',options:[{id:'a',text:'It makes news accessible but increases misinformation.'},{id:'b',text:'It only spreads false information.'},{id:'c',text:'It has replaced all traditional media.'},{id:'d',text:'It has no significant effect on news.'}],correct_option_id:'a',explanation_ar:'وسائل التواصل تسهل الوصول للأخبار لكنها تزيد المعلومات المضللة'},
{cefr_level:'b1',skill:'reading',difficulty:2.12,question_text:'What does the author suggest as a solution?',question_context:'Social media has changed how people consume news. While it makes information more accessible, it has also made it harder to distinguish between reliable sources and misinformation. Critical thinking skills are more important than ever.',options:[{id:'a',text:'Developing critical thinking skills'},{id:'b',text:'Banning social media'},{id:'c',text:'Reading only newspapers'},{id:'d',text:'Ignoring all online news'}],correct_option_id:'a',explanation_ar:'الكاتب يقترح تطوير مهارات التفكير النقدي'},

// b1 context (2)
{cefr_level:'b1',skill:'context',difficulty:1.70,question_text:'In a job interview, the interviewer asks "What is your greatest weakness?" A good response would be:',options:[{id:'a',text:'I sometimes focus too much on details, but I\'m working on managing my time better.'},{id:'b',text:'I have no weaknesses.'},{id:'c',text:'I don\'t like working with other people.'},{id:'d',text:'I\'m always late to work.'}],correct_option_id:'a',explanation_ar:'الإجابة الجيدة تذكر نقطة ضعف مع خطة تحسين'},
{cefr_level:'b1',skill:'context',difficulty:2.05,question_text:'You need to decline an invitation to a formal event. The most appropriate response is:',options:[{id:'a',text:'Thank you for the invitation. Unfortunately, I have a prior commitment and won\'t be able to attend.'},{id:'b',text:'No, I\'m busy.'},{id:'c',text:'I don\'t want to come.'},{id:'d',text:'Maybe, I\'ll think about it.'}],correct_option_id:'a',explanation_ar:'نعتذر بشكل رسمي ومهذب مع ذكر السبب'},

// ═══════════════════════════════════════════════════════
// B2 (difficulty 2.0 - 2.8)
// ═══════════════════════════════════════════════════════

// b2 grammar (8)
{cefr_level:'b2',skill:'grammar',difficulty:2.05,question_text:'Had I known about the change, I ___ differently.',options:[{id:'a',text:'would have acted'},{id:'b',text:'will act'},{id:'c',text:'would act'},{id:'d',text:'have acted'}],correct_option_id:'a',explanation_ar:'الشرط الثالث المقلوب: Had + subject + pp, would have + pp'},
{cefr_level:'b2',skill:'grammar',difficulty:2.15,question_text:'The report, ___ was published last week, highlights several issues.',options:[{id:'a',text:'which'},{id:'b',text:'who'},{id:'c',text:'what'},{id:'d',text:'whom'}],correct_option_id:'a',explanation_ar:'which تستخدم للأشياء في الجمل الوصفية غير المحددة'},
{cefr_level:'b2',skill:'grammar',difficulty:2.22,question_text:'She spoke so quietly that we could hardly ___ what she said.',options:[{id:'a',text:'make out'},{id:'b',text:'make up'},{id:'c',text:'make over'},{id:'d',text:'make off'}],correct_option_id:'a',explanation_ar:'make out تعني فهم أو تمييز شيء بصعوبة'},
{cefr_level:'b2',skill:'grammar',difficulty:2.30,question_text:'It\'s high time we ___ a decision about this project.',options:[{id:'a',text:'made'},{id:'b',text:'make'},{id:'c',text:'making'},{id:'d',text:'will make'}],correct_option_id:'a',explanation_ar:'بعد It\'s high time نستخدم الماضي البسيط'},
{cefr_level:'b2',skill:'grammar',difficulty:2.38,question_text:'___ the circumstances, I think we handled it well.',options:[{id:'a',text:'Given'},{id:'b',text:'Giving'},{id:'c',text:'Gave'},{id:'d',text:'Give'}],correct_option_id:'a',explanation_ar:'Given the circumstances تعني بالنظر إلى الظروف'},
{cefr_level:'b2',skill:'grammar',difficulty:2.48,question_text:'She denied ___ involved in the incident.',options:[{id:'a',text:'being'},{id:'b',text:'to be'},{id:'c',text:'be'},{id:'d',text:'been'}],correct_option_id:'a',explanation_ar:'deny يتبعه gerund (verb + ing)'},
{cefr_level:'b2',skill:'grammar',difficulty:2.58,question_text:'No sooner had the lecture started ___ the fire alarm went off.',options:[{id:'a',text:'than'},{id:'b',text:'when'},{id:'c',text:'that'},{id:'d',text:'before'}],correct_option_id:'a',explanation_ar:'no sooner... than هي تركيبة ثابتة'},
{cefr_level:'b2',skill:'grammar',difficulty:2.70,question_text:'Were she ___ the truth, the outcome would have been different.',options:[{id:'a',text:'to have told'},{id:'b',text:'telling'},{id:'c',text:'told'},{id:'d',text:'to tell'}],correct_option_id:'a',explanation_ar:'الشرط الثالث المقلوب بدون if: Were + subject + to have + pp'},

// b2 vocabulary (6)
{cefr_level:'b2',skill:'vocabulary',difficulty:2.08,question_text:'The committee will ___ the proposal at the next meeting.',options:[{id:'a',text:'scrutinize'},{id:'b',text:'summarize'},{id:'c',text:'subsidize'},{id:'d',text:'symbolize'}],correct_option_id:'a',explanation_ar:'scrutinize تعني فحص بدقة وتمعن'},
{cefr_level:'b2',skill:'vocabulary',difficulty:2.20,question_text:'The new evidence ___ the previous findings.',options:[{id:'a',text:'corroborated'},{id:'b',text:'contradicted'},{id:'c',text:'corrupted'},{id:'d',text:'corrected'}],correct_option_id:'a',explanation_ar:'corroborated تعني أكدت ودعمت النتائج السابقة'},
{cefr_level:'b2',skill:'vocabulary',difficulty:2.32,question_text:'Her ___ to the project was invaluable.',options:[{id:'a',text:'contribution'},{id:'b',text:'constitution'},{id:'c',text:'construction'},{id:'d',text:'consultation'}],correct_option_id:'a',explanation_ar:'مساهمتها في المشروع كانت لا تُقدّر بثمن'},
{cefr_level:'b2',skill:'vocabulary',difficulty:2.45,question_text:'The politician\'s speech was full of ___ promises.',options:[{id:'a',text:'hollow'},{id:'b',text:'shallow'},{id:'c',text:'narrow'},{id:'d',text:'mellow'}],correct_option_id:'a',explanation_ar:'hollow promises تعني وعود فارغة'},
{cefr_level:'b2',skill:'vocabulary',difficulty:2.58,question_text:'The scientist\'s theory was considered ___ by her peers.',options:[{id:'a',text:'groundbreaking'},{id:'b',text:'heartbreaking'},{id:'c',text:'breathtaking'},{id:'d',text:'backbreaking'}],correct_option_id:'a',explanation_ar:'groundbreaking تعني رائدة ومبتكرة'},
{cefr_level:'b2',skill:'vocabulary',difficulty:2.72,question_text:'The diplomat tried to ___ tensions between the two nations.',options:[{id:'a',text:'alleviate'},{id:'b',text:'aggravate'},{id:'c',text:'alienate'},{id:'d',text:'alternate'}],correct_option_id:'a',explanation_ar:'alleviate تعني تخفيف حدة التوتر'},

// b2 reading (4)
{cefr_level:'b2',skill:'reading',difficulty:2.10,question_text:'What is the author\'s primary concern about AI?',question_context:'Artificial intelligence is transforming industries at an unprecedented pace. While proponents celebrate increased efficiency, critics warn that without proper regulation, AI could exacerbate existing inequalities and create new ethical dilemmas that society is ill-prepared to address.',options:[{id:'a',text:'Lack of regulation may worsen inequality and ethics issues.'},{id:'b',text:'AI is too slow to be useful.'},{id:'c',text:'AI will replace all human jobs.'},{id:'d',text:'AI is too expensive to develop.'}],correct_option_id:'a',explanation_ar:'القلق الرئيسي هو غياب التنظيم وتفاقم عدم المساواة'},
{cefr_level:'b2',skill:'reading',difficulty:2.30,question_text:'What does "exacerbate" mean in context?',question_context:'Artificial intelligence is transforming industries at an unprecedented pace. While proponents celebrate increased efficiency, critics warn that without proper regulation, AI could exacerbate existing inequalities and create new ethical dilemmas that society is ill-prepared to address.',options:[{id:'a',text:'Make worse'},{id:'b',text:'Eliminate'},{id:'c',text:'Measure'},{id:'d',text:'Ignore'}],correct_option_id:'a',explanation_ar:'exacerbate تعني تفاقم أو جعل الأمر أسوأ'},
{cefr_level:'b2',skill:'reading',difficulty:2.50,question_text:'What does the author imply about multilingualism?',question_context:'Research suggests that multilingual individuals often demonstrate enhanced cognitive flexibility and creative problem-solving abilities. However, the relationship between language and cognition is nuanced; fluency level, age of acquisition, and frequency of use all moderate these cognitive advantages.',options:[{id:'a',text:'The cognitive benefits depend on multiple factors beyond simply knowing languages.'},{id:'b',text:'Everyone should learn three languages.'},{id:'c',text:'Monolingual people cannot think creatively.'},{id:'d',text:'Children learn languages faster than adults.'}],correct_option_id:'a',explanation_ar:'الفوائد المعرفية تعتمد على عوامل متعددة وليس مجرد معرفة اللغات'},
{cefr_level:'b2',skill:'reading',difficulty:2.68,question_text:'The word "moderate" in this context means:',question_context:'Research suggests that multilingual individuals often demonstrate enhanced cognitive flexibility and creative problem-solving abilities. However, the relationship between language and cognition is nuanced; fluency level, age of acquisition, and frequency of use all moderate these cognitive advantages.',options:[{id:'a',text:'Influence or adjust the degree of'},{id:'b',text:'Make average or ordinary'},{id:'c',text:'Reduce to zero'},{id:'d',text:'Keep at a constant level'}],correct_option_id:'a',explanation_ar:'moderate هنا تعني تؤثر على درجة أو تعدّل'},

// b2 context (2)
{cefr_level:'b2',skill:'context',difficulty:2.25,question_text:'In an academic discussion, you want to challenge a colleague\'s argument respectfully. You say:',options:[{id:'a',text:'That\'s an interesting perspective, but I wonder if we\'ve considered the alternative evidence suggesting otherwise.'},{id:'b',text:'You\'re wrong and here\'s why.'},{id:'c',text:'I think that\'s a terrible argument.'},{id:'d',text:'Whatever you say.'}],correct_option_id:'a',explanation_ar:'نتحدى الحجة بأدب أكاديمي مع الإشارة لأدلة بديلة'},
{cefr_level:'b2',skill:'context',difficulty:2.55,question_text:'You are writing a formal complaint about a service. The most appropriate opening is:',options:[{id:'a',text:'I am writing to express my dissatisfaction regarding the service I received on the 5th of March.'},{id:'b',text:'Your service was terrible and I want my money back now.'},{id:'c',text:'Hi, I had a bad experience.'},{id:'d',text:'I\'m angry about what happened.'}],correct_option_id:'a',explanation_ar:'الشكوى الرسمية تبدأ بتحديد الغرض والتاريخ بشكل مهذب'},

// ═══════════════════════════════════════════════════════
// C1 (difficulty 2.5 - 3.0)
// ═══════════════════════════════════════════════════════

// c1 grammar (8)
{cefr_level:'c1',skill:'grammar',difficulty:2.55,question_text:'Scarcely ___ the announcement been made when the crowd erupted in protest.',options:[{id:'a',text:'had'},{id:'b',text:'has'},{id:'c',text:'was'},{id:'d',text:'did'}],correct_option_id:'a',explanation_ar:'Scarcely + had + subject + pp — تركيب انعكاسي يعبر عن تتابع سريع'},
{cefr_level:'c1',skill:'grammar',difficulty:2.62,question_text:'The proposal, controversial ___ it may seem, has considerable merit.',options:[{id:'a',text:'though'},{id:'b',text:'despite'},{id:'c',text:'however'},{id:'d',text:'although'}],correct_option_id:'a',explanation_ar:'adjective + though/as + subject + may — تركيب تنازلي متقدم'},
{cefr_level:'c1',skill:'grammar',difficulty:2.68,question_text:'Under no circumstances ___ this information to be shared externally.',options:[{id:'a',text:'is'},{id:'b',text:'does'},{id:'c',text:'has'},{id:'d',text:'will'}],correct_option_id:'a',explanation_ar:'بعد Under no circumstances نستخدم الانعكاس'},
{cefr_level:'c1',skill:'grammar',difficulty:2.75,question_text:'So ___ was the damage that the building had to be demolished.',options:[{id:'a',text:'extensive'},{id:'b',text:'extending'},{id:'c',text:'extended'},{id:'d',text:'extent'}],correct_option_id:'a',explanation_ar:'So + adjective + was... that — تركيب تأكيدي مقلوب'},
{cefr_level:'c1',skill:'grammar',difficulty:2.80,question_text:'The research, ___ implications are far-reaching, has been peer-reviewed.',options:[{id:'a',text:'whose'},{id:'b',text:'which'},{id:'c',text:'that'},{id:'d',text:'whom'}],correct_option_id:'a',explanation_ar:'whose تُستخدم للملكية مع الأشياء والأشخاص'},
{cefr_level:'c1',skill:'grammar',difficulty:2.85,question_text:'It is imperative that every participant ___ the guidelines thoroughly.',options:[{id:'a',text:'review'},{id:'b',text:'reviews'},{id:'c',text:'reviewed'},{id:'d',text:'reviewing'}],correct_option_id:'a',explanation_ar:'بعد it is imperative that نستخدم صيغة المصدر (subjunctive)'},
{cefr_level:'c1',skill:'grammar',difficulty:2.90,question_text:'Little ___ they realize the consequences of their decision at the time.',options:[{id:'a',text:'did'},{id:'b',text:'do'},{id:'c',text:'had'},{id:'d',text:'were'}],correct_option_id:'a',explanation_ar:'Little did + subject + verb — تركيب انعكاسي للتأكيد'},
{cefr_level:'c1',skill:'grammar',difficulty:2.97,question_text:'___ it not for her intervention, the project would have collapsed entirely.',options:[{id:'a',text:'Were'},{id:'b',text:'Was'},{id:'c',text:'Had'},{id:'d',text:'Should'}],correct_option_id:'a',explanation_ar:'Were it not for — الشرط المقلوب الرسمي بدون if'},

// c1 vocabulary (6)
{cefr_level:'c1',skill:'vocabulary',difficulty:2.55,question_text:'The professor\'s argument was both ___ and well-substantiated.',options:[{id:'a',text:'cogent'},{id:'b',text:'complacent'},{id:'c',text:'competent'},{id:'d',text:'coherent'}],correct_option_id:'a',explanation_ar:'cogent تعني مقنعة وقوية الحجة'},
{cefr_level:'c1',skill:'vocabulary',difficulty:2.65,question_text:'The CEO\'s ___ leadership style alienated many employees.',options:[{id:'a',text:'autocratic'},{id:'b',text:'authentic'},{id:'c',text:'automatic'},{id:'d',text:'autonomous'}],correct_option_id:'a',explanation_ar:'autocratic تعني استبدادي — أسلوب قيادة يستأثر بالقرار'},
{cefr_level:'c1',skill:'vocabulary',difficulty:2.72,question_text:'The artist\'s latest work is a ___ commentary on modern consumerism.',options:[{id:'a',text:'scathing'},{id:'b',text:'soothing'},{id:'c',text:'sprawling'},{id:'d',text:'sputtering'}],correct_option_id:'a',explanation_ar:'scathing تعني لاذعة وقاسية في النقد'},
{cefr_level:'c1',skill:'vocabulary',difficulty:2.80,question_text:'The company\'s financial irregularities were ___ by an internal audit.',options:[{id:'a',text:'unearthed'},{id:'b',text:'undermined'},{id:'c',text:'understated'},{id:'d',text:'undertaken'}],correct_option_id:'a',explanation_ar:'unearthed تعني تم الكشف عنها أو اكتشافها'},
{cefr_level:'c1',skill:'vocabulary',difficulty:2.88,question_text:'Her writing style is characterized by a ___ wit and sharp observations.',options:[{id:'a',text:'sardonic'},{id:'b',text:'symbiotic'},{id:'c',text:'systematic'},{id:'d',text:'synthetic'}],correct_option_id:'a',explanation_ar:'sardonic تعني ساخرة بشكل لاذع ومرير'},
{cefr_level:'c1',skill:'vocabulary',difficulty:2.95,question_text:'The treaty was designed to ___ the longstanding territorial dispute.',options:[{id:'a',text:'adjudicate'},{id:'b',text:'advocate'},{id:'c',text:'admonish'},{id:'d',text:'adulterate'}],correct_option_id:'a',explanation_ar:'adjudicate تعني الفصل في النزاع بشكل رسمي'},

// c1 reading (4)
{cefr_level:'c1',skill:'reading',difficulty:2.60,question_text:'What rhetorical strategy does the author employ in this passage?',question_context:'One might argue that the digital revolution has democratized knowledge. Yet, paradoxically, the very abundance of information has engendered a crisis of discernment — where the capacity to evaluate, synthesize, and critically engage with information has become the true marker of an educated mind.',options:[{id:'a',text:'Presenting a common view then challenging it with a paradox'},{id:'b',text:'Using statistics to prove a point'},{id:'c',text:'Telling a personal story'},{id:'d',text:'Listing facts chronologically'}],correct_option_id:'a',explanation_ar:'الكاتب يعرض رأياً شائعاً ثم يتحداه بمفارقة'},
{cefr_level:'c1',skill:'reading',difficulty:2.72,question_text:'What does "engendered" mean in this context?',question_context:'One might argue that the digital revolution has democratized knowledge. Yet, paradoxically, the very abundance of information has engendered a crisis of discernment — where the capacity to evaluate, synthesize, and critically engage with information has become the true marker of an educated mind.',options:[{id:'a',text:'Caused to come into existence'},{id:'b',text:'Prevented from happening'},{id:'c',text:'Quickly solved'},{id:'d',text:'Made less important'}],correct_option_id:'a',explanation_ar:'engendered تعني تسبب في وجودها أو ولّدها'},
{cefr_level:'c1',skill:'reading',difficulty:2.82,question_text:'What is the author\'s underlying assumption?',question_context:'The commodification of higher education has transformed students into consumers and universities into service providers. This transactional paradigm, while superficially efficient, fundamentally undermines the Socratic ideal of education as a transformative dialogue between minds.',options:[{id:'a',text:'Education should prioritize intellectual transformation over market efficiency.'},{id:'b',text:'Universities should charge higher fees.'},{id:'c',text:'Students are always right as consumers.'},{id:'d',text:'The Socratic method is outdated.'}],correct_option_id:'a',explanation_ar:'الكاتب يفترض أن التعليم يجب أن يكون حواراً تحويلياً وليس معاملة تجارية'},
{cefr_level:'c1',skill:'reading',difficulty:2.95,question_text:'Which word best describes the author\'s tone?',question_context:'The commodification of higher education has transformed students into consumers and universities into service providers. This transactional paradigm, while superficially efficient, fundamentally undermines the Socratic ideal of education as a transformative dialogue between minds.',options:[{id:'a',text:'Critical and philosophical'},{id:'b',text:'Enthusiastic and supportive'},{id:'c',text:'Neutral and detached'},{id:'d',text:'Humorous and lighthearted'}],correct_option_id:'a',explanation_ar:'نبرة الكاتب نقدية وفلسفية'},

// c1 context (2)
{cefr_level:'c1',skill:'context',difficulty:2.70,question_text:'In a panel discussion, you want to synthesize two opposing viewpoints before offering your own. You say:',options:[{id:'a',text:'While Dr. Smith emphasizes the economic implications and Professor Jones foregrounds the ethical dimensions, I believe we need an integrated framework that addresses both concerns simultaneously.'},{id:'b',text:'I agree with both speakers.'},{id:'c',text:'They are both wrong.'},{id:'d',text:'Let me change the topic completely.'}],correct_option_id:'a',explanation_ar:'ندمج وجهتي النظر ثم نقدم إطاراً شاملاً'},
{cefr_level:'c1',skill:'context',difficulty:2.90,question_text:'You are writing a nuanced academic conclusion. The most appropriate phrasing is:',options:[{id:'a',text:'While the findings are suggestive rather than conclusive, they nonetheless illuminate a hitherto underexplored dimension of the phenomenon and warrant further investigation.'},{id:'b',text:'In conclusion, we proved everything we wanted to prove.'},{id:'c',text:'The results speak for themselves.'},{id:'d',text:'More research is needed.'}],correct_option_id:'a',explanation_ar:'الخاتمة الأكاديمية الدقيقة تعترف بحدود النتائج وتشير لأهميتها'},

];

async function run() {
  const client = await pool.connect();
  try {
    console.log('=== Seeding Placement Question Bank ===\n');
    console.log(`Total questions to insert: ${questions.length}\n`);

    let inserted = 0;
    let skipped = 0;

    for (const q of questions) {
      const result = await client.query(`
        INSERT INTO placement_question_bank (
          cefr_level, skill, difficulty, question_text, question_context,
          options, correct_option_id, explanation_ar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (question_text) DO NOTHING
        RETURNING id
      `, [
        q.cefr_level,
        q.skill,
        q.difficulty,
        q.question_text,
        q.question_context || null,
        JSON.stringify(q.options),
        q.correct_option_id,
        q.explanation_ar
      ]);

      if (result.rowCount > 0) inserted++;
      else skipped++;
    }

    console.log(`Inserted: ${inserted}, Skipped (duplicates): ${skipped}\n`);

    // Verify counts per (cefr_level, skill)
    const { rows: counts } = await client.query(`
      SELECT cefr_level, skill, COUNT(*) as count
      FROM placement_question_bank
      WHERE is_active = true
      GROUP BY cefr_level, skill
      ORDER BY
        CASE cefr_level
          WHEN 'pre_a1' THEN 1 WHEN 'a1' THEN 2 WHEN 'a2' THEN 3
          WHEN 'b1' THEN 4 WHEN 'b2' THEN 5 WHEN 'c1' THEN 6
        END,
        skill
    `);

    console.log('=== Question Bank Coverage ===');
    let currentLevel = '';
    for (const row of counts) {
      if (row.cefr_level !== currentLevel) {
        currentLevel = row.cefr_level;
        process.stdout.write(`\n  ${currentLevel.padEnd(7)}: `);
      }
      process.stdout.write(`${row.skill}=${row.count} `);
    }

    const { rows: [{ total }] } = await client.query(
      'SELECT COUNT(*) as total FROM placement_question_bank WHERE is_active = true'
    );
    console.log(`\n\nTotal active questions: ${total}`);

    // Check minimum per cell
    const minCount = Math.min(...counts.map(r => parseInt(r.count)));
    console.log(`Minimum per cell: ${minCount}`);
    if (minCount < 2) {
      console.log('WARNING: Some cells have fewer than 2 questions!');
    } else {
      console.log('All cells have sufficient questions.');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
