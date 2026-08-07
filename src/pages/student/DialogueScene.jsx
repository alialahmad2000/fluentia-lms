import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Play, Pause, Volume2, Ear, BookOpen, Brain, Mic, Check, X, RotateCcw,
  Eye, Lightbulb, MapPin, Target, Undo2, ArrowLeft, ArrowRight, Trophy, Gauge,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { Stage } from './Dialogues'
import './dialogues.css'

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

const STEPS = [
  { key: 'listen',  label: 'استمع',  icon: Ear,      hint: 'اسمع المشهد كاملًا بصوتين، وتابع السطور وهي تُقال.' },
  { key: 'study',   label: 'افهم',   icon: BookOpen, hint: 'كل سطر بمعناه، ولماذا قيل هكذا تحديدًا.' },
  { key: 'recall',  label: 'احفظ',   icon: Brain,    hint: 'أعد بناء سطورك من الذاكرة، كلمةً كلمة.' },
  { key: 'perform', label: 'دورك',   icon: Mic,      hint: 'الطرف الآخر يتكلم، وأنت من يردّ. هذا هو الاختبار الحقيقي.' },
]

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[’]/g, "'")
/** Latin digits on purpose: a timecode with Arabic-Indic digits around a ':' is a
 *  bidi reorder waiting to happen (UBA N1 — see the ٥ ٧٠٧ incident). */
const clock = (ms) => {
  const t = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
/* 1 / 2 / 3-10 / 11+ — «٦ سطور» not «٦ سطرًا», «٦ أدوار» not «٦ دورًا». */
const linesAr = (n) => (n === 1 ? 'سطرًا واحدًا' : n === 2 ? 'سطرين'
  : n <= 10 ? `${toAr(n)} أسطر` : `${toAr(n)} سطرًا`)
const turnsAr = (n) => (n === 1 ? 'دور واحد' : n === 2 ? 'دوران'
  : n <= 10 ? `${toAr(n)} أدوار` : `${toAr(n)} دورًا`)
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function DialogueScene() {
  const { scenarioKey } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore(useShallow((s) => ({ profile: s.profile })))
  const qc = useQueryClient()
  const [step, setStep] = useState('listen')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dialogue-scene', profile?.id, scenarioKey],
    enabled: !!profile?.id && !!scenarioKey,
    queryFn: async () => {
      const { data: scenario, error } = await supabase
        .from('dialogue_scenarios').select('*')
        .eq('student_id', profile.id).eq('scenario_key', scenarioKey).single()
      if (error) throw error
      const [{ data: lines }, { data: expressions }, { data: progress }] = await Promise.all([
        supabase.from('dialogue_lines').select('*').eq('scenario_id', scenario.id).order('idx'),
        supabase.from('dialogue_expressions').select('*').eq('scenario_id', scenario.id).order('sort_order'),
        supabase.from('dialogue_progress').select('*').eq('student_id', profile.id).eq('scenario_id', scenario.id).maybeSingle(),
      ])
      return { scenario, lines: lines || [], expressions: expressions || [], progress: progress || null }
    },
  })

  const record = useMutation({
    mutationFn: async ({ stage, score }) => {
      const { error } = await supabase.rpc('dialogue_record_progress', {
        p_scenario_id: data.scenario.id, p_stage: stage, p_score: score ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dialogue-scene', profile?.id, scenarioKey] })
      qc.invalidateQueries({ queryKey: ['dialogues', profile?.id] })
    },
  })

  // ── one audio pair for the whole page (attached to the DOM: a detached
  //    `new Audio()` silently dies on iPad — see the audio_event_log incident) ──
  const sceneRef = useRef(null)
  const lineRef = useRef(null)
  const [rate, setRate] = useState(1)
  const [scenePlaying, setScenePlaying] = useState(false)
  const [sceneMs, setSceneMs] = useState(0)
  const [playingLine, setPlayingLine] = useState(null)

  const stopAll = useCallback(() => {
    try { sceneRef.current?.pause() } catch { /* element already gone */ }
    try { lineRef.current?.pause() } catch { /* element already gone */ }
    setScenePlaying(false)
    setPlayingLine(null)
  }, [])

  useEffect(() => stopAll, [stopAll])
  useEffect(() => { stopAll() }, [step, stopAll])
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.playbackRate = rate
    if (lineRef.current) lineRef.current.playbackRate = rate
  }, [rate])

  const toggleScene = useCallback(() => {
    const el = sceneRef.current
    if (!el) return
    if (scenePlaying) { el.pause(); setScenePlaying(false); return }
    try { lineRef.current?.pause() } catch { /* nothing playing */ }
    setPlayingLine(null)
    el.playbackRate = rate
    el.play().then(() => setScenePlaying(true)).catch(() => setScenePlaying(false))
  }, [scenePlaying, rate])

  const seekScene = useCallback((ratio) => {
    const el = sceneRef.current
    if (!el || !el.duration || Number.isNaN(el.duration)) return
    el.currentTime = ratio * el.duration
    setSceneMs(el.currentTime * 1000)
  }, [])

  // iOS refuses playback that isn't inside a user gesture. Step 4 auto-plays the
  // other speaker from an effect, which is outside one — so when it is refused we
  // say so instead of leaving a silent screen the student can't diagnose.
  const [audioBlocked, setAudioBlocked] = useState(false)
  const playLine = useCallback((line, fromGesture = true) => {
    const el = lineRef.current
    if (!el || !line?.audio_url) return
    try { sceneRef.current?.pause() } catch { /* nothing playing */ }
    setScenePlaying(false)
    el.pause()
    el.src = line.audio_url
    el.playbackRate = rate
    setPlayingLine(line.idx)
    el.play().then(() => setAudioBlocked(false)).catch(() => {
      setPlayingLine(null)
      if (!fromGesture) setAudioBlocked(true)
    })
  }, [rate])

  const scenario = data?.scenario
  const lines = data?.lines || []
  const myLines = useMemo(() => lines.filter((l) => l.speaker === 'A'), [lines])
  const activeIdx = useMemo(() => {
    if (!scenePlaying) return null
    const hit = lines.find((l) => l.start_ms != null && sceneMs >= l.start_ms && sceneMs < l.end_ms)
    return hit ? hit.idx : null
  }, [scenePlaying, sceneMs, lines])

  if (isLoading) {
    return (
      <div className="dlg-root" dir="rtl"><Stage />
        <div className="dlg-wrap"><div className="dlg-skel" /><div className="dlg-skel sm" /><div className="dlg-skel sm" /></div>
      </div>
    )
  }
  if (isError || !scenario) {
    return (
      <div className="dlg-root" dir="rtl"><Stage />
        <div className="dlg-wrap">
          <div className="dlg-empty">
            <X size={28} />
            <h2>لم نجد هذه المحادثة</h2>
            <button className="dlg-btn" onClick={() => navigate('/student/dialogues')}>العودة إلى المحادثات</button>
          </div>
        </div>
      </div>
    )
  }

  const p = data.progress || {}
  const stepDone = {
    listen: !!p.listened, study: !!p.studied,
    recall: (p.recall_best || 0) >= 80, perform: (p.roleplay_best || 0) >= 80,
  }

  return (
    <div className="dlg-root" dir="rtl">
      <Stage />
      {/* both elements stay mounted so iOS keeps their audio session alive */}
      <audio ref={sceneRef} src={scenario.full_audio_url || undefined} preload="metadata"
        onTimeUpdate={(e) => setSceneMs(e.currentTarget.currentTime * 1000)}
        onEnded={() => { setScenePlaying(false); if (!p.listened) record.mutate({ stage: 'listened' }) }}
        className="dlg-audio" />
      <audio ref={lineRef} preload="none" onEnded={() => setPlayingLine(null)} className="dlg-audio" />

      <div className="dlg-wrap">
        <Link to="/student/dialogues" className="dlg-back"><ArrowRight size={15} /> كل المحادثات</Link>

        <header className="dlg-mast">
          <div className="dlg-mast__main">
            <span className="dlg-chip"><MapPin size={11} /> {scenario.place_ar}</span>
            <h1>{scenario.title_ar}</h1>
            <div className="dlg-mast__en" dir="ltr">{scenario.title_en}</div>
          </div>
          <div className="dlg-mast__cast">
            <span className="dlg-face me">أنت</span>
            <span className="dlg-face them">{scenario.b_name.slice(0, 1)}</span>
            <em>{scenario.b_role_ar}</em>
          </div>
        </header>

        <div className="dlg-brief">
          <div><span className="dlg-brief__k"><MapPin size={12} /> الموقف</span><p>{scenario.situation_ar}</p></div>
          <div><span className="dlg-brief__k"><Target size={12} /> هدفك</span><p>{scenario.goal_ar}</p></div>
        </div>

        <nav className="dlg-steps-nav" aria-label="مراحل المحادثة">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <button key={s.key} onClick={() => setStep(s.key)}
                className={`dlg-stepbtn${step === s.key ? ' active' : ''}${stepDone[s.key] ? ' done' : ''}`}>
                <span className="dlg-stepbtn__n">{stepDone[s.key] ? <Check size={13} /> : toAr(i + 1)}</span>
                <Icon size={15} />
                <b>{s.label}</b>
              </button>
            )
          })}
        </nav>
        <p className="dlg-stephint">{STEPS.find((s) => s.key === step).hint}</p>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {step === 'listen' && (
              <ListenStep
                scenario={scenario} lines={lines} activeIdx={activeIdx}
                scenePlaying={scenePlaying} toggleScene={toggleScene} seekScene={seekScene}
                playLine={playLine} playingLine={playingLine}
                rate={rate} setRate={setRate} sceneMs={sceneMs}
                listened={!!p.listened}
                onDone={() => { record.mutate({ stage: 'listened' }); setStep('study') }}
              />
            )}
            {step === 'study' && (
              <StudyStep
                scenario={scenario} lines={lines} expressions={data.expressions}
                playLine={playLine} playingLine={playingLine}
                onDone={() => { record.mutate({ stage: 'studied' }); setStep('recall') }}
              />
            )}
            {step === 'recall' && (
              // NO key tied to progress: recording the score invalidates the query,
              // and a changing key would remount the drill and wipe the result screen
              // the student just earned. Switching steps already resets it.
              <RecallStep
                lines={lines} myLines={myLines} playLine={playLine}
                best={p.recall_best || 0}
                onFinish={(score) => record.mutate({ stage: 'recall', score })}
                onNext={() => setStep('perform')}
              />
            )}
            {step === 'perform' && (
              <PerformStep
                scenario={scenario} lines={lines} playLine={playLine} playingLine={playingLine}
                audioBlocked={audioBlocked} best={p.roleplay_best || 0}
                onFinish={(score) => record.mutate({ stage: 'roleplay', score })}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {p.status === 'mastered' && (
          <div className="dlg-master"><Trophy size={16} /> أتقنتَ هذه المحادثة — تستطيع خوضها في الواقع.</div>
        )}
      </div>
    </div>
  )
}

/* ── 1 · استمع ─────────────────────────────────────────────────────────────── */
function ListenStep({ scenario, lines, activeIdx, scenePlaying, toggleScene, seekScene, playLine, playingLine, rate, setRate, sceneMs, listened, onDone }) {
  const [showAr, setShowAr] = useState(false)
  const reduce = useReducedMotion()
  const total = lines.length ? lines[lines.length - 1].end_ms : 0
  const pct = total ? Math.min(100, (sceneMs / total) * 100) : 0
  const turnRefs = useRef({})

  // follow the scene: past line 4 of 12 on a phone the student would otherwise be
  // staring at a frozen page while the audio runs on below the fold
  useEffect(() => {
    if (activeIdx == null) return
    turnRefs.current[activeIdx]?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [activeIdx, reduce])

  const onSeek = (e) => {
    if (e.detail === 0) return   // keyboard "click": clientX is 0 and would seek to 0:00
    const r = e.currentTarget.getBoundingClientRect()
    seekScene(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
  }
  const onSeekKey = (e) => {
    if (!total) return
    const step = 5000 / total
    if (e.key === 'ArrowRight') { e.preventDefault(); seekScene(Math.min(1, sceneMs / total + step)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); seekScene(Math.max(0, sceneMs / total - step)) }
  }

  return (
    <>
      <div className="dlg-player">
        <button className="dlg-play" onClick={toggleScene} aria-label={scenePlaying ? 'إيقاف المشهد' : 'تشغيل المشهد'}>
          {scenePlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="dlg-player__mid">
          <b>
            <span>{scenePlaying ? 'المشهد يعمل الآن' : 'شغّل المشهد كاملًا'}</span>
            <em dir="ltr">{clock(sceneMs)} / {clock(total)}</em>
          </b>
          {/* one tick per turn, coloured by who is speaking — the scrubber SHOWS the
              two-voice shape of the scene instead of just claiming it */}
          <button className="dlg-seek" onClick={onSeek} onKeyDown={onSeekKey}
            role="slider" aria-label="الانتقال داخل المشهد" aria-valuemin={0}
            aria-valuemax={Math.round(total / 1000)} aria-valuenow={Math.round(sceneMs / 1000)}
            aria-valuetext={clock(sceneMs)}>
            <span className="dlg-seek__track" />
            {total > 0 && lines.map((l) => (
              <span key={l.id}
                className={`dlg-seek__tick ${l.speaker === 'A' ? 'me' : 'them'}${activeIdx === l.idx ? ' on' : ''}`}
                style={{
                  left: `${(l.start_ms / total) * 100}%`,
                  width: `${Math.max(1.2, ((l.end_ms - l.start_ms) / total) * 100)}%`,
                }} />
            ))}
            <span className="dlg-seek__fill" style={{ width: `${pct}%` }} />
          </button>
        </div>
        <button className={`dlg-rate${rate !== 1 ? ' on' : ''}`} onClick={() => setRate(rate === 1 ? 0.75 : 1)}>
          <Gauge size={14} /> {rate === 1 ? 'سرعة عادية' : 'أبطأ'}
        </button>
      </div>

      <div className="dlg-toolbar">
        <button className={`dlg-toggle${showAr ? ' on' : ''}`} onClick={() => setShowAr((v) => !v)}>
          <Eye size={14} /> {showAr ? 'إخفاء المعنى' : 'إظهار المعنى'}
        </button>
        <span className="dlg-toolbar__hint">جرّب أولًا بلا ترجمة — أذنك تتعلّم أسرع هكذا.</span>
      </div>

      <div className="dlg-script">
        {lines.map((l) => (
          <Turn key={l.id} line={l} scenario={scenario} showAr={showAr}
            innerRef={(el) => { turnRefs.current[l.idx] = el }}
            active={activeIdx === l.idx} playing={playingLine === l.idx} onPlay={() => playLine(l)} />
        ))}
      </div>

      <button className="dlg-btn primary wide" onClick={onDone}>
        {listened ? 'انتقل إلى «افهم»' : 'سمعتُ المشهد — انتقل إلى «افهم»'}
      </button>
    </>
  )
}

/* ── 2 · افهم ──────────────────────────────────────────────────────────────── */
function StudyStep({ scenario, lines, expressions, playLine, playingLine, onDone }) {
  return (
    <>
      <div className="dlg-script">
        {lines.map((l) => (
          <Turn key={l.id} line={l} scenario={scenario} showAr playing={playingLine === l.idx} onPlay={() => playLine(l)}
            note={l.speaker === 'A' ? l.note_ar : null} />
        ))}
      </div>

      {expressions.length > 0 && (
        <>
          <div className="dlg-shead"><Lightbulb size={16} /><h2>عبارات تستحق الحفظ</h2><span className="rule" /></div>
          <p className="dlg-shint">من هذا المشهد وحده. كل عبارة تصلح لمواقف أخرى كثيرة.</p>
          <div className="dlg-exprs">
            {expressions.map((e) => (
              <article key={e.id} className="dlg-expr">
                <h3 dir="ltr">{e.phrase_en}</h3>
                <p className="dlg-expr__ar">{e.meaning_ar}</p>
                <div className="dlg-expr__use"><span>متى تستخدمها</span><p>{e.when_to_use_ar}</p></div>
              </article>
            ))}
          </div>
        </>
      )}

      <button className="dlg-btn primary wide" onClick={onDone}>فهمتها — انتقل إلى «احفظ»</button>
    </>
  )
}

/* ── 3 · احفظ ──────────────────────────────────────────────────────────────── */
function RecallStep({ lines, myLines, playLine, best, onFinish, onNext }) {
  const [i, setI] = useState(0)
  const [built, setBuilt] = useState([])
  const [verdict, setVerdict] = useState(null) // 'right' | 'wrong' | 'shown'
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  const line = myLines[i]
  const before = useMemo(() => lines.find((l) => l.idx === (line?.idx ?? 0) - 1) || null, [lines, line])
  const chips = useMemo(
    () => (line ? shuffle(line.text_en.split(/\s+/).map((w, k) => ({ id: `${k}-${w}`, w }))) : []),
    [line],
  )
  useEffect(() => { setBuilt([]); setVerdict(null) }, [i])

  const bank = chips.filter((c) => !built.some((b) => b.id === c.id))
  const attempt = built.map((b) => b.w).join(' ')

  const check = () => {
    const right = norm(attempt) === norm(line.text_en)
    setVerdict(right ? 'right' : 'wrong')
    if (right) { setCorrect((c) => c + 1); playLine(line) }
  }
  const reveal = () => { setVerdict('shown'); playLine(line) }
  const next = () => {
    if (i + 1 >= myLines.length) {
      const score = Math.round((correct / myLines.length) * 100)
      setDone(true)
      onFinish(score)
    } else setI(i + 1)
  }
  const restart = () => { setI(0); setBuilt([]); setVerdict(null); setCorrect(0); setDone(false) }

  if (done) {
    const score = Math.round((correct / myLines.length) * 100)
    return (
      <div className="dlg-done">
        <div className={`dlg-done__score ${score >= 80 ? 'good' : score >= 50 ? 'mid' : 'low'}`}>{toAr(score)}٪</div>
        <p className="dlg-done__sub">استعدتَ {linesAr(correct)} من أصل {toAr(myLines.length)}</p>
        <p className="dlg-done__msg">
          {score >= 80 ? 'ممتاز — سطورك صارت في ذاكرتك، لا على الورق. انتقل الآن إلى دورك الحقيقي.'
            : score >= 50 ? 'تقدّم جيد. أعِد الجولة مرة واحدة وستثبت السطور تمامًا.'
            : 'ارجع إلى «افهم»، اقرأ كل سطر مع معناه مرة أخرى، ثم عُد إلى هنا.'}
        </p>
        <div className="dlg-done__acts">
          <button className="dlg-btn" onClick={restart}><RotateCcw size={15} /> أعِد الجولة</button>
          <button className="dlg-btn primary" onClick={onNext}><Mic size={15} /> انتقل إلى «دورك»</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="dlg-drill">
        <div className="dlg-drill__head">
          <span>سطرك {toAr(i + 1)}</span>
          <span className="d">من {toAr(myLines.length)}</span>
          {best > 0 && <span className="dlg-drill__best">أفضل نتيجة {toAr(best)}٪</span>}
        </div>
        <div className="dlg-prog"><span style={{ width: `${(i / myLines.length) * 100}%` }} /></div>

        {before && (
          <div className="dlg-ctx">
            <span className="dlg-ctx__k">قال لك</span>
            <p dir="ltr">{before.text_en}</p>
            <button className="dlg-mini" onClick={() => playLine(before)} aria-label="استمع"><Volume2 size={13} /></button>
          </div>
        )}

        <div className="dlg-ask"><span>والمطلوب أن تقول</span><p>{line.text_ar}</p></div>

        <div className={`dlg-tray${verdict === 'wrong' ? ' bad' : ''}${verdict === 'right' ? ' good' : ''}`}>
          {built.length === 0 && <span className="dlg-tray__ph">اختر الكلمات بالترتيب</span>}
          {built.map((b) => (
            <button key={b.id} className="dlg-chip-w" disabled={!!verdict}
              onClick={() => setBuilt(built.filter((x) => x.id !== b.id))}>{b.w}</button>
          ))}
        </div>

        {!verdict && (
          <>
            <div className="dlg-bank">
              {bank.map((c) => (
                <button key={c.id} className="dlg-chip-w bank" onClick={() => setBuilt([...built, c])}>{c.w}</button>
              ))}
            </div>
            <div className="dlg-drill__acts">
              <button className="dlg-btn primary" disabled={!built.length} onClick={check}><Check size={15} /> تحقّق</button>
              <button className="dlg-btn" disabled={!built.length} onClick={() => setBuilt(built.slice(0, -1))}><Undo2 size={15} /> تراجع</button>
              <button className="dlg-btn ghost" onClick={reveal}><Eye size={15} /> أرِني السطر</button>
            </div>
          </>
        )}

        {verdict && (
          <motion.div className={`dlg-verdict ${verdict}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <span className="dlg-verdict__k">
              {verdict === 'right' ? <><Check size={14} /> بالضبط</> : verdict === 'wrong' ? <><X size={14} /> ليس بعد</> : <><Eye size={14} /> هذا هو السطر</>}
            </span>
            <p dir="ltr">{line.text_en}
              <button className="dlg-mini" onClick={() => playLine(line)} aria-label="استمع"><Volume2 size={13} /></button>
            </p>
            {line.note_ar && <p className="dlg-verdict__note">{line.note_ar}</p>}
            <button className="dlg-btn primary wide" onClick={next}>
              {i + 1 >= myLines.length ? 'إنهاء الجولة' : 'السطر التالي'}
            </button>
          </motion.div>
        )}
      </div>
    </>
  )
}

/* ── 4 · دورك ──────────────────────────────────────────────────────────────── */
function PerformStep({ scenario, lines, playLine, playingLine, audioBlocked, best, onFinish }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  const endRef = useRef(null)

  const line = lines[i]
  const mineTotal = useMemo(() => lines.filter((l) => l.speaker === 'A').length, [lines])
  const options = useMemo(() => {
    if (!line || line.speaker !== 'A') return []
    const wrong = Array.isArray(line.distractors) ? line.distractors.slice(0, 2) : []
    return shuffle([{ text: line.text_en, right: true }, ...wrong.map((w) => ({ text: w, right: false }))])
  }, [line])

  // the other side speaks by itself — that is the whole point of this step
  const firstRun = useRef(true)
  useEffect(() => {
    if (line && line.speaker === 'B') playLine(line, false)
    // never on mount: that would yank the page the instant «دورك» opens
    if (firstRun.current) { firstRun.current = false; return }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = () => {
    setPicked(null)
    if (i + 1 >= lines.length) {
      const score = mineTotal ? Math.round((correct / mineTotal) * 100) : 0
      setDone(true)
      onFinish(score)
    } else setI(i + 1)
  }
  const pick = (o) => {
    if (picked) return
    setPicked(o)
    if (o.right) { setCorrect((c) => c + 1); playLine(line) }
  }
  const restart = () => { setI(0); setPicked(null); setCorrect(0); setDone(false) }

  if (done) {
    const score = mineTotal ? Math.round((correct / mineTotal) * 100) : 0
    return (
      <div className="dlg-done">
        <div className={`dlg-done__score ${score >= 80 ? 'good' : score >= 50 ? 'mid' : 'low'}`}>{toAr(score)}٪</div>
        <p className="dlg-done__sub">أجبتَ صحيحًا في {turnsAr(correct)} من أصل {toAr(mineTotal)}</p>
        <p className="dlg-done__msg">
          {score >= 80 ? 'أحسنتَ — لم تعد تحفظ المشهد فقط، بل تعرف متى يُقال كل سطر.'
            : score >= 50 ? 'قريب جدًا. أعِد الجولة وركّز على السطور التي أخطأتَ فيها.'
            : 'ارجع إلى «افهم» واقرأ ملاحظة كل سطر — هي التي تشرح لماذا هذا الردّ لا غيره.'}
        </p>
        <div className="dlg-done__acts">
          <button className="dlg-btn primary" onClick={restart}><RotateCcw size={15} /> أعِد الجولة</button>
          <Link className="dlg-btn" to="/student/dialogues"><ArrowLeft size={15} /> محادثة أخرى</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="dlg-live">
      <div className="dlg-drill__head">
        <span>الدور {toAr(i + 1)}</span>
        <span className="d">من {toAr(lines.length)}</span>
        {best > 0 && <span className="dlg-drill__best">أفضل نتيجة {toAr(best)}٪</span>}
      </div>
      <div className="dlg-prog"><span style={{ width: `${(i / lines.length) * 100}%` }} /></div>

      <div className="dlg-script">
        {lines.slice(0, i).map((l) => (
          <Turn key={l.id} line={l} scenario={scenario} dim playing={playingLine === l.idx} onPlay={() => playLine(l)} />
        ))}

        {line.speaker === 'B' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Turn line={line} scenario={scenario} active playing={playingLine === line.idx} onPlay={() => playLine(line)} />
            {audioBlocked && (
              <p className="dlg-toolbar__hint" style={{ marginTop: 8 }}>
                لم يشتغل الصوت تلقائيًا — اضغط زر الاستماع بجانب السطر.
              </p>
            )}
            <button className="dlg-btn primary wide" onClick={advance}>ردّ الآن</button>
          </motion.div>
        ) : (
          <motion.div className="dlg-turn-ask" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="dlg-turn-ask__k"><Mic size={13} /> دورك — ماذا تقول؟</span>
            <div className="dlg-choices">
              {options.map((o) => {
                let cls = 'dlg-choice'
                if (picked) {
                  if (o.right) cls += ' right'
                  else if (o === picked) cls += ' wrongp'
                  else cls += ' dim'
                }
                return (
                  <button key={o.text} className={cls} onClick={() => pick(o)} disabled={!!picked} dir="ltr">
                    <span>{o.text}</span>
                    {picked && o.right && <Check size={16} />}
                    {picked && !o.right && o === picked && <X size={16} />}
                  </button>
                )
              })}
            </div>
            <AnimatePresence>
              {picked && (
                <motion.div className={`dlg-verdict ${picked.right ? 'right' : 'wrong'}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <span className="dlg-verdict__k">
                    {picked.right ? <><Check size={14} /> هذا هو الردّ</> : <><X size={14} /> ليس هذا — الردّ الصحيح هو المُعلَّم بالأخضر</>}
                  </span>
                  {/* on a wrong pick the correct option is already on screen, ticked green
                      60px above — reprinting it here read as a rendering bug. Lead instead
                      with the two things that option cannot carry: the meaning and the why. */}
                  {picked.right && (
                    <p dir="ltr">{line.text_en}
                      <button className="dlg-mini" onClick={() => playLine(line)} aria-label="استمع"><Volume2 size={13} /></button>
                    </p>
                  )}
                  <p className="dlg-verdict__ar">
                    {line.text_ar}
                    {!picked.right && (
                      <button className="dlg-mini" onClick={() => playLine(line)} aria-label="استمع للردّ الصحيح"><Volume2 size={13} /></button>
                    )}
                  </p>
                  {line.note_ar && <p className="dlg-verdict__note">{line.note_ar}</p>}
                  <button className="dlg-btn primary wide" onClick={advance}>
                    {i + 1 >= lines.length ? 'إنهاء المشهد' : 'تابع'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}

/* ── one turn in the script ────────────────────────────────────────────────── */
function Turn({ line, scenario, showAr, note, active, dim, playing, onPlay, innerRef }) {
  const mine = line.speaker === 'A'
  return (
    <div ref={innerRef} className={`dlg-turn${mine ? ' me' : ' them'}${active ? ' active' : ''}${dim ? ' dim' : ''}`}>
      <span className="dlg-turn__who">{mine ? 'أنت' : scenario?.b_name}</span>
      <div className="dlg-bubble">
        <p className="dlg-bubble__en" dir="ltr">{line.text_en}</p>
        <button className={`dlg-mini${playing ? ' on' : ''}`} onClick={onPlay} aria-label="استمع لهذا السطر">
          <Volume2 size={13} />
        </button>
        {showAr && <p className="dlg-bubble__ar">{line.text_ar}</p>}
      </div>
      {note && (
        <div className="dlg-note"><span><Lightbulb size={11} /> لماذا هكذا؟</span><p>{note}</p></div>
      )}
    </div>
  )
}
