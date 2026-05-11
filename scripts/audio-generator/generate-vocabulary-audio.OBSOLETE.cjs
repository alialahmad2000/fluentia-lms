/**
 * Generate vocabulary audio using ElevenLabs TTS
 *
 * Usage:
 *   node scripts/audio-generator/generate-vocabulary-audio.cjs --dry-run
 *   node scripts/audio-generator/generate-vocabulary-audio.cjs --level 0
 *   node scripts/audio-generator/generate-vocabulary-audio.cjs --level 0 --resume
 *   node scripts/audio-generator/generate-vocabulary-audio.cjs              # all levels
 *
 * Flags:
 *   --dry-run   Count chars only, do not generate audio
 *   --resume    Skip words that already have audio_url set
 *   --level N   Only process vocabulary for level N (0-5)
 *
 * Deduplication:
 *   Groups words case-insensitively. Generates audio once per unique word,
 *   then copies the same audio_url to all duplicate rows. Saves ~50% of
 *   ElevenLabs characters and generation time.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { ElevenLabsClient } = require('./elevenlabs-client.cjs');
const { SupabaseUploader } = require('./supabase-uploader.cjs');
const config = require('./config.cjs');

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ERRORS_FILE = path.join(__dirname, 'vocabulary-errors.json');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    resume: args.includes('--resume'),
    level: args.includes('--level') ? parseInt(args[args.indexOf('--level') + 1], 10) : null,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadVocabulary(levelFilter) {
  const { data: levels } = await sb.from('curriculum_levels').select('id, level_number');
  const { data: units } = await sb.from('curriculum_units').select('id, level_id, unit_number');
  const { data: readings } = await sb.from('curriculum_readings').select('id, unit_id, reading_label');

  const levelMap = {};
  (levels || []).forEach(l => { levelMap[l.id] = l; });
  const unitMap = {};
  (units || []).forEach(u => { unitMap[u.id] = u; });
  const readingMap = {};
  (readings || []).forEach(r => { readingMap[r.id] = r; });

  // Load vocabulary (paginated — Supabase default limit is 1000)
  let vocab = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from('curriculum_vocabulary')
      .select('id, word, reading_id, audio_url, audio_generated_at')
      .range(offset, offset + 999);
    if (error) throw new Error(`Failed to load vocabulary: ${error.message}`);
    if (!data || data.length === 0) break;
    vocab = vocab.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  if (vocab.length === 0) throw new Error('No vocabulary found');

  // Enrich with level/unit info
  const enriched = [];
  for (const v of vocab) {
    const reading = readingMap[v.reading_id];
    if (!reading) continue;
    const unit = unitMap[reading.unit_id];
    if (!unit) continue;
    const level = levelMap[unit.level_id];
    if (!level) continue;

    if (levelFilter !== null && level.level_number !== levelFilter) continue;

    enriched.push({
      id: v.id,
      word: v.word,
      levelNumber: level.level_number,
      unitNumber: unit.unit_number,
      readingLabel: reading.reading_label,
      audioUrl: v.audio_url,
      audioGeneratedAt: v.audio_generated_at,
    });
  }

  // Sort by level, unit, word
  enriched.sort((a, b) =>
    a.levelNumber - b.levelNumber || a.unitNumber - b.unitNumber || a.word.localeCompare(b.word)
  );

  return enriched;
}

/**
 * Deduplicate vocabulary: group by lowercase word.
 * Returns { uniqueWords: [...first occurrence], duplicates: Map<wordLower, [...other row ids]> }
 */
function deduplicateVocab(vocabList) {
  const seen = new Map(); // wordLower → first vocab entry
  const duplicates = new Map(); // wordLower → [ids of duplicate rows]

  for (const v of vocabList) {
    const key = v.word.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, v);
      duplicates.set(key, []);
    } else {
      duplicates.get(key).push(v.id);
    }
  }

  return {
    uniqueWords: Array.from(seen.values()),
    duplicates,
  };
}

async function main() {
  const { dryRun, resume, level } = parseArgs();

  console.log('========================================');
  console.log('  Vocabulary Audio Generator');
  console.log('========================================');
  console.log(`  Mode:    ${dryRun ? 'DRY RUN (no audio generated)' : 'GENERATE'}`);
  console.log(`  Resume:  ${resume ? 'YES (skip existing)' : 'NO'}`);
  console.log(`  Level:   ${level !== null ? level : 'ALL'}`);
  console.log('');

  // Load vocabulary
  console.log('Loading vocabulary from database...');
  const allVocab = await loadVocabulary(level);
  console.log(`  Found ${allVocab.length} total rows`);

  if (allVocab.length === 0) {
    console.log('No vocabulary to process.');
    return;
  }

  // Filter based on resume flag
  let toProcess = allVocab;
  if (resume) {
    toProcess = allVocab.filter(v => !v.audioUrl);
    console.log(`  After resume filter: ${toProcess.length} rows need audio`);
    console.log(`  Already done: ${allVocab.length - toProcess.length} rows`);
  }

  // Deduplicate
  const { uniqueWords, duplicates } = deduplicateVocab(toProcess);
  const totalDupes = toProcess.length - uniqueWords.length;

  console.log(`\n--- Deduplication ---`);
  console.log(`  Total rows:     ${toProcess.length}`);
  console.log(`  Unique words:   ${uniqueWords.length} (will generate audio)`);
  console.log(`  Duplicates:     ${totalDupes} (will copy audio_url)`);
  console.log(`  Savings:        ${totalDupes} fewer API calls`);

  // Group unique words by level for summary
  const byLevel = {};
  for (const v of uniqueWords) {
    if (!byLevel[v.levelNumber]) byLevel[v.levelNumber] = { count: 0, chars: 0 };
    byLevel[v.levelNumber].count++;
    byLevel[v.levelNumber].chars += v.word.length;
  }

  console.log('\n--- Per-Level Breakdown (unique words only) ---');
  let totalChars = 0;
  for (const ln of Object.keys(byLevel).sort((a, b) => a - b)) {
    const { count, chars } = byLevel[ln];
    totalChars += chars;
    console.log(`  Level ${ln}: ${count} unique words, ${chars} chars`);
  }
  console.log(`  ───────────────────────`);
  console.log(`  TOTAL: ${uniqueWords.length} unique words, ${totalChars} chars`);

  if (dryRun) {
    console.log('\n--- Dry Run Estimates ---');
    console.log(`  Characters to generate: ${totalChars.toLocaleString()}`);
    console.log(`  API requests needed:    ${uniqueWords.length}`);
    console.log(`  Est. time at 6s/req:    ${((uniqueWords.length * 6) / 60).toFixed(1)} minutes`);
    console.log(`  DB updates (copy URL):  ${totalDupes} duplicate rows`);

    // Check quota
    const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);
    try {
      const sub = await client.getSubscription();
      const remaining = sub.character_limit - sub.character_count;
      console.log(`\n--- ElevenLabs Quota ---`);
      console.log(`  Plan:      ${sub.tier}`);
      console.log(`  Remaining: ${remaining.toLocaleString()} / ${sub.character_limit.toLocaleString()} chars`);
      console.log(`  After gen: ${(remaining - totalChars).toLocaleString()} chars left`);
      if (totalChars > remaining) {
        console.log(`\n  WARNING: Not enough quota!`);
      } else {
        console.log(`\n  OK: Sufficient quota for this batch.`);
      }
    } catch (e) {
      console.log(`\n  Could not check quota: ${e.message}`);
    }

    // Show sample paths
    console.log('\n--- Sample Storage Paths ---');
    for (const v of uniqueWords.slice(0, 5)) {
      const storagePath = config.storagePaths.vocabulary(v.levelNumber, v.unitNumber, v.word);
      console.log(`  "${v.word}" → ${storagePath}`);
    }
    if (uniqueWords.length > 5) {
      console.log(`  ... and ${uniqueWords.length - 5} more`);
    }

    console.log('\nDry run complete. Remove --dry-run to generate audio.');
    return;
  }

  // === ACTUAL GENERATION ===
  const voiceId = config.voices.british_male.id;
  const ttsSettings = config.settings.vocabulary;

  console.log(`\n--- Generating Audio ---`);
  console.log(`  Voice: ${config.voices.british_male.name} (${voiceId})`);
  console.log(`  Model: ${ttsSettings.modelId}`);
  console.log(`  Format: ${ttsSettings.outputFormat}\n`);

  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);
  const uploader = new SupabaseUploader();

  // Check quota before starting
  const sub = await client.getSubscription();
  const remaining = sub.character_limit - sub.character_count;
  if (totalChars > remaining) {
    console.log(`ERROR: Not enough quota. Need ${totalChars} chars but only ${remaining} remaining.`);
    process.exit(1);
  }

  const errors = [];
  let successCount = 0;
  let dupeUpdateCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < uniqueWords.length; i++) {
    const v = uniqueWords[i];
    const storagePath = config.storagePaths.vocabulary(v.levelNumber, v.unitNumber, v.word);
    const progress = `[${i + 1}/${uniqueWords.length}]`;
    const wordKey = v.word.toLowerCase().trim();

    let retries = 0;
    let success = false;

    while (retries <= config.rateLimits.maxRetries && !success) {
      try {
        // Generate audio
        const audioBuffer = await client.generateSpeech(v.word, voiceId, {
          modelId: ttsSettings.modelId,
          stability: ttsSettings.stability,
          similarityBoost: ttsSettings.similarityBoost,
          style: ttsSettings.style,
          outputFormat: ttsSettings.outputFormat,
        });

        // Upload to Supabase Storage
        const publicUrl = await uploader.upload(audioBuffer, storagePath);
        const now = new Date().toISOString();

        // Update primary row
        await uploader.updateRecord('curriculum_vocabulary', v.id, {
          audio_url: publicUrl,
          audio_generated_at: now,
        });

        // Copy audio_url to all duplicate rows
        const dupeIds = duplicates.get(wordKey) || [];
        for (const dupeId of dupeIds) {
          await uploader.updateRecord('curriculum_vocabulary', dupeId, {
            audio_url: publicUrl,
            audio_generated_at: now,
          });
          dupeUpdateCount++;
        }

        successCount++;
        success = true;
        const kb = (audioBuffer.length / 1024).toFixed(1);
        const dupeNote = dupeIds.length > 0 ? ` (+${dupeIds.length} copies)` : '';
        console.log(`  ${progress} L${v.levelNumber}U${v.unitNumber} "${v.word}" → ${kb}KB${dupeNote}`);

      } catch (err) {
        retries++;
        if (retries <= config.rateLimits.maxRetries) {
          console.log(`  ${progress} "${v.word}" RETRY ${retries}/${config.rateLimits.maxRetries}: ${err.message}`);
          await sleep(config.rateLimits.retryDelay);
        } else {
          console.log(`  ${progress} "${v.word}" FAILED after ${config.rateLimits.maxRetries} retries: ${err.message}`);
          errors.push({
            id: v.id,
            word: v.word,
            level: v.levelNumber,
            unit: v.unitNumber,
            dupeIds: duplicates.get(wordKey) || [],
            error: err.message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Rate limiting — wait between requests (skip on last item)
    if (i < uniqueWords.length - 1) {
      await sleep(config.rateLimits.delayBetweenRequests);
    }

    // Budget check every 50 words
    if ((i + 1) % 50 === 0) {
      const stats = client.getStats();
      const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
      console.log(`\n  --- Checkpoint (${elapsed} min) ---`);
      console.log(`  Generated: ${stats.requests}, Chars: ${stats.characters}, Dupes updated: ${dupeUpdateCount}, Errors: ${errors.length}`);
      console.log('');
    }
  }

  // Save errors
  if (errors.length > 0) {
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
    console.log(`\nErrors saved to: ${ERRORS_FILE}`);
  }

  // Final summary
  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  const stats = client.getStats();
  const uploadStats = uploader.getStats();

  console.log('\n========================================');
  console.log('  Generation Complete');
  console.log('========================================');
  console.log(`  Generated:     ${successCount}/${uniqueWords.length} unique words`);
  console.log(`  Dupes updated: ${dupeUpdateCount} rows (copied audio_url)`);
  console.log(`  Total covered: ${successCount + dupeUpdateCount} / ${toProcess.length} rows`);
  console.log(`  Errors:        ${errors.length}`);
  console.log(`  Chars used:    ${stats.characters.toLocaleString()}`);
  console.log(`  Uploaded:      ${uploadStats.uploads} files (${uploadStats.totalMB} MB)`);
  console.log(`  Time:          ${elapsed} minutes`);
  console.log('========================================');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
