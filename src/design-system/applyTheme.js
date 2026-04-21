import { THEMES, THEME_STORAGE_KEY, DEFAULT_THEME } from './constants'

// ─── Trainer themes ──────────────────────────────────────────
const TRAINER_THEMES = [
  'theme-gold-command',
  'theme-deep-teal',
  'theme-daylight-study',
  'theme-mission-black',
  'theme-linear',
]

const TRAINER_PREF_MAP = {
  'gold-command':   'theme-gold-command',
  'deep-teal':      'theme-deep-teal',
  'daylight-study': 'theme-daylight-study',
  'mission-black':  'theme-mission-black',
  'linear':         'theme-linear',
}

// Legacy theme-name migration — maps old stored values → theme-linear
const LEGACY_PREFS = new Set(['gold-command', 'deep-teal', 'daylight-study', 'mission-black'])

export function applyTrainerTheme(pref) {
  const body = document.body
  TRAINER_THEMES.forEach((t) => body.classList.remove(t))
  // Migrate any legacy stored preference to linear
  const effectivePref = LEGACY_PREFS.has(pref) ? 'linear' : (pref || 'linear')
  const cls = TRAINER_PREF_MAP[effectivePref] || 'theme-linear'
  body.classList.add(cls)
  try { localStorage.setItem('fluentia_trainer_theme', effectivePref) } catch {}
}

export function getTrainerThemeFromStorage() {
  try {
    const stored = localStorage.getItem('fluentia_trainer_theme') || 'linear'
    return LEGACY_PREFS.has(stored) ? 'linear' : stored
  } catch { return 'linear' }
}

export function enterMissionBlack() {
  /* DEPRECATED 2026-04-21 — mission-black auto-swap removed; trainer portal uses theme-linear only */
  return
}

export function exitMissionBlack(_previousPref) {
  /* DEPRECATED 2026-04-21 — mission-black auto-swap removed; trainer portal uses theme-linear only */
  return
}

export const VALID_THEMES = THEMES.map(t => t.id)

export function applyTheme(name) {
  if (!VALID_THEMES.includes(name)) name = DEFAULT_THEME
  document.documentElement.setAttribute('data-theme', name)
  try { localStorage.setItem(THEME_STORAGE_KEY, name) } catch {}
}

export async function saveThemePreference(supabase, userId, name) {
  if (!userId || !VALID_THEMES.includes(name)) return { error: 'invalid' }
  const { data, error } = await supabase
    .from('profiles')
    .update({ theme_preference: name })
    .eq('id', userId)
    .select()
  if (error) return { error }
  if (!data || data.length === 0) return { error: 'rls_blocked' }
  return { data: data[0] }
}
