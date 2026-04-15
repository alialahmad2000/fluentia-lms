const { Pool } = require('pg');
const pool = new Pool({ host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false } });

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

async function run() {
  const client = await pool.connect();
  try {
    // U1 Bioethics - 35 niche terms
    const u1 = [
      ['biorepository', 'noun', 'مستودع حيوي', 'The biorepository stores tissue samples for future research.', 'يخزن المستودع الحيوي عينات الأنسجة للأبحاث المستقبلية.', 'mastery', 'C1', 'COCA'],
      ['cryobank', 'noun', 'بنك تبريد', 'The cryobank preserves reproductive cells at ultra-low temperatures.', 'يحفظ بنك التبريد الخلايا التناسلية في درجات حرارة منخفضة للغاية.', 'mastery', 'C1', 'COCA'],
      ['cord blood bank', 'noun', 'بنك دم الحبل السري', 'Parents can store cord blood in a cord blood bank after birth.', 'يمكن للوالدين تخزين دم الحبل السري في بنك دم الحبل السري بعد الولادة.', 'extended', 'C1', 'COCA'],
      ['biospecimen', 'noun', 'عينة حيوية', 'Each biospecimen was labeled with a unique identifier.', 'تم تصنيف كل عينة حيوية بمعرف فريد.', 'mastery', 'C1', 'COCA'],
      ['buccal swab', 'noun', 'مسحة فموية', 'A buccal swab collects DNA from the inside of the cheek.', 'تجمع المسحة الفموية الحمض النووي من داخل الخد.', 'extended', 'B2', 'COCA'],
      ['venipuncture', 'noun', 'بزل الوريد', 'Venipuncture is the standard method for drawing blood samples.', 'بزل الوريد هو الطريقة القياسية لسحب عينات الدم.', 'mastery', 'C1', 'COCA'],
      ['phlebotomy', 'noun', 'سحب الدم', 'She trained in phlebotomy before working at the clinic.', 'تدربت على سحب الدم قبل العمل في العيادة.', 'extended', 'B2', 'COCA'],
      ['cryovial', 'noun', 'أنبوب تبريد', 'The sample was transferred to a cryovial for long-term storage.', 'تم نقل العينة إلى أنبوب تبريد للتخزين طويل الأمد.', 'mastery', 'C1', 'COCA'],
      ['biomarker panel', 'noun', 'لوحة المؤشرات الحيوية', 'The biomarker panel can detect early signs of cancer.', 'يمكن للوحة المؤشرات الحيوية كشف علامات السرطان المبكرة.', 'extended', 'B2', 'COCA'],
      ['gene panel', 'noun', 'لوحة جينية', 'A gene panel tests for multiple genetic mutations simultaneously.', 'تختبر اللوحة الجينية طفرات جينية متعددة في وقت واحد.', 'extended', 'B2', 'COCA'],
      ['whole exome sequencing', 'noun', 'تسلسل الإكسوم الكامل', 'Whole exome sequencing analyzes the protein-coding regions of genes.', 'يحلل تسلسل الإكسوم الكامل المناطق المشفرة للبروتين في الجينات.', 'mastery', 'C1', 'COCA'],
      ['next generation sequencing', 'noun', 'التسلسل من الجيل التالي', 'Next generation sequencing has revolutionized genomic research.', 'أحدث التسلسل من الجيل التالي ثورة في الأبحاث الجينومية.', 'mastery', 'C1', 'AWL'],
      ['polymerase chain reaction', 'noun', 'تفاعل البوليميراز المتسلسل', 'Polymerase chain reaction amplifies small segments of DNA.', 'يضخم تفاعل البوليميراز المتسلسل أجزاء صغيرة من الحمض النووي.', 'extended', 'C1', 'COCA'],
      ['gel electrophoresis', 'noun', 'الفصل الكهربائي الهلامي', 'Gel electrophoresis separates DNA fragments by size.', 'يفصل الفصل الكهربائي الهلامي أجزاء الحمض النووي حسب الحجم.', 'mastery', 'C1', 'COCA'],
      ['flow cytometry', 'noun', 'قياس التدفق الخلوي', 'Flow cytometry counts and sorts cells using laser beams.', 'يعد قياس التدفق الخلوي ويفرز الخلايا باستخدام أشعة الليزر.', 'mastery', 'C1', 'COCA'],
      ['confocal microscopy', 'noun', 'الفحص المجهري البؤري', 'Confocal microscopy produces sharp three-dimensional images of cells.', 'ينتج الفحص المجهري البؤري صور ثلاثية الأبعاد حادة للخلايا.', 'mastery', 'C1', 'COCA'],
      ['spatial transcriptomics', 'noun', 'النسخ المكاني', 'Spatial transcriptomics maps gene expression within tissue sections.', 'يرسم النسخ المكاني خريطة التعبير الجيني داخل مقاطع الأنسجة.', 'mastery', 'C1', 'COCA'],
      ['chromatin immunoprecipitation', 'noun', 'ترسيب الكروماتين المناعي', 'Chromatin immunoprecipitation identifies protein-DNA interactions.', 'يحدد ترسيب الكروماتين المناعي تفاعلات البروتين والحمض النووي.', 'mastery', 'C1', 'COCA'],
      ['bisulfite sequencing', 'noun', 'تسلسل البيسلفيت', 'Bisulfite sequencing detects DNA methylation patterns.', 'يكشف تسلسل البيسلفيت أنماط مثيلة الحمض النووي.', 'mastery', 'C1', 'COCA'],
      ['liquid biopsy', 'noun', 'خزعة سائلة', 'A liquid biopsy detects cancer biomarkers in blood samples.', 'تكشف الخزعة السائلة المؤشرات الحيوية للسرطان في عينات الدم.', 'extended', 'B2', 'COCA'],
      ['circulating tumor DNA', 'noun', 'الحمض النووي الورمي الدوار', 'Circulating tumor DNA provides real-time information about cancer progression.', 'يوفر الحمض النووي الورمي الدوار معلومات آنية عن تطور السرطان.', 'mastery', 'C1', 'COCA'],
      ['chimeric antigen receptor', 'noun', 'مستقبل المستضد الخيمري', 'Chimeric antigen receptor T-cell therapy targets specific cancer cells.', 'يستهدف علاج الخلايا التائية بمستقبل المستضد الخيمري خلايا سرطانية محددة.', 'mastery', 'C1', 'COCA'],
      ['immune checkpoint inhibitor', 'noun', 'مثبط نقاط التفتيش المناعية', 'The immune checkpoint inhibitor helped the immune system fight cancer.', 'ساعد مثبط نقاط التفتيش المناعية الجهاز المناعي على محاربة السرطان.', 'extended', 'C1', 'COCA'],
      ['precision oncology', 'noun', 'علم الأورام الدقيق', 'Precision oncology tailors cancer treatment to individual genetic profiles.', 'يصمم علم الأورام الدقيق علاج السرطان حسب الملفات الجينية الفردية.', 'extended', 'C1', 'COCA'],
      ['theranostics', 'noun', 'العلاج التشخيصي', 'Theranostics combines diagnostic imaging with targeted therapy.', 'يجمع العلاج التشخيصي بين التصوير التشخيصي والعلاج الموجه.', 'mastery', 'C1', 'COCA'],
      ['companion diagnostic', 'noun', 'التشخيص المصاحب', 'A companion diagnostic identifies patients who will benefit from a specific drug.', 'يحدد التشخيص المصاحب المرضى الذين سيستفيدون من دواء معين.', 'extended', 'B2', 'COCA'],
      ['adaptive trial design', 'noun', 'تصميم تجربة تكيفي', 'An adaptive trial design allows modifications based on interim results.', 'يسمح تصميم التجربة التكيفي بإجراء تعديلات بناءً على النتائج المؤقتة.', 'mastery', 'C1', 'AWL'],
      ['pharmacokinetics', 'noun', 'الحرائك الدوائية', 'Pharmacokinetics studies how the body absorbs and eliminates drugs.', 'تدرس الحرائك الدوائية كيفية امتصاص الجسم للأدوية والتخلص منها.', 'extended', 'C1', 'COCA'],
      ['pharmacodynamics', 'noun', 'الديناميكا الدوائية', 'Pharmacodynamics examines how drugs affect the body.', 'تفحص الديناميكا الدوائية كيفية تأثير الأدوية على الجسم.', 'extended', 'C1', 'COCA'],
      ['bioequivalence', 'noun', 'التكافؤ الحيوي', 'A bioequivalence study compares generic and brand-name drugs.', 'تقارن دراسة التكافؤ الحيوي بين الأدوية العامة والأدوية ذات العلامات التجارية.', 'mastery', 'C1', 'COCA'],
      ['non-inferiority trial', 'noun', 'تجربة عدم الدونية', 'A non-inferiority trial shows the new drug is not worse than the standard.', 'تظهر تجربة عدم الدونية أن الدواء الجديد ليس أسوأ من المعيار.', 'mastery', 'C1', 'AWL'],
      ['dose-limiting toxicity', 'noun', 'سمية محددة للجرعة', 'Dose-limiting toxicity determines the maximum safe dosage.', 'تحدد السمية المحددة للجرعة الجرعة الآمنة القصوى.', 'mastery', 'C1', 'COCA'],
      ['adverse event reporting', 'noun', 'الإبلاغ عن الأحداث الضارة', 'Adverse event reporting is mandatory in clinical trials.', 'الإبلاغ عن الأحداث الضارة إلزامي في التجارب السريرية.', 'extended', 'B2', 'AWL'],
      ['data safety monitoring board', 'noun', 'مجلس مراقبة سلامة البيانات', 'The data safety monitoring board reviews trial safety data regularly.', 'يراجع مجلس مراقبة سلامة البيانات بيانات سلامة التجربة بانتظام.', 'mastery', 'C1', 'AWL'],
      ['institutional review board', 'noun', 'مجلس المراجعة المؤسسية', 'The institutional review board must approve all human research protocols.', 'يجب أن يوافق مجلس المراجعة المؤسسية على جميع بروتوكولات البحث البشري.', 'extended', 'B2', 'AWL'],
    ];
    let r1 = await insertBatch(client, u1, 1, 30);
    console.log(`U1: ${r1} inserted`);

    // U2 Deep Ocean - 35 niche terms
    const u2 = [
      ['bathyscaphe', 'noun', 'غواصة الأعماق', 'The bathyscaphe descended to the ocean floor.', 'نزلت غواصة الأعماق إلى قاع المحيط.', 'mastery', 'C1', 'COCA'],
      ['decompression chamber', 'noun', 'غرفة تخفيف الضغط', 'Divers use a decompression chamber after deep dives.', 'يستخدم الغواصون غرفة تخفيف الضغط بعد الغوص العميق.', 'extended', 'B2', 'COCA'],
      ['rebreather apparatus', 'noun', 'جهاز إعادة التنفس', 'A rebreather apparatus recycles exhaled air for longer dives.', 'يعيد جهاز إعادة التنفس تدوير الهواء المزفور لغوصات أطول.', 'mastery', 'C1', 'COCA'],
      ['saturation diving', 'noun', 'الغوص المشبع', 'Saturation diving allows workers to stay at depth for days.', 'يسمح الغوص المشبع للعمال بالبقاء في العمق لأيام.', 'extended', 'B2', 'COCA'],
      ['remotely operated vehicle', 'noun', 'مركبة مشغلة عن بعد', 'The remotely operated vehicle explored the shipwreck.', 'استكشفت المركبة المشغلة عن بعد حطام السفينة.', 'extended', 'B2', 'COCA'],
      ['autonomous underwater vehicle', 'noun', 'مركبة تحت الماء ذاتية القيادة', 'An autonomous underwater vehicle mapped the seafloor independently.', 'رسمت مركبة تحت الماء ذاتية القيادة خريطة لقاع البحر بشكل مستقل.', 'extended', 'B2', 'COCA'],
      ['side-scan sonar', 'noun', 'سونار المسح الجانبي', 'Side-scan sonar creates detailed images of the ocean floor.', 'ينشئ سونار المسح الجانبي صور مفصلة لقاع المحيط.', 'mastery', 'C1', 'COCA'],
      ['multibeam sonar', 'noun', 'سونار متعدد الحزم', 'Multibeam sonar measures water depth across a wide swath.', 'يقيس السونار متعدد الحزم عمق المياه عبر مساحة واسعة.', 'mastery', 'C1', 'COCA'],
      ['acoustic Doppler profiler', 'noun', 'مقياس دوبلر الصوتي', 'An acoustic Doppler profiler measures ocean current velocities.', 'يقيس مقياس دوبلر الصوتي سرعات تيارات المحيط.', 'mastery', 'C1', 'COCA'],
      ['conductivity sensor', 'noun', 'مستشعر الموصلية', 'The conductivity sensor measures the salinity of seawater.', 'يقيس مستشعر الموصلية ملوحة مياه البحر.', 'extended', 'B2', 'COCA'],
      ['dissolved oxygen sensor', 'noun', 'مستشعر الأكسجين المذاب', 'A dissolved oxygen sensor monitors water quality.', 'يراقب مستشعر الأكسجين المذاب جودة المياه.', 'extended', 'B2', 'COCA'],
      ['box corer', 'noun', 'عينة صندوقية', 'A box corer collects undisturbed sediment samples.', 'تجمع العينة الصندوقية عينات رسوبية غير مضطربة.', 'mastery', 'C1', 'COCA'],
      ['gravity corer', 'noun', 'عينة الجاذبية', 'The gravity corer penetrates soft seafloor sediments.', 'تخترق عينة الجاذبية رواسب قاع البحر الناعمة.', 'mastery', 'C1', 'COCA'],
      ['piston corer', 'noun', 'عينة المكبس', 'A piston corer retrieves long sediment columns from the seabed.', 'تستخرج عينة المكبس أعمدة رسوبية طويلة من قاع البحر.', 'mastery', 'C1', 'COCA'],
      ['CTD rosette', 'noun', 'مجموعة CTD', 'The CTD rosette measures conductivity, temperature, and depth.', 'تقيس مجموعة CTD الموصلية ودرجة الحرارة والعمق.', 'mastery', 'C1', 'COCA'],
      ['sediment trap', 'noun', 'مصيدة الرواسب', 'A sediment trap collects particles falling through the water column.', 'تجمع مصيدة الرواسب الجسيمات المتساقطة عبر عمود الماء.', 'extended', 'B2', 'COCA'],
      ['acoustic release', 'noun', 'إطلاق صوتي', 'An acoustic release detaches instruments from the seafloor mooring.', 'يفصل الإطلاق الصوتي الأدوات عن مرساة قاع البحر.', 'mastery', 'C1', 'COCA'],
      ['hydrothermal plume', 'noun', 'عمود حراري مائي', 'A hydrothermal plume rises from deep-sea volcanic vents.', 'يرتفع عمود حراري مائي من فتحات بركانية في أعماق البحار.', 'extended', 'C1', 'COCA'],
      ['black smoker chimney', 'noun', 'مدخنة سوداء', 'A black smoker chimney ejects mineral-rich superheated water.', 'تطلق المدخنة السوداء مياه شديدة الحرارة غنية بالمعادن.', 'mastery', 'C1', 'COCA'],
      ['polymetallic nodule', 'noun', 'عقيدة متعددة المعادن', 'Polymetallic nodules contain manganese, nickel, and cobalt.', 'تحتوي العقيدات متعددة المعادن على المنغنيز والنيكل والكوبالت.', 'mastery', 'C1', 'COCA'],
      ['seafloor spreading', 'noun', 'انتشار قاع البحر', 'Seafloor spreading creates new oceanic crust at mid-ocean ridges.', 'ينشئ انتشار قاع البحر قشرة محيطية جديدة عند حافات منتصف المحيط.', 'extended', 'B2', 'COCA'],
      ['subduction zone', 'noun', 'منطقة الاندساس', 'A subduction zone is where one tectonic plate slides under another.', 'منطقة الاندساس هي حيث تنزلق صفيحة تكتونية تحت أخرى.', 'extended', 'B2', 'COCA'],
      ['abyssal plain', 'noun', 'سهل سحيق', 'The abyssal plain covers most of the deep ocean floor.', 'يغطي السهل السحيق معظم قاع المحيط العميق.', 'extended', 'B2', 'COCA'],
      ['submarine canyon', 'noun', 'وادي بحري', 'A submarine canyon channels sediment from the shelf to the deep sea.', 'يوجه الوادي البحري الرواسب من الجرف إلى أعماق البحر.', 'extended', 'B2', 'COCA'],
      ['turbidity current', 'noun', 'تيار العكارة', 'A turbidity current carries sediment down the continental slope.', 'يحمل تيار العكارة الرواسب أسفل المنحدر القاري.', 'mastery', 'C1', 'COCA'],
      ['methane hydrate', 'noun', 'هيدرات الميثان', 'Methane hydrate is frozen methane trapped in seafloor sediments.', 'هيدرات الميثان هو ميثان متجمد محاصر في رواسب قاع البحر.', 'extended', 'B2', 'COCA'],
      ['cold seep', 'noun', 'تسرب بارد', 'A cold seep releases methane and hydrogen sulfide from the seabed.', 'يطلق التسرب البارد الميثان وكبريتيد الهيدروجين من قاع البحر.', 'mastery', 'C1', 'COCA'],
      ['brine pool', 'noun', 'بركة ملحية', 'A brine pool forms a distinct lake on the ocean floor.', 'تشكل البركة الملحية بحيرة مميزة على قاع المحيط.', 'mastery', 'C1', 'COCA'],
      ['mud volcano', 'noun', 'بركان طيني', 'A mud volcano erupts gas and sediment on the seafloor.', 'يثور البركان الطيني بالغاز والرواسب على قاع البحر.', 'extended', 'B2', 'COCA'],
      ['pelagic ooze', 'noun', 'وحل سطحي', 'Pelagic ooze accumulates from dead plankton on the ocean floor.', 'يتراكم الوحل السطحي من العوالق الميتة على قاع المحيط.', 'mastery', 'C1', 'COCA'],
      ['continental rise', 'noun', 'ارتفاع قاري', 'The continental rise is the gentle slope between the shelf and plain.', 'الارتفاع القاري هو المنحدر اللطيف بين الجرف والسهل.', 'extended', 'B2', 'COCA'],
      ['Niskin bottle', 'noun', 'زجاجة نيسكين', 'A Niskin bottle captures water samples at specific depths.', 'تلتقط زجاجة نيسكين عينات مياه على أعماق محددة.', 'mastery', 'C1', 'COCA'],
      ['plankton net', 'noun', 'شبكة العوالق', 'Scientists tow a plankton net through the water to collect organisms.', 'يسحب العلماء شبكة العوالق عبر الماء لجمع الكائنات الحية.', 'extended', 'B2', 'COCA'],
      ['mooring line', 'noun', 'خط الإرساء', 'The mooring line anchors scientific instruments to the seabed.', 'يثبت خط الإرساء الأدوات العلمية في قاع البحر.', 'extended', 'B2', 'COCA'],
      ['wave buoy', 'noun', 'عوامة الأمواج', 'A wave buoy measures wave height and period in real time.', 'تقيس عوامة الأمواج ارتفاع الموج وفترته في الوقت الفعلي.', 'extended', 'B2', 'COCA'],
    ];
    let r2 = await insertBatch(client, u2, 2, 30);
    console.log(`U2: ${r2} inserted`);

    // U3 Food Security - 35 niche terms
    const u3 = [
      ['food sovereignty', 'noun', 'السيادة الغذائية', 'Food sovereignty gives communities control over their food systems.', 'تمنح السيادة الغذائية المجتمعات السيطرة على أنظمتها الغذائية.', 'extended', 'B2', 'COCA'],
      ['nutrition transition', 'noun', 'التحول الغذائي', 'The nutrition transition shifts diets from traditional to processed foods.', 'يحول التحول الغذائي الأنظمة الغذائية من تقليدية إلى أغذية مصنعة.', 'extended', 'B2', 'COCA'],
      ['stunting prevalence', 'noun', 'انتشار التقزم', 'Stunting prevalence indicates chronic malnutrition in children.', 'يشير انتشار التقزم إلى سوء التغذية المزمن عند الأطفال.', 'mastery', 'C1', 'COCA'],
      ['hidden hunger', 'noun', 'الجوع الخفي', 'Hidden hunger refers to micronutrient deficiencies without visible symptoms.', 'يشير الجوع الخفي إلى نقص المغذيات الدقيقة دون أعراض ظاهرة.', 'extended', 'B2', 'COCA'],
      ['biofortified crop', 'noun', 'محصول معزز حيوياً', 'A biofortified crop has higher levels of essential nutrients.', 'يحتوي المحصول المعزز حيوياً على مستويات أعلى من العناصر الغذائية الأساسية.', 'extended', 'B2', 'COCA'],
      ['golden rice', 'noun', 'الأرز الذهبي', 'Golden rice is engineered to produce beta-carotene.', 'تم تعديل الأرز الذهبي وراثياً لإنتاج بيتا كاروتين.', 'core', 'B2', 'COCA'],
      ['iodized salt', 'noun', 'ملح معالج باليود', 'Iodized salt prevents iodine deficiency disorders.', 'يمنع الملح المعالج باليود اضطرابات نقص اليود.', 'core', 'B1', 'COCA'],
      ['therapeutic food', 'noun', 'غذاء علاجي', 'Ready-to-use therapeutic food treats severe acute malnutrition.', 'يعالج الغذاء العلاجي الجاهز للاستخدام سوء التغذية الحاد الشديد.', 'extended', 'B2', 'COCA'],
      ['supplementary feeding', 'noun', 'تغذية تكميلية', 'A supplementary feeding program supports malnourished mothers.', 'يدعم برنامج التغذية التكميلية الأمهات المصابات بسوء التغذية.', 'extended', 'B2', 'COCA'],
      ['school feeding program', 'noun', 'برنامج التغذية المدرسية', 'The school feeding program provides daily meals to students.', 'يوفر برنامج التغذية المدرسية وجبات يومية للطلاب.', 'core', 'B1', 'COCA'],
      ['cash transfer program', 'noun', 'برنامج التحويلات النقدية', 'A cash transfer program gives money directly to vulnerable families.', 'يمنح برنامج التحويلات النقدية أموالاً مباشرة للعائلات الضعيفة.', 'extended', 'B2', 'COCA'],
      ['strategic grain reserve', 'noun', 'احتياطي الحبوب الاستراتيجي', 'The strategic grain reserve stabilizes food supply during crises.', 'يستقر احتياطي الحبوب الاستراتيجي الإمدادات الغذائية أثناء الأزمات.', 'extended', 'B2', 'COCA'],
      ['price stabilization', 'noun', 'تثبيت الأسعار', 'Price stabilization policies protect farmers from market shocks.', 'تحمي سياسات تثبيت الأسعار المزارعين من صدمات السوق.', 'extended', 'B2', 'AWL'],
      ['minimum support price', 'noun', 'الحد الأدنى لسعر الدعم', 'The minimum support price guarantees income for crop producers.', 'يضمن الحد الأدنى لسعر الدعم الدخل لمنتجي المحاصيل.', 'extended', 'B2', 'COCA'],
      ['fair trade certification', 'noun', 'شهادة التجارة العادلة', 'Fair trade certification ensures ethical production standards.', 'تضمن شهادة التجارة العادلة معايير إنتاج أخلاقية.', 'core', 'B2', 'COCA'],
      ['traceability system', 'noun', 'نظام التتبع', 'A traceability system tracks food from farm to consumer.', 'يتتبع نظام التتبع الغذاء من المزرعة إلى المستهلك.', 'extended', 'B2', 'COCA'],
      ['climate-smart agriculture', 'noun', 'الزراعة الذكية مناخياً', 'Climate-smart agriculture adapts farming to climate change.', 'تتكيف الزراعة الذكية مناخياً مع تغير المناخ.', 'extended', 'B2', 'COCA'],
      ['conservation agriculture', 'noun', 'الزراعة الحافظة', 'Conservation agriculture minimizes soil disturbance.', 'تقلل الزراعة الحافظة من اضطراب التربة.', 'extended', 'B2', 'COCA'],
      ['regenerative agriculture', 'noun', 'الزراعة التجديدية', 'Regenerative agriculture rebuilds soil organic matter.', 'تعيد الزراعة التجديدية بناء المادة العضوية في التربة.', 'extended', 'B2', 'COCA'],
      ['silvopasture system', 'noun', 'نظام الحراجة الرعوية', 'A silvopasture system combines trees with livestock grazing.', 'يجمع نظام الحراجة الرعوية بين الأشجار ورعي الماشية.', 'mastery', 'C1', 'COCA'],
      ['alley cropping', 'noun', 'الزراعة بين الأشجار', 'Alley cropping grows crops between rows of trees.', 'تزرع الزراعة بين الأشجار المحاصيل بين صفوف من الأشجار.', 'mastery', 'C1', 'COCA'],
      ['riparian buffer', 'noun', 'منطقة عازلة نهرية', 'A riparian buffer protects waterways from agricultural runoff.', 'تحمي المنطقة العازلة النهرية المجاري المائية من الجريان الزراعي.', 'mastery', 'C1', 'COCA'],
      ['contour bunding', 'noun', 'بناء السدود الكنتورية', 'Contour bunding prevents soil erosion on sloping farmland.', 'يمنع بناء السدود الكنتورية تآكل التربة على الأراضي الزراعية المنحدرة.', 'mastery', 'C1', 'COCA'],
      ['drip fertigation', 'noun', 'التسميد بالتنقيط', 'Drip fertigation delivers water and nutrients directly to plant roots.', 'يوصل التسميد بالتنقيط الماء والمغذيات مباشرة إلى جذور النبات.', 'mastery', 'C1', 'COCA'],
      ['variable rate application', 'noun', 'التطبيق بمعدل متغير', 'Variable rate application adjusts fertilizer amounts across a field.', 'يعدل التطبيق بمعدل متغير كميات الأسمدة عبر الحقل.', 'mastery', 'C1', 'COCA'],
      ['precision seeding', 'noun', 'البذر الدقيق', 'Precision seeding places seeds at optimal spacing and depth.', 'يضع البذر الدقيق البذور بتباعد وعمق مثاليين.', 'extended', 'B2', 'COCA'],
      ['controlled traffic farming', 'noun', 'الزراعة ذات المرور المسيطر', 'Controlled traffic farming reduces soil compaction by limiting wheel tracks.', 'تقلل الزراعة ذات المرور المسيطر ضغط التربة عبر الحد من مسارات العجلات.', 'mastery', 'C1', 'COCA'],
      ['relay cropping', 'noun', 'الزراعة التتابعية', 'Relay cropping plants a second crop before the first is harvested.', 'تزرع الزراعة التتابعية محصولاً ثانياً قبل حصاد الأول.', 'mastery', 'C1', 'COCA'],
      ['participatory plant breeding', 'noun', 'التربية التشاركية للنبات', 'Participatory plant breeding involves farmers in developing new varieties.', 'تشرك التربية التشاركية للنبات المزارعين في تطوير أصناف جديدة.', 'mastery', 'C1', 'COCA'],
      ['marker-assisted selection', 'noun', 'الانتخاب بمساعدة المؤشرات', 'Marker-assisted selection speeds up crop improvement using DNA markers.', 'يسرع الانتخاب بمساعدة المؤشرات تحسين المحاصيل باستخدام مؤشرات الحمض النووي.', 'mastery', 'C1', 'COCA'],
      ['genomic selection', 'noun', 'الانتخاب الجينومي', 'Genomic selection predicts plant performance from genetic data.', 'يتنبأ الانتخاب الجينومي بأداء النبات من البيانات الجينية.', 'mastery', 'C1', 'COCA'],
      ['food apartheid', 'noun', 'الفصل الغذائي', 'Food apartheid describes systemic barriers to healthy food access.', 'يصف الفصل الغذائي الحواجز النظامية للوصول إلى الغذاء الصحي.', 'extended', 'B2', 'COCA'],
      ['double burden of malnutrition', 'noun', 'العبء المزدوج لسوء التغذية', 'The double burden of malnutrition combines undernutrition and obesity.', 'يجمع العبء المزدوج لسوء التغذية بين نقص التغذية والسمنة.', 'extended', 'C1', 'COCA'],
      ['food-for-work program', 'noun', 'برنامج الغذاء مقابل العمل', 'A food-for-work program provides meals in exchange for community labor.', 'يوفر برنامج الغذاء مقابل العمل وجبات مقابل العمل المجتمعي.', 'extended', 'B2', 'COCA'],
      ['geographical indication', 'noun', 'المؤشر الجغرافي', 'A geographical indication protects products linked to a specific region.', 'يحمي المؤشر الجغرافي المنتجات المرتبطة بمنطقة محددة.', 'extended', 'B2', 'AWL'],
    ];
    let r3 = await insertBatch(client, u3, 3, 30);
    console.log(`U3: ${r3} inserted`);

    // Print totals
    const total = await client.query('SELECT COUNT(*) AS total FROM vocab_staging_l4');
    console.log('\nTotal staged:', total.rows[0].total);
    const perUnit = await client.query('SELECT recommended_unit, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit');
    perUnit.rows.forEach(r => console.log('  U' + r.recommended_unit + ':', r.cnt));
  } finally { client.release(); await pool.end(); }
}
run().catch(e => { console.error(e); process.exit(1); });
