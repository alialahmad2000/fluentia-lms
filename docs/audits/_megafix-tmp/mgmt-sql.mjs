// Run SQL against PROD via the Supabase Management API using the access token
// from .mcp.json. Usage: node docs/audits/_megafix-tmp/mgmt-sql.mjs '<SQL>'
import { readFileSync } from 'fs'

const REF = 'nmjexpuycmqcxuxljier'
const mcp = JSON.parse(readFileSync('.mcp.json', 'utf8'))
// token may live in different shapes; search recursively
function findToken(o) {
  if (!o || typeof o !== 'object') return null
  for (const [k, v] of Object.entries(o)) {
    if (/SUPABASE_ACCESS_TOKEN/i.test(k) && typeof v === 'string') return v
    if (typeof v === 'object') { const r = findToken(v); if (r) return r }
  }
  return null
}
const token = findToken(mcp)
if (!token) { console.error('no SUPABASE_ACCESS_TOKEN in .mcp.json'); process.exit(2) }

const sql = process.argv[2]
if (!sql) { console.error('usage: mgmt-sql.mjs "<SQL>"'); process.exit(2) }

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})
const text = await res.text()
console.log('HTTP', res.status)
console.log(text)
process.exit(res.ok ? 0 : 1)
