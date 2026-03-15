import { create } from 'zustand'

const STORAGE_KEY = 'fluentia_theme'

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function resolveTheme(preference) {
  if (preference === 'auto') return getSystemTheme()
  return preference
}

function applyTheme(effective, animate = false) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-transition')
    setTimeout(() => root.classList.remove('theme-transition'), 300)
  }
  if (effective === 'light') {
    root.classList.remove('dark')
    root.classList.add('light')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc')
  } else {
    root.classList.remove('light')
    root.classList.add('dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#050d1a')
  }
}

export const useThemeStore = create((set, get) => {
  // Read initial preference from localStorage
  let initial = 'dark'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'auto') initial = stored
  } catch {}

  const effective = resolveTheme(initial)
  // Apply immediately on store creation
  applyTheme(effective)

  return {
    theme: initial, // 'dark' | 'light' | 'auto'
    effectiveTheme: effective, // 'dark' | 'light'

    setTheme(preference) {
      const effective = resolveTheme(preference)
      applyTheme(effective, true)
      try { localStorage.setItem(STORAGE_KEY, preference) } catch {}
      set({ theme: preference, effectiveTheme: effective })
    },

    // Called when system preference changes (for auto mode)
    _onSystemChange() {
      const { theme } = get()
      if (theme !== 'auto') return
      const effective = getSystemTheme()
      applyTheme(effective)
      set({ effectiveTheme: effective })
    },
  }
})

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    useThemeStore.getState()._onSystemChange()
  })
}
