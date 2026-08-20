import { AlertTriangle } from 'lucide-react'
import { useFadeIn } from './useFadeIn'
import { useGenderize } from '@/i18n/gender'
import RichText from './RichText'

export default function CommonMistakesCard({ items }) {
  const ref = useFadeIn()
  const gz = useGenderize()

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
            <div className="flex-1 space-y-1">
              {/* Stacked, each line carrying its own ✗/✓ marker. The previous
                  layout put wrong → correct on ONE wrapping row, so on a phone
                  the arrow wrapped onto a line of its own and read as broken.
                  Marker + colour + the wavy underline means the wrong/right
                  distinction never rests on colour alone. */}
              <div className="flex items-start gap-2" dir="ltr">
                <span className="text-sm flex-shrink-0 leading-relaxed" style={{ color: 'var(--accent-rose)' }} aria-hidden="true">✗</span>
                <span className="text-[15px] font-en grammar-example-wrong" style={{ color: 'var(--accent-rose)' }}>
                  {m.wrong}
                </span>
              </div>
              <div className="flex items-start gap-2" dir="ltr">
                <span className="text-sm flex-shrink-0 leading-relaxed" style={{ color: 'var(--success)' }} aria-hidden="true">✓</span>
                <span className="text-[15px] font-semibold font-en" style={{ color: 'var(--success)' }}>
                  {m.correct}
                </span>
              </div>
              {/* was --text-tertiary: 2.54:1 on the parchment theme, under AA */}
              {/* Through RichText, like every other explanation field: rendered as a
                  bare string, a <b> that points at the exact wrong word printed the
                  tag itself. Commit 24096a4f fixed this for content_ar and formula
                  and missed this card. Plain-text explanations are unaffected. */}
              {m.explanation_ar && (
                <RichText
                  text={gz(m.explanation_ar)}
                  dir="rtl"
                  className="text-[13px] font-['Tajawal'] leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
