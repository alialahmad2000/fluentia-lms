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

// ── Unit 1: Bioethics & Genetic Engineering ──
const unit1 = [
  ["bioethics","noun","أخلاقيات علم الأحياء","Bioethics addresses moral dilemmas in medicine.","تتناول أخلاقيات علم الأحياء المعضلات الأخلاقية في الطب.","core","B2","COCA"],
  ["genome","noun","الجينوم؛ المجموعة الكاملة للجينات","Scientists mapped the entire human genome.","رسم العلماء خريطة الجينوم البشري بالكامل.","core","B2","COCA"],
  ["embryo","noun","جنين في مراحله الأولى","The embryo develops rapidly in the first weeks.","يتطور الجنين بسرعة في الأسابيع الأولى.","core","B2","COCA"],
  ["cloning","noun","الاستنساخ","Cloning raises serious ethical questions.","يثير الاستنساخ أسئلة أخلاقية خطيرة.","core","B2","COCA"],
  ["mutation","noun","طفرة جينية","A single mutation can alter protein function.","يمكن لطفرة واحدة أن تغير وظيفة البروتين.","core","B2","CEFR-J"],
  ["hereditary","adjective","وراثي","The disease is hereditary and passed through families.","المرض وراثي وينتقل عبر العائلات.","core","B2","COCA"],
  ["transgenic","adjective","معدّل وراثيًا","Transgenic crops resist certain pests.","تقاوم المحاصيل المعدلة وراثيًا آفات معينة.","extended","C1","COCA"],
  ["stem cell","noun","خلية جذعية","Stem cell therapy offers hope for paralysis patients.","يوفر العلاج بالخلايا الجذعية أملًا لمرضى الشلل.","core","B2","COCA"],
  ["gene therapy","noun","العلاج الجيني","Gene therapy corrects defective genes in patients.","يصحح العلاج الجيني الجينات المعيبة لدى المرضى.","extended","B2","COCA"],
  ["eugenics","noun","تحسين النسل","Eugenics was widely discredited after World War II.","فُقدت مصداقية تحسين النسل بعد الحرب العالمية الثانية.","mastery","C1","COCA"],
  ["congenital","adjective","خلقي؛ منذ الولادة","The baby was born with a congenital heart defect.","وُلد الطفل بعيب خلقي في القلب.","extended","B2","COCA"],
  ["allele","noun","أليل؛ صيغة بديلة للجين","Each parent contributes one allele for each trait.","يساهم كل والد بأليل واحد لكل صفة.","mastery","C1","AWL"],
  ["phenotype","noun","النمط الظاهري","The phenotype is the observable expression of genes.","النمط الظاهري هو التعبير المرئي للجينات.","extended","C1","AWL"],
  ["chromosomal","adjective","كروموسومي","Chromosomal abnormalities can cause genetic disorders.","يمكن أن تسبب الشذوذات الكروموسومية اضطرابات وراثية.","extended","B2","COCA"],
  ["biosafety","noun","السلامة الحيوية","Biosafety protocols protect lab workers from pathogens.","تحمي بروتوكولات السلامة الحيوية العاملين في المختبرات من مسببات الأمراض.","extended","B2","COCA"],
  ["fertilization","noun","إخصاب؛ تلقيح","In vitro fertilization helps couples conceive.","يساعد الإخصاب خارج الرحم الأزواج على الإنجاب.","core","B2","CEFR-J"],
  ["genetic screening","noun","الفحص الجيني","Genetic screening detects inherited diseases early.","يكشف الفحص الجيني الأمراض الوراثية مبكرًا.","core","B2","COCA"],
  ["informed consent","noun","الموافقة المستنيرة","Informed consent is required before any clinical trial.","الموافقة المستنيرة مطلوبة قبل أي تجربة سريرية.","core","B1","AWL"],
  ["surrogate","noun","بديل؛ أم بديلة","She agreed to be a surrogate mother for the couple.","وافقت على أن تكون أمًا بديلة للزوجين.","extended","B2","COCA"],
  ["pathogen","noun","عامل ممرض","The pathogen spreads through contaminated water.","ينتشر العامل الممرض عبر المياه الملوثة.","core","B2","COCA"],
  ["recombinant","adjective","معاد التركيب الجيني","Recombinant DNA technology revolutionized medicine.","أحدثت تقنية الحمض النووي معاد التركيب ثورة في الطب.","mastery","C1","AWL"],
  ["gestation","noun","فترة الحمل","The gestation period for humans is about nine months.","فترة الحمل عند البشر حوالي تسعة أشهر.","extended","B2","COCA"],
  ["moratorium","noun","تعليق مؤقت؛ وقف اختياري","The government imposed a moratorium on cloning research.","فرضت الحكومة وقفًا مؤقتًا على أبحاث الاستنساخ.","mastery","C1","AWL"],
  ["donor","noun","متبرع","The organ donor saved three lives.","أنقذ المتبرع بالأعضاء ثلاثة أرواح.","core","B1","CEFR-J"],
  ["splice","verb","يوصل؛ يربط (جينيًا)","Scientists splice genes to create new traits.","يربط العلماء الجينات لإنشاء صفات جديدة.","extended","B2","COCA"],
];

// ── Unit 2: Deep Ocean Exploration ──
const unit2 = [
  ["submersible","noun","غواصة بحثية","The submersible descended to the ocean floor.","غاصت الغواصة البحثية إلى قاع المحيط.","core","B2","COCA"],
  ["hydrothermal","adjective","حراري مائي","Hydrothermal vents support unique ecosystems.","تدعم الفتحات الحرارية المائية أنظمة بيئية فريدة.","extended","C1","COCA"],
  ["bioluminescence","noun","إضاءة حيوية","Many deep-sea creatures use bioluminescence to attract prey.","تستخدم كثير من الكائنات البحرية العميقة الإضاءة الحيوية لجذب الفرائس.","extended","B2","COCA"],
  ["abyss","noun","هاوية؛ أعماق سحيقة","The ocean abyss remains largely unexplored.","لا تزال أعماق المحيط السحيقة غير مستكشفة إلى حد كبير.","core","B2","COCA"],
  ["sonar","noun","سونار؛ جهاز الكشف بالصوت","Ships use sonar to map the seafloor.","تستخدم السفن السونار لرسم خريطة قاع البحر.","core","B1","CEFR-J"],
  ["coral reef","noun","شعاب مرجانية","Coral reefs are home to thousands of marine species.","تعد الشعاب المرجانية موطنًا لآلاف الأنواع البحرية.","core","B1","CEFR-J"],
  ["trench","noun","خندق محيطي","The Mariana Trench is the deepest point on Earth.","خندق ماريانا هو أعمق نقطة على الأرض.","core","B2","COCA"],
  ["plankton","noun","عوالق بحرية","Plankton form the base of the ocean food chain.","تشكل العوالق البحرية قاعدة السلسلة الغذائية في المحيط.","core","B2","COCA"],
  ["salinity","noun","ملوحة","Ocean salinity varies depending on location and depth.","تختلف ملوحة المحيط حسب الموقع والعمق.","extended","B2","AWL"],
  ["tidal","adjective","مدّي؛ متعلق بالمد والجزر","Tidal currents shape coastal landscapes over time.","تشكّل التيارات المدية المناظر الساحلية بمرور الوقت.","core","B2","COCA"],
  ["marine biologist","noun","عالم أحياء بحرية","The marine biologist studied whale migration patterns.","درس عالم الأحياء البحرية أنماط هجرة الحيتان.","core","B1","CEFR-J"],
  ["bathymetry","noun","قياس أعماق البحار","Bathymetry data helps create detailed ocean floor maps.","تساعد بيانات قياس الأعماق في إنشاء خرائط مفصلة لقاع المحيط.","mastery","C1","COCA"],
  ["sedimentation","noun","ترسيب","Sedimentation slowly builds layers on the ocean floor.","يبني الترسيب طبقات ببطء على قاع المحيط.","extended","B2","AWL"],
  ["aquatic","adjective","مائي","Aquatic organisms have adapted to life underwater.","تكيفت الكائنات المائية مع الحياة تحت الماء.","core","B2","CEFR-J"],
  ["oceanic crust","noun","القشرة المحيطية","The oceanic crust is thinner than continental crust.","القشرة المحيطية أرق من القشرة القارية.","extended","B2","COCA"],
  ["remotely operated","adjective","يُشغَّل عن بُعد","Remotely operated vehicles explore dangerous depths.","تستكشف المركبات المشغلة عن بعد الأعماق الخطرة.","core","B2","COCA"],
  ["phosphorescent","adjective","فسفوري؛ متوهج","Phosphorescent organisms glow in the dark ocean.","تتوهج الكائنات الفسفورية في المحيط المظلم.","mastery","C1","COCA"],
  ["seamount","noun","جبل بحري","A seamount is an underwater mountain rising from the seafloor.","الجبل البحري هو جبل تحت الماء يرتفع من قاع البحر.","extended","B2","COCA"],
  ["upwelling","noun","تيار صاعد","Upwelling brings nutrients from deep water to the surface.","يجلب التيار الصاعد المغذيات من المياء العميقة إلى السطح.","extended","C1","COCA"],
  ["deep-sea vent","noun","فتحة بحرية عميقة","Deep-sea vents release superheated water and minerals.","تطلق الفتحات البحرية العميقة مياهًا شديدة الحرارة ومعادن.","core","B2","COCA"],
  ["maritime","adjective","بحري","Maritime law governs activities on the open sea.","ينظم القانون البحري الأنشطة في عرض البحر.","core","B2","CEFR-J"],
  ["invertebrate","noun","لافقاري","Most deep-sea creatures are invertebrates.","معظم كائنات أعماق البحار هي لافقاريات.","core","B2","COCA"],
  ["continental shelf","noun","الجرف القاري","The continental shelf extends from the coast underwater.","يمتد الجرف القاري من الساحل تحت الماء.","extended","B2","COCA"],
  ["oceanography","noun","علم المحيطات","Oceanography combines biology, chemistry, and geology.","يجمع علم المحيطات بين الأحياء والكيمياء والجيولوجيا.","core","B2","AWL"],
  ["thermohaline","adjective","ملحي حراري","Thermohaline circulation drives global ocean currents.","تحرك الدورة الملحية الحرارية التيارات المحيطية العالمية.","mastery","C1","COCA"],
];

// ── Unit 3: Food Security & Agriculture ──
const unit3 = [
  ["famine","noun","مجاعة","The famine affected millions of people across the region.","أثرت المجاعة على ملايين الأشخاص في المنطقة.","core","B2","CEFR-J"],
  ["irrigation","noun","ري","Modern irrigation systems save water in dry climates.","توفر أنظمة الري الحديثة المياه في المناخات الجافة.","core","B2","COCA"],
  ["pesticide","noun","مبيد آفات","Overuse of pesticides harms pollinating insects.","يضر الإفراط في استخدام المبيدات بالحشرات الملقحة.","core","B2","COCA"],
  ["crop rotation","noun","تناوب المحاصيل","Crop rotation maintains soil fertility naturally.","يحافظ تناوب المحاصيل على خصوبة التربة بشكل طبيعي.","core","B2","COCA"],
  ["arable","adjective","صالح للزراعة","Only a small fraction of the land is arable.","جزء صغير فقط من الأرض صالح للزراعة.","extended","B2","AWL"],
  ["subsistence farming","noun","زراعة الكفاف","Subsistence farming produces just enough food for the family.","تنتج زراعة الكفاف ما يكفي من الغذاء للعائلة فقط.","core","B2","COCA"],
  ["drought-resistant","adjective","مقاوم للجفاف","Scientists developed drought-resistant rice varieties.","طور العلماء أصناف أرز مقاومة للجفاف.","extended","B2","COCA"],
  ["agrochemical","noun","مادة كيميائية زراعية","Agrochemicals boost yields but may pollute waterways.","تزيد المواد الكيميائية الزراعية الإنتاج لكنها قد تلوث المجاري المائية.","extended","C1","COCA"],
  ["monoculture","noun","زراعة أحادية المحصول","Monoculture depletes soil nutrients over time.","تستنزف الزراعة الأحادية مغذيات التربة بمرور الوقت.","extended","B2","COCA"],
  ["agroforestry","noun","الحراجة الزراعية","Agroforestry combines trees with crop cultivation.","تجمع الحراجة الزراعية بين الأشجار وزراعة المحاصيل.","mastery","C1","COCA"],
  ["grain silo","noun","صومعة حبوب","The grain silo stores wheat after harvest.","تخزن صومعة الحبوب القمح بعد الحصاد.","core","B1","CEFR-J"],
  ["herbicide","noun","مبيد أعشاب","Herbicides control weeds without manual labor.","تكافح مبيدات الأعشاب الحشائش دون عمل يدوي.","core","B2","COCA"],
  ["topsoil","noun","التربة السطحية","Erosion removes valuable topsoil from farmland.","يزيل التعرية التربة السطحية القيمة من الأراضي الزراعية.","core","B2","COCA"],
  ["food sovereignty","noun","السيادة الغذائية","Food sovereignty gives communities control over their food systems.","تمنح السيادة الغذائية المجتمعات السيطرة على أنظمتها الغذائية.","extended","C1","AWL"],
  ["hydroponics","noun","الزراعة المائية","Hydroponics grows plants without soil using nutrient water.","تزرع الزراعة المائية النباتات بدون تربة باستخدام مياه مغذية.","extended","B2","COCA"],
  ["compost","noun","سماد عضوي","Adding compost enriches the soil with nutrients.","تضيف إضافة السماد العضوي مغذيات للتربة.","core","B1","CEFR-J"],
  ["tillage","noun","حراثة","Reduced tillage helps preserve soil structure.","تساعد الحراثة المخففة في الحفاظ على بنية التربة.","extended","B2","COCA"],
  ["pollinator","noun","ملقّح","Bees are the most important pollinators for agriculture.","النحل هو أهم الملقحات للزراعة.","core","B2","COCA"],
  ["agronomy","noun","علم الزراعة","Agronomy focuses on sustainable crop production.","يركز علم الزراعة على إنتاج المحاصيل المستدام.","extended","C1","AWL"],
  ["desertification","noun","تصحر","Desertification threatens farmland in arid regions.","يهدد التصحر الأراضي الزراعية في المناطق الجافة.","core","B2","COCA"],
  ["granary","noun","مخزن حبوب","The granary was filled after a successful harvest.","امتلأ مخزن الحبوب بعد حصاد ناجح.","extended","B2","COCA"],
  ["yield","noun","محصول؛ إنتاجية","The crop yield doubled with better fertilizers.","تضاعفت إنتاجية المحصول مع أسمدة أفضل.","core","B1","CEFR-J"],
  ["legume","noun","بقولية","Legumes fix nitrogen naturally in the soil.","تثبت البقوليات النيتروجين طبيعيًا في التربة.","core","B2","COCA"],
  ["food chain","noun","سلسلة غذائية","Pesticides can disrupt the entire food chain.","يمكن للمبيدات أن تعطل السلسلة الغذائية بأكملها.","core","B1","CEFR-J"],
  ["malnutrition","noun","سوء تغذية","Malnutrition affects cognitive development in children.","يؤثر سوء التغذية على النمو المعرفي عند الأطفال.","core","B2","COCA"],
];

// ── Unit 4: Biomimicry & Nature-Inspired Design ──
const unit4 = [
  ["biomimicry","noun","محاكاة الطبيعة","Biomimicry draws design inspiration from natural organisms.","تستمد محاكاة الطبيعة إلهام التصميم من الكائنات الحية.","core","B2","COCA"],
  ["aerodynamic","adjective","انسيابي؛ ديناميكي هوائي","The car's aerodynamic shape reduces wind resistance.","يقلل الشكل الانسيابي للسيارة من مقاومة الرياح.","core","B2","COCA"],
  ["exoskeleton","noun","هيكل خارجي","Engineers built a robotic exoskeleton inspired by insects.","بنى المهندسون هيكلًا خارجيًا روبوتيًا مستوحى من الحشرات.","extended","B2","COCA"],
  ["adhesion","noun","التصاق","Gecko-inspired adhesion works without any glue.","يعمل الالتصاق المستوحى من الوزغة بدون أي غراء.","extended","B2","AWL"],
  ["photosynthesis","noun","عملية التمثيل الضوئي","Scientists mimic photosynthesis to create clean energy.","يحاكي العلماء عملية التمثيل الضوئي لإنتاج طاقة نظيفة.","core","B2","COCA"],
  ["metamorphosis","noun","تحوّل كامل","The butterfly undergoes complete metamorphosis.","تخضع الفراشة لتحول كامل.","core","B2","COCA"],
  ["structural coloring","noun","تلوين بنيوي","Structural coloring produces color without pigments.","ينتج التلوين البنيوي ألوانًا بدون أصباغ.","mastery","C1","COCA"],
  ["camouflage","noun","تمويه","Military camouflage was inspired by animal patterns.","استُلهم التمويه العسكري من أنماط الحيوانات.","core","B1","CEFR-J"],
  ["hydrophobic","adjective","طارد للماء","Lotus leaves have a hydrophobic surface that repels water.","تمتلك أوراق اللوتس سطحًا طاردًا للماء.","extended","C1","COCA"],
  ["propulsion","noun","دفع؛ قوة دافعة","Jellyfish-inspired propulsion is highly energy efficient.","الدفع المستوحى من قنديل البحر عالي الكفاءة في الطاقة.","extended","B2","COCA"],
  ["echolocation","noun","تحديد الموقع بالصدى","Bats use echolocation to navigate in darkness.","تستخدم الخفافيش تحديد الموقع بالصدى للتنقل في الظلام.","core","B2","COCA"],
  ["resilience","noun","مرونة؛ قدرة على التعافي","Spider silk shows remarkable resilience and strength.","يُظهر حرير العنكبوت مرونة وقوة ملحوظتين.","core","B2","AWL"],
  ["biodegradable","adjective","قابل للتحلل الحيوي","Biodegradable packaging decomposes naturally.","تتحلل العبوات القابلة للتحلل الحيوي بشكل طبيعي.","core","B2","COCA"],
  ["symbiosis","noun","تعايش؛ تكافل","Coral and algae live in a mutualistic symbiosis.","يعيش المرجان والطحالب في تكافل متبادل المنفعة.","extended","B2","COCA"],
  ["self-healing","adjective","ذاتي الإصلاح","Self-healing materials repair cracks automatically.","تصلح المواد ذاتية الإصلاح الشقوق تلقائيًا.","extended","B2","COCA"],
  ["pollination","noun","تلقيح","Engineers designed drones that mimic bee pollination.","صمم المهندسون طائرات بدون طيار تحاكي تلقيح النحل.","core","B2","COCA"],
  ["tensile strength","noun","قوة الشد","Spider silk has extraordinary tensile strength.","يتمتع حرير العنكبوت بقوة شد استثنائية.","extended","B2","COCA"],
  ["bioplastic","noun","بلاستيك حيوي","Bioplastics are made from renewable plant materials.","تُصنع البلاستيكات الحيوية من مواد نباتية متجددة.","extended","B2","COCA"],
  ["thermoregulation","noun","تنظيم حراري","Termite mounds achieve thermoregulation without electricity.","تحقق تلال النمل الأبيض التنظيم الحراري بدون كهرباء.","mastery","C1","COCA"],
  ["adaptation","noun","تكيف","Animal adaptations inspire innovative engineering solutions.","تلهم تكيفات الحيوانات حلولًا هندسية مبتكرة.","core","B1","CEFR-J"],
  ["swarm intelligence","noun","ذكاء السرب","Swarm intelligence algorithms optimize delivery routes.","تحسّن خوارزميات ذكاء السرب مسارات التوصيل.","mastery","C1","COCA"],
  ["drag reduction","noun","تقليل المقاومة","Shark skin patterns enable drag reduction in swimming.","تتيح أنماط جلد القرش تقليل المقاومة في السباحة.","extended","B2","COCA"],
  ["fibrous","adjective","ليفي","The fibrous structure of bone inspired new composites.","ألهمت البنية الليفية للعظام مركبات جديدة.","core","B2","COCA"],
  ["nutrient cycling","noun","دورة المغذيات","Forests maintain efficient nutrient cycling systems.","تحافظ الغابات على أنظمة دورة مغذيات فعالة.","extended","B2","COCA"],
  ["locomotion","noun","حركة؛ تنقل","Snake locomotion inspired a new type of rescue robot.","ألهمت حركة الأفاعي نوعًا جديدًا من روبوتات الإنقاذ.","extended","B2","COCA"],
];

// ── Unit 5: Human Migration & Diaspora ──
const unit5 = [
  ["diaspora","noun","شتات؛ جاليات مهاجرة","The Armenian diaspora spread across many countries.","انتشر الشتات الأرمني عبر بلدان عديدة.","core","B2","COCA"],
  ["asylum seeker","noun","طالب لجوء","The asylum seeker fled political persecution.","فرّ طالب اللجوء من الاضطهاد السياسي.","core","B2","COCA"],
  ["refugee camp","noun","مخيم لاجئين","Thousands live in the refugee camp near the border.","يعيش آلاف في مخيم اللاجئين قرب الحدود.","core","B1","CEFR-J"],
  ["remittance","noun","حوالة مالية","Remittances from abroad support many local economies.","تدعم الحوالات المالية من الخارج اقتصادات محلية كثيرة.","extended","B2","AWL"],
  ["displacement","noun","نزوح؛ تهجير","War caused the displacement of millions of families.","تسببت الحرب في نزوح ملايين العائلات.","core","B2","AWL"],
  ["expatriate","noun","مغترب","Many expatriates maintain strong ties to their homeland.","يحافظ كثير من المغتربين على روابط قوية بوطنهم.","core","B2","COCA"],
  ["assimilation","noun","اندماج ثقافي","Cultural assimilation can take several generations.","قد يستغرق الاندماج الثقافي عدة أجيال.","extended","B2","AWL"],
  ["deportation","noun","ترحيل","The court ordered his deportation to his home country.","أمرت المحكمة بترحيله إلى بلده الأصلي.","core","B2","COCA"],
  ["resettlement","noun","إعادة توطين","The resettlement program helped refugees start new lives.","ساعد برنامج إعادة التوطين اللاجئين على بدء حياة جديدة.","extended","B2","AWL"],
  ["stateless","adjective","عديم الجنسية","Stateless people have no recognized citizenship anywhere.","لا يملك عديمو الجنسية مواطنة معترفًا بها في أي مكان.","extended","C1","COCA"],
  ["immigration quota","noun","حصة الهجرة","The country set strict immigration quotas this year.","وضعت الدولة حصص هجرة صارمة هذا العام.","core","B2","COCA"],
  ["xenophobia","noun","كراهية الأجانب","Xenophobia often rises during economic downturns.","تزداد كراهية الأجانب غالبًا أثناء التراجع الاقتصادي.","extended","C1","COCA"],
  ["naturalization","noun","تجنيس","The naturalization process varies from country to country.","تختلف عملية التجنيس من بلد إلى آخر.","extended","B2","AWL"],
  ["trafficking","noun","اتّجار بالبشر","Human trafficking is a serious global crime.","الاتجار بالبشر جريمة عالمية خطيرة.","core","B2","COCA"],
  ["acculturation","noun","تثاقف؛ تبادل ثقافي","Acculturation happens when two cultures interact closely.","يحدث التثاقف عندما تتفاعل ثقافتان بشكل وثيق.","mastery","C1","AWL"],
  ["visa regime","noun","نظام التأشيرات","The visa regime determines who can enter the country.","يحدد نظام التأشيرات من يمكنه دخول البلد.","core","B2","COCA"],
  ["brain drain","noun","هجرة العقول","Brain drain depletes developing nations of skilled workers.","تستنزف هجرة العقول الدول النامية من العمال المهرة.","core","B2","COCA"],
  ["internally displaced","adjective","نازح داخليًا","Internally displaced persons remain within their country.","يبقى النازحون داخليًا داخل حدود بلدهم.","extended","B2","COCA"],
  ["border patrol","noun","دورية حدود","Border patrol agents monitor illegal crossings.","يراقب عناصر دورية الحدود العبور غير القانوني.","core","B1","CEFR-J"],
  ["migratory route","noun","مسار هجرة","Ancient migratory routes connected Africa to Europe.","ربطت مسارات الهجرة القديمة أفريقيا بأوروبا.","core","B2","COCA"],
  ["repatriation","noun","إعادة إلى الوطن","Repatriation of refugees began after the ceasefire.","بدأت إعادة اللاجئين إلى وطنهم بعد وقف إطلاق النار.","extended","C1","AWL"],
  ["sanctuary city","noun","مدينة ملاذ","Sanctuary cities limit cooperation with immigration enforcement.","تحدّ مدن الملاذ من التعاون مع تطبيق قوانين الهجرة.","extended","B2","COCA"],
  ["cultural heritage","noun","تراث ثقافي","Diaspora communities preserve their cultural heritage abroad.","تحافظ مجتمعات الشتات على تراثها الثقافي في الخارج.","core","B1","CEFR-J"],
  ["emigrate","verb","يهاجر (من بلد)","Thousands emigrated from Europe to the Americas.","هاجر آلاف من أوروبا إلى الأمريكتين.","core","B2","COCA"],
  ["humanitarian corridor","noun","ممر إنساني","A humanitarian corridor allowed civilians to flee safely.","سمح الممر الإنساني للمدنيين بالفرار بأمان.","extended","B2","COCA"],
];

// ── Unit 6: Cryptocurrency & Digital Finance ──
const unit6 = [
  ["cryptocurrency","noun","عملة مشفرة","Cryptocurrency transactions are recorded on a blockchain.","تُسجل معاملات العملات المشفرة على سلسلة الكتل.","core","B2","COCA"],
  ["blockchain","noun","سلسلة الكتل","Blockchain technology ensures transparent record-keeping.","تضمن تقنية سلسلة الكتل حفظ سجلات شفافة.","core","B2","COCA"],
  ["decentralized","adjective","لامركزي","A decentralized system has no single point of control.","النظام اللامركزي ليس له نقطة تحكم واحدة.","core","B2","COCA"],
  ["digital wallet","noun","محفظة رقمية","Store your tokens safely in a digital wallet.","خزّن رموزك بأمان في محفظة رقمية.","core","B1","CEFR-J"],
  ["mining","noun","تعدين (عملات مشفرة)","Bitcoin mining requires enormous amounts of electricity.","يتطلب تعدين البيتكوين كميات هائلة من الكهرباء.","core","B2","COCA"],
  ["ledger","noun","سجل حسابات","A distributed ledger records every transaction permanently.","يسجل السجل الموزع كل معاملة بشكل دائم.","core","B2","COCA"],
  ["volatility","noun","تقلب الأسعار","Cryptocurrency volatility makes investment risky.","يجعل تقلب أسعار العملات المشفرة الاستثمار محفوفًا بالمخاطر.","core","B2","AWL"],
  ["smart contract","noun","عقد ذكي","Smart contracts execute automatically when conditions are met.","تنفذ العقود الذكية تلقائيًا عند استيفاء الشروط.","extended","B2","COCA"],
  ["token","noun","رمز رقمي","Each token represents a share in the project.","يمثل كل رمز رقمي حصة في المشروع.","core","B2","COCA"],
  ["stablecoin","noun","عملة مستقرة","Stablecoins are pegged to the value of real currencies.","ترتبط العملات المستقرة بقيمة العملات الحقيقية.","extended","B2","COCA"],
  ["peer-to-peer","adjective","نظير إلى نظير","Peer-to-peer networks eliminate the need for banks.","تلغي شبكات نظير إلى نظير الحاجة إلى البنوك.","core","B2","COCA"],
  ["encryption","noun","تشفير","Strong encryption protects digital financial transactions.","يحمي التشفير القوي المعاملات المالية الرقمية.","core","B2","COCA"],
  ["hash function","noun","دالة تجزئة","A hash function converts data into a fixed-length code.","تحول دالة التجزئة البيانات إلى رمز بطول ثابت.","extended","C1","COCA"],
  ["fintech","noun","تكنولوجيا مالية","Fintech startups are disrupting traditional banking.","تعطل شركات التكنولوجيا المالية الناشئة الخدمات المصرفية التقليدية.","core","B2","COCA"],
  ["liquidity","noun","سيولة","High liquidity means assets can be sold quickly.","تعني السيولة العالية أن الأصول يمكن بيعها بسرعة.","extended","B2","AWL"],
  ["consensus mechanism","noun","آلية إجماع","The consensus mechanism validates new blockchain entries.","تتحقق آلية الإجماع من صحة إدخالات سلسلة الكتل الجديدة.","mastery","C1","COCA"],
  ["initial coin offering","noun","طرح أولي للعملة","The startup raised funds through an initial coin offering.","جمعت الشركة الناشئة الأموال من خلال طرح أولي للعملة.","extended","C1","COCA"],
  ["yield farming","noun","زراعة العائد","Yield farming lets users earn interest on crypto deposits.","تتيح زراعة العائد للمستخدمين كسب فائدة على ودائع العملات المشفرة.","mastery","C1","COCA"],
  ["fiat currency","noun","عملة ورقية إلزامية","Most countries use fiat currency issued by central banks.","تستخدم معظم الدول عملة ورقية تصدرها البنوك المركزية.","core","B2","COCA"],
  ["private key","noun","مفتاح خاص","Never share your private key with anyone.","لا تشارك مفتاحك الخاص مع أي شخص.","core","B2","COCA"],
  ["decentralized finance","noun","تمويل لامركزي","Decentralized finance removes middlemen from banking.","يزيل التمويل اللامركزي الوسطاء من الخدمات المصرفية.","extended","B2","COCA"],
  ["crypto exchange","noun","بورصة عملات مشفرة","The crypto exchange processes millions of trades daily.","تعالج بورصة العملات المشفرة ملايين الصفقات يوميًا.","core","B2","COCA"],
  ["gas fee","noun","رسوم الغاز (رسوم المعاملة)","High gas fees discourage small transactions on the network.","تثبط رسوم الغاز المرتفعة المعاملات الصغيرة على الشبكة.","extended","B2","COCA"],
  ["whale","noun","حوت (مستثمر كبير)","A crypto whale sold millions of dollars in Bitcoin.","باع حوت عملات مشفرة ملايين الدولارات من البيتكوين.","extended","B2","COCA"],
  ["proof of stake","noun","إثبات الحصة","Proof of stake uses less energy than proof of work.","يستخدم إثبات الحصة طاقة أقل من إثبات العمل.","extended","C1","COCA"],
];

// ── Unit 7: Crowd Psychology & Social Influence ──
const unit7 = [
  ["groupthink","noun","التفكير الجماعي","Groupthink led the team to ignore obvious risks.","أدى التفكير الجماعي بالفريق إلى تجاهل مخاطر واضحة.","core","B2","COCA"],
  ["conformity","noun","مسايرة؛ امتثال","Social conformity pressures people to follow the majority.","تضغط المسايرة الاجتماعية على الناس لاتباع الأغلبية.","core","B2","AWL"],
  ["mob mentality","noun","عقلية القطيع","Mob mentality caused the peaceful protest to turn violent.","أدت عقلية القطيع إلى تحول الاحتجاج السلمي إلى عنيف.","core","B2","COCA"],
  ["propaganda","noun","دعاية؛ بروباغندا","Propaganda distorts facts to manipulate public opinion.","تشوّه الدعاية الحقائق للتلاعب بالرأي العام.","core","B2","COCA"],
  ["bystander effect","noun","تأثير المتفرج","The bystander effect explains why crowds often fail to help.","يفسر تأثير المتفرج لماذا يفشل الحشد غالبًا في تقديم المساعدة.","extended","B2","COCA"],
  ["cognitive bias","noun","تحيز معرفي","Cognitive biases affect our everyday decision-making.","تؤثر التحيزات المعرفية على اتخاذنا للقرارات اليومية.","core","B2","COCA"],
  ["deindividuation","noun","فقدان الهوية الفردية","Deindividuation in crowds reduces personal accountability.","يقلل فقدان الهوية الفردية في الحشود من المسؤولية الشخصية.","mastery","C1","COCA"],
  ["persuasion","noun","إقناع","Effective persuasion combines logic and emotional appeal.","يجمع الإقناع الفعال بين المنطق والجاذبية العاطفية.","core","B2","CEFR-J"],
  ["herd behavior","noun","سلوك القطيع","Herd behavior drives panic buying during crises.","يحرك سلوك القطيع الشراء بدافع الذعر أثناء الأزمات.","extended","B2","COCA"],
  ["social proof","noun","الدليل الاجتماعي","Online reviews serve as social proof for consumers.","تعمل المراجعات عبر الإنترنت كدليل اجتماعي للمستهلكين.","core","B2","COCA"],
  ["obedience","noun","طاعة؛ امتثال","Milgram's experiment demonstrated shocking levels of obedience.","أظهرت تجربة ميلغرام مستويات صادمة من الطاعة.","core","B2","CEFR-J"],
  ["scapegoating","noun","كبش فداء؛ إلقاء اللوم","Scapegoating minorities is a common tactic of demagogues.","إلقاء اللوم على الأقليات تكتيك شائع للديماغوجيين.","extended","C1","COCA"],
  ["charismatic leader","noun","قائد كاريزمي","A charismatic leader can sway millions of followers.","يمكن للقائد الكاريزمي التأثير على ملايين الأتباع.","core","B2","COCA"],
  ["echo chamber","noun","غرفة صدى","Social media creates echo chambers that reinforce beliefs.","تخلق وسائل التواصل الاجتماعي غرف صدى تعزز المعتقدات.","core","B2","COCA"],
  ["disinformation","noun","تضليل إعلامي","Disinformation campaigns undermine trust in institutions.","تقوض حملات التضليل الإعلامي الثقة في المؤسسات.","core","B2","COCA"],
  ["peer pressure","noun","ضغط الأقران","Teenagers are especially vulnerable to peer pressure.","المراهقون معرضون بشكل خاص لضغط الأقران.","core","B1","CEFR-J"],
  ["bandwagon effect","noun","تأثير العربة (الانضمام للأغلبية)","The bandwagon effect influences voting behavior.","يؤثر تأثير العربة على سلوك التصويت.","extended","B2","COCA"],
  ["subliminal","adjective","ما دون الوعي","Subliminal advertising targets the subconscious mind.","يستهدف الإعلان دون الواعي العقل الباطن.","extended","C1","COCA"],
  ["polarization","noun","استقطاب","Political polarization deepens divisions in society.","يعمّق الاستقطاب السياسي الانقسامات في المجتمع.","core","B2","AWL"],
  ["whistleblower","noun","مُبلِّغ عن مخالفات","The whistleblower exposed corruption inside the company.","كشف المبلغ عن مخالفات الفساد داخل الشركة.","extended","B2","COCA"],
  ["moral panic","noun","ذعر أخلاقي","Media coverage sometimes creates moral panic about new technology.","تخلق التغطية الإعلامية أحيانًا ذعرًا أخلاقيًا حول التكنولوجيا الجديدة.","extended","C1","COCA"],
  ["authority figure","noun","شخصية ذات سلطة","People tend to obey authority figures without question.","يميل الناس إلى طاعة شخصيات السلطة دون سؤال.","core","B1","CEFR-J"],
  ["tribalism","noun","قبلية؛ تعصب جماعي","Online tribalism divides communities into hostile factions.","تقسم القبلية الإلكترونية المجتمعات إلى فصائل معادية.","extended","C1","COCA"],
  ["manipulation","noun","تلاعب","Emotional manipulation exploits people's vulnerabilities.","يستغل التلاعب العاطفي نقاط ضعف الناس.","core","B2","COCA"],
  ["mass hysteria","noun","هستيريا جماعية","Mass hysteria spread quickly through the small town.","انتشرت الهستيريا الجماعية بسرعة في البلدة الصغيرة.","extended","B2","COCA"],
];

// ── Unit 8: Forensic Science & Criminal Investigation ──
const unit8 = [
  ["forensic","adjective","جنائي؛ شرعي","Forensic evidence linked the suspect to the crime scene.","ربط الدليل الجنائي المشتبه به بمسرح الجريمة.","core","B2","COCA"],
  ["autopsy","noun","تشريح الجثة","The autopsy revealed the true cause of death.","كشف تشريح الجثة السبب الحقيقي للوفاة.","core","B2","COCA"],
  ["fingerprint","noun","بصمة إصبع","The fingerprint found on the glass matched the suspect.","تطابقت البصمة الموجودة على الكأس مع المشتبه به.","core","B1","CEFR-J"],
  ["ballistics","noun","علم المقذوفات","Ballistics analysis identified the type of weapon used.","حدد تحليل المقذوفات نوع السلاح المستخدم.","extended","B2","COCA"],
  ["crime scene","noun","مسرح الجريمة","Investigators secured the crime scene immediately.","أمّن المحققون مسرح الجريمة فورًا.","core","B1","CEFR-J"],
  ["DNA profiling","noun","التنميط الجيني","DNA profiling has exonerated many wrongly convicted people.","برّأ التنميط الجيني كثيرًا من المدانين خطأً.","extended","B2","COCA"],
  ["coroner","noun","طبيب شرعي","The coroner determined the time of death.","حدد الطبيب الشرعي وقت الوفاة.","core","B2","COCA"],
  ["toxicology","noun","علم السموم","Toxicology tests detected poison in the victim's blood.","كشفت اختبارات علم السموم عن سم في دم الضحية.","extended","B2","COCA"],
  ["chain of custody","noun","سلسلة الحفظ (للأدلة)","A broken chain of custody can invalidate evidence in court.","يمكن لسلسلة حفظ مكسورة أن تبطل الأدلة في المحكمة.","extended","C1","COCA"],
  ["bloodstain pattern","noun","نمط بقع الدم","Bloodstain pattern analysis reconstructs the crime event.","يعيد تحليل نمط بقع الدم بناء حدث الجريمة.","mastery","C1","COCA"],
  ["suspect lineup","noun","طابور تعرف على المشتبه بهم","The witness identified the thief from the suspect lineup.","تعرف الشاهد على اللص من طابور المشتبه بهم.","core","B2","COCA"],
  ["eyewitness","noun","شاهد عيان","Eyewitness testimony is often unreliable.","شهادة شاهد العيان غالبًا غير موثوقة.","core","B1","CEFR-J"],
  ["arson","noun","حرق عمد","The fire was ruled arson by the investigators.","صنف المحققون الحريق على أنه حرق عمد.","extended","B2","COCA"],
  ["trace evidence","noun","دليل أثري","Trace evidence such as fibers can link suspects to scenes.","يمكن لدليل أثري مثل الألياف ربط المشتبه بهم بالمواقع.","extended","B2","COCA"],
  ["confession","noun","اعتراف","The suspect's confession was recorded on video.","سُجل اعتراف المشتبه به بالفيديو.","core","B2","CEFR-J"],
  ["modus operandi","noun","أسلوب العمل الإجرامي","Each serial criminal has a distinct modus operandi.","لكل مجرم متسلسل أسلوب عمل مميز.","mastery","C1","COCA"],
  ["circumstantial","adjective","ظرفي (دليل غير مباشر)","The case relied on circumstantial evidence only.","اعتمدت القضية على أدلة ظرفية فقط.","extended","B2","AWL"],
  ["entomology","noun","علم الحشرات (الجنائي)","Forensic entomology uses insect activity to estimate time of death.","يستخدم علم الحشرات الجنائي نشاط الحشرات لتقدير وقت الوفاة.","mastery","C1","COCA"],
  ["interrogation","noun","استجواب","The detective conducted a lengthy interrogation.","أجرى المحقق استجوابًا مطولًا.","core","B2","COCA"],
  ["cold case","noun","قضية قديمة لم تُحل","New DNA evidence reopened the cold case after twenty years.","أعادت أدلة الحمض النووي الجديدة فتح القضية القديمة بعد عشرين عامًا.","core","B2","COCA"],
  ["forensic pathologist","noun","أخصائي علم الأمراض الشرعي","The forensic pathologist examined the body thoroughly.","فحص أخصائي علم الأمراض الشرعي الجثة بدقة.","extended","C1","COCA"],
  ["plea bargain","noun","صفقة إقرار بالذنب","The defendant accepted a plea bargain for a reduced sentence.","قبل المتهم صفقة إقرار بالذنب مقابل حكم مخفف.","extended","B2","COCA"],
  ["cyber forensics","noun","الطب الشرعي الرقمي","Cyber forensics recovered deleted files from the hard drive.","استعاد الطب الشرعي الرقمي ملفات محذوفة من القرص الصلب.","extended","B2","COCA"],
  ["warrant","noun","مذكرة قضائية","The judge issued a search warrant for the house.","أصدر القاضي مذكرة تفتيش للمنزل.","core","B2","COCA"],
  ["incriminate","verb","يُجرِّم؛ يُدين","The new evidence could incriminate the CEO.","يمكن للأدلة الجديدة أن تُجرّم المدير التنفيذي.","extended","B2","COCA"],
];

// ── Unit 9: Archaeological Mysteries & Lost Civilizations ──
const unit9 = [
  ["excavation","noun","تنقيب أثري","The excavation uncovered a Roman mosaic floor.","كشف التنقيب الأثري عن أرضية فسيفساء رومانية.","core","B2","COCA"],
  ["artifact","noun","قطعة أثرية","This clay artifact dates back three thousand years.","يعود هذا الأثر الطيني إلى ثلاثة آلاف سنة.","core","B2","AWL"],
  ["hieroglyph","noun","كتابة هيروغليفية","Champollion deciphered Egyptian hieroglyphs using the Rosetta Stone.","فك شامبليون رموز الهيروغليفية المصرية باستخدام حجر رشيد.","core","B2","COCA"],
  ["carbon dating","noun","التأريخ بالكربون المشع","Carbon dating estimated the skeleton to be five thousand years old.","قدّر التأريخ بالكربون عمر الهيكل العظمي بخمسة آلاف سنة.","core","B2","COCA"],
  ["megalith","noun","حجر ضخم أثري","The megaliths at Stonehenge still puzzle archaeologists.","لا تزال الأحجار الضخمة في ستونهنج تحيّر علماء الآثار.","extended","C1","COCA"],
  ["burial mound","noun","تلة دفن","The burial mound contained gold jewelry and weapons.","احتوت تلة الدفن على مجوهرات ذهبية وأسلحة.","core","B2","COCA"],
  ["cuneiform","noun","كتابة مسمارية","Cuneiform is one of the earliest writing systems.","الكتابة المسمارية هي من أقدم أنظمة الكتابة.","extended","C1","COCA"],
  ["stratigraphy","noun","علم الطبقات","Stratigraphy helps date objects by their soil layer.","يساعد علم الطبقات في تأريخ الأشياء حسب طبقة التربة.","mastery","C1","AWL"],
  ["citadel","noun","قلعة محصنة","The ancient citadel overlooked the entire valley.","أطلت القلعة المحصنة القديمة على الوادي بأكمله.","core","B2","COCA"],
  ["petroglyph","noun","نقش صخري","Petroglyphs carved into the cliff depict hunting scenes.","تصور النقوش الصخرية على الجرف مشاهد صيد.","extended","C1","COCA"],
  ["antiquity","noun","العصور القديمة","These coins are treasures from classical antiquity.","هذه العملات كنوز من العصور الكلاسيكية القديمة.","core","B2","AWL"],
  ["sarcophagus","noun","تابوت حجري","The sarcophagus was richly decorated with carvings.","كان التابوت الحجري مزينًا بنقوش غنية.","extended","B2","COCA"],
  ["mummification","noun","تحنيط","Mummification preserved bodies for the afterlife in Egypt.","حفظ التحنيط الأجساد للحياة الآخرة في مصر.","core","B2","COCA"],
  ["sphinx","noun","أبو الهول","The Great Sphinx guards the pyramids of Giza.","يحرس أبو الهول العظيم أهرامات الجيزة.","core","B1","CEFR-J"],
  ["obelisk","noun","مسلّة","The Egyptian obelisk stands in the center of the square.","تقف المسلة المصرية في وسط الميدان.","core","B2","COCA"],
  ["terracotta","noun","طين محروق؛ تيراكوتا","The terracotta army was discovered in 1974.","اكتُشف جيش التيراكوتا في عام 1974.","core","B2","COCA"],
  ["relic","noun","أثر تاريخي؛ مخلّفة","The relic was preserved in the museum vault.","حُفظ الأثر التاريخي في خزنة المتحف.","core","B2","COCA"],
  ["inscription","noun","نقش؛ كتابة محفورة","The inscription on the tomb was written in Latin.","كُتب النقش على القبر باللغة اللاتينية.","core","B2","COCA"],
  ["tomb raider","noun","ناهب مقابر","Tomb raiders looted priceless artifacts from the site.","نهب ناهبو المقابر قطعًا أثرية لا تقدر بثمن من الموقع.","extended","B2","COCA"],
  ["archaeological site","noun","موقع أثري","The archaeological site attracted researchers worldwide.","استقطب الموقع الأثري باحثين من جميع أنحاء العالم.","core","B1","CEFR-J"],
  ["cartography","noun","رسم الخرائط","Ancient cartography reveals how civilizations saw the world.","يكشف رسم الخرائط القديم كيف رأت الحضارات العالم.","extended","B2","COCA"],
  ["dynasty","noun","سلالة حاكمة","The Ming dynasty ruled China for nearly three centuries.","حكمت سلالة مينغ الصين لما يقرب من ثلاثة قرون.","core","B2","COCA"],
  ["amphitheater","noun","مدرج","The Roman amphitheater could seat fifty thousand spectators.","كان المدرج الروماني يتسع لخمسين ألف متفرج.","core","B2","COCA"],
  ["aqueduct","noun","قناة مائية","Roman aqueducts transported water across vast distances.","نقلت القنوات المائية الرومانية المياه عبر مسافات شاسعة.","extended","B2","COCA"],
  ["looting","noun","نهب","Looting of ancient sites destroys irreplaceable history.","يدمر نهب المواقع القديمة تاريخًا لا يمكن تعويضه.","core","B2","COCA"],
];

// ── Unit 10: Longevity Science & Aging ──
const unit10 = [
  ["longevity","noun","طول العمر","Healthy habits contribute to longevity.","تساهم العادات الصحية في طول العمر.","core","B2","COCA"],
  ["telomere","noun","تيلومير (نهاية الكروموسوم)","Shorter telomeres are associated with aging.","ترتبط التيلوميرات الأقصر بالشيخوخة.","extended","C1","COCA"],
  ["senescence","noun","شيخوخة خلوية","Cellular senescence is a hallmark of biological aging.","الشيخوخة الخلوية سمة مميزة للتقدم البيولوجي في العمر.","mastery","C1","COCA"],
  ["geriatric","adjective","متعلق بطب الشيخوخة","Geriatric medicine focuses on health care for the elderly.","يركز طب الشيخوخة على الرعاية الصحية للمسنين.","core","B2","COCA"],
  ["cognitive decline","noun","تراجع معرفي","Regular exercise can slow cognitive decline.","يمكن للتمرين المنتظم إبطاء التراجع المعرفي.","core","B2","COCA"],
  ["antioxidant","noun","مضاد أكسدة","Antioxidants protect cells from free radical damage.","تحمي مضادات الأكسدة الخلايا من أضرار الجذور الحرة.","core","B2","COCA"],
  ["regenerative medicine","noun","الطب التجديدي","Regenerative medicine aims to restore damaged tissues.","يهدف الطب التجديدي إلى استعادة الأنسجة التالفة.","extended","B2","COCA"],
  ["centenarian","noun","معمّر (عاش مئة سنة)","The centenarian credited her long life to daily walking.","نسبت المعمّرة حياتها الطويلة إلى المشي اليومي.","extended","C1","COCA"],
  ["caloric restriction","noun","تقييد السعرات الحرارية","Caloric restriction extends lifespan in laboratory mice.","يطيل تقييد السعرات الحرارية العمر في فئران المختبر.","extended","B2","COCA"],
  ["biomarker","noun","مؤشر حيوي","Blood biomarkers can predict the risk of age-related diseases.","يمكن للمؤشرات الحيوية في الدم التنبؤ بخطر الأمراض المرتبطة بالعمر.","extended","B2","COCA"],
  ["life expectancy","noun","متوسط العمر المتوقع","Life expectancy has increased dramatically in the last century.","زاد متوسط العمر المتوقع بشكل كبير في القرن الماضي.","core","B1","CEFR-J"],
  ["dementia","noun","خرف","Early detection of dementia improves patient outcomes.","يحسن الكشف المبكر عن الخرف نتائج المرضى.","core","B2","COCA"],
  ["neurodegenerative","adjective","تنكسي عصبي","Alzheimer's is the most common neurodegenerative disease.","الزهايمر هو أكثر الأمراض التنكسية العصبية شيوعًا.","mastery","C1","COCA"],
  ["cryopreservation","noun","حفظ بالتجميد","Cryopreservation freezes cells for potential future revival.","يجمد الحفظ بالتجميد الخلايا لإحياء محتمل مستقبلًا.","mastery","C1","COCA"],
  ["metabolic rate","noun","معدل الأيض","A slower metabolic rate may contribute to longer life.","قد يساهم معدل أيض أبطأ في حياة أطول.","core","B2","COCA"],
  ["collagen","noun","كولاجين","Collagen production decreases as we age.","ينخفض إنتاج الكولاجين مع تقدمنا في العمر.","core","B2","COCA"],
  ["osteoporosis","noun","هشاشة العظام","Osteoporosis weakens bones and increases fracture risk.","تضعف هشاشة العظام العظام وتزيد خطر الكسور.","core","B2","COCA"],
  ["autophagy","noun","التهام ذاتي (للخلايا)","Autophagy is the body's way of cleaning damaged cells.","الالتهام الذاتي هو طريقة الجسم في تنظيف الخلايا التالفة.","mastery","C1","COCA"],
  ["hormonal imbalance","noun","اختلال هرموني","Hormonal imbalance can accelerate the aging process.","يمكن أن يسرع الاختلال الهرموني عملية الشيخوخة.","core","B2","COCA"],
  ["stem cell therapy","noun","العلاج بالخلايا الجذعية","Stem cell therapy may reverse certain effects of aging.","قد يعكس العلاج بالخلايا الجذعية بعض آثار الشيخوخة.","extended","B2","COCA"],
  ["gerontology","noun","علم الشيخوخة","Gerontology studies the social and biological aspects of aging.","يدرس علم الشيخوخة الجوانب الاجتماعية والبيولوجية للشيخوخة.","extended","C1","AWL"],
  ["sarcopenia","noun","ضمور عضلي مرتبط بالعمر","Sarcopenia causes muscle loss in older adults.","يسبب الضمور العضلي فقدان العضلات لدى كبار السن.","mastery","C1","COCA"],
  ["placebo","noun","دواء وهمي","The placebo group showed no improvement in the trial.","لم تظهر مجموعة الدواء الوهمي أي تحسن في التجربة.","core","B2","COCA"],
  ["probiotic","noun","بروبيوتيك (بكتيريا نافعة)","Probiotics support gut health and may slow aging.","تدعم البروبيوتيك صحة الأمعاء وقد تبطئ الشيخوخة.","core","B2","COCA"],
  ["circadian rhythm","noun","إيقاع الساعة البيولوجية","Disrupting your circadian rhythm affects overall health.","يؤثر تعطيل إيقاع ساعتك البيولوجية على الصحة العامة.","extended","B2","COCA"],
];

// ── Unit 11: Sustainable Architecture & Green Building ──
const unit11 = [
  ["sustainable architecture","noun","عمارة مستدامة","Sustainable architecture minimizes environmental impact.","تقلل العمارة المستدامة الأثر البيئي.","core","B2","COCA"],
  ["photovoltaic","adjective","كهروضوئي","Photovoltaic panels convert sunlight into electricity.","تحول الألواح الكهروضوئية ضوء الشمس إلى كهرباء.","extended","C1","COCA"],
  ["insulation","noun","عزل حراري","Proper insulation reduces heating and cooling costs.","يقلل العزل الحراري المناسب تكاليف التدفئة والتبريد.","core","B2","COCA"],
  ["green roof","noun","سقف أخضر","A green roof is covered with vegetation to reduce heat.","السقف الأخضر مغطى بالنباتات لتقليل الحرارة.","core","B2","COCA"],
  ["carbon footprint","noun","بصمة كربونية","The building's design reduced its carbon footprint by half.","خفض تصميم المبنى بصمته الكربونية إلى النصف.","core","B2","COCA"],
  ["passive cooling","noun","تبريد سلبي","Passive cooling uses natural ventilation instead of air conditioning.","يستخدم التبريد السلبي التهوية الطبيعية بدلًا من التكييف.","extended","B2","COCA"],
  ["reclaimed material","noun","مواد معاد استخدامها","The café was built entirely from reclaimed materials.","بُني المقهى بالكامل من مواد معاد استخدامها.","core","B2","COCA"],
  ["rainwater harvesting","noun","حصاد مياه الأمطار","Rainwater harvesting provides water for garden irrigation.","يوفر حصاد مياه الأمطار المياه لري الحدائق.","extended","B2","COCA"],
  ["LEED certification","noun","شهادة ليد (للمباني الخضراء)","The office tower earned LEED certification for energy efficiency.","حصل البرج المكتبي على شهادة ليد لكفاءة الطاقة.","extended","B2","COCA"],
  ["geothermal heating","noun","تدفئة حرارية أرضية","Geothermal heating uses underground warmth to heat buildings.","تستخدم التدفئة الحرارية الأرضية الدفء تحت الأرض لتدفئة المباني.","extended","C1","COCA"],
  ["cross-ventilation","noun","تهوية متقاطعة","Cross-ventilation keeps the house cool in summer.","تحافظ التهوية المتقاطعة على برودة المنزل في الصيف.","core","B2","COCA"],
  ["embodied energy","noun","طاقة مجسدة","Embodied energy measures the total energy to produce a material.","تقيس الطاقة المجسدة إجمالي الطاقة لإنتاج مادة ما.","mastery","C1","AWL"],
  ["prefabricated","adjective","مُصنّع مسبقًا","Prefabricated modules speed up construction significantly.","تسرّع الوحدات المصنعة مسبقًا البناء بشكل كبير.","core","B2","COCA"],
  ["thermal mass","noun","كتلة حرارية","Thick walls provide thermal mass that stabilizes temperatures.","توفر الجدران السميكة كتلة حرارية تثبت درجات الحرارة.","extended","C1","COCA"],
  ["net-zero building","noun","مبنى صفري الانبعاثات","A net-zero building produces as much energy as it consumes.","ينتج المبنى صفري الانبعاثات طاقة بقدر ما يستهلك.","extended","B2","COCA"],
  ["greywater recycling","noun","إعادة تدوير المياه الرمادية","Greywater recycling reuses sink water for flushing toilets.","تعيد تدوير المياه الرمادية استخدام مياه الأحواض لشطف المراحيض.","extended","B2","COCA"],
  ["load-bearing wall","noun","جدار حامل","Removing a load-bearing wall requires structural reinforcement.","تتطلب إزالة جدار حامل تعزيزًا هيكليًا.","core","B2","COCA"],
  ["daylighting","noun","إضاءة طبيعية","Daylighting design maximizes natural light inside buildings.","يزيد تصميم الإضاءة الطبيعية الضوء الطبيعي داخل المباني.","core","B2","COCA"],
  ["retrofit","verb","يعيد تأهيل (مبنى قائم)","The city plans to retrofit old buildings with solar panels.","تخطط المدينة لإعادة تأهيل المباني القديمة بألواح شمسية.","extended","B2","COCA"],
  ["ventilation duct","noun","مجرى تهوية","Clean ventilation ducts improve indoor air quality.","تحسّن مجاري التهوية النظيفة جودة الهواء الداخلي.","core","B1","CEFR-J"],
  ["biophilic design","noun","تصميم محب للطبيعة","Biophilic design incorporates plants and water into workplaces.","يدمج التصميم المحب للطبيعة النباتات والماء في أماكن العمل.","mastery","C1","COCA"],
  ["energy audit","noun","تدقيق طاقة","An energy audit identifies where a building wastes energy.","يحدد تدقيق الطاقة أين يهدر المبنى الطاقة.","core","B2","COCA"],
  ["hemp concrete","noun","خرسانة القنب","Hemp concrete is a lightweight and sustainable building material.","خرسانة القنب مادة بناء خفيفة ومستدامة.","mastery","C1","COCA"],
  ["double glazing","noun","زجاج مزدوج","Double glazing reduces heat loss through windows.","يقلل الزجاج المزدوج فقدان الحرارة عبر النوافذ.","core","B2","CEFR-J"],
  ["urban heat island","noun","جزيرة حرارية حضرية","Green roofs help mitigate the urban heat island effect.","تساعد الأسطح الخضراء في تخفيف تأثير الجزيرة الحرارية الحضرية.","extended","B2","COCA"],
];

// ── Unit 12: Exoplanet Hunting & Space Exploration ──
const unit12 = [
  ["exoplanet","noun","كوكب خارج المجموعة الشمسية","Over five thousand exoplanets have been confirmed so far.","تم تأكيد أكثر من خمسة آلاف كوكب خارجي حتى الآن.","core","B2","COCA"],
  ["habitable zone","noun","المنطقة الصالحة للحياة","The habitable zone is where liquid water could exist.","المنطقة الصالحة للحياة هي حيث يمكن أن يوجد ماء سائل.","core","B2","COCA"],
  ["light-year","noun","سنة ضوئية","The nearest star is about four light-years away.","أقرب نجم يبعد حوالي أربع سنوات ضوئية.","core","B1","CEFR-J"],
  ["spectroscopy","noun","التحليل الطيفي","Spectroscopy reveals the chemical composition of distant stars.","يكشف التحليل الطيفي التركيب الكيميائي للنجوم البعيدة.","extended","C1","AWL"],
  ["orbital period","noun","فترة مدارية","The exoplanet has an orbital period of just three days.","فترة الكوكب الخارجي المدارية ثلاثة أيام فقط.","core","B2","COCA"],
  ["transit method","noun","طريقة العبور","The transit method detects planets by measuring dimming starlight.","تكشف طريقة العبور الكواكب عبر قياس خفوت ضوء النجم.","extended","B2","COCA"],
  ["red dwarf","noun","قزم أحمر","Many exoplanets orbit red dwarf stars.","يدور كثير من الكواكب الخارجية حول نجوم قزمة حمراء.","core","B2","COCA"],
  ["gravitational pull","noun","جاذبية","The planet's gravitational pull affects nearby asteroids.","تؤثر جاذبية الكوكب على الكويكبات القريبة.","core","B2","COCA"],
  ["radio telescope","noun","تلسكوب راديوي","Radio telescopes detect signals from deep space.","تكشف التلسكوبات الراديوية إشارات من أعماق الفضاء.","core","B2","COCA"],
  ["cosmology","noun","علم الكونيات","Cosmology explores the origin and structure of the universe.","يستكشف علم الكونيات أصل الكون وبنيته.","core","B2","AWL"],
  ["stellar nursery","noun","حاضنة نجمية","A stellar nursery is a cloud of gas where stars form.","الحاضنة النجمية سحابة غاز حيث تتشكل النجوم.","extended","B2","COCA"],
  ["supernova","noun","مستعر أعظم","A supernova explosion scatters heavy elements across space.","ينثر انفجار المستعر الأعظم عناصر ثقيلة عبر الفضاء.","core","B2","COCA"],
  ["planetary atmosphere","noun","غلاف جوي كوكبي","Studying a planetary atmosphere reveals whether it could support life.","تكشف دراسة الغلاف الجوي الكوكبي ما إذا كان يمكنه دعم الحياة.","core","B2","COCA"],
  ["interstellar","adjective","بين النجوم","Interstellar travel remains a distant dream.","لا يزال السفر بين النجوم حلمًا بعيدًا.","core","B2","COCA"],
  ["asteroid belt","noun","حزام الكويكبات","The asteroid belt lies between Mars and Jupiter.","يقع حزام الكويكبات بين المريخ والمشتري.","core","B1","CEFR-J"],
  ["space probe","noun","مسبار فضائي","The space probe sent back stunning images of Saturn.","أرسل المسبار الفضائي صورًا مذهلة لزحل.","core","B2","COCA"],
  ["Doppler shift","noun","انزياح دوبلر","The Doppler shift reveals whether a star moves toward or away from us.","يكشف انزياح دوبلر ما إذا كان النجم يتحرك نحونا أو بعيدًا عنا.","extended","C1","COCA"],
  ["nebula","noun","سديم","The Orion Nebula is visible to the naked eye.","سديم الجبار مرئي بالعين المجردة.","core","B2","COCA"],
  ["dark matter","noun","المادة المظلمة","Dark matter makes up about twenty-seven percent of the universe.","تشكل المادة المظلمة حوالي سبعة وعشرين بالمئة من الكون.","core","B2","COCA"],
  ["binary star","noun","نجم ثنائي","A binary star system consists of two stars orbiting each other.","يتكون نظام النجم الثنائي من نجمين يدوران حول بعضهما.","extended","B2","COCA"],
  ["astronomical unit","noun","وحدة فلكية","One astronomical unit equals the distance from Earth to the Sun.","وحدة فلكية واحدة تساوي المسافة من الأرض إلى الشمس.","core","B2","AWL"],
  ["accretion disk","noun","قرص تراكمي","An accretion disk forms around a young star.","يتشكل قرص تراكمي حول نجم فتي.","mastery","C1","COCA"],
  ["payload","noun","حمولة (فضائية)","The rocket carried a scientific payload into orbit.","حملت الصاروخ حمولة علمية إلى المدار.","core","B2","COCA"],
  ["terraforming","noun","تحويل الكواكب لتصبح صالحة للسكن","Terraforming Mars could take hundreds of years.","قد يستغرق تحويل المريخ لكوكب صالح للسكن مئات السنين.","extended","C1","COCA"],
  ["biosignature","noun","بصمة حيوية","Scientists search for biosignatures on distant exoplanets.","يبحث العلماء عن بصمات حيوية على كواكب خارجية بعيدة.","mastery","C1","COCA"],
];

async function main() {
  const client = await pool.connect();
  const BATCH_ID = 15;
  const allUnits = [
    { data: unit1, num: 1, theme: 'Bioethics & Genetic Engineering' },
    { data: unit2, num: 2, theme: 'Deep Ocean Exploration' },
    { data: unit3, num: 3, theme: 'Food Security & Agriculture' },
    { data: unit4, num: 4, theme: 'Biomimicry & Nature-Inspired Design' },
    { data: unit5, num: 5, theme: 'Human Migration & Diaspora' },
    { data: unit6, num: 6, theme: 'Cryptocurrency & Digital Finance' },
    { data: unit7, num: 7, theme: 'Crowd Psychology & Social Influence' },
    { data: unit8, num: 8, theme: 'Forensic Science & Criminal Investigation' },
    { data: unit9, num: 9, theme: 'Archaeological Mysteries & Lost Civilizations' },
    { data: unit10, num: 10, theme: 'Longevity Science & Aging' },
    { data: unit11, num: 11, theme: 'Sustainable Architecture & Green Building' },
    { data: unit12, num: 12, theme: 'Exoplanet Hunting & Space Exploration' },
  ];

  let grandTotal = 0;
  for (const u of allUnits) {
    const count = await insertBatch(client, u.data, u.num, BATCH_ID);
    console.log(`Unit ${u.num} (${u.theme}): ${count}/${u.data.length} inserted`);
    grandTotal += count;
  }
  console.log(`\n=== Total inserted: ${grandTotal} ===\n`);

  // Summary queries
  const res1 = await client.query(`SELECT recommended_unit, COUNT(*) AS cnt FROM public.vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit`);
  console.log('--- Words per unit ---');
  for (const row of res1.rows) {
    console.log(`  Unit ${row.recommended_unit}: ${row.cnt}`);
  }

  const res2 = await client.query(`SELECT COUNT(*) AS total FROM public.vocab_staging_l4`);
  console.log(`\n--- Total words in vocab_staging_l4: ${res2.rows[0].total} ---`);

  client.release();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
