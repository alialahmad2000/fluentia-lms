# IELTS-R2: Reading — Question Types 4-5 (Matching Information, Matching Headings)
# Instruction: Read and execute prompts/IELTS-R2.md

---

## CONTEXT
Fluentia LMS IELTS content generation. Previous prompt (IELTS-R1) generated Types 1-3.

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: skills } = await supabase.from('ielts_reading_skills').select('*').order('id');
  console.log('Reading skills:'); skills?.forEach(s => console.log(' -', s.id, s.name || s.skill_name || s.type));
  const { data: passages } = await supabase.from('ielts_reading_passages').select('id, skill_id, difficulty');
  console.log('Existing passages:', passages?.length);
  const { data: sample } = await supabase.from('ielts_reading_passages').select('*').limit(1);
  if (sample?.[0]) console.log('Columns:', Object.keys(sample[0]));
}
check();
"
```

⚠️ Use ACTUAL column names from above. Skip any passages that already exist for these types.

## YOUR TASK

Generate **6 IELTS reading passages** — 3 for each:

### Question Type 4: Matching Information
- 3 passages (easy → medium → hard), 700-900 words
- Questions: match statements to correct paragraph
- 10-13 questions per passage

### Question Type 5: Matching Headings
- 3 passages (easy → medium → hard), 700-900 words
- Questions: match headings to paragraphs (more headings than paragraphs)
- 8-10 questions per passage

## CONTENT RULES
- ORIGINAL content only — academic register — culturally appropriate for Saudi students
- Include answer key with explanations
- Varied topics (technology, environment, psychology, economics)

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_reading_passages').select('id'); console.log('Total:', data?.length); }
v();
"
git add -A && git commit -m "feat(ielts): generate reading passages — Types 4-5 (Matching Info, Matching Headings)" && git push origin main
```

**STOP after this.**
