// scripts/generate-mosab-listening-audio.cjs
// Generates ElevenLabs TTS for every curriculum_listening row in مصعب's owner units that lacks audio_url.
// Single clear narrator, mp3 → curriculum-audio/listening/mosab/<id>.mp3 → sets audio_url.
// Budget-aware: checks remaining ElevenLabs chars first and stops before overspending.
// Run: node scripts/generate-mosab-listening-audio.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const MOSAB_ID = '4fb98807-526d-4675-adb5-eb938b31b948';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel — clear neutral English narrator
const MODEL = 'eleven_multilingual_v2';
const EL_KEY = process.env.ELEVENLABS_API_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function remaining() {
  const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': EL_KEY } });
  const s = await r.json();
  return (s.character_limit || 0) - (s.character_count || 0);
}

async function tts(text) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0 } }),
  });
  if (!r.ok) throw new Error(`TTS ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return Buffer.from(await r.arrayBuffer());
}

(async () => {
  // owner units → their listening rows lacking audio
  const { data: units } = await supabase.from('curriculum_units').select('id, custom_sort').eq('owner_student_id', MOSAB_ID);
  const unitIds = (units || []).map((u) => u.id);
  const { data: rows, error } = await supabase.from('curriculum_listening')
    .select('id, unit_id, title_en, transcript, audio_url').in('unit_id', unitIds);
  if (error) throw new Error(error.message);
  const todo = (rows || []).filter((r) => !r.audio_url && r.transcript);
  console.log(`🎧 ${todo.length} listening rows need audio.`);
  if (!todo.length) return;

  let budget = await remaining();
  const needed = todo.reduce((a, r) => a + r.transcript.length, 0);
  console.log(`   ElevenLabs remaining: ${budget} chars · needed: ${needed} chars`);

  let done = 0, skipped = 0;
  for (const r of todo) {
    if (r.transcript.length > budget - 50) { console.log(`   ⏭️  skip ${r.id.slice(0,8)} (would exceed budget)`); skipped++; continue; }
    try {
      const buf = await tts(r.transcript);
      const path = `listening/mosab/${r.id}.mp3`;
      const { error: upErr } = await supabase.storage.from('curriculum-audio').upload(path, buf, { contentType: 'audio/mpeg', upsert: true });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      const { data: pub } = supabase.storage.from('curriculum-audio').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('curriculum_listening')
        .update({ audio_url: pub.publicUrl, audio_type: 'monologue', audio_generated_at: new Date().toISOString() }).eq('id', r.id);
      if (dbErr) throw new Error(`db: ${dbErr.message}`);
      budget -= r.transcript.length; done++;
      console.log(`   ✅ «${r.title_en}» — ${(buf.length/1024).toFixed(0)}KB (${r.transcript.length} chars, ${budget} left)`);
      await new Promise((res) => setTimeout(res, 400));
    } catch (e) { console.error(`   ❌ ${r.id.slice(0,8)}: ${e.message}`); }
  }
  console.log(`\n🎧 audio done: ${done} · skipped(budget): ${skipped}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
