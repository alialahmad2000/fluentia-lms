// scripts/mock-exam-fix3-deploy-fn.cjs
// Deploys an edge function via Supabase Management API multipart endpoint
// (the proper one that actually BUNDLES — /functions POST+PATCH only stores metadata).
//
// Endpoint: POST /v1/projects/{ref}/functions/deploy?slug=...
// Content-Type: multipart/form-data
// Fields: `metadata` (json blob), `file` (one entry per source file)

const fs = require('fs');
const path = require('path');

function tokenFromMcp() { try { const f = path.resolve(__dirname,'..','.mcp.json'); if (!fs.existsSync(f)) return null; const j = JSON.parse(fs.readFileSync(f,'utf8')); return j?.mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN || null; } catch { return null; } }
function tokenFromEnvFile() { try { const f = path.resolve(__dirname,'..','.env'); if (!fs.existsSync(f)) return null; const m = fs.readFileSync(f,'utf8').match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m); return m ? m[1].trim().replace(/^"|"$/g,'') : null; } catch { return null; } }
let TOKEN = process.env.SUPABASE_ACCESS_TOKEN || tokenFromEnvFile() || tokenFromMcp();
if (!TOKEN) { console.error('No SUPABASE_ACCESS_TOKEN'); process.exit(2); }
TOKEN = TOKEN.replace(/[\s\r\n]+/g,'');

const PROJECT_REF = 'nmjexpuycmqcxuxljier';
const FN_SLUG = 'mock-exam-grade-writing';
const FN_DIR = 'supabase/functions/mock-exam-grade-writing';

(async () => {
  const indexPath = path.resolve(__dirname, '..', FN_DIR, 'index.ts');
  const indexSrc = fs.readFileSync(indexPath, 'utf8');

  // Build multipart manually (no `form-data` dependency)
  const boundary = '----FluentiaFnDeploy' + Date.now();
  const parts = [];
  const enc = (s) => Buffer.from(s, 'utf8');

  // metadata part
  const metadata = {
    name: FN_SLUG,
    verify_jwt: false,
    entrypoint_path: 'index.ts',
  };
  parts.push(enc(`--${boundary}\r\n`));
  parts.push(enc('Content-Disposition: form-data; name="metadata"\r\n'));
  parts.push(enc('Content-Type: application/json\r\n\r\n'));
  parts.push(enc(JSON.stringify(metadata) + '\r\n'));

  // file part (single index.ts)
  parts.push(enc(`--${boundary}\r\n`));
  parts.push(enc('Content-Disposition: form-data; name="file"; filename="index.ts"\r\n'));
  parts.push(enc('Content-Type: application/typescript\r\n\r\n'));
  parts.push(enc(indexSrc));
  parts.push(enc(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${FN_SLUG}`;
  console.log(`POST ${url}`);
  console.log(`size: ${body.length} bytes`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const text = await res.text();
  console.log(`HTTP ${res.status}`);
  console.log(text.slice(0, 600));
  if (!res.ok) process.exit(1);
})();
