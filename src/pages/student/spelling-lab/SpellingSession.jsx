import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Check, X, ArrowRight, RotateCcw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { pronounceWord } from '../../../lib/audio/pronounceWord'
import WordRevealCard from './WordRevealCard'

// ── Spelling Lab session (prompt 09, Surface 3) ─────────────────────────────
// One drill of up to 10 words. Two modes:
//   listen_type  — audio plays (audio_url or Web Speech fallback) → type it
//   see_retype   — word shown 2s in Cormorant italic → fades → type from memory
// Server is the source of truth for correctness + Anki-lite mastery via the
// spelling_lab_record_attempt RPC. Calm UI — no confetti, no exclamation marks.

const GOLD = 'var(--ds-accent-primary, #e9b949)'
const SESSION_SIZE = 10
const FEEDBACK_REVEAL_MS = 2200   // wrong answer: dwell long enough to read the reveal card before retype
const SEE_REVEAL_MS = 2000

// Web Speech fallback for words with no recorded audio_url.
function speak(word) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'
  u.rate = 0.8
  window.speechSynthesis.speak(u)
}

function ProgressDots({ marks, current }) {
  return (
    <div className="flex items-center justify-center gap-2" dir="ltr">
      {marks.map((m, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === current ? 10 : 8,
            height: i === current ? 10 : 8,
            background:
              m === 'correct' ? GOLD
              : m === 'wrong' ? 'var(--ds-text-tertiary, #64748b)'
              : i === current ? 'var(--ds-text-secondary, #94a3b8)'
              : 'var(--ds-border-subtle, rgba(255,255,255,0.12))',
          }}
        />
      ))}
    </div>
  )
}

function SessionSummary({ stats, total, onAgain, onExit }) {
  const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center px-4 py-10"
      dir="rtl"
    >
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 56, lineHeight: 1, color: GOLD }}>
        {stats.correct} <span style={{ color: 'var(--ds-text-tertiary, #64748b)', fontSize: 32 }}>/ {total}</span>
      </p>
      <p className="mt-3 text-[15px]" style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-secondary, #94a3b8)' }}>
        أتممت الجلسة — دقّتك {accuracy}٪
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          type="button" onClick={onAgain}
          className="flex-1 h-12 rounded-xl text-[15px] font-medium"
          style={{ background: GOLD, color: 'var(--ds-primary-ink, #0a0a0f)', fontFamily: "'Tajawal', sans-serif" }}
        >
          جلسة جديدة
        </button>
        <button
          type="button" onClick={onExit}
          className="flex-1 h-12 rounded-xl text-[15px]"
          style={{ border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.12))', color: 'var(--ds-text-secondary, #94a3b8)', fontFamily: "'Tajawal', sans-serif" }}
        >
          إلى المختبر
        </button>
      </div>
    </motion.div>
  )
}

export default function SpellingSession({ mode, onExit }) {
  // ── ALL hooks at top (React rules) ──
  const [words, setWords] = useState(null)        // null = loading
  const [loadError, setLoadError] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState('prompt')    // prompt | input | feedback | retry | done
  const [answer, setAnswer] = useState('')
  const [wasCorrect, setWasCorrect] = useState(null)
  const [marks, setMarks] = useState([])
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [saveError, setSaveError] = useState(false)

  const inputRef = useRef(null)
  const audioRef = useRef(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef(null)

  const current = words && words[currentIdx]

  const playWord = useCallback(() => {
    if (!current) return
    if (current.audio_url && audioRef.current) {
      try {
        audioRef.current.currentTime = 0
        const p = audioRef.current.play()
        if (p) p.catch(() => speak(current.word_en))
      } catch { speak(current.word_en) }
    } else {
      speak(current.word_en)
    }
  }, [current])

  // Audio for the reveal card (feedback screen). Reuses the recorded audio
  // element when present; otherwise the shared pronounceWord pipeline (which
  // resolves curriculum audio and falls back to Web Speech on its own).
  const playRevealWord = useCallback(() => {
    if (!current) return
    if (current.audio_url && audioRef.current) {
      try {
        audioRef.current.currentTime = 0
        const p = audioRef.current.play()
        if (p) p.catch(() => pronounceWord(current.word_en))
      } catch { pronounceWord(current.word_en) }
    } else {
      pronounceWord(current.word_en)
    }
  }, [current])

  // Load the session once on mount.
  // The RPC returns the spelling essentials (word_en, audio_url, meaning_ar,
  // example_en, …) but NOT the richer teaching fields. Those live on
  // curriculum_vocabulary, reachable via spelling_lab_words.source_vocab_id.
  // We surface part_of_speech / definition_en / pronunciation_ipa with one
  // supplementary read and merge them in by word id — no RPC change needed.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase.rpc('spelling_lab_select_session', {
        p_mode: mode, p_size: SESSION_SIZE,
      })
      if (!alive) return
      if (error) { setLoadError(error.message || 'تعذّر تحميل الجلسة'); setWords([]); return }
      const list = data || []

      // Best-effort enrichment — the spelling drill must never block on it.
      let enriched = list
      const ids = list.map((w) => w.id).filter(Boolean)
      if (ids.length > 0) {
        try {
          const { data: rich } = await supabase
            .from('spelling_lab_words')
            .select('id, curriculum_vocabulary(part_of_speech, definition_en, pronunciation_ipa)')
            .in('id', ids)
          if (rich) {
            const byId = new Map(rich.map((r) => [r.id, r.curriculum_vocabulary]))
            enriched = list.map((w) => {
              const v = byId.get(w.id)
              return v
                ? {
                    ...w,
                    part_of_speech: v.part_of_speech ?? null,
                    definition_en: v.definition_en ?? null,
                    // RPC's own ipa is always null for these rows; prefer vocab IPA.
                    pronunciation_ipa: w.ipa ?? v.pronunciation_ipa ?? null,
                  }
                : { ...w, pronunciation_ipa: w.ipa ?? null }
            })
          }
        } catch {
          // Enrichment is non-essential — fall back to the bare session.
          enriched = list.map((w) => ({ ...w, pronunciation_ipa: w.ipa ?? null }))
        }
      }
      if (!alive) return
      setWords(enriched)
      setMarks(new Array(enriched.length).fill('pending'))
    })()
    return () => { alive = false }
  }, [mode])

  // Set up each new word: see_retype reveals 2s then opens input; listen_type
  // opens input immediately and (best-effort) auto-plays. Re-runs per word.
  useEffect(() => {
    if (!words || words.length === 0) return undefined
    setAnswer('')
    setWasCorrect(null)
    setSaveError(false)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (mode === 'see_retype') {
      setPhase('prompt')
      timerRef.current = setTimeout(() => setPhase('input'), SEE_REVEAL_MS)
    } else {
      setPhase('input')
      // best-effort autoplay; the replay button covers iOS gesture restrictions
      timerRef.current = setTimeout(() => playWord(), 150)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, words, mode])

  // Focus the field + stamp the timer whenever an input phase opens.
  useEffect(() => {
    if (phase === 'input' || phase === 'retry') {
      startTimeRef.current = Date.now()
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
    return undefined
  }, [phase])

  const advance = useCallback(() => {
    if (currentIdx + 1 >= (words?.length || 0)) setPhase('done')
    else setCurrentIdx((i) => i + 1)
  }, [currentIdx, words])

  const submit = useCallback(async () => {
    if (!current || !answer.trim()) return
    const ms = Date.now() - startTimeRef.current
    const correct = answer.trim().toLowerCase() === current.word_en.trim().toLowerCase()

    // optimistic, instant feedback
    setWasCorrect(correct)
    setMarks((m) => { const n = [...m]; n[currentIdx] = correct ? 'correct' : 'wrong'; return n })
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    setPhase('feedback')

    // persist (server is authoritative for mastery; never block the UI on it)
    try {
      const { error } = await supabase.rpc('spelling_lab_record_attempt', {
        p_word_id: current.id, p_mode: mode, p_attempt_text: answer, p_ms_to_submit: ms,
      })
      if (error) setSaveError(true)
    } catch { setSaveError(true) }

    if (correct) {
      // Stay on the feedback screen so the student can read the enriched word
      // card; an explicit "التالي" button (not a timer) drives the advance, so
      // there's time to actually learn the meaning / example / pronunciation.
      // (No auto-advance here — see the feedback render block.)
    } else {
      // require one correct retype before advancing — give a touch more time so
      // the reveal card is readable before the input reopens
      timerRef.current = setTimeout(() => { setAnswer(''); setPhase('retry') }, FEEDBACK_REVEAL_MS)
    }
  }, [current, answer, currentIdx, mode])

  const submitRetry = useCallback(() => {
    if (!current) return
    if (answer.trim().toLowerCase() === current.word_en.trim().toLowerCase()) advance()
    else { setAnswer(''); inputRef.current?.focus() }
  }, [current, answer, advance])

  // ── conditional renders AFTER all hooks ──
  if (words === null) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid var(--ds-border-subtle, rgba(255,255,255,0.15))', borderTopColor: GOLD }} />
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center" dir="rtl">
        <p className="text-[15px]" style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-secondary, #94a3b8)' }}>
          {loadError || 'لا توجد كلمات متاحة الآن.'}
        </p>
        <button type="button" onClick={onExit} className="mt-6 h-11 px-6 rounded-xl text-[14px]"
          style={{ border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.12))', color: 'var(--ds-text-secondary, #94a3b8)', fontFamily: "'Tajawal', sans-serif" }}>
          العودة
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return <SessionSummary stats={stats} total={words.length} onAgain={() => { setCurrentIdx(0); setMarks(new Array(words.length).fill('pending')); setStats({ correct: 0, wrong: 0 }); setPhase(mode === 'see_retype' ? 'prompt' : 'input') }} onExit={onExit} />
  }

  return (
    <div className="spelling-session flex flex-col items-center" dir="ltr">
      {current?.audio_url && <audio ref={audioRef} src={current.audio_url} preload="auto" />}

      {/* top bar: progress + exit */}
      <div className="w-full flex items-center justify-between mb-10" dir="rtl">
        <button type="button" onClick={onExit} aria-label="خروج" className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
          <X size={18} />
        </button>
        <ProgressDots marks={marks} current={currentIdx} />
        <span className="text-[12px] tabular-nums" style={{ color: 'var(--ds-text-tertiary, #64748b)', fontFamily: "'Readex Pro', sans-serif" }}>
          {currentIdx + 1}/{words.length}
        </span>
      </div>

      <div className="w-full max-w-md flex flex-col items-center min-h-[280px] justify-center">
        {/* listen_type: big gold audio button */}
        {mode === 'listen_type' && phase !== 'feedback' && (
          <motion.button
            type="button" onClick={playWord} aria-label="استمع للكلمة"
            whileTap={{ scale: 0.94 }}
            className="mb-8 w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: GOLD, color: 'var(--ds-primary-ink, #0a0a0f)', boxShadow: '0 12px 32px -8px rgba(233,185,73,0.5)' }}
          >
            <Volume2 size={36} />
          </motion.button>
        )}

        {/* see_retype: reveal the word, then it fades */}
        <AnimatePresence mode="wait">
          {mode === 'see_retype' && phase === 'prompt' && (
            <motion.div
              key={`word-${currentIdx}`}
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 56, color: 'var(--ds-text-primary, #f8fafc)' }}
            >
              {current.word_en}
            </motion.div>
          )}
        </AnimatePresence>

        {/* input phase */}
        {(phase === 'input' || phase === 'retry') && (
          <div className="w-full px-1">
            {phase === 'retry' && (
              <p className="mb-3 text-center text-[13px]" style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-tertiary, #64748b)' }}>
                أعد كتابة <span style={{ color: GOLD, fontFamily: "'Readex Pro', sans-serif" }}>{current.word_en}</span> للمتابعة
              </p>
            )}
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (phase === 'retry' ? submitRetry() : submit()) }}
              dir="ltr"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="اكتب الكلمة"
              className="w-full text-center rounded-xl px-4 outline-none"
              style={{
                height: 60,
                fontSize: 24,
                fontFamily: "'Readex Pro', sans-serif",
                background: 'var(--ds-bg-elevated, rgba(255,255,255,0.04))',
                color: 'var(--ds-text-primary, #f8fafc)',
                border: `1.5px solid ${phase === 'retry' ? GOLD : 'var(--ds-border-subtle, rgba(255,255,255,0.12))'}`,
                boxShadow: phase === 'retry' ? '0 0 0 3px rgba(233,185,73,0.18)' : 'none',
              }}
            />
            <button
              type="button"
              onClick={() => (phase === 'retry' ? submitRetry() : submit())}
              disabled={!answer.trim()}
              className="mt-4 w-full h-12 rounded-xl text-[15px] font-medium flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: GOLD, color: 'var(--ds-primary-ink, #0a0a0f)',
                fontFamily: "'Tajawal', sans-serif", opacity: answer.trim() ? 1 : 0.4,
              }}
            >
              تحقّق <ArrowRight size={16} />
            </button>

            {/* keep the teaching card visible while the student retypes the
                missed word — it can't spoil the challenge (they've already seen
                the answer) and it reinforces the meaning during the retype. */}
            {phase === 'retry' && (
              <WordRevealCard word={current} onPlayAudio={playRevealWord} />
            )}
          </div>
        )}

        {/* feedback phase — verdict icon, then the enriched word card, then
            (for a correct answer) an explicit "next" button so the student
            controls when to leave the teaching card. */}
        {phase === 'feedback' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center w-full" dir="rtl"
          >
            {wasCorrect ? (
              <span className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.14)', color: 'var(--ds-accent-success, #4ade80)' }}>
                <Check size={32} />
              </span>
            ) : (
              <>
                <span className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(148,163,184,0.14)', color: 'var(--ds-text-secondary, #94a3b8)' }}>
                  <X size={32} />
                </span>
                <p className="mt-4 text-[15px]" style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-secondary, #94a3b8)' }}>
                  الصحيح: <strong dir="ltr" style={{ fontFamily: "'Readex Pro', sans-serif", color: 'var(--ds-text-primary, #f8fafc)' }}>{current.word_en}</strong>
                </p>
              </>
            )}

            {/* the teaching moment — safe to reveal now, the answer is in */}
            <WordRevealCard word={current} onPlayAudio={playRevealWord} />

            {wasCorrect && (
              <motion.button
                type="button" onClick={advance}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="mt-6 w-full max-w-md h-12 rounded-xl text-[15px] font-medium flex items-center justify-center gap-2"
                style={{ background: GOLD, color: 'var(--ds-primary-ink, #0a0a0f)', fontFamily: "'Tajawal', sans-serif" }}
              >
                التالي <ArrowRight size={16} />
              </motion.button>
            )}
          </motion.div>
        )}

        {saveError && (
          <p className="mt-4 text-[12px] flex items-center gap-1.5" dir="rtl"
            style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-accent-warning, #f59e0b)' }}>
            <RotateCcw size={12} /> تعذّر حفظ هذه المحاولة — تابع، سنحاول لاحقًا
          </p>
        )}
      </div>
    </div>
  )
}
