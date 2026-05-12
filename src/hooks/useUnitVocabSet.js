import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns a Set<string> of lowercase vocabulary words for a given unit.
 * curriculum_vocabulary is linked via reading_id → curriculum_readings.unit_id
 */
export function useUnitVocabSet(unitId) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    if (!unitId) { setLoading(false); return }

    const fetch = async () => {
      const { data, error } = await supabase
        .from('curriculum_vocabulary')
        .select('word, curriculum_readings!inner(unit_id)')
        .eq('curriculum_readings.unit_id', unitId)
      if (isMounted) {
        setWords(error ? [] : (data || []).map(r => r.word.toLowerCase()))
        setLoading(false)
      }
    }
    fetch()
    return () => { isMounted = false }
  }, [unitId])

  const vocabSet = useMemo(() => new Set(words), [words])
  return { vocabSet, loading }
}
