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
  file: 'text-muted bg-white/5',
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
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye size={24} className="text-white" />
          </div>
        </div>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            <button className="absolute top-4 left-4 text-white/70 hover:text-white" onClick={() => setShowLightbox(false)}>
              <X size={24} />
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
      <div className={`flex items-center gap-3 bg-violet-500/5 border border-violet-500/15 rounded-xl p-3 ${className}`}>
        <button
          onClick={toggleAudio}
          className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500/30 transition-colors shrink-0"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="mr-[-2px]" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{fileName}</p>
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
      <div className={`border border-red-500/15 rounded-xl overflow-hidden ${className}`}>
        <div className="flex items-center justify-between bg-red-500/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-red-400" />
            <span className="text-sm text-white truncate">{fileName}</span>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 transition-colors">
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
      className={`flex items-center gap-3 bg-white/[0.04] border border-border-subtle rounded-xl p-3 hover:bg-white/[0.07] transition-colors ${className}`}
    >
      <div className={`w-10 h-10 rounded-xl ${colors} flex items-center justify-center shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{fileName}</p>
        <p className="text-xs text-muted">اضغط لفتح الملف</p>
      </div>
      <Download size={16} className="text-muted shrink-0" />
    </a>
  )
}
