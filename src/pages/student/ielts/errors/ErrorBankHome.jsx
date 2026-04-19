import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useErrorBankSummary, useErrorBankList } from '@/hooks/ielts/useErrorBank'
import ErrorBankStatsRow from '@/components/ielts/errors/ErrorBankStatsRow'
import ErrorFilterTabs from '@/components/ielts/errors/ErrorFilterTabs'
import ErrorListItem from '@/components/ielts/errors/ErrorListItem'

export default function ErrorBankHome() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const [activeSkill, setActiveSkill] = useState(null)
  const [showMastered, setShowMastered] = useState(false)

  const summaryQ = useErrorBankSummary(studentId)
  const listQ = useErrorBankList(studentId, { skill: activeSkill, showMastered })

  if (!studentId) return null

  const summary = summaryQ.data
  const errors = listQ.data || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        ← لوحة IELTS
      </button>

      <GlassPanel elevation={2} style={{ padding: 20, marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>بنك الأخطاء</h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          راجع أخطاءك بذكاء — كل خطأ راجعته يُثبّت مستواك
        </p>
      </GlassPanel>

      {/* Stats */}
      {summaryQ.isLoading ? (
        <GlassPanel style={{ padding: 24, textAlign: 'center', marginBottom: 20 }}>
          <Loader size={20} style={{ color: 'var(--text-tertiary)', margin: '0 auto' }} />
        </GlassPanel>
      ) : (
        <ErrorBankStatsRow summary={summary} />
      )}

      {/* Start review CTA */}
      {(summary?.due || 0) > 0 ? (
        <GlassPanel
          hover
          style={{ padding: '16px 20px', marginBottom: 20, cursor: 'pointer', border: '1.5px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.06)' }}
          onClick={() => navigate('/student/ielts/errors/review')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                ابدأ جلسة مراجعة — {summary.due} أخطاء جاهزة
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                جلسة مراجعة ذكية بنظام SM-2
              </p>
            </div>
            <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700, fontFamily: 'Tajawal' }}>ابدأ →</span>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel style={{ padding: '14px 18px', marginBottom: 20, textAlign: 'center', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal' }}>
            ممتاز! ما عندك أخطاء تستحق المراجعة الآن 🎉
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 4 }}>
            تعود الأخطاء للمراجعة تدريجياً بحسب الجدول الذكي
          </p>
        </GlassPanel>
      )}

      {/* Filters */}
      <ErrorFilterTabs activeSkill={activeSkill} onChange={setActiveSkill} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {listQ.isLoading ? 'جاري التحميل…' : `${errors.length} خطأ`}
        </p>
        <button
          onClick={() => setShowMastered(s => !s)}
          style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'Tajawal', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {showMastered ? 'إخفاء المتقنة' : 'إظهار المتقنة'}
        </button>
      </div>

      {/* Error list */}
      {listQ.isLoading && (
        <GlassPanel style={{ padding: 24, textAlign: 'center' }}>
          <Loader size={20} style={{ color: 'var(--text-tertiary)', margin: '0 auto' }} />
        </GlassPanel>
      )}

      {!listQ.isLoading && errors.length === 0 && (
        <GlassPanel style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>{summary?.total === 0 ? '📚' : '✅'}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
            {summary?.total === 0 ? 'ما عندك أخطاء مسجّلة بعد' : 'لا يوجد أخطاء بهذا الفلتر'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            {summary?.total === 0 ? 'أخطاؤك من تمارين القراءة والاستماع تظهر هنا تلقائياً' : 'جرب فلتراً آخر'}
          </p>
        </GlassPanel>
      )}

      {errors.map(error => (
        <ErrorListItem key={error.id} error={error} studentId={studentId} />
      ))}
    </motion.div>
  )
}
