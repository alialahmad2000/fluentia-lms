import { BookOpen } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import StrategyModule from '@/design-system/components/masterclass/StrategyModule'

const SAMPLE_SECTIONS = [
  {
    type: 'arabic_intro',
    title: 'ما هو Scanning؟',
    content: '**Scanning** هو البحث السريع عن معلومة محددة دون قراءة النص كاملاً.\n\nيُستخدم للإجابة عن أسئلة الأرقام والأسماء والتواريخ.',
    defaultOpen: true,
  },
  {
    type: 'strategic_approach',
    title: 'الخطوات',
    content: '- اقرأ السؤال أولاً\n- حدّد نوع المعلومة المطلوبة\n- حرّك عينك بسرعة على النص\n- توقف عند الكلمة المشابهة',
    collapsible: true,
    defaultOpen: false,
  },
]

export default function Reading() {
  return (
    <PlaceholderPage
      icon={BookOpen}
      eyebrow="THE STUDY"
      headline="غرفة الدراسة. هدوء. تركيز."
      lines={[
        '٣ قطع كل أسبوع.',
        'كل استراتيجية بفيديو قصير من مدربك.',
        'أخطاؤك تتحوّل إلى دروس.',
      ]}
      phaseLabel="Phase 3 — Skill Labs"
    >
      <div style={{ marginTop: 32 }}>
        <StrategyModule
          moduleId="scanning-preview"
          questionType="Scanning — مثال"
          sections={SAMPLE_SECTIONS}
        />
      </div>
    </PlaceholderPage>
  )
}
