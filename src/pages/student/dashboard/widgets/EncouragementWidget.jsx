import { Sparkles } from 'lucide-react'
import GlassPanel from '../../../../design-system/components/GlassPanel'

export default function EncouragementWidget({ encouragement }) {
  if (!encouragement) return null

  return (
    <GlassPanel padding="md">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--ds-surface-2)' }}
        >
          <Sparkles size={16} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
            {encouragement.motivation}
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
            {encouragement.tip}
          </p>
        </div>
      </div>
    </GlassPanel>
  )
}
