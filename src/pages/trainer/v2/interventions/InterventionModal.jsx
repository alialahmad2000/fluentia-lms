import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { X, Copy, MessageCircle, Check, Clock, Loader, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import './InterventionModal.css'

const TABS = [
  { id: 'details',  label: 'تفاصيل' },
  { id: 'message',  label: 'رسالة' },
  { id: 'action',   label: 'اتخذ إجراء' },
]

function useInterventionDetail(interventionId, trainerId) {
  return useQuery({
    queryKey: ['intervention-detail', interventionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_intervention_detail', {
        p_id: interventionId,
        p_trainer_id: trainerId,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    enabled: !!interventionId && !!trainerId,
    staleTime: 30000,
  })
}

function useDraftMessage(interventionId, enabled) {
  return useQuery({
    queryKey: ['draft-message', interventionId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('draft-intervention-message', {
        body: { intervention_id: interventionId },
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'draft failed')
      return data.message
    },
    enabled: !!interventionId && enabled,
    staleTime: Infinity,
    retry: 1,
  })
}

function DetailsTab({ detail }) {
  if (!detail) return <div className="tr-modal__loading"><Loader size={20} /></div>
  const { student, group, intervention, recent_activity: activity = [] } = detail
  const idleHours = student?.last_active_at
    ? Math.round((Date.now() - new Date(student.last_active_at).getTime()) / 3600000)
    : null

  return (
    <div className="tr-modal__details">
      <div className="tr-modal__student-card">
        {student?.avatar_url && (
          <img className="tr-modal__avatar" src={student.avatar_url} alt={student.full_name} />
        )}
        <div>
          <div className="tr-modal__student-name">{student?.full_name}</div>
          <div className="tr-modal__student-meta">
            {group?.name && <span>{group.name}</span>}
            {student?.xp_total != null && <span>{student.xp_total.toLocaleString('ar')} XP</span>}
            {student?.current_streak > 0 && <span>🔥 {student.current_streak} يوم</span>}
          </div>
        </div>
      </div>

      <div className="tr-modal__signal-box">
        <div className="tr-modal__signal-label">الإشارة</div>
        <div className="tr-modal__signal-text">{intervention?.reason_ar}</div>
        {idleHours !== null && (
          <div className="tr-modal__idle">
            <Clock size={12} /> آخر نشاط: قبل {idleHours} ساعة
          </div>
        )}
      </div>

      <div className="tr-modal__suggestion-box">
        <div className="tr-modal__signal-label">الإجراء المقترح</div>
        <div className="tr-modal__signal-text">{intervention?.suggested_action_ar}</div>
      </div>

      {activity.length > 0 && (
        <div className="tr-modal__activity">
          <div className="tr-modal__signal-label">آخر نشاط</div>
          {activity.map((a, i) => (
            <div key={i} className="tr-modal__activity-row">
              <span className="tr-modal__activity-type">{a.activity_type}</span>
              {a.xp_earned > 0 && <span className="tr-modal__activity-xp">+{a.xp_earned} XP</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageTab({ interventionId, enabled }) {
  const { data: message, isLoading, error } = useDraftMessage(interventionId, enabled)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!message) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="tr-modal__message-tab">
      {isLoading && (
        <div className="tr-modal__draft-loading">
          <Loader size={20} className="tr-modal__spin" />
          <span>نبيه تصوغ رسالة مناسبة...</span>
        </div>
      )}
      {error && (
        <div className="tr-modal__draft-error">تعذّر توليد الرسالة — حاول مرة أخرى</div>
      )}
      {message && !isLoading && (
        <>
          <div className="tr-modal__draft-text" dir="rtl">{message}</div>
          <div className="tr-modal__draft-actions">
            <button className="tr-modal__copy-btn" onClick={handleCopy}>
              {copied ? <><Check size={14} /> تم النسخ</> : <><Copy size={14} /> نسخ</>}
            </button>
            <a
              className="tr-modal__wa-btn"
              href="https://web.whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} />
              افتح واتساب
            </a>
          </div>
          <p className="tr-modal__draft-hint">انسخ الرسالة ثم الصقها في محادثة الطالب على واتساب</p>
        </>
      )}
    </div>
  )
}

function ActionTab({ interventionId, onDone }) {
  const profile = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()
  const [xpGained, setXpGained] = useState(null)

  const actMutation = useMutation({
    mutationFn: async ({ action, notes, snoozeHours }) => {
      const { data, error } = await supabase.rpc('act_on_intervention', {
        p_intervention_id: interventionId,
        p_action: action,
        p_trainer_id: profile.id,
        p_notes: notes || null,
        p_snooze_hours: snoozeHours || 24,
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'action failed')
      return data
    },
    onSuccess: (data) => {
      if (data.xp_awarded) setXpGained(data.xp_awarded)
      queryClient.invalidateQueries({ queryKey: ['interventions-full'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-cockpit'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-sidebar-badges'] })
      setTimeout(() => onDone(), xpGained ? 1400 : 400)
    },
  })

  const isPending = actMutation.isPending

  if (xpGained) {
    return (
      <div className="tr-modal__xp-burst">
        <span className="tr-modal__xp-num">+{xpGained} XP</span>
        <span className="tr-modal__xp-label">أحسنت! تدخّل مكتمل ✓</span>
      </div>
    )
  }

  return (
    <div className="tr-modal__action-tab">
      <button
        className="tr-modal__action-btn tr-modal__action-btn--primary"
        onClick={() => actMutation.mutate({ action: 'acted', notes: 'تم التواصل عبر واتساب' })}
        disabled={isPending}
      >
        <MessageCircle size={16} />
        تم التواصل — إغلاق الإشارة
        <span className="tr-modal__action-xp">+٥-١٠ XP</span>
      </button>

      <button
        className="tr-modal__action-btn tr-modal__action-btn--snooze"
        onClick={() => actMutation.mutate({ action: 'snoozed', snoozeHours: 24 })}
        disabled={isPending}
      >
        <Clock size={16} />
        أجّل ٢٤ ساعة
      </button>

      <button
        className="tr-modal__action-btn tr-modal__action-btn--dismiss"
        onClick={() => actMutation.mutate({ action: 'dismissed' })}
        disabled={isPending}
      >
        تجاهل هذه الإشارة
      </button>

      {actMutation.isError && (
        <p className="tr-modal__action-error">حدث خطأ — حاول مرة أخرى</p>
      )}
    </div>
  )
}

export default function InterventionModal({ interventionId, onClose }) {
  const profile = useAuthStore((s) => s.profile)
  const [activeTab, setActiveTab] = useState('details')
  const { data: detail } = useInterventionDetail(interventionId, profile?.id)

  return (
    <motion.div
      className="tr-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="تفاصيل التدخل"
    >
      <motion.div
        className="tr-modal"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        dir="rtl"
      >
        <div className="tr-modal__topbar">
          <div className="tr-modal__student-header">
            <span className="tr-modal__student-label">
              {detail?.student?.full_name || '...'}
            </span>
            <span className={`tr-modal__severity tr-modal__severity--${detail?.intervention?.severity}`}>
              {detail?.intervention?.severity === 'urgent' ? 'عاجل'
                : detail?.intervention?.severity === 'celebrate' ? 'احتفال'
                : 'انتباه'}
            </span>
          </div>
          <button className="tr-modal__close" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="tr-modal__tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              className={`tr-modal__tab${activeTab === t.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tr-modal__body">
          {activeTab === 'details' && <DetailsTab detail={detail} />}
          {activeTab === 'message' && (
            <MessageTab interventionId={interventionId} enabled={activeTab === 'message'} />
          )}
          {activeTab === 'action' && (
            <ActionTab interventionId={interventionId} onDone={onClose} />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
