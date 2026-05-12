import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useDialectExplanation } from '@/hooks/useDialectExplanation'
import DialectExplanationDrawer from './DialectExplanationDrawer'

export default function DialectExplanationCard({ grammarLessonId }) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: explanation, isLoading } = useDialectExplanation(grammarLessonId)

  if (isLoading || !explanation) return null

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl p-5 mb-6 cursor-pointer transition-all duration-300"
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(135deg, var(--vm-surface-elevated, #1a1530), var(--vm-surface, #0f0a1f))',
        }}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(true) }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = ''; }}
      >
        <div className="pointer-events-none absolute -top-12 -end-12 h-40 w-40 rounded-full blur-3xl"
          style={{ background: 'rgba(212,165,116,0.1)' }} />

        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(212,165,116,0.15)', boxShadow: '0 0 0 1px rgba(212,165,116,0.3)' }}>
            <Sparkles className="h-6 w-6" style={{ color: 'var(--vm-accent, #d4a574)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
                style={{ background: 'rgba(212,165,116,0.2)', color: 'var(--vm-accent, #d4a574)' }}>
                نجدي
              </span>
              <span className="text-xs font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.5)' }}>شرح حصري بلهجتنا</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold leading-snug mb-1 font-['Tajawal']"
              style={{ color: 'var(--text-primary, #fff)' }}>
              اشرح لي هذا الدرس بالنجدي
            </h3>
            <p className="text-sm leading-relaxed font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {explanation.concept_title}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsOpen(true) }}
            className="shrink-0 self-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] font-['Tajawal']"
            style={{ background: 'var(--vm-accent, #d4a574)', color: 'var(--vm-surface, #0f0a1f)' }}
          >
            افتح الشرح
          </button>
        </div>
      </div>

      <DialectExplanationDrawer
        explanation={explanation}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
