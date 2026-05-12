import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export function useWordHighlights({ studentId, contentId, contentType }) {
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    if (!studentId || !contentId) { setLoading(false); return }

    const fetchH = async () => {
      const { data, error } = await supabase
        .from('student_word_highlights')
        .select('id, segment_index, word_index_start, word_index_end, word_text, color, note')
        .eq('student_id', studentId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .is('deleted_at', null)
      if (isMounted) {
        setHighlights(error ? [] : (data || []))
        setLoading(false)
      }
    }
    fetchH()
    return () => { isMounted = false }
  }, [studentId, contentId, contentType])

  const addHighlight = useCallback(async ({ segmentIndex, wordIndexStart, wordIndexEnd, wordText, color, note }) => {
    const optimistic = {
      id: `temp-${Date.now()}`,
      segment_index: segmentIndex,
      word_index_start: wordIndexStart,
      word_index_end: wordIndexEnd,
      word_text: wordText,
      color, note: note || null,
    }
    setHighlights(prev => [...prev, optimistic])
    const { data, error } = await supabase
      .from('student_word_highlights')
      .insert({ student_id: studentId, content_id: contentId, content_type: contentType, segment_index: segmentIndex, word_index_start: wordIndexStart, word_index_end: wordIndexEnd, word_text: wordText, color, note: note || null })
      .select().single()
    if (error) {
      setHighlights(prev => prev.filter(h => h.id !== optimistic.id))
      console.warn('[highlights] add failed:', error.message)
      return null
    }
    setHighlights(prev => prev.map(h => h.id === optimistic.id ? data : h))
    return data
  }, [studentId, contentId, contentType])

  const removeHighlight = useCallback(async (highlightId) => {
    const prev = highlights
    setHighlights(h => h.filter(x => x.id !== highlightId))
    const { error } = await supabase
      .from('student_word_highlights')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', highlightId)
    if (error) { setHighlights(prev); console.warn('[highlights] remove failed:', error.message) }
  }, [highlights])

  const updateColor = useCallback(async (highlightId, newColor) => {
    setHighlights(prev => prev.map(h => h.id === highlightId ? { ...h, color: newColor } : h))
    const { error } = await supabase.from('student_word_highlights').update({ color: newColor }).eq('id', highlightId)
    if (error) console.warn('[highlights] update color failed:', error.message)
  }, [])

  const addNote = useCallback(async (highlightId, note) => {
    const { error } = await supabase.from('student_word_highlights').update({ note: note || null }).eq('id', highlightId)
    if (!error) setHighlights(prev => prev.map(h => h.id === highlightId ? { ...h, note } : h))
  }, [])

  // O(1) lookup map
  const lookup = useMemo(() => {
    const map = new Map()
    for (const h of highlights) {
      for (let i = h.word_index_start; i <= h.word_index_end; i++) {
        map.set(`${h.segment_index}:${i}`, h)
      }
    }
    return map
  }, [highlights])

  return { highlights, lookup, loading, addHighlight, removeHighlight, updateColor, addNote }
}
