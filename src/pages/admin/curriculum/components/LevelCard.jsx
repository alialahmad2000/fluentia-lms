import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LevelCard({ level, index }) {
  const navigate = useNavigate()
  const totalUnits = level.curriculum_units?.length || 0
  const publishedUnits = level.curriculum_units?.filter(u => u.is_published)?.length || 0
  const progress = totalUnits > 0 ? (publishedUnits / totalUnits) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      onClick={() => navigate(`/admin/curriculum/level/${level.id}`)}
      className="group cursor-pointer rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.2s ease-out',
      }}
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="flex gap-0">
        {/* Color accent stripe */}
        <div
          className="w-1.5 shrink-0"
          style={{ background: level.color || '#38bdf8' }}
        />

        <div className="flex-1 p-6">
          {/* Top row: badge + CEFR */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Level number badge */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ background: level.color || '#38bdf8' }}
              >
                {level.level_number}
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                  {level.name_ar}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {level.name_en}
                </p>
              </div>
            </div>

            {/* CEFR badge */}
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: `${level.color}22`,
                color: level.color || '#38bdf8',
              }}
            >
              {level.cefr}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
              {publishedUnits}/{totalUnits} وحدة منشورة
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: level.color || '#38bdf8',
              }}
            />
          </div>

          {/* Navigate hint */}
          <div className="flex items-center justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
