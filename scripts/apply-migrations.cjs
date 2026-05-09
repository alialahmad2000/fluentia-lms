// Apply the two new universal-attempts migrations directly
'use strict'
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DB = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
}

const MIGRATIONS = [
  '20260509120000_universal_attempts_schema.sql',
  '20260509130000_heal_phantom_submissions.sql',
]

async function main() {
  const client = new Client(DB)
  await client.connect()
  console.log('Connected.\n')

  for (const file of MIGRATIONS) {
    const p = path.join(__dirname, '..', 'supabase', 'migrations', file)
    const sql = fs.readFileSync(p, 'utf8')
    console.log(`Applying ${file}...`)
    try {
      await client.query(sql)
      console.log(`  ✅ ${file} applied\n`)
    } catch (e) {
      console.error(`  ❌ ${file} failed: ${e.message}\n`)
      await client.end()
      process.exit(1)
    }
  }

  console.log('All migrations applied.')
  await client.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
