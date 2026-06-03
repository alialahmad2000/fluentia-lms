import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, RotateCcw, Dumbbell, PencilLine, ChevronLeft } from 'lucide-react'
import { toArabicNum } from '@/lib/vocabFormat'

/**
 * The "other ways to learn" — students are never forced into only the journey.
 * Every mode they had before stays one tap away (browse/practice, daily review,
 * hard words, spelling), all reading the same unified progress store.
 */
export default function VocabChoiceGrid({ dueCount = 0 }) {
  const choices = [
    {
      to: '/student/flashcards',
      icon: BookOpen,
      title: 'تصفّح وتدرّب',
      subtitle: 'كل المفردات · بطاقات · اختبارات',
      tint: '#a5b4fc',
    },
    {
      to: '/student/srs',
      icon: RotateCcw,
      title: 'مراجعة اليوم',
      subtitle: 'الكلمات المستحقّة للمراجعة',
      tint: '#e9b949',
      badge: dueCount > 0 ? toArabicNum(dueCount) : null,
    },
    {
      to: '/student/hard-words',
      icon: Dumbbell,
      title: 'الكلمات الصعبة',
      subtitle: 'تمرّن على ما يصعب عليك',
      tint: '#f472b6',
    },
    {
      to: '/student/spelling-lab',
      icon: PencilLine,
      title: 'مختبر الإملاء',
      subtitle: 'اكتب الكلمات بإتقان',
      tint: '#34d399',
    },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-3">
        <span
          aria-hidden="true"
          style={{ width: 14, height: 2, borderRadius: 2, background: 'var(--vc-gold, #e9b949)', opacity: 0.8 }}
        />
        <span
          className="text-[13px] font-bold"
          style={{ color: 'var(--vc-text-dim, #c7d2fe)', fontFamily: "'Tajawal', sans-serif" }}
        >
          طرق أخرى للتعلّم — اختاري ما يناسبك
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {choices.map((c, i) => {
          const Icon = c.icon
          return (
            <motion.div
              key={c.to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 * i }}
            >
              <Link
                to={c.to}
                className="vc-card vc-card-hover relative flex flex-col h-full"
                style={{ padding: 16, minHeight: 116, textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between">
                  <span
                    className="flex items-center justify-center rounded-2xl shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      background: `color-mix(in srgb, ${c.tint} 16%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${c.tint} 32%, transparent)`,
                    }}
                  >
                    <Icon size={19} style={{ color: c.tint }} />
                  </span>
                  {c.badge ? (
                    <span
                      className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums"
                      style={{ background: 'rgba(233,185,73,0.18)', color: '#fbe6a8', border: '1px solid rgba(233,185,73,0.34)' }}
                    >
                      {c.badge}
                    </span>
                  ) : (
                    <ChevronLeft size={16} style={{ color: 'rgba(199,210,254,0.4)' }} />
                  )}
                </div>

                <h3
                  className="text-[15px] font-bold mt-3"
                  style={{ color: 'var(--vc-text, #f4f5ff)', fontFamily: "'Tajawal', sans-serif" }}
                >
                  {c.title}
                </h3>
                <p className="text-[12px] mt-0.5 leading-snug" style={{ color: 'rgba(199,210,254,0.62)' }}>
                  {c.subtitle}
                </p>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
