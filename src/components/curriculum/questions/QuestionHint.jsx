import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Volume2, Square } from 'lucide-react'
import { trackEvent } from '../../../lib/trackEvent'

// Per-section accent so the hint chrome matches its host card
// (listening = violet, reading = sky). Highlighted answer is always emerald —
// one consistent "this is the answer" color across the platform.
const ACCENTS = {
  violet: { text: '#c084fc', border: 'rgba(168,85,247,0.35)', bg: 'rgba(168,85,247,0.10)', soft: 'rgba(168,85,247,0.06)' },
  sky:    { text: '#7dd3fc', border: 'rgba(56,189,248,0.35)', bg: 'rgba(56,189,248,0.10)', soft: 'rgba(56,189,248,0.06)' },
}

const normalize = (s) => (s || '')
  .toLowerCase()
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')

// Split the quote around the answer phrase (case/quote-style-insensitive) so the
// answer renders highlighted. Falls back to no highlight when not found.
function splitQuote(quote, phrase) {
  if (!quote) return null
  const clean = quote.replace(/\*/g, '')
  if (!phrase) return { before: clean, match: '', after: '' }
  const cleanPhrase = phrase.replace(/\*/g, '')
  const idx = normalize(clean).indexOf(normalize(cleanPhrase))
  if (idx < 0) return { before: clean, match: '', after: '' }
  return {
    before: clean.slice(0, idx),
    match: clean.slice(idx, idx + cleanPhrase.length),
    after: clean.slice(idx + cleanPhrase.length),
  }
}

/**
 * QuestionHint — «تلميح» reveal beside a comprehension question.
 * Shows the exact transcript/passage excerpt that answers the question with the
 * answer phrase highlighted, and (listening only, when timing exists) replays
 * just that segment of the audio.
 *
 * hint shape: { quote, answer_phrase, start_ms?, end_ms?, paragraph_index? }
 */
export default function QuestionHint({ hint, audioUrl, accent = 'sky', kind = 'reading', contentId, questionKey }) {
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  // DOM-ATTACHED <audio> (rendered below) — a detached `new Audio()` gets
  // garbage-collected mid-playback on iPad Safari (see the 6f89446 lesson).
  const audioRef = useRef(null)
  const stopTimerRef = useRef(null)
  const trackedRef = useRef(false)

  const colors = ACCENTS[accent] || ACCENTS.sky
  const parts = useMemo(() => splitQuote(hint?.quote, hint?.answer_phrase), [hint])
  const canReplay = kind === 'listening' && !!audioUrl
    && Number.isFinite(hint?.start_ms) && Number.isFinite(hint?.end_ms) && hint.end_ms > hint.start_ms

  const stopReplay = useCallback(() => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null }
    const el = audioRef.current
    if (el) { try { el.pause() } catch { /* noop */ } }
    setPlaying(false)
  }, [])

  useEffect(() => () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    const el = audioRef.current
    if (el) { try { el.pause() } catch { /* noop */ } }
  }, [])

  if (!hint?.quote) return null

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (!next) stopReplay()
    if (next && !trackedRef.current) {
      trackedRef.current = true
      trackEvent('question_hint_opened', { kind, content_id: contentId, question: questionKey })
    }
  }

  const handleReplay = () => {
    if (playing) { stopReplay(); return }
    const el = audioRef.current
    if (!el) return
    const PAD = 350
    const startSec = Math.max(0, (hint.start_ms - PAD) / 1000)
    const stopSec = (hint.end_ms + PAD) / 1000

    const begin = () => {
      el.currentTime = startSec
      // play() is called synchronously inside the tap's async chain — iOS honors it
      el.play().then(() => {
        setPlaying(true)
        const onTimeUpdate = () => {
          if (el.currentTime >= stopSec) {
            el.removeEventListener('timeupdate', onTimeUpdate)
            stopReplay()
          }
        }
        el.addEventListener('timeupdate', onTimeUpdate)
        el.addEventListener('ended', () => stopReplay(), { once: true })
        // safety net in case timeupdate stalls
        stopTimerRef.current = setTimeout(() => {
          el.removeEventListener('timeupdate', onTimeUpdate)
          stopReplay()
        }, (stopSec - startSec) * 1000 + 1500)
      }).catch(() => setPlaying(false))
    }

    if (!el.src) el.src = audioUrl
    if (el.readyState >= 1) {
      begin()
    } else {
      el.addEventListener('loadedmetadata', begin, { once: true })
      el.addEventListener('error', () => setPlaying(false), { once: true })
      try { el.load() } catch { setPlaying(false) }
    }
    trackEvent('question_hint_replay', { content_id: contentId, question: questionKey })
  }

  return (
    <div dir="rtl">
      {canReplay && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} preload="none" playsInline style={{ display: 'none' }} />
      )}
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-full text-xs font-bold font-['Tajawal'] transition-all duration-200 active:scale-95"
        style={{
          color: open ? colors.text : 'var(--text-muted)',
          background: open ? colors.bg : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? colors.border : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        <Lightbulb size={13} className={open ? '' : 'opacity-70'} style={open ? { color: colors.text } : undefined} />
        {open ? 'إخفاء التلميح' : 'تلميح'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className="mt-2.5 rounded-xl p-4 space-y-3"
              style={{ background: colors.soft, border: `1px solid ${colors.border}` }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-bold font-['Tajawal']" style={{ color: colors.text }}>
                  {kind === 'listening' ? 'موضع الإجابة في التسجيل' : 'موضع الإجابة في النص'}
                  <span className="ms-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                    — الإجابة مظلّلة بالأخضر
                  </span>
                </p>
                {canReplay && (
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg text-xs font-bold font-['Tajawal'] transition-colors"
                    style={{
                      color: playing ? '#fda4af' : colors.text,
                      background: playing ? 'rgba(244,63,94,0.12)' : colors.bg,
                      border: `1px solid ${playing ? 'rgba(244,63,94,0.35)' : colors.border}`,
                    }}
                  >
                    {playing ? <Square size={12} /> : <Volume2 size={13} />}
                    {playing ? 'إيقاف' : 'تشغيل هذا الجزء'}
                  </button>
                )}
              </div>

              <p className="text-sm font-['Inter'] leading-[1.9] text-[var(--text-secondary)]" dir="ltr">
                {parts.before}
                {parts.match && (
                  <mark
                    className="rounded-md px-1 py-0.5 font-semibold"
                    style={{
                      background: 'rgba(16,185,129,0.18)',
                      color: '#6ee7b7',
                      boxShadow: 'inset 0 -1.5px 0 rgba(16,185,129,0.55)',
                    }}
                  >
                    {parts.match}
                  </mark>
                )}
                {parts.after}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
