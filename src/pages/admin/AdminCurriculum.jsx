import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Plus, Edit3, Trash2, Loader2, X, ChevronDown, ChevronUp,
  BookOpen, Clock, Target, Languages, ToggleLeft, ToggleRight,
  Hash, Layers, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Constants ────────────────────────────────────────────────
const LEVELS = [1, 2, 3, 4, 5]
const LEVEL_INFO = {
  1: { cefr: 'A1', name_ar: 'الخطوة الأولى', color: 'from-emerald-500/15 to-teal-500/5', iconColor: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
  2: { cefr: 'A2', name_ar: 'بداية الثقة', color: 'from-sky-500/15 to-cyan-500/5', iconColor: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-400' },
  3: { cefr: 'B1', name_ar: 'صار يتكلم', color: 'from-violet-500/15 to-purple-500/5', iconColor: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-400' },
  4: { cefr: 'B2', name_ar: 'ثقة كاملة', color: 'from-amber-500/15 to-yellow-500/5', iconColor: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
  5: { cefr: 'C1', name_ar: 'جاهز للعالم', color: 'from-rose-500/15 to-pink-500/5', iconColor: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-400' },
}

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
export default function AdminCurriculum() {
  const queryClient = useQueryClient()
  const [filterLevel, setFilterLevel] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editUnit, setEditUnit] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  // ─── Fetch curriculum units ───────────────────────────────
  const { data: units = [], isLoading } = useQuery({
    queryKey: ['admin-curriculum', filterLevel],
    queryFn: async () => {
      let query = supabase
        .from('curriculum_units')
        .select('*')
        .order('level', { ascending: true })
        .order('unit_number', { ascending: true })

      if (filterLevel) query = query.eq('level', parseInt(filterLevel))

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  // ─── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = units.length
    const active = units.filter(u => u.is_active).length
    const perLevel = LEVELS.reduce((acc, l) => {
      acc[l] = units.filter(u => u.level === l).length
      return acc
    }, {})
    return { total, active, perLevel }
  }, [units])

  // ─── Toggle active ───────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase
        .from('curriculum_units')
        .update({ is_active: !is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-curriculum'] })
    },
    onError: (err) => console.error('Toggle error:', err),
  })

  // ─── Save (create/update) ────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      const payload = {
        level: parseInt(formData.level),
        unit_number: parseInt(formData.unit_number),
        title_en: formData.title_en,
        title_ar: formData.title_ar,
        description_en: formData.description_en || null,
        description_ar: formData.description_ar || null,
        cefr: formData.cefr,
        estimated_weeks: parseInt(formData.estimated_weeks) || null,
        learning_objectives: formData.learning_objectives,
        grammar_topics: formData.grammar_topics,
        vocabulary_themes: formData.vocabulary_themes,
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(),
      }

      if (formData.id) {
        const { error } = await supabase
          .from('curriculum_units')
          .update(payload)
          .eq('id', formData.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('curriculum_units')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-curriculum'] })
      setShowModal(false)
      setEditUnit(null)
    },
    onError: (err) => console.error('Save error:', err),
  })

  // ─── Delete ───────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('curriculum_units').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-curriculum'] })
      setDeleteId(null)
    },
    onError: (err) => console.error('Delete error:', err),
  })

  function handleEdit(unit) {
    setEditUnit(unit)
    setShowModal(true)
  }

  function handleAdd() {
    setEditUnit(null)
    setShowModal(true)
  }

  return (
    <div className="space-y-8 pb-8">
      {/* ─── Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
              <GraduationCap size={20} className="text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">المنهج الدراسي</h1>
              <p className="text-muted text-sm mt-0.5">إدارة الوحدات الدراسية والمحتوى الأكاديمي</p>
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-medium hover:brightness-110 transition-all self-start sm:self-auto"
          >
            <Plus size={16} />
            إضافة وحدة
          </button>
        </div>
      </motion.div>

      {/* ─── Stats Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الوحدات', value: toArabicNum(stats.total), icon: Layers, gradient: 'from-sky-500/15 to-cyan-500/5', iconColor: 'text-sky-400' },
          { label: 'وحدات مفعّلة', value: toArabicNum(stats.active), icon: CheckCircle2, gradient: 'from-emerald-500/15 to-teal-500/5', iconColor: 'text-emerald-400' },
          ...LEVELS.slice(0, 2).map(l => ({
            label: `المستوى ${toArabicNum(l)} (${LEVEL_INFO[l].cefr})`,
            value: toArabicNum(stats.perLevel[l] || 0),
            icon: BookOpen,
            gradient: LEVEL_INFO[l].color,
            iconColor: LEVEL_INFO[l].iconColor,
          })),
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={`rounded-xl bg-gradient-to-br ${card.gradient} border border-[var(--border-subtle)] p-4`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <card.icon size={14} className={card.iconColor} />
              <span className="text-xs text-muted font-medium">{card.label}</span>
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ─── Level Filter Tabs ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 border-b border-[var(--border-subtle)] pb-0 overflow-x-auto"
      >
        <button
          onClick={() => setFilterLevel('')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
            filterLevel === ''
              ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border-b-2 border-primary'
              : 'text-muted hover:text-[var(--text-primary)] hover:bg-[var(--surface-base)]'
          }`}
        >
          الكل
        </button>
        {LEVELS.map(l => (
          <button
            key={l}
            onClick={() => setFilterLevel(String(l))}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              filterLevel === String(l)
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border-b-2 border-primary'
                : 'text-muted hover:text-[var(--text-primary)] hover:bg-[var(--surface-base)]'
            }`}
          >
            <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_INFO[l].badge}`}>{LEVEL_INFO[l].cefr}</span>
            المستوى {toArabicNum(l)}
          </button>
        ))}
      </motion.div>

      {/* ─── Units List ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      ) : units.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] p-14 text-center" style={{ background: 'var(--surface-base)' }}>
          <GraduationCap size={40} className="text-muted mx-auto mb-3 opacity-40" />
          <p className="text-muted text-sm">لا توجد وحدات دراسية بعد</p>
          <p className="text-muted text-xs mt-1 opacity-60">اضغط "إضافة وحدة" للبدء</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {units.map((unit, i) => {
              const info = LEVEL_INFO[unit.level] || LEVEL_INFO[1]
              const isExpanded = expandedId === unit.id

              return (
                <motion.div
                  key={unit.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-xl border transition-all ${
                    unit.is_active
                      ? 'border-[var(--border-subtle)]'
                      : 'border-[var(--border-subtle)] opacity-60'
                  }`}
                  style={{ background: 'var(--surface-raised)' }}
                >
                  {/* Card Header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : unit.id)}
                  >
                    {/* Unit number badge */}
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center shrink-0 ring-1 ring-[var(--border-subtle)]`}>
                      <span className={`text-sm font-bold ${info.iconColor}`}>{toArabicNum(unit.unit_number)}</span>
                    </div>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[var(--text-primary)] font-medium text-sm">{unit.title_ar || unit.title_en}</h3>
                        {!unit.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">معطّلة</span>
                        )}
                      </div>
                      {unit.title_en && unit.title_ar && (
                        <p className="text-muted text-xs mt-0.5" dir="ltr">{unit.title_en}</p>
                      )}
                    </div>

                    {/* CEFR badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${info.badge}`}>
                      {unit.cefr || info.cefr}
                    </span>

                    {/* Estimated weeks */}
                    {unit.estimated_weeks && (
                      <div className="flex items-center gap-1 text-muted text-xs shrink-0">
                        <Clock size={12} />
                        <span>{toArabicNum(unit.estimated_weeks)} أسابيع</span>
                      </div>
                    )}

                    {/* Expand chevron */}
                    <div className="text-muted shrink-0">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-[var(--border-subtle)]">
                          {/* Description */}
                          {(unit.description_ar || unit.description_en) && (
                            <div className="pt-3">
                              <p className="text-sm text-[var(--text-secondary)]">
                                {unit.description_ar || unit.description_en}
                              </p>
                              {unit.description_en && unit.description_ar && (
                                <p className="text-xs text-muted mt-1" dir="ltr">{unit.description_en}</p>
                              )}
                            </div>
                          )}

                          {/* Learning Objectives */}
                          {unit.learning_objectives?.length > 0 && (
                            <div className="pt-2">
                              <h4 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                                <Target size={12} className="text-sky-400" />
                                أهداف التعلم
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {unit.learning_objectives.map((obj, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/15"
                                  >
                                    {obj}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Grammar Topics */}
                          {unit.grammar_topics?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                                <BookOpen size={12} className="text-violet-400" />
                                مواضيع القواعد
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {unit.grammar_topics.map((topic, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/15"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Vocabulary Themes */}
                          {unit.vocabulary_themes?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                                <Languages size={12} className="text-amber-400" />
                                محاور المفردات
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {unit.vocabulary_themes.map((theme, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/15"
                                  >
                                    {theme}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(unit) }}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-all"
                            >
                              <Edit3 size={13} />
                              تعديل
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleMutation.mutate({ id: unit.id, is_active: unit.is_active })
                              }}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                                unit.is_active
                                  ? 'text-muted hover:text-amber-400 hover:bg-amber-500/10'
                                  : 'text-muted hover:text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              {unit.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                              {unit.is_active ? 'تعطيل' : 'تفعيل'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteId(unit.id) }}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={13} />
                              حذف
                            </button>
                            <div className="flex-1" />
                            <span className="text-[10px] text-muted opacity-50">
                              {unit.created_at && new Date(unit.created_at).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Add/Edit Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <UnitModal
            unit={editUnit}
            onClose={() => { setShowModal(false); setEditUnit(null) }}
            onSubmit={(data) => saveMutation.mutate(data)}
            isPending={saveMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation ─────────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            message="هل أنت متأكد من حذف هذه الوحدة الدراسية؟"
            onConfirm={() => deleteMutation.mutate(deleteId)}
            onCancel={() => setDeleteId(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Unit Modal (Add / Edit)
// ═══════════════════════════════════════════════════════════════
function UnitModal({ unit, onClose, onSubmit, isPending }) {
  const [level, setLevel] = useState(unit?.level || 1)
  const [unitNumber, setUnitNumber] = useState(unit?.unit_number || 1)
  const [titleAr, setTitleAr] = useState(unit?.title_ar || '')
  const [titleEn, setTitleEn] = useState(unit?.title_en || '')
  const [descAr, setDescAr] = useState(unit?.description_ar || '')
  const [descEn, setDescEn] = useState(unit?.description_en || '')
  const [cefr, setCefr] = useState(unit?.cefr || LEVEL_INFO[1].cefr)
  const [estimatedWeeks, setEstimatedWeeks] = useState(unit?.estimated_weeks || '')
  const [isActive, setIsActive] = useState(unit?.is_active ?? true)

  // JSONB array fields stored as comma-separated text for editing
  const [objectivesText, setObjectivesText] = useState(
    (unit?.learning_objectives || []).join('\n')
  )
  const [grammarText, setGrammarText] = useState(
    (unit?.grammar_topics || []).join('\n')
  )
  const [vocabText, setVocabText] = useState(
    (unit?.vocabulary_themes || []).join('\n')
  )

  function parseLines(text) {
    return text
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  }

  // Auto-set CEFR when level changes
  function handleLevelChange(val) {
    const l = parseInt(val)
    setLevel(l)
    setCefr(LEVEL_INFO[l]?.cefr || 'A1')
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      id: unit?.id,
      level,
      unit_number: unitNumber,
      title_ar: titleAr,
      title_en: titleEn,
      description_ar: descAr || null,
      description_en: descEn || null,
      cefr,
      estimated_weeks: estimatedWeeks || null,
      is_active: isActive,
      learning_objectives: parseLines(objectivesText),
      grammar_topics: parseLines(grammarText),
      vocabulary_themes: parseLines(vocabText),
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="fl-card-static p-7 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {unit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Level + Unit Number + CEFR */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="input-label block mb-1">المستوى</label>
              <select
                value={level}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="input-field w-full"
              >
                {LEVELS.map(l => (
                  <option key={l} value={l}>
                    {LEVEL_INFO[l].name_ar} ({l})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label block mb-1">رقم الوحدة</label>
              <input
                type="number"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="input-field w-full"
                dir="ltr"
                min="1"
                required
              />
            </div>
            <div>
              <label className="input-label block mb-1">CEFR</label>
              <select
                value={cefr}
                onChange={(e) => setCefr(e.target.value)}
                className="input-field w-full"
                dir="ltr"
              >
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Titles */}
          <div>
            <label className="input-label block mb-1">العنوان بالعربية</label>
            <input
              type="text"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="input-field w-full"
              required
            />
          </div>
          <div>
            <label className="input-label block mb-1">العنوان بالإنجليزية</label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="input-field w-full"
              dir="ltr"
            />
          </div>

          {/* Descriptions */}
          <div>
            <label className="input-label block mb-1">الوصف بالعربية</label>
            <textarea
              value={descAr}
              onChange={(e) => setDescAr(e.target.value)}
              className="input-field w-full resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="input-label block mb-1">الوصف بالإنجليزية</label>
            <textarea
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              className="input-field w-full resize-none"
              dir="ltr"
              rows={2}
            />
          </div>

          {/* Estimated Weeks + Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label block mb-1">عدد الأسابيع المقدّر</label>
              <input
                type="number"
                value={estimatedWeeks}
                onChange={(e) => setEstimatedWeeks(e.target.value)}
                className="input-field w-full"
                dir="ltr"
                min="1"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-sky-500 w-4 h-4"
                />
                <span className="input-label">مفعّلة</span>
              </label>
            </div>
          </div>

          {/* Learning Objectives */}
          <div>
            <label className="input-label block mb-1">
              أهداف التعلم
              <span className="text-muted text-[10px] font-normal mr-1">(سطر لكل هدف)</span>
            </label>
            <textarea
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
              className="input-field w-full resize-none"
              rows={3}
              placeholder="مثال: فهم الأزمنة الأساسية&#10;تكوين جمل بسيطة"
            />
          </div>

          {/* Grammar Topics */}
          <div>
            <label className="input-label block mb-1">
              مواضيع القواعد
              <span className="text-muted text-[10px] font-normal mr-1">(سطر لكل موضوع)</span>
            </label>
            <textarea
              value={grammarText}
              onChange={(e) => setGrammarText(e.target.value)}
              className="input-field w-full resize-none"
              rows={3}
              placeholder="مثال: Present Simple&#10;Past Simple"
            />
          </div>

          {/* Vocabulary Themes */}
          <div>
            <label className="input-label block mb-1">
              محاور المفردات
              <span className="text-muted text-[10px] font-normal mr-1">(سطر لكل محور)</span>
            </label>
            <textarea
              value={vocabText}
              onChange={(e) => setVocabText(e.target.value)}
              className="input-field w-full resize-none"
              rows={3}
              placeholder="مثال: الأسرة والعائلة&#10;الطعام والشراب"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending || !titleAr}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>{unit ? <Edit3 size={16} /> : <Plus size={16} />}</>
            )}
            {unit ? 'حفظ التعديلات' : 'إضافة الوحدة'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Confirm Modal
// ═══════════════════════════════════════════════════════════════
function ConfirmModal({ message, onConfirm, onCancel, isPending }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="fl-card-static p-7 w-full max-w-sm space-y-4 text-center"
      >
        <Trash2 className="mx-auto text-red-400" size={32} />
        <p className="text-[var(--text-primary)]">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="btn-ghost px-4 py-2 text-sm rounded-lg transition-all duration-200"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-danger px-4 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            حذف
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
