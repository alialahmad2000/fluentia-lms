import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { GlassPanel } from '../../design-system/components'
import { ClipboardCheck } from 'lucide-react'

export default function PlacementQueueWidget() {
  const navigate = useNavigate()

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['admin-placement-pending-count'],
    staleTime: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from('placement_results')
        .select('id', { count: 'exact', head: true })
        .eq('admin_action', 'pending')
      return count || 0
    },
  })

  if (pendingCount === 0) return null

  return (
    <GlassPanel hover className="cursor-pointer" onClick={() => navigate('/admin/placement-queue')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.25)',
            }}
          >
            <ClipboardCheck size={20} style={{ color: '#a855f7' }} />
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              اختبارات تحديد مستوى
            </p>
            <p className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              بانتظار المراجعة والتسكين
            </p>
          </div>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-sm font-bold"
          style={{
            background: 'rgba(168,85,247,0.2)',
            color: '#a855f7',
          }}
        >
          {pendingCount}
        </div>
      </div>
    </GlassPanel>
  )
}
