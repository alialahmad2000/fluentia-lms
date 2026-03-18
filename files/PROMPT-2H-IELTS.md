# PROMPT 2H: Generate IELTS Track Content
# Target: Claude Code CLI
# Instruction: Read and execute prompts/PROMPT-2H-IELTS.md

---

## CONTEXT

All 72 general curriculum units are generated. Now generate content for the IELTS preparation track. The IELTS tables already exist from Phase 1:
- ielts_reading_passages
- ielts_reading_skills (14 question types already seeded)
- ielts_writing_tasks
- ielts_listening_sections
- ielts_speaking_questions
- ielts_mock_tests
- ielts_diagnostic

## YOUR TASK

### Part 1: Add IELTS Generator to the Engine

Create new generators and templates in the existing engine:

```
scripts/curriculum-generator/
  generators/
    ielts-reading.js
    ielts-writing.js
    ielts-listening.js
    ielts-speaking.js
    ielts-diagnostic.js
  templates/
    ielts-reading-prompt.js
    ielts-writing-prompt.js
    ielts-listening-prompt.js
    ielts-speaking-prompt.js
    ielts-diagnostic-prompt.js
```

### Part 2: IELTS Reading Content

Generate reading passages covering all 14 IELTS question types:
1. Multiple Choice
2. Identifying Information (True/False/Not Given)
3. Identifying Writer's Views (Yes/No/Not Given)
4. Matching Information
5. Matching Headings
6. Matching Features
7. Matching Sentence Endings
8. Sentence Completion
9. Summary Completion
10. Note Completion
11. Table Completion
12. Flow-chart Completion
13. Diagram Label Completion
14. Short Answer Questions

For each question type, generate:
- 3 practice passages (easy → medium → hard) = **42 passages total**
- Each passage: 700-900 words (IELTS standard length)
- Each passage: 10-13 questions of that specific type
- Academic register, varied topics (science, history, social studies, technology)

### Part 3: IELTS Writing Content

Generate writing tasks:
- **Task 1:** 12 tasks (4 line graphs, 2 bar charts, 2 pie charts, 2 tables, 1 process diagram, 1 map)
  - Each with: task description, model answer outline, band descriptors, useful phrases, common mistakes
- **Task 2:** 12 essay topics covering IELTS common themes
  - Types: opinion, discussion, problem-solution, two-part question
  - Each with: topic, planning guide, model structure, band descriptors, useful phrases

### Part 4: IELTS Listening Content

Generate listening scripts for 4 sections (IELTS format):
- **Section 1:** 6 scripts — social/everyday conversation (2 speakers)
- **Section 2:** 6 scripts — monologue on social topic
- **Section 3:** 6 scripts — academic discussion (2-3 speakers)
- **Section 4:** 6 scripts — academic lecture (1 speaker)

Each script with:
- 10 questions matching IELTS format
- Approximate duration (Section 1: 4-5 min, Section 2: 4-5 min, Section 3: 5-6 min, Section 4: 5-6 min)
- Speaker labels
- Natural spoken English with fillers and repairs

### Part 5: IELTS Speaking Content

Generate speaking questions for all 3 parts:
- **Part 1:** 20 topic sets (each with 3-4 questions) — personal/familiar topics
- **Part 2:** 20 cue cards — describe a person/place/event/object (2 min talk)
- **Part 3:** 20 discussion question sets (linked to Part 2 topics) — abstract/deeper

Each with: model answer outline, useful vocabulary, grammar structures to demonstrate, examiner tips in Arabic

### Part 6: IELTS Diagnostic Test

Generate 1 diagnostic test:
- Mini reading (1 short passage, 10 questions)
- Mini listening (1 section, 10 questions)
- Writing prompt (1 Task 2)
- Speaking questions (Part 1 + Part 2)
- Scoring rubric that estimates band score

## HOW TO RUN

```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"

# First check IELTS tables exist
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const tables = ['ielts_reading_passages','ielts_reading_skills','ielts_writing_tasks','ielts_listening_sections','ielts_speaking_questions','ielts_mock_tests','ielts_diagnostic'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    console.log(error ? '❌' : '✅', t, error ? error.message : '— exists');
  }
}
check();
"

# Then generate all IELTS content
node scripts/curriculum-generator/index.js --ielts
```

⚠️ You may need to add --ielts flag support to index.js. Adapt the orchestrator to handle IELTS content separately from general curriculum.

## AFTER COMPLETION

1. Verify all IELTS content:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function verify() {
  const { data: passages } = await supabase.from('ielts_reading_passages').select('id');
  const { data: writing } = await supabase.from('ielts_writing_tasks').select('id');
  const { data: listening } = await supabase.from('ielts_listening_sections').select('id');
  const { data: speaking } = await supabase.from('ielts_speaking_questions').select('id');
  const { data: diagnostic } = await supabase.from('ielts_diagnostic').select('id');
  
  console.log('Reading passages:', passages?.length, '(target: 42)');
  console.log('Writing tasks:', writing?.length, '(target: 24)');
  console.log('Listening sections:', listening?.length, '(target: 24)');
  console.log('Speaking questions:', speaking?.length, '(target: 60)');
  console.log('Diagnostic:', diagnostic?.length, '(target: 1)');
}
verify();
"
```

2. Print final total cost:
```bash
node -e "
const fs = require('fs');
const costs = JSON.parse(fs.readFileSync('scripts/curriculum-generator/output/costs.json', 'utf8'));
console.log('=== FINAL COST REPORT ===');
console.log('Total cost: $' + (costs.total_cost_usd || 0).toFixed(2));
console.log('Total API calls:', costs.total_calls || 'N/A');
"
```

3. Commit:
```bash
git add -A
git commit -m "feat: generate complete IELTS track content (Phase 2H)

- 42 reading passages covering all 14 IELTS question types
- 24 writing tasks (12 Task 1 + 12 Task 2)
- 24 listening sections (6 per section type)
- 60 speaking questions (Part 1 + Part 2 + Part 3)
- 1 diagnostic test
- PHASE 2 COMPLETE — all curriculum content generated"

git push origin main
```

---

## 🎉 PHASE 2 COMPLETE

After this prompt, the entire curriculum has AI-generated content:
- **General:** 72 units × 8 content types = ~576 pieces of content
- **IELTS:** 42 + 24 + 24 + 60 + 1 = ~151 pieces of content
- **Total:** ~727 pieces of original educational content
- **Estimated total cost:** ~$25-30
