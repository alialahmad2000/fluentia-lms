import { useState } from 'react'
import { ExternalLink, Loader2, Video } from 'lucide-react'

// Convert various URL formats to embeddable URLs
function getEmbedUrl(url) {
  if (!url) return null

  // Google Drive: /file/d/FILE_ID/view → /file/d/FILE_ID/preview
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (driveFileMatch) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`
  }

  // Google Drive: open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
  if (driveOpenMatch) {
    return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`
  }

  // Google Drive: already preview/embed
  if (url.includes('drive.google.com') && (url.includes('/preview') || url.includes('/embed'))) {
    return url
  }

  // YouTube: watch?v=ID or youtu.be/ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`
  }

  // Google Drive: generic file ID extraction (25+ char alphanumeric)
  const genericDriveMatch = url.match(/drive\.google\.com.*?([a-zA-Z0-9_-]{25,})/)
  if (genericDriveMatch) {
    return `https://drive.google.com/file/d/${genericDriveMatch[1]}/preview`
  }

  return null
}

export { getEmbedUrl }

export default function VideoPlayer({ url, title, date, part, className = '' }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const embedUrl = getEmbedUrl(url)

  if (!url) return null

  // Embeddable — show iframe player
  if (embedUrl && !error) {
    return (
      <div className={`rounded-xl overflow-hidden ${className}`} style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        {(title || date || part) && (
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Video size={14} className="text-sky-400" />
              {title && <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">{title}</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-['Tajawal']">
              {date && <span>{date}</span>}
              {part && <span className="bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded-md text-[10px] font-bold">{part}</span>}
            </div>
          </div>
        )}

        {/* Video embed — 16:9 aspect ratio */}
        <div className="relative w-full" style={{ paddingTop: '56.25%', background: 'rgba(0,0,0,0.3)' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="text-sky-400 animate-spin" />
                <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">جاري تحميل التسجيل...</span>
              </div>
            </div>
          )}
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true) }}
            style={{ border: 'none' }}
          />
        </div>

        {/* Footer — open externally */}
        <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-muted)] hover:text-sky-400 transition-colors flex items-center gap-1 font-['Tajawal']"
          >
            <ExternalLink size={10} />
            فتح في نافذة جديدة
          </a>
        </div>
      </div>
    )
  }

  // Fallback — non-embeddable URL
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 text-sm font-bold font-['Tajawal'] border border-sky-500/30 hover:bg-sky-500/25 transition-colors ${className}`}
    >
      <ExternalLink size={14} />
      فتح التسجيل
    </a>
  )
}
