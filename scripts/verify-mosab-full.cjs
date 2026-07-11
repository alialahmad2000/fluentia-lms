// Full verification of مصعب's 12-unit curriculum: content completeness (service role) +
// student-role RLS resolution + listening audio public. Run: node scripts/verify-mosab-full.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const svc = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const MOSAB_ID = '4fb98807-526d-4675-adb5-eb938b31b948';

(async () => {
  let pass = true;
  const ok = (l, c, x='') => { console.log(`  ${c?'✅':'❌'} ${l}${x?'  — '+x:''}`); if(!c) pass=false; };

  console.log('=== CONTENT COMPLETENESS (per unit) ===');
  const { data: units } = await svc.from('curriculum_units').select('id, custom_sort, theme_ar, cover_image_url').eq('owner_student_id', MOSAB_ID).order('custom_sort');
  ok('12 owner units', units.length === 12, `${units.length}`);
  let totR=0, totQ=0, totV=0, totL=0, audioMissing=0;
  for (const u of units) {
    const { data: readings } = await svc.from('curriculum_readings').select('id').eq('unit_id', u.id);
    const rids = readings.map(r=>r.id);
    const [{count:qN},{count:vN},{data:gram},{count:wN},{count:sN},{data:listen}] = await Promise.all([
      svc.from('curriculum_comprehension_questions').select('id',{count:'exact',head:true}).in('reading_id', rids.length?rids:['00000000-0000-0000-0000-000000000000']),
      svc.from('curriculum_vocabulary').select('id',{count:'exact',head:true}).in('reading_id', rids.length?rids:['00000000-0000-0000-0000-000000000000']),
      svc.from('curriculum_grammar').select('id').eq('unit_id', u.id),
      svc.from('curriculum_writing').select('id',{count:'exact',head:true}).eq('unit_id', u.id),
      svc.from('curriculum_speaking').select('id',{count:'exact',head:true}).eq('unit_id', u.id),
      svc.from('curriculum_listening').select('id, audio_url, exercises').eq('unit_id', u.id),
    ]);
    const lst = listen?.[0];
    const lAudio = lst && !!lst.audio_url;
    if (lst && !lAudio) audioMissing++;
    totR+=readings.length; totQ+=qN; totV+=vN; totL += listen?.length||0;
    const good = readings.length>=2 && qN>=12 && vN>=15 && gram?.length>=1 && (listen?.length||0)>=1 && lAudio && wN>=1 && sN>=1 && !!u.cover_image_url;
    ok(`U${u.custom_sort} «${u.theme_ar}»`, good, `read:${readings.length} Q:${qN} vocab:${vN} gram:${gram?.length} listen:${listen?.length}${lAudio?'(audio✓)':'(NO AUDIO)'} write:${wN} speak:${sN} cover:${u.cover_image_url?'✓':'✗'}`);
  }
  console.log(`\n  TOTALS: readings ${totR} · questions ${totQ} · vocab ${totV} · listening ${totL} (audio missing: ${audioMissing})`);

  console.log('\n=== STUDENT-ROLE RLS ===');
  const sb = createClient(URL, process.env.VITE_SUPABASE_ANON_KEY, { auth:{autoRefreshToken:false,persistSession:false} });
  const { data: auth, error: aerr } = await sb.auth.signInWithPassword({ email:'mosab05113@gmail.com', password:'Fluentia2025!' });
  if (aerr) { ok('sign in as Mosab', false, aerr.message); }
  else {
    const { data: sUnits } = await sb.from('curriculum_units').select('id').eq('owner_student_id', MOSAB_ID);
    ok('student sees 12 units', (sUnits||[]).length===12, `${sUnits?.length}`);
    // spot-check a NEW unit's full content resolves under RLS
    const u10 = units.find(u=>u.custom_sort===10);
    const { data: r } = await sb.from('curriculum_readings').select('id').eq('unit_id', u10.id);
    const { data: l } = await sb.from('curriculum_listening').select('id, audio_url').eq('unit_id', u10.id);
    const { count: q } = await sb.from('curriculum_comprehension_questions').select('id',{count:'exact',head:true}).in('reading_id', (r||[]).map(x=>x.id));
    ok('U10 content resolves as student', (r?.length>=2) && (q>=12) && (l?.length>=1) && !!l?.[0]?.audio_url, `readings:${r?.length} Q:${q} listen-audio:${l?.[0]?.audio_url?'✓':'✗'}`);
  }

  console.log('\n=== LISTENING AUDIO PUBLIC ===');
  const { data: oneL } = await svc.from('curriculum_listening').select('audio_url').eq('unit_id', units[5].id).limit(1);
  const aurl = oneL?.[0]?.audio_url;
  if (aurl) { const hr = await fetch(aurl, { method:'HEAD' }); ok('audio HEAD 200 + audio/mpeg', hr.status===200 && (hr.headers.get('content-type')||'').includes('audio'), `${hr.status} ${hr.headers.get('content-type')}`); }
  else ok('audio url present', false);

  console.log(`\n${pass?'✅ ALL CHECKS PASS':'💥 SOME CHECKS FAILED'}`);
  process.exit(pass?0:1);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
