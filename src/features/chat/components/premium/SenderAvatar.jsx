// المجلس — restrained avatar. One brass accent, no per-sender hues: the teacher
// (trainer/admin) gets a brass-ringed, brass-tinted disc so they read as the centre
// of the circle; classmates get a quiet top-lit neutral disc. Falls back to the first
// character of the display name when there is no avatar image.
export default function SenderAvatar({ sender, senderId, size = 34 }) {
  const isTeacher = sender?.role === 'trainer' || sender?.role === 'admin'

  const name =
    sender?.display_name ||
    sender?.full_name ||
    sender?.first_name_ar ||
    'م'
  const initial = String(name).trim().charAt(0) || 'م'
  const avatarUrl = sender?.avatar_url

  const disc = isTeacher
    ? {
        background: 'radial-gradient(120% 120% at 50% 0%, rgba(201,168,106,0.18), rgba(201,168,106,0.035) 70%)',
        boxShadow:
          '0 2px 10px -4px rgba(201,168,106,0.40), inset 0 0 0 1px rgba(201,168,106,0.50), inset 0 1px 0 rgba(255,255,255,0.08)',
        color: '#E2C88E',
      }
    : {
        background: 'linear-gradient(180deg, rgba(236,234,226,0.12), rgba(236,234,226,0.03) 62%)',
        boxShadow:
          '0 2px 9px -3px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(236,234,226,0.09), inset 0 1px 0 rgba(255,255,255,0.07)',
        color: 'rgba(236,234,226,0.82)',
      }

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '9999px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...disc,
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
              fontWeight: 600,
              fontSize: Math.round(size * 0.42),
              lineHeight: 1,
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
