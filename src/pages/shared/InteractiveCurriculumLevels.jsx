import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

const FALLBACK_COLORS = {
  0: '#4ade80', 1: '#38bdf8', 2: '#a78bfa', 3: '#f59e0b', 4: '#ef4444', 5: '#fbbf24',
}
const FALLBACK_EMOJI = {
  0: '🌱', 1: '🧱', 2: '🚀', 3: '📖', 4: '🏆', 5: '💎',
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function InteractiveCurriculumLevels() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, trainerData } = useAuthStore()
  const role = profile?.role
  const basePath = role === 'admin' ? '/admin' : '/trainer'

  // Get trainer's group levels for filtering
  const { data: trainerGroups } = useQuery({
    queryKey: ['trainer-groups-for-ic', trainerData?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('id, name, level')
        .eq('trainer_id', trainerData?.id)
      return data || []
    },
    enabled: role === 'trainer' && !!trainerData?.id,
  })

  const trainerLevels = trainerGroups?.map(g => g.level) || []

  // Fetch all active levels — same query as student CurriculumBrowser
  const { data: levels, isLoading, error, refetch } = useQuery({
    queryKey: ['curriculum-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number')
      if (error) throw error
      return data || []
    },
  })

  // Fetch unit counts per level — same as student CurriculumBrowser
  const { data: unitCounts } = useQuery({
    queryKey: ['curriculum-unit-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('level_id')
      if (error) throw error
      const counts = {}
      for (const u of (data || [])) {
        counts[u.level_id] = (counts[u.level_id] || 0) + 1
      }
      return counts
    },
  })

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <div className="rounded-2xl border border-[var(--border-subtle)] p-14 flex flex-col items-center justify-center text-center" style={{ background: 'var(--surface-base)' }}>
          <p className="text-lg font-semibold text-[var(--text-muted)] mb-4 font-['Tajawal']">{t('trainer.curriculum.error_message')}</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--accent-sky)', color: '#fff' }}>
            <RefreshCw size={16} /> {t('trainer.curriculum.retry_button')}
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-8" dir="rtl">
        <div>
          <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse mb-2" />
          <div className="h-5 w-72 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[180px] rounded-2xl bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
            <BookOpen size={20} className="text-sky-400" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">{t('trainer.curriculum.interactive_title')}</h1>
        </div>
        <p className="text-[var(--text-muted)] text-sm mt-1 mr-[52px] font-['Tajawal']">
          {t('trainer.curriculum.interactive_subtitle')}
        </p>
      </motion.div>

      {/* Level Cards Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {(levels || []).map(level => {
          const isTrainerLevel = role !== 'trainer' || trainerLevels.includes(level.level_number)
          const totalUnits = unitCounts?.[level.id] || 0
          const color = level.color || FALLBACK_COLORS[level.level_number] || '#38bdf8'

          return (
            <motion.div key={level.id} variants={item}>
              <InteractiveLevelCard
                level={level}
                color={color}
                totalUnits={totalUnits}
                disabled={!isTrainerLevel}
                onClick={() => isTrainerLevel && navigate(`${basePath}/interactive-curriculum/${level.id}`)}
              />
            </motion.div>
          )
        })}
      </motion.div>

      {levels?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <BookOpen size={40} className="text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)] font-['Tajawal']">{t('trainer.curriculum.no_levels')}</p>
        </div>
      )}
    </div>
  )
}

// ─── Level Card (cloned from student LevelCard, adapted for admin/trainer) ───
function InteractiveLevelCard({ level, color, totalUnits, disabled, onClick }) {
  const { t } = useTranslation()
  const [iconLoaded, setIconLoaded] = useState(false)
  const [iconError, setIconError] = useState(false)

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 min-h-[180px] flex flex-col ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:-translate-y-0.5'
      }`}
      style={{
        background: 'var(--surface-base)',
        borderColor: 'var(--border-subtle)',
      }}
      whileHover={!disabled ? { borderColor: `${color}4D` } : {}}
    >
      {/* Color strip */}
      <div className="h-1" style={{ background: color }} />

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* Level icon */}
        <div className="mb-3 self-start">
          {level.icon && !iconError ? (
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: `${color}15` }}
            >
              <img
                src={level.icon}
                alt={level.name_en}
                loading="lazy"
                className="w-full h-full object-cover transition-opacity duration-300"
                style={{ opacity: iconLoaded ? 1 : 0 }}
                onLoad={() => setIconLoaded(true)}
                onError={() => setIconError(true)}
              />
            </div>
          ) : (
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${color}15` }}
            >
              {FALLBACK_EMOJI[level.level_number] || '📚'}
            </div>
          )}
        </div>

        {/* Level name */}
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1 font-['Tajawal']">
          {level.name_ar}
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-2 font-['Inter']" dir="ltr">
          {level.name_en}
        </p>

        {/* CEFR badge */}
        {level.cefr && (
          <span
            className="inline-flex items-center self-start text-xs font-medium px-2.5 py-1 rounded-full mb-3"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
          >
            {level.cefr}
          </span>
        )}

        {/* Description */}
        {level.description_ar && (
          <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-3 font-['Tajawal']">
            {level.description_ar}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Unit count + arrow */}
        <div className="mt-auto flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="font-['Tajawal']">{totalUnits} {t('trainer.curriculum.unit_label')}</span>
          <ChevronLeft size={14} className="text-[var(--text-muted)]" />
        </div>
      </div>

      {/* Disabled overlay for trainer */}
      {disabled && (
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'rgba(0,0,0,0.15)' }} />
      )}
    </motion.div>
  )
}
