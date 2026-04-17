require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const buckets = [
  { name: 'ielts-audio',                public: false, fileSizeLimit: 50 * 1024 * 1024 },
  { name: 'ielts-speaking-submissions', public: false, fileSizeLimit: 30 * 1024 * 1024 },
  { name: 'ielts-writing-images',       public: true,  fileSizeLimit: 5  * 1024 * 1024 },
];

async function main() {
  console.log('Creating IELTS storage buckets...\n');
  for (const b of buckets) {
    const { data, error } = await supabase.storage.createBucket(b.name, {
      public: b.public,
      fileSizeLimit: b.fileSizeLimit,
    });
    if (error && !error.message.toLowerCase().includes('already exists')) {
      throw new Error(`Failed to create bucket ${b.name}: ${error.message}`);
    }
    console.log(`  ${b.name}: ${error ? 'already exists' : 'created'} (${b.public ? 'public' : 'private'})`);
  }
  console.log('\nDone.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
