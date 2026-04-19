import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import './InterventionsHistoryCard.css'

const SEV_CONFIG = {
  high:   { cls: 'ih-sev--high',   label: 'عالية' },
  medium: { cls: 'ih-sev--medium', label: 'متوسطة' },
  low:    { cls: 'ih-sev--low',    label: 'منخفضة' },
}

const STATUS_LABEL = {
  pending:  'مفتوح',
  resolved: 'محلول',
  ignored:  'متجاهل',
}

function useInterventions(studentId) {
  return useQuery({
    queryKey: ['student360-interventions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_interventions')
        .select('id, reason_code, reason_ar, severity, status, suggested_action_ar, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data || []
    },
    enabled: !!studentId,
    staleTime: 30_000,
  })
}

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export default function InterventionsHistoryCard({ studentId }) {
  const { data: items, isLoading } = useInterventions(studentId)

  return (
    <div className="ih-card">
      <h3 className="ih-title">سجل التدخلات</h3>

      {isLoading ? (
        <div className="ih-skeleton-list">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="ih-skeleton" />)}
        </div>
      ) : !items?.length ? (
        <p className="ih-empty">لا توجد تدخلات مسجّلة</p>
      ) : (
        <ul className="ih-list">
          {items.map(iv => {
            const sev = SEV_CONFIG[iv.severity] || SEV_CONFIG.low
            return (
              <li key={iv.id} className={`ih-item ${iv.status === 'pending' ? 'ih-item--open' : ''}`}>
                <div className="ih-item-header">
                  <span className={`ih-sev ${sev.cls}`}>{sev.label}</span>
                  <span className="ih-reason">{iv.reason_ar}</span>
                  <span className="ih-status">{STATUS_LABEL[iv.status] || iv.status}</span>
                  <span className="ih-age">{daysSince(iv.created_at)} يوم</span>
                </div>
                {iv.suggested_action_ar && (
                  <p className="ih-action">{iv.suggested_action_ar}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
