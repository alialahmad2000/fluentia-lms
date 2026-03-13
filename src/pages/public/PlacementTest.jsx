import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Questions Data ──────────────────────────────────────────
const questions = [
  // Level 1 – A1
  {
    id: 1,
    level: 'A1',
    sentence: 'What ___ your name?',
    options: ['is', 'are', 'am', 'do'],
    correct: 'is',
  },
  {
    id: 2,
    level: 'A1',
    sentence: 'She ___ a student.',
    options: ['is', 'are', 'am', 'be'],
    correct: 'is',
  },
  // Level 2 – A2
  {
    id: 3,
    level: 'A2',
    sentence: 'I ___ to school yesterday.',
    options: ['go', 'went', 'going', 'gone'],
    correct: 'went',
  },
  {
    id: 4,
    level: 'A2',
    sentence: 'They ___ watching TV now.',
    options: ['is', 'are', 'was', 'were'],
    correct: 'are',
  },
  // Level 3 – B1
  {
    id: 5,
    level: 'B1',
    sentence: 'If I ___ rich, I would travel.',
    options: ['am', 'was', 'were', 'be'],
    correct: 'were',
  },
  {
    id: 6,
    level: 'B1',
    sentence: 'She has ___ here for 5 years.',
    options: ['live', 'lived', 'living', 'been living'],
    correct: 'been living',
  },
  // Level 4 – B2
  {
    id: 7,
    level: 'B2',
    sentence: 'Not only ___ he smart, but also hardworking.',
    options: ['is', 'was', 'does', 'did'],
    correct: 'is',
  },
  {
    id: 8,
    level: 'B2',
    sentence: 'The book, ___ was published in 2020, became a bestseller.',
    options: ['that', 'which', 'who', 'whom'],
    correct: 'which',
  },
  // Level 5 – C1
  {
    id: 9,
    level: 'C1',
    sentence: 'Had I known, I ___ have come earlier.',
    options: ['will', 'would', 'should', 'could'],
    correct: 'would',
  },
  {
    id: 10,
    level: 'C1',
    sentence: 'The proposal was rejected on the ___ that it was too expensive.',
    options: ['grounds', 'basis', 'terms', 'cause'],
    correct: 'grounds',
  },
]

// ─── Level Mapping ───────────────────────────────────────────
const levels = [
  { min: 0, max: 2, code: 'A1', ar: 'مبتدئ', en: 'Beginner', color: 'from-red-500 to-orange-500', description: 'أنت في بداية مشوارك مع الإنجليزية. مع التدريب المناسب، يمكنك بناء أساس قوي والانطلاق بثقة.' },
  { min: 3, max: 4, code: 'A2', ar: 'أساسي', en: 'Elementary', color: 'from-orange-500 to-yellow-500', description: 'لديك أساس جيد في الإنجليزية. تحتاج إلى تطوير مهاراتك في المحادثة والكتابة للانتقال للمستوى التالي.' },
  { min: 5, max: 6, code: 'B1', ar: 'متوسط', en: 'Intermediate', color: 'from-yellow-500 to-green-500', description: 'مستواك متوسط وتستطيع التواصل في مواقف يومية. حان الوقت لصقل مهاراتك والتحدث بطلاقة أكبر.' },
  { min: 7, max: 8, code: 'B2', ar: 'متقدم', en: 'Upper-Intermediate', color: 'from-green-500 to-sky-500', description: 'مستواك متقدم وتتحدث بثقة. تحتاج لتطوير الدقة اللغوية والمفردات الأكاديمية والمهنية.' },
  { min: 9, max: 10, code: 'C1', ar: 'متميز', en: 'Advanced', color: 'from-sky-500 to-purple-500', description: 'مستواك ممتاز وقريب من الإتقان. يمكنك التركيز على الأساليب المتقدمة والتعبيرات الاصطلاحية.' },
]

function getLevel(score) {
  return levels.find((l) => score >= l.min && score <= l.max) || levels[0]
}

// ─── Main Component ──────────────────────────────────────────
export default function PlacementTest() {
  const [phase, setPhase] = useState('landing') // landing | test | result
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [direction, setDirection] = useState(1)
  const [copied, setCopied] = useState(false)

  const handleStart = useCallback(() => {
    setPhase('test')
    setCurrentQ(0)
    setScore(0)
  }, [])

  const handleAnswer = useCallback(
    (answer) => {
      const isCorrect = answer === questions[currentQ].correct
      const newScore = isCorrect ? score + 1 : score
      if (isCorrect) setScore(newScore)

      setDirection(1)
      if (currentQ + 1 < questions.length) {
        setCurrentQ((prev) => prev + 1)
      } else {
        // Fire analytics event (fire-and-forget)
        try {
          import('../../lib/supabase').then(({ supabase }) => {
            supabase?.from('analytics_events').insert({
              event_type: 'placement_test_completed',
              event_data: { score: newScore, level: getLevel(newScore).code },
            }).then(() => {})
          }).catch(() => {})
        } catch {}
        setPhase('result')
      }
    },
    [currentQ, score]
  )

  const handleShare = useCallback(() => {
    const lvl = getLevel(score)
    const text = `حصلت على ${score}/10 في اختبار Fluentia لتحديد المستوى!\nمستواي: ${lvl.ar} (${lvl.code})\n\nاختبر مستواك مجاناً:\n${window.location.href}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [score])

  const handleRetry = useCallback(() => {
    setPhase('landing')
    setCurrentQ(0)
    setScore(0)
  }, [])

  // ─── Render ──────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-darkest text-white font-tajawal selection:bg-sky-500/30 overflow-x-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.12) 0%, #060e1c 60%)',
      }}
    >
      <AnimatePresence mode="wait">
        {phase === 'landing' && <LandingScreen key="landing" onStart={handleStart} />}
        {phase === 'test' && (
          <TestScreen
            key="test"
            question={questions[currentQ]}
            index={currentQ}
            total={questions.length}
            onAnswer={handleAnswer}
            direction={direction}
          />
        )}
        {phase === 'result' && (
          <ResultScreen
            key="result"
            score={score}
            total={questions.length}
            onShare={handleShare}
            onRetry={handleRetry}
            copied={copied}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Landing Screen ──────────────────────────────────────────
function LandingScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="text-center max-w-md w-full space-y-8">
        {/* Logo */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-playfair text-sky-400 tracking-wide"
        >
          Fluentia
        </motion.h1>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h2 className="text-2xl md:text-3xl font-bold leading-relaxed">
            اختبر مستواك في الإنجليزية مجاناً
          </h2>
          <p className="text-white/50 text-lg">
            10 أسئلة سريعة لتحديد مستواك الحقيقي
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-6 text-sm text-white/40"
        >
          <span>⏱ دقيقتين فقط</span>
          <span>📊 نتيجة فورية</span>
          <span>🎯 10 أسئلة</span>
        </motion.div>

        {/* Start Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="w-full py-4 rounded-2xl text-xl font-bold bg-gradient-to-l from-sky-500 to-sky-600
                     shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-shadow duration-300"
        >
          ابدأ الاختبار
        </motion.button>

        {/* Social */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-xs text-white/25 space-y-1 pt-4"
        >
          <p>TikTok: @fluentia_ &nbsp;|&nbsp; Instagram: @fluentia__</p>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Test Screen ─────────────────────────────────────────────
function TestScreen({ question, index, total, onAnswer, direction }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-lg space-y-8">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-white/40">
            <span>السؤال {index + 1} من {total}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {question.level}
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((index + 1) / total) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Sentence */}
            <div className="glass-card p-6 text-center" dir="ltr">
              <p className="text-xl md:text-2xl font-inter font-medium leading-relaxed text-white/90">
                {question.sentence}
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {question.options.map((option) => (
                <motion.button
                  key={option}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onAnswer(option)}
                  dir="ltr"
                  className="w-full py-4 px-6 rounded-xl text-lg font-inter font-medium
                             bg-white/5 border border-white/10
                             hover:bg-sky-500/10 hover:border-sky-500/30
                             active:bg-sky-500/20
                             transition-colors duration-200 text-center"
                >
                  {option}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Fluentia Watermark */}
        <p className="text-center text-xs text-white/15 font-playfair pt-4">Fluentia</p>
      </div>
    </motion.div>
  )
}

// ─── Result Screen ───────────────────────────────────────────
function ResultScreen({ score, total, onShare, onRetry, copied }) {
  const level = getLevel(score)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-playfair text-sky-400"
        >
          Fluentia
        </motion.h1>

        {/* Score Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 150, damping: 12 }}
          className="mx-auto w-36 h-36 rounded-full flex items-center justify-center
                     border-4 border-white/10 relative"
          style={{
            background: `conic-gradient(from 0deg, rgba(56,189,248,0.3) ${(score / total) * 360}deg, rgba(255,255,255,0.03) 0deg)`,
          }}
        >
          <div className="bg-darkest rounded-full w-28 h-28 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-4xl font-bold"
            >
              {score}
            </motion.span>
            <span className="text-sm text-white/40">/ {total}</span>
          </div>
        </motion.div>

        {/* Level Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <div
            className={`inline-block px-6 py-2 rounded-full text-lg font-bold bg-gradient-to-l ${level.color} text-white shadow-lg`}
          >
            {level.code} — {level.ar}
          </div>
          <p className="text-white/50 text-sm">{level.en}</p>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-white/60 leading-relaxed text-sm px-4"
        >
          {level.description}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="space-y-3 pt-2"
        >
          <a
            href="https://wa.me/966558669974"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-l from-sky-500 to-sky-600
                       shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-shadow duration-300 text-center"
          >
            احجز لقاء مبدئي مجاني مع المدرب
          </a>
          <p className="text-white/30 text-sm">+966 55 866 9974</p>
        </motion.div>

        {/* Share + Retry */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="flex gap-3 pt-2"
        >
          <button
            onClick={onShare}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10
                       hover:bg-white/10 transition-colors duration-200"
          >
            {copied ? 'تم النسخ!' : 'شارك نتيجتك'}
          </button>
          <button
            onClick={onRetry}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10
                       hover:bg-white/10 transition-colors duration-200"
          >
            أعد الاختبار
          </button>
        </motion.div>

        {/* Social */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-xs text-white/25 space-y-1 pt-4"
        >
          <p>TikTok: @fluentia_ &nbsp;|&nbsp; Instagram: @fluentia__</p>
        </motion.div>
      </div>
    </motion.div>
  )
}
