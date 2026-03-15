import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

const MODES = [
  { key: 'dark', icon: Moon, label: 'داكن' },
  { key: 'light', icon: Sun, label: 'فاتح' },
  { key: 'auto', icon: Monitor, label: 'تلقائي' },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="flex items-center border rounded-xl p-0.5 gap-0.5" style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
      {MODES.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={label}
          className={`p-1.5 rounded-lg cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 ${
            theme === key
              ? 'bg-sky-500/15 text-sky-400 shadow-sm'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-card-hover)]'
          }`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
