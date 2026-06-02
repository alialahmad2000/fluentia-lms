// Generic edge-function deploy via Management API multipart /functions/deploy.
// Usage: node scripts/_deploy-fn.cjs <function-slug>
const fs = require('fs'); const path = require('path');
function tokenFromMcp(){try{const f=path.resolve(__dirname,'..','.mcp.json');return JSON.parse(fs.readFileSync(f,'utf8'))?.mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN||null;}catch{return null;}}
const TOKEN=(process.env.SUPABASE_ACCESS_TOKEN||tokenFromMcp()||'').replace(/[\s\r\n]+/g,'');
if(!TOKEN){console.error('no token');process.exit(2);}
const PROJECT_REF='nmjexpuycmqcxuxljier';
const FN=process.argv[2];
if(!FN){console.error('usage: node scripts/_deploy-fn.cjs <slug>');process.exit(2);}
const src=fs.readFileSync(path.resolve(__dirname,'..','supabase/functions',FN,'index.ts'),'utf8');
const boundary='----Deploy'+Date.now();
const enc=s=>Buffer.from(s,'utf8');
const parts=[];
parts.push(enc(`--${boundary}\r\n`));
parts.push(enc('Content-Disposition: form-data; name="metadata"\r\n'));
parts.push(enc('Content-Type: application/json\r\n\r\n'));
parts.push(enc(JSON.stringify({name:FN,verify_jwt:false,entrypoint_path:'index.ts'})+'\r\n'));
parts.push(enc(`--${boundary}\r\n`));
parts.push(enc('Content-Disposition: form-data; name="file"; filename="index.ts"\r\n'));
parts.push(enc('Content-Type: application/typescript\r\n\r\n'));
parts.push(enc(src));
parts.push(enc(`\r\n--${boundary}--\r\n`));
const body=Buffer.concat(parts);
(async()=>{
  const r=await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${FN}`,{
    method:'POST',
    headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':`multipart/form-data; boundary=${boundary}`},
    body,
  });
  const t=await r.text();
  console.log('HTTP',r.status); console.log(t.slice(0,600));
  if(!r.ok)process.exit(1);
})();
