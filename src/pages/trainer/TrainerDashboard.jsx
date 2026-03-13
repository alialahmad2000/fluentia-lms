import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, FileText, Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting, getArabicDay, formatTime } from '../../utils/dateHelpers'

export default function TrainerDashboard() {
  const { profile } = useAuthStore()
  const firstName = profile?.display_name || (profile?.full_name || '').split(' ')[0]
  const role = profile?.role
  const isAdmin = role === 'admin'

  // Groups this trainer manages (admin sees all)
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      let query = supabase
        .from('groups')
        .select('id, name, code, level, schedule, google_meet_link')
        .order('level')
      if (role !== 'admin') {
        query = query.eq('trainer_id', profile?.id)
      }
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Total students across all groups
  const { data: studentCount } = useQuery({
    queryKey: ['trainer-student-count', groups?.map(g => g.id)],
    queryFn: async () => {
      if (!groups?.length) return 0
      const groupIds = groups.map(g => g.id)
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .in('group_id', groupIds)
        .eq('status', 'active')
        .is('deleted_at', null)
      return count || 0
    },
    enabled: !!groups?.length,
  })

  // Pending submissions to grade
  const { data: pendingSubmissions } = useQuery({
    queryKey: ['trainer-pending-submissions', role],
    queryFn: async () => {
      let query = supabase
        .from('submissions')
        .select('*, assignments!inner(group_id)', { count: 'exact', head: true })
        .eq('status', 'submitted')

      if (!isAdmin) {
        if (!groups?.length) return 0
        const groupIds = groups.map(g => g.id)
        query = query.in('assignments.group_id', groupIds)
      }

      const { count } = await query
      return count || 0
    },
    enabled: isAdmin || !!groups?.length,
  })

  // Recent submissions
  const { data: recentSubmissions } = useQuery({
    queryKey: ['trainer-recent-submissions', role],
    queryFn: async () => {
      let query = supabase
        .from('submissions')
        .select('id, status, created_at, students:student_id(profiles(full_name)), assignments!inner(title, group_id)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (role !== 'admin') {
        if (!groups?.length) return []
        const groupIds = groups.map(g => g.id)
        query = query.in('assignments.group_id', groupIds)
      }

      const { data } = await query
      return data || []
    },
    enabled: isAdmin || !!groups?.length,
  })

  const cards = [
    { label: 'المجموعات', value: groups?.length ?? '—', icon: Users, color: 'sky' },
    { label: 'الطلاب النشطين', value: studentCount ?? '—', icon: Users, color: 'gold' },
    { label: 'بانتظار التقييم', value: pendingSubmissions ?? '—', icon: FileText, color: 'sky' },
    { label: 'الحصص هذا الأسبوع', value: groups?.reduce((sum, g) => sum + (g.schedule?.days?.length || 0), 0) ?? '—', icon: Calendar, color: 'gold' },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">
          {getGreeting()}، <span className="text-gradient">{firstName}</span>
        </h1>
        <p className="text-muted text-sm mt-1">لوحة تحكم المدرب</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted text-xs">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                card.color === 'gold' ? 'bg-gold-500/10 text-gold-400' : 'bg-sky-500/10 text-sky-400'
              }`}>
                <card.icon size={16} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Groups & Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-sky-400" />
            <h3 className="font-medium text-white">المجموعات والجدول</h3>
          </div>
          {groups?.length > 0 ? (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white">{g.name}</p>
                    <span className="badge-blue">{g.code}</span>
                  </div>
                  {g.schedule && (
                    <div className="flex items-center gap-3 text-xs text-muted mt-2">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(g.schedule.time)}
                      </span>
                      <span>{g.schedule.days?.map(d => getArabicDay(d)).join(' — ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد مجموعات مسجلة</p>
          )}
        </motion.div>

        {/* Recent submissions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-gold-400" />
            <h3 className="font-medium text-white">آخر التسليمات</h3>
          </div>
          {recentSubmissions?.length > 0 ? (
            <div className="space-y-3">
              {recentSubmissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm bg-white/5 rounded-xl p-3">
                  <div>
                    <p className="text-white text-xs font-medium">{s.students?.profiles?.full_name || 'طالب'}</p>
                    <p className="text-muted text-xs">{s.assignments?.title}</p>
                  </div>
                  <span className={s.status === 'submitted' ? 'badge-blue' : s.status === 'graded' ? 'badge-green' : 'badge-yellow'}>
                    {s.status === 'submitted' ? 'بانتظار' : s.status === 'graded' ? 'تم' : s.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد تسليمات حتى الآن</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
