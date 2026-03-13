import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, Trash2, Users, Zap, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const CHALLENGE_TYPES = [
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'team', label: 'فريق' },
  { value: 'thirty_day', label: '30 يوم' },
  { value: 'trainer_custom', label: 'مخصص' },
  { value: 'social', label: 'اجتماعي' },
]

export default function TrainerChallenges() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedGroup, setSelectedGroup] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title_ar: '',
    description_ar: '',
    type: 'weekly',
    xp_reward: 50,
    target_count: 5,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  })
  const [toast, setToast] = useState(null)

  // Groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  useEffect(() => {
    if (groups?.length > 0 && !selectedGroup) setSelectedGroup(groups[0].id)
  }, [groups, selectedGroup])

  // Challenges
  const { data: challenges, isLoading } = useQuery({
    queryKey: ['trainer-challenges', selectedGroup],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .eq('group_id', selectedGroup)
        .order('start_date', { ascending: false })
      return data || []
    },
    enabled: !!selectedGroup,
  })

  // Participant counts
  const { data: participantCounts } = useQuery({
    queryKey: ['challenge-counts-trainer', selectedGroup],
    queryFn: async () => {
      const ids = (challenges || []).map(c => c.id)
      if (!ids.length) return {}
      const { data } = await supabase
        .from('challenge_participants')
        .select('challenge_id, completed')
        .in('challenge_id', ids)
      const counts = {}
      const completedMap = {}
      ;(data || []).forEach(p => {
        counts[p.challenge_id] = (counts[p.challenge_id] || 0) + 1
        if (p.completed) completedMap[p.challenge_id] = (completedMap[p.challenge_id] || 0) + 1
      })
      return { counts, completed: completedMap }
    },
    enabled: !!challenges?.length,
  })

  // Create challenge
  const createChallenge = useMutation({
    mutationFn: async () => {
      if (!form.title_ar.trim()) throw new Error('العنوان مطلوب')
      if (!form.end_date) throw new Error('تاريخ الانتهاء مطلوب')

      const { error } = await supabase.from('challenges').insert({
        title_ar: form.title_ar.trim(),
        description_ar: form.description_ar.trim(),
        type: form.type,
        xp_reward: form.xp_reward,
        target: { count: form.target_count },
        start_date: form.start_date,
        end_date: form.end_date,
        group_id: selectedGroup,
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setShowForm(false)
      setForm({ title_ar: '', description_ar: '', type: 'weekly', xp_reward: 50, target_count: 5, start_date: new Date().toISOString().split('T')[0], end_date: '' })
      queryClient.invalidateQueries({ queryKey: ['trainer-challenges'] })
      showToast('تم إنشاء التحدي بنجاح')
    },
    onError: (err) => showToast(err.message),
  })

  // Delete challenge
  const deleteChallenge = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('challenges').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-challenges'] })
      showToast('تم حذف التحدي')
    },
    onError: (err) => showToast('فشل الحذف: ' + (err.message || 'حاول مرة أخرى')),
  })

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function isActive(c) {
    const now = new Date()
    return new Date(c.start_date) <= now && new Date(c.end_date) >= now
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-sky-400" size={24} />
            إدارة التحديات
          </h1>
          <p className="text-muted text-sm mt-1">أنشئ تحديات لتحفيز الطلاب</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          <Plus size={16} /> تحدي جديد
        </button>
      </div>

      {/* Group selector */}
      {groups?.length > 1 && (
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="input-field py-2 px-3 text-sm w-auto"
        >
          {groups.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-5 space-y-4"
          >
            <h3 className="text-sm font-medium text-white">تحدي جديد</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted block mb-1">العنوان</label>
                <input
                  className="input-field text-sm"
                  placeholder="اقرأ ٥ مقالات هالأسبوع..."
                  value={form.title_ar}
                  onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">النوع</label>
                <select
                  className="input-field text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {CHALLENGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">الوصف</label>
              <textarea
                className="input-field text-sm resize-none h-20"
                placeholder="تفاصيل التحدي..."
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted block mb-1">مكافأة XP</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  value={form.xp_reward}
                  onChange={(e) => setForm({ ...form, xp_reward: parseInt(e.target.value) || 0 })}
                  min={0}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">الهدف (عدد)</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  value={form.target_count}
                  onChange={(e) => setForm({ ...form, target_count: parseInt(e.target.value) || 1 })}
                  min={1}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">تاريخ البدء</label>
                <input
                  type="date"
                  className="input-field text-sm"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  className="input-field text-sm"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-2 px-4">إلغاء</button>
              <button
                onClick={() => createChallenge.mutate()}
                disabled={createChallenge.isPending}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
              >
                {createChallenge.isPending && <Loader2 size={14} className="animate-spin" />}
                إنشاء التحدي
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge List */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && challenges && (
        <div className="space-y-3">
          {challenges.map((c, i) => {
            const active = isActive(c)
            const counts = participantCounts?.counts?.[c.id] || 0
            const completedCount = participantCounts?.completed?.[c.id] || 0

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card p-4 ${active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${active ? 'badge-green' : 'badge-yellow'}`}>
                        {active ? 'نشط' : 'منتهي'}
                      </span>
                      <span className="text-xs text-muted">
                        {CHALLENGE_TYPES.find(t => t.value === c.type)?.label || c.type}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1">{c.title_ar}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                      <span className="flex items-center gap-1"><Zap size={12} className="text-sky-400" /> {c.xp_reward} XP</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {counts} مشارك</span>
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> {completedCount} أكمل</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm('حذف التحدي?')) deleteChallenge.mutate(c.id) }}
                    className="text-muted hover:text-red-400 transition-colors p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            )
          })}

          {challenges.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Target size={48} className="text-muted mx-auto mb-3 opacity-30" />
              <p className="text-muted">لا توجد تحديات</p>
              <p className="text-xs text-muted mt-1">أنشئ تحدي جديد لتحفيز الطلاب</p>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-sky-500/20 border border-sky-500/30 text-sky-400 px-6 py-3 rounded-2xl text-sm font-medium z-50 backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
