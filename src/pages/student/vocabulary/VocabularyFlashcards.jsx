import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Search, Volume2, List, Layers, Filter, Lock, ChevronDown, Zap } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import FlashcardDeck from './components/FlashcardDeck'
import VocabularyPractice from './components/VocabularyPractice'

// ─── Skeleton loaders ──────────────────────────────
function FilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 w-28 rounded-xl bg-[rgba(255,255,255,0.06)]" />
      ))}
      <div className="h-10 flex-1 min-w-[180px] rounded-xl bg-[rgba(255,255,255,0.06)]" />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 animate-pulse">
      <div className="w-full max-w-[380px] h-[240px] max-sm:h-[200px] rounded-[20px] bg-[rgba(255,255,255,0.05)]" />
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)]" />
        <div className="w-24 h-5 rounded bg-[rgba(255,255,255,0.06)] self-center" />
        <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)]" />
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-14 rounded-xl bg-[rgba(255,255,255,0.04)]" />
      ))}
    </div>
  )
}

export default function VocabularyFlashcards() {
  const { studentData } = useAuthStore()
  const [vocab, setVocab] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'list' | 'practice'
  const [practiceStarted, setPracticeStarted] = useState(false)
  const [practiceWordCount, setPracticeWordCount] = useState(10)

  const audioRef = useRef(null)

  // Fetch levels + vocabulary
  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      setLoading(true)
      setError(null)

      // Fetch levels
      const { data: levelsData, error: levelsErr } = await supabase
        .from('curriculum_levels')
        .select('id, level_number, name_ar, color')
        .order('level_number')

      if (!isMounted) return
      if (levelsErr) {
        setError(levelsErr.message)
        setLoading(false)
        return
      }
      setLevels(levelsData || [])

      // Set default level to student's current academic level
      const studentLevel = studentData?.academic_level ?? 0
      const defaultLevel = levelsData?.find((l) => l.level_number === studentLevel) || levelsData?.[0]
      if (defaultLevel && !selectedLevel) {
        setSelectedLevel(defaultLevel.id)
      }

      // Fetch all vocabulary with reading → unit join
      const { data: vocabData, error: vocabErr } = await supabase
        .from('curriculum_vocabulary')
        .select('id, word, definition_en, definition_ar, example_sentence, part_of_speech, audio_url, difficulty_tier, sort_order, reading:curriculum_readings!reading_id(unit_id, unit:curriculum_units!unit_id(unit_number, level_id, theme_ar))')
        .order('sort_order')

      if (!isMounted) return
      if (vocabErr) {
        setError(vocabErr.message)
        setLoading(false)
        return
      }

      setVocab(vocabData || [])
      setLoading(false)
    }

    fetchData()
    return () => { isMounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive available units for selected level
  const availableUnits = useMemo(() => {
    if (!selectedLevel) return []
    const units = new Map()
    vocab.forEach((v) => {
      const unit = v.reading?.unit
      if (unit && unit.level_id === selectedLevel) {
        units.set(unit.unit_number, unit.theme_ar)
      }
    })
    return Array.from(units.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([num, theme]) => ({ number: num, theme }))
  }, [vocab, selectedLevel])

  // Filter vocabulary
  const filteredVocab = useMemo(() => {
    let filtered = vocab

    // Filter by level
    if (selectedLevel) {
      filtered = filtered.filter((v) => v.reading?.unit?.level_id === selectedLevel)
    }

    // Filter by unit
    if (selectedUnit !== 'all') {
      const unitNum = parseInt(selectedUnit, 10)
      filtered = filtered.filter((v) => v.reading?.unit?.unit_number === unitNum)
    }

    // Filter by search
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
  }, [vocab, selectedLevel, selectedUnit, searchQuery])

  const audioCount = filteredVocab.filter((v) => v.audio_url).length

  const playWord = (url) => {
    if (audioRef.current) audioRef.current.pause()
    if (!url) return
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  const selectedLevelData = levels.find((l) => l.id === selectedLevel)

  if (loading) {
    return (
      <div className="space-y-12" dir="rtl">
        <div>
          <h1 className="text-page-title font-bold text-[var(--text-primary)]">المفردات</h1>
          <p className="text-[var(--text-muted)] mt-1">تعلّم كلمات جديدة كل يوم</p>
        </div>
        <FilterSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-12" dir="rtl">
        <div>
          <h1 className="text-page-title font-bold text-[var(--text-primary)]">المفردات</h1>
        </div>
        <div className="glass-card p-7 text-center space-y-4">
          <p className="text-[var(--text-primary)]">حدث خطأ — حاول مرة ثانية</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-page-title font-bold text-[var(--text-primary)]">المفردات</h1>
        <p className="text-[var(--text-muted)] mt-1">تعلّم كلمات جديدة كل يوم</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Level selector — custom dropdown */}
        <LevelDropdown
          levels={levels}
          selectedLevel={selectedLevel}
          studentLevel={studentData?.academic_level ?? 0}
          onChange={(id) => {
            setSelectedLevel(id)
            setSelectedUnit('all')
          }}
        />

        {/* Unit selector */}
        <div className="relative">
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="h-10 pl-7 pr-3 rounded-xl text-sm font-medium appearance-none cursor-pointer bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-sky-500/50"
          >
            <option value="all">كل الوحدات</option>
            {availableUnits.map((u) => (
              <option key={u.number} value={u.number}>
                الوحدة {u.number} — {u.theme}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="ابحث عن كلمة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pr-9 pl-3 rounded-xl text-sm bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <BookOpen size={15} />
          {filteredVocab.length} كلمة
        </span>
        {audioCount > 0 && (
          <span className="flex items-center gap-1.5">
            <Volume2 size={15} />
            {audioCount} مع صوت
          </span>
        )}
        {selectedLevelData && (
          <span
            className="px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ background: selectedLevelData.color + '22', color: selectedLevelData.color }}
          >
            {selectedLevelData.name_ar}
          </span>
        )}
      </div>

      {/* Mode toggle — 3 tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] w-fit">
        {[
          { key: 'cards', label: 'بطاقات', icon: Layers },
          { key: 'list', label: 'قائمة', icon: List },
          { key: 'practice', label: 'تدريب', icon: Zap },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setViewMode(key)
              if (key !== 'practice') setPracticeStarted(false)
            }}
            className={`flex items-center gap-2 px-4 h-[44px] rounded-lg text-sm font-medium transition-colors ${
              viewMode === key
                ? 'bg-sky-500/20 text-sky-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {filteredVocab.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BookOpen size={40} className="mx-auto text-[var(--text-muted)] opacity-40 mb-4" />
          <p className="text-[var(--text-muted)]">لا توجد مفردات لهذه الوحدة بعد</p>
        </div>
      ) : viewMode === 'cards' ? (
        <FlashcardDeck words={filteredVocab} />
      ) : viewMode === 'list' ? (
        <VocabList words={filteredVocab} onPlayAudio={playWord} />
      ) : !practiceStarted ? (
        /* Practice start screen */
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="text-center space-y-2">
            <Zap size={36} className="mx-auto text-sky-400" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">تدريب المفردات</h2>
            <p className="text-sm text-[var(--text-muted)]">اقلب البطاقة وقيّم معرفتك بالكلمة</p>
          </div>

          {/* Word count selector */}
          <div className="space-y-2 text-center">
            <span className="text-sm text-[var(--text-muted)]">عدد الكلمات</span>
            <div className="flex gap-2">
              {[
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: Infinity, label: 'الكل' },
              ].map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => setPracticeWordCount(value)}
                  className={`px-5 h-10 rounded-xl text-sm font-bold border transition-colors ${
                    practiceWordCount === value
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                      : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            {Math.min(practiceWordCount, filteredVocab.length)} كلمة من {filteredVocab.length} متاحة
          </p>

          <button
            onClick={() => setPracticeStarted(true)}
            className="px-8 h-12 rounded-xl text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
          >
            ابدأ التدريب
          </button>
        </div>
      ) : (
        /* Practice session */
        <VocabularyPractice
          words={
            practiceWordCount === Infinity
              ? filteredVocab
              : filteredVocab.slice(0, practiceWordCount)
          }
          onComplete={() => {}}
          onBack={() => {
            setPracticeStarted(false)
            setViewMode('cards')
          }}
        />
      )}
    </div>
  )
}

// ─── Level Dropdown (themed + level-locked) ──────────
function LevelDropdown({ levels, selectedLevel, studentLevel, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
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
        className="flex items-center gap-2 h-10 px-3 rounded-xl text-sm font-medium bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-500/40 transition-colors"
      >
        <Filter size={14} className="text-[var(--text-muted)]" />
        {selected?.name_ar || 'اختر المستوى'}
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1.5 right-0 min-w-[200px] rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-xl"
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
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-right transition-colors ${
                    isLocked
                      ? 'cursor-not-allowed opacity-45'
                      : isSelected
                        ? 'bg-sky-500/15 text-sky-400 font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--surface-base)]'
                  }`}
                >
                  {l.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: isLocked ? 'var(--text-muted)' : l.color }}
                    />
                  )}
                  <span className="flex-1">{l.name_ar}</span>
                  {isLocked && <Lock size={13} className="text-[var(--text-muted)] flex-shrink-0" />}
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
function VocabList({ words, onPlayAudio }) {
  return (
    <div className="space-y-1.5">
      {words.map((w) => (
        <motion.div
          key={w.id}
          className="flex items-center gap-3 h-14 px-4 rounded-xl bg-[var(--card-bg,rgba(255,255,255,0.03))] border border-[var(--card-border,rgba(255,255,255,0.06))] hover:border-[rgba(255,255,255,0.12)] transition-colors"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Audio */}
          {w.audio_url ? (
            <button
              onClick={() => onPlayAudio(w.audio_url)}
              className="w-9 h-9 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center flex-shrink-0 hover:bg-sky-500/25 transition-colors"
              aria-label={`تشغيل نطق ${w.word}`}
            >
              <Volume2 size={16} />
            </button>
          ) : (
            <div className="w-9 h-9 flex-shrink-0" />
          )}

          {/* Word */}
          <span className="font-semibold text-[var(--text-primary)] min-w-[100px] text-left" dir="ltr">
            {w.word}
          </span>

          {/* Part of speech */}
          {w.part_of_speech && (
            <span className="text-xs text-[var(--text-muted)] opacity-60 hidden sm:inline">
              {w.part_of_speech}
            </span>
          )}

          {/* Arabic meaning */}
          <span className="flex-1 text-sm text-[var(--text-secondary)] text-right truncate">
            {w.definition_ar}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
