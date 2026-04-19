import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, AlertTriangle, Star, ArrowLeft } from 'lucide-react'
import { useInterventionPreview } from '@/hooks/trainer/useInterventionPreview'
import { CommandCard } from '@/design-system/trainer'
import InterventionModal from '../../interventions/InterventionModal'
import '../../interventions/InterventionModal.css'

function SeverityIcon({ severity }) {
  if (severity === 'urgent') return <AlertCircle size={14} className="tr-interv__sev tr-interv__sev--urgent" />
  if (severity === 'attention') return <AlertTriangle size={14} className="tr-interv__sev tr-interv__sev--attention" />
  return <Star size={14} className="tr-interv__sev tr-interv__sev--celebrate" />
}

function InterventionSkeleton() {
  return (
    <CommandCard className="tr-interv">
      <div className="tr-interv__header"><div className="tr-skel-line tr-skel-line--title" /></div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="tr-interv__row tr-interv__row--skel">
          <div className="tr-skel-line tr-skel-line--full" />
        </div>
      ))}
    </CommandCard>
  )
}

export default function InterventionPreview() {
  const { data: items = [], isLoading } = useInterventionPreview(3)
  const [selectedId, setSelectedId] = useState(null)

  if (isLoading) return <InterventionSkeleton />

  return (
    <>
      <CommandCard className="tr-interv">
        <div className="tr-interv__header">
          <h3 className="tr-display tr-interv__title">قائمة المتابعة</h3>
          {items.length > 0 && (
            <span className="tr-interv__count">{items.length}</span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="tr-interv__empty">
            <p>لا متابعات عاجلة الآن</p>
            <p className="tr-interv__empty-sub">نبيه ستُنبّهك عند ظهور إشارات</p>
          </div>
        ) : (
          <>
            <ul className="tr-interv__list" role="list">
              {items.map(item => (
                <li key={item.id} className={`tr-interv__row tr-interv__row--${item.severity}`}>
                  <button
                    className="tr-interv__row-inner"
                    onClick={() => setSelectedId(item.id)}
                    aria-label={`فتح تفاصيل ${item.student_name}`}
                  >
                    <SeverityIcon severity={item.severity} />
                    <span className="tr-interv__name">{item.student_name}</span>
                    <span className="tr-interv__reason">{item.reason_ar}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Link to="/trainer/interventions" className="tr-interv__link">
              عرض الكل
              <ArrowLeft size={12} aria-hidden="true" />
            </Link>
          </>
        )}
      </CommandCard>

      {selectedId && (
        <InterventionModal
          interventionId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
