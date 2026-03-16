import { SkeletonCard, SkeletonRow, Skeleton } from '../gamification/Skeleton'

/**
 * Full-page skeleton for dashboard-like pages.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Hero */}
      <SkeletonCard height={140} />
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} height={120} />)}
      </div>
      {/* Content blocks */}
      <div className="grid lg:grid-cols-2 gap-5">
        <SkeletonCard height={200} />
        <SkeletonCard height={200} />
      </div>
    </div>
  )
}

/**
 * List-page skeleton (assignments, grades, etc.).
 */
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <Skeleton width={200} height={28} />
        <Skeleton width={120} height={36} style={{ borderRadius: 'var(--radius-lg)' }} />
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2">
        {[1, 2, 3].map(i => <Skeleton key={i} width={80} height={32} style={{ borderRadius: 'var(--radius-lg)' }} />)}
      </div>
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} height={72} />)}
      </div>
    </div>
  )
}

/**
 * Grid-page skeleton (cards layout).
 */
export function GridSkeleton({ cols = 3, count = 6 }) {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton width={200} height={28} />
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
        {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} height={160} />)}
      </div>
    </div>
  )
}

/**
 * Chat/messages skeleton.
 */
export function ChatSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-3">
        <Skeleton width={40} height={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
        <div className="space-y-2 flex-1">
          <Skeleton width={120} height={14} />
          <SkeletonCard height={60} />
        </div>
      </div>
      <div className="flex gap-3 flex-row-reverse">
        <Skeleton width={40} height={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
        <div className="space-y-2 flex-1">
          <Skeleton width={80} height={14} className="mr-auto" />
          <SkeletonCard height={40} />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton width={40} height={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
        <div className="space-y-2 flex-1">
          <Skeleton width={100} height={14} />
          <SkeletonCard height={80} />
        </div>
      </div>
    </div>
  )
}
