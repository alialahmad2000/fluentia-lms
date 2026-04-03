import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { tracker } from '../../../services/activityTracker'
import { calculateUnitCompletion, groupProgressByUnit } from '../../../utils/curriculumProgress'
import UnitCard from './components/UnitCard'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

export default function LevelUnits() {
  const { levelNumber } = useParams()
  const navigate = useNavigate()
  const { profile, studentData } = useAuthStore()
  const currentLevel = studentData?.academic_level ?? 0
  const levelNum = parseInt(levelNumber)

  // Security: redirect if level doesn't match student's current level
  useEffect(() => {
    if (!isNaN(levelNum) && levelNum !== currentLevel) {
      navigate(`/student/curriculum`, { replace: true })
    }
  }, [levelNum, currentLevel, navigate])

  // Fetch level info
  const { data: level, isLoading: loadingLevel } = useQuery({
    queryKey: ['curriculum-level', levelNum],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('level_number', levelNum)
        .single()
      if (error) throw error
      return data
    },
    enabled: !isNaN(levelNum),
  })

  // Fetch units for this level
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

  // Fetch student section-level progress for units in this level
  const { data: rawProgress } = useQuery({
    queryKey: ['curriculum-unit-progress', profile?.id, level?.id],
    queryFn: async () => {
      const unitIds = units.map(u => u.id)
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('unit_id, section_type, status, score')
        .eq('student_id', profile?.id)
        .in('unit_id', unitIds)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id && !!units && units.length > 0,
  })

  // Calculate per-unit completion from section progress
  const progressMap = useMemo(() => {
    if (!rawProgress) return {}
    const byUnit = groupProgressByUnit(rawProgress)
    const map = {}
    for (const [unitId, rows] of Object.entries(byUnit)) {
      map[unitId] = calculateUnitCompletion(rows)
    }
    return map
  }, [rawProgress])

  const isLoading = loadingLevel || loadingUnits
  const levelColor = level?.color || '#38bdf8'

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-40 skeleton rounded-lg" />
        <div className="h-6 w-64 skeleton rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-20 skeleton rounded-xl" style={{ background: 'var(--surface-base)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!level) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/student/curriculum')}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
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
            <h1 className="text-page-title">{level.name_ar}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                style={{ background: `${levelColor}15`, color: levelColor, border: `1px solid ${levelColor}30` }}
              >
                {level.cefr}
              </span>
              <span className="text-sm text-[var(--text-muted)]" dir="ltr">{level.name_en}</span>
            </div>
          </div>
        </div>

        {level.description_ar && (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-3 mr-[52px]">
            {level.description_ar}
          </p>
        )}
      </motion.div>

      {/* Units Grid */}
      {units && units.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {units.map(unit => {
            const completion = progressMap?.[unit.id] || { status: 'not_started', sectionsCompleted: 0, totalSections: 5 }
            return (
              <motion.div key={unit.id} variants={item}>
                <UnitCard
                  unit={unit}
                  levelColor={levelColor}
                  status={completion.status}
                  sectionsCompleted={completion.sectionsCompleted}
                  totalSections={completion.totalSections}
                  onClick={() => {
                    tracker.track('unit_selected', { unit_id: unit.id, unit_number: unit.unit_number, level: levelNum })
                    navigate(`/student/curriculum/unit/${unit.id}`)
                  }}
                />
              </motion.div>
            )
          })}
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
          <p className="text-lg font-semibold text-[var(--text-muted)] mb-1.5">
            المحتوى قيد التحضير
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            سيكون جاهزاً قريباً إن شاء الله
          </p>
        </motion.div>
      )}
    </div>
  )
}
