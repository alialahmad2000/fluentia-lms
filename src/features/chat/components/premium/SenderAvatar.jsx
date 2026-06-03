import { senderColor, senderGradient } from '../../lib/senderColors'

// Per-sender avatar with a Telegram/Slack-style coloured identity ring.
// The ring is a conic gradient in the sender's `base` hue; the inner disc
// is filled with the sender's 135deg soft→base gradient. Falls back to the
// first character of the display name when there is no avatar image.
export default function SenderAvatar({ sender, senderId, size = 34 }) {
  const color = senderColor(senderId)
  const fill = senderGradient(senderId)

  const name =
    sender?.display_name ||
    sender?.full_name ||
    sender?.first_name_ar ||
    'م'
  const initial = String(name).trim().charAt(0) || 'م'
  const avatarUrl = sender?.avatar_url

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}
    >
      {/* Colour identity ring */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: '9999px',
          background: `conic-gradient(from 140deg, ${color.base}, color-mix(in srgb, ${color.base} 20%, transparent) 50%, ${color.base})`,
          opacity: 0.9,
        }}
      />
      {/* Inner disc: avatar image or initial on the sender gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '9999px',
          overflow: 'hidden',
          background: fill,
          boxShadow: `0 4px 14px -6px ${color.base}, inset 0 1px 1px rgba(255,255,255,0.2)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={initial}
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
          />
        ) : (
          <span
            style={{
              fontFamily: 'Tajawal, sans-serif',
              fontWeight: 700,
              fontSize: Math.round(size * 0.42),
              lineHeight: 1,
              color: 'rgba(255,255,255,0.96)',
              userSelect: 'none',
            }}
          >
            {initial}
          </span>
        )}
      </div>
    </div>
  )
}
