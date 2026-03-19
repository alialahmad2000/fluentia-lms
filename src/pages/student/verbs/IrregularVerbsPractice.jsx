import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BookOpen, Dumbbell, Lock, ChevronDown, Filter, PenLine, RotateCcw, Link2, Keyboard } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import VerbCard from './components/VerbCard'
import VerbPractice from './components/VerbPractice'
import VerbAnkiPractice from './components/VerbAnkiPractice'
import MatchGame from '../../../components/games/MatchGame'
import SpeedTypeGame from '../../../components/games/SpeedTypeGame'

export default function IrregularVerbsPractice() {
  const { studentData } = useAuthStore()
  const [mode, setMode] = useState('browse') // browse | practice
  const [practiceMode, setPracticeMode] = useState(null) // null | 'quiz' | 'anki' | 'match' | 'type'
  const [difficulty, setDifficulty] = useState('easy')
  const [levels, setLevels] = useState([])
  const [selectedLevelId, setSelectedLevelId] = useState(null)
  const [verbs, setVerbs] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [verbCounts, setVerbCounts] = useState({})
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Fetch levels + verb counts
  useEffect(() => {
    let mounted = true
    async function fetchLevels() {
      const { data: lvls, error } = await supabase
        .from('curriculum_levels')
        .select('id, level_number, name_ar, color')
        .order('level_number')

      if (!mounted || error || !lvls) return

      // Fetch counts per level
      const counts = {}
      for (const lvl of lvls) {
        const { count } = await supabase
          .from('curriculum_irregular_verbs')
          .select('*', { count: 'exact', head: true })
          .eq('level_id', lvl.id)
        if (!mounted) return
        counts[lvl.id] = count || 0
      }

      setLevels(lvls)
      setVerbCounts(counts)

      // Default to student's current level or first level
      const studentLevel = studentData?.academic_level ?? 0
      const match = lvls.find(l => l.level_number === studentLevel) || lvls[0]
      if (match) setSelectedLevelId(match.id)
    }
    fetchLevels()
    return () => { mounted = false }
  }, [studentData?.academic_level])

  // Fetch verbs for selected level
  useEffect(() => {
    if (!selectedLevelId) return
    let mounted = true
    setLoading(true)

    async function fetchVerbs() {
      const { data, error } = await supabase
        .from('curriculum_irregular_verbs')
        .select('*')
        .eq('level_id', selectedLevelId)
        .order('sort_order')

      if (!mounted) return
      if (!error && data) setVerbs(data)
      setLoading(false)
    }
    fetchVerbs()
    return () => { mounted = false }
  }, [selectedLevelId])

  const filteredVerbs = verbs.filter(v => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      v.verb_base.toLowerCase().includes(q) ||
      v.verb_past.toLowerCase().includes(q) ||
      v.verb_past_participle.toLowerCase().includes(q) ||
      v.meaning_ar.includes(search)
    )
  })

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-page-title font-bold text-[var(--text-primary)] font-['Tajawal']">
          الأفعال الشاذة
        </h1>
        <p className="text-[var(--text-muted)] mt-1 font-['Tajawal']">
          تدرّب على الأفعال غير المنتظمة
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-elevated)] w-fit">
        <button
          onClick={() => { setMode('browse'); setPracticeMode(null) }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors font-['Tajawal'] ${
            mode === 'browse'
              ? 'bg-sky-500 text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen size={16} />
          تصفّح
        </button>
        <button
          onClick={() => { setMode('practice'); setPracticeMode(null) }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors font-['Tajawal'] ${
            mode === 'practice'
              ? 'bg-sky-500 text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Dumbbell size={16} />
          تدريب
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Level selector — themed + locked */}
        <VerbLevelDropdown
          levels={levels}
          selectedLevelId={selectedLevelId}
          studentLevel={studentData?.academic_level ?? 0}
          verbCounts={verbCounts}
          onChange={setSelectedLevelId}
        />

        {/* Search (browse mode only) */}
        {mode === 'browse' && (
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن فعل..."
              className="w-full h-12 pr-10 pl-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] text-sm font-['Tajawal'] outline-none focus:border-sky-500"
            />
          </div>
        )}

        {/* Difficulty (quiz practice mode only) */}
        {mode === 'practice' && practiceMode === 'quiz' && (
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-elevated)]">
            <button
              onClick={() => setDifficulty('easy')}
              className={`px-4 py-2 rounded-lg text-sm font-['Tajawal'] transition-colors ${
                difficulty === 'easy'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              سهل
            </button>
            <button
              onClick={() => setDifficulty('hard')}
              className={`px-4 py-2 rounded-lg text-sm font-['Tajawal'] transition-colors ${
                difficulty === 'hard'
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              صعب
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        // Skeleton cards
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 animate-pulse">
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[1, 2, 3].map(j => (
                  <div key={j} className="text-center">
                    <div className="h-6 bg-[var(--border-subtle)] rounded w-16 mx-auto mb-2" />
                    <div className="h-3 bg-[var(--border-subtle)] rounded w-12 mx-auto" />
                  </div>
                ))}
              </div>
              <div className="h-4 bg-[var(--border-subtle)] rounded w-20 mb-2" />
              <div className="h-3 bg-[var(--border-subtle)] rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredVerbs.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-[var(--text-muted)] font-['Tajawal']">
            {search ? 'لا توجد نتائج للبحث' : 'لا توجد أفعال شاذة لهذا المستوى بعد'}
          </p>
        </div>
      ) : mode === 'browse' ? (
        // Browse mode — grid of verb cards
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {filteredVerbs.map(verb => (
            <VerbCard key={verb.id} verb={verb} />
          ))}
        </motion.div>
      ) : !practiceMode ? (
        // Practice mode picker
        <div className="flex flex-col items-center gap-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">اختر نوع التدريب</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
            <button
              onClick={() => setPracticeMode('quiz')}
              className="flex flex-col items-center gap-3 p-5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-sky-500/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-sky-500/15 flex items-center justify-center group-hover:bg-sky-500/25 transition-colors">
                <PenLine size={22} className="text-sky-400" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">اختبار</span>
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-center leading-tight">أكمل الفراغ</span>
            </button>
            <button
              onClick={() => setPracticeMode('anki')}
              className="flex flex-col items-center gap-3 p-5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-amber-500/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/25 transition-colors">
                <RotateCcw size={22} className="text-amber-400" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">أنكي</span>
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-center leading-tight">بطاقات ذاتية</span>
            </button>
            <button
              onClick={() => setPracticeMode('match')}
              className="flex flex-col items-center gap-3 p-5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-emerald-500/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                <Link2 size={22} className="text-emerald-400" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">وصّل</span>
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-center leading-tight">وصّل بالمعنى</span>
            </button>
            <button
              onClick={() => setPracticeMode('type')}
              className="flex flex-col items-center gap-3 p-5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-purple-500/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/15 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors">
                <Keyboard size={22} className="text-purple-400" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">اكتب</span>
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-center leading-tight">اسمع واكتب</span>
            </button>
          </div>
        </div>
      ) : practiceMode === 'quiz' ? (
        // Quiz practice mode
        <VerbPractice verbs={filteredVerbs} difficulty={difficulty} />
      ) : practiceMode === 'anki' ? (
        // Anki practice mode
        <VerbAnkiPractice
          verbs={filteredVerbs}
          onComplete={() => {}}
          onBack={() => setPracticeMode(null)}
        />
      ) : practiceMode === 'match' ? (
        // Match game mode
        <MatchGame
          pairs={filteredVerbs.map(v => ({
            id: v.id,
            question: v.verb_base,
            answer: v.verb_past,
          }))}
          title="وصّل الفعل بتصريفه الماضي"
          onComplete={() => {}}
          onBack={() => setPracticeMode(null)}
        />
      ) : (
        // Speed type mode
        <SpeedTypeGame
          items={filteredVerbs.map(v => ({
            id: v.id,
            prompt: `ماضي: ${v.verb_base}`,
            answer: v.verb_past,
            audioUrl: v.audio_past_url,
          }))}
          title="اسمع واكتب التصريف"
          onComplete={() => {}}
          onBack={() => setPracticeMode(null)}
        />
      )}
    </div>
  )
}

// ─── Level Dropdown (themed + level-locked) ──────────
function VerbLevelDropdown({ levels, selectedLevelId, studentLevel, verbCounts, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = levels.find(l => l.id === selectedLevelId)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-12 px-4 rounded-xl text-sm font-medium font-['Tajawal'] bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-500/40 transition-colors"
      >
        <Filter size={14} className="text-[var(--text-muted)]" />
        {selected ? `${selected.name_ar} (${verbCounts[selected.id] || 0} فعل)` : 'اختر المستوى'}
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1.5 right-0 min-w-[260px] rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-xl"
          >
            {levels.map(l => {
              const isLocked = l.level_number > studentLevel
              const isSelected = l.id === selectedLevelId

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
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-right font-['Tajawal'] transition-colors ${
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
                  <span className="flex-1">
                    {l.name_ar}
                    <span className="text-xs text-[var(--text-muted)] mr-1">
                      ({verbCounts[l.id] || 0} فعل)
                    </span>
                  </span>
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
