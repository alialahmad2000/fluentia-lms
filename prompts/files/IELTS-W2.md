# IELTS-W2: Writing Task 2 (12 Essay Topics)
# Instruction: Read and execute prompts/IELTS-W2.md

---

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data } = await supabase.from('ielts_writing_tasks').select('id, task_type, type');
  console.log('Existing writing tasks:', data?.length);
  data?.forEach(t => console.log(' -', t.task_type || t.type));
  const { data: s } = await supabase.from('ielts_writing_tasks').select('*').limit(1);
  if (s?.[0]) console.log('Columns:', Object.keys(s[0]));
}
check();
"
```

⚠️ Use ACTUAL column names. Task 1 items should already exist from IELTS-W1. Add Task 2 items only.

## YOUR TASK

Generate **12 IELTS Writing Task 2 essay topics**:

### Distribution by essay type:
1. Opinion — "To what extent do you agree or disagree?" (Technology in education)
2. Opinion — "To what extent do you agree or disagree?" (Working from home)
3. Discussion — "Discuss both views and give your opinion" (Traditional vs modern medicine)
4. Discussion — "Discuss both views and give your opinion" (Space exploration vs Earth problems)
5. Problem-Solution — "What are the causes? What solutions can you suggest?" (Youth unemployment)
6. Problem-Solution — "What problems does this cause? What measures could be taken?" (Urban pollution)
7. Two-part Question — "Why is this happening? Is it a positive or negative development?" (Declining reading habits)
8. Two-part Question — "What are the reasons? Do the advantages outweigh the disadvantages?" (Social media influence)
9. Opinion — (Importance of preserving cultural heritage)
10. Discussion — (Single-sex vs co-educational schools)
11. Problem-Solution — (Obesity in children)
12. Two-part Question — (Globalization and local businesses)

### For EACH essay provide:
- **Essay type**: opinion / discussion / problem_solution / two_part
- **Topic/prompt**: The full essay question as it would appear on the IELTS exam
- **Word limit**: minimum 250 words
- **Time**: 40 minutes
- **Planning guide**: 4-step plan (analyze → brainstorm → outline → write)
- **Model structure**: paragraph-by-paragraph outline
- **Key arguments**: 3-4 main points for each side
- **Useful phrases**: 8-10 phrases specific to this essay type
- **Band descriptors**: what Band 5, 6, 7, 8 look like for this topic
- **Common mistakes for Arabic speakers**: 3-4 specific errors
- **Arabic tips**: نصائح بالعربي

## RULES
- Topics must be ORIGINAL (not copied from any real IELTS test)
- Topics should be accessible to B1+ level students
- Avoid controversial political/religious topics
- Culturally appropriate for Saudi students

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_writing_tasks').select('id'); console.log('Total writing tasks:', data?.length, '(target: 24)'); }
v();
"
git add -A && git commit -m "feat(ielts): generate Writing Task 2 — 12 essay topics — WRITING COMPLETE" && git push origin main
```

**STOP after this.**
