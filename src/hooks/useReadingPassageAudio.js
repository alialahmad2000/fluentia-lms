import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetches reading_passage_audio for a passage and maps to SmartAudioPlayer segments shape.
 * The table stores ONE row per passage (full audio + flat word_timestamps).
 */
export function useReadingPassageAudio(passageId, passageContent) {
  const [audioData, setAudioData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    if (!passageId) { setLoading(false); return }

    const fetch = async () => {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('reading_passage_audio')
        .select('full_audio_url, full_duration_ms, word_timestamps, paragraph_audio, voice_id')
        .eq('passage_id', passageId)
        .maybeSingle()

      if (!isMounted) return

      if (err) { setError(err); setLoading(false); return }
      if (!data) { setLoading(false); return }

      const paragraphs = passageContent?.paragraphs || []
      const fullText = paragraphs.join('\n\n')

      // Normalize word_timestamps shape: the column has two historical shapes,
      //   * legacy flat array  [ {word, start_ms, end_ms}, … ]
      //   * regen object       { all_words: [ … ], paragraphs: [ … ] }
      // useKaraoke expects a flat array (uses .length + indexed access). Without
      // normalization, the object form silently breaks karaoke on every reading
      // whose audio was regenerated via the with-timestamps endpoint.
      let normalizedWts = data.word_timestamps
      if (normalizedWts && !Array.isArray(normalizedWts) && Array.isArray(normalizedWts.all_words)) {
        normalizedWts = normalizedWts.all_words
      } else if (!Array.isArray(normalizedWts)) {
        normalizedWts = []
      }

      setAudioData({
        segments: [{
          audio_url: data.full_audio_url,
          duration_ms: data.full_duration_ms || 0,
          text_content: fullText,
          word_timestamps: normalizedWts,
          segment_index: 0,
          speaker_label: null,
          voice_id: data.voice_id,
        }],
        paragraphAudio: data.paragraph_audio || [],
        voiceId: data.voice_id,
      })
      setLoading(false)
    }

    fetch()
    return () => { isMounted = false }
  }, [passageId, passageContent])

  return { audioData, loading, error }
}
