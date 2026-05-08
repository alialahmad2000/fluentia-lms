require('dotenv').config();

const SWEEP_URL = 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/sweep-speaking-evaluations';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSweep(label) {
  console.log(`\n=== ${label} ===`);
  const res = await fetch(SWEEP_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  console.log('Status:', res.status, '| Result:', JSON.stringify(data, null, 2));
  return data;
}

(async () => {
  const result1 = await runSweep('Sweep 1');
  if (result1.swept > 0) {
    console.log('\nWaiting 70 seconds before sweep 2...');
    await new Promise(r => setTimeout(r, 70000));
    const result2 = await runSweep('Sweep 2');
    if (result2.swept > 0) {
      console.log('\nWaiting 70 seconds before sweep 3...');
      await new Promise(r => setTimeout(r, 70000));
      await runSweep('Sweep 3');
    }
  }
  console.log('\nBackfill done. Check DB for status distribution.');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
