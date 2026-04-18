import { useEffect, useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function AutoSaveIndicator({ isSaving, lastSavedAt }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!lastSavedAt) return
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 1000)
      if (diff < 5) setLabel('تم الحفظ للتو')
      else if (diff < 60) setLabel(`تم الحفظ قبل ${diff} ث`)
      else setLabel(`تم الحفظ قبل ${Math.floor(diff / 60)} د`)
    }
    update()
    const id = setInterval(update, 10000)
    return () => clearInterval(id)
  }, [lastSavedAt])

  if (!isSaving && !lastSavedAt) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {isSaving
        ? <Loader2 size={12} style={{ color: '#38bdf8', animation: 'spin 1s linear infinite' }} />
        : <CheckCircle size={12} style={{ color: '#4ade80' }} />
      }
      <span style={{ fontSize: 11, fontFamily: 'Tajawal', color: 'var(--text-tertiary)' }}>
        {isSaving ? 'جاري الحفظ...' : label}
      </span>
    </div>
  )
}
