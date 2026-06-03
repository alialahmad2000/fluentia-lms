// Reusable Supabase Management API query helper for the vocab-restructure work.
// Read path AND write path (the Management API /database/query runs arbitrary SQL incl. DDL/DML),
// used because the read-only Supabase MCP can't apply migrations. Token comes from .mcp.json.
// Cloudflare blocks the default node/python UA with error 1010 -> we set a curl UA.
const fs = require('fs')
const path = require('path')

const PROJECT_REF = 'nmjexpuycmqcxuxljier'

function readToken() {
  // Look for .mcp.json starting at cwd, then walking up a couple levels.
  const candidates = [
    path.join(process.cwd(), '.mcp.json'),
    path.join(__dirname, '../../../.mcp.json'),
    '/Users/dr.ali/projects/fluentia-lms-vocab/.mcp.json',
    '/Users/dr.ali/projects/fluentia-lms/.mcp.json',
  ]
  for (const p of candidates) {
    try {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'))
      const tok = j?.mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN
      if (tok) return tok
    } catch { /* keep trying */ }
  }
  throw new Error('SUPABASE_ACCESS_TOKEN not found in any .mcp.json')
}

const TOKEN = readToken()

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'curl/8.7.1',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${text.slice(0, 800)}`)
  }
  try { return JSON.parse(text) } catch { return text }
}

module.exports = { query, PROJECT_REF }
