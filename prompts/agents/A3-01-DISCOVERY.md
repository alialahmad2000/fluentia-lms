# Agent 3 — Prompt 01: Discovery

Before building anything, discover the project structure and irregular verbs data.

## Run these commands and READ the output:

```bash
# 1. Find router and student pages
grep -r "createBrowserRouter\|Routes\|Route\|path:" src/ --include="*.jsx" --include="*.tsx" -l
find src -name "*.jsx" -path "*student*" | head -30

# 2. Find sidebar
grep -r "sidebar\|Sidebar\|SideNav\|navigation" src/ --include="*.jsx" -l | head -10

# 3. Check irregular verbs table — ACTUAL schema + sample data
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: verbs, error: e1 } = await sb.from('curriculum_irregular_verbs').select('*').limit(5);
  console.log('=== IRREGULAR VERBS ===');
  if (e1) { console.log('Error:', e1.message); return; }
  const { count } = await sb.from('curriculum_irregular_verbs').select('*', { count: 'exact', head: true });
  console.log('Total verbs:', count);
  if (verbs?.[0]) console.log('Columns:', Object.keys(verbs[0]));
  if (verbs?.[0]) console.log('Sample:', JSON.stringify(verbs[0], null, 2));
  if (verbs?.[1]) console.log('Sample 2:', JSON.stringify(verbs[1], null, 2));
  const audioCols = Object.keys(verbs[0]).filter(k => k.includes('audio') || k.includes('url'));
  console.log('Audio-related columns:', audioCols);

  const { data: ex, error: e2 } = await sb.from('curriculum_irregular_verb_exercises').select('*').limit(2);
  console.log('\n=== VERB EXERCISES ===');
  if (e2) console.log('Error:', e2.message);
  else if (ex?.[0]) console.log('Columns:', Object.keys(ex[0]));

  const { data: levels } = await sb.from('curriculum_levels').select('id, level_number, name_ar, color').order('level_number');
  console.log('\n=== LEVELS ===');
  for (const level of levels || []) {
    const { count } = await sb.from('curriculum_irregular_verbs').select('*', { count: 'exact', head: true }).eq('level_id', level.id);
    console.log('Level', level.level_number, level.name_ar, ':', count, 'verbs');
  }
}
check();
"

# 4. Check auth pattern
grep -r "useAuth\|getUser\|auth\.user\|currentUser" src/ --include="*.jsx" -l | head -5

# 5. Check dark/light mode
grep -r "dark:\|theme\|darkMode" src/ --include="*.jsx" --include="*.css" -l | head -5
```

## SAVE the output — you need exact column names.
## DO NOT write any code yet.
