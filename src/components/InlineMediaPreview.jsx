import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, FileText, Image, Music, Film, Download, ExternalLink, Eye, X } from 'lucide-react'

// Detect file type from URL or extension
function getFileType(url) {
  if (!url) return 'unknown'
  const lower = url.toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)/.test(lower)) return 'image'
  if (/\.(mp3|wav|ogg|m4a|aac|webm)/.test(lower)) return 'audio'
  if (/\.(mp4|mov|avi|mkv)/.test(lower)) return 'video'
  if (/\.(pdf)/.test(lower)) return 'pdf'
  if (/\.(doc|docx|txt|rtf)/.test(lower)) return 'document'
  return 'file'
}

const TYPE_ICONS = {
  image: Image,
  audio: Music,
  video: Film,
  pdf: FileText,
  document: FileText,
  file: FileText,
  unknown: FileText,
}

const TYPE_COLORS = {
  image: 'text-emerald-400 bg-emerald-500/10',
  audio: 'text-violet-400 bg-violet-500/10',
  video: 'text-sky-400 bg-sky-500/10',
  pdf: 'text-red-400 bg-red-500/10',
  document: 'text-amber-400 bg-amber-500/10',
  file: 'text-muted bg-[var(--surface-base)]',
}

export default function InlineMediaPreview({ url, title, className = '' }) {
  const [playing, setPlaying] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [audioRef, setAudioRef] = useState(null)

  if (!url) return null

  const type = getFileType(url)
  const Icon = TYPE_ICONS[type]
  const colors = TYPE_COLORS[type] || TYPE_COLORS.file
  const fileName = title || url.split('/').pop()?.split('?')[0] || 'ملف'

  function toggleAudio() {
    if (!audioRef) return
    if (playing) {
      audioRef.pause()
    } else {
      audioRef.play()
    }
    setPlaying(!playing)
  }

  // Image preview
  if (type === 'image') {
    return (
      <>
        <div className={`group relative rounded-xl overflow-hidden cursor-pointer ${className}`} onClick={() => setShowLightbox(true)}>
          <img src={url} alt={fileName} className="w-full max-h-48 object-cover rounded-xl" loading="lazy" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Eye size={20} className="text-white" />
            </div>
          </div>
        </div>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            <button className="absolute top-4 left-4 btn-ghost w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all duration-200" onClick={() => setShowLightbox(false)}>
              <X size={20} />
            </button>
            <img src={url} alt={fileName} className="max-w-full max-h-[90vh] rounded-xl" />
          </motion.div>
        )}
      </>
    )
  }

  // Audio player
  if (type === 'audio') {
    return (
      <div className={`flex items-center gap-3 fl-card-static p-4 ${className}`}>
        <button
          onClick={toggleAudio}
          className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 transition-all duration-200 shrink-0"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="mr-[-2px]" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{fileName}</p>
          <audio
            ref={setAudioRef}
            src={url}
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            className="w-full mt-1"
            controls
            controlsList="nodownload"
            style={{ height: '28px' }}
          />
        </div>
      </div>
    )
  }

  // Video player
  if (type === 'video') {
    return (
      <div className={`rounded-xl overflow-hidden ${className}`}>
        <video
          src={url}
          controls
          className="w-full max-h-64 rounded-xl bg-black"
          controlsList="nodownload"
          preload="metadata"
        />
      </div>
    )
  }

  // PDF preview
  if (type === 'pdf') {
    return (
      <div className={`fl-card-static overflow-hidden ${className}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <FileText size={16} className="text-red-400" />
            </div>
            <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{fileName}</span>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2 text-red-400 hover:text-red-300 transition-all duration-200">
            <ExternalLink size={14} />
          </a>
        </div>
        <iframe src={url} className="w-full h-64 bg-white" title={fileName} />
      </div>
    )
  }

  // Generic file download link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 fl-card p-4 hover:translate-y-[-2px] transition-all duration-200 ${className}`}
    >
      <div className={`w-10 h-10 rounded-xl ${colors} flex items-center justify-center shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{fileName}</p>
        <p className="text-sm text-muted">اضغط لفتح الملف</p>
      </div>
      <Download size={16} className="text-muted shrink-0" />
    </a>
  )
}
