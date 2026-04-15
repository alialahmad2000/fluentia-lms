import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileBarChart, CalendarClock, ChevronLeft, Lock, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const PERIOD_LABELS = {
  weekly: 'أسبوعي',
  biweekly: 'نصف شهري',
  monthly: 'شهري',
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

function formatPeriod(report) {
  const periodLabel = PERIOD_LABELS[report.type] || 'شهري'
  const date = new Date(report.period_end || report.created_at)
  const monthYear = date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
  })
  return `تقرير ${periodLabel} — ${monthYear}`
}

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="fl-card-static p-5 animate-pulse"
        >
          <div className="h-5 w-48 rounded bg-[var(--surface-raised)] mb-3" />
          <div className="flex gap-4 mb-3">
            <div className="h-10 w-20 rounded bg-[var(--surface-raised)]" />
            <div className="h-10 w-20 rounded bg-[var(--surface-raised)]" />
          </div>
          <div className="h-9 w-32 rounded bg-[var(--surface-raised)]" />
        </div>
      ))}
    </div>
  )
}

export default function ProgressReports() {
  // ── ALL HOOKS AT TOP (React #310 safe) ──────────────────────────
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  const { data: reports, isLoading } = useQuery({
    queryKey: ['student-progress-reports', profile?.id],
    enabled: !!profile?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_reports')
        .select('id, type, period_start, period_end, status, data, created_at, share_token')
        .eq('student_id', profile.id)
        .in('status', ['approved', 'published'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto" dir="rtl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-sky)]/15 flex items-center justify-center">
          <FileBarChart size={22} className="text-[var(--accent-sky)]" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">تقاريري</h1>
      </div>

      {isLoading ? (
        <SkeletonCards />
      ) : !reports?.length ? (
        <EmptyState />
      ) : (
        <motion.div
          className="flex flex-col gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpen={() => navigate(`/student/progress-reports/${report.id}`)}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

function ReportCard({ report, onOpen }) {
  const isPublished = report.status === 'published'
  const isPending = !isPublished

  return (
    <motion.div
      variants={item}
      className={`fl-card-static p-5 transition-shadow ${
        isPublished
          ? 'cursor-pointer hover:shadow-lg'
          : 'opacity-60 cursor-not-allowed'
      }`}
      onClick={isPublished ? onOpen : undefined}
      role={isPublished ? 'button' : undefined}
      tabIndex={isPublished ? 0 : undefined}
      onKeyDown={
        isPublished
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen()
              }
            }
          : undefined
      }
    >
      {/* Period title */}
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
        {formatPeriod(report)}
      </h3>

      {/* Hero stats preview */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <StatChip
          label="نقاط الخبرة"
          value={report.data?.xp?.period_earned?.toLocaleString('ar-EG') ?? '—'}
          sub={
            report.data?.xp?.change_pct != null
              ? `${report.data.xp.change_pct > 0 ? '+' : ''}${report.data.xp.change_pct}%`
              : null
          }
        />
        <StatChip
          label="كلمات مُتقَنة"
          value={report.data?.vocabulary?.mastered?.toLocaleString('ar-EG') ?? '—'}
        />
      </div>

      {/* Status / action */}
      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Lock size={16} />
          <span>قيد المراجعة</span>
        </div>
      ) : (
        <button
          className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium
                     bg-[var(--accent-sky)]/15 text-[var(--accent-sky)] hover:bg-[var(--accent-sky)]/25
                     transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
        >
          <span>اقرأ التقرير</span>
          <ChevronLeft size={16} />
        </button>
      )}
    </motion.div>
  )
}

function StatChip({ label, value, sub }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-[var(--surface-raised)]">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-lg font-bold text-[var(--text-primary)] font-mono">
        {value}
        {sub && (
          <span className="text-xs font-normal mr-1 text-[var(--accent-sky)]">{sub}</span>
        )}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center py-20 px-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-16 h-16 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mb-5">
        <CalendarClock size={32} className="text-[var(--text-secondary)]" />
      </div>
      <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-xs">
        تقارير تقدّمك ستظهر هنا بمجرد أن يُعدّها المدرّب
      </p>
    </motion.div>
  )
}
