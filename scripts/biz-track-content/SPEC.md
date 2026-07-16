# Business Track «مسار الأعمال» — content authoring SPEC

A gated automotive-business **English** course for Arabic-speaking learners (Fluentia Academy, أكاديمية طلاقة). The immediate learner is **ظافر, a 47-year-old Saudi man** who runs an automotive business (cars & maintenance) alongside his job. His goals: general English + the English of HIS world — the car business, workshop & maintenance, money & finance, and growing a business. English is the target skill; his business is the vehicle. Content is authored ONCE and reused for future business students.

## Your job
You are assigned ONE stage (see the map). Author its **3 lessons** as JSON and `Write` the file to:
`/Users/dr.ali/projects/fluentia-lms/scripts/biz-track-content/stage-<N>.json`
(replace `<N>` with your stage number). Then return a one-line confirmation with per-lesson word counts.

## Hard quality rules
- **English accuracy + domain accuracy**: every fact, term, business/automotive concept must be correct. Explanations simple but never wrong.
- **CEFR register**: match the lesson's `cefr`. A1/A2 = short simple sentences, common words, present tense mostly. B1/B2 = slightly richer, connectors, some passive/perfect. NEVER above the stated level.
- **Arabic**: natural Modern Standard Arabic (not machine-translated stiffness). The academy brand in Arabic is **طلاقة** (never a transliteration of "Fluentia"). Where you address the learner in 2nd person Arabic, use **masculine** forms (اكتب، تحدّث، تخيّل، حاول) — the learner is male. Prefer neutral nominal phrasing for instructions where natural.
- **Respect the learner**: he is 47, runs a real business, and is experienced in his field — the ENGLISH is new, not the business. Never talk down. Scenarios should feel like his real day: the workshop, a supplier call, an invoice, a customer at the counter, a growth plan.
- **Saudi context**: prices in riyals, local flavor welcome (الدوام، الورشة، المعرض، الحي الصناعي) — but keep the English universal and correct.
- **Vocabulary reuse**: the reading passage MUST naturally use most of the lesson's `vocab` words (so tap-to-translate underlines them).
- **MCQ correctness**: `correct` is the EXACT text of the correct option (the app compares by text). Distractors must be plausible but clearly wrong. **Vary which option is correct** (don't always make the first one correct).
- Warm, direct, practical — the tone of a respected trainer talking to a businessman, not a school textbook.

## JSON schema (exact keys)
```json
{
  "stage": {
    "slug": "<from map>", "sort_order": <N>, "title_en": "<from map>", "title_ar": "<from map>",
    "subtitle_ar": "<one warm sentence describing the stage>", "cefr": "<from map>",
    "accent": "<from map>", "icon": "<from map>"
  },
  "lessons": [
    {
      "slug": "<from map>", "sort_order": 1, "title_en": "<from map>", "title_ar": "<from map>", "cefr": "<A1|A2|B1|B2>",
      "content": {
        "intro_ar": "2–4 sentences: why this matters for his business + what he'll learn. Warm, masculine where 2nd person.",
        "vocab": [
          { "word": "invoice", "ipa": "/ˈɪnvɔɪs/", "meaning_ar": "فاتورة", "meaning_en": "a paper that shows what to pay", "example": "I will send the invoice today." }
          // 8–12 items. `ipa` optional (include when confident). `example` is one short level-appropriate sentence.
        ],
        "reading": {
          "title_en": "…", "title_ar": "…",
          "paragraphs": ["…", "…"]   // 2–4 short paragraphs, TOTAL ~120–200 words (A1/A2) up to ~250 (B1/B2). Uses the vocab.
        },
        "key_phrases": [
          { "en": "Your car will be ready at five.", "ar": "سيارتك ستكون جاهزة الساعة الخامسة." }
          // 4–6 useful, reusable sentence patterns for his business
        ],
        "comprehension": [
          { "question": "What does an invoice show?", "options": ["What to pay","The car's speed","The weather","A holiday"], "correct": "What to pay", "explanation_ar": "الفاتورة ورقة توضّح المبلغ المطلوب دفعه." }
          // 4–6 MCQs. `correct` = exact option text. Vary the correct position. Base them on the reading/vocab.
        ],
        "task": {
          "type": "writing",   // "writing" or "speaking"
          "prompt_en": "Write 3–4 sentences about your workshop.",
          "prompt_ar": "اكتب ٣–٤ جُمل عن ورشتك.",
          "guidance_ar": "استخدم ٣ كلمات على الأقل من كلمات الدرس."
        }
      }
    }
    // exactly 3 lessons, sort_order 1..3
  ]
}
```

## Difficulty ramp (respect your stage's cefr)
Stages 1–3 → A1–A2 · Stages 4–7 → A2–B1 · Stages 8–10 → B1–B2.

## Full stage & lesson map (author ONLY your assigned stage)
- **Stage 1** `business-basics` — أساسيات التواصل في العمل — A1 — accent `#f59e0b` — icon `Briefcase`
  - `greetings-at-work` — التحية والتعارف في العمل (A1)
  - `numbers-and-prices` — الأرقام والأسعار (A1)
  - `days-and-appointments` — الأيام والمواعيد (A1)
- **Stage 2** `the-car` — السيارة وأجزاؤها — A2 — `#38bdf8` — `Car`
  - `car-parts` — أجزاء السيارة (A1)
  - `types-of-cars` — أنواع السيارات (A2)
  - `describing-a-car` — وصف السيارة وحالتها (A2)
- **Stage 3** `in-the-workshop` — في الورشة — A2 — `#34d399` — `Wrench`
  - `tools-and-equipment` — الأدوات والمعدّات (A2)
  - `describing-problems` — وصف الأعطال (A2)
  - `maintenance-steps` — خطوات الصيانة (A2)
- **Stage 4** `customer-service` — خدمة العملاء — B1 — `#22d3ee` — `HeartHandshake`
  - `welcoming-customers` — استقبال العميل (A2)
  - `explaining-repairs` — شرح الإصلاح والتكلفة (B1)
  - `handling-complaints` — التعامل مع الشكاوى (B1)
- **Stage 5** `parts-and-suppliers` — قطع الغيار والمورّدون — B1 — `#a78bfa` — `Package`
  - `ordering-parts` — طلب قطع الغيار (A2)
  - `inventory` — المخزون والتوفّر (B1)
  - `negotiating-with-suppliers` — التفاوض مع المورّدين (B1)
- **Stage 6** `money-basics` — المال والفواتير — B1 — `#4ade80` — `Banknote`
  - `quotes-and-invoices` — عروض الأسعار والفواتير (A2)
  - `payments` — الدفع وطرق السداد (B1)
  - `costs-and-pricing` — التكاليف والتسعير (B1)
- **Stage 7** `business-finance` — المالية للأعمال — B1 — `#fbbf24` — `Wallet`
  - `cash-flow` — التدفّق النقدي (B1)
  - `profit-and-loss` — الربح والخسارة (B1)
  - `reading-reports` — قراءة التقارير المالية (B1)
- **Stage 8** `growing-the-business` — تنمية الأعمال والتسويق — B2 — `#f472b6` — `TrendingUp`
  - `marketing-basics` — أساسيات التسويق (B1)
  - `social-media` — التسويق عبر وسائل التواصل (B1)
  - `keeping-customers` — كسب ولاء العملاء (B2)
- **Stage 9** `leading-the-team` — إدارة الفريق والقيادة — B2 — `#60a5fa` — `Users`
  - `hiring` — التوظيف والمقابلات (B1)
  - `giving-instructions` — إعطاء التعليمات والتدريب (B2)
  - `meetings` — إدارة الاجتماعات (B2)
- **Stage 10** `professional-business-english` — إنجليزية الأعمال الاحترافية — B2 — `#fb7185` — `Mail`
  - `business-emails` — رسائل العمل (B1)
  - `negotiation-language` — لغة التفاوض المتقدّمة (B2)
  - `presenting-your-business` — تقديم عرض عن عملك (B2)

Output valid JSON only in the file. Double-check every `correct` value appears verbatim in that question's `options`.
