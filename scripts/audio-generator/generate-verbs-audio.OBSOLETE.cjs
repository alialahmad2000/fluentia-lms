/**
 * Generate irregular verbs audio using ElevenLabs TTS
 *
 * Usage:
 *   node scripts/audio-generator/generate-verbs-audio.cjs --dry-run
 *   node scripts/audio-generator/generate-verbs-audio.cjs --level 0
 *   node scripts/audio-generator/generate-verbs-audio.cjs --resume
 *   node scripts/audio-generator/generate-verbs-audio.cjs
 *
 * Each verb generates 3 audio files: base, past, participle.
 * Deduplicates: same verb text across levels generates audio once.
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

const ERRORS_FILE = path.join(__dirname, 'verbs-errors.json');

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

async function loadVerbs(levelFilter) {
  const { data: levels } = await sb.from('curriculum_levels').select('id, level_number');
  const levelMap = {};
  (levels || []).forEach(l => { levelMap[l.id] = l; });

  const { data: verbs, error } = await sb
    .from('curriculum_irregular_verbs')
    .select('id, level_id, verb_base, verb_past, verb_past_participle, audio_base_url, audio_past_url, audio_pp_url, audio_generated_at, sort_order');

  if (error) throw new Error(`Failed to load verbs: ${error.message}`);
  if (!verbs || verbs.length === 0) throw new Error('No irregular verbs found');

  const enriched = [];
  for (const v of verbs) {
    const level = levelMap[v.level_id];
    if (!level) continue;
    if (levelFilter !== null && level.level_number !== levelFilter) continue;

    enriched.push({
      id: v.id,
      verbBase: v.verb_base,
      verbPast: v.verb_past,
      verbPP: v.verb_past_participle,
      levelNumber: level.level_number,
      audioBaseUrl: v.audio_base_url,
      audioPastUrl: v.audio_past_url,
      audioPpUrl: v.audio_pp_url,
      audioGeneratedAt: v.audio_generated_at,
      sortOrder: v.sort_order,
    });
  }

  enriched.sort((a, b) => a.levelNumber - b.levelNumber || a.sortOrder - b.sortOrder);
  return enriched;
}

/**
 * Deduplicate verb forms. A "form" is a unique text string (e.g. "took").
 * Many verbs share forms across levels (e.g. "take" appears in multiple levels).
 * Returns { uniqueForms: [{text, form, firstVerb}], formToDupes: Map }
 */
function deduplicateVerbForms(verbList) {
  // Collect all individual form texts we need audio for
  const seen = new Map(); // textLower → { text, form, verb }
  const dupes = new Map(); // textLower → [{ verbId, form }]

  for (const v of verbList) {
    const forms = [
      { text: v.verbBase, form: 'base', urlField: 'audioBaseUrl' },
      { text: v.verbPast, form: 'past', urlField: 'audioPastUrl' },
      { text: v.verbPP, form: 'participle', urlField: 'audioPpUrl' },
    ];

    for (const f of forms) {
      const key = f.text.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, { text: f.text, form: f.form, verb: v });
        dupes.set(key, []);
      } else {
        dupes.get(key).push({ verbId: v.id, form: f.form });
      }
    }
  }

  return {
    uniqueForms: Array.from(seen.values()),
    formToDupes: dupes,
  };
}

async function main() {
  const { dryRun, resume, level } = parseArgs();

  console.log('========================================');
  console.log('  Irregular Verbs Audio Generator');
  console.log('========================================');
  console.log(`  Mode:    ${dryRun ? 'DRY RUN (no audio generated)' : 'GENERATE'}`);
  console.log(`  Resume:  ${resume ? 'YES (skip existing)' : 'NO'}`);
  console.log(`  Level:   ${level !== null ? level : 'ALL'}`);
  console.log('');

  console.log('Loading irregular verbs from database...');
  let allVerbs = await loadVerbs(level);
  console.log(`  Found ${allVerbs.length} verbs (${allVerbs.length * 3} total forms)`);

  if (allVerbs.length === 0) {
    console.log('No verbs to process.');
    return;
  }

  // Filter for resume
  if (resume) {
    const before = allVerbs.length;
    allVerbs = allVerbs.filter(v => !v.audioBaseUrl || !v.audioPastUrl || !v.audioPpUrl);
    console.log(`  After resume filter: ${allVerbs.length} verbs need audio`);
    console.log(`  Already done: ${before - allVerbs.length} verbs`);
  }

  // Deduplicate forms
  const { uniqueForms, formToDupes } = deduplicateVerbForms(allVerbs);
  const totalFormCount = allVerbs.length * 3;
  const totalDupes = totalFormCount - uniqueForms.length;

  console.log(`\n--- Deduplication ---`);
  console.log(`  Total forms:    ${totalFormCount} (${allVerbs.length} verbs x 3)`);
  console.log(`  Unique texts:   ${uniqueForms.length} (will generate audio)`);
  console.log(`  Duplicates:     ${totalDupes} (will copy audio_url)`);

  // Calculate chars
  let totalChars = 0;
  const charsByLevel = {};
  for (const uf of uniqueForms) {
    const ln = uf.verb.levelNumber;
    const chars = uf.text.length;
    totalChars += chars;
    if (!charsByLevel[ln]) charsByLevel[ln] = { count: 0, chars: 0 };
    charsByLevel[ln].count++;
    charsByLevel[ln].chars += chars;
  }

  console.log('\n--- Per-Level Breakdown (unique forms only) ---');
  for (const ln of Object.keys(charsByLevel).sort((a, b) => a - b)) {
    console.log(`  Level ${ln}: ${charsByLevel[ln].count} unique forms, ${charsByLevel[ln].chars} chars`);
  }
  console.log(`  ───────────────────────`);
  console.log(`  TOTAL: ${uniqueForms.length} unique forms, ${totalChars} chars`);

  if (dryRun) {
    console.log('\n--- Dry Run Estimates ---');
    console.log(`  Characters to generate: ${totalChars.toLocaleString()}`);
    console.log(`  API requests needed:    ${uniqueForms.length}`);
    console.log(`  Est. time at 6s/req:    ${((uniqueForms.length * 6) / 60).toFixed(1)} minutes`);
    console.log(`  DB updates (copy URL):  ${totalDupes} duplicate forms`);

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

    // Sample paths
    console.log('\n--- Sample Storage Paths ---');
    for (const uf of uniqueForms.slice(0, 6)) {
      const v = uf.verb;
      const storagePath = config.storagePaths.irregular_verb(v.levelNumber, 0, uf.text, uf.form);
      console.log(`  "${uf.text}" (${uf.form}) → ${storagePath}`);
    }
    if (uniqueForms.length > 6) console.log(`  ... and ${uniqueForms.length - 6} more`);

    console.log('\nDry run complete. Remove --dry-run to generate audio.');
    return;
  }

  // === ACTUAL GENERATION ===
  const voiceId = config.voices.british_male.id;
  const ttsSettings = config.settings.irregular_verbs;

  console.log(`\n--- Generating Audio ---`);
  console.log(`  Voice: ${config.voices.british_male.name} (${voiceId})`);
  console.log(`  Model: ${ttsSettings.modelId}`);
  console.log(`  Format: ${ttsSettings.outputFormat}\n`);

  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);
  const uploader = new SupabaseUploader();

  const sub = await client.getSubscription();
  const remaining = sub.character_limit - sub.character_count;
  if (totalChars > remaining) {
    console.log(`ERROR: Not enough quota. Need ${totalChars} chars but only ${remaining} remaining.`);
    process.exit(1);
  }

  // Map form name to DB column
  const formToColumn = {
    base: 'audio_base_url',
    past: 'audio_past_url',
    participle: 'audio_pp_url',
  };

  const errors = [];
  let successCount = 0;
  let dupeUpdateCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < uniqueForms.length; i++) {
    const uf = uniqueForms[i];
    const v = uf.verb;
    const textKey = uf.text.toLowerCase().trim();
    const storagePath = config.storagePaths.irregular_verb(v.levelNumber, 0, uf.text, uf.form);
    const progress = `[${i + 1}/${uniqueForms.length}]`;

    let retries = 0;
    let success = false;

    while (retries <= config.rateLimits.maxRetries && !success) {
      try {
        const audioBuffer = await client.generateSpeech(uf.text, voiceId, {
          modelId: ttsSettings.modelId,
          stability: ttsSettings.stability,
          similarityBoost: ttsSettings.similarityBoost,
          style: ttsSettings.style,
          outputFormat: ttsSettings.outputFormat,
        });

        const publicUrl = await uploader.upload(audioBuffer, storagePath);
        const now = new Date().toISOString();

        // Update primary row
        const updateObj = { [formToColumn[uf.form]]: publicUrl };
        // Only set audio_generated_at if all 3 forms would be done (set it anyway, it's a timestamp)
        updateObj.audio_generated_at = now;
        await uploader.updateRecord('curriculum_irregular_verbs', v.id, updateObj);

        // Copy to duplicates
        const dupeList = formToDupes.get(textKey) || [];
        for (const dupe of dupeList) {
          const dupeUpdate = { [formToColumn[dupe.form]]: publicUrl, audio_generated_at: now };
          await uploader.updateRecord('curriculum_irregular_verbs', dupe.verbId, dupeUpdate);
          dupeUpdateCount++;
        }

        successCount++;
        success = true;
        const kb = (audioBuffer.length / 1024).toFixed(1);
        const dupeNote = dupeList.length > 0 ? ` (+${dupeList.length} copies)` : '';
        console.log(`  ${progress} L${v.levelNumber} "${uf.text}" (${uf.form}) → ${kb}KB${dupeNote}`);

      } catch (err) {
        retries++;
        if (retries <= config.rateLimits.maxRetries) {
          console.log(`  ${progress} "${uf.text}" RETRY ${retries}/${config.rateLimits.maxRetries}: ${err.message}`);
          await sleep(config.rateLimits.retryDelay);
        } else {
          console.log(`  ${progress} "${uf.text}" FAILED: ${err.message}`);
          errors.push({
            verbId: v.id,
            text: uf.text,
            form: uf.form,
            level: v.levelNumber,
            error: err.message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    if (i < uniqueForms.length - 1) {
      await sleep(config.rateLimits.delayBetweenRequests);
    }

    if ((i + 1) % 50 === 0) {
      const stats = client.getStats();
      const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
      console.log(`\n  --- Checkpoint (${elapsed} min) ---`);
      console.log(`  Generated: ${stats.requests}, Chars: ${stats.characters}, Dupes: ${dupeUpdateCount}, Errors: ${errors.length}`);
      console.log('');
    }
  }

  if (errors.length > 0) {
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
    console.log(`\nErrors saved to: ${ERRORS_FILE}`);
  }

  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  const stats = client.getStats();
  const uploadStats = uploader.getStats();

  console.log('\n========================================');
  console.log('  Generation Complete');
  console.log('========================================');
  console.log(`  Generated:     ${successCount}/${uniqueForms.length} unique forms`);
  console.log(`  Dupes updated: ${dupeUpdateCount} rows`);
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
