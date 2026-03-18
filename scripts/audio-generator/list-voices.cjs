/**
 * List all available ElevenLabs voices
 * Run: node scripts/audio-generator/list-voices.cjs
 */

require('dotenv').config();
const { ElevenLabsClient } = require('./elevenlabs-client.cjs');

async function main() {
  const client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY);

  // Check subscription first
  console.log('\n--- Subscription Info ---');
  const sub = await client.getSubscription();
  console.log(`  Plan: ${sub.tier}`);
  console.log(`  Characters used: ${sub.character_count.toLocaleString()} / ${sub.character_limit.toLocaleString()}`);
  console.log(`  Remaining: ${(sub.character_limit - sub.character_count).toLocaleString()}`);
  console.log(`  Next reset: ${sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toLocaleDateString() : 'N/A'}`);

  // List voices
  console.log('\n--- Available Voices ---\n');
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
    console.log(`\n--- ${accent.toUpperCase()} ---`);
    for (const v of voiceList) {
      const gender = v.labels?.gender || '?';
      const age = v.labels?.age || '?';
      const useCase = v.labels?.use_case || '';
      console.log(`  ${v.voice_id} | ${v.name} | ${gender} | ${age} | ${useCase}`);
    }
  }

  console.log(`\n\nTotal voices: ${voices.length}`);
  console.log('\nTo preview a voice, visit: https://elevenlabs.io/voice-library');
  console.log('Or generate a test: node scripts/audio-generator/test-voice.cjs <voice_id> "Hello world"');
}

main().catch(console.error);
