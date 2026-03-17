import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GraduationCap, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import LevelCard from './components/LevelCard'

function OverviewSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-4 w-64 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    </div>
  )
}

export default function CurriculumOverview() {
  const navigate = useNavigate()

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['curriculum-levels-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select(`
          *,
          curriculum_units(id, is_published)
        `)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })

  if (isLoading) return <OverviewSkeleton />

  return (
    <div className="space-y-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap size={28} strokeWidth={1.5} style={{ color: '#38bdf8' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
            المنهج الدراسي
          </h1>
        </div>
        <p className="text-base" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
          إدارة المستويات والوحدات
        </p>
      </motion.div>

      {/* Level cards grid */}
      {levels.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap size={48} strokeWidth={1.5} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
            لا توجد مستويات بعد
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
            يرجى تشغيل بذور البيانات أولاً
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {levels.map((level, i) => (
            <LevelCard key={level.id} level={level} index={i} />
          ))}
        </div>
      )}

      {/* IELTS Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35 }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
          مسارات متخصصة
        </h2>
        <div
          onClick={() => navigate('/admin/curriculum/ielts')}
          className="group cursor-pointer rounded-2xl p-6"
          style={{
            background: 'rgba(163,45,45,0.05)',
            border: '1px solid rgba(163,45,45,0.2)',
            transition: 'all 0.2s ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(163,45,45,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(163,45,45,0.2)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(163,45,45,0.15)' }}>
                <Award size={24} strokeWidth={1.5} style={{ color: '#A32D2D' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                  مسار IELTS
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
                  التحضير للاختبار الدولي
                </p>
              </div>
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(163,45,45,0.15)',
                color: '#A32D2D',
                fontFamily: 'Tajawal',
              }}
            >
              قريباً
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
