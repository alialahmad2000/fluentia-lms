import { create } from 'zustand'

// Legacy theme store — kept for backward compatibility with older components.
// The canonical theme system is now src/design-system/ (ThemeProvider + applyTheme).
// This store bridges old → new by mapping legacy names to design-system names.

const STORAGE_KEY = 'fluentia-theme' // aligned with design-system key
const LEGACY_STORAGE_KEY = 'fluentia_theme' // old key — migrate from

const LEGACY_TO_DS = {
  'deep-space': 'night',
  'frost-white': 'minimal',
  'aurora': 'aurora-cinematic',
  'dark': 'night',
  'light': 'minimal',
}

const DS_THEMES = ['aurora-cinematic', 'night', 'minimal']

function resolveTheme() {
  try {
    // Try new key first
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && DS_THEMES.includes(saved)) return saved

    // Migrate old key
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const mapped = LEGACY_TO_DS[legacy] || (DS_THEMES.includes(legacy) ? legacy : null)
      if (mapped) {
        localStorage.setItem(STORAGE_KEY, mapped)
        return mapped
      }
    }
  } catch {}
  return 'night'
}

function applyTheme(theme, animate = false) {
  const root = document.documentElement

  if (animate) {
    root.classList.add('theme-transition')
    document.body.classList.add('theme-transitioning')
    setTimeout(() => {
      root.classList.remove('theme-transition')
      document.body.classList.remove('theme-transitioning')
    }, 350)
  }

  // Set data-theme attribute (drives CSS variable cascade)
  root.setAttribute('data-theme', theme)

  // Backward-compat class (.dark / .light)
  root.classList.remove('dark', 'light')
  root.classList.add(theme === 'minimal' ? 'light' : 'dark')

  // Update browser chrome color
  const metaColors = {
    'night': '#05070d',
    'aurora-cinematic': '#060e1c',
    'minimal': '#f8f9fb',
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColors[theme] || '#05070d')
}

export const useThemeStore = create((set) => {
  const initial = resolveTheme()
  applyTheme(initial)

  return {
    theme: initial,
    // Legacy alias: LoginPage uses this to pick dark/light logo
    effectiveTheme: initial === 'minimal' ? 'light' : 'dark',

    setTheme(theme) {
      // Accept legacy names
      const mapped = LEGACY_TO_DS[theme] || theme
      if (!DS_THEMES.includes(mapped)) return
      applyTheme(mapped, true)
      try { localStorage.setItem(STORAGE_KEY, mapped) } catch {}
      set({ theme: mapped, effectiveTheme: mapped === 'minimal' ? 'light' : 'dark' })
    },
  }
})
