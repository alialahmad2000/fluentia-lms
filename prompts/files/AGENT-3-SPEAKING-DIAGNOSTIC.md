# AGENT 3: IELTS Speaking + Diagnostic Generator (Auto-Sequential)
# Paste this ONCE into Claude Code — it will run all 3 prompts automatically

---

You are Agent 3 — responsible for generating ALL IELTS Speaking and Diagnostic content.

## YOUR MISSION

Execute these 3 prompts IN ORDER, one after another, WITHOUT stopping between them:

1. `prompts/files/IELTS-S1.md` — Speaking Part 1 + Part 2 (20 topics + 20 cue cards)
2. `prompts/files/IELTS-S2.md` — Speaking Part 3 (20 discussion sets)
3. `prompts/files/IELTS-D1.md` — Diagnostic Test (1 complete placement test)

## HOW TO WORK

```
For each prompt file:
  1. Read the prompt file
  2. Execute ALL instructions in it (check DB, generate content, insert, verify, commit)
  3. When done, IMMEDIATELY move to the next prompt file
  4. Do NOT stop or ask for confirmation between prompts
```

## RULES

- Work from the project folder: `cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"`
- Load .env with `require('dotenv').config()` for every Node script
- Use ACTUAL column names from the database — check schema first
- Skip any content that already exists in the database
- ALL content must be ORIGINAL — never copy from any source
- Commit + push after each prompt is complete
- If a prompt fails, log the error, skip it, and move to the next one

## START NOW

Read and execute: `prompts/files/IELTS-S1.md`

When S1 is done, immediately read and execute: `prompts/files/IELTS-S2.md`
When S2 is done → D1

After D1 is complete, run this FINAL CHECK for ALL IELTS content:

```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function finalReport() {
  const { data: r } = await supabase.from('ielts_reading_passages').select('id');
  const { data: w } = await supabase.from('ielts_writing_tasks').select('id');
  const { data: l } = await supabase.from('ielts_listening_sections').select('id');
  const { data: s } = await supabase.from('ielts_speaking_questions').select('id');
  const { data: d } = await supabase.from('ielts_diagnostic').select('id');
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🎓 IELTS CONTENT — FINAL REPORT       ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Reading passages:  ', (r?.length || 0).toString().padStart(3), ' / 42        ║');
  console.log('║  Writing tasks:     ', (w?.length || 0).toString().padStart(3), ' / 24        ║');
  console.log('║  Listening sections:', (l?.length || 0).toString().padStart(3), ' / 24        ║');
  console.log('║  Speaking questions:', (s?.length || 0).toString().padStart(3), ' / 140       ║');
  console.log('║  Diagnostic test:   ', (d?.length || 0).toString().padStart(3), ' / 1         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
}
finalReport();
"
```

Then print:

```
✅ AGENT 3 COMPLETE — All IELTS Speaking + Diagnostic content generated.
✅ ALL 3 AGENTS SHOULD NOW BE DONE — IELTS PHASE COMPLETE.
```
