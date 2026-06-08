// Shared-media gallery — a fullscreen grid of every image/video in a conversation.
// Read-only: pulls media through the same RLS-safe RPC the stream uses, resolves
// signed URLs (cached), and opens images in the existing ImageLightbox.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Play } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { signedImageUrl, signedFileUrl } from '../../../../lib/chatStorage'
import ImageLightbox from './ImageLightbox'

export default function SharedMediaGallery({ groupId, onClose }) {
  const [lightbox, setLightbox] = useState(null) // { images: string[], index }

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['shared-media', groupId],
    enabled: !!groupId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_group_messages', {
        p_group_id: groupId, p_lens: 'all', p_before: null, p_limit: 300,
      })
      if (error) throw error
      const rows = (data ?? []).filter(
        (m) => (m.type === 'image' && m.image_url) || (m.type === 'video' && m.file_url)
      )
      return Promise.all(rows.map(async (m) => {
        try {
          m._url = m.type === 'image' ? await signedImageUrl(m.image_url) : await signedFileUrl(m.file_url)
        } catch (_) { /* skip unresolved */ }
        return m
      }))
    },
  })

  const images = media.filter((m) => m.type === 'image' && m._url)

  return (
    <div className="fixed inset-0 z-[55] flex flex-col" dir="rtl" style={{ background: 'var(--ds-bg-base)' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
        <span className="font-bold" style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-primary)', fontSize: 16 }}>
          الوسائط المشتركة{media.length ? ` · ${media.length}` : ''}
        </span>
        <button onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 transition-colors hover:bg-[var(--ds-surface-1)]" style={{ color: 'var(--ds-text-secondary)' }}>
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>جارٍ التحميل…</div>
        ) : media.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>لا توجد وسائط بعد</div>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
            {media.map((m) => {
              if (m.type === 'image') {
                if (!m._url) return null
                const idx = images.findIndex((im) => im.id === m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => setLightbox({ images: images.map((im) => im._url), index: idx < 0 ? 0 : idx })}
                    className="relative rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                    style={{ aspectRatio: '1', background: 'var(--ds-surface-1)' }}
                  >
                    <img src={m._url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                )
              }
              // video tile → opens in a new tab (native player)
              return (
                <a
                  key={m.id}
                  href={m._url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="تشغيل الفيديو"
                  className="relative rounded-lg overflow-hidden block"
                  style={{ aspectRatio: '1', background: '#000' }}
                >
                  {m._url && <video src={m._url} preload="metadata" muted playsInline className="w-full h-full object-cover" />}
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Play size={26} style={{ color: 'white', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.6))' }} />
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}
