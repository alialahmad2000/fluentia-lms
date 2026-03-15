import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Moon, Sun, Plus, Edit3, Trash2, Clock, Loader2, X,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const EMPTY_HOLIDAY = { name: '', start_date: '', end_date: '', reschedule_info: '' }

function calcDays(start, end) {
  if (!start || !end) return 0
  const diff = new Date(end) - new Date(start)
  return Math.max(1, Math.ceil(diff / 86400000) + 1)
}

function isUpcoming(startDate) {
  return new Date(startDate) >= new Date(new Date().toISOString().split('T')[0])
}

export default function AdminHolidays() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState(null)
  const [form, setForm] = useState(EMPTY_HOLIDAY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ─── Ramadan Mode ────────────────────────────────────────────
  const { data: ramadanSetting, isLoading: ramadanLoading } = useQuery({
    queryKey: ['setting-ramadan-mode'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'ramadan_mode')
        .maybeSingle()
      if (data?.value) return data.value
      return { enabled: false, iftar_time: '19:30' }
    },
  })

  const ramadanMutation = useMutation({
    mutationFn: async (value) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'ramadan_mode', value }, { onConflict: 'key' })
        .select()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setting-ramadan-mode'] }),
    onError: (err) => {
      console.error('Ramadan setting error:', err)
    },
  })

  const ramadanEnabled = ramadanSetting?.enabled ?? false
  const iftarTime = ramadanSetting?.iftar_time ?? '19:30'

  function toggleRamadan() {
    ramadanMutation.mutate({ ...ramadanSetting, enabled: !ramadanEnabled })
  }

  function updateIftarTime(time) {
    ramadanMutation.mutate({ ...ramadanSetting, iftar_time: time })
  }

  // ─── Holidays ────────────────────────────────────────────────
  const { data: holidays, isLoading: holidaysLoading } = useQuery({
    queryKey: ['admin-holidays'],
    queryFn: async () => {
      const { data } = await supabase
        .from('holidays')
        .select('*')
        .order('start_date', { ascending: false })
      return data || []
    },
  })

  const addHolidayMutation = useMutation({
    mutationFn: async (holiday) => {
      const { error } = await supabase.from('holidays').insert({
        ...holiday,
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-holidays'] })
      closeModal()
    },
    onError: (err) => {
      console.error('Add holiday error:', err)
    },
  })

  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, ...holiday }) => {
      const { error } = await supabase.from('holidays').update(holiday).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-holidays'] })
      closeModal()
    },
    onError: (err) => {
      console.error('Update holiday error:', err)
    },
  })

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('holidays').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-holidays'] })
      setDeleteConfirm(null)
    },
    onError: (err) => {
      console.error('Delete holiday error:', err)
    },
  })

  function openAdd() {
    setEditingHoliday(null)
    setForm(EMPTY_HOLIDAY)
    setModalOpen(true)
  }

  function openEdit(holiday) {
    setEditingHoliday(holiday)
    setForm({
      name: holiday.name,
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      reschedule_info: holiday.reschedule_info || '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingHoliday(null)
    setForm(EMPTY_HOLIDAY)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (editingHoliday) {
      updateHolidayMutation.mutate({ id: editingHoliday.id, ...form })
    } else {
      addHolidayMutation.mutate(form)
    }
  }

  const isSaving = addHolidayMutation.isPending || updateHolidayMutation.isPending

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-page-title text-white flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Calendar size={20} className="text-sky-400" />
          </div>
          العطل والمناسبات
        </h1>
        <p className="text-muted text-sm mt-1">إدارة العطل الرسمية ووضع رمضان</p>
      </div>

      {/* ─── Ramadan Mode Card ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-7"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Moon size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>وضع رمضان</h2>
              <p className="text-muted text-xs">
                عند التفعيل، يتم تأخير التذكيرات إلى ما بعد الإفطار
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              ramadanEnabled
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/5 text-muted'
            }`}>
              {ramadanEnabled ? 'مفعّل' : 'غير مفعّل'}
            </span>

            <button
              onClick={toggleRamadan}
              disabled={ramadanMutation.isPending}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                ramadanEnabled ? 'bg-emerald-500' : 'bg-white/10'
              }`}
            >
              <motion.div
                layout
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                style={{ [ramadanEnabled ? 'right' : 'left']: '2px' }}
              />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {ramadanEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                <Clock size={16} className="text-amber-400" />
                <label className="text-sm text-muted">وقت الإفطار:</label>
                <input
                  type="time"
                  value={iftarTime}
                  onChange={(e) => updateIftarTime(e.target.value)}
                  className="input-field w-32 text-center text-sm"
                />
                <span className="text-xs text-muted">
                  التذكيرات ستُرسل بعد {iftarTime}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Holiday Calendar Section ───────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-section-title flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Sun size={18} className="text-sky-400" />
          العطل الرسمية
        </h2>
        <button onClick={openAdd} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} />
          إضافة عطلة
        </button>
      </div>

      {holidaysLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
      ) : holidays?.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Calendar size={40} className="text-muted mx-auto mb-3 opacity-30" />
          <p className="text-muted text-sm">لا توجد عطل مسجلة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {holidays.map((holiday, i) => {
            const upcoming = isUpcoming(holiday.start_date)
            const duration = calcDays(holiday.start_date, holiday.end_date)

            return (
              <motion.div
                key={holiday.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-bold text-white">{holiday.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        upcoming
                          ? 'badge-green'
                          : 'badge-muted'
                      }`}>
                        {upcoming ? 'قادمة' : 'منتهية'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {holiday.start_date}
                      </span>
                      <span>→</span>
                      <span>{holiday.end_date}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {duration} يوم
                      </span>
                    </div>

                    {holiday.reschedule_info && (
                      <p className="text-xs text-muted mt-2 rounded-lg p-2" style={{ background: 'var(--color-bg-surface-raised)' }}>
                        {holiday.reschedule_info}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mr-3">
                    <button
                      onClick={() => openEdit(holiday)}
                      className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>

                    {deleteConfirm === holiday.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                          className="btn-danger text-xs px-2 py-1"
                          disabled={deleteHolidayMutation.isPending}
                        >
                          {deleteHolidayMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'تأكيد'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-muted px-2 py-1 hover:text-white"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(holiday.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ─── Add / Edit Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">
                  {editingHoliday ? 'تعديل العطلة' : 'إضافة عطلة جديدة'}
                </h3>
                <button onClick={closeModal} className="text-muted hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="input-label block mb-1">اسم العطلة</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field w-full"
                    placeholder="مثال: عيد الفطر"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label block mb-1">تاريخ البداية</label>
                    <input
                      type="date"
                      required
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="input-label block mb-1">تاريخ النهاية</label>
                    <input
                      type="date"
                      required
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                {form.start_date && form.end_date && (
                  <p className="text-xs text-sky-400">
                    المدة: {calcDays(form.start_date, form.end_date)} يوم
                  </p>
                )}

                <div>
                  <label className="input-label block mb-1">معلومات إعادة الجدولة</label>
                  <textarea
                    value={form.reschedule_info}
                    onChange={(e) => setForm({ ...form, reschedule_info: e.target.value })}
                    className="input-field w-full min-h-[80px] resize-none"
                    placeholder="مثال: سيتم تعويض الحصص في الأسبوع التالي"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 size={14} className="animate-spin" />}
                    {editingHoliday ? 'حفظ التعديلات' : 'إضافة العطلة'}
                  </button>
                  <button type="button" onClick={closeModal} className="btn-ghost px-4">
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
