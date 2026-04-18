import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, Headphones, PenTool, Mic, Target, Sparkles,
  TrendingUp, AlertCircle, BookMarked, Trophy, Clock, Lock,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel, PremiumCard } from '@/design-system/components'
import {
  useAdaptivePlan, useSkillProgress, useRecentSessions,
  useErrorBankCount, useMockAttempts, useLatestResult,
} from '@/hooks/ielts/useIELTSHub'

// ─── Constants ───────────────────────────────────────────────
const SKILL_CONFIG = {
  reading:   { label: 'القراءة',   icon: BookOpen,  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  route: '/student/ielts/reading' },
  listening: { label: 'الاستماع',  icon: Headphones, color: '#a855f7', bg: 'rgba(168,85,247,0.1)', route: '/student/ielts/listening' },
  writing:   { label: 'الكتابة',   icon: PenTool,   color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  route: '/student/ielts/writing' },
  speaking:  { label: 'المحادثة',  icon: Mic,       color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  route: '/student/ielts/speaking' },
}

const DAY_LETTERS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']

function formatRelative(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `قبل ${hrs} ساعة`
  return `قبل ${Math.floor(hrs / 24)} يوم`
}

function formatBand(band) {
  if (band == null) return '—'
  return Number(band).toFixed(1)
}

// ─── Main Component ──────────────────────────────────────────
export default function StudentIELTSHub() {
  // ══════════════════════════════════════════════════════
  // ALL HOOKS AT TOP — before any guard or conditional return
  // ══════════════════════════════════════════════════════
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const planQ     = useAdaptivePlan(studentId)
  const progressQ = useSkillProgress(studentId)
  const recentQ   = useRecentSessions(studentId, 5)
  const errorsQ   = useErrorBankCount(studentId)
  const mocksQ    = useMockAttempts(studentId)
  const resultQ   = useLatestResult(studentId)

  const plan     = planQ.data
  const progress = progressQ.data

  // Access gate — derived from auth store (already loaded, no extra query)
  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  const currentBand = useMemo(() => {
    if (resultQ.data?.overall_band) return Number(resultQ.data.overall_band)
    if (plan?.current_band_estimate) return Number(plan.current_band_estimate)
    return null
  }, [resultQ.data, plan])

  const hasTakenDiagnostic = resultQ.data?.result_type === 'diagnostic'
  const isLoading = planQ.isLoading || progressQ.isLoading

  // ══════════════════════════════════════════════════════
  // GUARDS — after all hooks
  // ══════════════════════════════════════════════════════
  if (!studentId) return null

  if (isLoading) return <HubSkeleton />

  if (!hasAccess) return <NoAccessPanel />

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
      style={{ maxWidth: 800, margin: '0 auto' }}
      dir="rtl"
    >
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56,189,248,0.25)' }}>
          <Target size={22} style={{ color: '#38bdf8' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>IELTS</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            رحلتك نحو Band {plan?.target_band || '7.0'}
          </p>
        </div>
      </div>

      {/* 1. Hero Band */}
      <HeroBandWidget
        currentBand={currentBand}
        targetBand={plan?.target_band}
        examDate={plan?.target_exam_date}
        onEditGoal={() => navigate('/student/ielts/plan')}
        onStartDiagnostic={() => navigate('/student/ielts/diagnostic')}
      />

      {/* 2. Next Action CTA */}
      <NextActionCard
        plan={plan}
        hasTakenDiagnostic={hasTakenDiagnostic}
        inProgressAttempt={mocksQ.data?.inProgress}
        onNavigate={navigate}
      />

      {/* 3. Skill Cards 2x2 */}
      <SkillCardsGrid
        progress={progress}
        onNavigate={route => navigate(route)}
      />

      {/* 4. Weekly Schedule Strip */}
      <WeeklyScheduleStrip sessions={recentQ.data || []} />

      {/* 5. Error Bank + Mock Tests side by side on wide, stacked on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <ErrorBankMini count={errorsQ.data || 0} onReview={() => navigate('/student/ielts/errors')} />
        <MockTestsWidget mocks={mocksQ.data} onStart={() => navigate('/student/ielts/mock')} onNavigate={navigate} />
      </div>

      {/* 6. Recent Sessions */}
      <RecentSessionsList sessions={recentQ.data || []} onNavigate={navigate} />
    </motion.div>
  )
}

// ─── HeroBandWidget ──────────────────────────────────────────
function HeroBandWidget({ currentBand, targetBand, examDate, onEditGoal, onStartDiagnostic }) {
  const target = targetBand ? Number(targetBand) : 7.0
  const readiness = currentBand ? Math.min(100, Math.round((currentBand / target) * 100)) : 0
  const daysLeft = examDate ? Math.max(0, Math.ceil((new Date(examDate) - Date.now()) / 86400000)) : null

  return (
    <GlassPanel elevation={2} style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
        {/* Left: band + readiness */}
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 4 }}>مستواك الحالي</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 52, fontWeight: 900, color: currentBand ? '#38bdf8' : 'var(--text-tertiary)', lineHeight: 1, fontFamily: 'Tajawal' }}>
              {currentBand ? Number(currentBand).toFixed(1) : '—'}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              → هدف: Band {target.toFixed(1)}
            </span>
          </div>

          {/* Readiness meter */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>الجاهزية</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', fontFamily: 'Tajawal' }}>{readiness}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${readiness}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {!currentBand && (
            <button onClick={onStartDiagnostic} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ابدأ الاختبار التشخيصي لتحديد مستواك
            </button>
          )}
        </div>

        {/* Right: exam date + edit goal */}
        <div style={{ textAlign: 'center' }}>
          {daysLeft !== null ? (
            <>
              <div style={{ fontSize: 32, fontWeight: 900, color: daysLeft < 30 ? '#fb923c' : 'var(--text-primary)', fontFamily: 'Tajawal' }}>{daysLeft}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>يوم للامتحان</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, color: 'var(--text-tertiary)' }}>📅</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>حدّد تاريخ</div>
            </>
          )}
          <button onClick={onEditGoal} style={{ marginTop: 8, fontSize: 11, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal' }}>
            تعديل الهدف ✏️
          </button>
        </div>
      </div>
    </GlassPanel>
  )
}

const SECTION_LABELS = {
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
  speaking: 'المحادثة',
  submitting: 'الإرسال',
}

// ─── NextActionCard ──────────────────────────────────────────
function getNextAction({ plan, hasTakenDiagnostic, inProgressAttempt }) {
  // Case 0: has in-progress diagnostic → resume takes highest priority
  if (inProgressAttempt?.status === 'in_progress') {
    const sectionLabel = SECTION_LABELS[inProgressAttempt.current_section] || inProgressAttempt.current_section
    return {
      icon: '▶️',
      title: 'تابع اختبارك التشخيصي',
      description: `توقفت عند قسم ${sectionLabel}`,
      cta: 'استئناف',
      route: '/student/ielts/diagnostic',
    }
  }
  if (!hasTakenDiagnostic && !plan) {
    return { icon: '🎯', title: 'ابدأ رحلتك بالاختبار التشخيصي', description: 'سيساعدنا تحديد مستواك الحقيقي ورسم خطتك المخصصة.', cta: 'ابدأ الاختبار (45 دقيقة)', route: '/student/ielts/diagnostic' }
  }
  if (plan?.next_recommended_action?.title_ar) {
    const a = plan.next_recommended_action
    return { icon: SKILL_CONFIG[a.skill_type]?.color ? '📚' : '📚', title: a.title_ar, description: a.subtitle_ar || '', cta: a.cta_ar || 'ابدأ الآن', route: a.route_path || '/student/ielts' }
  }
  if (hasTakenDiagnostic && !plan) {
    return { icon: '✨', title: 'خطتك الذكية جاهزة للإنشاء', description: 'بناءً على نتيجة التشخيص، نقدر نرسم لك خطة مخصصة.', cta: 'أنشئ خطتي', route: '/student/ielts/plan' }
  }
  return { icon: '📚', title: 'تابع تدريبك', description: 'اختر مهارة وابدأ.', cta: 'اذهب للخطة', route: '/student/ielts/plan' }
}

function NextActionCard({ plan, hasTakenDiagnostic, inProgressAttempt, onNavigate }) {
  const action = getNextAction({ plan, hasTakenDiagnostic, inProgressAttempt })

  return (
    <GlassPanel
      elevation={1}
      glow
      style={{ padding: 24, cursor: 'pointer', border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.04)' }}
      onClick={() => onNavigate(action.route)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 36, flexShrink: 0 }}>{action.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: '#38bdf8', fontFamily: 'Tajawal', marginBottom: 4, fontWeight: 600 }}>خطوتك التالية</p>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>{action.title}</h3>
          {action.description && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>{action.description}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onNavigate(action.route) }}
          style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {action.cta}
        </button>
      </div>
    </GlassPanel>
  )
}

// ─── SkillCardsGrid ──────────────────────────────────────────
function SkillCard({ skillKey, config, skillData, onClick }) {
  const band = skillData?.band
  const attempts = skillData?.attempts || 0
  const pct = band ? Math.min(100, Math.round((band / 9) * 100)) : 0
  const Icon = config.icon

  return (
    <GlassPanel
      hover
      style={{ padding: 20, cursor: 'pointer', border: `1px solid ${band ? config.color + '33' : 'rgba(255,255,255,0.06)'}` }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} style={{ color: config.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{config.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            {attempts > 0 ? `${attempts} جلسة` : 'اضغط للبدء'}
          </div>
        </div>
        <span style={{ fontSize: 22, fontWeight: 900, color: band ? config.color : 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {formatBand(band)}
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: config.color, borderRadius: 99, transition: 'width 0.6s ease', opacity: pct > 0 ? 1 : 0.2 }} />
      </div>
    </GlassPanel>
  )
}

function SkillCardsGrid({ progress, onNavigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {Object.entries(SKILL_CONFIG).map(([key, config]) => (
        <SkillCard
          key={key}
          skillKey={key}
          config={config}
          skillData={progress?.[key]}
          onClick={() => onNavigate(config.route)}
        />
      ))}
    </div>
  )
}

// ─── WeeklyScheduleStrip ─────────────────────────────────────
function WeeklyScheduleStrip({ sessions }) {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  // Which day indices (0=Sun) have sessions this week
  const activeDays = new Set(
    sessions
      .filter(s => s.started_at && new Date(s.started_at) >= weekStart)
      .map(s => new Date(s.started_at).getDay())
  )
  const todayIdx = now.getDay()
  const completed = activeDays.size

  return (
    <GlassPanel elevation={1} style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>الجدول الأسبوعي</p>
        <span style={{ fontSize: 12, color: completed > 0 ? '#4ade80' : 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {completed} / 7 أيام مكتملة
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {DAY_LETTERS.map((letter, idx) => {
          const isToday = idx === todayIdx
          const hasSession = activeDays.has(idx)
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Tajawal',
                fontWeight: 700,
                fontSize: 14,
                background: hasSession ? 'rgba(74,222,128,0.15)' : isToday ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.03)',
                border: isToday ? '1.5px solid rgba(56,189,248,0.5)' : hasSession ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: hasSession ? '#4ade80' : isToday ? '#38bdf8' : 'var(--text-tertiary)',
              }}>
                {letter}
              </div>
              {isToday && <div style={{ width: 4, height: 4, borderRadius: 99, background: '#38bdf8' }} />}
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}

// ─── ErrorBankMini ───────────────────────────────────────────
function ErrorBankMini({ count, onReview }) {
  const hasErrors = count > 0

  return (
    <GlassPanel elevation={1} style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{hasErrors ? '📕' : '🎉'}</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 6 }}>بنك أخطائك</p>
      <p style={{ fontSize: 28, fontWeight: 900, color: hasErrors ? '#fb923c' : '#4ade80', fontFamily: 'Tajawal', marginBottom: 4 }}>
        {count}
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
        {hasErrors ? 'سؤال يحتاج مراجعة' : 'ما فيك أخطاء مسجلة'}
      </p>
      <button
        onClick={hasErrors ? onReview : undefined}
        disabled={!hasErrors}
        style={{
          padding: '8px 16px', borderRadius: 10, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: hasErrors ? 'pointer' : 'default',
          background: hasErrors ? 'rgba(251,146,60,0.15)' : 'rgba(255,255,255,0.03)',
          color: hasErrors ? '#fb923c' : 'var(--text-tertiary)',
          border: hasErrors ? '1px solid rgba(251,146,60,0.3)' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {hasErrors ? 'راجع الآن ←' : 'لا شيء للمراجعة'}
      </button>
    </GlassPanel>
  )
}

// ─── MockTestsWidget ─────────────────────────────────────────
function MockTestsWidget({ mocks, onStart, onNavigate }) {
  const inProgress = mocks?.inProgress
  const completed = mocks?.completed || []
  const n = completed.length

  let icon = '🧪', title, sub, cta, ctaFn

  if (inProgress) {
    icon = '⏳'
    title = 'لديك اختبار تجريبي لم يكتمل'
    sub = 'استأنف من حيث توقفت'
    cta = 'استأنف الاختبار'
    ctaFn = onStart
  } else if (n === 0) {
    title = 'ما سويت أي اختبار بعد'
    sub = 'الاختبار التجريبي يحاكي الامتحان الحقيقي'
    cta = 'ابدأ أول اختبار'
    ctaFn = onStart
  } else {
    icon = '🏆'
    title = `أتممت ${n} اختبار تجريبي`
    sub = 'استمر في التحسّن'
    cta = 'ابدأ اختبار جديد'
    ctaFn = onStart
  }

  return (
    <GlassPanel elevation={1} style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 6 }}>الاختبارات التجريبية</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 16 }}>{sub}</p>
      <button
        onClick={ctaFn}
        style={{
          padding: '8px 16px', borderRadius: 10, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          background: 'rgba(56,189,248,0.15)',
          color: '#38bdf8',
          border: '1px solid rgba(56,189,248,0.3)',
        }}
      >
        {cta} ←
      </button>
    </GlassPanel>
  )
}

// ─── RecentSessionsList ──────────────────────────────────────
function RecentSessionsList({ sessions }) {
  if (sessions.length === 0) {
    return (
      <GlassPanel elevation={1} style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
          ما عندك جلسات بعد
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          ابدأ أول تدريب وسيظهر هنا
        </p>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel elevation={1} style={{ padding: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
        <Clock size={14} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
        آخر الجلسات
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sessions.map(s => {
          const cfg = SKILL_CONFIG[s.skill_type] || SKILL_CONFIG.reading
          const Icon = cfg.icon
          const total = (s.correct_count || 0) + (s.incorrect_count || 0)
          const pct = total > 0 ? Math.round((s.correct_count / total) * 100) : null

          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} style={{ color: cfg.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                  {cfg.label}{s.question_type ? ` · ${s.question_type}` : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                  {formatRelative(s.started_at)}
                  {pct !== null && ` · دقة ${pct}%`}
                </div>
              </div>
              {s.band_score != null && (
                <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color, fontFamily: 'Tajawal', flexShrink: 0 }}>
                  {formatBand(s.band_score)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────
function HubSkeleton() {
  const pulse = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }
  return (
    <div className="space-y-5" style={{ maxWidth: 800, margin: '0 auto' }} dir="rtl">
      <div style={{ ...pulse, height: 56, width: 200 }} />
      <div style={{ ...pulse, height: 140 }} />
      <div style={{ ...pulse, height: 88 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ ...pulse, height: 100 }} />)}
      </div>
      <div style={{ ...pulse, height: 80 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ ...pulse, height: 140 }} />
        <div style={{ ...pulse, height: 140 }} />
      </div>
    </div>
  )
}

// ─── No Access Panel ─────────────────────────────────────────
function NoAccessPanel() {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 24 }} dir="rtl">
      <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(251,191,36,0.2)' }}>
          <Lock size={28} style={{ color: '#fbbf24' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, fontFamily: 'Tajawal' }}>
          هذه الخدمة متاحة لباقة IELTS
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.8, fontFamily: 'Tajawal' }}>
          تواصل مع المدرب لترقية باقتك والوصول لمحتوى IELTS الكامل
        </p>
        <button
          onClick={() => navigate('/student')}
          style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
        >
          العودة للرئيسية
        </button>
      </GlassPanel>
    </div>
  )
}
