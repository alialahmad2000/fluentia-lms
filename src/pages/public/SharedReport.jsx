import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Sparkles,
  BookOpen,
  Target,
  Flame,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  FileX2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getConfidenceCopy, shouldShowConfidenceNote } from '../../lib/reports/confidenceCopy'

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

function SkeletonView() {
  return (
    <div className="flex flex-col gap-5 animate-pulse px-4 py-6 max-w-2xl mx-auto">
      <div className="h-10 w-48 rounded bg-[var(--surface-raised,#1e293b)] mx-auto" />
      <div className="h-6 w-64 rounded bg-[var(--surface-raised,#1e293b)]" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--surface-raised,#1e293b)]" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-[var(--surface-raised,#1e293b)]" />
    </div>
  )
}

export default function SharedReport() {
  // ── ALL HOOKS AT TOP (React #310 safe) ──────────────────────────
  const { token } = useParams()

  const { data: reportData, isLoading, isError } = useQuery({
    queryKey: ['shared-report', token],
    enabled: !!token,
    staleTime: 300_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shared_report', {
        p_token: token,
      })
      if (error) throw error
      return data
    },
  })

  // OG meta tags
  useEffect(() => {
    if (reportData) {
      document.title = `تقرير تقدم ${reportData.student_name} — Fluentia Academy`
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.name = 'description'
        document.head.appendChild(metaDesc)
      }
      metaDesc.content = `تقرير التقدم الدراسي لـ ${reportData.student_name} من أكاديمية فلوينشيا`
    }
    return () => {
      document.title = 'Fluentia Academy'
    }
  }, [reportData])

  // ── GUARDS (after all hooks) ────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="shared-report min-h-screen"
        style={{ background: 'var(--surface-base, #0f172a)', color: 'var(--text-primary, #e2e8f0)' }}
        dir="rtl"
      >
        <SkeletonView />
      </div>
    )
  }

  if (!reportData || isError) {
    return (
      <div
        className="shared-report min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'var(--surface-base, #0f172a)', color: 'var(--text-primary, #e2e8f0)' }}
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <FileX2 size={48} style={{ color: 'var(--text-secondary, #94a3b8)' }} />
          <p className="text-lg" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
            التقرير غير موجود أو لم يُنشر بعد
          </p>
        </div>
      </div>
    )
  }

  // ── Derived data ────────────────────────────────────────────────
  const r = reportData
  const skills = r.skill_scores || {}
  const vocab = r.vocabulary_stats || {}
  const goals = r.next_goals || []
  const highlights = r.highlights || []
  const confidenceNote = getConfidenceCopy(r.confidence_band)

  const periodStart = r.period_start
    ? new Date(r.period_start).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const periodEnd = r.period_end
    ? new Date(r.period_end).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div
      className="shared-report min-h-screen"
      style={{ background: 'var(--surface-base, #0f172a)', color: 'var(--text-primary, #e2e8f0)' }}
      dir="rtl"
    >
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          className="flex flex-col gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* ── Branding header ──────────────────────────────── */}
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-2 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Fluentia Academy"
                className="w-10 h-10"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span
                className="text-lg font-bold"
                style={{ color: 'var(--text-primary, #e2e8f0)' }}
              >
                Fluentia Academy
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              تقرير تقدّم الطالب
            </span>
          </motion.div>

          {/* ── Student name + period ────────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="p-5 rounded-2xl"
            style={{
              background: 'var(--surface-raised, #1e293b)',
              border: '1px solid var(--border-subtle, #334155)',
            }}
          >
            <h1
              className="text-xl font-bold mb-1"
              style={{ color: 'var(--text-primary, #e2e8f0)' }}
            >
              {r.student_name}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              {periodStart && periodEnd ? `${periodStart} — ${periodEnd}` : ''}
            </p>
          </motion.div>

          {/* ── Hero stats (4 cards) ─────────────────────────── */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            <SharedHeroStat
              icon={<Sparkles size={20} />}
              label="نقاط الخبرة"
              value={r.xp_earned?.toLocaleString('ar-EG') ?? '—'}
              sub={
                r.xp_change_pct != null
                  ? `${r.xp_change_pct > 0 ? '+' : ''}${r.xp_change_pct}%`
                  : null
              }
            />
            <SharedHeroStat
              icon={<BookOpen size={20} />}
              label="كلمات مُتقَنة"
              value={r.words_mastered?.toLocaleString('ar-EG') ?? '—'}
            />
            <SharedHeroStat
              icon={<Target size={20} />}
              label="حصص حضرتها"
              value={r.classes_attended?.toLocaleString('ar-EG') ?? '—'}
            />
            <SharedHeroStat
              icon={<Flame size={20} />}
              label="أطول سلسلة"
              value={r.streak_days?.toLocaleString('ar-EG') ?? '—'}
              sub={r.streak_days ? 'يوم' : null}
            />
          </motion.div>

          {/* ── Skill bars ───────────────────────────────────── */}
          {Object.keys(skills).length > 0 && (
            <motion.div
              variants={fadeUp}
              className="p-5 rounded-2xl"
              style={{
                background: 'var(--surface-raised, #1e293b)',
                border: '1px solid var(--border-subtle, #334155)',
              }}
            >
              <h2
                className="text-base font-semibold mb-4"
                style={{ color: 'var(--text-primary, #e2e8f0)' }}
              >
                المهارات
              </h2>
              <div className="flex flex-col gap-3">
                {Object.entries(SKILL_LABELS).map(([key, label]) =>
                  skills[key] != null ? (
                    <SkillBar key={key} label={label} value={skills[key]} />
                  ) : null
                )}
              </div>
            </motion.div>
          )}

          {/* ── AI narrative ─────────────────────────────────── */}
          {r.ai_narrative_ar && (
            <motion.div
              variants={fadeUp}
              className="p-5 rounded-2xl"
              style={{
                background: 'var(--surface-raised, #1e293b)',
                border: '1px solid var(--border-subtle, #334155)',
              }}
            >
              <h2
                className="text-base font-semibold mb-3"
                style={{ color: 'var(--text-primary, #e2e8f0)' }}
              >
                تحليل الأداء
              </h2>
              <p
                className="text-sm leading-7 whitespace-pre-line"
                style={{ color: 'var(--text-secondary, #94a3b8)' }}
              >
                {r.ai_narrative_ar}
              </p>
            </motion.div>
          )}

          {/* ── Highlights ───────────────────────────────────── */}
          {highlights.length > 0 && (
            <motion.div
              variants={fadeUp}
              className="p-5 rounded-2xl"
              style={{
                background: 'var(--surface-raised, #1e293b)',
                border: '1px solid var(--border-subtle, #334155)',
              }}
            >
              <h2
                className="text-base font-semibold mb-3"
                style={{ color: 'var(--text-primary, #e2e8f0)' }}
              >
                أبرز الإنجازات
              </h2>
              <ul className="flex flex-col gap-2">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--accent-sky, #38bdf8)' }} className="mt-0.5 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* ── Trainer's note ───────────────────────────────── */}
          {r.trainer_note && (
            <motion.div
              variants={fadeUp}
              className="p-5 rounded-2xl"
              style={{
                background: 'var(--surface-raised, #1e293b)',
                border: '1px solid var(--accent-sky, #38bdf8)',
                borderWidth: '1px',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={18} style={{ color: 'var(--accent-sky, #38bdf8)' }} />
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--text-primary, #e2e8f0)' }}
                >
                  ملاحظة المدرّب
                </h2>
              </div>
              <p
                className="text-sm leading-7 whitespace-pre-line"
                style={{ color: 'var(--text-secondary, #94a3b8)' }}
              >
                {r.trainer_note}
              </p>
            </motion.div>
          )}

          {/* ── Next goals ───────────────────────────────────── */}
          {goals.length > 0 && (
            <motion.div
              variants={fadeUp}
              className="p-5 rounded-2xl"
              style={{
                background: 'var(--surface-raised, #1e293b)',
                border: '1px solid var(--border-subtle, #334155)',
              }}
            >
              <h2
                className="text-base font-semibold mb-3"
                style={{ color: 'var(--text-primary, #e2e8f0)' }}
              >
                الأهداف القادمة
              </h2>
              <ol className="flex flex-col gap-2">
                {goals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                    <span
                      className="flex items-center justify-center min-w-[24px] h-6 rounded-full text-xs font-bold shrink-0"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-sky, #38bdf8) 15%, transparent)',
                        color: 'var(--accent-sky, #38bdf8)',
                      }}
                    >
                      {(i + 1).toLocaleString('ar-EG')}
                    </span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          )}

          {/* ── Confidence footnote ──────────────────────────── */}
          {shouldShowConfidenceNote(r.confidence_band) && confidenceNote && (
            <motion.div
              variants={fadeUp}
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{
                background: 'var(--surface-raised, #1e293b)',
                border: '1px solid var(--border-subtle, #334155)',
              }}
            >
              <AlertTriangle size={18} style={{ color: 'var(--text-secondary, #94a3b8)' }} className="mt-0.5 shrink-0" />
              <p
                className="text-xs leading-5"
                style={{ color: 'var(--text-secondary, #94a3b8)' }}
              >
                {confidenceNote}
              </p>
            </motion.div>
          )}

          {/* ── Branding footer ──────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center gap-1 py-8 text-center"
          >
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary, #94a3b8)' }}
            >
              Fluentia Academy — أكاديمية فلوينشيا
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--text-secondary, #94a3b8)', opacity: 0.6 }}
            >
              fluentia.academy
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function SharedHeroStat({ icon, label, value, sub }) {
  return (
    <div
      className="p-4 rounded-2xl flex flex-col gap-1"
      style={{
        background: 'var(--surface-raised, #1e293b)',
        border: '1px solid var(--border-subtle, #334155)',
      }}
    >
      <div style={{ color: 'var(--accent-sky, #38bdf8)' }} className="mb-1">{icon}</div>
      <span className="text-xs" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{label}</span>
      <span
        className="text-xl font-bold font-mono"
        style={{ color: 'var(--text-primary, #e2e8f0)' }}
      >
        {value}
        {sub && (
          <span
            className="text-xs font-normal mr-1"
            style={{ color: 'var(--accent-sky, #38bdf8)' }}
          >
            {sub}
          </span>
        )}
      </span>
    </div>
  )
}
