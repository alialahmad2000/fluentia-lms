/**
 * IELTS Reading Passage Generator
 * Generates passages and inserts into Supabase
 */
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const MODEL = 'claude-sonnet-4-20250514';

async function generatePassage(questionType, questionTypeName, difficulty, passageNum, topic) {
  const difficultyGuide = {
    'band_5_6': 'Band 5-6: straightforward vocabulary, clear structure, direct information',
    'band_6_7': 'Band 6-7: moderate complexity, some academic vocabulary, requires inference',
    'band_7_8': 'Band 7-8: complex academic text, nuanced arguments, sophisticated vocabulary'
  };

  const questionInstructions = {
    multiple_choice: `Generate 10-13 multiple choice questions. Each question has 4 options (A-D) with exactly one correct answer.
Format each question as: { "question_number": N, "question_text": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correct_answer": "A/B/C/D", "explanation": "..." }`,

    true_false_not_given: `Generate 10-13 True/False/Not Given questions. Students decide if statements are TRUE (agrees with text), FALSE (contradicts text), or NOT GIVEN (no information).
Format each question as: { "question_number": N, "statement": "...", "correct_answer": "TRUE/FALSE/NOT GIVEN", "explanation": "...", "relevant_paragraph": N }`,

    yes_no_not_given: `Generate 10-13 Yes/No/Not Given questions. Students decide if statements match the WRITER'S VIEWS: YES (agrees with writer), NO (contradicts writer), NOT GIVEN (impossible to determine writer's view).
The passage MUST express clear opinions and arguments.
Format each question as: { "question_number": N, "statement": "...", "correct_answer": "YES/NO/NOT GIVEN", "explanation": "...", "relevant_paragraph": N }`
  };

  const prompt = `You are an IELTS reading passage writer creating ORIGINAL academic content.

Generate an IELTS Academic Reading passage with questions.

REQUIREMENTS:
- Topic: ${topic}
- Difficulty: ${difficultyGuide[difficulty]}
- Word count: 700-900 words
- Academic register, suitable for IELTS Academic test
- ORIGINAL content — never copy from any source
- Culturally appropriate for international students including Saudi Arabian students
- The passage should have a clear title
- Organize into 5-8 paragraphs
- Question type: ${questionTypeName}

QUESTION INSTRUCTIONS:
${questionInstructions[questionType]}

Return ONLY valid JSON:
{
  "title": "passage title",
  "content": "full passage text with paragraphs separated by \\n\\n",
  "word_count": number,
  "topic_category": "${topic.split(':')[0].trim().toLowerCase()}",
  "questions": [
    ... array of question objects as described above ...
  ],
  "answer_key": [
    { "question_number": N, "correct_answer": "...", "explanation": "Brief explanation" }
  ]
}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].text;
      let clean = text.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      else if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      clean = clean.trim();

      // Try to find JSON
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('No JSON found');
      }

      // Validate
      if (!parsed.title || !parsed.content || !parsed.questions?.length) {
        throw new Error('Missing required fields');
      }

      return parsed;
    } catch (err) {
      console.log(`    ⚠️ Attempt ${attempt}/3 failed: ${err.message}`);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function insertPassage(data, passageNumber, difficulty) {
  const { data: inserted, error } = await supabase.from('ielts_reading_passages').insert({
    passage_number: passageNumber,
    title: data.title,
    content: data.content,
    word_count: data.word_count || data.content.split(/\s+/).length,
    topic_category: data.topic_category || 'general',
    difficulty_band: difficulty,
    questions: data.questions,
    answer_key: data.answer_key,
    time_limit_minutes: 20,
    is_published: false,
  }).select('id');

  if (error) throw new Error(`DB insert failed: ${error.message}`);
  return inserted[0].id;
}

// ─── PASSAGE DEFINITIONS ───────────────────────────────────────────
const BATCHES = {
  R1: {
    label: 'Types 1-3 (MC, T/F/NG, Y/N/NG)',
    passages: [
      // Multiple Choice
      { type: 'multiple_choice', typeName: 'Multiple Choice', difficulty: 'band_5_6', topic: 'Science: The Evolution of Solar Panel Technology' },
      { type: 'multiple_choice', typeName: 'Multiple Choice', difficulty: 'band_6_7', topic: 'History: The Silk Road and Its Impact on Cultural Exchange' },
      { type: 'multiple_choice', typeName: 'Multiple Choice', difficulty: 'band_7_8', topic: 'Social Studies: The Psychology of Decision-Making in Groups' },
      // True/False/Not Given
      { type: 'true_false_not_given', typeName: 'True/False/Not Given', difficulty: 'band_5_6', topic: 'Nature: The Remarkable Navigation of Migratory Birds' },
      { type: 'true_false_not_given', typeName: 'True/False/Not Given', difficulty: 'band_6_7', topic: 'Technology: The Rise of Vertical Farming in Urban Areas' },
      { type: 'true_false_not_given', typeName: 'True/False/Not Given', difficulty: 'band_7_8', topic: 'Medicine: Advances in Personalized Gene Therapy' },
      // Yes/No/Not Given
      { type: 'yes_no_not_given', typeName: 'Yes/No/Not Given', difficulty: 'band_5_6', topic: 'Education: Should Schools Teach Financial Literacy?' },
      { type: 'yes_no_not_given', typeName: 'Yes/No/Not Given', difficulty: 'band_6_7', topic: 'Environment: The Case for Rewilding Degraded Landscapes' },
      { type: 'yes_no_not_given', typeName: 'Yes/No/Not Given', difficulty: 'band_7_8', topic: 'Philosophy: The Ethics of Artificial Intelligence in Healthcare' },
    ],
  },
  R2: {
    label: 'Types 4-5 (Matching Headings, Matching Information)',
    passages: [
      { type: 'matching_headings', typeName: 'Matching Headings', difficulty: 'band_5_6', topic: 'Architecture: The Development of Sustainable Building Design' },
      { type: 'matching_headings', typeName: 'Matching Headings', difficulty: 'band_6_7', topic: 'Anthropology: Rituals and Their Role in Human Societies' },
      { type: 'matching_headings', typeName: 'Matching Headings', difficulty: 'band_7_8', topic: 'Economics: The Paradox of Choice in Consumer Markets' },
      { type: 'matching_information', typeName: 'Matching Information', difficulty: 'band_5_6', topic: 'Geography: How Deserts Are Formed and Reclaimed' },
      { type: 'matching_information', typeName: 'Matching Information', difficulty: 'band_6_7', topic: 'Linguistics: The Decline and Revival of Endangered Languages' },
      { type: 'matching_information', typeName: 'Matching Information', difficulty: 'band_7_8', topic: 'Neuroscience: The Dual-Process Theory of Human Thought' },
    ],
  },
  R3: {
    label: 'Types 6-8 (Matching Features, Matching Sentence Endings, Sentence Completion)',
    passages: [
      { type: 'matching_features', typeName: 'Matching Features', difficulty: 'band_5_6', topic: 'Biology: Comparing Photosynthesis in Different Plant Species' },
      { type: 'matching_features', typeName: 'Matching Features', difficulty: 'band_6_7', topic: 'Business: Leadership Styles Across Different Cultures' },
      { type: 'matching_features', typeName: 'Matching Features', difficulty: 'band_7_8', topic: 'Psychology: Theories of Memory Formation and Retrieval' },
      { type: 'matching_sentence_endings', typeName: 'Matching Sentence Endings', difficulty: 'band_5_6', topic: 'Health: The Benefits and Risks of Intermittent Fasting' },
      { type: 'matching_sentence_endings', typeName: 'Matching Sentence Endings', difficulty: 'band_6_7', topic: 'Ecology: Coral Reef Ecosystems Under Threat' },
      { type: 'matching_sentence_endings', typeName: 'Matching Sentence Endings', difficulty: 'band_7_8', topic: 'Physics: The Search for Dark Matter in the Universe' },
      { type: 'sentence_completion', typeName: 'Sentence Completion', difficulty: 'band_5_6', topic: 'Agriculture: The Green Revolution and Its Consequences' },
      { type: 'sentence_completion', typeName: 'Sentence Completion', difficulty: 'band_6_7', topic: 'Sociology: Urbanization and Its Effects on Community Life' },
      { type: 'sentence_completion', typeName: 'Sentence Completion', difficulty: 'band_7_8', topic: 'Climate: Feedback Loops in the Global Climate System' },
    ],
  },
  R4: {
    label: 'Types 9-11 (Summary, Table/Flowchart, Diagram Label)',
    passages: [
      { type: 'summary_completion', typeName: 'Summary Completion', difficulty: 'band_5_6', topic: 'Chemistry: The Water Purification Process' },
      { type: 'summary_completion', typeName: 'Summary Completion', difficulty: 'band_6_7', topic: 'Archaeology: Dating Techniques in Modern Archaeology' },
      { type: 'summary_completion', typeName: 'Summary Completion', difficulty: 'band_7_8', topic: 'Genetics: Epigenetics and Gene Expression' },
      { type: 'table_completion', typeName: 'Table/Flow-chart Completion', difficulty: 'band_5_6', topic: 'Manufacturing: The Production of Electric Vehicle Batteries' },
      { type: 'table_completion', typeName: 'Table/Flow-chart Completion', difficulty: 'band_6_7', topic: 'Oceanography: Deep Sea Hydrothermal Vent Ecosystems' },
      { type: 'table_completion', typeName: 'Table/Flow-chart Completion', difficulty: 'band_7_8', topic: 'Immunology: The Human Immune Response to Viral Infections' },
      { type: 'diagram_labelling', typeName: 'Diagram Label Completion', difficulty: 'band_5_6', topic: 'Engineering: How Wind Turbines Generate Electricity' },
      { type: 'diagram_labelling', typeName: 'Diagram Label Completion', difficulty: 'band_6_7', topic: 'Anatomy: The Structure and Function of the Human Eye' },
      { type: 'diagram_labelling', typeName: 'Diagram Label Completion', difficulty: 'band_7_8', topic: 'Astronomy: The Life Cycle of Stars' },
    ],
  },
  R5: {
    label: 'Types 12-14 (Short Answer, List Selection, Paragraph Matching)',
    passages: [
      { type: 'short_answer', typeName: 'Short Answer Questions', difficulty: 'band_5_6', topic: 'Transport: The History of High-Speed Rail' },
      { type: 'short_answer', typeName: 'Short Answer Questions', difficulty: 'band_6_7', topic: 'Zoology: Animal Communication Systems' },
      { type: 'short_answer', typeName: 'Short Answer Questions', difficulty: 'band_7_8', topic: 'Philosophy: Consciousness and the Mind-Body Problem' },
      { type: 'list_selection', typeName: 'List Selection', difficulty: 'band_5_6', topic: 'Nutrition: The Science of Superfoods' },
      { type: 'list_selection', typeName: 'List Selection', difficulty: 'band_6_7', topic: 'Technology: Blockchain Beyond Cryptocurrency' },
      { type: 'list_selection', typeName: 'List Selection', difficulty: 'band_7_8', topic: 'Ethics: The Trolley Problem and Moral Philosophy' },
      { type: 'paragraph_matching', typeName: 'Paragraph Matching', difficulty: 'band_5_6', topic: 'Geography: The Formation and Types of Volcanoes' },
      { type: 'paragraph_matching', typeName: 'Paragraph Matching', difficulty: 'band_6_7', topic: 'History: The Printing Press and the Information Revolution' },
      { type: 'paragraph_matching', typeName: 'Paragraph Matching', difficulty: 'band_7_8', topic: 'Cognitive Science: Bilingualism and Brain Plasticity' },
    ],
  },
};

// ─── QUESTION TYPE SPECIFIC PROMPTS ──────────────────────────────
function getQuestionInstructions(type, typeName) {
  const instructions = {
    matching_headings: `Generate a list of headings (more headings than paragraphs — include 2-3 distractors). Students match headings to paragraphs.
Format: { "headings": ["i. heading1", "ii. heading2", ...], "questions": [{"paragraph": "A", "correct_heading": "iv", "explanation": "..."}], "distractors": ["ii", "vi"] }`,

    matching_information: `Generate 6-8 statements. Students match each statement to the correct paragraph (A-G).
Format each: { "question_number": N, "statement": "...", "correct_paragraph": "B", "explanation": "..." }`,

    matching_features: `The passage discusses several people/theories/categories. Generate 7-10 questions matching statements to these features.
Format: { "features": ["A. Feature1", "B. Feature2", ...], "questions": [{"question_number": N, "statement": "...", "correct_feature": "C", "explanation": "..."}] }`,

    matching_sentence_endings: `Generate 6-8 sentence beginnings with a list of possible endings (more endings than beginnings — include distractors).
Format: { "sentence_beginnings": [{"question_number": N, "text": "Beginning of sentence..."}], "endings": ["A. ending one", "B. ending two", ...], "answers": [{"question_number": N, "correct_ending": "D", "explanation": "..."}] }`,

    sentence_completion: `Generate 8-10 incomplete sentences. Students complete using words from the passage (max 3 words).
Format each: { "question_number": N, "incomplete_sentence": "The process begins when ___", "correct_answer": "water evaporates", "explanation": "..." }`,

    summary_completion: `Generate a summary paragraph with 8-10 gaps. Provide a word list (more words than gaps as distractors).
Format: { "summary_text": "Text with ___(1)___ gaps ___(2)___...", "word_list": ["word1", "word2", ...], "answers": [{"gap_number": 1, "correct_word": "word3", "explanation": "..."}] }`,

    table_completion: `The passage describes a process or comparison. Generate a table/flowchart with 6-8 gaps to fill from the passage.
Format: { "table_title": "...", "columns": ["Col1", "Col2"], "rows": [{"col1": "given", "col2": "___(1)___"}], "answers": [{"gap_number": 1, "correct_answer": "answer", "explanation": "..."}] }`,

    diagram_labelling: `The passage describes a process or structure. Generate 6-8 diagram labels to complete.
Format: { "diagram_description": "Description of what the diagram shows", "labels": [{"label_number": N, "position_description": "top left / arrow pointing to X", "correct_answer": "answer from passage", "explanation": "..."}] }`,

    short_answer: `Generate 8-10 short answer questions. Answers should be no more than 3 words from the passage.
Format each: { "question_number": N, "question": "...", "correct_answer": "max 3 words", "explanation": "..." }`,

    list_selection: `Generate 5-7 questions where students select items from a list of options.
Format: { "instruction": "Choose TWO/THREE...", "options": ["A. ...", "B. ...", ...], "questions": [{"question_number": N, "correct_answers": ["B", "E"], "explanation": "..."}] }`,

    paragraph_matching: `Generate 7-10 statements. Students match each to the paragraph where the information is found.
Format each: { "question_number": N, "statement": "...", "correct_paragraph": "C", "explanation": "..." }`,
  };

  return instructions[type] || instructions.matching_information;
}

async function generateSpecialPassage(type, typeName, difficulty, passageNum, topic) {
  const difficultyGuide = {
    'band_5_6': 'Band 5-6: straightforward vocabulary, clear structure, direct information',
    'band_6_7': 'Band 6-7: moderate complexity, some academic vocabulary, requires inference',
    'band_7_8': 'Band 7-8: complex academic text, nuanced arguments, sophisticated vocabulary'
  };

  const prompt = `You are an IELTS reading passage writer creating ORIGINAL academic content.

Generate an IELTS Academic Reading passage with questions.

REQUIREMENTS:
- Topic: ${topic}
- Difficulty: ${difficultyGuide[difficulty]}
- Word count: 700-900 words
- Academic register, suitable for IELTS Academic test
- ORIGINAL content — never copy from any source
- Culturally appropriate for international students including Saudi Arabian students
- The passage should have a clear title
- Organize into 5-8 clearly labeled paragraphs (A, B, C, D, E, F, G, H)
- Question type: ${typeName}

QUESTION FORMAT:
${getQuestionInstructions(type, typeName)}

Return ONLY valid JSON:
{
  "title": "passage title",
  "content": "full passage text with paragraphs labeled A-H separated by \\n\\n",
  "word_count": number,
  "topic_category": "${topic.split(':')[0].trim().toLowerCase()}",
  "questions": <questions in the format described above>,
  "answer_key": [
    { "question_number": N, "correct_answer": "...", "explanation": "Brief explanation" }
  ]
}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].text;
      let clean = text.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      else if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      clean = clean.trim();

      let parsed;
      try { parsed = JSON.parse(clean); }
      catch {
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('No JSON found');
      }

      if (!parsed.title || !parsed.content) throw new Error('Missing required fields');
      return parsed;
    } catch (err) {
      console.log(`    ⚠️ Attempt ${attempt}/3 failed: ${err.message}`);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────
async function main() {
  const batchArg = process.argv[2]; // R1, R2, R3, R4, R5
  if (!batchArg || !BATCHES[batchArg]) {
    console.log('Usage: node ielts-reading-gen.cjs R1|R2|R3|R4|R5');
    process.exit(1);
  }

  const batch = BATCHES[batchArg];
  console.log(`\n🚀 IELTS Reading Generator — ${batch.label}`);
  console.log('═'.repeat(50));

  // Check existing passages
  const { data: existing } = await supabase.from('ielts_reading_passages').select('passage_number');
  const existingNums = new Set(existing?.map(p => p.passage_number) || []);

  // Calculate starting passage number
  const { data: maxP } = await supabase.from('ielts_reading_passages').select('passage_number').order('passage_number', { ascending: false }).limit(1);
  let nextNum = (maxP?.[0]?.passage_number || 0) + 1;

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < batch.passages.length; i++) {
    const p = batch.passages[i];
    const passageNum = nextNum + i;

    console.log(`\n📄 [${i + 1}/${batch.passages.length}] ${p.typeName} (${p.difficulty})`);
    console.log(`   Topic: ${p.topic}`);

    try {
      let result;
      const simpleTypes = ['multiple_choice', 'true_false_not_given', 'yes_no_not_given'];
      if (simpleTypes.includes(p.type)) {
        result = await generatePassage(p.type, p.typeName, p.difficulty, passageNum, p.topic);
      } else {
        result = await generateSpecialPassage(p.type, p.typeName, p.difficulty, passageNum, p.topic);
      }

      const id = await insertPassage(result, passageNum, p.difficulty);
      console.log(`   ✅ Inserted: ${result.title} (${result.word_count} words) → ${id}`);
      generated++;
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 ${batchArg} Summary: ${generated} generated, ${failed} failed`);

  // Verify total
  const { data: total } = await supabase.from('ielts_reading_passages').select('id');
  console.log(`📦 Total passages in DB: ${total?.length || 0}`);
  console.log('');
}

main().catch(err => {
  console.error('💥 Fatal:', err.message);
  process.exit(1);
});
