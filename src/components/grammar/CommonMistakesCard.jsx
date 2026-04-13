import { AlertTriangle } from 'lucide-react'
import { useFadeIn } from './useFadeIn'

export default function CommonMistakesCard({ items }) {
  const ref = useFadeIn()

  if (!items?.length) return null

  return (
    <div ref={ref} className="grammar-glass grammar-fade-in p-5 sm:p-7 space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-rose-400/80" />
        <h2 className="text-sm font-bold text-white/70 font-['Tajawal']">أخطاء شائعة</h2>
      </div>

      <div className="space-y-3">
        {items.map((m, i) => (
          <div key={i} className="grammar-example-row">
            <span className="text-rose-400 text-sm mt-0.5 flex-shrink-0">✗</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3 flex-wrap" dir="ltr">
                <span className="text-[15px] text-rose-400/80 font-['Inter'] grammar-example-wrong">
                  {m.wrong}
                </span>
                <span className="text-white/20">→</span>
                <span className="text-[15px] text-emerald-400 font-semibold font-['Inter']">
                  {m.correct}
                </span>
              </div>
              {m.explanation_ar && (
                <p className="text-xs text-white/35 font-['Tajawal']" dir="rtl">
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
