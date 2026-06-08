import { motion } from 'framer-motion'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { toArabicNum } from '../../../lib/vocabFormat'

// ── Spelling Lab — progression map ───────────────────────────────────────────
// Surfaces the (already-existing) leveling so the student always sees "where am
// I / what's next" instead of a bare random drill. Level = 1 + mastered/5; every
// 5 mastered words = +1 level. Mirrors the Constellation "next stop" card.

export default function SpellingProgressMap({ overview, loading, onStart }) {
  if (loading) {
    return <div className="vc-card" style={{ height: 168 }} />
  }
  if (!overview) return null

  const level      = overview.level ?? 1
  const nextLevel  = overview.next_level ?? level + 1
  const progress   = Math.max(0, Math.min(5, overview.level_progress ?? 0)) // 0..5 mastered this level
  const toNext     = overview.to_next_level ?? 5
  const remaining  = overview.remaining_at_level ?? 0
  const due        = overview.due ?? 0
  const pct        = Math.round((progress / 5) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="vc-card relative overflow-hidden"
      style={{ padding: 22 }}
      dir="rtl"
    >
      <div className="vc-nebula vc-nebula-a" aria-hidden="true" style={{ position: 'absolute' }} />
      <div className="relative" style={{ zIndex: 1 }}>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap size={15} style={{ color: 'var(--vc-gold)' }} />
          <span className="text-[13px] font-bold tracking-wide" style={{ color: 'var(--vc-gold)' }}>
            رحلتكِ في الإملاء
          </span>
        </div>

        {/* level → next level */}
        <div className="flex items-center justify-between mb-2" dir="ltr">
          <span className="flex items-center gap-2">
            <span className="text-[28px] font-bold tabular-nums leading-none" style={{ color: 'var(--vc-text)' }}>
              {toArabicNum(level)}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--vc-text-dim)' }}>المستوى</span>
          </span>
          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--vc-text-dim)' }}>
            المستوى {toArabicNum(nextLevel)} <ArrowLeft size={13} />
          </span>
        </div>

        {/* progress bar to the next level (mastered words this level / 5) */}
        <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--vc-surface-2)' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--vc-gold), var(--vc-gold-soft))', boxShadow: 'var(--vc-glow-gold)' }}
          />
        </div>
        <p className="mt-2.5 text-[13px]" style={{ color: 'var(--vc-text-soft)' }}>
          {toNext >= 5
            ? 'ابدئي بإتقان الكلمات لترتقي للمستوى التالي'
            : `باقٍ ${toArabicNum(toNext)} ${toNext === 1 ? 'كلمة' : 'كلمات'} لإتقانها للوصول للمستوى ${toArabicNum(nextLevel)}`}
        </p>

        {/* what's available at this level */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="vc-pill text-[12.5px] tabular-nums">
            {toArabicNum(remaining)} كلمة جديدة بانتظارك
          </span>
          {due > 0 && (
            <span className="vc-pill text-[12.5px] tabular-nums">
              {toArabicNum(due)} للمراجعة اليوم
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="vc-btn vc-btn-gold w-full mt-5 flex items-center justify-center gap-2"
          style={{ height: 52, fontSize: 16, fontWeight: 700 }}
        >
          <span>{due > 0 ? 'تابعي التدريب والمراجعة' : 'تابعي التدريب'}</span>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  )
}
