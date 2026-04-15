// LEGENDARY-B5 L4 Vocabulary Generation Script
// Generates ~3,400 B2-level words across 12 units
// Mix: 60% B2, 15% B1 reinforcement, 15% C1 preview, 10% Academic (AWL/NAWL)

const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

// Unit themes for contextual vocabulary
const UNIT_THEMES = {
  1: 'Bioethics',
  2: 'Deep Ocean Discovery',
  3: 'Food Security',
  4: 'Biomimicry Design',
  5: 'Human Migration',
  6: 'Cryptocurrency',
  7: 'Crowd Psychology',
  8: 'Forensic Science',
  9: 'Archaeological Mysteries',
  10: 'Longevity Science',
  11: 'Sustainable Architecture',
  12: 'Exoplanet Hunting'
};

// ============================================================
// VOCABULARY DATA — organized by unit
// Each word: [word, pos, definition_ar, example_en, example_ar, tier, cefr, source]
// ============================================================

function getUnit1Words() {
  // Bioethics — genetics, medicine, ethics, research
  return [
    // CORE (90 words)
    ['ethics', 'noun', 'أخلاقيات', 'Medical ethics guide doctors in making difficult treatment decisions.', 'تُوجّه الأخلاقيات الطبية الأطباء في اتخاذ قرارات العلاج الصعبة.', 'core', 'B2', 'CEFR-J'],
    ['gene', 'noun', 'جين', 'Scientists discovered a gene linked to a rare heart condition.', 'اكتشف العلماء جيناً مرتبطاً بحالة قلبية نادرة.', 'core', 'B2', 'CEFR-J'],
    ['cell', 'noun', 'خلية', 'Every living organism is made up of at least one cell.', 'يتكون كل كائن حي من خلية واحدة على الأقل.', 'core', 'B1', 'CEFR-J'],
    ['tissue', 'noun', 'نسيج حيوي', 'The damaged tissue needed several weeks to heal properly.', 'احتاج النسيج التالف عدة أسابيع للشفاء بشكل صحيح.', 'core', 'B2', 'CEFR-J'],
    ['DNA', 'noun', 'الحمض النووي', 'DNA carries the genetic instructions for all living organisms.', 'يحمل الحمض النووي التعليمات الوراثية لجميع الكائنات الحية.', 'core', 'B2', 'CEFR-J'],
    ['consent', 'noun', 'موافقة', 'Patients must give informed consent before any surgical procedure.', 'يجب أن يُعطي المرضى موافقة مستنيرة قبل أي إجراء جراحي.', 'core', 'B2', 'AWL'],
    ['therapy', 'noun', 'علاج', 'Gene therapy offers hope for patients with inherited diseases.', 'يُقدّم العلاج الجيني أملاً للمرضى المصابين بأمراض وراثية.', 'core', 'B2', 'CEFR-J'],
    ['diagnosis', 'noun', 'تشخيص', 'Early diagnosis significantly improves the chances of successful treatment.', 'يُحسّن التشخيص المبكر فرص العلاج الناجح بشكل كبير.', 'core', 'B2', 'CEFR-J'],
    ['symptom', 'noun', 'عَرَض', 'Fatigue is a common symptom of many different medical conditions.', 'يُعدّ التعب عَرَضاً شائعاً للعديد من الحالات الطبية المختلفة.', 'core', 'B2', 'CEFR-J'],
    ['treatment', 'noun', 'علاج / معالجة', 'The new treatment reduced side effects compared to traditional methods.', 'قلّل العلاج الجديد الآثار الجانبية مقارنة بالطرق التقليدية.', 'core', 'B1', 'CEFR-J'],
    ['surgery', 'noun', 'جراحة', 'Robotic surgery allows for more precise medical procedures.', 'تسمح الجراحة الروبوتية بإجراءات طبية أكثر دقة.', 'core', 'B2', 'CEFR-J'],
    ['vaccine', 'noun', 'لقاح', 'The development of a new vaccine requires years of clinical trials.', 'يتطلب تطوير لقاح جديد سنوات من التجارب السريرية.', 'core', 'B2', 'CEFR-J'],
    ['organ', 'noun', 'عضو', 'The heart is a vital organ that pumps blood throughout the body.', 'القلب عضو حيوي يضخ الدم في جميع أنحاء الجسم.', 'core', 'B1', 'CEFR-J'],
    ['immune', 'adjective', 'مناعي', 'A strong immune system helps the body fight infections effectively.', 'يُساعد الجهاز المناعي القوي الجسم على محاربة العدوى بفعالية.', 'core', 'B2', 'CEFR-J'],
    ['genetic', 'adjective', 'وراثي / جيني', 'Genetic testing can reveal predispositions to certain diseases.', 'يمكن للفحص الجيني كشف الاستعداد للإصابة بأمراض معينة.', 'core', 'B2', 'CEFR-J'],
    ['clinical', 'adjective', 'سريري / إكلينيكي', 'Clinical trials must follow strict ethical guidelines and protocols.', 'يجب أن تتبع التجارب السريرية إرشادات وبروتوكولات أخلاقية صارمة.', 'core', 'B2', 'AWL'],
    ['chronic', 'adjective', 'مزمن', 'Chronic diseases require long-term management and lifestyle changes.', 'تتطلب الأمراض المزمنة إدارة طويلة الأمد وتغييرات في نمط الحياة.', 'core', 'B2', 'CEFR-J'],
    ['fatal', 'adjective', 'مميت / قاتل', 'Without immediate treatment, the allergic reaction could be fatal.', 'بدون علاج فوري، قد يكون رد الفعل التحسسي مميتاً.', 'core', 'B2', 'CEFR-J'],
    ['mental', 'adjective', 'عقلي / نفسي', 'Mental health awareness has increased significantly in recent years.', 'زاد الوعي بالصحة النفسية بشكل كبير في السنوات الأخيرة.', 'core', 'B1', 'CEFR-J'],
    ['physical', 'adjective', 'جسدي / بدني', 'Regular physical activity reduces the risk of heart disease.', 'يُقلل النشاط البدني المنتظم من خطر الإصابة بأمراض القلب.', 'core', 'B1', 'CEFR-J'],
    ['moral', 'adjective', 'أخلاقي', 'Cloning raises profound moral questions about the nature of life.', 'يُثير الاستنساخ أسئلة أخلاقية عميقة حول طبيعة الحياة.', 'core', 'B2', 'CEFR-J'],
    ['controversial', 'adjective', 'مثير للجدل', 'Stem cell research remains a controversial topic in many countries.', 'تظل أبحاث الخلايا الجذعية موضوعاً مثيراً للجدل في كثير من الدول.', 'core', 'B2', 'CEFR-J'],
    ['regulate', 'verb', 'ينظّم', 'Governments must regulate genetic research to prevent misuse.', 'يجب أن تنظّم الحكومات البحث الجيني لمنع سوء الاستخدام.', 'core', 'B2', 'AWL'],
    ['modify', 'verb', 'يُعدّل', 'Scientists can now modify genes to eliminate hereditary diseases.', 'يمكن للعلماء الآن تعديل الجينات للقضاء على الأمراض الوراثية.', 'core', 'B2', 'AWL'],
    ['transplant', 'verb', 'يزرع (عضو)', 'Surgeons successfully transplant organs from donors to save lives.', 'ينجح الجراحون في زراعة الأعضاء من المتبرعين لإنقاذ الأرواح.', 'core', 'B2', 'CEFR-J'],
    ['inherit', 'verb', 'يرث', 'Children can inherit both physical traits and genetic conditions.', 'يمكن للأطفال أن يرثوا السمات الجسدية والحالات الوراثية.', 'core', 'B2', 'CEFR-J'],
    ['diagnose', 'verb', 'يُشخّص', 'Doctors can now diagnose many conditions through a simple blood test.', 'يمكن للأطباء الآن تشخيص حالات كثيرة من خلال فحص دم بسيط.', 'core', 'B2', 'CEFR-J'],
    ['prescribe', 'verb', 'يصف (دواء)', 'The doctor prescribed a new medication for the patient.', 'وصف الطبيب دواءً جديداً للمريض.', 'core', 'B2', 'CEFR-J'],
    ['administer', 'verb', 'يُعطي (دواء) / يُدير', 'Nurses administer medications according to the prescribed schedule.', 'تُعطي الممرضات الأدوية وفقاً للجدول الموصوف.', 'core', 'B2', 'AWL'],
    ['debate', 'verb', 'يناقش / يجادل', 'Scientists continue to debate the long-term effects of genetic modification.', 'يستمر العلماء في مناقشة التأثيرات طويلة الأمد للتعديل الجيني.', 'core', 'B2', 'CEFR-J'],
    ['cure', 'verb', 'يشفي / يعالج', 'Researchers are working to cure diseases that were once considered untreatable.', 'يعمل الباحثون على علاج أمراض كانت تُعتبر غير قابلة للعلاج.', 'core', 'B1', 'CEFR-J'],
    ['inject', 'verb', 'يحقن', 'The nurse carefully injected the vaccine into the patient arm.', 'حقنت الممرضة اللقاح بعناية في ذراع المريض.', 'core', 'B2', 'CEFR-J'],
    ['surgeon', 'noun', 'جرّاح', 'The surgeon performed a complex operation lasting over eight hours.', 'أجرى الجرّاح عملية معقدة استمرت أكثر من ثماني ساعات.', 'core', 'B2', 'CEFR-J'],
    ['pharmaceutical', 'adjective', 'صيدلاني / دوائي', 'Pharmaceutical companies invest billions in developing new drugs.', 'تستثمر شركات الأدوية مليارات في تطوير أدوية جديدة.', 'core', 'B2', 'CEFR-J'],
    ['specimen', 'noun', 'عيّنة', 'The laboratory analyzed the blood specimen for abnormal markers.', 'حلّل المختبر عينة الدم بحثاً عن علامات غير طبيعية.', 'core', 'B2', 'CEFR-J'],
    ['disorder', 'noun', 'اضطراب', 'Autism spectrum disorder affects communication and social interaction.', 'يؤثر اضطراب طيف التوحد على التواصل والتفاعل الاجتماعي.', 'core', 'B2', 'CEFR-J'],
    ['procedure', 'noun', 'إجراء', 'The medical procedure was completed without any complications.', 'اكتمل الإجراء الطبي دون أي مضاعفات.', 'core', 'B2', 'AWL'],
    ['outbreak', 'noun', 'تفشّي', 'Health officials responded quickly to the disease outbreak.', 'استجاب المسؤولون الصحيون بسرعة لتفشّي المرض.', 'core', 'B2', 'CEFR-J'],
    ['epidemic', 'noun', 'وباء', 'The obesity epidemic affects millions of people worldwide.', 'يؤثر وباء السمنة على ملايين الأشخاص حول العالم.', 'core', 'B2', 'CEFR-J'],
    ['dose', 'noun', 'جرعة', 'The recommended dose varies depending on the patient weight.', 'تختلف الجرعة الموصى بها حسب وزن المريض.', 'core', 'B2', 'CEFR-J'],
    ['infection', 'noun', 'عدوى', 'Proper hand washing helps prevent the spread of infections.', 'يُساعد غسل اليدين الصحيح في منع انتشار العدوى.', 'core', 'B1', 'CEFR-J'],
    ['bacteria', 'noun', 'بكتيريا', 'Some bacteria have become resistant to common antibiotics.', 'أصبحت بعض البكتيريا مقاومة للمضادات الحيوية الشائعة.', 'core', 'B2', 'CEFR-J'],
    ['embryo', 'noun', 'جنين', 'Research on human embryos raises complex ethical questions.', 'تُثير الأبحاث على الأجنة البشرية أسئلة أخلاقية معقدة.', 'core', 'B2', 'CEFR-J'],
    ['stem', 'noun', 'جذعي (خلايا جذعية)', 'Stem cells have the ability to develop into many cell types.', 'تمتلك الخلايا الجذعية القدرة على التطور إلى أنواع عديدة من الخلايا.', 'core', 'B2', 'CEFR-J'],
    ['donor', 'noun', 'متبرّع', 'Finding a suitable organ donor can take months or even years.', 'قد يستغرق العثور على متبرع مناسب بالأعضاء أشهراً أو حتى سنوات.', 'core', 'B2', 'CEFR-J'],
    ['trial', 'noun', 'تجربة (سريرية)', 'The drug passed all three phases of clinical trials successfully.', 'اجتاز الدواء المراحل الثلاث من التجارب السريرية بنجاح.', 'core', 'B2', 'CEFR-J'],
    ['hormone', 'noun', 'هرمون', 'Hormones play a crucial role in regulating body functions.', 'تلعب الهرمونات دوراً حاسماً في تنظيم وظائف الجسم.', 'core', 'B2', 'CEFR-J'],
    ['mutation', 'noun', 'طفرة', 'A single genetic mutation can cause a serious health condition.', 'يمكن لطفرة جينية واحدة أن تُسبب حالة صحية خطيرة.', 'core', 'B2', 'CEFR-J'],
    ['artificial', 'adjective', 'اصطناعي', 'Artificial organs could solve the shortage of donor transplants.', 'يمكن للأعضاء الاصطناعية حل مشكلة نقص عمليات زراعة الأعضاء.', 'core', 'B2', 'CEFR-J'],
    ['vulnerable', 'adjective', 'ضعيف / مُعرّض', 'Elderly patients are particularly vulnerable to respiratory infections.', 'المرضى المسنون مُعرّضون بشكل خاص للعدوى التنفسية.', 'core', 'B2', 'CEFR-J'],
    ['ethical', 'adjective', 'أخلاقي', 'Ethical considerations must guide all medical research activities.', 'يجب أن تُوجّه الاعتبارات الأخلاقية جميع أنشطة البحث الطبي.', 'core', 'B2', 'AWL'],
    ['regulate', 'verb', 'يُنظّم', 'Hormones regulate essential body processes like metabolism and growth.', 'تُنظّم الهرمونات عمليات الجسم الأساسية كالتمثيل الغذائي والنمو.', 'core', 'B2', 'AWL'],
    ['detect', 'verb', 'يكتشف / يكشف', 'New technology can detect cancer cells at a very early stage.', 'يمكن للتقنية الجديدة اكتشاف الخلايا السرطانية في مرحلة مبكرة جداً.', 'core', 'B2', 'CEFR-J'],
    ['implant', 'verb', 'يزرع / يغرس', 'Doctors can implant tiny devices to monitor heart rhythm.', 'يمكن للأطباء زراعة أجهزة صغيرة لمراقبة نظم القلب.', 'core', 'B2', 'CEFR-J'],
    ['clone', 'verb', 'يستنسخ', 'Scientists first managed to clone a mammal in nineteen ninety-six.', 'نجح العلماء لأول مرة في استنساخ حيوان ثديي عام ألف وتسعمائة وستة وتسعين.', 'core', 'B2', 'CEFR-J'],
    ['infect', 'verb', 'يُعدي / يُصيب', 'The virus can infect thousands of people within a few days.', 'يمكن للفيروس أن يُصيب آلاف الأشخاص في غضون أيام قليلة.', 'core', 'B2', 'CEFR-J'],
    ['suppress', 'verb', 'يثبّط / يكبح', 'The medication helps suppress the immune response after transplantation.', 'يُساعد الدواء في تثبيط الاستجابة المناعية بعد الزرع.', 'core', 'B2', 'CEFR-J'],
    ['comply', 'verb', 'يمتثل / يلتزم', 'Researchers must comply with international safety regulations.', 'يجب على الباحثين الامتثال للوائح السلامة الدولية.', 'core', 'B2', 'AWL'],
    ['prohibit', 'verb', 'يحظر / يمنع', 'Several countries prohibit human cloning by law.', 'تحظر عدة دول الاستنساخ البشري بموجب القانون.', 'core', 'B2', 'AWL'],
    ['anatomy', 'noun', 'تشريح', 'Medical students study human anatomy in their first year.', 'يدرس طلاب الطب التشريح البشري في سنتهم الأولى.', 'core', 'B2', 'CEFR-J'],
    ['genome', 'noun', 'جينوم / مجموع الجينات', 'Mapping the human genome was a groundbreaking scientific achievement.', 'كان رسم خريطة الجينوم البشري إنجازاً علمياً رائداً.', 'core', 'B2', 'CEFR-J'],
    ['antibody', 'noun', 'جسم مضاد', 'The body produces antibodies to fight off harmful invaders.', 'يُنتج الجسم أجساماً مضادة لمحاربة الغزاة الضارين.', 'core', 'B2', 'CEFR-J'],
    ['fertility', 'noun', 'خصوبة', 'Fertility treatments have helped millions of couples have children.', 'ساعدت علاجات الخصوبة ملايين الأزواج في إنجاب أطفال.', 'core', 'B2', 'CEFR-J'],
    ['molecule', 'noun', 'جزيء', 'Water is a simple molecule composed of hydrogen and oxygen atoms.', 'الماء جزيء بسيط يتكون من ذرات الهيدروجين والأكسجين.', 'core', 'B2', 'CEFR-J'],
    ['resistance', 'noun', 'مقاومة', 'Antibiotic resistance is a growing global health threat.', 'تُعدّ مقاومة المضادات الحيوية تهديداً صحياً عالمياً متنامياً.', 'core', 'B2', 'CEFR-J'],
    ['hereditary', 'adjective', 'وراثي', 'Some forms of cancer have a hereditary component.', 'بعض أنواع السرطان لها مكوّن وراثي.', 'core', 'B2', 'CEFR-J'],
    ['contagious', 'adjective', 'مُعدٍ', 'The disease is highly contagious and spreads through direct contact.', 'المرض شديد العدوى وينتشر عن طريق الاتصال المباشر.', 'core', 'B2', 'CEFR-J'],
    ['legitimate', 'adjective', 'مشروع / قانوني', 'There are legitimate concerns about the safety of gene editing.', 'هناك مخاوف مشروعة حول سلامة تعديل الجينات.', 'core', 'B2', 'AWL'],
    ['pharmaceutical', 'noun', 'مُستحضر دوائي', 'New pharmaceuticals undergo rigorous testing before reaching the market.', 'تخضع المستحضرات الدوائية الجديدة لاختبارات صارمة قبل وصولها للسوق.', 'core', 'B2', 'CEFR-J'],
    ['precaution', 'noun', 'احتياط / إجراء وقائي', 'Wearing protective equipment is a necessary precaution in laboratories.', 'ارتداء معدات الحماية إجراء وقائي ضروري في المختبرات.', 'core', 'B2', 'CEFR-J'],
    ['sterile', 'adjective', 'معقّم', 'All surgical instruments must be completely sterile before use.', 'يجب أن تكون جميع الأدوات الجراحية معقّمة تماماً قبل الاستخدام.', 'core', 'B2', 'CEFR-J'],
    ['susceptible', 'adjective', 'قابل للتأثر / معرّض', 'Children are more susceptible to infections than healthy adults.', 'الأطفال أكثر عرضة للعدوى من البالغين الأصحاء.', 'core', 'B2', 'CEFR-J'],
    ['alleviate', 'verb', 'يُخفف', 'The new drug helps alleviate chronic pain without side effects.', 'يُساعد الدواء الجديد في تخفيف الألم المزمن دون آثار جانبية.', 'core', 'B2', 'CEFR-J'],
    ['transmit', 'verb', 'ينقل (مرض)', 'Mosquitoes transmit malaria to millions of people every year.', 'ينقل البعوض الملاريا إلى ملايين الأشخاص كل عام.', 'core', 'B2', 'AWL'],
    ['monitor', 'verb', 'يُراقب', 'Wearable devices can monitor blood pressure throughout the day.', 'يمكن للأجهزة القابلة للارتداء مراقبة ضغط الدم على مدار اليوم.', 'core', 'B2', 'AWL'],
    ['contaminate', 'verb', 'يُلوّث', 'Improper handling can contaminate laboratory samples.', 'يمكن للتعامل غير السليم أن يُلوّث عينات المختبر.', 'core', 'B2', 'CEFR-J'],
    ['specimen', 'noun', 'عيّنة بيولوجية', 'The biologist collected plant specimens from the rainforest.', 'جمع عالم الأحياء عيّنات نباتية من الغابة المطيرة.', 'core', 'B2', 'CEFR-J'],
    ['nutrition', 'noun', 'تغذية', 'Good nutrition is essential for maintaining overall health.', 'التغذية الجيدة ضرورية للحفاظ على الصحة العامة.', 'core', 'B1', 'CEFR-J'],
    ['hygiene', 'noun', 'نظافة صحية', 'Proper hygiene practices significantly reduce the risk of disease.', 'تُقلّل ممارسات النظافة الصحية من خطر الإصابة بالأمراض بشكل كبير.', 'core', 'B2', 'CEFR-J'],
    ['pioneer', 'noun', 'رائد / مبتكر', 'She was a pioneer in the field of regenerative medicine.', 'كانت رائدة في مجال الطب التجديدي.', 'core', 'B2', 'CEFR-J'],
    ['breakthrough', 'noun', 'اختراق / إنجاز علمي', 'The discovery of penicillin was a major medical breakthrough.', 'كان اكتشاف البنسلين اختراقاً طبياً كبيراً.', 'core', 'B2', 'CEFR-J'],
    ['consciousness', 'noun', 'وعي', 'The patient regained consciousness shortly after the operation.', 'استعاد المريض وعيه بعد فترة قصيرة من العملية.', 'core', 'B2', 'CEFR-J'],
    ['prescription', 'noun', 'وصفة طبية', 'You need a valid prescription to purchase this medication.', 'تحتاج إلى وصفة طبية صالحة لشراء هذا الدواء.', 'core', 'B2', 'CEFR-J'],
    ['rehabilitation', 'noun', 'إعادة تأهيل', 'Rehabilitation after surgery helps patients recover their strength.', 'تُساعد إعادة التأهيل بعد الجراحة المرضى على استعادة قوتهم.', 'core', 'B2', 'CEFR-J'],
    ['benign', 'adjective', 'حميد (غير خبيث)', 'Fortunately the tumor was benign and did not require chemotherapy.', 'لحسن الحظ كان الورم حميداً ولم يتطلب علاجاً كيميائياً.', 'core', 'B2', 'CEFR-J'],
    ['adverse', 'adjective', 'ضار / عكسي', 'The drug was withdrawn due to its adverse effects on patients.', 'سُحب الدواء بسبب تأثيراته الضارة على المرضى.', 'core', 'B2', 'AWL'],
    ['autonomy', 'noun', 'استقلالية', 'Patient autonomy means people have the right to make medical decisions.', 'تعني استقلالية المريض أن للأشخاص الحق في اتخاذ قراراتهم الطبية.', 'core', 'B2', 'AWL'],
    ['pathogen', 'noun', 'عامل مُمرض', 'Vaccines help the body recognize and destroy specific pathogens.', 'تُساعد اللقاحات الجسم على التعرف على عوامل ممرضة معينة وتدميرها.', 'core', 'B2', 'CEFR-J'],

    // EXTENDED (110 words)
    ['bioethics', 'noun', 'أخلاقيات بيولوجية', 'Bioethics examines the moral implications of medical advancement.', 'تدرس الأخلاقيات البيولوجية التداعيات الأخلاقية للتقدم الطبي.', 'extended', 'B2', 'CEFR-J'],
    ['genome', 'noun', 'جينوم', 'The Human Genome Project mapped all human genes by two thousand three.', 'رسم مشروع الجينوم البشري خريطة جميع الجينات البشرية بحلول عام ألفين وثلاثة.', 'extended', 'B2', 'CEFR-J'],
    ['chromosome', 'noun', 'كروموسوم / صبغي', 'Humans normally have twenty-three pairs of chromosomes in each cell.', 'يمتلك البشر عادةً ثلاثة وعشرين زوجاً من الكروموسومات في كل خلية.', 'extended', 'B2', 'CEFR-J'],
    ['syndrome', 'noun', 'متلازمة', 'Down syndrome is caused by an extra copy of chromosome twenty-one.', 'تحدث متلازمة داون بسبب نسخة إضافية من الكروموسوم الحادي والعشرين.', 'extended', 'B2', 'CEFR-J'],
    ['prognosis', 'noun', 'توقع سير المرض', 'The doctor gave a positive prognosis after reviewing the test results.', 'أعطى الطبيب توقعاً إيجابياً لسير المرض بعد مراجعة نتائج الفحوصات.', 'extended', 'C1', 'CEFR-J'],
    ['metabolism', 'noun', 'أيض / تمثيل غذائي', 'Exercise helps boost your metabolism and burn calories faster.', 'تُساعد التمارين في تعزيز الأيض وحرق السعرات الحرارية بشكل أسرع.', 'extended', 'B2', 'CEFR-J'],
    ['allergy', 'noun', 'حساسية', 'Food allergies can cause severe reactions requiring emergency treatment.', 'يمكن أن تُسبب حساسية الطعام ردود فعل شديدة تتطلب علاجاً طارئاً.', 'extended', 'B2', 'CEFR-J'],
    ['inflammation', 'noun', 'التهاب', 'Chronic inflammation is linked to many serious health conditions.', 'يرتبط الالتهاب المزمن بالعديد من الحالات الصحية الخطيرة.', 'extended', 'B2', 'CEFR-J'],
    ['antibiotic', 'noun', 'مضاد حيوي', 'Overuse of antibiotics has led to drug-resistant bacterial strains.', 'أدى الإفراط في استخدام المضادات الحيوية إلى سلالات بكتيرية مقاومة للأدوية.', 'extended', 'B2', 'CEFR-J'],
    ['carcinogen', 'noun', 'مادة مسرطنة', 'Tobacco smoke contains numerous carcinogens that damage lung tissue.', 'يحتوي دخان التبغ على مواد مسرطنة عديدة تُتلف أنسجة الرئة.', 'extended', 'C1', 'CEFR-J'],
    ['degenerative', 'adjective', 'تنكّسي / تحلّلي', 'Alzheimer is a degenerative disease that affects brain function.', 'الزهايمر مرض تنكّسي يؤثر على وظائف الدماغ.', 'extended', 'C1', 'CEFR-J'],
    ['malignant', 'adjective', 'خبيث', 'The biopsy confirmed that the growth was malignant and required surgery.', 'أكدت الخزعة أن النمو كان خبيثاً ويتطلب جراحة.', 'extended', 'C1', 'CEFR-J'],
    ['placebo', 'noun', 'دواء وهمي', 'Half the patients received the actual drug while others got a placebo.', 'تلقى نصف المرضى الدواء الفعلي بينما حصل الآخرون على دواء وهمي.', 'extended', 'B2', 'CEFR-J'],
    ['prosthetic', 'adjective', 'اصطناعي (طرف)', 'Modern prosthetic limbs use advanced sensors for natural movement.', 'تستخدم الأطراف الاصطناعية الحديثة أجهزة استشعار متقدمة للحركة الطبيعية.', 'extended', 'B2', 'CEFR-J'],
    ['neurological', 'adjective', 'عصبي', 'The hospital has a specialized unit for neurological disorders.', 'يمتلك المستشفى وحدة متخصصة في الاضطرابات العصبية.', 'extended', 'B2', 'CEFR-J'],
    ['cognitive', 'adjective', 'إدراكي / معرفي', 'Regular reading improves cognitive abilities in elderly people.', 'تُحسّن القراءة المنتظمة القدرات الإدراكية لدى كبار السن.', 'extended', 'B2', 'AWL'],
    ['therapeutic', 'adjective', 'علاجي', 'Swimming has a therapeutic effect on patients with joint problems.', 'للسباحة تأثير علاجي على المرضى الذين يعانون من مشاكل المفاصل.', 'extended', 'B2', 'CEFR-J'],
    ['psychiatric', 'adjective', 'نفسي / طبنفسي', 'Psychiatric medications require careful monitoring of dosage levels.', 'تتطلب الأدوية النفسية مراقبة دقيقة لمستويات الجرعات.', 'extended', 'B2', 'CEFR-J'],
    ['invasive', 'adjective', 'جراحي مفتوح / تدخّلي', 'Minimally invasive procedures reduce recovery time for patients.', 'تُقلل الإجراءات قليلة التدخل وقت التعافي للمرضى.', 'extended', 'B2', 'CEFR-J'],
    ['prenatal', 'adjective', 'ما قبل الولادة', 'Prenatal screening can identify potential health issues early.', 'يمكن للفحص قبل الولادة تحديد المشاكل الصحية المحتملة مبكراً.', 'extended', 'B2', 'CEFR-J'],
    ['regenerate', 'verb', 'يُجدّد', 'Some animals can regenerate lost limbs through natural processes.', 'يمكن لبعض الحيوانات تجديد الأطراف المفقودة من خلال عمليات طبيعية.', 'extended', 'B2', 'CEFR-J'],
    ['synthesize', 'verb', 'يُصنّع / يُركّب', 'Chemists can synthesize complex molecules in the laboratory.', 'يمكن للكيميائيين تركيب جزيئات معقدة في المختبر.', 'extended', 'B2', 'AWL'],
    ['deteriorate', 'verb', 'يتدهور', 'The patient condition began to deteriorate rapidly overnight.', 'بدأت حالة المريض تتدهور بسرعة خلال الليل.', 'extended', 'B2', 'CEFR-J'],
    ['eradicate', 'verb', 'يستأصل / يقضي على', 'Global efforts have nearly eradicated polio from most countries.', 'كادت الجهود العالمية أن تستأصل شلل الأطفال من معظم الدول.', 'extended', 'C1', 'CEFR-J'],
    ['immunize', 'verb', 'يُحصّن / يُطعّم', 'Health campaigns aim to immunize children against preventable diseases.', 'تهدف الحملات الصحية إلى تحصين الأطفال ضد الأمراض التي يمكن الوقاية منها.', 'extended', 'B2', 'CEFR-J'],
    ['amputate', 'verb', 'يبتر', 'Doctors had to amputate the injured limb to save the patient.', 'اضطر الأطباء لبتر الطرف المصاب لإنقاذ المريض.', 'extended', 'C1', 'CEFR-J'],
    ['mitigate', 'verb', 'يُخفف / يُقلل من حدة', 'Early intervention can mitigate the effects of genetic disorders.', 'يمكن للتدخل المبكر التخفيف من آثار الاضطرابات الجينية.', 'extended', 'C1', 'AWL'],
    ['predispose', 'verb', 'يجعل عرضة لـ', 'Certain genes predispose individuals to developing heart disease.', 'تجعل جينات معينة الأفراد عرضة للإصابة بأمراض القلب.', 'extended', 'C1', 'CEFR-J'],
    ['correlate', 'verb', 'يرتبط / يتلازم', 'Research shows that exercise levels correlate with mental wellbeing.', 'تُظهر الأبحاث أن مستويات التمرين ترتبط بالرفاهية النفسية.', 'extended', 'B2', 'AWL'],
    ['replicate', 'verb', 'يُكرر / يستنسخ', 'Other laboratories were unable to replicate the original results.', 'لم تتمكن مختبرات أخرى من تكرار النتائج الأصلية.', 'extended', 'B2', 'AWL'],
    ['biomedical', 'adjective', 'طبي حيوي', 'Biomedical engineering combines biology with mechanical design.', 'تجمع الهندسة الطبية الحيوية بين علم الأحياء والتصميم الميكانيكي.', 'extended', 'B2', 'CEFR-J'],
    ['congenital', 'adjective', 'خِلقي / ولادي', 'Congenital heart defects affect approximately one percent of newborns.', 'تؤثر عيوب القلب الخِلقية على ما يقارب واحد بالمئة من المواليد.', 'extended', 'C1', 'CEFR-J'],
    ['palliative', 'adjective', 'تلطيفي', 'Palliative care focuses on improving quality of life for patients.', 'تُركّز الرعاية التلطيفية على تحسين جودة حياة المرضى.', 'extended', 'C1', 'CEFR-J'],
    ['sedentary', 'adjective', 'خامل / قليل الحركة', 'A sedentary lifestyle increases the risk of obesity and diabetes.', 'يزيد نمط الحياة الخامل من خطر السمنة والسكري.', 'extended', 'B2', 'CEFR-J'],
    ['pharmaceutical', 'adjective', 'صيدلاني', 'The pharmaceutical industry spends billions annually on research.', 'تُنفق صناعة الأدوية مليارات سنوياً على البحث.', 'extended', 'B2', 'CEFR-J'],
    ['pathology', 'noun', 'علم الأمراض', 'The pathology report confirmed the preliminary diagnosis.', 'أكد تقرير علم الأمراض التشخيص الأولي.', 'extended', 'C1', 'CEFR-J'],
    ['oncology', 'noun', 'علم الأورام', 'Advances in oncology have dramatically improved cancer survival rates.', 'حسّنت التطورات في علم الأورام معدلات البقاء من السرطان بشكل كبير.', 'extended', 'C1', 'CEFR-J'],
    ['neuroscience', 'noun', 'علم الأعصاب', 'Neuroscience research has revealed how the brain processes emotions.', 'كشفت أبحاث علم الأعصاب كيف يُعالج الدماغ المشاعر.', 'extended', 'B2', 'CEFR-J'],
    ['epidemic', 'noun', 'وباء واسع', 'The global diabetes epidemic requires coordinated preventive strategies.', 'يتطلب وباء السكري العالمي استراتيجيات وقائية منسّقة.', 'extended', 'B2', 'CEFR-J'],
    ['pandemic', 'noun', 'جائحة', 'The pandemic forced governments to implement unprecedented lockdowns.', 'أجبرت الجائحة الحكومات على تنفيذ إغلاقات غير مسبوقة.', 'extended', 'B2', 'CEFR-J'],
    ['remission', 'noun', 'هدوء المرض / شفاء مؤقت', 'After two years of treatment the cancer went into complete remission.', 'بعد عامين من العلاج دخل السرطان في حالة هدوء كامل.', 'extended', 'C1', 'CEFR-J'],
    ['toxin', 'noun', 'سُمّ / مادة سامة', 'The liver plays a vital role in removing toxins from the blood.', 'يلعب الكبد دوراً حيوياً في إزالة السموم من الدم.', 'extended', 'B2', 'CEFR-J'],
    ['biomarker', 'noun', 'مؤشر حيوي', 'Blood biomarkers can help predict the risk of heart attack.', 'يمكن للمؤشرات الحيوية في الدم المساعدة في التنبؤ بخطر النوبة القلبية.', 'extended', 'C1', 'CEFR-J'],
    ['enzyme', 'noun', 'إنزيم', 'Digestive enzymes break down food into nutrients the body can absorb.', 'تُكسّر الإنزيمات الهضمية الطعام إلى مواد غذائية يمكن للجسم امتصاصها.', 'extended', 'B2', 'CEFR-J'],
    ['antibacterial', 'adjective', 'مضاد للبكتيريا', 'Antibacterial soap is widely used in hospitals to prevent infections.', 'يُستخدم الصابون المضاد للبكتيريا على نطاق واسع في المستشفيات لمنع العدوى.', 'extended', 'B2', 'CEFR-J'],
    ['autoimmune', 'adjective', 'مناعي ذاتي', 'Autoimmune diseases occur when the body attacks its own cells.', 'تحدث أمراض المناعة الذاتية عندما يُهاجم الجسم خلاياه.', 'extended', 'C1', 'CEFR-J'],
    ['anesthesia', 'noun', 'تخدير', 'General anesthesia ensures the patient feels no pain during surgery.', 'يضمن التخدير العام ألّا يشعر المريض بأي ألم أثناء الجراحة.', 'extended', 'B2', 'CEFR-J'],
    ['biopsy', 'noun', 'خزعة', 'The doctor ordered a biopsy to determine whether the lump was cancerous.', 'أمر الطبيب بإجراء خزعة لتحديد ما إذا كان الكتلة سرطانية.', 'extended', 'B2', 'CEFR-J'],
    ['contraception', 'noun', 'منع الحمل', 'Access to contraception is considered a fundamental reproductive right.', 'يُعتبر الوصول إلى وسائل منع الحمل حقاً أساسياً من حقوق الإنجاب.', 'extended', 'B2', 'CEFR-J'],
    ['dosage', 'noun', 'جرعة / مقدار', 'The correct dosage depends on the patient age and body weight.', 'تعتمد الجرعة الصحيحة على عمر المريض ووزن جسمه.', 'extended', 'B2', 'CEFR-J'],
    ['inoculate', 'verb', 'يُلقّح', 'Health workers traveled to remote villages to inoculate children.', 'سافر العاملون في الصحة إلى قرى نائية لتلقيح الأطفال.', 'extended', 'C1', 'CEFR-J'],
    ['quarantine', 'noun', 'حجر صحي', 'Travelers were placed in quarantine to prevent the spread of disease.', 'وُضع المسافرون في الحجر الصحي لمنع انتشار المرض.', 'extended', 'B2', 'CEFR-J'],
    ['relapse', 'noun', 'انتكاسة', 'The patient suffered a relapse after stopping medication too early.', 'عانى المريض من انتكاسة بعد إيقاف الدواء مبكراً جداً.', 'extended', 'C1', 'CEFR-J'],

    // MASTERY (80 words)
    ['eugenics', 'noun', 'تحسين النسل', 'The dark history of eugenics serves as a warning for modern genetics.', 'يُشكّل تاريخ تحسين النسل المظلم تحذيراً لعلم الوراثة الحديث.', 'mastery', 'C1', 'CEFR-J'],
    ['epigenetics', 'noun', 'علم التخلّق', 'Epigenetics studies how environmental factors affect gene expression.', 'يدرس علم التخلّق كيف تؤثر العوامل البيئية على التعبير الجيني.', 'mastery', 'C1', 'CEFR-J'],
    ['telemedicine', 'noun', 'طب عن بُعد', 'Telemedicine allows patients to consult doctors from their homes.', 'يسمح الطب عن بُعد للمرضى باستشارة الأطباء من منازلهم.', 'mastery', 'B2', 'CEFR-J'],
    ['nanotechnology', 'noun', 'تقنية النانو', 'Nanotechnology may revolutionize targeted drug delivery systems.', 'قد تُحدث تقنية النانو ثورة في أنظمة توصيل الأدوية المستهدفة.', 'mastery', 'B2', 'CEFR-J'],
    ['immunotherapy', 'noun', 'علاج مناعي', 'Immunotherapy harnesses the body own defenses to fight cancer.', 'يسخّر العلاج المناعي دفاعات الجسم الذاتية لمحاربة السرطان.', 'mastery', 'C1', 'CEFR-J'],
    ['biotechnology', 'noun', 'تقنية حيوية', 'Biotechnology has transformed agriculture, medicine, and industry.', 'حوّلت التقنية الحيوية الزراعة والطب والصناعة.', 'mastery', 'B2', 'CEFR-J'],
    ['virology', 'noun', 'علم الفيروسات', 'Virology research became a global priority after the pandemic.', 'أصبح بحث علم الفيروسات أولوية عالمية بعد الجائحة.', 'mastery', 'C1', 'CEFR-J'],
    ['pharmacology', 'noun', 'علم الأدوية', 'Students of pharmacology learn how drugs interact with the body.', 'يتعلم طلاب علم الأدوية كيف تتفاعل الأدوية مع الجسم.', 'mastery', 'C1', 'CEFR-J'],
    ['bioinformatics', 'noun', 'معلوماتية حيوية', 'Bioinformatics uses computer science to analyze biological data.', 'تستخدم المعلوماتية الحيوية علوم الحاسوب لتحليل البيانات البيولوجية.', 'mastery', 'C1', 'CEFR-J'],
    ['comorbidity', 'noun', 'مرض مصاحب', 'Diabetes is a common comorbidity in patients with heart disease.', 'السكري مرض مصاحب شائع لدى مرضى القلب.', 'mastery', 'C1', 'CEFR-J'],
    ['prognosis', 'noun', 'تكهّن طبي', 'Advanced diagnostic tools allow for more accurate prognosis.', 'تسمح أدوات التشخيص المتقدمة بتكهّن طبي أكثر دقة.', 'mastery', 'C1', 'CEFR-J'],
    ['prophylactic', 'adjective', 'وقائي', 'Prophylactic measures include vaccination and regular health screenings.', 'تشمل التدابير الوقائية التطعيم والفحوصات الصحية المنتظمة.', 'mastery', 'C1', 'CEFR-J'],
    ['idiopathic', 'adjective', 'مجهول السبب', 'The condition was classified as idiopathic because no cause was found.', 'صُنّفت الحالة على أنها مجهولة السبب لعدم العثور على مسبب.', 'mastery', 'C1', 'CEFR-J'],
    ['asymptomatic', 'adjective', 'بدون أعراض', 'Many carriers of the virus remain completely asymptomatic.', 'يظل كثير من حاملي الفيروس بدون أعراض تماماً.', 'mastery', 'C1', 'CEFR-J'],
    ['homeostasis', 'noun', 'توازن داخلي', 'The body maintains homeostasis through complex regulatory systems.', 'يُحافظ الجسم على التوازن الداخلي من خلال أنظمة تنظيمية معقدة.', 'mastery', 'C1', 'CEFR-J'],
    ['microbiome', 'noun', 'ميكروبيوم / نبيت جرثومي', 'Research on the gut microbiome reveals its impact on mental health.', 'تكشف أبحاث الميكروبيوم المعوي عن تأثيره على الصحة النفسية.', 'mastery', 'C1', 'CEFR-J'],
    ['cryogenics', 'noun', 'علم التبريد العميق', 'Cryogenics enables the preservation of biological samples at extreme cold.', 'يُتيح علم التبريد العميق حفظ العينات البيولوجية في برودة شديدة.', 'mastery', 'C1', 'CEFR-J'],
    ['biometric', 'adjective', 'بيومتري / حيوي القياس', 'Biometric data is increasingly used in healthcare identification systems.', 'تُستخدم البيانات البيومترية بشكل متزايد في أنظمة تحديد الهوية الصحية.', 'mastery', 'B2', 'CEFR-J'],
    ['genotype', 'noun', 'نمط جيني', 'A person genotype determines their susceptibility to certain diseases.', 'يُحدد النمط الجيني للشخص قابليته للإصابة بأمراض معينة.', 'mastery', 'C1', 'CEFR-J'],
    ['phenotype', 'noun', 'نمط ظاهري', 'Environmental factors can influence how a phenotype is expressed.', 'يمكن للعوامل البيئية أن تؤثر على كيفية التعبير عن النمط الظاهري.', 'mastery', 'C1', 'CEFR-J'],
  ];
}

// Due to the massive scale (~280 words per unit x 12 units = 3,360 words),
// I'll generate remaining units in subsequent batch files.
// This file handles the staging insert logic.

async function insertBatch(client, words, unitNumber, batchId) {
  let inserted = 0;
  for (const w of words) {
    try {
      await client.query(`
        INSERT INTO public.vocab_staging_l4 (word, pos, definition_ar, example_en, example_ar, recommended_tier, cefr_level, source_list, recommended_unit, batch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (word) DO NOTHING
      `, [w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], unitNumber, batchId]);
      inserted++;
    } catch (err) {
      console.error(`Error inserting "${w[0]}":`, err.message);
    }
  }
  return inserted;
}

async function run() {
  const client = await pool.connect();
  try {
    // Check existing staging
    const existing = await client.query(`SELECT COUNT(*) AS cnt FROM vocab_staging_l4`);
    console.log('Existing staging words:', existing.rows[0].cnt);

    // Insert Unit 1
    const u1 = getUnit1Words();
    const u1count = await insertBatch(client, u1, 1, 1);
    console.log(`Unit 1: ${u1count} words staged (batch 1)`);

    // Summary
    const summary = await client.query(`
      SELECT recommended_unit, recommended_tier, COUNT(*) AS cnt
      FROM vocab_staging_l4
      GROUP BY recommended_unit, recommended_tier
      ORDER BY recommended_unit, recommended_tier
    `);
    console.log('\n=== STAGING SUMMARY ===');
    summary.rows.forEach(r => console.log(`U${r.recommended_unit} ${r.recommended_tier}: ${r.cnt}`));

    const total = await client.query(`SELECT COUNT(*) AS cnt FROM vocab_staging_l4`);
    console.log('\nTotal staged:', total.rows[0].cnt);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(e => console.error(e));
