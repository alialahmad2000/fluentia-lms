import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Undo2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import useClassMode from '../../stores/classModeStore'
import { sounds } from '../../lib/celebrations'

const QUICK_REASONS = [
  { reason: 'correct_answer', label: 'إجابة صحيحة', amount: 5 },
  { reason: 'helped_peer', label: 'ساعد زميل', amount: 10 },
  { reason: 'shared_summary', label: 'مشاركة ممتازة', amount: 10 },
]

const PENALTY_REASONS = [
  { reason: 'penalty_unknown_word', label: 'ما عرف الكلمة', amount: -5 },
  { reason: 'penalty_pronunciation', label: 'ما عرف النطق', amount: -5 },
]

export default function QuickPointsPopup({ groupId, onClose }) {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const addPointRecord = useClassMode(s => s.addPointRecord)
  const [lastAction, setLastAction] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, profiles(full_name, display_name)')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date')
      return data || []
    },
    enabled: !!groupId,
  })

  const getName = (s) => s.profiles?.full_name || s.profiles?.display_name || 'طالب'

  const awardMutation = useMutation({
    mutationFn: async ({ studentId, amount, reason }) => {
      const { data, error } = await supabase.from('xp_transactions').insert({
        student_id: studentId,
        amount,
        reason,
        awarded_by: profile?.id,
      }).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (data, variables) => {
      const record = { id: data.id, ...variables }
      setLastAction(record)
      addPointRecord(record)
      queryClient.invalidateQueries({ queryKey: ['group-students'] })
      const sign = variables.amount > 0 ? '+' : ''
      setFeedback(`${sign}${variables.amount} XP → ${variables.studentName}`)
      setTimeout(() => setFeedback(null), 3000)
      try { variables.amount > 0 ? sounds.xpGain() : null } catch {}
    },
  })

  const undoMutation = useMutation({
    mutationFn: async () => {
      if (!lastAction) return
      await supabase.from('xp_transactions').delete().eq('id', lastAction.id)
    },
    onSuccess: () => {
      setLastAction(null)
      setFeedback('تم التراجع')
      queryClient.invalidateQueries({ queryKey: ['group-students'] })
      setTimeout(() => setFeedback(null), 2000)
    },
  })

  function handleAward(student, amount, reason) {
    awardMutation.mutate({ studentId: student.id, studentName: getName(student), amount, reason })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-[72px] left-4 right-4 sm:left-auto sm:right-4 sm:w-[340px] z-[65] rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)', maxHeight: '60vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>🎯</span> نقاط سريعة
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Students list */}
      <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(60vh - 100px)' }}>
        {students?.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center gap-2 p-2.5 rounded-xl"
            style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${i % 2 === 0 ? 'bg-sky-400' : 'bg-amber-400'}`} />
            <span className="text-[13px] font-bold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
              {getName(s)}
            </span>
            <div className="flex items-center gap-1.5">
              {QUICK_REASONS.map(r => (
                <button
                  key={r.reason}
                  onClick={() => handleAward(s, r.amount, r.reason)}
                  disabled={awardMutation.isPending}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold transition-colors hover:brightness-125"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#34d399', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  +{r.amount}
                </button>
              ))}
              <button
                onClick={() => handleAward(s, -5, 'penalty_unknown_word')}
                disabled={awardMutation.isPending}
                className="px-2 py-1 rounded-lg text-[11px] font-bold transition-colors hover:brightness-125"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                -5
              </button>
            </div>
          </div>
        ))}
        {!students?.length && (
          <p className="text-center text-xs py-4" style={{ color: 'var(--text-tertiary)' }}>لا يوجد طلاب</p>
        )}
      </div>

      {/* Footer: last action + undo */}
      {(feedback || lastAction) && (
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {feedback || ''}
          </span>
          {lastAction && (
            <button
              onClick={() => undoMutation.mutate()}
              disabled={undoMutation.isPending}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Undo2 size={12} /> تراجع
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
