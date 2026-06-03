import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Search, Volume2, List, Layers, Filter, Lock, ChevronDown, Zap, Brain } from 'lucide-react'
import { useAuthStudentData } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import FlashcardDeck from './components/FlashcardDeck'
import VocabularyPractice from './components/VocabularyPractice'
import GameHub from '../../../components/games/GameHub'
import MatchGame from '../../../components/games/MatchGame'
import SpeedTypeGame from '../../../components/games/SpeedTypeGame'
import ScrambleGame from '../../../components/games/ScrambleGame'
import FillBlankGame from '../../../components/games/FillBlankGame'
import XPNotification from '../../../components/games/XPNotification'
import { awardPracticeXP } from '../../../utils/xpManager'
import ChunkSelector from '../../../components/vocabulary/ChunkSelector'
import VocabularyQuiz from '../../../components/vocabulary/VocabularyQuiz'
import { useVocabularyMastery } from '../../../hooks/useVocabularyMastery'
import VocabShell from '../../../components/vocab-cosmos/VocabShell'
import VocabHeader from '../../../components/vocab-cosmos/VocabHeader'
import { useVocabStats } from '../../../hooks/useVocabStats'
import { toArabicNum } from '../../../lib/vocabFormat'

// Vocabulary columns we read for the catalog cards. The reading→unit embeds are
// INNER joins so the server-side level filter (.eq('reading.unit.level_id', …))
// actually restricts the returned rows — we never ship the whole ~14k catalog.
const VOCAB_SELECT =
  'id, word, definition_en, definition_ar, example_sentence, part_of_speech, audio_url, difficulty_tier, sort_order, synonyms, antonyms, word_family, pronunciation_alert, reading:curriculum_readings!reading_id!inner(unit_id, unit:curriculum_units!unit_id!inner(unit_number, level_id, theme_ar))'

// Map a vocab_cards mastery_level → the constellation star class.
function starClass(level) {
  if (level === 'mastered') return 'is-mastered'
  if (level === 'learning') return 'is-learning'
  return 'is-new'
}

// ─── Skeleton loaders ──────────────────────────────
function FilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 w-28 rounded-xl" style={{ background: 'var(--vc-surface-2)' }} />
      ))}
      <div className="h-10 flex-1 min-w-[180px] rounded-xl" style={{ background: 'var(--vc-surface-2)' }} />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 animate-pulse">
      <div className="w-full max-w-[380px] h-[240px] max-sm:h-[200px] rounded-[22px]" style={{ background: 'var(--vc-surface)' }} />
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full" style={{ background: 'var(--vc-surface-2)' }} />
        <div className="w-24 h-5 rounded self-center" style={{ background: 'var(--vc-surface-2)' }} />
        <div className="w-10 h-10 rounded-full" style={{ background: 'var(--vc-surface-2)' }} />
      </div>
    </div>
  )
}

export default function VocabularyFlashcards() {
  const studentData = useAuthStudentData()
  const studentId = studentData?.id
  const vocabStats = useVocabStats()

  const [levels, setLevels] = useState([])
  const [levelsLoading, setLevelsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'list' | 'chunks' | 'games'
  const [activeGame, setActiveGame] = useState(null)
  const [gameWordCount, setGameWordCount] = useState(10)
  const [xpAwarded, setXpAwarded] = useState(0)

  // Chunks + quiz state
  const [activeChunk, setActiveChunk] = useState(null)
  const [quizState, setQuizState] = useState(null)

  const audioRef = useRef(null)

  // ── Fetch levels only (tiny) — default to the student's academic level ──
  useEffect(() => {
    let isMounted = true
    async function fetchLevels() {
      setLevelsLoading(true)
      const { data, error: levelsErr } = await supabase
        .from('curriculum_levels')
        .select('id, level_number, name_ar, color')
        .order('level_number')
      if (!isMounted) return
      if (levelsErr) {
        setError(levelsErr.message)
        setLevelsLoading(false)
        return
      }
      setLevels(data || [])
      const studentLevel = studentData?.academic_level ?? 0
      const defaultLevel = data?.find((l) => l.level_number === studentLevel) || data?.[0]
      if (defaultLevel) setSelectedLevel((prev) => prev ?? defaultLevel.id)
      setLevelsLoading(false)
    }
    fetchLevels()
    return () => { isMounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── PERF: fetch ONLY the selected level's words (server-side level filter) ──
  // Filters via reading→unit→level so we never ship the whole ~14k catalog.
  const {
    data: vocab = [],
    isLoading: vocabLoading,
    error: vocabError,
  } = useQuery({
    queryKey: ['vocab-catalog-by-level', selectedLevel],
    queryFn: async () => {
      const { data, error: vErr } = await supabase
        .from('curriculum_vocabulary')
        .select(VOCAB_SELECT)
        .eq('reading.unit.level_id', selectedLevel)
        .order('sort_order')
        .limit(4000)
      if (vErr) throw vErr
      // The !inner-style embed filter still returns rows whose embed is null on
      // some PostgREST versions; keep only words that resolve to this level.
      return (data || []).filter((v) => v.reading?.unit?.level_id === selectedLevel)
    },
    enabled: !!selectedLevel,
    staleTime: 5 * 60 * 1000,
  })

  const loading = levelsLoading || (!!selectedLevel && vocabLoading)
  const queryError = error || vocabError?.message

  // Derive available units for the selected level
  const availableUnits = useMemo(() => {
    const units = new Map()
    vocab.forEach((v) => {
      const unit = v.reading?.unit
      if (unit) units.set(unit.unit_number, unit.theme_ar)
    })
    return Array.from(units.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([num, theme]) => ({ number: num, theme }))
  }, [vocab])

  // Filter vocabulary (level already applied server-side; unit + search here)
  const filteredVocab = useMemo(() => {
    let filtered = vocab

    if (selectedUnit !== 'all') {
      const unitNum = parseInt(selectedUnit, 10)
      filtered = filtered.filter((v) => v.reading?.unit?.unit_number === unitNum)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.word?.toLowerCase().includes(q) ||
          v.definition_ar?.includes(q) ||
          v.definition_en?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [vocab, selectedUnit, searchQuery])

  // ── Mastery overlay: fetch the student's vocab_cards for the visible words ──
  const visibleIds = useMemo(() => filteredVocab.map((v) => v.id), [filteredVocab])
  const visibleIdsKey = useMemo(() => visibleIds.slice().sort().join(','), [visibleIds])

  const { data: masteryById = {} } = useQuery({
    queryKey: ['vocab-card-mastery', studentId, visibleIdsKey],
    queryFn: async () => {
      if (!studentId || visibleIds.length === 0) return {}
      const map = {}
      // Chunk the IN() list so a large unit never blows the URL length.
      for (let i = 0; i < visibleIds.length; i += 300) {
        const slice = visibleIds.slice(i, i + 300)
        const { data, error: mErr } = await supabase
          .from('vocab_cards')
          .select('curriculum_vocabulary_id, mastery_level')
          .eq('student_id', studentId)
          .in('curriculum_vocabulary_id', slice)
        if (mErr) throw mErr
        for (const row of data || []) {
          if (row.curriculum_vocabulary_id) map[row.curriculum_vocabulary_id] = row.mastery_level
        }
      }
      return map
    },
    enabled: !!studentId && visibleIds.length > 0,
    staleTime: 30_000,
  })

  // Stats strip across the currently-displayed words
  const masteryStats = useMemo(() => {
    let mastered = 0
    let learning = 0
    for (const id of visibleIds) {
      const lvl = masteryById[id]
      if (lvl === 'mastered') mastered += 1
      else if (lvl === 'learning') learning += 1
    }
    return {
      total: visibleIds.length,
      mastered,
      learning,
      newCount: visibleIds.length - mastered - learning,
    }
  }, [visibleIds, masteryById])

  // Find unit_id for the currently selected unit (needed for mastery + quiz attempts)
  const selectedUnitId = useMemo(() => {
    if (selectedUnit === 'all') return null
    const unitNum = parseInt(selectedUnit, 10)
    const match = vocab.find((v) => v.reading?.unit?.unit_number === unitNum)
    return match?.reading?.unit_id || null
  }, [vocab, selectedUnit])

  const selectedUnitTheme = useMemo(() => {
    if (!selectedUnitId) return null
    const match = vocab.find((v) => v.reading?.unit_id === selectedUnitId)
    return match?.reading?.unit?.theme_ar || null
  }, [vocab, selectedUnitId])

  const unitLabel = selectedUnitId
    ? `الوحدة ${parseInt(selectedUnit, 10)}${selectedUnitTheme ? ' — ' + selectedUnitTheme : ''}`
    : ''

  // Mastery map for the current unit — required for chunk unlock state
  const { masteryMap } = useVocabularyMastery(studentId, selectedUnitId)

  const unitWords = useMemo(() => {
    if (!selectedUnitId) return []
    return vocab.filter((v) => v.reading?.unit_id === selectedUnitId)
  }, [vocab, selectedUnitId])

  const audioCount = filteredVocab.filter((v) => v.audio_url).length

  const playWord = (url) => {
    if (audioRef.current) audioRef.current.pause()
    if (!url) return
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  const selectedLevelData = levels.find((l) => l.id === selectedLevel)

  // ─── Loading / error ───
  if (loading && vocab.length === 0) {
    return (
      <VocabShell maxWidth="max-w-4xl">
        <VocabHeader
          title="المفردات"
          subtitle="استكشفي كلمات مستواكِ وأضيفيها إلى سمائك"
          stats={vocabStats?.data}
        />
        <div className="space-y-8">
          <FilterSkeleton />
          <CardSkeleton />
        </div>
      </VocabShell>
    )
  }

  if (queryError) {
    return (
      <VocabShell maxWidth="max-w-4xl">
        <VocabHeader
          title="المفردات"
          subtitle="استكشفي كلمات مستواكِ وأضيفيها إلى سمائك"
          stats={vocabStats?.data}
        />
        <div className="vc-card p-7 text-center space-y-4">
          <p style={{ color: 'var(--vc-text)' }}>حدث خطأ — حاولي مرة ثانية</p>
          <button onClick={() => window.location.reload()} className="vc-btn vc-btn-primary">
            إعادة المحاولة
          </button>
        </div>
      </VocabShell>
    )
  }

  return (
    <VocabShell maxWidth="max-w-4xl">
      <XPNotification xp={xpAwarded} />

      <AnimatePresence>
        {quizState && (
          <VocabularyQuiz
            key={`${quizState.chunkIndex}_${quizState.chunkWords?.length || 0}`}
            chunkWords={quizState.chunkWords}
            unitWords={unitWords}
            unitId={selectedUnitId}
            studentId={studentId}
            chunkSize={quizState.chunkWords?.length || 10}
            chunkIndex={quizState.chunkIndex}
            title={quizState.title}
            onClose={() => setQuizState(null)}
          />
        )}
      </AnimatePresence>

      <VocabHeader
        title="المفردات"
        subtitle="استكشفي كلمات مستواكِ وأضيفيها إلى سمائك"
        stats={vocabStats?.data}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <LevelDropdown
          levels={levels}
          selectedLevel={selectedLevel}
          studentLevel={studentData?.academic_level ?? 0}
          onChange={(id) => {
            setSelectedLevel(id)
            setSelectedUnit('all')
            setActiveChunk(null)
            setQuizState(null)
          }}
        />

        {/* Unit selector */}
        <div className="relative">
          <select
            value={selectedUnit}
            onChange={(e) => {
              setSelectedUnit(e.target.value)
              setActiveChunk(null)
              setQuizState(null)
              if (e.target.value === 'all' && viewMode === 'chunks') {
                setViewMode('cards')
              }
            }}
            className="h-10 pl-7 pr-3 rounded-full text-sm font-semibold appearance-none cursor-pointer focus:outline-none"
            style={{
              background: 'var(--vc-surface-2)',
              border: '1px solid var(--vc-border)',
              color: 'var(--vc-text-soft)',
            }}
          >
            <option value="all">كل الوحدات</option>
            {availableUnits.map((u) => (
              <option key={u.number} value={u.number}>
                الوحدة {u.number} — {u.theme}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--vc-text-dim)' }} />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--vc-text-dim)' }} />
          <input
            type="text"
            placeholder="ابحثي عن كلمة…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pr-9 pl-3 rounded-full text-sm focus:outline-none"
            style={{
              background: 'var(--vc-surface-2)',
              border: '1px solid var(--vc-border)',
              color: 'var(--vc-text)',
            }}
          />
        </div>
      </div>

      {/* Mastery stats strip across the displayed words */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="vc-pill">
          <BookOpen size={14} style={{ color: 'var(--vc-text-dim)' }} />
          <span className="tabular-nums">{toArabicNum(masteryStats.total)}</span>
          <span style={{ color: 'var(--vc-text-dim)' }}>كلمة</span>
        </div>
        <div className="vc-pill vc-pill-gold" title="كلمات أتقنتِها">
          <span className="vc-star is-mastered" />
          <span className="tabular-nums">{toArabicNum(masteryStats.mastered)}</span>
          <span style={{ color: 'rgba(252,211,77,0.7)' }}>متقنة</span>
        </div>
        <div className="vc-pill">
          <span className="vc-star is-learning" />
          <span className="tabular-nums">{toArabicNum(masteryStats.learning)}</span>
          <span style={{ color: 'var(--vc-text-dim)' }}>تتعلمينها</span>
        </div>
        <div className="vc-pill">
          <span className="vc-star is-new" />
          <span className="tabular-nums">{toArabicNum(masteryStats.newCount)}</span>
          <span style={{ color: 'var(--vc-text-dim)' }}>جديدة</span>
        </div>
        {audioCount > 0 && (
          <div className="vc-pill">
            <Volume2 size={14} style={{ color: 'var(--vc-text-dim)' }} />
            <span className="tabular-nums">{toArabicNum(audioCount)}</span>
            <span style={{ color: 'var(--vc-text-dim)' }}>مع صوت</span>
          </div>
        )}
        {selectedLevelData && (
          <span
            className="vc-pill"
            style={{
              background: (selectedLevelData.color || 'var(--vc-indigo)') + '22',
              borderColor: (selectedLevelData.color || 'var(--vc-indigo)') + '55',
              color: selectedLevelData.color || 'var(--vc-indigo-bright)',
            }}
          >
            {selectedLevelData.name_ar}
          </span>
        )}
      </div>

      {/* Mode toggle — single scroll row, never wraps at 320px */}
      <div
        className="mt-5 flex items-center gap-1 p-1 rounded-full overflow-x-auto scrollbar-hide"
        style={{ background: 'var(--vc-surface-2)', border: '1px solid var(--vc-border)' }}
      >
        {[
          { key: 'cards', label: 'بطاقات', icon: Layers },
          { key: 'list', label: 'قائمة', icon: List },
          { key: 'chunks', label: 'دفعات', icon: Brain, requiresUnit: true },
          { key: 'games', label: 'ألعاب', icon: Zap },
        ].map(({ key, label, icon: Icon, requiresUnit }) => {
          const disabled = requiresUnit && !selectedUnitId
          const active = viewMode === key
          return (
            <button
              key={key}
              disabled={disabled}
              title={disabled ? 'اختاري وحدة محددة أولاً' : undefined}
              onClick={() => {
                if (disabled) return
                setViewMode(key)
                setActiveGame(null)
                setActiveChunk(null)
              }}
              className="flex items-center justify-center gap-1.5 shrink-0 px-3.5 h-10 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
              style={{
                background: active ? 'var(--vc-surface-2)' : 'transparent',
                border: active ? '1px solid var(--vc-border-strong)' : '1px solid transparent',
                color: active ? 'var(--vc-indigo-bright)' : 'var(--vc-text-dim)',
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: active ? 'var(--vc-glow-indigo)' : 'none',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        {filteredVocab.length === 0 ? (
          <div className="vc-card p-12 text-center">
            <BookOpen size={40} className="mx-auto mb-4" style={{ color: 'var(--vc-text-dim)', opacity: 0.5 }} />
            <p style={{ color: 'var(--vc-text-dim)' }}>لا توجد مفردات لهذه الوحدة بعد</p>
          </div>
        ) : viewMode === 'cards' ? (
          <FlashcardDeck words={filteredVocab} masteryById={masteryById} />
        ) : viewMode === 'list' ? (
          <VocabList words={filteredVocab} masteryById={masteryById} onPlayAudio={playWord} />
        ) : viewMode === 'chunks' ? (
          activeChunk ? (
            <div>
              <button
                onClick={() => setActiveChunk(null)}
                className="mb-4 text-sm font-semibold transition-colors"
                style={{ color: 'var(--vc-indigo-bright)' }}
              >
                ← العودة إلى الدفعات
              </button>
              <VocabularyPractice
                studentId={studentId}
                words={activeChunk.words}
                onComplete={async (stats) => {
                  const normalized = {
                    score: stats?.mastered ?? stats?.correct ?? stats?.score ?? 0,
                    total: stats?.total ?? activeChunk.words.length,
                  }
                  const xp = await awardPracticeXP(studentId, 'vocab_anki', normalized)
                  if (xp > 0) {
                    setXpAwarded(xp)
                    setTimeout(() => setXpAwarded(0), 3000)
                  }
                  setActiveChunk(null)
                }}
                onBack={() => setActiveChunk(null)}
              />
            </div>
          ) : (
            <ChunkSelector
              unitWords={unitWords}
              masteryMap={masteryMap}
              unitLabel={unitLabel}
              onPractice={(chunk) => setActiveChunk(chunk)}
              onQuiz={(chunk) =>
                setQuizState({
                  chunkWords: chunk.words,
                  chunkIndex: chunk.index,
                  title: `اختبار الدفعة ${chunk.index + 1}`,
                })
              }
              onFullQuiz={() =>
                setQuizState({
                  chunkWords: unitWords,
                  chunkIndex: null,
                  title: `اختبار ${unitLabel}`,
                })
              }
            />
          )
        ) : !activeGame ? (
          <GameHub
            games={VOCAB_GAMES}
            totalWords={filteredVocab.length}
            onSelectGame={(gameId, count) => {
              setGameWordCount(count)
              setActiveGame(gameId)
            }}
            onBack={() => setViewMode('cards')}
          />
        ) : (
          <VocabGameRenderer
            studentId={studentId}
            gameId={activeGame}
            words={gameWordCount === Infinity ? filteredVocab : filteredVocab.slice(0, gameWordCount)}
            allWords={filteredVocab}
            onBack={() => setActiveGame(null)}
            onComplete={async (stats) => {
              const xp = await awardPracticeXP(studentId, `vocab_${activeGame}`, stats)
              if (xp > 0) {
                setXpAwarded(xp)
                setTimeout(() => setXpAwarded(0), 3000)
              }
              const raw = stats._raw || {}
              const { error: gErr } = await supabase.from('game_sessions').insert({
                student_id: studentId,
                game_type: activeGame,
                context: 'vocabulary',
                score: stats.score,
                max_score: stats.total,
                accuracy_percent: stats.total > 0 ? Math.round((stats.score / stats.total) * 10000) / 100 : null,
                time_seconds: raw.time || null,
                items_count: stats.total,
                items_correct: stats.score,
                details: raw,
                xp_awarded: xp || 0,
              })
              if (gErr) console.error('Failed to save game session:', gErr)
            }}
          />
        )}
      </div>
    </VocabShell>
  )
}

// ─── Games config + renderer ──────────────────────────
const VOCAB_GAMES = [
  { id: 'anki', name: 'بطاقات سريعة', desc: 'بطاقات ذكية — اقلبي وقيّمي نفسكِ' },
  { id: 'match', name: 'وصّلي', desc: 'وصّلي الكلمة بمعناها' },
  { id: 'speed', name: 'اسمعي واكتبي', desc: 'اسمعي المعنى واكتبي الكلمة' },
  { id: 'scramble', name: 'رتّبي الحروف', desc: 'رتّبي الحروف المبعثرة' },
  { id: 'fill', name: 'أكملي الجملة', desc: 'اختاري الكلمة الناقصة' },
]

function getRandomDistractors(word, allWords, count) {
  const correctLower = word.word.toLowerCase()
  const others = allWords.filter((w) => w.id !== word.id && w.word.toLowerCase() !== correctLower)
  const shuffled = [...others].sort(() => Math.random() - 0.5)
  const unique = []
  const seen = new Set()
  for (const w of shuffled) {
    const key = w.word.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(w.word)
    }
    if (unique.length >= count) break
  }
  return unique
}

function VocabGameRenderer({ gameId, words, allWords, onBack, onComplete, studentId }) {
  const backToHub = () => onBack()
  const handleComplete = (stats) => {
    const normalized = {
      score: stats?.mastered ?? stats?.correct ?? stats?.score ?? 0,
      total: stats?.total ?? stats?.totalPairs ?? words.length,
    }
    onComplete?.({ ...normalized, _raw: stats })
  }

  switch (gameId) {
    case 'anki':
      return (
        <VocabularyPractice
          studentId={studentId}
          words={words}
          onComplete={handleComplete}
          onBack={backToHub}
        />
      )
    case 'match':
      return (
        <MatchGame
          pairs={words.map((w) => ({ id: w.id, question: w.word, answer: w.definition_ar }))}
          title="وصّلي الكلمة بمعناها"
          onComplete={handleComplete}
          onBack={backToHub}
        />
      )
    case 'speed':
      return (
        <SpeedTypeGame
          items={words.map((w) => ({ id: w.id, prompt: w.definition_ar, answer: w.word, audioUrl: w.audio_url }))}
          title="اسمعي واكتبي"
          onComplete={handleComplete}
          onBack={backToHub}
        />
      )
    case 'scramble':
      return (
        <ScrambleGame
          items={words.map((w) => ({ id: w.id, word: w.word, hint: w.definition_ar, audioUrl: w.audio_url }))}
          title="رتّبي الحروف"
          onComplete={handleComplete}
          onBack={backToHub}
        />
      )
    case 'fill': {
      const fillItems = words
        .filter((w) => w.example_sentence)
        .map((w) => ({
          id: w.id,
          sentence: w.example_sentence.replace(new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____'),
          correctAnswer: w.word,
          meaning: w.definition_ar,
          distractors: getRandomDistractors(w, allWords, 3),
          audioUrl: w.audio_url,
        }))
        .filter((item) => item.sentence.includes('_____'))

      if (fillItems.length === 0) {
        return (
          <div className="vc-card p-12 text-center">
            <p style={{ color: 'var(--vc-text-dim)' }}>لا توجد جمل متاحة لهذه المفردات</p>
            <button onClick={backToHub} className="mt-4 text-sm font-semibold" style={{ color: 'var(--vc-indigo-bright)' }}>
              العودة
            </button>
          </div>
        )
      }

      return (
        <FillBlankGame
          items={fillItems}
          title="أكملي الجملة"
          onComplete={handleComplete}
          onBack={backToHub}
        />
      )
    }
    default:
      return null
  }
}

// ─── Level Dropdown (themed + level-locked) ──────────
function LevelDropdown({ levels, selectedLevel, studentLevel, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = levels.find((l) => l.id === selectedLevel)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-10 px-3.5 rounded-full text-sm font-semibold transition-colors"
        style={{
          background: 'var(--vc-surface-2)',
          border: '1px solid var(--vc-border)',
          color: 'var(--vc-text-soft)',
        }}
      >
        <Filter size={14} style={{ color: 'var(--vc-text-dim)' }} />
        {selected?.name_ar || 'اختاري المستوى'}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--vc-text-dim)' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1.5 right-0 min-w-[200px] rounded-2xl overflow-hidden"
            style={{
              background: 'var(--vc-field)',
              border: '1px solid var(--vc-border-strong)',
              boxShadow: '0 18px 50px -12px rgba(0,0,0,0.6)',
            }}
          >
            {levels.map((l) => {
              const isLocked = l.level_number > studentLevel
              const isSelected = l.id === selectedLevel
              return (
                <button
                  key={l.id}
                  disabled={isLocked}
                  onClick={() => {
                    if (!isLocked) {
                      onChange(l.id)
                      setOpen(false)
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-right transition-colors"
                  style={{
                    background: isSelected ? 'var(--vc-surface-2)' : 'transparent',
                    color: isSelected
                      ? 'var(--vc-indigo-bright)'
                      : isLocked
                        ? 'var(--vc-text-dim)'
                        : 'var(--vc-text-soft)',
                    fontWeight: isSelected ? 700 : 500,
                    opacity: isLocked ? 0.45 : 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                  }}
                >
                  {l.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: isLocked ? 'var(--vc-text-dim)' : l.color }}
                    />
                  )}
                  <span className="flex-1">{l.name_ar}</span>
                  {isLocked && <Lock size={13} className="flex-shrink-0" style={{ color: 'var(--vc-text-dim)' }} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── List View ──────────────────────────────
function VocabList({ words, masteryById, onPlayAudio }) {
  const [visible, setVisible] = useState(50)
  const shown = words.slice(0, visible)
  return (
    <div className="space-y-1.5">
      {shown.map((w) => (
        <motion.div
          key={w.id}
          className="vc-card vc-card-hover flex items-center gap-3 h-14 px-4"
          style={{ borderRadius: 16 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Mastery star */}
          <span
            className={`vc-star ${starClass(masteryById[w.id])} flex-shrink-0`}
            title={
              masteryById[w.id] === 'mastered'
                ? 'متقنة'
                : masteryById[w.id] === 'learning'
                  ? 'تتعلمينها'
                  : 'جديدة'
            }
          />

          {/* Audio */}
          {w.audio_url ? (
            <button
              onClick={() => onPlayAudio(w.audio_url)}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-indigo-bright)' }}
              aria-label={`تشغيل نطق ${w.word}`}
            >
              <Volume2 size={16} />
            </button>
          ) : (
            <div className="w-9 h-9 flex-shrink-0" />
          )}

          {/* Word */}
          <span className="vc-word font-semibold min-w-[100px] text-left" dir="ltr" style={{ color: 'var(--vc-text)' }}>
            {w.word}
          </span>

          {/* Part of speech */}
          {w.part_of_speech && (
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--vc-text-dim)' }}>
              {w.part_of_speech}
            </span>
          )}

          {/* Arabic meaning */}
          <span className="flex-1 text-sm text-right truncate" style={{ color: 'var(--vc-text-soft)' }}>
            {w.definition_ar}
          </span>
        </motion.div>
      ))}
      {visible < words.length && (
        <button
          onClick={() => setVisible((v) => v + 50)}
          className="w-full py-2.5 mt-2 rounded-2xl text-xs font-bold transition-colors"
          style={{ background: 'var(--vc-surface)', border: '1px solid var(--vc-border)', color: 'var(--vc-text-dim)' }}
        >
          عرض المزيد ({toArabicNum(words.length - visible)} متبقية)
        </button>
      )}
    </div>
  )
}
