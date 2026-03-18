# IELTS-R5: Reading — Question Types 12-14 (Flow-chart, Diagram Label, Short Answer)
# Instruction: Read and execute prompts/IELTS-R5.md

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

### Type 12: Flow-chart Completion
- 3 passages (easy → medium → hard), 700-900 words
- Complete a flow-chart showing a process described in the passage
- 6-8 questions per passage
- Passage should describe a process or sequence of events

### Type 13: Diagram Label Completion
- 3 passages (easy → medium → hard), 700-900 words
- Label parts of a diagram using words from the passage
- 6-8 questions per passage
- Passage should describe a physical object, system, or mechanism
- Include a text description of the diagram (since we can't generate images yet)

### Type 14: Short Answer Questions
- 3 passages (easy → medium → hard), 700-900 words
- Answer questions using words from the passage (word limit: 1-3 words)
- 10-13 questions per passage

## RULES
- ORIGINAL content, academic register, culturally appropriate for Saudi students
- Varied topics (engineering, ecology, medicine, agriculture)
- Answer key with explanations

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_reading_passages').select('id'); console.log('Total passages:', data?.length, '(target: 42)'); }
v();
"
git add -A && git commit -m "feat(ielts): generate reading passages — Types 12-14 (Flow-chart, Diagram, Short Answer) — READING COMPLETE" && git push origin main
```

**STOP after this.**
