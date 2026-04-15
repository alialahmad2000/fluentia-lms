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
    // 10 ultra-niche words per unit = 120 total, should yield ~110 net new
    const u1 = [
      ['pharmacogenomic testing', 'noun', 'الاختبار الجينومي الدوائي', 'Pharmacogenomic testing personalizes drug prescriptions based on DNA.', 'يخصص الاختبار الجينومي الدوائي وصفات الأدوية بناءً على الحمض النووي.', 'mastery', 'C1', 'COCA'],
      ['CRISPR gene editing', 'noun', 'تعديل جيني كريسبر', 'CRISPR gene editing can correct genetic mutations precisely.', 'يمكن لتعديل كريسبر الجيني تصحيح الطفرات الجينية بدقة.', 'extended', 'B2', 'COCA'],
      ['germline modification', 'noun', 'تعديل الخط الجنسي', 'Germline modification changes DNA that passes to future generations.', 'يغير تعديل الخط الجنسي الحمض النووي الذي ينتقل للأجيال القادمة.', 'mastery', 'C1', 'COCA'],
      ['somatic cell therapy', 'noun', 'علاج الخلايا الجسدية', 'Somatic cell therapy targets non-reproductive cells only.', 'يستهدف علاج الخلايا الجسدية الخلايا غير التناسلية فقط.', 'mastery', 'C1', 'COCA'],
      ['designer baby debate', 'noun', 'جدل الطفل المصمم', 'The designer baby debate raises ethical concerns about genetic selection.', 'يثير جدل الطفل المصمم مخاوف أخلاقية حول الانتقاء الجيني.', 'extended', 'B2', 'COCA'],
      ['genetic discrimination law', 'noun', 'قانون التمييز الجيني', 'A genetic discrimination law protects people from DNA-based bias.', 'يحمي قانون التمييز الجيني الأشخاص من التحيز القائم على الحمض النووي.', 'extended', 'B2', 'COCA'],
      ['biobanking consent', 'noun', 'موافقة التخزين الحيوي', 'Biobanking consent authorizes the storage and use of biological samples.', 'تفوض موافقة التخزين الحيوي تخزين واستخدام العينات البيولوجية.', 'mastery', 'C1', 'COCA'],
      ['xenotransplantation research', 'noun', 'بحث زراعة الأعضاء بين الأنواع', 'Xenotransplantation research uses animal organs for human patients.', 'يستخدم بحث زراعة الأعضاء بين الأنواع أعضاء حيوانية للمرضى البشر.', 'mastery', 'C1', 'COCA'],
      ['bioinformatics pipeline', 'noun', 'خط أنابيب المعلوماتية الحيوية', 'A bioinformatics pipeline processes genomic data automatically.', 'يعالج خط أنابيب المعلوماتية الحيوية البيانات الجينومية تلقائياً.', 'mastery', 'C1', 'COCA'],
      ['proteomics analysis', 'noun', 'تحليل البروتيوميات', 'Proteomics analysis identifies all proteins in a biological sample.', 'يحدد تحليل البروتيوميات جميع البروتينات في عينة بيولوجية.', 'mastery', 'C1', 'COCA'],
    ];
    let r1 = await insertBatch(client, u1, 1, 33); console.log(`U1: ${r1}`);

    const u2 = [
      ['deep-sea mining operation', 'noun', 'عملية التعدين في أعماق البحار', 'A deep-sea mining operation extracts minerals from the seafloor.', 'تستخرج عملية التعدين في أعماق البحار المعادن من قاع البحر.', 'extended', 'B2', 'COCA'],
      ['manganese crust deposit', 'noun', 'رواسب قشرة المنغنيز', 'A manganese crust deposit forms on underwater mountain surfaces.', 'تتشكل رواسب قشرة المنغنيز على أسطح الجبال تحت الماء.', 'mastery', 'C1', 'COCA'],
      ['deep-water coral garden', 'noun', 'حديقة مرجان أعماق المياه', 'A deep-water coral garden supports diverse marine communities.', 'تدعم حديقة مرجان أعماق المياه مجتمعات بحرية متنوعة.', 'extended', 'B2', 'COCA'],
      ['chemosynthetic ecosystem', 'noun', 'نظام بيئي كيميائي التخليق', 'A chemosynthetic ecosystem thrives without sunlight near ocean vents.', 'يزدهر النظام البيئي الكيميائي التخليق بدون ضوء الشمس بالقرب من فتحات المحيط.', 'mastery', 'C1', 'COCA'],
      ['thermohaline circulation', 'noun', 'الدورة الملحية الحرارية', 'Thermohaline circulation drives global ocean current patterns.', 'تحرك الدورة الملحية الحرارية أنماط تيارات المحيط العالمية.', 'mastery', 'C1', 'COCA'],
      ['ocean acidification impact', 'noun', 'تأثير تحمض المحيطات', 'Ocean acidification impact threatens shellfish and coral reefs.', 'يهدد تأثير تحمض المحيطات المحار والشعاب المرجانية.', 'extended', 'B2', 'COCA'],
      ['marine protected area', 'noun', 'منطقة بحرية محمية', 'A marine protected area restricts fishing and industrial activity.', 'تقيد المنطقة البحرية المحمية الصيد والنشاط الصناعي.', 'core', 'B2', 'COCA'],
      ['deep-sea gigantism', 'noun', 'عملقة أعماق البحار', 'Deep-sea gigantism produces unusually large organisms at great depths.', 'تنتج عملقة أعماق البحار كائنات كبيرة بشكل غير عادي في أعماق كبيرة.', 'mastery', 'C1', 'COCA'],
      ['hadal zone organism', 'noun', 'كائن المنطقة الهدالية', 'A hadal zone organism survives in ocean trenches below 6000 meters.', 'ينجو كائن المنطقة الهدالية في خنادق المحيط تحت 6000 متر.', 'mastery', 'C1', 'COCA'],
      ['bathymetric chart', 'noun', 'خريطة قياس الأعماق', 'A bathymetric chart maps the underwater topography of the ocean floor.', 'ترسم خريطة قياس الأعماق تضاريس قاع المحيط تحت الماء.', 'extended', 'B2', 'COCA'],
    ];
    let r2 = await insertBatch(client, u2, 2, 33); console.log(`U2: ${r2}`);

    const u3 = [
      ['vertical farming facility', 'noun', 'منشأة الزراعة العمودية', 'A vertical farming facility grows crops in stacked indoor layers.', 'تزرع منشأة الزراعة العمودية المحاصيل في طبقات داخلية مكدسة.', 'extended', 'B2', 'COCA'],
      ['cellular agriculture', 'noun', 'الزراعة الخلوية', 'Cellular agriculture produces animal products from cell cultures.', 'تنتج الزراعة الخلوية منتجات حيوانية من مزارع الخلايا.', 'mastery', 'C1', 'COCA'],
      ['cultured meat production', 'noun', 'إنتاج اللحم المزروع', 'Cultured meat production grows muscle tissue in a laboratory.', 'ينمي إنتاج اللحم المزروع أنسجة عضلية في المختبر.', 'extended', 'B2', 'COCA'],
      ['insect protein farming', 'noun', 'تربية بروتين الحشرات', 'Insect protein farming provides sustainable animal feed alternatives.', 'توفر تربية بروتين الحشرات بدائل مستدامة لأعلاف الحيوانات.', 'extended', 'B2', 'COCA'],
      ['blockchain food traceability', 'noun', 'تتبع الغذاء بالبلوكتشين', 'Blockchain food traceability tracks products from farm to fork.', 'يتتبع تتبع الغذاء بالبلوكتشين المنتجات من المزرعة إلى المائدة.', 'mastery', 'C1', 'COCA'],
      ['plant-based meat alternative', 'noun', 'بديل اللحم النباتي', 'A plant-based meat alternative mimics the taste and texture of meat.', 'يحاكي بديل اللحم النباتي طعم وقوام اللحم.', 'core', 'B2', 'COCA'],
      ['food loss reduction strategy', 'noun', 'استراتيجية تقليل فقد الغذاء', 'A food loss reduction strategy targets waste at harvest and storage.', 'تستهدف استراتيجية تقليل فقد الغذاء الهدر في الحصاد والتخزين.', 'extended', 'B2', 'AWL'],
      ['nutrient recycling system', 'noun', 'نظام إعادة تدوير المغذيات', 'A nutrient recycling system returns organic matter to the soil.', 'يعيد نظام إعادة تدوير المغذيات المادة العضوية إلى التربة.', 'extended', 'B2', 'COCA'],
      ['drought-tolerant variety', 'noun', 'صنف متحمل للجفاف', 'A drought-tolerant variety produces crops with less water.', 'ينتج الصنف المتحمل للجفاف محاصيل بمياه أقل.', 'extended', 'B2', 'COCA'],
      ['soil carbon sequestration', 'noun', 'عزل كربون التربة', 'Soil carbon sequestration stores CO2 in agricultural soils.', 'يخزن عزل كربون التربة ثاني أكسيد الكربون في التربة الزراعية.', 'mastery', 'C1', 'COCA'],
    ];
    let r3 = await insertBatch(client, u3, 3, 33); console.log(`U3: ${r3}`);

    const u4 = [
      ['bioinspired adhesive', 'noun', 'لاصق مستوحى بيولوجياً', 'A bioinspired adhesive mimics gecko toe pads for reusable grip.', 'يحاكي اللاصق المستوحى بيولوجياً وسادات أصابع الوزغة للقبضة القابلة لإعادة الاستخدام.', 'mastery', 'C1', 'COCA'],
      ['lotus-effect coating', 'noun', 'طلاء تأثير اللوتس', 'A lotus-effect coating creates self-cleaning waterproof surfaces.', 'ينشئ طلاء تأثير اللوتس أسطحاً مقاومة للماء ذاتية التنظيف.', 'mastery', 'C1', 'COCA'],
      ['sharkskin-inspired surface', 'noun', 'سطح مستوحى من جلد القرش', 'A sharkskin-inspired surface reduces drag on aircraft and ships.', 'يقلل السطح المستوحى من جلد القرش المقاومة على الطائرات والسفن.', 'mastery', 'C1', 'COCA'],
      ['termite-mound ventilation', 'noun', 'تهوية تلة النمل الأبيض', 'Termite-mound ventilation inspired passive cooling in buildings.', 'ألهمت تهوية تلة النمل الأبيض التبريد السلبي في المباني.', 'extended', 'B2', 'COCA'],
      ['spider-silk biomaterial', 'noun', 'مادة حيوية حرير العنكبوت', 'Spider-silk biomaterial is stronger than steel by weight.', 'المادة الحيوية لحرير العنكبوت أقوى من الفولاذ بالوزن.', 'mastery', 'C1', 'COCA'],
      ['whale-fin turbine blade', 'noun', 'شفرة توربين زعنفة الحوت', 'A whale-fin turbine blade uses bumps to improve aerodynamic performance.', 'تستخدم شفرة توربين زعنفة الحوت نتوءات لتحسين الأداء الديناميكي الهوائي.', 'mastery', 'C1', 'COCA'],
      ['kingfisher-beak train design', 'noun', 'تصميم قطار منقار الرفراف', 'Kingfisher-beak train design reduces noise and drag at high speeds.', 'يقلل تصميم قطار منقار الرفراف الضوضاء والمقاومة بسرعات عالية.', 'mastery', 'C1', 'COCA'],
      ['butterfly-wing photonic structure', 'noun', 'بنية ضوئية لجناح الفراشة', 'A butterfly-wing photonic structure produces vivid colors without pigments.', 'تنتج البنية الضوئية لجناح الفراشة ألواناً زاهية بدون أصباغ.', 'mastery', 'C1', 'COCA'],
      ['moth-eye anti-reflective', 'noun', 'مضاد الانعكاس بعين العثة', 'Moth-eye anti-reflective technology improves solar panel efficiency.', 'تحسن تقنية مضاد الانعكاس بعين العثة كفاءة الألواح الشمسية.', 'mastery', 'C1', 'COCA'],
      ['mussel-inspired underwater glue', 'noun', 'غراء تحت الماء مستوحى من بلح البحر', 'Mussel-inspired underwater glue bonds materials in wet environments.', 'يلصق الغراء المستوحى من بلح البحر المواد في البيئات الرطبة.', 'mastery', 'C1', 'COCA'],
    ];
    let r4 = await insertBatch(client, u4, 4, 33); console.log(`U4: ${r4}`);

    const u5 = [
      ['climate-induced displacement', 'noun', 'النزوح الناجم عن المناخ', 'Climate-induced displacement forces communities from sinking islands.', 'يجبر النزوح الناجم عن المناخ المجتمعات من الجزر الغارقة.', 'extended', 'B2', 'COCA'],
      ['internal relocation program', 'noun', 'برنامج إعادة التوطين الداخلي', 'An internal relocation program moves people from disaster zones.', 'ينقل برنامج إعادة التوطين الداخلي الأشخاص من مناطق الكوارث.', 'extended', 'B2', 'COCA'],
      ['diaspora remittance flow', 'noun', 'تدفق تحويلات المغتربين', 'Diaspora remittance flow exceeds foreign aid in many countries.', 'يتجاوز تدفق تحويلات المغتربين المساعدات الأجنبية في العديد من البلدان.', 'mastery', 'C1', 'COCA'],
      ['transnational advocacy network', 'noun', 'شبكة المناصرة العابرة للحدود', 'A transnational advocacy network campaigns for migrant rights globally.', 'تناضل شبكة المناصرة العابرة للحدود من أجل حقوق المهاجرين عالمياً.', 'mastery', 'C1', 'COCA'],
      ['migrant integration index', 'noun', 'مؤشر اندماج المهاجرين', 'The migrant integration index measures how well newcomers settle in.', 'يقيس مؤشر اندماج المهاجرين مدى استقرار الوافدين الجدد.', 'extended', 'B2', 'AWL'],
      ['xenophobia prevention campaign', 'noun', 'حملة الوقاية من كراهية الأجانب', 'A xenophobia prevention campaign promotes tolerance in host communities.', 'تعزز حملة الوقاية من كراهية الأجانب التسامح في المجتمعات المضيفة.', 'extended', 'B2', 'COCA'],
      ['returnee reintegration support', 'noun', 'دعم إعادة إدماج العائدين', 'Returnee reintegration support helps migrants rebuild lives at home.', 'يساعد دعم إعادة إدماج العائدين المهاجرين على إعادة بناء حياتهم في الوطن.', 'extended', 'B2', 'COCA'],
      ['skilled worker visa program', 'noun', 'برنامج تأشيرة العمال المهرة', 'A skilled worker visa program attracts talent for economic growth.', 'يجذب برنامج تأشيرة العمال المهرة المواهب للنمو الاقتصادي.', 'core', 'B2', 'COCA'],
      ['family reunification policy', 'noun', 'سياسة لم شمل الأسر', 'Family reunification policy allows migrants to bring relatives.', 'تسمح سياسة لم شمل الأسر للمهاجرين بإحضار أقاربهم.', 'extended', 'B2', 'COCA'],
      ['immigration enforcement agency', 'noun', 'وكالة إنفاذ الهجرة', 'The immigration enforcement agency monitors visa compliance.', 'تراقب وكالة إنفاذ الهجرة الامتثال لشروط التأشيرة.', 'extended', 'B2', 'COCA'],
    ];
    let r5 = await insertBatch(client, u5, 5, 33); console.log(`U5: ${r5}`);

    const u6 = [
      ['zero-knowledge rollup', 'noun', 'تجميع المعرفة الصفرية', 'A zero-knowledge rollup proves transactions without revealing data.', 'يثبت تجميع المعرفة الصفرية المعاملات دون كشف البيانات.', 'mastery', 'C1', 'COCA'],
      ['optimistic rollup chain', 'noun', 'سلسلة التجميع المتفائل', 'An optimistic rollup chain assumes transactions are valid by default.', 'تفترض سلسلة التجميع المتفائل أن المعاملات صالحة بشكل افتراضي.', 'mastery', 'C1', 'COCA'],
      ['data availability layer', 'noun', 'طبقة توفر البيانات', 'A data availability layer ensures transaction data is accessible.', 'تضمن طبقة توفر البيانات إمكانية الوصول إلى بيانات المعاملات.', 'mastery', 'C1', 'COCA'],
      ['decentralized identity system', 'noun', 'نظام هوية لامركزي', 'A decentralized identity system gives users control of their credentials.', 'يمنح نظام الهوية اللامركزي المستخدمين السيطرة على بيانات اعتمادهم.', 'extended', 'B2', 'COCA'],
      ['soulbound token concept', 'noun', 'مفهوم الرمز المرتبط بالروح', 'A soulbound token concept creates non-transferable digital credentials.', 'ينشئ مفهوم الرمز المرتبط بالروح بيانات اعتماد رقمية غير قابلة للتحويل.', 'mastery', 'C1', 'COCA'],
      ['cross-chain bridge protocol', 'noun', 'بروتوكول جسر عبر السلاسل', 'A cross-chain bridge protocol transfers assets between blockchains.', 'ينقل بروتوكول الجسر عبر السلاسل الأصول بين سلاسل الكتل.', 'mastery', 'C1', 'COCA'],
      ['atomic swap mechanism', 'noun', 'آلية التبادل الذري', 'An atomic swap mechanism exchanges cryptocurrencies without intermediaries.', 'تتبادل آلية التبادل الذري العملات المشفرة بدون وسطاء.', 'mastery', 'C1', 'COCA'],
      ['decentralized exchange protocol', 'noun', 'بروتوكول التبادل اللامركزي', 'A decentralized exchange protocol allows peer-to-peer token trading.', 'يسمح بروتوكول التبادل اللامركزي بتداول الرموز بين الأقران.', 'extended', 'B2', 'COCA'],
      ['yield farming strategy', 'noun', 'استراتيجية زراعة العوائد', 'A yield farming strategy maximizes returns across DeFi protocols.', 'تعظم استراتيجية زراعة العوائد العوائد عبر بروتوكولات التمويل اللامركزي.', 'extended', 'B2', 'COCA'],
      ['liquidity pool mechanism', 'noun', 'آلية تجمع السيولة', 'A liquidity pool mechanism enables trading without traditional order books.', 'تتيح آلية تجمع السيولة التداول بدون دفاتر الأوامر التقليدية.', 'extended', 'B2', 'COCA'],
    ];
    let r6 = await insertBatch(client, u6, 6, 33); console.log(`U6: ${r6}`);

    const u7 = [
      ['social media echo chamber', 'noun', 'غرفة صدى وسائل التواصل', 'A social media echo chamber reinforces existing beliefs.', 'تعزز غرفة صدى وسائل التواصل المعتقدات القائمة.', 'extended', 'B2', 'COCA'],
      ['algorithmic content curation', 'noun', 'تنظيم المحتوى الخوارزمي', 'Algorithmic content curation shapes what information users see.', 'يشكل تنظيم المحتوى الخوارزمي المعلومات التي يراها المستخدمون.', 'mastery', 'C1', 'COCA'],
      ['information warfare tactic', 'noun', 'تكتيك حرب المعلومات', 'An information warfare tactic spreads disinformation to destabilize.', 'ينشر تكتيك حرب المعلومات المعلومات المضللة لزعزعة الاستقرار.', 'extended', 'B2', 'COCA'],
      ['astroturfing campaign', 'noun', 'حملة عشب اصطناعي', 'An astroturfing campaign creates fake grassroots support.', 'تنشئ حملة العشب الاصطناعي دعماً شعبياً مزيفاً.', 'mastery', 'C1', 'COCA'],
      ['deepfake manipulation', 'noun', 'التلاعب بالتزييف العميق', 'Deepfake manipulation creates convincing but false video content.', 'ينشئ التلاعب بالتزييف العميق محتوى فيديو مقنعاً لكنه مزيف.', 'extended', 'B2', 'COCA'],
      ['misinformation inoculation', 'noun', 'التلقيح ضد المعلومات الخاطئة', 'Misinformation inoculation pre-exposes people to weakened falsehoods.', 'يعرض التلقيح ضد المعلومات الخاطئة الناس مسبقاً لأكاذيب مضعفة.', 'mastery', 'C1', 'COCA'],
      ['cognitive bias training', 'noun', 'تدريب التحيز المعرفي', 'Cognitive bias training helps people recognize their thinking errors.', 'يساعد تدريب التحيز المعرفي الناس على التعرف على أخطاء تفكيرهم.', 'extended', 'B2', 'COCA'],
      ['crowd wisdom aggregation', 'noun', 'تجميع حكمة الجمهور', 'Crowd wisdom aggregation produces accurate predictions from many guesses.', 'ينتج تجميع حكمة الجمهور تنبؤات دقيقة من تخمينات كثيرة.', 'mastery', 'C1', 'COCA'],
      ['collective intelligence platform', 'noun', 'منصة الذكاء الجماعي', 'A collective intelligence platform harnesses group problem-solving.', 'تسخر منصة الذكاء الجماعي حل المشكلات الجماعي.', 'extended', 'B2', 'COCA'],
      ['participatory decision making', 'noun', 'صنع القرار التشاركي', 'Participatory decision making involves all stakeholders in choices.', 'يشرك صنع القرار التشاركي جميع أصحاب المصلحة في الاختيارات.', 'extended', 'B2', 'AWL'],
    ];
    let r7 = await insertBatch(client, u7, 7, 33); console.log(`U7: ${r7}`);

    const u8 = [
      ['gunshot residue analysis', 'noun', 'تحليل بقايا طلق ناري', 'Gunshot residue analysis confirms a suspect fired a weapon.', 'يؤكد تحليل بقايا الطلق الناري أن المشتبه به أطلق سلاحاً.', 'extended', 'B2', 'COCA'],
      ['tool mark comparison', 'noun', 'مقارنة علامات الأدوات', 'Tool mark comparison matches marks to specific instruments.', 'تطابق مقارنة علامات الأدوات العلامات مع أدوات محددة.', 'extended', 'B2', 'COCA'],
      ['fiber transfer evidence', 'noun', 'أدلة انتقال الألياف', 'Fiber transfer evidence links a suspect to a crime scene.', 'تربط أدلة انتقال الألياف المشتبه به بمسرح الجريمة.', 'extended', 'B2', 'COCA'],
      ['blood pattern analysis', 'noun', 'تحليل أنماط الدم', 'Blood pattern analysis reconstructs events from stain shapes.', 'يعيد تحليل أنماط الدم بناء الأحداث من أشكال البقع.', 'extended', 'B2', 'COCA'],
      ['digital forensics laboratory', 'noun', 'مختبر الطب الشرعي الرقمي', 'A digital forensics laboratory examines electronic devices for evidence.', 'يفحص مختبر الطب الشرعي الرقمي الأجهزة الإلكترونية بحثاً عن أدلة.', 'extended', 'B2', 'COCA'],
      ['mobile device extraction', 'noun', 'استخراج بيانات الهاتف', 'Mobile device extraction retrieves deleted data from smartphones.', 'يسترجع استخراج بيانات الهاتف البيانات المحذوفة من الهواتف الذكية.', 'extended', 'B2', 'COCA'],
      ['facial reconstruction technique', 'noun', 'تقنية إعادة بناء الوجه', 'A facial reconstruction technique builds a face from a skull.', 'تبني تقنية إعادة بناء الوجه وجهاً من جمجمة.', 'mastery', 'C1', 'COCA'],
      ['forensic entomology study', 'noun', 'دراسة علم الحشرات الجنائي', 'A forensic entomology study uses insect activity to estimate time of death.', 'تستخدم دراسة علم الحشرات الجنائي نشاط الحشرات لتقدير وقت الوفاة.', 'mastery', 'C1', 'COCA'],
      ['age estimation method', 'noun', 'طريقة تقدير العمر', 'An age estimation method uses bone development to determine age.', 'تستخدم طريقة تقدير العمر تطور العظام لتحديد العمر.', 'extended', 'B2', 'COCA'],
      ['geographic profiling technique', 'noun', 'تقنية التنميط الجغرافي', 'Geographic profiling technique predicts where a serial offender lives.', 'تتنبأ تقنية التنميط الجغرافي بمكان إقامة المجرم المتسلسل.', 'mastery', 'C1', 'COCA'],
    ];
    let r8 = await insertBatch(client, u8, 8, 33); console.log(`U8: ${r8}`);

    const u9 = [
      ['underwater archaeology survey', 'noun', 'مسح الآثار تحت الماء', 'An underwater archaeology survey maps submerged ancient settlements.', 'يرسم مسح الآثار تحت الماء خرائط المستوطنات القديمة المغمورة.', 'extended', 'B2', 'COCA'],
      ['battlefield archaeology study', 'noun', 'دراسة آثار ساحة المعركة', 'A battlefield archaeology study locates artifacts from historic battles.', 'تحدد دراسة آثار ساحة المعركة القطع الأثرية من المعارك التاريخية.', 'extended', 'B2', 'COCA'],
      ['industrial archaeology site', 'noun', 'موقع آثار صناعية', 'An industrial archaeology site preserves remnants of early factories.', 'يحفظ موقع الآثار الصناعية بقايا المصانع المبكرة.', 'extended', 'B2', 'COCA'],
      ['experimental archaeology project', 'noun', 'مشروع الآثار التجريبية', 'An experimental archaeology project recreates ancient techniques.', 'يعيد مشروع الآثار التجريبية إنشاء التقنيات القديمة.', 'extended', 'B2', 'COCA'],
      ['community archaeology program', 'noun', 'برنامج آثار مجتمعي', 'A community archaeology program involves local residents in excavation.', 'يشرك برنامج الآثار المجتمعي السكان المحليين في التنقيب.', 'extended', 'B2', 'COCA'],
      ['cultural resource management', 'noun', 'إدارة الموارد الثقافية', 'Cultural resource management protects heritage sites from development.', 'تحمي إدارة الموارد الثقافية مواقع التراث من التطوير.', 'extended', 'B2', 'COCA'],
      ['heritage impact assessment', 'noun', 'تقييم التأثير على التراث', 'A heritage impact assessment evaluates construction effects on sites.', 'يقيم تقييم التأثير على التراث آثار البناء على المواقع.', 'extended', 'B2', 'AWL'],
      ['repatriation agreement', 'noun', 'اتفاقية الإعادة', 'A repatriation agreement returns stolen artifacts to their country.', 'تعيد اتفاقية الإعادة القطع الأثرية المسروقة إلى بلدها.', 'extended', 'B2', 'COCA'],
      ['looted antiquities trade', 'noun', 'تجارة الآثار المنهوبة', 'The looted antiquities trade destroys archaeological context.', 'تدمر تجارة الآثار المنهوبة السياق الأثري.', 'extended', 'B2', 'COCA'],
      ['3D artifact scanning', 'noun', 'مسح ثلاثي الأبعاد للقطع الأثرية', '3D artifact scanning creates digital replicas for research and display.', 'ينشئ المسح ثلاثي الأبعاد للقطع الأثرية نسخاً رقمية للبحث والعرض.', 'extended', 'B2', 'COCA'],
    ];
    let r9 = await insertBatch(client, u9, 9, 33); console.log(`U9: ${r9}`);

    const u10 = [
      ['wearable health tracker', 'noun', 'جهاز تتبع صحي يمكن ارتداؤه', 'A wearable health tracker monitors vital signs continuously.', 'يراقب جهاز التتبع الصحي القابل للارتداء العلامات الحيوية باستمرار.', 'core', 'B2', 'COCA'],
      ['personalized nutrition plan', 'noun', 'خطة تغذية شخصية', 'A personalized nutrition plan is based on individual genetic profiles.', 'تعتمد خطة التغذية الشخصية على الملفات الجينية الفردية.', 'extended', 'B2', 'COCA'],
      ['intermittent fasting protocol', 'noun', 'بروتوكول الصيام المتقطع', 'An intermittent fasting protocol restricts eating to specific hours.', 'يقيد بروتوكول الصيام المتقطع الأكل بساعات محددة.', 'extended', 'B2', 'COCA'],
      ['gut microbiome analysis', 'noun', 'تحليل ميكروبيوم الأمعاء', 'Gut microbiome analysis reveals bacteria populations in the digestive system.', 'يكشف تحليل ميكروبيوم الأمعاء مجموعات البكتيريا في الجهاز الهضمي.', 'mastery', 'C1', 'COCA'],
      ['cognitive enhancement supplement', 'noun', 'مكمل تعزيز إدراكي', 'A cognitive enhancement supplement aims to improve memory and focus.', 'يهدف مكمل التعزيز الإدراكي إلى تحسين الذاكرة والتركيز.', 'extended', 'B2', 'COCA'],
      ['anti-aging skincare formulation', 'noun', 'تركيبة عناية بالبشرة مضادة للشيخوخة', 'An anti-aging skincare formulation targets wrinkles and sun damage.', 'تستهدف تركيبة العناية بالبشرة المضادة للشيخوخة التجاعيد وأضرار الشمس.', 'extended', 'B2', 'COCA'],
      ['hormone replacement therapy', 'noun', 'العلاج بالهرمونات البديلة', 'Hormone replacement therapy manages symptoms of menopause.', 'يدير العلاج بالهرمونات البديلة أعراض انقطاع الطمث.', 'extended', 'B2', 'COCA'],
      ['bone density screening', 'noun', 'فحص كثافة العظام', 'Bone density screening detects osteoporosis before fractures occur.', 'يكشف فحص كثافة العظام هشاشة العظام قبل حدوث الكسور.', 'core', 'B2', 'COCA'],
      ['cardiovascular risk assessment', 'noun', 'تقييم مخاطر القلب والأوعية الدموية', 'A cardiovascular risk assessment predicts heart disease probability.', 'يتنبأ تقييم مخاطر القلب والأوعية الدموية باحتمال أمراض القلب.', 'extended', 'B2', 'COCA'],
      ['telomere preservation strategy', 'noun', 'استراتيجية حفظ التيلومير', 'A telomere preservation strategy slows chromosomal aging.', 'تبطئ استراتيجية حفظ التيلومير شيخوخة الكروموسومات.', 'mastery', 'C1', 'COCA'],
    ];
    let r10 = await insertBatch(client, u10, 10, 33); console.log(`U10: ${r10}`);

    const u11 = [
      ['passive solar design', 'noun', 'تصميم شمسي سلبي', 'Passive solar design orients buildings to maximize natural heating.', 'يوجه التصميم الشمسي السلبي المباني لتعظيم التدفئة الطبيعية.', 'extended', 'B2', 'COCA'],
      ['green building material', 'noun', 'مادة بناء خضراء', 'A green building material has low environmental impact.', 'تتميز مادة البناء الخضراء بتأثير بيئي منخفض.', 'core', 'B2', 'COCA'],
      ['bamboo structural member', 'noun', 'عنصر إنشائي من الخيزران', 'A bamboo structural member provides sustainable load-bearing capacity.', 'يوفر العنصر الإنشائي من الخيزران قدرة تحمل مستدامة.', 'extended', 'B2', 'COCA'],
      ['rammed earth wall', 'noun', 'جدار أرضي مدكوك', 'A rammed earth wall uses compressed soil as building material.', 'يستخدم الجدار الأرضي المدكوك التربة المضغوطة كمادة بناء.', 'extended', 'B2', 'COCA'],
      ['cross-laminated timber panel', 'noun', 'لوح خشبي متقاطع الطبقات', 'A cross-laminated timber panel replaces concrete in multi-story buildings.', 'يحل لوح الخشب المتقاطع الطبقات محل الخرسانة في المباني متعددة الطوابق.', 'mastery', 'C1', 'COCA'],
      ['hempcrete wall system', 'noun', 'نظام جدار الخرسانة القنبية', 'A hempcrete wall system provides excellent insulation naturally.', 'يوفر نظام جدار الخرسانة القنبية عزلاً ممتازاً بشكل طبيعي.', 'mastery', 'C1', 'COCA'],
      ['greywater treatment system', 'noun', 'نظام معالجة المياه الرمادية', 'A greywater treatment system recycles sink water for irrigation.', 'يعيد نظام معالجة المياه الرمادية تدوير مياه الحوض للري.', 'extended', 'B2', 'COCA'],
      ['rainwater harvesting tank', 'noun', 'خزان حصاد مياه الأمطار', 'A rainwater harvesting tank stores collected rain for later use.', 'يخزن خزان حصاد مياه الأمطار المياه المجمعة للاستخدام لاحقاً.', 'core', 'B2', 'COCA'],
      ['building energy audit', 'noun', 'تدقيق طاقة المبنى', 'A building energy audit identifies opportunities for efficiency improvements.', 'يحدد تدقيق طاقة المبنى فرص تحسين الكفاءة.', 'extended', 'B2', 'COCA'],
      ['zero-waste construction site', 'noun', 'موقع بناء خالٍ من النفايات', 'A zero-waste construction site diverts all debris from landfills.', 'يحول موقع البناء الخالي من النفايات جميع المخلفات بعيداً عن مدافن النفايات.', 'extended', 'B2', 'COCA'],
    ];
    let r11 = await insertBatch(client, u11, 11, 33); console.log(`U11: ${r11}`);

    const u12 = [
      ['exoplanet atmosphere characterization', 'noun', 'توصيف الغلاف الجوي للكواكب الخارجية', 'Exoplanet atmosphere characterization identifies chemical composition.', 'يحدد توصيف الغلاف الجوي للكواكب الخارجية التركيب الكيميائي.', 'mastery', 'C1', 'COCA'],
      ['stellar habitable zone', 'noun', 'المنطقة الصالحة للسكن النجمية', 'The stellar habitable zone is where liquid water could exist on planets.', 'المنطقة الصالحة للسكن النجمية هي حيث يمكن وجود الماء السائل على الكواكب.', 'extended', 'B2', 'COCA'],
      ['planetary formation theory', 'noun', 'نظرية تشكل الكواكب', 'Planetary formation theory explains how planets develop from gas and dust.', 'تفسر نظرية تشكل الكواكب كيف تتطور الكواكب من الغاز والغبار.', 'extended', 'B2', 'COCA'],
      ['gravitational wave detector', 'noun', 'كاشف الموجات الثقالية', 'A gravitational wave detector measures ripples in spacetime.', 'يقيس كاشف الموجات الثقالية التموجات في الزمكان.', 'mastery', 'C1', 'COCA'],
      ['radio telescope array', 'noun', 'مصفوفة التلسكوب الراديوي', 'A radio telescope array combines signals from multiple antennas.', 'تجمع مصفوفة التلسكوب الراديوي الإشارات من هوائيات متعددة.', 'extended', 'B2', 'COCA'],
      ['space debris tracking', 'noun', 'تتبع الحطام الفضائي', 'Space debris tracking monitors thousands of objects orbiting Earth.', 'يراقب تتبع الحطام الفضائي آلاف الأجسام التي تدور حول الأرض.', 'extended', 'B2', 'COCA'],
      ['interstellar medium composition', 'noun', 'تركيب الوسط بين النجمي', 'Interstellar medium composition includes gas, dust, and cosmic rays.', 'يشمل تركيب الوسط بين النجمي الغاز والغبار والأشعة الكونية.', 'mastery', 'C1', 'COCA'],
      ['brown dwarf classification', 'noun', 'تصنيف القزم البني', 'Brown dwarf classification bridges the gap between planets and stars.', 'يسد تصنيف القزم البني الفجوة بين الكواكب والنجوم.', 'mastery', 'C1', 'COCA'],
      ['neutron star merger event', 'noun', 'حدث اندماج النجوم النيوترونية', 'A neutron star merger event produces heavy elements like gold.', 'ينتج حدث اندماج النجوم النيوترونية عناصر ثقيلة مثل الذهب.', 'mastery', 'C1', 'COCA'],
      ['cosmic microwave background', 'noun', 'إشعاع الخلفية الكوني الميكروي', 'The cosmic microwave background is radiation left from the Big Bang.', 'إشعاع الخلفية الكوني الميكروي هو إشعاع متبقي من الانفجار العظيم.', 'extended', 'B2', 'COCA'],
    ];
    let r12 = await insertBatch(client, u12, 12, 33); console.log(`U12: ${r12}`);

    // Final check
    const total = await client.query('SELECT COUNT(*) AS total FROM vocab_staging_l4');
    console.log('\n=== FINAL STAGING STATUS ===');
    console.log('Total:', total.rows[0].total);
    const perUnit = await client.query('SELECT recommended_unit, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit');
    perUnit.rows.forEach(r => console.log('  U' + r.recommended_unit + ':', r.cnt));
    const dedup = await client.query("SELECT COUNT(*) AS cnt FROM vocab_staging_l4 s WHERE EXISTS (SELECT 1 FROM curriculum_vocabulary v JOIN curriculum_readings r ON r.id = v.reading_id JOIN curriculum_units u ON u.id = r.unit_id WHERE LOWER(v.word) = LOWER(s.word))");
    console.log('Cross-level overlap:', dedup.rows[0].cnt);
    const net = parseInt(total.rows[0].total) - parseInt(dedup.rows[0].cnt);
    console.log('Net new after dedup:', net);
    console.log('Projected L4 total:', 274 + net);
    console.log('Target: 3640');
    console.log('Status:', (274 + net >= 3640) ? 'TARGET MET' : `Short by ${3640 - 274 - net}`);
  } finally { client.release(); await pool.end(); }
}
run().catch(e => { console.error(e); process.exit(1); });
