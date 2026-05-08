import { Skeleton, SkeletonCard } from '../gamification/Skeleton'

/**
 * Content-shaped skeleton for CurriculumBrowser.
 * Mirrors the real layout: cinematic-style dark background → title → subtitle →
 * stacked level cards (each ~260px tall, full-width).
 */
export default function CurriculumPageSkeleton() {
  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'Tajawal', sans-serif",
        minHeight: '100vh',
        position: 'relative',
        background: 'var(--surface-base, #0b0f18)',
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 900,
          margin: '0 auto',
          padding: '80px 24px',
        }}
        className="animate-pulse space-y-8"
      >
        {/* Title line */}
        <Skeleton width={260} height={48} style={{ borderRadius: 14 }} />

        {/* Subtitle */}
        <Skeleton width={340} height={20} style={{ borderRadius: 8 }} />

        {/* Level cards — each is a tall full-width card */}
        <div className="space-y-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 260,
                borderRadius: 20,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
