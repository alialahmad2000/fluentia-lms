// تحليل الطالب العميق — /admin/student/:studentId/analysis
//
// The reports hub answers "what did this student do?". This page answers the
// harder question: "why is this student where they are, whose fault is it, and
// what do we do on Monday?" — by putting the student's ENGAGEMENT and the
// readiness of THEIR OWN COURSE side by side, then applying the rules in
// diagnose.js. Every claim on screen is traceable to a fact from one RPC.
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Flame, Zap, Clock3, CalendarDays, Layers, Target, Mic, ShieldCheck,
  AlertTriangle, Compass, Moon, MonitorSmartphone, Sparkles, BookOpenCheck,
  PenLine, Headphones, MessageSquare, GraduationCap, Wallet, ExternalLink, Eye,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useStudentDeepAnalysis } from './useStudentDeepAnalysis'
import {
  deriveCourse, deriveSignals, deriveVerdict, deriveActions, makeG, cnt,
  SKILL_AR, COUNTED_SKILLS, PRODUCTIVE_SKILLS, SEVERITY,
} from './diagnose'
import {
  card, ACCENTS, StatCard, ChartCard, EmptyNote, LoadingBlock,
  num, fmtMinutes, relTimeAr, shortDate, tooltipStyle, axisTick,
} from '../reports/reportKit'
import './analysis.css'

const SIGNAL_ICON = {
  moon: Moon, calendar: CalendarDays, clock: Clock3, compass: Compass,
  flame: Flame, mic: Mic, alert: AlertTriangle, shield: ShieldCheck, target: Target,
}

const SKILL_ICON = {
  reading: BookOpenCheck, grammar: GraduationCap, vocabulary: Sparkles,
  writing: PenLine, listening: Headphones, speaking: MessageSquare,
}

const TONE = {
  critical: ACCENTS.rose,
  high: '#f59e0b',
  medium: ACCENTS.gold,
  good: ACCENTS.emerald,
}

export default function StudentDeepAnalysis() {
  const { studentId } = useParams()
  const { data, isLoading, error } = useStudentDeepAnalysis(studentId)

  const model = useMemo(() => {
    if (!data || data.error) return null
    const student = data.student || {}
    const engagement = data.engagement || {}
    const skills = data.skills || []
    const g = makeG(student.gender)
    const course = deriveCourse(data.units || [], g, { custom: Boolean(student.uses_custom_curriculum) })
    const { signals, avgScore, productiveDone, sinceActive } =
      deriveSignals({ student, engagement, skills, course, today: data.today, g })
    return {
      g,
      student, engagement, skills, course, signals, avgScore, productiveDone, sinceActive,
      verdict: deriveVerdict({ signals, course, engagement, student, g }),
      actions: deriveActions({ signals, course, student, g }),
      daily: data.daily || [],
      sessions: data.sessions || [],
      devices: data.devices || [],
      timeline: data.timeline || [],
      today: data.today,
      generatedAt: data.generated_at,
    }
  }, [data])

  if (isLoading) {
    return <div dir="rtl" className="max-w-7xl mx-auto"><LoadingBlock rows={5} /></div>
  }
  if (error || data?.error || !model) {
    return (
      <div dir="rtl" className="max-w-7xl mx-auto pt-10 space-y-4">
        <EmptyNote text={data?.error === 'not_found' ? 'لم يُعثر على هذا الحساب' : 'تعذّر تحميل التحليل'} />
        <div className="text-center"><BackLink /></div>
      </div>
    )
  }

  const { student, engagement, course, verdict } = model

  return (
    <div dir="rtl" className="sda-root max-w-7xl mx-auto space-y-6 pb-20" data-track={student.theme_key || 'default'}>
      <div className="sda-atmo" aria-hidden="true"><i /></div>
      <div className="sda-scrim" aria-hidden="true" />

      <Masthead model={model} />
      <Verdict verdict={verdict} model={model} />
      <Kpis model={model} />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-4">
        <CourseRing model={model} />
        <SkillsPanel model={model} />
      </div>

      <Attendance model={model} />

      <div className="grid lg:grid-cols-2 gap-4">
        <SignalsPanel model={model} />
        <ActionsPanel model={model} />
      </div>

      <UnitsPanel model={model} />

      <div className="grid lg:grid-cols-2 gap-4">
        <SessionsPanel model={model} />
        <TimelinePanel model={model} />
      </div>

      <p className="text-xs text-slate-600 text-center pt-2">
        كل رقم في هذه الصفحة مقروء مباشرة من قاعدة البيانات لحظة الفتح — لا تقديرات ولا ذكاء اصطناعي.
        {' '}آخر تحديث: {relTimeAr(model.generatedAt)}
      </p>
    </div>
  )
}

/* ── masthead ─────────────────────────────────────────────────────────────── */
function Masthead({ model }) {
  const { student, course } = model
  const accent = student.theme_key === 'studio' ? '#d97706' : ACCENTS.sky
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0">
        <BackLink />
        <span
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold shrink-0"
          style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}
        >
          {(student.name || '؟').trim().charAt(0)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[28px] leading-tight font-extrabold text-slate-50 tracking-tight">{student.name}</h1>
            <span className="text-xs px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400">
              تحليل عميق
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            المستوى {student.academic_level ?? '؟'}
            {student.uses_custom_curriculum ? ` · مسار خاص (${cnt(course.unitsTotal, 'وحدة', 'وحدات')})` : ''}
            {student.trainer_name ? ` · المدرب: ${student.trainer_name}` : ''}
            {student.group_name ? ` · ${student.group_name}` : ' · فردي'}
            {' · '}{model.g('مسجّلة', 'مسجّل')} منذ {cnt(student.days_enrolled, 'يوم', 'أيام')}
          </p>
          {student.custom_mission_ar && (
            <p className="text-xs mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] text-amber-200/90">
              <Target size={11} /> «{student.custom_mission_ar}»
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <NavPill to={`/admin/student/${student.id}/report`} icon={ExternalLink} label="تقرير النشاط" />
        <NavPill to={`/admin/student/${student.id}/progress`} icon={GraduationCap} label="التقدّم" />
        <NavPill to="/admin/reports?tab=students" icon={Eye} label="كل الطلاب" />
      </div>
    </div>
  )
}

function NavPill({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs font-semibold text-slate-400 hover:text-slate-100 hover:border-white/[0.14] transition-colors"
    >
      <Icon size={12} /> {label}
    </Link>
  )
}

function BackLink() {
  return (
    <Link
      to="/admin/users"
      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors shrink-0"
    >
      <ArrowRight size={13} /> رجوع
    </Link>
  )
}

/* ── verdict ──────────────────────────────────────────────────────────────── */
function Verdict({ verdict, model }) {
  const color = TONE[verdict.tone] || ACCENTS.gold
  const { course, engagement, sinceActive } = model
  const chips = [
    { label: 'من المسار', value: `${course.coursePct}%` },
    { label: model.g('وحدات بدأتها', 'وحدات بدأها'), value: `${course.unitsStarted}/${course.unitsTotal}` },
    { label: model.g('أقسام أنجزتها', 'أقسام أنجزها'), value: num(engagement.sections_completed_rows) },
    { label: 'آخر نشاط', value: sinceActive == null ? '—' : sinceActive === 0 ? 'اليوم' : `قبل ${cnt(sinceActive, 'يوم', 'أيام')}` },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="sda-verdict"
      style={{ '--sda-verdict': color }}
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <div className="text-xs font-bold tracking-wide mb-2" style={{ color }}>الخلاصة</div>
          <h2 className="text-[22px] leading-snug font-extrabold text-slate-50">{verdict.headline}</h2>
          <p className="text-sm text-slate-300/90 mt-2 leading-relaxed">{verdict.line}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <div key={c.label} className="px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] min-w-[86px]">
              <div className="text-[17px] font-extrabold text-slate-100 tabular-nums leading-none" dir="auto">{c.value}</div>
              <div className="text-xs text-slate-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ── KPI row ──────────────────────────────────────────────────────────────── */
function Kpis({ model }) {
  const { engagement, student, avgScore } = model
  const items = [
    { icon: CalendarDays, label: 'أيام نشطة', value: num(engagement.active_days), sub: `من ${cnt(student.days_enrolled, 'يوم', 'أيام')} منذ التسجيل`, color: ACCENTS.sky },
    { icon: Clock3, label: 'دقائق تعلّم فعلي', value: fmtMinutes(engagement.learning_minutes), sub: cnt(engagement.sessions_total, 'جلسة دخول', 'جلسات دخول'), color: ACCENTS.gold },
    { icon: Layers, label: 'أقسام مكتملة', value: num(engagement.sections_completed_rows), sub: avgScore != null ? `بمتوسط ${avgScore}%` : 'لا درجات بعد', color: ACCENTS.emerald },
    { icon: Mic, label: 'إنتاج لغوي', value: num(model.productiveDone), sub: 'محادثة + كتابة + استماع', color: ACCENTS.rose },
    { icon: Flame, label: 'سلسلة الأيام', value: num(student.current_streak), sub: `الأطول: ${num(student.longest_streak)}`, color: '#f59e0b' },
    { icon: Zap, label: 'نقاط XP', value: num(student.xp_total), sub: cnt(engagement.saved_words, 'كلمة محفوظة', 'كلمات محفوظة'), color: ACCENTS.violet },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((it, i) => <StatCard key={it.label} {...it} index={i} />)}
    </div>
  )
}

/* ── course completion ring ───────────────────────────────────────────────── */
function CourseRing({ model }) {
  const { course, g } = model
  const R = 62
  const C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(100, course.coursePct))
  return (
    <ChartCard title={model.g('أين هي من مسارها', 'أين هو من مساره')} subtitle={`${num(course.sectionsDone)} من ${num(course.sectionsTotal)} قسمًا متاحًا في ${model.g('مسارها', 'مساره')}`}>
      <div className="flex items-center gap-6 flex-wrap">
        <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
          <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
            <motion.circle
              cx="75" cy="75" r={R} fill="none" stroke="url(#sdaRing)" strokeWidth="11" strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - (pct / 100) * C }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="sdaRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[34px] leading-none font-extrabold text-slate-50 tabular-nums" dir="ltr">{pct}%</span>
            <span className="text-xs text-slate-500 mt-1">من المسار</span>
          </div>
        </div>
        <div className="space-y-2.5 min-w-[160px] flex-1">
          <MiniRow label={g('وحدات بدأتها', 'وحدات بدأها')} value={`${course.unitsStarted} / ${course.unitsTotal}`} />
          <MiniRow label={g('وحدات أنهتها', 'وحدات أنهاها')} value={`${course.unitsFinished} / ${course.unitsTotal}`} />
          <MiniRow label="جاهزية المحتوى" value={`${course.readyPct}%`} tone={course.readyPct === 100 ? ACCENTS.emerald : ACCENTS.rose} />
          <MiniRow label="نواقص حرِجة" value={num(course.criticalGaps)} tone={course.criticalGaps ? ACCENTS.rose : ACCENTS.emerald} />
        </div>
      </div>
    </ChartCard>
  )
}

function MiniRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs border-b border-white/[0.04] pb-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold tabular-nums" dir="auto" style={{ color: tone || '#e2e8f0' }}>{value}</span>
    </div>
  )
}

/* ── skills ───────────────────────────────────────────────────────────────── */
function SkillsPanel({ model }) {
  const { skills, course, g } = model
  const byType = Object.fromEntries(skills.map((s) => [s.section_type, s]))
  // vocabulary is completed via either the vocab section or its exercises
  const resolve = (k) => (k === 'vocabulary'
    ? (byType.vocabulary || byType.vocabulary_exercise)
    : byType[k])

  const available = Object.fromEntries(
    COUNTED_SKILLS.map((k) => [k, course.units.reduce((s, u) => s + (u.inv[k] > 0 ? 1 : 0), 0)]),
  )

  return (
    <ChartCard
      title={g('المهارات — ماذا لمست وماذا لم تلمس', 'المهارات — ماذا لمس وماذا لم يلمس')}
      subtitle="المهارات الإنتاجية (محادثة · كتابة · استماع) هي التي تُترجم إلى طلاقة فعلية"
    >
      <div className="space-y-3">
        {COUNTED_SKILLS.map((k) => {
          const row = resolve(k)
          const done = Number(row?.completed) || 0
          const avail = available[k] || 0
          const pct = avail ? Math.round((done / avail) * 100) : 0
          const productive = PRODUCTIVE_SKILLS.includes(k)
          const Icon = SKILL_ICON[k] || Sparkles
          const color = done === 0 ? (productive ? ACCENTS.rose : ACCENTS.slate) : pct >= 60 ? ACCENTS.emerald : ACCENTS.gold
          return (
            <div key={k}>
              <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                <span className="text-slate-300 inline-flex items-center gap-1.5 min-w-0">
                  <Icon size={12} style={{ color }} />
                  <span className="font-semibold">{SKILL_AR[k]}</span>
                  {productive && <span className="text-xs text-slate-600">· إنتاجية</span>}
                  {row?.avg_score != null && <span className="text-slate-500">· متوسط {Number(row.avg_score)}%</span>}
                </span>
                <span className="tabular-nums font-bold shrink-0" dir="ltr" style={{ color }}>
                  {done}/{avail}
                </span>
              </div>
              <div className="sda-bar">
                <span style={{ width: `${pct}%`, background: color, opacity: done === 0 ? 0 : 1 }} />
              </div>
              {done === 0 && (
                <p className="text-xs mt-1" style={{ color: productive ? 'rgba(251,113,133,0.75)' : '#64748b' }}>
                  {productive ? 'لم تُنجَز ولا مرة — هذه هي الفجوة الحقيقية' : 'لم تُنجَز بعد'}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

/* ── attendance strip + minutes chart ─────────────────────────────────────── */
function Attendance({ model }) {
  const { daily, today, student, g } = model
  const days = useMemo(() => {
    const map = new Map(daily.map((d) => [d.activity_date, d]))
    const end = new Date(`${today}T00:00:00Z`)
    const out = []
    for (let i = 59; i >= 0; i--) {
      const dt = new Date(end)
      dt.setUTCDate(dt.getUTCDate() - i)
      const key = dt.toISOString().slice(0, 10)
      const row = map.get(key)
      const sections = Number(row?.sections_completed) || 0
      const mins = Number(row?.minutes) || 0
      const lvl = sections > 0 ? 3 : mins > 0 ? 2 : row ? 1 : 0
      out.push({ key, row, lvl, isToday: i === 0, beforeEnrol: student.enrollment_date && key < student.enrollment_date })
    }
    return out
  }, [daily, today, student.enrollment_date])

  const chart = daily.map((d) => ({ ...d, day: shortDate(d.activity_date), minutes: Number(d.minutes) || 0 }))
  const silent = days.filter((d) => !d.beforeEnrol && d.lvl === 0).length

  return (
    <ChartCard
      title="نبض الحضور — آخر ٦٠ يومًا"
      subtitle={`${silent} يومًا صامتًا منذ التسجيل · المربّع الأخضر = يوم ${g('أنجزت', 'أنجز')} فيه قسمًا، الذهبي = ${g('دخلت', 'دخل')} فقط`}
    >
      <div className="grid gap-1 mb-5" style={{ gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}>
        {days.map((d) => (
          <div
            key={d.key}
            className="sda-day"
            data-lvl={d.lvl}
            data-today={d.isToday ? 'true' : undefined}
            style={d.beforeEnrol ? { opacity: 0.25 } : undefined}
            title={`${d.key}${d.row ? ` — ${d.row.sections_completed || 0} قسم · ${d.row.minutes || 0} دقيقة` : ' — لا نشاط'}`}
          />
        ))}
      </div>
      {chart.length === 0 ? <EmptyNote text="لا أيام نشاط مسجّلة" /> : (
        <div dir="ltr" className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="sdaMin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENTS.gold} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={ACCENTS.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [num(v), 'دقيقة']} />
              <Area type="monotone" dataKey="minutes" stroke={ACCENTS.gold} strokeWidth={2} fill="url(#sdaMin)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

/* ── signals ──────────────────────────────────────────────────────────────── */
function SignalsPanel({ model }) {
  const { signals } = model
  return (
    <ChartCard title="الإشارات" subtitle="ما تقوله البيانات — مرتّبة بالخطورة، والإيجابي في الأسفل">
      <div className="space-y-2">
        {signals.map((s, i) => {
          const meta = SEVERITY[s.severity]
          const Icon = SIGNAL_ICON[s.icon] || AlertTriangle
          return (
            <motion.div
              key={s.code}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              className="rounded-xl border px-3.5 py-3"
              style={{ borderColor: `${meta.color}25`, background: `${meta.color}0a` }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${meta.color}1a`, border: `1px solid ${meta.color}30` }}
                >
                  <Icon size={13} style={{ color: meta.color }} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-100">{s.title}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ color: meta.color, background: `${meta.color}14` }}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
        {signals.length === 0 && <EmptyNote text="لا إشارات — الوضع مستقر" icon={ShieldCheck} tone={ACCENTS.emerald} />}
      </div>
    </ChartCard>
  )
}

/* ── actions ──────────────────────────────────────────────────────────────── */
function ActionsPanel({ model }) {
  const { actions } = model
  return (
    <ChartCard title="ماذا نفعل" subtitle="مرتّبة بالأثر — الأول أولًا">
      <div className="space-y-2.5">
        {actions.map((a, i) => (
          <div key={a.title} className={`${card} p-3.5 flex items-start gap-3`}>
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-extrabold tabular-nums"
              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: ACCENTS.gold }}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-100">{a.title}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.07] text-slate-400">{a.owner}</span>
                <span className="text-xs text-slate-600">· {a.effort}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{a.why}</p>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

/* ── units ────────────────────────────────────────────────────────────────── */
function UnitsPanel({ model }) {
  const { course, g } = model
  return (
    <ChartCard
      title={g('مسارها وحدةً وحدة', 'مساره وحدةً وحدة')}
      subtitle={`${g('تقدّمها', 'تقدّمه')} مقابل جاهزية المحتوى — الوحدة المعلّمة بالأحمر فيها ما يمنع الوصول إلى 100%`}
      footnote="النِّسب تُحتسب على ٦ أقسام: قراءة · قواعد · مفردات · كتابة · استماع · محادثة"
    >
      <ExtraTracks model={model} />

      <div className="grid md:grid-cols-2 gap-2.5">
        {course.units.map((u) => (
          <div key={u.id} className="sda-unit p-3.5" data-blocking={u.blocking ? 'true' : 'false'}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-500 tabular-nums">#{u.ord}</span>
                  <span className="text-sm font-bold text-slate-100 truncate">{u.theme_ar}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 truncate" dir="ltr">{u.theme_en}</p>
              </div>
              <span className="text-sm font-extrabold tabular-nums shrink-0" dir="ltr" style={{ color: u.pct >= 100 ? ACCENTS.emerald : u.pct > 0 ? ACCENTS.gold : '#475569' }}>
                {u.pct}%
              </span>
            </div>

            <div className="sda-bar mb-2.5"><span style={{ width: `${u.pct}%` }} /></div>

            <div className="flex flex-wrap gap-1">
              {COUNTED_SKILLS.map((k) => {
                const present = u.inv[k] > 0
                const broken = u.gaps.some((g) => g.skill === k && (g.severity === 'critical' || g.severity === 'high'))
                const done = u.breakdown?.completion?.[`${k}_done`]
                const isDone = k === 'vocabulary'
                  ? Boolean(u.breakdown?.completion?.vocabulary_section_done)
                  : Number(done) > 0
                const color = !present || broken ? ACCENTS.rose : isDone ? ACCENTS.emerald : '#64748b'
                return (
                  <span
                    key={k}
                    className="text-xs px-1.5 py-0.5 rounded-md border"
                    style={{ color, borderColor: `${color}2e`, background: `${color}12` }}
                    title={!present ? 'غير موجود' : broken ? 'ناقص' : isDone ? 'مكتمل' : 'متاح ولم يُنجَز'}
                  >
                    {SKILL_AR[k]}
                  </span>
                )
              })}
            </div>

            {u.gaps.length > 0 && (
              <ul className="mt-2 space-y-1">
                {u.gaps.filter((g) => g.severity !== 'low').map((g) => (
                  <li key={g.code} className="text-xs flex items-center gap-1.5" style={{ color: SEVERITY[g.severity].color }}>
                    <AlertTriangle size={10} /> {g.text}
                  </li>
                ))}
              </ul>
            )}

            {u.last_touched && (
              <p className="text-xs text-slate-600 mt-2">آخر عمل فيها {relTimeAr(u.last_touched)}</p>
            )}
          </div>
        ))}
        {course.units.length === 0 && <EmptyNote text={g('لا توجد وحدات مرتبطة بهذه الطالبة', 'لا توجد وحدات مرتبطة بهذا الطالب')} />}
      </div>
    </ChartCard>
  )
}

/* ── extra tracks live outside curriculum_units — say so instead of pretending
      the unit grid is the whole picture ─────────────────────────────────────── */
const EXTRA_TRACKS = [
  { key: 'uses_biz_track',      label: 'مسار الأعمال',    to: '/biz' },
  { key: 'uses_tech_track',     label: 'مسار التقنية',     to: '/tech' },
  { key: 'uses_env_track',      label: 'مسار البيئة',      to: '/env' },
  { key: 'uses_speaking_track', label: 'مسار المحادثة',    to: null },
  { key: 'uses_pro_desk',       label: 'مكتب المحترفين',   to: '/desk' },
  { key: 'uses_ielts_home',     label: 'واجهة IELTS',      to: null },
]

function ExtraTracks({ model }) {
  const { student } = model
  const active = EXTRA_TRACKS.filter((t) => student[t.key])
  const extraLevels = Array.isArray(student.extra_curriculum_levels) ? student.extra_curriculum_levels : []
  if (!active.length && !extraLevels.length) return null
  return (
    <div className="mb-3 rounded-xl border border-sky-400/15 bg-sky-400/[0.05] px-3.5 py-3">
      <p className="text-xs text-sky-200/90 leading-relaxed">
        <strong className="font-bold">محتوى إضافي خارج هذه الوحدات:</strong>{' '}
        {active.map((t) => t.label).join(' · ')}
        {extraLevels.length ? `${active.length ? ' · ' : ''}مستويات إضافية: ${extraLevels.join('، ')}` : ''}
        {' — '}تقدّمه محفوظ في جداول منفصلة ولا يدخل في النِّسب أعلاه.
      </p>
    </div>
  )
}

/* ── sessions + devices ───────────────────────────────────────────────────── */
function SessionsPanel({ model }) {
  const { sessions, devices, engagement, g } = model
  return (
    <ChartCard
      title={g('كيف تدخل المنصة', 'كيف يدخل المنصة')}
      subtitle={engagement.client_errors > 0
        ? `${cnt(engagement.client_errors, 'خطأ واجهة', 'أخطاء واجهة')} على ${g('حسابها', 'حسابه')}`
        : `صفر أخطاء واجهة على ${g('حسابها', 'حسابه')}`}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {devices.map((d, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-300">
            <MonitorSmartphone size={11} className="text-sky-400" />
            {d.device} / {d.browser}
            <span className="text-slate-600 tabular-nums">×{num(d.sessions)}</span>
          </span>
        ))}
        {devices.length === 0 && <EmptyNote text="لا جلسات مسجّلة" />}
      </div>
      <div className="space-y-1.5 max-h-56 overflow-y-auto pe-1">
        {sessions.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-white/[0.04]">
            <span className="text-slate-400">{relTimeAr(s.started_at)}</span>
            <span className="text-slate-500 tabular-nums" dir="ltr">
              {num(s.pages_visited || 0)} صفحة · {s.device}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

/* ── timeline ─────────────────────────────────────────────────────────────── */
const TIMELINE_AR = { section: 'أكملت', speaking: 'سجّلت', saved_word: 'حفظت' }

function TimelinePanel({ model }) {
  const { timeline, g } = model
  return (
    <ChartCard title={g('كل ما فعلته حتى الآن', 'كل ما فعله حتى الآن')} subtitle="السجل الكامل — لا عيّنة">
      <div className="space-y-1.5 max-h-72 overflow-y-auto pe-1">
        {timeline.map((t, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-white/[0.04]">
            <span className="text-slate-300 truncate">
              {TIMELINE_AR[t.kind] || t.kind}{' '}
              <span className="font-semibold">{SKILL_AR[t.label] || t.label}</span>
              {t.unit && <span className="text-slate-600"> · {t.unit}</span>}
            </span>
            <span className="text-slate-600 shrink-0 tabular-nums">
              {t.score != null && <span className="text-emerald-400/90" dir="ltr">{Math.round(Number(t.score))}% · </span>}
              {relTimeAr(t.happened_at)}
            </span>
          </div>
        ))}
        {timeline.length === 0 && <EmptyNote text="لا نشاط مسجّل بعد" />}
      </div>
      {timeline.length > 0 && (
        <p className="text-xs text-slate-600 mt-3 inline-flex items-center gap-1.5">
          <Wallet size={11} /> إجمالي {cnt(timeline.length, 'حدث', 'أحداث')} منذ التسجيل
        </p>
      )}
    </ChartCard>
  )
}
