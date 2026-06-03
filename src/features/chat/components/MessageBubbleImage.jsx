import { useState } from 'react'
import ImageLightbox from './premium/ImageLightbox'
import { senderColor } from '../lib/senderColors'

export default function MessageBubbleImage({ message }) {
  const [open, setOpen] = useState(false)
  const src = message._signedImageUrl || message.image_url
  if (!src) return null

  const name = message.sender?.display_name || message.sender?.full_name || message.sender?.first_name_ar || ''
  const ratio = message.image_width && message.image_height
    ? message.image_width / message.image_height
    : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block mt-1 rounded-xl overflow-hidden hover:opacity-95 transition-opacity"
        style={{ maxWidth: 300, border: '1px solid var(--ds-border-subtle)' }}
      >
        <img
          src={src}
          alt="صورة"
          className="block w-full object-cover"
          style={{ maxHeight: 300, aspectRatio: ratio ? String(ratio) : undefined }}
          loading="lazy"
        />
      </button>

      {open && (
        <ImageLightbox
          images={[src]}
          index={0}
          senderName={name}
          senderColor={senderColor(message.sender_id).base}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
