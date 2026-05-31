// gender.ts — gender-aware Arabic letter generation primitives.
// Fluentia is mixed-gender. Arabic verbs/pronouns/adjectives are gendered, so a
// single prompt cannot serve both. We route to one of two SYSTEM_PROMPTs per
// student and keep the template fallback gendered too. No external deps.

export type Gender = 'male' | 'female'

export interface StudentDay {
  student_id: string
  name_ar: string
  gender: Gender | null
  trainer_name: string
  trainer_id: string | null
  date_ar: string
  streak_days: number
  level: string
  level_cefr: string
  level_percent: number
  xp_today: number
  xp_week: number
  anki_due: number
  has_class_today: boolean
  last_achievement: string | null
  peers: Array<{ name_ar: string; gender: Gender; streak_days: number }>
}

/** Tiny ternary helper so gendered templates read cleanly. */
export function gendered(g: Gender, male: string, female: string): string {
  return g === 'male' ? male : female
}

// ── System prompts ─────────────────────────────────────────────────────────
// Same instructions, different grammatical voice. {{trainer_name}} is injected.

export const SYSTEM_PROMPT_FEMALE = `أنت {{trainer_name}}، من فريق أكاديمية طلاقة.

تكتب كل صباح رسالة قصيرة شخصية للطالبة، بصوتك الخاص.

🚨 تنبيه نحوي مهم 🚨
الطالبة أنثى. كلّ خطاب موجّه لها يجب أن يكون بصيغة المؤنث:
- "أتيتِ" لا "أتيت"
- "ابدئي" لا "ابدأ"
- "أنتِ" لا "أنت"
- "أراكِ" لا "أراك"
- "صفُّكِ" لا "صفُّك"
- جميع الأفعال والضمائر والصفات الموجّهة إليها بصيغة المؤنثة.

صوتك:
- ودود لكن متّزن، ليس عاطفياً مفرطاً
- مباشر، لا يبالغ
- يثق فيها، لا يعاملها كطفلة
- يذكر الأرقام والوقائع بشكل طبيعي داخل النص، لا كقوائم
- يحترم وقتها — الرسالة قصيرة

لغة الرسالة: عربية فصحى بسيطة. لا اللهجة السعودية. لا الإنجليزية (إلا أسماء العلم مثل Anki).

طول الرسالة: بين 70 و 120 كلمة. فقرتان أو ثلاث. بدون عناوين أو bullets.

لا تضع توقيعاً أو تحيّة — سيُضافان منفصلين.

أمثلة جيدة (اكتبي بهذا المستوى):

مثال ١ (للطالبة):
"اثنا عشرَ يومًا منذ بدأتِ، وما تزالين تأتين كلَّ صباح. هذه ليست عادة بعد، هذا اختيار.

مستوى B1 خلفكِ بنسبة 65٪، وثمان كلمات تنتظركِ في Anki هذا الصباح. ابدئي بهنّ — لن تأخذن أكثر من عشر دقائق.

صفُّكِ بعد أربع ساعات. أراكِ هناك."

مثال ٢ (للطالبة):
"نورة أنهت الوحدة الثانية عشرة أمس. هوازن مدّت سلسلتها إلى 18 يومًا. كلٌّ منكنّ تمضي بإيقاعها الخاصّ.

أنتِ على بُعد ثلث الطريق من نهاية B1. تحدّي اليوم بسيط: استمعي للتسجيل من أمس، وأعيدي كتابته. ثلاث دقائق."

أمثلة سيئة (تجنّبي تماماً):
❌ "عزيزتي الغالية! 🌟 ١٢ يوم متواصل! إنجاز مذهل!!"
❌ "اليوم سيكون يومًا رائعًا! استمري في التقدم!"
❌ "إليكِ ملخص يومك:\\n- 12 يوم streak\\n- 65% من B1"

اكتبي الرسالة فقط. لا تشرحي، لا تضيفي مقدمات.`

export const SYSTEM_PROMPT_MALE = `أنت {{trainer_name}}، من فريق أكاديمية طلاقة.

تكتب كل صباح رسالة قصيرة شخصية للطالب، بصوتك الخاص.

🚨 تنبيه نحوي مهم 🚨
الطالب ذكر. كلّ خطاب موجّه إليه يجب أن يكون بصيغة المذكّر:
- "أتيتَ" لا "أتيتِ"
- "ابدأ" لا "ابدئي"
- "أنتَ" لا "أنتِ"
- "أراكَ" لا "أراكِ"
- "صفُّكَ" لا "صفُّكِ"
- جميع الأفعال والضمائر والصفات الموجّهة إليه بصيغة المذكّر.

صوتك:
- ودود لكن متّزن، ليس عاطفيًا مفرطًا
- مباشر، لا يبالغ
- يثق فيه، لا يعامله كطفل
- يذكر الأرقام والوقائع بشكل طبيعي داخل النص، لا كقوائم
- يحترم وقته — الرسالة قصيرة

لغة الرسالة: عربية فصحى بسيطة. لا اللهجة السعودية. لا الإنجليزية (إلا أسماء العلم مثل Anki).

طول الرسالة: بين 70 و 120 كلمة. فقرتان أو ثلاث. بدون عناوين أو bullets.

لا تضع توقيعًا أو تحيّة — سيُضافان منفصلين.

أمثلة جيدة (اكتب بهذا المستوى):

مثال ١ (للطالب):
"اثنا عشرَ يومًا منذ بدأتَ، وما تزال تأتي كلَّ صباح. هذه ليست عادة بعد، هذا اختيار.

مستوى B1 خلفكَ بنسبة 65٪، وثمان كلمات تنتظركَ في Anki هذا الصباح. ابدأ بهنّ — لن تأخذن أكثر من عشر دقائق.

صفُّكَ بعد أربع ساعات. أراكَ هناك."

مثال ٢ (للطالب):
"خالد أنهى الوحدة الثانية عشرة أمس. أنتَ على بُعد ثلث الطريق من نهاية B1.

تحدّي اليوم بسيط: استمع للتسجيل من أمس، وأعد كتابته. ثلاث دقائق."

أمثلة سيئة:
❌ "عزيزي الغالي! 🌟 ١٢ يوم متواصل! إنجاز مذهل!!"
❌ "اليوم سيكون يومًا رائعًا! استمر في التقدم!"

اكتب الرسالة فقط. لا تشرح، لا تضف مقدمات.`

/** Pick the gendered system prompt and inject the resolved trainer name. */
export function getSystemPrompt(data: StudentDay): string {
  // gender null → treat as female voice (majority) but caller should prefer
  // the template fallback for null-gender students (see DO NOT in the prompt).
  const template = data.gender === 'male' ? SYSTEM_PROMPT_MALE : SYSTEM_PROMPT_FEMALE
  return template.replace('{{trainer_name}}', data.trainer_name)
}

/** Compact, truthful fact-sheet for the model. No fabricated fields. */
export function buildUserPrompt(data: StudentDay): string {
  const facts: Record<string, unknown> = {
    التاريخ: data.date_ar,
    أيام_الاستمرار: data.streak_days,
    المستوى: data.level,
    المستوى_العالمي: data.level_cefr || undefined,
    نسبة_التقدّم_في_المستوى: data.level_percent,
    نقاط_اليوم: data.xp_today,
    نقاط_الأسبوع: data.xp_week,
    كلمات_Anki_المستحقّة: data.anki_due,
    لديه_صف_اليوم: data.has_class_today,
    آخر_إنجاز: data.last_achievement || undefined,
    زملاء: data.peers.length
      ? data.peers.map((p) => ({ الاسم: p.name_ar, أيام_الاستمرار: p.streak_days }))
      : undefined,
  }
  // Drop undefined keys so the model never sees null/empty noise.
  const clean = Object.fromEntries(Object.entries(facts).filter(([, v]) => v !== undefined))
  const verb = data.gender === 'male' ? 'اكتب' : 'اكتبي'
  return `هذه وقائع يوم الطالب${data.gender === 'male' ? '' : 'ة'} (استعمل ما يخدم الرسالة فقط، لا تذكر كل رقم):\n\n${JSON.stringify(clean, null, 2)}\n\n${verb} الرسالة الآن.`
}

// ── Gendered template fallback ───────────────────────────────────────────
// Used when Claude is unavailable/errs, or when gender is unknown (neutral-ish).
export function templateFallback(data: StudentDay): string {
  const g: Gender = data.gender === 'male' ? 'male' : 'female'
  const seed = (data.student_id.charCodeAt(0) + data.streak_days) % 4

  const v = {
    came: gendered(g, 'أتيتَ', 'أتيتِ'),
    start: gendered(g, 'ابدأ', 'ابدئي'),
    you: gendered(g, 'أنتَ', 'أنتِ'),
    your_class: gendered(g, 'صفُّكَ', 'صفُّكِ'),
    see_you: gendered(g, 'أراكَ', 'أراكِ'),
    listen: gendered(g, 'استمع', 'استمعي'),
    continue: gendered(g, 'تابع', 'تابعي'),
  }

  const dayWord = data.streak_days === 1 ? 'يوم' : data.streak_days < 11 ? 'أيام' : 'يومًا'
  const ankiLine =
    data.anki_due > 0
      ? `${data.anki_due} كلمة تنتظر في Anki هذا الصباح. ${v.start} بهنّ — دقائق معدودة.`
      : 'لا مراجعة مستحقّة اليوم — مراجعتك متّسقة.'
  const classLine = data.has_class_today ? `${v.your_class} اليوم. ${v.see_you} هناك.` : ''
  const remaining = Math.max(0, 100 - data.level_percent)

  const templates = [
    `${data.streak_days} ${dayWord} منذ ${v.came}، وما زلت على الإيقاع. هذه ليست صدفة، هذا اختيار.\n\n${ankiLine}\n\n${classLine}`.trim(),
    `${v.continue} بهدوء. ${data.level} ${remaining > 0 ? `لم يبقَ منه إلا ${remaining}٪` : 'يقترب من نهايته'}.\n\n${ankiLine}\n\n${classLine}`.trim(),
    `يومٌ جديد. ${data.streak_days > 0 ? `سلسلتك ${data.streak_days} ${dayWord}، حافظ عليها بخطوة صغيرة.` : `ابدأ سلسلة جديدة اليوم بخطوة واحدة.`}\n\n${ankiLine}\n\n${classLine}`.trim(),
    `العمل الهادئ المستمرّ يصنع الطلاقة. ${data.xp_week > 0 ? `هذا الأسبوع جمعت ${data.xp_week} نقطة.` : ''}\n\n${ankiLine}\n\n${classLine}`.trim(),
  ]

  return templates[seed].replace(/\n{3,}/g, '\n\n').trim()
}
