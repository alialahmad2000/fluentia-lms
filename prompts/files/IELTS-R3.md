# IELTS-R3: Reading — Question Types 6-8 (Matching Features, Matching Sentence Endings, Sentence Completion)
# Instruction: Read and execute prompts/IELTS-R3.md

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

### Type 6: Matching Features
- 3 passages (easy → medium → hard), 700-900 words
- Match features/characteristics to categories (people, dates, theories, etc.)
- 8-10 questions per passage

### Type 7: Matching Sentence Endings
- 3 passages (easy → medium → hard), 700-900 words
- Complete sentences by choosing correct ending from a list
- 8-10 questions per passage

### Type 8: Sentence Completion
- 3 passages (easy → medium → hard), 700-900 words
- Complete sentences using words from the passage (word limit given)
- 8-10 questions per passage

## RULES
- ORIGINAL content, academic register, culturally appropriate for Saudi students
- Varied topics (biology, linguistics, architecture, sociology)
- Answer key with explanations for each question

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_reading_passages').select('id'); console.log('Total:', data?.length); }
v();
"
git add -A && git commit -m "feat(ielts): generate reading passages — Types 6-8 (Matching Features, Sentence Endings, Sentence Completion)" && git push origin main
```

**STOP after this.**
