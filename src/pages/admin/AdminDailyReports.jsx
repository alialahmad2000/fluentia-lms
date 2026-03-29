import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart3, Users, Zap, Clock, BookOpen, CreditCard, Flame, Trophy,
  ChevronLeft, ChevronRight, RefreshCw, CalendarDays, TrendingUp,
  FileText, GraduationCap, Activity, Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const formatDate = (d) => d.toISOString().split('T')[0]
const formatDateAr = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function AdminDailyReports() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date(Date.now() - 86400000)))

  // Fetch report for selected date
  const { data: report, isLoading } = useQuery({
    queryKey: ['daily-report', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('report_date', selectedDate)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  })

  // Fetch last 7 reports for trend
  const { data: recentReports } = useQuery({
    queryKey: ['daily-reports-trend'],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_reports')
        .select('report_date, active_students, xp_earned, total_sessions, submissions_count, revenue_amount')
        .order('report_date', { ascending: false })
        .limit(7)
      return (data || []).reverse()
    },
  })

  // Generate report manually
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-daily-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ date: selectedDate }),
        }
      )
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-report', selectedDate] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports-trend'] })
    },
  })

  const navigateDate = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    if (d <= new Date()) setSelectedDate(formatDate(d))
  }

  const isToday = selectedDate === formatDate(new Date())
  const isYesterday = selectedDate === formatDate(new Date(Date.now() - 86400000))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title flex items-center gap-2">
            <BarChart3 size={24} className="text-sky-400" />
            التقرير اليومي
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">ملخص شامل لنشاط المنصة</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition-colors disabled:opacity-50"
          >
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            إنشاء التقرير
          </button>
        </div>
      </div>

      {/* Date Navigator */}
      <div
        className="flex items-center justify-between px-5 py-3 rounded-xl"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={() => navigateDate(-1)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        >
          <ChevronRight size={18} />
        </button>

        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-sky-400" />
          <div className="text-center">
            <p className="text-base font-bold text-[var(--text-primary)]">
              {isToday ? 'اليوم' : isYesterday ? 'أمس' : formatDateAr(selectedDate)}
            </p>
            <p className="text-xs text-[var(--text-muted)]" dir="ltr">{selectedDate}</p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={formatDate(new Date())}
            className="w-8 h-8 opacity-0 absolute cursor-pointer"
          />
        </div>

        <button
          onClick={() => navigateDate(1)}
          disabled={isToday}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Loading / No Data */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
      ) : !report ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-14 flex flex-col items-center justify-center text-center"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <BarChart3 size={40} className="text-[var(--text-muted)] mb-4" />
          <p className="text-lg font-semibold text-[var(--text-muted)] mb-1.5">لا يوجد تقرير لهذا التاريخ</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">اضغط "إنشاء التقرير" لتوليد البيانات</p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-sm font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition-colors disabled:opacity-50"
          >
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            إنشاء التقرير
          </button>
        </motion.div>
      ) : (
        <>
          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <StatCard icon={Users} label="الطلاب النشطون" value={report.active_students} total={report.total_students} color="#38bdf8" />
            <StatCard icon={Zap} label="النقاط المكتسبة" value={report.xp_earned} color="#fbbf24" suffix=" XP" />
            <StatCard icon={Activity} label="الجلسات" value={report.total_sessions} color="#a78bfa" />
            <StatCard icon={Clock} label="متوسط الجلسة" value={report.avg_session_minutes} color="#34d399" suffix=" د" />
            <StatCard icon={FileText} label="التسليمات" value={report.submissions_count} sub={`${report.submissions_graded} مُصححة`} color="#f97316" />
            <StatCard icon={GraduationCap} label="الحضور" value={report.attendance_count} sub={`${report.classes_held} حصة`} color="#06b6d4" />
            <StatCard icon={CreditCard} label="الإيرادات" value={report.revenue_amount} color="#10b981" suffix=" ر.س" />
            <StatCard icon={Flame} label="سلاسل نشطة" value={report.students_with_streak} color="#ef4444" />
          </motion.div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricBox icon={Trophy} label="إنجازات مكتسبة" value={report.achievements_earned} color="#fbbf24" />
            <MetricBox icon={BookOpen} label="وحدات مكتملة" value={report.units_completed} color="#a78bfa" />
            <MetricBox icon={Users} label="طلاب جدد" value={report.new_students} color="#38bdf8" />
          </div>

          {/* Hourly Activity Chart */}
          {report.hourly_activity && (
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Activity size={16} className="text-sky-400" />
                النشاط حسب الساعة
              </h3>
              <div className="flex items-end gap-1 h-24" dir="ltr">
                {report.hourly_activity.map((count, hour) => {
                  const max = Math.max(...report.hourly_activity, 1)
                  const height = (count / max) * 100
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t transition-all duration-300"
                        style={{
                          height: `${Math.max(height, 2)}%`,
                          background: count > 0 ? `rgba(56,189,248,${0.3 + (height / 100) * 0.7})` : 'rgba(255,255,255,0.05)',
                          minHeight: '2px',
                        }}
                        title={`${hour}:00 — ${count} sessions`}
                      />
                      {hour % 3 === 0 && (
                        <span className="text-[11px] text-[var(--text-muted)]">{hour}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top Students */}
          {report.student_details?.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <TrendingUp size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">أكثر الطلاب نشاطاً</h3>
                <span className="text-xs text-[var(--text-muted)]">({report.student_details.length})</span>
              </div>
              <div className="divide-y" style={{ divideColor: 'var(--border-subtle)' }}>
                {report.student_details.slice(0, 10).map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: i < 3 ? 'rgba(251,191,36,0.15)' : 'var(--surface-base)',
                          color: i < 3 ? '#fbbf24' : 'var(--text-muted)',
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-[var(--text-primary)]">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Zap size={11} className="text-amber-400" />
                        {s.xp} XP
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity size={11} className="text-sky-400" />
                        {s.sessions} جلسة
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-Day Trend */}
          {recentReports?.length > 1 && (
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                اتجاه آخر 7 أيام
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TrendMini label="الطلاب النشطون" data={recentReports.map(r => r.active_students)} color="#38bdf8" />
                <TrendMini label="XP المكتسب" data={recentReports.map(r => r.xp_earned)} color="#fbbf24" />
                <TrendMini label="الجلسات" data={recentReports.map(r => r.total_sessions)} color="#a78bfa" />
                <TrendMini label="الإيرادات" data={recentReports.map(r => r.revenue_amount)} color="#10b981" />
              </div>
            </div>
          )}

          {/* Generation Info */}
          <p className="text-[10px] text-[var(--text-muted)] text-center" dir="ltr">
            Generated at {new Date(report.generated_at).toLocaleString()} in {report.generation_ms}ms
          </p>
        </>
      )}
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────
function StatCard({ icon: Icon, label, value, total, color, suffix = '', sub }) {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <div>
        <span className="text-2xl font-bold text-[var(--text-primary)]">
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </span>
        {total !== undefined && (
          <span className="text-xs text-[var(--text-muted)] mr-1.5">/ {total}</span>
        )}
        {sub && (
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

// ─── Metric Box ──────────────────────────────────────
function MetricBox({ icon: Icon, label, value, color }) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
      </div>
    </div>
  )
}

// ─── Trend Mini Chart ────────────────────────────────
function TrendMini({ label, data, color }) {
  const max = Math.max(...data, 1)
  const latest = data[data.length - 1] || 0
  const prev = data[data.length - 2] || 0
  const change = prev > 0 ? ((latest - prev) / prev * 100).toFixed(0) : 0
  const isUp = latest >= prev

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
        <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? '↑' : '↓'}{Math.abs(change)}%
        </span>
      </div>
      <div className="flex items-end gap-0.5 h-8" dir="ltr">
        {data.map((val, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${Math.max((val / max) * 100, 5)}%`,
              background: i === data.length - 1 ? color : `${color}40`,
              minHeight: '2px',
            }}
          />
        ))}
      </div>
    </div>
  )
}
