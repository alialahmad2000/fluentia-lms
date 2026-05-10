import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Volume2, LayoutGrid, List, RotateCcw, CheckCircle, Dumbbell, Search, BookOpen, Headphones, PenLine, ChevronLeft, ChevronDown } from 'lucide-react'
import XPBadgeInline from '../../../../components/xp/XPBadgeInline'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { usePageReset } from '../../../../hooks/usePageReset'
import { toast } from '../../../../components/ui/FluentiaToast'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import VocabularyExercises from './VocabularyExercises'
import { useVocabularyMastery } from '../../../../hooks/useVocabularyMastery'
import WordExerciseModal from '../../../../components/vocabulary/WordExerciseModal'
import { useSRSCounts, useSRSDue } from '../../../../hooks/useSRS'
import ReviewOverlay from '../../../../components/student/vocabulary/ReviewOverlay'

const POS_AR = {
  noun: 'اسم', verb: 'فعل', adjective: 'صفة', adverb: 'ظرف',
  preposition: 'حرف جر', conjunction: 'حرف عطف', pronoun: 'ضمير',
}

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديدة' },
  { key: 'learning', label: 'تتعلمها' },
  { key: 'mastered', label: 'أتقنتها' },
]

const PAGE_SIZE = 40

const makeContainer = (count) => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: count > 30 ? 0.02 : 0.05 } },
})
const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ─── Progress Ring SVG ────────────────────────────────
function ProgressRing({ percent, size = 140 }) {
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setOffset(circumference - (percent / 100) * circumference)
    })
    return () => cancelAnimationFrame(timer)
  }, [percent, circumference])

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <defs>
        <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="url(#ring-gradient)" strokeWidth={stroke} fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  )
}

// ─── Main Component ─────────────────────────────────
export default function VocabularyTab({ unitId }) {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState('cards')
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [practiceMode, setPracticeMode] = useState(false)
  const [quickPractice, setQuickPractice] = useState(false)
  const [reviewedWords, setReviewedWords] = useState(new Set())
  const [isCompleted, setIsCompleted] = useState(false)
  const [progressLoading, setProgressLoading] = useState(true)
  const [exerciseWord, setExerciseWord] = useState(null)
  const [collapsedTiers, setCollapsedTiers] = useState({ extended: true, mastery: true })
  const hasSavedComplete = useRef(false)
  const timeRef = useRef(0)

  // Register page-specific reset actions
  usePageReset(() => {
    setSearchQuery('')
    setSearchOpen(false)
    setFilter('all')
    setPracticeMode(false)
    setQuickPractice(false)
    setExerciseWord(null)
  })
  const timerRef = useRef(null)
  const saveTimer = useRef(null)
  const progressIdRef = useRef(null)

  const { masteryMap, isLoading: masteryLoading, masteredCount, learningCount, getMastery } = useVocabularyMastery(profile?.id, unitId)

  // SRS review state
  const [reviewOpen, setReviewOpen] = useState(false)
  const { data: srsDueWords, refetch: refetchSRSDue } = useSRSDue(studentData?.id, { limit: 50, enabled: !!studentData?.id && profile?.role === 'student' })

  // Save word to personal list
  const studentId = studentData?.id
  const { data: savedWordSet = new Set() } = useQuery({
    queryKey: ['saved-words-set', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_saved_words')
        .select('word')
        .eq('student_id', studentId)
      return new Set((data || []).map(w => w.word.toLowerCase()))
    },
    enabled: !!studentId && profile?.role === 'student',
  })

  const saveWordMutation = useMutation({
    mutationFn: async (word) => {
      const { data, error } = await supabase.from('student_saved_words').upsert({
        student_id: studentId,
        word: word.word,
        meaning: word.definition_ar,
        source_unit_id: unitId,
        context_sentence: word.example_sentence || null,
        curriculum_vocabulary_id: word.id || null,
        source: 'manual',
        next_review_at: new Date().toISOString(),
      }, { onConflict: 'student_id,word' }).select()
      if (error) throw error
      // Log activity for SRS
      if (data?.[0]) {
        supabase.rpc('log_activity', {
          p_student_id: studentId,
          p_event_type: 'vocab_added',
          p_ref_table: 'student_saved_words',
          p_ref_id: data[0].id,
          p_xp_delta: 5,
          p_skill_impact: { vocabulary: 1 },
          p_metadata: { source: 'manual' },
        }).catch(() => {})
      }
    },
    onSuccess: (_, word) => {
      queryClient.invalidateQueries({ queryKey: ['saved-words-set', studentId] })
      queryClient.invalidateQueries({ queryKey: ['saved-words', studentId] })
      queryClient.invalidateQueries({ queryKey: ['srs-counts', studentId] })
      toast({ type: 'success', title: '✨ أضيفت لقاموسك' })
      window.dispatchEvent(new CustomEvent('fluentia:vocab-added', { detail: { word: word?.word } }))
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['unit-vocabulary', unitId],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id, reading_label')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (!readings?.length) return []
      const result = []
      for (const r of readings) {
        const { data: vocab } = await supabase
          .from('curriculum_vocabulary')
          .select('*')
          .eq('reading_id', r.id)
          .order('sort_order')
        result.push({ reading: r, vocabulary: vocab || [] })
      }
      return result
    },
    enabled: !!unitId,
  })

  const allWords = data?.flatMap(d => d.vocabulary) || []
  const totalWords = allWords.length

  // Filter SRS due words scoped to this unit
  const unitDueWords = useMemo(() => {
    if (!srsDueWords?.length || !allWords.length) return []
    const vocabIds = new Set(allWords.map(w => w.id))
    return srsDueWords.filter(w => w.curriculum_vocabulary_id && vocabIds.has(w.curriculum_vocabulary_id))
  }, [srsDueWords, allWords])
  const newCount = totalWords - masteredCount - learningCount
  const masteryPercent = totalWords > 0
    ? Math.round(((masteredCount * 1.0 + learningCount * 0.5) / totalWords) * 100)
    : 0

  // Filter & search
  const getWordMasteryLevel = useCallback((wordId) => {
    const m = getMastery(wordId)
    if (!m) return 'new'
    return m.mastery_level || 'new'
  }, [getMastery])

  const filterWord = useCallback((word) => {
    if (filter !== 'all' && getWordMasteryLevel(word.id) !== filter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      return word.word?.toLowerCase().includes(q) || word.definition_ar?.includes(q) || word.definition_en?.toLowerCase().includes(q)
    }
    return true
  }, [filter, searchQuery, getWordMasteryLevel])

  // Next un-mastered word for quick practice
  const nextUnmastered = useMemo(() => {
    return allWords.find(w => getWordMasteryLevel(w.id) !== 'mastered')
  }, [allWords, getWordMasteryLevel])

  const unmasteredLeft = useMemo(() => {
    return allWords.filter(w => getWordMasteryLevel(w.id) !== 'mastered').length
  }, [allWords, getWordMasteryLevel])

  // Time tracker
  useEffect(() => {
    timerRef.current = setInterval(() => { timeRef.current += 1 }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load saved progress
  useEffect(() => {
    if (!profile?.id || !unitId) { setProgressLoading(false); return }
    let isMounted = true
    const load = async () => {
      const { data: row } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', profile.id)
        .eq('unit_id', unitId)
        .eq('section_type', 'vocabulary')
        .maybeSingle()
      if (!isMounted) return
      if (row) {
        progressIdRef.current = row.id
        if (row.answers?.reviewedWords) setReviewedWords(new Set(row.answers.reviewedWords))
        setIsCompleted(row.status === 'completed')
        if (row.time_spent_seconds) timeRef.current = row.time_spent_seconds
        if (row.status === 'completed') hasSavedComplete.current = true
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [profile?.id, unitId])

  // Save progress
  const saveProgress = useCallback(async (reviewed, total) => {
    if (!profile?.id || !unitId) return
    const reviewedAll = reviewed.size >= total && total > 0
    const row = {
      student_id: profile.id, unit_id: unitId, section_type: 'vocabulary',
      status: reviewedAll ? 'completed' : 'in_progress',
      score: total > 0 ? Math.round((reviewed.size / total) * 100) : 0,
      answers: { reviewedWords: [...reviewed], totalWords: total },
      time_spent_seconds: timeRef.current,
      completed_at: reviewedAll ? new Date().toISOString() : null,
    }
    if (progressIdRef.current) {
      const { error } = await supabase.from('student_curriculum_progress').update(row).eq('id', progressIdRef.current)
      if (!error && reviewedAll && !hasSavedComplete.current) {
        hasSavedComplete.current = true; setIsCompleted(true)
        toast({ type: 'success', title: 'تم حفظ تقدمك' })
        awardCurriculumXP(profile.id, 'vocabulary', row.score, unitId)
        window.dispatchEvent(new CustomEvent('fluentia:activity:complete', { detail: { activityKey: 'vocabulary' } }))
      }
    } else {
      const { data: inserted, error } = await supabase.from('student_curriculum_progress').insert(row).select('id').single()
      if (!error && inserted) {
        progressIdRef.current = inserted.id
        if (reviewedAll && !hasSavedComplete.current) {
          hasSavedComplete.current = true; setIsCompleted(true)
          toast({ type: 'success', title: 'تم حفظ تقدمك' })
          awardCurriculumXP(profile.id, 'vocabulary', row.score, unitId)
          window.dispatchEvent(new CustomEvent('fluentia:activity:complete', { detail: { activityKey: 'vocabulary' } }))
        }
      }
    }
  }, [profile?.id, unitId])

  const markReviewed = useCallback((wordId) => {
    setReviewedWords(prev => {
      if (prev.has(wordId)) return prev
      const next = new Set(prev); next.add(wordId)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveProgress(next, totalWords), 2000)
      return next
    })
  }, [totalWords, saveProgress])

  const handlePracticeComplete = useCallback((reviewedIds) => {
    setReviewedWords(prev => {
      const next = new Set(prev)
      reviewedIds.forEach(id => next.add(id))
      saveProgress(next, totalWords)
      return next
    })
  }, [totalWords, saveProgress])

  const handleMasteryUpdate = useCallback((updated) => {
    if (!updated) return
    queryClient.setQueryData(['vocabulary-mastery', profile?.id, unitId], (prev) => ({
      ...prev,
      [updated.vocabulary_id]: updated,
    }))
    // If in quick practice and word is now mastered, auto-advance
    if (quickPractice && updated.mastery_level === 'mastered') {
      setTimeout(() => {
        const nextWord = allWords.find(w => w.id !== updated.vocabulary_id && getWordMasteryLevel(w.id) !== 'mastered')
        if (nextWord) setExerciseWord(nextWord)
        else { setExerciseWord(null); setQuickPractice(false) }
      }, 1500)
    }
  }, [queryClient, profile?.id, unitId, quickPractice, allWords, getWordMasteryLevel])

  const startQuickPractice = () => {
    if (nextUnmastered) {
      setQuickPractice(true)
      setExerciseWord(nextUnmastered)
    }
  }

  if (isLoading || progressLoading) return <VocabSkeleton />

  if (allWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <Languages size={28} className="text-white/20" />
        </div>
        <p className="text-white/40 font-['Tajawal'] text-sm">لا توجد مفردات في هذه الوحدة</p>
      </div>
    )
  }

  if (practiceMode) {
    return <FlashcardPractice words={allWords} onBack={() => setPracticeMode(false)} onComplete={handlePracticeComplete} />
  }

  return (
    <div className="space-y-6">
      {/* ① HERO HEADER */}
      <div className="relative rounded-2xl overflow-hidden p-6" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.05) 0%, rgba(129,140,248,0.05) 100%)', border: '1px solid rgba(255,255,255,0.04)' }}>
        {/* Subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)' }} />

        <div className="relative flex flex-col items-center gap-5">
          {/* Progress Ring */}
          <div className="relative">
            <ProgressRing percent={masteryPercent} size={140} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white font-['Inter']">{masteryPercent}%</span>
              <span className="text-[10px] text-white/40 font-['Tajawal'] -mt-0.5">إتقان</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h3 className="text-base font-bold text-white font-['Tajawal']">مفردات الوحدة</h3>
            <p className="text-xs text-white/40 font-['Tajawal'] mt-0.5">
              {masteredCount > 0 ? `أتقنت ${masteredCount} من ${totalWords} كلمة` : `${totalWords} كلمة للتعلم`}
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <StatCard icon="○" count={newCount} label="جديدة" color="rgba(148,163,184,0.6)" bg="rgba(255,255,255,0.03)" />
            <StatCard icon="◐" count={learningCount} label="تتعلمها" color="#f59e0b" bg="rgba(245,158,11,0.06)" />
            <StatCard icon="●" count={masteredCount} label="أتقنتها" color="#22c55e" bg="rgba(34,197,94,0.06)" />
          </div>
        </div>
      </div>

      {/* ② FILTER BAR + SEARCH */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
          {FILTERS.map((f, i) => (
            <motion.button
              key={f.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-['Tajawal'] whitespace-nowrap transition-all border ${
                filter === f.key
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                  : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/60'
              }`}
            >
              {f.label}
              {f.key === 'new' && newCount > 0 && <span className="mr-1 opacity-60">{newCount}</span>}
              {f.key === 'learning' && learningCount > 0 && <span className="mr-1 opacity-60">{learningCount}</span>}
              {f.key === 'mastered' && masteredCount > 0 && <span className="mr-1 opacity-60">{masteredCount}</span>}
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search */}
          <div className={`flex items-center rounded-full border transition-all overflow-hidden ${searchOpen ? 'w-40 bg-white/[0.03] border-white/[0.1]' : 'w-9 border-transparent'}`}>
            <button onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery('') }} className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white/60 flex-shrink-0">
              <Search size={14} />
            </button>
            {searchOpen && (
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن كلمة..."
                className="bg-transparent text-xs text-white placeholder:text-white/30 outline-none w-full pr-0 pl-2 py-1.5 font-['Tajawal']"
              />
            )}
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
            <button onClick={() => setViewMode('cards')} className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === 'cards' ? 'bg-sky-500/15 text-sky-400' : 'text-white/30 hover:text-white/50'}`}>
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setViewMode('list')} className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-sky-500/15 text-sky-400' : 'text-white/30 hover:text-white/50'}`}>
              <List size={13} />
            </button>
          </div>

          {/* Quick practice */}
          {unmasteredLeft > 0 && (
            <button onClick={startQuickPractice} className="flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/25 hover:bg-sky-500/25 transition-colors font-['Tajawal']">
              <Dumbbell size={12} />
              تمرّن
            </button>
          )}
        </div>
      </div>

      {/* SRS Due section (scoped to this unit) */}
      {profile?.role === 'student' && unitDueWords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🧠</span>
            <div>
              <p className="text-xs font-bold text-sky-400 font-['Tajawal']">
                للمراجعة ({unitDueWords.length})
              </p>
              <p className="text-[10px] text-white/30 font-['Tajawal']">كلمات من هذه الوحدة حان وقت مراجعتها</p>
            </div>
          </div>
          <button
            onClick={() => { refetchSRSDue().then(() => setReviewOpen(true)) }}
            className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-sky-300 font-['Tajawal'] transition-all hover:bg-sky-500/15"
            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            ابدأ المراجعة ◀
          </button>
        </motion.div>
      )}

      {/* Filter empty state */}
      {allWords.length > 0 && data.every(({ vocabulary }) => vocabulary.filter(filterWord).length === 0) && (
        <div className="text-center py-12">
          <p className="text-white/30 text-sm font-['Tajawal']">لا توجد كلمات تطابق الفلتر</p>
        </div>
      )}

      {/* ③ SECTIONS BY READING → TIER */}
      {data.map(({ reading, vocabulary }) => {
        const filtered = vocabulary.filter(filterWord)
        if (filtered.length === 0) return null
        const sectionMastered = filtered.filter(w => getWordMasteryLevel(w.id) === 'mastered').length

        // Group by tier
        const hasTiers = filtered.some(w => w.tier)
        const tierGroups = hasTiers ? [
          { key: 'core', label: 'الأساسية', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', words: filtered.filter(w => !w.tier || w.tier === 'core') },
          { key: 'extended', label: 'الإضافية', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', words: filtered.filter(w => w.tier === 'extended') },
          { key: 'mastery', label: 'المتقدمة', color: '#d4af37', bg: 'rgba(212,175,55,0.08)', words: filtered.filter(w => w.tier === 'mastery'), hint: 'للمراجعة لاحقاً' },
        ].filter(g => g.words.length > 0) : [{ key: 'all', words: filtered }]

        return (
          <div key={reading.id} className="space-y-3">
            {/* Section header */}
            {data.length > 1 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <BookOpen size={13} className="text-white/20" />
                  <span className="text-xs font-bold text-white/50 font-['Tajawal']">
                    مفردات القراءة {reading.reading_label}
                  </span>
                  <span className="text-[10px] text-white/25 font-['Tajawal']">
                    {filtered.length} كلمات {sectionMastered > 0 && `· أتقنت ${sectionMastered}`}
                  </span>
                </div>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>
            )}

            {tierGroups.map(tg => {
              const isCollapsed = tg.key !== 'all' && tg.key !== 'core' && collapsedTiers[tg.key]
              const toggleCollapse = () => setCollapsedTiers(prev => ({ ...prev, [tg.key]: !prev[tg.key] }))

              return (
                <div key={tg.key} className="space-y-3">
                  {/* Tier header (only if tiers exist) */}
                  {tg.key !== 'all' && (
                    <button
                      onClick={toggleCollapse}
                      className="w-full flex items-center gap-2 py-2 px-1 group"
                    >
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-['Tajawal']"
                        style={{ background: tg.bg, color: tg.color, border: `1px solid ${tg.color}22` }}
                      >
                        {tg.label}
                      </span>
                      <span className="text-[10px] text-white/25 font-['Tajawal']">
                        {tg.words.length} كلمة
                        {tg.hint && <span className="mr-1 text-white/15">· {tg.hint}</span>}
                      </span>
                      <div className="flex-1 h-px bg-white/[0.03]" />
                      <ChevronDown
                        size={14}
                        className="text-white/20 transition-transform"
                        style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                      />
                    </button>
                  )}

                  {/* Words grid/list */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <PaginatedTier
                          words={tg.words}
                          viewMode={viewMode}
                          getMastery={getMastery}
                          reviewedWords={reviewedWords}
                          markReviewed={markReviewed}
                          setExerciseWord={setExerciseWord}
                          savedWordSet={savedWordSet}
                          saveWordMutation={saveWordMutation}
                          profile={profile}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* ④ COMPLETION / PROGRESS BANNER */}
      {masteredCount >= totalWords && totalWords > 0 ? (
        <CompletionBanner />
      ) : masteredCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white/60 font-['Tajawal']">
              أتقنت {masteredCount} من {totalWords} كلمة — واصل!
            </p>
            <div className="h-1 rounded-full bg-white/[0.04] mt-1.5 overflow-hidden flex">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${masteryPercent}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Vocabulary Exercises */}
      <VocabularyExercises unitId={unitId} allWords={allWords} />

      {/* Per-word exercise modal */}
      <WordExerciseModal
        word={exerciseWord}
        unitWords={allWords}
        mastery={exerciseWord ? getMastery(exerciseWord.id) : null}
        studentId={profile?.id}
        isOpen={!!exerciseWord}
        onClose={() => { setExerciseWord(null); setQuickPractice(false) }}
        onMasteryUpdate={handleMasteryUpdate}
      />

      {/* Quick practice indicator */}
      {quickPractice && exerciseWord && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full text-xs font-bold font-['Tajawal'] text-white/70" style={{ background: 'rgba(10,22,40,0.9)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
          كلمة {totalWords - unmasteredLeft + 1} من {totalWords} المتبقية
        </div>
      )}

      {/* SRS Review Overlay */}
      <ReviewOverlay
        isOpen={reviewOpen}
        onClose={() => { setReviewOpen(false); refetchSRSDue() }}
        words={unitDueWords}
      />
    </div>
  )
}

// ─── Paginated Tier (prevents 500+ DOM nodes at once) ─
function PaginatedTier({ words, viewMode, getMastery, reviewedWords, markReviewed, setExerciseWord, savedWordSet, saveWordMutation, profile }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = words.slice(0, visibleCount)
  const hasMore = visibleCount < words.length

  if (viewMode === 'cards') {
    return (
      <>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
          variants={makeContainer(visible.length)}
          initial="hidden"
          animate="show"
        >
          {visible.map(v => (
            <motion.div key={v.id} variants={cardVariant}>
              <WordCard
                word={v}
                mastery={getMastery(v.id)}
                reviewed={reviewedWords.has(v.id)}
                onView={() => markReviewed(v.id)}
                onPractice={() => setExerciseWord(v)}
                isSaved={savedWordSet.has?.(v.word?.toLowerCase())}
                onSaveWord={() => saveWordMutation.mutate(v)}
                isStudent={profile?.role === 'student'}
              />
            </motion.div>
          ))}
        </motion.div>
        {hasMore && (
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="w-full py-2.5 mt-3 rounded-xl text-xs font-bold font-['Tajawal'] text-white/40 hover:text-white/60 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            عرض المزيد ({words.length - visibleCount} متبقي)
          </button>
        )}
      </>
    )
  }

  return (
    <>
      <WordListView vocabulary={visible} getMastery={getMastery} reviewedWords={reviewedWords} onView={markReviewed} onPractice={setExerciseWord} />
      {hasMore && (
        <button
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="w-full py-2.5 mt-3 rounded-xl text-xs font-bold font-['Tajawal'] text-white/40 hover:text-white/60 transition-colors"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          عرض المزيد ({words.length - visibleCount} متبقي)
        </button>
      )}
    </>
  )
}

// ─── Stat Card ────────────────────────────────────────
function StatCard({ icon, count, label, color, bg }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl" style={{ background: bg, border: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-sm" style={{ color }}>{icon}</span>
      <span className="text-lg font-black text-white font-['Inter']">{count}</span>
      <span className="text-[10px] text-white/40 font-['Tajawal']">{label}</span>
    </div>
  )
}

// ─── Word Card (Premium) ──────────────────────────────
function WordCard({ word, mastery, reviewed, onView, onPractice, isSaved, onSaveWord, isStudent }) {
  const audioRef = useRef(null)
  const [imgError, setImgError] = useState(false)
  const [playing, setPlaying] = useState(false)

  const playAudio = (e) => {
    e.stopPropagation()
    if (!word.audio_url) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(word.audio_url)
    audioRef.current.onplay = () => setPlaying(true)
    audioRef.current.onended = () => setPlaying(false)
    audioRef.current.onerror = () => setPlaying(false)
    audioRef.current.play().catch(() => setPlaying(false))
  }

  const isMastered = mastery?.mastery_level === 'mastered'
  const isLearning = mastery?.mastery_level === 'learning'
  const passedCount = [mastery?.meaning_exercise_passed, mastery?.sentence_exercise_passed, mastery?.listening_exercise_passed].filter(Boolean).length

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl overflow-hidden cursor-pointer group relative"
      style={{
        background: isMastered ? 'rgba(34,197,94,0.03)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isMastered ? 'rgba(34,197,94,0.2)' : isLearning ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.2s ease-out',
      }}
      onClick={() => { onView?.(); onPractice?.(word) }}
    >
      {/* Image section */}
      {word.image_url && !imgError ? (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={word.image_url}
            alt={word.word}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, rgba(10,22,40,1) 100%)' }} />
          {/* Mastery badge */}
          <div className="absolute top-2 left-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: isMastered ? '#22c55e' : isLearning ? '#f59e0b' : 'rgba(255,255,255,0.15)', boxShadow: isMastered ? '0 0 6px rgba(34,197,94,0.4)' : 'none' }} />
          </div>
        </div>
      ) : (
        <div className="relative aspect-[16/10] flex items-center justify-center overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
          <span className="text-2xl sm:text-3xl font-black text-white/[0.06] font-['Inter'] select-none">{word.word}</span>
          {/* Mastery badge */}
          <div className="absolute top-2 left-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: isMastered ? '#22c55e' : isLearning ? '#f59e0b' : 'rgba(255,255,255,0.15)', boxShadow: isMastered ? '0 0 6px rgba(34,197,94,0.4)' : 'none' }} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white font-['Inter'] leading-tight" dir="ltr">{word.word}</p>
            <p className="text-[11px] text-white/40 font-['Tajawal'] mt-0.5 line-clamp-1">
              {POS_AR[word.part_of_speech] || word.part_of_speech} · {word.definition_ar}
            </p>
            {word.tier && word.tier !== 'core' && (
              <span className="inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-bold font-['Tajawal']" style={{
                background: word.tier === 'extended' ? 'rgba(148,163,184,0.1)' : 'rgba(212,175,55,0.1)',
                color: word.tier === 'extended' ? '#94a3b8' : '#d4af37',
              }}>
                {word.tier === 'extended' ? 'إضافية' : 'متقدمة'}
              </span>
            )}
          </div>
          {word.audio_url && (
            <button
              onClick={playAudio}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: playing ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)' }}
            >
              {playing ? (
                <div className="flex items-end gap-[2px] h-3">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-[2px] bg-sky-400 rounded-full" animate={{ height: ['4px', '12px', '4px'] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />
                  ))}
                </div>
              ) : (
                <Volume2 size={14} className="text-white/40 group-hover:text-white/60" />
              )}
            </button>
          )}
        </div>

        {word.example_sentence && (
          <p className="text-[10px] text-white/25 font-['Inter'] leading-relaxed line-clamp-1 italic" dir="ltr">
            "{word.example_sentence}"
          </p>
        )}

        {/* Exercise dots + action */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              {[
                { passed: mastery?.meaning_exercise_passed, label: 'اختر المعنى' },
                { passed: mastery?.sentence_exercise_passed, label: 'أكمل الجملة' },
                { passed: mastery?.listening_exercise_passed, label: 'استمع واختر' },
              ].map((ex, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  title={ex.label}
                  style={{ background: ex.passed ? '#22c55e' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }}
                />
              ))}
            </div>
            {passedCount > 0 && passedCount < 3 && (
              <span className="text-[9px] text-white/20 font-['Tajawal']">{passedCount}/3</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isStudent && (
              <button
                onClick={(e) => { e.stopPropagation(); onSaveWord?.() }}
                className="text-[10px] font-bold font-['Tajawal'] transition-colors"
                style={{ color: isSaved ? 'rgba(56,189,248,0.7)' : 'rgba(255,255,255,0.25)' }}
              >
                {isSaved ? '📌 محفوظة' : '📌 احفظ'}
              </button>
            )}
            <span className={`text-[10px] font-bold font-['Tajawal'] ${
              isMastered ? 'text-emerald-400/70' : isLearning ? 'text-amber-400/70' : 'text-sky-400/70'
            }`}>
              {isMastered ? 'أتقنتها' : isLearning ? 'أكمل التمارين' : 'تمرّن'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Word List View ──────────────────────────────────
function WordListView({ vocabulary, getMastery, reviewedWords, onView, onPractice }) {
  const audioRef = useRef(null)

  const playAudio = (url, e) => {
    e.stopPropagation()
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  return (
    <div className="rounded-xl overflow-hidden divide-y divide-white/[0.04]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
      {vocabulary.map(v => {
        const mastery = getMastery?.(v.id)
        return (
          <WordListItem
            key={v.id}
            word={v}
            mastery={mastery}
            reviewed={reviewedWords?.has(v.id)}
            onView={() => onView?.(v.id)}
            onPractice={() => onPractice?.(v)}
            playAudio={playAudio}
          />
        )
      })}
    </div>
  )
}

function WordListItem({ word, mastery, reviewed, onView, onPractice, playAudio }) {
  const isMastered = mastery?.mastery_level === 'mastered'
  const isLearning = mastery?.mastery_level === 'learning'
  const passedCount = [mastery?.meaning_exercise_passed, mastery?.sentence_exercise_passed, mastery?.listening_exercise_passed].filter(Boolean).length

  return (
    <div className="flex items-center justify-between px-3 py-3 gap-3 hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => { onView?.(); onPractice?.() }}>
      {/* Right side: word info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mastery indicator */}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isMastered ? '#22c55e' : isLearning ? '#f59e0b' : 'rgba(255,255,255,0.1)' }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2" dir="ltr">
            <span className="text-sm font-semibold text-white font-['Inter']">{word.word}</span>
            <span className="text-[10px] text-white/25 font-['Inter']">{word.part_of_speech}</span>
          </div>
          <p className="text-[11px] text-white/35 font-['Tajawal'] line-clamp-1">{word.definition_ar}</p>
        </div>
      </div>

      {/* Left side: dots + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Exercise dots */}
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < passedCount ? '#22c55e' : 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>
        {word.audio_url && (
          <button
            onClick={(e) => { e.stopPropagation(); playAudio(word.audio_url, e) }}
            className="w-7 h-7 rounded-full bg-white/[0.04] text-white/30 flex items-center justify-center hover:bg-white/[0.08] hover:text-white/50 transition-colors"
          >
            <Volume2 size={12} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onPractice?.() }}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-['Tajawal'] transition-colors ${
            isMastered
              ? 'bg-emerald-500/10 text-emerald-400/70'
              : 'bg-sky-500/10 text-sky-400/70 hover:bg-sky-500/15'
          }`}
        >
          {isMastered ? 'أتقنتها' : 'تمرّن'}
        </button>
      </div>
    </div>
  )
}

// ─── Completion Banner ────────────────────────────────
function CompletionBanner() {
  return (
    <div className="relative rounded-2xl overflow-hidden px-5 py-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(6,78,59,0.3) 0%, rgba(6,95,70,0.2) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
      {/* CSS confetti */}
      <style>{`
        @keyframes confetti-fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(80px) rotate(360deg); opacity: 0; } }
        .confetti-dot { position: absolute; width: 4px; height: 4px; border-radius: 50%; animation: confetti-fall 3s ease-in-out infinite; }
      `}</style>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="confetti-dot"
          style={{
            left: `${8 + (i * 7.5)}%`,
            top: `${Math.random() * 20}%`,
            background: ['#22c55e', '#38bdf8', '#818cf8', '#f59e0b', '#ec4899'][i % 5],
            animationDelay: `${i * 0.25}s`,
            opacity: 0.5,
          }}
        />
      ))}
      <div className="relative z-10 space-y-2">
        <p className="text-3xl">🏆</p>
        <p className="text-base font-bold text-emerald-300 font-['Tajawal']">أتقنت جميع مفردات الوحدة!</p>
        <p className="text-xs text-emerald-400/60 font-['Tajawal']">+50 نقطة مكافأة</p>
      </div>
    </div>
  )
}

// ─── Flashcard Practice ──────────────────────────────
function FlashcardPractice({ words, onBack, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffled] = useState(() => [...words].sort(() => Math.random() - 0.5))
  const [seenIds] = useState(() => new Set())
  const audioRef = useRef(null)

  const word = shuffled[currentIndex]
  if (!word) return null
  seenIds.add(word.id)

  const next = () => { setFlipped(false); setTimeout(() => setCurrentIndex(i => Math.min(i + 1, shuffled.length - 1)), 150) }
  const prev = () => { setFlipped(false); setTimeout(() => setCurrentIndex(i => Math.max(i - 1, 0)), 150) }
  const playAudio = () => {
    if (!word.audio_url) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(word.audio_url)
    audioRef.current.play().catch(() => {})
  }
  const isLast = currentIndex >= shuffled.length - 1
  const handleFinish = () => { onComplete?.([...seenIds]); onBack() }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-full flex items-center justify-between text-xs text-white/40 font-['Tajawal']">
        <span>{currentIndex + 1} / {shuffled.length}</span>
        <button onClick={handleFinish} className="text-sky-400 hover:text-sky-300 font-bold">العودة للقائمة</button>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / shuffled.length) * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)' }} />
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className="w-full max-w-sm aspect-[3/2] rounded-2xl cursor-pointer select-none flex items-center justify-center p-6"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={flipped ? 'back' : 'front'}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            {!flipped ? (
              <>
                <p className="text-2xl font-bold text-white font-['Inter']">{word.word}</p>
                <p className="text-xs text-white/30 font-['Inter']">{word.part_of_speech}</p>
                <p className="text-xs text-white/20 font-['Tajawal']">اضغط لقلب البطاقة</p>
              </>
            ) : (
              <>
                {word.image_url && <img src={word.image_url} alt={word.word} className="w-16 h-16 rounded-lg object-cover" />}
                <p className="text-lg font-bold text-amber-400 font-['Tajawal']">{word.definition_ar}</p>
                <p className="text-sm text-white/50 font-['Inter']">{word.definition_en}</p>
                {word.example_sentence && <p className="text-xs text-white/25 font-['Inter'] italic" dir="ltr">"{word.example_sentence}"</p>}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={prev} disabled={currentIndex === 0} className="h-10 px-5 rounded-xl text-sm font-bold text-white/40 border border-white/[0.06] hover:text-white/60 transition-colors disabled:opacity-30 font-['Tajawal']" style={{ background: 'rgba(255,255,255,0.025)' }}>السابق</button>
        {word.audio_url && (
          <button onClick={playAudio} className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center hover:bg-sky-500/20 transition-colors">
            <Volume2 size={18} />
          </button>
        )}
        {isLast ? (
          <button onClick={handleFinish} className="h-10 px-5 rounded-xl text-sm font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-colors font-['Tajawal'] flex items-center gap-1"><span>إنهاء</span><XPBadgeInline amount={3} /></button>
        ) : (
          <button onClick={next} className="h-10 px-5 rounded-xl text-sm font-bold bg-sky-500/10 text-sky-400 border border-sky-500/25 hover:bg-sky-500/20 transition-colors font-['Tajawal']">التالي</button>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function VocabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="rounded-2xl p-6 flex flex-col items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="w-[140px] h-[140px] rounded-full bg-white/[0.03] animate-pulse" />
        <div className="h-4 w-28 rounded bg-white/[0.04] animate-pulse" />
        <div className="flex gap-3 w-full max-w-xs">
          {[0, 1, 2].map(i => <div key={i} className="flex-1 h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="aspect-[16/10] bg-white/[0.02]" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 w-16 rounded bg-white/[0.04]" />
              <div className="h-2.5 w-24 rounded bg-white/[0.03]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
