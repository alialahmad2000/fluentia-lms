import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ChevronLeft, ChevronRight, Headphones, Loader2,
  Pause, Play, RotateCcw, BookOpen, PenLine, LayoutGrid,
} from 'lucide-react'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { ScoreRing, SECTION_LABEL, questionsAr, timesAr } from './_ui/primitives'
import './_ui/hall.css'

const SECTION_ICON = { listening: Headphones, reading: BookOpen, structure: PenLine }
const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']

/**
 * Listening player.
 *
 * The <audio> element is rendered in JSX and therefore ATTACHED to the DOM. A
 * detached `new Audio()` is garbage-collected mid-playback on iPad and the clip
 * dies silently — that cost this platform a long debugging session before.
 * Single-flight: changing question stops whatever was playing.
 */
function ClipPlayer({ recording }) {
  const g = useG()
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [plays, setPlays] = useState(0)

  useEffect(() => {
    setPlaying(false); setFailed(false); setPlays(0)
    const el = ref.current
    return () => { if (el) { el.pause(); el.currentTime = 0 } }
  }, [recording?.id])

  if (!recording?.audio_url || recording.audio_status !== 'voiced') return null

  const toggle = async () => {
    const el = ref.current
    if (!el) return
    if (playing) { el.pause(); return }
    try {
      // play() must be awaited inside the gesture; a rejection here is exactly
      // what "I pressed play and nothing happened" looks like.
      await el.play()
      setPlays((n) => n + 1)
    } catch { setFailed(true) }
  }

  return (
    <div className="hall-panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <button
          onClick={toggle}
          aria-label={playing ? 'إيقاف التسجيل' : 'تشغيل التسجيل'}
          className="hall-tap"
          style={{
            flex: 'none', width: 46, height: 46, borderRadius: 999, display: 'grid', placeItems: 'center',
            border: 'none', cursor: 'pointer', color: '#2A1E06',
            background: 'linear-gradient(180deg,var(--hall-gold-hi),var(--hall-gold))',
            boxShadow: '0 12px 26px -14px rgba(227,185,92,.9)',
          }}
        >
          {playing ? <Pause size={19} /> : <Play size={19} />}
        </button>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
            {playing ? 'التسجيل شغّال' : g('استمع للتسجيل', 'استمعي للتسجيل')}
          </p>
          <p style={{ margin: 0, marginBlockStart: 3, fontSize: 12, color: 'var(--hall-ink-3)' }}>
            {failed
              ? `تعذّر تشغيل التسجيل — ${g('جرّب', 'جرّبي')} مرة أخرى`
              : plays > 0
                ? `${g('استمعت', 'استمعتِ')} ${timesAr(plays)} — بإمكانك إعادته`
                : 'بإمكانك إعادة التسجيل أكثر من مرة'}
          </p>
        </div>
      </div>
      <audio
        ref={ref} src={recording.audio_url} preload="none" playsInline
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false) }}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default function STEPExam() {
  const g = useG()
  // Admin "view-as" is a CLIENT-side profile swap: auth.uid() stays the ADMIN
  // while `profile` becomes the student. Without sending this, every attempt,
  // result, error-bank row and progress row an admin generates while
  // impersonating is written against the ADMIN's id, while the screens read the
  // student's — the two halves point at different people.
  const asStudentId = useAuthStore((s) => s.profile?.id)
  const [params] = useSearchParams()
  const drillPoint = params.get('point')
  const wantReview = params.get('mode') === 'review'

  const [phase, setPhase] = useState('intro')
  const [paper, setPaper] = useState(null)
  const [answers, setAnswers] = useState({})
  const [idx, setIdx] = useState(0)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)

  const passages = useMemo(
    () => Object.fromEntries((paper?.passages ?? []).map((p) => [p.id, p])), [paper])
  const recordings = useMemo(
    () => Object.fromEntries((paper?.recordings ?? []).map((r) => [r.id, r])), [paper])

  // Hide the global FABs during the exam — they land exactly on the nav bar.
  useEffect(() => {
    if (phase !== 'running') return undefined
    document.body.classList.add('step-exam')
    return () => document.body.classList.remove('step-exam')
  }, [phase])

  const launch = useCallback(async (body, failMsg) => {
    setBusy(true); setError(null)
    const { data, error: e } = await invokeWithRetry('step-attempt', {
      body: { ...body, as_student_id: asStudentId },
    })
    setBusy(false)
    if (e || data?.error) {
      if (data?.error === 'insufficient_items') {
        // Raw counts belong in the console, not in a student's face.
        console.warn('[step] insufficient items', data.section, data.available, '/', data.required)
        setError(`ما زلنا نجهّز أسئلة قسم ${SECTION_LABEL[data.section] ?? data.section}. ${g('جرّب', 'جرّبي')} مرة أخرى بعد قليل.`)
      } else if (data?.error === 'no_items_for_point') {
        setError('ما جهّزنا أسئلة على هذه القاعدة بعد.')
      } else if (data?.error === 'bank_empty') {
        setError('ما عندك أخطاء مفتوحة للمراجعة الآن.')
      } else {
        setError(`${failMsg} ${g('حاول', 'حاولي')} مرة أخرى.`)
      }
      return
    }
    setPaper(data); setAnswers({}); setIdx(0); setPhase('running')
  }, [g, asStudentId])

  const start = useCallback(() => launch({ action: 'start' }, 'تعذّر بدء الاختبار.'), [launch])

  // ?point= and ?mode=review arrive from the Hall. Fire ONCE — re-running on
  // every render would spawn an attempt row per paint.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current) return
    if (drillPoint) {
      autoStarted.current = true
      launch({ action: 'drill', point: drillPoint, count: 10 }, 'تعذّر بدء التدريب.')
    } else if (wantReview) {
      autoStarted.current = true
      launch({ action: 'review', count: 10 }, 'تعذّر بدء المراجعة.')
    }
  }, [drillPoint, wantReview, launch])

  const submit = useCallback(async () => {
    if (!paper) return
    setConfirming(false); setBusy(true); setError(null)
    const { data, error: e } = await invokeWithRetry('step-attempt', {
      body: { action: 'submit', attempt_id: paper.attempt_id, answers, as_student_id: asStudentId },
    })
    setBusy(false)
    if (e || data?.error) {
      setError(`تعذّر تسليم الاختبار. إجاباتك محفوظة، ${g('حاول', 'حاولي')} مرة أخرى.`)
      return
    }
    setResult(data); setPhase('done')
  }, [paper, answers, g, asStudentId])

  const err = error && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--hall-rose)' }}>{error}</p>

  // ── intro ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    if ((drillPoint || wantReview) && !error) {
      return (
        <div className="hall-panel" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Loader2 size={18} className="hall-spin" style={{ color: 'var(--hall-gold)' }} />
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>
            {drillPoint ? 'نجهّز لك تدريباً على هذه القاعدة…' : 'نجمع أخطاءك للمراجعة…'}
          </p>
        </div>
      )
    }
    const breakdown = [
      { key: 'listening', n: 20 }, { key: 'reading', n: 40 }, { key: 'structure', n: 40 },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900 }}>
        <div>
          <Link to="/student/step" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
            fontSize: 13, fontWeight: 700, color: 'var(--hall-ink-2)',
          }}><ChevronRight size={15} /> القاعة</Link>
        </div>

        <header>
          <span className="hall-kick">نموذج كامل</span>
          <h1 className="hall-h1" style={{ marginBlock: '18px 14px' }}>
            مئة سؤال، <em>بترتيب الاختبار</em>.
          </h1>
          <p className="hall-lede">
            التنقّل بين الأسئلة وتغيير الإجابات متاحان قبل التسليم. كل خطأ ينحفظ في «أخطائي»
            تلقائياً، ودرجتك تدخل خط تقدّمك.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
          {breakdown.map(({ key, n }) => {
            const Icon = SECTION_ICON[key]
            return (
              <div key={key} className="hall-panel" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBlockEnd: 10 }}>
                  <Icon size={15} style={{ color: 'var(--hall-gold)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 800 }}>{SECTION_LABEL[key]}</span>
                </div>
                <p style={{ margin: 0, fontFamily: 'var(--hall-display)', fontSize: 34, fontWeight: 700, lineHeight: 1 }}>
                  {n}
                  <span style={{ fontSize: 13, fontFamily: 'var(--hall-sans)', color: 'var(--hall-ink-3)' }}> سؤالًا</span>
                </p>
              </div>
            )
          })}
        </div>

        {err}
        <div>
          <button onClick={start} disabled={busy} className="hall-btn hall-tap">
            {busy ? <Loader2 size={17} className="hall-spin" /> : <Play size={17} />}
            {busy ? 'نجهّز الاختبار…' : g('ابدأ الاختبار', 'ابدئي الاختبار')}
          </button>
        </div>
      </div>
    )
  }

  // ── result ─────────────────────────────────────────────────────────
  if (phase === 'done' && result) {
    const isPractice = paper?.is_drill || paper?.is_review
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, maxWidth: 900 }}>
        <section className="hall-core"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0,300px) 1fr', gap: 40, alignItems: 'center' }}>
          <ScoreRing score={result.score_total} target={null} label={isPractice ? 'من ١٠٠ — تدريب' : 'من ١٠٠'} />
          <div>
            <span className="hall-kick">{isPractice ? 'تدريب — لا يدخل خط التقدّم' : 'نموذج كامل'}</span>
            <h1 className="hall-h1" style={{ marginBlock: '18px 12px' }}>
              {result.correct_total} من {result.total_questions} صحيحة.
            </h1>
            <p className="hall-lede">
              {isPractice
                ? 'هذا تدريب قصير، فما يدخل في خط تقدّمك — النماذج الكاملة وحدها هي المقياس.'
                : g(
                  'أخطاؤك انحفظت في «أخطائي»، وتقدر تعيدها لين تتقنها.',
                  'أخطاؤك انحفظت في «أخطائي»، وتقدرين تعيدينها لين تتقنينها.',
                )}
            </p>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
          {Object.entries(result.sections ?? {}).map(([k, v]) => (
            <div key={k} className="hall-panel" style={{ padding: 20 }}>
              <p style={{ margin: 0, marginBlockEnd: 8, fontSize: 13, color: 'var(--hall-ink-2)' }}>
                {SECTION_LABEL[k] ?? k}
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--hall-display)', fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
                {v.correct}<span style={{ fontSize: 15, color: 'var(--hall-ink-3)' }}> / {v.total}</span>
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/student/step/errors" className="hall-btn hall-tap" style={{ textDecoration: 'none' }}>
            <AlertTriangle size={16} /> {g('راجع أخطاءك', 'راجعي أخطاءك')}
          </Link>
          <button className="hall-btn2 hall-tap"
            onClick={() => { setPhase('intro'); setPaper(null); setResult(null); autoStarted.current = true }}>
            <RotateCcw size={15} /> نموذج جديد
          </button>
          <Link to="/student/step" className="hall-btn2 hall-tap" style={{ textDecoration: 'none' }}>القاعة</Link>
        </div>
        <style>{`@media (max-width:900px){.hall-core{grid-template-columns:1fr !important;gap:28px !important}}`}</style>
      </div>
    )
  }

  // ── running ────────────────────────────────────────────────────────
  const qs = paper?.questions ?? []
  const q = qs[idx]

  if (!q) {
    // A blank page on a data mismatch is indistinguishable from a crash.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 620 }}>
        <div className="hall-panel" style={{ padding: 24 }}>
          <p style={{ margin: 0, marginBlockEnd: 10, fontSize: 15, fontWeight: 800 }}>تعذّر عرض هذا السؤال</p>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.9, color: 'var(--hall-ink-2)' }}>
            صار خلل في بيانات هذا النموذج، وما له علاقة بأدائك.
            {' '}{g('ابدأ', 'ابدئي')} نموذجاً جديداً، وإجاباتك السابقة لن تُحتسب.
          </p>
        </div>
        <div>
          <button className="hall-btn hall-tap"
            onClick={() => { setPhase('intro'); setPaper(null); autoStarted.current = true }}>
            <RotateCcw size={15} /> نموذج جديد
          </button>
        </div>
      </div>
    )
  }

  const passage = q.passage_id ? passages[q.passage_id] : null
  const clip = q.recording_id ? recordings[q.recording_id] : null
  const answered = Object.keys(answers).length
  const unanswered = qs.length - answered

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: 'var(--hall-gold-hi)' }}>
            {SECTION_LABEL[q.section] ?? q.section}
            {q.times_missed ? ` · ${g('أخطأت', 'أخطأتِ')} فيه ${timesAr(q.times_missed)}` : ''}
          </p>
          <p style={{ margin: 0, marginBlockStart: 3, fontSize: 13, color: 'var(--hall-ink-3)' }}>
            سؤال {idx + 1} من {qs.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="hall-tap"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--hall-line-2)',
            borderRadius: 11, padding: '8px 14px', font: 'inherit', fontSize: 13,
            color: 'var(--hall-ink-2)', fontVariantNumeric: 'tabular-nums',
          }}
        >
          <LayoutGrid size={14} />
          أجبت عن {answered} من {qs.length}
        </button>
      </div>

      {/* Tracks ANSWERS, not position: at Q100 with nothing answered a position
          bar reads 100% full, which is exactly backwards. */}
      <div style={{ position: 'relative', height: 5, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${(answered / qs.length) * 100}%`, borderRadius: 99,
          background: 'linear-gradient(90deg,var(--hall-gold-deep),var(--hall-gold-hi))',
          transition: 'width .25s ease-out',
        }} />
        <span style={{
          position: 'absolute', insetBlock: -2, width: 2, borderRadius: 2,
          insetInlineStart: `calc(${(idx / Math.max(1, qs.length - 1)) * 100}% - 1px)`,
          background: 'var(--hall-ink)', opacity: 0.5,
        }} />
      </div>

      {q.section === 'listening' && (
        clip?.audio_status === 'voiced' && clip?.audio_url
          ? <ClipPlayer recording={clip} />
          : (
            <p style={{ margin: 0, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--hall-rose)' }}>
              <AlertTriangle size={13} /> هذا السؤال بدون تسجيل صوتي
            </p>
          )
      )}

      {passage?.body && (
        <div className="hall-panel hall-passage" style={{ padding: 22 }}>
          {passage.title && (
            <h2 style={{ margin: 0, marginBlockEnd: 10, fontFamily: 'var(--hall-display)', fontSize: 18 }}>
              {passage.title}
            </h2>
          )}
          <p dir="ltr" style={{
            margin: 0, fontSize: 14, lineHeight: 1.95, textAlign: 'left',
            whiteSpace: 'pre-wrap', color: 'var(--hall-ink-2)',
          }}>{passage.body}</p>
        </div>
      )}

      <div className="hall-panel" style={{ padding: 22 }}>
        <p dir="ltr" style={{ margin: 0, marginBlockEnd: 18, fontSize: 15.5, lineHeight: 1.75, textAlign: 'left' }}>
          {q.stem}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {(q.choices ?? []).map((c, i) => {
            const on = answers[q.id] === i
            return (
              <button
                key={i}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                className="hall-tap"
                dir="ltr"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 13, width: '100%',
                  textAlign: 'left', borderRadius: 13, padding: '13px 16px', cursor: 'pointer',
                  border: `1px solid ${on ? 'rgba(227,185,92,.5)' : 'var(--hall-line-2)'}`,
                  background: on ? 'rgba(227,185,92,.12)' : 'rgba(255,255,255,.03)',
                  transition: 'background .16s, border-color .16s',
                }}
              >
                <span style={{
                  flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 900,
                  background: on ? 'linear-gradient(180deg,var(--hall-gold-hi),var(--hall-gold))' : 'rgba(255,255,255,.05)',
                  color: on ? '#2A1E06' : 'var(--hall-ink-3)',
                  border: on ? 'none' : '1px solid var(--hall-line-2)',
                }}>{LETTERS[i] ?? i + 1}</span>
                <span dir="ltr" style={{
                  flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.75, textAlign: 'left', color: 'var(--hall-ink)',
                }}>{c}</span>
              </button>
            )
          })}
        </div>
      </div>

      {err}

      <div className="hall-navbar">
        <button className="hall-btn2 hall-tap" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
          <ChevronRight size={15} /> السابق
        </button>
        {idx < qs.length - 1 ? (
          <button className="hall-btn2 hall-tap" onClick={() => setIdx((i) => i + 1)}>
            التالي <ChevronLeft size={15} />
          </button>
        ) : (
          <button className="hall-btn hall-tap" disabled={busy}
            onClick={() => (unanswered > 0 ? setConfirming(true) : submit())}>
            {busy && <Loader2 size={15} className="hall-spin" />}
            {busy ? 'نستلم إجاباتك…' : g('سلّم الاختبار', 'سلّمي الاختبار')}
          </button>
        )}
      </div>

      {/* Question map — the only practical way to move around a 100-question
          paper, and the way back to a specific blank one. */}
      {mapOpen && (
        <div role="dialog" aria-modal="true" onClick={() => setMapOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'end center',
            background: 'rgba(6,7,12,.72)', backdropFilter: 'blur(4px)',
          }}>
          <div className="hall-panel" onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 620, maxHeight: '72dvh', overflowY: 'auto',
              padding: 22, borderEndStartRadius: 0, borderEndEndRadius: 0,
              paddingBottom: 'calc(22px + env(safe-area-inset-bottom, 0px))',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBlockEnd: 16 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>خريطة الأسئلة</p>
              <button className="hall-btn2 hall-tap" style={{ padding: '9px 16px', minHeight: 40 }}
                onClick={() => setMapOpen(false)}>إغلاق</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(44px,1fr))', gap: 8 }}>
              {qs.map((qq, i) => {
                const done = answers[qq.id] !== undefined
                const here = i === idx
                return (
                  <button
                    key={qq.id}
                    onClick={() => { setIdx(i); setMapOpen(false) }}
                    className="hall-tap"
                    aria-current={here ? 'true' : undefined}
                    style={{
                      minWidth: 44, borderRadius: 10, cursor: 'pointer', font: 'inherit',
                      fontSize: 13.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      background: done ? 'linear-gradient(180deg,var(--hall-gold-hi),var(--hall-gold))' : 'rgba(255,255,255,.04)',
                      color: done ? '#2A1E06' : 'var(--hall-ink-2)',
                      border: here ? '2px solid var(--hall-gold-hi)' : '1px solid var(--hall-line-2)',
                    }}
                  >{i + 1}</button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div role="dialog" aria-modal="true" onClick={() => setConfirming(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 20,
            background: 'rgba(6,7,12,.72)', backdropFilter: 'blur(4px)',
          }}>
          <div className="hall-panel" onClick={(e) => e.stopPropagation()}
            style={{ padding: 26, maxWidth: 420, width: '100%' }}>
            <p style={{ margin: 0, marginBlockEnd: 10, fontSize: 16, fontWeight: 900 }}>
              عندك {questionsAr(unanswered)} بدون إجابة
            </p>
            <p style={{ margin: 0, marginBlockEnd: 20, fontSize: 13.5, lineHeight: 1.9, color: 'var(--hall-ink-2)' }}>
              الأسئلة غير المُجابة تُحتسب خطأ، وبإمكانك الرجوع لها وإكمالها قبل التسليم.
            </p>
            {/* The RECOVERABLE action is the primary one. Submitting a paper
                with blanks is irreversible, so it must not be the gold button. */}
            <div className="hall-modal-acts">
              <button className="hall-btn hall-tap" onClick={() => {
                const first = qs.findIndex((x) => answers[x.id] === undefined)
                if (first >= 0) setIdx(first)
                setConfirming(false)
              }}>{g('أكمل الأسئلة الناقصة', 'أكملي الأسئلة الناقصة')}</button>
              <button className="hall-btn2 hall-tap" onClick={submit}>
                {g('سلّم على أي حال', 'سلّمي على أي حال')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hall-navbar{position:sticky;bottom:0;z-index:5;display:flex;align-items:center;
          justify-content:space-between;gap:12px;margin-top:8px;margin-inline:-26px;
          padding:14px 26px calc(14px + env(safe-area-inset-bottom,0px));
          /* Must be FULLY OPAQUE: the bar sits over scrolling content, and a
             translucent one let the question's own choices show through it. */
          background:var(--hall-void);border-top:1px solid var(--hall-line-2)}
        /* A 290px letterbox on a 390px phone is unreadable, and the inner scroll
           steals the page gesture in iOS Safari. Cap only where it can sit beside. */
        .hall-passage{max-height:none;overflow:visible}
        @media (min-width:900px){.hall-passage{max-height:320px;overflow-y:auto}}
        @media (max-width:980px){.hall-navbar{margin-inline:-18px;padding-inline:18px}}
        .hall-modal-acts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media (max-width:440px){.hall-modal-acts{grid-template-columns:1fr}}
      `}</style>
    </div>
  )
}
