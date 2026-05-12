import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Send, Trash2, Lock } from 'lucide-react'
import { useUploadVoice } from '../mutations/useUploadVoice'

const SAMPLE_INTERVAL_MS = 50
const MAX_BARS = 60
const MAX_DURATION_SEC = 5 * 60
const MIN_DURATION_SEC = 0.5

function pickMimeType() {
  const types = [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

function decodePeaks(blob) {
  return new Promise((resolve) => {
    blob.arrayBuffer().then((buf) => {
      const audioCtx = new AudioContext()
      audioCtx.decodeAudioData(buf, (decoded) => {
        audioCtx.close()
        const raw = decoded.getChannelData(0)
        const chunkSize = Math.floor(raw.length / MAX_BARS)
        const peaks = []
        for (let i = 0; i < MAX_BARS; i++) {
          let max = 0
          const start = i * chunkSize
          for (let j = start; j < start + chunkSize; j++) {
            const abs = Math.abs(raw[j] ?? 0)
            if (abs > max) max = abs
          }
          peaks.push(Math.min(1, max * 2))
        }
        resolve(peaks)
      }, () => resolve([]))
    }).catch(() => resolve([]))
  })
}

function formatSec(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

export default function VoiceRecorder({ channelId, groupId, onDone }) {
  const [phase, setPhase] = useState('idle') // idle | recording | preview | uploading
  const [elapsed, setElapsed] = useState(0)
  const [locked, setLocked] = useState(false)
  const [bars, setBars] = useState([])
  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewPeaks, setPreviewPeaks] = useState([])

  const mediaRef = useRef(null)
  const analyserRef = useRef(null)
  const samplerRef = useRef(null)
  const tickerRef = useRef(null)
  const chunksRef = useRef([])
  const barsRef = useRef([])
  const startTimeRef = useRef(0)
  const audioCtxRef = useRef(null)

  const upload = useUploadVoice(channelId, groupId)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})

      // Analyser for live waveform
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const src = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyserRef.current = analyser

      const dataArr = new Uint8Array(analyser.frequencyBinCount)
      barsRef.current = []
      samplerRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(dataArr)
        let sum = 0
        for (const v of dataArr) sum += Math.abs(v - 128)
        const amp = Math.min(1, (sum / dataArr.length) / 40)
        barsRef.current = [...barsRef.current.slice(-(MAX_BARS - 1)), amp]
        setBars([...barsRef.current])
      }, SAMPLE_INTERVAL_MS)

      chunksRef.current = []
      mr.addEventListener('dataavailable', (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) })
      mr.addEventListener('stop', async () => {
        clearInterval(samplerRef.current)
        clearInterval(tickerRef.current)
        stream.getTracks().forEach((t) => t.stop())
        audioCtxRef.current?.close()

        const dur = (Date.now() - startTimeRef.current) / 1000
        if (dur < MIN_DURATION_SEC) {
          setPhase('idle')
          return
        }

        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const peaks = await decodePeaks(blob)
        setPreviewBlob(blob)
        setPreviewPeaks(peaks)
        setPhase('preview')
      })

      mr.start(200)
      mediaRef.current = mr
      startTimeRef.current = Date.now()
      setElapsed(0)
      setPhase('recording')

      tickerRef.current = setInterval(() => {
        const sec = (Date.now() - startTimeRef.current) / 1000
        setElapsed(sec)
        if (sec >= MAX_DURATION_SEC) stopRecording()
      }, 200)
    } catch {
      alert('لم نستطع الوصول لميكروفونك. تأكدي من منح الإذن.')
      setPhase('idle')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop()
    }
    clearInterval(samplerRef.current)
    clearInterval(tickerRef.current)
    audioCtxRef.current?.close()
    setPhase('idle')
    setElapsed(0)
    setBars([])
    setLocked(false)
  }, [])

  const sendVoice = useCallback(async () => {
    if (!previewBlob) return
    setPhase('uploading')
    try {
      await upload.mutateAsync({
        blob: previewBlob,
        durationMs: Math.round(elapsed * 1000),
        waveform: previewPeaks,
      })
      setPhase('idle')
      setPreviewBlob(null)
      setPreviewPeaks([])
      onDone?.()
    } catch {
      setPhase('preview')
    }
  }, [previewBlob, elapsed, previewPeaks, upload, onDone])

  useEffect(() => {
    return () => {
      clearInterval(samplerRef.current)
      clearInterval(tickerRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  if (phase === 'idle') {
    return (
      <button
        onMouseDown={startRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording() }}
        className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        style={{ minWidth: 36, minHeight: 36 }}
        title="تسجيل رسالة صوتية"
      >
        <Mic size={18} />
      </button>
    )
  }

  if (phase === 'recording') {
    return (
      <div
        className="flex items-center gap-2 flex-1 px-3 py-2 bg-red-500/10 rounded-xl border border-red-500/20"
        style={{ direction: 'rtl' }}
      >
        {/* Waveform bars */}
        <div className="flex-1 flex items-center gap-px h-8 overflow-hidden">
          {bars.map((amp, i) => (
            <div
              key={i}
              style={{ width: 2, height: `${Math.max(3, amp * 28)}px`, borderRadius: 2, background: '#ef4444', transition: 'height 0.05s' }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-red-400 font-mono tabular-nums">{formatSec(elapsed)}</span>
          {elapsed >= 270 && (
            <span className="text-[10px] text-amber-400 animate-pulse">30 ث</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!locked && (
            <button onClick={() => setLocked(true)} className="p-1.5 text-[var(--text-muted)] hover:text-sky-400 rounded" title="قفل">
              <Lock size={14} />
            </button>
          )}
          <button onClick={cancelRecording} className="p-1.5 text-[var(--text-muted)] hover:text-red-400 rounded" title="إلغاء">
            <Trash2 size={14} />
          </button>
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors"
            style={{ minWidth: 36, minHeight: 36 }}
            title="إيقاف وإرسال"
          >
            <Square size={14} />
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'preview') {
    return (
      <div
        className="flex items-center gap-2 flex-1 px-3 py-2 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
        style={{ direction: 'rtl' }}
      >
        <div className="flex-1 flex items-center gap-px h-8">
          {previewPeaks.map((amp, i) => (
            <div key={i} style={{ width: 2, height: `${Math.max(3, amp * 28)}px`, borderRadius: 2, background: 'var(--border)' }} />
          ))}
        </div>
        <span className="text-xs text-[var(--text-muted)] font-mono">{formatSec(elapsed)}</span>

        <button onClick={cancelRecording} className="p-1.5 text-[var(--text-muted)] hover:text-red-400 rounded">
          <Trash2 size={14} />
        </button>
        <button
          onClick={sendVoice}
          className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-400 transition-colors"
          style={{ minWidth: 36, minHeight: 36 }}
        >
          <Send size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center py-2 text-xs text-[var(--text-muted)]" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      <span className="animate-pulse">يتم الإرسال...</span>
    </div>
  )
}
