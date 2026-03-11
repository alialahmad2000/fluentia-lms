import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Loader2, RotateCcw, Check, X, Sparkles, Brain, Zap } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const MASTERY_LABELS = {
  new: { label: 'جديدة', color: 'blue', emoji: '🆕' },
  learning: { label: 'يتعلمها', color: 'yellow', emoji: '📖' },
  reviewing: { label: 'يراجعها', color: 'sky', emoji: '🔄' },
  mastered: { label: 'متقنة', color: 'green', emoji: '✅' },
}

// Spaced repetition intervals (in days)
const SR_INTERVALS = {
  new: 1,
  learning: 3,
  reviewing: 7,
  mastered: 30,
}

export default function StudentVocabulary() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('review') // review, all, add
  const [addWord, setAddWord] = useState('')
  const [quizMode, setQuizMode] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  // Fetch vocabulary
  const { data: vocab, isLoading } = useQuery({
    queryKey: ['student-vocabulary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vocabulary_bank')
        .select('*')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Words due for review
  const dueWords = (vocab || []).filter(w => {
    if (!w.next_review) return true
    return new Date(w.next_review) <= new Date()
  })

  const stats = {
    total: vocab?.length || 0,
    mastered: vocab?.filter(w => w.mastery === 'mastered').length || 0,
    learning: vocab?.filter(w => w.mastery === 'learning' || w.mastery === 'reviewing').length || 0,
    new: vocab?.filter(w => w.mastery === 'new').length || 0,
    dueForReview: dueWords.length,
  }

  // Add word mutation
  const addMutation = useMutation({
    mutationFn: async (word) => {
      const { error } = await supabase.from('vocabulary_bank').insert({
        student_id: profile?.id,
        word: word.trim(),
        mastery: 'new',
        next_review: new Date().toISOString(),
        review_count: 0,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setAddWord('')
      queryClient.invalidateQueries({ queryKey: ['student-vocabulary'] })
    },
  })

  // AI generate flashcard data
  async function generateFlashcard(wordId, word) {
    setAiLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('ai-chatbot', {
        body: {
          message: `For the English word "${word}", provide: 1) Arabic meaning, 2) English meaning, 3) Example sentence. Format as JSON: {"meaning_ar": "...", "meaning_en": "...", "example_sentence": "..."}. Only respond with JSON.`,
          conversation_history: [],
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.data?.reply) {
        let parsed
        try {
          parsed = JSON.parse(res.data.reply)
        } catch {
          // Try to extract JSON from the reply
          const match = res.data.reply.match(/\{[^}]+\}/)
          if (match) parsed = JSON.parse(match[0])
        }

        if (parsed) {
          await supabase
            .from('vocabulary_bank')
            .update({
              meaning_ar: parsed.meaning_ar,
              meaning_en: parsed.meaning_en,
              example_sentence: parsed.example_sentence,
            })
            .eq('id', wordId)
          queryClient.invalidateQueries({ queryKey: ['student-vocabulary'] })
        }
      }
    } catch (err) {
      console.error('Flashcard generation error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  // Review answer (spaced repetition)
  async function handleReview(wordId, knew) {
    const word = dueWords[quizIndex]
    if (!word) return

    const masteryOrder = ['new', 'learning', 'reviewing', 'mastered']
    const currentIdx = masteryOrder.indexOf(word.mastery)

    let newMastery
    if (knew) {
      newMastery = masteryOrder[Math.min(currentIdx + 1, 3)]
    } else {
      newMastery = masteryOrder[Math.max(currentIdx - 1, 0)]
    }

    const intervalDays = SR_INTERVALS[newMastery]
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + intervalDays)

    await supabase
      .from('vocabulary_bank')
      .update({
        mastery: newMastery,
        next_review: nextReview.toISOString(),
        review_count: (word.review_count || 0) + 1,
      })
      .eq('id', wordId)

    setShowAnswer(false)
    if (quizIndex < dueWords.length - 1) {
      setQuizIndex(quizIndex + 1)
    } else {
      setQuizMode(false)
      setQuizIndex(0)
      queryClient.invalidateQueries({ queryKey: ['student-vocabulary'] })
    }
  }

  // Delete word
  async function deleteWord(id) {
    await supabase.from('vocabulary_bank').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['student-vocabulary'] })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen size={24} className="text-sky-400" />
          بنك المفردات
        </h1>
        <p className="text-muted text-sm mt-1">تعلّم كلمات جديدة وراجعها بالتكرار المتباعد</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'الكل', value: stats.total, color: 'text-white' },
          { label: 'متقنة', value: stats.mastered, color: 'text-emerald-400' },
          { label: 'يتعلمها', value: stats.learning, color: 'text-yellow-400' },
          { label: 'للمراجعة', value: stats.dueForReview, color: 'text-sky-400' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-3 text-center"
          >
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Review button */}
      {dueWords.length > 0 && !quizMode && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => { setQuizMode(true); setQuizIndex(0); setShowAnswer(false) }}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base"
        >
          <Brain size={20} />
          مراجعة {dueWords.length} كلمة
        </motion.button>
      )}

      {/* Quiz mode */}
      <AnimatePresence>
        {quizMode && dueWords[quizIndex] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 text-center space-y-4"
          >
            <p className="text-xs text-muted">{quizIndex + 1} / {dueWords.length}</p>

            <div className="py-8">
              <p className="text-3xl font-bold text-white" dir="ltr">{dueWords[quizIndex].word}</p>
              {dueWords[quizIndex].example_sentence && showAnswer && (
                <p className="text-sm text-muted mt-3" dir="ltr">"{dueWords[quizIndex].example_sentence}"</p>
              )}
            </div>

            {showAnswer ? (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-lg text-white">{dueWords[quizIndex].meaning_ar || '—'}</p>
                  {dueWords[quizIndex].meaning_en && (
                    <p className="text-sm text-muted mt-1" dir="ltr">{dueWords[quizIndex].meaning_en}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleReview(dueWords[quizIndex].id, false)}
                    className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2 text-red-400"
                  >
                    <X size={18} />
                    ما أعرفها
                  </button>
                  <button
                    onClick={() => handleReview(dueWords[quizIndex].id, true)}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    أعرفها
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="btn-secondary py-3 w-full flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                اكشف المعنى
              </button>
            )}

            <button
              onClick={() => { setQuizMode(false); setQuizIndex(0) }}
              className="text-xs text-muted hover:text-white"
            >
              إنهاء المراجعة
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      {!quizMode && (
        <>
          <div className="flex items-center gap-2">
            {[
              { key: 'review', label: 'للمراجعة' },
              { key: 'all', label: 'كل الكلمات' },
              { key: 'add', label: 'إضافة كلمة' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Add word */}
          {tab === 'add' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5 space-y-3">
              <form
                onSubmit={(e) => { e.preventDefault(); if (addWord.trim()) addMutation.mutate(addWord) }}
                className="flex items-center gap-2"
              >
                <input
                  className="input-field flex-1"
                  value={addWord}
                  onChange={(e) => setAddWord(e.target.value)}
                  placeholder="اكتب كلمة إنجليزية..."
                  dir="ltr"
                />
                <button
                  type="submit"
                  disabled={!addWord.trim() || addMutation.isPending}
                  className="btn-primary py-2.5 px-4 flex items-center gap-1"
                >
                  {addMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  أضف
                </button>
              </form>
              <p className="text-xs text-muted">أضف كلمات جديدة وسيساعدك الذكاء الاصطناعي بالمعنى والأمثلة</p>
            </motion.div>
          )}

          {/* Word list */}
          {(tab === 'all' || tab === 'review') && (
            <div className="space-y-2">
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>
              ) : (
                (tab === 'review' ? dueWords : vocab)?.map((word, i) => {
                  const mastery = MASTERY_LABELS[word.mastery] || MASTERY_LABELS.new
                  return (
                    <motion.div
                      key={word.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base font-bold text-white" dir="ltr">{word.word}</span>
                            <span className={`badge-${mastery.color} text-[10px]`}>{mastery.emoji} {mastery.label}</span>
                          </div>
                          {word.meaning_ar && <p className="text-sm text-muted">{word.meaning_ar}</p>}
                          {word.meaning_en && <p className="text-xs text-muted" dir="ltr">{word.meaning_en}</p>}
                          {word.example_sentence && (
                            <p className="text-xs text-sky-400/70 mt-1" dir="ltr">"{word.example_sentence}"</p>
                          )}
                          <p className="text-[10px] text-muted mt-1">مراجعات: {word.review_count || 0}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!word.meaning_ar && (
                            <button
                              onClick={() => generateFlashcard(word.id, word.word)}
                              disabled={aiLoading}
                              className="text-violet-400 hover:text-violet-300 p-1.5"
                              title="توليد المعنى بالذكاء الاصطناعي"
                            >
                              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            </button>
                          )}
                          <button
                            onClick={() => deleteWord(word.id)}
                            className="text-muted hover:text-red-400 p-1.5"
                            title="حذف"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
              {!isLoading && ((tab === 'review' ? dueWords : vocab)?.length || 0) === 0 && (
                <div className="glass-card p-8 text-center">
                  <BookOpen size={32} className="text-muted mx-auto mb-2" />
                  <p className="text-muted">{tab === 'review' ? 'لا توجد كلمات للمراجعة الآن' : 'لم تضف كلمات بعد'}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
