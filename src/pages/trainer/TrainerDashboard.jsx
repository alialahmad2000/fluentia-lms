import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import {
  Users, FileText, Calendar, Clock, CheckCircle2, Brain, Loader2, Sparkles,
  AlertTriangle, Zap, PenLine, ClipboardCheck, ListChecks, Activity,
  Dumbbell, Mic, ChevronDown, ExternalLink, Flame, TrendingUp, Award,
  MessageSquare, UserCheck, BookOpen,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting, getArabicDay, formatTime, timeAgo } from '../../utils/dateHelpers'
import { Link, useNavigate } from 'react-router-dom'
import UserAvatar from '../../components/common/UserAvatar'
import ErrorBoundary from '../../components/ErrorBoundary'

// ─── Section Error Fallback ──────────────────────────
function SectionError({ label }) {
  return (
    <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface-raised)', border: '1px solid rgba(239,68,68,0.15)' }}>
      <AlertTriangle size={20} className="text-red-400/60 mx-auto mb-2" />
      <p className="text-xs text-red-400/60 font-['Tajawal']">تعذر تحميل {label}</p>
    </div>
  )
}

// ─── Section Skeleton ────────────────────────────────
function SectionSkeleton({ rows = 3, h = 14 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ height: `${h}px`, background: 'rgba(255,255,255,0.03)' }} />
      ))}
    </div>
  )
}

// ─── Stagger animation ──────────────────────────────
const stagger = (i) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.4 } })

// ═════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════
export default function TrainerDashboard() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const firstName = profile?.display_name || (profile?.full_name || '').split(' ')[0]
  const role = profile?.role
  const isAdmin = role === 'admin'

  // ── Groups ──────────────────────────────────────
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['trainer-groups', profile?.id, role],
    queryFn: async () => {
      let q = supabase.from('groups').select('id, name, code, level, schedule, google_meet_link, is_active').eq('is_active', true).order('level')
      if (!isAdmin) q = q.eq('trainer_id', profile?.id)
      const { data } = await q
      return data || []
    },
    enabled: !!profile?.id,
  })

  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const activeGroup = selectedGroupId ? groups?.find(g => g.id === selectedGroupId) : groups?.[0]
  const groupIds = useMemo(() => groups?.map(g => g.id) || [], [groups])
  const currentGroupIds = useMemo(() => activeGroup ? [activeGroup.id] : groupIds, [activeGroup, groupIds])

  // ── Students ────────────────────────────────────
  const { data: students } = useQuery({
    queryKey: ['trainer-students-full', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, longest_streak, last_active_at, team_id, group_id, status, profiles!inner(full_name, display_name, avatar_url)')
        .in('group_id', currentGroupIds)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('xp_total', { ascending: false })
      return data || []
    },
    enabled: currentGroupIds.length > 0,
  })

  // ── Teams ───────────────────────────────────────
  const { data: teams } = useQuery({
    queryKey: ['trainer-teams', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const { data } = await supabase
        .from('teams')
        .select('id, name, emoji, color, group_id, total_xp')
        .in('group_id', currentGroupIds)
      return data || []
    },
    enabled: currentGroupIds.length > 0,
  })

  // ── Pending Submissions (assignments) ───────────
  const { data: pendingAssignments } = useQuery({
    queryKey: ['trainer-pending-assignments', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const { data } = await supabase
        .from('submissions')
        .select('id, status, created_at, submitted_at, is_late, student_id, students:student_id(profiles(full_name, display_name, avatar_url)), assignments!inner(title, type, group_id)')
        .in('assignments.group_id', currentGroupIds)
        .eq('status', 'submitted')
        .order('created_at', { ascending: true })
        .limit(10)
      return data || []
    },
    enabled: currentGroupIds.length > 0,
  })

  // ── Pending Speaking Recordings ─────────────────
  const { data: pendingSpeaking } = useQuery({
    queryKey: ['trainer-pending-speaking', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const studentIds = students?.map(s => s.id) || []
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('speaking_recordings')
        .select('id, student_id, unit_id, created_at, audio_url, students:student_id(profiles(full_name, display_name, avatar_url))')
        .in('student_id', studentIds)
        .eq('trainer_reviewed', false)
        .order('created_at', { ascending: true })
        .limit(10)
      return data || []
    },
    enabled: (students?.length || 0) > 0,
  })

  // ── Upcoming Classes ────────────────────────────
  const { data: upcomingClasses } = useQuery({
    queryKey: ['trainer-upcoming-classes', currentGroupIds],
    queryFn: async () => {
      if (!currentGroupIds.length) return []
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('classes')
        .select('id, title, topic, date, start_time, end_time, google_meet_link, status, group_id, groups(name)')
        .in('group_id', currentGroupIds)
        .gte('date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(4)
      return data || []
    },
    enabled: currentGroupIds.length > 0,
  })

  // ── Computed stats ──────────────────────────────
  const activeStudents = students?.length || 0
  const pendingCount = (pendingAssignments?.length || 0) + (pendingSpeaking?.length || 0)
  const streaksAtRisk = students?.filter(s => {
    if (!s.current_streak || s.current_streak === 0) return false
    if (!s.last_active_at) return true
    const hoursSince = (Date.now() - new Date(s.last_active_at).getTime()) / (1000 * 60 * 60)
    return hoursSince > 20 // streak will break if no activity soon
  }).length || 0
  const avgXP = activeStudents > 0 ? Math.round(students.reduce((s, st) => s + (st.xp_total || 0), 0) / activeStudents) : 0

  if (!profile) return <DashboardSkeleton />

  return (
    <div className="space-y-6">
      {/* ① GREETING */}
      <motion.div {...stagger(0)}>
        <h1 className="text-page-title">
          {getGreeting()}، <span className="text-gradient">{firstName}</span>
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>لوحة تحكم المدرب</p>
          {groups?.length > 1 && activeGroup && (
            <span className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)' }}>
              {activeGroup.name}
            </span>
          )}
        </div>
      </motion.div>

      {/* ② GROUP SELECTOR (if multi-group) */}
      {groups?.length > 1 && (
        <motion.div {...stagger(1)} className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedGroupId(null)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold font-['Tajawal'] transition-all border"
            style={{
              background: !selectedGroupId ? 'var(--accent-sky-glow)' : 'transparent',
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
                background: selectedGroupId === g.id ? 'var(--accent-sky-glow)' : 'transparent',
                color: selectedGroupId === g.id ? 'var(--accent-sky)' : 'var(--text-tertiary)',
                borderColor: selectedGroupId === g.id ? 'rgba(56,189,248,0.3)' : 'var(--border-subtle)',
              }}
            >
              {g.name}
            </button>
          ))}
        </motion.div>
      )}

      {/* ③ QUICK STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'بانتظار التقييم', value: pendingCount, icon: FileText, accent: pendingCount > 0 ? 'red' : 'sky' },
          { label: 'طلاب نشطين', value: activeStudents, icon: Users, accent: 'emerald' },
          { label: 'سلسلة مهددة', value: streaksAtRisk, icon: Flame, accent: streaksAtRisk > 0 ? 'amber' : 'sky' },
          { label: 'متوسط XP', value: avgXP.toLocaleString('ar-SA'), icon: Zap, accent: 'violet' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            {...stagger(i + 2)}
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${card.accent === 'red' && card.value > 0 ? 'rgba(239,68,68,0.2)' : card.accent === 'amber' && card.value > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{card.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${card.accent}-500/10`}>
                <card.icon size={16} className={`text-${card.accent}-400`} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-['Tajawal']" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={card.value} duration={0.6} /></p>
          </motion.div>
        ))}
      </div>

      {/* ④ PENDING SUBMISSIONS */}
      <ErrorBoundary fallback={<SectionError label="التسليمات" />}>
        <PendingSubmissionsSection
          assignments={pendingAssignments}
          speaking={pendingSpeaking}
          index={6}
        />
      </ErrorBoundary>

      {/* ⑤ STUDENT STATUS TABLE */}
      <ErrorBoundary fallback={<SectionError label="حالة الطلاب" />}>
        <StudentStatusSection students={students} teams={teams} index={7} />
      </ErrorBoundary>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ⑥ UPCOMING CLASSES */}
        <ErrorBoundary fallback={<SectionError label="الحصص" />}>
          <UpcomingClassesSection classes={upcomingClasses} groups={groups} index={8} />
        </ErrorBoundary>

        {/* ⑦ TEAM OVERVIEW */}
        <ErrorBoundary fallback={<SectionError label="الفِرق" />}>
          <TeamOverviewSection students={students} teams={teams} index={9} />
        </ErrorBoundary>
      </div>

      {/* ⑧ QUICK ACTIONS */}
      <motion.div {...stagger(10)}>
        <h3 className="text-[14px] font-bold mb-3 font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>إجراءات سريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/trainer/points', label: 'أضف نقاط', icon: Zap, color: 'amber' },
            { to: '/trainer/assignments', label: 'أسند واجب', icon: PenLine, color: 'sky' },
            { to: '/trainer/student-notes', label: 'أرسل ملاحظة', icon: MessageSquare, color: 'violet' },
            { to: '/trainer/attendance', label: 'سجل حضور', icon: UserCheck, color: 'emerald' },
          ].map(a => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 rounded-xl p-4 transition-all hover:translate-y-[-1px]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${a.color}-500/10`}>
                <a.icon size={16} className={`text-${a.color}-400`} />
              </div>
              <span className="text-[13px] font-medium font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// PENDING SUBMISSIONS SECTION
// ═════════════════════════════════════════════════════
function PendingSubmissionsSection({ assignments, speaking, index }) {
  const navigate = useNavigate()
  const allPending = useMemo(() => {
    const items = []
    ;(assignments || []).forEach(s => {
      items.push({
        id: s.id,
        type: 'assignment',
        subtype: s.assignments?.type || 'custom',
        title: s.assignments?.title || 'واجب',
        studentName: s.students?.profiles?.display_name || s.students?.profiles?.full_name || 'طالب',
        avatar: s.students?.profiles?.avatar_url,
        date: s.submitted_at || s.created_at,
        isLate: s.is_late,
        link: '/trainer/writing',
      })
    })
    ;(speaking || []).forEach(r => {
      items.push({
        id: r.id,
        type: 'speaking',
        subtype: 'speaking',
        title: 'تسجيل تحدث',
        studentName: r.students?.profiles?.display_name || r.students?.profiles?.full_name || 'طالب',
        avatar: r.students?.profiles?.avatar_url,
        date: r.created_at,
        isLate: false,
        link: '/trainer/writing',
      })
    })
    items.sort((a, b) => new Date(a.date) - new Date(b.date))
    return items
  }, [assignments, speaking])

  const TYPE_BADGE = {
    writing: { label: 'كتابة', color: 'rgba(129,140,248,0.15)', text: 'rgb(129,140,248)' },
    speaking: { label: 'تحدث', color: 'rgba(52,211,153,0.15)', text: 'rgb(52,211,153)' },
    reading: { label: 'قراءة', color: 'rgba(251,191,36,0.15)', text: 'rgb(251,191,36)' },
    grammar: { label: 'قواعد', color: 'rgba(56,189,248,0.15)', text: 'rgb(56,189,248)' },
    custom: { label: 'واجب', color: 'rgba(148,163,184,0.15)', text: 'rgb(148,163,184)' },
    vocabulary: { label: 'مفردات', color: 'rgba(168,85,247,0.15)', text: 'rgb(168,85,247)' },
    listening: { label: 'استماع', color: 'rgba(251,146,60,0.15)', text: 'rgb(251,146,60)' },
  }

  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? allPending : allPending.slice(0, 5)

  return (
    <motion.div {...stagger(index)} className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-amber-400" />
          <h3 className="text-[15px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>واجبات تنتظر تصحيح</h3>
          {allPending.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' }}>
              {allPending.length}
            </span>
          )}
        </div>
        {allPending.length > 5 && (
          <button onClick={() => setShowAll(!showAll)} className="text-[12px] font-bold font-['Tajawal']" style={{ color: 'var(--accent-sky)' }}>
            {showAll ? 'أقل' : `عرض الكل (${allPending.length})`}
          </button>
        )}
      </div>

      {allPending.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>ما في واجبات تنتظر — ممتاز!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map(item => {
            const badge = TYPE_BADGE[item.subtype] || TYPE_BADGE.custom
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl p-3.5 transition-all hover:translate-y-[-1px] cursor-pointer"
                style={{ background: 'var(--surface-raised)' }}
                onClick={() => navigate(item.link)}
              >
                <UserAvatar user={{ display_name: item.studentName, avatar_url: item.avatar }} size={36} rounded="full" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>{item.studentName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: badge.color, color: badge.text }}>{badge.label}</span>
                    <span className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{item.title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
                    {item.date ? timeAgo(item.date) : ''}
                  </span>
                  <button
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg font-['Tajawal'] transition-colors hidden sm:block"
                    style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)' }}
                  >
                    صحح الآن
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════
// STUDENT STATUS TABLE/CARDS
// ═════════════════════════════════════════════════════
function StudentStatusSection({ students, teams, index }) {
  const navigate = useNavigate()

  const teamsMap = useMemo(() => {
    const m = {}
    ;(teams || []).forEach(t => { m[t.id] = t })
    return m
  }, [teams])

  const getStatus = (lastActive) => {
    if (!lastActive) return { label: 'غائب', dot: '🔴', color: 'rgb(239,68,68)' }
    const days = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
    if (days < 2) return { label: 'نشط', dot: '🟢', color: 'rgb(52,211,153)' }
    if (days <= 5) return { label: 'خامل', dot: '🟡', color: 'rgb(251,191,36)' }
    return { label: 'غائب', dot: '🔴', color: 'rgb(239,68,68)' }
  }

  if (!students?.length) return null

  return (
    <motion.div {...stagger(index)} className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5 mb-5">
        <Users size={18} className="text-sky-400" />
        <h3 className="text-[15px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>حالة الطلاب</h3>
        <span className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{students.length} طالب</span>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
              <th className="text-right pb-3 font-medium">الاسم</th>
              <th className="text-right pb-3 font-medium">الفريق</th>
              <th className="text-right pb-3 font-medium">السلسلة 🔥</th>
              <th className="text-right pb-3 font-medium">XP</th>
              <th className="text-right pb-3 font-medium">آخر نشاط</th>
              <th className="text-right pb-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const team = s.team_id ? teamsMap[s.team_id] : null
              const status = getStatus(s.last_active_at)
              const streakDanger = s.current_streak > 0 && (!s.last_active_at || (Date.now() - new Date(s.last_active_at).getTime()) / (1000 * 60 * 60) > 20)
              return (
                <tr
                  key={s.id}
                  className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  onClick={() => navigate(`/trainer/student/${s.id}/progress`)}
                  style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={{ display_name: s.profiles?.display_name || s.profiles?.full_name, avatar_url: s.profiles?.avatar_url }} size={30} rounded="full" />
                      <span className="text-[13px] font-medium font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                        {s.profiles?.display_name || s.profiles?.full_name || 'طالب'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    {team ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: team.color || '#38bdf8' }} />
                        <span className="text-[12px] font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>{team.emoji || ''} {team.name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className={`text-[13px] font-bold ${streakDanger ? 'text-red-400' : ''}`} style={streakDanger ? {} : { color: 'var(--text-secondary)' }}>
                      🔥 {s.current_streak || 0}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--accent-sky)' }}>{(s.xp_total || 0).toLocaleString('ar-SA')}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
                      {s.last_active_at ? timeAgo(s.last_active_at) : 'لم يدخل'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-[11px] font-bold font-['Tajawal']" style={{ color: status.color }}>{status.dot} {status.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2.5">
        {students.map(s => {
          const team = s.team_id ? teamsMap[s.team_id] : null
          const status = getStatus(s.last_active_at)
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all hover:translate-y-[-1px]"
              style={{ background: 'var(--surface-raised)' }}
              onClick={() => navigate(`/trainer/student/${s.id}/progress`)}
            >
              <UserAvatar user={{ display_name: s.profiles?.display_name || s.profiles?.full_name, avatar_url: s.profiles?.avatar_url }} size={36} rounded="full" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                  {s.profiles?.display_name || s.profiles?.full_name || 'طالب'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  <span>🔥 {s.current_streak || 0}</span>
                  <span>⚡ {s.xp_total || 0}</span>
                  {team && <span>{team.emoji} {team.name}</span>}
                </div>
              </div>
              <span className="text-sm">{status.dot}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════
// UPCOMING CLASSES
// ═════════════════════════════════════════════════════
function UpcomingClassesSection({ classes, groups, index }) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <motion.div {...stagger(index)} className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5 mb-5">
        <Calendar size={18} className="text-sky-400" />
        <h3 className="text-[15px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>الحصص القادمة</h3>
      </div>

      {!classes?.length ? (
        <div className="text-center py-6">
          <Calendar size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
          <p className="text-[13px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
            {groups?.length ? 'لا توجد حصص قادمة مجدولة' : 'لم يتم إعداد جدول الحصص بعد'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {classes.map(c => {
            const isToday = c.date === today
            const dateObj = new Date(c.date + 'T00:00:00')
            const dayName = getArabicDay(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()])
            return (
              <div
                key={c.id}
                className="rounded-xl p-4 transition-all"
                style={{
                  background: 'var(--surface-raised)',
                  borderRight: isToday ? '3px solid var(--accent-sky)' : '3px solid transparent',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                        {dayName}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)' }}>
                          اليوم
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5 font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
                      {c.start_time ? formatTime(c.start_time) : ''} {c.title ? `— ${c.title}` : ''} {c.topic ? `· ${c.topic}` : ''}
                    </p>
                    {c.groups?.name && (
                      <p className="text-[10px] mt-0.5 font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{c.groups.name}</p>
                    )}
                  </div>
                  {(c.google_meet_link || groups?.find(g => g.id === c.group_id)?.google_meet_link) && (
                    <a
                      href={c.google_meet_link || groups?.find(g => g.id === c.group_id)?.google_meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold font-['Tajawal'] transition-colors"
                      style={{ background: 'rgba(52,211,153,0.1)', color: 'rgb(52,211,153)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={11} />
                      Meet
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════
// TEAM OVERVIEW
// ═════════════════════════════════════════════════════
function TeamOverviewSection({ students, teams, index }) {
  const teamStats = useMemo(() => {
    if (!teams?.length || !students?.length) return []
    return teams.map(team => {
      const members = students.filter(s => s.team_id === team.id)
      const totalXP = members.reduce((sum, s) => sum + (s.xp_total || 0), 0)
      const avgStreak = members.length > 0 ? Math.round(members.reduce((sum, s) => sum + (s.current_streak || 0), 0) / members.length) : 0
      const sorted = [...members].sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0))
      const topStudent = sorted[0]
      const needsSupport = [...members].sort((a, b) => {
        const aActive = a.last_active_at ? new Date(a.last_active_at).getTime() : 0
        const bActive = b.last_active_at ? new Date(b.last_active_at).getTime() : 0
        return aActive - bActive
      })[0]
      return { ...team, members: members.length, totalXP, avgStreak, topStudent, needsSupport }
    }).sort((a, b) => b.totalXP - a.totalXP)
  }, [teams, students])

  if (!teamStats.length) {
    return (
      <motion.div {...stagger(index)} className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 mb-5">
          <Award size={18} className="text-amber-400" />
          <h3 className="text-[15px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>نظرة على الفِرق</h3>
        </div>
        <p className="text-[13px] text-center py-6 font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>لم يتم إعداد الفرق بعد</p>
      </motion.div>
    )
  }

  const maxXP = Math.max(...teamStats.map(t => t.totalXP), 1)

  return (
    <motion.div {...stagger(index)} className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5 mb-5">
        <Award size={18} className="text-amber-400" />
        <h3 className="text-[15px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>نظرة على الفِرق</h3>
      </div>

      <div className="space-y-4">
        {teamStats.map((team, i) => {
          const getName = (s) => s?.profiles?.display_name || s?.profiles?.full_name || 'طالب'
          return (
            <div key={team.id} className="rounded-xl p-4" style={{ background: 'var(--surface-raised)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: team.color || (i === 0 ? '#38bdf8' : '#fbbf24') }} />
                  <span className="text-[14px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>{team.emoji || ''} {team.name}</span>
                  <span className="text-[10px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{team.members} طالب</span>
                </div>
                <span className="text-[14px] font-black" style={{ color: team.color || 'var(--accent-sky)' }}>{team.totalXP.toLocaleString('ar-SA')} XP</span>
              </div>

              {/* XP bar */}
              <div className="h-2 rounded-full mb-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(team.totalXP / maxXP) * 100}%`, background: team.color || '#38bdf8' }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-['Tajawal']">
                <span style={{ color: 'var(--text-tertiary)' }}>
                  🔥 متوسط السلسلة: {team.avgStreak}
                </span>
                <div className="flex gap-3">
                  {team.topStudent && (
                    <span style={{ color: 'rgb(52,211,153)' }}>⬆ {getName(team.topStudent)}</span>
                  )}
                  {team.needsSupport && team.members > 1 && (
                    <span style={{ color: 'rgb(251,191,36)' }}>⚠ {getName(team.needsSupport)}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Dashboard Skeleton ──────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="h-4 w-32 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
      </div>
      <div className="h-64 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }} />
      <div className="h-48 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }} />
    </div>
  )
}
