import { useState } from 'react'
import { Headphones } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import ChapterTransition from '@/design-system/components/masterclass/ChapterTransition'

export default function Listening() {
  const [showChapter, setShowChapter] = useState(false)

  return (
    <PlaceholderPage
      icon={Headphones}
      eyebrow="THE THEATER"
      headline="المسرح. استمع بعمق."
      lines={[
        '٤ أقسام. كل صوت له قصة.',
        'تتحدث معك كأنك هناك.',
        'من الحوار البسيط إلى المحاضرة الأكاديمية.',
      ]}
      phaseLabel="Phase 3 — Skill Labs"
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
          ← معاينة انتقال قسم الاستماع
        </button>
        {showChapter && (
          <ChapterTransition
            chapterNumber={2}
            chapterTitle="الاستماع"
            totalChapters={4}
            duration={4000}
            onComplete={() => setShowChapter(false)}
          />
        )}
      </div>
    </PlaceholderPage>
  )
}
