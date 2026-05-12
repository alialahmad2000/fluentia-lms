/**
 * findWordTimestamp — looks up a word's audio slice from the current segments.
 *
 * KaraokeText uses SEGMENT-LOCAL word indices (resets to 0 per segment).
 * So segments[segIdx].word_timestamps[wordIdx] is the direct lookup.
 *
 * @param {Array}  segments  - Array of segment objects with audio_url + word_timestamps
 * @param {number} segIdx    - Which segment was tapped (from KaraokeText's segmentIndex prop)
 * @param {number} wordIdx   - Word index LOCAL to that segment
 * @returns {{ audioUrl, startMs, endMs, word, speakerLabel, voiceId } | null}
 */
export function findWordTimestamp(segments, segIdx, wordIdx) {
  if (!Array.isArray(segments) || segIdx == null || wordIdx == null) return null

  const seg = segments[segIdx]
  if (!seg) return null

  const ts = seg.word_timestamps?.[wordIdx]
  if (!ts || !Number.isFinite(ts.start_ms) || !Number.isFinite(ts.end_ms)) return null

  return {
    audioUrl:     seg.audio_url,
    startMs:      ts.start_ms,
    endMs:        ts.end_ms,
    word:         ts.word,
    speakerLabel: seg.speaker_label || null,
    voiceId:      seg.voice_id || null,
  }
}

/** Maps ElevenLabs voice IDs to friendly labels. */
export const VOICE_LABELS = {
  'Xb7hH8MSUJpSbSDYk0k2': 'Alice',
  'JBFqnCBsd6RMkjVDRZzb': 'George',
  'EXAVITQu4vr4xnSDxMaL': 'Sarah',
  'iP95p4xoKVk53GoZ742B': 'Chris',
  'nPczCjzI2devNBz1zQrb': 'Brian',
  'XrExE9yKIg1WjnnlVkGX': 'Priya',
}

/**
 * Resolves a human-readable voice label.
 * Prefers the speaker label (e.g. "Fatima") over the voice ID name.
 */
export function resolveVoiceLabel(voiceId, speakerLabel) {
  if (speakerLabel && /^[A-Za-z]/.test(speakerLabel)) return speakerLabel
  return VOICE_LABELS[voiceId] || 'المتحدّث/ة'
}
