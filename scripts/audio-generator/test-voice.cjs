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

  console.log(`Generating speech with voice: ${voiceId}`);
  console.log(`Text: "${text}" (${text.length} chars)`);

  const audioBuffer = await client.generateSpeech(text, voiceId);

  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `test-${voiceId.slice(0, 8)}.mp3`);
  fs.writeFileSync(outputPath, audioBuffer);

  console.log(`Saved to: ${outputPath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`Used ${text.length} characters`);
}

main().catch(console.error);
