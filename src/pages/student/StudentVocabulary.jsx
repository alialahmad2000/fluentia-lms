import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Loader2, RotateCcw, Check, X, Sparkles, Brain, Zap, Star, BookMarked } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { ListSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { tracker } from '../../services/activityTracker'

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

const LEVEL_WORD_LISTS = {
  1: [
    'hello', 'goodbye', 'please', 'thank you', 'sorry', 'yes', 'no', 'water', 'food', 'house',
    'school', 'teacher', 'student', 'book', 'pen', 'family', 'mother', 'father', 'brother', 'sister',
    'friend', 'morning', 'night', 'today', 'tomorrow', 'name', 'number', 'phone', 'car', 'bus',
    'street', 'money', 'shop', 'big', 'small', 'good', 'bad', 'happy', 'sad', 'cold',
    'hot', 'eat', 'drink', 'go', 'come', 'want', 'need', 'help', 'speak', 'read', 'write',
  ],
  2: [
    'airport', 'restaurant', 'hospital', 'weather', 'hobby', 'weekend', 'breakfast', 'lunch', 'dinner', 'kitchen',
    'bedroom', 'bathroom', 'exercise', 'healthy', 'favorite', 'different', 'important', 'interesting', 'problem', 'solution',
    'meeting', 'appointment', 'address', 'email', 'password', 'expensive', 'cheap', 'always', 'never', 'sometimes',
    'before', 'after', 'already', 'together', 'alone', 'quickly', 'slowly', 'carefully', 'difficult', 'easy',
    'improve', 'practice', 'understand', 'remember', 'forget', 'explain', 'decide', 'prepare', 'complete', 'enjoy',
  ],
  3: [
    'opportunity', 'experience', 'environment', 'technology', 'education', 'culture', 'tradition', 'achievement', 'communication', 'confidence',
    'responsibility', 'professional', 'interview', 'career', 'application', 'deadline', 'presentation', 'research', 'discussion', 'debate',
    'advantage', 'disadvantage', 'recommendation', 'comparison', 'development', 'strategy', 'challenge', 'progress', 'motivation', 'influence',
    'perspective', 'analysis', 'conclusion', 'evidence', 'consequence', 'diversity', 'creativity', 'efficiency', 'flexibility', 'sustainability',
    'innovation', 'collaborate', 'negotiate', 'evaluate', 'demonstrate', 'participate', 'volunteer', 'establish', 'contribute', 'accomplish',
  ],
  4: [
    'ambiguity', 'hypothesis', 'paradigm', 'prerequisite', 'comprehensive', 'empirical', 'substantial', 'fundamental', 'predominantly', 'simultaneously',
    'bureaucracy', 'infrastructure', 'methodology', 'controversial', 'unprecedented', 'sophisticated', 'preliminary', 'consequently', 'nevertheless', 'furthermore',
    'deteriorate', 'exacerbate', 'facilitate', 'fluctuate', 'substantiate', 'articulate', 'consolidate', 'corroborate', 'disseminate', 'extrapolate',
    'jurisdiction', 'philanthropy', 'rhetoric', 'pragmatic', 'meticulous', 'resilient', 'indigenous', 'autonomous', 'ubiquitous', 'ambivalent',
    'paradox', 'stigma', 'catalyst', 'nuance', 'scrutiny', 'trajectory', 'disparity', 'cohesion', 'adversity', 'culminate',
  ],
  5: [
    'ambiguity', 'hypothesis', 'paradigm', 'prerequisite', 'comprehensive', 'empirical', 'substantial', 'fundamental', 'predominantly', 'simultaneously',
    'bureaucracy', 'infrastructure', 'methodology', 'controversial', 'unprecedented', 'sophisticated', 'preliminary', 'consequently', 'nevertheless', 'furthermore',
    'deteriorate', 'exacerbate', 'facilitate', 'fluctuate', 'substantiate', 'articulate', 'consolidate', 'corroborate', 'disseminate', 'extrapolate',
    'jurisdiction', 'philanthropy', 'rhetoric', 'pragmatic', 'meticulous', 'resilient', 'indigenous', 'autonomous', 'ubiquitous', 'ambivalent',
    'paradox', 'stigma', 'catalyst', 'nuance', 'scrutiny', 'trajectory', 'disparity', 'cohesion', 'adversity', 'culminate',
  ],
}

export default function StudentVocabulary() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('review') // review, all, add
  const [addWord, setAddWord] = useState('')
  const [quizMode, setQuizMode] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [addingSuggestion, setAddingSuggestion] = useState(null)

  const studentLevel = studentData?.academic_level || 1

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

  // Level word list and suggestions
  const levelWords = LEVEL_WORD_LISTS[studentLevel] || LEVEL_WORD_LISTS[1]
  const totalLevelWords = levelWords.length

  const existingWordsSet = useMemo(() => {
    const set = new Set()
    ;(vocab || []).forEach(w => set.add(w.word?.toLowerCase().trim()))
    return set
  }, [vocab])

  const suggestedWords = useMemo(() => {
    return levelWords.filter(w => !existingWordsSet.has(w.toLowerCase()))
  }, [levelWords, existingWordsSet])

  const masteredLevelWords = useMemo(() => {
    return (vocab || []).filter(w =>
      w.mastery === 'mastered' && levelWords.some(lw => lw.toLowerCase() === w.word?.toLowerCase().trim())
    ).length
  }, [vocab, levelWords])

  const levelProgressPercent = totalLevelWords > 0 ? Math.round((masteredLevelWords / totalLevelWords) * 100) : 0

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

  // Add suggested word
  async function addSuggestedWord(word) {
    setAddingSuggestion(word)
    try {
      const { error } = await supabase.from('vocabulary_bank').insert({
        student_id: profile?.id,
        word: word.trim(),
        mastery: 'new',
        next_review: new Date().toISOString(),
        review_count: 0,
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['student-vocabulary'] })

      // Auto-generate flashcard data via AI
      try {
        const res = await invokeWithRetry('ai-chatbot', {
          body: {
            message: `For the English word "${word}", provide: 1) Arabic meaning, 2) English meaning, 3) Example sentence. Format as JSON: {"meaning_ar": "...", "meaning_en": "...", "example_sentence": "..."}. Only respond with JSON.`,
            conversation_history: [],
          },
          
        })

        if (res.data?.reply) {
          let parsed
          try {
            parsed = JSON.parse(res.data.reply)
          } catch {
            const match = res.data.reply.match(/\{[^}]+\}/)
            if (match) parsed = JSON.parse(match[0])
          }

          if (parsed) {
            // Find the newly inserted word
            const { data: inserted } = await supabase
              .from('vocabulary_bank')
              .select('id')
              .eq('student_id', profile?.id)
              .eq('word', word.trim())
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (inserted) {
              await supabase
                .from('vocabulary_bank')
                .update({
                  meaning_ar: parsed.meaning_ar,
                  meaning_en: parsed.meaning_en,
                  example_sentence: parsed.example_sentence,
                })
                .eq('id', inserted.id)
              queryClient.invalidateQueries({ queryKey: ['student-vocabulary'] })
            }
          }
        }
      } catch (err) {
        console.error('Auto-generate flashcard error:', err)
      }
    } catch (err) {
      console.error('Add suggested word error:', err)
    } finally {
      setAddingSuggestion(null)
    }
  }

  // AI generate flashcard data
  async function generateFlashcard(wordId, word) {
    setAiLoading(true)
    try {
      const res = await invokeWithRetry('ai-chatbot', {
        body: {
          message: `For the English word "${word}", provide: 1) Arabic meaning, 2) English meaning, 3) Example sentence. Format as JSON: {"meaning_ar": "...", "meaning_en": "...", "example_sentence": "..."}. Only respond with JSON.`,
          conversation_history: [],
        },
        
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
      tracker.track('flashcards_completed', { cards_reviewed: dueWords.length })
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

  // Get 15 suggestions to display
  const displayedSuggestions = suggestedWords.slice(0, 15)

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <BookOpen size={20} strokeWidth={1.5} className="text-sky-400" />
          </div>
          بنك المفردات
        </h1>
        <p className="text-muted text-sm mt-1">تعلّم كلمات جديدة وراجعها بالتكرار المتباعد</p>
      </div>

      {/* Level Progress Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card-static p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-400" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              المستوى {studentLevel}
            </span>
          </div>
          <span className="text-xs text-muted">
            {levelProgressPercent}%
          </span>
        </div>
        <div className="w-full bg-[var(--surface-raised)] rounded-full h-2 mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${levelProgressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
          />
        </div>
        <p className="text-xs text-muted text-center">
          أتقنت {masteredLevelWords} من {totalLevelWords} كلمة في مستواك
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'الكل', value: stats.total, color: 'text-[var(--text-primary)]' },
          { label: 'متقنة', value: stats.mastered, color: 'text-emerald-400' },
          { label: 'يتعلمها', value: stats.learning, color: 'text-yellow-400' },
          { label: 'للمراجعة', value: stats.dueForReview, color: 'text-sky-400' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="fl-card-static p-3 text-center hover:translate-y-[-2px] transition-all duration-200"
          >
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Review button */}
      {dueWords.length > 0 && !quizMode && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => { tracker.track('flashcards_started', { total_cards: dueWords.length }); setQuizMode(true); setQuizIndex(0); setShowAnswer(false) }}
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
            className="fl-card-static p-7 text-center space-y-4"
          >
            <p className="text-xs text-muted">{quizIndex + 1} / {dueWords.length}</p>

            <div className="py-8">
              <p className="text-3xl font-bold text-[var(--text-primary)]" dir="ltr">{dueWords[quizIndex].word}</p>
              {dueWords[quizIndex].example_sentence && showAnswer && (
                <p className="text-sm text-muted mt-3" dir="ltr">"{dueWords[quizIndex].example_sentence}"</p>
              )}
            </div>

            {showAnswer ? (
              <div className="space-y-4">
                <div className="rounded-xl p-4" style={{ background: 'var(--surface-raised)' }}>
                  <p className="text-lg text-[var(--text-primary)]">{dueWords[quizIndex].meaning_ar || '—'}</p>
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
                onClick={() => { tracker.track('flashcard_flipped', { word: dueWords[quizIndex].word }); setShowAnswer(true) }}
                className="btn-secondary py-3 w-full flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                اكشف المعنى
              </button>
            )}

            <button
              onClick={() => { setQuizMode(false); setQuizIndex(0) }}
              className="text-xs text-muted hover:text-[var(--text-primary)]"
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
                    : 'text-muted hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Add word */}
          {tab === 'add' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="fl-card-static p-7 space-y-3">
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
              </div>

              {/* Suggested words section */}
              {displayedSuggestions.length > 0 && (
                <div className="fl-card-static p-7 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={16} className="text-amber-400" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">كلمات مقترحة</h3>
                    <span className="text-xs text-muted">(المستوى {studentLevel})</span>
                  </div>
                  <p className="text-xs text-muted">اضغط على الكلمة لإضافتها إلى بنك المفردات</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {displayedSuggestions.map(word => (
                      <motion.button
                        key={word}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addSuggestedWord(word)}
                        disabled={addingSuggestion === word}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-400 transition-all disabled:opacity-50"
                        dir="ltr"
                      >
                        {addingSuggestion === word ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Plus size={12} />
                        )}
                        {word}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Word list */}
          {(tab === 'all' || tab === 'review') && (
            <div className="space-y-2">
              {isLoading ? (
                <ListSkeleton rows={4} />
              ) : (
                (tab === 'review' ? dueWords : vocab)?.map((word, i) => {
                  const mastery = MASTERY_LABELS[word.mastery] || MASTERY_LABELS.new
                  return (
                    <motion.div
                      key={word.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="fl-card p-4 hover:translate-y-[-2px] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base font-bold text-[var(--text-primary)]" dir="ltr">{word.word}</span>
                            <span className={`badge-${mastery.color} text-xs`}>{mastery.emoji} {mastery.label}</span>
                          </div>
                          {word.meaning_ar && <p className="text-sm text-muted">{word.meaning_ar}</p>}
                          {word.meaning_en && <p className="text-xs text-muted" dir="ltr">{word.meaning_en}</p>}
                          {word.example_sentence && (
                            <p className="text-xs text-sky-400/70 mt-1" dir="ltr">"{word.example_sentence}"</p>
                          )}
                          <p className="text-xs text-muted mt-1">مراجعات: {word.review_count || 0}</p>
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
                <div className="space-y-4">
                  <EmptyState
                    icon={BookMarked}
                    title={tab === 'review' ? 'لا توجد كلمات للمراجعة الآن' : 'لم تضف كلمات بعد'}
                    description={tab === 'review' ? 'أحسنت! لا توجد كلمات مستحقة للمراجعة حالياً' : 'أضف كلمات جديدة لبدء التعلم'}
                  />

                  {/* Show suggestions when vocab bank is empty in "all" tab */}
                  {tab === 'all' && displayedSuggestions.length > 0 && (
                    <div className="fl-card-static p-7">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles size={16} className="text-amber-400" />
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">كلمات مقترحة</h3>
                        <span className="text-xs text-muted">(المستوى {studentLevel})</span>
                      </div>
                      <p className="text-xs text-muted mb-3 text-center">ابدأ بإضافة بعض الكلمات المقترحة لمستواك</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {displayedSuggestions.map(word => (
                          <motion.button
                            key={word}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => addSuggestedWord(word)}
                            disabled={addingSuggestion === word}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-400 transition-all disabled:opacity-50"
                            dir="ltr"
                          >
                            {addingSuggestion === word ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            {word}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
