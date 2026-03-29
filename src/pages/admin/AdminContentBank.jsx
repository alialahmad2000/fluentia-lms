import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Mic, PenTool, Headphones, ShieldAlert, GraduationCap,
  Search, Trash2, Loader2, Sparkles, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, CheckSquare, Square, ExternalLink,
  Clock, Hash, FileText, HelpCircle, AlertTriangle, X, Filter,
  ArrowUpDown, BarChart3,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────
const PAGE_SIZE = 20
const LEVELS = [1, 2, 3, 4, 5, 6]

const LEVEL_COLORS = {
  1: { badge: 'bg-emerald-500/20 text-emerald-400' },
  2: { badge: 'bg-sky-500/20 text-sky-400' },
  3: { badge: 'bg-violet-500/20 text-violet-400' },
  4: { badge: 'bg-amber-500/20 text-amber-400' },
  5: { badge: 'bg-rose-500/20 text-rose-400' },
  6: { badge: 'bg-red-500/20 text-red-400' },
}

const TABS = [
  { key: 'reading',    label: 'قراءة',         table: 'curriculum_reading_passages',     Icon: BookOpen,     accent: 'var(--accent-sky)' },
  { key: 'speaking',   label: 'تحدث',          table: 'curriculum_speaking_topics',       Icon: Mic,          accent: 'var(--accent-emerald)' },
  { key: 'writing',    label: 'كتابة',         table: 'curriculum_writing_prompts',       Icon: PenTool,      accent: 'var(--accent-gold)' },
  { key: 'listening',  label: 'استماع',        table: 'curriculum_listening_exercises',   Icon: Headphones,   accent: 'var(--accent-violet)' },
  { key: 'verbs',      label: 'أفعال شاذة',    table: 'curriculum_irregular_verbs',       Icon: ShieldAlert,  accent: 'var(--accent-rose)' },
  { key: 'grammar',    label: 'قرامر',         table: 'curriculum_grammar_lessons',       Icon: GraduationCap,accent: 'var(--accent-amber)' },
]

function toArabicNum(n) {
  return String(n).replace(/\d/g, d => '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'[d])
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25 },
}

// ─── Badge helper ─────────────────────────────────────────────
function Badge({ children, className = '' }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

// ─── Level badge ──────────────────────────────────────────────
function LevelBadge({ level }) {
  const c = LEVEL_COLORS[level] || LEVEL_COLORS[1]
  return <Badge className={c.badge}>المستوى {toArabicNum(level)}</Badge>
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export default function AdminContentBank() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('reading')
  const [filterLevel, setFilterLevel] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [generating, setGenerating] = useState(null)
  const [toast, setToast] = useState(null)
  const [verbSort, setVerbSort] = useState({ col: 'level', asc: true })

  const currentTab = TABS.find(t => t.key === activeTab)

  // ─── Fetch counts for all tabs ──────────────────────────────
  const { data: counts = {} } = useQuery({
    queryKey: ['content-bank-counts', filterLevel],
    queryFn: async () => {
      const results = {}
      await Promise.all(
        TABS.map(async (tab) => {
          let query = supabase.from(tab.table).select('id', { count: 'exact', head: true })
          if (filterLevel) query = query.eq('level', parseInt(filterLevel))
          const { count } = await query
          results[tab.key] = count || 0
        })
      )
      return results
    },
  })

  // ─── Fetch items for active tab ─────────────────────────────
  const { data: result = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['content-bank', activeTab, filterLevel, searchQuery, page, verbSort],
    queryFn: async () => {
      let query = supabase.from(currentTab.table).select('*', { count: 'exact' })

      if (filterLevel) query = query.eq('level', parseInt(filterLevel))

      // Search
      if (searchQuery) {
        const s = `%${searchQuery}%`
        if (activeTab === 'reading') query = query.or(`title.ilike.${s},topic.ilike.${s}`)
        else if (activeTab === 'speaking') query = query.or(`title.ilike.${s},category.ilike.${s}`)
        else if (activeTab === 'writing') query = query.or(`title.ilike.${s},prompt_type.ilike.${s}`)
        else if (activeTab === 'listening') query = query.or(`title.ilike.${s},channel.ilike.${s}`)
        else if (activeTab === 'verbs') query = query.or(`base.ilike.${s},meaning_ar.ilike.${s}`)
        else if (activeTab === 'grammar') query = query.or(`title.ilike.${s},unit_title.ilike.${s}`)
      }

      // Sort
      if (activeTab === 'verbs') {
        query = query.order(verbSort.col, { ascending: verbSort.asc })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, count, error } = await query
      if (error) throw error
      return { items: data || [], total: count || 0 }
    },
  })

  const totalPages = Math.ceil(result.total / PAGE_SIZE)

  // ─── Delete mutation ────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      const { error } = await supabase.from(currentTab.table).delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-bank'] })
      queryClient.invalidateQueries({ queryKey: ['content-bank-counts'] })
      setSelectedIds([])
      showToast('تم الحذف بنجاح', 'success')
    },
    onError: () => showToast('فشل الحذف', 'error'),
  })

  // ─── Generate content ───────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(activeTab)
    try {
      await invokeWithRetry('seed-curriculum', {
        level: filterLevel ? parseInt(filterLevel) : null,
        content_type: activeTab,
      }, { timeout: 120000 })
      queryClient.invalidateQueries({ queryKey: ['content-bank'] })
      queryClient.invalidateQueries({ queryKey: ['content-bank-counts'] })
      showToast('تم توليد المحتوى بنجاح', 'success')
    } catch {
      showToast('فشل التوليد', 'error')
    } finally {
      setGenerating(null)
    }
  }, [activeTab, filterLevel, queryClient])

  // ─── Selection helpers ──────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleSelectAll = () => {
    const ids = result.items.map(i => i.id)
    setSelectedIds(prev => prev.length === ids.length ? [] : ids)
  }

  // ─── Toast ──────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Reset page on filter change ───────────────────────────
  const changeTab = (key) => { setActiveTab(key); setPage(0); setExpandedId(null); setSelectedIds([]); setSearchQuery('') }
  const changeLevel = (val) => { setFilterLevel(val); setPage(0); setSelectedIds([]) }

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-page-title">بنك المحتوى التعليمي</h1>
        <div className="flex items-center gap-3">
          {/* Level filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
            <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
            <select
              value={filterLevel}
              onChange={e => changeLevel(e.target.value)}
              className="bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="">كل المستويات</option>
              {LEVELS.map(l => <option key={l} value={l}>المستوى {l}</option>)}
            </select>
          </div>
          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!!generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${currentTab.accent}, ${currentTab.accent}dd)` }}
          >
            {generating === activeTab ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            توليد محتوى {currentTab.label}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {TABS.map(tab => (
          <motion.div
            key={tab.key}
            className="fl-card-static p-4 cursor-pointer transition-all hover:scale-[1.02]"
            onClick={() => changeTab(tab.key)}
            style={{ borderColor: activeTab === tab.key ? tab.accent : 'var(--border-subtle)', borderWidth: activeTab === tab.key ? 2 : 1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <tab.Icon size={18} style={{ color: tab.accent }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tab.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: tab.accent }}>
              {toArabicNum(counts[tab.key] || 0)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--surface-raised)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => changeTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'text-white shadow' : ''}`}
            style={activeTab === tab.key ? { background: tab.accent } : { color: 'var(--text-secondary)' }}
          >
            <tab.Icon size={15} />
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--border-subtle)' }}>
                {toArabicNum(counts[tab.key])}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
          <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0) }}
            placeholder="بحث..."
            className="bg-transparent w-full outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={() => deleteMutation.mutate(selectedIds)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
          >
            <Trash2 size={15} />
            حذف ({toArabicNum(selectedIds.length)})
          </button>
        )}
        <button onClick={toggleSelectAll} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
          {selectedIds.length === result.items.length && result.items.length > 0 ? <CheckSquare size={15} /> : <Square size={15} />}
          تحديد الكل
        </button>
      </div>

      {/* Generating progress */}
      {generating && (
        <motion.div {...fadeIn} className="fl-card p-4 flex items-center gap-3" style={{ borderColor: currentTab.accent }}>
          <Loader2 size={20} className="animate-spin" style={{ color: currentTab.accent }} />
          <span style={{ color: 'var(--text-primary)' }}>جارٍ توليد محتوى {currentTab.label}...</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: currentTab.accent }}
              initial={{ width: '0%' }}
              animate={{ width: '80%' }}
              transition={{ duration: 60, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}

      {/* Content area */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} {...fadeIn}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin" style={{ color: currentTab.accent }} />
            </div>
          ) : result.items.length === 0 ? (
            <div className="text-center py-20">
              <currentTab.Icon size={48} className="mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-muted">لا يوجد محتوى</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Verbs table */}
              {activeTab === 'verbs' ? (
                <VerbsTable
                  items={result.items} selectedIds={selectedIds} toggleSelect={toggleSelect}
                  expandedId={expandedId} setExpandedId={setExpandedId}
                  onDelete={id => deleteMutation.mutate([id])}
                  verbSort={verbSort} setVerbSort={setVerbSort}
                />
              ) : activeTab === 'reading' ? (
                result.items.map(item => (
                  <ReadingCard key={item.id} item={item} expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    selected={selectedIds.includes(item.id)} onSelect={() => toggleSelect(item.id)}
                    onDelete={() => deleteMutation.mutate([item.id])} />
                ))
              ) : activeTab === 'speaking' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.items.map(item => (
                    <SpeakingCard key={item.id} item={item} expanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      selected={selectedIds.includes(item.id)} onSelect={() => toggleSelect(item.id)}
                      onDelete={() => deleteMutation.mutate([item.id])} />
                  ))}
                </div>
              ) : activeTab === 'writing' ? (
                result.items.map(item => (
                  <WritingCard key={item.id} item={item} expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    selected={selectedIds.includes(item.id)} onSelect={() => toggleSelect(item.id)}
                    onDelete={() => deleteMutation.mutate([item.id])} />
                ))
              ) : activeTab === 'listening' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.items.map(item => (
                    <ListeningCard key={item.id} item={item} expanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      selected={selectedIds.includes(item.id)} onSelect={() => toggleSelect(item.id)}
                      onDelete={() => deleteMutation.mutate([item.id])} />
                  ))}
                </div>
              ) : activeTab === 'grammar' ? (
                result.items.map(item => (
                  <GrammarCard key={item.id} item={item} expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    selected={selectedIds.includes(item.id)} onSelect={() => toggleSelect(item.id)}
                    onDelete={() => deleteMutation.mutate([item.id])} />
                ))
              ) : null}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="p-2 rounded-lg transition-colors disabled:opacity-30" style={{ background: 'var(--surface-raised)' }}>
            <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {toArabicNum(page + 1)} / {toArabicNum(totalPages)}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-30" style={{ background: 'var(--surface-raised)' }}>
            <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium"
            style={{ background: toast.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)', color: '#fff' }}
          >
            {toast.type === 'success' ? <BarChart3 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Reading Card
// ═══════════════════════════════════════════════════════════════
function ReadingCard({ item, expanded, onToggle, selected, onSelect, onDelete }) {
  return (
    <div className="fl-card-static rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={onToggle}>
        <button onClick={e => { e.stopPropagation(); onSelect() }} className="shrink-0">
          {selected ? <CheckSquare size={18} style={{ color: 'var(--accent-sky)' }} /> : <Square size={18} style={{ color: 'var(--text-tertiary)' }} />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <LevelBadge level={item.level} />
            {item.topic && <Badge className="bg-sky-500/15 text-sky-400">{item.topic}</Badge>}
            {item.difficulty && <Badge className="bg-amber-500/15 text-amber-400">{item.difficulty}</Badge>}
            {item.word_count && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}><Hash size={12} className="inline" /> {toArabicNum(item.word_count)} كلمة</span>}
            {item.questions && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}><HelpCircle size={12} className="inline" /> {toArabicNum(Array.isArray(item.questions) ? item.questions.length : 0)} سؤال</span>}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors">
          <Trash2 size={16} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={18} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-tertiary)' }} />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="pt-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{item.passage || item.text || item.content}</p>
              </div>
              {Array.isArray(item.questions) && item.questions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>الأسئلة</h4>
                  {item.questions.map((q, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--surface-raised)' }}>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{toArabicNum(i + 1)}. {q.question || q.text}</p>
                      {Array.isArray(q.options) && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {q.options.map((opt, j) => (
                            <span key={j} className={`text-xs px-2 py-1 rounded ${opt === q.correct_answer || j === q.correct_index ? 'bg-emerald-500/20 text-emerald-400 font-bold' : ''}`}
                              style={opt !== q.correct_answer && j !== q.correct_index ? { color: 'var(--text-tertiary)' } : undefined}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Speaking Card
// ═══════════════════════════════════════════════════════════════
function SpeakingCard({ item, expanded, onToggle, selected, onSelect, onDelete }) {
  return (
    <div className="fl-card-static rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); onSelect() }} className="shrink-0 mt-0.5">
              {selected ? <CheckSquare size={18} style={{ color: 'var(--accent-emerald)' }} /> : <Square size={18} style={{ color: 'var(--text-tertiary)' }} />}
            </button>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <LevelBadge level={item.level} />
                {item.category && <Badge className="bg-emerald-500/15 text-emerald-400">{item.category}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors">
              <Trash2 size={16} className="text-red-400" />
            </button>
            {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {Array.isArray(item.guiding_questions) && item.guiding_questions.length > 0 && (
                <div className="pt-3">
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>أسئلة إرشادية</h4>
                  <ul className="space-y-1">
                    {item.guiding_questions.map((q, i) => (
                      <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(item.vocabulary_hints) && item.vocabulary_hints.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>تلميحات مفردات</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.vocabulary_hints.map((v, i) => (
                      <Badge key={i} className="bg-violet-500/15 text-violet-400">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {item.tips && (
                <div>
                  <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>نصائح</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.tips}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Writing Card
// ═══════════════════════════════════════════════════════════════
function WritingCard({ item, expanded, onToggle, selected, onSelect, onDelete }) {
  return (
    <div className="fl-card-static rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={onToggle}>
        <button onClick={e => { e.stopPropagation(); onSelect() }} className="shrink-0">
          {selected ? <CheckSquare size={18} style={{ color: 'var(--accent-gold)' }} /> : <Square size={18} style={{ color: 'var(--text-tertiary)' }} />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <LevelBadge level={item.level} />
            {item.prompt_type && <Badge className="bg-amber-500/15 text-amber-400">{item.prompt_type}</Badge>}
            {(item.min_words || item.max_words) && (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <FileText size={12} className="inline" /> {toArabicNum(item.min_words || 0)}–{toArabicNum(item.max_words || 0)} كلمة
              </span>
            )}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors">
          <Trash2 size={16} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={18} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-tertiary)' }} />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {item.prompt && (
                <div className="pt-3">
                  <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>الموضوع</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{item.prompt}</p>
                </div>
              )}
              {item.instructions && (
                <div>
                  <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>التعليمات</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.instructions}</p>
                </div>
              )}
              {item.hints && (
                <div>
                  <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>تلميحات</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{typeof item.hints === 'string' ? item.hints : JSON.stringify(item.hints)}</p>
                </div>
              )}
              {item.example_starter && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--surface-raised)' }}>
                  <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>مثال للبداية</h4>
                  <p className="text-sm italic" style={{ color: 'var(--accent-gold)' }}>{item.example_starter}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Listening Card
// ═══════════════════════════════════════════════════════════════
function ListeningCard({ item, expanded, onToggle, selected, onSelect, onDelete }) {
  return (
    <div className="fl-card-static rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); onSelect() }} className="shrink-0 mt-0.5">
              {selected ? <CheckSquare size={18} style={{ color: 'var(--accent-violet)' }} /> : <Square size={18} style={{ color: 'var(--text-tertiary)' }} />}
            </button>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <LevelBadge level={item.level} />
                {item.channel && <Badge className="bg-violet-500/15 text-violet-400">{item.channel}</Badge>}
                {item.duration && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}><Clock size={12} /> {item.duration}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {item.youtube_url && (
              <a href={item.youtube_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors">
                <ExternalLink size={16} className="text-red-400" />
              </a>
            )}
            <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors">
              <Trash2 size={16} className="text-red-400" />
            </button>
            {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {item.description && (
                <div className="pt-3">
                  <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>الوصف</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                </div>
              )}
              {Array.isArray(item.questions) && item.questions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>الأسئلة</h4>
                  {item.questions.map((q, i) => (
                    <div key={i} className="p-3 rounded-lg mb-2" style={{ background: 'var(--surface-raised)' }}>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{toArabicNum(i + 1)}. {q.question || q.text}</p>
                      {Array.isArray(q.options) && (
                        <div className="grid grid-cols-2 gap-1">
                          {q.options.map((opt, j) => (
                            <span key={j} className={`text-xs px-2 py-1 rounded ${opt === q.correct_answer || j === q.correct_index ? 'bg-emerald-500/20 text-emerald-400 font-bold' : ''}`}
                              style={opt !== q.correct_answer && j !== q.correct_index ? { color: 'var(--text-tertiary)' } : undefined}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Verbs Table
// ═══════════════════════════════════════════════════════════════
function VerbsTable({ items, selectedIds, toggleSelect, onDelete, verbSort, setVerbSort }) {
  const toggleSort = (col) => {
    setVerbSort(prev => ({ col, asc: prev.col === col ? !prev.asc : true }))
  }

  const SortHeader = ({ col, children }) => (
    <th
      className="px-3 py-2 text-xs font-semibold cursor-pointer select-none"
      style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {children}
        {verbSort.col === col && <ArrowUpDown size={12} style={{ color: 'var(--accent-rose)' }} />}
      </span>
    </th>
  )

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
          <thead style={{ background: 'var(--surface-raised)' }}>
            <tr>
              <th className="px-3 py-2 w-8" style={{ borderBottom: '1px solid var(--border-subtle)' }}></th>
              <SortHeader col="base">Base</SortHeader>
              <SortHeader col="past">Past</SortHeader>
              <SortHeader col="past_participle">Past Participle</SortHeader>
              <th className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>المعنى</th>
              <SortHeader col="level">المستوى</SortHeader>
              <th className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>الفئة</th>
              <th className="px-3 py-2 w-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((v, i) => (
              <tr key={v.id} className="transition-colors hover:bg-white/5" style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                <td className="px-3 py-2">
                  <button onClick={() => toggleSelect(v.id)}>
                    {selectedIds.includes(v.id) ? <CheckSquare size={16} style={{ color: 'var(--accent-rose)' }} /> : <Square size={16} style={{ color: 'var(--text-tertiary)' }} />}
                  </button>
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: 'var(--accent-rose)' }}>{v.base}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{v.past}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{v.past_participle}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{v.meaning_ar}</td>
                <td className="px-3 py-2"><LevelBadge level={v.level} /></td>
                <td className="px-3 py-2">
                  {v.category && <Badge className="bg-rose-500/15 text-rose-400">{v.category}</Badge>}
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => onDelete(v.id)} className="p-1 rounded hover:bg-red-500/15 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Grammar Card (Accordion)
// ═══════════════════════════════════════════════════════════════
function GrammarCard({ item, expanded, onToggle, selected, onSelect, onDelete }) {
  return (
    <div className="fl-card-static rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={onToggle}>
        <button onClick={e => { e.stopPropagation(); onSelect() }} className="shrink-0">
          {selected ? <CheckSquare size={18} style={{ color: 'var(--accent-amber)' }} /> : <Square size={18} style={{ color: 'var(--text-tertiary)' }} />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title || item.unit_title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <LevelBadge level={item.level} />
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors">
          <Trash2 size={16} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={18} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-tertiary)' }} />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {/* Explanation */}
              {item.explanation && (
                <div className="pt-3">
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>الشرح</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{item.explanation}</p>
                </div>
              )}
              {/* Examples */}
              {Array.isArray(item.examples) && item.examples.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>أمثلة</h4>
                  <div className="space-y-2">
                    {item.examples.map((ex, i) => (
                      <div key={i} className="p-2.5 rounded-lg text-sm" style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}>
                        {typeof ex === 'string' ? ex : (
                          <>
                            <p className="font-medium" style={{ color: 'var(--accent-amber)' }}>{ex.english || ex.sentence}</p>
                            {ex.arabic && <p className="mt-1" style={{ color: 'var(--text-tertiary)' }}>{ex.arabic}</p>}
                            {ex.translation && <p className="mt-1" style={{ color: 'var(--text-tertiary)' }}>{ex.translation}</p>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Practice questions */}
              {Array.isArray(item.practice_questions) && item.practice_questions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>تمارين</h4>
                  {item.practice_questions.map((q, i) => (
                    <div key={i} className="p-3 rounded-lg mb-2" style={{ background: 'var(--surface-raised)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{toArabicNum(i + 1)}. {q.question || q.text}</p>
                      {q.answer && <p className="text-xs mt-1" style={{ color: 'var(--accent-emerald)' }}>الإجابة: {q.answer}</p>}
                      {Array.isArray(q.options) && (
                        <div className="grid grid-cols-2 gap-1 mt-1.5">
                          {q.options.map((opt, j) => (
                            <span key={j} className={`text-xs px-2 py-1 rounded ${opt === q.correct_answer || j === q.correct_index ? 'bg-emerald-500/20 text-emerald-400 font-bold' : ''}`}
                              style={opt !== q.correct_answer && j !== q.correct_index ? { color: 'var(--text-tertiary)' } : undefined}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Common mistakes */}
              {Array.isArray(item.common_mistakes) && item.common_mistakes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--accent-rose)' }}>
                    <AlertTriangle size={13} /> أخطاء شائعة
                  </h4>
                  <ul className="space-y-1.5">
                    {item.common_mistakes.map((m, i) => (
                      <li key={i} className="text-sm p-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.08)', color: 'var(--text-secondary)' }}>
                        {typeof m === 'string' ? m : (
                          <>
                            <span className="text-red-400 line-through">{m.wrong || m.incorrect}</span>
                            {' → '}
                            <span className="text-emerald-400">{m.correct || m.right}</span>
                            {m.explanation && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{m.explanation}</p>}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
