import { useEffect, useMemo, useState } from 'react'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * ProgressOrb — animated SVG ring for unit vocab mastery.
 * Mobile (<768px): 140px ring, stroke 10px.
 * Desktop:        200px ring, stroke 14px.
 *
 * Caller can override size if needed.
 */
export default function ProgressOrb({
  percent = 0,
  masteredCount = 0,
  totalCount = 0,
  size, // optional override
}) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    if (mq.addEventListener) mq.addEventListener('change', sync)
    else mq.addListener(sync)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync)
      else mq.removeListener(sync)
    }
  }, [])

  const dim = size ?? (isMobile ? 140 : 200)
  const stroke = isMobile ? 10 : 14
  const radius = (dim - stroke) / 2
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius])
  const target = Math.max(0, Math.min(100, Math.round(percent)))

  // Animate dash offset on mount + on percent change
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    let raf = requestAnimationFrame(() => setAnimated(target))
    return () => cancelAnimationFrame(raf)
  }, [target])
  const offset = circumference - (animated / 100) * circumference

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: dim, height: dim }}
      aria-label={`نسبة الإتقان: ${target}%`}
    >
      <svg width={dim} height={dim} className="-rotate-90">
        <defs>
          <linearGradient id={`progress-orb-gradient-${dim}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        {/* Background ring — subtle */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress ring */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          stroke={`url(#progress-orb-gradient-${dim})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-black leading-none"
          style={{
            color: 'var(--text-primary, #faf5e6)',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: isMobile ? 36 : 52,
          }}
        >
          {toArabicNum(target)}
          <span style={{ fontSize: isMobile ? 18 : 24, opacity: 0.7, marginInlineStart: 2 }}>%</span>
        </div>
        {totalCount > 0 && (
          <div
            className="mt-1.5 text-center font-['Tajawal']"
            style={{
              color: 'var(--text-tertiary, rgba(255,255,255,0.55))',
              fontSize: isMobile ? 10 : 12,
              lineHeight: 1.3,
            }}
          >
            أتقنت {toArabicNum(masteredCount)} من {toArabicNum(totalCount)} كلمة
          </div>
        )}
      </div>
    </div>
  )
}
