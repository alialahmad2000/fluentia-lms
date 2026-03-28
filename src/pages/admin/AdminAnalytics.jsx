import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity, Users, Clock, Eye, Zap, Smartphone, Monitor, Globe,
  TrendingUp, BarChart3, MousePointerClick, ArrowUpRight, ArrowDownRight,
  CalendarDays, RefreshCw, Loader2, Flame, BookOpen,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Date helpers ────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function formatDateAr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, suffix, color, trend, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl p-4"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] truncate">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-[var(--text-primary)]" dir="ltr">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
            {trend != null && trend !== 0 && (
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Mini Bar Chart ──────────────────────────────────────────
function MiniBarChart({ data, labels, color = '#38bdf8', height = 96 }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1" style={{ height }} dir="ltr">
      {data.map((val, i) => {
        const h = Math.max((val / max) * 100, 3)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t transition-all duration-300"
              style={{
                height: `${h}%`,
                background: i === data.length - 1 ? color : `${color}40`,
                minHeight: '2px',
              }}
              title={`${labels?.[i] || i}: ${val}`}
            />
            {labels && i % Math.ceil(data.length / 7) === 0 && (
              <span className="text-[9px] text-[var(--text-muted)] truncate max-w-full">{labels[i]}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Donut Chart ─────────────────────────────────────────────
function DonutChart({ segments, size = 100 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null
  const r = 36
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * c
        const o = offset
        offset += dash
        return (
          <circle
            key={i}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-o}
            transform="rotate(-90 50 50)"
            className="transition-all duration-500"
          />
        )
      })}
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" fontSize="18" fontWeight="bold">
        {total.toLocaleString()}
      </text>
    </svg>
  )
}

// ─── Top Pages Table ─────────────────────────────────────────
function TopPagesTable({ pages }) {
  if (!pages?.length) return <p className="text-sm text-[var(--text-muted)] text-center py-4">لا توجد بيانات</p>
  const max = pages[0]?.count || 1
  return (
    <div className="space-y-2">
      {pages.map((p, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] w-5 text-center">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-primary)] truncate font-['Tajawal']">{p.title || p.path}</span>
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0 mr-2" dir="ltr">{p.count.toLocaleString()}</span>
            </div>
            <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)]">
              <div className="h-full rounded-full bg-sky-500/50 transition-all" style={{ width: `${(p.count / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Event Type Table ────────────────────────────────────────
const EVENT_LABELS = {
  page_view: 'مشاهدة صفحة',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  assignment_submit: 'تسليم واجب',
  quiz_start: 'بدء اختبار',
  quiz_complete: 'إنهاء اختبار',
  spelling_complete: 'تدريب إملاء',
  curriculum_unit_view: 'مشاهدة وحدة',
  payment_link_click: 'ضغط رابط الدفع',
  tab_hidden: 'إخفاء التبويب',
  tab_visible: 'إظهار التبويب',
}

const EVENT_COLORS = {
  page_view: '#38bdf8',
  login: '#34d399',
  assignment_submit: '#a78bfa',
  quiz_complete: '#fbbf24',
  spelling_complete: '#fb7185',
  curriculum_unit_view: '#6366f1',
  payment_link_click: '#f97316',
}

// ═══════════════════════════════════════════════════════════════
// ─── Main Component ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function AdminAnalytics() {
  const [range, setRange] = useState(7) // 7, 14, 30
  const today = daysAgo(0)
  const rangeStart = daysAgo(range)
  const prevRangeStart = daysAgo(range * 2)

  // ── Fetch analytics data ───────────────────────────────────
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-analytics', range],
    queryFn: async () => {
      const startISO = `${rangeStart}T00:00:00Z`
      const endISO = `${today}T23:59:59.999Z`
      const prevStartISO = `${prevRangeStart}T00:00:00Z`
      const prevEndISO = `${rangeStart}T00:00:00Z`

      const [
        sessionsRes, prevSessionsRes,
        eventsRes, prevEventsRes,
        pageVisitsRes,
        activeUsersRes, prevActiveUsersRes,
        dailySessionsRes,
        eventTypesRes,
        topPagesRes,
      ] = await Promise.all([
        // Sessions this period
        supabase.from('user_sessions')
          .select('id, user_id, started_at, ended_at, duration_minutes, device, browser, pages_visited')
          .gte('started_at', startISO).lte('started_at', endISO),
        // Sessions previous period (for trend)
        supabase.from('user_sessions')
          .select('id', { count: 'exact', head: true })
          .gte('started_at', prevStartISO).lte('started_at', prevEndISO),
        // Events this period
        supabase.from('analytics_events')
          .select('id, event, user_id, properties, created_at, device, browser, page_path')
          .gte('created_at', startISO).lte('created_at', endISO)
          .order('created_at', { ascending: false })
          .limit(5000),
        // Events previous period count
        supabase.from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', prevStartISO).lte('created_at', prevEndISO),
        // Page visits this period
        supabase.from('page_visits')
          .select('id, user_id, page_path, page_title, duration_seconds, entered_at')
          .gte('entered_at', startISO).lte('entered_at', endISO)
          .limit(5000),
        // Unique active users this period
        supabase.rpc('count_distinct_users_in_range', { start_ts: startISO, end_ts: endISO })
          .maybeSingle(),
        // Unique active users prev period
        supabase.rpc('count_distinct_users_in_range', { start_ts: prevStartISO, end_ts: prevEndISO })
          .maybeSingle(),
        // Daily session counts (for chart)
        supabase.from('daily_reports')
          .select('report_date, active_students, total_sessions, xp_earned')
          .gte('report_date', rangeStart)
          .lte('report_date', today)
          .order('report_date'),
        // Event type breakdown
        supabase.from('analytics_events')
          .select('event')
          .gte('created_at', startISO).lte('created_at', endISO),
        // Top pages
        supabase.from('page_visits')
          .select('page_path, page_title')
          .gte('entered_at', startISO).lte('entered_at', endISO)
          .limit(3000),
      ])

      return {
        sessions: sessionsRes.data || [],
        prevSessionsCount: prevSessionsRes.count || 0,
        events: eventsRes.data || [],
        prevEventsCount: prevEventsRes.count || 0,
        pageVisits: pageVisitsRes.data || [],
        activeUsers: activeUsersRes.data?.count ?? null,
        prevActiveUsers: prevActiveUsersRes.data?.count ?? null,
        dailyReports: dailySessionsRes.data || [],
        allEventTypes: eventTypesRes.data || [],
        allPages: topPagesRes.data || [],
      }
    },
    staleTime: 2 * 60 * 1000,
  })

  // ── Compute metrics ────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!data) return null

    const { sessions, prevSessionsCount, events, prevEventsCount, pageVisits, allEventTypes, allPages } = data

    // Total sessions
    const totalSessions = sessions.length
    const sessionTrend = prevSessionsCount > 0
      ? Math.round(((totalSessions - prevSessionsCount) / prevSessionsCount) * 100)
      : 0

    // Total events
    const totalEvents = events.length
    const eventTrend = prevEventsCount > 0
      ? Math.round(((totalEvents - prevEventsCount) / prevEventsCount) * 100)
      : 0

    // Unique users from sessions
    const uniqueUsers = new Set(sessions.map(s => s.user_id)).size

    // Avg session duration
    const durationsMinutes = sessions.filter(s => s.duration_minutes > 0).map(s => s.duration_minutes)
    const avgSessionMin = durationsMinutes.length > 0
      ? Math.round((durationsMinutes.reduce((a, b) => a + b, 0) / durationsMinutes.length) * 10) / 10
      : 0

    // Total page views
    const totalPageViews = pageVisits.length

    // Avg pages per session
    const pagesPerSession = sessions.filter(s => s.pages_visited > 0)
    const avgPages = pagesPerSession.length > 0
      ? Math.round((pagesPerSession.reduce((a, s) => a + s.pages_visited, 0) / pagesPerSession.length) * 10) / 10
      : 0

    // Device breakdown
    const devices = { mobile: 0, tablet: 0, desktop: 0 }
    sessions.forEach(s => {
      const d = s.device || 'desktop'
      if (devices[d] != null) devices[d]++
    })

    // Browser breakdown
    const browsers = {}
    sessions.forEach(s => {
      const b = s.browser || 'other'
      browsers[b] = (browsers[b] || 0) + 1
    })

    // Hourly activity from events
    const hourly = new Array(24).fill(0)
    events.forEach(e => {
      const h = new Date(e.created_at).getUTCHours()
      hourly[h]++
    })

    // Event type breakdown
    const eventTypeMap = {}
    allEventTypes.forEach(e => {
      eventTypeMap[e.event] = (eventTypeMap[e.event] || 0) + 1
    })
    const eventTypes = Object.entries(eventTypeMap)
      .map(([type, count]) => ({ type, count, label: EVENT_LABELS[type] || type, color: EVENT_COLORS[type] || '#94a3b8' }))
      .sort((a, b) => b.count - a.count)

    // Top pages
    const pageMap = {}
    allPages.forEach(p => {
      const key = p.page_path
      if (!pageMap[key]) pageMap[key] = { path: key, title: p.page_title, count: 0 }
      pageMap[key].count++
    })
    const topPages = Object.values(pageMap).sort((a, b) => b.count - a.count).slice(0, 10)

    // Daily chart data
    const dailyLabels = data.dailyReports.map(r => formatDateAr(r.report_date))
    const dailySessions = data.dailyReports.map(r => r.total_sessions || 0)
    const dailyActive = data.dailyReports.map(r => r.active_students || 0)
    const dailyXP = data.dailyReports.map(r => r.xp_earned || 0)

    // Avg time on page
    const pageDurations = pageVisits.filter(p => p.duration_seconds > 0).map(p => p.duration_seconds)
    const avgTimeOnPage = pageDurations.length > 0
      ? Math.round(pageDurations.reduce((a, b) => a + b, 0) / pageDurations.length)
      : 0

    return {
      totalSessions, sessionTrend, totalEvents, eventTrend,
      uniqueUsers, avgSessionMin, totalPageViews, avgPages,
      devices, browsers, hourly, eventTypes, topPages,
      dailyLabels, dailySessions, dailyActive, dailyXP,
      avgTimeOnPage,
    }
  }, [data])

  // ── Render ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-[var(--surface-raised)] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
          <div className="h-64 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        </div>
      </div>
    )
  }

  const m = metrics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 font-['Tajawal']">
            <Activity size={22} className="text-sky-400" />
            تحليلات المنصة
          </h1>
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] mt-1">
            تتبع نشاط الطلاب وأداء المنصة
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`px-3 h-9 text-xs font-bold transition-colors font-['Tajawal'] ${
                  range === d ? 'bg-sky-500/15 text-sky-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {d} يوم
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="مستخدمين نشطين" value={m?.uniqueUsers || 0} color="#38bdf8" delay={0} />
        <StatCard icon={Activity} label="جلسات" value={m?.totalSessions || 0} color="#a78bfa" trend={m?.sessionTrend} delay={0.05} />
        <StatCard icon={MousePointerClick} label="أحداث" value={m?.totalEvents || 0} color="#34d399" trend={m?.eventTrend} delay={0.1} />
        <StatCard icon={Eye} label="مشاهدات الصفحات" value={m?.totalPageViews || 0} color="#fbbf24" delay={0.15} />
        <StatCard icon={Clock} label="متوسط الجلسة" value={m?.avgSessionMin || 0} suffix="د" color="#fb7185" delay={0.2} />
        <StatCard icon={BookOpen} label="صفحات/جلسة" value={m?.avgPages || 0} color="#6366f1" delay={0.25} />
        <StatCard icon={Clock} label="وقت الصفحة" value={m?.avgTimeOnPage || 0} suffix="ث" color="#f97316" delay={0.3} />
        <StatCard icon={Flame} label="إجمالي XP" value={m?.dailyXP?.reduce((a, b) => a + b, 0) || 0} color="#fbbf24" delay={0.35} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Sessions Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl p-5"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-sky-400" />
            الجلسات اليومية
          </h3>
          {m?.dailySessions?.length > 0 ? (
            <MiniBarChart data={m.dailySessions} labels={m.dailyLabels} color="#38bdf8" height={120} />
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-8 font-['Tajawal']">لا توجد تقارير يومية بعد</p>
          )}
        </motion.div>

        {/* Daily Active Users Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl p-5"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
            <Users size={16} className="text-emerald-400" />
            المستخدمين النشطين يومياً
          </h3>
          {m?.dailyActive?.length > 0 ? (
            <MiniBarChart data={m.dailyActive} labels={m.dailyLabels} color="#34d399" height={120} />
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-8 font-['Tajawal']">لا توجد بيانات</p>
          )}
        </motion.div>
      </div>

      {/* Hourly Activity + Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl p-5 lg:col-span-2"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            النشاط حسب الساعة
          </h3>
          <div className="flex items-end gap-1 h-24" dir="ltr">
            {m?.hourly?.map((val, i) => {
              const max = Math.max(...(m.hourly || [1]), 1)
              const h = Math.max((val / max) * 100, 2)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{ height: `${h}%`, background: `rgba(251,191,36,${0.3 + (h / 100) * 0.7})`, minHeight: '2px' }}
                    title={`${i}:00 — ${val} حدث`}
                  />
                  {i % 3 === 0 && <span className="text-[9px] text-[var(--text-muted)]">{i}</span>}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Devices */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl p-5"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
            <Smartphone size={16} className="text-violet-400" />
            الأجهزة
          </h3>
          <div className="flex items-center justify-center mb-4">
            <DonutChart
              size={110}
              segments={[
                { value: m?.devices?.mobile || 0, color: '#38bdf8' },
                { value: m?.devices?.tablet || 0, color: '#a78bfa' },
                { value: m?.devices?.desktop || 0, color: '#34d399' },
              ]}
            />
          </div>
          <div className="space-y-2">
            {[
              { label: 'جوال', value: m?.devices?.mobile || 0, color: '#38bdf8', icon: Smartphone },
              { label: 'لوحي', value: m?.devices?.tablet || 0, color: '#a78bfa', icon: Monitor },
              { label: 'حاسوب', value: m?.devices?.desktop || 0, color: '#34d399', icon: Monitor },
            ].map(d => {
              const total = (m?.devices?.mobile || 0) + (m?.devices?.tablet || 0) + (m?.devices?.desktop || 0)
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
              return (
                <div key={d.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[var(--text-secondary)] font-['Tajawal']">{d.label}</span>
                  </div>
                  <span className="text-[var(--text-muted)]" dir="ltr">{pct}%</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Event Types + Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Event Types */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl p-5"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
            <Zap size={16} className="text-sky-400" />
            أنواع الأحداث
          </h3>
          <div className="space-y-2">
            {m?.eventTypes?.slice(0, 10).map((et, i) => {
              const max = m.eventTypes[0]?.count || 1
              return (
                <div key={et.type} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)] w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--text-primary)] font-['Tajawal']">{et.label}</span>
                      <span className="text-xs text-[var(--text-muted)] flex-shrink-0 mr-2" dir="ltr">{et.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(et.count / max) * 100}%`, background: et.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Top Pages */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-xl p-5"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
            <Globe size={16} className="text-emerald-400" />
            أكثر الصفحات زيارة
          </h3>
          <TopPagesTable pages={m?.topPages} />
        </motion.div>
      </div>

      {/* Browser Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl p-5"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 flex items-center gap-2">
          <Globe size={16} className="text-rose-400" />
          المتصفحات
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(m?.browsers || {})
            .sort((a, b) => b[1] - a[1])
            .map(([browser, count]) => {
              const total = Object.values(m?.browsers || {}).reduce((a, b) => a + b, 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const colors = { chrome: '#4285F4', safari: '#000', firefox: '#FF7139', edge: '#0078D7', other: '#94a3b8' }
              return (
                <div key={browser} className="rounded-lg p-3 text-center" style={{ background: 'var(--surface-overlay)' }}>
                  <p className="text-lg font-bold text-[var(--text-primary)]" dir="ltr">{pct}%</p>
                  <p className="text-xs text-[var(--text-muted)] capitalize">{browser}</p>
                </div>
              )
            })}
        </div>
      </motion.div>
    </div>
  )
}
