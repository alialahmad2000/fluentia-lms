import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function InteractiveCurriculumLevels() {
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

  const { data: levels, isLoading } = useQuery({
    queryKey: ['curriculum-levels-ic'],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_levels')
        .select('*, curriculum_units(id)')
        .eq('is_active', true)
        .order('sort_order')
      return data || []
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">المنهج التفاعلي</h1>
        <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">اختر المستوى لعرض الوحدات وإجابات الطلاب</p>
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels?.map((level, idx) => {
          const unitCount = level.curriculum_units?.length || 0
          const isTrainerLevel = role !== 'trainer' || trainerLevels.includes(level.level_number)

          return (
            <motion.button
              key={level.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => isTrainerLevel && navigate(`${basePath}/interactive-curriculum/${level.id}`)}
              disabled={!isTrainerLevel}
              className={`text-start rounded-2xl p-5 transition-all duration-200 ${
                isTrainerLevel
                  ? 'hover:scale-[1.02] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              style={{
                background: isTrainerLevel
                  ? `linear-gradient(135deg, ${level.color || 'rgba(56,189,248,0.1)'}20, rgba(255,255,255,0.03))`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isTrainerLevel ? (level.color || 'rgba(56,189,248,0.3)') + '40' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold overflow-hidden"
                      style={{
                        background: `${level.color || '#38bdf8'}20`,
                        color: level.color || '#38bdf8',
                      }}
                    >
                      {level.icon ? (
                        <img src={level.icon} alt={level.name_en} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        level.level_number
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">{level.name_ar}</h3>
                      <p className="text-xs text-[var(--text-muted)] font-['Inter']">{level.name_en}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {level.cefr && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 font-['Inter']">
                        {level.cefr}
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
                      {unitCount} وحدة
                    </span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-[var(--text-muted)] mt-1" />
              </div>
            </motion.button>
          )
        })}
      </div>

      {levels?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <BookOpen size={40} className="text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد مستويات متاحة</p>
        </div>
      )}
    </div>
  )
}
