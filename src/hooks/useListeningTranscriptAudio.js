import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function normalizeTimestamps(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(e => {
    const word = e.word ?? e.text ?? e.w ?? ''
    let start = e.start_ms ?? e.start ?? e.s ?? 0
    let end = e.end_ms ?? e.end ?? e.e ?? 0
    if (start < 100 && end < 100 && end > start) { start *= 1000; end *= 1000 }
    return { word, start_ms: start, end_ms: end }
  }).filter(t => t.word && t.end_ms > t.start_ms)
}

export function useListeningTranscriptAudio(transcriptId) {
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    if (!transcriptId) { setLoading(false); return }

    const fetchSegs = async () => {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('listening_audio')
        .select('audio_url, duration_ms, text_content, word_timestamps, segment_index, speaker_label, voice_id, char_count')
        .eq('transcript_id', transcriptId)
        .order('segment_index', { ascending: true })

      if (!isMounted) return

      if (err) {
        setError(err)
        setSegments([])
      } else {
        setSegments((data || []).map(row => ({
          audio_url: row.audio_url,
          duration_ms: row.duration_ms,
          text_content: row.text_content,
          word_timestamps: normalizeTimestamps(row.word_timestamps),
          segment_index: row.segment_index,
          speaker_label: row.speaker_label,
          voice_id: row.voice_id,
          char_count: row.char_count,
        })))
      }
      setLoading(false)
    }

    fetchSegs()
    return () => { isMounted = false }
  }, [transcriptId])

  return { segments, loading, error }
}
