// Apply a .sql migration file via the Supabase Management API write path.
// Usage: node apply-migration.cjs <path-to-sql>
const fs = require('fs')
const { query } = require('./_db.cjs')

async function main() {
  const file = process.argv[2]
  if (!file) { console.error('usage: node apply-migration.cjs <sql-file>'); process.exit(1) }
  const sql = fs.readFileSync(file, 'utf8')
  console.log(`Applying ${file} (${sql.length} bytes)...`)
  const res = await query(sql)
  console.log('OK')
  if (Array.isArray(res) && res.length) console.log(JSON.stringify(res).slice(0, 400))
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
