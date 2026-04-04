import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

export default function InteractiveCurriculumUnits() {
  const { levelId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const role = profile?.role
  const basePath = role === 'admin' ? '/admin' : '/trainer'

  // Fetch level info
  const { data: level, isLoading: loadingLevel } = useQuery({
    queryKey: ['curriculum-level-by-id', levelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('id', levelId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!levelId,
  })

  // Fetch units — same query as student LevelUnits (NO is_published filter)
  const { data: units, isLoading: loadingUnits } = useQuery({
    queryKey: ['curriculum-units', level?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('*')
        .eq('level_id', level.id)
        .order('unit_number')
      if (error) throw error
      return data || []
    },
    enabled: !!level?.id,
  })

  const isLoading = loadingLevel || loadingUnits
  const levelColor = level?.color || '#38bdf8'

  if (isLoading) {
    return (
      <div className="p-6 space-y-8" dir="rtl">
        <div className="h-8 w-40 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        <div className="h-6 w-64 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-20 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!level) return null

  return (
    <div className="p-6 space-y-8" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back button */}
        <button
          onClick={() => navigate(`${basePath}/interactive-curriculum`)}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4 font-['Tajawal']"
        >
          <ArrowRight size={16} />
          العودة للمستويات
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${levelColor}20` }}
          >
            <BookOpen size={20} style={{ color: levelColor }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">{level.name_ar}</h1>
            <div className="flex items-center gap-2 mt-1">
              {level.cefr && (
                <span
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{ background: `${levelColor}15`, color: levelColor, border: `1px solid ${levelColor}30` }}
                >
                  {level.cefr}
                </span>
              )}
              <span className="text-sm text-[var(--text-muted)] font-['Inter']" dir="ltr">{level.name_en}</span>
            </div>
          </div>
        </div>

        {level.description_ar && (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-3 mr-[52px] font-['Tajawal']">
            {level.description_ar}
          </p>
        )}
      </motion.div>

      {/* Units Grid */}
      {units && units.length > 0 ? (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {units.map(unit => (
            <motion.div key={unit.id} variants={item}>
              <InteractiveUnitCard
                unit={unit}
                levelColor={levelColor}
                onClick={() => navigate(`${basePath}/interactive-curriculum/${levelId}/${unit.id}`)}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[var(--border-subtle)] p-14 flex flex-col items-center justify-center text-center"
          style={{ background: 'var(--surface-base)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mb-5">
            <BookOpen size={28} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-lg font-semibold text-[var(--text-muted)] mb-1.5 font-['Tajawal']">لا توجد وحدات في هذا المستوى</p>
          <p className="text-[var(--text-muted)] text-sm font-['Tajawal']">سيكون المحتوى جاهزاً قريباً إن شاء الله</p>
        </motion.div>
      )}
    </div>
  )
}

// ─── Unit Card (cloned from student UnitCard, adapted for admin/trainer) ───
function InteractiveUnitCard({ unit, levelColor, onClick }) {
  return (
    <motion.div
      onClick={onClick}
      className="rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-px overflow-hidden"
      style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}
      whileHover={{ borderColor: `${levelColor}4D` }}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Unit cover or number badge */}
        {unit.cover_image_url ? (
          <img
            src={unit.cover_image_url}
            alt={unit.theme_ar}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0"
            loading="lazy"
          />
        ) : (
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-lg"
            style={{ background: `linear-gradient(135deg, ${levelColor}, ${levelColor}AA)` }}
          >
            {unit.unit_number}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)] text-base mb-0.5 truncate font-['Tajawal']">
            {unit.theme_ar}
          </h3>
          {unit.theme_en && (
            <p className="text-sm text-[var(--text-muted)] truncate font-['Inter']" dir="ltr">
              {unit.theme_en}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
              الوحدة {unit.unit_number}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
