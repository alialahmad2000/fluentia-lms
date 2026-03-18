# Agent 3 — Generate IELTS Listening Audio (Multiple Accents)

## Context
Fluentia LMS Phase 3: Audio Generation. Infrastructure is already set up (P0 complete).
- ElevenLabs client: `scripts/audio-generator/elevenlabs-client.cjs`
- Supabase uploader: `scripts/audio-generator/supabase-uploader.cjs`
- Config: `scripts/audio-generator/config.cjs`
- Storage bucket: `curriculum-audio` (already created)
- Voice IDs: Already set in config.cjs by Ali

## Goal
Generate audio for all 25 IELTS listening sections using varied accents.
The real IELTS exam uses British, American, Australian, and occasionally South Asian accents.

**Estimated: 25 sections × ~2,500 chars = ~62,500 characters**

### Accent Distribution (Matches Real IELTS Exam):
- **Section 1** (7 sections) — Social/everyday: Mix of British + Australian
- **Section 2** (6 sections) — Monologue/public: British + American
- **Section 3** (6 sections) — Academic discussion: British + Australian + Indian
- **Section 4** (6 sections) — Academic lecture: British + American

Assignment pattern:
| Section # | Accent Pattern |
|-----------|---------------|
| S1-1, S1-3, S1-5, S1-7 | British |
| S1-2, S1-4, S1-6 | Australian |
| S2-1, S2-3, S2-5 | British |
| S2-2, S2-4, S2-6 | American |
| S3-1, S3-4 | British |
| S3-2, S3-5 | Australian |
| S3-3, S3-6 | Indian/South Asian |
| S4-1, S4-3, S4-5 | British |
| S4-2, S4-4, S4-6 | American |

---

## Step 1: Build the IELTS Listening Audio Generator

Create `scripts/audio-generator/generate-ielts-listening.cjs`:

```javascript
/**
 * Generate audio for IELTS listening sections with varied accents
 * Run: node scripts/audio-generator/generate-ielts-listening.cjs [--section N] [--dry-run] [--resume]
 *
 * Options:
 *   --section N    Only process section N (1-4)
 *   --dry-run      Count characters without generating
 *   --resume       Skip sections that already have audio_url
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

// Accent assignment — matches real IELTS exam distribution
function getAccentForSection(sectionNumber, indexWithinSection) {
  // indexWithinSection is 0-based position within that section type
  const patterns = {
    1: ['british', 'australian'],           // Alternating
    2: ['british', 'american'],             // Alternating
    3: ['british', 'australian', 'indian'], // Rotating
    4: ['british', 'american']              // Alternating
  };

  const pattern = patterns[sectionNumber] || ['british'];
  return pattern[indexWithinSection % pattern.length];
}

function getVoiceIdForAccent(accent) {
  const voiceMap = {
    'british': config.voices.ielts_british.id,
    'american': config.voices.ielts_american.id,
    'australian': config.voices.ielts_australian.id,
    'indian': config.voices.ielts_indian.id
  };
  return voiceMap[accent] || config.voices.ielts_british.id;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const sectionArg = args.find((a, i) => args[i - 1] === '--section');
  const targetSection = sectionArg ? parseInt(sectionArg) : null;

  console.log('🎙️ IELTS Listening Audio Generator');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Resume: ${resume ? 'Yes' : 'No'}`);
  if (targetSection) console.log(`   Section: ${targetSection} only`);

  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);
  const sub = await client.getSubscription();
  const remaining = sub.character_limit - sub.character_count;
  console.log(`📊 Characters remaining: ${remaining.toLocaleString()}\n`);

  // Fetch IELTS listening sections
  let query = supabase
    .from('ielts_listening_sections')
    .select('*')
    .order('section_number')
    .order('id');

  if (targetSection) {
    query = query.eq('section_number', targetSection);
  }

  if (resume) {
    query = query.is('audio_url', null);
  }

  const { data: sections, error } = await query;
  if (error) {
    console.error('❌ DB query failed:', error.message);
    process.exit(1);
  }

  console.log(`📝 Sections to process: ${sections.length}`);

  // Group by section_number to assign accents correctly
  const bySection = {};
  for (const s of sections) {
    if (!bySection[s.section_number]) bySection[s.section_number] = [];
    bySection[s.section_number].push(s);
  }

  // Build tasks with accent assignments
  const tasks = [];
  for (const [sectionNum, sectionList] of Object.entries(bySection)) {
    sectionList.forEach((section, idx) => {
      const accent = getAccentForSection(parseInt(sectionNum), idx);
      const voiceId = getVoiceIdForAccent(accent);

      // Use transcript field for TTS
      // ⚠️ Check actual column name — might be 'transcript', 'script', or 'content'
      const text = section.transcript || section.script || section.content || '';

      if (!text) {
        console.log(`  ⚠️ Section ${section.id} has no transcript text — skipping`);
        return;
      }

      tasks.push({
        id: section.id,
        sectionNumber: parseInt(sectionNum),
        accent,
        voiceId,
        voiceName: accent,
        text,
        chars: text.length,
        storagePath: config.storagePaths.ielts_listening(sectionNum, section.id)
      });
    });
  }

  const totalChars = tasks.reduce((sum, t) => sum + t.chars, 0);
  console.log(`🎵 Audio tasks: ${tasks.length}`);
  console.log(`📏 Total characters: ${totalChars.toLocaleString()}`);

  if (totalChars > remaining) {
    console.log(`🔴 NOT ENOUGH QUOTA! Need ${totalChars}, have ${remaining}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n📊 Breakdown:');
    for (const [sNum, sList] of Object.entries(bySection)) {
      const sectionTasks = tasks.filter(t => t.sectionNumber === parseInt(sNum));
      const chars = sectionTasks.reduce((s, t) => s + t.chars, 0);
      console.log(`\n  Section ${sNum} (${sectionTasks.length} items, ${chars.toLocaleString()} chars):`);
      for (const t of sectionTasks) {
        console.log(`    - ${t.id}: ${t.accent} accent, ${t.chars} chars`);
      }
    }
    console.log('\n✅ Dry run complete.');
    return;
  }

  // LIVE generation
  const uploader = new SupabaseUploader();
  const settings = config.settings.ielts_listening;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  console.log(`\n⏳ Starting generation...\n`);

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    try {
      console.log(`  🎙️ S${task.sectionNumber} [${task.accent}] (${task.chars} chars)...`);

      const audioBuffer = await client.generateSpeech(task.text, task.voiceId, {
        modelId: settings.modelId,
        stability: settings.stability,
        similarityBoost: settings.similarityBoost,
        style: settings.style,
        outputFormat: settings.outputFormat
      });

      const publicUrl = await uploader.upload(audioBuffer, task.storagePath);

      // Estimate duration (rough: ~150 chars/minute for spoken English)
      const estimatedDuration = Math.round(task.chars / 2.5); // chars per second

      await uploader.updateRecord('ielts_listening_sections', task.id, {
        audio_url: publicUrl,
        audio_duration_seconds: estimatedDuration,
        audio_generated_at: new Date().toISOString(),
        voice_id: task.voiceId,
        accent: task.accent
      });

      successCount++;
      const sizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`  ✅ S${task.sectionNumber} done → ${sizeMB}MB, ~${estimatedDuration}s`);

    } catch (err) {
      errorCount++;
      errors.push({ id: task.id, section: task.sectionNumber, accent: task.accent, error: err.message });
      console.log(`  ❌ S${task.sectionNumber} (${task.id}) — ${err.message}`);

      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  ⏳ Rate limited — waiting 60 seconds...');
        await sleep(60000);
      }
    }

    // Longer delay for IELTS — these are big requests
    if (i < tasks.length - 1) {
      const delay = Math.max(config.rateLimits.delayBetweenRequests, 8000);
      await sleep(delay);
    }
  }

  // Final summary
  const stats = client.getStats();
  const uploadStats = uploader.getStats();

  console.log('\n═══════════════════════════════════════');
  console.log('  IELTS LISTENING AUDIO COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors:  ${errorCount}`);
  console.log(`  📏 Characters used: ${stats.characters.toLocaleString()}`);
  console.log(`  📁 Files uploaded: ${uploadStats.uploads}`);
  console.log(`  💾 Total size: ${uploadStats.totalMB} MB`);
  console.log('');
  console.log('  Accent distribution:');
  const accentCounts = {};
  for (const t of tasks) {
    accentCounts[t.accent] = (accentCounts[t.accent] || 0) + 1;
  }
  for (const [accent, count] of Object.entries(accentCounts)) {
    console.log(`    ${accent}: ${count} sections`);
  }

  if (errors.length > 0) {
    const fs = require('fs');
    fs.writeFileSync(
      'scripts/audio-generator/ielts-listening-errors.json',
      JSON.stringify(errors, null, 2)
    );
    console.log('\n  Errors saved to ielts-listening-errors.json');
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
node scripts/audio-generator/generate-ielts-listening.cjs --dry-run
```

This will show accent assignments and character counts per section.

---

## Step 3: Generate Audio

```bash
# Can do all at once or section by section
node scripts/audio-generator/generate-ielts-listening.cjs --resume

# Or one section at a time:
# node scripts/audio-generator/generate-ielts-listening.cjs --section 1 --resume
# node scripts/audio-generator/generate-ielts-listening.cjs --section 2 --resume
# node scripts/audio-generator/generate-ielts-listening.cjs --section 3 --resume
# node scripts/audio-generator/generate-ielts-listening.cjs --section 4 --resume
```

---

## Step 4: Verify

```sql
SELECT
  section_number,
  COUNT(*) as total,
  COUNT(audio_url) as with_audio,
  COUNT(*) - COUNT(audio_url) as missing,
  array_agg(DISTINCT accent) as accents_used,
  SUM(audio_duration_seconds) as total_duration_seconds
FROM ielts_listening_sections
GROUP BY section_number
ORDER BY section_number;
```

---

## Git Commit

```bash
git add -A
git commit -m "feat: generate IELTS listening audio with varied accents (Phase 3 - Agent 3)"
git push origin main
```

## ⚠️ DO NOT:
- Do NOT modify UI components
- Do NOT touch vocabulary or irregular verb audio — those are other agents
- Do NOT use the same voice for all sections — accent variety is critical for IELTS
- Do NOT exceed 63,000 characters for this agent's work
