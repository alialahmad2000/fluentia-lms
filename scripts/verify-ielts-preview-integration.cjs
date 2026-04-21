const fs = require('fs');

const checks = [];
const check = (path, tests) => {
  if (!fs.existsSync(path)) {
    checks.push([false, `File missing: ${path}`]);
    return;
  }
  const content = fs.readFileSync(path, 'utf8');
  for (const [re, name] of tests) {
    checks.push([re.test(content), `${path} → ${name}`]);
  }
};

// New preview page
check('src/pages/admin/IELTSPreview.jsx', [
  [/IELTSPreviewProvider/, 'uses provider'],
  [/PhaseTimeline/, 'renders timeline'],
  [/SacredPageCard/, 'renders cards'],
  [/activePageId/, 'has inline-render state'],
  [/InlinePreviewBanner/, 'shows preview banner'],
  [/getPageById/, 'page lookup'],
]);

// Data module
check('src/pages/admin/ielts-preview/ieltsSacredPages.js', [
  [/SACRED_PAGES/, 'SACRED_PAGES export'],
  [/PHASES/, 'PHASES export'],
  [/Component:\s*Home/, 'imports Home component'],
  [/Component:\s*Readiness/, 'imports Readiness component'],
]);

// Count pages & phases
const data = fs.readFileSync('src/pages/admin/ielts-preview/ieltsSacredPages.js', 'utf8');
const pageCount = (data.match(/\{\s*id:\s*'[^']+',\s*phase:/g) || []).length;
const phaseCount = (data.match(/\{\s*id:\s*'[^']+',\s*label:\s*'Phase/g) || []).length;
checks.push([pageCount === 11, `SACRED_PAGES count = 11 (got ${pageCount})`]);
checks.push([phaseCount === 7, `PHASES count = 7 (got ${phaseCount})`]);

// Supporting components
check('src/pages/admin/ielts-preview/PhaseTimeline.jsx', [[/PHASES\.map/, 'iterates phases']]);
check('src/pages/admin/ielts-preview/SacredPageCard.jsx', [[/phase\.color/, 'uses phase color']]);
check('src/pages/admin/ielts-preview/IELTSPreviewContext.jsx', [[/previewMode:\s*true/, 'sets preview mode']]);

// Flag gate patched
check('src/pages/student/ielts-v2/_layout/IELTSV2Gate.jsx', [
  [/loading|undefined|initialized/, 'waits for auth resolution'],
]);

// Flag library defensive
check('src/lib/ieltsV2Flag.js', [
  [/if\s*\(\s*!profile\s*\)\s*return\s*false/, 'guards null profile'],
]);

// IELTSManagement tab removed
const ielts_mgmt = fs.readFileSync('src/pages/admin/curriculum/IELTSManagement.jsx', 'utf8');
checks.push([
  !/id:\s*['"]masterclass-v2['"]/.test(ielts_mgmt),
  'IELTSManagement: masterclass-v2 tab removed',
]);

let pass = 0, fail = 0;
for (const [ok, name] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
