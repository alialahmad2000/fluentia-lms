import { RotateCcw } from 'lucide-react'

export default function ExerciseSummary({ correctCount, total, score, bestScore, attemptNumber, onRetry }) {
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (pct / 100) * circumference
  const isNewBest = score > (bestScore || 0) || bestScore == null

  // Ring color based on score
  const ringColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--accent-sky)' : 'var(--danger)'

  return (
    <div className="grammar-glass p-6 sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular progress */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="grammar-progress-ring w-full h-full" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
            <circle
              cx="48" cy="48" r="40" fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black font-['Inter']" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center sm:text-right space-y-2 flex-1">
          <p className="text-xl font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
            {correctCount}/{total} صحيحة
          </p>
          {bestScore != null && !isNewBest && (
            <p className="text-sm font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
              أفضل: {bestScore}% · محاولة {attemptNumber}
            </p>
          )}
          {isNewBest && attemptNumber > 1 && (
            <p className="text-sm font-['Tajawal'] font-bold" style={{ color: 'var(--accent-gold)' }}>
              🎉 رقم قياسي جديد!
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        <button
          onClick={onRetry}
          className="grammar-option px-5 font-['Tajawal'] font-bold text-sm"
          style={{ color: 'var(--accent-sky)', borderColor: 'var(--info-border)' }}
        >
          <RotateCcw size={14} />
          <span>محاولة جديدة</span>
        </button>
      </div>
    </div>
  )
}
