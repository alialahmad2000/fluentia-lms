// LEGENDARY-B5 Batch 5: General B2 vocabulary distributed across all 12 units
// These are cross-cutting B2 words not specific to any one theme
const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

async function insertBatch(client, words, batchId) {
  let inserted = 0;
  for (const w of words) {
    try {
      await client.query(
        `INSERT INTO public.vocab_staging_l4 (word, pos, definition_ar, example_en, example_ar, recommended_tier, cefr_level, source_list, recommended_unit, batch_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (word) DO NOTHING`,
        [w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], batchId]
      );
      inserted++;
    } catch(e) { console.error(`Error "${w[0]}":`, e.message); }
  }
  return inserted;
}

// Format: [word, pos, def_ar, example_en, example_ar, tier, cefr, source, unit]
// Distributing general B2 vocabulary across all 12 units

const GENERAL_B2_WORDS = [
  // ===== UNIT 1 supplementary =====
  ['acknowledge','verb','يعترف بـ','The scientist acknowledged the limitations of her research.','اعترفت العالمة بقيود بحثها.','core','B2','AWL',1],
  ['accumulate','verb','يتراكم','Toxins can accumulate in the body over many years.','يمكن أن تتراكم السموم في الجسم على مدى سنوات.','core','B2','AWL',1],
  ['ambiguous','adjective','غامض / ملتبس','The medical report contained ambiguous language about the diagnosis.','احتوى التقرير الطبي على لغة غامضة حول التشخيص.','extended','B2','AWL',1],
  ['analogy','noun','تشبيه / قياس','The professor used an analogy to explain how vaccines work.','استخدم الأستاذ تشبيهاً لشرح كيفية عمل اللقاحات.','extended','B2','AWL',1],
  ['apparatus','noun','جهاز / أداة','The laboratory apparatus must be sterilized before each experiment.','يجب تعقيم أجهزة المختبر قبل كل تجربة.','extended','B2','AWL',1],
  ['appendix','noun','زائدة دودية / ملحق','The patient had emergency surgery to remove an inflamed appendix.','خضع المريض لجراحة طارئة لإزالة الزائدة الدودية الملتهبة.','core','B2','CEFR-J',1],
  ['aptitude','noun','استعداد / قدرة','She showed remarkable aptitude for biomedical research.','أظهرت استعداداً ملحوظاً للبحث الطبي الحيوي.','extended','B2','CEFR-J',1],
  ['articulate','verb','يُعبّر بوضوح','The researcher articulated her findings at the international conference.','عبّرت الباحثة عن نتائجها بوضوح في المؤتمر الدولي.','extended','B2','CEFR-J',1],
  ['assert','verb','يؤكد / يصرّح','Doctors assert that prevention is better than treatment.','يؤكد الأطباء أن الوقاية أفضل من العلاج.','core','B2','AWL',1],
  ['attain','verb','يحقق / ينال','Medical students must attain high grades to enter residency programs.','يجب على طلاب الطب تحقيق درجات عالية لدخول برامج الإقامة.','core','B2','AWL',1],
  ['attribute','verb','يُنسب إلى','Scientists attribute the disease to a combination of genetic factors.','ينسب العلماء المرض إلى مجموعة من العوامل الجينية.','core','B2','AWL',1],
  ['benchmark','noun','معيار مرجعي','The study established new benchmarks for drug safety testing.','وضعت الدراسة معايير مرجعية جديدة لاختبار سلامة الأدوية.','extended','B2','NAWL',1],
  ['bias','noun','تحيّز','Researchers must eliminate bias from their experimental methodology.','يجب على الباحثين إزالة التحيز من منهجيتهم التجريبية.','core','B2','AWL',1],
  ['bureaucratic','adjective','بيروقراطي','Bureaucratic delays slowed down the approval of the new drug.','أبطأت التأخيرات البيروقراطية الموافقة على الدواء الجديد.','extended','B2','CEFR-J',1],
  ['calibrate','verb','يُعاير','Technicians calibrate medical equipment to ensure accurate readings.','يُعاير الفنيون المعدات الطبية لضمان قراءات دقيقة.','extended','C1','NAWL',1],
  ['catastrophe','noun','كارثة','A pandemic can quickly become a global health catastrophe.','يمكن للجائحة أن تصبح بسرعة كارثة صحية عالمية.','core','B2','CEFR-J',1],
  ['chronic','adjective','مُزمن','Chronic stress weakens the immune system significantly.','يُضعف الإجهاد المزمن الجهاز المناعي بشكل كبير.','core','B2','CEFR-J',1],
  ['coalition','noun','تحالف / ائتلاف','A coalition of health organizations launched the vaccination campaign.','أطلق تحالف من المنظمات الصحية حملة التطعيم.','extended','B2','AWL',1],
  ['coherent','adjective','متماسك / منطقي','The research team presented a coherent argument for the new therapy.','قدّم فريق البحث حجة متماسكة للعلاج الجديد.','extended','B2','AWL',1],
  ['commence','verb','يبدأ / يشرع في','Clinical trials will commence once regulatory approval is obtained.','ستبدأ التجارب السريرية بمجرد الحصول على الموافقة التنظيمية.','core','B2','AWL',1],
  ['compatible','adjective','متوافق','The donated organ must be compatible with the recipient immune system.','يجب أن يكون العضو المتبرَّع به متوافقاً مع جهاز المناعة للمتلقي.','core','B2','AWL',1],
  ['compensate','verb','يعوّض','The body can compensate for minor organ damage through adaptation.','يمكن للجسم تعويض الأضرار الطفيفة في الأعضاء من خلال التكيّف.','core','B2','AWL',1],
  ['compile','verb','يجمع / يُعدّ','Researchers compiled data from over fifty hospitals for the study.','جمع الباحثون بيانات من أكثر من خمسين مستشفى للدراسة.','extended','B2','AWL',1],
  ['complement','verb','يُكمّل','Traditional and modern medicine can complement each other effectively.','يمكن للطب التقليدي والحديث أن يُكمّل كل منهما الآخر بفعالية.','extended','B2','AWL',1],
  ['conceive','verb','يتصوّر / يحبل','It was difficult to conceive how the virus spread so rapidly.','كان من الصعب تصوّر كيف انتشر الفيروس بهذه السرعة.','extended','B2','AWL',1],
  ['concurrent','adjective','متزامن','The patient received concurrent treatments for two separate conditions.','تلقى المريض علاجات متزامنة لحالتين منفصلتين.','extended','C1','AWL',1],
  ['confine','verb','يقيّد / يحصر','The outbreak was confined to a small area thanks to quick action.','حُصر تفشّي المرض في منطقة صغيرة بفضل العمل السريع.','core','B2','AWL',1],
  ['consensus','noun','إجماع','Medical consensus supports vaccination as safe and effective.','يدعم الإجماع الطبي التطعيم باعتباره آمناً وفعالاً.','core','B2','AWL',1],
  ['constitute','verb','يُشكّل / يمثّل','Women constitute over fifty percent of healthcare workers globally.','تُشكّل النساء أكثر من خمسين بالمئة من العاملين في الرعاية الصحية عالمياً.','core','B2','AWL',1],
  ['constrain','verb','يُقيّد','Budget limitations constrain the scope of medical research.','تُقيّد القيود المالية نطاق البحث الطبي.','extended','B2','AWL',1],
  ['contemplate','verb','يتأمل / يفكر في','The committee contemplated the ethical implications of the experiment.','تأملت اللجنة في التداعيات الأخلاقية للتجربة.','extended','B2','CEFR-J',1],
  ['contradict','verb','يناقض','The new findings contradict previous assumptions about the disease.','تناقض النتائج الجديدة الافتراضات السابقة حول المرض.','core','B2','AWL',1],
  ['controversy','noun','جدل','The use of animal testing in research remains a major controversy.','لا يزال استخدام التجارب على الحيوانات في البحث جدلاً كبيراً.','core','B2','CEFR-J',1],
  ['convene','verb','يعقد / يجتمع','Health officials convened an emergency meeting about the new virus.','عقد المسؤولون الصحيون اجتماعاً طارئاً حول الفيروس الجديد.','extended','C1','AWL',1],
  ['credible','adjective','موثوق','Only credible scientific journals were used as sources for the report.','استُخدمت فقط المجلات العلمية الموثوقة كمصادر للتقرير.','core','B2','CEFR-J',1],

  // ===== UNIT 2 supplementary =====
  ['adjacent','adjective','مجاور','The marine reserve is adjacent to a heavily polluted industrial area.','المحمية البحرية مجاورة لمنطقة صناعية شديدة التلوث.','core','B2','AWL',2],
  ['albeit','conjunction','وإن / رغم أن','The discovery was significant albeit unexpected by the research team.','كان الاكتشاف مهماً وإن كان غير متوقع من فريق البحث.','extended','C1','AWL',2],
  ['allocate','verb','يُخصص','Governments allocate funds to protect endangered marine species.','تُخصص الحكومات أموالاً لحماية الأنواع البحرية المهددة.','core','B2','AWL',2],
  ['analogy','noun','قياس / تشبيه','The scientist drew an analogy between coral reefs and rain forests.','رسم العالم تشبيهاً بين الشعاب المرجانية والغابات المطيرة.','extended','B2','AWL',2],
  ['arbitrary','adjective','تعسفي / عشوائي','National boundaries in the ocean seem arbitrary to marine creatures.','تبدو الحدود الوطنية في المحيط تعسفية للمخلوقات البحرية.','extended','B2','AWL',2],
  ['commence','verb','يبدأ','The deep-sea expedition will commence at the beginning of summer.','ستبدأ رحلة أعماق البحار في بداية الصيف.','core','B2','AWL',2],
  ['conceive','verb','يتصوّر','Scientists could barely conceive the diversity of life in the deep.','بالكاد استطاع العلماء تصوّر تنوع الحياة في الأعماق.','extended','B2','AWL',2],
  ['confine','verb','يحصر','Some species are confined to very specific ocean temperature ranges.','بعض الأنواع محصورة في نطاقات حرارة محيط محددة جداً.','core','B2','AWL',2],
  ['consensus','noun','توافق','There is scientific consensus that ocean temperatures are rising.','هناك توافق علمي على أن درجات حرارة المحيط في ارتفاع.','core','B2','AWL',2],
  ['contemporary','adjective','معاصر','Contemporary oceanography relies on satellite and robotic technology.','يعتمد علم المحيطات المعاصر على تقنية الأقمار الصناعية والروبوتات.','core','B2','AWL',2],
  ['depict','verb','يصوّر','The documentary depicted the destruction of coral reef ecosystems.','صوّر الوثائقي تدمير النظم البيئية للشعاب المرجانية.','core','B2','CEFR-J',2],
  ['diminish','verb','يتضاءل','Fish populations continue to diminish due to industrial overfishing.','تستمر أعداد الأسماك في التضاؤل بسبب الصيد الصناعي المفرط.','core','B2','AWL',2],
  ['displace','verb','يُزيح / يحل محل','Invasive species displace native organisms in marine environments.','تُزيح الأنواع الغازية الكائنات المحلية في البيئات البحرية.','extended','B2','AWL',2],
  ['duration','noun','مدة / فترة','The duration of the research expedition was eighteen months.','كانت مدة رحلة البحث ثمانية عشر شهراً.','core','B2','AWL',2],
  ['elicit','verb','يستخلص / يستدعي','The discovery elicited excitement among marine biologists worldwide.','استثار الاكتشاف حماساً بين علماء الأحياء البحرية عالمياً.','extended','C1','AWL',2],
  ['empirical','adjective','تجريبي','Empirical evidence confirms that ocean acidification harms shellfish.','تؤكد الأدلة التجريبية أن تحمّض المحيط يضر بالمحاريات.','extended','C1','AWL',2],
  ['enhance','verb','يُحسّن / يُعزز','New technology enhances our ability to study deep ocean environments.','تُعزز التكنولوجيا الجديدة قدرتنا على دراسة بيئات الأعماق.','core','B2','AWL',2],
  ['erratic','adjective','غير منتظم','Erratic weather patterns have disrupted normal ocean currents.','عطّلت أنماط الطقس غير المنتظمة التيارات المحيطية الطبيعية.','extended','B2','CEFR-J',2],
  ['facilitate','verb','يُسهّل','Underwater drones facilitate exploration of previously inaccessible areas.','تُسهّل الطائرات المسيّرة تحت الماء استكشاف مناطق لم يكن الوصول إليها ممكناً.','core','B2','AWL',2],
  ['finite','adjective','محدود / متناهٍ','Ocean resources are finite and must be managed responsibly.','موارد المحيط محدودة ويجب إدارتها بمسؤولية.','extended','B2','AWL',2],
  ['fluctuate','verb','يتقلب','Ocean temperatures fluctuate seasonally affecting marine habitats.','تتقلب درجات حرارة المحيط موسمياً مما يؤثر على الموائل البحرية.','core','B2','AWL',2],
  ['formulate','verb','يُصيغ','Researchers formulated a new theory about deep-sea evolution.','صاغ الباحثون نظرية جديدة حول التطور في أعماق البحار.','extended','B2','AWL',2],
  ['fundamental','adjective','أساسي / جوهري','Understanding ocean chemistry is fundamental to marine biology.','فهم كيمياء المحيط أساسي لعلم الأحياء البحرية.','core','B2','AWL',2],
  ['hierarchy','noun','تسلسل هرمي','Marine food chains form a complex hierarchy of predators and prey.','تُشكّل السلاسل الغذائية البحرية تسلسلاً هرمياً معقداً من المفترسين والفرائس.','extended','B2','AWL',2],
  ['hypothesis','noun','فرضية','The hypothesis that deep-sea life is rare has been proven wrong.','ثبت خطأ الفرضية القائلة بأن الحياة في أعماق البحار نادرة.','core','B2','AWL',2],
  ['implement','verb','يُنفّذ','Governments must implement stronger ocean protection policies.','يجب على الحكومات تنفيذ سياسات حماية أقوى للمحيطات.','core','B2','AWL',2],
  ['implication','noun','تداعي / مضمون','The implications of ocean warming extend far beyond marine life.','تمتد تداعيات احترار المحيط إلى ما هو أبعد من الحياة البحرية.','core','B2','AWL',2],
  ['incentive','noun','حافز','Financial incentives encourage sustainable fishing practices.','تُشجّع الحوافز المالية ممارسات الصيد المستدام.','core','B2','AWL',2],
  ['inherent','adjective','متأصل / كامن','There are inherent risks in deep-sea exploration and mining.','هناك مخاطر متأصلة في استكشاف وتعدين أعماق البحار.','extended','B2','AWL',2],
  ['inhibit','verb','يُعيق / يمنع','Pollution inhibits the growth and reproduction of marine organisms.','يُعيق التلوث نمو وتكاثر الكائنات البحرية.','extended','B2','AWL',2],
  ['insight','noun','رؤية / فهم عميق','The study provided valuable insights into deep-sea biodiversity.','قدّمت الدراسة رؤى قيّمة حول التنوع البيولوجي في أعماق البحار.','core','B2','CEFR-J',2],
  ['integral','adjective','أساسي / مكمّل','Oceans are an integral part of the global climate system.','المحيطات جزء أساسي من نظام المناخ العالمي.','core','B2','AWL',2],
  ['intensity','noun','شدة / حدّة','The intensity of ocean storms has increased due to climate change.','زادت شدة العواصف المحيطية بسبب تغير المناخ.','core','B2','AWL',2],
  ['intervene','verb','يتدخل','Conservation groups intervene to protect endangered whale populations.','تتدخل مجموعات الحفظ لحماية أعداد الحيتان المهددة.','core','B2','AWL',2],
  ['intrinsic','adjective','جوهري / ذاتي','The ocean has intrinsic value beyond its economic resources.','للمحيط قيمة جوهرية تتجاوز موارده الاقتصادية.','extended','C1','AWL',2],

  // ===== UNIT 3 supplementary =====
  ['accelerate','verb','يُسرّع','Climate change is accelerating the loss of productive farmland.','يُسرّع تغير المناخ فقدان الأراضي الزراعية المنتجة.','core','B2','CEFR-J',3],
  ['accessible','adjective','متاح / يمكن الوصول إليه','Affordable nutritious food should be accessible to all communities.','يجب أن يكون الغذاء المغذي بأسعار معقولة متاحاً لجميع المجتمعات.','core','B2','AWL',3],
  ['aggregate','adjective','إجمالي / مُجمّع','The aggregate food production exceeds what is needed to feed everyone.','يتجاوز إنتاج الغذاء الإجمالي ما هو مطلوب لإطعام الجميع.','extended','C1','AWL',3],
  ['albeit','conjunction','وإن كان','The harvest was successful albeit smaller than expected.','كان الحصاد ناجحاً وإن كان أصغر مما كان متوقعاً.','extended','C1','AWL',3],
  ['allegation','noun','ادعاء / زعم','The company faced allegations of contaminating the water supply.','واجهت الشركة ادعاءات بتلويث إمدادات المياه.','extended','B2','CEFR-J',3],
  ['ambiguity','noun','غموض','There is no ambiguity about the link between poverty and hunger.','لا يوجد غموض حول الصلة بين الفقر والجوع.','extended','B2','AWL',3],
  ['ample','adjective','وافر / كافٍ','There is ample scientific evidence supporting organic farming methods.','هناك أدلة علمية وافرة تدعم أساليب الزراعة العضوية.','core','B2','CEFR-J',3],
  ['assert','verb','يؤكد','Farmers assert that fair pricing is essential for sustainable farming.','يؤكد المزارعون أن التسعير العادل ضروري للزراعة المستدامة.','core','B2','AWL',3],
  ['attain','verb','يبلغ / يحقق','Few countries have attained complete food self-sufficiency.','حققت دول قليلة الاكتفاء الذاتي الكامل من الغذاء.','core','B2','AWL',3],
  ['collaborate','verb','يتعاون','Scientists and farmers collaborate to develop drought-resistant crops.','يتعاون العلماء والمزارعون لتطوير محاصيل مقاومة للجفاف.','core','B2','AWL',3],
  ['commence','verb','يشرع','The planting season will commence as soon as the rains begin.','سيبدأ موسم الزراعة بمجرد بدء الأمطار.','core','B2','AWL',3],
  ['commodity','noun','سلعة تجارية','Coffee is a globally traded commodity with volatile prices.','القهوة سلعة متداولة عالمياً بأسعار متقلبة.','core','B2','AWL',3],
  ['concurrent','adjective','متزامن','Concurrent droughts across multiple regions threaten global food supply.','تُهدد موجات الجفاف المتزامنة عبر مناطق متعددة الإمدادات الغذائية.','extended','C1','AWL',3],
  ['controversy','noun','جدل / خلاف','The controversy over genetically modified foods continues unabated.','يستمر الجدل حول الأطعمة المعدلة وراثياً بلا هوادة.','core','B2','CEFR-J',3],
  ['deficit','noun','عجز / نقص','The region faces a serious calorie deficit affecting millions.','تواجه المنطقة عجزاً حاداً في السعرات يؤثر على الملايين.','core','B2','AWL',3],
  ['deplete','verb','يستنفد','Industrial farming practices deplete groundwater reserves rapidly.','تستنفد ممارسات الزراعة الصناعية احتياطيات المياه الجوفية بسرعة.','core','B2','CEFR-J',3],
  ['displacement','noun','نزوح / إزاحة','Climate displacement forces farmers to abandon productive land.','يُجبر النزوح المناخي المزارعين على التخلي عن أراضٍ منتجة.','core','B2','AWL',3],
  ['distort','verb','يُشوّه','Government subsidies can distort global food market prices.','يمكن للدعم الحكومي تشويه أسعار سوق الغذاء العالمية.','extended','B2','AWL',3],
  ['enormous','adjective','هائل / ضخم','An enormous amount of food is wasted globally every year.','تُهدر كمية هائلة من الغذاء عالمياً كل عام.','core','B1','CEFR-J',3],
  ['exceed','verb','يتجاوز','Food demand is expected to exceed current production capacity.','من المتوقع أن يتجاوز الطلب على الغذاء القدرة الإنتاجية الحالية.','core','B2','AWL',3],

  // ===== UNIT 4 supplementary =====
  ['abstract','adjective','مجرد / تجريدي','Biomimicry turns abstract natural principles into practical applications.','تحوّل المحاكاة الحيوية مبادئ طبيعية مجردة إلى تطبيقات عملية.','core','B2','AWL',4],
  ['complement','verb','يُتمّم','Natural design principles complement traditional engineering approaches.','تُتمّم مبادئ التصميم الطبيعي مناهج الهندسة التقليدية.','extended','B2','AWL',4],
  ['conceive','verb','يبتكر','The engineer conceived a new material based on abalone shell.','ابتكر المهندس مادة جديدة مستوحاة من صدفة أذن البحر.','extended','B2','AWL',4],
  ['configuration','noun','تكوين / ترتيب','The molecular configuration determines the material properties.','يُحدد التكوين الجزيئي خصائص المادة.','extended','B2','AWL',4],
  ['constraint','noun','قيد / محدودية','Nature operates under constraints that inspire creative solutions.','تعمل الطبيعة تحت قيود تُلهم حلولاً إبداعية.','core','B2','AWL',4],
  ['deviate','verb','ينحرف','Nature-inspired designs sometimes deviate significantly from conventions.','تنحرف التصاميم المستوحاة من الطبيعة أحياناً بشكل كبير عن التقاليد.','extended','B2','AWL',4],
  ['dimension','noun','بُعد','Each dimension of the wing design was carefully copied from nature.','نُسخ كل بُعد من تصميم الجناح بعناية من الطبيعة.','core','B2','AWL',4],
  ['domain','noun','مجال / نطاق','Biomimicry spans the domain of engineering biology and design.','تمتد المحاكاة الحيوية عبر مجال الهندسة والأحياء والتصميم.','core','B2','AWL',4],
  ['eliminate','verb','يُزيل','The new coating eliminates the need for chemical cleaning products.','يُزيل الطلاء الجديد الحاجة لمنتجات التنظيف الكيميائية.','core','B2','AWL',4],
  ['enhance','verb','يُعزّز','Nature-inspired textures enhance the performance of aircraft surfaces.','تُعزز الملمسات المستوحاة من الطبيعة أداء أسطح الطائرات.','core','B2','AWL',4],
  ['equivalent','adjective','مكافئ / معادل','The synthetic fiber has no natural equivalent in terms of strength.','الألياف الصناعية ليس لها مكافئ طبيعي من حيث القوة.','core','B2','AWL',4],
  ['eventual','adjective','نهائي / في نهاية المطاف','The eventual goal is to create fully sustainable manufacturing.','الهدف النهائي هو إنشاء تصنيع مستدام بالكامل.','core','B2','AWL',4],
  ['exceed','verb','يفوق','The bio-inspired material exceeds traditional materials in durability.','تفوق المادة المستوحاة من الأحياء المواد التقليدية في المتانة.','core','B2','AWL',4],
  ['explicit','adjective','صريح / واضح','The blueprint provided explicit instructions for the modular design.','قدّم المخطط تعليمات صريحة للتصميم النمطي.','core','B2','AWL',4],
  ['feasible','adjective','ممكن / قابل للتنفيذ','Mass production of spider silk is now commercially feasible.','أصبح الإنتاج الضخم لحرير العنكبوت ممكناً تجارياً الآن.','extended','B2','AWL',4],
  ['formula','noun','صيغة / معادلة','Nature provides the formula for efficient energy conversion.','توفر الطبيعة صيغة لتحويل الطاقة بكفاءة.','core','B2','AWL',4],
  ['framework','noun','إطار عمل','Biomimicry provides a framework for sustainable product development.','توفر المحاكاة الحيوية إطار عمل لتطوير المنتجات المستدامة.','core','B2','AWL',4],
  ['generate','verb','يولّد','The device generates electricity by mimicking the motion of fish.','يولّد الجهاز الكهرباء بمحاكاة حركة الأسماك.','core','B2','AWL',4],
  ['incorporate','verb','يدمج','Modern buildings incorporate biomimetic ventilation systems.','تدمج المباني الحديثة أنظمة تهوية محاكية للحياة.','core','B2','AWL',4],
  ['inevitable','adjective','حتمي / لا مفر منه','The shift toward biomimicry in design seems increasingly inevitable.','يبدو التحول نحو المحاكاة الحيوية في التصميم حتمياً بشكل متزايد.','core','B2','AWL',4],

  // ===== UNIT 5 supplementary =====
  ['accommodate','verb','يستوعب','Cities struggle to accommodate large numbers of incoming migrants.','تكافح المدن لاستيعاب أعداد كبيرة من المهاجرين القادمين.','core','B2','AWL',5],
  ['adequate','adjective','كافٍ / ملائم','Refugees rarely have adequate access to healthcare and education.','نادراً ما يتمتع اللاجئون بوصول كافٍ للرعاية الصحية والتعليم.','core','B2','AWL',5],
  ['advocate','noun','مناصر / محامٍ','Immigration advocates fight for the rights of displaced families.','يناضل مناصرو الهجرة من أجل حقوق العائلات النازحة.','core','B2','AWL',5],
  ['albeit','conjunction','مع أن','The journey was successful albeit extremely dangerous for migrants.','كانت الرحلة ناجحة مع أنها خطيرة للغاية على المهاجرين.','extended','C1','AWL',5],
  ['ambivalent','adjective','متذبذب / متردد','Public opinion remains ambivalent toward large-scale immigration.','يظل الرأي العام متذبذباً تجاه الهجرة الواسعة النطاق.','extended','C1','CEFR-J',5],
  ['anticipate','verb','يتوقع','Officials anticipate a further increase in climate-driven migration.','يتوقع المسؤولون زيادة أخرى في الهجرة المدفوعة بالمناخ.','core','B2','AWL',5],
  ['circumstance','noun','ظرف / حال','Economic circumstances force many families to seek opportunities abroad.','تُجبر الظروف الاقتصادية عائلات كثيرة على البحث عن فرص بالخارج.','core','B2','AWL',5],
  ['compel','verb','يُجبر','Political instability compels citizens to flee their homeland.','يُجبر عدم الاستقرار السياسي المواطنين على الفرار من وطنهم.','core','B2','AWL',5],
  ['confiscate','verb','يصادر','Border agents confiscated illegal documents from the trafficker.','صادر عملاء الحدود وثائق غير قانونية من المهرّب.','extended','B2','CEFR-J',5],
  ['controversy','noun','خلاف','Immigration policy is a source of heated controversy in elections.','سياسة الهجرة مصدر خلاف حاد في الانتخابات.','core','B2','CEFR-J',5],
  ['disparity','noun','تفاوت / عدم تكافؤ','Economic disparity between nations drives much of global migration.','يُحرّك التفاوت الاقتصادي بين الدول كثيراً من الهجرة العالمية.','extended','B2','AWL',5],
  ['eligible','adjective','مؤهل / مستحق','Only certain categories of refugees are eligible for resettlement.','فئات معينة فقط من اللاجئين مؤهلة لإعادة التوطين.','core','B2','CEFR-J',5],
  ['erode','verb','يُقوّض','Years of conflict gradually erode social structures and communities.','سنوات الصراع تُقوّض تدريجياً الهياكل الاجتماعية والمجتمعات.','extended','B2','CEFR-J',5],
  ['fluctuation','noun','تذبذب / تقلب','Migration fluctuations correlate strongly with economic conditions.','ترتبط تذبذبات الهجرة بقوة بالأوضاع الاقتصادية.','extended','B2','AWL',5],
  ['forthcoming','adjective','قادم / وشيك','Forthcoming policy changes may affect thousands of asylum seekers.','قد تؤثر التغييرات السياسية القادمة على آلاف طالبي اللجوء.','extended','B2','AWL',5],
  ['ideology','noun','أيديولوجيا','Political ideology shapes how countries approach immigration reform.','تُشكّل الأيديولوجيا السياسية كيفية تعامل الدول مع إصلاح الهجرة.','extended','B2','AWL',5],
  ['implicit','adjective','ضمني','There is an implicit assumption that migration always benefits economies.','هناك افتراض ضمني بأن الهجرة تفيد الاقتصادات دائماً.','extended','B2','AWL',5],
  ['incentive','noun','حافز','Economic incentives motivate skilled workers to migrate to wealthier nations.','تُحفّز الحوافز الاقتصادية العمال المهرة على الهجرة لدول أغنى.','core','B2','AWL',5],
  ['infrastructure','noun','بنية تحتية','Hosting refugees requires significant investment in local infrastructure.','يتطلب استضافة اللاجئين استثماراً كبيراً في البنية التحتية المحلية.','core','B2','AWL',5],
  ['instability','noun','عدم استقرار','Political instability remains the primary driver of forced migration.','لا يزال عدم الاستقرار السياسي المحرك الرئيسي للهجرة القسرية.','core','B2','CEFR-J',5],

  // ===== UNIT 6 supplementary =====
  ['accumulate','verb','يُراكم','Investors accumulate cryptocurrency expecting long-term appreciation.','يُراكم المستثمرون العملات الرقمية توقعاً لارتفاع القيمة طويل الأجل.','core','B2','AWL',6],
  ['aggregate','noun','مجموع / إجمالي','The aggregate value of all cryptocurrencies fluctuates daily.','يتقلب المجموع الكلي لقيمة جميع العملات الرقمية يومياً.','extended','C1','AWL',6],
  ['allocate','verb','يُوزّع','Wise investors allocate only a small percentage to crypto assets.','يخصص المستثمرون الحكماء نسبة صغيرة فقط للأصول الرقمية.','core','B2','AWL',6],
  ['anticipate','verb','يتوقع','Analysts anticipate continued growth in the blockchain sector.','يتوقع المحللون نمواً مستمراً في قطاع سلسلة الكتل.','core','B2','AWL',6],
  ['commodity','noun','سلعة','Bitcoin increasingly behaves like a commodity rather than a currency.','يتصرف البيتكوين بشكل متزايد كسلعة بدلاً من عملة.','core','B2','AWL',6],
  ['comprehensive','adjective','شامل','Comprehensive regulation of crypto markets remains incomplete.','لا يزال التنظيم الشامل لأسواق العملات الرقمية غير مكتمل.','core','B2','AWL',6],
  ['conceive','verb','يتصوّر','Satoshi Nakamoto conceived the idea of decentralized digital money.','تصوّر ساتوشي ناكاموتو فكرة المال الرقمي اللامركزي.','extended','B2','AWL',6],
  ['controversial','adjective','مثير للجدل','The environmental impact of cryptocurrency mining remains controversial.','لا يزال الأثر البيئي لتعدين العملات الرقمية مثيراً للجدل.','core','B2','CEFR-J',6],
  ['distort','verb','يُشوّه','Speculation can distort the true value of digital assets.','يمكن للمضاربة تشويه القيمة الحقيقية للأصول الرقمية.','extended','B2','AWL',6],
  ['dominant','adjective','مهيمن / سائد','Bitcoin remains the dominant cryptocurrency by market value.','يظل البيتكوين العملة الرقمية المهيمنة من حيث القيمة السوقية.','core','B2','AWL',6],
  ['erode','verb','يُقلّص','High inflation can erode the purchasing power of traditional currencies.','يمكن للتضخم العالي تقليص القوة الشرائية للعملات التقليدية.','extended','B2','CEFR-J',6],
  ['facilitate','verb','يُيسّر','Blockchain technology facilitates secure cross-border payments.','تُيسّر تقنية سلسلة الكتل المدفوعات الآمنة عبر الحدود.','core','B2','AWL',6],
  ['fluctuation','noun','تقلب','Daily price fluctuations make cryptocurrency risky for new investors.','تجعل تقلبات الأسعار اليومية العملات الرقمية محفوفة بالمخاطر للمستثمرين الجدد.','core','B2','AWL',6],
  ['hierarchy','noun','تراتبية','Decentralized systems eliminate the traditional financial hierarchy.','تُلغي الأنظمة اللامركزية التراتبية المالية التقليدية.','extended','B2','AWL',6],
  ['implement','verb','يُطبّق','Many countries are implementing stricter cryptocurrency regulations.','تُطبّق دول كثيرة لوائح أكثر صرامة للعملات الرقمية.','core','B2','AWL',6],
  ['integrate','verb','يُدمج','Traditional banks are beginning to integrate cryptocurrency services.','بدأت البنوك التقليدية بدمج خدمات العملات الرقمية.','core','B2','AWL',6],
  ['legitimate','adjective','شرعي / مشروع','Many governments now recognize cryptocurrency as a legitimate asset.','تعترف حكومات كثيرة الآن بالعملة الرقمية كأصل شرعي.','core','B2','AWL',6],
  ['manipulate','verb','يتلاعب بـ','Wealthy individuals can manipulate cryptocurrency prices easily.','يمكن للأفراد الأثرياء التلاعب بأسعار العملات الرقمية بسهولة.','core','B2','CEFR-J',6],
  ['paradigm','noun','نموذج / نمط','Cryptocurrency represents a paradigm shift in financial thinking.','تمثل العملة الرقمية تحولاً نموذجياً في التفكير المالي.','extended','C1','AWL',6],
  ['prohibit','verb','يمنع','Some countries prohibit citizens from trading in cryptocurrency.','تمنع بعض الدول مواطنيها من التداول بالعملات الرقمية.','core','B2','AWL',6],

  // ===== UNIT 7 supplementary =====
  ['abstract','adjective','مجرد','Abstract concepts like justice can unite or divide large crowds.','يمكن للمفاهيم المجردة كالعدالة أن توحد أو تفرق الحشود الكبيرة.','core','B2','AWL',7],
  ['accommodate','verb','يتكيف مع','Society must accommodate different viewpoints to prevent conflict.','يجب أن يتكيف المجتمع مع وجهات نظر مختلفة لمنع الصراع.','core','B2','AWL',7],
  ['aggregate','noun','مجموع','The aggregate behavior of a crowd differs from individual actions.','يختلف السلوك الإجمالي للحشد عن التصرفات الفردية.','extended','C1','AWL',7],
  ['analogous','adjective','مماثل / مشابه','Crowd behavior is analogous to the movement of a flock of birds.','سلوك الحشود مماثل لحركة سرب من الطيور.','extended','C1','AWL',7],
  ['attribute','verb','يعزو','Psychologists attribute mob violence to deindividuation effects.','يعزو علماء النفس عنف الغوغاء إلى تأثيرات فقدان الفردية.','core','B2','AWL',7],
  ['coherent','adjective','متماسك','Large crowds rarely maintain a coherent message for long.','نادراً ما تحافظ الحشود الكبيرة على رسالة متماسكة لفترة طويلة.','extended','B2','AWL',7],
  ['compel','verb','يدفع','Peer pressure can compel people to act against their values.','يمكن لضغط الأقران دفع الناس للتصرف ضد قيمهم.','core','B2','AWL',7],
  ['complement','noun','مكمّل','Fear and anger are a powerful complement in crowd manipulation.','الخوف والغضب مكمّلان قويان في التلاعب بالحشود.','extended','B2','AWL',7],
  ['conceive','verb','يتصوّر','Le Bon conceived the first scientific theory of crowd behavior.','تصوّر لوبون أول نظرية علمية لسلوك الحشود.','extended','B2','AWL',7],
  ['controversy','noun','جدل','The shooting sparked a major controversy about crowd control methods.','أثار إطلاق النار جدلاً كبيراً حول أساليب السيطرة على الحشود.','core','B2','CEFR-J',7],
  ['core','adjective','جوهري','The core principle of crowd psychology is social identity theory.','المبدأ الجوهري لعلم نفس الجماهير هو نظرية الهوية الاجتماعية.','core','B2','AWL',7],
  ['deduce','verb','يستنتج','Researchers can deduce crowd intentions from movement patterns.','يمكن للباحثين استنتاج نوايا الحشود من أنماط الحركة.','extended','B2','AWL',7],
  ['deviation','noun','انحراف','Individual deviation from group norms often triggers social punishment.','غالباً ما يُثير الانحراف الفردي عن معايير المجموعة عقوبة اجتماعية.','extended','B2','AWL',7],
  ['diminish','verb','يقل / ينقص','Anonymity in crowds diminishes the sense of personal responsibility.','يُقلل إخفاء الهوية في الحشود من الإحساس بالمسؤولية الشخصية.','core','B2','AWL',7],
  ['dominant','adjective','مسيطر','The dominant voice in a crowd can determine the group behavior.','يمكن للصوت المسيطر في الحشد أن يحدد سلوك المجموعة.','core','B2','AWL',7],
  ['explicit','adjective','صريح','The leader gave explicit instructions that led to the crowd actions.','أعطى القائد تعليمات صريحة أدت إلى تصرفات الحشد.','core','B2','AWL',7],
  ['facilitate','verb','يسهّل','Social media platforms facilitate the rapid formation of crowds.','تُسهّل منصات التواصل الاجتماعي التشكل السريع للحشود.','core','B2','AWL',7],
  ['fundamental','adjective','جوهري','Understanding crowd dynamics is fundamental to public safety.','فهم ديناميكيات الحشود جوهري للسلامة العامة.','core','B2','AWL',7],
  ['hierarchy','noun','هرمية','Informal hierarchies emerge quickly within unorganized crowds.','تظهر التراتبيات غير الرسمية بسرعة داخل الحشود غير المنظمة.','extended','B2','AWL',7],
  ['hypothesis','noun','فرضية','The contagion hypothesis suggests emotions spread like a virus.','تقترح فرضية العدوى أن المشاعر تنتشر كالفيروس.','core','B2','AWL',7],

  // ===== UNIT 8 supplementary =====
  ['accumulate','verb','يتراكم','Evidence accumulates gradually throughout a criminal investigation.','تتراكم الأدلة تدريجياً خلال التحقيق الجنائي.','core','B2','AWL',8],
  ['adjacent','adjective','مجاور','Investigators searched all buildings adjacent to the crime scene.','فتّش المحققون جميع المباني المجاورة لمسرح الجريمة.','core','B2','AWL',8],
  ['advocate','verb','يدافع عن','Defense attorneys advocate for the rights of the accused.','يدافع محامو الدفاع عن حقوق المتهمين.','core','B2','AWL',8],
  ['ambiguous','adjective','ملتبس','Ambiguous evidence can lead to wrongful convictions in court.','يمكن للأدلة الملتبسة أن تؤدي لإدانات خاطئة في المحكمة.','extended','B2','AWL',8],
  ['coherent','adjective','متسق','The witness provided a coherent account of the events.','قدّم الشاهد رواية متسقة للأحداث.','extended','B2','AWL',8],
  ['coincide','verb','يتزامن','The suspect alibi did not coincide with the security footage.','لم تتزامن حجة غياب المشتبه به مع لقطات الأمن.','extended','B2','AWL',8],
  ['compile','verb','يُجمّع','Investigators compile all available evidence before presenting a case.','يُجمّع المحققون جميع الأدلة المتاحة قبل تقديم القضية.','core','B2','AWL',8],
  ['compatible','adjective','متوافق','The DNA sample was compatible with the suspect genetic profile.','كانت عينة الحمض النووي متوافقة مع الملف الجيني للمشتبه به.','core','B2','AWL',8],
  ['conceive','verb','يتصوّر','It was hard to conceive how the criminal escaped undetected.','كان من الصعب تصوّر كيف هرب المجرم دون أن يُكتشف.','extended','B2','AWL',8],
  ['conclusive','adjective','حاسم / قاطع','The forensic evidence was conclusive enough to secure a conviction.','كانت الأدلة الجنائية حاسمة بما يكفي لتأمين إدانة.','core','B2','AWL',8],
  ['contradict','verb','ينقض','New evidence may contradict the original theory of the crime.','قد تنقض أدلة جديدة النظرية الأصلية للجريمة.','core','B2','AWL',8],
  ['credible','adjective','ذو مصداقية','The witness testimony was considered highly credible by the jury.','اعتبرت هيئة المحلفين شهادة الشاهد ذات مصداقية عالية.','core','B2','CEFR-J',8],
  ['deduce','verb','يستدل','Sherlock Holmes could deduce facts from tiny physical clues.','كان شيرلوك هولمز يستطيع الاستدلال من أدلة مادية صغيرة.','extended','B2','AWL',8],
  ['diminish','verb','يتناقص','Exposure to weather can diminish the quality of outdoor evidence.','يمكن للتعرض للطقس تقليل جودة الأدلة في الهواء الطلق.','core','B2','AWL',8],
  ['eliminate','verb','يستبعد','Detectives work to eliminate suspects through alibis and evidence.','يعمل المحققون على استبعاد المشتبه بهم من خلال الأدلة والحجج.','core','B2','AWL',8],
  ['explicit','adjective','واضح / صريح','The law is explicit about the procedures for handling evidence.','القانون واضح بشأن إجراءات التعامل مع الأدلة.','core','B2','AWL',8],
  ['framework','noun','إطار','The legal framework for digital forensics is still evolving.','لا يزال الإطار القانوني للطب الشرعي الرقمي في تطور.','core','B2','AWL',8],
  ['hypothesis','noun','فرضية','Investigators formed a hypothesis about how the crime was committed.','شكّل المحققون فرضية حول كيفية ارتكاب الجريمة.','core','B2','AWL',8],
  ['impartial','adjective','محايد / نزيه','Forensic experts must provide impartial analysis regardless of pressure.','يجب أن يقدم خبراء الطب الشرعي تحليلاً محايداً بغض النظر عن الضغوط.','extended','B2','CEFR-J',8],
  ['inherent','adjective','كامن','There are inherent challenges in analyzing degraded biological evidence.','هناك تحديات كامنة في تحليل الأدلة البيولوجية المتدهورة.','extended','B2','AWL',8],

  // ===== UNIT 9 supplementary =====
  ['adjacent','adjective','متاخم','Adjacent burial sites suggest a complex ancient social structure.','تُشير مواقع الدفن المتاخمة إلى بنية اجتماعية قديمة معقدة.','core','B2','AWL',9],
  ['analogous','adjective','مشابه','The ancient irrigation system is analogous to modern water networks.','نظام الري القديم مشابه لشبكات المياه الحديثة.','extended','C1','AWL',9],
  ['attribute','verb','يَنسب','Historians attribute the temple construction to the third dynasty.','ينسب المؤرخون بناء المعبد إلى السلالة الثالثة.','core','B2','AWL',9],
  ['commence','verb','يبدأ','The excavation season will commence when the weather permits.','سيبدأ موسم التنقيب عندما يسمح الطقس.','core','B2','AWL',9],
  ['compile','verb','يُعدّ','Archaeologists compiled a catalog of over ten thousand artifacts.','أعدّ علماء الآثار فهرساً لأكثر من عشرة آلاف قطعة أثرية.','core','B2','AWL',9],
  ['comprehensive','adjective','شامل','A comprehensive survey of the site took over three years.','استغرقت دراسة شاملة للموقع أكثر من ثلاث سنوات.','core','B2','AWL',9],
  ['conceive','verb','يتخيّل','It is hard to conceive how ancient people built such structures.','من الصعب تخيّل كيف بنى القدماء مثل هذه الهياكل.','extended','B2','AWL',9],
  ['controversy','noun','جدل','The dating of the artifact sparked controversy among experts.','أثار تأريخ القطعة الأثرية جدلاً بين الخبراء.','core','B2','CEFR-J',9],
  ['credibility','noun','مصداقية','The credibility of the discovery was confirmed by independent tests.','أُكدت مصداقية الاكتشاف باختبارات مستقلة.','core','B2','CEFR-J',9],
  ['depict','verb','يُصوّر','The mural depicts daily life in the ancient Egyptian court.','تُصوّر الجدارية الحياة اليومية في البلاط المصري القديم.','core','B2','CEFR-J',9],
  ['dimension','noun','أبعاد','The massive dimensions of the pyramid amazed modern engineers.','أدهشت الأبعاد الضخمة للهرم المهندسين المعاصرين.','core','B2','AWL',9],
  ['diminish','verb','يتلاشى','The significance of the discovery will not diminish over time.','لن تتلاشى أهمية الاكتشاف مع مرور الوقت.','core','B2','AWL',9],
  ['document','verb','يُوثّق','Researchers carefully document every artifact found at the site.','يُوثّق الباحثون بعناية كل قطعة أثرية موجودة في الموقع.','core','B2','AWL',9],
  ['dominate','verb','يُهيمن','The great temple dominated the center of the ancient city.','هيمن المعبد العظيم على مركز المدينة القديمة.','core','B2','AWL',9],
  ['duration','noun','مدة','The duration of the civilization spanned over two thousand years.','امتدت مدة الحضارة لأكثر من ألفي عام.','core','B2','AWL',9],
  ['elaborate','adjective','مفصّل / معقد','The elaborate carvings revealed sophisticated artistic techniques.','كشفت النقوش المفصّلة عن تقنيات فنية متطورة.','core','B2','AWL',9],
  ['equivalent','noun','نظير / مكافئ','The ancient text had no modern equivalent for some concepts.','لم يكن للنص القديم نظير حديث لبعض المفاهيم.','core','B2','AWL',9],
  ['exploit','verb','يستثمر','Looters exploit unstable political situations to plunder heritage sites.','يستغل اللصوص الأوضاع السياسية غير المستقرة لنهب مواقع التراث.','core','B2','AWL',9],
  ['facilitate','verb','يُسهّل','New imaging technology facilitates non-invasive archaeological surveys.','تُسهّل تقنية التصوير الجديدة المسوحات الأثرية غير التدخلية.','core','B2','AWL',9],
  ['fundamental','adjective','أساسي','Pottery analysis is fundamental to understanding ancient trade routes.','تحليل الفخار أساسي لفهم طرق التجارة القديمة.','core','B2','AWL',9],

  // ===== UNIT 10 supplementary =====
  ['abstract','adjective','تجريدي','The concept of biological age is more abstract than calendar age.','مفهوم العمر البيولوجي أكثر تجريداً من العمر الزمني.','core','B2','AWL',10],
  ['accumulate','verb','يتجمّع','Cellular damage accumulates gradually throughout a person lifetime.','يتجمّع تلف الخلايا تدريجياً طوال حياة الشخص.','core','B2','AWL',10],
  ['advocate','verb','يروّج لـ','Health experts advocate for daily physical activity at all ages.','يروّج خبراء الصحة للنشاط البدني اليومي في جميع الأعمار.','core','B2','AWL',10],
  ['albeit','conjunction','ولو أن','Progress in aging research is promising albeit very gradual.','التقدم في أبحاث الشيخوخة واعد ولو أنه تدريجي جداً.','extended','C1','AWL',10],
  ['attribute','verb','ينسب إلى','Scientists attribute long life in Japan to diet and social bonds.','ينسب العلماء طول العمر في اليابان إلى النظام الغذائي والروابط الاجتماعية.','core','B2','AWL',10],
  ['coincide','verb','يتزامن','The rise in longevity coincides with advances in public health.','يتزامن ارتفاع طول العمر مع التقدم في الصحة العامة.','extended','B2','AWL',10],
  ['comprise','verb','يتألف من','A healthy lifestyle comprises regular exercise and balanced nutrition.','يتألف نمط الحياة الصحي من التمارين المنتظمة والتغذية المتوازنة.','core','B2','AWL',10],
  ['controversy','noun','جدل','The ethics of extreme life extension remains a subject of controversy.','تظل أخلاقيات إطالة العمر المتطرفة موضع جدل.','core','B2','CEFR-J',10],
  ['correlate','verb','يرتبط','Higher education levels correlate with longer average lifespans.','ترتبط مستويات التعليم العالية بمتوسط أعمار أطول.','core','B2','AWL',10],
  ['decline','noun','انخفاض / تراجع','Cognitive decline can be slowed through regular mental stimulation.','يمكن إبطاء التراجع الإدراكي من خلال التحفيز الذهني المنتظم.','core','B2','AWL',10],
  ['diminish','verb','يتناقص','Physical strength gradually diminishes with age without exercise.','تتناقص القوة البدنية تدريجياً مع العمر بدون تمارين.','core','B2','AWL',10],
  ['emerge','verb','يظهر','New anti-aging therapies are emerging from genetic research.','تظهر علاجات جديدة لمكافحة الشيخوخة من البحث الجيني.','core','B2','AWL',10],
  ['empirical','adjective','تجريبي','Empirical studies confirm that social connections extend life.','تؤكد الدراسات التجريبية أن الروابط الاجتماعية تُطيل العمر.','extended','C1','AWL',10],
  ['enhance','verb','يُعزّز','A Mediterranean diet enhances longevity and overall health.','يُعزز النظام الغذائي المتوسطي طول العمر والصحة العامة.','core','B2','AWL',10],
  ['inhibit','verb','يُثبّط','Certain compounds inhibit the cellular aging process.','تُثبّط مركبات معينة عملية شيخوخة الخلايا.','extended','B2','AWL',10],
  ['intervention','noun','تدخل','Lifestyle interventions are more effective than drugs for longevity.','التدخلات في نمط الحياة أكثر فعالية من الأدوية لطول العمر.','core','B2','AWL',10],
  ['mechanism','noun','آلية','Scientists are unraveling the molecular mechanisms of aging.','يكشف العلماء عن الآليات الجزيئية للشيخوخة.','core','B2','AWL',10],
  ['paradigm','noun','نموذج / إطار فكري','The aging research paradigm has shifted from disease to prevention.','تحوّل نموذج أبحاث الشيخوخة من المرض إلى الوقاية.','extended','C1','AWL',10],
  ['phenomenon','noun','ظاهرة','Aging is a universal biological phenomenon across all species.','الشيخوخة ظاهرة بيولوجية عالمية عبر جميع الأنواع.','core','B2','AWL',10],
  ['proportion','noun','نسبة','The proportion of elderly people in the population keeps growing.','تستمر نسبة كبار السن في السكان في النمو.','core','B2','AWL',10],

  // ===== UNIT 11 supplementary =====
  ['abstract','adjective','تجريدي','Abstract design concepts must translate into practical building plans.','يجب أن تُترجم مفاهيم التصميم التجريدية إلى خطط بناء عملية.','core','B2','AWL',11],
  ['accommodate','verb','يستوعب','Sustainable buildings must accommodate the needs of all residents.','يجب أن تستوعب المباني المستدامة احتياجات جميع السكان.','core','B2','AWL',11],
  ['anticipate','verb','يتوقع','Architects anticipate future climate conditions in their designs.','يتوقع المهندسون المعماريون ظروف المناخ المستقبلية في تصاميمهم.','core','B2','AWL',11],
  ['complement','verb','يُكمل','Green spaces complement urban architecture creating healthier cities.','تُكمل المساحات الخضراء العمارة الحضرية مما يخلق مدناً أكثر صحة.','extended','B2','AWL',11],
  ['comprise','verb','يتكون من','A sustainable building comprises energy-efficient systems and materials.','يتكون المبنى المستدام من أنظمة ومواد موفرة للطاقة.','core','B2','AWL',11],
  ['configuration','noun','تشكيل / تنظيم','The building configuration maximizes natural light and ventilation.','يُعظّم تشكيل المبنى الإضاءة الطبيعية والتهوية.','extended','B2','AWL',11],
  ['constraint','noun','قيد','Budget constraints often limit the use of sustainable materials.','غالباً ما تُحدّ قيود الميزانية من استخدام المواد المستدامة.','core','B2','AWL',11],
  ['contemporary','adjective','معاصر','Contemporary architecture emphasizes environmental responsibility.','تُشدد العمارة المعاصرة على المسؤولية البيئية.','core','B2','AWL',11],
  ['controversy','noun','جدل','Demolishing historic buildings for green projects creates controversy.','يُثير هدم المباني التاريخية لمشاريع خضراء جدلاً.','core','B2','CEFR-J',11],
  ['dimension','noun','بُعد','Every dimension of the design was optimized for energy efficiency.','حُسّن كل بُعد من التصميم لكفاءة الطاقة.','core','B2','AWL',11],
  ['dominant','adjective','سائد','Glass and steel remain the dominant materials in modern architecture.','يظل الزجاج والفولاذ المواد السائدة في العمارة الحديثة.','core','B2','AWL',11],
  ['enhance','verb','يحسّن','Green building features enhance both comfort and energy performance.','تُحسّن ميزات المباني الخضراء الراحة وأداء الطاقة معاً.','core','B2','AWL',11],
  ['explicit','adjective','صريح','Building codes contain explicit requirements for energy efficiency.','تحتوي أكواد البناء على متطلبات صريحة لكفاءة الطاقة.','core','B2','AWL',11],
  ['generate','verb','يُنتج','Solar rooftops generate enough electricity to power entire buildings.','تُنتج الأسطح الشمسية كهرباء كافية لتشغيل مبانٍ كاملة.','core','B2','AWL',11],
  ['incentive','noun','حافز','Tax incentives encourage developers to build sustainable structures.','تُشجع الحوافز الضريبية المطورين على بناء هياكل مستدامة.','core','B2','AWL',11],
  ['incorporate','verb','يتضمن','The design incorporates recycled materials throughout the structure.','يتضمن التصميم مواد معاد تدويرها في جميع أنحاء الهيكل.','core','B2','AWL',11],
  ['innovation','noun','ابتكار','Innovation in building materials has reduced construction waste.','قلّل الابتكار في مواد البناء من نفايات البناء.','core','B2','AWL',11],
  ['integral','adjective','لا يتجزأ','Energy efficiency is an integral part of modern building design.','كفاءة الطاقة جزء لا يتجزأ من تصميم المباني الحديثة.','core','B2','AWL',11],
  ['minimize','verb','يُقلل من','Architects minimize waste by using precise digital modeling.','يُقلل المهندسون المعماريون من النفايات باستخدام النمذجة الرقمية الدقيقة.','core','B2','AWL',11],
  ['perceive','verb','يُدرك','Residents perceive green buildings as healthier living environments.','يُدرك السكان المباني الخضراء كبيئات عيش أكثر صحة.','core','B2','AWL',11],

  // ===== UNIT 12 supplementary =====
  ['abstract','adjective','نظري','Some exoplanet theories remain highly abstract and unverifiable.','تظل بعض نظريات الكواكب الخارجية نظرية للغاية وغير قابلة للتحقق.','core','B2','AWL',12],
  ['accumulate','verb','يجمع','Telescopes accumulate light over hours to detect faint signals.','تجمع التلسكوبات الضوء على مدى ساعات لاكتشاف إشارات خافتة.','core','B2','AWL',12],
  ['comprise','verb','يتكون من','Our solar system comprises eight planets and numerous smaller bodies.','يتكون نظامنا الشمسي من ثمانية كواكب وأجرام أصغر عديدة.','core','B2','AWL',12],
  ['conceive','verb','يتصوّر','It is difficult to conceive the vast distances between stars.','من الصعب تصوّر المسافات الشاسعة بين النجوم.','extended','B2','AWL',12],
  ['configuration','noun','ترتيب','The orbital configuration of planets affects their habitability.','يؤثر ترتيب مدارات الكواكب على قابليتها للسكن.','extended','B2','AWL',12],
  ['controversy','noun','خلاف','The demotion of Pluto sparked controversy among astronomers.','أثار تخفيض تصنيف بلوتو خلافاً بين علماء الفلك.','core','B2','CEFR-J',12],
  ['detect','verb','يرصد','Advanced sensors can detect Earth-sized planets around distant stars.','يمكن لأجهزة استشعار متقدمة رصد كواكب بحجم الأرض حول نجوم بعيدة.','core','B2','CEFR-J',12],
  ['diminish','verb','يخفت','Starlight diminishes with distance making remote detection difficult.','يخفت ضوء النجوم مع المسافة مما يجعل الرصد عن بُعد صعباً.','core','B2','AWL',12],
  ['dominate','verb','يُهيمن','Gas giants dominate the outer regions of most planetary systems.','تُهيمن الكواكب الغازية العملاقة على المناطق الخارجية لمعظم الأنظمة.','core','B2','AWL',12],
  ['duration','noun','مدة','The duration of a planet orbit determines its year length.','تُحدد مدة مدار الكوكب طول سنته.','core','B2','AWL',12],
  ['emerge','verb','يبرز','New data is emerging about potentially habitable exoplanets.','تبرز بيانات جديدة حول كواكب خارجية قد تكون صالحة للسكن.','core','B2','AWL',12],
  ['enhance','verb','يُحسّن','Adaptive optics enhance the resolution of ground-based telescopes.','تُحسّن البصريات التكيفية دقة التلسكوبات الأرضية.','core','B2','AWL',12],
  ['facilitate','verb','يُتيح','Space telescopes facilitate observations without atmospheric distortion.','تُتيح التلسكوبات الفضائية ملاحظات دون تشويه جوي.','core','B2','AWL',12],
  ['hypothesis','noun','فرضية','The hypothesis of panspermia suggests life traveled between planets.','تقترح فرضية البذر الكوني أن الحياة انتقلت بين الكواكب.','core','B2','AWL',12],
  ['implication','noun','مضمون / دلالة','The discovery of alien life would have profound implications.','سيكون لاكتشاف حياة فضائية دلالات عميقة.','core','B2','AWL',12],
  ['inherent','adjective','متأصل','There are inherent limitations in detecting planets so far away.','هناك قيود متأصلة في اكتشاف كواكب على هذا البعد.','extended','B2','AWL',12],
  ['integral','adjective','حيوي','Mathematics is integral to calculating orbital mechanics.','الرياضيات حيوية لحساب ميكانيكا المدارات.','core','B2','AWL',12],
  ['minimize','verb','يُصغّر','Engineers minimize instrument noise to detect faint planetary signals.','يُصغّر المهندسون ضوضاء الأجهزة لاكتشاف إشارات كوكبية خافتة.','core','B2','AWL',12],
  ['phenomenon','noun','ظاهرة','The transit phenomenon allows detection of planets crossing their star.','تسمح ظاهرة العبور باكتشاف الكواكب التي تعبر أمام نجمها.','core','B2','AWL',12],
  ['unprecedented','adjective','لم يسبق له مثيل','The telescope provided unprecedented views of distant planetary systems.','وفّر التلسكوب مناظر لم يسبق لها مثيل لأنظمة كوكبية بعيدة.','core','B2','AWL',12],
];

async function run() {
  const client = await pool.connect();
  try {
    const before = await client.query(`SELECT COUNT(*) AS cnt FROM vocab_staging_l4`);
    console.log('Before:', before.rows[0].cnt, 'words');

    const count = await insertBatch(client, GENERAL_B2_WORDS, 14);
    console.log(`General B2 batch: ${count} attempted`);

    const after = await client.query(`SELECT recommended_unit, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit`);
    console.log('\n=== Per-unit totals ===');
    after.rows.forEach(r => console.log(`U${r.recommended_unit}: ${r.cnt}`));

    const total = await client.query(`SELECT COUNT(*) AS cnt FROM vocab_staging_l4`);
    console.log('\nTotal staged:', total.rows[0].cnt);

    // CEFR distribution
    const cefr = await client.query(`SELECT cefr_level, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY cefr_level ORDER BY cefr_level`);
    const totalCnt = (await client.query(`SELECT COUNT(*) AS t FROM vocab_staging_l4`)).rows[0].t;
    console.log('\n=== CEFR ===');
    cefr.rows.forEach(r => console.log(`${r.cefr_level}: ${r.cnt} (${(r.cnt * 100 / totalCnt).toFixed(1)}%)`));

    // Source distribution
    const src = await client.query(`SELECT source_list, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY source_list ORDER BY cnt DESC`);
    console.log('\n=== Source ===');
    src.rows.forEach(r => console.log(`${r.source_list}: ${r.cnt}`));

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(e => console.error(e));
