import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Mic, MicOff, Volume2, Loader2, Zap, RefreshCw,
  CheckCircle2, XCircle, Play, ArrowLeft,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const PRACTICE_SENTENCES = {
  beginner: [
    'Hello, my name is...',
    'How are you today?',
    'I like to read books.',
    'The weather is nice today.',
    'Can I have some water please?',
    'I go to school every day.',
    'My favorite color is blue.',
    'I have two brothers.',
  ],
  intermediate: [
    'I would like to improve my English skills.',
    'Could you please explain that again?',
    'I have been studying English for two years.',
    'What do you think about this idea?',
    'The restaurant was really busy last night.',
    'I am looking forward to the weekend.',
  ],
  advanced: [
    'Although the weather was terrible, we decided to go hiking.',
    'The government should invest more in renewable energy.',
    'I would have gone to the party if I had known about it.',
    'Despite the challenges, the project was completed on time.',
    'The consequences of climate change are becoming increasingly apparent.',
  ],
}

const DIFFICULT_WORDS = [
  { word: 'through', phonetic: '/θruː/' },
  { word: 'though', phonetic: '/ðoʊ/' },
  { word: 'thought', phonetic: '/θɔːt/' },
  { word: 'thoroughly', phonetic: '/ˈθɜːrəli/' },
  { word: 'comfortable', phonetic: '/ˈkʌmftəbəl/' },
  { word: 'vegetable', phonetic: '/ˈvedʒtəbəl/' },
  { word: 'schedule', phonetic: '/ˈskedʒuːl/' },
  { word: 'pronunciation', phonetic: '/prəˌnʌnsiˈeɪʃən/' },
  { word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/' },
  { word: 'temperature', phonetic: '/ˈtemprətʃər/' },
  { word: 'restaurant', phonetic: '/ˈrestərɑːnt/' },
  { word: 'Wednesday', phonetic: '/ˈwenzdeɪ/' },
]

export default function StudentPronunciation() {
  const { profile, studentData } = useAuthStore()
  const [mode, setMode] = useState('sentences') // sentences | words
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState(null)
  const recognitionRef = useRef(null)

  const level = studentData?.academic_level || 1
  const levelKey = level <= 2 ? 'beginner' : level <= 4 ? 'intermediate' : 'advanced'
  const sentences = PRACTICE_SENTENCES[levelKey]

  const currentTarget = mode === 'sentences' ? sentences[currentIndex] : DIFFICULT_WORDS[currentIndex]?.word
  const totalItems = mode === 'sentences' ? sentences.length : DIFFICULT_WORDS.length

  function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.8
    speechSynthesis.speak(utterance)
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم التعرف على الكلام — جرب Chrome')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      setTranscript(result)
      evaluatePronunciation(result)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setTranscript('')
    setFeedback(null)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function evaluatePronunciation(spoken) {
    const target = currentTarget.toLowerCase().replace(/[.,!?]/g, '').trim()
    const spokenClean = spoken.toLowerCase().replace(/[.,!?]/g, '').trim()

    const targetWords = target.split(/\s+/)
    const spokenWords = spokenClean.split(/\s+/)

    let matches = 0
    const wordResults = targetWords.map((tw, i) => {
      const sw = spokenWords[i] || ''
      const match = tw === sw
      if (match) matches++
      return { target: tw, spoken: sw, match }
    })

    const accuracy = Math.round((matches / targetWords.length) * 100)
    const xp = accuracy >= 90 ? 5 : accuracy >= 70 ? 3 : 1

    setFeedback({
      accuracy,
      wordResults,
      xp,
      message: accuracy >= 90 ? 'ممتاز! نطق رائع 🎯'
        : accuracy >= 70 ? 'جيد جداً! استمر 💪'
        : accuracy >= 50 ? 'لا بأس — حاول مرة أخرى 🔄'
        : 'حاول مرة أخرى — استمع للنموذج أولاً 🎧',
    })

    // Award XP silently
    if (accuracy >= 50) {
      supabase.from('xp_transactions').insert({
        student_id: profile?.id,
        amount: xp,
        reason: 'custom',
        description: 'تدريب نطق',
      })
    }
  }

  function nextItem() {
    setCurrentIndex((currentIndex + 1) % totalItems)
    setTranscript('')
    setFeedback(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Volume2 size={24} className="text-sky-400" />
          مدرب النطق
        </h1>
        <p className="text-muted text-sm mt-1">تدرب على النطق الصحيح واحصل على تقييم فوري</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('sentences'); setCurrentIndex(0); setFeedback(null) }}
          className={`text-sm px-4 py-2 rounded-xl transition-all ${
            mode === 'sentences' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-muted'
          }`}
        >
          جمل
        </button>
        <button
          onClick={() => { setMode('words'); setCurrentIndex(0); setFeedback(null) }}
          className={`text-sm px-4 py-2 rounded-xl transition-all ${
            mode === 'words' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-muted'
          }`}
        >
          كلمات صعبة
        </button>
      </div>

      {/* Practice card */}
      <motion.div
        key={`${mode}-${currentIndex}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="text-center mb-6">
          <p className="text-[10px] text-muted mb-2">{currentIndex + 1} / {totalItems}</p>
          <h2 className="text-2xl font-bold text-white mb-2" dir="ltr">
            {currentTarget}
          </h2>
          {mode === 'words' && DIFFICULT_WORDS[currentIndex] && (
            <p className="text-sm text-muted" dir="ltr">{DIFFICULT_WORDS[currentIndex].phonetic}</p>
          )}

          {/* Listen button */}
          <button
            onClick={() => speak(currentTarget)}
            className="mt-3 inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-all"
          >
            <Play size={14} />
            استمع للنموذج
          </button>
        </div>

        {/* Record */}
        <div className="text-center mb-4">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all ${
              isListening
                ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
                : 'bg-violet-500/20 border-2 border-violet-500/40 hover:bg-violet-500/30'
            }`}
          >
            {isListening ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-violet-400" />}
          </button>
          <p className="text-muted text-xs mt-2">
            {isListening ? 'يسمعك... تحدث الآن' : 'اضغط وانطق الجملة'}
          </p>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-white/5 rounded-xl p-3 text-center mb-4">
            <p className="text-xs text-muted mb-1">ما سمعناه:</p>
            <p className="text-sm text-white" dir="ltr">{transcript}</p>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <div className={`text-center p-3 rounded-xl ${
              feedback.accuracy >= 90 ? 'bg-emerald-500/10 border border-emerald-500/20' :
              feedback.accuracy >= 70 ? 'bg-sky-500/10 border border-sky-500/20' :
              'bg-gold-500/10 border border-gold-500/20'
            }`}>
              <p className={`text-2xl font-bold ${
                feedback.accuracy >= 90 ? 'text-emerald-400' : feedback.accuracy >= 70 ? 'text-sky-400' : 'text-gold-400'
              }`}>{feedback.accuracy}%</p>
              <p className="text-sm text-white mt-1">{feedback.message}</p>
              <p className="text-xs text-violet-400 mt-1">+{feedback.xp} XP</p>
            </div>

            {/* Word-by-word comparison */}
            <div className="flex flex-wrap gap-2 justify-center" dir="ltr">
              {feedback.wordResults.map((w, i) => (
                <span
                  key={i}
                  className={`text-sm px-2 py-1 rounded-lg ${
                    w.match ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {w.match ? <CheckCircle2 size={10} className="inline mr-1" /> : <XCircle size={10} className="inline mr-1" />}
                  {w.target}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Next button */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setFeedback(null); setTranscript('') }} className="flex-1 text-sm py-2.5 rounded-xl bg-white/5 text-muted hover:text-white transition-all">
            <RefreshCw size={14} className="inline ml-1" />
            إعادة
          </button>
          <button onClick={nextItem} className="flex-1 btn-primary text-sm py-2.5">
            التالي
            <ArrowLeft size={14} className="inline mr-1" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
