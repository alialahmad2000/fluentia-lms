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

// ── Unit 1: Bioethics ──
const unit1 = [
  ['hereditary', 'adjective', 'وراثي؛ ينتقل من الآباء إلى الأبناء', 'The disease is hereditary and runs in families.', 'المرض وراثي وينتشر في العائلات.', 'core', 'B2', 'COCA'],
  ['congenital', 'adjective', 'خِلقي؛ موجود منذ الولادة', 'The baby was born with a congenital heart defect.', 'وُلد الطفل بعيب خِلقي في القلب.', 'extended', 'C1', 'COCA'],
  ['pathogenic', 'adjective', 'مُمرِض؛ مسبّب للأمراض', 'Pathogenic bacteria can cause serious infections.', 'يمكن للبكتيريا المُمرِضة أن تسبّب عدوى خطيرة.', 'mastery', 'C1', 'AWL'],
  ['autoimmune', 'adjective', 'مناعي ذاتي؛ يهاجم فيه الجسم نفسه', 'Lupus is an autoimmune disorder.', 'الذئبة مرض مناعي ذاتي.', 'extended', 'B2', 'COCA'],
  ['chromosomal', 'adjective', 'كروموسومي؛ متعلّق بالصبغيات', 'Down syndrome is caused by a chromosomal abnormality.', 'متلازمة داون ناتجة عن خلل كروموسومي.', 'mastery', 'C1', 'AWL'],
  ['sterile', 'adjective', 'مُعقَّم؛ خالٍ من الجراثيم', 'All surgical instruments must be sterile.', 'يجب أن تكون جميع الأدوات الجراحية مُعقَّمة.', 'core', 'B2', 'CEFR-J'],
  ['viable', 'adjective', 'قابل للحياة؛ ممكن التطبيق', 'The embryo is viable after 24 weeks.', 'يصبح الجنين قابلاً للحياة بعد 24 أسبوعاً.', 'core', 'B2', 'AWL'],
  ['benign', 'adjective', 'حميد؛ غير خبيث', 'Fortunately, the tumor was benign.', 'لحسن الحظ، كان الورم حميداً.', 'core', 'B2', 'COCA'],
  ['malignant', 'adjective', 'خبيث؛ سرطاني ومنتشر', 'The biopsy revealed a malignant growth.', 'كشفت الخزعة عن ورم خبيث.', 'extended', 'B2', 'COCA'],
  ['dormant', 'adjective', 'خامل؛ غير نشط مؤقتاً', 'The virus can remain dormant for years.', 'يمكن أن يبقى الفيروس خاملاً لسنوات.', 'core', 'B2', 'CEFR-J'],
  ['synthetic', 'adjective', 'اصطناعي؛ مُصنَّع وليس طبيعياً', 'Scientists created synthetic insulin in the lab.', 'أنتج العلماء الأنسولين الاصطناعي في المختبر.', 'core', 'B2', 'CEFR-J'],
  ['intravenous', 'adjective', 'وريدي؛ يُعطى عبر الوريد', 'The patient received intravenous fluids.', 'تلقّى المريض سوائل وريدية.', 'extended', 'C1', 'COCA'],
  ['prenatal', 'adjective', 'قبل الولادة؛ سابق للولادة', 'Prenatal care is essential for a healthy pregnancy.', 'الرعاية قبل الولادة ضرورية لحمل صحي.', 'core', 'B2', 'COCA'],
  ['postnatal', 'adjective', 'بعد الولادة؛ لاحق للولادة', 'Postnatal depression affects many new mothers.', 'يصيب اكتئاب ما بعد الولادة كثيراً من الأمهات الجدد.', 'core', 'B2', 'COCA'],
  ['clinical', 'adjective', 'سريري؛ متعلّق بالعلاج الطبي المباشر', 'Clinical trials confirmed the drug is safe.', 'أكّدت التجارب السريرية أن الدواء آمن.', 'core', 'B1', 'CEFR-J'],
  ['therapeutic', 'adjective', 'علاجي؛ ذو فائدة طبية', 'Music can have therapeutic effects on patients.', 'يمكن أن يكون للموسيقى تأثيرات علاجية على المرضى.', 'core', 'B2', 'AWL'],
  ['pharmaceutical', 'adjective', 'صيدلاني؛ متعلّق بصناعة الأدوية', 'The pharmaceutical industry invests billions in research.', 'تستثمر الصناعة الصيدلانية المليارات في البحث.', 'extended', 'B2', 'AWL'],
  ['carcinogenic', 'adjective', 'مُسرطِن؛ مسبّب للسرطان', 'Asbestos is a known carcinogenic substance.', 'الأسبستوس مادة مُسرطِنة معروفة.', 'mastery', 'C1', 'COCA'],
  ['neurological', 'adjective', 'عصبي؛ متعلّق بالجهاز العصبي', 'Alzheimer is a neurological disease.', 'الزهايمر مرض عصبي.', 'extended', 'B2', 'COCA'],
  ['embryonic', 'adjective', 'جنيني؛ في مرحلة مبكرة جداً', 'Embryonic stem cells have great medical potential.', 'للخلايا الجذعية الجنينية إمكانات طبية كبيرة.', 'extended', 'B2', 'AWL'],
  ['cellular', 'adjective', 'خلوي؛ متعلّق بالخلايا', 'Cellular damage can lead to disease.', 'يمكن أن يؤدي التلف الخلوي إلى المرض.', 'core', 'B2', 'COCA'],
  ['microbial', 'adjective', 'ميكروبي؛ متعلّق بالكائنات الدقيقة', 'Microbial contamination made the water unsafe.', 'جعل التلوث الميكروبي الماء غير آمن.', 'extended', 'B2', 'AWL'],
  ['infectious', 'adjective', 'مُعدٍ؛ ينتقل من شخص لآخر', 'Covid-19 is highly infectious.', 'كوفيد-19 شديد العدوى.', 'core', 'B1', 'CEFR-J'],
  ['antibiotic-resistant', 'adjective', 'مقاوم للمضادات الحيوية', 'Antibiotic-resistant bacteria are a global threat.', 'البكتيريا المقاومة للمضادات الحيوية تهديد عالمي.', 'mastery', 'academic', 'COCA'],
  ['organic', 'adjective', 'عضوي؛ طبيعي بدون مواد كيميائية', 'Organic farming avoids synthetic pesticides.', 'تتجنّب الزراعة العضوية المبيدات الاصطناعية.', 'core', 'B1', 'CEFR-J'],
];

// ── Unit 2: Deep Ocean ──
const unit2 = [
  ['abyssal', 'adjective', 'سحيق؛ متعلّق بأعمق مناطق المحيط', 'Abyssal plains cover vast areas of the ocean floor.', 'تغطي السهول السحيقة مساحات شاسعة من قاع المحيط.', 'mastery', 'C1', 'COCA'],
  ['pelagic', 'adjective', 'بحري سطحي؛ متعلّق بالمياه المفتوحة', 'Pelagic fish live in open water, not near the seabed.', 'تعيش الأسماك البحرية السطحية في المياه المفتوحة.', 'mastery', 'C1', 'COCA'],
  ['benthic', 'adjective', 'قاعي؛ متعلّق بقاع البحر', 'Benthic organisms live on the ocean floor.', 'تعيش الكائنات القاعية في قاع المحيط.', 'mastery', 'academic', 'AWL'],
  ['bioluminescent', 'adjective', 'متوهّج حيوياً؛ يُنتج ضوءاً طبيعياً', 'Many deep-sea creatures are bioluminescent.', 'كثير من كائنات أعماق البحار متوهّجة حيوياً.', 'extended', 'C1', 'COCA'],
  ['saline', 'adjective', 'ملحي؛ يحتوي على ملح', 'The saline water of the ocean is undrinkable.', 'مياه المحيط المالحة غير صالحة للشرب.', 'core', 'B2', 'COCA'],
  ['brackish', 'adjective', 'مائل للملوحة؛ مزيج من عذب ومالح', 'Brackish water is found where rivers meet the sea.', 'توجد المياه المائلة للملوحة حيث تلتقي الأنهار بالبحر.', 'extended', 'B2', 'NAWL'],
  ['tidal', 'adjective', 'مَدّي؛ متعلّق بالمد والجزر', 'Tidal energy is a promising renewable source.', 'طاقة المد والجزر مصدر متجدد واعد.', 'core', 'B2', 'CEFR-J'],
  ['volcanic', 'adjective', 'بركاني؛ ناتج عن البراكين', 'Volcanic vents on the ocean floor release hot water.', 'تطلق الفوّهات البركانية في قاع المحيط ماءً ساخناً.', 'core', 'B1', 'CEFR-J'],
  ['seismic', 'adjective', 'زلزالي؛ متعلّق بالزلازل', 'Seismic activity under the ocean can cause tsunamis.', 'يمكن أن يسبّب النشاط الزلزالي تحت المحيط أمواج تسونامي.', 'core', 'B2', 'AWL'],
  ['geothermal', 'adjective', 'حراري أرضي؛ ناتج عن حرارة باطن الأرض', 'Geothermal vents support unique ecosystems.', 'تدعم الفوّهات الحرارية الأرضية أنظمة بيئية فريدة.', 'extended', 'B2', 'COCA'],
  ['aquatic', 'adjective', 'مائي؛ يعيش أو يحدث في الماء', 'Whales are the largest aquatic mammals.', 'الحيتان هي أكبر الثدييات المائية.', 'core', 'B1', 'CEFR-J'],
  ['marine', 'adjective', 'بحري؛ متعلّق بالبحر', 'Marine pollution threatens coral reefs.', 'يهدد التلوث البحري الشعاب المرجانية.', 'core', 'B1', 'CEFR-J'],
  ['oceanic', 'adjective', 'محيطي؛ متعلّق بالمحيطات', 'Oceanic currents regulate global climate.', 'تنظّم التيارات المحيطية المناخ العالمي.', 'core', 'B2', 'COCA'],
  ['coastal', 'adjective', 'ساحلي؛ قريب من الشاطئ', 'Coastal cities face rising sea levels.', 'تواجه المدن الساحلية ارتفاع مستوى سطح البحر.', 'core', 'B1', 'CEFR-J'],
  ['frigid', 'adjective', 'شديد البرودة؛ متجمّد', 'The frigid waters of the Arctic host polar bears.', 'تستضيف مياه القطب الشمالي الباردة جداً الدببة القطبية.', 'extended', 'B2', 'COCA'],
  ['turbulent', 'adjective', 'مضطرب؛ شديد التقلّب', 'Turbulent ocean currents make diving dangerous.', 'تجعل التيارات المحيطية المضطربة الغوص خطيراً.', 'core', 'B2', 'COCA'],
  ['stagnant', 'adjective', 'راكد؛ لا يتحرّك ولا يتدفّق', 'Stagnant water becomes a breeding ground for mosquitoes.', 'يصبح الماء الراكد بيئة لتكاثر البعوض.', 'core', 'B2', 'NAWL'],
  ['murky', 'adjective', 'عكر؛ مظلم وغير صافٍ', 'Visibility is poor in murky deep-sea waters.', 'الرؤية ضعيفة في مياه أعماق البحار العكرة.', 'core', 'B2', 'COCA'],
  ['translucent', 'adjective', 'شبه شفاف؛ يسمح بمرور بعض الضوء', 'Some deep-sea jellyfish have translucent bodies.', 'بعض قناديل البحر العميقة لها أجسام شبه شفافة.', 'extended', 'B2', 'COCA'],
  ['pressurized', 'adjective', 'مضغوط؛ تحت ضغط عالٍ', 'Deep-sea environments are highly pressurized.', 'بيئات أعماق البحار مضغوطة للغاية.', 'extended', 'B2', 'COCA'],
  ['subaquatic', 'adjective', 'تحت مائي؛ موجود أسفل سطح الماء', 'Subaquatic caves contain rare mineral formations.', 'تحتوي الكهوف تحت المائية على تشكيلات معدنية نادرة.', 'mastery', 'academic', 'NAWL'],
  ['sedimentary', 'adjective', 'رسوبي؛ مكوَّن من طبقات الترسّب', 'Sedimentary layers reveal millions of years of history.', 'تكشف الطبقات الرسوبية ملايين السنين من التاريخ.', 'extended', 'B2', 'AWL'],
  ['tropical', 'adjective', 'استوائي؛ متعلّق بالمناطق الحارة', 'Tropical oceans host the most diverse marine life.', 'تستضيف المحيطات الاستوائية أكثر الحياة البحرية تنوعاً.', 'core', 'B1', 'CEFR-J'],
  ['polar', 'adjective', 'قطبي؛ متعلّق بالقطبين', 'Polar waters are rich in nutrients.', 'المياه القطبية غنية بالعناصر الغذائية.', 'core', 'B2', 'CEFR-J'],
  ['submersible', 'adjective', 'قابل للغمر؛ يمكن أن يعمل تحت الماء', 'Submersible vehicles explore the deepest trenches.', 'تستكشف المركبات القابلة للغمر أعمق الخنادق.', 'extended', 'B2', 'COCA'],
];

// ── Unit 3: Food Security ──
const unit3 = [
  ['arable', 'adjective', 'صالح للزراعة؛ قابل للحراثة', 'Only a fraction of the land is arable.', 'جزء صغير فقط من الأرض صالح للزراعة.', 'core', 'B2', 'AWL'],
  ['fertile', 'adjective', 'خصب؛ غني بالعناصر الغذائية', 'The Nile Delta has fertile soil.', 'تمتلك دلتا النيل تربة خصبة.', 'core', 'B2', 'CEFR-J'],
  ['barren', 'adjective', 'قاحل؛ لا ينمو فيه شيء', 'Overfarming turned the land barren.', 'حوّلت الزراعة المفرطة الأرض إلى أرض قاحلة.', 'core', 'B2', 'COCA'],
  ['drought-resistant', 'adjective', 'مقاوم للجفاف', 'Scientists developed drought-resistant crop varieties.', 'طوّر العلماء أصنافاً من المحاصيل مقاومة للجفاف.', 'extended', 'B2', 'COCA'],
  ['nutritious', 'adjective', 'مغذٍّ؛ غني بالقيمة الغذائية', 'Children need nutritious meals for healthy growth.', 'يحتاج الأطفال إلى وجبات مغذّية للنمو الصحي.', 'core', 'B1', 'CEFR-J'],
  ['caloric', 'adjective', 'حراري؛ متعلّق بالسعرات الحرارية', 'Rice has a high caloric value.', 'يتميّز الأرز بقيمة حرارية عالية.', 'extended', 'B2', 'COCA'],
  ['perishable', 'adjective', 'قابل للتلف؛ سريع الفساد', 'Perishable goods must be refrigerated.', 'يجب تبريد البضائع القابلة للتلف.', 'core', 'B2', 'NAWL'],
  ['genetically-modified', 'adjective', 'معدَّل وراثياً', 'Genetically-modified crops divide public opinion.', 'تقسّم المحاصيل المعدَّلة وراثياً الرأي العام.', 'extended', 'B2', 'COCA'],
  ['sustainable', 'adjective', 'مستدام؛ يمكن الاستمرار فيه', 'Sustainable farming protects the environment.', 'تحمي الزراعة المستدامة البيئة.', 'core', 'B2', 'AWL'],
  ['intensive', 'adjective', 'مكثّف؛ يستخدم موارد كثيرة', 'Intensive farming maximizes output per hectare.', 'تُعظّم الزراعة المكثّفة الإنتاج لكل هكتار.', 'core', 'B2', 'AWL'],
  ['irrigated', 'adjective', 'مروي؛ يُسقى بنظام ري', 'Irrigated fields produce more than rain-fed ones.', 'تنتج الحقول المروية أكثر من تلك المعتمدة على المطر.', 'core', 'B2', 'COCA'],
  ['rain-fed', 'adjective', 'بعلي؛ يعتمد على مياه الأمطار فقط', 'Rain-fed agriculture is vulnerable to climate change.', 'الزراعة البعلية معرّضة لتأثيرات تغيّر المناخ.', 'extended', 'B2', 'NAWL'],
  ['staple', 'adjective', 'أساسي؛ رئيسي في النظام الغذائي', 'Rice is a staple food in many Asian countries.', 'الأرز غذاء أساسي في كثير من الدول الآسيوية.', 'core', 'B1', 'CEFR-J'],
  ['leguminous', 'adjective', 'بقولي؛ من فصيلة البقوليات', 'Leguminous plants fix nitrogen in the soil.', 'تُثبّت النباتات البقولية النيتروجين في التربة.', 'mastery', 'academic', 'AWL'],
  ['temperate', 'adjective', 'معتدل المناخ', 'Wheat grows best in temperate climates.', 'ينمو القمح بشكل أفضل في المناخات المعتدلة.', 'core', 'B2', 'COCA'],
  ['arid', 'adjective', 'جاف جداً؛ شحيح المطر', 'Arid regions struggle with food production.', 'تعاني المناطق الجافة من صعوبة إنتاج الغذاء.', 'core', 'B2', 'COCA'],
  ['semi-arid', 'adjective', 'شبه جاف؛ قليل الأمطار', 'Semi-arid zones receive limited rainfall.', 'تتلقّى المناطق شبه الجافة أمطاراً محدودة.', 'extended', 'B2', 'AWL'],
  ['waterlogged', 'adjective', 'مشبّع بالماء؛ غارق', 'Waterlogged soil prevents root growth.', 'تمنع التربة المشبّعة بالماء نمو الجذور.', 'extended', 'B2', 'NAWL'],
  ['alkaline', 'adjective', 'قلوي؛ ذو درجة حموضة مرتفعة', 'Alkaline soil is unsuitable for some crops.', 'التربة القلوية غير مناسبة لبعض المحاصيل.', 'extended', 'B2', 'COCA'],
  ['processed', 'adjective', 'مُعالَج؛ مُصنَّع غذائياً', 'Processed food often contains too much salt.', 'غالباً ما يحتوي الطعام المُعالَج على كثير من الملح.', 'core', 'B1', 'CEFR-J'],
  ['extensive', 'adjective', 'واسع النطاق؛ يستخدم مساحات كبيرة', 'Extensive farming uses large areas with low input.', 'تستخدم الزراعة الواسعة مساحات كبيرة بمدخلات قليلة.', 'core', 'B2', 'AWL'],
  ['cereal', 'adjective', 'حبوبي؛ متعلّق بالحبوب', 'Cereal crops include wheat, rice, and maize.', 'تشمل المحاصيل الحبوبية القمح والأرز والذرة.', 'core', 'B1', 'CEFR-J'],
  ['subsistence', 'adjective', 'كفافي؛ يكفي بالكاد للبقاء', 'Subsistence farming barely feeds the family.', 'بالكاد تطعم الزراعة الكفافية الأسرة.', 'extended', 'B2', 'AWL'],
  ['malnourished', 'adjective', 'يعاني من سوء التغذية', 'Millions of children worldwide are malnourished.', 'يعاني ملايين الأطفال حول العالم من سوء التغذية.', 'extended', 'B2', 'COCA'],
  ['transgenic', 'adjective', 'مُحوَّر جينياً؛ يحمل جينات من كائن آخر', 'Transgenic crops can resist certain pests.', 'يمكن للمحاصيل المُحوَّرة جينياً مقاومة بعض الآفات.', 'mastery', 'academic', 'AWL'],
];

// ── Unit 4: Biomimicry ──
const unit4 = [
  ['aerodynamic', 'adjective', 'ديناميكي هوائي؛ انسيابي', 'The car has an aerodynamic shape to reduce drag.', 'للسيارة شكل انسيابي لتقليل المقاومة.', 'core', 'B2', 'COCA'],
  ['hydrophobic', 'adjective', 'كاره للماء؛ طارد للمياه', 'Lotus leaves have a hydrophobic surface.', 'لأوراق اللوتس سطح كاره للماء.', 'mastery', 'C1', 'AWL'],
  ['hydrophilic', 'adjective', 'محبّ للماء؛ يمتص الرطوبة', 'Hydrophilic materials absorb water easily.', 'تمتص المواد المحبّة للماء الرطوبة بسهولة.', 'mastery', 'C1', 'AWL'],
  ['fibrous', 'adjective', 'ليفي؛ مكوَّن من ألياف', 'Spider silk is a strong fibrous material.', 'حرير العنكبوت مادة ليفية قوية.', 'extended', 'B2', 'COCA'],
  ['porous', 'adjective', 'مسامي؛ به ثقوب دقيقة', 'Bone is a lightweight porous structure.', 'العظم بنية مسامية خفيفة الوزن.', 'core', 'B2', 'COCA'],
  ['elastic', 'adjective', 'مرن؛ يعود لشكله الأصلي', 'Tendons are elastic connective tissues.', 'الأوتار أنسجة ضامّة مرنة.', 'core', 'B2', 'CEFR-J'],
  ['rigid', 'adjective', 'صلب؛ غير قابل للثني', 'The exoskeleton of beetles is rigid and protective.', 'الهيكل الخارجي للخنافس صلب وواقٍ.', 'core', 'B2', 'CEFR-J'],
  ['brittle', 'adjective', 'هش؛ سهل الكسر', 'Dry leaves become brittle in autumn.', 'تصبح الأوراق الجافة هشّة في الخريف.', 'core', 'B2', 'COCA'],
  ['malleable', 'adjective', 'قابل للطرق؛ يمكن تشكيله', 'Gold is one of the most malleable metals.', 'الذهب من أكثر المعادن قابلية للطرق.', 'extended', 'B2', 'COCA'],
  ['ductile', 'adjective', 'قابل للسحب؛ يمكن تمديده كسلك', 'Copper is ductile and can be drawn into wires.', 'النحاس قابل للسحب ويمكن تمديده كأسلاك.', 'mastery', 'C1', 'NAWL'],
  ['tensile', 'adjective', 'شدّي؛ متعلّق بقوة الشد', 'Spider silk has remarkable tensile strength.', 'يتميّز حرير العنكبوت بقوة شدّ استثنائية.', 'mastery', 'academic', 'AWL'],
  ['adhesive', 'adjective', 'لاصق؛ قادر على الالتصاق', 'Gecko feet have adhesive properties.', 'لأقدام الأبراص خصائص لاصقة.', 'core', 'B2', 'COCA'],
  ['luminescent', 'adjective', 'متلألئ؛ يُصدر ضوءاً بدون حرارة', 'Fireflies are luminescent insects.', 'اليراعات حشرات متلألئة.', 'extended', 'B2', 'COCA'],
  ['transparent', 'adjective', 'شفاف؛ يُرى من خلاله', 'Some frogs have nearly transparent skin.', 'بعض الضفادع لها جلد شبه شفاف.', 'core', 'B1', 'CEFR-J'],
  ['opaque', 'adjective', 'مُعتم؛ لا يمرّ منه الضوء', 'The opaque shell protects the turtle from sunlight.', 'يحمي الصَّدَفة المُعتمة السلحفاة من أشعة الشمس.', 'core', 'B2', 'COCA'],
  ['reflective', 'adjective', 'عاكس؛ يعكس الضوء أو الصوت', 'Reflective scales help fish camouflage in water.', 'تساعد القشور العاكسة الأسماك على التمويه في الماء.', 'core', 'B2', 'COCA'],
  ['absorbent', 'adjective', 'ماص؛ قادر على امتصاص السوائل', 'Sponges are highly absorbent organisms.', 'الإسفنج كائنات شديدة الامتصاص.', 'core', 'B2', 'NAWL'],
  ['biodegradable', 'adjective', 'قابل للتحلّل الحيوي', 'Biomimicry inspires biodegradable packaging.', 'تُلهم المحاكاة الحيوية التغليف القابل للتحلّل.', 'core', 'B2', 'COCA'],
  ['composite', 'adjective', 'مركّب؛ مكوَّن من عدة مواد', 'Bone is a composite of minerals and protein.', 'العظم مادة مركّبة من معادن وبروتين.', 'extended', 'B2', 'AWL'],
  ['layered', 'adjective', 'طبقي؛ مكوَّن من طبقات', 'Nacre has a layered microstructure.', 'لعرق اللؤلؤ بنية مجهرية طبقية.', 'core', 'B2', 'COCA'],
  ['segmented', 'adjective', 'مُجزّأ؛ مقسّم إلى أجزاء', 'Insects have segmented bodies.', 'للحشرات أجسام مُجزّأة.', 'extended', 'B2', 'COCA'],
  ['hexagonal', 'adjective', 'سداسي الشكل', 'Beehives have a hexagonal pattern.', 'لخلايا النحل نمط سداسي.', 'extended', 'B2', 'NAWL'],
  ['spiral', 'adjective', 'حلزوني؛ لولبي الشكل', 'Shells often have a spiral structure.', 'غالباً ما يكون للأصداف بنية حلزونية.', 'core', 'B2', 'COCA'],
  ['abrasive', 'adjective', 'كاشط؛ خشن السطح', 'Shark skin has an abrasive texture.', 'لجلد القرش ملمس كاشط.', 'extended', 'B2', 'COCA'],
  ['streamlined', 'adjective', 'انسيابي؛ مصمّم لتقليل المقاومة', 'Dolphins have streamlined bodies for fast swimming.', 'للدلافين أجسام انسيابية للسباحة السريعة.', 'core', 'B2', 'COCA'],
];

// ── Unit 5: Migration ──
const unit5 = [
  ['undocumented', 'adjective', 'غير موثّق؛ بدون أوراق رسمية', 'Undocumented migrants often face exploitation.', 'غالباً ما يواجه المهاجرون غير الموثّقين الاستغلال.', 'core', 'B2', 'COCA'],
  ['stateless', 'adjective', 'عديم الجنسية؛ بدون مواطنة', 'Stateless people lack basic legal rights.', 'يفتقر عديمو الجنسية إلى الحقوق القانونية الأساسية.', 'extended', 'B2', 'NAWL'],
  ['displaced', 'adjective', 'مُهجَّر؛ مُبعَد عن وطنه', 'Millions of displaced people live in refugee camps.', 'يعيش ملايين المُهجَّرين في مخيمات اللاجئين.', 'core', 'B2', 'COCA'],
  ['indigenous', 'adjective', 'أصلي؛ من السكان الأصليين', 'Indigenous communities have unique cultural traditions.', 'للمجتمعات الأصلية تقاليد ثقافية فريدة.', 'core', 'B2', 'AWL'],
  ['ethnic', 'adjective', 'عِرقي؛ متعلّق بمجموعة ثقافية', 'Ethnic diversity enriches a society.', 'يُثري التنوع العِرقي المجتمع.', 'core', 'B2', 'AWL'],
  ['multicultural', 'adjective', 'متعدّد الثقافات', 'Toronto is one of the most multicultural cities.', 'تورنتو واحدة من أكثر المدن تعدّداً للثقافات.', 'core', 'B1', 'CEFR-J'],
  ['bilingual', 'adjective', 'ثنائي اللغة', 'Canada is officially a bilingual country.', 'كندا رسمياً بلد ثنائي اللغة.', 'core', 'B1', 'CEFR-J'],
  ['transnational', 'adjective', 'عابر للحدود؛ يتجاوز الدول', 'Transnational migration affects both origin and host countries.', 'تؤثّر الهجرة العابرة للحدود على بلدان المنشأ والاستقبال.', 'extended', 'B2', 'AWL'],
  ['migratory', 'adjective', 'هجري؛ متعلّق بالتنقّل والهجرة', 'Migratory patterns have changed due to climate.', 'تغيّرت أنماط الهجرة بسبب المناخ.', 'core', 'B2', 'COCA'],
  ['seasonal', 'adjective', 'موسمي؛ يحدث في فصل معيّن', 'Seasonal workers harvest crops in summer.', 'يحصد العمّال الموسميون المحاصيل في الصيف.', 'core', 'B1', 'CEFR-J'],
  ['voluntary', 'adjective', 'طوعي؛ بإرادة حرة', 'Voluntary migration is driven by personal choice.', 'الهجرة الطوعية مدفوعة بالاختيار الشخصي.', 'core', 'B2', 'AWL'],
  ['involuntary', 'adjective', 'قسري؛ غير إرادي', 'Involuntary displacement results from war or disaster.', 'ينتج التهجير القسري عن الحرب أو الكوارث.', 'extended', 'B2', 'AWL'],
  ['skilled', 'adjective', 'ماهر؛ ذو مهارات مهنية', 'Skilled immigrants fill gaps in the labor market.', 'يملأ المهاجرون المهرة الفجوات في سوق العمل.', 'core', 'B1', 'CEFR-J'],
  ['unskilled', 'adjective', 'غير ماهر؛ بدون تدريب مهني', 'Unskilled workers often accept low-paying jobs.', 'غالباً ما يقبل العمّال غير المهرة وظائف منخفضة الأجر.', 'core', 'B2', 'COCA'],
  ['cosmopolitan', 'adjective', 'عالمي الطابع؛ منفتح على ثقافات متعدّدة', 'London is a cosmopolitan city with people from everywhere.', 'لندن مدينة عالمية الطابع بسكّان من كل مكان.', 'extended', 'B2', 'COCA'],
  ['diasporic', 'adjective', 'شتاتي؛ متعلّق بالمغتربين', 'Diasporic communities maintain ties to their homeland.', 'تحافظ المجتمعات الشتاتية على روابطها بوطنها.', 'mastery', 'academic', 'AWL'],
  ['nomadic', 'adjective', 'بدوي؛ رحّال ومتنقّل', 'Nomadic tribes move with their livestock.', 'تتنقّل القبائل البدوية مع ماشيتها.', 'core', 'B2', 'COCA'],
  ['settled', 'adjective', 'مستقر؛ ثابت في مكان واحد', 'Settled communities developed agriculture.', 'طوّرت المجتمعات المستقرة الزراعة.', 'core', 'B1', 'CEFR-J'],
  ['marginalized', 'adjective', 'مُهمَّش؛ مُبعَد عن المجتمع', 'Marginalized groups often lack access to services.', 'غالباً ما تفتقر الفئات المُهمَّشة إلى الخدمات.', 'core', 'B2', 'AWL'],
  ['persecuted', 'adjective', 'مُضطهَد؛ يتعرّض للأذى بسبب معتقداته', 'Persecuted minorities seek asylum abroad.', 'تسعى الأقليات المُضطهَدة للحصول على لجوء في الخارج.', 'extended', 'B2', 'COCA'],
  ['suburban', 'adjective', 'ضاحوي؛ في ضواحي المدينة', 'Many immigrants settle in suburban areas.', 'يستقر كثير من المهاجرين في المناطق الضاحوية.', 'core', 'B1', 'CEFR-J'],
  ['rural', 'adjective', 'ريفي؛ في المناطق الزراعية', 'Rural-to-urban migration drives city growth.', 'تدفع الهجرة من الريف إلى المدينة النمو الحضري.', 'core', 'B1', 'CEFR-J'],
  ['urban', 'adjective', 'حضري؛ متعلّق بالمدينة', 'Urban areas attract migrants seeking better jobs.', 'تجذب المناطق الحضرية المهاجرين الباحثين عن وظائف أفضل.', 'core', 'B1', 'CEFR-J'],
  ['asylum-seeking', 'adjective', 'طالب لجوء؛ يسعى للحماية', 'Asylum-seeking families face long waiting times.', 'تواجه العائلات طالبة اللجوء فترات انتظار طويلة.', 'extended', 'B2', 'COCA'],
  ['xenophobic', 'adjective', 'كاره للأجانب؛ معادٍ للغرباء', 'Xenophobic attitudes hinder integration efforts.', 'تعيق المواقف الكارهة للأجانب جهود الاندماج.', 'mastery', 'C1', 'COCA'],
];

// ── Unit 6: Cryptocurrency ──
const unit6 = [
  ['decentralized', 'adjective', 'لامركزي؛ غير خاضع لسلطة واحدة', 'Bitcoin operates on a decentralized network.', 'يعمل البيتكوين على شبكة لامركزية.', 'core', 'B2', 'COCA'],
  ['volatile', 'adjective', 'متقلّب؛ يتغيّر بسرعة كبيرة', 'Crypto markets are extremely volatile.', 'أسواق العملات المشفرة شديدة التقلّب.', 'core', 'B2', 'COCA'],
  ['speculative', 'adjective', 'مضارِب؛ قائم على التخمين', 'Most crypto trading is speculative.', 'معظم تداول العملات المشفرة مضارَبة.', 'core', 'B2', 'COCA'],
  ['anonymous', 'adjective', 'مجهول الهوية', 'Some cryptocurrencies allow anonymous transactions.', 'تسمح بعض العملات المشفرة بمعاملات مجهولة الهوية.', 'core', 'B2', 'CEFR-J'],
  ['pseudonymous', 'adjective', 'بهوية مستعارة؛ باسم وهمي', 'Bitcoin transactions are pseudonymous, not fully anonymous.', 'معاملات البيتكوين بهوية مستعارة وليست مجهولة تماماً.', 'mastery', 'C1', 'NAWL'],
  ['encrypted', 'adjective', 'مُشفَّر؛ محمي بالتشفير', 'All data on the blockchain is encrypted.', 'جميع البيانات على سلسلة الكتل مُشفَّرة.', 'core', 'B2', 'COCA'],
  ['immutable', 'adjective', 'غير قابل للتغيير', 'Blockchain records are immutable once confirmed.', 'سجلات سلسلة الكتل غير قابلة للتغيير بعد تأكيدها.', 'extended', 'C1', 'AWL'],
  ['trustless', 'adjective', 'لا يحتاج إلى وسيط ثقة', 'Blockchain enables trustless peer-to-peer exchanges.', 'تُمكّن سلسلة الكتل من التبادل دون الحاجة لوسيط ثقة.', 'mastery', 'academic', 'NAWL'],
  ['peer-to-peer', 'adjective', 'نظير إلى نظير؛ مباشر بين الطرفين', 'Peer-to-peer lending removes the need for banks.', 'يُلغي الإقراض من نظير إلى نظير الحاجة إلى البنوك.', 'core', 'B2', 'COCA'],
  ['deflationary', 'adjective', 'انكماشي؛ يقلّ عرضه مع الوقت', 'Bitcoin is deflationary because its supply is limited.', 'البيتكوين انكماشي لأن عرضه محدود.', 'extended', 'B2', 'NAWL'],
  ['inflationary', 'adjective', 'تضخمي؛ يزيد عرضه باستمرار', 'Traditional currencies are inflationary by design.', 'العملات التقليدية تضخمية بطبيعتها.', 'core', 'B2', 'COCA'],
  ['fungible', 'adjective', 'قابل للاستبدال؛ متماثل القيمة', 'One bitcoin is fungible with any other bitcoin.', 'بيتكوين واحد قابل للاستبدال بأي بيتكوين آخر.', 'extended', 'C1', 'AWL'],
  ['non-fungible', 'adjective', 'غير قابل للاستبدال؛ فريد', 'Non-fungible tokens represent unique digital assets.', 'الرموز غير القابلة للاستبدال تمثّل أصولاً رقمية فريدة.', 'extended', 'B2', 'COCA'],
  ['liquid', 'adjective', 'سائل مالياً؛ سهل التحويل لنقد', 'Bitcoin is the most liquid cryptocurrency.', 'البيتكوين أكثر العملات المشفرة سيولة.', 'core', 'B2', 'COCA'],
  ['illiquid', 'adjective', 'غير سائل؛ صعب التحويل لنقد', 'Small-cap tokens tend to be illiquid.', 'تميل الرموز صغيرة القيمة لأن تكون غير سائلة.', 'extended', 'B2', 'NAWL'],
  ['regulated', 'adjective', 'مُنظَّم؛ تحكمه قوانين', 'Some countries have regulated crypto exchanges.', 'نظّمت بعض الدول بورصات العملات المشفرة.', 'core', 'B2', 'AWL'],
  ['unregulated', 'adjective', 'غير مُنظَّم؛ بدون رقابة قانونية', 'Unregulated markets carry higher risks.', 'تحمل الأسواق غير المُنظَّمة مخاطر أعلى.', 'core', 'B2', 'COCA'],
  ['permissionless', 'adjective', 'مفتوح للجميع؛ لا يحتاج إذن', 'Public blockchains are permissionless.', 'سلاسل الكتل العامة مفتوحة للجميع.', 'mastery', 'academic', 'NAWL'],
  ['scalable', 'adjective', 'قابل للتوسع؛ يتحمّل نمو الاستخدام', 'A scalable blockchain can handle millions of users.', 'يمكن لسلسلة كتل قابلة للتوسع التعامل مع ملايين المستخدمين.', 'core', 'B2', 'AWL'],
  ['interoperable', 'adjective', 'قابل للتشغيل المتبادل بين الأنظمة', 'Interoperable blockchains can share data seamlessly.', 'يمكن لسلاسل الكتل القابلة للتشغيل المتبادل مشاركة البيانات بسلاسة.', 'extended', 'C1', 'AWL'],
  ['custodial', 'adjective', 'حِفظي؛ يحتفظ طرف ثالث بالأصول', 'Custodial wallets are managed by a third party.', 'المحافظ الحِفظية يديرها طرف ثالث.', 'extended', 'B2', 'NAWL'],
  ['fiat-backed', 'adjective', 'مدعوم بعملة تقليدية', 'USDT is a fiat-backed stablecoin.', 'عملة USDT عملة مستقرة مدعومة بالدولار.', 'extended', 'B2', 'COCA'],
  ['algorithmic', 'adjective', 'خوارزمي؛ يعتمد على خوارزميات', 'Algorithmic trading uses automated strategies.', 'يستخدم التداول الخوارزمي استراتيجيات آلية.', 'extended', 'B2', 'AWL'],
  ['permissioned', 'adjective', 'مرخَّص؛ يحتاج إذناً للوصول', 'Enterprise blockchains are typically permissioned.', 'سلاسل الكتل المؤسسية عادةً ما تكون مرخَّصة.', 'mastery', 'C1', 'NAWL'],
  ['cryptographic', 'adjective', 'تشفيري؛ يستخدم علم التشفير', 'Cryptographic keys secure digital wallets.', 'المفاتيح التشفيرية تؤمّن المحافظ الرقمية.', 'extended', 'B2', 'AWL'],
];

// ── Unit 7: Crowd Psychology ──
const unit7 = [
  ['charismatic', 'adjective', 'كاريزمي؛ ذو جاذبية شخصية قوية', 'Charismatic leaders can sway large crowds.', 'يستطيع القادة الكاريزميون التأثير على الجماهير.', 'core', 'B2', 'COCA'],
  ['authoritarian', 'adjective', 'سلطوي؛ استبدادي', 'Authoritarian regimes suppress free speech.', 'تقمع الأنظمة السلطوية حرية التعبير.', 'core', 'B2', 'AWL'],
  ['submissive', 'adjective', 'خاضع؛ مطيع ومُذعن', 'Crowds can become submissive under strong leadership.', 'يمكن أن تصبح الجماهير خاضعة تحت قيادة قوية.', 'extended', 'B2', 'COCA'],
  ['impulsive', 'adjective', 'اندفاعي؛ يتصرّف بدون تفكير', 'Mob behavior tends to be impulsive and emotional.', 'يميل سلوك الحشود إلى أن يكون اندفاعياً وعاطفياً.', 'core', 'B2', 'COCA'],
  ['irrational', 'adjective', 'لاعقلاني؛ غير منطقي', 'Panic can trigger irrational decision-making.', 'يمكن أن يُثير الذعر اتخاذ قرارات لاعقلانية.', 'core', 'B2', 'COCA'],
  ['collective', 'adjective', 'جماعي؛ مشترك بين المجموعة', 'Collective hysteria spread through the school.', 'انتشرت الهستيريا الجماعية في المدرسة.', 'core', 'B2', 'AWL'],
  ['contagious', 'adjective', 'مُعدٍ؛ ينتشر بسرعة بين الناس', 'Fear is contagious in a crowd.', 'الخوف مُعدٍ في الحشود.', 'core', 'B2', 'COCA'],
  ['suggestible', 'adjective', 'قابل للإيحاء؛ سهل التأثير عليه', 'People in crowds are more suggestible.', 'الناس في الحشود أكثر قابلية للإيحاء.', 'extended', 'C1', 'NAWL'],
  ['obedient', 'adjective', 'مطيع؛ يمتثل للأوامر', 'Obedient followers rarely question authority.', 'نادراً ما يشكّك الأتباع المطيعون في السلطة.', 'core', 'B1', 'CEFR-J'],
  ['defiant', 'adjective', 'متحدٍّ؛ يرفض الامتثال', 'The defiant protesters refused to leave.', 'رفض المتظاهرون المتحدّون المغادرة.', 'extended', 'B2', 'COCA'],
  ['extremist', 'adjective', 'متطرّف؛ ذو آراء حادّة', 'Extremist views can radicalize vulnerable people.', 'يمكن للآراء المتطرّفة أن تُطرِّف الأشخاص الضعفاء.', 'core', 'B2', 'COCA'],
  ['moderate', 'adjective', 'معتدل؛ وسطي في الآراء', 'Moderate voices are often drowned out by extremes.', 'غالباً ما تُطغى الأصوات المتطرّفة على الأصوات المعتدلة.', 'core', 'B1', 'CEFR-J'],
  ['radical', 'adjective', 'جذري؛ يدعو لتغيير شامل', 'Radical movements demand complete system change.', 'تطالب الحركات الجذرية بتغيير شامل للنظام.', 'core', 'B2', 'AWL'],
  ['populist', 'adjective', 'شعبوي؛ يستغل مشاعر العامة', 'Populist rhetoric appeals to people\'s frustrations.', 'يستغل الخطاب الشعبوي إحباطات الناس.', 'extended', 'B2', 'COCA'],
  ['dogmatic', 'adjective', 'دوغمائي؛ متمسّك بآرائه بشكل أعمى', 'Dogmatic beliefs resist any form of evidence.', 'تقاوم المعتقدات الدوغمائية أي شكل من الأدلة.', 'extended', 'C1', 'COCA'],
  ['pragmatic', 'adjective', 'عملي؛ واقعي في التفكير', 'A pragmatic approach focuses on practical solutions.', 'يركّز النهج العملي على الحلول الواقعية.', 'core', 'B2', 'AWL'],
  ['ideological', 'adjective', 'أيديولوجي؛ قائم على منظومة أفكار', 'Ideological divisions deepen social polarization.', 'تُعمّق الانقسامات الأيديولوجية الاستقطاب الاجتماعي.', 'extended', 'B2', 'AWL'],
  ['tribal', 'adjective', 'قَبَلي؛ متعلّق بالانتماء لجماعة', 'Tribal loyalty can override rational thinking.', 'يمكن للولاء القَبَلي أن يطغى على التفكير العقلاني.', 'core', 'B2', 'COCA'],
  ['polarized', 'adjective', 'مُستقطَب؛ مُنقسم إلى معسكرين', 'Social media has made society more polarized.', 'جعلت وسائل التواصل الاجتماعي المجتمع أكثر استقطاباً.', 'core', 'B2', 'COCA'],
  ['passive', 'adjective', 'سلبي؛ لا يتّخذ إجراءً', 'Passive bystanders allowed the injustice to continue.', 'سمح المتفرّجون السلبيون للظلم بالاستمرار.', 'core', 'B1', 'CEFR-J'],
  ['aggressive', 'adjective', 'عدواني؛ مائل للعنف', 'Crowds can become aggressive when provoked.', 'يمكن أن تصبح الحشود عدوانية عند استفزازها.', 'core', 'B1', 'CEFR-J'],
  ['conservative', 'adjective', 'محافظ؛ يفضّل الحفاظ على الوضع القائم', 'Conservative groups opposed the reforms.', 'عارضت المجموعات المحافظة الإصلاحات.', 'core', 'B2', 'COCA'],
  ['liberal', 'adjective', 'ليبرالي؛ منفتح على التغيير', 'Liberal attitudes toward social issues have grown.', 'نمت المواقف الليبرالية تجاه القضايا الاجتماعية.', 'core', 'B2', 'COCA'],
  ['manipulative', 'adjective', 'مُتلاعب؛ يستخدم الآخرين لمصلحته', 'Manipulative leaders exploit crowd emotions.', 'يستغل القادة المُتلاعبون مشاعر الحشود.', 'extended', 'B2', 'COCA'],
  ['conformist', 'adjective', 'مُنسجم مع الأغلبية؛ مُقلِّد', 'Conformist behavior increases in large groups.', 'يزداد السلوك المُنسجم مع الأغلبية في المجموعات الكبيرة.', 'mastery', 'academic', 'NAWL'],
];

// ── Unit 8: Forensic Science ──
const unit8 = [
  ['circumstantial', 'adjective', 'ظرفي؛ غير مباشر كدليل', 'The evidence against him was purely circumstantial.', 'كان الدليل ضدّه ظرفياً بالكامل.', 'extended', 'B2', 'COCA'],
  ['forensic', 'adjective', 'جنائي؛ متعلّق بالطب الشرعي', 'Forensic analysis identified the suspect.', 'حدّد التحليل الجنائي المشتبه به.', 'core', 'B2', 'COCA'],
  ['incriminating', 'adjective', 'مُدين؛ يُثبت التورّط في جريمة', 'Police found incriminating evidence at the scene.', 'وجدت الشرطة أدلة مُدينة في مسرح الجريمة.', 'extended', 'B2', 'COCA'],
  ['conclusive', 'adjective', 'حاسم؛ قاطع ونهائي', 'DNA testing provided conclusive proof.', 'قدّم اختبار الحمض النووي دليلاً حاسماً.', 'core', 'B2', 'COCA'],
  ['inconclusive', 'adjective', 'غير حاسم؛ لا يقدّم نتيجة أكيدة', 'The test results were inconclusive.', 'كانت نتائج الاختبار غير حاسمة.', 'core', 'B2', 'COCA'],
  ['preliminary', 'adjective', 'أوّلي؛ تمهيدي قبل التفصيل', 'Preliminary findings suggest foul play.', 'تشير النتائج الأوّلية إلى وجود جريمة.', 'core', 'B2', 'AWL'],
  ['postmortem', 'adjective', 'بعد الوفاة؛ متعلّق بتشريح الجثة', 'The postmortem examination revealed the cause of death.', 'كشف فحص ما بعد الوفاة عن سبب الوفاة.', 'extended', 'B2', 'COCA'],
  ['toxicological', 'adjective', 'سُمّي؛ متعلّق بعلم السموم', 'Toxicological tests detected poison in the blood.', 'كشفت الفحوصات السُّمّية عن سمّ في الدم.', 'mastery', 'C1', 'NAWL'],
  ['ballistic', 'adjective', 'مقذوفي؛ متعلّق بالمقذوفات', 'Ballistic evidence matched the gun to the crime.', 'ربط دليل المقذوفات السلاح بالجريمة.', 'extended', 'B2', 'COCA'],
  ['admissible', 'adjective', 'مقبول قانونياً كدليل', 'Only admissible evidence can be presented in court.', 'لا يُقدَّم في المحكمة إلا الأدلة المقبولة قانونياً.', 'extended', 'B2', 'AWL'],
  ['inadmissible', 'adjective', 'غير مقبول كدليل في المحكمة', 'The confession was ruled inadmissible.', 'حُكم بأن الاعتراف غير مقبول كدليل.', 'extended', 'B2', 'AWL'],
  ['corroborative', 'adjective', 'مؤيِّد؛ يدعم دليلاً آخر', 'Corroborative testimony strengthened the case.', 'عزّزت الشهادة المؤيِّدة القضية.', 'mastery', 'C1', 'AWL'],
  ['exculpatory', 'adjective', 'مُبرِّئ؛ يُثبت البراءة', 'Exculpatory DNA evidence freed the prisoner.', 'أطلق الدليل الجيني المُبرِّئ سراح السجين.', 'mastery', 'C1', 'NAWL'],
  ['latent', 'adjective', 'كامن؛ غير مرئي بالعين المجرّدة', 'Latent fingerprints require special chemicals to reveal.', 'تتطلّب البصمات الكامنة مواد كيميائية خاصة لإظهارها.', 'extended', 'B2', 'COCA'],
  ['patent', 'adjective', 'ظاهر؛ واضح ومرئي', 'Patent fingerprints were found on the glass.', 'وُجدت بصمات ظاهرة على الزجاج.', 'core', 'B2', 'COCA'],
  ['biological', 'adjective', 'بيولوجي؛ متعلّق بالكائنات الحية', 'Biological evidence includes blood and hair.', 'يشمل الدليل البيولوجي الدم والشعر.', 'core', 'B1', 'CEFR-J'],
  ['testimonial', 'adjective', 'شهادي؛ قائم على شهادة شخص', 'Testimonial evidence relies on witness accounts.', 'يعتمد الدليل الشهادي على روايات الشهود.', 'extended', 'B2', 'AWL'],
  ['documentary', 'adjective', 'مستندي؛ قائم على وثائق', 'Documentary evidence included bank records.', 'شمل الدليل المستندي سجلات بنكية.', 'core', 'B2', 'AWL'],
  ['demonstrative', 'adjective', 'توضيحي؛ يُستخدم لعرض الأدلة', 'Demonstrative exhibits helped the jury understand.', 'ساعدت المعروضات التوضيحية هيئة المحلّفين على الفهم.', 'extended', 'B2', 'COCA'],
  ['trace', 'adjective', 'أثري؛ بكميات ضئيلة جداً', 'Trace amounts of gunpowder were found on his hands.', 'وُجدت كميات أثرية من البارود على يديه.', 'core', 'B2', 'COCA'],
  ['physical', 'adjective', 'مادي؛ ملموس ويمكن فحصه', 'Physical evidence is harder to dispute than testimony.', 'الدليل المادي أصعب في الطعن فيه من الشهادة.', 'core', 'B1', 'CEFR-J'],
  ['digital', 'adjective', 'رقمي؛ إلكتروني ومخزّن على حاسوب', 'Digital forensics recovered deleted files.', 'استعاد الطب الشرعي الرقمي الملفات المحذوفة.', 'core', 'B1', 'CEFR-J'],
  ['serological', 'adjective', 'مصلي؛ متعلّق بتحليل مصل الدم', 'Serological testing identified the blood type.', 'حدّد الاختبار المصلي فصيلة الدم.', 'mastery', 'academic', 'NAWL'],
  ['chemical', 'adjective', 'كيميائي؛ متعلّق بالتفاعلات الكيميائية', 'Chemical analysis revealed traces of arsenic.', 'كشف التحليل الكيميائي عن آثار الزرنيخ.', 'core', 'B1', 'CEFR-J'],
  ['incriminatory', 'adjective', 'تجريمي؛ يشير إلى ارتكاب جريمة', 'Incriminatory phone records linked him to the scene.', 'ربطته سجلات الهاتف التجريمية بمسرح الجريمة.', 'mastery', 'C1', 'NAWL'],
];

// ── Unit 9: Archaeology ──
const unit9 = [
  ['prehistoric', 'adjective', 'ما قبل التاريخ', 'Prehistoric cave paintings date back thousands of years.', 'تعود رسومات الكهوف ما قبل التاريخ إلى آلاف السنين.', 'core', 'B2', 'COCA'],
  ['ancient', 'adjective', 'قديم؛ من العصور الغابرة', 'Ancient civilizations built impressive structures.', 'بنت الحضارات القديمة هياكل مبهرة.', 'core', 'B1', 'CEFR-J'],
  ['medieval', 'adjective', 'قروسطي؛ من العصور الوسطى', 'Medieval artifacts were found beneath the cathedral.', 'عُثر على قطع أثرية قروسطية تحت الكاتدرائية.', 'core', 'B2', 'CEFR-J'],
  ['neolithic', 'adjective', 'من العصر الحجري الحديث', 'Neolithic settlements show early farming practices.', 'تُظهر مستوطنات العصر الحجري الحديث ممارسات زراعية مبكرة.', 'extended', 'B2', 'COCA'],
  ['paleolithic', 'adjective', 'من العصر الحجري القديم', 'Paleolithic tools were made from flint and bone.', 'صُنعت أدوات العصر الحجري القديم من الصوّان والعظام.', 'extended', 'B2', 'COCA'],
  ['ceramic', 'adjective', 'خزفي؛ مصنوع من الفخار', 'Ceramic fragments help date archaeological sites.', 'تساعد الشظايا الخزفية في تأريخ المواقع الأثرية.', 'core', 'B2', 'COCA'],
  ['monumental', 'adjective', 'ضخم؛ عظيم البنيان', 'Monumental architecture served religious purposes.', 'خدمت العمارة الضخمة أغراضاً دينية.', 'core', 'B2', 'COCA'],
  ['funerary', 'adjective', 'جنائزي؛ متعلّق بالدفن والموت', 'Funerary masks were placed on the deceased.', 'وُضعت أقنعة جنائزية على المتوفين.', 'extended', 'C1', 'NAWL'],
  ['ritual', 'adjective', 'طقسي؛ متعلّق بالشعائر', 'Ritual objects suggest complex religious beliefs.', 'تشير الأدوات الطقسية إلى معتقدات دينية معقّدة.', 'core', 'B2', 'COCA'],
  ['sacred', 'adjective', 'مقدّس؛ ذو قداسة دينية', 'The sacred temple was off-limits to commoners.', 'كان المعبد المقدّس محظوراً على العامة.', 'core', 'B1', 'CEFR-J'],
  ['secular', 'adjective', 'دنيوي؛ غير ديني', 'Secular buildings included markets and bathhouses.', 'شملت المباني الدنيوية الأسواق والحمّامات.', 'core', 'B2', 'AWL'],
  ['domestic', 'adjective', 'منزلي؛ متعلّق بالحياة اليومية', 'Domestic pottery was used for cooking and storage.', 'استُخدم الفخار المنزلي للطبخ والتخزين.', 'core', 'B1', 'CEFR-J'],
  ['agricultural', 'adjective', 'زراعي؛ متعلّق بالفلاحة', 'Agricultural tools reveal how ancient people farmed.', 'تكشف الأدوات الزراعية كيف زرع القدماء.', 'core', 'B2', 'AWL'],
  ['fortified', 'adjective', 'مُحصَّن؛ محمي بأسوار وحصون', 'The fortified city had thick stone walls.', 'كانت للمدينة المُحصَّنة أسوار حجرية سميكة.', 'extended', 'B2', 'COCA'],
  ['ornamental', 'adjective', 'زخرفي؛ للتزيين', 'Ornamental jewelry indicated social status.', 'أشارت الحُلي الزخرفية إلى المكانة الاجتماعية.', 'core', 'B2', 'COCA'],
  ['inscribed', 'adjective', 'منقوش؛ مكتوب عليه', 'Inscribed tablets contain ancient laws.', 'تحتوي الألواح المنقوشة على قوانين قديمة.', 'extended', 'B2', 'COCA'],
  ['engraved', 'adjective', 'محفور؛ منحوت على سطح صلب', 'Engraved symbols were found on the stone.', 'عُثر على رموز محفورة على الحجر.', 'core', 'B2', 'COCA'],
  ['sculpted', 'adjective', 'منحوت؛ مشكَّل فنياً', 'Sculpted statues adorned the palace entrance.', 'زيّنت التماثيل المنحوتة مدخل القصر.', 'core', 'B2', 'COCA'],
  ['gilded', 'adjective', 'مُذهَّب؛ مطلي بالذهب', 'Gilded artifacts reflect the wealth of the era.', 'تعكس القطع المُذهَّبة ثراء تلك الحقبة.', 'extended', 'B2', 'COCA'],
  ['terracotta', 'adjective', 'من الطين المحروق؛ فخاري', 'The terracotta army of China is world-famous.', 'جيش الطين المحروق في الصين مشهور عالمياً.', 'extended', 'B2', 'COCA'],
  ['limestone', 'adjective', 'جيري؛ مصنوع من الحجر الجيري', 'Limestone blocks formed the pyramid\'s core.', 'شكّلت كتل الحجر الجيري لُبّ الهرم.', 'core', 'B2', 'COCA'],
  ['excavated', 'adjective', 'مُنقَّب عنه؛ مُستخرَج من الأرض', 'The excavated ruins revealed a Roman villa.', 'كشفت الأطلال المُنقَّب عنها عن فيلا رومانية.', 'core', 'B2', 'COCA'],
  ['stratified', 'adjective', 'طبقي؛ مرتّب في طبقات', 'Stratified deposits help archaeologists date layers.', 'تساعد الرواسب الطبقية علماء الآثار في تأريخ الطبقات.', 'mastery', 'academic', 'AWL'],
  ['indigenous', 'adjective', 'محلي أصلي؛ من سكان المنطقة الأصليين', 'Indigenous art reveals spiritual beliefs.', 'يكشف الفن المحلي الأصلي عن المعتقدات الروحية.', 'core', 'B2', 'AWL'],
  ['fragmentary', 'adjective', 'مجزَّأ؛ غير مكتمل', 'Only fragmentary records of that era survive.', 'لم تبقَ سوى سجلات مجزَّأة من تلك الحقبة.', 'extended', 'B2', 'NAWL'],
];

// ── Unit 10: Longevity ──
const unit10 = [
  ['geriatric', 'adjective', 'متعلّق بطب الشيخوخة', 'Geriatric medicine focuses on elderly patients.', 'يركّز طب الشيخوخة على المرضى كبار السن.', 'extended', 'B2', 'COCA'],
  ['chronic', 'adjective', 'مزمن؛ مستمر لفترة طويلة', 'Chronic diseases require long-term treatment.', 'تتطلّب الأمراض المزمنة علاجاً طويل الأمد.', 'core', 'B2', 'CEFR-J'],
  ['acute', 'adjective', 'حاد؛ شديد ومفاجئ', 'Acute pain requires immediate medical attention.', 'يتطلّب الألم الحاد رعاية طبية فورية.', 'core', 'B2', 'COCA'],
  ['degenerative', 'adjective', 'تنكّسي؛ يسبّب تدهوراً تدريجياً', 'Parkinson\'s is a degenerative neurological condition.', 'باركنسون حالة عصبية تنكّسية.', 'extended', 'B2', 'COCA'],
  ['inflammatory', 'adjective', 'التهابي؛ يسبّب أو يتعلّق بالالتهاب', 'Inflammatory responses can damage healthy tissue.', 'يمكن للاستجابات الالتهابية أن تتلف الأنسجة السليمة.', 'core', 'B2', 'COCA'],
  ['cardiovascular', 'adjective', 'قلبي وعائي', 'Cardiovascular disease is the leading cause of death.', 'أمراض القلب والأوعية هي السبب الرئيسي للوفاة.', 'core', 'B2', 'COCA'],
  ['metabolic', 'adjective', 'أيضي؛ متعلّق بعمليات التمثيل الغذائي', 'Metabolic rate decreases with age.', 'ينخفض معدل الأيض مع التقدّم في السن.', 'extended', 'B2', 'COCA'],
  ['hormonal', 'adjective', 'هرموني؛ متعلّق بالهرمونات', 'Hormonal changes affect mood and energy levels.', 'تؤثّر التغيّرات الهرمونية على المزاج ومستويات الطاقة.', 'core', 'B2', 'COCA'],
  ['cognitive', 'adjective', 'إدراكي؛ متعلّق بالتفكير والذاكرة', 'Cognitive decline is not inevitable with aging.', 'التراجع الإدراكي ليس حتمياً مع التقدّم في العمر.', 'core', 'B2', 'AWL'],
  ['muscular', 'adjective', 'عضلي؛ متعلّق بالعضلات', 'Muscular strength decreases after age sixty.', 'تنخفض القوة العضلية بعد سن الستين.', 'core', 'B1', 'CEFR-J'],
  ['skeletal', 'adjective', 'هيكلي؛ متعلّق بالعظام', 'Skeletal density declines in postmenopausal women.', 'تنخفض كثافة العظام عند النساء بعد انقطاع الطمث.', 'core', 'B2', 'COCA'],
  ['molecular', 'adjective', 'جزيئي؛ على مستوى الجزيئات', 'Molecular biology reveals the secrets of aging.', 'يكشف علم الأحياء الجزيئي أسرار الشيخوخة.', 'extended', 'B2', 'AWL'],
  ['genetic', 'adjective', 'جيني؛ وراثي', 'Genetic factors influence lifespan significantly.', 'تؤثّر العوامل الجينية بشكل كبير على العمر.', 'core', 'B2', 'COCA'],
  ['epigenetic', 'adjective', 'فوق جيني؛ يؤثّر على التعبير الجيني', 'Epigenetic changes accumulate throughout life.', 'تتراكم التغيّرات فوق الجينية طوال الحياة.', 'mastery', 'academic', 'AWL'],
  ['dietary', 'adjective', 'غذائي؛ متعلّق بالنظام الغذائي', 'Dietary habits play a key role in longevity.', 'تلعب العادات الغذائية دوراً رئيسياً في طول العمر.', 'core', 'B2', 'COCA'],
  ['sedentary', 'adjective', 'خامل؛ كثير الجلوس قليل الحركة', 'A sedentary lifestyle increases disease risk.', 'يزيد نمط الحياة الخامل خطر الإصابة بالأمراض.', 'core', 'B2', 'COCA'],
  ['aerobic', 'adjective', 'هوائي؛ يحتاج إلى أكسجين', 'Aerobic exercise strengthens the heart.', 'تقوّي التمارين الهوائية القلب.', 'core', 'B2', 'COCA'],
  ['anaerobic', 'adjective', 'لاهوائي؛ بدون أكسجين', 'Anaerobic exercise builds muscle mass.', 'تبني التمارين اللاهوائية الكتلة العضلية.', 'extended', 'B2', 'COCA'],
  ['preventive', 'adjective', 'وقائي؛ يمنع حدوث المرض', 'Preventive medicine aims to stop disease before it starts.', 'يهدف الطب الوقائي إلى منع المرض قبل حدوثه.', 'core', 'B2', 'COCA'],
  ['palliative', 'adjective', 'تلطيفي؛ يخفّف الألم دون الشفاء', 'Palliative care improves quality of life for the terminally ill.', 'تحسّن الرعاية التلطيفية جودة حياة المرضى الميؤوس منهم.', 'extended', 'C1', 'COCA'],
  ['regenerative', 'adjective', 'تجديدي؛ يُعيد بناء الأنسجة', 'Regenerative medicine could reverse aging damage.', 'يمكن للطب التجديدي عكس أضرار الشيخوخة.', 'extended', 'B2', 'COCA'],
  ['pediatric', 'adjective', 'متعلّق بطب الأطفال', 'Pediatric and geriatric patients need different approaches.', 'يحتاج مرضى الأطفال وكبار السن إلى مناهج مختلفة.', 'core', 'B2', 'COCA'],
  ['antioxidant', 'adjective', 'مضاد للأكسدة', 'Antioxidant foods help protect cells from damage.', 'تساعد الأطعمة المضادة للأكسدة في حماية الخلايا من التلف.', 'core', 'B2', 'COCA'],
  ['telomeric', 'adjective', 'متعلّق بالتيلوميرات (أطراف الكروموسومات)', 'Telomeric shortening is linked to cellular aging.', 'يرتبط قِصَر التيلوميرات بشيخوخة الخلايا.', 'mastery', 'academic', 'AWL'],
  ['centenarian', 'adjective', 'معمِّر؛ بلغ المئة سنة أو أكثر', 'Centenarian populations are studied for longevity secrets.', 'تُدرَس مجموعات المعمِّرين لكشف أسرار طول العمر.', 'mastery', 'C1', 'NAWL'],
];

// ── Unit 11: Sustainable Architecture ──
const unit11 = [
  ['photovoltaic', 'adjective', 'كهروضوئي؛ يحوّل الضوء إلى كهرباء', 'Photovoltaic panels generate clean electricity.', 'تولّد الألواح الكهروضوئية كهرباء نظيفة.', 'extended', 'B2', 'COCA'],
  ['prefabricated', 'adjective', 'مسبق الصنع؛ مُصنَّع في المصنع', 'Prefabricated modules reduce construction time.', 'تقلّل الوحدات مسبقة الصنع وقت البناء.', 'core', 'B2', 'COCA'],
  ['modular', 'adjective', 'وَحدوي؛ مكوَّن من وحدات قابلة للتجميع', 'Modular buildings can be expanded easily.', 'يمكن توسيع المباني الوَحدوية بسهولة.', 'core', 'B2', 'COCA'],
  ['passive', 'adjective', 'سلبي الطاقة؛ لا يحتاج تبريداً أو تدفئة آلية', 'Passive houses use minimal energy for heating.', 'تستخدم المنازل السلبية طاقة قليلة جداً للتدفئة.', 'core', 'B2', 'AWL'],
  ['vernacular', 'adjective', 'محلي التقليد؛ يعتمد على أساليب البناء المحلية', 'Vernacular architecture uses local materials.', 'تستخدم العمارة المحلية مواد من البيئة المحيطة.', 'extended', 'C1', 'COCA'],
  ['load-bearing', 'adjective', 'حامل للأثقال؛ يتحمّل الوزن الهيكلي', 'Load-bearing walls support the roof structure.', 'تدعم الجدران الحاملة هيكل السقف.', 'extended', 'B2', 'NAWL'],
  ['structural', 'adjective', 'هيكلي؛ متعلّق ببنية المبنى', 'Structural integrity is critical for earthquake resistance.', 'السلامة الهيكلية ضرورية لمقاومة الزلازل.', 'core', 'B2', 'AWL'],
  ['thermal', 'adjective', 'حراري؛ متعلّق بالحرارة', 'Thermal insulation reduces energy consumption.', 'يقلّل العزل الحراري استهلاك الطاقة.', 'core', 'B2', 'COCA'],
  ['acoustic', 'adjective', 'صوتي؛ متعلّق بالصوت وعزله', 'Acoustic panels improve sound quality in rooms.', 'تحسّن الألواح الصوتية جودة الصوت في الغرف.', 'core', 'B2', 'COCA'],
  ['permeable', 'adjective', 'منفّذ؛ يسمح بمرور الماء أو الهواء', 'Permeable paving prevents flooding.', 'تمنع الأرضيات المنفّذة الفيضانات.', 'extended', 'B2', 'COCA'],
  ['impermeable', 'adjective', 'غير منفّذ؛ لا يسمح بمرور السوائل', 'Impermeable roofing protects from rain.', 'يحمي السقف غير المنفّذ من المطر.', 'extended', 'B2', 'COCA'],
  ['recycled', 'adjective', 'مُعاد تدويره', 'Recycled materials reduce construction waste.', 'تقلّل المواد المُعاد تدويرها مخلّفات البناء.', 'core', 'B1', 'CEFR-J'],
  ['reclaimed', 'adjective', 'مُستصلَح؛ مُعاد استخدامه', 'Reclaimed wood adds character to buildings.', 'يضيف الخشب المُستصلَح طابعاً مميّزاً للمباني.', 'extended', 'B2', 'COCA'],
  ['renewable', 'adjective', 'متجدّد؛ يمكن تعويضه طبيعياً', 'Renewable energy powers sustainable buildings.', 'تُشغّل الطاقة المتجدّدة المباني المستدامة.', 'core', 'B2', 'CEFR-J'],
  ['energy-efficient', 'adjective', 'موفّر للطاقة', 'Energy-efficient appliances lower electricity bills.', 'تخفّض الأجهزة الموفّرة للطاقة فواتير الكهرباء.', 'core', 'B2', 'COCA'],
  ['zero-emission', 'adjective', 'خالٍ من الانبعاثات', 'Zero-emission buildings produce no greenhouse gases.', 'لا تُنتج المباني الخالية من الانبعاثات غازات دفيئة.', 'extended', 'B2', 'COCA'],
  ['low-carbon', 'adjective', 'منخفض الكربون', 'Low-carbon construction uses eco-friendly materials.', 'يستخدم البناء منخفض الكربون مواد صديقة للبيئة.', 'core', 'B2', 'COCA'],
  ['biophilic', 'adjective', 'محبّ للطبيعة؛ يدمج عناصر الطبيعة', 'Biophilic design includes indoor plants and natural light.', 'يشمل التصميم المحبّ للطبيعة نباتات داخلية وضوءاً طبيعياً.', 'mastery', 'C1', 'NAWL'],
  ['resilient', 'adjective', 'مرن ومقاوم؛ يتحمّل الصدمات', 'Resilient buildings withstand extreme weather.', 'تتحمّل المباني المرنة الظروف المناخية القاسية.', 'core', 'B2', 'COCA'],
  ['adaptive', 'adjective', 'تكيّفي؛ قابل للتعديل والتكيّف', 'Adaptive reuse transforms old factories into homes.', 'يحوّل إعادة الاستخدام التكيّفي المصانع القديمة إلى مساكن.', 'extended', 'B2', 'AWL'],
  ['off-grid', 'adjective', 'مستقل عن الشبكة؛ ذاتي الطاقة', 'Off-grid homes generate their own power.', 'تولّد المنازل المستقلة عن الشبكة طاقتها بنفسها.', 'extended', 'B2', 'COCA'],
  ['contemporary', 'adjective', 'معاصر؛ حديث الطراز', 'Contemporary architecture blends form and function.', 'تمزج العمارة المعاصرة بين الشكل والوظيفة.', 'core', 'B2', 'AWL'],
  ['non-renewable', 'adjective', 'غير متجدّد؛ ينضب بالاستخدام', 'Non-renewable resources like concrete have high carbon costs.', 'للموارد غير المتجدّدة مثل الخرسانة تكلفة كربونية عالية.', 'core', 'B2', 'COCA'],
  ['insulated', 'adjective', 'معزول حرارياً', 'Well-insulated buildings stay warm in winter.', 'تبقى المباني المعزولة جيداً دافئة في الشتاء.', 'core', 'B2', 'COCA'],
  ['solar-powered', 'adjective', 'يعمل بالطاقة الشمسية', 'Solar-powered buildings reduce reliance on fossil fuels.', 'تقلّل المباني العاملة بالطاقة الشمسية الاعتماد على الوقود الأحفوري.', 'core', 'B2', 'COCA'],
];

// ── Unit 12: Exoplanets ──
const unit12 = [
  ['astronomical', 'adjective', 'فلكي؛ متعلّق بعلم الفلك', 'Astronomical observations detected a new exoplanet.', 'رصدت المراقبات الفلكية كوكباً خارجياً جديداً.', 'core', 'B2', 'COCA'],
  ['celestial', 'adjective', 'سماوي؛ متعلّق بالأجرام السماوية', 'Celestial bodies include stars, planets, and moons.', 'تشمل الأجرام السماوية النجوم والكواكب والأقمار.', 'core', 'B2', 'COCA'],
  ['interstellar', 'adjective', 'بين نجمي؛ بين النجوم', 'Interstellar travel remains beyond current technology.', 'لا يزال السفر بين النجوم خارج نطاق التقنية الحالية.', 'extended', 'B2', 'COCA'],
  ['intergalactic', 'adjective', 'بين مجرّي؛ بين المجرّات', 'Intergalactic distances are measured in megaparsecs.', 'تُقاس المسافات بين المجرّات بالميغابارسك.', 'mastery', 'C1', 'COCA'],
  ['orbital', 'adjective', 'مداري؛ متعلّق بالمدار', 'The orbital period determines a planet\'s year length.', 'تحدّد الفترة المدارية طول سنة الكوكب.', 'core', 'B2', 'COCA'],
  ['gravitational', 'adjective', 'جاذبي؛ متعلّق بالجاذبية', 'Gravitational pull keeps planets in orbit.', 'تُبقي قوة الجاذبية الكواكب في مداراتها.', 'core', 'B2', 'COCA'],
  ['electromagnetic', 'adjective', 'كهرومغناطيسي', 'Electromagnetic waves carry information across space.', 'تنقل الموجات الكهرومغناطيسية المعلومات عبر الفضاء.', 'extended', 'B2', 'COCA'],
  ['infrared', 'adjective', 'تحت أحمر؛ أشعة غير مرئية', 'Infrared telescopes detect heat from distant stars.', 'ترصد تلسكوبات الأشعة تحت الحمراء حرارة النجوم البعيدة.', 'core', 'B2', 'COCA'],
  ['ultraviolet', 'adjective', 'فوق بنفسجي', 'Ultraviolet radiation from stars can strip atmospheres.', 'يمكن للأشعة فوق البنفسجية من النجوم تجريد الأغلفة الجوية.', 'core', 'B2', 'COCA'],
  ['spectral', 'adjective', 'طيفي؛ متعلّق بالطيف الضوئي', 'Spectral analysis reveals a planet\'s atmospheric composition.', 'يكشف التحليل الطيفي تركيب الغلاف الجوي للكوكب.', 'extended', 'B2', 'AWL'],
  ['habitable', 'adjective', 'صالح للسكن؛ قابل للحياة', 'Scientists search for habitable zones around stars.', 'يبحث العلماء عن مناطق صالحة للسكن حول النجوم.', 'core', 'B2', 'COCA'],
  ['terrestrial', 'adjective', 'أرضي؛ صخري كالأرض', 'Mars is a terrestrial planet with a thin atmosphere.', 'المريخ كوكب أرضي ذو غلاف جوي رقيق.', 'core', 'B2', 'AWL'],
  ['gaseous', 'adjective', 'غازي؛ مكوَّن من غازات', 'Jupiter is a gaseous giant with no solid surface.', 'المشتري عملاق غازي بدون سطح صلب.', 'core', 'B2', 'COCA'],
  ['rocky', 'adjective', 'صخري؛ مكوَّن من صخور', 'Rocky exoplanets may support liquid water.', 'قد تدعم الكواكب الخارجية الصخرية وجود ماء سائل.', 'core', 'B1', 'CEFR-J'],
  ['atmospheric', 'adjective', 'جوّي؛ متعلّق بالغلاف الجوي', 'Atmospheric pressure varies between planets.', 'يختلف الضغط الجوي بين الكواكب.', 'core', 'B2', 'COCA'],
  ['magnetized', 'adjective', 'ممغنط؛ له حقل مغناطيسي', 'A magnetized core protects a planet from solar wind.', 'يحمي اللب الممغنط الكوكب من الرياح الشمسية.', 'extended', 'B2', 'COCA'],
  ['ionized', 'adjective', 'مُتأيّن؛ فاقد أو مكتسب إلكترونات', 'Ionized gas forms colorful nebulae in space.', 'يشكّل الغاز المُتأيّن سُدماً ملوّنة في الفضاء.', 'mastery', 'C1', 'AWL'],
  ['solar', 'adjective', 'شمسي؛ متعلّق بالشمس', 'Our solar system has eight known planets.', 'يضم نظامنا الشمسي ثمانية كواكب معروفة.', 'core', 'B1', 'CEFR-J'],
  ['lunar', 'adjective', 'قمري؛ متعلّق بالقمر', 'Lunar eclipses occur when Earth blocks sunlight.', 'يحدث خسوف القمر عندما تحجب الأرض ضوء الشمس.', 'core', 'B2', 'COCA'],
  ['planetary', 'adjective', 'كوكبي؛ متعلّق بالكواكب', 'Planetary science studies the formation of worlds.', 'يدرس علم الكواكب تشكّل العوالم.', 'core', 'B2', 'COCA'],
  ['cosmic', 'adjective', 'كوني؛ متعلّق بالكون', 'Cosmic radiation fills the entire universe.', 'يملأ الإشعاع الكوني الكون بأكمله.', 'core', 'B2', 'COCA'],
  ['galactic', 'adjective', 'مجرّي؛ متعلّق بالمجرّة', 'The galactic center contains a supermassive black hole.', 'يحتوي مركز المجرّة على ثقب أسود فائق الكتلة.', 'extended', 'B2', 'COCA'],
  ['exoplanetary', 'adjective', 'متعلّق بالكواكب خارج نظامنا الشمسي', 'Exoplanetary research has advanced rapidly.', 'تقدّم البحث في الكواكب الخارجية بسرعة.', 'mastery', 'academic', 'NAWL'],
  ['icy', 'adjective', 'جليدي؛ مغطّى بالجليد', 'Icy moons like Europa may harbor underground oceans.', 'قد تحتضن الأقمار الجليدية مثل يوروبا محيطات تحت سطحية.', 'core', 'B1', 'CEFR-J'],
  ['tidally-locked', 'adjective', 'مقيّد مدّياً؛ وجه واحد يواجه النجم دائماً', 'Tidally-locked planets have a permanent day and night side.', 'للكواكب المقيّدة مدّياً جانب نهار دائم وجانب ليل دائم.', 'mastery', 'academic', 'NAWL'],
];

async function main() {
  const client = await pool.connect();
  const BATCH_ID = 19;

  const units = [
    { num: 1, data: unit1, label: 'Bioethics' },
    { num: 2, data: unit2, label: 'Deep Ocean' },
    { num: 3, data: unit3, label: 'Food Security' },
    { num: 4, data: unit4, label: 'Biomimicry' },
    { num: 5, data: unit5, label: 'Migration' },
    { num: 6, data: unit6, label: 'Cryptocurrency' },
    { num: 7, data: unit7, label: 'Crowd Psychology' },
    { num: 8, data: unit8, label: 'Forensic Science' },
    { num: 9, data: unit9, label: 'Archaeology' },
    { num: 10, data: unit10, label: 'Longevity' },
    { num: 11, data: unit11, label: 'Sustainable Architecture' },
    { num: 12, data: unit12, label: 'Exoplanets' },
  ];

  let totalInserted = 0;
  let totalWords = 0;

  try {
    for (const u of units) {
      const count = await insertBatch(client, u.data, u.num, BATCH_ID);
      console.log(`Unit ${u.num} (${u.label}): ${count}/${u.data.length} inserted`);
      totalInserted += count;
      totalWords += u.data.length;
    }
    console.log(`\n=== INSERTION COMPLETE ===`);
    console.log(`Total: ${totalInserted}/${totalWords} words inserted (batch_id=${BATCH_ID})\n`);

    // Query final totals per unit
    const res = await client.query(
      `SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [BATCH_ID]
    );
    console.log('=== DB TOTALS PER UNIT (batch_id=19) ===');
    let dbTotal = 0;
    for (const row of res.rows) {
      console.log(`  Unit ${row.recommended_unit}: ${row.cnt} words`);
      dbTotal += parseInt(row.cnt);
    }
    console.log(`  TOTAL: ${dbTotal} words\n`);

    // Overall total in table
    const allRes = await client.query(`SELECT COUNT(*) as cnt FROM public.vocab_staging_l4`);
    console.log(`Overall vocab_staging_l4 total: ${allRes.rows[0].cnt} words`);

  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
