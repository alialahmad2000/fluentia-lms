const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

async function insertBatch(client, words, unitNumber, batchId) {
  let inserted = 0;
  for (const w of words) {
    try {
      await client.query(
        `INSERT INTO public.vocab_staging_l4 (word, pos, definition_ar, example_en, example_ar, recommended_tier, cefr_level, source_list, recommended_unit, batch_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (word) DO NOTHING`,
        [w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], unitNumber, batchId]
      );
      inserted++;
    } catch(e) { console.error(`Error "${w[0]}":`, e.message); }
  }
  return inserted;
}

const BATCH_ID = 25;

// Unit 1: Bioethics — B1 reinforcement
const unit1 = [
  ["health", "noun", "صحة", "Good health is important for everyone.", "الصحة الجيدة مهمة للجميع.", "core", "B1", "NGSL"],
  ["disease", "noun", "مرض", "The disease spread quickly through the village.", "انتشر المرض بسرعة في القرية.", "core", "B1", "NGSL"],
  ["medicine", "noun", "دواء", "She takes medicine every morning.", "تأخذ الدواء كل صباح.", "core", "B1", "NGSL"],
  ["patient", "noun", "مريض", "The patient waited to see the doctor.", "انتظر المريض لرؤية الطبيب.", "core", "B1", "NGSL"],
  ["doctor", "noun", "طبيب", "The doctor examined the child carefully.", "فحص الطبيب الطفل بعناية.", "core", "B1", "NGSL"],
  ["nurse", "noun", "ممرضة", "The nurse checked his temperature.", "فحصت الممرضة درجة حرارته.", "core", "B1", "NGSL"],
  ["hospital", "noun", "مستشفى", "He was taken to the hospital by ambulance.", "نُقل إلى المستشفى بسيارة الإسعاف.", "core", "B1", "NGSL"],
  ["treatment", "noun", "علاج", "The treatment lasted for three months.", "استمر العلاج لمدة ثلاثة أشهر.", "core", "B1", "NGSL"],
  ["surgery", "noun", "جراحة", "She had surgery on her knee last week.", "أجرت جراحة في ركبتها الأسبوع الماضي.", "core", "B1", "NGSL"],
  ["blood", "noun", "دم", "The nurse took a blood sample.", "أخذت الممرضة عينة دم.", "core", "B1", "NGSL"],
  ["heart", "noun", "قلب", "Your heart beats about 100,000 times a day.", "ينبض قلبك حوالي 100,000 مرة في اليوم.", "core", "B1", "NGSL"],
  ["brain", "noun", "دماغ", "The brain controls all body functions.", "يتحكم الدماغ بجميع وظائف الجسم.", "core", "B1", "NGSL"],
  ["skin", "noun", "جلد", "The sun can damage your skin.", "يمكن للشمس أن تضر بجلدك.", "core", "B1", "NGSL"],
  ["bone", "noun", "عظم", "He broke a bone in his arm.", "كسر عظمة في ذراعه.", "core", "B1", "NGSL"],
  ["muscle", "noun", "عضلة", "Exercise makes your muscles stronger.", "التمارين تجعل عضلاتك أقوى.", "core", "B1", "NGSL"],
  ["stomach", "noun", "معدة", "My stomach hurts after eating too much.", "تؤلمني معدتي بعد الأكل الكثير.", "core", "B1", "NGSL"],
  ["lung", "noun", "رئة", "Smoking damages your lungs.", "التدخين يضر برئتيك.", "core", "B1", "NGSL"],
  ["liver", "noun", "كبد", "The liver cleans your blood.", "يُنظّف الكبد دمك.", "core", "B1", "CEFR-J"],
  ["kidney", "noun", "كلية", "Each person has two kidneys.", "لكل شخص كليتان.", "core", "B1", "CEFR-J"],
  ["pain", "noun", "ألم", "She felt a sharp pain in her back.", "شعرت بألم حاد في ظهرها.", "core", "B1", "NGSL"],
  ["fever", "noun", "حمّى", "The child had a high fever.", "كان لدى الطفل حمّى شديدة.", "core", "B1", "NGSL"],
  ["cough", "noun", "سعال", "He has had a bad cough for a week.", "لديه سعال سيء منذ أسبوع.", "core", "B1", "NGSL"],
  ["symptom", "noun", "عَرَض", "Fever is a common symptom of the flu.", "الحمّى عَرَض شائع للإنفلونزا.", "core", "B1", "CEFR-J"],
  ["cure", "noun", "علاج شافٍ", "Scientists are looking for a cure for cancer.", "يبحث العلماء عن علاج شافٍ للسرطان.", "core", "B1", "NGSL"],
  ["heal", "verb", "يشفي", "The wound took a long time to heal.", "استغرق الجرح وقتاً طويلاً ليشفى.", "core", "B1", "NGSL"],
];

// Unit 2: Deep Ocean — B1 reinforcement
const unit2 = [
  ["ocean", "noun", "محيط", "The Pacific is the largest ocean.", "المحيط الهادئ هو أكبر محيط.", "core", "B1", "NGSL"],
  ["sea", "noun", "بحر", "We swam in the sea every day.", "سبحنا في البحر كل يوم.", "core", "B1", "NGSL"],
  ["water", "noun", "ماء", "Clean water is essential for life.", "الماء النظيف ضروري للحياة.", "core", "B1", "NGSL"],
  ["fish", "noun", "سمكة", "There are many kinds of fish in the river.", "هناك أنواع كثيرة من الأسماك في النهر.", "core", "B1", "NGSL"],
  ["whale", "noun", "حوت", "The blue whale is the largest animal on Earth.", "الحوت الأزرق هو أكبر حيوان على الأرض.", "core", "B1", "CEFR-J"],
  ["shark", "noun", "قرش", "Sharks have been around for millions of years.", "القروش موجودة منذ ملايين السنين.", "core", "B1", "CEFR-J"],
  ["wave", "noun", "موجة", "The waves were very high during the storm.", "كانت الأمواج عالية جداً أثناء العاصفة.", "core", "B1", "NGSL"],
  ["beach", "noun", "شاطئ", "We spent the afternoon on the beach.", "قضينا بعد الظهر على الشاطئ.", "core", "B1", "NGSL"],
  ["island", "noun", "جزيرة", "They traveled to a small island by boat.", "سافروا إلى جزيرة صغيرة بالقارب.", "core", "B1", "NGSL"],
  ["boat", "noun", "قارب", "The fisherman went out in his boat.", "خرج الصياد في قاربه.", "core", "B1", "NGSL"],
  ["ship", "noun", "سفينة", "The ship sailed across the Atlantic.", "أبحرت السفينة عبر الأطلسي.", "core", "B1", "NGSL"],
  ["swim", "verb", "يسبح", "She learned to swim when she was five.", "تعلمت السباحة عندما كانت في الخامسة.", "core", "B1", "NGSL"],
  ["dive", "verb", "يغوص", "He loves to dive into the deep water.", "يحب أن يغوص في الماء العميق.", "core", "B1", "CEFR-J"],
  ["deep", "adjective", "عميق", "The lake is very deep in the middle.", "البحيرة عميقة جداً في الوسط.", "core", "B1", "NGSL"],
  ["surface", "noun", "سطح", "The fish came to the surface of the water.", "صعدت السمكة إلى سطح الماء.", "core", "B1", "NGSL"],
  ["salt", "noun", "ملح", "Sea water contains a lot of salt.", "يحتوي ماء البحر على الكثير من الملح.", "core", "B1", "NGSL"],
  ["sand", "noun", "رمل", "The children built a castle in the sand.", "بنى الأطفال قلعة في الرمل.", "core", "B1", "NGSL"],
  ["rock", "noun", "صخرة", "Be careful of the rocks near the shore.", "احترس من الصخور بالقرب من الشاطئ.", "core", "B1", "NGSL"],
  ["shell", "noun", "صدفة", "She collected shells on the beach.", "جمعت الأصداف على الشاطئ.", "core", "B1", "NGSL"],
  ["tide", "noun", "مد وجزر", "The tide comes in twice a day.", "يأتي المد والجزر مرتين في اليوم.", "core", "B1", "CEFR-J"],
  ["storm", "noun", "عاصفة", "A big storm is coming tonight.", "عاصفة كبيرة قادمة الليلة.", "core", "B1", "NGSL"],
  ["weather", "noun", "طقس", "The weather is nice today.", "الطقس جميل اليوم.", "core", "B1", "NGSL"],
  ["climate", "noun", "مناخ", "The climate is getting warmer every year.", "المناخ يزداد حرارة كل عام.", "core", "B1", "NGSL"],
  ["temperature", "noun", "درجة حرارة", "The temperature dropped below zero.", "انخفضت درجة الحرارة إلى ما دون الصفر.", "core", "B1", "NGSL"],
  ["coast", "noun", "ساحل", "They drove along the coast.", "قادوا السيارة على طول الساحل.", "core", "B1", "NGSL"],
];

// Unit 3: Food Security — B1 reinforcement
const unit3 = [
  ["food", "noun", "طعام", "We need food and water to survive.", "نحتاج إلى الطعام والماء للبقاء.", "core", "B1", "NGSL"],
  ["farm", "noun", "مزرعة", "My uncle works on a large farm.", "يعمل عمي في مزرعة كبيرة.", "core", "B1", "NGSL"],
  ["field", "noun", "حقل", "The farmer planted wheat in the field.", "زرع المزارع القمح في الحقل.", "core", "B1", "NGSL"],
  ["soil", "noun", "تربة", "The soil here is very rich.", "التربة هنا غنية جداً.", "core", "B1", "NGSL"],
  ["plant", "verb", "يزرع", "We plant vegetables every spring.", "نزرع الخضروات كل ربيع.", "core", "B1", "NGSL"],
  ["seed", "noun", "بذرة", "She put the seeds in the ground.", "وضعت البذور في الأرض.", "core", "B1", "NGSL"],
  ["grow", "verb", "ينمو", "Children grow very quickly.", "ينمو الأطفال بسرعة كبيرة.", "core", "B1", "NGSL"],
  ["rain", "noun", "مطر", "The rain helped the crops grow.", "ساعد المطر المحاصيل على النمو.", "core", "B1", "NGSL"],
  ["sun", "noun", "شمس", "Plants need the sun to grow.", "تحتاج النباتات إلى الشمس لتنمو.", "core", "B1", "NGSL"],
  ["animal", "noun", "حيوان", "Many animals live on the farm.", "تعيش حيوانات كثيرة في المزرعة.", "core", "B1", "NGSL"],
  ["meat", "noun", "لحم", "They eat meat twice a week.", "يأكلون اللحم مرتين في الأسبوع.", "core", "B1", "NGSL"],
  ["milk", "noun", "حليب", "The children drink milk every morning.", "يشرب الأطفال الحليب كل صباح.", "core", "B1", "NGSL"],
  ["egg", "noun", "بيضة", "She had two eggs for breakfast.", "تناولت بيضتين على الفطور.", "core", "B1", "NGSL"],
  ["fruit", "noun", "فاكهة", "Eating fruit is good for your health.", "تناول الفاكهة مفيد لصحتك.", "core", "B1", "NGSL"],
  ["vegetable", "noun", "خضروات", "Children should eat more vegetables.", "يجب أن يأكل الأطفال المزيد من الخضروات.", "core", "B1", "NGSL"],
  ["rice", "noun", "أرز", "Rice is the main food in many countries.", "الأرز هو الطعام الرئيسي في كثير من البلدان.", "core", "B1", "NGSL"],
  ["wheat", "noun", "قمح", "Bread is made from wheat.", "يُصنع الخبز من القمح.", "core", "B1", "CEFR-J"],
  ["corn", "noun", "ذرة", "The farmer grows corn in his field.", "يزرع المزارع الذرة في حقله.", "core", "B1", "CEFR-J"],
  ["sugar", "noun", "سكر", "Too much sugar is bad for your teeth.", "السكر الكثير ضار بأسنانك.", "core", "B1", "NGSL"],
  ["cook", "verb", "يطبخ", "My mother cooks dinner every night.", "تطبخ أمي العشاء كل ليلة.", "core", "B1", "NGSL"],
  ["meal", "noun", "وجبة", "Breakfast is the most important meal.", "الفطور هو أهم وجبة.", "core", "B1", "NGSL"],
  ["hunger", "noun", "جوع", "Hunger is a serious problem in many countries.", "الجوع مشكلة خطيرة في كثير من البلدان.", "core", "B1", "NGSL"],
  ["feed", "verb", "يُطعم", "She feeds the baby three times a day.", "تُطعم الطفل ثلاث مرات في اليوم.", "core", "B1", "NGSL"],
  ["market", "noun", "سوق", "We buy fresh food at the market.", "نشتري الطعام الطازج من السوق.", "core", "B1", "NGSL"],
  ["harvest", "noun", "حصاد", "The harvest was very good this year.", "كان الحصاد جيداً جداً هذا العام.", "core", "B1", "CEFR-J"],
];

// Unit 4: Biomimicry — B1 reinforcement
const unit4 = [
  ["nature", "noun", "طبيعة", "I love spending time in nature.", "أحب قضاء الوقت في الطبيعة.", "core", "B1", "NGSL"],
  ["bird", "noun", "طائر", "The bird built a nest in the tree.", "بنى الطائر عشاً في الشجرة.", "core", "B1", "NGSL"],
  ["insect", "noun", "حشرة", "There are millions of different insects.", "هناك ملايين الحشرات المختلفة.", "core", "B1", "NGSL"],
  ["spider", "noun", "عنكبوت", "The spider made a web in the corner.", "صنع العنكبوت شبكة في الزاوية.", "core", "B1", "CEFR-J"],
  ["tree", "noun", "شجرة", "The old tree is over 200 years old.", "عمر الشجرة القديمة أكثر من 200 سنة.", "core", "B1", "NGSL"],
  ["leaf", "noun", "ورقة شجر", "The leaves turn red in autumn.", "تتحول الأوراق إلى اللون الأحمر في الخريف.", "core", "B1", "NGSL"],
  ["flower", "noun", "زهرة", "She picked flowers from the garden.", "قطفت الزهور من الحديقة.", "core", "B1", "NGSL"],
  ["root", "noun", "جذر", "The roots of the tree go deep into the ground.", "تمتد جذور الشجرة عميقاً في الأرض.", "core", "B1", "NGSL"],
  ["branch", "noun", "غصن", "The cat climbed onto a high branch.", "تسلق القط على غصن عالٍ.", "core", "B1", "NGSL"],
  ["wing", "noun", "جناح", "The bird spread its wings and flew away.", "نشر الطائر جناحيه وطار بعيداً.", "core", "B1", "NGSL"],
  ["feather", "noun", "ريشة", "The feather was soft and light.", "كانت الريشة ناعمة وخفيفة.", "core", "B1", "CEFR-J"],
  ["fur", "noun", "فرو", "The cat has soft white fur.", "القط لديه فرو أبيض ناعم.", "core", "B1", "CEFR-J"],
  ["shape", "noun", "شكل", "What shape is the table?", "ما شكل الطاولة؟", "core", "B1", "NGSL"],
  ["size", "noun", "حجم", "What size shoes do you wear?", "ما حجم الحذاء الذي تلبسه؟", "core", "B1", "NGSL"],
  ["color", "noun", "لون", "What color do you like best?", "ما اللون الذي تفضله أكثر؟", "core", "B1", "NGSL"],
  ["pattern", "noun", "نمط", "The butterfly has a beautiful pattern on its wings.", "للفراشة نمط جميل على جناحيها.", "core", "B1", "NGSL"],
  ["strong", "adjective", "قوي", "The bridge must be very strong.", "يجب أن يكون الجسر قوياً جداً.", "core", "B1", "NGSL"],
  ["light", "adjective", "خفيف", "The bag is very light.", "الحقيبة خفيفة جداً.", "core", "B1", "NGSL"],
  ["hard", "adjective", "صلب", "Diamonds are the hardest material.", "الألماس هو أصلب مادة.", "core", "B1", "NGSL"],
  ["soft", "adjective", "ناعم", "The baby's skin is very soft.", "جلد الطفل ناعم جداً.", "core", "B1", "NGSL"],
  ["smooth", "adjective", "أملس", "The surface of the table is smooth.", "سطح الطاولة أملس.", "core", "B1", "NGSL"],
  ["rough", "adjective", "خشن", "The rock has a rough surface.", "للصخرة سطح خشن.", "core", "B1", "CEFR-J"],
  ["sharp", "adjective", "حاد", "Be careful with that sharp knife.", "كن حذراً مع ذلك السكين الحاد.", "core", "B1", "NGSL"],
  ["thick", "adjective", "سميك", "The wall is very thick.", "الجدار سميك جداً.", "core", "B1", "NGSL"],
  ["thin", "adjective", "رقيق", "The ice was too thin to walk on.", "كان الجليد رقيقاً جداً للمشي عليه.", "core", "B1", "NGSL"],
];

// Unit 5: Migration — B1 reinforcement
const unit5 = [
  ["country", "noun", "بلد", "She has visited many countries.", "زارت بلداناً كثيرة.", "core", "B1", "NGSL"],
  ["city", "noun", "مدينة", "London is a very big city.", "لندن مدينة كبيرة جداً.", "core", "B1", "NGSL"],
  ["home", "noun", "منزل", "There is no place like home.", "لا مكان كالمنزل.", "core", "B1", "NGSL"],
  ["family", "noun", "عائلة", "My family is very important to me.", "عائلتي مهمة جداً بالنسبة لي.", "core", "B1", "NGSL"],
  ["travel", "verb", "يسافر", "They travel to Europe every summer.", "يسافرون إلى أوروبا كل صيف.", "core", "B1", "NGSL"],
  ["journey", "noun", "رحلة", "The journey took three hours.", "استغرقت الرحلة ثلاث ساعات.", "core", "B1", "NGSL"],
  ["border", "noun", "حدود", "They crossed the border at night.", "عبروا الحدود ليلاً.", "core", "B1", "NGSL"],
  ["foreign", "adjective", "أجنبي", "She speaks three foreign languages.", "تتحدث ثلاث لغات أجنبية.", "core", "B1", "NGSL"],
  ["language", "noun", "لغة", "Learning a new language takes time.", "تعلم لغة جديدة يستغرق وقتاً.", "core", "B1", "NGSL"],
  ["culture", "noun", "ثقافة", "Every country has its own culture.", "لكل بلد ثقافته الخاصة.", "core", "B1", "NGSL"],
  ["community", "noun", "مجتمع", "The community worked together to build the park.", "عمل المجتمع معاً لبناء الحديقة.", "core", "B1", "NGSL"],
  ["welcome", "verb", "يرحّب", "They welcomed the new students warmly.", "رحّبوا بالطلاب الجدد بحرارة.", "core", "B1", "NGSL"],
  ["stranger", "noun", "غريب", "Don't talk to strangers.", "لا تتحدث مع الغرباء.", "core", "B1", "NGSL"],
  ["neighbor", "noun", "جار", "Our neighbors are very friendly.", "جيراننا ودودون جداً.", "core", "B1", "NGSL"],
  ["friend", "noun", "صديق", "A good friend is hard to find.", "الصديق الجيد يصعب إيجاده.", "core", "B1", "NGSL"],
  ["job", "noun", "وظيفة", "He found a new job in the city.", "وجد وظيفة جديدة في المدينة.", "core", "B1", "NGSL"],
  ["money", "noun", "مال", "They saved money for the trip.", "ادخروا المال للرحلة.", "core", "B1", "NGSL"],
  ["school", "noun", "مدرسة", "The children walk to school every day.", "يمشي الأطفال إلى المدرسة كل يوم.", "core", "B1", "NGSL"],
  ["law", "noun", "قانون", "Everyone must follow the law.", "يجب على الجميع اتباع القانون.", "core", "B1", "NGSL"],
  ["right", "noun", "حق", "Everyone has the right to education.", "لكل شخص الحق في التعليم.", "core", "B1", "NGSL"],
  ["freedom", "noun", "حرية", "Freedom of speech is very important.", "حرية التعبير مهمة جداً.", "core", "B1", "NGSL"],
  ["safety", "noun", "أمان", "The safety of children is our priority.", "أمان الأطفال أولويتنا.", "core", "B1", "NGSL"],
  ["danger", "noun", "خطر", "The children were in danger.", "كان الأطفال في خطر.", "core", "B1", "NGSL"],
  ["hope", "noun", "أمل", "We have hope for a better future.", "لدينا أمل بمستقبل أفضل.", "core", "B1", "NGSL"],
  ["opportunity", "noun", "فرصة", "She waited for the right opportunity.", "انتظرت الفرصة المناسبة.", "core", "B1", "NGSL"],
];

// Unit 6: Cryptocurrency — B1 reinforcement
const unit6 = [
  ["bank", "noun", "بنك", "I keep my money in the bank.", "أحتفظ بأموالي في البنك.", "core", "B1", "NGSL"],
  ["account", "noun", "حساب", "She opened a new bank account.", "فتحت حساباً مصرفياً جديداً.", "core", "B1", "NGSL"],
  ["payment", "noun", "دفعة", "The payment is due next week.", "الدفعة مستحقة الأسبوع القادم.", "core", "B1", "NGSL"],
  ["price", "noun", "سعر", "The price of oil has gone up.", "ارتفع سعر النفط.", "core", "B1", "NGSL"],
  ["cost", "noun", "تكلفة", "The cost of living is very high here.", "تكلفة المعيشة مرتفعة جداً هنا.", "core", "B1", "NGSL"],
  ["value", "noun", "قيمة", "The value of the house has increased.", "ارتفعت قيمة المنزل.", "core", "B1", "NGSL"],
  ["trade", "noun", "تجارة", "International trade is important for the economy.", "التجارة الدولية مهمة للاقتصاد.", "core", "B1", "NGSL"],
  ["buy", "verb", "يشتري", "I want to buy a new car.", "أريد أن أشتري سيارة جديدة.", "core", "B1", "NGSL"],
  ["sell", "verb", "يبيع", "They want to sell their house.", "يريدون بيع منزلهم.", "core", "B1", "NGSL"],
  ["save", "verb", "يوفّر", "You should save money for the future.", "يجب أن توفّر المال للمستقبل.", "core", "B1", "NGSL"],
  ["spend", "verb", "ينفق", "She spends too much money on clothes.", "تنفق الكثير من المال على الملابس.", "core", "B1", "NGSL"],
  ["earn", "verb", "يكسب", "He earns a good salary.", "يكسب راتباً جيداً.", "core", "B1", "NGSL"],
  ["profit", "noun", "ربح", "The company made a large profit.", "حققت الشركة ربحاً كبيراً.", "core", "B1", "NGSL"],
  ["loss", "noun", "خسارة", "The company reported a big loss.", "أبلغت الشركة عن خسارة كبيرة.", "core", "B1", "NGSL"],
  ["rich", "adjective", "غني", "He became rich from his business.", "أصبح غنياً من عمله.", "core", "B1", "NGSL"],
  ["poor", "adjective", "فقير", "Many poor families need help.", "تحتاج عائلات فقيرة كثيرة إلى مساعدة.", "core", "B1", "NGSL"],
  ["tax", "noun", "ضريبة", "Everyone must pay tax on their income.", "يجب على الجميع دفع الضريبة على دخلهم.", "core", "B1", "NGSL"],
  ["debt", "noun", "دين", "He paid off all his debts.", "سدد جميع ديونه.", "core", "B1", "NGSL"],
  ["loan", "noun", "قرض", "She took a loan to buy a house.", "أخذت قرضاً لشراء منزل.", "core", "B1", "NGSL"],
  ["credit", "noun", "ائتمان", "He bought the TV on credit.", "اشترى التلفاز بالائتمان.", "core", "B1", "NGSL"],
  ["cash", "noun", "نقد", "Do you want to pay by cash or card?", "هل تريد الدفع نقداً أم بالبطاقة؟", "core", "B1", "NGSL"],
  ["coin", "noun", "عملة معدنية", "He found an old coin in the garden.", "وجد عملة معدنية قديمة في الحديقة.", "core", "B1", "NGSL"],
  ["bill", "noun", "فاتورة", "The electricity bill was very high.", "كانت فاتورة الكهرباء مرتفعة جداً.", "core", "B1", "NGSL"],
  ["receipt", "noun", "إيصال", "Keep the receipt in case you need to return it.", "احتفظ بالإيصال في حال أردت إرجاعه.", "core", "B1", "NGSL"],
  ["budget", "noun", "ميزانية", "We need to plan our monthly budget.", "نحتاج إلى تخطيط ميزانيتنا الشهرية.", "core", "B1", "NGSL"],
];

// Unit 7: Crowd Psychology — B1 reinforcement
const unit7 = [
  ["crowd", "noun", "حشد", "A large crowd gathered in the square.", "تجمع حشد كبير في الساحة.", "core", "B1", "NGSL"],
  ["group", "noun", "مجموعة", "The students worked in small groups.", "عمل الطلاب في مجموعات صغيرة.", "core", "B1", "NGSL"],
  ["people", "noun", "ناس", "Many people came to the meeting.", "جاء كثير من الناس إلى الاجتماع.", "core", "B1", "NGSL"],
  ["leader", "noun", "قائد", "A good leader listens to others.", "القائد الجيد يستمع للآخرين.", "core", "B1", "NGSL"],
  ["follower", "noun", "تابع", "He was a loyal follower of the team.", "كان تابعاً وفياً للفريق.", "core", "B1", "CEFR-J"],
  ["enemy", "noun", "عدو", "They became enemies after the argument.", "أصبحوا أعداءً بعد الخلاف.", "core", "B1", "NGSL"],
  ["anger", "noun", "غضب", "He could not control his anger.", "لم يستطع السيطرة على غضبه.", "core", "B1", "NGSL"],
  ["fear", "noun", "خوف", "Fear can stop people from trying new things.", "الخوف يمنع الناس من تجربة أشياء جديدة.", "core", "B1", "NGSL"],
  ["trust", "noun", "ثقة", "Trust is important in any relationship.", "الثقة مهمة في أي علاقة.", "core", "B1", "NGSL"],
  ["power", "noun", "قوة", "The president has a lot of power.", "يملك الرئيس الكثير من القوة.", "core", "B1", "NGSL"],
  ["control", "noun", "سيطرة", "The police took control of the situation.", "سيطرت الشرطة على الوضع.", "core", "B1", "NGSL"],
  ["rule", "noun", "قاعدة", "Every game has rules.", "لكل لعبة قواعد.", "core", "B1", "NGSL"],
  ["fight", "verb", "يقاتل", "The two boys started to fight.", "بدأ الولدان بالقتال.", "core", "B1", "NGSL"],
  ["peace", "noun", "سلام", "Everyone wants to live in peace.", "الجميع يريد أن يعيش في سلام.", "core", "B1", "NGSL"],
  ["agree", "verb", "يوافق", "I agree with your idea.", "أوافق على فكرتك.", "core", "B1", "NGSL"],
  ["disagree", "verb", "يختلف", "It is okay to disagree politely.", "لا بأس بالاختلاف بأدب.", "core", "B1", "NGSL"],
  ["opinion", "noun", "رأي", "Everyone has a different opinion.", "لكل شخص رأي مختلف.", "core", "B1", "NGSL"],
  ["belief", "noun", "اعتقاد", "People have different beliefs.", "لدى الناس اعتقادات مختلفة.", "core", "B1", "NGSL"],
  ["choice", "noun", "خيار", "It was a difficult choice.", "كان خياراً صعباً.", "core", "B1", "NGSL"],
  ["voice", "noun", "صوت", "She has a beautiful voice.", "لديها صوت جميل.", "core", "B1", "NGSL"],
  ["vote", "verb", "يصوّت", "Citizens should vote in elections.", "يجب أن يصوّت المواطنون في الانتخابات.", "core", "B1", "NGSL"],
  ["protest", "noun", "احتجاج", "The students organized a peaceful protest.", "نظّم الطلاب احتجاجاً سلمياً.", "core", "B1", "CEFR-J"],
  ["influence", "noun", "تأثير", "Music has a big influence on young people.", "للموسيقى تأثير كبير على الشباب.", "core", "B1", "NGSL"],
  ["behavior", "noun", "سلوك", "His behavior in class was excellent.", "كان سلوكه في الصف ممتازاً.", "core", "B1", "NGSL"],
  ["emotion", "noun", "عاطفة", "She finds it hard to express her emotions.", "تجد صعوبة في التعبير عن عواطفها.", "core", "B1", "NGSL"],
];

// Unit 8: Forensic Science — B1 reinforcement
const unit8 = [
  ["police", "noun", "شرطة", "The police arrived within minutes.", "وصلت الشرطة في غضون دقائق.", "core", "B1", "NGSL"],
  ["crime", "noun", "جريمة", "Crime rates have dropped this year.", "انخفضت معدلات الجريمة هذا العام.", "core", "B1", "NGSL"],
  ["criminal", "noun", "مجرم", "The criminal was caught by the police.", "قُبض على المجرم من قبل الشرطة.", "core", "B1", "NGSL"],
  ["prison", "noun", "سجن", "He was sent to prison for five years.", "أُرسل إلى السجن لمدة خمس سنوات.", "core", "B1", "NGSL"],
  ["judge", "noun", "قاضٍ", "The judge made the final decision.", "اتخذ القاضي القرار النهائي.", "core", "B1", "NGSL"],
  ["court", "noun", "محكمة", "The case was heard in court today.", "نُظرت القضية في المحكمة اليوم.", "core", "B1", "NGSL"],
  ["guilty", "adjective", "مذنب", "The jury found him guilty.", "وجدته هيئة المحلفين مذنباً.", "core", "B1", "NGSL"],
  ["innocent", "adjective", "بريء", "She was found innocent of all charges.", "ثبتت براءتها من جميع التهم.", "core", "B1", "NGSL"],
  ["steal", "verb", "يسرق", "Someone stole my bicycle.", "سرق شخص ما دراجتي.", "core", "B1", "NGSL"],
  ["murder", "noun", "قتل", "The police are investigating a murder.", "تحقق الشرطة في جريمة قتل.", "core", "B1", "NGSL"],
  ["weapon", "noun", "سلاح", "No weapons are allowed in the building.", "لا يُسمح بالأسلحة في المبنى.", "core", "B1", "NGSL"],
  ["knife", "noun", "سكين", "He used a knife to cut the rope.", "استخدم سكيناً لقطع الحبل.", "core", "B1", "NGSL"],
  ["gun", "noun", "مسدس", "The police officer carries a gun.", "يحمل ضابط الشرطة مسدساً.", "core", "B1", "NGSL"],
  ["body", "noun", "جسد", "They found the body near the river.", "وجدوا الجسد بالقرب من النهر.", "core", "B1", "NGSL"],
  ["death", "noun", "موت", "The cause of death was unknown.", "كان سبب الموت مجهولاً.", "core", "B1", "NGSL"],
  ["witness", "noun", "شاهد", "The witness described what happened.", "وصف الشاهد ما حدث.", "core", "B1", "NGSL"],
  ["truth", "noun", "حقيقة", "He always tells the truth.", "يقول الحقيقة دائماً.", "core", "B1", "NGSL"],
  ["lie", "noun", "كذبة", "She could tell he was telling a lie.", "استطاعت أن تعرف أنه يكذب.", "core", "B1", "NGSL"],
  ["proof", "noun", "دليل", "There is no proof that he did it.", "لا يوجد دليل على أنه فعل ذلك.", "core", "B1", "NGSL"],
  ["test", "noun", "اختبار", "The blood test showed nothing unusual.", "لم يُظهر اختبار الدم شيئاً غير عادي.", "core", "B1", "NGSL"],
  ["search", "verb", "يبحث", "The police searched the house.", "فتشت الشرطة المنزل.", "core", "B1", "NGSL"],
  ["arrest", "verb", "يعتقل", "The police arrested the suspect.", "اعتقلت الشرطة المشتبه به.", "core", "B1", "NGSL"],
  ["punishment", "noun", "عقوبة", "The punishment for the crime was severe.", "كانت عقوبة الجريمة شديدة.", "core", "B1", "NGSL"],
  ["victim", "noun", "ضحية", "The victim was taken to the hospital.", "نُقلت الضحية إلى المستشفى.", "core", "B1", "NGSL"],
  ["evidence", "noun", "أدلة", "The police collected evidence from the scene.", "جمعت الشرطة الأدلة من مكان الحادث.", "core", "B1", "NGSL"],
];

// Unit 9: Archaeology — B1 reinforcement
const unit9 = [
  ["history", "noun", "تاريخ", "I enjoy reading about history.", "أستمتع بقراءة التاريخ.", "core", "B1", "NGSL"],
  ["ancient", "adjective", "قديم", "The ancient city was discovered last year.", "اكتُشفت المدينة القديمة العام الماضي.", "core", "B1", "NGSL"],
  ["old", "adjective", "قديم", "This is a very old building.", "هذا مبنى قديم جداً.", "core", "B1", "NGSL"],
  ["stone", "noun", "حجر", "The wall was made of stone.", "بُني الجدار من الحجر.", "core", "B1", "NGSL"],
  ["metal", "noun", "معدن", "The gate is made of metal.", "البوابة مصنوعة من المعدن.", "core", "B1", "NGSL"],
  ["gold", "noun", "ذهب", "Gold is a very valuable metal.", "الذهب معدن ثمين جداً.", "core", "B1", "NGSL"],
  ["silver", "noun", "فضة", "She wore a silver ring.", "لبست خاتماً من الفضة.", "core", "B1", "NGSL"],
  ["wood", "noun", "خشب", "The table is made of wood.", "الطاولة مصنوعة من الخشب.", "core", "B1", "NGSL"],
  ["clay", "noun", "طين", "The pot was made from clay.", "صُنع الإناء من الطين.", "core", "B1", "CEFR-J"],
  ["pot", "noun", "إناء", "They found an old pot in the ground.", "وجدوا إناءً قديماً في الأرض.", "core", "B1", "NGSL"],
  ["tool", "noun", "أداة", "Early humans made tools from stone.", "صنع البشر الأوائل أدوات من الحجر.", "core", "B1", "NGSL"],
  ["building", "noun", "مبنى", "The old building is now a museum.", "المبنى القديم أصبح الآن متحفاً.", "core", "B1", "NGSL"],
  ["wall", "noun", "جدار", "The city had thick walls around it.", "كانت المدينة محاطة بجدران سميكة.", "core", "B1", "NGSL"],
  ["gate", "noun", "بوابة", "They entered through the main gate.", "دخلوا من البوابة الرئيسية.", "core", "B1", "NGSL"],
  ["tower", "noun", "برج", "The tower was very tall.", "كان البرج عالياً جداً.", "core", "B1", "NGSL"],
  ["bridge", "noun", "جسر", "The old bridge crosses the river.", "الجسر القديم يعبر النهر.", "core", "B1", "NGSL"],
  ["road", "noun", "طريق", "The Romans built many roads.", "بنى الرومان طرقاً كثيرة.", "core", "B1", "NGSL"],
  ["king", "noun", "ملك", "The king ruled for thirty years.", "حكم الملك لمدة ثلاثين عاماً.", "core", "B1", "NGSL"],
  ["queen", "noun", "ملكة", "The queen lived in a large palace.", "عاشت الملكة في قصر كبير.", "core", "B1", "NGSL"],
  ["war", "noun", "حرب", "The war lasted for many years.", "استمرت الحرب لسنوات عديدة.", "core", "B1", "NGSL"],
  ["religion", "noun", "دين", "People practice different religions.", "يمارس الناس أدياناً مختلفة.", "core", "B1", "NGSL"],
  ["temple", "noun", "معبد", "The ancient temple was beautifully decorated.", "كان المعبد القديم مزيناً بشكل جميل.", "core", "B1", "CEFR-J"],
  ["grave", "noun", "قبر", "They found a royal grave.", "عثروا على قبر ملكي.", "core", "B1", "CEFR-J"],
  ["treasure", "noun", "كنز", "The treasure was hidden underground.", "كان الكنز مخبأ تحت الأرض.", "core", "B1", "CEFR-J"],
  ["discover", "verb", "يكتشف", "They discovered a new species of fish.", "اكتشفوا نوعاً جديداً من الأسماك.", "core", "B1", "NGSL"],
];

// Unit 10: Longevity — B1 reinforcement
const unit10 = [
  ["life", "noun", "حياة", "Life is full of surprises.", "الحياة مليئة بالمفاجآت.", "core", "B1", "NGSL"],
  ["age", "noun", "عمر", "What age did you start school?", "في أي عمر بدأت المدرسة؟", "core", "B1", "NGSL"],
  ["young", "adjective", "شاب", "She is too young to drive.", "هي صغيرة جداً على القيادة.", "core", "B1", "NGSL"],
  ["mind", "noun", "عقل", "A healthy mind needs exercise too.", "العقل السليم يحتاج إلى تمرين أيضاً.", "core", "B1", "NGSL"],
  ["sleep", "verb", "ينام", "You should sleep at least eight hours.", "يجب أن تنام ثماني ساعات على الأقل.", "core", "B1", "NGSL"],
  ["exercise", "noun", "تمرين", "Daily exercise keeps you healthy.", "التمرين اليومي يبقيك صحياً.", "core", "B1", "NGSL"],
  ["diet", "noun", "نظام غذائي", "A balanced diet is good for you.", "النظام الغذائي المتوازن جيد لك.", "core", "B1", "NGSL"],
  ["weight", "noun", "وزن", "She wants to lose weight.", "تريد أن تفقد الوزن.", "core", "B1", "NGSL"],
  ["weak", "adjective", "ضعيف", "He felt weak after the illness.", "شعر بالضعف بعد المرض.", "core", "B1", "NGSL"],
  ["tired", "adjective", "متعب", "I am too tired to go out.", "أنا متعب جداً للخروج.", "core", "B1", "NGSL"],
  ["energy", "noun", "طاقة", "Children have a lot of energy.", "لدى الأطفال الكثير من الطاقة.", "core", "B1", "NGSL"],
  ["stress", "noun", "إجهاد", "Too much stress is bad for your health.", "الإجهاد الكثير ضار بصحتك.", "core", "B1", "NGSL"],
  ["rest", "verb", "يستريح", "You need to rest after surgery.", "تحتاج إلى الراحة بعد الجراحة.", "core", "B1", "NGSL"],
  ["memory", "noun", "ذاكرة", "Her memory is very sharp.", "ذاكرتها حادة جداً.", "core", "B1", "NGSL"],
  ["breath", "noun", "نفَس", "Take a deep breath and relax.", "خذ نفَساً عميقاً واسترخِ.", "core", "B1", "NGSL"],
  ["habit", "noun", "عادة", "Smoking is a bad habit.", "التدخين عادة سيئة.", "core", "B1", "NGSL"],
  ["active", "adjective", "نشيط", "She is very active for her age.", "هي نشيطة جداً بالنسبة لعمرها.", "core", "B1", "NGSL"],
  ["fit", "adjective", "لائق بدنياً", "He runs every day to stay fit.", "يركض كل يوم ليبقى لائقاً بدنياً.", "core", "B1", "NGSL"],
  ["healthy", "adjective", "صحي", "Eating vegetables is healthy.", "أكل الخضروات صحي.", "core", "B1", "NGSL"],
  ["sick", "adjective", "مريض", "She stayed home because she was sick.", "بقيت في المنزل لأنها كانت مريضة.", "core", "B1", "NGSL"],
  ["recover", "verb", "يتعافى", "He recovered quickly from the operation.", "تعافى بسرعة من العملية.", "core", "B1", "NGSL"],
  ["alive", "adjective", "حي", "The old tree is still alive.", "الشجرة القديمة لا تزال حية.", "core", "B1", "NGSL"],
  ["bone", "noun", "عظم", "Calcium makes your bones strong.", "الكالسيوم يجعل عظامك قوية.", "core", "B1", "NGSL"],
  ["blood", "noun", "دم", "Regular exercise improves blood flow.", "التمارين المنتظمة تحسّن تدفق الدم.", "core", "B1", "NGSL"],
  ["muscle", "noun", "عضلة", "Strong muscles protect your joints.", "العضلات القوية تحمي مفاصلك.", "core", "B1", "NGSL"],
];

// Unit 11: Sustainable Architecture — B1 reinforcement
const unit11 = [
  ["house", "noun", "منزل", "They built a new house last year.", "بنوا منزلاً جديداً العام الماضي.", "core", "B1", "NGSL"],
  ["room", "noun", "غرفة", "The room was large and bright.", "كانت الغرفة كبيرة ومشرقة.", "core", "B1", "NGSL"],
  ["floor", "noun", "أرضية", "The floor is made of wood.", "الأرضية مصنوعة من الخشب.", "core", "B1", "NGSL"],
  ["roof", "noun", "سقف", "The roof needs to be repaired.", "يحتاج السقف إلى إصلاح.", "core", "B1", "NGSL"],
  ["door", "noun", "باب", "Please close the door behind you.", "من فضلك أغلق الباب خلفك.", "core", "B1", "NGSL"],
  ["window", "noun", "نافذة", "Open the window to let in fresh air.", "افتح النافذة لإدخال الهواء النقي.", "core", "B1", "NGSL"],
  ["garden", "noun", "حديقة", "She grows flowers in her garden.", "تزرع الزهور في حديقتها.", "core", "B1", "NGSL"],
  ["park", "noun", "حديقة عامة", "The children play in the park.", "يلعب الأطفال في الحديقة العامة.", "core", "B1", "NGSL"],
  ["town", "noun", "بلدة", "The town has a population of 10,000.", "عدد سكان البلدة 10,000 نسمة.", "core", "B1", "NGSL"],
  ["village", "noun", "قرية", "The village is surrounded by mountains.", "القرية محاطة بالجبال.", "core", "B1", "NGSL"],
  ["brick", "noun", "طوبة", "The house is made of red bricks.", "المنزل مبني من الطوب الأحمر.", "core", "B1", "CEFR-J"],
  ["glass", "noun", "زجاج", "The window is made of thick glass.", "النافذة مصنوعة من زجاج سميك.", "core", "B1", "NGSL"],
  ["heat", "noun", "حرارة", "The heat in summer can be very strong.", "الحرارة في الصيف يمكن أن تكون شديدة.", "core", "B1", "NGSL"],
  ["cold", "adjective", "بارد", "It gets very cold in winter here.", "يصبح الجو بارداً جداً في الشتاء هنا.", "core", "B1", "NGSL"],
  ["dark", "adjective", "مظلم", "The room was dark without any lights.", "كانت الغرفة مظلمة بدون أي أضواء.", "core", "B1", "NGSL"],
  ["air", "noun", "هواء", "We need clean air to breathe.", "نحتاج إلى هواء نظيف للتنفس.", "core", "B1", "NGSL"],
  ["electricity", "noun", "كهرباء", "The house uses solar electricity.", "يستخدم المنزل الكهرباء الشمسية.", "core", "B1", "NGSL"],
  ["design", "noun", "تصميم", "The design of the building is modern.", "تصميم المبنى حديث.", "core", "B1", "NGSL"],
  ["build", "verb", "يبني", "They plan to build a new school.", "يخططون لبناء مدرسة جديدة.", "core", "B1", "NGSL"],
  ["material", "noun", "مادة", "Wood is a natural building material.", "الخشب مادة بناء طبيعية.", "core", "B1", "NGSL"],
  ["space", "noun", "مساحة", "There is not enough space for everyone.", "لا توجد مساحة كافية للجميع.", "core", "B1", "NGSL"],
  ["safe", "adjective", "آمن", "The building is safe for children.", "المبنى آمن للأطفال.", "core", "B1", "NGSL"],
  ["waste", "noun", "نفايات", "We must reduce waste to help the planet.", "يجب أن نقلل النفايات لمساعدة الكوكب.", "core", "B1", "NGSL"],
  ["solar", "adjective", "شمسي", "Solar panels produce clean energy.", "الألواح الشمسية تنتج طاقة نظيفة.", "core", "B1", "CEFR-J"],
  ["concrete", "noun", "خرسانة", "The bridge is made of concrete.", "الجسر مصنوع من الخرسانة.", "core", "B1", "CEFR-J"],
];

// Unit 12: Exoplanets — B1 reinforcement
const unit12 = [
  ["star", "noun", "نجمة", "You can see many stars at night.", "يمكنك رؤية نجوم كثيرة ليلاً.", "core", "B1", "NGSL"],
  ["moon", "noun", "قمر", "The moon was full and bright.", "كان القمر بدراً ومشرقاً.", "core", "B1", "NGSL"],
  ["earth", "noun", "أرض", "The Earth goes around the Sun.", "تدور الأرض حول الشمس.", "core", "B1", "NGSL"],
  ["sky", "noun", "سماء", "The sky was clear and blue.", "كانت السماء صافية وزرقاء.", "core", "B1", "NGSL"],
  ["planet", "noun", "كوكب", "Mars is the fourth planet from the Sun.", "المريخ هو الكوكب الرابع من الشمس.", "core", "B1", "NGSL"],
  ["universe", "noun", "كون", "The universe is very large.", "الكون كبير جداً.", "core", "B1", "NGSL"],
  ["night", "noun", "ليل", "The sky is dark at night.", "السماء مظلمة في الليل.", "core", "B1", "NGSL"],
  ["day", "noun", "يوم", "A day on Earth lasts 24 hours.", "يستمر اليوم على الأرض 24 ساعة.", "core", "B1", "NGSL"],
  ["hot", "adjective", "حار", "The surface of the Sun is very hot.", "سطح الشمس حار جداً.", "core", "B1", "NGSL"],
  ["big", "adjective", "كبير", "Jupiter is the biggest planet.", "المشتري هو أكبر كوكب.", "core", "B1", "NGSL"],
  ["small", "adjective", "صغير", "Mercury is the smallest planet.", "عطارد هو أصغر كوكب.", "core", "B1", "NGSL"],
  ["far", "adjective", "بعيد", "The nearest star is very far away.", "أقرب نجمة بعيدة جداً.", "core", "B1", "NGSL"],
  ["near", "adjective", "قريب", "The Moon is the nearest object to Earth.", "القمر هو أقرب جسم إلى الأرض.", "core", "B1", "NGSL"],
  ["fast", "adjective", "سريع", "Light travels very fast.", "ينتقل الضوء بسرعة كبيرة.", "core", "B1", "NGSL"],
  ["slow", "adjective", "بطيء", "The planet moves in a slow orbit.", "يتحرك الكوكب في مدار بطيء.", "core", "B1", "NGSL"],
  ["fly", "verb", "يطير", "Birds fly south in winter.", "تطير الطيور جنوباً في الشتاء.", "core", "B1", "NGSL"],
  ["fall", "verb", "يسقط", "The apple fell from the tree.", "سقطت التفاحة من الشجرة.", "core", "B1", "NGSL"],
  ["burn", "verb", "يحترق", "Stars burn for billions of years.", "تحترق النجوم لمليارات السنين.", "core", "B1", "NGSL"],
  ["shine", "verb", "يلمع", "The stars shine brightly at night.", "تلمع النجوم بسطوع في الليل.", "core", "B1", "NGSL"],
  ["circle", "noun", "دائرة", "The planets move in a circle around the Sun.", "تتحرك الكواكب في دائرة حول الشمس.", "core", "B1", "NGSL"],
  ["gravity", "noun", "جاذبية", "Gravity keeps us on the ground.", "الجاذبية تبقينا على الأرض.", "core", "B1", "CEFR-J"],
  ["rocket", "noun", "صاروخ", "The rocket launched into space.", "انطلق الصاروخ إلى الفضاء.", "core", "B1", "CEFR-J"],
  ["telescope", "noun", "تلسكوب", "He looked at the stars through a telescope.", "نظر إلى النجوم من خلال التلسكوب.", "core", "B1", "CEFR-J"],
  ["satellite", "noun", "قمر صناعي", "The satellite orbits the Earth.", "يدور القمر الصناعي حول الأرض.", "core", "B1", "CEFR-J"],
  ["atmosphere", "noun", "غلاف جوي", "The atmosphere protects us from the Sun.", "الغلاف الجوي يحمينا من الشمس.", "core", "B1", "CEFR-J"],
];

async function main() {
  const client = await pool.connect();
  try {
    const units = [
      { num: 1, data: unit1, name: "Bioethics" },
      { num: 2, data: unit2, name: "Deep Ocean" },
      { num: 3, data: unit3, name: "Food Security" },
      { num: 4, data: unit4, name: "Biomimicry" },
      { num: 5, data: unit5, name: "Migration" },
      { num: 6, data: unit6, name: "Cryptocurrency" },
      { num: 7, data: unit7, name: "Crowd Psychology" },
      { num: 8, data: unit8, name: "Forensic Science" },
      { num: 9, data: unit9, name: "Archaeology" },
      { num: 10, data: unit10, name: "Longevity" },
      { num: 11, data: unit11, name: "Sustainable Architecture" },
      { num: 12, data: unit12, name: "Exoplanets" },
    ];

    let totalInserted = 0;
    for (const u of units) {
      const count = await insertBatch(client, u.data, u.num, BATCH_ID);
      console.log(`Unit ${u.num} (${u.name}): ${count} / ${u.data.length} inserted`);
      totalInserted += count;
    }
    console.log(`\n=== Total inserted: ${totalInserted} ===\n`);

    // Query final totals per unit
    const res = await client.query(
      `SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [BATCH_ID]
    );
    console.log("Final DB counts for batch 25:");
    let dbTotal = 0;
    for (const row of res.rows) {
      console.log(`  Unit ${row.recommended_unit}: ${row.cnt} words`);
      dbTotal += parseInt(row.cnt);
    }
    console.log(`  Overall total: ${dbTotal}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
