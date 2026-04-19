import { RefreshCw } from 'lucide-react'

export default function RegenerateButton({ onRegenerate, isPending }) {
  return (
    <button
      onClick={onRegenerate}
      disabled={isPending}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 12,
        background: isPending ? 'rgba(255,255,255,0.04)' : 'rgba(56,189,248,0.12)',
        color: isPending ? 'var(--text-tertiary)' : '#38bdf8',
        border: `1.5px solid ${isPending ? 'rgba(255,255,255,0.08)' : 'rgba(56,189,248,0.3)'}`,
        fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13,
        cursor: isPending ? 'default' : 'pointer',
      }}
    >
      <RefreshCw size={14} style={{ animation: isPending ? 'spin 1s linear infinite' : 'none' }} />
      {isPending ? 'جاري تحديث الخطة…' : 'تحديث الخطة'}
    </button>
  )
}
