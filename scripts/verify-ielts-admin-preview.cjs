const fs = require('fs')
const panel = 'src/pages/admin/curriculum/components/IELTSMasterclassV2Preview.jsx'

if (!fs.existsSync(panel)) {
  console.log(`✗ Panel file missing: ${panel}`)
  process.exit(1)
}
const c = fs.readFileSync(panel, 'utf8')
const checks = [
  [/export default/, 'default export'],
  [/SACRED_PAGES/, 'SACRED_PAGES array'],
  [/\/student\/ielts-v2/, 'V2 paths present'],
  [/ielts-v2=1/, 'flag query param present'],
  [/target="_blank"/, 'new tab'],
  [/noopener/, 'noopener'],
]
let ok = 0
for (const [re, name] of checks) {
  if (re.test(c)) { console.log(`  ✓ ${name}`); ok++ }
  else            { console.log(`  ✗ ${name} MISSING`) }
}
if (ok < checks.length) process.exit(1)

const count = (c.match(/id:\s*'/g) || []).length
console.log(`  → ${count} sacred pages`)
if (count !== 11) { console.log(`✗ Expected 11 pages, got ${count}`); process.exit(1) }

console.log('\n✓ Admin preview panel verified.')
