# IELTS-D1: Diagnostic Test (Placement Test for IELTS Track)
# Instruction: Read and execute prompts/IELTS-D1.md

---

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data } = await supabase.from('ielts_diagnostic').select('*').limit(1);
  console.log('Existing diagnostic:', data?.length);
  if (data?.[0]) console.log('Columns:', Object.keys(data[0]));
  else {
    const { error } = await supabase.from('ielts_diagnostic').select('id');
    console.log('Table:', error ? error.message : 'exists but empty');
  }
  // Also check mock tests table
  const { data: mocks } = await supabase.from('ielts_mock_tests').select('*').limit(1);
  console.log('Mock tests:', mocks?.length);
  if (mocks?.[0]) console.log('Mock columns:', Object.keys(mocks[0]));
}
check();
"
```

⚠️ Use ACTUAL column names.

## YOUR TASK

Generate **1 IELTS Diagnostic Test** — a shorter placement test to estimate a student's starting band score before they begin the IELTS track.

### Reading Section (20 minutes)
- **1 passage** — 500-600 words (shorter than real IELTS)
- **10 questions** — mix of MCQ (3), T/F/NG (3), sentence completion (4)
- Topic: something accessible (e.g., the science of sleep)
- Difficulty: medium (Band 5-6 level)

### Listening Section (15 minutes)
- **1 script** — Section 2 style (monologue, social topic), ~400-500 words
- **10 questions** — mix of MCQ (4), note completion (6)
- Topic: e.g., guide explaining a community program
- Natural spoken English with speaker labels

### Writing Section (20 minutes)
- **1 Task 2 prompt** — opinion essay
- Topic: accessible, not too complex
- Simplified rubric for diagnostic (0-9 band)
- Model answer outline for the examiner/AI to compare against

### Speaking Section (10 minutes)
- **Part 1**: 4 simple personal questions
- **Part 2**: 1 cue card with bullet points
- No Part 3 (diagnostic only needs to assess basic fluency)
- Assessment criteria: fluency, vocabulary, grammar, pronunciation

### Scoring Rubric
Create a scoring system that estimates band score:
```
Reading:  10 questions × 1 point = 10 points
Listening: 10 questions × 1 point = 10 points  
Writing:  Band 0-9 (AI/trainer assessed)
Speaking: Band 0-9 (AI/trainer assessed)

Score mapping:
Reading + Listening combined (0-20):
  0-4   → Band 3-3.5
  5-8   → Band 4-4.5
  9-12  → Band 5-5.5
  13-16 → Band 6-6.5
  17-20 → Band 7+

Overall estimated band = average of all 4 skills
```

### Student Feedback Template (Arabic)
Based on the score, generate feedback:
- **Band 3-4**: "مستواك الحالي يحتاج تأسيس قبل بدء التحضير لـ IELTS. ننصح بإكمال المستوى 3 أولاً."
- **Band 4.5-5**: "عندك أساس جيد. تحتاج تركيز على [weakest skill]. خطة 3 أشهر مناسبة لك."
- **Band 5.5-6**: "مستواك متوسط جيد. ممكن توصل Band 6.5-7 خلال شهرين مكثفين."
- **Band 6+**: "مستواك متقدم. ركّز على الاستراتيجيات والتقنيات أكثر من اللغة."

### Recommended Study Plan
Based on diagnostic results, suggest:
- Weak reading → focus on skimming/scanning exercises
- Weak listening → daily listening practice + note-taking
- Weak writing → weekly essays with AI feedback
- Weak speaking → daily recording practice + vocabulary building

## INSERT INTO SUPABASE
Insert the diagnostic test into the `ielts_diagnostic` table using actual column names. If the table structure doesn't fit all this data, store the detailed content in JSONB columns.

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() {
  const { data: d } = await supabase.from('ielts_diagnostic').select('id');
  const { data: r } = await supabase.from('ielts_reading_passages').select('id');
  const { data: w } = await supabase.from('ielts_writing_tasks').select('id');
  const { data: l } = await supabase.from('ielts_listening_sections').select('id');
  const { data: s } = await supabase.from('ielts_speaking_questions').select('id');
  console.log('=== IELTS CONTENT FINAL REPORT ===');
  console.log('Diagnostic:', d?.length, '(target: 1)');
  console.log('Reading passages:', r?.length, '(target: 42)');
  console.log('Writing tasks:', w?.length, '(target: 24)');
  console.log('Listening sections:', l?.length, '(target: 24)');
  console.log('Speaking questions:', s?.length, '(target: ~140)');
  console.log('=================================');
  console.log('IELTS CONTENT GENERATION COMPLETE!');
}
v();
"
git add -A && git commit -m "feat(ielts): generate Diagnostic Test + final report — IELTS PHASE COMPLETE" && git push origin main
```

**IELTS CONTENT GENERATION IS NOW COMPLETE.**
