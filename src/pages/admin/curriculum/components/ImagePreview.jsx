import { Image } from 'lucide-react'

export default function ImagePreview({ value, onChange, label }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          {label}
        </label>
      )}
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="رابط الصورة (URL)"
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--text-primary)',
          fontFamily: 'Tajawal',
        }}
        dir="ltr"
      />
      {value && (
        <div
          className="mt-2 rounded-lg overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: 320 }}
        >
          <img
            src={value}
            alt="Preview"
            className="w-full h-auto max-h-48 object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      )}
      {!value && (
        <div
          className="flex items-center justify-center h-20 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <Image size={20} style={{ color: 'var(--text-muted)' }} />
        </div>
      )}
    </div>
  )
}
