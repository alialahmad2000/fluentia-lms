import { create } from 'zustand'

const STORAGE_KEY = 'fluentia_theme'
const THEMES = ['deep-space', 'frost-white', 'aurora']

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

  // Also set class for backward compat (.dark / .light)
  root.classList.remove('dark', 'light')
  if (theme === 'frost-white') {
    root.classList.add('light')
  } else {
    root.classList.add('dark')
  }

  // Update browser chrome color
  const metaColors = {
    'deep-space': '#050d1a',
    'frost-white': '#f8fafc',
    'aurora': '#100e24',
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColors[theme] || '#050d1a')
}

export const useThemeStore = create((set) => {
  let initial = 'deep-space'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Migrate old values
    if (stored === 'dark') initial = 'deep-space'
    else if (stored === 'light') initial = 'frost-white'
    else if (THEMES.includes(stored)) initial = stored
  } catch {}

  applyTheme(initial)

  return {
    theme: initial,

    setTheme(theme) {
      if (!THEMES.includes(theme)) return
      applyTheme(theme, true)
      try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
      set({ theme })
    },
  }
})
