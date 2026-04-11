// Part 1: families for batch-03 words 1-50
const fs = require('fs');
const path = require('path');
const input = require('./batch-03.json');

// Map of word -> family (built by hand). Keyed by lowercased word/phrase.
const FAM = {};

function base(word, pos, level, note) {
  return { word, pos, level, is_base: true, is_opposite: false,
    morphology: { is_base: true, note_ar: note || "الصيغة الأصلية — منها تشتق باقي العائلة" } };
}
function der(word, pos, level, affix, affix_type, base_word, base_pos, rule_ar, similar_examples, is_opposite=false) {
  return { word, pos, level, is_base: false, is_opposite,
    morphology: { affix, affix_type, base_word, base_pos, rule_ar, similar_examples } };
}
function irr(word, pos, level, base_word, base_pos, note_ar, is_opposite=false) {
  return { word, pos, level, is_base: false, is_opposite,
    morphology: { affix: null, irregular: true, base_word, base_pos, note_ar } };
}

// paradigm
FAM["paradigm"] = [
  base("paradigm", "noun", 5),
  der("paradigmatic", "adjective", 5, "-atic", "suffix", "paradigm", "noun",
    "اللاحقة -atic تُضاف على بعض الأسماء لتكوّن صفة تصف ما يتعلق بذلك الاسم.",
    ["system → systematic", "drama → dramatic", "problem → problematic"]),
];
// off-grid - no derivatives
FAM["off-grid"] = [
  { word: "off-grid", pos: "adjective", level: 3, is_base: true, is_opposite: false,
    morphology: { is_base: true, note_ar: "كلمة مركّبة من حرف الجر off والاسم grid، ولا تشتق منها كلمات أخرى شائعة" } },
];
// implications
FAM["implications"] = [
  base("imply", "verb", 4),
  der("implication", "noun", 4, "-ation", "suffix", "imply", "verb",
    "اللاحقة -ation تحوّل الفعل إلى اسم يدل على نتيجة الفعل أو مفهومه.",
    ["apply → application", "explain → explanation", "inform → information"]),
  der("implications", "noun", 4, "-s", "suffix", "implication", "noun",
    "اللاحقة -s تُضاف على الاسم لتدل على الجمع.",
    ["effect → effects", "result → results", "reason → reasons"]),
  der("implied", "adjective", 4, "-ed", "suffix", "imply", "verb",
    "اللاحقة -ed تحوّل الفعل إلى صفة تصف شيئاً جرى عليه الفعل.",
    ["intend → intended", "assume → assumed", "hide → hidden"]),
];
// revolutionize
FAM["revolutionize"] = [
  base("revolt", "verb", 3),
  der("revolution", "noun", 3, "-tion", "suffix", "revolt", "verb",
    "اللاحقة -tion تحوّل الفعل إلى اسم يدل على الحدث أو عمليته.",
    ["evolve → evolution", "act → action", "create → creation"]),
  der("revolutionary", "adjective", 5, "-ary", "suffix", "revolution", "noun",
    "اللاحقة -ary تُضاف على الاسم لتكوّن صفة تصف ما يتعلق به.",
    ["element → elementary", "custom → customary", "imagine → imaginary"]),
  der("revolutionize", "verb", 4, "-ize", "suffix", "revolution", "noun",
    "اللاحقة -ize تحوّل الاسم إلى فعل يعني إحداث ذلك الشيء أو جعله واقعاً.",
    ["modern → modernize", "memory → memorize", "symbol → symbolize"]),
];
// bright
FAM["bright"] = [
  base("bright", "adjective", 1),
  der("brightly", "adverb", 2, "-ly", "suffix", "bright", "adjective",
    "اللاحقة -ly تحوّل الصفة إلى ظرف يصف طريقة وقوع الفعل.",
    ["quick → quickly", "clear → clearly", "loud → loudly"]),
  der("brightness", "noun", 2, "-ness", "suffix", "bright", "adjective",
    "اللاحقة -ness تحوّل الصفة إلى اسم يدل على الحالة أو الصفة المجرّدة.",
    ["happy → happiness", "dark → darkness", "kind → kindness"]),
  der("brighten", "verb", 2, "-en", "suffix", "bright", "adjective",
    "اللاحقة -en تحوّل الصفة إلى فعل يعني جعل الشيء يتصف بتلك الصفة.",
    ["wide → widen", "short → shorten", "strong → strengthen"]),
];
// beautiful
FAM["beautiful"] = [
  base("beauty", "noun", 1),
  der("beautiful", "adjective", 0, "-ful", "suffix", "beauty", "noun",
    "اللاحقة -ful تُضاف على الاسم لتكوّن صفة تعني المليء بذلك الشيء.",
    ["care → careful", "hope → hopeful", "use → useful"]),
  der("beautifully", "adverb", 2, "-ly", "suffix", "beautiful", "adjective",
    "اللاحقة -ly تحوّل الصفة إلى ظرف يصف طريقة وقوع الفعل.",
    ["quick → quickly", "wonderful → wonderfully", "careful → carefully"]),
  der("beautify", "verb", 3, "-ify", "suffix", "beauty", "noun",
    "اللاحقة -ify تحوّل الاسم إلى فعل يعني جعل الشيء متّصفاً بذلك الوصف.",
    ["simple → simplify", "pure → purify", "class → classify"]),
];
// captivate
FAM["captivate"] = [
  base("captivate", "verb", 3),
  der("captivating", "adjective", 3, "-ing", "suffix", "captivate", "verb",
    "اللاحقة -ing تحوّل الفعل إلى صفة تصف ما يُحدث أثر الفعل.",
    ["amaze → amazing", "fascinate → fascinating", "interest → interesting"]),
  der("captivation", "noun", 4, "-tion", "suffix", "captivate", "verb",
    "اللاحقة -tion تحوّل الفعل إلى اسم يدل على الحدث أو حالته.",
    ["fascinate → fascination", "admire → admiration", "inspire → inspiration"]),
];
// groundbreaking
FAM["groundbreaking"] = [
  { word: "groundbreaking", pos: "adjective", level: 3, is_base: true, is_opposite: false,
    morphology: { is_base: true, note_ar: "كلمة مركّبة من ground + breaking تعني 'فتح أرض جديدة' أي رائدة ومبتكرة" } },
];
// plausible
FAM["plausible"] = [
  base("plausible", "adjective", 5),
  der("plausibly", "adverb", 5, "-ly", "suffix", "plausible", "adjective",
    "اللاحقة -ly تحوّل الصفة إلى ظرف يصف طريقة وقوع الفعل.",
    ["possible → possibly", "probable → probably", "sensible → sensibly"]),
  der("plausibility", "noun", 5, "-ity", "suffix", "plausible", "adjective",
    "اللاحقة -ity تحوّل الصفة إلى اسم يدل على الحالة أو الصفة المجرّدة.",
    ["possible → possibility", "able → ability", "sensible → sensibility"]),
  der("implausible", "adjective", 5, "im-", "prefix", "plausible", "adjective",
    "البادئة im- تفيد النفي وتُعكس معنى الصفة.",
    ["possible → impossible", "mature → immature", "perfect → imperfect"], true),
];
// demonstrating
FAM["demonstrating"] = [
  base("demonstrate", "verb", 3),
  der("demonstrating", "verb", 4, "-ing", "suffix", "demonstrate", "verb",
    "اللاحقة -ing تُضاف على الفعل لتكوّن اسم فعل أو صيغة مستمرّة.",
    ["show → showing", "explain → explaining", "prove → proving"]),
  der("demonstration", "noun", 3, "-tion", "suffix", "demonstrate", "verb",
    "اللاحقة -tion تحوّل الفعل إلى اسم يدل على الحدث أو عمليته.",
    ["create → creation", "explain → explanation", "present → presentation"]),
  der("demonstrative", "adjective", 5, "-ive", "suffix", "demonstrate", "verb",
    "اللاحقة -ive تحوّل الفعل إلى صفة تصف من يقوم بالفعل أو ميله إليه.",
    ["act → active", "create → creative", "express → expressive"]),
];
// unaware of
FAM["unaware of"] = [
  base("aware", "adjective", 2),
  der("unaware", "adjective", 3, "un-", "prefix", "aware", "adjective",
    "البادئة un- تفيد النفي وتُعكس معنى الصفة.",
    ["known → unknown", "happy → unhappy", "safe → unsafe"], true),
  der("awareness", "noun", 3, "-ness", "suffix", "aware", "adjective",
    "اللاحقة -ness تحوّل الصفة إلى اسم يدل على الحالة أو الصفة المجرّدة.",
    ["happy → happiness", "kind → kindness", "dark → darkness"]),
  { word: "unaware of", pos: "adjective", level: 3, is_base: false, is_opposite: true,
    morphology: { affix: "un-", affix_type: "prefix", base_word: "aware of", base_pos: "adjective",
      rule_ar: "البادئة un- تُضاف إلى الصفة وتعكس معناها، وكلمة unaware of تعني غير مدرك لـ.",
      similar_examples: ["aware of → unaware of", "sure of → unsure of", "afraid of → unafraid of"] } },
];
// aims to
FAM["aims to"] = [
  base("aim", "verb", 1),
  der("aims", "verb", 2, "-s", "suffix", "aim", "verb",
    "اللاحقة -s تُضاف على الفعل مع الفاعل المفرد الغائب في زمن المضارع.",
    ["run → runs", "seek → seeks", "try → tries"]),
  { word: "aims to", pos: "verb", level: 2, is_base: false, is_opposite: false,
    morphology: { affix: null, irregular: true, base_word: "aim", base_pos: "verb",
      note_ar: "تركيب 'aims to' يتكوّن من الفعل aim في صيغة الغائب المفرد متبوعاً بـ to والمصدر ليعني يهدف إلى." } },
  der("aimless", "adjective", 3, "-less", "suffix", "aim", "noun",
    "اللاحقة -less تُضاف على الاسم لتكوّن صفة تعني الخلو من ذلك الشيء.",
    ["care → careless", "hope → hopeless", "use → useless"]),
];
// catalyzed
FAM["catalyzed"] = [
  base("catalyze", "verb", 4),
  der("catalyzed", "verb", 4, "-ed", "suffix", "catalyze", "verb",
    "اللاحقة -ed تحوّل الفعل إلى صيغة الماضي أو اسم المفعول.",
    ["analyze → analyzed", "realize → realized", "organize → organized"]),
  der("catalyst", "noun", 4, "-yst", "suffix", "catalyze", "verb",
    "اللاحقة -yst/-ist تُضاف على بعض الجذور لتكوّن اسم فاعل يدل على من يُحدث الفعل أو ما يُحدثه.",
    ["analyze → analyst", "psychology → psychologist", "art → artist"]),
];
// inconceivable
FAM["inconceivable"] = [
  base("conceive", "verb", 4),
  der("conceivable", "adjective", 4, "-able", "suffix", "conceive", "verb",
    "اللاحقة -able تحوّل الفعل إلى صفة تعني القابلية لحدوث الفعل.",
    ["read → readable", "believe → believable", "achieve → achievable"]),
  der("inconceivable", "adjective", 5, "in-", "prefix", "conceivable", "adjective",
    "البادئة in- تفيد النفي وتُعكس معنى الصفة.",
    ["visible → invisible", "correct → incorrect", "complete → incomplete"], true),
  der("conception", "noun", 4, "-tion", "suffix", "conceive", "verb",
    "اللاحقة -tion تحوّل الفعل إلى اسم يدل على الحدث أو فكرته.",
    ["deceive → deception", "receive → reception", "perceive → perception"]),
];
// intricate
FAM["intricate"] = [
  base("intricate", "adjective", 4),
  der("intricately", "adverb", 4, "-ly", "suffix", "intricate", "adjective",
    "اللاحقة -ly تحوّل الصفة إلى ظرف يصف طريقة وقوع الفعل.",
    ["delicate → delicately", "accurate → accurately", "private → privately"]),
  der("intricacy", "noun", 5, "-cy", "suffix", "intricate", "adjective",
    "اللاحقة -cy تحوّل الصفة إلى اسم يدل على الحالة أو الصفة المجرّدة.",
    ["accurate → accuracy", "private → privacy", "delicate → delicacy"]),
];
// spectacular
FAM["spectacular"] = [
  base("spectacle", "noun", 3),
  der("spectacular", "adjective", 1, "-ar", "suffix", "spectacle", "noun",
    "اللاحقة -ar/-cular تُضاف على الاسم لتكوّن صفة تصف ما يتعلق بذلك الشيء أو ما يُشبهه.",
    ["circle → circular", "muscle → muscular", "particle → particular"]),
  der("spectacularly", "adverb", 2, "-ly", "suffix", "spectacular", "adjective",
    "اللاحقة -ly تحوّل الصفة إلى ظرف يصف طريقة وقوع الفعل.",
    ["quick → quickly", "careful → carefully", "loud → loudly"]),
];
// transform
FAM["transform"] = [
  base("form", "verb", 1),
  der("transform", "verb", 4, "trans-", "prefix", "form", "verb",
    "البادئة trans- تعني 'عبْر' أو التحوّل الكامل من حال إلى حال.",
    ["plant → transplant", "port → transport", "fer → transfer"]),
  der("transformation", "noun", 4, "-ation", "suffix", "transform", "verb",
    "اللاحقة -ation تحوّل الفعل إلى اسم يدل على الحدث أو نتيجته.",
    ["inform → information", "explain → explanation", "examine → examination"]),
  der("transformative", "adjective", 5, "-ive", "suffix", "transform", "verb",
    "اللاحقة -ive تحوّل الفعل إلى صفة تصف ما يُحدث الفعل أو يميل إليه.",
    ["create → creative", "act → active", "inform → informative"]),
];
// prowess - no derivatives
FAM["prowess"] = [
  { word: "prowess", pos: "noun", level: 5, is_base: true, is_opposite: false,
    morphology: { is_base: true, note_ar: "اسم مجرّد يعني البراعة أو المهارة الفائقة، ولا يشتق منه كلمات أخرى شائعة" } },
];
// taking up
FAM["taking up"] = [
  base("take", "verb", 0),
  der("taking", "verb", 1, "-ing", "suffix", "take", "verb",
    "اللاحقة -ing تُضاف على الفعل لتكوّن اسم فعل أو صيغة مستمرّة.",
    ["make → making", "give → giving", "do → doing"]),
  { word: "taking up", pos: "verb", level: 2, is_base: false, is_opposite: false,
    morphology: { affix: null, irregular: true, base_word: "take up", base_pos: "verb",
      note_ar: "عبارة فعلية (phrasal verb) تتكوّن من take + up وتعني البدء في ممارسة شيء جديد." } },
];
// derive
FAM["derive"] = [
  base("derive", "verb", 4),
  der("derivation", "noun", 5, "-ation", "suffix", "derive", "verb",
    "اللاحقة -ation تحوّل الفعل إلى اسم يدل على الحدث أو نتيجته.",
    ["inform → information", "explore → exploration", "create → creation"]),
  der("derivative", "noun", 5, "-ative", "suffix", "derive", "verb",
    "اللاحقة -ative تحوّل الفعل إلى اسم أو صفة تدل على الميل أو الصلة بالفعل.",
    ["alternate → alternative", "narrate → narrative", "relate → relative"]),
  der("derived", "adjective", 4, "-ed", "suffix", "derive", "verb",
    "اللاحقة -ed تحوّل الفعل إلى صفة تصف شيئاً جرى عليه الفعل.",
    ["relate → related", "limit → limited", "import → imported"]),
];
// identify
FAM["identify"] = [
  base("identify", "verb", 1),
  der("identification", "noun", 3, "-ation", "suffix", "identify", "verb",
    "اللاحقة -ation تحوّل الفعل إلى اسم يدل على الحدث أو عمليته.",
    ["classify → classification", "verify → verification", "modify → modification"]),
  der("identity", "noun", 2, "-ity", "suffix", "identify", "verb",
    "اللاحقة -ity تحوّل الفعل أو الصفة إلى اسم يدل على الحالة أو الكيان.",
    ["able → ability", "real → reality", "active → activity"]),
  der("identifiable", "adjective", 4, "-able", "suffix", "identify", "verb",
    "اللاحقة -able تحوّل الفعل إلى صفة تعني القابلية لحدوث الفعل.",
    ["read → readable", "recognize → recognizable", "notice → noticeable"]),
  der("unidentified", "adjective", 4, "un-", "prefix", "identified", "adjective",
    "البادئة un- تفيد النفي وتُضاف على الصفة لتعكس معناها.",
    ["known → unknown", "seen → unseen", "expected → unexpected"], true),
];
// decipher
FAM["decipher"] = [
  base("decipher", "verb", 5),
  der("deciphered", "adjective", 5, "-ed", "suffix", "decipher", "verb",
    "اللاحقة -ed تحوّل الفعل إلى صفة تصف شيئاً جرى عليه الفعل.",
    ["translate → translated", "decode → decoded", "solve → solved"]),
  der("indecipherable", "adjective", 5, "in-", "prefix", "decipherable", "adjective",
    "البادئة in- تفيد النفي وتُعكس معنى الصفة.",
    ["visible → invisible", "correct → incorrect", "complete → incomplete"], true),
];
// shuts down
FAM["shuts down"] = [
  base("shut", "verb", 1),
  { word: "shuts down", pos: "verb", level: 2, is_base: false, is_opposite: false,
    morphology: { affix: null, irregular: true, base_word: "shut down", base_pos: "verb",
      note_ar: "عبارة فعلية تتكوّن من shut + down وتعني إيقاف التشغيل أو الإغلاق التام." } },
  { word: "shutdown", pos: "noun", level: 3, is_base: false, is_opposite: false,
    morphology: { affix: null, irregular: true, base_word: "shut down", base_pos: "verb",
      note_ar: "اسم مُشتق من العبارة الفعلية shut down ويُكتب ككلمة واحدة ليعني عملية الإيقاف." } },
];
// preserving
FAM["preserving"] = [
  base("preserve", "verb", 3),
  der("preserving", "verb", 3, "-ing", "suffix", "preserve", "verb",
    "اللاحقة -ing تُضاف على الفعل لتكوّن اسم فعل أو صيغة مستمرّة.",
    ["save → saving", "protect → protecting", "keep → keeping"]),
  der("preservation", "noun", 3, "-ation", "suffix", "preserve", "verb",
    "اللاحقة -ation تحوّل الفعل إلى اسم يدل على الحدث أو عمليته.",
    ["conserve → conservation", "reserve → reservation", "observe → observation"]),
  der("preservative", "noun", 4, "-ative", "suffix", "preserve", "verb",
    "اللاحقة -ative تحوّل الفعل إلى اسم أو صفة تدل على وظيفة الفعل.",
    ["alternate → alternative", "narrate → narrative", "relate → relative"]),
];
// snow
FAM["snow"] = [
  base("snow", "noun", 0),
  der("snowy", "adjective", 1, "-y", "suffix", "snow", "noun",
    "اللاحقة -y تُضاف على الاسم لتكوّن صفة تعني مليئاً بذلك الشيء أو مشابهاً له.",
    ["rain → rainy", "sun → sunny", "wind → windy"]),
  der("snowing", "verb", 1, "-ing", "suffix", "snow", "verb",
    "اللاحقة -ing تُضاف على الفعل لتكوّن صيغة الاستمرار.",
    ["rain → raining", "play → playing", "sing → singing"]),
];
// flex
FAM["flex"] = [
  base("flex", "verb", 3),
  der("flexible", "adjective", 2, "-ible", "suffix", "flex", "verb",
    "اللاحقة -ible تحوّل الفعل إلى صفة تعني القابلية لحدوث الفعل.",
    ["sense → sensible", "access → accessible", "respond → responsible"]),
  der("flexibility", "noun", 3, "-ity", "suffix", "flexible", "adjective",
    "اللاحقة -ity تحوّل الصفة إلى اسم يدل على الحالة أو الصفة المجرّدة.",
    ["able → ability", "possible → possibility", "visible → visibility"]),
  der("inflexible", "adjective", 4, "in-", "prefix", "flexible", "adjective",
    "البادئة in- تفيد النفي وتُعكس معنى الصفة.",
    ["visible → invisible", "correct → incorrect", "complete → incomplete"], true),
];
// developing
FAM["developing"] = [
  base("develop", "verb", 1),
  der("developing", "adjective", 2, "-ing", "suffix", "develop", "verb",
    "اللاحقة -ing تحوّل الفعل إلى صفة تصف ما هو في طور حدوث الفعل.",
    ["grow → growing", "learn → learning", "rise → rising"]),
  der("development", "noun", 2, "-ment", "suffix", "develop", "verb",
    "اللاحقة -ment تحوّل الفعل إلى اسم يدل على الحدث أو نتيجته.",
    ["agree → agreement", "move → movement", "pay → payment"]),
  der("developer", "noun", 2, "-er", "suffix", "develop", "verb",
    "اللاحقة -er تحوّل الفعل إلى اسم فاعل يدل على من يقوم بالفعل.",
    ["teach → teacher", "write → writer", "build → builder"]),
  der("underdeveloped", "adjective", 4, "under-", "prefix", "developed", "adjective",
    "البادئة under- تعني 'أقل من المطلوب' أو 'ناقص'.",
    ["paid → underpaid", "used → underused", "rated → underrated"]),
];
// attributed
FAM["attributed"] = [
  base("attribute", "verb", 3),
  der("attributed", "verb", 2, "-ed", "suffix", "attribute", "verb",
    "اللاحقة -ed تحوّل الفعل إلى صيغة الماضي أو اسم المفعول.",
    ["relate → related", "link → linked", "ascribe → ascribed"]),
  der("attribution", "noun", 4, "-tion", "suffix", "attribute", "verb",
    "اللاحقة -tion تحوّل الفعل إلى اسم يدل على الحدث أو عمليته.",
    ["contribute → contribution", "distribute → distribution", "act → action"]),
];
// featuring
FAM["featuring"] = [
  base("feature", "verb", 2),
  der("featuring", "verb", 2, "-ing", "suffix", "feature", "verb",
    "اللاحقة -ing تُضاف على الفعل لتكوّن اسم فعل أو صيغة مستمرّة.",
    ["include → including", "show → showing", "present → presenting"]),
  der("featured", "adjective", 3, "-ed", "suffix", "feature", "verb",
    "اللاحقة -ed تحوّل الفعل إلى صفة تصف شيئاً جرى عليه الفعل.",
    ["highlight → highlighted", "select → selected", "prefer → preferred"]),
];
// celebrate
FAM["celebrate"] = [
  base("celebrate", "verb", 1),
  der("celebration", "noun", 2, "-tion", "suffix", "celebrate", "verb",
    "اللاحقة -tion تحوّل الفعل إلى اسم يدل على الحدث أو عمليته.",
    ["create → creation", "decorate → decoration", "educate → education"]),
  der("celebrated", "adjective", 3, "-ed", "suffix", "celebrate", "verb",
    "اللاحقة -ed تحوّل الفعل إلى صفة تصف شيئاً جرى عليه الفعل.",
    ["respect → respected", "admire → admired", "love → loved"]),
  der("celebrity", "noun", 2, "-ity", "suffix", "celebrate", "verb",
    "اللاحقة -ity تحوّل الفعل أو الصفة إلى اسم يدل على الحالة أو الكيان.",
    ["popular → popularity", "active → activity", "real → reality"]),
];

// Save all built families
fs.writeFileSync(path.join(__dirname, 'fam-part1.json'), JSON.stringify(FAM, null, 2));
console.log('part1 keys:', Object.keys(FAM).length);
