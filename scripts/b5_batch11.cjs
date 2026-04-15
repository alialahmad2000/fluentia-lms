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

// Each: [word, pos, definition_ar, example_en, example_ar, tier, cefr, source]

// ─── UNIT 1: Bioethics ───
const unit1 = [
  ["genome", "noun", "الجينوم؛ مجموع المادة الوراثية للكائن", "Scientists mapped the entire human genome.", "رسم العلماء خريطة الجينوم البشري بالكامل.", "extended", "C1", "COCA"],
  ["chromosome", "noun", "كروموسوم؛ صبغي يحمل الجينات", "Humans have 23 pairs of chromosomes.", "لدى البشر 23 زوجاً من الكروموسومات.", "extended", "C1", "COCA"],
  ["nucleotide", "noun", "نوكليوتيد؛ وحدة بناء الحمض النووي", "DNA is made of four types of nucleotides.", "يتكوّن الحمض النووي من أربعة أنواع من النوكليوتيدات.", "mastery", "C1", "AWL"],
  ["enzyme", "noun", "إنزيم؛ بروتين يسرّع التفاعلات الكيميائية", "The enzyme breaks down food in the stomach.", "يُحلّل الإنزيم الطعام في المعدة.", "core", "B2", "COCA"],
  ["protein", "noun", "بروتين؛ مادة غذائية أساسية لبناء الجسم", "Eggs are a good source of protein.", "البيض مصدر جيد للبروتين.", "core", "B1", "CEFR-J"],
  ["antibody", "noun", "جسم مضاد يحارب الأمراض", "The vaccine helps the body produce antibodies.", "يساعد اللقاح الجسم على إنتاج الأجسام المضادة.", "extended", "B2", "COCA"],
  ["antigen", "noun", "مستضد؛ مادة تحفّز الاستجابة المناعية", "The antigen triggered an immune response.", "حفّز المستضد استجابة مناعية.", "mastery", "C1", "AWL"],
  ["pathogen", "noun", "عامل ممرض؛ كائن يسبب المرض", "Washing hands removes harmful pathogens.", "غسل اليدين يزيل العوامل الممرضة الضارة.", "extended", "B2", "COCA"],
  ["microbe", "noun", "ميكروب؛ كائن حي دقيق", "Microbes are invisible to the naked eye.", "الميكروبات غير مرئية بالعين المجردة.", "core", "B2", "CEFR-J"],
  ["specimen", "noun", "عيّنة؛ نموذج للفحص", "The lab analyzed the blood specimen.", "حلّل المختبر عيّنة الدم.", "core", "B2", "AWL"],
  ["petri dish", "noun", "طبق بتري؛ وعاء مختبري لزراعة البكتيريا", "Bacteria were cultured in a petri dish.", "زُرعت البكتيريا في طبق بتري.", "extended", "B2", "COCA"],
  ["laboratory", "noun", "مختبر؛ مكان لإجراء التجارب العلمية", "The research was conducted in a laboratory.", "أُجري البحث في المختبر.", "core", "B1", "CEFR-J"],
  ["clinical trial", "noun", "تجربة سريرية لاختبار الأدوية", "The drug is still in clinical trials.", "لا يزال الدواء في مرحلة التجارب السريرية.", "extended", "B2", "COCA"],
  ["placebo", "noun", "دواء وهمي يُستخدم في التجارب", "Half the patients received a placebo.", "تلقّى نصف المرضى دواءً وهمياً.", "extended", "B2", "AWL"],
  ["side effect", "noun", "أثر جانبي للدواء", "Drowsiness is a common side effect.", "النعاس أثر جانبي شائع.", "core", "B2", "CEFR-J"],
  ["dosage", "noun", "جرعة؛ كمية الدواء المحددة", "The doctor adjusted the dosage.", "عدّل الطبيب الجرعة.", "core", "B2", "COCA"],
  ["prognosis", "noun", "تشخيص مستقبلي؛ توقّع سير المرض", "The prognosis for recovery is good.", "التوقعات بالشفاء جيدة.", "extended", "C1", "COCA"],
  ["remission", "noun", "هدوء المرض؛ تراجع الأعراض", "The cancer went into remission.", "دخل السرطان في مرحلة هدوء.", "extended", "B2", "COCA"],
  ["biopsy", "noun", "خزعة؛ أخذ عيّنة من نسيج حي", "The doctor ordered a biopsy of the lump.", "طلب الطبيب أخذ خزعة من الورم.", "extended", "B2", "COCA"],
  ["mammogram", "noun", "تصوير الثدي الشعاعي", "Women over 40 should get a mammogram.", "يجب أن تجري النساء فوق الأربعين تصوير ثدي شعاعي.", "extended", "B2", "COCA"],
  ["ultrasound", "noun", "تصوير بالموجات فوق الصوتية", "The ultrasound showed a healthy baby.", "أظهر التصوير بالموجات فوق الصوتية جنيناً سليماً.", "core", "B2", "CEFR-J"],
  ["MRI", "noun", "تصوير بالرنين المغناطيسي", "The MRI revealed no damage to the brain.", "لم يُظهر التصوير بالرنين المغناطيسي أي ضرر في الدماغ.", "core", "B2", "COCA"],
  ["chemotherapy", "noun", "علاج كيميائي للسرطان", "She underwent six rounds of chemotherapy.", "خضعت لست جولات من العلاج الكيميائي.", "extended", "B2", "COCA"],
  ["radiation", "noun", "إشعاع؛ طاقة تنتقل عبر موجات", "Radiation therapy targets cancer cells.", "يستهدف العلاج الإشعاعي الخلايا السرطانية.", "core", "B2", "AWL"],
  ["gene therapy", "noun", "علاج جيني؛ تعديل الجينات لعلاج الأمراض", "Gene therapy offers hope for genetic diseases.", "يقدّم العلاج الجيني أملاً لعلاج الأمراض الوراثية.", "mastery", "C1", "COCA"],
];

// ─── UNIT 2: Deep Ocean ───
const unit2 = [
  ["trench", "noun", "خندق محيطي عميق", "The Mariana Trench is the deepest point on Earth.", "خندق ماريانا هو أعمق نقطة على الأرض.", "core", "B2", "COCA"],
  ["ridge", "noun", "سلسلة جبال تحت الماء", "The mid-ocean ridge stretches across the Atlantic.", "تمتد سلسلة الجبال المحيطية عبر الأطلسي.", "core", "B2", "COCA"],
  ["seamount", "noun", "جبل بحري تحت الماء", "The seamount rises 3,000 meters from the ocean floor.", "يرتفع الجبل البحري 3000 متر من قاع المحيط.", "mastery", "C1", "NAWL"],
  ["continental shelf", "noun", "الجرف القاري؛ المنطقة الضحلة حول القارات", "Fish are abundant on the continental shelf.", "تكثر الأسماك على الجرف القاري.", "extended", "B2", "COCA"],
  ["coral reef", "noun", "شعاب مرجانية", "Coral reefs support thousands of marine species.", "تدعم الشعاب المرجانية آلاف الأنواع البحرية.", "core", "B2", "CEFR-J"],
  ["plankton", "noun", "عوالق؛ كائنات بحرية مجهرية", "Whales feed on enormous amounts of plankton.", "تتغذى الحيتان على كميات هائلة من العوالق.", "extended", "B2", "COCA"],
  ["krill", "noun", "قشريات صغيرة تعيش في المحيط", "Krill are a vital food source for whales.", "تُعدّ القشريات الصغيرة مصدر غذاء حيوي للحيتان.", "extended", "B2", "NAWL"],
  ["cetacean", "noun", "حوتيات؛ ثدييات بحرية كالحيتان والدلافين", "Dolphins and whales belong to the cetacean order.", "تنتمي الدلافين والحيتان إلى رتبة الحوتيات.", "mastery", "C1", "NAWL"],
  ["mollusk", "noun", "رخويات؛ كائنات لافقارية كالحلزون", "Octopuses are classified as mollusks.", "يُصنَّف الأخطبوط من الرخويات.", "extended", "B2", "COCA"],
  ["crustacean", "noun", "قشريات؛ كالسرطان والروبيان", "Lobsters and crabs are crustaceans.", "الكركند والسرطان من القشريات.", "extended", "B2", "COCA"],
  ["tentacle", "noun", "مِجَس؛ ذراع مرنة للكائنات البحرية", "The jellyfish stings with its tentacles.", "يلسع قنديل البحر بمجساته.", "core", "B2", "COCA"],
  ["gill", "noun", "خيشوم؛ عضو التنفس لدى الأسماك", "Fish absorb oxygen through their gills.", "تمتص الأسماك الأكسجين عبر خياشيمها.", "core", "B2", "CEFR-J"],
  ["fin", "noun", "زعنفة السمكة", "The shark's dorsal fin broke the surface.", "اخترقت زعنفة القرش الظهرية سطح الماء.", "core", "B1", "CEFR-J"],
  ["blowhole", "noun", "فتحة التنفس عند الحيتان", "The whale exhaled through its blowhole.", "زفر الحوت عبر فتحة التنفس.", "extended", "B2", "NAWL"],
  ["ecosystem", "noun", "نظام بيئي متكامل", "Pollution is destroying marine ecosystems.", "يدمّر التلوث الأنظمة البيئية البحرية.", "core", "B2", "AWL"],
  ["food chain", "noun", "سلسلة غذائية", "Plankton is at the base of the ocean food chain.", "تقع العوالق في قاعدة السلسلة الغذائية المحيطية.", "core", "B1", "CEFR-J"],
  ["predator", "noun", "مفترس؛ حيوان يصطاد غيره", "Sharks are apex predators in the ocean.", "أسماك القرش مفترسات في قمة الهرم الغذائي.", "core", "B2", "COCA"],
  ["prey", "noun", "فريسة؛ حيوان يُصطاد", "Small fish are easy prey for dolphins.", "الأسماك الصغيرة فريسة سهلة للدلافين.", "core", "B2", "COCA"],
  ["biodiversity", "noun", "تنوع بيولوجي", "The reef has incredible biodiversity.", "تتمتع الشعاب بتنوع بيولوجي مذهل.", "extended", "B2", "AWL"],
  ["habitat", "noun", "موطن طبيعي للكائنات الحية", "Deep-sea creatures live in extreme habitats.", "تعيش كائنات أعماق البحر في مواطن قاسية.", "core", "B2", "CEFR-J"],
  ["migration", "noun", "هجرة؛ انتقال موسمي للحيوانات", "Whale migration covers thousands of kilometers.", "تمتد هجرة الحيتان لآلاف الكيلومترات.", "core", "B2", "AWL"],
  ["spawning", "noun", "تفريخ؛ وضع البيض في الماء", "Salmon return to rivers for spawning.", "يعود السلمون إلى الأنهار للتفريخ.", "extended", "B2", "NAWL"],
  ["larva", "noun", "يرقة؛ طور مبكر من حياة الكائن", "The larva develops into an adult fish.", "تتطور اليرقة إلى سمكة بالغة.", "extended", "B2", "COCA"],
  ["algae", "noun", "طحالب؛ نباتات مائية بسيطة", "Algae produce most of the world's oxygen.", "تنتج الطحالب معظم أكسجين العالم.", "extended", "B2", "COCA"],
  ["sediment", "noun", "رواسب؛ مواد تترسب في قاع الماء", "Layers of sediment build up on the ocean floor.", "تتراكم طبقات الرواسب في قاع المحيط.", "core", "B2", "AWL"],
];

// ─── UNIT 3: Food Security ───
const unit3 = [
  ["greenhouse", "noun", "بيت زجاجي لزراعة النباتات", "Tomatoes grow well in a greenhouse.", "تنمو الطماطم جيداً في البيت الزجاجي.", "core", "B1", "CEFR-J"],
  ["silo", "noun", "صومعة لتخزين الحبوب", "The farmer stored wheat in the silo.", "خزّن المزارع القمح في الصومعة.", "extended", "B2", "COCA"],
  ["combine harvester", "noun", "حصّادة؛ آلة حصاد ودرس المحاصيل", "The combine harvester processes wheat quickly.", "تعالج الحصّادة القمح بسرعة.", "extended", "B2", "NAWL"],
  ["tractor", "noun", "جرّار زراعي", "The farmer drove the tractor across the field.", "قاد المزارع الجرّار عبر الحقل.", "core", "B1", "CEFR-J"],
  ["irrigation canal", "noun", "قناة ري لنقل المياه إلى الحقول", "The irrigation canal supplies water to the farms.", "تزوّد قناة الري المزارع بالمياه.", "extended", "B2", "COCA"],
  ["fertilizer", "noun", "سماد لتغذية التربة", "Organic fertilizer improves soil quality.", "يحسّن السماد العضوي جودة التربة.", "core", "B2", "CEFR-J"],
  ["pesticide", "noun", "مبيد حشري", "Farmers spray pesticides to protect crops.", "يرش المزارعون المبيدات الحشرية لحماية المحاصيل.", "core", "B2", "COCA"],
  ["herbicide", "noun", "مبيد أعشاب ضارة", "The herbicide killed the weeds but not the crops.", "قتل مبيد الأعشاب الحشائش دون المحاصيل.", "extended", "B2", "COCA"],
  ["fungicide", "noun", "مبيد فطري", "Fungicide prevents mold on the fruit.", "يمنع المبيد الفطري العفن على الفاكهة.", "extended", "B2", "NAWL"],
  ["crop rotation", "noun", "تناوب المحاصيل؛ تبديل الزراعة بين المواسم", "Crop rotation keeps the soil healthy.", "يحافظ تناوب المحاصيل على صحة التربة.", "extended", "B2", "COCA"],
  ["intercropping", "noun", "زراعة بينية؛ زرع محصولين معاً", "Intercropping beans with corn enriches the soil.", "تُغني الزراعة البينية للفاصوليا مع الذرة التربة.", "mastery", "C1", "AWL"],
  ["mulch", "noun", "نشارة؛ مادة تغطي التربة لحمايتها", "Mulch helps retain moisture in the soil.", "تساعد النشارة على الاحتفاظ بالرطوبة في التربة.", "extended", "B2", "NAWL"],
  ["compost", "noun", "سماد عضوي من بقايا النباتات", "She added compost to the garden beds.", "أضافت السماد العضوي إلى أحواض الحديقة.", "core", "B2", "COCA"],
  ["topsoil", "noun", "تربة سطحية خصبة", "Erosion strips away the topsoil.", "يزيل التآكل التربة السطحية.", "extended", "B2", "NAWL"],
  ["groundwater", "noun", "مياه جوفية", "Groundwater levels have dropped significantly.", "انخفضت مستويات المياه الجوفية بشكل ملحوظ.", "core", "B2", "COCA"],
  ["watershed", "noun", "مستجمع مائي؛ حوض نهري", "The watershed supplies drinking water to the city.", "يزوّد المستجمع المائي المدينة بمياه الشرب.", "extended", "B2", "AWL"],
  ["drought", "noun", "جفاف؛ انقطاع الأمطار لفترة طويلة", "The drought destroyed the harvest.", "دمّر الجفاف المحصول.", "core", "B2", "CEFR-J"],
  ["flood", "noun", "فيضان؛ طوفان مائي", "The flood damaged thousands of homes.", "ألحق الفيضان أضراراً بآلاف المنازل.", "core", "B1", "CEFR-J"],
  ["famine", "noun", "مجاعة؛ نقص حاد في الغذاء", "War led to widespread famine.", "أدّت الحرب إلى مجاعة واسعة النطاق.", "core", "B2", "COCA"],
  ["malnutrition", "noun", "سوء تغذية", "Malnutrition affects millions of children.", "يؤثر سوء التغذية على ملايين الأطفال.", "extended", "B2", "COCA"],
  ["food bank", "noun", "بنك طعام؛ مؤسسة توزع الغذاء على المحتاجين", "The food bank distributes meals every week.", "يوزّع بنك الطعام وجبات كل أسبوع.", "core", "B2", "CEFR-J"],
  ["surplus", "noun", "فائض؛ كمية زائدة عن الحاجة", "The country exports its grain surplus.", "تصدّر الدولة فائض الحبوب.", "core", "B2", "AWL"],
  ["deficit", "noun", "عجز؛ نقص في الكمية المطلوبة", "There is a food deficit in the region.", "يوجد عجز غذائي في المنطقة.", "core", "B2", "AWL"],
  ["quota", "noun", "حصة؛ كمية محددة مسموح بها", "Each country has an import quota for rice.", "لكل دولة حصة استيراد محددة للأرز.", "extended", "B2", "AWL"],
  ["tariff", "noun", "تعرفة جمركية على الواردات", "The government imposed a tariff on imported food.", "فرضت الحكومة تعرفة جمركية على الغذاء المستورد.", "extended", "B2", "AWL"],
];

// ─── UNIT 4: Biomimicry ───
const unit4 = [
  ["prototype", "noun", "نموذج أوّلي للاختبار", "Engineers built a prototype of the new device.", "بنى المهندسون نموذجاً أوّلياً للجهاز الجديد.", "core", "B2", "AWL"],
  ["blueprint", "noun", "مخطط هندسي تفصيلي", "The architect drew the blueprint for the building.", "رسم المهندس المعماري مخطط المبنى.", "core", "B2", "COCA"],
  ["patent", "noun", "براءة اختراع", "She filed a patent for her invention.", "سجّلت براءة اختراع لابتكارها.", "core", "B2", "AWL"],
  ["innovation", "noun", "ابتكار؛ تجديد تقني", "Innovation drives economic growth.", "يدفع الابتكار النمو الاقتصادي.", "core", "B2", "AWL"],
  ["filament", "noun", "خيط رفيع؛ شعيرة", "Spider silk is made of incredibly strong filaments.", "يتكوّن حرير العنكبوت من خيوط متينة للغاية.", "extended", "B2", "COCA"],
  ["membrane", "noun", "غشاء رقيق", "The cell membrane controls what enters the cell.", "يتحكم الغشاء الخلوي بما يدخل الخلية.", "extended", "B2", "AWL"],
  ["scaffold", "noun", "هيكل داعم؛ سقّالة", "The tissue grows on a biodegradable scaffold.", "ينمو النسيج على هيكل داعم قابل للتحلل.", "extended", "B2", "COCA"],
  ["lattice", "noun", "شبكة متقاطعة؛ بنية شبكية", "The crystal has a regular lattice structure.", "تمتلك البلورة بنية شبكية منتظمة.", "extended", "B2", "NAWL"],
  ["honeycomb", "noun", "قرص عسل؛ بنية سداسية الشكل", "The honeycomb pattern provides maximum strength.", "يوفّر نمط قرص العسل أقصى قوة.", "extended", "B2", "COCA"],
  ["helix", "noun", "حلزون؛ شكل لولبي", "DNA has a double helix structure.", "يمتلك الحمض النووي بنية حلزونية مزدوجة.", "extended", "C1", "COCA"],
  ["vortex", "noun", "دوّامة؛ تيار دوّار", "The airplane left a vortex of air behind it.", "خلّفت الطائرة دوّامة هوائية خلفها.", "extended", "B2", "COCA"],
  ["turbine", "noun", "توربين؛ عنفة لتوليد الطاقة", "Wind turbines convert wind into electricity.", "تحوّل التوربينات الهوائية الرياح إلى كهرباء.", "core", "B2", "COCA"],
  ["propeller", "noun", "مروحة دفع", "The boat's propeller spun rapidly.", "دارت مروحة القارب بسرعة.", "core", "B2", "COCA"],
  ["actuator", "noun", "محرّك؛ جهاز تحريك ميكانيكي", "The robotic arm uses an electric actuator.", "يستخدم الذراع الآلي محرّكاً كهربائياً.", "mastery", "C1", "NAWL"],
  ["sensor", "noun", "مستشعر؛ جهاز لرصد التغيرات", "The sensor detects motion in the room.", "يرصد المستشعر الحركة في الغرفة.", "core", "B2", "COCA"],
  ["nanotube", "noun", "أنبوب نانوي؛ بنية كربونية متناهية الصغر", "Carbon nanotubes are stronger than steel.", "الأنابيب النانوية الكربونية أقوى من الفولاذ.", "mastery", "C1", "NAWL"],
  ["graphene", "noun", "غرافين؛ مادة كربونية فائقة التوصيل", "Graphene is the thinnest material known to science.", "الغرافين أرق مادة معروفة علمياً.", "mastery", "C1", "NAWL"],
  ["silicon", "noun", "سيليكون؛ عنصر يُستخدم في الإلكترونيات", "Computer chips are made from silicon.", "تُصنع رقائق الحاسوب من السيليكون.", "core", "B2", "COCA"],
  ["polymer", "noun", "بوليمر؛ مادة مصنّعة من سلاسل جزيئية طويلة", "Plastic is a type of polymer.", "البلاستيك نوع من البوليمرات.", "extended", "B2", "COCA"],
  ["resin", "noun", "راتنج؛ مادة لاصقة صلبة", "The artist coated the table with resin.", "غطّى الفنان الطاولة بالراتنج.", "extended", "B2", "COCA"],
  ["alloy", "noun", "سبيكة؛ مزيج من المعادن", "Bronze is an alloy of copper and tin.", "البرونز سبيكة من النحاس والقصدير.", "core", "B2", "COCA"],
  ["ceramic", "noun", "خزف؛ مادة صلبة مقاومة للحرارة", "Ceramic tiles are used in spacecraft heat shields.", "تُستخدم بلاطات الخزف في دروع الحرارة للمركبات الفضائية.", "core", "B2", "COCA"],
  ["fiber optic", "noun", "ألياف ضوئية لنقل البيانات", "Fiber optic cables carry internet signals.", "تنقل كابلات الألياف الضوئية إشارات الإنترنت.", "extended", "B2", "COCA"],
  ["catalyst", "noun", "محفّز؛ مادة تسرّع التفاعل الكيميائي", "Platinum acts as a catalyst in the reaction.", "يعمل البلاتين كمحفّز في التفاعل.", "extended", "B2", "AWL"],
  ["electrode", "noun", "قطب كهربائي", "The battery has a positive and negative electrode.", "تحتوي البطارية على قطب موجب وسالب.", "extended", "B2", "COCA"],
];

// ─── UNIT 5: Migration ───
const unit5 = [
  ["refugee", "noun", "لاجئ؛ شخص يفر من بلده بسبب الحرب", "Millions of refugees fled the conflict.", "فرّ ملايين اللاجئين من النزاع.", "core", "B2", "CEFR-J"],
  ["asylum seeker", "noun", "طالب لجوء", "The asylum seeker applied for protection.", "تقدّم طالب اللجوء بطلب حماية.", "extended", "B2", "COCA"],
  ["migrant worker", "noun", "عامل مهاجر", "Migrant workers build much of the infrastructure.", "يبني العمال المهاجرون الكثير من البنية التحتية.", "core", "B2", "COCA"],
  ["visa", "noun", "تأشيرة دخول", "She applied for a student visa.", "تقدّمت بطلب تأشيرة طالب.", "core", "B1", "CEFR-J"],
  ["passport", "noun", "جواز سفر", "You need a valid passport to travel abroad.", "تحتاج إلى جواز سفر ساري المفعول للسفر.", "core", "B1", "CEFR-J"],
  ["citizenship", "noun", "مواطنة؛ جنسية", "He was granted citizenship after five years.", "مُنح الجنسية بعد خمس سنوات.", "core", "B2", "AWL"],
  ["residency", "noun", "إقامة؛ حق السكن في بلد", "She obtained permanent residency.", "حصلت على إقامة دائمة.", "core", "B2", "AWL"],
  ["deportation order", "noun", "أمر ترحيل", "The court issued a deportation order.", "أصدرت المحكمة أمر ترحيل.", "extended", "B2", "COCA"],
  ["detention center", "noun", "مركز احتجاز", "Asylum seekers were held in a detention center.", "احتُجز طالبو اللجوء في مركز احتجاز.", "extended", "B2", "COCA"],
  ["border patrol", "noun", "حرس الحدود", "The border patrol monitors the frontier.", "يراقب حرس الحدود المنطقة الحدودية.", "extended", "B2", "COCA"],
  ["smuggler", "noun", "مهرّب؛ شخص ينقل بضائع أو أشخاص بشكل غير قانوني", "The smuggler charged high fees to cross.", "تقاضى المهرّب رسوماً عالية للعبور.", "core", "B2", "COCA"],
  ["trafficking", "noun", "اتّجار بالبشر أو بضائع ممنوعة", "Human trafficking is a global crime.", "الاتّجار بالبشر جريمة عالمية.", "extended", "B2", "COCA"],
  ["census", "noun", "تعداد سكاني", "The census is conducted every ten years.", "يُجرى التعداد السكاني كل عشر سنوات.", "core", "B2", "AWL"],
  ["demographics", "noun", "بيانات سكانية؛ خصائص ديموغرافية", "The demographics of the city have changed.", "تغيّرت الخصائص الديموغرافية للمدينة.", "extended", "B2", "AWL"],
  ["enclave", "noun", "جيب؛ منطقة لجالية معينة داخل بلد آخر", "The city has a large Chinese enclave.", "تضم المدينة جيباً صينياً كبيراً.", "extended", "C1", "COCA"],
  ["ghetto", "noun", "غيتو؛ حي فقير معزول", "Immigrants were forced to live in the ghetto.", "أُجبر المهاجرون على العيش في الغيتو.", "extended", "B2", "COCA"],
  ["slum", "noun", "حي عشوائي فقير", "Millions live in urban slums.", "يعيش الملايين في الأحياء العشوائية.", "core", "B2", "COCA"],
  ["shantytown", "noun", "مدينة صفيح", "A shantytown grew on the edge of the capital.", "نشأت مدينة صفيح على أطراف العاصمة.", "extended", "B2", "COCA"],
  ["settlement", "noun", "مستوطنة؛ تجمع سكني", "The settlement was built on disputed land.", "أُقيمت المستوطنة على أرض متنازع عليها.", "core", "B2", "AWL"],
  ["homeland", "noun", "وطن؛ أرض الأجداد", "Many refugees dream of returning to their homeland.", "يحلم كثير من اللاجئين بالعودة إلى وطنهم.", "core", "B2", "COCA"],
  ["motherland", "noun", "الوطن الأم", "She longed for her motherland.", "اشتاقت إلى وطنها الأم.", "extended", "B2", "COCA"],
  ["diaspora", "noun", "شتات؛ مجتمعات منتشرة خارج الوطن", "The Armenian diaspora spans many countries.", "ينتشر الشتات الأرمني عبر دول عديدة.", "extended", "C1", "AWL"],
  ["exodus", "noun", "نزوح جماعي", "The war caused a mass exodus from the region.", "تسبّبت الحرب في نزوح جماعي من المنطقة.", "extended", "B2", "COCA"],
  ["caravan", "noun", "قافلة؛ مجموعة تسافر معاً", "A caravan of migrants headed north.", "توجهت قافلة من المهاجرين شمالاً.", "core", "B2", "COCA"],
  ["assimilation", "noun", "اندماج ثقافي في المجتمع الجديد", "Assimilation can take several generations.", "قد يستغرق الاندماج الثقافي عدة أجيال.", "extended", "B2", "AWL"],
];

// ─── UNIT 6: Cryptocurrency ───
const unit6 = [
  ["blockchain", "noun", "سلسلة كتل؛ تقنية تسجيل رقمية", "Blockchain technology ensures transparent transactions.", "تضمن تقنية سلسلة الكتل شفافية المعاملات.", "core", "B2", "COCA"],
  ["ledger", "noun", "سجل مالي؛ دفتر حسابات", "The blockchain acts as a public ledger.", "تعمل سلسلة الكتل كسجل عام.", "core", "B2", "COCA"],
  ["wallet", "noun", "محفظة رقمية لتخزين العملات", "Store your cryptocurrency in a secure wallet.", "خزّن عملتك المشفرة في محفظة آمنة.", "core", "B1", "CEFR-J"],
  ["token", "noun", "رمز رقمي يمثل قيمة أو أصل", "Each token represents a share in the project.", "يمثّل كل رمز حصة في المشروع.", "core", "B2", "COCA"],
  ["altcoin", "noun", "عملة رقمية بديلة غير بيتكوين", "Ethereum is the most popular altcoin.", "الإيثيريوم أشهر عملة بديلة.", "extended", "B2", "NAWL"],
  ["stablecoin", "noun", "عملة رقمية مستقرة مرتبطة بعملة تقليدية", "A stablecoin maintains a fixed value.", "تحافظ العملة المستقرة على قيمة ثابتة.", "extended", "B2", "NAWL"],
  ["smart contract", "noun", "عقد ذكي ينفّذ تلقائياً", "The smart contract executes when conditions are met.", "يُنفَّذ العقد الذكي عند استيفاء الشروط.", "extended", "B2", "COCA"],
  ["node", "noun", "عقدة في شبكة حاسوبية", "Each node stores a copy of the blockchain.", "تخزّن كل عقدة نسخة من سلسلة الكتل.", "core", "B2", "COCA"],
  ["hash", "noun", "تجزئة؛ بصمة رقمية للبيانات", "Each block contains a unique hash.", "يحتوي كل كتلة على تجزئة فريدة.", "extended", "B2", "NAWL"],
  ["algorithm", "noun", "خوارزمية؛ مجموعة خطوات حسابية", "The algorithm verifies each transaction.", "تتحقق الخوارزمية من كل معاملة.", "core", "B2", "AWL"],
  ["protocol", "noun", "بروتوكول؛ مجموعة قواعد للاتصال", "The protocol defines how data is transferred.", "يحدد البروتوكول كيفية نقل البيانات.", "core", "B2", "AWL"],
  ["consensus mechanism", "noun", "آلية إجماع للتحقق من المعاملات", "The consensus mechanism prevents fraud.", "تمنع آلية الإجماع الاحتيال.", "mastery", "C1", "NAWL"],
  ["proof of work", "noun", "إثبات العمل؛ طريقة تحقق بالحوسبة", "Bitcoin uses proof of work for security.", "يستخدم بيتكوين إثبات العمل للأمان.", "extended", "B2", "NAWL"],
  ["proof of stake", "noun", "إثبات الحصة؛ طريقة تحقق بالملكية", "Proof of stake uses less energy than mining.", "يستهلك إثبات الحصة طاقة أقل من التعدين.", "extended", "B2", "NAWL"],
  ["exchange", "noun", "منصة تداول عملات", "She bought Bitcoin on a crypto exchange.", "اشترت البيتكوين من منصة تداول.", "core", "B2", "CEFR-J"],
  ["portfolio", "noun", "محفظة استثمارية", "His portfolio includes several cryptocurrencies.", "تشمل محفظته الاستثمارية عدة عملات مشفرة.", "core", "B2", "AWL"],
  ["dividend", "noun", "توزيعات أرباح", "Shareholders receive an annual dividend.", "يحصل المساهمون على توزيعات أرباح سنوية.", "extended", "B2", "COCA"],
  ["yield", "noun", "عائد؛ ربح استثماري", "The yield on the investment was high.", "كان العائد على الاستثمار مرتفعاً.", "core", "B2", "AWL"],
  ["inflation", "noun", "تضخم؛ ارتفاع عام في الأسعار", "Inflation reduces the purchasing power of money.", "يُقلّل التضخم القدرة الشرائية للنقود.", "core", "B2", "COCA"],
  ["deflation", "noun", "انكماش؛ انخفاض عام في الأسعار", "Deflation can lead to economic stagnation.", "قد يؤدي الانكماش إلى ركود اقتصادي.", "extended", "B2", "COCA"],
  ["bear market", "noun", "سوق هابطة؛ فترة تراجع الأسعار", "Investors lost money during the bear market.", "خسر المستثمرون أموالاً خلال السوق الهابطة.", "extended", "B2", "COCA"],
  ["bull market", "noun", "سوق صاعدة؛ فترة ارتفاع الأسعار", "The bull market attracted new investors.", "جذبت السوق الصاعدة مستثمرين جدداً.", "extended", "B2", "COCA"],
  ["market cap", "noun", "القيمة السوقية الإجمالية", "Bitcoin has the largest market cap.", "يمتلك البيتكوين أكبر قيمة سوقية.", "extended", "B2", "COCA"],
  ["ICO", "noun", "طرح أوّلي للعملة الرقمية", "The startup raised funds through an ICO.", "جمعت الشركة الناشئة أموالاً عبر طرح أوّلي.", "mastery", "C1", "NAWL"],
  ["whitepaper", "noun", "ورقة بيضاء؛ وثيقة تشرح المشروع التقني", "The whitepaper explains the project's technology.", "تشرح الورقة البيضاء تقنية المشروع.", "extended", "B2", "NAWL"],
];

// ─── UNIT 7: Crowd Psychology ───
const unit7 = [
  ["mob", "noun", "حشد غاضب؛ غوغاء", "The mob stormed the building.", "اقتحمت الغوغاء المبنى.", "core", "B2", "COCA"],
  ["rally", "noun", "تجمع حاشد؛ مسيرة سياسية", "Thousands attended the political rally.", "حضر الآلاف التجمع السياسي.", "core", "B2", "COCA"],
  ["demonstration", "noun", "مظاهرة؛ احتجاج شعبي", "The demonstration blocked the main road.", "أغلقت المظاهرة الطريق الرئيسي.", "core", "B2", "CEFR-J"],
  ["petition", "noun", "عريضة؛ طلب موقّع من مجموعة", "They signed a petition against the new law.", "وقّعوا عريضة ضد القانون الجديد.", "core", "B2", "COCA"],
  ["propaganda", "noun", "دعاية موجّهة للتأثير على الرأي العام", "The regime spread propaganda through the media.", "نشر النظام الدعاية عبر وسائل الإعلام.", "core", "B2", "COCA"],
  ["leaflet", "noun", "منشور؛ ورقة دعائية", "Volunteers distributed leaflets in the street.", "وزّع المتطوعون منشورات في الشارع.", "core", "B2", "CEFR-J"],
  ["slogan", "noun", "شعار؛ عبارة قصيرة مؤثرة", "The crowd chanted the protest slogan.", "ردّد الحشد شعار الاحتجاج.", "core", "B1", "CEFR-J"],
  ["manifesto", "noun", "بيان سياسي؛ إعلان مبادئ", "The party published its election manifesto.", "نشر الحزب بيانه الانتخابي.", "extended", "B2", "COCA"],
  ["ideology", "noun", "أيديولوجيا؛ منظومة أفكار ومعتقدات", "The group follows an extremist ideology.", "تتبع الجماعة أيديولوجيا متطرفة.", "core", "B2", "AWL"],
  ["doctrine", "noun", "عقيدة؛ مبدأ أساسي", "The doctrine shaped government policy.", "شكّلت العقيدة سياسة الحكومة.", "extended", "B2", "AWL"],
  ["cult", "noun", "طائفة؛ جماعة ذات معتقدات متطرفة", "The cult isolated its members from society.", "عزلت الطائفة أعضاءها عن المجتمع.", "core", "B2", "COCA"],
  ["sect", "noun", "فرقة دينية منشقة", "The sect broke away from the main church.", "انشقت الفرقة عن الكنيسة الرئيسية.", "extended", "B2", "COCA"],
  ["movement", "noun", "حركة اجتماعية أو سياسية", "The civil rights movement changed history.", "غيّرت حركة الحقوق المدنية التاريخ.", "core", "B2", "CEFR-J"],
  ["revolution", "noun", "ثورة؛ تغيير جذري في الحكم", "The revolution overthrew the monarchy.", "أطاحت الثورة بالنظام الملكي.", "core", "B2", "COCA"],
  ["uprising", "noun", "انتفاضة؛ تمرد شعبي", "The uprising began in the capital.", "بدأت الانتفاضة في العاصمة.", "extended", "B2", "COCA"],
  ["coup", "noun", "انقلاب عسكري", "The military carried out a coup.", "نفّذ الجيش انقلاباً عسكرياً.", "extended", "B2", "COCA"],
  ["dictator", "noun", "دكتاتور؛ حاكم مستبد", "The dictator ruled for three decades.", "حكم الدكتاتور ثلاثة عقود.", "core", "B2", "COCA"],
  ["demagogue", "noun", "ديماغوجي؛ سياسي يستغل العواطف", "The demagogue exploited public fear.", "استغل الديماغوجي خوف الجمهور.", "mastery", "C1", "COCA"],
  ["whistleblower", "noun", "مُبلِّغ عن المخالفات", "The whistleblower exposed government corruption.", "كشف المُبلِّغ عن الفساد الحكومي.", "extended", "B2", "COCA"],
  ["dissident", "noun", "معارض سياسي", "The dissident was imprisoned for his views.", "سُجن المعارض بسبب آرائه.", "extended", "B2", "COCA"],
  ["activist", "noun", "ناشط؛ شخص يعمل من أجل قضية", "The activist campaigned for human rights.", "ناضل الناشط من أجل حقوق الإنسان.", "core", "B2", "COCA"],
  ["lobbyist", "noun", "عضو جماعة ضغط", "The lobbyist tried to influence the senator.", "حاول عضو جماعة الضغط التأثير على عضو مجلس الشيوخ.", "extended", "B2", "COCA"],
  ["grassroots", "noun", "قاعدة شعبية؛ حراك من الأسفل", "Change came from the grassroots.", "جاء التغيير من القاعدة الشعبية.", "extended", "B2", "COCA"],
  ["establishment", "noun", "مؤسسة حاكمة؛ السلطة القائمة", "Young people challenged the establishment.", "تحدّى الشباب المؤسسة الحاكمة.", "core", "B2", "AWL"],
  ["mainstream", "noun", "التيار السائد", "His ideas entered the mainstream.", "دخلت أفكاره التيار السائد.", "core", "B2", "COCA"],
];

// ─── UNIT 8: Forensic Science ───
const unit8 = [
  ["crime scene", "noun", "مسرح الجريمة", "Detectives sealed off the crime scene.", "طوّق المحققون مسرح الجريمة.", "core", "B2", "COCA"],
  ["evidence", "noun", "دليل؛ إثبات في قضية", "The DNA evidence proved his innocence.", "أثبت دليل الحمض النووي براءته.", "core", "B1", "CEFR-J"],
  ["suspect", "noun", "مشتبه به", "The police arrested the main suspect.", "اعتقلت الشرطة المشتبه به الرئيسي.", "core", "B2", "CEFR-J"],
  ["witness", "noun", "شاهد؛ شخص رأى الحدث", "The witness described the attacker.", "وصف الشاهد المهاجم.", "core", "B1", "CEFR-J"],
  ["victim", "noun", "ضحية؛ شخص تعرّض لأذى", "The victim was taken to hospital.", "نُقلت الضحية إلى المستشفى.", "core", "B2", "CEFR-J"],
  ["motive", "noun", "دافع؛ سبب وراء الفعل", "The police are investigating the motive.", "تحقق الشرطة في الدافع.", "core", "B2", "COCA"],
  ["alibi", "noun", "حجة غياب؛ إثبات التواجد في مكان آخر", "He had a solid alibi for the night.", "كان لديه حجة غياب قوية تلك الليلة.", "extended", "B2", "COCA"],
  ["confession", "noun", "اعتراف بارتكاب جريمة", "The suspect signed a written confession.", "وقّع المشتبه به اعترافاً مكتوباً.", "core", "B2", "COCA"],
  ["verdict", "noun", "حكم؛ قرار المحكمة", "The jury delivered a guilty verdict.", "أصدرت هيئة المحلّفين حكماً بالإدانة.", "core", "B2", "COCA"],
  ["sentence", "noun", "حكم قضائي؛ عقوبة", "He received a ten-year prison sentence.", "حُكم عليه بالسجن عشر سنوات.", "core", "B2", "CEFR-J"],
  ["parole", "noun", "إفراج مشروط", "She was released on parole after five years.", "أُفرج عنها بشروط بعد خمس سنوات.", "extended", "B2", "COCA"],
  ["probation", "noun", "فترة اختبار قضائية", "The judge placed him on two years probation.", "وضعه القاضي تحت المراقبة لمدة سنتين.", "extended", "B2", "COCA"],
  ["bail", "noun", "كفالة؛ مبلغ يُدفع للإفراج المؤقت", "The judge set bail at fifty thousand dollars.", "حدّد القاضي الكفالة بخمسين ألف دولار.", "core", "B2", "COCA"],
  ["warrant", "noun", "مذكرة قضائية", "The police obtained a search warrant.", "حصلت الشرطة على مذكرة تفتيش.", "core", "B2", "COCA"],
  ["subpoena", "noun", "أمر استدعاء للمحكمة", "She received a subpoena to testify.", "تلقّت أمر استدعاء للإدلاء بشهادتها.", "extended", "C1", "COCA"],
  ["deposition", "noun", "إفادة خطية تحت القسم", "The lawyer took a deposition from the witness.", "أخذ المحامي إفادة خطية من الشاهد.", "extended", "C1", "COCA"],
  ["testimony", "noun", "شهادة أمام المحكمة", "Her testimony was crucial to the case.", "كانت شهادتها حاسمة في القضية.", "core", "B2", "COCA"],
  ["cross-examination", "noun", "استجواب مضاد في المحكمة", "The lawyer began the cross-examination.", "بدأ المحامي الاستجواب المضاد.", "extended", "B2", "COCA"],
  ["prosecution", "noun", "ادّعاء؛ جهة اتهام", "The prosecution presented strong evidence.", "قدّم الادّعاء أدلة قوية.", "core", "B2", "AWL"],
  ["defense", "noun", "دفاع؛ فريق المحاماة عن المتهم", "The defense argued for acquittal.", "طالب الدفاع بالتبرئة.", "core", "B2", "CEFR-J"],
  ["jury", "noun", "هيئة محلّفين", "The jury reached a unanimous decision.", "توصّلت هيئة المحلّفين إلى قرار بالإجماع.", "core", "B2", "COCA"],
  ["plaintiff", "noun", "مدّعٍ؛ رافع الدعوى", "The plaintiff sued for damages.", "رفع المدّعي دعوى تعويض.", "extended", "B2", "AWL"],
  ["defendant", "noun", "مُدَّعى عليه؛ متّهم", "The defendant pleaded not guilty.", "أنكر المُدَّعى عليه التهمة.", "core", "B2", "AWL"],
  ["accomplice", "noun", "شريك في الجريمة", "The accomplice helped plan the robbery.", "ساعد الشريك في التخطيط للسرقة.", "extended", "B2", "COCA"],
  ["accessory", "noun", "متواطئ؛ شخص يساعد في جريمة دون مشاركة مباشرة", "He was charged as an accessory to the crime.", "وُجّهت إليه تهمة التواطؤ في الجريمة.", "extended", "B2", "COCA"],
];

// ─── UNIT 9: Archaeology ───
const unit9 = [
  ["excavation site", "noun", "موقع حفريات أثرية", "The excavation site revealed ancient structures.", "كشف موقع الحفريات عن بنى أثرية قديمة.", "extended", "B2", "COCA"],
  ["artifact", "noun", "قطعة أثرية", "The museum displayed rare artifacts.", "عرض المتحف قطعاً أثرية نادرة.", "core", "B2", "COCA"],
  ["relic", "noun", "أثر؛ بقايا من الماضي", "The relic dates back to the Bronze Age.", "يعود الأثر إلى العصر البرونزي.", "core", "B2", "COCA"],
  ["fossil", "noun", "أحفورة؛ بقايا كائن متحجّر", "The fossil was millions of years old.", "كانت الأحفورة عمرها ملايين السنين.", "core", "B2", "CEFR-J"],
  ["ruin", "noun", "أطلال؛ بقايا مبنى قديم", "Tourists visit the ancient ruins.", "يزور السياح الأطلال القديمة.", "core", "B2", "CEFR-J"],
  ["tomb", "noun", "قبر؛ مدفن ملكي", "Archaeologists discovered the pharaoh's tomb.", "اكتشف علماء الآثار قبر الفرعون.", "core", "B2", "COCA"],
  ["burial ground", "noun", "مقبرة؛ أرض دفن", "The burial ground contained hundreds of graves.", "احتوت المقبرة على مئات القبور.", "extended", "B2", "COCA"],
  ["pyramid", "noun", "هرم", "The Great Pyramid was built over 4,000 years ago.", "بُني الهرم الأكبر قبل أكثر من 4000 عام.", "core", "B1", "CEFR-J"],
  ["temple", "noun", "معبد؛ مكان عبادة قديم", "The temple was dedicated to the sun god.", "كُرِّس المعبد لإله الشمس.", "core", "B1", "CEFR-J"],
  ["citadel", "noun", "قلعة؛ حصن محصّن", "The citadel overlooked the entire city.", "أطلّت القلعة على المدينة بأكملها.", "extended", "B2", "COCA"],
  ["amphitheater", "noun", "مدرج روماني؛ مسرح مفتوح", "The amphitheater could seat 50,000 spectators.", "كان المدرج يتسع لخمسين ألف متفرج.", "extended", "B2", "COCA"],
  ["aqueduct", "noun", "قناة مائية رومانية", "The Roman aqueduct still stands today.", "لا تزال القناة المائية الرومانية قائمة حتى اليوم.", "extended", "B2", "COCA"],
  ["mosaic", "noun", "فسيفساء؛ لوحة من قطع صغيرة ملونة", "The floor was covered with a beautiful mosaic.", "كانت الأرضية مغطاة بفسيفساء جميلة.", "core", "B2", "COCA"],
  ["fresco", "noun", "جدارية؛ لوحة مرسومة على جدار مبلل", "The fresco depicted scenes from daily life.", "صوّرت الجدارية مشاهد من الحياة اليومية.", "extended", "B2", "COCA"],
  ["pottery", "noun", "فخار؛ أوانٍ من الصلصال", "They found fragments of ancient pottery.", "عثروا على شظايا فخار قديم.", "core", "B2", "CEFR-J"],
  ["shard", "noun", "شظية؛ قطعة مكسورة من الفخار", "Each shard was carefully cataloged.", "صُنّفت كل شظية بعناية.", "extended", "B2", "COCA"],
  ["figurine", "noun", "تمثال صغير", "The clay figurine represented a goddess.", "مثّل التمثال الصغير إلهة.", "extended", "B2", "COCA"],
  ["amulet", "noun", "تميمة؛ حجاب يُعتقد أنه يحمي", "The amulet was worn for protection.", "كانت التميمة تُرتدى للحماية.", "extended", "B2", "COCA"],
  ["pendant", "noun", "قلادة؛ حلية تتدلّى من عقد", "The gold pendant was found in the tomb.", "عُثر على القلادة الذهبية في القبر.", "core", "B2", "COCA"],
  ["bracelet", "noun", "سوار؛ حلية تُلبس حول المعصم", "The bracelet was made of bronze.", "صُنع السوار من البرونز.", "core", "B1", "CEFR-J"],
  ["throne", "noun", "عرش؛ مقعد الملك", "The throne was carved from a single block.", "نُحت العرش من كتلة واحدة.", "core", "B2", "COCA"],
  ["chariot", "noun", "عربة حربية قديمة يجرها حصان", "The chariot was used in battle.", "استُخدمت العربة الحربية في المعركة.", "extended", "B2", "COCA"],
  ["scroll", "noun", "لفافة؛ وثيقة ملفوفة", "The Dead Sea Scrolls are ancient manuscripts.", "لفائف البحر الميت مخطوطات قديمة.", "core", "B2", "COCA"],
  ["papyrus", "noun", "بردي؛ ورق قديم من نبات البردي", "The Egyptians wrote on papyrus.", "كتب المصريون على ورق البردي.", "extended", "B2", "COCA"],
  ["parchment", "noun", "رَقّ؛ جلد حيوان يُكتب عليه", "The manuscript was written on parchment.", "كُتبت المخطوطة على الرَّق.", "extended", "B2", "COCA"],
];

// ─── UNIT 10: Longevity ───
const unit10 = [
  ["lifespan", "noun", "مدة الحياة؛ العمر الافتراضي", "Exercise can extend your lifespan.", "يمكن للتمارين إطالة مدة حياتك.", "core", "B2", "COCA"],
  ["life expectancy", "noun", "متوسط العمر المتوقع", "Life expectancy has increased worldwide.", "ارتفع متوسط العمر المتوقع في العالم.", "core", "B2", "COCA"],
  ["mortality rate", "noun", "معدل الوفيات", "The mortality rate from the disease has dropped.", "انخفض معدل الوفيات من المرض.", "extended", "B2", "AWL"],
  ["centenarian", "noun", "معمّر بلغ المئة عام", "Japan has the most centenarians per capita.", "لدى اليابان أكبر عدد من المعمّرين نسبة للسكان.", "extended", "C1", "COCA"],
  ["supercentenarian", "noun", "معمّر تجاوز مئة وعشر سنوات", "The supercentenarian celebrated her 112th birthday.", "احتفلت المعمّرة بعيد ميلادها الثاني عشر بعد المئة.", "mastery", "C1", "NAWL"],
  ["telomere", "noun", "تيلومير؛ نهاية الكروموسوم تحمي الحمض النووي", "Shorter telomeres are linked to aging.", "ترتبط التيلوميرات الأقصر بالشيخوخة.", "mastery", "C1", "NAWL"],
  ["stem cell", "noun", "خلية جذعية قادرة على التحول لأنواع مختلفة", "Stem cells can develop into any type of cell.", "يمكن للخلايا الجذعية التحوّل إلى أي نوع من الخلايا.", "extended", "B2", "COCA"],
  ["bone marrow", "noun", "نخاع العظم", "Bone marrow produces blood cells.", "ينتج نخاع العظم خلايا الدم.", "extended", "B2", "COCA"],
  ["cartilage", "noun", "غضروف؛ نسيج مرن بين المفاصل", "Cartilage cushions the joints.", "يحمي الغضروف المفاصل.", "extended", "B2", "COCA"],
  ["collagen", "noun", "كولاجين؛ بروتين يعطي البشرة مرونتها", "Collagen keeps the skin firm and elastic.", "يحافظ الكولاجين على متانة البشرة ومرونتها.", "extended", "B2", "COCA"],
  ["antioxidant", "noun", "مضاد أكسدة يحمي الخلايا", "Berries are rich in antioxidants.", "التوت غني بمضادات الأكسدة.", "core", "B2", "COCA"],
  ["free radical", "noun", "جذر حر؛ جزيء يتلف الخلايا", "Free radicals damage cells and cause aging.", "تتلف الجذور الحرة الخلايا وتسبب الشيخوخة.", "extended", "B2", "COCA"],
  ["metabolism", "noun", "أيض؛ عمليات تحويل الغذاء إلى طاقة", "A fast metabolism burns calories quickly.", "يحرق الأيض السريع السعرات بسرعة.", "core", "B2", "COCA"],
  ["calorie", "noun", "سعرة حرارية؛ وحدة قياس الطاقة في الغذاء", "Adults need about 2,000 calories a day.", "يحتاج البالغون نحو ألفي سعرة حرارية يومياً.", "core", "B1", "CEFR-J"],
  ["supplement", "noun", "مكمّل غذائي", "She takes a vitamin D supplement.", "تتناول مكمّل فيتامين د.", "core", "B2", "COCA"],
  ["probiotic", "noun", "مُعزِّز حيوي؛ بكتيريا نافعة للأمعاء", "Yogurt contains natural probiotics.", "يحتوي اللبن على معززات حيوية طبيعية.", "extended", "B2", "COCA"],
  ["prebiotic", "noun", "مادة تغذّي البكتيريا النافعة في الأمعاء", "Prebiotics promote the growth of good bacteria.", "تعزّز المواد الحيوية نمو البكتيريا النافعة.", "extended", "B2", "NAWL"],
  ["microbiome", "noun", "ميكروبيوم؛ مجتمع الكائنات الدقيقة في الجسم", "A healthy microbiome improves digestion.", "يحسّن الميكروبيوم الصحي عملية الهضم.", "extended", "C1", "NAWL"],
  ["hormone", "noun", "هرمون؛ مادة كيميائية تنظّم وظائف الجسم", "Growth hormone is released during sleep.", "يُفرَز هرمون النمو أثناء النوم.", "core", "B2", "COCA"],
  ["insulin", "noun", "إنسولين؛ هرمون ينظّم سكر الدم", "Insulin helps the body use sugar for energy.", "يساعد الإنسولين الجسم على استخدام السكر كطاقة.", "core", "B2", "COCA"],
  ["cortisol", "noun", "كورتيزول؛ هرمون التوتر", "High cortisol levels cause health problems.", "تسبّب مستويات الكورتيزول المرتفعة مشاكل صحية.", "extended", "B2", "COCA"],
  ["serotonin", "noun", "سيروتونين؛ هرمون السعادة", "Serotonin regulates mood and sleep.", "ينظّم السيروتونين المزاج والنوم.", "extended", "B2", "COCA"],
  ["dopamine", "noun", "دوبامين؛ هرمون المكافأة والتحفيز", "Dopamine is released when you achieve a goal.", "يُفرَز الدوبامين عند تحقيق هدف.", "extended", "B2", "COCA"],
  ["melatonin", "noun", "ميلاتونين؛ هرمون ينظّم دورة النوم", "Melatonin helps you fall asleep at night.", "يساعد الميلاتونين على النوم ليلاً.", "extended", "B2", "COCA"],
  ["adrenaline", "noun", "أدرينالين؛ هرمون الاستجابة للخطر", "Adrenaline prepares the body for action.", "يُهيّئ الأدرينالين الجسم للعمل.", "core", "B2", "COCA"],
];

// ─── UNIT 11: Sustainable Architecture ───
const unit11 = [
  ["solar panel", "noun", "لوح شمسي لتوليد الكهرباء", "Solar panels cover the entire roof.", "تغطي الألواح الشمسية السطح بالكامل.", "core", "B2", "CEFR-J"],
  ["wind turbine", "noun", "توربين رياح لتوليد الطاقة", "Wind turbines generate clean electricity.", "تولّد توربينات الرياح كهرباء نظيفة.", "core", "B2", "COCA"],
  ["rainwater tank", "noun", "خزان لجمع مياه الأمطار", "The rainwater tank stores water for irrigation.", "يخزّن خزان مياه الأمطار الماء للري.", "extended", "B2", "NAWL"],
  ["gray water", "noun", "مياه رمادية؛ مياه مستعملة قابلة لإعادة الاستخدام", "Gray water from sinks is reused for the garden.", "تُعاد استخدام المياه الرمادية من الأحواض للحديقة.", "extended", "B2", "NAWL"],
  ["compost toilet", "noun", "مرحاض سمادي لا يستخدم الماء", "The eco-lodge uses compost toilets.", "يستخدم النزل البيئي مراحيض سمادية.", "mastery", "C1", "NAWL"],
  ["green roof", "noun", "سطح أخضر مزروع بالنباتات", "The green roof reduces the building's heat.", "يقلّل السطح الأخضر حرارة المبنى.", "extended", "B2", "COCA"],
  ["living wall", "noun", "جدار حي مغطّى بالنباتات", "The living wall purifies indoor air.", "ينقّي الجدار الحي هواء المبنى.", "extended", "B2", "NAWL"],
  ["skylight", "noun", "نافذة سقفية تسمح بدخول ضوء الشمس", "The skylight fills the room with natural light.", "تملأ النافذة السقفية الغرفة بالضوء الطبيعي.", "core", "B2", "COCA"],
  ["insulation", "noun", "عزل حراري للمباني", "Good insulation reduces energy costs.", "يقلّل العزل الجيد تكاليف الطاقة.", "core", "B2", "COCA"],
  ["double glazing", "noun", "زجاج مزدوج للعزل الحراري", "Double glazing keeps the house warm.", "يحافظ الزجاج المزدوج على دفء المنزل.", "extended", "B2", "NAWL"],
  ["heat pump", "noun", "مضخة حرارية للتدفئة والتبريد", "A heat pump extracts warmth from the ground.", "تستخرج المضخة الحرارية الدفء من باطن الأرض.", "extended", "B2", "COCA"],
  ["thermostat", "noun", "منظّم حرارة", "The smart thermostat adjusts temperature automatically.", "يضبط منظّم الحرارة الذكي درجة الحرارة تلقائياً.", "core", "B2", "COCA"],
  ["smart grid", "noun", "شبكة كهربائية ذكية", "The smart grid distributes energy efficiently.", "توزّع الشبكة الذكية الطاقة بكفاءة.", "extended", "B2", "COCA"],
  ["carbon footprint", "noun", "بصمة كربونية؛ مقياس انبعاثات الكربون", "The building has a minimal carbon footprint.", "يمتلك المبنى بصمة كربونية ضئيلة.", "core", "B2", "COCA"],
  ["embodied energy", "noun", "طاقة مجسّدة؛ الطاقة المستهلكة في إنتاج المادة", "Concrete has high embodied energy.", "يمتلك الخرسانة طاقة مجسّدة عالية.", "mastery", "C1", "AWL"],
  ["lifecycle", "noun", "دورة حياة المنتج من الإنتاج إلى التخلص", "The lifecycle of the material was analyzed.", "حُلّلت دورة حياة المادة.", "extended", "B2", "AWL"],
  ["zoning", "noun", "تقسيم المناطق؛ تخطيط استخدام الأراضي", "Zoning laws regulate building heights.", "تنظّم قوانين التقسيم ارتفاع المباني.", "extended", "B2", "COCA"],
  ["building code", "noun", "كود البناء؛ معايير تنظيمية للإنشاء", "The design meets all building codes.", "يستوفي التصميم جميع أكواد البناء.", "core", "B2", "COCA"],
  ["permit", "noun", "تصريح بناء", "You need a permit to start construction.", "تحتاج إلى تصريح لبدء البناء.", "core", "B2", "CEFR-J"],
  ["foundation", "noun", "أساس المبنى", "The foundation was laid in concrete.", "صُبّ الأساس بالخرسانة.", "core", "B1", "CEFR-J"],
  ["beam", "noun", "عارضة؛ دعامة أفقية في البناء", "Steel beams support the upper floors.", "تدعم العوارض الفولاذية الطوابق العلوية.", "core", "B2", "COCA"],
  ["column", "noun", "عمود إنشائي", "Marble columns line the entrance.", "تصطف الأعمدة الرخامية عند المدخل.", "core", "B2", "COCA"],
  ["truss", "noun", "جملون؛ هيكل مثلّثي للأسقف", "The roof truss spans the entire building.", "يمتد الجملون عبر المبنى بالكامل.", "extended", "B2", "NAWL"],
  ["facade", "noun", "واجهة المبنى", "The glass facade reflects sunlight.", "تعكس الواجهة الزجاجية أشعة الشمس.", "core", "B2", "COCA"],
  ["cantilever", "noun", "ناتئ؛ بنية تمتد دون دعم من طرف واحد", "The balcony is supported by a cantilever.", "يُدعم الشرفة بناتئ.", "mastery", "C1", "NAWL"],
];

// ─── UNIT 12: Exoplanets ───
const unit12 = [
  ["telescope", "noun", "تلسكوب؛ مقراب لرصد الأجرام السماوية", "The telescope detected a distant planet.", "رصد التلسكوب كوكباً بعيداً.", "core", "B1", "CEFR-J"],
  ["observatory", "noun", "مرصد فلكي", "The observatory is located on a mountaintop.", "يقع المرصد على قمة جبل.", "core", "B2", "COCA"],
  ["satellite", "noun", "قمر صناعي يدور حول الأرض", "The satellite transmits weather data.", "ينقل القمر الصناعي بيانات الطقس.", "core", "B2", "CEFR-J"],
  ["probe", "noun", "مسبار فضائي لاستكشاف الكواكب", "The probe landed on Mars successfully.", "هبط المسبار على المريخ بنجاح.", "core", "B2", "COCA"],
  ["rover", "noun", "مركبة استكشاف تسير على سطح كوكب", "The rover collected soil samples on Mars.", "جمعت المركبة عيّنات تربة من المريخ.", "extended", "B2", "COCA"],
  ["lander", "noun", "مركبة هبوط فضائية", "The lander touched down on the moon's surface.", "هبطت مركبة الهبوط على سطح القمر.", "extended", "B2", "COCA"],
  ["space station", "noun", "محطة فضائية تدور حول الأرض", "Astronauts live on the space station for months.", "يعيش رواد الفضاء في المحطة الفضائية لأشهر.", "core", "B1", "CEFR-J"],
  ["astronaut", "noun", "رائد فضاء", "The astronaut conducted experiments in orbit.", "أجرى رائد الفضاء تجارب في المدار.", "core", "B1", "CEFR-J"],
  ["cosmonaut", "noun", "رائد فضاء روسي", "The cosmonaut spent a year in space.", "أمضى رائد الفضاء الروسي عاماً في الفضاء.", "extended", "B2", "COCA"],
  ["mission control", "noun", "مركز التحكم بالمهمات الفضائية", "Mission control monitored the spacecraft.", "راقب مركز التحكم المركبة الفضائية.", "extended", "B2", "COCA"],
  ["launch pad", "noun", "منصة إطلاق الصواريخ", "The rocket lifted off from the launch pad.", "انطلق الصاروخ من منصة الإطلاق.", "extended", "B2", "COCA"],
  ["rocket", "noun", "صاروخ فضائي", "The rocket carried the satellite into orbit.", "حمل الصاروخ القمر الصناعي إلى المدار.", "core", "B1", "CEFR-J"],
  ["booster", "noun", "معزّز؛ صاروخ إضافي للدفع", "The booster separated after launch.", "انفصل المعزّز بعد الإطلاق.", "extended", "B2", "COCA"],
  ["payload", "noun", "حمولة المركبة الفضائية", "The payload included scientific instruments.", "شملت الحمولة أدوات علمية.", "extended", "B2", "COCA"],
  ["orbit", "noun", "مدار؛ مسار دائري حول جرم سماوي", "The satellite completed one orbit every 90 minutes.", "أتمّ القمر الصناعي مداراً كل 90 دقيقة.", "core", "B2", "COCA"],
  ["trajectory", "noun", "مسار؛ خط سير الجسم المتحرك", "Scientists calculated the probe's trajectory.", "حسب العلماء مسار المسبار.", "extended", "B2", "AWL"],
  ["light-year", "noun", "سنة ضوئية؛ مسافة يقطعها الضوء في سنة", "The star is four light-years away.", "يبعد النجم أربع سنوات ضوئية.", "core", "B2", "COCA"],
  ["parsec", "noun", "فرسخ فلكي؛ وحدة قياس فلكية", "A parsec equals about 3.26 light-years.", "يعادل الفرسخ الفلكي نحو 3.26 سنة ضوئية.", "mastery", "C1", "NAWL"],
  ["constellation", "noun", "كوكبة؛ مجموعة نجوم تشكل نمطاً", "Orion is a famous constellation.", "الجبّار كوكبة شهيرة.", "core", "B2", "COCA"],
  ["galaxy", "noun", "مجرّة؛ تجمع هائل من النجوم", "The Milky Way is our galaxy.", "درب التبّانة هي مجرّتنا.", "core", "B2", "CEFR-J"],
  ["nebula", "noun", "سديم؛ سحابة غاز وغبار في الفضاء", "Stars are born inside a nebula.", "تولد النجوم داخل السديم.", "extended", "B2", "COCA"],
  ["supernova", "noun", "مستعر أعظم؛ انفجار نجم ضخم", "The supernova was visible for weeks.", "كان المستعر الأعظم مرئياً لأسابيع.", "extended", "B2", "COCA"],
  ["black hole", "noun", "ثقب أسود؛ منطقة ذات جاذبية هائلة", "Nothing can escape a black hole.", "لا شيء يفلت من الثقب الأسود.", "core", "B2", "COCA"],
  ["asteroid", "noun", "كويكب؛ جسم صخري يدور حول الشمس", "An asteroid impact caused mass extinction.", "سبّب اصطدام الكويكب انقراضاً جماعياً.", "core", "B2", "COCA"],
  ["comet", "noun", "مذنّب؛ جسم جليدي يدور حول الشمس", "The comet's tail stretched across the sky.", "امتدّ ذيل المذنّب عبر السماء.", "core", "B2", "COCA"],
];

const BATCH_ID = 20;

async function main() {
  const client = await pool.connect();
  try {
    const units = [
      { num: 1, data: unit1, label: "Bioethics" },
      { num: 2, data: unit2, label: "Deep Ocean" },
      { num: 3, data: unit3, label: "Food Security" },
      { num: 4, data: unit4, label: "Biomimicry" },
      { num: 5, data: unit5, label: "Migration" },
      { num: 6, data: unit6, label: "Cryptocurrency" },
      { num: 7, data: unit7, label: "Crowd Psychology" },
      { num: 8, data: unit8, label: "Forensic Science" },
      { num: 9, data: unit9, label: "Archaeology" },
      { num: 10, data: unit10, label: "Longevity" },
      { num: 11, data: unit11, label: "Sustainable Architecture" },
      { num: 12, data: unit12, label: "Exoplanets" },
    ];

    let totalInserted = 0;
    for (const u of units) {
      const count = await insertBatch(client, u.data, u.num, BATCH_ID);
      console.log(`Unit ${u.num} (${u.label}): ${count} words inserted (${u.data.length} provided)`);
      totalInserted += count;
    }
    console.log(`\n=== Total inserted: ${totalInserted} ===\n`);

    // Query final counts per unit
    const res = await client.query(
      `SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [BATCH_ID]
    );
    console.log("--- Final DB counts for batch_id=20 ---");
    let dbTotal = 0;
    for (const row of res.rows) {
      console.log(`  Unit ${row.recommended_unit}: ${row.cnt} words`);
      dbTotal += parseInt(row.cnt);
    }
    console.log(`  TOTAL: ${dbTotal} words\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
