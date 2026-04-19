import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Mic } from 'lucide-react'
import { GlassPanel } from '@/design-system/components'
import { supabase } from '@/lib/supabase'
import SpeakingRecorder from '@/components/ielts/speaking/SpeakingRecorder'
import CueCardDisplay from '@/components/ielts/speaking/CueCardDisplay'
import PrepTimer from '@/components/ielts/speaking/PrepTimer'
import { useAutoSaveMockAttempt, useAdvanceMockSection } from '@/hooks/ielts/useMockCenter'

// Parts: part1 (3-4 Q, 5min), part2 (cue card, 60s prep+talk), part3 (3-4 Q, 5min)
const PART_LABELS = { part1: 'الجزء الأول', part2: 'الجزء الثاني', part3: 'الجزء الثالث' }
const PART_MIN_SEC = { part1: 8, part2: 45, part3: 8 }
const PART_MAX_SEC = { part1: 40, part2: 120, part3: 60 }

function flattenQuestions(partData) {
  if (!partData) return []
  // partData may be: array of { questions, id } OR { questions } OR array of strings
  if (Array.isArray(partData)) {
    return partData.flatMap(row => {
      const qs = Array.isArray(row.questions) ? row.questions : []
      return qs.map(q => (typeof q === 'string' ? q : q.q || ''))
    })
  }
  if (partData.questions) {
    const qs = Array.isArray(partData.questions) ? partData.questions : []
    return qs.map(q => (typeof q === 'string' ? q : q.q || ''))
  }
  return []
}

export default function MockSpeaking({ attempt, content, onAdvance }) {
  const speakingContent = content?.speaking || {}
  const part1Qs = flattenQuestions(speakingContent.part1)
  const part2Data = Array.isArray(speakingContent.part2) ? speakingContent.part2[0] : speakingContent.part2
  const cueCard = part2Data?.cue_card || null
  const part3Qs = flattenQuestions(speakingContent.part3)

  const PARTS = [
    { key: 'part1', questions: part1Qs, minSec: PART_MIN_SEC.part1, maxSec: PART_MAX_SEC.part1 },
    { key: 'part2', questions: [], minSec: PART_MIN_SEC.part2, maxSec: PART_MAX_SEC.part2, cueCard },
    { key: 'part3', questions: part3Qs, minSec: PART_MIN_SEC.part3, maxSec: PART_MAX_SEC.part3 },
  ]

  const [partIdx, setPartIdx] = useState(0)
  const [qIdx, setQIdx] = useState(0)
  const [stage, setStage] = useState('overview') // overview | prep | recording | part_done
  const [recordings, setRecordings] = useState({}) // { part1: {blob, mimeType, ext, duration}, ... }
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [micSkipped, setMicSkipped] = useState(false)

  const autoSave = useAutoSaveMockAttempt()
  const advance = useAdvanceMockSection()

  const currentPart = PARTS[partIdx]

  const handleRecorded = useCallback(async (blob, mimeType, extension, durationSec) => {
    const partKey = currentPart.key
    setUploading(true)
    setUploadError(null)
    try {
      const path = `${attempt.student_id}/${attempt.id}/${partKey}.${extension}`
      const { error: upErr } = await supabase.storage
        .from('ielts-speaking-submissions')
        .upload(path, blob, { contentType: mimeType, upsert: true })
      if (upErr) throw new Error(upErr.message)

      const updated = {
        ...recordings,
        [partKey]: { audio_path: path, audio_paths: [path], duration: durationSec, transcripts: [] },
      }
      setRecordings(updated)

      // Save to attempt
      await autoSave.mutateAsync({
        attemptId: attempt.id,
        patch: { speaking_submissions: updated },
      })
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }, [attempt.id, attempt.student_id, currentPart, recordings, autoSave])

  const goNextPart = useCallback(async () => {
    if (partIdx < PARTS.length - 1) {
      setPartIdx(i => i + 1)
      setQIdx(0)
      setStage('overview')
    } else {
      // All parts done → advance section
      await advance.mutateAsync({ attemptId: attempt.id, nextSection: 'submitting' })
      onAdvance?.()
    }
  }, [partIdx, PARTS.length, attempt.id, advance, onAdvance])

  const skipSpeaking = async () => {
    setMicSkipped(true)
    await advance.mutateAsync({ attemptId: attempt.id, nextSection: 'submitting' })
    onAdvance?.()
  }

  const allPartsRecorded = PARTS.every(p => recordings[p.key])

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }} dir="rtl">
      {/* Header */}
      <GlassPanel elevation={2} style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 4, letterSpacing: '0.05em' }}>
              IELTS SPEAKING — قسم المحادثة
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
              {PART_LABELS[currentPart.key]}
            </p>
          </div>
          {/* Part progress indicators */}
          <div style={{ display: 'flex', gap: 6 }}>
            {PARTS.map((p, i) => (
              <div
                key={p.key}
                style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'Tajawal',
                  background: recordings[p.key] ? 'rgba(74,222,128,0.15)' : i === partIdx ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                  border: recordings[p.key] ? '1.5px solid rgba(74,222,128,0.4)' : i === partIdx ? '1.5px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: recordings[p.key] ? '#4ade80' : i === partIdx ? '#ef4444' : 'var(--text-tertiary)',
                }}
              >
                {recordings[p.key] ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>

      <AnimatePresence mode="wait">

        {/* OVERVIEW stage */}
        {stage === 'overview' && (
          <motion.div key={`overview-${partIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 22, marginBottom: 16 }}>
              {currentPart.key === 'part2' && cueCard && <CueCardDisplay cueCard={cueCard} topic="" />}
              {currentPart.key !== 'part2' && currentPart.questions.length > 0 && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
                    الأسئلة في هذا الجزء:
                  </p>
                  {currentPart.questions.map((q, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.6 }}>
                        {i + 1}. {q}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setStage(currentPart.key === 'part2' ? 'prep' : 'recording')}
                style={{ width: '100%', marginTop: 16, padding: '13px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.35)', fontFamily: 'Tajawal', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
              >
                {currentPart.key === 'part2' ? 'ابدأ وقت التحضير (60 ثانية)' : `ابدأ تسجيل ${PART_LABELS[currentPart.key]}`}
              </button>
            </GlassPanel>
            {/* Skip mic option */}
            <GlassPanel style={{ padding: 14, textAlign: 'center', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
                مشكلة في الميكروفون؟
              </p>
              <button onClick={skipSpeaking} style={{ fontSize: 12, color: '#fb923c', fontFamily: 'Tajawal', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                تخطى قسم المحادثة (لن يُقيَّم)
              </button>
            </GlassPanel>
          </motion.div>
        )}

        {/* PREP stage (Part 2 only) */}
        {stage === 'prep' && (
          <motion.div key="prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 20, marginBottom: 14 }}>
              <CueCardDisplay cueCard={cueCard} topic="" />
            </GlassPanel>
            <PrepTimer durationSec={60} onDone={() => setStage('recording')} />
          </motion.div>
        )}

        {/* RECORDING stage */}
        {stage === 'recording' && (
          <motion.div key={`recording-${partIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 22, marginBottom: 16 }}>
              {currentPart.key === 'part2' && cueCard && (
                <div style={{ marginBottom: 18 }}>
                  <CueCardDisplay cueCard={cueCard} topic="" />
                </div>
              )}
              {currentPart.key !== 'part2' && currentPart.questions.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 10, letterSpacing: '0.04em' }}>
                    أجب على جميع الأسئلة في تسجيل واحد متواصل:
                  </p>
                  {currentPart.questions.map((q, i) => (
                    <p key={i} style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.7, marginBottom: 8 }}>
                      {i + 1}. {q}
                    </p>
                  ))}
                </div>
              )}

              <SpeakingRecorder
                key={currentPart.key}
                minSeconds={currentPart.minSec}
                maxSeconds={currentPart.maxSec}
                onRecorded={handleRecorded}
                disabled={uploading}
              />

              {uploadError && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Tajawal' }}>خطأ في الرفع: {uploadError}</p>
                </div>
              )}

              {recordings[currentPart.key] && !uploading && (
                <button
                  onClick={goNextPart}
                  style={{ width: '100%', marginTop: 16, padding: '12px 20px', borderRadius: 12, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.3)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  {partIdx < PARTS.length - 1
                    ? `${PART_LABELS[PARTS[partIdx + 1].key]} ←`
                    : 'تسليم الاختبار'
                  }
                </button>
              )}
            </GlassPanel>
          </motion.div>
        )}

      </AnimatePresence>

      {/* All done confirmation */}
      {allPartsRecorded && stage !== 'recording' && (
        <GlassPanel style={{ padding: 16, textAlign: 'center', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <CheckCircle size={20} style={{ color: '#4ade80', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal' }}>جميع أجزاء المحادثة مسجّلة ✓</p>
          <button
            onClick={goNextPart}
            style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.3)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            تسليم الاختبار
          </button>
        </GlassPanel>
      )}
    </div>
  )
}
