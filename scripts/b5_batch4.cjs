// LEGENDARY-B5 Batch 4: Units 9-12
const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
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

// Unit 9 - Archaeological Mysteries
const U9 = [
  ['archaeology','noun','علم الآثار','Modern archaeology uses technology to uncover ancient civilizations.','يستخدم علم الآثار الحديث التكنولوجيا للكشف عن حضارات قديمة.','core','B2','CEFR-J'],
  ['excavation','noun','تنقيب','The excavation revealed ruins dating back over three thousand years.','كشف التنقيب عن أطلال يعود تاريخها لأكثر من ثلاثة آلاف عام.','core','B2','CEFR-J'],
  ['artifact','noun','قطعة أثرية','The museum displayed artifacts recovered from an underwater shipwreck.','عرض المتحف قطعاً أثرية استُخرجت من حطام سفينة تحت الماء.','core','B2','CEFR-J'],
  ['civilization','noun','حضارة','The Mesopotamian civilization developed some of the earliest writing systems.','طوّرت حضارة بلاد الرافدين بعض أقدم أنظمة الكتابة.','core','B2','CEFR-J'],
  ['ruins','noun','أطلال','The ancient ruins attract millions of tourists from around the world.','تجذب الأطلال القديمة ملايين السياح من جميع أنحاء العالم.','core','B2','CEFR-J'],
  ['tomb','noun','قبر / ضريح','The pharaoh tomb contained treasures untouched for millennia.','احتوى قبر الفرعون على كنوز لم تُمسّ لآلاف السنين.','core','B2','CEFR-J'],
  ['pyramid','noun','هرم','The construction methods of the Egyptian pyramids remain debated.','لا تزال طرق بناء الأهرامات المصرية موضع نقاش.','core','B2','CEFR-J'],
  ['inscription','noun','نقش / كتابة','Ancient inscriptions provide valuable clues about past societies.','توفر النقوش القديمة أدلة قيّمة عن المجتمعات الماضية.','extended','B2','CEFR-J'],
  ['hieroglyphics','noun','هيروغليفية','Deciphering Egyptian hieroglyphics unlocked centuries of hidden history.','كشف فك رموز الهيروغليفية المصرية عن قرون من التاريخ المخفي.','extended','B2','CEFR-J'],
  ['monument','noun','نصب تذكاري','Ancient monuments demonstrate remarkable engineering achievements.','تُظهر النصب التذكارية القديمة إنجازات هندسية رائعة.','core','B2','CEFR-J'],
  ['dynasty','noun','سلالة حاكمة','The Ming dynasty ruled China for nearly three hundred years.','حكمت سلالة مينغ الصين لما يقارب ثلاثمائة عام.','core','B2','CEFR-J'],
  ['relic','noun','أثر / رفات','Religious relics were considered sacred objects of great power.','اعتُبرت الآثار الدينية أشياء مقدسة ذات قوة عظيمة.','extended','B2','CEFR-J'],
  ['pottery','noun','فخار','Pottery fragments help archaeologists date ancient settlements.','تُساعد شظايا الفخار علماء الآثار في تأريخ المستوطنات القديمة.','core','B2','CEFR-J'],
  ['expedition','noun','بعثة استكشافية','The archaeological expedition spent three years at the desert site.','أمضت البعثة الأثرية ثلاث سنوات في الموقع الصحراوي.','core','B2','CEFR-J'],
  ['prehistoric','adjective','ما قبل التاريخ','Prehistoric cave paintings reveal the artistic abilities of early humans.','تكشف رسوم الكهوف ما قبل التاريخية عن القدرات الفنية للبشر الأوائل.','core','B2','CEFR-J'],
  ['medieval','adjective','من القرون الوسطى','Medieval castles were designed for both defense and daily living.','صُممت قلاع القرون الوسطى للدفاع والحياة اليومية.','core','B2','CEFR-J'],
  ['antiquity','noun','العصور القديمة','Many inventions we use today have their origins in antiquity.','كثير من الاختراعات التي نستخدمها اليوم لها أصول في العصور القديمة.','extended','C1','CEFR-J'],
  ['decipher','verb','يفك الرموز','Scholars worked for decades to decipher the mysterious ancient text.','عمل العلماء لعقود لفك رموز النص القديم الغامض.','extended','B2','CEFR-J'],
  ['unearth','verb','يكتشف / يستخرج','Workers accidentally unearthed Roman artifacts during road construction.','اكتشف العمال بالصدفة قطعاً أثرية رومانية أثناء بناء الطريق.','extended','B2','CEFR-J'],
  ['preserve','verb','يحفظ / يصون','Museums work to preserve ancient artifacts for future generations.','تعمل المتاحف على حفظ القطع الأثرية القديمة للأجيال القادمة.','core','B2','CEFR-J'],
  ['excavate','verb','ينقّب','Teams carefully excavated the site layer by layer over several months.','نقّبت الفرق في الموقع بعناية طبقة بطبقة على مدى عدة أشهر.','core','B2','CEFR-J'],
  ['restore','verb','يُرمم','Expert conservators restore damaged artifacts to their original condition.','يُرمم المرممون الخبراء القطع الأثرية التالفة إلى حالتها الأصلية.','core','B2','AWL'],
  ['carbon dating','noun','تأريخ بالكربون','Carbon dating determined that the fossils were over ten thousand years old.','حدد التأريخ بالكربون أن الأحفوريات يزيد عمرها عن عشرة آلاف عام.','extended','B2','CEFR-J'],
  ['stratigraphy','noun','علم الطبقات','Stratigraphy helps archaeologists understand the chronological order of layers.','يساعد علم الطبقات علماء الآثار في فهم الترتيب الزمني للطبقات.','mastery','C1','CEFR-J'],
  ['paleontology','noun','علم الأحافير','Paleontology bridges the gap between geology and biology.','يربط علم الأحافير الفجوة بين الجيولوجيا والأحياء.','extended','B2','CEFR-J'],
  ['anthropology','noun','علم الإنسان','Anthropology examines human cultures both past and present.','يدرس علم الإنسان الثقافات البشرية الماضية والحاضرة.','core','B2','AWL'],
  ['mythology','noun','أساطير','Greek mythology has influenced Western literature and art for centuries.','أثّرت الأساطير اليونانية على الأدب والفن الغربي لقرون.','core','B2','CEFR-J'],
  ['pharaoh','noun','فرعون','The pharaoh was considered a living god in ancient Egyptian society.','اعتُبر الفرعون إلهاً حياً في المجتمع المصري القديم.','core','B2','CEFR-J'],
  ['mummification','noun','تحنيط','Ancient Egyptian mummification techniques preserved bodies for millennia.','حافظت تقنيات التحنيط المصرية القديمة على الأجسام لآلاف السنين.','extended','C1','CEFR-J'],
  ['excavation','noun','حفريات','Each excavation season reveals new insights about ancient life.','يكشف كل موسم حفريات عن رؤى جديدة حول الحياة القديمة.','core','B2','CEFR-J'],
  ['colonnade','noun','رواق أعمدة','The temple colonnade featured ornately carved stone pillars.','تميّز رواق أعمدة المعبد بأعمدة حجرية منحوتة بشكل مزخرف.','mastery','C1','CEFR-J'],
  ['obelisk','noun','مسلّة','The ancient obelisk was transported from Egypt to a London park.','نُقلت المسلّة القديمة من مصر إلى حديقة في لندن.','extended','B2','CEFR-J'],
  ['sarcophagus','noun','تابوت حجري','The ornate sarcophagus contained the remains of an ancient king.','احتوى التابوت الحجري المزخرف على رفات ملك قديم.','mastery','C1','CEFR-J'],
  ['excavate','verb','يحفر','Archaeologists excavated a previously unknown burial chamber.','حفر علماء الآثار غرفة دفن لم تكن معروفة سابقاً.','core','B2','CEFR-J'],
  ['theorem','noun','نظرية','Pythagoras theorem was known to Babylonian mathematicians centuries earlier.','كانت نظرية فيثاغورس معروفة لعلماء الرياضيات البابليين قبل قرون.','extended','B2','CEFR-J'],
  ['legacy','noun','إرث / تراث','The architectural legacy of ancient Rome continues to inspire builders.','يستمر الإرث المعماري لروما القديمة في إلهام البنائين.','core','B2','CEFR-J'],
  ['epoch','noun','حقبة / عصر','Each geological epoch is characterized by distinct environmental conditions.','تتميز كل حقبة جيولوجية بظروف بيئية مميزة.','mastery','C1','CEFR-J'],
  ['enigma','noun','لغز / أحجية','The purpose of Stonehenge remains one of archaeology greatest enigmas.','يظل الغرض من ستونهنج أحد أعظم ألغاز علم الآثار.','extended','C1','CEFR-J'],
  ['cartouche','noun','خرطوشة (هيروغليفية)','The pharaoh name was enclosed within a decorative cartouche.','كان اسم الفرعون محاطاً بخرطوشة زخرفية.','mastery','C1','CEFR-J'],
  ['cuneiform','noun','كتابة مسمارية','Cuneiform is one of the earliest known systems of writing.','الكتابة المسمارية من أقدم أنظمة الكتابة المعروفة.','mastery','C1','CEFR-J'],
  ['mosaic','noun','فسيفساء','The Roman mosaic floor was remarkably well preserved after centuries.','كانت أرضية الفسيفساء الرومانية محفوظة بشكل رائع بعد قرون.','extended','B2','CEFR-J'],
  ['citadel','noun','قلعة / حصن','The ancient citadel dominated the skyline of the hilltop settlement.','هيمنت القلعة القديمة على أفق مستوطنة قمة التل.','extended','C1','CEFR-J'],
  ['aqueduct','noun','قناة مائية','Roman aqueducts transported water across vast distances using gravity.','نقلت القنوات المائية الرومانية المياه عبر مسافات شاسعة باستخدام الجاذبية.','extended','B2','CEFR-J'],
  ['terracotta','noun','فخار محروق','The terracotta army of China consists of thousands of unique soldiers.','يتكون جيش الفخار المحروق في الصين من آلاف الجنود الفريدين.','extended','B2','CEFR-J'],
  ['symposium','noun','ندوة / مؤتمر','The archaeological symposium attracted researchers from forty countries.','جذبت الندوة الأثرية باحثين من أربعين دولة.','extended','C1','CEFR-J'],
  ['provenance','noun','مصدر / أصل','Establishing the provenance of artifacts prevents illegal antiquities trade.','يمنع تحديد مصدر القطع الأثرية تجارة الآثار غير القانونية.','mastery','C1','CEFR-J'],
  ['lithic','adjective','حجري','Lithic tools found at the site date back to the Stone Age.','تعود الأدوات الحجرية الموجودة في الموقع إلى العصر الحجري.','mastery','C1','CEFR-J'],
  ['pictograph','noun','رسم صوري','Ancient pictographs on cave walls depict hunting scenes and animals.','تُصوّر الرسوم الصورية القديمة على جدران الكهوف مشاهد صيد وحيوانات.','mastery','C1','CEFR-J'],
  ['chronological','adjective','زمني / تسلسلي','Archaeologists arranged the artifacts in chronological order.','رتّب علماء الآثار القطع الأثرية بترتيب زمني.','core','B2','CEFR-J'],
  ['indigenous','adjective','أصلي','Indigenous oral traditions preserve historical knowledge across generations.','تحفظ التقاليد الشفهية الأصلية المعرفة التاريخية عبر الأجيال.','extended','B2','AWL'],
  ['heritage','noun','تراث','UNESCO protects world heritage sites from destruction and neglect.','تحمي اليونسكو مواقع التراث العالمي من التدمير والإهمال.','core','B2','CEFR-J'],
  ['sacred','adjective','مقدس','Many ancient sacred sites were built at astronomically significant locations.','بُنيت كثير من المواقع المقدسة القديمة في مواقع ذات أهمية فلكية.','core','B2','CEFR-J'],
  ['ritual','noun','طقس / شعيرة','Archaeological evidence reveals complex burial rituals in ancient cultures.','تكشف الأدلة الأثرية عن طقوس دفن معقدة في الثقافات القديمة.','core','B2','CEFR-J'],
  ['remnant','noun','بقية / أثر','Only scattered remnants of the once-great city wall survive today.','بقيت فقط بقايا متناثرة من سور المدينة العظيم قديماً حتى اليوم.','extended','B2','CEFR-J'],
  ['intact','adjective','سليم / كامل','The burial chamber was found completely intact after four thousand years.','وُجدت غرفة الدفن سليمة تماماً بعد أربعة آلاف عام.','core','B2','CEFR-J'],
  ['monumental','adjective','ضخم / أثري','The monumental stone structures required thousands of workers to build.','تطلبت الهياكل الحجرية الضخمة آلاف العمال لبنائها.','extended','B2','CEFR-J'],
  ['elaborate','adjective','مفصّل / متقن','The tomb contained an elaborate collection of gold jewelry.','احتوى القبر على مجموعة متقنة من المجوهرات الذهبية.','core','B2','AWL'],
  ['plunder','verb','ينهب','Tomb raiders plundered ancient burial sites for centuries.','نهب لصوص القبور المدافن القديمة لقرون.','extended','C1','CEFR-J'],
  ['reconstruct','verb','يعيد بناء','Researchers reconstruct ancient buildings using digital modeling technology.','يعيد الباحثون بناء المباني القديمة باستخدام تقنية النمذجة الرقمية.','core','B2','AWL'],
  ['hypothesis','noun','فرضية','The archaeologist proposed a new hypothesis about the temple purpose.','اقترح عالم الآثار فرضية جديدة حول الغرض من المعبد.','core','B2','AWL'],
  ['chronicle','noun','سجل تاريخي','Ancient chronicles provide written records of historical events.','توفر السجلات التاريخية القديمة سجلات مكتوبة للأحداث التاريخية.','extended','C1','CEFR-J'],
];

// Unit 10 - Longevity Science
const U10 = [
  ['longevity','noun','طول العمر','Scientific advances have dramatically increased human longevity.','زادت التطورات العلمية بشكل كبير من طول عمر الإنسان.','core','B2','CEFR-J'],
  ['aging','noun','شيخوخة','Research into the biology of aging has produced remarkable discoveries.','أنتج البحث في بيولوجيا الشيخوخة اكتشافات رائعة.','core','B2','CEFR-J'],
  ['lifespan','noun','مدة الحياة','The average human lifespan has nearly doubled in the past century.','تضاعف متوسط مدة حياة الإنسان تقريباً في القرن الماضي.','core','B2','CEFR-J'],
  ['centenarian','noun','معمّر (مئوي)','The number of centenarians worldwide has increased dramatically.','زاد عدد المعمّرين حول العالم بشكل كبير.','extended','C1','CEFR-J'],
  ['telomere','noun','تيلومير','Telomere length is associated with cellular aging and lifespan.','يرتبط طول التيلومير بشيخوخة الخلايا ومدة الحياة.','mastery','C1','CEFR-J'],
  ['senescence','noun','شيخوخة خلوية','Cellular senescence is a key factor in the aging process.','الشيخوخة الخلوية عامل رئيسي في عملية التقدم في السن.','mastery','C1','CEFR-J'],
  ['gerontology','noun','علم الشيخوخة','Gerontology research explores the biological mechanisms of aging.','تستكشف أبحاث علم الشيخوخة الآليات البيولوجية للتقدم في السن.','mastery','C1','CEFR-J'],
  ['rejuvenation','noun','تجديد الشباب','Anti-aging research focuses on cellular rejuvenation techniques.','تركز أبحاث مكافحة الشيخوخة على تقنيات تجديد شباب الخلايا.','extended','C1','CEFR-J'],
  ['vitality','noun','حيوية','Regular exercise helps maintain physical vitality well into old age.','تساعد التمارين المنتظمة في الحفاظ على الحيوية البدنية حتى الشيخوخة.','core','B2','CEFR-J'],
  ['supplement','noun','مكمّل غذائي','Dietary supplements are widely used but their benefits remain debated.','تُستخدم المكملات الغذائية على نطاق واسع لكن فوائدها لا تزال موضع نقاش.','core','B2','AWL'],
  ['antioxidant','noun','مضاد أكسدة','Antioxidants in fruits help protect cells from damage.','تساعد مضادات الأكسدة في الفواكه على حماية الخلايا من التلف.','core','B2','CEFR-J'],
  ['calorie','noun','سعرة حرارية','Calorie restriction has been shown to extend lifespan in some animals.','أظهرت الأبحاث أن تقييد السعرات الحرارية يُطيل العمر في بعض الحيوانات.','core','B1','CEFR-J'],
  ['dementia','noun','خَرَف','Early detection of dementia allows for better management of symptoms.','يسمح الكشف المبكر عن الخرف بإدارة أفضل للأعراض.','core','B2','CEFR-J'],
  ['cognitive','adjective','إدراكي / معرفي','Mental exercises help maintain cognitive function in older adults.','تساعد التمارين الذهنية في الحفاظ على الوظيفة الإدراكية لدى كبار السن.','core','B2','AWL'],
  ['mobility','noun','حركة / تنقل','Maintaining mobility is essential for independent living in old age.','الحفاظ على الحركة أمر ضروري للعيش المستقل في الشيخوخة.','core','B2','CEFR-J'],
  ['obesity','noun','سمنة','Obesity significantly reduces life expectancy and quality of life.','تُقلل السمنة بشكل كبير من متوسط العمر المتوقع وجودة الحياة.','core','B2','CEFR-J'],
  ['sedentary','adjective','قليل الحركة','A sedentary lifestyle accelerates the biological aging process.','يسرّع نمط الحياة قليل الحركة عملية الشيخوخة البيولوجية.','core','B2','CEFR-J'],
  ['centenarian','noun','مُعمّر','Japan has the highest number of centenarians per capita.','تمتلك اليابان أعلى عدد من المعمّرين بالنسبة للفرد.','extended','C1','CEFR-J'],
  ['progeria','noun','شياخ مبكر','Progeria is a rare condition that causes accelerated aging in children.','الشياخ المبكر حالة نادرة تسبب شيخوخة متسارعة عند الأطفال.','mastery','C1','CEFR-J'],
  ['autophagy','noun','التهام ذاتي','Autophagy is a cellular cleaning process that may slow aging.','الالتهام الذاتي عملية تنظيف خلوية قد تبطئ الشيخوخة.','mastery','C1','CEFR-J'],
  ['oxidative','adjective','تأكسدي','Oxidative stress damages cells and accelerates the aging process.','يُتلف الإجهاد التأكسدي الخلايا ويسرّع عملية الشيخوخة.','extended','C1','CEFR-J'],
  ['regenerative','adjective','تجديدي','Regenerative medicine aims to repair or replace damaged tissues.','يهدف الطب التجديدي إلى إصلاح أو استبدال الأنسجة التالفة.','extended','B2','CEFR-J'],
  ['chronic','adjective','مزمن','Chronic diseases are the leading cause of death among elderly people.','الأمراض المزمنة هي السبب الرئيسي للوفاة بين كبار السن.','core','B2','CEFR-J'],
  ['genetic','adjective','جيني / وراثي','Genetic factors account for approximately thirty percent of longevity.','تمثل العوامل الجينية ما يقارب ثلاثين بالمئة من طول العمر.','core','B2','CEFR-J'],
  ['metabolism','noun','أيض / استقلاب','Metabolism naturally slows down as people get older.','يتباطأ الأيض بشكل طبيعي مع تقدم الناس في العمر.','core','B2','CEFR-J'],
  ['collagen','noun','كولاجين','Collagen production decreases with age leading to wrinkled skin.','يتناقص إنتاج الكولاجين مع العمر مما يؤدي لتجاعيد الجلد.','extended','B2','CEFR-J'],
  ['stem cell','noun','خلية جذعية','Stem cell therapy may one day reverse age-related tissue damage.','قد يعكس علاج الخلايا الجذعية يوماً ما تلف الأنسجة المرتبط بالعمر.','extended','B2','CEFR-J'],
  ['caloric','adjective','حراري / سعري','Caloric restriction without malnutrition may extend healthy lifespan.','قد يُطيل تقييد السعرات بدون سوء تغذية مدة الحياة الصحية.','extended','B2','CEFR-J'],
  ['biogerontology','noun','جيرنتولوجيا حيوية','Biogerontology seeks to understand and intervene in the aging process.','تسعى الجيرنتولوجيا الحيوية لفهم عملية الشيخوخة والتدخل فيها.','mastery','C1','CEFR-J'],
  ['degenerative','adjective','تنكّسي','Degenerative diseases become more common as populations age.','تصبح الأمراض التنكّسية أكثر شيوعاً مع تقدم السكان في العمر.','extended','C1','CEFR-J'],
  ['resilience','noun','مرونة / صمود','Psychological resilience is key to maintaining wellbeing in old age.','المرونة النفسية أساسية للحفاظ على الرفاهية في الشيخوخة.','core','B2','NAWL'],
  ['hereditary','adjective','وراثي / موروث','Some hereditary factors contribute to exceptional longevity.','تساهم بعض العوامل الوراثية في طول العمر الاستثنائي.','core','B2','CEFR-J'],
  ['inflammation','noun','التهاب','Chronic low-level inflammation is linked to many age-related diseases.','يرتبط الالتهاب المزمن المنخفض المستوى بكثير من أمراض الشيخوخة.','core','B2','CEFR-J'],
  ['hormone','noun','هرمون','Declining hormone levels contribute to many symptoms of aging.','يساهم انخفاض مستويات الهرمونات في كثير من أعراض الشيخوخة.','core','B2','CEFR-J'],
  ['wellness','noun','عافية','Holistic wellness programs promote healthy aging across all dimensions.','تُعزز برامج العافية الشاملة الشيخوخة الصحية عبر جميع الأبعاد.','core','B2','CEFR-J'],
  ['meditation','noun','تأمل','Regular meditation practice has been linked to slower cellular aging.','ارتبطت ممارسة التأمل المنتظم بتباطؤ شيخوخة الخلايا.','core','B2','CEFR-J'],
  ['cardiovascular','adjective','قلبي وعائي','Cardiovascular health is the strongest predictor of healthy longevity.','صحة القلب والأوعية الدموية أقوى مؤشر لطول العمر الصحي.','core','B2','CEFR-J'],
  ['osteoporosis','noun','هشاشة العظام','Osteoporosis increases fracture risk especially in postmenopausal women.','تزيد هشاشة العظام من خطر الكسور خاصة لدى النساء بعد سن اليأس.','extended','B2','CEFR-J'],
  ['arthritis','noun','التهاب المفاصل','Arthritis is one of the most common chronic conditions in older adults.','التهاب المفاصل من أكثر الحالات المزمنة شيوعاً لدى كبار السن.','core','B2','CEFR-J'],
  ['cataract','noun','إعتام عدسة العين','Cataracts are the leading cause of vision loss in people over sixty.','إعتام عدسة العين السبب الرئيسي لفقدان البصر لدى من تجاوزوا الستين.','extended','B2','CEFR-J'],
  ['geriatric','adjective','خاص بالشيخوخة','Geriatric medicine specializes in healthcare for elderly patients.','يتخصص طب الشيخوخة في الرعاية الصحية للمرضى المسنين.','extended','C1','CEFR-J'],
  ['frailty','noun','هشاشة / وهن','Physical frailty in old age can be prevented with regular exercise.','يمكن منع الهشاشة البدنية في الشيخوخة بالتمارين المنتظمة.','extended','C1','CEFR-J'],
  ['biomarker','noun','مؤشر بيولوجي','Blood biomarkers can predict biological age more accurately than birth date.','يمكن للمؤشرات البيولوجية في الدم التنبؤ بالعمر البيولوجي بدقة أكبر من تاريخ الولادة.','extended','C1','CEFR-J'],
  ['neuroprotective','adjective','واقي للأعصاب','Certain foods have neuroprotective properties that may prevent dementia.','بعض الأطعمة لها خصائص واقية للأعصاب قد تمنع الخرف.','mastery','C1','CEFR-J'],
  ['epigenetic','adjective','فوق جيني','Epigenetic changes accumulate throughout life and influence aging.','تتراكم التغييرات فوق الجينية طوال الحياة وتؤثر على الشيخوخة.','mastery','C1','CEFR-J'],
  ['mitochondrial','adjective','ميتوكوندري','Mitochondrial dysfunction is a hallmark of the cellular aging process.','الخلل الميتوكوندري سمة مميزة لعملية شيخوخة الخلايا.','mastery','C1','CEFR-J'],
  ['callisthenic','adjective','رياضة بدنية','Callisthenic exercises help elderly people maintain strength and flexibility.','تساعد تمارين الرياضة البدنية كبار السن في الحفاظ على القوة والمرونة.','mastery','C1','CEFR-J'],
  ['demographic','adjective','ديموغرافي','Demographic shifts toward older populations challenge healthcare systems.','تُشكّل التحولات الديموغرافية نحو السكان الأكبر سناً تحدياً لأنظمة الرعاية الصحية.','extended','B2','AWL'],
  ['pension','noun','معاش تقاعدي','Increasing longevity puts pressure on pension systems worldwide.','يضع تزايد طول العمر ضغطاً على أنظمة المعاشات التقاعدية عالمياً.','core','B2','CEFR-J'],
  ['retirement','noun','تقاعد','Many people now remain active and productive well beyond retirement age.','يظل كثير من الناس نشطين ومنتجين بعد سن التقاعد بكثير.','core','B1','CEFR-J'],
];

// Unit 11 - Sustainable Architecture
const U11 = [
  ['architecture','noun','عمارة / هندسة معمارية','Sustainable architecture minimizes environmental impact of buildings.','تُقلل العمارة المستدامة من الأثر البيئي للمباني.','core','B2','CEFR-J'],
  ['blueprint','noun','مخطط','The architect presented a detailed blueprint for the green building.','قدّم المهندس المعماري مخططاً مفصلاً للمبنى الأخضر.','core','B2','CEFR-J'],
  ['insulation','noun','عزل','Proper insulation reduces energy consumption for heating and cooling.','يُقلل العزل المناسب من استهلاك الطاقة للتدفئة والتبريد.','core','B2','CEFR-J'],
  ['facade','noun','واجهة','The building facade features solar panels integrated into the glass.','تتميز واجهة المبنى بألواح شمسية مدمجة في الزجاج.','extended','B2','CEFR-J'],
  ['emission','noun','انبعاث','Green buildings aim to reduce carbon emissions throughout their lifecycle.','تهدف المباني الخضراء لتقليل انبعاثات الكربون خلال دورة حياتها.','core','B2','AWL'],
  ['renewable','adjective','متجدد','Buildings powered by renewable energy sources have zero carbon footprint.','المباني المُشغّلة بمصادر الطاقة المتجددة ليس لها بصمة كربونية.','core','B2','NAWL'],
  ['demolish','verb','يهدم','Rather than demolish old buildings architects increasingly choose renovation.','بدلاً من هدم المباني القديمة يختار المهندسون المعماريون التجديد بشكل متزايد.','core','B2','CEFR-J'],
  ['retrofit','verb','يُحدّث / يُعدّل','Cities retrofit existing buildings with modern energy-efficient systems.','تُحدّث المدن المباني القائمة بأنظمة حديثة موفرة للطاقة.','extended','C1','CEFR-J'],
  ['ventilation','noun','تهوية','Natural ventilation systems reduce the need for air conditioning.','تُقلل أنظمة التهوية الطبيعية الحاجة لتكييف الهواء.','core','B2','CEFR-J'],
  ['foundation','noun','أساس / قاعدة','The foundation must support the entire weight of the structure.','يجب أن يدعم الأساس الوزن الكامل للهيكل.','core','B1','CEFR-J'],
  ['concrete','noun','خرسانة','Low-carbon concrete alternatives are being developed for construction.','تُطوَّر بدائل الخرسانة منخفضة الكربون للبناء.','core','B2','CEFR-J'],
  ['timber','noun','خشب (بناء)','Cross-laminated timber is replacing steel in many modern buildings.','يحل خشب الصنوبر المتقاطع محل الفولاذ في كثير من المباني الحديثة.','extended','B2','CEFR-J'],
  ['scaffold','noun','سقالة','Workers erected scaffolding around the tower for renovation work.','أقام العمال سقالات حول البرج لأعمال التجديد.','extended','B2','CEFR-J'],
  ['acoustic','adjective','صوتي / سمعي','Good acoustic design reduces noise pollution inside buildings.','يُقلل التصميم الصوتي الجيد من التلوث الضوضائي داخل المباني.','extended','B2','CEFR-J'],
  ['geothermal','adjective','حراري أرضي','Geothermal heating systems use the Earth natural warmth.','تستخدم أنظمة التدفئة الحرارية الأرضية دفء الأرض الطبيعي.','extended','B2','CEFR-J'],
  ['photovoltaic','adjective','كهروضوئي','Photovoltaic panels on rooftops generate electricity from sunlight.','تولّد الألواح الكهروضوئية على الأسطح كهرباء من ضوء الشمس.','extended','C1','NAWL'],
  ['urbanization','noun','تحضّر / تمدّن','Rapid urbanization demands innovative sustainable building solutions.','يتطلب التحضّر السريع حلول بناء مستدامة مبتكرة.','core','B2','NAWL'],
  ['zoning','noun','تقسيم مناطق','Urban zoning regulations determine what can be built in each area.','تحدد لوائح تقسيم المناطق الحضرية ما يمكن بناؤه في كل منطقة.','extended','B2','CEFR-J'],
  ['density','noun','كثافة','High population density requires creative architectural solutions.','تتطلب الكثافة السكانية العالية حلولاً معمارية إبداعية.','core','B2','AWL'],
  ['carbon footprint','noun','بصمة كربونية','Architects work to minimize the carbon footprint of new constructions.','يعمل المهندسون المعماريون على تقليل البصمة الكربونية للإنشاءات الجديدة.','core','B2','CEFR-J'],
  ['modular','adjective','نمطي / وحداتي','Modular construction allows buildings to be assembled from prefabricated parts.','يسمح البناء النمطي بتجميع المباني من أجزاء مسبقة الصنع.','extended','B2','NAWL'],
  ['aesthetic','adjective','جمالي','Green buildings prove that sustainability and aesthetic design can coexist.','تُثبت المباني الخضراء أن الاستدامة والتصميم الجمالي يمكن أن يتعايشا.','core','B2','AWL'],
  ['renovation','noun','تجديد / ترميم','Building renovation is often more sustainable than new construction.','تجديد المباني غالباً أكثر استدامة من البناء الجديد.','core','B2','CEFR-J'],
  ['rooftop','noun','سطح المبنى','Rooftop gardens help insulate buildings and reduce urban heat.','تُساعد حدائق الأسطح في عزل المباني وتقليل الحرارة الحضرية.','core','B2','CEFR-J'],
  ['canopy','noun','مظلة / غطاء','Tree canopies in urban areas provide natural shade and cooling.','توفر مظلات الأشجار في المناطق الحضرية ظلاً وتبريداً طبيعياً.','extended','B2','CEFR-J'],
  ['prefabricated','adjective','مسبق الصنع','Prefabricated building components reduce construction time and waste.','تُقلل مكونات البناء مسبقة الصنع وقت البناء والنفايات.','extended','B2','CEFR-J'],
  ['rainwater','noun','ماء مطر','Rainwater harvesting systems collect water for building use.','تجمع أنظمة حصاد مياه الأمطار المياه لاستخدام المبنى.','core','B2','CEFR-J'],
  ['graywater','noun','مياه رمادية','Graywater recycling systems reuse water from sinks for irrigation.','تُعيد أنظمة إعادة تدوير المياه الرمادية استخدام مياه الأحواض للري.','mastery','C1','NAWL'],
  ['passive','adjective','سلبي / خامل','Passive house design maintains comfort without active heating.','يُحافظ تصميم المنزل السلبي على الراحة بدون تدفئة نشطة.','core','B2','CEFR-J'],
  ['steel','noun','فولاذ','Recycled steel beams reduce the environmental cost of construction.','تُقلل عوارض الفولاذ المُعاد تدويرها التكلفة البيئية للبناء.','core','B1','CEFR-J'],
  ['skyline','noun','أفق / خط سماء','The city skyline has been transformed by green building projects.','تحول أفق المدينة بفضل مشاريع المباني الخضراء.','core','B2','CEFR-J'],
  ['skyscraper','noun','ناطحة سحاب','Modern skyscrapers incorporate sustainable design from the ground up.','تدمج ناطحات السحاب الحديثة التصميم المستدام من الأساس.','core','B2','CEFR-J'],
  ['biomimetic','adjective','محاكٍ للحياة','Biomimetic architecture draws inspiration from natural structures.','تستلهم العمارة المحاكية للحياة من الهياكل الطبيعية.','mastery','C1','NAWL'],
  ['atrium','noun','ردهة / فناء','The central atrium provides natural light throughout the building.','توفر الردهة المركزية الإضاءة الطبيعية في جميع أنحاء المبنى.','extended','C1','CEFR-J'],
  ['terrace','noun','تراس / شُرفة','Green terraces at multiple levels add vegetation to urban buildings.','تُضيف التراسات الخضراء على مستويات متعددة نباتات للمباني الحضرية.','core','B2','CEFR-J'],
  ['corridor','noun','ممر','Natural light corridors reduce electricity use for interior lighting.','تُقلل ممرات الإضاءة الطبيعية استخدام الكهرباء للإنارة الداخلية.','core','B2','CEFR-J'],
  ['municipality','noun','بلدية','The municipality requires all new buildings to meet green standards.','تُلزم البلدية جميع المباني الجديدة باستيفاء المعايير الخضراء.','extended','B2','CEFR-J'],
  ['reclaim','verb','يستصلح','Architects reclaim abandoned industrial sites for new green developments.','يستصلح المهندسون المعماريون المواقع الصناعية المهجورة لتطويرات خضراء.','extended','B2','CEFR-J'],
  ['certify','verb','يُصدّق / يُعتمد','Independent organizations certify buildings that meet sustainability standards.','تُصدّق منظمات مستقلة المباني التي تستوفي معايير الاستدامة.','extended','B2','CEFR-J'],
  ['commission','verb','يُكلّف','The city commissioned a renowned architect to design the new library.','كلّفت المدينة مهندساً معمارياً شهيراً بتصميم المكتبة الجديدة.','extended','B2','AWL'],
  ['degradation','noun','تدهور','Material degradation over time affects building structural integrity.','يؤثر تدهور المواد بمرور الوقت على السلامة الهيكلية للمبنى.','extended','B2','AWL'],
  ['permeable','adjective','نفّاذ / مسامي','Permeable pavements allow rainwater to filter naturally into the ground.','تسمح الأرصفة النفّاذة لمياه الأمطار بالترشح طبيعياً في الأرض.','extended','C1','CEFR-J'],
  ['sustainable','adjective','مستدام','Sustainable construction materials include bamboo recycled steel and hemp.','تشمل مواد البناء المستدامة الخيزران والفولاذ المعاد تدويره والقنّب.','core','B2','NAWL'],
  ['vernacular','adjective','محلي / عامي','Vernacular architecture reflects local climate materials and traditions.','تعكس العمارة المحلية المناخ والمواد والتقاليد المحلية.','mastery','C1','CEFR-J'],
  ['cantilever','noun','كابولي / ناتئ','The cantilever design creates dramatic overhanging spaces.','يُنشئ التصميم الكابولي فراغات متدلية مذهلة.','mastery','C1','CEFR-J'],
  ['tenement','noun','مبنى سكني','Old tenement buildings are being renovated with green technology.','تُجدَّد المباني السكنية القديمة بتكنولوجيا خضراء.','extended','C1','CEFR-J'],
  ['infrastructure','noun','بنية تحتية','Green infrastructure integrates nature into urban planning.','تدمج البنية التحتية الخضراء الطبيعة في التخطيط الحضري.','core','B2','AWL'],
  ['resilient','adjective','مرن / متين','Resilient buildings withstand extreme weather and natural disasters.','تصمد المباني المرنة أمام الطقس القاسي والكوارث الطبيعية.','core','B2','CEFR-J'],
  ['greenhouse gas','noun','غاز دفيئة','The building sector produces forty percent of global greenhouse gas.','ينتج قطاع البناء أربعين بالمئة من غازات الدفيئة العالمية.','core','B2','CEFR-J'],
  ['biodiversity','noun','تنوع حيوي','Green roofs promote urban biodiversity by creating habitat for insects.','تُعزز الأسطح الخضراء التنوع الحيوي الحضري بتوفير موائل للحشرات.','core','B2','NAWL'],
  ['decommission','verb','يُخرج من الخدمة','Decommissioning old power plants creates opportunities for green development.','يخلق إخراج محطات الطاقة القديمة من الخدمة فرصاً للتنمية الخضراء.','mastery','C1','NAWL'],
];

// Unit 12 - Exoplanet Hunting
const U12 = [
  ['exoplanet','noun','كوكب خارجي','Scientists have discovered thousands of exoplanets orbiting distant stars.','اكتشف العلماء آلاف الكواكب الخارجية التي تدور حول نجوم بعيدة.','core','B2','CEFR-J'],
  ['telescope','noun','تلسكوب','The James Webb Space Telescope has revolutionized exoplanet research.','أحدث تلسكوب جيمس ويب الفضائي ثورة في أبحاث الكواكب الخارجية.','core','B2','CEFR-J'],
  ['orbit','noun','مدار','The planet completes one orbit around its star every twelve days.','يُكمل الكوكب مداراً واحداً حول نجمه كل اثني عشر يوماً.','core','B2','CEFR-J'],
  ['atmosphere','noun','غلاف جوي','Analyzing exoplanet atmospheres may reveal signs of extraterrestrial life.','قد يكشف تحليل الأغلفة الجوية للكواكب الخارجية عن علامات حياة خارجية.','core','B2','CEFR-J'],
  ['habitable','adjective','صالح للسكن','The habitable zone is the region where liquid water could exist.','المنطقة الصالحة للسكن هي المنطقة التي يمكن أن يوجد فيها ماء سائل.','core','B2','CEFR-J'],
  ['galaxy','noun','مجرة','Our Milky Way galaxy contains billions of potentially habitable planets.','تحتوي مجرتنا درب التبانة على مليارات الكواكب الصالحة للسكن المحتملة.','core','B2','CEFR-J'],
  ['constellation','noun','كوكبة / برج فلكي','Astronomers map exoplanets by the constellation in which they appear.','يرسم علماء الفلك خرائط الكواكب الخارجية حسب الكوكبة التي تظهر فيها.','core','B2','CEFR-J'],
  ['spectroscopy','noun','مطيافية / تحليل طيفي','Spectroscopy reveals the chemical composition of exoplanet atmospheres.','تكشف المطيافية عن التركيب الكيميائي للأغلفة الجوية للكواكب الخارجية.','extended','C1','NAWL'],
  ['luminosity','noun','سطوع / إضاءة','A star luminosity affects the habitable zone of orbiting planets.','يؤثر سطوع النجم على المنطقة الصالحة للسكن للكواكب المدارية.','extended','C1','CEFR-J'],
  ['gravitational','adjective','جاذبي','Gravitational forces between planets affect their orbital patterns.','تؤثر القوى الجاذبية بين الكواكب على أنماطها المدارية.','core','B2','CEFR-J'],
  ['transit','noun','عبور (فلكي)','The transit method detects planets as they pass in front of stars.','تكشف طريقة العبور الكواكب أثناء مرورها أمام النجوم.','extended','B2','AWL'],
  ['celestial','adjective','سماوي / فلكي','Ancient civilizations tracked celestial objects to predict seasons.','تتبعت الحضارات القديمة الأجرام السماوية للتنبؤ بالفصول.','extended','B2','CEFR-J'],
  ['cosmic','adjective','كوني','Cosmic radiation poses significant challenges for space exploration.','يُشكّل الإشعاع الكوني تحديات كبيرة لاستكشاف الفضاء.','core','B2','CEFR-J'],
  ['astronomical','adjective','فلكي','Astronomical observations have confirmed over five thousand exoplanets.','أكدت الملاحظات الفلكية أكثر من خمسة آلاف كوكب خارجي.','core','B2','CEFR-J'],
  ['terrestrial','adjective','أرضي','Scientists search for terrestrial planets similar in size to Earth.','يبحث العلماء عن كواكب أرضية مماثلة في الحجم للأرض.','core','B2','CEFR-J'],
  ['extraterrestrial','adjective','خارج الأرض','The search for extraterrestrial life motivates much exoplanet research.','يُحفّز البحث عن حياة خارج الأرض كثيراً من أبحاث الكواكب الخارجية.','core','B2','CEFR-J'],
  ['astronomer','noun','عالم فلك','Astronomers use advanced instruments to detect distant planetary systems.','يستخدم علماء الفلك أدوات متقدمة للكشف عن أنظمة كوكبية بعيدة.','core','B2','CEFR-J'],
  ['planetary','adjective','كوكبي','Planetary science studies the formation and evolution of planets.','يدرس علم الكواكب تكوّن وتطور الكواكب.','core','B2','CEFR-J'],
  ['nebula','noun','سديم','Stars and planets form from massive clouds of gas called nebulae.','تتشكل النجوم والكواكب من سحب غازية ضخمة تُسمى السدم.','extended','C1','CEFR-J'],
  ['supernova','noun','مستعر أعظم','A supernova explosion can create elements necessary for planet formation.','يمكن لانفجار المستعر الأعظم خلق عناصر ضرورية لتكوّن الكواكب.','extended','C1','CEFR-J'],
  ['dwarf','noun','قزم','Red dwarf stars are the most common hosts of known exoplanets.','النجوم القزمة الحمراء هي أكثر مُضيفات الكواكب الخارجية المعروفة شيوعاً.','extended','B2','CEFR-J'],
  ['hydrogen','noun','هيدروجين','Hydrogen is the most abundant element in the universe.','الهيدروجين هو العنصر الأكثر وفرة في الكون.','core','B2','CEFR-J'],
  ['helium','noun','هيليوم','Gas giant planets are composed primarily of hydrogen and helium.','تتكون الكواكب الغازية العملاقة بشكل رئيسي من الهيدروجين والهيليوم.','extended','B2','CEFR-J'],
  ['magnitude','noun','قدر (سطوع)','Astronomers measure star brightness using a scale called magnitude.','يقيس علماء الفلك سطوع النجوم باستخدام مقياس يُسمى القدر.','extended','B2','AWL'],
  ['velocity','noun','سرعة','The radial velocity method measures star wobble caused by orbiting planets.','تقيس طريقة السرعة القطرية تأرجح النجم الناجم عن الكواكب المدارية.','extended','B2','CEFR-J'],
  ['infrared','adjective','تحت أحمر','Infrared telescopes can detect heat signatures of distant exoplanets.','يمكن لتلسكوبات الأشعة تحت الحمراء اكتشاف بصمات حرارية لكواكب خارجية.','extended','B2','CEFR-J'],
  ['wavelength','noun','طول موجي','Different wavelengths of light reveal different atmospheric components.','تكشف أطوال موجية مختلفة من الضوء عن مكونات جوية مختلفة.','extended','B2','CEFR-J'],
  ['photon','noun','فوتون','Telescopes collect photons from distant stars to analyze their light.','تجمع التلسكوبات الفوتونات من نجوم بعيدة لتحليل ضوئها.','mastery','C1','CEFR-J'],
  ['protoplanetary','adjective','أولي كوكبي','Protoplanetary disks of gas and dust eventually form into planets.','تتشكل أقراص الغاز والغبار الأولية الكوكبية في النهاية إلى كواكب.','mastery','C1','CEFR-J'],
  ['biosignature','noun','بصمة حيوية','Detecting biosignatures in exoplanet atmospheres could confirm alien life.','قد يؤكد اكتشاف البصمات الحيوية في أغلفة الكواكب الخارجية وجود حياة فضائية.','mastery','C1','CEFR-J'],
  ['habitable zone','noun','منطقة صالحة للحياة','The habitable zone varies depending on the type and size of star.','تختلف المنطقة الصالحة للحياة حسب نوع وحجم النجم.','core','B2','CEFR-J'],
  ['light-year','noun','سنة ضوئية','The nearest exoplanet is approximately four light-years from Earth.','أقرب كوكب خارجي يبعد ما يقارب أربع سنوات ضوئية عن الأرض.','core','B2','CEFR-J'],
  ['spectrum','noun','طيف','The light spectrum of a star reveals its temperature and composition.','يكشف الطيف الضوئي للنجم عن درجة حرارته وتركيبه.','core','B2','CEFR-J'],
  ['rotation','noun','دوران','A planet rotation speed determines the length of its day.','تحدد سرعة دوران الكوكب طول يومه.','core','B2','CEFR-J'],
  ['diameter','noun','قُطر','Some exoplanets have a diameter several times larger than Jupiter.','بعض الكواكب الخارجية لها قُطر أكبر بعدة مرات من المشتري.','core','B2','CEFR-J'],
  ['crater','noun','فوهة / حفرة','Impact craters on planetary surfaces reveal their geological history.','تكشف فوهات الاصطدام على أسطح الكواكب عن تاريخها الجيولوجي.','core','B2','CEFR-J'],
  ['probe','noun','مسبار','Space probes collect data from the outer reaches of our solar system.','تجمع المسابير الفضائية بيانات من أطراف نظامنا الشمسي.','core','B2','CEFR-J'],
  ['interstellar','adjective','بين نجمي','Interstellar travel remains beyond current technological capabilities.','لا يزال السفر بين النجمي يتجاوز القدرات التكنولوجية الحالية.','extended','C1','CEFR-J'],
  ['photosphere','noun','فوتوسفير / سطح مرئي','The photosphere is the visible surface layer of a star.','الفوتوسفير هو الطبقة السطحية المرئية للنجم.','mastery','C1','CEFR-J'],
  ['accretion','noun','تراكم','Planet formation begins with the accretion of dust and gas.','يبدأ تكوّن الكواكب بتراكم الغبار والغاز.','mastery','C1','CEFR-J'],
  ['perihelion','noun','حضيض شمسي','Earth reaches its perihelion closest approach to the Sun in January.','تصل الأرض إلى حضيضها الشمسي أقرب اقتراب من الشمس في يناير.','mastery','C1','CEFR-J'],
  ['aphelion','noun','أوج شمسي','The planet aphelion is its farthest point from the parent star.','الأوج الشمسي للكوكب هو أبعد نقطة عن النجم الأم.','mastery','C1','CEFR-J'],
  ['magnetosphere','noun','غلاف مغناطيسي','A planet magnetosphere protects its atmosphere from solar wind.','يحمي الغلاف المغناطيسي للكوكب غلافه الجوي من الرياح الشمسية.','mastery','C1','CEFR-J'],
  ['binary','adjective','ثنائي','Some exoplanets orbit binary star systems with two suns.','تدور بعض الكواكب الخارجية حول أنظمة نجوم ثنائية بشمسين.','extended','B2','CEFR-J'],
  ['elliptical','adjective','بيضاوي','Most planetary orbits are elliptical rather than perfectly circular.','معظم مدارات الكواكب بيضاوية بدلاً من دائرية تماماً.','extended','B2','CEFR-J'],
  ['tidal','adjective','مدّي','Tidal forces from the star can heat the interior of close-orbiting planets.','يمكن لقوى المد من النجم تسخين باطن الكواكب قريبة المدار.','extended','B2','CEFR-J'],
  ['volatile','adjective','متطاير','Volatile compounds in the atmosphere indicate potential geological activity.','تشير المركبات المتطايرة في الغلاف الجوي إلى نشاط جيولوجي محتمل.','extended','B2','CEFR-J'],
  ['astrobiologist','noun','عالم أحياء فلكية','Astrobiologists study the possibility of life on other worlds.','يدرس علماء الأحياء الفلكية إمكانية وجود حياة على عوالم أخرى.','mastery','C1','CEFR-J'],
  ['interferometry','noun','قياس التداخل','Interferometry combines light from multiple telescopes for sharper images.','يجمع قياس التداخل الضوء من تلسكوبات متعددة للحصول على صور أوضح.','mastery','C1','NAWL'],
  ['coronagraph','noun','مرسام إكليلي','A coronagraph blocks starlight to reveal orbiting planets nearby.','يحجب المرسام الإكليلي ضوء النجم للكشف عن الكواكب المدارية القريبة.','mastery','C1','CEFR-J'],
  ['tidally locked','adjective','مقيّد مدّياً','Tidally locked planets always show the same face to their star.','تُظهر الكواكب المقيّدة مدّياً دائماً نفس الوجه لنجمها.','mastery','C1','CEFR-J'],
];

async function run() {
  const client = await pool.connect();
  try {
    const before = await client.query(`SELECT COUNT(*) AS cnt FROM vocab_staging_l4`);
    console.log('Before:', before.rows[0].cnt, 'words');

    const u9c = await insertBatch(client, U9, 9, 10);
    console.log(`U9: ${u9c} inserted (batch 10)`);

    const u10c = await insertBatch(client, U10, 10, 11);
    console.log(`U10: ${u10c} inserted (batch 11)`);

    const u11c = await insertBatch(client, U11, 11, 12);
    console.log(`U11: ${u11c} inserted (batch 12)`);

    const u12c = await insertBatch(client, U12, 12, 13);
    console.log(`U12: ${u12c} inserted (batch 13)`);

    const after = await client.query(`SELECT recommended_unit, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit`);
    console.log('\n=== Per-unit totals ===');
    after.rows.forEach(r => console.log(`U${r.recommended_unit}: ${r.cnt}`));

    const total = await client.query(`SELECT COUNT(*) AS cnt FROM vocab_staging_l4`);
    console.log('\nTotal staged:', total.rows[0].cnt);

    // CEFR distribution
    const cefr = await client.query(`SELECT cefr_level, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY cefr_level ORDER BY cefr_level`);
    console.log('\n=== CEFR distribution ===');
    cefr.rows.forEach(r => console.log(`${r.cefr_level}: ${r.cnt}`));

    // Tier distribution
    const tier = await client.query(`SELECT recommended_tier, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_tier ORDER BY recommended_tier`);
    console.log('\n=== Tier distribution ===');
    tier.rows.forEach(r => console.log(`${r.recommended_tier}: ${r.cnt}`));

    // Source distribution
    const src = await client.query(`SELECT source_list, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY source_list ORDER BY cnt DESC`);
    console.log('\n=== Source distribution ===');
    src.rows.forEach(r => console.log(`${r.source_list}: ${r.cnt}`));
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(e => console.error(e));
