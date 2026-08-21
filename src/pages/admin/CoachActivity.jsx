// «نشاط مرشد التعلّم» — the accountability and insight surface.
//
// Two questions this page exists to answer, and nothing else:
//   1. Is the coach actually working the roster every day?
//   2. When a student stalls — is it motivation, or is it our software?
//
// The second one is the reason blocker_type is required on every touchpoint.
// The academy has never been able to answer it; after a few hundred rows this
// page does, and a bar that says «مشكلة في المنصة» is a bug backlog, not a
// morale problem.
import { useMemo, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Activity, Flame, ShieldAlert, Users } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import GlassPanel from '../../design-system/components/GlassPanel'
import { useCoachActivity } from '../coach/lcQueries'
import '../coach/lc-console.css'

const WINDOWS = [
  [7, 'آخر ٧ أيام'],
  [30, 'آخر ٣٠ يوماً'],
  [90, 'آخر ٩٠ يوماً'],
]

const BLOCKER_AR = {
  motivation: 'الدافعية',
  platform_issue: 'مشكلة في المنصة',
  schedule: 'ضيق الوقت',
  personal: 'ظرف شخصي',
  unknown: 'غير معروف',
}

const ACTION_AR = {
  message_sent: 'رسالة مُرسلة',
  observation: 'ملاحظة',
  escalated: 'تصعيد',
  no_action_needed: 'لا يحتاج إجراء',
}

const BLOCKER_COLOR = {
  motivation: 'var(--ds-accent-primary)',
  platform_issue: 'var(--ds-accent-danger)',
  schedule: 'var(--ds-accent-warning)',
  personal: 'var(--ds-accent-gold)',
  unknown: 'var(--ds-text-tertiary)',
}

/* Module scope — a component declared inside another component remounts its
   whole subtree on every render. */

function Stat({ label, value, sub, icon: Icon, tone }) {
  const color = tone === 'danger' ? 'var(--ds-accent-danger)'
    : tone === 'success' ? 'var(--ds-accent-success)'
    : 'var(--ds-text-primary)'
  return (
    <GlassPanel elevation={2} padding="md" style={{ minWidth: 0 }}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={14} style={{ color }} />}
        <p className="text-xs font-bold" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
          {label}
        </p>
      </div>
      <p className="text-4xl font-extrabold" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && (
        <p className="text-xs mt-2" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
          {sub}
        </p>
      )}
    </GlassPanel>
  )
}

/** Touchpoints per day. CSS bars — the shape is the whole message. */
function PerDayBars({ perDay, days }) {
  const series = useMemo(() => {
    const by = new Map((perDay || []).map((d) => [String(d.date), d.touchpoints]))
    const out = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      out.push({ key, value: by.get(key) || 0 })
    }
    return out
  }, [perDay, days])

  const max = Math.max(1, ...series.map((s) => s.value))
  const total = series.reduce((a, s) => a + s.value, 0)

  return (
    <GlassPanel elevation={2} padding="md">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs font-bold" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
          نقاط التواصل يومياً
        </p>
        <p className="text-sm font-bold" style={{ color: 'var(--ds-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {total}
        </p>
      </div>
      <div dir="ltr" style={{ display: 'flex', alignItems: 'flex-end', gap: days > 45 ? 1 : 3, height: 96 }}>
        {series.map((s) => (
          <div
            key={s.key}
            title={`${s.key} — ${s.value}`}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              height: `${Math.max(3, (s.value / max) * 100)}%`,
              borderRadius: '3px 3px 0 0',
              background: s.value === 0
                ? 'color-mix(in srgb, var(--ds-text-tertiary) 14%, transparent)'
                : 'linear-gradient(180deg, var(--ds-accent-primary), color-mix(in srgb, var(--ds-accent-primary) 25%, transparent))',
            }}
          />
        ))}
      </div>
      {/* Explicit ends: the bars are LTR inside an RTL page, so an Arabic
          reader would otherwise assume the right-hand side is the oldest. */}
      <div dir="ltr" className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
          قبل {days} يوماً
        </span>
        <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
          اليوم
        </span>
      </div>
    </GlassPanel>
  )
}

/** The insight. A horizontal breakdown reads faster than a pie at this size. */
function BlockerBreakdown({ byBlocker }) {
  const rows = byBlocker || []
  const total = rows.reduce((a, r) => a + Number(r.count), 0)

  return (
    <GlassPanel elevation={2} padding="lg">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert size={16} style={{ color: 'var(--ds-accent-danger)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>
          لماذا يتوقّف الطلاب؟
        </h2>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
        تصنيف المرشد لكل حالة تواصل. كل نقطة في «مشكلة في المنصة» هي عطل حقيقي يستحق التتبّع، لا ضعف دافعية.
      </p>

      {total === 0 ? (
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
          لا توجد بيانات بعد — تظهر هنا بعد أول حالات تواصل.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const pct = Math.round((Number(r.count) / total) * 100)
            const color = BLOCKER_COLOR[r.blocker_type] || 'var(--ds-text-tertiary)'
            return (
              <div key={r.blocker_type}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold" style={{ color, fontFamily: 'Tajawal, sans-serif' }}>
                    {BLOCKER_AR[r.blocker_type] || r.blocker_type}
                  </span>
                  {/* dir=ltr: Latin digits and «·» inside an RTL block
                      reorder — "12 · 30%" renders as "30% · 12". */}
                  <span
                    dir="ltr"
                    className="text-xs"
                    style={{ color: 'var(--ds-text-secondary)', fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}
                  >
                    {r.count} · {pct}%
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 999, background: 'var(--ds-surface-3)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </GlassPanel>
  )
}

function SimpleList({ title, rows, labelKey, labelMap, emptyAr }) {
  return (
    <GlassPanel elevation={2} padding="md">
      <p className="text-xs font-bold mb-3" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
        {title}
      </p>
      {!rows?.length ? (
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>{emptyAr}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={String(r[labelKey])} className="flex items-center justify-between gap-3">
              <span className="text-sm truncate" style={{ color: 'var(--ds-text-secondary)', fontFamily: 'Tajawal, sans-serif' }}>
                {labelMap ? labelMap[r[labelKey]] || r[labelKey] : (r.situation_en || r[labelKey])}
              </span>
              <span className="text-xs shrink-0" style={{ color: 'var(--ds-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                {r.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  )
}

export default function CoachActivity() {
  // R2 — all hooks first, gate last.
  const profile = useAuthStore((s) => s.profile)
  const [days, setDays] = useState(30)
  const { data, isLoading } = useCoachActivity(days)

  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />

  const cov = data?.coverage || {}

  return (
    <div dir="rtl" className="w-full lc-console-ar">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={18} style={{ color: 'var(--ds-accent-primary)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>
            نشاط مرشد التعلّم
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
          سؤالان فقط: هل يُعمل على القائمة كل يوم؟ وما الذي يوقف الطلاب فعلاً؟
        </p>
      </header>

      <nav className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
        {WINDOWS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setDays(value)}
            className="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: days === value ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              borderBottom: `2px solid ${days === value ? 'var(--ds-accent-primary)' : 'transparent'}`,
              marginBottom: '-1px',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cc-skel" style={{ height: 140 }} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Stat
              label="طلاب نشطون"
              value={cov.active_students ?? 0}
              icon={Users}
              sub="القائمة التي يغطّيها الرادار"
            />
            <Stat
              label="جرى التواصل معهم"
              value={cov.touched_in_window ?? 0}
              icon={Activity}
              tone={(cov.touched_in_window ?? 0) > 0 ? 'success' : undefined}
              sub="خلال هذه الفترة"
            />
            <Link to="/coach" style={{ display: 'block' }}>
              <Stat
                label="لم يُلمَسوا إطلاقاً"
                value={cov.never_touched ?? 0}
                icon={Users}
                tone={(cov.never_touched ?? 0) > 0 ? 'danger' : 'success'}
                sub={(cov.never_touched ?? 0) > 0 ? 'افتح الرادار ←' : 'لا توجد لهم أي حالة تواصل'}
              />
            </Link>
            <Stat
              label="أيام متتالية بتقرير"
              value={data?.log_streak_days ?? 0}
              icon={Flame}
              sub="سلسلة التقرير اليومي"
            />
          </div>

          <div className="mb-5">
            <BlockerBreakdown byBlocker={data?.by_blocker} />
          </div>

          <div className="grid lg:grid-cols-2 gap-3 mb-5">
            <PerDayBars perDay={data?.per_day} days={days} />
            <SimpleList
              title="نوع الإجراء"
              rows={data?.by_action}
              labelKey="action"
              labelMap={ACTION_AR}
              emptyAr="لا توجد إجراءات بعد."
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <SimpleList
              title="أكثر الرسائل استخداماً"
              rows={data?.top_templates}
              labelKey="code"
              emptyAr="لم تُرسل أي رسالة بعد."
            />
            <GlassPanel elevation={2} padding="md">
              <p className="text-xs font-bold mb-3" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
                المرشدون
              </p>
              {!data?.coaches?.length ? (
                <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>
                  لا يوجد حساب مرشد بعد.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.coaches.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--ds-text-primary)' }}>
                          {c.name}
                        </p>
                        <p dir="ltr" className="text-xs" style={{ color: 'var(--ds-text-tertiary)', textAlign: 'right' }}>
                          {c.timezone}
                        </p>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: 'var(--ds-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                        {c.touchpoints}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  )
}
