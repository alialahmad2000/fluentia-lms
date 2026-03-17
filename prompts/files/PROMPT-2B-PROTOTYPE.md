# PROMPT 2B: Generate Prototype — Level 1, Unit 1 (Complete)
# Target: Claude Code CLI
# Run: claude --dangerously-skip-permissions
# Instruction: Read and execute prompts/PROMPT-2B-PROTOTYPE.md
# ⚠️ Run this ONLY after Prompt 2A is complete and verified

---

## CONTEXT

The content generation engine from Prompt 2A is built. Now we generate ONE complete unit as a prototype for the academy owner (Dr. Ali) to review before we generate all 72 units.

## YOUR TASK

Run the content generator for **Level 1 (أساسيات / Basics / A1), Unit 1** — generate ALL content types and insert into the database.

---

## STEP 1: Verify the Engine

```bash
# Make sure the engine exists and runs
ls scripts/curriculum-generator/
node scripts/curriculum-generator/index.js --help 2>/dev/null || echo "No --help flag, try dry-run"

# Verify Level 1 Unit 1 exists in the database
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: unit } = await supabase
    .from('curriculum_units')
    .select('*, curriculum_levels(*)')
    .eq('unit_number', 1)
    .single();
  
  // Find the Level 1 unit (level_number = 1)
  const { data: units } = await supabase
    .from('curriculum_units')
    .select('id, unit_number, title_en, title_ar, level_id, curriculum_levels(level_number, name_en)')
    .order('unit_number');
  
  const level1Units = units?.filter(u => u.curriculum_levels?.level_number === 1);
  console.log('Level 1 units:', level1Units?.length);
  console.log('Unit 1:', level1Units?.[0]);
}
check();
"
```

---

## STEP 2: Run the Generator for Level 1, Unit 1

```bash
# Generate ALL content for Level 1, Unit 1
node scripts/curriculum-generator/index.js --level 1 --unit 1
```

This should generate:
1. ✅ Reading A — passage + comprehension questions + vocabulary + vocab exercises
2. ✅ Reading B — passage + comprehension questions + vocabulary + vocab exercises
3. ✅ Grammar — explanation + exercises
4. ✅ Writing — task with criteria
5. ✅ Listening — script + questions
6. ✅ Speaking — topic + guiding questions
7. ✅ Irregular Verbs — verb table + exercises
8. ✅ Assessment — unit quiz covering all skills

---

## STEP 3: Verify Content in Database

After generation, query EVERY table to verify content was inserted:

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  // Get the Level 1 Unit 1 ID
  const { data: units } = await supabase
    .from('curriculum_units')
    .select('id, unit_number, title_en, level_id, curriculum_levels(level_number)')
    .order('unit_number');
  
  const unit = units?.find(u => u.curriculum_levels?.level_number === 1 && u.unit_number === 1);
  if (!unit) { console.log('❌ Unit not found!'); return; }
  
  console.log('Unit:', unit.title_en, '(ID:', unit.id, ')');
  console.log('');
  
  // Check each content type
  const tables = [
    'curriculum_readings',
    'curriculum_comprehension_questions', 
    'curriculum_vocabulary',
    'curriculum_vocabulary_exercises',
    'curriculum_grammar',
    'curriculum_grammar_exercises',
    'curriculum_writing',
    'curriculum_listening',
    'curriculum_speaking',
    'curriculum_irregular_verbs',
    'curriculum_irregular_verb_exercises',
    'curriculum_assessments'
  ];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('unit_id', unit.id);
    
    if (error) {
      console.log('❌', table, '— Error:', error.message);
    } else {
      console.log(data?.length > 0 ? '✅' : '⚠️', table, '—', data?.length || 0, 'rows');
    }
  }
}
verify();
"
```

---

## STEP 4: Export Content for Review

Create a human-readable summary file for Dr. Ali to review:

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function exportForReview() {
  // ... fetch all content for Level 1 Unit 1 ...
  // ... format as readable markdown ...
  
  let md = '# 📖 Level 1 — Unit 1: Content Review\n\n';
  md += '## ⚠️ مراجعة المحتوى — يرجى قراءة المحتوى بالكامل وإبداء الملاحظات\n\n';
  md += '---\n\n';
  
  // Add each content type with clear formatting
  // Reading A, Reading B, Grammar, Writing, Listening, Speaking, etc.
  
  fs.writeFileSync('output/REVIEW-Level1-Unit1.md', md);
  console.log('📄 Review file exported to: output/REVIEW-Level1-Unit1.md');
}
exportForReview();
"
```

The review file should include:
- Full reading passages
- All comprehension questions with answers
- All vocabulary with definitions
- Grammar explanation + exercises
- Writing task + criteria
- Listening script + questions
- Speaking topic + guiding questions
- Irregular verbs table
- Assessment quiz

---

## STEP 5: Print Cost Report

```bash
cat scripts/curriculum-generator/output/costs.json
# Also calculate: estimated cost for all 72 units based on this unit's cost
```

---

## STEP 6: Fix Any Issues

If any content type failed:
1. Check the error logs
2. Fix the generator/template
3. Re-run for just that content type: `node scripts/curriculum-generator/index.js --level 1 --unit 1 --content reading`
4. Verify again

---

## WHAT NOT TO DO

1. ❌ Do NOT generate content for any other unit — ONLY Level 1, Unit 1
2. ❌ Do NOT modify any UI files
3. ❌ Do NOT change the generation engine's core logic (unless fixing a bug)
4. ❌ Do NOT publish/activate the content — keep status as 'draft'

## GIT COMMIT

```bash
git add -A
git commit -m "feat: generate prototype content — Level 1 Unit 1 (Phase 2B)

- Generated all 8 content types for Level 1, Unit 1
- Reading A + B with comprehension and vocabulary
- Grammar explanation + exercises
- Writing task + listening script + speaking topic
- Irregular verbs + unit assessment
- Exported review file for trainer approval
- Cost report: \$X.XX for this unit (estimated \$XX for all 72 units)"

git push origin main
```

---

## AFTER THIS PROMPT

**STOP and wait.** Dr. Ali will review the content in `output/REVIEW-Level1-Unit1.md` and give feedback on:
- Content quality and accuracy
- Difficulty level appropriateness
- Cultural sensitivity
- Vocabulary selection
- Grammar topic coverage
- Exercise variety and quality

Based on his feedback, we may adjust templates before generating the rest.
