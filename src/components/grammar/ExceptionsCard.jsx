import { useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { useFadeIn } from './useFadeIn'

export default function ExceptionsCard({ exceptions }) {
  const ref = useFadeIn()

  if (!exceptions?.length) return null

  return (
    <div ref={ref} className="grammar-glass grammar-fade-in p-5 sm:p-7 space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
        <h2 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
          انتبهي للاستثناءات
        </h2>
      </div>

      <div className="space-y-3">
        {exceptions.map((exc, i) => (
          <ExceptionBlock key={i} exception={exc} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  )
}

function ExceptionBlock({ exception, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold font-['Tajawal'] transition-colors"
        style={{ color: 'var(--text-primary)' }}
      >
        <span>{exception.title_ar}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Rule text */}
          <p className="text-xs font-['Tajawal'] leading-relaxed" dir="rtl" style={{ color: 'var(--text-secondary)' }}>
            {exception.rule_ar}
          </p>

          {/* Examples table */}
          {exception.examples?.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--glass-card)' }}>
                    <th className="px-3 py-2 text-start font-['Inter'] font-bold" style={{ color: 'var(--text-tertiary)' }}>Base</th>
                    <th className="px-3 py-2 text-start font-['Inter'] font-bold" style={{ color: 'var(--success)' }}>Correct</th>
                    {exception.examples.some(e => e.wrong) && (
                      <th className="px-3 py-2 text-start font-['Inter'] font-bold" style={{ color: 'var(--danger)' }}>Common mistake</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {exception.examples.map((ex, j) => (
                    <tr key={j} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td className="px-3 py-2 font-['Inter'] font-medium" dir="ltr" style={{ color: 'var(--text-primary)' }}>
                        {ex.base}
                      </td>
                      <td className="px-3 py-2 font-['Inter'] font-semibold" dir="ltr" style={{ color: 'var(--success)' }}>
                        {ex.correct || ex.past}
                      </td>
                      {exception.examples.some(e => e.wrong) && (
                        <td className="px-3 py-2 font-['Inter'] line-through" dir="ltr" style={{ color: 'var(--danger)', opacity: 0.7 }}>
                          {ex.wrong || '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
