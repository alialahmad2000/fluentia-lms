import '../../styles/vocab-constellation.css'
import ConstellationField from './ConstellationField'

// Low-end devices (most students are on iPhones; some on weak laptops) drop the
// ambient animation to keep the surface smooth.
const LOW_END =
  typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4

/**
 * The scoped "Constellation" world wrapper for every vocabulary surface.
 * Provides the indigo night-sky field + safe content padding (respects the
 * fixed mobile bottom nav + iOS safe-area so nothing is ever covered).
 */
export default function VocabShell({ children, maxWidth = 'max-w-3xl', className = '' }) {
  return (
    <div
      dir="rtl"
      className={`vocab-cosmos ${LOW_END ? 'vc-static' : ''} relative min-h-[100dvh] ${className}`}
      style={{
        background:
          'radial-gradient(130% 85% at 50% -10%, var(--vc-field), var(--vc-void) 72%)',
        marginInline: '-1rem',
        marginBlockStart: '-1.5rem',
      }}
    >
      <ConstellationField />
      <div
        className={`vc-content ${maxWidth} mx-auto px-4 pt-6`}
        style={{ paddingBottom: 'var(--mobile-bottom-clearance, 96px)' }}
      >
        {children}
      </div>
    </div>
  )
}
