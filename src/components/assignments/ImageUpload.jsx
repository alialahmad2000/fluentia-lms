import { useState, useRef } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'

const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.8

// Compress image client-side: max 1200px, 80% JPEG
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('فشل ضغط الصورة'))
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('فشل تحميل الصورة'))
    }

    img.src = url
  })
}

export default function ImageUpload({ images, onImagesChange, maxImages = 4 }) {
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Check limit
    if (images.length + files.length > maxImages) {
      setError(`الحد الأقصى ${maxImages} صور`)
      return
    }

    setError('')
    setCompressing(true)

    try {
      const newImages = []
      for (const file of files) {
        // Validate type
        if (!file.type.startsWith('image/')) {
          setError('فقط ملفات الصور مسموحة')
          continue
        }

        const compressed = await compressImage(file)
        const preview = URL.createObjectURL(compressed)
        newImages.push({
          blob: compressed,
          preview,
          name: file.name.replace(/\.[^.]+$/, '.jpg'),
          size: compressed.size,
        })
      }

      onImagesChange([...images, ...newImages])
    } catch (err) {
      setError(err.message)
    } finally {
      setCompressing(false)
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeImage(index) {
    const img = images[index]
    if (img.preview) URL.revokeObjectURL(img.preview)
    onImagesChange(images.filter((_, i) => i !== index))
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1 text-sm text-muted">
        <Camera size={14} />
        صور (اختياري — لقطات شاشة أو صور)
      </label>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden bg-white/5 border border-border-subtle">
              <img
                src={img.preview || img.url}
                alt={img.name}
                className="w-full h-32 object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 left-1 p-1 bg-black/60 rounded-lg text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
              <p className="text-xs text-muted text-center py-1">{formatSize(img.size)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {images.length < maxImages && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={compressing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-border-subtle text-muted hover:text-white hover:bg-white/10 transition-all text-sm disabled:opacity-50"
        >
          {compressing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Camera size={16} />
          )}
          <span>{compressing ? 'جاري الضغط...' : 'إضافة صور'}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
