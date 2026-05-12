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

      setAudioData({
        segments: [{
          audio_url: data.full_audio_url,
          duration_ms: data.full_duration_ms || 0,
          text_content: fullText,
          word_timestamps: data.word_timestamps || [],
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
