import React from 'react'
import { Icon } from './primitives'

// ── "How your coach helps" — the framing that answers "what is this account
//    for?" Six things the account does for every student, at a glance. ─────────

const HELPS = [
  { icon: Icon.diagnostic, title: 'يقيسك بصدق', desc: 'اختبار تشخيصي ومحاكاة تكشف نطاقك الحقيقي في كل مهارة.' },
  { icon: Icon.readiness,  title: 'يركّزك',     desc: 'يخبرك بالشيء الواحد الأهم لتعمل عليه اليوم — لا تشتّت.' },
  { icon: Icon.reading,    title: 'يعلّمك',     desc: 'استراتيجية لكل نوع سؤال — كيف تحلّه، لا مجرد أن تحلّه.' },
  { icon: Icon.writing,    title: 'يقيّمك',     desc: 'تقييم فوري لكتابتك ومحادثتك، ومراجعة من مدرّبك.' },
  { icon: Icon.errors,     title: 'يتذكّر أخطاءك', desc: 'بنك أخطاء يعيدها عليك في الوقت المناسب حتى تختفي.' },
  { icon: Icon.plan,       title: 'ينظّم وقتك', desc: 'خطة أسبوعية تلمس كل مهارة، وعدّاد يقودك ليوم الاختبار.' },
]

export default function CoachHelps({ title = 'كيف يساعدك حسابك' }) {
  return (
    <div dir="rtl">
      {title && <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 14px', letterSpacing: '-.01em' }}>{title}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 11 }}>
        {HELPS.map((h, i) => {
          const I = h.icon
          return (
            <div key={i} className="iel-gcard" style={{ padding: '15px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'default' }}>
              <span style={{ flex: 'none', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)' }}><I size={17} sw={1.9} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--iel-ink)' }}>{h.title}</div>
                <div style={{ fontSize: 12, color: 'var(--iel-ink-2)', lineHeight: 1.7, marginTop: 3 }}>{h.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
