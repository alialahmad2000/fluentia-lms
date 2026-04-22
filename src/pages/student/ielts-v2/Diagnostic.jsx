import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Clock, VolumeX, Heart, ArrowLeft } from 'lucide-react'

import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import TrainerPresence from '@/design-system/components/masterclass/TrainerPresence'
import { useDiagnosticStateV2 } from '@/hooks/ielts/useDiagnosticStateV2'

const CHECKLIST_ITEMS = [
  { id: 'headphones', icon: Headphones, label: 'السماعات موصولة وواضحة' },
  { id: 'time',       icon: Clock,      label: 'لديّ ٦٠ دقيقة متواصلة دون مقاطعة' },
  { id: 'quiet',      icon: VolumeX,    label: 'المكان هادئ' },
  { id: 'ready',      icon: Heart,      label: 'أنا مرتاحة، تنفّست، ومستعدة' },
]

const NARRATIVE_LINES = [
  'فصل جديد يبدأ.',
  'اليوم ليس اختباراً — اليوم خارطة.',
  'تنفّسي. ابدأي.',
]

export default function Diagnostic() {
  const navigate = useNavigate()
  const { loading, state, latestOverallBand } = useDiagnosticStateV2()

  const [checked, setChecked] = useState({
    headphones: false,
    time: false,
    quiet: false,
    ready: false,
  })

  const allChecked = Object.values(checked).every(Boolean)

  function toggle(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleStart() {
    navigate('/student/ielts/diagnostic')
  }

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 640,
        margin: '0 auto',
        paddingBottom: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 48,
      }}
    >
      {/* ========== 1. NARRATIVE OPENING ========== */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{ paddingTop: 32 }}
      >
        <NarrativeReveal
          lines={NARRATIVE_LINES}
          delayBetweenLines={700}
          pauseAfterLast={800}
        />
      </motion.section>

      {/* ========== 2. TRAINER PRESENCE + EXPLANATION ========== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
          padding: '24px',
          borderRadius: 20,
          background: 'color-mix(in srgb, var(--sunset-base-mid) 55%, transparent)',
          border: 'var(--ds-border-width, 1px) solid color-mix(in srgb, var(--sunset-amber) 20%, transparent)',
          backdropFilter: 'blur(var(--ds-blur-sm, 8px))',
        }}
      >
        <div style={{ flexShrink: 0, paddingTop: 4 }}>
          <TrainerPresence trainerName="د. علي" size="md" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--sunset-orange)',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            د. علي الأحمد — مدرب IELTS
          </div>
          <p style={{
            fontSize: 15,
            color: 'var(--ds-text)',
            lineHeight: 1.85,
            margin: 0,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            سنقضي الساعة القادمة معاً. أربعة فصول: استماع، قراءة، كتابة، محادثة.
            <br />
            لا تقلقي من الأخطاء — هي ما سيرسم لنا الطريق.
            <br />
            بعد الانتهاء، ستحصلين على خارطتك الكاملة.
          </p>
        </div>
      </motion.section>

      {/* ========== 3. PRE-FLIGHT CHECKLIST ========== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 900,
            color: 'var(--ds-text)',
            margin: 0,
            marginBottom: 4,
          }}>
            قبل أن نبدأ
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>
            تأكدي من هذه النقاط الأربع.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CHECKLIST_ITEMS.map(({ id, icon: Icon, label }) => {
            const isChecked = checked[id]
            return (
              <motion.button
                key={id}
                onClick={() => toggle(id)}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderRadius: 14,
                  border: `1px solid ${isChecked
                    ? 'color-mix(in srgb, var(--sunset-orange) 40%, transparent)'
                    : 'color-mix(in srgb, var(--ds-border) 80%, transparent)'}`,
                  background: isChecked
                    ? 'color-mix(in srgb, var(--sunset-orange) 10%, transparent)'
                    : 'color-mix(in srgb, var(--ds-surface) 60%, transparent)',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'background 0.2s, border-color 0.2s',
                  backdropFilter: 'blur(var(--ds-blur-sm, 6px))',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isChecked
                    ? 'color-mix(in srgb, var(--sunset-orange) 20%, transparent)'
                    : 'color-mix(in srgb, var(--ds-surface) 80%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: isChecked ? 'var(--sunset-orange)' : 'var(--ds-text-muted)',
                  transition: 'background 0.2s, color 0.2s',
                }}>
                  <Icon size={16} strokeWidth={2} />
                </div>

                <span style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: isChecked ? 700 : 500,
                  color: isChecked ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                  fontFamily: "'Tajawal', sans-serif",
                  transition: 'color 0.2s',
                }}>
                  {label}
                </span>

                {/* Checkmark */}
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: `2px solid ${isChecked ? 'var(--sunset-orange)' : 'var(--ds-border)'}`,
                  background: isChecked ? 'var(--sunset-orange)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}>
                  <AnimatePresence>
                    {isChecked && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="var(--sunset-base-deep)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.section>

      {/* ========== 4. PRIMARY CTA ========== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
      >
        <motion.button
          onClick={allChecked ? handleStart : undefined}
          disabled={!allChecked}
          whileHover={allChecked ? { scale: 1.02 } : undefined}
          whileTap={allChecked ? { scale: 0.98 } : undefined}
          style={{
            width: '100%',
            maxWidth: 480,
            padding: '18px 32px',
            borderRadius: 16,
            border: `1px solid color-mix(in srgb, var(--sunset-orange) ${allChecked ? 50 : 20}%, transparent)`,
            background: allChecked
              ? 'color-mix(in srgb, var(--sunset-orange) 22%, var(--sunset-base-mid))'
              : 'color-mix(in srgb, var(--ds-surface) 50%, transparent)',
            color: allChecked ? 'var(--ds-text)' : 'var(--ds-text-muted)',
            fontSize: 17,
            fontWeight: 900,
            fontFamily: "'Tajawal', sans-serif",
            cursor: allChecked ? 'pointer' : 'not-allowed',
            opacity: allChecked ? 1 : 0.5,
            transition: 'all 0.25s',
            backdropFilter: 'blur(var(--ds-blur-sm, 8px))',
          }}
        >
          أنا جاهزة، لنبدأ
        </motion.button>

        <p style={{
          fontSize: 11,
          color: 'var(--ds-text-muted)',
          textAlign: 'center',
          margin: 0,
        }}>
          ستنتقلين للاختبار الفعلي — نحن نعمل على تحسين هذه المرحلة
        </p>
      </motion.section>

      {/* ========== 5. RESUME / ALREADY-TAKEN BRANCH ========== */}
      {!loading && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          {state === 'in_progress' && (
            <div style={{
              padding: '18px 20px',
              borderRadius: 16,
              background: 'color-mix(in srgb, var(--ds-surface) 60%, transparent)',
              border: '1px solid color-mix(in srgb, var(--sunset-amber) 30%, transparent)',
              backdropFilter: 'blur(var(--ds-blur-sm, 8px))',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: '0 0 12px', fontFamily: "'Tajawal', sans-serif" }}>
                لديكِ اختبار لم يكتمل — يمكنكِ إتمامه.
              </p>
              <button
                onClick={() => navigate('/student/ielts/diagnostic')}
                style={{
                  padding: '10px 24px',
                  borderRadius: 12,
                  border: '1px solid color-mix(in srgb, var(--sunset-amber) 35%, transparent)',
                  background: 'color-mix(in srgb, var(--sunset-amber) 12%, transparent)',
                  color: 'var(--ds-text)',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Tajawal', sans-serif",
                  cursor: 'pointer',
                }}
              >
                تابعي من حيث توقفتِ
              </button>
            </div>
          )}

          {state === 'completed' && latestOverallBand != null && (
            <div style={{
              padding: '16px 20px',
              borderRadius: 14,
              background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ds-border) 60%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              backdropFilter: 'blur(var(--ds-blur-sm, 6px))',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                آخر نتيجة: Band {Number(latestOverallBand).toFixed(1)}
              </span>
              <Link
                to="/student/ielts-v2/diagnostic/results"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--sunset-orange)',
                  textDecoration: 'none',
                }}
              >
                شاهدي نتيجتكِ
                <ArrowLeft size={13} />
              </Link>
            </div>
          )}
        </motion.section>
      )}
    </div>
  )
}
