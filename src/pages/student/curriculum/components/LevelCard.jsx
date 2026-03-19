import { motion } from 'framer-motion'
import { Lock, ChevronLeft } from 'lucide-react'

const FALLBACK_COLORS = {
  0: '#4ade80',
  1: '#38bdf8',
  2: '#a78bfa',
  3: '#f59e0b',
  4: '#ef4444',
  5: '#fbbf24',
}

export default function LevelCard({ level, isLocked, isCurrent, completedUnits, totalUnits, onClick }) {
  const color = level.color || FALLBACK_COLORS[level.level_number] || '#38bdf8'
  const progress = totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0

  return (
    <motion.div
      onClick={!isLocked ? onClick : undefined}
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 min-h-[180px] flex flex-col ${
        isLocked
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:-translate-y-0.5'
      } ${
        isCurrent
          ? 'ring-2 ring-offset-0'
          : ''
      }`}
      style={{
        background: 'var(--surface-base)',
        borderColor: isCurrent ? color : 'var(--border-subtle)',
        ...(isCurrent && {
          ringColor: color,
          boxShadow: `0 0 20px ${color}30, 0 0 40px ${color}15`,
        }),
        ...(!isLocked && !isCurrent && {
          '--hover-border': `${color}4D`,
        }),
      }}
      whileHover={!isLocked ? {
        borderColor: `${color}4D`,
      } : {}}
    >
      {/* Color strip */}
      <div className="h-1" style={{ background: color }} />

      <div className="p-6 flex flex-col flex-1">
        {/* Current level badge */}
        {isCurrent && (
          <span
            className="inline-flex items-center self-start text-xs font-semibold px-2.5 py-1 rounded-lg mb-3"
            style={{ background: `${color}20`, color }}
          >
            مستواك الحالي
          </span>
        )}

        {/* Level name Arabic */}
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
          {level.name_ar}
        </h3>

        {/* Level name English */}
        <p className="text-sm text-[var(--text-muted)] mb-2" dir="ltr">
          {level.name_en}
        </p>

        {/* CEFR badge */}
        <span
          className="inline-flex items-center self-start text-xs font-medium px-2.5 py-1 rounded-full mb-3"
          style={{
            background: `${color}15`,
            color,
            border: `1px solid ${color}30`,
          }}
        >
          {level.cefr}
        </span>

        {/* Description */}
        {level.description_ar && (
          <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-3">
            {level.description_ar}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Progress */}
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
            <span>{completedUnits} / {totalUnits} وحدة مكتملة</span>
            {!isLocked && <ChevronLeft size={14} className="text-[var(--text-muted)]" />}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: color }}
            />
          </div>
        </div>
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
            <Lock size={18} className="text-[var(--text-muted)]" />
          </div>
        </div>
      )}
    </motion.div>
  )
}
