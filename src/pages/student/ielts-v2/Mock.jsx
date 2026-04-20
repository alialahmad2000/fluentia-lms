import { Timer } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import ExamCountdown from '@/design-system/components/masterclass/ExamCountdown'

const FUTURE_DATE = new Date(Date.now() + 21 * 86400000).toISOString()

export default function Mock() {
  return (
    <PlaceholderPage
      icon={Timer}
      eyebrow="THE MOCK"
      headline="الاختبار التجريبي. بلا تنازل عن الواقع."
      lines={[
        '٤ ساعات. لا مقاطعات.',
        'طقس ما قبل الاختبار. لحظة الكشف.',
        'كما في اليوم الحقيقي.',
      ]}
      phaseLabel="Phase 4 — The Mock"
    >
      <div style={{ marginTop: 24 }}>
        <ExamCountdown
          examDate={FUTURE_DATE}
          studentName="أحمد"
          examType="academic"
        />
      </div>
    </PlaceholderPage>
  )
}
