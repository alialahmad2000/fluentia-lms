import { RotateCcw, Trophy, Star, TrendingUp, Zap } from 'lucide-react'

const SCORE_TIERS = [
  { min: 90, emoji: '🏆', label: 'أداء ممتاز!', color: 'var(--accent-gold)', bg: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,179,8,0.06) 100%)' },
  { min: 70, emoji: '🌟', label: 'عمل رائع!', color: 'var(--success)', bg: 'linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(34,197,94,0.06) 100%)' },
  { min: 50, emoji: '💪', label: 'جيد — واصلي!', color: 'var(--accent-sky)', bg: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(14,165,233,0.06) 100%)' },
  { min: 0, emoji: '🌱', label: 'حاولي مرة أخرى', color: 'var(--text-secondary)', bg: 'linear-gradient(135deg, rgba(148,163,184,0.1) 0%, rgba(100,116,139,0.05) 100%)' },
]

export default function ExerciseSummary({ correctCount, total, score, bestScore, attemptNumber, onRetry }) {
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (pct / 100) * circumference
  const isNewBest = score > (bestScore || 0) || bestScore == null

  const tier = SCORE_TIERS.find(t => pct >= t.min)
  const ringColor = tier.color

  return (
    <div
      className="grammar-glass p-6 sm:p-8 space-y-5 relative overflow-hidden"
      style={{ background: tier.bg }}
    >
      {/* Decorative glow */}
      <div
        className="absolute -top-20 -left-20 w-60 h-60 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${tier.color}15 0%, transparent 70%)` }}
        aria-hidden
      />

      <div className="flex flex-col sm:flex-row items-center gap-6 relative z-[1]">
        {/* Circular progress */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="grammar-progress-ring w-full h-full" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border-subtle)" strokeWidth="5" />
            <circle
              cx="48" cy="48" r="40" fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black font-['Inter']" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center sm:text-right space-y-2 flex-1">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="text-2xl">{tier.emoji}</span>
            <p className="text-xl font-bold font-['Tajawal']" style={{ color: tier.color }}>
              {tier.label}
            </p>
          </div>
          <p className="text-base font-['Tajawal'] font-medium" style={{ color: 'var(--text-primary)' }}>
            {correctCount} من {total} صحيحة
          </p>

          {isNewBest && attemptNumber > 1 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Trophy size={14} style={{ color: 'var(--accent-gold)' }} />
              <span className="text-sm font-['Tajawal'] font-bold" style={{ color: 'var(--accent-gold)' }}>
                رقم قياسي جديد!
              </span>
            </div>
          )}
          {bestScore != null && !isNewBest && (
            <p className="text-sm font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
              أفضل: {bestScore}% · محاولة {attemptNumber}
            </p>
          )}

          {/* Encouragement based on score */}
          {pct < 70 && (
            <div className="flex items-center gap-1.5 mt-1">
              <TrendingUp size={14} style={{ color: 'var(--accent-sky)' }} />
              <span className="text-xs font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
                كل محاولة تجعلك أقوى — جربي مرة أخرى!
              </span>
            </div>
          )}
          {pct >= 90 && (
            <div className="flex items-center gap-1.5 mt-1">
              <Zap size={14} style={{ color: 'var(--accent-gold)' }} />
              <span className="text-xs font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
                أنتِ متفوقة — انتقلي للدرس التالي!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start relative z-[1]">
        <button
          onClick={onRetry}
          className="grammar-option px-6 py-3 font-['Tajawal'] font-bold text-sm active:scale-95 transition-transform"
          style={{ color: 'var(--accent-sky)', borderColor: 'var(--info-border)' }}
        >
          <RotateCcw size={14} />
          <span>محاولة جديدة</span>
        </button>
      </div>
    </div>
  )
}
