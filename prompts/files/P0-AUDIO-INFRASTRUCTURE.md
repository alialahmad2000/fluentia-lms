# P0 — Audio Infrastructure: Discovery + Setup

## Context
Fluentia LMS has 576 curriculum content items across 72 units (6 levels) + 153 IELTS items, all stored in Supabase. We're starting Phase 3: generating audio using ElevenLabs TTS API. This prompt sets up all the infrastructure needed before audio generation begins.

**Tech:** Supabase (ref: nmjexpuycmqcxuxljier), ElevenLabs API (key in .env as ELEVENLABS_API_KEY)
**Storage:** Supabase Storage (upgrading to Pro for 100GB)

---

## Step 1: Discovery — Analyze Current DB State

Run these queries against Supabase and print the results clearly:

### 1A. Count vocabulary words per level
```sql
SELECT cl.level_number, cl.name_ar, COUNT(cv.id) as word_count,
  SUM(LENGTH(cv.word)) as total_chars
FROM curriculum_vocabulary cv
JOIN curriculum_units cu ON cv.unit_id = cu.id
JOIN curriculum_levels cl ON cu.level_id = cl.id
GROUP BY cl.level_number, cl.name_ar
ORDER BY cl.level_number;
```

### 1B. Count irregular verbs per level
```sql
SELECT cl.level_number, COUNT(civ.id) as verb_count,
  SUM(LENGTH(civ.base_form) + LENGTH(civ.past_simple) + LENGTH(civ.past_participle)) as total_chars
FROM curriculum_irregular_verbs civ
JOIN curriculum_units cu ON civ.unit_id = cu.id
JOIN curriculum_levels cl ON cu.level_id = cl.id
GROUP BY cl.level_number
ORDER BY cl.level_number;
```

### 1C. Measure listening scripts character count
```sql
SELECT cl.level_number, COUNT(cls.id) as script_count,
  SUM(LENGTH(cls.transcript)) as total_chars
FROM curriculum_listening cls
JOIN curriculum_units cu ON cls.unit_id = cu.id
JOIN curriculum_levels cl ON cu.level_id = cl.id
GROUP BY cl.level_number
ORDER BY cl.level_number;
```

### 1D. Measure reading passages character count
```sql
SELECT cl.level_number, COUNT(cr.id) as reading_count,
  SUM(LENGTH(cr.content)) as total_chars
FROM curriculum_readings cr
JOIN curriculum_units cu ON cr.unit_id = cu.id
JOIN curriculum_levels cl ON cu.level_id = cl.id
GROUP BY cl.level_number
ORDER BY cl.level_number;
```

### 1E. IELTS listening sections
```sql
SELECT section_number, COUNT(*) as count,
  SUM(LENGTH(transcript)) as total_chars
FROM ielts_listening_sections
GROUP BY section_number
ORDER BY section_number;
```

### 1F. Check existing audio columns
```sql
SELECT column_name, table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%audio%' OR column_name LIKE '%pronunciation%' OR column_name LIKE '%voice%'
ORDER BY table_name, column_name;
```

### 1G. Check current storage buckets
List all existing Supabase Storage buckets.

### 1H. Check Supabase storage usage
Check total storage used across all buckets.

**Print all results in a clear summary table. This data is critical for planning.**

---

## Step 2: Add Audio Columns to Tables

Based on discovery results, add `audio_url` columns where they don't already exist:

### Vocabulary table:
```sql
ALTER TABLE curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS pronunciation_url TEXT,
  ADD COLUMN IF NOT EXISTS pronunciation_generated_at TIMESTAMPTZ;
```

### Irregular Verbs table:
```sql
ALTER TABLE curriculum_irregular_verbs
  ADD COLUMN IF NOT EXISTS base_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS past_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS participle_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ;
```

### Readings table:
```sql
ALTER TABLE curriculum_readings
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ;
```

### Listening table:
```sql
ALTER TABLE curriculum_listening
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ;
```

### IELTS Listening:
```sql
ALTER TABLE ielts_listening_sections
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voice_id TEXT,
  ADD COLUMN IF NOT EXISTS accent TEXT;
```

**⚠️ IMPORTANT:** Check the actual column names in the DB first! The table/column names above are guesses. Use the discovery results from Step 1F to know what already exists.

---

## Step 3: Create Supabase Storage Bucket

Create a `curriculum-audio` bucket:

```javascript
const { data, error } = await supabase.storage.createBucket('curriculum-audio', {
  public: true,  // Audio files need to be publicly accessible for playback
  fileSizeLimit: 10485760,  // 10MB max per file
  allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
});
```

Create folder structure inside the bucket (via uploading placeholder or documenting):
```
curriculum-audio/
├── vocabulary/          # Word pronunciations: {level}/{unit}/{word}.mp3
├── irregular-verbs/     # Verb forms: {level}/{unit}/{verb}-{form}.mp3
├── listening/           # Listening scripts: {level}/{unit}/listening.mp3
├── readings/            # Full passage readings: {level}/{unit}/reading-{a|b}.mp3
└── ielts/
    └── listening/       # IELTS sections: section-{n}/{id}.mp3
```

**RLS Policy:** Public read for all authenticated users, admin-only write.

```sql
-- Allow all authenticated users to read audio files
CREATE POLICY "Authenticated users can read audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'curriculum-audio');

-- Only admin can upload/delete
CREATE POLICY "Admin can manage audio"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'curriculum-audio'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## Step 4: Build ElevenLabs TTS Utility Script

Create `scripts/audio-generator/elevenlabs-client.cjs`:

```javascript
/**
 * ElevenLabs TTS Client for Fluentia LMS
 * Handles text-to-speech generation with rate limiting and error handling
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

class ElevenLabsClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.requestCount = 0;
    this.charCount = 0;
  }

  /**
   * Generate speech from text
   * @param {string} text - Text to convert to speech
   * @param {string} voiceId - ElevenLabs voice ID
   * @param {object} options - Additional options
   * @returns {Buffer} Audio data as buffer
   */
  async generateSpeech(text, voiceId, options = {}) {
    const {
      modelId = 'eleven_multilingual_v2',  // Best quality
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0.0,
      outputFormat = 'mp3_44100_128'  // High quality MP3
    } = options;

    const url = `${this.baseUrl}/text-to-speech/${voiceId}?output_format=${outputFormat}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`);
    }

    this.requestCount++;
    this.charCount += text.length;

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * List available voices
   */
  async listVoices() {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'xi-api-key': this.apiKey }
    });
    if (!response.ok) throw new Error(`Failed to list voices: ${response.status}`);
    return response.json();
  }

  /**
   * Check remaining character quota
   */
  async getSubscription() {
    const response = await fetch(`${this.baseUrl}/user/subscription`, {
      headers: { 'xi-api-key': this.apiKey }
    });
    if (!response.ok) throw new Error(`Failed to get subscription: ${response.status}`);
    return response.json();
  }

  getStats() {
    return {
      requests: this.requestCount,
      characters: this.charCount
    };
  }
}

module.exports = { ElevenLabsClient };
```

Create `scripts/audio-generator/supabase-uploader.cjs`:

```javascript
/**
 * Supabase Storage uploader for audio files
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseUploader {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );
    this.bucket = 'curriculum-audio';
    this.uploadCount = 0;
    this.totalBytes = 0;
  }

  /**
   * Upload audio buffer to Supabase Storage
   * @param {Buffer} audioBuffer - Audio data
   * @param {string} storagePath - Path within bucket (e.g., "vocabulary/0/1/hello.mp3")
   * @returns {string} Public URL of uploaded file
   */
  async upload(audioBuffer, storagePath) {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true  // Overwrite if exists
      });

    if (error) {
      throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
    }

    this.uploadCount++;
    this.totalBytes += audioBuffer.length;

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  }

  /**
   * Update a database record with the audio URL
   */
  async updateRecord(table, id, updates) {
    const { error } = await this.supabase
      .from(table)
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`DB update failed for ${table}/${id}: ${error.message}`);
    }
  }

  getStats() {
    return {
      uploads: this.uploadCount,
      totalMB: (this.totalBytes / 1024 / 1024).toFixed(2)
    };
  }
}

module.exports = { SupabaseUploader };
```

Create `scripts/audio-generator/config.cjs`:

```javascript
/**
 * Audio generation config for Fluentia LMS
 *
 * Voice selection guide:
 * - Browse voices at: https://elevenlabs.io/voice-library
 * - Or list via API: node -e "require('./elevenlabs-client.cjs').listVoices()"
 *
 * IMPORTANT: Voice IDs below are PLACEHOLDERS.
 * Run `node scripts/audio-generator/list-voices.cjs` to find actual voice IDs.
 * Ali will choose the final voices after listening to samples.
 */

module.exports = {
  // Voice IDs — MUST be updated after Ali selects voices
  voices: {
    // British English male — for vocabulary, grammar, irregular verbs
    british_male: {
      id: 'PLACEHOLDER_BRITISH_MALE',
      name: 'TBD — British Male (clear, academic)',
      usage: 'Vocabulary pronunciation, irregular verbs, grammar examples'
    },
    // British English female — for readings, listening scripts
    british_female: {
      id: 'PLACEHOLDER_BRITISH_FEMALE',
      name: 'TBD — British Female (narrative, warm)',
      usage: 'Reading passages, listening scripts'
    },
    // IELTS voices — different accents for exam prep
    ielts_british: {
      id: 'PLACEHOLDER_IELTS_BRITISH',
      name: 'TBD — British (IELTS)',
      accent: 'british'
    },
    ielts_american: {
      id: 'PLACEHOLDER_IELTS_AMERICAN',
      name: 'TBD — American (IELTS)',
      accent: 'american'
    },
    ielts_australian: {
      id: 'PLACEHOLDER_IELTS_AUSTRALIAN',
      name: 'TBD — Australian (IELTS)',
      accent: 'australian'
    },
    ielts_indian: {
      id: 'PLACEHOLDER_IELTS_INDIAN',
      name: 'TBD — South Asian (IELTS)',
      accent: 'indian'
    }
  },

  // TTS settings per content type
  settings: {
    vocabulary: {
      modelId: 'eleven_multilingual_v2',
      stability: 0.7,        // Higher = more consistent pronunciation
      similarityBoost: 0.8,
      style: 0.0,            // Neutral style for clear pronunciation
      outputFormat: 'mp3_44100_64',  // 64kbps — small files for single words
      pauseBetweenWords: false
    },
    irregular_verbs: {
      modelId: 'eleven_multilingual_v2',
      stability: 0.7,
      similarityBoost: 0.8,
      style: 0.0,
      outputFormat: 'mp3_44100_64',
      // Each verb generates 3 separate files: base, past, participle
    },
    listening: {
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,        // More natural variation for longer speech
      similarityBoost: 0.75,
      style: 0.3,            // Slight expressiveness
      outputFormat: 'mp3_44100_128',  // Higher quality for longer audio
    },
    reading: {
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.2,
      outputFormat: 'mp3_44100_128',
    },
    ielts_listening: {
      modelId: 'eleven_multilingual_v2',
      stability: 0.45,       // Natural variation for realistic exam simulation
      similarityBoost: 0.7,
      style: 0.35,
      outputFormat: 'mp3_44100_128',
    }
  },

  // Storage paths
  storagePaths: {
    vocabulary: (levelNum, unitNum, word) =>
      `vocabulary/${levelNum}/${unitNum}/${encodeURIComponent(word.toLowerCase().replace(/\s+/g, '-'))}.mp3`,
    irregular_verb: (levelNum, unitNum, verb, form) =>
      `irregular-verbs/${levelNum}/${unitNum}/${encodeURIComponent(verb.toLowerCase())}-${form}.mp3`,
    listening: (levelNum, unitNum) =>
      `listening/${levelNum}/${unitNum}/listening.mp3`,
    reading: (levelNum, unitNum, variant) =>
      `readings/${levelNum}/${unitNum}/reading-${variant}.mp3`,
    ielts_listening: (sectionNum, id) =>
      `ielts/listening/section-${sectionNum}/${id}.mp3`
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 10,    // Conservative — ElevenLabs limit varies by plan
    delayBetweenRequests: 6000, // 6 seconds between requests (safe)
    maxRetries: 3,
    retryDelay: 10000          // 10 seconds on error
  },

  // Monthly budget tracking
  budget: {
    monthlyCharLimit: 100000,  // Creator plan
    warningThreshold: 90000,   // Warn at 90%
    hardStop: 99000            // Stop at 99% to leave buffer
  }
};
```

Create `scripts/audio-generator/list-voices.cjs` — helper to pick voices:

```javascript
/**
 * List all available ElevenLabs voices
 * Run: node scripts/audio-generator/list-voices.cjs
 */

require('dotenv').config();
const { ElevenLabsClient } = require('./elevenlabs-client.cjs');

async function main() {
  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);

  // Check subscription first
  console.log('\\n📊 Subscription Info:');
  const sub = await client.getSubscription();
  console.log(`  Plan: ${sub.tier}`);
  console.log(`  Characters used: ${sub.character_count.toLocaleString()} / ${sub.character_limit.toLocaleString()}`);
  console.log(`  Remaining: ${(sub.character_limit - sub.character_count).toLocaleString()}`);
  console.log(`  Next reset: ${sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toLocaleDateString() : 'N/A'}`);

  // List voices
  console.log('\\n🎙️ Available Voices:\\n');
  const { voices } = await client.listVoices();

  // Filter for English voices, sort by category
  const englishVoices = voices.filter(v =>
    v.labels?.language === 'en' || !v.labels?.language
  );

  // Group by accent
  const byAccent = {};
  for (const voice of englishVoices) {
    const accent = voice.labels?.accent || 'unknown';
    if (!byAccent[accent]) byAccent[accent] = [];
    byAccent[accent].push(voice);
  }

  for (const [accent, voiceList] of Object.entries(byAccent).sort()) {
    console.log(`\\n--- ${accent.toUpperCase()} ---`);
    for (const v of voiceList) {
      const gender = v.labels?.gender || '?';
      const age = v.labels?.age || '?';
      const useCase = v.labels?.use_case || '';
      console.log(`  ${v.voice_id} | ${v.name} | ${gender} | ${age} | ${useCase}`);
    }
  }

  console.log(`\\n\\nTotal voices: ${voices.length}`);
  console.log('\\n💡 To preview a voice, visit: https://elevenlabs.io/voice-library');
  console.log('   Or generate a test: node scripts/audio-generator/test-voice.cjs <voice_id> "Hello world"');
}

main().catch(console.error);
```

Create `scripts/audio-generator/test-voice.cjs` — test a single voice:

```javascript
/**
 * Test a single ElevenLabs voice
 * Run: node scripts/audio-generator/test-voice.cjs <voice_id> "text to speak"
 */

require('dotenv').config();
const { ElevenLabsClient } = require('./elevenlabs-client.cjs');
const fs = require('fs');
const path = require('path');

async function main() {
  const voiceId = process.argv[2];
  const text = process.argv[3] || 'The quick brown fox jumps over the lazy dog. This is a pronunciation test for Fluentia Academy.';

  if (!voiceId) {
    console.log('Usage: node test-voice.cjs <voice_id> ["text to speak"]');
    console.log('Run list-voices.cjs first to get voice IDs');
    process.exit(1);
  }

  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);

  console.log(`🎙️ Generating speech with voice: ${voiceId}`);
  console.log(`📝 Text: "${text}" (${text.length} chars)`);

  const audioBuffer = await client.generateSpeech(text, voiceId);

  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `test-${voiceId.slice(0, 8)}.mp3`);
  fs.writeFileSync(outputPath, audioBuffer);

  console.log(`✅ Saved to: ${outputPath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`📊 Used ${text.length} characters`);
}

main().catch(console.error);
```

Create `scripts/audio-generator/check-quota.cjs` — budget tracker:

```javascript
/**
 * Check ElevenLabs character quota and generation progress
 * Run: node scripts/audio-generator/check-quota.cjs
 */

require('dotenv').config();
const { ElevenLabsClient } = require('./elevenlabs-client.cjs');

async function main() {
  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);

  const sub = await client.getSubscription();
  const used = sub.character_count;
  const limit = sub.character_limit;
  const remaining = limit - used;
  const pct = ((used / limit) * 100).toFixed(1);

  console.log('╔══════════════════════════════════════╗');
  console.log('║   ElevenLabs Character Budget        ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║ Plan:      ${sub.tier.padEnd(25)}║`);
  console.log(`║ Used:      ${used.toLocaleString().padEnd(25)}║`);
  console.log(`║ Limit:     ${limit.toLocaleString().padEnd(25)}║`);
  console.log(`║ Remaining: ${remaining.toLocaleString().padEnd(25)}║`);
  console.log(`║ Usage:     ${(pct + '%').padEnd(25)}║`);
  console.log(`║ Reset:     ${sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toLocaleDateString() : 'N/A'}${''.padEnd(14)}║`);
  console.log('╚══════════════════════════════════════╝');

  if (remaining < 10000) {
    console.log('\\n🔴 WARNING: Less than 10,000 characters remaining!');
  } else if (remaining < 20000) {
    console.log('\\n🟡 CAUTION: Less than 20,000 characters remaining.');
  } else {
    console.log('\\n🟢 Budget is healthy.');
  }
}

main().catch(console.error);
```

---

## Step 5: Install Dependencies

```bash
cd /path/to/fluentia-lms
npm install node-fetch@2 dotenv --save-dev
```

(Use node-fetch v2 for CommonJS compatibility with .cjs files)

---

## Step 6: Add .env Entry

Ensure `.env` has:
```
ELEVENLABS_API_KEY=your_key_here
```

Also ensure `SUPABASE_SERVICE_ROLE_KEY` is in `.env` (needed for storage uploads).

---

## Step 7: Verify Everything Works

1. Run `node scripts/audio-generator/check-quota.cjs` — should show subscription info
2. Run `node scripts/audio-generator/list-voices.cjs` — should list all voices
3. Verify the `curriculum-audio` bucket was created in Supabase dashboard
4. Verify all ALTER TABLE commands succeeded

---

## Step 8: Print Summary

Print a clear summary:
```
=== PHASE 3 INFRASTRUCTURE COMPLETE ===

📊 Discovery Results:
- Vocabulary words: [X] (est. [X] chars)
- Irregular verbs: [X] (est. [X] chars)
- Listening scripts: [X] (est. [X] chars)
- Reading passages: [X] (est. [X] chars)
- IELTS listening: [X] (est. [X] chars)

🗄️ Database Changes:
- Added audio columns to: [list tables]
- Created storage bucket: curriculum-audio

🎙️ ElevenLabs Status:
- Plan: [X]
- Characters remaining: [X]
- Reset date: [X]

📁 Files Created:
- scripts/audio-generator/elevenlabs-client.cjs
- scripts/audio-generator/supabase-uploader.cjs
- scripts/audio-generator/config.cjs
- scripts/audio-generator/list-voices.cjs
- scripts/audio-generator/test-voice.cjs
- scripts/audio-generator/check-quota.cjs

⏭️ NEXT: Ali needs to:
1. Run: node scripts/audio-generator/list-voices.cjs
2. Pick voices (British male + British female + 4 IELTS accents)
3. Update voice IDs in config.cjs
4. Then run Agent 1, 2, 3 in parallel
```

---

## Git Commit

```bash
git add -A
git commit -m "feat: Phase 3 audio infrastructure - ElevenLabs client, storage bucket, DB columns"
git push origin main
```

---

## ⚠️ DO NOT:
- Do NOT generate any audio yet — this prompt is infrastructure only
- Do NOT hard-delete any data
- Do NOT modify any existing pages or components
- Do NOT touch any files outside of `scripts/audio-generator/` and DB migrations
