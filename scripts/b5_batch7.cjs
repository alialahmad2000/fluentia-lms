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

// ============================================================
// UNIT 1: Bioethics & Genetic Engineering
// ============================================================
const unit1 = [
  ["allele", "noun", "صيغة جينية بديلة لجين معين", "Each parent contributes one allele for every gene.", "يساهم كل والد بأليل واحد لكل جين.", "extended", "C1", "COCA"],
  ["phenotype", "noun", "النمط الظاهري؛ الصفات المرئية للكائن", "The phenotype depends on both genetics and environment.", "يعتمد النمط الظاهري على الوراثة والبيئة معاً.", "extended", "C1", "COCA"],
  ["transgenic", "adjective", "معدّل وراثياً بجينات من كائن آخر", "Transgenic crops can resist certain pests.", "يمكن للمحاصيل المعدّلة وراثياً مقاومة آفات معينة.", "mastery", "C1", "COCA"],
  ["biosafety", "noun", "السلامة الحيوية؛ إجراءات الوقاية من المخاطر البيولوجية", "Biosafety protocols must be followed in every lab.", "يجب اتباع بروتوكولات السلامة الحيوية في كل مختبر.", "extended", "B2", "AWL"],
  ["eugenics", "noun", "علم تحسين النسل", "Eugenics was widely discredited after World War II.", "فُضح علم تحسين النسل على نطاق واسع بعد الحرب العالمية الثانية.", "mastery", "C1", "COCA"],
  ["genome", "noun", "الجينوم؛ المجموع الكامل للمادة الوراثية", "Scientists mapped the entire human genome in 2003.", "رسم العلماء خريطة الجينوم البشري بالكامل عام 2003.", "core", "B2", "COCA"],
  ["mutation", "noun", "طفرة؛ تغيّر في التسلسل الجيني", "A single mutation can cause a genetic disorder.", "يمكن لطفرة واحدة أن تسبب اضطراباً وراثياً.", "core", "B2", "CEFR-J"],
  ["cloning", "noun", "الاستنساخ؛ إنتاج نسخة جينية مطابقة", "Cloning raises serious ethical questions.", "يثير الاستنساخ أسئلة أخلاقية جدية.", "core", "B2", "COCA"],
  ["embryo", "noun", "جنين في مراحله الأولى", "The embryo develops rapidly during the first trimester.", "يتطور الجنين بسرعة خلال الأشهر الثلاثة الأولى.", "core", "B2", "CEFR-J"],
  ["recombinant", "adjective", "مؤتلف؛ ناتج عن إعادة تركيب جيني", "Recombinant DNA technology revolutionized medicine.", "أحدثت تقنية الحمض النووي المؤتلف ثورة في الطب.", "mastery", "C1", "COCA"],
  ["bioethicist", "noun", "متخصص في أخلاقيات علم الأحياء", "The bioethicist warned against unregulated gene editing.", "حذّر المتخصص في أخلاقيات الأحياء من تعديل الجينات غير المنظم.", "extended", "B2", "COCA"],
  ["hereditary", "adjective", "وراثي؛ ينتقل من جيل لآخر", "Heart disease can be hereditary in some families.", "يمكن أن يكون مرض القلب وراثياً في بعض العائلات.", "core", "B2", "CEFR-J"],
  ["chromosome", "noun", "كروموسوم؛ صبغي يحمل المعلومات الوراثية", "Humans have 23 pairs of chromosomes.", "لدى الإنسان 23 زوجاً من الكروموسومات.", "core", "B2", "COCA"],
  ["pathogen", "noun", "عامل ممرض؛ كائن مسبب للمرض", "The pathogen spread quickly through the population.", "انتشر العامل الممرض بسرعة بين السكان.", "extended", "B2", "COCA"],
  ["splice", "verb", "وصل أو ربط أجزاء من الحمض النووي", "Scientists can splice genes from different organisms.", "يمكن للعلماء ربط جينات من كائنات مختلفة.", "extended", "B2", "NAWL"],
  ["congenital", "adjective", "خِلقي؛ موجود منذ الولادة", "The baby was born with a congenital heart defect.", "وُلد الطفل بعيب خِلقي في القلب.", "extended", "B2", "COCA"],
  ["stem cell", "noun", "خلية جذعية قادرة على التحول لأنواع مختلفة", "Stem cell research offers hope for many diseases.", "يقدم بحث الخلايا الجذعية أملاً لعلاج أمراض كثيرة.", "core", "B2", "COCA"],
  ["in vitro", "adjective", "مخبري؛ يتم خارج الكائن الحي", "In vitro fertilization has helped millions of couples.", "ساعد الإخصاب المخبري ملايين الأزواج.", "extended", "B2", "COCA"],
  ["genotype", "noun", "النمط الجيني؛ التركيب الوراثي للكائن", "The genotype determines the organism's potential traits.", "يحدد النمط الجيني الصفات المحتملة للكائن.", "mastery", "C1", "COCA"],
  ["plasmid", "noun", "بلازميد؛ جزيء حمض نووي دائري صغير", "Plasmids are used as vectors in genetic engineering.", "تُستخدم البلازميدات كناقلات في الهندسة الوراثية.", "mastery", "C1", "COCA"],
  ["zygote", "noun", "لاقحة؛ بويضة مخصبة", "The zygote divides to form an embryo.", "تنقسم اللاقحة لتكوين جنين.", "extended", "B2", "COCA"],
  ["teratogen", "noun", "مادة مشوّهة للأجنة", "Alcohol is a known teratogen during pregnancy.", "الكحول مادة مشوّهة معروفة خلال الحمل.", "mastery", "C1", "COCA"],
  ["nucleotide", "noun", "نيوكليوتيد؛ وحدة بناء الحمض النووي", "DNA is a chain of nucleotides arranged in a double helix.", "الحمض النووي سلسلة من النيوكليوتيدات مرتبة بشكل حلزوني مزدوج.", "extended", "B2", "COCA"],
  ["bioinformatics", "noun", "المعلوماتية الحيوية؛ تحليل البيانات البيولوجية حاسوبياً", "Bioinformatics helps analyze massive genomic datasets.", "تساعد المعلوماتية الحيوية في تحليل مجموعات البيانات الجينومية الضخمة.", "mastery", "C1", "AWL"],
  ["somatic", "adjective", "جسدي؛ متعلق بخلايا الجسم غير التناسلية", "Somatic gene therapy targets non-reproductive cells.", "يستهدف العلاج الجيني الجسدي الخلايا غير التناسلية.", "extended", "B2", "COCA"],
];

// ============================================================
// UNIT 2: Deep Ocean Exploration
// ============================================================
const unit2 = [
  ["bathymetry", "noun", "قياس أعماق المحيطات", "Bathymetry maps reveal the topography of the ocean floor.", "تكشف خرائط قياس الأعماق عن تضاريس قاع المحيط.", "mastery", "C1", "COCA"],
  ["chemosynthesis", "noun", "التخليق الكيميائي؛ إنتاج الطاقة من تفاعلات كيميائية", "Deep-sea organisms rely on chemosynthesis instead of sunlight.", "تعتمد كائنات أعماق البحار على التخليق الكيميائي بدلاً من ضوء الشمس.", "mastery", "C1", "COCA"],
  ["hydrothermal", "adjective", "حراري مائي؛ متعلق بالمياه الساخنة تحت الأرض", "Hydrothermal vents support unique ecosystems.", "تدعم الفوهات الحرارية المائية أنظمة بيئية فريدة.", "extended", "B2", "COCA"],
  ["abyssal", "adjective", "سحيق؛ متعلق بأعمق مناطق المحيط", "The abyssal zone is completely dark and extremely cold.", "المنطقة السحيقة مظلمة تماماً وشديدة البرودة.", "extended", "B2", "COCA"],
  ["benthic", "adjective", "قاعي؛ متعلق بقاع البحر", "Benthic organisms live on or near the ocean floor.", "تعيش الكائنات القاعية على قاع المحيط أو بالقرب منه.", "extended", "C1", "COCA"],
  ["submersible", "noun", "غواصة بحثية صغيرة", "The submersible descended to 4,000 meters below the surface.", "غاصت الغواصة البحثية إلى 4000 متر تحت السطح.", "core", "B2", "CEFR-J"],
  ["trench", "noun", "خندق محيطي عميق", "The Mariana Trench is the deepest point on Earth.", "خندق ماريانا هو أعمق نقطة على الأرض.", "core", "B2", "CEFR-J"],
  ["bioluminescent", "adjective", "مضيء حيوياً؛ ينتج ضوءاً طبيعياً", "Many bioluminescent creatures live in the deep sea.", "تعيش كثير من الكائنات المضيئة حيوياً في أعماق البحر.", "extended", "B2", "COCA"],
  ["sonar", "noun", "سونار؛ جهاز كشف بالموجات الصوتية", "Sonar is used to map the ocean floor.", "يُستخدم السونار لرسم خرائط قاع المحيط.", "core", "B2", "CEFR-J"],
  ["plankton", "noun", "عوالق؛ كائنات مجهرية طافية في الماء", "Plankton form the base of the marine food chain.", "تشكل العوالق قاعدة السلسلة الغذائية البحرية.", "core", "B1", "CEFR-J"],
  ["salinity", "noun", "ملوحة؛ نسبة الأملاح في الماء", "Ocean salinity varies depending on location and depth.", "تختلف ملوحة المحيط حسب الموقع والعمق.", "extended", "B2", "COCA"],
  ["continental shelf", "noun", "الجرف القاري", "Rich fishing grounds exist on the continental shelf.", "توجد مناطق صيد غنية على الجرف القاري.", "core", "B2", "COCA"],
  ["sediment", "noun", "رواسب؛ مواد مترسبة في قاع المياه", "Ocean sediment contains clues about ancient climates.", "تحتوي الرواسب المحيطية على أدلة حول المناخات القديمة.", "core", "B2", "CEFR-J"],
  ["seamount", "noun", "جبل بحري تحت الماء", "A seamount rises thousands of meters from the ocean floor.", "يرتفع الجبل البحري آلاف الأمتار من قاع المحيط.", "extended", "B2", "COCA"],
  ["thermohaline", "adjective", "حراري ملحي؛ متعلق بتيارات المحيط العميقة", "Thermohaline circulation drives global ocean currents.", "تحرّك الدورة الحرارية الملحية تيارات المحيط العالمية.", "mastery", "C1", "COCA"],
  ["tectonic", "adjective", "تكتوني؛ متعلق بحركة الصفائح الأرضية", "Tectonic activity creates underwater mountain ranges.", "يُنشئ النشاط التكتوني سلاسل جبلية تحت الماء.", "extended", "B2", "COCA"],
  ["pelagic", "adjective", "سطحي بحري؛ متعلق بالمياه المفتوحة", "Pelagic fish include tuna and mackerel.", "تشمل الأسماك السطحية التونة والماكريل.", "extended", "B2", "COCA"],
  ["reef", "noun", "شعاب مرجانية أو صخرية", "Coral reefs are among the most biodiverse ecosystems.", "الشعاب المرجانية من أكثر الأنظمة البيئية تنوعاً.", "core", "B1", "CEFR-J"],
  ["marine biologist", "noun", "عالم أحياء بحرية", "The marine biologist discovered a new species of jellyfish.", "اكتشف عالم الأحياء البحرية نوعاً جديداً من قناديل البحر.", "core", "B1", "CEFR-J"],
  ["cephalopod", "noun", "رأسيات الأرجل كالأخطبوط والحبار", "Cephalopods are known for their intelligence.", "تُعرف رأسيات الأرجل بذكائها.", "extended", "B2", "COCA"],
  ["upwelling", "noun", "تيار صاعد؛ صعود مياه عميقة باردة للسطح", "Upwelling brings nutrient-rich water to the surface.", "يجلب التيار الصاعد مياهاً غنية بالمغذيات إلى السطح.", "extended", "B2", "COCA"],
  ["euphotic", "adjective", "ضوئي؛ المنطقة التي يصلها ضوء الشمس في المحيط", "The euphotic zone extends to about 200 meters deep.", "تمتد المنطقة الضوئية إلى حوالي 200 متر عمقاً.", "mastery", "C1", "COCA"],
  ["oceanic ridge", "noun", "سلسلة جبال وسط المحيط", "The Mid-Atlantic oceanic ridge stretches for thousands of kilometers.", "تمتد سلسلة جبال وسط الأطلسي لآلاف الكيلومترات.", "extended", "B2", "COCA"],
  ["decompression", "noun", "تخفيف الضغط؛ عملية تعديل ضغط الجسم تدريجياً", "Divers must follow decompression procedures when ascending.", "يجب على الغواصين اتباع إجراءات تخفيف الضغط عند الصعود.", "core", "B2", "COCA"],
  ["invertebrate", "noun", "لافقاري؛ كائن بدون عمود فقري", "Most deep-sea creatures are invertebrates.", "معظم كائنات أعماق البحار لافقاريات.", "core", "B2", "CEFR-J"],
];

// ============================================================
// UNIT 3: Food Security & Agriculture
// ============================================================
const unit3 = [
  ["monoculture", "noun", "زراعة أحادية؛ زراعة محصول واحد فقط", "Monoculture farming depletes soil nutrients over time.", "تستنزف الزراعة الأحادية مغذيات التربة بمرور الوقت.", "extended", "B2", "COCA"],
  ["aquaponics", "noun", "زراعة مائية مدمجة مع تربية الأسماك", "Aquaponics combines fish farming with plant cultivation.", "تجمع الزراعة المائية المدمجة بين تربية الأسماك وزراعة النباتات.", "extended", "B2", "COCA"],
  ["desertification", "noun", "تصحّر؛ تحوّل الأراضي الخصبة إلى صحراء", "Desertification threatens millions of hectares of farmland.", "يهدد التصحّر ملايين الهكتارات من الأراضي الزراعية.", "core", "B2", "AWL"],
  ["granary", "noun", "مخزن حبوب؛ صومعة", "The granary was filled with wheat after the harvest.", "امتلأت صومعة الحبوب بالقمح بعد الحصاد.", "extended", "B2", "NAWL"],
  ["pollinator", "noun", "ملقّح؛ كائن ينقل حبوب اللقاح", "Bees are the most important pollinators for crops.", "النحل أهم الملقّحات للمحاصيل.", "core", "B2", "COCA"],
  ["subsistence", "adjective", "كفافي؛ يكفي بالكاد لسد الحاجة", "Subsistence farming produces just enough to feed the family.", "تنتج الزراعة الكفافية ما يكفي بالكاد لإطعام الأسرة.", "core", "B2", "AWL"],
  ["arable", "adjective", "صالح للزراعة", "Only a small percentage of the land is arable.", "نسبة صغيرة فقط من الأرض صالحة للزراعة.", "core", "B2", "CEFR-J"],
  ["famine", "noun", "مجاعة؛ نقص حاد في الغذاء", "The famine affected millions across the region.", "أثرت المجاعة على الملايين في المنطقة.", "core", "B2", "CEFR-J"],
  ["irrigation", "noun", "ري؛ توصيل المياه للأراضي الزراعية", "Modern irrigation systems save a lot of water.", "توفر أنظمة الري الحديثة كثيراً من المياه.", "core", "B2", "CEFR-J"],
  ["pesticide", "noun", "مبيد حشري أو آفات", "Overuse of pesticides harms beneficial insects.", "الإفراط في استخدام المبيدات يضر بالحشرات النافعة.", "core", "B2", "CEFR-J"],
  ["hydroponics", "noun", "زراعة مائية بدون تربة", "Hydroponics allows farming in areas with poor soil.", "تتيح الزراعة المائية الزراعة في مناطق ذات تربة فقيرة.", "extended", "B2", "COCA"],
  ["crop rotation", "noun", "دورة زراعية؛ تناوب المحاصيل", "Crop rotation helps maintain soil fertility.", "تساعد الدورة الزراعية في الحفاظ على خصوبة التربة.", "core", "B1", "CEFR-J"],
  ["topsoil", "noun", "التربة السطحية الخصبة", "Wind erosion can strip away valuable topsoil.", "يمكن لتعرية الرياح إزالة التربة السطحية القيمة.", "extended", "B2", "NAWL"],
  ["herbicide", "noun", "مبيد أعشاب ضارة", "The farmer applied herbicide to control weeds.", "استخدم المزارع مبيد الأعشاب للسيطرة على الحشائش.", "core", "B2", "COCA"],
  ["yield", "noun", "محصول؛ كمية الإنتاج الزراعي", "This year's wheat yield exceeded expectations.", "تجاوز محصول القمح هذا العام التوقعات.", "core", "B1", "CEFR-J"],
  ["agronomist", "noun", "مهندس زراعي؛ عالم زراعة", "The agronomist recommended drought-resistant varieties.", "أوصى المهندس الزراعي بأصناف مقاومة للجفاف.", "extended", "B2", "COCA"],
  ["compost", "noun", "سماد عضوي متحلل", "Compost enriches the soil with essential nutrients.", "يغني السماد العضوي التربة بمغذيات أساسية.", "core", "B1", "CEFR-J"],
  ["drought-resistant", "adjective", "مقاوم للجفاف", "Scientists developed drought-resistant rice varieties.", "طوّر العلماء أصناف أرز مقاومة للجفاف.", "extended", "B2", "COCA"],
  ["tillage", "noun", "حراثة؛ تقليب التربة", "No-tillage farming reduces soil erosion.", "تقلل الزراعة بدون حراثة من تآكل التربة.", "extended", "B2", "NAWL"],
  ["silage", "noun", "علف محفوظ؛ سيلاج", "Silage is stored in silos for winter feeding.", "يُخزن العلف المحفوظ في الصوامع للتغذية الشتوية.", "extended", "B2", "NAWL"],
  ["terracing", "noun", "الزراعة المدرّجة على التلال", "Terracing prevents soil erosion on steep hillsides.", "تمنع الزراعة المدرّجة تآكل التربة على التلال الشديدة.", "extended", "B2", "COCA"],
  ["germplasm", "noun", "المادة الوراثية للنباتات المحفوظة", "Seed banks preserve germplasm for future generations.", "تحفظ بنوك البذور المادة الوراثية للأجيال القادمة.", "mastery", "C1", "COCA"],
  ["agroforestry", "noun", "الحراجة الزراعية؛ دمج الأشجار مع الزراعة", "Agroforestry improves biodiversity on farmland.", "تحسّن الحراجة الزراعية التنوع البيولوجي في الأراضي الزراعية.", "mastery", "C1", "COCA"],
  ["food sovereignty", "noun", "السيادة الغذائية؛ حق الشعوب في تحديد نظامها الغذائي", "Food sovereignty empowers communities to choose their own crops.", "تمكّن السيادة الغذائية المجتمعات من اختيار محاصيلها.", "extended", "B2", "AWL"],
  ["salinization", "noun", "تملّح التربة", "Salinization of farmland is a growing problem in arid regions.", "تملّح الأراضي الزراعية مشكلة متنامية في المناطق الجافة.", "mastery", "C1", "COCA"],
];

// ============================================================
// UNIT 4: Biomimicry & Nature-Inspired Design
// ============================================================
const unit4 = [
  ["exoskeleton", "noun", "هيكل خارجي؛ بنية دعم خارجية", "Robotic exoskeletons help paralyzed patients walk again.", "تساعد الهياكل الخارجية الروبوتية المرضى المشلولين على المشي مجدداً.", "extended", "B2", "COCA"],
  ["photosynthetic", "adjective", "ضوئي تمثيلي؛ متعلق بعملية التمثيل الضوئي", "Photosynthetic panels mimic how leaves capture sunlight.", "تحاكي الألواح الضوئية طريقة التقاط الأوراق لأشعة الشمس.", "extended", "B2", "COCA"],
  ["tensile", "adjective", "شدّي؛ متعلق بمقاومة الشد", "Spider silk has extraordinary tensile strength.", "يتمتع حرير العنكبوت بقوة شد استثنائية.", "extended", "B2", "NAWL"],
  ["aerodynamic", "adjective", "انسيابي؛ مصمم لتقليل مقاومة الهواء", "The car's aerodynamic shape reduces fuel consumption.", "يقلل الشكل الانسيابي للسيارة من استهلاك الوقود.", "core", "B2", "CEFR-J"],
  ["camouflage", "noun", "تمويه؛ تقنية الإخفاء في البيئة المحيطة", "Military uniforms use camouflage patterns inspired by nature.", "تستخدم الزي العسكري أنماط تمويه مستوحاة من الطبيعة.", "core", "B2", "CEFR-J"],
  ["biomimicry", "noun", "محاكاة حيوية؛ تقليد تصاميم الطبيعة", "Biomimicry has led to many engineering breakthroughs.", "أدت المحاكاة الحيوية إلى اختراقات هندسية كثيرة.", "core", "B2", "COCA"],
  ["adhesion", "noun", "التصاق؛ قوة التماسك بين سطحين", "Gecko-inspired adhesion allows robots to climb walls.", "يسمح الالتصاق المستوحى من الوزغ للروبوتات بتسلق الجدران.", "extended", "B2", "NAWL"],
  ["hydrophobic", "adjective", "طارد للماء؛ لا يمتص الماء", "Lotus leaves have a hydrophobic surface that repels water.", "تتميز أوراق اللوتس بسطح طارد للماء.", "extended", "B2", "COCA"],
  ["resilient", "adjective", "مرن؛ قادر على التعافي بسرعة", "Bamboo is both lightweight and remarkably resilient.", "الخيزران خفيف الوزن ومرن بشكل ملحوظ.", "core", "B2", "AWL"],
  ["adaptation", "noun", "تكيّف؛ تغيّر للملاءمة مع البيئة", "Nature's adaptations inspire cutting-edge technology.", "تلهم تكيّفات الطبيعة التكنولوجيا المتطورة.", "core", "B1", "CEFR-J"],
  ["streamlined", "adjective", "انسيابي؛ مصمم للحركة السلسة", "Dolphins have a streamlined body that reduces drag.", "يتميز الدلفين بجسم انسيابي يقلل المقاومة.", "core", "B2", "CEFR-J"],
  ["permeable", "adjective", "نفاذ؛ يسمح بمرور السوائل أو الغازات", "The membrane is selectively permeable to certain molecules.", "الغشاء نفاذ بشكل انتقائي لجزيئات معينة.", "extended", "B2", "COCA"],
  ["iridescent", "adjective", "متقزّح؛ يعكس ألواناً متغيرة", "Butterfly wings have an iridescent quality that inspires designers.", "تتميز أجنحة الفراشات بخاصية التقزّح التي تلهم المصممين.", "extended", "B2", "COCA"],
  ["structural", "adjective", "هيكلي؛ متعلق بالبنية", "Structural coloring in birds requires no pigments.", "لا يحتاج التلوين الهيكلي في الطيور إلى أصباغ.", "core", "B2", "AWL"],
  ["lightweight", "adjective", "خفيف الوزن", "Engineers developed a lightweight material inspired by bone structure.", "طوّر المهندسون مادة خفيفة الوزن مستوحاة من بنية العظام.", "core", "B1", "CEFR-J"],
  ["echolocation", "noun", "تحديد الموقع بالصدى", "Bats use echolocation to navigate in complete darkness.", "تستخدم الخفافيش تحديد الموقع بالصدى للتنقل في الظلام التام.", "extended", "B2", "COCA"],
  ["thermoregulation", "noun", "تنظيم حراري؛ ضبط حرارة الجسم", "Termite mounds demonstrate efficient thermoregulation.", "تُظهر تلال النمل الأبيض تنظيماً حرارياً فعالاً.", "mastery", "C1", "COCA"],
  ["pollination", "noun", "تلقيح؛ نقل حبوب اللقاح", "Drone technology now assists with pollination of crops.", "تساعد تقنية الطائرات المسيّرة الآن في تلقيح المحاصيل.", "core", "B2", "COCA"],
  ["venation", "noun", "تعرّق؛ نمط العروق في الأوراق أو الأجنحة", "Leaf venation patterns inspire efficient network designs.", "تلهم أنماط تعرّق الأوراق تصاميم شبكات فعالة.", "mastery", "C1", "COCA"],
  ["buoyancy", "noun", "طفو؛ قوة دفع السائل للأجسام", "Fish control their buoyancy using a swim bladder.", "تتحكم الأسماك في طفوها باستخدام المثانة الهوائية.", "extended", "B2", "COCA"],
  ["composite", "noun", "مادة مركّبة من عدة مكونات", "Natural composites like nacre are incredibly tough.", "المواد المركّبة الطبيعية كالصدف قوية بشكل لا يصدق.", "core", "B2", "AWL"],
  ["propulsion", "noun", "دفع؛ قوة تحريك للأمام", "Jellyfish propulsion has inspired underwater robot design.", "ألهم دفع قنديل البحر تصميم الروبوتات تحت الماء.", "extended", "B2", "COCA"],
  ["morphology", "noun", "علم الشكل؛ دراسة بنية الكائنات", "Studying insect morphology reveals new design principles.", "تكشف دراسة شكل الحشرات مبادئ تصميم جديدة.", "mastery", "C1", "AWL"],
  ["symbiosis", "noun", "تكافل؛ علاقة تبادل منفعة بين كائنين", "Biomimicry researchers study symbiosis for sustainable solutions.", "يدرس باحثو المحاكاة الحيوية التكافل لإيجاد حلول مستدامة.", "extended", "B2", "COCA"],
  ["porous", "adjective", "مسامي؛ به ثقوب صغيرة تسمح بالنفاذ", "Porous materials inspired by sponges filter water efficiently.", "تُرشّح المواد المسامية المستوحاة من الإسفنج الماء بكفاءة.", "extended", "B2", "COCA"],
];

// ============================================================
// UNIT 5: Human Migration & Diaspora
// ============================================================
const unit5 = [
  ["repatriation", "noun", "إعادة إلى الوطن", "The government organized the repatriation of stranded citizens.", "نظمت الحكومة إعادة المواطنين العالقين إلى وطنهم.", "extended", "B2", "AWL"],
  ["xenophobia", "noun", "كراهية الأجانب؛ رهاب الغرباء", "Xenophobia often increases during economic downturns.", "غالباً ما تزداد كراهية الأجانب أثناء الانكماش الاقتصادي.", "extended", "B2", "COCA"],
  ["remittance", "noun", "حوالة مالية يرسلها مغترب لوطنه", "Remittances are a major source of income for developing countries.", "الحوالات المالية مصدر دخل رئيسي للدول النامية.", "extended", "B2", "AWL"],
  ["asylum", "noun", "لجوء؛ حماية تمنحها دولة لشخص فارّ", "She applied for political asylum after fleeing her country.", "تقدمت بطلب لجوء سياسي بعد فرارها من بلدها.", "core", "B2", "CEFR-J"],
  ["acculturation", "noun", "تثاقف؛ تبنّي ثقافة جديدة تدريجياً", "Acculturation is a gradual process for most immigrants.", "التثاقف عملية تدريجية لمعظم المهاجرين.", "extended", "B2", "AWL"],
  ["diaspora", "noun", "شتات؛ مجتمع مهاجر بعيد عن وطنه", "The Lebanese diaspora spans every continent.", "ينتشر الشتات اللبناني عبر كل القارات.", "core", "B2", "COCA"],
  ["deportation", "noun", "ترحيل؛ إبعاد قسري من بلد", "Deportation orders were issued for undocumented workers.", "صدرت أوامر ترحيل للعمال غير الموثقين.", "core", "B2", "CEFR-J"],
  ["assimilation", "noun", "اندماج؛ ذوبان في المجتمع الجديد", "Full assimilation can take several generations.", "قد يستغرق الاندماج الكامل عدة أجيال.", "core", "B2", "AWL"],
  ["displacement", "noun", "تهجير؛ إجبار على ترك المكان", "War caused the displacement of millions of people.", "تسببت الحرب في تهجير ملايين الأشخاص.", "core", "B2", "AWL"],
  ["naturalization", "noun", "تجنيس؛ منح الجنسية لأجنبي", "Naturalization requires passing a citizenship test.", "يتطلب التجنيس اجتياز اختبار المواطنة.", "extended", "B2", "COCA"],
  ["stateless", "adjective", "عديم الجنسية", "Stateless people lack basic legal protections.", "يفتقر عديمو الجنسية إلى الحماية القانونية الأساسية.", "extended", "B2", "COCA"],
  ["expatriate", "noun", "مغترب؛ شخص يعيش خارج وطنه", "Many expatriates maintain strong ties with their homeland.", "يحتفظ كثير من المغتربين بروابط قوية مع أوطانهم.", "core", "B2", "CEFR-J"],
  ["refugee", "noun", "لاجئ؛ شخص فرّ من بلده بسبب خطر", "The refugee camp provided shelter for thousands.", "وفّر مخيم اللاجئين مأوى لآلاف الأشخاص.", "core", "B1", "CEFR-J"],
  ["integration", "noun", "اندماج اجتماعي مع الحفاظ على الهوية", "Successful integration benefits both immigrants and host societies.", "يفيد الاندماج الناجح المهاجرين والمجتمعات المضيفة.", "core", "B2", "AWL"],
  ["emigrate", "verb", "هاجر؛ غادر وطنه للعيش في بلد آخر", "Thousands emigrate each year in search of better opportunities.", "يهاجر آلاف الأشخاص كل عام بحثاً عن فرص أفضل.", "core", "B2", "CEFR-J"],
  ["trafficking", "noun", "اتجار بالبشر أو تهريب", "Human trafficking is a grave violation of human rights.", "الاتجار بالبشر انتهاك جسيم لحقوق الإنسان.", "extended", "B2", "COCA"],
  ["sanctuary", "noun", "ملاذ آمن؛ مكان حماية", "The church served as a sanctuary for refugees.", "كانت الكنيسة ملاذاً آمناً للاجئين.", "core", "B2", "CEFR-J"],
  ["visa", "noun", "تأشيرة؛ إذن دخول رسمي لبلد", "She needed a work visa to stay in the country.", "احتاجت إلى تأشيرة عمل للبقاء في البلد.", "core", "B1", "CEFR-J"],
  ["clandestine", "adjective", "سري؛ يتم خفية وبشكل غير قانوني", "Clandestine border crossings are extremely dangerous.", "عمليات عبور الحدود السرية خطيرة للغاية.", "extended", "B2", "COCA"],
  ["resettlement", "noun", "إعادة توطين في مكان جديد", "The resettlement program helped families start new lives.", "ساعد برنامج إعادة التوطين العائلات على بدء حياة جديدة.", "extended", "B2", "COCA"],
  ["enclave", "noun", "جيب؛ منطقة يسكنها مجتمع محدد", "The immigrant enclave preserved their cultural traditions.", "حافظ الجيب المهاجر على تقاليدهم الثقافية.", "extended", "B2", "COCA"],
  ["exile", "noun", "منفى؛ إبعاد قسري عن الوطن", "The writer spent twenty years in exile abroad.", "أمضى الكاتب عشرين عاماً في المنفى خارج وطنه.", "core", "B2", "CEFR-J"],
  ["multiculturalism", "noun", "تعددية ثقافية", "Multiculturalism enriches society through diverse perspectives.", "تُثري التعددية الثقافية المجتمع من خلال وجهات نظر متنوعة.", "core", "B2", "COCA"],
  ["persecution", "noun", "اضطهاد؛ معاملة قاسية بسبب الهوية", "Religious persecution drove many to seek asylum.", "دفع الاضطهاد الديني كثيرين لطلب اللجوء.", "core", "B2", "COCA"],
  ["quota", "noun", "حصة؛ عدد محدد مسموح به", "The immigration quota limits the number of new arrivals.", "تحدّ حصة الهجرة من عدد الوافدين الجدد.", "core", "B2", "AWL"],
];

// ============================================================
// UNIT 6: Cryptocurrency & Digital Finance
// ============================================================
const unit6 = [
  ["decentralized", "adjective", "لامركزي؛ غير خاضع لسلطة واحدة", "Decentralized networks have no single point of failure.", "لا تملك الشبكات اللامركزية نقطة فشل واحدة.", "core", "B2", "COCA"],
  ["cryptographic", "adjective", "تشفيري؛ متعلق بعلم التشفير", "Cryptographic algorithms protect digital transactions.", "تحمي خوارزميات التشفير المعاملات الرقمية.", "extended", "B2", "COCA"],
  ["stablecoin", "noun", "عملة مستقرة مرتبطة بأصل ثابت", "Stablecoins are pegged to traditional currencies like the dollar.", "العملات المستقرة مرتبطة بعملات تقليدية كالدولار.", "extended", "B2", "COCA"],
  ["tokenize", "verb", "ترميز؛ تحويل أصل لرمز رقمي", "Companies can tokenize real estate for fractional ownership.", "يمكن للشركات ترميز العقارات للملكية الجزئية.", "extended", "B2", "COCA"],
  ["consensus", "noun", "إجماع؛ اتفاق جماعي على صحة العملية", "Blockchain relies on consensus mechanisms to validate transactions.", "يعتمد البلوكتشين على آليات الإجماع للتحقق من المعاملات.", "core", "B2", "AWL"],
  ["blockchain", "noun", "سلسلة كتل؛ سجل رقمي موزع وآمن", "Blockchain technology ensures transparency and security.", "تضمن تقنية سلسلة الكتل الشفافية والأمان.", "core", "B2", "COCA"],
  ["ledger", "noun", "سجل حسابات؛ دفتر أستاذ", "A distributed ledger records all transactions permanently.", "يسجل السجل الموزع جميع المعاملات بشكل دائم.", "core", "B2", "NAWL"],
  ["volatile", "adjective", "متقلّب؛ يتغير بسرعة وبشكل غير متوقع", "Cryptocurrency prices are extremely volatile.", "أسعار العملات المشفرة متقلبة للغاية.", "core", "B2", "COCA"],
  ["wallet", "noun", "محفظة رقمية لتخزين العملات المشفرة", "Keep your private keys safe in a hardware wallet.", "احتفظ بمفاتيحك الخاصة بأمان في محفظة مادية.", "core", "B1", "CEFR-J"],
  ["mining", "noun", "تعدين؛ عملية حل معادلات للتحقق من المعاملات", "Bitcoin mining consumes enormous amounts of electricity.", "يستهلك تعدين البيتكوين كميات هائلة من الكهرباء.", "core", "B2", "CEFR-J"],
  ["hash", "noun", "تجزئة؛ بصمة رقمية فريدة لبيانات", "Each block contains a unique hash identifier.", "يحتوي كل كتلة على معرّف تجزئة فريد.", "extended", "B2", "COCA"],
  ["smart contract", "noun", "عقد ذكي ينفذ تلقائياً عند تحقق الشروط", "Smart contracts eliminate the need for intermediaries.", "تلغي العقود الذكية الحاجة إلى الوسطاء.", "extended", "B2", "COCA"],
  ["liquidity", "noun", "سيولة؛ سهولة تحويل الأصل لنقد", "High liquidity means assets can be traded quickly.", "تعني السيولة العالية إمكانية تداول الأصول بسرعة.", "core", "B2", "AWL"],
  ["fork", "noun", "تفرّع؛ انقسام في سلسلة الكتل", "A hard fork creates a completely new cryptocurrency.", "ينشئ التفرّع الصلب عملة مشفرة جديدة تماماً.", "extended", "B2", "COCA"],
  ["defi", "noun", "التمويل اللامركزي", "DeFi platforms offer lending without traditional banks.", "تقدم منصات التمويل اللامركزي إقراضاً بدون بنوك تقليدية.", "extended", "B2", "COCA"],
  ["node", "noun", "عقدة؛ حاسوب متصل بشبكة البلوكتشين", "Each node stores a complete copy of the blockchain.", "تخزن كل عقدة نسخة كاملة من سلسلة الكتل.", "core", "B2", "COCA"],
  ["peer-to-peer", "adjective", "نظير لنظير؛ تبادل مباشر بين طرفين", "Peer-to-peer transactions bypass traditional banks.", "تتجاوز معاملات نظير لنظير البنوك التقليدية.", "core", "B2", "COCA"],
  ["encryption", "noun", "تشفير؛ تحويل البيانات لصيغة سرية", "Strong encryption protects sensitive financial data.", "يحمي التشفير القوي البيانات المالية الحساسة.", "core", "B2", "COCA"],
  ["airdrop", "noun", "توزيع مجاني لعملات مشفرة", "The airdrop distributed free tokens to early supporters.", "وزّع الإسقاط الجوي رموزاً مجانية للداعمين الأوائل.", "extended", "B2", "COCA"],
  ["staking", "noun", "تكديس؛ قفل العملات لدعم الشبكة مقابل مكافآت", "Staking rewards users for helping secure the network.", "يكافئ التكديس المستخدمين لمساعدتهم في تأمين الشبكة.", "extended", "B2", "COCA"],
  ["whitepaper", "noun", "ورقة بيضاء؛ وثيقة تقنية لمشروع رقمي", "Investors should read the whitepaper before committing funds.", "يجب على المستثمرين قراءة الورقة البيضاء قبل تخصيص الأموال.", "extended", "B2", "NAWL"],
  ["altcoin", "noun", "عملة بديلة؛ أي عملة مشفرة غير البيتكوين", "Ethereum is the most popular altcoin by market cap.", "الإيثريوم أشهر عملة بديلة من حيث القيمة السوقية.", "extended", "B2", "COCA"],
  ["immutable", "adjective", "غير قابل للتغيير", "Blockchain records are immutable once confirmed.", "سجلات البلوكتشين غير قابلة للتغيير بعد تأكيدها.", "extended", "B2", "AWL"],
  ["scalability", "noun", "قابلية التوسع؛ القدرة على التعامل مع نمو الاستخدام", "Scalability remains a key challenge for blockchain networks.", "تبقى قابلية التوسع تحدياً رئيسياً لشبكات البلوكتشين.", "extended", "B2", "COCA"],
  ["custodial", "adjective", "حفظي؛ تحتفظ جهة خارجية بالأصول نيابة عنك", "Custodial wallets are managed by a third party.", "تُدار المحافظ الحفظية من قبل طرف ثالث.", "extended", "B2", "NAWL"],
];

// ============================================================
// UNIT 7: Crowd Psychology & Social Influence
// ============================================================
const unit7 = [
  ["deindividuation", "noun", "فقدان الهوية الفردية في الحشد", "Deindividuation can lead to impulsive behavior in crowds.", "يمكن أن يؤدي فقدان الهوية الفردية إلى سلوك اندفاعي في الحشود.", "mastery", "C1", "COCA"],
  ["groupthink", "noun", "التفكير الجماعي؛ قمع الآراء المخالفة لصالح الإجماع", "Groupthink led the team to ignore obvious warning signs.", "أدى التفكير الجماعي بالفريق إلى تجاهل علامات تحذير واضحة.", "extended", "B2", "COCA"],
  ["polarization", "noun", "استقطاب؛ انقسام حاد في الآراء", "Social media contributes to political polarization.", "تساهم وسائل التواصل الاجتماعي في الاستقطاب السياسي.", "core", "B2", "COCA"],
  ["conformity", "noun", "امتثال؛ تغيير السلوك ليتوافق مع الجماعة", "Social conformity pressure can override personal judgment.", "يمكن لضغط الامتثال الاجتماعي أن يتغلب على الحكم الشخصي.", "core", "B2", "AWL"],
  ["scapegoat", "noun", "كبش فداء؛ شخص يُلام على أخطاء الآخرين", "Minorities are often made scapegoats during crises.", "غالباً ما تُجعل الأقليات كبش فداء أثناء الأزمات.", "core", "B2", "COCA"],
  ["bystander effect", "noun", "تأثير المتفرج؛ عدم التدخل بوجود آخرين", "The bystander effect explains why nobody called for help.", "يفسر تأثير المتفرج لماذا لم يطلب أحد المساعدة.", "extended", "B2", "COCA"],
  ["propaganda", "noun", "دعاية؛ نشر معلومات مضللة للتأثير", "Propaganda manipulates public opinion through emotional appeals.", "تتلاعب الدعاية بالرأي العام من خلال النداءات العاطفية.", "core", "B2", "CEFR-J"],
  ["herd mentality", "noun", "عقلية القطيع؛ اتباع الأغلبية دون تفكير", "Herd mentality drives panic buying during emergencies.", "تدفع عقلية القطيع الشراء بذعر أثناء حالات الطوارئ.", "extended", "B2", "COCA"],
  ["obedience", "noun", "طاعة؛ الامتثال لأوامر السلطة", "Milgram's experiment revealed shocking levels of obedience.", "كشفت تجربة ميلغرام مستويات صادمة من الطاعة.", "core", "B2", "CEFR-J"],
  ["cognitive dissonance", "noun", "تنافر معرفي؛ توتر بسبب تناقض المعتقدات", "Cognitive dissonance makes people rationalize bad decisions.", "يجعل التنافر المعرفي الناس يبررون القرارات السيئة.", "extended", "B2", "COCA"],
  ["mob", "noun", "حشد هائج؛ غوغاء", "The mob turned violent after the controversial verdict.", "تحوّل الحشد الهائج إلى العنف بعد الحكم المثير للجدل.", "core", "B1", "CEFR-J"],
  ["charismatic", "adjective", "كاريزمي؛ يتمتع بجاذبية شخصية قوية", "Charismatic leaders can inspire both devotion and fanaticism.", "يمكن للقادة الكاريزميين إلهام الإخلاص والتعصب معاً.", "core", "B2", "CEFR-J"],
  ["compliance", "noun", "امتثال؛ الموافقة على طلب أو قاعدة", "Social compliance increases when authority figures are present.", "يزداد الامتثال الاجتماعي عند وجود شخصيات ذات سلطة.", "core", "B2", "AWL"],
  ["manipulation", "noun", "تلاعب؛ التأثير على الآخرين بطرق غير أخلاقية", "Emotional manipulation is a common tactic of cult leaders.", "التلاعب العاطفي تكتيك شائع لقادة الطوائف.", "core", "B2", "COCA"],
  ["anonymity", "noun", "إخفاء الهوية", "Online anonymity can encourage aggressive behavior.", "يمكن لإخفاء الهوية عبر الإنترنت تشجيع السلوك العدواني.", "extended", "B2", "COCA"],
  ["dissent", "noun", "معارضة؛ اختلاف علني في الرأي", "Suppressing dissent strengthens groupthink.", "يعزز قمع المعارضة التفكير الجماعي.", "extended", "B2", "AWL"],
  ["radicalization", "noun", "تطرف؛ تبنّي أفكار متشددة", "Radicalization often occurs gradually through social networks.", "يحدث التطرف غالباً بشكل تدريجي عبر الشبكات الاجتماعية.", "extended", "B2", "COCA"],
  ["persuasion", "noun", "إقناع؛ التأثير على معتقدات شخص", "The art of persuasion relies on ethos, pathos, and logos.", "يعتمد فن الإقناع على المصداقية والعاطفة والمنطق.", "core", "B2", "CEFR-J"],
  ["social proof", "noun", "دليل اجتماعي؛ الاعتماد على سلوك الآخرين", "Advertisers use social proof to influence buying decisions.", "يستخدم المعلنون الدليل الاجتماعي للتأثير على قرارات الشراء.", "extended", "B2", "COCA"],
  ["suggestibility", "noun", "قابلية الإيحاء؛ سهولة التأثر بآراء الآخرين", "High suggestibility makes individuals vulnerable to misinformation.", "تجعل قابلية الإيحاء العالية الأفراد عرضة للمعلومات المضللة.", "mastery", "C1", "COCA"],
  ["collective", "adjective", "جماعي؛ مشترك بين مجموعة", "Collective action can bring about significant social change.", "يمكن للعمل الجماعي إحداث تغيير اجتماعي كبير.", "core", "B2", "AWL"],
  ["authority figure", "noun", "شخصية ذات سلطة ونفوذ", "People tend to obey authority figures without question.", "يميل الناس إلى طاعة الشخصيات ذات السلطة دون تساؤل.", "core", "B2", "COCA"],
  ["tribalism", "noun", "قبلية؛ ولاء أعمى للمجموعة", "Tribalism creates an us-versus-them mentality.", "تخلق القبلية عقلية نحن ضدهم.", "extended", "B2", "COCA"],
  ["hysteria", "noun", "هستيريا؛ حالة ذعر جماعي غير عقلانية", "Mass hysteria spread after the false alarm.", "انتشرت الهستيريا الجماعية بعد الإنذار الكاذب.", "core", "B2", "COCA"],
  ["indoctrination", "noun", "تلقين؛ غرس أفكار بشكل منهجي", "Indoctrination prevents people from thinking critically.", "يمنع التلقين الناس من التفكير النقدي.", "extended", "B2", "COCA"],
];

// ============================================================
// UNIT 8: Forensic Science & Criminal Investigation
// ============================================================
const unit8 = [
  ["autopsy", "noun", "تشريح جثة لتحديد سبب الوفاة", "The autopsy revealed that the death was not accidental.", "كشف تشريح الجثة أن الوفاة لم تكن عرضية.", "core", "B2", "COCA"],
  ["ballistics", "noun", "علم المقذوفات؛ تحليل الأسلحة النارية", "Ballistics experts matched the bullet to the suspect's gun.", "طابق خبراء المقذوفات الرصاصة بسلاح المشتبه به.", "extended", "B2", "COCA"],
  ["toxicology", "noun", "علم السموم", "Toxicology tests detected poison in the victim's blood.", "كشفت اختبارات السموم عن سم في دم الضحية.", "extended", "B2", "COCA"],
  ["fingerprint", "noun", "بصمة إصبع", "The fingerprint found at the scene identified the suspect.", "حددت البصمة الموجودة في مسرح الجريمة المشتبه به.", "core", "B1", "CEFR-J"],
  ["forensic", "adjective", "جنائي؛ متعلق بالتحقيق العلمي في الجرائم", "Forensic evidence is crucial in modern criminal cases.", "الأدلة الجنائية حاسمة في القضايا الجنائية الحديثة.", "core", "B2", "COCA"],
  ["coroner", "noun", "طبيب شرعي يحدد أسباب الوفاة", "The coroner determined the cause of death was drowning.", "حدد الطبيب الشرعي أن سبب الوفاة هو الغرق.", "extended", "B2", "COCA"],
  ["suspect", "noun", "مشتبه به في ارتكاب جريمة", "The police detained the primary suspect for questioning.", "احتجزت الشرطة المشتبه به الرئيسي للاستجواب.", "core", "B1", "CEFR-J"],
  ["DNA profiling", "noun", "تحليل الحمض النووي لتحديد الهوية", "DNA profiling has exonerated many wrongly convicted people.", "برّأ تحليل الحمض النووي كثيراً من المدانين ظلماً.", "extended", "B2", "COCA"],
  ["crime scene", "noun", "مسرح الجريمة", "Investigators sealed off the crime scene immediately.", "أغلق المحققون مسرح الجريمة فوراً.", "core", "B1", "CEFR-J"],
  ["testimony", "noun", "شهادة؛ إفادة رسمية أمام المحكمة", "The witness gave compelling testimony against the defendant.", "أدلى الشاهد بشهادة مقنعة ضد المتهم.", "core", "B2", "CEFR-J"],
  ["trace evidence", "noun", "أدلة ضئيلة كالألياف والشعر", "Trace evidence such as fibers can link suspects to scenes.", "يمكن للأدلة الضئيلة كالألياف ربط المشتبه بهم بمسرح الجريمة.", "extended", "B2", "COCA"],
  ["pathologist", "noun", "أخصائي علم الأمراض", "The pathologist examined tissue samples under a microscope.", "فحص أخصائي الأمراض عينات الأنسجة تحت المجهر.", "extended", "B2", "COCA"],
  ["bloodstain", "noun", "بقعة دم", "Bloodstain pattern analysis helps reconstruct the crime.", "يساعد تحليل نمط بقع الدم في إعادة بناء الجريمة.", "core", "B2", "COCA"],
  ["modus operandi", "noun", "أسلوب العمل المعتاد للمجرم", "The serial killer had a distinctive modus operandi.", "كان للقاتل المتسلسل أسلوب عمل مميز.", "extended", "B2", "COCA"],
  ["eyewitness", "noun", "شاهد عيان", "Eyewitness accounts can be unreliable under stress.", "يمكن أن تكون روايات شهود العيان غير موثوقة تحت الضغط.", "core", "B2", "CEFR-J"],
  ["perpetrator", "noun", "مرتكب الجريمة؛ الجاني", "The perpetrator was identified through security footage.", "تم تحديد مرتكب الجريمة من خلال لقطات الأمن.", "extended", "B2", "COCA"],
  ["chain of custody", "noun", "سلسلة حفظ الأدلة؛ توثيق التعامل مع الأدلة", "Breaking the chain of custody can make evidence inadmissible.", "كسر سلسلة حفظ الأدلة يجعلها غير مقبولة في المحكمة.", "extended", "B2", "COCA"],
  ["arson", "noun", "حرق متعمّد؛ إشعال حريق جنائي", "Arson investigators found accelerant at the warehouse.", "وجد محققو الحرق المتعمد مادة مسرّعة في المستودع.", "extended", "B2", "COCA"],
  ["interrogation", "noun", "استجواب؛ طرح أسئلة مكثفة على مشتبه به", "The interrogation lasted several hours before a confession.", "استمر الاستجواب عدة ساعات قبل الاعتراف.", "core", "B2", "COCA"],
  ["circumstantial", "adjective", "ظرفي؛ غير مباشر كدليل", "The case relied heavily on circumstantial evidence.", "اعتمدت القضية بشكل كبير على أدلة ظرفية.", "extended", "B2", "COCA"],
  ["alibi", "noun", "حجة غياب؛ دليل على التواجد في مكان آخر", "The suspect had a solid alibi for the night of the crime.", "كان لدى المشتبه به حجة غياب قوية ليلة الجريمة.", "core", "B2", "CEFR-J"],
  ["surveillance", "noun", "مراقبة؛ رصد ومتابعة", "Surveillance cameras captured the entire incident.", "التقطت كاميرات المراقبة الحادثة بأكملها.", "core", "B2", "COCA"],
  ["entomology", "noun", "علم الحشرات (الجنائي لتحديد وقت الوفاة)", "Forensic entomology uses insect evidence to estimate time of death.", "يستخدم علم الحشرات الجنائي أدلة الحشرات لتقدير وقت الوفاة.", "mastery", "C1", "COCA"],
  ["cadaver", "noun", "جثة بشرية تُستخدم في التحقيق أو الدراسة", "Cadaver dogs are trained to locate human remains.", "تُدرّب كلاب الكشف عن الجثث لتحديد مواقع الرفات البشرية.", "extended", "B2", "COCA"],
  ["rigor mortis", "noun", "تيبّس الموت؛ تصلّب الجسم بعد الوفاة", "Rigor mortis helps estimate the time of death.", "يساعد تيبّس الموت في تقدير وقت الوفاة.", "mastery", "C1", "COCA"],
];

// ============================================================
// UNIT 9: Archaeological Mysteries & Lost Civilizations
// ============================================================
const unit9 = [
  ["cartouche", "noun", "خرطوش؛ إطار بيضاوي يحيط بالاسم الملكي المصري", "The cartouche on the wall contained the pharaoh's name.", "احتوى الخرطوش على الجدار على اسم الفرعون.", "mastery", "C1", "COCA"],
  ["hieroglyph", "noun", "هيروغليفية؛ رمز كتابي مصري قديم", "Champollion deciphered Egyptian hieroglyphs using the Rosetta Stone.", "فك شامبليون رموز الهيروغليفية المصرية باستخدام حجر رشيد.", "extended", "B2", "COCA"],
  ["megalith", "noun", "حجر ضخم استُخدم في بناء أثري", "Stonehenge is made of massive megaliths weighing several tons.", "بُني ستونهنج من أحجار ضخمة تزن عدة أطنان.", "extended", "B2", "COCA"],
  ["stratigraphy", "noun", "علم الطبقات؛ دراسة الطبقات الجيولوجية", "Stratigraphy helps archaeologists date artifacts by layer depth.", "يساعد علم الطبقات علماء الآثار على تأريخ القطع حسب عمق الطبقة.", "mastery", "C1", "COCA"],
  ["sarcophagus", "noun", "تابوت حجري للدفن", "The sarcophagus was decorated with elaborate carvings.", "كان التابوت الحجري مزيناً بنقوش متقنة.", "extended", "B2", "COCA"],
  ["artifact", "noun", "أثر؛ قطعة أثرية من صنع الإنسان", "The museum displayed artifacts from the Bronze Age.", "عرض المتحف قطعاً أثرية من العصر البرونزي.", "core", "B2", "CEFR-J"],
  ["excavation", "noun", "تنقيب أثري؛ حفريات", "The excavation uncovered an ancient Roman villa.", "كشفت الحفريات عن فيلا رومانية قديمة.", "core", "B2", "CEFR-J"],
  ["carbon dating", "noun", "التأريخ بالكربون المشع", "Carbon dating determined the scroll was 2,000 years old.", "حدد التأريخ بالكربون أن المخطوطة عمرها 2000 عام.", "extended", "B2", "COCA"],
  ["obelisk", "noun", "مسلة؛ عمود حجري مدبب القمة", "The obelisk stood at the entrance of the ancient temple.", "وقفت المسلة عند مدخل المعبد القديم.", "core", "B2", "COCA"],
  ["tomb", "noun", "مقبرة؛ ضريح", "The tomb of Tutankhamun was discovered in 1922.", "اكتُشفت مقبرة توت عنخ آمون عام 1922.", "core", "B1", "CEFR-J"],
  ["cuneiform", "noun", "كتابة مسمارية سومرية قديمة", "Cuneiform is one of the earliest known writing systems.", "الكتابة المسمارية من أقدم أنظمة الكتابة المعروفة.", "extended", "B2", "COCA"],
  ["ruin", "noun", "أطلال؛ بقايا بناء قديم", "The ruins of Pompeii attract millions of visitors.", "تجذب أطلال بومبي ملايين الزوار.", "core", "B1", "CEFR-J"],
  ["pottery", "noun", "فخار؛ أواني طينية مشكّلة ومحروقة", "Ancient pottery shards reveal details about daily life.", "تكشف شظايا الفخار القديم تفاصيل عن الحياة اليومية.", "core", "B1", "CEFR-J"],
  ["dynasty", "noun", "سلالة حاكمة", "The Ming Dynasty ruled China for nearly 300 years.", "حكمت سلالة مينغ الصين لما يقرب من 300 عام.", "core", "B2", "CEFR-J"],
  ["anthropologist", "noun", "عالم أنثروبولوجيا؛ متخصص في دراسة الثقافات", "The anthropologist studied burial rituals of ancient cultures.", "درس عالم الأنثروبولوجيا طقوس الدفن للثقافات القديمة.", "core", "B2", "COCA"],
  ["sphinx", "noun", "أبو الهول؛ تمثال بجسم أسد ورأس إنسان", "The Great Sphinx of Giza guards the ancient pyramids.", "يحرس أبو الهول الكبير أهرامات الجيزة القديمة.", "core", "B2", "COCA"],
  ["amulet", "noun", "تميمة؛ قطعة تُلبس للحماية", "The amulet was believed to protect the wearer from evil.", "كان يُعتقد أن التميمة تحمي من يرتديها من الشر.", "extended", "B2", "COCA"],
  ["ziggurat", "noun", "زقورة؛ معبد مدرّج في بلاد الرافدين", "The ziggurat was the centerpiece of the ancient city.", "كانت الزقورة محور المدينة القديمة.", "mastery", "C1", "COCA"],
  ["papyrus", "noun", "بردي؛ مادة كتابة مصرية قديمة", "Ancient Egyptians wrote on papyrus scrolls.", "كتب المصريون القدماء على لفائف البردي.", "core", "B2", "CEFR-J"],
  ["mummy", "noun", "مومياء؛ جثة محنطة", "The mummy was remarkably well preserved after 3,000 years.", "كانت المومياء محفوظة بشكل مذهل بعد 3000 عام.", "core", "B1", "CEFR-J"],
  ["petroglyph", "noun", "نقش صخري قديم", "Petroglyphs carved into the canyon walls depict hunting scenes.", "تصوّر النقوش الصخرية على جدران الوادي مشاهد صيد.", "mastery", "C1", "COCA"],
  ["acropolis", "noun", "أكروبوليس؛ قلعة مرتفعة في المدن اليونانية", "The Acropolis of Athens overlooks the entire city.", "يطل أكروبوليس أثينا على المدينة بأكملها.", "extended", "B2", "COCA"],
  ["inscription", "noun", "نقش كتابي على حجر أو معدن", "The inscription on the tablet described a peace treaty.", "وصف النقش على اللوح معاهدة سلام.", "core", "B2", "COCA"],
  ["necropolis", "noun", "مدينة الموتى؛ مقبرة كبيرة قديمة", "The vast necropolis contained hundreds of ancient tombs.", "احتوت مدينة الموتى الواسعة على مئات المقابر القديمة.", "mastery", "C1", "COCA"],
  ["antiquity", "noun", "العصور القديمة؛ حقبة ما قبل العصور الوسطى", "Many marvels of antiquity have been lost to time.", "فُقدت كثير من عجائب العصور القديمة بمرور الزمن.", "core", "B2", "COCA"],
];

// ============================================================
// UNIT 10: Longevity Science & Aging
// ============================================================
const unit10 = [
  ["telomere", "noun", "تيلومير؛ نهاية الكروموسوم تحمي من التآكل", "Telomere shortening is linked to cellular aging.", "يرتبط قصر التيلومير بشيخوخة الخلايا.", "extended", "C1", "COCA"],
  ["senescence", "noun", "شيخوخة خلوية؛ توقف الخلية عن الانقسام", "Cellular senescence accumulates with age.", "تتراكم الشيخوخة الخلوية مع التقدم في العمر.", "mastery", "C1", "COCA"],
  ["caloric", "adjective", "حراري؛ متعلق بالسعرات الحرارية", "Caloric restriction has been shown to extend lifespan in mice.", "ثبت أن تقييد السعرات الحرارية يطيل عمر الفئران.", "core", "B2", "CEFR-J"],
  ["autophagy", "noun", "التهام ذاتي؛ عملية تنظيف الخلية لنفسها", "Autophagy removes damaged components from cells.", "يزيل الالتهام الذاتي المكونات التالفة من الخلايا.", "mastery", "C1", "COCA"],
  ["biomarker", "noun", "مؤشر حيوي يدل على حالة صحية", "Blood biomarkers can predict the risk of age-related diseases.", "يمكن للمؤشرات الحيوية في الدم التنبؤ بخطر أمراض الشيخوخة.", "extended", "B2", "COCA"],
  ["longevity", "noun", "طول العمر", "Genetics and lifestyle both influence longevity.", "تؤثر الوراثة ونمط الحياة كلاهما على طول العمر.", "core", "B2", "COCA"],
  ["degenerative", "adjective", "تنكّسي؛ يسبب تدهوراً تدريجياً", "Alzheimer's is a degenerative disease affecting the brain.", "الزهايمر مرض تنكّسي يصيب الدماغ.", "extended", "B2", "COCA"],
  ["oxidative stress", "noun", "إجهاد تأكسدي يدمر الخلايا", "Oxidative stress damages DNA and accelerates aging.", "يدمر الإجهاد التأكسدي الحمض النووي ويسرّع الشيخوخة.", "extended", "B2", "COCA"],
  ["antioxidant", "noun", "مضاد أكسدة يحمي الخلايا من التلف", "Berries are rich in antioxidants that fight free radicals.", "التوت غني بمضادات الأكسدة التي تحارب الجذور الحرة.", "core", "B2", "CEFR-J"],
  ["regenerative", "adjective", "تجديدي؛ يعيد بناء الأنسجة", "Regenerative medicine aims to repair damaged organs.", "يهدف الطب التجديدي إلى إصلاح الأعضاء التالفة.", "extended", "B2", "COCA"],
  ["metabolism", "noun", "أيض؛ عمليات تحويل الغذاء إلى طاقة", "Metabolism slows down as people age.", "يتباطأ الأيض مع تقدم الناس في العمر.", "core", "B2", "CEFR-J"],
  ["centenarian", "noun", "معمّر؛ شخص عمره مئة عام أو أكثر", "Centenarians often share common lifestyle habits.", "يتشارك المعمّرون غالباً عادات حياتية مشتركة.", "extended", "B2", "COCA"],
  ["collagen", "noun", "كولاجين؛ بروتين يمنح البشرة مرونتها", "Collagen production decreases significantly after age 40.", "ينخفض إنتاج الكولاجين بشكل كبير بعد سن الأربعين.", "core", "B2", "COCA"],
  ["inflammation", "noun", "التهاب؛ استجابة مناعية تسبب التورم", "Chronic inflammation accelerates the aging process.", "يسرّع الالتهاب المزمن عملية الشيخوخة.", "core", "B2", "CEFR-J"],
  ["mitochondria", "noun", "ميتوكوندريا؛ مصانع الطاقة في الخلية", "Mitochondria produce most of the cell's energy.", "تنتج الميتوكوندريا معظم طاقة الخلية.", "extended", "B2", "COCA"],
  ["cognitive decline", "noun", "تدهور معرفي؛ انخفاض القدرات الذهنية", "Regular exercise can slow cognitive decline in older adults.", "يمكن للتمارين المنتظمة إبطاء التدهور المعرفي عند كبار السن.", "core", "B2", "COCA"],
  ["progeria", "noun", "شياخ مبكّر؛ مرض الشيخوخة المبكرة", "Progeria causes children to age rapidly.", "يسبب الشياخ المبكر شيخوخة سريعة عند الأطفال.", "mastery", "C1", "COCA"],
  ["epigenetic", "adjective", "فوق جيني؛ يؤثر على التعبير الجيني دون تغيير الحمض النووي", "Epigenetic changes can be influenced by diet and exercise.", "يمكن أن تتأثر التغيرات فوق الجينية بالنظام الغذائي والتمارين.", "mastery", "C1", "COCA"],
  ["dementia", "noun", "خرف؛ فقدان تدريجي للقدرات العقلية", "Dementia affects millions of elderly people worldwide.", "يصيب الخرف ملايين المسنين حول العالم.", "core", "B2", "CEFR-J"],
  ["sarcopenia", "noun", "ضمور عضلي مرتبط بالشيخوخة", "Sarcopenia causes loss of muscle mass with aging.", "يسبب الضمور العضلي فقدان الكتلة العضلية مع الشيخوخة.", "mastery", "C1", "COCA"],
  ["free radical", "noun", "جذر حر؛ جزيء غير مستقر يتلف الخلايا", "Free radicals damage cells and contribute to aging.", "تتلف الجذور الحرة الخلايا وتساهم في الشيخوخة.", "extended", "B2", "COCA"],
  ["gerontology", "noun", "علم الشيخوخة؛ دراسة عملية التقدم في العمر", "Gerontology research focuses on improving quality of life for the elderly.", "يركز بحث علم الشيخوخة على تحسين جودة حياة المسنين.", "extended", "B2", "COCA"],
  ["resveratrol", "noun", "ريسفيراترول؛ مركب طبيعي مضاد للشيخوخة", "Resveratrol found in grapes may have anti-aging properties.", "قد يمتلك الريسفيراترول الموجود في العنب خصائص مضادة للشيخوخة.", "mastery", "C1", "COCA"],
  ["osteoporosis", "noun", "هشاشة العظام", "Osteoporosis weakens bones and increases fracture risk.", "تُضعف هشاشة العظام البنية العظمية وتزيد خطر الكسور.", "core", "B2", "CEFR-J"],
  ["cryopreservation", "noun", "حفظ بالتبريد؛ تجميد الأنسجة لحفظها", "Cryopreservation aims to preserve organs for future use.", "يهدف الحفظ بالتبريد إلى حفظ الأعضاء للاستخدام المستقبلي.", "mastery", "C1", "COCA"],
];

// ============================================================
// UNIT 11: Sustainable Architecture & Green Building
// ============================================================
const unit11 = [
  ["photovoltaic", "adjective", "كهروضوئي؛ يحوّل ضوء الشمس لكهرباء", "Photovoltaic panels on the roof generate clean electricity.", "تولّد الألواح الكهروضوئية على السطح كهرباء نظيفة.", "extended", "B2", "COCA"],
  ["insulation", "noun", "عزل حراري؛ مادة تمنع انتقال الحرارة", "Proper insulation reduces heating costs by up to 40%.", "يقلل العزل الحراري المناسب تكاليف التدفئة بنسبة تصل إلى 40%.", "core", "B2", "CEFR-J"],
  ["geothermal", "adjective", "حراري أرضي؛ يستخدم حرارة باطن الأرض", "Geothermal heating uses the earth's natural warmth.", "تستخدم التدفئة الحرارية الأرضية دفء الأرض الطبيعي.", "extended", "B2", "COCA"],
  ["retrofit", "verb", "تحديث؛ إضافة تحسينات لمبنى قائم", "The city plans to retrofit old buildings for energy efficiency.", "تخطط المدينة لتحديث المباني القديمة لتحسين كفاءة الطاقة.", "extended", "B2", "COCA"],
  ["sustainable", "adjective", "مستدام؛ يلبي الحاجات دون استنزاف الموارد", "Sustainable architecture minimizes environmental impact.", "تقلل العمارة المستدامة الأثر البيئي.", "core", "B2", "AWL"],
  ["carbon footprint", "noun", "بصمة كربونية؛ إجمالي انبعاثات الكربون", "Green buildings significantly reduce their carbon footprint.", "تقلل المباني الخضراء بصمتها الكربونية بشكل كبير.", "core", "B2", "COCA"],
  ["greywater", "noun", "مياه رمادية؛ مياه مستعملة قابلة لإعادة الاستخدام", "Greywater recycling systems reuse water from sinks and showers.", "تعيد أنظمة تدوير المياه الرمادية استخدام مياه الأحواض والدش.", "extended", "B2", "COCA"],
  ["passive house", "noun", "منزل سلبي؛ مبنى بأدنى استهلاك للطاقة", "A passive house maintains comfort without active heating.", "يحافظ المنزل السلبي على الراحة دون تدفئة فعالة.", "extended", "B2", "COCA"],
  ["ventilation", "noun", "تهوية؛ تدوير الهواء داخل المبنى", "Natural ventilation reduces the need for air conditioning.", "تقلل التهوية الطبيعية الحاجة إلى تكييف الهواء.", "core", "B2", "CEFR-J"],
  ["facade", "noun", "واجهة المبنى", "The green facade is covered with climbing plants.", "الواجهة الخضراء مغطاة بنباتات متسلقة.", "core", "B2", "COCA"],
  ["rainwater harvesting", "noun", "جمع مياه الأمطار واستخدامها", "Rainwater harvesting provides water for garden irrigation.", "يوفر جمع مياه الأمطار المياه لري الحدائق.", "extended", "B2", "COCA"],
  ["embodied energy", "noun", "طاقة مضمّنة؛ الطاقة اللازمة لتصنيع المواد", "Concrete has high embodied energy compared to wood.", "يمتلك الخرسانة طاقة مضمّنة عالية مقارنة بالخشب.", "mastery", "C1", "COCA"],
  ["biodegradable", "adjective", "قابل للتحلل الحيوي", "Biodegradable materials break down naturally over time.", "تتحلل المواد القابلة للتحلل الحيوي طبيعياً بمرور الوقت.", "core", "B2", "CEFR-J"],
  ["solar gain", "noun", "مكسب شمسي؛ حرارة مكتسبة من أشعة الشمس", "Large south-facing windows maximize solar gain in winter.", "تزيد النوافذ الكبيرة المواجهة للجنوب المكسب الشمسي شتاءً.", "extended", "B2", "COCA"],
  ["thermal mass", "noun", "كتلة حرارية؛ قدرة المواد على تخزين الحرارة", "Concrete floors provide thermal mass to regulate temperature.", "توفر الأرضيات الخرسانية كتلة حرارية لتنظيم درجة الحرارة.", "extended", "B2", "COCA"],
  ["net-zero", "adjective", "صفري الانبعاثات؛ لا ينتج انبعاثات كربونية صافية", "The net-zero office building produces all its own energy.", "ينتج مبنى المكاتب صفري الانبعاثات كل طاقته بنفسه.", "extended", "B2", "COCA"],
  ["reclaimed", "adjective", "مُستَرجع؛ مُعاد استخدامه من مصادر قديمة", "Reclaimed timber gives character to modern interiors.", "يمنح الخشب المسترجع طابعاً مميزاً للديكورات الحديثة.", "core", "B2", "COCA"],
  ["daylighting", "noun", "إنارة طبيعية؛ استخدام ضوء النهار لإضاءة المباني", "Daylighting strategies reduce electricity consumption.", "تقلل استراتيجيات الإنارة الطبيعية استهلاك الكهرباء.", "extended", "B2", "COCA"],
  ["cross-ventilation", "noun", "تهوية متقاطعة من فتحات متقابلة", "Cross-ventilation cools rooms without air conditioning.", "تبرّد التهوية المتقاطعة الغرف دون تكييف.", "extended", "B2", "COCA"],
  ["energy audit", "noun", "تدقيق طاقي؛ تقييم كفاءة استهلاك الطاقة", "An energy audit identified major areas of heat loss.", "حدد التدقيق الطاقي مناطق فقدان الحرارة الرئيسية.", "core", "B2", "COCA"],
  ["green roof", "noun", "سطح أخضر مغطى بالنباتات", "Green roofs absorb rainwater and reduce urban heat.", "تمتص الأسطح الخضراء مياه الأمطار وتقلل حرارة المدن.", "core", "B2", "COCA"],
  ["hemp concrete", "noun", "خرسانة القنب؛ مادة بناء مستدامة", "Hemp concrete is lightweight and has excellent insulating properties.", "خرسانة القنب خفيفة الوزن وذات خصائص عزل ممتازة.", "mastery", "C1", "COCA"],
  ["cradle-to-cradle", "adjective", "من المهد إلى المهد؛ تصميم بدون نفايات", "Cradle-to-cradle design ensures all materials are recyclable.", "يضمن تصميم من المهد إلى المهد قابلية إعادة تدوير جميع المواد.", "mastery", "C1", "COCA"],
  ["load-bearing", "adjective", "حامل للأحمال؛ يدعم وزن البناء", "Load-bearing walls are essential to the building's structure.", "الجدران الحاملة ضرورية لهيكل المبنى.", "core", "B2", "NAWL"],
  ["microclimate", "noun", "مناخ محلي صغير يختلف عن المنطقة المحيطة", "Trees around the building create a cooler microclimate.", "تخلق الأشجار حول المبنى مناخاً محلياً أبرد.", "extended", "B2", "COCA"],
];

// ============================================================
// UNIT 12: Exoplanet Hunting & Space Exploration
// ============================================================
const unit12 = [
  ["spectrometer", "noun", "مطياف؛ جهاز تحليل الضوء لمعرفة تركيب المواد", "A spectrometer analyzes the light from distant stars.", "يحلل المطياف الضوء القادم من النجوم البعيدة.", "extended", "B2", "COCA"],
  ["habitable", "adjective", "صالح للسكن؛ يمكن العيش فيه", "Scientists search for habitable planets outside our solar system.", "يبحث العلماء عن كواكب صالحة للسكن خارج نظامنا الشمسي.", "core", "B2", "CEFR-J"],
  ["gravitational", "adjective", "جاذبي؛ متعلق بقوة الجاذبية", "Gravitational pull keeps planets in orbit around stars.", "تبقي قوة الجاذبية الكواكب في مداراتها حول النجوم.", "core", "B2", "COCA"],
  ["parsec", "noun", "فرسخ فلكي؛ وحدة لقياس المسافات الكونية", "The nearest star is about 1.3 parsecs from Earth.", "أقرب نجم يبعد حوالي 1.3 فرسخ فلكي عن الأرض.", "mastery", "C1", "COCA"],
  ["nebula", "noun", "سديم؛ سحابة كونية من الغاز والغبار", "Stars are born inside massive nebulae.", "تولد النجوم داخل السدم الضخمة.", "core", "B2", "COCA"],
  ["exoplanet", "noun", "كوكب خارجي يدور حول نجم غير الشمس", "Over 5,000 exoplanets have been confirmed to date.", "تم تأكيد أكثر من 5000 كوكب خارجي حتى الآن.", "core", "B2", "COCA"],
  ["transit method", "noun", "طريقة العبور لاكتشاف الكواكب الخارجية", "The transit method detects planets by measuring starlight dips.", "تكتشف طريقة العبور الكواكب عبر قياس انخفاض ضوء النجم.", "extended", "B2", "COCA"],
  ["light-year", "noun", "سنة ضوئية؛ المسافة التي يقطعها الضوء في سنة", "The galaxy is 100,000 light-years across.", "يبلغ قطر المجرة 100,000 سنة ضوئية.", "core", "B1", "CEFR-J"],
  ["telescope", "noun", "تلسكوب؛ منظار فلكي", "The James Webb telescope captures images of distant galaxies.", "يلتقط تلسكوب جيمس ويب صور مجرات بعيدة.", "core", "B1", "CEFR-J"],
  ["orbit", "noun", "مدار؛ المسار الدائري حول جسم فلكي", "The satellite completed one orbit around Earth every 90 minutes.", "أكمل القمر الصناعي مداراً واحداً حول الأرض كل 90 دقيقة.", "core", "B1", "CEFR-J"],
  ["red dwarf", "noun", "قزم أحمر؛ نجم صغير بارد وخافت", "Most exoplanets are found orbiting red dwarf stars.", "يُعثر على معظم الكواكب الخارجية حول نجوم القزم الأحمر.", "extended", "B2", "COCA"],
  ["atmosphere", "noun", "غلاف جوي", "Analyzing a planet's atmosphere reveals its composition.", "يكشف تحليل الغلاف الجوي للكوكب تركيبته.", "core", "B2", "CEFR-J"],
  ["radial velocity", "noun", "سرعة شعاعية؛ حركة النجم نحو الراصد أو بعيداً عنه", "Radial velocity measurements reveal hidden planets.", "تكشف قياسات السرعة الشعاعية كواكب مخفية.", "mastery", "C1", "COCA"],
  ["infrared", "adjective", "تحت أحمر؛ إشعاع حراري غير مرئي", "Infrared telescopes can detect heat from distant objects.", "يمكن لتلسكوبات الأشعة تحت الحمراء كشف الحرارة من أجسام بعيدة.", "core", "B2", "COCA"],
  ["cosmic", "adjective", "كوني؛ متعلق بالكون", "Cosmic radiation poses risks to astronauts.", "يشكل الإشعاع الكوني مخاطر على رواد الفضاء.", "core", "B2", "CEFR-J"],
  ["protoplanetary", "adjective", "كوكبي أولي؛ متعلق بقرص تكوّن الكواكب", "Protoplanetary disks contain the building blocks of planets.", "تحتوي الأقراص الكوكبية الأولية على لبنات بناء الكواكب.", "mastery", "C1", "COCA"],
  ["astrobiology", "noun", "علم الأحياء الفلكي؛ دراسة الحياة خارج الأرض", "Astrobiology investigates whether life exists beyond Earth.", "يبحث علم الأحياء الفلكي فيما إذا كانت الحياة موجودة خارج الأرض.", "extended", "B2", "COCA"],
  ["supernova", "noun", "مستعر أعظم؛ انفجار نجم ضخم", "A supernova can outshine an entire galaxy for weeks.", "يمكن للمستعر الأعظم أن يفوق سطوع مجرة بأكملها لأسابيع.", "core", "B2", "COCA"],
  ["tidal locking", "noun", "قفل مدّي؛ يظهر الكوكب وجهاً واحداً لنجمه دائماً", "Tidal locking means one side always faces the star.", "يعني القفل المدّي أن جانباً واحداً يواجه النجم دائماً.", "mastery", "C1", "COCA"],
  ["solar wind", "noun", "رياح شمسية؛ جسيمات مشحونة من الشمس", "Solar wind can strip away a planet's atmosphere.", "يمكن للرياح الشمسية تجريد الغلاف الجوي لكوكب.", "extended", "B2", "COCA"],
  ["magnetosphere", "noun", "غلاف مغناطيسي يحمي الكوكب", "Earth's magnetosphere shields us from harmful radiation.", "يحمينا الغلاف المغناطيسي للأرض من الإشعاع الضار.", "extended", "B2", "COCA"],
  ["binary star", "noun", "نجم ثنائي؛ نظام من نجمين يدوران حول بعضهما", "Some exoplanets orbit binary star systems.", "تدور بعض الكواكب الخارجية حول أنظمة نجوم ثنائية.", "extended", "B2", "COCA"],
  ["goldilocks zone", "noun", "المنطقة الصالحة للحياة حول نجم", "Planets in the Goldilocks zone could have liquid water.", "يمكن أن تحتوي الكواكب في المنطقة الصالحة للحياة على ماء سائل.", "extended", "B2", "COCA"],
  ["spectroscopy", "noun", "تحليل طيفي؛ دراسة تفاعل المادة مع الإشعاع", "Spectroscopy reveals the chemical makeup of exoplanet atmospheres.", "يكشف التحليل الطيفي التركيب الكيميائي لأغلفة الكواكب الخارجية.", "mastery", "C1", "COCA"],
  ["accretion", "noun", "تراكم؛ تجمّع المادة بفعل الجاذبية", "Planetary accretion builds worlds from dust and gas.", "يبني التراكم الكوكبي العوالم من الغبار والغاز.", "mastery", "C1", "COCA"],
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  const client = await pool.connect();
  const BATCH_ID = 16;

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

  let grandTotal = 0;
  try {
    for (const u of units) {
      const count = await insertBatch(client, u.data, u.num, BATCH_ID);
      console.log(`Unit ${u.num}: inserted ${count} words`);
      grandTotal += count;
    }
    console.log(`\nTotal inserted: ${grandTotal}\n`);

    // Per-unit counts
    const perUnit = await client.query(
      `SELECT recommended_unit, COUNT(*) AS cnt FROM public.vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit`
    );
    console.log('--- Per-unit counts in vocab_staging_l4 ---');
    for (const row of perUnit.rows) {
      console.log(`  Unit ${row.recommended_unit}: ${row.cnt}`);
    }

    // Grand total
    const total = await client.query(`SELECT COUNT(*) AS total FROM public.vocab_staging_l4`);
    console.log(`\nTotal rows in vocab_staging_l4: ${total.rows[0].total}`);
  } catch(e) {
    console.error('Fatal error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
