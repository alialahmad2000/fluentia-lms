# PROMPT 2A: Build the AI Content Generation Engine
# Target: Claude Code CLI
# Run: claude --dangerously-skip-permissions
# Instruction: Read and execute prompts/PROMPT-2A-CONTENT-ENGINE.md

---

## CONTEXT

You are working on Fluentia LMS — an Arabic-first English language academy LMS.
- **Repo:** Already cloned, you're inside the project folder
- **Tech:** React 18 + Vite + Tailwind + Supabase (Frankfurt)
- **Supabase ref:** nmjexpuycmqcxuxljier
- **Curriculum Phase 1 is COMPLETE:** 30 tables exist in Supabase, 72 unit shells with themes seeded

## YOUR TASK

Build a **content generation engine** — a set of Node.js scripts that:
1. Use the Claude API to generate ORIGINAL English learning content
2. Validate the generated content against quality rules
3. Insert validated content into the existing Supabase curriculum tables
4. Track progress so it can resume if interrupted
5. Track API costs

This engine will be run locally by the developer to populate all 72 units across 6 levels.

---

## STEP 1: Check Existing State

Before building anything:

```bash
# 1. Check the curriculum tables exist
npx supabase db dump --schema public | grep "curriculum_"

# 2. Check existing seed data
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: levels } = await supabase.from('curriculum_levels').select('*').order('level_number');
  const { data: units } = await supabase.from('curriculum_units').select('id, level_id, unit_number, title_en, title_ar').order('unit_number');
  console.log('Levels:', levels?.length);
  console.log('Units:', units?.length);
  console.log('Sample unit:', units?.[0]);
}
check();
"

# 3. Check table columns for each curriculum table
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_readings"
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_vocabulary"
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_grammar"
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_writing"
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_listening"
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_speaking"
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_irregular_verbs"
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_comprehension"
npx supabase db dump --schema public | grep -A 30 "CREATE TABLE.*curriculum_assessments"
```

⚠️ **CRITICAL:** Read the ACTUAL table schemas from the database. Do NOT assume column names. The tables were created in Phase 1 — use whatever columns actually exist. If a table is missing or has different columns than expected, adapt your code to match reality.

---

## STEP 2: Create the Engine Directory Structure

```
scripts/
  curriculum-generator/
    index.js              ← Main orchestrator (run this)
    config.js             ← Level configs, difficulty rules, API settings
    claude-client.js      ← Claude API wrapper with retry + cost tracking
    db-client.js          ← Supabase client with upsert helpers
    progress-tracker.js   ← Tracks what's been generated (JSON file)
    validators.js         ← Content quality validation
    generators/
      reading.js          ← Reading passage generator
      comprehension.js    ← Comprehension questions generator
      vocabulary.js       ← Vocabulary + exercises generator
      grammar.js          ← Grammar explanation + exercises generator
      writing.js          ← Writing task generator
      listening.js        ← Listening script generator
      speaking.js         ← Speaking topic generator
      irregular-verbs.js  ← Irregular verbs generator
      assessment.js       ← Unit assessment generator
    templates/
      reading-prompt.js       ← Claude prompt template for readings
      vocabulary-prompt.js    ← Claude prompt template for vocabulary
      grammar-prompt.js       ← Claude prompt template for grammar
      writing-prompt.js       ← Claude prompt template for writing
      listening-prompt.js     ← Claude prompt template for listening
      speaking-prompt.js      ← Claude prompt template for speaking
      irregular-verbs-prompt.js
      assessment-prompt.js
    output/
      progress.json       ← Generation progress tracker
      costs.json          ← API cost tracker
```

---

## STEP 3: Configuration (config.js)

```javascript
module.exports = {
  // API
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  
  // Supabase
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Cost tracking (approximate per 1M tokens)
  COST_PER_1M_INPUT: 3.0,   // USD for Sonnet
  COST_PER_1M_OUTPUT: 15.0,  // USD for Sonnet
  
  // Content generation settings per level
  levels: {
    0: {
      name_en: 'Foundation', name_ar: 'تأسيس', cefr: 'Pre-A1',
      reading_words: { min: 200, max: 300 },
      vocabulary_per_reading: 8,
      mcq_choices: 3,
      comprehension_questions: 5,
      grammar_exercises: 6,
      vocabulary_exercises: 6,
      writing_word_limit: { min: 50, max: 80 },
      listening_duration_sec: { min: 60, max: 90 },
      speaking_prep_time_sec: 60,
      speaking_response_sec: 60,
      assessment_questions: 15,
      sentence_complexity: 'simple sentences, present tense mostly, familiar topics',
      vocabulary_type: 'high-frequency concrete nouns, basic adjectives, common verbs',
      grammar_focus: 'be verb, simple present, articles, this/that, plurals, pronouns',
      topics: 'family, home, food, animals, colors, body, classroom, daily routine, weather, clothes, jobs, hobbies'
    },
    1: {
      name_en: 'Basics', name_ar: 'أساسيات', cefr: 'A1',
      reading_words: { min: 300, max: 400 },
      vocabulary_per_reading: 10,
      mcq_choices: 3,
      comprehension_questions: 6,
      grammar_exercises: 8,
      vocabulary_exercises: 8,
      writing_word_limit: { min: 80, max: 120 },
      listening_duration_sec: { min: 90, max: 120 },
      speaking_prep_time_sec: 60,
      speaking_response_sec: 90,
      assessment_questions: 20,
      sentence_complexity: 'simple and some compound sentences, present and past tense, familiar and some new topics',
      vocabulary_type: 'everyday vocabulary, action verbs, descriptive adjectives, basic adverbs',
      grammar_focus: 'simple past, present continuous, can/cant, there is/are, prepositions, countable/uncountable',
      topics: 'travel, health, shopping, technology, nature, traditions, sports, education, friendship, community, cities, celebrations'
    },
    2: {
      name_en: 'Development', name_ar: 'تطوير', cefr: 'A2',
      reading_words: { min: 400, max: 500 },
      vocabulary_per_reading: 12,
      mcq_choices: 4,
      comprehension_questions: 7,
      grammar_exercises: 10,
      vocabulary_exercises: 10,
      writing_word_limit: { min: 120, max: 180 },
      listening_duration_sec: { min: 120, max: 180 },
      speaking_prep_time_sec: 45,
      speaking_response_sec: 120,
      assessment_questions: 25,
      sentence_complexity: 'compound sentences, past continuous, future plans, comparing things',
      vocabulary_type: 'topic-specific vocabulary, phrasal verbs (basic), collocations, word families',
      grammar_focus: 'past continuous, going to/will, comparatives/superlatives, modals (should/must), present perfect intro',
      topics: 'environment, media, culture, science discoveries, social issues, work life, innovation, art, migration, food science, architecture, oceans'
    },
    3: {
      name_en: 'Fluency', name_ar: 'طلاقة', cefr: 'B1',
      reading_words: { min: 500, max: 600 },
      vocabulary_per_reading: 14,
      mcq_choices: 4,
      comprehension_questions: 8,
      grammar_exercises: 10,
      vocabulary_exercises: 12,
      writing_word_limit: { min: 180, max: 250 },
      listening_duration_sec: { min: 180, max: 240 },
      speaking_prep_time_sec: 30,
      speaking_response_sec: 150,
      assessment_questions: 30,
      sentence_complexity: 'complex sentences, relative clauses, conditionals, passive voice, reported speech',
      vocabulary_type: 'academic vocabulary, idioms, phrasal verbs (intermediate), formal vs informal register',
      grammar_focus: 'present perfect vs past, conditionals (1st/2nd), passive voice, relative clauses, reported speech',
      topics: 'global challenges, psychology, economics, space exploration, language & identity, sustainability, AI & ethics, history lessons, human rights, medical advances, urbanization, creativity'
    },
    4: {
      name_en: 'Mastery', name_ar: 'تمكّن', cefr: 'B2',
      reading_words: { min: 700, max: 1000 },
      vocabulary_per_reading: 16,
      mcq_choices: 4,
      comprehension_questions: 10,
      grammar_exercises: 12,
      vocabulary_exercises: 14,
      writing_word_limit: { min: 250, max: 350 },
      listening_duration_sec: { min: 240, max: 300 },
      speaking_prep_time_sec: 30,
      speaking_response_sec: 180,
      assessment_questions: 35,
      sentence_complexity: 'sophisticated structures, nominalization, cleft sentences, inversion for emphasis',
      vocabulary_type: 'advanced academic, discipline-specific, nuanced synonyms, collocations with abstract nouns',
      grammar_focus: '3rd conditional, mixed conditionals, advanced passive, cleft sentences, inversion, wish/if only',
      topics: 'philosophy of science, geopolitics, behavioral economics, neuroscience, climate engineering, digital ethics, genetic research, cultural evolution, artificial intelligence, quantum physics, forensic science, deep-sea exploration'
    },
    5: {
      name_en: 'Proficiency', name_ar: 'احتراف', cefr: 'C1',
      reading_words: { min: 1000, max: 1200 },
      vocabulary_per_reading: 18,
      mcq_choices: 4,
      comprehension_questions: 12,
      grammar_exercises: 12,
      vocabulary_exercises: 14,
      writing_word_limit: { min: 350, max: 500 },
      listening_duration_sec: { min: 300, max: 360 },
      speaking_prep_time_sec: 15,
      speaking_response_sec: 240,
      assessment_questions: 40,
      sentence_complexity: 'near-native complexity, rhetorical devices, hedging, academic register, persuasive structures',
      vocabulary_type: 'low-frequency academic, discipline jargon, literary vocabulary, rhetorical devices',
      grammar_focus: 'subjunctive, advanced inversion, ellipsis, fronting, nominalization, discourse markers',
      topics: 'philosophy of mind, post-colonialism, information warfare, bioethics, mathematical modeling, existentialism, linguistic relativity, cryptography, cognitive biases, dark matter, synthetic biology, narrative psychology'
    }
  },

  // Grammar mapping (Grammar in Use units distributed across levels)
  grammarMapping: {
    0: ['am/is/are', 'simple present positive', 'simple present negative/questions', 'this/that/these/those', 'plurals', 'a/an/the basics', 'there is/there are', 'possessive s', 'pronouns (I/me/my)', 'imperatives', 'adjective order basics', 'prepositions of place'],
    1: ['simple past (regular)', 'simple past (irregular)', 'past negative/questions', 'present continuous', 'can/cant', 'countable/uncountable', 'some/any', 'how much/how many', 'prepositions of time', 'adverbs of frequency', 'going to (future)', 'want/would like'],
    2: ['will vs going to', 'present perfect (ever/never)', 'present perfect (just/already/yet)', 'comparatives', 'superlatives', 'should/shouldnt', 'must/have to', 'may/might', 'too/enough', 'gerund vs infinitive basics', 'first conditional', 'past continuous'],
    3: ['present perfect vs past simple', 'present perfect continuous', 'second conditional', 'passive voice (present)', 'passive voice (past)', 'relative clauses (who/which/that)', 'reported speech basics', 'used to', 'get used to/be used to', 'both/either/neither', 'so/such', 'unless/as long as'],
    4: ['third conditional', 'mixed conditionals', 'wish + past/past perfect', 'advanced passive (by/with)', 'have something done', 'relative clauses (advanced)', 'participle clauses', 'inversion after negative adverbs', 'cleft sentences', 'future perfect', 'future continuous', 'advanced modal perfects'],
    5: ['subjunctive', 'fronting', 'ellipsis in speech', 'nominalization', 'advanced discourse markers', 'hedging and vague language', 'formal vs informal register', 'advanced reported speech', 'complex noun phrases', 'advanced linking devices', 'rhetorical questions', 'emphatic structures']
  },

  // Irregular verbs per level (cumulative — each level adds new ones)
  irregularVerbsPerLevel: {
    0: ['be', 'have', 'do', 'go', 'come', 'see', 'get', 'make', 'say', 'know'],
    1: ['take', 'give', 'find', 'think', 'tell', 'become', 'leave', 'feel', 'put', 'bring', 'begin', 'keep', 'hold', 'write', 'stand'],
    2: ['run', 'read', 'grow', 'draw', 'show', 'hear', 'pay', 'meet', 'sit', 'speak', 'lie', 'lead', 'understand', 'lose', 'catch'],
    3: ['build', 'send', 'fall', 'choose', 'deal', 'rise', 'wear', 'hang', 'throw', 'break', 'drive', 'buy', 'spend', 'cut', 'win'],
    4: ['seek', 'strike', 'withdraw', 'overcome', 'undertake', 'forbid', 'forgive', 'arise', 'bind', 'breed', 'creep', 'flee', 'grind', 'leap', 'weave'],
    5: ['strive', 'thrust', 'wring', 'cling', 'forsake', 'smite', 'slay', 'tread', 'behold', 'beseech', 'cleave', 'rend', 'sow', 'abide', 'partake']
  }
};
```

---

## STEP 4: Claude API Client (claude-client.js)

Build a robust Claude API client that:
- Takes a prompt and max_tokens
- Retries on failure (3 attempts with exponential backoff)
- Tracks input/output tokens and calculates cost
- Returns parsed JSON (prompts will request JSON output)
- Logs every call to `output/costs.json`
- Handles rate limiting (429) with longer backoff

```javascript
// Key behavior:
// 1. Every prompt asks Claude to return ONLY valid JSON
// 2. Parse response, strip markdown fences if present
// 3. On parse failure, retry with "Your previous response was not valid JSON..."
// 4. Log: { timestamp, prompt_type, unit_id, input_tokens, output_tokens, cost_usd }
```

---

## STEP 5: Progress Tracker (progress-tracker.js)

Maintains `output/progress.json`:
```json
{
  "last_updated": "2026-03-17T...",
  "total_units": 72,
  "completed_units": 0,
  "units": {
    "level_0_unit_1": {
      "reading_a": "done",
      "reading_b": "done",
      "vocabulary": "done",
      "grammar": "done",
      "writing": "pending",
      "listening": "pending",
      "speaking": "pending",
      "irregular_verbs": "done",
      "assessment": "pending"
    }
  },
  "total_cost_usd": 0
}
```

The orchestrator reads this on startup and skips already-completed content types.

---

## STEP 6: Prompt Templates

### 6.1 Reading Passage Template (templates/reading-prompt.js)

The prompt must produce a National Geographic-STYLE reading passage. NOT copied from any book.

```
You are an expert English language content creator for a Saudi Arabian English academy.

Generate an ORIGINAL reading passage for:
- Level: {level_number} ({cefr})
- Unit: {unit_number} of 12
- Unit Theme: {unit_theme_en} / {unit_theme_ar}
- Reading: {A or B} (each unit has 2 readings)
- Word count: {min}-{max} words

STYLE REQUIREMENTS:
- Written like a National Geographic article — informative, engaging, real-world topics
- Appropriate for young Saudi adults (18-34, mostly women)
- Culturally sensitive — respectful of Saudi/Islamic culture
- NO controversial political, religious, or sexual content
- Include factual information (real places, real science, real statistics where possible)
- {sentence_complexity}

STRUCTURE:
- Title (engaging, 3-7 words)
- Optional subtitle (1 line)
- 3-5 paragraphs depending on length
- Each paragraph has a clear topic sentence
- Include 1-2 interesting facts or statistics

VOCABULARY INTEGRATION:
- Naturally embed {vocabulary_count} target vocabulary words (mark them with *asterisks*)
- Vocabulary should be: {vocabulary_type}
- Words should be inferable from context (context clues strategy)

Reading A focus: introduces the unit theme broadly
Reading B focus: explores a specific aspect or angle of the same theme

Return ONLY valid JSON:
{
  "title": "string",
  "subtitle": "string or null",
  "content": "Full passage text with *target words* marked",
  "word_count": number,
  "target_vocabulary": ["word1", "word2", ...],
  "reading_skill_focus": "main idea / detail / inference / vocabulary in context / etc.",
  "critical_thinking_question": "One higher-order question about the passage"
}
```

### 6.2 Comprehension Questions Template

```
Based on this reading passage:
---
{passage_text}
---

Generate {question_count} comprehension questions for Level {level} ({cefr}):

Question types (mix them):
- Main idea (1-2 questions)
- Detail/specific information (2-3 questions)
- Vocabulary in context (1-2 questions)  
- Inference (1-2 questions)
- Author's purpose (0-1 questions, only for level 2+)

Each question has {mcq_choices} choices with exactly ONE correct answer.

For vocabulary-in-context questions: ask about the *marked* words from the passage.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question_text": "string",
      "question_type": "main_idea|detail|vocabulary|inference|purpose",
      "choices": ["A", "B", "C", "D (if 4 choices)"],
      "correct_answer_index": 0-3,
      "explanation_en": "Why this is correct (1 sentence)",
      "explanation_ar": "Arabic explanation for student"
    }
  ]
}
```

### 6.3 Vocabulary Template

```
Extract and enrich the {count} target vocabulary words from this passage:
---
{passage_text}
Target words: {target_vocabulary_list}
---

For each word, provide:

Return ONLY valid JSON:
{
  "words": [
    {
      "word": "string",
      "part_of_speech": "noun|verb|adjective|adverb|preposition|conjunction",
      "definition_en": "Clear, simple definition appropriate for {cefr} level",
      "definition_ar": "Arabic translation/meaning",
      "example_in_passage": "The exact sentence from the passage containing this word",
      "example_new": "A NEW example sentence at {cefr} level",
      "word_family": ["related forms: noun, verb, adjective, adverb if they exist"],
      "collocations": ["2-3 common word combinations"],
      "pronunciation_note": "Any tricky pronunciation for Arabic speakers (optional)",
      "common_mistake_ar": "Common error Arabic speakers make with this word (optional)"
    }
  ]
}
```

### 6.4 Vocabulary Exercises Template

```
Create {count} vocabulary exercises for these words at Level {level} ({cefr}):
Words: {word_list}

Exercise types (mix them):
- Fill in the blank (sentence with word missing)
- Match word to definition
- Choose the correct word for context
- Word form (change the word form to fit the sentence)
- Odd one out (which word doesn't belong)

Return ONLY valid JSON:
{
  "exercises": [
    {
      "type": "fill_blank|match|choose|word_form|odd_one_out",
      "instruction_en": "short instruction",
      "instruction_ar": "Arabic instruction",
      "question": "The exercise question/prompt",
      "options": ["if applicable"],
      "correct_answer": "string",
      "explanation_ar": "Arabic explanation"
    }
  ]
}
```

### 6.5 Grammar Template

```
Create a grammar lesson for Level {level} ({cefr}):
Grammar topic: {grammar_topic}
Unit theme: {unit_theme} (use theme-related examples)

Create:
1. A clear explanation in ENGLISH with ARABIC support notes
2. {exercise_count} practice exercises

The explanation should:
- Start with 2-3 clear example sentences
- Explain the rule simply (appropriate for {cefr})
- Show the pattern/formula
- Include a "common mistakes" section (especially for Arabic speakers)
- Use the unit theme in examples where natural

Return ONLY valid JSON:
{
  "topic": "string",
  "explanation_en": "Full grammar explanation in English (HTML allowed: <b>, <i>, <br>)",
  "explanation_ar": "Key points in Arabic (complementary, not full translation)",
  "formula": "Pattern/formula (e.g., Subject + was/were + verb-ing)",
  "examples": [
    { "sentence": "string", "translation_ar": "string", "highlight": "the grammar part to highlight" }
  ],
  "common_mistakes": [
    { "wrong": "string", "correct": "string", "explanation_ar": "why in Arabic" }
  ],
  "exercises": [
    {
      "type": "fill_blank|choose|reorder|transform|error_correction",
      "question": "string",
      "options": ["if applicable"],
      "correct_answer": "string",
      "explanation_ar": "Arabic explanation"
    }
  ]
}
```

### 6.6 Writing Task Template

```
Create a writing task for Level {level} ({cefr}):
Unit theme: {unit_theme}
Word limit: {min}-{max} words

The task should:
- Be achievable at {cefr} level
- Connect to the unit theme
- Have clear instructions
- Include a model structure (outline)
- Define grading criteria

Level 0-1: Simple paragraph, personal response
Level 2: Short essay or structured paragraph
Level 3: Opinion essay or comparison
Level 4: Argumentative essay or analysis
Level 5: Critical essay or research-based writing

Return ONLY valid JSON:
{
  "task_type": "paragraph|email|essay|opinion|comparison|argument|analysis",
  "prompt_en": "The writing task instructions in English",
  "prompt_ar": "Task instructions in Arabic",
  "word_limit": { "min": number, "max": number },
  "structure_guide": ["Step 1: ...", "Step 2: ..."],
  "useful_phrases": ["phrase 1", "phrase 2", ...],
  "grading_criteria": [
    { "criterion": "string", "weight_percent": number, "description": "string" }
  ],
  "model_outline": "A brief outline of what a good response looks like"
}
```

### 6.7 Listening Script Template

```
Create a listening exercise script for Level {level} ({cefr}):
Unit theme: {unit_theme}
Duration: approximately {duration_sec} seconds when read aloud (~150 words per minute)

The script should:
- Be natural spoken English (not written-style)
- Format: {monologue for level 0-1, dialogue for level 2-3, lecture/interview for level 4-5}
- Include speaker labels if dialogue
- Be culturally appropriate for Saudi students

Return ONLY valid JSON:
{
  "script_type": "monologue|dialogue|lecture|interview|news_report",
  "speakers": ["Speaker name/label"],
  "script": "Full script with speaker labels",
  "word_count": number,
  "estimated_duration_sec": number,
  "comprehension_questions": [
    {
      "question": "string",
      "type": "detail|main_idea|inference",
      "options": ["A", "B", "C"],
      "correct_answer_index": number,
      "explanation_ar": "string"
    }
  ],
  "key_vocabulary": ["words students should notice"]
}
```

### 6.8 Speaking Topic Template

```
Create a speaking topic for Level {level} ({cefr}):
Unit theme: {unit_theme}
Preparation time: {prep_time} seconds
Response time: {response_time} seconds

Return ONLY valid JSON:
{
  "topic_en": "The speaking topic/question in English",
  "topic_ar": "Arabic translation of the topic",
  "category": "personal|descriptive|opinion|compare|academic|debate",
  "preparation_tips_ar": ["Arabic tips for preparing"],
  "guiding_questions": ["Sub-question 1", "Sub-question 2", "Sub-question 3"],
  "useful_vocabulary": ["relevant words/phrases"],
  "model_response_outline": "Brief outline of a good response",
  "evaluation_focus": ["fluency", "vocabulary", "grammar", "pronunciation", "coherence"]
}
```

### 6.9 Irregular Verbs Template

```
Create irregular verb exercises for Level {level} ({cefr}):
Verbs for this level: {verb_list}

Return ONLY valid JSON:
{
  "verbs": [
    {
      "base": "string",
      "past": "string",
      "past_participle": "string",
      "meaning_ar": "Arabic meaning",
      "example_present": "Example sentence in present",
      "example_past": "Example sentence in past",
      "example_perfect": "Example sentence with past participle"
    }
  ],
  "exercises": [
    {
      "type": "fill_form|choose_correct|sentence_complete|error_find",
      "question": "string",
      "correct_answer": "string",
      "options": ["if applicable"],
      "explanation_ar": "string"
    }
  ]
}
```

### 6.10 Assessment Template

```
Create a unit assessment quiz for Level {level} ({cefr}):
Unit theme: {unit_theme}
Number of questions: {count}

The assessment should cover ALL skills from this unit:
- Reading comprehension (30%)
- Grammar (25%)
- Vocabulary (25%)
- Listening comprehension (10%)
- Writing (10% — short answer)

Return ONLY valid JSON:
{
  "title_en": "Unit {number} Assessment",
  "title_ar": "اختبار الوحدة {number}",
  "time_limit_minutes": number,
  "passing_score_percent": 60,
  "questions": [
    {
      "question_number": number,
      "skill": "reading|grammar|vocabulary|listening|writing",
      "type": "mcq|true_false|fill_blank|short_answer|reorder",
      "question_text": "string",
      "options": ["if applicable"],
      "correct_answer": "string",
      "points": number,
      "explanation_ar": "string"
    }
  ],
  "total_points": number
}
```

---

## STEP 7: Content Generators

Each generator in `generators/` follows this pattern:

```javascript
// generators/reading.js
async function generateReading(unit, readingSlot, config, claudeClient, dbClient) {
  const levelConfig = config.levels[unit.level_number];
  
  // 1. Build prompt from template
  const prompt = buildReadingPrompt(unit, readingSlot, levelConfig);
  
  // 2. Call Claude API
  const result = await claudeClient.generate(prompt, {
    max_tokens: 4096,
    type: `reading_${readingSlot}`,
    unit_id: unit.id
  });
  
  // 3. Validate
  validateReading(result, levelConfig);
  
  // 4. Insert into Supabase
  await dbClient.upsertReading(unit.id, readingSlot, result);
  
  // 5. Return result for dependent generators (comprehension, vocabulary need the passage)
  return result;
}
```

**IMPORTANT:** Some generators depend on others:
1. **Reading** must run first (produces passage text)
2. **Comprehension** needs the passage → depends on Reading
3. **Vocabulary** needs the passage → depends on Reading  
4. **Vocabulary Exercises** needs vocabulary list → depends on Vocabulary
5. **Grammar** is independent (uses unit theme)
6. **Writing** is independent (uses unit theme)
7. **Listening** is independent (uses unit theme)
8. **Speaking** is independent (uses unit theme)
9. **Irregular Verbs** is independent (uses level verb list)
10. **Assessment** should run LAST (covers all unit content)

---

## STEP 8: Validators (validators.js)

Every piece of content must pass validation before database insertion:

```javascript
function validateReading(result, levelConfig) {
  const errors = [];
  
  // Word count check (±20% tolerance)
  if (result.word_count < levelConfig.reading_words.min * 0.8)
    errors.push(`Too short: ${result.word_count} words`);
  if (result.word_count > levelConfig.reading_words.max * 1.2)
    errors.push(`Too long: ${result.word_count} words`);
  
  // Vocabulary count
  if (result.target_vocabulary.length < levelConfig.vocabulary_per_reading * 0.8)
    errors.push(`Not enough vocabulary: ${result.target_vocabulary.length}`);
  
  // Required fields
  if (!result.title) errors.push('Missing title');
  if (!result.content) errors.push('Missing content');
  
  // Content quality
  if (result.content.includes('©') || result.content.includes('National Geographic'))
    errors.push('Contains potential copyright reference');
  
  if (errors.length > 0) throw new ValidationError(errors);
}
```

Add validators for EVERY content type. Check:
- Required fields present
- Correct number of items (questions, exercises, etc.)
- Word counts within range
- No copyright references
- MCQ choices match level config
- Correct answer index is valid
- Arabic text actually contains Arabic characters
- No obvious AI artifacts ("As an AI...", "Here is...", "I'd be happy to...")

---

## STEP 9: Database Client (db-client.js)

Uses Supabase service role key. Provides upsert methods for each content type.

⚠️ **CRITICAL:** Check the ACTUAL column names from Step 1. The methods below are examples — adapt to match your real table schemas.

```javascript
async upsertReading(unitId, slot, data) {
  // slot = 'a' or 'b'
  const { error } = await supabase
    .from('curriculum_readings')
    .upsert({
      unit_id: unitId,
      slot: slot,        // or reading_order, or whatever the column is
      title: data.title,
      subtitle: data.subtitle,
      content: data.content,
      word_count: data.word_count,
      reading_skill_focus: data.reading_skill_focus,
      critical_thinking_question: data.critical_thinking_question,
      status: 'draft'    // Always insert as draft — trainer reviews before publishing
    }, {
      onConflict: 'unit_id,slot'  // Upsert based on unique combination
    });
  
  if (error) throw new DatabaseError(`Reading insert failed: ${error.message}`);
}
```

---

## STEP 10: Main Orchestrator (index.js)

```javascript
async function main() {
  const args = parseArgs(process.argv);
  // Supports: --level 1 --unit 1    (specific unit)
  //           --level 1              (entire level)
  //           --all                  (everything)
  //           --content reading      (only reading for specified unit/level)
  //           --dry-run              (generate but don't insert)
  
  console.log('🚀 Fluentia Content Generator');
  console.log('============================\n');
  
  // Load progress
  const progress = loadProgress();
  
  // Get units to process
  const units = await getUnits(args);
  
  for (const unit of units) {
    console.log(`\n📖 Processing: Level ${unit.level_number} — Unit ${unit.unit_number}: ${unit.title_en}`);
    
    const unitKey = `level_${unit.level_number}_unit_${unit.unit_number}`;
    
    // Reading A
    if (!isCompleted(progress, unitKey, 'reading_a')) {
      console.log('  📄 Generating Reading A...');
      const readingA = await generateReading(unit, 'a', config, claude, db);
      
      console.log('  ❓ Generating Comprehension Questions (Reading A)...');
      await generateComprehension(unit, 'a', readingA, config, claude, db);
      
      console.log('  📝 Generating Vocabulary (Reading A)...');
      const vocabA = await generateVocabulary(unit, 'a', readingA, config, claude, db);
      
      console.log('  🎯 Generating Vocabulary Exercises (Reading A)...');
      await generateVocabExercises(unit, 'a', vocabA, config, claude, db);
      
      markCompleted(progress, unitKey, 'reading_a');
    }
    
    // Reading B
    if (!isCompleted(progress, unitKey, 'reading_b')) {
      console.log('  📄 Generating Reading B...');
      const readingB = await generateReading(unit, 'b', config, claude, db);
      
      // ... same as Reading A
      markCompleted(progress, unitKey, 'reading_b');
    }
    
    // Independent generators
    if (!isCompleted(progress, unitKey, 'grammar')) {
      console.log('  📐 Generating Grammar...');
      await generateGrammar(unit, config, claude, db);
      markCompleted(progress, unitKey, 'grammar');
    }
    
    // ... Writing, Listening, Speaking, Irregular Verbs ...
    
    // Assessment (LAST)
    if (!isCompleted(progress, unitKey, 'assessment')) {
      console.log('  📋 Generating Assessment...');
      await generateAssessment(unit, config, claude, db);
      markCompleted(progress, unitKey, 'assessment');
    }
    
    console.log(`  ✅ Unit ${unit.unit_number} complete!`);
  }
  
  // Print summary
  printCostSummary();
}
```

---

## STEP 11: Package & Run Configuration

Add to `package.json`:
```json
{
  "scripts": {
    "generate:content": "node scripts/curriculum-generator/index.js",
    "generate:unit": "node scripts/curriculum-generator/index.js --level $LEVEL --unit $UNIT",
    "generate:level": "node scripts/curriculum-generator/index.js --level $LEVEL",
    "generate:dry-run": "node scripts/curriculum-generator/index.js --dry-run"
  }
}
```

Make sure the script:
- Loads `.env` properly (use `dotenv` package — install it if needed)
- Uses `require` (CommonJS) OR `import` (ESM) — match the project's module system
- Has helpful console output with emojis for readability
- Shows a progress bar or percentage for long runs
- Catches all errors gracefully and continues to the next item

---

## WHAT NOT TO DO

1. ❌ Do NOT modify any existing pages or components
2. ❌ Do NOT touch any UI files
3. ❌ Do NOT modify existing database tables or add migrations
4. ❌ Do NOT run the generator automatically — just build the engine
5. ❌ Do NOT hardcode any API keys — always use environment variables
6. ❌ Do NOT generate copyrighted content — all content must be ORIGINAL
7. ❌ Do NOT use GPT-4 or any OpenAI model — use Claude Sonnet only

## WHAT TO VERIFY

After building the engine:
1. Run `node scripts/curriculum-generator/index.js --dry-run --level 1 --unit 1` to test ONE unit
2. Check that the dry run produces valid JSON for all content types
3. Check that validation catches bad content
4. Check that progress tracking works (run twice — second run should skip completed items)
5. Show a cost estimate for generating all 72 units

---

## GIT COMMIT

After everything is built and verified:

```bash
git add -A
git commit -m "feat: build AI content generation engine for curriculum (Phase 2A)

- Content generation scripts using Claude API (Sonnet)
- Templates for all 8 content types (reading, vocabulary, grammar, writing, listening, speaking, irregular verbs, assessment)
- Difficulty scaling rules for 6 levels (Pre-A1 to C1)
- Content validation with quality checks
- Progress tracking with resume capability
- API cost tracking
- Supports: single unit, entire level, or all content generation
- Dry-run mode for testing without database insertion"

git push origin main
```

---

## SUMMARY OF DELIVERABLES

After executing this prompt, we should have:
1. ✅ `scripts/curriculum-generator/` directory with all files
2. ✅ Config with difficulty rules for all 6 levels
3. ✅ Claude API client with retry + cost tracking
4. ✅ Prompt templates for all 8+ content types
5. ✅ Content generators with dependency ordering
6. ✅ Validators for quality assurance
7. ✅ Database insertion client (adapted to actual table schemas)
8. ✅ Progress tracker for resume capability
9. ✅ Main orchestrator with CLI arguments
10. ✅ Dry-run test of Level 1, Unit 1

**STOP after building and verifying. Do NOT generate content for all units yet — we will do that in Prompt 2B.**
