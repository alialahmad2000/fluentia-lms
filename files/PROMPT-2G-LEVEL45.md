# PROMPT 2G: Generate Level 4 + Level 5 (24 Units Total)
# Target: Claude Code CLI
# Instruction: Read and execute prompts/PROMPT-2G-LEVEL45.md

---

## YOUR TASK

Generate both advanced levels back to back.

```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"

# Level 4 first (B2 - Mastery)
node scripts/curriculum-generator/index.js --level 4

# Then Level 5 (C1 - Proficiency)
node scripts/curriculum-generator/index.js --level 5
```

If either stops midway, re-run the same command — progress tracker handles resume.

## AFTER COMPLETION

1. Verify both levels:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function verify() {
  const { data: units } = await supabase
    .from('curriculum_units')
    .select('id, unit_number, title_en, level_id, curriculum_levels(level_number)')
    .order('unit_number');
  
  for (const lvl of [4, 5]) {
    const filtered = units?.filter(u => u.curriculum_levels?.level_number === lvl);
    console.log('\n--- Level', lvl, '---');
    for (const unit of filtered) {
      const { data: readings } = await supabase.from('curriculum_readings').select('id').eq('unit_id', unit.id);
      const { data: vocab } = await supabase.from('curriculum_vocabulary').select('id').eq('unit_id', unit.id);
      console.log('Unit', unit.unit_number, unit.title_en, '— Readings:', readings?.length, 'Vocab:', vocab?.length);
    }
  }
}
verify();
"
```

2. Print total cost so far:
```bash
node -e "
const fs = require('fs');
const costs = JSON.parse(fs.readFileSync('scripts/curriculum-generator/output/costs.json', 'utf8'));
console.log('Total cost so far: $' + (costs.total_cost_usd || 0).toFixed(2));
console.log('Total API calls:', costs.total_calls || 'N/A');
"
```

3. Commit:
```bash
git add -A
git commit -m "feat: generate Level 4 + 5 complete — 24 units of B2/C1 content (Phase 2G)

- Level 4 (Mastery/B2): 12 units — advanced academic content
- Level 5 (Proficiency/C1): 12 units — near-native complexity
- ALL 72 general curriculum units now have AI-generated content"

git push origin main
```
