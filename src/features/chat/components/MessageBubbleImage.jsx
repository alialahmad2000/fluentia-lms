import { useState } from 'react'
import { X } from 'lucide-react'

export default function MessageBubbleImage({ message }) {
  const [fullscreen, setFullscreen] = useState(false)
  const src = message._signedImageUrl || message.image_url
  if (!src) return null

  return (
    <>
      <button
        onClick={() => setFullscreen(true)}
        className="block mt-1 rounded-xl overflow-hidden border border-[var(--border)] hover:opacity-90 transition-opacity"
        style={{ maxWidth: 320 }}
      >
        <img
          src={src}
          alt="صورة"
          className="block w-full object-cover"
          style={{ maxHeight: 240 }}
          loading="lazy"
        />
      </button>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 left-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setFullscreen(false)}
          >
            <X size={24} />
          </button>
          <img src={src} alt="صورة" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </>
  )
}
