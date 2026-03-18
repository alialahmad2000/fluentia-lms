# IELTS-R1: Reading — Question Types 1-3 (Multiple Choice, T/F/NG, Y/N/NG)
# Instruction: Read and execute prompts/IELTS-R1.md

---

## CONTEXT
Fluentia LMS — Arabic-first English academy LMS.
Repo: C:\Users\Dr. Ali\Desktop\fluentia-lms
IELTS curriculum tables already exist in Supabase. The `ielts_reading_skills` table has 14 question types already seeded.

## BEFORE YOU START

```bash
# 1. Check the IELTS tables schema
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  // Check reading skills (should have 14 types)
  const { data: skills } = await supabase.from('ielts_reading_skills').select('*').order('id');
  console.log('Reading skills:', skills?.length);
  skills?.forEach(s => console.log(' -', s.id, s.name || s.skill_name || s.type));
  
  // Check existing passages
  const { data: passages } = await supabase.from('ielts_reading_passages').select('id, skill_id, difficulty');
  console.log('Existing passages:', passages?.length);
  
  // Show passage table columns
  const { data: sample, error } = await supabase.from('ielts_reading_passages').select('*').limit(1);
  if (error) console.log('Passages table error:', error.message);
  else console.log('Passage columns:', sample?.[0] ? Object.keys(sample[0]) : 'empty table - insert to see columns');
}
check();
"
```

⚠️ **CRITICAL:** Read the ACTUAL column names from the query above. Do NOT assume column names.

## YOUR TASK

Generate **9 IELTS reading passages** — 3 for each question type:

### Question Type 1: Multiple Choice
- 3 passages (easy → medium → hard)
- 700-900 words each, academic register
- 10-13 multiple choice questions per passage
- Topics: varied (science, history, social studies)

### Question Type 2: Identifying Information (True/False/Not Given)
- 3 passages (easy → medium → hard)
- 700-900 words each
- 10-13 T/F/NG questions per passage

### Question Type 3: Identifying Writer's Views (Yes/No/Not Given)
- 3 passages (easy → medium → hard)
- 700-900 words each
- 10-13 Y/N/NG questions per passage

## CONTENT RULES
- ALL content must be ORIGINAL — never copy from any source
- Academic register appropriate for IELTS
- Culturally appropriate for Saudi students
- Include answer key with explanations
- Each passage: title, content (700-900 words), questions with answers

## INSERT INTO SUPABASE
- Use the actual column names from the schema check above
- Set status/state to 'draft' if the column exists
- Link to the correct skill_id from ielts_reading_skills

## AFTER COMPLETION
```bash
# Verify
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function verify() {
  const { data } = await supabase.from('ielts_reading_passages').select('id, skill_id, difficulty');
  console.log('Total passages:', data?.length);
}
verify();
"

# Commit
git add -A
git commit -m "feat(ielts): generate reading passages — Types 1-3 (MC, T/F/NG, Y/N/NG)"
git push origin main
```

**STOP after this. Do NOT proceed to next prompt.**
