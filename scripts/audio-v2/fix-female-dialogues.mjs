/**
 * fix-female-dialogues.mjs
 * Re-preprocesses + regenerates the 3 female-female dialogues that were assigned
 * a male voice for the second speaker (George instead of Sarah).
 *
 * Targets: L2/U5, L2/U6, L2/U11
 * IDs:
 *   420b053f-d61e-4be9-8992-76685066ce58  (L2/U5  — Layla + Emma)
 *   bccfc6e1-767a-44ec-83e8-ee060bdd825d  (L2/U6  — Layla + Fatima)
 *   5846f7c9-f5c9-482e-bb09-142aeceeefb8  (L2/U11 — Layla + Fatima)
 *
 * Usage:  node scripts/audio-v2/fix-female-dialogues.mjs [--dry-run]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { query, closeDb } from '../audio-generator/lib/db.mjs';
import { synthesizeWithTimestamps } from '../audio-generator/lib/eleven.mjs';

const require = createRequire(import.meta.url);
const { concatMp3Buffers, verifyMp3Decodes } = require('./lib/concat.cjs');
const { parseTranscript, assignVoices, assertNoLabelResidue } = require('./lib/speaker-map.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'curriculum-audio';

const ITEMS = [
  { id: '420b053f-d61e-4be9-8992-76685066ce58', level: 2, unit: 5,  label: 'Layla+Emma' },
  { id: 'bccfc6e1-767a-44ec-83e8-ee060bdd825d', level: 2, unit: 6,  label: 'Layla+Fatima' },
  { id: '5846f7c9-f5c9-482e-bb09-142aeceeefb8', level: 2, unit: 11, label: 'Layla+Fatima' },
];

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function uploadWithUpsert(storagePath, buffer) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (error) throw new Error(`Upload failed ${storagePath}: ${error.message}`);
  return sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function main() {
  console.log(`\n=== Fix Female-Female Dialogues ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  let success = 0, fail = 0;

  for (const item of ITEMS) {
    const tag = `L${item.level}/U${item.unit} (${item.label})`;
    console.log(`\n── ${tag} ──`);

    // ── Phase 1: Load transcript from DB ──────────────────────────────────────
    const [row] = await query(
      `SELECT cl.id, cl.audio_type, cl.transcript, cl.speaker_segments
       FROM curriculum_listening cl
       WHERE cl.id = $1`,
      [item.id]
    );
    if (!row) { console.error(`  NOT FOUND`); fail++; continue; }

    // ── Phase 2: Re-parse + re-assign voices (now female-first) ───────────────
    let segments;
    try {
      segments = parseTranscript(row.transcript);
      assignVoices(segments);
      assertNoLabelResidue(segments);
    } catch (e) {
      console.error(`  parse/assert FAILED: ${e.message}`); fail++; continue;
    }

    const uniqueVoiceIds = new Set(segments.map(s => s.voice_id));
    const voiceSummary = segments
      .filter((s, i, arr) => arr.findIndex(x => x.speaker_name === s.speaker_name) === i)
      .map(s => `${s.speaker_name}→${s.voice_name}(${s.gender})`).join(', ');

    console.log(`  Segments: ${segments.length}, Unique voices: ${uniqueVoiceIds.size}`);
    console.log(`  Voice map: ${voiceSummary}`);

    if (uniqueVoiceIds.size < 2) {
      console.error(`  STILL only 1 unique voice after re-parse — skipping`); fail++; continue;
    }

    // Build final segments for DB
    const finalSegments = segments.map((s, i) => ({
      order: i + 1,
      speaker: s.speaker_name === '_narrator' ? 'Narrator' : s.speaker_name,
      text: s.text,
      voice_id: s.voice_id,
      char_count: s.text.length,
      gender: s.gender || 'male',
      voice_name: s.voice_name || 'Other',
    }));

    if (DRY_RUN) { console.log('  [DRY RUN] would update DB + generate audio'); continue; }

    // ── Phase 3: Update speaker_segments in DB ────────────────────────────────
    await query(
      'UPDATE curriculum_listening SET speaker_segments=$1, segments_processed_at=now() WHERE id=$2',
      [JSON.stringify(finalSegments), item.id]
    );
    console.log(`  ✓ speaker_segments updated`);

    // ── Phase 4: Generate per-segment audio ───────────────────────────────────
    const segBuffers = [];
    const segWordTs = [];
    let segFailed = false;

    for (let i = 0; i < finalSegments.length; i++) {
      const seg = finalSegments[i];
      process.stdout.write(`  seg${i} "${seg.speaker}" (${seg.voice_name})...`);
      const result = await synthesizeWithTimestamps({ text: seg.text, voiceId: seg.voice_id });
      if (!result) {
        console.error(` FAILED`); segFailed = true; break;
      }
      segBuffers.push(result.audio_buffer);
      segWordTs.push(result.word_timestamps.map(wt => ({ ...wt, speaker: seg.speaker })));
      console.log(` ${result.audio_buffer.length} bytes`);
    }

    if (segFailed || !segBuffers.length) { fail++; continue; }

    // ── Phase 5: Concat with re-encoding ─────────────────────────────────────
    let combinedBuf, combinedDurMs, segmentOffsets, segmentDurations;
    try {
      ({ buffer: combinedBuf, durationMs: combinedDurMs, segmentOffsets, segmentDurations } =
        await concatMp3Buffers(segBuffers));
    } catch (e) {
      console.error(`  concat FAILED: ${e.message}`); fail++; continue;
    }

    if (!verifyMp3Decodes(combinedBuf)) {
      console.error(`  decode-verify FAILED`); fail++; continue;
    }

    // ── Phase 6: Upload ───────────────────────────────────────────────────────
    const storagePath = `listening/L${item.level}/${item.id}/combined.mp3`;
    let audioUrl;
    try {
      audioUrl = await uploadWithUpsert(storagePath, combinedBuf);
    } catch (e) {
      console.error(`  upload FAILED: ${e.message}`); fail++; continue;
    }

    // ── Phase 7: Stitch word timestamps + enrich segments ────────────────────
    const allWordTs = [];
    for (let i = 0; i < segWordTs.length; i++) {
      const offset = segmentOffsets[i] ?? 0;
      for (const wt of segWordTs[i]) {
        allWordTs.push({ word: wt.word, start_ms: wt.start_ms + offset, end_ms: wt.end_ms + offset, speaker: wt.speaker });
      }
    }

    const enrichedSegs = finalSegments.map((seg, i) => ({
      ...seg,
      start_ms: segmentOffsets[i] ?? 0,
      end_ms: (segmentOffsets[i] ?? 0) + (segmentDurations[i] ?? 0),
    }));

    // ── Phase 8: Update listening_audio rows ──────────────────────────────────
    await query('DELETE FROM listening_audio WHERE transcript_id=$1', [item.id]);
    for (let i = 0; i < finalSegments.length; i++) {
      const seg = finalSegments[i];
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
        audioUrl, storagePath,
        segmentDurations[i] ?? 0, seg.text,
        JSON.stringify(segWts), seg.text.length,
      ]);
    }

    // ── Phase 9: Update curriculum_listening ─────────────────────────────────
    await query(`
      UPDATE curriculum_listening
      SET audio_url=$1,
          audio_duration_seconds=$2,
          speaker_segments=$3,
          word_timestamps=$4,
          audio_generated_at=now()
      WHERE id=$5
    `, [
      audioUrl,
      Math.round(combinedDurMs / 1000),
      JSON.stringify(enrichedSegs),
      JSON.stringify(allWordTs),
      item.id,
    ]);

    const uniqueVoices = new Set(finalSegments.map(s => s.voice_id)).size;
    console.log(`  ✓ Done — ${combinedDurMs}ms, ${uniqueVoices} voices, ${allWordTs.length} wts`);
    success++;
  }

  console.log(`\n=== Result: ${success} fixed, ${fail} failed ===`);
  await closeDb();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
