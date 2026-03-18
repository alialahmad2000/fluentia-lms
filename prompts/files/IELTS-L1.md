# IELTS-L1: Listening — Sections 1-2 (Social/Everyday)
# Instruction: Read and execute prompts/IELTS-L1.md

---

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data } = await supabase.from('ielts_listening_sections').select('*').limit(1);
  console.log('Existing sections:', data?.length);
  if (data?.[0]) console.log('Columns:', Object.keys(data[0]));
  else {
    const { error } = await supabase.from('ielts_listening_sections').select('id');
    console.log('Table:', error ? error.message : 'exists but empty');
  }
}
check();
"
```

⚠️ Use ACTUAL column names.

## YOUR TASK

Generate **12 IELTS listening scripts** — 6 for Section 1 + 6 for Section 2:

### Section 1 (6 scripts) — Social conversation between 2 speakers
Format: Dialogue, ~4-5 minutes when read aloud (~600-750 words)
Topics:
1. Booking a hotel room (asking about facilities, prices, dates)
2. Joining a gym (membership types, schedule, facilities)
3. Renting an apartment (location, price, features, move-in date)
4. Registering for a course (course options, schedule, fees)
5. Making a restaurant reservation (party size, dietary needs, time)
6. Reporting a lost item (description, location, contact details)

Question types for Section 1: form completion, note completion, table completion

### Section 2 (6 scripts) — Monologue on social/everyday topic
Format: Single speaker, ~4-5 minutes (~600-750 words)
Topics:
1. Welcome talk at a university orientation
2. Guide describing a museum tour
3. Radio announcement about a local festival
4. Presentation about a new community center
5. Tour guide describing a historical city
6. Librarian explaining library services and rules

Question types for Section 2: MCQ, matching, map/plan labeling (describe locations in text)

### For EACH script provide:
- **Section number**: 1 or 2
- **Script**: Full dialogue/monologue with speaker labels
- **Word count**: 600-750
- **Estimated duration**: 4-5 minutes
- **Speakers**: names and roles
- **10 questions** with correct answers and explanations
- **Question types**: appropriate for the section
- **Key vocabulary**: 5-8 important words/phrases
- **Transcript notes**: include natural speech features (hesitations, self-corrections) for realism

## RULES
- Scripts must sound NATURAL — not like written text read aloud
- Include fillers ("um", "well", "let me think") sparingly
- Names and places should be realistic but fictional
- Culturally appropriate — no alcohol/pork references
- Spelling of answers must be exact (IELTS standard)

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_listening_sections').select('id, section_number'); console.log('Listening sections:', data?.length); }
v();
"
git add -A && git commit -m "feat(ielts): generate Listening Sections 1-2 — 12 social/everyday scripts" && git push origin main
```

**STOP after this.**
