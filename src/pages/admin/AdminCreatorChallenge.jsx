import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Plus, Eye, Zap, Trophy, CheckCircle2, XCircle, Clock, Send, Loader2,
  ExternalLink, Edit3, Trash2, Users, Star, ChevronDown, ChevronUp, Hash, Bell,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { toast as flToast } from '../../components/ui/FluentiaToast'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'مسودة', color: 'muted' },
  { value: 'active', label: 'نشط', color: 'emerald' },
  { value: 'judging', label: 'تحكيم', color: 'amber' },
  { value: 'completed', label: 'منتهي', color: 'sky' },
]

const PLATFORM_LABELS = {
  tiktok: { label: 'TikTok', icon: '🎵' },
  instagram: { label: 'Instagram', icon: '📸' },
  youtube: { label: 'YouTube', icon: '▶️' },
  snapchat: { label: 'Snapchat', icon: '👻' },
  x: { label: 'X', icon: '𝕏' },
  other: { label: 'Other', icon: '🔗' },
}

export default function AdminCreatorChallenge() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // Form state
  const [form, setForm] = useState({
    title_ar: '',
    description_ar: '',
    hashtag: '#FluentiaChallenege',
    rules_ar: '',
    xp_reward_participation: 30,
    xp_reward_1st: 200,
    xp_reward_2nd: 100,
    xp_reward_3rd: 50,
    min_duration_sec: 30,
    max_duration_sec: 120,
    start_date: '',
    end_date: '',
    judging_end_date: '',
    status: 'draft',
  })

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  // Fetch all challenges
  const { data: challenges, isLoading } = useQuery({
    queryKey: ['admin-creator-challenges'],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_challenges')
        .select('*')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  // Selected challenge for viewing submissions
  const [selectedChallengeId, setSelectedChallengeId] = useState(null)
  const selectedChallenge = challenges?.find(c => c.id === selectedChallengeId)

  // Fetch submissions for selected challenge
  const { data: submissions } = useQuery({
    queryKey: ['admin-creator-submissions', selectedChallengeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_submissions')
        .select('*, student:students(id, profiles(full_name, avatar_url))')
        .eq('challenge_id', selectedChallengeId)
        .order('submitted_at', { ascending: false })
      return data || []
    },
    enabled: !!selectedChallengeId,
  })

  // Create / Update challenge
  const saveCh = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        judging_end_date: form.judging_end_date ? new Date(form.judging_end_date).toISOString() : null,
        created_by: profile.id,
      }
      if (editingId) {
        const { error } = await supabase.from('creator_challenges').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('creator_challenges').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creator-challenges'] })
      flToast({ type: 'success', title: editingId ? 'تم التحديث' : 'تم إنشاء التحدي' })
      setShowCreate(false)
      setEditingId(null)
      resetForm()
    },
    onError: (err) => flToast({ type: 'error', title: err.message || 'حدث خطأ' }),
  })

  // Delete challenge
  const deleteCh = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('creator_challenges').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creator-challenges'] })
      flToast({ type: 'success', title: 'تم حذف التحدي' })
      if (selectedChallengeId === deleteCh.variables) setSelectedChallengeId(null)
    },
  })

  // Review submission (approve/reject)
  const reviewSub = useMutation({
    mutationFn: async ({ id, status, rejection_reason }) => {
      const { error } = await supabase
        .from('creator_submissions')
        .update({ status, rejection_reason: rejection_reason || null, reviewed_at: new Date().toISOString(), reviewed_by: profile.id })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creator-submissions'] })
      flToast({ type: 'success', title: 'تم تحديث حالة المشاركة' })
      setRejectId(null)
      setRejectReason('')
    },
  })

  // Update view count
  const updateViews = useMutation({
    mutationFn: async ({ id, view_count }) => {
      const { error } = await supabase.from('creator_submissions').update({ view_count }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-creator-submissions'] }),
  })

  // Update shows_platform flag
  const togglePlatform = useMutation({
    mutationFn: async ({ id, shows_platform }) => {
      const { error } = await supabase.from('creator_submissions').update({ shows_platform }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-creator-submissions'] }),
  })

  // Pick winners — set rank + award XP
  const pickWinner = useMutation({
    mutationFn: async ({ id, rank, studentId }) => {
      const xpMap = { 1: selectedChallenge?.xp_reward_1st || 200, 2: selectedChallenge?.xp_reward_2nd || 100, 3: selectedChallenge?.xp_reward_3rd || 50 }
      const xp = xpMap[rank] || 0

      // Update submission
      const { error: subErr } = await supabase
        .from('creator_submissions')
        .update({ rank, xp_awarded: xp })
        .eq('id', id)
      if (subErr) throw subErr

      // Award XP
      if (xp > 0) {
        await supabase.from('xp_transactions').insert({
          student_id: studentId,
          amount: xp,
          reason: 'challenge',
          description: `تحدي المبدعين — المركز ${rank}`,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creator-submissions'] })
      flToast({ type: 'success', title: 'تم تعيين الفائز وإضافة XP' })
    },
  })

  // Send reminder to all students
  const sendReminder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          target_roles: ['student'],
          title: 'تذكير: تحدي المبدعين!',
          body: `باقي ${getDaysLeft(selectedChallenge.end_date)} على نهاية التحدي — سوّ مقطعك الآن وشارك!`,
          url: '/student/creator-challenge',
          type: 'announcement',
          priority: 'high',
        },
      })
      if (error) throw error
    },
    onSuccess: () => flToast({ type: 'success', title: 'تم إرسال التذكير لجميع الطلاب' }),
    onError: () => flToast({ type: 'error', title: 'فشل الإرسال' }),
  })

  function getDaysLeft(endDate) {
    if (!endDate) return '—'
    const diff = new Date(endDate) - new Date()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'انتهى'
    return `${days} يوم`
  }

  function resetForm() {
    setForm({
      title_ar: '', description_ar: '', hashtag: '#FluentiaChallenege', rules_ar: '',
      xp_reward_participation: 30, xp_reward_1st: 200, xp_reward_2nd: 100, xp_reward_3rd: 50,
      min_duration_sec: 30, max_duration_sec: 120, start_date: '', end_date: '', judging_end_date: '', status: 'draft',
    })
  }

  function startEdit(ch) {
    setForm({
      title_ar: ch.title_ar || '',
      description_ar: ch.description_ar || '',
      hashtag: ch.hashtag || '#FluentiaChallenege',
      rules_ar: ch.rules_ar || '',
      xp_reward_participation: ch.xp_reward_participation || 30,
      xp_reward_1st: ch.xp_reward_1st || 200,
      xp_reward_2nd: ch.xp_reward_2nd || 100,
      xp_reward_3rd: ch.xp_reward_3rd || 50,
      min_duration_sec: ch.min_duration_sec || 30,
      max_duration_sec: ch.max_duration_sec || 120,
      start_date: ch.start_date ? ch.start_date.slice(0, 16) : '',
      end_date: ch.end_date ? ch.end_date.slice(0, 16) : '',
      judging_end_date: ch.judging_end_date ? ch.judging_end_date.slice(0, 16) : '',
      status: ch.status || 'draft',
    })
    setEditingId(ch.id)
    setShowCreate(true)
  }

  const approvedSubs = (submissions || []).filter(s => s.status === 'approved')
  const pendingSubs = (submissions || []).filter(s => s.status === 'pending')

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(168,85,247,0.15))' }}>
            <Video size={24} className="text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>تحدي المبدعين</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>إنشاء ومراجعة تحديات الفيديو</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowCreate(!showCreate) }}
          className="btn-primary flex items-center gap-2 text-sm py-2.5 px-4"
        >
          <Plus size={16} /> تحدي جديد
        </button>
      </motion.div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="fl-card-static p-5 space-y-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'تعديل التحدي' : 'إنشاء تحدي جديد'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>العنوان</label>
                  <input value={form.title_ar} onChange={e => updateField('title_ar', e.target.value)} placeholder="تحدي المبدعين — الموسم الأول"
                    className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>الوصف</label>
                  <textarea value={form.description_ar} onChange={e => updateField('description_ar', e.target.value)} rows={3} placeholder="وصف التحدي وشروطه..."
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>الهاشتاق</label>
                  <input value={form.hashtag} onChange={e => updateField('hashtag', e.target.value)} dir="ltr"
                    className="w-full px-3 py-2 rounded-xl text-xs font-['Inter']" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>الحالة</label>
                  <select value={form.status} onChange={e => updateField('status', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>تاريخ البدء</label>
                  <input type="datetime-local" value={form.start_date} onChange={e => updateField('start_date', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>تاريخ الانتهاء</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => updateField('end_date', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>انتهاء التحكيم</label>
                  <input type="datetime-local" value={form.judging_end_date} onChange={e => updateField('judging_end_date', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                </div>
              </div>

              {/* XP Rewards */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>جوائز XP</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'xp_reward_participation', label: 'مشاركة' },
                    { key: 'xp_reward_1st', label: '🥇 أول' },
                    { key: 'xp_reward_2nd', label: '🥈 ثاني' },
                    { key: 'xp_reward_3rd', label: '🥉 ثالث' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <span className="text-[10px] block mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                      <input type="number" value={form[key]} onChange={e => updateField(key, parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded-lg text-xs text-center" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => saveCh.mutate()} disabled={saveCh.isPending || !form.title_ar.trim()}
                  className="btn-primary flex items-center gap-2 text-sm py-2.5 px-6">
                  {saveCh.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {editingId ? 'حفظ التعديلات' : 'إنشاء'}
                </button>
                <button onClick={() => { setShowCreate(false); setEditingId(null) }}
                  className="px-4 py-2.5 rounded-xl text-sm" style={{ color: 'var(--text-tertiary)' }}>إلغاء</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenges List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(challenges || []).map(ch => {
            const isSelected = selectedChallengeId === ch.id
            const statusOpt = STATUS_OPTIONS.find(s => s.value === ch.status)

            return (
              <motion.div key={ch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div
                  className={`fl-card-static p-5 cursor-pointer transition-all ${isSelected ? 'ring-1 ring-sky-500/30' : ''}`}
                  onClick={() => setSelectedChallengeId(isSelected ? null : ch.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge-${statusOpt?.color === 'emerald' ? 'green' : statusOpt?.color === 'amber' ? 'gold' : 'blue'}`}>
                          {statusOpt?.label}
                        </span>
                        {ch.hashtag && <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{ch.hashtag}</span>}
                      </div>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{ch.title_ar}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <span><Clock size={10} className="inline ml-1" />{getDaysLeft(ch.end_date)}</span>
                        <span><Trophy size={10} className="inline ml-1" />{ch.xp_reward_1st} XP</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(ch) }}
                        className="p-2 rounded-lg hover:bg-[var(--surface-raised)]" style={{ color: 'var(--text-tertiary)' }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('حذف هذا التحدي؟')) deleteCh.mutate(ch.id) }}
                        className="p-2 rounded-lg hover:bg-[var(--surface-raised)]" style={{ color: 'var(--accent-rose)' }}>
                        <Trash2 size={14} />
                      </button>
                      {isSelected ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
                    </div>
                  </div>
                </div>

                {/* Expanded: Submissions */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-3">
                        {/* Quick actions */}
                        <div className="flex items-center gap-2">
                          <button onClick={() => sendReminder.mutate()} disabled={sendReminder.isPending || ch.status !== 'active'}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-sky)' }}>
                            <Bell size={12} /> تذكير الطلاب
                          </button>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {submissions?.length || 0} مشاركة ({pendingSubs.length} بانتظار المراجعة)
                          </span>
                        </div>

                        {/* Submissions table */}
                        {(submissions || []).length === 0 ? (
                          <div className="fl-card-static p-8 text-center">
                            <p className="text-muted text-sm">لا توجد مشاركات بعد</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(submissions || []).map(sub => {
                              const pf = PLATFORM_LABELS[sub.platform] || PLATFORM_LABELS.other
                              const studentName = sub.student?.profiles?.full_name || 'طالب'
                              const isPending = sub.status === 'pending'
                              const isApproved = sub.status === 'approved'
                              const isRejected = sub.status === 'rejected'

                              return (
                                <div key={sub.id} className="fl-card-static p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{studentName}</p>
                                        <span className={`badge-${isApproved ? 'green' : isRejected ? 'red' : 'gold'} text-[10px]`}>
                                          {isApproved ? 'مقبول' : isRejected ? 'مرفوض' : 'بانتظار'}
                                        </span>
                                        {sub.rank && <span className="badge-gold text-[10px]">المركز {sub.rank}</span>}
                                      </div>

                                      <a href={sub.video_url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--accent-sky)' }} dir="ltr">
                                        <ExternalLink size={10} /> {sub.video_url}
                                      </a>

                                      {sub.description && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{sub.description}</p>
                                      )}

                                      <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{pf.icon} {pf.label}</span>

                                        {/* View count (editable) */}
                                        <div className="flex items-center gap-1">
                                          <Eye size={10} style={{ color: 'var(--text-tertiary)' }} />
                                          <input
                                            type="number"
                                            value={sub.view_count || 0}
                                            onChange={e => updateViews.mutate({ id: sub.id, view_count: parseInt(e.target.value) || 0 })}
                                            onClick={e => e.stopPropagation()}
                                            className="w-20 px-1.5 py-0.5 rounded text-[10px] text-center"
                                            style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                                          />
                                        </div>

                                        {/* Shows platform toggle */}
                                        <label className="flex items-center gap-1 cursor-pointer" onClick={e => e.stopPropagation()}>
                                          <input
                                            type="checkbox"
                                            checked={sub.shows_platform || false}
                                            onChange={e => togglePlatform.mutate({ id: sub.id, shows_platform: e.target.checked })}
                                            className="accent-amber-500"
                                          />
                                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>يعرض المنصة</span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="shrink-0 flex flex-col gap-1.5">
                                      {isPending && (
                                        <>
                                          <button onClick={() => reviewSub.mutate({ id: sub.id, status: 'approved' })}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)' }}>
                                            <CheckCircle2 size={10} /> قبول
                                          </button>
                                          <button onClick={() => { setRejectId(sub.id); setRejectReason('') }}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)' }}>
                                            <XCircle size={10} /> رفض
                                          </button>
                                        </>
                                      )}
                                      {isApproved && !sub.rank && (
                                        <div className="flex gap-1">
                                          {[1, 2, 3].map(r => (
                                            <button key={r} onClick={() => pickWinner.mutate({ id: sub.id, rank: r, studentId: sub.student_id })}
                                              disabled={pickWinner.isPending}
                                              className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--accent-gold)' }}>
                                              {r === 1 ? '🥇' : r === 2 ? '🥈' : '🥉'}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reject reason input */}
                                  {rejectId === sub.id && (
                                    <div className="mt-3 flex items-center gap-2">
                                      <input
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        placeholder="سبب الرفض..."
                                        className="flex-1 px-3 py-2 rounded-lg text-xs"
                                        style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                                      />
                                      <button onClick={() => reviewSub.mutate({ id: sub.id, status: 'rejected', rejection_reason: rejectReason })}
                                        className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)' }}>
                                        رفض
                                      </button>
                                      <button onClick={() => setRejectId(null)} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>إلغاء</button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {(challenges || []).length === 0 && (
            <div className="fl-card-static p-12 text-center">
              <Video size={48} className="text-muted mx-auto mb-3 opacity-30" />
              <p className="text-muted">لا توجد تحديات بعد</p>
              <p className="text-xs text-muted mt-1">أنشئ أول تحدي للمبدعين</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
