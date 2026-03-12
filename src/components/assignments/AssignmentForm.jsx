import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { X, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ASSIGNMENT_TYPES } from '../../lib/constants'

export default function AssignmentForm({ assignment, groups, trainerId, isAdmin, onClose }) {
  const queryClient = useQueryClient()
  const isEdit = !!assignment

  const [form, setForm] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    type: assignment?.type || 'reading',
    group_id: assignment?.group_id || groups[0]?.id || '',
    instructions: assignment?.instructions || '',
    youtube_url: assignment?.youtube_url || '',
    external_link: assignment?.external_link || '',
    deadline: assignment?.deadline ? new Date(assignment.deadline).toISOString().slice(0, 16) : '',
    points_on_time: assignment?.points_on_time ?? 10,
    points_late: assignment?.points_late ?? 5,
    allow_late: assignment?.allow_late ?? true,
    allow_resubmit: assignment?.allow_resubmit ?? true,
    is_visible: assignment?.is_visible ?? true,
  })

  const [error, setError] = useState('')

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      // For admin: use the selected group's trainer_id
      let resolvedTrainerId = trainerId
      if (isAdmin && form.group_id) {
        const selectedGroup = groups.find(g => g.id === form.group_id)
        if (selectedGroup?.trainer_id) {
          resolvedTrainerId = selectedGroup.trainer_id
        }
      }
      if (!resolvedTrainerId) throw new Error('لم يتم تحديد المدرب — أعد تسجيل الدخول')

      const payload = {
        trainer_id: resolvedTrainerId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        group_id: form.group_id,
        instructions: form.instructions.trim() || null,
        youtube_url: form.youtube_url.trim() || null,
        external_link: form.external_link.trim() || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        points_on_time: form.points_on_time,
        points_late: form.points_late,
        allow_late: form.allow_late,
        allow_resubmit: form.allow_resubmit,
        is_visible: form.is_visible,
      }

      if (isEdit) {
        const { data, error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', assignment.id)
          .select()
        if (error) throw new Error(error.message || JSON.stringify(error))
        return data
      } else {
        const { data, error } = await supabase
          .from('assignments')
          .insert(payload)
          .select()
        if (error) throw new Error(error.message || JSON.stringify(error))
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-assignments'] })
      onClose()
    },
    onError: (err) => {
      console.error('[AssignmentForm] Save failed:', err)
      setError(err.message || 'حصل خطأ — حاول مرة أخرى')
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('أدخل عنوان الواجب'); return }
    if (!form.group_id) { setError('اختر المجموعة'); return }
    saveMutation.mutate()
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed inset-x-4 top-[5vh] bottom-[5vh] lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl bg-navy-950 border border-border-subtle rounded-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? 'تعديل الواجب' : 'واجب جديد'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm text-muted mb-2">العنوان *</label>
            <input
              className="input-field"
              placeholder="مثال: واجب القراءة — الفصل الثالث"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </div>

          {/* Type + Group — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-2">النوع *</label>
              <select
                className="input-field"
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
              >
                {Object.entries(ASSIGNMENT_TYPES).map(([key, t]) => (
                  <option key={key} value={key}>{t.icon} {t.label_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-2">المجموعة *</label>
              <select
                className="input-field"
                value={form.group_id}
                onChange={(e) => update('group_id', e.target.value)}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-muted mb-2">الوصف</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              placeholder="وصف مختصر للواجب..."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm text-muted mb-2">تعليمات التسليم</label>
            <textarea
              className="input-field min-h-[60px] resize-y"
              placeholder="كيف يسلم الطالب الواجب..."
              value={form.instructions}
              onChange={(e) => update('instructions', e.target.value)}
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm text-muted mb-2">الموعد النهائي</label>
            <input
              type="datetime-local"
              className="input-field"
              value={form.deadline}
              onChange={(e) => update('deadline', e.target.value)}
              dir="ltr"
            />
          </div>

          {/* YouTube + External link */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-2">رابط يوتيوب</label>
              <input
                className="input-field"
                placeholder="https://youtube.com/..."
                value={form.youtube_url}
                onChange={(e) => update('youtube_url', e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-2">رابط خارجي</label>
              <input
                className="input-field"
                placeholder="https://..."
                value={form.external_link}
                onChange={(e) => update('external_link', e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          {/* Points */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-2">نقاط التسليم بالوقت</label>
              <input
                type="number"
                className="input-field"
                value={form.points_on_time}
                onChange={(e) => update('points_on_time', parseInt(e.target.value) || 0)}
                min={0}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-2">نقاط التسليم المتأخر</label>
              <input
                type="number"
                className="input-field"
                value={form.points_late}
                onChange={(e) => update('points_late', parseInt(e.target.value) || 0)}
                min={0}
                dir="ltr"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <ToggleField
              label="السماح بالتسليم المتأخر"
              checked={form.allow_late}
              onChange={(v) => update('allow_late', v)}
            />
            <ToggleField
              label="السماح بإعادة التسليم"
              checked={form.allow_resubmit}
              onChange={(v) => update('allow_resubmit', v)}
            />
            <ToggleField
              label="مرئي للطلاب"
              checked={form.is_visible}
              onChange={(v) => update('is_visible', v)}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm py-2">
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isEdit ? 'حفظ التعديلات' : 'إنشاء الواجب'}</span>
          </button>
        </div>
      </motion.div>
    </>
  )
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
          checked ? 'bg-sky-500' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
            checked ? 'right-0.5' : 'right-[22px]'
          }`}
        />
      </button>
      <span className="text-sm text-muted">{label}</span>
    </label>
  )
}
