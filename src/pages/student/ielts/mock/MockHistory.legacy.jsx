import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useMockHistory } from '@/hooks/ielts/useMockCenter'

function bandColor(b) {
  if (b == null) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}

function variantLabel(v) {
  if (v === 'general_training') return 'General Training'
  return 'Academic'
}

const VARIANT_FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'academic', label: 'Academic' },
  { key: 'general_training', label: 'General Training' },
]

export default function MockHistory() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const [variantFilter, setVariantFilter] = useState('all')

  const historyQ = useMockHistory(studentId, 100)

  if (!studentId) return null

  const history = historyQ.data || []
  const filtered = variantFilter === 'all'
    ? history
    : history.filter(r => (r.test_variant || 'academic') === variantFilter)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/mock')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        ← مركز الاختبارات
      </button>

      {/* Header */}
      <GlassPanel elevation={2} style={{ padding: 20, marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
          سجل الاختبارات التجريبية
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {history.length} اختبار مكتمل
        </p>
      </GlassPanel>

      {/* Variant filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {VARIANT_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setVariantFilter(f.key)}
            style={{
              padding: '7px 16px', borderRadius: 10,
              background: variantFilter === f.key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
              color: variantFilter === f.key ? '#38bdf8' : 'var(--text-tertiary)',
              border: variantFilter === f.key ? '1.5px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'Tajawal', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {historyQ.isLoading && (
        <GlassPanel style={{ padding: 32, textAlign: 'center' }}>
          <Clock size={24} style={{ color: 'var(--text-tertiary)', margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري التحميل…</p>
        </GlassPanel>
      )}

      {historyQ.isError && (
        <GlassPanel style={{ padding: 32, textAlign: 'center' }}>
          <AlertCircle size={24} style={{ color: '#ef4444', margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Tajawal' }}>تعذّر التحميل</p>
        </GlassPanel>
      )}

      {!historyQ.isLoading && filtered.length === 0 && (
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <Clock size={28} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
            {variantFilter === 'all' ? 'ما أجريت أي اختبار بعد' : 'لا يوجد اختبارات بهذا النوع'}
          </p>
          <button
            onClick={() => navigate('/student/ielts/mock')}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
          >
            ابدأ اختباراً
          </button>
        </GlassPanel>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((r, idx) => (
            <GlassPanel
              key={r.id}
              hover
              style={{ padding: '14px 18px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => navigate(`/student/ielts/mock/result/${r.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Index */}
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', fontFamily: 'Tajawal' }}>
                    {filtered.length - idx}
                  </span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 2 }}>
                    اختبار تجريبي
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                      {formatDate(r.completed_at)}
                    </p>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>
                      {variantLabel(r.test_variant)}
                    </span>
                  </div>
                </div>

                {/* Skill scores */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {[
                    ['listening_score', 'س'],
                    ['reading_score', 'ق'],
                    ['writing_score', 'ك'],
                    ['speaking_score', 'م'],
                  ].map(([k, lbl]) => (
                    r[k] != null && (
                      <div key={k} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: bandColor(Number(r[k])), fontFamily: 'Tajawal' }}>
                          {Number(r[k]).toFixed(1)}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{lbl}</div>
                      </div>
                    )
                  ))}

                  {/* Overall */}
                  <div style={{ textAlign: 'center', marginRight: 4 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: bandColor(Number(r.overall_band)), fontFamily: 'Tajawal', lineHeight: 1 }}>
                      {r.overall_band != null ? Number(r.overall_band).toFixed(1) : '–'}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>إجمالي</div>
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </motion.div>
  )
}
