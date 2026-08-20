import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, RotateCcw, Lightbulb, Shuffle, PenLine, ListChecks, Puzzle, ChevronLeft } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useActivitySave } from '../../../../hooks/useActivitySave'
import SaveStatus from '../../../../components/ui/SaveStatus'
import { useAuthProfile } from '../../../../stores/authStore'
import { useG } from '../../../../i18n/gender'
import { toast } from '../../../../components/ui/FluentiaToast'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import { validateAnswer } from '../../../../utils/answerValidator'
import { recordExercise } from '../../../../services/vocab'

// Map each drill to a unified vocab_cards exercise key.
// match/choose test the meaning; fill_blank/scramble test sentence/spelling.
const EXERCISE_VOCAB_KEY = {
  match: 'meaning',
  choose: 'meaning',
  fill_blank: 'sentence',
  scramble: 'sentence',
}

// ─── Shuffle helper ───────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── EXERCISE TYPES ───────────────────────────────
// Ordered as a real ladder, not a menu: recognise the meaning → recall it →
// use the word inside a sentence → spell it. Four unlabelled grey twins gave the
// student four equal choices and no reason to pick any of them; a numbered path
// with one recommended step removes that hesitation. `trains` says what each
// drill is actually for, and `hue` gives it its own identity so the four stop
// reading as the same card repeated.
const EXERCISES = [
  { key: 'match', label: 'اربط الكلمة بمعناها', icon: Puzzle, trains: 'تتعرّفين على المعنى', trainsM: 'تتعرّف على المعنى', hue: 258 },
  { key: 'choose', label: 'اختر المعنى الصحيح', icon: ListChecks, trains: 'تسترجعين المعنى', trainsM: 'تسترجع المعنى', hue: 198 },
  { key: 'fill_blank', label: 'أكمل الفراغ', icon: PenLine, trains: 'تستخدمينها داخل جملة', trainsM: 'تستخدمها داخل جملة', hue: 40 },
  { key: 'scramble', label: 'رتّب الحروف', icon: Shuffle, trains: 'تكتبينها بحروفها', trainsM: 'تكتبها بحروفها', hue: 344 },
]

// ═════════════════════════════════════════════════════
// Main Exercises Component
// ═════════════════════════════════════════════════════
export default function VocabularyExercises({ unitId, allWords }) {
  const profile = useAuthProfile()
  const g = useG()
  const [activeExercise, setActiveExercise] = useState(null)
  const [completedExercises, setCompletedExercises] = useState({})
  const [savedProgress, setSavedProgress] = useState(null)

  // Persistence — row, queue, outbox, readOnly guard and save state in one hook.
  const {
    state: saveState, lastSavedAt, saveNow, submit: submitAttempt, adoptAttempt,
  } = useActivitySave({ studentId: profile?.id, unitId, sectionType: 'vocabulary_exercise' })
  // Load saved exercise progress
  useEffect(() => {
    if (!profile?.id || !unitId) return
    let mounted = true
    const load = async () => {
      // No unique constraint backs (student, unit, vocabulary_exercise), so a
      // second row must not make maybeSingle() error out and blank the drills —
      // take the newest row instead.
      const { data: rows } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', profile.id)
        .eq('unit_id', unitId)
        .eq('section_type', 'vocabulary_exercise')
        .order('updated_at', { ascending: false })
        .limit(1)
      if (!mounted) return
      const data = rows?.[0]
      if (data) {
        adoptAttempt(data)
        setSavedProgress(data)
        if (data.answers?.exercises) {
          const map = {}
          Object.entries(data.answers.exercises).forEach(([k, v]) => {
            if (v.completed) map[k] = v
          })
          setCompletedExercises(map)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [profile?.id, unitId, adoptAttempt])

  // Save exercise result. One call — see hooks/useActivitySave.js.
  const saveResult = useCallback(async (exerciseKey, result) => {
    const updated = {
      ...completedExercises,
      [exerciseKey]: { ...result, completed: true },
    }
    setCompletedExercises(updated)

    const totalScore = Object.values(updated).reduce((s, e) => s + (e.score || 0), 0)
    const totalMax = Object.values(updated).reduce((s, e) => s + (e.maxScore || 0), 0)
    const allDone = Object.keys(updated).length >= 4
    const score = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0

    // These drills carry a real running total across the four exercises, so this
    // is the one section that scores a row before it is finished.
    const res = allDone
      ? await submitAttempt({ exercises: updated }, { score })
      : await saveNow({ exercises: updated }, { score, writeScore: true })
    if (res?.ok) setSavedProgress(res.row)

    // Best-effort mirror into the unified vocab_cards store so completing these
    // unit drills feeds the sidebar vocabulary journey (/student/vocab-journey).
    // Purely additive — a mirror failure must never break the exercise.
    try {
      const vocabKey = EXERCISE_VOCAB_KEY[exerciseKey]
      const correctWords = result?.correctWords || []
      if (vocabKey && correctWords.length) {
        for (const w of correctWords) {
          if (!w?.id) continue
          await recordExercise(w.id, vocabKey, {
            word: w.word,
            meaningAr: w.definition_ar,
            contextSentence: w.example_sentence || null,
          })
        }
      }
    } catch (mirrorErr) {
      console.warn('[VocabularyExercises] vocab_cards mirror failed:', mirrorErr?.message)
    }

    // Award XP on first full completion
    if (allDone && !savedProgress?.completed_at) {
      const xp = await awardCurriculumXP(profile.id, 'vocabulary_exercise', score, unitId)
      if (xp > 0) toast({ type: 'success', title: `+${xp} XP — أحسنت!` })
    }
  }, [profile?.id, unitId, completedExercises, savedProgress, saveNow, submitAttempt])

  if (!allWords?.length || allWords.length < 4) return null

  const completedCount = Object.keys(completedExercises).length

  // The next drill the student has not finished — the one the section leads with.
  const nextKey = EXERCISES.find((e) => !completedExercises[e.key])?.key ?? null

  return (
    <div className="space-y-4 mt-10">
      {activeExercise ? (
        <ExerciseRunner
          exerciseKey={activeExercise}
          allWords={allWords}
          onComplete={(result) => {
            saveResult(activeExercise, result)
            setActiveExercise(null)
          }}
          onBack={() => setActiveExercise(null)}
        />
      ) : null}
      {/* A lit panel, not a flat slab on a dark page — and a real section header
          rather than a centred caption under a divider, which read as a footer
          the student had already scrolled past. */}
      {!activeExercise && (
      <div
        dir="rtl"
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(129,140,248,0.07) 0%, rgba(56,189,248,0.04) 55%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 92% 0%, rgba(129,140,248,0.16) 0%, transparent 60%)' }}
        />

        <div className="relative p-4 md:p-5 space-y-4">
          {/* header */}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white font-['Tajawal']">تمارين المفردات</h3>
              <p className="text-xs text-white/45 font-['Tajawal'] mt-0.5">
                {g('أربعة تمارين قصيرة تثبّت كلمات الوحدة', 'أربعة تمارين قصيرة تثبّت كلمات الوحدة')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-bold font-['Tajawal'] tabular-nums" style={{ color: completedCount >= 4 ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                {completedCount}/4
              </span>
              <div className="flex items-center gap-1">
                {EXERCISES.map((ex) => (
                  <i
                    key={ex.key}
                    className="w-5 h-1 rounded-full"
                    style={{ background: completedExercises[ex.key] ? '#22c55e' : 'rgba(255,255,255,0.12)' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* the ladder */}
          <div className="space-y-2">
            {EXERCISES.map((ex, i) => {
              const done = !!completedExercises[ex.key]
              const result = completedExercises[ex.key]
              const isNext = ex.key === nextKey
              return (
                <motion.button
                  key={ex.key}
                  whileTap={{ scale: 0.99 }}
                  whileHover={{ x: -2 }}
                  onClick={() => setActiveExercise(ex.key)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors"
                  style={{
                    background: isNext
                      ? `hsla(${ex.hue} 70% 55% / 0.10)`
                      : done ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isNext ? `hsla(${ex.hue} 75% 65% / 0.35)` : done ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: isNext ? `0 8px 22px hsla(${ex.hue} 70% 40% / 0.20)` : 'none',
                  }}
                >
                  {/* step number — the four drills are a path, so they are numbered */}
                  <span
                    className="w-7 h-7 rounded-lg hidden sm:flex items-center justify-center flex-shrink-0 text-[11px] font-bold tabular-nums font-['Tajawal']"
                    style={{
                      background: done ? 'rgba(34,197,94,0.15)' : `hsla(${ex.hue} 70% 60% / 0.14)`,
                      color: done ? '#4ade80' : `hsl(${ex.hue} 80% 78%)`,
                    }}
                  >
                    {done ? <CheckCircle size={14} /> : i + 1}
                  </span>

                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `hsla(${ex.hue} 70% 55% / 0.12)` }}
                  >
                    <ex.icon size={17} style={{ color: `hsl(${ex.hue} 80% 74%)` }} />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-white font-['Tajawal'] leading-tight">{ex.label}</span>
                    <span className="block text-[11px] text-white/40 font-['Tajawal'] line-clamp-1 mt-0.5">
                      {g(ex.trainsM, ex.trains)}
                    </span>
                  </span>

                  {done ? (
                    <span
                      className="flex-shrink-0 px-2.5 h-8 inline-flex items-center rounded-lg text-[11px] font-bold tabular-nums font-['Tajawal']"
                      style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}
                    >
                      {result.score}/{result.maxScore}
                    </span>
                  ) : (
                    <span
                      className="flex-shrink-0 px-3 h-8 inline-flex items-center gap-1 rounded-lg text-[11px] font-bold font-['Tajawal']"
                      style={
                        isNext
                          ? { background: `hsl(${ex.hue} 70% 62%)`, color: '#0b1020' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)' }
                      }
                    >
                      {g('ابدأ', 'ابدئي')}
                      <ChevronLeft size={13} />
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>

          {completedCount > 0 && (
            <p className="text-[11px] text-white/30 font-['Tajawal'] text-center">
              {g('يمكنك إعادة أي تمرين بالضغط عليه', 'يمكنكِ إعادة أي تمرين بالضغط عليه')}
            </p>
          )}
          <SaveStatus floating state={saveState} lastSavedAt={lastSavedAt} />
        </div>
      </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════
// Exercise Runner (dispatches to specific exercise)
// ═════════════════════════════════════════════════════
function ExerciseRunner({ exerciseKey, allWords, onComplete, onBack }) {
  const words = useMemo(() => shuffle(allWords).slice(0, Math.min(allWords.length, 8)), [allWords])

  const props = { words, allWords, onComplete, onBack }

  switch (exerciseKey) {
    case 'match': return <MatchExercise {...props} />
    case 'fill_blank': return <FillBlankExercise {...props} />
    case 'choose': return <ChooseExercise {...props} />
    case 'scramble': return <ScrambleExercise {...props} />
    default: return null
  }
}

// ═════════════════════════════════════════════════════
// Exercise 1: Match Word to Meaning
// ═════════════════════════════════════════════════════
function MatchExercise({ words, onComplete, onBack }) {
  const items = useMemo(() => words.slice(0, 5), [words])
  const shuffledMeanings = useMemo(() => shuffle(items.map(w => ({ id: w.id, meaning: w.definition_ar }))), [items])
  const [selected, setSelected] = useState({}) // wordId → meaningId
  const [activeWord, setActiveWord] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleMeaningClick = (meaningId) => {
    if (submitted || !activeWord) return
    setSelected(prev => ({ ...prev, [activeWord]: meaningId }))
    setActiveWord(null)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const correctWords = items.filter(w => selected[w.id] === w.id)
    const score = correctWords.length
    setTimeout(() => onComplete({ score, maxScore: items.length, answers: selected, correctWords }), 1500)
  }

  const allMatched = Object.keys(selected).length >= items.length

  return (
    <div className="space-y-4">
      <ExerciseHeader title="اربط الكلمة بمعناها" onBack={onBack} />

      <div className="grid grid-cols-2 gap-3">
        {/* Words column */}
        <div className="space-y-2">
          {items.map(w => {
            const isActive = activeWord === w.id
            const isMatched = !!selected[w.id]
            const isCorrect = submitted && selected[w.id] === w.id
            const isWrong = submitted && selected[w.id] && selected[w.id] !== w.id
            return (
              <button
                key={w.id}
                onClick={() => !submitted && setActiveWord(w.id)}
                className="w-full px-3 py-3 rounded-xl text-sm font-semibold font-en transition-all min-h-[48px]"
                dir="ltr"
                style={{
                  background: isCorrect ? 'rgba(34,197,94,0.15)' : isWrong ? 'rgba(239,68,68,0.15)' : isActive ? 'rgba(56,189,248,0.15)' : isMatched ? 'rgba(56,189,248,0.08)' : 'var(--surface-raised)',
                  border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : isWrong ? 'rgba(239,68,68,0.3)' : isActive ? 'rgba(56,189,248,0.4)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)',
                }}
              >
                {w.word}
              </button>
            )
          })}
        </div>

        {/* Meanings column */}
        <div className="space-y-2">
          {shuffledMeanings.map(m => {
            const matchedBy = Object.entries(selected).find(([, mid]) => mid === m.id)?.[0]
            const isCorrect = submitted && matchedBy === m.id
            const isWrong = submitted && matchedBy && matchedBy !== m.id
            return (
              <button
                key={m.id}
                onClick={() => handleMeaningClick(m.id)}
                className="w-full px-3 py-3 rounded-xl text-xs font-['Tajawal'] transition-all min-h-[48px]"
                style={{
                  background: isCorrect ? 'rgba(34,197,94,0.15)' : isWrong ? 'rgba(239,68,68,0.15)' : matchedBy ? 'rgba(56,189,248,0.08)' : 'var(--surface-raised)',
                  border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : isWrong ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-secondary)',
                }}
              >
                {m.meaning}
              </button>
            )
          })}
        </div>
      </div>

      {allMatched && !submitted && (
        <SubmitButton onClick={handleSubmit} />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════
// Exercise 2: Fill in the Blank
// ═════════════════════════════════════════════════════
function FillBlankExercise({ words, onComplete, onBack }) {
  const items = useMemo(
    () => words.filter(w => w.example_sentence).slice(0, 5),
    [words]
  )
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  // Fallback: if not enough words with sentences, use definition
  const effectiveItems = items.length >= 3 ? items : words.slice(0, 5)

  const handleSubmit = () => {
    setSubmitted(true)
    const correctWords = effectiveItems.filter(w => {
      const ans = (answers[w.id] || '').trim()
      return validateAnswer(ans, [w.word], { fullSentence: w.example_sentence })
    })
    const score = correctWords.length
    setTimeout(() => onComplete({ score, maxScore: effectiveItems.length, answers, correctWords }), 1500)
  }

  return (
    <div className="space-y-4">
      <ExerciseHeader title="أكمل الفراغ" onBack={onBack} />

      <div className="space-y-3">
        {effectiveItems.map((w, i) => {
          const sentence = w.example_sentence
            ? w.example_sentence.replace(new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___')
            : `The meaning is: ${w.definition_en} → ___`
          const userAns = (answers[w.id] || '').trim()
          const isCorrect = submitted && validateAnswer(userAns, [w.word], { fullSentence: w.example_sentence })
          const isWrong = submitted && !isCorrect

          return (
            <div
              key={w.id}
              className="rounded-xl p-4 space-y-2"
              style={{
                background: submitted ? (isCorrect ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)') : 'var(--surface-raised)',
                border: `1px solid ${submitted ? (isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : 'var(--border-subtle)'}`,
              }}
            >
              <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{i + 1}. {w.definition_ar}</p>
              <p className="text-sm text-[var(--text-secondary)] font-en leading-relaxed" dir="ltr">{sentence}</p>
              <input
                type="text"
                dir="ltr"
                value={answers[w.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [w.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' && !submitted) handleSubmit() }}
                disabled={submitted}
                placeholder="____ (one word)"
                style={{ fontSize: '16px' }}
                className="w-full px-3 py-2 rounded-lg text-base font-en bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-sky-500/50 outline-none transition-colors"
              />
              {!submitted && i === 0 && (
                <p className="text-xs text-[var(--text-muted)] font-['Tajawal']" dir="rtl">
                  اكتب الكلمة الناقصة فقط — لا تعيد كتابة الجملة كاملة
                </p>
              )}
              {submitted && isWrong && (
                <p className="text-xs text-emerald-400 font-en" dir="ltr">
                  Correct answer: <strong>{w.word}</strong>
                </p>
              )}
            </div>
          )
        })}
      </div>

      {!submitted && (
        <SubmitButton onClick={handleSubmit} label="تحقق من الكل" />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════
// Exercise 3: Choose the Correct Meaning (MCQ)
// ═════════════════════════════════════════════════════
function ChooseExercise({ words, allWords, onComplete, onBack }) {
  const items = useMemo(() => words.slice(0, 6), [words])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [finished, setFinished] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const correctWordsRef = useRef([])

  const current = items[currentIdx]
  const options = useMemo(() => {
    if (!current) return []
    // 1 correct + 3 random wrong
    const wrong = shuffle(allWords.filter(w => w.id !== current.id)).slice(0, 3)
    return shuffle([
      { id: current.id, text: current.definition_ar, correct: true },
      ...wrong.map(w => ({ id: w.id, text: w.definition_ar, correct: false })),
    ])
  }, [current, allWords])

  const handleSelect = (opt) => {
    if (selectedAnswer) return
    setSelectedAnswer(opt.id)
    if (opt.correct) {
      setScore(s => s + 1)
      // current is the word being asked; a correct pick means its meaning is known.
      if (current) correctWordsRef.current.push(current)
    }

    setTimeout(() => {
      if (currentIdx < items.length - 1) {
        setCurrentIdx(i => i + 1)
        setSelectedAnswer(null)
      } else {
        // `score` state hasn't flushed the final answer yet — compute it here
        // so the finished screen and onComplete report the same value.
        const computed = score + (opt.correct ? 1 : 0)
        setFinalScore(computed)
        setFinished(true)
        setTimeout(() => onComplete({ score: computed, maxScore: items.length, correctWords: correctWordsRef.current }), 800)
      }
    }, 1000)
  }

  if (finished) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-3xl">🌟</p>
        <p className="text-lg font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
          حصلت على {finalScore}/{items.length}
        </p>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="space-y-4">
      <ExerciseHeader title="اختر المعنى الصحيح" onBack={onBack} />

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
        <span>{currentIdx + 1}/{items.length}</span>
        <span>{score} صحيحة</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--surface-base)] overflow-hidden">
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${((currentIdx + 1) / items.length) * 100}%` }} />
      </div>

      {/* Word */}
      <div className="text-center py-4">
        <p className="text-2xl font-bold text-[var(--text-primary)] font-en" dir="ltr">{current.word}</p>
        {current.part_of_speech && (
          <p className="text-xs text-[var(--text-muted)] font-en mt-1" dir="ltr">{current.part_of_speech}</p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {options.map(opt => {
          const isSelected = selectedAnswer === opt.id
          const showCorrect = selectedAnswer && opt.correct
          const showWrong = isSelected && !opt.correct
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(opt)}
              className="w-full px-4 py-3.5 rounded-xl text-sm font-['Tajawal'] text-right transition-all min-h-[48px]"
              style={{
                background: showCorrect ? 'rgba(34,197,94,0.15)' : showWrong ? 'rgba(239,68,68,0.15)' : 'var(--surface-raised)',
                border: `1px solid ${showCorrect ? 'rgba(34,197,94,0.3)' : showWrong ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                color: 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2">
                {showCorrect && <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />}
                {showWrong && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                <span>{opt.text}</span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// Exercise 4: Word Scramble
// ═════════════════════════════════════════════════════
function ScrambleExercise({ words, onComplete, onBack }) {
  const items = useMemo(() => words.slice(0, 5), [words])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [built, setBuilt] = useState('')
  const [scrambled, setScrambled] = useState([])
  const [hintUsed, setHintUsed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [finished, setFinished] = useState(false)
  const correctWordsRef = useRef([])

  const current = items[currentIdx]

  // Scramble letters when word changes
  useEffect(() => {
    if (!current) return
    let letters = current.word.split('')
    // Ensure it's actually scrambled
    let attempts = 0
    do {
      letters = shuffle(letters)
      attempts++
    } while (letters.join('') === current.word && attempts < 10)
    setScrambled(letters.map((l, i) => ({ char: l, idx: i, used: false })))
    setBuilt('')
    setHintUsed(false)
    setSubmitted(false)
  }, [currentIdx, current])

  const handleLetterClick = (idx) => {
    if (submitted) return
    const letter = scrambled[idx]
    if (letter.used) return
    setBuilt(prev => prev + letter.char)
    setScrambled(prev => prev.map((l, i) => i === idx ? { ...l, used: true } : l))
  }

  const handleClear = () => {
    setBuilt('')
    setScrambled(prev => prev.map(l => ({ ...l, used: false })))
  }

  const handleHint = () => {
    if (hintUsed || !current) return
    setHintUsed(true)
    // Reveal first letter
    const firstChar = current.word[0]
    const letterIdx = scrambled.findIndex(l => l.char === firstChar && !l.used)
    if (letterIdx >= 0) {
      handleLetterClick(letterIdx)
    }
  }

  const handleCheck = () => {
    if (!current) return
    setSubmitted(true)
    const correct = built.toLowerCase() === current.word.toLowerCase()
    if (correct) {
      setScore(s => s + 1)
      correctWordsRef.current.push(current)
    }

    setTimeout(() => {
      if (currentIdx < items.length - 1) {
        setCurrentIdx(i => i + 1)
      } else {
        const finalScore = score + (correct ? 1 : 0)
        setFinished(true)
        setTimeout(() => onComplete({ score: finalScore, maxScore: items.length, correctWords: correctWordsRef.current }), 800)
      }
    }, 1200)
  }

  if (finished) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-3xl">🌟</p>
        <p className="text-lg font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
          حصلت على {score}/{items.length}
        </p>
      </div>
    )
  }

  if (!current) return null

  const isCorrect = submitted && built.toLowerCase() === current.word.toLowerCase()
  const isWrong = submitted && built.toLowerCase() !== current.word.toLowerCase()

  return (
    <div className="space-y-4">
      <ExerciseHeader title="رتّب الحروف" onBack={onBack} />

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
        <span>{currentIdx + 1}/{items.length}</span>
        <span>{score} صحيحة</span>
      </div>

      {/* Arabic meaning */}
      <div className="text-center py-3">
        <p className="text-lg font-bold font-['Tajawal']" style={{ color: 'var(--accent-amber)' }}>
          {current.definition_ar}
        </p>
      </div>

      {/* Built word display */}
      <div
        className="flex items-center justify-center gap-1 min-h-[48px] px-4 py-3 rounded-xl"
        dir="ltr"
        style={{
          background: isCorrect ? 'rgba(34,197,94,0.15)' : isWrong ? 'rgba(239,68,68,0.15)' : 'var(--surface-raised)',
          border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : isWrong ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
        }}
      >
        {built ? (
          <span className="text-xl font-bold font-en tracking-wider" style={{ color: 'var(--text-primary)' }}>{built}</span>
        ) : (
          <span className="text-sm text-[var(--text-muted)] font-['Tajawal']">اضغط على الحروف لتكوين الكلمة</span>
        )}
      </div>

      {/* Correct answer on wrong */}
      {isWrong && (
        <p className="text-center text-sm text-emerald-400 font-en" dir="ltr">
          {current.word}
        </p>
      )}

      {/* Scrambled letters */}
      <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
        {scrambled.map((l, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleLetterClick(i)}
            disabled={l.used || submitted}
            className="w-10 h-10 rounded-lg text-base font-bold font-en flex items-center justify-center transition-all"
            style={{
              background: l.used ? 'rgba(255,255,255,0.02)' : 'var(--surface-raised)',
              border: `1px solid ${l.used ? 'rgba(255,255,255,0.04)' : 'var(--border-subtle)'}`,
              color: l.used ? 'var(--text-muted)' : 'var(--text-primary)',
              opacity: l.used ? 0.3 : 1,
            }}
          >
            {l.char}
          </motion.button>
        ))}
      </div>

      {/* Actions */}
      {!submitted && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-xl text-xs font-bold font-['Tajawal'] text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors min-h-[40px]"
          >
            مسح
          </button>
          {!hintUsed && (
            <button
              onClick={handleHint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-['Tajawal'] text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors min-h-[40px]"
            >
              <Lightbulb size={13} />
              تلميح
            </button>
          )}
          {built.length === current.word.length && (
            <SubmitButton onClick={handleCheck} label="تحقق" small />
          )}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════
// Shared UI Components
// ═════════════════════════════════════════════════════
function ExerciseHeader({ title, onBack }) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>{title}</h4>
      <button
        onClick={onBack}
        className="text-xs font-bold font-['Tajawal'] text-sky-400 hover:text-sky-300 transition-colors"
      >
        العودة
      </button>
    </div>
  )
}

function SubmitButton({ onClick, label = 'تحقق من الإجابات', small }) {
  return (
    <div className="flex justify-center">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`${small ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm'} rounded-xl font-bold font-['Tajawal'] text-sky-300 bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500/15 transition-colors min-h-[44px]`}
      >
        {label}
      </motion.button>
    </div>
  )
}
