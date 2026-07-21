import { Star, Flame, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toArabicNum } from '../../lib/vocabFormat'

/**
 * Shared chrome across all vocabulary surfaces: title + subtitle + the signature
 * "سماؤك" medallion — a data-driven constellation ring that visibly fills as the
 * student masters (gold) and learns (sky) words. It consolidates the old chip
 * wall and turns "٠ كلمة في سمائك" into a sky the student wants to fill.
 *
 * `progress` ({ mastered, learning, total }) drives the ring for the current
 * selection; when absent (other surfaces) it falls back to the global
 * `stats.wordsKnown`. Streak + due are shown as pills; the due pill links to the
 * review surface, except on the review surface itself.
 */
export default function VocabHeader({
  title,
  subtitle,
  stats,
  progress = null,
  action = null,
  dueHref = '/student/srs',
  isReviewSurface = false,
}) {
  const wordsKnown = stats?.wordsKnown ?? 0
  const streak = stats?.streak ?? 0
  const due = stats?.dueCount ?? 0

  const total = progress?.total ?? 0
  const mastered = progress?.mastered ?? wordsKnown
  const learning = progress?.learning ?? 0
  const hasRing = total > 0
  const fresh = mastered === 0 && learning === 0

  return (
    <header className="mb-6">
      <div className="flex items-center gap-5 sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-[28px] sm:text-[34px] font-bold leading-tight" style={{ color: 'var(--vc-text)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm max-w-[42ch]" style={{ color: 'var(--vc-text-soft)' }}>
              {subtitle}
            </p>
          )}

          {/* Pills — invitational when fresh, achievement once there's progress */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {fresh ? (
              <span className="vc-pill vc-pill-sky">
                <Sparkles size={14} />
                ابدئي بجمع نجومك ✨
              </span>
            ) : (
              wordsKnown > 0 && (
                <span className="vc-pill vc-pill-gold" title="عدد الكلمات التي أتقنتِها">
                  <Star size={14} fill="currentColor" />
                  <span className="tabular-nums">{toArabicNum(wordsKnown)}</span>
                  <span style={{ color: 'rgba(252,211,77,0.72)' }}>كلمة في سمائك</span>
                </span>
              )
            )}

            {streak > 0 && (
              <span className="vc-pill">
                <Flame size={14} style={{ color: 'rgb(251,146,60)' }} />
                <span className="tabular-nums">{toArabicNum(streak)}</span>
                <span style={{ color: 'var(--vc-text-dim)' }}>يوم متتالي</span>
              </span>
            )}

            {due > 0 &&
              (isReviewSurface ? (
                <span className="vc-pill">
                  <Sparkles size={14} style={{ color: 'var(--vc-sky-bright)' }} />
                  <span className="tabular-nums">{toArabicNum(due)}</span>
                  <span style={{ color: 'var(--vc-text-dim)' }}>للمراجعة</span>
                </span>
              ) : (
                <Link to={dueHref} className="vc-pill" style={{ textDecoration: 'none' }}>
                  <Sparkles size={14} style={{ color: 'var(--vc-sky-bright)' }} />
                  <span className="tabular-nums">{toArabicNum(due)}</span>
                  <span style={{ color: 'var(--vc-text-dim)' }}>للمراجعة</span>
                </Link>
              ))}
          </div>
        </div>

        {action || <SkyMedallion mastered={mastered} learning={learning} total={total} hasRing={hasRing} />}
      </div>
    </header>
  )
}

/* The circular "sky" — a starlit disc wrapped by a progress ring (gold =
 * mastered, sky = learning) with a soft gold halo. Grows as the student fills
 * their sky; framed as "X من Y" so even zero reads as a journey, not a failure. */
function SkyMedallion({ mastered, learning, total, hasRing }) {
  const SIZE = 120
  const R = 52
  const C = 2 * Math.PI * R
  const cap = Math.max(total, 1)
  const fm = hasRing ? Math.min(mastered / cap, 1) : 0
  const fl = hasRing ? Math.min(learning / cap, 1) : 0
  const centerNum = hasRing ? mastered : mastered // wordsKnown fallback flows through `mastered`

  return (
    <div className="shrink-0 relative" style={{ width: SIZE, height: SIZE }}>
      <div className="vc-medallion-halo" />
      <div className="vc-medallion absolute" style={{ inset: 9 }} />

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="vc-arc-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--vc-gold)" />
            <stop offset="1" stopColor="var(--vc-gold-soft)" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(150,180,255,0.14)" strokeWidth="7" />
        {/* learning (sky) arc — sits after the mastered arc */}
        {fl > 0 && (
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
            stroke="var(--vc-sky)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${fl * C} ${C}`}
            strokeDashoffset={-(fm * C)}
          />
        )}
        {/* mastered (gold) arc */}
        {fm > 0 && (
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
            stroke="url(#vc-arc-gold)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${fm * C} ${C}`}
            style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.75))' }}
          />
        )}
      </svg>

      {/* center readout — always a bold numeral, framed as a fraction/label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[30px] font-bold tabular-nums leading-none" style={{ color: 'var(--vc-gold-soft)' }}>
          {toArabicNum(centerNum)}
        </span>
        <span className="mt-1 text-xs tabular-nums" style={{ color: 'var(--vc-text-dim)' }}>
          {hasRing ? `من ${toArabicNum(total)}` : 'في سمائك'}
        </span>
      </div>
    </div>
  )
}
