import './GoldAccent.css'

export default function GoldAccent({ variant = 'line' }) {
  if (variant === 'line') {
    return <hr className="tr-divider-gold" aria-hidden="true" />
  }
  if (variant === 'dot') {
    return <span className="tr-gold-dot" aria-hidden="true" />
  }
  return null
}
