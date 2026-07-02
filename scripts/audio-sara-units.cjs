// scripts/audio-sara-units.cjs
// Generate audio for Sara Al-Asmari's 8 custom IT units — reading passages + vocabulary words —
// via ElevenLabs (voice Alice, British female educator), re-encoded to MONO with `-ac 1` to prevent
// the Safari channel-drift silent-audio bug, uploaded to curriculum-audio, and wired to the DB.
// Reading player reads `reading_passage_audio` (passage_id) → we upsert that + mirror curriculum_readings.
// Vocab words → curriculum_vocabulary.audio_url. Idempotent (skip a row whose URL is set + file 200).
// Only touches Sara's units (owner_student_id). `.select()` + rowcount after every write. No deletes.
// Run:  node scripts/audio-sara-units.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execFileSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const XI_KEY = process.env.ELEVENLABS_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !XI_KEY) { console.error('❌ Missing SUPABASE_URL / SERVICE_ROLE_KEY / ELEVENLABS_API_KEY'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice — British female, informative/educational
const VOICE_NAME = 'Alice';
const MODEL = 'eleven_multilingual_v2';
const BUCKET = 'curriculum-audio';
const SARA_EMAIL = 'sarahasmari6@gmail.com';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sara-audio-'));

let charsUsed = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const publicUrl = (p) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p}`;
async function reachable(url) { try { const r = await fetch(url, { method: 'HEAD' }); return r.status === 200; } catch { return false; } }

async function elevenTTS(text) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': XI_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 200)}`);
  charsUsed += text.length;
  return Buffer.from(await r.arrayBuffer());
}

// TTS → write → ffmpeg mono re-encode → assert 1 channel → return {buffer, durationMs}
async function ttsToMono(text, tag) {
  const raw = path.join(TMP, `${tag}.raw.mp3`);
  const mono = path.join(TMP, `${tag}.mono.mp3`);
  fs.writeFileSync(raw, await elevenTTS(text));
  execFileSync('ffmpeg', ['-y', '-i', raw, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', '-map_metadata', '-1', mono], { stdio: 'ignore' });
  const ch = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', mono]).toString().trim();
  if (ch !== '1') throw new Error(`${tag}: expected mono (1 channel), ffprobe says ${ch}`);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mono]).toString().trim());
  return { buffer: fs.readFileSync(mono), durationMs: Math.round((dur || 0) * 1000) };
}

async function upload(storagePath, buffer) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw new Error(`upload ${storagePath}: ${error.message}`);
  return publicUrl(storagePath);
}

function one(rows, ctx) { if (!rows || rows.length !== 1) throw new Error(`${ctx}: expected 1 row, got ${rows ? rows.length : 'null'}`); return rows[0]; }

async function main() {
  const { data: prof } = await sb.from('profiles').select('id').eq('email', SARA_EMAIL).maybeSingle();
  if (!prof) throw new Error('Sara not found');
  const saraId = prof.id;
  const { data: units } = await sb.from('curriculum_units').select('id, custom_sort, theme_en').eq('owner_student_id', saraId).order('custom_sort');
  console.log(`Sara=${saraId} · ${units.length} custom units · voice=${VOICE_NAME} (${VOICE_ID})\n`);

  const report = { passages: 0, passSkipped: 0, vocab: 0, vocabSkipped: 0, failures: [] };

  for (const u of units) {
    const { data: reading } = await sb.from('curriculum_readings').select('id, passage_content, passage_audio_url').eq('unit_id', u.id).eq('reading_label', 'A').maybeSingle();
    if (!reading) { console.log(`── Unit ${u.custom_sort}: NO reading, skip`); continue; }
    console.log(`── Unit ${u.custom_sort}: ${u.theme_en}`);

    // ── PASSAGE ──
    try {
      const { data: existingRpa } = await sb.from('reading_passage_audio').select('passage_id, full_audio_url').eq('passage_id', reading.id).maybeSingle();
      if (existingRpa?.full_audio_url && (await reachable(existingRpa.full_audio_url))) {
        report.passSkipped++; console.log('   ⏭️  passage audio exists — skip');
      } else {
        const text = (reading.passage_content?.paragraphs || []).join(' ').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
        const { buffer, durationMs } = await ttsToMono(text, `u${u.custom_sort}-passage`);
        const spath = `reading/custom/${reading.id}/full.mp3`;
        const url = await upload(spath, buffer);
        const rpaPayload = {
          passage_id: reading.id, full_audio_url: url, full_audio_path: spath, full_duration_ms: durationMs,
          paragraph_audio: [], word_timestamps: [], voice_id: VOICE_ID, generated_at: new Date().toISOString(),
        };
        if (existingRpa) {
          const { data, error } = await sb.from('reading_passage_audio').update(rpaPayload).eq('passage_id', reading.id).select('passage_id');
          if (error) throw new Error(`rpa update: ${error.message}`); one(data, 'rpa update');
        } else {
          const { data, error } = await sb.from('reading_passage_audio').insert(rpaPayload).select('passage_id');
          if (error) throw new Error(`rpa insert: ${error.message}`); one(data, 'rpa insert');
        }
        const { data: cr, error: crErr } = await sb.from('curriculum_readings')
          .update({ passage_audio_url: url, audio_duration_seconds: Math.round(durationMs / 1000), audio_generated_at: new Date().toISOString() })
          .eq('id', reading.id).select('id');
        if (crErr) throw new Error(`curriculum_readings update: ${crErr.message}`); one(cr, 'curriculum_readings update');
        report.passages++; console.log(`   ✅ passage audio (mono, ${(durationMs / 1000).toFixed(1)}s) → ${spath}`);
        await sleep(350);
      }
    } catch (e) { report.failures.push(`u${u.custom_sort} passage: ${e.message}`); console.log(`   ❌ passage: ${e.message}`); }

    // ── VOCAB (7 words) ──
    const { data: vocab } = await sb.from('curriculum_vocabulary').select('id, word, audio_url').eq('reading_id', reading.id).order('sort_order');
    for (const v of vocab || []) {
      try {
        if (v.audio_url && (await reachable(v.audio_url))) { report.vocabSkipped++; continue; }
        const { buffer } = await ttsToMono(v.word, `u${u.custom_sort}-vocab-${v.id.slice(0, 8)}`);
        const spath = `vocab/custom/${v.id}.mp3`;
        const url = await upload(spath, buffer);
        const { data, error } = await sb.from('curriculum_vocabulary')
          .update({ audio_url: url, audio_voice_name: VOICE_NAME, audio_generated_at: new Date().toISOString() })
          .eq('id', v.id).select('id');
        if (error) throw new Error(`vocab update: ${error.message}`); one(data, 'vocab update');
        report.vocab++;
        await sleep(300);
      } catch (e) { report.failures.push(`u${u.custom_sort} vocab "${v.word}": ${e.message}`); console.log(`   ❌ vocab "${v.word}": ${e.message}`); }
    }
    console.log(`   🔤 vocab done for unit ${u.custom_sort}`);
  }

  console.log('\n=== REPORT ===');
  console.log(`passages generated: ${report.passages} · skipped(existing): ${report.passSkipped}`);
  console.log(`vocab generated: ${report.vocab} · skipped(existing): ${report.vocabSkipped}`);
  console.log(`ElevenLabs chars used this run: ~${charsUsed}`);
  if (report.failures.length) { console.log('🔴 FAILURES:'); report.failures.forEach((f) => console.log('  - ' + f)); }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
  if (report.failures.length) process.exit(1);
  console.log('✅ Done.');
}
main().catch((e) => { console.error('\n💥 FATAL:', e.message); process.exit(1); });
