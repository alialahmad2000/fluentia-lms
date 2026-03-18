# PROMPT 2C: Generate Level 1 Complete (Units 2-12)
# Target: Claude Code CLI
# Run: claude --dangerously-skip-permissions
# Instruction: Read and execute prompts/PROMPT-2C-LEVEL1.md

---

## CONTEXT

The content generation engine is built and tested. Level 1 Unit 1 prototype was approved. Now generate the remaining 11 units of Level 1.

## YOUR TASK

Run the content generator for **Level 1 (أساسيات / Basics / A1), Units 2 through 12**.

```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"

# Generate Level 1, all remaining units (progress tracker will skip Unit 1 since it's done)
node scripts/curriculum-generator/index.js --level 1
```

If the script stops or times out midway:
- Just re-run the same command — the progress tracker will resume from where it stopped
- Check `scripts/curriculum-generator/output/progress.json` to see what's completed

## AFTER COMPLETION

1. Verify all 12 units have content:
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
  const l1 = units?.filter(u => u.curriculum_levels?.level_number === 1);
  
  for (const unit of l1) {
    const { data: readings } = await supabase.from('curriculum_readings').select('id').eq('unit_id', unit.id);
    const { data: vocab } = await supabase.from('curriculum_vocabulary').select('id').eq('unit_id', unit.id);
    const { data: grammar } = await supabase.from('curriculum_grammar').select('id').eq('unit_id', unit.id);
    console.log('Unit', unit.unit_number, unit.title_en, '— Readings:', readings?.length, 'Vocab:', vocab?.length, 'Grammar:', grammar?.length);
  }
}
verify();
"
```

2. Print cost report:
```bash
cat scripts/curriculum-generator/output/costs.json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log('Total cost: $'+j.total_cost_usd?.toFixed(2));"
```

3. Commit and push:
```bash
git add -A
git commit -m "feat: generate Level 1 complete — 12 units of A1 content (Phase 2C)

- All 12 units of Level 1 (Basics/A1) content generated
- ~240 vocabulary words, ~144 comprehension questions
- 12 grammar lessons, 12 writing tasks, 12 listening scripts
- 12 speaking topics, 180 irregular verbs, 12 assessments
- Total cost: ~$3.36"

git push origin main
```

## WHAT NOT TO DO
- ❌ Do NOT generate content for any other level
- ❌ Do NOT modify the engine or templates
- ❌ Do NOT modify any UI files
