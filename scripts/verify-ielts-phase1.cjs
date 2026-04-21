const fs = require('fs');
const checks = [];
const check = (path, tests) => {
  if (!fs.existsSync(path)) { checks.push([false, `Missing: ${path}`]); return; }
  const c = fs.readFileSync(path, 'utf8');
  for (const [re, name] of tests) checks.push([re.test(c), `${path} → ${name}`]);
};

check('src/pages/student/ielts-v2/_helpers/weekPhase.js', [
  [/IELTS_PHASES/, 'phases export'],
  [/getPhaseForWeek/, 'phase lookup'],
  [/بناء المهارات|التكثيف|الجاهزية/, 'Arabic phase titles'],
]);

check('src/pages/student/ielts-v2/_helpers/todayFocus.js', [
  [/deriveTodayFocus/, 'focus deriver'],
  [/STARTER_DAY/, 'zero-state fallback'],
]);

check('src/pages/student/ielts-v2/_helpers/resolveStudentId.js', [
  [/useStudentId/, 'hook export'],
  [/previewMode/, 'preview handling'],
]);

check('src/pages/student/ielts-v2/Home.jsx', [
  [/useAdaptivePlan/, 'plan hook'],
  [/useLatestResult/, 'result hook'],
  [/useSkillProgress/, 'skill hook'],
  [/BandDisplay/, 'band component'],
  [/TrainerPresence/, 'trainer presence'],
  [/deriveTodayFocus/, 'today focus used'],
  [/generatePlan|fallback/, 'fallback plan'],
  [/sunset-/, 'sunset palette'],
]);
const homeContent = fs.readFileSync('src/pages/student/ielts-v2/Home.jsx', 'utf8');
checks.push([!/PlaceholderPage/.test(homeContent), 'Home: PlaceholderPage removed']);

check('src/pages/student/ielts-v2/Journey.jsx', [
  [/useAdaptivePlan/, 'plan hook'],
  [/useMockAttempts/, 'mock hook'],
  [/ExamCountdown/, 'countdown component'],
  [/12.*week|الأسابيع|١٢ أسبوع/, '12 weeks render'],
  [/IELTS_PHASES/, 'phases used'],
  [/sunset-/, 'sunset palette'],
]);
const journeyContent = fs.readFileSync('src/pages/student/ielts-v2/Journey.jsx', 'utf8');
checks.push([!/PlaceholderPage/.test(journeyContent), 'Journey: PlaceholderPage removed']);

let pass = 0, fail = 0;
for (const [ok, name] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
