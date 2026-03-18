# IELTS-W1: Writing Task 1 (12 Tasks — Charts, Graphs, Tables, Processes, Maps)
# Instruction: Read and execute prompts/IELTS-W1.md

---

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: existing } = await supabase.from('ielts_writing_tasks').select('*').limit(1);
  console.log('Existing tasks:', existing?.length);
  if (existing?.[0]) console.log('Columns:', Object.keys(existing[0]));
  else {
    const { error } = await supabase.from('ielts_writing_tasks').select('id');
    console.log('Table check:', error ? error.message : 'exists but empty');
  }
}
check();
"
```

⚠️ Use ACTUAL column names. Skip any existing tasks.

## YOUR TASK

Generate **12 IELTS Writing Task 1 items**:

### Distribution:
1. Line Graph — global internet usage trends (2000-2020)
2. Line Graph — renewable energy production in 4 countries
3. Bar Chart — water consumption by sector in 3 regions
4. Bar Chart — university enrollment by subject area
5. Pie Chart — household expenditure breakdown
6. Pie Chart — sources of electricity generation
7. Table — literacy rates across 6 countries over 3 decades
8. Table — tourist arrivals and revenue for 5 destinations
9. Process Diagram — how solar panels generate electricity
10. Process Diagram — water recycling system
11. Map — changes to a town center (before/after)
12. Mixed (Bar + Line) — rainfall and temperature over 12 months

### For EACH task provide:
- **Task type**: line_graph / bar_chart / pie_chart / table / process / map / mixed
- **Description**: Describe the visual data in text (since we store data, not images)
- **Data**: The actual data as JSON (numbers, labels, categories)
- **Task prompt**: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
- **Word limit**: minimum 150 words
- **Time**: 20 minutes
- **Model answer outline**: key features to mention, structure suggestion
- **Band 7 sample structure**: introduction → overview → detail paragraph 1 → detail paragraph 2
- **Useful phrases**: 5-8 key phrases for this specific task type
- **Common mistakes**: 3-4 mistakes Arabic speakers commonly make
- **Grading criteria**: Task Achievement, Coherence, Lexical Resource, Grammar (band descriptors)

## RULES
- ALL data must be realistic but ORIGINAL (not copied from any real IELTS test)
- Numbers should be plausible and internally consistent
- Topics culturally appropriate for Saudi students
- Arabic tips included (نصائح بالعربي) for each task

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_writing_tasks').select('id, task_type'); console.log('Writing tasks:', data?.length); data?.forEach(t => console.log(' -', t.task_type || t.type)); }
v();
"
git add -A && git commit -m "feat(ielts): generate Writing Task 1 — 12 tasks (graphs, charts, tables, processes, maps)" && git push origin main
```

**STOP after this.**
