import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AnkiHome from './AnkiHome'
import AnkiReviewSession from './AnkiReviewSession'
import AnkiSettings from './AnkiSettings'

/**
 * Top-level container that routes the Anki flow:
 *   home → session → home
 *   home → settings → home
 */
export default function AnkiContainer({ studentId, onBack }) {
  const [phase, setPhase] = useState('home') // 'home' | 'session' | 'settings'
  const [settings, setSettings] = useState(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!studentId) return
      setLoadingSettings(true)
      const { data } = await supabase
        .from('students')
        .select(
          'anki_daily_new_cards, anki_daily_max_reviews, anki_review_order, anki_autoplay_audio'
        )
        .eq('id', studentId)
        .maybeSingle()
      if (cancelled) return
      setSettings({
        daily_new_cards: data?.anki_daily_new_cards ?? 20,
        daily_max_reviews: data?.anki_daily_max_reviews ?? 200,
        review_order: data?.anki_review_order ?? 'by_level',
        autoplay_audio: !!data?.anki_autoplay_audio,
      })
      setLoadingSettings(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loadingSettings || !settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-[var(--text-muted)] font-['Tajawal']">جاري التحميل…</div>
      </div>
    )
  }

  if (phase === 'session') {
    return (
      <AnkiReviewSession
        studentId={studentId}
        settings={settings}
        onExit={() => setPhase('home')}
      />
    )
  }

  if (phase === 'settings') {
    return (
      <AnkiSettings
        studentId={studentId}
        settings={settings}
        onBack={() => setPhase('home')}
        onSaved={(next) => setSettings(next)}
      />
    )
  }

  return (
    <AnkiHome
      studentId={studentId}
      settings={settings}
      onStart={() => setPhase('session')}
      onOpenSettings={() => setPhase('settings')}
      onBack={onBack}
    />
  )
}
