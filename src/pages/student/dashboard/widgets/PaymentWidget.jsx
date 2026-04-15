import { CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import GlassPanel from '../../../../design-system/components/GlassPanel'
import { formatDateAr } from '../../../../utils/dateHelpers'

export default function PaymentWidget({ payment }) {
  if (!payment) return null

  return (
    <GlassPanel padding="lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--ds-surface-2)' }}
          >
            <CreditCard size={18} strokeWidth={1.5} style={{ color: 'var(--ds-accent-gold, var(--ds-accent-warning))' }} />
          </div>
          <h3 className="text-[16px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
            الدفعة القادمة
          </h3>
        </div>
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{
            background: 'var(--ds-surface-2)',
            color: payment.status === 'overdue'
              ? 'var(--ds-accent-danger)'
              : 'var(--ds-accent-warning)',
          }}
        >
          {payment.status === 'overdue' ? 'متأخرة' : 'قيد الانتظار'}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-3">
        <p className="text-3xl font-bold font-data" style={{ color: 'var(--ds-text-primary)' }}>
          {payment.amount} ر.س
        </p>
        {payment.period_end && (
          <p className="text-[12px]" style={{ color: 'var(--ds-text-tertiary)' }}>
            حتى {formatDateAr(payment.period_end)}
          </p>
        )}
      </div>
      <Link
        to="/student/billing"
        className="text-[13px] font-medium mt-3 inline-block transition-colors min-h-[44px] flex items-center"
        style={{ color: 'var(--ds-accent-primary)' }}
      >
        عرض تفاصيل الفواتير
      </Link>
    </GlassPanel>
  )
}
