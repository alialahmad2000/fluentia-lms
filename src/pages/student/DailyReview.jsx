import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Volume2, RotateCcw, Brain, CheckCircle, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { sm2, qualityFromButton } from '../../utils/sm2'
import { toast } from '../../components/ui/FluentiaToast'
import { emitXP } from '../../components/ui/XPFloater'
import { safeCelebrate } from '../../lib/celebrations'
import { tracker } from '../../services/activityTracker'

const toArabicNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

export default function DailyReview() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [sessionResults, setSessionResults] = useState([])
  const [saving, setSaving] = useState(false)

  // Fetch due cards
  const { data: dueCards, isLoading } = useQuery({
    queryKey: ['srs-due-cards', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_vocabulary_srs')
        .select(`
          id, ease_factor, interval_days, repetitions, next_review_at, last_quality,
          curriculum_vocabulary (
            id, word, definition_en, definition_ar,
            example_sentence, audio_url, image_url, part_of_speech
          )
        `)
        .eq('student_id', profile.id)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true })
        .limit(20)

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
  })

  const currentCard = dueCards?.[currentIndex]
  const totalCards = dueCards?.length || 0
  const progress = totalCards > 0 ? ((currentIndex + (answered ? 1 : 0)) / totalCards) * 100 : 0

  // Play audio
  const playAudio = useCallback((url) => {
    if (!url) return
    try { new Audio(url).play() } catch {}
  }, [])

  // Handle review answer
  const handleReview = async (buttonValue) => {
    if (!currentCard || saving) return
    setSaving(true)

    const quality = qualityFromButton(buttonValue)
    const updated = sm2(currentCard, quality)

    try {
      const { data, error } = await supabase
        .from('curriculum_vocabulary_srs')
        .update(updated)
        .eq('id', currentCard.id)
        .select()

      if (error || !data?.length) {
        toast({ type: 'error', title: 'فشل حفظ المراجعة' })
        setSaving(false)
        return
      }

      // Award XP — anti-farming: check if already awarded today for this card
      const today = new Date().toISOString().split('T')[0]
      const { count: existingXP } = await supabase
        .from('xp_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', profile.id)
        .eq('reason', 'correct_answer')
        .like('description', `%مراجعة SRS: ${currentCard.curriculum_vocabulary.word}%`)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)

      if (!existingXP || existingXP === 0) {
        await supabase.from('xp_transactions').insert({
          student_id: profile.id,
          amount: 2,
          reason: 'correct_answer',
          description: `مراجعة SRS: ${currentCard.curriculum_vocabulary.word}`,
        })
        try { emitXP(2, 'مراجعة') } catch {}
      }

      // Track result
      setSessionResults(prev => [...prev, { word: currentCard.curriculum_vocabulary.word, quality: buttonValue }])
      setAnswered(true)

      // Auto-advance after brief pause
      setTimeout(() => {
        if (currentIndex + 1 >= totalCards) {
          setSessionDone(true)
          try { safeCelebrate('word_mastered') } catch {}
        } else {
          setCurrentIndex(prev => prev + 1)
          setFlipped(false)
          setAnswered(false)
        }
        setSaving(false)
      }, 400)
    } catch (err) {
      console.error('[DailyReview] Error:', err)
      toast({ type: 'error', title: 'حدث خطأ' })
      setSaving(false)
    }
  }

  // Track activity
  useEffect(() => {
    tracker.track('daily_review_visit')
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No cards due
  if (!dueCards?.length && !sessionDone) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={36} strokeWidth={1.5} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          ما في مراجعة اليوم
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
          أنت محدّث! ارجع بكرة لمراجعة كلمات جديدة
        </p>
        <button onClick={() => navigate('/student')} className="fl-btn-primary px-6 py-2.5 text-sm">
          الرجوع للرئيسية
        </button>
      </div>
    )
  }

  // Session complete
  if (sessionDone) {
    const perfectSession = sessionResults.every(r => r.quality === 'easy')
    const easyCount = sessionResults.filter(r => r.quality === 'easy').length
    const hardCount = sessionResults.filter(r => r.quality === 'again').length

    // Award perfect session bonus
    if (perfectSession && sessionResults.length >= 5) {
      supabase.from('xp_transactions').insert({
        student_id: profile.id,
        amount: 5,
        reason: 'correct_answer',
        description: 'مراجعة مثالية — كل الكلمات سهلة!',
      }).then(() => {
        try { emitXP(5, 'مراجعة مثالية!') } catch {}
      })
    }

    // Invalidate dashboard query
    queryClient.invalidateQueries({ queryKey: ['srs-due-count'] })

    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        {/* Confetti effect */}
        <div className="confetti-container">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                '--x': `${Math.random() * 100}vw`,
                '--delay': `${Math.random() * 2}s`,
                '--color': ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185'][i % 5],
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          مبروك! خلّصت مراجعة اليوم
        </h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>
          راجعت {toArabicNum(sessionResults.length)} كلمة
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-4 my-6">
          <div className="px-4 py-2 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
            <p className="text-lg font-bold text-emerald-400">{toArabicNum(easyCount)}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>سهلة</p>
          </div>
          <div className="px-4 py-2 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
            <p className="text-lg font-bold text-amber-400">{toArabicNum(sessionResults.length - easyCount - hardCount)}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>متوسطة</p>
          </div>
          <div className="px-4 py-2 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
            <p className="text-lg font-bold text-rose-400">{toArabicNum(hardCount)}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>صعبة</p>
          </div>
        </div>

        {perfectSession && sessionResults.length >= 5 && (
          <p className="text-sm font-semibold text-emerald-400 mb-4">+5 XP مكافأة مراجعة مثالية!</p>
        )}

        <button onClick={() => navigate('/student')} className="fl-btn-primary px-6 py-2.5 text-sm">
          الرجوع للرئيسية
        </button>
      </div>
    )
  }

  // Main review card
  const vocab = currentCard?.curriculum_vocabulary

  return (
    <div className="max-w-lg mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ChevronLeft size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="flex items-center gap-2">
          <Brain size={18} strokeWidth={1.5} style={{ color: 'var(--accent-violet)' }} />
          <h1 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>
            مراجعة اليوم — {toArabicNum(totalCards)} كلمة
          </h1>
        </div>
        <span className="text-sm font-data" style={{ color: 'var(--text-tertiary)' }}>
          {toArabicNum(currentIndex + 1)}/{toArabicNum(totalCards)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="fl-progress-track mb-8" style={{ height: '4px' }}>
        <motion.div
          className="fl-progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Card */}
      <motion.div
        key={currentCard?.id}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
          style={{
            background: 'var(--glass-card)',
            border: '1px solid var(--border-default)',
            minHeight: '280px',
          }}
          onClick={() => !answered && setFlipped(!flipped)}
        >
          <div className="card-top-line shimmer" style={{ opacity: 0.3 }} />

          <AnimatePresence mode="wait">
            {!flipped ? (
              /* Front — English word */
              <motion.div
                key="front"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="p-8 flex flex-col items-center justify-center text-center"
                style={{ minHeight: '280px' }}
              >
                {vocab?.image_url && (
                  <img
                    src={vocab.image_url}
                    alt={vocab.word}
                    className="w-24 h-24 rounded-xl object-cover mb-4 opacity-80"
                  />
                )}
                <p className="text-3xl font-bold mb-3 font-['Inter']" style={{ color: 'var(--text-primary)' }}>
                  {vocab?.word}
                </p>
                {vocab?.part_of_speech && (
                  <span className="text-xs px-2.5 py-1 rounded-full mb-4" style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}>
                    {vocab.part_of_speech}
                  </span>
                )}
                {vocab?.audio_url && (
                  <button
                    onClick={(e) => { e.stopPropagation(); playAudio(vocab.audio_url) }}
                    className="p-3 rounded-full hover:bg-white/5 transition-colors"
                  >
                    <Volume2 size={22} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
                  </button>
                )}
                <p className="text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
                  اضغط لقلب البطاقة
                </p>
              </motion.div>
            ) : (
              /* Back — Arabic + definitions */
              <motion.div
                key="back"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="p-8 flex flex-col items-center justify-center text-center"
                style={{ minHeight: '280px' }}
              >
                <p className="text-2xl font-bold mb-3" style={{ color: 'var(--accent-sky)' }}>
                  {vocab?.definition_ar}
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {vocab?.definition_en}
                </p>
                {vocab?.example_sentence && (
                  <div className="px-4 py-3 rounded-xl max-w-sm" style={{ background: 'var(--surface-raised)' }}>
                    <p className="text-[13px] italic font-['Inter']" style={{ color: 'var(--text-secondary)' }}>
                      "{vocab.example_sentence}"
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Answer buttons — only show when flipped */}
      {flipped && !answered && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mt-6"
        >
          <button
            onClick={() => handleReview('again')}
            disabled={saving}
            className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}
          >
            <RotateCcw size={20} className="text-rose-400" />
            <span className="text-sm font-semibold text-rose-400">ما تذكرتها</span>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>١ يوم</span>
          </button>

          <button
            onClick={() => handleReview('good')}
            disabled={saving}
            className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            <Brain size={20} className="text-sky-400" />
            <span className="text-sm font-semibold text-sky-400">تذكرتها</span>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {toArabicNum(Math.round((currentCard?.interval_days || 1) * (currentCard?.ease_factor || 2.5)))} يوم
            </span>
          </button>

          <button
            onClick={() => handleReview('easy')}
            disabled={saving}
            className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <CheckCircle size={20} className="text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">سهلة</span>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {toArabicNum(Math.round((currentCard?.interval_days || 1) * (currentCard?.ease_factor || 2.5) * 1.3))} يوم
            </span>
          </button>
        </motion.div>
      )}

      {/* Keyboard hint */}
      <p className="text-center text-[11px] mt-6" style={{ color: 'var(--text-tertiary)' }}>
        {!flipped ? 'اضغط على البطاقة أو مسافة لقلبها' : 'اختر مستوى التذكر'}
      </p>
    </div>
  )
}
