import { useState, useRef } from 'react'
import { FileUp, X, FileText } from 'lucide-react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt']

export default function FileUpload({ files, onFilesChange, maxFiles = 3 }) {
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  function handleFiles(e) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return

    if (files.length + selected.length > maxFiles) {
      setError(`الحد الأقصى ${maxFiles} ملفات`)
      return
    }

    setError('')
    const newFiles = []

    for (const file of selected) {
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setError(`الملف "${file.name}" أكبر من 5MB`)
        continue
      }

      // Validate type
      const ext = '.' + file.name.split('.').pop().toLowerCase()
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`نوع الملف "${file.name}" غير مدعوم — PDF, DOC, TXT فقط`)
        continue
      }

      newFiles.push({
        blob: file,
        name: file.name,
        size: file.size,
        type: file.type,
      })
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles])
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index) {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1 text-sm text-muted">
        <FileUp size={14} />
        ملفات (اختياري — PDF, DOC, TXT — حد أقصى 5MB)
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-white/5 border border-border-subtle rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{f.name}</p>
                  <p className="text-[10px] text-muted">{formatSize(f.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-1 text-muted hover:text-red-400 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {files.length < maxFiles && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-border-subtle text-muted hover:text-white hover:bg-white/10 transition-all text-sm"
        >
          <FileUp size={16} />
          <span>إضافة ملف</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
