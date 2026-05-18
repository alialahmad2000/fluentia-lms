/**
 * regen-reading-truncated.mjs
 * Regenerates full audio + paragraph audio + word timestamps for the 13 reading
 * passages flagged as TRUNCATED by the audio audit (01-AUDIT-AUDIO-CONTENT).
 *
 * Uses ElevenLabs with-timestamps, overwrites existing storage paths.
 *
 * Usage:
 *   node scripts/audio-v2/regen-reading-truncated.mjs [--dry-run] [--limit N]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { query, closeDb } from '../audio-generator/lib/db.mjs';
import { synthesizeWithTimestamps } from '../audio-generator/lib/eleven.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || process.argv[process.argv.indexOf('--limit') + 1]) : null;

const TRUNCATED_IDS = [
  '19b2d071-2172-4c10-a979-63497295c42b',  // L2/U5/B  Voices from the Sand
  '53c4556a-2321-4cc1-bf12-07f73161baa0',  // L4/U1/B  Designer Genes: The CRISPR Revolution
  '528296d6-c725-4db4-b0bf-22938cf9bbfa',  // L4/U4/A  Nature's Blueprint for Innovation
  'c91c0100-285b-4e27-8fe6-afee9ede3312',  // L4/U5/B  The Digital Nomad Revolution
  '77046325-699b-4b7b-b176-b720dffd1020',  // L4/U8/A  Silent Witnesses Speak
  '20e8059f-8e34-4e39-845b-aa38a0311176',  // L4/U11/B Living Buildings that Breathe
  '84879208-38e1-490d-822e-dec04dd2151b',  // L5/U1/B  The Silent Collapse of Maya Cities
  '89335504-c7a5-4d0f-9e86-e349a5a5cb62',  // L5/U2/B  Breaking Barriers in STEM
  '4ef7a742-9010-4ee3-86d0-27a5eccc3c3f',  // L5/U5/B  The Nuclear Renaissance Paradox
  'cc5a6a54-7f64-46cc-b861-23b37be79b97',  // L5/U7/B  Healing the Mind's Architecture
  '05efda2e-0f7d-47a5-b8f0-3495ad23e771',  // L5/U10/A Quantum Frontiers Unveiled
  'e41a47d0-0d06-489b-be46-9ca59523a032',  // L5/U12/A The Water-Energy Nexus Challenge
  'fc28b071-02ac-4fcd-b502-8476d25e70ef',  // L5/U12/B The Water-Energy Nexus Revolution
];

const ALICE = 'Xb7hH8MSUJpSbSDYk0k2';
const BUCKET = 'curriculum-audio';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function stripMarkdown(text) {
  return (text || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

async function upsertStorage(storagePath, buffer) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (error) throw new Error(`Upload failed ${storagePath}: ${error.message}`);
  return sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\n=== Regen Reading Truncated Passages ${DRY_RUN ? '[DRY RUN]' : ''} ===`);
  console.log(`Passages to fix: ${TRUNCATED_IDS.length}${LIMIT ? ` (limit: ${LIMIT})` : ''}\n`);

  const ids = LIMIT ? TRUNCATED_IDS.slice(0, LIMIT) : TRUNCATED_IDS;

  // Load all passage data in one query
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query(`
    SELECT cr.id, cr.reading_label, cr.passage_word_count,
           cr.passage_content->'paragraphs' AS paragraphs,
           l.level_number, u.unit_number,
           rpa.full_audio_path, rpa.paragraph_audio
    FROM curriculum_readings cr
    JOIN curriculum_units u ON u.id = cr.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    LEFT JOIN reading_passage_audio rpa ON rpa.passage_id = cr.id
    WHERE cr.id IN (${placeholders})
    ORDER BY l.level_number, u.unit_number, cr.reading_label
  `, ids);

  let success = 0, fail = 0;
  const results = [];

  for (const row of rows) {
    const paras = (row.paragraphs || []).map(p => stripMarkdown(p)).filter(Boolean);
    const fullText = paras.join(' ');
    const label = `L${row.level_number}/U${row.unit_number}/${row.reading_label} "${fullText.slice(0, 40)}..."`;

    console.log(`\n── ${label} ──`);
    console.log(`  ${paras.length} paragraphs, ${fullText.length} chars`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] would generate ${fullText.length + paras.reduce((s, p) => s + p.length, 0)} total chars`);
      continue;
    }

    // Determine storage paths (use existing if available, else derive from ID/level)
    const fullPath = row.full_audio_path || `reading/L${row.level_number}/${row.id}/full.mp3`;

    try {
      // ── 1. Full passage audio ────────────────────────────────────────────────
      process.stdout.write(`  [1/2] Full audio (${fullText.length} chars)...`);
      const fullResult = await synthesizeWithTimestamps({ text: fullText, voiceId: ALICE });
      if (!fullResult) throw new Error('ElevenLabs returned null for full audio');

      const fullUrl = await upsertStorage(fullPath, fullResult.audio_buffer);
      const fullDurationMs = fullResult.word_timestamps.length > 0
        ? fullResult.word_timestamps[fullResult.word_timestamps.length - 1].end_ms
        : 0;
      console.log(` ✓ ${Math.round(fullDurationMs / 1000)}s, ${fullResult.word_timestamps.length} wts`);
      await sleep(1500);

      // ── 2. Per-paragraph audio ───────────────────────────────────────────────
      const existingParaAudio = Array.isArray(row.paragraph_audio) ? row.paragraph_audio : [];
      const newParaAudio = [];
      const wordTimestampsByPara = [];

      for (let i = 0; i < paras.length; i++) {
        const paraText = paras[i];
        // Derive paragraph path from existing or from ID
        const existingParaPath = existingParaAudio[i]?.audio_path;
        const paraPath = existingParaPath || `reading/L${row.level_number}/${row.id}/para_${i}.mp3`;

        process.stdout.write(`  [2/2] Para ${i + 1}/${paras.length} (${paraText.length} chars)...`);
        const paraResult = await synthesizeWithTimestamps({ text: paraText, voiceId: ALICE });
        if (!paraResult) throw new Error(`ElevenLabs returned null for para ${i}`);

        const paraUrl = await upsertStorage(paraPath, paraResult.audio_buffer);
        const paraDurationMs = paraResult.word_timestamps.length > 0
          ? paraResult.word_timestamps[paraResult.word_timestamps.length - 1].end_ms
          : 0;
        console.log(` ✓ ${Math.round(paraDurationMs / 1000)}s`);

        newParaAudio.push({
          paragraph_index: i,
          audio_url: paraUrl,
          audio_path: paraPath,
          duration_ms: paraDurationMs,
          text: paraText,
          char_count: paraText.length,
        });
        wordTimestampsByPara.push({ index: i, words: paraResult.word_timestamps });
        await sleep(1000);
      }

      // ── 3. Upsert reading_passage_audio ──────────────────────────────────────
      const { error: upsertErr } = await sb.from('reading_passage_audio').upsert({
        passage_id: row.id,
        full_audio_url: fullUrl,
        full_audio_path: fullPath,
        full_duration_ms: fullDurationMs,
        paragraph_audio: newParaAudio,
        word_timestamps: { all_words: fullResult.word_timestamps, paragraphs: wordTimestampsByPara },
        voice_id: 'alice',
        generated_at: new Date().toISOString(),
      }, { onConflict: 'passage_id' });

      if (upsertErr) throw new Error(`DB upsert reading_passage_audio: ${upsertErr.message}`);

      // ── 4. Update curriculum_readings mirror columns ───────────────────────
      const { error: updateErr } = await sb.from('curriculum_readings').update({
        passage_audio_url: fullUrl,
        audio_duration_seconds: Math.round(fullDurationMs / 1000),
        audio_generated_at: new Date().toISOString(),
      }).eq('id', row.id);

      if (updateErr) throw new Error(`DB update curriculum_readings: ${updateErr.message}`);

      console.log(`  ✓ All done — ${Math.round(fullDurationMs / 1000)}s full, ${paras.length} paras`);
      results.push({ id: row.id, level: row.level_number, unit: row.unit_number, label: row.reading_label, duration_s: Math.round(fullDurationMs / 1000), wt_count: fullResult.word_timestamps.length });
      success++;

    } catch (e) {
      console.error(`  ✗ FAILED: ${e.message}`);
      fail++;
    }
  }

  // Write results report
  const reportPath = path.join(ROOT, 'docs/audits/audio-issues/reading-regen-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    success, fail, results,
  }, null, 2));

  console.log(`\n=== Reading regen: ${success} succeeded, ${fail} failed ===`);
  console.log(`Report: ${reportPath}`);
  await closeDb();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
