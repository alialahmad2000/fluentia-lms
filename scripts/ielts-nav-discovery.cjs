// ielts-nav-discovery.cjs
// Phase A script for PROMPT-IELTS-11: catalog IELTS routes + nav state
const fs = require('fs')
const path = require('path')

const appPath = path.resolve(__dirname, '../src/App.jsx')
const sidebarPath = path.resolve(__dirname, '../src/components/layout/Sidebar.jsx')
const navPath = path.resolve(__dirname, '../src/config/navigation.js')

const appSrc = fs.readFileSync(appPath, 'utf8')
const sidebarSrc = fs.readFileSync(sidebarPath, 'utf8')
const navSrc = fs.readFileSync(navPath, 'utf8')

console.log('=== IELTS Nav Discovery ===\n')

// A.1 — IELTS routes
const routeLines = appSrc.split('\n').filter(l => l.includes('ielts') && l.includes('Route'))
console.log(`A.1 — IELTS routes in App.jsx: ${routeLines.length}`)
routeLines.forEach(l => console.log('  ' + l.trim()))

// A.2 — Inline gate files
const pages = path.resolve(__dirname, '../src/pages/student/ielts')
function findFiles(dir) {
  const result = []
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name)
    if (f.isDirectory()) result.push(...findFiles(full))
    else if (f.name.endsWith('.jsx') || f.name.endsWith('.js')) result.push(full)
  }
  return result
}
const files = findFiles(pages)
const gated = [], ungated = []
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const hasGate = /package.*ielts|ielts.*package|hasIELTSAccess|custom_access.*ielts/.test(src)
  ;(hasGate ? gated : ungated).push(path.relative(pages, f))
}
console.log(`\nA.2 — Pages WITH gate: ${gated.length}`)
gated.forEach(f => console.log('  ✓ ' + f))
console.log(`Pages WITHOUT gate: ${ungated.length}`)
ungated.forEach(f => console.log('  ✗ ' + f))

// A.3 — utilities
console.log('\nA.3 — Utilities:')
console.log('  hasIELTSAccess:', fs.existsSync(path.resolve(__dirname, '../src/lib/packageAccess.js')) ? 'EXISTS (src/lib/packageAccess.js)' : 'MISSING')
console.log('  LockedFeature:', fs.existsSync(path.resolve(__dirname, '../src/pages/student/LockedFeature.jsx')) ? 'EXISTS' : 'MISSING')
console.log('  IELTSGuard:', fs.existsSync(path.resolve(__dirname, '../src/components/ielts/IELTSGuard.jsx')) ? 'EXISTS' : 'MISSING')

// A.4 — nav config
const hasIELTSSidebar = navSrc.includes("id: 'ielts'")
const hasRequiresPackage = navSrc.includes("requiresPackage: 'ielts'")
const sidebarFilters = sidebarSrc.includes('requiresPackage')
console.log('\nA.4 — Navigation:')
console.log('  IELTS sidebar entry:', hasIELTSSidebar ? 'EXISTS' : 'MISSING')
console.log('  requiresPackage field:', hasRequiresPackage ? 'YES' : 'NO')
console.log('  Sidebar filters by requiresPackage:', sidebarFilters ? 'YES' : 'NO')

// A.5 — mobile bar
const mobileBarLines = navSrc.match(/mobileBar:\s*\[([\s\S]*?)\]/)?.[1] || ''
const mobileBarItems = (mobileBarLines.match(/id:/g) || []).length
const ieltsInMobileBar = mobileBarLines.includes("'ielts'")
console.log('\nA.5 — Mobile bar:')
console.log('  Items:', mobileBarItems, '| IELTS in bar:', ieltsInMobileBar ? 'YES (BUG)' : 'NO (correct)')

// Summary
console.log('\n=== Summary ===')
console.log('IELTS routes total:', routeLines.length)
console.log('Routes with gate:', gated.length + '/' + files.filter(f => !f.includes('.test.')).length)
console.log('Mobile bar items:', mobileBarItems, '(IELTS NOT included:', !ieltsInMobileBar, ')')
