const fs = require('fs');
const checks = [];
const check = (path, tests) => {
  if (!fs.existsSync(path)) { checks.push([false, `Missing: ${path}`]); return; }
  const c = fs.readFileSync(path, 'utf8');
  for (const [re, name] of tests) checks.push([re.test(c), `${path} → ${name}`]);
};

check('src/design-system/masterclass/IELTSSunsetBackground.jsx', [
  [/export default/, 'default export'],
  [/sunset-aurora-1/, 'aurora layer 1'],
  [/sunset-aurora-2/, 'aurora layer 2'],
  [/sunset-aurora-3/, 'aurora layer 3'],
  [/sunset-pattern/, 'Islamic pattern layer'],
  [/sunset-dust/, 'dust particles'],
  [/sunset-flare/, 'lens flares'],
  [/sunset-vignette/, 'vignette'],
  [/sunset-grain/, 'grain texture'],
  [/intensity\s*=/, 'intensity prop'],
]);

check('src/design-system/masterclass/IELTSSunsetBackground.css', [
  [/@keyframes sunset-drift-1/, 'drift 1 keyframes'],
  [/@keyframes sunset-drift-2/, 'drift 2 keyframes'],
  [/@keyframes sunset-drift-3/, 'drift 3 keyframes'],
  [/prefers-reduced-motion/, 'reduced-motion support'],
  [/pointer-events:\s*none/, 'no click blocking'],
  [/#f97316/, 'sunset orange color'],
  [/#fbbf24/, 'sunset amber color'],
  [/#1a0f08/, 'sunset base deep'],
]);

check('src/pages/student/ielts-v2/_layout/IELTSMasterclassLayout.jsx', [
  [/IELTSSunsetBackground/, 'bg component imported + used'],
  [/sunset-base-deep|sunset-base-mid/, 'sunset tokens in use'],
]);

check('src/pages/admin/IELTSPreview.jsx', [
  [/IELTSSunsetBackground/, 'bg component in admin preview'],
  [/intensity=.subtle./, 'subtle variant for admin'],
  [/sunset-/, 'sunset tokens referenced'],
]);

check('src/design-system/themes.css', [
  [/--sunset-base-deep/, 'tokens registered'],
  [/--sunset-amber/, 'amber token'],
  [/--sunset-orange/, 'orange token'],
]);

let pass = 0, fail = 0;
for (const [ok, name] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
