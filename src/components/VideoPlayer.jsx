import { useState, useRef, useCallback, useEffect } from 'react'
import { ExternalLink, Loader2, Bookmark, Clock, BookmarkCheck } from 'lucide-react'

// ─── URL helpers ───────────────────────────────────────

function getDriveFileId(url) {
  if (!url) return null
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    || url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
    || url.match(/drive\.google\.com.*?([a-zA-Z0-9_-]{25,})/)
  return m?.[1] || null
}

function getEmbedUrl(url) {
  if (!url) return null
  const fileId = getDriveFileId(url)
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`

  if (url.includes('drive.google.com') && (url.includes('/preview') || url.includes('/embed'))) return url

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  return null
}

export { getEmbedUrl }

// ─── Persistence helpers ──────────────────────────────

const BM_PREFIX = 'vp_bm_'
const WT_PREFIX = 'vw_'

function getFileId(url) { return getDriveFileId(url) }

function loadBookmark(url) {
  const id = getFileId(url)
  if (!id) return null
  try { return JSON.parse(localStorage.getItem(BM_PREFIX + id)) } catch { return null }
}

function saveBookmark(url, timestamp) {
  const id = getFileId(url)
  if (!id) return
  try { localStorage.setItem(BM_PREFIX + id, JSON.stringify({ timestamp, ts: Date.now() })) } catch {}
}

function loadWatchTime(url) {
  const id = getFileId(url)
  if (!id) return 0
  try { return parseInt(localStorage.getItem(WT_PREFIX + id) || '0', 10) } catch { return 0 }
}

function addWatchTime(url, seconds) {
  const id = getFileId(url)
  if (!id) return
  try {
    const cur = parseInt(localStorage.getItem(WT_PREFIX + id) || '0', 10)
    localStorage.setItem(WT_PREFIX + id, String(cur + seconds))
  } catch {}
}

// ─── Time formatting ───────────────────────────────────

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function parseTimestamp(str) {
  if (!str) return 0
  const parts = str.trim().split(':').map(Number)
  if (parts.some(isNaN)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

// ─── Bookmark toolbar ────────────────────────────────

function BookmarkToolbar({ url }) {
  const [bookmark, setBookmark] = useState(() => loadBookmark(url))
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const [watchTime, setWatchTime] = useState(() => loadWatchTime(url))
  const watchInterval = useRef(null)

  useEffect(() => {
    watchInterval.current = setInterval(() => {
      addWatchTime(url, 10)
      setWatchTime(prev => prev + 10)
    }, 10000)
    return () => clearInterval(watchInterval.current)
  }, [url])

  const handleSave = useCallback(() => {
    const seconds = parseTimestamp(input)
    if (seconds > 0) {
      saveBookmark(url, seconds)
      setBookmark({ timestamp: seconds, ts: Date.now() })
      setEditing(false)
      setInput('')
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
  }, [input, url])

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 px-1" dir="rtl">
      {bookmark && !editing && (
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Tajawal']"
          style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', color: 'var(--accent-sky, #38bdf8)' }}
        >
          <BookmarkCheck size={13} />
          <span>توقفت عند <strong dir="ltr">{formatTime(bookmark.timestamp)}</strong></span>
        </div>
      )}

      {editing ? (
        <div className="inline-flex items-center gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="مثلاً 30:50"
            dir="ltr"
            className="w-24 h-8 px-2 rounded-lg text-xs text-center font-['IBM Plex Sans',monospace]"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          />
          <button onClick={handleSave} className="h-8 px-3 rounded-lg text-xs font-bold font-['Tajawal']" style={{ background: 'var(--accent-sky, #38bdf8)', color: '#0f172a' }}>
            حفظ
          </button>
          <button onClick={() => setEditing(false)} className="h-8 px-2 rounded-lg text-xs font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
            إلغاء
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Tajawal'] transition-colors"
          style={{
            background: justSaved ? 'rgba(16,185,129,0.08)' : 'var(--surface-raised)',
            border: `1px solid ${justSaved ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
            color: justSaved ? '#10b981' : 'var(--text-secondary)',
          }}
        >
          {justSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          {justSaved ? 'تم الحفظ' : 'حفظ موضعي'}
        </button>
      )}

      {watchTime >= 60 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
          <Clock size={11} />
          شاهدت {formatTime(watchTime)}
        </span>
      )}
    </div>
  )
}

// ─── Main VideoPlayer ──────────────────────────────────

export default function VideoPlayer({ url, className = '' }) {
  const [loading, setLoading] = useState(true)
  const embedUrl = getEmbedUrl(url)

  if (!url) return null

  // Embeddable video (Google Drive / YouTube)
  if (embedUrl) {
    return (
      <div className={className}>
        {/* 16:9 responsive container */}
        <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: '56.25%', background: '#000' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="text-sky-400 animate-spin" />
                <span className="text-xs text-white/60 font-['Tajawal']">جاري تحميل التسجيل...</span>
              </div>
            </div>
          )}
          <iframe
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            onLoad={() => setLoading(false)}
            style={{ border: 'none' }}
          />
        </div>

        {/* Bookmark toolbar + open in new tab */}
        <BookmarkToolbar url={url} />
        <div className="mt-1 flex justify-end px-1">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-muted)] hover:text-sky-400 transition-colors inline-flex items-center gap-1 font-['Tajawal']">
            <ExternalLink size={10} /> فتح في نافذة جديدة
          </a>
        </div>
      </div>
    )
  }

  // Fallback: just a link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 text-sm font-bold font-['Tajawal'] border border-sky-500/30 hover:bg-sky-500/25 transition-colors ${className}`}>
      <ExternalLink size={14} /> فتح التسجيل
    </a>
  )
}
