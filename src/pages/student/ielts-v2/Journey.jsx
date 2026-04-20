import { Map } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import JourneyTimeline from '@/design-system/components/masterclass/JourneyTimeline'

const STUB_WEEKS = Array.from({ length: 12 }, (_, i) => ({
  weekNumber: i + 1,
  title: ['التأسيس', 'القراءة', 'الاستماع', 'الكتابة', 'التحدث', 'المراجعة', 'المحاكاة', 'التحدي', 'الصقل', 'الثقة', 'الجاهزية', 'الاختبار'][i],
  status: i === 0 ? 'current' : 'future',
  milestone: i === 3 ? 'First Mock' : i === 7 ? 'Mid Mock' : undefined,
}))

export default function Journey() {
  return (
    <PlaceholderPage
      icon={Map}
      eyebrow="THE JOURNEY"
      headline="١٢ أسبوعاً. رحلة مُحسوبة."
      lines={[
        'كل أحد — أسبوع جديد يُكشف.',
        'تعرف أين أنت، إلى أين، وكم بقي.',
        'لا سباق. لا ضغط. إيقاع ثابت.',
      ]}
      phaseLabel="Phase 1 — Journey"
    >
      <div style={{ marginTop: 32 }}>
        <JourneyTimeline
          currentWeek={1}
          weeks={STUB_WEEKS}
          orientation="horizontal"
        />
      </div>
    </PlaceholderPage>
  )
}
