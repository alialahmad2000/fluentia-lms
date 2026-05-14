import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CACHE = new Map()

export function useTranslateWord() {
  const [translation, setTranslation] = useState({ ar: null, loading: false })
  const lastWordRef = useRef(null)

  const fetchTranslation = useCallback(async (word) => {
    const key = word.toLowerCase()
    lastWordRef.current = key

    if (CACHE.has(key)) {
      setTranslation({ ar: CACHE.get(key), loading: false })
      return
    }
    setTranslation({ ar: null, loading: true })
    try {
      const { data, error } = await supabase.functions.invoke('vocab-quick-meaning', {
        body: { word }
      })
      if (lastWordRef.current !== key) return
      if (error) throw error
      const ar = data?.meaning_ar || null
      if (ar) CACHE.set(key, ar)
      setTranslation({ ar, loading: false })
    } catch {
      if (lastWordRef.current !== key) return
      setTranslation({ ar: null, loading: false })
    }
  }, [])

  return { translation, fetchTranslation }
}
