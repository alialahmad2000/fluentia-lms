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
    // U7 Crowd Psychology - 35 niche terms
    const u7 = [
      ['Asch conformity experiment', 'noun', 'تجربة آش للامتثال', 'The Asch conformity experiment showed people conform to group pressure.', 'أظهرت تجربة آش للامتثال أن الناس يمتثلون لضغط المجموعة.', 'extended', 'B2', 'COCA'],
      ['Milgram obedience study', 'noun', 'دراسة ميلغرام للطاعة', 'The Milgram obedience study revealed how people follow authority figures.', 'كشفت دراسة ميلغرام للطاعة كيف يتبع الناس شخصيات السلطة.', 'extended', 'B2', 'COCA'],
      ['minimal group paradigm', 'noun', 'نموذج المجموعة الأدنى', 'The minimal group paradigm shows bias from trivial group distinctions.', 'يظهر نموذج المجموعة الأدنى التحيز من التمييزات الجماعية التافهة.', 'mastery', 'C1', 'COCA'],
      ['realistic conflict theory', 'noun', 'نظرية الصراع الواقعي', 'Realistic conflict theory explains hostility from competing over resources.', 'تفسر نظرية الصراع الواقعي العداء الناتج عن التنافس على الموارد.', 'mastery', 'C1', 'COCA'],
      ['social identity theory', 'noun', 'نظرية الهوية الاجتماعية', 'Social identity theory explains how group membership shapes self-concept.', 'تفسر نظرية الهوية الاجتماعية كيف تشكل العضوية الجماعية مفهوم الذات.', 'extended', 'B2', 'COCA'],
      ['self-categorization theory', 'noun', 'نظرية التصنيف الذاتي', 'Self-categorization theory describes how people classify themselves into groups.', 'تصف نظرية التصنيف الذاتي كيف يصنف الناس أنفسهم في مجموعات.', 'mastery', 'C1', 'COCA'],
      ['terror management theory', 'noun', 'نظرية إدارة الرعب', 'Terror management theory suggests death awareness drives cultural beliefs.', 'تقترح نظرية إدارة الرعب أن الوعي بالموت يدفع المعتقدات الثقافية.', 'mastery', 'C1', 'COCA'],
      ['mortality salience', 'noun', 'بروز الموت', 'Mortality salience makes people cling more tightly to their worldviews.', 'يجعل بروز الموت الناس يتمسكون بشكل أقوى بنظرتهم للعالم.', 'mastery', 'C1', 'COCA'],
      ['worldview defense', 'noun', 'الدفاع عن النظرة العالمية', 'Worldview defense intensifies when people feel existentially threatened.', 'يشتد الدفاع عن النظرة العالمية عندما يشعر الناس بتهديد وجودي.', 'mastery', 'C1', 'COCA'],
      ['meaning maintenance model', 'noun', 'نموذج الحفاظ على المعنى', 'The meaning maintenance model explains reactions to meaning threats.', 'يفسر نموذج الحفاظ على المعنى ردود الفعل على تهديدات المعنى.', 'mastery', 'C1', 'COCA'],
      ['system justification theory', 'noun', 'نظرية تبرير النظام', 'System justification theory explains why people defend unfair systems.', 'تفسر نظرية تبرير النظام لماذا يدافع الناس عن الأنظمة غير العادلة.', 'mastery', 'C1', 'COCA'],
      ['fundamental attribution error', 'noun', 'خطأ الإسناد الأساسي', 'The fundamental attribution error overemphasizes personality over situation.', 'يبالغ خطأ الإسناد الأساسي في أهمية الشخصية على حساب الموقف.', 'extended', 'B2', 'COCA'],
      ['actor-observer asymmetry', 'noun', 'عدم تماثل الفاعل والمراقب', 'Actor-observer asymmetry means we judge others differently than ourselves.', 'يعني عدم تماثل الفاعل والمراقب أننا نحكم على الآخرين بشكل مختلف عن أنفسنا.', 'mastery', 'C1', 'COCA'],
      ['outgroup homogeneity effect', 'noun', 'تأثير تجانس المجموعة الخارجية', 'The outgroup homogeneity effect makes us see outsiders as all alike.', 'يجعلنا تأثير تجانس المجموعة الخارجية نرى الغرباء متشابهين.', 'mastery', 'C1', 'COCA'],
      ['contact hypothesis', 'noun', 'فرضية الاتصال', 'The contact hypothesis suggests interaction reduces prejudice.', 'تقترح فرضية الاتصال أن التفاعل يقلل من التحيز.', 'extended', 'B2', 'COCA'],
      ['extended contact effect', 'noun', 'تأثير الاتصال الممتد', 'The extended contact effect reduces bias through indirect friendships.', 'يقلل تأثير الاتصال الممتد التحيز من خلال الصداقات غير المباشرة.', 'mastery', 'C1', 'COCA'],
      ['perspective taking exercise', 'noun', 'تمرين أخذ المنظور', 'A perspective taking exercise builds empathy by imagining others\' views.', 'يبني تمرين أخذ المنظور التعاطف بتخيل آراء الآخرين.', 'extended', 'B2', 'COCA'],
      ['jigsaw classroom method', 'noun', 'طريقة الفصل الدراسي المركب', 'The jigsaw classroom method requires cooperation among diverse students.', 'تتطلب طريقة الفصل الدراسي المركب التعاون بين الطلاب المتنوعين.', 'extended', 'B2', 'COCA'],
      ['cooperative learning strategy', 'noun', 'استراتيجية التعلم التعاوني', 'A cooperative learning strategy promotes positive interdependence.', 'تعزز استراتيجية التعلم التعاوني الاعتماد المتبادل الإيجابي.', 'extended', 'B2', 'COCA'],
      ['intergroup dialogue program', 'noun', 'برنامج حوار بين المجموعات', 'An intergroup dialogue program fosters understanding between conflicting groups.', 'يعزز برنامج الحوار بين المجموعات التفاهم بين المجموعات المتصارعة.', 'extended', 'B2', 'COCA'],
      ['elaboration likelihood model', 'noun', 'نموذج احتمالية التفصيل', 'The elaboration likelihood model describes two routes to persuasion.', 'يصف نموذج احتمالية التفصيل مسارين للإقناع.', 'mastery', 'C1', 'COCA'],
      ['central route processing', 'noun', 'المعالجة بالمسار المركزي', 'Central route processing involves careful evaluation of arguments.', 'تتضمن المعالجة بالمسار المركزي تقييماً دقيقاً للحجج.', 'mastery', 'C1', 'COCA'],
      ['peripheral route processing', 'noun', 'المعالجة بالمسار المحيطي', 'Peripheral route processing relies on superficial cues like attractiveness.', 'تعتمد المعالجة بالمسار المحيطي على إشارات سطحية مثل الجاذبية.', 'mastery', 'C1', 'COCA'],
      ['dual process theory', 'noun', 'نظرية العملية المزدوجة', 'Dual process theory distinguishes fast intuitive from slow deliberate thinking.', 'تميز نظرية العملية المزدوجة بين التفكير الحدسي السريع والتفكير المتعمد البطيء.', 'extended', 'B2', 'COCA'],
      ['bounded rationality', 'noun', 'العقلانية المحدودة', 'Bounded rationality explains why humans make satisfactory rather than optimal decisions.', 'تفسر العقلانية المحدودة لماذا يتخذ البشر قرارات مرضية بدلاً من مثالية.', 'extended', 'B2', 'COCA'],
      ['prospect theory', 'noun', 'نظرية الاحتمال', 'Prospect theory shows losses feel worse than equivalent gains feel good.', 'تظهر نظرية الاحتمال أن الخسائر تبدو أسوأ مما تبدو المكاسب المكافئة جيدة.', 'extended', 'B2', 'COCA'],
      ['endowment effect', 'noun', 'تأثير الملكية', 'The endowment effect makes people overvalue what they already own.', 'يجعل تأثير الملكية الناس يبالغون في قيمة ما يمتلكونه بالفعل.', 'extended', 'B2', 'COCA'],
      ['decoy effect', 'noun', 'تأثير الطعم', 'The decoy effect uses an inferior option to steer choices.', 'يستخدم تأثير الطعم خياراً أدنى لتوجيه الاختيارات.', 'extended', 'B2', 'COCA'],
      ['asymmetric dominance', 'noun', 'الهيمنة غير المتماثلة', 'Asymmetric dominance makes one option look better by adding a worse alternative.', 'تجعل الهيمنة غير المتماثلة خياراً يبدو أفضل بإضافة بديل أسوأ.', 'mastery', 'C1', 'COCA'],
      ['range-frequency theory', 'noun', 'نظرية المدى والتكرار', 'Range-frequency theory explains how context shapes subjective judgments.', 'تفسر نظرية المدى والتكرار كيف يشكل السياق الأحكام الذاتية.', 'mastery', 'C1', 'COCA'],
      ['satisficing behavior', 'noun', 'سلوك القناعة', 'Satisficing behavior chooses the first acceptable option rather than the best.', 'يختار سلوك القناعة أول خيار مقبول بدلاً من الأفضل.', 'extended', 'B2', 'COCA'],
      ['regret theory', 'noun', 'نظرية الندم', 'Regret theory explains decision-making based on anticipated regret.', 'تفسر نظرية الندم صنع القرار بناءً على الندم المتوقع.', 'mastery', 'C1', 'COCA'],
      ['certainty effect', 'noun', 'تأثير اليقين', 'The certainty effect makes people prefer sure outcomes over probable ones.', 'يجعل تأثير اليقين الناس يفضلون النتائج المؤكدة على المحتملة.', 'extended', 'B2', 'COCA'],
      ['omission bias', 'noun', 'تحيز الإغفال', 'Omission bias makes inaction seem less harmful than action.', 'يجعل تحيز الإغفال عدم التصرف يبدو أقل ضرراً من التصرف.', 'extended', 'B2', 'COCA'],
      ['default effect', 'noun', 'تأثير الافتراضي', 'The default effect shows people tend to stick with preset options.', 'يظهر تأثير الافتراضي أن الناس يميلون إلى التمسك بالخيارات المحددة مسبقاً.', 'extended', 'B2', 'COCA'],
    ];
    let r7 = await insertBatch(client, u7, 7, 32);
    console.log(`U7: ${r7} inserted`);

    // U8 Forensic Science - 35 niche terms
    const u8 = [
      ['questioned document examination', 'noun', 'فحص المستند المشكوك فيه', 'Questioned document examination analyzes handwriting and paper.', 'يحلل فحص المستند المشكوك فيه الخط والورق.', 'extended', 'B2', 'COCA'],
      ['handwriting comparison', 'noun', 'مقارنة الخطوط', 'Handwriting comparison identifies authors of anonymous letters.', 'تحدد مقارنة الخطوط كاتبي الرسائل المجهولة.', 'core', 'B2', 'COCA'],
      ['signature verification', 'noun', 'التحقق من التوقيع', 'Signature verification detects forged documents.', 'يكشف التحقق من التوقيع المستندات المزورة.', 'core', 'B2', 'COCA'],
      ['ink dating analysis', 'noun', 'تحليل تاريخ الحبر', 'Ink dating analysis determines when a document was written.', 'يحدد تحليل تاريخ الحبر متى كُتب المستند.', 'mastery', 'C1', 'COCA'],
      ['steganography detection', 'noun', 'كشف التخفي الرقمي', 'Steganography detection reveals hidden messages in digital files.', 'يكشف كشف التخفي الرقمي الرسائل المخفية في الملفات الرقمية.', 'mastery', 'C1', 'COCA'],
      ['metadata extraction', 'noun', 'استخراج البيانات الوصفية', 'Metadata extraction reveals creation dates and editing history.', 'يكشف استخراج البيانات الوصفية تواريخ الإنشاء وسجل التحرير.', 'extended', 'B2', 'COCA'],
      ['hash value verification', 'noun', 'التحقق من قيمة التجزئة', 'Hash value verification ensures digital evidence has not been altered.', 'يضمن التحقق من قيمة التجزئة عدم تغيير الأدلة الرقمية.', 'mastery', 'C1', 'COCA'],
      ['file carving technique', 'noun', 'تقنية نحت الملفات', 'File carving technique recovers deleted files from storage media.', 'تستعيد تقنية نحت الملفات الملفات المحذوفة من وسائط التخزين.', 'mastery', 'C1', 'COCA'],
      ['deleted file recovery', 'noun', 'استعادة الملفات المحذوفة', 'Deleted file recovery can retrieve evidence from formatted drives.', 'يمكن لاستعادة الملفات المحذوفة استرجاع الأدلة من الأقراص المهيأة.', 'extended', 'B2', 'COCA'],
      ['slack space analysis', 'noun', 'تحليل المساحة الفارغة', 'Slack space analysis finds data remnants in unused disk areas.', 'يجد تحليل المساحة الفارغة بقايا البيانات في مناطق القرص غير المستخدمة.', 'mastery', 'C1', 'COCA'],
      ['registry analysis', 'noun', 'تحليل السجل', 'Registry analysis reveals installed software and user activity.', 'يكشف تحليل السجل البرامج المثبتة ونشاط المستخدم.', 'extended', 'B2', 'COCA'],
      ['browser artifact analysis', 'noun', 'تحليل آثار المتصفح', 'Browser artifact analysis shows websites visited and search history.', 'يظهر تحليل آثار المتصفح المواقع التي تمت زيارتها وسجل البحث.', 'extended', 'B2', 'COCA'],
      ['email header analysis', 'noun', 'تحليل رأس البريد الإلكتروني', 'Email header analysis traces the origin and route of messages.', 'يتتبع تحليل رأس البريد الإلكتروني أصل الرسائل ومسارها.', 'extended', 'B2', 'COCA'],
      ['network packet capture', 'noun', 'التقاط حزم الشبكة', 'Network packet capture records data transmitted over a network.', 'يسجل التقاط حزم الشبكة البيانات المنقولة عبر الشبكة.', 'mastery', 'C1', 'COCA'],
      ['memory forensics technique', 'noun', 'تقنية فحص الذاكرة الجنائي', 'Memory forensics technique analyzes computer RAM for evidence.', 'تحلل تقنية فحص الذاكرة الجنائي ذاكرة الوصول العشوائي بحثاً عن أدلة.', 'mastery', 'C1', 'COCA'],
      ['write blocker device', 'noun', 'جهاز منع الكتابة', 'A write blocker device prevents changes to evidence during analysis.', 'يمنع جهاز منع الكتابة التغييرات على الأدلة أثناء التحليل.', 'mastery', 'C1', 'COCA'],
      ['forensic image copy', 'noun', 'نسخة صورة جنائية', 'A forensic image copy creates a bit-for-bit duplicate of storage media.', 'تنشئ نسخة الصورة الجنائية نسخة مطابقة بت ببت من وسائط التخزين.', 'mastery', 'C1', 'COCA'],
      ['chain of custody form', 'noun', 'نموذج سلسلة الحفظ', 'A chain of custody form documents every person who handled evidence.', 'يوثق نموذج سلسلة الحفظ كل شخص تعامل مع الأدلة.', 'extended', 'B2', 'COCA'],
      ['laboratory information system', 'noun', 'نظام معلومات المختبر', 'A laboratory information system tracks samples and test results.', 'يتتبع نظام معلومات المختبر العينات ونتائج الاختبارات.', 'extended', 'B2', 'COCA'],
      ['crime scene diagram', 'noun', 'مخطط مسرح الجريمة', 'A crime scene diagram shows the spatial layout of evidence.', 'يظهر مخطط مسرح الجريمة التخطيط المكاني للأدلة.', 'core', 'B2', 'COCA'],
      ['crime scene photography', 'noun', 'تصوير مسرح الجريمة', 'Crime scene photography captures evidence in its original position.', 'يلتقط تصوير مسرح الجريمة الأدلة في موضعها الأصلي.', 'core', 'B2', 'COCA'],
      ['demonstrative exhibit', 'noun', 'عرض توضيحي', 'A demonstrative exhibit helps the jury understand complex evidence.', 'يساعد العرض التوضيحي هيئة المحلفين على فهم الأدلة المعقدة.', 'extended', 'B2', 'COCA'],
      ['court presentation skills', 'noun', 'مهارات العرض في المحكمة', 'Court presentation skills help experts explain findings to non-specialists.', 'تساعد مهارات العرض في المحكمة الخبراء على شرح النتائج لغير المتخصصين.', 'extended', 'B2', 'COCA'],
      ['automated fingerprint system', 'noun', 'نظام البصمات الآلي', 'An automated fingerprint system matches prints against a database.', 'يطابق نظام البصمات الآلي البصمات مع قاعدة بيانات.', 'extended', 'B2', 'COCA'],
      ['combined DNA index', 'noun', 'فهرس الحمض النووي المشترك', 'The combined DNA index stores DNA profiles from crime scenes.', 'يخزن فهرس الحمض النووي المشترك ملفات الحمض النووي من مسارح الجريمة.', 'mastery', 'C1', 'COCA'],
      ['integrated ballistic system', 'noun', 'نظام الباليستيك المتكامل', 'An integrated ballistic system links bullets to specific firearms.', 'يربط نظام الباليستيك المتكامل الرصاصات بأسلحة نارية محددة.', 'mastery', 'C1', 'COCA'],
      ['measurement uncertainty', 'noun', 'عدم اليقين في القياس', 'Measurement uncertainty quantifies the doubt in analytical results.', 'يحدد عدم اليقين في القياس الشك في النتائج التحليلية.', 'extended', 'B2', 'AWL'],
      ['proficiency test result', 'noun', 'نتيجة اختبار الكفاءة', 'A proficiency test result validates the laboratory\'s analytical competence.', 'تثبت نتيجة اختبار الكفاءة الكفاءة التحليلية للمختبر.', 'extended', 'B2', 'AWL'],
      ['interlaboratory comparison', 'noun', 'مقارنة بين المختبرات', 'An interlaboratory comparison ensures consistent results across labs.', 'تضمن المقارنة بين المختبرات نتائج متسقة عبر المختبرات.', 'mastery', 'C1', 'AWL'],
      ['method validation protocol', 'noun', 'بروتوكول التحقق من الطريقة', 'A method validation protocol confirms an analytical method works correctly.', 'يؤكد بروتوكول التحقق من الطريقة أن الطريقة التحليلية تعمل بشكل صحيح.', 'mastery', 'C1', 'AWL'],
      ['selectivity study', 'noun', 'دراسة الانتقائية', 'A selectivity study ensures the method measures only the target compound.', 'تضمن دراسة الانتقائية أن الطريقة تقيس فقط المركب المستهدف.', 'mastery', 'C1', 'AWL'],
      ['linearity study', 'noun', 'دراسة الخطية', 'A linearity study confirms proportional response across concentrations.', 'تؤكد دراسة الخطية الاستجابة التناسبية عبر التركيزات.', 'mastery', 'C1', 'AWL'],
      ['robustness study', 'noun', 'دراسة المتانة', 'A robustness study tests method performance under varied conditions.', 'تختبر دراسة المتانة أداء الطريقة في ظروف متنوعة.', 'mastery', 'C1', 'AWL'],
      ['evidence packaging protocol', 'noun', 'بروتوكول تغليف الأدلة', 'An evidence packaging protocol prevents contamination during transport.', 'يمنع بروتوكول تغليف الأدلة التلوث أثناء النقل.', 'extended', 'B2', 'COCA'],
      ['decontamination protocol', 'noun', 'بروتوكول إزالة التلوث', 'A decontamination protocol cleans equipment between cases.', 'ينظف بروتوكول إزالة التلوث المعدات بين القضايا.', 'extended', 'B2', 'COCA'],
    ];
    let r8 = await insertBatch(client, u8, 8, 32);
    console.log(`U8: ${r8} inserted`);

    // U9 Archaeology - 35 niche terms
    const u9 = [
      ['Harris matrix', 'noun', 'مصفوفة هاريس', 'A Harris matrix diagrams the sequence of archaeological deposits.', 'ترسم مصفوفة هاريس تسلسل الترسبات الأثرية.', 'mastery', 'C1', 'COCA'],
      ['single context recording', 'noun', 'تسجيل السياق الفردي', 'Single context recording documents each archaeological layer separately.', 'يوثق تسجيل السياق الفردي كل طبقة أثرية بشكل منفصل.', 'mastery', 'C1', 'COCA'],
      ['context sheet', 'noun', 'ورقة السياق', 'A context sheet records the details of each excavated layer.', 'تسجل ورقة السياق تفاصيل كل طبقة محفورة.', 'extended', 'B2', 'COCA'],
      ['section drawing', 'noun', 'رسم المقطع', 'A section drawing shows the vertical profile of an excavation.', 'يظهر رسم المقطع الملف الرأسي للتنقيب.', 'extended', 'B2', 'COCA'],
      ['finds register', 'noun', 'سجل المكتشفات', 'The finds register catalogs every artifact recovered from the site.', 'يفهرس سجل المكتشفات كل قطعة أثرية مستخرجة من الموقع.', 'extended', 'B2', 'COCA'],
      ['flotation recovery', 'noun', 'الاستخراج بالتعويم', 'Flotation recovery separates plant remains from soil samples.', 'يفصل الاستخراج بالتعويم بقايا النباتات من عينات التربة.', 'mastery', 'C1', 'COCA'],
      ['heavy residue', 'noun', 'الرواسب الثقيلة', 'Heavy residue contains bones, shells, and stone fragments.', 'تحتوي الرواسب الثقيلة على عظام وأصداف وشظايا حجرية.', 'extended', 'B2', 'COCA'],
      ['light fraction', 'noun', 'الجزء الخفيف', 'The light fraction includes seeds, charcoal, and plant fibers.', 'يشمل الجزء الخفيف البذور والفحم وألياف النبات.', 'extended', 'B2', 'COCA'],
      ['magnetic susceptibility test', 'noun', 'اختبار القابلية المغناطيسية', 'A magnetic susceptibility test detects areas of past human activity.', 'يكشف اختبار القابلية المغناطيسية مناطق النشاط البشري السابق.', 'mastery', 'C1', 'COCA'],
      ['soil micromorphology', 'noun', 'مورفولوجيا التربة الدقيقة', 'Soil micromorphology examines soil structure under a microscope.', 'تفحص مورفولوجيا التربة الدقيقة بنية التربة تحت المجهر.', 'mastery', 'C1', 'COCA'],
      ['ceramic fabric analysis', 'noun', 'تحليل نسيج الخزف', 'Ceramic fabric analysis identifies the clay and temper in pottery.', 'يحدد تحليل نسيج الخزف الطين والمواد المضافة في الفخار.', 'mastery', 'C1', 'COCA'],
      ['firing temperature', 'noun', 'درجة حرارة الحرق', 'The firing temperature affects the hardness and color of pottery.', 'تؤثر درجة حرارة الحرق على صلابة ولون الفخار.', 'extended', 'B2', 'COCA'],
      ['oxidizing atmosphere', 'noun', 'جو مؤكسد', 'An oxidizing atmosphere in the kiln produces red-colored pottery.', 'ينتج الجو المؤكسد في الفرن فخاراً أحمر اللون.', 'mastery', 'C1', 'COCA'],
      ['reducing atmosphere', 'noun', 'جو مختزل', 'A reducing atmosphere produces dark gray or black pottery.', 'ينتج الجو المختزل فخاراً رمادي داكن أو أسود.', 'mastery', 'C1', 'COCA'],
      ['surface treatment', 'noun', 'معالجة السطح', 'Surface treatment of pottery includes polishing and glazing.', 'تشمل معالجة سطح الفخار التلميع والتزجيج.', 'extended', 'B2', 'COCA'],
      ['incised decoration', 'noun', 'زخرفة محفورة', 'Incised decoration creates patterns by cutting into wet clay.', 'تصنع الزخرفة المحفورة أنماطاً بالقطع في الطين الرطب.', 'extended', 'B2', 'COCA'],
      ['stamped decoration', 'noun', 'زخرفة مختومة', 'Stamped decoration impresses patterns onto pottery surfaces.', 'تطبع الزخرفة المختومة أنماطاً على أسطح الفخار.', 'extended', 'B2', 'COCA'],
      ['vitrification point', 'noun', 'نقطة التزجج', 'The vitrification point is when clay becomes glass-like at high temperature.', 'نقطة التزجج هي عندما يصبح الطين زجاجياً في درجة حرارة عالية.', 'mastery', 'C1', 'COCA'],
      ['total station survey', 'noun', 'مسح المحطة الكلية', 'A total station survey records precise three-dimensional coordinates.', 'يسجل مسح المحطة الكلية إحداثيات ثلاثية الأبعاد دقيقة.', 'extended', 'B2', 'COCA'],
      ['differential GPS', 'noun', 'نظام تحديد المواقع التفاضلي', 'Differential GPS provides centimeter-level accuracy for mapping sites.', 'يوفر نظام تحديد المواقع التفاضلي دقة على مستوى السنتيمتر لرسم خرائط المواقع.', 'extended', 'B2', 'COCA'],
      ['photogrammetry technique', 'noun', 'تقنية التصوير المساحي', 'Photogrammetry technique creates 3D models from overlapping photographs.', 'تنشئ تقنية التصوير المساحي نماذج ثلاثية الأبعاد من الصور المتراكبة.', 'extended', 'B2', 'COCA'],
      ['LiDAR survey', 'noun', 'مسح الليدار', 'A LiDAR survey reveals hidden structures beneath forest canopy.', 'يكشف مسح الليدار الهياكل المخفية تحت غطاء الغابة.', 'extended', 'B2', 'COCA'],
      ['multispectral imaging', 'noun', 'التصوير متعدد الأطياف', 'Multispectral imaging detects buried features invisible to the eye.', 'يكشف التصوير متعدد الأطياف المعالم المدفونة غير المرئية للعين.', 'mastery', 'C1', 'COCA'],
      ['crop mark', 'noun', 'علامة المحصول', 'A crop mark reveals buried walls through differential plant growth.', 'تكشف علامة المحصول الجدران المدفونة من خلال نمو النبات التفاضلي.', 'extended', 'B2', 'COCA'],
      ['soil mark', 'noun', 'علامة التربة', 'A soil mark shows disturbed ground visible from aerial photographs.', 'تظهر علامة التربة الأرض المضطربة المرئية من الصور الجوية.', 'extended', 'B2', 'COCA'],
      ['ring ditch', 'noun', 'خندق دائري', 'A ring ditch indicates a plowed-out burial mound.', 'يشير الخندق الدائري إلى تل دفن محروث.', 'mastery', 'C1', 'COCA'],
      ['causewayed enclosure', 'noun', 'حظيرة ذات ممرات', 'A causewayed enclosure is a Neolithic ceremonial earthwork.', 'الحظيرة ذات الممرات هي عمل ترابي احتفالي من العصر الحجري الحديث.', 'mastery', 'C1', 'COCA'],
      ['hillfort', 'noun', 'حصن تلي', 'A hillfort is a fortified hilltop settlement from the Iron Age.', 'الحصن التلي هو مستوطنة محصنة على قمة تل من العصر الحديدي.', 'extended', 'B2', 'COCA'],
      ['crannog', 'noun', 'كرانوغ', 'A crannog is an artificial island dwelling built in a lake.', 'الكرانوغ هو مسكن جزيرة اصطناعية مبنية في بحيرة.', 'mastery', 'C1', 'COCA'],
      ['souterrain', 'noun', 'سوتيران', 'A souterrain is an underground passage associated with ancient settlements.', 'السوتيران هو ممر تحت الأرض مرتبط بالمستوطنات القديمة.', 'mastery', 'C1', 'COCA'],
      ['chinampas', 'noun', 'تشينامباس', 'Chinampas are floating gardens used by the Aztecs for agriculture.', 'التشينامباس هي حدائق عائمة استخدمها الأزتيك للزراعة.', 'mastery', 'C1', 'COCA'],
      ['qanat', 'noun', 'قناة', 'A qanat is an underground water channel used in arid regions.', 'القناة هي قناة مياه تحت الأرض تستخدم في المناطق الجافة.', 'extended', 'B2', 'COCA'],
      ['fire setting technique', 'noun', 'تقنية الإشعال', 'Fire setting technique cracked rock faces for ancient mining.', 'كسرت تقنية الإشعال واجهات الصخور للتعدين القديم.', 'mastery', 'C1', 'COCA'],
      ['iron bloomery', 'noun', 'فرن حديد بدائي', 'An iron bloomery produced wrought iron from ore.', 'أنتج فرن الحديد البدائي الحديد المطاوع من الخام.', 'mastery', 'C1', 'COCA'],
      ['obsidian sourcing', 'noun', 'تتبع مصدر السبج', 'Obsidian sourcing traces volcanic glass to its geological origin.', 'يتتبع تتبع مصدر السبج الزجاج البركاني إلى أصله الجيولوجي.', 'mastery', 'C1', 'COCA'],
    ];
    let r9 = await insertBatch(client, u9, 9, 32);
    console.log(`U9: ${r9} inserted`);

    const total = await client.query('SELECT COUNT(*) AS total FROM vocab_staging_l4');
    console.log('\nTotal staged:', total.rows[0].total);
    const perUnit = await client.query('SELECT recommended_unit, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit');
    perUnit.rows.forEach(r => console.log('  U' + r.recommended_unit + ':', r.cnt));
  } finally { client.release(); await pool.end(); }
}
run().catch(e => { console.error(e); process.exit(1); });
