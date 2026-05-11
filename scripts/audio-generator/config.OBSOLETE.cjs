/**
 * Audio generation config for Fluentia LMS
 *
 * Voice selection guide:
 * - Browse voices at: https://elevenlabs.io/voice-library
 * - Or list via API: node scripts/audio-generator/list-voices.cjs
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
      id: 'JBFqnCBsd6RMkjVDRZzb',
      name: 'TBD — British Male (clear, academic)',
      usage: 'Vocabulary pronunciation, irregular verbs, grammar examples'
    },
    // British English female — for readings, listening scripts
    british_female: {
      id: 'Xb7hH8MSUJpSbSDYk0k2',
      name: 'TBD — British Female (narrative, warm)',
      usage: 'Reading passages, listening scripts'
    },
    // IELTS voices — different accents for exam prep
    ielts_british: {
      id: 'onwK4e9ZLuTAKqWW03F9',
      name: 'TBD — British (IELTS)',
      accent: 'british'
    },
    ielts_american: {
      id: 'cjVigY5qzO86Huf0OWal',
      name: 'TBD — American (IELTS)',
      accent: 'american'
    },
    ielts_australian: {
      id: 'IKne3meq5aSn9XLyUdCD',
      name: 'TBD — Australian (IELTS)',
      accent: 'australian'
    },
    ielts_indian: {
      id: 'XrExE9yKIg1WjnnlVkGX',
      name: 'TBD — South Asian (IELTS)',
      accent: 'indian'
    }
  },

  // TTS settings per content type
  settings: {
    vocabulary: {
      modelId: 'eleven_multilingual_v2',
      stability: 0.7,
      similarityBoost: 0.8,
      style: 0.0,
      outputFormat: 'mp3_44100_64',
      pauseBetweenWords: false
    },
    irregular_verbs: {
      modelId: 'eleven_multilingual_v2',
      stability: 0.7,
      similarityBoost: 0.8,
      style: 0.0,
      outputFormat: 'mp3_44100_64',
    },
    listening: {
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.3,
      outputFormat: 'mp3_44100_128',
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
      stability: 0.45,
      similarityBoost: 0.7,
      style: 0.35,
      outputFormat: 'mp3_44100_128',
    }
  },

  // Storage paths — uses actual DB column names
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

  // DB column mapping (actual column names from discovery)
  dbColumns: {
    curriculum_vocabulary: { audioUrl: 'audio_url', generatedAt: 'audio_generated_at' },
    curriculum_irregular_verbs: {
      audioBaseUrl: 'audio_base_url',
      audioPastUrl: 'audio_past_url',
      audioPpUrl: 'audio_pp_url',
      generatedAt: 'audio_generated_at'
    },
    curriculum_readings: { audioUrl: 'passage_audio_url', duration: 'audio_duration_seconds', generatedAt: 'audio_generated_at' },
    curriculum_listening: { audioUrl: 'audio_url', duration: 'audio_duration_seconds', generatedAt: 'audio_generated_at' },
    ielts_listening_sections: { audioUrl: 'audio_url', duration: 'audio_duration_seconds', generatedAt: 'audio_generated_at', voiceId: 'voice_id', accent: 'accent' }
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,
    maxRetries: 3,
    retryDelay: 10000
  },

  // Monthly budget tracking
  budget: {
    monthlyCharLimit: 100000,
    warningThreshold: 90000,
    hardStop: 99000
  }
};
