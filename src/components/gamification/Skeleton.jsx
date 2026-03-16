/**
 * Skeleton loading components using the skeleton-wave CSS class
 * from animations.css (shimmerWave keyframe).
 */

function Skeleton({ width, height, className = '', style = {}, ...props }) {
  return (
    <div
      className={`skeleton-wave ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? 16,
        borderRadius: 'var(--radius-sm)',
        ...style,
      }}
      {...props}
    />
  )
}

function SkeletonCard({ width, height = 160, className = '' }) {
  return (
    <div
      className={`skeleton-wave ${className}`}
      style={{
        width: width ?? '100%',
        height,
        borderRadius: 'var(--radius-lg)',
      }}
    />
  )
}

function SkeletonRow({ width, height = 48, className = '' }) {
  return (
    <div
      className={`skeleton-wave ${className}`}
      style={{
        width: width ?? '100%',
        height,
        borderRadius: 'var(--radius-sm)',
      }}
    />
  )
}

function SkeletonAvatar({ size = 40, className = '' }) {
  return (
    <div
      className={`skeleton-wave ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
      }}
    />
  )
}

function SkeletonText({ lines = 3, width, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} style={{ width: width ?? '100%' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-wave"
          style={{
            width: i === lines - 1 ? '60%' : '100%',
            height: 14,
            borderRadius: 'var(--radius-sm)',
          }}
        />
      ))}
    </div>
  )
}

export { Skeleton as default, Skeleton, SkeletonCard, SkeletonRow, SkeletonAvatar, SkeletonText }
