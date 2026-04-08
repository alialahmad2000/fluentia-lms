import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, RotateCcw, Lightbulb, Shuffle, PenLine, ListChecks, Puzzle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'

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
const EXERCISES = [
  { key: 'match', label: 'اربط الكلمة بمعناها', icon: Puzzle },
  { key: 'fill_blank', label: 'أكمل الفراغ', icon: PenLine },
  { key: 'choose', label: 'اختر المعنى الصحيح', icon: ListChecks },
  { key: 'scramble', label: 'رتّب الحروف', icon: Shuffle },
]

// ═════════════════════════════════════════════════════
// Main Exercises Component
// ═════════════════════════════════════════════════════
export default function VocabularyExercises({ unitId, allWords }) {
  const { profile } = useAuthStore()
  const [activeExercise, setActiveExercise] = useState(null)
  const [completedExercises, setCompletedExercises] = useState({})
  const [savedProgress, setSavedProgress] = useState(null)
  const progressIdRef = useRef(null)

  // Load saved exercise progress
  useEffect(() => {
    if (!profile?.id || !unitId) return
    let mounted = true
    const load = async () => {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', profile.id)
        .eq('unit_id', unitId)
        .eq('section_type', 'vocabulary_exercise')
        .maybeSingle()
      if (!mounted) return
      if (data) {
        progressIdRef.current = data.id
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
  }, [profile?.id, unitId])

  // Save exercise result
  const saveResult = useCallback(async (exerciseKey, result) => {
    if (!profile?.id || !unitId) return

    const updated = {
      ...completedExercises,
      [exerciseKey]: { ...result, completed: true },
    }
    setCompletedExercises(updated)

    const totalScore = Object.values(updated).reduce((s, e) => s + (e.score || 0), 0)
    const totalMax = Object.values(updated).reduce((s, e) => s + (e.maxScore || 0), 0)
    const allDone = Object.keys(updated).length >= 4

    const row = {
      student_id: profile.id,
      unit_id: unitId,
      section_type: 'vocabulary_exercise',
      status: allDone ? 'completed' : 'in_progress',
      score: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
      answers: { exercises: updated },
      completed_at: allDone ? new Date().toISOString() : null,
    }

    if (progressIdRef.current) {
      await supabase
        .from('student_curriculum_progress')
        .update(row)
        .eq('id', progressIdRef.current)
    } else {
      const { data: inserted } = await supabase
        .from('student_curriculum_progress')
        .insert(row)
        .select('id')
        .single()
      if (inserted) progressIdRef.current = inserted.id
    }

    // Award XP on first full completion
    if (allDone && !savedProgress?.completed_at) {
      const xp = await awardCurriculumXP(profile.id, 'vocabulary_exercise', row.score, unitId)
      if (xp > 0) toast({ type: 'success', title: `+${xp} XP — أحسنت!` })
    }
  }, [profile?.id, unitId, completedExercises, savedProgress])

  if (!allWords?.length || allWords.length < 4) return null

  const completedCount = Object.keys(completedExercises).length

  return (
    <div className="space-y-4 mt-8">
      {/* Section header */}
      <div className="text-center space-y-1 py-4">
        <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal'] pt-4">تمارين المفردات</h3>
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">أكمل التمارين لتثبيت الكلمات</p>
        <p className="text-xs font-medium font-['Tajawal']" style={{ color: completedCount >= 4 ? '#22c55e' : '#38bdf8' }}>
          {completedCount}/4 تمارين مكتملة
        </p>
      </div>

      {/* Exercise cards */}
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXERCISES.map(ex => {
            const done = !!completedExercises[ex.key]
            const result = completedExercises[ex.key]
            return (
              <motion.button
                key={ex.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveExercise(ex.key)}
                className="flex items-center gap-3 p-4 rounded-xl text-right transition-all"
                style={{
                  background: done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500/15' : 'bg-sky-500/10'}`}>
                  {done ? <CheckCircle size={18} className="text-emerald-400" /> : <ex.icon size={18} className="text-sky-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>{ex.label}</p>
                  {done && result && (
                    <p className="text-xs font-['Tajawal']" style={{ color: '#22c55e' }}>
                      {result.score}/{result.maxScore}
                    </p>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Regenerate button */}
      {!activeExercise && completedCount > 0 && (
        <button
          onClick={() => { setCompletedExercises({}); setActiveExercise(null) }}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-xs font-bold font-['Tajawal'] text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 transition-colors"
        >
          <RotateCcw size={13} />
          أعد التمارين
        </button>
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
    const score = items.filter(w => selected[w.id] === w.id).length
    setTimeout(() => onComplete({ score, maxScore: items.length, answers: selected }), 1500)
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
                className="w-full px-3 py-3 rounded-xl text-sm font-semibold font-['Inter'] transition-all min-h-[48px]"
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
    const score = effectiveItems.filter(w => {
      const ans = (answers[w.id] || '').trim().toLowerCase()
      return ans === w.word.toLowerCase()
    }).length
    setTimeout(() => onComplete({ score, maxScore: effectiveItems.length, answers }), 1500)
  }

  return (
    <div className="space-y-4">
      <ExerciseHeader title="أكمل الفراغ" onBack={onBack} />

      <div className="space-y-3">
        {effectiveItems.map((w, i) => {
          const sentence = w.example_sentence
            ? w.example_sentence.replace(new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___')
            : `The meaning is: ${w.definition_en} → ___`
          const userAns = (answers[w.id] || '').trim().toLowerCase()
          const isCorrect = submitted && userAns === w.word.toLowerCase()
          const isWrong = submitted && userAns !== w.word.toLowerCase()

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
              <p className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">{sentence}</p>
              <input
                type="text"
                dir="ltr"
                value={answers[w.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [w.id]: e.target.value }))}
                disabled={submitted}
                placeholder="Type the word..."
                className="w-full px-3 py-2 rounded-lg text-sm font-['Inter'] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-sky-500/50 outline-none transition-colors"
              />
              {submitted && isWrong && (
                <p className="text-xs text-emerald-400 font-['Inter']" dir="ltr">
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
    if (opt.correct) setScore(s => s + 1)

    setTimeout(() => {
      if (currentIdx < items.length - 1) {
        setCurrentIdx(i => i + 1)
        setSelectedAnswer(null)
      } else {
        setFinished(true)
        const finalScore = score + (opt.correct ? 1 : 0)
        setTimeout(() => onComplete({ score: finalScore, maxScore: items.length }), 800)
      }
    }, 1000)
  }

  if (finished) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-3xl">🌟</p>
        <p className="text-lg font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
          حصلت على {score + (selectedAnswer && items[currentIdx] && options.find(o => o.id === selectedAnswer)?.correct ? 0 : 0)}/{items.length}
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
        <p className="text-2xl font-bold text-[var(--text-primary)] font-['Inter']" dir="ltr">{current.word}</p>
        {current.part_of_speech && (
          <p className="text-xs text-[var(--text-muted)] font-['Inter'] mt-1" dir="ltr">{current.part_of_speech}</p>
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
    if (correct) setScore(s => s + 1)

    setTimeout(() => {
      if (currentIdx < items.length - 1) {
        setCurrentIdx(i => i + 1)
      } else {
        const finalScore = score + (correct ? 1 : 0)
        setFinished(true)
        setTimeout(() => onComplete({ score: finalScore, maxScore: items.length }), 800)
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
          <span className="text-xl font-bold font-['Inter'] tracking-wider" style={{ color: 'var(--text-primary)' }}>{built}</span>
        ) : (
          <span className="text-sm text-[var(--text-muted)] font-['Tajawal']">اضغط على الحروف لتكوين الكلمة</span>
        )}
      </div>

      {/* Correct answer on wrong */}
      {isWrong && (
        <p className="text-center text-sm text-emerald-400 font-['Inter']" dir="ltr">
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
            className="w-10 h-10 rounded-lg text-base font-bold font-['Inter'] flex items-center justify-center transition-all"
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
        className={`${small ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm'} rounded-xl font-bold font-['Tajawal'] text-white bg-sky-500 hover:bg-sky-600 transition-colors min-h-[44px]`}
      >
        {label}
      </motion.button>
    </div>
  )
}
