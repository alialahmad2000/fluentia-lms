import { motion } from 'framer-motion'

const STATUS_CONFIG = {
  not_started: { label: 'لم يبدأ', dotColor: 'bg-gray-400' },
  in_progress: { label: 'قيد التعلم', dotColor: 'bg-amber-400' },
  completed:   { label: 'مكتمل', dotColor: 'bg-emerald-400' },
}

export default function UnitCard({ unit, levelColor, status = 'not_started', progressPercent = 0, completedCount = 0, activeCount = 0, onClick }) {
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started

  return (
    <motion.div
      onClick={onClick}
      className="rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-px overflow-hidden"
      style={{
        background: 'var(--surface-base)',
        borderColor: 'var(--border-subtle)',
      }}
      whileHover={{ borderColor: `${levelColor}4D` }}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Unit number badge or cover image */}
        {unit.cover_image_url ? (
          <img
            src={unit.cover_image_url}
            alt={unit.theme_ar}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-lg"
            style={{
              background: `linear-gradient(135deg, ${levelColor}, ${levelColor}AA)`,
            }}
          >
            {unit.unit_number}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${levelColor}1A`, color: levelColor }}>
              الوحدة {unit.unit_number}
            </span>
            <h3 className="font-semibold text-[var(--text-primary)] text-base truncate">
              {unit.theme_ar}
            </h3>
          </div>
          {unit.theme_en && (
            <p className="text-sm text-[var(--text-muted)] truncate" dir="ltr">
              {unit.theme_en}
            </p>
          )}

          {/* Status indicator + activity count */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
            <span className="text-xs text-[var(--text-muted)]">{statusCfg.label}</span>
            {status !== 'not_started' && activeCount > 0 && (
              <span className="text-xs text-[var(--text-muted)] mr-1">
                — {completedCount}/{activeCount} أنشطة
              </span>
            )}
            {status !== 'not_started' && (
              <span className="text-xs font-bold font-['Inter'] tabular-nums mr-auto" style={{ color: status === 'completed' ? '#4ade80' : levelColor }}>
                {progressPercent}%
              </span>
            )}
          </div>

          {/* Mini progress bar */}
          {status !== 'not_started' && (
            <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: 'var(--surface-raised)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%`, background: status === 'completed' ? '#4ade80' : levelColor }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
