import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GraduationCap, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import LevelCard from './components/LevelCard'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function CurriculumBrowser() {
  const { profile, studentData } = useAuthStore()
  const navigate = useNavigate()
  const currentLevel = studentData?.academic_level ?? 0

  // Fetch all active levels
  const { data: levels, isLoading: loadingLevels, error: levelsError, refetch } = useQuery({
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

  // Fetch unit counts per level
  const { data: unitCounts, isLoading: loadingUnits } = useQuery({
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

  // Fetch student progress per unit (completed count per level)
  const { data: progressData } = useQuery({
    queryKey: ['curriculum-progress-summary', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('unit_id, status')
        .eq('student_id', profile?.id)
      if (error) throw error

      // We need to map unit_id to level_id
      if (!data || data.length === 0) return {}

      const unitIds = [...new Set(data.map(p => p.unit_id))]
      const { data: units } = await supabase
        .from('curriculum_units')
        .select('id, level_id')
        .in('id', unitIds)

      const unitToLevel = {}
      for (const u of (units || [])) {
        unitToLevel[u.id] = u.level_id
      }

      const completedPerLevel = {}
      for (const p of data) {
        if (p.status === 'completed') {
          const levelId = unitToLevel[p.unit_id]
          if (levelId) {
            completedPerLevel[levelId] = (completedPerLevel[levelId] || 0) + 1
          }
        }
      }
      return completedPerLevel
    },
    enabled: !!profile?.id,
  })

  const isLoading = loadingLevels || loadingUnits

  // Error state
  if (levelsError) {
    return (
      <div className="space-y-12">
        <div className="rounded-2xl border border-[var(--border-subtle)] p-14 flex flex-col items-center justify-center text-center" style={{ background: 'var(--surface-base)' }}>
          <p className="text-lg font-semibold text-[var(--text-muted)] mb-4">
            حدث خطأ في تحميل المنهج — حاول مرة ثانية
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--accent-sky)', color: '#fff' }}
          >
            <RefreshCw size={16} />
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-12">
        <div>
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-5 w-72 skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[180px] skeleton rounded-2xl" style={{ background: 'var(--surface-base)' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
            <GraduationCap size={20} className="text-sky-400" />
          </div>
          <h1 className="text-page-title">المنهج الدراسي</h1>
        </div>
        <p className="text-[var(--text-muted)] text-sm mt-1 mr-[52px]">
          اختر المستوى للبدء في رحلتك التعليمية
        </p>
      </motion.div>

      {/* Level Cards Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4"
      >
        {(levels || []).map(level => {
          const isLocked = level.level_number > currentLevel
          const isCurrent = level.level_number === currentLevel
          const totalUnits = unitCounts?.[level.id] || 0
          const completedUnits = progressData?.[level.id] || 0

          return (
            <motion.div key={level.id} variants={item}>
              <LevelCard
                level={level}
                isLocked={isLocked}
                isCurrent={isCurrent}
                completedUnits={completedUnits}
                totalUnits={totalUnits}
                onClick={() => navigate(`/student/curriculum/level/${level.level_number}`)}
              />
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
