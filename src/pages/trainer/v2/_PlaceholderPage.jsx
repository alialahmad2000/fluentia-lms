import { CommandCard } from '@/design-system/trainer'

export default function PlaceholderPage({ title, icon: Icon, phase, blurb }) {
  return (
    <div className="tr-placeholder">
      <CommandCard className="tr-placeholder__card">
        <div className="tr-placeholder__icon">
          <Icon size={32} aria-hidden="true" />
        </div>
        <h1 className="tr-display tr-placeholder__title">{title}</h1>
        <p className="tr-placeholder__blurb">{blurb}</p>
        <div className="tr-placeholder__phase">
          <span className="tr-gold-dot" aria-hidden="true" />
          <span>جاري البناء في {phase}</span>
        </div>
      </CommandCard>
    </div>
  )
}
