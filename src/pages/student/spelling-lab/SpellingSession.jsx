import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Check, X, ArrowLeft, RotateCcw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { pronounceWord } from '../../../lib/audio/pronounceWord'
import WordRevealCard from './WordRevealCard'

// ── Spelling Lab session (Surface 4 of the Constellation identity) ───────────
// One drill of up to 10 words. Two modes:
//   listen_type  — audio plays (audio_url or Web Speech fallback) → type it
//   see_retype   — study card (word + meaning/type/example/relations) → tap to
//                  spell it from memory
// Server is the source of truth for correctness + Anki-lite mastery via the
// spelling_lab_record_attempt RPC. Calm UI — no confetti, no exclamation marks.
// Restyled into the indigo/gold "constellation" palette; gold = mastery only.

const SESSION_SIZE = 10
const FEEDBACK_REVEAL_MS = 2200   // wrong answer: dwell long enough to read the reveal card before retype

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
              m === 'correct' ? 'var(--vc-gold)'
              : m === 'wrong' ? 'var(--vc-text-dim)'
              : i === current ? 'var(--vc-indigo-bright)'
              : 'var(--vc-border-strong)',
            boxShadow: m === 'correct' ? 'var(--vc-glow-gold)' : 'none',
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
      className="vc-card flex flex-col items-center text-center px-4 py-10"
      dir="rtl"
    >
      <p
        className="vc-word max-w-full leading-none"
        style={{ fontStyle: 'italic', fontSize: 'clamp(2.75rem, 14vw, 3.5rem)', color: 'var(--vc-gold-soft)' }}
      >
        {stats.correct}{' '}
        <span style={{ color: 'var(--vc-text-dim)', fontSize: '0.6em' }}>/ {total}</span>
      </p>
      <p className="mt-3 text-[15px]" style={{ color: 'var(--vc-text-soft)' }}>
        أتممتِ الجلسة — دقّتكِ {accuracy}٪
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button type="button" onClick={onAgain} className="vc-btn vc-btn-primary flex-1">
          جلسة جديدة
        </button>
        <button type="button" onClick={onExit} className="vc-btn vc-btn-ghost flex-1">
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
  // We surface part_of_speech / definition_en / pronunciation_ipa AND the
  // curiosity-sparking relations (synonyms / antonyms / word_family /
  // pronunciation_alert) with one supplementary read and merge them in by word
  // id — no RPC change needed. Each rich field is best-effort and null-safe;
  // the reveal card collapses whatever isn't present for a given word.
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
            .select('id, curriculum_vocabulary(part_of_speech, definition_en, pronunciation_ipa, synonyms, antonyms, word_family, pronunciation_alert)')
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
                    // curiosity layer — present for a meaningful slice of words
                    synonyms: v.synonyms ?? null,
                    antonyms: v.antonyms ?? null,
                    word_family: v.word_family ?? null,
                    pronunciation_alert: v.pronunciation_alert ?? null,
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

  // Set up each new word: see_retype shows a STUDY card (the word + its meaning,
  // type, example, and relations) and waits for the student to tap "اكتبها الآن"
  // — no auto-fade, so there's time to actually learn the word before spelling
  // it from memory. listen_type opens input immediately and (best-effort)
  // auto-plays. Re-runs per word.
  useEffect(() => {
    if (!words || words.length === 0) return undefined
    setAnswer('')
    setWasCorrect(null)
    setSaveError(false)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (mode === 'see_retype') {
      setPhase('prompt')
      // intentionally NO auto-advance — the study card stays until the student
      // chooses to spell, so the meaning/example/relations are readable.
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
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '2px solid var(--vc-border-strong)', borderTopColor: 'var(--vc-indigo-bright)' }}
        />
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="vc-card flex flex-col items-center justify-center py-16 px-6 text-center" dir="rtl">
        <p className="text-[15px]" style={{ color: 'var(--vc-text-soft)' }}>
          {loadError || 'لا توجد كلمات متاحة الآن.'}
        </p>
        <button type="button" onClick={onExit} className="vc-btn vc-btn-ghost mt-6">
          العودة
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return <SessionSummary stats={stats} total={words.length} onAgain={() => { setCurrentIdx(0); setMarks(new Array(words.length).fill('pending')); setStats({ correct: 0, wrong: 0 }); setPhase(mode === 'see_retype' ? 'prompt' : 'input') }} onExit={onExit} />
  }

  return (
    <div className="spelling-session vc-card flex flex-col items-center p-5 sm:p-6" dir="ltr">
      {current?.audio_url && <audio ref={audioRef} src={current.audio_url} preload="auto" />}

      {/* top bar: progress + exit */}
      <div className="w-full flex items-center justify-between mb-10" dir="rtl">
        <button
          type="button" onClick={onExit} aria-label="خروج"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ color: 'var(--vc-text-dim)' }}
        >
          <X size={18} />
        </button>
        <ProgressDots marks={marks} current={currentIdx} />
        <span className="text-xs tabular-nums" style={{ color: 'var(--vc-text-dim)' }}>
          {currentIdx + 1}/{words.length}
        </span>
      </div>

      <div className="w-full max-w-md flex flex-col items-center min-h-[280px] justify-center">
        {/* listen_type: big indigo audio button */}
        {mode === 'listen_type' && phase !== 'feedback' && (
          <motion.button
            type="button" onClick={playWord} aria-label="استمعي للكلمة"
            whileTap={{ scale: 0.94 }}
            className="mb-8 w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--vc-indigo), var(--vc-violet))',
              color: '#0a0e1c',
              boxShadow: '0 14px 36px -12px rgba(129,140,248,0.6)',
            }}
          >
            <Volume2 size={36} />
          </motion.button>
        )}

        {/* see_retype: STUDY the word + its meaning / type / example / relations,
            then tap to spell it from memory. The details live here (not just on
            the feedback screen) because in this mode the word is shown on purpose
            — so the student can be curious about the word while learning it. */}
        <AnimatePresence mode="wait">
          {mode === 'see_retype' && phase === 'prompt' && (
            <motion.div
              key={`study-${currentIdx}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full flex flex-col items-center"
              dir="rtl"
            >
              <p className="text-[13px] text-center" style={{ color: 'var(--vc-text-dim)' }}>
                ادرسي الكلمة وتفاصيلها، ثم اكتبيها من الذاكرة
              </p>
              <WordRevealCard word={current} onPlayAudio={playRevealWord} />
              <button
                type="button"
                onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setPhase('input') }}
                className="vc-btn vc-btn-primary mt-6 w-full max-w-md"
              >
                اكتبها الآن <ArrowLeft size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* input phase */}
        {(phase === 'input' || phase === 'retry') && (
          <div className="w-full px-1">
            {phase === 'retry' && (
              <p className="mb-3 text-center text-[13px]" style={{ color: 'var(--vc-text-dim)' }}>
                أعيدي كتابة{' '}
                <span className="vc-word" style={{ color: 'var(--vc-gold-soft)' }}>{current.word_en}</span>
                {' '}للمتابعة
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
              placeholder="اكتبي الكلمة"
              className="w-full max-w-full text-center rounded-2xl px-4 outline-none"
              style={{
                height: 60,
                fontSize: 24,
                fontFamily: "'Tajawal', sans-serif",
                background: 'var(--vc-surface-2)',
                color: 'var(--vc-text)',
                border: `1.5px solid ${phase === 'retry' ? 'var(--vc-gold)' : 'var(--vc-border)'}`,
                boxShadow: phase === 'retry' ? '0 0 0 3px rgba(251,191,36,0.18)' : 'none',
              }}
            />
            <button
              type="button"
              onClick={() => (phase === 'retry' ? submitRetry() : submit())}
              disabled={!answer.trim()}
              className="vc-btn vc-btn-primary mt-4 w-full transition-opacity"
              style={{ opacity: answer.trim() ? 1 : 0.4 }}
            >
              تحقّقي <ArrowLeft size={16} />
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
              <span
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.14)', color: 'var(--vc-gold)' }}
              >
                <Check size={32} />
              </span>
            ) : (
              <>
                <span
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-text-soft)' }}
                >
                  <X size={32} />
                </span>
                <p className="mt-4 text-[15px]" style={{ color: 'var(--vc-text-soft)' }}>
                  الصحيح:{' '}
                  <strong dir="ltr" className="vc-word" style={{ color: 'var(--vc-text)' }}>{current.word_en}</strong>
                </p>
              </>
            )}

            {/* the teaching moment — safe to reveal now, the answer is in */}
            <WordRevealCard word={current} onPlayAudio={playRevealWord} />

            {wasCorrect && (
              <motion.button
                type="button" onClick={advance}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="vc-btn vc-btn-primary mt-6 w-full max-w-md"
              >
                التالي <ArrowLeft size={16} />
              </motion.button>
            )}
          </motion.div>
        )}

        {saveError && (
          <p
            className="mt-4 text-xs flex items-center gap-1.5" dir="rtl"
            style={{ color: 'var(--vc-text-dim)' }}
          >
            <RotateCcw size={12} /> تعذّر حفظ هذه المحاولة — تابعي، سنحاول لاحقًا
          </p>
        )}
      </div>
    </div>
  )
}
