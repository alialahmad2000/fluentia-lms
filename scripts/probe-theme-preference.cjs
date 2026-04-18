const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: samples } = await sb.from('profiles')
    .select('id, role, theme_preference')
    .limit(100);

  const byRole = {};
  (samples || []).forEach(p => {
    byRole[p.role] = byRole[p.role] || {};
    const v = p.theme_preference || '(null)';
    byRole[p.role][v] = (byRole[p.role][v] || 0) + 1;
  });

  console.log('=== theme_preference by role ===');
  console.log(JSON.stringify(byRole, null, 2));

  const { data: check, error: checkErr } = await sb.from('profiles')
    .select('trainer_theme_preference')
    .limit(1);
  console.log('\ntrainer_theme_preference exists:', check !== null && !checkErr);
})();
