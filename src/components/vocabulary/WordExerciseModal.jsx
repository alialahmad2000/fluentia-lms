import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBodyLock } from '../../hooks/useBodyLock'
import { X, CheckCircle, Volume2, BookOpen, PenLine, Headphones, Maximize2, AlertTriangle, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'
import { safeCelebrate } from '../../lib/celebrations'
import { emitXP } from '../ui/XPFloater'
import { recordExercise } from '../../services/vocab'
import WordDetailModal from './WordDetailModal'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const EXERCISES = [
  { key: 'meaning', label: 'اختر المعنى', icon: BookOpen, color: 'sky' },
  { key: 'sentence', label: 'أكمل الجملة', icon: PenLine, color: 'violet' },
  { key: 'listening', label: 'استمع واختر', icon: Headphones, color: 'amber' },
]

export default function WordExerciseModal({ word, unitWords, mastery, studentId, isOpen, onClose, onMasteryUpdate, onNextWord, hasNextWord }) {
  const [activeExercise, setActiveExercise] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailInitialTab, setDetailInitialTab] = useState('meaning')

  // Live in-session pass state, seeded from the mastery prop at open. Derive the
  // header dots + passedCount + mastery screen from THIS so progress reflects
  // live as the student passes exercises in-session (the prop is only re-fetched
  // after the modal closes/re-opens).
  const [passed, setPassed] = useState(() => ({
    meaning: !!mastery?.meaning_exercise_passed,
    sentence: !!mastery?.sentence_exercise_passed,
    listening: !!mastery?.listening_exercise_passed,
  }))

  // Hooks must be called before any conditional return (React rules of hooks)
  const distractors = useMemo(() => {
    if (!word) return []
    const others = (unitWords || []).filter(w => w.id !== word.id)
    return shuffle(others).slice(0, Math.min(3, others.length))
  }, [word?.id, unitWords])

  // Reset on word change (next-word swap): close any active exercise + re-seed
  // local pass state from the new word's mastery so it opens fresh.
  useEffect(() => {
    const seeded = {
      meaning: !!mastery?.meaning_exercise_passed,
      sentence: !!mastery?.sentence_exercise_passed,
      listening: !!mastery?.listening_exercise_passed,
    }
    setPassed(seeded)
    // Smooth flow: auto-START the first not-yet-passed exercise instead of
    // dropping the student on a 3-item menu they have to pick from for every
    // word. If all 3 are already passed -> null -> the mastery + next-word screen.
    const firstUnpassed = ['meaning', 'sentence', 'listening'].find(k => !seeded[k]) || null
    setActiveExercise(firstUnpassed)
    // mastery is keyed to word; re-seed when the word identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id])

  // Lock body scroll + hide mobile nav while open (iOS Safari safe)
  useBodyLock(isOpen)

  if (!isOpen || !word) return null

  const passedCount = [passed.meaning, passed.sentence, passed.listening].filter(Boolean).length

  // Order of exercises for auto-advance: meaning → sentence → listening
  const EXERCISE_ORDER = ['meaning', 'sentence', 'listening']
  const nextUnpassedExercise = (passedState) =>
    EXERCISE_ORDER.find(key => !passedState[key]) || null

  const handleExerciseComplete = async (exerciseKey, ok) => {
    // NOTE: param renamed `passed` -> `ok`. It previously SHADOWED the `passed`
    // STATE object below, so `passedAfter` read booleans off a boolean
    // (`true.meaning` -> undefined) and the flow never reached exercise 3 /
    // mastered / next-word. The rename restores the whole smooth flow.
    if (!ok) return

    // Unified store: record the exercise pass into vocab_cards (flags + mastery +
    // schedules into review) so curriculum exercises feed words-known + review.
    // (Replaces the old curriculum_vocabulary_srs bridge.) The per-exercise
    // vocabulary_word_mastery row below is still the source of truth for unit UI.
    try {
      await recordExercise(word.id, exerciseKey, { word: word.word, meaningAr: word.definition_ar })
    } catch (rerr) {
      console.warn('[WordExercise] recordExercise failed:', rerr?.message)
    }

    const fieldMap = {
      meaning: { passed: 'meaning_exercise_passed', attempts: 'meaning_exercise_attempts', at: 'meaning_exercise_passed_at' },
      sentence: { passed: 'sentence_exercise_passed', attempts: 'sentence_exercise_attempts', at: 'sentence_exercise_passed_at' },
      listening: { passed: 'listening_exercise_passed', attempts: 'listening_exercise_attempts', at: 'listening_exercise_passed_at' },
    }
    const fields = fieldMap[exerciseKey]
    if (!fields) return

    const prevAttempts = mastery?.[fields.attempts] || 0

    // MEGA-FIX V2 Phase F (V1): compute mastery_level explicitly. The DB has
    // no trigger for this column, so without this code mastery_level stays
    // NULL forever and downstream auto-advance + 'mastered' badge never fire.
    // Snapshot the post-update state by OR-ing this pass with the existing
    // booleans, then count how many of the 3 exercises are passed.
    const passedAfter = {
      meaning: exerciseKey === 'meaning' ? true : !!passed.meaning,
      sentence: exerciseKey === 'sentence' ? true : !!passed.sentence,
      listening: exerciseKey === 'listening' ? true : !!passed.listening,
    }
    const passedCountAfter = [passedAfter.meaning, passedAfter.sentence, passedAfter.listening].filter(Boolean).length
    const nextMasteryLevel = passedCountAfter >= 3 ? 'mastered' : passedCountAfter >= 1 ? 'learning' : 'new'

    // Live-sync the header dots + mastery screen immediately on this pass.
    setPassed(passedAfter)

    const updates = {
      student_id: studentId,
      vocabulary_id: word.id,
      [fields.passed]: true,
      [fields.attempts]: prevAttempts + 1,
      [fields.at]: new Date().toISOString(),
      last_practiced_at: new Date().toISOString(),
      mastery_level: nextMasteryLevel,
    }

    try {
      const { data, error } = await supabase
        .from('vocabulary_word_mastery')
        .upsert(updates, { onConflict: 'student_id,vocabulary_id' })
        .select()
      if (error) throw error

      const updated = data?.[0]
      onMasteryUpdate?.(updated)

      // XP: +3 for first pass of each exercise
      if (!mastery?.[fields.passed]) {
        await supabase.from('xp_transactions').insert({
          student_id: studentId,
          amount: 3,
          reason: 'correct_answer',
          description: `أتقن تمرين "${word.word}"`,
        }).catch(() => {})
        try { emitXP(3, `تمرين "${word.word}"`) } catch {}
        try { safeCelebrate('correct_answer') } catch {}
      }

      // Bonus XP if all 3 mastered.
      // recordExercise() above already created/advanced the unified vocab_cards
      // row + scheduled the word into review on each exercise pass.
      if (updated?.mastery_level === 'mastered' && mastery?.mastery_level !== 'mastered') {
        await supabase.from('xp_transactions').insert({
          student_id: studentId,
          amount: 5,
          reason: 'correct_answer',
          description: `أتقن كلمة "${word.word}" بالكامل`,
        }).catch(() => {})
        try { emitXP(5, `أتقنت "${word.word}"`) } catch {}
        try { safeCelebrate('word_mastered') } catch {}
        toast({ type: 'success', title: `+5 XP — أتقنت "${word.word}"!` })
      }
    } catch (err) {
      // Surface the real DB error (code + message) instead of swallowing it.
      // A silent generic toast hid the trg_recompute_unit_progress() "no field
      // unit_id" throw for 11 days. If the save ever fails again, make it loud.
      const detail = err?.code ? `${err.code}: ${err.message}` : (err?.message || String(err))
      console.error('[WordExercise] Save failed:', detail, err)
      toast({ type: 'error', title: 'تعذر حفظ التقدم', description: detail?.slice(0, 160) })
    }

    // Auto-advance through the 3 exercises in order. If a next NOT-yet-passed
    // exercise exists → jump straight to it (single cohesive flow). Only when all
    // 3 are passed → land on the mastery screen (activeExercise=null).
    const nextKey = nextUnpassedExercise(passedAfter)
    setActiveExercise(nextKey)
  }

  const incrementAttempts = async (exerciseKey) => {
    const fieldMap = {
      meaning: 'meaning_exercise_attempts',
      sentence: 'sentence_exercise_attempts',
      listening: 'listening_exercise_attempts',
    }
    const field = fieldMap[exerciseKey]
    if (!field) return

    try {
      await supabase
        .from('vocabulary_word_mastery')
        .upsert({
          student_id: studentId,
          vocabulary_id: word.id,
          [field]: (mastery?.[field] || 0) + 1,
          last_practiced_at: new Date().toISOString(),
        }, { onConflict: 'student_id,vocabulary_id' })
    } catch {}
    // Wrong answers no longer bridge to the retired curriculum_vocabulary_srs.
    // The unified store records progress on exercise *passes* via recordExercise.
  }

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl h-[100dvh] sm:h-auto sm:max-h-[90dvh]"
          style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — fixed at top, never scrolls */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10" style={{ background: '#0a1628', paddingTop: 'calc(16px + var(--sat))' }}>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white font-['Inter']" dir="ltr">{word.word}</h3>
              <p className="text-xs text-white/50 font-['Tajawal']">{word.definition_ar}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mastery badge */}
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: i < passedCount ? '#22c55e' : 'rgba(255,255,255,0.1)' }}
                  />
                ))}
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content — scrollable, respects iOS home indicator */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
            style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(24px + var(--sab))' }}
          >
            {activeExercise ? (
              <ExerciseView
                exerciseKey={activeExercise}
                word={word}
                distractors={distractors}
                stepIndex={EXERCISE_ORDER.indexOf(activeExercise)}
                onComplete={(ok) => handleExerciseComplete(activeExercise, ok)}
                onWrong={() => incrementAttempts(activeExercise)}
                onBack={() => setActiveExercise(null)}
              />
            ) : (
              <>
                {/* High-severity pronunciation warning — compact, opens النطق tab */}
                {word.pronunciation_alert?.severity === 'high' && (
                  <button
                    type="button"
                    onClick={() => { setDetailInitialTab('pronunciation'); setDetailOpen(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-['Tajawal'] text-right hover:bg-amber-500/15 transition-colors"
                  >
                    <AlertTriangle size={14} className="shrink-0 animate-pulse" />
                    <span className="flex-1">انتبه — فيه تنبيه نطق لهذه الكلمة</span>
                    <span className="text-amber-400 text-[11px]">عرض</span>
                  </button>
                )}

                {/* Exercise list */}
                {EXERCISES.map(ex => {
                  // Live-sync from local pass state (updates as exercises pass in-session)
                  const isPassed = !!passed[ex.key]
                  const attempts = mastery?.[`${ex.key}_exercise_attempts`] || 0
                  return (
                    <motion.button
                      key={ex.key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveExercise(ex.key)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl text-right transition-all"
                      style={{
                        background: isPassed ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isPassed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPassed ? 'bg-emerald-500/15' : `bg-${ex.color}-500/10`}`}>
                        {isPassed ? <CheckCircle size={18} className="text-emerald-400" /> : <ex.icon size={18} className={`text-${ex.color}-400`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white font-['Tajawal']">{ex.label}</p>
                        <p className="text-[10px] text-white/40 font-['Tajawal']">
                          {isPassed ? 'تم الاجتياز' : attempts > 0 ? `${attempts} محاولة` : 'لم يُجرب بعد'}
                        </p>
                      </div>
                      {isPassed && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                    </motion.button>
                  )
                })}

                {/* Mastered celebration + next-word CTA */}
                {passedCount >= 3 && (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-2xl">🌟</p>
                    <p className="text-sm font-bold text-emerald-400 font-['Tajawal']">أتقنت هذه الكلمة!</p>
                    {hasNextWord ? (
                      <button
                        type="button"
                        onClick={() => onNextWord?.()}
                        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-[#0a1628] font-['Tajawal'] transition-transform active:scale-[0.98] min-h-[48px]"
                        style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)' }}
                      >
                        <span>الكلمة التالية</span>
                        <ChevronLeft size={18} className="shrink-0" />
                      </button>
                    ) : (
                      <p className="text-sm font-bold text-amber-300 font-['Tajawal']">أتقنت كل كلمات الوحدة! 🎉</p>
                    )}
                  </div>
                )}

                {/* Single CTA → opens WordDetailModal with all enrichments tabbed */}
                <button
                  type="button"
                  onClick={() => { setDetailInitialTab('meaning'); setDetailOpen(true) }}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-['Tajawal'] text-white/80 transition-colors min-h-[48px]"
                >
                  <Maximize2 size={15} className="text-sky-300" />
                  <span>عرض كل التفاصيل (المعنى، المرادفات، العائلة، النطق)</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    <WordDetailModal
      word={word}
      studentId={studentId}
      isOpen={detailOpen}
      onClose={() => setDetailOpen(false)}
      initialTab={detailInitialTab}
    />
    </>
  )
}

// ─── Exercise step progress (تمرين X / 3) ─────────────────
function ExerciseProgress({ stepIndex }) {
  const current = (stepIndex ?? 0) + 1
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-white/40 font-['Tajawal']">تمرين {current} / 3</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === stepIndex ? 18 : 10,
                background: i <= stepIndex ? 'linear-gradient(135deg,#38bdf8,#818cf8)' : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#38bdf8,#818cf8)' }}
          initial={{ width: 0 }}
          animate={{ width: `${(current / 3) * 100}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>
    </div>
  )
}

// ─── Exercise View (dispatches to specific exercise) ──────
function ExerciseView({ exerciseKey, word, distractors, stepIndex, onComplete, onWrong, onBack }) {
  switch (exerciseKey) {
    case 'meaning': return <MeaningExercise word={word} distractors={distractors} stepIndex={stepIndex} onComplete={onComplete} onWrong={onWrong} onBack={onBack} />
    case 'sentence': return <SentenceExercise word={word} distractors={distractors} stepIndex={stepIndex} onComplete={onComplete} onWrong={onWrong} onBack={onBack} />
    case 'listening': return <ListeningExercise word={word} distractors={distractors} stepIndex={stepIndex} onComplete={onComplete} onWrong={onWrong} onBack={onBack} />
    default: return null
  }
}

// ─── Exercise 1: Choose Arabic Meaning ──────────────────
function MeaningExercise({ word, distractors, stepIndex, onComplete, onWrong, onBack }) {
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [shakeId, setShakeId] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const options = useMemo(() => shuffle([
    { id: word.id, text: word.definition_ar, correct: true },
    ...distractors.map(d => ({ id: d.id, text: d.definition_ar, correct: false })),
  ]), [word, distractors])

  const correctText = word.definition_ar

  const handleSelect = (opt) => {
    if (answered) return
    setSelected(opt.id)
    setAnswered(true)

    if (opt.correct) {
      navigator.vibrate?.(8)
      setTimeout(() => onComplete(true), 500)
    } else {
      onWrong()
      navigator.vibrate?.(15)
      setShakeId(opt.id)
      const nextWrong = wrongAttempts + 1
      setWrongAttempts(nextWrong)
      if (nextWrong >= 2) {
        // After 2 wrong attempts, reveal the correct option + let them tap to continue
        setRevealed(true)
        setTimeout(() => { setShakeId(null) }, 400)
      } else {
        setTimeout(() => { setSelected(null); setAnswered(false); setShakeId(null) }, 1200)
      }
    }
  }

  return (
    <div className="space-y-4">
      <ExerciseProgress stepIndex={stepIndex} />
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white font-['Tajawal']">اختر المعنى الصحيح</h4>
        <button onClick={onBack} className="text-xs text-sky-400 font-bold font-['Tajawal']">العودة</button>
      </div>

      <div className="text-center py-4">
        <p className="text-2xl font-bold text-white font-['Inter']" dir="ltr">{word.word}</p>
        {word.part_of_speech && <p className="text-xs text-white/40 mt-1 font-['Inter']" dir="ltr">{word.part_of_speech}</p>}
      </div>

      <div className="space-y-2">
        {options.map(opt => {
          const isSelected = selected === opt.id
          // Highlight correct when answered correctly OR when revealed after 2 wrongs
          const showCorrect = (answered || revealed) && opt.correct
          const showWrong = isSelected && !opt.correct && !showCorrect
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.97 }}
              animate={shakeId === opt.id ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => (revealed && opt.correct ? onComplete(false) : handleSelect(opt))}
              className="w-full px-4 py-3.5 rounded-xl text-sm font-['Tajawal'] text-right transition-all min-h-[48px]"
              style={{
                background: showCorrect ? 'rgba(34,197,94,0.15)' : showWrong ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${showCorrect ? 'rgba(34,197,94,0.3)' : showWrong ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              <div className="flex items-center gap-2">
                {showCorrect && <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />}
                {showWrong && <X size={16} className="text-red-400 flex-shrink-0" />}
                <span>{opt.text}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {showWrongCaption(answered, selected, options) && (
        <p className="text-center text-xs text-white/50 font-['Tajawal']">
          الإجابة: <span className="text-emerald-400 font-bold">{correctText}</span>
        </p>
      )}
      {revealed && (
        <p className="text-center text-[11px] text-white/40 font-['Tajawal']">اضغط على الإجابة الصحيحة للمتابعة</p>
      )}
    </div>
  )
}

// Helper: show the "الإجابة: …" caption only when the current answer is wrong
function showWrongCaption(answered, selectedId, options) {
  if (!answered) return false
  const sel = options.find(o => o.id === selectedId)
  return !!sel && !sel.correct
}

// ─── Exercise 2: Complete the Sentence ──────────────────
function SentenceExercise({ word, distractors, stepIndex, onComplete, onWrong, onBack }) {
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [shakeId, setShakeId] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const sentence = word.example_sentence
    ? word.example_sentence.replace(new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')
    : `"${word.definition_en}" → _____`

  const options = useMemo(() => shuffle([
    { id: word.id, text: word.word, correct: true },
    ...distractors.map(d => ({ id: d.id, text: d.word, correct: false })),
  ]), [word, distractors])

  const correctText = word.word

  const handleSelect = (opt) => {
    if (answered) return
    setSelected(opt.id)
    setAnswered(true)

    if (opt.correct) {
      navigator.vibrate?.(8)
      setTimeout(() => onComplete(true), 500)
    } else {
      onWrong()
      navigator.vibrate?.(15)
      setShakeId(opt.id)
      const nextWrong = wrongAttempts + 1
      setWrongAttempts(nextWrong)
      if (nextWrong >= 2) {
        setRevealed(true)
        setTimeout(() => { setShakeId(null) }, 400)
      } else {
        setTimeout(() => { setSelected(null); setAnswered(false); setShakeId(null) }, 1200)
      }
    }
  }

  return (
    <div className="space-y-4">
      <ExerciseProgress stepIndex={stepIndex} />
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white font-['Tajawal']">أكمل الجملة</h4>
        <button onClick={onBack} className="text-xs text-sky-400 font-bold font-['Tajawal']">العودة</button>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs text-white/40 font-['Tajawal'] mb-2">{word.definition_ar}</p>
        <p className="text-sm text-white/80 font-['Inter'] leading-relaxed" dir="ltr">{sentence}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map(opt => {
          const isSelected = selected === opt.id
          const showCorrect = (answered || revealed) && opt.correct
          const showWrong = isSelected && !opt.correct && !showCorrect
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.97 }}
              animate={shakeId === opt.id ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => (revealed && opt.correct ? onComplete(false) : handleSelect(opt))}
              className="px-4 py-3 rounded-xl text-sm font-bold font-['Inter'] transition-all min-h-[48px]"
              dir="ltr"
              style={{
                background: showCorrect ? 'rgba(34,197,94,0.15)' : showWrong ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${showCorrect ? 'rgba(34,197,94,0.3)' : showWrong ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              {opt.text}
            </motion.button>
          )
        })}
      </div>

      {showWrongCaption(answered, selected, options) && (
        <p className="text-center text-xs text-white/50 font-['Tajawal']">
          الإجابة: <span className="text-emerald-400 font-bold font-['Inter']" dir="ltr">{correctText}</span>
        </p>
      )}
      {revealed && (
        <p className="text-center text-[11px] text-white/40 font-['Tajawal']">اضغط على الإجابة الصحيحة للمتابعة</p>
      )}
    </div>
  )
}

// ─── Exercise 3: Listen & Choose ────────────────────────
function ListeningExercise({ word, distractors, stepIndex, onComplete, onWrong, onBack }) {
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [shakeId, setShakeId] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const audioRef = useRef(null)

  const options = useMemo(() => shuffle([
    { id: word.id, text: word.word, correct: true },
    ...distractors.map(d => ({ id: d.id, text: d.word, correct: false })),
  ]), [word, distractors])

  const correctText = word.word

  const playAudio = useCallback(() => {
    if (!word.audio_url) {
      // Fallback: use browser TTS
      try {
        const utterance = new SpeechSynthesisUtterance(word.word)
        utterance.lang = 'en-US'
        utterance.rate = 0.8
        utterance.onstart = () => { setPlaying(true); setNeedsTap(false) }
        utterance.onend = () => setPlaying(false)
        speechSynthesis.speak(utterance)
      } catch {
        setNeedsTap(true)
      }
      return
    }
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(word.audio_url)
    audioRef.current.onplay = () => { setPlaying(true); setNeedsTap(false) }
    audioRef.current.onended = () => setPlaying(false)
    audioRef.current.onerror = () => { setPlaying(false); setNeedsTap(true) }
    // play() must run synchronously inside the gesture path (entering this
    // exercise is itself the result of the student's tap). On iOS Safari a
    // detached setTimeout(play) silently fails — so we call play() directly in
    // the mount effect and surface a tap affordance if it's rejected.
    audioRef.current.play().then(() => setNeedsTap(false)).catch(() => { setPlaying(false); setNeedsTap(true) })
  }, [word])

  // Play immediately on mount (gesture-synchronous — no setTimeout delay)
  useEffect(() => {
    playAudio()
    return () => { if (audioRef.current) audioRef.current.pause() }
  }, [playAudio])

  const handleSelect = (opt) => {
    if (answered) return
    setSelected(opt.id)
    setAnswered(true)

    if (opt.correct) {
      navigator.vibrate?.(8)
      setTimeout(() => onComplete(true), 500)
    } else {
      onWrong()
      navigator.vibrate?.(15)
      setShakeId(opt.id)
      const nextWrong = wrongAttempts + 1
      setWrongAttempts(nextWrong)
      if (nextWrong >= 2) {
        setRevealed(true)
        setTimeout(() => { setShakeId(null) }, 400)
      } else {
        setTimeout(() => { setSelected(null); setAnswered(false); setShakeId(null) }, 1200)
      }
    }
  }

  return (
    <div className="space-y-4">
      <ExerciseProgress stepIndex={stepIndex} />
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white font-['Tajawal']">استمع واختر الكلمة</h4>
        <button onClick={onBack} className="text-xs text-sky-400 font-bold font-['Tajawal']">العودة</button>
      </div>

      {/* Play button */}
      <div className="flex justify-center py-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={playAudio}
          animate={needsTap ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={needsTap ? { repeat: Infinity, duration: 1.1 } : { duration: 0.2 }}
          className="w-20 h-20 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: needsTap ? 'rgba(56,189,248,0.25)' : playing ? 'rgba(245,158,11,0.2)' : 'rgba(56,189,248,0.1)',
            border: `2px solid ${needsTap ? 'rgba(56,189,248,0.6)' : playing ? 'rgba(245,158,11,0.4)' : 'rgba(56,189,248,0.3)'}`,
          }}
        >
          <Volume2 size={32} className={playing ? 'text-amber-400' : 'text-sky-400'} />
        </motion.button>
      </div>
      <p className="text-center text-xs font-['Tajawal'] font-bold" style={{ color: needsTap ? '#38bdf8' : 'rgba(255,255,255,0.4)' }}>
        {needsTap ? 'اضغط للاستماع 🔊' : playing ? 'جاري التشغيل...' : 'اضغط للاستماع مرة أخرى'}
      </p>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {options.map(opt => {
          const isSelected = selected === opt.id
          const showCorrect = (answered || revealed) && opt.correct
          const showWrong = isSelected && !opt.correct && !showCorrect
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.97 }}
              animate={shakeId === opt.id ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => (revealed && opt.correct ? onComplete(false) : handleSelect(opt))}
              className="px-4 py-3.5 rounded-xl text-sm font-bold font-['Inter'] transition-all min-h-[48px]"
              dir="ltr"
              style={{
                background: showCorrect ? 'rgba(34,197,94,0.15)' : showWrong ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${showCorrect ? 'rgba(34,197,94,0.3)' : showWrong ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              {opt.text}
            </motion.button>
          )
        })}
      </div>

      {showWrongCaption(answered, selected, options) && (
        <p className="text-center text-xs text-white/50 font-['Tajawal']">
          الإجابة: <span className="text-emerald-400 font-bold font-['Inter']" dir="ltr">{correctText}</span>
        </p>
      )}
      {revealed && (
        <p className="text-center text-[11px] text-white/40 font-['Tajawal']">اضغط على الإجابة الصحيحة للمتابعة</p>
      )}
    </div>
  )
}
