// ConversationMode — the voiced back-and-forth with an AI coach. This IS the speaking
// section now: the coach ("Layla") speaks first, the student replies by voice, the coach
// recasts gently, and the whole exchange is graded with the speaking rubric → the section
// is marked complete (summary speaking_recordings row). No existing data is touched.
//
// Two presentations, ONE engine:
//   variant="panel" (default) — a self-framed glass card with its own aurora. Used by the
//                               Pro Desk call surface.
//   variant="stage"           — frameless: it fills the Speaking Studio's single continuous
//                               stage, which supplies the frame, the bloom and the brief.
//
// Backend logic is unchanged from the verified version. Safari-safe RecordRTC → voice-notes,
// invokeWithRetry, per-turn idempotency, impersonation-aware as_student_id.

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Mic, Square, Volume2, Sparkles, Send, RotateCcw, Trophy, ChevronLeft, AlertCircle, Star, Lightbulb, Play } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { invokeWithRetry } from '../../../lib/invokeWithRetry'
import { useG } from '../../../i18n/gender'
import { safeCelebrate } from '../../../lib/celebrations'

const MIN_END_TURNS = 3   // student may end after this many turns
const MAX_TURNS = 8       // ceiling — the coach wraps up here (bounds API cost)

// ── Safari-safe mime (mirrors VoiceRecorder.jsx) ──
const getMime = () => {
  if (typeof MediaRecorder === 'undefined') return 'audio/mp4'
  if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) return 'audio/mp4'
  if (window.navigator.standalone) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return 'audio/mp4'
}
const extOf = (m) => (m.includes('mp4') ? 'mp4' : m.includes('webm') ? 'webm' : m.includes('ogg') ? 'ogg' : 'mp4')

const parseData = async (data) => {
  if (data instanceof Blob) { try { return JSON.parse(await data.text()) } catch { return null } }
  if (typeof data === 'string') { try { return JSON.parse(data) } catch { return null } }
  return data
}

// Tiny silent WAV — played inside the first user gesture to unlock <audio> autoplay on iOS.
const silentWavUrl = () => {
  const sr = 8000, n = 400
  const buf = new ArrayBuffer(44 + n * 2)
  const dv = new DataView(buf)
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true)
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true)
  dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

const IDLE_BARS = Array.from({ length: 28 }, () => 0.12)

// Arabic counts its way, not English's: 1 = singular, 2 = dual, 3–10 = plural.
const turnsAr = (n) => (n === 1 ? 'ردّ واحد' : n === 2 ? 'ردّين' : `${n} ردود`)

// Scoped premium styles (explicit rgba — no color-mix, for iOS < 16.4 safety)
const STYLE = `
.cvm-root{position:relative;overflow:hidden;border-radius:26px;background:linear-gradient(180deg,rgba(10,18,34,0.92),rgba(8,14,28,0.96));border:1px solid rgba(255,255,255,0.07);box-shadow:0 1px 0 0 rgba(255,255,255,0.05) inset,0 24px 60px -28px rgba(0,0,0,0.7),0 8px 28px -16px rgba(56,189,248,0.18)}
.cvm-root[data-variant="stage"]{background:transparent;border:0;border-radius:0;box-shadow:none;overflow:visible}
.cvm-root[data-variant="stage"] .cvm-aurora,.cvm-root[data-variant="stage"] .cvm-scrim{display:none}
.cvm-aurora{position:absolute;inset:-12%;z-index:0;pointer-events:none;transition:transform 1100ms cubic-bezier(.16,1,.3,1)}
.cvm-root[data-speaking="true"] .cvm-aurora{transform:scale(1.05)}
.cvm-blob{position:absolute;border-radius:50%;filter:blur(58px);mix-blend-mode:screen;opacity:.5}
.cvm-b1{width:46%;height:60%;left:-6%;top:-12%;background:radial-gradient(circle,rgba(56,189,248,.55),rgba(56,189,248,0) 70%);animation:cvmFloat1 34s ease-in-out infinite alternate}
.cvm-b2{width:50%;height:64%;right:-10%;top:10%;background:radial-gradient(circle,rgba(245,200,66,.34),rgba(245,200,66,0) 70%);animation:cvmFloat2 42s ease-in-out infinite alternate}
.cvm-b3{width:42%;height:50%;left:18%;bottom:-16%;background:radial-gradient(circle,rgba(251,191,36,.22),rgba(251,191,36,0) 70%);animation:cvmFloat3 52s ease-in-out infinite alternate}
.cvm-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(8,14,28,.55),rgba(8,14,28,.20) 30%,rgba(8,14,28,.30) 70%,rgba(8,14,28,.66)),radial-gradient(120% 80% at 50% 0%,transparent,rgba(8,14,28,.4))}
.cvm-content{position:relative;z-index:2}
@keyframes cvmFloat1{from{transform:translate(0,0)}to{transform:translate(14%,10%)}}
@keyframes cvmFloat2{from{transform:translate(0,0)}to{transform:translate(-12%,8%)}}
@keyframes cvmFloat3{from{transform:translate(0,0)}to{transform:translate(10%,-10%)}}
@keyframes cvmBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes cvmRing{0%{transform:scale(.8);opacity:.55}100%{transform:scale(1.9);opacity:0}}
@keyframes cvmBar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
@keyframes cvmSheen{0%{transform:translateX(-120%)}60%,100%{transform:translateX(220%)}}
@keyframes cvmShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.cvm-orb{position:relative;border-radius:50%;
background:
 radial-gradient(circle at 30% 24%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 34%),
 radial-gradient(circle at 36% 30%, #b6f2ff 0%, #22c9f5 38%, #0791bd 68%, #05516d 100%);
box-shadow:
 inset 0 0 0 1px rgba(255,255,255,.30),
 inset 0 -10px 22px -10px rgba(0,0,0,.55),
 inset 0 8px 18px -10px rgba(255,255,255,.55),
 0 10px 30px -10px rgba(0,212,255,.55),
 0 0 60px -12px rgba(0,212,255,.45),
 0 0 90px -20px rgba(245,200,66,.28)}
.cvm-orb::before{content:"";position:absolute;inset:-18%;border-radius:50%;pointer-events:none;
 background:conic-gradient(from 0deg,rgba(0,212,255,0) 0deg,rgba(0,212,255,.28) 60deg,rgba(245,200,66,.22) 140deg,rgba(0,212,255,0) 220deg);
 filter:blur(9px);animation:cvmSpin 14s linear infinite;opacity:.85}
.cvm-orb::after{content:"";position:absolute;inset:8%;border-radius:50%;pointer-events:none;
 background:radial-gradient(circle at 50% 120%, rgba(255,255,255,.22), rgba(255,255,255,0) 58%)}
@keyframes cvmSpin{to{transform:rotate(360deg)}}
.cvm-orb[data-anim="true"]{animation:cvmBreathe 4.5s ease-in-out infinite}
.cvm-orb-ring{position:absolute;inset:-6%;border-radius:50%;border:1px solid rgba(0,212,255,.42);pointer-events:none}
.cvm-orb[data-speaking="true"] .cvm-orb-ring{animation:cvmRing 1.6s ease-out infinite}
.cvm-orb[data-speaking="true"] .cvm-orb-ring.d2{animation-delay:.5s}
.cvm-sbar{width:3px;border-radius:2px;background:linear-gradient(to top,#00d4ff,#9beeff);transform-origin:bottom}
.cvm-sbar[data-on="true"]{animation:cvmBar .9s ease-in-out infinite}
.cvm-cta{position:relative;overflow:hidden}
.cvm-cta::after{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);transform:translateX(-120%);animation:cvmSheen 4.2s ease-in-out 1.2s infinite}
.cvm-mic-pulse{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(251,113,133,.45)}
.cvm-mic-pulse[data-on="true"]{animation:cvmRing 1.5s ease-out infinite}
.cvm-mic-pulse.d2[data-on="true"]{animation-delay:.5s}
.cvm-shim{background:linear-gradient(90deg,rgba(0,212,255,.06),rgba(245,200,66,.16),rgba(0,212,255,.06));background-size:200% 100%;animation:cvmShimmer 1.8s linear infinite}
.cvm-stream{overflow-y:auto;-webkit-overflow-scrolling:touch;max-height:min(44vh,360px);min-height:190px;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 22px,#000 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 22px,#000 100%)}
@media (min-width:768px){.cvm-stream{max-height:min(52vh,420px)}}
@media (pointer: coarse){.cvm-blob{animation:none!important;mix-blend-mode:normal;opacity:.62}.cvm-orb::before{animation:none}}
@media (prefers-reduced-motion: reduce){.cvm-aurora,.cvm-orb,.cvm-orb::before,.cvm-orb-ring,.cvm-sbar,.cvm-cta::after,.cvm-mic-pulse,.cvm-shim{animation:none!important}}
`

// Scenario routing (Pro Desk / individual track) accepts BOTH shapes so neither surface
// breaks: `moduleId` (specialization_modules) and `scenarioRef` ({ kind:'module', id }).
// When either is present the unit fields are omitted and the edge fn loads the scenario.
// onComplete receives { conversationId, evaluation } so a Desk parent can mark it done.
export default function ConversationMode({
  topic, studentId, unitId, questionIndex = 0,
  moduleId = null, scenarioRef = null, personaVariant,
  autoStart = false, variant = 'panel', headerExtra = null,
  onComplete, onPhaseChange, onSwitchToClassic,
}) {
  const g = useG()
  const reduce = useReducedMotion()
  const isStage = variant === 'stage'
  const [phase, setPhase] = useState('intro')          // intro | active | grading | result
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])          // { id, role, text, audioUrl }          // { id, role, text, audioUrl }
  const [recState, setRecState] = useState('idle')      // idle | recording | processing
  const [studentTurns, setStudentTurns] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [yourWords, setYourWords] = useState([])
  const [error, setError] = useState('')
  const [bars, setBars] = useState(IDLE_BARS)
  const [coachSpeaking, setCoachSpeaking] = useState(false)
  // Inline phrase hints belong to the standalone panel (the Desk call). In the
  // Studio the same phrases live in the stage's «مساعدة» sheet instead.
  const [hintsOpen, setHintsOpen] = useState(false)
  // An unfinished conversation is not a lost conversation. The engine opened a BRAND-NEW
  // conversation on every visit, so a student who left mid-chat — phone locked, tab closed,
  // class started — came back to an empty stage while her real turns sat orphaned in the
  // database. The stage now offers to pick that conversation back up.
  const [resumable, setResumable] = useState(null)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const silentRef = useRef(null)
  const scrollRef = useRef(null)
  const analyserRef = useRef(null)
  const audioCtxRef = useRef(null)
  const rafRef = useRef(null)
  const maxTurnSec = topic?.max_duration_seconds ? Math.min(60, Math.max(30, topic.max_duration_seconds)) : 60

  useEffect(() => {
    const a = new Audio()
    a.preload = 'auto'
    a.onplaying = () => setCoachSpeaking(true)
    a.onended = () => setCoachSpeaking(false)
    a.onpause = () => setCoachSpeaking(false)
    audioRef.current = a
    return () => {
      try { a.pause() } catch {}
      clearInterval(timerRef.current)
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close().catch(() => {})
      if (silentRef.current) URL.revokeObjectURL(silentRef.current)
    }
  }, [])

  // Let the parent stage react to the flow (collapse the brief, swap chrome…).
  useEffect(() => { onPhaseChange?.(phase) }, [phase, onPhaseChange])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, recState])

  const playCoach = useCallback((url) => {
    if (!url || !audioRef.current) return
    try { audioRef.current.pause() } catch {}
    audioRef.current.src = url
    audioRef.current.play().catch(() => {})
  }, [])

  const pushMessage = useCallback((m) => setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...m }]), [])

  const startConversation = useCallback(async () => {
    setError('')
    try {
      silentRef.current = silentWavUrl()
      audioRef.current.src = silentRef.current
      audioRef.current.play().then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0 }).catch(() => {})
    } catch {}
    setPhase('active')
    setRecState('processing')
    // as_student_id makes impersonation work: when staff view AS a student, completion is
    // written for that student (studentId here = the effective/impersonated profile id).
    const scenarioBody = scenarioRef
      ? { action: 'start', scenario_ref: scenarioRef, persona_variant: personaVariant, as_student_id: studentId }
      : moduleId
        ? { action: 'start', module_id: moduleId, as_student_id: studentId }
        : { action: 'start', unit_id: unitId, speaking_id: topic?.id, question_index: questionIndex, as_student_id: studentId }
    const { data, error: err } = await invokeWithRetry('speaking-conversation-turn', {
      body: scenarioBody,
    }, { timeoutMs: 45000, retries: 1 })
    const parsed = await parseData(data)
    setRecState('idle')
    if (err || !parsed?.conversation_id) {
      setError(g('تعذّر بدء المحادثة الآن — تحقّق من الاتصال وحاول مرة أخرى.', 'تعذّر بدء المحادثة الآن — تحققي من الاتصال وحاولي مرة أخرى.'))
      setPhase('intro'); return
    }
    setConversationId(parsed.conversation_id)
    pushMessage({ role: 'ai', text: parsed.reply, audioUrl: parsed.reply_audio_url })
    playCoach(parsed.reply_audio_url)
  }, [unitId, moduleId, scenarioRef, personaVariant, topic?.id, questionIndex, studentId, pushMessage, playCoach]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scenario conversations live on a module; curriculum ones on a unit + question index.
  const scopeModuleId = moduleId || (scenarioRef?.kind === 'module' ? scenarioRef.id : null)

  // Look for a live conversation on THIS task from the last day. The Desk call is
  // deliberately excluded: answering a call means a new call, not a rerun of an old one.
  useEffect(() => {
    if (autoStart || !studentId || phase !== 'intro') return
    let cancelled = false
    ;(async () => {
      let q = supabase
        .from('speaking_conversations')
        .select('id, turn_count, updated_at')
        .eq('student_id', studentId)
        .eq('status', 'in_progress')
        .is('deleted_at', null)
        .gt('turn_count', 0)
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false })
        .limit(1)
      q = scopeModuleId
        ? q.eq('module_id', scopeModuleId)
        : q.eq('unit_id', unitId).eq('question_index', questionIndex)
      const { data } = await q
      if (!cancelled) setResumable(data?.[0] || null)
    })()
    return () => { cancelled = true }
  }, [autoStart, studentId, unitId, questionIndex, scopeModuleId, phase])

  const resumeConversation = useCallback(async (convo) => {
    if (!convo?.id) return
    setError('')
    try {
      silentRef.current = silentWavUrl()
      audioRef.current.src = silentRef.current
      audioRef.current.play().then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0 }).catch(() => {})
    } catch {}
    setPhase('active')
    setRecState('processing')
    const { data: turns, error: tErr } = await supabase
      .from('speaking_conversation_turns')
      .select('turn_index, role, content, audio_path')
      .eq('conversation_id', convo.id)
      .order('turn_index')
    setRecState('idle')
    if (tErr || !turns?.length) {
      setError(g('تعذّر فتح محادثتك السابقة — ابدأ محادثة جديدة.', 'تعذّر فتح محادثتكِ السابقة — ابدئي محادثة جديدة.'))
      setPhase('intro'); setResumable(null); return
    }
    setConversationId(convo.id)
    // Layla's turns keep a public TTS url in audio_path; the student's keep a PRIVATE
    // storage path — her own bubbles carry no replay button, so it is never needed here.
    setMessages(turns.map((t, i) => ({
      id: `resumed-${t.turn_index}-${i}`,
      role: t.role === 'student' ? 'student' : 'ai',
      text: t.content || '',
      audioUrl: t.role === 'ai' && /^https?:/.test(t.audio_path || '') ? t.audio_path : null,
    })))
    setStudentTurns(convo.turn_count || turns.filter((t) => t.role === 'student').length)
    // Replay Layla's last line so she lands back exactly where they left off.
    const lastAi = [...turns].reverse().find((t) => t.role === 'ai' && /^https?:/.test(t.audio_path || ''))
    if (lastAi) playCoach(lastAi.audio_path)
  }, [g, playCoach])

  // When mounted inside the Desk call flow, the incoming-call ceremony already happened —
  // begin immediately so answering feels like a live call (no second "start" screen).
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (autoStart && !autoStartedRef.current && phase === 'intro') {
      autoStartedRef.current = true
      startConversation()
    }
  }, [autoStart, phase, startConversation])

  // ── Recording + live analyser waveform ──
  const tickBars = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const N = IDLE_BARS.length
    const next = new Array(N)
    for (let i = 0; i < N; i++) {
      const idx = Math.floor((i / N) * data.length)
      next[i] = Math.max(0.1, (data[idx] / 255) * 1.05)
    }
    setBars(next)
    rafRef.current = requestAnimationFrame(tickBars)
  }, [])

  const startRecording = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })
      streamRef.current = stream
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        audioCtxRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        const an = ctx.createAnalyser(); an.fftSize = 128; src.connect(an)
        analyserRef.current = an
        rafRef.current = requestAnimationFrame(tickBars)
      } catch {}
      const RecordRTC = (await import('recordrtc')).default
      const mime = getMime()
      const recorder = new RecordRTC(stream, { type: 'audio', mimeType: mime, recorderType: RecordRTC.StereoAudioRecorder, numberOfAudioChannels: 1, desiredSampRate: 16000 })
      recorder.startRecording()
      recorderRef.current = recorder
      setRecState('recording')
      setElapsed(0)
      const t0 = Date.now()
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000)
        setElapsed(s)
        if (s >= maxTurnSec) stopRecording()
      }, 500)
    } catch (e) {
      setError(e?.name === 'NotAllowedError' ? 'يرجى السماح بالوصول للمايكروفون من إعدادات المتصفح' : 'تعذّر بدء التسجيل')
    }
  }, [maxTurnSec, tickBars]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    setBars(IDLE_BARS)
    audioCtxRef.current?.close().catch(() => {}); audioCtxRef.current = null; analyserRef.current = null
    const recorder = recorderRef.current
    if (!recorder) return
    const seconds = elapsed
    recorder.stopRecording(async () => {
      const blob = recorder.getBlob()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setRecState('processing')
      await submitTurn(blob, seconds || 1)
    })
  }, [elapsed]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitTurn = useCallback(async (blob, seconds) => {
    try {
      const mime = blob.type || getMime()
      const path = `${studentId}/conv/${conversationId}/${Date.now()}.${extOf(mime)}`
      const { error: upErr } = await supabase.storage.from('voice-notes').upload(path, blob, { contentType: mime.split(';')[0], upsert: false })
      if (upErr) throw upErr
      const { data, error: err } = await invokeWithRetry('speaking-conversation-turn', {
        body: { action: 'turn', conversation_id: conversationId, audio_path: path, audio_duration_seconds: Math.round(seconds), client_turn_uuid: crypto.randomUUID() },
      }, { timeoutMs: 60000, retries: 1 })
      const parsed = await parseData(data)
      // She resumed a conversation the rescue sweeper had already graded in the meantime.
      // Her work is safe — say exactly that instead of "check your connection".
      if (parsed?.done && parsed?.error) {
        setError(g('هذي المحادثة تم تقييمها وحُفظت — حدّث الصفحة وبتلقى الحصيلة تحت.', 'هذي المحادثة تم تقييمها وحُفظت — حدّثي الصفحة وبتلقين الحصيلة تحت.'))
        setRecState('idle'); return
      }
      if (err || !parsed || parsed.error) throw new Error(parsed?.message || err || 'turn failed')
      if (parsed.ok === false || parsed.no_advance) {
        pushMessage({ role: 'ai', text: parsed.reply || g('ما سمعتك بوضوح — حاول مرة ثانية من فضلك.', 'ما سمعتك بوضوح — حاولي مرة ثانية من فضلك.'), audioUrl: parsed.reply_audio_url })
        playCoach(parsed.reply_audio_url); setRecState('idle'); return
      }
      pushMessage({ role: 'student', text: parsed.transcript })
      pushMessage({ role: 'ai', text: parsed.reply, audioUrl: parsed.reply_audio_url })
      playCoach(parsed.reply_audio_url)
      setStudentTurns(parsed.turn_count || ((s) => s + 1))
      setRecState('idle')
      if (parsed.done) { setDone(true); setTimeout(() => endConversation(), 2400) }
    } catch (e) {
      setError(g('تعذّر إرسال دورك — تحقّق من الاتصال وحاول مرة أخرى', 'تعذّر إرسال دورك — تحققي من الاتصال وحاولي مرة أخرى')); setRecState('idle')
    }
  }, [studentId, conversationId, pushMessage, playCoach]) // eslint-disable-line react-hooks/exhaustive-deps

  const endConversation = useCallback(async () => {
    setPhase('grading')
    const { data, error: err } = await invokeWithRetry('speaking-conversation-grade', { body: { conversation_id: conversationId } }, { timeoutMs: 90000, retries: 1 })
    const parsed = await parseData(data)
    if (err || !parsed?.ok) {
      setError(parsed?.reason === 'need_more' ? g('تحتاج لتبادل بضع جُمل قبل إنهاء المحادثة', 'تحتاجين لتبادل بضع جُمل قبل إنهاء المحادثة') : g('تعذّر حفظ تقييم المحادثة — اضغط لإعادة المحاولة', 'تعذّر حفظ تقييم المحادثة — اضغطي لإعادة المحاولة'))
      setPhase('active'); return
    }
    setEvaluation(parsed.evaluation); setYourWords(parsed.your_words || []); setPhase('result')
    try { safeCelebrate('speaking_uploaded') } catch {}
    onComplete?.({ conversationId, evaluation: parsed.evaluation })
  }, [conversationId, onComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  const restart = useCallback(() => {
    setPhase('intro'); setConversationId(null); setMessages([]); setStudentTurns(0)
    setDone(false); setEvaluation(null); setYourWords([]); setError(''); setRecState('idle')
    setResumable(null)   // she just finished one — never offer to "resume" it
  }, [])

  const overall = evaluation?.overall_score
  const band = overall >= 8 ? { c: '#34d399', t: g('ممتاز', 'ممتازة') } : overall >= 6 ? { c: '#00d4ff', t: g('أداء حلو', 'أداؤكِ حلو') } : overall >= 4 ? { c: '#f5c842', t: g('بداية طيبة', 'بدايةٌ طيبة') } : { c: '#f5c842', t: g('خطوة أولى رائعة', 'خطوةٌ أولى رائعة') }

  const canFinish = studentTurns >= MIN_END_TURNS

  return (
    <div className="cvm-root" data-speaking={coachSpeaking} data-variant={variant}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="cvm-aurora"><span className="cvm-blob cvm-b1" /><span className="cvm-blob cvm-b2" /><span className="cvm-blob cvm-b3" /></div>
      <div className="cvm-scrim" />

      <div className="cvm-content">
        {/* Coach bar — the stage's marquee. Hidden on the Studio's intro screen,
            where the big invitation orb IS the introduction (two orbs 100px apart
            read as a duplicated element, not as presence). */}
        {!(isStage && phase === 'intro' && !autoStart) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <CoachOrb size={38} speaking={coachSpeaking} animate={!reduce} />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white font-['Tajawal'] leading-none flex items-center gap-1.5">
                المدرّبة <span className="text-[10px] font-semibold text-cyan-300/70 font-['Inter']">Layla</span>
              </p>
              <p className="text-[10px] font-['Tajawal'] mt-1 transition-colors truncate" style={{ color: coachSpeaking ? '#7dd3fc' : 'rgba(248,250,252,0.45)' }}>
                {coachSpeaking ? 'تتحدّث الآن…'
                  : recState === 'recording' ? g('تستمع إليك…', 'تستمع إليكِ…')
                  : recState === 'processing' ? 'تفكّر…'
                  : g('محادثة إنجليزية · خاصة بك', 'محادثة إنجليزية · خاصة بكِ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerExtra}
            {onSwitchToClassic && (
              <button onClick={onSwitchToClassic} className="flex items-center gap-1 text-[11px] font-bold font-['Tajawal'] text-white/45 hover:text-white/75 transition-colors px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                🎙 تسجيل عادي <ChevronLeft size={13} />
              </button>
            )}
          </div>
        </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── INTRO ── */}
          {phase === 'intro' && !autoStart && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-6 pb-7 flex flex-col items-center text-center gap-3.5">
              <div className="flex flex-col items-center gap-2.5">
                <CoachOrb size={92} speaking animate={!reduce} />
                <div>
                  <p className="text-[15px] font-bold text-white font-['Tajawal'] leading-none">المدرّبة ليلى</p>
                  <p className="text-[11px] mt-1.5" dir="ltr" style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '.055em', textTransform: 'uppercase', color: 'rgba(125,211,252,0.78)' }}>English speaking coach</p>
                </div>
              </div>
              <p className="text-[13px] font-['Tajawal'] leading-[1.9] max-w-[38ch]" style={{ color: 'rgba(248,250,252,0.6)' }}>
                {g('تبدأ ليلى بصوتها وتسألك وترد بصوتك — مكالمة قصيرة بالإنجليزي. توقف في أي لحظة، وكلامك خاص.',
                   'تبدأ ليلى بصوتها وتسألكِ وتردّين بصوتكِ — مكالمة قصيرة بالإنجليزي. توقفي في أي لحظة، وكلامكِ خاص.')}
              </p>
              {!isStage && topic?.title_en && (
                <div className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold font-['Inter']" dir="ltr" style={{ background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.20)', color: '#7dd3fc' }}>
                  {topic.title_en}
                </div>
              )}
              {resumable ? (
                <div className="flex flex-col items-center gap-2.5 mt-1">
                  <button onClick={() => resumeConversation(resumable)} className="cvm-cta flex items-center gap-2 px-7 h-12 rounded-2xl text-sm font-extrabold font-['Tajawal'] transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(100deg,#f7cf55 0%,#ffe9b0 26%,#9fe9ff 56%,#25c9f2 100%)', color: '#0b0f17', boxShadow: '0 12px 34px -10px rgba(245,200,66,0.45), 0 6px 20px -10px rgba(0,212,255,0.5), inset 0 1px 0 0 rgba(255,255,255,0.5)' }}>
                    <Play size={16} fill="currentColor" /> {g('أكمل محادثتك', 'أكملي محادثتكِ')}
                  </button>
                  <p className="text-[11px] font-['Tajawal']" style={{ color: 'rgba(248,250,252,0.5)' }}>
                    {g('عندك محادثة ما خلّصتها', 'عندكِ محادثة ما خلّصتِها')} · {turnsAr(resumable.turn_count || 0)}
                  </p>
                  <button onClick={() => { setResumable(null); startConversation() }} className="text-xs text-white/40 hover:text-white/70 font-['Tajawal'] underline underline-offset-4">
                    {g('أو ابدأ محادثة جديدة', 'أو ابدئي محادثة جديدة')}
                  </button>
                </div>
              ) : (
                <button onClick={startConversation} className="cvm-cta flex items-center gap-2 px-7 h-12 rounded-2xl text-sm font-extrabold font-['Tajawal'] transition-transform hover:-translate-y-0.5 mt-1" style={{ background: 'linear-gradient(100deg,#f7cf55 0%,#ffe9b0 26%,#9fe9ff 56%,#25c9f2 100%)', color: '#0b0f17', boxShadow: '0 12px 34px -10px rgba(245,200,66,0.45), 0 6px 20px -10px rgba(0,212,255,0.5), inset 0 1px 0 0 rgba(255,255,255,0.5)' }}>
                  <Mic size={16} /> {g('ابدأ المحادثة', 'ابدئي المحادثة')}
                </button>
              )}
              {onSwitchToClassic && (
                <button onClick={onSwitchToClassic} className="text-xs text-white/40 hover:text-white/65 font-['Tajawal'] underline underline-offset-4">
                  {g('أو سجّل مرة وحدة زي قبل', 'أو سجّلي مرة وحدة زي قبل')}
                </button>
              )}
              {error && <p className="text-xs text-amber-400 font-['Tajawal']">{error}</p>}
            </motion.div>
          )}

          {/* ── ACTIVE ── */}
          {phase === 'active' && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* turn progress — the ceiling, and when finishing becomes possible */}
              <div className="px-4 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold font-['Tajawal']" style={{ color: 'rgba(248,250,252,0.45)' }}>
                    {canFinish ? g('تقدر تنهي المحادثة الآن', 'تقدرين تنهين المحادثة الآن') : 'تقدّم المحادثة'}
                  </span>
                  <span className="text-[10px] font-bold font-['Tajawal'] tabular-nums" style={{ color: canFinish ? '#6ee7b7' : 'rgba(248,250,252,0.45)' }}>
                    {Math.min(studentTurns, MAX_TURNS)}/{MAX_TURNS}
                  </span>
                </div>
                <div dir="ltr" className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div className="h-full rounded-full" animate={{ width: `${Math.min(100, (studentTurns / MAX_TURNS) * 100)}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: canFinish ? 'linear-gradient(90deg,#22d3ee,#34d399)' : 'linear-gradient(90deg,#f5c842,#00d4ff)' }} />
                  <div className="absolute top-0 bottom-0" title="يمكنك الإنهاء من هنا" style={{ left: `${(MIN_END_TURNS / MAX_TURNS) * 100}%`, width: 2, background: 'rgba(255,255,255,0.4)' }} />
                </div>
              </div>

              <div ref={scrollRef} className="cvm-stream px-4 pt-3 pb-5 space-y-3.5">
                {messages.map((m, i) => (
                  <Bubble key={m.id} message={m} onReplay={() => playCoach(m.audioUrl)} speaking={coachSpeaking && m.role === 'ai' && i === messages.length - 1} reduce={reduce} />
                ))}
                {recState === 'processing' && (
                  <div className="flex items-center gap-2.5 pr-1">
                    <CoachOrb size={26} speaking animate={!reduce} />
                    <div className="flex gap-1 items-end h-4">
                      {[0, 1, 2].map((i) => <span key={i} className="cvm-sbar" data-on="true" style={{ height: 14, animationDelay: `${i * 0.16}s` }} />)}
                    </div>
                  </div>
                )}

                {/* The moment her work becomes gradeable, SAY SO — once. The feedback is the
                    whole payoff of the section, and a silent button under the mic was never
                    going to carry that. After this turn the promoted dock button takes over. */}
                {canFinish && !done && recState === 'idle' && studentTurns === MIN_END_TURNS && (
                  <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl px-4 py-3.5 flex flex-col items-center gap-2.5 text-center"
                    style={{ background: 'linear-gradient(135deg,rgba(52,211,153,0.11),rgba(251,191,36,0.07))', border: '1px solid rgba(52,211,153,0.22)' }}>
                    <p className="text-[12px] font-['Tajawal'] leading-[1.9] max-w-[40ch]" style={{ color: 'rgba(238,245,255,0.8)' }}>
                      {g('كلامك يكفي للتقييم — تقدر تنهي الحين وتشوف تقييمك الكامل، أو تكمّل مع ليلى وكل ردّ إضافي يخلّي التقييم أدق.',
                         'كلامكِ يكفي للتقييم — تقدرين تنهين الحين وتشوفين تقييمكِ الكامل، أو تكمّلين مع ليلى وكل ردّ إضافي يخلّي التقييم أدق.')}
                    </p>
                    <button onClick={endConversation} className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-xs font-extrabold font-['Tajawal'] transition-transform hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#04121a', boxShadow: '0 10px 26px -12px rgba(52,211,153,0.75)' }}>
                      <Trophy size={13} /> {g('أنهِ واعرض التقييم', 'أنهي واعرضي التقييم')}
                    </button>
                  </motion.div>
                )}
              </div>

              {!isStage && topic?.useful_phrases?.length > 0 && (
                <div className="px-4 pb-1">
                  <button onClick={() => setHintsOpen((v) => !v)} className="flex items-center gap-1.5 text-[11px] font-bold font-['Tajawal'] text-amber-300/85 hover:text-amber-300">
                    <Lightbulb size={13} /> {g('محتاج مساعدة؟ عبارات مفيدة', 'محتاجة مساعدة؟ عبارات مفيدة')}
                  </button>
                  <AnimatePresence>
                    {hintsOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {topic.useful_phrases.map((p, i) => (
                            <span key={i} dir="ltr" className="px-2.5 py-1 rounded-lg text-[11px] font-semibold font-['Inter']" style={{ background: 'rgba(251,191,36,0.09)', border: '1px solid rgba(251,191,36,0.18)', color: '#fcd34d' }}>{p}</span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {error && <p className="px-4 pb-1 text-xs text-amber-400 font-['Tajawal'] flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}

              {/* mic dock */}
              <div className="px-4 py-5 flex flex-col items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {recState === 'recording' && (
                  <div className="flex items-end justify-center gap-[3px] h-9 w-full max-w-[260px]">
                    {bars.map((b, i) => <span key={i} className="cvm-sbar" style={{ height: `${Math.max(4, b * 34)}px`, opacity: 0.55 + b * 0.45 }} />)}
                  </div>
                )}
                {recState === 'recording' ? (
                  <button onClick={stopRecording} aria-label="إيقاف التسجيل" className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ background: 'rgba(251,113,133,0.14)', border: '2px solid rgba(251,113,133,0.4)', color: '#fda4af', boxShadow: '0 0 36px -6px rgba(251,113,133,0.4)' }}>
                    <span className="cvm-mic-pulse" data-on="true" /><span className="cvm-mic-pulse d2" data-on="true" />
                    <Square size={22} fill="currentColor" />
                  </button>
                ) : (
                  <button onClick={startRecording} disabled={recState === 'processing'} aria-label={g('اضغط وتكلّم', 'اضغطي وتكلّمي')} className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform hover:-translate-y-0.5 disabled:opacity-40" style={{ background: 'rgba(34,211,238,0.13)', border: '1px solid rgba(34,211,238,0.32)', color: '#67e8f9', boxShadow: '0 8px 30px -8px rgba(56,189,248,0.4), inset 0 1px 0 0 rgba(255,255,255,0.1)' }}>
                    <Mic size={28} />
                  </button>
                )}
                <p className="text-[11px] font-['Tajawal'] tabular-nums" style={{ color: 'rgba(248,250,252,0.5)' }}>
                  {recState === 'recording' ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} — ${g('اضغط للإيقاف', 'اضغطي للإيقاف')}` : recState === 'processing' ? '…' : g('اضغط وتكلّم', 'اضغطي وتكلّمي')}
                </p>
                {canFinish && !done && recState === 'idle' && (
                  <button onClick={endConversation} className="flex items-center gap-1.5 px-5 h-11 rounded-xl text-[13px] font-extrabold font-['Tajawal'] transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#04121a', boxShadow: '0 12px 30px -12px rgba(52,211,153,0.8), inset 0 1px 0 0 rgba(255,255,255,0.35)' }}>
                    <Send size={14} /> {g('أنهِ المحادثة واعرض التقييم', 'أنهي المحادثة واعرضي التقييم')}
                  </button>
                )}
                <p className="text-[10px] font-['Tajawal'] flex items-center gap-1" style={{ color: 'rgba(248,250,252,0.32)' }}>🔒 {g('كلامك خاص ما يطّلع عليه أحد', 'كلامكِ خاص ما يطّلع عليه أحد')}</p>
              </div>
            </motion.div>
          )}

          {/* ── GRADING ── */}
          {phase === 'grading' && (
            <motion.div key="grading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 py-12 flex flex-col items-center gap-4">
              <CoachOrb size={64} speaking animate={!reduce} />
              <p className="text-sm font-bold text-white font-['Tajawal']">{g('نراجع محادثتك', 'نراجع محادثتكِ')}…</p>
              <div className="w-44 h-1.5 rounded-full cvm-shim" />
              <p className="text-xs font-['Tajawal']" style={{ color: 'rgba(248,250,252,0.45)' }}>لحظات ويجيك التقييم</p>
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {phase === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-6 py-7 space-y-5">
              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle at 32% 28%,rgba(251,191,36,0.30),rgba(245,158,11,0.10) 70%)', border: '1px solid rgba(251,191,36,0.35)', boxShadow: '0 0 40px -6px rgba(251,191,36,0.4)' }}>
                  <Trophy size={28} style={{ color: '#fcd34d' }} />
                </div>
                <h3 className="text-lg font-bold text-white font-['Tajawal']">{g('خلّصت محادثتك بالإنجليزي 🎉', 'خلّصتِ محادثتكِ بالإنجليزي 🎉')}</h3>
                {overall != null && (
                  <div className="flex items-center gap-2.5">
                    <CountUp value={overall} className="text-3xl font-bold tabular-nums" style={{ color: band.c }} suffix="/10" />
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold font-['Tajawal'] flex items-center gap-1" style={{ background: `${band.c}22`, color: band.c, border: `1px solid ${band.c}40` }}>
                      <Star size={11} fill="currentColor" /> {band.t}
                    </span>
                  </div>
                )}
              </div>

              {yourWords.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-bold font-['Tajawal'] flex items-center gap-1.5" style={{ color: '#7dd3fc' }}><Sparkles size={13} /> {g('كلامك اليوم بالإنجليزي', 'كلامكِ اليوم بالإنجليزي')}</p>
                  {yourWords.map((w, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                      className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderInlineStart: '2.5px solid rgba(56,189,248,0.5)' }}>
                      <p dir="ltr" className="text-sm font-['Inter'] leading-relaxed text-left" style={{ color: 'rgba(248,250,252,0.85)' }}>“{w}”</p>
                    </motion.div>
                  ))}
                  <p className="text-[11px] font-['Tajawal'] text-center pt-0.5" style={{ color: 'rgba(248,250,252,0.45)' }}>{g('هذا أنت تتكلم إنجليزي 🤍', 'هذي أنتِ تتكلمين إنجليزي 🤍')}</p>
                </div>
              )}

              {evaluation?.feedback_ar && (
                <p className="text-xs font-['Tajawal'] leading-relaxed text-center" style={{ color: 'rgba(248,250,252,0.7)' }}>{evaluation.feedback_ar}</p>
              )}
              <div className="flex items-center justify-center">
                <button onClick={restart} className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-xs font-bold font-['Tajawal'] transition-transform hover:-translate-y-0.5" style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.22)', color: '#67e8f9' }}>
                  <RotateCcw size={13} /> محادثة جديدة
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Living coach presence orb ──
function CoachOrb({ size = 40, speaking = false, animate = true }) {
  return (
    <div className="cvm-orb flex-shrink-0" data-speaking={speaking} data-anim={animate} style={{ width: size, height: size }}>
      <span className="cvm-orb-ring" /><span className="cvm-orb-ring d2" />
      {size >= 60 && speaking && (
        <div className="absolute inset-0 flex items-center justify-center gap-[3px]">
          {[0, 1, 2, 3].map((i) => <span key={i} className="cvm-sbar" data-on="true" style={{ height: Math.round(size * 0.28), animationDelay: `${i * 0.13}s`, background: 'rgba(255,255,255,0.85)', width: 2.5 }} />)}
        </div>
      )}
    </div>
  )
}

// ── Premium chat bubble ──
function Bubble({ message, onReplay, speaking, reduce }) {
  const g = useG()
  const isAi = message.role === 'ai'
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      {/* The surface is RTL, so the coach (the "other" party) sits on the RIGHT and
          the student on the LEFT — and each bubble's clipped tail corner must be on
          ITS OWN side. These radii are physical, so they read right-to-left. */}
      <div className="px-3.5 py-2.5" style={isAi ? {
        maxWidth: 'min(80%, 46ch)',
        background: 'linear-gradient(135deg,rgba(255,255,255,0.085),rgba(0,212,255,0.075))',
        border: '1px solid rgba(255,255,255,0.13)', backdropFilter: 'blur(10px)',
        borderRadius: '18px 18px 6px 18px',
        boxShadow: '0 1px 2px -1px rgba(0,0,0,0.20),0 8px 20px -8px rgba(0,0,0,0.28),0 16px 40px -16px rgba(56,189,248,0.22),inset 0 1px 0 0 rgba(255,255,255,0.08)',
      } : {
        maxWidth: 'min(80%, 46ch)',
        background: 'linear-gradient(135deg,rgba(0,212,255,0.24),rgba(10,126,166,0.30))',
        border: '1px solid rgba(56,189,248,0.34)', backdropFilter: 'blur(8px)',
        borderRadius: '18px 18px 18px 6px',
        boxShadow: '0 1px 2px -1px rgba(0,0,0,0.22),0 8px 20px -8px rgba(0,0,0,0.30),0 16px 40px -14px rgba(0,212,255,0.24),inset 0 1px 0 0 rgba(255,255,255,0.12)',
      }}>
        <p dir="ltr" className="text-sm font-['Inter'] leading-relaxed whitespace-pre-line text-left" style={{ color: isAi ? 'rgba(248,250,252,0.92)' : '#fff' }}>{message.text}</p>
        {isAi && message.audioUrl && (
          <button onClick={onReplay} className="mt-2 flex items-center gap-1.5 text-[10px] font-bold font-['Tajawal'] transition-colors" style={{ color: speaking ? '#7dd3fc' : 'rgba(125,211,252,0.7)' }}>
            {speaking ? (
              <span className="flex items-end gap-[2px] h-3">{[0, 1, 2].map((i) => <span key={i} className="cvm-sbar" data-on="true" style={{ height: 11, width: 2, animationDelay: `${i * 0.15}s` }} />)}</span>
            ) : <Volume2 size={12} />}
            {g('أعِد السماع', 'أعيدي السماع')}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Count-up number ──
function CountUp({ value, suffix = '', className = '', style = {} }) {
  const [n, setN] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce) { setN(value); return }
    let raf, start
    const dur = 900
    const step = (t) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / dur)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3)) * 10) / 10)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, reduce])
  return <span className={className} style={style}>{n}<span className="text-base opacity-60">{suffix}</span></span>
}
