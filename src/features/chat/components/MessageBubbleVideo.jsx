// Inline video message — native controls, tap to play. Poster = first frame via preload=metadata.
export default function MessageBubbleVideo({ message }) {
  const url = message._signedFileUrl
  if (!url) {
    return (
      <div className="rounded-xl flex items-center justify-center"
        style={{ width: 240, height: 135, background: 'var(--ds-surface-2)', color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif', fontSize: 12 }}>
        جارٍ التحميل…
      </div>
    )
  }
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      style={{ maxWidth: 360, width: '100%', maxHeight: 420, borderRadius: 14, background: '#000', display: 'block' }}
    />
  )
}
