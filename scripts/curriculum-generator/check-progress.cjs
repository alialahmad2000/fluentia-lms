require('dotenv').config();
const fs = require('fs');
const path = require('path');

const progressFile = path.join(__dirname, 'output', 'progress.json');
const costsFile = path.join(__dirname, 'output', 'costs.json');

// Content types per unit
const CONTENT_TYPES = ['reading_a', 'reading_b', 'grammar', 'writing', 'listening', 'speaking', 'irregular_verbs', 'assessment'];
const TOTAL_LEVELS = 6; // 0-5
const UNITS_PER_LEVEL = 12;
const ITEMS_PER_UNIT = CONTENT_TYPES.length; // 8
const TOTAL_ITEMS = TOTAL_LEVELS * UNITS_PER_LEVEL * ITEMS_PER_UNIT; // 576

const LEVEL_NAMES = {
  0: { ar: 'تأسيس', en: 'Foundation', cefr: 'Pre-A1' },
  1: { ar: 'أساسيات', en: 'Basics', cefr: 'A1' },
  2: { ar: 'تطوير', en: 'Development', cefr: 'A2' },
  3: { ar: 'طلاقة', en: 'Fluency', cefr: 'B1' },
  4: { ar: 'تمكّن', en: 'Mastery', cefr: 'B2' },
  5: { ar: 'احتراف', en: 'Proficiency', cefr: 'C1' }
};

function checkProgress() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║           📊 FLUENTIA CONTENT GENERATION PROGRESS       ║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log('');

  if (!fs.existsSync(progressFile)) {
    console.log('  ❌ No progress file found. Run the generator first.');
    return;
  }

  const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));

  let totalDone = 0;
  let totalFailed = 0;
  let totalPending = 0;

  for (let level = 0; level <= 5; level++) {
    let levelDone = 0;
    let levelFailed = 0;
    let levelPending = 0;

    for (let unit = 1; unit <= 12; unit++) {
      const key = `level_${level}_unit_${unit}`;
      const unitData = progress.units?.[key] || {};

      for (const type of CONTENT_TYPES) {
        const status = unitData[type];
        if (status === 'done') { levelDone++; totalDone++; }
        else if (status && status.startsWith('failed')) { levelFailed++; totalFailed++; }
        else { levelPending++; totalPending++; }
      }
    }

    const levelTotal = UNITS_PER_LEVEL * ITEMS_PER_UNIT;
    const levelPercent = Math.round((levelDone / levelTotal) * 100);
    const barLength = 30;
    const filled = Math.round((levelDone / levelTotal) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    const info = LEVEL_NAMES[level];
    const status = levelPercent === 100 ? '✅' : levelPercent > 0 ? '🔄' : '⏳';

    console.log(`  ${status} Level ${level} — ${info.ar} (${info.cefr})`);
    console.log(`     [${bar}] ${levelPercent}%  (${levelDone}/${levelTotal})${levelFailed > 0 ? `  ⚠️ ${levelFailed} failed` : ''}`);
    console.log('');
  }

  // Overall
  const overallPercent = Math.round((totalDone / TOTAL_ITEMS) * 100);
  const overallBar = '█'.repeat(Math.round((totalDone / TOTAL_ITEMS) * 40)) + '░'.repeat(40 - Math.round((totalDone / TOTAL_ITEMS) * 40));

  console.log('  ─────────────────────────────────────────────────────────');
  console.log(`  📈 OVERALL: [${overallBar}] ${overallPercent}%`);
  console.log(`     ✅ Done: ${totalDone}  ⚠️ Failed: ${totalFailed}  ⏳ Pending: ${totalPending}  📦 Total: ${TOTAL_ITEMS}`);
  console.log('');

  // Cost report
  if (fs.existsSync(costsFile)) {
    try {
      const costs = JSON.parse(fs.readFileSync(costsFile, 'utf8'));
      const totalCost = costs.total_cost_usd || 0;
      const costPerItem = totalDone > 0 ? (totalCost / totalDone) : 0;
      const estimatedTotal = costPerItem * TOTAL_ITEMS;

      console.log('  💰 COST REPORT');
      console.log(`     Spent so far: $${totalCost.toFixed(2)} (${(totalCost * 3.75).toFixed(0)} SAR)`);
      console.log(`     Per item: $${costPerItem.toFixed(4)}`);
      console.log(`     Estimated total (576 items): $${estimatedTotal.toFixed(2)} (${(estimatedTotal * 3.75).toFixed(0)} SAR)`);
      console.log('');
    } catch (e) {
      console.log('  💰 Cost file exists but could not be parsed.');
      console.log('');
    }
  }

  // Time estimate
  if (totalDone > 0 && totalPending > 0) {
    const avgTimePerItem = 15; // ~15 seconds average per API call
    const remainingMinutes = Math.round((totalPending * avgTimePerItem) / 60);
    console.log(`  ⏱️  Estimated time remaining: ~${remainingMinutes} minutes (${(remainingMinutes/60).toFixed(1)} hours)`);
    console.log('');
  }

  console.log('  Last updated:', progress.last_updated || 'unknown');
  console.log('');
}

checkProgress();
