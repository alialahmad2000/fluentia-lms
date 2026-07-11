# مصعب Custom Curriculum — Content Authoring Spec (STRICT)

You are authoring one UNIT (or one SUPPLEMENT) of English learning content for **مصعب**, a 20-year-old
Saudi male **Business Administration** university student, **weak English (A2)**. Output **ONE JSON file**.

## NON-NEGOTIABLE RULES
1. **We teach ENGLISH. His major is the CONTEXT/vehicle, never the subject.** Readings are simple A2 English
   texts SET in a business scenario (a shop, a warehouse, an office, a meeting). We never teach business theory.
2. **Level = A2.** Short sentences (8–14 words). High-frequency, concrete, everyday words. NO academic/technical
   jargon. When unsure, choose the simpler word.
3. **Arabic = MASCULINE 2nd person** (he is male): تتحدث/اكتب/تذكّر/تستطيع — never feminine (تتحدثي/اكتبي).
4. **Brand:** if the academy is named in Arabic, it is «طلاقة» (never transliterate "Fluentia").
5. **Readings:** mark ~8–12 target vocabulary words inside the passage with single asterisks: `*word*`.
   Target words must be A2 and reappear in that reading's `vocab` list.
6. **Comprehension `correct_answer`** must be the EXACT string of one of the 4 `choices`. Vary `question_type`
   across: main_idea, detail, vocabulary, inference, cause_effect, sequence.
7. **Listening `correct_answer_index`** is 0-based into `options` (4 options). Transcript ≤ **70 words**,
   single speaker, natural spoken A2 English (contractions ok), one clear scenario.
8. Output **valid JSON only** (no comments, no trailing commas, UTF-8). Every string properly escaped.

## FILE TO WRITE
Write to the EXACT path given in your task, e.g. `scripts/mosab-content/unit-06.json`.

## SCHEMA — a FULL unit (`"kind": "unit"`)
```json
{
  "kind": "unit",
  "custom_sort": 6,
  "theme_en": "Marketing Basics",
  "theme_ar": "التسويق · كيف نصل إلى الزبائن",
  "desc_ar": "إنجليزي بسيط عن التسويق: الإعلان، العلامة، والزبائن.",
  "why_ar": "لتتعلّم كلمات الإنجليزي التي تصف كيف تصل الشركات إلى زبائنها.",
  "outcomes": ["تقرأ نصاً بسيطاً عن التسويق", "تتعلّم كلمات: advert, brand, customer", "تكتب إعلاناً قصيراً"],
  "warmup": ["ما آخر إعلان أعجبك؟", "كيف تعرف الشركات الجديدة؟"],
  "grammar": {
    "en": "Present Continuous",
    "ar": "المضارع المستمر",
    "explain_ar": "نستخدم المضارع المستمر لشيء يحدث الآن. الصيغة: am/is/are + الفعل+ing.",
    "explain_en_html": "<b>Present Continuous</b><br><br>We use it for actions happening now: am/is/are + verb-<b>ing</b>.<br><i>The company <b>is launching</b> a new product.</i>",
    "formula": "Subject + am/is/are + verb-<b>ing</b>",
    "examples": [
      {"sentence": "The team is planning a new advert.", "highlight": "is planning", "translation_ar": "الفريق يخطط لإعلان جديد."},
      {"sentence": "Customers are buying the new product.", "highlight": "are buying", "translation_ar": "الزبائن يشترون المنتج الجديد."}
    ],
    "mistakes": [
      {"wrong": "The team planning now.", "correct": "The team is planning now.", "explanation_ar": "نحتاج is قبل الفعل+ing."}
    ],
    "exercises": [
      {"instruction_ar": "اختر الصيغة الصحيحة", "items": [
        {"question": "The company ___ a new advert now.", "options": ["is making", "make"], "correct_answer": "is making", "explanation_ar": "حدث الآن: is + making."},
        {"question": "Customers ___ the product today.", "options": ["are buying", "buys"], "correct_answer": "are buying", "explanation_ar": "الآن: are + buying."},
        {"question": "He ___ to a customer right now.", "options": ["is talking", "talk"], "correct_answer": "is talking", "explanation_ar": "الآن: is + talking."}
      ]}
    ]
  },
  "readings": [
    {
      "label": "A",
      "title_en": "A New Advert",
      "title_ar": "إعلان جديد",
      "skill_en": "Finding the main idea",
      "skill_ar": "إيجاد الفكرة الرئيسية",
      "paragraphs": [
        "A small company wants more *customers*. The team is making a new *advert* for the internet...",
        "Second paragraph with more *marked* target *words*..."
      ],
      "questions": [
        {"question_type": "main_idea", "question_en": "What is the passage about?", "question_ar": "عمّ يتحدث النص؟",
         "choices": ["A company makes a new advert", "A man buys a car", "A school lesson", "A trip"],
         "correct_answer": "A company makes a new advert", "explanation_ar": "النص عن شركة تصنع إعلاناً."}
      ],
      "vocab": [
        ["customer", "a person who buys something", "زبون / عميل", "The shop has many customers.", "noun", true],
        ["advert", "a message that helps sell something", "إعلان", "They made a new advert.", "noun", true]
      ]
    },
    { "label": "B", "title_en": "...", "title_ar": "...", "skill_en": "Reading for detail", "skill_ar": "القراءة لالتقاط التفاصيل",
      "paragraphs": ["... *marked* ..."], "questions": [ /* 7 items */ ], "vocab": [ /* 8-10 items */ ] }
  ],
  "listening": {
    "title_en": "Talking About an Advert",
    "title_ar": "الحديث عن إعلان",
    "transcript": "Hi, I'm Sami. I work in a small company. This week we are making a new advert for the internet. We want more customers to know our products. My job is to choose the pictures and the words. I love my work because every day is different.",
    "exercises": [
      {"question_en": "Where does Sami work?", "question_type": "detail", "options": ["A big hospital", "A small company", "A school", "A bank"], "correct_answer_index": 1, "difficulty": 1, "explanation_ar": "قال سامي إنه يعمل في شركة صغيرة."},
      {"question_en": "What is the team making?", "question_type": "main_idea", "options": ["A car", "A new advert", "A cake", "A house"], "correct_answer_index": 1, "difficulty": 2, "explanation_ar": "يصنعون إعلاناً جديداً."}
    ]
  },
  "writing": {
    "title_en": "Write a short advert",
    "prompt_en": "Write a short advert for a small shop. What does it sell? Why should customers come?",
    "prompt_ar": "اكتب إعلاناً قصيراً لمحل صغير. ماذا يبيع؟ لماذا يأتي الزبائن؟",
    "hints": ["Come to our shop!", "We sell...", "Our prices are...", "Customers love..."],
    "min": 40, "max": 90
  },
  "speaking": {
    "title_en": "Talk about an advert you like",
    "prompt_en": "Talk about an advert you like. What is it for? Why do you like it?",
    "prompt_ar": "تحدث عن إعلان يعجبك. لأي شيء هو؟ لماذا يعجبك؟",
    "prep": ["فكّر في إعلان شاهدته", "حضّر كلمات: advert, product, customer", "رتّب: ما هو، ولماذا يعجبك"],
    "phrases": ["advert", "product", "customer", "I like it because", "it is for"]
  }
}
```

## SCHEMA — a SUPPLEMENT (`"kind": "supplement"`) — adds Reading B + Listening to an EXISTING unit
```json
{
  "kind": "supplement",
  "custom_sort": 1,
  "reading": {
    "label": "B",
    "title_en": "...", "title_ar": "...", "skill_en": "Reading for detail", "skill_ar": "القراءة لالتقاط التفاصيل",
    "paragraphs": ["... A2 passage in the SAME theme as this unit, with ~8-12 *marked* target words ..."],
    "questions": [ /* exactly 7, varied types */ ],
    "vocab": [ /* 8-10 items, [word, def_en, def_ar, example, pos, appears_bool] */ ]
  },
  "listening": { "title_en":"...", "title_ar":"...", "transcript":"... ≤70 words, A2, single speaker, same theme ...", "exercises":[ /* 5-6 items */ ] }
}
```

## QUALITY BAR
- Reading A/B: **130–170 words** each, 2–3 short paragraphs, a mini narrative with a person/scenario.
- Comprehension: **exactly 7** questions per reading, varied types, plausible distractors (real A2 learner traps).
- Vocab: **8–10** per reading; `appears_bool` = true if the word appears (marked) in that reading, else false.
- Listening: **5–6** exercises, difficulty spread 1→5.
- Everything concrete, warm, and correct. This is a real student's course — no placeholders, no lorem.
