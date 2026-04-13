import { AlertTriangle } from 'lucide-react'
import { useFadeIn } from './useFadeIn'

export default function CommonMistakesCard({ items }) {
  const ref = useFadeIn()

  if (!items?.length) return null

  return (
    <div ref={ref} className="grammar-glass grammar-fade-in p-5 sm:p-7 space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} style={{ color: 'var(--accent-rose)' }} />
        <h2 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>أخطاء شائعة</h2>
      </div>

      <div className="space-y-3">
        {items.map((m, i) => (
          <div key={i} className="grammar-example-row">
            <span className="text-sm mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-rose)' }}>✗</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3 flex-wrap" dir="ltr">
                <span className="text-[15px] font-['Inter'] grammar-example-wrong" style={{ color: 'var(--accent-rose)' }}>
                  {m.wrong}
                </span>
                <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                <span className="text-[15px] font-semibold font-['Inter']" style={{ color: 'var(--success)' }}>
                  {m.correct}
                </span>
              </div>
              {m.explanation_ar && (
                <p className="text-xs font-['Tajawal']" dir="rtl" style={{ color: 'var(--text-tertiary)' }}>
                  {m.explanation_ar}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
