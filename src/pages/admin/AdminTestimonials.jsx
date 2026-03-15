import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquareQuote,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Star,
  Loader2,
  X,
  ArrowUpDown,
  Eye,
  EyeOff,
  Pencil,
  Save,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const EMPTY_FORM = {
  student_name: '',
  quote: '',
  rating: 5,
  level_from: 'A1',
  level_to: 'B1',
  is_approved: true,
  featured: false,
}

// ─── Star Picker ─────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110"
          aria-label={`${s} نجوم`}
        >
          <Star
            size={22}
            className={s <= value ? 'text-amber-400 fill-amber-400' : 'text-muted fill-[var(--surface-base)]'}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Star Display (read-only) ─────────────────────────────────────────────────
function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted fill-[var(--surface-base)]'}
        />
      ))}
    </div>
  )
}

// ─── Add / Edit Form Modal ────────────────────────────────────────────────────
function TestimonialForm({ initial = EMPTY_FORM, onSubmit, onClose, isLoading }) {
  const [form, setForm] = useState(initial)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.quote.trim()) return
    onSubmit(form)
  }

  const isEdit = !!initial.id

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,14,28,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.93, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 20 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="fl-card-static w-full max-w-lg p-6 space-y-5"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            {isEdit ? 'تعديل الشهادة' : 'إضافة شهادة جديدة'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Name */}
          <div>
            <label className="input-label block mb-1.5">اسم الطالب (أو مجهول)</label>
            <input
              type="text"
              value={form.student_name}
              onChange={(e) => set('student_name', e.target.value)}
              placeholder="سارة م."
              className="input-field"
            />
          </div>

          {/* Quote */}
          <div>
            <label className="input-label block mb-1.5">
              نص الشهادة <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.quote}
              onChange={(e) => set('quote', e.target.value)}
              placeholder="اكتب ما قاله الطالب عن تجربته..."
              rows={4}
              className="input-field resize-none"
              required
            />
          </div>

          {/* Rating */}
          <div>
            <label className="input-label block mb-1.5">التقييم</label>
            <StarPicker value={form.rating} onChange={(v) => set('rating', v)} />
          </div>

          {/* Levels */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label block mb-1.5">المستوى قبل</label>
              <select
                value={form.level_from}
                onChange={(e) => set('level_from', e.target.value)}
                className="input-field"
              >
                <option value="">— بدون —</option>
                {CEFR_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label block mb-1.5">المستوى بعد</label>
              <select
                value={form.level_to}
                onChange={(e) => set('level_to', e.target.value)}
                className="input-field"
              >
                <option value="">— بدون —</option>
                {CEFR_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => set('is_approved', !form.is_approved)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  form.is_approved ? 'bg-green-500' : 'bg-[var(--surface-raised)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                    form.is_approved ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </div>
              <span className="text-sm text-muted">معتمدة (ظاهرة للعموم)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => set('featured', !form.featured)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  form.featured ? 'bg-sky-500' : 'bg-[var(--surface-raised)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                    form.featured ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </div>
              <span className="text-sm text-muted">مميزة</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !form.quote.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {isEdit ? 'حفظ التعديلات' : 'إضافة الشهادة'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Testimonial Row ──────────────────────────────────────────────────────────
function TestimonialRow({ t, onToggleApprove, onToggleFeatured, onEdit, onDelete }) {
  const dateLabel = t.created_at
    ? new Date(t.created_at).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className={`fl-card p-4 flex flex-col sm:flex-row gap-4 ${
        !t.is_approved ? 'opacity-60' : ''
      }`}
    >
      {/* Quote content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)] text-sm">
            {t.student_name || 'مجهول'}
          </span>
          {t.level_from && t.level_to && (
            <span className="text-xs text-muted bg-[var(--surface-base)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
              {t.level_from} → {t.level_to}
            </span>
          )}
          {t.featured && (
            <span className="badge-blue text-xs px-2 py-0.5 rounded-full">
              مميزة
            </span>
          )}
          {!t.is_approved && (
            <span className="badge-yellow text-xs px-2 py-0.5 rounded-full">
              مخفية
            </span>
          )}
        </div>
        <p className="text-muted text-sm leading-relaxed line-clamp-2">
          "{t.quote}"
        </p>
        <div className="flex items-center gap-3">
          <StarDisplay rating={t.rating} />
          <span className="text-muted text-xs">{dateLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex sm:flex-col items-center gap-2 shrink-0">
        {/* Approve toggle */}
        <button
          onClick={() => onToggleApprove(t)}
          title={t.is_approved ? 'إخفاء' : 'اعتماد'}
          className={`p-2 rounded-xl transition-all duration-200 ${
            t.is_approved
              ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
              : 'bg-[var(--surface-base)] text-muted hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {t.is_approved ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        </button>

        {/* Featured toggle */}
        <button
          onClick={() => onToggleFeatured(t)}
          title={t.featured ? 'إلغاء التمييز' : 'تمييز'}
          className={`p-2 rounded-xl transition-all duration-200 ${
            t.featured
              ? 'bg-sky-500/15 text-sky-400 hover:bg-sky-500/25'
              : 'bg-[var(--surface-base)] text-muted hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {t.featured ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(t)}
          title="تعديل"
          className="p-2 rounded-xl bg-[var(--surface-base)] text-muted hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all duration-200"
        >
          <Pencil size={18} />
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(t.id)}
          title="حذف"
          className="p-2 rounded-xl bg-[var(--surface-base)] text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminTestimonials() {
  const queryClient = useQueryClient()

  const [sortBy, setSortBy] = useState('date')       // 'date' | 'rating'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'approved' | 'pending'
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Fetch ──
  const { data: testimonials, isLoading, error } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    retry: 1,
  })

  // ── Insert ──
  const insertMutation = useMutation({
    mutationFn: async (form) => {
      const { error } = await supabase.from('testimonials').insert({
        student_name: form.student_name || null,
        quote:        form.quote.trim(),
        rating:       form.rating,
        level_from:   form.level_from || null,
        level_to:     form.level_to   || null,
        is_approved:  form.is_approved,
        featured:     form.featured,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] })
      setShowForm(false)
    },
    onError: (err) => {
      console.error('Insert testimonial error:', err)
    },
  })

  // ── Update ──
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase
        .from('testimonials')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] })
      setEditItem(null)
    },
    onError: (err) => {
      console.error('Update testimonial error:', err)
    },
  })

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] })
      setDeleteConfirm(null)
    },
    onError: (err) => {
      console.error('Delete testimonial error:', err)
    },
  })

  // ── Derived list ──
  const filtered = (testimonials || [])
    .filter((t) => {
      if (filterStatus === 'approved') return t.is_approved
      if (filterStatus === 'pending')  return !t.is_approved
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const approvedCount = (testimonials || []).filter((t) => t.is_approved).length
  const avgRating = testimonials?.length
    ? (testimonials.reduce((s, t) => s + (t.rating || 0), 0) / testimonials.length).toFixed(1)
    : '—'

  // ── Handlers ──
  function handleToggleApprove(t) {
    updateMutation.mutate({ id: t.id, is_approved: !t.is_approved })
  }
  function handleToggleFeatured(t) {
    updateMutation.mutate({ id: t.id, featured: !t.featured })
  }
  function handleEdit(t) {
    setEditItem(t)
  }
  function handleDelete(id) {
    setDeleteConfirm(id)
  }
  function handleFormSubmit(form) {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...form })
    } else {
      insertMutation.mutate(form)
    }
  }

  const isMutating =
    insertMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="space-y-12 font-tajawal">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <MessageSquareQuote size={22} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-page-title text-[var(--text-primary)]">إدارة الشهادات</h1>
            <p className="text-sm text-muted">
              {testimonials?.length ?? '—'} شهادة &nbsp;·&nbsp; {approvedCount} معتمدة &nbsp;·&nbsp; متوسط {avgRating} ★
            </p>
          </div>
        </div>

        <button
          onClick={() => { setEditItem(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة شهادة
        </button>
      </div>

      {/* ── DB error notice ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fl-card-static border-amber-500/30 p-4 text-amber-300 text-sm"
        >
          <strong>ملاحظة:</strong> جدول <code>testimonials</code> غير موجود بعد في قاعدة البيانات.
          أنشئه أولاً ثم أعد تحميل الصفحة.
          <br />
          <span className="text-muted font-mono text-xs mt-1 block">
            CREATE TABLE testimonials (id uuid default gen_random_uuid() primary key,
            student_name text, quote text not null, rating int2 default 5, level_from text,
            level_to text, is_approved bool default true, featured bool default false,
            created_at timestamptz default now());
          </span>
        </motion.div>
      )}

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter */}
        <div className="flex gap-1 border border-[var(--border-subtle)] rounded-xl p-1" style={{ background: 'var(--surface-raised)' }}>
          {[
            { key: 'all',      label: 'الكل' },
            { key: 'approved', label: 'معتمدة' },
            { key: 'pending',  label: 'مخفية' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                filterStatus === key
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-muted hover:text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortBy((s) => (s === 'date' ? 'rating' : 'date'))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-muted bg-[var(--surface-base)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-all duration-200"
        >
          <ArrowUpDown size={14} />
          {sortBy === 'date' ? 'ترتيب: الأحدث' : 'ترتيب: الأعلى تقييماً'}
        </button>

        {isMutating && (
          <div className="flex items-center gap-2 text-sky-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            جاري الحفظ...
          </div>
        )}
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fl-card-static p-12 text-center text-muted space-y-2"
        >
          <MessageSquareQuote size={40} className="mx-auto text-muted opacity-30" />
          <p className="text-sm">لا توجد شهادات بعد</p>
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="text-sky-400 text-sm hover:underline"
          >
            أضف أول شهادة
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((t) => (
              <TestimonialRow
                key={t.id}
                t={t}
                onToggleApprove={handleToggleApprove}
                onToggleFeatured={handleToggleFeatured}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* ── Add/Edit Modal ── */}
      <AnimatePresence>
        {(showForm || editItem) && (
          <TestimonialForm
            key={editItem?.id ?? 'new'}
            initial={editItem ?? EMPTY_FORM}
            onSubmit={handleFormSubmit}
            onClose={() => { setShowForm(false); setEditItem(null) }}
            isLoading={insertMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(6,14,28,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="fl-card-static p-7 max-w-sm w-full space-y-5 text-center"
              dir="rtl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-bold text-lg">حذف الشهادة؟</h3>
                <p className="text-muted text-sm mt-1">
                  لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-ghost flex-1 py-2.5 rounded-xl transition-all duration-200 text-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  className="btn-danger flex-1 py-2.5 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
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
