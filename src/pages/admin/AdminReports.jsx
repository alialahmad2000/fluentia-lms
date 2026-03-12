import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Users, Zap, Flame, Calendar, FileText, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'

export default function AdminReports() {
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
      avgXP: groupStudents.length > 0 ? Math.round(groupStudents.reduce((s, st) => s + st.xp_total, 0) / groupStudents.length) : 0,
      totalXP: groupStudents.reduce((s, st) => s + st.xp_total, 0),
    }
  }).sort((a, b) => b.totalXP - a.totalXP)

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">التقارير</h1>
        <p className="text-muted text-sm mt-1">نظرة عامة على أداء الأكاديمية</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
            className="glass-card p-4 text-center"
          >
            <card.icon size={20} className={`${card.color} mx-auto mb-2`} />
            <p className="text-xl font-bold text-white">{card.value || 0}</p>
            <p className="text-xs text-muted">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Averages */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-gold-400" />
            <span className="text-sm text-muted">متوسط XP</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.avgXP}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={16} className="text-orange-400" />
            <span className="text-sm text-muted">متوسط السلسلة</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.avgStreak} يوم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-bold text-white mb-4">أفضل 10 طلاب</h3>
          <div className="space-y-2">
            {leaderboard?.map((s, i) => {
              const name = s.profiles?.display_name || s.profiles?.full_name || 'طالب'
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{medals[i] || `${i + 1}`}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{name}</p>
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
        <div className="glass-card p-5">
          <h3 className="text-lg font-bold text-white mb-4">ترتيب المجموعات</h3>
          <div className="space-y-3">
            {groupStats?.map((g, i) => (
              <div key={g.id} className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{g.code} — {g.name}</p>
                    <p className="text-xs text-muted">{g.studentCount} طالب • {ACADEMIC_LEVELS[g.level]?.cefr}</p>
                  </div>
                  <p className="text-sm font-bold text-gold-400">{g.totalXP} XP</p>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className="bg-sky-500 rounded-full h-2 transition-all"
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
