// DeskReview — the "reinforce" hub. Everything that isn't the main path (daily habit,
// reading, class debriefs, growth, phrasebook) lives here as ONE calm shelf, so the
// nav stays down to four clear destinations. Nocturne dark, English-primary.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Flame, BookOpen, GraduationCap, TrendingUp, NotebookPen } from 'lucide-react'
import { useProgram } from './useProgram'
import './desk.css'

export default function DeskReview() {
  const rm = useReducedMotion()
  const { reading, classes, vocabStats, grammarStats, session } = useProgram()

  const cards = [
    {
      id: 'daily', to: '/desk/daily', icon: Flame,
      en: 'Daily practice', ar: 'التدريب اليومي',
      blurb: 'Review your words (spaced repetition) and a grammar rule a day.',
      stat: session.streak > 0 ? `${session.streak}-day streak` : `${vocabStats?.mastered || 0} words mastered`,
    },
    {
      id: 'reading', to: '/desk/reading', icon: BookOpen,
      en: 'Reading', ar: 'القراءة',
      blurb: 'Short passages in your field — build professional reading & vocabulary.',
      stat: `${reading?.done || 0} / ${reading?.total || 0} read`,
    },
    {
      id: 'classes', to: '/desk/classes', icon: GraduationCap,
      en: 'My Classes', ar: 'حصصي',
      blurb: 'A keepsake of every 1-on-1 class — recap, check, and practice what you took.',
      stat: `${classes?.done || 0} / ${classes?.total || 0} reviewed`,
    },
    {
      id: 'growth', to: '/desk/growth', icon: TrendingUp,
      en: 'Growth', ar: 'تقدّمي',
      blurb: 'Your readiness and the points worth working on, from your real calls.',
      stat: 'Your progress',
    },
    {
      id: 'phrasebook', to: '/desk/phrasebank', icon: NotebookPen,
      en: 'My Phrasebook', ar: 'دفتري',
      blurb: 'Your own basic → natural corrections, plus every phrase from the plan.',
      stat: 'Your phrases',
    },
  ]

  return (
    <div className="space-y-8 max-w-[860px]">
      {/* masthead */}
      <div className="desk-rise">
        <p className="desk-eyebrow mb-2">REINFORCE</p>
        <h1 className="font-['Fraunces'] font-semibold text-[32px] lg:text-[40px] leading-tight tracking-[-0.01em]" dir="ltr" style={{ color: 'var(--ink)' }}>Review</h1>
        <p className="font-['Tajawal'] text-[13px] mt-1" style={{ color: 'var(--ink-3)' }}>المراجعة</p>
        <p className="font-['Hanken_Grotesk'] text-[14px] mt-2.5 max-w-[560px] leading-relaxed" dir="ltr" style={{ color: 'var(--ink-2)' }}>
          Everything that strengthens what you learn on the plan — dip in whenever you want.
        </p>
      </div>

      {/* cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon
          return (
            <motion.div key={c.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}>
              <Link to={c.to} className="group desk-glass p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="desk-mini-mark"><Icon size={17} /></div>
                  <span className="desk-mono text-[11px] px-2.5 py-1 rounded-full" dir="ltr" style={{ color: 'var(--ink-3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>{c.stat}</span>
                </div>
                <h3 className="font-['Fraunces'] font-medium text-[19px] leading-tight" dir="ltr" style={{ color: 'var(--ink)' }}>
                  {c.en} <span className="font-['Tajawal'] text-[13px]" style={{ color: 'var(--ink-3)' }}>· {c.ar}</span>
                </h3>
                <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-1.5 leading-relaxed" dir="ltr" style={{ color: 'var(--ink-2)' }}>{c.blurb}</p>
                <span className="mt-auto pt-4 inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12.5px] font-bold" dir="ltr" style={{ color: 'var(--coral-deep)' }}>
                  Open <ArrowRight size={14} />
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
