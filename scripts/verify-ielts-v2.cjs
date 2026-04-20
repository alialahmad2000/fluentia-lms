// Quick sanity: check all V2 page files exist and export default.
const fs = require('fs')
const path = require('path')
const base = path.join('src', 'pages', 'student', 'ielts-v2')
const files = [
  '_layout/IELTSMasterclassLayout.jsx',
  '_layout/PlaceholderPage.jsx',
  '_layout/IELTSV2Gate.jsx',
  'Home.jsx',
  'Diagnostic.jsx',
  'Reading.jsx',
  'Listening.jsx',
  'Writing.jsx',
  'Speaking.jsx',
  'Journey.jsx',
  'Errors.jsx',
  'Mock.jsx',
  'Trainer.jsx',
  'Readiness.jsx',
]
let ok = 0
const missing = []
for (const f of files) {
  const p = path.join(base, f)
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf8')
    if (/export default/.test(c)) ok++
    else missing.push(`${p} (no default export)`)
  } else {
    missing.push(`${p} (file missing)`)
  }
}
console.log(`Files OK: ${ok}/${files.length}`)
if (missing.length) {
  console.log('MISSING:')
  missing.forEach(m => console.log('  - ' + m))
  process.exit(1)
}
console.log('✓ Scaffold complete.')
