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
    } catch (e) { console.error(`Error "${w[0]}":`, e.message); }
  }
  return inserted;
}

// ============ UNIT 1: Bioethics ============
const unit1 = [
  ['splice', 'verb', 'يربط أو يدمج أجزاء من الحمض النووي', 'Scientists splice genes to create disease-resistant crops.', 'يربط العلماء الجينات لإنتاج محاصيل مقاومة للأمراض.', 'extended', 'C1', 'COCA'],
  ['replicate', 'verb', 'ينسخ أو يكرر بدقة', 'The virus can replicate itself millions of times within hours.', 'يمكن للفيروس أن ينسخ نفسه ملايين المرات خلال ساعات.', 'core', 'B2', 'AWL'],
  ['mutate', 'verb', 'يتحول جينياً أو يتغير', 'Cells can mutate when exposed to radiation.', 'يمكن أن تتحول الخلايا عند تعرضها للإشعاع.', 'extended', 'B2', 'COCA'],
  ['clone', 'verb', 'يستنسخ كائناً حياً مطابقاً', 'Researchers managed to clone the sheep successfully.', 'تمكن الباحثون من استنساخ الخروف بنجاح.', 'core', 'B2', 'COCA'],
  ['synthesize', 'verb', 'يركّب أو يصنع مادة كيميائياً', 'Chemists synthesize new drugs in the laboratory.', 'يركّب الكيميائيون أدوية جديدة في المختبر.', 'core', 'B2', 'AWL'],
  ['implant', 'verb', 'يزرع جهازاً أو نسيجاً في الجسم', 'Doctors implant a pacemaker to regulate the heartbeat.', 'يزرع الأطباء جهاز تنظيم ضربات القلب لتنظيم النبض.', 'core', 'B2', 'COCA'],
  ['modify', 'verb', 'يعدّل أو يغيّر جزئياً', 'They modify the organism to improve its resistance.', 'يعدّلون الكائن الحي لتحسين مقاومته.', 'core', 'B1', 'AWL'],
  ['screen', 'verb', 'يفحص أو يجري فحصاً طبياً', 'Hospitals screen newborns for genetic disorders.', 'تفحص المستشفيات حديثي الولادة بحثاً عن اضطرابات جينية.', 'core', 'B2', 'COCA'],
  ['consent', 'verb', 'يوافق أو يمنح الإذن', 'Patients must consent before any experimental treatment.', 'يجب أن يوافق المرضى قبل أي علاج تجريبي.', 'core', 'B2', 'AWL'],
  ['prohibit', 'verb', 'يحظر أو يمنع رسمياً', 'Many countries prohibit human cloning experiments.', 'تحظر دول كثيرة تجارب استنساخ البشر.', 'core', 'B2', 'AWL'],
  ['transplant', 'verb', 'يزرع عضواً أو نسيجاً من جسم لآخر', 'Surgeons transplant kidneys from living donors.', 'يزرع الجراحون الكلى من متبرعين أحياء.', 'core', 'B2', 'COCA'],
  ['crossbreed', 'verb', 'يهجّن بين سلالتين مختلفتين', 'Farmers crossbreed cattle to produce stronger livestock.', 'يهجّن المزارعون الماشية لإنتاج حيوانات أقوى.', 'extended', 'C1', 'COCA'],
  ['regulate', 'verb', 'ينظّم أو يضبط بقوانين', 'Governments regulate genetic research strictly.', 'تنظّم الحكومات الأبحاث الجينية بصرامة.', 'core', 'B2', 'AWL'],
  ['advocate', 'verb', 'يدافع عن أو يناصر', 'Many scientists advocate for ethical gene editing.', 'يدافع كثير من العلماء عن التعديل الجيني الأخلاقي.', 'core', 'B2', 'AWL'],
  ['manipulate', 'verb', 'يتلاعب بشيء أو يعالجه يدوياً', 'Researchers manipulate DNA sequences with precision.', 'يتلاعب الباحثون بتسلسلات الحمض النووي بدقة.', 'core', 'B2', 'AWL'],
  ['override', 'verb', 'يتجاوز أو يُبطل قراراً', 'The committee can override the previous ruling on stem cells.', 'يمكن للجنة أن تتجاوز القرار السابق بشأن الخلايا الجذعية.', 'extended', 'B2', 'COCA'],
  ['prescribe', 'verb', 'يصف دواءً أو علاجاً', 'Doctors prescribe gene therapy for rare diseases.', 'يصف الأطباء العلاج الجيني للأمراض النادرة.', 'core', 'B2', 'COCA'],
  ['diagnose', 'verb', 'يشخّص مرضاً أو حالة', 'Genetic tests help diagnose hereditary conditions early.', 'تساعد الاختبارات الجينية في تشخيص الحالات الوراثية مبكراً.', 'core', 'B2', 'COCA'],
  ['immunize', 'verb', 'يُحصّن ضد مرض', 'Programs aim to immunize children against common diseases.', 'تهدف البرامج إلى تحصين الأطفال ضد الأمراض الشائعة.', 'extended', 'B2', 'COCA'],
  ['infect', 'verb', 'يُعدي أو ينقل عدوى', 'The virus can infect healthy cells rapidly.', 'يمكن للفيروس أن يعدي الخلايا السليمة بسرعة.', 'core', 'B1', 'COCA'],
  ['sterilize', 'verb', 'يعقّم أو يطهّر من الجراثيم', 'Labs must sterilize equipment before each experiment.', 'يجب على المختبرات تعقيم المعدات قبل كل تجربة.', 'extended', 'B2', 'COCA'],
  ['vaccinate', 'verb', 'يُلقّح ضد مرض معين', 'Health workers vaccinate thousands during outbreaks.', 'يلقّح العاملون الصحيون آلاف الأشخاص أثناء تفشي الأمراض.', 'core', 'B2', 'COCA'],
  ['inoculate', 'verb', 'يُلقّح أو يُطعّم بمصل وقائي', 'They inoculate the population to prevent epidemics.', 'يلقّحون السكان لمنع الأوبئة.', 'mastery', 'C1', 'COCA'],
  ['incubate', 'verb', 'يحتضن أو يحفظ في بيئة ملائمة للنمو', 'Scientists incubate the samples at a controlled temperature.', 'يحتضن العلماء العينات في درجة حرارة مضبوطة.', 'extended', 'C1', 'COCA'],
  ['propagate', 'verb', 'يُكاثر أو ينشر', 'Biologists propagate plant species through tissue culture.', 'يكاثر علماء الأحياء أنواع النباتات عبر زراعة الأنسجة.', 'extended', 'C1', 'AWL'],
];

// ============ UNIT 2: Deep Ocean ============
const unit2 = [
  ['submerge', 'verb', 'يغمر أو يغطس تحت الماء', 'The submarine can submerge to depths of 3,000 meters.', 'يمكن للغواصة أن تغطس إلى أعماق 3000 متر.', 'core', 'B2', 'COCA'],
  ['navigate', 'verb', 'يبحر أو يوجّه المسار', 'Pilots navigate through dark underwater canyons using sonar.', 'يبحر الطيارون عبر الأخاديد المظلمة تحت الماء باستخدام السونار.', 'core', 'B1', 'COCA'],
  ['pressurize', 'verb', 'يضغط أو يزيد الضغط داخل حاوية', 'Engineers pressurize the diving chamber before descent.', 'يضغط المهندسون غرفة الغوص قبل النزول.', 'extended', 'C1', 'COCA'],
  ['illuminate', 'verb', 'يضيء أو ينير', 'Bioluminescent creatures illuminate the deep sea floor.', 'تضيء الكائنات المتوهجة حيوياً قاع البحر العميق.', 'core', 'B2', 'COCA'],
  ['calibrate', 'verb', 'يعاير أو يضبط بدقة', 'Technicians calibrate sensors before each deep-sea dive.', 'يعاير الفنيون أجهزة الاستشعار قبل كل غوصة عميقة.', 'extended', 'C1', 'AWL'],
  ['anchor', 'verb', 'يرسي أو يثبت بمرساة', 'The research vessel anchors near the volcanic vent.', 'ترسو سفينة الأبحاث بالقرب من الفتحة البركانية.', 'core', 'B2', 'COCA'],
  ['drift', 'verb', 'ينجرف أو يطفو بلا اتجاه', 'Ocean currents cause debris to drift across vast distances.', 'تتسبب التيارات المحيطية في انجراف الحطام عبر مسافات شاسعة.', 'core', 'B1', 'COCA'],
  ['corrode', 'verb', 'يتآكل بفعل التفاعل الكيميائي', 'Saltwater can corrode metal structures over time.', 'يمكن لمياه البحر أن تتآكل الهياكل المعدنية بمرور الوقت.', 'extended', 'B2', 'COCA'],
  ['erode', 'verb', 'يتآكل تدريجياً بفعل عوامل طبيعية', 'Underwater currents erode the ocean floor slowly.', 'تتآكل التيارات المائية قاع المحيط ببطء.', 'core', 'B2', 'AWL'],
  ['descend', 'verb', 'ينزل أو يهبط إلى الأعماق', 'The submersible descends to the Mariana Trench.', 'تنزل الغواصة إلى خندق ماريانا.', 'core', 'B2', 'COCA'],
  ['surface', 'verb', 'يطفو أو يصعد إلى السطح', 'Whales surface to breathe every few minutes.', 'تطفو الحيتان للتنفس كل بضع دقائق.', 'core', 'B1', 'COCA'],
  ['buoy', 'verb', 'يُطفي أو يبقي عائماً', 'Air tanks buoy the divers during deep exploration.', 'تُبقي خزانات الهواء الغواصين طافين أثناء الاستكشاف العميق.', 'extended', 'C1', 'COCA'],
  ['tether', 'verb', 'يربط بحبل أو كابل', 'They tether the robot to the ship with a cable.', 'يربطون الروبوت بالسفينة بكابل.', 'extended', 'C1', 'COCA'],
  ['probe', 'verb', 'يسبر أو يستكشف بأداة', 'Scientists probe the seabed for mineral deposits.', 'يسبر العلماء قاع البحر بحثاً عن رواسب معدنية.', 'core', 'B2', 'COCA'],
  ['decompose', 'verb', 'يتحلل بيولوجياً', 'Organic matter decomposes slowly in cold deep waters.', 'تتحلل المواد العضوية ببطء في المياه العميقة الباردة.', 'core', 'B2', 'COCA'],
  ['fossilize', 'verb', 'يتحجّر أو يتحول إلى أحفورة', 'Remains of ancient creatures fossilize on the ocean floor.', 'تتحجر بقايا الكائنات القديمة في قاع المحيط.', 'extended', 'C1', 'COCA'],
  ['dredge', 'verb', 'يجرف قاع البحر أو ينتشل', 'Ships dredge the harbor to deepen the channel.', 'تجرف السفن الميناء لتعميق القناة.', 'mastery', 'C1', 'COCA'],
  ['excavate', 'verb', 'يحفر أو ينقّب', 'Teams excavate shipwrecks from the ocean floor.', 'تحفر الفرق حطام السفن من قاع المحيط.', 'core', 'B2', 'AWL'],
  ['siphon', 'verb', 'يسحب سائلاً عبر أنبوب', 'Pumps siphon water samples from great depths.', 'تسحب المضخات عينات مائية من أعماق كبيرة.', 'extended', 'C1', 'COCA'],
  ['filter', 'verb', 'يرشّح أو يصفّي', 'Marine organisms filter nutrients from seawater.', 'ترشّح الكائنات البحرية المغذيات من مياه البحر.', 'core', 'B1', 'COCA'],
  ['aerate', 'verb', 'يهوّي أو يشبع بالهواء', 'Waves aerate the surface water with oxygen.', 'تهوّي الأمواج المياه السطحية بالأكسجين.', 'mastery', 'C1', 'COCA'],
  ['circulate', 'verb', 'يدور أو يوزّع', 'Currents circulate warm water around the globe.', 'توزّع التيارات المياه الدافئة حول العالم.', 'core', 'B2', 'COCA'],
  ['disperse', 'verb', 'يتفرّق أو ينتشر', 'Oil spills disperse across wide ocean areas.', 'تنتشر التسربات النفطية عبر مناطق محيطية واسعة.', 'core', 'B2', 'AWL'],
  ['dissolve', 'verb', 'يذوب أو يحلّ في سائل', 'Minerals dissolve in heated ocean water near vents.', 'تذوب المعادن في مياه المحيط الساخنة قرب الفتحات.', 'core', 'B2', 'COCA'],
  ['saturate', 'verb', 'يُشبع بالكامل', 'Deep waters saturate with carbon dioxide over centuries.', 'تتشبع المياه العميقة بثاني أكسيد الكربون على مدى قرون.', 'extended', 'B2', 'COCA'],
];

// ============ UNIT 3: Food Security ============
const unit3 = [
  ['cultivate', 'verb', 'يزرع أو يفلح الأرض', 'Farmers cultivate rice paddies in tropical regions.', 'يزرع المزارعون حقول الأرز في المناطق الاستوائية.', 'core', 'B2', 'AWL'],
  ['irrigate', 'verb', 'يروي الأرض بالماء', 'They irrigate the fields using drip systems.', 'يروون الحقول باستخدام أنظمة التنقيط.', 'extended', 'B2', 'COCA'],
  ['harvest', 'verb', 'يحصد المحاصيل', 'Workers harvest wheat before the autumn rains.', 'يحصد العمال القمح قبل أمطار الخريف.', 'core', 'B1', 'COCA'],
  ['ferment', 'verb', 'يُخمّر بالتفاعل البيولوجي', 'Bacteria ferment milk to produce yogurt.', 'تخمّر البكتيريا الحليب لإنتاج اللبن.', 'extended', 'B2', 'COCA'],
  ['pasteurize', 'verb', 'يبستر لقتل الجراثيم بالحرارة', 'Dairies pasteurize milk to eliminate harmful bacteria.', 'تبستر مصانع الألبان الحليب للقضاء على البكتيريا الضارة.', 'extended', 'C1', 'COCA'],
  ['refrigerate', 'verb', 'يبرّد أو يحفظ في الثلاجة', 'You must refrigerate meat to prevent spoilage.', 'يجب تبريد اللحم لمنع التلف.', 'core', 'B1', 'COCA'],
  ['stockpile', 'verb', 'يخزّن كميات كبيرة احتياطياً', 'Nations stockpile grain reserves for emergencies.', 'تخزّن الدول احتياطيات الحبوب للطوارئ.', 'extended', 'B2', 'COCA'],
  ['distribute', 'verb', 'يوزّع على نطاق واسع', 'Aid agencies distribute food to affected communities.', 'توزّع وكالات الإغاثة الغذاء على المجتمعات المتضررة.', 'core', 'B1', 'AWL'],
  ['subsidize', 'verb', 'يدعم مالياً من الحكومة', 'Governments subsidize farmers to keep food prices low.', 'تدعم الحكومات المزارعين للحفاظ على أسعار الغذاء منخفضة.', 'core', 'B2', 'AWL'],
  ['ration', 'verb', 'يقنّن أو يوزّع بحصص محدودة', 'Authorities ration water during severe droughts.', 'تقنّن السلطات المياه أثناء موجات الجفاف الشديدة.', 'extended', 'B2', 'COCA'],
  ['compost', 'verb', 'يحوّل النفايات العضوية إلى سماد', 'Families compost kitchen waste to enrich their soil.', 'تحوّل العائلات نفايات المطبخ إلى سماد لإثراء تربتها.', 'extended', 'B2', 'COCA'],
  ['germinate', 'verb', 'ينبت أو يبدأ بالنمو من بذرة', 'Seeds germinate faster in warm moist conditions.', 'تنبت البذور أسرع في الظروف الدافئة والرطبة.', 'extended', 'C1', 'COCA'],
  ['pollinate', 'verb', 'يُلقّح النبات بنقل حبوب اللقاح', 'Bees pollinate crops essential for food production.', 'يلقّح النحل المحاصيل الضرورية لإنتاج الغذاء.', 'extended', 'B2', 'COCA'],
  ['fumigate', 'verb', 'يبخّر لقتل الآفات والحشرات', 'Workers fumigate grain silos to prevent pest infestations.', 'يبخّر العمال صوامع الحبوب لمنع انتشار الآفات.', 'mastery', 'C1', 'COCA'],
  ['thresh', 'verb', 'يدرس أو يفصل الحبوب عن السيقان', 'Machines thresh the wheat after harvesting.', 'تدرس الآلات القمح بعد الحصاد.', 'mastery', 'C1', 'COCA'],
  ['mill', 'verb', 'يطحن الحبوب إلى دقيق', 'Factories mill grain into flour for bread production.', 'تطحن المصانع الحبوب إلى دقيق لإنتاج الخبز.', 'extended', 'B2', 'COCA'],
  ['dehydrate', 'verb', 'يجفف بإزالة الماء', 'Companies dehydrate fruit to extend its shelf life.', 'تجفف الشركات الفاكهة لإطالة مدة صلاحيتها.', 'extended', 'B2', 'COCA'],
  ['preserve', 'verb', 'يحفظ الطعام من التلف', 'Salt and vinegar preserve vegetables for months.', 'يحفظ الملح والخل الخضروات لأشهر.', 'core', 'B1', 'COCA'],
  ['fortify', 'verb', 'يدعّم أو يُضيف عناصر غذائية', 'Manufacturers fortify cereals with vitamins and minerals.', 'يدعّم المصنعون الحبوب بالفيتامينات والمعادن.', 'extended', 'B2', 'COCA'],
  ['rotate', 'verb', 'يناوب في زراعة المحاصيل', 'Farmers rotate crops to maintain soil fertility.', 'يناوب المزارعون المحاصيل للحفاظ على خصوبة التربة.', 'core', 'B1', 'COCA'],
  ['weed', 'verb', 'ينزع الأعشاب الضارة', 'Workers weed the fields by hand to protect the crop.', 'ينزع العمال الأعشاب الضارة يدوياً لحماية المحصول.', 'core', 'B2', 'COCA'],
  ['plow', 'verb', 'يحرث الأرض استعداداً للزراعة', 'Tractors plow the soil before the planting season.', 'تحرث الجرارات التربة قبل موسم الزراعة.', 'core', 'B2', 'COCA'],
  ['sow', 'verb', 'يبذر البذور في التربة', 'Farmers sow seeds in neat rows across the field.', 'يبذر المزارعون البذور في صفوف منتظمة عبر الحقل.', 'core', 'B2', 'COCA'],
  ['thresh', 'verb', 'يدرس الحبوب لفصلها', 'Villages thresh rice using traditional methods.', 'تدرس القرى الأرز باستخدام طرق تقليدية.', 'mastery', 'C1', 'COCA'],
  ['graft', 'verb', 'يطعّم نباتاً بفرع من نبات آخر', 'Horticulturists graft branches to improve fruit quality.', 'يطعّم البستانيون الأغصان لتحسين جودة الفاكهة.', 'mastery', 'C1', 'COCA'],
];

// ============ UNIT 4: Biomimicry ============
const unit4 = [
  ['mimic', 'verb', 'يحاكي أو يقلّد', 'Engineers mimic the structure of spider silk for strength.', 'يحاكي المهندسون بنية خيوط العنكبوت للقوة.', 'core', 'B2', 'COCA'],
  ['adhere', 'verb', 'يلتصق أو يتمسك بسطح', 'Gecko-inspired pads adhere to smooth surfaces.', 'تلتصق الوسائد المستوحاة من الوزغة بالأسطح الملساء.', 'core', 'B2', 'AWL'],
  ['repel', 'verb', 'يطرد أو يصدّ', 'Lotus-leaf coatings repel water and dirt.', 'تصدّ الطلاءات المستوحاة من ورقة اللوتس الماء والأوساخ.', 'core', 'B2', 'COCA'],
  ['camouflage', 'verb', 'يموّه أو يخفي بالتمويه', 'Chameleons camouflage themselves to avoid predators.', 'تموّه الحرباء نفسها لتجنب المفترسين.', 'extended', 'B2', 'COCA'],
  ['streamline', 'verb', 'ينسّق أو يجعل انسيابياً', 'Designers streamline car shapes based on fish bodies.', 'ينسّق المصممون أشكال السيارات بناءً على أجسام الأسماك.', 'core', 'B2', 'COCA'],
  ['reinforce', 'verb', 'يعزّز أو يقوّي', 'Bone structure inspires ways to reinforce building frames.', 'تلهم بنية العظام طرقاً لتعزيز هياكل المباني.', 'core', 'B2', 'AWL'],
  ['laminate', 'verb', 'يغلّف بطبقات رقيقة', 'Factories laminate materials to increase durability.', 'تغلّف المصانع المواد بطبقات لزيادة المتانة.', 'extended', 'C1', 'COCA'],
  ['flex', 'verb', 'يثني أو يمتد بمرونة', 'Bamboo-inspired materials flex without breaking.', 'تنثني المواد المستوحاة من الخيزران دون أن تنكسر.', 'core', 'B2', 'COCA'],
  ['compress', 'verb', 'يضغط أو يكبس', 'Spider silk can compress and still retain its strength.', 'يمكن لخيط العنكبوت أن ينضغط ويحتفظ بقوته.', 'core', 'B2', 'COCA'],
  ['cushion', 'verb', 'يخفف صدمة أو يُمتص الضربة', 'Woodpecker skulls cushion impact during rapid pecking.', 'تخفف جماجم نقار الخشب الصدمات أثناء النقر السريع.', 'extended', 'B2', 'COCA'],
  ['insulate', 'verb', 'يعزل حرارياً أو كهربائياً', 'Polar bear fur insulates against extreme cold.', 'يعزل فراء الدب القطبي ضد البرد الشديد.', 'core', 'B2', 'COCA'],
  ['waterproof', 'verb', 'يجعل مقاوماً للماء', 'Duck feather oils waterproof the bird naturally.', 'تجعل زيوت ريش البط الطائر مقاوماً للماء بشكل طبيعي.', 'extended', 'B2', 'COCA'],
  ['ventilate', 'verb', 'يهوّي أو يسمح بتدفق الهواء', 'Termite mounds ventilate air passively and efficiently.', 'تهوّي تلال النمل الأبيض الهواء بشكل سلبي وفعال.', 'core', 'B2', 'COCA'],
  ['oscillate', 'verb', 'يتذبذب أو يتأرجح', 'Fish tails oscillate to propel through water efficiently.', 'تتذبذب ذيول الأسماك للدفع عبر الماء بكفاءة.', 'mastery', 'C1', 'AWL'],
  ['vibrate', 'verb', 'يهتز بحركة سريعة', 'Insect wings vibrate at high frequencies during flight.', 'تهتز أجنحة الحشرات بترددات عالية أثناء الطيران.', 'core', 'B2', 'COCA'],
  ['coil', 'verb', 'يلتف بشكل حلزوني', 'Tendrils coil around supports to help plants climb.', 'تلتف المحاليق حول الدعامات لمساعدة النباتات على التسلق.', 'extended', 'B2', 'COCA'],
  ['unfurl', 'verb', 'ينشر أو يفتح شيئاً ملفوفاً', 'Leaves unfurl to maximize sunlight absorption.', 'تنشر الأوراق نفسها لزيادة امتصاص ضوء الشمس.', 'mastery', 'C1', 'COCA'],
  ['spin', 'verb', 'يغزل أو يلف بسرعة', 'Spiders spin silk threads stronger than steel.', 'تغزل العناكب خيوطاً حريرية أقوى من الفولاذ.', 'core', 'B1', 'COCA'],
  ['weave', 'verb', 'ينسج بتشابك الخيوط', 'Birds weave twigs into intricate nest structures.', 'تنسج الطيور الأغصان في هياكل أعشاش معقدة.', 'core', 'B2', 'COCA'],
  ['mold', 'verb', 'يصبّ في قالب أو يشكّل', 'Scientists mold biodegradable plastics from plant fibers.', 'يصبّ العلماء البلاستيك القابل للتحلل من ألياف النباتات.', 'core', 'B2', 'COCA'],
  ['sculpt', 'verb', 'ينحت أو يشكّل فنياً', 'Erosion sculpts canyon walls into natural artwork.', 'ينحت التآكل جدران الأخاديد إلى أعمال فنية طبيعية.', 'extended', 'B2', 'COCA'],
  ['bond', 'verb', 'يلتحم أو يترابط كيميائياً', 'Mussel proteins bond strongly to wet surfaces.', 'تترابط بروتينات بلح البحر بقوة مع الأسطح الرطبة.', 'core', 'B2', 'COCA'],
  ['fuse', 'verb', 'يدمج أو يصهر معاً', 'Heat and pressure fuse nacre layers in seashells.', 'يدمج الحرارة والضغط طبقات عرق اللؤلؤ في الأصداف.', 'extended', 'B2', 'COCA'],
  ['self-heal', 'verb', 'يُرمّم ذاتياً دون تدخل خارجي', 'New polymers self-heal when exposed to sunlight.', 'ترمّم البوليمرات الجديدة نفسها عند التعرض لأشعة الشمس.', 'mastery', 'C1', 'COCA'],
  ['adapt', 'verb', 'يتكيف مع ظروف جديدة', 'Species adapt their features to survive in harsh climates.', 'تتكيف الأنواع مع سماتها للبقاء في المناخات القاسية.', 'core', 'B1', 'AWL'],
];

// ============ UNIT 5: Migration ============
const unit5 = [
  ['emigrate', 'verb', 'يهاجر من بلده إلى بلد آخر', 'Thousands emigrate from war zones every year.', 'يهاجر الآلاف من مناطق الحرب كل عام.', 'core', 'B2', 'AWL'],
  ['immigrate', 'verb', 'يهاجر إلى بلد جديد للإقامة فيه', 'Many families immigrate to seek better opportunities.', 'تهاجر عائلات كثيرة بحثاً عن فرص أفضل.', 'core', 'B2', 'AWL'],
  ['resettle', 'verb', 'يُعيد التوطين في مكان جديد', 'The UN helps resettle refugees in safe countries.', 'تساعد الأمم المتحدة في إعادة توطين اللاجئين في بلدان آمنة.', 'extended', 'B2', 'COCA'],
  ['displace', 'verb', 'يُشرّد أو يُبعد قسراً', 'Conflict displaces millions of civilians annually.', 'يشرّد النزاع ملايين المدنيين سنوياً.', 'core', 'B2', 'AWL'],
  ['assimilate', 'verb', 'يندمج ثقافياً في مجتمع جديد', 'Immigrants often struggle to assimilate into new cultures.', 'غالباً ما يواجه المهاجرون صعوبة في الاندماج في ثقافات جديدة.', 'core', 'B2', 'AWL'],
  ['integrate', 'verb', 'يدمج أو يوحّد في المجتمع', 'Programs help newcomers integrate into the workforce.', 'تساعد البرامج الوافدين الجدد على الاندماج في سوق العمل.', 'core', 'B2', 'AWL'],
  ['repatriate', 'verb', 'يُعيد إلى الوطن الأصلي', 'Governments repatriate nationals stranded abroad.', 'تعيد الحكومات المواطنين العالقين في الخارج إلى وطنهم.', 'extended', 'C1', 'COCA'],
  ['deport', 'verb', 'يُرحّل قسراً من البلاد', 'Authorities deport individuals who violate visa terms.', 'ترحّل السلطات الأفراد الذين ينتهكون شروط التأشيرة.', 'core', 'B2', 'COCA'],
  ['naturalize', 'verb', 'يمنح الجنسية لأجنبي مقيم', 'The country naturalizes residents after five years.', 'يمنح البلد الجنسية للمقيمين بعد خمس سنوات.', 'extended', 'C1', 'COCA'],
  ['detain', 'verb', 'يحتجز أو يوقف مؤقتاً', 'Border guards detain undocumented travelers.', 'يحتجز حرس الحدود المسافرين غير الموثقين.', 'core', 'B2', 'COCA'],
  ['smuggle', 'verb', 'يهرّب أشخاصاً أو بضائع', 'Criminal networks smuggle people across borders.', 'تهرّب الشبكات الإجرامية الأشخاص عبر الحدود.', 'core', 'B2', 'COCA'],
  ['flee', 'verb', 'يفرّ أو يهرب من خطر', 'Families flee their homes to escape persecution.', 'تفرّ العائلات من منازلها هرباً من الاضطهاد.', 'core', 'B1', 'COCA'],
  ['exile', 'verb', 'ينفي أو يُبعد عن الوطن', 'The regime exiles political opponents to silence dissent.', 'ينفي النظام المعارضين السياسيين لإسكات المعارضة.', 'extended', 'B2', 'COCA'],
  ['segregate', 'verb', 'يفصل أو يعزل مجموعة عن أخرى', 'Unjust laws segregate communities based on ethnicity.', 'تفصل القوانين الجائرة المجتمعات على أساس العرق.', 'extended', 'B2', 'COCA'],
  ['marginalize', 'verb', 'يُهمّش أو يُقصي اجتماعياً', 'Policies can marginalize vulnerable immigrant groups.', 'يمكن للسياسات أن تهمّش مجموعات المهاجرين الضعيفة.', 'core', 'B2', 'AWL'],
  ['petition', 'verb', 'يُقدّم التماساً رسمياً', 'Citizens petition the government for asylum reform.', 'يقدّم المواطنون التماساً للحكومة لإصلاح نظام اللجوء.', 'extended', 'B2', 'COCA'],
  ['sponsor', 'verb', 'يكفل أو يتبنى رسمياً', 'Relatives sponsor family members for immigration visas.', 'يكفل الأقارب أفراد العائلة للحصول على تأشيرات هجرة.', 'core', 'B2', 'COCA'],
  ['recruit', 'verb', 'يُجنّد أو يستقطب عمالة', 'Companies recruit skilled migrants for technical roles.', 'تستقطب الشركات المهاجرين المهرة لأدوار تقنية.', 'core', 'B2', 'COCA'],
  ['exploit', 'verb', 'يستغل بشكل غير عادل', 'Unscrupulous employers exploit undocumented workers.', 'يستغل أصحاب العمل عديمو الضمير العمال غير الموثقين.', 'core', 'B2', 'AWL'],
  ['remit', 'verb', 'يُحوّل أموالاً إلى الوطن', 'Workers remit a portion of their salary to family abroad.', 'يُحوّل العمال جزءاً من رواتبهم إلى عائلاتهم في الخارج.', 'extended', 'C1', 'AWL'],
  ['uproot', 'verb', 'يقتلع أو ينتزع من الجذور', 'War uproots entire communities from their homeland.', 'تقتلع الحرب مجتمعات كاملة من وطنها.', 'extended', 'B2', 'COCA'],
  ['harbor', 'verb', 'يُؤوي أو يُخبئ شخصاً', 'Some communities harbor refugees fleeing violence.', 'تؤوي بعض المجتمعات اللاجئين الفارين من العنف.', 'extended', 'B2', 'COCA'],
  ['persecute', 'verb', 'يضطهد أو يعامل بقسوة', 'Regimes persecute minorities for their beliefs.', 'تضطهد الأنظمة الأقليات بسبب معتقداتها.', 'core', 'B2', 'COCA'],
  ['discriminate', 'verb', 'يُميّز بشكل غير عادل', 'Laws must prevent employers from discriminating against migrants.', 'يجب أن تمنع القوانين أصحاب العمل من التمييز ضد المهاجرين.', 'core', 'B2', 'AWL'],
  ['assemble', 'verb', 'يتجمع أو يتكتل معاً', 'Migrants assemble at borders waiting for entry permits.', 'يتجمع المهاجرون عند الحدود في انتظار تصاريح الدخول.', 'core', 'B2', 'AWL'],
];

// ============ UNIT 6: Cryptocurrency ============
const unit6 = [
  ['mine', 'verb', 'يُعدّن العملات الرقمية بحل معادلات', 'Powerful computers mine Bitcoin around the clock.', 'تُعدّن أجهزة الحاسوب القوية البيتكوين على مدار الساعة.', 'core', 'B2', 'COCA'],
  ['encrypt', 'verb', 'يُشفّر بيانات لحمايتها', 'Blockchain technology encrypts all transaction data.', 'تُشفّر تقنية البلوكتشين جميع بيانات المعاملات.', 'core', 'B2', 'COCA'],
  ['decrypt', 'verb', 'يفك تشفير البيانات المحمية', 'Only authorized users can decrypt the private keys.', 'يمكن فقط للمستخدمين المُصرّح لهم فك تشفير المفاتيح الخاصة.', 'extended', 'B2', 'COCA'],
  ['authenticate', 'verb', 'يتحقق من الهوية أو الصحة', 'Two-factor systems authenticate users before transactions.', 'تتحقق أنظمة المصادقة الثنائية من المستخدمين قبل المعاملات.', 'core', 'B2', 'COCA'],
  ['transact', 'verb', 'يُجري معاملة مالية', 'Users transact directly without needing a bank.', 'يُجري المستخدمون معاملات مباشرة دون الحاجة إلى بنك.', 'extended', 'C1', 'COCA'],
  ['verify', 'verb', 'يتحقق من صحة المعلومات', 'Miners verify transactions before adding them to the chain.', 'يتحقق المعدّنون من المعاملات قبل إضافتها إلى السلسلة.', 'core', 'B1', 'COCA'],
  ['stake', 'verb', 'يُودع عملات للمشاركة في التحقق', 'Investors stake their tokens to earn passive rewards.', 'يُودع المستثمرون رموزهم لكسب مكافآت سلبية.', 'extended', 'B2', 'COCA'],
  ['liquidate', 'verb', 'يُصفّي أو يحوّل إلى نقد', 'Traders liquidate assets when the market crashes.', 'يُصفّي المتداولون الأصول عندما ينهار السوق.', 'extended', 'C1', 'COCA'],
  ['speculate', 'verb', 'يُضارب أو يراهن على الأسعار', 'Many people speculate on cryptocurrency prices.', 'يُضارب كثير من الناس على أسعار العملات الرقمية.', 'core', 'B2', 'COCA'],
  ['hedge', 'verb', 'يتحوّط لتقليل المخاطر المالية', 'Investors hedge their portfolios with stablecoins.', 'يتحوّط المستثمرون في محافظهم بالعملات المستقرة.', 'extended', 'B2', 'COCA'],
  ['divest', 'verb', 'يتخلى عن استثمارات أو أصول', 'Funds divest from risky tokens during downturns.', 'تتخلى الصناديق عن الرموز الخطرة أثناء الانكماش.', 'extended', 'C1', 'AWL'],
  ['allocate', 'verb', 'يُخصص موارد أو أموالاً', 'Smart contracts allocate funds automatically.', 'تُخصص العقود الذكية الأموال تلقائياً.', 'core', 'B2', 'AWL'],
  ['audit', 'verb', 'يُدقّق حسابات أو عقوداً', 'Firms audit smart contracts for security vulnerabilities.', 'تُدقّق الشركات العقود الذكية بحثاً عن ثغرات أمنية.', 'core', 'B2', 'COCA'],
  ['launder', 'verb', 'يغسل الأموال غير المشروعة', 'Criminals launder money through anonymous crypto wallets.', 'يغسل المجرمون الأموال عبر محافظ رقمية مجهولة.', 'extended', 'B2', 'COCA'],
  ['default', 'verb', 'يتخلف عن السداد أو الالتزام', 'Borrowers who default lose their collateral tokens.', 'يخسر المقترضون المتخلفون عن السداد رموز الضمان الخاصة بهم.', 'core', 'B2', 'COCA'],
  ['leverage', 'verb', 'يستخدم الرافعة المالية لتضخيم المكاسب', 'Traders leverage borrowed funds to amplify returns.', 'يستخدم المتداولون أموالاً مقترضة لتضخيم العوائد.', 'core', 'B2', 'COCA'],
  ['tokenize', 'verb', 'يحوّل أصلاً إلى رمز رقمي', 'Platforms tokenize real estate for fractional ownership.', 'تحوّل المنصات العقارات إلى رموز رقمية للملكية الجزئية.', 'mastery', 'C1', 'COCA'],
  ['mint', 'verb', 'يسكّ أو يُصدر رموزاً رقمية جديدة', 'Artists mint NFTs to sell digital artwork.', 'يسكّ الفنانون رموزاً غير قابلة للاستبدال لبيع الأعمال الفنية الرقمية.', 'extended', 'B2', 'COCA'],
  ['burn', 'verb', 'يُتلف رموزاً رقمية لتقليل العرض', 'Protocols burn tokens to reduce total supply.', 'تُتلف البروتوكولات الرموز لتقليل إجمالي العرض.', 'core', 'B2', 'COCA'],
  ['swap', 'verb', 'يُبادل عملة رقمية بأخرى', 'Users swap tokens on decentralized exchanges instantly.', 'يُبادل المستخدمون الرموز على منصات لامركزية فوراً.', 'core', 'B1', 'COCA'],
  ['arbitrage', 'verb', 'يُراجح بين أسعار مختلفة لتحقيق ربح', 'Bots arbitrage price differences across exchanges.', 'تُراجح الروبوتات فروقات الأسعار عبر المنصات.', 'mastery', 'C1', 'COCA'],
  ['vest', 'verb', 'يُمنح حقاً مؤجلاً تدريجياً', 'Employee tokens vest over a four-year period.', 'تُمنح رموز الموظفين تدريجياً على مدى أربع سنوات.', 'extended', 'C1', 'COCA'],
  ['redeem', 'verb', 'يسترد قيمة أو يصرف رموزاً', 'Holders redeem stablecoins for US dollars.', 'يسترد حاملو العملات المستقرة قيمتها بالدولار الأمريكي.', 'core', 'B2', 'COCA'],
  ['peg', 'verb', 'يربط قيمة عملة بأصل ثابت', 'Stablecoins peg their value to the US dollar.', 'تربط العملات المستقرة قيمتها بالدولار الأمريكي.', 'extended', 'B2', 'COCA'],
  ['deregulate', 'verb', 'يُلغي القيود التنظيمية', 'Some governments deregulate crypto markets to attract investors.', 'تُلغي بعض الحكومات القيود التنظيمية على أسواق العملات الرقمية لجذب المستثمرين.', 'extended', 'C1', 'NAWL'],
];

// ============ UNIT 7: Crowd Psychology ============
const unit7 = [
  ['persuade', 'verb', 'يُقنع بالحجة والمنطق', 'Leaders persuade crowds to support their cause.', 'يُقنع القادة الجماهير بدعم قضيتهم.', 'core', 'B1', 'COCA'],
  ['conform', 'verb', 'يمتثل أو يتوافق مع الجماعة', 'People tend to conform to group behavior under pressure.', 'يميل الناس إلى الامتثال لسلوك الجماعة تحت الضغط.', 'core', 'B2', 'AWL'],
  ['rebel', 'verb', 'يتمرد أو يثور ضد السلطة', 'Youth rebel against social norms during protests.', 'يتمرد الشباب على الأعراف الاجتماعية أثناء الاحتجاجات.', 'core', 'B2', 'COCA'],
  ['ostracize', 'verb', 'ينبذ أو يُقصي من الجماعة', 'Groups ostracize members who challenge authority.', 'تنبذ الجماعات الأعضاء الذين يتحدون السلطة.', 'mastery', 'C1', 'COCA'],
  ['indoctrinate', 'verb', 'يُلقّن عقيدة أو فكراً بشكل منهجي', 'Extremist groups indoctrinate vulnerable individuals online.', 'تُلقّن الجماعات المتطرفة الأفراد الضعفاء عبر الإنترنت.', 'mastery', 'C1', 'COCA'],
  ['radicalize', 'verb', 'يُطرّف أو يدفع نحو التطرف', 'Propaganda can radicalize isolated youth quickly.', 'يمكن للدعاية أن تُطرّف الشباب المعزول بسرعة.', 'extended', 'C1', 'COCA'],
  ['mobilize', 'verb', 'يُحشد أو يجمع للعمل الجماعي', 'Activists mobilize supporters through social media.', 'يُحشد الناشطون المؤيدين عبر وسائل التواصل الاجتماعي.', 'core', 'B2', 'COCA'],
  ['intimidate', 'verb', 'يُخيف أو يُرهب', 'Mobs intimidate bystanders into silence.', 'يُخيف الغوغاء المارة ويُسكتونهم.', 'core', 'B2', 'COCA'],
  ['coerce', 'verb', 'يُكره أو يُجبر بالتهديد', 'Gangs coerce members into committing violent acts.', 'تُجبر العصابات الأعضاء على ارتكاب أعمال عنف.', 'extended', 'B2', 'COCA'],
  ['boycott', 'verb', 'يُقاطع منتجاً أو مؤسسة احتجاجاً', 'Consumers boycott brands accused of unethical practices.', 'يُقاطع المستهلكون العلامات التجارية المتهمة بممارسات غير أخلاقية.', 'core', 'B2', 'COCA'],
  ['protest', 'verb', 'يحتج أو يتظاهر ضد شيء', 'Thousands protest in the streets against the new policy.', 'يحتج الآلاف في الشوارع ضد السياسة الجديدة.', 'core', 'B1', 'COCA'],
  ['riot', 'verb', 'يشغب أو يثور بعنف', 'Crowds riot when peaceful demands go unheard.', 'يشغب الحشد عندما لا تُسمع المطالب السلمية.', 'extended', 'B2', 'COCA'],
  ['loot', 'verb', 'ينهب أو يسرق أثناء الفوضى', 'Rioters loot shops during civil unrest.', 'ينهب المشاغبون المتاجر أثناء الاضطرابات المدنية.', 'extended', 'B2', 'COCA'],
  ['stampede', 'verb', 'يتدافع بشكل جماعي فوضوي', 'Panic causes people to stampede toward the exits.', 'يتسبب الذعر في تدافع الناس نحو المخارج.', 'extended', 'C1', 'COCA'],
  ['panic', 'verb', 'يصاب بالهلع أو الذعر', 'Crowds panic when they hear loud explosions.', 'يصاب الحشد بالذعر عند سماع انفجارات عالية.', 'core', 'B1', 'COCA'],
  ['idolize', 'verb', 'يُعبد أو يُمجّد شخصاً بشكل مفرط', 'Fans idolize celebrities and mimic their behavior.', 'يُمجّد المعجبون المشاهير ويقلدون سلوكهم.', 'extended', 'B2', 'COCA'],
  ['scapegoat', 'verb', 'يجعل شخصاً كبش فداء', 'Politicians scapegoat minorities to deflect blame.', 'يجعل السياسيون الأقليات كبش فداء لتحويل اللوم.', 'extended', 'C1', 'COCA'],
  ['stigmatize', 'verb', 'يوصم أو يُلصق عاراً اجتماعياً', 'Society can stigmatize people with mental health issues.', 'يمكن للمجتمع أن يوصم المصابين بمشاكل نفسية.', 'extended', 'B2', 'COCA'],
  ['brainwash', 'verb', 'يغسل الدماغ أو يُعيد برمجة التفكير', 'Cults brainwash followers into total obedience.', 'تغسل الطوائف أدمغة الأتباع لطاعة مطلقة.', 'extended', 'B2', 'COCA'],
  ['incite', 'verb', 'يُحرّض أو يُثير', 'Hate speech incites violence against vulnerable groups.', 'يُحرّض خطاب الكراهية على العنف ضد الفئات الضعيفة.', 'core', 'B2', 'COCA'],
  ['suppress', 'verb', 'يقمع أو يكبت', 'Governments suppress protests with force.', 'تقمع الحكومات الاحتجاجات بالقوة.', 'core', 'B2', 'COCA'],
  ['censor', 'verb', 'يُراقب ويحذف محتوى غير مرغوب', 'Authorities censor media to control public opinion.', 'تُراقب السلطات الإعلام للتحكم في الرأي العام.', 'core', 'B2', 'COCA'],
  ['polarize', 'verb', 'يُستقطب أو يقسّم إلى فريقين متناقضين', 'Social media algorithms polarize public debates.', 'تُستقطب خوارزميات وسائل التواصل الاجتماعي النقاشات العامة.', 'core', 'B2', 'COCA'],
  ['unite', 'verb', 'يُوحّد أو يجمع شمل الجماعة', 'Shared goals unite diverse groups of people.', 'تُوحّد الأهداف المشتركة مجموعات متنوعة من الناس.', 'core', 'B1', 'COCA'],
  ['manipulate', 'verb', 'يتلاعب نفسياً بالآخرين', 'Demagogues manipulate public emotions for political gain.', 'يتلاعب الديماغوجيون بمشاعر الجمهور لتحقيق مكاسب سياسية.', 'core', 'B2', 'AWL'],
];

// ============ UNIT 8: Forensic Science ============
const unit8 = [
  ['investigate', 'verb', 'يحقق في قضية أو جريمة', 'Detectives investigate the crime scene for evidence.', 'يحقق المحققون في مسرح الجريمة بحثاً عن أدلة.', 'core', 'B1', 'AWL'],
  ['interrogate', 'verb', 'يستجوب مشتبهاً به', 'Officers interrogate the suspect for hours.', 'يستجوب الضباط المشتبه به لساعات.', 'core', 'B2', 'COCA'],
  ['autopsy', 'verb', 'يُجري تشريحاً للجثة', 'Coroners autopsy victims to determine the cause of death.', 'يُشرّح أطباء الطب الشرعي الضحايا لتحديد سبب الوفاة.', 'extended', 'C1', 'COCA'],
  ['exhume', 'verb', 'يستخرج جثة من القبر', 'Courts order to exhume remains for re-examination.', 'تأمر المحاكم باستخراج الرفات لإعادة الفحص.', 'mastery', 'C1', 'COCA'],
  ['testify', 'verb', 'يشهد أمام المحكمة', 'Expert witnesses testify about DNA evidence.', 'يشهد الخبراء حول أدلة الحمض النووي.', 'core', 'B2', 'COCA'],
  ['prosecute', 'verb', 'يُقاضي أو يُحاكم جنائياً', 'The state prosecutes the accused based on forensic proof.', 'تُقاضي الدولة المتهم بناءً على الإثبات الجنائي.', 'core', 'B2', 'COCA'],
  ['acquit', 'verb', 'يُبرّئ من تهمة', 'Juries acquit defendants when evidence is insufficient.', 'تُبرّئ هيئات المحلفين المتهمين عندما تكون الأدلة غير كافية.', 'extended', 'C1', 'COCA'],
  ['convict', 'verb', 'يُدين بحكم قضائي', 'Courts convict criminals based on DNA matches.', 'تُدين المحاكم المجرمين بناءً على تطابق الحمض النووي.', 'core', 'B2', 'COCA'],
  ['indict', 'verb', 'يُوجّه اتهاماً رسمياً', 'Grand juries indict suspects after reviewing evidence.', 'توجّه هيئات المحلفين الكبرى اتهامات للمشتبه بهم بعد مراجعة الأدلة.', 'extended', 'C1', 'COCA'],
  ['arraign', 'verb', 'يُحضر للمثول أمام المحكمة لسماع التهم', 'Judges arraign the accused within 48 hours of arrest.', 'يُحضر القضاة المتهم خلال 48 ساعة من الاعتقال.', 'mastery', 'C1', 'COCA'],
  ['apprehend', 'verb', 'يُلقي القبض على مشتبه به', 'Police apprehend the fugitive after a long chase.', 'تُلقي الشرطة القبض على الهارب بعد مطاردة طويلة.', 'core', 'B2', 'COCA'],
  ['imprison', 'verb', 'يسجن أو يحبس', 'Courts imprison offenders for serious crimes.', 'تسجن المحاكم المخالفين بسبب جرائم خطيرة.', 'core', 'B2', 'COCA'],
  ['fingerprint', 'verb', 'يأخذ بصمات الأصابع', 'Officers fingerprint every suspect during booking.', 'يأخذ الضباط بصمات كل مشتبه به أثناء التسجيل.', 'extended', 'B2', 'COCA'],
  ['photograph', 'verb', 'يُصوّر فوتوغرافياً للتوثيق', 'Forensic teams photograph the scene before collecting evidence.', 'تُصوّر فرق الطب الشرعي المكان قبل جمع الأدلة.', 'core', 'B1', 'COCA'],
  ['swab', 'verb', 'يمسح عينة بمسحة للتحليل', 'Technicians swab surfaces to collect DNA samples.', 'يمسح الفنيون الأسطح لجمع عينات الحمض النووي.', 'extended', 'B2', 'COCA'],
  ['analyze', 'verb', 'يُحلّل علمياً أو مخبرياً', 'Labs analyze blood samples for toxicology reports.', 'تُحلّل المختبرات عينات الدم لتقارير علم السموم.', 'core', 'B1', 'AWL'],
  ['reconstruct', 'verb', 'يُعيد بناء أو تركيب المشهد', 'Experts reconstruct the sequence of events at the crime scene.', 'يُعيد الخبراء بناء تسلسل الأحداث في مسرح الجريمة.', 'core', 'B2', 'AWL'],
  ['identify', 'verb', 'يتعرف على هوية شخص أو شيء', 'Dental records help identify unrecognizable victims.', 'تساعد السجلات الطبية في التعرف على الضحايا الذين لا يمكن التعرف عليهم.', 'core', 'B1', 'AWL'],
  ['corroborate', 'verb', 'يُعزّز أو يؤكد شهادة بأدلة إضافية', 'Physical evidence must corroborate witness testimony.', 'يجب أن تُعزّز الأدلة المادية شهادة الشهود.', 'mastery', 'C1', 'COCA'],
  ['falsify', 'verb', 'يُزوّر أو يُحرّف', 'Criminals falsify documents to cover their tracks.', 'يُزوّر المجرمون الوثائق لإخفاء آثارهم.', 'extended', 'B2', 'COCA'],
  ['forge', 'verb', 'يُقلّد أو يُزيّف مستنداً', 'Suspects forge signatures to commit fraud.', 'يُزيّف المشتبه بهم التوقيعات لارتكاب الاحتيال.', 'core', 'B2', 'COCA'],
  ['wiretap', 'verb', 'يتنصت على اتصالات هاتفية', 'Agencies wiretap phones with a court warrant.', 'تتنصت الوكالات على الهواتف بأمر قضائي.', 'extended', 'C1', 'COCA'],
  ['surveil', 'verb', 'يُراقب بشكل سري ومستمر', 'Undercover units surveil suspects for weeks.', 'تُراقب الوحدات السرية المشتبه بهم لأسابيع.', 'mastery', 'C1', 'COCA'],
  ['tamper', 'verb', 'يعبث بالأدلة أو يتلاعب بها', 'It is illegal to tamper with evidence at a crime scene.', 'من غير القانوني العبث بالأدلة في مسرح الجريمة.', 'extended', 'B2', 'COCA'],
  ['trace', 'verb', 'يتتبع أثراً أو مصدراً', 'Forensic accountants trace money through bank records.', 'يتتبع محاسبو الطب الشرعي الأموال عبر السجلات المصرفية.', 'core', 'B2', 'COCA'],
];

// ============ UNIT 9: Archaeology ============
const unit9 = [
  ['excavate', 'verb', 'يُنقّب أو يحفر موقعاً أثرياً', 'Teams excavate ancient ruins layer by layer.', 'تُنقّب الفرق الأطلال القديمة طبقة بطبقة.', 'core', 'B2', 'AWL'],
  ['unearth', 'verb', 'يكتشف أو يستخرج من الأرض', 'Archaeologists unearth pottery fragments from the Bronze Age.', 'يكتشف علماء الآثار شظايا فخارية من العصر البرونزي.', 'extended', 'B2', 'COCA'],
  ['catalogue', 'verb', 'يُفهرس أو يُسجّل في قائمة منظمة', 'Researchers catalogue every artifact found at the site.', 'يُفهرس الباحثون كل قطعة أثرية وُجدت في الموقع.', 'extended', 'B2', 'COCA'],
  ['preserve', 'verb', 'يحافظ على شيء من التلف أو الاندثار', 'Museums preserve ancient manuscripts in climate-controlled rooms.', 'تحافظ المتاحف على المخطوطات القديمة في غرف مضبوطة المناخ.', 'core', 'B1', 'COCA'],
  ['restore', 'verb', 'يرمّم أو يُعيد إلى حالته الأصلية', 'Conservators restore damaged frescoes with great care.', 'يرمّم المرممون اللوحات الجدارية التالفة بعناية فائقة.', 'core', 'B2', 'COCA'],
  ['decipher', 'verb', 'يفك رموزاً أو كتابة قديمة', 'Scholars decipher hieroglyphics using the Rosetta Stone.', 'يفك العلماء رموز الهيروغليفية باستخدام حجر رشيد.', 'extended', 'C1', 'COCA'],
  ['date', 'verb', 'يُحدد عمر أو تاريخ قطعة أثرية', 'Carbon-14 methods date organic remains accurately.', 'تُحدد طرق الكربون-14 عمر البقايا العضوية بدقة.', 'core', 'B2', 'COCA'],
  ['classify', 'verb', 'يُصنّف حسب النوع أو الفترة الزمنية', 'Experts classify pottery by style and period.', 'يُصنّف الخبراء الفخار حسب الأسلوب والفترة.', 'core', 'B2', 'AWL'],
  ['document', 'verb', 'يُوثّق بالكتابة أو التصوير', 'Archaeologists document every stage of the excavation.', 'يُوثّق علماء الآثار كل مرحلة من مراحل التنقيب.', 'core', 'B1', 'AWL'],
  ['map', 'verb', 'يرسم خريطة لموقع أو منطقة', 'Surveyors map the burial site using GPS technology.', 'يرسم المساحون خريطة لموقع الدفن باستخدام تقنية GPS.', 'core', 'B2', 'COCA'],
  ['survey', 'verb', 'يمسح ميدانياً أو يستطلع منطقة', 'Teams survey the landscape before beginning to dig.', 'تمسح الفرق المنطقة قبل البدء بالحفر.', 'core', 'B2', 'AWL'],
  ['sift', 'verb', 'يغربل التراب للبحث عن قطع صغيرة', 'Workers sift through soil to find tiny artifacts.', 'يغربل العمال التراب للعثور على قطع أثرية صغيرة.', 'extended', 'B2', 'COCA'],
  ['reconstruct', 'verb', 'يُعيد بناء أو تركيب شيء مدمر', 'Digital tools reconstruct ancient buildings virtually.', 'تُعيد الأدوات الرقمية بناء المباني القديمة افتراضياً.', 'core', 'B2', 'AWL'],
  ['authenticate', 'verb', 'يتحقق من أصالة قطعة أثرية', 'Experts authenticate relics before museum display.', 'يتحقق الخبراء من أصالة الآثار قبل عرضها في المتحف.', 'extended', 'B2', 'COCA'],
  ['attribute', 'verb', 'يَنسب عملاً أو قطعة إلى حقبة أو صانع', 'Historians attribute the sculpture to a Roman workshop.', 'يَنسب المؤرخون المنحوتة إلى ورشة رومانية.', 'core', 'B2', 'AWL'],
  ['repatriate', 'verb', 'يُعيد آثاراً إلى بلدها الأصلي', 'Museums repatriate stolen artifacts to their home countries.', 'تُعيد المتاحف القطع الأثرية المسروقة إلى بلدانها الأصلية.', 'extended', 'C1', 'COCA'],
  ['conserve', 'verb', 'يصون ويحمي من التلف', 'Specialists conserve fragile textiles using modern techniques.', 'يصون المتخصصون المنسوجات الهشة باستخدام تقنيات حديثة.', 'core', 'B2', 'AWL'],
  ['interpret', 'verb', 'يُفسّر معنى أو دلالة اكتشاف أثري', 'Archaeologists interpret cave paintings as ritual art.', 'يُفسّر علماء الآثار رسوم الكهوف على أنها فن طقوسي.', 'core', 'B2', 'AWL'],
  ['illustrate', 'verb', 'يُوضّح بالرسم أو المخطط', 'Artists illustrate reconstruction plans for ancient sites.', 'يُوضّح الفنانون خطط إعادة بناء المواقع القديمة.', 'core', 'B2', 'COCA'],
  ['inscribe', 'verb', 'يَنقش كلمات أو رموزاً على سطح صلب', 'Ancient scribes inscribe texts on clay tablets.', 'ينقش الكتبة القدماء النصوص على ألواح الطين.', 'extended', 'B2', 'COCA'],
  ['engrave', 'verb', 'يَحفر رسوماً أو كتابة على مادة صلبة', 'Craftsmen engrave patterns on bronze vessels.', 'يَحفر الحرفيون أنماطاً على الأواني البرونزية.', 'extended', 'B2', 'COCA'],
  ['carve', 'verb', 'يَنحت في الخشب أو الحجر', 'Sculptors carve statues from blocks of marble.', 'يَنحت النحاتون التماثيل من كتل الرخام.', 'core', 'B2', 'COCA'],
  ['bury', 'verb', 'يَدفن في الأرض', 'Ancient cultures bury their dead with valuable offerings.', 'تَدفن الثقافات القديمة موتاها مع قرابين ثمينة.', 'core', 'B1', 'COCA'],
  ['entomb', 'verb', 'يضع في قبر أو ضريح', 'Pharaohs entomb treasures alongside their mummified remains.', 'يضع الفراعنة الكنوز بجانب رفاتهم المحنطة.', 'mastery', 'C1', 'COCA'],
  ['stratify', 'verb', 'يُقسّم إلى طبقات حسب العمق أو الزمن', 'Geologists stratify soil layers to date archaeological finds.', 'يُقسّم الجيولوجيون طبقات التربة لتحديد عمر الاكتشافات الأثرية.', 'mastery', 'C1', 'AWL'],
];

// ============ UNIT 10: Longevity ============
const unit10 = [
  ['regenerate', 'verb', 'يُجدد الأنسجة أو الخلايا', 'Stem cells regenerate damaged tissue in the body.', 'تُجدد الخلايا الجذعية الأنسجة التالفة في الجسم.', 'core', 'B2', 'AWL'],
  ['metabolize', 'verb', 'يُمثّل غذائياً أو يُحلّل المواد في الجسم', 'The liver metabolizes toxins and removes them from the blood.', 'يُمثّل الكبد السموم غذائياً ويزيلها من الدم.', 'extended', 'C1', 'COCA'],
  ['oxidize', 'verb', 'يتأكسد بالتفاعل مع الأكسجين', 'Free radicals oxidize cells and accelerate aging.', 'تتأكسد الخلايا بفعل الجذور الحرة مما يسرّع الشيخوخة.', 'extended', 'C1', 'COCA'],
  ['detoxify', 'verb', 'يُزيل السموم من الجسم', 'The kidneys detoxify the blood continuously.', 'تُزيل الكلى السموم من الدم باستمرار.', 'extended', 'B2', 'COCA'],
  ['supplement', 'verb', 'يُكمّل أو يُضيف مكمّلات غذائية', 'Many adults supplement their diet with omega-3 fatty acids.', 'يُكمّل كثير من البالغين نظامهم الغذائي بأحماض أوميغا-3.', 'core', 'B2', 'AWL'],
  ['fast', 'verb', 'يصوم أو يمتنع عن الطعام', 'Studies show that intermittent fasting can extend lifespan.', 'تُظهر الدراسات أن الصوم المتقطع يمكن أن يطيل العمر.', 'core', 'B1', 'COCA'],
  ['meditate', 'verb', 'يتأمل لتحقيق صفاء ذهني', 'People who meditate daily report lower stress levels.', 'يُبلغ الأشخاص الذين يتأملون يومياً عن مستويات أقل من التوتر.', 'core', 'B2', 'COCA'],
  ['rejuvenate', 'verb', 'يُجدد الشباب أو يُنعش', 'New therapies rejuvenate aging skin at the cellular level.', 'تُجدد العلاجات الجديدة الجلد المتقدم في العمر على المستوى الخلوي.', 'extended', 'C1', 'COCA'],
  ['degenerate', 'verb', 'يتدهور أو يضمحل تدريجياً', 'Without exercise, muscles degenerate over time.', 'بدون التمارين، تتدهور العضلات بمرور الوقت.', 'extended', 'B2', 'COCA'],
  ['atrophy', 'verb', 'يضمر أو يتقلص بسبب عدم الاستخدام', 'Unused muscles atrophy and lose their strength.', 'تضمر العضلات غير المستخدمة وتفقد قوتها.', 'mastery', 'C1', 'COCA'],
  ['calcify', 'verb', 'يتكلس بترسب الكالسيوم', 'Arteries calcify with age, reducing blood flow.', 'تتكلس الشرايين مع التقدم في العمر مما يقلل تدفق الدم.', 'mastery', 'C1', 'COCA'],
  ['inflame', 'verb', 'يلتهب أو يسبب التهاباً', 'Poor diet can inflame joints and organs.', 'يمكن للنظام الغذائي السيء أن يُسبب التهاب المفاصل والأعضاء.', 'core', 'B2', 'COCA'],
  ['inhibit', 'verb', 'يُثبّط أو يمنع عملية بيولوجية', 'Certain compounds inhibit the growth of cancer cells.', 'تُثبّط مركبات معينة نمو الخلايا السرطانية.', 'core', 'B2', 'AWL'],
  ['stimulate', 'verb', 'يُنشّط أو يُحفّز عملية حيوية', 'Exercise stimulates the production of new brain cells.', 'تُنشّط التمارين إنتاج خلايا دماغية جديدة.', 'core', 'B2', 'COCA'],
  ['proliferate', 'verb', 'يتكاثر أو ينتشر بسرعة', 'Healthy cells proliferate to repair wounds.', 'تتكاثر الخلايا السليمة لإصلاح الجروح.', 'extended', 'C1', 'COCA'],
  ['differentiate', 'verb', 'يتمايز أو يتخصص وظيفياً', 'Stem cells differentiate into specific tissue types.', 'تتمايز الخلايا الجذعية إلى أنواع أنسجة محددة.', 'core', 'B2', 'AWL'],
  ['nourish', 'verb', 'يُغذّي أو يمدّ بالعناصر اللازمة', 'A balanced diet nourishes the body and supports longevity.', 'يُغذّي النظام الغذائي المتوازن الجسم ويدعم طول العمر.', 'core', 'B2', 'COCA'],
  ['hydrate', 'verb', 'يُرطّب أو يمدّ بالماء', 'Drinking water regularly helps hydrate all body tissues.', 'يساعد شرب الماء بانتظام على ترطيب جميع أنسجة الجسم.', 'core', 'B2', 'COCA'],
  ['oxygenate', 'verb', 'يُشبع بالأكسجين', 'Deep breathing oxygenates the blood and boosts energy.', 'يُشبع التنفس العميق الدم بالأكسجين ويعزز الطاقة.', 'extended', 'C1', 'COCA'],
  ['rehabilitate', 'verb', 'يُعيد التأهيل بعد إصابة أو مرض', 'Physical therapy rehabilitates patients after surgery.', 'يُعيد العلاج الطبيعي تأهيل المرضى بعد الجراحة.', 'core', 'B2', 'COCA'],
  ['diagnose', 'verb', 'يُشخّص مبكراً للعلاج الوقائي', 'Screening tests diagnose age-related diseases early.', 'تُشخّص اختبارات الفحص أمراض الشيخوخة مبكراً.', 'core', 'B2', 'COCA'],
  ['transplant', 'verb', 'يزرع عضواً بديلاً في الجسم', 'Doctors transplant organs to extend patients\u2019 lives.', 'يزرع الأطباء أعضاء لإطالة حياة المرضى.', 'core', 'B2', 'COCA'],
  ['fortify', 'verb', 'يُقوّي الجسم بمكمّلات أو تمارين', 'Vitamins fortify the immune system against illness.', 'تُقوّي الفيتامينات جهاز المناعة ضد الأمراض.', 'extended', 'B2', 'COCA'],
  ['mutate', 'verb', 'يتحول جينياً مسبباً أمراضاً', 'Genes mutate over time and can trigger diseases.', 'تتحول الجينات بمرور الوقت ويمكن أن تُسبب أمراضاً.', 'extended', 'B2', 'COCA'],
  ['replicate', 'verb', 'تنسخ الخلايا نفسها أثناء الانقسام', 'Cells replicate their DNA during division.', 'تنسخ الخلايا حمضها النووي أثناء الانقسام.', 'core', 'B2', 'AWL'],
];

// ============ UNIT 11: Sustainable Architecture ============
const unit11 = [
  ['insulate', 'verb', 'يعزل المبنى حرارياً لتوفير الطاقة', 'Builders insulate walls with recycled materials.', 'يعزل البنّاؤون الجدران بمواد معاد تدويرها.', 'core', 'B2', 'COCA'],
  ['ventilate', 'verb', 'يُهوّي المبنى لتحسين جودة الهواء', 'Architects ventilate buildings using natural airflow.', 'يُهوّي المهندسون المعماريون المباني باستخدام تدفق الهواء الطبيعي.', 'core', 'B2', 'COCA'],
  ['retrofit', 'verb', 'يُحدّث مبنى قديماً بتقنيات جديدة', 'Cities retrofit old buildings to meet energy standards.', 'تُحدّث المدن المباني القديمة لتلبية معايير الطاقة.', 'extended', 'C1', 'COCA'],
  ['reclaim', 'verb', 'يستعيد أو يعيد استخدام مواد', 'Engineers reclaim bricks from demolished structures.', 'يستعيد المهندسون الطوب من المباني المهدومة.', 'extended', 'B2', 'COCA'],
  ['recycle', 'verb', 'يُعيد تدوير المواد لاستخدامها مجدداً', 'Green projects recycle concrete and steel waste.', 'تُعيد المشاريع الخضراء تدوير نفايات الخرسانة والفولاذ.', 'core', 'B1', 'COCA'],
  ['orient', 'verb', 'يُوجّه المبنى نحو اتجاه معين', 'Designers orient buildings southward to maximize sunlight.', 'يُوجّه المصممون المباني نحو الجنوب لزيادة ضوء الشمس.', 'extended', 'B2', 'AWL'],
  ['shade', 'verb', 'يُظلّل لتقليل حرارة الشمس', 'Overhangs shade windows during peak summer hours.', 'تُظلّل البروزات النوافذ خلال ساعات الذروة الصيفية.', 'core', 'B2', 'COCA'],
  ['glaze', 'verb', 'يُزجّج النوافذ بطبقات عازلة', 'Contractors glaze windows with double-pane glass.', 'يُزجّج المقاولون النوافذ بزجاج مزدوج الطبقات.', 'extended', 'C1', 'COCA'],
  ['seal', 'verb', 'يُحكم إغلاقاً لمنع تسرب الهواء', 'Workers seal gaps around doors to prevent drafts.', 'يُحكم العمال إغلاق الفجوات حول الأبواب لمنع التيارات.', 'core', 'B2', 'COCA'],
  ['weatherize', 'verb', 'يُحصّن المبنى ضد عوامل الطقس', 'Programs help homeowners weatherize their houses for winter.', 'تساعد البرامج أصحاب المنازل على تحصين بيوتهم ضد الشتاء.', 'mastery', 'C1', 'COCA'],
  ['prefabricate', 'verb', 'يُصنّع مسبقاً في المصنع قبل التركيب', 'Factories prefabricate wall panels for rapid assembly.', 'تُصنّع المصانع ألواح الجدران مسبقاً للتركيب السريع.', 'mastery', 'C1', 'COCA'],
  ['renovate', 'verb', 'يُجدّد أو يرمّم مبنى قائماً', 'Owners renovate heritage buildings to modern efficiency.', 'يُجدّد الملاك مباني التراث لتحقيق كفاءة حديثة.', 'core', 'B2', 'COCA'],
  ['demolish', 'verb', 'يهدم مبنى بالكامل', 'Cities demolish unsafe structures to make way for green spaces.', 'تهدم المدن المباني غير الآمنة لإفساح المجال للمساحات الخضراء.', 'core', 'B2', 'COCA'],
  ['construct', 'verb', 'يبني أو يُشيّد منشأة', 'Teams construct net-zero buildings using sustainable methods.', 'تبني الفرق مباني صفرية الانبعاثات بطرق مستدامة.', 'core', 'B1', 'AWL'],
  ['reinforce', 'verb', 'يُدعّم هيكلياً لزيادة المتانة', 'Engineers reinforce foundations with recycled steel.', 'يُدعّم المهندسون الأساسات بفولاذ معاد تدويره.', 'core', 'B2', 'AWL'],
  ['plaster', 'verb', 'يُجصّص الجدران بالملاط', 'Workers plaster interior walls with eco-friendly lime.', 'يُجصّص العمال الجدران الداخلية بالجير الصديق للبيئة.', 'extended', 'B2', 'COCA'],
  ['tile', 'verb', 'يُبلّط أرضية أو جداراً بالبلاط', 'Installers tile bathrooms with locally sourced ceramics.', 'يُبلّط المركّبون الحمامات بسيراميك محلي المصدر.', 'extended', 'B2', 'COCA'],
  ['wire', 'verb', 'يمدّ أسلاك الكهرباء في المبنى', 'Electricians wire homes for solar panel integration.', 'يمدّ الكهربائيون أسلاك المنازل لدمج الألواح الشمسية.', 'core', 'B2', 'COCA'],
  ['plumb', 'verb', 'يمدّ شبكة السباكة والأنابيب', 'Plumbers plumb buildings with water-saving fixtures.', 'يمدّ السباكون المباني بتجهيزات موفرة للمياه.', 'extended', 'B2', 'COCA'],
  ['landscape', 'verb', 'يُنسّق الحدائق والمساحات الخارجية', 'Designers landscape rooftops with native plants.', 'يُنسّق المصممون أسطح المباني بنباتات محلية.', 'extended', 'B2', 'COCA'],
  ['irrigate', 'verb', 'يروي المساحات الخضراء بنظام مائي', 'Smart systems irrigate gardens with recycled greywater.', 'تروي الأنظمة الذكية الحدائق بمياه رمادية معاد تدويرها.', 'extended', 'B2', 'COCA'],
  ['terrace', 'verb', 'يُنشئ مصاطب أو شرفات متدرجة', 'Architects terrace hillside buildings to reduce erosion.', 'يُنشئ المهندسون المعماريون مصاطب للمباني الجبلية لتقليل التآكل.', 'extended', 'C1', 'COCA'],
  ['harvest', 'verb', 'يجمع مياه الأمطار أو طاقة شمسية', 'Green roofs harvest rainwater for building reuse.', 'تجمع الأسطح الخضراء مياه الأمطار لإعادة استخدامها في المبنى.', 'core', 'B2', 'COCA'],
  ['modularize', 'verb', 'يُقسّم البناء إلى وحدات قابلة للتجميع', 'Firms modularize construction to reduce waste and time.', 'تُقسّم الشركات البناء إلى وحدات لتقليل النفايات والوقت.', 'mastery', 'C1', 'NAWL'],
  ['compost', 'verb', 'يُحوّل نفايات البناء العضوية إلى سماد', 'Green buildings compost organic waste on-site.', 'تُحوّل المباني الخضراء النفايات العضوية إلى سماد في الموقع.', 'extended', 'B2', 'COCA'],
];

// ============ UNIT 12: Exoplanets ============
const unit12 = [
  ['orbit', 'verb', 'يدور حول جسم فلكي', 'Exoplanets orbit distant stars in habitable zones.', 'تدور الكواكب الخارجية حول نجوم بعيدة في مناطق صالحة للحياة.', 'core', 'B2', 'COCA'],
  ['rotate', 'verb', 'يدور حول محوره الخاص', 'Some exoplanets rotate so slowly that one side is always dark.', 'تدور بعض الكواكب الخارجية ببطء شديد بحيث يبقى جانب واحد مظلماً دائماً.', 'core', 'B1', 'COCA'],
  ['revolve', 'verb', 'يدور في مدار حول مركز', 'Moons revolve around their host planets continuously.', 'تدور الأقمار حول كواكبها المضيفة باستمرار.', 'core', 'B2', 'COCA'],
  ['radiate', 'verb', 'يُشعّ طاقة أو حرارة', 'Hot Jupiters radiate extreme heat into space.', 'تُشعّ كواكب المشتري الحارة حرارة شديدة في الفضاء.', 'core', 'B2', 'COCA'],
  ['eclipse', 'verb', 'يحجب أو يكسف جرماً سماوياً', 'When a planet eclipses its star, the light dims briefly.', 'عندما يحجب كوكب نجمه، يخفت الضوء لفترة وجيزة.', 'extended', 'B2', 'COCA'],
  ['collide', 'verb', 'يصطدم بجسم آخر في الفضاء', 'Asteroids sometimes collide with planets causing massive craters.', 'تصطدم الكويكبات أحياناً بالكواكب مسببة فوهات ضخمة.', 'core', 'B2', 'COCA'],
  ['fragment', 'verb', 'يتفتت إلى أجزاء صغيرة', 'Comets fragment when they pass too close to a star.', 'تتفتت المذنبات عندما تمر قريبة جداً من نجم.', 'extended', 'B2', 'COCA'],
  ['ionize', 'verb', 'يُؤيّن أو يُحوّل إلى أيونات', 'Stellar radiation ionizes the atmosphere of nearby planets.', 'يُؤيّن إشعاع النجم الغلاف الجوي للكواكب القريبة.', 'mastery', 'C1', 'COCA'],
  ['magnetize', 'verb', 'يُمغنط أو يكتسب مجالاً مغناطيسياً', 'A planet\u2019s core must magnetize to deflect solar wind.', 'يجب أن يتمغنط لب الكوكب لصد الرياح الشمسية.', 'extended', 'C1', 'COCA'],
  ['gravitate', 'verb', 'ينجذب بفعل الجاذبية', 'Dust particles gravitate toward larger bodies to form planets.', 'تنجذب جسيمات الغبار نحو أجسام أكبر لتشكيل الكواكب.', 'extended', 'B2', 'COCA'],
  ['accelerate', 'verb', 'يُسرّع حركة جسم في الفضاء', 'Gravity assists accelerate spacecraft toward distant targets.', 'تُسرّع مساعدات الجاذبية المركبات الفضائية نحو أهداف بعيدة.', 'core', 'B2', 'COCA'],
  ['decelerate', 'verb', 'يُبطئ السرعة تدريجياً', 'Probes must decelerate before entering orbit.', 'يجب أن تُبطئ المسابير سرعتها قبل الدخول في المدار.', 'extended', 'B2', 'COCA'],
  ['launch', 'verb', 'يُطلق مركبة فضائية أو قمراً صناعياً', 'Agencies launch telescopes to study distant worlds.', 'تُطلق الوكالات تلسكوبات لدراسة العوالم البعيدة.', 'core', 'B1', 'COCA'],
  ['deploy', 'verb', 'ينشر أو يُوظّف معدات في الفضاء', 'Engineers deploy solar panels on space observatories.', 'ينشر المهندسون ألواحاً شمسية على المراصد الفضائية.', 'core', 'B2', 'COCA'],
  ['dock', 'verb', 'يرسو أو يتصل بمحطة فضائية', 'Spacecraft dock with the space station for resupply.', 'ترسو المركبات الفضائية بمحطة الفضاء لإعادة التزويد.', 'extended', 'B2', 'COCA'],
  ['transmit', 'verb', 'يُرسل إشارات أو بيانات عبر الفضاء', 'Probes transmit data back to Earth over radio waves.', 'تُرسل المسابير البيانات إلى الأرض عبر موجات الراديو.', 'core', 'B2', 'COCA'],
  ['calibrate', 'verb', 'يُعاير أجهزة لقياس دقيق', 'Scientists calibrate instruments before deep-space observation.', 'يُعاير العلماء الأجهزة قبل رصد الفضاء العميق.', 'extended', 'C1', 'AWL'],
  ['image', 'verb', 'يلتقط صوراً لأجرام سماوية', 'Telescopes image exoplanets using advanced optics.', 'تلتقط التلسكوبات صوراً للكواكب الخارجية باستخدام بصريات متقدمة.', 'extended', 'B2', 'COCA'],
  ['scan', 'verb', 'يمسح أو يفحص منطقة من الفضاء', 'Satellites scan star systems for habitable planets.', 'تمسح الأقمار الصناعية الأنظمة النجمية بحثاً عن كواكب صالحة للحياة.', 'core', 'B2', 'COCA'],
  ['probe', 'verb', 'يستكشف بمسبار أو أداة علمية', 'Missions probe the atmospheres of gas giants.', 'تستكشف البعثات الأغلفة الجوية للعمالقة الغازية.', 'core', 'B2', 'COCA'],
  ['sample', 'verb', 'يأخذ عينة للتحليل العلمي', 'Rovers sample soil from planetary surfaces.', 'تأخذ المركبات الجوالة عينات من تربة أسطح الكواكب.', 'core', 'B2', 'COCA'],
  ['terraform', 'verb', 'يُحوّل بيئة كوكب لتناسب الحياة البشرية', 'Scientists theorize ways to terraform Mars for habitation.', 'يُنظّر العلماء طرقاً لتحويل بيئة المريخ لتناسب السكن.', 'mastery', 'C1', 'COCA'],
  ['colonize', 'verb', 'يستعمر أو يُقيم مستوطنات', 'Humanity may colonize nearby exoplanets in the future.', 'قد يستعمر البشر كواكب خارجية قريبة في المستقبل.', 'core', 'B2', 'COCA'],
  ['pressurize', 'verb', 'يضغط مقصورة لتوفير بيئة ملائمة', 'Engineers pressurize habitats on Mars to sustain life.', 'يضغط المهندسون المساكن على المريخ للحفاظ على الحياة.', 'extended', 'C1', 'COCA'],
  ['map', 'verb', 'يرسم خريطة لسطح كوكب خارجي', 'Satellites map the surface features of distant planets.', 'ترسم الأقمار الصناعية خريطة لمعالم سطح الكواكب البعيدة.', 'core', 'B2', 'COCA'],
];

// ============ MAIN ============
async function main() {
  const client = await pool.connect();
  const batchId = 18;
  const allUnits = [
    { data: unit1, unit: 1, name: 'Bioethics' },
    { data: unit2, unit: 2, name: 'Deep Ocean' },
    { data: unit3, unit: 3, name: 'Food Security' },
    { data: unit4, unit: 4, name: 'Biomimicry' },
    { data: unit5, unit: 5, name: 'Migration' },
    { data: unit6, unit: 6, name: 'Cryptocurrency' },
    { data: unit7, unit: 7, name: 'Crowd Psychology' },
    { data: unit8, unit: 8, name: 'Forensic Science' },
    { data: unit9, unit: 9, name: 'Archaeology' },
    { data: unit10, unit: 10, name: 'Longevity' },
    { data: unit11, unit: 11, name: 'Sustainable Architecture' },
    { data: unit12, unit: 12, name: 'Exoplanets' },
  ];

  let totalInserted = 0;
  try {
    for (const u of allUnits) {
      const count = await insertBatch(client, u.data, u.unit, batchId);
      console.log(`Unit ${u.unit} (${u.name}): ${count} words inserted (${u.data.length} provided)`);
      totalInserted += count;
    }
    console.log(`\n=== Total inserted: ${totalInserted} ===\n`);

    // Query final totals per unit
    const result = await client.query(
      `SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [batchId]
    );
    console.log('--- Final DB totals for batch 18 ---');
    let dbTotal = 0;
    for (const row of result.rows) {
      console.log(`  Unit ${row.recommended_unit}: ${row.cnt} words`);
      dbTotal += parseInt(row.cnt);
    }
    console.log(`  Overall: ${dbTotal} words`);
  } catch (e) {
    console.error('Fatal error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
