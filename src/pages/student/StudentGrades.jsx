import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Award, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ASSIGNMENT_TYPES, GRADE_LABELS } from '../../lib/constants'
import { formatDateAr } from '../../utils/dateHelpers'

export default function StudentGrades() {
  const { profile } = useAuthStore()

  const { data: grades, isLoading } = useQuery({
    queryKey: ['student-grades', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*, assignments(title, type, points_on_time)')
        .eq('student_id', profile?.id)
        .eq('status', 'graded')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Calculate stats
  const totalGraded = grades?.length || 0
  const avgNumeric = totalGraded > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.grade_numeric || 0), 0) / totalGraded)
    : 0
  const totalXP = grades?.reduce((sum, g) => sum + (g.points_awarded || 0), 0) || 0

  function getGradeColor(grade) {
    const info = GRADE_LABELS[grade]
    if (!info) return 'text-muted'
    const colors = { green: 'text-emerald-400', sky: 'text-sky-400', yellow: 'text-amber-400', orange: 'text-orange-400', red: 'text-red-400' }
    return colors[info.color] || 'text-muted'
  }

  return (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title">الدرجات</h1>
        <p className="text-muted text-sm mt-1">نتائج الواجبات المقيّمة</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="stat-card hover:translate-y-[-2px] transition-all duration-200">
          <div className="stat-icon">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Award size={20} className="text-sky-400" />
            </div>
          </div>
          <p className="stat-label">الواجبات المقيّمة</p>
          <p className="stat-number text-3xl font-bold text-white">{totalGraded}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="stat-card hover:translate-y-[-2px] transition-all duration-200">
          <div className="stat-icon">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-sky-400" />
            </div>
          </div>
          <p className="stat-label">المعدل</p>
          <p className="stat-number text-3xl font-bold text-white">{avgNumeric}%</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="stat-card hover:translate-y-[-2px] transition-all duration-200">
          <div className="stat-icon">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <span className="text-gold-400 text-lg font-bold">XP</span>
            </div>
          </div>
          <p className="stat-label">XP من الواجبات</p>
          <p className="stat-number text-3xl font-bold text-white">{totalXP}</p>
        </motion.div>
      </div>

      {/* Grades list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
      ) : totalGraded === 0 ? (
        <div className="glass-card p-8 text-center">
          <Award size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted">لا توجد درجات حتى الآن</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map((g, i) => {
            const typeInfo = ASSIGNMENT_TYPES[g.assignments?.type] || ASSIGNMENT_TYPES.custom
            const gradeInfo = GRADE_LABELS[g.grade]

            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-7 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                        <span>{typeInfo.icon}</span>
                      </div>
                      <h3 className="text-sm font-medium text-white truncate">{g.assignments?.title}</h3>
                      <span className="badge-blue text-[10px]">{typeInfo.label_ar}</span>
                    </div>
                    {g.trainer_feedback && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">{g.trainer_feedback}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted mt-2">
                      <span className="text-white/40">{formatDateAr(g.updated_at)}</span>
                      <span className="badge-gold text-[10px]">+{g.points_awarded} XP</span>
                      {g.is_late && <span className="badge-yellow text-[10px]">تسليم متأخر</span>}
                    </div>
                  </div>

                  {/* Grade display */}
                  <div className="text-center shrink-0">
                    <p className={`text-2xl font-bold ${getGradeColor(g.grade)}`}>{g.grade}</p>
                    <p className="text-xs text-white/40">{g.grade_numeric}%</p>
                    {gradeInfo && <p className="text-[10px] text-muted">{gradeInfo.label_ar}</p>}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
