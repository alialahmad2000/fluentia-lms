import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import ChapterTransition from '@/design-system/components/masterclass/ChapterTransition'

export default function Diagnostic() {
  const [showChapter, setShowChapter] = useState(false)

  return (
    <PlaceholderPage
      icon={Sparkles}
      eyebrow="THE DIAGNOSTIC"
      headline="الاختبار الأول طقس عبور، لا حكم."
      lines={[
        '٤ مهارات. ساعة. تشخيص حقيقي.',
        'لا تحضير. لا ضغط. فقط أنت واللغة.',
        'نبدأ من حيث أنت.',
      ]}
      phaseLabel="Phase 2 — Theatrical Diagnostic"
    >
      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => setShowChapter(true)}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'var(--ds-surface-2)',
            border: '1px solid var(--ds-border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--ds-text-primary)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Tajawal', sans-serif",
            cursor: 'pointer',
          }}
        >
          ← معاينة الانتقال بين الأقسام
        </button>
        {showChapter && (
          <ChapterTransition
            chapterNumber={1}
            chapterTitle="البداية"
            totalChapters={4}
            duration={4000}
            onComplete={() => setShowChapter(false)}
          />
        )}
      </div>
    </PlaceholderPage>
  )
}
