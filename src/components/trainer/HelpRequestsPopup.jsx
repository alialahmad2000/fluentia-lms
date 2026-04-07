import { motion } from 'framer-motion'
import { X, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const SECTION_LABELS = {
  reading: 'القراءة',
  reading_a: 'قراءة A',
  reading_b: 'قراءة B',
  grammar: 'القواعد',
  listening: 'الاستماع',
  vocabulary: 'المفردات',
  writing: 'الكتابة',
  speaking: 'المحادثة',
  assessment: 'التقييم',
}

export default function HelpRequestsPopup({ groupId, onClose }) {
  const queryClient = useQueryClient()

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['help-requests', groupId],
    queryFn: async () => {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)
      if (!students?.length) return []

      const studentIds = students.map(s => s.id)
      const { data } = await supabase
        .from('help_requests')
        .select('*, student:student_id(id, profiles(full_name, display_name))')
        .in('student_id', studentIds)
        .in('status', ['pending', 'seen'])
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!groupId,
    refetchInterval: 15000,
  })

  const resolveMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('help_requests').update({ status: 'resolved' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['help-requests', groupId] }),
  })

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'الآن'
    if (mins < 60) return `${mins} د`
    return `${Math.floor(mins / 60)} س`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-[72px] left-4 right-4 sm:left-auto sm:right-4 sm:w-[320px] z-[65] rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)', maxHeight: '60vh' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>❓</span> طلبات المساعدة
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(60vh - 56px)' }}>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-xs text-center py-6 font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
            لا توجد طلبات حالياً
          </p>
        ) : (
          requests.map(req => (
            <div
              key={req.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: req.status === 'pending' ? 'rgba(239,68,68,0.05)' : 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold font-['Tajawal'] truncate" style={{ color: 'var(--text-primary)' }}>
                  {req.student?.profiles?.full_name || req.student?.profiles?.display_name || 'طالب'}
                </p>
                <p className="text-[10px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
                  {SECTION_LABELS[req.section_type] || req.section_type} · {timeAgo(req.created_at)}
                </p>
              </div>
              <button
                onClick={() => resolveMutation.mutate(req.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-500/10 transition-colors flex-shrink-0"
                title="تم"
              >
                <CheckCircle size={16} className="text-emerald-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
