import { Mic } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'

export default function Speaking() {
  return (
    <PlaceholderPage
      icon={Mic}
      eyebrow="THE INTERVIEW ROOM"
      headline="غرفة المقابلة. تكلّم كأنك هناك."
      lines={[
        'الجزء ١، ٢، ٣ — كل أسبوع.',
        'ملاحظات المُمتحِن على كل جواب.',
        'لن ترى الدرجة وحدها — سترى كيف تنمو.',
      ]}
      phaseLabel="Phase 3 — Skill Labs"
    >
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <BandDisplay band={7.0} size="lg" label="المحادثة الهدف" animate />
      </div>
    </PlaceholderPage>
  )
}
