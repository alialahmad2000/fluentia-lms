import React from 'react'
import { Icon } from './primitives'

// ── Journey stations — the "you are here" roadmap glance ─────────────────────
// The whole arc a student walks: Measure → Focus → Train → Rehearse → Ready.
// The current station glows; past stations are filled. Reassures the student
// they're on a path and shows what comes next.

const STATIONS = [
  { id: 'measure',  lbl: 'القياس',   sub: 'التشخيص',     icon: Icon.diagnostic },
  { id: 'focus',    lbl: 'التركيز',  sub: 'خطّتك',       icon: Icon.plan },
  { id: 'train',    lbl: 'التدريب',  sub: 'المهارات',    icon: Icon.reading },
  { id: 'rehearse', lbl: 'المحاكاة', sub: 'اختبار كامل', icon: Icon.mock },
  { id: 'ready',    lbl: 'الجاهزية', sub: 'يوم الاختبار', icon: Icon.readiness },
]

function currentStation({ hasResult, daysLeft }) {
  if (!hasResult) return 0
  if (daysLeft != null && daysLeft <= 10) return 4
  if (daysLeft != null && daysLeft <= 30) return 3
  return 2
}

export default function JourneyStations({ hasResult, daysLeft, onOpen }) {
  const active = currentStation({ hasResult, daysLeft })
  return (
    <div className="iel-stations" dir="rtl" role="list" aria-label="مراحل رحلتك">
      {STATIONS.map((s, i) => {
        const state = i < active ? 'done' : i === active ? 'active' : 'upcoming'
        const I = s.icon
        return (
          <button
            key={s.id}
            role="listitem"
            onClick={() => onOpen?.()}
            className={`iel-station ${state}`}
            style={{ background: 'none', border: 0, cursor: onOpen ? 'pointer' : 'default', fontFamily: "'Tajawal', sans-serif", padding: 0 }}
          >
            <span className="dot">{state === 'done'
              ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
              : <I size={16} sw={2} />}</span>
            <span className="lbl">{s.lbl}</span>
            <span className="sub">{s.sub}</span>
          </button>
        )
      })}
    </div>
  )
}
