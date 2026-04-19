#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: 'C:/Users/Dr. Ali/Desktop/fluentia-lms/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Rubric helpers ──────────────────────────────────────────────────────────

const SLOGAN_PHRASES = [
  'رحلة رائعة', 'رحلة ممتعة', 'عالم اللغة', 'عالم مليء',
  'مغامرة التعلم', 'آفاق جديدة', 'فرص لا حصر لها', 'بوابة النجاح'
];
const FORBIDDEN_WORDS = ['تمارين', 'دروس', 'اختبار', 'اختبارات'];
// Generic scene phrases that fail C1
const GENERIC_SCENE = ['المواقف اليومية', 'الحياة اليومية', 'مواقف مختلفة', 'مواقف عديدة'];

const MASCULINE_RE = [
  /ستكون\s/, /تفهم\s/, /\bلك\s/, /تجاربك\s/, /\bأنت\s/,
  /تتعلم\s/, /تستطيع\s/, /تقدر\s/, /يمكنك\s/
];
const FEMININE_RE = [
  /ستكونين/, /تفهمين/, /لكِ/, /تجاربكِ/, /\bأنتِ\b/,
  /تتعلمين/, /تستطيعين/, /تقدرين/, /يمكنكِ/
];

// Verbs that unambiguously start a feminine outcome (مضارع مؤنث مفرد)
// Regex: starts with ت and has ين at morpheme boundary
const FEM_VERB_START_RE = /^(ت\S+ين|تح|تك|تع|تف|تن|تش|تب|تق|تط|تذ|تأ|تو|تج|تس|تد|تر|تز|تل|تم|تغ|تخ|تص|تض|تظ|تث)/;
// Words that indicate abstract outcome (fail C4)
const ABSTRACT_SIGNALS = [
  'الثقافة', 'المهارات', 'مهاراتكِ', 'مهاراتك', 'الفهم العام',
  'أسلوب', 'الوعي', 'الذاتية', 'تطورين', 'تطوّرين',
  'ملمة', 'واسعة', 'عميقة'
];

function hasEmojiInArabic(text) {
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
}
function hasEnglishWords(text) {
  // 3+ consecutive Latin chars = English word
  return /[a-zA-Z]{3,}/.test(text);
}
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function startsWithWeakOpener(text) {
  const first = text.trim().split(/\s+/)[0];
  return ['هنا', 'هذا', 'هذه', 'أنتِ', 'أنت'].includes(first) ||
    /^في\sالوحدة/.test(text.trim());
}

// C1: specific scene / location in why_matters
function scoreC1(why) {
  if (!why) return { score: 0, issue: 'why_matters فارغ' };
  // Check slogan phrases first
  for (const s of SLOGAN_PHRASES) {
    if (why.includes(s)) return { score: 0, issue: `عبارة سلوغن: "${s}"` };
  }
  for (const g of GENERIC_SCENE) {
    if (why.includes(g) && !hasConcreteScene(why)) {
      return { score: 0, issue: `عبارة مبهمة بلا مشهد محدد: "${g}"` };
    }
  }
  if (!hasConcreteScene(why)) {
    return { score: 0, issue: 'لا يذكر مشهداً أو موقعاً محدداً' };
  }
  return { score: 1, issue: null };
}

function hasConcreteScene(text) {
  // Concrete indicators: specific locations, situations, moments
  const concrete = [
    'بوابة الصعود', 'المطار', 'الفندق', 'المستشفى', 'الصيدلية',
    'المحطة', 'المتجر', 'السوق', 'المطعم', 'المقابلة', 'العمل',
    'الجامعة', 'المدرسة', 'البنك', 'المكتبة', 'السفارة',
    'البريد', 'الحافلة', 'القطار', 'التاكسي', 'الميناء',
    'اجتماع', 'ورشة', 'مؤتمر', 'محادثة', 'مكالمة',
    'رحلة الطيران', 'رحلة العمل', 'رحلة العلاج',
    'الحي', 'الجيران', 'المنزل الجديد', 'السكن',
    'صف', 'درس اللغة', 'محاضرة', 'ندوة',
    'متجر إلكتروني', 'موقع', 'تطبيق',
    'عيادة', 'طوارئ', 'طبيب',
    'زميلات', 'مديرة', 'رئيسة',
    'CV', 'سيرة ذاتية',
    'مقعد', 'تذكرة', 'حجز',
    'استمارة', 'وثيقة', 'عقد',
    'هاتف', 'بريد إلكتروني',
    'غرفة', 'شقة', 'إيجار',
    'الحفل', 'المناسبة',
    'المقاهي', 'المنتزه',
    'رحلة سياحية', 'السفر',
    'وسائل التواصل', 'منصة',
    // very broad but acceptable scene-connectors
    'لحظة', 'موقف', 'ظرف'
  ];
  return concrete.some(c => text.includes(c));
}

// C2: feminine-singular address throughout text fields
function scoreC2(unit) {
  const allText = [
    unit.why_matters || '',
    ...(unit.outcomes || []),
    ...(unit.brief_questions || []),
    ...Object.values(unit.activity_ribbons || {})
  ].join(' ');

  // Check for masculine signals (without kasra)
  const masculineFound = MASCULINE_RE.filter(re => re.test(allText));
  if (masculineFound.length > 0) {
    return { score: 0, issue: `عبارات مذكر محتملة في النص` };
  }
  return { score: 1, issue: null };
}

// C3: all outcomes start with feminine present verb
function scoreC3(outcomes) {
  if (!outcomes || outcomes.length === 0) return { score: 0, issue: 'لا توجد أهداف', failing: [] };
  const failing = [];
  for (const o of outcomes) {
    const first = o.trim().split(/\s+/)[0];
    // Fail if starts with "أن" clause, abstract noun patterns, or masculine verb
    if (o.startsWith('أن ') || o.startsWith('اكتساب') || o.startsWith('القدرة') ||
        o.startsWith('تنمية') || o.startsWith('بناء') || o.startsWith('تعزيز') ||
        o.startsWith('فهم') || o.startsWith('معرفة') || o.startsWith('استخدام') ||
        o.startsWith('التمكن') || o.startsWith('الإلمام') || o.startsWith('إتقان')) {
      failing.push(o.slice(0, 40));
      continue;
    }
    // Check doesn't start with feminine verb pattern
    // Outcomes must start with ت...ين pattern
    if (!first.includes('ين') && !first.startsWith('ت')) {
      failing.push(o.slice(0, 40));
    }
  }
  if (failing.length > 0) {
    return { score: 0, issue: `هدف لا يبدأ بفعل مؤنث مضارع`, failing };
  }
  return { score: 1, issue: null, failing: [] };
}

// C4: concrete capabilities not abstract goals
function scoreC4(outcomes) {
  if (!outcomes || outcomes.length === 0) return { score: 0, issue: 'لا أهداف', failing: [] };
  const failing = [];
  for (const o of outcomes) {
    const isAbstract = ABSTRACT_SIGNALS.some(s => o.includes(s));
    // Also flag if very short with no action verb
    if (isAbstract) failing.push(o.slice(0, 50));
  }
  if (failing.length > 0) {
    return { score: 0, issue: 'هدف مجرد بلا فعل ملموس', failing };
  }
  return { score: 1, issue: null, failing: [] };
}

// C5: outcome count 3-6
function scoreC5(outcomes) {
  const n = (outcomes || []).length;
  if (n < 3) return { score: 0, issue: `عدد الأهداف ${n} (أقل من 3)` };
  if (n > 6) return { score: 0, issue: `عدد الأهداف ${n} (أكثر من 6)` };
  return { score: 1, issue: null };
}

// C6: no forbidden words/patterns
function scoreC6(unit) {
  const allFields = {
    why_matters: unit.why_matters || '',
    outcomes: (unit.outcomes || []).join(' '),
    brief_questions: (unit.brief_questions || []).join(' '),
    ribbons: Object.values(unit.activity_ribbons || {}).join(' ')
  };
  const allText = Object.values(allFields).join(' ');

  for (const w of FORBIDDEN_WORDS) {
    if (allText.includes(w)) return { score: 0, issue: `كلمة محظورة: "${w}"` };
  }
  for (const s of SLOGAN_PHRASES) {
    if (allText.includes(s)) return { score: 0, issue: `عبارة سلوغن: "${s}"` };
  }
  if (hasEmojiInArabic(allText)) return { score: 0, issue: 'إيموجي داخل النص العربي' };
  if (hasEnglishWords(allText)) {
    // Find the English word
    const match = allText.match(/[a-zA-Z]{3,}/);
    return { score: 0, issue: `كلمة إنجليزية: "${match?.[0]}"` };
  }
  return { score: 1, issue: null };
}

// C7: ribbons 5-12 words
function scoreC7(ribbons) {
  if (!ribbons || Object.keys(ribbons).length === 0) {
    return { score: 0, issue: 'لا توجد أشرطة', failing: [] };
  }
  const failing = [];
  for (const [key, val] of Object.entries(ribbons)) {
    const wc = countWords(val);
    if (wc < 5 || wc > 12) failing.push(`${key}: "${val.slice(0, 40)}" (${wc} كلمة)`);
  }
  if (failing.length > 0) return { score: 0, issue: 'شريط خارج نطاق 5-12 كلمة', failing };
  return { score: 1, issue: null, failing: [] };
}

// C8: ribbons start with verb/noun (not weak opener)
function scoreC8(ribbons) {
  if (!ribbons || Object.keys(ribbons).length === 0) {
    return { score: 0, issue: 'لا توجد أشرطة', failing: [] };
  }
  const failing = [];
  for (const [key, val] of Object.entries(ribbons)) {
    if (startsWithWeakOpener(val)) failing.push(`${key}: "${val.slice(0, 40)}"`);
  }
  if (failing.length > 0) return { score: 0, issue: 'شريط يبدأ بفاتحة ضعيفة', failing };
  return { score: 1, issue: null, failing: [] };
}

// ── Evaluate a single unit ──────────────────────────────────────────────────

function evaluateUnit(unit) {
  const level = unit.curriculum_levels?.level_number ?? -1;
  const theme = unit.theme_ar || unit.theme_en || '(بلا عنوان)';

  const r1 = scoreC1(unit.why_matters);
  const r2 = scoreC2(unit);
  const r3 = scoreC3(unit.outcomes);
  const r4 = scoreC4(unit.outcomes);
  const r5 = scoreC5(unit.outcomes);
  const r6 = scoreC6(unit);
  const r7 = scoreC7(unit.activity_ribbons);
  const r8 = scoreC8(unit.activity_ribbons);

  const scores = {
    c1_specificity: r1.score,
    c2_feminine_address: r2.score,
    c3_outcomes_verbs: r3.score,
    c4_concrete_outcomes: r4.score,
    c5_outcome_count: r5.score,
    c6_no_forbidden: r6.score,
    c7_ribbon_length: r7.score,
    c8_ribbon_opener: r8.score
  };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  const issues = [];
  if (r1.score === 0) issues.push(`C1 (تحديد المشهد): ${r1.issue}`);
  if (r2.score === 0) issues.push(`C2 (مؤنث مفرد): ${r2.issue}`);
  if (r3.score === 0) {
    issues.push(`C3 (فعل مؤنث): ${r3.issue}`);
    if (r3.failing?.length) issues.push(`  ← ${r3.failing.join(' | ')}`);
  }
  if (r4.score === 0) {
    issues.push(`C4 (ملموس): ${r4.issue}`);
    if (r4.failing?.length) issues.push(`  ← ${r4.failing.join(' | ')}`);
  }
  if (r5.score === 0) issues.push(`C5 (عدد الأهداف): ${r5.issue}`);
  if (r6.score === 0) issues.push(`C6 (محظور): ${r6.issue}`);
  if (r7.score === 0) {
    issues.push(`C7 (طول الشريط): ${r7.issue}`);
    if (r7.failing?.length) issues.push(`  ← ${r7.failing.join(' | ')}`);
  }
  if (r8.score === 0) {
    issues.push(`C8 (فاتحة الشريط): ${r8.issue}`);
    if (r8.failing?.length) issues.push(`  ← ${r8.failing.join(' | ')}`);
  }

  return {
    id: unit.id,
    level,
    level_name: unit.curriculum_levels?.name_ar || `L${level}`,
    cefr: unit.curriculum_levels?.cefr || '',
    unit_number: unit.unit_number,
    theme,
    scores,
    total,
    issues,
    why_matters: unit.why_matters || '',
    outcomes: unit.outcomes || [],
    activity_ribbons: unit.activity_ribbons || {}
  };
}

// ── Pattern detection ───────────────────────────────────────────────────────

const CRITS = [
  'c1_specificity', 'c2_feminine_address', 'c3_outcomes_verbs',
  'c4_concrete_outcomes', 'c5_outcome_count', 'c6_no_forbidden',
  'c7_ribbon_length', 'c8_ribbon_opener'
];
const CRIT_LABELS = {
  c1_specificity: 'تحديد المشهد في why_matters',
  c2_feminine_address: 'مخاطبة مؤنث مفرد',
  c3_outcomes_verbs: 'الأهداف تبدأ بفعل مؤنث مضارع',
  c4_concrete_outcomes: 'أهداف ملموسة قابلة للملاحظة',
  c5_outcome_count: 'عدد الأهداف 3-6',
  c6_no_forbidden: 'غياب الكلمات المحظورة',
  c7_ribbon_length: 'طول الشريط 5-12 كلمة',
  c8_ribbon_opener: 'الشريط لا يبدأ بفاتحة ضعيفة'
};

function detectPatterns(evaluations) {
  const patterns = {};
  const levels = [...new Set(evaluations.map(e => e.level))].sort();
  for (const lvl of levels) {
    const lu = evaluations.filter(e => e.level === lvl);
    patterns[`L${lvl}`] = {};
    for (const c of CRITS) {
      const failRate = lu.filter(u => u.scores[c] === 0).length / lu.length;
      if (failRate >= 0.5) {
        patterns[`L${lvl}`][c] = Math.round(failRate * 100);
      }
    }
  }
  return patterns;
}

// ── Report writer ───────────────────────────────────────────────────────────

function buildReport(evaluations, patterns, timestamp) {
  const levels = [...new Set(evaluations.map(e => e.level))].sort();

  // Summary table
  const summaryRows = levels.map(lvl => {
    const lu = evaluations.filter(e => e.level === lvl);
    const avg = (lu.reduce((a, e) => a + e.total, 0) / lu.length).toFixed(1);
    const perfect = lu.filter(e => e.total === 8).length;
    const acceptable = lu.filter(e => e.total >= 6 && e.total < 8).length;
    const flagged = lu.filter(e => e.total <= 5).length;
    const cefr = lu[0]?.cefr || '';
    const name = lu[0]?.level_name || `L${lvl}`;
    return `| L${lvl} (${cefr}) — ${name} | ${avg} | ${perfect} | ${acceptable} | ${flagged} |`;
  });

  const totalFlagged = evaluations.filter(e => e.total <= 5).length;
  const totalAcceptable = evaluations.filter(e => e.total >= 6).length;
  const globalAvg = (evaluations.reduce((a, e) => a + e.total, 0) / evaluations.length).toFixed(1);

  // Systemic patterns section
  let patternSection = '';
  const hasPatterns = Object.values(patterns).some(p => Object.keys(p).length > 0);
  if (!hasPatterns) {
    patternSection = '_لا توجد أنماط منهجية — الجودة متسقة عبر المستويات._\n';
  } else {
    for (const [lkey, cmap] of Object.entries(patterns)) {
      if (Object.keys(cmap).length === 0) continue;
      patternSection += `### ${lkey}\n`;
      for (const [c, pct] of Object.entries(cmap)) {
        patternSection += `- **${c} — ${CRIT_LABELS[c]}:** ${pct}% من الوحدات تفشل في هذا المعيار.\n`;
        patternSection += `  توصية: تشديد نظام الـ SYSTEM_PROMPT في قسم ${c}.\n`;
      }
      patternSection += '\n';
    }
  }

  // Flagged units (≤5)
  const flagged = evaluations.filter(e => e.total <= 5).sort((a, b) => a.total - b.total);
  let flaggedSection = flagged.length === 0 ? '_لا توجد وحدات تحتاج إعادة توليد._\n' : '';
  for (const e of flagged) {
    flaggedSection += `### L${e.level} وحدة ${e.unit_number}: "${e.theme}" — ${e.total}/8\n`;
    flaggedSection += `**المعرّف:** \`${e.id}\`\n\n`;
    flaggedSection += `**المعايير الفاشلة:**\n`;
    for (const iss of e.issues) flaggedSection += `- ${iss}\n`;
    flaggedSection += `\n**why_matters:** ${e.why_matters.slice(0, 200)}\n\n`;
    flaggedSection += `**الأهداف:**\n`;
    for (const o of e.outcomes) flaggedSection += `- ${o}\n`;
    flaggedSection += '\n---\n\n';
  }

  // Acceptable with notes (6-7)
  const acceptable67 = evaluations.filter(e => e.total >= 6 && e.total < 8);
  let acceptable67Section = '';
  const by_level67 = {};
  for (const e of acceptable67) {
    const k = `L${e.level}`;
    if (!by_level67[k]) by_level67[k] = [];
    const failingCrits = CRITS.filter(c => e.scores[c] === 0);
    by_level67[k].push(`وحدة ${e.unit_number} (${e.total}/8): ${failingCrits.join(', ')}`);
  }
  for (const [lk, items] of Object.entries(by_level67).sort()) {
    acceptable67Section += `### ${lk}\n`;
    for (const item of items) acceptable67Section += `- ${item}\n`;
    acceptable67Section += '\n';
  }
  if (!acceptable67Section) acceptable67Section = '_لا توجد — جميع الوحدات إما ممتازة أو تحتاج إعادة توليد._\n';

  // Perfect units (8/8) count
  const perfectLines = levels.map(lvl => {
    const n = evaluations.filter(e => e.level === lvl && e.total === 8).length;
    return `- L${lvl}: ${n} وحدة`;
  }).join('\n');

  // Best-of-class samples: one from L1, one from L3 (or first available)
  const l1Best = evaluations.filter(e => e.level === 1 && e.total === 8)[0];
  const l3Best = evaluations.filter(e => e.level === 3 && e.total === 8)[0];
  const l0Best = evaluations.filter(e => e.level === 0 && e.total === 8)[0];

  function formatBest(e) {
    if (!e) return '_لا توجد وحدة 8/8 في هذا المستوى._\n';
    let s = `### L${e.level} وحدة ${e.unit_number} — "${e.theme}" (8/8)\n\n`;
    s += `**why_matters:**\n${e.why_matters}\n\n`;
    s += `**الأهداف:**\n`;
    for (const o of e.outcomes) s += `- ${o}\n`;
    s += '\n**الأشرطة:**\n';
    for (const [k, v] of Object.entries(e.activity_ribbons)) s += `- ${k}: "${v}"\n`;
    s += '\n';
    return s;
  }

  const bestSection = formatBest(l1Best || l0Best) + '\n' + formatBest(l3Best);

  // Flagged IDs
  const flaggedIds = flagged.map(e => e.id).join(', ') || 'NONE';

  return `# Journey V3 Content Quality Review

Generated: ${timestamp}
Scope: ${evaluations.length} وحدة عبر L0-L5

## الملخص

| المستوى | متوسط النقاط | 8/8 | 6-7/8 | ≤5/8 (تحتاج إعادة توليد) |
|---|---|---|---|---|
${summaryRows.join('\n')}

**إجمالي يحتاج إعادة توليد:** ${totalFlagged} وحدة
**إجمالي مقبول أو ممتاز:** ${totalAcceptable} وحدة
**المتوسط العام:** ${globalAvg}/8

---

## الأنماط المنهجية (معدل فشل ≥ 50%)

${patternSection}
---

## الوحدات المُعلَّمة (نقاط ≤ 5/8) — تحتاج إعادة توليد

${flaggedSection}
---

## مقبولة مع ملاحظات (6-7/8)

${acceptable67Section}
---

## وحدات 8/8 الكاملة

${perfectLines}

---

## نماذج من الأفضل (للمرجع)

${bestSection}
---

## الإجراءات الموصى بها

1. **في حال وجود أنماط منهجية:** تحديث SYSTEM_PROMPT في scripts/generate-unit-briefs.cjs أو scripts/generate-activity-ribbons.cjs وفق ملاحظات الأنماط أعلاه، ثم إعادة توليد الوحدات المتضررة بـ --force.

2. **في حال الفشل المعزول فقط (< 10% من الإجمالي):** إعادة توليد الوحدات المحددة بمعرّفاتها.

3. **في حال جودة ممتازة عامة (متوسط ≥ 7.5):** الشحن كما هو — الإخفاقات الطفيفة مقبولة.

---

معرّفات الوحدات المُعلَّمة لإعادة التوليد (إن لزم):
\`\`\`
${flaggedIds}
\`\`\`
`;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('جلب الوحدات من Supabase...');

  const { data: units, error } = await sb
    .from('curriculum_units')
    .select('id, unit_number, theme_ar, theme_en, why_matters, outcomes, brief_questions, activity_ribbons, curriculum_levels!inner(level_number, cefr, name_ar)')
    .not('brief_generated_at', 'is', null)
    .order('unit_number');

  if (error) {
    console.error('خطأ في جلب البيانات:', error.message);
    process.exit(1);
  }

  if (!units || units.length === 0) {
    console.error('لا توجد وحدات مُولَّدة!');
    process.exit(1);
  }

  // Sort by level then unit_number
  units.sort((a, b) => {
    const la = a.curriculum_levels?.level_number ?? 99;
    const lb = b.curriculum_levels?.level_number ?? 99;
    if (la !== lb) return la - lb;
    return (a.unit_number || 0) - (b.unit_number || 0);
  });

  console.log(`تقييم ${units.length} وحدة...`);

  const evaluations = units.map(evaluateUnit);
  const patterns = detectPatterns(evaluations);

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const report = buildReport(evaluations, patterns, timestamp);

  // Write report
  const docsDir = path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms', 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const reportPath = path.join(docsDir, 'journey-v3-quality-review.md');
  fs.writeFileSync(reportPath, report, 'utf8');

  // Terminal summary
  const levels = [...new Set(evaluations.map(e => e.level))].sort();
  const globalAvg = (evaluations.reduce((a, e) => a + e.total, 0) / evaluations.length).toFixed(1);
  const perfect8 = evaluations.filter(e => e.total === 8).length;
  const acceptable67 = evaluations.filter(e => e.total >= 6 && e.total < 8).length;
  const needsRegen = evaluations.filter(e => e.total <= 5).length;
  const flaggedIds = evaluations.filter(e => e.total <= 5).map(e => e.id).join(', ') || 'NONE';

  const hasPatterns = Object.values(patterns).some(p => Object.keys(p).length > 0);
  let patternLines = '  None — content quality is consistent';
  if (hasPatterns) {
    patternLines = '';
    for (const [lk, cmap] of Object.entries(patterns)) {
      for (const [c, pct] of Object.entries(cmap)) {
        patternLines += `\n  ${lk} → ${c}: ${pct}% fail`;
      }
    }
  }

  let recommendation;
  const flagPct = needsRegen / evaluations.length;
  if (parseFloat(globalAvg) >= 7.5 && flagPct < 0.10) {
    recommendation = 'Ship as is — quality is excellent (avg ≥ 7.5, < 10% flagged)';
  } else if (hasPatterns) {
    recommendation = 'Update SYSTEM_PROMPT and regenerate affected levels — systemic issue detected';
  } else {
    recommendation = 'Regenerate flagged units only — targeted fix';
  }

  const byLevel = levels.map(lvl => {
    const lu = evaluations.filter(e => e.level === lvl);
    const avg = (lu.reduce((a, e) => a + e.total, 0) / lu.length).toFixed(1);
    const fl = lu.filter(e => e.total <= 5).length;
    return `  L${lvl}: avg ${avg}/8, ${fl} flagged`;
  }).join('\n');

  console.log(`
=== JOURNEY V3 QUALITY REVIEW ===

Full report: docs/journey-v3-quality-review.md

OVERALL:
  Units evaluated: ${evaluations.length}/72
  Average score: ${globalAvg}/8
  Ship as is (8/8): ${perfect8}
  Acceptable (6-7/8): ${acceptable67}
  Needs regeneration (≤5/8): ${needsRegen}

BY LEVEL:
${byLevel}

SYSTEMIC ISSUES:
${patternLines}

RECOMMENDATION:
  ${recommendation}

Flagged unit IDs for regeneration (if needed):
  ${flaggedIds}

Ali: open docs/journey-v3-quality-review.md to read the full audit.
=== END ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
