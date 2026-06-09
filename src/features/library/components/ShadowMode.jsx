// Shadowing ("ردّدي بصوتك") — the audiobook becomes a speaking gym. For each sentence:
// hear the narrator's slice (seek the chapter audio t0→t1), then read it aloud; Whisper
// scores it against the line. A نطق score per chapter that climbs across the book.
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Volume2, Mic, Square, ChevronLeft, ChevronRight } from 'lucide-react'
import { invokeWithRetry } from '../../../lib/invokeWithRetry'

const pickMime = () => {
  const cands = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
  for (const m of cands) { try { if (window.MediaRecorder?.isTypeSupported(m)) return m } catch (e) { /* ignore */ } }
  return ''
}
const toB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(blob) })

export default function ShadowMode({ sentences, audioUrl, chapterId, bookId, myId, onClose }) {
  const qc = useQueryClient()
  const audioRef = useRef(null)
  const stopAtRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState('idle')   // idle | playing | recording | scoring | done
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const cur = sentences[i]

  useEffect(() => () => { // cleanup on unmount
    try { recRef.current?.state === 'recording' && recRef.current.stop() } catch (e) { /* ignore */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch (e) { /* ignore */ }
    try { audioRef.current?.pause() } catch (e) { /* ignore */ }
  }, [])
  useEffect(() => { setResult(null); setErr(null); setPhase('idle') }, [i])

  const playSlice = async () => {
    const a = audioRef.current; if (!a || !cur) return
    stopAtRef.current = cur.t1
    try { a.currentTime = cur.t0 / 1000 } catch (e) { /* ignore */ }
    setPhase('playing')
    a.play().catch(() => setPhase('idle'))
  }
  const onTime = () => {
    const a = audioRef.current
    if (a && stopAtRef.current != null && a.currentTime * 1000 >= stopAtRef.current) { a.pause(); stopAtRef.current = null; setPhase('idle') }
  }

  const startRec = async () => {
    setErr(null); setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data) }
      rec.onstop = () => score(new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/webm' }))
      recRef.current = rec
      rec.start()
      setPhase('recording')
    } catch (e) { setErr('تعذّر الوصول للميكروفون — تأكدي من الإذن'); setPhase('idle') }
  }
  const stopRec = () => {
    try { recRef.current?.stop() } catch (e) { /* ignore */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch (e) { /* ignore */ }
  }
  const score = async (blob) => {
    setPhase('scoring')
    try {
      const audio_base64 = await toB64(blob)
      const { data, error } = await invokeWithRetry('library-shadow-score', {
        body: { audio_base64, mime: blob.type, target_text: cur.en, p: cur.p, s: cur.s, chapter_id: chapterId, book_id: bookId },
      }, { timeoutMs: 45000 })
      if (error || data?.error) throw new Error(data?.error || 'فشل التقييم')
      setResult(data); setPhase('done')
      qc.invalidateQueries({ queryKey: ['lib-shadow', chapterId, myId] })
    } catch (e) { setErr('تعذّر التقييم، حاولي مرة أخرى'); setPhase('idle') }
  }

  const next = () => { if (i < sentences.length - 1) setI(i + 1) }
  const prev = () => { if (i > 0) setI(i - 1) }

  return (
    <div className="lib-shadow" dir="rtl">
      <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" playsInline onTimeUpdate={onTime} />
      <div className="lib-shadow-top">
        <button className="lib-shadow-x" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        <div className="lib-shadow-title">ردّدي بصوتك</div>
        <div className="lib-shadow-count">{i + 1} / {sentences.length}</div>
      </div>

      <div className="lib-shadow-card">
        <p className="lib-shadow-sentence" dir="ltr">{cur?.en}</p>

        {result && (
          <div className="lib-shadow-result" data-band={result.score >= 75 ? 'good' : result.score >= 55 ? 'ok' : 'low'}>
            <div className="lib-shadow-score">{result.score}<i>٪</i></div>
            <div className="lib-shadow-fb">{result.feedback_ar}</div>
            {result.missed_words?.length > 0 && (
              <div className="lib-shadow-missed">ركّزي على: {result.missed_words.map((w) => <span key={w}>{w}</span>)}</div>
            )}
          </div>
        )}
        {err && <div className="lib-shadow-err">{err}</div>}

        <div className="lib-shadow-actions">
          <button className="lib-shadow-listen" onClick={playSlice} disabled={phase === 'recording' || phase === 'scoring' || !audioUrl}>
            <Volume2 size={17} /> استمعي
          </button>
          {phase === 'recording' ? (
            <button className="lib-shadow-rec on" onClick={stopRec}><Square size={16} /> أوقفي</button>
          ) : (
            <button className="lib-shadow-rec" onClick={startRec} disabled={phase === 'scoring' || phase === 'playing'}>
              <Mic size={17} /> {phase === 'scoring' ? 'جارٍ التقييم…' : result ? 'أعيدي' : 'ردّدي'}
            </button>
          )}
        </div>
      </div>

      <div className="lib-shadow-nav">
        <button onClick={prev} disabled={i === 0}><ChevronRight size={16} /> السابقة</button>
        <button onClick={next} disabled={i >= sentences.length - 1}>التالية <ChevronLeft size={16} /></button>
      </div>
    </div>
  )
}
