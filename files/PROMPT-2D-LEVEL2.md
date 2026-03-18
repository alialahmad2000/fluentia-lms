# PROMPT 2D: Generate Level 2 Complete (12 Units)
# Target: Claude Code CLI
# Run: claude --dangerously-skip-permissions
# Instruction: Read and execute prompts/PROMPT-2D-LEVEL2.md

---

## CONTEXT

Level 1 is complete. Now generate Level 2 — this is the most important level because most of Ali's current students are at Level 2 (A2).

## YOUR TASK

```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node scripts/curriculum-generator/index.js --level 2
```

If it stops midway, re-run — progress tracker handles resume.

## AFTER COMPLETION

1. Verify:
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
  const l2 = units?.filter(u => u.curriculum_levels?.level_number === 2);
  for (const unit of l2) {
    const { data: readings } = await supabase.from('curriculum_readings').select('id').eq('unit_id', unit.id);
    const { data: vocab } = await supabase.from('curriculum_vocabulary').select('id').eq('unit_id', unit.id);
    const { data: grammar } = await supabase.from('curriculum_grammar').select('id').eq('unit_id', unit.id);
    console.log('Unit', unit.unit_number, unit.title_en, '— Readings:', readings?.length, 'Vocab:', vocab?.length, 'Grammar:', grammar?.length);
  }
}
verify();
"
```

2. Commit:
```bash
git add -A
git commit -m "feat: generate Level 2 complete — 12 units of A2 content (Phase 2D)

- All 12 units of Level 2 (Development/A2) content generated
- Topics: environment, media, culture, science, social issues, work, innovation, art, migration, food science, architecture, oceans
- Grammar: will vs going to, present perfect, comparatives, superlatives, modals, conditionals, past continuous
- Total Level 2 cost: ~$3.36"

git push origin main
```

## WHAT NOT TO DO
- ❌ Do NOT generate content for any other level
- ❌ Do NOT modify the engine, templates, or UI files
