import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { DEFAULT_THEME, THEME_STORAGE_KEY } from './constants'
import { applyTheme, VALID_THEMES } from './applyTheme'

/**
 * Restores the saved theme on app boot.
 * Resolution priority:
 *   1. profiles.theme_preference (DB — syncs across devices)
 *   2. localStorage (anonymous / offline fallback)
 *   3. 'night' default
 */
export default function ThemeProvider() {
  const userId = useAuthStore((s) => s.user?.id)

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      // Priority 1: DB preference
      if (userId) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('theme_preference')
            .eq('id', userId)
            .single()
          if (!cancelled && !error && data?.theme_preference && VALID_THEMES.includes(data.theme_preference)) {
            applyTheme(data.theme_preference)
            return
          }
        } catch {}
      }

      // Priority 2: localStorage
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY)
        if (!cancelled && saved && VALID_THEMES.includes(saved)) {
          applyTheme(saved)
          return
        }
      } catch {}

      // Priority 3: default
      if (!cancelled) applyTheme(DEFAULT_THEME)
    }

    resolve()
    return () => { cancelled = true }
  }, [userId])

  return null
}
