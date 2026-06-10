// الصحة والتكلفة — client errors, section crashes, audio playback health,
// open curriculum-quality flags, and the real AI bill (by type/model/student).
import { Link } from 'react-router-dom'
import { ShieldAlert, Bug, Volume2, Wallet, ExternalLink, CheckCircle2 } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useReportHealth } from '../useAdminReports'
import {
  card, ACCENTS, StatCard, ChartCard, RankedBars, LoadingBlock, EmptyNote, AI_TYPE_AR,
  num, fmtSAR, shortDate, relTimeAr, tooltipStyle, axisTick,
} from '../reportKit'

export default function HealthTab({ days }) {
  const { data, isLoading, error } = useReportHealth(days)
  if (isLoading) return <LoadingBlock rows={3} />
  if (error) return <EmptyNote text="تعذّر تحميل بيانات الصحة" />

  const errTotal = (data.errors_daily || []).reduce((a, d) => a + d.count, 0)
  const errDaily = (data.errors_daily || []).map((d) => ({ ...d, day: shortDate(d.date) }))
  const aiDaily = (data.ai?.daily || []).map((d) => ({ ...d, day: shortDate(d.date) }))
  const audioRate = data.audio?.error_rate

  return (
    <div className="space-y-4">
      {/* headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Bug} label={`أخطاء العملاء (${days} يوم)`} value={num(errTotal)} color={errTotal > 50 ? ACCENTS.rose : ACCENTS.slate} />
        <StatCard icon={ShieldAlert} label="انهيارات أقسام" value={num(data.crashes?.total)} color={data.crashes?.total > 30 ? ACCENTS.rose : ACCENTS.slate} />
        <StatCard
          icon={Volume2}
          label="نسبة فشل الصوت"
          value={audioRate == null ? '—' : `${(audioRate * 100).toFixed(1)}%`}
          color={audioRate > 0.02 ? ACCENTS.rose : ACCENTS.emerald}
          sub="توقّف أو خطأ ÷ التشغيلات"
        />
        <StatCard icon={Wallet} label="فاتورة الذكاء الاصطناعي" value={fmtSAR(data.ai?.total_sar)} color={ACCENTS.gold} />
      </div>

      {/* quality flags banner */}
      {data.quality_flags_open > 0 && (
        <Link
          to="/admin/curriculum-quality"
          className={`${card} px-5 py-3.5 flex items-center justify-between gap-3 hover:border-amber-400/30 transition-colors group`}
        >
          <span className="flex items-center gap-3 text-xs text-slate-200">
            <ShieldAlert size={16} className="text-amber-400" />
            <span>
              <b className="text-amber-300 tabular-nums">{num(data.quality_flags_open)}</b> بلاغ جودة منهج بانتظار المراجعة — كاشف الأخطاء وجد ما يستحق نظرتك
            </span>
          </span>
          <ExternalLink size={13} className="text-slate-600 group-hover:text-amber-300 transition-colors" />
        </Link>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* errors trend + signatures */}
        <ChartCard title="أخطاء الواجهة يوميًا" subtitle="من client_error_log — كل خطأ حقيقي عند طالب">
          {errDaily.length === 0 ? <EmptyNote text="لا أخطاء في هذه الفترة" icon={CheckCircle2} tone={ACCENTS.emerald} /> : (
            <div dir="ltr" className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={errDaily} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradErr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENTS.rose} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={ACCENTS.rose} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [num(v), 'خطأ']} />
                  <Area type="monotone" dataKey="count" stroke={ACCENTS.rose} strokeWidth={2} fill="url(#gradErr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="أكثر الأخطاء تكرارًا"
          subtitle="التوقيعات المجمّعة — العمود الأيسر آخر ظهور"
          action={
            <Link to="/admin/system" className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4">
              تشخيص النظام ←
            </Link>
          }
        >
          <div className="space-y-2.5">
            {(data.top_errors || []).map((e, i) => (
              <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs font-bold text-rose-300/90 uppercase">{e.error_kind || 'error'}</span>
                  <span className="text-xs text-slate-600 tabular-nums shrink-0">
                    ×{num(e.count)} · {num(e.users)} طالب · {relTimeAr(e.last_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed break-all" dir="ltr">{e.message}</p>
              </div>
            ))}
            {(data.top_errors || []).length === 0 && <EmptyNote text="لا أخطاء" icon={CheckCircle2} tone={ACCENTS.emerald} />}
          </div>
        </ChartCard>
      </div>

      {/* crashes */}
      <ChartCard title="انهيارات الأقسام" subtitle="حدث section_crash — أين تتعطل التجربة فعليًا">
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-1.5">
          {(data.crashes?.top || []).map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-300 truncate">
                <span className="text-rose-300/80 font-semibold me-1.5">{c.section}</span>
                <span className="text-slate-600" dir="ltr">{c.page_path}</span>
              </span>
              <span className="text-xs text-slate-500 tabular-nums shrink-0" dir="ltr">×{num(c.count)} · {num(c.users)} طالب</span>
            </div>
          ))}
          {(data.crashes?.top || []).length === 0 && <EmptyNote text="لا انهيارات في هذه الفترة" icon={CheckCircle2} tone={ACCENTS.emerald} />}
        </div>
      </ChartCard>

      {/* AI cost */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="فاتورة الذكاء الاصطناعي يوميًا" subtitle="بالريال السعودي (تقديري)" className="lg:col-span-2">
          {aiDaily.length === 0 ? <EmptyNote /> : (
            <div dir="ltr" className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aiDaily} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENTS.gold} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={ACCENTS.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtSAR(v), 'التكلفة']} />
                  <Area type="monotone" dataKey="sar" stroke={ACCENTS.gold} strokeWidth={2} fill="url(#gradAi)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="التكلفة حسب النوع" subtitle="أين تذهب الفلوس؟">
          <RankedBars
            items={(data.ai?.by_type || []).map((t) => ({ label: AI_TYPE_AR[t.type] || t.type, value: t.sar, users: null }))}
            color={ACCENTS.gold}
            valueLabel={(v) => fmtSAR(v)}
          />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="التكلفة حسب النموذج">
          <RankedBars
            items={(data.ai?.by_model || []).map((m) => ({ label: m.model, value: m.sar, users: null }))}
            color={ACCENTS.violet}
            valueLabel={(v) => fmtSAR(v)}
          />
        </ChartCard>
        <ChartCard title="أعلى الطلاب استهلاكًا للذكاء الاصطناعي" subtitle="«النظام» = استدعاءات غير مرتبطة بطالب (توليد محتوى)">
          <RankedBars
            items={(data.ai?.by_student || []).map((s) => ({ label: s.name, value: s.sar, users: null }))}
            color={ACCENTS.rose}
            valueLabel={(v) => fmtSAR(v)}
          />
        </ChartCard>
      </div>
    </div>
  )
}

