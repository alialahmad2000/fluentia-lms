import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useSavedWords() {
  const { profile, user } = useAuthStore()
  const studentId = profile?.id ?? user?.id
  const [savedSet, setSavedSet] = useState(new Set())

  useEffect(() => {
    if (!studentId) return
    let isMounted = true
    supabase
      .from('student_saved_words')
      .select('word')
      .eq('student_id', studentId)
      .then(({ data }) => {
        if (isMounted && data) {
          setSavedSet(new Set(data.map(r => r.word.toLowerCase())))
        }
      })
    return () => { isMounted = false }
  }, [studentId])

  const isWordSaved = useCallback((word) => savedSet.has(word.toLowerCase()), [savedSet])

  const addWord = useCallback(async ({ word, translation_ar, source = 'reading_passage' }) => {
    if (!studentId || !word) return
    const lower = word.toLowerCase()
    if (savedSet.has(lower)) return
    const { error } = await supabase.from('student_saved_words').insert({
      student_id: studentId,
      word: lower,
      definition_ar: translation_ar || null,
      source,
    })
    if (!error) {
      setSavedSet(prev => new Set([...prev, lower]))
    }
  }, [studentId, savedSet])

  return { isWordSaved, addWord }
}
