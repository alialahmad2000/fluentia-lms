import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GlassPanel } from '@/design-system/components'
import { supabase } from '@/lib/supabase'
import DiagnosticProgress from '@/components/ielts/diagnostic/DiagnosticProgress'
import AudioRecorder from '@/components/ielts/diagnostic/AudioRecorder'
import { useAdvanceSection } from '@/hooks/ielts/useDiagnostic'
import DiagnosticError from './DiagnosticError'

const PARTS = ['part1', 'part2']

export default function DiagnosticSpeaking({ attempt, content }) {
  const speaking = content?.speaking || {}
  const [step, setStep] = useState(0) // 0=part1, 1=part2
  const [recordings, setRecordings] = useState(attempt?.speaking_submissions || {})
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const advance = useAdvanceSection()

  if (!attempt) return <DiagnosticError message="لا يوجد اختبار نشط" />

  const studentId = attempt.student_id
  const attemptId = attempt.id
  const part = PARTS[step]

  const part1Questions = speaking.part1?.questions || []
  const part2CueCard = speaking.part2?.cue_card || null

  const handleRecorded = useCallback(async (blob, mimeType, ext) => {
    setUploadError(null)
    setUploading(true)
    try {
      const fileName = `${attemptId}/${part}-${Date.now()}.${ext}`
      const fullPath = `${studentId}/${fileName}`
      const { error: uploadErr } = await supabase.storage
        .from('ielts-speaking-submissions')
        .upload(fullPath, blob, { contentType: mimeType, upsert: false })
      if (uploadErr) throw uploadErr

      const updatedSubs = { ...recordings, [part]: fullPath }
      setRecordings(updatedSubs)

      // Save path to attempt row
      const { error: saveErr } = await supabase
        .from('ielts_mock_attempts')
        .update({
          speaking_submissions: updatedSubs,
          auto_saved_at: new Date().toISOString(),
        })
        .eq('id', attemptId)
      if (saveErr) throw saveErr
    } catch (err) {
      setUploadError(err?.message || 'فشل الرفع')
    } finally {
      setUploading(false)
    }
  }, [part, attemptId, studentId, recordings])

  const handleNext = async () => {
    if (step < PARTS.length - 1) {
      setStep(s => s + 1)
    } else {
      await advance.mutateAsync({
        attemptId,
        nextSection: 'submitting',
        patch: { speaking_submissions: recordings },
      })
    }
  }

  const hasRecorded = !!recordings[part]
  const isLast = step === PARTS.length - 1

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <DiagnosticProgress currentSection="speaking" />
        <span style={{ fontSize: 13, fontFamily: 'Tajawal', color: 'var(--text-tertiary)' }}>
          {step + 1} / {PARTS.length}
        </span>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
        المحادثة — {part === 'part1' ? 'الجزء الأول' : 'الجزء الثاني'}
      </h2>

      {/* Part content */}
      {part === 'part1' && (
        <GlassPanel style={{ padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal', marginBottom: 12 }}>
            أجب على الأسئلة التالية:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {part1Questions.length > 0
              ? part1Questions.map((q, i) => (
                  <p key={i} style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, direction: 'ltr', textAlign: 'left', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                    {i + 1}. {q}
                  </p>
                ))
              : <p style={{ color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>أجب بشكل عام عن نفسك وعن حياتك اليومية باللغة الإنجليزية.</p>
            }
          </div>
        </GlassPanel>
      )}

      {part === 'part2' && (
        <GlassPanel style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(251,146,60,0.2)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal', marginBottom: 12 }}>
            البطاقة التوجيهية (Cue Card):
          </p>
          {part2CueCard ? (
            <div style={{ direction: 'ltr', textAlign: 'left' }}>
              {part2CueCard.topic && (
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                  {part2CueCard.topic}
                </p>
              )}
              {Array.isArray(part2CueCard.points) && (
                <ul style={{ paddingRight: 20, margin: 0 }}>
                  {part2CueCard.points.map((point, i) => (
                    <li key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{point}</li>
                  ))}
                </ul>
              )}
              {part2CueCard.follow_up && (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12, fontStyle: 'italic' }}>
                  {part2CueCard.follow_up}
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>تحدث عن موضوع تفضله لمدة دقيقتين.</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 12 }}>
            لديك دقيقة للتحضير ودقيقتان للحديث.
          </p>
        </GlassPanel>
      )}

      {/* Recorder */}
      <GlassPanel style={{ padding: 32, textAlign: 'center', marginBottom: 20 }}>
        {uploading ? (
          <p style={{ fontFamily: 'Tajawal', color: '#38bdf8', fontSize: 14 }}>جاري رفع التسجيل...</p>
        ) : (
          <AudioRecorder
            onRecorded={handleRecorded}
            maxSeconds={part === 'part1' ? 150 : 150}
            label={hasRecorded ? 'سجّل مرة أخرى' : 'اضغط للتسجيل'}
          />
        )}
        {uploadError && (
          <p style={{ color: '#ef4444', fontFamily: 'Tajawal', fontSize: 13, marginTop: 10 }}>
            ⚠️ {uploadError}
          </p>
        )}
        {hasRecorded && !uploading && (
          <p style={{ color: '#4ade80', fontFamily: 'Tajawal', fontSize: 13, marginTop: 10 }}>
            ✓ تم رفع التسجيل
          </p>
        )}
      </GlassPanel>

      <button
        onClick={handleNext}
        disabled={advance.isPending || uploading}
        style={{
          width: '100%', padding: '14px 24px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16,
          cursor: advance.isPending || uploading ? 'default' : 'pointer',
          background: hasRecorded ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)',
          color: hasRecorded ? '#38bdf8' : 'var(--text-tertiary)',
          border: `1.5px solid ${hasRecorded ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        {advance.isPending
          ? 'جاري الحفظ...'
          : isLast
          ? 'تم الاختبار — إرسال النتائج ←'
          : 'الجزء التالي ←'
        }
      </button>

      {!hasRecorded && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', textAlign: 'center', marginTop: 8 }}>
          يمكنك المتابعة بدون تسجيل — لكن هذا قد يؤثر على نتيجتك
        </p>
      )}
    </motion.div>
  )
}
