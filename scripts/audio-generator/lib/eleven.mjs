import 'dotenv/config';

const BASE = 'https://api.elevenlabs.io/v1';
const KEY = () => {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('ELEVENLABS_API_KEY missing');
  return k;
};

const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function synthesizeWithTimestamps({ text, voiceId, modelId = 'eleven_multilingual_v2' }) {
  const url = `${BASE}/text-to-speech/${voiceId}/with-timestamps`;
  const body = JSON.stringify({
    text,
    model_id: modelId,
    voice_settings: VOICE_SETTINGS,
    output_format: 'mp3_44100_128',
  });

  let delay = 1000;
  for (let attempt = 0; attempt <= 5; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'xi-api-key': KEY(), 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(120000),
      });
    } catch (netErr) {
      if (attempt === 5) { console.error(`  [ElevenLabs] network error after 5 retries: ${netErr.message}`); return null; }
      console.warn(`  [ElevenLabs] network error (attempt ${attempt + 1}), retrying in ${delay}ms...`);
      await sleep(delay);
      delay = Math.min(delay * 2, 16000);
      continue;
    }

    if (res.status === 429) {
      if (attempt === 5) return null;
      console.warn(`  [ElevenLabs] 429 rate limit, retrying in ${delay}ms...`);
      await sleep(delay);
      delay = Math.min(delay * 2, 16000);
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  [ElevenLabs] HTTP ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    // data.audio_base64: base64 mp3
    // data.alignment: { characters[], character_start_times_seconds[], character_end_times_seconds[] }
    const audioBuffer = Buffer.from(data.audio_base64, 'base64');
    const word_timestamps = buildWordTimestamps(data.alignment);
    const char_count = text.length;

    return { audio_buffer: audioBuffer, word_timestamps, char_count };
  }
  return null;
}

function buildWordTimestamps(alignment) {
  if (!alignment || !alignment.characters) return [];
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const words = [];
  let currentWord = '';
  let wordStart = null;
  let wordEnd = null;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === ' ' || ch === '\n' || ch === '\r') {
      if (currentWord) {
        words.push({ word: currentWord, start_ms: Math.round(wordStart * 1000), end_ms: Math.round(wordEnd * 1000) });
        currentWord = '';
        wordStart = null;
        wordEnd = null;
      }
    } else {
      if (!currentWord) wordStart = starts[i];
      currentWord += ch;
      wordEnd = ends[i];
    }
  }
  if (currentWord) {
    words.push({ word: currentWord, start_ms: Math.round(wordStart * 1000), end_ms: Math.round(wordEnd * 1000) });
  }
  return words;
}

export async function synthesizeSimple({ text, voiceId, modelId = 'eleven_multilingual_v2' }) {
  const url = `${BASE}/text-to-speech/${voiceId}`;
  const body = JSON.stringify({
    text,
    model_id: modelId,
    voice_settings: VOICE_SETTINGS,
    output_format: 'mp3_44100_64',
  });

  let delay = 1000;
  for (let attempt = 0; attempt <= 5; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'xi-api-key': KEY(), 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body,
        signal: AbortSignal.timeout(30000),
      });
    } catch (netErr) {
      if (attempt === 5) { console.error(`[ElevenLabs simple] network error: ${netErr.message}`); return null; }
      console.warn(`[ElevenLabs simple] network error, retrying in ${delay}ms...`);
      await sleep(delay);
      delay = Math.min(delay * 2, 16000);
      continue;
    }

    if (res.status === 429) {
      if (attempt === 5) return null;
      await sleep(delay);
      delay = Math.min(delay * 2, 16000);
      continue;
    }
    if (!res.ok) { console.error(`[ElevenLabs simple] HTTP ${res.status}`); return null; }

    const buf = Buffer.from(await res.arrayBuffer());
    return { audio_buffer: buf, char_count: text.length };
  }
  return null;
}

export async function getQuota() {
  const res = await fetch(`${BASE}/user/subscription`, { headers: { 'xi-api-key': KEY() } });
  const d = await res.json();
  return {
    tier: d.tier,
    limit: d.character_limit,
    used: d.character_count,
    remaining: d.character_limit - d.character_count,
  };
}
