import { Headphones, BookOpen, PenTool, Mic, CheckCircle } from 'lucide-react'

const SECTIONS = [
  { key: 'listening', label: 'استماع', icon: Headphones },
  { key: 'reading',   label: 'قراءة',   icon: BookOpen },
  { key: 'writing',   label: 'كتابة',   icon: PenTool },
  { key: 'speaking',  label: 'محادثة',  icon: Mic },
]

const ORDER = ['listening', 'reading', 'writing', 'speaking', 'submitting']

export default function DiagnosticProgress({ currentSection }) {
  const currentIdx = ORDER.indexOf(currentSection)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, direction: 'rtl' }}>
      {SECTIONS.map((s, i) => {
        const sectionIdx = ORDER.indexOf(s.key)
        const done = currentIdx > sectionIdx
        const active = currentSection === s.key
        const Icon = done ? CheckCircle : s.icon

        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done
                  ? 'rgba(74,222,128,0.15)'
                  : active
                  ? 'rgba(56,189,248,0.2)'
                  : 'rgba(255,255,255,0.04)',
                border: done
                  ? '1.5px solid rgba(74,222,128,0.5)'
                  : active
                  ? '1.5px solid rgba(56,189,248,0.6)'
                  : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
              }}>
                <Icon
                  size={15}
                  style={{
                    color: done ? '#4ade80' : active ? '#38bdf8' : 'rgba(255,255,255,0.3)',
                    transition: 'color 0.3s ease',
                  }}
                />
              </div>
              <span style={{
                fontSize: 10, fontFamily: 'Tajawal', fontWeight: active ? 700 : 400,
                color: done ? '#4ade80' : active ? '#38bdf8' : 'rgba(255,255,255,0.3)',
              }}>{s.label}</span>
            </div>
            {i < SECTIONS.length - 1 && (
              <div style={{
                width: 32, height: 2, marginBottom: 18,
                background: done ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
