# Agent 2 — Prompt 01: Discovery

Before building anything, discover the project structure and vocabulary data.

## Run these commands and READ the output:

```bash
# 1. Find router and student pages
grep -r "createBrowserRouter\|Routes\|Route\|path:" src/ --include="*.jsx" --include="*.tsx" -l
find src -name "*.jsx" -path "*student*" | head -30

# 2. Find sidebar
grep -r "sidebar\|Sidebar\|SideNav\|navigation" src/ --include="*.jsx" -l | head -10

# 3. Check curriculum_vocabulary table — ACTUAL schema + sample data
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: vocab, error: e1 } = await sb.from('curriculum_vocabulary').select('*').limit(3);
  console.log('=== VOCABULARY ===');
  if (e1) { console.log('Error:', e1.message); return; }
  const { count } = await sb.from('curriculum_vocabulary').select('*', { count: 'exact', head: true });
  console.log('Total words:', count);
  if (vocab?.[0]) console.log('Columns:', Object.keys(vocab[0]));
  if (vocab?.[0]) console.log('Sample:', JSON.stringify(vocab[0], null, 2));
  const withAudio = vocab?.filter(v => v.pronunciation_url || v.audio_url);
  console.log('Has audio:', withAudio?.length, '/', vocab?.length);

  const { data: vex, error: e2 } = await sb.from('curriculum_vocabulary_exercises').select('*').limit(2);
  console.log('\n=== VOCABULARY EXERCISES ===');
  if (e2) console.log('Error:', e2.message);
  else if (vex?.[0]) console.log('Columns:', Object.keys(vex[0]));

  const { data: srs, error: e3 } = await sb.from('curriculum_vocabulary_srs').select('*').limit(1);
  console.log('\n=== SRS TABLE ===');
  if (e3) console.log('Error:', e3.message);
  else if (srs?.[0]) console.log('Columns:', Object.keys(srs[0]));

  const { data: levels } = await sb.from('curriculum_levels').select('id, level_number, name_ar, color').order('level_number');
  console.log('\n=== LEVELS ===');
  console.log(levels?.map(l => l.level_number + ': ' + l.name_ar));
}
check();
"

# 4. Check auth pattern
grep -r "useAuth\|getUser\|auth\.user\|currentUser" src/ --include="*.jsx" -l | head -5

# 5. Check existing audio components
grep -r "audio\|Audio\|playback" src/ --include="*.jsx" -l | head -10

# 6. Check dark/light mode
grep -r "dark:\|theme\|darkMode" src/ --include="*.jsx" --include="*.css" -l | head -5
```

## SAVE the output — you need exact column names for the next prompts.
## DO NOT write any page code yet. Just discover and understand.
