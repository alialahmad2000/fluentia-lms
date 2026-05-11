import { useState, lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Award, TrendingUp, BarChart3, Trophy, FileCheck, GraduationCap } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { ListSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import { supabase } from '../../lib/supabase'
import { ASSIGNMENT_TYPES, GRADE_LABELS } from '../../lib/constants'
import { formatDateAr } from '../../utils/dateHelpers'
import SubTabs from '../../components/common/SubTabs'

// Lazy-load sub-tab content
const StudentAssessments = lazy(() => import('./StudentAssessments'))
const StudentCertificate = lazy(() => import('./StudentCertificate'))
const StudentLeaderboard = lazy(() => import('./StudentLeaderboard'))
const StudentSuccessStories = lazy(() => import('./StudentSuccessStories'))

const TABS = [
  { key: 'grades', label: 'الدرجات', icon: BarChart3 },
  { key: 'assessments', label: 'التقييمات', icon: FileCheck },
  { key: 'certificates', label: 'شهاداتي', icon: Award },
  { key: 'leaderboard', label: 'المتصدرين', icon: Trophy },
  { key: 'success', label: 'قصة نجاحي', icon: TrendingUp },
]

const TabFallback = () => <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>

export default function StudentGrades() {
  const [activeTab, setActiveTab] = useState('grades')

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <BarChart3 size={20} className="text-sky-400" strokeWidth={1.5} />
          </div>
          الدرجات والتقدم
        </h1>
        <p className="text-muted text-sm mt-1">نتائجك وإنجازاتك وتقييماتك</p>
      </motion.div>

      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'grades' && <GradesContent />}
        {activeTab === 'assessments' && <StudentAssessments />}
        {activeTab === 'certificates' && <StudentCertificate />}
        {activeTab === 'leaderboard' && <StudentLeaderboard />}
        {activeTab === 'success' && <StudentSuccessStories />}
      </Suspense>
    </div>
  )
}

function GradesContent() {
  const profile = useAuthStore((s) => s.profile)

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
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="fl-stat-card sky">
          <Award size={22} className="text-sky-400 mb-2" strokeWidth={1.5} />
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalGraded}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>الواجبات المقيّمة</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="fl-stat-card violet">
          <TrendingUp size={22} className="text-violet-400 mb-2" strokeWidth={1.5} />
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{avgNumeric}%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>المعدل</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="fl-stat-card amber">
          <span className="text-amber-400 text-lg font-bold mb-2 block">XP</span>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalXP}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>XP من الواجبات</p>
        </motion.div>
      </div>

      {/* Grades list */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : totalGraded === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="لا توجد درجات حتى الآن"
          description="ستظهر درجاتك هنا بعد تقييم واجباتك"
        />
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
                transition={{ delay: i * 0.05 }}
                className="fl-card p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                        <span>{typeInfo.icon}</span>
                      </div>
                      <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{g.assignments?.title}</h3>
                      <span className="badge-blue text-xs">{typeInfo.label_ar}</span>
                    </div>
                    {g.trainer_feedback && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">{g.trainer_feedback}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted mt-2">
                      <span>{formatDateAr(g.updated_at)}</span>
                      <span className="badge-gold text-xs">+{g.points_awarded} XP</span>
                      {g.is_late && <span className="badge-yellow text-xs">تسليم متأخر</span>}
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <p className={`text-2xl font-bold ${getGradeColor(g.grade)}`}>{g.grade}</p>
                    <p className="text-xs text-muted">{g.grade_numeric}%</p>
                    {gradeInfo && <p className="text-xs text-muted">{gradeInfo.label_ar}</p>}
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
