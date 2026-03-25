import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Clock, Monitor, Smartphone, Tablet, CalendarDays,
  BookOpen, FileText, CheckCircle2, XCircle, AlertTriangle,
  Activity, TrendingUp, Filter, ChevronDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import UserAvatar from '../../components/common/UserAvatar'

// ─── Helpers ────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return 'غير معروف'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `قبل ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `قبل ${days} يوم`
  return new Date(date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
}

function getActivityStatus(lastActive) {
  if (!lastActive) return { label: 'غير نشط', color: 'var(--accent-rose)', dot: '🔴' }
  const days = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
  if (days < 1) return { label: 'نشط', color: 'var(--accent-emerald)', dot: '🟢' }
  if (days < 3) return { label: 'قليل النشاط', color: 'var(--accent-amber)', dot: '🟡' }
  return { label: 'غير نشط', color: 'var(--accent-rose)', dot: '🔴' }
}

const DEVICE_ICONS = { mobile: Smartphone, tablet: Tablet, desktop: Monitor }
const PACKAGE_LABELS = { asas: 'أساس', talaqa: 'طلاقة', tamayuz: 'تميّز', ielts: 'IELTS' }

const EVENT_LABELS = {
  login: 'دخل النظام',
  logout: 'خرج من النظام',
  vocab_reviewed: 'راجع مفردات',
  flashcard_completed: 'أنهى البطاقات التعليمية',
  game_played: 'لعب لعبة',
  game_score: 'نتيجة لعبة',
  assignment_submitted: 'سلّم واجب',
  assignment_viewed: 'شاهد واجب',
  weekly_task_completed: 'أكمل مهمة أسبوعية',
  recording_listened: 'استمع لتسجيل',
  curriculum_unit_opened: 'فتح وحدة',
  schedule_viewed: 'شاهد الجدول',
}

// ─── Component ──────────────────────────────────────────────
export default function StudentProgressDetail() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { profile: currentUser } = useAuthStore()

  const [student, setStudent] = useState(null)
  const [sessions, setSessions] = useState([])
  const [events, setEvents] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [weeklyTasks, setWeeklyTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [eventsPage, setEventsPage] = useState(0)
  const [eventFilter, setEventFilter] = useState('all')

  useEffect(() => {
    let isMounted = true

    async function load() {
      // Student profile + student data
      const { data: prof } = await supabase
        .from('profiles')
        .select('*, students(*)')
        .eq('id', studentId)
        .single()

      // Sessions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
      const { data: sessionData } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', studentId)
        .gte('started_at', thirtyDaysAgo)
        .order('started_at', { ascending: false })

      // Activity events (last 100)
      const { data: eventData } = await supabase
        .from('activity_events')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(100)

      // Submissions
      const { data: subData } = await supabase
        .from('submissions')
        .select('*, assignments(title, type)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50)

      // Weekly tasks
      const { data: taskData } = await supabase
        .from('student_weekly_tasks')
        .select('*, weekly_tasks(title, type)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (isMounted) {
        setStudent(prof)
        setSessions(sessionData || [])
        setEvents(eventData || [])
        setSubmissions(subData || [])
        setWeeklyTasks(taskData || [])
        setLoading(false)
      }
    }

    load()
    return () => { isMounted = false }
  }, [studentId])

  // ── Computed stats ────────────────────────────────────────
  const stats = useMemo(() => {
    if (!sessions.length) return {
      avgDaily: 0, weekTotal: 0, monthTotal: 0,
      pagestoday: 0, lastLogin: null, devices: [],
    }

    const now = Date.now()
    const todaySessions = sessions.filter(s => new Date(s.started_at).toDateString() === new Date().toDateString())
    const weekSessions = sessions.filter(s => now - new Date(s.started_at).getTime() < 7 * 86400000)
    const monthSessions = sessions

    const monthMins = monthSessions.reduce((sum, s) => {
      if (s.duration_minutes) return sum + s.duration_minutes
      if (s.ended_at) return sum + Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000)
      return sum
    }, 0)

    const weekMins = weekSessions.reduce((sum, s) => {
      if (s.duration_minutes) return sum + s.duration_minutes
      if (s.ended_at) return sum + Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000)
      return sum
    }, 0)

    const daysActive = new Set(sessions.map(s => new Date(s.started_at).toDateString())).size
    const avgDaily = daysActive > 0 ? Math.round(monthMins / daysActive) : 0

    const devices = [...new Set(sessions.map(s => s.device).filter(Boolean))]
    const pagesToday = todaySessions.reduce((sum, s) => sum + (s.pages_visited || 0), 0)

    return {
      avgDaily, weekTotal: weekMins, monthTotal: monthMins,
      pagesToday, lastLogin: sessions[0]?.started_at, devices,
    }
  }, [sessions])

  // ── Daily usage chart data (last 30 days) ─────────────────
  const dailyChartData = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toDateString()
      const label = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'numeric' })
      const daySessions = sessions.filter(s => new Date(s.started_at).toDateString() === key)
      const mins = daySessions.reduce((sum, s) => {
        if (s.duration_minutes) return sum + s.duration_minutes
        if (s.ended_at) return sum + Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000)
        return sum
      }, 0)
      days.push({ name: label, minutes: mins })
    }
    return days
  }, [sessions])

  // ── Weekly task completion chart ──────────────────────────
  const weeklyTaskChart = useMemo(() => {
    const weeks = {}
    weeklyTasks.forEach(t => {
      const d = new Date(t.created_at)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
      if (!weeks[key]) weeks[key] = { total: 0, completed: 0 }
      weeks[key].total++
      if (t.status === 'completed') weeks[key].completed++
    })
    return Object.entries(weeks).map(([name, v]) => ({
      name, rate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    })).slice(-8)
  }, [weeklyTasks])

  // ── Filtered events ───────────────────────────────────────
  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events
    return events.filter(e => e.event_type === eventFilter)
  }, [events, eventFilter])

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-20" dir="rtl">
        <p style={{ color: 'var(--text-secondary)' }}>الطالب غير موجود</p>
      </div>
    )
  }

  const studentInfo = student.students?.[0] || student.students || {}
  const actStatus = getActivityStatus(studentInfo.last_active_at)

  const TABS = [
    { key: 'summary', label: 'ملخص النشاط' },
    { key: 'tasks', label: 'المهام والواجبات' },
    { key: 'activity', label: 'سجل النشاط' },
    { key: 'chart', label: 'الرسم البياني' },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium min-h-[44px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowRight size={16} />
        رجوع
      </button>

      {/* Student Header Card */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-4">
          <UserAvatar user={student} size={56} rounded="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {student.display_name || student.full_name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent-sky-glow, rgba(56,189,248,0.12))', color: 'var(--accent-sky)' }}
              >
                {PACKAGE_LABELS[studentInfo.package] || 'أساس'}
              </span>
              {studentInfo.academic_level && (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  المستوى {studentInfo.academic_level}
                </span>
              )}
              <span className="text-xs" style={{ color: actStatus.color }}>
                {actStatus.dot} {actStatus.label}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              آخر نشاط: {timeAgo(studentInfo.last_active_at)} · عضو منذ {new Date(studentInfo.enrollment_date || student.created_at).toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Clock} label="الوقت اليومي" value={`${stats.avgDaily} د/يوم`} color="sky" />
        <StatCard icon={TrendingUp} label="هذا الأسبوع" value={`${stats.weekTotal} دقيقة`} color="emerald" />
        <StatCard icon={CalendarDays} label="هذا الشهر" value={`${stats.monthTotal} دقيقة`} color="violet" />
        <StatCard icon={BookOpen} label="صفحات اليوم" value={`${stats.pagesToday}`} color="amber" />
        <StatCard icon={Clock} label="آخر دخول" value={stats.lastLogin ? timeAgo(stats.lastLogin) : 'لا يوجد'} color="sky" />
        <StatCard
          icon={Monitor}
          label="الأجهزة"
          value={stats.devices.length > 0 ? stats.devices.map(d => d === 'mobile' ? 'جوال' : d === 'tablet' ? 'تابلت' : 'كمبيوتر').join('، ') : 'لا يوجد'}
          color="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-4 px-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px]"
            style={{
              background: activeTab === tab.key ? 'var(--accent-sky-glow, rgba(56,189,248,0.12))' : 'transparent',
              color: activeTab === tab.key ? 'var(--accent-sky)' : 'var(--text-secondary)',
              border: activeTab === tab.key ? '1px solid var(--accent-sky)30' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {/* Assignments summary */}
          <SectionCard title="الواجبات" icon={FileText}>
            {submissions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>لا توجد واجبات مسلّمة</p>
            ) : (
              <div className="space-y-2">
                {submissions.slice(0, 5).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {sub.assignments?.title || 'واجب'}
                      </span>
                      <span className="text-xs mr-2" style={{ color: 'var(--text-tertiary)' }}>
                        {sub.assignments?.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sub.grade != null && (
                        <span className="text-xs font-bold" style={{ color: 'var(--accent-sky)' }}>{sub.grade}٪</span>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: sub.status === 'graded' ? 'var(--accent-emerald-glow, rgba(16,185,129,0.12))' : 'var(--accent-amber-glow, rgba(245,158,11,0.1))',
                          color: sub.status === 'graded' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        }}
                      >
                        {sub.status === 'graded' ? 'مُصحح' : sub.status === 'submitted' ? 'مسلّم' : 'متأخر'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Weekly tasks summary */}
          <SectionCard title="المهام الأسبوعية" icon={CheckCircle2}>
            {weeklyTasks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>لا توجد مهام</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    أكمل {weeklyTasks.filter(t => t.status === 'completed').length} من {weeklyTasks.length} مهمة
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-overlay)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${weeklyTasks.length > 0 ? Math.round((weeklyTasks.filter(t => t.status === 'completed').length / weeklyTasks.length) * 100) : 0}%`,
                      background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-sky))',
                    }}
                  />
                </div>
              </>
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Assignments list */}
          <SectionCard title="جميع الواجبات" icon={FileText}>
            {submissions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>لا توجد واجبات</p>
            ) : (
              <div className="space-y-2">
                {submissions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{sub.assignments?.title || 'واجب'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(sub.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sub.grade != null && (
                        <span className="text-xs font-bold" style={{ color: 'var(--accent-sky)' }}>{sub.grade}٪</span>
                      )}
                      <StatusBadge status={sub.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Weekly task completion chart */}
          {weeklyTaskChart.length > 0 && (
            <SectionCard title="معدل إنجاز المهام الأسبوعية" icon={TrendingUp}>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={weeklyTaskChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 12, fontSize: 12 }}
                      formatter={(v) => [`${v}٪`, 'نسبة الإنجاز']}
                    />
                    <Line type="monotone" dataKey="rate" stroke="var(--accent-emerald)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {['all', 'login', 'assignment_submitted', 'weekly_task_completed', 'vocab_reviewed', 'game_played'].map(f => (
              <button
                key={f}
                onClick={() => { setEventFilter(f); setEventsPage(0) }}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px]"
                style={{
                  background: eventFilter === f ? 'var(--accent-sky-glow, rgba(56,189,248,0.12))' : 'var(--surface-overlay)',
                  color: eventFilter === f ? 'var(--accent-sky)' : 'var(--text-secondary)',
                }}
              >
                {f === 'all' ? 'الكل' : EVENT_LABELS[f] || f}
              </button>
            ))}
          </div>

          {/* Events list */}
          <SectionCard title="سجل النشاط" icon={Activity}>
            {filteredEvents.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>لا يوجد نشاط مسجّل</p>
            ) : (
              <div className="space-y-1">
                {filteredEvents.slice(0, (eventsPage + 1) * 20).map(ev => (
                  <div key={ev.id} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {EVENT_LABELS[ev.event_type] || ev.event_type}
                      {ev.event_data?.score != null && ` — ${ev.event_data.score}٪`}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {timeAgo(ev.created_at)}
                    </span>
                  </div>
                ))}
                {filteredEvents.length > (eventsPage + 1) * 20 && (
                  <button
                    onClick={() => setEventsPage(p => p + 1)}
                    className="w-full py-3 text-sm font-medium text-center min-h-[44px]"
                    style={{ color: 'var(--accent-sky)' }}
                  >
                    تحميل المزيد
                  </button>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="space-y-4">
          <SectionCard title="الاستخدام اليومي (آخر ٣٠ يوم)" icon={TrendingUp}>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 12, fontSize: 12, direction: 'rtl' }}
                    formatter={(v) => [`${v} دقيقة`, 'وقت الاستخدام']}
                  />
                  <Bar dataKey="minutes" fill="var(--accent-sky)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Insights */}
            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {(() => {
                const maxDay = dailyChartData.reduce((max, d) => d.minutes > max.minutes ? d : max, { minutes: 0 })
                const avg = Math.round(dailyChartData.reduce((s, d) => s + d.minutes, 0) / 30)
                return (
                  <>
                    <span>أكثر يوم نشاط: {maxDay.name} ({maxDay.minutes} د)</span>
                    <span>·</span>
                    <span>متوسط الاستخدام: {avg} دقيقة/يوم</span>
                  </>
                )
              })()}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    sky: { bg: 'var(--accent-sky-glow, rgba(56,189,248,0.12))', fg: 'var(--accent-sky)' },
    emerald: { bg: 'var(--accent-emerald-glow, rgba(16,185,129,0.12))', fg: 'var(--accent-emerald)' },
    violet: { bg: 'var(--accent-violet-glow, rgba(139,92,246,0.12))', fg: 'var(--accent-violet)' },
    amber: { bg: 'var(--accent-amber-glow, rgba(245,158,11,0.1))', fg: 'var(--accent-amber)' },
  }
  const c = colors[color] || colors.sky

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: c.bg }}>
        <Icon size={16} style={{ color: c.fg }} />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: 'var(--accent-sky)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    graded: { label: 'مُصحح', bg: 'var(--accent-emerald-glow, rgba(16,185,129,0.12))', color: 'var(--accent-emerald)' },
    submitted: { label: 'مسلّم', bg: 'var(--accent-sky-glow, rgba(56,189,248,0.12))', color: 'var(--accent-sky)' },
    late: { label: 'متأخر', bg: 'var(--accent-rose-glow, rgba(244,63,94,0.12))', color: 'var(--accent-rose)' },
    pending: { label: 'قيد الانتظار', bg: 'var(--accent-amber-glow, rgba(245,158,11,0.1))', color: 'var(--accent-amber)' },
  }
  const c = config[status] || config.pending
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  )
}
