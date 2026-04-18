import TrainerHeaderThemeButton from './TrainerHeaderThemeButton'

export default function TrainerHeader() {
  return (
    <header className="tr-header">
      <div className="tr-header__brand">
        <span className="tr-gold-dot" />
        <span className="tr-display">طلاقة</span>
      </div>
      <div className="tr-header__actions">
        <TrainerHeaderThemeButton />
      </div>
    </header>
  )
}
