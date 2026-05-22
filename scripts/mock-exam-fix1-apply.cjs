// scripts/mock-exam-fix1-apply.cjs
// Applies the reveal-system migration via Supabase Management API.
const fs = require('fs');
const path = require('path');

function tokenFromMcp() {
  try {
    const f = path.resolve(__dirname, '..', '.mcp.json');
    if (!fs.existsSync(f)) return null;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return j?.mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN || null;
  } catch { return null; }
}
function tokenFromEnvFile() {
  try {
    const f = path.resolve(__dirname, '..', '.env');
    if (!fs.existsSync(f)) return null;
    const m = fs.readFileSync(f, 'utf8').match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
    return m ? m[1].trim().replace(/^"|"$/g, '') : null;
  } catch { return null; }
}
let TOKEN = process.env.SUPABASE_ACCESS_TOKEN || tokenFromEnvFile() || tokenFromMcp();
if (!TOKEN) { console.error('No SUPABASE_ACCESS_TOKEN'); process.exit(2); }
TOKEN = TOKEN.replace(/[\s\r\n]+/g, '');

const PROJECT_REF = 'nmjexpuycmqcxuxljier';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const FILES = [
  'supabase/migrations/20260522040000_mock_exam_reveal_system.sql',
];

async function runOne(file) {
  const sql = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  console.log(`\n=== ${file} (${sql.length} chars) ===`);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) { console.error(`HTTP ${res.status}:`, text); process.exit(1); }
  console.log('  OK:', text.slice(0, 200));
}

(async () => { for (const f of FILES) await runOne(f); console.log('\nApplied.'); })();
