import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useSpeakingHistory } from '@/hooks/ielts/useSpeakingLab'

const PART_TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'part_1', label: 'الجزء 1' },
  { key: 'part_2', label: 'الجزء 2' },
  { key: 'part_3', label: 'الجزء 3' },
]

const PART_META = {
  part_1: { icon: '🗣️', label_ar: 'الجزء الأول', num: 1 },
  part_2: { icon: '🎤', label_ar: 'الجزء الثاني', num: 2 },
  part_3: { icon: '🎓', label_ar: 'الجزء الثالث', num: 3 },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDuration(secs) {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}د ${s > 0 ? s + 'ث' : ''}` : `${s}ث`
}

function bandColor(b) {
  if (!b) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

export default function SpeakingHistory() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const [activeTab, setActiveTab] = useState('all')

  const historyQ = useSpeakingHistory(studentId, 50)

  if (!studentId) return null

  const all = historyQ.data || []
  const filtered = activeTab === 'all' ? all : all.filter(s => s.question_type === activeTab)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/speaking')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        معمل المحادثة
      </button>

      <GlassPanel elevation={2} style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={20} style={{ color: 'var(--text-tertiary)' }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 2 }}>
              سجل الجلسات
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              {all.length} جلسة مكتملة
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Part tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {PART_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer',
              background: activeTab === tab.key ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? '#ef4444' : 'var(--text-tertiary)',
              border: activeTab === tab.key ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {historyQ.isLoading && (
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري التحميل…</p>
        </GlassPanel>
      )}

      {!historyQ.isLoading && filtered.length === 0 && (
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 12 }}>🎤</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
            {activeTab === 'all' ? 'لا توجد جلسات بعد' : `لا توجد جلسات لـ ${PART_TABS.find(t => t.key === activeTab)?.label}`}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            ابدأ جلسة جديدة من معمل المحادثة
          </p>
        </GlassPanel>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => {
            const partKey = s.question_type
            const meta = PART_META[partKey]
            const b = s.band_score != null ? Number(s.band_score) : null
            const sd = s.session_data || {}
            const qCount = Array.isArray(sd.questions) ? sd.questions.length : 0

            return (
              <GlassPanel
                key={s.id}
                hover
                style={{ padding: '14px 16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => navigate(`/student/ielts/speaking/feedback/${s.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{meta?.icon || '🎤'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
                      {meta?.label_ar || partKey}
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                        {formatDate(s.completed_at)}
                      </p>
                      {s.duration_seconds > 0 && (
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                          {formatDuration(s.duration_seconds)}
                        </p>
                      )}
                      {qCount > 0 && (
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                          {qCount} سؤال
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    {b != null ? (
                      <>
                        <div style={{ fontSize: 22, fontWeight: 900, color: bandColor(b), fontFamily: 'Tajawal', lineHeight: 1 }}>{b.toFixed(1)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>band</div>
                      </>
                    ) : (
                      <span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>—</span>
                    )}
                  </div>
                </div>
              </GlassPanel>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
