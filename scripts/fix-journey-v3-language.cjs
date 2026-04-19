#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: 'C:/Users/Dr. Ali/Desktop/fluentia-lms/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Leading-verb → masdar dictionary (for outcomes) ────────────────────────
const VERB_MASDAR = {
  'تعرفين': 'التعرف على',
  'تتعرّفين': 'التعرف على',
  'تتعرفين': 'التعرف على',
  'تستخدمين': 'استخدام',
  'تطلبين': 'طلب',
  'تعطين': 'تقديم',
  'تسمّين': 'تسمية',
  'تسمين': 'تسمية',
  'تصفين': 'وصف',
  'تكتبين': 'كتابة',
  'تقرئين': 'قراءة',
  'تقرأين': 'قراءة',
  'تحكين': 'حكي',
  'تسألين': 'طرح سؤال',
  'تردّين': 'الرد',
  'تردين': 'الرد',
  'تتحدثين': 'التحدث',
  'تتكلمين': 'التحدث',
  'تشرحين': 'شرح',
  'تُشرحين': 'شرح',
  'تُقدّمين': 'تقديم',
  'تقدّمين': 'تقديم',
  'تُقدمين': 'تقديم',
  'تقدمين': 'تقديم',
  'تُلخّصين': 'تلخيص',
  'تلخّصين': 'تلخيص',
  'تلخصين': 'تلخيص',
  'تُقارنين': 'مقارنة',
  'تقارنين': 'مقارنة',
  'تُحلّلين': 'تحليل',
  'تحلّلين': 'تحليل',
  'تحللين': 'تحليل',
  'تناقشين': 'مناقشة',
  'تُقيّمين': 'تقييم',
  'تقيّمين': 'تقييم',
  'تقيمين': 'تقييم',
  'تُعبّرين': 'التعبير عن',
  'تعبّرين': 'التعبير عن',
  'تعبرين': 'التعبير عن',
  'تُحادثين': 'إجراء محادثة مع',
  'تحادثين': 'إجراء محادثة مع',
  'تُميّزين': 'تمييز',
  'تميّزين': 'تمييز',
  'تميزين': 'تمييز',
  'تُدوّنين': 'تدوين',
  'تدوّنين': 'تدوين',
  'تدونين': 'تدوين',
  'تُطبّقين': 'تطبيق',
  'تطبّقين': 'تطبيق',
  'تطبقين': 'تطبيق',
  'تُترجمين': 'ترجمة',
  'تترجمين': 'ترجمة',
  'تُجيبين': 'الإجابة على',
  'تجيبين': 'الإجابة على',
  'تُبيّنين': 'بيان',
  'تبيّنين': 'بيان',
  'تُفسّرين': 'تفسير',
  'تفسّرين': 'تفسير',
  'تفسرين': 'تفسير',
  'تستخلصين': 'استخلاص',
  'تنطقين': 'نطق',
  'تُكملين': 'إكمال',
  'تكملين': 'إكمال',
  'تُحدّدين': 'تحديد',
  'تحدّدين': 'تحديد',
  'تُحددين': 'تحديد',
  'تحددين': 'تحديد',
  'تُبرّرين': 'تبرير',
  'تبرّرين': 'تبرير',
  'تبررين': 'تبرير',
  'تُجرّين': 'إجراء',
  'تجرّين': 'إجراء',
  'تُقنّعين': 'إقناع',
  'تُقنعين': 'إقناع',
  'تقنّعين': 'إقناع',
  'تُحاضرين': 'إلقاء محاضرة',
  'تقترحين': 'اقتراح',
  'تُقترحين': 'اقتراح',
  'تصحّحين': 'تصحيح',
  'تُصحّحين': 'تصحيح',
  'تُتابعين': 'متابعة',
  'تتابعين': 'متابعة',
  'تُعرّفين': 'تعريف',
  'تعرّفين': 'تعريف',
  'تعترضين': 'اعتراض',
  'تتفاوضين': 'تفاوض',
  'تُتقنين': 'إتقان',
  'تتقنين': 'إتقان',
  'تكتسبين': 'اكتساب',
  'تحجزين': 'حجز',
  'تُحجزين': 'حجز',
  'تنتجين': 'إنتاج',
  'تُنتجين': 'إنتاج',
  'تتخذين': 'اتخاذ',
  'تصممين': 'تصميم',
  'تكتشفين': 'اكتشاف',
  'تراجعين': 'مراجعة',
  'تُراجعين': 'مراجعة',
  'تختارين': 'اختيار',
  'تتبعين': 'اتباع',
  'تتوقعين': 'توقع',
  'تستمعين': 'الاستماع',
  'تنجزين': 'إنجاز',
  'تُنجزين': 'إنجاز',
  'تُكتشفين': 'اكتشاف',
  'تُصممين': 'تصميم',
  'تربطين': 'ربط',
  'تُربطين': 'ربط',
  'تحضرين': 'حضور',
  'تُحضّرين': 'إعداد',
  'تحضّرين': 'إعداد',
  // ── Diacritic-bearing forms (تُفعلين, تُفعِّلين) ─────────────────────────
  'تُرافقين': 'مرافقة',
  'تُجرين': 'إجراء',
  'تُطرحين': 'طرح',
  'تُقررين': 'قرار',
  'تُقرّرين': 'قرار',
  'تُحكّمين': 'تحكيم',
  'تُحكِّمين': 'تحكيم',
  'تُقلّبين': 'تصفح',
  'تُقلبين': 'تصفح',
  'تجوّلين': 'تجوّل',
  'تُجوّلين': 'تجوّل',
  'تتجوّلين': 'التجوّل',
  'تُتجوّلين': 'التجوّل',
  'تمرّين': 'المرور بـ',
  'تُعطين': 'تقديم',
  'تُسبّبين': 'التسبب في',
  'تُوازنين': 'موازنة',
  'تُدافعين': 'الدفاع عن',
  'تُرشّدين': 'إرشاد',
  'تُجرّبين': 'تجربة',
  'تُسمّين': 'تسمية',
  'تُشغّلين': 'تشغيل',
  'تُصوّتين': 'التصويت',
  'تُعدّين': 'الإعداد',
  'تُمثّلين': 'تمثيل',
  'تُعرضين': 'عرض',
  'تُعرّضين': 'عرض',
  // ── Additional verbs discovered in Phase D ───────────────────────────────
  'تفهمين': 'فهم',
  'تتعلمين': 'تعلّم',
  'تتعلّمين': 'تعلّم',
  'تزورين': 'زيارة',
  'تنظرين': 'النظر في',
  'ترين': 'رؤية',
  'تدخلين': 'الدخول إلى',
  'تشترين': 'شراء',
  'تملئين': 'ملء',
  'تحتاجين': 'الحاجة إلى',
  'تحبين': 'تفضيل',
  'تحبّين': 'تفضيل',
  'تستمتعين': 'الاستمتاع بـ',
  'تصلين': 'الوصول إلى',
  'تعملين': 'العمل في',
  'تجلسين': 'الجلوس',
  'تستفسرين': 'الاستفسار عن',
  'تشاهدين': 'مشاهدة',
  'تجدين': 'العثور على',
  'تقدرين': 'القدرة على',
  'تتمكنين': 'التمكن من',
  'تتحاورين': 'التحاور',
  'تخططين': 'التخطيط',
  'تنشرين': 'نشر',
  'تريدين': 'الرغبة في',
  'تقضين': 'قضاء',
  'تترددين': 'التردد في',
  'ترتدين': 'ارتداء',
  'تتخيلين': 'التخيل',
  'تسعين': 'السعي إلى',
  'ترتادين': 'الارتياد',
  'تقفين': 'الوقوف',
  'تتأملين': 'التأمل',
  'تبتلعين': 'استيعاب',
  'تخصصين': 'تخصيص',
  'تلاحظين': 'ملاحظة',
  'تقولين': 'القول',
  'تبنين': 'تبني',
  // OUT leading verbs
  'تجرين': 'إجراء',
  'تفعلين': 'تنفيذ',
  'تحلمين': 'الحلم بـ',
  'تستوعبين': 'استيعاب',
  'تستخرجين': 'استخراج',
  'تنصحين': 'تقديم نصيحة',
  'تدافعين': 'الدفاع عن',
  'تعليقين': 'التعليق على',
  'تُعلّقين': 'التعليق على',
  'تعلّقين': 'التعليق على',
  'تعشقين': 'التعلق بـ',
  'تحسين': 'تحسين',
  'تدعين': 'دعوة',
  'تلفتين': 'لفت الانتباه إلى',
  'ترجمين': 'ترجمة',
  'ترحين': 'الترحيب بـ',
  'تشين': 'الإشادة بـ',
  'تنافستين': 'التنافس',
  'تخمين': 'تخمين',
  // Ribbon verbs
  'تقابلين': 'في اللقاء',
  'تفخرين': 'موضع فخر',
  'تعرضين': 'عرض',
  'تقيسين': 'قياس',
  'تعتقدين': 'في مناقشة',
  'تشككين': 'التشكيك في',
  'تكرين': 'رفض',
};

// ── Inline replacements (apply to any field) ────────────────────────────────
// Order matters: more specific first
const INLINE = [
  // تسجيل replacements (must come first)
  [/تسجيلاً\s+ل/g, 'مقطعاً مصوراً ل'],
  [/تسجيل\s+جمل/g, 'كتابة جمل'],
  [/تسجيل\s+محادثة/g, 'إجراء محادثة'],
  [/تسجيل\s+ملاحظات/g, 'تدوين ملاحظات'],
  [/تسجيل\s+إجابة/g, 'إدخال إجابة'],
  [/تسجّلين/g, 'تُدوّنين'],
  [/تسجّل\s/g, 'توثيق '],

  // Conjunction + feminine verb chains (و + ت...ين)
  [/وتعرفين\s/g, 'ومعرفة '],
  [/وتستخدمينها/g, 'واستخدامها'],
  [/وتستخدمين\s/g, 'واستخدام '],
  [/وتطلبين\s/g, 'وطلب '],
  [/وتعطينها/g, 'وتقديمها'],
  [/وتعطين\s/g, 'وتقديم '],
  [/وتسألين\s/g, 'وطرح سؤال '],
  [/وتردّين\s/g, 'والرد '],
  [/وتردين\s/g, 'والرد '],
  [/وتقارنين\s/g, 'ومقارنة '],
  [/وتُلخّصين\s/g, 'وتلخيص '],
  [/وتلخّصين\s/g, 'وتلخيص '],
  [/وتُقدّمين\s/g, 'وتقديم '],
  [/وتقدّمين\s/g, 'وتقديم '],
  [/وتُحلّلين\s/g, 'وتحليل '],
  [/وتحلّلين\s/g, 'وتحليل '],
  [/وتشرحين\s/g, 'وشرح '],
  [/وتكتبين\s/g, 'وكتابة '],
  [/وتُبيّنين\s/g, 'وبيان '],
  [/وتُعبّرين\s/g, 'والتعبير عن '],
  [/وتعبّرين\s/g, 'والتعبير عن '],
  [/وتُميّزين\s/g, 'وتمييز '],
  [/وتميّزين\s/g, 'وتمييز '],
  [/وتُحددين\s/g, 'وتحديد '],
  [/وتحددين\s/g, 'وتحديد '],
  [/وتُقيّمين\s/g, 'وتقييم '],
  [/وتناقشين\s/g, 'ومناقشة '],
  [/وتُقارنين\s/g, 'ومقارنة '],
  [/وتُجيبين\s/g, 'والإجابة '],
  [/وتُكملين\s/g, 'وإكمال '],
  [/وتكملين\s/g, 'وإكمال '],
  [/وتُبرّرين\s/g, 'وتبرير '],
  [/وتُقنّعين\s/g, 'وإقناع '],
  [/وتُصحّحين\s/g, 'وتصحيح '],
  [/وتستخلصين\s/g, 'واستخلاص '],
  [/وتُميّزين\s/g, 'وتمييز '],
  [/وتحكين\s/g, 'وحكي '],
  [/وتتعرّفين\s/g, 'والتعرف على '],
  [/وتسمّين\s/g, 'وتسمية '],

  // Ribbon-specific patterns
  [/تحبينها/g, 'المفضلة'],
  [/تحبّينها/g, 'المفضلة'],
  [/تقودين\s+بها/g, 'للتوجيه'],
  [/\bتقودين\b/g, 'للتوجيه'],
  [/تصفين\s+فيها/g, 'في وصف'],
  [/تصفين\s+به\b/g, 'في وصف'],
  [/\bتصفين\b/g, 'لوصف'],
  [/تعيشينها/g, 'في الحياة اليومية'],
  [/تواجهينها/g, 'الواقعية'],
  [/تحتاجينها/g, 'الضرورية'],
  [/تحتاجين\s+إليها/g, 'الضرورية'],
  [/تستخدمينها/g, 'للاستخدام الفعلي'],
  [/تستخدمينه/g, 'للاستخدام الفعلي'],

  // why_matters common openers / inner patterns
  [/وأنتِ\s+/g, ''],
  [/أنتِ\s+الآن\s+/g, ''],
  [/أنتِ\s+من\s+/g, ''],
  [/\bأنتِ\s+/g, ''],
  // remove "تريدين أن X" clauses (up to end of sentence)
  [/[،,]\s*تريدين\s+أن\s+[^.،,]+[.،,]/g, '.'],
  [/تريدين\s+أن\s+[^.،,]+/g, ''],
  // before/after patterns
  [/قبل\s+هذه\s+الوحدة:\s+تُومئين\s+بالرأس/g, 'قبل الوحدة: إيماء فقط'],
  [/قبل\s+هذه\s+الوحدة:\s+تُومئين\s+وتمشين/g, 'قبل الوحدة: إيماء وانصراف'],
  [/قبل\s+هذه\s+الوحدة:\s+تُومئين/g, 'قبل الوحدة: إيماء فقط'],
  [/قبل\s+هذه\s+الوحدة:\s+تبتسمين\s+فقط/g, 'قبل الوحدة: ابتسامة صامتة'],
  [/قبل\s+هذه\s+الوحدة:\s+تبتسمين\s+وتمشين/g, 'قبل الوحدة: ابتسامة وانصراف'],
  [/قبل\s+هذه\s+الوحدة:\s+تبتسمين/g, 'قبل الوحدة: ابتسامة'],
  [/قبل\s+هذه\s+الوحدة:\s+تنتظرين\s+الترجمة/g, 'قبل الوحدة: انتظار الترجمة'],
  [/قبل\s+هذه\s+الوحدة:\s+تُجيبين\s+بجمل\s+مبتورة/g, 'قبل الوحدة: إجابات مبتورة'],
  [/قبل\s+هذه\s+الوحدة:\s+تقول\s+/g, 'قبل الوحدة: '],
  [/قبل\s+هذه\s+الوحدة:/g, 'قبل الوحدة:'],
  // "بعدها: أنتِ من تفعلين X" → "بعدها: X"
  [/بعدها:\s+أنتِ\s+من\s+تُقدّمين\s+/g, 'بعدها: تقديم '],
  [/بعدها:\s+أنتِ\s+من\s+تقدّمين\s+/g, 'بعدها: تقديم '],
  [/بعدها:\s+أنتِ\s+من\s+تقترحين\s+/g, 'بعدها: اقتراح '],
  [/بعدها:\s+أنتِ\s+من\s+تُقنّعين\s+/g, 'بعدها: إقناع '],
  [/بعدها:\s+أنتِ\s+من\s+تطرحين\s+/g, 'بعدها: طرح '],
  [/بعدها:\s+أنتِ\s+من\s+تُحلّلين\s+/g, 'بعدها: تحليل '],
  [/بعدها:\s+أنتِ\s+من\s+تشرحين\s+/g, 'بعدها: شرح '],
  [/بعدها:\s+أنتِ\s+من\s+تُجيبين\s+/g, 'بعدها: إجابة '],
  [/بعدها:\s+أنتِ\s+من\s+تسألين\s+/g, 'بعدها: سؤال '],
  [/بعدها:\s+أنتِ\s+من\s+ت/g, 'بعدها: '],
  // حين patterns
  [/حين\s+تجلسين\s+/g, 'عند الجلوس '],
  [/حين\s+تخرجين\s+/g, 'خارج '],
  [/حين\s+تذهبين\s+/g, 'عند الذهاب إلى '],
  [/حين\s+تسافرين\s+/g, 'في السفر إلى '],
  [/حين\s+تريدين\s+/g, 'عند الحاجة إلى '],
  [/حين\s+تُجرّبين\s+/g, 'عند تجربة '],
  [/حين\s+تتابعين\s+/g, 'عند متابعة '],
  [/حين\s+تسمعين\s+/g, 'عند سماع '],
  [/حين\s+تقرئين\s+/g, 'عند قراءة '],
  [/حين\s+تقرأين\s+/g, 'عند قراءة '],
  [/حين\s+تُدركين\s+/g, 'حين يتضح '],
  [/حين\s+تُلاحظين\s+/g, 'عند ملاحظة '],
  [/حين\s+تُقرّرين\s+/g, 'عند قرار '],
  [/حين\s+تُحاولين\s+/g, 'عند محاولة '],
  // تبدئين patterns
  [/تبدئين\s+يومكِ/g, 'بداية اليوم'],
  [/تبدئين\s+/g, 'عند البدء '],
  // تسيرين patterns
  [/وتسيرين\s+في\s+/g, 'وفي '],
  // "تُدركين أن" → "يتضح أن"
  [/تُدركين\s+أن\s+/g, 'يتضح أن '],
  [/تُدركين\s+/g, 'يتضح '],
  // remaining generic ت...ين → passive/neutral transformations
  [/تبتسمين\s+لكن\s+/g, 'ابتسامة — لكن '],
  [/تبتسمين/g, 'ابتسامة'],
  [/تُومئين/g, 'إيماء'],
  [/تبحثين\s+عن\s+/g, 'البحث عن '],
  [/تتمنّين\s+/g, 'الأمل في '],
  [/تتمنين\s+/g, 'الأمل في '],
  [/تتساءلين:\s+/g, 'سؤال يطرح نفسه: '],
  [/تتساءلين\s+/g, 'تساؤل '],
  [/تُشيرين\s+/g, 'الإشارة '],
  [/تشعرين\s+/g, ''],
  [/تُحسّين\s+/g, ''],
  // يكفيكِ → يكفي
  [/يكفيكِ\s+أن\s+تعرفي\s+/g, 'يكفي معرفة '],
  [/يكفيكِ\s+/g, 'يكفي '],
  // تعرفي (imperative) → (drop it — part of a larger clause)
  // possessive ـكِ on nouns — these are fine to keep (not verb violations)
  // ── Context-aware embedded-verb patterns (dynamic replacers) ────────────────
  // Arabic full block including diacritics (\u064B-\u065F) + base letters
  // حين/عندما/بينما + ت...ين → عند + masdar
  [/(حين|عندما|بينما|كلما)\s+(ت[\u0600-\u06FF]+ين)/g,
    (_, conj, verb) => { const m = normLookup(verb); return m ? `عند ${m}` : `${conj} ${verb}`; }],
  // ما/الذي/التي/اللي + ت...ين → masdar alone
  [/(ما|الذي|التي|اللي)\s+(ت[\u0600-\u06FF]+ين)/g,
    (_, _rel, verb) => normLookup(verb) || verb],
  // أن + ت...ين → masdar alone
  [/أن\s+(ت[\u0600-\u06FF]+ين)/g,
    (_, verb) => normLookup(verb) || verb],
  // أو/ثم + ت...ين → أو/ثم + masdar
  [/(أو|ثم)\s+(ت[\u0600-\u06FF]+ين)/g,
    (_, conj, verb) => { const m = normLookup(verb); return m ? `${conj} ${m}` : `${conj} ${verb}`; }],
  // ل + ت...ين → ل + masdar
  [/ل(ت[\u0600-\u06FF]+ين)/g,
    (_, verb) => { const m = normLookup(verb); return m ? `ل${m}` : `ل${verb}`; }],
  // و + ت...ين (not already caught by specific و-patterns above) → و + masdar
  [/و(ت[\u0600-\u06FF]+ين)/g,
    (_, verb) => { const m = normLookup(verb); return m ? `و${m}` : `و${verb}`; }],
  // Final catch-all: any remaining ت...ين (with or without diacritics) → masdar
  [/ت[\u0600-\u06FF]+ين/g,
    (match) => normLookup(match) || match],
  // Double-space cleanup
  [/\s{2,}/g, ' '],
];

// ── Strip Arabic diacritics for normalized VERB_MASDAR lookup ───────────────
function normLookup(verb) {
  if (VERB_MASDAR[verb]) return VERB_MASDAR[verb];
  const stripped = verb.replace(/[\u064B-\u065F\u0610-\u061A\u0670]/g, '');
  return VERB_MASDAR[stripped] || null;
}

// ── Apply inline replacements to any string ─────────────────────────────────
function applyInline(text) {
  let t = text;
  for (const [re, rep] of INLINE) t = t.replace(re, rep);
  return t.trim();
}

// ── Transform a single outcome string ───────────────────────────────────────
function transformOutcome(o) {
  let t = applyInline(o);
  // Try leading verb substitution
  for (const [verb, masdar] of Object.entries(VERB_MASDAR)) {
    if (t.startsWith(verb)) {
      const rest = t.slice(verb.length);
      // "التعبير عن" / "التعرف على" / "الإجابة على" need no space adjustment
      t = masdar + (rest.startsWith(' ') ? rest : ' ' + rest);
      break;
    }
  }
  return t;
}

// ── Transform ribbons object ─────────────────────────────────────────────────
function transformRibbons(ribbons) {
  if (!ribbons) return ribbons;
  const result = {};
  for (const [key, val] of Object.entries(ribbons)) {
    result[key] = applyInline(val);
  }
  return result;
}

// ── Regex check ─────────────────────────────────────────────────────────────
const FEM_RE = /ت[\u0621-\u064A]+ين/;
const TAS_RE = /تسج[\u064A\u0651][\u0644\u064A]/;

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { data: units, error } = await sb
    .from('curriculum_units')
    .select('id, unit_number, why_matters, outcomes, activity_ribbons, curriculum_levels!inner(level_number)')
    .not('brief_generated_at', 'is', null)
    .order('unit_number');
  if (error) { console.error(error.message); process.exit(1); }

  const u = (units || []).sort((a, b) => {
    const la = a.curriculum_levels?.level_number ?? 99;
    const lb = b.curriculum_levels?.level_number ?? 99;
    return la !== lb ? la - lb : a.unit_number - b.unit_number;
  });

  let ok = 0, fail = 0, whyChanges = 0, outChanges = 0, ribChanges = 0, tasChanges = 0;
  let idx = 0;

  for (const unit of u) {
    idx++;
    const lvl = unit.curriculum_levels?.level_number ?? '?';

    const oldWhy = unit.why_matters || '';
    const oldOut = unit.outcomes || [];
    const oldRib = unit.activity_ribbons || {};

    // Count تسجيل hits before transformation
    const wasTas = TAS_RE.test(oldWhy) || TAS_RE.test(JSON.stringify(oldOut)) || TAS_RE.test(JSON.stringify(oldRib));

    const newWhy = applyInline(oldWhy);
    const newOut = oldOut.map(transformOutcome);
    const newRib = transformRibbons(oldRib);

    const whyChanged = newWhy !== oldWhy;
    const outChanged = JSON.stringify(newOut) !== JSON.stringify(oldOut);
    const ribChanged = JSON.stringify(newRib) !== JSON.stringify(oldRib);

    if (!whyChanged && !outChanged && !ribChanged) {
      console.log(`Unit ${idx}/72 (L${lvl} U${unit.unit_number}): no changes needed`);
      ok++;
      continue;
    }

    if (whyChanged) whyChanges++;
    if (outChanged) outChanges++;
    if (ribChanged) ribChanges++;
    if (wasTas) tasChanges++;

    const { data, error: updErr } = await sb
      .from('curriculum_units')
      .update({
        why_matters: newWhy,
        outcomes: newOut,
        activity_ribbons: newRib,
        brief_generated_at: new Date().toISOString(),
      })
      .eq('id', unit.id)
      .select('id');

    if (updErr || !data || data.length !== 1) {
      console.error(`FAIL L${lvl} U${unit.unit_number}: ${updErr?.message || 'rowcount mismatch'}`);
      fail++;
      continue;
    }

    console.log(`Unit ${idx}/72 (L${lvl} U${unit.unit_number}): transformed ✓${whyChanged ? ' [why]' : ''}${outChanged ? ' [out]' : ''}${ribChanged ? ' [rib]' : ''}`);
    ok++;
  }

  console.log(`\n=== PHASE C SUMMARY ===`);
  console.log(`Units processed: ${u.length}`);
  console.log(`Successful updates: ${ok}`);
  console.log(`Failed updates: ${fail}`);
  console.log(`Total why_matters changes: ${whyChanges}`);
  console.log(`Total outcome transformations: ${outChanges}`);
  console.log(`"تسجيل" replacements: ${tasChanges}`);
  console.log(`Total ribbon changes: ${ribChanges}`);

  if (fail > 0) {
    console.error(`\n⚠️  ${fail} units failed. Investigate before commit.`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
