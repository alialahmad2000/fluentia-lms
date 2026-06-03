import { useState, useCallback, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { addCard } from '../services/vocab'

export function useSavedWords() {
  const { profile, user } = useAuthStore(useShallow((s) => ({ profile: s.profile, user: s.user })))
  const studentId = profile?.id ?? user?.id
  const [savedSet, setSavedSet] = useState(new Set())

  useEffect(() => {
    if (!studentId) return
    let isMounted = true
    // Unified store: saved words now live in vocab_cards.
    supabase
      .from('vocab_cards')
      .select('word_normalized')
      .eq('student_id', studentId)
      .then(({ data }) => {
        if (isMounted && data) {
          setSavedSet(new Set(data.map(r => (r.word_normalized || '').toLowerCase())))
        }
      })
    return () => { isMounted = false }
  }, [studentId])

  const isWordSaved = useCallback((word) => savedSet.has(word.toLowerCase()), [savedSet])

  const addWord = useCallback(async ({ word, translation_ar, source = 'reading' }) => {
    if (!studentId || !word) return
    const lower = word.toLowerCase()
    if (savedSet.has(lower)) return
    try {
      // The ONE save path. addCard normalizes + dedupes per student+word and
      // makes the word reviewable; fixes the old non-existent definition_ar insert.
      await addCard(studentId, {
        word: lower,
        meaningAr: translation_ar || null,
        source: source === 'reading_passage' ? 'reading' : source,
      })
      setSavedSet(prev => new Set([...prev, lower]))
    } catch {
      // best-effort — leave savedSet untouched on failure so a retry is possible
    }
  }, [studentId, savedSet])

  return { isWordSaved, addWord }
}
