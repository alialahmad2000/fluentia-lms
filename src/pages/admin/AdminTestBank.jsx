import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Sparkles, Search, ChevronDown, ChevronUp, Trash2,
  Loader2, CheckCircle2, XCircle, ToggleLeft, ToggleRight,
  BookOpen, Languages, Headphones, PenTool, Filter, Grid3X3,
  ChevronLeft, ChevronRight, AlertTriangle, X, LayoutGrid, List,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

// ─── Constants ────────────────────────────────────────────────
const SKILLS = ['grammar', 'vocabulary', 'reading', 'listening']
const SKILL_LABELS = {
  grammar: 'قرامر',
  vocabulary: 'مفردات',
  reading: 'قراءة',
  listening: 'استماع',
}
const SKILL_ICONS = {
  grammar: PenTool,
  vocabulary: Languages,
  reading: BookOpen,
  listening: Headphones,
}
const SKILL_COLORS = {
  grammar: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30', accent: 'var(--accent-sky)' },
  vocabulary: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', accent: 'var(--accent-violet)' },
  reading: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', accent: 'var(--accent-emerald)' },
  listening: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', accent: 'var(--accent-gold)' },
}

const LEVELS = [1, 2, 3, 4, 5]
const LEVEL_CEFR = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1' }
const LEVEL_COLORS = {
  1: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
  2: { bg: 'bg-sky-500/15', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-400' },
  3: { bg: 'bg-violet-500/15', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-400' },
  4: { bg: 'bg-amber-500/15', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
  5: { bg: 'bg-rose-500/15', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-400' },
}

const DIFFICULTY_STYLES = {
  easy: { badge: 'bg-emerald-500/20 text-emerald-400', label: 'سهل' },
  medium: { badge: 'bg-yellow-500/20 text-yellow-400', label: 'متوسط' },
  hard: { badge: 'bg-red-500/20 text-red-400', label: 'صعب' },
}

const PAGE_SIZE = 20

function toArabicNum(n) {
  return String(n).replace(/\d/g, d => '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'[d])
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25 },
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export default function AdminTestBank() {
  const queryClient = useQueryClient()

  // ─── Generation state ──────────────────────────────────────
  const [genSkill, setGenSkill] = useState('grammar')
  const [genLevel, setGenLevel] = useState(3)
  const [genCount, setGenCount] = useState(10)
  const [toast, setToast] = useState(null)

  // ─── Browser state ─────────────────────────────────────────
  const [viewMode, setViewMode] = useState('banks') // 'banks' | 'list'
  const [filterSkill, setFilterSkill] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [expandedBank, setExpandedBank] = useState(null)

  // ─── Show toast helper ─────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ─── Fetch questions ───────────────────────────────────────
  const { data: questionsData, isLoading } = useQuery({
    queryKey: ['admin-test-questions', filterSkill, filterLevel, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from('test_questions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filterSkill) query = query.eq('skill', filterSkill)
      if (filterLevel) query = query.eq('level', parseInt(filterLevel))
      if (searchQuery) query = query.ilike('question_text', `%${searchQuery}%`)

      const { data, error, count } = await query
      if (error) throw error
      return { questions: data || [], totalCount: count || 0 }
    },
  })

  const questions = questionsData?.questions || []
  const totalCount = questionsData?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // ─── Fetch all questions for stats ─────────────────────────
  const { data: allStats = [] } = useQuery({
    queryKey: ['admin-test-questions-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_questions')
        .select('skill, level')
      if (error) throw error
      return data || []
    },
  })

  // ─── Fetch grouped bank data for preview cards ────────────
  const { data: bankData } = useQuery({
    queryKey: ['admin-test-banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_questions')
        .select('id, skill, level, difficulty, question_text, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      // Group by skill + level
      const banks = {}
      ;(data || []).forEach(q => {
        const key = `${q.skill}-${q.level}`
        if (!banks[key]) {
          banks[key] = { skill: q.skill, level: q.level, questions: [], difficulties: new Set() }
        }
        banks[key].questions.push(q)
        if (q.difficulty) banks[key].difficulties.add(q.difficulty)
      })
      return Object.values(banks).sort((a, b) => {
        if (a.skill !== b.skill) return SKILLS.indexOf(a.skill) - SKILLS.indexOf(b.skill)
        return a.level - b.level
      })
    },
    enabled: viewMode === 'banks',
  })

  // ─── Computed stats ────────────────────────────────────────
  const stats = useMemo(() => {
    const bySkill = {}
    const byLevel = {}
    const heatmap = {}

    SKILLS.forEach(s => {
      bySkill[s] = 0
      LEVELS.forEach(l => {
        heatmap[`${s}-${l}`] = 0
      })
    })
    LEVELS.forEach(l => { byLevel[l] = 0 })

    allStats.forEach(q => {
      if (q.skill && bySkill[q.skill] !== undefined) bySkill[q.skill]++
      if (q.level && byLevel[q.level] !== undefined) byLevel[q.level]++
      const key = `${q.skill}-${q.level}`
      if (heatmap[key] !== undefined) heatmap[key]++
    })

    const maxCount = Math.max(1, ...Object.values(heatmap))
    return { total: allStats.length, bySkill, byLevel, heatmap, maxCount }
  }, [allStats])

  // ─── AI Generate mutation ──────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeWithRetry(
        'generate-test-questions',
        { body: { skill: genSkill, level: genLevel, count: genCount } },
        { timeoutMs: 60000, retries: 1 }
      )
      if (error) throw new Error(error)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-test-questions'] })
      queryClient.invalidateQueries({ queryKey: ['admin-test-questions-stats'] })
      const count = data?.count || genCount
      showToast(`تم توليد ${toArabicNum(count)} سؤال بنجاح`, 'success')
    },
    onError: (err) => {
      showToast(err.message || 'فشل في توليد الأسئلة', 'error')
    },
  })

  // ─── Toggle active mutation ────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase
        .from('test_questions')
        .update({ is_active: !is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-test-questions'] })
    },
    onError: () => showToast('فشل في تحديث حالة السؤال', 'error'),
  })

  // ─── Delete mutation ───────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('test_questions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-test-questions'] })
      queryClient.invalidateQueries({ queryKey: ['admin-test-questions-stats'] })
      setDeleteId(null)
      showToast('تم حذف السؤال بنجاح', 'success')
    },
    onError: () => {
      showToast('فشل في حذف السؤال', 'error')
      setDeleteId(null)
    },
  })

  // ─── Reset page on filter change ──────────────────────────
  const handleFilterSkill = (s) => { setFilterSkill(s); setPage(0); setExpandedId(null) }
  const handleFilterLevel = (l) => { setFilterLevel(l); setPage(0); setExpandedId(null) }
  const handleSearch = (q) => { setSearchQuery(q); setPage(0); setExpandedId(null) }

  return (
    <div className="space-y-8 pb-8">
      {/* ─── Toast ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg border ${
              toast.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/15 border-red-500/30 text-red-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="mr-2 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-violet-500/20">
              <Database size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-page-title text-[var(--text-primary)]">بنك الأسئلة</h1>
              <p className="text-muted text-sm mt-0.5">
                إدارة الأسئلة وتوليد أسئلة جديدة بالذكاء الاصطناعي — {toArabicNum(stats.total)} سؤال
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Quick Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {SKILLS.map((skill, i) => {
          const Icon = SKILL_ICONS[skill]
          const colors = SKILL_COLORS[skill]
          return (
            <motion.div
              key={skill}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className={`rounded-xl ${colors.bg} border border-[var(--border-subtle)] p-4`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={14} className={colors.text} />
                <span className="text-xs text-muted font-medium">{SKILL_LABELS[skill]}</span>
              </div>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {toArabicNum(stats.bySkill[skill] || 0)}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* ─── AI Generation Panel ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fl-card-static rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-amber-400" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">توليد أسئلة بالذكاء الاصطناعي</h2>
        </div>

        {/* Skill selector */}
        <div>
          <label className="text-xs text-muted font-medium mb-2 block">المهارة</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(skill => {
              const Icon = SKILL_ICONS[skill]
              const active = genSkill === skill
              const colors = SKILL_COLORS[skill]
              return (
                <button
                  key={skill}
                  onClick={() => setGenSkill(skill)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    active
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                  }`}
                >
                  <Icon size={15} />
                  {SKILL_LABELS[skill]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Level selector */}
        <div>
          <label className="text-xs text-muted font-medium mb-2 block">المستوى</label>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map(level => {
              const active = genLevel === level
              const colors = LEVEL_COLORS[level]
              return (
                <button
                  key={level}
                  onClick={() => setGenLevel(level)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    active
                      ? `${colors.bg} ${colors.text} border-transparent`
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{toArabicNum(level)}</span>
                  <span className="text-xs opacity-70">({LEVEL_CEFR[level]})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Count + Generate */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-muted font-medium mb-2 block">عدد الأسئلة</label>
            <input
              type="number"
              min={1}
              max={20}
              value={genCount}
              onChange={e => setGenCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm text-center focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                جارٍ التوليد...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                توليد الأسئلة
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* ─── View Toggle ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('banks')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
            viewMode === 'banks'
              ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <LayoutGrid size={14} />
          بطاقات البنك
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
            viewMode === 'list'
              ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <List size={14} />
          قائمة الأسئلة
        </button>
      </div>

      {/* ─── Bank Preview Cards ──────────────────────────────────── */}
      {viewMode === 'banks' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(bankData || []).map((bank, idx) => {
            const SkillIcon = SKILL_ICONS[bank.skill] || PenTool
            const skillColor = SKILL_COLORS[bank.skill] || SKILL_COLORS.grammar
            const levelColor = LEVEL_COLORS[bank.level] || LEVEL_COLORS[1]
            const bankKey = `${bank.skill}-${bank.level}`
            const isExpanded = expandedBank === bankKey
            const difficulties = Array.from(bank.difficulties)
            const avgDifficulty = difficulties.length === 1 ? difficulties[0] : 'mixed'
            const diffStyle = DIFFICULTY_STYLES[avgDifficulty] || { badge: 'bg-violet-500/20 text-violet-400', label: 'متنوع' }
            const firstTwo = bank.questions.slice(0, 2)

            return (
              <motion.div
                key={bankKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden hover:border-violet-500/30 transition-colors"
                style={{ background: 'var(--surface-base)' }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl ${skillColor.bg} flex items-center justify-center`}>
                        <SkillIcon size={16} className={skillColor.text} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                          {SKILL_LABELS[bank.skill]} — {LEVEL_CEFR[bank.level]}
                        </h3>
                        <p className="text-xs text-muted">المستوى {toArabicNum(bank.level)}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColor.badge}`}>
                      {toArabicNum(bank.questions.length)} سؤال
                    </span>
                  </div>

                  {/* Difficulty pills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {difficulties.map(d => {
                      const ds = DIFFICULTY_STYLES[d] || DIFFICULTY_STYLES.medium
                      return (
                        <span key={d} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ds.badge}`}>
                          {ds.label}
                        </span>
                      )
                    })}
                  </div>

                  {/* Difficulty indicator */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      avgDifficulty === 'easy' ? 'bg-emerald-400'
                      : avgDifficulty === 'hard' ? 'bg-red-400'
                      : avgDifficulty === 'medium' ? 'bg-yellow-400'
                      : 'bg-violet-400'
                    }`} />
                    <span className="text-xs text-muted">{diffStyle.label}</span>
                  </div>
                </div>

                {/* Collapsible Preview */}
                <button
                  onClick={() => setExpandedBank(isExpanded ? null : bankKey)}
                  className="w-full px-5 py-3 flex items-center justify-between border-t border-[var(--border-subtle)] text-sm text-muted hover:bg-white/[0.02] transition-colors"
                >
                  <span>معاينة الأسئلة</span>
                  <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 space-y-2">
                        {firstTwo.map((q, i) => (
                          <div key={q.id} className="p-3 rounded-xl text-sm leading-relaxed" style={{ background: 'var(--surface-raised)' }}>
                            <span className="text-muted ml-2">{toArabicNum(i + 1)}.</span>
                            <span className="text-[var(--text-secondary)]">
                              {q.question_text?.length > 100 ? q.question_text.slice(0, 100) + '...' : q.question_text}
                            </span>
                          </div>
                        ))}
                        {bank.questions.length > 2 && (
                          <p className="text-xs text-muted text-center pt-1">
                            + {toArabicNum(bank.questions.length - 2)} سؤال آخر
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {(!bankData || bankData.length === 0) && (
            <div className="col-span-full fl-card-static rounded-xl p-12 text-center">
              <Database size={40} className="mx-auto text-[var(--text-tertiary)] mb-3" />
              <p className="text-[var(--text-secondary)] text-sm">لا توجد بنوك أسئلة</p>
              <p className="text-muted text-xs mt-1">ابدأ بتوليد أسئلة جديدة</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Main Content Grid ──────────────────────────────────── */}
      {viewMode === 'list' && (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ─── Questions Browser (3 cols) ─────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Filter bar */}
          <div className="fl-card-static rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Skill tabs */}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => handleFilterSkill('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !filterSkill
                      ? 'bg-[var(--accent-sky)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                >
                  الكل
                </button>
                {SKILLS.map(skill => (
                  <button
                    key={skill}
                    onClick={() => handleFilterSkill(skill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterSkill === skill
                        ? `${SKILL_COLORS[skill].bg} ${SKILL_COLORS[skill].text}`
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  >
                    {SKILL_LABELS[skill]}
                  </button>
                ))}
              </div>

              {/* Level filter */}
              <div className="relative">
                <select
                  value={filterLevel}
                  onChange={e => handleFilterLevel(e.target.value)}
                  className="appearance-none px-3 py-1.5 pe-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500/50 cursor-pointer"
                >
                  <option value="">كل المستويات</option>
                  {LEVELS.map(l => (
                    <option key={l} value={l}>المستوى {l} ({LEVEL_CEFR[l]})</option>
                  ))}
                </select>
                <Filter size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="بحث في الأسئلة..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full px-3 py-1.5 pe-3 ps-3 pr-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-xs placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
              </div>
            </div>
          </div>

          {/* Questions list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : questions.length === 0 ? (
            <div className="fl-card-static rounded-xl p-12 text-center">
              <Database size={40} className="mx-auto text-[var(--text-tertiary)] mb-3" />
              <p className="text-[var(--text-secondary)] text-sm">لا توجد أسئلة مطابقة</p>
              <p className="text-muted text-xs mt-1">جرّب تغيير معايير البحث أو توليد أسئلة جديدة</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    isExpanded={expandedId === q.id}
                    onToggleExpand={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    onToggleActive={() => toggleMutation.mutate({ id: q.id, is_active: q.is_active })}
                    onDelete={() => setDeleteId(q.id)}
                    isToggling={toggleMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <span className="text-xs text-muted font-medium">
                صفحة {toArabicNum(page + 1)} من {toArabicNum(totalPages)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ─── Stats Sidebar (1 col) ──────────────────────────── */}
        <div className="space-y-4">
          {/* Per-skill counts */}
          <div className="fl-card-static rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Grid3X3 size={14} className="text-violet-400" />
              إحصائيات المهارات
            </h3>
            {SKILLS.map(skill => {
              const Icon = SKILL_ICONS[skill]
              const count = stats.bySkill[skill] || 0
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0
              return (
                <div key={skill} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <Icon size={12} className={SKILL_COLORS[skill].text} />
                      {SKILL_LABELS[skill]}
                    </span>
                    <span className="text-muted">{toArabicNum(count)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: SKILL_COLORS[skill].accent,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Per-level counts */}
          <div className="fl-card-static rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">حسب المستوى</h3>
            {LEVELS.map(level => {
              const count = stats.byLevel[level] || 0
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${LEVEL_COLORS[level].badge}`}>
                    {LEVEL_CEFR[level]}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-sky)] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted w-8 text-start">{toArabicNum(count)}</span>
                </div>
              )
            })}
          </div>

          {/* Coverage heatmap */}
          <div className="fl-card-static rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">خريطة التغطية</h3>

            {/* Header row */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${LEVELS.length}, 1fr)` }}>
              <div />
              {LEVELS.map(l => (
                <div key={l} className="text-center text-[10px] text-muted font-medium">
                  {LEVEL_CEFR[l]}
                </div>
              ))}

              {/* Data rows */}
              {SKILLS.map(skill => (
                <>
                  <div key={`label-${skill}`} className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center">
                    {SKILL_LABELS[skill]}
                  </div>
                  {LEVELS.map(level => {
                    const count = stats.heatmap[`${skill}-${level}`] || 0
                    const intensity = count / stats.maxCount
                    return (
                      <div
                        key={`${skill}-${level}`}
                        className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold cursor-default"
                        style={{
                          backgroundColor: count === 0
                            ? 'rgba(255,255,255,0.03)'
                            : `rgba(139, 92, 246, ${0.15 + intensity * 0.55})`,
                          color: count === 0 ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.9)',
                        }}
                        title={`${SKILL_LABELS[skill]} - ${LEVEL_CEFR[level]}: ${count}`}
                      >
                        {count > 0 ? toArabicNum(count) : '—'}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ─── Delete Confirmation Modal ──────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="fl-card-static rounded-2xl p-6 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">تأكيد الحذف</h3>
                  <p className="text-xs text-muted mt-0.5">هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع.</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteId)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  حذف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Question Card Component
// ═══════════════════════════════════════════════════════════════
function QuestionCard({ question, index, isExpanded, onToggleExpand, onToggleActive, onDelete, isToggling }) {
  const q = question
  const skillColor = SKILL_COLORS[q.skill] || SKILL_COLORS.grammar
  const levelColor = LEVEL_COLORS[q.level] || LEVEL_COLORS[1]
  const difficulty = DIFFICULTY_STYLES[q.difficulty] || DIFFICULTY_STYLES.medium
  const SkillIcon = SKILL_ICONS[q.skill] || PenTool

  const truncatedText = q.question_text?.length > 120
    ? q.question_text.slice(0, 120) + '...'
    : q.question_text

  return (
    <motion.div
      layout
      {...fadeIn}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={`fl-card-static rounded-xl overflow-hidden border transition-colors ${
        q.is_active === false ? 'opacity-50 border-[var(--border-subtle)]' : 'border-[var(--border-subtle)]'
      }`}
    >
      {/* Main row */}
      <div
        className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {isExpanded ? q.question_text : truncatedText}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${skillColor.bg} ${skillColor.text}`}>
                <SkillIcon size={10} />
                {SKILL_LABELS[q.skill] || q.skill}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${levelColor.badge}`}>
                {LEVEL_CEFR[q.level] || q.level}
              </span>
              {q.difficulty && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${difficulty.badge}`}>
                  {difficulty.label}
                </span>
              )}
              {q.grammar_topic && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-[var(--text-tertiary)]">
                  {q.grammar_topic}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onToggleActive() }}
              disabled={isToggling}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              title={q.is_active === false ? 'تفعيل' : 'تعطيل'}
            >
              {q.is_active === false ? (
                <ToggleLeft size={18} className="text-[var(--text-tertiary)]" />
              ) : (
                <ToggleRight size={18} className="text-emerald-400" />
              )}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
              title="حذف"
            >
              <Trash2 size={15} />
            </button>
            <div className="p-1.5 text-[var(--text-tertiary)]">
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)] space-y-3">
              {/* Options */}
              {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted font-medium">الخيارات:</p>
                  <div className="grid gap-1.5">
                    {q.options.map((opt, i) => {
                      const isCorrect = q.correct_answer === opt || q.correct_answer === i || q.correct_answer === String(i)
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            isCorrect
                              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                              : 'bg-white/[0.02] border border-transparent text-[var(--text-secondary)]'
                          }`}
                        >
                          <span className="text-xs font-bold opacity-50">{String.fromCharCode(65 + i)}</span>
                          <span>{typeof opt === 'object' ? opt.text || JSON.stringify(opt) : opt}</span>
                          {isCorrect && <CheckCircle2 size={14} className="mr-auto text-emerald-400" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Correct answer (if not shown via options) */}
              {q.correct_answer && (!q.options || q.options.length === 0) && (
                <div>
                  <p className="text-xs text-muted font-medium mb-1">الإجابة الصحيحة:</p>
                  <p className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg inline-block">
                    {typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : q.correct_answer}
                  </p>
                </div>
              )}

              {/* Explanation */}
              {q.explanation && (
                <div>
                  <p className="text-xs text-muted font-medium mb-1">الشرح:</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-white/[0.02] px-3 py-2 rounded-lg">
                    {q.explanation}
                  </p>
                </div>
              )}

              {/* Explanation AR */}
              {q.explanation_ar && q.explanation_ar !== q.explanation && (
                <div>
                  <p className="text-xs text-muted font-medium mb-1">الشرح بالعربي:</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-white/[0.02] px-3 py-2 rounded-lg">
                    {q.explanation_ar}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
