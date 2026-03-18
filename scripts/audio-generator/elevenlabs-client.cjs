/**
 * ElevenLabs TTS Client for Fluentia LMS
 * Handles text-to-speech generation with rate limiting and error handling
 */

const fetch = require('node-fetch');

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
      modelId = 'eleven_multilingual_v2',
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0.0,
      outputFormat = 'mp3_44100_128'
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
