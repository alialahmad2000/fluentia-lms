import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function InteractiveCurriculumUnits() {
  const { levelId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const role = profile?.role
  const basePath = role === 'admin' ? '/admin' : '/trainer'

  const { data: level, isLoading: levelLoading } = useQuery({
    queryKey: ['ic-level', levelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('id', levelId)
        .single()
      return data
    },
    enabled: !!levelId,
  })

  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['ic-units', levelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_units')
        .select('*')
        .eq('level_id', levelId)
        .eq('is_published', true)
        .order('sort_order')
      return data || []
    },
    enabled: !!levelId,
  })

  const isLoading = levelLoading || unitsLoading

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-['Tajawal']">
        <button
          onClick={() => navigate(`${basePath}/interactive-curriculum`)}
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          المنهج التفاعلي
        </button>
        <ChevronLeft size={14} />
        <span className="text-[var(--text-primary)]">{level?.name_ar || 'المستوى'}</span>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {level?.color && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ background: `${level.color}20`, color: level.color }}
            >
              {level.icon || level.level_number}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">{level?.name_ar}</h1>
            <p className="text-sm text-[var(--text-muted)] font-['Inter']">{level?.name_en}</p>
          </div>
        </div>
      </div>

      {/* Units list */}
      <div className="space-y-3">
        {units?.map((unit, idx) => (
          <motion.button
            key={unit.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            onClick={() => navigate(`${basePath}/interactive-curriculum/${levelId}/${unit.id}`)}
            className="w-full text-start rounded-xl p-4 transition-all duration-200 hover:scale-[1.01] flex items-center gap-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Unit number */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ background: `${level?.color || '#38bdf8'}15`, color: level?.color || '#38bdf8' }}
            >
              {unit.unit_number}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] truncate">{unit.theme_ar}</h3>
              <p className="text-xs text-[var(--text-muted)] font-['Inter'] truncate">{unit.theme_en}</p>
            </div>

            {/* Cover image thumbnail */}
            {unit.cover_image_url && (
              <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-[var(--border-subtle)]">
                <img src={unit.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}

            <ArrowRight size={16} className="text-[var(--text-muted)] flex-shrink-0 rotate-180" />
          </motion.button>
        ))}
      </div>

      {units?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <BookOpen size={40} className="text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد وحدات منشورة في هذا المستوى</p>
        </div>
      )}
    </div>
  )
}
