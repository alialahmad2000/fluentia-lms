import { Star, Flame, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toArabicNum } from '../../lib/vocabFormat'

/**
 * Shared chrome across all vocabulary surfaces: title + the three "constellation"
 * stats (words in your sky / streak / due) and an optional action slot. The due
 * pill links to the review surface, except on the review surface itself.
 */
export default function VocabHeader({
  title,
  subtitle,
  stats,
  action = null,
  dueHref = '/student/srs',
  isReviewSurface = false,
}) {
  const wordsKnown = stats?.wordsKnown ?? 0
  const streak = stats?.streak ?? 0
  const due = stats?.dueCount ?? 0

  const duePill = (
    <>
      <Sparkles size={14} style={{ color: 'var(--vc-indigo-bright)' }} />
      <span className="tabular-nums">{toArabicNum(due)}</span>
      <span style={{ color: 'var(--vc-text-dim)' }}>للمراجعة</span>
    </>
  )

  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: 'var(--vc-text)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--vc-text-dim)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="vc-pill vc-pill-gold" title="عدد الكلمات التي أتقنتِها">
          <Star size={14} fill="currentColor" />
          <span className="tabular-nums">{toArabicNum(wordsKnown)}</span>
          <span style={{ color: 'rgba(252,211,77,0.7)' }}>كلمة في سمائك</span>
        </div>

        {streak > 0 && (
          <div className="vc-pill">
            <Flame size={14} style={{ color: 'rgb(251,146,60)' }} />
            <span className="tabular-nums">{toArabicNum(streak)}</span>
            <span style={{ color: 'var(--vc-text-dim)' }}>يوم متتالي</span>
          </div>
        )}

        {due > 0 &&
          (isReviewSurface ? (
            <div className="vc-pill">{duePill}</div>
          ) : (
            <Link to={dueHref} className="vc-pill" style={{ textDecoration: 'none' }}>
              {duePill}
            </Link>
          ))}
      </div>
    </header>
  )
}
