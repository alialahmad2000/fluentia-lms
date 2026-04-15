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

// ─── UNIT 1: Bioethics ───
const unit1 = [
  ["bioethicist","noun","متخصص في أخلاقيات علم الأحياء","The bioethicist advised the committee on cloning regulations.","نصح المتخصص في أخلاقيات علم الأحياء اللجنة بشأن قوانين الاستنساخ.","mastery","C1","AWL"],
  ["mutagenesis","noun","عملية إحداث طفرات جينية","Mutagenesis is used in research to study gene function.","تُستخدم عملية إحداث الطفرات في الأبحاث لدراسة وظيفة الجينات.","mastery","C1","AWL"],
  ["germline","noun","الخط الجرثومي؛ الخلايا التناسلية","Germline editing raises serious ethical concerns.","يثير تعديل الخط الجرثومي مخاوف أخلاقية جدية.","mastery","C1","AWL"],
  ["teratogen","noun","مادة مسببة للتشوهات الجنينية","Alcohol is a well-known teratogen during pregnancy.","الكحول مادة معروفة مسببة للتشوهات أثناء الحمل.","mastery","C1","COCA"],
  ["recombinant","adjective","مُعاد التركيب الجيني","Recombinant DNA technology transformed modern medicine.","حوّلت تقنية الحمض النووي المُعاد التركيب الطب الحديث.","extended","B2","AWL"],
  ["eugenics","noun","علم تحسين النسل","The history of eugenics is deeply troubling.","تاريخ علم تحسين النسل مقلق للغاية.","mastery","C1","COCA"],
  ["informed consent","noun","الموافقة المستنيرة","Patients must give informed consent before any procedure.","يجب على المرضى إعطاء الموافقة المستنيرة قبل أي إجراء.","core","B2","CEFR-J"],
  ["embryonic","adjective","جنيني؛ في مرحلة مبكرة","Embryonic stem cell research remains controversial.","لا تزال أبحاث الخلايا الجذعية الجنينية مثيرة للجدل.","extended","B2","AWL"],
  ["surrogate","noun","بديل؛ أم بديلة","She became a surrogate mother for the couple.","أصبحت أماً بديلة للزوجين.","extended","B2","COCA"],
  ["genome","noun","الجينوم؛ المجموع الوراثي","Scientists mapped the entire human genome in 2003.","رسم العلماء خريطة الجينوم البشري بالكامل عام 2003.","core","B2","AWL"],
  ["placebo","noun","دواء وهمي","Half the patients received a placebo during the trial.","تلقى نصف المرضى دواءً وهمياً خلال التجربة.","extended","B2","COCA"],
  ["transgenic","adjective","مُعدَّل وراثياً","Transgenic crops are designed to resist pests.","صُممت المحاصيل المعدلة وراثياً لمقاومة الآفات.","mastery","C1","AWL"],
  ["biosecurity","noun","الأمن البيولوجي","Biosecurity measures prevent the spread of pathogens.","تمنع تدابير الأمن البيولوجي انتشار مسببات الأمراض.","extended","B2","NAWL"],
  ["cloning","noun","الاستنساخ","Human cloning is banned in most countries.","الاستنساخ البشري محظور في معظم الدول.","core","B2","CEFR-J"],
  ["prenatal","adjective","قبل الولادة","Prenatal screening can detect genetic disorders.","يمكن للفحص قبل الولادة اكتشاف الاضطرابات الوراثية.","core","B1","CEFR-J"],
  ["moratorium","noun","تعليق مؤقت؛ وقف اختياري","The government declared a moratorium on genetic experiments.","أعلنت الحكومة وقفاً مؤقتاً للتجارب الجينية.","mastery","C1","AWL"],
  ["pathogen","noun","عامل ممرض؛ ميكروب","The pathogen was identified in the laboratory.","تم التعرف على العامل الممرض في المختبر.","extended","B2","COCA"],
  ["congenital","adjective","خِلقي؛ منذ الولادة","The baby was born with a congenital heart defect.","وُلد الطفل بعيب خلقي في القلب.","extended","B2","COCA"],
  ["vaccination","noun","التطعيم","Vaccination has eradicated many deadly diseases.","القضى التطعيم على العديد من الأمراض الفتاكة.","core","B1","CEFR-J"],
  ["euthanasia","noun","القتل الرحيم","Euthanasia is a highly debated ethical issue.","القتل الرحيم قضية أخلاقية مثيرة للجدل بشدة.","extended","B2","COCA"],
  ["biomarker","noun","مؤشر حيوي","The biomarker indicated early stages of the disease.","أشار المؤشر الحيوي إلى مراحل مبكرة من المرض.","extended","B2","NAWL"],
  ["clinical trial","noun","تجربة سريرية","The drug is currently in a clinical trial.","الدواء حالياً في مرحلة التجربة السريرية.","core","B2","CEFR-J"],
  ["hereditary","adjective","وراثي","The condition is hereditary and runs in families.","الحالة وراثية وتنتقل في العائلات.","core","B2","COCA"],
  ["stem cell","noun","خلية جذعية","Stem cell therapy offers hope for spinal injuries.","يوفر العلاج بالخلايا الجذعية أملاً لإصابات العمود الفقري.","extended","B2","NAWL"],
  ["chromosome","noun","كروموسوم؛ صبغي","Humans have 23 pairs of chromosomes.","لدى الإنسان 23 زوجاً من الكروموسومات.","core","B2","COCA"],
];

// ─── UNIT 2: Deep Ocean ───
const unit2 = [
  ["bioluminescent","adjective","مضيء حيوياً","Bioluminescent organisms light up the deep ocean.","تُضيء الكائنات المضيئة حيوياً أعماق المحيط.","mastery","C1","COCA"],
  ["submersible","noun","غواصة صغيرة للأعماق","The submersible descended to the ocean floor.","هبطت الغواصة الصغيرة إلى قاع المحيط.","extended","B2","COCA"],
  ["thermocline","noun","طبقة التباين الحراري","The thermocline separates warm surface water from cold deep water.","تفصل طبقة التباين الحراري المياه السطحية الدافئة عن المياه العميقة الباردة.","mastery","C1","NAWL"],
  ["pelagic","adjective","بحري؛ متعلق بالمياه المفتوحة","Pelagic fish live in the open ocean away from the coast.","تعيش الأسماك البحرية في المحيط المفتوح بعيداً عن الساحل.","mastery","C1","COCA"],
  ["trawling","noun","الصيد بشباك الجر","Trawling damages the seabed ecosystem significantly.","يضر الصيد بشباك الجر بالنظام البيئي لقاع البحر بشكل كبير.","extended","B2","NAWL"],
  ["sonar","noun","جهاز السونار","The ship used sonar to map the ocean floor.","استخدمت السفينة السونار لرسم خريطة قاع المحيط.","core","B2","CEFR-J"],
  ["hydrothermal","adjective","حراري مائي","Hydrothermal vents support unique ecosystems.","تدعم الفتحات الحرارية المائية أنظمة بيئية فريدة.","extended","B2","AWL"],
  ["abyssal","adjective","سحيق؛ متعلق بالأعماق","The abyssal zone is completely dark and cold.","منطقة الأعماق السحيقة مظلمة وباردة تماماً.","mastery","C1","COCA"],
  ["plankton","noun","عوالق بحرية","Plankton form the base of the marine food chain.","تشكل العوالق البحرية قاعدة السلسلة الغذائية البحرية.","core","B1","CEFR-J"],
  ["trench","noun","خندق محيطي","The Mariana Trench is the deepest point on Earth.","خندق ماريانا هو أعمق نقطة على الأرض.","core","B1","CEFR-J"],
  ["bathymetry","noun","علم قياس أعماق البحار","Bathymetry data revealed underwater mountain ranges.","كشفت بيانات قياس الأعماق عن سلاسل جبلية تحت الماء.","mastery","C1","NAWL"],
  ["salinity","noun","ملوحة","The salinity of the Dead Sea is extremely high.","ملوحة البحر الميت عالية للغاية.","extended","B2","AWL"],
  ["coral reef","noun","شعاب مرجانية","Coral reefs are threatened by rising ocean temperatures.","تتعرض الشعاب المرجانية للتهديد بسبب ارتفاع حرارة المحيطات.","core","B1","CEFR-J"],
  ["sediment","noun","رواسب","Sediment accumulates on the ocean floor over millennia.","تتراكم الرواسب في قاع المحيط عبر آلاف السنين.","core","B2","AWL"],
  ["cetacean","noun","حوتيات","Whales and dolphins are cetaceans.","الحيتان والدلافين من الحوتيات.","mastery","C1","COCA"],
  ["upwelling","noun","تيار صاعد","Upwelling brings nutrient-rich water to the surface.","يجلب التيار الصاعد مياهاً غنية بالمغذيات إلى السطح.","extended","B2","NAWL"],
  ["maritime","adjective","بحري","Maritime law governs activities on the open sea.","ينظم القانون البحري الأنشطة في عرض البحر.","core","B2","CEFR-J"],
  ["aquaculture","noun","تربية الأحياء المائية","Aquaculture provides an alternative to wild fishing.","توفر تربية الأحياء المائية بديلاً للصيد البري.","extended","B2","NAWL"],
  ["continental shelf","noun","الجرف القاري","The continental shelf extends from the coastline.","يمتد الجرف القاري من خط الساحل.","extended","B2","COCA"],
  ["echolocation","noun","تحديد الموقع بالصدى","Dolphins use echolocation to find prey.","تستخدم الدلافين تحديد الموقع بالصدى للعثور على الفريسة.","extended","B2","COCA"],
  ["microorganism","noun","كائن دقيق","Deep-sea microorganisms survive extreme conditions.","تعيش الكائنات الدقيقة في أعماق البحار في ظروف قاسية.","core","B2","CEFR-J"],
  ["tidal","adjective","مَدّي؛ متعلق بالمد والجزر","Tidal energy is a renewable power source.","طاقة المد والجزر مصدر طاقة متجدد.","core","B1","CEFR-J"],
  ["phosphorescent","adjective","فسفوري؛ متوهج","The phosphorescent glow attracted smaller fish.","جذب التوهج الفسفوري أسماكاً أصغر.","mastery","C1","COCA"],
  ["biodiversity","noun","التنوع البيولوجي","Ocean biodiversity is declining at an alarming rate.","يتراجع التنوع البيولوجي في المحيطات بمعدل مقلق.","core","B2","AWL"],
  ["seamount","noun","جبل بحري","Seamounts are underwater mountains formed by volcanic activity.","الجبال البحرية هي جبال تحت الماء تشكلت بفعل النشاط البركاني.","extended","B2","NAWL"],
];

// ─── UNIT 3: Food Security ───
const unit3 = [
  ["agrochemical","noun","مادة كيميائية زراعية","Agrochemical use has increased crop yields worldwide.","زاد استخدام المواد الكيميائية الزراعية من غلة المحاصيل عالمياً.","extended","B2","NAWL"],
  ["subsistence","noun","كفاف؛ حد الكفاف","Many farmers practice subsistence agriculture.","يمارس كثير من المزارعين الزراعة للكفاف.","extended","B2","AWL"],
  ["arable","adjective","صالح للزراعة","Arable land is decreasing due to urbanization.","تتناقص الأراضي الصالحة للزراعة بسبب التوسع العمراني.","extended","B2","AWL"],
  ["famine","noun","مجاعة","The famine affected millions of people in the region.","أثرت المجاعة على ملايين الأشخاص في المنطقة.","core","B1","CEFR-J"],
  ["herbicide","noun","مبيد أعشاب","Farmers spray herbicide to control weeds.","يرش المزارعون مبيدات الأعشاب للسيطرة على الحشائش.","extended","B2","COCA"],
  ["biofortification","noun","التعزيز الحيوي للمحاصيل","Biofortification adds essential nutrients to staple crops.","يضيف التعزيز الحيوي العناصر الغذائية الأساسية للمحاصيل الرئيسية.","mastery","C1","AWL"],
  ["irrigation","noun","ري","Modern irrigation systems save water efficiently.","توفر أنظمة الري الحديثة المياه بكفاءة.","core","B1","CEFR-J"],
  ["monoculture","noun","زراعة أحادية المحصول","Monoculture farming depletes soil nutrients quickly.","تستنزف الزراعة الأحادية مغذيات التربة بسرعة.","extended","B2","NAWL"],
  ["pesticide","noun","مبيد حشري","Excessive pesticide use harms beneficial insects.","يضر الاستخدام المفرط للمبيدات الحشرية بالحشرات المفيدة.","core","B1","CEFR-J"],
  ["drought","noun","جفاف","The prolonged drought destroyed most of the harvest.","دمّر الجفاف المطوّل معظم المحصول.","core","B1","CEFR-J"],
  ["genetically modified","adjective","معدّل وراثياً","Genetically modified crops are banned in some countries.","المحاصيل المعدلة وراثياً محظورة في بعض الدول.","core","B2","CEFR-J"],
  ["crop rotation","noun","تناوب المحاصيل","Crop rotation helps maintain soil fertility.","يساعد تناوب المحاصيل في الحفاظ على خصوبة التربة.","extended","B2","NAWL"],
  ["malnutrition","noun","سوء التغذية","Malnutrition affects children's cognitive development.","يؤثر سوء التغذية على النمو المعرفي للأطفال.","core","B2","COCA"],
  ["yield","noun","غلة؛ محصول","The wheat yield increased by 20% this year.","زادت غلة القمح بنسبة 20% هذا العام.","core","B1","CEFR-J"],
  ["sustainable farming","noun","الزراعة المستدامة","Sustainable farming protects the environment for future generations.","تحمي الزراعة المستدامة البيئة للأجيال القادمة.","core","B2","AWL"],
  ["food sovereignty","noun","السيادة الغذائية","Food sovereignty gives communities control over their food systems.","تمنح السيادة الغذائية المجتمعات السيطرة على أنظمتها الغذائية.","mastery","C1","AWL"],
  ["topsoil","noun","التربة السطحية","Erosion strips away valuable topsoil every year.","يزيل التعرية التربة السطحية القيمة كل عام.","extended","B2","COCA"],
  ["fertilizer","noun","سماد","Organic fertilizer improves soil health naturally.","يحسّن السماد العضوي صحة التربة بشكل طبيعي.","core","B1","CEFR-J"],
  ["hydroponics","noun","الزراعة المائية","Hydroponics allows growing vegetables without soil.","تسمح الزراعة المائية بزراعة الخضروات بدون تربة.","extended","B2","NAWL"],
  ["desertification","noun","التصحر","Desertification threatens farmland across Africa.","يهدد التصحر الأراضي الزراعية في أنحاء أفريقيا.","extended","B2","AWL"],
  ["grain reserve","noun","احتياطي الحبوب","The national grain reserve was nearly depleted.","كاد احتياطي الحبوب الوطني أن ينفد.","extended","B2","NAWL"],
  ["pollinator","noun","ملقِّح","Bees are the most important pollinators for crops.","النحل أهم الملقحات للمحاصيل.","extended","B2","COCA"],
  ["food chain","noun","سلسلة غذائية","Pesticides can contaminate the entire food chain.","يمكن للمبيدات أن تلوث السلسلة الغذائية بأكملها.","core","B1","CEFR-J"],
  ["compost","noun","سماد عضوي متحلل","Adding compost enriches the soil with nutrients.","تضيف إضافة السماد العضوي المتحلل مغذيات للتربة.","core","B1","CEFR-J"],
  ["agronomy","noun","علم الزراعة","Agronomy focuses on sustainable crop production.","يركز علم الزراعة على الإنتاج المستدام للمحاصيل.","mastery","C1","AWL"],
];

// ─── UNIT 4: Biomimicry ───
const unit4 = [
  ["bioplastic","noun","بلاستيك حيوي","Bioplastic is made from renewable plant materials.","البلاستيك الحيوي مصنوع من مواد نباتية متجددة.","extended","B2","NAWL"],
  ["hydrophobic","adjective","كاره للماء؛ طارد للمياه","Lotus leaves have a hydrophobic surface.","أوراق اللوتس لها سطح طارد للمياه.","mastery","C1","COCA"],
  ["nanostructure","noun","بنية نانوية","The nanostructure of butterfly wings creates iridescent colors.","تُنشئ البنية النانوية لأجنحة الفراشات ألواناً قزحية.","mastery","C1","AWL"],
  ["fibrous","adjective","ليفي","The fibrous material mimics spider silk strength.","تحاكي المادة الليفية قوة حرير العنكبوت.","extended","B2","COCA"],
  ["morphology","noun","علم الشكل؛ التشكّل","The morphology of the shell inspired a new helmet design.","ألهم شكل الصدفة تصميم خوذة جديدة.","extended","B2","AWL"],
  ["polymer","noun","بوليمر؛ مُبلمَر","Engineers developed a self-healing polymer.","طوّر المهندسون بوليمراً ذاتي الإصلاح.","extended","B2","COCA"],
  ["aerodynamic","adjective","انسيابي؛ ديناميكي هوائي","The bird's aerodynamic shape inspired the bullet train.","ألهم الشكل الانسيابي للطائر تصميم القطار السريع.","core","B2","CEFR-J"],
  ["photosynthesis","noun","التمثيل الضوئي","Artificial photosynthesis could produce clean fuel.","قد ينتج التمثيل الضوئي الاصطناعي وقوداً نظيفاً.","core","B2","CEFR-J"],
  ["adhesive","noun","مادة لاصقة","The gecko-inspired adhesive works on any surface.","تعمل المادة اللاصقة المستوحاة من الوزغة على أي سطح.","core","B2","COCA"],
  ["biomaterial","noun","مادة حيوية","The biomaterial is compatible with human tissue.","المادة الحيوية متوافقة مع الأنسجة البشرية.","extended","B2","AWL"],
  ["resilience","noun","مرونة؛ قدرة على التعافي","The material shows remarkable resilience under stress.","تُظهر المادة مرونة ملحوظة تحت الضغط.","core","B2","AWL"],
  ["synthetic","adjective","اصطناعي؛ تركيبي","Synthetic fibers mimic the properties of natural silk.","تحاكي الألياف الاصطناعية خصائص الحرير الطبيعي.","core","B1","CEFR-J"],
  ["exoskeleton","noun","هيكل خارجي","The robotic exoskeleton helps paralyzed patients walk.","يساعد الهيكل الخارجي الآلي المرضى المشلولين على المشي.","extended","B2","COCA"],
  ["tensile","adjective","شدّي؛ متعلق بالشد","Spider silk has extraordinary tensile strength.","يمتلك حرير العنكبوت قوة شد استثنائية.","mastery","C1","COCA"],
  ["permeable","adjective","نفّاذ؛ قابل للاختراق","The permeable membrane filters salt from seawater.","يُرشّح الغشاء النفّاذ الملح من مياه البحر.","extended","B2","AWL"],
  ["prototype","noun","نموذج أولي","The team built a prototype based on the fin design.","بنى الفريق نموذجاً أولياً مبنياً على تصميم الزعنفة.","core","B2","CEFR-J"],
  ["camouflage","noun","تمويه","The chameleon's camouflage inspired adaptive textiles.","ألهم تمويه الحرباء صناعة الأقمشة التكيفية.","core","B1","CEFR-J"],
  ["biodegradable","adjective","قابل للتحلل الحيوي","The packaging is fully biodegradable within months.","العبوة قابلة للتحلل الحيوي بالكامل خلال أشهر.","core","B2","NAWL"],
  ["microstructure","noun","بنية مجهرية","The microstructure of bone provides lightweight strength.","توفر البنية المجهرية للعظام قوة خفيفة الوزن.","mastery","C1","NAWL"],
  ["elasticity","noun","مرونة","The elasticity of the material allows it to stretch and return.","تسمح مرونة المادة لها بالتمدد والعودة.","extended","B2","AWL"],
  ["self-healing","adjective","ذاتي الإصلاح","Self-healing concrete contains bacteria that seal cracks.","يحتوي الخرسانة ذاتية الإصلاح على بكتيريا تسد الشقوق.","extended","B2","NAWL"],
  ["streamlined","adjective","انسيابي","The streamlined body of a dolphin reduces water drag.","يقلل الجسم الانسيابي للدلفين من مقاومة الماء.","core","B2","CEFR-J"],
  ["thermal regulation","noun","تنظيم حراري","Termite mounds achieve thermal regulation naturally.","تحقق تلال النمل الأبيض تنظيماً حرارياً طبيعياً.","extended","B2","AWL"],
  ["lightweight","adjective","خفيف الوزن","The lightweight structure was inspired by bird bones.","استُلهمت البنية خفيفة الوزن من عظام الطيور.","core","B1","CEFR-J"],
  ["regenerative","adjective","تجديدي","Starfish have remarkable regenerative abilities.","تمتلك نجمة البحر قدرات تجديدية ملحوظة.","extended","B2","AWL"],
];

// ─── UNIT 5: Migration ───
const unit5 = [
  ["expatriate","noun","مغترب","Many expatriates work in the Gulf countries.","يعمل كثير من المغتربين في دول الخليج.","extended","B2","COCA"],
  ["naturalization","noun","تجنيس","The naturalization process took several years.","استغرقت عملية التجنيس عدة سنوات.","extended","B2","AWL"],
  ["deportation","noun","ترحيل","He faced deportation after his visa expired.","واجه الترحيل بعد انتهاء صلاحية تأشيرته.","core","B2","COCA"],
  ["stateless","adjective","عديم الجنسية","Stateless people lack legal protection in any country.","يفتقر عديمو الجنسية إلى الحماية القانونية في أي بلد.","extended","B2","AWL"],
  ["undocumented","adjective","غير موثّق؛ بدون أوراق رسمية","Undocumented workers face exploitation and low wages.","يواجه العمال غير الموثقين الاستغلال والأجور المنخفضة.","core","B2","COCA"],
  ["quota","noun","حصة؛ نصيب","The country set an immigration quota for each year.","حددت الدولة حصة هجرة لكل عام.","core","B2","AWL"],
  ["asylum","noun","لجوء","She applied for political asylum in Sweden.","تقدمت بطلب لجوء سياسي في السويد.","core","B2","CEFR-J"],
  ["displacement","noun","تهجير؛ نزوح","War caused the displacement of millions of civilians.","تسببت الحرب في تهجير ملايين المدنيين.","core","B2","AWL"],
  ["remittance","noun","حوالة مالية","Remittances make up a large part of the country's GDP.","تشكل الحوالات المالية جزءاً كبيراً من الناتج المحلي للبلاد.","extended","B2","AWL"],
  ["refugee camp","noun","مخيم لاجئين","The refugee camp housed over fifty thousand people.","استضاف مخيم اللاجئين أكثر من خمسين ألف شخص.","core","B1","CEFR-J"],
  ["assimilation","noun","اندماج؛ استيعاب","Cultural assimilation takes generations to complete.","يستغرق الاندماج الثقافي أجيالاً ليكتمل.","extended","B2","AWL"],
  ["diaspora","noun","شتات","The Lebanese diaspora is spread across the globe.","ينتشر الشتات اللبناني في جميع أنحاء العالم.","mastery","C1","COCA"],
  ["xenophobia","noun","كراهية الأجانب","Xenophobia has increased in several European nations.","تزايدت كراهية الأجانب في عدة دول أوروبية.","mastery","C1","COCA"],
  ["visa","noun","تأشيرة","She applied for a work visa at the embassy.","تقدمت بطلب تأشيرة عمل في السفارة.","core","B1","CEFR-J"],
  ["repatriation","noun","إعادة إلى الوطن","Forced repatriation violates international law.","تنتهك الإعادة القسرية إلى الوطن القانون الدولي.","mastery","C1","AWL"],
  ["citizenship","noun","جنسية؛ مواطنة","She obtained citizenship after passing the exam.","حصلت على الجنسية بعد اجتياز الاختبار.","core","B1","CEFR-J"],
  ["persecution","noun","اضطهاد","They fled their homeland due to religious persecution.","فروا من وطنهم بسبب الاضطهاد الديني.","extended","B2","AWL"],
  ["integration","noun","اندماج","Language courses support immigrant integration.","تدعم دورات اللغة اندماج المهاجرين.","core","B2","AWL"],
  ["human trafficking","noun","الاتجار بالبشر","Human trafficking is a serious global crime.","الاتجار بالبشر جريمة عالمية خطيرة.","extended","B2","COCA"],
  ["border control","noun","مراقبة الحدود","Border control has been tightened at all entry points.","شُددت مراقبة الحدود عند جميع نقاط الدخول.","core","B1","CEFR-J"],
  ["migrant worker","noun","عامل مهاجر","Migrant workers contribute significantly to the economy.","يساهم العمال المهاجرون بشكل كبير في الاقتصاد.","core","B2","CEFR-J"],
  ["sanctuary","noun","ملاذ آمن","The city declared itself a sanctuary for refugees.","أعلنت المدينة نفسها ملاذاً آمناً للاجئين.","extended","B2","COCA"],
  ["resettlement","noun","إعادة توطين","The resettlement program relocated families to safer regions.","أعاد برنامج إعادة التوطين توطين العائلات في مناطق أكثر أماناً.","extended","B2","AWL"],
  ["emigrate","verb","يهاجر من بلده","Thousands emigrate each year in search of better opportunities.","يهاجر الآلاف كل عام بحثاً عن فرص أفضل.","core","B2","CEFR-J"],
  ["amnesty","noun","عفو عام","The government granted amnesty to undocumented immigrants.","منحت الحكومة عفواً عاماً للمهاجرين غير الموثقين.","extended","B2","COCA"],
];

// ─── UNIT 6: Cryptocurrency ───
const unit6 = [
  ["volatility","noun","تقلب الأسعار","The volatility of Bitcoin makes it a risky investment.","يجعل تقلب أسعار البيتكوين منه استثماراً محفوفاً بالمخاطر.","core","B2","AWL"],
  ["ledger","noun","سجل مالي","Blockchain is a distributed digital ledger.","البلوكتشين سجل رقمي موزع.","extended","B2","COCA"],
  ["validator","noun","مدقق؛ مصادق","Validators confirm transactions on the blockchain network.","يؤكد المدققون المعاملات على شبكة البلوكتشين.","extended","B2","NAWL"],
  ["fork","noun","انقسام؛ تفرع","A hard fork creates a completely new blockchain.","ينشئ الانقسام الصلب سلسلة كتل جديدة تماماً.","extended","B2","COCA"],
  ["airdrop","noun","توزيع مجاني للعملات","The company announced an airdrop of free tokens.","أعلنت الشركة عن توزيع مجاني للعملات الرقمية.","extended","B2","NAWL"],
  ["liquidity","noun","سيولة","High liquidity makes it easier to sell assets quickly.","تسهّل السيولة العالية بيع الأصول بسرعة.","core","B2","AWL"],
  ["decentralized","adjective","لامركزي","Decentralized finance removes the need for banks.","يلغي التمويل اللامركزي الحاجة إلى البنوك.","extended","B2","AWL"],
  ["mining","noun","تعدين العملات الرقمية","Crypto mining consumes enormous amounts of electricity.","يستهلك تعدين العملات الرقمية كميات هائلة من الكهرباء.","core","B1","CEFR-J"],
  ["wallet","noun","محفظة رقمية","Store your cryptocurrency in a secure digital wallet.","خزّن عملتك الرقمية في محفظة رقمية آمنة.","core","B1","CEFR-J"],
  ["token","noun","رمز رقمي","Each token represents a share in the project.","يمثل كل رمز رقمي حصة في المشروع.","core","B2","CEFR-J"],
  ["smart contract","noun","عقد ذكي","The smart contract executes automatically when conditions are met.","ينفذ العقد الذكي تلقائياً عند استيفاء الشروط.","extended","B2","NAWL"],
  ["staking","noun","رهن العملات الرقمية","Staking allows users to earn rewards by holding coins.","يسمح رهن العملات للمستخدمين بكسب مكافآت من الاحتفاظ بالعملات.","extended","B2","NAWL"],
  ["hash rate","noun","معدل التجزئة","A higher hash rate means more computing power.","يعني معدل تجزئة أعلى قوة حوسبة أكبر.","mastery","C1","NAWL"],
  ["peer-to-peer","adjective","من نظير إلى نظير","Peer-to-peer transactions eliminate intermediaries.","تلغي المعاملات من نظير إلى نظير الوسطاء.","core","B2","CEFR-J"],
  ["encryption","noun","تشفير","Strong encryption protects all financial data.","يحمي التشفير القوي جميع البيانات المالية.","core","B2","COCA"],
  ["consensus mechanism","noun","آلية الإجماع","Proof of Stake is a popular consensus mechanism.","إثبات الحصة آلية إجماع شائعة.","mastery","C1","AWL"],
  ["market cap","noun","القيمة السوقية","Bitcoin has the largest market cap among cryptocurrencies.","تمتلك البيتكوين أكبر قيمة سوقية بين العملات الرقمية.","core","B2","COCA"],
  ["speculative","adjective","مضاربي؛ تخميني","Speculative trading in crypto can lead to huge losses.","قد يؤدي التداول المضاربي في العملات الرقمية إلى خسائر ضخمة.","extended","B2","AWL"],
  ["deflationary","adjective","انكماشي","Bitcoin is designed to be deflationary over time.","صُمم البيتكوين ليكون انكماشياً بمرور الوقت.","mastery","C1","AWL"],
  ["exchange","noun","منصة تداول","She bought Ethereum on a regulated exchange.","اشترت الإيثريوم من منصة تداول مرخصة.","core","B1","CEFR-J"],
  ["anonymous","adjective","مجهول الهوية","Some cryptocurrencies offer anonymous transactions.","توفر بعض العملات الرقمية معاملات مجهولة الهوية.","core","B2","CEFR-J"],
  ["yield farming","noun","زراعة العائد","Yield farming generates passive income from crypto.","تولّد زراعة العائد دخلاً سلبياً من العملات الرقمية.","mastery","C1","NAWL"],
  ["whitepaper","noun","ورقة بيضاء؛ وثيقة تقنية","The project's whitepaper explains its technology in detail.","تشرح الورقة البيضاء للمشروع تقنيته بالتفصيل.","extended","B2","NAWL"],
  ["initial coin offering","noun","طرح أولي للعملة","The initial coin offering raised millions of dollars.","جمع الطرح الأولي للعملة ملايين الدولارات.","mastery","C1","NAWL"],
  ["fiat currency","noun","عملة ورقية تقليدية","Unlike fiat currency, Bitcoin has a fixed supply.","على عكس العملة الورقية التقليدية، لدى البيتكوين عرض ثابت.","extended","B2","AWL"],
];

// ─── UNIT 7: Crowd Psychology ───
const unit7 = [
  ["bystander","noun","متفرج؛ شاهد عيان","The bystander effect prevents people from helping in crowds.","يمنع تأثير المتفرج الناس من تقديم المساعدة في الحشود.","core","B2","COCA"],
  ["cognitive bias","noun","تحيز معرفي","Cognitive bias affects our decision-making process.","يؤثر التحيز المعرفي على عملية اتخاذ قراراتنا.","extended","B2","AWL"],
  ["propaganda","noun","دعاية؛ بروباغندا","Propaganda was used to manipulate public opinion.","استُخدمت الدعاية للتلاعب بالرأي العام.","core","B2","CEFR-J"],
  ["heuristic","noun","استدلال تقريبي","People use mental heuristics to make quick decisions.","يستخدم الناس الاستدلال التقريبي لاتخاذ قرارات سريعة.","mastery","C1","AWL"],
  ["stereotype","noun","صورة نمطية","Stereotypes can lead to unfair discrimination.","يمكن أن تؤدي الصور النمطية إلى تمييز غير عادل.","core","B1","CEFR-J"],
  ["obedience","noun","طاعة","The Milgram experiment studied obedience to authority.","درست تجربة ميلغرام الطاعة للسلطة.","core","B2","COCA"],
  ["conformity","noun","مسايرة؛ امتثال","Social conformity pressures individuals to follow the group.","يضغط الامتثال الاجتماعي على الأفراد لمتابعة المجموعة.","extended","B2","AWL"],
  ["groupthink","noun","التفكير الجماعي","Groupthink led the team to overlook serious flaws.","أدى التفكير الجماعي بالفريق إلى تجاهل عيوب خطيرة.","extended","B2","NAWL"],
  ["mob mentality","noun","عقلية القطيع","Mob mentality causes rational people to act irrationally.","تتسبب عقلية القطيع في تصرف الأشخاص العقلاء بشكل غير عقلاني.","extended","B2","COCA"],
  ["deindividuation","noun","فقدان الهوية الفردية","Deindividuation in crowds reduces personal accountability.","يقلل فقدان الهوية الفردية في الحشود من المسؤولية الشخصية.","mastery","C1","AWL"],
  ["scapegoat","noun","كبش فداء","The minority group became a scapegoat for economic problems.","أصبحت مجموعة الأقلية كبش فداء للمشاكل الاقتصادية.","extended","B2","COCA"],
  ["persuasion","noun","إقناع","The psychology of persuasion is used in marketing.","يُستخدم علم نفس الإقناع في التسويق.","core","B2","CEFR-J"],
  ["peer pressure","noun","ضغط الأقران","Peer pressure influences teenagers' behavior significantly.","يؤثر ضغط الأقران بشكل كبير على سلوك المراهقين.","core","B1","CEFR-J"],
  ["mass hysteria","noun","هستيريا جماعية","Mass hysteria spread through the town after the rumor.","انتشرت الهستيريا الجماعية في المدينة بعد الإشاعة.","extended","B2","COCA"],
  ["subliminal","adjective","تحت عتبة الوعي","Subliminal messages can influence behavior without awareness.","يمكن للرسائل تحت عتبة الوعي التأثير على السلوك دون إدراك.","mastery","C1","COCA"],
  ["desensitization","noun","إزالة الحساسية","Repeated exposure leads to desensitization to violence.","يؤدي التعرض المتكرر إلى إزالة الحساسية تجاه العنف.","extended","B2","AWL"],
  ["social proof","noun","الدليل الاجتماعي","Social proof makes people follow the actions of others.","يجعل الدليل الاجتماعي الناس يتبعون تصرفات الآخرين.","extended","B2","NAWL"],
  ["anonymity","noun","إخفاء الهوية","Online anonymity can encourage aggressive behavior.","يمكن لإخفاء الهوية عبر الإنترنت تشجيع السلوك العدواني.","core","B2","AWL"],
  ["charismatic","adjective","كاريزمي؛ ذو جاذبية","The charismatic leader inspired millions of followers.","ألهم القائد الكاريزمي ملايين الأتباع.","core","B2","COCA"],
  ["radicalization","noun","التطرف","Online radicalization has become a major security concern.","أصبح التطرف عبر الإنترنت مصدر قلق أمني رئيسي.","extended","B2","AWL"],
  ["manipulation","noun","تلاعب","Emotional manipulation is a common tactic of cult leaders.","التلاعب العاطفي تكتيك شائع لقادة الطوائف.","core","B2","COCA"],
  ["collective behavior","noun","سلوك جماعي","Collective behavior is studied in social psychology.","يُدرَس السلوك الجماعي في علم النفس الاجتماعي.","extended","B2","AWL"],
  ["empathy","noun","تعاطف","Empathy decreases as crowd size increases.","يتناقص التعاطف كلما زاد حجم الحشد.","core","B2","CEFR-J"],
  ["misinformation","noun","معلومات مضللة","Misinformation spreads faster in panicked crowds.","تنتشر المعلومات المضللة أسرع في الحشود المذعورة.","core","B2","COCA"],
  ["tribalism","noun","قبلية؛ تعصب جماعي","Political tribalism divides society into hostile camps.","تقسم القبلية السياسية المجتمع إلى معسكرات معادية.","mastery","C1","COCA"],
];

// ─── UNIT 8: Forensic Science ───
const unit8 = [
  ["coroner","noun","طبيب شرعي","The coroner determined the cause of death.","حدد الطبيب الشرعي سبب الوفاة.","extended","B2","COCA"],
  ["pathologist","noun","أخصائي علم الأمراض","The forensic pathologist examined the tissue samples.","فحص أخصائي علم الأمراض الشرعي عينات الأنسجة.","extended","B2","COCA"],
  ["incriminate","verb","يدين؛ يجرّم","The DNA evidence incriminated the suspect.","أدان دليل الحمض النووي المشتبه به.","extended","B2","COCA"],
  ["circumstantial","adjective","ظرفي؛ غير مباشر","The case relied on circumstantial evidence only.","اعتمدت القضية على أدلة ظرفية فقط.","extended","B2","AWL"],
  ["arson","noun","حرق عمد","The fire was classified as arson after investigation.","صُنّف الحريق كحرق عمد بعد التحقيق.","core","B2","COCA"],
  ["tamper","verb","يعبث؛ يتلاعب بـ","Someone tampered with the evidence at the crime scene.","عبث شخص ما بالأدلة في مسرح الجريمة.","extended","B2","COCA"],
  ["autopsy","noun","تشريح الجثة","The autopsy revealed traces of poison.","كشف تشريح الجثة عن آثار سم.","core","B2","COCA"],
  ["ballistics","noun","علم المقذوفات","Ballistics analysis matched the bullet to the weapon.","طابق تحليل المقذوفات الرصاصة بالسلاح.","mastery","C1","COCA"],
  ["fingerprint","noun","بصمة إصبع","A single fingerprint identified the burglar.","حددت بصمة إصبع واحدة هوية اللص.","core","B1","CEFR-J"],
  ["toxicology","noun","علم السموم","The toxicology report showed high levels of arsenic.","أظهر تقرير علم السموم مستويات عالية من الزرنيخ.","mastery","C1","COCA"],
  ["perpetrator","noun","الجاني؛ مرتكب الجريمة","The perpetrator was caught within hours.","قُبض على الجاني في غضون ساعات.","extended","B2","AWL"],
  ["chain of custody","noun","سلسلة الحفظ","Breaking the chain of custody makes evidence inadmissible.","يجعل كسر سلسلة الحفظ الأدلة غير مقبولة.","mastery","C1","NAWL"],
  ["forensic","adjective","شرعي؛ جنائي","Forensic scientists analyzed the blood spatter pattern.","حلل علماء الطب الشرعي نمط تناثر الدم.","core","B2","COCA"],
  ["testimony","noun","شهادة","Her testimony contradicted the defendant's alibi.","تناقضت شهادتها مع حجة دفاع المتهم.","core","B2","CEFR-J"],
  ["suspect","noun","مشتبه به","The police detained the primary suspect.","احتجزت الشرطة المشتبه به الرئيسي.","core","B1","CEFR-J"],
  ["trace evidence","noun","دليل أثري","Trace evidence includes hair, fibers, and soil.","يشمل الدليل الأثري الشعر والألياف والتربة.","extended","B2","NAWL"],
  ["warrant","noun","مذكرة قضائية","The judge issued a search warrant for the house.","أصدر القاضي مذكرة تفتيش للمنزل.","core","B2","CEFR-J"],
  ["eyewitness","noun","شاهد عيان","The eyewitness identified the attacker in a lineup.","تعرّف شاهد العيان على المهاجم في طابور.","core","B2","COCA"],
  ["motive","noun","دافع","Jealousy was the main motive for the crime.","كانت الغيرة الدافع الرئيسي للجريمة.","core","B2","COCA"],
  ["jurisdiction","noun","اختصاص قضائي","The case fell outside the local court's jurisdiction.","خرجت القضية عن اختصاص المحكمة المحلية.","extended","B2","AWL"],
  ["plea bargain","noun","صفقة الإقرار بالذنب","The defendant accepted a plea bargain to reduce his sentence.","قبل المتهم صفقة إقرار بالذنب لتخفيف حكمه.","extended","B2","COCA"],
  ["cadaver","noun","جثة","The cadaver was found near the riverbank.","عُثر على الجثة بالقرب من ضفة النهر.","mastery","C1","COCA"],
  ["surveillance","noun","مراقبة","Surveillance cameras captured the robbery on video.","التقطت كاميرات المراقبة عملية السرقة بالفيديو.","core","B2","AWL"],
  ["blood spatter","noun","تناثر الدم","Blood spatter analysis reconstructed the sequence of events.","أعاد تحليل تناثر الدم بناء تسلسل الأحداث.","mastery","C1","NAWL"],
  ["acquittal","noun","تبرئة","The jury's acquittal surprised the prosecution.","فاجأت تبرئة هيئة المحلفين الادعاء.","extended","B2","COCA"],
];

// ─── UNIT 9: Archaeology ───
const unit9 = [
  ["excavation","noun","تنقيب؛ حفريات","The excavation uncovered a Roman villa.","كشفت الحفريات عن فيلا رومانية.","core","B2","AWL"],
  ["artifact","noun","قطعة أثرية","The museum displayed a 3,000-year-old artifact.","عرض المتحف قطعة أثرية عمرها 3000 عام.","core","B2","COCA"],
  ["antiquity","noun","العصور القديمة","These ruins date back to classical antiquity.","تعود هذه الآثار إلى العصور الكلاسيكية القديمة.","extended","B2","AWL"],
  ["mosaic","noun","فسيفساء","The Roman mosaic floor was remarkably well preserved.","كانت أرضية الفسيفساء الرومانية محفوظة بشكل رائع.","core","B2","COCA"],
  ["inscription","noun","نقش كتابي","The inscription on the stone was written in hieroglyphs.","كُتب النقش على الحجر بالهيروغليفية.","extended","B2","COCA"],
  ["obelisk","noun","مسلة","The ancient obelisk stands over twenty meters tall.","يبلغ ارتفاع المسلة القديمة أكثر من عشرين متراً.","extended","B2","COCA"],
  ["pottery","noun","فخار","Pottery fragments reveal ancient trade patterns.","تكشف شظايا الفخار عن أنماط التجارة القديمة.","core","B1","CEFR-J"],
  ["stratigraphy","noun","علم طبقات الأرض","Stratigraphy helps determine the age of buried objects.","يساعد علم طبقات الأرض في تحديد عمر الأشياء المدفونة.","mastery","C1","AWL"],
  ["sarcophagus","noun","تابوت حجري","The sarcophagus contained the remains of a pharaoh.","احتوى التابوت الحجري على رفات فرعون.","mastery","C1","COCA"],
  ["carbon dating","noun","التأريخ بالكربون","Carbon dating placed the bones at 5,000 years old.","حدد التأريخ بالكربون عمر العظام بـ 5000 عام.","extended","B2","NAWL"],
  ["hieroglyph","noun","رمز هيروغليفي","Each hieroglyph represents a word or sound.","يمثل كل رمز هيروغليفي كلمة أو صوتاً.","extended","B2","COCA"],
  ["relic","noun","أثر؛ بقايا تاريخية","The relic was carefully stored in a climate-controlled room.","حُفظ الأثر بعناية في غرفة مُتحكَّم بدرجة حرارتها.","core","B2","COCA"],
  ["civilization","noun","حضارة","The Sumerian civilization is one of the oldest known.","الحضارة السومرية واحدة من أقدم الحضارات المعروفة.","core","B1","CEFR-J"],
  ["tomb","noun","قبر؛ مدفن","Archaeologists discovered an unopened royal tomb.","اكتشف علماء الآثار مدفناً ملكياً لم يُفتح.","core","B1","CEFR-J"],
  ["prehistoric","adjective","ما قبل التاريخ","Prehistoric cave paintings were found in southern France.","عُثر على رسومات كهفية من عصور ما قبل التاريخ في جنوب فرنسا.","core","B2","CEFR-J"],
  ["restoration","noun","ترميم","The restoration of the ancient temple took five years.","استغرق ترميم المعبد القديم خمس سنوات.","core","B2","AWL"],
  ["cuneiform","noun","الكتابة المسمارية","Cuneiform was the earliest form of writing.","كانت الكتابة المسمارية أقدم شكل من أشكال الكتابة.","mastery","C1","COCA"],
  ["archaeological site","noun","موقع أثري","The archaeological site was protected by UNESCO.","حُمي الموقع الأثري من قبل اليونسكو.","core","B2","CEFR-J"],
  ["sedimentary","adjective","رسوبي","The fossils were preserved in sedimentary rock.","حُفظت الحفريات في صخور رسوبية.","extended","B2","AWL"],
  ["mummy","noun","مومياء","The mummy was found wrapped in linen bandages.","عُثر على المومياء ملفوفة بضمادات كتانية.","core","B1","CEFR-J"],
  ["cultural heritage","noun","التراث الثقافي","Protecting cultural heritage is an international responsibility.","حماية التراث الثقافي مسؤولية دولية.","core","B2","AWL"],
  ["paleontology","noun","علم الحفريات","Paleontology studies the history of life through fossils.","يدرس علم الحفريات تاريخ الحياة من خلال المستحاثات.","extended","B2","COCA"],
  ["amulet","noun","تميمة","The gold amulet was believed to bring protection.","كان يُعتقد أن التميمة الذهبية تجلب الحماية.","extended","B2","COCA"],
  ["dynasty","noun","سلالة حاكمة","The Ming dynasty ruled China for nearly 300 years.","حكمت سلالة مينغ الصين لنحو 300 عام.","core","B2","COCA"],
  ["necropolis","noun","مدينة الموتى؛ مقبرة قديمة","The necropolis contained hundreds of ancient burials.","احتوت مدينة الموتى على مئات المدافن القديمة.","mastery","C1","COCA"],
];

// ─── UNIT 10: Longevity ───
const unit10 = [
  ["mitochondrial","adjective","متعلق بالميتوكوندريا","Mitochondrial damage accelerates the aging process.","يُسرّع تلف الميتوكوندريا عملية الشيخوخة.","mastery","C1","COCA"],
  ["oxidative stress","noun","الإجهاد التأكسدي","Oxidative stress contributes to cellular aging.","يساهم الإجهاد التأكسدي في شيخوخة الخلايا.","mastery","C1","AWL"],
  ["centenarian","noun","معمّر؛ شخص تجاوز المئة عام","The centenarian credited her long life to a healthy diet.","عزت المعمّرة حياتها الطويلة إلى نظام غذائي صحي.","extended","B2","COCA"],
  ["degenerative","adjective","تنكسي؛ تدهوري","Alzheimer's is a degenerative brain disease.","الزهايمر مرض دماغي تنكسي.","extended","B2","COCA"],
  ["rejuvenation","noun","تجديد الشباب","Scientists are exploring cellular rejuvenation therapies.","يستكشف العلماء علاجات تجديد الخلايا.","extended","B2","COCA"],
  ["telomere","noun","قسيم طرفي","Shorter telomeres are associated with biological aging.","ترتبط القسيمات الطرفية الأقصر بالشيخوخة البيولوجية.","mastery","C1","COCA"],
  ["metabolism","noun","أيض؛ عملية التمثيل الغذائي","Metabolism slows down as people age.","يتباطأ الأيض مع تقدم الناس في العمر.","core","B2","COCA"],
  ["antioxidant","noun","مضاد للأكسدة","Blueberries are rich in antioxidants.","التوت الأزرق غني بمضادات الأكسدة.","core","B2","CEFR-J"],
  ["cognitive decline","noun","التدهور المعرفي","Regular exercise helps prevent cognitive decline.","تساعد التمارين المنتظمة في منع التدهور المعرفي.","extended","B2","AWL"],
  ["longevity","noun","طول العمر","Japan is known for the longevity of its citizens.","تُعرف اليابان بطول عمر مواطنيها.","core","B2","AWL"],
  ["caloric restriction","noun","تقييد السعرات الحرارية","Caloric restriction has shown anti-aging effects in mice.","أظهر تقييد السعرات الحرارية تأثيرات مضادة للشيخوخة في الفئران.","mastery","C1","NAWL"],
  ["biogerontology","noun","علم الشيخوخة البيولوجي","Biogerontology studies the biological mechanisms of aging.","يدرس علم الشيخوخة البيولوجي الآليات البيولوجية للشيخوخة.","mastery","C1","AWL"],
  ["inflammation","noun","التهاب","Chronic inflammation accelerates many age-related diseases.","يُسرّع الالتهاب المزمن كثيراً من الأمراض المرتبطة بالعمر.","core","B2","COCA"],
  ["lifespan","noun","عمر افتراضي","The average human lifespan has increased dramatically.","ازداد متوسط العمر الافتراضي للإنسان بشكل كبير.","core","B2","CEFR-J"],
  ["senescence","noun","شيخوخة خلوية","Cellular senescence is a key driver of aging.","الشيخوخة الخلوية محرك رئيسي للشيخوخة.","mastery","C1","COCA"],
  ["geriatric","adjective","متعلق بطب الشيخوخة","Geriatric care focuses on the health of elderly patients.","يركز طب الشيخوخة على صحة المرضى المسنين.","extended","B2","COCA"],
  ["supplement","noun","مكمل غذائي","Many people take vitamin supplements daily.","يتناول كثير من الناس مكملات فيتامينات يومياً.","core","B1","CEFR-J"],
  ["neuroplasticity","noun","المرونة العصبية","Neuroplasticity allows the brain to adapt at any age.","تسمح المرونة العصبية للدماغ بالتكيف في أي عمر.","mastery","C1","NAWL"],
  ["dementia","noun","خرف","Early detection of dementia improves patient outcomes.","يحسّن الاكتشاف المبكر للخرف نتائج المرضى.","core","B2","COCA"],
  ["cardiovascular","adjective","قلبي وعائي","Cardiovascular exercise strengthens the heart.","تقوي التمارين القلبية الوعائية القلب.","core","B2","COCA"],
  ["gene therapy","noun","العلاج الجيني","Gene therapy could reverse certain aspects of aging.","قد يعكس العلاج الجيني جوانب معينة من الشيخوخة.","extended","B2","NAWL"],
  ["hormone","noun","هرمون","Growth hormone levels decline with age.","تنخفض مستويات هرمون النمو مع التقدم في العمر.","core","B1","CEFR-J"],
  ["autophagy","noun","الالتهام الذاتي","Autophagy is the body's way of recycling damaged cells.","الالتهام الذاتي هو طريقة الجسم لإعادة تدوير الخلايا التالفة.","mastery","C1","COCA"],
  ["frailty","noun","وهن؛ ضعف","Physical frailty increases the risk of falls in seniors.","يزيد الوهن الجسدي من خطر السقوط عند كبار السن.","extended","B2","COCA"],
  ["regenerative medicine","noun","الطب التجديدي","Regenerative medicine aims to restore damaged organs.","يهدف الطب التجديدي إلى استعادة الأعضاء التالفة.","extended","B2","NAWL"],
];

// ─── UNIT 11: Sustainable Architecture ───
const unit11 = [
  ["ventilation","noun","تهوية","Natural ventilation reduces energy consumption.","تقلل التهوية الطبيعية من استهلاك الطاقة.","core","B2","CEFR-J"],
  ["thermostat","noun","منظم حرارة","A smart thermostat adjusts temperature automatically.","ينظم منظم الحرارة الذكي درجة الحرارة تلقائياً.","core","B1","CEFR-J"],
  ["prefabricated","adjective","مسبق الصنع","Prefabricated homes are built faster and cheaper.","تُبنى المنازل مسبقة الصنع بشكل أسرع وأرخص.","extended","B2","NAWL"],
  ["reclaim","verb","يستعيد؛ يعيد استخدام","Architects reclaim old materials for new buildings.","يعيد المعماريون استخدام المواد القديمة في مبانٍ جديدة.","core","B2","AWL"],
  ["facade","noun","واجهة المبنى","The green facade is covered with climbing plants.","الواجهة الخضراء مغطاة بنباتات متسلقة.","extended","B2","COCA"],
  ["insulation","noun","عزل حراري","Good insulation keeps buildings warm in winter.","يحافظ العزل الجيد على دفء المباني في الشتاء.","core","B2","COCA"],
  ["photovoltaic","adjective","كهروضوئي","Photovoltaic panels convert sunlight into electricity.","تحوّل الألواح الكهروضوئية أشعة الشمس إلى كهرباء.","mastery","C1","AWL"],
  ["greywater","noun","مياه رمادية","Greywater recycling reduces household water waste.","تقلل إعادة تدوير المياه الرمادية من هدر المياه المنزلية.","extended","B2","NAWL"],
  ["carbon footprint","noun","البصمة الكربونية","Green buildings aim to minimize their carbon footprint.","تهدف المباني الخضراء إلى تقليل بصمتها الكربونية.","core","B2","CEFR-J"],
  ["passive house","noun","منزل سلبي الطاقة","A passive house requires almost no heating or cooling.","يحتاج المنزل سلبي الطاقة إلى تدفئة أو تبريد شبه معدوم.","extended","B2","NAWL"],
  ["rainwater harvesting","noun","حصاد مياه الأمطار","Rainwater harvesting reduces dependency on mains water.","يقلل حصاد مياه الأمطار من الاعتماد على مياه الشبكة.","extended","B2","NAWL"],
  ["geothermal","adjective","حراري أرضي","Geothermal energy heats the building from underground.","تسخّن الطاقة الحرارية الأرضية المبنى من تحت الأرض.","extended","B2","AWL"],
  ["green roof","noun","سقف أخضر","A green roof helps regulate building temperature.","يساعد السقف الأخضر في تنظيم حرارة المبنى.","core","B2","NAWL"],
  ["embodied energy","noun","الطاقة المجسدة","Embodied energy measures the total energy used to produce materials.","تقيس الطاقة المجسدة إجمالي الطاقة المستخدمة لإنتاج المواد.","mastery","C1","AWL"],
  ["retrofitting","noun","تحديث المباني القائمة","Retrofitting old buildings improves their energy efficiency.","يحسّن تحديث المباني القائمة كفاءتها في استخدام الطاقة.","extended","B2","NAWL"],
  ["daylighting","noun","الإضاءة الطبيعية","Daylighting design maximizes natural light indoors.","يزيد تصميم الإضاءة الطبيعية من الضوء الطبيعي في الداخل.","extended","B2","NAWL"],
  ["energy audit","noun","تدقيق الطاقة","An energy audit identifies areas of energy waste.","يحدد تدقيق الطاقة مناطق هدر الطاقة.","extended","B2","AWL"],
  ["cross-laminated timber","noun","خشب متقاطع التصفيح","Cross-laminated timber is a sustainable alternative to concrete.","الخشب متقاطع التصفيح بديل مستدام للخرسانة.","mastery","C1","NAWL"],
  ["solar gain","noun","مكسب شمسي","South-facing windows maximize solar gain in winter.","تزيد النوافذ المواجهة للجنوب من المكسب الشمسي في الشتاء.","extended","B2","NAWL"],
  ["permeable paving","noun","رصف نفّاذ","Permeable paving reduces surface water runoff.","يقلل الرصف النفاذ من جريان المياه السطحية.","mastery","C1","NAWL"],
  ["zero-emission","adjective","خالٍ من الانبعاثات","The goal is to create zero-emission buildings by 2030.","الهدف هو إنشاء مبانٍ خالية من الانبعاثات بحلول 2030.","core","B2","AWL"],
  ["building envelope","noun","غلاف المبنى","The building envelope separates the interior from the exterior.","يفصل غلاف المبنى الداخل عن الخارج.","extended","B2","NAWL"],
  ["cradle-to-cradle","adjective","من المهد إلى المهد","Cradle-to-cradle design ensures all materials are recyclable.","يضمن تصميم من المهد إلى المهد أن تكون جميع المواد قابلة لإعادة التدوير.","mastery","C1","AWL"],
  ["thermal mass","noun","كتلة حرارية","Concrete provides excellent thermal mass for storing heat.","يوفر الخرسانة كتلة حرارية ممتازة لتخزين الحرارة.","extended","B2","NAWL"],
  ["net-zero","adjective","صافي صفر","Net-zero buildings produce as much energy as they consume.","تنتج المباني ذات الصافي الصفري طاقة بقدر ما تستهلك.","core","B2","AWL"],
];

// ─── UNIT 12: Exoplanets ───
const unit12 = [
  ["astronomical","adjective","فلكي","The astronomical discovery made headlines worldwide.","تصدر الاكتشاف الفلكي عناوين الأخبار عالمياً.","core","B2","COCA"],
  ["trajectory","noun","مسار","The spacecraft followed a precise trajectory to Mars.","اتبعت المركبة الفضائية مساراً دقيقاً إلى المريخ.","extended","B2","AWL"],
  ["payload","noun","حمولة مفيدة","The rocket carried a satellite as its primary payload.","حمل الصاروخ قمراً صناعياً كحمولته الرئيسية.","extended","B2","COCA"],
  ["telemetry","noun","القياس عن بعد","Telemetry data was transmitted back to mission control.","أُرسلت بيانات القياس عن بعد إلى مركز التحكم.","mastery","C1","NAWL"],
  ["cosmonaut","noun","رائد فضاء روسي","The cosmonaut spent six months on the space station.","أمضى رائد الفضاء الروسي ستة أشهر في محطة الفضاء.","core","B2","COCA"],
  ["propulsion","noun","دفع؛ قوة دافعة","Ion propulsion is used for deep space missions.","يُستخدم الدفع الأيوني في مهام الفضاء العميق.","extended","B2","AWL"],
  ["habitable zone","noun","المنطقة الصالحة للسكن","The planet lies within the habitable zone of its star.","يقع الكوكب ضمن المنطقة الصالحة للسكن حول نجمه.","extended","B2","NAWL"],
  ["spectroscopy","noun","التحليل الطيفي","Spectroscopy reveals the chemical composition of distant stars.","يكشف التحليل الطيفي التركيب الكيميائي للنجوم البعيدة.","mastery","C1","AWL"],
  ["exoplanet","noun","كوكب خارجي","Over 5,000 exoplanets have been confirmed to date.","تم تأكيد أكثر من 5000 كوكب خارجي حتى الآن.","extended","B2","COCA"],
  ["light-year","noun","سنة ضوئية","The nearest star is about four light-years away.","أقرب نجم يبعد حوالي أربع سنوات ضوئية.","core","B1","CEFR-J"],
  ["gravitational pull","noun","جاذبية","The planet's gravitational pull affects nearby moons.","تؤثر جاذبية الكوكب على الأقمار القريبة.","core","B2","CEFR-J"],
  ["nebula","noun","سديم","A nebula is a cloud of gas and dust in space.","السديم هو سحابة من الغاز والغبار في الفضاء.","extended","B2","COCA"],
  ["orbital period","noun","الفترة المدارية","The orbital period of Mercury is about 88 days.","الفترة المدارية لعطارد حوالي 88 يوماً.","extended","B2","NAWL"],
  ["red dwarf","noun","قزم أحمر","Most exoplanets orbit red dwarf stars.","تدور معظم الكواكب الخارجية حول نجوم القزم الأحمر.","extended","B2","COCA"],
  ["transit method","noun","طريقة العبور","The transit method detects planets by measuring starlight dips.","تكتشف طريقة العبور الكواكب بقياس انخفاض ضوء النجم.","mastery","C1","NAWL"],
  ["atmosphere","noun","غلاف جوي","Scientists detected water vapor in the planet's atmosphere.","اكتشف العلماء بخار الماء في الغلاف الجوي للكوكب.","core","B1","CEFR-J"],
  ["supernova","noun","مستعر أعظم","A supernova releases an enormous amount of energy.","يطلق المستعر الأعظم كمية هائلة من الطاقة.","extended","B2","COCA"],
  ["radio telescope","noun","تلسكوب راديوي","The radio telescope picked up signals from deep space.","التقط التلسكوب الراديوي إشارات من أعماق الفضاء.","core","B2","NAWL"],
  ["stellar","adjective","نجمي","Stellar evolution describes the life cycle of a star.","يصف التطور النجمي دورة حياة النجم.","extended","B2","COCA"],
  ["cosmic radiation","noun","إشعاع كوني","Cosmic radiation poses a risk to astronauts.","يشكل الإشعاع الكوني خطراً على رواد الفضاء.","extended","B2","COCA"],
  ["asteroid","noun","كويكب","An asteroid impact may have caused the extinction of dinosaurs.","قد يكون اصطدام كويكب سبب انقراض الديناصورات.","core","B1","CEFR-J"],
  ["binary star","noun","نجم ثنائي","A binary star system consists of two orbiting stars.","يتكون نظام النجم الثنائي من نجمين يدوران حول بعضهما.","mastery","C1","COCA"],
  ["spectrometer","noun","مطياف","The spectrometer analyzed the planet's atmospheric gases.","حلل المطياف غازات الغلاف الجوي للكوكب.","mastery","C1","NAWL"],
  ["solar wind","noun","رياح شمسية","Solar wind strips away unprotected planetary atmospheres.","تزيل الرياح الشمسية الأغلفة الجوية غير المحمية للكواكب.","core","B2","COCA"],
  ["space probe","noun","مسبار فضائي","The space probe sent back detailed images of Jupiter.","أرسل المسبار الفضائي صوراً مفصلة لكوكب المشتري.","core","B2","CEFR-J"],
];

async function main() {
  const client = await pool.connect();
  const BATCH_ID = 17;

  const units = [
    { num: 1, data: unit1, name: 'Bioethics' },
    { num: 2, data: unit2, name: 'Deep Ocean' },
    { num: 3, data: unit3, name: 'Food Security' },
    { num: 4, data: unit4, name: 'Biomimicry' },
    { num: 5, data: unit5, name: 'Migration' },
    { num: 6, data: unit6, name: 'Cryptocurrency' },
    { num: 7, data: unit7, name: 'Crowd Psychology' },
    { num: 8, data: unit8, name: 'Forensic Science' },
    { num: 9, data: unit9, name: 'Archaeology' },
    { num: 10, data: unit10, name: 'Longevity' },
    { num: 11, data: unit11, name: 'Sustainable Architecture' },
    { num: 12, data: unit12, name: 'Exoplanets' },
  ];

  let totalInserted = 0;
  for (const u of units) {
    const count = await insertBatch(client, u.data, u.num, BATCH_ID);
    console.log(`Unit ${u.num} (${u.name}): ${count} words inserted (${u.data.length} total)`);
    totalInserted += count;
  }

  console.log(`\n=== Total inserted: ${totalInserted} ===\n`);

  // Per-unit counts
  const res1 = await client.query(`SELECT recommended_unit, COUNT(*) AS cnt FROM public.vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit`);
  console.log('Per-unit counts in vocab_staging_l4:');
  for (const row of res1.rows) {
    console.log(`  Unit ${row.recommended_unit}: ${row.cnt}`);
  }

  // Total count
  const res2 = await client.query(`SELECT COUNT(*) AS total FROM public.vocab_staging_l4`);
  console.log(`\nTotal rows in vocab_staging_l4: ${res2.rows[0].total}`);

  client.release();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
