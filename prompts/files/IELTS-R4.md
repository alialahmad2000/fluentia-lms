# IELTS-R4: Reading — Question Types 9-11 (Summary, Note, Table Completion)
# Instruction: Read and execute prompts/IELTS-R4.md

---

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: skills } = await supabase.from('ielts_reading_skills').select('*').order('id');
  console.log('Skills:'); skills?.forEach(s => console.log(' -', s.id, s.name || s.skill_name || s.type));
  const { data: p } = await supabase.from('ielts_reading_passages').select('id, skill_id, difficulty');
  console.log('Existing passages:', p?.length);
  const { data: s } = await supabase.from('ielts_reading_passages').select('*').limit(1);
  if (s?.[0]) console.log('Columns:', Object.keys(s[0]));
}
check();
"
```

⚠️ Use ACTUAL column names. Skip existing passages for these types.

## YOUR TASK

Generate **9 IELTS reading passages** — 3 for each:

### Type 9: Summary Completion
- 3 passages (easy → medium → hard), 700-900 words
- Complete a summary using words from the passage or from a word bank
- 8-10 questions per passage

### Type 10: Note Completion
- 3 passages (easy → medium → hard), 700-900 words
- Complete notes/bullet points using words from the passage
- 8-10 questions per passage

### Type 11: Table Completion
- 3 passages (easy → medium → hard), 700-900 words
- Fill in missing cells in a table using information from the passage
- 8-10 questions per passage

## RULES
- ORIGINAL content, academic register, culturally appropriate for Saudi students
- Varied topics (marine science, urban planning, anthropology, education)
- Answer key with explanations

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_reading_passages').select('id'); console.log('Total:', data?.length); }
v();
"
git add -A && git commit -m "feat(ielts): generate reading passages — Types 9-11 (Summary, Note, Table Completion)" && git push origin main
```

**STOP after this.**
