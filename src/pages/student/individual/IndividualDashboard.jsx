import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Briefcase, CheckCircle2, Clock3, MessageSquare, BookMarked } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { useIndividualTrack } from '@/hooks/useIndividualTrack'
import './individual.css'

/* The INDIVIDUAL (1-on-1) student home — an "executive briefing", not a gamified deck.
   Obsidian + one brass accent. No group widgets (leaderboard/team/next-class) by design. */

function greeting(hour) {
  if (hour < 12) return 'صباح الإنجاز'
  if (hour < 18) return 'مساء التركيز'
  return 'مساء الهدوء'
}

export default function IndividualDashboard() {
  const profile = useAuthStore((s) => s.profile)
  const g = useG()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { specialization, loading, items, completedCount, total, trackPercent, nextModule, avgScore, wordsLearned } =
    useIndividualTrack()

  const firstName = useMemo(() => {
    const n = profile?.display_name || profile?.full_name || ''
    return n.trim().split(/\s+/)[0] || ''
  }, [profile])

  const hour = new Date().getHours()
  const fade = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }

  // ring geometry — always show a brass spark, even at 0%
  const R = 52
  const C = 2 * Math.PI * R
  const dash = C * (1 - Math.max(trackPercent, 2.5) / 100)

  // compact index: current + the 2 after it (completed ones collapse into the count line)
  const compactItems = useMemo(() => {
    const list = items || []
    const currentIdx = list.findIndex((i) => i.isCurrent)
    if (currentIdx === -1) return list.slice(-3)
    return list.slice(currentIdx, currentIdx + 3)
  }, [items])

  return (
    <div className="iv-root relative" dir="rtl">
      <div className="iv-atmo" aria-hidden="true" />

      {/* ── Hero: the briefing header (one anchored panel) ── */}
      <motion.section {...fade} className="relative pt-2 pb-8">
        <div className="iv-rule mb-4">
          <span className="iv-eyebrow">{specialization?.title_en || 'Individual Track'}</span>
        </div>
        <div className="iv-panel iv-panel--lit p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-7">
            <div className="min-w-0">
              <h1 className="font-['Tajawal'] font-bold leading-tight" style={{ fontSize: 'clamp(26px, 4vw, 38px)' }}>
                {greeting(hour)}{firstName ? `، ${firstName}` : ''}
              </h1>
              <p className="mt-2.5 text-[15px]" style={{ color: 'var(--iv-text-2)', maxWidth: '52ch', lineHeight: 1.85 }}>
                {specialization
                  ? <>برنامجك الخاص في <span style={{ color: 'var(--iv-brass-bright)', fontWeight: 700 }}>{specialization.title_ar}</span> — {specialization.tagline_ar}</>
                  : <>برنامجك الفردي قيد التجهيز — {g('تواصل', 'تواصلي')} مع مدربك.</>}
              </p>
            </div>

            {/* progress ring — anchored inside the hero panel */}
            <div className="shrink-0 self-center" style={{ width: 124, height: 124, position: 'relative' }}>
              <svg width="124" height="124" viewBox="0 0 124 124" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="62" cy="62" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
                <motion.circle
                  cx="62" cy="62" r={R} fill="none"
                  stroke="url(#ivBrass)" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={C}
                  initial={reduce ? { strokeDashoffset: dash } : { strokeDashoffset: C }}
                  animate={{ strokeDashoffset: dash }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
                <defs>
                  <linearGradient id="ivBrass" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--iv-brass-bright)" />
                    <stop offset="100%" stopColor="var(--iv-brass)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="iv-display" style={{ fontSize: 28 }}>{trackPercent}%</span>
                <span className="text-[12px] font-['Tajawal']" style={{ color: 'var(--iv-text-3)' }}>
                  {trackPercent === 0 ? 'نبدأ اليوم' : `${completedCount}/${total} مهمة`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Next mission: the dossier card ── */}
      <motion.section {...fade} className="relative mb-8">
        <div className="iv-rule mb-4"><span className="iv-eyebrow">المهمة القادمة</span></div>
        {loading ? (
          <div className="iv-panel p-7 animate-pulse" style={{ height: 148 }} />
        ) : nextModule ? (
          <div
            className="iv-panel iv-panel--lit iv-panel-interactive p-6 sm:p-7 cursor-pointer group"
            onClick={() => navigate(`/student/track/${nextModule.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/student/track/${nextModule.id}`) }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="iv-step-num" style={{ borderColor: 'var(--iv-brass)', color: 'var(--iv-brass-bright)' }}>
                  {nextModule.module_number}
                </div>
                <div className="min-w-0">
                  <h2 className="font-['Tajawal'] font-bold text-[20px] leading-snug">{nextModule.title_ar}</h2>
                  <p className="mt-1.5 text-[14px]" style={{ color: 'var(--iv-text-2)', lineHeight: 1.85, maxWidth: '58ch' }}>
                    {nextModule.scenario_ar}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-[12px]" style={{ color: 'var(--iv-text-3)' }}>
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> {nextModule.estimated_minutes} دقيقة تقريبًا</span>
                    {nextModule.completion > 0 && <span style={{ color: 'var(--iv-brass)' }}>{nextModule.completion}% مكتملة</span>}
                  </div>
                </div>
              </div>
              <button
                className="iv-btn iv-btn--brass w-full sm:w-auto shrink-0 sm:self-center"
                onClick={(e) => { e.stopPropagation(); navigate(`/student/track/${nextModule.id}`) }}
              >
                {nextModule.completion > 0 ? g('أكمل المهمة', 'أكملي المهمة') : g('ابدأ المهمة', 'ابدئي المهمة')}
                <ArrowLeft size={17} />
              </button>
            </div>
          </div>
        ) : total > 0 ? (
          <div className="iv-panel iv-panel--lit p-7 text-center">
            <CheckCircle2 size={34} style={{ color: 'var(--iv-brass)', margin: '0 auto 10px' }} />
            <h2 className="font-['Tajawal'] font-bold text-[19px]">المسار مكتمل — إنجاز يستحق التقدير</h2>
            <p className="mt-1 text-[14px]" style={{ color: 'var(--iv-text-2)' }}>
              {g('أنهيت', 'أنهيتِ')} جميع مهام المسار. مدربك سيرتب معك الخطوة القادمة.
            </p>
          </div>
        ) : (
          <div className="iv-panel p-7 text-center">
            <Briefcase size={30} style={{ color: 'var(--iv-text-3)', margin: '0 auto 10px' }} />
            <p className="text-[14px]" style={{ color: 'var(--iv-text-2)' }}>لم يُسند لك مسار مهني بعد — يرجى التواصل مع الإدارة.</p>
          </div>
        )}
      </motion.section>

      {/* ── KPIs ── */}
      <motion.section {...fade} className="relative mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="iv-kpi">
            <span className="iv-kpi-num">{completedCount}<span style={{ fontSize: 17, color: 'var(--iv-text-3)' }}> / {total}</span></span>
            <span className="iv-kpi-label">مهام مكتملة</span>
          </div>
          <div className="iv-kpi">
            <span className="iv-kpi-num">{wordsLearned}</span>
            <span className="iv-kpi-label">مصطلحات مهنية</span>
          </div>
          <div className="iv-kpi">
            {avgScore != null ? (
              <span className="iv-kpi-num">{avgScore}<span style={{ fontSize: 17, color: 'var(--iv-text-3)' }}> / 10</span></span>
            ) : (
              <span className="iv-kpi-num" style={{ fontSize: 17, lineHeight: '30px', color: 'var(--iv-text-2)', fontFamily: "'Tajawal', sans-serif" }}>بعد أول محادثة</span>
            )}
            <span className="iv-kpi-label">متوسط تقييم المحادثات</span>
          </div>
          <div className="iv-kpi">
            <span className="iv-kpi-num">{total - completedCount}</span>
            <span className="iv-kpi-label">مهام متبقية</span>
          </div>
        </div>
      </motion.section>

      {/* ── Track index (genuinely compact: current + next two) ── */}
      <motion.section {...fade} className="relative mb-8">
        <div className="iv-rule mb-4">
          <span className="iv-eyebrow">فهرس المسار</span>
        </div>
        <div className="iv-panel p-3 sm:p-4">
          {completedCount > 0 && (
            <p className="px-4 pt-2 pb-1 text-[12.5px] font-['Tajawal']" style={{ color: 'var(--iv-brass)' }}>
              ✓ {completedCount} {completedCount === 1 ? 'مهمة مكتملة' : 'مهام مكتملة'}
            </p>
          )}
          {compactItems.map((m, idx) => (
            <div
              key={m.id}
              className={`iv-step ${m.completed ? 'iv-step--done' : ''} ${m.isCurrent ? 'iv-step--current' : ''} ${m.locked ? 'iv-step--locked' : 'iv-step--open'}`}
              onClick={() => { if (!m.locked) navigate(`/student/track/${m.id}`) }}
              role={m.locked ? undefined : 'button'}
              tabIndex={m.locked ? -1 : 0}
              onKeyDown={(e) => { if (e.key === 'Enter' && !m.locked) navigate(`/student/track/${m.id}`) }}
            >
              <div className="iv-step-num">{m.completed ? '✓' : m.module_number}</div>
              <div className="flex-1 min-w-0">
                <div className="font-['Tajawal'] font-bold text-[15px] truncate" data-title-ar>{m.title_ar}</div>
                <div className="text-[12.5px] truncate" style={{ color: 'var(--iv-text-3)' }}>{m.title_en}</div>
              </div>
              <div className="text-[12px] shrink-0 font-['Tajawal']" style={{ color: m.completed ? 'var(--iv-brass)' : 'var(--iv-text-3)' }}>
                {m.completed ? 'مكتملة' : m.isCurrent ? 'الحالية' : m.locked ? <span className="iv-pos">بعد المهمة {m.module_number - 1}</span> : `${m.completion}%`}
              </div>
              {idx < compactItems.length - 1 && <span className="iv-spine" aria-hidden="true" />}
            </div>
          ))}
          {!loading && !(items || []).length && (
            <p className="p-5 text-center text-[14px] font-['Tajawal']" style={{ color: 'var(--iv-text-3)' }}>مهامك قيد الإعداد — ستظهر هنا قريبًا.</p>
          )}
          {(items || []).length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <button className="iv-btn iv-btn--ghost w-full" style={{ height: 42 }} onClick={() => navigate('/student/track')}>
                عرض المسار كاملًا <ArrowLeft size={15} />
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Quiet shortcuts ── */}
      <motion.section {...fade} className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button className="iv-panel iv-panel-interactive p-5 flex items-center gap-4 text-start" onClick={() => navigate('/chat')}>
            <span className="iv-step-num" style={{ width: 44, height: 44 }}><MessageSquare size={18} /></span>
            <span>
              <span className="block font-['Tajawal'] font-bold text-[15px]">{g('تواصل مع مدربك', 'تواصلي مع مدربك')}</span>
              <span className="block text-[12.5px] mt-0.5" style={{ color: 'var(--iv-text-3)' }}>رسالة مباشرة في أي وقت</span>
            </span>
          </button>
          <button className="iv-panel iv-panel-interactive p-5 flex items-center gap-4 text-start" onClick={() => navigate('/library')}>
            <span className="iv-step-num" style={{ width: 44, height: 44 }}><BookMarked size={18} /></span>
            <span>
              <span className="block font-['Tajawal'] font-bold text-[15px]">المكتبة</span>
              <span className="block text-[12.5px] mt-0.5" style={{ color: 'var(--iv-text-3)' }}>قراءة ثنائية اللغة لإثراء لغتك</span>
            </span>
          </button>
        </div>
      </motion.section>
    </div>
  )
}
