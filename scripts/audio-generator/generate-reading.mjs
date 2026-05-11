/**
 * generate-reading.mjs — Reading Passage Audio V2
 *
 * For each curriculum_readings row:
 *   - Joins passage_content.paragraphs into full text
 *   - Generates one audio with word timestamps (Alice voice)
 *   - Uploads to storage: reading/L{level_num}/{passage_id}/full.mp3
 *   - Inserts reading_passage_audio row
 *   - Updates curriculum_readings.passage_audio_url
 *
 * Flags: --dry-run, --level=0,1,2,..., --force (re-generate even if audio exists)
 */

import 'dotenv/config';
import pLimit from 'p-limit';
import { query, closeDb } from './lib/db.mjs';
import { synthesizeWithTimestamps } from './lib/eleven.mjs';
import { readingPath, audioExists, uploadAudio } from './lib/storage.mjs';
import { logUsage } from './lib/budget.mjs';

const ALICE_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';
const CONCURRENCY = 2;

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');
const levelArg = process.argv.find(a => a.startsWith('--level='));
const LEVEL_FILTER = levelArg ? levelArg.split('=')[1].split(',').map(Number) : null;

export async function runReading({ dryRun = DRY_RUN } = {}) {
  // Fetch all passages with level info
  let sql = `
    SELECT cr.id, cr.passage_content, cr.passage_audio_url,
           cl.level_number
    FROM curriculum_readings cr
    JOIN curriculum_units cu ON cr.unit_id = cu.id
    JOIN curriculum_levels cl ON cu.level_id = cl.id
  `;
  if (LEVEL_FILTER) sql += ` AND cl.level_number IN (${LEVEL_FILTER.join(',')})`;
  sql += ' ORDER BY cl.level_number, cu.sort_order, cr.sort_order';

  const passages = await query(sql);

  // Filter those that need generation
  const toGenerate = FORCE
    ? passages
    : passages.filter(p => !p.passage_audio_url);

  const totalChars = toGenerate.reduce((acc, p) => {
    const pc = p.passage_content;
    const paragraphs = pc?.paragraphs || [];
    const text = paragraphs.join('\n\n');
    return acc + text.length;
  }, 0);

  console.log(`[reading] ${toGenerate.length} passages to generate, ~${totalChars.toLocaleString()} chars`);

  if (dryRun) {
    return { count: toGenerate.length, chars: totalChars, type: 'reading' };
  }

  const limit = pLimit(CONCURRENCY);
  let success = 0, fail = 0, consecFail = 0;
  const failures = [];

  await Promise.all(toGenerate.map(passage => limit(async () => {
    const pc = passage.passage_content;
    const paragraphs = pc?.paragraphs || [];
    if (!paragraphs.length) {
      console.warn(`[reading] ${passage.id} has no paragraphs — skipping`);
      return;
    }

    const text = paragraphs.join('\n\n');
    const storagePath = readingPath(passage.level_number, passage.id);
    const label = `[reading] L${passage.level_number}/${passage.id.substring(0, 8)}`;

    // Resume check
    if (!FORCE) {
      const exists = await audioExists(storagePath);
      if (exists) {
        console.log(`${label} → already in storage, skipping`);
        success++;
        return;
      }
    }

    console.log(`${label} → generating (${text.length} chars)...`);
    const t0 = Date.now();

    const result = await synthesizeWithTimestamps({ text, voiceId: ALICE_VOICE_ID });
    if (!result) {
      console.error(`${label} → FAILED synthesis`);
      fail++; consecFail++;
      failures.push({ id: passage.id, reason: 'synthesis failed' });
      if (consecFail >= 5) throw new Error('[reading] 5 consecutive failures — aborting');
      return;
    }

    consecFail = 0;
    const { audio_buffer, word_timestamps, char_count } = result;

    let uploaded;
    try {
      uploaded = await uploadAudio(storagePath, audio_buffer);
    } catch (e) {
      console.error(`${label} → upload FAILED: ${e.message}`);
      fail++;
      failures.push({ id: passage.id, reason: e.message });
      return;
    }

    // Build paragraph_audio: map paragraph text ranges to timestamp ranges
    const paragraphAudio = buildParagraphAudio(paragraphs, word_timestamps, uploaded.url);

    // Upsert reading_passage_audio
    await query(`
      INSERT INTO reading_passage_audio
        (passage_id, full_audio_url, full_audio_path, full_duration_ms, paragraph_audio, word_timestamps, voice_id, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      ON CONFLICT (passage_id) DO UPDATE SET
        full_audio_url = EXCLUDED.full_audio_url,
        full_audio_path = EXCLUDED.full_audio_path,
        full_duration_ms = EXCLUDED.full_duration_ms,
        paragraph_audio = EXCLUDED.paragraph_audio,
        word_timestamps = EXCLUDED.word_timestamps,
        voice_id = EXCLUDED.voice_id,
        generated_at = now()
    `, [
      passage.id,
      uploaded.url,
      uploaded.path,
      word_timestamps.length ? word_timestamps[word_timestamps.length - 1].end_ms : 0,
      JSON.stringify(paragraphAudio),
      JSON.stringify(word_timestamps),
      ALICE_VOICE_ID,
    ]);

    // Update curriculum_readings.passage_audio_url
    await query(`
      UPDATE curriculum_readings SET passage_audio_url = $1, audio_generated_at = now()
      WHERE id = $2
    `, [uploaded.url, passage.id]);

    await logUsage({ charCount: char_count, voiceId: ALICE_VOICE_ID, durationMs: word_timestamps.length ? word_timestamps[word_timestamps.length - 1].end_ms : 0 });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`${label} → ✓ ${elapsed}s (${char_count} chars)`);
    success++;
  })));

  return { success, fail, chars: totalChars, failures, type: 'reading' };
}

function buildParagraphAudio(paragraphs, wordTimestamps, fullUrl) {
  // Assign approximate word ranges to paragraphs
  const result = [];
  let wordIdx = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const paraWords = paragraphs[i].trim().split(/\s+/).filter(Boolean).length;
    const start = wordIdx < wordTimestamps.length ? wordTimestamps[wordIdx] : null;
    const endIdx = Math.min(wordIdx + paraWords - 1, wordTimestamps.length - 1);
    const end = endIdx >= 0 && wordTimestamps[endIdx] ? wordTimestamps[endIdx] : null;
    result.push({
      index: i,
      text: paragraphs[i],
      audio_url: fullUrl,
      start_ms: start?.start_ms ?? 0,
      end_ms: end?.end_ms ?? 0,
      word_count: paraWords,
    });
    wordIdx += paraWords;
  }
  return result;
}

if (process.argv[1].endsWith('generate-reading.mjs')) {
  import('./lib/budget.mjs').then(async ({ assertBudget }) => {
    import('./lib/eleven.mjs').then(async ({ getQuota }) => {
      if (!DRY_RUN) {
        const quota = await getQuota();
        console.log(`[reading] ElevenLabs remaining: ${quota.remaining.toLocaleString()}`);
      }
      const result = await runReading();
      if (DRY_RUN) {
        console.log(`[reading] DRY RUN: ${result.count} items, ~${result.chars.toLocaleString()} chars`);
      } else {
        console.log(`[reading] Done: ${result.success} OK, ${result.fail} failed`);
        if (result.failures?.length) console.log('[reading] Failures:', result.failures);
      }
      await closeDb();
    });
  });
}
