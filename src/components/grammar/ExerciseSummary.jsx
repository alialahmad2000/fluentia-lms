import { RotateCcw, ArrowLeft } from 'lucide-react'

export default function ExerciseSummary({ correctCount, total, score, bestScore, attemptNumber, onRetry }) {
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (pct / 100) * circumference
  const isNewBest = score > (bestScore || 0) || bestScore == null

  return (
    <div className="grammar-glass p-6 sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular progress */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="grammar-progress-ring w-full h-full" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="48" cy="48" r="40" fill="none"
              stroke={pct >= 80 ? '#4ade80' : pct >= 50 ? '#38bdf8' : '#f43f5e'}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white font-['Inter']">{pct}%</span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center sm:text-right space-y-2 flex-1">
          <p className="text-xl font-bold text-white font-['Tajawal']">
            {correctCount}/{total} صحيحة
          </p>
          {bestScore != null && !isNewBest && (
            <p className="text-sm text-white/40 font-['Tajawal']">
              أفضل: {bestScore}% · محاولة {attemptNumber}
            </p>
          )}
          {isNewBest && attemptNumber > 1 && (
            <p className="text-sm text-amber-400 font-['Tajawal'] font-bold">
              🎉 رقم قياسي جديد!
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        <button
          onClick={onRetry}
          className="grammar-option px-5 font-['Tajawal'] font-bold text-sm text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
        >
          <RotateCcw size={14} />
          <span>محاولة جديدة</span>
        </button>
      </div>
    </div>
  )
}
