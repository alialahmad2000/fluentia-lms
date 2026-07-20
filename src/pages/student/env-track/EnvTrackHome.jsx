// «مسار البيئة» — the premium roadmap: cinematic hero (world-cards + a 30-lesson gauge that
// fills as she progresses) → 10 stages of lesson stations on a glowing spine.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Leaf, Bird, TreePine, ShieldCheck, Compass, Binoculars, ClipboardList,
  Megaphone, Handshake, Mail, Check, ChevronLeft, ArrowLeft, Play, Sparkles,
} from 'lucide-react'
import { useG } from '../../../i18n/gender'
import { useEnvRoadmap } from './useEnvTrack'
import './envTrack.css'

const ICONS = { Leaf, Bird, TreePine, ShieldCheck, Compass, Binoculars, ClipboardList, Megaphone, Handshake, Mail }
const HERO_ACCENT = '#22c55e'

// Western → Arabic-Indic digits (this student reads Arabic-Indic everywhere).
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR_DIGITS[+d])
// #rrggbb + alpha → rgba() (avoids color-mix, which is unsupported on iOS Safari < 16.4).
function hexA(hex, a) {
  const h = (hex || '#22c55e').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

// The 30-lesson gauge: each tick is one lesson; ticks light up as she completes them.
function Gauge({ done, total }) {
  const N = total || 30
  const cx = 98, cy = 98, rIn = 74, rOut = 84
  const ticks = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 2 * Math.PI - Math.PI / 2
    ticks.push({
      i,
      x1: cx + rIn * Math.cos(a), y1: cy + rIn * Math.sin(a),
      x2: cx + rOut * Math.cos(a), y2: cy + rOut * Math.sin(a),
    })
  }
  return (
    <div className="et-medallion">
      <div className="et-halo" />
      <div className="et-disc" />
      <svg className="et-ring" viewBox="0 0 196 196" aria-hidden="true">
        <defs>
          <linearGradient id="etrg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#86efac" /><stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <line key={t.i} className={`et-tick${t.i < done ? ' lit' : ''}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        ))}
      </svg>
      <div className="et-center">
        {done > 0 ? (
          <>
            <span className="et-center-num">{toAr(done)}</span>
            <span className="et-center-cap">من {toAr(N)} درسًا</span>
          </>
        ) : (
          <>
            <span className="et-play"><Play size={18} fill="currentColor" strokeWidth={0} /></span>
            <span className="et-center-cap"><b>{toAr(0)}</b> / {toAr(N)} درسًا</span>
          </>
        )}
      </div>
    </div>
  )
}

const PILLARS = [
  { Icon: Bird, ar: 'الحياة الفطرية', en: 'Wildlife' },
  { Icon: Leaf, ar: 'البيئة', en: 'Environment' },
  { Icon: Compass, ar: 'السياحة البيئية', en: 'Ecotourism' },
]

export default function EnvTrackHome() {
  const g = useG()
  const reduce = useReducedMotion()
  const { roadmap, totalLessons, doneLessons, nextLesson, isLoading } = useEnvRoadmap()

  return (
    <div className="tt-root et-page" dir="rtl">
      {/* Immersive green world — the whole page lives inside it (never flat black). */}
      <div className="et-world" aria-hidden>
        <div className="et-world__grid" />
        <div className="et-world__bloom" />
        <div className="et-world__motes" />
        <div className="et-world__scrim" />
        <div className="et-world__grain" />
      </div>
      <div className="tt-wrap">
        {/* Hero */}
        <div className="et-hero">
          <div className="et-atmos" /><div className="et-lines" /><div className="et-grain" /><div className="et-top-sheen" />
          <div className="et-hero-inner">
            <div className="et-hero-text">
              <p className="et-eyebrow">English for Wildlife & Environment</p>
              <h1 className="et-title">مسار البيئة</h1>
              <p className="et-sub">
                {g('رحلتك', 'رحلتكِ')} الكاملة في إنجليزية البيئة والحياة الفطرية — من الطبيعة والكائنات إلى الحماية والسياحة البيئية.
                في كل درس: مفردات، قراءة، اختبار قصير، ومهمة تطبيقية.
              </p>
              <div className="et-pillars">
                {PILLARS.map((p) => (
                  <div className="et-pill" key={p.en}>
                    <span className="et-pill-ic"><p.Icon size={18} /></span>
                    <b>{p.ar}</b>
                    <span>{p.en}</span>
                  </div>
                ))}
              </div>
              {nextLesson ? (
                <Link to={`/env/${nextLesson.slug}`} className="et-cta">
                  {doneLessons > 0 ? g('أكمل من هنا', 'أكملي من هنا') : g('ابدأ الرحلة', 'ابدئي الرحلة')}
                  <ArrowLeft size={18} />
                </Link>
              ) : totalLessons > 0 ? (
                <div className="et-done-banner"><Check size={18} /> {g('أكملتَ', 'أكملتِ')} كل الدروس 🎉</div>
              ) : null}
            </div>
            <Gauge done={doneLessons} total={totalLessons} />
          </div>
        </div>

        {isLoading && <div style={{ textAlign: 'center', color: 'var(--ds-text-tertiary)', padding: 40 }}>جاري التحميل...</div>}

        {/* Stages */}
        {roadmap.map((st, si) => {
          const Icon = ICONS[st.icon] || Leaf
          const accent = st.accent || HERO_ACCENT
          return (
            <motion.div key={st.id} className="et-stage" style={{ '--et-stage': accent }}
              initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : Math.min(si, 8) * 0.04, duration: .45 }}>
              <div className="et-stage-head">
                <span className="et-stage-icon" style={{ background: `linear-gradient(150deg, ${hexA(accent, .2)}, ${hexA(accent, .05)})`, border: `1px solid ${hexA(accent, .35)}`, color: accent }}>
                  <Icon size={24} />
                </span>
                <div className="et-stage-meta">
                  <div className="et-stage-num" style={{ color: accent }}>المرحلة {st.sort_order}</div>
                  <h2 className="et-stage-title">{st.title_ar}</h2>
                  <div className="et-stage-titleen">{st.title_en}</div>
                </div>
                {st.cefr && <span className="et-cefr" style={{ color: accent, background: hexA(accent, .1), border: `1px solid ${hexA(accent, .3)}` }}>{st.cefr}</span>}
              </div>

              <div className="et-lessons">
                {st.lessons.map((l) => {
                  const isNext = nextLesson && l.id === nextLesson.id
                  const nextStyle = isNext ? {
                    borderColor: accent,
                    background: `linear-gradient(150deg, ${hexA(accent, .12)}, rgba(255,255,255,.02))`,
                    boxShadow: `0 2px 4px rgba(0,0,0,.3), 0 16px 38px -14px ${hexA(accent, .5)}, inset 0 1px 0 rgba(255,255,255,.06)`,
                  } : undefined
                  return (
                    <Link key={l.id} to={`/env/${l.slug}`} className={`et-lesson${isNext ? ' is-next' : ''}${l.done ? ' is-done' : ''}`} style={nextStyle}>
                      <span className="et-node" style={l.done
                        ? { background: 'rgba(34,197,94,.16)', border: '1px solid rgba(34,197,94,.5)', color: '#4ade80' }
                        : { background: hexA(accent, .14), border: `1px solid ${hexA(accent, .4)}`, color: accent }}>
                        {l.done ? <Check size={18} /> : l.sort_order}
                      </span>
                      <div className="et-lesson-body">
                        <h3 className="et-lesson-title">{l.title_ar}</h3>
                        <div className="et-lesson-en">{l.title_en}{l.done && l.score != null ? ` · ${toAr(l.score)}٪` : ''}</div>
                      </div>
                      {isNext && <span className="et-start" style={{ color: accent }}>{g('ابدأ', 'ابدئي')}</span>}
                      <ChevronLeft className="et-chev" size={18} />
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )
        })}

        {!isLoading && roadmap.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ds-text-tertiary)', padding: 40 }}>
            <Sparkles size={28} style={{ marginBottom: 8 }} /><br />{g('مسارك', 'مساركِ')} قيد التجهيز — قريبًا إن شاء الله.
          </div>
        )}
      </div>
    </div>
  )
}
