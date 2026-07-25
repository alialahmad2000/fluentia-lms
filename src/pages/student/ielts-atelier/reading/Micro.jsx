import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Radar, Search, AlignLeft, AlertTriangle, X, RotateCcw, Check } from 'lucide-react'
import { LabHeader } from '../_ui/primitives'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useMicroDrills, useMicroDrillCounts, useMicroDrillStats, useLogMicroAttempt } from '@/hooks/ielts/useReadingLab'
import { useG } from '@/i18n/gender'

const BASE = '/student/ielts-atelier'
const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])

// ── The four raw sub-skills ─────────────────────────────────────────────────
// These are NOT passages and NOT exams. Each is one rep on one mechanism, short
// enough to do in a queue on a phone. This is the rung where 6.5 becomes 7.5,
// and the rung nothing else in the section covers.
const KINDS = [
  {
    key: 'paraphrase', icon: Radar, tone: 'accent', seconds: 30, reps: 10,
    title: 'رادار إعادة الصياغة',
    blurb: 'يظهر لك نصّ السؤال وأربع عبارات — أيّها تقول الشيء نفسه بكلمات مختلفة؟ هذا التمرين وحده يعالج أكثر من نصف أخطاء القراءة.',
  },
  {
    key: 'scan', icon: Search, tone: 'gold', seconds: 90, reps: 6,
    title: 'القنص',
    blurb: 'ابحث عن الرقم أو الاسم داخل جدار من النص واضغط عليه. لا فهم — تحديد موقع فقط. السرعة هنا هي السرعة في الامتحان.',
  },
  {
    key: 'gist', icon: AlignLeft, tone: 'accent', seconds: 20, reps: 10,
    title: 'صيد الفكرة',
    blurb: 'عشرون ثانية على فقرة واحدة، ثم اختيار عنوانها. تمرين مطابقة العناوين مضغوطاً في فقرة واحدة حتى تصير المهارة تلقائية.',
  },
  {
    key: 'qualifier', icon: AlertTriangle, tone: 'gold', seconds: 15, reps: 10,
    title: 'الكلمات المحدِّدة',
    blurb: 'all · some · may · must · usually. الكلمات التي تقرّر «صح» من «غير مذكور». جملة واحدة وقرار واحد.',
  },
]
const byKey = Object.fromEntries(KINDS.map((k) => [k.key, k]))

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}%.,]/gu, '')

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Hub ─────────────────────────────────────────────────────────────────────
function DrillCard({ kind, count, stat, onStart }) {
  const I = kind.icon
  const gold = kind.tone === 'gold'
  const acc = stat?.n ? Math.round((stat.correct / stat.n) * 100) : null
  return (
    <button type="button" onClick={() => onStart(kind.key)} className="iel-gcard" disabled={!count}
      style={{
        display: 'flex', gap: 14, padding: 18, width: '100%', textAlign: 'start',
        cursor: count ? 'pointer' : 'not-allowed', opacity: count ? 1 : 0.55,
        fontFamily: "'Tajawal', sans-serif", alignItems: 'flex-start',
      }}>
      <span style={{
        width: 46, height: 46, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center',
        background: gold ? 'var(--iel-gold-soft)' : 'var(--iel-accent-soft)',
        border: `1px solid ${gold ? 'rgba(234,179,8,.3)' : 'rgba(16,185,129,.3)'}`,
        color: gold ? 'var(--iel-gold-ink)' : 'var(--iel-accent-ink)',
      }}><I size={21} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 5 }}>{kind.title}</div>
        <p style={{ fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.75, margin: '0 0 11px' }}>{kind.blurb}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="iel-metachip" style={{ background: gold ? 'var(--iel-gold-soft)' : 'var(--iel-accent-soft)', borderColor: gold ? 'rgba(234,179,8,.3)' : 'rgba(16,185,129,.3)', color: gold ? 'var(--iel-gold-ink)' : 'var(--iel-accent-ink)' }}>
            {arDigit(kind.seconds)} ثانية
          </span>
          {acc != null && <span className="iel-metachip">آخر النتائج {arDigit(acc)}٪</span>}
          {stat?.bestMs != null && kind.key === 'scan' && <span className="iel-metachip">أفضل زمن {arDigit((stat.bestMs / 1000).toFixed(1))} ثانية</span>}
          <span className="iel-metachip">{count ? `${arDigit(count)} تمريناً` : 'قريباً'}</span>
        </div>
      </div>
    </button>
  )
}

// ── Per-kind question renderers ─────────────────────────────────────────────
const OPT_BASE = {
  display: 'block', width: '100%', textAlign: 'start', padding: '13px 15px', borderRadius: 12,
  border: '1px solid var(--iel-border)', background: 'var(--iel-surface-2)', color: 'var(--iel-ink)',
  fontFamily: "'Tajawal', sans-serif", fontSize: 14, lineHeight: 1.7, cursor: 'pointer',
  transition: 'background .14s, border-color .14s, transform .12s',
}
function optStyle(i, picked, answer, revealed) {
  const s = { ...OPT_BASE }
  if (!revealed) return s
  if (i === answer) {
    s.background = 'var(--iel-accent-soft)'; s.borderColor = 'rgba(16,185,129,.5)'; s.color = 'var(--iel-accent-ink)'; s.fontWeight = 700
  } else if (i === picked) {
    s.background = 'rgba(248,113,113,.13)'; s.borderColor = 'rgba(248,113,113,.45)'; s.color = '#fca5a5'
  } else {
    s.opacity = 0.5
  }
  s.cursor = 'default'
  return s
}

function ChoiceList({ options, picked, answer, revealed, onPick, ltr }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {options.map((o, i) => (
        <button key={i} type="button" disabled={revealed} onClick={() => onPick(i)}
          style={{ ...optStyle(i, picked, answer, revealed), direction: ltr ? 'ltr' : 'rtl', textAlign: ltr ? 'left' : 'start' }}>
          {o}
        </button>
      ))}
    </div>
  )
}

function ParaphraseQ({ item, picked, revealed, onPick }) {
  const p = item.payload
  return (
    <>
      <div style={{ padding: '15px 17px', borderRadius: 13, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', marginBottom: 16 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 8 }}>العبارة</div>
        <div style={{ direction: 'ltr', textAlign: 'left', fontSize: 15.5, lineHeight: 1.75, color: 'var(--iel-ink)', fontWeight: 600 }}>{p.stem}</div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--iel-ink-3)', marginBottom: 10 }}>أيّها يقول الشيء نفسه؟</div>
      <ChoiceList options={p.options} picked={picked} answer={p.answer} revealed={revealed} onPick={onPick} ltr />
    </>
  )
}

function QualifierQ({ item, picked, revealed, onPick }) {
  const p = item.payload
  return (
    <>
      <div style={{ padding: '15px 17px', borderRadius: 13, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 8 }}>النص</div>
        <div style={{ direction: 'ltr', textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: 'var(--iel-ink)' }}>{p.passage}</div>
      </div>
      <div style={{ padding: '15px 17px', borderRadius: 13, background: 'var(--iel-gold-soft)', border: '1px solid rgba(234,179,8,.24)', marginBottom: 16 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--iel-gold-ink)', marginBottom: 8 }}>العبارة</div>
        <div style={{ direction: 'ltr', textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: 'var(--iel-ink)', fontWeight: 600 }}>{p.claim}</div>
      </div>
      <ChoiceList options={p.options} picked={picked} answer={p.answer} revealed={revealed} onPick={onPick} ltr />
    </>
  )
}

function GistQ({ item, picked, revealed, onPick }) {
  const p = item.payload
  return (
    <>
      <div style={{ padding: '16px 18px', borderRadius: 13, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', marginBottom: 16, maxHeight: 260, overflowY: 'auto' }}>
        <div style={{ direction: 'ltr', textAlign: 'left', fontSize: 14.5, lineHeight: 1.85, color: 'var(--iel-ink-2)' }}>{p.paragraph}</div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--iel-ink-3)', marginBottom: 10 }}>أيّ عنوان يلخّص الفقرة كلها؟</div>
      <ChoiceList options={p.options} picked={picked} answer={p.answer} revealed={revealed} onPick={onPick} ltr />
    </>
  )
}

// Scan is the odd one out: there are no options — the student must LOCATE the
// target inside real text and tap it. Every word is a target, which is exactly
// what makes it a location drill rather than a comprehension one.
function ScanQ({ item, picked, revealed, onPick }) {
  const g = useG()
  const p = item.payload
  const targetWords = useMemo(() => new Set(String(p.target).split(/\s+/).map(norm).filter(Boolean)), [p.target])
  const tokens = useMemo(() => String(p.text).split(/(\s+)/), [p.text])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 13, background: 'var(--iel-gold-soft)', border: '1px solid rgba(234,179,8,.26)', marginBottom: 14 }}>
        <Search size={17} style={{ color: 'var(--iel-gold-ink)', flex: 'none' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--iel-gold-ink)', marginBottom: 3 }}>{g('ابحث عن هذا', 'ابحثي عن هذا')} {p.kind_ar} {g('واضغط عليه', 'واضغطي عليه')}</div>
          <div className="iel-serif" style={{ direction: 'ltr', textAlign: 'left', fontSize: 19, fontWeight: 700, color: 'var(--iel-ink)' }}>{p.target}</div>
        </div>
      </div>
      <div style={{
        direction: 'ltr', textAlign: 'left', fontSize: 14, lineHeight: 2, color: 'var(--iel-ink-2)',
        padding: '16px 18px', borderRadius: 13, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)',
        maxHeight: 320, overflowY: 'auto',
      }}>
        {tokens.map((t, i) => {
          if (/^\s+$/.test(t)) return <span key={i}>{t}</span>
          const isTarget = targetWords.has(norm(t))
          const show = revealed && isTarget
          const wrongPick = revealed && picked === i && !isTarget
          return (
            <span key={i} onClick={() => !revealed && onPick(i, isTarget)}
              style={{
                cursor: revealed ? 'default' : 'pointer', borderRadius: 5, padding: '1px 2px',
                background: show ? 'rgba(16,185,129,.28)' : wrongPick ? 'rgba(248,113,113,.25)' : 'transparent',
                color: show ? 'var(--iel-accent-ink)' : wrongPick ? '#fca5a5' : undefined,
                fontWeight: show ? 700 : undefined,
                outline: show ? '1px solid rgba(16,185,129,.5)' : 'none',
              }}>{t}</span>
          )
        })}
      </div>
    </>
  )
}

const RENDERER = { paraphrase: ParaphraseQ, qualifier: QualifierQ, gist: GistQ, scan: ScanQ }

// ── Runner ──────────────────────────────────────────────────────────────────
function Runner({ kind, items, onExit }) {
  const studentId = useStudentId()
  const log = useLogMicroAttempt()
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [wasRight, setWasRight] = useState(false)
  const [results, setResults] = useState([])
  const [left, setLeft] = useState(kind.seconds)
  const startRef = useRef(Date.now())
  const tickRef = useRef(null)

  const item = items[idx]
  const done = idx >= items.length

  // Per-rep countdown. Running out is a wrong answer — under the clock is the
  // whole point of the drill.
  useEffect(() => {
    if (done || revealed) return
    setLeft(kind.seconds)
    startRef.current = Date.now()
    tickRef.current = setInterval(() => {
      setLeft((t) => {
        if (t <= 1) { clearInterval(tickRef.current); settle(null, false); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [idx, revealed, done]) // eslint-disable-line react-hooks/exhaustive-deps

  function settle(choice, correct) {
    clearInterval(tickRef.current)
    const ms = Date.now() - startRef.current
    setPicked(choice)
    setWasRight(correct)
    setRevealed(true)
    setResults((r) => [...r, { correct, ms }])
    log.mutate({ studentId, drillKind: kind.key, drillId: item?.id, isCorrect: correct, ms })
    // A correct answer needs no explanation — keep the rhythm fast. A wrong one
    // waits for the student to read WHY, because that is the entire lesson.
    if (correct) setTimeout(() => next(), 900)
  }

  function handlePick(a, b) {
    if (revealed) return
    if (kind.key === 'scan') settle(a, !!b)
    else settle(a, a === item.payload.answer)
  }

  function next() {
    setPicked(null); setRevealed(false); setWasRight(false)
    setIdx((i) => i + 1)
  }

  if (done) {
    const correct = results.filter((r) => r.correct).length
    const avgMs = results.length ? results.reduce((a, r) => a + r.ms, 0) / results.length : 0
    const pct = results.length ? Math.round((correct / results.length) * 100) : 0
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', paddingTop: 8 }}>
        <div className="iel-coach">
          <div className="iel-coach-glow" />
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.06em', marginBottom: 12 }}>انتهت الجولة</div>
            <div className="iel-serif" style={{ fontSize: 54, fontWeight: 700, color: pct >= 80 ? 'var(--iel-accent-ink)' : pct >= 60 ? 'var(--iel-gold-ink)' : '#fca5a5', lineHeight: 1 }}>
              {arDigit(correct)} / {arDigit(results.length)}
            </div>
            <p style={{ fontSize: 14, color: 'var(--iel-ink-2)', margin: '14px 0 0', lineHeight: 1.8 }}>
              متوسّط زمنك {arDigit((avgMs / 1000).toFixed(1))} ثانية لكل تمرين
              {pct >= 80 ? ' — هذه المهارة صارت تلقائية.' : pct >= 60 ? ' — قريبة. جولة أخرى تثبّتها.' : ' — كرّر الجولة، فالتكرار هنا أهم من الشرح.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => onExit(true)} className="iel-metachip"
                style={{ cursor: 'pointer', padding: '10px 18px', background: 'var(--iel-accent-soft)', borderColor: 'rgba(16,185,129,.3)', color: 'var(--iel-accent-ink)', fontSize: 13 }}>
                <RotateCcw size={14} /> جولة أخرى
              </button>
              <button type="button" onClick={() => onExit(false)} className="iel-metachip" style={{ cursor: 'pointer', padding: '10px 18px', fontSize: 13 }}>
                رجوع للتمارين
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const Q = RENDERER[kind.key]
  const pctLeft = (left / kind.seconds) * 100
  const urgent = left <= Math.max(3, kind.seconds * 0.2)

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* header: exit · progress dots · clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button type="button" onClick={() => onExit(false)} aria-label="إنهاء"
          style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none', cursor: 'pointer', border: '1px solid var(--iel-border)', background: 'var(--iel-surface)', color: 'var(--iel-ink-2)' }}>
          <X size={16} />
        </button>
        <div style={{ display: 'flex', gap: 5, flex: 1, minWidth: 0 }}>
          {items.map((_, i) => (
            <span key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < results.length ? (results[i]?.correct ? 'var(--iel-accent)' : '#fb7185') : i === idx ? 'var(--iel-ink-3)' : 'var(--iel-track)',
            }} />
          ))}
        </div>
        <div className="iel-serif" style={{ fontSize: 19, fontWeight: 700, flex: 'none', minWidth: 42, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: urgent ? '#fca5a5' : 'var(--iel-ink-2)' }}>
          {arDigit(left)}
        </div>
      </div>

      {/* clock bar */}
      <div style={{ height: 3, borderRadius: 2, background: 'var(--iel-track)', overflow: 'hidden', marginBottom: 20 }}>
        <span style={{ display: 'block', height: '100%', width: `${pctLeft}%`, background: urgent ? '#fb7185' : 'var(--iel-accent)', transition: 'width 1s linear' }} />
      </div>

      <Q item={item} picked={picked} revealed={revealed} onPick={handlePick} />

      {/* the lesson — only on a miss, and it stays until she moves on */}
      {revealed && !wasRight && (
        <div style={{ marginTop: 16, padding: '15px 17px', borderRadius: 13, background: 'var(--iel-gold-soft)', border: '1px solid rgba(234,179,8,.26)' }}>
          {item.payload.focus && (
            <div className="iel-serif" style={{ direction: 'ltr', textAlign: 'left', fontSize: 13.5, fontWeight: 700, color: 'var(--iel-gold-ink)', marginBottom: 7 }}>{item.payload.focus}</div>
          )}
          <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.85, margin: 0 }}>
            {item.payload.note_ar || 'راجع الخيار الصحيح أعلاه وقارنه بما اخترت.'}
          </p>
          <button type="button" onClick={next} className="iel-metachip"
            style={{ marginTop: 13, cursor: 'pointer', padding: '9px 16px', fontSize: 13, background: 'var(--iel-accent-soft)', borderColor: 'rgba(16,185,129,.3)', color: 'var(--iel-accent-ink)' }}>
            التالي ←
          </button>
        </div>
      )}
      {revealed && wasRight && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--iel-accent-ink)', fontSize: 13.5, fontWeight: 700 }}>
          <Check size={16} /> صحيح
        </div>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ReadingMicro() {
  const navigate = useNavigate()
  const g = useG()
  const [params, setParams] = useSearchParams()
  const studentId = useStudentId()
  const active = params.get('kind')
  const kind = byKey[active] || null

  const { data: counts = {} } = useMicroDrillCounts()
  const { data: stats = {} } = useMicroDrillStats(studentId)
  const { data: pool = [], isLoading } = useMicroDrills(kind?.key)
  const [round, setRound] = useState(0)   // bumping this reshuffles

  const items = useMemo(() => {
    if (!kind || !pool.length) return []
    return shuffle(pool).slice(0, Math.min(kind.reps, pool.length))
  }, [pool, kind, round]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = (k) => setParams({ kind: k })
  const exit = (again) => {
    if (again) { setRound((r) => r + 1); return }
    setParams({})
  }

  if (kind) {
    if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--iel-ink-3)' }}>…</div>
    if (!items.length) {
      return (
        <div style={{ maxWidth: 620, margin: '0 auto', paddingTop: 8 }}>
          <div className="iel-gcard" style={{ padding: '22px 24px' }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 8 }}>لا توجد تمارين في هذا التدريب بعد</div>
            <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.85, margin: '0 0 14px' }}>سنضيفها قريباً. جرّب تدريباً آخر في الأثناء.</p>
            <button type="button" onClick={() => exit(false)} className="iel-metachip" style={{ cursor: 'pointer', padding: '9px 16px' }}>رجوع ←</button>
          </div>
        </div>
      )
    }
    return <Runner key={`${kind.key}-${round}`} kind={kind} items={items} onExit={exit} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow="الدرجة الثالثة · التكرار السريع" title="المهارات المصغّرة">
        ليست قطعاً ولا امتحانات — تكرارات قصيرة على المهارة الخام وحدها، بساعة تعمل في كل تمرين. هنا يحدث فعلياً الانتقال من ٦٫٥ إلى ٧٫٥، وهنا يمكنك التدرّب من جوّالك في ثلاث دقائق.
      </LabHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(390px, 1fr))', gap: 12 }}>
        {KINDS.map((k) => (
          <DrillCard key={k.key} kind={k} count={counts[k.key] || 0} stat={stats[k.key]} onStart={start} />
        ))}
      </div>

      <div style={{ padding: '15px 17px', borderRadius: 13, background: 'var(--iel-gold-soft)', border: '1px solid rgba(234,179,8,.24)', fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.85 }}>
        <b style={{ color: 'var(--iel-gold-ink)', fontWeight: 800 }}>لماذا هذا القسم موجود:</b>{' '}
        بين «تعلّمتُ نوع السؤال» و«حللتُ امتحاناً كاملاً» هوّة كبيرة. هذه التمارين ليست قطعاً، ولهذا لا يبنيها أحد — لكنها بالضبط ما تحتاجه العضلة كي تُسرع.
      </div>

      <button type="button" onClick={() => navigate(`${BASE}/reading/errors`)} className="iel-metachip"
        style={{ alignSelf: 'flex-start', cursor: 'pointer', padding: '10px 18px', fontSize: 13 }}>
        {g('لا تعرف أيّها تحتاج؟ افتح', 'لا تعرفين أيّها تحتاجين؟ افتحي')} «أخطائي في القراءة» ←
      </button>
    </div>
  )
}
