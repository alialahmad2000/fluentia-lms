import { useRef, useEffect } from 'react'
import { Settings, X } from 'lucide-react'

const SETTINGS = [
  { key: 'karaoke',           label: 'تفعيل الكاريوكي' },
  { key: 'sentenceMode',      label: 'وضع الجملة (توقف بعد كل جملة)' },
  { key: 'hideTranscript',    label: 'إخفاء / إظهار النص' },
  { key: 'abLoop',            label: 'تكرار A-B' },
  { key: 'dictation',         label: 'وضع الإملاء' },
  { key: 'keyboardShortcuts', label: 'اختصارات الكيبورد' },
]

export function SettingsMenu({ open, onClose, features, onToggleFeature }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute top-10 left-4 w-64 rounded-xl p-4 z-30 shadow-xl"
      style={{ background: 'var(--bg-card, #1c1c1e)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200 font-['Tajawal']">الإعدادات</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16}/></button>
      </div>
      <ul className="space-y-2">
        {SETTINGS.map(({ key, label }) => {
          if (!(key in features)) return null
          return (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300 font-['Tajawal']">{label}</span>
              <button
                onClick={() => onToggleFeature(key)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${features[key] ? 'bg-sky-500' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${features[key] ? 'translate-x-5' : 'translate-x-0.5'}`}/>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function SettingsButton({ onClick }) {
  return (
    <button onClick={onClick} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
      <Settings size={16}/>
    </button>
  )
}
