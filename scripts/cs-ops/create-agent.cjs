#!/usr/bin/env node
/*
 * Fluentia CS Ops — create (or upgrade) a customer-service `agent` account.
 *
 * Usage:
 *   node scripts/cs-ops/create-agent.cjs <email> "<Full Name>" [tempPassword]
 *
 * Examples (fill in the real emails — DO NOT commit real credentials):
 *   node scripts/cs-ops/create-agent.cjs hajar@example.com  "هاجر"  "Temp#2026"
 *   node scripts/cs-ops/create-agent.cjs manal@example.com  "منال"  "Temp#2026"
 *
 * What it does:
 *  1. Creates a confirmed auth user (or finds the existing one by email).
 *  2. Upserts their public.profiles row with role='agent' + must_change_password=true
 *     (so they set their own password on first login via the app's ForcePasswordChange flow).
 *  3. Prints the email + temp password to share with them.
 *
 * Auth: uses the project's service_role key, fetched live from the Supabase
 * Management API via the access token in .mcp.json (same path the migrations use).
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const REF = 'nmjexpuycmqcxuxljier';
const SUPA_URL = `https://${REF}.supabase.co`;
const MGMT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

function mgmtToken() {
  const mcp = JSON.parse(fs.readFileSync(path.join(REPO, '.mcp.json'), 'utf8'));
  return (mcp.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN || '').trim().replace(/[\r\n]/g, '');
}

async function sql(token, query) {
  const r = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (r.status >= 300) throw new Error('SQL ' + r.status + ': ' + t.slice(0, 300));
  return j;
}

async function main() {
  const [email, fullName, tempPassword = 'Fluentia#' + '2026'] = process.argv.slice(2);
  if (!email || !fullName) {
    console.error('Usage: node scripts/cs-ops/create-agent.cjs <email> "<Full Name>" [tempPassword]');
    process.exit(1);
  }
  const token = mgmtToken();

  // service_role key (for the GoTrue admin API)
  const keys = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  const service = (keys.find((k) => k.name === 'service_role') || {}).api_key;
  if (!service) throw new Error('could not resolve service_role key');
  const H = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };

  // 1. create or find the auth user
  const cr = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ email, password: tempPassword, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
  const cu = await cr.json();
  let uid = cu.id;
  if (!uid) {
    const rows = await sql(token, `select id from auth.users where email = '${email.replace(/'/g, "''")}';`);
    uid = Array.isArray(rows) && rows[0] && rows[0].id;
  }
  if (!uid) throw new Error('could not create or find user: ' + JSON.stringify(cu).slice(0, 200));

  // 2. upsert profile as agent + force password change on first login
  await sql(token, `
    insert into public.profiles (id, full_name, role, ui_language, must_change_password)
    values ('${uid}', '${fullName.replace(/'/g, "''")}', 'agent', 'ar', true)
    on conflict (id) do update set role = 'agent', must_change_password = true;
  `);
  const prof = await sql(token, `select role::text, full_name, must_change_password from public.profiles where id = '${uid}';`);

  console.log('✅ agent account ready');
  console.log('   uid:        ', uid);
  console.log('   email:      ', email);
  console.log('   temp passwd:', tempPassword, '(they must change it on first login)');
  console.log('   profile:    ', JSON.stringify(prof));
  console.log('\nShare the email + temp password with them; first login forces a password change.');
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
