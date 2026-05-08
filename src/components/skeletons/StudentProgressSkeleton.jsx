import { SkeletonCard, Skeleton } from '../gamification/Skeleton'

/**
 * Content-shaped skeleton for StudentProgress (ProgressDashboard).
 * Mirrors: title → 3-col hero stats → skill radar chart → area chart → peers.
 */
export default function StudentProgressSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Page title */}
      <div className="space-y-2">
        <Skeleton width={120} height={36} />
        <Skeleton width={280} height={18} />
      </div>

      {/* Hero stats — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard height={130} />
        <SkeletonCard height={130} />
        <SkeletonCard height={130} />
      </div>

      {/* Skill radar chart */}
      <SkeletonCard height={280} />

      {/* XP area chart */}
      <SkeletonCard height={200} />

      {/* Peers / leaderboard */}
      <SkeletonCard height={180} />
    </div>
  )
}
