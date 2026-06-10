// الطلاب — the retention heart. One row per student: live recency, streak,
// window aggregates, 14-day sparkline, trend, transparent risk badge.
// Desktop = dense table; mobile = cards (the verdict must never be off-canvas).
// Row click → /admin/reports/student/:id deep dive. CSV export for follow-up.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Flame, ArrowUpDown, Clock3, Layers } from 'lucide-react'
import { useReportStudents } from '../useAdminReports'
import {
  card, ACCENTS, Sparkline, RiskBadge, TrendArrow, LoadingBlock, EmptyNote,
  computeRisk, expiringSoon, downloadStudentsCSV, relTimeAr, fmtMinutes, num,
} from '../reportKit'

const SORTS = [
  { id: 'risk',    label: 'الأولوية (الأخطر أولًا)' },
  { id: 'recent',  label: 'آخر نشاط' },
  { id: 'minutes', label: 'دقائق التعلّم' },
  { id: 'score',   label: 'متوسط الدرجات' },
  { id: 'streak',  label: 'سلسلة الأيام' },
]

const RISK_ORDER = { high: 0, watch: 1, paused: 2, ok: 3 }
const PACKAGE_AR = { asas: 'أساس', talaqa: 'طلاقة', tamayuz: 'تميّز', ielts: 'آيلتس', private: 'خاص' }

export default function StudentsTab({ days }) {
  const { data, isLoading, error } = useReportStudents(days)
  const [sort, setSort] = useState('risk')
  const navigate = useNavigate()

  const students = useMemo(() => {
    const list = (data?.students || []).map((s) => ({ ...s, risk: computeRisk(s), expiry: expiringSoon(s) }))
    const by = {
      risk:    (a, b) => RISK_ORDER[a.risk.level] - RISK_ORDER[b.risk.level] || (b.days_inactive ?? 999) - (a.days_inactive ?? 999),
      recent:  (a, b) => new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0),
      minutes: (a, b) => b.minutes - a.minutes,
      score:   (a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1),
      streak:  (a, b) => (b.current_streak ?? 0) - (a.current_streak ?? 0),
    }
    return [...list].sort(by[sort] || by.risk)
  }, [data, sort])

  if (isLoading) return <LoadingBlock rows={4} />
  if (error) return <EmptyNote text="تعذّر تحميل بيانات الطلاب" />

  const counts = students.reduce((acc, s) => ((acc[s.risk.level] = (acc[s.risk.level] || 0) + 1), acc), {})
  const open = (s) => navigate(`/admin/reports/student/${s.id}?days=${days}`)

  return (
    <div className="space-y-4">
      {/* summary + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <SummaryChip label="يحتاج تدخّل" count={counts.high} cls="text-rose-300 bg-rose-500/10 border-rose-500/25" />
          <SummaryChip label="تحت المراقبة" count={counts.watch} cls="text-amber-300 bg-amber-500/10 border-amber-500/25" />
          <SummaryChip label="بخير" count={counts.ok} cls="text-emerald-300 bg-emerald-500/10 border-emerald-500/25" />
          {counts.paused > 0 && <SummaryChip label="موقوف" count={counts.paused} cls="text-slate-300 bg-slate-500/10 border-slate-500/25" />}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown size={13} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400/40"
            >
              {SORTS.map((s) => <option key={s.id} value={s.id} className="bg-[#0c1526]">{s.label}</option>)}
            </select>
          </label>
          <button
            onClick={() => downloadStudentsCSV(students, days)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-slate-300 hover:text-amber-300 hover:border-amber-400/30 transition-colors"
          >
            <Download size={13} /> تصدير CSV
          </button>
        </div>
      </div>

      {/* mobile: cards — risk verdict always visible */}
      <div className="md:hidden space-y-2.5">
        {students.map((s) => (
          <div key={s.id} role="button" tabIndex={0} onClick={() => open(s)} onKeyDown={(e) => e.key === 'Enter' && open(s)} className={`${card} w-full text-right p-4 hover:bg-white/[0.04] transition-colors cursor-pointer`}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="flex items-center gap-2.5 min-w-0">
                <Avatar name={s.name} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-100 truncate">{s.name}</span>
                  <span className="block text-xs text-slate-500 truncate">
                    {s.group_name || 'بدون مجموعة'} · مستوى {s.level ?? '؟'}
                  </span>
                </span>
              </span>
              <RiskBadge risk={s.risk} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Sparkline data={s.sparkline} color={ACCENTS.gold} width={110} height={28} />
              <span className="flex items-center gap-3 text-xs text-slate-400 tabular-nums">
                <span className="inline-flex items-center gap-1"><Clock3 size={11} /> {fmtMinutes(s.minutes)}</span>
                <span className="inline-flex items-center gap-1"><Layers size={11} /> {num(s.sections_completed)}</span>
                <span className={`inline-flex items-center gap-1 ${s.current_streak > 0 ? 'text-amber-300' : 'text-slate-600'}`}>
                  <Flame size={11} /> {s.current_streak ?? 0}
                </span>
                <TrendArrow first={s.first_half_minutes} second={s.second_half_minutes} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-xs text-slate-500">{relTimeAr(s.last_active_at)}</span>
              {s.expiry && <ExpiryChip expiry={s.expiry} />}
            </div>
          </div>
        ))}
      </div>

      {/* desktop: dense table */}
      <div className={`${card} overflow-hidden hidden md:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[920px]">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                <Th>الطالب</Th>
                <Th>آخر نشاط</Th>
                <Th>السلسلة</Th>
                <Th>دقائق التعلّم</Th>
                <Th>أيام نشطة</Th>
                <Th>أقسام</Th>
                <Th>متوسط</Th>
                <Th>آخر ١٤ يوم</Th>
                <Th>الاتجاه</Th>
                <Th>الحالة</Th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => open(s)}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-slate-100 truncate">{s.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {s.group_name || 'بدون مجموعة'} · مستوى {s.level ?? '؟'}
                          {s.package ? ` · ${PACKAGE_AR[s.package] || s.package}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-slate-400 whitespace-nowrap">{relTimeAr(s.last_active_at)}</td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-[13px] tabular-nums ${s.current_streak > 0 ? 'text-amber-300' : 'text-slate-600'}`}>
                      <Flame size={13} /> {s.current_streak ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[13px] font-semibold text-slate-200 tabular-nums whitespace-nowrap">{fmtMinutes(s.minutes)}</td>
                  <td className="px-3 py-3.5 text-[13px] text-slate-300 tabular-nums">{num(s.active_days)}</td>
                  <td className="px-3 py-3.5 text-[13px] text-slate-300 tabular-nums">{num(s.sections_completed)}</td>
                  <td className="px-3 py-3.5"><ScorePill score={s.avg_score} /></td>
                  <td className="px-3 py-3.5"><Sparkline data={s.sparkline} color={ACCENTS.gold} /></td>
                  <td className="px-3 py-3.5"><TrendArrow first={s.first_half_minutes} second={s.second_half_minutes} /></td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <RiskBadge risk={s.risk} />
                      {s.expiry && <ExpiryChip expiry={s.expiry} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {students.length === 0 && <EmptyNote text="لا يوجد طلاب" />}
      </div>
      <p className="text-xs text-slate-600">
        اضغط على أي طالب لفتح تقريره التفصيلي · الأرقام تشمل نشاط اليوم حتى لحظة العرض
      </p>
    </div>
  )
}

function Avatar({ name }) {
  return (
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: `${ACCENTS.sky}1a`, color: ACCENTS.sky, border: `1px solid ${ACCENTS.sky}30` }}
    >
      {(name || '؟').trim().charAt(0)}
    </span>
  )
}

function ExpiryChip({ expiry }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md border whitespace-nowrap ${expiry.tone === 'rose' ? 'text-rose-300 border-rose-500/30 bg-rose-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>
      {expiry.label}
    </span>
  )
}

function Th({ children }) {
  return <th className="px-3 py-3.5 font-semibold first:px-4 whitespace-nowrap">{children}</th>
}

function SummaryChip({ label, count, cls }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-semibold ${cls}`}>
      <span className="tabular-nums">{count || 0}</span> {label}
    </span>
  )
}

function ScorePill({ score }) {
  if (score == null) return <span className="text-xs text-slate-600">—</span>
  const color = score >= 80 ? ACCENTS.emerald : score >= 60 ? ACCENTS.gold : ACCENTS.rose
  return (
    <span className="text-[13px] font-bold tabular-nums" style={{ color }} dir="ltr">
      {Math.round(score)}%
    </span>
  )
}
