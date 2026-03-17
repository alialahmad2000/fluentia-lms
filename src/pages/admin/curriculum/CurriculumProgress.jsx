import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Users, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import ProgressMatrix from './components/ProgressMatrix'

function ProgressSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-4 w-64 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="h-96 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
    </div>
  )
}

export default function CurriculumProgress() {
  const navigate = useNavigate()

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['progress-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('role', 'student')
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return data || []
    },
  })

  const { data: progress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['progress-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, unit_id, section_type, status, score')
      if (error) throw error
      return data || []
    },
  })

  const { data: levels = [] } = useQuery({
    queryKey: ['progress-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('id, name_ar, name_en, color, level_number')
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })

  const { data: units = [] } = useQuery({
    queryKey: ['progress-units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('id, level_id, unit_number')
        .order('unit_number')
      if (error) throw error
      return data || []
    },
  })

  const isLoading = loadingStudents || loadingProgress

  // Stats
  const totalStudents = students.length
  const activeStudents = new Set(progress.map(p => p.student_id)).size
  const completedSections = progress.filter(p => p.status === 'completed').length

  return (
    <div className="space-y-8">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/admin/curriculum')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <ArrowRight size={16} strokeWidth={1.5} />
        <span className="text-sm">العودة للمنهج</span>
      </motion.button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={28} strokeWidth={1.5} style={{ color: '#38bdf8' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>تقدم الطلاب</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>متابعة مستوى كل طالب في المنهج</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} style={{ color: '#38bdf8' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>إجمالي الطلاب</span>
          </div>
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalStudents}</span>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} style={{ color: '#4ade80' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>طلاب نشطون</span>
          </div>
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{activeStudents}</span>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} style={{ color: '#a78bfa' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>أقسام مكتملة</span>
          </div>
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{completedSections}</span>
        </div>
      </div>

      {/* Matrix */}
      {isLoading ? (
        <ProgressSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ProgressMatrix students={students} progress={progress} levels={levels} units={units} />
        </motion.div>
      )}
    </div>
  )
}
