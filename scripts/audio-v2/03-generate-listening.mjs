/**
 * 03-generate-listening.mjs
 * Regenerates audio for flagged listening rows.
 * Generates per-segment audio, concatenates with ffmpeg (300ms silence), uploads as single file.
 *
 * Usage:
 *   node scripts/audio-v2/03-generate-listening.mjs \
 *     --ids-from docs/audits/audio-issues/listening-audit.json \
 *     --filter-flags TRUNCATED,SINGLE_VOICE_WRONG,LABEL_IN_TEXT \
 *     --force
 */

import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { query, closeDb } from '../audio-generator/lib/db.mjs';
import { synthesizeWithTimestamps } from '../audio-generator/lib/eleven.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const AUDIT_PATH = (() => {
  const a = process.argv.find(x => x.startsWith('--ids-from='));
  return a ? a.split('=').slice(1).join('=') : 'docs/audits/audio-issues/listening-audit.json';
})();
const FILTER_FLAGS = (() => {
  const a = process.argv.find(x => x.startsWith('--filter-flags='));
  return a ? a.split('=')[1].split(',') : ['TRUNCATED', 'SINGLE_VOICE_WRONG', 'LABEL_IN_TEXT'];
})();

const SILENCE_MS = 300;
const BUCKET = 'curriculum-audio';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function uploadWithUpsert(storagePath, buffer) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  return { url: data.publicUrl, path: storagePath };
}

function concatSegments(segPaths) {
  if (segPaths.length === 1) return fs.readFileSync(segPaths[0]);

  const tmpDir = os.tmpdir();
  const ts = Date.now();
  const silencePath = path.join(tmpDir, `sil_${ts}.mp3`);
  const listPath   = path.join(tmpDir, `lst_${ts}.txt`);
  const outPath    = path.join(tmpDir, `out_${ts}.mp3`);

  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${SILENCE_MS / 1000} -q:a 9 -acodec libmp3lame "${silencePath}"`,
    { stdio: 'pipe' }
  );

  const lines = [];
  for (let i = 0; i < segPaths.length; i++) {
    lines.push(`file '${segPaths[i].replace(/\\/g, '/')}'`);
    if (i < segPaths.length - 1) lines.push(`file '${silencePath.replace(/\\/g, '/')}'`);
  }
  fs.writeFileSync(listPath, lines.join('\n'));
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outPath}"`, { stdio: 'pipe' });

  const buf = fs.readFileSync(outPath);
  [silencePath, listPath, outPath].forEach(f => { try { fs.unlinkSync(f); } catch {} });
  return buf;
}

function probeAudioDurationMs(bufOrPath) {
  let tmpPath = null;
  const isBuffer = Buffer.isBuffer(bufOrPath);
  if (isBuffer) {
    tmpPath = path.join(os.tmpdir(), `probe_${Date.now()}.mp3`);
    fs.writeFileSync(tmpPath, bufOrPath);
  }
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${isBuffer ? tmpPath : bufOrPath}"`,
      { stdio: 'pipe' }
    ).toString().trim();
    return Math.round(parseFloat(out) * 1000);
  } catch { return 0; } finally {
    if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch {} }
  }
}

const auditRaw = fs.readFileSync(path.join(ROOT, AUDIT_PATH), 'utf8');
const audit = JSON.parse(auditRaw);
const flagged = audit.items.filter(i => FILTER_FLAGS.some(f => i.flags.includes(f)));

console.log(`[generate] ${flagged.length} items to regenerate (flags: ${FILTER_FLAGS.join(', ')})`);

let success = 0, fail = 0;
const failures = [];
const results  = [];

for (const item of flagged) {
  const rows = await query(
    `SELECT cl.id, cl.audio_type, cl.speaker_segments, cl.transcript, cl.audio_url, lv.level_number
     FROM curriculum_listening cl
     JOIN curriculum_units cu ON cl.unit_id = cu.id
     JOIN curriculum_levels lv ON cu.level_id = lv.id
     WHERE cl.id=$1`,
    [item.id]
  );
  const row = rows[0];
  if (!row) {
    console.warn(`[generate] ${item.id.slice(0, 8)} not found`);
    failures.push({ id: item.id, reason: 'not found' }); fail++; continue;
  }

  const segs = Array.isArray(row.speaker_segments) ? row.speaker_segments : JSON.parse(row.speaker_segments || '[]');
  if (!segs.length) {
    console.warn(`[generate] ${item.id.slice(0, 8)} no speaker_segments`);
    failures.push({ id: item.id, reason: 'no speaker_segments' }); fail++; continue;
  }

  const label = `[generate] L${row.level_number}/U${item.unit_number} ${item.id.slice(0, 8)}`;
  console.log(`\n${label} → ${segs.length} segs (${row.audio_type})`);

  const segPaths   = [];
  const allWordTs  = [];
  let offsetMs     = 0;
  let segFailed    = false;

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (!seg.text || !seg.voice_id) { console.warn(`  seg${i} missing text/voice_id`); continue; }

    const result = await synthesizeWithTimestamps({ text: seg.text, voiceId: seg.voice_id });
    if (!result) {
      console.error(`  seg${i} synthesis FAILED`);
      failures.push({ id: item.id, reason: `seg${i} synthesis failed` });
      segFailed = true; break;
    }

    const segPath = path.join(os.tmpdir(), `seg_${item.id.slice(0, 8)}_${i}_${Date.now()}.mp3`);
    fs.writeFileSync(segPath, result.audio_buffer);
    segPaths.push(segPath);

    const segDurMs = probeAudioDurationMs(segPath);
    for (const wt of result.word_timestamps) {
      allWordTs.push({ word: wt.word, start_ms: wt.start_ms + offsetMs, end_ms: wt.end_ms + offsetMs, speaker: seg.speaker });
    }
    offsetMs += segDurMs + SILENCE_MS;
    console.log(`  seg${i} "${seg.speaker}" → ${segDurMs}ms`);
  }

  const cleanup = () => segPaths.forEach(p => { try { fs.unlinkSync(p); } catch {} });

  if (segFailed || !segPaths.length) { cleanup(); fail++; continue; }

  let combinedBuf;
  try {
    combinedBuf = concatSegments(segPaths);
    cleanup();
  } catch (e) {
    cleanup();
    console.error(`  ffmpeg FAILED: ${e.message}`);
    failures.push({ id: item.id, reason: `ffmpeg: ${e.message}` }); fail++; continue;
  }

  const combinedDurMs = probeAudioDurationMs(combinedBuf);
  const storagePath = `listening/L${row.level_number}/${item.id}/combined.mp3`;

  let uploaded;
  try {
    uploaded = await uploadWithUpsert(storagePath, combinedBuf);
  } catch (e) {
    console.error(`  upload FAILED: ${e.message}`);
    failures.push({ id: item.id, reason: e.message }); fail++; continue;
  }

  // Refresh per-segment rows in listening_audio
  await query('DELETE FROM listening_audio WHERE transcript_id=$1', [item.id]);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const segWts = allWordTs.filter(w => w.speaker === seg.speaker && i === segs.indexOf(seg));
    await query(`
      INSERT INTO listening_audio
        (transcript_id, segment_index, speaker_label, voice_id, audio_url, audio_path,
         duration_ms, text_content, word_timestamps, char_count, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
      ON CONFLICT (transcript_id, segment_index) DO UPDATE SET
        audio_url=EXCLUDED.audio_url, duration_ms=EXCLUDED.duration_ms,
        word_timestamps=EXCLUDED.word_timestamps, generated_at=now()
    `, [
      item.id, i, seg.speaker, seg.voice_id,
      uploaded.url, uploaded.path,
      0, seg.text,
      JSON.stringify(segWts), seg.text.length,
    ]);
  }

  // Update curriculum_listening (no audio_path column on this table)
  await query(`
    UPDATE curriculum_listening
    SET audio_url=$1,
        audio_duration_seconds=$2,
        word_timestamps=$3,
        audio_generated_at=now()
    WHERE id=$4
  `, [
    uploaded.url,
    Math.round(combinedDurMs / 1000),
    JSON.stringify(allWordTs),
    item.id,
  ]);

  const uniqueVoices = new Set(segs.map(s => s.voice_id)).size;
  console.log(`${label} → ✓ ${combinedDurMs}ms, ${uniqueVoices} voices, ${allWordTs.length} wts`);
  results.push({ id: item.id, level: item.level, unit: item.unit_number, flags: item.flags, duration_ms: combinedDurMs, unique_voices: uniqueVoices, wt_count: allWordTs.length });
  success++;
}

// Write results
fs.writeFileSync(
  path.join(ROOT, 'docs/audits/audio-issues/generate-results.json'),
  JSON.stringify({ generated_at: new Date().toISOString(), success, fail, results, failures }, null, 2)
);
if (failures.length) {
  fs.writeFileSync(
    path.join(ROOT, 'docs/audits/audio-issues/post-regen-failures.json'),
    JSON.stringify(failures, null, 2)
  );
}

console.log(`\n[generate] Done: ${success} OK, ${fail} failed`);
if (failures.length) console.log('[generate] Failures:', JSON.stringify(failures, null, 2));
await closeDb();
