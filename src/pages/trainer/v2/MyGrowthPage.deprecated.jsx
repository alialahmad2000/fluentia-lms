import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useGrowthDashboard, useXPTimeline, useTrainerPerSessionRate } from '@/hooks/trainer/useMyGrowth'
import { TRAINER_COMP } from '@/config/trainerCompensation'
import './MyGrowthPage.css'

const EVENT_TYPE_AR = {
  grading_completed:  'تصحيح',
  debrief_completed:  'ملخص حصة',
  intervention_acted: 'تدخل طالب',
  streak_bonus:       'مكافأة سلسلة',
  class_conducted:    'إدارة حصة',
  note_added:         'ملاحظة طالب',
}

const TYPE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']

function KpiBar({ label, value, weight, suffix = '%' }) {
  const pct = Math.min(100, value || 0)
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="mgp-kpi-bar">
      <div className="mgp-kpi-bar-header">
        <span className="mgp-kpi-bar-label">{label}</span>
        <span className="mgp-kpi-bar-weight">{weight}%</span>
        <span className="mgp-kpi-bar-val" style={{ color }}>
          {value != null ? Number(value).toFixed(1) + suffix : 'غير متاح'}
        </span>
      </div>
      <div className="mgp-kpi-track">
        <div className="mgp-kpi-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function StreakHeatmap({ heatmap }) {
  const data = heatmap || []
  const weeks = []
  for (let i = 0; i < data.length; i += 7) weeks.push(data.slice(i, i + 7))
  const maxXp = Math.max(...data.map(d => d.xp || 0), 1)

  return (
    <div className="mgp-heatmap">
      <div className="mgp-heatmap-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="mgp-heatmap-col">
            {week.map((day, di) => {
              const intensity = day.xp ? Math.ceil((day.xp / maxXp) * 4) : 0
              return (
                <div
                  key={di}
                  className={`mgp-heatmap-cell mgp-heatmap-cell--${intensity}`}
                  title={`${day.date}: ${day.xp} XP`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mgp-heatmap-legend">
        <span className="mgp-heatmap-legend-label">أقل</span>
        {[0,1,2,3,4].map(i => <div key={i} className={`mgp-heatmap-cell mgp-heatmap-cell--${i}`} />)}
        <span className="mgp-heatmap-legend-label">أكثر</span>
      </div>
    </div>
  )
}

function XPChart({ timeline }) {
  if (!timeline?.length) {
    return (
      <div className="mgp-chart-empty">
        <p className="mgp-chart-empty-title">لا توجد بيانات XP بعد</p>
        <p className="mgp-chart-empty-hint">ستظهر هنا بعد اكتساب XP عبر التصحيح والتدخلات وإدارة الحصص</p>
      </div>
    )
  }

  const byDate = {}
  const types = new Set()
  timeline.forEach(r => {
    if (!byDate[r.day]) byDate[r.day] = { date: r.day }
    byDate[r.day][r.event_type] = r.total_xp
    types.add(r.event_type)
  })
  const chartData = Object.values(byDate).sort((a, b) => a.date > b.date ? 1 : -1)
  const typeArr = [...types]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} width={30} />
        <Tooltip formatter={(val, name) => [val + ' XP', EVENT_TYPE_AR[name] || name]} />
        <Legend formatter={name => EVENT_TYPE_AR[name] || name} />
        {typeArr.map((t, i) => (
          <Bar key={t} dataKey={t} stackId="xp" fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function CompCalculator({ kpiScore, classesThisMonth, perSessionRate }) {
  const [sessions, setSessions] = useState(classesThisMonth || 0)
  const [students, setStudents] = useState(16)

  const comp = TRAINER_COMP.calculate({
    kpi_score: kpiScore || 0,
    sessions_taught: sessions,
    retained_students_count: students,
    per_session_rate: perSessionRate || 75,
  })

  return (
    <div className="mgp-card">
      <h3 className="mgp-section-title">آلة حساب الراتب التقديري</h3>
      <div className="mgp-comp-inputs">
        <label className="mgp-comp-label">
          <span>عدد الحصص هذا الشهر</span>
          <input type="number" min={0} max={200} value={sessions}
            onChange={e => setSessions(Number(e.target.value))} className="mgp-comp-input" />
        </label>
        <label className="mgp-comp-label">
          <span>عدد الطلاب المحتفظ بهم</span>
          <input type="number" min={0} max={100} value={students}
            onChange={e => setStudents(Number(e.target.value))} className="mgp-comp-input" />
        </label>
      </div>
      <div className="mgp-comp-breakdown">
        <div className="mgp-comp-row"><span>الراتب الأساسي</span><span>{comp.base.toLocaleString('ar')} ر.س</span></div>
        <div className="mgp-comp-row"><span>أجر الحصص ({sessions} × {perSessionRate || 75})</span><span>{comp.sessions.toLocaleString('ar')} ر.س</span></div>
        <div className="mgp-comp-row"><span>مكافأة KPI (درجة {Math.round(kpiScore || 0)}%)</span><span>{comp.kpi_bonus.toLocaleString('ar')} ر.س</span></div>
        <div className="mgp-comp-row"><span>مكافأة الاحتفاظ ({students} طالب)</span><span>{comp.retention_bonus.toLocaleString('ar')} ر.س</span></div>
        <div className="mgp-comp-total"><span>الإجمالي التقديري</span><span>{comp.total.toLocaleString('ar')} ر.س</span></div>
      </div>
      <p className="mgp-comp-note">* تقديري فقط بناءً على بيانات النظام. الراتب الفعلي يحدده العقد.</p>
    </div>
  )
}

function EarnMoreCard({ kpis, xp }) {
  const hints = [
    { icon: '✍️', text: 'صحّح التسليمات خلال ٢٤ ساعة واكسب +5 XP إضافية بدلاً من +2' },
    { icon: '🎙️', text: 'أكمل debrief بعد كل حصة واكسب +10 XP' },
    { icon: '🚨', text: 'تفاعل مع تنبيه طالب واحد يومياً واكسب +10 XP لكل تدخل' },
    { icon: '🔥', text: 'حافظ على السلسلة اليومية لتفعيل مضاعف XP ×1.5 بعد ٧ أيام متتالية' },
  ]

  return (
    <div className="mgp-card">
      <h3 className="mgp-section-title">كيف تكسب أكثر؟</h3>
      <ul className="mgp-earn-list">
        {hints.map((h, i) => (
          <li key={i} className="mgp-earn-item">
            <span className="mgp-earn-icon">{h.icon}</span>
            <span>{h.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function MyGrowthPage() {
  const { data: dash, isLoading: dashLoading } = useGrowthDashboard()
  const { data: timeline, isLoading: tlLoading } = useXPTimeline(30)
  const { data: perSessionRate } = useTrainerPerSessionRate()

  const xp = dash?.xp || {}
  const streak = dash?.streak || {}
  const kpis = dash?.kpis || {}
  const heatmap = dash?.streak_heatmap || []

  return (
    <div className="mgp-page" dir="rtl">
      <div className="mgp-topbar">
        <h1 className="mgp-topbar-title">📈 نمو المدرب</h1>
      </div>

      {/* Hero stats grid */}
      <div className="mgp-hero-grid">
        {[
          { label: 'XP هذا الشهر', value: dashLoading ? '…' : (xp.month?.toLocaleString('ar') ?? '0') },
          { label: 'سلسلة حالية 🔥', value: dashLoading ? '…' : (streak.current ?? '0'), unit: 'يوم' },
          { label: 'أطول سلسلة', value: dashLoading ? '…' : (streak.longest ?? '0'), unit: 'يوم' },
          { label: 'درجة KPI', value: dashLoading ? '…' : (kpis.composite_score != null ? kpis.composite_score + '%' : '—') },
        ].map((s, i) => (
          <div key={i} className="mgp-hero-tile">
            <span className="mgp-hero-val">{s.value}</span>
            {s.unit && <span className="mgp-hero-unit">{s.unit}</span>}
            <span className="mgp-hero-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* KPI 4-pillar */}
      <div className="mgp-card">
        <div className="mgp-card-header">
          <h3 className="mgp-section-title">مؤشرات الأداء الرئيسية (KPI)</h3>
          {kpis.composite_score != null && (
            <span className="mgp-kpi-badge" style={{
              background: kpis.composite_score >= 80 ? '#dcfce7' : kpis.composite_score >= 60 ? '#fef3c7' : '#fee2e2',
              color: kpis.composite_score >= 80 ? '#15803d' : kpis.composite_score >= 60 ? '#92400e' : '#b91c1c',
            }}>
              {kpis.composite_score}% مجموع
            </span>
          )}
        </div>
        {dashLoading ? (
          <div className="mgp-skeleton-list">
            {[1,2,3,4].map(i => <div key={i} className="mgp-skeleton" />)}
          </div>
        ) : (
          <div className="mgp-kpi-bars">
            <KpiBar label="الاحتفاظ بالطلاب" value={kpis.retention_pct} weight={40} suffix="%" />
            <KpiBar label="تقدم الطلاب (وحدات/شهر)" value={kpis.progress_avg} weight={30} suffix=" وحدة" />
            <KpiBar label="تفاعل الطلاب (أحداث/أسبوع)" value={kpis.engagement_avg} weight={20} suffix=" حدث" />
            <div className="mgp-kpi-bar">
              <div className="mgp-kpi-bar-header">
                <span className="mgp-kpi-bar-label">رضا الطلاب</span>
                <span className="mgp-kpi-bar-weight">10%</span>
                <span className="mgp-kpi-bar-val mgp-kpi-bar-val--na">
                  غير متاح <span title="سيتم إضافته قريباً عبر تقييمات الحصص">ℹ️</span>
                </span>
              </div>
              <div className="mgp-kpi-track" />
            </div>
          </div>
        )}
      </div>

      {/* Compensation calculator */}
      {!dashLoading && (
        <CompCalculator
          kpiScore={kpis.composite_score}
          classesThisMonth={dash?.classes_this_month}
          perSessionRate={perSessionRate}
        />
      )}

      {/* XP Timeline chart */}
      <div className="mgp-card">
        <h3 className="mgp-section-title">رحلة XP (آخر ٣٠ يوماً)</h3>
        {tlLoading
          ? <div className="mgp-skeleton" style={{ height: 200 }} />
          : <XPChart timeline={timeline} />
        }
      </div>

      {/* Streak heatmap */}
      <div className="mgp-card">
        <h3 className="mgp-section-title">خريطة النشاط (٩٠ يوم)</h3>
        {dashLoading
          ? <div className="mgp-skeleton" style={{ height: 80 }} />
          : <StreakHeatmap heatmap={heatmap} />
        }
      </div>

      {/* Earn more */}
      <EarnMoreCard kpis={kpis} xp={xp} />
    </div>
  )
}
