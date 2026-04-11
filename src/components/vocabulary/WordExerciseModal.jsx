import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Volume2, BookOpen, PenLine, Headphones } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'
import { safeCelebrate } from '../../lib/celebrations'
import { emitXP } from '../ui/XPFloater'
import WordRelationships from './WordRelationships'
import WordFamilySection from './WordFamilySection'

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

export default function WordExerciseModal({ word, unitWords, mastery, studentId, isOpen, onClose, onMasteryUpdate }) {
  const [activeExercise, setActiveExercise] = useState(null)

  // Hooks must be called before any conditional return (React rules of hooks)
  const distractors = useMemo(() => {
    if (!word) return []
    const others = (unitWords || []).filter(w => w.id !== word.id)
    return shuffle(others).slice(0, Math.min(3, others.length))
  }, [word?.id, unitWords])

  if (!isOpen || !word) return null

  const passedCount = [
    mastery?.meaning_exercise_passed,
    mastery?.sentence_exercise_passed,
    mastery?.listening_exercise_passed,
  ].filter(Boolean).length

  const handleExerciseComplete = async (exerciseKey, passed) => {
    if (!passed) return

    const fieldMap = {
      meaning: { passed: 'meaning_exercise_passed', attempts: 'meaning_exercise_attempts', at: 'meaning_exercise_passed_at' },
      sentence: { passed: 'sentence_exercise_passed', attempts: 'sentence_exercise_attempts', at: 'sentence_exercise_passed_at' },
      listening: { passed: 'listening_exercise_passed', attempts: 'listening_exercise_attempts', at: 'listening_exercise_passed_at' },
    }
    const fields = fieldMap[exerciseKey]
    if (!fields) return

    const prevAttempts = mastery?.[fields.attempts] || 0
    const updates = {
      student_id: studentId,
      vocabulary_id: word.id,
      [fields.passed]: true,
      [fields.attempts]: prevAttempts + 1,
      [fields.at]: new Date().toISOString(),
      last_practiced_at: new Date().toISOString(),
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

      // Bonus XP if all 3 mastered
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

        // Create SRS entry for spaced repetition review
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        await supabase.from('curriculum_vocabulary_srs').upsert({
          student_id: studentId,
          vocabulary_id: word.id,
          ease_factor: 2.5,
          interval_days: 1,
          repetitions: 1,
          next_review_at: tomorrow.toISOString(),
          last_quality: 5,
        }, { onConflict: 'student_id,vocabulary_id', ignoreDuplicates: true }).catch(() => {})
      }
    } catch (err) {
      console.error('[WordExercise] Save failed:', err)
      toast({ type: 'error', title: 'تعذر حفظ التقدم' })
    }

    setActiveExercise(null)
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
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
          style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10" style={{ background: '#0a1628' }}>
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

          {/* Content */}
          <div className="p-4 space-y-3">
            {activeExercise ? (
              <ExerciseView
                exerciseKey={activeExercise}
                word={word}
                distractors={distractors}
                onComplete={(passed) => handleExerciseComplete(activeExercise, passed)}
                onWrong={() => incrementAttempts(activeExercise)}
                onBack={() => setActiveExercise(null)}
              />
            ) : (
              <>
                {/* Exercise list */}
                {EXERCISES.map(ex => {
                  const fieldKey = `${ex.key}_exercise_passed`
                  const passed = mastery?.[fieldKey]
                  const attempts = mastery?.[`${ex.key}_exercise_attempts`] || 0
                  return (
                    <motion.button
                      key={ex.key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveExercise(ex.key)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl text-right transition-all"
                      style={{
                        background: passed ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${passed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${passed ? 'bg-emerald-500/15' : `bg-${ex.color}-500/10`}`}>
                        {passed ? <CheckCircle size={18} className="text-emerald-400" /> : <ex.icon size={18} className={`text-${ex.color}-400`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white font-['Tajawal']">{ex.label}</p>
                        <p className="text-[10px] text-white/40 font-['Tajawal']">
                          {passed ? 'تم الاجتياز' : attempts > 0 ? `${attempts} محاولة` : 'لم يُجرب بعد'}
                        </p>
                      </div>
                      {passed && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                    </motion.button>
                  )
                })}

                {/* Mastered celebration */}
                {passedCount >= 3 && (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-2xl">🌟</p>
                    <p className="text-sm font-bold text-emerald-400 font-['Tajawal']">أتقنت هذه الكلمة!</p>
                  </div>
                )}

                {((word.synonyms && word.synonyms.length > 0) ||
                  (word.antonyms && word.antonyms.length > 0)) && (
                  <div className="pt-2 border-t border-white/5">
                    <WordRelationships
                      synonyms={word.synonyms || []}
                      antonyms={word.antonyms || []}
                      studentId={studentId}
                    />
                  </div>
                )}

                {Array.isArray(word.word_family) && word.word_family.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <WordFamilySection wordFamily={word.word_family} studentId={studentId} />
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Exercise View (dispatches to specific exercise) ──────
function ExerciseView({ exerciseKey, word, distractors, onComplete, onWrong, onBack }) {
  switch (exerciseKey) {
    case 'meaning': return <MeaningExercise word={word} distractors={distractors} onComplete={onComplete} onWrong={onWrong} onBack={onBack} />
    case 'sentence': return <SentenceExercise word={word} distractors={distractors} onComplete={onComplete} onWrong={onWrong} onBack={onBack} />
    case 'listening': return <ListeningExercise word={word} distractors={distractors} onComplete={onComplete} onWrong={onWrong} onBack={onBack} />
    default: return null
  }
}

// ─── Exercise 1: Choose Arabic Meaning ──────────────────
function MeaningExercise({ word, distractors, onComplete, onWrong, onBack }) {
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)

  const options = useMemo(() => shuffle([
    { id: word.id, text: word.definition_ar, correct: true },
    ...distractors.map(d => ({ id: d.id, text: d.definition_ar, correct: false })),
  ]), [word, distractors])

  const handleSelect = (opt) => {
    if (answered) return
    setSelected(opt.id)
    setAnswered(true)

    if (opt.correct) {
      setTimeout(() => onComplete(true), 1000)
    } else {
      onWrong()
      // Allow retry after 1.5s
      setTimeout(() => { setSelected(null); setAnswered(false) }, 1500)
    }
  }

  return (
    <div className="space-y-4">
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
          const showCorrect = answered && opt.correct
          const showWrong = isSelected && !opt.correct
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(opt)}
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
    </div>
  )
}

// ─── Exercise 2: Complete the Sentence ──────────────────
function SentenceExercise({ word, distractors, onComplete, onWrong, onBack }) {
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)

  const sentence = word.example_sentence
    ? word.example_sentence.replace(new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')
    : `"${word.definition_en}" → _____`

  const options = useMemo(() => shuffle([
    { id: word.id, text: word.word, correct: true },
    ...distractors.map(d => ({ id: d.id, text: d.word, correct: false })),
  ]), [word, distractors])

  const handleSelect = (opt) => {
    if (answered) return
    setSelected(opt.id)
    setAnswered(true)

    if (opt.correct) {
      setTimeout(() => onComplete(true), 1000)
    } else {
      onWrong()
      setTimeout(() => { setSelected(null); setAnswered(false) }, 1500)
    }
  }

  return (
    <div className="space-y-4">
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
          const showCorrect = answered && opt.correct
          const showWrong = isSelected && !opt.correct
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(opt)}
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
    </div>
  )
}

// ─── Exercise 3: Listen & Choose ────────────────────────
function ListeningExercise({ word, distractors, onComplete, onWrong, onBack }) {
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  const options = useMemo(() => shuffle([
    { id: word.id, text: word.word, correct: true },
    ...distractors.map(d => ({ id: d.id, text: d.word, correct: false })),
  ]), [word, distractors])

  const playAudio = useCallback(() => {
    if (!word.audio_url) {
      // Fallback: use browser TTS
      const utterance = new SpeechSynthesisUtterance(word.word)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      utterance.onstart = () => setPlaying(true)
      utterance.onend = () => setPlaying(false)
      speechSynthesis.speak(utterance)
      return
    }
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(word.audio_url)
    audioRef.current.onplay = () => setPlaying(true)
    audioRef.current.onended = () => setPlaying(false)
    audioRef.current.onerror = () => setPlaying(false)
    audioRef.current.play().catch(() => setPlaying(false))
  }, [word])

  // Auto-play on mount
  useEffect(() => {
    const timer = setTimeout(playAudio, 500)
    return () => { clearTimeout(timer); if (audioRef.current) audioRef.current.pause() }
  }, [playAudio])

  const handleSelect = (opt) => {
    if (answered) return
    setSelected(opt.id)
    setAnswered(true)

    if (opt.correct) {
      setTimeout(() => onComplete(true), 1000)
    } else {
      onWrong()
      setTimeout(() => { setSelected(null); setAnswered(false) }, 1500)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white font-['Tajawal']">استمع واختر الكلمة</h4>
        <button onClick={onBack} className="text-xs text-sky-400 font-bold font-['Tajawal']">العودة</button>
      </div>

      {/* Play button */}
      <div className="flex justify-center py-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={playAudio}
          className="w-20 h-20 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: playing ? 'rgba(245,158,11,0.2)' : 'rgba(56,189,248,0.1)',
            border: `2px solid ${playing ? 'rgba(245,158,11,0.4)' : 'rgba(56,189,248,0.3)'}`,
          }}
        >
          <Volume2 size={32} className={playing ? 'text-amber-400' : 'text-sky-400'} />
        </motion.button>
      </div>
      <p className="text-center text-xs text-white/40 font-['Tajawal']">
        {playing ? 'جاري التشغيل...' : 'اضغط للاستماع مرة أخرى'}
      </p>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {options.map(opt => {
          const isSelected = selected === opt.id
          const showCorrect = answered && opt.correct
          const showWrong = isSelected && !opt.correct
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(opt)}
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
    </div>
  )
}
