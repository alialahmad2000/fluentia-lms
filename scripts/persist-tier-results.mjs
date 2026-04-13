import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs';

// Read the matrix
const matrixPath = resolve(__dirname, '..', 'TIER_TEST_MATRIX.json');
const matrix = JSON.parse(readFileSync(matrixPath, 'utf-8'));

console.log(`Loaded ${matrix.length} test entries from TIER_TEST_MATRIX.json`);

// Group by recording_id
const grouped = {};
for (const entry of matrix) {
  const { recording_id, tier, ua, works } = entry;
  if (!grouped[recording_id]) {
    grouped[recording_id] = { ios: [], android: [], desktop: [] };
  }
  if (works && ['ios', 'android', 'desktop'].includes(ua)) {
    if (!grouped[recording_id][ua].includes(tier)) {
      grouped[recording_id][ua].push(tier);
    }
  }
}

// Sort tier arrays
for (const rid of Object.keys(grouped)) {
  grouped[rid].ios.sort((a, b) => a - b);
  grouped[rid].android.sort((a, b) => a - b);
  grouped[rid].desktop.sort((a, b) => a - b);
}

const recordingIds = Object.keys(grouped);
console.log(`Found ${recordingIds.length} unique recordings to update`);

// Update each recording via Supabase REST API
let successCount = 0;
let failCount = 0;
const now = new Date().toISOString();

for (const rid of recordingIds) {
  const tierResults = grouped[rid];
  const playable = tierResults.ios.length > 0
    || tierResults.android.length > 0
    || tierResults.desktop.length > 0;

  const body = {
    tier_test_results: tierResults,
    last_tier_test: now,
    playable,
  };

  const url = `${SUPABASE_URL}/rest/v1/class_recordings?id=eq.${rid}`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      successCount++;
      console.log(`  [OK] ${rid} — playable=${playable} ios=${tierResults.ios} android=${tierResults.android} desktop=${tierResults.desktop}`);
    } else {
      failCount++;
      const errText = await res.text();
      console.error(`  [FAIL] ${rid} — ${res.status} ${errText}`);
    }
  } catch (err) {
    failCount++;
    console.error(`  [ERROR] ${rid} — ${err.message}`);
  }
}

console.log(`\nDone. ${successCount} updated, ${failCount} failed.`);
