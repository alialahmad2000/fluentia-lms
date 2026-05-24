// RetentionDisabledState — shown when a route is hit but the module is
// disabled for the calling student (retention_modules.enabled = false).
// Soft "coming soon" rather than 403/404, so students hitting a deep
// link from a notification don't get spooked.

import { Sparkles } from 'lucide-react'
import GlassPanel from '../components/GlassPanel.jsx'

export default function RetentionDisabledState({ moduleLabel = 'هذه الميزة' }) {
  return (
    <div dir="rtl" className="max-w-xl mx-auto py-12 px-4">
      <GlassPanel elevation={1} padding="xl" className="text-center">
        <div
          className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'color-mix(in srgb, var(--ds-accent-gold) 14%, transparent)',
            color: 'var(--ds-accent-gold)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Sparkles size={28} />
        </div>
        <h2
          className="text-xl md:text-2xl font-bold mb-2"
          style={{ color: 'var(--ds-text-primary)' }}
        >
          {moduleLabel} — قريباً جداً
        </h2>
        <p
          className="text-sm md:text-base leading-relaxed"
          style={{ color: 'var(--ds-text-secondary)' }}
        >
          نُعدّ هذه الميزة خصيصاً لكِ. سيتم تفعيلها بعد مراجعة فريق طلاقة لها.
          تابعي إشعاراتكِ — راح نخبركِ أول ما تكون جاهزة.
        </p>
      </GlassPanel>
    </div>
  )
}
