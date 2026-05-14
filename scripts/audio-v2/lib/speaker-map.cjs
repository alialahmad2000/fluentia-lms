'use strict';

// Matches "Name:", "Name (role):", "Host:", "Speaker A:", "Person 1:"
// Anchored to start-of-line, name capped at 30 chars, requires colon + space
const SPEAKER_LABEL_REGEX = /^([A-Za-z][A-Za-z0-9\s.'-]{0,29})\s*(\([^)]{0,30}\))?\s*:\s+/;

const VOICES = {
  A: 'JBFqnCBsd6RMkjVDRZzb',       // George — British male
  B: 'Xb7hH8MSUJpSbSDYk0k2',        // Alice — British female
  C: 'iP95p4xoKVk53GoZ742B',         // Chris — American male
  D: 'EXAVITQu4vr4xnSDxMaL',         // Sarah — American female
  Narrator: 'nPczCjzI2devNBz1zQrb',  // Brian — American male
};
const VOICE_POOL = Object.values(VOICES);

const FEMALE_MARKERS = ['sarah', 'mary', 'emma', 'lisa', 'anna', 'mrs', 'ms.', 'fatima', 'layla', 'nadia', 'amira', 'dr. sarah', 'professor sarah'];
const MALE_MARKERS   = ['professor', 'mr.', 'ahmad', 'ali', 'chen', 'james', 'john', 'michael', 'host', 'interviewer', 'dr. ahmad'];

function guessGender(name) {
  const lc = name.toLowerCase();
  if (FEMALE_MARKERS.some(m => lc.includes(m))) return 'female';
  if (MALE_MARKERS.some(m => lc.includes(m))) return 'male';
  return 'male';
}

function assignVoices(segments) {
  const speakerVoiceMap = {};

  for (const seg of segments) {
    if (seg.speaker_name === '_narrator') {
      seg.voice_id = VOICES.Narrator;
      seg.voice_name = 'Brian';
      seg.gender = 'male';
      continue;
    }
    if (speakerVoiceMap[seg.speaker_name]) {
      Object.assign(seg, speakerVoiceMap[seg.speaker_name]);
      continue;
    }
    const gender = guessGender(seg.speaker_name);
    const used = new Set(Object.values(speakerVoiceMap).map(v => v.voice_id));
    const preferred = gender === 'female' ? VOICES.B : VOICES.A;
    // Use preferred if free, otherwise pick next unused voice from pool
    const voice_id = !used.has(preferred)
      ? preferred
      : (VOICE_POOL.find(v => !used.has(v)) || preferred);
    const voice_name = Object.entries(VOICES).find(([, v]) => v === voice_id)?.[0] || 'Other';
    speakerVoiceMap[seg.speaker_name] = { voice_id, voice_name, gender };
    Object.assign(seg, speakerVoiceMap[seg.speaker_name]);
  }
  return segments;
}

function parseTranscript(transcript) {
  if (!transcript || typeof transcript !== 'string') return [];

  const text = transcript.replace(/\r\n/g, '\n').trim();
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  const segments = [];
  let pendingSpeaker = null;
  let pendingText = '';

  const flush = () => {
    if (pendingText.trim()) {
      segments.push({
        speaker_name: pendingSpeaker || '_narrator',
        text: pendingText.trim(),
      });
    }
    pendingText = '';
  };

  for (const line of lines) {
    const m = line.match(SPEAKER_LABEL_REGEX);
    if (m) {
      flush();
      pendingSpeaker = m[1].trim();
      pendingText = line.slice(m[0].length).trim();
    } else {
      pendingText += (pendingText ? ' ' : '') + line;
    }
  }
  flush();

  // Fallback: treat whole transcript as narrator
  if (!segments.length) {
    segments.push({ speaker_name: '_narrator', text: transcript.trim() });
  }

  return segments;
}

// Prose words that can appear before colons and must not be flagged as speaker labels
const PROSE_COLON_WORDS = /^(i|i'd|i'll|i've|i'm|we|they|he|she|it|you|but|and|or|so|however|therefore|finally|remember|note|warning|consider|important|key|tip|first|second|third|also|additionally|furthermore|for|with|as|that|this|what|when|where|why|how)\b/i;
const MID_TEXT_PROSE = /\b(remember|note|warning|however|therefore|finally|for example|for instance|consider|important|key|tip|also|additionally|furthermore|in fact|indeed|first|second|third|drop|cover|hold|stop|wait|listen|look|think)\s*:/i;

function assertNoLabelResidue(segments) {
  for (const s of segments) {
    // Only flag if starts with a speaker pattern AND doesn't look like prose
    if (SPEAKER_LABEL_REGEX.test(s.text) && !PROSE_COLON_WORDS.test(s.text)) {
      throw new Error(`Label residue in segment: "${s.text.slice(0, 50)}..."`);
    }
    // Flag mid-text labels, but skip known prose words before colons
    if (/[.!?]\s+[A-Z][a-z]{1,20}:\s/.test(s.text) && !MID_TEXT_PROSE.test(s.text)) {
      throw new Error(`Mid-text label residue: "${s.text.slice(0, 80)}..."`);
    }
  }
}

module.exports = { parseTranscript, assertNoLabelResidue, assignVoices, SPEAKER_LABEL_REGEX, VOICES, VOICE_POOL };
