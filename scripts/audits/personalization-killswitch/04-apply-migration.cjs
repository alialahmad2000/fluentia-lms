#!/usr/bin/env node
// One-shot migration applier using the Supabase Management API.
// Requires SUPABASE_ACCESS_TOKEN (sbp_... personal access token) — read from
// either the environment, .mcp.json, or a SUPABASE_ACCESS_TOKEN .env entry.

const fs = require('fs')
const path = require('path')
const https = require('https')

function loadEnv() {
  const env = {}
  try {
    fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach((line) => {
      const idx = line.indexOf('=')
      if (idx <= 0) return
      let v = line.slice(idx + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      v = v.replace(/\\n$/, '')
      env[line.slice(0, idx).trim()] = v
    })
  } catch {}
  return env
}

function tokenFromMcp() {
  try {
    const j = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../.mcp.json'), 'utf8'))
    return j?.mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN || null
  } catch {
    return null
  }
}

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL
const ref = SUPABASE_URL?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
if (!ref) { console.error('Cannot parse project ref'); process.exit(1) }

let TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || tokenFromMcp()
if (!TOKEN) { console.error('No SUPABASE_ACCESS_TOKEN — set in env, .env, or .mcp.json'); process.exit(2) }
// Strip CR/LF/whitespace (Windows-copied dotfile artifact)
TOKEN = TOKEN.replace(/[\s\r\n]+/g, '')

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const req = https.request({
      method: 'POST',
      host: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let buf = ''
      res.on('data', (c) => { buf += c })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)) } catch { resolve(buf) }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${buf}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

;(async () => {
  const sqlPath = path.resolve(__dirname, '../../../supabase/migrations/20260519100000_app_config_personalization_killswitch.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  console.log(`Applying ${path.basename(sqlPath)} via Management API…`)
  const res = await runSql(sql)
  console.log('Result:', JSON.stringify(res).slice(0, 200))

  console.log('\nVerify seeded value:')
  const v = await runSql("SELECT key, value, description FROM public.app_config WHERE key='personalization_enabled'")
  console.log(JSON.stringify(v, null, 2))
})().catch((e) => { console.error('ERROR:', e.message); process.exit(3) })
