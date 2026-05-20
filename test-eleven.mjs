// Smoke test for the ElevenLabs subscription endpoint.
// Reads ELEVENLABS_API_KEY from .env (or process env). Never hardcode the key.

import fs from 'node:fs'

function loadEnv() {
  const env = {}
  try {
    fs.readFileSync('.env', 'utf8').split('\n').forEach((line) => {
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

const env = loadEnv()
const rawKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY
if (!rawKey) {
  console.error('FAILED: no ELEVENLABS_API_KEY in process.env or .env')
  process.exit(1)
}
const key = rawKey.replace(/[\s\r\n]+/g, '')

console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS)
console.log('Node version:', process.version)
console.log('Testing ElevenLabs from Node.js...')

try {
  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': key },
  })
  const data = await res.json()
  console.log('HTTP Status:', res.status)
  if (res.status !== 200) {
    console.log('Body:', JSON.stringify(data, null, 2).slice(0, 400))
    process.exit(2)
  }
  console.log('Tier:', data.tier)
  console.log('Character limit:', data.character_limit?.toLocaleString())
  console.log('Characters used:', data.character_count?.toLocaleString())
  console.log('Remaining:', (data.character_limit - data.character_count)?.toLocaleString())
  console.log('SUCCESS!')
} catch (e) {
  console.error('FAILED:', e.message)
  console.error('Code:', e.cause?.code)
  process.exit(3)
}
