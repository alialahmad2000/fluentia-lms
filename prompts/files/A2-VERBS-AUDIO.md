# Agent 2 — Generate Irregular Verb Pronunciations

## Context
Fluentia LMS Phase 3: Audio Generation. Infrastructure is already set up (P0 complete).
- ElevenLabs client: `scripts/audio-generator/elevenlabs-client.cjs`
- Supabase uploader: `scripts/audio-generator/supabase-uploader.cjs`
- Config: `scripts/audio-generator/config.cjs`
- Storage bucket: `curriculum-audio` (already created)
- Voice IDs: Already set in config.cjs by Ali

## Goal
Generate pronunciation audio for ALL irregular verbs across all 6 levels.
Each verb gets **3 separate MP3 files**: base form, past simple, past participle.

**Estimated: ~600 verbs × 3 forms × ~7 chars = ~12,600 characters**

---

## Step 1: Build the Irregular Verbs Audio Generator

Create `scripts/audio-generator/generate-verbs-audio.cjs`:

```javascript
/**
 * Generate pronunciation audio for irregular verb forms
 * Each verb produces 3 audio files: base, past_simple, past_participle
 *
 * Run: node scripts/audio-generator/generate-verbs-audio.cjs [--level N] [--dry-run] [--resume]
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

  console.log('🎙️ Irregular Verbs Audio Generator');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Resume: ${resume ? 'Yes' : 'No'}`);
  if (targetLevel !== null) console.log(`   Level: ${targetLevel} only`);

  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);
  const sub = await client.getSubscription();
  const remaining = sub.character_limit - sub.character_count;
  console.log(`📊 Characters remaining: ${remaining.toLocaleString()}\n`);

  // Fetch all irregular verbs with level/unit info
  let query = supabase
    .from('curriculum_irregular_verbs')
    .select(`
      id, base_form, past_simple, past_participle,
      base_audio_url, past_audio_url, participle_audio_url,
      unit:curriculum_units!inner(
        id, unit_number,
        level:curriculum_levels!inner(id, level_number)
      )
    `)
    .order('id');

  const { data: verbs, error } = await query;
  if (error) {
    console.error('❌ DB query failed:', error.message);
    process.exit(1);
  }

  // Filter by level if specified
  let filtered = verbs;
  if (targetLevel !== null) {
    filtered = verbs.filter(v => v.unit?.level?.level_number === targetLevel);
  }

  // Build list of individual audio tasks
  const tasks = [];
  for (const verb of filtered) {
    const levelNum = verb.unit?.level?.level_number;
    const unitNum = verb.unit?.unit_number;

    const forms = [
      { form: 'base', text: verb.base_form, urlField: 'base_audio_url', existing: verb.base_audio_url },
      { form: 'past', text: verb.past_simple, urlField: 'past_audio_url', existing: verb.past_audio_url },
      { form: 'participle', text: verb.past_participle, urlField: 'participle_audio_url', existing: verb.participle_audio_url }
    ];

    for (const f of forms) {
      // Skip if resume mode and audio already exists
      if (resume && f.existing) continue;

      tasks.push({
        verbId: verb.id,
        verbBase: verb.base_form,
        form: f.form,
        text: f.text,
        urlField: f.urlField,
        levelNum,
        unitNum,
        storagePath: config.storagePaths.irregular_verb(levelNum, unitNum, verb.base_form, f.form)
      });
    }
  }

  const totalChars = tasks.reduce((sum, t) => sum + t.text.length, 0);

  console.log(`📝 Verbs found: ${filtered.length}`);
  console.log(`🎵 Audio tasks: ${tasks.length} (3 forms each, minus already generated)`);
  console.log(`📏 Total characters: ${totalChars.toLocaleString()}`);

  if (totalChars > remaining) {
    console.log(`🔴 NOT ENOUGH QUOTA! Need ${totalChars}, have ${remaining}`);
    process.exit(1);
  }

  if (dryRun) {
    const byLevel = {};
    for (const t of tasks) {
      const lvl = t.levelNum ?? '?';
      if (!byLevel[lvl]) byLevel[lvl] = { count: 0, chars: 0 };
      byLevel[lvl].count++;
      byLevel[lvl].chars += t.text.length;
    }
    console.log('\n📊 Breakdown by level:');
    for (const [lvl, stats] of Object.entries(byLevel).sort()) {
      console.log(`   Level ${lvl}: ${stats.count} audio files, ${stats.chars} chars`);
    }
    console.log('\n✅ Dry run complete.');
    return;
  }

  // LIVE generation
  const uploader = new SupabaseUploader();
  const voiceId = config.voices.british_male.id;
  const settings = config.settings.irregular_verbs;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  console.log(`\n🎙️ Using voice: ${config.voices.british_male.name}`);
  console.log(`⏳ Starting generation...\n`);

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    try {
      const audioBuffer = await client.generateSpeech(task.text, voiceId, {
        modelId: settings.modelId,
        stability: settings.stability,
        similarityBoost: settings.similarityBoost,
        style: settings.style,
        outputFormat: settings.outputFormat
      });

      const publicUrl = await uploader.upload(audioBuffer, task.storagePath);

      // Update the specific form's URL
      const updates = { [task.urlField]: publicUrl };
      // Set generated_at only when all 3 forms are done (check later)
      await uploader.updateRecord('curriculum_irregular_verbs', task.verbId, updates);

      successCount++;
      const pct = ((i + 1) / tasks.length * 100).toFixed(1);
      console.log(`  ✅ [${pct}%] L${task.levelNum}U${task.unitNum} "${task.verbBase}" (${task.form}) → ${(audioBuffer.length / 1024).toFixed(1)}KB`);

    } catch (err) {
      errorCount++;
      errors.push({ verb: task.verbBase, form: task.form, id: task.verbId, error: err.message });
      console.log(`  ❌ "${task.verbBase}" (${task.form}) — ${err.message}`);

      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  ⏳ Rate limited — waiting 60 seconds...');
        await sleep(60000);
      }
    }

    if (i < tasks.length - 1) {
      await sleep(config.rateLimits.delayBetweenRequests);
    }
  }

  // Update audio_generated_at for verbs that have all 3 forms
  console.log('\n📝 Updating generation timestamps...');
  const { data: complete, error: checkErr } = await supabase
    .from('curriculum_irregular_verbs')
    .select('id')
    .not('base_audio_url', 'is', null)
    .not('past_audio_url', 'is', null)
    .not('participle_audio_url', 'is', null)
    .is('audio_generated_at', null);

  if (!checkErr && complete) {
    for (const v of complete) {
      await supabase
        .from('curriculum_irregular_verbs')
        .update({ audio_generated_at: new Date().toISOString() })
        .eq('id', v.id);
    }
    console.log(`  Updated ${complete.length} verbs with generation timestamp`);
  }

  // Final summary
  const stats = client.getStats();
  const uploadStats = uploader.getStats();

  console.log('\n═══════════════════════════════════════');
  console.log('  IRREGULAR VERBS AUDIO COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`  ✅ Success: ${successCount} audio files`);
  console.log(`  ❌ Errors:  ${errorCount}`);
  console.log(`  📏 Characters used: ${stats.characters.toLocaleString()}`);
  console.log(`  📁 Files uploaded: ${uploadStats.uploads}`);
  console.log(`  💾 Total size: ${uploadStats.totalMB} MB`);

  if (errors.length > 0) {
    const fs = require('fs');
    fs.writeFileSync(
      'scripts/audio-generator/verbs-errors.json',
      JSON.stringify(errors, null, 2)
    );
    console.log('  Errors saved to verbs-errors.json');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

---

## Step 2: Dry Run

```bash
node scripts/audio-generator/generate-verbs-audio.cjs --dry-run
```

---

## Step 3: Generate Audio (All Levels)

```bash
node scripts/audio-generator/generate-verbs-audio.cjs --resume
```

(Irregular verbs are small — can do all levels at once. Use --resume for safety.)

---

## Step 4: Verify

```sql
SELECT
  cl.level_number,
  COUNT(civ.id) as total_verbs,
  COUNT(civ.base_audio_url) as base_done,
  COUNT(civ.past_audio_url) as past_done,
  COUNT(civ.participle_audio_url) as participle_done,
  COUNT(civ.audio_generated_at) as fully_complete
FROM curriculum_irregular_verbs civ
JOIN curriculum_units cu ON civ.unit_id = cu.id
JOIN curriculum_levels cl ON cu.level_id = cl.id
GROUP BY cl.level_number
ORDER BY cl.level_number;
```

---

## Git Commit

```bash
git add -A
git commit -m "feat: generate irregular verb pronunciation audio (Phase 3 - Agent 2)"
git push origin main
```

## ⚠️ DO NOT:
- Do NOT modify UI components
- Do NOT touch vocabulary or IELTS audio — those are other agents
- Do NOT exceed budget — check quota if in doubt
