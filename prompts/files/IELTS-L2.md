# IELTS-L2: Listening — Sections 3-4 (Academic)
# Instruction: Read and execute prompts/IELTS-L2.md

---

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data } = await supabase.from('ielts_listening_sections').select('id, section_number');
  console.log('Existing sections:', data?.length);
  data?.forEach(s => console.log(' - Section', s.section_number));
  const { data: sample } = await supabase.from('ielts_listening_sections').select('*').limit(1);
  if (sample?.[0]) console.log('Columns:', Object.keys(sample[0]));
}
check();
"
```

⚠️ Use ACTUAL column names. Sections 1-2 should already exist from IELTS-L1. Add Sections 3-4 only.

## YOUR TASK

Generate **12 IELTS listening scripts** — 6 for Section 3 + 6 for Section 4:

### Section 3 (6 scripts) — Academic discussion between 2-3 speakers
Format: Dialogue, ~5-6 minutes (~750-900 words)
Topics:
1. Two students discussing a research project on renewable energy
2. Student and tutor reviewing an essay about urbanization
3. Three students planning a group presentation on marine biology
4. Student and professor discussing thesis methodology
5. Two students comparing notes on a psychology lecture
6. Student consulting a librarian about research sources for a history paper

Question types: MCQ, matching, sentence completion

### Section 4 (6 scripts) — Academic lecture/talk (single speaker)
Format: Monologue, ~5-6 minutes (~750-900 words)
Topics:
1. Lecture on the history of writing systems
2. Lecture on sustainable architecture
3. Lecture on sleep science and memory consolidation
4. Lecture on the economics of water scarcity
5. Lecture on artificial intelligence in healthcare
6. Lecture on migration patterns of marine animals

Question types: note completion, summary completion, sentence completion, MCQ

### For EACH script provide:
- **Section number**: 3 or 4
- **Script**: Full dialogue/monologue with speaker labels
- **Word count**: 750-900
- **Estimated duration**: 5-6 minutes
- **Speakers**: names, roles, and context
- **10 questions** with correct answers and explanations
- **Academic vocabulary**: 8-10 key terms with Arabic translations
- **Transcript notes**: natural academic speech patterns

## RULES
- Academic register but still natural spoken English
- Section 3: students should sound like real students (informal academic)
- Section 4: lecturer style — clear, structured, with signposting language
- Include academic discourse markers ("Let's now turn to...", "As I mentioned earlier...")
- Culturally appropriate — no controversial content
- Spelling of answers must be exact

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_listening_sections').select('id'); console.log('Total listening sections:', data?.length, '(target: 24)'); }
v();
"
git add -A && git commit -m "feat(ielts): generate Listening Sections 3-4 — 12 academic scripts — LISTENING COMPLETE" && git push origin main
```

**STOP after this.**
