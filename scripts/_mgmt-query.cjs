#!/usr/bin/env node
// Tiny helper: run SQL against the Supabase Management API (write path) when the
// read-only Supabase MCP isn't loaded (e.g. session started outside the project dir).
// Usage:  node scripts/_mgmt-query.cjs "select 1;"
//         echo "select 1;" | node scripts/_mgmt-query.cjs -
// Token is read from .mcp.json (SUPABASE_ACCESS_TOKEN / sbp_… ).
const fs = require('fs')
const path = require('path')

const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'

function readToken() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('No sbp_ token found in .mcp.json')
  return m[0]
}

async function main() {
  let sql = process.argv[2]
  if (sql === '-' || !sql) sql = fs.readFileSync(0, 'utf8')
  const token = readToken()
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'curl/8.4.0', // Cloudflare blocks default UAs with 1010
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`HTTP ${res.status}`)
    console.error(text)
    process.exit(1)
  }
  // Pretty-print JSON results
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text)
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
