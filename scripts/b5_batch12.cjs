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
  ["genetically","adverb","وراثيًّا","The crops were genetically modified to resist pests.","عُدِّلت المحاصيل وراثيًّا لمقاومة الآفات.","core","B2","COCA"],
  ["clinically","adverb","سريريًّا","The drug has been clinically tested on thousands of patients.","خُضع الدواء لاختبارات سريريّة على آلاف المرضى.","core","B2","COCA"],
  ["ethically","adverb","أخلاقيًّا","Scientists must act ethically when conducting experiments.","يجب أن يتصرّف العلماء أخلاقيًّا عند إجراء التجارب.","extended","B2","AWL"],
  ["therapeutically","adverb","علاجيًّا","The compound is used therapeutically for chronic pain.","يُستخدم المركّب علاجيًّا لتخفيف الألم المزمن.","mastery","C1","COCA"],
  ["intravenously","adverb","عن طريق الوريد","The medication was administered intravenously.","أُعطي الدواء عن طريق الوريد.","mastery","C1","COCA"],
  ["gene pool","noun","مجمع الجينات","A small gene pool can lead to inherited diseases.","يمكن أن يؤدّي مجمع الجينات الصغير إلى أمراض وراثية.","extended","B2","COCA"],
  ["stem cell","noun","خلية جذعية","Stem cell research offers hope for treating paralysis.","يوفّر بحث الخلايا الجذعية أملًا في علاج الشلل.","core","B2","COCA"],
  ["clinical trial","noun","تجربة سريرية","The clinical trial involved over 500 volunteers.","شملت التجربة السريرية أكثر من 500 متطوّع.","core","B2","AWL"],
  ["informed consent","noun","موافقة مستنيرة","Patients must give informed consent before surgery.","يجب أن يقدّم المرضى موافقة مستنيرة قبل الجراحة.","extended","B2","AWL"],
  ["genetic counseling","noun","استشارة وراثية","Genetic counseling helps families understand inherited risks.","تساعد الاستشارة الوراثية العائلات في فهم المخاطر الوراثية.","extended","C1","COCA"],
  ["gene editing","noun","تعديل الجينات","Gene editing technology has transformed modern medicine.","غيّرت تقنية تعديل الجينات الطبّ الحديث.","core","B2","COCA"],
  ["double helix","noun","لولب مزدوج","DNA has the shape of a double helix.","يأخذ الحمض النووي شكل اللولب المزدوج.","extended","B2","COCA"],
  ["immune system","noun","جهاز المناعة","A healthy immune system fights off infections.","يقاوم جهاز المناعة السليم العدوى.","core","B1","CEFR-J"],
  ["blood sample","noun","عيّنة دم","The nurse took a blood sample for testing.","أخذت الممرّضة عيّنة دم للفحص.","core","B1","CEFR-J"],
  ["test tube","noun","أنبوب اختبار","The scientist heated the liquid in a test tube.","سخّن العالم السائل في أنبوب اختبار.","core","B1","CEFR-J"],
  ["control group","noun","مجموعة ضابطة","The control group received a placebo instead of the drug.","تلقّت المجموعة الضابطة دواءً وهميًّا بدلًا من الدواء.","extended","B2","AWL"],
  ["side effect","noun","أثر جانبي","Drowsiness is a common side effect of this medicine.","النعاس أثر جانبي شائع لهذا الدواء.","core","B2","CEFR-J"],
  ["drug resistance","noun","مقاومة الأدوية","Overuse of antibiotics can lead to drug resistance.","يمكن أن يؤدّي الإفراط في استخدام المضادّات الحيوية إلى مقاومة الأدوية.","extended","B2","COCA"],
  ["organ donor","noun","متبرّع بالأعضاء","The organ donor saved three lives.","أنقذ المتبرّع بالأعضاء ثلاث أرواح.","core","B2","COCA"],
  ["bone marrow","noun","نخاع العظم","Bone marrow transplants can cure certain blood cancers.","يمكن لعمليّات زرع نخاع العظم أن تعالج بعض سرطانات الدم.","extended","B2","COCA"],
  ["bioethically","adverb","من الناحية الأخلاقية الحيوية","The procedure must be bioethically justified.","يجب أن يكون الإجراء مبرّرًا من الناحية الأخلاقية الحيوية.","mastery","C1","COCA"],
  ["experimentally","adverb","تجريبيًّا","The hypothesis was experimentally confirmed.","تمّ تأكيد الفرضية تجريبيًّا.","extended","B2","AWL"],
  ["cell therapy","noun","علاج خلوي","Cell therapy is a promising treatment for leukemia.","العلاج الخلوي علاج واعد لسرطان الدم.","extended","C1","COCA"],
  ["placebo effect","noun","تأثير الدواء الوهمي","The placebo effect can influence clinical trial results.","يمكن لتأثير الدواء الوهمي أن يؤثّر على نتائج التجارب السريرية.","extended","B2","COCA"],
  ["peer review","noun","مراجعة الأقران","All research papers undergo peer review before publication.","تخضع جميع الأوراق البحثية لمراجعة الأقران قبل النشر.","extended","B2","AWL"],
  ["lab report","noun","تقرير مختبري","The lab report confirmed the presence of the virus.","أكّد التقرير المختبري وجود الفيروس.","core","B1","CEFR-J"],
];

// ─── UNIT 2: Deep Ocean ───
const unit2 = [
  ["underwater","adverb","تحت الماء","Divers explored the underwater caves for hours.","استكشف الغوّاصون الكهوف تحت الماء لساعات.","core","B1","CEFR-J"],
  ["vertically","adverb","عموديًّا","The submarine descended vertically into the trench.","هبطت الغوّاصة عموديًّا في الخندق.","core","B2","COCA"],
  ["horizontally","adverb","أفقيًّا","The fish swam horizontally along the reef.","سبحت الأسماك أفقيًّا على طول الشعب المرجانية.","core","B2","COCA"],
  ["geologically","adverb","جيولوجيًّا","Geologically, this region is millions of years old.","جيولوجيًّا، يبلغ عمر هذه المنطقة ملايين السنين.","extended","C1","AWL"],
  ["ocean floor","noun","قاع المحيط","Strange creatures live on the ocean floor.","تعيش مخلوقات غريبة في قاع المحيط.","core","B1","CEFR-J"],
  ["sea level","noun","مستوى سطح البحر","Sea level is rising due to global warming.","يرتفع مستوى سطح البحر بسبب الاحتباس الحراري.","core","B2","CEFR-J"],
  ["tidal wave","noun","موجة مدّية","A tidal wave hit the coastal village at dawn.","ضربت موجة مدّية القرية الساحلية عند الفجر.","core","B2","COCA"],
  ["food web","noun","شبكة غذائية","Removing one species can disrupt the entire food web.","يمكن أن تؤدّي إزالة نوع واحد إلى تعطيل الشبكة الغذائية بأكملها.","extended","B2","COCA"],
  ["water column","noun","عمود الماء","Plankton drift through the water column.","يطفو العوالق عبر عمود الماء.","extended","C1","COCA"],
  ["deep sea","noun","أعماق البحر","Deep sea exploration requires special equipment.","يتطلّب استكشاف أعماق البحر معدّات خاصّة.","core","B2","CEFR-J"],
  ["sea creature","noun","كائن بحري","This sea creature glows in the dark.","يتوهّج هذا الكائن البحري في الظلام.","core","B1","CEFR-J"],
  ["coral bleaching","noun","ابيضاض المرجان","Coral bleaching is caused by rising water temperatures.","يحدث ابيضاض المرجان بسبب ارتفاع درجات حرارة المياه.","extended","B2","COCA"],
  ["ocean current","noun","تيّار محيطي","Ocean currents carry warm water to colder regions.","تنقل التيّارات المحيطية المياه الدافئة إلى المناطق الأكثر برودة.","core","B2","COCA"],
  ["marine biologist","noun","عالم أحياء بحرية","The marine biologist studied whale migration patterns.","درس عالم الأحياء البحرية أنماط هجرة الحيتان.","core","B2","COCA"],
  ["research vessel","noun","سفينة أبحاث","The research vessel sailed to the Arctic for a study.","أبحرت سفينة الأبحاث إلى القطب الشمالي لإجراء دراسة.","extended","B2","COCA"],
  ["sonar equipment","noun","معدّات السونار","Sonar equipment detected an object on the seabed.","رصدت معدّات السونار جسمًا في قاع البحر.","extended","B2","COCA"],
  ["diving bell","noun","ناقوس الغوص","The diving bell allowed workers to breathe underwater.","سمح ناقوس الغوص للعمّال بالتنفّس تحت الماء.","mastery","C1","COCA"],
  ["pressure suit","noun","بدلة ضغط","Astronauts and deep-sea divers both need a pressure suit.","يحتاج روّاد الفضاء وغوّاصو الأعماق إلى بدلة ضغط.","extended","B2","COCA"],
  ["oxygen tank","noun","خزّان أكسجين","The diver checked her oxygen tank before the descent.","فحصت الغوّاصة خزّان الأكسجين قبل النزول.","core","B1","CEFR-J"],
  ["submersible","noun","غوّاصة صغيرة","The submersible descended to the ocean floor.","هبطت الغوّاصة الصغيرة إلى قاع المحيط.","extended","C1","COCA"],
  ["thermally","adverb","حراريًّا","Thermally heated vents support unique deep-sea ecosystems.","تدعم الفتحات المسخّنة حراريًّا أنظمة بيئية فريدة في أعماق البحر.","extended","C1","COCA"],
  ["hydrothermal vent","noun","فتحة حرارية مائية","Life thrives near the hydrothermal vent despite the extreme heat.","تزدهر الحياة بالقرب من الفتحة الحرارية المائية رغم الحرارة الشديدة.","mastery","C1","COCA"],
  ["marine ecosystem","noun","نظام بيئي بحري","Pollution threatens the entire marine ecosystem.","يهدّد التلوّث النظام البيئي البحري بأكمله.","extended","B2","COCA"],
  ["continental shelf","noun","جرف قارّي","Most commercial fishing occurs on the continental shelf.","يحدث معظم الصيد التجاري على الجرف القارّي.","extended","B2","COCA"],
  ["plankton bloom","noun","ازدهار العوالق","A plankton bloom turned the water green.","حوّل ازدهار العوالق لون الماء إلى الأخضر.","extended","B2","COCA"],
];

// ─── UNIT 3: Food Security ───
const unit3 = [
  ["organically","adverb","عضويًّا","These vegetables are organically grown without pesticides.","تُزرع هذه الخضروات عضويًّا بدون مبيدات حشرية.","core","B2","COCA"],
  ["sustainably","adverb","بشكل مستدام","Fish must be caught sustainably to protect stocks.","يجب صيد الأسماك بشكل مستدام لحماية المخزون.","extended","B2","AWL"],
  ["artificially","adverb","اصطناعيًّا","The fruit was artificially ripened using chemicals.","نُضّجت الفاكهة اصطناعيًّا باستخدام مواد كيميائية.","core","B2","COCA"],
  ["commercially","adverb","تجاريًّا","The product is not yet commercially available.","المنتج ليس متاحًا تجاريًّا بعد.","core","B2","AWL"],
  ["food chain","noun","سلسلة غذائية","Pollution affects every level of the food chain.","يؤثّر التلوّث على كلّ مستوى من السلسلة الغذائية.","core","B1","CEFR-J"],
  ["crop yield","noun","غلّة المحصول","Better irrigation increased the crop yield significantly.","زاد الريّ المحسّن غلّة المحصول بشكل ملحوظ.","extended","B2","AWL"],
  ["food waste","noun","هدر الطعام","Reducing food waste is essential for food security.","يُعدّ الحدّ من هدر الطعام ضروريًّا لتحقيق الأمن الغذائي.","core","B2","COCA"],
  ["supply chain","noun","سلسلة التوريد","The pandemic disrupted the global supply chain.","أدّت الجائحة إلى تعطيل سلسلة التوريد العالمية.","core","B2","AWL"],
  ["shelf life","noun","مدّة الصلاحية","Canned food has a long shelf life.","يتمتّع الطعام المعلّب بمدّة صلاحية طويلة.","core","B2","COCA"],
  ["growing season","noun","موسم الزراعة","Climate change is altering the growing season in many areas.","يغيّر تغيّر المناخ موسم الزراعة في مناطق كثيرة.","core","B2","COCA"],
  ["seed bank","noun","بنك البذور","The seed bank preserves thousands of plant species.","يحفظ بنك البذور آلاف الأنواع النباتية.","extended","B2","COCA"],
  ["food processing","noun","تصنيع الأغذية","Food processing can reduce the nutritional value of meals.","يمكن لتصنيع الأغذية أن يقلّل القيمة الغذائية للوجبات.","core","B2","COCA"],
  ["water scarcity","noun","شحّ المياه","Water scarcity is a growing concern in arid regions.","يُعدّ شحّ المياه مصدر قلق متزايد في المناطق الجافّة.","extended","B2","AWL"],
  ["land degradation","noun","تدهور الأراضي","Overgrazing causes severe land degradation.","يسبّب الرعي الجائر تدهورًا شديدًا للأراضي.","extended","C1","AWL"],
  ["soil erosion","noun","تآكل التربة","Deforestation accelerates soil erosion on hillsides.","تسرّع إزالة الغابات تآكل التربة على سفوح التلال.","core","B2","COCA"],
  ["pest control","noun","مكافحة الآفات","Farmers use natural pest control methods to protect crops.","يستخدم المزارعون طرق مكافحة الآفات الطبيعية لحماية المحاصيل.","core","B2","COCA"],
  ["weed killer","noun","مبيد أعشاب","The weed killer destroyed unwanted plants in the field.","أتلف مبيد الأعشاب النباتات غير المرغوبة في الحقل.","core","B1","CEFR-J"],
  ["dairy farm","noun","مزرعة ألبان","The dairy farm produces fresh milk every morning.","تنتج مزرعة الألبان حليبًا طازجًا كلّ صباح.","core","B1","CEFR-J"],
  ["livestock feed","noun","علف الماشية","The price of livestock feed has risen sharply.","ارتفع سعر علف الماشية بشكل حادّ.","extended","B2","COCA"],
  ["genetically modified","adjective","معدّل وراثيًّا","Genetically modified crops are banned in some countries.","المحاصيل المعدّلة وراثيًّا محظورة في بعض الدول.","core","B2","COCA"],
  ["food shortage","noun","نقص الغذاء","The drought caused a severe food shortage.","تسبّب الجفاف في نقص حادّ في الغذاء.","core","B2","COCA"],
  ["crop rotation","noun","تناوب المحاصيل","Crop rotation helps maintain soil fertility.","يساعد تناوب المحاصيل في الحفاظ على خصوبة التربة.","extended","B2","NAWL"],
  ["grain harvest","noun","حصاد الحبوب","The grain harvest was the largest in a decade.","كان حصاد الحبوب الأكبر منذ عقد.","core","B2","COCA"],
  ["irrigation system","noun","نظام ريّ","A modern irrigation system doubled the farm's output.","ضاعف نظام الريّ الحديث إنتاج المزرعة.","core","B2","COCA"],
  ["greenhouse gas","noun","غاز دفيئة","Agriculture contributes to greenhouse gas emissions.","تساهم الزراعة في انبعاثات غازات الدفيئة.","core","B2","COCA"],
];

// ─── UNIT 4: Biomimicry ───
const unit4 = [
  ["structurally","adverb","هيكليًّا","The bridge is structurally sound after repairs.","الجسر سليم هيكليًّا بعد الإصلاحات.","extended","B2","AWL"],
  ["mechanically","adverb","ميكانيكيًّا","The parts are mechanically joined without adhesive.","تُربط القطع ميكانيكيًّا بدون لاصق.","core","B2","COCA"],
  ["biologically","adverb","بيولوجيًّا","The material is biologically inspired by spider silk.","المادّة مستوحاة بيولوجيًّا من حرير العنكبوت.","extended","B2","COCA"],
  ["synthetically","adverb","صناعيًّا","The fibers are synthetically produced in a lab.","تُنتَج الألياف صناعيًّا في المختبر.","extended","C1","COCA"],
  ["wind tunnel","noun","نفق رياح","Engineers tested the car design in a wind tunnel.","اختبر المهندسون تصميم السيّارة في نفق رياح.","core","B2","COCA"],
  ["load bearing","adjective","حامل للأحمال","The load bearing wall supports the entire structure.","يدعم الجدار الحامل للأحمال الهيكل بأكمله.","extended","B2","COCA"],
  ["surface tension","noun","التوتّر السطحي","Surface tension allows insects to walk on water.","يسمح التوتّر السطحي للحشرات بالمشي على الماء.","extended","B2","COCA"],
  ["drag coefficient","noun","معامل السحب","A lower drag coefficient means better aerodynamics.","يعني معامل السحب الأقلّ ديناميكية هوائية أفضل.","mastery","C1","COCA"],
  ["building block","noun","لبنة أساسية","Amino acids are the building blocks of proteins.","الأحماض الأمينية هي اللبنات الأساسية للبروتينات.","core","B2","CEFR-J"],
  ["raw material","noun","مادّة خام","The factory imports raw materials from abroad.","يستورد المصنع المواد الخام من الخارج.","core","B1","CEFR-J"],
  ["design principle","noun","مبدأ التصميم","Simplicity is a key design principle in engineering.","البساطة مبدأ تصميم رئيسي في الهندسة.","extended","B2","AWL"],
  ["natural selection","noun","الانتقاء الطبيعي","Natural selection favors organisms best adapted to their environment.","يفضّل الانتقاء الطبيعي الكائنات الأكثر تكيّفًا مع بيئتها.","core","B2","COCA"],
  ["trial and error","noun","التجربة والخطأ","They developed the formula through trial and error.","طوّروا الصيغة من خلال التجربة والخطأ.","core","B2","CEFR-J"],
  ["cross section","noun","مقطع عرضي","The cross section of the tree revealed its age.","كشف المقطع العرضي للشجرة عن عمرها.","extended","B2","COCA"],
  ["breaking point","noun","نقطة الانهيار","The rope reached its breaking point and snapped.","وصل الحبل إلى نقطة الانهيار وانقطع.","core","B2","COCA"],
  ["stress test","noun","اختبار إجهاد","The beam passed the stress test without any cracks.","اجتاز العمود اختبار الإجهاد بدون أيّ شقوق.","extended","B2","COCA"],
  ["proof of concept","noun","إثبات المفهوم","The prototype served as a proof of concept for investors.","كان النموذج الأوّلي بمثابة إثبات للمفهوم أمام المستثمرين.","extended","C1","COCA"],
  ["scale model","noun","نموذج مصغّر","The architect built a scale model of the stadium.","بنى المهندس المعماري نموذجًا مصغّرًا للملعب.","core","B2","COCA"],
  ["field test","noun","اختبار ميداني","The device passed every field test in extreme conditions.","اجتاز الجهاز كلّ اختبار ميداني في ظروف قاسية.","core","B2","COCA"],
  ["aerodynamically","adverb","ديناميكيًّا هوائيًّا","The car is aerodynamically shaped to reduce drag.","صُمّمت السيارة ديناميكيًّا هوائيًّا لتقليل السحب.","extended","C1","COCA"],
  ["self-healing","adjective","ذاتي الإصلاح","Scientists developed a self-healing polymer inspired by skin.","طوّر العلماء بوليمرًا ذاتي الإصلاح مستوحى من الجلد.","extended","B2","COCA"],
  ["prototype design","noun","تصميم نموذج أوّلي","The prototype design was tested in real conditions.","اختُبر تصميم النموذج الأوّلي في ظروف حقيقية.","core","B2","COCA"],
  ["tensile strength","noun","قوّة الشدّ","Spider silk has remarkable tensile strength.","يتمتّع حرير العنكبوت بقوّة شدّ ملحوظة.","mastery","C1","COCA"],
  ["energy efficient","adjective","موفّر للطاقة","The design is energy efficient and cost-effective.","التصميم موفّر للطاقة وفعّال من حيث التكلفة.","core","B2","COCA"],
  ["water repellent","adjective","طارد للماء","The lotus-inspired coating is water repellent.","الطلاء المستوحى من زهرة اللوتس طارد للماء.","extended","B2","COCA"],
];

// ─── UNIT 5: Migration ───
const unit5 = [
  ["culturally","adverb","ثقافيًّا","The city is culturally diverse due to immigration.","المدينة متنوّعة ثقافيًّا بفضل الهجرة.","core","B2","AWL"],
  ["socially","adverb","اجتماعيًّا","Immigrants may feel socially isolated at first.","قد يشعر المهاجرون بالعزلة اجتماعيًّا في البداية.","core","B2","AWL"],
  ["economically","adverb","اقتصاديًّا","The country benefited economically from skilled migrants.","استفاد البلد اقتصاديًّا من المهاجرين المهرة.","core","B2","AWL"],
  ["permanently","adverb","بشكل دائم","She settled permanently in Canada after the war.","استقرّت بشكل دائم في كندا بعد الحرب.","core","B2","CEFR-J"],
  ["temporarily","adverb","مؤقّتًا","He was temporarily housed in a shelter.","أُسكن مؤقّتًا في ملجأ.","core","B2","CEFR-J"],
  ["border crossing","noun","معبر حدودي","The border crossing was closed due to security concerns.","أُغلق المعبر الحدودي بسبب مخاوف أمنية.","core","B2","COCA"],
  ["work permit","noun","تصريح عمل","He applied for a work permit to stay legally.","تقدّم بطلب للحصول على تصريح عمل للبقاء بشكل قانوني.","core","B2","CEFR-J"],
  ["green card","noun","البطاقة الخضراء","Receiving a green card grants permanent residency.","يمنح الحصول على البطاقة الخضراء إقامة دائمة.","core","B2","COCA"],
  ["brain drain","noun","هجرة العقول","Brain drain weakens developing countries.","تُضعف هجرة العقول الدول النامية.","extended","B2","COCA"],
  ["chain migration","noun","الهجرة المتسلسلة","Chain migration allows families to reunite over time.","تسمح الهجرة المتسلسلة للعائلات بلمّ شملها بمرور الوقت.","extended","C1","COCA"],
  ["human trafficking","noun","الاتّجار بالبشر","Human trafficking is a serious global crime.","الاتّجار بالبشر جريمة عالمية خطيرة.","core","B2","COCA"],
  ["refugee camp","noun","مخيّم لاجئين","Thousands of displaced people live in the refugee camp.","يعيش آلاف النازحين في مخيّم اللاجئين.","core","B2","COCA"],
  ["safe haven","noun","ملاذ آمن","The embassy served as a safe haven for refugees.","كانت السفارة ملاذًا آمنًا للاجئين.","extended","B2","COCA"],
  ["host country","noun","بلد مضيف","The host country provides basic services to asylum seekers.","يوفّر البلد المضيف خدمات أساسية لطالبي اللجوء.","core","B2","AWL"],
  ["home country","noun","بلد الأصل","Many migrants send money back to their home country.","يرسل كثير من المهاجرين أموالًا إلى بلدهم الأصلي.","core","B1","CEFR-J"],
  ["labor market","noun","سوق العمل","Immigrants contribute to the local labor market.","يساهم المهاجرون في سوق العمل المحلّي.","core","B2","AWL"],
  ["social welfare","noun","الرعاية الاجتماعية","Social welfare programs support low-income families.","تدعم برامج الرعاية الاجتماعية الأسر ذات الدخل المنخفض.","extended","B2","AWL"],
  ["cultural identity","noun","هوية ثقافية","Preserving cultural identity is important for minorities.","الحفاظ على الهوية الثقافية مهمّ للأقليّات.","extended","B2","AWL"],
  ["ethnic group","noun","مجموعة عرقية","The region is home to several ethnic groups.","تضمّ المنطقة عدّة مجموعات عرقية.","core","B2","AWL"],
  ["second generation","noun","الجيل الثاني","Second generation immigrants often speak two languages.","غالبًا ما يتحدّث مهاجرو الجيل الثاني لغتين.","extended","B2","COCA"],
  ["linguistically","adverb","لغويًّا","The community is linguistically diverse.","المجتمع متنوّع لغويًّا.","extended","C1","AWL"],
  ["asylum seeker","noun","طالب لجوء","The asylum seeker filed a claim at the border.","قدّم طالب اللجوء طلبًا عند الحدود.","core","B2","COCA"],
  ["deportation order","noun","أمر ترحيل","The court issued a deportation order against him.","أصدرت المحكمة أمر ترحيل بحقّه.","extended","C1","COCA"],
  ["residence permit","noun","تصريح إقامة","She renewed her residence permit for another year.","جدّدت تصريح إقامتها لسنة أخرى.","core","B2","COCA"],
  ["naturalization process","noun","عملية التجنّس","The naturalization process can take several years.","يمكن أن تستغرق عملية التجنّس عدّة سنوات.","extended","B2","NAWL"],
];

// ─── UNIT 6: Cryptocurrency ───
const unit6 = [
  ["digitally","adverb","رقميًّا","The document was digitally signed for security.","وُقّعت الوثيقة رقميًّا لأغراض الأمان.","core","B2","COCA"],
  ["anonymously","adverb","بشكل مجهول","Users can transact anonymously using cryptocurrency.","يمكن للمستخدمين إجراء المعاملات بشكل مجهول باستخدام العملات المشفّرة.","core","B2","COCA"],
  ["electronically","adverb","إلكترونيًّا","Funds are transferred electronically between banks.","تُحوَّل الأموال إلكترونيًّا بين البنوك.","core","B2","COCA"],
  ["securely","adverb","بشكل آمن","Data must be stored securely to prevent breaches.","يجب تخزين البيانات بشكل آمن لمنع الاختراقات.","core","B2","AWL"],
  ["market value","noun","القيمة السوقية","The market value of Bitcoin fluctuates daily.","تتقلّب القيمة السوقية للبيتكوين يوميًّا.","core","B2","AWL"],
  ["exchange rate","noun","سعر الصرف","The exchange rate between the dollar and euro changed.","تغيّر سعر الصرف بين الدولار واليورو.","core","B2","CEFR-J"],
  ["digital wallet","noun","محفظة رقمية","She stored her cryptocurrency in a digital wallet.","خزّنت عملتها المشفّرة في محفظة رقمية.","core","B2","COCA"],
  ["private key","noun","مفتاح خاصّ","Never share your private key with anyone.","لا تشارك مفتاحك الخاصّ مع أيّ شخص.","extended","B2","COCA"],
  ["public key","noun","مفتاح عامّ","The public key is used to receive transactions.","يُستخدم المفتاح العامّ لتلقّي المعاملات.","extended","B2","COCA"],
  ["trading volume","noun","حجم التداول","Trading volume surged after the announcement.","ارتفع حجم التداول بعد الإعلان.","extended","B2","COCA"],
  ["price index","noun","مؤشّر الأسعار","The price index tracks changes over time.","يتتبّع مؤشّر الأسعار التغيّرات بمرور الوقت.","extended","B2","AWL"],
  ["money laundering","noun","غسل الأموال","Regulators are cracking down on money laundering.","يتشدّد المنظّمون في مكافحة غسل الأموال.","core","B2","COCA"],
  ["capital gains","noun","مكاسب رأسمالية","Investors must pay taxes on capital gains.","يجب على المستثمرين دفع ضرائب على المكاسب الرأسمالية.","extended","C1","AWL"],
  ["risk management","noun","إدارة المخاطر","Risk management is essential in crypto trading.","إدارة المخاطر ضرورية في تداول العملات المشفّرة.","extended","B2","AWL"],
  ["initial offering","noun","طرح أوّلي","The company raised millions through its initial offering.","جمعت الشركة ملايين من خلال طرحها الأوّلي.","extended","C1","AWL"],
  ["smart contract","noun","عقد ذكي","A smart contract executes automatically when conditions are met.","يُنفَّذ العقد الذكي تلقائيًّا عند استيفاء الشروط.","core","B2","COCA"],
  ["gas fee","noun","رسوم الغاز","High gas fees make small transactions unprofitable.","تجعل رسوم الغاز المرتفعة المعاملات الصغيرة غير مربحة.","extended","B2","COCA"],
  ["block reward","noun","مكافأة الكتلة","Miners earn a block reward for validating transactions.","يكسب المعدّنون مكافأة الكتلة مقابل التحقّق من المعاملات.","mastery","C1","COCA"],
  ["hash rate","noun","معدّل التجزئة","A higher hash rate means greater mining power.","يعني معدّل التجزئة الأعلى قوّة تعدين أكبر.","mastery","C1","COCA"],
  ["decentralized","adjective","لا مركزي","Bitcoin operates on a decentralized network.","يعمل البيتكوين على شبكة لا مركزية.","core","B2","COCA"],
  ["transaction fee","noun","رسوم المعاملة","The transaction fee depends on network congestion.","تعتمد رسوم المعاملة على ازدحام الشبكة.","core","B2","COCA"],
  ["market cap","noun","القيمة السوقية الإجمالية","The total market cap of crypto exceeded two trillion.","تجاوزت القيمة السوقية الإجمالية للعملات المشفّرة تريليونين.","extended","B2","COCA"],
  ["proof of work","noun","إثبات العمل","Proof of work requires miners to solve complex puzzles.","يتطلّب إثبات العمل من المعدّنين حلّ ألغاز معقّدة.","extended","C1","COCA"],
  ["staking reward","noun","مكافأة التخزين","Users earn a staking reward by locking their tokens.","يكسب المستخدمون مكافأة التخزين بقفل رموزهم.","mastery","C1","COCA"],
];

// ─── UNIT 7: Crowd Psychology ───
const unit7 = [
  ["collectively","adverb","جماعيًّا","The team collectively decided to protest.","قرّر الفريق جماعيًّا الاحتجاج.","core","B2","AWL"],
  ["psychologically","adverb","نفسيًّا","The isolation affected her psychologically.","أثّرت العزلة عليها نفسيًّا.","extended","B2","AWL"],
  ["emotionally","adverb","عاطفيًّا","The speech moved the audience emotionally.","حرّك الخطاب الجمهور عاطفيًّا.","core","B2","CEFR-J"],
  ["subconsciously","adverb","لاشعوريًّا","People subconsciously mimic the behavior of those around them.","يقلّد الناس لاشعوريًّا سلوك من حولهم.","extended","C1","COCA"],
  ["peer pressure","noun","ضغط الأقران","Peer pressure can influence teenagers to make poor choices.","يمكن لضغط الأقران أن يدفع المراهقين لاتّخاذ خيارات سيّئة.","core","B2","COCA"],
  ["mob mentality","noun","عقلية القطيع","Mob mentality can lead people to act irrationally.","يمكن لعقلية القطيع أن تدفع الناس للتصرّف بشكل غير عقلاني.","extended","B2","COCA"],
  ["group dynamics","noun","ديناميكيات الجماعة","Understanding group dynamics is key to effective leadership.","فهم ديناميكيات الجماعة أساسي للقيادة الفعّالة.","extended","B2","AWL"],
  ["social norm","noun","معيار اجتماعي","Wearing a suit to work is a social norm in some cultures.","ارتداء بدلة في العمل معيار اجتماعي في بعض الثقافات.","core","B2","AWL"],
  ["public opinion","noun","الرأي العامّ","Public opinion shifted after the scandal.","تغيّر الرأي العامّ بعد الفضيحة.","core","B2","COCA"],
  ["mass media","noun","وسائل الإعلام الجماهيرية","Mass media shapes how people view the world.","تشكّل وسائل الإعلام الجماهيرية نظرة الناس إلى العالم.","core","B2","COCA"],
  ["echo chamber","noun","غرفة الصدى","Social media can create an echo chamber of similar opinions.","يمكن لوسائل التواصل الاجتماعي أن تخلق غرفة صدى لآراء متشابهة.","extended","B2","COCA"],
  ["filter bubble","noun","فقاعة التصفية","A filter bubble limits the diversity of information you see.","تحدّ فقاعة التصفية من تنوّع المعلومات التي تراها.","extended","C1","COCA"],
  ["confirmation bias","noun","تحيّز التأكيد","Confirmation bias makes people seek information that supports their beliefs.","يدفع تحيّز التأكيد الناس للبحث عن معلومات تدعم معتقداتهم.","extended","B2","COCA"],
  ["herd instinct","noun","غريزة القطيع","Herd instinct drives panic buying during crises.","تدفع غريزة القطيع الشراء بدافع الذعر أثناء الأزمات.","extended","C1","COCA"],
  ["tipping point","noun","نقطة التحوّل","The protest reached a tipping point when thousands joined.","وصل الاحتجاج إلى نقطة تحوّل عندما انضمّ الآلاف.","core","B2","COCA"],
  ["power struggle","noun","صراع على السلطة","A power struggle erupted within the ruling party.","اندلع صراع على السلطة داخل الحزب الحاكم.","core","B2","COCA"],
  ["civil unrest","noun","اضطرابات مدنية","Civil unrest spread to several cities overnight.","انتشرت الاضطرابات المدنية إلى عدّة مدن خلال الليل.","extended","B2","COCA"],
  ["public outcry","noun","احتجاج شعبي","The decision triggered a public outcry from citizens.","أثار القرار احتجاجًا شعبيًّا من المواطنين.","extended","B2","COCA"],
  ["social movement","noun","حركة اجتماعية","The civil rights era was a powerful social movement.","كانت حقبة الحقوق المدنية حركة اجتماعية قوية.","core","B2","AWL"],
  ["unconsciously","adverb","بشكل غير واعٍ","People unconsciously adopt the accent of those around them.","يتبنّى الناس بشكل غير واعٍ لهجة من حولهم.","extended","B2","COCA"],
  ["bystander effect","noun","تأثير المتفرّج","The bystander effect explains why crowds often fail to help.","يفسّر تأثير المتفرّج لماذا تفشل الحشود غالبًا في تقديم المساعدة.","extended","B2","COCA"],
  ["groupthink","noun","التفكير الجماعي","Groupthink can lead to disastrous decisions.","يمكن أن يؤدّي التفكير الجماعي إلى قرارات كارثية.","extended","C1","COCA"],
  ["crowd control","noun","السيطرة على الحشود","Police used barriers for crowd control at the event.","استخدمت الشرطة حواجز للسيطرة على الحشود في الحدث.","core","B2","COCA"],
  ["social influence","noun","تأثير اجتماعي","Social influence shapes consumer behavior significantly.","يشكّل التأثير الاجتماعي سلوك المستهلك بشكل كبير.","extended","B2","AWL"],
];

// ─── UNIT 8: Forensic Science ───
const unit8 = [
  ["forensically","adverb","جنائيًّا","The evidence was forensically examined in the lab.","فُحصت الأدلّة جنائيًّا في المختبر.","extended","C1","COCA"],
  ["circumstantially","adverb","ظرفيًّا","The case was only circumstantially supported.","لم تكن القضية مدعومة إلّا ظرفيًّا.","mastery","C1","COCA"],
  ["conclusively","adverb","بشكل قاطع","The DNA test conclusively identified the suspect.","حدّد فحص الحمض النووي المشتبه به بشكل قاطع.","extended","B2","AWL"],
  ["legally","adverb","قانونيًّا","The evidence must be legally obtained to be admissible.","يجب أن تكون الأدلّة محصّلة قانونيًّا لتكون مقبولة.","core","B2","AWL"],
  ["crime scene","noun","مسرح الجريمة","Detectives sealed off the crime scene immediately.","أغلق المحقّقون مسرح الجريمة فورًا.","core","B2","COCA"],
  ["blood splatter","noun","رذاذ الدم","The blood splatter pattern helped reconstruct the attack.","ساعد نمط رذاذ الدم في إعادة بناء تفاصيل الهجوم.","extended","C1","COCA"],
  ["chain of custody","noun","سلسلة الحفظ","A break in the chain of custody can invalidate evidence.","يمكن أن يُبطل انقطاع سلسلة الحفظ الأدلّة.","extended","C1","COCA"],
  ["cause of death","noun","سبب الوفاة","The autopsy revealed the cause of death.","كشف التشريح عن سبب الوفاة.","core","B2","COCA"],
  ["time of death","noun","وقت الوفاة","Forensic experts estimated the time of death.","قدّر خبراء الطبّ الشرعي وقت الوفاة.","core","B2","COCA"],
  ["cold case","noun","قضية قديمة مفتوحة","New DNA technology helped solve the cold case.","ساعدت تقنية الحمض النووي الجديدة في حلّ القضية القديمة.","core","B2","COCA"],
  ["eye witness","noun","شاهد عيان","The eye witness described the suspect in detail.","وصف شاهد العيان المشتبه به بالتفصيل.","core","B1","CEFR-J"],
  ["lie detector","noun","جهاز كشف الكذب","The suspect agreed to take a lie detector test.","وافق المشتبه به على الخضوع لاختبار جهاز كشف الكذب.","core","B2","COCA"],
  ["DNA profiling","noun","تحديد البصمة الوراثية","DNA profiling has revolutionized criminal investigations.","أحدث تحديد البصمة الوراثية ثورة في التحقيقات الجنائية.","extended","B2","COCA"],
  ["blood type","noun","فصيلة الدم","The victim's blood type matched the sample found at the scene.","تطابقت فصيلة دم الضحيّة مع العيّنة الموجودة في مسرح الجريمة.","core","B1","CEFR-J"],
  ["finger mark","noun","بصمة إصبع","A single finger mark on the glass led to the arrest.","أدّت بصمة إصبع واحدة على الزجاج إلى القبض عليه.","core","B2","COCA"],
  ["bullet wound","noun","جرح رصاصة","The doctor treated the bullet wound in the emergency room.","عالج الطبيب جرح الرصاصة في غرفة الطوارئ.","core","B2","COCA"],
  ["body language","noun","لغة الجسد","Investigators studied the suspect's body language closely.","درس المحقّقون لغة جسد المشتبه به عن كثب.","core","B1","CEFR-J"],
  ["criminal record","noun","سجلّ جنائي","A criminal record can affect future job opportunities.","يمكن أن يؤثّر السجلّ الجنائي على فرص العمل المستقبلية.","core","B2","COCA"],
  ["court order","noun","أمر محكمة","The police obtained a court order to search the house.","حصلت الشرطة على أمر محكمة لتفتيش المنزل.","core","B2","COCA"],
  ["toxicologically","adverb","سُمّيًّا","The substance was toxicologically analyzed.","حُلّلت المادّة سُمّيًّا.","mastery","C1","COCA"],
  ["autopsy report","noun","تقرير التشريح","The autopsy report revealed traces of poison.","كشف تقرير التشريح عن آثار سمّ.","extended","B2","COCA"],
  ["crime lab","noun","مختبر جنائي","The evidence was sent to the crime lab for analysis.","أُرسلت الأدلّة إلى المختبر الجنائي للتحليل.","core","B2","COCA"],
  ["witness statement","noun","شهادة شاهد","The witness statement contradicted the suspect's alibi.","تناقضت شهادة الشاهد مع حجّة المشتبه به.","core","B2","COCA"],
  ["ballistic evidence","noun","دليل باليستي","Ballistic evidence linked the gun to the crime.","ربط الدليل الباليستي السلاح بالجريمة.","extended","C1","COCA"],
  ["forensic pathologist","noun","طبيب شرعي","The forensic pathologist examined the remains carefully.","فحص الطبيب الشرعي الرفات بعناية.","extended","C1","COCA"],
];

// ─── UNIT 9: Archaeology ───
const unit9 = [
  ["archaeologically","adverb","أثريًّا","The site is archaeologically significant.","الموقع مهمّ أثريًّا.","mastery","C1","COCA"],
  ["historically","adverb","تاريخيًّا","Historically, this region was a trading hub.","تاريخيًّا، كانت هذه المنطقة مركزًا تجاريًّا.","core","B2","AWL"],
  ["geographically","adverb","جغرافيًّا","The two civilizations were geographically isolated.","كانت الحضارتان معزولتين جغرافيًّا.","core","B2","AWL"],
  ["chronologically","adverb","زمنيًّا","The artifacts are arranged chronologically in the museum.","رُتّبت القطع الأثرية زمنيًّا في المتحف.","extended","B2","AWL"],
  ["stone age","noun","العصر الحجري","Stone age tools were discovered in the cave.","اكتُشفت أدوات من العصر الحجري في الكهف.","core","B1","CEFR-J"],
  ["bronze age","noun","العصر البرونزي","The bronze age saw advances in metalworking.","شهد العصر البرونزي تطوّرات في صناعة المعادن.","core","B2","COCA"],
  ["iron age","noun","العصر الحديدي","Iron age settlements have been found across Europe.","عُثر على مستوطنات من العصر الحديدي في أنحاء أوروبا.","core","B2","COCA"],
  ["ice age","noun","العصر الجليدي","Woolly mammoths lived during the last ice age.","عاشت الماموث الصوفية خلال العصر الجليدي الأخير.","core","B1","CEFR-J"],
  ["burial site","noun","موقع دفن","Archaeologists uncovered an ancient burial site.","اكتشف علماء الآثار موقع دفن قديمًا.","extended","B2","COCA"],
  ["cave painting","noun","رسم كهفي","The cave painting dates back 30,000 years.","يعود الرسم الكهفي إلى 30,000 سنة.","core","B2","COCA"],
  ["carbon dating","noun","التأريخ بالكربون","Carbon dating confirmed the skeleton's age.","أكّد التأريخ بالكربون عمر الهيكل العظمي.","extended","B2","COCA"],
  ["pottery shard","noun","شقفة فخّار","A pottery shard revealed details about ancient trade.","كشفت شقفة فخّار عن تفاصيل حول التجارة القديمة.","extended","B2","COCA"],
  ["burial chamber","noun","غرفة دفن","The burial chamber contained gold jewelry and weapons.","احتوت غرفة الدفن على مجوهرات ذهبية وأسلحة.","extended","B2","COCA"],
  ["city state","noun","دولة المدينة","Athens was a powerful city state in ancient Greece.","كانت أثينا دولة مدينة قوية في اليونان القديمة.","core","B2","COCA"],
  ["trade route","noun","طريق تجاري","The Silk Road was the most famous trade route.","كان طريق الحرير أشهر طريق تجاري.","core","B2","COCA"],
  ["ancient ruins","noun","أطلال قديمة","Tourists flock to see the ancient ruins every summer.","يتدفّق السيّاح لرؤية الأطلال القديمة كلّ صيف.","core","B2","COCA"],
  ["sacred site","noun","موقع مقدّس","The temple is considered a sacred site by locals.","يُعتبر المعبد موقعًا مقدّسًا من قبل السكّان المحليّين.","extended","B2","COCA"],
  ["clay tablet","noun","لوح طيني","The clay tablet bore early cuneiform writing.","حمل اللوح الطيني كتابة مسمارية مبكّرة.","extended","B2","COCA"],
  ["writing system","noun","نظام كتابة","The Sumerians developed one of the first writing systems.","طوّر السومريون أحد أوائل أنظمة الكتابة.","core","B2","COCA"],
  ["stratigraphically","adverb","طبقيًّا","The layers were stratigraphically examined.","فُحصت الطبقات طبقيًّا.","mastery","C1","COCA"],
  ["excavation site","noun","موقع تنقيب","The excavation site revealed a Roman villa.","كشف موقع التنقيب عن فيلّا رومانية.","extended","B2","COCA"],
  ["fossil record","noun","سجلّ أحفوري","The fossil record shows the evolution of early mammals.","يُظهر السجلّ الأحفوري تطوّر الثدييّات المبكّرة.","extended","B2","COCA"],
  ["artifact collection","noun","مجموعة قطع أثرية","The museum expanded its artifact collection last year.","وسّع المتحف مجموعة القطع الأثرية العام الماضي.","core","B2","COCA"],
  ["ancient civilization","noun","حضارة قديمة","Mesopotamia was one of the earliest ancient civilizations.","كانت بلاد ما بين النهرين من أقدم الحضارات القديمة.","core","B2","COCA"],
  ["stone carving","noun","نقش حجري","The stone carving depicted a hunting scene.","صوّر النقش الحجري مشهد صيد.","core","B2","COCA"],
];

// ─── UNIT 10: Longevity ───
const unit10 = [
  ["biologically","adverb","بيولوجيًّا","She is biologically younger than her actual age.","هي أصغر بيولوجيًّا من عمرها الحقيقي.","extended","B2","COCA"],
  ["chronically","adverb","بشكل مزمن","He has been chronically ill for several years.","يعاني من مرض مزمن منذ عدّة سنوات.","core","B2","COCA"],
  ["genetically","adverb","وراثيًّا","Some people are genetically predisposed to heart disease.","بعض الأشخاص لديهم استعداد وراثي لأمراض القلب.","core","B2","COCA"],
  ["nutritionally","adverb","من الناحية الغذائية","The meal is nutritionally balanced for all age groups.","الوجبة متوازنة من الناحية الغذائية لجميع الفئات العمرية.","extended","B2","COCA"],
  ["life span","noun","مدّة الحياة","The average human life span has increased over centuries.","زاد متوسّط مدّة حياة الإنسان على مرّ القرون.","core","B2","COCA"],
  ["aging process","noun","عملية الشيخوخة","Exercise can slow the aging process significantly.","يمكن للتمارين أن تبطئ عملية الشيخوخة بشكل ملحوظ.","core","B2","COCA"],
  ["blood pressure","noun","ضغط الدم","High blood pressure increases the risk of stroke.","يزيد ارتفاع ضغط الدم من خطر السكتة الدماغية.","core","B1","CEFR-J"],
  ["heart rate","noun","معدّل ضربات القلب","Your heart rate rises during physical activity.","يرتفع معدّل ضربات قلبك أثناء النشاط البدني.","core","B1","CEFR-J"],
  ["body mass","noun","كتلة الجسم","Body mass index is used to assess healthy weight.","يُستخدم مؤشّر كتلة الجسم لتقييم الوزن الصحّي.","core","B2","COCA"],
  ["immune system","noun","جهاز المناعة","A strong immune system helps prevent chronic illness.","يساعد جهاز المناعة القويّ في الوقاية من الأمراض المزمنة.","core","B1","CEFR-J"],
  ["bone density","noun","كثافة العظام","Calcium helps maintain bone density as you age.","يساعد الكالسيوم في الحفاظ على كثافة العظام مع التقدّم في العمر.","extended","B2","COCA"],
  ["muscle mass","noun","كتلة عضلية","Resistance training helps preserve muscle mass.","يساعد التدريب بالمقاومة في الحفاظ على الكتلة العضلية.","core","B2","COCA"],
  ["blood sugar","noun","سكّر الدم","Monitoring blood sugar is vital for diabetic patients.","مراقبة سكّر الدم أمر حيوي لمرضى السكّري.","core","B1","CEFR-J"],
  ["cell division","noun","انقسام الخلايا","Errors in cell division can lead to cancer.","يمكن أن تؤدّي أخطاء في انقسام الخلايا إلى السرطان.","extended","B2","COCA"],
  ["gene expression","noun","التعبير الجيني","Diet can influence gene expression over time.","يمكن للنظام الغذائي أن يؤثّر في التعبير الجيني بمرور الوقت.","mastery","C1","COCA"],
  ["growth hormone","noun","هرمون النموّ","Growth hormone levels decline with age.","تنخفض مستويات هرمون النموّ مع التقدّم في العمر.","extended","B2","COCA"],
  ["stress level","noun","مستوى التوتّر","High stress levels can shorten your life span.","يمكن أن تقصّر مستويات التوتّر المرتفعة مدّة حياتك.","core","B2","COCA"],
  ["sleep cycle","noun","دورة النوم","Disrupting your sleep cycle affects overall health.","يؤثّر اضطراب دورة النوم على الصحّة العامّة.","core","B2","COCA"],
  ["mental health","noun","صحّة نفسية","Mental health is as important as physical health.","الصحّة النفسية لا تقلّ أهمّية عن الصحّة الجسدية.","core","B1","CEFR-J"],
  ["metabolically","adverb","أيضيًّا","Children are metabolically more active than adults.","الأطفال أكثر نشاطًا أيضيًّا من البالغين.","extended","C1","COCA"],
  ["cognitive decline","noun","تراجع إدراكي","Regular exercise helps prevent cognitive decline.","تساعد التمارين المنتظمة في منع التراجع الإدراكي.","extended","B2","COCA"],
  ["calorie intake","noun","استهلاك السعرات","Reducing calorie intake can extend life expectancy.","يمكن لتقليل استهلاك السعرات أن يطيل العمر المتوقّع.","core","B2","COCA"],
  ["life expectancy","noun","متوسّط العمر المتوقّع","Life expectancy has risen dramatically in the last century.","ارتفع متوسّط العمر المتوقّع بشكل كبير في القرن الأخير.","core","B2","AWL"],
  ["antioxidant rich","adjective","غنيّ بمضادّات الأكسدة","Berries are antioxidant rich and protect cells from damage.","التوت غنيّ بمضادّات الأكسدة ويحمي الخلايا من التلف.","extended","B2","COCA"],
  ["telomere length","noun","طول التيلومير","Shorter telomere length is associated with aging.","يرتبط قصر طول التيلومير بالشيخوخة.","mastery","C1","COCA"],
];

// ─── UNIT 11: Sustainable Architecture ───
const unit11 = [
  ["sustainably","adverb","بشكل مستدام","The building was sustainably designed using recycled materials.","صُمّم المبنى بشكل مستدام باستخدام مواد معاد تدويرها.","extended","B2","AWL"],
  ["thermally","adverb","حراريًّا","The walls are thermally insulated to save energy.","الجدران معزولة حراريًّا لتوفير الطاقة.","extended","C1","COCA"],
  ["structurally","adverb","إنشائيًّا","The renovation made the house structurally safer.","جعل التجديد المنزل أكثر أمانًا إنشائيًّا.","extended","B2","AWL"],
  ["environmentally","adverb","بيئيًّا","The project is environmentally friendly from start to finish.","المشروع صديق للبيئة من البداية إلى النهاية.","core","B2","AWL"],
  ["solar panel","noun","لوح شمسي","Solar panels on the roof generate clean electricity.","تولّد الألواح الشمسية على السطح كهرباء نظيفة.","core","B2","COCA"],
  ["wind turbine","noun","توربين رياح","A single wind turbine can power hundreds of homes.","يمكن لتوربين رياح واحد تزويد مئات المنازل بالطاقة.","core","B2","COCA"],
  ["heat pump","noun","مضخّة حرارية","The heat pump warms the house efficiently in winter.","تدفّئ المضخّة الحرارية المنزل بكفاءة في الشتاء.","extended","B2","COCA"],
  ["green roof","noun","سطح أخضر","A green roof helps reduce urban heat and absorb rainwater.","يساعد السطح الأخضر في تقليل حرارة المدينة وامتصاص مياه الأمطار.","extended","B2","COCA"],
  ["building material","noun","مادّة بناء","Bamboo is a sustainable building material.","الخيزران مادّة بناء مستدامة.","core","B1","CEFR-J"],
  ["energy rating","noun","تصنيف الطاقة","The apartment has a high energy rating.","تتمتّع الشقّة بتصنيف طاقة مرتفع.","core","B2","COCA"],
  ["carbon neutral","adjective","محايد الكربون","The company aims to be carbon neutral by 2030.","تهدف الشركة لأن تكون محايدة الكربون بحلول 2030.","extended","B2","COCA"],
  ["zero waste","adjective","خالٍ من النفايات","The architect promoted a zero waste construction approach.","روّج المهندس المعماري لنهج بناء خالٍ من النفايات.","extended","B2","COCA"],
  ["rain garden","noun","حديقة مطرية","The rain garden collects and filters stormwater naturally.","تجمع الحديقة المطرية مياه العواصف وتصفّيها طبيعيًّا.","extended","C1","COCA"],
  ["floor plan","noun","مخطّط الطابق","The floor plan shows the layout of every room.","يُظهر مخطّط الطابق تصميم كلّ غرفة.","core","B2","CEFR-J"],
  ["cross ventilation","noun","تهوية متقاطعة","Cross ventilation reduces the need for air conditioning.","تقلّل التهوية المتقاطعة الحاجة إلى تكييف الهواء.","extended","C1","COCA"],
  ["natural light","noun","إضاءة طبيعية","Large windows allow natural light to fill the space.","تسمح النوافذ الكبيرة للإضاءة الطبيعية بملء المساحة.","core","B1","CEFR-J"],
  ["building envelope","noun","غلاف المبنى","The building envelope prevents heat loss in cold weather.","يمنع غلاف المبنى فقدان الحرارة في الطقس البارد.","mastery","C1","COCA"],
  ["load bearing","adjective","حامل للأحمال","Do not remove load bearing walls without an engineer's advice.","لا تزل الجدران الحاملة للأحمال بدون مشورة مهندس.","extended","B2","COCA"],
  ["fire resistant","adjective","مقاوم للحريق","The building uses fire resistant materials throughout.","يستخدم المبنى مواد مقاومة للحريق في جميع أنحائه.","core","B2","COCA"],
  ["acoustically","adverb","صوتيًّا","The concert hall was acoustically designed for clarity.","صُمّمت قاعة الحفلات صوتيًّا لتحقيق الوضوح.","extended","C1","COCA"],
  ["passive cooling","noun","تبريد سلبي","Passive cooling reduces the need for electricity.","يقلّل التبريد السلبي الحاجة إلى الكهرباء.","extended","B2","COCA"],
  ["recycled material","noun","مادّة معاد تدويرها","The wall was built from recycled material.","بُني الجدار من مادّة معاد تدويرها.","core","B2","COCA"],
  ["energy audit","noun","تدقيق الطاقة","An energy audit identified areas of heat loss.","حدّد تدقيق الطاقة مناطق فقدان الحرارة.","extended","B2","NAWL"],
  ["insulation layer","noun","طبقة عزل","An extra insulation layer was added to the roof.","أُضيفت طبقة عزل إضافية إلى السطح.","core","B2","COCA"],
  ["ground source","adjective","مصدر أرضي","A ground source heat pump uses geothermal energy.","تستخدم مضخّة الحرارة ذات المصدر الأرضي الطاقة الحرارية الجوفية.","extended","C1","COCA"],
];

// ─── UNIT 12: Exoplanets ───
const unit12 = [
  ["astronomically","adverb","فلكيًّا","The distances between galaxies are astronomically vast.","المسافات بين المجرّات هائلة فلكيًّا.","extended","B2","COCA"],
  ["gravitationally","adverb","بفعل الجاذبية","The moon is gravitationally bound to Earth.","القمر مرتبط بالأرض بفعل الجاذبية.","mastery","C1","COCA"],
  ["atmospherically","adverb","من حيث الغلاف الجوّي","The planet is atmospherically similar to Earth.","الكوكب مشابه للأرض من حيث الغلاف الجوّي.","mastery","C1","COCA"],
  ["orbitally","adverb","مداريًّا","The satellite is orbitally stable at that altitude.","القمر الاصطناعي مستقرّ مداريًّا عند ذلك الارتفاع.","mastery","C1","COCA"],
  ["solar system","noun","نظام شمسي","Our solar system has eight known planets.","يحتوي نظامنا الشمسي على ثمانية كواكب معروفة.","core","B1","CEFR-J"],
  ["light year","noun","سنة ضوئية","The nearest star is about four light years away.","يبعد أقرب نجم حوالي أربع سنوات ضوئية.","core","B2","COCA"],
  ["space shuttle","noun","مكّوك فضائي","The space shuttle carried astronauts to the station.","نقل المكّوك الفضائي روّاد الفضاء إلى المحطّة.","core","B1","CEFR-J"],
  ["launch pad","noun","منصّة إطلاق","The rocket lifted off from the launch pad at dawn.","انطلق الصاروخ من منصّة الإطلاق عند الفجر.","core","B2","COCA"],
  ["control room","noun","غرفة التحكّم","Engineers in the control room monitored every stage.","راقب المهندسون في غرفة التحكّم كلّ مرحلة.","core","B2","COCA"],
  ["flight path","noun","مسار الرحلة","The flight path was adjusted to avoid debris.","عُدّل مسار الرحلة لتجنّب الحطام.","core","B2","COCA"],
  ["escape velocity","noun","سرعة الإفلات","A rocket must reach escape velocity to leave Earth.","يجب أن يبلغ الصاروخ سرعة الإفلات لمغادرة الأرض.","extended","B2","COCA"],
  ["radio signal","noun","إشارة لاسلكية","Scientists detected a radio signal from deep space.","رصد العلماء إشارة لاسلكية من أعماق الفضاء.","core","B2","COCA"],
  ["space debris","noun","حطام فضائي","Space debris poses a threat to active satellites.","يشكّل الحطام الفضائي تهديدًا للأقمار الاصطناعية النشطة.","extended","B2","COCA"],
  ["dark matter","noun","المادّة المظلمة","Dark matter makes up most of the universe's mass.","تشكّل المادّة المظلمة معظم كتلة الكون.","extended","B2","COCA"],
  ["dark energy","noun","الطاقة المظلمة","Dark energy is causing the universe to expand faster.","تتسبّب الطاقة المظلمة في تسارع توسّع الكون.","extended","C1","COCA"],
  ["red dwarf","noun","قزم أحمر","A red dwarf is cooler and dimmer than the Sun.","القزم الأحمر أبرد وأخفت من الشمس.","extended","B2","COCA"],
  ["white dwarf","noun","قزم أبيض","A white dwarf is the remnant of a dead star.","القزم الأبيض هو بقايا نجم ميّت.","extended","B2","COCA"],
  ["gas giant","noun","عملاق غازي","Jupiter is the largest gas giant in our solar system.","المشتري هو أكبر عملاق غازي في نظامنا الشمسي.","core","B2","COCA"],
  ["rocky planet","noun","كوكب صخري","Earth is classified as a rocky planet.","تُصنَّف الأرض ككوكب صخري.","core","B2","COCA"],
  ["spectroscopically","adverb","بالتحليل الطيفي","The star was spectroscopically analyzed for composition.","حُلّل النجم بالتحليل الطيفي لمعرفة تركيبه.","mastery","C1","COCA"],
  ["habitable zone","noun","منطقة صالحة للحياة","The planet orbits within the habitable zone.","يدور الكوكب ضمن المنطقة الصالحة للحياة.","extended","B2","COCA"],
  ["gravitational pull","noun","جاذبية","The moon's gravitational pull causes ocean tides.","تسبّب جاذبية القمر المدّ والجزر في المحيطات.","core","B2","COCA"],
  ["space probe","noun","مسبار فضائي","The space probe sent back images of Mars.","أرسل المسبار الفضائي صورًا للمرّيخ.","core","B2","COCA"],
  ["binary star","noun","نجم ثنائي","A binary star system consists of two stars orbiting each other.","يتكوّن نظام النجم الثنائي من نجمين يدوران حول بعضهما.","extended","C1","COCA"],
  ["magnetic field","noun","حقل مغناطيسي","Earth's magnetic field protects us from solar radiation.","يحمينا الحقل المغناطيسي للأرض من الإشعاع الشمسي.","core","B2","COCA"],
];

async function main() {
  const client = await pool.connect();
  const batchId = 21;

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
  let totalWords = 0;

  try {
    for (const u of units) {
      const count = await insertBatch(client, u.data, u.num, batchId);
      console.log(`Unit ${u.num}: inserted ${count}/${u.data.length}`);
      totalInserted += count;
      totalWords += u.data.length;
    }
    console.log(`\n=== BATCH SUMMARY ===`);
    console.log(`Total words attempted: ${totalWords}`);
    console.log(`Total inserted: ${totalInserted}`);

    // Query final counts per unit
    console.log(`\n=== DB TOTALS (batch_id=${batchId}) ===`);
    const res = await client.query(
      `SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [batchId]
    );
    let dbTotal = 0;
    for (const row of res.rows) {
      console.log(`Unit ${row.recommended_unit}: ${row.cnt} rows`);
      dbTotal += parseInt(row.cnt);
    }
    console.log(`Overall DB total for batch ${batchId}: ${dbTotal}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
