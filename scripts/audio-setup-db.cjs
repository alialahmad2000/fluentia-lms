/**
 * Step 2 & 3: Add missing audio columns + create storage bucket
 * Run: node scripts/audio-setup-db.cjs
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
  console.log('=== Step 2: Adding Missing Audio Columns ===\n');

  // Add audio_generated_at to tables that need it
  const alterStatements = [
    {
      table: 'curriculum_vocabulary',
      cols: ['audio_generated_at TIMESTAMPTZ'],
      note: 'Already has: audio_url, pronunciation_ipa'
    },
    {
      table: 'curriculum_irregular_verbs',
      cols: ['audio_generated_at TIMESTAMPTZ'],
      note: 'Already has: audio_base_url, audio_past_url, audio_pp_url'
    },
    {
      table: 'curriculum_readings',
      cols: ['audio_duration_seconds INTEGER', 'audio_generated_at TIMESTAMPTZ'],
      note: 'Already has: passage_audio_url'
    },
    {
      table: 'curriculum_listening',
      cols: ['audio_generated_at TIMESTAMPTZ'],
      note: 'Already has: audio_url, audio_duration_seconds, audio_type'
    },
    {
      table: 'ielts_listening_sections',
      cols: ['audio_generated_at TIMESTAMPTZ', 'voice_id TEXT', 'accent TEXT'],
      note: 'Already has: audio_url, audio_duration_seconds'
    }
  ];

  for (const { table, cols, note } of alterStatements) {
    console.log(`  ${table}: ${note}`);
    for (const col of cols) {
      const colName = col.split(' ')[0];
      const colType = col.split(' ').slice(1).join(' ');
      const { error } = await sb.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${colName} ${colType};`
      });
      if (error) {
        // Try direct approach if RPC doesn't exist
        console.log(`    + ${colName}: using direct query...`);
        const { error: e2 } = await sb.from(table).select(colName).limit(1);
        if (e2 && e2.message.includes('does not exist')) {
          console.log(`    + ${colName}: NEEDS MANUAL MIGRATION (column doesn't exist yet)`);
        } else if (e2) {
          console.log(`    + ${colName}: Error checking - ${e2.message}`);
        } else {
          console.log(`    + ${colName}: Already exists ✓`);
        }
      } else {
        console.log(`    + ${colName}: Added ✓`);
      }
    }
  }

  console.log('\n=== Step 3: Creating Storage Bucket ===\n');

  // Check if bucket exists
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets && buckets.some(b => b.name === 'curriculum-audio');

  if (exists) {
    console.log('  curriculum-audio bucket already exists ✓');
  } else {
    const { data, error } = await sb.storage.createBucket('curriculum-audio', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    });
    if (error) {
      console.log(`  Error creating bucket: ${error.message}`);
    } else {
      console.log('  curriculum-audio bucket created ✓ (public, 10MB limit)');
    }
  }

  // Verify bucket
  const { data: verify } = await sb.storage.listBuckets();
  const bucket = verify && verify.find(b => b.name === 'curriculum-audio');
  if (bucket) {
    console.log(`  Verified: ${bucket.name} (public: ${bucket.public})`);
  }
}

setup().catch(e => console.error('Error:', e.message));
