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
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { query, closeDb } from '../audio-generator/lib/db.mjs';
import { synthesizeWithTimestamps } from '../audio-generator/lib/eleven.mjs';

const require = createRequire(import.meta.url);
const { concatMp3Buffers, verifyMp3Decodes } = require('./lib/concat.cjs');

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

  const segBuffers  = [];
  const segWordTs   = []; // raw word timestamps per segment (relative to segment start)
  let segFailed     = false;

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (!seg.text || !seg.voice_id) { console.warn(`  seg${i} missing text/voice_id`); continue; }

    const result = await synthesizeWithTimestamps({ text: seg.text, voiceId: seg.voice_id });
    if (!result) {
      console.error(`  seg${i} synthesis FAILED`);
      failures.push({ id: item.id, reason: `seg${i} synthesis failed` });
      segFailed = true; break;
    }

    segBuffers.push(result.audio_buffer);
    segWordTs.push(result.word_timestamps.map(wt => ({ ...wt, speaker: seg.speaker })));
    console.log(`  seg${i} "${seg.speaker}" → ${result.audio_buffer.length} bytes`);
  }

  if (segFailed || !segBuffers.length) { fail++; continue; }

  let combinedBuf, combinedDurMs, segmentOffsets, segmentDurations;
  try {
    ({ buffer: combinedBuf, durationMs: combinedDurMs, segmentOffsets, segmentDurations } =
      await concatMp3Buffers(segBuffers));
  } catch (e) {
    console.error(`  concat FAILED: ${e.message}`);
    failures.push({ id: item.id, reason: `concat: ${e.message}` }); fail++; continue;
  }

  // Decode-verify before upload — never upload a corrupt file
  if (!verifyMp3Decodes(combinedBuf)) {
    console.error(`  decode-verify FAILED — skipping upload`);
    failures.push({ id: item.id, reason: 'decode verification failed after concat' }); fail++; continue;
  }
  const storagePath = `listening/L${row.level_number}/${item.id}/combined.mp3`;

  let uploaded;
  try {
    uploaded = await uploadWithUpsert(storagePath, combinedBuf);
  } catch (e) {
    console.error(`  upload FAILED: ${e.message}`);
    failures.push({ id: item.id, reason: e.message }); fail++; continue;
  }

  // Stitch word timestamps using accurate segmentOffsets from concat
  const allWordTs = [];
  for (let i = 0; i < segWordTs.length; i++) {
    const offset = segmentOffsets[i] ?? 0;
    for (const wt of segWordTs[i]) {
      allWordTs.push({ word: wt.word, start_ms: wt.start_ms + offset, end_ms: wt.end_ms + offset, speaker: wt.speaker });
    }
  }

  // Enrich speaker_segments with accurate start_ms / end_ms
  const enrichedSegs = segs.map((seg, i) => ({
    ...seg,
    start_ms: segmentOffsets[i] ?? 0,
    end_ms: (segmentOffsets[i] ?? 0) + (segmentDurations[i] ?? 0),
  }));

  // Refresh per-segment rows in listening_audio
  await query('DELETE FROM listening_audio WHERE transcript_id=$1', [item.id]);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const segWts = allWordTs.filter(w => w.speaker === seg.speaker);
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
      segmentDurations[i] ?? 0, seg.text,
      JSON.stringify(segWts), seg.text.length,
    ]);
  }

  // Update curriculum_listening with enriched timing data
  await query(`
    UPDATE curriculum_listening
    SET audio_url=$1,
        audio_duration_seconds=$2,
        audio_duration_ms=$3,
        speaker_segments=$4,
        word_timestamps=$5,
        audio_generated_at=now()
    WHERE id=$6
  `, [
    uploaded.url,
    Math.round(combinedDurMs / 1000),
    combinedDurMs,
    JSON.stringify(enrichedSegs),
    JSON.stringify(allWordTs),
    item.id,
  ]);

  const uniqueVoices = new Set(segs.map(s => s.voice_id)).size;
  console.log(`${label} → ✓ ${combinedDurMs}ms, ${uniqueVoices} voices, ${allWordTs.length} wts, ${segs.length} segs with timing`);
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
