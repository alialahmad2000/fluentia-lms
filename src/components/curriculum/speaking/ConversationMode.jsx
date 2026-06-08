// ConversationMode — a back-and-forth SPOKEN conversation with an AI coach about the unit's
// speaking topic. The coach speaks first (voiced), the student replies by voice, the coach
// recasts gently and keeps the conversation going, then the whole conversation is graded and
// the unit's speaking section is marked complete (a summary speaking_recordings row is written
// server-side). This is the DEFAULT speaking surface; classic record-once stays one tap away.
//
// Reuses the project's Safari-safe RecordRTC pipeline (audio/mp4 on Safari) + voice-notes
// bucket + invokeWithRetry. Backend: edge fns speaking-conversation-turn / -grade.

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2, Volume2, Sparkles, Send, RotateCcw, Trophy, ChevronLeft, Lightbulb, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { invokeWithRetry } from '../../../lib/invokeWithRetry'
import { useG } from '../../../i18n/gender'
import { safeCelebrate } from '../../../lib/celebrations'

const MIN_END_TURNS = 3   // student may end the conversation after this many of their turns

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

// supabase.functions.invoke returns parsed JSON, but be defensive (Blob/string seen in the wild)
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

export default function ConversationMode({ topic, studentId, unitId, questionIndex = 0, onComplete, onSwitchToClassic }) {
  const g = useG()
  const [phase, setPhase] = useState('intro')          // intro | active | grading | result
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])          // { id, role, text, audioUrl }
  const [recState, setRecState] = useState('idle')      // idle | recording | processing
  const [studentTurns, setStudentTurns] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [yourWords, setYourWords] = useState([])
  const [hintsOpen, setHintsOpen] = useState(false)
  const [error, setError] = useState('')

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const silentRef = useRef(null)
  const scrollRef = useRef(null)
  const maxTurnSec = topic?.max_duration_seconds ? Math.min(120, Math.max(45, topic.max_duration_seconds)) : 90

  // single <audio> element for the coach's voice
  useEffect(() => {
    const a = new Audio()
    a.preload = 'auto'
    audioRef.current = a
    return () => {
      try { a.pause() } catch {}
      clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (silentRef.current) URL.revokeObjectURL(silentRef.current)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, recState])

  const playCoach = useCallback((url) => {
    if (!url || !audioRef.current) return
    try { audioRef.current.pause() } catch {}
    audioRef.current.src = url
    audioRef.current.play().catch(() => { /* autoplay blocked — replay button is the fallback */ })
  }, [])

  const pushMessage = useCallback((m) => setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...m }]), [])

  // ── Start the conversation ──
  const startConversation = useCallback(async () => {
    setError('')
    // iOS audio unlock — must happen inside this tap
    try {
      silentRef.current = silentWavUrl()
      audioRef.current.src = silentRef.current
      audioRef.current.play().then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0 }).catch(() => {})
    } catch {}

    setPhase('active')
    setRecState('processing')
    const { data, error: err } = await invokeWithRetry('speaking-conversation-turn', {
      body: { action: 'start', unit_id: unitId, speaking_id: topic?.id, question_index: questionIndex },
    }, { timeoutMs: 45000, retries: 1 })
    const parsed = await parseData(data)
    setRecState('idle')
    if (err || !parsed?.conversation_id) {
      setError('تعذّر بدء المحادثة الآن. تقدرين تجربين التسجيل الكلاسيكي بدلاً من ذلك.')
      setPhase('intro')
      return
    }
    setConversationId(parsed.conversation_id)
    pushMessage({ role: 'ai', text: parsed.reply, audioUrl: parsed.reply_audio_url })
    playCoach(parsed.reply_audio_url)
  }, [unitId, topic?.id, questionIndex, pushMessage, playCoach])

  // ── Recording ──
  const startRecording = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })
      streamRef.current = stream
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
  }, [maxTurnSec])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
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
      const ext = extOf(mime)
      const path = `${studentId}/conv/${conversationId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('voice-notes').upload(path, blob, { contentType: mime.split(';')[0], upsert: false })
      if (upErr) throw upErr
      const { data, error: err } = await invokeWithRetry('speaking-conversation-turn', {
        body: { action: 'turn', conversation_id: conversationId, audio_path: path, audio_duration_seconds: Math.round(seconds), client_turn_uuid: crypto.randomUUID() },
      }, { timeoutMs: 60000, retries: 1 })
      const parsed = await parseData(data)
      if (err || !parsed || parsed.error) throw new Error(parsed?.message || err || 'turn failed')

      if (parsed.ok === false || parsed.no_advance) {
        // transcription failed or empty — gentle nudge, no student bubble
        pushMessage({ role: 'ai', text: parsed.reply || 'ما سمعتك بوضوح — حاولي مرة ثانية من فضلك.', audioUrl: parsed.reply_audio_url })
        playCoach(parsed.reply_audio_url)
        setRecState('idle')
        return
      }

      pushMessage({ role: 'student', text: parsed.transcript })
      pushMessage({ role: 'ai', text: parsed.reply, audioUrl: parsed.reply_audio_url })
      playCoach(parsed.reply_audio_url)
      setStudentTurns(parsed.turn_count || ((s) => s + 1))
      setRecState('idle')
      if (parsed.done) { setDone(true); setTimeout(() => endConversation(), 2200) }
    } catch (e) {
      setError('تعذّر إرسال دورك — تحققي من الاتصال وحاولي مرة أخرى')
      setRecState('idle')
    }
  }, [studentId, conversationId, pushMessage, playCoach]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── End + grade ──
  const endConversation = useCallback(async () => {
    setPhase('grading')
    const { data, error: err } = await invokeWithRetry('speaking-conversation-grade', { body: { conversation_id: conversationId } }, { timeoutMs: 90000, retries: 1 })
    const parsed = await parseData(data)
    if (err || !parsed?.ok) {
      if (parsed?.reason === 'need_more') {
        setError('تحتاجين لتبادل بضع جُمل قبل إنهاء المحادثة')
        setPhase('active')
        return
      }
      setError('تعذّر حفظ تقييم المحادثة — اضغطي لإعادة المحاولة')
      setPhase('active')
      return
    }
    setEvaluation(parsed.evaluation)
    setYourWords(parsed.your_words || [])
    setPhase('result')
    try { safeCelebrate('speaking_uploaded') } catch {}
    onComplete?.()
  }, [conversationId, onComplete])

  const restart = useCallback(() => {
    setPhase('intro'); setConversationId(null); setMessages([]); setStudentTurns(0)
    setDone(false); setEvaluation(null); setYourWords([]); setError(''); setRecState('idle')
  }, [])

  // ─────────────────────────────────────────── RENDER ───
  const overall = evaluation?.overall_score
  const band = overall >= 8 ? { c: '#22c55e', t: g('ممتاز', 'ممتازة') } : overall >= 6 ? { c: '#38bdf8', t: g('أداء حلو', 'أداؤكِ حلو') } : overall >= 4 ? { c: '#f59e0b', t: g('بداية طيبة', 'بدايةٌ طيبة') } : { c: '#a855f7', t: g('خطوة أولى رائعة', 'خطوةٌ أولى رائعة') }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(56,189,248,0.03)', border: '1px solid rgba(56,189,248,0.14)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/12 flex items-center justify-center"><Sparkles size={15} className="text-cyan-400" /></div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] leading-none">محادثة مع المدرّبة</p>
            <p className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] mt-1">تدرّبي على التحدّث بالإنجليزي · خاص بكِ، ما أحد يسمع</p>
          </div>
        </div>
        {onSwitchToClassic && (
          <button onClick={onSwitchToClassic} className="flex items-center gap-1 text-[11px] font-bold font-['Tajawal'] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            🎙 {g('تسجيل عادي', 'تسجيل عادي')} <ChevronLeft size={13} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-cyan-500/12 flex items-center justify-center"><Volume2 size={28} className="text-cyan-400" /></div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">{g('جاهز لمحادثة قصيرة؟', 'جاهزة لمحادثة قصيرة؟')}</h3>
              <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] mt-2 leading-relaxed max-w-sm">
                دردشة بسيطة بالإنجليزي حول الموضوع. المدرّبة بتبدأ، وانتِ تردّين بصوتك. {g('تقدر توقف', 'تقدرين توقفين')} في أي لحظة، وكلامك خاص — ما أحد يسمعه غيرك. 🤍
              </p>
            </div>
            <button onClick={startConversation} className="px-7 h-12 rounded-2xl text-sm font-bold font-['Tajawal'] text-white transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', boxShadow: '0 6px 20px -6px rgba(56,189,248,0.5)' }}>
              {g('نبدأ بهدوء', 'نبدأ بهدوء')} →
            </button>
            {onSwitchToClassic && (
              <button onClick={onSwitchToClassic} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-['Tajawal'] underline underline-offset-4">
                {g('أو سجّل مرة وحدة زي قبل', 'أو سجّلي مرة وحدة زي قبل')}
              </button>
            )}
            {error && <p className="text-xs text-amber-400 font-['Tajawal']">{error}</p>}
          </motion.div>
        )}

        {/* ── ACTIVE ── */}
        {phase === 'active' && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* chat stream */}
            <div ref={scrollRef} className="px-4 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 360 }}>
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} onReplay={() => playCoach(m.audioUrl)} />
              ))}
              {recState === 'processing' && (
                <div className="flex items-center gap-2 text-cyan-400 pr-2">
                  <Loader2 size={15} className="animate-spin" />
                  <span className="text-xs font-['Tajawal']">{messages.length ? 'لحظة...' : 'جاري التحضير...'}</span>
                </div>
              )}
            </div>

            {/* hint chips */}
            {topic?.useful_phrases?.length > 0 && (
              <div className="px-4 pb-1">
                <button onClick={() => setHintsOpen((v) => !v)} className="flex items-center gap-1.5 text-[11px] font-bold font-['Tajawal'] text-amber-400/90">
                  <Lightbulb size={13} /> {g('محتاج مساعدة؟ عبارات مفيدة', 'محتاجة مساعدة؟ عبارات مفيدة')}
                </button>
                <AnimatePresence>
                  {hintsOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {topic.useful_phrases.map((p, i) => (
                          <span key={i} dir="ltr" className="px-2.5 py-1 rounded-lg text-[11px] font-semibold font-['Inter'] bg-amber-500/10 text-amber-300/90">{p}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {error && <p className="px-4 text-xs text-amber-400 font-['Tajawal'] flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}

            {/* mic dock */}
            <div className="px-4 py-4 flex flex-col items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {recState === 'recording' ? (
                <button onClick={stopRecording} className="relative w-16 h-16 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center border-2 border-red-500/30">
                  <span className="absolute inset-[-6px] rounded-full border-2 border-red-500/30 animate-ping" style={{ animationDuration: '1.4s' }} />
                  <Square size={20} fill="currentColor" />
                </button>
              ) : (
                <button onClick={startRecording} disabled={recState === 'processing'} className="w-16 h-16 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/25 hover:bg-cyan-500/25 transition-colors disabled:opacity-40">
                  <Mic size={26} />
                </button>
              )}
              <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal'] tabular-nums">
                {recState === 'recording' ? `${g('أسمعك', 'أسمعكِ')}... ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} — اضغط للإيقاف` : recState === 'processing' ? '...' : g('اضغط وتكلّم', 'اضغطي وتكلّمي')}
              </p>
              {studentTurns >= MIN_END_TURNS && !done && recState === 'idle' && (
                <button onClick={endConversation} className="mt-1 flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold font-['Tajawal'] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors">
                  <Send size={13} /> {g('إنهاء المحادثة وعرض التقييم', 'إنهاء المحادثة وعرض التقييم')}
                </button>
              )}
              <p className="text-[10px] text-[var(--text-muted)]/70 font-['Tajawal']">🔒 {g('كلامك خاص ما يطّلع عليه أحد', 'كلامكِ خاص ما يطّلع عليه أحد')}</p>
            </div>
          </motion.div>
        )}

        {/* ── GRADING ── */}
        {phase === 'grading' && (
          <motion.div key="grading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-10 flex flex-col items-center gap-3">
            <Loader2 size={30} className="text-cyan-400 animate-spin" />
            <p className="text-sm font-bold text-cyan-400 font-['Tajawal']">{g('نراجع محادثتك', 'نراجع محادثتكِ')}...</p>
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">لحظات ويجيك التقييم</p>
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {phase === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}><Trophy size={26} className="text-emerald-400" /></div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">{g('خلّصت محادثتك بالإنجليزي 🎉', 'خلّصتِ محادثتكِ بالإنجليزي 🎉')}</h3>
              {overall != null && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: band.c }}>{overall}<span className="text-sm opacity-60">/10</span></span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-['Tajawal']" style={{ background: `${band.c}1f`, color: band.c }}>{band.t}</span>
                </div>
              )}
            </div>

            {/* Your words — the trophy */}
            {yourWords.length > 0 && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold text-cyan-400 font-['Tajawal']">✨ {g('كلامك اليوم بالإنجليزي', 'كلامكِ اليوم بالإنجليزي')}</p>
                <div className="space-y-1.5">
                  {yourWords.map((w, i) => (
                    <p key={i} dir="ltr" className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed flex items-start gap-2">
                      <span className="text-cyan-400/60 mt-0.5">•</span> {w}
                    </p>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal'] pt-1">{g('هذا أنت تتكلم إنجليزي 🤍', 'هذي أنتِ تتكلمين إنجليزي 🤍')}</p>
              </div>
            )}

            {evaluation?.feedback_ar && (
              <p className="text-xs text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed text-center">{evaluation.feedback_ar}</p>
            )}
            <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal'] text-center">التقييم المفصّل في الأسفل ⬇</p>

            <div className="flex items-center justify-center gap-2">
              <button onClick={restart} className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-xs font-bold font-['Tajawal'] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 transition-colors">
                <RotateCcw size={13} /> {g('محادثة جديدة', 'محادثة جديدة')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Chat bubble ──
function MessageBubble({ message, onReplay }) {
  const isAi = message.role === 'ai'
  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${isAi ? '' : 'text-right'}`} style={{
        background: isAi ? 'rgba(56,189,248,0.08)' : 'rgba(168,85,247,0.10)',
        border: `1px solid ${isAi ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.18)'}`,
        borderBottomLeftRadius: isAi ? 4 : 16, borderBottomRightRadius: isAi ? 16 : 4,
      }}>
        <p dir="ltr" className={`text-sm font-['Inter'] leading-relaxed whitespace-pre-line ${isAi ? 'text-left text-[var(--text-secondary)]' : 'text-right text-[var(--text-primary)]'}`}>{message.text}</p>
        {isAi && message.audioUrl && (
          <button onClick={onReplay} className="mt-1.5 flex items-center gap-1 text-[10px] font-bold font-['Tajawal'] text-cyan-400/80 hover:text-cyan-300">
            <Volume2 size={12} /> أعيدي السماع
          </button>
        )}
      </div>
    </div>
  )
}
