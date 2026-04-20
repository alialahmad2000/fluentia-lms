import { UserRound } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import TrainerPresence from '@/design-system/components/masterclass/TrainerPresence'

export default function Trainer() {
  return (
    <PlaceholderPage
      icon={UserRound}
      eyebrow="YOUR TRAINER"
      headline="مدربك. في كل ركن."
      lines={[
        'د. علي + د. محمد موجودان.',
        'ملاحظات صوتية، تعليقات، حضور.',
        'لن تشعر أنك وحدك أبداً.',
      ]}
      phaseLabel="Phase 5 — Trainer Connection"
    >
      <div style={{ marginTop: 32, display: 'flex', gap: 'var(--space-6)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
          <TrainerPresence trainerName="د. علي" size="lg" hasUnread onClick={() => {}} />
          <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: "'Tajawal', sans-serif" }}>د. علي</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
          <TrainerPresence trainerName="د. محمد" size="lg" lastSeenMinutesAgo={5} onClick={() => {}} />
          <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: "'Tajawal', sans-serif" }}>د. محمد</span>
        </div>
      </div>
    </PlaceholderPage>
  )
}
