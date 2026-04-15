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

const BATCH_ID = 23;

// ============ UNIT 1: Bioethics ============
const unit1 = [
  ["biobank","noun","بنك حيوي لتخزين العينات البيولوجية","The biobank stores tissue samples for future research.","يخزن البنك الحيوي عينات الأنسجة للأبحاث المستقبلية.","extended","C1","COCA"],
  ["cryopreservation","noun","الحفظ بالتبريد","Cryopreservation allows cells to remain viable for decades.","يسمح الحفظ بالتبريد للخلايا بالبقاء حية لعقود.","mastery","C1","COCA"],
  ["epigenome","noun","الإبيجينوم؛ مجموعة التعديلات فوق الجينية","The epigenome influences how genes are expressed without altering DNA.","يؤثر الإبيجينوم على كيفية التعبير الجيني دون تغيير الحمض النووي.","mastery","C1","COCA"],
  ["xenotransplant","noun","زراعة أعضاء من كائن لآخر مختلف النوع","Xenotransplant research focuses on pig-to-human organ transfers.","يركز بحث زراعة الأعضاء عبر الأنواع على نقل الأعضاء من الخنازير إلى البشر.","mastery","C1","COCA"],
  ["pharmacogenomics","noun","علم الجينوم الدوائي","Pharmacogenomics tailors drug prescriptions to individual genetic profiles.","يخصص علم الجينوم الدوائي الوصفات الطبية وفقاً للملف الجيني الفردي.","mastery","C1","AWL"],
  ["bioinformatics","noun","المعلوماتية الحيوية","Bioinformatics uses algorithms to analyze biological data.","تستخدم المعلوماتية الحيوية الخوارزميات لتحليل البيانات البيولوجية.","extended","C1","AWL"],
  ["proteomics","noun","علم البروتيوميات","Proteomics studies the entire set of proteins in a cell.","يدرس علم البروتيوميات مجموعة البروتينات الكاملة في الخلية.","mastery","C1","COCA"],
  ["metabolomics","noun","علم الأيضيات","Metabolomics measures small molecules produced during metabolism.","يقيس علم الأيضيات الجزيئات الصغيرة الناتجة عن عملية الأيض.","mastery","C1","COCA"],
  ["bioavailability","noun","التوافر الحيوي","The bioavailability of the drug determines how much reaches the bloodstream.","يحدد التوافر الحيوي للدواء مقدار ما يصل إلى مجرى الدم.","extended","B2","COCA"],
  ["cytoplasm","noun","السيتوبلازم؛ الهيولى","The cytoplasm contains organelles that perform cellular functions.","يحتوي السيتوبلازم على عضيات تؤدي وظائف خلوية.","extended","B2","COCA"],
  ["ribosome","noun","الريبوسوم","Ribosomes translate messenger RNA into protein chains.","تترجم الريبوسومات الحمض النووي الريبي المرسال إلى سلاسل بروتينية.","extended","C1","COCA"],
  ["mitosis","noun","الانقسام المتساوي","Mitosis produces two genetically identical daughter cells.","ينتج الانقسام المتساوي خليتين ابنتين متطابقتين جينياً.","extended","B2","COCA"],
  ["meiosis","noun","الانقسام المنصف","Meiosis reduces the chromosome number by half for reproduction.","يقلل الانقسام المنصف عدد الكروموسومات إلى النصف من أجل التكاثر.","extended","B2","COCA"],
  ["apoptosis","noun","الموت الخلوي المبرمج","Apoptosis eliminates damaged cells in an orderly process.","يزيل الموت الخلوي المبرمج الخلايا التالفة بعملية منظمة.","mastery","C1","COCA"],
  ["necrosis","noun","النخر؛ موت الأنسجة","Necrosis occurs when tissue dies due to injury or lack of blood supply.","يحدث النخر عندما تموت الأنسجة بسبب إصابة أو نقص إمداد الدم.","extended","C1","COCA"],
  ["fibroblast","noun","خلية ليفية","Fibroblasts produce collagen to repair wounded tissue.","تنتج الخلايا الليفية الكولاجين لإصلاح الأنسجة المجروحة.","mastery","C1","COCA"],
  ["lymphocyte","noun","خلية لمفاوية","Lymphocytes are white blood cells crucial for immune defense.","الخلايا اللمفاوية هي كريات دم بيضاء ضرورية للدفاع المناعي.","extended","B2","COCA"],
  ["platelet","noun","صفيحة دموية","Platelets aggregate at wound sites to stop bleeding.","تتجمع الصفائح الدموية في مواقع الجروح لوقف النزيف.","extended","B2","COCA"],
  ["hemoglobin","noun","الهيموغلوبين","Hemoglobin carries oxygen from the lungs to body tissues.","ينقل الهيموغلوبين الأكسجين من الرئتين إلى أنسجة الجسم.","extended","B2","COCA"],
  ["dialysis","noun","غسيل الكلى","Dialysis filters waste products when the kidneys fail.","يرشح غسيل الكلى الفضلات عندما تفشل الكلى.","extended","B2","COCA"],
  ["catheter","noun","قسطرة","The nurse inserted a catheter to drain fluid from the bladder.","أدخلت الممرضة قسطرة لتصريف السوائل من المثانة.","extended","B2","COCA"],
  ["stent","noun","دعامة","A stent was placed to keep the blocked artery open.","وُضعت دعامة لإبقاء الشريان المسدود مفتوحاً.","extended","B2","COCA"],
  ["defibrillator","noun","جهاز إزالة الرجفان","The paramedic used a defibrillator to restore normal heart rhythm.","استخدم المسعف جهاز إزالة الرجفان لاستعادة نظم القلب الطبيعي.","extended","B2","COCA"],
  ["prosthesis","noun","طرف اصطناعي؛ بديل صناعي","The prosthesis allowed her to walk again after the amputation.","سمح لها الطرف الاصطناعي بالمشي مجدداً بعد البتر.","extended","C1","COCA"],
  ["orthopedic","adjective","متعلق بجراحة العظام","He visited an orthopedic surgeon for his knee injury.","زار جراح عظام لعلاج إصابة ركبته.","extended","B2","COCA"],
];

// ============ UNIT 2: Deep Ocean ============
const unit2 = [
  ["bathypelagic","adjective","متعلق بمنطقة أعماق البحار المظلمة","Bathypelagic organisms survive without any sunlight.","تعيش الكائنات في المنطقة العميقة المظلمة بدون أي ضوء شمس.","mastery","C1","COCA"],
  ["mesopelagic","adjective","متعلق بمنطقة الشفق البحرية","The mesopelagic zone receives only faint traces of light.","تتلقى منطقة الشفق البحرية آثاراً خافتة فقط من الضوء.","mastery","C1","COCA"],
  ["hadal","adjective","متعلق بأعمق خنادق المحيط","Hadal trenches plunge deeper than ten thousand meters.","تغوص الخنادق الحدالية أعمق من عشرة آلاف متر.","mastery","C1","COCA"],
  ["cephalopod","noun","رأسيات الأرجل","Cephalopods such as octopuses display remarkable intelligence.","تُظهر رأسيات الأرجل مثل الأخطبوط ذكاءً ملحوظاً.","extended","B2","COCA"],
  ["echinoderm","noun","شوكيات الجلد","Echinoderms include starfish, sea urchins, and sea cucumbers.","تشمل شوكيات الجلد نجم البحر وقنافذ البحر وخيار البحر.","extended","C1","COCA"],
  ["cnidarian","noun","لاسعات؛ من القراصات","Cnidarians use stinging cells to capture prey.","تستخدم اللاسعات خلايا لاسعة لالتقاط الفريسة.","mastery","C1","COCA"],
  ["dinoflagellate","noun","سوطيات دوّارة","Dinoflagellates cause red tides that poison shellfish.","تسبب السوطيات الدوّارة المد الأحمر الذي يسمم المحار.","mastery","C1","COCA"],
  ["diatom","noun","دياتوم؛ طحلب سيليكاتي","Diatoms produce roughly a quarter of the world's oxygen.","ينتج الدياتوم ما يقارب ربع أكسجين العالم.","extended","C1","COCA"],
  ["radiolarian","noun","شعاعيات","Radiolarian skeletons accumulate as deep-sea ooze on the ocean floor.","تتراكم هياكل الشعاعيات كرواسب في قاع المحيط.","mastery","C1","COCA"],
  ["foraminifera","noun","المنخربات","Foraminifera fossils help scientists reconstruct ancient ocean temperatures.","تساعد أحافير المنخربات العلماء في إعادة بناء درجات حرارة المحيطات القديمة.","mastery","C1","COCA"],
  ["turbidity","noun","العكارة","High turbidity reduces light penetration in coastal waters.","تقلل العكارة العالية من نفاذ الضوء في المياه الساحلية.","extended","C1","AWL"],
  ["upwelling","noun","تيار صاعد","Upwelling brings nutrient-rich water to the surface.","يجلب التيار الصاعد المياه الغنية بالمغذيات إلى السطح.","extended","B2","COCA"],
  ["downwelling","noun","تيار هابط","Downwelling pushes surface water toward the deep ocean.","يدفع التيار الهابط مياه السطح نحو أعماق المحيط.","extended","C1","COCA"],
  ["eutrophication","noun","التخثث؛ الإثراء الغذائي","Eutrophication from farm runoff creates oxygen-depleted dead zones.","يُنشئ التخثث الناتج عن جريان المزارع مناطق ميتة منضبة الأكسجين.","extended","C1","AWL"],
  ["anoxic","adjective","خالٍ من الأكسجين","Anoxic conditions at the seabed prevent most organisms from surviving.","تمنع الظروف الخالية من الأكسجين في قاع البحر معظم الكائنات من البقاء.","extended","C1","COCA"],
  ["hypoxic","adjective","ناقص الأكسجين","Hypoxic waters stress fish populations and reduce biodiversity.","تُجهد المياه ناقصة الأكسجين مجموعات الأسماك وتقلل التنوع البيولوجي.","extended","C1","COCA"],
  ["thermohaline","adjective","حراري ملحي","The thermohaline circulation drives global ocean currents.","تُحرك الدورة الحرارية الملحية التيارات المحيطية العالمية.","mastery","C1","COCA"],
  ["polynya","noun","بولينيا؛ فجوة مائية في الجليد","A polynya forms when wind pushes sea ice away from the coast.","تتشكل البولينيا عندما تدفع الرياح الجليد البحري بعيداً عن الساحل.","mastery","C1","COCA"],
  ["gyre","noun","دوامة محيطية كبرى","The Pacific gyre traps enormous quantities of plastic waste.","تحبس الدوامة المحيطية في المحيط الهادئ كميات هائلة من النفايات البلاستيكية.","extended","C1","COCA"],
  ["isopod","noun","متساوي الأرجل","Giant isopods scavenge on carcasses that sink to the deep floor.","تتغذى متساويات الأرجل العملاقة على الجثث التي تغرق إلى القاع العميق.","extended","C1","COCA"],
  ["amphipod","noun","مزدوج الأرجل","Amphipods thrive even in the deepest ocean trenches.","تزدهر مزدوجات الأرجل حتى في أعمق خنادق المحيط.","mastery","C1","COCA"],
  ["copepod","noun","مجدافيات الأرجل","Copepods form a critical link in marine food chains.","تشكل مجدافيات الأرجل حلقة حاسمة في السلاسل الغذائية البحرية.","extended","C1","COCA"],
  ["gastropod","noun","بطنيات القدم","Gastropods include snails, slugs, and sea butterflies.","تشمل بطنيات القدم الحلزونات والبزاقات وفراشات البحر.","extended","B2","COCA"],
  ["bivalve","noun","ذوات الصدفتين","Bivalves filter large volumes of water to obtain food.","ترشح ذوات الصدفتين كميات كبيرة من الماء للحصول على الغذاء.","extended","B2","COCA"],
  ["bryozoan","noun","الحزازيات المائية","Bryozoan colonies encrust rocks and ship hulls alike.","تتقشر مستعمرات الحزازيات المائية على الصخور وهياكل السفن.","mastery","C1","COCA"],
];

// ============ UNIT 3: Food Security ============
const unit3 = [
  ["mycorrhiza","noun","فطريات جذرية تكافلية","Mycorrhiza networks help plants share nutrients underground.","تساعد شبكات الفطريات الجذرية النباتات في تبادل المغذيات تحت الأرض.","extended","C1","COCA"],
  ["rhizobium","noun","بكتيريا جذرية مثبتة للنيتروجين","Rhizobium bacteria fix atmospheric nitrogen in legume roots.","تثبت بكتيريا الريزوبيوم النيتروجين الجوي في جذور البقوليات.","mastery","C1","COCA"],
  ["photoperiod","noun","فترة الإضاءة اليومية","The photoperiod determines when certain crops flower.","تحدد فترة الإضاءة اليومية موعد إزهار بعض المحاصيل.","extended","C1","COCA"],
  ["vernalization","noun","الارتباع؛ معالجة البرودة للإزهار","Vernalization exposes seeds to cold to trigger spring flowering.","يعرّض الارتباع البذور للبرودة لتحفيز الإزهار الربيعي.","mastery","C1","COCA"],
  ["allelopathy","noun","التأثير المتبادل بين النباتات كيميائياً","Allelopathy occurs when one plant releases chemicals that inhibit neighbors.","يحدث التأثير الأليلوباثي عندما يطلق نبات مواد كيميائية تثبط الجيران.","mastery","C1","COCA"],
  ["salinization","noun","التملح","Salinization of irrigated farmland reduces crop yields dramatically.","يقلل تملح الأراضي الزراعية المروية من غلة المحاصيل بشكل كبير.","extended","C1","AWL"],
  ["leaching","noun","الغسل؛ ترشيح التربة","Leaching washes essential minerals out of the topsoil.","يغسل الترشيح المعادن الأساسية من التربة السطحية.","extended","B2","COCA"],
  ["nitrification","noun","النترجة","Nitrification converts ammonia into nitrates usable by plants.","تحوّل النترجة الأمونيا إلى نترات يمكن للنباتات استخدامها.","extended","C1","COCA"],
  ["denitrification","noun","نزع النيتروجين","Denitrification returns nitrogen gas to the atmosphere from soil.","يعيد نزع النيتروجين غاز النيتروجين إلى الغلاف الجوي من التربة.","mastery","C1","COCA"],
  ["aflatoxin","noun","أفلاتوكسين؛ سم فطري","Aflatoxin contamination in grain poses serious health risks.","يشكل تلوث الحبوب بالأفلاتوكسين مخاطر صحية خطيرة.","extended","C1","COCA"],
  ["mycotoxin","noun","سم فطري","Mycotoxins produced by mold can render stored food unsafe.","يمكن للسموم الفطرية التي ينتجها العفن أن تجعل الطعام المخزن غير آمن.","extended","C1","COCA"],
  ["endosperm","noun","سويداء البذرة","The endosperm provides nutrients for the developing plant embryo.","توفر سويداء البذرة المغذيات لجنين النبات النامي.","extended","C1","COCA"],
  ["gluten","noun","الغلوتين","Gluten gives bread dough its elastic, chewy texture.","يمنح الغلوتين عجينة الخبز قوامها المرن والمطاطي.","extended","B2","COCA"],
  ["cellulose","noun","السليلوز","Cellulose forms the rigid structural walls of plant cells.","يشكل السليلوز الجدران البنيوية الصلبة للخلايا النباتية.","extended","B2","COCA"],
  ["lignin","noun","اللجنين","Lignin strengthens wood and makes it resistant to decay.","يقوي اللجنين الخشب ويجعله مقاوماً للتحلل.","extended","C1","COCA"],
  ["pectin","noun","البكتين","Pectin is added to fruit preserves to help them set firmly.","يُضاف البكتين إلى مربيات الفاكهة لمساعدتها على التماسك.","extended","B2","COCA"],
  ["starch","noun","النشا","Starch is the main energy reserve stored in potato tubers.","النشا هو مخزون الطاقة الرئيسي المخزن في درنات البطاطا.","extended","B2","COCA"],
  ["sucrose","noun","السكروز","Sucrose is extracted from sugar cane and sugar beet.","يُستخرج السكروز من قصب السكر والشمندر السكري.","extended","B2","COCA"],
  ["glucose","noun","الغلوكوز؛ سكر العنب","Glucose is the primary fuel used by cells for energy.","الغلوكوز هو الوقود الأساسي الذي تستخدمه الخلايا للطاقة.","extended","B2","COCA"],
  ["fructose","noun","الفركتوز؛ سكر الفاكهة","Fructose occurs naturally in fruits and honey.","يوجد الفركتوز طبيعياً في الفواكه والعسل.","extended","B2","COCA"],
  ["lactose","noun","اللاكتوز؛ سكر الحليب","Many adults lack the enzyme needed to digest lactose.","يفتقر كثير من البالغين إلى الإنزيم اللازم لهضم اللاكتوز.","extended","B2","COCA"],
  ["casein","noun","الكازين؛ بروتين الحليب","Casein accounts for about eighty percent of milk protein.","يشكل الكازين حوالي ثمانين بالمئة من بروتين الحليب.","extended","C1","COCA"],
  ["whey","noun","مصل اللبن","Whey protein supplements are popular among athletes.","مكملات بروتين مصل اللبن شائعة بين الرياضيين.","extended","B2","COCA"],
  ["rennet","noun","المنفحة؛ إنزيم تخثير الحليب","Traditional cheese making uses animal rennet to curdle milk.","يستخدم صنع الجبن التقليدي المنفحة الحيوانية لتخثير الحليب.","mastery","C1","COCA"],
  ["vermiculture","noun","تربية الديدان لإنتاج السماد","Vermiculture converts organic waste into nutrient-rich compost.","تحوّل تربية الديدان النفايات العضوية إلى سماد غني بالمغذيات.","mastery","C1","COCA"],
];

// ============ UNIT 4: Biomimicry ============
const unit4 = [
  ["biomaterial","noun","مادة حيوية","The biomaterial was designed to be absorbed safely by the body.","صُممت المادة الحيوية ليمتصها الجسم بأمان.","extended","C1","COCA"],
  ["biocompatible","adjective","متوافق حيوياً","Titanium implants are biocompatible and rarely cause rejection.","زراعات التيتانيوم متوافقة حيوياً ونادراً ما تسبب الرفض.","extended","C1","COCA"],
  ["piezoelectric","adjective","كهرضغطي","Piezoelectric materials generate electricity when mechanically stressed.","تولد المواد الكهرضغطية كهرباء عند تعرضها لضغط ميكانيكي.","mastery","C1","COCA"],
  ["photonic","adjective","فوتوني؛ متعلق بالضوئيات","Photonic crystals in butterfly wings create vivid iridescent colors.","تُنتج البلورات الفوتونية في أجنحة الفراشات ألواناً قزحية زاهية.","mastery","C1","COCA"],
  ["metamaterial","noun","مادة خارقة مصنعة","Metamaterials can bend electromagnetic waves in unnatural directions.","يمكن للمواد الخارقة ثني الموجات الكهرومغناطيسية في اتجاهات غير طبيعية.","mastery","C1","COCA"],
  ["auxetic","adjective","مُتمدد عرضياً عند الشد","Auxetic foams expand sideways when stretched, unlike normal materials.","تتمدد الرغوات المتمددة جانبياً عند شدها، بخلاف المواد العادية.","mastery","C1","COCA"],
  ["anisotropic","adjective","متباين الخواص","Wood is anisotropic because its strength varies with grain direction.","الخشب متباين الخواص لأن قوته تتغير حسب اتجاه الألياف.","mastery","C1","AWL"],
  ["viscoelastic","adjective","لزج مرن","Viscoelastic polymers return slowly to their original shape after deformation.","تعود البوليمرات اللزجة المرنة ببطء إلى شكلها الأصلي بعد التشوه.","mastery","C1","COCA"],
  ["superhydrophobic","adjective","فائق الكراهية للماء","Superhydrophobic coatings cause water droplets to roll off instantly.","تجعل الطلاءات فائقة الكراهية للماء قطرات الماء تتدحرج فوراً.","mastery","C1","COCA"],
  ["oleophobic","adjective","طارد للزيوت","Oleophobic screen coatings resist fingerprint smudges.","تقاوم طلاءات الشاشات الطاردة للزيوت بصمات الأصابع.","mastery","C1","COCA"],
  ["tribology","noun","علم الاحتكاك","Tribology studies friction, wear, and lubrication between surfaces.","يدرس علم الاحتكاك التآكل والتزييت بين الأسطح.","mastery","C1","COCA"],
  ["biomechanics","noun","الميكانيكا الحيوية","Biomechanics analyzes the forces acting on the human body during motion.","تحلل الميكانيكا الحيوية القوى المؤثرة على جسم الإنسان أثناء الحركة.","extended","B2","AWL"],
  ["morphogenesis","noun","التشكل؛ تكوين الأعضاء","Morphogenesis guides the development of tissue shapes in embryos.","يوجه التشكل تطور أشكال الأنسجة في الأجنة.","mastery","C1","COCA"],
  ["phyllotaxis","noun","ترتيب الأوراق حول الساق","Phyllotaxis in sunflowers follows a precise mathematical spiral.","يتبع ترتيب الأوراق في دوار الشمس لولباً رياضياً دقيقاً.","mastery","C1","COCA"],
  ["tessellation","noun","تبليط؛ رصف بلا فجوات","Tessellation patterns cover surfaces without gaps or overlaps.","تغطي أنماط التبليط الأسطح بدون فجوات أو تداخلات.","extended","B2","NAWL"],
  ["fractal","noun","كسيري","Fractal geometry describes the branching patterns of blood vessels.","تصف الهندسة الكسيرية أنماط تفرع الأوعية الدموية.","extended","B2","COCA"],
  ["dendrite","noun","تغصن؛ تفرع شجيري","Dendrites in neurons receive electrical signals from other cells.","تستقبل التغصنات في الخلايا العصبية إشارات كهربائية من خلايا أخرى.","extended","C1","COCA"],
  ["chitin","noun","الكيتين","Chitin forms the exoskeleton of insects and crustaceans.","يشكل الكيتين الهيكل الخارجي للحشرات والقشريات.","extended","C1","COCA"],
  ["keratin","noun","الكيراتين","Keratin is the tough protein found in hair, nails, and feathers.","الكيراتين هو البروتين القوي الموجود في الشعر والأظافر والريش.","extended","B2","COCA"],
  ["collagen","noun","الكولاجين","Collagen provides structural support to skin, bones, and tendons.","يوفر الكولاجين الدعم البنيوي للجلد والعظام والأوتار.","extended","B2","COCA"],
  ["nacre","noun","عرق اللؤلؤ","Nacre lines the inner surface of mollusk shells with a lustrous coating.","يبطن عرق اللؤلؤ السطح الداخلي لأصداف الرخويات بطبقة لامعة.","mastery","C1","COCA"],
  ["setae","noun","أشواك دقيقة؛ شعيرات","Gecko setae enable the lizard to climb smooth vertical surfaces.","تمكّن الشعيرات الدقيقة الوزغة من تسلق الأسطح الملساء العمودية.","mastery","C1","COCA"],
  ["papillae","noun","حليمات","Papillae on the tongue contain clusters of taste receptor cells.","تحتوي الحليمات على اللسان على مجموعات من خلايا مستقبلات التذوق.","extended","C1","COCA"],
  ["cilia","noun","أهداب","Cilia lining the airways sweep mucus and debris upward.","تكنس الأهداب المبطنة للمجاري الهوائية المخاط والشوائب نحو الأعلى.","extended","B2","COCA"],
  ["iridescence","noun","تقزّح لوني","The iridescence of soap bubbles results from thin-film interference.","ينتج التقزح اللوني لفقاعات الصابون عن تداخل الأغشية الرقيقة.","extended","C1","COCA"],
];

// ============ UNIT 5: Migration ============
const unit5 = [
  ["denizenship","noun","حق الإقامة الدائمة","Denizenship grants most citizen rights except voting in national elections.","يمنح حق الإقامة الدائمة معظم حقوق المواطنة باستثناء التصويت في الانتخابات الوطنية.","mastery","C1","AWL"],
  ["transmigrant","noun","مهاجر عابر","Transmigrants maintain active ties in both their home and host countries.","يحافظ المهاجرون العابرون على روابط نشطة في بلدانهم الأصلية والمضيفة.","mastery","C1","COCA"],
  ["sojourner","noun","مقيم مؤقت","The sojourner planned to return home after completing her studies.","خططت المقيمة المؤقتة للعودة إلى وطنها بعد إكمال دراستها.","extended","C1","COCA"],
  ["returnee","noun","عائد؛ مُعاد","Returnees often struggle to reintegrate into their home communities.","غالباً ما يكافح العائدون للاندماج مجدداً في مجتمعاتهم الأصلية.","extended","B2","COCA"],
  ["asylee","noun","لاجئ حاصل على حق اللجوء","An asylee has been granted protection after proving persecution.","حصل اللاجئ على الحماية بعد إثبات تعرضه للاضطهاد.","extended","C1","COCA"],
  ["statelessness","noun","انعدام الجنسية","Statelessness leaves millions without access to basic legal rights.","يترك انعدام الجنسية الملايين بدون حقوق قانونية أساسية.","extended","C1","AWL"],
  ["xenophilia","noun","حب الأجانب والثقافات الأخرى","Xenophilia drives curiosity about foreign customs and traditions.","يحرك حب الأجانب الفضول تجاه العادات والتقاليد الأجنبية.","mastery","C1","COCA"],
  ["ethnocentrism","noun","التمركز العرقي","Ethnocentrism judges other cultures by the standards of one's own.","يحكم التمركز العرقي على الثقافات الأخرى بمعايير ثقافة المرء.","extended","C1","AWL"],
  ["nativism","noun","حركة تفضيل السكان الأصليين","Nativism surged during periods of high immigration.","ازدادت حركة تفضيل السكان الأصليين خلال فترات الهجرة المرتفعة.","extended","C1","COCA"],
  ["pluralism","noun","التعددية","Pluralism encourages the coexistence of diverse beliefs in one society.","تشجع التعددية تعايش المعتقدات المتنوعة في مجتمع واحد.","extended","B2","AWL"],
  ["cosmopolitanism","noun","الكوزموبوليتانية؛ النزعة العالمية","Cosmopolitanism holds that all humans belong to a single moral community.","تعتبر النزعة العالمية أن جميع البشر ينتمون إلى مجتمع أخلاقي واحد.","extended","C1","AWL"],
  ["transnationalism","noun","العبر وطنية","Transnationalism describes migrants who live across multiple national borders.","تصف العبر وطنية المهاجرين الذين يعيشون عبر حدود وطنية متعددة.","extended","C1","AWL"],
  ["supranational","adjective","فوق وطني","The EU is a supranational body whose laws override national legislation.","الاتحاد الأوروبي هيئة فوق وطنية تتجاوز قوانينها التشريعات الوطنية.","extended","C1","AWL"],
  ["irredentism","noun","حركة استرداد الأراضي","Irredentism fueled territorial disputes across post-war Europe.","أججت حركة استرداد الأراضي النزاعات الإقليمية عبر أوروبا ما بعد الحرب.","mastery","C1","COCA"],
  ["balkanization","noun","البلقنة؛ تفتيت الدول","Balkanization split the region into small, hostile states.","قسمت البلقنة المنطقة إلى دول صغيرة متعادية.","extended","C1","COCA"],
  ["gerrymandering","noun","التلاعب بالدوائر الانتخابية","Gerrymandering redraws district boundaries to favor one party.","يعيد التلاعب بالدوائر الانتخابية رسم حدود المناطق لصالح حزب واحد.","extended","B2","COCA"],
  ["redistricting","noun","إعادة ترسيم الدوائر","Redistricting occurs every decade after the national census.","تحدث إعادة ترسيم الدوائر كل عقد بعد التعداد الوطني.","extended","B2","COCA"],
  ["enfranchise","verb","يمنح حق التصويت","The amendment enfranchised all citizens regardless of race.","منح التعديل حق التصويت لجميع المواطنين بغض النظر عن العرق.","extended","C1","COCA"],
  ["disenfranchise","verb","يحرم من حق التصويت","Felony convictions disenfranchise millions of eligible voters.","تحرم الإدانات الجنائية ملايين الناخبين المؤهلين من حق التصويت.","extended","C1","COCA"],
  ["suffrage","noun","حق الاقتراع","Universal suffrage was achieved only after decades of activism.","لم يتحقق حق الاقتراع العام إلا بعد عقود من النضال.","extended","B2","COCA"],
  ["plebiscite","noun","استفتاء شعبي","The government held a plebiscite to decide the territory's future.","أجرت الحكومة استفتاءً شعبياً لتقرير مستقبل الإقليم.","extended","C1","COCA"],
  ["referendum","noun","استفتاء","The referendum asked citizens whether to leave the economic union.","سأل الاستفتاء المواطنين عما إذا كانوا يريدون مغادرة الاتحاد الاقتصادي.","extended","B2","COCA"],
  ["ratify","verb","يصادق على؛ يبرم","Parliament must ratify the treaty before it takes effect.","يجب على البرلمان المصادقة على المعاهدة قبل أن تدخل حيز التنفيذ.","extended","B2","AWL"],
  ["annex","verb","يضم أرضاً","The empire moved to annex the neighboring province by force.","تحرّكت الإمبراطورية لضم المقاطعة المجاورة بالقوة.","extended","B2","COCA"],
  ["repatriate","verb","يعيد إلى الوطن","The agency helped repatriate refugees once the conflict ended.","ساعدت الوكالة في إعادة اللاجئين إلى أوطانهم بمجرد انتهاء النزاع.","extended","C1","COCA"],
];

// ============ UNIT 6: Cryptocurrency ============
const unit6 = [
  ["shard","noun","جزء من قاعدة بيانات موزعة","Each shard processes a subset of the blockchain's transactions.","يعالج كل جزء مجموعة فرعية من معاملات سلسلة الكتل.","extended","B2","COCA"],
  ["rollup","noun","تجميع المعاملات خارج السلسلة","Rollups bundle hundreds of transactions into a single on-chain proof.","تجمّع الرولابات مئات المعاملات في إثبات واحد على السلسلة.","mastery","C1","COCA"],
  ["sidechain","noun","سلسلة جانبية","A sidechain runs parallel to the main blockchain with its own rules.","تعمل السلسلة الجانبية بالتوازي مع سلسلة الكتل الرئيسية بقواعدها الخاصة.","extended","C1","COCA"],
  ["mempool","noun","مجمع المعاملات المعلقة","Unconfirmed transactions wait in the mempool until miners pick them up.","تنتظر المعاملات غير المؤكدة في مجمع المعاملات حتى يلتقطها المعدنون.","mastery","C1","COCA"],
  ["nonce","noun","رقم يُستخدم مرة واحدة","Miners vary the nonce until they find a valid block hash.","يغير المعدنون الرقم المستخدم لمرة واحدة حتى يجدوا تجزئة كتلة صالحة.","extended","C1","COCA"],
  ["oracle","noun","وسيط بيانات خارجية للعقود الذكية","A blockchain oracle feeds real-world data into smart contracts.","يغذي وسيط البيانات الخارجية بيانات العالم الحقيقي في العقود الذكية.","extended","B2","COCA"],
  ["staking pool","noun","مجمع التكديس","A staking pool lets small holders earn rewards collectively.","يتيح مجمع التكديس لصغار المالكين كسب المكافآت بشكل جماعي.","extended","B2","COCA"],
  ["yield farming","noun","زراعة العائد","Yield farming moves assets between protocols to maximize returns.","تنقل زراعة العائد الأصول بين البروتوكولات لتعظيم العوائد.","extended","B2","COCA"],
  ["impermanent loss","noun","خسارة مؤقتة غير محققة","Impermanent loss occurs when token prices diverge in a liquidity pool.","تحدث الخسارة المؤقتة عندما تتباين أسعار الرموز في مجمع السيولة.","mastery","C1","COCA"],
  ["slippage","noun","انزلاق سعري","High slippage means the executed price differs greatly from the quoted price.","الانزلاق السعري المرتفع يعني أن السعر المنفذ يختلف كثيراً عن السعر المعروض.","extended","B2","COCA"],
  ["front-running","noun","استباق التداول","Front-running exploits knowledge of pending trades to profit unfairly.","يستغل استباق التداول المعرفة بالصفقات المعلقة للربح بشكل غير عادل.","extended","C1","COCA"],
  ["sandwich attack","noun","هجوم الساندويتش","A sandwich attack places trades before and after a victim's transaction.","يضع هجوم الساندويتش صفقات قبل وبعد معاملة الضحية.","mastery","C1","COCA"],
  ["flash loan","noun","قرض فوري بلا ضمان","A flash loan must be borrowed and repaid within one transaction block.","يجب اقتراض القرض الفوري وسداده ضمن كتلة معاملة واحدة.","extended","C1","COCA"],
  ["merkle tree","noun","شجرة ميركل","A merkle tree verifies data integrity without downloading the entire dataset.","تتحقق شجرة ميركل من سلامة البيانات دون تنزيل مجموعة البيانات بأكملها.","mastery","C1","COCA"],
  ["genesis block","noun","كتلة البداية","The genesis block is the very first block in any blockchain.","كتلة البداية هي أول كتلة على الإطلاق في أي سلسلة كتل.","extended","B2","COCA"],
  ["halving","noun","التنصيف","Bitcoin's halving cuts the mining reward in half every four years.","يخفض تنصيف البيتكوين مكافأة التعدين إلى النصف كل أربع سنوات.","extended","B2","COCA"],
  ["difficulty adjustment","noun","تعديل الصعوبة","Difficulty adjustment keeps block production time roughly constant.","يحافظ تعديل الصعوبة على وقت إنتاج الكتل ثابتاً تقريباً.","extended","B2","COCA"],
  ["testnet","noun","شبكة اختبار","Developers deploy smart contracts on a testnet before going live.","ينشر المطورون العقود الذكية على شبكة اختبار قبل الإطلاق.","extended","B2","COCA"],
  ["mainnet","noun","الشبكة الرئيسية","The token migrated from testnet to mainnet after successful audits.","انتقل الرمز من شبكة الاختبار إلى الشبكة الرئيسية بعد تدقيقات ناجحة.","extended","B2","COCA"],
  ["hard fork","noun","انقسام جذري","A hard fork creates a permanent split in the blockchain.","ينشئ الانقسام الجذري انقساماً دائماً في سلسلة الكتل.","extended","B2","COCA"],
  ["soft fork","noun","انقسام مرن","A soft fork tightens rules while remaining backward compatible.","يشدد الانقسام المرن القواعد مع البقاء متوافقاً مع الإصدارات السابقة.","extended","B2","COCA"],
  ["wrapped token","noun","رمز مغلف","A wrapped token represents another cryptocurrency on a different chain.","يمثل الرمز المغلف عملة مشفرة أخرى على سلسلة مختلفة.","mastery","C1","COCA"],
  ["bridge","noun","جسر بين سلاسل الكتل","The bridge transfers assets between Ethereum and Polygon.","ينقل الجسر الأصول بين إيثيريوم وبوليغون.","extended","B2","COCA"],
  ["gas fee","noun","رسوم الغاز","Gas fees spike when network demand exceeds available capacity.","ترتفع رسوم الغاز عندما يتجاوز الطلب على الشبكة السعة المتاحة.","extended","B2","COCA"],
  ["liquidity pool","noun","مجمع السيولة","The liquidity pool enables decentralized token swaps without an order book.","يتيح مجمع السيولة مبادلات الرموز اللامركزية بدون دفتر أوامر.","extended","B2","COCA"],
];

// ============ UNIT 7: Crowd Psychology ============
const unit7 = [
  ["anomie","noun","اللامعيارية؛ انهيار القيم الاجتماعية","Anomie spreads when social norms break down during rapid change.","تنتشر اللامعيارية عندما تنهار الأعراف الاجتماعية أثناء التغيير السريع.","extended","C1","AWL"],
  ["alienation","noun","الاغتراب","Workers experience alienation when they feel disconnected from their labor.","يعاني العمال من الاغتراب عندما يشعرون بالانفصال عن عملهم.","extended","B2","AWL"],
  ["zeitgeist","noun","روح العصر","The zeitgeist of the era favored technological optimism.","فضّلت روح العصر في تلك الحقبة التفاؤل التكنولوجي.","extended","C1","COCA"],
  ["praxis","noun","التطبيق العملي للنظرية","Praxis bridges the gap between abstract theory and concrete action.","يسد التطبيق العملي الفجوة بين النظرية المجردة والعمل الملموس.","mastery","C1","AWL"],
  ["hegemony","noun","الهيمنة","Cultural hegemony shapes public opinion through media and education.","تشكل الهيمنة الثقافية الرأي العام من خلال الإعلام والتعليم.","extended","C1","AWL"],
  ["dialectic","noun","الجدلية","Hegel's dialectic proposes that ideas evolve through thesis and antithesis.","تقترح جدلية هيغل أن الأفكار تتطور من خلال الأطروحة ونقيضها.","extended","C1","AWL"],
  ["discourse","noun","خطاب؛ حوار فكري","Political discourse has become increasingly polarized on social media.","أصبح الخطاب السياسي مستقطباً بشكل متزايد على وسائل التواصل.","extended","B2","AWL"],
  ["simulacrum","noun","محاكاة؛ نسخة بلا أصل","Baudrillard argued that modern society is filled with simulacra.","جادل بودريار بأن المجتمع الحديث مليء بالمحاكاة.","mastery","C1","COCA"],
  ["spectacle","noun","مشهد استعراضي مُسيطر","Debord described consumer society as a society of the spectacle.","وصف ديبور المجتمع الاستهلاكي بأنه مجتمع المشهد الاستعراضي.","extended","B2","COCA"],
  ["panopticon","noun","المراقبة الشاملة","The panopticon metaphor describes modern surveillance culture.","يصف استعارة المراقبة الشاملة ثقافة المراقبة الحديثة.","mastery","C1","COCA"],
  ["biopower","noun","السلطة الحيوية","Biopower regulates populations through health policies and statistics.","تنظم السلطة الحيوية السكان من خلال السياسات الصحية والإحصاءات.","mastery","C1","COCA"],
  ["habitus","noun","الطبع الاجتماعي المكتسب","Bourdieu's habitus explains how social structures shape individual behavior.","يفسر الطبع الاجتماعي لبورديو كيف تشكل البنى الاجتماعية سلوك الفرد.","mastery","C1","AWL"],
  ["liminality","noun","العتبية؛ حالة الانتقال","Liminality describes the ambiguous state between two phases of life.","تصف العتبية الحالة الغامضة بين مرحلتين من الحياة.","mastery","C1","COCA"],
  ["intersectionality","noun","التقاطعية","Intersectionality examines how race, gender, and class overlap.","تدرس التقاطعية كيف يتداخل العرق والجنس والطبقة.","extended","C1","AWL"],
  ["subaltern","noun","التابع؛ المهمش","Subaltern voices are often excluded from official historical narratives.","غالباً ما تُستبعد أصوات المهمشين من الروايات التاريخية الرسمية.","mastery","C1","COCA"],
  ["othering","noun","التغريب؛ جعل الآخر مختلفاً","Othering creates division by treating certain groups as fundamentally different.","يخلق التغريب انقساماً بمعاملة مجموعات معينة على أنها مختلفة جوهرياً.","extended","C1","COCA"],
  ["microaggression","noun","عدوان مُصغّر","Microaggressions are subtle comments that marginalize minority groups.","العدوانات المصغرة هي تعليقات خفية تهمش مجموعات الأقليات.","extended","B2","COCA"],
  ["gaslighting","noun","التلاعب النفسي بالحقائق","Gaslighting makes the victim question their own perception of reality.","يجعل التلاعب النفسي الضحية تشكك في إدراكها للواقع.","extended","B2","COCA"],
  ["codependency","noun","الاعتماد المتبادل المرضي","Codependency traps partners in a cycle of enabling harmful behavior.","يحبس الاعتماد المتبادل المرضي الشركاء في دورة تمكين السلوك الضار.","extended","B2","COCA"],
  ["narcissism","noun","النرجسية","Narcissism involves an inflated sense of self-importance and entitlement.","تتضمن النرجسية إحساساً مبالغاً بأهمية الذات والاستحقاق.","extended","B2","COCA"],
  ["sociopathy","noun","اعتلال اجتماعي","Sociopathy is characterized by persistent disregard for others' rights.","يتميز الاعتلال الاجتماعي بتجاهل مستمر لحقوق الآخرين.","extended","C1","COCA"],
  ["empathy fatigue","noun","إجهاد التعاطف","Empathy fatigue affects healthcare workers exposed to constant suffering.","يؤثر إجهاد التعاطف على العاملين في الرعاية الصحية المعرضين للمعاناة المستمرة.","extended","B2","COCA"],
  ["moral panic","noun","ذعر أخلاقي","The moral panic over video games led to calls for strict regulation.","أدى الذعر الأخلاقي حول ألعاب الفيديو إلى دعوات لتنظيم صارم.","extended","B2","COCA"],
  ["hysteria","noun","هستيريا","Mass hysteria spread through the school after the false alarm.","انتشرت الهستيريا الجماعية في المدرسة بعد الإنذار الكاذب.","extended","B2","COCA"],
  ["groupthink","noun","التفكير الجماعي","Groupthink suppresses dissent and leads to poor decision-making.","يقمع التفكير الجماعي المعارضة ويؤدي إلى قرارات سيئة.","extended","B2","COCA"],
];

// ============ UNIT 8: Forensic Science ============
const unit8 = [
  ["luminol","noun","لومينول؛ كاشف الدم","Luminol reveals invisible bloodstains by emitting a blue glow.","يكشف اللومينول بقع الدم غير المرئية عبر إصدار توهج أزرق.","mastery","C1","COCA"],
  ["chromatography","noun","الكروماتوغرافيا؛ الفصل اللوني","Chromatography separates chemical mixtures for individual analysis.","تفصل الكروماتوغرافيا المخاليط الكيميائية للتحليل الفردي.","extended","C1","COCA"],
  ["spectrometry","noun","قياس الطيف","Mass spectrometry identifies substances by measuring molecular weight.","يحدد قياس الطيف الكتلي المواد عن طريق قياس الوزن الجزيئي.","extended","C1","COCA"],
  ["electrophoresis","noun","الرحلان الكهربائي","Gel electrophoresis separates DNA fragments by size.","يفصل الرحلان الكهربائي الهلامي شظايا الحمض النووي حسب الحجم.","mastery","C1","COCA"],
  ["polymerase","noun","إنزيم البوليميراز","Polymerase chain reaction amplifies tiny samples of DNA.","يضاعف تفاعل البوليميراز المتسلسل عينات صغيرة من الحمض النووي.","extended","C1","COCA"],
  ["reagent","noun","كاشف كيميائي","The reagent changed color when exposed to the target substance.","تغير لون الكاشف عند تعرضه للمادة المستهدفة.","extended","B2","COCA"],
  ["precipitate","noun","راسب","A white precipitate formed at the bottom of the test tube.","تشكل راسب أبيض في قاع أنبوب الاختبار.","extended","B2","COCA"],
  ["centrifuge","noun","جهاز الطرد المركزي","The centrifuge spins samples at high speed to separate components.","يدوّر جهاز الطرد المركزي العينات بسرعة عالية لفصل المكونات.","extended","B2","COCA"],
  ["pipette","noun","ماصة مختبرية","She used a pipette to transfer an exact volume of liquid.","استخدمت ماصة مختبرية لنقل حجم دقيق من السائل.","extended","B2","COCA"],
  ["photomicrograph","noun","صورة مجهرية","The photomicrograph revealed fiber evidence invisible to the naked eye.","كشفت الصورة المجهرية أدلة ألياف غير مرئية بالعين المجردة.","mastery","C1","COCA"],
  ["palynology","noun","علم حبوب اللقاح","Palynology links suspects to crime scenes through pollen analysis.","يربط علم حبوب اللقاح المشتبه بهم بمسرح الجريمة عبر تحليل حبوب اللقاح.","mastery","C1","COCA"],
  ["odontology","noun","طب الأسنان الشرعي","Forensic odontology identifies victims through dental records.","يحدد طب الأسنان الشرعي هوية الضحايا من خلال سجلات الأسنان.","mastery","C1","COCA"],
  ["anthropometry","noun","القياسات البشرية","Anthropometry measures body dimensions for identification purposes.","تقيس القياسات البشرية أبعاد الجسم لأغراض تحديد الهوية.","mastery","C1","COCA"],
  ["osteology","noun","علم العظام","Osteology helps determine age and sex from skeletal remains.","يساعد علم العظام في تحديد العمر والجنس من بقايا الهيكل العظمي.","mastery","C1","COCA"],
  ["taphonomy","noun","علم دراسة تحلل الكائنات بعد الموت","Taphonomy studies how organisms decay and become preserved or fossilized.","يدرس علم التافونومي كيف تتحلل الكائنات وتُحفظ أو تتحجر.","mastery","C1","COCA"],
  ["lividity","noun","رسوب الدم بعد الوفاة","Lividity patterns help estimate the time and position of death.","تساعد أنماط رسوب الدم في تقدير وقت ووضعية الوفاة.","mastery","C1","COCA"],
  ["rigor mortis","noun","تيبس الموت","Rigor mortis sets in within hours and helps estimate time of death.","يبدأ تيبس الموت خلال ساعات ويساعد في تقدير وقت الوفاة.","extended","B2","COCA"],
  ["decomposition","noun","التحلل","The rate of decomposition depends on temperature and humidity.","يعتمد معدل التحلل على درجة الحرارة والرطوبة.","extended","B2","COCA"],
  ["exsanguination","noun","نزف حتى الموت","Exsanguination from a severed artery can be fatal within minutes.","يمكن أن يكون النزف حتى الموت من شريان مقطوع قاتلاً خلال دقائق.","mastery","C1","COCA"],
  ["asphyxiation","noun","اختناق","Asphyxiation results from a lack of oxygen reaching the brain.","ينتج الاختناق عن نقص الأكسجين الواصل إلى الدماغ.","extended","C1","COCA"],
  ["strangulation","noun","خنق","Strangulation leaves distinct marks on the neck and throat.","يترك الخنق علامات مميزة على الرقبة والحلق.","extended","B2","COCA"],
  ["blunt force","noun","قوة كليلة؛ ضربة بأداة غير حادة","Blunt force trauma caused fractures to the skull.","سببت القوة الكليلة كسوراً في الجمجمة.","extended","B2","COCA"],
  ["laceration","noun","تمزق؛ جرح ممزق","The laceration required twelve stitches to close properly.","تطلب التمزق اثنتي عشرة غرزة لإغلاقه بشكل صحيح.","extended","B2","COCA"],
  ["ballistics","noun","علم المقذوفات","Ballistics matched the bullet to the weapon found at the scene.","طابق علم المقذوفات الرصاصة بالسلاح الذي عُثر عليه في الموقع.","extended","B2","COCA"],
  ["toxicology","noun","علم السموم","Toxicology reports detected traces of poison in the victim's blood.","كشفت تقارير علم السموم آثار سم في دم الضحية.","extended","B2","COCA"],
];

// ============ UNIT 9: Archaeology ============
const unit9 = [
  ["dendrochronology","noun","علم التأريخ بحلقات الأشجار","Dendrochronology dates wooden structures by counting tree rings.","يؤرخ علم حلقات الأشجار المنشآت الخشبية بعد حلقات الأشجار.","mastery","C1","COCA"],
  ["thermoluminescence","noun","التألق الحراري","Thermoluminescence dating estimates when pottery was last heated.","يقدر التأريخ بالتألق الحراري آخر مرة سُخن فيها الفخار.","mastery","C1","COCA"],
  ["paleoethnobotany","noun","علم النباتات الأثري","Paleoethnobotany reconstructs ancient diets from plant remains.","يعيد علم النباتات الأثري بناء الأنظمة الغذائية القديمة من بقايا النباتات.","mastery","C1","COCA"],
  ["zooarchaeology","noun","علم الآثار الحيواني","Zooarchaeology analyzes animal bones found at excavation sites.","يحلل علم الآثار الحيواني عظام الحيوانات الموجودة في مواقع التنقيب.","mastery","C1","COCA"],
  ["ethnoarchaeology","noun","علم الآثار الإثني","Ethnoarchaeology studies living cultures to interpret ancient artifacts.","يدرس علم الآثار الإثني الثقافات الحية لتفسير القطع الأثرية القديمة.","mastery","C1","COCA"],
  ["magnetometry","noun","قياس المغناطيسية","Magnetometry detects buried structures without disturbing the soil.","يكشف قياس المغناطيسية البنى المدفونة دون إزعاج التربة.","mastery","C1","COCA"],
  ["resistivity","noun","المقاومة الكهربائية","Resistivity surveys reveal underground walls and ditches.","تكشف مسوحات المقاومة الكهربائية الجدران والخنادق تحت الأرض.","extended","C1","COCA"],
  ["stratigraphy","noun","علم الطبقات","Stratigraphy reveals the chronological order of deposited layers.","يكشف علم الطبقات الترتيب الزمني للطبقات المترسبة.","extended","C1","AWL"],
  ["typology","noun","التصنيف النمطي","Typology classifies artifacts based on shared physical characteristics.","يصنف التصنيف النمطي القطع الأثرية بناءً على خصائص فيزيائية مشتركة.","extended","B2","AWL"],
  ["seriation","noun","التسلسل الزمني للقطع","Seriation arranges artifacts in chronological order by style changes.","يرتب التسلسل الزمني القطع الأثرية حسب تغيرات الأسلوب.","mastery","C1","COCA"],
  ["calibration","noun","المعايرة","Radiocarbon calibration adjusts raw dates to calendar years.","تعدل معايرة الكربون المشع التواريخ الخام إلى سنوات تقويمية.","extended","B2","AWL"],
  ["provenance","noun","مصدر القطعة الأثرية","The provenance of the artifact traced it back to ancient Mesopotamia.","تتبع مصدر القطعة الأثرية عائداً إلى بلاد ما بين النهرين القديمة.","extended","B2","COCA"],
  ["provenience","noun","موقع العثور على القطعة","Provenience records the exact location where an object was excavated.","يسجل موقع العثور المكان الدقيق الذي نُقبت فيه القطعة.","mastery","C1","COCA"],
  ["diagenesis","noun","التحول الرسوبي","Diagenesis alters sediments into solid rock over geological time.","يحول التحول الرسوبي الرواسب إلى صخور صلبة عبر الزمن الجيولوجي.","mastery","C1","COCA"],
  ["patination","noun","تكون الزنجار","Patination gives bronze artifacts their characteristic green surface.","يمنح تكون الزنجار القطع البرونزية سطحها الأخضر المميز.","mastery","C1","COCA"],
  ["debitage","noun","نفايات تشذيب الحجر","Debitage scatter indicates where ancient toolmakers shaped their stones.","يشير تناثر نفايات التشذيب إلى أماكن تشكيل صانعي الأدوات القدماء لأحجارهم.","mastery","C1","COCA"],
  ["lithic","adjective","حجري؛ متعلق بالأدوات الحجرية","Lithic analysis reveals the techniques used to make stone tools.","يكشف التحليل الحجري التقنيات المستخدمة لصنع الأدوات الحجرية.","extended","C1","COCA"],
  ["flint knapping","noun","تشذيب حجر الصوان","Flint knapping was the primary method for producing sharp-edged tools.","كان تشذيب الصوان الطريقة الأساسية لإنتاج أدوات حادة الحواف.","mastery","C1","COCA"],
  ["temper","noun","مادة مضافة لتقوية الفخار","Adding shell temper to clay prevents pottery from cracking during firing.","تمنع إضافة مادة الصدف إلى الطين تشقق الفخار أثناء الحرق.","extended","C1","COCA"],
  ["slip","noun","طلاء طيني سائل للفخار","A red slip was applied to the vessel before firing it in the kiln.","طُبق طلاء طيني أحمر على الإناء قبل حرقه في الفرن.","extended","B2","COCA"],
  ["burnish","verb","يصقل سطح الفخار","Potters burnish the surface with a smooth stone to create a shine.","يصقل الخزافون السطح بحجر أملس لإنشاء لمعان.","extended","B2","COCA"],
  ["kiln","noun","فرن حرق الفخار","The kiln reached temperatures high enough to vitrify the clay.","وصل الفرن إلى درجات حرارة كافية لتزجيج الطين.","extended","B2","COCA"],
  ["excavation","noun","تنقيب أثري","The excavation uncovered a Roman villa buried beneath farmland.","كشف التنقيب الأثري عن فيلا رومانية مدفونة تحت أرض زراعية.","extended","B2","COCA"],
  ["stratification","noun","التطبق","Cultural stratification at the site showed five distinct occupation layers.","أظهر التطبق الثقافي في الموقع خمس طبقات سكنية متميزة.","extended","B2","AWL"],
  ["sondage","noun","حفرة استكشافية تجريبية","A small sondage confirmed the presence of buried ruins.","أكدت حفرة استكشافية صغيرة وجود أطلال مدفونة.","mastery","C1","COCA"],
];

// ============ UNIT 10: Longevity ============
const unit10 = [
  ["sarcopenia","noun","ضمور العضلات المرتبط بالعمر","Sarcopenia causes progressive loss of muscle mass in the elderly.","يسبب ضمور العضلات فقداناً تدريجياً للكتلة العضلية عند كبار السن.","extended","C1","COCA"],
  ["osteoporosis","noun","هشاشة العظام","Osteoporosis weakens bones and increases the risk of fractures.","تضعف هشاشة العظام العظام وتزيد خطر الكسور.","extended","B2","COCA"],
  ["atherosclerosis","noun","تصلب الشرايين","Atherosclerosis builds plaques inside arteries, restricting blood flow.","يبني تصلب الشرايين لويحات داخل الشرايين مما يقيد تدفق الدم.","extended","C1","COCA"],
  ["thrombosis","noun","تجلط الدم","Deep vein thrombosis can be life-threatening if a clot reaches the lungs.","يمكن أن يكون تجلط الأوردة العميقة مهدداً للحياة إذا وصلت الجلطة إلى الرئتين.","extended","B2","COCA"],
  ["embolism","noun","انسداد وعائي","A pulmonary embolism blocks blood flow to part of the lungs.","يمنع الانسداد الرئوي تدفق الدم إلى جزء من الرئتين.","extended","C1","COCA"],
  ["aneurysm","noun","تمدد الأوعية الدموية","A brain aneurysm can rupture without any prior warning signs.","يمكن أن ينفجر تمدد الأوعية الدموية الدماغي دون أي علامات تحذيرية مسبقة.","extended","C1","COCA"],
  ["arrhythmia","noun","اضطراب نظم القلب","Arrhythmia causes the heart to beat too fast, too slow, or irregularly.","يسبب اضطراب نظم القلب نبضاً سريعاً أو بطيئاً أو غير منتظم.","extended","B2","COCA"],
  ["fibrillation","noun","رجفان","Atrial fibrillation increases the risk of stroke significantly.","يزيد الرجفان الأذيني خطر السكتة الدماغية بشكل كبير.","extended","C1","COCA"],
  ["hypertension","noun","ارتفاع ضغط الدم","Chronic hypertension damages blood vessels and vital organs over time.","يضر ارتفاع ضغط الدم المزمن الأوعية الدموية والأعضاء الحيوية بمرور الوقت.","extended","B2","COCA"],
  ["hypotension","noun","انخفاض ضغط الدم","Severe hypotension can cause dizziness, fainting, and organ damage.","يمكن أن يسبب انخفاض ضغط الدم الشديد دوخة وإغماء وتلف الأعضاء.","extended","B2","COCA"],
  ["glycation","noun","الارتباط بالسكر؛ الغلكزة","Glycation damages proteins and accelerates the aging process.","يضر الارتباط بالسكر البروتينات ويسرع عملية الشيخوخة.","mastery","C1","COCA"],
  ["methylation","noun","المثيلة","DNA methylation regulates gene expression without changing the sequence.","تنظم مثيلة الحمض النووي التعبير الجيني دون تغيير التسلسل.","extended","C1","COCA"],
  ["acetylation","noun","الأستلة","Histone acetylation opens chromatin and promotes gene transcription.","تفتح أستلة الهيستون الكروماتين وتعزز النسخ الجيني.","mastery","C1","COCA"],
  ["phosphorylation","noun","الفسفرة","Phosphorylation acts as a molecular switch to activate enzymes.","تعمل الفسفرة كمفتاح جزيئي لتنشيط الإنزيمات.","mastery","C1","COCA"],
  ["ubiquitination","noun","الإضافة اليوبيكويتينية","Ubiquitination tags damaged proteins for destruction by the proteasome.","تعلّم الإضافة اليوبيكويتينية البروتينات التالفة لتدميرها بواسطة البروتيازوم.","mastery","C1","COCA"],
  ["proteasome","noun","البروتيازوم","The proteasome degrades unneeded or faulty proteins inside the cell.","يفكك البروتيازوم البروتينات غير اللازمة أو المعيبة داخل الخلية.","mastery","C1","COCA"],
  ["lysosome","noun","الجسيم الحال","Lysosomes digest worn-out organelles and recycle their components.","تهضم الجسيمات الحالّة العضيات البالية وتعيد تدوير مكوناتها.","extended","C1","COCA"],
  ["peroxisome","noun","الجسيم البيروكسيدي","Peroxisomes break down fatty acids and neutralize toxic peroxides.","تفكك الجسيمات البيروكسيدية الأحماض الدهنية وتعادل البيروكسيدات السامة.","mastery","C1","COCA"],
  ["endoplasmic reticulum","noun","الشبكة الإندوبلازمية","The endoplasmic reticulum folds and transports newly synthesized proteins.","تطوي الشبكة الإندوبلازمية البروتينات المُصنعة حديثاً وتنقلها.","extended","C1","COCA"],
  ["golgi apparatus","noun","جهاز غولجي","The golgi apparatus packages proteins into vesicles for secretion.","يعبئ جهاز غولجي البروتينات في حويصلات للإفراز.","extended","C1","COCA"],
  ["cytoskeleton","noun","الهيكل الخلوي","The cytoskeleton maintains cell shape and enables internal transport.","يحافظ الهيكل الخلوي على شكل الخلية ويمكّن النقل الداخلي.","extended","C1","COCA"],
  ["nucleolus","noun","النوية","The nucleolus assembles ribosomal subunits inside the nucleus.","تجمع النوية الوحدات الفرعية الريبوسومية داخل النواة.","mastery","C1","COCA"],
  ["chromatin","noun","الكروماتين","Chromatin condenses into visible chromosomes during cell division.","يتكثف الكروماتين إلى كروموسومات مرئية أثناء انقسام الخلية.","extended","C1","COCA"],
  ["histone","noun","هيستون","Histones are proteins around which DNA wraps tightly in the nucleus.","الهيستونات بروتينات يلتف حولها الحمض النووي بإحكام في النواة.","mastery","C1","COCA"],
  ["telomerase","noun","إنزيم التيلوميراز","Telomerase extends telomeres and may slow cellular aging.","يمدد إنزيم التيلوميراز التيلوميرات وقد يبطئ الشيخوخة الخلوية.","mastery","C1","COCA"],
];

// ============ UNIT 11: Sustainable Architecture ============
const unit11 = [
  ["fenestration","noun","تصميم وتوزيع النوافذ","Good fenestration maximizes natural light while minimizing heat gain.","يزيد تصميم النوافذ الجيد الضوء الطبيعي مع تقليل اكتساب الحرارة.","extended","C1","COCA"],
  ["clerestory","noun","نوافذ علوية قرب السقف","Clerestory windows flood the interior with light from above.","تغمر النوافذ العلوية الداخل بالضوء من الأعلى.","mastery","C1","COCA"],
  ["transom","noun","نافذة فوق الباب","A transom above the door allows ventilation while maintaining privacy.","تسمح النافذة فوق الباب بالتهوية مع الحفاظ على الخصوصية.","extended","C1","COCA"],
  ["mullion","noun","عمود فاصل بين ألواح النوافذ","Stone mullions divide the large gothic window into narrow panels.","تقسم الأعمدة الحجرية النافذة القوطية الكبيرة إلى ألواح ضيقة.","mastery","C1","COCA"],
  ["soffit","noun","السطح السفلي للعنصر المعماري","The soffit under the eaves was painted white to reflect light.","طُلي السطح السفلي تحت الأفاريز باللون الأبيض لعكس الضوء.","extended","C1","COCA"],
  ["fascia","noun","لوح واجهة السقف","The fascia board protects the roof edge from weather damage.","يحمي لوح الواجهة حافة السقف من أضرار الطقس.","extended","B2","COCA"],
  ["eave","noun","إفريز السقف البارز","Deep eaves shade the walls and reduce solar heat gain.","تظلل الأفاريز العميقة الجدران وتقلل اكتساب الحرارة الشمسية.","extended","B2","COCA"],
  ["parapet","noun","حاجز سطحي؛ جدار منخفض","A parapet runs along the roofline for safety and aesthetics.","يمتد حاجز سطحي على طول خط السقف للأمان والجمال.","extended","B2","COCA"],
  ["buttress","noun","دعامة جدارية","Flying buttresses transfer the weight of cathedral walls outward.","تنقل الدعامات الطائرة وزن جدران الكاتدرائية نحو الخارج.","extended","B2","COCA"],
  ["cantilever","noun","كابول؛ ذراع ناتئة","The balcony extends as a cantilever without any supporting columns.","يمتد الشرفة ككابول بدون أي أعمدة داعمة.","extended","B2","COCA"],
  ["lintel","noun","عتبة علوية فوق الفتحة","A stone lintel spans the doorway and supports the wall above.","تمتد عتبة حجرية فوق المدخل وتدعم الجدار فوقها.","extended","B2","COCA"],
  ["keystone","noun","حجر القفل في القوس","The keystone locks all the other stones in the arch in place.","يثبت حجر القفل جميع الأحجار الأخرى في القوس في مكانها.","extended","B2","COCA"],
  ["voussoir","noun","حجر من أحجار القوس","Each voussoir in the arch is precisely shaped to carry loads.","كل حجر في القوس مشكّل بدقة لتحمل الأحمال.","mastery","C1","COCA"],
  ["spandrel","noun","مثلث بين الأقواس","The spandrel between the arches was decorated with mosaic tiles.","زُين المثلث بين الأقواس ببلاط الفسيفساء.","mastery","C1","COCA"],
  ["balustrade","noun","درابزين بأعمدة صغيرة","An ornate balustrade lines the terrace overlooking the garden.","يصطف درابزين مزخرف على الشرفة المطلة على الحديقة.","extended","C1","COCA"],
  ["cladding","noun","كسوة خارجية للمبنى","Timber cladding gives the facade a warm, natural appearance.","تمنح الكسوة الخشبية الواجهة مظهراً دافئاً وطبيعياً.","extended","B2","COCA"],
  ["weatherboard","noun","ألواح خشبية مانعة للعوامل الجوية","Weatherboard siding protects the structure from rain and wind.","تحمي ألواح الكسوة الخارجية المبنى من المطر والرياح.","extended","C1","COCA"],
  ["flashing","noun","شريط عازل معدني","Flashing around the chimney prevents water from seeping into the roof.","يمنع الشريط العازل حول المدخنة تسرب الماء إلى السقف.","extended","B2","COCA"],
  ["damp-proofing","noun","عزل ضد الرطوبة","Damp-proofing the basement walls prevents moisture from entering.","يمنع العزل ضد الرطوبة لجدران الطابق السفلي دخول الرطوبة.","extended","B2","COCA"],
  ["underpinning","noun","تدعيم الأساسات","Underpinning strengthened the old foundation to support the new extension.","دعّم تدعيم الأساسات الأساس القديم لدعم الامتداد الجديد.","extended","B2","COCA"],
  ["piling","noun","خوازيق الأساسات","Steel piling was driven deep into soft ground to anchor the building.","دُقت خوازيق فولاذية عميقاً في الأرض اللينة لتثبيت المبنى.","extended","B2","COCA"],
  ["grout","noun","مونة حشو","Grout fills the gaps between tiles to seal them against water.","تملأ مونة الحشو الفجوات بين البلاط لعزلها عن الماء.","extended","B2","COCA"],
  ["mortar","noun","ملاط البناء","Lime mortar was used to bind the stone blocks together.","استُخدم ملاط الجير لربط كتل الحجر معاً.","extended","B2","COCA"],
  ["aggregate","noun","ركام؛ حصى خرساني","Concrete is made by mixing cement, water, and aggregate.","يُصنع الخرسانة بخلط الأسمنت والماء والركام.","extended","B2","AWL"],
  ["passive house","noun","منزل سلبي موفر للطاقة","A passive house uses insulation and ventilation to eliminate active heating.","يستخدم المنزل السلبي العزل والتهوية للاستغناء عن التدفئة النشطة.","extended","B2","COCA"],
];

// ============ UNIT 12: Exoplanets ============
const unit12 = [
  ["astrometry","noun","القياس الفلكي","Astrometry measures the precise positions and movements of stars.","يقيس القياس الفلكي المواقع والحركات الدقيقة للنجوم.","extended","C1","COCA"],
  ["photometry","noun","القياس الضوئي","Transit photometry detects exoplanets by measuring dips in starlight.","يكشف القياس الضوئي بالعبور الكواكب الخارجية بقياس انخفاضات ضوء النجوم.","extended","C1","COCA"],
  ["coronagraph","noun","مرسمة الإكليل الشمسي","A coronagraph blocks starlight to reveal faint orbiting planets.","تحجب مرسمة الإكليل ضوء النجم لكشف الكواكب الخافتة المدارية.","mastery","C1","COCA"],
  ["interferometer","noun","مقياس التداخل","An interferometer combines signals from multiple telescopes for sharper images.","يجمع مقياس التداخل إشارات من تلسكوبات متعددة للحصول على صور أوضح.","mastery","C1","COCA"],
  ["bolometer","noun","مقياس الإشعاع الحراري","The bolometer detects faint infrared radiation from distant objects.","يكشف مقياس الإشعاع الحراري الأشعة تحت الحمراء الخافتة من أجسام بعيدة.","mastery","C1","COCA"],
  ["magnetometer","noun","مقياس المغناطيسية","A magnetometer aboard the probe mapped the planet's magnetic field.","رسم مقياس المغناطيسية على المسبار خريطة الحقل المغناطيسي للكوكب.","extended","C1","COCA"],
  ["spectrograph","noun","مطياف","The spectrograph revealed the chemical composition of the exoplanet's atmosphere.","كشف المطياف التركيب الكيميائي لغلاف الكوكب الخارجي الجوي.","extended","C1","COCA"],
  ["chromosphere","noun","الغلاف اللوني للشمس","The chromosphere glows red and is visible during total solar eclipses.","يتوهج الغلاف اللوني باللون الأحمر ويكون مرئياً أثناء كسوف الشمس الكلي.","extended","C1","COCA"],
  ["photosphere","noun","الغلاف الضوئي","The photosphere is the visible surface of the sun.","الغلاف الضوئي هو السطح المرئي للشمس.","extended","B2","COCA"],
  ["heliosphere","noun","الغلاف الشمسي","The heliosphere shields the solar system from interstellar radiation.","يحمي الغلاف الشمسي المجموعة الشمسية من الإشعاع بين النجمي.","extended","C1","COCA"],
  ["magnetosphere","noun","الغلاف المغناطيسي","Earth's magnetosphere deflects charged particles from the solar wind.","يحرف الغلاف المغناطيسي للأرض الجسيمات المشحونة من الرياح الشمسية.","extended","C1","COCA"],
  ["ionosphere","noun","الغلاف المتأين","The ionosphere reflects radio waves and enables long-distance communication.","يعكس الغلاف المتأين موجات الراديو ويمكّن الاتصال بعيد المدى.","extended","B2","COCA"],
  ["thermosphere","noun","الغلاف الحراري","The thermosphere absorbs ultraviolet radiation and heats up dramatically.","يمتص الغلاف الحراري الأشعة فوق البنفسجية ويسخن بشكل كبير.","extended","C1","COCA"],
  ["mesosphere","noun","الغلاف الأوسط","Meteors burn up as they enter the mesosphere at high speed.","تحترق الشهب عند دخولها الغلاف الأوسط بسرعة عالية.","extended","B2","COCA"],
  ["stratosphere","noun","الستراتوسفير","The ozone layer in the stratosphere absorbs harmful UV radiation.","تمتص طبقة الأوزون في الستراتوسفير الأشعة فوق البنفسجية الضارة.","extended","B2","COCA"],
  ["troposphere","noun","التروبوسفير","Weather phenomena occur primarily in the troposphere.","تحدث الظواهر الجوية بشكل رئيسي في التروبوسفير.","extended","B2","COCA"],
  ["exosphere","noun","الغلاف الخارجي","The exosphere gradually transitions into the vacuum of outer space.","ينتقل الغلاف الخارجي تدريجياً إلى فراغ الفضاء الخارجي.","extended","C1","COCA"],
  ["albedo","noun","البياض؛ معامل الانعكاس","A high albedo means the surface reflects most incoming sunlight.","يعني البياض المرتفع أن السطح يعكس معظم ضوء الشمس الوارد.","extended","C1","COCA"],
  ["eccentricity","noun","الانحراف المداري","High orbital eccentricity produces extreme seasonal temperature swings.","ينتج الانحراف المداري المرتفع تقلبات حرارية موسمية شديدة.","extended","B2","AWL"],
  ["inclination","noun","ميل المدار","The planet's inclination determines its angle relative to the ecliptic.","يحدد ميل الكوكب زاويته بالنسبة لمستوى الكسوف.","extended","B2","COCA"],
  ["declination","noun","الميل السماوي","Declination and right ascension specify a star's position on the sky.","يحدد الميل السماوي والمطلع المستقيم موقع النجم في السماء.","extended","C1","COCA"],
  ["right ascension","noun","المطلع المستقيم","Right ascension is measured in hours along the celestial equator.","يُقاس المطلع المستقيم بالساعات على طول خط الاستواء السماوي.","extended","C1","COCA"],
  ["transit method","noun","طريقة العبور","The transit method detects planets when they pass in front of their star.","تكشف طريقة العبور الكواكب عندما تمر أمام نجمها.","extended","B2","COCA"],
  ["radial velocity","noun","السرعة الشعاعية","The radial velocity method detects stellar wobble caused by orbiting planets.","تكشف طريقة السرعة الشعاعية تمايل النجم الناتج عن كواكب مدارية.","extended","C1","COCA"],
  ["habitable zone","noun","المنطقة الصالحة للسكن","Planets in the habitable zone could support liquid water on their surface.","يمكن للكواكب في المنطقة الصالحة للسكن أن تدعم وجود ماء سائل على سطحها.","extended","B2","COCA"],
];

async function main() {
  const client = await pool.connect();
  try {
    const units = [
      { num: 1, data: unit1 },
      { num: 2, data: unit2 },
      { num: 3, data: unit3 },
      { num: 4, data: unit4 },
      { num: 5, data: unit5 },
      { num: 6, data: unit6 },
      { num: 7, data: unit7 },
      { num: 8, data: unit8 },
      { num: 9, data: unit9 },
      { num: 10, data: unit10 },
      { num: 11, data: unit11 },
      { num: 12, data: unit12 },
    ];

    let totalInserted = 0;
    for (const u of units) {
      const count = await insertBatch(client, u.data, u.num, BATCH_ID);
      console.log(`Unit ${u.num}: inserted ${count} / ${u.data.length} words`);
      totalInserted += count;
    }
    console.log(`\n=== Total inserted: ${totalInserted} words (batch_id=${BATCH_ID}) ===\n`);

    // Final totals per unit
    const res = await client.query(
      `SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE batch_id = $1 GROUP BY recommended_unit ORDER BY recommended_unit`,
      [BATCH_ID]
    );
    console.log('--- Final DB totals for batch_id=23 ---');
    let grandTotal = 0;
    for (const row of res.rows) {
      console.log(`  Unit ${row.recommended_unit}: ${row.cnt} words`);
      grandTotal += parseInt(row.cnt);
    }
    console.log(`  GRAND TOTAL: ${grandTotal} words`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
