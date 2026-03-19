import { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Link2, Keyboard, Puzzle, FileText, Layers, ArrowRight, PenLine } from 'lucide-react'

const GAME_ICONS = {
  quiz: PenLine,
  anki: RotateCcw,
  match: Link2,
  speed: Keyboard,
  scramble: Puzzle,
  fill: FileText,
}

const GAME_COLORS = {
  quiz: { bg: 'bg-sky-500/15', hover: 'group-hover:bg-sky-500/25', text: 'text-sky-400', border: 'hover:border-sky-500/40' },
  anki: { bg: 'bg-amber-500/15', hover: 'group-hover:bg-amber-500/25', text: 'text-amber-400', border: 'hover:border-amber-500/40' },
  match: { bg: 'bg-emerald-500/15', hover: 'group-hover:bg-emerald-500/25', text: 'text-emerald-400', border: 'hover:border-emerald-500/40' },
  speed: { bg: 'bg-purple-500/15', hover: 'group-hover:bg-purple-500/25', text: 'text-purple-400', border: 'hover:border-purple-500/40' },
  scramble: { bg: 'bg-cyan-500/15', hover: 'group-hover:bg-cyan-500/25', text: 'text-cyan-400', border: 'hover:border-cyan-500/40' },
  fill: { bg: 'bg-rose-500/15', hover: 'group-hover:bg-rose-500/25', text: 'text-rose-400', border: 'hover:border-rose-500/40' },
}

export default function GameHub({
  games,
  onSelectGame,
  totalWords,
  onBack,
}) {
  const [wordCount, setWordCount] = useState(10)

  return (
    <div className="flex flex-col items-center gap-6 py-2 w-full max-w-2xl mx-auto" dir="rtl">
      <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">اختر نوع التدريب</h2>

      {/* Word count selector */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-[var(--text-muted)] font-['Tajawal']">عدد الكلمات</span>
        <div className="flex gap-2">
          {[
            { value: 10, label: '10' },
            { value: 20, label: '20' },
            { value: Infinity, label: 'الكل' },
          ].map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setWordCount(value)}
              className={`px-5 h-9 rounded-xl text-sm font-bold border transition-colors font-['Tajawal'] ${
                wordCount === value
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
          {Math.min(wordCount, totalWords)} من {totalWords} متاحة
        </p>
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
        {games.map((game, i) => {
          const Icon = GAME_ICONS[game.id] || Layers
          const colors = GAME_COLORS[game.id] || GAME_COLORS.anki

          return (
            <motion.button
              key={game.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              onClick={() => onSelectGame(game.id, wordCount)}
              className={`flex flex-col items-center gap-2.5 p-5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] ${colors.border} transition-all duration-200 group hover:-translate-y-0.5`}
            >
              <div className={`w-12 h-12 rounded-full ${colors.bg} ${colors.hover} flex items-center justify-center transition-colors`}>
                <Icon size={22} className={colors.text} />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">{game.name}</span>
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-center leading-tight">{game.desc}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Back */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-['Tajawal'] mt-2"
        >
          العودة
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
