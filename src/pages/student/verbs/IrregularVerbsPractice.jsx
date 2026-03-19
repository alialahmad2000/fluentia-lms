import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, BookOpen, Dumbbell } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import VerbCard from './components/VerbCard'
import VerbPractice from './components/VerbPractice'

export default function IrregularVerbsPractice() {
  const { studentData } = useAuthStore()
  const [mode, setMode] = useState('browse') // browse | practice
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
      const studentLevel = studentData?.level ?? 0
      const match = lvls.find(l => l.level_number === studentLevel) || lvls[0]
      if (match) setSelectedLevelId(match.id)
    }
    fetchLevels()
    return () => { mounted = false }
  }, [studentData?.level])

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
          onClick={() => setMode('browse')}
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
          onClick={() => setMode('practice')}
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
        {/* Level selector */}
        <select
          value={selectedLevelId || ''}
          onChange={e => setSelectedLevelId(e.target.value)}
          className="h-12 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] text-sm font-['Tajawal'] outline-none focus:border-sky-500"
        >
          {levels.map(lvl => (
            <option key={lvl.id} value={lvl.id}>
              المستوى {lvl.level_number} — {lvl.name_ar} ({verbCounts[lvl.id] || 0} فعل)
            </option>
          ))}
        </select>

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

        {/* Difficulty (practice mode) */}
        {mode === 'practice' && (
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
      ) : (
        // Practice mode
        <VerbPractice verbs={filteredVerbs} difficulty={difficulty} />
      )}
    </div>
  )
}
