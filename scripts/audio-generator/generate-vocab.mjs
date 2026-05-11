/**
 * generate-vocab.mjs — Vocabulary Audio V2
 *
 * For each curriculum_vocabulary row with no audio_url:
 *   - Generates word pronunciation only (no example sentence)
 *   - Voice: George (JBFqnCBsd6RMkjVDRZzb) — British male
 *   - Uploads to vocab/L{level_num}/{word_id}.mp3
 *   - Updates curriculum_vocabulary.audio_url
 *
 * Flags: --dry-run, --level=0,1,..., --force, --limit=N
 */

import 'dotenv/config';
import pLimit from 'p-limit';
import { query, closeDb } from './lib/db.mjs';
import { synthesizeSimple } from './lib/eleven.mjs';
import { vocabPath, audioExists, uploadAudio } from './lib/storage.mjs';
import { logUsage } from './lib/budget.mjs';
import { getPublicUrl } from './lib/storage.mjs';

const GEORGE_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const CONCURRENCY = 5;

const DRY_RUN  = process.argv.includes('--dry-run');
const FORCE    = process.argv.includes('--force');
const levelArg = process.argv.find(a => a.startsWith('--level='));
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LEVEL_FILTER = levelArg ? levelArg.split('=')[1].split(',').map(Number) : null;
const LIMIT_N = limitArg ? parseInt(limitArg.split('=')[1]) : null;

export async function runVocab({ dryRun = DRY_RUN } = {}) {
  let sql = `
    SELECT cv.id, cv.word, cv.audio_url,
           cl.level_number
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cv.reading_id = cr.id
    JOIN curriculum_units cu ON cr.unit_id = cu.id
    JOIN curriculum_levels cl ON cu.level_id = cl.id
  `;
  const conditions = [];
  if (!FORCE) conditions.push('cv.audio_url IS NULL');
  if (LEVEL_FILTER) conditions.push(`cl.level_number IN (${LEVEL_FILTER.join(',')})`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY cl.level_number, cv.sort_order';
  if (LIMIT_N) sql += ` LIMIT ${LIMIT_N}`;

  const words = await query(sql);
  const totalChars = words.reduce((acc, w) => acc + (w.word?.length || 0), 0);

  console.log(`[vocab] ${words.length} words to generate, ~${totalChars.toLocaleString()} chars`);

  if (dryRun) {
    return { count: words.length, chars: totalChars, type: 'vocab' };
  }

  const limit = pLimit(CONCURRENCY);
  let success = 0, fail = 0, consecFail = 0;
  const failures = [];

  await Promise.all(words.map(w => limit(async () => {
    const storagePath = vocabPath(w.level_number, w.id);
    const label = `[vocab] L${w.level_number}/${w.word}`;

    const t0 = Date.now();
    const result = await synthesizeSimple({ text: w.word, voiceId: GEORGE_VOICE_ID });
    if (!result) {
      console.error(`${label} → FAILED`);
      fail++; consecFail++;
      failures.push({ id: w.id, word: w.word, reason: 'synthesis failed' });
      if (consecFail >= 5) throw new Error('[vocab] 5 consecutive failures — aborting');
      return;
    }

    consecFail = 0;
    const { audio_buffer, char_count } = result;

    let uploaded;
    try {
      uploaded = await uploadAudio(storagePath, audio_buffer);
    } catch (e) {
      // File may already exist in storage (upsert=false) — use public URL
      uploaded = { url: getPublicUrl(storagePath), path: storagePath };
    }

    await query(
      'UPDATE curriculum_vocabulary SET audio_url=$1, audio_generated_at=now(), audio_duration_ms=$2, audio_voice_name=$3 WHERE id=$4',
      [uploaded.url, null, 'George', w.id]
    );

    await logUsage({ charCount: char_count, voiceId: GEORGE_VOICE_ID, durationMs: 0 });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`${label} → ✓ ${elapsed}s`);
    success++;
  })));

  return { success, fail, chars: totalChars, failures, type: 'vocab' };
}

if (process.argv[1].endsWith('generate-vocab.mjs')) {
  const result = await runVocab();
  if (DRY_RUN) {
    console.log(`[vocab] DRY RUN: ${result.count} items, ~${result.chars.toLocaleString()} chars`);
  } else {
    console.log(`[vocab] Done: ${result.success} OK, ${result.fail} failed`);
    if (result.failures?.length) console.log('[vocab] Failures:', result.failures);
  }
  await closeDb();
}
