import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './QuickActionsBar.css'

export default function QuickActionsBar({ student, onInsightRefresh, insightRefreshing }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const phone = student?.phone?.replace(/\D/g, '')
  const name = student?.name || ''

  function handleCopyPhone() {
    if (!phone) return
    navigator.clipboard.writeText(phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    if (!phone) return
    window.open(`https://wa.me/${phone}`, '_blank', 'noopener')
  }

  return (
    <div className="qa-bar">
      <button
        className="qa-btn qa-btn--whatsapp"
        onClick={handleWhatsApp}
        disabled={!phone}
        title={phone ? `واتساب: ${phone}` : 'رقم الهاتف غير متوفر'}
      >
        <span>📱</span> واتساب
      </button>

      {phone && (
        <button className="qa-btn qa-btn--copy" onClick={handleCopyPhone}>
          {copied ? '✅ تم النسخ' : '📋 نسخ الرقم'}
        </button>
      )}

      <button
        className="qa-btn qa-btn--insight"
        onClick={onInsightRefresh}
        disabled={insightRefreshing}
      >
        {insightRefreshing ? '⏳ يحلل…' : '🤖 تحديث التحليل'}
      </button>

      <button
        className="qa-btn qa-btn--grading"
        onClick={() => navigate('/trainer/grading')}
      >
        ✍️ التصحيح
      </button>
    </div>
  )
}
