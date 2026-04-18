import { THEMES, THEME_STORAGE_KEY, DEFAULT_THEME } from './constants'

// ─── Trainer themes ──────────────────────────────────────────
const TRAINER_THEMES = [
  'theme-gold-command',
  'theme-deep-teal',
  'theme-daylight-study',
  'theme-mission-black',
]

const TRAINER_PREF_MAP = {
  'gold-command':   'theme-gold-command',
  'deep-teal':      'theme-deep-teal',
  'daylight-study': 'theme-daylight-study',
  'mission-black':  'theme-mission-black',
}

export function applyTrainerTheme(pref) {
  const body = document.body
  TRAINER_THEMES.forEach((t) => body.classList.remove(t))
  const cls = TRAINER_PREF_MAP[pref] || 'theme-gold-command'
  body.classList.add(cls)
  try { localStorage.setItem('fluentia_trainer_theme', pref || 'gold-command') } catch {}
}

export function getTrainerThemeFromStorage() {
  try { return localStorage.getItem('fluentia_trainer_theme') || 'gold-command' } catch { return 'gold-command' }
}

export function enterMissionBlack() {
  document.body.classList.add('theme-mission-black--active')
  applyTrainerTheme('mission-black')
}

export function exitMissionBlack(previousPref) {
  document.body.classList.remove('theme-mission-black--active')
  applyTrainerTheme(previousPref || getTrainerThemeFromStorage())
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
