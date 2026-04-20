import { PenLine } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'

export default function Writing() {
  return (
    <PlaceholderPage
      icon={PenLine}
      eyebrow="THE WORKSHOP"
      headline="الورشة. حيث الكلمات تأخذ شكلها."
      lines={[
        'Task 1 + Task 2 مرّتين أسبوعياً.',
        'تقييم Claude + ملاحظات د. علي.',
        'Revision Mode يُظهر ما تطوّر.',
      ]}
      phaseLabel="Phase 3 — Skill Labs"
    >
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 'var(--space-6)' }}>
        <BandDisplay band={6.5} size="lg" label="الكتابة الحالية" animate />
        <BandDisplay band={7.5} size="lg" label="الهدف" />
      </div>
    </PlaceholderPage>
  )
}
