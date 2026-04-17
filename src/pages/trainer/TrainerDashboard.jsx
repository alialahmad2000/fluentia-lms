import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, FileText, CheckCircle2, AlertTriangle, Zap, PenLine,
  Flame, Award, MessageSquare, UserCheck, BookOpen, Mic, RefreshCw,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import ErrorBoundary from '../../components/ErrorBoundary'
import ClassPrepCard from '../../components/trainer/ClassPrepCard'
import CurrentUnitSelector from '../../components/trainer/CurrentUnitSelector'
import EnableNotificationsPrompt from '../../components/notifications/EnableNotificationsPrompt'
import RecentMasteryAttemptsWidget from './RecentMasteryAttemptsWidget'

// ─── Helpers ─────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'الآن'
    if (mins < 60) return `منذ ${mins} د`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `منذ ${hours} س`
    const days = Math.floor(hours / 24)
    return `منذ ${days} يوم`
  } catch { return '' }
}

const anim = (i) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4 },
})

// ═════════════════════════════════════════════════════
// MAIN DASHBOARD — single component, every query safe
// ═════════════════════════════════════════════════════
export default function TrainerDashboard() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const firstName = profile?.full_name || profile?.display_name || ''
  const isAdmin = profile?.role === 'admin'

  // ── Groups ──
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['trainer-groups', profile?.id, profile?.role],
    queryFn: async () => {
      let q = supabase.from('groups').select('id, name, code, level, schedule, google_meet_link, is_active')
        .eq('is_active', true).order('level')
      if (!isAdmin) q = q.eq('trainer_id', profile?.id)
      const { data, error } = await q
      if (error) { console.error('[Dashboard] groups:', error.message); return [] }
      return data || []
    },
    enabled: !!profile?.id,
  })

  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const activeGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) : groups[0]
  const currentGroupIds = useMemo(() => activeGroup ? [activeGroup.id] : groups.map(g => g.id), [activeGroup, groups])

  // ── Students ──
  const { data: students = [] } = useQuery({
    queryKey: ['trainer-students', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, team_id, group_id, profiles!inner(full_name, display_name, avatar_url, last_active_at)')
        .in('group_id', currentGroupIds)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('xp_total', { ascending: false })
      if (error) { console.error('[Dashboard] students:', error.message); return [] }
      return data || []
    },
    enabled: currentGroupIds.length > 0,
  })

  // ── Teams ──
  const { data: teams = [] } = useQuery({
    queryKey: ['trainer-teams', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const { data } = await supabase.from('teams').select('id, name, emoji, color, group_id, total_xp').in('group_id', currentGroupIds)
      return data || []
    },
    enabled: currentGroupIds.length > 0,
  })

  // ── Pending Submissions ──
  const { data: pendingAssignments = [] } = useQuery({
    queryKey: ['trainer-pending-assignments', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const { data, error } = await supabase
        .from('submissions')
        .select('id, status, created_at, submitted_at, student_id, students:student_id(profiles(full_name, display_name)), assignments!inner(title, type, group_id)')
        .in('assignments.group_id', currentGroupIds)
        .eq('status', 'submitted')
        .order('created_at', { ascending: true })
        .limit(10)
      if (error) { console.error('[Dashboard] submissions:', error.message); return [] }
      return data || []
    },
    enabled: currentGroupIds.length > 0,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  })

  // ── Pending Speaking ──
  const { data: pendingSpeaking = [] } = useQuery({
    queryKey: ['trainer-pending-speaking', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const studentIds = students.map(s => s.id)
      if (!studentIds.length) return []
      const { data, error } = await supabase
        .from('speaking_recordings')
        .select('id, student_id, unit_id, created_at, students:student_id(profiles(full_name, display_name)), units:unit_id(level_id)')
        .in('student_id', studentIds)
        .eq('trainer_reviewed', false)
        .order('created_at', { ascending: true })
        .limit(10)
      if (error) { console.error('[Dashboard] speaking:', error.message); return [] }
      return data || []
    },
    enabled: students.length > 0,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  })

  // ── Pending Writing (curriculum) ──
  const { data: pendingWriting = [] } = useQuery({
    queryKey: ['trainer-pending-writing', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const studentIds = students.map(s => s.id)
      if (!studentIds.length) return []
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('id, student_id, unit_id, writing_id, completed_at, units:unit_id(level_id)')
        .eq('section_type', 'writing')
        .eq('status', 'completed')
        .is('trainer_graded_at', null)
        .in('student_id', studentIds)
        .order('completed_at', { ascending: true })
        .limit(10)
      if (error) { console.error('[Dashboard] writing:', error.message); return [] }
      return data || []
    },
    enabled: students.length > 0,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  })

  // ── Computed stats ──
  const pendingCount = pendingAssignments.length + pendingSpeaking.length + pendingWriting.length
  const streaksAtRisk = students.filter(s => {
    if (!s.current_streak || s.current_streak === 0) return false
    const lastActive = s.profiles?.last_active_at
    if (!lastActive) return true
    return (Date.now() - new Date(lastActive).getTime()) / 3600000 > 20
  }).length
  const avgXP = students.length > 0 ? Math.round(students.reduce((s, st) => s + (st.xp_total || 0), 0) / students.length) : 0

  const teamsMap = useMemo(() => {
    const m = {}
    teams.forEach(t => { m[t.id] = t })
    return m
  }, [teams])

  const getStatus = (lastActive) => {
    if (!lastActive) return { dot: '⚪', label: 'لم يدخل', color: 'rgb(148,163,184)' }
    const days = (Date.now() - new Date(lastActive).getTime()) / 86400000
    if (days < 1) return { dot: '🟢', label: 'نشط', color: 'rgb(52,211,153)' }
    if (days <= 3) return { dot: '🟡', label: 'خامل', color: 'rgb(251,191,36)' }
    return { dot: '🔴', label: 'غائب', color: 'rgb(239,68,68)' }
  }

  // Loading state
  if (!profile) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
        <div className="h-64 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }} />
      </div>
    )
  }

  // Helper: find student name from students array
  const getStudentName = (studentId) => {
    const s = students.find(st => st.id === studentId)
    return s?.profiles?.full_name || s?.profiles?.display_name || 'طالب'
  }

  // ── All pending items merged ──
  const allPending = [
    ...pendingAssignments.map(s => ({
      id: s.id, type: s.assignments?.type || 'custom',
      title: s.assignments?.title || 'واجب',
      name: s.students?.profiles?.full_name || s.students?.profiles?.display_name || 'طالب',
      date: s.submitted_at || s.created_at,
      href: `/trainer/grading?open=${s.id}`,
    })),
    ...pendingSpeaking.map(r => ({
      id: `sp-${r.id}`, type: 'speaking',
      title: 'تسجيل تحدث',
      name: r.students?.profiles?.full_name || r.students?.profiles?.display_name || 'طالب',
      date: r.created_at,
      href: r.units?.level_id && r.unit_id
        ? `/trainer/interactive-curriculum/${r.units.level_id}/${r.unit_id}?tab=speaking&student=${r.student_id}`
        : '/trainer/grading',
    })),
    ...pendingWriting.map(w => ({
      id: `wr-${w.id}`, type: 'writing',
      title: 'مهمة كتابة',
      name: getStudentName(w.student_id),
      date: w.completed_at,
      href: w.units?.level_id && w.unit_id
        ? `/trainer/interactive-curriculum/${w.units.level_id}/${w.unit_id}?tab=writing&student=${w.student_id}`
        : '/trainer/grading',
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  const TYPE_BADGE = {
    writing: { label: 'كتابة', bg: 'rgba(129,140,248,0.15)', color: 'rgb(129,140,248)' },
    speaking: { label: 'تحدث', bg: 'rgba(52,211,153,0.15)', color: 'rgb(52,211,153)' },
    reading: { label: 'قراءة', bg: 'rgba(251,191,36,0.15)', color: 'rgb(251,191,36)' },
    grammar: { label: 'قواعد', bg: 'rgba(56,189,248,0.15)', color: 'rgb(56,189,248)' },
    custom: { label: 'واجب', bg: 'rgba(148,163,184,0.15)', color: 'rgb(148,163,184)' },
    vocabulary: { label: 'مفردات', bg: 'rgba(168,85,247,0.15)', color: 'rgb(168,85,247)' },
  }

  return (
    <div className="space-y-6">
      {/* ① GREETING */}
      <motion.div {...anim(0)}>
        <h1 className="text-2xl sm:text-3xl font-black font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
          {getGreeting()}، <span style={{ color: 'var(--accent-sky)' }}>{firstName}</span>
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-[13px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>لوحة تحكم المدرب</p>
          {groups.length > 1 && activeGroup && (
            <span className="text-[12px] px-2.5 py-0.5 rounded-full font-['Tajawal']" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-sky)' }}>
              {activeGroup.name}
            </span>
          )}
        </div>
      </motion.div>

      {/* Push notifications opt-in */}
      <EnableNotificationsPrompt />

      {/* ② GROUP SELECTOR */}
      {groups.length > 1 && (
        <motion.div {...anim(1)} className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedGroupId(null)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold font-['Tajawal'] transition-all border"
            style={{
              background: !selectedGroupId ? 'rgba(56,189,248,0.1)' : 'transparent',
              color: !selectedGroupId ? 'var(--accent-sky)' : 'var(--text-tertiary)',
              borderColor: !selectedGroupId ? 'rgba(56,189,248,0.3)' : 'var(--border-subtle)',
            }}
          >
            الكل ({groups.length})
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold font-['Tajawal'] transition-all border"
              style={{
                background: selectedGroupId === g.id ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: selectedGroupId === g.id ? 'var(--accent-sky)' : 'var(--text-tertiary)',
                borderColor: selectedGroupId === g.id ? 'rgba(56,189,248,0.3)' : 'var(--border-subtle)',
              }}
            >
              {g.name}
            </button>
          ))}
        </motion.div>
      )}

      {/* ②.5 CURRENT UNIT SELECTOR */}
      {activeGroup && CurrentUnitSelector && (
        <ErrorBoundary fallback={null}>
          <motion.div {...anim(1.5)}>
            <CurrentUnitSelector groupId={activeGroup.id} groupLevel={activeGroup.level} />
          </motion.div>
        </ErrorBoundary>
      )}

      {/* ③ QUICK STATS */}
      <motion.div {...anim(2)}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'بانتظار التقييم', value: pendingCount, icon: FileText, color: pendingCount > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)' },
            { label: 'طلاب نشطين', value: students.length, icon: Users, color: 'rgba(255,255,255,0.06)' },
            { label: 'سلسلة مهددة', value: streaksAtRisk, icon: Flame, color: streaksAtRisk > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)' },
            { label: 'متوسط XP', value: avgXP, icon: Zap, color: 'rgba(255,255,255,0.06)' },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${card.color}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{card.label}</span>
                <card.icon size={16} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />
              </div>
              <p className="text-2xl sm:text-3xl font-black font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                {typeof card.value === 'number' ? card.value.toLocaleString('ar-SA') : card.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ③.5 CLASS PREP CARD */}
      {activeGroup && ClassPrepCard && (
        <ErrorBoundary fallback={null}>
          <motion.div {...anim(3)}>
            <ClassPrepCard groupId={activeGroup.id} groupName={activeGroup.name} />
          </motion.div>
        </ErrorBoundary>
      )}

      {/* ③.6 RECENT MASTERY ATTEMPTS */}
      <ErrorBoundary fallback={null}>
        <motion.div {...anim(3.5)}>
          <RecentMasteryAttemptsWidget />
        </motion.div>
      </ErrorBoundary>

      {/* ④ PENDING REVIEWS */}
      <motion.div {...anim(4)} className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 mb-5">
          <CheckCircle2 size={18} className="text-amber-400" />
          <h3 className="text-[15px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>واجبات تنتظر تصحيح</h3>
          {allPending.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' }}>
              {allPending.length}
            </span>
          )}
        </div>

        {allPending.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>ما في واجبات تنتظر — ممتاز!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {allPending.slice(0, 8).map(item => {
              const badge = TYPE_BADGE[item.type] || TYPE_BADGE.custom
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl p-3.5 cursor-pointer transition-all hover:translate-y-[-1px]"
                  style={{ background: 'var(--surface-raised)' }}
                  onClick={() => navigate(item.href || '/trainer/grading')}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: badge.bg, color: badge.color }}>
                    {item.type === 'speaking' ? '🎤' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      <span className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{item.title}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-['Tajawal'] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {item.date ? timeAgo(item.date) : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ⑤ STUDENTS */}
      {students.length > 0 && (
        <motion.div {...anim(5)} className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-5">
            <Users size={18} className="text-sky-400" />
            <h3 className="text-[15px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>حالة الطلاب</h3>
            <span className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{students.length} طالب</span>
          </div>

          <div className="space-y-2.5">
            {students.map(s => {
              const team = s.team_id ? teamsMap[s.team_id] : null
              const lastActive = s.profiles?.last_active_at
              const status = getStatus(lastActive)
              const streakDanger = s.current_streak > 0 && (!lastActive || (Date.now() - new Date(lastActive).getTime()) / 3600000 > 20)
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all hover:translate-y-[-1px]"
                  style={{ background: 'var(--surface-raised)' }}
                  onClick={() => navigate(`/trainer/student/${s.id}/progress`)}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-sky)' }}>
                    {(s.profiles?.full_name || s.profiles?.display_name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                      {s.profiles?.full_name || s.profiles?.display_name || 'طالب'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span className={streakDanger ? 'text-red-400' : ''}>🔥 {s.current_streak || 0}</span>
                      <span>⚡ {(s.xp_total || 0).toLocaleString('ar-SA')}</span>
                      {team && <span>{team.emoji} {team.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
                      {lastActive ? timeAgo(lastActive) : 'لم يدخل'}
                    </span>
                    <span className="text-sm">{status.dot}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ⑥ QUICK ACTIONS */}
      <motion.div {...anim(6)}>
        <h3 className="text-[14px] font-bold mb-3 font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>إجراءات سريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/trainer/points', label: 'أضف نقاط', icon: Zap },
            { to: '/trainer/curriculum', label: 'المنهج', icon: BookOpen },
            { to: '/trainer/student-notes', label: 'أرسل ملاحظة', icon: MessageSquare },
            { to: '/trainer/attendance', label: 'سجل حضور', icon: UserCheck },
          ].map(a => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 rounded-xl p-4 transition-all hover:translate-y-[-1px]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <a.icon size={16} style={{ color: 'var(--accent-sky)' }} />
              <span className="text-[13px] font-medium font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
