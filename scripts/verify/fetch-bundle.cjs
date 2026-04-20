const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

(async () => {
  const html = await get('https://app.fluentia.academy/');
  const matches = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)];
  if (matches.length === 0) {
    console.error('❌ No JS bundles found in index.html');
    process.exit(1);
  }
  const bundles = matches.map((m) => m[1]);
  console.log(JSON.stringify({ bundles }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
