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

// Unit 1: Bioethics — Derived Forms
const unit1 = [
  ["modification", "noun", "تعديل", "Genetic modification raises ethical concerns.", "يثير التعديل الجيني مخاوف أخلاقية.", "core", "B2", "AWL"],
  ["reproduction", "noun", "تكاثر", "Human reproduction involves complex biological processes.", "يتضمن التكاثر البشري عمليات بيولوجية معقدة.", "core", "B2", "AWL"],
  ["immunization", "noun", "تحصين", "Immunization programs have saved millions of lives.", "أنقذت برامج التحصين ملايين الأرواح.", "extended", "B2", "NAWL"],
  ["sterilization", "noun", "تعقيم", "Sterilization of equipment is essential in hospitals.", "تعقيم المعدات ضروري في المستشفيات.", "extended", "C1", "NAWL"],
  ["contamination", "noun", "تلوث", "Contamination of samples can ruin experiments.", "يمكن أن يفسد تلوث العينات التجارب.", "core", "B2", "AWL"],
  ["purification", "noun", "تنقية", "Water purification is vital for public health.", "تنقية المياه ضرورية للصحة العامة.", "extended", "B2", "NAWL"],
  ["classification", "noun", "تصنيف", "The classification of organisms follows strict criteria.", "يتبع تصنيف الكائنات الحية معايير صارمة.", "core", "B2", "AWL"],
  ["specialization", "noun", "تخصص", "Medical specialization requires years of training.", "يتطلب التخصص الطبي سنوات من التدريب.", "core", "B2", "AWL"],
  ["hospitalization", "noun", "دخول المستشفى", "Hospitalization may be necessary for severe cases.", "قد يكون دخول المستشفى ضروريًا للحالات الشديدة.", "extended", "B2", "NAWL"],
  ["rehabilitation", "noun", "إعادة تأهيل", "Rehabilitation programs help patients recover fully.", "تساعد برامج إعادة التأهيل المرضى على التعافي الكامل.", "core", "B2", "AWL"],
  ["authorization", "noun", "تفويض", "Authorization from the ethics board is required.", "يُشترط الحصول على تفويض من لجنة الأخلاقيات.", "core", "B2", "AWL"],
  ["experimentation", "noun", "تجريب", "Animal experimentation remains a controversial topic.", "لا يزال التجريب على الحيوانات موضوعًا مثيرًا للجدل.", "extended", "C1", "AWL"],
  ["documentation", "noun", "توثيق", "Proper documentation of results is essential.", "التوثيق السليم للنتائج أمر ضروري.", "core", "B2", "AWL"],
  ["certification", "noun", "شهادة", "Certification ensures professionals meet standards.", "تضمن الشهادة استيفاء المهنيين للمعايير.", "core", "B2", "NAWL"],
  ["standardization", "noun", "توحيد المعايير", "Standardization of procedures improves safety.", "يحسّن توحيد المعايير مستوى السلامة.", "extended", "C1", "AWL"],
  ["visualization", "noun", "تصوّر مرئي", "Data visualization helps communicate findings.", "يساعد التصوّر المرئي في إيصال النتائج.", "extended", "B2", "NAWL"],
  ["fertilization", "noun", "تخصيب", "In vitro fertilization has helped many families.", "ساعد التخصيب في المختبر العديد من العائلات.", "extended", "C1", "NAWL"],
  ["preservation", "noun", "حفظ", "Preservation of tissue samples requires cold storage.", "يتطلب حفظ عينات الأنسجة تخزينًا باردًا.", "core", "B2", "AWL"],
  ["observation", "noun", "ملاحظة", "Careful observation is the basis of scientific inquiry.", "الملاحظة الدقيقة هي أساس البحث العلمي.", "core", "B1", "AWL"],
  ["recommendation", "noun", "توصية", "The doctor's recommendation was to rest.", "كانت توصية الطبيب هي الراحة.", "core", "B2", "AWL"],
  ["examination", "noun", "فحص", "A thorough examination revealed the diagnosis.", "كشف الفحص الشامل عن التشخيص.", "core", "B2", "AWL"],
  ["demonstration", "noun", "عرض توضيحي", "The demonstration showed how the device works.", "أوضح العرض التوضيحي كيفية عمل الجهاز.", "core", "B2", "AWL"],
  ["interpretation", "noun", "تفسير", "Interpretation of results varies among researchers.", "يتفاوت تفسير النتائج بين الباحثين.", "core", "B2", "AWL"],
  ["administration", "noun", "إدارة", "The administration of the drug requires medical supervision.", "تتطلب إدارة الدواء إشرافًا طبيًا.", "core", "B2", "AWL"],
  ["colonization", "noun", "استعمار", "Bacterial colonization can lead to infection.", "يمكن أن يؤدي الاستعمار البكتيري إلى العدوى.", "extended", "C1", "NAWL"],
];

// Unit 2: Deep Ocean — Derived Forms
const unit2 = [
  ["exploration", "noun", "استكشاف", "Deep ocean exploration requires advanced technology.", "يتطلب استكشاف أعماق المحيطات تقنية متقدمة.", "core", "B2", "AWL"],
  ["conservation", "noun", "حفظ البيئة", "Marine conservation protects endangered species.", "يحمي الحفاظ على البيئة البحرية الأنواع المهددة.", "core", "B2", "AWL"],
  ["degradation", "noun", "تدهور", "Environmental degradation threatens ocean ecosystems.", "يهدد التدهور البيئي النظم البيئية للمحيطات.", "core", "B2", "AWL"],
  ["accumulation", "noun", "تراكم", "The accumulation of plastic waste harms marine life.", "يضر تراكم النفايات البلاستيكية بالحياة البحرية.", "extended", "B2", "AWL"],
  ["circulation", "noun", "دوران", "Ocean circulation distributes heat around the globe.", "يوزع الدوران المحيطي الحرارة حول العالم.", "core", "B2", "NAWL"],
  ["evaporation", "noun", "تبخر", "Evaporation is a key part of the water cycle.", "التبخر جزء أساسي من دورة الماء.", "core", "B2", "NAWL"],
  ["condensation", "noun", "تكاثف", "Condensation forms clouds above the ocean.", "يشكل التكاثف السحب فوق المحيط.", "extended", "B2", "NAWL"],
  ["precipitation", "noun", "هطول", "Precipitation patterns affect ocean salinity.", "تؤثر أنماط الهطول على ملوحة المحيط.", "extended", "C1", "NAWL"],
  ["formation", "noun", "تشكّل", "The formation of coral reefs takes centuries.", "يستغرق تشكّل الشعاب المرجانية قرونًا.", "core", "B2", "AWL"],
  ["transformation", "noun", "تحوّل", "The transformation of the seabed surprised scientists.", "فاجأ تحوّل قاع البحر العلماء.", "core", "B2", "AWL"],
  ["adaptation", "noun", "تكيّف", "Deep-sea creatures show remarkable adaptation.", "تُظهر مخلوقات أعماق البحار تكيّفًا ملحوظًا.", "core", "B2", "AWL"],
  ["migration", "noun", "هجرة", "Whale migration covers thousands of kilometers.", "تغطي هجرة الحيتان آلاف الكيلومترات.", "core", "B2", "AWL"],
  ["navigation", "noun", "ملاحة", "Underwater navigation relies on sonar technology.", "تعتمد الملاحة تحت الماء على تقنية السونار.", "extended", "B2", "NAWL"],
  ["communication", "noun", "تواصل", "Dolphin communication involves complex sounds.", "يتضمن تواصل الدلافين أصواتًا معقدة.", "core", "B1", "AWL"],
  ["investigation", "noun", "تحقيق", "The investigation uncovered new deep-sea species.", "كشف التحقيق عن أنواع جديدة في أعماق البحار.", "core", "B2", "AWL"],
  ["identification", "noun", "تحديد هوية", "Identification of marine species requires expertise.", "يتطلب تحديد هوية الأنواع البحرية خبرة.", "core", "B2", "AWL"],
  ["extinction", "noun", "انقراض", "Extinction of marine species is accelerating.", "يتسارع انقراض الأنواع البحرية.", "core", "B2", "NAWL"],
  ["distribution", "noun", "توزيع", "The distribution of nutrients varies by depth.", "يتفاوت توزيع المغذيات حسب العمق.", "core", "B2", "AWL"],
  ["absorption", "noun", "امتصاص", "Light absorption increases with ocean depth.", "يزداد امتصاص الضوء مع عمق المحيط.", "extended", "B2", "NAWL"],
  ["reflection", "noun", "انعكاس", "Reflection of light creates beautiful underwater effects.", "يخلق انعكاس الضوء تأثيرات جميلة تحت الماء.", "core", "B2", "AWL"],
  ["submersion", "noun", "غمر", "Submersion of the vessel took only minutes.", "استغرق غمر السفينة دقائق فقط.", "mastery", "C1", "NAWL"],
  ["pressurization", "noun", "ضغط", "Pressurization of diving chambers is critical for safety.", "ضغط غرف الغوص أمر بالغ الأهمية للسلامة.", "mastery", "C1", "NAWL"],
  ["illumination", "noun", "إضاءة", "Bioluminescent illumination lights up the deep ocean.", "تُنير الإضاءة الحيوية أعماق المحيط.", "extended", "C1", "NAWL"],
  ["sedimentation", "noun", "ترسيب", "Sedimentation builds up layers on the ocean floor.", "يشكّل الترسيب طبقات على قاع المحيط.", "extended", "C1", "NAWL"],
  ["stabilization", "noun", "استقرار", "Temperature stabilization is vital for reef survival.", "استقرار درجة الحرارة ضروري لبقاء الشعاب.", "extended", "B2", "AWL"],
];

// Unit 3: Food Security — Derived Forms
const unit3 = [
  ["production", "noun", "إنتاج", "Food production must increase to meet demand.", "يجب أن يزداد إنتاج الغذاء لتلبية الطلب.", "core", "B2", "AWL"],
  ["consumption", "noun", "استهلاك", "Meat consumption has environmental consequences.", "للاستهلاك اللحوم عواقب بيئية.", "core", "B2", "AWL"],
  ["cultivation", "noun", "زراعة", "Rice cultivation requires large amounts of water.", "تتطلب زراعة الأرز كميات كبيرة من المياه.", "extended", "B2", "NAWL"],
  ["fermentation", "noun", "تخمير", "Fermentation is used to preserve many foods.", "يُستخدم التخمير لحفظ العديد من الأطعمة.", "extended", "C1", "NAWL"],
  ["irrigation", "noun", "ري", "Irrigation systems help farmers in dry regions.", "تساعد أنظمة الري المزارعين في المناطق الجافة.", "core", "B2", "NAWL"],
  ["mechanization", "noun", "ميكنة", "Mechanization of farming has boosted output.", "عززت ميكنة الزراعة الإنتاج.", "extended", "C1", "NAWL"],
  ["modernization", "noun", "تحديث", "Modernization of agriculture reduces labor costs.", "يقلل تحديث الزراعة من تكاليف العمالة.", "core", "B2", "AWL"],
  ["industrialization", "noun", "تصنيع", "Industrialization changed food production methods.", "غيّر التصنيع أساليب إنتاج الغذاء.", "core", "B2", "AWL"],
  ["urbanization", "noun", "تحضّر", "Urbanization reduces available farmland.", "يقلل التحضّر من الأراضي الزراعية المتاحة.", "core", "B2", "AWL"],
  ["globalization", "noun", "عولمة", "Globalization has connected food markets worldwide.", "ربطت العولمة أسواق الغذاء حول العالم.", "core", "B2", "AWL"],
  ["deforestation", "noun", "إزالة الغابات", "Deforestation destroys habitats for farming.", "تدمر إزالة الغابات الموائل لأجل الزراعة.", "core", "B2", "NAWL"],
  ["desertification", "noun", "تصحّر", "Desertification threatens food security in Africa.", "يهدد التصحّر الأمن الغذائي في أفريقيا.", "extended", "C1", "NAWL"],
  ["malnutrition", "noun", "سوء التغذية", "Malnutrition affects millions of children worldwide.", "يؤثر سوء التغذية على ملايين الأطفال حول العالم.", "core", "B2", "NAWL"],
  ["overproduction", "noun", "إنتاج مفرط", "Overproduction can lead to food waste.", "يمكن أن يؤدي الإنتاج المفرط إلى هدر الطعام.", "extended", "B2", "NAWL"],
  ["diversification", "noun", "تنويع", "Crop diversification reduces risk for farmers.", "يقلل تنويع المحاصيل المخاطر على المزارعين.", "extended", "C1", "AWL"],
  ["intensification", "noun", "تكثيف", "Agricultural intensification increases yield per hectare.", "يزيد التكثيف الزراعي المحصول لكل هكتار.", "mastery", "C1", "AWL"],
  ["specification", "noun", "مواصفات", "Food safety specifications protect consumers.", "تحمي مواصفات سلامة الأغذية المستهلكين.", "core", "B2", "AWL"],
  ["stabilization", "noun", "تثبيت", "Price stabilization helps small-scale farmers.", "يساعد تثبيت الأسعار المزارعين الصغار.", "extended", "B2", "AWL"],
  ["fortification", "noun", "تدعيم", "Vitamin fortification improves nutritional value.", "يحسّن التدعيم بالفيتامينات القيمة الغذائية.", "extended", "C1", "NAWL"],
  ["fertilization", "noun", "تسميد", "Soil fertilization enhances crop growth.", "يعزز تسميد التربة نمو المحاصيل.", "extended", "B2", "NAWL"],
  ["subsidization", "noun", "دعم مالي", "Government subsidization supports local farmers.", "يدعم الدعم الحكومي المزارعين المحليين.", "mastery", "C1", "NAWL"],
  ["pasteurization", "noun", "بسترة", "Pasteurization kills harmful bacteria in milk.", "تقتل البسترة البكتيريا الضارة في الحليب.", "extended", "C1", "NAWL"],
  ["refrigeration", "noun", "تبريد", "Refrigeration extends the shelf life of food.", "يُطيل التبريد مدة صلاحية الطعام.", "core", "B2", "NAWL"],
  ["contaminate", "verb", "يُلوّث", "Pesticides can contaminate groundwater supplies.", "يمكن أن تلوّث المبيدات إمدادات المياه الجوفية.", "core", "B2", "AWL"],
  ["distribute", "verb", "يوزّع", "Organizations distribute food to vulnerable communities.", "توزّع المنظمات الغذاء على المجتمعات الضعيفة.", "core", "B1", "AWL"],
];

// Unit 4: Biomimicry — Derived Forms
const unit4 = [
  ["innovation", "noun", "ابتكار", "Biomimicry drives innovation in engineering.", "تدفع المحاكاة الحيوية الابتكار في الهندسة.", "core", "B2", "AWL"],
  ["optimization", "noun", "تحسين", "Optimization of designs reduces material waste.", "يقلل تحسين التصاميم من هدر المواد.", "extended", "C1", "AWL"],
  ["miniaturization", "noun", "تصغير", "Miniaturization of sensors was inspired by insects.", "استُلهم تصغير أجهزة الاستشعار من الحشرات.", "mastery", "C1", "NAWL"],
  ["replication", "noun", "نسخ", "Replication of natural structures is challenging.", "يُعدّ نسخ الهياكل الطبيعية أمرًا صعبًا.", "extended", "B2", "AWL"],
  ["simulation", "noun", "محاكاة", "Computer simulation tests biomimetic designs.", "تختبر المحاكاة الحاسوبية التصاميم المحاكية للحياة.", "core", "B2", "AWL"],
  ["fabrication", "noun", "تصنيع", "Fabrication of new materials imitates spider silk.", "يحاكي تصنيع المواد الجديدة حرير العنكبوت.", "extended", "C1", "NAWL"],
  ["reinforcement", "noun", "تعزيز", "Reinforcement of structures mimics bone density.", "يحاكي تعزيز الهياكل كثافة العظام.", "core", "B2", "AWL"],
  ["improvement", "noun", "تحسين", "Improvement in aerodynamics was inspired by birds.", "استُلهم التحسين في الديناميكا الهوائية من الطيور.", "core", "B1", "AWL"],
  ["measurement", "noun", "قياس", "Accurate measurement is critical in biomimicry.", "القياس الدقيق أمر بالغ الأهمية في المحاكاة الحيوية.", "core", "B2", "AWL"],
  ["development", "noun", "تطوير", "Development of self-cleaning surfaces copies lotus leaves.", "يقلّد تطوير الأسطح ذاتية التنظيف أوراق اللوتس.", "core", "B1", "AWL"],
  ["achievement", "noun", "إنجاز", "This achievement in material science mimics nature.", "يحاكي هذا الإنجاز في علم المواد الطبيعة.", "core", "B2", "AWL"],
  ["establishment", "noun", "إنشاء", "The establishment of a biomimicry lab was approved.", "تمت الموافقة على إنشاء مختبر للمحاكاة الحيوية.", "core", "B2", "AWL"],
  ["advancement", "noun", "تقدّم", "Advancement in 3D printing enables biomimetic designs.", "يتيح التقدّم في الطباعة ثلاثية الأبعاد تصاميم حيوية.", "core", "B2", "AWL"],
  ["enhancement", "noun", "تعزيز", "Enhancement of durability follows natural models.", "يتبع تعزيز المتانة النماذج الطبيعية.", "core", "B2", "AWL"],
  ["refinement", "noun", "تنقيح", "Refinement of the prototype took several months.", "استغرق تنقيح النموذج الأولي عدة أشهر.", "extended", "C1", "AWL"],
  ["alignment", "noun", "محاذاة", "Alignment of fibers improves structural strength.", "تحسّن محاذاة الألياف القوة الهيكلية.", "extended", "B2", "NAWL"],
  ["attachment", "noun", "تثبيت", "The attachment mechanism copies gecko feet.", "تقلّد آلية التثبيت أقدام الوزغة.", "core", "B2", "NAWL"],
  ["detachment", "noun", "انفصال", "Easy detachment allows reusable adhesives.", "يتيح الانفصال السهل مواد لاصقة قابلة لإعادة الاستخدام.", "extended", "C1", "NAWL"],
  ["displacement", "noun", "إزاحة", "Water displacement was studied using fish shapes.", "دُرست إزاحة الماء باستخدام أشكال الأسماك.", "extended", "B2", "AWL"],
  ["replacement", "noun", "استبدال", "Replacement of plastics with bio-materials is growing.", "يتزايد استبدال البلاستيك بمواد حيوية.", "core", "B2", "AWL"],
  ["arrangement", "noun", "ترتيب", "The arrangement of cells mimics honeycomb patterns.", "يحاكي ترتيب الخلايا أنماط خلية النحل.", "core", "B2", "NAWL"],
  ["enlargement", "noun", "تكبير", "Enlargement of microscopic structures reveals design secrets.", "يكشف تكبير الهياكل المجهرية أسرار التصميم.", "extended", "B2", "NAWL"],
  ["assessment", "noun", "تقييم", "Assessment of biomimetic products requires new standards.", "يتطلب تقييم المنتجات الحيوية معايير جديدة.", "core", "B2", "AWL"],
  ["enclosure", "noun", "حاوية", "The enclosure design was inspired by turtle shells.", "استُلهم تصميم الحاوية من أصداف السلاحف.", "extended", "B2", "NAWL"],
  ["replicate", "verb", "يُكرّر", "Scientists replicate natural processes in the lab.", "يكرّر العلماء العمليات الطبيعية في المختبر.", "core", "B2", "AWL"],
];

// Unit 5: Migration — Derived Forms
const unit5 = [
  ["immigration", "noun", "هجرة وافدة", "Immigration policies vary from country to country.", "تتفاوت سياسات الهجرة الوافدة من بلد لآخر.", "core", "B2", "NAWL"],
  ["emigration", "noun", "هجرة مغادرة", "Emigration from rural areas is increasing.", "تتزايد الهجرة من المناطق الريفية.", "extended", "B2", "NAWL"],
  ["naturalization", "noun", "تجنيس", "Naturalization grants immigrants full citizenship.", "يمنح التجنيس المهاجرين الجنسية الكاملة.", "extended", "C1", "NAWL"],
  ["assimilation", "noun", "اندماج", "Cultural assimilation can take several generations.", "يمكن أن يستغرق الاندماج الثقافي عدة أجيال.", "extended", "C1", "AWL"],
  ["discrimination", "noun", "تمييز", "Discrimination against migrants violates human rights.", "ينتهك التمييز ضد المهاجرين حقوق الإنسان.", "core", "B2", "AWL"],
  ["exploitation", "noun", "استغلال", "Exploitation of migrant workers is a global problem.", "يُعدّ استغلال العمال المهاجرين مشكلة عالمية.", "core", "B2", "AWL"],
  ["persecution", "noun", "اضطهاد", "Persecution forces people to flee their homes.", "يُجبر الاضطهاد الناس على الفرار من منازلهم.", "core", "B2", "NAWL"],
  ["displacement", "noun", "تهجير", "Displacement due to conflict affects millions.", "يؤثر التهجير بسبب النزاعات على الملايين.", "core", "B2", "AWL"],
  ["resettlement", "noun", "إعادة توطين", "Resettlement programs help refugees start new lives.", "تساعد برامج إعادة التوطين اللاجئين على بدء حياة جديدة.", "extended", "C1", "NAWL"],
  ["enrollment", "noun", "تسجيل", "School enrollment of migrant children is a priority.", "يُعدّ تسجيل أطفال المهاجرين في المدارس أولوية.", "core", "B2", "NAWL"],
  ["employment", "noun", "توظيف", "Employment opportunities attract migrants to cities.", "تجذب فرص التوظيف المهاجرين إلى المدن.", "core", "B1", "AWL"],
  ["unemployment", "noun", "بطالة", "Unemployment among refugees remains high.", "تظل البطالة بين اللاجئين مرتفعة.", "core", "B2", "NAWL"],
  ["empowerment", "noun", "تمكين", "Empowerment of migrant women improves communities.", "يحسّن تمكين النساء المهاجرات المجتمعات.", "extended", "B2", "AWL"],
  ["recognition", "noun", "اعتراف", "Recognition of foreign qualifications is essential.", "الاعتراف بالمؤهلات الأجنبية أمر ضروري.", "core", "B2", "AWL"],
  ["registration", "noun", "تسجيل رسمي", "Registration of refugees allows access to services.", "يتيح التسجيل الرسمي للاجئين الوصول إلى الخدمات.", "core", "B2", "NAWL"],
  ["integration", "noun", "اندماج اجتماعي", "Integration into the host society takes time.", "يستغرق الاندماج في المجتمع المضيف وقتًا.", "core", "B2", "AWL"],
  ["segregation", "noun", "فصل عنصري", "Segregation of communities leads to social tension.", "يؤدي الفصل بين المجتمعات إلى توتر اجتماعي.", "extended", "C1", "NAWL"],
  ["participation", "noun", "مشاركة", "Participation in civic life strengthens democracy.", "تُعزّز المشاركة في الحياة المدنية الديمقراطية.", "core", "B2", "AWL"],
  ["contribution", "noun", "مساهمة", "Migrants make a significant contribution to the economy.", "يقدم المهاجرون مساهمة كبيرة في الاقتصاد.", "core", "B2", "AWL"],
  ["representation", "noun", "تمثيل", "Political representation of minorities is important.", "يُعدّ التمثيل السياسي للأقليات مهمًا.", "core", "B2", "AWL"],
  ["marginalization", "noun", "تهميش", "Marginalization of refugees limits their potential.", "يحدّ تهميش اللاجئين من إمكاناتهم.", "extended", "C1", "AWL"],
  ["repatriation", "noun", "إعادة إلى الوطن", "Voluntary repatriation is preferred over forced return.", "تُفضّل الإعادة الطوعية إلى الوطن على الإعادة القسرية.", "mastery", "C1", "NAWL"],
  ["legalization", "noun", "تقنين", "Legalization of status gives migrants legal protection.", "يمنح تقنين الوضع المهاجرين حماية قانونية.", "extended", "B2", "NAWL"],
  ["deportation", "noun", "ترحيل", "Deportation of undocumented migrants remains controversial.", "لا يزال ترحيل المهاجرين غير الموثقين مثيرًا للجدل.", "extended", "C1", "NAWL"],
  ["relocate", "verb", "ينتقل", "Many families relocate in search of better opportunities.", "تنتقل العديد من العائلات بحثًا عن فرص أفضل.", "core", "B2", "AWL"],
];

// Unit 6: Cryptocurrency — Derived Forms
const unit6 = [
  ["transaction", "noun", "معاملة", "Each transaction is recorded on the blockchain.", "تُسجَّل كل معاملة على سلسلة الكتل.", "core", "B2", "AWL"],
  ["verification", "noun", "تحقق", "Verification of transactions takes a few minutes.", "يستغرق التحقق من المعاملات بضع دقائق.", "core", "B2", "AWL"],
  ["authentication", "noun", "مصادقة", "Two-factor authentication protects digital wallets.", "تحمي المصادقة الثنائية المحافظ الرقمية.", "extended", "C1", "NAWL"],
  ["encryption", "noun", "تشفير", "Encryption ensures the security of transactions.", "يضمن التشفير أمان المعاملات.", "core", "B2", "NAWL"],
  ["decryption", "noun", "فك التشفير", "Decryption requires a private key.", "يتطلب فك التشفير مفتاحًا خاصًا.", "extended", "C1", "NAWL"],
  ["regulation", "noun", "تنظيم", "Government regulation of crypto markets is debated.", "يُناقَش التنظيم الحكومي لأسواق العملات المشفرة.", "core", "B2", "AWL"],
  ["deregulation", "noun", "إلغاء التنظيم", "Deregulation could increase market volatility.", "قد يزيد إلغاء التنظيم من تقلبات السوق.", "mastery", "C1", "AWL"],
  ["speculation", "noun", "مضاربة", "Speculation drives cryptocurrency price swings.", "تدفع المضاربة تقلبات أسعار العملات المشفرة.", "extended", "C1", "AWL"],
  ["manipulation", "noun", "تلاعب", "Market manipulation is illegal in most countries.", "التلاعب بالسوق غير قانوني في معظم البلدان.", "core", "B2", "AWL"],
  ["diversification", "noun", "تنويع استثماري", "Portfolio diversification reduces financial risk.", "يقلل التنويع الاستثماري المخاطر المالية.", "extended", "C1", "AWL"],
  ["implementation", "noun", "تنفيذ", "Implementation of blockchain in banking is growing.", "يتزايد تنفيذ سلسلة الكتل في القطاع المصرفي.", "core", "B2", "AWL"],
  ["computation", "noun", "حوسبة", "Mining requires significant computation power.", "يتطلب التعدين قوة حوسبة كبيرة.", "extended", "B2", "NAWL"],
  ["disruption", "noun", "زعزعة", "Cryptocurrency is a disruption to traditional finance.", "تُعدّ العملات المشفرة زعزعة للتمويل التقليدي.", "core", "B2", "NAWL"],
  ["adoption", "noun", "تبنّي", "Adoption of digital currencies is accelerating.", "يتسارع تبنّي العملات الرقمية.", "core", "B2", "AWL"],
  ["suspension", "noun", "تعليق", "Suspension of trading occurred during the crash.", "حدث تعليق التداول أثناء الانهيار.", "extended", "B2", "NAWL"],
  ["termination", "noun", "إنهاء", "Termination of the contract was immediate.", "كان إنهاء العقد فوريًا.", "extended", "B2", "AWL"],
  ["notification", "noun", "إشعار", "Users receive a notification for each transaction.", "يتلقى المستخدمون إشعارًا لكل معاملة.", "core", "B2", "NAWL"],
  ["confirmation", "noun", "تأكيد", "Transaction confirmation takes about ten minutes.", "يستغرق تأكيد المعاملة حوالي عشر دقائق.", "core", "B2", "NAWL"],
  ["validation", "noun", "تصديق", "Validation of blocks is done by miners.", "يتم تصديق الكتل بواسطة المعدّنين.", "extended", "B2", "AWL"],
  ["decentralization", "noun", "لامركزية", "Decentralization is a core principle of blockchain.", "اللامركزية مبدأ أساسي في سلسلة الكتل.", "core", "B2", "NAWL"],
  ["volatility", "noun", "تقلّب", "Volatility makes crypto a risky investment.", "يجعل التقلّب العملات المشفرة استثمارًا محفوفًا بالمخاطر.", "extended", "C1", "NAWL"],
  ["transparency", "noun", "شفافية", "Blockchain offers full transparency of records.", "توفر سلسلة الكتل شفافية كاملة للسجلات.", "core", "B2", "NAWL"],
  ["tokenization", "noun", "ترميز", "Tokenization converts assets into digital tokens.", "يحوّل الترميز الأصول إلى رموز رقمية.", "mastery", "C1", "NAWL"],
  ["anonymization", "noun", "إخفاء الهوية", "Anonymization protects user privacy on the network.", "يحمي إخفاء الهوية خصوصية المستخدم على الشبكة.", "mastery", "C1", "NAWL"],
  ["regulate", "verb", "يُنظّم", "Governments struggle to regulate cryptocurrency markets.", "تكافح الحكومات لتنظيم أسواق العملات المشفرة.", "core", "B2", "AWL"],
];

// Unit 7: Crowd Psychology — Derived Forms
const unit7 = [
  ["persuasion", "noun", "إقناع", "Persuasion techniques are used to influence crowds.", "تُستخدم تقنيات الإقناع للتأثير على الحشود.", "core", "B2", "NAWL"],
  ["perception", "noun", "إدراك", "Perception of danger triggers crowd panic.", "يُثير إدراك الخطر حالة ذعر جماعي.", "core", "B2", "AWL"],
  ["motivation", "noun", "دافع", "Understanding motivation helps predict crowd behavior.", "يساعد فهم الدافع في التنبؤ بسلوك الحشود.", "core", "B2", "AWL"],
  ["frustration", "noun", "إحباط", "Frustration can lead to aggressive crowd behavior.", "يمكن أن يؤدي الإحباط إلى سلوك عدواني جماعي.", "core", "B2", "NAWL"],
  ["aggression", "noun", "عدوان", "Aggression in crowds can escalate quickly.", "يمكن أن يتصاعد العدوان في الحشود بسرعة.", "core", "B2", "NAWL"],
  ["submission", "noun", "خضوع", "Submission to group pressure is a common phenomenon.", "الخضوع لضغط الجماعة ظاهرة شائعة.", "extended", "C1", "NAWL"],
  ["oppression", "noun", "قمع", "Oppression often triggers collective resistance.", "غالبًا ما يثير القمع مقاومة جماعية.", "core", "B2", "NAWL"],
  ["suppression", "noun", "إخماد", "Suppression of protests can increase tensions.", "يمكن أن يزيد إخماد الاحتجاجات من التوترات.", "extended", "C1", "AWL"],
  ["expression", "noun", "تعبير", "Freedom of expression is fundamental in democracies.", "حرية التعبير أساسية في الديمقراطيات.", "core", "B1", "AWL"],
  ["impression", "noun", "انطباع", "First impressions influence crowd dynamics.", "تؤثر الانطباعات الأولى على ديناميكيات الحشود.", "core", "B2", "AWL"],
  ["obsession", "noun", "هوس", "Obsession with a leader can blind followers.", "يمكن أن يُعمي الهوس بقائد أتباعه.", "extended", "B2", "NAWL"],
  ["progression", "noun", "تقدّم تدريجي", "The progression from calm to chaos was rapid.", "كان التقدّم من الهدوء إلى الفوضى سريعًا.", "core", "B2", "AWL"],
  ["regression", "noun", "تراجع", "Social regression can result from mass hysteria.", "يمكن أن ينتج التراجع الاجتماعي عن الهستيريا الجماعية.", "mastery", "C1", "AWL"],
  ["depression", "noun", "اكتئاب", "Depression can follow prolonged crowd isolation.", "يمكن أن يعقب الاكتئاب العزلة الجماعية المطولة.", "core", "B2", "NAWL"],
  ["compassion", "noun", "تعاطف", "Compassion can spread through crowds just like panic.", "يمكن أن ينتشر التعاطف بين الحشود كالذعر.", "core", "B2", "NAWL"],
  ["isolation", "noun", "عزلة", "Social isolation increases vulnerability to manipulation.", "تزيد العزلة الاجتماعية من التعرض للتلاعب.", "core", "B2", "AWL"],
  ["polarization", "noun", "استقطاب", "Group polarization makes opinions more extreme.", "يجعل الاستقطاب الجماعي الآراء أكثر تطرفًا.", "extended", "C1", "NAWL"],
  ["radicalization", "noun", "تطرّف", "Online radicalization is a growing concern.", "يُعدّ التطرّف عبر الإنترنت مصدر قلق متزايد.", "extended", "C1", "NAWL"],
  ["mobilization", "noun", "تعبئة", "Social media enables rapid mobilization of crowds.", "تتيح وسائل التواصل الاجتماعي التعبئة السريعة للحشود.", "extended", "B2", "AWL"],
  ["organization", "noun", "تنظيم", "Organization of protests requires careful planning.", "يتطلب تنظيم الاحتجاجات تخطيطًا دقيقًا.", "core", "B1", "AWL"],
  ["confrontation", "noun", "مواجهة", "Confrontation between groups can turn violent.", "يمكن أن تتحول المواجهة بين الجماعات إلى عنف.", "core", "B2", "NAWL"],
  ["negotiation", "noun", "تفاوض", "Negotiation can defuse crowd tensions.", "يمكن أن ينزع التفاوض فتيل توترات الحشود.", "core", "B2", "AWL"],
  ["dehumanization", "noun", "تجريد من الإنسانية", "Dehumanization of opponents leads to violence.", "يؤدي تجريد الخصوم من إنسانيتهم إلى العنف.", "mastery", "C1", "NAWL"],
  ["desensitization", "noun", "إزالة الحساسية", "Media desensitization reduces emotional responses.", "تقلل إزالة الحساسية الإعلامية الاستجابات العاطفية.", "mastery", "C1", "NAWL"],
  ["manipulate", "verb", "يتلاعب", "Leaders can manipulate crowds through fear.", "يمكن للقادة التلاعب بالحشود من خلال الخوف.", "core", "B2", "AWL"],
];

// Unit 8: Forensic Science — Derived Forms
const unit8 = [
  ["examination", "noun", "فحص جنائي", "Forensic examination revealed the cause of death.", "كشف الفحص الجنائي عن سبب الوفاة.", "core", "B2", "AWL"],
  ["prosecution", "noun", "ملاحقة قضائية", "The prosecution presented DNA evidence.", "قدمت الملاحقة القضائية أدلة الحمض النووي.", "core", "B2", "NAWL"],
  ["conviction", "noun", "إدانة", "The conviction was based on fingerprint evidence.", "استندت الإدانة إلى أدلة بصمات الأصابع.", "core", "B2", "NAWL"],
  ["acquittal", "noun", "تبرئة", "The acquittal resulted from insufficient evidence.", "نتجت التبرئة عن عدم كفاية الأدلة.", "mastery", "C1", "NAWL"],
  ["imprisonment", "noun", "سجن", "Imprisonment followed the guilty verdict.", "أعقب السجن حكم الإدانة.", "extended", "B2", "NAWL"],
  ["interrogation", "noun", "استجواب", "Interrogation of suspects must follow legal procedures.", "يجب أن يتبع استجواب المشتبه بهم الإجراءات القانونية.", "extended", "C1", "NAWL"],
  ["reconstruction", "noun", "إعادة بناء", "Crime scene reconstruction helps solve cases.", "تساعد إعادة بناء مسرح الجريمة في حل القضايا.", "extended", "B2", "AWL"],
  ["determination", "noun", "تحديد", "Determination of time of death is crucial.", "تحديد وقت الوفاة أمر بالغ الأهمية.", "core", "B2", "AWL"],
  ["accusation", "noun", "اتهام", "The accusation was supported by physical evidence.", "كان الاتهام مدعومًا بأدلة مادية.", "core", "B2", "NAWL"],
  ["declaration", "noun", "إعلان", "The declaration of results ended the trial.", "أنهى إعلان النتائج المحاكمة.", "core", "B2", "AWL"],
  ["contamination", "noun", "تلويث أدلة", "Evidence contamination can compromise a case.", "يمكن أن يضر تلويث الأدلة بالقضية.", "extended", "B2", "AWL"],
  ["decomposition", "noun", "تحلّل", "Decomposition rate helps estimate time of death.", "يساعد معدل التحلّل في تقدير وقت الوفاة.", "extended", "C1", "NAWL"],
  ["identification", "noun", "التعرّف", "Victim identification uses dental records.", "يستخدم التعرّف على الضحايا السجلات السنية.", "core", "B2", "AWL"],
  ["falsification", "noun", "تزوير", "Falsification of evidence is a serious crime.", "تزوير الأدلة جريمة خطيرة.", "extended", "C1", "NAWL"],
  ["incrimination", "noun", "تجريم", "Self-incrimination is protected against by law.", "يحمي القانون من التجريم الذاتي.", "mastery", "C1", "NAWL"],
  ["authorization", "noun", "إذن رسمي", "Authorization is needed to access crime scenes.", "يلزم إذن رسمي للوصول إلى مسارح الجريمة.", "core", "B2", "AWL"],
  ["classification", "noun", "تصنيف جنائي", "Classification of evidence follows strict protocols.", "يتبع تصنيف الأدلة بروتوكولات صارمة.", "core", "B2", "AWL"],
  ["interpretation", "noun", "تأويل", "Interpretation of bloodstain patterns requires training.", "يتطلب تأويل أنماط بقع الدم تدريبًا.", "core", "B2", "AWL"],
  ["testimony", "noun", "شهادة", "Expert testimony strengthened the prosecution's case.", "عززت شهادة الخبير قضية الادعاء.", "core", "B2", "NAWL"],
  ["surveillance", "noun", "مراقبة", "Surveillance footage provided key evidence.", "قدمت لقطات المراقبة أدلة رئيسية.", "core", "B2", "NAWL"],
  ["toxicology", "noun", "علم السموم", "Toxicology reports confirmed the presence of poison.", "أكدت تقارير علم السموم وجود السم.", "mastery", "C1", "NAWL"],
  ["autopsy", "noun", "تشريح جثة", "The autopsy revealed previously unknown injuries.", "كشف تشريح الجثة عن إصابات غير معروفة سابقًا.", "extended", "C1", "NAWL"],
  ["apprehension", "noun", "إلقاء القبض", "Apprehension of the suspect occurred at dawn.", "تم إلقاء القبض على المشتبه به عند الفجر.", "extended", "C1", "NAWL"],
  ["verification", "noun", "توثيق أدلة", "Verification of alibis is standard procedure.", "توثيق أعذار الغياب إجراء معتاد.", "core", "B2", "AWL"],
  ["investigate", "verb", "يحقّق", "Detectives investigate crimes using forensic methods.", "يحقّق المحققون في الجرائم باستخدام أساليب جنائية.", "core", "B2", "AWL"],
];

// Unit 9: Archaeology — Derived Forms
const unit9 = [
  ["excavation", "noun", "تنقيب", "Excavation of the ancient site began last year.", "بدأ التنقيب في الموقع الأثري العام الماضي.", "core", "B2", "NAWL"],
  ["restoration", "noun", "ترميم", "Restoration of the temple took several decades.", "استغرق ترميم المعبد عدة عقود.", "core", "B2", "AWL"],
  ["civilization", "noun", "حضارة", "The Mesopotamian civilization left rich artifacts.", "تركت الحضارة بلاد ما بين النهرين آثارًا غنية.", "core", "B2", "NAWL"],
  ["domestication", "noun", "تدجين", "Domestication of animals changed human societies.", "غيّر تدجين الحيوانات المجتمعات البشرية.", "extended", "C1", "NAWL"],
  ["fortification", "noun", "تحصين", "Ancient fortification walls still stand today.", "لا تزال جدران التحصين القديمة قائمة حتى اليوم.", "extended", "C1", "NAWL"],
  ["construction", "noun", "بناء", "Construction of pyramids required advanced engineering.", "تطلب بناء الأهرامات هندسة متقدمة.", "core", "B1", "AWL"],
  ["destruction", "noun", "تدمير", "Destruction of archaeological sites is tragic.", "يُعدّ تدمير المواقع الأثرية مأساويًا.", "core", "B2", "AWL"],
  ["decoration", "noun", "زخرفة", "Decoration of pottery reveals cultural practices.", "تكشف زخرفة الفخار عن الممارسات الثقافية.", "core", "B2", "NAWL"],
  ["inscription", "noun", "نقش", "The inscription on the stone told an ancient story.", "روى النقش على الحجر قصة قديمة.", "extended", "C1", "NAWL"],
  ["illustration", "noun", "رسم توضيحي", "The illustration showed the original site layout.", "أظهر الرسم التوضيحي المخطط الأصلي للموقع.", "core", "B2", "NAWL"],
  ["stratification", "noun", "طبقات أرضية", "Stratification of soil layers dates archaeological finds.", "تؤرخ الطبقات الأرضية الاكتشافات الأثرية.", "mastery", "C1", "NAWL"],
  ["habitation", "noun", "سكن", "Evidence of habitation was found in the caves.", "عُثر على أدلة السكن في الكهوف.", "extended", "C1", "NAWL"],
  ["preservation", "noun", "صون", "Preservation of artifacts requires controlled conditions.", "يتطلب صون القطع الأثرية ظروفًا محكمة.", "core", "B2", "AWL"],
  ["documentation", "noun", "توثيق أثري", "Detailed documentation of each find is required.", "يُشترط التوثيق المفصل لكل اكتشاف.", "core", "B2", "AWL"],
  ["interpretation", "noun", "تفسير أثري", "Interpretation of ancient symbols is challenging.", "يُعدّ تفسير الرموز القديمة أمرًا صعبًا.", "core", "B2", "AWL"],
  ["urbanization", "noun", "تمدّن", "Ancient urbanization created the first cities.", "أنشأ التمدّن القديم المدن الأولى.", "core", "B2", "AWL"],
  ["specialization", "noun", "تخصص حرفي", "Craft specialization developed in early societies.", "تطور التخصص الحرفي في المجتمعات المبكرة.", "extended", "B2", "AWL"],
  ["innovation", "noun", "ابتكار أثري", "Technological innovation drove societal change.", "دفع الابتكار التكنولوجي التغيير المجتمعي.", "core", "B2", "AWL"],
  ["colonization", "noun", "استيطان", "Greek colonization spread across the Mediterranean.", "انتشر الاستيطان اليوناني عبر البحر الأبيض المتوسط.", "extended", "B2", "NAWL"],
  ["migration", "noun", "تنقّل", "Migration patterns are traced through artifacts.", "تُتتبَّع أنماط التنقّل من خلال القطع الأثرية.", "core", "B2", "AWL"],
  ["transformation", "noun", "تحوّل حضاري", "The transformation from nomadic to settled life was gradual.", "كان التحوّل من الحياة البدوية إلى الاستقرار تدريجيًا.", "core", "B2", "AWL"],
  ["adaptation", "noun", "تأقلم", "Human adaptation to new environments shaped cultures.", "شكّل تأقلم الإنسان مع البيئات الجديدة الثقافات.", "core", "B2", "AWL"],
  ["organization", "noun", "تنظيم اجتماعي", "Social organization of ancient peoples is studied.", "يُدرَس التنظيم الاجتماعي للشعوب القديمة.", "core", "B2", "AWL"],
  ["excavate", "verb", "ينقّب", "Archaeologists excavate sites layer by layer.", "ينقّب علماء الآثار في المواقع طبقة تلو الأخرى.", "extended", "B2", "NAWL"],
  ["reconstruct", "verb", "يعيد بناء", "Historians reconstruct ancient buildings from ruins.", "يعيد المؤرخون بناء المباني القديمة من الأطلال.", "extended", "B2", "AWL"],
];

// Unit 10: Longevity — Derived Forms
const unit10 = [
  ["regeneration", "noun", "تجدّد", "Cell regeneration slows as people age.", "يتباطأ تجدّد الخلايا مع تقدم الناس في العمر.", "extended", "C1", "NAWL"],
  ["degeneration", "noun", "تنكّس", "Degeneration of joints causes pain in old age.", "يسبب تنكّس المفاصل ألمًا في الشيخوخة.", "extended", "C1", "NAWL"],
  ["inflammation", "noun", "التهاب", "Chronic inflammation contributes to aging.", "يساهم الالتهاب المزمن في الشيخوخة.", "core", "B2", "NAWL"],
  ["deterioration", "noun", "تدهور صحي", "Health deterioration can be slowed with exercise.", "يمكن إبطاء التدهور الصحي بالتمرين.", "core", "B2", "AWL"],
  ["rejuvenation", "noun", "تجديد الشباب", "Rejuvenation therapies are advancing rapidly.", "تتقدم علاجات تجديد الشباب بسرعة.", "mastery", "C1", "NAWL"],
  ["supplementation", "noun", "مكمّلات", "Vitamin supplementation supports healthy aging.", "تدعم المكمّلات الفيتامينية الشيخوخة الصحية.", "extended", "C1", "NAWL"],
  ["vaccination", "noun", "تطعيم", "Vaccination protects the elderly from disease.", "يحمي التطعيم كبار السن من الأمراض.", "core", "B2", "NAWL"],
  ["medication", "noun", "دواء", "Proper medication management extends life expectancy.", "تطيل إدارة الدواء السليمة متوسط العمر المتوقع.", "core", "B2", "NAWL"],
  ["prevention", "noun", "وقاية", "Disease prevention is better than treatment.", "الوقاية من المرض أفضل من العلاج.", "core", "B2", "AWL"],
  ["intervention", "noun", "تدخّل", "Early intervention improves health outcomes.", "يحسّن التدخّل المبكر النتائج الصحية.", "core", "B2", "AWL"],
  ["relaxation", "noun", "استرخاء", "Relaxation techniques reduce stress and improve health.", "تقلل تقنيات الاسترخاء التوتر وتحسن الصحة.", "core", "B2", "NAWL"],
  ["meditation", "noun", "تأمّل", "Daily meditation has been linked to longevity.", "ارتبط التأمّل اليومي بطول العمر.", "core", "B2", "NAWL"],
  ["respiration", "noun", "تنفّس", "Proper respiration improves overall well-being.", "يحسّن التنفّس السليم الرفاهية العامة.", "extended", "B2", "NAWL"],
  ["digestion", "noun", "هضم", "Good digestion is essential for nutrient absorption.", "يُعدّ الهضم الجيد ضروريًا لامتصاص المغذيات.", "core", "B2", "NAWL"],
  ["elimination", "noun", "إخراج", "Waste elimination keeps the body healthy.", "يحافظ إخراج الفضلات على صحة الجسم.", "extended", "B2", "AWL"],
  ["reproduction", "noun", "تكاثر خلوي", "Cellular reproduction declines with age.", "يتراجع التكاثر الخلوي مع التقدم في العمر.", "core", "B2", "AWL"],
  ["oxidation", "noun", "أكسدة", "Oxidation of cells accelerates the aging process.", "تسرّع أكسدة الخلايا عملية الشيخوخة.", "extended", "C1", "NAWL"],
  ["hydration", "noun", "ترطيب", "Adequate hydration is vital for longevity.", "الترطيب الكافي ضروري لطول العمر.", "core", "B2", "NAWL"],
  ["moderation", "noun", "اعتدال", "Moderation in diet promotes a longer life.", "يعزز الاعتدال في النظام الغذائي حياة أطول.", "core", "B2", "NAWL"],
  ["deteriorate", "verb", "يتدهور", "Health can deteriorate without proper care.", "يمكن أن تتدهور الصحة بدون رعاية مناسبة.", "core", "B2", "AWL"],
  ["rejuvenate", "verb", "يجدّد", "Sleep helps rejuvenate the body and mind.", "يساعد النوم في تجديد الجسم والعقل.", "extended", "C1", "NAWL"],
  ["supplement", "verb", "يُكمّل", "Many people supplement their diet with vitamins.", "يكمّل كثير من الناس نظامهم الغذائي بالفيتامينات.", "core", "B2", "NAWL"],
  ["stimulation", "noun", "تحفيز", "Mental stimulation helps prevent cognitive decline.", "يساعد التحفيز الذهني في منع التدهور المعرفي.", "extended", "B2", "AWL"],
  ["circulation", "noun", "دورة دموية", "Good circulation supports organ health in old age.", "تدعم الدورة الدموية الجيدة صحة الأعضاء في الشيخوخة.", "core", "B2", "NAWL"],
  ["immunization", "noun", "تلقيح", "Annual immunization is recommended for seniors.", "يُوصى بالتلقيح السنوي لكبار السن.", "extended", "B2", "NAWL"],
];

// Unit 11: Sustainable Architecture — Derived Forms
const unit11 = [
  ["renovation", "noun", "تجديد", "Green renovation reduces building energy use.", "يقلل التجديد الأخضر من استهلاك الطاقة في المباني.", "core", "B2", "NAWL"],
  ["demolition", "noun", "هدم", "Demolition of old buildings creates waste.", "ينتج عن هدم المباني القديمة نفايات.", "extended", "B2", "NAWL"],
  ["installation", "noun", "تركيب", "Solar panel installation is increasingly affordable.", "أصبح تركيب الألواح الشمسية ميسور التكلفة بشكل متزايد.", "core", "B2", "AWL"],
  ["insulation", "noun", "عزل حراري", "Proper insulation reduces heating costs.", "يقلل العزل الحراري المناسب تكاليف التدفئة.", "core", "B2", "NAWL"],
  ["ventilation", "noun", "تهوية", "Natural ventilation improves indoor air quality.", "تحسّن التهوية الطبيعية جودة الهواء الداخلي.", "core", "B2", "NAWL"],
  ["orientation", "noun", "توجيه", "Building orientation affects sunlight exposure.", "يؤثر توجيه المبنى على التعرض لأشعة الشمس.", "core", "B2", "AWL"],
  ["certification", "noun", "اعتماد بيئي", "Green certification verifies sustainable design.", "يتحقق الاعتماد البيئي من التصميم المستدام.", "extended", "B2", "NAWL"],
  ["specification", "noun", "مواصفات بناء", "Building specifications must meet energy codes.", "يجب أن تستوفي مواصفات البناء قوانين الطاقة.", "core", "B2", "AWL"],
  ["optimization", "noun", "تحسين بيئي", "Energy optimization reduces carbon emissions.", "يقلل التحسين البيئي من انبعاثات الكربون.", "extended", "C1", "AWL"],
  ["prefabrication", "noun", "بناء مسبق الصنع", "Prefabrication speeds up construction timelines.", "يسرّع البناء المسبق الجداول الزمنية للإنشاء.", "mastery", "C1", "NAWL"],
  ["weatherization", "noun", "عزل جوي", "Weatherization protects homes from extreme temperatures.", "يحمي العزل الجوي المنازل من درجات الحرارة القصوى.", "mastery", "C1", "NAWL"],
  ["conservation", "noun", "ترشيد", "Energy conservation is central to green architecture.", "ترشيد الطاقة أمر محوري في العمارة الخضراء.", "core", "B2", "AWL"],
  ["implementation", "noun", "تطبيق", "Implementation of green standards varies by region.", "يتفاوت تطبيق المعايير الخضراء حسب المنطقة.", "core", "B2", "AWL"],
  ["commercialization", "noun", "تسويق تجاري", "Commercialization of green tech has grown.", "نما التسويق التجاري للتقنية الخضراء.", "extended", "C1", "AWL"],
  ["standardization", "noun", "توحيد معايير", "Standardization of green building codes is needed.", "يلزم توحيد معايير قوانين المباني الخضراء.", "extended", "C1", "AWL"],
  ["construction", "noun", "إنشاء", "Sustainable construction uses recycled materials.", "يستخدم الإنشاء المستدام مواد معاد تدويرها.", "core", "B1", "AWL"],
  ["regulation", "noun", "لائحة تنظيمية", "Building regulation ensures structural safety.", "تضمن اللائحة التنظيمية السلامة الهيكلية.", "core", "B2", "AWL"],
  ["modification", "noun", "تعديل هيكلي", "Structural modification can improve energy efficiency.", "يمكن أن يحسّن التعديل الهيكلي كفاءة الطاقة.", "core", "B2", "AWL"],
  ["visualization", "noun", "نمذجة بصرية", "3D visualization helps architects plan designs.", "تساعد النمذجة البصرية ثلاثية الأبعاد المهندسين المعماريين.", "extended", "B2", "NAWL"],
  ["modernization", "noun", "عصرنة", "Modernization of old buildings saves resources.", "توفر عصرنة المباني القديمة الموارد.", "core", "B2", "AWL"],
  ["industrialization", "noun", "تصنيع بناء", "Industrialization of construction cuts costs.", "يخفض تصنيع البناء التكاليف.", "extended", "B2", "AWL"],
  ["sustainability", "noun", "استدامة", "Sustainability is the goal of green architecture.", "الاستدامة هي هدف العمارة الخضراء.", "core", "B2", "AWL"],
  ["durability", "noun", "متانة", "Durability of materials reduces replacement needs.", "تقلل متانة المواد الحاجة إلى الاستبدال.", "core", "B2", "NAWL"],
  ["permeability", "noun", "نفاذية", "Soil permeability affects foundation design.", "تؤثر نفاذية التربة على تصميم الأساسات.", "mastery", "C1", "NAWL"],
  ["renovate", "verb", "يجدّد", "Architects renovate historic buildings sustainably.", "يجدّد المهندسون المعماريون المباني التاريخية بشكل مستدام.", "core", "B2", "NAWL"],
];

// Unit 12: Exoplanets — Derived Forms
const unit12 = [
  ["detection", "noun", "رصد", "Detection of exoplanets uses transit methods.", "يستخدم رصد الكواكب الخارجية أساليب العبور.", "core", "B2", "AWL"],
  ["transmission", "noun", "إرسال", "Signal transmission from deep space takes years.", "يستغرق إرسال الإشارات من الفضاء العميق سنوات.", "core", "B2", "AWL"],
  ["calculation", "noun", "حساب", "Orbital calculation determines a planet's year length.", "يحدد الحساب المداري طول سنة الكوكب.", "core", "B2", "AWL"],
  ["estimation", "noun", "تقدير", "Size estimation of exoplanets relies on brightness data.", "يعتمد تقدير حجم الكواكب الخارجية على بيانات السطوع.", "core", "B2", "AWL"],
  ["simulation", "noun", "محاكاة فلكية", "Computer simulation models planetary formation.", "تحاكي المحاكاة الحاسوبية تشكّل الكواكب.", "core", "B2", "AWL"],
  ["acceleration", "noun", "تسارع", "Gravitational acceleration varies across planets.", "يتفاوت التسارع الجاذبي عبر الكواكب.", "extended", "B2", "NAWL"],
  ["deceleration", "noun", "تباطؤ", "Deceleration of spacecraft near planets requires precision.", "يتطلب تباطؤ المركبات الفضائية بالقرب من الكواكب دقة.", "mastery", "C1", "NAWL"],
  ["rotation", "noun", "دوران محوري", "Planetary rotation speed affects day length.", "تؤثر سرعة الدوران المحوري على طول اليوم.", "core", "B2", "NAWL"],
  ["revolution", "noun", "دوران مداري", "One revolution around the star takes 365 days.", "تستغرق دورة مدارية واحدة حول النجم 365 يومًا.", "core", "B2", "NAWL"],
  ["radiation", "noun", "إشعاع", "Stellar radiation determines a planet's habitability.", "يحدد الإشعاع النجمي قابلية الكوكب للسكن.", "core", "B2", "NAWL"],
  ["gravitation", "noun", "جاذبية", "Gravitation holds planets in their orbits.", "تحافظ الجاذبية على الكواكب في مداراتها.", "extended", "C1", "NAWL"],
  ["ionization", "noun", "تأيّن", "Ionization of the atmosphere affects radio signals.", "يؤثر تأيّن الغلاف الجوي على إشارات الراديو.", "mastery", "C1", "NAWL"],
  ["vaporization", "noun", "تبخّر", "Surface vaporization occurs on planets close to stars.", "يحدث تبخّر السطح على الكواكب القريبة من النجوم.", "mastery", "C1", "NAWL"],
  ["condensation", "noun", "تكاثف فلكي", "Atmospheric condensation forms clouds on exoplanets.", "يشكّل التكاثف الجوي سحبًا على الكواكب الخارجية.", "extended", "B2", "NAWL"],
  ["composition", "noun", "تركيب", "Atmospheric composition reveals potential for life.", "يكشف التركيب الجوي عن إمكانية وجود الحياة.", "core", "B2", "AWL"],
  ["decomposition", "noun", "تفكّك", "Molecular decomposition occurs under intense radiation.", "يحدث التفكّك الجزيئي تحت الإشعاع الشديد.", "extended", "C1", "NAWL"],
  ["fragmentation", "noun", "تفتّت", "Asteroid fragmentation creates debris fields.", "يُنشئ تفتّت الكويكبات حقول حطام.", "extended", "C1", "NAWL"],
  ["colonization", "noun", "استعمار فضائي", "Exoplanet colonization remains science fiction.", "لا يزال الاستعمار الفضائي للكواكب الخارجية خيالًا علميًا.", "extended", "B2", "NAWL"],
  ["navigation", "noun", "ملاحة فضائية", "Interstellar navigation poses immense challenges.", "تطرح الملاحة الفضائية بين النجوم تحديات هائلة.", "extended", "B2", "NAWL"],
  ["documentation", "noun", "توثيق فلكي", "Documentation of discoveries advances our knowledge.", "يطوّر التوثيق الفلكي للاكتشافات معرفتنا.", "core", "B2", "AWL"],
  ["observation", "noun", "رصد فلكي", "Telescope observation reveals distant worlds.", "يكشف الرصد الفلكي بالتلسكوب عوالم بعيدة.", "core", "B2", "AWL"],
  ["exploration", "noun", "استكشاف فضائي", "Space exploration may one day reach exoplanets.", "قد يصل الاستكشاف الفضائي يومًا ما إلى الكواكب الخارجية.", "core", "B2", "AWL"],
  ["habitation", "noun", "سكن فضائي", "Habitation of other planets is a long-term goal.", "يُعدّ السكن على كواكب أخرى هدفًا طويل الأمد.", "extended", "C1", "NAWL"],
  ["magnetization", "noun", "تمغنط", "Planetary magnetization shields against solar wind.", "يحمي التمغنط الكوكبي من الرياح الشمسية.", "mastery", "C1", "NAWL"],
  ["speculate", "verb", "يتكهّن", "Scientists speculate about life on exoplanets.", "يتكهّن العلماء بوجود حياة على الكواكب الخارجية.", "core", "B2", "AWL"],
];

async function main() {
  const client = await pool.connect();
  const batchId = 26;
  const units = [
    { num: 1, data: unit1 },
    { num: 2, data: unit2 },
    { num: 3, data: unit3 },
    { num: 4, data: unit4 },
    { num: 5, data: unit5 },
    { num: 6, data: unit6 },
    { num: 7, data: unit7 },
    { num: 8, data: unit8 },
    { num: 9, data: unit9 },
    { num: 10, data: unit10 },
    { num: 11, data: unit11 },
    { num: 12, data: unit12 },
  ];

  let totalInserted = 0;
  try {
    for (const u of units) {
      const count = await insertBatch(client, u.data, u.num, batchId);
      console.log(`Unit ${u.num}: inserted ${count}/${u.data.length} words`);
      totalInserted += count;
    }
    console.log(`\nTotal inserted: ${totalInserted}`);

    // Query final totals per unit
    console.log('\n--- Final totals per unit (batch_id=26) ---');
    const res = await client.query(
      `SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [batchId]
    );
    let grandTotal = 0;
    for (const row of res.rows) {
      console.log(`Unit ${row.recommended_unit}: ${row.cnt} words`);
      grandTotal += parseInt(row.cnt);
    }
    console.log(`Grand total (batch 26): ${grandTotal}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
