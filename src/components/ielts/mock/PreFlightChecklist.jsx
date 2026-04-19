import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader, Mic } from 'lucide-react'
import { GlassPanel } from '@/design-system/components'

function CheckItem({ label, status, note }) {
  const icon = status === 'ok'
    ? <CheckCircle size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
    : status === 'fail'
    ? <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
    : <Loader size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {icon}
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'Tajawal', fontWeight: 600 }}>{label}</p>
        {note && <p style={{ fontSize: 12, color: status === 'fail' ? '#ef4444' : 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 2, lineHeight: 1.6 }}>{note}</p>}
      </div>
    </div>
  )
}

export default function PreFlightChecklist({ quotaRemaining, onReady }) {
  const [micStatus, setMicStatus] = useState('checking')
  const [browserStatus, setBrowserStatus] = useState('ok')
  const [micLabel, setMicLabel] = useState('التحقق من الميكروفون…')

  useEffect(() => {
    // Check browser MediaRecorder support
    if (!('MediaRecorder' in window)) {
      setBrowserStatus('fail')
    }

    // Check mic permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(t => t.stop())
        setMicStatus('ok')
        setMicLabel('الميكروفون متاح')
      })
      .catch(() => {
        setMicStatus('fail')
        setMicLabel('الميكروفون غير متاح أو مرفوض — افتح إعدادات المتصفح للسماح')
      })
  }, [])

  const quotaOk = quotaRemaining >= 5
  const allOk = micStatus === 'ok' && browserStatus === 'ok' && quotaOk

  useEffect(() => {
    onReady?.(allOk)
  }, [allOk, onReady])

  return (
    <GlassPanel style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Mic size={16} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>فحص ما قبل الاختبار</p>
      </div>

      <CheckItem
        label="متصفح متوافق"
        status={browserStatus}
        note={browserStatus === 'fail' ? 'استخدم Chrome أو Firefox أو Edge أو Safari الحديثة' : null}
      />
      <CheckItem
        label={micLabel}
        status={micStatus}
        note={micStatus === 'fail' ? 'مطلوب للتسجيل في قسم المحادثة' : null}
      />
      <CheckItem
        label={`حصة التقييم AI (${quotaRemaining} متبقية من أصل 5 مطلوبة)`}
        status={quotaOk ? 'ok' : 'fail'}
        note={!quotaOk ? 'لا تكفي الحصة — تواصل مع المشرف لزيادتها' : null}
      />
      <CheckItem
        label="الاتصال بالإنترنت"
        status="ok"
        note={null}
      />
    </GlassPanel>
  )
}
