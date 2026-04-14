import { useEffect } from 'react'
import { DEFAULT_THEME, THEME_STORAGE_KEY } from './constants'

/**
 * Restores the saved theme on app boot.
 * Renders nothing — just a side-effect hook.
 */
export default function ThemeProvider() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME
      document.documentElement.setAttribute('data-theme', saved)
    } catch {
      // Safari private mode or storage blocked — fall back silently
      document.documentElement.setAttribute('data-theme', DEFAULT_THEME)
    }
  }, [])

  return null
}
