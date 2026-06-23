// EverydayConversation — a short, voiced real-life roleplay (إنجليزي يومي). The partner speaks
// English first; the student replies by voice; gentle recasts; a warm recap (no harsh grade).
// Reuses the proven Safari-safe RecordRTC → voice-notes + invokeWithRetry pipeline, mirroring
// the curriculum ConversationMode aesthetic so it feels like a sibling surface.

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Mic, Square, Volume2, Send, RotateCcw, Sparkles, X, Lightbulb, AlertCircle, ArrowUpRight, Heart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { useG } from '../../i18n/gender'
import { safeCelebrate } from '../../lib/celebrations'

const MIN_END_TURNS = 2
const MAX_TURNS = 6

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

const STYLE = `
.eec-root{position:relative;overflow:hidden;border-radius:26px;background:linear-gradient(180deg,rgba(10,18,34,0.94),rgba(8,14,28,0.97));border:1px solid rgba(255,255,255,0.07);box-shadow:0 1px 0 0 rgba(255,255,255,0.05) inset,0 24px 60px -28px rgba(0,0,0,0.7),0 8px 28px -16px rgba(56,189,248,0.18)}
.eec-aurora{position:absolute;inset:-12%;z-index:0;pointer-events:none;transition:transform 1100ms cubic-bezier(.16,1,.3,1)}
.eec-root[data-speaking="true"] .eec-aurora{transform:scale(1.05)}
.eec-blob{position:absolute;border-radius:50%;filter:blur(58px);mix-blend-mode:screen;opacity:.5}
.eec-b1{width:46%;height:60%;left:-6%;top:-12%;background:radial-gradient(circle,rgba(56,189,248,.55),rgba(56,189,248,0) 70%);animation:eecF1 34s ease-in-out infinite alternate}
.eec-b2{width:50%;height:64%;right:-10%;top:10%;background:radial-gradient(circle,rgba(52,211,153,.42),rgba(52,211,153,0) 70%);animation:eecF2 42s ease-in-out infinite alternate}
.eec-b3{width:42%;height:50%;left:18%;bottom:-16%;background:radial-gradient(circle,rgba(251,191,36,.22),rgba(251,191,36,0) 70%);animation:eecF3 52s ease-in-out infinite alternate}
.eec-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(8,14,28,.55),rgba(8,14,28,.20) 30%,rgba(8,14,28,.30) 70%,rgba(8,14,28,.66))}
.eec-content{position:relative;z-index:2}
@keyframes eecF1{from{transform:translate(0,0)}to{transform:translate(14%,10%)}}
@keyframes eecF2{from{transform:translate(0,0)}to{transform:translate(-12%,8%)}}
@keyframes eecF3{from{transform:translate(0,0)}to{transform:translate(10%,-10%)}}
@keyframes eecBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes eecRing{0%{transform:scale(.8);opacity:.55}100%{transform:scale(1.9);opacity:0}}
@keyframes eecBar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
@keyframes eecSheen{0%{transform:translateX(-120%)}60%,100%{transform:translateX(220%)}}
@keyframes eecShim{0%{background-position:-200% 0}100%{background-position:200% 0}}
.eec-orb{position:relative;border-radius:50%;background:radial-gradient(circle at 32% 28%,#7dd3fc,#38bdf8 44%,#34d399 100%);box-shadow:0 0 0 1px rgba(255,255,255,.14) inset,0 0 0 1px rgba(255,255,255,.10),0 10px 28px -8px rgba(56,189,248,.5),0 0 44px -6px rgba(52,211,153,.4)}
.eec-orb[data-anim="true"]{animation:eecBreathe 4.5s ease-in-out infinite}
.eec-ring{position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(125,211,252,.5)}
.eec-orb[data-speaking="true"] .eec-ring{animation:eecRing 1.6s ease-out infinite}
.eec-orb[data-speaking="true"] .eec-ring.d2{animation-delay:.5s}
.eec-sbar{width:3px;border-radius:2px;background:linear-gradient(to top,#22d3ee,#34d399);transform-origin:bottom}
.eec-sbar[data-on="true"]{animation:eecBar .9s ease-in-out infinite}
.eec-cta{position:relative;overflow:hidden}
.eec-cta::after{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);transform:translateX(-120%);animation:eecSheen 4.2s ease-in-out 1.2s infinite}
.eec-mic-pulse{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(251,113,133,.45)}
.eec-mic-pulse[data-on="true"]{animation:eecRing 1.5s ease-out infinite}
.eec-mic-pulse.d2[data-on="true"]{animation-delay:.5s}
.eec-shim{background:linear-gradient(90deg,rgba(56,189,248,.06),rgba(52,211,153,.16),rgba(56,189,248,.06));background-size:200% 100%;animation:eecShim 1.8s linear infinite}
@media (prefers-reduced-motion: reduce){.eec-aurora,.eec-orb,.eec-ring,.eec-sbar,.eec-cta::after,.eec-mic-pulse,.eec-shim{animation:none!important}}
`

export default function EverydayConversation({ scenario, studentId, onClose, onCompleted }) {
  const g = useG()
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState('intro')      // intro | active | finishing | recap
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [recState, setRecState] = useState('idle')  // idle | recording | processing
  const [studentTurns, setStudentTurns] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [recap, setRecap] = useState(null)
  const [bestLine, setBestLine] = useState('')
  const [hintsOpen, setHintsOpen] = useState(false)
  const [error, setError] = useState('')
  const [bars, setBars] = useState(IDLE_BARS)
  const [speaking, setSpeaking] = useState(false)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const silentRef = useRef(null)
  const scrollRef = useRef(null)
  const analyserRef = useRef(null)
  const audioCtxRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const a = new Audio()
    a.preload = 'auto'
    a.onplaying = () => setSpeaking(true)
    a.onended = () => setSpeaking(false)
    a.onpause = () => setSpeaking(false)
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, recState])

  const playPartner = useCallback((url) => {
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
    const { data, error: err } = await invokeWithRetry('everyday-english-turn', {
      body: { action: 'start', scenario_id: scenario.id, as_student_id: studentId },
    }, { timeoutMs: 45000, retries: 1 })
    const parsed = await parseData(data)
    setRecState('idle')
    if (err || !parsed?.session_id) {
      setError('تعذّر بدء المحادثة الآن. حاول مرة ثانية بعد قليل.')
      setPhase('intro'); return
    }
    setSessionId(parsed.session_id)
    pushMessage({ role: 'ai', text: parsed.reply, audioUrl: parsed.reply_audio_url })
    playPartner(parsed.reply_audio_url)
  }, [scenario?.id, studentId, pushMessage, playPartner])

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
        if (s >= 60) stopRecording()
      }, 500)
    } catch (e) {
      setError(e?.name === 'NotAllowedError' ? 'يرجى السماح بالوصول للمايكروفون من إعدادات المتصفح' : 'تعذّر بدء التسجيل')
    }
  }, [tickBars]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const path = `${studentId}/everyday/${sessionId}/${Date.now()}.${extOf(mime)}`
      const { error: upErr } = await supabase.storage.from('voice-notes').upload(path, blob, { contentType: mime.split(';')[0], upsert: false })
      if (upErr) throw upErr
      const { data, error: err } = await invokeWithRetry('everyday-english-turn', {
        body: { action: 'turn', session_id: sessionId, audio_path: path, audio_duration_seconds: Math.round(seconds), client_turn_uuid: crypto.randomUUID() },
      }, { timeoutMs: 60000, retries: 1 })
      const parsed = await parseData(data)
      if (err || !parsed || parsed.error) throw new Error(parsed?.message || err || 'turn failed')
      if (parsed.ok === false || parsed.no_advance) {
        pushMessage({ role: 'ai', text: parsed.reply || 'ما سمعتك بوضوح — حاول مرة ثانية من فضلك.', audioUrl: parsed.reply_audio_url })
        playPartner(parsed.reply_audio_url); setRecState('idle'); return
      }
      pushMessage({ role: 'student', text: parsed.transcript })
      pushMessage({ role: 'ai', text: parsed.reply, audioUrl: parsed.reply_audio_url })
      playPartner(parsed.reply_audio_url)
      setStudentTurns(parsed.turn_count || ((s) => s + 1))
      setRecState('idle')
      if (parsed.done) { setDone(true); setTimeout(() => finishConversation(), 2200) }
    } catch (e) {
      setError('تعذّر إرسال دورك — تحقق من الاتصال وحاول مرة أخرى'); setRecState('idle')
    }
  }, [studentId, sessionId, pushMessage, playPartner]) // eslint-disable-line react-hooks/exhaustive-deps

  const finishConversation = useCallback(async () => {
    setPhase('finishing')
    const { data, error: err } = await invokeWithRetry('everyday-english-turn', { body: { action: 'finish', session_id: sessionId } }, { timeoutMs: 60000, retries: 1 })
    const parsed = await parseData(data)
    if (err || !parsed?.ok) {
      setError(parsed?.reason === 'need_more' ? 'قل جملة أو جملتين قبل الإنهاء 🙂' : 'تعذّر إنهاء المحادثة — اضغط لإعادة المحاولة')
      setPhase('active'); return
    }
    setRecap(parsed.recap); setBestLine(parsed.your_best_line || '')
    setPhase('recap')
    try { safeCelebrate('speaking_uploaded') } catch {}
    onCompleted?.()
  }, [sessionId, onCompleted])

  const reset = useCallback(() => {
    setPhase('intro'); setSessionId(null); setMessages([]); setStudentTurns(0)
    setDone(false); setRecap(null); setBestLine(''); setError(''); setRecState('idle')
  }, [])

  return (
    <div className="eec-root" data-speaking={speaking}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="eec-aurora"><span className="eec-blob eec-b1" /><span className="eec-blob eec-b2" /><span className="eec-blob eec-b3" /></div>
      <div className="eec-scrim" />

      <div className="eec-content">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <Orb size={40} speaking={speaking} animate={!reduce} />
            <div>
              <p className="text-sm font-bold text-white font-['Tajawal'] leading-none flex items-center gap-2">
                <span>{scenario?.emoji}</span> {scenario?.title_ar}
              </p>
              <p className="text-[10px] font-['Tajawal'] mt-1 transition-colors" style={{ color: speaking ? '#7dd3fc' : 'rgba(248,250,252,0.45)' }}>
                {speaking ? 'يتحدّث الآن…' : recState === 'recording' ? g('يستمع إليك…', 'يستمع إليكِ…') : 'إنجليزي يومي · واقعي'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/45 hover:text-white/80 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <X size={16} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* INTRO */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 py-8 flex flex-col items-center text-center gap-5">
              <div className="text-5xl">{scenario?.emoji || '💬'}</div>
              <div className="space-y-2.5 max-w-sm">
                <h3 className="text-xl font-bold text-white font-['Tajawal']">{scenario?.title_ar}</h3>
                {scenario?.student_role && (
                  <p className="text-sm font-['Tajawal'] leading-relaxed" style={{ color: 'rgba(248,250,252,0.65)' }}>
                    🎯 {scenario.student_role}
                  </p>
                )}
                <p className="text-xs font-['Tajawal'] leading-relaxed" style={{ color: 'rgba(248,250,252,0.5)' }}>
                  محادثة قصيرة بالإنجليزي — الطرف الثاني يبدأ بصوته وانت ترد بصوتك. {g('تقدر توقف', 'تقدرين توقفين')} في أي لحظة. كلامك خاص 🤍
                </p>
              </div>
              <button onClick={startConversation} className="eec-cta px-8 h-12 rounded-2xl text-sm font-bold font-['Tajawal'] text-white transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,#06b6d4,#10b981)', boxShadow: '0 10px 30px -8px rgba(16,185,129,0.5), inset 0 1px 0 0 rgba(255,255,255,0.2)' }}>
                {g('ابدأ المحادثة', 'ابدئي المحادثة')} →
              </button>
              {error && <p className="text-xs text-amber-400 font-['Tajawal']">{error}</p>}
            </motion.div>
          )}

          {/* ACTIVE */}
          {phase === 'active' && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="px-4 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold font-['Tajawal']" style={{ color: 'rgba(248,250,252,0.5)' }}>تقدّم المحادثة</span>
                  <span className="text-[10px] font-bold font-['Tajawal'] tabular-nums" style={{ color: studentTurns >= MIN_END_TURNS ? '#6ee7b7' : 'rgba(248,250,252,0.45)' }}>
                    {studentTurns >= MIN_END_TURNS ? `${g('تقدر تنهي', 'تقدرين تنهين')} · ${Math.min(studentTurns, MAX_TURNS)}/${MAX_TURNS}` : `${studentTurns}/${MAX_TURNS}`}
                  </span>
                </div>
                <div dir="ltr" className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div className="h-full rounded-full" animate={{ width: `${Math.min(100, (studentTurns / MAX_TURNS) * 100)}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: studentTurns >= MIN_END_TURNS ? 'linear-gradient(90deg,#22d3ee,#34d399)' : 'linear-gradient(90deg,#22d3ee,#34d399)' }} />
                  <div className="absolute top-0 bottom-0" style={{ left: `${(MIN_END_TURNS / MAX_TURNS) * 100}%`, width: 2, background: 'rgba(255,255,255,0.4)' }} />
                </div>
              </div>

              <div ref={scrollRef} className="px-4 pt-3 pb-5 space-y-3.5 overflow-y-auto" style={{ maxHeight: 340, minHeight: 170 }}>
                {messages.map((m, i) => (
                  <Bubble key={m.id} message={m} onReplay={() => playPartner(m.audioUrl)} speaking={speaking && m.role === 'ai' && i === messages.length - 1} reduce={reduce} />
                ))}
                {recState === 'processing' && (
                  <div className="flex items-center gap-2.5 pr-1">
                    <Orb size={26} speaking animate={!reduce} />
                    <div className="flex gap-1 items-end h-4">
                      {[0, 1, 2].map((i) => <span key={i} className="eec-sbar" data-on="true" style={{ height: 14, animationDelay: `${i * 0.16}s` }} />)}
                    </div>
                  </div>
                )}
              </div>

              {scenario?.useful_phrases?.length > 0 && (
                <div className="px-4 pb-1">
                  <button onClick={() => setHintsOpen((v) => !v)} className="flex items-center gap-1.5 text-[11px] font-bold font-['Tajawal'] text-amber-300/85 hover:text-amber-300">
                    <Lightbulb size={13} /> {g('محتاج مساعدة؟ عبارات مفيدة', 'محتاجة مساعدة؟ عبارات مفيدة')}
                  </button>
                  <AnimatePresence>
                    {hintsOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {scenario.useful_phrases.map((p, i) => (
                            <span key={i} dir="ltr" className="px-2.5 py-1 rounded-lg text-[11px] font-semibold font-['Inter']" style={{ background: 'rgba(251,191,36,0.09)', border: '1px solid rgba(251,191,36,0.18)', color: '#fcd34d' }}>{p}</span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {error && <p className="px-4 text-xs text-amber-400 font-['Tajawal'] flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}

              {/* mic dock */}
              <div className="px-4 py-5 flex flex-col items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {recState === 'recording' && (
                  <div className="flex items-end justify-center gap-[3px] h-9 w-full max-w-[260px]">
                    {bars.map((b, i) => <span key={i} className="eec-sbar" style={{ height: `${Math.max(4, b * 34)}px`, opacity: 0.55 + b * 0.45 }} />)}
                  </div>
                )}
                {recState === 'recording' ? (
                  <button onClick={stopRecording} className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ background: 'rgba(251,113,133,0.14)', border: '2px solid rgba(251,113,133,0.4)', color: '#fda4af', boxShadow: '0 0 36px -6px rgba(251,113,133,0.4)' }}>
                    <span className="eec-mic-pulse" data-on="true" /><span className="eec-mic-pulse d2" data-on="true" />
                    <Square size={22} fill="currentColor" />
                  </button>
                ) : (
                  <button onClick={startRecording} disabled={recState === 'processing'} className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform hover:-translate-y-0.5 disabled:opacity-40" style={{ background: 'rgba(34,211,238,0.13)', border: '1px solid rgba(34,211,238,0.32)', color: '#67e8f9', boxShadow: '0 8px 30px -8px rgba(56,189,248,0.4), inset 0 1px 0 0 rgba(255,255,255,0.1)' }}>
                    <Mic size={28} />
                  </button>
                )}
                <p className="text-[11px] font-['Tajawal'] tabular-nums" style={{ color: 'rgba(248,250,252,0.5)' }}>
                  {recState === 'recording' ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} — ${g('اضغط للإيقاف', 'اضغطي للإيقاف')}` : recState === 'processing' ? '…' : g('اضغط وتكلّم', 'اضغطي وتكلّمي')}
                </p>
                {studentTurns >= MIN_END_TURNS && !done && recState === 'idle' && (
                  <button onClick={finishConversation} className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-xs font-bold font-['Tajawal'] transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,rgba(52,211,153,0.18),rgba(56,189,248,0.14))', border: '1px solid rgba(52,211,153,0.3)', color: '#6ee7b7' }}>
                    <Send size={13} /> {g('إنهاء وعرض الملخص', 'إنهاء وعرض الملخص')}
                  </button>
                )}
                <p className="text-[10px] font-['Tajawal'] flex items-center gap-1" style={{ color: 'rgba(248,250,252,0.32)' }}>🔒 {g('كلامك خاص ما يطّلع عليه أحد', 'كلامكِ خاص ما يطّلع عليه أحد')}</p>
              </div>
            </motion.div>
          )}

          {/* FINISHING */}
          {phase === 'finishing' && (
            <motion.div key="finishing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 py-12 flex flex-col items-center gap-4">
              <Orb size={64} speaking animate={!reduce} />
              <p className="text-sm font-bold text-white font-['Tajawal']">{g('نلخّص محادثتك', 'نلخّص محادثتكِ')}…</p>
              <div className="w-44 h-1.5 rounded-full eec-shim" />
            </motion.div>
          )}

          {/* RECAP */}
          {phase === 'recap' && recap && (
            <motion.div key="recap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-6 py-7 space-y-5">
              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle at 32% 28%,rgba(52,211,153,0.30),rgba(16,185,129,0.10) 70%)', border: '1px solid rgba(52,211,153,0.35)', boxShadow: '0 0 40px -6px rgba(52,211,153,0.4)' }}>
                  <Heart size={26} style={{ color: '#6ee7b7' }} fill="currentColor" />
                </div>
                <h3 className="text-lg font-bold text-white font-['Tajawal']">{recap.headline_ar}</h3>
              </div>

              {bestLine && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderInlineStart: '2.5px solid rgba(56,189,248,0.5)' }}>
                  <p className="text-[11px] font-bold font-['Tajawal'] mb-1.5 flex items-center gap-1.5" style={{ color: '#7dd3fc' }}><Sparkles size={12} /> {g('أفضل جملة قلتها', 'أفضل جملة قلتيها')}</p>
                  <p dir="ltr" className="text-sm font-['Inter'] leading-relaxed text-left" style={{ color: 'rgba(248,250,252,0.9)' }}>“{bestLine}”</p>
                </div>
              )}

              {recap.did_well_ar && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <p className="text-[11px] font-bold font-['Tajawal'] mb-1" style={{ color: '#6ee7b7' }}>✓ {g('شي عجبني فيك', 'شي عجبني فيكِ')}</p>
                  <p className="text-xs font-['Tajawal'] leading-relaxed" style={{ color: 'rgba(248,250,252,0.78)' }}>{recap.did_well_ar}</p>
                </div>
              )}

              {recap.upgrade?.you_said && recap.upgrade?.nicer && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <p className="text-[11px] font-bold font-['Tajawal'] mb-2 flex items-center gap-1.5" style={{ color: '#7dd3fc' }}><ArrowUpRight size={13} /> {g('ترقية بسيطة', 'ترقية بسيطة')}</p>
                  <p dir="ltr" className="text-[13px] font-['Inter'] text-left line-through" style={{ color: 'rgba(248,250,252,0.5)' }}>{recap.upgrade.you_said}</p>
                  <p dir="ltr" className="text-sm font-['Inter'] text-left font-semibold mt-1" style={{ color: '#a7f3d0' }}>{recap.upgrade.nicer}</p>
                </div>
              )}

              {recap.tip_ar && (
                <p className="text-xs font-['Tajawal'] leading-relaxed text-center flex items-start gap-1.5 justify-center" style={{ color: 'rgba(248,250,252,0.6)' }}>
                  <Lightbulb size={13} className="mt-0.5 text-amber-300 flex-shrink-0" /> {recap.tip_ar}
                </p>
              )}

              <div className="flex items-center justify-center gap-2.5 pt-1">
                <button onClick={reset} className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-xs font-bold font-['Tajawal'] transition-transform hover:-translate-y-0.5" style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.22)', color: '#67e8f9' }}>
                  <RotateCcw size={13} /> {g('مرة ثانية', 'مرة ثانية')}
                </button>
                <button onClick={onClose} className="px-5 h-10 rounded-xl text-xs font-bold font-['Tajawal'] transition-transform hover:-translate-y-0.5 text-white" style={{ background: 'linear-gradient(135deg,#06b6d4,#10b981)', boxShadow: '0 8px 24px -8px rgba(16,185,129,0.5)' }}>
                  {g('تم', 'تم')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Orb({ size = 40, speaking = false, animate = true }) {
  return (
    <div className="eec-orb flex-shrink-0" data-speaking={speaking} data-anim={animate} style={{ width: size, height: size }}>
      <span className="eec-ring" /><span className="eec-ring d2" />
      {size >= 60 && speaking && (
        <div className="absolute inset-0 flex items-center justify-center gap-[3px]">
          {[0, 1, 2, 3].map((i) => <span key={i} className="eec-sbar" data-on="true" style={{ height: Math.round(size * 0.28), animationDelay: `${i * 0.13}s`, background: 'rgba(255,255,255,0.85)', width: 2.5 }} />)}
        </div>
      )}
    </div>
  )
}

function Bubble({ message, onReplay, speaking, reduce }) {
  const isAi = message.role === 'ai'
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[80%] px-3.5 py-2.5" style={isAi ? {
        background: 'linear-gradient(135deg,rgba(34,211,238,0.12),rgba(52,211,153,0.07))',
        border: '1px solid rgba(56,189,248,0.20)', backdropFilter: 'blur(10px)', borderRadius: '18px 18px 18px 6px',
        boxShadow: '0 1px 2px -1px rgba(0,0,0,0.20),0 8px 20px -8px rgba(0,0,0,0.28),inset 0 1px 0 0 rgba(255,255,255,0.08)',
      } : {
        background: 'linear-gradient(135deg,rgba(56,189,248,0.22),rgba(16,185,129,0.18))',
        border: '1px solid rgba(56,189,248,0.34)', backdropFilter: 'blur(8px)', borderRadius: '18px 18px 6px 18px',
        boxShadow: '0 1px 2px -1px rgba(0,0,0,0.22),0 8px 20px -8px rgba(0,0,0,0.30),inset 0 1px 0 0 rgba(255,255,255,0.12)',
      }}>
        <p dir="ltr" className={`text-sm font-['Inter'] leading-relaxed whitespace-pre-line ${isAi ? 'text-left' : 'text-right'}`} style={{ color: isAi ? 'rgba(248,250,252,0.92)' : '#fff' }}>{message.text}</p>
        {isAi && message.audioUrl && (
          <button onClick={onReplay} className="mt-2 flex items-center gap-1.5 text-[10px] font-bold font-['Tajawal'] transition-colors" style={{ color: speaking ? '#7dd3fc' : 'rgba(125,211,252,0.7)' }}>
            {speaking ? (
              <span className="flex items-end gap-[2px] h-3">{[0, 1, 2].map((i) => <span key={i} className="eec-sbar" data-on="true" style={{ height: 11, width: 2, animationDelay: `${i * 0.15}s` }} />)}</span>
            ) : <Volume2 size={12} />}
            أعد السماع
          </button>
        )}
      </div>
    </motion.div>
  )
}
