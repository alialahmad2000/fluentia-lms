const fs = require('fs');
const path = require('path');

// Check panel
const panel = 'src/pages/admin/curriculum/components/IELTSMasterclassV2Preview.jsx';
if (!fs.existsSync(panel)) { console.log(`✗ Panel missing: ${panel}`); process.exit(1); }
const c = fs.readFileSync(panel, 'utf8');
console.log('✓ Panel file exists');

const checks = [
  [/export default/, 'default export'],
  [/SACRED_PAGES/, 'SACRED_PAGES array'],
  [/\/student\/ielts-v2/, 'V2 paths present'],
  [/ielts-v2=1/, 'flag query param present'],
  [/target="_blank"/, 'new tab'],
  [/noopener/, 'noopener'],
];
let ok = 0;
for (const [re, name] of checks) {
  if (re.test(c)) { console.log(`  ✓ ${name}`); ok++; }
  else            { console.log(`  ✗ ${name} MISSING`); }
}
if (ok < checks.length) process.exit(1);

const count = (c.match(/id:\s*'/g) || []).length;
console.log(`  → ${count} sacred pages`);
if (count !== 11) { console.log(`✗ Expected 11 pages, got ${count}`); process.exit(1); }
console.log('✓ Panel checks passed');

// Check parent
const parent = 'src/pages/admin/curriculum/IELTSManagement.jsx';
if (!fs.existsSync(parent)) { console.log(`✗ Parent missing`); process.exit(1); }
const p = fs.readFileSync(parent, 'utf8');
console.log('✓ Parent file exists');

// Import present
if (!/IELTSMasterclassV2Preview/.test(p)) { console.log('✗ Import not found in parent'); process.exit(1); }
console.log('✓ Import found in parent');

// Label is correct (first char of the label must be م = U+0645)
const labelMatch = p.match(/label:\s*['"]([^'"]*V2[^'"]*)['"]/);
if (!labelMatch) { console.log('✗ V2 label not found'); process.exit(1); }
const label = labelMatch[1];
const firstCharCode = label.codePointAt(0);
console.log(`  Label: '${label}'`);
console.log(`  First char code: U+${firstCharCode.toString(16).padStart(4,'0')}`);

if (firstCharCode === 0x0645) {
  console.log('✓ Label starts with م (correct, not reversed)');
} else if (firstCharCode === 0x0629) {
  console.log('✗ Label starts with ة — REVERSED, fix it');
  process.exit(1);
} else {
  console.log(`? Label starts with unexpected char: U+${firstCharCode.toString(16)}`);
}

// Check that the tab id appears in the rendering block
const idMatch = p.match(/(?:key|id):\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"][^'"]*V2/);
if (idMatch) {
  const id = idMatch[1];
  console.log(`  Tab id: '${id}'`);
  const renderRegex = new RegExp(`(activeTab|currentTab|selectedTab)\\s*===\\s*['"]${id}['"]|case\\s+['"]${id}['"]`, 'g');
  if (renderRegex.test(p)) {
    console.log(`✓ Tab id '${id}' is referenced in rendering logic`);
  } else {
    console.log(`✗ Tab id '${id}' NOT referenced in rendering logic — tab click does nothing`);
    process.exit(1);
  }
} else {
  console.log('✗ Could not extract tab id from TABS array');
  process.exit(1);
}

console.log('\n✓ All checks passed.');
