// Create (or upgrade) a Fluentia `coordinator` account (class-scheduling staff).
// Mirrors create-agent.cjs. Usage:
//   node scripts/cs-ops/create-coordinator.cjs <email> "<Full Name>" <tempPass> [--no-force-change]
// Usage: node /tmp/create-coordinator.cjs <email> "<Full Name>" <tempPassword> [--no-force-change]
const fs = require('fs'); const path = require('path');
const REPO = require('path').resolve(__dirname, '..', '..');
const REF = 'nmjexpuycmqcxuxljier';
const SUPA_URL = `https://${REF}.supabase.co`;
const MGMT = `https://api.supabase.com/v1/projects/${REF}/database/query`;
function mgmtToken() {
  const mcp = JSON.parse(fs.readFileSync(path.join(REPO, '.mcp.json'), 'utf8'));
  return (mcp.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN || '').trim().replace(/[\r\n]/g, '');
}
async function sql(token, query) {
  const r = await fetch(MGMT, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (r.status >= 300) throw new Error('SQL ' + r.status + ': ' + t.slice(0, 300));
  return j;
}
(async () => {
  const args = process.argv.slice(2).filter(a => a !== '--no-force-change');
  const noForce = process.argv.includes('--no-force-change');
  const [email, fullName, tempPassword] = args;
  if (!email || !fullName || !tempPassword) { console.error('usage: <email> "<name>" <pass> [--no-force-change]'); process.exit(1); }
  const token = mgmtToken();
  const keys = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const service = (keys.find((k) => k.name === 'service_role') || {}).api_key;
  if (!service) throw new Error('no service key');
  const H = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };
  const cr = await fetch(`${SUPA_URL}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email, password: tempPassword, email_confirm: true, user_metadata: { full_name: fullName } }) });
  const cu = await cr.json(); let uid = cu.id;
  if (!uid) {
    const rows = await sql(token, `select id from auth.users where email = '${email.replace(/'/g, "''")}';`);
    uid = Array.isArray(rows) && rows[0] && rows[0].id;
  }
  if (!uid) throw new Error('could not create/find user: ' + JSON.stringify(cu).slice(0, 200));
  await sql(token, `
    insert into public.profiles (id, full_name, role, ui_language, must_change_password)
    values ('${uid}', '${fullName.replace(/'/g, "''")}', 'coordinator', 'ar', ${noForce ? 'false' : 'true'})
    on conflict (id) do update set role = 'coordinator', must_change_password = ${noForce ? 'false' : 'true'};
  `);
  const prof = await sql(token, `select role::text, full_name, must_change_password from public.profiles where id = '${uid}';`);
  console.log('coordinator ready', uid, JSON.stringify(prof));
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
