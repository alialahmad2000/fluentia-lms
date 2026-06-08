import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { toArabicNum, estMinutes } from '@/lib/vocabFormat'

/**
 * The focal "next stop" on the path — always one clear next step.
 * Shows the current region theme, which constellation you're on, the size of
 * the upcoming micro-session, and the single "ابدئي" CTA.
 */
export default function NextStopCard({ current, region, dueCount = 0, onStart }) {
  if (!current) return null
  // "new words" = words in this constellation not yet practiced. The journey
  // advances on coverage (studied), so count down from studied, not mastered.
  const toLearn = Math.max(0, (current.total || 0) - (current.studied ?? current.mastered ?? 0))
  const constTotal = region?.constellations || 1
  // the stop blends new words + a few folded-in reviews
  const approxWords = toLearn + Math.min(dueCount, 4)
  const mins = estMinutes(approxWords || current.total)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="vc-card relative overflow-hidden"
      style={{ padding: 22 }}
    >
      <div className="vc-nebula vc-nebula-a" aria-hidden="true" style={{ position: 'absolute' }} />
      <div className="relative" style={{ zIndex: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} style={{ color: 'var(--vc-gold, #e9b949)' }} />
          <span
            className="text-[13px] font-bold tracking-wide"
            style={{ color: 'var(--vc-gold, #e9b949)', fontFamily: "'Tajawal', sans-serif" }}
          >
            المحطة التالية
          </span>
        </div>

        <h2
          className="text-[22px] font-bold leading-snug"
          style={{ color: 'var(--vc-text, #f4f5ff)', fontFamily: "'Tajawal', sans-serif" }}
        >
          {current.theme_ar}
        </h2>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--vc-text-dim, #c7d2fe)' }}>
          الكوكبة {toArabicNum((current.constellation_index || 0) + 1)} من {toArabicNum(constTotal)}
        </p>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="vc-pill text-[12.5px] tabular-nums">
            {toArabicNum(toLearn)} كلمة جديدة
          </span>
          {dueCount > 0 && (
            <span className="vc-pill text-[12.5px] tabular-nums">
              + {toArabicNum(Math.min(dueCount, 4))} مراجعة
            </span>
          )}
          <span className="vc-pill text-[12.5px] tabular-nums">
            ~{toArabicNum(mins)} دقائق
          </span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="vc-btn vc-btn-gold w-full mt-5 flex items-center justify-center gap-2"
          style={{ height: 52, fontSize: 16, fontWeight: 700 }}
        >
          <span>ابدئي</span>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  )
}
