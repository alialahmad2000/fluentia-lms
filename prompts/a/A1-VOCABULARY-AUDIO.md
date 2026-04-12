# Agent 1 — Generate Vocabulary Pronunciations

## Context
Fluentia LMS Phase 3: Audio Generation. Infrastructure is already set up (P0 complete).
- ElevenLabs client: `scripts/audio-generator/elevenlabs-client.cjs`
- Supabase uploader: `scripts/audio-generator/supabase-uploader.cjs`
- Config: `scripts/audio-generator/config.cjs`
- Storage bucket: `curriculum-audio` (already created)
- Voice IDs: Already set in config.cjs by Ali

## Goal
Generate pronunciation audio for ALL vocabulary words across all 6 levels (0-5).
Each word gets one MP3 file with clear British pronunciation.

**Estimated: ~2,800 words × ~8 chars average = ~22,000 characters**

---

## Step 1: Build the Vocabulary Audio Generator

Create `scripts/audio-generator/generate-vocabulary-audio.cjs`:

```javascript
/**
 * Generate pronunciation audio for all vocabulary words
 * Run: node scripts/audio-generator/generate-vocabulary-audio.cjs [--level N] [--dry-run]
 *
 * Options:
 *   --level N    Only process level N (0-5)
 *   --dry-run    Count characters without generating audio
 *   --resume     Skip words that already have pronunciation_url
 */

require('dotenv').config();
const { ElevenLabsClient } = require('./elevenlabs-client.cjs');
const { SupabaseUploader } = require('./supabase-uploader.cjs');
const config = require('./config.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const levelArg = args.find((a, i) => args[i - 1] === '--level');
  const targetLevel = levelArg ? parseInt(levelArg) : null;

  console.log('🎙️ Vocabulary Pronunciation Generator');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Resume: ${resume ? 'Yes (skip existing)' : 'No (regenerate all)'}`);
  if (targetLevel !== null) console.log(`   Level: ${targetLevel} only`);
  console.log('');

  // Check quota first
  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);
  const sub = await client.getSubscription();
  const remaining = sub.character_limit - sub.character_count;
  console.log(`📊 Characters remaining: ${remaining.toLocaleString()}`);

  // Fetch all vocabulary with level/unit info
  let query = supabase
    .from('curriculum_vocabulary')
    .select(`
      id, word,
      unit:curriculum_units!inner(
        id, unit_number,
        level:curriculum_levels!inner(id, level_number)
      )
    `)
    .order('id');

  // If resume mode, only get words without audio
  if (resume) {
    query = query.is('pronunciation_url', null);
  }

  const { data: words, error } = await query;
  if (error) {
    console.error('❌ DB query failed:', error.message);
    process.exit(1);
  }

  // Filter by level if specified
  let filtered = words;
  if (targetLevel !== null) {
    filtered = words.filter(w => w.unit?.level?.level_number === targetLevel);
  }

  console.log(`📝 Words to process: ${filtered.length}`);

  // Calculate total characters
  const totalChars = filtered.reduce((sum, w) => sum + w.word.length, 0);
  console.log(`📏 Total characters: ${totalChars.toLocaleString()}`);

  if (totalChars > remaining) {
    console.log(`🔴 NOT ENOUGH QUOTA! Need ${totalChars}, have ${remaining}`);
    console.log(`   Consider using --level to process one level at a time`);
    process.exit(1);
  }

  if (dryRun) {
    // Show breakdown by level
    const byLevel = {};
    for (const w of filtered) {
      const lvl = w.unit?.level?.level_number ?? '?';
      if (!byLevel[lvl]) byLevel[lvl] = { count: 0, chars: 0 };
      byLevel[lvl].count++;
      byLevel[lvl].chars += w.word.length;
    }
    console.log('\n📊 Breakdown by level:');
    for (const [lvl, stats] of Object.entries(byLevel).sort()) {
      console.log(`   Level ${lvl}: ${stats.count} words, ${stats.chars} chars`);
    }
    console.log('\n✅ Dry run complete. Use without --dry-run to generate audio.');
    return;
  }

  // LIVE: Generate audio
  const uploader = new SupabaseUploader();
  const voiceId = config.voices.british_male.id;
  const settings = config.settings.vocabulary;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  console.log(`\n🎙️ Using voice: ${config.voices.british_male.name}`);
  console.log(`⏳ Starting generation... (${config.rateLimits.delayBetweenRequests / 1000}s between requests)\n`);

  for (let i = 0; i < filtered.length; i++) {
    const word = filtered[i];
    const levelNum = word.unit?.level?.level_number;
    const unitNum = word.unit?.unit_number;

    try {
      // Generate audio
      const audioBuffer = await client.generateSpeech(word.word, voiceId, {
        modelId: settings.modelId,
        stability: settings.stability,
        similarityBoost: settings.similarityBoost,
        style: settings.style,
        outputFormat: settings.outputFormat
      });

      // Upload to storage
      const storagePath = config.storagePaths.vocabulary(levelNum, unitNum, word.word);
      const publicUrl = await uploader.upload(audioBuffer, storagePath);

      // Update DB record
      await uploader.updateRecord('curriculum_vocabulary', word.id, {
        pronunciation_url: publicUrl,
        pronunciation_generated_at: new Date().toISOString()
      });

      successCount++;
      const pct = ((i + 1) / filtered.length * 100).toFixed(1);
      console.log(`  ✅ [${pct}%] L${levelNum}U${unitNum} "${word.word}" → ${(audioBuffer.length / 1024).toFixed(1)}KB`);

    } catch (err) {
      errorCount++;
      errors.push({ word: word.word, id: word.id, error: err.message });
      console.log(`  ❌ [${((i + 1) / filtered.length * 100).toFixed(1)}%] "${word.word}" — ${err.message}`);

      // If rate limited, wait longer
      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  ⏳ Rate limited — waiting 60 seconds...');
        await sleep(60000);
      }
    }

    // Rate limiting delay
    if (i < filtered.length - 1) {
      await sleep(config.rateLimits.delayBetweenRequests);
    }

    // Budget check every 100 words
    if ((i + 1) % 100 === 0) {
      const stats = client.getStats();
      console.log(`\n  📊 Progress: ${successCount}/${filtered.length} done, ${stats.characters} chars used\n`);
    }
  }

  // Final summary
  const stats = client.getStats();
  const uploadStats = uploader.getStats();

  console.log('\n═══════════════════════════════════════');
  console.log('  VOCABULARY AUDIO GENERATION COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors:  ${errorCount}`);
  console.log(`  📏 Characters used: ${stats.characters.toLocaleString()}`);
  console.log(`  📁 Files uploaded: ${uploadStats.uploads}`);
  console.log(`  💾 Total size: ${uploadStats.totalMB} MB`);

  if (errors.length > 0) {
    console.log('\n  Failed words:');
    for (const e of errors) {
      console.log(`    - "${e.word}" (${e.id}): ${e.error}`);
    }
    // Save errors for retry
    const fs = require('fs');
    fs.writeFileSync(
      'scripts/audio-generator/vocabulary-errors.json',
      JSON.stringify(errors, null, 2)
    );
    console.log('\n  Errors saved to vocabulary-errors.json for retry');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

---

## Step 2: Run Dry Run First

```bash
node scripts/audio-generator/generate-vocabulary-audio.cjs --dry-run
```

Print the results. This tells us the exact character count.

---

## Step 3: Generate Audio (Level by Level for Safety)

```bash
# Generate one level at a time so we can monitor
node scripts/audio-generator/generate-vocabulary-audio.cjs --level 0 --resume
node scripts/audio-generator/generate-vocabulary-audio.cjs --level 1 --resume
node scripts/audio-generator/generate-vocabulary-audio.cjs --level 2 --resume
node scripts/audio-generator/generate-vocabulary-audio.cjs --level 3 --resume
node scripts/audio-generator/generate-vocabulary-audio.cjs --level 4 --resume
node scripts/audio-generator/generate-vocabulary-audio.cjs --level 5 --resume
```

⚠️ **Use --resume flag always** — this lets us restart safely if anything fails.

Check quota between levels:
```bash
node scripts/audio-generator/check-quota.cjs
```

---

## Step 4: Verify Results

```sql
-- Count words with audio per level
SELECT
  cl.level_number,
  COUNT(cv.id) as total_words,
  COUNT(cv.pronunciation_url) as with_audio,
  COUNT(cv.id) - COUNT(cv.pronunciation_url) as missing
FROM curriculum_vocabulary cv
JOIN curriculum_units cu ON cv.unit_id = cu.id
JOIN curriculum_levels cl ON cu.level_id = cl.id
GROUP BY cl.level_number
ORDER BY cl.level_number;
```

Print results clearly.

---

## Git Commit

```bash
git add -A
git commit -m "feat: generate vocabulary pronunciation audio (Phase 3 - Agent 1)"
git push origin main
```

## ⚠️ DO NOT:
- Do NOT modify any existing UI components
- Do NOT touch files outside scripts/audio-generator/
- Do NOT exceed the character budget (check quota before each level)
- Do NOT generate audio for readings or listening — those are other agents
