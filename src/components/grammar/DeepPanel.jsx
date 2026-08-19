import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronDown, Layers } from 'lucide-react'
import { useG } from '@/i18n/gender'
import GrammarSections from './GrammarSections'

/**
 * Tier 2 — «شرح أعمق».
 *
 * The main «الشرح» card is deliberately short: rule, when to use it, a formula,
 * examples. The audit showed that leaves real gaps — the negative form appears
 * in 33% of standard lessons, the question form in 24%, short answers in 0% and
 * spelling changes in 1% — which is why a student can finish a unit and still
 * not feel sure.
 *
 * This panel carries all of that, collapsed, so the lesson stays scannable for
 * the student who already understood it and opens for the one who did not.
 */
export default function DeepPanel({ content }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const g = useG()
  const sections = content?.sections || []

  if (!sections.length) return null

  // Describe what is ACTUALLY inside, from the headings present — never promise
  // a section this lesson does not have.
  const inside = sections
    .filter((x) => x.type === 'heading' && (x.content || x.title))
    .map((x) => x.content || x.title)
  const summary = inside.length ? inside.join(' · ') : 'تفاصيل إضافية عن هذه القاعدة'

  return (
    <div className="grammar-glass mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 sm:px-7 py-4 text-start transition-colors"
        style={{ minHeight: 56 }}
      >
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)' }}
        >
          <Layers size={16} style={{ color: 'var(--accent-sky)' }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
            شرح أعمق
          </span>
          <span className="block text-xs font-['Tajawal'] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {open ? g('أغلقي هذا القسم متى ما اكتفيتِ', 'أغلق هذا القسم متى ما اكتفيت') : summary}
          </span>
        </span>
        <ChevronDown
          size={18}
          className="flex-shrink-0"
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms ease-out',
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-5 sm:px-7 pb-6 pt-5"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <GrammarSections sections={sections} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
