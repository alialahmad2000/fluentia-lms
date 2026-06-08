#!/usr/bin/env node
// Apply a .sql file to the Fluentia DB via the Supabase Management API.
// Usage: node apply_sql.mjs /tmp/chapter.sql
import { readFileSync } from 'node:fs';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || (readFileSync('.mcp.json', 'utf8').match(/sbp_[A-Za-z0-9]+/) || [])[0];
const REF = 'nmjexpuycmqcxuxljier';
if (!TOKEN) { console.error('no SUPABASE_ACCESS_TOKEN (env or .mcp.json)'); process.exit(1); }
const file = process.argv[2];
if (!file) { console.error('usage: node apply_sql.mjs <file.sql>'); process.exit(1); }
const sql = readFileSync(file, 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
if (!res.ok) { console.error('FAILED', res.status, text); process.exit(1); }
console.log('OK', res.status, text.slice(0, 200));
