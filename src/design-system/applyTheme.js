import { THEMES, THEME_STORAGE_KEY, DEFAULT_THEME } from './constants'

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
