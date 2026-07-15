import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import {
  Mic2, ArrowLeft, ArrowRight, Volume2, Check, RotateCcw, Sparkles,
  TrendingUp, Target, Award, Flame, ChevronLeft,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { SCORE_TREND, DIAGNOSIS, FOCUS_AREAS } from '../../data/speaking/nadiahSpeakingTrack'
import { checkAnswer, isFullSentence } from '../../data/speaking/sentenceBuilder'

/* «مسار التحدث» — a personal speaking hub built from the student's OWN recordings.
   Creditless (fix-it drills self-check locally). Female Arabic, RTL, dark cinematic —
   consistent with «بناء الجُمَل». Gated by students.uses_speaking_track. */

const C = {
  bg: '#080d18',
  panel: 'rgba(255,255,255,0.035)',
  panelHi: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  borderHi: 'rgba(255,255,255,0.16)',
  gold: '#e0b667',
  goldSoft: 'rgba(224,182,103,0.12)',
  cyan: '#5ec6ff',
  cyanSoft: 'rgba(94,198,255,0.12)',
  green: '#5fd39a',
  greenSoft: 'rgba(95,211,154,0.12)',
  rose: '#e0997a',
  cream: '#eef2fb',
  dim: 'rgba(238,242,251,0.62)',
  meta: 'rgba(238,242,251,0.55)',
  faint: 'rgba(238,242,251,0.4)',
  shadowCard: '0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 8px -3px rgba(0,0,0,0.55), 0 18px 38px -20px rgba(0,0,0,0.72)',
  shadowGold: '0 9px 22px -10px rgba(207,159,78,0.5)',
  shadowModel: '0 10px 30px -16px rgba(95,211,154,0.42)',
}

function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.9
    window.speechSynthesis.speak(u)
  } catch { /* no-op */ }
}

const firstName = (p) => {
  const n = (p?.display_name || p?.full_name || '').trim()
  return n ? n.split(/\s+/)[0] : 'نادية'
}

export default function SpeakingTrack() {
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const navigate = useNavigate()
  const [active, setActive] = useState(null) // focus area
  const reduce = useReducedMotion()
  const name = firstName(profile)

  // Route guard: only students granted the personal speaking track may enter.
  useEffect(() => {
    if (studentData && studentData.uses_speaking_track !== true) navigate('/student', { replace: true })
  }, [studentData, navigate])

  if (active) return <Session area={active} onExit={() => setActive(null)} reduce={reduce} />
  return <Landing name={name} onPick={setActive} reduce={reduce} />
}

/* ── Landing ─────────────────────────────────────────────────────────────── */
function Landing({ name, onPick, reduce }) {
  const latest = SCORE_TREND[SCORE_TREND.length - 1]
  const best = Math.max(...SCORE_TREND.map((r) => r.overall))
  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: C.cream, minHeight: '100dvh', position: 'relative', background: C.bg }}>
      <Atmo />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 920, margin: '0 auto', padding: '52px 20px 120px' }}>
        {/* hero */}
        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: C.goldSoft, border: `1px solid ${C.border}`, marginBottom: 18 }}>
            <Mic2 size={15} style={{ color: C.gold }} />
            <span style={{ fontSize: 12.5, color: C.gold, fontWeight: 700 }}>مسارك في التحدّث</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display','Amiri',serif", fontSize: 38, fontWeight: 700, lineHeight: 1.2, margin: '0 0 10px' }}>
            أهلاً بعودتكِ يا {name} 🌿
          </h1>
          <p style={{ fontSize: 17, color: C.dim, lineHeight: 1.85, maxWidth: 620, margin: 0 }}>
            درسنا تسجيلاتكِ الحقيقية، وجهّزنا لكِ مساراً <b style={{ color: C.cream }}>مصمّماً عليكِ أنتِ</b> — يشتغل على أخطائكِ بالضبط، مو تمارين عامة.
          </p>
        </motion.div>

        {/* diagnosis */}
        <motion.div initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
          style={{ marginTop: 28, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 22, padding: '24px 26px', boxShadow: C.shadowCard }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <Target size={17} style={{ color: C.cyan }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.cream }}>تشخيصكِ</span>
          </div>
          <Diag icon={<Award size={16} style={{ color: C.green }} />} tone={C.green} label="قوّتكِ" text={DIAGNOSIS.strength_ar} />
          <Diag icon={<TrendingUp size={16} style={{ color: C.gold }} />} tone={C.gold} label="اللي يحتاج شغل" text={DIAGNOSIS.ceiling_ar} />
          <Diag icon={<Sparkles size={16} style={{ color: C.cyan }} />} tone={C.cyan} label="الخبر الحلو" text={DIAGNOSIS.insight_ar} last />
        </motion.div>

        {/* score trend */}
        <motion.div initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.14 }}
          style={{ marginTop: 16, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 22, padding: '22px 26px', boxShadow: C.shadowCard }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.cream }}>درجاتكِ في التحدّث</span>
            <span style={{ fontSize: 12.5, color: C.meta }}>أعلى درجة حتى الآن: <b style={{ color: C.gold, fontFamily: "'Inter',sans-serif" }}>{best.toFixed(1)}</b> / 9</span>
          </div>
          <TrendChart rows={SCORE_TREND} />
          <p style={{ margin: '14px 0 0', fontSize: 13.5, color: C.dim, lineHeight: 1.75 }}>
            الخط الذهبي = الدرجة الكليّة، والنقاط = القواعد. هدفنا نرفع القواعد فترتفع الكليّة معها.
          </p>
        </motion.div>

        {/* focus areas */}
        <div style={{ marginTop: 30, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.cream }}>الأنماط الستّة اللي نصقلها</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12.5, color: C.meta }}>{FOCUS_AREAS.length} مجالات</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
          {FOCUS_AREAS.map((a, i) => (
            <motion.button key={a.id} onClick={() => onPick(a)}
              initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 * i }}
              whileHover={reduce ? {} : { y: -2, borderColor: C.borderHi }}
              style={{ textAlign: 'right', cursor: 'pointer', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, padding: '20px 20px', boxShadow: C.shadowCard, transition: 'border-color .18s' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: C.gold, fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: C.cream }}>{a.title_ar}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: C.dim, lineHeight: 1.7, minHeight: 46 }}>{a.blurb_ar}</p>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: C.meta }}>{a.items.length} تمارين من كلامكِ</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.gold, fontWeight: 600 }}>ابدئي <ArrowLeft size={15} /></span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* daily record — staged */}
        <div style={{ marginTop: 22, background: C.panelHi, border: `1px dashed ${C.borderHi}`, borderRadius: 18, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: C.goldSoft, border: `1px solid ${C.border}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Flame size={22} style={{ color: C.gold }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: C.cream }}>تسجيل اليوم + التدريب الصوتي المباشر</div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 3, lineHeight: 1.6 }}>قريباً: تتكلمين كل يوم، ويعطيكِ المدرّب الذكي ملاحظات فوريّة على نفس الأنماط. نجهّزه لكِ الحين.</div>
          </div>
          <span style={{ fontSize: 12, color: C.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>قريباً</span>
        </div>
      </div>
    </div>
  )
}

function Diag({ icon, tone, label, text, last }) {
  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: last ? 0 : 12, marginBottom: last ? 0 : 12, borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.04)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: tone, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14.5, color: C.dim, lineHeight: 1.75 }}>{text}</div>
      </div>
    </div>
  )
}

function TrendChart({ rows }) {
  const W = 100, H = 46, max = 9
  const pts = rows.map((r, i) => ({
    x: (i / (rows.length - 1)) * W,
    yO: H - (r.overall / max) * H,
    yG: H - (r.grammar / max) * H,
    r,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yO.toFixed(1)}`).join(' ')
  return (
    <div style={{ marginTop: 10 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 120, overflow: 'visible' }}>
        {[3, 6, 9].map((g) => (
          <line key={g} x1="0" x2={W} y1={H - (g / max) * H} y2={H - (g / max) * H} stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
        ))}
        <path d={line} fill="none" stroke={C.gold} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.yG} r="1.6" fill={C.cyan} vectorEffect="non-scaling-stroke" />
            <circle cx={p.x} cy={p.yO} r="2" fill={C.gold} stroke={C.bg} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
      <div dir="rtl" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: "'Inter',sans-serif" }}>{r.overall.toFixed(1)}</div>
            <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.topic_ar}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Session (drill through a focus area) ────────────────────────────────── */
function Session({ area, onExit, reduce }) {
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState([])
  const [done, setDone] = useState(false)
  const item = area.items[idx]
  const total = area.items.length

  const record = (res) => setResults((r) => { const n = [...r]; n[idx] = res; return n })
  const goNext = () => { if (idx + 1 >= total) setDone(true); else setIdx((i) => i + 1) }

  if (done) {
    const fixed = results.filter((r) => r?.ok).length
    return (
      <Wrap>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div style={{ width: 74, height: 74, borderRadius: 22, background: C.goldSoft, border: `1px solid ${C.border}`, display: 'grid', placeItems: 'center', margin: '0 auto 22px', boxShadow: C.shadowGold }}>
            <Check size={34} style={{ color: C.gold }} />
          </div>
          <h2 style={{ fontFamily: "'Playfair Display','Amiri',serif", fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>خلّصتِ «{area.title_ar}»</h2>
          <p style={{ fontSize: 16, color: C.dim, margin: '0 0 8px' }}>صحّحتِ {fixed} من {total} — كل مرة تكرّرينها، تثبت في كلامكِ.</p>
          <p style={{ fontSize: 14, color: C.meta, margin: '0 0 28px' }}>هذي كانت من أخطائكِ الحقيقية — لمّا تختفي من هنا، تختفي من كلامكِ.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setIdx(0); setResults([]); setDone(false) }} style={{ ...ghost, padding: '13px 22px' }}><RotateCcw size={16} /> أعيديها</button>
            <button onClick={onExit} style={{ ...cta(true), flex: 'unset', padding: '13px 26px' }}>مجال ثاني <ArrowLeft size={17} /></button>
          </div>
        </div>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={onExit} style={ghost}><ArrowRight size={16} /> رجوع</button>
        <span style={{ fontSize: 13, color: C.dim }} dir="auto">{area.title_ar} · {idx + 1}/{total}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
        {area.items.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 3, background: i < idx ? C.gold : i === idx ? C.cyan : C.border, transition: 'background .3s' }} />
        ))}
      </div>
      {/* why (the rule for this area) */}
      <div style={{ background: C.cyanSoft, border: `1px solid rgba(94,198,255,0.2)`, borderRadius: 14, padding: '13px 16px', marginBottom: 20 }}>
        <span style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.7 }}><b style={{ color: C.cyan }}>القاعدة: </b>{area.why_ar}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={reduce ? false : { opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? {} : { opacity: 0, x: -22 }} transition={{ duration: 0.3 }}>
          <FixDrill item={item} onResult={record} onNext={goNext} last={idx + 1 >= total} />
        </motion.div>
      </AnimatePresence>
    </Wrap>
  )
}

function FixDrill({ item, onResult, onNext, last }) {
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [verdict, setVerdict] = useState(null)

  const commit = () => {
    const res = checkAnswer(item, answer)
    setVerdict(res); setRevealed(true)
    onResult({ ...res, full: isFullSentence(answer) })
  }

  return (
    <div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 13px', borderRadius: 999, background: 'rgba(224,153,122,0.12)', border: `1px solid rgba(224,153,122,0.3)`, marginBottom: 16 }}>
        <Sparkles size={14} style={{ color: C.rose }} />
        <span style={{ fontSize: 12.5, color: C.rose, fontWeight: 700 }}>من كلامكِ — صحّحيها</span>
      </div>
      <div dir="ltr" style={{ fontSize: 21, fontFamily: "'Inter', sans-serif", color: C.rose, fontWeight: 500, textAlign: 'left', textDecoration: 'line-through', textDecorationColor: 'rgba(224,153,122,0.5)', lineHeight: 1.5 }}>
        {item.broken}
      </div>

      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={revealed} dir="ltr" rows={2}
        placeholder="اكتبيها صحيحة…"
        style={{ width: '100%', marginTop: 18, resize: 'none', fontSize: 17, lineHeight: 1.6, fontFamily: "'Inter', sans-serif", color: C.cream, background: C.panelHi, border: `1px solid ${revealed ? C.border : C.borderHi}`, borderRadius: 14, padding: '14px 16px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.28)' }} />

      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ marginTop: 18 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: verdict?.ok ? C.green : C.gold, marginBottom: 12 }}>
              {verdict?.ok ? <Check size={15} /> : <RotateCcw size={15} />}
              {verdict?.ok ? 'ممتاز — صحّحتِها!' : 'قارنيها بالصحيحة وحاولي مرة ثانية'}
            </div>
            <div style={{ background: C.greenSoft, border: `1px solid rgba(95,211,154,0.28)`, borderRadius: 14, padding: '16px 18px', boxShadow: C.shadowModel }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 12.5, color: C.green, fontWeight: 700 }}>الصحيحة</span>
                <button onClick={() => speak(item.model)} style={{ ...ghost }}><Volume2 size={15} /> استمعي</button>
              </div>
              <p dir="ltr" style={{ margin: '8px 0 0', fontSize: 19, lineHeight: 1.5, fontFamily: "'Inter', sans-serif", color: C.cream, fontWeight: 500, textAlign: 'left' }}>{item.model}</p>
              {item.alt?.length > 0 && (
                <p dir="ltr" style={{ margin: '8px 0 0', fontSize: 14, color: C.dim, fontFamily: "'Inter', sans-serif", textAlign: 'left' }}>
                  {item.alt.map((a, i) => <span key={i} style={{ display: 'block' }}>— {a}</span>)}
                </p>
              )}
            </div>
            {item.rule_ar && (
              <p style={{ marginTop: 14, fontSize: 14.5, color: C.dim, lineHeight: 1.8 }}><b style={{ color: C.gold }}>ليش؟ </b>{item.rule_ar}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: 24 }}>
        {!revealed ? (
          <button onClick={commit} disabled={!answer.trim()} style={cta(!!answer.trim())}><Check size={18} /> تحقّقي</button>
        ) : (
          <button onClick={onNext} style={cta(true)}>{last ? <>النتيجة <Award size={17} /></> : <>التالية <ArrowLeft size={18} /></>}</button>
        )}
      </div>
    </div>
  )
}

/* ── shared ──────────────────────────────────────────────────────────────── */
function Wrap({ children }) {
  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: C.cream, minHeight: '100dvh', position: 'relative', background: C.bg }}>
      <Atmo />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto', padding: '30px 18px 140px' }}>{children}</div>
    </div>
  )
}

function Atmo() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: C.bg }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 10%, rgba(224,182,103,0.10) 0%, transparent 52%), radial-gradient(ellipse at 80% 85%, rgba(94,198,255,0.08) 0%, transparent 52%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.35) 100%)' }} />
    </div>
  )
}

const ghost = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer',
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.cream,
  borderRadius: 12, padding: '9px 16px', minHeight: 44, fontSize: 13.5, fontWeight: 600, fontFamily: "'Tajawal',sans-serif",
}
function cta(enabled) {
  return {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.4,
    background: enabled ? 'linear-gradient(180deg, #e6bf74, #cf9f4e)' : 'rgba(255,255,255,0.06)',
    color: enabled ? '#1a1206' : C.faint, border: 'none', borderRadius: 14,
    padding: '14px 20px', fontSize: 15.5, fontWeight: 700, fontFamily: "'Tajawal',sans-serif",
    minHeight: 48, boxShadow: enabled ? C.shadowGold : 'none',
  }
}
