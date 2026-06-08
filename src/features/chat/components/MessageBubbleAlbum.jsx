// Multi-image album — Instagram-style grid; tap any tile to page the full set
// in the existing lightbox. Shows up to 4 tiles with a "+N" overlay on the last.
import { useState } from 'react'
import ImageLightbox from './premium/ImageLightbox'

export default function MessageBubbleAlbum({ message }) {
  const [open, setOpen] = useState(null) // index | null
  const urls = (message._signedAlbum || []).filter(Boolean)
  const total = (message.album || []).length || urls.length

  if (!urls.length) {
    return (
      <div className="mt-1 grid gap-1 rounded-xl overflow-hidden" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 300 }}>
        {Array.from({ length: Math.min(total || 2, 4) }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1', background: 'var(--ds-surface-2)' }} />
        ))}
      </div>
    )
  }

  const shown = urls.slice(0, 4)
  const extra = total - shown.length

  return (
    <>
      <div className="mt-1 grid gap-1 rounded-xl overflow-hidden" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 300, border: '1px solid var(--ds-border-subtle)' }}>
        {shown.map((u, i) => (
          <button
            key={i}
            onClick={() => setOpen(i)}
            className="relative block hover:opacity-95 transition-opacity"
            style={{ aspectRatio: '1', background: 'var(--ds-surface-1)' }}
          >
            <img src={u} alt="" loading="lazy" className="w-full h-full object-cover" />
            {i === 3 && extra > 0 && (
              <span className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(3,7,15,0.55)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: 20, fontWeight: 700 }}>
                +{extra}
              </span>
            )}
          </button>
        ))}
      </div>
      {open !== null && (
        <ImageLightbox images={urls} index={open} onClose={() => setOpen(null)} />
      )}
    </>
  )
}
