import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Share2,
  Check,
  Sparkles,
  BookOpen,
  Flame,
  Target,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Star,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getConfidenceCopy, shouldShowConfidenceNote } from '../../lib/reports/confidenceCopy'

const PERIOD_LABELS = {
  weekly: 'أسبوعي',
  biweekly: 'نصف شهري',
  monthly: 'شهري',
}

const SKILL_LABELS = {
  vocabulary: 'المفردات',
  reading: 'القراءة',
  writing: 'الكتابة',
  speaking: 'المحادثة',
  listening: 'الاستماع',
  grammar: 'القواعد',
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function SkillBar({ label, value, max = 100 }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--text-secondary)] w-20 text-start">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[var(--accent-sky)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-mono text-[var(--text-secondary)] w-8 text-end">{value}</span>
    </div>
  )
}

function SkeletonSection() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="h-8 w-64 rounded bg-[var(--surface-raised)]" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--surface-raised)]" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-[var(--surface-raised)]" />
      <div className="h-32 rounded-xl bg-[var(--surface-raised)]" />
    </div>
  )
}

export default function ReportView() {
  // ── ALL HOOKS AT TOP (React #310 safe) ──────────────────────────
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const { data: report, isLoading } = useQuery({
    queryKey: ['student-report-view', id, profile?.id],
    enabled: !!id && !!profile?.id,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_reports')
        .select('*')
        .eq('id', id)
        .eq('student_id', profile.id)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })

  const handleShare = useCallback(async () => {
    if (!report?.share_token) return
    const url = `${window.location.origin}/r/${report.share_token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [report?.share_token])

  const handleBack = useCallback(() => {
    navigate('/student/progress-reports')
  }, [navigate])

  // ── GUARDS (after all hooks) ────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto" dir="rtl">
        <SkeletonSection />
      </div>
    )
  }

  if (!report || !['approved', 'published'].includes(report.status)) {
    navigate('/student/progress-reports', { replace: true })
    return null
  }

  // ── Derived data ────────────────────────────────────────────────
  const periodLabel = PERIOD_LABELS[report.type] || 'شهري'
  const periodStart = report.period_start
    ? new Date(report.period_start).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const periodEnd = report.period_end
    ? new Date(report.period_end).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  const skills = report.skill_scores || {}
  const vocab = report.vocabulary_stats || {}
  const highlights = report.highlights || []
  const goals = report.next_goals || []
  const confidenceNote = getConfidenceCopy(report.confidence_band)

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto" dir="rtl">
      {/* ── Action bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl
                     text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]
                     transition-colors"
        >
          <ArrowRight size={18} />
          <span>رجوع</span>
        </button>

        {report.share_token && (
          <button
            onClick={handleShare}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium
                       bg-[var(--accent-sky)]/15 text-[var(--accent-sky)] hover:bg-[var(--accent-sky)]/25
                       transition-colors"
          >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
            <span>{copied ? 'تم النسخ!' : 'مشاركة'}</span>
          </button>
        )}
      </div>

      <motion.div
        className="flex flex-col gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* ── a. Header ────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="fl-card-static p-5">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
            {report.student_name || profile?.full_name_ar || profile?.full_name}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            تقرير {periodLabel} — {periodStart} إلى {periodEnd}
          </p>
          {report.package_name && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-sky)]/15 text-[var(--accent-sky)]">
              {report.package_name}
            </span>
          )}
        </motion.div>

        {/* ── b. Hero stats ────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <HeroStat
            icon={<Sparkles size={20} />}
            label="نقاط الخبرة"
            value={report.xp_earned?.toLocaleString('ar-EG') ?? '—'}
            sub={
              report.xp_change_pct != null
                ? `${report.xp_change_pct > 0 ? '+' : ''}${report.xp_change_pct}%`
                : null
            }
          />
          <HeroStat
            icon={<BookOpen size={20} />}
            label="كلمات مُتقَنة"
            value={report.words_mastered?.toLocaleString('ar-EG') ?? '—'}
          />
          <HeroStat
            icon={<Target size={20} />}
            label="حصص حضرتها"
            value={report.classes_attended?.toLocaleString('ar-EG') ?? '—'}
          />
          <HeroStat
            icon={<Flame size={20} />}
            label="أطول سلسلة"
            value={report.streak_days?.toLocaleString('ar-EG') ?? '—'}
            sub={report.streak_days ? 'يوم' : null}
          />
        </motion.div>

        {/* ── c. Skill radar (horizontal bars) ─────────────────── */}
        {Object.keys(skills).length > 0 && (
          <motion.div variants={fadeUp} className="fl-card-static p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">المهارات</h2>
            <div className="flex flex-col gap-3">
              {Object.entries(SKILL_LABELS).map(([key, label]) =>
                skills[key] != null ? (
                  <SkillBar key={key} label={label} value={skills[key]} />
                ) : null
              )}
            </div>
          </motion.div>
        )}

        {/* ── d. AI narrative ──────────────────────────────────── */}
        {report.ai_narrative_ar && (
          <motion.div variants={fadeUp} className="fl-card-static p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">تحليل الأداء</h2>
            <p className="text-sm leading-7 text-[var(--text-secondary)] whitespace-pre-line">
              {report.ai_narrative_ar}
            </p>
          </motion.div>
        )}

        {/* ── e. Highlights ────────────────────────────────────── */}
        {highlights.length > 0 && (
          <motion.div variants={fadeUp} className="fl-card-static p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">أبرز الإنجازات</h2>
            <ul className="flex flex-col gap-2">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircle2 size={16} className="text-[var(--accent-sky)] mt-0.5 shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* ── f. Vocabulary journey ────────────────────────────── */}
        {Object.keys(vocab).length > 0 && (
          <motion.div variants={fadeUp} className="fl-card-static p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">رحلة المفردات</h2>
            <div className="grid grid-cols-2 gap-3">
              {vocab.new_words != null && (
                <MiniStat label="كلمات جديدة" value={vocab.new_words} />
              )}
              {vocab.mastered != null && (
                <MiniStat label="مُتقَنة" value={vocab.mastered} />
              )}
              {vocab.in_queue != null && (
                <MiniStat label="في قائمة المراجعة" value={vocab.in_queue} />
              )}
              {vocab.accuracy != null && (
                <MiniStat label="دقة الإجابات" value={`${vocab.accuracy}%`} />
              )}
            </div>
          </motion.div>
        )}

        {/* ── g. Trainer's note ────────────────────────────────── */}
        {report.trainer_notes && (
          <motion.div
            variants={fadeUp}
            className="fl-card-static p-5 border border-[var(--accent-sky)]/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={18} className="text-[var(--accent-sky)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">ملاحظة المدرّب</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--text-secondary)] whitespace-pre-line">
              {report.trainer_notes}
            </p>
          </motion.div>
        )}

        {/* ── h. Next goals ────────────────────────────────────── */}
        {goals.length > 0 && (
          <motion.div variants={fadeUp} className="fl-card-static p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">الأهداف القادمة</h2>
            <ol className="flex flex-col gap-2">
              {goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="flex items-center justify-center min-w-[24px] h-6 rounded-full bg-[var(--accent-sky)]/15 text-[var(--accent-sky)] text-xs font-bold shrink-0">
                    {(i + 1).toLocaleString('ar-EG')}
                  </span>
                  <span>{goal}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}

        {/* ── i. Confidence footnote ───────────────────────────── */}
        {shouldShowConfidenceNote(report.confidence_band) && confidenceNote && (
          <motion.div
            variants={fadeUp}
            className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)]"
          >
            <AlertTriangle size={18} className="text-[var(--text-secondary)] mt-0.5 shrink-0" />
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{confidenceNote}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function HeroStat({ icon, label, value, sub }) {
  return (
    <div className="fl-card-static p-4 flex flex-col gap-1 backdrop-blur-sm">
      <div className="text-[var(--accent-sky)] mb-1">{icon}</div>
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-xl font-bold text-[var(--text-primary)] font-mono">
        {value}
        {sub && (
          <span className="text-xs font-normal mr-1 text-[var(--accent-sky)]">{sub}</span>
        )}
      </span>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-[var(--surface-raised)]">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-lg font-bold text-[var(--text-primary)] font-mono">
        {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
      </span>
    </div>
  )
}
