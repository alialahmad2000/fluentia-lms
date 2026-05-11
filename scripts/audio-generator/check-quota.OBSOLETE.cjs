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

  console.log('========================================');
  console.log('   ElevenLabs Character Budget');
  console.log('========================================');
  console.log(`  Plan:      ${sub.tier}`);
  console.log(`  Used:      ${used.toLocaleString()}`);
  console.log(`  Limit:     ${limit.toLocaleString()}`);
  console.log(`  Remaining: ${remaining.toLocaleString()}`);
  console.log(`  Usage:     ${pct}%`);
  console.log(`  Reset:     ${sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toLocaleDateString() : 'N/A'}`);
  console.log('========================================');

  // Context: Fluentia needs ~933K chars total
  console.log(`\n  Fluentia total need: ~933,095 chars`);
  console.log(`  Months at current limit: ${Math.ceil(933095 / limit)}`);

  if (remaining < 10000) {
    console.log('\n  WARNING: Less than 10,000 characters remaining!');
  } else if (remaining < 20000) {
    console.log('\n  CAUTION: Less than 20,000 characters remaining.');
  } else {
    console.log('\n  Budget is healthy.');
  }
}

main().catch(console.error);
