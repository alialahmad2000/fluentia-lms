// Admin UUIDs — only these users see the ThemeSwitcher
export const ADMIN_UUIDS = [
  'e5528ced-b3e2-45bb-8c89-9368dc9b5b96', // د. علي الأحمد
]

export const THEMES = [
  { id: 'aurora-cinematic', label: 'الشفق السينمائي', colors: ['#38bdf8', '#a78bfa', '#fbbf24'] },
  { id: 'night', label: 'ليل الذهب', colors: ['#e9b949', '#5a4a8c', '#1f3a5f'] },
  { id: 'minimal', label: 'الحد الأدنى', colors: ['#0284c7', '#7c3aed', '#d97706'] },
]

export const DEFAULT_THEME = 'night'
export const THEME_STORAGE_KEY = 'fluentia-theme'
