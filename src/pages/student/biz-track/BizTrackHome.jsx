// «مسار الأعمال» — the premium roadmap: 10 stages, each a set of lesson stations, with
// progress + a "continue here" pointer to the next unfinished lesson. Mirrors TechTrackHome.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Briefcase, Car, Wrench, HeartHandshake, Package, Banknote, Wallet, TrendingUp,
  Users, Mail, Check, ChevronLeft, ArrowLeft, Sparkles,
} from 'lucide-react'
import { useG } from '../../../i18n/gender'
import { useBizRoadmap } from './useBizTrack'
import './bizTrack.css'

const ICONS = { Briefcase, Car, Wrench, HeartHandshake, Package, Banknote, Wallet, TrendingUp, Users, Mail }

function Ring({ done, total, accent }) {
  const r = 30, c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  const [shown, setShown] = useState(0)
  useEffect(() => { const t = setTimeout(() => setShown(pct), 140); return () => clearTimeout(t) }, [pct])
  return (
    <svg className="tt-ring" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--ds-border-subtle, rgba(255,255,255,0.12))" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - shown)}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)' }} />
      <text x="36" y="33" textAnchor="middle" fontSize="16" fontWeight="800">{done}</text>
      <text x="36" y="48" textAnchor="middle" fontSize="10" fill="var(--ds-text-tertiary, #64748b)">/{total}</text>
    </svg>
  )
}

export default function BizTrackHome() {
  const g = useG()
  const reduce = useReducedMotion()
  const { roadmap, totalLessons, doneLessons, nextLesson, isLoading } = useBizRoadmap()
  const heroAccent = '#f59e0b'

  return (
    <div className="tt-root" dir="rtl">
      <div className="tt-wrap">
        {/* Hero */}
        <div className="tt-hero">
          <div className="tt-hero-bloom" style={{ background: heroAccent }} />
          <p className="tt-eyebrow" style={{ color: heroAccent }}>English for Business</p>
          <h1 className="tt-title">مسار الأعمال</h1>
          <p className="tt-sub">
            {g('رحلتك', 'رحلتكِ')} الكاملة في إنجليزية الأعمال — السيارات وصيانتها، المال والفواتير، ونموّ التجارة.
            في كل درس: مفردات، قراءة، اختبار قصير، ومهمة تطبيقية. {g('تعلّم مجالك', 'تعلّمي مجالكِ')} بالإنجليزية خطوة بخطوة.
          </p>
          <div className="tt-hero-foot">
            <Ring done={doneLessons} total={totalLessons || 30} accent={heroAccent} />
            {nextLesson ? (
              <Link to={`/biz/${nextLesson.slug}`} className="tt-continue" style={{ background: heroAccent, color: '#050b16', boxShadow: `0 12px 30px -10px ${heroAccent}99` }}>
                {doneLessons > 0 ? g('أكمل من هنا', 'أكملي من هنا') : g('ابدأ الرحلة', 'ابدئي الرحلة')}
                <ArrowLeft size={18} />
              </Link>
            ) : totalLessons > 0 ? (
              <div className="tt-done-banner"><Check size={18} /> {g('أكملتَ', 'أكملتِ')} كل الدروس 🎉</div>
            ) : null}
            {totalLessons > 0 && (
              <span className="tt-mini"><b>{doneLessons}</b> من <b>{totalLessons}</b> درس مكتمل</span>
            )}
          </div>
        </div>

        {isLoading && <div style={{ textAlign: 'center', color: 'var(--ds-text-tertiary)', padding: 40 }}>جاري التحميل...</div>}

        {/* Stages */}
        {roadmap.map((st, si) => {
          const Icon = ICONS[st.icon] || Briefcase
          const accent = st.accent || heroAccent
          return (
            <motion.div key={st.id} className="tt-stage"
              initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : si * 0.04, duration: .45 }}>
              <div className="tt-stage-head">
                <span className="tt-stage-icon" style={{ background: `linear-gradient(150deg, ${accent}2e, ${accent}0a)`, border: `1px solid ${accent}55`, color: accent }}>
                  <Icon size={24} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tt-stage-num" style={{ color: accent }}>المرحلة {st.sort_order}</div>
                  <h2 className="tt-stage-title">{st.title_ar}</h2>
                  <div className="tt-stage-titleen">{st.title_en}</div>
                </div>
                {st.cefr && <span className="tt-cefr" style={{ color: accent, background: `${accent}1a`, border: `1px solid ${accent}44` }}>{st.cefr}</span>}
              </div>

              <div className="tt-lessons">
                {st.lessons.map((l) => {
                  const isNext = nextLesson && l.id === nextLesson.id
                  return (
                    <Link key={l.id} to={`/biz/${l.slug}`} className={`tt-lesson${isNext ? ' is-next' : ''}`} style={{ '--tt-accent': accent }}>
                      <span className="tt-node" style={l.done
                        ? { background: 'rgba(34,197,94,.16)', border: '1px solid rgba(34,197,94,.5)', color: '#4ade80' }
                        : { background: `${accent}14`, border: `1px solid ${accent}44`, color: accent }}>
                        {l.done ? <Check size={18} /> : l.sort_order}
                      </span>
                      <div className="tt-lesson-body">
                        <h3 className="tt-lesson-title">{l.title_ar}</h3>
                        <div className="tt-lesson-en">{l.title_en}{l.done && l.score != null ? ` · ${l.score}%` : ''}</div>
                      </div>
                      {isNext && <span style={{ fontSize: 12, fontWeight: 800, color: accent, marginInlineEnd: 4 }}>{g('ابدأ', 'ابدئي')}</span>}
                      <ChevronLeft className="tt-lesson-chev" size={18} />
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )
        })}

        {!isLoading && roadmap.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ds-text-tertiary)', padding: 40 }}>
            <Sparkles size={28} style={{ marginBottom: 8 }} /><br />مسارك قيد التجهيز — قريبًا إن شاء الله.
          </div>
        )}
      </div>
    </div>
  )
}
