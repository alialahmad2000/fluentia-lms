# PROMPT 2E: Generate Level 0 Complete (12 Units)
# Target: Claude Code CLI
# Instruction: Read and execute prompts/PROMPT-2E-LEVEL0.md

---

## YOUR TASK

```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node scripts/curriculum-generator/index.js --level 0
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
  const l0 = units?.filter(u => u.curriculum_levels?.level_number === 0);
  for (const unit of l0) {
    const { data: readings } = await supabase.from('curriculum_readings').select('id').eq('unit_id', unit.id);
    const { data: vocab } = await supabase.from('curriculum_vocabulary').select('id').eq('unit_id', unit.id);
    console.log('Unit', unit.unit_number, unit.title_en, '— Readings:', readings?.length, 'Vocab:', vocab?.length);
  }
}
verify();
"
```

2. Commit:
```bash
git add -A
git commit -m "feat: generate Level 0 complete — 12 units of Pre-A1 Foundation content (Phase 2E)"
git push origin main
```
