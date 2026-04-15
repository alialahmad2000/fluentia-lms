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
    // U10 Longevity - 35 niche terms
    const u10 = [
      ['geriatric assessment', 'noun', 'تقييم الشيخوخة', 'A geriatric assessment evaluates the health of elderly patients.', 'يقيم تقييم الشيخوخة صحة المرضى المسنين.', 'extended', 'B2', 'COCA'],
      ['activities of daily living', 'noun', 'أنشطة الحياة اليومية', 'Activities of daily living include bathing, dressing, and eating.', 'تشمل أنشطة الحياة اليومية الاستحمام والملبس والأكل.', 'core', 'B2', 'COCA'],
      ['instrumental activities', 'noun', 'الأنشطة الوسيلية', 'Instrumental activities include cooking, shopping, and managing finances.', 'تشمل الأنشطة الوسيلية الطبخ والتسوق وإدارة الشؤون المالية.', 'extended', 'B2', 'COCA'],
      ['mini-mental state examination', 'noun', 'فحص الحالة العقلية المصغر', 'The mini-mental state examination screens for cognitive impairment.', 'يفحص فحص الحالة العقلية المصغر الضعف الإدراكي.', 'extended', 'B2', 'COCA'],
      ['Montreal cognitive assessment', 'noun', 'تقييم مونتريال المعرفي', 'The Montreal cognitive assessment detects mild cognitive impairment.', 'يكشف تقييم مونتريال المعرفي الضعف الإدراكي الخفيف.', 'extended', 'B2', 'COCA'],
      ['clock drawing test', 'noun', 'اختبار رسم الساعة', 'The clock drawing test quickly screens for dementia.', 'يفحص اختبار رسم الساعة بسرعة الخرف.', 'core', 'B2', 'COCA'],
      ['trail making test', 'noun', 'اختبار صنع المسار', 'The trail making test measures processing speed and mental flexibility.', 'يقيس اختبار صنع المسار سرعة المعالجة والمرونة العقلية.', 'extended', 'B2', 'COCA'],
      ['verbal fluency test', 'noun', 'اختبار الطلاقة اللفظية', 'A verbal fluency test assesses language and executive function.', 'يقيم اختبار الطلاقة اللفظية اللغة والوظيفة التنفيذية.', 'extended', 'B2', 'COCA'],
      ['geriatric depression scale', 'noun', 'مقياس اكتئاب الشيخوخة', 'The geriatric depression scale identifies depression in older adults.', 'يحدد مقياس اكتئاب الشيخوخة الاكتئاب عند كبار السن.', 'extended', 'B2', 'COCA'],
      ['falls risk assessment', 'noun', 'تقييم خطر السقوط', 'A falls risk assessment identifies factors that increase fall likelihood.', 'يحدد تقييم خطر السقوط العوامل التي تزيد من احتمالية السقوط.', 'core', 'B2', 'COCA'],
      ['Timed Up and Go test', 'noun', 'اختبار القيام والذهاب الموقوت', 'The Timed Up and Go test measures mobility and balance.', 'يقيس اختبار القيام والذهاب الموقوت الحركة والتوازن.', 'extended', 'B2', 'COCA'],
      ['Berg balance scale', 'noun', 'مقياس بيرغ للتوازن', 'The Berg balance scale assesses functional balance in elderly patients.', 'يقيم مقياس بيرغ للتوازن التوازن الوظيفي عند المرضى المسنين.', 'extended', 'B2', 'COCA'],
      ['six-minute walk test', 'noun', 'اختبار المشي لست دقائق', 'The six-minute walk test measures cardiopulmonary endurance.', 'يقيس اختبار المشي لست دقائق تحمل القلب والرئتين.', 'extended', 'B2', 'COCA'],
      ['gait speed test', 'noun', 'اختبار سرعة المشي', 'Gait speed test predicts disability and mortality in older adults.', 'يتنبأ اختبار سرعة المشي بالإعاقة والوفيات عند كبار السن.', 'extended', 'B2', 'COCA'],
      ['hand grip test', 'noun', 'اختبار قبضة اليد', 'The hand grip test measures upper body strength.', 'يقيس اختبار قبضة اليد قوة الجزء العلوي من الجسم.', 'core', 'B1', 'COCA'],
      ['chair stand test', 'noun', 'اختبار الوقوف من الكرسي', 'The chair stand test assesses lower body strength.', 'يقيم اختبار الوقوف من الكرسي قوة الجزء السفلي من الجسم.', 'core', 'B1', 'COCA'],
      ['frailty phenotype', 'noun', 'النمط الظاهري للهشاشة', 'The frailty phenotype includes weakness, slowness, and weight loss.', 'يشمل النمط الظاهري للهشاشة الضعف والبطء وفقدان الوزن.', 'mastery', 'C1', 'COCA'],
      ['deficit accumulation model', 'noun', 'نموذج تراكم العجز', 'The deficit accumulation model counts health problems to measure frailty.', 'يعد نموذج تراكم العجز المشاكل الصحية لقياس الهشاشة.', 'mastery', 'C1', 'COCA'],
      ['polypharmacy assessment', 'noun', 'تقييم تعدد الأدوية', 'A polypharmacy assessment reviews medication interactions in the elderly.', 'يراجع تقييم تعدد الأدوية تفاعلات الأدوية عند كبار السن.', 'extended', 'B2', 'COCA'],
      ['medication reconciliation', 'noun', 'مطابقة الأدوية', 'Medication reconciliation prevents harmful drug interactions.', 'تمنع مطابقة الأدوية تفاعلات الأدوية الضارة.', 'extended', 'B2', 'COCA'],
      ['deprescribing protocol', 'noun', 'بروتوكول إيقاف الأدوية', 'A deprescribing protocol safely reduces unnecessary medications.', 'يقلل بروتوكول إيقاف الأدوية الأدوية غير الضرورية بأمان.', 'mastery', 'C1', 'COCA'],
      ['medication tapering', 'noun', 'تقليل الجرعة التدريجي', 'Medication tapering gradually decreases dosage to avoid withdrawal.', 'يقلل تقليل الجرعة التدريجي الجرعة بالتدريج لتجنب الانسحاب.', 'extended', 'B2', 'COCA'],
      ['adverse drug reaction', 'noun', 'تفاعل دوائي ضار', 'An adverse drug reaction is an unintended harmful response to medication.', 'التفاعل الدوائي الضار هو استجابة ضارة غير مقصودة للدواء.', 'extended', 'B2', 'COCA'],
      ['pharmacovigilance system', 'noun', 'نظام اليقظة الدوائية', 'A pharmacovigilance system monitors drug safety after market approval.', 'يراقب نظام اليقظة الدوائية سلامة الأدوية بعد الموافقة على التسويق.', 'mastery', 'C1', 'COCA'],
      ['signal detection method', 'noun', 'طريقة كشف الإشارات', 'A signal detection method identifies potential safety concerns.', 'تحدد طريقة كشف الإشارات مخاوف السلامة المحتملة.', 'mastery', 'C1', 'COCA'],
      ['self-controlled case series', 'noun', 'سلسلة حالات ذاتية التحكم', 'A self-controlled case series compares risk periods within individuals.', 'تقارن سلسلة الحالات ذاتية التحكم فترات الخطر داخل الأفراد.', 'mastery', 'C1', 'COCA'],
      ['case-crossover design', 'noun', 'تصميم الحالة المتقاطعة', 'A case-crossover design studies transient risk factors.', 'يدرس تصميم الحالة المتقاطعة عوامل الخطر العابرة.', 'mastery', 'C1', 'COCA'],
      ['epigenetic clock', 'noun', 'الساعة فوق الجينية', 'An epigenetic clock estimates biological age from DNA methylation.', 'تقدر الساعة فوق الجينية العمر البيولوجي من مثيلة الحمض النووي.', 'mastery', 'C1', 'COCA'],
      ['biological age marker', 'noun', 'مؤشر العمر البيولوجي', 'A biological age marker measures aging more accurately than birth date.', 'يقيس مؤشر العمر البيولوجي الشيخوخة بدقة أكبر من تاريخ الميلاد.', 'extended', 'B2', 'COCA'],
      ['telomere length test', 'noun', 'اختبار طول التيلومير', 'A telomere length test indicates cellular aging status.', 'يشير اختبار طول التيلومير إلى حالة شيخوخة الخلايا.', 'extended', 'B2', 'COCA'],
      ['caloric restriction mimetic', 'noun', 'محاكي تقييد السعرات', 'A caloric restriction mimetic activates longevity pathways without dieting.', 'ينشط محاكي تقييد السعرات مسارات الطول العمري دون حمية.', 'mastery', 'C1', 'COCA'],
      ['senolytics therapy', 'noun', 'علاج إزالة الخلايا الشائخة', 'Senolytics therapy clears aging cells to rejuvenate tissues.', 'يزيل علاج إزالة الخلايا الشائخة الخلايا المتقادمة لتجديد الأنسجة.', 'mastery', 'C1', 'COCA'],
      ['rapamycin analog', 'noun', 'نظير الراباميسين', 'A rapamycin analog extends lifespan in laboratory animals.', 'يطيل نظير الراباميسين عمر الحيوانات المخبرية.', 'mastery', 'C1', 'COCA'],
      ['NAD precursor supplement', 'noun', 'مكمل سلف NAD', 'An NAD precursor supplement boosts cellular energy production.', 'يعزز مكمل سلف NAD إنتاج الطاقة الخلوية.', 'mastery', 'C1', 'COCA'],
      ['continuous glucose monitor', 'noun', 'جهاز مراقبة الجلوكوز المستمر', 'A continuous glucose monitor tracks blood sugar levels in real time.', 'يتتبع جهاز مراقبة الجلوكوز المستمر مستويات السكر في الدم في الوقت الفعلي.', 'extended', 'B2', 'COCA'],
    ];
    let r10 = await insertBatch(client, u10, 10, 32);
    console.log(`U10: ${r10} inserted`);

    // U11 Sustainable Architecture - 35 niche terms
    const u11 = [
      ['embodied carbon calculation', 'noun', 'حساب الكربون المتضمن', 'Embodied carbon calculation measures CO2 from building materials.', 'يقيس حساب الكربون المتضمن ثاني أكسيد الكربون من مواد البناء.', 'mastery', 'C1', 'COCA'],
      ['operational carbon tracking', 'noun', 'تتبع الكربون التشغيلي', 'Operational carbon tracking monitors energy-related emissions during use.', 'يراقب تتبع الكربون التشغيلي الانبعاثات المتعلقة بالطاقة أثناء الاستخدام.', 'mastery', 'C1', 'COCA'],
      ['whole-life carbon assessment', 'noun', 'تقييم الكربون مدى الحياة', 'A whole-life carbon assessment includes construction and demolition emissions.', 'يشمل تقييم الكربون مدى الحياة انبعاثات البناء والهدم.', 'mastery', 'C1', 'AWL'],
      ['cradle-to-cradle design', 'noun', 'تصميم من المهد إلى المهد', 'Cradle-to-cradle design ensures materials can be endlessly recycled.', 'يضمن تصميم من المهد إلى المهد إمكانية إعادة تدوير المواد بلا نهاية.', 'extended', 'B2', 'COCA'],
      ['design for disassembly', 'noun', 'التصميم للتفكيك', 'Design for disassembly allows building components to be easily separated.', 'يسمح التصميم للتفكيك بفصل مكونات المبنى بسهولة.', 'extended', 'B2', 'COCA'],
      ['material passport', 'noun', 'جواز سفر المواد', 'A material passport documents the composition of building materials.', 'يوثق جواز سفر المواد تركيبة مواد البناء.', 'mastery', 'C1', 'COCA'],
      ['building information modeling', 'noun', 'نمذجة معلومات البناء', 'Building information modeling creates digital representations of structures.', 'تنشئ نمذجة معلومات البناء تمثيلات رقمية للهياكل.', 'extended', 'B2', 'COCA'],
      ['digital twin building', 'noun', 'توأم رقمي للمبنى', 'A digital twin building simulates performance in real time.', 'يحاكي التوأم الرقمي للمبنى الأداء في الوقت الفعلي.', 'extended', 'B2', 'COCA'],
      ['parametric design tool', 'noun', 'أداة تصميم حدودي', 'A parametric design tool generates forms from mathematical rules.', 'تولد أداة التصميم الحدودي أشكالاً من القواعد الرياضية.', 'extended', 'B2', 'COCA'],
      ['generative design algorithm', 'noun', 'خوارزمية تصميم توليدي', 'A generative design algorithm explores thousands of design options.', 'تستكشف خوارزمية التصميم التوليدي آلاف خيارات التصميم.', 'mastery', 'C1', 'COCA'],
      ['bioclimatic design strategy', 'noun', 'استراتيجية التصميم المناخي الحيوي', 'A bioclimatic design strategy adapts buildings to local climate.', 'تتكيف استراتيجية التصميم المناخي الحيوي المباني مع المناخ المحلي.', 'extended', 'B2', 'COCA'],
      ['microclimate analysis tool', 'noun', 'أداة تحليل المناخ المصغر', 'A microclimate analysis tool maps temperature and wind around buildings.', 'ترسم أداة تحليل المناخ المصغر خريطة الحرارة والرياح حول المباني.', 'mastery', 'C1', 'COCA'],
      ['urban heat island effect', 'noun', 'تأثير الجزيرة الحرارية الحضرية', 'The urban heat island effect makes cities warmer than surrounding areas.', 'يجعل تأثير الجزيرة الحرارية الحضرية المدن أكثر دفئاً من المناطق المحيطة.', 'extended', 'B2', 'COCA'],
      ['sky view factor', 'noun', 'عامل رؤية السماء', 'The sky view factor measures how much sky is visible from a point.', 'يقيس عامل رؤية السماء مقدار السماء المرئية من نقطة.', 'mastery', 'C1', 'COCA'],
      ['mean radiant temperature', 'noun', 'متوسط درجة حرارة الإشعاع', 'Mean radiant temperature accounts for heat from surrounding surfaces.', 'يحسب متوسط درجة حرارة الإشعاع الحرارة من الأسطح المحيطة.', 'mastery', 'C1', 'COCA'],
      ['predicted mean vote index', 'noun', 'مؤشر التصويت المتوسط المتوقع', 'The predicted mean vote index rates thermal comfort on a seven-point scale.', 'يصنف مؤشر التصويت المتوسط المتوقع الراحة الحرارية على مقياس من سبع نقاط.', 'mastery', 'C1', 'COCA'],
      ['adaptive comfort model', 'noun', 'نموذج الراحة التكيفي', 'The adaptive comfort model adjusts comfort ranges for climate zones.', 'يعدل نموذج الراحة التكيفي نطاقات الراحة للمناطق المناخية.', 'mastery', 'C1', 'COCA'],
      ['natural ventilation design', 'noun', 'تصميم التهوية الطبيعية', 'Natural ventilation design reduces air conditioning energy use.', 'يقلل تصميم التهوية الطبيعية استخدام طاقة تكييف الهواء.', 'extended', 'B2', 'COCA'],
      ['buoyancy-driven ventilation', 'noun', 'تهوية بالطفو', 'Buoyancy-driven ventilation uses warm air rising to move air through buildings.', 'تستخدم التهوية بالطفو ارتفاع الهواء الدافئ لتحريك الهواء عبر المباني.', 'mastery', 'C1', 'COCA'],
      ['wind-driven ventilation', 'noun', 'تهوية بالرياح', 'Wind-driven ventilation uses wind pressure to push air through openings.', 'تستخدم التهوية بالرياح ضغط الرياح لدفع الهواء عبر الفتحات.', 'extended', 'B2', 'COCA'],
      ['coefficient of performance', 'noun', 'معامل الأداء', 'The coefficient of performance measures heat pump efficiency.', 'يقيس معامل الأداء كفاءة المضخة الحرارية.', 'extended', 'B2', 'COCA'],
      ['seasonal performance factor', 'noun', 'عامل الأداء الموسمي', 'The seasonal performance factor averages efficiency across all seasons.', 'يحسب عامل الأداء الموسمي متوسط الكفاءة عبر جميع الفصول.', 'mastery', 'C1', 'COCA'],
      ['heating degree day', 'noun', 'يوم درجة التدفئة', 'A heating degree day quantifies heating demand below a base temperature.', 'يحدد يوم درجة التدفئة كمية الطلب على التدفئة تحت درجة حرارة أساسية.', 'extended', 'B2', 'COCA'],
      ['cooling degree day', 'noun', 'يوم درجة التبريد', 'A cooling degree day measures cooling demand above the base temperature.', 'يقيس يوم درجة التبريد الطلب على التبريد فوق درجة الحرارة الأساسية.', 'extended', 'B2', 'COCA'],
      ['energy performance certificate', 'noun', 'شهادة أداء الطاقة', 'An energy performance certificate rates a building\'s energy efficiency.', 'تصنف شهادة أداء الطاقة كفاءة الطاقة للمبنى.', 'extended', 'B2', 'COCA'],
      ['nearly zero-energy building', 'noun', 'مبنى شبه خال من الطاقة', 'A nearly zero-energy building produces almost as much energy as it uses.', 'ينتج المبنى شبه الخالي من الطاقة تقريباً نفس الطاقة التي يستهلكها.', 'extended', 'B2', 'COCA'],
      ['positive energy building', 'noun', 'مبنى ذو طاقة إيجابية', 'A positive energy building generates more energy than it consumes.', 'يولد المبنى ذو الطاقة الإيجابية طاقة أكثر مما يستهلك.', 'extended', 'B2', 'COCA'],
      ['living building challenge', 'noun', 'تحدي المبنى الحي', 'The living building challenge sets the highest sustainability standard.', 'يضع تحدي المبنى الحي أعلى معيار للاستدامة.', 'mastery', 'C1', 'COCA'],
      ['BREEAM certification', 'noun', 'شهادة بريام', 'BREEAM certification assesses environmental performance of buildings.', 'تقيم شهادة بريام الأداء البيئي للمباني.', 'extended', 'B2', 'COCA'],
      ['Passivhaus certification', 'noun', 'شهادة المنزل السلبي', 'Passivhaus certification requires ultra-low energy consumption.', 'تتطلب شهادة المنزل السلبي استهلاكاً منخفضاً للغاية للطاقة.', 'extended', 'B2', 'COCA'],
      ['net metering policy', 'noun', 'سياسة القياس الصافي', 'A net metering policy credits solar energy fed back to the grid.', 'تعتمد سياسة القياس الصافي الطاقة الشمسية المعادة إلى الشبكة.', 'extended', 'B2', 'COCA'],
      ['feed-in tariff', 'noun', 'تعرفة التغذية', 'A feed-in tariff pays building owners for renewable energy production.', 'تدفع تعرفة التغذية لمالكي المباني مقابل إنتاج الطاقة المتجددة.', 'extended', 'B2', 'COCA'],
      ['power purchase agreement', 'noun', 'اتفاقية شراء الطاقة', 'A power purchase agreement finances solar installations on buildings.', 'تمول اتفاقية شراء الطاقة تركيبات الطاقة الشمسية على المباني.', 'extended', 'B2', 'COCA'],
      ['carbon offset program', 'noun', 'برنامج تعويض الكربون', 'A carbon offset program compensates for unavoidable emissions.', 'يعوض برنامج تعويض الكربون عن الانبعاثات التي لا يمكن تجنبها.', 'extended', 'B2', 'COCA'],
      ['social cost of carbon', 'noun', 'التكلفة الاجتماعية للكربون', 'The social cost of carbon estimates economic damage per ton of CO2.', 'تقدر التكلفة الاجتماعية للكربون الضرر الاقتصادي لكل طن من ثاني أكسيد الكربون.', 'mastery', 'C1', 'AWL'],
    ];
    let r11 = await insertBatch(client, u11, 11, 32);
    console.log(`U11: ${r11} inserted`);

    // U12 Exoplanets - 35 niche terms
    const u12 = [
      ['transit method detection', 'noun', 'كشف طريقة العبور', 'Transit method detection finds planets by measuring starlight dips.', 'يجد كشف طريقة العبور الكواكب عبر قياس انخفاضات ضوء النجوم.', 'extended', 'B2', 'COCA'],
      ['radial velocity technique', 'noun', 'تقنية السرعة الشعاعية', 'The radial velocity technique detects planets from stellar wobble.', 'تكشف تقنية السرعة الشعاعية الكواكب من تذبذب النجوم.', 'extended', 'B2', 'COCA'],
      ['direct imaging method', 'noun', 'طريقة التصوير المباشر', 'The direct imaging method photographs exoplanets directly.', 'تصور طريقة التصوير المباشر الكواكب الخارجية مباشرة.', 'extended', 'B2', 'COCA'],
      ['gravitational microlensing event', 'noun', 'حدث العدسة الجاذبية الدقيقة', 'A gravitational microlensing event briefly magnifies a background star.', 'يكبر حدث العدسة الجاذبية الدقيقة نجم الخلفية لفترة وجيزة.', 'mastery', 'C1', 'COCA'],
      ['transit timing variation', 'noun', 'تغير توقيت العبور', 'Transit timing variation reveals unseen planets from gravitational tugs.', 'يكشف تغير توقيت العبور كواكب غير مرئية من السحب الجاذبي.', 'mastery', 'C1', 'COCA'],
      ['transmission spectroscopy technique', 'noun', 'تقنية مطيافية النفاذ', 'Transmission spectroscopy technique analyzes starlight filtered through atmospheres.', 'تحلل تقنية مطيافية النفاذ ضوء النجوم المرشح عبر الغلاف الجوي.', 'mastery', 'C1', 'COCA'],
      ['habitable zone boundary', 'noun', 'حدود المنطقة الصالحة للسكن', 'The habitable zone boundary defines where liquid water can exist.', 'تحدد حدود المنطقة الصالحة للسكن أين يمكن وجود الماء السائل.', 'extended', 'B2', 'COCA'],
      ['runaway greenhouse effect', 'noun', 'تأثير الاحتباس الحراري الجامح', 'A runaway greenhouse effect made Venus uninhabitable.', 'جعل تأثير الاحتباس الحراري الجامح كوكب الزهرة غير صالح للسكن.', 'extended', 'B2', 'COCA'],
      ['biosignature gas detection', 'noun', 'كشف غاز المؤشر الحيوي', 'Biosignature gas detection searches for signs of life on exoplanets.', 'يبحث كشف غاز المؤشر الحيوي عن علامات الحياة على الكواكب الخارجية.', 'mastery', 'C1', 'COCA'],
      ['oxygen biosignature', 'noun', 'المؤشر الحيوي للأكسجين', 'An oxygen biosignature might indicate photosynthetic life.', 'قد يشير المؤشر الحيوي للأكسجين إلى حياة ضوئية.', 'mastery', 'C1', 'COCA'],
      ['methane biosignature', 'noun', 'المؤشر الحيوي للميثان', 'A methane biosignature combined with oxygen suggests biological activity.', 'يشير المؤشر الحيوي للميثان مع الأكسجين إلى نشاط بيولوجي.', 'mastery', 'C1', 'COCA'],
      ['equilibrium temperature', 'noun', 'درجة حرارة التوازن', 'The equilibrium temperature estimates a planet\'s surface temperature.', 'تقدر درجة حرارة التوازن درجة حرارة سطح الكوكب.', 'extended', 'B2', 'COCA'],
      ['instellation flux', 'noun', 'تدفق الإشعاع النجمي', 'Instellation flux measures the stellar energy received by a planet.', 'يقيس تدفق الإشعاع النجمي الطاقة النجمية التي يتلقاها الكوكب.', 'mastery', 'C1', 'COCA'],
      ['geometric albedo', 'noun', 'البياض الهندسي', 'The geometric albedo measures how much light a planet reflects directly.', 'يقيس البياض الهندسي مقدار الضوء الذي يعكسه الكوكب مباشرة.', 'mastery', 'C1', 'COCA'],
      ['mass-radius relationship', 'noun', 'علاقة الكتلة والنصف القطر', 'The mass-radius relationship constrains planetary composition.', 'تقيد علاقة الكتلة والنصف القطر تركيبة الكوكب.', 'mastery', 'C1', 'COCA'],
      ['super-Earth classification', 'noun', 'تصنيف الأرض الفائقة', 'A super-Earth classification includes rocky planets larger than Earth.', 'يشمل تصنيف الأرض الفائقة الكواكب الصخرية الأكبر من الأرض.', 'extended', 'B2', 'COCA'],
      ['mini-Neptune classification', 'noun', 'تصنيف نبتون المصغر', 'A mini-Neptune classification applies to small gaseous planets.', 'ينطبق تصنيف نبتون المصغر على الكواكب الغازية الصغيرة.', 'extended', 'B2', 'COCA'],
      ['hot Jupiter planet', 'noun', 'كوكب المشتري الحار', 'A hot Jupiter planet orbits very close to its host star.', 'يدور كوكب المشتري الحار قريباً جداً من نجمه المضيف.', 'extended', 'B2', 'COCA'],
      ['warm Neptune planet', 'noun', 'كوكب نبتون الدافئ', 'A warm Neptune planet has moderate temperature and gaseous atmosphere.', 'يتميز كوكب نبتون الدافئ بدرجة حرارة معتدلة وغلاف جوي غازي.', 'extended', 'B2', 'COCA'],
      ['ocean world hypothesis', 'noun', 'فرضية العالم المحيطي', 'The ocean world hypothesis suggests some exoplanets are covered in water.', 'تقترح فرضية العالم المحيطي أن بعض الكواكب الخارجية مغطاة بالماء.', 'mastery', 'C1', 'COCA'],
      ['atmospheric escape process', 'noun', 'عملية الهروب الجوي', 'The atmospheric escape process strips light gases from small planets.', 'تجرد عملية الهروب الجوي الغازات الخفيفة من الكواكب الصغيرة.', 'mastery', 'C1', 'COCA'],
      ['stellar wind erosion', 'noun', 'تآكل الرياح النجمية', 'Stellar wind erosion gradually removes planetary atmospheres.', 'يزيل تآكل الرياح النجمية تدريجياً الأغلفة الجوية للكواكب.', 'mastery', 'C1', 'COCA'],
      ['tidal locking phenomenon', 'noun', 'ظاهرة القفل المدي', 'Tidal locking phenomenon makes one side always face the star.', 'تجعل ظاهرة القفل المدي جانباً واحداً يواجه النجم دائماً.', 'extended', 'B2', 'COCA'],
      ['protoplanetary disk formation', 'noun', 'تشكل القرص الكوكبي الأولي', 'Protoplanetary disk formation begins when gas and dust collapse.', 'يبدأ تشكل القرص الكوكبي الأولي عندما ينهار الغاز والغبار.', 'mastery', 'C1', 'COCA'],
      ['core accretion model', 'noun', 'نموذج التراكم اللبي', 'The core accretion model explains gas giant formation from rocky cores.', 'يفسر نموذج التراكم اللبي تشكل العمالقة الغازية من نوى صخرية.', 'mastery', 'C1', 'COCA'],
      ['disk instability model', 'noun', 'نموذج عدم استقرار القرص', 'The disk instability model proposes giant planets form from disk fragments.', 'يقترح نموذج عدم استقرار القرص أن الكواكب العملاقة تتشكل من شظايا القرص.', 'mastery', 'C1', 'COCA'],
      ['Kepler space telescope', 'noun', 'تلسكوب كيبلر الفضائي', 'The Kepler space telescope discovered thousands of exoplanets.', 'اكتشف تلسكوب كيبلر الفضائي آلاف الكواكب الخارجية.', 'core', 'B2', 'COCA'],
      ['TESS mission satellite', 'noun', 'قمر مهمة تيس', 'The TESS mission satellite surveys nearby bright stars for planets.', 'يرصد قمر مهمة تيس النجوم الساطعة القريبة بحثاً عن الكواكب.', 'extended', 'B2', 'COCA'],
      ['James Webb Space Telescope', 'noun', 'تلسكوب جيمس ويب الفضائي', 'The James Webb Space Telescope studies exoplanet atmospheres in detail.', 'يدرس تلسكوب جيمس ويب الفضائي الأغلفة الجوية للكواكب الخارجية بالتفصيل.', 'core', 'B2', 'COCA'],
      ['coronagraphic instrument', 'noun', 'أداة إكليلية', 'A coronagraphic instrument blocks starlight to reveal orbiting planets.', 'تحجب الأداة الإكليلية ضوء النجوم لكشف الكواكب المدارية.', 'mastery', 'C1', 'COCA'],
      ['adaptive optics system', 'noun', 'نظام البصريات التكيفية', 'An adaptive optics system corrects atmospheric blur in telescope images.', 'يصحح نظام البصريات التكيفية التشويش الجوي في صور التلسكوب.', 'mastery', 'C1', 'COCA'],
      ['wavefront sensor', 'noun', 'مستشعر جبهة الموجة', 'A wavefront sensor measures distortions caused by Earth\'s atmosphere.', 'يقيس مستشعر جبهة الموجة التشوهات الناتجة عن الغلاف الجوي للأرض.', 'mastery', 'C1', 'COCA'],
      ['deformable mirror', 'noun', 'مرآة قابلة للتشكيل', 'A deformable mirror adjusts its shape to cancel atmospheric distortion.', 'تعدل المرآة القابلة للتشكيل شكلها لإلغاء التشوه الجوي.', 'mastery', 'C1', 'COCA'],
      ['spectral type classification', 'noun', 'تصنيف النوع الطيفي', 'Spectral type classification categorizes stars by temperature and color.', 'يصنف تصنيف النوع الطيفي النجوم حسب الحرارة واللون.', 'extended', 'B2', 'COCA'],
      ['Hertzsprung-Russell diagram', 'noun', 'مخطط هرتزشبرونج-راسل', 'The Hertzsprung-Russell diagram plots star luminosity versus temperature.', 'يرسم مخطط هرتزشبرونج-راسل لمعان النجوم مقابل الحرارة.', 'mastery', 'C1', 'COCA'],
    ];
    let r12 = await insertBatch(client, u12, 12, 32);
    console.log(`U12: ${r12} inserted`);

    // Final totals
    const total = await client.query('SELECT COUNT(*) AS total FROM vocab_staging_l4');
    console.log('\nTotal staged:', total.rows[0].total);
    const perUnit = await client.query('SELECT recommended_unit, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit');
    perUnit.rows.forEach(r => console.log('  U' + r.recommended_unit + ':', r.cnt));

    // Cross-level dedup
    const dedup = await client.query("SELECT COUNT(*) AS cnt FROM vocab_staging_l4 s WHERE EXISTS (SELECT 1 FROM curriculum_vocabulary v JOIN curriculum_readings r ON r.id = v.reading_id JOIN curriculum_units u ON u.id = r.unit_id WHERE LOWER(v.word) = LOWER(s.word))");
    console.log('\nCross-level overlap:', dedup.rows[0].cnt);
    console.log('After dedup:', parseInt(total.rows[0].total) - parseInt(dedup.rows[0].cnt));
    console.log('Projected L4 total:', 274 + parseInt(total.rows[0].total) - parseInt(dedup.rows[0].cnt));
  } finally { client.release(); await pool.end(); }
}
run().catch(e => { console.error(e); process.exit(1); });
