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

// [word, pos, definition_ar, example_en, example_ar, recommended_tier, cefr_level, source_list]

const unit1 = [
  ["ethical", "adjective", "أخلاقي", "The committee raised ethical concerns about the experiment.", "أثارت اللجنة مخاوف أخلاقية بشأن التجربة.", "core", "B2", "AWL"],
  ["consent", "noun", "موافقة", "Patients must give informed consent before surgery.", "يجب على المرضى إعطاء موافقة مستنيرة قبل الجراحة.", "core", "B2", "AWL"],
  ["protocol", "noun", "بروتوكول", "The research protocol was approved by the board.", "تمت الموافقة على بروتوكول البحث من قبل المجلس.", "core", "B2", "AWL"],
  ["procedure", "noun", "إجراء", "The medical procedure took three hours.", "استغرق الإجراء الطبي ثلاث ساعات.", "core", "B2", "AWL"],
  ["regulate", "verb", "يُنظّم", "The government must regulate genetic research.", "يجب على الحكومة تنظيم البحث الجيني.", "core", "B2", "AWL"],
  ["valid", "adjective", "صالح؛ مقبول", "Her argument was scientifically valid.", "كانت حجتها صالحة علمياً.", "core", "B2", "AWL"],
  ["principle", "noun", "مبدأ", "The principle of do no harm guides medicine.", "مبدأ عدم الإيذاء يوجه الطب.", "core", "B2", "AWL"],
  ["framework", "noun", "إطار عمل", "They developed an ethical framework for AI research.", "طوّروا إطار عمل أخلاقي لأبحاث الذكاء الاصطناعي.", "core", "B2", "AWL"],
  ["implication", "noun", "تداعيات؛ مضمون", "The implications of cloning are still debated.", "لا تزال تداعيات الاستنساخ موضع نقاش.", "extended", "B2", "AWL"],
  ["controversy", "noun", "جدل", "The experiment sparked widespread controversy.", "أثارت التجربة جدلاً واسعاً.", "extended", "B2", "AWL"],
  ["legislate", "verb", "يُشرّع", "It is difficult to legislate on bioethical issues.", "من الصعب التشريع في القضايا الأخلاقية الحيوية.", "extended", "C1", "AWL"],
  ["prohibit", "verb", "يحظر", "Some countries prohibit human cloning.", "تحظر بعض الدول الاستنساخ البشري.", "core", "B2", "AWL"],
  ["preliminary", "adjective", "أوّلي", "Preliminary results suggest the treatment is safe.", "تشير النتائج الأولية إلى أن العلاج آمن.", "extended", "B2", "AWL"],
  ["inherent", "adjective", "متأصّل؛ كامن", "There are inherent risks in gene therapy.", "هناك مخاطر متأصلة في العلاج الجيني.", "extended", "C1", "AWL"],
  ["paradigm", "noun", "نموذج فكري", "The discovery shifted the scientific paradigm.", "غيّر الاكتشاف النموذج الفكري العلمي.", "mastery", "C1", "AWL"],
  ["hypothesis", "noun", "فرضية", "The hypothesis was tested through clinical trials.", "تم اختبار الفرضية من خلال تجارب سريرية.", "core", "B2", "AWL"],
  ["empirical", "adjective", "تجريبي", "Empirical evidence supports the new theory.", "الأدلة التجريبية تدعم النظرية الجديدة.", "extended", "C1", "AWL"],
  ["variable", "noun", "متغيّر", "The researchers controlled every variable carefully.", "ضبط الباحثون كل متغير بعناية.", "core", "B2", "AWL"],
  ["parameter", "noun", "مُعامِل؛ حدّ", "The parameters of the study were clearly defined.", "تم تحديد معاملات الدراسة بوضوح.", "extended", "C1", "AWL"],
  ["criterion", "noun", "معيار", "Each patient met the inclusion criterion.", "استوفى كل مريض معيار الإدراج.", "extended", "C1", "AWL"],
  ["norm", "noun", "معيار؛ عُرف", "Ethical norms vary across cultures.", "تختلف الأعراف الأخلاقية بين الثقافات.", "core", "B2", "AWL"],
  ["advocate", "verb", "يدافع عن؛ يناصر", "Scientists advocate for responsible research.", "يدافع العلماء عن البحث المسؤول.", "core", "B2", "AWL"],
  ["facilitate", "verb", "يُسهّل", "New laws facilitate stem cell research.", "تُسهّل القوانين الجديدة أبحاث الخلايا الجذعية.", "core", "B2", "AWL"],
  ["enhance", "verb", "يُعزّز", "The drug is designed to enhance memory.", "صُمّم الدواء لتعزيز الذاكرة.", "core", "B2", "AWL"],
  ["inhibit", "verb", "يُثبّط؛ يمنع", "The compound inhibits tumor growth.", "يثبط المركب نمو الورم.", "extended", "C1", "AWL"]
];

const unit2 = [
  ["survey", "verb", "يمسح؛ يستطلع", "Scientists survey the ocean floor using sonar.", "يمسح العلماء قاع المحيط باستخدام السونار.", "core", "B2", "AWL"],
  ["explore", "verb", "يستكشف", "Submarines explore the deepest trenches.", "تستكشف الغواصات أعمق الخنادق.", "core", "B1", "AWL"],
  ["detect", "verb", "يكتشف؛ يرصد", "Sensors detect movement in the dark ocean.", "ترصد المستشعرات الحركة في المحيط المظلم.", "core", "B2", "AWL"],
  ["indicate", "verb", "يُشير إلى", "Data indicate a rise in ocean temperature.", "تشير البيانات إلى ارتفاع في درجة حرارة المحيط.", "core", "B2", "AWL"],
  ["accumulate", "verb", "يتراكم", "Sediment accumulates on the ocean floor over centuries.", "تتراكم الرواسب في قاع المحيط عبر القرون.", "extended", "B2", "AWL"],
  ["estimate", "verb", "يُقدّر", "Researchers estimate millions of species remain undiscovered.", "يقدّر الباحثون أن ملايين الأنواع لم تُكتشف بعد.", "core", "B2", "AWL"],
  ["distribute", "verb", "يوزّع", "Marine life is unevenly distributed across the ocean.", "تتوزع الحياة البحرية بشكل غير متساوٍ في المحيط.", "core", "B2", "AWL"],
  ["dimension", "noun", "بُعد", "The dimensions of the trench are staggering.", "أبعاد الخندق مذهلة.", "extended", "B2", "AWL"],
  ["domain", "noun", "مجال؛ نطاق", "The deep ocean is a largely unexplored domain.", "المحيط العميق مجال غير مستكشف إلى حد كبير.", "extended", "B2", "AWL"],
  ["infrastructure", "noun", "بنية تحتية", "Underwater infrastructure supports deep-sea research.", "تدعم البنية التحتية تحت الماء أبحاث أعماق البحار.", "extended", "C1", "AWL"],
  ["undergo", "verb", "يخضع لـ", "The equipment undergoes rigorous testing.", "يخضع الجهاز لاختبارات صارمة.", "core", "B2", "AWL"],
  ["extract", "verb", "يستخرج", "Companies extract minerals from the seabed.", "تستخرج الشركات المعادن من قاع البحر.", "core", "B2", "AWL"],
  ["convert", "verb", "يحوّل", "Hydrothermal vents convert chemicals into energy.", "تحوّل الفوهات الحرارية المائية المواد الكيميائية إلى طاقة.", "core", "B2", "AWL"],
  ["precede", "verb", "يسبق", "A mapping phase preceded the dive.", "سبقت مرحلة الخرائط عملية الغوص.", "extended", "C1", "AWL"],
  ["subsequent", "adjective", "لاحق", "Subsequent dives revealed new species.", "كشفت الغطسات اللاحقة عن أنواع جديدة.", "extended", "C1", "AWL"],
  ["dynamic", "adjective", "ديناميكي؛ متحرك", "Ocean currents create a dynamic environment.", "تخلق التيارات المحيطية بيئة ديناميكية.", "core", "B2", "AWL"],
  ["component", "noun", "مكوّن", "Salt is a major component of seawater.", "الملح مكوّن رئيسي في مياه البحر.", "core", "B2", "AWL"],
  ["adjacent", "adjective", "مجاور", "The reef is adjacent to the volcanic vent.", "الشعاب المرجانية مجاورة للفوهة البركانية.", "extended", "C1", "AWL"],
  ["layer", "noun", "طبقة", "The ocean has distinct thermal layers.", "يحتوي المحيط على طبقات حرارية مميزة.", "core", "B2", "AWL"],
  ["core", "noun", "لبّ؛ نواة", "Samples from the ocean core reveal ancient climates.", "تكشف عينات من لبّ المحيط عن مناخات قديمة.", "core", "B2", "AWL"],
  ["finite", "adjective", "محدود", "The ocean's resources are finite.", "موارد المحيط محدودة.", "extended", "C1", "AWL"],
  ["bulk", "noun", "كتلة؛ معظم", "The bulk of deep-sea life is microscopic.", "معظم حياة أعماق البحار مجهرية.", "extended", "B2", "AWL"],
  ["compound", "noun", "مركّب", "Scientists discovered a new chemical compound.", "اكتشف العلماء مركباً كيميائياً جديداً.", "core", "B2", "AWL"],
  ["cycle", "noun", "دورة", "The carbon cycle is vital for ocean health.", "دورة الكربون حيوية لصحة المحيط.", "core", "B1", "AWL"],
  ["phenomenon", "noun", "ظاهرة", "Bioluminescence is a remarkable ocean phenomenon.", "الإضاءة الحيوية ظاهرة بحرية رائعة.", "extended", "B2", "AWL"]
];

const unit3 = [
  ["sustain", "verb", "يُدعم؛ يُعيل", "Agriculture must sustain a growing population.", "يجب أن تُعيل الزراعة عدداً متزايداً من السكان.", "core", "B2", "AWL"],
  ["resource", "noun", "مورد", "Water is a critical resource for farming.", "الماء مورد حيوي للزراعة.", "core", "B1", "AWL"],
  ["consume", "verb", "يستهلك", "Developed nations consume more food per capita.", "تستهلك الدول المتقدمة طعاماً أكثر للفرد.", "core", "B2", "AWL"],
  ["derive", "verb", "يُستمدّ؛ يشتقّ", "Many medicines are derived from plants.", "تُشتقّ أدوية كثيرة من النباتات.", "extended", "B2", "AWL"],
  ["generate", "verb", "يولّد؛ يُنتج", "Vertical farms generate high yields.", "تنتج المزارع العمودية محاصيل عالية.", "core", "B2", "AWL"],
  ["output", "noun", "ناتج؛ إنتاج", "Agricultural output has doubled in a decade.", "تضاعف الإنتاج الزراعي خلال عقد.", "core", "B2", "AWL"],
  ["input", "noun", "مُدخَل", "Fertilizer is a key input in modern farming.", "السماد مُدخَل رئيسي في الزراعة الحديثة.", "core", "B2", "AWL"],
  ["capacity", "noun", "قدرة؛ سعة", "The region lacks the capacity to produce enough food.", "تفتقر المنطقة إلى القدرة على إنتاج طعام كافٍ.", "core", "B2", "AWL"],
  ["proportion", "noun", "نسبة", "A large proportion of crops is wasted.", "نسبة كبيرة من المحاصيل تُهدَر.", "core", "B2", "AWL"],
  ["revenue", "noun", "إيرادات", "Export revenue supports rural communities.", "تدعم إيرادات التصدير المجتمعات الريفية.", "extended", "B2", "AWL"],
  ["commodity", "noun", "سلعة", "Rice is a globally traded commodity.", "الأرز سلعة يُتاجَر بها عالمياً.", "extended", "C1", "AWL"],
  ["cooperate", "verb", "يتعاون", "Nations must cooperate to end famine.", "يجب أن تتعاون الدول لإنهاء المجاعة.", "core", "B2", "AWL"],
  ["intervene", "verb", "يتدخّل", "Governments intervene when food prices soar.", "تتدخل الحكومات عندما ترتفع أسعار الغذاء.", "extended", "C1", "AWL"],
  ["allocate", "verb", "يُخصّص", "Funds were allocated for food aid.", "خُصّصت أموال للمساعدات الغذائية.", "extended", "C1", "AWL"],
  ["priority", "noun", "أولوية", "Food security is a global priority.", "الأمن الغذائي أولوية عالمية.", "core", "B2", "AWL"],
  ["guarantee", "verb", "يضمن", "No system can guarantee zero hunger.", "لا يمكن لأي نظام ضمان القضاء على الجوع.", "core", "B2", "AWL"],
  ["minimize", "verb", "يُقلّل إلى الحد الأدنى", "New techniques minimize water waste.", "تقلّل التقنيات الجديدة هدر الماء إلى الحد الأدنى.", "core", "B2", "AWL"],
  ["maximize", "verb", "يُضاعف إلى الحد الأقصى", "Farmers maximize yield through crop rotation.", "يُضاعف المزارعون المحصول من خلال تدوير المحاصيل.", "core", "B2", "AWL"],
  ["ratio", "noun", "نسبة", "The ratio of food to population is declining.", "نسبة الغذاء إلى السكان آخذة في الانخفاض.", "extended", "B2", "AWL"],
  ["supplement", "verb", "يُكمّل؛ يُضيف إلى", "They supplement their diet with vitamins.", "يكمّلون نظامهم الغذائي بالفيتامينات.", "extended", "B2", "AWL"],
  ["attribute", "verb", "يُنسب إلى", "They attribute the famine to drought.", "يُنسبون المجاعة إلى الجفاف.", "extended", "C1", "AWL"],
  ["dispose", "verb", "يتخلّص من", "Farmers must dispose of waste properly.", "يجب على المزارعين التخلص من النفايات بشكل صحيح.", "extended", "B2", "AWL"],
  ["adequate", "adjective", "كافٍ؛ ملائم", "Many families lack adequate nutrition.", "تفتقر أسر كثيرة إلى تغذية كافية.", "core", "B2", "AWL"],
  ["intervene", "verb", "يتدخّل", "Aid agencies intervene during food crises.", "تتدخل وكالات المساعدة خلال أزمات الغذاء.", "extended", "C1", "AWL"],
  ["allocate", "verb", "يُخصّص", "Resources must be allocated fairly.", "يجب تخصيص الموارد بشكل عادل.", "extended", "C1", "AWL"]
];

const unit4 = [
  ["design", "verb", "يُصمّم", "Engineers design products inspired by nature.", "يصمّم المهندسون منتجات مستوحاة من الطبيعة.", "core", "B1", "AWL"],
  ["structure", "noun", "بنية؛ هيكل", "The structure of a honeycomb is highly efficient.", "بنية قرص العسل عالية الكفاءة.", "core", "B2", "AWL"],
  ["function", "noun", "وظيفة", "The function of the design mimics a bird's wing.", "وظيفة التصميم تحاكي جناح الطائر.", "core", "B2", "AWL"],
  ["adapt", "verb", "يتكيّف", "Species adapt to their environment over time.", "تتكيّف الأنواع مع بيئتها بمرور الوقت.", "core", "B2", "AWL"],
  ["innovate", "verb", "يبتكر", "Companies innovate by studying biological systems.", "تبتكر الشركات من خلال دراسة الأنظمة البيولوجية.", "extended", "C1", "AWL"],
  ["simulate", "verb", "يحاكي", "Software can simulate the flight of insects.", "يمكن للبرمجيات محاكاة طيران الحشرات.", "extended", "B2", "AWL"],
  ["utilize", "verb", "يستخدم؛ يوظّف", "Researchers utilize natural models for innovation.", "يستخدم الباحثون نماذج طبيعية للابتكار.", "core", "B2", "AWL"],
  ["feature", "noun", "ميزة؛ سمة", "The key feature of the material is its flexibility.", "الميزة الرئيسية للمادة هي مرونتها.", "core", "B2", "AWL"],
  ["element", "noun", "عنصر", "Each element of the design serves a purpose.", "كل عنصر في التصميم يخدم هدفاً.", "core", "B2", "AWL"],
  ["concept", "noun", "مفهوم", "The concept of biomimicry is gaining popularity.", "يكتسب مفهوم المحاكاة الحيوية شعبية.", "core", "B2", "AWL"],
  ["approach", "noun", "نهج؛ مقاربة", "A biomimetic approach solves complex problems.", "يحلّ النهج المحاكي للطبيعة مشكلات معقدة.", "core", "B2", "AWL"],
  ["create", "verb", "يُنشئ؛ يبتكر", "Scientists create materials that mimic spider silk.", "يبتكر العلماء مواد تحاكي حرير العنكبوت.", "core", "B1", "AWL"],
  ["alter", "verb", "يُغيّر", "Researchers alter the surface to repel water.", "يغيّر الباحثون السطح لطرد الماء.", "extended", "B2", "AWL"],
  ["enable", "verb", "يُمكّن", "This technology enables self-cleaning surfaces.", "تُمكّن هذه التقنية الأسطح من التنظيف الذاتي.", "core", "B2", "AWL"],
  ["modify", "verb", "يُعدّل", "They modified the wing design after testing.", "عدّلوا تصميم الجناح بعد الاختبار.", "core", "B2", "AWL"],
  ["transform", "verb", "يُحوّل", "Nature's solutions can transform engineering.", "يمكن لحلول الطبيعة أن تحوّل الهندسة.", "core", "B2", "AWL"],
  ["integrate", "verb", "يدمج", "The team integrated biological principles into the design.", "دمج الفريق مبادئ بيولوجية في التصميم.", "core", "B2", "AWL"],
  ["construct", "verb", "يبني؛ يُشيّد", "Termites construct complex ventilation systems.", "يبني النمل الأبيض أنظمة تهوية معقدة.", "core", "B2", "AWL"],
  ["method", "noun", "طريقة؛ أسلوب", "The method was inspired by gecko feet.", "استُلهمت الطريقة من أقدام الوزغة.", "core", "B2", "AWL"],
  ["technique", "noun", "تقنية", "The adhesion technique copies mussel proteins.", "تنسخ تقنية الالتصاق بروتينات بلح البحر.", "core", "B2", "AWL"],
  ["obtain", "verb", "يحصل على", "They obtained a patent for the bio-inspired material.", "حصلوا على براءة اختراع للمادة المستوحاة حيوياً.", "extended", "B2", "AWL"],
  ["exhibit", "verb", "يُظهر؛ يعرض", "Lotus leaves exhibit a self-cleaning effect.", "تُظهر أوراق اللوتس تأثير التنظيف الذاتي.", "extended", "C1", "AWL"],
  ["emerge", "verb", "يظهر؛ ينبثق", "New applications emerge from biomimicry research.", "تظهر تطبيقات جديدة من أبحاث المحاكاة الحيوية.", "extended", "B2", "AWL"],
  ["derive", "verb", "يشتقّ", "The design was derived from a shark's skin.", "اشتُقّ التصميم من جلد القرش.", "extended", "B2", "AWL"],
  ["principle", "noun", "مبدأ", "The principle behind the invention is simple.", "المبدأ الكامن وراء الاختراع بسيط.", "core", "B2", "AWL"]
];

const unit5 = [
  ["migrate", "verb", "يهاجر", "Millions migrate in search of better opportunities.", "يهاجر الملايين بحثاً عن فرص أفضل.", "core", "B2", "AWL"],
  ["reside", "verb", "يقيم", "Many refugees reside in temporary camps.", "يقيم كثير من اللاجئين في مخيمات مؤقتة.", "extended", "C1", "AWL"],
  ["community", "noun", "مجتمع", "The immigrant community has grown significantly.", "نما مجتمع المهاجرين بشكل كبير.", "core", "B1", "AWL"],
  ["integrate", "verb", "يندمج", "Newcomers strive to integrate into society.", "يسعى القادمون الجدد إلى الاندماج في المجتمع.", "core", "B2", "AWL"],
  ["contribute", "verb", "يُساهم", "Immigrants contribute to the economy.", "يساهم المهاجرون في الاقتصاد.", "core", "B2", "AWL"],
  ["participate", "verb", "يُشارك", "All residents should participate in civic life.", "يجب أن يشارك جميع المقيمين في الحياة المدنية.", "core", "B2", "AWL"],
  ["exclude", "verb", "يستبعد", "Policies should not exclude vulnerable groups.", "لا ينبغي للسياسات استبعاد الفئات الضعيفة.", "extended", "B2", "AWL"],
  ["discriminate", "verb", "يُميّز؛ يُمارس التمييز", "It is illegal to discriminate based on origin.", "من غير القانوني التمييز على أساس الأصل.", "extended", "B2", "AWL"],
  ["diverse", "adjective", "متنوّع", "Cities are becoming increasingly diverse.", "أصبحت المدن متنوعة بشكل متزايد.", "core", "B2", "AWL"],
  ["culture", "noun", "ثقافة", "Respecting culture is key to integration.", "احترام الثقافة مفتاح الاندماج.", "core", "B1", "AWL"],
  ["status", "noun", "وضع؛ حالة", "Legal status determines access to services.", "يحدد الوضع القانوني إمكانية الوصول إلى الخدمات.", "core", "B2", "AWL"],
  ["identity", "noun", "هوية", "Migrants often struggle with identity.", "غالباً ما يعاني المهاجرون مع الهوية.", "core", "B2", "AWL"],
  ["tradition", "noun", "تقليد", "They maintain their cultural traditions abroad.", "يحافظون على تقاليدهم الثقافية في الخارج.", "core", "B2", "AWL"],
  ["authority", "noun", "سلطة", "The authority granted asylum to the family.", "منحت السلطة حق اللجوء للعائلة.", "core", "B2", "AWL"],
  ["enforce", "verb", "يُنفّذ؛ يفرض", "Border guards enforce immigration laws.", "ينفّذ حرس الحدود قوانين الهجرة.", "extended", "C1", "AWL"],
  ["restrict", "verb", "يُقيّد", "Some nations restrict immigration sharply.", "تقيّد بعض الدول الهجرة بشكل حاد.", "extended", "B2", "AWL"],
  ["grant", "verb", "يمنح", "The government granted citizenship to applicants.", "منحت الحكومة الجنسية لمقدمي الطلبات.", "core", "B2", "AWL"],
  ["comprise", "verb", "يتألّف من", "The country comprises many ethnic groups.", "يتألف البلد من مجموعات عرقية عديدة.", "extended", "C1", "AWL"],
  ["occupy", "verb", "يشغل", "Refugees occupy overcrowded shelters.", "يشغل اللاجئون ملاجئ مكتظة.", "extended", "B2", "AWL"],
  ["displace", "verb", "يُهجّر", "War displaced millions of families.", "هجّرت الحرب ملايين العائلات.", "extended", "C1", "AWL"],
  ["exploit", "verb", "يستغلّ", "Traffickers exploit desperate migrants.", "يستغل المهرّبون المهاجرين اليائسين.", "extended", "C1", "AWL"],
  ["minority", "noun", "أقلية", "The minority group sought equal rights.", "سعت مجموعة الأقلية إلى حقوق متساوية.", "core", "B2", "AWL"],
  ["liberal", "adjective", "ليبرالي؛ متحرر", "The country adopted a liberal immigration policy.", "تبنّى البلد سياسة هجرة ليبرالية.", "extended", "C1", "AWL"],
  ["radical", "adjective", "جذري", "Radical reform of immigration law is needed.", "هناك حاجة إلى إصلاح جذري لقانون الهجرة.", "extended", "C1", "AWL"],
  ["amend", "verb", "يُعدّل", "Parliament voted to amend the residency law.", "صوّت البرلمان على تعديل قانون الإقامة.", "extended", "C1", "AWL"]
];

const unit6 = [
  ["finance", "noun", "تمويل؛ مالية", "Cryptocurrency is reshaping global finance.", "العملة المشفرة تعيد تشكيل التمويل العالمي.", "core", "B2", "AWL"],
  ["invest", "verb", "يستثمر", "Many young people invest in digital assets.", "يستثمر كثير من الشباب في الأصول الرقمية.", "core", "B2", "AWL"],
  ["fluctuate", "verb", "يتذبذب", "Crypto prices fluctuate dramatically.", "تتذبذب أسعار العملات المشفرة بشكل كبير.", "extended", "C1", "AWL"],
  ["compute", "verb", "يحسب", "Miners compute complex equations to verify transactions.", "يحسب المعدّنون معادلات معقدة للتحقق من المعاملات.", "extended", "B2", "AWL"],
  ["data", "noun", "بيانات", "Blockchain stores data in a decentralized way.", "تخزّن البلوكشين البيانات بطريقة لا مركزية.", "core", "B1", "AWL"],
  ["network", "noun", "شبكة", "The network verifies each transaction.", "تتحقق الشبكة من كل معاملة.", "core", "B2", "AWL"],
  ["transfer", "verb", "يحوّل؛ ينقل", "Users transfer funds without a bank.", "يحوّل المستخدمون الأموال بدون بنك.", "core", "B2", "AWL"],
  ["secure", "adjective", "آمن", "Blockchain technology is considered secure.", "تُعتبر تقنية البلوكشين آمنة.", "core", "B2", "AWL"],
  ["fund", "noun", "صندوق؛ تمويل", "The investment fund lost half its value.", "فقد صندوق الاستثمار نصف قيمته.", "core", "B2", "AWL"],
  ["asset", "noun", "أصل مالي", "Bitcoin is classified as a digital asset.", "يُصنّف البيتكوين كأصل رقمي.", "core", "B2", "AWL"],
  ["scheme", "noun", "مخطط؛ نظام", "Investors fell for a fraudulent scheme.", "وقع المستثمرون في مخطط احتيالي.", "extended", "B2", "AWL"],
  ["trend", "noun", "اتجاه", "The trend toward digital currencies is global.", "الاتجاه نحو العملات الرقمية عالمي.", "core", "B2", "AWL"],
  ["recover", "verb", "يتعافى", "Markets often recover after a crash.", "غالباً ما تتعافى الأسواق بعد الانهيار.", "core", "B2", "AWL"],
  ["contract", "noun", "عقد", "Smart contracts execute automatically.", "تُنفَّذ العقود الذكية تلقائياً.", "core", "B2", "AWL"],
  ["potential", "noun", "إمكانية", "Crypto has enormous potential for growth.", "للعملات المشفرة إمكانية هائلة للنمو.", "core", "B2", "AWL"],
  ["prospect", "noun", "احتمال؛ توقع", "The prospect of regulation worries traders.", "يقلق احتمال التنظيم المتداولين.", "extended", "C1", "AWL"],
  ["project", "verb", "يتوقّع", "Analysts project a rise in Bitcoin value.", "يتوقع المحللون ارتفاعاً في قيمة البيتكوين.", "core", "B2", "AWL"],
  ["scenario", "noun", "سيناريو", "In the worst scenario, investors lose everything.", "في أسوأ سيناريو، يخسر المستثمرون كل شيء.", "extended", "B2", "AWL"],
  ["sector", "noun", "قطاع", "The financial sector is evolving rapidly.", "يتطور القطاع المالي بسرعة.", "core", "B2", "AWL"],
  ["margin", "noun", "هامش", "Traders operate on thin profit margins.", "يعمل المتداولون بهوامش ربح ضئيلة.", "extended", "C1", "AWL"],
  ["retain", "verb", "يحتفظ بـ", "Investors retain assets during downturns.", "يحتفظ المستثمرون بالأصول خلال فترات الركود.", "extended", "B2", "AWL"],
  ["regulate", "verb", "يُنظّم", "Governments struggle to regulate cryptocurrency.", "تكافح الحكومات لتنظيم العملات المشفرة.", "core", "B2", "AWL"],
  ["revenue", "noun", "إيرادات", "Mining generates significant revenue.", "يولّد التعدين إيرادات كبيرة.", "extended", "B2", "AWL"],
  ["convert", "verb", "يحوّل", "You can convert crypto to traditional currency.", "يمكنك تحويل العملة المشفرة إلى عملة تقليدية.", "core", "B2", "AWL"],
  ["commodity", "noun", "سلعة", "Some treat Bitcoin as a commodity.", "يتعامل البعض مع البيتكوين كسلعة.", "extended", "C1", "AWL"]
];

const unit7 = [
  ["perceive", "verb", "يُدرك", "People perceive risk differently in crowds.", "يدرك الناس المخاطر بشكل مختلف في الحشود.", "core", "B2", "AWL"],
  ["attitude", "noun", "موقف؛ اتجاه", "Crowd behavior reflects collective attitudes.", "يعكس سلوك الحشد المواقف الجماعية.", "core", "B2", "AWL"],
  ["bias", "noun", "تحيّز", "Confirmation bias affects group decisions.", "يؤثر تحيز التأكيد على قرارات المجموعة.", "core", "B2", "AWL"],
  ["rational", "adjective", "عقلاني", "People become less rational in mobs.", "يصبح الناس أقل عقلانية في الحشود.", "core", "B2", "AWL"],
  ["react", "verb", "يتفاعل", "Crowds react unpredictably to threats.", "تتفاعل الحشود بشكل غير متوقع مع التهديدات.", "core", "B2", "AWL"],
  ["trigger", "verb", "يُثير؛ يُحفّز", "A single event can trigger mass panic.", "يمكن لحدث واحد أن يثير ذعراً جماعياً.", "core", "B2", "AWL"],
  ["dominate", "verb", "يُهيمن", "Charismatic leaders dominate group dynamics.", "يهيمن القادة الكاريزميون على ديناميكيات المجموعة.", "core", "B2", "AWL"],
  ["submit", "verb", "يخضع؛ يقدّم", "Individuals submit to group pressure.", "يخضع الأفراد لضغط المجموعة.", "extended", "B2", "AWL"],
  ["passive", "adjective", "سلبي؛ خامل", "Most bystanders remain passive during events.", "يبقى معظم المارّة سلبيين أثناء الأحداث.", "core", "B2", "AWL"],
  ["aggressive", "adjective", "عدواني", "The crowd became aggressive after provocation.", "أصبح الحشد عدوانياً بعد الاستفزاز.", "core", "B2", "AWL"],
  ["deviate", "verb", "ينحرف", "Few dare to deviate from the group norm.", "قلّة يجرؤون على الانحراف عن معيار المجموعة.", "extended", "C1", "AWL"],
  ["conform", "verb", "يمتثل؛ ينصاع", "Social pressure makes people conform.", "يجعل الضغط الاجتماعي الناس ينصاعون.", "extended", "C1", "AWL"],
  ["manipulate", "verb", "يتلاعب", "Propaganda can manipulate crowd emotions.", "يمكن للدعاية التلاعب بمشاعر الحشد.", "extended", "B2", "AWL"],
  ["evaluate", "verb", "يُقيّم", "It is hard to evaluate risk in a panic.", "من الصعب تقييم المخاطر في حالة ذعر.", "core", "B2", "AWL"],
  ["interpret", "verb", "يُفسّر", "People interpret ambiguous situations differently.", "يفسّر الناس المواقف الغامضة بشكل مختلف.", "core", "B2", "AWL"],
  ["ideology", "noun", "أيديولوجيا", "Ideology can unite or divide crowds.", "يمكن للأيديولوجيا أن توحّد أو تفرّق الحشود.", "extended", "C1", "AWL"],
  ["conflict", "noun", "صراع", "Group conflict often escalates quickly.", "غالباً ما يتصاعد صراع المجموعة بسرعة.", "core", "B2", "AWL"],
  ["resolve", "verb", "يحلّ", "Mediation can resolve crowd disputes.", "يمكن للوساطة حلّ نزاعات الحشود.", "core", "B2", "AWL"],
  ["impose", "verb", "يفرض", "Authorities impose curfews to control riots.", "تفرض السلطات حظر التجوّل للسيطرة على الشغب.", "extended", "C1", "AWL"],
  ["restrain", "verb", "يكبح؛ يضبط", "Police restrain violent protesters.", "تكبح الشرطة المتظاهرين العنيفين.", "extended", "C1", "AWL"],
  ["justify", "verb", "يُبرّر", "People justify mob behavior after the fact.", "يبرر الناس سلوك الحشد بعد الواقعة.", "core", "B2", "AWL"],
  ["motivate", "verb", "يُحفّز", "Fear and anger motivate crowd action.", "يحفّز الخوف والغضب فعل الحشد.", "core", "B2", "AWL"],
  ["reinforce", "verb", "يُعزّز", "Group consensus reinforces individual beliefs.", "يعزز إجماع المجموعة معتقدات الأفراد.", "extended", "B2", "AWL"],
  ["liberal", "adjective", "ليبرالي؛ متحرر", "Liberal values promote free expression.", "تعزز القيم الليبرالية حرية التعبير.", "extended", "C1", "AWL"],
  ["radical", "adjective", "جذري؛ متطرف", "Radical ideas can spread through crowds rapidly.", "يمكن للأفكار الجذرية أن تنتشر عبر الحشود بسرعة.", "extended", "C1", "AWL"]
];

const unit8 = [
  ["evidence", "noun", "دليل", "The forensic evidence was conclusive.", "كان الدليل الجنائي قاطعاً.", "core", "B2", "AWL"],
  ["investigate", "verb", "يحقّق", "Police investigate crimes using forensic science.", "تحقق الشرطة في الجرائم باستخدام الطب الشرعي.", "core", "B2", "AWL"],
  ["conclude", "verb", "يستنتج", "The expert concluded that the evidence matched.", "استنتج الخبير أن الأدلة تطابقت.", "core", "B2", "AWL"],
  ["establish", "verb", "يُثبت؛ يؤسس", "DNA tests establish identity beyond doubt.", "تُثبت اختبارات الحمض النووي الهوية بما لا يدع مجالاً للشك.", "core", "B2", "AWL"],
  ["identify", "verb", "يُحدّد؛ يتعرّف على", "Fingerprints help identify suspects.", "تساعد بصمات الأصابع في تحديد المشتبه بهم.", "core", "B2", "AWL"],
  ["verify", "verb", "يتحقّق من", "Labs verify the authenticity of documents.", "تتحقق المختبرات من صحة الوثائق.", "core", "B2", "AWL"],
  ["confirm", "verb", "يؤكّد", "The test confirmed the presence of poison.", "أكد الاختبار وجود السمّ.", "core", "B2", "AWL"],
  ["analyze", "verb", "يحلّل", "Scientists analyze blood samples at the lab.", "يحلّل العلماء عينات الدم في المختبر.", "core", "B2", "AWL"],
  ["demonstrate", "verb", "يُوضّح؛ يُثبت", "The experiment demonstrated the theory's validity.", "أثبتت التجربة صحة النظرية.", "core", "B2", "AWL"],
  ["document", "verb", "يوثّق", "Investigators document every piece of evidence.", "يوثّق المحققون كل قطعة من الأدلة.", "core", "B2", "AWL"],
  ["sequence", "noun", "تسلسل", "The DNA sequence revealed the suspect's identity.", "كشف تسلسل الحمض النووي عن هوية المشتبه به.", "extended", "B2", "AWL"],
  ["precise", "adjective", "دقيق", "Forensic tools must be precise.", "يجب أن تكون الأدوات الجنائية دقيقة.", "core", "B2", "AWL"],
  ["accurate", "adjective", "صحيح؛ دقيق", "Accurate records are essential in forensics.", "السجلات الدقيقة ضرورية في الطب الشرعي.", "core", "B2", "AWL"],
  ["definite", "adjective", "مؤكّد؛ قاطع", "There is no definite answer yet.", "لا يوجد جواب مؤكد بعد.", "core", "B2", "AWL"],
  ["convince", "verb", "يُقنع", "The evidence convinced the jury.", "أقنعت الأدلة هيئة المحلفين.", "core", "B2", "AWL"],
  ["contradict", "verb", "يُناقض", "The witness's testimony contradicted the evidence.", "تناقضت شهادة الشاهد مع الأدلة.", "extended", "C1", "AWL"],
  ["challenge", "verb", "يُطعن في؛ يتحدّى", "Lawyers challenged the forensic report.", "طعن المحامون في التقرير الجنائي.", "core", "B2", "AWL"],
  ["dispute", "verb", "يُنازع", "The defense disputed the lab results.", "نازع الدفاع نتائج المختبر.", "extended", "C1", "AWL"],
  ["reveal", "verb", "يكشف", "UV light revealed hidden fingerprints.", "كشف الضوء فوق البنفسجي بصمات مخفية.", "core", "B2", "AWL"],
  ["expose", "verb", "يفضح؛ يعرّض", "The investigation exposed a cover-up.", "فضح التحقيق عملية تستّر.", "core", "B2", "AWL"],
  ["method", "noun", "طريقة", "New forensic methods improve conviction rates.", "تحسّن الطرق الجنائية الجديدة معدلات الإدانة.", "core", "B2", "AWL"],
  ["approach", "noun", "نهج", "A multidisciplinary approach is used in forensics.", "يُستخدم نهج متعدد التخصصات في الطب الشرعي.", "core", "B2", "AWL"],
  ["procedure", "noun", "إجراء", "Standard procedures must be followed at crime scenes.", "يجب اتباع الإجراءات المعيارية في مسارح الجريمة.", "core", "B2", "AWL"],
  ["detect", "verb", "يكتشف", "New tools detect traces invisible to the eye.", "تكتشف أدوات جديدة آثاراً غير مرئية للعين.", "core", "B2", "AWL"],
  ["resolve", "verb", "يحلّ", "Cold cases are resolved with modern forensics.", "تُحَلّ القضايا المُجمّدة بالطب الشرعي الحديث.", "core", "B2", "AWL"]
];

const unit9 = [
  ["period", "noun", "فترة؛ حقبة", "The artifact dates to the Bronze period.", "يعود الأثر إلى الحقبة البرونزية.", "core", "B2", "AWL"],
  ["era", "noun", "عصر؛ حقبة", "The era of ancient Egypt fascinates scholars.", "يفتن عصر مصر القديمة الباحثين.", "core", "B2", "AWL"],
  ["site", "noun", "موقع", "The archaeological site was discovered accidentally.", "اكتُشف الموقع الأثري بالصدفة.", "core", "B2", "AWL"],
  ["locate", "verb", "يُحدّد موقع", "Researchers located the ruins using satellite imagery.", "حدّد الباحثون موقع الأطلال باستخدام صور الأقمار الصناعية.", "core", "B2", "AWL"],
  ["region", "noun", "منطقة", "The region was once home to a great civilization.", "كانت المنطقة موطناً لحضارة عظيمة.", "core", "B2", "AWL"],
  ["interpret", "verb", "يُفسّر", "Scholars interpret the inscriptions differently.", "يفسّر العلماء النقوش بشكل مختلف.", "core", "B2", "AWL"],
  ["classify", "verb", "يُصنّف", "Archaeologists classify pottery by style and date.", "يصنّف علماء الآثار الفخار حسب الأسلوب والتاريخ.", "extended", "B2", "AWL"],
  ["document", "verb", "يوثّق", "Every find is carefully documented.", "يُوثَّق كل اكتشاف بعناية.", "core", "B2", "AWL"],
  ["preserve", "verb", "يحفظ", "Dry climates preserve ancient materials well.", "تحفظ المناخات الجافة المواد القديمة جيداً.", "core", "B2", "AWL"],
  ["restore", "verb", "يُرمّم", "Experts restore damaged mosaics.", "يرمّم الخبراء الفسيفساء المتضررة.", "core", "B2", "AWL"],
  ["trace", "verb", "يتتبّع", "Scientists trace the origins of agriculture.", "يتتبّع العلماء أصول الزراعة.", "core", "B2", "AWL"],
  ["origin", "noun", "أصل", "The origin of writing lies in Mesopotamia.", "يقع أصل الكتابة في بلاد الرافدين.", "core", "B2", "AWL"],
  ["source", "noun", "مصدر", "Ancient texts are a primary source for historians.", "النصوص القديمة مصدر أوّلي للمؤرخين.", "core", "B2", "AWL"],
  ["evolve", "verb", "يتطوّر", "Burial customs evolved over thousands of years.", "تطورت عادات الدفن عبر آلاف السنين.", "core", "B2", "AWL"],
  ["prior", "adjective", "سابق", "Prior excavations missed the lower levels.", "أغفلت الحفريات السابقة المستويات الأدنى.", "extended", "C1", "AWL"],
  ["subsequent", "adjective", "لاحق", "Subsequent digs uncovered a temple.", "كشفت الحفريات اللاحقة عن معبد.", "extended", "C1", "AWL"],
  ["contemporary", "adjective", "معاصر", "Contemporary accounts describe the city's grandeur.", "تصف الروايات المعاصرة عظمة المدينة.", "extended", "C1", "AWL"],
  ["ancient", "adjective", "قديم", "Ancient civilizations left remarkable monuments.", "تركت الحضارات القديمة آثاراً رائعة.", "core", "B1", "NAWL"],
  ["parallel", "noun", "تشابه؛ مقارنة", "Scholars draw parallels between the two cultures.", "يرسم العلماء أوجه تشابه بين الثقافتين.", "extended", "B2", "AWL"],
  ["analogy", "noun", "قياس؛ تشبيه", "The analogy between the two empires is striking.", "القياس بين الإمبراطوريتين لافت.", "mastery", "C1", "AWL"],
  ["symbol", "noun", "رمز", "The eagle was a symbol of power.", "كان النسر رمزاً للقوة.", "core", "B2", "AWL"],
  ["theme", "noun", "موضوع؛ فكرة", "Death is a recurring theme in ancient art.", "الموت موضوع متكرر في الفن القديم.", "core", "B2", "AWL"],
  ["context", "noun", "سياق", "Artifacts must be understood in context.", "يجب فهم القطع الأثرية في سياقها.", "core", "B2", "AWL"],
  ["derive", "verb", "يُشتقّ", "The word is derived from ancient Greek.", "الكلمة مشتقة من اليونانية القديمة.", "extended", "B2", "AWL"],
  ["tradition", "noun", "تقليد", "Oral tradition preserved stories for generations.", "حفظ التقليد الشفهي القصص لأجيال.", "core", "B2", "AWL"]
];

const unit10 = [
  ["research", "noun", "بحث", "Longevity research has advanced significantly.", "تقدّم بحث طول العمر بشكل كبير.", "core", "B2", "AWL"],
  ["theory", "noun", "نظرية", "The theory of aging is complex.", "نظرية الشيخوخة معقدة.", "core", "B2", "AWL"],
  ["data", "noun", "بيانات", "Data show that exercise extends lifespan.", "تُظهر البيانات أن الرياضة تطيل العمر.", "core", "B1", "AWL"],
  ["conclude", "verb", "يستنتج", "Researchers concluded that diet matters most.", "استنتج الباحثون أن النظام الغذائي هو الأهم.", "core", "B2", "AWL"],
  ["hypothesis", "noun", "فرضية", "The telomere hypothesis explains cellular aging.", "تُفسر فرضية التيلومير شيخوخة الخلايا.", "core", "B2", "AWL"],
  ["outcome", "noun", "نتيجة", "The health outcome depends on lifestyle.", "تعتمد النتيجة الصحية على نمط الحياة.", "core", "B2", "AWL"],
  ["factor", "noun", "عامل", "Genetics is a major factor in longevity.", "الوراثة عامل رئيسي في طول العمر.", "core", "B2", "AWL"],
  ["process", "noun", "عملية", "Aging is a gradual biological process.", "الشيخوخة عملية بيولوجية تدريجية.", "core", "B2", "AWL"],
  ["mechanism", "noun", "آلية", "Scientists study the mechanism of cell repair.", "يدرس العلماء آلية إصلاح الخلايا.", "extended", "C1", "AWL"],
  ["respond", "verb", "يستجيب", "The body responds to stress by aging faster.", "يستجيب الجسم للضغط بالشيخوخة بشكل أسرع.", "core", "B2", "AWL"],
  ["adapt", "verb", "يتكيّف", "Cells adapt to environmental changes.", "تتكيف الخلايا مع التغيرات البيئية.", "core", "B2", "AWL"],
  ["maintain", "verb", "يُحافظ على", "Exercise helps maintain physical health.", "تساعد الرياضة في الحفاظ على الصحة البدنية.", "core", "B2", "AWL"],
  ["decline", "verb", "يتراجع", "Cognitive abilities decline with age.", "تتراجع القدرات المعرفية مع التقدم في السن.", "core", "B2", "AWL"],
  ["diminish", "verb", "يتناقص", "Muscle mass diminishes after age fifty.", "تتناقص الكتلة العضلية بعد سن الخمسين.", "extended", "C1", "AWL"],
  ["restore", "verb", "يستعيد", "Sleep helps restore the body's systems.", "يساعد النوم على استعادة أجهزة الجسم.", "core", "B2", "AWL"],
  ["undergo", "verb", "يخضع لـ", "Patients undergo regular health screenings.", "يخضع المرضى لفحوصات صحية منتظمة.", "core", "B2", "AWL"],
  ["phase", "noun", "مرحلة", "Each phase of life has unique challenges.", "لكل مرحلة من الحياة تحديات فريدة.", "core", "B2", "AWL"],
  ["interval", "noun", "فترة؛ فاصل", "Testing occurred at regular intervals.", "أُجريت الاختبارات على فترات منتظمة.", "extended", "B2", "AWL"],
  ["duration", "noun", "مدة", "The duration of the study was ten years.", "كانت مدة الدراسة عشر سنوات.", "extended", "B2", "AWL"],
  ["accumulate", "verb", "يتراكم", "Damage accumulates in cells over time.", "يتراكم الضرر في الخلايا بمرور الوقت.", "extended", "B2", "AWL"],
  ["expose", "verb", "يعرّض", "Sun exposure increases skin aging.", "يزيد التعرض للشمس من شيخوخة الجلد.", "core", "B2", "AWL"],
  ["trigger", "verb", "يُحفّز", "Inflammation can trigger premature aging.", "يمكن للالتهاب أن يحفّز الشيخوخة المبكرة.", "core", "B2", "AWL"],
  ["regulate", "verb", "يُنظّم", "Hormones regulate the aging process.", "تنظّم الهرمونات عملية الشيخوخة.", "core", "B2", "AWL"],
  ["sustain", "verb", "يحافظ على", "A healthy diet sustains energy levels.", "يحافظ النظام الغذائي الصحي على مستويات الطاقة.", "core", "B2", "AWL"],
  ["function", "noun", "وظيفة", "Brain function improves with mental exercise.", "تتحسن وظيفة الدماغ بالتمارين الذهنية.", "core", "B2", "AWL"]
];

const unit11 = [
  ["design", "verb", "يُصمّم", "Architects design energy-efficient buildings.", "يصمّم المهندسون المعماريون مبانٍ موفّرة للطاقة.", "core", "B1", "AWL"],
  ["construct", "verb", "يبني", "Workers construct buildings from recycled materials.", "يبني العمال مباني من مواد معاد تدويرها.", "core", "B2", "AWL"],
  ["structure", "noun", "هيكل؛ بناء", "The structure is designed to withstand earthquakes.", "صُمّم الهيكل لمقاومة الزلازل.", "core", "B2", "AWL"],
  ["modify", "verb", "يُعدّل", "Builders modify plans to reduce waste.", "يعدّل البنّاؤون المخططات لتقليل النفايات.", "core", "B2", "AWL"],
  ["innovate", "verb", "يبتكر", "The firm innovates with green materials.", "تبتكر الشركة بمواد صديقة للبيئة.", "extended", "C1", "AWL"],
  ["utilize", "verb", "يستخدم", "The building utilizes solar panels.", "يستخدم المبنى ألواحاً شمسية.", "core", "B2", "AWL"],
  ["generate", "verb", "يولّد", "Solar roofs generate clean electricity.", "تولّد الأسقف الشمسية كهرباء نظيفة.", "core", "B2", "AWL"],
  ["consume", "verb", "يستهلك", "Green buildings consume less energy.", "تستهلك المباني الخضراء طاقة أقل.", "core", "B2", "AWL"],
  ["efficient", "adjective", "فعّال؛ كفؤ", "The heating system is highly efficient.", "نظام التدفئة عالي الكفاءة.", "core", "B2", "AWL"],
  ["sustain", "verb", "يُدعم؛ يحافظ على", "Sustainable design sustains the environment.", "يحافظ التصميم المستدام على البيئة.", "core", "B2", "AWL"],
  ["maintain", "verb", "يصون", "Regular checks maintain building safety.", "تصون الفحوصات المنتظمة سلامة المبنى.", "core", "B2", "AWL"],
  ["conserve", "verb", "يحافظ على", "Insulation helps conserve heat.", "يساعد العزل في الحفاظ على الحرارة.", "extended", "B2", "AWL"],
  ["orient", "verb", "يوجّه", "The house is oriented toward the sun.", "يتوجه المنزل نحو الشمس.", "extended", "C1", "AWL"],
  ["adjust", "verb", "يضبط", "Smart systems adjust lighting automatically.", "تضبط الأنظمة الذكية الإضاءة تلقائياً.", "core", "B2", "AWL"],
  ["monitor", "verb", "يراقب", "Sensors monitor indoor air quality.", "تراقب المستشعرات جودة الهواء الداخلي.", "core", "B2", "AWL"],
  ["achieve", "verb", "يُحقّق", "The project achieved carbon neutrality.", "حقّق المشروع الحياد الكربوني.", "core", "B2", "AWL"],
  ["comply", "verb", "يمتثل", "Buildings must comply with green standards.", "يجب أن تمتثل المباني للمعايير الخضراء.", "extended", "C1", "AWL"],
  ["specify", "verb", "يُحدّد", "The architect specified low-emission materials.", "حدّد المعماري مواد منخفضة الانبعاثات.", "extended", "C1", "AWL"],
  ["dimension", "noun", "بُعد", "The dimensions of the room maximize natural light.", "أبعاد الغرفة تُعظّم الضوء الطبيعي.", "extended", "B2", "AWL"],
  ["layer", "noun", "طبقة", "Multiple layers of insulation reduce heat loss.", "تقلل طبقات العزل المتعددة فقدان الحرارة.", "core", "B2", "AWL"],
  ["component", "noun", "مكوّن", "Each component is sourced sustainably.", "يُحصَل على كل مكوّن بشكل مستدام.", "core", "B2", "AWL"],
  ["minimize", "verb", "يُقلّل", "Designers minimize environmental impact.", "يقلّل المصمّمون الأثر البيئي.", "core", "B2", "AWL"],
  ["maximize", "verb", "يُعظّم", "Large windows maximize daylight.", "تُعظّم النوافذ الكبيرة ضوء النهار.", "core", "B2", "AWL"],
  ["restore", "verb", "يُرمّم", "The team restored the historic building sustainably.", "رمّم الفريق المبنى التاريخي بشكل مستدام.", "core", "B2", "AWL"],
  ["regulate", "verb", "يُنظّم", "Ventilation systems regulate temperature.", "تنظّم أنظمة التهوية درجة الحرارة.", "core", "B2", "AWL"]
];

const unit12 = [
  ["detect", "verb", "يكتشف؛ يرصد", "Telescopes detect planets orbiting distant stars.", "ترصد التلسكوبات كواكب تدور حول نجوم بعيدة.", "core", "B2", "AWL"],
  ["observe", "verb", "يُراقب؛ يلاحظ", "Astronomers observe exoplanets using infrared light.", "يراقب الفلكيون الكواكب الخارجية بالأشعة تحت الحمراء.", "core", "B2", "AWL"],
  ["analyze", "verb", "يحلّل", "Scientists analyze the light from distant stars.", "يحلّل العلماء الضوء القادم من نجوم بعيدة.", "core", "B2", "AWL"],
  ["compute", "verb", "يحسب", "Supercomputers compute orbital mechanics.", "تحسب الحواسيب العملاقة ميكانيكا المدارات.", "extended", "B2", "AWL"],
  ["estimate", "verb", "يُقدّر", "Scientists estimate billions of exoplanets exist.", "يقدّر العلماء وجود مليارات الكواكب الخارجية.", "core", "B2", "AWL"],
  ["predict", "verb", "يتنبّأ", "Models predict which planets could support life.", "تتنبّأ النماذج بالكواكب التي قد تدعم الحياة.", "core", "B2", "AWL"],
  ["simulate", "verb", "يُحاكي", "Researchers simulate planetary atmospheres.", "يحاكي الباحثون الأغلفة الجوية للكواكب.", "extended", "B2", "AWL"],
  ["theory", "noun", "نظرية", "The theory explains planetary formation.", "تُفسّر النظرية تكوّن الكواكب.", "core", "B2", "AWL"],
  ["evidence", "noun", "دليل", "New evidence suggests water on the exoplanet.", "تشير أدلة جديدة إلى وجود ماء على الكوكب الخارجي.", "core", "B2", "AWL"],
  ["dimension", "noun", "بُعد", "The planet's dimensions are similar to Earth's.", "أبعاد الكوكب مشابهة لأبعاد الأرض.", "extended", "B2", "AWL"],
  ["parameter", "noun", "مُعامِل", "Key parameters include mass and temperature.", "تشمل المعاملات الرئيسية الكتلة والحرارة.", "extended", "C1", "AWL"],
  ["variable", "noun", "متغيّر", "Many variables affect habitability.", "تؤثر متغيرات كثيرة على قابلية السكن.", "core", "B2", "AWL"],
  ["constant", "noun", "ثابت", "The gravitational constant is key to calculations.", "الثابت الجاذبي أساسي في الحسابات.", "extended", "C1", "AWL"],
  ["nuclear", "adjective", "نووي", "Nuclear fusion powers stars.", "الاندماج النووي يزوّد النجوم بالطاقة.", "core", "B2", "AWL"],
  ["energy", "noun", "طاقة", "Stars emit enormous amounts of energy.", "تُصدر النجوم كميات هائلة من الطاقة.", "core", "B1", "NAWL"],
  ["core", "noun", "نواة؛ لبّ", "The planet's core may be molten iron.", "قد تكون نواة الكوكب من حديد منصهر.", "core", "B2", "AWL"],
  ["source", "noun", "مصدر", "The star is the primary source of light.", "النجم هو المصدر الأساسي للضوء.", "core", "B2", "AWL"],
  ["emit", "verb", "يُصدر؛ يبعث", "Hot planets emit infrared radiation.", "تُصدر الكواكب الحارة إشعاعاً تحت أحمر.", "extended", "C1", "AWL"],
  ["transmit", "verb", "ينقل؛ يبثّ", "Satellites transmit data back to Earth.", "تنقل الأقمار الصناعية البيانات إلى الأرض.", "extended", "B2", "AWL"],
  ["convert", "verb", "يحوّل", "Stars convert hydrogen into helium.", "تحوّل النجوم الهيدروجين إلى هيليوم.", "core", "B2", "AWL"],
  ["derive", "verb", "يُستخلص", "Conclusions are derived from spectral analysis.", "تُستخلص النتائج من التحليل الطيفي.", "extended", "B2", "AWL"],
  ["proportion", "noun", "نسبة", "The proportion of rocky planets is significant.", "نسبة الكواكب الصخرية كبيرة.", "core", "B2", "AWL"],
  ["ratio", "noun", "نسبة", "The ratio of gases determines atmosphere type.", "تحدّد نسبة الغازات نوع الغلاف الجوي.", "extended", "B2", "AWL"],
  ["hypothesis", "noun", "فرضية", "The hypothesis was confirmed by telescope data.", "تأكدت الفرضية ببيانات التلسكوب.", "core", "B2", "AWL"],
  ["phenomenon", "noun", "ظاهرة", "The transit phenomenon helps detect exoplanets.", "تساعد ظاهرة العبور في رصد الكواكب الخارجية.", "extended", "B2", "AWL"]
];

async function main() {
  const client = await pool.connect();
  const BATCH_ID = 22;

  const units = [
    { num: 1, data: unit1, name: "Bioethics" },
    { num: 2, data: unit2, name: "Deep Ocean" },
    { num: 3, data: unit3, name: "Food Security" },
    { num: 4, data: unit4, name: "Biomimicry" },
    { num: 5, data: unit5, name: "Migration" },
    { num: 6, data: unit6, name: "Cryptocurrency" },
    { num: 7, data: unit7, name: "Crowd Psychology" },
    { num: 8, data: unit8, name: "Forensic Science" },
    { num: 9, data: unit9, name: "Archaeology" },
    { num: 10, data: unit10, name: "Longevity" },
    { num: 11, data: unit11, name: "Sustainable Architecture" },
    { num: 12, data: unit12, name: "Exoplanets" },
  ];

  let grandTotal = 0;

  try {
    for (const u of units) {
      const count = await insertBatch(client, u.data, u.num, BATCH_ID);
      console.log(`Unit ${u.num} (${u.name}): ${count} words inserted (${u.data.length} provided)`);
      grandTotal += count;
    }

    console.log(`\n=== Total inserted: ${grandTotal} ===\n`);

    // Query final totals per unit
    const res = await client.query(
      `SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [BATCH_ID]
    );
    console.log("--- DB totals per unit (batch 22) ---");
    let dbTotal = 0;
    for (const row of res.rows) {
      console.log(`  Unit ${row.recommended_unit}: ${row.cnt} words`);
      dbTotal += parseInt(row.cnt);
    }
    console.log(`  Overall: ${dbTotal} words in DB for batch 22`);
  } catch(e) {
    console.error("Fatal error:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
