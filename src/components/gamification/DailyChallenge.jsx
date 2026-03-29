import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

// Daily challenges per academic level (simple grammar/vocab questions)
const DAILY_CHALLENGES = {
  1: [
    { q: 'What is the past tense of "go"?', options: ['goed', 'went', 'gone', 'going'], answer: 1 },
    { q: 'Choose the correct word: She ___ a student.', options: ['am', 'is', 'are', 'be'], answer: 1 },
    { q: 'What is the opposite of "hot"?', options: ['warm', 'cold', 'cool', 'nice'], answer: 1 },
    { q: 'Complete: I ___ to school every day.', options: ['go', 'goes', 'going', 'gone'], answer: 0 },
    { q: 'Which is a fruit?', options: ['chair', 'apple', 'table', 'book'], answer: 1 },
    { q: 'What color is the sky?', options: ['green', 'red', 'blue', 'yellow'], answer: 2 },
    { q: 'Choose: They ___ playing football.', options: ['is', 'am', 'are', 'be'], answer: 2 },
  ],
  2: [
    { q: 'Choose the correct: If I ___ rich, I would travel.', options: ['am', 'was', 'were', 'be'], answer: 2 },
    { q: 'What is the plural of "child"?', options: ['childs', 'childen', 'children', 'childes'], answer: 2 },
    { q: 'She has been studying ___ 3 hours.', options: ['since', 'for', 'from', 'during'], answer: 1 },
    { q: 'The book ___ on the table.', options: ['are', 'is', 'am', 'were'], answer: 1 },
    { q: 'I ___ never been to London.', options: ['has', 'have', 'had', 'having'], answer: 1 },
    { q: 'What does "enormous" mean?', options: ['tiny', 'fast', 'very big', 'old'], answer: 2 },
    { q: 'She asked me ___ I was okay.', options: ['that', 'if', 'what', 'which'], answer: 1 },
  ],
  3: [
    { q: 'Choose: By next year, I ___ graduated.', options: ['will', 'will have', 'would', 'had'], answer: 1 },
    { q: 'The report ___ by the team yesterday.', options: ['wrote', 'was written', 'written', 'writes'], answer: 1 },
    { q: 'What does "reluctant" mean?', options: ['eager', 'hesitant', 'happy', 'fast'], answer: 1 },
    { q: '___ the weather, we decided to go.', options: ['Although', 'Despite', 'However', 'Because'], answer: 1 },
    { q: 'She insisted ___ paying the bill.', options: ['on', 'in', 'at', 'for'], answer: 0 },
    { q: 'Not only ___ smart, but also kind.', options: ['she is', 'is she', 'she was', 'was she'], answer: 1 },
    { q: 'The word "ubiquitous" means:', options: ['rare', 'found everywhere', 'slow', 'expensive'], answer: 1 },
  ],
  4: [
    { q: 'Choose: Had I known, I ___ differently.', options: ['would act', 'would have acted', 'acted', 'will act'], answer: 1 },
    { q: '"Ameliorate" is closest in meaning to:', options: ['worsen', 'improve', 'maintain', 'destroy'], answer: 1 },
    { q: 'The phenomenon ___ extensively studied.', options: ['has been', 'have been', 'was being', 'were'], answer: 0 },
    { q: 'Scarcely had he left ___ it started raining.', options: ['than', 'when', 'then', 'that'], answer: 1 },
    { q: '"Ephemeral" means:', options: ['permanent', 'short-lived', 'important', 'difficult'], answer: 1 },
    { q: 'The findings are ___ with previous research.', options: ['consisted', 'consistent', 'consisting', 'consist'], answer: 1 },
    { q: 'It is imperative that he ___ on time.', options: ['arrives', 'arrive', 'arrived', 'arriving'], answer: 1 },
  ],
  5: [
    { q: '"Paradigm shift" refers to:', options: ['small change', 'fundamental change', 'no change', 'reverse'], answer: 1 },
    { q: 'The nuanced argument ___ careful consideration.', options: ['warrant', 'warrants', 'warranting', 'warranted'], answer: 1 },
    { q: '"Juxtaposition" means placing things:', options: ['far apart', 'side by side', 'in sequence', 'randomly'], answer: 1 },
    { q: 'The study\'s methodology was both rigorous ___ innovative.', options: ['but', 'and', 'or', 'yet'], answer: 1 },
    { q: '"Exacerbate" means to:', options: ['reduce', 'make worse', 'examine', 'explain'], answer: 1 },
    { q: 'A "caveat" is a:', options: ['celebration', 'warning', 'conclusion', 'question'], answer: 1 },
    { q: 'The paper posits that ___ inequality persists.', options: ['systemic', 'systematic', 'system', 'systems'], answer: 0 },
  ],
}

const getHoursUntilMidnight = () => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  return Math.ceil((midnight - now) / (1000 * 60 * 60))
}

export default function DailyChallenge() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)

  const level = studentData?.academic_level || 1
  const studentId = profile?.id

  // Get today's challenge index based on date
  const today = new Date().toISOString().split('T')[0]
  const dayIndex = new Date().getDate() % (DAILY_CHALLENGES[level]?.length || 7)
  const challenge = DAILY_CHALLENGES[level]?.[dayIndex] || DAILY_CHALLENGES[1][0]

  // Check if already completed today — looks for ANY xp_transaction with reason='daily_challenge' today
  const { data: completionData, isLoading: checkingCompletion } = useQuery({
    queryKey: ['daily-challenge-status', studentId, today],
    queryFn: async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('id, amount, description')
        .eq('student_id', studentId)
        .eq('reason', 'daily_challenge')
        .gte('created_at', todayStart.toISOString())
        .limit(1)
      if (error) {
        console.error('Daily challenge check error:', error)
        return null
      }
      if (data && data.length > 0) {
        return { completed: true, xpEarned: data[0].amount, wasCorrect: data[0].amount > 0 }
      }
      return { completed: false }
    },
    enabled: !!studentId,
  })

  const completedToday = completionData?.completed

  // Submit answer — ALWAYS saves a record (correct = 5 XP, incorrect = 0 XP)
  const submitAnswer = useMutation({
    mutationFn: async (answerIndex) => {
      const isCorrect = answerIndex === challenge.answer
      setSelectedAnswer(answerIndex)
      setShowResult(true)

      // Always insert — correct gets 5 XP, incorrect gets 0 XP
      // This ensures completion is persisted regardless of answer correctness
      const { error } = await supabase.from('xp_transactions').insert({
        student_id: studentId,
        amount: isCorrect ? 5 : 0,
        reason: 'daily_challenge',
        description: isCorrect ? 'تحدي يومي — إجابة صحيحة' : 'تحدي يومي — إجابة خاطئة',
      })
      if (error) console.error('Daily challenge submit error:', error)
      return isCorrect
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-challenge-status'] })
      queryClient.invalidateQueries({ queryKey: ['student-xp'] })
    },
  })

  // Loading skeleton while checking completion
  if (checkingCompletion) {
    return (
      <div className="fl-card-static p-7">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded-lg skeleton" />
            <div className="h-3 w-20 rounded-lg skeleton" />
          </div>
        </div>
        <div className="h-5 w-full rounded-lg skeleton mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 rounded-xl skeleton" />
          <div className="h-11 rounded-xl skeleton" />
          <div className="h-11 rounded-xl skeleton" />
          <div className="h-11 rounded-xl skeleton" />
        </div>
      </div>
    )
  }

  // Completion state — show "done" card
  if (completedToday) {
    const wasCorrect = completionData?.wasCorrect
    const hoursLeft = getHoursUntilMidnight()

    return (
      <div className="fl-card-static p-7" style={{ borderColor: wasCorrect ? 'var(--accent-emerald-glow, rgba(16,185,129,0.2))' : 'var(--border-subtle)' }}>
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: wasCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}
          >
            {wasCorrect
              ? <CheckCircle2 size={26} className="text-emerald-400" />
              : <XCircle size={26} className="text-red-400" />
            }
          </div>

          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {wasCorrect ? 'أنجزتِ تحدي اليوم!' : 'تم محاولة تحدي اليوم'}
            </p>
            <p className="text-sm mt-1" style={{ color: wasCorrect ? 'var(--accent-emerald, #34d399)' : 'var(--text-tertiary)' }}>
              {wasCorrect
                ? <>أحسنتِ! <span className="badge-green text-xs mr-1">+5 XP</span></>
                : 'لا بأس، حاولي مرة أخرى بكرة!'
              }
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-1" style={{ color: 'var(--text-tertiary)' }}>
            <Clock size={13} />
            <span className="text-xs">التحدي القادم بعد {hoursLeft} {hoursLeft === 1 ? 'ساعة' : 'ساعات'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="fl-card-static p-7"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Target size={20} className="text-sky-400" />
        </div>
        <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>التحدي اليومي</h3>
        <span className="badge-blue text-xs mr-auto">+5 XP</span>
      </div>

      <p className="text-sm text-[var(--text-primary)] mb-3" dir="ltr">{challenge.q}</p>

      <div className="grid grid-cols-2 gap-3">
        {challenge.options.map((opt, i) => {
          let style = 'border hover:bg-[var(--surface-raised)] text-[var(--text-primary)]'
          if (showResult) {
            if (i === challenge.answer) {
              style = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            } else if (i === selectedAnswer && i !== challenge.answer) {
              style = 'bg-red-500/10 border-red-500/30 text-red-400'
            } else {
              style = 'border text-muted opacity-50'
            }
          }

          return (
            <button
              key={i}
              onClick={() => !showResult && submitAnswer.mutate(i)}
              disabled={showResult || submitAnswer.isPending}
              className={`p-3.5 rounded-xl text-xs font-medium border transition-all duration-200 hover:translate-y-[-2px] ${style}`}
              dir="ltr"
            >
              {opt}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
          >
            {selectedAnswer === challenge.answer ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> إجابة صحيحة! +5 XP
              </p>
            ) : (
              <p className="text-xs text-red-400">
                إجابة خاطئة — الإجابة الصحيحة: {challenge.options[challenge.answer]}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
