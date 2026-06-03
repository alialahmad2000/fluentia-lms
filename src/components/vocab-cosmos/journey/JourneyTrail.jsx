import { useEffect, useRef } from 'react'
import { Star } from 'lucide-react'
import { toArabicNum } from '@/lib/vocabFormat'

/**
 * The macro journey: a horizontal trail of region waypoints (themed units).
 * Completed regions glow gold, the current one pulses, those ahead are faint.
 * RTL — the path flows right→left like the rest of the app.
 */
export default function JourneyTrail({ regions = [], currentUnitId }) {
  const scroller = useRef(null)
  const currentRef = useRef(null)

  useEffect(() => {
    // bring the current waypoint into view on mount / change
    if (currentRef.current && scroller.current) {
      const node = currentRef.current
      const box = scroller.current
      box.scrollLeft = node.offsetLeft - box.clientWidth / 2 + node.clientWidth / 2
    }
  }, [currentUnitId, regions.length])

  const doneCount = regions.filter((r) => r.status === 'complete').length

  if (!regions.length) return null

  return (
    <div className="vc-card" style={{ padding: '16px 12px' }}>
      <div className="flex items-center justify-between px-1 mb-3">
        <span
          className="text-[13px] font-bold"
          style={{ color: 'var(--vc-text-dim, #c7d2fe)', fontFamily: "'Tajawal', sans-serif" }}
        >
          الرحلات
        </span>
        <span className="vc-pill text-[12px] tabular-nums">
          {toArabicNum(doneCount)} / {toArabicNum(regions.length)} مكتملة
        </span>
      </div>

      <div
        ref={scroller}
        className="flex items-stretch gap-0 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        dir="rtl"
      >
        {regions.map((r, i) => {
          const isCurrent = r.unit_id === currentUnitId
          const done = r.status === 'complete'
          const inProgress = r.status === 'in_progress'
          const pct = r.total_words > 0 ? Math.round((r.mastered_words / r.total_words) * 100) : 0
          return (
            <div
              key={r.unit_id}
              ref={isCurrent ? currentRef : null}
              className="flex flex-col items-center shrink-0"
              style={{ width: 84 }}
            >
              {/* node + connector row */}
              <div className="relative flex items-center justify-center w-full" style={{ height: 40 }}>
                {/* connector to the previous (visually to the right in RTL) */}
                {i > 0 && (
                  <span
                    className="absolute top-1/2 right-1/2 h-[2px]"
                    style={{
                      width: '100%',
                      transform: 'translateY(-50%)',
                      background: done || isCurrent || inProgress
                        ? 'linear-gradient(to left, rgba(233,185,73,0.5), rgba(129,140,248,0.35))'
                        : 'rgba(129,140,248,0.14)',
                    }}
                  />
                )}
                <span
                  className="relative flex items-center justify-center rounded-full"
                  style={{
                    width: isCurrent ? 30 : 24,
                    height: isCurrent ? 30 : 24,
                    background: done
                      ? 'radial-gradient(circle at 35% 30%, #fde68a, #e9b949 70%)'
                      : isCurrent
                        ? 'radial-gradient(circle at 35% 30%, #a5b4fc, #6366f1 70%)'
                        : inProgress
                          ? 'rgba(129,140,248,0.28)'
                          : 'rgba(129,140,248,0.12)',
                    border: isCurrent ? '2px solid #c7d2fe' : done ? '1px solid #fde68a' : '1px solid rgba(129,140,248,0.25)',
                    boxShadow: done
                      ? '0 0 12px rgba(233,185,73,0.55)'
                      : isCurrent
                        ? '0 0 14px rgba(129,140,248,0.7)'
                        : 'none',
                  }}
                >
                  {done && <Star size={12} strokeWidth={2.5} style={{ color: '#3b2f0b', fill: '#3b2f0b' }} />}
                  {isCurrent && (
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{ animation: 'vc-pulse 2.4s ease-in-out infinite', border: '2px solid rgba(199,210,254,0.6)' }}
                    />
                  )}
                </span>
              </div>

              {/* theme label */}
              <span
                className="mt-1.5 text-center leading-tight px-0.5"
                style={{
                  fontSize: 11.5,
                  fontFamily: "'Tajawal', sans-serif",
                  fontWeight: isCurrent ? 700 : 500,
                  color: done ? '#fbe6a8' : isCurrent ? '#e0e7ff' : 'rgba(199,210,254,0.55)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: 30,
                }}
              >
                {r.theme_ar}
              </span>
              {(isCurrent || inProgress) && r.total_words > 0 && (
                <span className="text-[10.5px] tabular-nums mt-0.5" style={{ color: 'rgba(199,210,254,0.5)' }}>
                  {toArabicNum(pct)}٪
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
