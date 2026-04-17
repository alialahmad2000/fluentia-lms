import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Users, Clock, Eye, Zap, RefreshCw, Loader2,
  ChevronDown, ChevronUp, BarChart3, Filter,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import ImpersonateButton from '../../components/ImpersonateButton'

// ─── Constants ──────────────────────────────────────────────
const EVENT_LABELS = {
  login: 'سجّل دخول',
  logout: 'سجّل خروج',
  page_view: 'زار صفحة',
  unit_opened: 'فتح مستوى',
  unit_selected: 'اختار وحدة',
  curriculum_unit_view: 'شاهد وحدة',
  tab_switched: 'انتقل لتاب',
  flashcards_started: 'بدأ بطاقات المفردات',
  flashcard_flipped: 'قلب بطاقة',
  flashcards_completed: 'أكمل بطاقات المفردات',
  game_started: 'بدأ لعبة',
  game_completed: 'أكمل لعبة',
  game_abandoned: 'ترك لعبة',
  password_changed: 'غيّر كلمة المرور',
  avatar_changed: 'غيّر الصورة الشخصية',
  profile_updated: 'حدّث الملف الشخصي',
  nav_clicked: 'ضغط على القائمة',
  weekly_task_viewed: 'شاف مهمة أسبوعية',
  weekly_task_completed: 'أكمل مهمة أسبوعية',
  ai_chat_message: 'أرسل رسالة للمساعد الذكي',
  assignment_submit: 'سلّم واجب',
  quiz_start: 'بدأ اختبار',
  quiz_complete: 'أكمل اختبار',
  spelling_complete: 'أكمل تدريب إملاء',
  tab_hidden: 'انتقل لتاب ثاني',
  tab_visible: 'رجع للنظام',
  error_displayed: '⚠️ ظهر خطأ',
  payment_link_click: 'ضغط رابط الدفع',
}

const PAGE_NAMES = {
  '/student': 'الرئيسية',
  '/student/curriculum': 'المنهج',
  '/student/weekly-tasks': 'المهام الأسبوعية',
  '/student/schedule': 'الجدول',
  '/student/recordings': 'التسجيلات',
  '/student/flashcards': 'المفردات',
  '/student/grades': 'الدرجات',
  '/student/ai-chat': 'المساعد الذكي',
  '/student/conversation': 'المحادثة',
  '/student/group-activity': 'نشاط المجموعة',
  '/student/profile': 'حسابي',
  '/student/study-plan': 'خطة الدراسة',
  '/student/assignments': 'الواجبات',
  '/student/verbs': 'الأفعال الشاذة',
  '/student/spelling': 'الإملاء',
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'كل الأحداث' },
  { key: 'login', label: 'تسجيل دخول' },
  { key: 'pages', label: 'صفحات' },
  { key: 'games', label: 'ألعاب' },
  { key: 'vocabulary', label: 'مفردات' },
  { key: 'tasks', label: 'مهام' },
  { key: 'errors', label: 'أخطاء' },
]

const EVENT_FILTER_MAP = {
  login: ['login', 'logout'],
  pages: ['page_view'],
  games: ['game_started', 'game_completed', 'game_abandoned'],
  vocabulary: ['flashcards_started', 'flashcards_completed', 'flashcard_flipped'],
  tasks: ['weekly_task_viewed', 'weekly_task_completed', 'assignment_submit'],
  errors: ['error_displayed'],
}

const DATE_PRESETS = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: '7d', label: '7 أيام' },
  { key: '30d', label: '30 يوم' },
]

function getDateRange(preset) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  switch (preset) {
    case 'yesterday': {
      const ys = new Date(todayStart)
      ys.setDate(ys.getDate() - 1)
      return [ys.toISOString(), todayStart.toISOString()]
    }
    case '7d': {
      const s = new Date(todayStart)
      s.setDate(s.getDate() - 7)
      return [s.toISOString(), todayEnd.toISOString()]
    }
    case '30d': {
      const s = new Date(todayStart)
      s.setDate(s.getDate() - 30)
      return [s.toISOString(), todayEnd.toISOString()]
    }
    default: // today
      return [todayStart.toISOString(), todayEnd.toISOString()]
  }
}

function timeAgoAr(dateStr) {
  if (!dateStr) return 'لم يدخل'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'الآن'
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `قبل ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'أمس'
  return `قبل ${days} يوم`
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function translatePage(path) {
  if (!path) return ''
  const match = Object.keys(PAGE_NAMES).find(k => path.startsWith(k))
  return match ? PAGE_NAMES[match] : path
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, suffix, color, pulse }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative" style={{ background: `${color}15` }}>
          <Icon size={16} style={{ color }} />
          {pulse && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: '#4ade80' }}>
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: '#4ade80', opacity: 0.5 }} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] truncate">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold text-[var(--text-primary)]" dir="ltr">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
export default function AdminAnalytics() {
  const queryClient = useQueryClient()
  const [datePreset, setDatePreset] = useState('today')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [studentFilter, setStudentFilter] = useState('all')
  const [eventFilter, setEventFilter] = useState('all')
  const [logLimit, setLogLimit] = useState(50)
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const refreshRef = useRef(null)

  const [dateStart, dateEnd] = getDateRange(datePreset)

  // ── Auto-refresh ──────────────────────────────────────────
  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-live'] })
      }, 15000)
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [autoRefresh, queryClient])

  // ── Live data (online users) ──────────────────────────────
  const { data: liveData, isFetching: liveFetching } = useQuery({
    queryKey: ['admin-live'],
    queryFn: async () => {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const { data: activeSessions, error } = await supabase
        .from('user_sessions')
        .select('user_id, session_id, last_seen_at, pages_visited, started_at')
        .eq('is_active', true)
        .gte('last_seen_at', twoMinAgo)

      if (error || !activeSessions?.length) return { activeUsers: [], latestPages: {} }

      // Get profiles for active users
      const userIds = [...new Set(activeSessions.map(s => s.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      const profileMap = {}
      for (const p of (profiles || [])) profileMap[p.id] = p

      // Get latest page_view for each active user
      const { data: recentPages } = await supabase
        .from('analytics_events')
        .select('user_id, properties, created_at')
        .in('user_id', userIds)
        .eq('event', 'page_view')
        .order('created_at', { ascending: false })
        .limit(userIds.length * 2)

      const latestPages = {}
      for (const p of (recentPages || [])) {
        if (!latestPages[p.user_id]) latestPages[p.user_id] = p
      }

      const activeUsers = activeSessions.map(s => ({
        ...s,
        profile: profileMap[s.user_id],
        latestPage: latestPages[s.user_id],
      }))

      // Deduplicate by user_id (keep most recent)
      const seen = new Set()
      const deduped = []
      for (const u of activeUsers.sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at))) {
        if (!seen.has(u.user_id)) { seen.add(u.user_id); deduped.push(u) }
      }

      return { activeUsers: deduped }
    },
    refetchInterval: autoRefresh ? 15000 : false,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  })

  // ── Stats data ────────────────────────────────────────────
  const { data: statsData, isFetching: statsFetching } = useQuery({
    queryKey: ['admin-analytics-stats', dateStart, dateEnd],
    queryFn: async () => {
      const [loginRes, pageRes, sessionsRes] = await Promise.all([
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'login').gte('created_at', dateStart).lte('created_at', dateEnd),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'page_view').gte('created_at', dateStart).lte('created_at', dateEnd),
        supabase.from('user_sessions').select('started_at, ended_at').gte('started_at', dateStart).lte('started_at', dateEnd).not('ended_at', 'is', null),
      ])

      // Compute avg session duration from started_at/ended_at
      const sessions = sessionsRes.data || []
      let totalSec = 0
      for (const s of sessions) {
        if (s.started_at && s.ended_at) totalSec += (new Date(s.ended_at) - new Date(s.started_at)) / 1000
      }
      const avgMin = sessions.length > 0 ? Math.round(totalSec / sessions.length / 60) : 0

      return {
        loginCount: loginRes.count || 0,
        pageCount: pageRes.count || 0,
        avgSessionMin: avgMin,
      }
    },
    staleTime: 30000,
  })

  // ── Hourly chart data ─────────────────────────────────────
  const { data: hourlyData } = useQuery({
    queryKey: ['admin-analytics-hourly', dateStart, dateEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('created_at')
        .eq('event', 'login')
        .gte('created_at', dateStart)
        .lte('created_at', dateEnd)

      const hourly = new Array(24).fill(0)
      for (const e of (data || [])) {
        const h = new Date(e.created_at).getHours()
        hourly[h]++
      }
      return hourly.map((count, hour) => ({ hour: `${hour}:00`, count }))
    },
    staleTime: 60000,
  })

  // ── Activity log ──────────────────────────────────────────
  const { data: logData, isFetching: logFetching } = useQuery({
    queryKey: ['admin-analytics-log', dateStart, dateEnd, studentFilter, eventFilter, logLimit],
    queryFn: async () => {
      let query = supabase
        .from('analytics_events')
        .select('id, user_id, event, properties, created_at, page_path')
        .gte('created_at', dateStart)
        .lte('created_at', dateEnd)
        .order('created_at', { ascending: false })
        .limit(logLimit)

      if (studentFilter !== 'all') query = query.eq('user_id', studentFilter)
      if (eventFilter !== 'all' && EVENT_FILTER_MAP[eventFilter]) {
        query = query.in('event', EVENT_FILTER_MAP[eventFilter])
      }

      const { data, error } = await query

      // Get profile names for all users in log
      const userIds = [...new Set((data || []).map(e => e.user_id).filter(Boolean))]
      let profileMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
        for (const p of (profiles || [])) profileMap[p.id] = p.full_name
      }

      return { events: data || [], profileMap }
    },
    refetchInterval: autoRefresh ? 15000 : false,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  })

  // ── Per-student summary ───────────────────────────────────
  const { data: studentSummary } = useQuery({
    queryKey: ['admin-analytics-students', dateStart, dateEnd],
    queryFn: async () => {
      // Get all active students
      const { data: students, error } = await supabase
        .from('profiles')
        .select('id, full_name, last_active_at, students!inner(status, academic_level, groups(code))')
        .eq('role', 'student')
        .eq('students.status', 'active')

      if (error || !students) return []

      // Get all events for these students in range
      const studentIds = students.map(s => s.id)
      const [eventsRes, sessionsRes] = await Promise.all([
        supabase.from('analytics_events').select('user_id, event').in('user_id', studentIds).gte('created_at', dateStart).lte('created_at', dateEnd),
        supabase.from('user_sessions').select('user_id, started_at, ended_at, is_active, last_seen_at').in('user_id', studentIds).gte('started_at', dateStart).lte('started_at', dateEnd),
      ])

      const events = eventsRes.data || []
      const sessions = sessionsRes.data || []
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

      return students.map(student => {
        const myEvents = events.filter(e => e.user_id === student.id)
        const mySessions = sessions.filter(s => s.user_id === student.id)
        const loginCount = myEvents.filter(e => e.event === 'login').length
        const pageCount = myEvents.filter(e => e.event === 'page_view').length
        let totalSec = 0
        for (const s of mySessions) {
          if (s.started_at && s.ended_at) totalSec += (new Date(s.ended_at) - new Date(s.started_at)) / 1000
        }
        const isOnline = mySessions.some(s => s.is_active && s.last_seen_at > twoMinAgo)
        const group = student.students?.[0]?.groups?.code || student.students?.groups?.code || ''
        const level = student.students?.[0]?.academic_level || student.students?.academic_level || ''

        return {
          id: student.id,
          name: student.full_name,
          lastActive: student.last_active_at,
          loginCount,
          pageCount,
          totalMinutes: Math.round(totalSec / 60),
          isOnline,
          group,
          level,
        }
      })
    },
    staleTime: 30000,
  })

  // ── Student detail (expanded row) ─────────────────────────
  const { data: studentDetail } = useQuery({
    queryKey: ['admin-analytics-student-detail', expandedStudent, dateStart, dateEnd],
    queryFn: async () => {
      if (!expandedStudent) return null
      const [eventsRes, sessionsRes] = await Promise.all([
        supabase.from('analytics_events').select('event, properties, created_at, page_path').eq('user_id', expandedStudent).gte('created_at', dateStart).lte('created_at', dateEnd).order('created_at', { ascending: false }).limit(100),
        supabase.from('user_sessions').select('started_at, ended_at, pages_visited, device, browser').eq('user_id', expandedStudent).gte('started_at', dateStart).lte('started_at', dateEnd).order('started_at', { ascending: false }),
      ])
      return { events: eventsRes.data || [], sessions: sessionsRes.data || [] }
    },
    enabled: !!expandedStudent,
    staleTime: 15000,
  })

  // ── Sorted student list ───────────────────────────────────
  const sortedStudents = useMemo(() => {
    if (!studentSummary) return []
    const list = [...studentSummary]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || '', 'ar'); break
        case 'logins': cmp = a.loginCount - b.loginCount; break
        case 'time': cmp = a.totalMinutes - b.totalMinutes; break
        case 'pages': cmp = a.pageCount - b.pageCount; break
        case 'lastActive': cmp = new Date(a.lastActive || 0) - new Date(b.lastActive || 0); break
        default: break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [studentSummary, sortBy, sortDir])

  // ── Student list for filter dropdown ──────────────────────
  const studentList = useMemo(() => {
    if (!studentSummary) return []
    return studentSummary.map(s => ({ id: s.id, name: s.name })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
  }, [studentSummary])

  const handleSort = useCallback((col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }, [sortBy])

  const onlineCount = liveData?.activeUsers?.length || 0
  const isFetching = liveFetching || statsFetching

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 font-['Tajawal']">
            <BarChart3 size={22} className="text-sky-400" />
            تحليلات الاستخدام
          </h1>
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] mt-1">تتبع نشاط الطلاب لحظة بلحظة</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date presets */}
          <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            {DATE_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key)}
                className={`px-3 h-9 text-xs font-bold transition-colors font-['Tajawal'] ${
                  datePreset === p.key ? 'bg-sky-500/15 text-sky-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(r => !r)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${
              autoRefresh ? 'border-sky-500/30 text-sky-400 bg-sky-500/10' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
            }`}
            title={autoRefresh ? 'التحديث التلقائي مفعّل' : 'التحديث التلقائي معطّل'}
          >
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Eye} label="أونلاين الحين" value={onlineCount} color="#4ade80" pulse={onlineCount > 0} />
        <StatCard icon={Users} label="تسجيلات الدخول" value={statsData?.loginCount || 0} color="#38bdf8" />
        <StatCard icon={Clock} label="متوسط الجلسة" value={statsData?.avgSessionMin || 0} suffix="د" color="#a78bfa" />
        <StatCard icon={Activity} label="صفحات" value={statsData?.pageCount || 0} color="#fbbf24" />
      </div>

      {/* Live Online Panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
          </span>
          أونلاين الحين
          <span className="text-xs text-[var(--text-muted)] font-normal mr-1">({onlineCount})</span>
        </h3>
        {onlineCount === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4 font-['Tajawal']">لا يوجد طلاب أونلاين حالياً</p>
        ) : (
          <div className="space-y-2">
            {liveData.activeUsers.map(u => {
              const pagePath = u.latestPage?.properties?.page || ''
              const pageName = translatePage(pagePath) || pagePath
              const minsSince = u.latestPage?.created_at ? Math.max(1, Math.round((Date.now() - new Date(u.latestPage.created_at).getTime()) / 60000)) : 0
              return (
                <div key={u.user_id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-[var(--text-primary)] font-['Tajawal'] min-w-[100px]">{u.profile?.full_name || 'مجهول'}</span>
                  <ImpersonateButton userId={u.user_id} role="student" name={u.profile?.full_name || 'طالب'} />
                  <span className="text-xs text-[var(--text-muted)] flex-1 truncate font-['Tajawal']">{pageName || '—'}</span>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0" dir="ltr">{minsSince > 0 ? `${minsSince} د` : ''}</span>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Hourly Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-sky-400" />
          تسجيلات الدخول بالساعة
        </h3>
        {hourlyData?.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, direction: 'rtl' }}
                formatter={(value) => [`${value} دخول`, '']}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-8 font-['Tajawal']">لا توجد بيانات</p>
        )}
      </motion.div>

      {/* Activity Log */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            سجل النشاط
            {logFetching && <Loader2 size={12} className="animate-spin text-sky-400" />}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Student filter */}
            <select
              value={studentFilter}
              onChange={e => setStudentFilter(e.target.value)}
              className="h-8 rounded-lg px-2 text-xs border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] font-['Tajawal']"
            >
              <option value="all">كل الطالبات</option>
              {studentList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {/* Event filter */}
            <select
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              className="h-8 rounded-lg px-2 text-xs border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] font-['Tajawal']"
            >
              {FILTER_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {(logData?.events || []).length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-6 font-['Tajawal']">لا توجد أحداث في هذه الفترة</p>
          ) : (
            logData.events.map(e => {
              const label = EVENT_LABELS[e.event] || e.event
              const name = logData.profileMap?.[e.user_id] || 'مجهول'
              const detail = e.event === 'page_view' ? translatePage(e.properties?.page || e.page_path)
                : e.event === 'game_completed' ? `النتيجة: ${e.properties?.score || 0}/${e.properties?.total || 0}`
                : e.event === 'tab_switched' ? (e.properties?.tab_name || '')
                : e.event === 'weekly_task_completed' ? (e.properties?.task_type || '')
                : ''
              return (
                <div key={e.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)] text-xs">
                  <span className="text-[var(--text-muted)] flex-shrink-0 w-16 text-left" dir="ltr">{formatTime(e.created_at)}</span>
                  <span className="text-[var(--text-primary)] font-medium font-['Tajawal'] min-w-[80px] truncate">{name}</span>
                  <span className="text-[var(--text-secondary)] font-['Tajawal'] flex-1 truncate">{label}</span>
                  {detail && <span className="text-[var(--text-muted)] font-['Tajawal'] truncate max-w-[120px]">{detail}</span>}
                </div>
              )
            })
          )}
        </div>
        {(logData?.events?.length || 0) >= logLimit && (
          <button
            onClick={() => setLogLimit(l => l + 50)}
            className="w-full mt-3 py-2 text-xs text-sky-400 hover:text-sky-300 font-['Tajawal'] font-bold transition-colors"
          >
            تحميل المزيد...
          </button>
        )}
      </motion.div>

      {/* Per-Student Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
          <Users size={16} className="text-violet-400" />
          نشاط كل طالبة
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                {[
                  { key: 'name', label: 'الاسم' },
                  { key: 'logins', label: 'الدخول' },
                  { key: 'time', label: 'المدة' },
                  { key: 'pages', label: 'الصفحات' },
                  { key: 'lastActive', label: 'آخر نشاط' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="py-2 px-3 text-right font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors font-['Tajawal'] whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                    </span>
                  </th>
                ))}
                <th className="py-2 px-3 text-right font-bold font-['Tajawal']">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((s, i) => (
                <Fragment key={s.id}>
                  <tr
                    onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}
                    className={`border-b border-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors ${
                      i % 2 === 0 ? '' : 'bg-[rgba(255,255,255,0.02)]'
                    }`}
                  >
                    <td className="py-3 px-3 font-medium text-[var(--text-primary)] font-['Tajawal'] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {expandedStudent === s.id ? <ChevronUp size={12} /> : <ChevronDown size={12} className="text-[var(--text-muted)]" />}
                        {s.name}
                        {s.group && <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">{s.group}</span>}
                        <ImpersonateButton userId={s.id} role="student" name={s.name} />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]" dir="ltr">{s.loginCount}</td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]" dir="ltr">{s.totalMinutes} د</td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]" dir="ltr">{s.pageCount}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)] font-['Tajawal'] whitespace-nowrap">{timeAgoAr(s.lastActive)}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.isOnline ? 'bg-green-500/10 text-green-400' : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.isOnline ? 'bg-green-400' : 'bg-slate-500'}`} />
                        {s.isOnline ? 'أونلاين' : 'أوفلاين'}
                      </span>
                    </td>
                  </tr>
                  {/* Expanded detail */}
                  {expandedStudent === s.id && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <AnimatePresence>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 py-4 overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                          >
                            {!studentDetail ? (
                              <div className="flex items-center justify-center py-4"><Loader2 size={16} className="animate-spin text-sky-400" /></div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Recent events */}
                                <div>
                                  <h4 className="text-xs font-bold text-[var(--text-primary)] font-['Tajawal'] mb-2">آخر الأحداث</h4>
                                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                    {studentDetail.events.slice(0, 20).map((e, i) => (
                                      <div key={i} className="flex items-center gap-2 text-[11px] py-1">
                                        <span className="text-[var(--text-muted)] w-14 text-left flex-shrink-0" dir="ltr">{formatTime(e.created_at)}</span>
                                        <span className="text-[var(--text-secondary)] font-['Tajawal']">{EVENT_LABELS[e.event] || e.event}</span>
                                      </div>
                                    ))}
                                    {studentDetail.events.length === 0 && <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal']">لا توجد أحداث</p>}
                                  </div>
                                </div>
                                {/* Sessions */}
                                <div>
                                  <h4 className="text-xs font-bold text-[var(--text-primary)] font-['Tajawal'] mb-2">الجلسات</h4>
                                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                    {studentDetail.sessions.map((sess, i) => {
                                      const dur = sess.started_at && sess.ended_at ? Math.round((new Date(sess.ended_at) - new Date(sess.started_at)) / 60000) : 0
                                      return (
                                        <div key={i} className="flex items-center gap-2 text-[11px] py-1">
                                          <span className="text-[var(--text-muted)] w-14 text-left flex-shrink-0" dir="ltr">{formatTime(sess.started_at)}</span>
                                          <span className="text-[var(--text-secondary)]">{dur} د</span>
                                          <span className="text-[var(--text-muted)]">· {sess.pages_visited || 0} صفحة</span>
                                          <span className="text-[var(--text-muted)]">· {sess.device || '—'}</span>
                                        </div>
                                      )
                                    })}
                                    {studentDetail.sessions.length === 0 && <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal']">لا توجد جلسات</p>}
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {sortedStudents.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-6 font-['Tajawal']">لا يوجد طلاب نشطين</p>
        )}
      </motion.div>
    </div>
  )
}
