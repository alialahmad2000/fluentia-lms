// IELTS V3 Phase 4 — Mock Hub (entry, mode selector, history)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, ChevronLeft, Loader2 } from 'lucide-react'
import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useMockHistory, useCreateAttempt } from './useMockSession'
import { useAuthStore } from '@/stores/authStore'

const NARRATIVE_LINES = [
  'محاكاة الاختبار.',
  'الصمت مطلق.',
  'المؤقّت يعدّ.',
]

const SKILL_LABELS = {
  listening: 'الاستماع', reading: 'القراءة', writing: 'الكتابة', speaking: 'المحادثة',
}

const STATUS_LABELS = {
  in_progress: 'جارية', completed: 'مكتملة', evaluating: 'قيد التقييم',
}

function ModeCard({ icon, title, subtitle, timeLabel, onClick, disabled }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.99 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, minWidth: 240, padding: '28px 24px', borderRadius: 20, textAlign: 'right', cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid color-mix(in srgb, var(--sunset-amber) 22%, transparent)',
        background: 'color-mix(in srgb, var(--sunset-base-mid) 42%, transparent)',
        backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: 12, opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sunset-orange) 40%, transparent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sunset-amber) 22%, transparent)' }}
    >
      <span style={{ fontSize: 32 }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7 }}>{subtitle}</p>
      <span style={{ fontSize: 12, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700 }}>{timeLabel}</span>
    </motion.button>
  )
}

export default function MockHub() {
  const navigate = useNavigate()
  const studentId = useStudentId()
  const profile = useAuthStore((s) => s.profile)
  const [narrativeDone, setNarrativeDone] = useState(false)
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [creating, setCreating] = useState(false)

  const historyQ  = useMockHistory(studentId)
  const createMut = useCreateAttempt()

  async function startMock(mode, singleSkill = null) {
    if (!studentId || creating) return
    setCreating(true)
    try {
      const id = await createMut.mutateAsync({ studentId, mode, singleSkill })
      navigate(`/student/ielts-v2/mock/${id}`)
    } catch (e) {
      console.error('[MockHub] create attempt failed:', e)
    } finally {
      setCreating(false)
    }
  }

  const attempts = (historyQ.data || []).filter(a => a.answers?.mode)
  const bestBand = attempts
    .map(a => {
      const ans = a.answers || {}
      const bands = ['listening','reading','writing','speaking']
        .map(s => Number(ans[s]?.band)).filter(b => !isNaN(b) && b > 0)
      return bands.length ? bands.reduce((a,b) => a+b) / bands.length : null
    })
    .filter(b => b != null)
  const best = bestBand.length ? Math.max(...bestBand.map(b => Math.round(b * 2) / 2)) : null

  return (
    <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 32 }}>
      {!narrativeDone && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingTop: 32 }}>
          <NarrativeReveal lines={NARRATIVE_LINES} delayBetweenLines={700} pauseAfterLast={400} onComplete={() => setNarrativeDone(true)} />
        </motion.section>
      )}

      {best != null && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, padding: '14px 18px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>أفضل محاكاة</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--sunset-orange)', fontFamily: "'Playfair Display', serif" }}>{best.toFixed(1)}</p>
          </div>
          <div style={{ flex: 1, padding: '14px 18px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>محاكاة مكتملة</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', fontFamily: "'Playfair Display', serif" }}>{attempts.length}</p>
          </div>
        </motion.div>
      )}

      {/* Mode cards */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>اختاري نوع المحاكاة</p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <ModeCard
            icon="🎯"
            title="محاكاة كاملة"
            subtitle="استماع → قراءة → كتابة → محادثة. لا توقف، لا إعادة تشغيل."
            timeLabel="~٣ ساعات"
            onClick={() => startMock('full')}
            disabled={creating}
          />
          <ModeCard
            icon="⚡"
            title="محاكاة جزء واحد"
            subtitle="اختاري مهارة واحدة في ظروف الاختبار الحقيقي."
            timeLabel="٣٠–٦٠ دقيقة"
            onClick={() => setShowSkillModal(true)}
            disabled={creating}
          />
        </div>
      </motion.section>

      {/* Skill picker modal */}
      <AnimatePresence>
        {showSkillModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setShowSkillModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--ds-bg-elevated, #0b0f18)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 20%, transparent)', borderRadius: 20, padding: '28px 24px', maxWidth: 400, width: '100%' }}
              dir="rtl"
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 900, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>اختاري المهارة</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'listening', label: 'الاستماع', time: '٣٠ دقيقة' },
                  { key: 'reading',   label: 'القراءة',  time: '٦٠ دقيقة' },
                  { key: 'writing',   label: 'الكتابة',  time: '٦٠ دقيقة' },
                  { key: 'speaking',  label: 'المحادثة', time: '١٤ دقيقة' },
                ].map(s => (
                  <button key={s.key}
                    onClick={() => { setShowSkillModal(false); startMock('single', s.key) }}
                    style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)', background: 'color-mix(in srgb, var(--sunset-base-mid) 38%, transparent)', color: 'var(--ds-text)', fontSize: 15, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{s.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.time}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {creating && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", fontSize: 14 }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          جاري تجهيز الاختبار…
        </div>
      )}

      {/* Past attempts */}
      {attempts.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>المحاولات السابقة</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attempts.slice(0, 8).map(a => {
              const ans = a.answers || {}
              const skills = ans.mode === 'single' ? [ans.single_skill] : ['listening','reading','writing','speaking']
              const bands = skills.map(s => ans[s]?.band).filter(b => b != null)
              const avg = bands.length ? Math.round((bands.reduce((x,y) => x+y) / bands.length) * 2) / 2 : null
              return (
                <button key={a.id}
                  onClick={() => navigate(`/student/ielts-v2/mock/${a.id}/results`)}
                  style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
                      {ans.mode === 'single' ? SKILL_LABELS[ans.single_skill] : 'محاكاة كاملة'}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                      {new Date(a.started_at).toLocaleDateString('ar-SA')} · {STATUS_LABELS[a.status] || a.status}
                    </p>
                  </div>
                  {avg != null && (
                    <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--sunset-orange)', fontFamily: "'Playfair Display', serif" }}>{avg.toFixed(1)}</span>
                  )}
                </button>
              )
            })}
          </div>
        </motion.section>
      )}
    </div>
  )
}
