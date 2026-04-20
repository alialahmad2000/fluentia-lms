import { ShieldCheck } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import ExamCountdown from '@/design-system/components/masterclass/ExamCountdown'

const DAY_OF = new Date(Date.now() + 2 * 3600000).toISOString()

export default function Readiness() {
  return (
    <PlaceholderPage
      icon={ShieldCheck}
      eyebrow="EXAM WEEK"
      headline="الأسبوع ١٢. الجاهزية النهائية."
      lines={[
        'مراجعة شاملة، تهدئة، تثبيت.',
        'تمارين نفسية لليوم الحقيقي.',
        'وثقة تحمل معك إلى القاعة.',
      ]}
      phaseLabel="Phase 6 — Exam Readiness"
    >
      <div style={{ marginTop: 24 }}>
        <ExamCountdown
          examDate={DAY_OF}
          studentName="أحمد"
          examType="academic"
          onStartReadinessMode={() => {}}
        />
      </div>
    </PlaceholderPage>
  )
}
