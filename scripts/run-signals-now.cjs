const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('Invoking detect-student-signals...');
  const { data, error } = await sb.functions.invoke('detect-student-signals', { body: {} });
  if (error) { console.error('ERR:', error); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
})();
