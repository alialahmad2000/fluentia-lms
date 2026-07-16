# Tech Track «مسار التقنية» — content authoring SPEC

A gated IT/Computer-Science **English** course for Arabic-speaking learners (Fluentia Academy, أكاديمية طلاقة). The immediate learner is **أطياف, an 18-year-old Saudi female** heading into an IT / Computer-Science university major. English is the target skill; tech is the vehicle. Content is authored ONCE and reused for future CS students.

## Your job
You are assigned ONE stage (see the map). Author its **3 lessons** as JSON and `Write` the file to:
`/private/tmp/claude-501/-Users-dr-ali/bdbac738-eb66-431a-a962-c373feb9a1e0/scratchpad/tech-track/stage-<N>.json`
(replace `<N>` with your stage number). Then return a one-line confirmation with per-lesson word counts.

## Hard quality rules
- **English accuracy + IT accuracy**: every fact, term, and code concept must be correct. Explanations simple but never wrong.
- **CEFR register**: match the lesson's `cefr`. A1/A2 = short simple sentences, common words, present tense mostly. B1/B2 = slightly richer, connectors, some passive/perfect. NEVER above the stated level.
- **Arabic**: natural Modern Standard Arabic (not machine-translated stiffness). The academy brand in Arabic is **طلاقة** (never a transliteration of "Fluentia"). Where you address the learner in 2nd person Arabic, use **feminine** forms (اكتبي، تحدّثي، تخيّلي، حاولي) — the learner is female and the platform default is feminine. Prefer neutral nominal phrasing for instructions where natural.
- **Vocabulary reuse**: the reading passage MUST naturally use most of the lesson's `vocab` words (so tap-to-translate underlines them).
- **MCQ correctness**: `correct` is the EXACT text of the correct option (the app compares by text). Distractors must be plausible but clearly wrong. **Vary which option is correct** (don't always make the first one correct).
- Warm, encouraging, real — not dry textbook. This should make a teenager excited about her field in English.

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
        "intro_ar": "2–4 sentences: why this matters for her major + what she'll learn. Warm, feminine where 2nd person.",
        "vocab": [
          { "word": "computer", "ipa": "/kəmˈpjuːtər/", "meaning_ar": "حاسوب", "meaning_en": "a machine that stores and works with data", "example": "She uses a computer to write code." }
          // 8–12 items. `ipa` optional (include when confident). `example` is one short A-level sentence.
        ],
        "reading": {
          "title_en": "…", "title_ar": "…",
          "paragraphs": ["…", "…"]   // 2–4 short paragraphs, TOTAL ~120–200 words (A1/A2) up to ~250 (B1/B2). Uses the vocab.
        },
        "key_phrases": [
          { "en": "Turn on the computer.", "ar": "شغّلي الحاسوب." }
          // 4–6 useful, reusable sentence patterns for her field
        ],
        "comprehension": [
          { "question": "What does a computer do?", "options": ["Stores and works with data","Cooks food","Cleans the house","Drives a car"], "correct": "Stores and works with data", "explanation_ar": "الحاسوب يخزّن البيانات ويعالجها." }
          // 4–6 MCQs. `correct` = exact option text. Vary the correct position. Base them on the reading/vocab.
        ],
        "task": {
          "type": "writing",   // "writing" or "speaking"
          "prompt_en": "Write 3–4 sentences about the computer you use.",
          "prompt_ar": "اكتبي ٣–٤ جُمل عن الحاسوب الذي تستخدمينه.",
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
- **Stage 1** `foundations` — تأسيس التقنية — A1 — accent `#38bdf8` — icon `Cpu`
  - `what-is-a-computer` — ما هو الحاسوب؟ (A1)
  - `what-is-a-program` — ما هو البرنامج؟ (A1)
  - `the-internet-basics` — أساسيات الإنترنت (A1)
- **Stage 2** `using-computers` — استخدام الحاسب — A2 — `#22d3ee` — `MonitorSmartphone`
  - `files-and-folders` — الملفات والمجلّدات (A1)
  - `operating-system` — نظام التشغيل وسطح المكتب (A2)
  - `everyday-tasks` — مهام يومية على الحاسب (A2)
- **Stage 3** `the-web` — الويب والإنترنت — A2 — `#34d399` — `Globe`
  - `browsers-and-websites` — المتصفّحات والمواقع (A2)
  - `accounts-and-safety` — الحسابات والأمان على الإنترنت (A2)
  - `search-and-find` — البحث وإيجاد المعلومات (A2)
- **Stage 4** `programming-basics` — أساسيات البرمجة — B1 — `#a78bfa` — `Code2`
  - `variables-and-values` — المتغيّرات والقيم (A2)
  - `loops-and-functions` — الحلقات والدوال (B1)
  - `bugs-and-debugging` — الأخطاء وتصحيحها (B1)
- **Stage 5** `data-and-databases` — البيانات وقواعد البيانات — B1 — `#f5b942` — `Database`
  - `what-is-data` — ما هي البيانات؟ (A2)
  - `tables-and-records` — الجداول والسجلات (B1)
  - `queries` — الاستعلامات: سؤال البيانات (B1)
- **Stage 6** `networks-and-security` — الشبكات والأمن — B1 — `#fb7185` — `ShieldCheck`
  - `networks-and-servers` — الشبكات والخوادم (B1)
  - `the-cloud` — الحوسبة السحابية (B1)
  - `cybersecurity` — أساسيات الأمن السيبراني (B1)
- **Stage 7** `ai-and-modern-tech` — الذكاء الاصطناعي والتقنيات الحديثة — B1 — `#f472b6` — `Bot`
  - `what-is-ai` — ما هو الذكاء الاصطناعي؟ (B1)
  - `machine-learning` — تعلّم الآلة والنماذج (B1)
  - `ai-everyday` — الذكاء الاصطناعي في حياتنا (B1)
- **Stage 8** `software-teams` — فرق البرمجة وممارساتها — B1 — `#60a5fa` — `GitBranch`
  - `working-in-a-team` — العمل ضمن فريق برمجي (B1)
  - `git-version-control` — Git وإدارة الإصدارات (B1)
  - `agile-and-code-review` — أجايل ومراجعة الكود (B1)
- **Stage 9** `professional-it-english` — إنجليزية العمل التقني — B2 — `#fbbf24` — `Briefcase`
  - `your-cv` — سيرتكِ الذاتية CV (B1)
  - `the-interview` — مقابلة العمل التقنية (B2)
  - `emails-and-docs` — الرسائل والتوثيق التقني (B2)
- **Stage 10** `reading-the-real-world` — قراءة العالم التقني — B2 — `#4ade80` — `Newspaper`
  - `tech-news` — قراءة الأخبار والمقالات التقنية (B1)
  - `documentation` — فهم التوثيق Documentation (B2)
  - `talking-about-tech` — الحديث عن التقنية (B2)

Output valid JSON only in the file. Double-check every `correct` value appears verbatim in that question's `options`.
