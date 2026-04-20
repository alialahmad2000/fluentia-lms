const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

const SIGNATURES = [
  'Supabase fetch timeout after',
  'fetch timeout',
  'STORAGE_TIMEOUT_MS',
  '120000',
  '20000',
];

(async () => {
  const html = await get('https://app.fluentia.academy/');
  const matches = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)];
  const bundles = matches.map((m) => 'https://app.fluentia.academy' + m[1]);

  console.log(`Found ${bundles.length} bundle(s) in index.html`);
  console.log(`Checking first 3 for fix signatures…\n`);

  const checks = {};
  for (const sig of SIGNATURES) checks[sig] = 0;

  for (const url of bundles.slice(0, 3)) {
    const js = await get(url);
    console.log(`Bundle: ${url.split('/').pop()} (${Math.round(js.length / 1024)} KB)`);
    for (const sig of SIGNATURES) {
      if (js.includes(sig)) {
        checks[sig]++;
        console.log(`  ✓ contains: "${sig}"`);
      }
    }
  }

  console.log('\n=== BUNDLE CHECK SUMMARY ===');
  const definitive = checks['Supabase fetch timeout after'] > 0;
  const corroborating = checks['120000'] > 0 && checks['20000'] > 0;

  if (definitive) {
    console.log('✅ DEFINITIVE: DOMException message found in bundle — fix is deployed');
    process.exit(0);
  } else if (corroborating) {
    console.log('🟡 CORROBORATING: timeout literals found but DOMException message not — fix likely deployed');
    process.exit(0);
  } else {
    console.log('❌ FIX NOT FOUND in production bundle');
    process.exit(2);
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
