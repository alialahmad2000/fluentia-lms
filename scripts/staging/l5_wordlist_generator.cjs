// LEGENDARY-B6 — Generates full vocab entries from compact word lists
// Reads compact format and produces full staging entries with template examples

const UNIT_THEMES = {
  1: { en: 'Civilization Collapse', ar: 'انهيار الحضارات', context: 'historical and archaeological' },
  2: { en: 'Extreme Achievement', ar: 'الإنجاز المتطرف', context: 'sports and performance' },
  3: { en: 'Scientific Skepticism', ar: 'الشك العلمي', context: 'science and research' },
  4: { en: 'Climate Adaptation', ar: 'التكيف المناخي', context: 'environment and climate' },
  5: { en: 'Nuclear Energy Debate', ar: 'جدل الطاقة النووية', context: 'nuclear energy and policy' },
  6: { en: 'Biodiversity Crisis', ar: 'أزمة التنوع البيولوجي', context: 'ecology and conservation' },
  7: { en: 'Neuroscience Frontiers', ar: 'آفاق علم الأعصاب', context: 'brain and neuroscience' },
  8: { en: 'Swarm Intelligence', ar: 'ذكاء الأسراب', context: 'collective behavior and AI' },
  9: { en: 'Creative Genius', ar: 'العبقرية الإبداعية', context: 'creativity and innovation' },
  10: { en: 'Quantum Discovery', ar: 'اكتشافات الكم', context: 'quantum physics' },
  11: { en: 'Cross-Cultural Exchange', ar: 'التبادل الثقافي', context: 'culture and globalization' },
  12: { en: 'Resource Economics', ar: 'اقتصاديات الموارد', context: 'economics and resources' },
};

// Example sentence templates by POS
const TEMPLATES = {
  noun: [
    (w, ctx) => `The ${w} of the research attracted international attention.`,
    (w, ctx) => `Understanding this ${w} requires extensive ${ctx} knowledge.`,
    (w, ctx) => `The concept of ${w} has evolved significantly in recent decades.`,
    (w, ctx) => `Scholars disagree about the precise ${w} underlying the phenomenon.`,
    (w, ctx) => `The ${w} was documented in the latest academic publication.`,
  ],
  verb: [
    (w, ctx) => `Researchers ${w} the data to validate their conclusions.`,
    (w, ctx) => `The team attempted to ${w} the unexpected findings.`,
    (w, ctx) => `Experts ${w} that the methodology needs revision.`,
    (w, ctx) => `The study aimed to ${w} the relationship between the variables.`,
    (w, ctx) => `Scientists ${w} the phenomenon under controlled conditions.`,
  ],
  adjective: [
    (w, ctx) => `The ${w} approach yielded more reliable results.`,
    (w, ctx) => `A ${w} analysis revealed previously hidden patterns.`,
    (w, ctx) => `The findings were considered ${w} by independent reviewers.`,
    (w, ctx) => `The ${w} nature of the problem demanded creative solutions.`,
    (w, ctx) => `Such ${w} conditions are rarely observed in practice.`,
  ],
  adverb: [
    (w, ctx) => `The phenomenon was ${w} documented across multiple studies.`,
    (w, ctx) => `The results ${w} confirmed the original hypothesis.`,
    (w, ctx) => `Experts ${w} agree that further research is needed.`,
    (w, ctx) => `The policy was ${w} implemented across all regions.`,
  ],
};

// Arabic example templates
const AR_TEMPLATES = {
  noun: [
    (ar) => `أثار ${ar} البحث اهتماماً دولياً.`,
    (ar) => `يتطلب فهم هذا ${ar} معرفة واسعة.`,
    (ar) => `تطور مفهوم ${ar} بشكل كبير في العقود الأخيرة.`,
    (ar) => `يختلف العلماء حول ${ar} الدقيق الكامن وراء الظاهرة.`,
    (ar) => `وُثق ${ar} في أحدث منشور أكاديمي.`,
  ],
  verb: [
    (ar) => `${ar} الباحثون البيانات للتحقق من استنتاجاتهم.`,
    (ar) => `حاول الفريق أن ${ar} النتائج غير المتوقعة.`,
    (ar) => `${ar} الخبراء أن المنهجية تحتاج إلى مراجعة.`,
    (ar) => `هدفت الدراسة إلى ${ar} العلاقة بين المتغيرات.`,
    (ar) => `${ar} العلماء الظاهرة في ظروف محكمة.`,
  ],
  adjective: [
    (ar) => `أسفر النهج ${ar} عن نتائج أكثر موثوقية.`,
    (ar) => `كشف التحليل ${ar} عن أنماط مخفية سابقاً.`,
    (ar) => `اعتُبرت النتائج ${ar} من قبل مراجعين مستقلين.`,
    (ar) => `تطلبت الطبيعة ${ar} للمشكلة حلولاً إبداعية.`,
  ],
  adverb: [
    (ar) => `وُثقت الظاهرة ${ar} عبر دراسات متعددة.`,
    (ar) => `أكدت النتائج ${ar} الفرضية الأصلية.`,
    (ar) => `يتفق الخبراء ${ar} على الحاجة لمزيد من البحث.`,
  ],
};

function generateEntry(word, pos, cefr, source, register, tier, unit, ar, def) {
  const posKey = pos.includes('verb') ? 'verb' : pos.includes('adj') ? 'adjective' : pos.includes('adv') ? 'adverb' : 'noun';
  const templates = TEMPLATES[posKey] || TEMPLATES.noun;
  const arTemplates = AR_TEMPLATES[posKey] || AR_TEMPLATES.noun;
  const ctx = UNIT_THEMES[unit]?.context || 'academic';

  // Use word hash to pick consistent template
  const hash = word.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const enTemplate = templates[hash % templates.length];
  const arTemplate = arTemplates[hash % arTemplates.length];

  return {
    w: word, c: cefr, s: source, p: pos, r: register,
    ar: ar,
    een: enTemplate(word, ctx),
    ear: arTemplate(ar),
    def: def,
    t: tier, u: unit
  };
}

// Parse compact format: word|pos|cefr|source|reg|tier|unit|ar|def
function parseCompact(line) {
  const parts = line.split('|');
  if (parts.length < 9) return null;
  return generateEntry(parts[0].trim(), parts[1].trim(), parts[2].trim(), parts[3].trim(),
    parts[4].trim(), parts[5].trim(), parseInt(parts[6].trim()), parts[7].trim(), parts[8].trim());
}

module.exports = { generateEntry, parseCompact, UNIT_THEMES };
