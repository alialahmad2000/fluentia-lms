import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Check, X, ArrowLeft, RotateCcw, Eye } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { pronounceWord } from '../../../lib/audio/pronounceWord'
import WordRevealCard from './WordRevealCard'

// ── Spelling Lab session (Surface 4 of the Constellation identity) ───────────
// One drill of up to 10 words. Two modes:
//   listen_type  — audio plays (audio_url or Web Speech fallback) → type it
//   see_retype   — TIMED recall: the study card (word + meaning/type/example/
//                  relations) shows for a few seconds → fades → spell it from
//                  memory; a "peek again" button briefly re-reveals it. The
//                  reveal duration is student-adjustable (default 5s, persisted).
// `source`: 'session' = the leveled selector; 'weak' = a focused weak-words drill.
// Server is the source of truth for correctness + Anki-lite mastery via the
// spelling_lab_record_attempt RPC. Calm UI — no confetti, no exclamation marks.
// Restyled into the indigo/gold "constellation" palette; gold = mastery only.

const SESSION_SIZE = 10
const FEEDBACK_REVEAL_MS = 2200   // wrong answer: dwell long enough to read the reveal card before retype
const PEEK_OPTIONS = [3, 5, 7]
const PEEK_DEFAULT = 5

function peekKey(studentId) {
  return `fluentia:spellingPeekSecs:${studentId || 'anon'}`
}
function loadPeek(studentId) {
  try {
    const v = parseInt(localStorage.getItem(peekKey(studentId)), 10)
    return PEEK_OPTIONS.includes(v) ? v : PEEK_DEFAULT
  } catch { return PEEK_DEFAULT }
}

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

// A slim circular countdown ring (depletes over the chosen seconds) with the
// remaining whole-seconds in the center. Smooth via a short CSS transition.
function CountdownRing({ left, total }) {
  const R = 17
  const C = 2 * Math.PI * R
  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0
  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="22" cy="22" r={R} fill="none" stroke="var(--vc-border-strong)" strokeWidth="3" />
        <circle
          cx="22" cy="22" r={R} fill="none" stroke="var(--vc-indigo-bright)" strokeWidth="3"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.12s linear' }}
        />
      </svg>
      <span
        className="absolute tabular-nums font-bold"
        style={{ fontSize: 15, color: 'var(--vc-text)' }}
      >
        {Math.ceil(left)}
      </span>
    </div>
  )
}

function PeekDurationChips({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      <span className="text-[11px]" style={{ color: 'var(--vc-text-dim)' }}>مدّة العرض</span>
      {PEEK_OPTIONS.map((n) => {
        const on = n === value
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="px-2.5 py-1 rounded-lg text-[12px] font-bold tabular-nums transition-colors"
            style={{
              background: on ? 'rgba(129,140,248,0.16)' : 'var(--vc-surface-2)',
              border: `1px solid ${on ? 'var(--vc-indigo-bright)' : 'var(--vc-border)'}`,
              color: on ? 'var(--vc-indigo-bright)' : 'var(--vc-text-dim)',
            }}
          >
            {n} ث
          </button>
        )
      })}
    </div>
  )
}

function SessionSummary({ stats, total, onAgain, onExit, source }) {
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
          {source === 'weak' ? 'كلمات ضعيفة أخرى' : 'جلسة جديدة'}
        </button>
        <button type="button" onClick={onExit} className="vc-btn vc-btn-ghost flex-1">
          إلى المختبر
        </button>
      </div>
    </motion.div>
  )
}

export default function SpellingSession({ mode, source = 'session', onExit }) {
  // ── ALL hooks at top (React rules) ──
  const profile = useAuthStore((s) => s.profile)
  const [words, setWords] = useState(null)        // null = loading
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)   // bump → fresh RPC fetch (fixes "same 10 words")
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState('prompt')    // prompt | input | feedback | retry | done
  const [answer, setAnswer] = useState('')
  const [wasCorrect, setWasCorrect] = useState(null)
  const [marks, setMarks] = useState([])
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [saveError, setSaveError] = useState(false)
  const [peekSecs, setPeekSecs] = useState(() => loadPeek(profile?.id))
  const [revealLeft, setRevealLeft] = useState(PEEK_DEFAULT)   // see_retype countdown (seconds, float)

  const inputRef = useRef(null)
  const audioRef = useRef(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef(null)
  const prevIdsRef = useRef([])   // the set to exclude on the NEXT fetch (anti-repeat)

  const current = words && words[currentIdx]

  const changePeek = useCallback((n) => {
    setPeekSecs(n)
    try { localStorage.setItem(peekKey(profile?.id), String(n)) } catch { /* ignore */ }
  }, [profile?.id])

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

  // Load the session. Re-runs whenever reloadKey bumps (so "جلسة جديدة" pulls a
  // FRESH set — the previous bug replayed the same in-memory array). prevIdsRef
  // carries the just-finished set so the server's p_exclude guarantees no overlap.
  // The RPC returns the spelling essentials (word_en, audio_url, meaning_ar,
  // example_en, …) but NOT the richer teaching fields. Those live on
  // curriculum_vocabulary, reachable via spelling_lab_words.source_vocab_id.
  // We surface part_of_speech / definition_en / pronunciation_ipa AND the
  // curiosity-sparking relations with one supplementary read and merge them in
  // by word id — no RPC change needed. Each rich field is best-effort/null-safe.
  useEffect(() => {
    let alive = true
    setWords(null)
    setLoadError(null)
    ;(async () => {
      const { data, error } =
        source === 'weak'
          ? await supabase.rpc('spelling_lab_select_weak', { p_size: SESSION_SIZE })
          : await supabase.rpc('spelling_lab_select_session', {
              p_mode: mode, p_size: SESSION_SIZE, p_exclude: prevIdsRef.current,
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
      // remember this set so the NEXT "جلسة جديدة" excludes it
      prevIdsRef.current = ids
      setWords(enriched)
      setMarks(new Array(enriched.length).fill('pending'))
    })()
    return () => { alive = false }
  }, [mode, source, reloadKey])

  // Set up each new word: see_retype enters the STUDY/reveal phase (the timed
  // countdown effect below then hides it); listen_type opens input immediately
  // and (best-effort) auto-plays. Re-runs per word.
  useEffect(() => {
    if (!words || words.length === 0) return undefined
    setAnswer('')
    setWasCorrect(null)
    setSaveError(false)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (mode === 'see_retype') {
      setPhase('prompt')   // the countdown effect drives prompt → input
    } else {
      setPhase('input')
      // best-effort autoplay; the replay button covers iOS gesture restrictions
      timerRef.current = setTimeout(() => playWord(), 150)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, words, mode])

  // see_retype timed reveal: while on the study card, count down peekSecs then
  // open the input. Re-arms when the word changes, the duration changes, or the
  // student taps "انظري مرة أخرى" (which sets phase back to 'prompt').
  useEffect(() => {
    if (mode !== 'see_retype' || phase !== 'prompt') return undefined
    setRevealLeft(peekSecs)
    const started = Date.now()
    let done = false
    const iv = setInterval(() => {
      const left = Math.max(0, peekSecs - (Date.now() - started) / 1000)
      setRevealLeft(left)
      if (left <= 0 && !done) { done = true; clearInterval(iv); setPhase('input') }
    }, 100)
    return () => clearInterval(iv)
  }, [mode, phase, peekSecs, currentIdx])

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

  // "جلسة جديدة" — exclude the set we just finished, then refetch fresh words.
  const startNewSession = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCurrentIdx(0)
    setStats({ correct: 0, wrong: 0 })
    setWasCorrect(null)
    setAnswer('')
    setMarks([])
    setReloadKey((k) => k + 1)
  }, [])

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
          {loadError
            || (source === 'weak'
                  ? 'ما عندكِ كلمات ضعيفة الآن — أحسنتِ! 🌟'
                  : 'لا توجد كلمات متاحة الآن.')}
        </p>
        <button type="button" onClick={onExit} className="vc-btn vc-btn-ghost mt-6">
          العودة
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <SessionSummary
        stats={stats} total={words.length} source={source}
        onAgain={startNewSession} onExit={onExit}
      />
    )
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

        {/* see_retype: TIMED study of the word + its details, then it fades and
            you spell it from memory. The countdown ring shows how long is left;
            "اكتبها الآن" skips the wait; the duration chips adjust the reveal. */}
        <AnimatePresence mode="wait">
          {mode === 'see_retype' && phase === 'prompt' && (
            <motion.div
              key={`study-${currentIdx}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full flex flex-col items-center"
              dir="rtl"
            >
              <div className="flex items-center gap-3 mb-1">
                <CountdownRing left={revealLeft} total={peekSecs} />
                <p className="text-[13px] text-center" style={{ color: 'var(--vc-text-dim)' }}>
                  ادرسي الكلمة، ثم ستختفي لتكتبيها من الذاكرة
                </p>
              </div>
              <div className="my-2">
                <PeekDurationChips value={peekSecs} onChange={changePeek} />
              </div>
              <WordRevealCard word={current} onPlayAudio={playRevealWord} />
              <button
                type="button"
                onClick={() => setPhase('input')}
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

            {/* see_retype only: a quick peek if she forgot — re-reveals the card
                for the chosen seconds, then hides it again. */}
            {mode === 'see_retype' && phase === 'input' && (
              <button
                type="button"
                onClick={() => setPhase('prompt')}
                className="vc-btn vc-btn-ghost mt-3 w-full flex items-center justify-center gap-2"
              >
                <Eye size={16} /> انظري مرة أخرى
              </button>
            )}

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
