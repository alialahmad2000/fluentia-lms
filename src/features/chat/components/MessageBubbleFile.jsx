import { FileText, Download } from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MessageBubbleFile({ message }) {
  const url = message._signedFileUrl || message.file_url
  if (!url) return null

  return (
    <a
      href={url}
      download={message.file_name}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 mt-1 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
      style={{ maxWidth: 320 }}
    >
      <FileText size={24} className="text-sky-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] truncate font-medium">{message.file_name || 'ملف'}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {message.file_mime} {message.file_size ? `· ${formatBytes(message.file_size)}` : ''}
        </p>
      </div>
      <Download size={16} className="text-[var(--text-muted)] shrink-0" />
    </a>
  )
}
