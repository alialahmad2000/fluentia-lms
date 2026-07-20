# Environment Track «مسار البيئة» — content authoring SPEC

A gated **English** course for Arabic-speaking learners (Fluentia Academy, أكاديمية طلاقة), built for a learner whose world is **wildlife, the environment, and ecotourism**. The immediate learner is **نورة, a 35-year-old Saudi woman** who works at the **National Center for Wildlife (المركز الوطني لتنمية الحياة الفطرية)** — her field is الحياة الفطرية والبيئة والسياحة البيئية. Her goals: general English + the English of HER world — nature & wildlife, ecosystems & habitats, conservation & protection, ecotourism & guiding visitors, fieldwork & data, and environmental awareness. **English is the target skill; her field is the vehicle.** Content is authored ONCE and reused for future environment/wildlife students.

## Your job
You are assigned ONE stage (see the map). Author its **3 lessons** as JSON and `Write` the file to:
`/Users/dr.ali/projects/fluentia-lms/scripts/env-track-content/stage-<N>.json`
(replace `<N>` with your stage number). Then return a one-line confirmation with per-lesson word counts.

## Hard quality rules
- **English accuracy + domain accuracy**: every fact, term, wildlife/environment/ecotourism concept must be correct. Explanations simple but never wrong. (Real Arabian/Saudi nature is welcome — the Arabian oryx (المها العربي), houbara bustard (الحُبارى), Arabian leopard (النمر العربي), gazelle (الغزال), Red Sea coral reefs (الشعاب المرجانية), mangroves (أشجار القُرم/المانغروف), the Nafud/Empty Quarter (النفود/الربع الخالي), protected areas/reserves (المحميات) — but keep the English universal and correct.)
- **CEFR register**: match the lesson's `cefr`. A1/A2 = short simple sentences, common words, present tense mostly. B1/B2 = slightly richer, connectors, some passive/perfect. NEVER above the stated level.
- **Arabic**: natural Modern Standard Arabic (not machine-translated stiffness). The academy brand in Arabic is **طلاقة** (never a transliteration of "Fluentia"). Where you address the learner in 2nd person Arabic, use **FEMININE** forms (اكتبي، تحدّثي، تخيّلي، حاولي، اقرئي) — the learner is a woman. Prefer neutral nominal phrasing for instructions where natural.
- **Respect the learner**: she is 35, a working professional at a national wildlife center, experienced in her field — the ENGLISH is new, not the subject. Never talk down. Scenarios should feel like her real day: a field survey, guiding visitors in a reserve, recording an animal sighting, writing a short report, an awareness talk, a meeting with partners.
- **Saudi context**: welcome and grounding (المحميات الملكية، المركز الوطني لتنمية الحياة الفطرية، مواسم الهجرة، إعادة التوطين) — but keep the English clear and correct.
- **Vocabulary reuse**: the reading passage MUST naturally use most of the lesson's `vocab` words (so tap-to-translate underlines them).
- **MCQ correctness**: `correct` is the EXACT text of the correct option (the app compares by text). Distractors must be plausible but clearly wrong. **Vary which option is correct** (don't always make the first one correct).
- Warm, direct, practical — the tone of a respected trainer talking to a professional woman, not a school textbook.

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
        "intro_ar": "2–4 sentences: why this matters for her work + what she'll learn. Warm, FEMININE where 2nd person.",
        "vocab": [
          { "word": "reserve", "ipa": "/rɪˈzɜːrv/", "meaning_ar": "محمية طبيعية", "meaning_en": "a protected area for wildlife", "example": "The oryx live in a large reserve." }
          // 8–12 items. `ipa` optional (include when confident). `example` is one short level-appropriate sentence.
        ],
        "reading": {
          "title_en": "…", "title_ar": "…",
          "paragraphs": ["…", "…"]   // 2–4 short paragraphs, TOTAL ~120–200 words (A1/A2) up to ~250 (B1/B2). Uses the vocab.
        },
        "key_phrases": [
          { "en": "Please stay on the path.", "ar": "من فضلك ابقَ على المسار." }
          // 4–6 useful, reusable sentence patterns for her work (guiding, recording, explaining)
        ],
        "comprehension": [
          { "question": "What is a reserve?", "options": ["A protected area for wildlife","A type of car","A kind of food","A city street"], "correct": "A protected area for wildlife", "explanation_ar": "المحمية منطقة محميّة تعيش فيها الكائنات الفطرية بأمان." }
          // 4–6 MCQs. `correct` = exact option text. Vary the correct position. Base them on the reading/vocab.
        ],
        "task": {
          "type": "writing",   // "writing" or "speaking"
          "prompt_en": "Write 3–4 sentences about an animal you protect.",
          "prompt_ar": "اكتبي ٣–٤ جُمل عن كائن تعملين على حمايته.",
          "guidance_ar": "استخدمي ٣ كلمات على الأقل من كلمات الدرس."
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
- **Stage 1** `nature-basics` — أساسيات التواصل في مجالك — A1 — accent `#22c55e` — icon `Leaf`
  - `intro-your-work` — التعريف بنفسكِ وعملكِ (A1)
  - `numbers-measurements` — الأرقام والقياسات (A1)
  - `days-and-fieldwork` — الأيام وجدول العمل الميداني (A1)
- **Stage 2** `wildlife` — الحياة الفطرية والحيوانات — A2 — `#34d399` — `Bird`
  - `wild-animals` — الحيوانات البرية (A1)
  - `birds-and-marine` — الطيور والكائنات البحرية (A2)
  - `describing-animals` — وصف الكائنات وسلوكها (A2)
- **Stage 3** `habitats` — البيئات والموائل الطبيعية — A2 — `#10b981` — `TreePine`
  - `landscapes` — التضاريس والمناظر الطبيعية (A2)
  - `ecosystems` — النظم البيئية (A2)
  - `weather-and-climate` — الطقس والمناخ (A2)
- **Stage 4** `conservation` — حماية البيئة والمحافظة — B1 — `#059669` — `ShieldCheck`
  - `protecting-nature` — حماية الطبيعة والكائنات (A2)
  - `endangered-species` — الأنواع المهدَّدة بالانقراض (B1)
  - `threats-and-solutions` — التهديدات والحلول (B1)
- **Stage 5** `ecotourism` — السياحة البيئية — B1 — `#22d3ee` — `Compass`
  - `welcoming-visitors` — استقبال الزوّار (A2)
  - `guiding-a-tour` — إرشاد جولة بيئية (B1)
  - `answering-questions` — الإجابة عن أسئلة الزوّار (B1)
- **Stage 6** `fieldwork` — العمل الميداني والرصد — B1 — `#a78bfa` — `Binoculars`
  - `field-equipment` — أدوات ومعدّات الميدان (A2)
  - `observing-and-recording` — الرصد وتدوين الملاحظات (B1)
  - `field-safety` — السلامة في الميدان (B1)
- **Stage 7** `data-and-reports` — البيانات والتقارير — B1 — `#fbbf24` — `ClipboardList`
  - `collecting-data` — جمع البيانات (B1)
  - `describing-trends` — وصف الاتجاهات والأرقام (B1)
  - `writing-a-report` — كتابة تقرير ميداني (B1)
- **Stage 8** `awareness` — التوعية البيئية والتعليم — B2 — `#f472b6` — `Megaphone`
  - `raising-awareness` — نشر الوعي البيئي (B1)
  - `social-media` — التواصل عبر وسائل التواصل (B1)
  - `school-and-community` — التوعية في المدارس والمجتمع (B2)
- **Stage 9** `partnerships` — الشراكات والتعاون الدولي — B2 — `#60a5fa` — `Handshake`
  - `working-with-partners` — العمل مع الشركاء والجهات (B1)
  - `meetings` — إدارة الاجتماعات (B2)
  - `international-cooperation` — التعاون الدولي والاتفاقيات (B2)
- **Stage 10** `professional-english` — الإنجليزية المهنية للبيئة — B2 — `#fb7185` — `Mail`
  - `emails` — رسائل العمل (B1)
  - `presentations` — تقديم العروض (B2)
  - `advocacy` — لغة الإقناع والمناصرة البيئية (B2)

Output valid JSON only in the file. Double-check every `correct` value appears verbatim in that question's `options`.
