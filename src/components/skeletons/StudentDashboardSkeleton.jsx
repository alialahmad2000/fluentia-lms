import { SkeletonCard, Skeleton } from '../gamification/Skeleton'

/**
 * Content-shaped skeleton for StudentDashboard.
 * Mirrors the real widget order: hero → daily progress → weekly progress →
 * weekly tasks → streak+team (2-col) → next class → quick access grid.
 */
export default function StudentDashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Hero block */}
      <SkeletonCard height={180} />

      {/* Daily progress */}
      <SkeletonCard height={100} />

      {/* Weekly progress */}
      <SkeletonCard height={100} />

      {/* Weekly tasks list */}
      <SkeletonCard height={220} />

      {/* Streak + Team — 2-col on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonCard height={120} />
        <SkeletonCard height={120} />
      </div>

      {/* Next class */}
      <SkeletonCard height={88} />

      {/* Quick access grid — 4 items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} height={96} />
        ))}
      </div>
    </div>
  )
}
