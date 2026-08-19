import { useFadeIn } from './useFadeIn'
import GrammarSections from './GrammarSections'

/**
 * The section renderers moved to GrammarSections so the collapsed «شرح أعمق»
 * panel renders the SAME shapes as the main explanation — one implementation,
 * no drift between the two layers.
 */
export default function LessonCard({ sections }) {
  const ref = useFadeIn()

  if (!sections?.length) return null

  return (
    <div ref={ref} className="grammar-glass grammar-fade-in p-5 sm:p-7 space-y-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">📘</span>
        <h2 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>الشرح</h2>
      </div>
      <GrammarSections sections={sections} />
    </div>
  )
}
