import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Search, X, Users, BookOpen, CreditCard, User, ArrowRight } from 'lucide-react'

const RECENT_KEY = 'fluentia_recent_searches'
const MAX_RECENT = 5
const DEBOUNCE_MS = 300

// ─── Category config ────────────────────────────────────────
const CATEGORIES = {
  students: { label: 'الطلاب', icon: Users, path: '/admin/users' },
  groups:   { label: 'المجموعات', icon: BookOpen, path: '/admin/groups' },
  trainers: { label: 'المدربون', icon: User, path: '/admin/trainers' },
  payments: { label: 'المدفوعات', icon: CreditCard, path: '/admin/packages' },
}

// ─── Helpers ────────────────────────────────────────────────
function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch { return [] }
}

function saveRecent(item) {
  const list = loadRecent().filter((r) => r.id !== item.id)
  list.unshift(item)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
}

// ─── Component ──────────────────────────────────────────────
export default function GlobalSearch() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])

  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const role = profile?.role

  // Don't render for students or unauthenticated
  if (!user || role === 'student') return null

  // ── Flatten results for keyboard nav ────────────────────
  const flatResults = []
  Object.entries(results).forEach(([cat, items]) => {
    items.forEach((item) => flatResults.push({ ...item, category: cat }))
  })

  // ── Open / close ───────────────────────────────────────
  const openModal = useCallback(() => {
    setOpen(true)
    setQuery('')
    setResults({})
    setActiveIdx(0)
    setRecentSearches(loadRecent())
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults({})
  }, [])

  // ── Global keyboard shortcut ───────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openModal()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openModal])

  // Focus input when modal opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // ── Search logic ───────────────────────────────────────
  const performSearch = useCallback(
    async (term) => {
      if (!term || term.length < 2) {
        setResults({})
        setLoading(false)
        return
      }

      setLoading(true)
      const searchTerm = `%${term}%`
      const newResults = {}

      try {
        // Students
        if (role === 'admin' || role === 'trainer') {
          let q = supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('role', 'student')
            .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .limit(5)

          // Trainer: only students in their groups
          if (role === 'trainer') {
            const { data: memberIds } = await supabase
              .from('group_members')
              .select('student_id, groups!inner(trainer_id)')
              .eq('groups.trainer_id', profile.id)
            const ids = (memberIds || []).map((m) => m.student_id)
            if (ids.length) q = q.in('id', ids)
            else q = q.in('id', [])
          }

          const { data } = await q
          if (data?.length) {
            newResults.students = data.map((s) => ({
              id: `student-${s.id}`,
              title: s.full_name,
              subtitle: s.email,
              path: role === 'admin' ? '/admin/users' : '/trainer/students',
            }))
          }
        }

        // Groups
        if (role === 'admin' || role === 'trainer') {
          let q = supabase
            .from('groups')
            .select('id, name, code')
            .or(`name.ilike.${searchTerm},code.ilike.${searchTerm}`)
            .limit(5)

          if (role === 'trainer') {
            q = q.eq('trainer_id', profile.id)
          }

          const { data } = await q
          if (data?.length) {
            newResults.groups = data.map((g) => ({
              id: `group-${g.id}`,
              title: g.name,
              subtitle: g.code,
              path: role === 'admin' ? '/admin/groups' : '/trainer',
            }))
          }
        }

        // Trainers (admin only)
        if (role === 'admin') {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'trainer')
            .ilike('full_name', searchTerm)
            .limit(5)

          if (data?.length) {
            newResults.trainers = data.map((t) => ({
              id: `trainer-${t.id}`,
              title: t.full_name,
              subtitle: t.email,
              path: '/admin/trainers',
            }))
          }
        }

        // Payments (admin only)
        if (role === 'admin') {
          const { data } = await supabase
            .from('payments')
            .select('id, amount, profiles!inner(full_name)')
            .ilike('profiles.full_name', searchTerm)
            .limit(5)

          if (data?.length) {
            newResults.payments = data.map((p) => ({
              id: `payment-${p.id}`,
              title: p.profiles?.full_name,
              subtitle: `${p.amount} ر.س`,
              path: '/admin/packages',
            }))
          }
        }
      } catch (err) {
        console.error('Global search error:', err)
      }

      setResults(newResults)
      setActiveIdx(0)
      setLoading(false)
    },
    [role, profile?.id],
  )

  // ── Debounced input handler ────────────────────────────
  const handleInputChange = useCallback(
    (e) => {
      const val = e.target.value
      setQuery(val)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => performSearch(val.trim()), DEBOUNCE_MS)
    },
    [performSearch],
  )

  // ── Navigate to result ─────────────────────────────────
  const goTo = useCallback(
    (item) => {
      saveRecent(item)
      closeModal()
      navigate(item.path)
    },
    [navigate, closeModal],
  )

  // ── Keyboard nav inside modal ──────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        closeModal()
        return
      }

      const list = flatResults.length ? flatResults : recentSearches
      if (!list.length) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => (i + 1) % list.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => (i - 1 + list.length) % list.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = list[activeIdx]
        if (selected) goTo(selected)
      }
    },
    [flatResults, recentSearches, activeIdx, goTo, closeModal],
  )

  if (!open) return null

  // ── Render ─────────────────────────────────────────────
  const hasResults = flatResults.length > 0
  const showRecent = !query && recentSearches.length > 0

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
      onClick={closeModal}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl glass-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="ابحث عن طلاب، مجموعات، مدربين..."
            className="flex-1 bg-transparent text-white placeholder:text-muted text-base outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults({}) }} className="text-muted hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface text-muted text-xs border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Body */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Recent searches */}
          {showRecent && !loading && (
            <div>
              <p className="text-muted text-xs px-3 py-2">عمليات بحث سابقة</p>
              {recentSearches.map((item, idx) => {
                const isActive = idx === activeIdx
                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-colors ${
                      isActive ? 'bg-surface text-white' : 'text-muted hover:bg-surface/50 hover:text-white'
                    }`}
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate text-sm">{item.title}</span>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-50" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Grouped results */}
          {hasResults && !loading && (
            <>
              {(() => {
                let globalIdx = 0
                return Object.entries(results).map(([cat, items]) => {
                  const config = CATEGORIES[cat]
                  if (!config || !items.length) return null
                  const Icon = config.icon

                  return (
                    <div key={cat} className="mb-1">
                      <p className="flex items-center gap-2 text-muted text-xs px-3 py-2">
                        <Icon className="w-3.5 h-3.5" />
                        {config.label}
                      </p>
                      {items.map((item) => {
                        const idx = globalIdx++
                        const isActive = idx === activeIdx
                        return (
                          <button
                            key={item.id}
                            onClick={() => goTo(item)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-colors ${
                              isActive ? 'bg-surface text-white' : 'text-muted hover:bg-surface/50 hover:text-white'
                            }`}
                          >
                            <span className="flex-1 truncate text-sm">{item.title}</span>
                            {item.subtitle && (
                              <span className="text-xs text-muted truncate max-w-[140px]">{item.subtitle}</span>
                            )}
                            <ArrowRight className="w-4 h-4 shrink-0 opacity-50" />
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              })()}
            </>
          )}

          {/* No results */}
          {query && !loading && !hasResults && (
            <div className="text-center py-10 text-muted text-sm">
              لا توجد نتائج لـ &quot;{query}&quot;
            </div>
          )}

          {/* Empty state */}
          {!query && !showRecent && !loading && (
            <div className="text-center py-10 text-muted text-sm">
              اكتب للبحث في النظام...
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 text-muted text-xs">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-white/10 mx-0.5">↑↓</kbd>
            للتنقل
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-white/10 mx-0.5">Enter</kbd>
            لفتح
          </span>
        </div>
      </div>
    </div>
  )
}
