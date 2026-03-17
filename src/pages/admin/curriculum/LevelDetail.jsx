import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, PenTool, Type, Sparkles } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import UnitCard from './components/UnitCard'

function DetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-6 w-32 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-32 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-36 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    </div>
  )
}

export default function LevelDetail() {
  const { levelId } = useParams()
  const navigate = useNavigate()

  const { data: level, isLoading: loadingLevel } = useQuery({
    queryKey: ['curriculum-level', levelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('id', levelId)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ['curriculum-units', levelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select(`
          *,
          curriculum_readings(id),
          curriculum_writing(id),
          curriculum_listening(id),
          curriculum_speaking(id),
          curriculum_grammar(id)
        `)
        .eq('level_id', levelId)
        .order('unit_number')
      if (error) throw error
      return data || []
    },
  })

  if (loadingLevel || loadingUnits) return <DetailSkeleton />
  if (!level) return (
    <div className="text-center py-16">
      <p className="text-lg" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>المستوى غير موجود</p>
    </div>
  )

  const publishedCount = units.filter(u => u.is_published).length
  const totalVocab = 0 // Will be populated when content is seeded
  const totalExercises = units.reduce((sum, u) => {
    return sum + (u.curriculum_grammar?.length || 0) + (u.curriculum_writing?.length || 0)
  }, 0)

  return (
    <div className="space-y-8">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/admin/curriculum')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'Tajawal',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.15s ease-out',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      >
        <ArrowRight size={16} strokeWidth={1.5} />
        <span className="text-sm">العودة للمنهج</span>
      </motion.button>

      {/* Level header card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl p-7 overflow-hidden relative"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Color accent bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: level.color || '#38bdf8' }} />

        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ background: level.color || '#38bdf8' }}
              >
                {level.level_number}
              </div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                {level.name_ar}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: `${level.color}22`, color: level.color || '#38bdf8' }}
              >
                {level.cefr}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
              {level.description_ar}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <BookOpen size={16} strokeWidth={1.5} style={{ color: level.color || '#38bdf8' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
              {units.length} وحدة
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PenTool size={16} strokeWidth={1.5} style={{ color: level.color || '#38bdf8' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
              {publishedCount} منشورة
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Type size={16} strokeWidth={1.5} style={{ color: level.color || '#38bdf8' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
              {totalExercises} تمرين
            </span>
          </div>
        </div>
      </motion.div>

      {/* AI Generate button (disabled) */}
      <div className="flex justify-end">
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium opacity-40 cursor-not-allowed"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'var(--text-muted)',
            fontFamily: 'Tajawal',
          }}
          title="قريباً في المرحلة 2"
        >
          <Sparkles size={16} strokeWidth={1.5} />
          توليد محتوى بالذكاء الاصطناعي
        </button>
      </div>

      {/* Units grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {units.map((unit, i) => (
          <UnitCard key={unit.id} unit={unit} levelColor={level.color} index={i} />
        ))}
      </div>

      {units.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={40} strokeWidth={1.5} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p className="text-base" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
            لا توجد وحدات في هذا المستوى
          </p>
        </div>
      )}
    </div>
  )
}
