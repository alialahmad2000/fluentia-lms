# Agent 1 — Prompt 01: Discovery

Before building anything, discover the existing project structure.

## Run these commands and READ the output carefully:

```bash
# 1. Find the router / routes configuration
grep -r "createBrowserRouter\|Routes\|Route\|path:" src/ --include="*.jsx" --include="*.tsx" -l
cat src/App.jsx 2>/dev/null | head -100
find src -name "*.jsx" -path "*route*" -o -name "*.jsx" -path "*Router*" | head -10

# 2. Find existing student pages — understand the folder structure
find src -name "*.jsx" -path "*student*" | head -30
ls src/pages/student/ 2>/dev/null

# 3. Find the sidebar / navigation component
grep -r "sidebar\|Sidebar\|SideNav\|navigation" src/ --include="*.jsx" -l | head -10
grep -r "المنهج\|curriculum\|الرئيسية\|dashboard" src/ --include="*.jsx" -l | head -10

# 4. Check curriculum DB tables — ACTUAL schema
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: levels, error: e1 } = await sb.from('curriculum_levels').select('*').order('level_number');
  console.log('=== LEVELS ===');
  console.log('Count:', levels?.length);
  if (levels?.[0]) console.log('Columns:', Object.keys(levels[0]));
  if (levels?.[0]) console.log('Sample:', JSON.stringify(levels[0], null, 2));

  const { data: units, error: e2 } = await sb.from('curriculum_units').select('*').limit(2);
  console.log('\n=== UNITS ===');
  const { count } = await sb.from('curriculum_units').select('*', { count: 'exact', head: true });
  console.log('Total units:', count);
  if (units?.[0]) console.log('Columns:', Object.keys(units[0]));
  if (units?.[0]) console.log('Sample:', JSON.stringify(units[0], null, 2));

  const { data: prog, error: e3 } = await sb.from('student_curriculum_progress').select('*').limit(1);
  console.log('\n=== PROGRESS ===');
  if (e3) console.log('Error (table may not exist):', e3.message);
  else {
    console.log('Table exists');
    if (prog?.[0]) console.log('Columns:', Object.keys(prog[0]));
  }
}
check();
"

# 5. Check how existing pages get user data (auth pattern)
grep -r "useAuth\|getUser\|auth\.user\|currentUser\|user\.id" src/ --include="*.jsx" -l | head -10
```

## SAVE the output — you'll need it for the next prompts.

Key things to note:
- Exact column names in `curriculum_levels` and `curriculum_units`
- How routes are structured (nested? flat? layout wrappers?)
- How the sidebar is configured (array? config file? hardcoded?)
- How other student pages get the current user
- How dark/light mode is handled (CSS variables? Tailwind dark:? custom?)

## DO NOT write any page code yet. Just discover and understand.
