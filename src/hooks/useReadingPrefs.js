import { useState, useCallback } from 'react'

const STORAGE_KEY = 'fluentia_reading_prefs'

const DEFAULTS = {
  word_assistance_enabled: true,
  quick_translation_on_hover_tap: true,
  detailed_menu_on_click_longpress: true,
  show_page_help_hints: true,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}

/**
 * Reading preferences hook — persisted to localStorage.
 * Returns { prefs, setPref, reset }
 */
export function useReadingPrefs() {
  const [prefs, setPrefs] = useState(load)

  const setPref = useCallback((key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value }
      // If both sub-toggles off but master on → treat as master off
      if (key !== 'word_assistance_enabled' && next.word_assistance_enabled) {
        if (!next.quick_translation_on_hover_tap && !next.detailed_menu_on_click_longpress) {
          next.word_assistance_enabled = false
        }
      }
      save(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const d = { ...DEFAULTS }
    setPrefs(d)
    save(d)
  }, [])

  return { prefs, setPref, reset }
}
