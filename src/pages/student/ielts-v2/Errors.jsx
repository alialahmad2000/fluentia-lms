import { Library } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import ErrorLesson from '@/design-system/components/masterclass/ErrorLesson'

export default function Errors() {
  return (
    <PlaceholderPage
      icon={Library}
      eyebrow="BANK OF LESSONS"
      headline="كل خطأ درس."
      lines={[
        'نجمع أخطاءك. نحوّلها دروساً.',
        'Recall prompts تأتيك في الوقت المناسب.',
        'تنسى أقل. تحفظ أكثر.',
      ]}
      phaseLabel="Phase 5 — Error Bank"
    >
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
        <ErrorLesson
          errorId="preview-1"
          questionText="The report showed that renewable energy usage had _____ significantly over the past decade."
          studentAnswer="raised"
          correctAnswer="risen"
          errorType="language"
          lessonAr="'Raise' فعل متعدٍّ يحتاج مفعولاً، أما 'Rise' فلازم. السياق هنا لا يوجد مفعول به."
          timesSeen={2}
          timesCorrect={0}
          onTryAgain={() => {}}
        />
      </div>
    </PlaceholderPage>
  )
}
