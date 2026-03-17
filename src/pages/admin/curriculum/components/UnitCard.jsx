import { motion } from 'framer-motion'
import { BookOpen, PenTool, Type } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function UnitCard({ unit, levelColor, index }) {
  const navigate = useNavigate()
  const readingCount = unit.curriculum_readings?.length || 0
  const writingCount = unit.curriculum_writing?.length || 0
  const listeningCount = unit.curriculum_listening?.length || 0
  const speakingCount = unit.curriculum_speaking?.length || 0
  const grammarCount = unit.curriculum_grammar?.length || 0
  const totalContent = readingCount + writingCount + listeningCount + speakingCount + grammarCount

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/admin/curriculum/unit/${unit.id}`)}
      className="group cursor-pointer rounded-xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.2s ease-out',
      }}
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.12)' }}
    >
      {/* Unit number + status */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-2xl font-bold"
          style={{ color: levelColor || '#38bdf8', fontFamily: 'Inter' }}
        >
          {unit.unit_number}
        </span>
        <span
          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
          style={{
            background: unit.is_published ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
            color: unit.is_published ? '#4ade80' : 'var(--text-muted)',
            fontFamily: 'Tajawal',
          }}
        >
          {unit.is_published ? 'منشور' : 'مسودة'}
        </span>
      </div>

      {/* Theme */}
      <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
        {unit.theme_ar}
      </h4>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {unit.theme_en}
      </p>

      {/* Content counts */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1" title="Readings">
          <BookOpen size={13} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{readingCount}</span>
        </div>
        <div className="flex items-center gap-1" title="Exercises">
          <PenTool size={13} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{grammarCount + writingCount}</span>
        </div>
        <div className="flex items-center gap-1" title="Total content">
          <Type size={13} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{totalContent}</span>
        </div>
      </div>
    </motion.div>
  )
}
