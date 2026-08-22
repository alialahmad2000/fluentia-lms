import { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Volume2, CheckCircle, XCircle, Lightbulb, MessageSquare, ChevronDown, RotateCcw, History, Clock, ImageOff, Eye, EyeOff, StickyNote, Headphones, FileText, Loader2, Zap, Settings, GraduationCap, Target } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { pickLatestAttempt } from '../../../../lib/activitySave'
import { useActivitySave } from '../../../../hooks/useActivitySave'
import SaveStatus from '../../../../components/ui/SaveStatus'
import SubmitReminderBar from '../../../../components/curriculum/SubmitReminderBar'
// PERSONALIZATION-REVERT 2026-05-19: hidden from default flow.
// Canonical curriculum is the single default. To re-introduce as opt-in secondary
// surface later: see docs/audits/personalization-revert/PHASE-A-REPORT.md
// import PersonalizedReadingCard from '../../../../components/personalization/PersonalizedReadingCard'
import { useEffectiveStudentId, useAuthStore } from '../../../../stores/authStore'
import { useG, genderizeText } from '@/i18n/gender'
import { toast } from '../../../../components/ui/FluentiaToast'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import { useCurriculumPreview } from '../../../../contexts/CurriculumPreviewContext'
import TextSelectionTooltip from '../../../../components/student/TextSelectionTooltip'
import XPBadgeInline from '../../../../components/xp/XPBadgeInline'
import PageHelp from '../../../../components/PageHelp'
import { usePointerType } from '../../../../hooks/usePointerType'
import { useReadingPrefs } from '../../../../hooks/useReadingPrefs'
import { usePageReset } from '../../../../hooks/usePageReset'
import { useReadingPassageAudio } from '../../../../hooks/useReadingPassageAudio'
import { useWordHighlights } from '../../../../hooks/useWordHighlights'
import { useUnitVocabSet } from '../../../../hooks/useUnitVocabSet'
import SmartAudioPlayer from '../../../../components/audio/SmartAudioPlayer'
import WordLens from '../../../../components/audio/wordlens'
import ArticleMasthead from '../../../../components/curriculum/reading/ArticleMasthead'
import ArticleBody from '../../../../components/curriculum/reading/ArticleBody'
import WordPopup from '../../../../components/curriculum/reading/WordPopup'
import ReadingTools from '../../../../components/curriculum/reading/ReadingTools'
import StudySheet from '../../../../components/curriculum/reading/StudySheet'
import { ReadingContract, ReadingOutcome, PassageFoldedBar } from '../../../../components/curriculum/reading/ReadingSession'
import SectionJumper from '../../../../components/curriculum/SectionJumper'
import SectionBand from '../../../../components/curriculum/SectionBand'
import { useArticleVocabIndex } from '../../../../hooks/useArticleVocabIndex'
import { trackEvent } from '../../../../lib/trackEvent'
import QuestionHint from '../../../../components/curriculum/questions/QuestionHint'
import VerdictPanel from '../../../../components/curriculum/questions/VerdictPanel'
import '../../../../components/curriculum/questions/questionCards.css'

// The two presentations a student can switch between at any point in the
// article. Read-along is not a separate page — it is the same column, performed.
// A third «مشاهد» (scenes) mode is designed and prototyped but deliberately NOT
// shipped here: it needs per-reading scene breaks + titles that do not exist in
// the schema yet (see the reading-redesign plan).
const READING_MODES = [
  { id: 'read', label: 'قراءة' },
  { id: 'listen', label: 'استماع' },
]

// A1/A2 second-language reading speed. The 200wpm native default would tell a
// beginner she has one minute left when she has four.
const READING_WPM = 90

// What the jump rail offers. SectionJumper drops any entry whose block did
// not render, so a reading with no vocabulary simply shows one chip fewer.
const SECTION_NAV = [
  { id: 'sec-contract', label: 'قبل القراءة', icon: Target },
  { id: 'sec-text', label: 'المقال', icon: FileText },
  { id: 'sec-vocab', label: 'المفردات', icon: BookOpen },
  { id: 'sec-study', label: 'ورقة المذاكرة', icon: GraduationCap },
  { id: 'sec-questions', label: 'الأسئلة', icon: CheckCircle },
  { id: 'sec-thinking', label: 'تفكير ناقد', icon: MessageSquare },
  { id: 'sec-take', label: 'الحصيلة', icon: GraduationCap },
]

const QUESTION_TYPE_LABELS = {
  main_idea: 'الفكرة الرئيسية',
  detail: 'تفاصيل',
  vocabulary: 'مفردات',
  inference: 'استنتاج',
}

const QUESTION_TYPE_COLORS = {
  main_idea: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  detail: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  vocabulary: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inference: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

function estimateReadingTime(wordCount) {
  if (!wordCount || wordCount <= 0) return null
  return Math.max(1, Math.ceil(wordCount / 200))
}

// ─── Premium Image with fallback ─────────────────────
function PremiumImage({ src, alt, className, aspectClass = 'aspect-[16/9]' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={`${aspectClass} bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center ${className || ''}`}>
        <ImageOff size={32} className="text-slate-600" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${aspectClass} w-full object-cover ${className || ''}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

// ─── Main Component ─────────────────────────────────
export default function ReadingTab({ unitId }) {
  const [activeReading, setActiveReading] = useState(0)
  // Effective (impersonation-aware) student — never `user.id`, see authStore.
  const studentId = useEffectiveStudentId()
  const { readOnly } = useCurriculumPreview() // teacher preview: never persist progress

  const { data: readings, isLoading } = useQuery({
    queryKey: ['unit-readings', unitId],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_readings')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <ReadingSkeleton />

  if (!readings?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <BookOpen size={40} className="text-slate-600" />
        <p className="text-slate-500 font-['Tajawal']">لا توجد قراءة لهذه الوحدة بعد</p>
      </div>
    )
  }

  const reading = readings[activeReading]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Sub-tabs for Reading A / B */}
      {readings.length > 1 && (
        <div className="flex gap-2">
          {readings.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setActiveReading(i)}
              className={`px-5 h-10 rounded-xl text-sm font-bold border transition-all duration-200 font-['Tajawal'] ${
                activeReading === i
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-lg shadow-sky-500/5'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800/60 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              القراءة {r.reading_label || String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={reading.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <ReadingContent reading={reading} studentId={studentId} unitId={unitId} />
        </motion.div>
      </AnimatePresence>

      <PageHelp pageKey="curriculum.reading.passage" />
    </div>
  )
}

// ─── Reading Content (passage + vocab + questions + critical thinking) ───
// Uses INSERT-per-attempt model (same as Grammar) to prevent autosave from
// overwriting a previous completed row's score/status during a retry.
function ReadingContent({ reading, studentId, unitId }) {
  const g = useG()
  // One hook owns persistence for this passage — row, attempt, queue, outbox,
  // readOnly guard and save state. See hooks/useActivitySave.js.
  const {
    state: saveState, lastSavedAt, readOnly,
    saveNow, submit: submitAttempt, startNewAttempt, adoptAttempt,
  } = useActivitySave({ studentId, unitId, sectionType: 'reading', activityId: reading?.id })
  // The «session» shape is opt-in PER READING (curriculum_readings.experience_version)
  // so it can be switched off from the database with no deploy, and every other
  // reading on the platform renders exactly as it did before.
  const sessionMode = reading?.experience_version === 'session'
  const [passageFolded, setPassageFolded] = useState(false)
  const [savedProgress, setSavedProgress] = useState(null)
  const [progressLoading, setProgressLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [allAttempts, setAllAttempts] = useState([])
  const [bestScore, setBestScore] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const submittedRef = useRef(false)
  const retryKeyRef = useRef(0)
  const timeRef = useRef(0)
  const timerRef = useRef(null)

  // Time tracker — starts on mount, stops on unmount
  useEffect(() => {
    timerRef.current = setInterval(() => { timeRef.current += 1 }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load existing progress — multi-row query (no longer maybeSingle after dropping scp_unique_reading)
  useEffect(() => {
    if (!studentId || !reading?.id) { setProgressLoading(false); return }
    let isMounted = true
    const load = async () => {
      const { data: rows } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('reading_id', reading.id)
        .order('attempt_number', { ascending: false })
      if (!isMounted) return

      if (rows && rows.length > 0) {
        setAllAttempts(rows)
        // Deterministic pick + merge of any same-attempt duplicates. Ordering by
        // attempt_number alone leaves ties in arbitrary order, so the old
        // `rows.find(r => r.is_latest)` could restore a row holding ONE answer
        // while the student's other answers sat in a sibling row.
        const { row: latest, answers: mergedAnswers, duplicates } = pickLatestAttempt(rows)
        const best = rows.reduce((b, r) => (r.score || 0) > (b?.score || 0) ? r : b, rows[0])
        setBestScore(best?.score ?? null)
        setAttemptNumber(latest.attempt_number || 1)

        if (latest.status === 'completed') {
          setSavedProgress(latest)
          setIsCompleted(true)
          if (latest.time_spent_seconds) timeRef.current = latest.time_spent_seconds
          adoptAttempt(latest)  // a retry allocates a fresh attempt server-side
        } else {
          // in_progress — restore this row for continued autosave, showing the
          // merged answers so nothing stranded in a duplicate is lost.
          setSavedProgress({ ...latest, answers: mergedAnswers })
          adoptAttempt(latest)
          if (latest.time_spent_seconds) timeRef.current = latest.time_spent_seconds
        }

      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, reading?.id, readOnly, adoptAttempt])

  // Retry handler — clears local state; a new DB row is created on first answer
  const handleRetry = () => {
    startNewAttempt()
    submittedRef.current = false
    setRetrying(true)
    retryKeyRef.current += 1
  }

  // Autosave. The server refuses to shrink a payload or reopen a submitted
  // attempt, so a stale flush landing late can no longer erase newer answers.
  const handleComprehensionAutosave = useCallback(async (answers) => {
    await saveNow(answers, { timeSpent: timeRef.current })
  }, [saveNow])

  // Explicit submit — the ONLY path that completes the attempt and awards XP.
  //
  // Replaces ~120 lines that chose between UPDATE and INSERT, flipped is_latest,
  // recomputed is_best in an order-dependent two-step, and re-read the table to
  // find out what had happened. The RPC does all of it in one transaction and
  // returns the stored row, so success here means the work is genuinely on the
  // server — not that an HTTP 200 came back.
  const handleComprehensionComplete = useCallback(async (answers, score) => {
    const res = await submitAttempt(answers, { score, timeSpent: timeRef.current })

    if (!res?.ok) {
      // Do NOT flip the UI to submitted. Showing a score for an attempt that
      // never landed is the failure this whole pass exists to end.
      if (!res?.queued) toast({ type: 'error', title: 'حدث خطأ أثناء الحفظ — حاول مرة ثانية' })
      return false
    }

    const { data: refreshed } = await supabase
      .from('student_curriculum_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('reading_id', reading.id)
      .order('attempt_number', { ascending: false })

    if (refreshed) setAllAttempts(refreshed)
    setSavedProgress(res.row)
    setAttemptNumber(res.row.attempt_number)
    const best = refreshed?.reduce((b, r) => (r.score || 0) > (b?.score || 0) ? r : b, refreshed[0])
    if (best?.score != null) setBestScore(best.score)
    setRetrying(false)
    setIsCompleted(true)
    toast({ type: 'success', title: 'تم حفظ تقدمك' })
    awardCurriculumXP(studentId, 'reading', score, unitId)
    window.dispatchEvent(new CustomEvent('fluentia:activity:complete', { detail: { activityKey: 'reading', score } }))
    return true
  }, [studentId, reading?.id, unitId, saveNow, submitAttempt])

  const { data: vocabulary } = useQuery({
    queryKey: ['reading-vocab', reading.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_vocabulary')
        .select('*')
        .eq('reading_id', reading.id)
        .order('sort_order')
      return data || []
    },
    enabled: !!reading?.id,
  })

  const { data: questions } = useQuery({
    queryKey: ['reading-questions', reading.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_comprehension_questions')
        .select('*')
        .eq('reading_id', reading.id)
        .order('sort_order')
      return data || []
    },
    enabled: !!reading?.id,
  })

  const vocabMap = useMemo(() => {
    const map = {}
    vocabulary?.forEach(v => { map[v.word.toLowerCase()] = v })
    return map
  }, [vocabulary])

  const readingTime = estimateReadingTime(reading.passage_word_count)
  const passageRef = useRef(null)
  const queryClient = useQueryClient()
  const pointerType = usePointerType()
  const { prefs, setPref } = useReadingPrefs()
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [focusParagraph, setFocusParagraph] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [savedWordSet, setSavedWordSet] = useState(new Set())
  const [summaryAr, setSummaryAr] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [vocabQuiz, setVocabQuiz] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [wordLensState, setWordLensState] = useState({ open: false })
  const audioPlayStartedRef = useRef(false)
  const hoverCache = useRef(new Map())

  // Editorial rebuild: default reading surface + secondary tools drawer.
  const [toolsOpen, setToolsOpen] = useState(false)
  // Mode is a reading PREFERENCE, not a per-article decision — it persists per
  // student so she is not re-asked on every passage.
  const MODE_KEY = 'fluentia:readingMode'
  const [audioMode, setAudioModeRaw] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) === 'listen' } catch { return false }
  })
  const setAudioMode = useCallback((next) => {
    setAudioModeRaw((prev) => {
      const val = typeof next === 'function' ? next(prev) : next
      try { localStorage.setItem(MODE_KEY, val ? 'listen' : 'read') } catch {}
      return val
    })
  }, [])
  const [arabicMode, setArabicMode] = useState(false) // whole-article Arabic (no source data — honest notice)
  const [wordPopup, setWordPopup] = useState(null)     // { word, rect, vocabRow }
  const { data: articleVocabIndex = new Map() } = useArticleVocabIndex(reading?.id, reading?.passage_content?.paragraphs)

  // How many of THIS passage's words carry the target-vocabulary mark. Printed
  // in the masthead so the gold in the body reads as a promise ("these are the
  // words you're learning here"), not as decoration.
  const targetWordCount = useMemo(() => {
    if (!(articleVocabIndex instanceof Map)) return 0
    let n = 0
    for (const row of articleVocabIndex.values()) if (row?.is_vocab === true) n += 1
    return n
  }, [articleVocabIndex])

  // Audio data for SmartAudioPlayer
  const { audioData, loading: audioLoading } = useReadingPassageAudio(reading?.id, reading?.passage_content)

  // Student word highlights
  const { highlights, lookup: highlightLookup, addHighlight, removeHighlight, updateColor, addNote } = useWordHighlights({
    studentId,
    contentId: reading?.id,
    contentType: 'reading',
  })

  // Vocab set (from unit via readings join)
  const { vocabSet: unitVocabSet } = useUnitVocabSet(reading?.unit_id)
  // Fallback: also include words from the already-loaded vocabulary query
  const vocabSet = useMemo(() => {
    const set = new Set(unitVocabSet)
    ;(vocabulary || []).forEach(v => set.add(v.word.toLowerCase()))
    return set
  }, [unitVocabSet, vocabulary])

  // Hover handler (desktop) — looks up vocab, shows WordTooltip via callback
  const handleWordHover = useCallback(async (word, segIdx, wordIdx, el, setTooltip) => {
    const cached = hoverCache.current.get(word)
    if (cached !== undefined) { setTooltip(cached); return }
    const { data } = await supabase
      .from('curriculum_vocabulary')
      .select('word, definition_ar, pronunciation_ipa')
      .ilike('word', word)
      .limit(1)
      .maybeSingle()
    const result = data || null
    hoverCache.current.set(word, result)
    setTooltip(result)
  }, [])

  // Extract the sentence containing the wordIdx-th word from segment text_content.
  // Counts only letter-bearing tokens so it stays in sync with KaraokeText's index rules.
  const extractContextSentence = useCallback((segIdx, wordIdx) => {
    const text = audioData?.segments?.[segIdx]?.text_content || ''
    if (!text || wordIdx == null || wordIdx < 0) return text || null
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
    let cumulative = 0
    for (const s of sentences) {
      const count = (s.match(/[A-Za-z']+/g) || []).length
      if (wordIdx < cumulative + count) return s.trim()
      cumulative += count
    }
    return (sentences[sentences.length - 1] || text).trim()
  }, [audioData])

  const openWordLens = useCallback((rawWord, segIdx, wordIdx, position, prefetched = null) => {
    const clean = (typeof rawWord === 'string' ? rawWord : '').replace(/[.,!?;:'"()\[\]]/g, '').toLowerCase().trim()
    if (!clean || clean.length < 2) return
    const pos = position && typeof position === 'object'
      ? position
      : { x: typeof position === 'number' ? position : window.innerWidth / 2, y: window.innerHeight * 0.4 }
    const wordTimestamp = audioData?.segments?.[segIdx]?.word_timestamps?.[wordIdx] || null
    const contextSentence = extractContextSentence(segIdx, wordIdx)
    setWordLensState({
      open: true,
      word: clean,
      contextSentence,
      position: pos,
      wordTimestamp,
      prefetched,
    })
  }, [audioData, extractContextSentence])

  // Vocab word tap — has the curriculum row in vocabMap already; pass it as prefetched.
  const handleVocabWordTap = useCallback((word, segIdx, wordIdx, _anchorEl, position) => {
    const clean = (typeof word === 'string' ? word : '').replace(/[.,!?;:'"()\[\]]/g, '').toLowerCase().trim()
    const prefetched = clean ? (vocabMap[clean] || null) : null
    openWordLens(word, segIdx, wordIdx, position, prefetched)
    trackEvent('reading_vocab_tap', { word: clean, passage_id: reading?.id, has_prefetched: !!prefetched })
  }, [vocabMap, openWordLens, reading?.id])

  // Long-press on any word — open lens; lookup falls through tiers inside WordLens.
  const handleWordClick = useCallback((word, segIdx, position, wordIdx) => {
    openWordLens(word, segIdx, wordIdx, position, null)
    const clean = (typeof word === 'string' ? word : '').replace(/[.,!?;:'"()\[\]]/g, '').toLowerCase().trim()
    trackEvent('reading_word_lookup', { passage_id: reading?.id, word: clean, found_in_vocab: !!vocabMap[clean] })
  }, [openWordLens, vocabMap, reading?.id])

  // Register page-specific reset actions
  usePageReset(() => {
    document.querySelectorAll('audio').forEach(a => a.pause())
    setFocusMode(false)
    setFocusParagraph(0)
    setPrefsOpen(false)
    setSummaryAr(null)
    setVocabQuiz(null)
    setQuizAnswers({})
  })

  // Fetch student's saved words to highlight them.
  // ['saved-words-set'] is shared with VocabularyTab. It used to hold an ARRAY here
  // and a SET there, so whichever tab rendered second got the wrong shape and the
  // section crashed ("X.map is not a function" / "X?.has is not a function").
  // The key now has ONE canonical shape everywhere: an array of lowercase words.
  // Reads vocab_cards, the unified saved-word store (student_saved_words has been
  // dead since 2026-06-05, so highlighting was silently matching nothing).
  const { data: savedWords } = useQuery({
    queryKey: ['saved-words-set', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('vocab_cards')
        .select('word_normalized')
        .eq('student_id', studentId)
      return (data || []).map((w) => (w.word_normalized || '').toLowerCase()).filter(Boolean)
    },
    enabled: !!studentId,
  })

  useEffect(() => {
    // Array.isArray guard: never trust the shape coming out of a persisted cache.
    setSavedWordSet(new Set(Array.isArray(savedWords) ? savedWords : []))
  }, [savedWords])

  // Track passage open
  useEffect(() => {
    if (!reading?.id) return
    trackEvent('reading_passage_open', {
      passage_id: reading.id,
      unit_id: unitId,
      has_audio: !!audioData,
    })
  }, [reading?.id]) // eslint-disable-line

  // MEGA-FIX V2 Phase C + INSTANT-TAP (2026-06) — pre-warm per-word audio so
  // the first tap on a word plays from memory (no network round-trip). We
  // resolve the URLs AND eagerly fetch the MP3 bytes into in-memory blob URLs.
  // Vocabulary / highlighted words are byte-warmed first since they're the
  // words students are most likely to tap.
  useEffect(() => {
    if (!reading?.passage_content) return
    let aborted = false
    const paragraphs = reading.passage_content?.paragraphs || []
    const passageText = paragraphs.join('\n\n')
    // Priority = the highlighted vocab words (Set of lowercased words) + the
    // article vocab index keys — most-tapped words get instant bytes first.
    const priorityWords = [
      ...vocabSet,
      ...(articleVocabIndex instanceof Map ? articleVocabIndex.keys() : []),
    ]
    import('@/lib/audio/pronounceWord').then(({ prewarmPassageWords }) => {
      if (aborted) return
      prewarmPassageWords(passageText, { priorityWords })
    }).catch(() => {})
    return () => { aborted = true }
  }, [reading?.id, reading?.passage_content, vocabSet, articleVocabIndex])

  const handleWordSaved = useCallback((word) => {
    if (word.startsWith('__remove__')) {
      const removed = word.replace('__remove__', '').toLowerCase()
      setSavedWordSet(prev => {
        const next = new Set(prev)
        next.delete(removed)
        return next
      })
    } else {
      setSavedWordSet(prev => new Set([...prev, word.toLowerCase()]))
    }
    queryClient.invalidateQueries({ queryKey: ['saved-words-set', studentId] })
    queryClient.invalidateQueries({ queryKey: ['saved-words', studentId] })
  }, [studentId, queryClient])

  // AI Arabic Summary
  const handleSummary = useCallback(async () => {
    if (summaryAr || summaryLoading) return
    setSummaryLoading(true)
    try {
      const passageText = (reading.passage_content?.paragraphs || []).join('\n\n')
      const resp = await fetch('/api/passage-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passage_id: reading.id, passage_text: passageText }),
      })
      const data = await resp.json()
      if (data.summary_ar) setSummaryAr(data.summary_ar)
    } catch {
      toast({ type: 'error', title: 'فشل تحميل الملخص' })
    } finally {
      setSummaryLoading(false)
    }
  }, [reading, summaryAr, summaryLoading])

  // Auto vocab quiz from saved words
  const handleVocabQuiz = useCallback(async () => {
    if (quizLoading || vocabQuiz) return
    setQuizLoading(true)
    try {
      const wordsArr = Array.from(savedWordSet).slice(0, 5).map(w => ({ word: w }))
      const resp = await fetch('/api/generate-vocab-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsArr }),
      })
      const data = await resp.json()
      if (data.questions?.length) setVocabQuiz(data.questions)
    } catch {
      toast({ type: 'error', title: 'فشل إنشاء الاختبار' })
    } finally {
      setQuizLoading(false)
    }
  }, [savedWordSet, quizLoading, vocabQuiz])

  // Reading progress bar — track scroll
  useEffect(() => {
    const container = passageRef.current
    if (!container) return
    const handler = () => {
      const rect = container.getBoundingClientRect()
      if (rect.height <= 0) return
      // Measure against a READ-LINE at 60% of the viewport, not the top of the
      // screen. Anchoring at the top counts a whole screenful as read the moment
      // the article scrolls into view.
      // (The old code compared scrollHeight to clientHeight — both equal on a
      // non-scrolling block — so `total <= 0` was always true and it reported
      // 100% immediately.)
      const readLine = window.innerHeight * 0.6
      const pct = ((readLine - rect.top) / rect.height) * 100
      setScrollProgress(Math.round(Math.min(100, Math.max(0, pct))))
    }
    window.addEventListener('scroll', handler, { passive: true })
    window.addEventListener('resize', handler)
    handler()
    return () => {
      window.removeEventListener('scroll', handler)
      window.removeEventListener('resize', handler)
    }
    // Re-bind when the rendered surface changes: the ref is null on first mount
    // (content loads async) and the node is swapped when switching article A/B
    // or entering read-along.
  }, [reading?.id, audioMode])

  // Focus mode — IntersectionObserver
  useEffect(() => {
    if (!focusMode || !passageRef.current) return
    const paragraphs = passageRef.current.querySelectorAll('[data-paragraph-index]')
    if (!paragraphs.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.paragraphIndex, 10)
            if (!isNaN(idx)) setFocusParagraph(idx)
          }
        })
      },
      { threshold: 0.5 }
    )
    paragraphs.forEach(p => observer.observe(p))
    return () => observer.disconnect()
  }, [focusMode])

  // Fetch reading notes per paragraph
  const { data: readingNotes = [] } = useQuery({
    queryKey: ['reading-notes', studentId, reading.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reading_notes')
        .select('*')
        .eq('student_id', studentId)
        .eq('reading_id', reading.id)
        .order('paragraph_index')
      return data || []
    },
    enabled: !!studentId && !!reading?.id,
  })

  const notesByParagraph = useMemo(() => {
    const map = {}
    readingNotes.forEach(n => { map[n.paragraph_index] = n })
    return map
  }, [readingNotes])

  // "N minutes left" from the live read-line progress, at L2 reading speed.
  const minutesLeft = Math.max(
    0,
    Math.ceil(((reading?.passage_word_count || 0) * (1 - scrollProgress / 100)) / READING_WPM),
  )

  return (
    // The bottom clearance is nav height + iOS safe-area, not a magic 100px.
    <div className="space-y-6" style={{ paddingBottom: 'var(--mobile-bottom-clearance, 100px)' }}>
      {/* Sticky section chrome: the progress hairline and the jump rail are
          ONE cluster. A student who wants the questions used to scroll past
          everything else every single time. */}
      {/* Sticks below EVERYTHING above the content. --header-height is the
          header's own height and knows nothing about what sits on top of it, so
          offsetting by it alone put this rail underneath the header whenever the
          impersonation banner was showing. 0px for a real student. */}
      <div className="sticky z-rise -mx-4 px-4 pb-2" style={{ top: 'calc(var(--impersonation-banner-height, 0px) + var(--header-height, 64px))' }}>
        <div className="h-1 rounded-full overflow-hidden bg-slate-800/50">
          <motion.div
            className="h-full rounded-full"
            // Follows the student's track accent instead of a hardcoded
            // sky→gold pair, and fills from the inline-start edge in RTL.
            style={{
              background: 'linear-gradient(to right, var(--ds-accent-primary, #e9b949), var(--ds-accent-rule, rgba(233,185,73,.42)))',
            }}
            animate={{ width: `${scrollProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <SectionJumper className="mt-2" sections={SECTION_NAV} />
      </div>

      {/* Completed badge + retry */}
      {isCompleted && !retrying && (
        <CompletedBanner
          attemptNumber={attemptNumber}
          allAttempts={allAttempts.filter(a => a.status === 'completed')}
          bestScore={bestScore}
          score={savedProgress?.score}
          onRetry={handleRetry}
        />
      )}
      {retrying && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
          <RotateCcw size={16} className="text-sky-400" />
          <span className="text-sm font-medium text-sky-400 font-['Tajawal']">
            محاولة جديدة — أجب على الأسئلة من جديد
          </span>
        </div>
      )}

      {sessionMode && (
        <div id="sec-contract" style={{ scrollMarginTop: 'calc(var(--impersonation-banner-height, 0px) + var(--header-height, 64px) + 68px)' }}>
          <ReadingContract reading={reading} vocabCount={vocabulary?.length || 0} />
        </div>
      )}

      {sessionMode && passageFolded && (
        <PassageFoldedBar
          title={reading.title_ar || reading.title_en}
          onUnfold={() => setPassageFolded(false)}
        />
      )}

      {/* ─── Premium Passage Card ─── */}
      <div
        hidden={sessionMode && passageFolded}
        id="sec-text"
        className="relative rounded-2xl overflow-hidden transition-colors duration-300"
        // Was `bg-slate-900/50 border-slate-800/60` — a cold slate card on a warm
        // dark page with no depth. Tokenised, with a layered shadow and a faint
        // interior bloom so the column reads as a lit page in a dark room.
        style={{
          // Same offset as every other jump target: the banner (0px for a real
          // student) + the header + the sticky rail. Was a hardcoded 132px.
          scrollMarginTop: 'calc(var(--impersonation-banner-height, 0px) + var(--header-height, 64px) + 68px)',
          background: 'var(--ds-bg-elevated, #0d111b)',
          border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.07))',
          boxShadow:
            '0 1px 0 rgba(255,255,255,.05) inset, 0 2px 8px -2px rgba(0,0,0,.5), 0 24px 60px -24px rgba(0,0,0,.7)',
        }}
      >
        {/* Interior bloom — keeps the reading field off flat black */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{
            background:
              'radial-gradient(120% 60% at 50% 0%, var(--ds-accent-wash, rgba(233,185,73,.08)), transparent 70%)',
          }}
        />
        {/* Gradient accent hairline */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, var(--ds-accent-rule, rgba(233,185,73,.42)), transparent)' }}
        />

        {/* NOTE: the old absolutely-positioned "Passage A" pill lived here. It
            duplicated the A/B tab sitting ~200px above and the masthead eyebrow
            directly below it, so the same datum appeared three times. */}

        {/* Hero Image — scrimmed so it resolves into the card instead of being
            cut off by a hard divider line. */}
        {reading.before_read_image_url && (
          <div className="relative rounded-t-2xl overflow-hidden">
            <PremiumImage
              src={reading.before_read_image_url}
              alt={reading.title_en}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(to top, var(--ds-bg-elevated, #0d111b) 2%, transparent 62%)' }}
            />
          </div>
        )}

        {/* Card Body — the mobile step is the other half of the 228px fix: the
            card padding used to be 24px a side on a 390px screen, on top of the
            article's own 24px. */}
        <div className="p-4 sm:p-6 md:p-8 space-y-6">
          {/* Title Block + Toolbar */}
          <div className="space-y-3">
            <ArticleMasthead
              reading={reading}
              readingTime={readingTime}
              wordCount={reading.passage_word_count}
              targetWordCount={targetWordCount}
              onOpenTools={() => setToolsOpen(true)}
            />
            {arabicMode && (
              <div
                className="rounded-xl px-4 py-3 text-[13px] font-['Tajawal']"
                dir="rtl"
                style={{ background: 'rgba(233,185,73,0.08)', border: '1px solid rgba(233,185,73,0.25)', color: 'var(--ds-text-secondary, #94a3b8)' }}
              >
                {g('الترجمة العربية الكاملة غير متوفّرة لهذا المقال — اضغط على أي كلمة لرؤية ترجمتها ونطقها.', 'الترجمة العربية الكاملة غير متوفّرة لهذا المقال — اضغطي على أي كلمة لرؤية ترجمتها ونطقها.')}
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {/* The meta used to be printed TWICE with two different numbers —
                  "1 min read · 98 vocabulary words" in the masthead and, forty
                  pixels below, "words 164 min read 1" here (reversed by the
                  bidi algorithm, since bare numerals sat in an RTL row). The
                  masthead now owns the meta; this row is actions only. */}
              {/* ONE control cluster. This replaced three competing toolbars: the
                  «أدوات» modal, this chip row, and a «مساعدات القراءة» popover
                  nested inside it — where «استمع واقرأ» toggled the SAME state as
                  the modal's audio row, so one feature had two labels on two
                  surfaces. Everything secondary now lives behind ⋯. */}
              <div
                className="flex items-center gap-1 p-1 rounded-full"
                role="group"
                aria-label="طريقة القراءة"
                style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,.07))' }}
              >
                {READING_MODES.map((m) => {
                  const active = audioMode === (m.id === 'listen')
                  // Read-along needs word timings; 18 of 230 passages have none.
                  if (m.id === 'listen' && !audioData) return null
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAudioMode(m.id === 'listen')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full font-['Tajawal'] transition-all duration-200"
                      style={{
                        minHeight: 38, padding: '0 16px', fontSize: 13.5,
                        fontWeight: active ? 700 : 500, border: 0, cursor: 'pointer',
                        color: active ? '#14100a' : 'var(--ds-text-tertiary, #8b8578)',
                        background: active
                          ? 'linear-gradient(180deg, var(--ds-accent-primary, #e9b949), var(--ds-accent-primary, #e9b949))'
                          : 'transparent',
                        boxShadow: active ? '0 1px 0 rgba(255,255,255,.28) inset' : 'none',
                      }}
                    >
                      {m.id === 'listen' ? <Headphones size={15} /> : <BookOpen size={15} />}
                      {m.label}
                    </button>
                  )
                })}
              </div>

              <div className="left-time font-['Tajawal'] ms-auto" style={{ fontSize: 12.5, color: 'var(--ds-text-tertiary, #8b8578)' }}>
                {scrollProgress >= 100
                  ? g('أنهيت المقال', 'أنهيتِ المقال')
                  : minutesLeft <= 1 ? 'أقل من دقيقة' : `تبقّت ${minutesLeft} دقائق`}
              </div>
            </div>
            <div className="border-b border-slate-800/50 pb-0" />
          </div>

          {/* Before You Read */}
          {reading.before_read_exercise_a && (
            <BeforeReadSection content={reading.before_read_exercise_a} />
          )}

          {/* Passage Images (inline) */}
          {reading.passage_image_urls?.length > 0 && (
            <div className="space-y-3">
              {reading.passage_image_urls.map((url, idx) => (
                <div key={idx} className="max-w-xl mx-auto my-6">
                  <div className="rounded-lg overflow-hidden border border-slate-700/40 shadow-lg">
                    <PremiumImage
                      src={url}
                      alt={`${reading.title_en} — illustration ${idx + 1}`}
                      aspectClass="aspect-[16/10]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Passage text + audio ──────────────────────────────────── */}
          {/* Editorial rebuild: ArticleBody is the default reading surface (every
              word tappable → WordPopup). The read-along (karaoke) player mounts when
              the student turns on "استمع واقرأ" (the masthead button above). */}
          {/* Discoverability hint — many students don't realize words are tappable. */}
          <p
            className="text-xs font-['Tajawal'] mb-3 mx-auto"
            dir="rtl"
            style={{ color: 'var(--ds-text-tertiary, #8b8578)', maxWidth: '37rem' }}
          >
            {/* Copy corrected: the key words are marked by a rule now, not by
                gold ink, so "باللون الذهبي" no longer described what is on screen. */}
            💡 {g('اضغط على أي كلمة لسماع نطقها ومعناها — الكلمات المهمّة تحتها خط.', 'اضغطي على أي كلمة لسماع نطقها ومعناها — الكلمات المهمّة تحتها خط.')}
          </p>
          {!audioMode ? (
            // passageRef MUST wrap the surface students actually see. It used to
            // be attached only to the no-audio fallback below, which never
            // renders (every reading has audio) — so the scroll-progress
            // listener bailed on a null ref and the bar sat at 0% forever, and
            // focus mode found no paragraphs to observe.
            <div ref={passageRef}>
              <ArticleBody
                paragraphs={reading.passage_content?.paragraphs || []}
                vocabIndex={articleVocabIndex}
                onWordTap={(word, rect, vocabRow) => setWordPopup({ word, rect, vocabRow })}
              />
            </div>
          ) : audioData ? (
            /* bottom-bar mode: SmartAudioPlayer renders KaraokeText as primary passage */
            /* key={reading.id} forces a fresh player instance on article switch — */
            /* belt-and-suspenders alongside the outer <motion.div key> so a stale */
            /* audio.src can never carry across the Article A → Article B boundary. */
            <SmartAudioPlayer
              key={reading.id}
              segments={audioData.segments}
              contentId={reading.id}
              contentType="reading"
              studentId={studentId}
              variant="bottom-bar"
              showTranscriptByDefault={true}
              features={{
                karaoke: true,
                speedControl: true,
                skipButtons: true,
                sentenceNav: true,
                paragraphNav: false,
                sentenceMode: false,
                abLoop: true,
                bookmarks: true,
                speakerLabels: false,
                hideTranscript: false,
                keyboardShortcuts: true,
                mobileGestures: true,
                dictation: false,
                autoResume: true,
                playbackHistory: true,
                wordClickToLookup: true,
              }}
              onWordLongPress={(word, segIdx, wordIdx, pos) => handleWordClick(word, segIdx, pos, wordIdx)}
              onWordHover={handleWordHover}
              onVocabWordTap={handleVocabWordTap}
              highlightLookup={highlightLookup}
              vocabSet={vocabSet}
              onSegmentComplete={(i) => {
                if (!audioPlayStartedRef.current) {
                  audioPlayStartedRef.current = true
                  trackEvent('reading_audio_play_start', { passage_id: reading.id })
                }
                trackEvent('reading_audio_segment_complete', {
                  passage_id: reading.id,
                  segment_index: i,
                  total_segments: audioData.segments.length,
                })
              }}
              onPlaybackComplete={() => {
                trackEvent('reading_audio_complete', { passage_id: reading.id })
              }}
            />
          ) : (
            /* Fallback: no audio — use PassageDisplay with existing interactions */
            <div ref={passageRef} className="relative">
              <PassageDisplay
                paragraphs={reading.passage_content?.paragraphs || []}
                vocabMap={vocabMap}
                savedWordSet={savedWordSet}
                focusMode={focusMode}
                focusParagraph={focusParagraph}
                notesByParagraph={notesByParagraph}
                studentId={studentId}
                readingId={reading.id}
                unitId={unitId}
                wordAssistanceEnabled={prefs.word_assistance_enabled}
                hoverEnabled={prefs.quick_translation_on_hover_tap}
              />
              {studentId && prefs.word_assistance_enabled && (prefs.quick_translation_on_hover_tap || prefs.detailed_menu_on_click_longpress) && (
                <TextSelectionTooltip
                  containerRef={passageRef}
                  studentId={studentId}
                  unitId={unitId}
                  readingId={reading.id}
                  onWordSaved={handleWordSaved}
                  savedWordSet={savedWordSet}
                  pointerType={pointerType}
                  quickTranslationEnabled={prefs.quick_translation_on_hover_tap}
                  detailedMenuEnabled={prefs.detailed_menu_on_click_longpress}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editorial rebuild: secondary tools drawer + anchored word popup */}
      <ReadingTools
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        arabicActive={arabicMode}
        onToggleArabic={() => setArabicMode((v) => !v)}
        focusActive={focusMode}
        onToggleFocus={() => setFocusMode((v) => !v)}
        summaryActive={!!summaryAr}
        onSummary={handleSummary}
        quizActive={!!vocabQuiz}
        onVocabQuiz={savedWordSet.size >= 3 ? handleVocabQuiz : undefined}
      />
      {wordPopup && (
        <WordPopup
          word={wordPopup.word}
          vocabRow={wordPopup.vocabRow}
          anchorRect={wordPopup.rect}
          studentId={studentId}
          unitId={unitId}
          onClose={() => setWordPopup(null)}
        />
      )}

      {/* PERSONALIZATION-REVERT 2026-05-19: hidden from default flow.
          Canonical curriculum is the single default for every student. */}
      {/* <PersonalizedReadingCard canonicalReadingId={reading.id} /> */}

      {/* AI Arabic Summary */}
      <AnimatePresence>
        {summaryAr && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-5 sm:p-6 space-y-2"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(56,189,248,0.06))',
                border: '1px solid rgba(16,185,129,0.15)',
              }}
              dir="rtl"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400 font-['Tajawal']">ملخص بالعربي</h3>
              </div>
              <p className="text-sm text-slate-200 font-['Tajawal'] leading-relaxed">{summaryAr}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vocab Quiz from saved words */}
      <AnimatePresence>
        {vocabQuiz && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl overflow-hidden p-5 sm:p-6 space-y-4"
              style={{
                background: 'var(--ds-bg-elevated, #0d111b)',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.07))',
              }}
            >
              <div className="flex items-center gap-2" dir="rtl">
                {/* was violet — which is the LISTENING accent, cross-wired into reading */}
                <Zap size={16} style={{ color: 'var(--ds-accent-primary, #e9b949)' }} />
                <h3 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--ds-accent-primary, #e9b949)' }}>اختبار مفرداتك المحفوظة</h3>
              </div>
              {vocabQuiz.map((q, qi) => (
                <div key={qi} className="space-y-2">
                  <p className="text-sm text-white font-en" dir="ltr">{qi + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {q.options?.map((opt, oi) => {
                      const answered = quizAnswers[qi] !== undefined
                      const isSelected = quizAnswers[qi] === oi
                      const isCorrect = oi === q.correct_index
                      return (
                        <button
                          key={oi}
                          onClick={() => !answered && setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                          disabled={answered}
                          dir="ltr"
                          className={`text-start px-3 py-2 rounded-xl text-sm font-en border transition-all ${
                            answered && isCorrect
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : answered && isSelected && !isCorrect
                                ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                : answered
                                  ? 'bg-slate-800/30 border-slate-700/30 text-slate-500 opacity-50'
                                  : 'bg-slate-800/30 border-slate-700/40 text-slate-200 hover:border-violet-500/40 cursor-pointer'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {quizAnswers[qi] !== undefined && q.explanation_ar && (
                    <p className="text-xs text-slate-400 font-['Tajawal'] pr-2" dir="rtl">
                      {q.explanation_ar}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infographic */}
      {reading.infographic_image_url && (
        <div className="max-w-xl mx-auto">
          <div className="rounded-xl overflow-hidden border border-slate-700/40 shadow-lg">
            <PremiumImage
              src={reading.infographic_image_url}
              alt={`Infographic: ${reading.title_en}`}
              aspectClass=""
              className="w-full"
            />
          </div>
          <p className="text-[12px] text-slate-500 text-center mt-2 font-['Tajawal']" dir="rtl">
            لمحة بصرية
          </p>
        </div>
      )}

      {/* The words and the skill this passage practises. */}
      {(vocabulary?.length > 0 || reading.reading_skill_name_en) && (
        <SectionBand id="sec-vocab">
          {vocabulary?.length > 0 && <VocabularyBox vocabulary={vocabulary} />}
          {reading.reading_skill_name_en && <ReadingSkillBox reading={reading} />}
        </SectionBand>
      )}

      {/* «ورقة المذاكرة» — the study layer distilled from this passage. Sits
          between the article and the questions so the questions now test
          something that was actually taught. Renders nothing without content.
          The 'feature' seam marks it as a paper, not another info card. */}
      {reading.study_sheet && (
        <SectionBand id="sec-study" tone="feature">
          <StudySheet sheet={reading.study_sheet} />
        </SectionBand>
      )}

      {/* The graded check. */}
      {questions?.length > 0 && (
        <SectionBand id="sec-questions">
          {sessionMode && !passageFolded && (
            <button
              onClick={() => setPassageFolded(true)}
              style={{
                background: 'var(--ds-accent-wash, rgba(233,185,73,.08))',
                color: 'var(--ds-accent-primary, #e9b949)',
                border: '1px solid rgba(233,185,73,0.26)',
              }}
              className="mb-1 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 font-['Tajawal'] text-[13px] font-bold transition-opacity hover:opacity-80 [@media(pointer:coarse)]:min-h-[44px]"
            >
              <EyeOff size={14} />
              {g('اطوِ النص وأجب من مذاكرتك', 'اطوي النص وأجيبي من مذاكرتكِ')}
            </button>
          )}
          <SaveStatus floating state={saveState} lastSavedAt={lastSavedAt} />
          <ComprehensionSection
            key={retryKeyRef.current}
            questions={questions}
            savedAnswers={retrying ? null : savedProgress?.answers}
            isAlreadyCompleted={!retrying && savedProgress?.status === 'completed'}
            progressLoading={progressLoading}
            onAutosave={handleComprehensionAutosave}
            onComplete={handleComprehensionComplete}
          />
        </SectionBand>
      )}

      {sessionMode && (
        <SectionBand id="sec-take" tone="feature">
          <ReadingOutcome reading={reading} vocabCount={vocabulary?.length || 0} />
        </SectionBand>
      )}

      {reading.critical_thinking_prompt_en && (
        <SectionBand id="sec-thinking">
          <CriticalThinkingBox reading={reading} />
        </SectionBand>
      )}

      {/* Unified WordLens — single surface for word tap + long-press */}
      {wordLensState.open && (
        <WordLens
          open={wordLensState.open}
          word={wordLensState.word}
          contextSentence={wordLensState.contextSentence}
          position={wordLensState.position}
          readingId={reading?.id}
          unitId={unitId}
          studentId={studentId}
          passageAudioUrl={audioData?.segments?.[0]?.audio_url}
          wordTimestamp={wordLensState.wordTimestamp}
          prefetched={wordLensState.prefetched}
          onClose={() => setWordLensState({ open: false })}
        />
      )}
    </div>
  )
}

// ─── Before Read Section ─────────────────────────────
function BeforeReadSection({ content }) {
  return (
    <div className="rounded-xl p-5 space-y-3 bg-amber-500/5 border border-amber-500/15">
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-amber-400" />
        <h3 className="text-sm font-bold text-amber-400 font-['Tajawal']">قبل القراءة</h3>
      </div>
      <div className="text-sm text-slate-300 font-en leading-relaxed" dir="ltr">
        {typeof content === 'string' ? content : JSON.stringify(content)}
      </div>
    </div>
  )
}

// ─── Smart tooltip position (viewport-aware, sidebar-aware) ────
function computeTooltipPosition(targetEl, tooltipW = 280, tooltipH = 240) {
  const rect = targetEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 12

  const sidebar = document.querySelector('[data-sidebar]') || document.querySelector('aside') || document.querySelector('.sidebar')
  const sidebarRect = sidebar?.getBoundingClientRect()

  let minX = margin
  let maxX = vw - tooltipW - margin
  if (sidebarRect) {
    if (sidebarRect.left > vw / 2) maxX = Math.min(maxX, sidebarRect.left - margin)
    else minX = Math.max(minX, sidebarRect.right + margin)
  }

  let left = rect.left + rect.width / 2 - tooltipW / 2
  left = Math.max(minX, Math.min(maxX, left))

  let top = rect.bottom + 8
  let placement = 'bottom'
  if (top + tooltipH + margin > vh) {
    top = rect.top - tooltipH - 8
    placement = 'top'
    if (top < margin) top = margin
  }

  return { top, left, placement }
}

// ─── Portal-based vocab tooltip ────────────────────
function VocabTooltipPortal({ vocab, targetRef, onMouseEnter, onMouseLeave }) {
  const tooltipRef = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    if (!targetRef) return
    const update = () => {
      const p = computeTooltipPosition(targetRef, 280, 240)
      setPos(p)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [targetRef])

  if (!pos) return null

  const arrowSide = pos.placement === 'bottom' ? 'top' : 'bottom'

  return createPortal(
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, y: pos.placement === 'bottom' ? 4 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: pos.placement === 'bottom' ? 4 : -4 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="w-[280px] rounded-xl p-3 space-y-1.5 text-sm"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 70,
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(51,65,85,0.8)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {vocab.image_url && (
        <img src={vocab.image_url} alt={vocab.word} className="w-full h-20 rounded-lg object-cover -mt-1" loading="lazy" />
      )}
      <div className="flex items-center justify-between">
        <span className="font-bold text-white font-en">{vocab.word}</span>
        <span className="text-[10px] text-slate-400 font-en">{vocab.part_of_speech}</span>
      </div>
      <p className="text-slate-300 font-en text-xs leading-relaxed">{vocab.definition_en}</p>
      <p className="text-slate-400 font-['Tajawal'] text-xs" dir="rtl">{vocab.definition_ar}</p>
      {vocab.audio_url && <VocabAudioBtn url={vocab.audio_url} />}
      {/* Arrow */}
      <div
        className="absolute w-3 h-3 rotate-45"
        style={{
          [arrowSide]: '-6px',
          left: '50%',
          marginLeft: '-6px',
          background: 'rgba(15,23,42,0.95)',
          borderRight: arrowSide === 'top' ? '1px solid rgba(51,65,85,0.8)' : 'none',
          borderBottom: arrowSide === 'top' ? '1px solid rgba(51,65,85,0.8)' : 'none',
          borderLeft: arrowSide === 'bottom' ? '1px solid rgba(51,65,85,0.8)' : 'none',
          borderTop: arrowSide === 'bottom' ? '1px solid rgba(51,65,85,0.8)' : 'none',
        }}
      />
    </motion.div>,
    document.body
  )
}

// ─── Passage Display ─────────────────────────────────
function PassageDisplay({ paragraphs, vocabMap, savedWordSet, focusMode, focusParagraph, notesByParagraph, studentId, readingId, unitId, wordAssistanceEnabled = true, hoverEnabled = true }) {
  const { readOnly } = useCurriculumPreview() // teacher preview: never persist progress
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [activeTooltipEl, setActiveTooltipEl] = useState(null)
  const [editingNote, setEditingNote] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [hoverMeaning, setHoverMeaning] = useState(null) // { word, meaning_ar, x, y }
  const tooltipTimeout = useRef(null)
  const hoverTimeout = useRef(null)
  const hoverLeaveTimeout = useRef(null)
  const meaningCache = useRef({})
  const queryClient = useQueryClient()

  const showTooltip = useCallback((word, el) => {
    clearTimeout(tooltipTimeout.current)
    setActiveTooltip(word)
    if (el) setActiveTooltipEl(el)
  }, [])

  const hideTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => { setActiveTooltip(null); setActiveTooltipEl(null) }, 200)
  }, [])

  // Close vocab tooltip on Escape or significant scroll
  useEffect(() => {
    if (!activeTooltip) return
    const onKey = (e) => { if (e.key === 'Escape') { setActiveTooltip(null); setActiveTooltipEl(null) } }
    const onScroll = () => { setActiveTooltip(null); setActiveTooltipEl(null) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, true) }
  }, [activeTooltip])

  // Hover quick meaning for any word
  const handleWordHover = useCallback(async (e, word) => {
    const cleanWord = word.replace(/[.,!?;:'"()\[\]]/g, '').trim()
    if (!cleanWord || cleanWord.length < 2) return
    // Skip if it's a curriculum vocab word (already has tooltip)
    if (vocabMap[cleanWord.toLowerCase()]) return

    clearTimeout(hoverTimeout.current)
    clearTimeout(hoverLeaveTimeout.current)
    hoverTimeout.current = setTimeout(async () => {
      // Check cache first
      if (meaningCache.current[cleanWord.toLowerCase()]) {
        const rect = e.target.getBoundingClientRect()
        setHoverMeaning({ word: cleanWord, ...meaningCache.current[cleanWord.toLowerCase()], x: rect.left + rect.width / 2, y: rect.top })
        return
      }
      try {
        const resp = await fetch('/api/vocab-quick-meaning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: cleanWord }),
        })
        if (resp.ok) {
          const data = await resp.json()
          if (data.meaning_ar) {
            meaningCache.current[cleanWord.toLowerCase()] = data
            const rect = e.target.getBoundingClientRect()
            setHoverMeaning({ word: cleanWord, ...data, x: rect.left + rect.width / 2, y: rect.top })
          }
        }
      } catch {}
    }, 500)
  }, [vocabMap])

  const handleWordLeave = useCallback(() => {
    clearTimeout(hoverTimeout.current)
    hoverLeaveTimeout.current = setTimeout(() => setHoverMeaning(null), 300)
  }, [])

  // Save/update paragraph note
  const saveNote = async (paragraphIndex) => {
    if (readOnly) return
    if (!studentId || !readingId || !noteText.trim()) return
    const existing = notesByParagraph[paragraphIndex]
    if (existing) {
      await supabase.from('reading_notes').update({ note_text: noteText.trim(), updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('reading_notes').insert({
        student_id: studentId,
        reading_id: readingId,
        unit_id: unitId,
        paragraph_index: paragraphIndex,
        note_text: noteText.trim(),
      })
    }
    queryClient.invalidateQueries({ queryKey: ['reading-notes', studentId, readingId] })
    setEditingNote(null)
    setNoteText('')
  }

  const renderWord = (word, wordIdx, pIdx) => {
    // Check if this word is in saved words
    const cleanWord = word.replace(/[.,!?;:'"()]/g, '').toLowerCase()
    const isSaved = savedWordSet?.has(cleanWord)

    return (
      <span
        key={`${pIdx}-w-${wordIdx}`}
        data-word-index={wordIdx}
        className={`cursor-default transition-colors hover:text-sky-200 ${isSaved ? 'bg-amber-400/20 border-b-2 border-amber-400 rounded px-0.5' : ''}`}
        title={isSaved ? 'محفوظة في قاموسك' : undefined}
        onMouseEnter={wordAssistanceEnabled && hoverEnabled ? (e) => handleWordHover(e, word) : undefined}
        onMouseLeave={wordAssistanceEnabled && hoverEnabled ? handleWordLeave : undefined}
      >
        {word}{' '}
      </span>
    )
  }

  const renderParagraph = (text, pIdx) => {
    // Split by *word* patterns (vocab highlights)
    const parts = text.split(/\*([^*]+)\*/)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a highlighted vocab word
        const vocab = vocabMap[part.toLowerCase()]
        if (vocab) {
          const tooltipKey = `${pIdx}-${i}`
          if (!wordAssistanceEnabled) {
            return <strong key={i} className="font-semibold text-sky-300">{part}</strong>
          }
          return (
            <span key={i} className="relative inline">
              <button
                onMouseEnter={hoverEnabled ? (e) => showTooltip(tooltipKey, e.currentTarget) : undefined}
                onMouseLeave={hoverEnabled ? hideTooltip : undefined}
                onClick={(e) => {
                  if (activeTooltip === tooltipKey) { setActiveTooltip(null); setActiveTooltipEl(null) }
                  else showTooltip(tooltipKey, e.currentTarget)
                }}
                className="text-sky-300 font-semibold border-b border-dotted border-sky-400/50 hover:border-sky-400 transition-colors cursor-pointer"
              >
                {part}
              </button>
              <AnimatePresence>
                {activeTooltip === tooltipKey && activeTooltipEl && (
                  <VocabTooltipPortal
                    vocab={vocab}
                    targetRef={activeTooltipEl}
                    onMouseEnter={() => showTooltip(tooltipKey)}
                    onMouseLeave={hideTooltip}
                  />
                )}
              </AnimatePresence>
            </span>
          )
        }
        // Vocab word not found in map — render bold with accent color
        return <strong key={i} className="font-semibold text-sky-300">{part}</strong>
      }
      // Regular text — wrap each word in a span for saved-word highlighting + audio sync
      const words = part.split(/(\s+)/)
      let wordIdx = 0
      return words.map((word, wi) => {
        if (/^\s+$/.test(word)) return <span key={`${i}-${wi}`}> </span>
        return renderWord(word, wordIdx++, pIdx)
      })
    })
  }

  return (
    <div dir="ltr" className="space-y-6 relative">
      {/* Hover quick meaning tooltip — portal to body */}
      {hoverMeaning && createPortal(
        <AnimatePresence>
          <motion.div
            key="hover-meaning"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none"
            style={{
              position: 'fixed',
              zIndex: 70,
              left: Math.max(12, Math.min(hoverMeaning.x - 90, window.innerWidth - 192)),
              top: hoverMeaning.y < 60 ? hoverMeaning.y + 28 : hoverMeaning.y - 48,
            }}
          >
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg"
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(56,189,248,0.25)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="text-sky-300 font-en font-semibold">{hoverMeaning.word}</span>
              {hoverMeaning.part_of_speech && (
                <span className="text-slate-500 text-[10px] ml-1.5">{hoverMeaning.part_of_speech}</span>
              )}
              <span className="text-slate-300 font-['Tajawal'] mr-2 ml-1">—</span>
              <span className="text-amber-300 font-['Tajawal']">{hoverMeaning.meaning_ar}</span>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {paragraphs.map((para, idx) => {
        const isFocused = !focusMode || focusParagraph === idx
        const hasNote = notesByParagraph[idx]
        return (
          <div
            key={idx}
            data-paragraph-index={idx}
            className={`group flex gap-4 transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-20'}`}
          >
            <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-1.5">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-sm font-semibold">
                {idx + 1}
              </div>
              {/* Note indicator/button */}
              {studentId && (
                <button
                  onClick={() => { setEditingNote(editingNote === idx ? null : idx); setNoteText(hasNote?.note_text || '') }}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                    hasNote
                      ? 'text-amber-400 opacity-100'
                      : 'text-slate-600 opacity-0 group-hover:opacity-100'
                  }`}
                  title={hasNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
                >
                  <StickyNote size={12} />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg leading-[1.9] text-slate-200 font-en">
                {renderParagraph(para, idx)}
              </p>
              {/* Inline note editor */}
              <AnimatePresence>
                {editingNote === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="اكتب ملاحظتك هنا..."
                        dir="rtl"
                        rows={2}
                        className="w-full resize-none rounded-lg px-3 py-2 text-sm font-['Tajawal'] bg-slate-900/50 text-slate-200 border border-slate-700/40 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                      />
                      <div className="flex gap-2 justify-end" dir="rtl">
                        <button
                          onClick={() => saveNote(idx)}
                          disabled={!noteText.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium font-['Tajawal'] bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 transition-colors disabled:opacity-30"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium font-['Tajawal'] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Saved note display */}
              {hasNote && editingNote !== idx && (
                <div
                  className="mt-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 cursor-pointer hover:bg-amber-500/10 transition-colors"
                  onClick={() => { setEditingNote(idx); setNoteText(hasNote.note_text) }}
                  dir="rtl"
                >
                  <p className="text-xs text-amber-300/80 font-['Tajawal'] leading-relaxed">{hasNote.note_text}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Small audio button for vocab tooltip ────────────
function VocabAudioBtn({ url }) {
  const audioRef = useRef(null)
  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }, [])
  const play = (e) => {
    e.stopPropagation()
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }
  return (
    <button
      onClick={play}
      className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
    >
      <Volume2 size={11} /> استمع
    </button>
  )
}

// ─── Audio Button ────────────────────────────────────
function AudioButton({ url, label }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }, [])
  const play = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlaying(false); return }
    const a = new Audio(url)
    audioRef.current = a
    setPlaying(true)
    a.onended = () => { setPlaying(false); audioRef.current = null }
    a.play().catch(() => setPlaying(false))
  }
  return (
    <button
      onClick={play}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 font-['Tajawal'] ${
        playing
          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
          : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-sky-400 hover:border-sky-500/30'
      }`}
    >
      <Volume2 size={12} />
      {label}
    </button>
  )
}

// ─── Vocabulary Box ──────────────────────────────────
// Shared surface tokens for the reading tab's info cards.
//
// These three cards used to be raw Tailwind: a COLD slate ground
// (bg-slate-900/50 + border-slate-800/60) under a page whose token layer is
// WARM on the student's default theme (`night` — ground #0b0f18, cream ink
// #faf5e6, one gold accent #e9b949). Cold slate lit by a warm page composites
// to the muddy brown the owner reported. On top of that the three stacked cards
// carried three unrelated accents — emerald, amber, and a purple→sky gradient —
// so a single scroll showed four different colour systems.
//
// Now: ONE ground, ONE set of type colours, and one small semantic icon each,
// all from tokens, so the cards follow the student's theme instead of fighting
// it and read as one document with the passage and «ورقة المذاكرة».
const RT = {
  ink: 'var(--ds-text-primary, #faf5e6)',
  body: 'var(--ds-text-secondary, #c9c3b0)',
  muted: 'var(--ds-text-tertiary, #8b8578)',
  ground: 'var(--ds-bg-elevated, #0d111b)',
  raise: 'var(--ds-surface-1, rgba(255,255,255,0.028))',
  edge: 'var(--ds-border-subtle, rgba(255,255,255,0.07))',
  gold: 'var(--ds-accent-primary, #e9b949)',
  wash: 'var(--ds-accent-wash, rgba(233,185,73,.08))',
  good: 'var(--ds-accent-success, #84cc7a)',
  quiet: 'var(--ds-accent-secondary, #8c95b8)',
}

function VocabularyBox({ vocabulary }) {
  const [expanded, setExpanded] = useState(false)
  const audioRef = useRef(null)

  const playAudio = (url, e) => {
    e.stopPropagation()
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: RT.ground, border: `1px solid ${RT.edge}` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen size={16} style={{ color: RT.good }} />
          <span className="text-sm font-bold font-['Tajawal']" style={{ color: RT.ink }}>
            مفردات القراءة ({vocabulary.length})
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{ color: RT.muted }}
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 space-y-2" style={{ borderTop: `1px solid ${RT.edge}` }}>
              <div className="pt-4 space-y-2">
                {vocabulary.map(v => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                    style={{ background: RT.raise, border: `1px solid ${RT.edge}` }}
                  >
                    <div className="flex-1 min-w-0" dir="ltr">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm font-en" style={{ color: RT.ink }}>{v.word}</span>
                        <span className="text-[10px] font-en" style={{ color: RT.muted }}>{v.part_of_speech}</span>
                      </div>
                      <p className="text-xs font-en mt-0.5" style={{ color: RT.body }}>{v.definition_en}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-['Tajawal']" style={{ color: RT.muted }}>{v.definition_ar}</span>
                      {v.audio_url && (
                        <button
                          onClick={(e) => playAudio(v.audio_url, e)}
                          style={{ background: RT.wash, color: RT.gold }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-75 flex-shrink-0"
                        >
                          <Volume2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Comprehension Questions ─────────────────────────
// Save vs Submit separation (2026-04-16 bug fix):
//   - Autosave fires on every answer change. Writes status='in_progress',
//     score=null. Unanswered questions are NOT graded.
//   - Submit fires only when the student clicks the explicit submit button,
//     which is disabled until ALL questions are answered. Writes
//     status='completed', computes score, awards XP.
function ComprehensionSection({ questions, savedAnswers, isAlreadyCompleted, progressLoading, onAutosave, onComplete }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const hasAutosavedRef = useRef({})
  // The batch waiting on the 400ms debounce. If she navigates away, hides the
  // tab, or switches passage before it fires, the timer was simply cleared and
  // those answers were never written — so we flush it instead of dropping it.
  const pendingRef = useRef(null)
  const flushRef = useRef(() => {})
  const inlineSubmitRef = useRef(null)

  // Restore saved answers on load
  useEffect(() => {
    if (savedAnswers && typeof savedAnswers === 'object') {
      setAnswers(savedAnswers)
      if (isAlreadyCompleted) setSubmitted(true)
    }
  }, [savedAnswers, isAlreadyCompleted])

  const total = questions.length
  const answered = Object.keys(answers).length
  const correctCount = Object.values(answers).filter(a => a.correct).length
  const allAnswered = answered === total && total > 0

  // Autosave on every answer change — status='in_progress', no score.
  // The signature is committed INSIDE the timeout, not before it. Committing it
  // up-front lost answers: any re-render that changed the effect's deps (e.g.
  // onAutosave's identity changing after the first INSERT resolves) ran the
  // cleanup, cancelled the pending timeout, and then hit the early-return
  // because the signature was already marked as saved — so that batch was never
  // written and the student's answers silently disappeared on reload.
  // The signature also covers answer VALUES, so changing an existing answer
  // (which leaves the key set untouched) is persisted too.
  useEffect(() => {
    if (progressLoading || submitted) return
    if (answered === 0) return
    const signature = JSON.stringify(
      Object.entries(answers).sort(([a], [b]) => a.localeCompare(b))
    )
    if (hasAutosavedRef.current.lastSignature === signature) return
    const batch = { signature, answers, consumed: false }
    pendingRef.current = batch
    const t = setTimeout(() => {
      // A flush may already have sent this batch — don't write it twice.
      if (batch.consumed) return
      batch.consumed = true
      if (pendingRef.current === batch) pendingRef.current = null
      // Commit the signature only once the write SUCCEEDS. Committing up front
      // marked a failed batch as saved, so it was never retried.
      Promise.resolve(onAutosave?.(answers))
        .then(() => { hasAutosavedRef.current.lastSignature = signature })
        .catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [answered, answers, progressLoading, submitted, onAutosave])

  // Keep the flusher pointing at the current pending batch + callback.
  flushRef.current = () => {
    const p = pendingRef.current
    if (!p || p.consumed || submitted) return // never write in_progress over a submitted attempt
    p.consumed = true
    pendingRef.current = null
    Promise.resolve(onAutosave?.(p.answers))
      .then(() => { hasAutosavedRef.current.lastSignature = p.signature })
      .catch(() => {})
  }

  useEffect(() => {
    const flush = () => flushRef.current?.()
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      flush() // unmount: leaving the passage must not discard her last answers
    }
  }, [])

  const handleSubmit = () => {
    if (!allAnswered || submitted) return
    pendingRef.current = null // the submit carries these answers; don't re-save them as in_progress
    setSubmitted(true)
    const score = Math.round((correctCount / total) * 100)
    // If the write is rejected, hand the attempt back instead of showing a score
    // for work that was never saved — she keeps her answers and can retry.
    Promise.resolve(onComplete?.(answers, score))
      .then((ok) => { if (ok === false) setSubmitted(false) })
      .catch(() => setSubmitted(false))
  }

  if (progressLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 rounded-lg bg-slate-800 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-800 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 qx-scope" data-accent="sky">
      <div className="qx-eyebrow" dir="rtl">
        <span className="qx-spark" />
        <h3 className="qx-eyebrow-title">أسئلة الفهم</h3>
        <span className="qx-eyebrow-rule" />
        {answered > 0 && submitted && (
          <span className="text-xs text-slate-400 font-['Tajawal'] flex-shrink-0">
            {correctCount}/{answered} صحيحة
          </span>
        )}
      </div>

      {/* Per-question progress ticks — one segment per question, fills as answered */}
      {!submitted && (
        <div dir="rtl">
          <div className="qx-ticks">
            {questions.map(q => (
              <span key={q.id} className="qx-tick" data-on={answers[q.id] ? 'true' : 'false'} />
            ))}
          </div>
          {answered > 0 && (
            <p className="qx-ticks-label text-left" dir="ltr">
              <span dir="rtl">{answered}/{total} مُجاب عليها</span>
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <MCQQuestion
            key={q.id}
            question={q}
            index={idx}
            answer={answers[q.id]}
            revealCorrect={submitted}
            onAnswer={(ans) => setAnswers(prev => ({ ...prev, [q.id]: ans }))}
          />
        ))}
      </div>

      {/* Explicit submit — only path to completion. Disabled until all answered. */}
      {!submitted && answered > 0 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            ref={inlineSubmitRef}
            type="button"
            onClick={() => allAnswered && setConfirmOpen(true)}
            disabled={!allAnswered}
            className="px-6 py-3 rounded-xl font-bold font-['Tajawal'] text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: allAnswered ? '#38bdf8' : 'rgba(255,255,255,0.05)',
              color: allAnswered ? '#0a1225' : '#94a3b8',
              border: '1px solid ' + (allAnswered ? '#38bdf8' : 'rgba(255,255,255,0.08)'),
            }}
          >
            {allAnswered
              ? <><span>تسليم الإجابات ({answered}/{total})</span><XPBadgeInline amount={5} /></>
              : `أجب على جميع الأسئلة قبل التسليم (${answered}/${total})`}
          </button>
        </div>
      )}

      {/* Every question answered but not handed in yet — the section cannot count
          until she submits, so say so where she cannot miss it. */}
      <SubmitReminderBar
        show={!submitted && allAnswered && !progressLoading}
        answered={answered}
        total={total}
        onSubmit={() => setConfirmOpen(true)}
        anchorRef={inlineSubmitRef}
        accent="#38bdf8"
      />

      {/* Confirmation dialog — rendered outside the !submitted guard so it can
          always appear when confirmOpen=true */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl p-6 space-y-4 bg-slate-900 border border-slate-700"
            dir="rtl"
          >
            <h3 className="text-base font-bold text-white font-['Tajawal']">تأكيد التسليم</h3>
            <p className="text-sm text-slate-300 font-['Tajawal']">
              لن تتمكن من تعديل هذه المحاولة بعد التسليم.
              <br />
              <span className="text-slate-500 text-xs">يمكنك إعادة المحاولة لاحقاً — درجتك الأعلى هي المحتسبة.</span>
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold font-['Tajawal'] text-slate-400 border border-slate-700 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => { setConfirmOpen(false); handleSubmit() }}
                className="px-5 py-2 rounded-xl text-sm font-bold font-['Tajawal'] text-slate-900 bg-sky-400"
              >
                تسليم
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {submitted && allAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: correctCount === total ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
            border: `1px solid ${correctCount === total ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}`,
          }}
        >
          <CheckCircle size={20} className={correctCount === total ? 'text-emerald-400' : 'text-sky-400'} />
          <p className="text-sm font-medium font-['Tajawal']" style={{ color: correctCount === total ? '#34d399' : '#38bdf8' }}>
            {correctCount === total
              ? 'ممتاز! أجبت على جميع الأسئلة بشكل صحيح'
              : `أجبت على ${correctCount} من ${total} بشكل صحيح`
            }
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ─── Single MCQ Question ─────────────────────────────
// `revealCorrect` — when false, students can freely change answers and no
// correct/wrong styling or explanation is shown. When true (after explicit
// submit), the answer is locked and correctness is revealed. This is what
// separates autosave (no grading) from submit (graded).
function MCQQuestion({ question, index, answer, revealCorrect = false, onAnswer }) {
  // Shuffle choices once per question so the correct answer isn't always option A.
  // Safe because grading matches by text value, not by index position.
  const shuffledChoices = useMemo(() => {
    if (!question.choices?.length) return question.choices || []
    const arr = [...question.choices]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [question.id]) // re-shuffle only when the question changes, not on every re-render

  const handleSelect = (choice) => {
    if (revealCorrect) return // locked after submit
    const correct = choice.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
    onAnswer({ selected: choice, correct })
  }

  const typeBadge = QUESTION_TYPE_LABELS[question.question_type] || question.question_type
  const typeColor = QUESTION_TYPE_COLORS[question.question_type] || QUESTION_TYPE_COLORS.detail

  return (
    <div className="qx-card" data-accent="sky" dir="rtl">
      <span className="qx-rail" />
      <span className="qx-node" />
      <span className="qx-ghost-num" aria-hidden="true">{index + 1}</span>

      {/* Meta line: question type, number etched at the end */}
      <div className="qx-meta">
        <span className="qx-spark" />
        <span className="qx-type">{typeBadge}</span>
        <span className="qx-qnum" dir="ltr">Q{index + 1}</span>
      </div>

      <p className="qx-question" dir="ltr">{question.question_en}</p>
      {question.question_ar && (
        <p className="qx-question-ar" dir="rtl">{genderizeText(question.question_ar)}</p>
      )}

      {/* Answer ledger */}
      <div className="qx-well" dir="ltr">
        {shuffledChoices.map((choice, i) => {
          const isSelected = answer?.selected === choice
          const isCorrectAnswer = choice.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
          // Correctness styling is ONLY revealed after explicit submit.
          const state = revealCorrect && isCorrectAnswer ? 'correct'
            : revealCorrect && isSelected && !answer?.correct ? 'wrong'
            : isSelected ? 'selected' : 'idle'

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(choice)}
              disabled={revealCorrect}
              className="qx-opt"
              data-state={state}
            >
              <span className="qx-marker">
                {state === 'correct' ? <CheckCircle size={14} /> : state === 'wrong' ? <XCircle size={14} /> : String.fromCharCode(65 + i)}
              </span>
              <span>{choice}</span>
            </button>
          )
        })}
      </div>

      <div className="qx-foot space-y-3">
        {/* Pre-submit: the «تلميح» reveal. Post-submit: the full verdict below covers it. */}
        {!revealCorrect && (
          <QuestionHint
            hint={question.hint}
            accent="sky"
            kind="reading"
            contentId={question.reading_id}
            questionKey={question.id}
          />
        )}

        {/* Post-submit verdict — why the answer is right/wrong + the correct one + evidence */}
        {revealCorrect && answer?.selected != null && (
          <VerdictPanel
            correct={!!answer.correct}
            selectedLabel={String.fromCharCode(65 + Math.max(0, shuffledChoices.indexOf(answer.selected)))}
            selectedText={answer.selected}
            correctLabel={String.fromCharCode(65 + Math.max(0, shuffledChoices.findIndex(c => c.toLowerCase().trim() === question.correct_answer.toLowerCase().trim())))}
            correctText={question.correct_answer}
            wrongNote={question.wrong_notes?.[answer.selected]}
            explanationAr={question.explanation_ar}
            explanationEn={question.explanation_en}
            hint={question.hint}
            accent="sky"
            kind="reading"
            contentId={question.reading_id}
            questionKey={question.id}
          />
        )}
      </div>
    </div>
  )
}

// ─── Reading Skill Box ───────────────────────────────
function ReadingSkillBox({ reading }) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6 space-y-3"
      style={{ background: RT.ground, border: `1px solid ${RT.edge}` }}
    >
      <div className="flex items-center gap-2">
        <Lightbulb size={16} style={{ color: RT.gold }} />
        <h3 className="text-sm font-bold font-['Tajawal']" style={{ color: RT.ink }}>
          مهارة القراءة: <span className="font-en">{reading.reading_skill_name_en}</span>
          {reading.reading_skill_name_ar && ` — ${reading.reading_skill_name_ar}`}
        </h3>
      </div>
      {reading.reading_skill_explanation && (
        <p className="text-sm font-en leading-relaxed" dir="ltr" style={{ color: RT.body }}>
          {reading.reading_skill_explanation}
        </p>
      )}
    </div>
  )
}

// ─── Critical Thinking Box ───────────────────────────
function CriticalThinkingBox({ reading }) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6 space-y-3"
      style={{ background: RT.ground, border: `1px solid ${RT.edge}` }}
    >
      <div className="flex items-center gap-2">
        <MessageSquare size={16} style={{ color: RT.quiet }} />
        <h3 className="text-sm font-bold font-['Tajawal']" style={{ color: RT.ink }}>تفكير ناقد</h3>
      </div>
      <p className="text-sm font-en leading-relaxed" dir="ltr" style={{ color: RT.ink }}>
        {reading.critical_thinking_prompt_en}
      </p>
      {reading.critical_thinking_prompt_ar && (
        <p className="text-sm font-['Tajawal']" dir="rtl" style={{ color: RT.body }}>
          {genderizeText(reading.critical_thinking_prompt_ar)}
        </p>
      )}
    </div>
  )
}

// ─── Completed Banner with Retry ─────────────────────
// allAttempts: array of completed DB rows (not the old JSON attempt_history).
function CompletedBanner({ attemptNumber, allAttempts, bestScore, score, onRetry }) {
  const [showHistory, setShowHistory] = useState(false)
  const priorAttempts = (allAttempts || []).filter(a => !a.is_latest)
  const hasHistory = priorAttempts.length > 0

  return (
    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400 font-['Tajawal']">تم إكمال هذا القسم</span>
          {attemptNumber > 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-['Tajawal']">
              المحاولة {attemptNumber}
            </span>
          )}
          {score != null && (
            <span className="text-xs text-emerald-400/70 font-['Tajawal']">— {score}%</span>
          )}
          {bestScore != null && bestScore !== score && (
            <span className="text-[10px] text-amber-400/70 font-['Tajawal']">· أفضل: {bestScore}%</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasHistory && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors font-['Tajawal']"
            >
              <History size={12} />
              السابقة
            </button>
          )}
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors font-['Tajawal'] border border-slate-700/50"
          >
            <RotateCcw size={12} />
            محاولة جديدة
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showHistory && hasHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 border-t border-emerald-500/15">
              <div className="pt-2.5 space-y-1.5">
                {priorAttempts.map(h => (
                  <div key={h.id} className="flex items-center gap-3 text-xs text-slate-400 font-['Tajawal']">
                    <span className="font-medium">محاولة {h.attempt_number}</span>
                    <span>{h.score != null ? `${h.score}%` : '—'}</span>
                    {h.is_best && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">الأفضل</span>
                    )}
                    {h.completed_at && (
                      <span dir="ltr">{new Date(h.completed_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function ReadingSkeleton() {
  // The skeleton is the FIRST thing a student sees on every reading, so it has
  // to be made of the same material as the page that replaces it. It used to be
  // cold slate (bg-slate-900/50 + slate-800 shimmers) flashing in front of a
  // warm page — a cheap-feeling mismatch on every single load.
  const ground = 'var(--ds-bg-elevated, #0d111b)'
  const edge = 'var(--ds-border-subtle, rgba(255,255,255,0.07))'
  const bar = 'var(--ds-surface-2, rgba(255,215,140,0.055))'
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex gap-2">
        <div className="h-10 w-24 rounded-xl animate-pulse" style={{ background: bar }} />
        <div className="h-10 w-24 rounded-xl animate-pulse" style={{ background: bar }} />
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: ground, border: `1px solid ${edge}` }}>
        <div className="aspect-[16/9] animate-pulse" style={{ background: bar }} />
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <div className="h-8 w-3/4 rounded-lg animate-pulse" style={{ background: bar }} />
            <div className="h-5 w-1/2 rounded-lg animate-pulse" style={{ background: bar }} />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-7 h-7 rounded-full animate-pulse flex-shrink-0" style={{ background: bar }} />
              <div className="flex-1 space-y-2">
                <div className="h-5 rounded animate-pulse" style={{ background: bar }} />
                <div className="h-5 w-5/6 rounded animate-pulse" style={{ background: bar }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: ground, border: `1px solid ${edge}` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Reading Preferences Toggle ──────────────────────
function PrefsToggle({ label, desc, checked, onChange, disabled, master }) {
  return (
    <div className={`flex items-start gap-3 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="pt-0.5 flex-shrink-0">
        <button
          onClick={() => onChange(!checked)}
          className={`w-8 h-[18px] rounded-full transition-colors relative ${checked ? (master ? 'bg-sky-500' : 'bg-sky-500/60') : 'bg-white/10'}`}
        >
          <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${checked ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
        </button>
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onChange(!checked)}>
        <span className={`text-xs font-bold font-['Tajawal'] block ${master ? 'text-white/80' : 'text-white/60'}`}>{label}</span>
        {desc && <p className="text-[10px] text-white/30 font-['Tajawal'] leading-relaxed mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}
