import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, FileText, Calendar, Clock, CheckCircle2, Brain, Loader2, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting, getArabicDay, formatTime } from '../../utils/dateHelpers'

const TRAINER_TIPS = [
  'راجع التسليمات المعلقة لتحفيز طلابك!',
  'تحليل الذكاء الاصطناعي يساعدك على فهم نقاط ضعف الطلاب.',
  'لا تنسَ تحديث ملاحظاتك عن أداء الطلاب.',
  'التقييم السريع يحفز الطلاب على الاستمرار!',
  'تابع نشاط المجموعة لتبقى على اطلاع.',
]

function getTrainerTip() {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return TRAINER_TIPS[seed % TRAINER_TIPS.length]
}

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
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title">
          {getGreeting()}، <span className="text-gradient">{firstName}</span>
        </h1>
        <p className="text-[15px] mt-2.5" style={{ color: 'var(--text-tertiary)' }}>لوحة تحكم المدرب</p>
      </motion.div>

      {/* Encouraging tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-start gap-3 px-5 py-4 rounded-xl"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-sky-glow)' }}>
          <Sparkles size={16} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
        </div>
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{getTrainerTip()}</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => {
          const variant = card.color === 'gold' ? 'amber' : 'sky'
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`fl-stat-card ${variant}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{card.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  card.color === 'gold' ? 'bg-gold-500/10 text-gold-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  <card.icon size={20} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Recent submissions (actionable — shown first) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="fl-card-static p-7"
      >
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 size={20} className="text-gold-400" />
          <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>آخر التسليمات</h3>
          {pendingSubmissions > 0 && (
            <span className="fl-badge amber text-[11px]">{pendingSubmissions} بانتظار التقييم</span>
          )}
        </div>
        {recentSubmissions?.length > 0 ? (
          <div className="space-y-3">
            {recentSubmissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm rounded-xl p-4 hover:translate-y-[-2px] transition-all duration-200" style={{ background: 'var(--surface-raised)' }}>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-medium">{s.students?.profiles?.full_name || 'طالب'}</p>
                  <p className="text-muted text-xs mt-0.5">{s.assignments?.title}</p>
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Groups & Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="fl-card-static p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={20} className="text-sky-400" />
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>المجموعات والجدول</h3>
          </div>
          {groups?.length > 0 ? (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.id} className="rounded-xl p-4 hover:translate-y-[-2px] transition-all duration-200" style={{ background: 'var(--surface-raised)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{g.name}</p>
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

        {/* AI Group Insights */}
        <GroupInsightsCard groups={groups} />
      </div>
    </div>
  )
}

function GroupInsightsCard({ groups }) {
  const { data: aiProfiles, isLoading } = useQuery({
    queryKey: ['trainer-ai-profiles-summary', groups?.map(g => g.id)],
    queryFn: async () => {
      if (!groups?.length) return { total: 0, analyzed: 0, avgSkills: {} }
      const groupIds = groups.map(g => g.id)
      // Get students in trainer's groups
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .in('group_id', groupIds)
        .eq('status', 'active')
        .is('deleted_at', null)
      if (!students?.length) return { total: 0, analyzed: 0, avgSkills: {} }
      const studentIds = students.map(s => s.id)
      // Get AI profiles
      const { data: profiles } = await supabase
        .from('ai_student_profiles')
        .select('skills')
        .in('student_id', studentIds)
      const analyzed = profiles?.length || 0
      // Aggregate avg skills
      const avgSkills = {}
      if (analyzed > 0) {
        profiles.forEach(p => {
          Object.entries(p.skills || {}).forEach(([k, v]) => {
            avgSkills[k] = (avgSkills[k] || 0) + (v || 0)
          })
        })
        Object.keys(avgSkills).forEach(k => { avgSkills[k] = Math.round(avgSkills[k] / analyzed) })
      }
      return { total: studentIds.length, analyzed, avgSkills }
    },
    enabled: !!groups?.length,
  })

  const SKILL_LABELS = {
    speaking: 'المحادثة', listening: 'الاستماع', reading: 'القراءة', writing: 'الكتابة',
    grammar: 'القواعد', vocabulary: 'المفردات', pronunciation: 'النطق', consistency: 'الالتزام',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="fl-card-static p-7 lg:col-span-2"
    >
      <div className="flex items-center gap-3 mb-6">
        <Brain size={20} className="text-violet-400" />
        <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>ملخص الذكاء الاصطناعي</h3>
        {aiProfiles && (
          <span className="badge-muted text-xs">{aiProfiles.analyzed}/{aiProfiles.total} محلل</span>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted" size={20} /></div>
      ) : !aiProfiles?.analyzed ? (
        <p className="text-muted text-sm text-center py-4">لم يتم تحليل أي طالب بعد. افتح صفحة الطالب واضغط "تحليل الملف الذكي".</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(aiProfiles.avgSkills).map(([key, value]) => (
            <div key={key} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-raised)' }}>
              <p className="text-xs text-muted mb-1">{SKILL_LABELS[key] || key}</p>
              <p className={`text-lg font-bold ${value >= 70 ? 'text-emerald-400' : value >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
