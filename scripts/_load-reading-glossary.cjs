// Load the offline-generated EN→AR glossary batches into reading_glossary.
// Usage: node scripts/_load-reading-glossary.cjs
const { createClient } = require('/Users/dr.ali/projects/fluentia-lms/node_modules/@supabase/supabase-js');
const fs=require('path').join, p=require('path'), F=require('fs');
const env=F.readFileSync('.env','utf8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)a[m[1]]=m[2].replace(/^["']|["']$/g,'').replace(/\\n$/,'');return a;},{});
const sb=createClient(env.SUPABASE_URL||env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const norm=w=>w.toLowerCase().replace(/^[^\p{L}]+/u,'').replace(/[^\p{L}]+$/u,'');
const dir=p.resolve('scripts/seeds/reading-glossary');
(async()=>{
  const rows=[]; const seen=new Set();
  for(const f of F.readdirSync(dir).filter(x=>/^fresh-\d+\.json$/.test(x)).sort()){
    const obj=JSON.parse(F.readFileSync(p.join(dir,f),'utf8'));
    for(const [w,ar] of Object.entries(obj)){
      const k=norm(w);
      if(!k||!ar||!String(ar).trim())continue;
      if(seen.has(k))continue; seen.add(k);
      rows.push({word:k, meaning_ar:String(ar).slice(0,400), source:'generated'});
    }
  }
  console.log('fresh rows parsed:', rows.length);
  let done=0;
  for(let i=0;i<rows.length;i+=500){const c=rows.slice(i,i+500);const{error}=await sb.from('reading_glossary').upsert(c,{onConflict:'word'});if(error){console.error('err',error.message);break;}done+=c.length;}
  console.log('upserted:', done);
  const {count}=await sb.from('reading_glossary').select('*',{count:'exact',head:true});
  console.log('reading_glossary total rows:', count);
})();
