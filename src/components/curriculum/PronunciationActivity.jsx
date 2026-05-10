import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, RotateCcw, Trophy, Mic, Sparkles, Home } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { toast } from '../../components/ui/FluentiaToast'
import { useQueryClient } from '@tanstack/react-query'

const PASS_THRESHOLD = 0.7 // 70% to pass
const MAX_ATTEMPTS = 3
const QUIZ_SIZE = 5

// ─── Main Component ───
export default function PronunciationActivity({ pronunciationData, unitId, onComplete, onBack }) {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState('intro') // intro | flashcards | quiz | complete
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [score, setScore] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const { focus_type, title_ar, title_en, description_ar, content } = pronunciationData
  const items = content?.items || []
  const ruleSummary = content?.rule_summary_ar

  // Generate quiz questions from content
  const quizQuestions = useMemo(() => {
    return generateQuiz(focus_type, items)
  }, [focus_type, items])

  const totalCards = items.length

  // Mark in_progress when starting
  const handleStart = async () => {
    if (profile?.id) {
      // Check if record already exists
      const { data: existing } = await supabase
        .from('student_curriculum_progress')
        .select('id')
        .eq('student_id', profile.id)
        .eq('unit_id', unitId)
        .eq('section_type', 'pronunciation')
        .maybeSingle()

      if (existing) {
        await supabase
          .from('student_curriculum_progress')
          .update({ status: 'in_progress' })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('student_curriculum_progress')
          .insert({
            student_id: profile.id,
            unit_id: unitId,
            section_type: 'pronunciation',
            status: 'in_progress',
          })
      }
    }
    setPhase('flashcards')
  }

  const handleNextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(i => i + 1)
    } else {
      setPhase('quiz')
    }
  }

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(i => i - 1)
    }
  }

  const handleQuizAnswer = (questionIndex, answer) => {
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answer }))
  }

  const handleQuizSubmit = async () => {
    const correct = quizQuestions.reduce((count, q, i) => {
      return count + (quizAnswers[i] === q.correctAnswer ? 1 : 0)
    }, 0)
    const total = quizQuestions.length
    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0
    const passed = total > 0 ? (correct / total) >= PASS_THRESHOLD : true

    setScore({ correct, total, percent: scorePercent })
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    if (passed || newAttempts >= MAX_ATTEMPTS) {
      await markComplete(scorePercent, passed)
    }
  }

  const markComplete = async (scorePercent, passed) => {
    setSaving(true)
    try {
      // Mark completed in student_curriculum_progress
      const { data: existing } = await supabase
        .from('student_curriculum_progress')
        .select('id')
        .eq('student_id', profile.id)
        .eq('unit_id', unitId)
        .eq('section_type', 'pronunciation')
        .maybeSingle()

      let data, error
      if (existing) {
        const result = await supabase
          .from('student_curriculum_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            score: scorePercent,
          })
          .eq('id', existing.id)
          .select()
        data = result.data
        error = result.error
      } else {
        const result = await supabase
          .from('student_curriculum_progress')
          .insert({
            student_id: profile.id,
            unit_id: unitId,
            section_type: 'pronunciation',
            status: 'completed',
            completed_at: new Date().toISOString(),
            score: scorePercent,
          })
          .select()
        data = result.data
        error = result.error
      }

      if (error || !data?.length) {
        toast({ type: 'error', title: 'فشل حفظ التقدم' })
        setSaving(false)
        return
      }

      // Award XP — anti-farming: check if already awarded for this unit
      const { count: existingXP } = await supabase
        .from('xp_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', profile.id)
        .eq('reason', 'correct_answer')
        .like('description', `%نطق الوحدة ${unitId}%`)

      if (!existingXP || existingXP === 0) {
        const xpAmount = passed ? 10 : 5 // reduced XP if forced pass after 3 attempts
        await supabase.from('xp_transactions').insert({
          student_id: profile.id,
          amount: xpAmount,
          reason: 'correct_answer',
          description: `أنجز تمرين نطق الوحدة ${unitId}`,
        })

        // Perfect score bonus
        if (scorePercent === 100) {
          await supabase.from('xp_transactions').insert({
            student_id: profile.id,
            amount: 5,
            reason: 'achievement',
            description: `أتقن تمرين نطق الوحدة ${unitId} بالكامل`,
          })
        }
      }

      // Invalidate progress queries
      queryClient.invalidateQueries({ queryKey: ['unit-progress-comprehensive'] })
      queryClient.invalidateQueries({ queryKey: ['level-progress-comprehensive'] })
      onComplete?.()

      setShowConfetti(true)
      setPhase('complete')

      // Signal the unit page to return to MissionGrid after the completion screen
      window.dispatchEvent(new CustomEvent('fluentia:activity:complete', {
        detail: { activityKey: 'pronunciation', score: scorePercent },
      }))
    } catch (err) {
      console.error('Error marking pronunciation complete:', err)
      toast({ type: 'error', title: 'حدث خطأ' })
    } finally {
      setSaving(false)
    }
  }

  const handleRetry = () => {
    setCurrentCardIndex(0)
    setQuizAnswers({})
    setScore(null)
    setPhase('flashcards')
  }

  // ─── Render Phases ───
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPhase
            key="intro"
            titleAr={title_ar}
            titleEn={title_en}
            descriptionAr={description_ar}
            ruleSummary={ruleSummary}
            focusType={focus_type}
            itemCount={items.length}
            onStart={handleStart}
          />
        )}

        {phase === 'flashcards' && (
          <FlashcardsPhase
            key="flashcards"
            focusType={focus_type}
            items={items}
            currentIndex={currentCardIndex}
            totalCards={totalCards}
            onNext={handleNextCard}
            onPrev={handlePrevCard}
          />
        )}

        {phase === 'quiz' && !score && (
          <QuizPhase
            key="quiz"
            questions={quizQuestions}
            answers={quizAnswers}
            onAnswer={handleQuizAnswer}
            onSubmit={handleQuizSubmit}
            saving={saving}
            attemptNumber={attempts + 1}
          />
        )}

        {/* Saving state — prevents blank while async DB write is in progress */}
        {phase === 'quiz' && score && saving && (
          <SavingPhase key="saving" />
        )}

        {phase === 'quiz' && score && !saving && score.percent < PASS_THRESHOLD * 100 && attempts < MAX_ATTEMPTS && (
          <FailedPhase
            key="failed"
            score={score}
            attempts={attempts}
            maxAttempts={MAX_ATTEMPTS}
            onRetry={handleRetry}
          />
        )}

        {phase === 'complete' && (
          <CompletePhase
            key="complete"
            score={score}
            showConfetti={showConfetti}
            onBack={onBack}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Intro Phase ───
function IntroPhase({ titleAr, titleEn, descriptionAr, ruleSummary, focusType, itemCount, onStart }) {
  const focusLabel = {
    minimal_pairs_vowels: 'أزواج الحد الأدنى — حروف العلة',
    minimal_pairs_consonants: 'أزواج الحد الأدنى — الحروف الساكنة',
    word_stress: 'النبر في الكلمات',
    connected_speech_linking: 'الكلام المتصل — الربط',
    connected_speech_reduction: 'الكلام المتصل — الاختزال',
    intonation: 'التنغيم',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fl-card-static p-6 space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
          <Mic size={24} strokeWidth={1.5} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{titleAr}</h2>
          <p className="text-xs font-['Inter']" style={{ color: 'var(--text-tertiary)' }}>{titleEn}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {descriptionAr}
      </p>

      {ruleSummary && (
        <div className="px-4 py-2.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.1)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent-sky)' }}>
            {ruleSummary}
          </p>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span className="px-2.5 py-1 rounded-lg" style={{ background: 'var(--surface-raised)' }}>
          {focusLabel[focusType] || focusType}
        </span>
        <span>{itemCount} تمارين</span>
        <span>اختبار قصير بعدها</span>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))', color: '#fff' }}
      >
        ابدأ التمرين
      </button>
    </motion.div>
  )
}

// ─── Flashcards Phase ───
function FlashcardsPhase({ focusType, items, currentIndex, totalCards, onNext, onPrev }) {
  const item = items[currentIndex]
  const progress = ((currentIndex + 1) / totalCards) * 100

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Progress */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span>{currentIndex + 1} / {totalCards}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #f59e0b, #eab308)' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.2 }}
        >
          {focusType?.startsWith('minimal_pairs') && <MinimalPairCard item={item} index={currentIndex} />}
          {focusType === 'word_stress' && <WordStressCard item={item} index={currentIndex} />}
          {focusType?.startsWith('connected_speech') && <ConnectedSpeechCard item={item} index={currentIndex} />}
          {focusType === 'intonation' && <IntonationCard item={item} index={currentIndex} />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
          style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}
        >
          <ArrowRight size={16} />
          السابق
        </button>
        <button
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: currentIndex === totalCards - 1
              ? 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))'
              : 'var(--surface-raised)',
            color: currentIndex === totalCards - 1 ? '#fff' : 'var(--text-primary)',
          }}
        >
          {currentIndex === totalCards - 1 ? 'ابدأ الاختبار' : 'التالي'}
          <ArrowLeft size={16} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Card Types ───
function MinimalPairCard({ item }) {
  return (
    <div className="fl-card-static p-6 space-y-4">
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-2xl font-bold font-['Inter']" style={{ color: 'var(--accent-sky)' }}>{item.word1}</p>
          <p className="text-xs font-['Inter'] mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.ipa1}</p>
          {item.meaning1_ar && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.meaning1_ar}</p>}
        </div>
        <span className="text-lg font-bold" style={{ color: 'var(--text-tertiary)' }}>vs</span>
        <div className="text-center">
          <p className="text-2xl font-bold font-['Inter']" style={{ color: 'var(--accent-violet)' }}>{item.word2}</p>
          <p className="text-xs font-['Inter'] mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.ipa2}</p>
          {item.meaning2_ar && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.meaning2_ar}</p>}
        </div>
      </div>
      {item.hint_ar && (
        <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}>
          <p className="text-xs" style={{ color: 'var(--accent-gold)' }}>{item.hint_ar}</p>
        </div>
      )}
    </div>
  )
}

function WordStressCard({ item }) {
  return (
    <div className="fl-card-static p-6 space-y-4">
      <div className="flex items-center justify-center gap-1 text-2xl font-bold font-['Inter']">
        {(item.syllables || []).map((syl, j) => (
          <span key={j}>
            <span
              className={j + 1 === item.stressed_syllable
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : ''}
              style={j + 1 !== item.stressed_syllable ? { color: 'var(--text-secondary)' } : {}}
            >
              {syl}
            </span>
            {j < item.syllables.length - 1 && (
              <span className="mx-0.5" style={{ color: 'var(--text-tertiary)' }}>·</span>
            )}
          </span>
        ))}
      </div>
      <p className="text-center text-sm font-['Inter']" style={{ color: 'var(--text-tertiary)' }}>{item.ipa}</p>
      {item.hint_ar && (
        <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}>
          <p className="text-xs" style={{ color: 'var(--accent-gold)' }}>{item.hint_ar}</p>
        </div>
      )}
    </div>
  )
}

function ConnectedSpeechCard({ item }) {
  return (
    <div className="fl-card-static p-6 space-y-4">
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>الشكل المكتوب</p>
          <p className="text-sm font-['Inter'] line-through decoration-white/15" style={{ color: 'var(--text-secondary)' }}>
            {item.written}
          </p>
        </div>
        <span className="text-lg" style={{ color: 'var(--text-tertiary)' }}>→</span>
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>الشكل المنطوق</p>
          <p className="text-lg font-bold font-['Inter']" style={{ color: 'var(--accent-sky)' }}>
            {item.spoken}
          </p>
        </div>
      </div>
      {item.ipa_spoken && (
        <p className="text-center text-xs font-['Inter']" style={{ color: 'var(--text-tertiary)' }}>{item.ipa_spoken}</p>
      )}
      {item.explanation_ar && (
        <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}>
          <p className="text-xs" style={{ color: 'var(--accent-gold)' }}>{item.explanation_ar}</p>
        </div>
      )}
    </div>
  )
}

function IntonationCard({ item }) {
  return (
    <div className="fl-card-static p-6 space-y-4">
      <div className="text-center">
        <p className="text-lg font-bold font-['Inter'] mb-2" style={{ color: 'var(--text-primary)' }}>
          {item.sentence}
        </p>
        <span className="text-3xl">{item.tone_curve}</span>
      </div>
      <div className="text-center">
        <span className="text-xs px-3 py-1 rounded-full capitalize" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--accent-violet)' }}>
          {item.pattern}
        </span>
      </div>
      {item.explanation_ar && (
        <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}>
          <p className="text-xs" style={{ color: 'var(--accent-gold)' }}>{item.explanation_ar}</p>
        </div>
      )}
    </div>
  )
}

// ─── Quiz Phase ───
function QuizPhase({ questions, answers, onAnswer, onSubmit, saving, attemptNumber }) {
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      <div className="fl-card-static p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            اختبار قصير
          </h3>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}>
            المحاولة {attemptNumber} من {MAX_ATTEMPTS}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          أجب على {questions.length} أسئلة — تحتاج {Math.ceil(questions.length * PASS_THRESHOLD)} إجابات صحيحة للنجاح
        </p>
      </div>

      {questions.map((q, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="fl-card-static p-5 space-y-3"
        >
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {i + 1}. {q.question}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options.map((opt, j) => {
              const isSelected = answers[i] === opt
              return (
                <button
                  key={j}
                  onClick={() => onAnswer(i, opt)}
                  className="px-4 py-2.5 rounded-xl text-sm text-start transition-all"
                  style={{
                    background: isSelected ? 'rgba(56,189,248,0.15)' : 'var(--surface-raised)',
                    border: isSelected ? '1px solid rgba(56,189,248,0.4)' : '1px solid transparent',
                    color: isSelected ? 'var(--accent-sky)' : 'var(--text-secondary)',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </motion.div>
      ))}

      <button
        onClick={onSubmit}
        disabled={!allAnswered || saving}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
        style={{ background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))', color: '#fff' }}
      >
        {saving ? 'جاري الحفظ...' : 'تحقق من إجاباتك'}
      </button>
    </motion.div>
  )
}

// ─── Failed Phase ───
function FailedPhase({ score, attempts, maxAttempts, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="fl-card-static p-6 space-y-5 text-center"
    >
      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
        <RotateCcw size={28} className="text-red-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>حاول مرة أخرى</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          حصلت على {score.correct} من {score.total} ({score.percent}%)
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
          تحتاج {Math.ceil(score.total * PASS_THRESHOLD)} إجابات صحيحة على الأقل
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          المحاولات المتبقية: {maxAttempts - attempts}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
      >
        <RotateCcw size={14} className="inline ml-2" />
        راجع البطاقات وحاول مرة أخرى
      </button>
    </motion.div>
  )
}

// ─── Saving Phase ───
function SavingPhase() {
  return (
    <motion.div
      key="saving"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fl-card-static p-8 text-center space-y-4"
      style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto"
        style={{ borderColor: 'var(--accent-sky)', borderTopColor: 'transparent' }} />
      <p className="text-sm font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>جاري حفظ تقدمك...</p>
    </motion.div>
  )
}

// ─── Complete Phase ───
function CompletePhase({ score, showConfetti, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="fl-card-static p-8 space-y-5 text-center relative overflow-hidden"
    >
      {/* CSS Confetti */}
      {showConfetti && <Confetti />}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,197,94,0.15))' }}
      >
        <Trophy size={36} className="text-emerald-400" />
      </motion.div>

      <div>
        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          أحسنت!
        </h3>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          أنجزت تمرين النطق لهذه الوحدة
        </p>
        {score && (
          <p className="text-2xl font-bold font-['Inter'] mt-3" style={{ color: 'var(--accent-sky)' }}>
            {score.percent}%
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--accent-gold)' }}>
        <Sparkles size={14} />
        <span>+{score?.percent === 100 ? 15 : 10} XP</span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Check size={14} className="text-emerald-400" />
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>تم تحديث تقدمك تلقائياً</span>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold font-['Tajawal'] transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
        >
          <Home size={16} />
          العودة للوحدة
        </button>
      )}
    </motion.div>
  )
}

// ─── Confetti (CSS-only) ───
function Confetti() {
  const pieces = Array.from({ length: 20 })
  const colors = ['#4ade80', '#38bdf8', '#a78bfa', '#f59e0b', '#f472b6']

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: colors[i % colors.length],
            left: `${10 + Math.random() * 80}%`,
            top: '-8px',
          }}
          animate={{
            y: [0, 300 + Math.random() * 200],
            x: [0, (Math.random() - 0.5) * 100],
            rotate: [0, Math.random() * 720],
            opacity: [1, 0],
          }}
          transition={{
            duration: 1.5 + Math.random(),
            delay: Math.random() * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── Quiz Generator ───
function generateQuiz(focusType, items) {
  if (!items?.length) return []

  if (focusType?.startsWith('minimal_pairs')) {
    return generateMinimalPairsQuiz(items)
  }
  if (focusType === 'word_stress') {
    return generateWordStressQuiz(items)
  }
  if (focusType?.startsWith('connected_speech')) {
    return generateConnectedSpeechQuiz(items)
  }
  if (focusType === 'intonation') {
    return generateIntonationQuiz(items)
  }

  return []
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickN(arr, n) {
  return shuffle(arr).slice(0, n)
}

function generateMinimalPairsQuiz(items) {
  const selected = pickN(items, QUIZ_SIZE)
  return selected.map(pair => {
    // "Which word means X?"
    const useWord1 = Math.random() > 0.5
    const targetWord = useWord1 ? pair.word1 : pair.word2
    const targetMeaning = useWord1 ? (pair.meaning1_ar || pair.word1) : (pair.meaning2_ar || pair.word2)
    const otherWord = useWord1 ? pair.word2 : pair.word1

    // Generate distractors from other pairs
    const otherWords = items
      .filter(p => p !== pair)
      .flatMap(p => [p.word1, p.word2])
    const distractors = pickN(otherWords, 2)

    const options = shuffle([targetWord, otherWord, ...distractors].slice(0, 4))

    return {
      question: `أي كلمة تعني "${targetMeaning}"؟`,
      options,
      correctAnswer: targetWord,
    }
  })
}

function generateWordStressQuiz(items) {
  const selected = pickN(items, QUIZ_SIZE)
  return selected.map(item => {
    const syllables = item.syllables || []
    const correctSyl = syllables[item.stressed_syllable - 1] || syllables[0]
    const options = shuffle(syllables.length > 1 ? syllables : [correctSyl, 'أول', 'ثاني', 'ثالث'])

    return {
      question: `أي مقطع مشدد في كلمة "${syllables.join('·')}"؟`,
      options: [...new Set(options)].slice(0, 4),
      correctAnswer: correctSyl,
    }
  })
}

function generateConnectedSpeechQuiz(items) {
  const selected = pickN(items, QUIZ_SIZE)
  return selected.map(item => {
    // "How is X pronounced in fast speech?"
    const otherSpoken = items
      .filter(i => i !== item)
      .map(i => i.spoken)
    const distractors = pickN(otherSpoken, 2)
    const options = shuffle([item.spoken, item.written, ...distractors].slice(0, 4))

    return {
      question: `في الكلام السريع، "${item.written}" تُنطق:`,
      options,
      correctAnswer: item.spoken,
    }
  })
}

function generateIntonationQuiz(items) {
  const selected = pickN(items, QUIZ_SIZE)
  const patternOptions = [...new Set(items.map(i => i.pattern))]

  return selected.map(item => {
    const distractors = patternOptions.filter(p => p !== item.pattern)
    const options = shuffle([item.pattern, ...distractors]).slice(0, 4)
    // Ensure at least 2 options
    if (options.length < 2) {
      options.push('rising', 'falling', 'rise-fall')
      const unique = [...new Set(options)]
      return {
        question: `ما نوع التنغيم المناسب لـ: "${item.sentence}"؟`,
        options: unique.slice(0, 4),
        correctAnswer: item.pattern,
      }
    }

    return {
      question: `ما نوع التنغيم المناسب لـ: "${item.sentence}"؟`,
      options,
      correctAnswer: item.pattern,
    }
  })
}
