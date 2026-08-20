import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Clock, ListChecks, Target, Sparkles, Mic, FileText, Flame,
  CalendarDays, ChevronRight, TrendingUp, BookOpen,
} from 'lucide-react'
import { useStudentPerformance } from '@/hooks/teacher/useStudentPerformance'
import { useStudentDetail } from '@/hooks/teacher/useStudentDetail'
import { studentName, fmtMinutes } from '@/hooks/teacher/useTeacherRoster'

const WINDOWS = [
  ['today', 'اليوم'],
  ['week', 'آخر 7 أيام'],
  ['month', 'آخر 30 يوماً'],
  ['all', 'المدى الكامل'],
]

function arabicDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('ar', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(Date.UTC(y, m - 1, d)))
}

function Stat({ icon: Icon, value, label, tone = '#38bdf8', hint }) {
  return (
    <div className="tea-stat">
      <span className="tea-stat__icon" style={{ background: `${tone}1c`, color: tone }}><Icon size={16} /></span>
      <div className="min-w-0">
        <div className="tea-stat__value">{value}</div>
        <div className="tea-stat__label">{label}</div>
        {hint && <div className="tea-stat__hint">{hint}</div>}
      </div>
    </div>
  )
}

/**
 * Day-by-day learning minutes. Bars are drawn from the dense series so an
 * inactive day is a visible gap rather than a missing column — the shape of
 * someone's week is the point, not the totals.
 */
function ActivityChart({ series }) {
  const [hover, setHover] = useState(null)
  const shown = series.slice(-56)
  const peak = Math.max(60, ...shown.map((d) => d.learningSec))
  const active = shown.filter((d) => d.active).length

  return (
    <div className="tea-card">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="tea-section-title !mb-0"><TrendingUp size={15} /> نبض التعلّم — آخر 8 أسابيع</div>
        <span className="text-[12px] text-slate-500">{active} يوم نشِط من {shown.length}</span>
      </div>

      <div className="tea-chart" onMouseLeave={() => setHover(null)}>
        {shown.map((d) => {
          const h = d.learningSec ? Math.max(6, Math.round((d.learningSec / peak) * 100)) : 0
          const isHover = hover?.date === d.date
          return (
            <button
              key={d.date}
              type="button"
              className={`tea-chart__col${isHover ? ' is-hover' : ''}`}
              onMouseEnter={() => setHover(d)}
              onFocus={() => setHover(d)}
              aria-label={`${arabicDay(d.date)}: ${d.active ? fmtMinutes(d.learningSec) : 'لا نشاط'}`}
            >
              {h > 0
                ? <span className="tea-chart__bar" style={{ height: `${h}%` }} />
                : <span className="tea-chart__gap" />}
            </button>
          )
        })}
      </div>

      <div className="tea-chart__readout">
        {hover ? (
          <>
            <span className="font-bold text-slate-200">{arabicDay(hover.date)}</span>
            {hover.active ? (
              <>
                <span className="text-slate-500">·</span>
                <span>{fmtMinutes(hover.learningSec)}</span>
                <span className="text-slate-500">·</span>
                <span>{hover.sections} مهمة</span>
                {hover.avgScore != null && (<><span className="text-slate-500">·</span><span>{Math.round(hover.avgScore)}%</span></>)}
              </>
            ) : (
              <><span className="text-slate-500">·</span><span className="text-slate-500">لا نشاط</span></>
            )}
          </>
        ) : (
          <span className="text-slate-500">مرّر على أي يوم لتفصيله</span>
        )}
      </div>
    </div>
  )
}

/** Week-by-week rollup — the view that shows whether a habit is forming. */
function WeeklyRollup({ series }) {
  const weeks = useMemo(() => {
    const out = []
    for (let i = series.length; i > 0; i -= 7) {
      const chunk = series.slice(Math.max(0, i - 7), i)
      if (!chunk.length) continue
      out.push({
        from: chunk[0].date,
        to: chunk[chunk.length - 1].date,
        learningSec: chunk.reduce((a, d) => a + d.learningSec, 0),
        sections: chunk.reduce((a, d) => a + d.sections, 0),
        activeDays: chunk.filter((d) => d.active).length,
      })
    }
    return out.slice(0, 8)
  }, [series])

  const peak = Math.max(1, ...weeks.map((w) => w.learningSec))

  return (
    <div className="tea-card">
      <div className="tea-section-title"><CalendarDays size={15} /> أسبوعاً بأسبوع</div>
      {weeks.every((w) => !w.activeDays) ? (
        <div className="text-[13px] text-slate-500">لا يوجد نشاط مسجّل في هذه الفترة.</div>
      ) : (
        <div className="space-y-2">
          {weeks.map((w) => (
            <div key={w.from} className="flex items-center gap-3">
              <div className="text-[12px] text-slate-400 w-[86px] shrink-0">{arabicDay(w.from)}</div>
              <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.round((w.learningSec / peak) * 100)}%`,
                  background: 'linear-gradient(90deg,#38bdf8,#7dd3fc)',
                }} />
              </div>
              <div className="text-[12px] text-slate-300 w-[64px] text-end shrink-0">{fmtMinutes(w.learningSec)}</div>
              <div className="text-[11.5px] text-slate-500 w-[54px] text-end shrink-0">{w.activeDays}/7 أيام</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StudentPerformance() {
  const { studentId } = useParams()
  const [win, setWin] = useState('week')
  const { data: perf, isLoading } = useStudentPerformance(studentId, 90)
  const { data: detail } = useStudentDetail(studentId)

  const name = detail?.student ? studentName(detail.student) : ''

  if (isLoading || !perf) {
    return <div className="tea-page space-y-3"><div className="tea-skel h-28" /><div className="tea-skel h-44" /><div className="tea-skel h-52" /></div>
  }

  const b = perf[win]
  const windowLabel = WINDOWS.find(([k]) => k === win)?.[1] || ''

  return (
    <div className="tea-page space-y-5">
      <div className="tea-hero">
        <div className="tea-hero__glow" aria-hidden="true" />
        <div className="relative">
          <Link to={`/trainer/students/${studentId}`} className="text-[12.5px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
            <ChevronRight size={14} /> ملف {name || 'الطالب'}
          </Link>
          <h1 className="text-[25px] font-extrabold text-slate-100 mt-1.5">الأداء عبر الوقت</h1>
          <p className="text-[13.5px] text-slate-400 mt-1">
            كل ما سجّلته المنصّة عن {name || 'الطالب'} — يوماً بيوم وأسبوعاً بأسبوع، حتى تدخل الحصة وأنت تعرف أين وصل.
          </p>
          <div className="flex flex-wrap gap-2 mt-3.5">
            <span className="tea-pill tea-pill--gold"><Flame size={13} /> {perf.streak} يوم متتالٍ</span>
            <span className="tea-pill tea-pill--sky"><Target size={13} /> انتظام {perf.consistency}%</span>
            <span className="tea-pill">
              {perf.lastActive ? `آخر نشاط: ${arabicDay(perf.lastActive)}` : 'لا نشاط مسجّل بعد'}
            </span>
          </div>
        </div>
      </div>

      <div className="tea-tabs" role="tablist">
        {WINDOWS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={win === k}
            className={`tea-tab${win === k ? ' is-active' : ''}`} onClick={() => setWin(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat icon={Clock}      tone="#38bdf8" value={fmtMinutes(b.learningSec)} label="وقت التعلّم" hint={windowLabel} />
        <Stat icon={ListChecks} tone="#4ade80" value={b.sections}                label="مهمة مكتملة" hint={windowLabel} />
        <Stat icon={Target}     tone="#fbbf24" value={b.avgScore != null ? `${b.avgScore}%` : '—'} label="متوسّط الدرجة" hint={b.avgScore == null ? 'لا درجات في الفترة' : windowLabel} />
        <Stat icon={Sparkles}   tone="#a78bfa" value={b.words}                    label="كلمة أتقنها" hint={windowLabel} />
        <Stat icon={FileText}   tone="#2dd4bf" value={b.submissions}              label="تسليم" hint={windowLabel} />
        <Stat icon={Mic}        tone="#fb7185" value={b.recordings}               label="تسجيل صوتي" hint={windowLabel} />
      </div>

      <div className="tea-card !py-3.5">
        <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <span className="text-slate-400">
            نشِط <b className="text-slate-200">{b.days}</b> {b.days === 1 ? 'يوماً' : 'يوم'} في {windowLabel}
          </span>
          <span className="text-slate-500">
            المدى الكامل: {perf.activeDays} يوم نشِط · {fmtMinutes(perf.all.learningSec)} · {perf.all.sections} مهمة
          </span>
        </div>
      </div>

      <ActivityChart series={perf.series} />
      <WeeklyRollup series={perf.series} />

      <Link to={`/trainer/students/${studentId}/content`} className="tea-card tea-card--hover flex items-center gap-3">
        <span className="tea-stat__icon" style={{ background: '#38bdf81c', color: '#38bdf8' }}><BookOpen size={16} /></span>
        <div className="flex-1">
          <div className="text-[14px] font-bold text-slate-100">افتح محتوى {name || 'الطالب'} بالتفصيل</div>
          <div className="text-[12.5px] text-slate-400">الوحدات التي يدرسها فعلاً، وما أنجزه في كل قسم</div>
        </div>
        <ChevronRight size={17} className="text-slate-600 rotate-180" />
      </Link>
    </div>
  )
}
