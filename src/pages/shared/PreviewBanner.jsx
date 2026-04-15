import { useState } from 'react'
import { Eye, X } from 'lucide-react'

export default function PreviewBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('preview-banner-dismissed') === '1' } catch { return false }
  })
  if (dismissed) return null
  return (
    <div style={{
      padding: '10px 16px',
      margin: '12px 16px 0',
      background: 'rgba(245, 158, 11, 0.08)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 13,
      direction: 'rtl',
    }}>
      <Eye size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
      <div style={{ flex: 1, color: '#fcd34d' }}>
        <strong>وضع المعاينة</strong> — تستعرض المنهج كما يراه الطالب. التقدم لا يُحفظ، وجميع المستويات متاحة.
      </div>
      <button
        onClick={() => {
          try { sessionStorage.setItem('preview-banner-dismissed', '1') } catch {}
          setDismissed(true)
        }}
        style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#f59e0b' }}
        aria-label="إخفاء"
      >
        <X size={16} />
      </button>
    </div>
  )
}
