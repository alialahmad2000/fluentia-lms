// التقرير التفصيلي للطالب — /admin/reports/student/:studentId
// Wraps the canonical per-student activity report (same rollup the academy
// digest uses) + admin extras: sessions/devices, client errors, AI cost,
// recordings. Reached by clicking a row in the Students tab.
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowRight, Flame, Zap, Clock3, Layers, BookOpenCheck, Mic, Bug, CheckCircle2,
  MonitorSmartphone, Wallet, GraduationCap,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useStudentReportDetail } from './useAdminReports'
import {
  card, ACCENTS, StatCard, ChartCard, RangePicker, LoadingBlock, EmptyNote, VALID_DAYS,
  SECTION_AR, AI_TYPE_AR, num, fmtMinutes, fmtSAR, relTimeAr, shortDate, tooltipStyle, axisTick,
} from './reportKit'

export default function StudentReportDetail() {
  const { studentId } = useParams()
  const [params, setParams] = useSearchParams()
  const days = VALID_DAYS.includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const { data, isLoading, error } = useStudentReportDetail(studentId, days)

  if (isLoading) return <div dir="rtl" className="max-w-6xl mx-auto"><LoadingBlock rows={4} /></div>
  if (error || data?.base?.error) {
    return (
      <div dir="rtl" className="max-w-6xl mx-auto pt-10">
        <EmptyNote text="تعذّر تحميل تقرير الطالب" />
        <div className="text-center"><BackLink /></div>
      </div>
    )
  }

  const base = data.base || {}
  const st = base.student || {}
  const totals = base.totals || {}
  const daily = (base.daily || []).map((d) => ({ ...d, day: shortDate(d.date) }))
  const skills = base.skills?.period || {}
  const words = base.words_mastered_list || []
  const timeline = base.timeline || []

  return (
    <div dir="rtl" className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackLink />
          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold"
              style={{ background: `${ACCENTS.gold}15`, color: ACCENTS.gold, border: `1px solid ${ACCENTS.gold}30` }}
            >
              {(st.name || '؟').trim().charAt(0)}
            </span>
            <div>
              <h1 className="text-[26px] leading-tight font-extrabold text-slate-100">{st.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {st.group ? `${st.group} · ` : ''}مستوى {st.level ?? '؟'}
                {st.trainer ? ` · المدرب: ${st.trainer}` : ''} · {st.status === 'active' ? 'نشط' : st.status}
              </p>
            </div>
          </div>
        </div>
        <RangePicker days={days} onChange={(d) => { const n = new URLSearchParams(params); n.set('days', String(d)); setParams(n, { replace: true }) }} />
      </div>

      {/* headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Clock3} label="دقائق التعلّم" value={fmtMinutes(totals.learning_minutes)} color={ACCENTS.gold} sub={`${num(totals.active_days)} يوم نشط`} />
        <StatCard icon={Layers} label="أقسام مكتملة" value={num(totals.sections_completed)} color={ACCENTS.emerald} sub={totals.avg_score != null ? `متوسط ${totals.avg_score}%` : undefined} />
        <StatCard icon={BookOpenCheck} label="كلمات أتقنها" value={num(totals.words_mastered)} color={ACCENTS.sky} />
        <StatCard icon={Mic} label="تسجيلات تحدث" value={num(totals.speaking_recordings)} color={ACCENTS.rose} />
        <StatCard icon={Flame} label="سلسلة الأيام" value={num(st.current_streak)} color={ACCENTS.gold} sub={`الأطول: ${num(st.longest_streak)}`} />
        <StatCard icon={Zap} label="نقاط XP بالفترة" value={num(totals.xp_earned)} color={ACCENTS.violet} sub={`الإجمالي: ${num(st.xp_total)}`} />
      </div>

      {/* daily activity */}
      <ChartCard title="دقائق التعلّم يوميًا" footnote="يشمل اليوم حتى لحظة العرض (تجميعة اليوم تُحدَّث تلقائيًا عند فتح التقرير)">
        {daily.length === 0 ? <EmptyNote /> : (
          <div dir="ltr" className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradStu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENTS.gold} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={ACCENTS.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [num(v), 'دقيقة']} />
                <Area type="monotone" dataKey="learning_minutes" stroke={ACCENTS.gold} strokeWidth={2} fill="url(#gradStu)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* skills */}
        <ChartCard
          title="المهارات في هذه الفترة"
          subtitle={base.skills?.strongest ? `الأقوى: ${SECTION_AR[base.skills.strongest] || base.skills.strongest} · الأضعف: ${SECTION_AR[base.skills.weakest] || base.skills.weakest}` : undefined}
        >
          <div className="space-y-3">
            {Object.entries(skills).map(([key, v]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <GraduationCap size={11} className="text-slate-600" />
                    {SECTION_AR[key] || key}
                    <span className="text-slate-600">({num(v.completed)} قسم · {fmtMinutes(v.minutes)})</span>
                  </span>
                  <span className="tabular-nums font-bold" dir="ltr" style={{ color: v.avg_score >= 80 ? ACCENTS.emerald : v.avg_score >= 60 ? ACCENTS.gold : ACCENTS.rose }}>
                    {v.avg_score != null ? `${v.avg_score}%` : '—'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${v.avg_score || 0}%`, background: v.avg_score >= 80 ? ACCENTS.emerald : v.avg_score >= 60 ? ACCENTS.gold : ACCENTS.rose }} />
                </div>
              </div>
            ))}
            {Object.keys(skills).length === 0 && <EmptyNote text="لم يكمل أقسام منهج في هذه الفترة" />}
          </div>
        </ChartCard>

        {/* sessions + devices */}
        <ChartCard title="الجلسات والأجهزة" subtitle="آخر الجلسات وأجهزة الدخول">
          <div className="flex flex-wrap gap-2 mb-4">
            {(data.devices || []).map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-300">
                <MonitorSmartphone size={11} className="text-sky-400" />
                {d.device} / {d.browser} <span className="text-slate-600 tabular-nums">×{num(d.sessions)}</span>
              </span>
            ))}
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pe-1">
            {(data.sessions || []).map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-white/[0.04]">
                <span className="text-slate-400">{relTimeAr(s.started_at)}</span>
                <span className="text-slate-500 tabular-nums" dir="ltr">
                  {s.duration_seconds ? fmtMinutes(s.duration_seconds / 60) : '—'} · {num(s.pages_visited || 0)} صفحة
                </span>
              </div>
            ))}
            {(data.sessions || []).length === 0 && <EmptyNote text="لا جلسات مسجلة" />}
          </div>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* errors */}
        <ChartCard title="أخطاء واجهها هذا الطالب" subtitle="من سجل أخطاء الواجهة — إن تكررت فهي سبب إحباط حقيقي">
          <div className="space-y-2 max-h-56 overflow-y-auto pe-1">
            {(data.errors || []).map((e, i) => (
              <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <div className="flex justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-rose-300/90 inline-flex items-center gap-1"><Bug size={10} /> {e.error_kind}</span>
                  <span className="text-xs text-slate-600">{relTimeAr(e.created_at)}</span>
                </div>
                <p className="text-xs text-slate-400 break-all leading-relaxed" dir="ltr">{e.message}</p>
              </div>
            ))}
            {(data.errors || []).length === 0 && <EmptyNote text="لا أخطاء — تجربة نظيفة" icon={CheckCircle2} tone={ACCENTS.emerald} />}
          </div>
        </ChartCard>

        {/* recordings + AI cost */}
        <div className="space-y-4">
          <ChartCard title="آخر تسجيلات التحدث">
            <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
              {(data.recordings || []).map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-white/[0.04]">
                  <span className="text-slate-400 inline-flex items-center gap-1.5"><Mic size={11} className="text-rose-400" /> {relTimeAr(r.created_at)}</span>
                  <span className="text-slate-500 tabular-nums" dir="ltr">
                    {r.duration_seconds ? `${r.duration_seconds}s` : ''} {r.ai_score ? `· ${r.ai_score}/100` : ''} {r.trainer_grade ? `· ${r.trainer_grade}` : ''}
                  </span>
                </div>
              ))}
              {(data.recordings || []).length === 0 && <EmptyNote text="لا تسجيلات" />}
            </div>
          </ChartCard>
          <ChartCard title="استهلاكه من الذكاء الاصطناعي">
            <div className="flex items-center gap-6 mb-3">
              <div>
                <div className="text-lg font-extrabold text-amber-300 tabular-nums" dir="auto">{fmtSAR(data.ai?.window_sar)}</div>
                <div className="text-xs text-slate-500">خلال الفترة</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-300 tabular-nums" dir="auto">{fmtSAR(data.ai?.total_sar)}</div>
                <div className="text-xs text-slate-500">منذ البداية</div>
              </div>
              <Wallet size={18} className="text-slate-700 ms-auto" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(data.ai?.by_type || []).map((t, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 tabular-nums">
                  {AI_TYPE_AR[t.type] || t.type} · {fmtSAR(t.sar)}
                </span>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* words + timeline */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title={`كلمات أتقنها (${num(words.length)})`}>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {words.map((w, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-200/90">
                <span dir="ltr">{w.word}</span>{w.definition_ar ? <span className="text-slate-500"> · {w.definition_ar}</span> : null}
              </span>
            ))}
            {words.length === 0 && <EmptyNote text="لا كلمات جديدة في هذه الفترة" />}
          </div>
        </ChartCard>

        <ChartCard title="آخر النشاطات">
          <div className="space-y-1.5 max-h-64 overflow-y-auto pe-1">
            {timeline.slice(0, 30).map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-white/[0.04]">
                <span className="text-slate-300 truncate">
                  {TIMELINE_AR[t.kind] || t.kind}
                  {t.kind === 'section' ? ` — ${SECTION_AR[t.label] || t.label}` : ''}
                  {t.detail ? <span className="text-slate-600"> · {t.detail}</span> : null}
                </span>
                <span className="text-slate-600 shrink-0 tabular-nums">
                  {t.score != null ? <span className="text-slate-400" dir="ltr">{Math.round(t.score)}% · </span> : null}
                  {relTimeAr(t.at)}
                </span>
              </div>
            ))}
            {timeline.length === 0 && <EmptyNote />}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

const TIMELINE_AR = { section: 'أكمل قسم', speaking: 'سجّل تحدثًا', saved_word: 'حفظ كلمة' }

function BackLink() {
  return (
    <Link
      to="/admin/reports?tab=students"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
    >
      <ArrowRight size={13} /> كل الطلاب
    </Link>
  )
}
