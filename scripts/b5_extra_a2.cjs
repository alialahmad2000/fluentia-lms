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
    // U4 Biomimicry - 35 niche terms
    const u4 = [
      ['biomimetic robotics', 'noun', 'الروبوتات المحاكية للطبيعة', 'Biomimetic robotics designs robots inspired by animal movement.', 'تصمم الروبوتات المحاكية للطبيعة روبوتات مستوحاة من حركة الحيوانات.', 'mastery', 'C1', 'COCA'],
      ['soft robotics', 'noun', 'الروبوتات المرنة', 'Soft robotics creates flexible machines that mimic biological organisms.', 'تصنع الروبوتات المرنة آلات مرنة تحاكي الكائنات البيولوجية.', 'extended', 'B2', 'COCA'],
      ['pneumatic actuator', 'noun', 'محرك هوائي', 'A pneumatic actuator uses compressed air to produce motion.', 'يستخدم المحرك الهوائي الهواء المضغوط لإنتاج الحركة.', 'mastery', 'C1', 'COCA'],
      ['dielectric elastomer', 'noun', 'مرن عازل كهربائي', 'A dielectric elastomer changes shape when voltage is applied.', 'يتغير شكل المرن العازل الكهربائي عند تطبيق الجهد.', 'mastery', 'C1', 'COCA'],
      ['shape memory polymer', 'noun', 'بوليمر ذاكرة الشكل', 'A shape memory polymer returns to its original form when heated.', 'يعود بوليمر ذاكرة الشكل إلى شكله الأصلي عند تسخينه.', 'mastery', 'C1', 'COCA'],
      ['piezoelectric harvester', 'noun', 'حاصد كهرضغطي', 'A piezoelectric harvester converts mechanical vibration into electricity.', 'يحول الحاصد الكهرضغطي الاهتزاز الميكانيكي إلى كهرباء.', 'mastery', 'C1', 'COCA'],
      ['triboelectric generator', 'noun', 'مولد كهربائي احتكاكي', 'A triboelectric generator produces power from friction between materials.', 'ينتج المولد الكهربائي الاحتكاكي الطاقة من الاحتكاك بين المواد.', 'mastery', 'C1', 'COCA'],
      ['thermoelectric module', 'noun', 'وحدة كهروحرارية', 'A thermoelectric module generates electricity from temperature differences.', 'تولد الوحدة الكهروحرارية الكهرباء من فروق درجات الحرارة.', 'mastery', 'C1', 'COCA'],
      ['osmotic power', 'noun', 'طاقة تناضحية', 'Osmotic power harnesses energy from saltwater mixing with freshwater.', 'تستغل الطاقة التناضحية الطاقة من اختلاط المياه المالحة بالعذبة.', 'mastery', 'C1', 'COCA'],
      ['tidal energy converter', 'noun', 'محول طاقة المد', 'A tidal energy converter captures energy from ocean tides.', 'يلتقط محول طاقة المد الطاقة من مد المحيط.', 'extended', 'B2', 'COCA'],
      ['wave energy converter', 'noun', 'محول طاقة الأمواج', 'A wave energy converter transforms wave motion into electrical power.', 'يحول محول طاقة الأمواج حركة الأمواج إلى طاقة كهربائية.', 'extended', 'B2', 'COCA'],
      ['oscillating water column', 'noun', 'عمود الماء المتذبذب', 'An oscillating water column uses wave action to compress air.', 'يستخدم عمود الماء المتذبذب حركة الأمواج لضغط الهواء.', 'mastery', 'C1', 'COCA'],
      ['vortex-induced vibration', 'noun', 'اهتزاز ناتج عن الدوامة', 'Vortex-induced vibration can be harnessed for energy harvesting.', 'يمكن تسخير الاهتزاز الناتج عن الدوامة لحصاد الطاقة.', 'mastery', 'C1', 'COCA'],
      ['undulatory locomotion', 'noun', 'الحركة الموجية', 'Undulatory locomotion is how snakes and eels move through their environment.', 'الحركة الموجية هي كيفية تحرك الثعابين والأنقليس عبر بيئتها.', 'mastery', 'C1', 'COCA'],
      ['peristaltic pump', 'noun', 'مضخة تمعجية', 'A peristaltic pump moves fluid by squeezing a flexible tube.', 'تحرك المضخة التمعجية السائل عن طريق ضغط أنبوب مرن.', 'mastery', 'C1', 'COCA'],
      ['flagellar motor', 'noun', 'محرك سوطي', 'The flagellar motor rotates bacterial flagella for propulsion.', 'يدير المحرك السوطي أسواط البكتيريا للدفع.', 'mastery', 'C1', 'COCA'],
      ['structural hierarchy', 'noun', 'التسلسل الهيكلي', 'Structural hierarchy in bone gives it both strength and flexibility.', 'يمنح التسلسل الهيكلي في العظم قوة ومرونة معاً.', 'extended', 'B2', 'COCA'],
      ['fractal branching', 'noun', 'التفرع الكسوري', 'Fractal branching patterns appear in trees, lungs, and rivers.', 'تظهر أنماط التفرع الكسوري في الأشجار والرئتين والأنهار.', 'extended', 'C1', 'COCA'],
      ['functionally graded material', 'noun', 'مادة متدرجة وظيفياً', 'A functionally graded material changes composition gradually across its volume.', 'تتغير تركيبة المادة المتدرجة وظيفياً تدريجياً عبر حجمها.', 'mastery', 'C1', 'COCA'],
      ['sandwich panel', 'noun', 'لوح ساندويتش', 'A sandwich panel has a lightweight core between two stiff skins.', 'يحتوي لوح الساندويتش على قلب خفيف الوزن بين طبقتين صلبتين.', 'extended', 'B2', 'COCA'],
      ['honeycomb core', 'noun', 'قلب خلية النحل', 'A honeycomb core provides high strength with minimal weight.', 'يوفر قلب خلية النحل قوة عالية بوزن أدنى.', 'extended', 'B2', 'COCA'],
      ['lattice structure', 'noun', 'هيكل شبكي', 'A lattice structure distributes loads efficiently across the material.', 'يوزع الهيكل الشبكي الأحمال بكفاءة عبر المادة.', 'extended', 'B2', 'COCA'],
      ['gyroid surface', 'noun', 'سطح جيرويد', 'A gyroid surface is a naturally occurring minimal surface found in butterfly wings.', 'سطح الجيرويد هو سطح أدنى طبيعي يوجد في أجنحة الفراشات.', 'mastery', 'C1', 'COCA'],
      ['auxetic metamaterial', 'noun', 'مادة فوقية أوكسيتية', 'An auxetic metamaterial expands laterally when stretched.', 'تتمدد المادة الفوقية الأوكسيتية جانبياً عند شدها.', 'mastery', 'C1', 'COCA'],
      ['negative Poisson ratio', 'noun', 'نسبة بواسون السالبة', 'A negative Poisson ratio makes materials thicken when pulled.', 'تجعل نسبة بواسون السالبة المواد تزداد سماكة عند سحبها.', 'mastery', 'C1', 'COCA'],
      ['acoustic metamaterial', 'noun', 'مادة فوقية صوتية', 'An acoustic metamaterial can bend sound waves around objects.', 'يمكن للمادة الفوقية الصوتية ثني الموجات الصوتية حول الأشياء.', 'mastery', 'C1', 'COCA'],
      ['programmable metamaterial', 'noun', 'مادة فوقية قابلة للبرمجة', 'A programmable metamaterial changes its properties on demand.', 'تغير المادة الفوقية القابلة للبرمجة خصائصها حسب الطلب.', 'mastery', 'C1', 'COCA'],
      ['deployable mechanism', 'noun', 'آلية قابلة للنشر', 'A deployable mechanism unfolds from a compact to an expanded state.', 'تتكشف الآلية القابلة للنشر من حالة مدمجة إلى حالة موسعة.', 'mastery', 'C1', 'COCA'],
      ['biomimetic propulsion', 'noun', 'دفع محاكي حيوياً', 'Biomimetic propulsion copies fish swimming for underwater vehicles.', 'يقلد الدفع المحاكي حيوياً سباحة الأسماك للمركبات تحت الماء.', 'mastery', 'C1', 'COCA'],
      ['cilia-driven flow', 'noun', 'تدفق بالأهداب', 'Cilia-driven flow moves mucus along respiratory passages.', 'يحرك التدفق بالأهداب المخاط على طول الممرات التنفسية.', 'mastery', 'C1', 'COCA'],
      ['self-similar structure', 'noun', 'بنية ذاتية التشابه', 'A self-similar structure repeats the same pattern at every scale.', 'تكرر البنية ذاتية التشابه نفس النمط في كل مقياس.', 'extended', 'C1', 'COCA'],
      ['multi-scale design', 'noun', 'تصميم متعدد المقاييس', 'Multi-scale design optimizes properties from nano to macro level.', 'يحسن التصميم متعدد المقاييس الخصائص من المستوى النانوي إلى الكلي.', 'extended', 'B2', 'COCA'],
      ['gradient property', 'noun', 'خاصية متدرجة', 'A gradient property varies smoothly across a material.', 'تتغير الخاصية المتدرجة بسلاسة عبر المادة.', 'extended', 'B2', 'COCA'],
      ['reconfigurable structure', 'noun', 'بنية قابلة لإعادة التشكيل', 'A reconfigurable structure can change its shape for different functions.', 'يمكن للبنية القابلة لإعادة التشكيل تغيير شكلها لوظائف مختلفة.', 'extended', 'B2', 'COCA'],
      ['jet propulsion mechanism', 'noun', 'آلية الدفع النفاث', 'Squid use a jet propulsion mechanism to escape predators quickly.', 'يستخدم الحبار آلية الدفع النفاث للهروب من المفترسين بسرعة.', 'extended', 'B2', 'COCA'],
    ];
    let r4 = await insertBatch(client, u4, 4, 32);
    console.log(`U4: ${r4} inserted`);

    // U5 Migration - 35 niche terms
    const u5 = [
      ['migration corridor', 'noun', 'ممر الهجرة', 'The migration corridor between Mexico and the US is the busiest in the world.', 'ممر الهجرة بين المكسيك والولايات المتحدة هو الأكثر ازدحاماً في العالم.', 'extended', 'B2', 'COCA'],
      ['migration hump', 'noun', 'قمة الهجرة', 'The migration hump theory predicts emigration increases before declining.', 'تتنبأ نظرية قمة الهجرة بزيادة الهجرة قبل انخفاضها.', 'mastery', 'C1', 'COCA'],
      ['demographic transition', 'noun', 'التحول الديموغرافي', 'Demographic transition describes the shift from high to low birth rates.', 'يصف التحول الديموغرافي الانتقال من معدلات ولادة مرتفعة إلى منخفضة.', 'extended', 'B2', 'COCA'],
      ['fertility decline', 'noun', 'انخفاض الخصوبة', 'Fertility decline accompanies economic development in most countries.', 'يرافق انخفاض الخصوبة التنمية الاقتصادية في معظم البلدان.', 'extended', 'B2', 'COCA'],
      ['rural depopulation', 'noun', 'هجرة الريف', 'Rural depopulation threatens farming communities worldwide.', 'تهدد هجرة الريف المجتمعات الزراعية في جميع أنحاء العالم.', 'extended', 'B2', 'COCA'],
      ['brain circulation', 'noun', 'دوران الكفاءات', 'Brain circulation benefits both sending and receiving countries.', 'يفيد دوران الكفاءات بلدان الإرسال والاستقبال على حد سواء.', 'mastery', 'C1', 'COCA'],
      ['global care chain', 'noun', 'سلسلة الرعاية العالمية', 'A global care chain links caregivers across national boundaries.', 'تربط سلسلة الرعاية العالمية مقدمي الرعاية عبر الحدود الوطنية.', 'mastery', 'C1', 'COCA'],
      ['feminization of migration', 'noun', 'تأنيث الهجرة', 'The feminization of migration reflects more women migrating independently.', 'يعكس تأنيث الهجرة هجرة المزيد من النساء بشكل مستقل.', 'mastery', 'C1', 'COCA'],
      ['unaccompanied minor', 'noun', 'قاصر غير مصحوب', 'An unaccompanied minor is a child migrant without a parent or guardian.', 'القاصر غير المصحوب هو طفل مهاجر بدون والد أو وصي.', 'extended', 'B2', 'COCA'],
      ['age assessment', 'noun', 'تقييم العمر', 'Age assessment determines whether an asylum seeker is a minor.', 'يحدد تقييم العمر ما إذا كان طالب اللجوء قاصراً.', 'extended', 'B2', 'COCA'],
      ['best interest determination', 'noun', 'تحديد المصلحة الفضلى', 'A best interest determination guides decisions about refugee children.', 'يوجه تحديد المصلحة الفضلى القرارات المتعلقة بأطفال اللاجئين.', 'extended', 'B2', 'AWL'],
      ['guardianship appointment', 'noun', 'تعيين الوصاية', 'A guardianship appointment protects unaccompanied migrant children.', 'يحمي تعيين الوصاية الأطفال المهاجرين غير المصحوبين.', 'extended', 'B2', 'COCA'],
      ['reception center', 'noun', 'مركز الاستقبال', 'The reception center provides initial housing for new arrivals.', 'يوفر مركز الاستقبال السكن الأولي للوافدين الجدد.', 'core', 'B1', 'COCA'],
      ['civic orientation', 'noun', 'التوجيه المدني', 'Civic orientation teaches newcomers about their host country.', 'يعلم التوجيه المدني الوافدين الجدد عن بلد الاستضافة.', 'extended', 'B2', 'COCA'],
      ['cultural mediation', 'noun', 'الوساطة الثقافية', 'Cultural mediation helps resolve conflicts between different communities.', 'تساعد الوساطة الثقافية في حل النزاعات بين المجتمعات المختلفة.', 'extended', 'B2', 'COCA'],
      ['community interpreter', 'noun', 'مترجم مجتمعي', 'A community interpreter facilitates communication in public services.', 'يسهل المترجم المجتمعي التواصل في الخدمات العامة.', 'core', 'B1', 'COCA'],
      ['intercultural mediator', 'noun', 'وسيط بين الثقافات', 'An intercultural mediator bridges understanding between cultures.', 'يبني الوسيط بين الثقافات التفاهم بين الثقافات.', 'extended', 'B2', 'COCA'],
      ['welcome program', 'noun', 'برنامج ترحيب', 'The welcome program pairs refugees with local volunteers.', 'يجمع برنامج الترحيب اللاجئين مع متطوعين محليين.', 'core', 'B1', 'COCA'],
      ['talent mobility', 'noun', 'تنقل المواهب', 'Talent mobility programs attract skilled workers to growing economies.', 'تجذب برامج تنقل المواهب العمال المهرة إلى الاقتصادات النامية.', 'extended', 'B2', 'COCA'],
      ['child migration', 'noun', 'هجرة الأطفال', 'Child migration raises concerns about education and welfare.', 'تثير هجرة الأطفال مخاوف بشأن التعليم والرفاهية.', 'core', 'B1', 'COCA'],
      ['migration transition theory', 'noun', 'نظرية التحول الهجري', 'Migration transition theory links emigration patterns to development stages.', 'تربط نظرية التحول الهجري أنماط الهجرة بمراحل التنمية.', 'mastery', 'C1', 'COCA'],
      ['transit country', 'noun', 'بلد العبور', 'Turkey serves as a transit country for many Syrian refugees.', 'تعمل تركيا كبلد عبور للعديد من اللاجئين السوريين.', 'core', 'B1', 'COCA'],
      ['origin country', 'noun', 'بلد المنشأ', 'The origin country often loses skilled workers to emigration.', 'غالباً ما يفقد بلد المنشأ العمال المهرة بسبب الهجرة.', 'core', 'B1', 'COCA'],
      ['destination country', 'noun', 'بلد المقصد', 'The destination country benefits from migrant labor and skills.', 'يستفيد بلد المقصد من عمالة ومهارات المهاجرين.', 'core', 'B1', 'COCA'],
      ['mixed migration flow', 'noun', 'تدفق الهجرة المختلطة', 'A mixed migration flow includes both refugees and economic migrants.', 'يشمل تدفق الهجرة المختلطة اللاجئين والمهاجرين الاقتصاديين.', 'extended', 'B2', 'COCA'],
      ['irregular migration', 'noun', 'الهجرة غير النظامية', 'Irregular migration occurs outside legal frameworks.', 'تحدث الهجرة غير النظامية خارج الأطر القانونية.', 'extended', 'B2', 'COCA'],
      ['regular migration', 'noun', 'الهجرة النظامية', 'Regular migration follows established legal pathways.', 'تتبع الهجرة النظامية المسارات القانونية المحددة.', 'core', 'B1', 'COCA'],
      ['forced migration', 'noun', 'الهجرة القسرية', 'Forced migration results from conflict, persecution, or disaster.', 'تنتج الهجرة القسرية عن الصراع أو الاضطهاد أو الكوارث.', 'core', 'B2', 'COCA'],
      ['voluntary migration', 'noun', 'الهجرة الطوعية', 'Voluntary migration is driven by personal choice and opportunity.', 'تدفع الاختيار الشخصي والفرصة الهجرة الطوعية.', 'core', 'B1', 'COCA'],
      ['internal displacement', 'noun', 'النزوح الداخلي', 'Internal displacement forces people to flee within their own country.', 'يجبر النزوح الداخلي الناس على الفرار داخل بلدهم.', 'extended', 'B2', 'COCA'],
      ['protracted refugee situation', 'noun', 'حالة اللاجئين المطولة', 'A protracted refugee situation lasts five years or more.', 'تستمر حالة اللاجئين المطولة خمس سنوات أو أكثر.', 'mastery', 'C1', 'COCA'],
      ['durable solution', 'noun', 'حل دائم', 'A durable solution provides long-term stability for refugees.', 'يوفر الحل الدائم استقراراً طويل الأمد للاجئين.', 'extended', 'B2', 'AWL'],
      ['local integration', 'noun', 'الاندماج المحلي', 'Local integration allows refugees to settle permanently in host countries.', 'يسمح الاندماج المحلي للاجئين بالاستقرار بشكل دائم في بلدان الاستضافة.', 'extended', 'B2', 'COCA'],
      ['third country resettlement', 'noun', 'إعادة التوطين في بلد ثالث', 'Third country resettlement transfers refugees to a new country.', 'تنقل إعادة التوطين في بلد ثالث اللاجئين إلى بلد جديد.', 'extended', 'B2', 'COCA'],
      ['burden sharing', 'noun', 'تقاسم الأعباء', 'Burden sharing distributes refugee responsibilities among nations.', 'يوزع تقاسم الأعباء مسؤوليات اللاجئين بين الدول.', 'extended', 'B2', 'COCA'],
    ];
    let r5 = await insertBatch(client, u5, 5, 32);
    console.log(`U5: ${r5} inserted`);

    // U6 Cryptocurrency - 35 niche terms
    const u6 = [
      ['maximal extractable value', 'noun', 'القيمة القصوى القابلة للاستخراج', 'Maximal extractable value represents profit from transaction ordering.', 'تمثل القيمة القصوى القابلة للاستخراج الربح من ترتيب المعاملات.', 'mastery', 'C1', 'COCA'],
      ['proposer-builder separation', 'noun', 'فصل المقترح عن الباني', 'Proposer-builder separation divides block construction from block proposal.', 'يفصل فصل المقترح عن الباني بناء الكتلة عن اقتراح الكتلة.', 'mastery', 'C1', 'COCA'],
      ['prediction market', 'noun', 'سوق التنبؤ', 'A prediction market lets users bet on future event outcomes.', 'يسمح سوق التنبؤ للمستخدمين بالمراهنة على نتائج الأحداث المستقبلية.', 'extended', 'B2', 'COCA'],
      ['quadratic voting', 'noun', 'التصويت التربيعي', 'Quadratic voting lets voters express preference intensity.', 'يسمح التصويت التربيعي للناخبين بالتعبير عن شدة التفضيل.', 'mastery', 'C1', 'COCA'],
      ['rage quit mechanism', 'noun', 'آلية الخروج الغاضب', 'A rage quit mechanism lets members withdraw funds from a DAO.', 'تسمح آلية الخروج الغاضب للأعضاء بسحب الأموال من منظمة لامركزية.', 'mastery', 'C1', 'COCA'],
      ['snapshot voting', 'noun', 'التصويت باللقطة', 'Snapshot voting captures token balances at a specific block.', 'يلتقط التصويت باللقطة أرصدة الرموز عند كتلة محددة.', 'extended', 'B2', 'COCA'],
      ['off-chain voting', 'noun', 'التصويت خارج السلسلة', 'Off-chain voting reduces gas costs for governance decisions.', 'يقلل التصويت خارج السلسلة تكاليف الغاز لقرارات الحوكمة.', 'extended', 'B2', 'COCA'],
      ['timelock controller', 'noun', 'مراقب القفل الزمني', 'A timelock controller delays execution of approved proposals.', 'يؤخر مراقب القفل الزمني تنفيذ المقترحات المعتمدة.', 'mastery', 'C1', 'COCA'],
      ['emergency shutdown', 'noun', 'إيقاف طوارئ', 'An emergency shutdown halts protocol operations during a crisis.', 'يوقف إيقاف الطوارئ عمليات البروتوكول أثناء الأزمة.', 'extended', 'B2', 'COCA'],
      ['circuit breaker', 'noun', 'قاطع دائرة', 'A circuit breaker pauses trading during extreme price swings.', 'يوقف قاطع الدائرة التداول أثناء تقلبات الأسعار الشديدة.', 'extended', 'B2', 'COCA'],
      ['protocol revenue', 'noun', 'إيرادات البروتوكول', 'Protocol revenue comes from fees charged on transactions.', 'تأتي إيرادات البروتوكول من الرسوم المفروضة على المعاملات.', 'extended', 'B2', 'COCA'],
      ['token buyback', 'noun', 'إعادة شراء الرمز', 'A token buyback reduces supply and increases token value.', 'تقلل إعادة شراء الرمز العرض وتزيد من قيمة الرمز.', 'extended', 'B2', 'COCA'],
      ['emission schedule', 'noun', 'جدول الإصدار', 'The emission schedule determines how new tokens are released over time.', 'يحدد جدول الإصدار كيفية إصدار الرموز الجديدة بمرور الوقت.', 'extended', 'B2', 'COCA'],
      ['tail emission', 'noun', 'إصدار ذيلي', 'Tail emission provides ongoing rewards after initial distribution ends.', 'يوفر الإصدار الذيلي مكافآت مستمرة بعد انتهاء التوزيع الأولي.', 'mastery', 'C1', 'COCA'],
      ['halving event', 'noun', 'حدث التنصيف', 'A halving event cuts mining rewards in half periodically.', 'يخفض حدث التنصيف مكافآت التعدين إلى النصف بشكل دوري.', 'extended', 'B2', 'COCA'],
      ['fee switch', 'noun', 'مفتاح الرسوم', 'A fee switch activates protocol fees for token holders.', 'ينشط مفتاح الرسوم رسوم البروتوكول لحاملي الرموز.', 'mastery', 'C1', 'COCA'],
      ['treasury management', 'noun', 'إدارة الخزينة', 'Treasury management allocates DAO funds for development and growth.', 'تخصص إدارة الخزينة أموال المنظمة اللامركزية للتطوير والنمو.', 'extended', 'B2', 'COCA'],
      ['block auction', 'noun', 'مزاد الكتلة', 'A block auction sells the right to build the next block.', 'يبيع مزاد الكتلة الحق في بناء الكتلة التالية.', 'mastery', 'C1', 'COCA'],
      ['Dutch auction mechanism', 'noun', 'آلية المزاد الهولندي', 'A Dutch auction mechanism starts with a high price that decreases.', 'تبدأ آلية المزاد الهولندي بسعر مرتفع ينخفض تدريجياً.', 'extended', 'B2', 'COCA'],
      ['sealed-bid auction', 'noun', 'مزاد العرض المختوم', 'A sealed-bid auction keeps all bids private until the deadline.', 'يبقي مزاد العرض المختوم جميع العروض سرية حتى الموعد النهائي.', 'extended', 'B2', 'COCA'],
      ['futarchy governance', 'noun', 'حوكمة المستقبليات', 'Futarchy governance uses prediction markets to guide policy decisions.', 'تستخدم حوكمة المستقبليات أسواق التنبؤ لتوجيه قرارات السياسة.', 'mastery', 'C1', 'COCA'],
      ['conviction voting', 'noun', 'التصويت بالقناعة', 'Conviction voting weights votes by how long tokens are staked.', 'يرجح التصويت بالقناعة الأصوات حسب مدة رهن الرموز.', 'mastery', 'C1', 'COCA'],
      ['holographic consensus', 'noun', 'إجماع ثلاثي الأبعاد', 'Holographic consensus uses staking to boost important proposals.', 'يستخدم الإجماع ثلاثي الأبعاد الرهن لتعزيز المقترحات المهمة.', 'mastery', 'C1', 'COCA'],
      ['optimistic governance', 'noun', 'حوكمة متفائلة', 'Optimistic governance assumes proposals pass unless challenged.', 'تفترض الحوكمة المتفائلة أن المقترحات تمر ما لم يتم الطعن فيها.', 'mastery', 'C1', 'COCA'],
      ['guardian multisig', 'noun', 'توقيع متعدد الحراس', 'A guardian multisig requires multiple approvals for critical actions.', 'يتطلب التوقيع متعدد الحراس موافقات متعددة للإجراءات الحرجة.', 'mastery', 'C1', 'COCA'],
      ['rate limiter', 'noun', 'محدد المعدل', 'A rate limiter caps the number of transactions per time period.', 'يحدد محدد المعدل عدد المعاملات لكل فترة زمنية.', 'extended', 'B2', 'COCA'],
      ['token burn mechanism', 'noun', 'آلية حرق الرمز', 'A token burn mechanism permanently removes tokens from circulation.', 'تزيل آلية حرق الرمز الرموز بشكل دائم من التداول.', 'extended', 'B2', 'COCA'],
      ['order flow auction', 'noun', 'مزاد تدفق الأوامر', 'An order flow auction routes trades to the best execution venue.', 'يوجه مزاد تدفق الأوامر التداولات إلى أفضل مكان للتنفيذ.', 'mastery', 'C1', 'COCA'],
      ['batch auction', 'noun', 'مزاد دفعات', 'A batch auction processes multiple orders at a single clearing price.', 'يعالج مزاد الدفعات أوامر متعددة بسعر تسوية واحد.', 'mastery', 'C1', 'COCA'],
      ['combinatorial auction', 'noun', 'مزاد توافقي', 'A combinatorial auction allows bidding on bundles of items.', 'يسمح المزاد التوافقي بالمزايدة على حزم من العناصر.', 'mastery', 'C1', 'COCA'],
      ['reverse auction', 'noun', 'مزاد عكسي', 'A reverse auction lets sellers compete for a buyer.', 'يسمح المزاد العكسي للبائعين بالتنافس على مشتر.', 'extended', 'B2', 'COCA'],
      ['on-chain execution', 'noun', 'التنفيذ على السلسلة', 'On-chain execution records governance decisions permanently on the blockchain.', 'يسجل التنفيذ على السلسلة قرارات الحوكمة بشكل دائم على البلوكتشين.', 'extended', 'B2', 'COCA'],
      ['aragon DAO', 'noun', 'منظمة أراغون اللامركزية', 'Aragon DAO provides tools for creating decentralized organizations.', 'توفر منظمة أراغون اللامركزية أدوات لإنشاء منظمات لامركزية.', 'mastery', 'C1', 'COCA'],
      ['dark pool trading', 'noun', 'التداول في المجمعات المظلمة', 'Dark pool trading hides large orders from the public market.', 'يخفي التداول في المجمعات المظلمة الأوامر الكبيرة عن السوق العام.', 'mastery', 'C1', 'COCA'],
      ['payment channel', 'noun', 'قناة الدفع', 'A payment channel enables instant off-chain transactions.', 'تتيح قناة الدفع معاملات فورية خارج السلسلة.', 'extended', 'B2', 'COCA'],
    ];
    let r6 = await insertBatch(client, u6, 6, 32);
    console.log(`U6: ${r6} inserted`);

    // Print totals
    const total = await client.query('SELECT COUNT(*) AS total FROM vocab_staging_l4');
    console.log('\nTotal staged:', total.rows[0].total);
    const perUnit = await client.query('SELECT recommended_unit, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit');
    perUnit.rows.forEach(r => console.log('  U' + r.recommended_unit + ':', r.cnt));
  } finally { client.release(); await pool.end(); }
}
run().catch(e => { console.error(e); process.exit(1); });
