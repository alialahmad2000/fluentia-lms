import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Shuffle, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useMockCatalog, useMockHistory, useReadinessMeta, useAutoAssembleMock } from '@/hooks/ielts/useMockCenter'
import MockCatalogCard from '@/components/ielts/mock/MockCatalogCard'
import MockTrajectorySparkline from '@/components/ielts/mock/MockTrajectorySparkline'
import ReadinessIndicator from '@/components/ielts/mock/ReadinessIndicator'

function formatRelative(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `قبل ${hrs} ساعة`
  return `قبل ${Math.floor(hrs / 24)} يوم`
}

function bandColor(b) {
  if (!b) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

export default function MockCenter() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  const catalogQ = useMockCatalog()
  const historyQ = useMockHistory(studentId, 10)
  const targetBand = studentData?.target_band || null
  const readinessMeta = useReadinessMeta(studentId, targetBand)
  const assembleMut = useAutoAssembleMock()

  if (!studentId) return null

  if (!hasAccess) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <Lock size={32} style={{ color: '#fbbf24', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
            هذه الخدمة متاحة لباقة IELTS
          </h2>
          <button onClick={() => navigate('/student/ielts')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            العودة للوحة IELTS
          </button>
        </GlassPanel>
      </div>
    )
  }

  const catalog = catalogQ.data || []
  const completeMocks = catalog.filter(m => m.isComplete)
  const history = historyQ.data || []
  const recentFive = history.slice(0, 5)

  const handleStartMock = async (mockId) => {
    navigate(`/student/ielts/mock/brief/${mockId}`)
  }

  const handleAutoAssemble = async () => {
    try {
      const result = await assembleMut.mutateAsync({ studentId, testVariant: 'academic' })
      navigate(`/student/ielts/mock/attempt/${result.attemptId}`)
    } catch (err) {
      // Error shown inline via mutation state
    }
  }

  const rm = readinessMeta.data || {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        ← لوحة IELTS
      </button>

      {/* Header */}
      <GlassPanel elevation={2} style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56,189,248,0.25)', flexShrink: 0, fontSize: 24 }}>
            🎓
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
              مركز الاختبارات التجريبية
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              اختبار IELTS كامل — 2 ساعة 45 دقيقة
            </p>
          </div>
          {history.length > 0 && rm.avgLastTwo != null && (
            <div style={{ textAlign: 'center', marginRight: 'auto' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#38bdf8', fontFamily: 'Tajawal', lineHeight: 1 }}>{rm.avgLastTwo.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>متوسط آخر اختبارين</div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Readiness indicator */}
      <ReadinessIndicator
        readiness={rm.readiness}
        avgLastTwo={rm.avgLastTwo}
        gap={rm.gap}
        trend={rm.trend}
        targetBand={targetBand}
      />

      {/* Section 1 — Start test */}
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 14, letterSpacing: '0.04em' }}>
        ابدأ اختباراً
      </p>

      {/* Pre-built mocks */}
      {completeMocks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
          {completeMocks.map(m => (
            <MockCatalogCard key={m.id} mock={m} onStart={() => handleStartMock(m.id)} />
          ))}
        </div>
      )}

      {/* Random Full Mock card */}
      <GlassPanel
        hover
        style={{ padding: 22, marginBottom: 24, cursor: assembleMut.isPending ? 'default' : 'pointer', border: '1px solid rgba(56,189,248,0.15)', background: 'rgba(56,189,248,0.04)' }}
        onClick={assembleMut.isPending ? undefined : handleAutoAssemble}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56,189,248,0.25)', flexShrink: 0 }}>
            {assembleMut.isPending
              ? <span style={{ fontSize: 18, animation: 'spin 1s linear infinite', display: 'block' }}>⏳</span>
              : <Shuffle size={20} style={{ color: '#38bdf8' }} />
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
              جلسة محاكاة عشوائية
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', lineHeight: 1.6 }}>
              {assembleMut.isPending
                ? 'جاري إعداد الاختبار…'
                : 'اختبار كامل من بنك الأسئلة — Academic · 165 دقيقة'
              }
            </p>
          </div>
          {!assembleMut.isPending && (
            <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, fontFamily: 'Tajawal' }}>ابدأ →</span>
          )}
        </div>
        {assembleMut.isError && (
          <p style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Tajawal', marginTop: 8 }}>
            {assembleMut.error?.message || 'فشل إعداد الاختبار'}
          </p>
        )}
      </GlassPanel>

      {/* Section 2 — Progress trajectory */}
      {history.length > 0 && (
        <>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 14, letterSpacing: '0.04em' }}>
            مسار التقدم
          </p>
          <GlassPanel style={{ padding: 20, marginBottom: 20 }}>
            <MockTrajectorySparkline results={history} targetBand={targetBand} height={100} />
          </GlassPanel>
        </>
      )}

      {/* Section 3 — Recent attempts */}
      {recentFive.length > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', letterSpacing: '0.04em' }}>سجلك الأخير</p>
            <button onClick={() => navigate('/student/ielts/mock/history')} style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'Tajawal', background: 'none', border: 'none', cursor: 'pointer' }}>
              عرض الكل
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentFive.map(r => (
              <GlassPanel
                key={r.id}
                hover
                style={{ padding: '12px 16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => navigate(`/student/ielts/mock/result/${r.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>🎓</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                      اختبار تجريبي
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                      {formatRelative(r.completed_at)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {[['reading_score', 'ق'], ['listening_score', 'س'], ['writing_score', 'ك'], ['speaking_score', 'م']].map(([k, lbl]) => (
                      r[k] != null && (
                        <div key={k} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: bandColor(r[k]), fontFamily: 'Tajawal' }}>{Number(r[k]).toFixed(1)}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{lbl}</div>
                        </div>
                      )
                    ))}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: bandColor(r.overall_band), fontFamily: 'Tajawal', lineHeight: 1 }}>{Number(r.overall_band).toFixed(1)}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>إجمالي</div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      ) : (
        <GlassPanel style={{ padding: 32, textAlign: 'center' }}>
          <Clock size={28} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
            ما أجريت أي اختبار تجريبي بعد
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            ابدأ جلسة محاكاة لقياس مستواك
          </p>
        </GlassPanel>
      )}
    </motion.div>
  )
}
