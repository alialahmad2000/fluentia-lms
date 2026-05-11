/**
 * Preprocess speaker_segments for interviews/lectures that are missing them.
 * Pattern: "Speaker Name: text\n\nSpeaker Name: text..."
 */

import 'dotenv/config';
import { query, closeDb } from './lib/db.mjs';

// Voice IDs
const VOICES = {
  female: 'Xb7hH8MSUJpSbSDYk0k2',  // Alice
  male: 'JBFqnCBsd6RMkjVDRZzb',     // George
  narrator: 'nPczCjzI2devNBz1zQrb',  // Brian
};

// Heuristic gender detection from common name patterns
function guessGender(name) {
  const lc = name.toLowerCase();
  const femaleMarkers = ['sarah', 'mary', 'emma', 'lisa', 'anna', 'dr. sarah', 'professor sarah', 'mrs', 'ms.', 'fatima', 'layla', 'nadia', 'amira', 'dr sarah'];
  const maleMarkers = ['professor', 'mr.', 'ahmad', 'ali', 'chen', 'james', 'john', 'michael', 'dr. ahmad', 'host', 'interviewer'];
  if (femaleMarkers.some(m => lc.includes(m))) return 'female';
  if (maleMarkers.some(m => lc.includes(m))) return 'male';
  return 'male'; // default
}

function parseTranscript(transcript, audioType) {
  const lines = transcript.split('\n');
  const segments = [];
  let currentSpeaker = null;
  let currentText = [];
  const speakerVoiceMap = {};

  // Determine voice for new speaker (alternate genders, max 4 speakers)
  const voicePool = [VOICES.male, VOICES.female, 'iP95p4xoKVk53GoZ742B', 'EXAVITQu4vr4xnSDxMaL'];
  let speakerCount = 0;

  function assignVoice(speaker) {
    if (speakerVoiceMap[speaker]) return speakerVoiceMap[speaker];
    const gender = guessGender(speaker);
    const voice = gender === 'female' ? VOICES.female : VOICES.male;
    // If same gender already used, rotate
    const used = Object.values(speakerVoiceMap);
    const chosen = used.includes(voice) ? voicePool[speakerCount % voicePool.length] : voice;
    speakerVoiceMap[speaker] = chosen;
    speakerCount++;
    return chosen;
  }

  function flushSpeaker() {
    if (currentSpeaker && currentText.length) {
      const text = currentText.join(' ').trim();
      if (text) {
        const voiceId = assignVoice(currentSpeaker);
        segments.push({
          order: segments.length + 1,
          speaker: currentSpeaker,
          text,
          voice_id: voiceId,
          char_count: text.length,
          gender: guessGender(currentSpeaker),
          voice_name: voiceId === VOICES.female ? 'Alice' : voiceId === VOICES.male ? 'George' : 'Other',
        });
      }
      currentText = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match "Speaker Name: text" pattern (colon in first 60 chars)
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0 && colonIdx < 60) {
      const potentialSpeaker = trimmed.substring(0, colonIdx).trim();
      const afterColon = trimmed.substring(colonIdx + 1).trim();
      // Speaker names don't have numbers and are mostly words
      if (/^[A-Za-z\s\.\-]+$/.test(potentialSpeaker) && potentialSpeaker.split(' ').length <= 5) {
        flushSpeaker();
        currentSpeaker = potentialSpeaker;
        if (afterColon) currentText.push(afterColon);
        continue;
      }
    }
    if (currentSpeaker) currentText.push(trimmed);
  }
  flushSpeaker();

  // Fallback: if no segments parsed, treat whole transcript as single narrator
  if (!segments.length) {
    segments.push({
      order: 1,
      speaker: 'Narrator',
      text: transcript.trim(),
      voice_id: VOICES.narrator,
      char_count: transcript.length,
      gender: 'male',
      voice_name: 'Brian',
    });
  }

  return segments;
}

async function main() {
  const rows = await query(`
    SELECT id, title_en, audio_type, transcript
    FROM curriculum_listening
    WHERE speaker_segments IS NULL AND transcript IS NOT NULL
    ORDER BY audio_type
  `);

  console.log(`Processing ${rows.length} items...`);

  for (const row of rows) {
    const segments = parseTranscript(row.transcript, row.audio_type);
    const speakers = [...new Set(segments.map(s => s.speaker))];
    const totalChars = segments.reduce((a, s) => a + s.char_count, 0);

    await query(
      `UPDATE curriculum_listening SET speaker_segments=$1, segments_processed_at=now() WHERE id=$2`,
      [JSON.stringify(segments), row.id]
    );

    console.log(`✓ ${row.audio_type} | ${row.id.substring(0, 8)} | ${segments.length} segments, ${speakers.join(' / ')}, ${totalChars} chars`);
  }

  console.log('Done.');
  await closeDb();
}

main().catch(e => { console.error(e); process.exit(1); });
