import { useState } from 'react'

/**
 * Shared avatar component — shows profile photo if available, falls back to initials.
 *
 * Props:
 *   user     — object with { avatar_url, display_name, full_name } (any subset)
 *   size     — pixel number (default 40)
 *   rounded  — 'full' | 'xl' | '2xl' | 'lg' (default 'xl')
 *   gradient — CSS gradient string for initials bg (optional)
 *   className — extra classes on the outer wrapper
 */
export default function UserAvatar({
  user,
  size = 40,
  rounded = 'xl',
  gradient = 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))',
  className = '',
}) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const avatarUrl = user?.avatar_url
  const name = user?.full_name || user?.display_name || ''
  const initial = name.trim()[0] || '?'
  const showImg = avatarUrl && !imgError

  const radiusClass =
    rounded === 'full' ? 'rounded-full' :
    rounded === '2xl' ? 'rounded-2xl' :
    rounded === 'lg' ? 'rounded-lg' :
    'rounded-xl'

  const fontSize = size <= 24 ? 10 : size <= 32 ? 12 : size <= 40 ? 14 : size <= 48 ? 16 : 20

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center flex-shrink-0 ${radiusClass} ${className}`}
      style={{
        width: size,
        height: size,
        background: showImg && imgLoaded ? 'transparent' : gradient,
        border: '1px solid var(--avatar-border, rgba(255,255,255,0.1))',
      }}
    >
      {/* Initials (always rendered as fallback) */}
      {(!showImg || !imgLoaded) && (
        <span
          className="font-bold select-none"
          style={{ fontSize, color: '#fff', lineHeight: 1 }}
        >
          {initial}
        </span>
      )}

      {/* Image */}
      {showImg && (
        <img
          src={avatarUrl}
          alt={name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          draggable={false}
        />
      )}
    </div>
  )
}
