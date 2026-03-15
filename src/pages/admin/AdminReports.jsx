import { useState, lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Users, Zap, Flame, Calendar, FileText, Loader2, Download, AlertTriangle, Brain } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'
import SubTabs from '../../components/common/SubTabs'

const AdminChurnPrediction = lazy(() => import('./AdminChurnPrediction'))
const AdminSmartScheduling = lazy(() => import('./AdminSmartScheduling'))

const TABS = [
  { key: 'reports', label: 'التقارير', icon: BarChart3 },
  { key: 'churn', label: 'توقع الانسحاب', icon: AlertTriangle },
  { key: 'scheduling', label: 'الجدولة الذكية', icon: Brain },
]
import { exportToCSV } from '../../utils/exportData'

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('reports')
  return (
    <div className="space-y-8">
      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} accent="gold" />
      <Suspense fallback={<div className="skeleton h-96 w-full" />}>
        {activeTab === 'reports' && <ReportsContent />}
        {activeTab === 'churn' && <AdminChurnPrediction />}
        {activeTab === 'scheduling' && <AdminSmartScheduling />}
      </Suspense>
    </div>
  )
}

function ReportsContent() {
  // Overview stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-report-stats'],
    queryFn: async () => {
      const [studentsRes, groupsRes, classesRes, submissionsRes, paymentsRes] = await Promise.all([
        supabase.from('students').select('id, xp_total, current_streak, academic_level, status, group_id', { count: 'exact' }).is('deleted_at', null),
        supabase.from('groups').select('id, name, code, level, is_active'),
        supabase.from('classes').select('id', { count: 'exact' }),
        supabase.from('submissions').select('id, status', { count: 'exact' }).is('deleted_at', null),
        supabase.from('payments').select('id, amount, status').is('deleted_at', null),
      ])

      const students = studentsRes.data || []
      const groups = groupsRes.data || []
      const activeStudents = students.filter(s => s.status === 'active')
      const paidPayments = (paymentsRes.data || []).filter(p => p.status === 'paid')
      const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const gradedSubmissions = (submissionsRes.data || []).filter(s => s.status === 'graded')

      return {
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        totalGroups: groups.filter(g => g.is_active).length,
        totalClasses: classesRes.count || 0,
        totalSubmissions: submissionsRes.count || 0,
        gradedSubmissions: gradedSubmissions.length,
        totalRevenue,
        avgXP: activeStudents.length > 0 ? Math.round(activeStudents.reduce((s, st) => s + (st.xp_total || 0), 0) / activeStudents.length) : 0,
        avgStreak: activeStudents.length > 0 ? Math.round(activeStudents.reduce((s, st) => s + (st.current_streak || 0), 0) / activeStudents.length * 10) / 10 : 0,
        students: activeStudents,
        groups,
      }
    },
  })

  // Top students by XP
  const { data: leaderboard } = useQuery({
    queryKey: ['admin-leaderboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, gamification_level, profiles(full_name, display_name), groups(code)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('xp_total', { ascending: false })
        .limit(10)
      return data || []
    },
  })

  // Group stats
  const groupStats = stats?.groups?.filter(g => g.is_active).map(g => {
    const groupStudents = stats.students.filter(s => s.group_id === g.id)
    return {
      ...g,
      studentCount: groupStudents.length,
      avgXP: groupStudents.length > 0 ? Math.round(groupStudents.reduce((s, st) => s + (st.xp_total || 0), 0) / groupStudents.length) : 0,
      totalXP: groupStudents.reduce((s, st) => s + (st.xp_total || 0), 0),
    }
  }).sort((a, b) => b.totalXP - a.totalXP)

  function handleExportReport() {
    // Export leaderboard
    if (leaderboard?.length) {
      const leaderColumns = [
        { key: (s) => s.profiles?.display_name || s.profiles?.full_name || 'طالب', label: 'الطالب' },
        { key: (s) => s.groups?.code || '', label: 'المجموعة' },
        { key: 'xp_total', label: 'XP' },
        { key: 'current_streak', label: 'السلسلة' },
        { key: 'gamification_level', label: 'المستوى' },
      ]
      exportToCSV(leaderboard, 'leaderboard', leaderColumns)
    }

    // Export group stats
    if (groupStats?.length) {
      const groupColumns = [
        { key: 'code', label: 'الكود' },
        { key: 'name', label: 'المجموعة' },
        { key: (g) => ACADEMIC_LEVELS[g.level]?.cefr || g.level, label: 'المستوى' },
        { key: 'studentCount', label: 'عدد الطلاب' },
        { key: 'avgXP', label: 'متوسط XP' },
        { key: 'totalXP', label: 'إجمالي XP' },
      ]
      exportToCSV(groupStats, 'group_stats', groupColumns)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-[var(--text-primary)]">التقارير</h1>
          <p className="text-muted text-sm mt-1">نظرة عامة على أداء الأكاديمية</p>
        </div>
        <button
          onClick={handleExportReport}
          disabled={!leaderboard?.length && !groupStats?.length}
          className="btn-secondary text-sm py-2 flex items-center gap-2"
        >
          <Download size={16} /> تصدير التقرير
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {[
          { label: 'طلاب نشطين', value: stats?.activeStudents, icon: Users, color: 'text-sky-400' },
          { label: 'مجموعات', value: stats?.totalGroups, icon: Users, color: 'text-emerald-400' },
          { label: 'حصص', value: stats?.totalClasses, icon: Calendar, color: 'text-amber-400' },
          { label: 'واجبات مسلمة', value: stats?.totalSubmissions, icon: FileText, color: 'text-purple-400' },
          { label: 'إيرادات (ريال)', value: stats?.totalRevenue?.toLocaleString(), icon: BarChart3, color: 'text-gold-400' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="fl-card p-4 text-center"
          >
            <div className={`w-10 h-10 rounded-xl ${card.color === 'text-sky-400' ? 'bg-sky-500/10' : card.color === 'text-emerald-400' ? 'bg-emerald-500/10' : card.color === 'text-amber-400' ? 'bg-amber-500/10' : card.color === 'text-purple-400' ? 'bg-purple-500/10' : 'bg-gold-500/10'} flex items-center justify-center mx-auto mb-2`}>
              <card.icon size={20} className={card.color} />
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{card.value || 0}</p>
            <p className="text-xs text-muted">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Averages */}
      <div className="grid grid-cols-2 gap-6">
        <div className="fl-card-static p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <Zap size={16} className="text-gold-400" />
            </div>
            <span className="text-sm text-muted">متوسط XP</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats?.avgXP}</p>
        </div>
        <div className="fl-card-static p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Flame size={16} className="text-orange-400" />
            </div>
            <span className="text-sm text-muted">متوسط السلسلة</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats?.avgStreak} يوم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="fl-card-static p-7">
          <h3 className="text-section-title mb-4" style={{ color: 'var(--text-primary)' }}>أفضل 10 طلاب</h3>
          <div className="space-y-2">
            {leaderboard?.map((s, i) => {
              const name = s.profiles?.display_name || s.profiles?.full_name || 'طالب'
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{medals[i] || `${i + 1}`}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
                      <p className="text-xs text-muted">{s.groups?.code} • مستوى {s.gamification_level}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gold-400">{s.xp_total} XP</p>
                    <p className="text-xs text-orange-400">{s.current_streak} يوم</p>
                  </div>
                </div>
              )
            })}
            {leaderboard?.length === 0 && <p className="text-sm text-muted text-center">لا توجد بيانات</p>}
          </div>
        </div>

        {/* Group Rankings */}
        <div className="fl-card-static p-7">
          <h3 className="text-section-title mb-4" style={{ color: 'var(--text-primary)' }}>ترتيب المجموعات</h3>
          <div className="space-y-3">
            {groupStats?.map((g, i) => (
              <div key={g.id} className="p-3 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{g.code} — {g.name}</p>
                    <p className="text-xs text-muted">{g.studentCount} طالب • {ACADEMIC_LEVELS[g.level]?.cefr}</p>
                  </div>
                  <p className="text-sm font-bold text-gold-400">{g.totalXP} XP</p>
                </div>
                <div className="fl-progress-track">
                  <div
                    className="fl-progress-fill bg-sky-500"
                    style={{ width: `${groupStats[0]?.totalXP > 0 ? (g.totalXP / groupStats[0].totalXP * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {groupStats?.length === 0 && <p className="text-sm text-muted text-center">لا توجد مجموعات</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
