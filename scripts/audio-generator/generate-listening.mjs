/**
 * generate-listening.mjs — Listening Audio V2 (multi-voice)
 *
 * For each curriculum_listening row with speaker_segments:
 *   - Generates one audio per segment using the pre-assigned voice_id
 *   - Uploads to listening/L{level}/id/s{idx}_{speaker}.mp3
 *   - Inserts listening_audio rows
 *   - Updates curriculum_listening.audio_url with first segment URL
 *
 * Flags: --dry-run, --level=0,1,..., --force
 */

import 'dotenv/config';
import pLimit from 'p-limit';
import { query, closeDb } from './lib/db.mjs';
import { synthesizeWithTimestamps } from './lib/eleven.mjs';
import { listeningPath, audioExists, uploadAudio } from './lib/storage.mjs';
import { logUsage } from './lib/budget.mjs';

// Fallback voice map if segment has no voice_id
const VOICE_MAP = {
  A: 'JBFqnCBsd6RMkjVDRZzb',       // George — British male
  B: 'Xb7hH8MSUJpSbSDYk0k2',        // Alice — British female
  C: 'iP95p4xoKVk53GoZ742B',         // Chris — American male
  D: 'EXAVITQu4vr4xnSDxMaL',         // Sarah — American female
  Narrator: 'nPczCjzI2devNBz1zQrb',  // Brian — American male
};
const FALLBACK_VOICES = Object.values(VOICE_MAP);

const CONCURRENCY = 3;
const DRY_RUN   = process.argv.includes('--dry-run');
const FORCE     = process.argv.includes('--force');
const levelArg  = process.argv.find(a => a.startsWith('--level='));
const LEVEL_FILTER = levelArg ? levelArg.split('=')[1].split(',').map(Number) : null;

export async function runListening({ dryRun = DRY_RUN } = {}) {
  let sql = `
    SELECT cl.id, cl.audio_url, cl.speaker_segments, cl.transcript, cl.audio_type,
           lv.level_number
    FROM curriculum_listening cl
    JOIN curriculum_units cu ON cl.unit_id = cu.id
    JOIN curriculum_levels lv ON cu.level_id = lv.id
    WHERE cl.speaker_segments IS NOT NULL
  `;
  if (LEVEL_FILTER) sql += ` AND lv.level_number IN (${LEVEL_FILTER.join(',')})`;
  sql += ' ORDER BY lv.level_number, cu.sort_order, cl.sort_order';

  const transcripts = await query(sql);
  const toGenerate = FORCE ? transcripts : transcripts.filter(t => !t.audio_url);

  let totalChars = 0;
  let totalSegments = 0;
  for (const t of toGenerate) {
    const segs = t.speaker_segments || [];
    for (const s of segs) {
      totalChars += s.char_count || s.text?.length || 0;
      totalSegments++;
    }
  }

  console.log(`[listening] ${toGenerate.length} transcripts, ${totalSegments} segments, ~${totalChars.toLocaleString()} chars`);

  if (dryRun) {
    return { count: toGenerate.length, chars: totalChars, type: 'listening' };
  }

  const limit = pLimit(CONCURRENCY);
  let success = 0, fail = 0, consecFail = 0;
  const failures = [];

  await Promise.all(toGenerate.map(transcript => limit(async () => {
    const segs = transcript.speaker_segments || [];
    if (!segs.length) {
      console.warn(`[listening] ${transcript.id} has no speaker_segments — skipping`);
      return;
    }

    const label = `[listening] L${transcript.level_number}/${transcript.id.substring(0, 8)} (${transcript.audio_type})`;
    let firstSegUrl = null;
    let allWordTs = [];
    let transcriptFailed = false;

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const voiceId = seg.voice_id || FALLBACK_VOICES[i % FALLBACK_VOICES.length];
      const speakerLabel = seg.speaker || `S${i}`;
      const storagePath = listeningPath(transcript.level_number, transcript.id, i, speakerLabel);
      const segLabel = `${label} seg${i}(${speakerLabel})`;

      // Check if already in listening_audio
      if (!FORCE) {
        const existing = await query(
          'SELECT id FROM listening_audio WHERE transcript_id=$1 AND segment_index=$2',
          [transcript.id, i]
        );
        if (existing.length) {
          console.log(`${segLabel} → already exists, skipping`);
          if (i === 0) {
            const row = await query('SELECT audio_url FROM listening_audio WHERE transcript_id=$1 AND segment_index=0', [transcript.id]);
            if (row.length) firstSegUrl = row[0].audio_url;
          }
          continue;
        }
      }

      const t0 = Date.now();
      const result = await synthesizeWithTimestamps({ text: seg.text, voiceId });
      if (!result) {
        console.error(`${segLabel} → FAILED synthesis`);
        fail++; consecFail++;
        failures.push({ id: transcript.id, segment: i, reason: 'synthesis failed' });
        transcriptFailed = true;
        if (consecFail >= 5) throw new Error('[listening] 5 consecutive failures — aborting');
        continue;
      }

      consecFail = 0;
      const { audio_buffer, word_timestamps, char_count } = result;

      let uploaded;
      try {
        uploaded = await uploadAudio(storagePath, audio_buffer);
      } catch (e) {
        console.error(`${segLabel} → upload FAILED: ${e.message}`);
        fail++;
        failures.push({ id: transcript.id, segment: i, reason: e.message });
        transcriptFailed = true;
        continue;
      }

      const durationMs = word_timestamps.length ? word_timestamps[word_timestamps.length - 1].end_ms : 0;

      await query(`
        INSERT INTO listening_audio
          (transcript_id, segment_index, speaker_label, voice_id, audio_url, audio_path, duration_ms, text_content, word_timestamps, char_count, generated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
        ON CONFLICT (transcript_id, segment_index) DO UPDATE SET
          audio_url=EXCLUDED.audio_url, audio_path=EXCLUDED.audio_path,
          duration_ms=EXCLUDED.duration_ms, word_timestamps=EXCLUDED.word_timestamps,
          generated_at=now()
      `, [
        transcript.id, i, speakerLabel, voiceId,
        uploaded.url, uploaded.path, durationMs,
        seg.text, JSON.stringify(word_timestamps), char_count,
      ]);

      await logUsage({ charCount: char_count, voiceId, durationMs });

      if (i === 0) firstSegUrl = uploaded.url;
      allWordTs = allWordTs.concat(word_timestamps);

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`${segLabel} → ✓ ${elapsed}s (${char_count} chars)`);
    }

    // Update curriculum_listening with first segment URL (enables current frontend)
    if (firstSegUrl) {
      await query(`
        UPDATE curriculum_listening
        SET audio_url=$1, audio_generated_at=now()
        WHERE id=$2
      `, [firstSegUrl, transcript.id]);
    }

    if (!transcriptFailed) success++;
    else fail++;
  })));

  return { success, fail, chars: totalChars, failures, type: 'listening' };
}

if (process.argv[1].endsWith('generate-listening.mjs')) {
  const result = await runListening();
  if (DRY_RUN) {
    console.log(`[listening] DRY RUN: ${result.count} items, ~${result.chars.toLocaleString()} chars`);
  } else {
    console.log(`[listening] Done: ${result.success} OK, ${result.fail} failed`);
    if (result.failures?.length) console.log('[listening] Failures:', result.failures);
  }
  await closeDb();
}
