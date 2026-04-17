import { motion } from 'framer-motion'
import { ChevronRight, ChevronLeft } from 'lucide-react'

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ScreenChrome({
  currentScreen,
  totalScreens,
  showSkip,
  myTeam,
  onNext,
  onBack,
  onSkip,
  isFinalScreen,
  children,
}) {
  const color = myTeam?.color ?? '#38bdf8'

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        background: 'rgba(6,14,28,0.97)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      {/* Top gradient accent */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{ background: `linear-gradient(90deg, ${color}, transparent 70%, ${color})` }}
      />

      {/* Skip link */}
      <div className="flex justify-start px-5 pt-3 flex-shrink-0 min-h-[32px]">
        {showSkip && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            تخطي الشرح →
          </motion.button>
        )}
      </div>

      {/* Screen content (scrollable) */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      {/* Bottom navigation */}
      <div
        className="flex-shrink-0 px-5 pb-6 pt-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {Array.from({ length: totalScreens }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width:      i + 1 === currentScreen ? 20 : 6,
                height:     6,
                background: i + 1 === currentScreen ? color : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Nav buttons */}
        {!isFinalScreen && (
          <div className="flex items-center gap-3">
            {currentScreen > 1 && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-slate-400"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ChevronLeft size={16} />
                رجوع
              </button>
            )}
            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-slate-900"
              style={{ background: color }}
            >
              التالي
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
