import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './QuickActionsBar.css'

export default function QuickActionsBar({ student, onInsightRefresh, insightRefreshing }) {
  const { t } = useTranslation()
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
        title={phone ? `WhatsApp: ${phone}` : t('trainer.student360.no_phone', 'رقم الهاتف غير متوفر')}
      >
        <span>📱</span> {t('trainer.student360.whatsapp', 'واتساب')}
      </button>

      {phone && (
        <button className="qa-btn qa-btn--copy" onClick={handleCopyPhone}>
          {copied ? `✅ ${t('common.saved')}` : `📋 ${t('trainer.student360.copy_number', 'نسخ الرقم')}`}
        </button>
      )}

      <button
        className="qa-btn qa-btn--insight"
        onClick={onInsightRefresh}
        disabled={insightRefreshing}
      >
        {insightRefreshing ? `⏳ ${t('trainer.student360.analyzing', 'يحلل…')}` : `🤖 ${t('trainer.student360.refresh_analysis', 'تحديث التحليل')}`}
      </button>

      <button
        className="qa-btn qa-btn--grading"
        onClick={() => navigate('/trainer/grading')}
      >
        ✍️ {t('trainer.grading.label')}
      </button>
    </div>
  )
}
