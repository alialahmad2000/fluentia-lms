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

// [word, pos, definition_ar, example_en, example_ar, recommended_tier, cefr_level, source_list]

const unit1 = [
  ["genetic modification", "noun", "التعديل الجيني", "Genetic modification of crops has increased food production.", "أدى التعديل الجيني للمحاصيل إلى زيادة الإنتاج الغذائي.", "core", "B2", "AWL"],
  ["stem cell research", "noun", "أبحاث الخلايا الجذعية", "Stem cell research offers hope for treating degenerative diseases.", "تقدم أبحاث الخلايا الجذعية أملاً في علاج الأمراض التنكسية.", "extended", "C1", "COCA"],
  ["gene therapy", "noun", "العلاج الجيني", "Gene therapy could potentially cure inherited disorders.", "يمكن للعلاج الجيني أن يشفي الاضطرابات الوراثية.", "core", "B2", "AWL"],
  ["clinical trial", "noun", "تجربة سريرية", "The new drug must pass a clinical trial before approval.", "يجب أن يجتاز الدواء الجديد تجربة سريرية قبل الموافقة عليه.", "core", "B2", "COCA"],
  ["informed consent", "noun", "الموافقة المستنيرة", "Patients must give informed consent before any procedure.", "يجب على المرضى تقديم الموافقة المستنيرة قبل أي إجراء.", "extended", "C1", "AWL"],
  ["ethical dilemma", "noun", "معضلة أخلاقية", "Cloning presents a serious ethical dilemma for scientists.", "يمثل الاستنساخ معضلة أخلاقية خطيرة للعلماء.", "core", "B2", "AWL"],
  ["moral obligation", "noun", "التزام أخلاقي", "Doctors have a moral obligation to do no harm.", "يقع على الأطباء التزام أخلاقي بعدم إلحاق الأذى.", "core", "B2", "CEFR-J"],
  ["regulatory framework", "noun", "إطار تنظيمي", "A strong regulatory framework is needed for gene editing.", "هناك حاجة إلى إطار تنظيمي قوي لتعديل الجينات.", "extended", "C1", "AWL"],
  ["peer review", "noun", "مراجعة الأقران", "All studies undergo peer review before publication.", "تخضع جميع الدراسات لمراجعة الأقران قبل النشر.", "core", "B2", "AWL"],
  ["double-blind study", "noun", "دراسة مزدوجة التعمية", "A double-blind study ensures unbiased results.", "تضمن الدراسة مزدوجة التعمية نتائج غير متحيزة.", "mastery", "C1", "COCA"],
  ["control group", "noun", "مجموعة ضابطة", "The control group received a placebo instead of the drug.", "تلقت المجموعة الضابطة دواءً وهمياً بدلاً من الدواء.", "core", "B2", "COCA"],
  ["side effect", "noun", "أثر جانبي", "Drowsiness is a common side effect of this medication.", "النعاس أثر جانبي شائع لهذا الدواء.", "core", "B1", "CEFR-J"],
  ["drug interaction", "noun", "تفاعل دوائي", "The pharmacist warned about a possible drug interaction.", "حذر الصيدلي من تفاعل دوائي محتمل.", "extended", "B2", "COCA"],
  ["organ transplant", "noun", "زراعة الأعضاء", "The patient is waiting for an organ transplant.", "ينتظر المريض عملية زراعة الأعضاء.", "core", "B2", "CEFR-J"],
  ["tissue engineering", "noun", "هندسة الأنسجة", "Tissue engineering may replace the need for donor organs.", "قد تحل هندسة الأنسجة محل الحاجة إلى أعضاء المتبرعين.", "mastery", "C1", "COCA"],
  ["DNA sequencing", "noun", "تحديد تسلسل الحمض النووي", "DNA sequencing has revolutionized modern medicine.", "أحدث تحديد تسلسل الحمض النووي ثورة في الطب الحديث.", "extended", "C1", "COCA"],
  ["gene expression", "noun", "التعبير الجيني", "Environmental factors can influence gene expression.", "يمكن للعوامل البيئية التأثير على التعبير الجيني.", "mastery", "C1", "AWL"],
  ["immune response", "noun", "استجابة مناعية", "The vaccine triggers a strong immune response.", "يحفز اللقاح استجابة مناعية قوية.", "core", "B2", "COCA"],
  ["allergic reaction", "noun", "تفاعل تحسسي", "Some patients may develop an allergic reaction to the drug.", "قد يصاب بعض المرضى بتفاعل تحسسي تجاه الدواء.", "core", "B1", "CEFR-J"],
  ["blood transfusion", "noun", "نقل الدم", "The patient needed an emergency blood transfusion.", "احتاج المريض إلى عملية نقل دم طارئة.", "core", "B2", "CEFR-J"],
  ["bone graft", "noun", "طعم عظمي", "A bone graft was required to repair the fracture.", "كان الطعم العظمي ضرورياً لإصلاح الكسر.", "mastery", "C1", "COCA"],
  ["nerve damage", "noun", "تلف الأعصاب", "The injury resulted in permanent nerve damage.", "أسفرت الإصابة عن تلف دائم في الأعصاب.", "core", "B2", "CEFR-J"],
  ["birth defect", "noun", "عيب خلقي", "Exposure to toxins can cause a birth defect.", "التعرض للسموم قد يسبب عيباً خلقياً.", "core", "B2", "COCA"],
  ["genetic predisposition", "noun", "استعداد وراثي", "There is a genetic predisposition for heart disease in her family.", "هناك استعداد وراثي لأمراض القلب في عائلتها.", "extended", "C1", "AWL"],
  ["cell membrane", "noun", "غشاء الخلية", "The cell membrane controls what enters and exits the cell.", "يتحكم غشاء الخلية فيما يدخل ويخرج منها.", "core", "B2", "COCA"]
];

const unit2 = [
  ["tectonic plate", "noun", "صفيحة تكتونية", "The movement of a tectonic plate causes earthquakes.", "تسبب حركة الصفيحة التكتونية الزلازل.", "core", "B2", "COCA"],
  ["ocean trench", "noun", "خندق محيطي", "The Mariana Trench is the deepest ocean trench on Earth.", "خندق ماريانا هو أعمق خندق محيطي على الأرض.", "extended", "B2", "COCA"],
  ["hydrothermal vent", "noun", "فوهة حرارية مائية", "Life thrives near a hydrothermal vent on the ocean floor.", "تزدهر الحياة بالقرب من الفوهات الحرارية المائية في قاع المحيط.", "mastery", "C1", "COCA"],
  ["continental drift", "noun", "الانجراف القاري", "Continental drift explains why continents fit together like a puzzle.", "يفسر الانجراف القاري لماذا تتلاءم القارات كأحجية.", "core", "B2", "COCA"],
  ["marine ecosystem", "noun", "نظام بيئي بحري", "Pollution threatens every marine ecosystem on the planet.", "يهدد التلوث كل نظام بيئي بحري على الكوكب.", "core", "B2", "AWL"],
  ["coral bleaching", "noun", "ابيضاض المرجان", "Rising sea temperatures are causing widespread coral bleaching.", "يسبب ارتفاع درجات حرارة البحر ابيضاض المرجان على نطاق واسع.", "extended", "C1", "COCA"],
  ["ocean acidification", "noun", "تحمض المحيطات", "Ocean acidification is a major threat to shellfish populations.", "يعد تحمض المحيطات تهديداً رئيسياً لأعداد المحار.", "extended", "C1", "AWL"],
  ["underwater volcano", "noun", "بركان تحت الماء", "An underwater volcano can create new islands when it erupts.", "يمكن للبركان تحت الماء أن يخلق جزراً جديدة عند ثورانه.", "core", "B2", "CEFR-J"],
  ["deep-sea creature", "noun", "كائن أعماق البحار", "Scientists discovered a new deep-sea creature near the vent.", "اكتشف العلماء كائناً جديداً من أعماق البحار بالقرب من الفوهة.", "core", "B2", "COCA"],
  ["research submarine", "noun", "غواصة أبحاث", "The research submarine descended to record depths.", "غاصت غواصة الأبحاث إلى أعماق قياسية.", "extended", "B2", "COCA"],
  ["sonar mapping", "noun", "رسم الخرائط بالسونار", "Sonar mapping revealed mountain ranges on the ocean floor.", "كشف رسم الخرائط بالسونار عن سلاسل جبلية في قاع المحيط.", "mastery", "C1", "COCA"],
  ["water pressure", "noun", "ضغط الماء", "Water pressure increases dramatically with depth.", "يزداد ضغط الماء بشكل كبير مع العمق.", "core", "B1", "CEFR-J"],
  ["ocean current", "noun", "تيار محيطي", "The Gulf Stream is a powerful ocean current.", "تيار الخليج هو تيار محيطي قوي.", "core", "B2", "CEFR-J"],
  ["tidal pattern", "noun", "نمط المد والجزر", "The moon influences the tidal pattern of coastal areas.", "يؤثر القمر على نمط المد والجزر في المناطق الساحلية.", "core", "B2", "COCA"],
  ["sea surface temperature", "noun", "درجة حرارة سطح البحر", "Rising sea surface temperature is linked to stronger hurricanes.", "يرتبط ارتفاع درجة حرارة سطح البحر بأعاصير أقوى.", "extended", "C1", "COCA"],
  ["plankton bloom", "noun", "تكاثر العوالق", "A plankton bloom can be seen from satellites in space.", "يمكن رؤية تكاثر العوالق من الأقمار الصناعية في الفضاء.", "extended", "C1", "COCA"],
  ["food web", "noun", "شبكة غذائية", "Every organism plays a role in the ocean food web.", "يلعب كل كائن حي دوراً في الشبكة الغذائية للمحيط.", "core", "B2", "CEFR-J"],
  ["marine pollution", "noun", "تلوث بحري", "Marine pollution kills thousands of seabirds each year.", "يقتل التلوث البحري آلاف الطيور البحرية كل عام.", "core", "B2", "AWL"],
  ["plastic debris", "noun", "حطام بلاستيكي", "Plastic debris has been found in the deepest ocean trenches.", "تم العثور على حطام بلاستيكي في أعمق الخنادق المحيطية.", "core", "B2", "COCA"],
  ["ocean conservation", "noun", "حفظ المحيطات", "Ocean conservation requires international cooperation.", "يتطلب حفظ المحيطات تعاوناً دولياً.", "core", "B2", "AWL"],
  ["abyssal plain", "noun", "سهل سحيق", "The abyssal plain covers most of the ocean floor.", "يغطي السهل السحيق معظم قاع المحيط.", "mastery", "C1", "COCA"],
  ["submarine canyon", "noun", "وادٍ بحري", "A submarine canyon was carved by underwater currents.", "تم نحت الوادي البحري بواسطة التيارات تحت الماء.", "extended", "C1", "COCA"],
  ["bioluminescent organism", "noun", "كائن مضيء حيوياً", "A bioluminescent organism produces its own light in the dark ocean.", "ينتج الكائن المضيء حيوياً ضوءه الخاص في المحيط المظلم.", "mastery", "C1", "COCA"],
  ["sediment layer", "noun", "طبقة رسوبية", "Each sediment layer tells a story about Earth's past.", "تروي كل طبقة رسوبية قصة عن ماضي الأرض.", "core", "B2", "COCA"],
  ["salt concentration", "noun", "تركيز الملح", "Salt concentration varies across different ocean regions.", "يختلف تركيز الملح عبر مناطق المحيط المختلفة.", "core", "B2", "COCA"]
];

const unit3 = [
  ["crop rotation", "noun", "تناوب المحاصيل", "Crop rotation helps maintain soil fertility.", "يساعد تناوب المحاصيل في الحفاظ على خصوبة التربة.", "core", "B2", "COCA"],
  ["food production", "noun", "إنتاج الغذاء", "Global food production must double by 2050.", "يجب مضاعفة إنتاج الغذاء العالمي بحلول عام 2050.", "core", "B1", "AWL"],
  ["water scarcity", "noun", "شحّ المياه", "Water scarcity affects billions of people worldwide.", "يؤثر شحّ المياه على مليارات الناس حول العالم.", "core", "B2", "AWL"],
  ["soil degradation", "noun", "تدهور التربة", "Overfarming leads to severe soil degradation.", "تؤدي الزراعة المفرطة إلى تدهور شديد في التربة.", "extended", "C1", "AWL"],
  ["pest management", "noun", "إدارة الآفات", "Integrated pest management reduces the need for chemicals.", "تقلل الإدارة المتكاملة للآفات الحاجة إلى المواد الكيميائية.", "core", "B2", "COCA"],
  ["genetic engineering", "noun", "الهندسة الوراثية", "Genetic engineering can make crops resistant to drought.", "يمكن للهندسة الوراثية جعل المحاصيل مقاومة للجفاف.", "core", "B2", "AWL"],
  ["food preservation", "noun", "حفظ الأغذية", "Food preservation techniques have evolved over centuries.", "تطورت تقنيات حفظ الأغذية على مر القرون.", "core", "B2", "CEFR-J"],
  ["cold storage", "noun", "تخزين بارد", "Proper cold storage extends the shelf life of produce.", "يطيل التخزين البارد المناسب فترة صلاحية المنتجات.", "core", "B2", "COCA"],
  ["supply chain", "noun", "سلسلة الإمداد", "A disrupted supply chain leads to food shortages.", "تؤدي سلسلة الإمداد المعطلة إلى نقص الغذاء.", "core", "B2", "AWL"],
  ["food safety", "noun", "سلامة الغذاء", "Food safety standards protect consumers from contamination.", "تحمي معايير سلامة الغذاء المستهلكين من التلوث.", "core", "B1", "CEFR-J"],
  ["quality control", "noun", "مراقبة الجودة", "Strict quality control ensures products meet health standards.", "تضمن مراقبة الجودة الصارمة استيفاء المنتجات للمعايير الصحية.", "core", "B2", "AWL"],
  ["nutritional value", "noun", "قيمة غذائية", "Processing can reduce the nutritional value of food.", "يمكن أن تقلل المعالجة من القيمة الغذائية للغذاء.", "core", "B2", "CEFR-J"],
  ["dietary supplement", "noun", "مكمّل غذائي", "A dietary supplement cannot replace a balanced diet.", "لا يمكن للمكمّل الغذائي أن يحل محل النظام الغذائي المتوازن.", "core", "B2", "COCA"],
  ["food additive", "noun", "مُضاف غذائي", "Each food additive must be tested for safety.", "يجب اختبار كل مُضاف غذائي من حيث السلامة.", "extended", "B2", "COCA"],
  ["price volatility", "noun", "تقلب الأسعار", "Price volatility in grain markets affects farmers directly.", "يؤثر تقلب الأسعار في أسواق الحبوب على المزارعين مباشرة.", "extended", "C1", "AWL"],
  ["trade barrier", "noun", "حاجز تجاري", "Removing a trade barrier can lower food prices.", "يمكن أن تؤدي إزالة الحواجز التجارية إلى خفض أسعار الغذاء.", "core", "B2", "AWL"],
  ["food sovereignty", "noun", "السيادة الغذائية", "Food sovereignty means communities control their own food systems.", "تعني السيادة الغذائية أن المجتمعات تتحكم في أنظمتها الغذائية.", "mastery", "C1", "COCA"],
  ["urban farming", "noun", "الزراعة الحضرية", "Urban farming is growing in popularity in major cities.", "تزداد شعبية الزراعة الحضرية في المدن الكبرى.", "core", "B2", "COCA"],
  ["vertical agriculture", "noun", "الزراعة العمودية", "Vertical agriculture uses stacked layers to grow crops indoors.", "تستخدم الزراعة العمودية طبقات متراصة لزراعة المحاصيل داخلياً.", "extended", "C1", "COCA"],
  ["precision farming", "noun", "الزراعة الدقيقة", "Precision farming uses GPS technology to optimize crop yields.", "تستخدم الزراعة الدقيقة تقنية GPS لتحسين غلة المحاصيل.", "extended", "C1", "COCA"],
  ["food waste", "noun", "هدر الغذاء", "Reducing food waste is essential for sustainability.", "يعد تقليل هدر الغذاء أمراً ضرورياً للاستدامة.", "core", "B1", "CEFR-J"],
  ["harvest season", "noun", "موسم الحصاد", "The harvest season determines market supply levels.", "يحدد موسم الحصاد مستويات العرض في السوق.", "core", "B2", "CEFR-J"],
  ["arable land", "noun", "أرض صالحة للزراعة", "The amount of arable land is shrinking due to urbanization.", "تتقلص مساحة الأراضي الصالحة للزراعة بسبب التحضر.", "extended", "C1", "AWL"],
  ["subsistence farming", "noun", "زراعة الكفاف", "Subsistence farming barely feeds the farmer's family.", "تكاد زراعة الكفاف تكفي لإطعام عائلة المزارع.", "extended", "C1", "COCA"],
  ["drought resistance", "noun", "مقاومة الجفاف", "Scientists are developing crops with better drought resistance.", "يطور العلماء محاصيل ذات مقاومة أفضل للجفاف.", "core", "B2", "COCA"]
];

const unit4 = [
  ["natural selection", "noun", "الانتقاء الطبيعي", "Natural selection drives the evolution of species.", "يقود الانتقاء الطبيعي تطور الأنواع.", "core", "B2", "COCA"],
  ["surface tension", "noun", "التوتر السطحي", "Surface tension allows some insects to walk on water.", "يسمح التوتر السطحي لبعض الحشرات بالمشي على الماء.", "core", "B2", "COCA"],
  ["drag reduction", "noun", "تقليل المقاومة", "Shark skin inspired drag reduction in swimsuit design.", "ألهم جلد القرش تقليل المقاومة في تصميم ملابس السباحة.", "extended", "C1", "COCA"],
  ["structural integrity", "noun", "السلامة الهيكلية", "The building maintained its structural integrity during the earthquake.", "حافظ المبنى على سلامته الهيكلية أثناء الزلزال.", "core", "B2", "AWL"],
  ["load distribution", "noun", "توزيع الحمل", "Honeycomb structures are efficient at load distribution.", "الهياكل السداسية فعالة في توزيع الحمل.", "extended", "C1", "AWL"],
  ["energy conversion", "noun", "تحويل الطاقة", "Photosynthesis is nature's most efficient energy conversion process.", "التمثيل الضوئي هو أكثر عمليات تحويل الطاقة كفاءة في الطبيعة.", "core", "B2", "AWL"],
  ["waste management", "noun", "إدارة النفايات", "Biomimicry offers new solutions for waste management.", "يقدم المحاكاة الحيوية حلولاً جديدة لإدارة النفايات.", "core", "B2", "AWL"],
  ["self-assembly", "noun", "التجميع الذاتي", "Self-assembly in molecules mimics natural biological processes.", "يحاكي التجميع الذاتي في الجزيئات العمليات البيولوجية الطبيعية.", "mastery", "C1", "COCA"],
  ["pattern recognition", "noun", "التعرف على الأنماط", "Pattern recognition in AI was inspired by brain function.", "استُلهم التعرف على الأنماط في الذكاء الاصطناعي من وظائف الدماغ.", "core", "B2", "COCA"],
  ["material science", "noun", "علم المواد", "Material science draws heavily on biological structures.", "يستمد علم المواد كثيراً من الهياكل البيولوجية.", "core", "B2", "AWL"],
  ["reverse engineering", "noun", "الهندسة العكسية", "Reverse engineering of spider silk could create super-strong fibers.", "يمكن للهندسة العكسية لحرير العنكبوت إنشاء ألياف فائقة القوة.", "extended", "C1", "COCA"],
  ["proof of concept", "noun", "إثبات المفهوم", "The prototype served as a proof of concept for the design.", "كان النموذج الأولي بمثابة إثبات للمفهوم للتصميم.", "core", "B2", "AWL"],
  ["design thinking", "noun", "التفكير التصميمي", "Design thinking puts the user at the center of innovation.", "يضع التفكير التصميمي المستخدم في مركز الابتكار.", "core", "B2", "COCA"],
  ["rapid prototyping", "noun", "النمذجة السريعة", "Rapid prototyping speeds up the product development cycle.", "تسرّع النمذجة السريعة دورة تطوير المنتج.", "extended", "C1", "COCA"],
  ["stress analysis", "noun", "تحليل الإجهاد", "Stress analysis is crucial before building any bridge.", "تحليل الإجهاد أمر حاسم قبل بناء أي جسر.", "extended", "C1", "AWL"],
  ["wind resistance", "noun", "مقاومة الرياح", "The tower was designed to minimize wind resistance.", "صُمّم البرج لتقليل مقاومة الرياح.", "core", "B2", "COCA"],
  ["thermal regulation", "noun", "التنظيم الحراري", "Termite mounds inspired thermal regulation in buildings.", "ألهمت تلال النمل الأبيض التنظيم الحراري في المباني.", "extended", "C1", "COCA"],
  ["shock absorption", "noun", "امتصاص الصدمات", "Woodpecker skulls inspired better shock absorption in helmets.", "ألهمت جماجم نقار الخشب امتصاصاً أفضل للصدمات في الخوذات.", "core", "B2", "COCA"],
  ["noise reduction", "noun", "تقليل الضوضاء", "Owl wings inspired noise reduction in wind turbines.", "ألهمت أجنحة البوم تقليل الضوضاء في توربينات الرياح.", "core", "B2", "COCA"],
  ["water filtration", "noun", "تنقية المياه", "Mangrove roots inspired a new water filtration system.", "ألهمت جذور أشجار المنغروف نظاماً جديداً لتنقية المياه.", "core", "B2", "COCA"],
  ["adhesive property", "noun", "خاصية لاصقة", "Gecko feet have a unique adhesive property.", "لأقدام الوزغة خاصية لاصقة فريدة.", "extended", "C1", "COCA"],
  ["aerodynamic shape", "noun", "شكل انسيابي", "The kingfisher's beak has a perfect aerodynamic shape.", "يتميز منقار الرفراف بشكل انسيابي مثالي.", "core", "B2", "COCA"],
  ["bio-inspired design", "noun", "تصميم مستوحى من الطبيعة", "Bio-inspired design copies solutions found in nature.", "يستنسخ التصميم المستوحى من الطبيعة الحلول الموجودة فيها.", "extended", "C1", "COCA"],
  ["functional adaptation", "noun", "تكيّف وظيفي", "Each functional adaptation serves a survival purpose.", "يخدم كل تكيّف وظيفي غرضاً للبقاء.", "mastery", "C1", "AWL"],
  ["tensile strength", "noun", "قوة الشد", "Spider silk has remarkable tensile strength.", "يتمتع حرير العنكبوت بقوة شد مذهلة.", "extended", "C1", "COCA"]
];

const unit5 = [
  ["asylum seeker", "noun", "طالب لجوء", "An asylum seeker must prove a credible fear of persecution.", "يجب على طالب اللجوء إثبات خوف موثوق من الاضطهاد.", "core", "B2", "COCA"],
  ["refugee status", "noun", "صفة اللاجئ", "She was granted refugee status after fleeing the conflict.", "مُنحت صفة اللاجئ بعد فرارها من النزاع.", "core", "B2", "AWL"],
  ["work permit", "noun", "تصريح عمل", "Foreign workers need a valid work permit.", "يحتاج العمال الأجانب إلى تصريح عمل صالح.", "core", "B1", "CEFR-J"],
  ["border control", "noun", "مراقبة الحدود", "Border control was tightened after the security threat.", "شُدّدت مراقبة الحدود بعد التهديد الأمني.", "core", "B2", "COCA"],
  ["human trafficking", "noun", "الاتجار بالبشر", "Human trafficking is a grave violation of human rights.", "الاتجار بالبشر انتهاك جسيم لحقوق الإنسان.", "core", "B2", "COCA"],
  ["brain drain", "noun", "هجرة العقول", "Brain drain weakens developing countries' economies.", "تضعف هجرة العقول اقتصادات الدول النامية.", "core", "B2", "COCA"],
  ["cultural integration", "noun", "الاندماج الثقافي", "Cultural integration benefits both immigrants and host communities.", "يفيد الاندماج الثقافي كلاً من المهاجرين والمجتمعات المضيفة.", "core", "B2", "AWL"],
  ["social cohesion", "noun", "التماسك الاجتماعي", "Immigration policies should promote social cohesion.", "ينبغي لسياسات الهجرة تعزيز التماسك الاجتماعي.", "extended", "C1", "AWL"],
  ["identity crisis", "noun", "أزمة هوية", "Many second-generation immigrants face an identity crisis.", "يواجه العديد من مهاجري الجيل الثاني أزمة هوية.", "core", "B2", "COCA"],
  ["language barrier", "noun", "حاجز اللغة", "A language barrier can prevent access to essential services.", "يمكن لحاجز اللغة أن يمنع الوصول إلى الخدمات الأساسية.", "core", "B2", "CEFR-J"],
  ["entry visa", "noun", "تأشيرة دخول", "Applicants must obtain an entry visa before travel.", "يجب على المتقدمين الحصول على تأشيرة دخول قبل السفر.", "core", "B1", "CEFR-J"],
  ["residence permit", "noun", "تصريح إقامة", "A residence permit must be renewed annually.", "يجب تجديد تصريح الإقامة سنوياً.", "core", "B2", "CEFR-J"],
  ["citizenship test", "noun", "اختبار المواطنة", "The citizenship test covers history and government.", "يشمل اختبار المواطنة التاريخ والحكومة.", "core", "B2", "COCA"],
  ["family reunification", "noun", "لمّ شمل الأسرة", "Family reunification is a key immigration policy.", "لمّ شمل الأسرة سياسة هجرة رئيسية.", "extended", "C1", "AWL"],
  ["labor migration", "noun", "هجرة العمالة", "Labor migration fills gaps in the host country's workforce.", "تملأ هجرة العمالة الفجوات في القوى العاملة للبلد المضيف.", "core", "B2", "AWL"],
  ["forced displacement", "noun", "تهجير قسري", "War causes forced displacement of millions.", "تسبب الحرب تهجيراً قسرياً للملايين.", "extended", "C1", "COCA"],
  ["ethnic cleansing", "noun", "تطهير عرقي", "Ethnic cleansing is considered a crime against humanity.", "يُعتبر التطهير العرقي جريمة ضد الإنسانية.", "mastery", "C1", "COCA"],
  ["safe passage", "noun", "ممر آمن", "Refugees need safe passage to reach neighboring countries.", "يحتاج اللاجئون إلى ممر آمن للوصول إلى الدول المجاورة.", "core", "B2", "COCA"],
  ["human rights", "noun", "حقوق الإنسان", "Human rights must be protected regardless of nationality.", "يجب حماية حقوق الإنسان بغض النظر عن الجنسية.", "core", "B1", "CEFR-J"],
  ["civil liberties", "noun", "الحريات المدنية", "Civil liberties include freedom of speech and assembly.", "تشمل الحريات المدنية حرية التعبير والتجمع.", "extended", "C1", "AWL"],
  ["immigration policy", "noun", "سياسة الهجرة", "The government reformed its immigration policy.", "أصلحت الحكومة سياسة الهجرة الخاصة بها.", "core", "B2", "AWL"],
  ["detention center", "noun", "مركز احتجاز", "Conditions in the detention center were criticized by NGOs.", "انتقدت المنظمات غير الحكومية الظروف في مركز الاحتجاز.", "extended", "C1", "COCA"],
  ["host country", "noun", "بلد مضيف", "The host country provides temporary shelter for refugees.", "يوفر البلد المضيف مأوى مؤقتاً للاجئين.", "core", "B2", "AWL"],
  ["undocumented migrant", "noun", "مهاجر غير موثق", "An undocumented migrant faces the risk of deportation.", "يواجه المهاجر غير الموثق خطر الترحيل.", "extended", "C1", "COCA"],
  ["resettlement program", "noun", "برنامج إعادة التوطين", "The resettlement program helps refugees start new lives.", "يساعد برنامج إعادة التوطين اللاجئين على بدء حياة جديدة.", "extended", "C1", "COCA"]
];

const unit6 = [
  ["digital currency", "noun", "عملة رقمية", "Bitcoin is the most well-known digital currency.", "البيتكوين هي العملة الرقمية الأكثر شهرة.", "core", "B2", "COCA"],
  ["market capitalization", "noun", "القيمة السوقية", "Market capitalization measures the total value of a cryptocurrency.", "تقيس القيمة السوقية القيمة الإجمالية للعملة المشفرة.", "extended", "C1", "AWL"],
  ["trading volume", "noun", "حجم التداول", "High trading volume indicates strong market interest.", "يشير حجم التداول المرتفع إلى اهتمام قوي بالسوق.", "core", "B2", "COCA"],
  ["price volatility", "noun", "تقلب الأسعار", "Price volatility makes cryptocurrency a risky investment.", "يجعل تقلب الأسعار العملات المشفرة استثماراً محفوفاً بالمخاطر.", "core", "B2", "AWL"],
  ["exchange rate", "noun", "سعر الصرف", "The exchange rate between Bitcoin and the dollar fluctuates daily.", "يتقلب سعر الصرف بين البيتكوين والدولار يومياً.", "core", "B1", "CEFR-J"],
  ["smart contract", "noun", "عقد ذكي", "A smart contract executes automatically when conditions are met.", "يُنفّذ العقد الذكي تلقائياً عند استيفاء الشروط.", "core", "B2", "COCA"],
  ["distributed ledger", "noun", "سجل موزع", "Blockchain is a type of distributed ledger technology.", "البلوكتشين نوع من تقنية السجل الموزع.", "extended", "C1", "COCA"],
  ["consensus mechanism", "noun", "آلية الإجماع", "A consensus mechanism validates transactions on the network.", "تتحقق آلية الإجماع من صحة المعاملات على الشبكة.", "mastery", "C1", "COCA"],
  ["proof of work", "noun", "إثبات العمل", "Proof of work requires significant computational power.", "يتطلب إثبات العمل قدرة حسابية كبيرة.", "extended", "C1", "COCA"],
  ["proof of stake", "noun", "إثبات الحصة", "Proof of stake is more energy-efficient than proof of work.", "إثبات الحصة أكثر كفاءة في استخدام الطاقة من إثبات العمل.", "extended", "C1", "COCA"],
  ["initial coin offering", "noun", "طرح أولي للعملة", "The startup raised millions through an initial coin offering.", "جمعت الشركة الناشئة الملايين من خلال طرح أولي للعملة.", "mastery", "C1", "COCA"],
  ["decentralized finance", "noun", "التمويل اللامركزي", "Decentralized finance removes the need for traditional banks.", "يلغي التمويل اللامركزي الحاجة إلى البنوك التقليدية.", "extended", "C1", "COCA"],
  ["digital wallet", "noun", "محفظة رقمية", "You need a digital wallet to store cryptocurrency.", "تحتاج إلى محفظة رقمية لتخزين العملات المشفرة.", "core", "B2", "COCA"],
  ["private key", "noun", "مفتاح خاص", "Never share your private key with anyone.", "لا تشارك مفتاحك الخاص مع أي شخص أبداً.", "core", "B2", "COCA"],
  ["public address", "noun", "عنوان عام", "Share your public address to receive cryptocurrency payments.", "شارك عنوانك العام لتلقي مدفوعات العملات المشفرة.", "core", "B2", "COCA"],
  ["transaction fee", "noun", "رسوم المعاملة", "The transaction fee varies depending on network congestion.", "تختلف رسوم المعاملة حسب ازدحام الشبكة.", "core", "B2", "CEFR-J"],
  ["mining pool", "noun", "مجمع التعدين", "Miners join a mining pool to increase their chances of reward.", "ينضم المعدّنون إلى مجمع التعدين لزيادة فرصهم في الحصول على المكافأة.", "extended", "C1", "COCA"],
  ["block reward", "noun", "مكافأة الكتلة", "The block reward is halved approximately every four years.", "تُقسّم مكافأة الكتلة إلى النصف تقريباً كل أربع سنوات.", "mastery", "C1", "COCA"],
  ["market manipulation", "noun", "التلاعب بالسوق", "Market manipulation is illegal in regulated financial markets.", "التلاعب بالسوق غير قانوني في الأسواق المالية المنظمة.", "extended", "C1", "AWL"],
  ["regulatory compliance", "noun", "الامتثال التنظيمي", "Exchanges must maintain strict regulatory compliance.", "يجب على البورصات الحفاظ على امتثال تنظيمي صارم.", "extended", "C1", "AWL"],
  ["hash function", "noun", "دالة التجزئة", "A hash function converts data into a fixed-length code.", "تحوّل دالة التجزئة البيانات إلى رمز بطول ثابت.", "mastery", "C1", "COCA"],
  ["peer-to-peer network", "noun", "شبكة نظير إلى نظير", "Cryptocurrency operates on a peer-to-peer network.", "تعمل العملات المشفرة على شبكة نظير إلى نظير.", "core", "B2", "COCA"],
  ["token economy", "noun", "اقتصاد الرموز", "The token economy creates new models of digital ownership.", "يخلق اقتصاد الرموز نماذج جديدة للملكية الرقمية.", "extended", "C1", "COCA"],
  ["cold storage", "noun", "تخزين بارد (للعملات)", "Cold storage keeps cryptocurrency offline for maximum security.", "يحفظ التخزين البارد العملات المشفرة دون اتصال لأقصى حماية.", "core", "B2", "COCA"],
  ["market liquidity", "noun", "سيولة السوق", "High market liquidity makes it easier to buy and sell assets.", "تسهّل السيولة العالية في السوق شراء وبيع الأصول.", "extended", "C1", "AWL"]
];

const unit7 = [
  ["social influence", "noun", "التأثير الاجتماعي", "Social influence shapes individual behavior and beliefs.", "يشكّل التأثير الاجتماعي سلوك الفرد ومعتقداته.", "core", "B2", "AWL"],
  ["group dynamics", "noun", "ديناميكيات المجموعة", "Understanding group dynamics is essential for team management.", "فهم ديناميكيات المجموعة أمر ضروري لإدارة الفريق.", "core", "B2", "AWL"],
  ["peer pressure", "noun", "ضغط الأقران", "Teenagers are especially vulnerable to peer pressure.", "المراهقون معرضون بشكل خاص لضغط الأقران.", "core", "B2", "CEFR-J"],
  ["mob mentality", "noun", "عقلية القطيع", "Mob mentality can lead to irrational and violent behavior.", "يمكن أن تؤدي عقلية القطيع إلى سلوك غير عقلاني وعنيف.", "extended", "C1", "COCA"],
  ["mass hysteria", "noun", "هستيريا جماعية", "The false alarm triggered mass hysteria in the town.", "أثار الإنذار الكاذب هستيريا جماعية في البلدة.", "extended", "C1", "COCA"],
  ["public opinion", "noun", "الرأي العام", "Public opinion can influence government policies.", "يمكن للرأي العام أن يؤثر على السياسات الحكومية.", "core", "B1", "CEFR-J"],
  ["media manipulation", "noun", "التلاعب الإعلامي", "Media manipulation can distort people's understanding of events.", "يمكن للتلاعب الإعلامي تشويه فهم الناس للأحداث.", "core", "B2", "COCA"],
  ["echo chamber", "noun", "غرفة الصدى", "Social media creates an echo chamber of like-minded views.", "تخلق وسائل التواصل الاجتماعي غرفة صدى للآراء المتشابهة.", "extended", "C1", "COCA"],
  ["filter bubble", "noun", "فقاعة المرشّح", "A filter bubble limits exposure to diverse perspectives.", "تحدّ فقاعة المرشّح من التعرض لوجهات نظر متنوعة.", "extended", "C1", "COCA"],
  ["cognitive bias", "noun", "تحيز معرفي", "A cognitive bias affects how we process information.", "يؤثر التحيز المعرفي على كيفية معالجتنا للمعلومات.", "core", "B2", "AWL"],
  ["confirmation bias", "noun", "تحيز التأكيد", "Confirmation bias leads people to seek supporting evidence only.", "يدفع تحيز التأكيد الناس للبحث عن الأدلة الداعمة فقط.", "core", "B2", "AWL"],
  ["herd behavior", "noun", "سلوك القطيع", "Herd behavior in stock markets causes panic selling.", "يسبب سلوك القطيع في أسواق الأسهم بيعاً مذعوراً.", "extended", "C1", "COCA"],
  ["social conformity", "noun", "المسايرة الاجتماعية", "Social conformity pressures individuals to follow group norms.", "تضغط المسايرة الاجتماعية على الأفراد لاتباع أعراف المجموعة.", "core", "B2", "AWL"],
  ["crowd control", "noun", "السيطرة على الحشود", "Police used crowd control measures during the demonstration.", "استخدمت الشرطة إجراءات السيطرة على الحشود أثناء المظاهرة.", "core", "B2", "COCA"],
  ["civil disobedience", "noun", "العصيان المدني", "Civil disobedience is a nonviolent form of protest.", "العصيان المدني شكل سلمي من أشكال الاحتجاج.", "extended", "C1", "COCA"],
  ["peaceful protest", "noun", "احتجاج سلمي", "A peaceful protest is a fundamental democratic right.", "الاحتجاج السلمي حق ديمقراطي أساسي.", "core", "B2", "CEFR-J"],
  ["power dynamics", "noun", "ديناميكيات السلطة", "Power dynamics within organizations affect decision-making.", "تؤثر ديناميكيات السلطة داخل المنظمات على صنع القرار.", "extended", "C1", "AWL"],
  ["social hierarchy", "noun", "التسلسل الاجتماعي", "Every society has some form of social hierarchy.", "لدى كل مجتمع شكل من أشكال التسلسل الاجتماعي.", "core", "B2", "AWL"],
  ["cultural norm", "noun", "معيار ثقافي", "A cultural norm varies greatly between societies.", "يختلف المعيار الثقافي اختلافاً كبيراً بين المجتمعات.", "core", "B2", "AWL"],
  ["behavioral pattern", "noun", "نمط سلوكي", "Researchers observed a consistent behavioral pattern in the group.", "لاحظ الباحثون نمطاً سلوكياً ثابتاً في المجموعة.", "core", "B2", "COCA"],
  ["groupthink", "noun", "التفكير الجماعي", "Groupthink can lead to poor decision-making in organizations.", "يمكن أن يؤدي التفكير الجماعي إلى اتخاذ قرارات سيئة.", "extended", "C1", "COCA"],
  ["bystander effect", "noun", "تأثير المتفرج", "The bystander effect explains why crowds often fail to help.", "يفسر تأثير المتفرج لماذا تفشل الحشود في تقديم المساعدة.", "extended", "C1", "COCA"],
  ["deindividuation", "noun", "فقدان الهوية الفردية", "Deindividuation occurs when people lose self-awareness in crowds.", "يحدث فقدان الهوية الفردية عندما يفقد الناس الوعي الذاتي في الحشود.", "mastery", "C1", "COCA"],
  ["propaganda technique", "noun", "تقنية دعائية", "A propaganda technique appeals to emotions rather than logic.", "تستهدف التقنية الدعائية العواطف بدلاً من المنطق.", "core", "B2", "COCA"],
  ["collective behavior", "noun", "سلوك جماعي", "Collective behavior is studied extensively in sociology.", "يُدرس السلوك الجماعي على نطاق واسع في علم الاجتماع.", "core", "B2", "AWL"]
];

const unit8 = [
  ["crime scene investigation", "noun", "التحقيق في مسرح الجريمة", "Crime scene investigation requires meticulous attention to detail.", "يتطلب التحقيق في مسرح الجريمة اهتماماً دقيقاً بالتفاصيل.", "core", "B2", "COCA"],
  ["DNA evidence", "noun", "دليل الحمض النووي", "DNA evidence helped identify the suspect.", "ساعد دليل الحمض النووي في تحديد هوية المشتبه به.", "core", "B2", "COCA"],
  ["fingerprint analysis", "noun", "تحليل البصمات", "Fingerprint analysis remains a cornerstone of forensic science.", "يظل تحليل البصمات ركيزة أساسية في علم الطب الشرعي.", "core", "B2", "COCA"],
  ["blood spatter pattern", "noun", "نمط تناثر الدم", "The blood spatter pattern revealed the sequence of events.", "كشف نمط تناثر الدم عن تسلسل الأحداث.", "mastery", "C1", "COCA"],
  ["chain of custody", "noun", "سلسلة الحيازة", "A break in the chain of custody can invalidate evidence.", "يمكن أن يبطل انقطاع سلسلة الحيازة الدليل.", "extended", "C1", "AWL"],
  ["cause of death", "noun", "سبب الوفاة", "The coroner determined the cause of death as poisoning.", "حدد الطبيب الشرعي سبب الوفاة بأنه تسمم.", "core", "B2", "COCA"],
  ["manner of death", "noun", "طريقة الوفاة", "The manner of death was classified as homicide.", "صُنّفت طريقة الوفاة على أنها جريمة قتل.", "extended", "C1", "COCA"],
  ["time of death", "noun", "وقت الوفاة", "Forensic experts estimated the time of death.", "قدّر خبراء الطب الشرعي وقت الوفاة.", "core", "B2", "COCA"],
  ["autopsy report", "noun", "تقرير التشريح", "The autopsy report confirmed the presence of a toxin.", "أكد تقرير التشريح وجود مادة سامة.", "extended", "C1", "COCA"],
  ["ballistic analysis", "noun", "تحليل المقذوفات", "Ballistic analysis matched the bullet to the weapon.", "طابق تحليل المقذوفات الرصاصة بالسلاح.", "mastery", "C1", "COCA"],
  ["toxicology report", "noun", "تقرير السموم", "The toxicology report showed high levels of arsenic.", "أظهر تقرير السموم مستويات عالية من الزرنيخ.", "extended", "C1", "COCA"],
  ["expert witness", "noun", "شاهد خبير", "The expert witness testified about the forensic findings.", "أدلى الشاهد الخبير بشهادته حول النتائج الجنائية.", "core", "B2", "AWL"],
  ["criminal profiling", "noun", "تحليل الشخصية الجنائية", "Criminal profiling helps narrow down suspect lists.", "يساعد تحليل الشخصية الجنائية في تضييق قوائم المشتبه بهم.", "extended", "C1", "COCA"],
  ["digital forensics", "noun", "الطب الشرعي الرقمي", "Digital forensics recovered deleted files from the computer.", "استعاد الطب الشرعي الرقمي ملفات محذوفة من الحاسوب.", "extended", "C1", "COCA"],
  ["trace evidence", "noun", "دليل أثري", "Trace evidence such as fibers linked the suspect to the scene.", "ربط الدليل الأثري مثل الألياف المشتبه به بمسرح الجريمة.", "core", "B2", "COCA"],
  ["physical evidence", "noun", "دليل مادي", "Physical evidence is more reliable than witness accounts.", "الدليل المادي أكثر موثوقية من شهادات الشهود.", "core", "B2", "COCA"],
  ["circumstantial evidence", "noun", "دليل ظرفي", "The case relied heavily on circumstantial evidence.", "اعتمدت القضية بشكل كبير على الدليل الظرفي.", "extended", "C1", "AWL"],
  ["witness testimony", "noun", "شهادة الشهود", "Witness testimony can be unreliable due to memory distortion.", "يمكن أن تكون شهادة الشهود غير موثوقة بسبب تشويه الذاكرة.", "core", "B2", "COCA"],
  ["cross examination", "noun", "استجواب مضاد", "The lawyer challenged the alibi during cross examination.", "طعن المحامي في الحجة أثناء الاستجواب المضاد.", "extended", "C1", "COCA"],
  ["reasonable doubt", "noun", "شك معقول", "The jury must find guilt beyond reasonable doubt.", "يجب على هيئة المحلفين إثبات الإدانة بما لا يدع مجالاً لشك معقول.", "core", "B2", "AWL"],
  ["forensic pathologist", "noun", "أخصائي الطب الشرعي", "A forensic pathologist examines bodies to determine cause of death.", "يفحص أخصائي الطب الشرعي الجثث لتحديد سبب الوفاة.", "extended", "C1", "COCA"],
  ["crime lab", "noun", "مختبر الجريمة", "Evidence is sent to the crime lab for analysis.", "يُرسل الدليل إلى مختبر الجريمة للتحليل.", "core", "B2", "COCA"],
  ["latent fingerprint", "noun", "بصمة كامنة", "A latent fingerprint was found on the doorknob.", "عُثر على بصمة كامنة على مقبض الباب.", "mastery", "C1", "COCA"],
  ["modus operandi", "noun", "أسلوب العمل الإجرامي", "The detective recognized the criminal's modus operandi.", "تعرّف المحقق على أسلوب العمل الإجرامي.", "mastery", "C1", "COCA"],
  ["forensic evidence", "noun", "دليل جنائي", "Forensic evidence proved the defendant's innocence.", "أثبت الدليل الجنائي براءة المتهم.", "core", "B2", "COCA"]
];

const unit9 = [
  ["archaeological site", "noun", "موقع أثري", "The archaeological site dates back 5,000 years.", "يعود الموقع الأثري إلى 5000 عام.", "core", "B2", "AWL"],
  ["carbon dating", "noun", "التأريخ بالكربون", "Carbon dating determined the age of the ancient remains.", "حدّد التأريخ بالكربون عمر البقايا القديمة.", "core", "B2", "COCA"],
  ["cultural heritage", "noun", "التراث الثقافي", "Protecting cultural heritage is a global responsibility.", "حماية التراث الثقافي مسؤولية عالمية.", "core", "B2", "AWL"],
  ["burial ground", "noun", "مقبرة أثرية", "The burial ground contained artifacts from the Bronze Age.", "احتوت المقبرة الأثرية على قطع أثرية من العصر البرونزي.", "core", "B2", "COCA"],
  ["ancient civilization", "noun", "حضارة قديمة", "The Mesopotamian ancient civilization invented writing.", "اخترعت الحضارة القديمة في بلاد الرافدين الكتابة.", "core", "B1", "CEFR-J"],
  ["stone tool", "noun", "أداة حجرية", "The stone tool was used for hunting and cutting.", "استُخدمت الأداة الحجرية للصيد والقطع.", "core", "B2", "COCA"],
  ["cave painting", "noun", "رسم كهفي", "A cave painting discovered in France depicts wild animals.", "يصور رسم كهفي اكتُشف في فرنسا حيوانات برية.", "core", "B2", "CEFR-J"],
  ["clay tablet", "noun", "لوح طيني", "Ancient Sumerians recorded transactions on a clay tablet.", "سجّل السومريون القدماء المعاملات على ألواح طينية.", "extended", "C1", "COCA"],
  ["bronze artifact", "noun", "قطعة أثرية برونزية", "A bronze artifact reveals advanced metalworking techniques.", "تكشف القطعة الأثرية البرونزية عن تقنيات متقدمة لتشكيل المعادن.", "extended", "C1", "COCA"],
  ["iron smelting", "noun", "صهر الحديد", "Iron smelting marked a major technological advancement.", "شكّل صهر الحديد تقدماً تكنولوجياً كبيراً.", "extended", "C1", "COCA"],
  ["trade network", "noun", "شبكة تجارية", "The Silk Road was an extensive trade network.", "كان طريق الحرير شبكة تجارية واسعة.", "core", "B2", "AWL"],
  ["ritual practice", "noun", "ممارسة طقسية", "A ritual practice provides insights into ancient beliefs.", "توفر الممارسات الطقسية رؤى حول المعتقدات القديمة.", "extended", "C1", "COCA"],
  ["monumental architecture", "noun", "عمارة ضخمة", "The pyramids are examples of monumental architecture.", "الأهرامات أمثلة على العمارة الضخمة.", "extended", "C1", "COCA"],
  ["urban planning", "noun", "تخطيط عمراني", "Ancient Rome demonstrated sophisticated urban planning.", "أظهرت روما القديمة تخطيطاً عمرانياً متطوراً.", "core", "B2", "AWL"],
  ["written record", "noun", "سجل مكتوب", "The earliest written record comes from Mesopotamia.", "يأتي أقدم سجل مكتوب من بلاد الرافدين.", "core", "B2", "CEFR-J"],
  ["oral tradition", "noun", "تقليد شفهي", "Stories were passed down through oral tradition.", "نُقلت القصص عبر التقليد الشفهي.", "core", "B2", "COCA"],
  ["material culture", "noun", "ثقافة مادية", "Material culture includes tools, pottery, and clothing.", "تشمل الثقافة المادية الأدوات والفخار والملابس.", "extended", "C1", "AWL"],
  ["archaeological survey", "noun", "مسح أثري", "An archaeological survey maps potential excavation sites.", "يرسم المسح الأثري خرائط لمواقع التنقيب المحتملة.", "extended", "C1", "AWL"],
  ["field excavation", "noun", "تنقيب ميداني", "The field excavation lasted several months.", "استمر التنقيب الميداني عدة أشهر.", "core", "B2", "COCA"],
  ["pottery fragment", "noun", "شظية فخارية", "A pottery fragment can reveal dietary habits of ancient people.", "يمكن لشظية فخارية الكشف عن العادات الغذائية للقدماء.", "core", "B2", "COCA"],
  ["settlement pattern", "noun", "نمط الاستيطان", "The settlement pattern suggests a farming community.", "يشير نمط الاستيطان إلى مجتمع زراعي.", "extended", "C1", "AWL"],
  ["artifact preservation", "noun", "حفظ القطع الأثرية", "Artifact preservation requires controlled temperature and humidity.", "يتطلب حفظ القطع الأثرية درجة حرارة ورطوبة مضبوطة.", "extended", "C1", "COCA"],
  ["stratigraphy", "noun", "علم الطبقات", "Stratigraphy helps determine the relative age of findings.", "يساعد علم الطبقات في تحديد العمر النسبي للمكتشفات.", "mastery", "C1", "COCA"],
  ["excavation trench", "noun", "خندق تنقيب", "The team dug an excavation trench to reach deeper layers.", "حفر الفريق خندق تنقيب للوصول إلى طبقات أعمق.", "core", "B2", "COCA"],
  ["hieroglyphic inscription", "noun", "نقش هيروغليفي", "A hieroglyphic inscription was found on the temple wall.", "عُثر على نقش هيروغليفي على جدار المعبد.", "mastery", "C1", "COCA"]
];

const unit10 = [
  ["life expectancy", "noun", "متوسط العمر المتوقع", "Life expectancy has increased significantly over the past century.", "ارتفع متوسط العمر المتوقع بشكل ملحوظ خلال القرن الماضي.", "core", "B2", "COCA"],
  ["aging process", "noun", "عملية الشيخوخة", "The aging process affects every organ in the body.", "تؤثر عملية الشيخوخة على كل عضو في الجسم.", "core", "B2", "COCA"],
  ["caloric restriction", "noun", "تقييد السعرات الحرارية", "Caloric restriction has been shown to extend lifespan in mice.", "ثبت أن تقييد السعرات الحرارية يطيل العمر في الفئران.", "extended", "C1", "COCA"],
  ["oxidative stress", "noun", "الإجهاد التأكسدي", "Oxidative stress damages cells and accelerates aging.", "يتلف الإجهاد التأكسدي الخلايا ويسرّع الشيخوخة.", "extended", "C1", "COCA"],
  ["cellular repair", "noun", "إصلاح خلوي", "Sleep is essential for cellular repair and regeneration.", "النوم ضروري للإصلاح الخلوي والتجدد.", "extended", "C1", "COCA"],
  ["immune function", "noun", "وظيفة مناعية", "Immune function declines naturally with age.", "تتراجع الوظيفة المناعية بشكل طبيعي مع التقدم في العمر.", "core", "B2", "COCA"],
  ["cognitive decline", "noun", "تراجع معرفي", "Regular exercise can slow cognitive decline in older adults.", "يمكن للتمارين المنتظمة إبطاء التراجع المعرفي لدى كبار السن.", "core", "B2", "AWL"],
  ["muscle atrophy", "noun", "ضمور العضلات", "Muscle atrophy occurs when muscles are not regularly used.", "يحدث ضمور العضلات عندما لا تُستخدم العضلات بانتظام.", "extended", "C1", "COCA"],
  ["bone density", "noun", "كثافة العظام", "Weight-bearing exercise increases bone density.", "تزيد التمارين الحاملة للوزن من كثافة العظام.", "core", "B2", "COCA"],
  ["blood pressure", "noun", "ضغط الدم", "High blood pressure is a risk factor for heart disease.", "ارتفاع ضغط الدم عامل خطر للإصابة بأمراض القلب.", "core", "B1", "CEFR-J"],
  ["heart disease", "noun", "مرض القلب", "Heart disease is the leading cause of death globally.", "مرض القلب هو السبب الرئيسي للوفاة عالمياً.", "core", "B1", "CEFR-J"],
  ["metabolic syndrome", "noun", "متلازمة الأيض", "Metabolic syndrome increases the risk of stroke and diabetes.", "تزيد متلازمة الأيض من خطر السكتة الدماغية والسكري.", "extended", "C1", "COCA"],
  ["hormone replacement", "noun", "العلاج الهرموني البديل", "Hormone replacement therapy helps manage menopause symptoms.", "يساعد العلاج الهرموني البديل في إدارة أعراض سن اليأس.", "extended", "C1", "COCA"],
  ["stem cell therapy", "noun", "العلاج بالخلايا الجذعية", "Stem cell therapy shows promise for joint regeneration.", "يبشر العلاج بالخلايا الجذعية بتجديد المفاصل.", "extended", "C1", "COCA"],
  ["regenerative medicine", "noun", "الطب التجديدي", "Regenerative medicine aims to replace damaged tissues.", "يهدف الطب التجديدي إلى استبدال الأنسجة التالفة.", "mastery", "C1", "COCA"],
  ["personalized medicine", "noun", "الطب الشخصي", "Personalized medicine tailors treatment to individual genetics.", "يكيّف الطب الشخصي العلاج وفقاً للجينات الفردية.", "extended", "C1", "COCA"],
  ["preventive care", "noun", "الرعاية الوقائية", "Preventive care reduces the need for expensive treatments.", "تقلل الرعاية الوقائية الحاجة إلى علاجات باهظة التكلفة.", "core", "B2", "COCA"],
  ["mental wellness", "noun", "الصحة النفسية", "Mental wellness is equally important as physical health.", "الصحة النفسية لا تقل أهمية عن الصحة الجسدية.", "core", "B2", "CEFR-J"],
  ["physical fitness", "noun", "اللياقة البدنية", "Physical fitness contributes to a longer, healthier life.", "تساهم اللياقة البدنية في حياة أطول وأكثر صحة.", "core", "B1", "CEFR-J"],
  ["telomere length", "noun", "طول التيلومير", "Shorter telomere length is associated with aging.", "يرتبط قصر طول التيلومير بالشيخوخة.", "mastery", "C1", "COCA"],
  ["chronic inflammation", "noun", "التهاب مزمن", "Chronic inflammation is linked to many age-related diseases.", "يرتبط الالتهاب المزمن بالعديد من الأمراض المرتبطة بالعمر.", "extended", "C1", "COCA"],
  ["antioxidant intake", "noun", "تناول مضادات الأكسدة", "Increasing antioxidant intake may slow cellular damage.", "قد تبطئ زيادة تناول مضادات الأكسدة الضرر الخلوي.", "core", "B2", "COCA"],
  ["quality of life", "noun", "جودة الحياة", "Medical advances have improved quality of life for the elderly.", "حسّنت التطورات الطبية جودة الحياة لكبار السن.", "core", "B2", "AWL"],
  ["healthy aging", "noun", "الشيخوخة الصحية", "Healthy aging requires a balanced diet and regular exercise.", "تتطلب الشيخوخة الصحية نظاماً غذائياً متوازناً وتمارين منتظمة.", "core", "B2", "COCA"],
  ["biomarker analysis", "noun", "تحليل المؤشرات الحيوية", "Biomarker analysis helps predict disease risk.", "يساعد تحليل المؤشرات الحيوية في التنبؤ بخطر الإصابة بالأمراض.", "mastery", "C1", "COCA"]
];

const unit11 = [
  ["energy efficiency", "noun", "كفاءة الطاقة", "Energy efficiency reduces a building's carbon footprint.", "تقلل كفاءة الطاقة من البصمة الكربونية للمبنى.", "core", "B2", "AWL"],
  ["carbon footprint", "noun", "البصمة الكربونية", "Every construction project has a carbon footprint.", "لكل مشروع بناء بصمة كربونية.", "core", "B2", "COCA"],
  ["building material", "noun", "مواد البناء", "Sustainable building material is in high demand.", "تحظى مواد البناء المستدامة بطلب كبير.", "core", "B1", "CEFR-J"],
  ["renewable energy", "noun", "طاقة متجددة", "Renewable energy powers an increasing number of buildings.", "تزود الطاقة المتجددة عدداً متزايداً من المباني بالطاقة.", "core", "B2", "AWL"],
  ["solar power", "noun", "الطاقة الشمسية", "Solar power is the fastest-growing energy source.", "الطاقة الشمسية هي مصدر الطاقة الأسرع نمواً.", "core", "B1", "CEFR-J"],
  ["wind energy", "noun", "طاقة الرياح", "Wind energy is widely used in northern Europe.", "تُستخدم طاقة الرياح على نطاق واسع في شمال أوروبا.", "core", "B2", "CEFR-J"],
  ["rainwater harvesting", "noun", "تجميع مياه الأمطار", "Rainwater harvesting reduces dependence on municipal water.", "يقلل تجميع مياه الأمطار الاعتماد على المياه البلدية.", "extended", "C1", "COCA"],
  ["waste reduction", "noun", "تقليل النفايات", "Waste reduction is a core principle of green architecture.", "تقليل النفايات مبدأ أساسي في العمارة الخضراء.", "core", "B2", "AWL"],
  ["green building", "noun", "مبنى أخضر", "A green building uses resources more efficiently.", "يستخدم المبنى الأخضر الموارد بكفاءة أكبر.", "core", "B2", "COCA"],
  ["passive cooling", "noun", "تبريد سلبي", "Passive cooling uses natural airflow instead of air conditioning.", "يستخدم التبريد السلبي تدفق الهواء الطبيعي بدلاً من التكييف.", "extended", "C1", "COCA"],
  ["natural ventilation", "noun", "تهوية طبيعية", "Natural ventilation improves indoor air quality.", "تحسّن التهوية الطبيعية جودة الهواء الداخلي.", "core", "B2", "COCA"],
  ["thermal insulation", "noun", "عزل حراري", "Thermal insulation keeps buildings warm in winter and cool in summer.", "يحافظ العزل الحراري على دفء المباني شتاءً وبرودتها صيفاً.", "core", "B2", "COCA"],
  ["double glazing", "noun", "زجاج مزدوج", "Double glazing significantly reduces heat loss.", "يقلل الزجاج المزدوج فقدان الحرارة بشكل كبير.", "core", "B2", "CEFR-J"],
  ["building code", "noun", "كود البناء", "The building code sets minimum energy standards.", "يحدد كود البناء الحد الأدنى لمعايير الطاقة.", "core", "B2", "COCA"],
  ["environmental impact", "noun", "الأثر البيئي", "Architects must assess the environmental impact of their designs.", "يجب على المهندسين المعماريين تقييم الأثر البيئي لتصاميمهم.", "core", "B2", "AWL"],
  ["lifecycle assessment", "noun", "تقييم دورة الحياة", "A lifecycle assessment measures environmental cost from cradle to grave.", "يقيس تقييم دورة الحياة التكلفة البيئية من المهد إلى اللحد.", "extended", "C1", "AWL"],
  ["net zero", "noun", "صافي صفر", "The goal is to achieve net zero emissions by 2050.", "الهدف هو تحقيق صافي صفر انبعاثات بحلول عام 2050.", "core", "B2", "COCA"],
  ["smart building", "noun", "مبنى ذكي", "A smart building uses sensors to optimize energy use.", "يستخدم المبنى الذكي أجهزة استشعار لتحسين استهلاك الطاقة.", "core", "B2", "COCA"],
  ["mixed-use development", "noun", "تطوير متعدد الاستخدامات", "Mixed-use development combines housing, shops, and offices.", "يجمع التطوير متعدد الاستخدامات بين السكن والمتاجر والمكاتب.", "extended", "C1", "COCA"],
  ["green roof", "noun", "سقف أخضر", "A green roof reduces urban heat and manages stormwater.", "يقلل السقف الأخضر حرارة المدن ويدير مياه الأمطار.", "core", "B2", "COCA"],
  ["embodied carbon", "noun", "الكربون المتجسد", "Embodied carbon accounts for emissions during manufacturing.", "يمثل الكربون المتجسد الانبعاثات أثناء التصنيع.", "mastery", "C1", "COCA"],
  ["greywater recycling", "noun", "إعادة تدوير المياه الرمادية", "Greywater recycling reuses water from sinks and showers.", "تعيد إعادة تدوير المياه الرمادية استخدام مياه الأحواض والاستحمام.", "extended", "C1", "COCA"],
  ["cross-laminated timber", "noun", "خشب متقاطع الطبقات", "Cross-laminated timber is a sustainable alternative to concrete.", "الخشب متقاطع الطبقات بديل مستدام للخرسانة.", "mastery", "C1", "COCA"],
  ["building envelope", "noun", "غلاف المبنى", "The building envelope separates interior from exterior environments.", "يفصل غلاف المبنى البيئة الداخلية عن الخارجية.", "extended", "C1", "AWL"],
  ["daylighting design", "noun", "تصميم الإضاءة الطبيعية", "Daylighting design maximizes the use of natural light.", "يزيد تصميم الإضاءة الطبيعية من استخدام الضوء الطبيعي.", "extended", "C1", "COCA"]
];

const unit12 = [
  ["solar system", "noun", "النظام الشمسي", "Our solar system has eight recognized planets.", "يضم نظامنا الشمسي ثمانية كواكب معترف بها.", "core", "B1", "CEFR-J"],
  ["space exploration", "noun", "استكشاف الفضاء", "Space exploration has expanded our understanding of the universe.", "وسّع استكشاف الفضاء فهمنا للكون.", "core", "B2", "COCA"],
  ["space station", "noun", "محطة فضائية", "The International Space Station orbits Earth every 90 minutes.", "تدور محطة الفضاء الدولية حول الأرض كل 90 دقيقة.", "core", "B1", "CEFR-J"],
  ["rocket launch", "noun", "إطلاق صاروخ", "The rocket launch was delayed due to bad weather.", "تأخر إطلاق الصاروخ بسبب سوء الطقس.", "core", "B2", "CEFR-J"],
  ["escape velocity", "noun", "سرعة الإفلات", "Escape velocity is the speed needed to leave Earth's gravity.", "سرعة الإفلات هي السرعة اللازمة لمغادرة جاذبية الأرض.", "extended", "C1", "COCA"],
  ["orbital mechanics", "noun", "ميكانيكا المدارات", "Orbital mechanics determines satellite trajectories.", "تحدد ميكانيكا المدارات مسارات الأقمار الصناعية.", "mastery", "C1", "COCA"],
  ["gravitational pull", "noun", "قوة الجاذبية", "The moon's gravitational pull causes ocean tides.", "تسبب قوة جاذبية القمر المد والجزر في المحيطات.", "core", "B2", "COCA"],
  ["light spectrum", "noun", "طيف الضوء", "Analyzing the light spectrum reveals a star's composition.", "يكشف تحليل طيف الضوء عن تركيبة النجم.", "core", "B2", "COCA"],
  ["electromagnetic radiation", "noun", "إشعاع كهرومغناطيسي", "Stars emit electromagnetic radiation across many wavelengths.", "تبعث النجوم إشعاعاً كهرومغناطيسياً عبر أطوال موجية عديدة.", "extended", "C1", "COCA"],
  ["radio telescope", "noun", "تلسكوب راديوي", "A radio telescope detects signals from distant galaxies.", "يكتشف التلسكوب الراديوي إشارات من مجرات بعيدة.", "core", "B2", "COCA"],
  ["space telescope", "noun", "تلسكوب فضائي", "The James Webb Space Telescope captures images of distant stars.", "يلتقط تلسكوب جيمس ويب الفضائي صوراً لنجوم بعيدة.", "core", "B2", "COCA"],
  ["habitable zone", "noun", "منطقة صالحة للسكن", "The habitable zone is where liquid water can exist.", "المنطقة الصالحة للسكن هي حيث يمكن أن يتواجد الماء السائل.", "core", "B2", "COCA"],
  ["atmospheric composition", "noun", "تركيبة الغلاف الجوي", "Atmospheric composition determines if a planet can support life.", "تحدد تركيبة الغلاف الجوي ما إذا كان الكوكب يدعم الحياة.", "extended", "C1", "AWL"],
  ["surface temperature", "noun", "درجة حرارة السطح", "Surface temperature on Venus exceeds 450 degrees Celsius.", "تتجاوز درجة حرارة السطح على كوكب الزهرة 450 درجة مئوية.", "core", "B2", "COCA"],
  ["magnetic field", "noun", "حقل مغناطيسي", "Earth's magnetic field protects us from solar radiation.", "يحمينا الحقل المغناطيسي للأرض من الإشعاع الشمسي.", "core", "B2", "COCA"],
  ["cosmic radiation", "noun", "إشعاع كوني", "Cosmic radiation poses a risk to astronauts in deep space.", "يشكل الإشعاع الكوني خطراً على رواد الفضاء.", "extended", "C1", "COCA"],
  ["dark matter", "noun", "المادة المظلمة", "Dark matter makes up about 27% of the universe.", "تشكل المادة المظلمة حوالي 27% من الكون.", "extended", "C1", "COCA"],
  ["black hole", "noun", "ثقب أسود", "A black hole has gravity so strong that light cannot escape.", "للثقب الأسود جاذبية قوية لدرجة أن الضوء لا يستطيع الإفلات.", "core", "B2", "COCA"],
  ["neutron star", "noun", "نجم نيوتروني", "A neutron star is incredibly dense and compact.", "النجم النيوتروني كثيف ومضغوط بشكل لا يصدق.", "extended", "C1", "COCA"],
  ["planetary system", "noun", "نظام كوكبي", "Astronomers have discovered thousands of planetary systems.", "اكتشف الفلكيون آلاف الأنظمة الكوكبية.", "core", "B2", "COCA"],
  ["exoplanet discovery", "noun", "اكتشاف الكواكب الخارجية", "Exoplanet discovery has accelerated in the past decade.", "تسارع اكتشاف الكواكب الخارجية في العقد الماضي.", "extended", "C1", "COCA"],
  ["transit method", "noun", "طريقة العبور", "The transit method detects planets by measuring starlight dips.", "تكتشف طريقة العبور الكواكب بقياس انخفاضات ضوء النجم.", "mastery", "C1", "COCA"],
  ["red dwarf star", "noun", "نجم قزم أحمر", "A red dwarf star is the most common type in our galaxy.", "النجم القزم الأحمر هو النوع الأكثر شيوعاً في مجرتنا.", "extended", "C1", "COCA"],
  ["spectral analysis", "noun", "تحليل طيفي", "Spectral analysis identifies chemical elements in stars.", "يحدد التحليل الطيفي العناصر الكيميائية في النجوم.", "mastery", "C1", "COCA"],
  ["tidal locking", "noun", "القفل المدّي", "Tidal locking means one side always faces the host star.", "يعني القفل المدّي أن جانباً واحداً يواجه النجم المضيف دائماً.", "mastery", "C1", "COCA"]
];

const BATCH_ID = 24;

async function main() {
  const client = await pool.connect();
  try {
    const units = [
      { num: 1, words: unit1, name: "Bioethics" },
      { num: 2, words: unit2, name: "Deep Ocean" },
      { num: 3, words: unit3, name: "Food Security" },
      { num: 4, words: unit4, name: "Biomimicry" },
      { num: 5, words: unit5, name: "Migration" },
      { num: 6, words: unit6, name: "Cryptocurrency" },
      { num: 7, words: unit7, name: "Crowd Psychology" },
      { num: 8, words: unit8, name: "Forensic Science" },
      { num: 9, words: unit9, name: "Archaeology" },
      { num: 10, words: unit10, name: "Longevity" },
      { num: 11, words: unit11, name: "Sustainable Architecture" },
      { num: 12, words: unit12, name: "Exoplanets" },
    ];

    let total = 0;
    for (const u of units) {
      const count = await insertBatch(client, u.words, u.num, BATCH_ID);
      console.log(`Unit ${u.num} (${u.name}): ${count} words inserted`);
      total += count;
    }
    console.log(`\nTotal inserted: ${total}`);

    // Query final totals per unit
    console.log("\n--- Final totals per unit (batch 24) ---");
    const res = await client.query(
      `SELECT recommended_unit, COUNT(*) as count FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [BATCH_ID]
    );
    let grandTotal = 0;
    for (const row of res.rows) {
      console.log(`Unit ${row.recommended_unit}: ${row.count} words`);
      grandTotal += parseInt(row.count);
    }
    console.log(`Grand total (batch 24): ${grandTotal}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
