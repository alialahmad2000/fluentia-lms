import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Blocks, ArrowLeft, ArrowRight, Volume2, Check, RotateCcw, Sparkles,
  Wand2, PencilLine, Shuffle, Wrench, Mic2, Trophy,
} from 'lucide-react'
import { SENTENCE_SETS, checkAnswer, isFullSentence } from '../../data/speaking/sentenceBuilder'

/* بناء الجُمل — Sentence Building trainer (creditless).
   Trains a vocab-rich learner to assemble FULL sentences on demand — the reflex
   speaking needs. Female Arabic, RTL, dark cinematic. No runtime AI. */

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
  cream: '#eef2fb',
  dim: 'rgba(238,242,251,0.62)',
  meta: 'rgba(238,242,251,0.55)',
  faint: 'rgba(238,242,251,0.4)',
  shadowCard: '0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 8px -3px rgba(0,0,0,0.55), 0 18px 38px -20px rgba(0,0,0,0.72)',
  shadowGold: '0 9px 22px -10px rgba(207,159,78,0.5)',
  shadowModel: '0 10px 30px -16px rgba(95,211,154,0.42)',
  shadowCyan: '0 7px 22px -10px rgba(94,198,255,0.52)',
}

const TYPE_META = {
  expand: { icon: Wand2, label: 'وسّعي الكلمة', color: C.gold },
  frame: { icon: PencilLine, label: 'أكملي القالب', color: C.cyan },
  arrange: { icon: Shuffle, label: 'رتّبي الجملة', color: C.cyan },
  fuller: { icon: Sparkles, label: 'قوليها أطول', color: C.gold },
  fix: { icon: Wrench, label: 'صحّحيها', color: '#e08a67' },
}

function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  } catch { /* no-op */ }
}

export default function SentenceBuilder() {
  const [activeSet, setActiveSet] = useState(null)
  const reduce = useReducedMotion()

  if (activeSet) {
    return <Session set={activeSet} onExit={() => setActiveSet(null)} reduce={reduce} />
  }
  return <Landing onPick={setActiveSet} reduce={reduce} />
}

/* ── Landing ─────────────────────────────────────────────────────────────── */
function Landing({ onPick, reduce }) {
  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: C.cream, minHeight: '100dvh', position: 'relative', background: C.bg }}>
      <Atmo />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', padding: '56px 20px 120px' }}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: C.goldSoft, border: `1px solid ${C.border}`, marginBottom: 18 }}>
            <Blocks size={15} style={{ color: C.gold }} />
            <span style={{ fontSize: 12.5, color: C.gold, fontWeight: 700 }}>تدريب المحادثة</span>
          </div>
          <h1 style={{ fontFamily: "'Amiri', serif", fontSize: 40, fontWeight: 700, lineHeight: 1.15, margin: '0 0 10px' }}>
            بناء الجُمَل
          </h1>
          <p style={{ fontSize: 17, color: C.dim, lineHeight: 1.8, maxWidth: 560, margin: 0 }}>
            عندكِ الكلمات — والحين نمرّن عقلكِ يركّبها <b style={{ color: C.cream }}>جُمَلاً كاملة</b> بسرعة، عشان لمّا تتكلمين تطلع الجملة كاملة بدل كلمات متفرّقة.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gap: 16, marginTop: 34 }}>
          {SENTENCE_SETS.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => onPick(s)}
              initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 * i }}
              whileHover={reduce ? {} : { y: -2, borderColor: C.borderHi }}
              style={{
                textAlign: 'right', cursor: 'pointer', width: '100%',
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 20, padding: '24px 26px',
                display: 'flex', alignItems: 'center', gap: 18, transition: 'border-color .18s, background .18s',
                boxShadow: C.shadowCard,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 21, fontWeight: 700, color: C.cream }}>{s.title_ar}</span>
                  <span dir="ltr" style={{ fontSize: 13, color: C.meta, fontStyle: 'italic' }}>{s.title_en}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14.5, color: C.dim, lineHeight: 1.7 }}>{s.blurb_ar}</p>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, color: C.meta }}>{s.items.length} تمارين</span>
                  <span style={{ color: C.meta }}>·</span>
                  <span style={{ fontSize: 12.5, color: C.gold, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Mic2 size={13} /> قوليها بصوتكِ
                  </span>
                </div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: C.goldSoft, border: `1px solid ${C.border}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <ArrowLeft size={20} style={{ color: C.gold }} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Session ─────────────────────────────────────────────────────────────── */
function Session({ set, onExit, reduce }) {
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState([]) // {ok, fullSentence, answer}
  const [done, setDone] = useState(false)
  const item = set.items[idx]
  const total = set.items.length

  const record = useCallback((res) => {
    setResults((r) => {
      const next = [...r]
      next[idx] = res
      return next
    })
  }, [idx])

  const goNext = useCallback(() => {
    if (idx + 1 >= total) setDone(true)
    else setIdx((i) => i + 1)
  }, [idx, total])

  if (done) return <Recap set={set} results={results} onExit={onExit} onRetry={() => { setIdx(0); setResults([]); setDone(false) }} reduce={reduce} />

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: C.cream, minHeight: '100dvh', position: 'relative', background: C.bg }}>
      <Atmo />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto', padding: '30px 18px 140px' }}>
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <button onClick={onExit} style={ghost}>
            <ArrowRight size={17} /> رجوع
          </button>
          <span style={{ fontSize: 13, color: C.dim }} dir="auto">التمرين {idx + 1} من {total}</span>
        </div>
        {/* progress rail */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 30 }}>
          {set.items.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 3,
              background: i < idx ? C.gold : i === idx ? C.cyan : C.border,
              transition: 'background .3s',
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? {} : { opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            <Drill item={item} onResult={record} onNext={goNext} last={idx + 1 >= total} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── One drill ───────────────────────────────────────────────────────────── */
function Drill({ item, onResult, onNext, last }) {
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [verdict, setVerdict] = useState(null) // result of checkAnswer
  const [order, setOrder] = useState([]) // for arrange
  const shuffled = useMemo(() => item.type === 'arrange' ? shuffle(item.tokens) : [], [item])

  const commit = () => {
    const ans = item.type === 'arrange' ? order.join(' ') : answer
    const res = checkAnswer(item, ans)
    setVerdict(res)
    setRevealed(true)
    onResult({ ...res, answer: ans, full: isFullSentence(ans) })
  }

  const canCommit = item.type === 'arrange' ? order.length === item.tokens.length : answer.trim().length > 0

  return (
    <div>
      {/* type chip */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 13px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, marginBottom: 18 }}>
        <Icon size={15} style={{ color: meta.color }} />
        <span style={{ fontSize: 12.5, color: meta.color, fontWeight: 700 }}>{meta.label}</span>
      </div>

      {/* prompt */}
      <Prompt item={item} />

      {/* input area */}
      {item.type === 'arrange' ? (
        <Arrange tokens={shuffled} order={order} setOrder={setOrder} disabled={revealed} />
      ) : (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={revealed}
          dir="ltr"
          rows={2}
          placeholder="اكتبي الجملة كاملة هنا…"
          style={{
            width: '100%', marginTop: 18, resize: 'none', fontSize: 17, lineHeight: 1.6,
            fontFamily: "'Inter', sans-serif", color: C.cream, background: C.panelHi,
            border: `1px solid ${revealed ? C.border : C.borderHi}`, borderRadius: 14, padding: '14px 16px', outline: 'none',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.28)',
          }}
        />
      )}

      {/* nudge */}
      {!revealed && (
        <p style={{ marginTop: 12, fontSize: 13, color: C.faint, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Mic2 size={14} style={{ color: C.gold }} /> قوليها بصوتكِ أول، بعدين اكتبيها كاملة.
        </p>
      )}

      {/* reveal / verdict */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ marginTop: 20 }}
          >
            <VerdictBadge verdict={verdict} full={isFullSentence(item.type === 'arrange' ? order.join(' ') : answer)} />
            <div style={{ background: C.greenSoft, border: `1px solid rgba(95,211,154,0.28)`, borderRadius: 14, padding: '16px 18px', marginTop: 14, boxShadow: C.shadowModel }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 12.5, color: C.green, fontWeight: 700 }}>الجملة النموذجية</span>
                <button onClick={() => speak(item.model)} style={ghost}>
                  <Volume2 size={15} /> استمعي
                </button>
              </div>
              <p dir="ltr" style={{ margin: '8px 0 0', fontSize: 19, lineHeight: 1.5, fontFamily: "'Inter', sans-serif", color: C.cream, fontWeight: 500, textAlign: 'left' }}>
                {item.model}
              </p>
              {item.alt?.length > 0 && (
                <p dir="ltr" style={{ margin: '10px 0 0', fontSize: 14, color: C.dim, fontFamily: "'Inter', sans-serif", textAlign: 'left' }}>
                  {item.alt.map((a, i) => <span key={i} style={{ display: 'block' }}>— {a}</span>)}
                </p>
              )}
            </div>
            {(item.tip_ar || item.rule_ar) && (
              <p style={{ marginTop: 14, fontSize: 14.5, color: C.dim, lineHeight: 1.8 }}>
                <b style={{ color: C.gold }}>ليش؟ </b>{item.tip_ar || item.rule_ar}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* actions */}
      <div style={{ marginTop: 26, display: 'flex', gap: 12 }}>
        {!revealed ? (
          <button onClick={commit} disabled={!canCommit} style={{ ...cta(canCommit) }}>
            <Check size={18} /> تحقّقي
          </button>
        ) : (
          <button onClick={onNext} style={{ ...cta(true) }}>
            {last ? <>النتيجة <Trophy size={17} /></> : <>التالي <ArrowLeft size={18} /></>}
          </button>
        )}
      </div>
    </div>
  )
}

function Prompt({ item }) {
  if (item.type === 'expand') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <span dir="ltr" style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Inter', sans-serif", color: C.gold }}>{item.word}</span>
          <span style={{ fontSize: 15, color: C.dim }}>{item.gloss_ar}</span>
        </div>
        <p style={{ margin: 0, fontSize: 17, color: C.cream, lineHeight: 1.7 }}>{item.situation_ar}</p>
      </div>
    )
  }
  if (item.type === 'frame') {
    return (
      <div>
        <p style={{ margin: '0 0 12px', fontSize: 15, color: C.dim }}>{item.hint_ar}</p>
        <div dir="ltr" style={{ fontSize: 22, fontFamily: "'Inter', sans-serif", color: C.cream, fontWeight: 600, textAlign: 'left' }}>
          {item.starter} <span style={{ color: C.faint }}>_______</span>
        </div>
      </div>
    )
  }
  if (item.type === 'fuller') {
    return (
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 15, color: C.dim }}>هذي مجرد كلمات — حوّليها إلى جملة كاملة:</p>
        <div dir="ltr" style={{ fontSize: 22, fontFamily: "'Inter', sans-serif", color: C.gold, fontWeight: 600, textAlign: 'left' }}>“{item.fragment}”</div>
      </div>
    )
  }
  if (item.type === 'fix') {
    return (
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 15, color: C.dim }}>في هذي الجملة خطأ — صحّحيها:</p>
        <div dir="ltr" style={{ fontSize: 21, fontFamily: "'Inter', sans-serif", color: '#e0997a', fontWeight: 500, textAlign: 'left', textDecoration: 'line-through', textDecorationColor: 'rgba(224,153,122,0.5)' }}>{item.broken}</div>
      </div>
    )
  }
  // arrange
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 15, color: C.dim }}>رتّبي الكلمات لتكوّني جملة صحيحة:</p>
      <p style={{ margin: 0, fontSize: 13, color: C.faint }}>{item.tip_ar}</p>
    </div>
  )
}

function Arrange({ tokens, order, setOrder, disabled }) {
  return (
    <div style={{ marginTop: 18 }}>
      {/* tray */}
      <div dir="ltr" style={{
        minHeight: 58, background: C.panelHi, border: `1px dashed ${C.borderHi}`, borderRadius: 14,
        padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
      }}>
        {order.length === 0 && <span style={{ color: C.faint, fontSize: 14, fontFamily: "'Inter',sans-serif" }}>اضغطي الكلمات بالترتيب…</span>}
        {order.map((key) => {
          const word = key.split('::')[0]
          return (
            <button key={key} disabled={disabled} onClick={() => setOrder((o) => o.filter((k) => k !== key))}
              style={{ ...chip(true), fontFamily: "'Inter',sans-serif" }}>{word}</button>
          )
        })}
      </div>
      {/* bank */}
      <div dir="ltr" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {tokens.map((t, i) => {
          const key = `${t}::${i}`
          const used = order.includes(key)
          return (
            <button key={key} disabled={disabled || used} onClick={() => setOrder((o) => [...o, key])}
              style={{ ...chip(false), opacity: used ? 0.28 : 1, fontFamily: "'Inter',sans-serif" }}>{t}</button>
          )
        })}
      </div>
    </div>
  )
}

function VerdictBadge({ verdict, full }) {
  const ok = verdict?.ok
  const CorrectIcon = ok ? Check : RotateCcw
  const label = ok ? (verdict.close ? 'قريبة جداً — أحسنتِ!' : 'إجابة صحيحة') : 'قارنيها بالنموذج وحاولي مرة ثانية'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* the metric this whole trainer exists to move — celebrated */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 16,
        background: full ? C.cyanSoft : C.goldSoft,
        border: `1px solid ${full ? C.cyan : 'rgba(224,182,103,0.4)'}`,
        boxShadow: full ? C.shadowCyan : 'none',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: full ? 'rgba(94,198,255,0.16)' : 'rgba(224,182,103,0.14)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {full ? <Check size={20} style={{ color: C.cyan }} /> : <PencilLine size={18} style={{ color: C.gold }} />}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: full ? C.cyan : C.gold }}>{full ? 'جملة كاملة!' : 'جملة ناقصة'}</div>
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 2, lineHeight: 1.6 }}>
            {full ? 'ركّبتِ فاعلاً وفعلاً — هذا بالضبط اللي نبيه في الكلام.' : 'أضيفي فاعلاً + فعلاً لتصير جملة كاملة.'}
          </div>
        </div>
      </div>
      {/* correctness — a quieter caption */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: ok ? C.green : C.dim, fontWeight: 600 }}>
        <CorrectIcon size={14} /> {label}
      </div>
    </div>
  )
}

/* ── Recap ───────────────────────────────────────────────────────────────── */
function Recap({ set, results, onExit, onRetry, reduce }) {
  const answered = results.filter(Boolean)
  const fullCount = answered.filter((r) => r.full).length
  const total = set.items.length
  const rate = total ? Math.round((fullCount / total) * 100) : 0
  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: C.cream, minHeight: '100dvh', position: 'relative', background: C.bg }}>
      <Atmo />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 620, margin: '0 auto', padding: '60px 20px 120px', textAlign: 'center' }}>
        <motion.div initial={reduce ? false : { scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ width: 74, height: 74, borderRadius: 22, background: C.goldSoft, border: `1px solid ${C.border}`, display: 'grid', placeItems: 'center', margin: '0 auto 22px', boxShadow: C.shadowGold }}>
            <Trophy size={34} style={{ color: C.gold }} />
          </div>
          <h2 style={{ fontFamily: "'Amiri', serif", fontSize: 30, fontWeight: 700, margin: '0 0 8px' }}>خلّصتِ التمرين!</h2>
          <p style={{ fontSize: 16, color: C.dim, margin: '0 0 30px', lineHeight: 1.7 }}>
            الأهم مو الإجابة الصح — الأهم إنكِ تكوّنين <b style={{ color: C.cream }}>جُمَلاً كاملة</b>. هذا مقياسكِ اليوم:
          </p>
        </motion.div>

        {/* full-sentence rate — the metric that matters */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 22, padding: '28px 24px', boxShadow: C.shadowCard }}>
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 10 }}>نسبة الجُمَل الكاملة</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 56, fontWeight: 800, fontFamily: "'Inter Tight','Inter',sans-serif", color: rate >= 60 ? C.green : C.gold }}>{rate}</span>
            <span style={{ fontSize: 24, color: C.dim }}>%</span>
          </div>
          <div style={{ height: 8, borderRadius: 5, background: C.border, marginTop: 16, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.8, delay: 0.3 }}
              style={{ height: '100%', borderRadius: 5, background: rate >= 60 ? C.green : C.gold }} />
          </div>
          <p style={{ fontSize: 14, color: C.dim, margin: '16px 0 0', lineHeight: 1.7 }}>
            {fullCount} من {total} جُمَل طلعت كاملة. كرّري التمرين بأيام مختلفة وشوفي الرقم يرتفع 📈
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 26, justifyContent: 'center' }}>
          <button onClick={onRetry} style={{ ...ghost, padding: '13px 22px' }}><RotateCcw size={17} /> أعيديها</button>
          <button onClick={onExit} style={{ ...cta(true), flex: 'unset', padding: '13px 26px' }}>تمارين ثانية <ArrowLeft size={17} /></button>
        </div>
      </div>
    </div>
  )
}

/* ── shared bits ─────────────────────────────────────────────────────────── */
function Atmo() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: C.bg }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 12%, rgba(224,182,103,0.10) 0%, transparent 52%), radial-gradient(ellipse at 78% 82%, rgba(94,198,255,0.08) 0%, transparent 52%)' }} />
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

function chip(inTray) {
  return {
    cursor: 'pointer', padding: '9px 15px', minHeight: 44, borderRadius: 12, fontSize: 16, fontWeight: 600,
    background: inTray ? C.cyanSoft : C.panelHi,
    border: `1px solid ${inTray ? C.cyan : C.borderHi}`,
    color: C.cream,
  }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
