import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { ChevronLeft, Play, Pause, Mic } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useSpeakingSession } from '@/hooks/ielts/useSpeakingLab'
import { supabase } from '@/lib/supabase'

const CRITERIA = [
  { key: 'fluency_coherence', label_ar: 'الطلاقة والتماسك', en: 'Fluency & Coherence' },
  { key: 'lexical_resource', label_ar: 'الثروة اللغوية', en: 'Lexical Resource' },
  { key: 'grammatical_range', label_ar: 'النطاق النحوي', en: 'Grammatical Range & Accuracy' },
  { key: 'pronunciation', label_ar: 'النطق', en: 'Pronunciation' },
]

function bandColor(b) {
  if (!b) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

function BandBar({ criterion, score }) {
  const pct = score != null ? (score / 9) * 100 : 0
  const color = bandColor(score)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{criterion.label_ar}</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>{criterion.en}</p>
        </div>
        <span style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'Tajawal', lineHeight: 1 }}>
          {score != null ? score.toFixed(1) : '—'}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function AudioPlayer({ path, label }) {
  const [url, setUrl] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef(null)

  const load = async () => {
    if (url) return
    setLoading(true)
    const { data } = supabase.storage.from('ielts-speaking-submissions').getPublicUrl(path)
    setUrl(data?.publicUrl || null)
    setLoading(false)
  }

  const toggle = async () => {
    await load()
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      await audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={toggle}
        disabled={loading}
        style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', cursor: 'pointer', flexShrink: 0 }}
      >
        {loading ? '…' : playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', flex: 1 }}>{label}</p>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onEnded={() => setPlaying(false)}
          style={{ display: 'none' }}
        />
      )}
    </div>
  )
}

function TranscriptCard({ qText, transcript, audioPath, idx, isPartTwo }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 10 }}>
      {!isPartTwo && (
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', marginBottom: 8 }}>
          Q{idx + 1}: {qText}
        </p>
      )}
      {isPartTwo && (
        <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', fontFamily: 'Tajawal', marginBottom: 8 }}>
          الحديث المتواصل
        </p>
      )}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.7, marginBottom: audioPath ? 10 : 0, whiteSpace: 'pre-wrap' }}>
        {transcript || '(لا يوجد نص)'}
      </p>
      {audioPath && <AudioPlayer path={audioPath} label={`Recording ${idx + 1}`} />}
    </div>
  )
}

export default function SpeakingFeedback() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const sessionQ = useSpeakingSession(sessionId, studentId)

  if (!studentId) return null

  if (sessionQ.isLoading) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 40 }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري تحميل النتائج…</p>
        </GlassPanel>
      </div>
    )
  }

  if (sessionQ.isError || !sessionQ.data) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', fontFamily: 'Tajawal', marginBottom: 12 }}>لم يتم العثور على النتائج</p>
          <button onClick={() => navigate('/student/ielts/speaking')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            العودة لمعمل المحادثة
          </button>
        </GlassPanel>
      </div>
    )
  }

  const session = sessionQ.data
  const sd = session.session_data || {}
  const band = session.band_score != null ? Number(session.band_score) : null
  const bColor = bandColor(band)
  const criteria = sd.criteria || {}
  const transcripts = sd.transcripts || []
  const audioPaths = sd.audio_paths || []
  const questions = sd.questions || []
  const strengths = sd.strengths || []
  const weaknesses = sd.weaknesses || []
  const feedbackAr = sd.feedback_ar || ''
  const partNum = sd.part_num || Number(session.question_type?.replace('part_', ''))
  const isPartTwo = partNum === 2

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

      {/* Band score hero */}
      <GlassPanel elevation={2} style={{ padding: 28, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${bColor}18`, border: `2px solid ${bColor}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Mic size={26} style={{ color: bColor }} />
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: bColor, fontFamily: 'Tajawal', lineHeight: 1, marginBottom: 8 }}>
          {band != null ? band.toFixed(1) : '—'}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          {partNum ? `الجزء ${partNum === 1 ? 'الأول' : partNum === 2 ? 'الثاني' : 'الثالث'}` : 'Speaking'}
        </p>
      </GlassPanel>

      {/* 4 criteria */}
      <GlassPanel style={{ padding: 22, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', letterSpacing: '0.04em', marginBottom: 16 }}>
          معايير التقييم
        </p>
        {CRITERIA.map(c => (
          <BandBar key={c.key} criterion={c} score={criteria[c.key] != null ? Number(criteria[c.key]) : null} />
        ))}
      </GlassPanel>

      {/* Feedback in Arabic */}
      {feedbackAr && (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
            التغذية الراجعة
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.8 }}>
            {feedbackAr}
          </p>
        </GlassPanel>
      )}

      {/* Strengths & Weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {strengths.length > 0 && (
            <GlassPanel style={{ padding: 16, background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal', marginBottom: 10 }}>نقاط قوة</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {strengths.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.6, display: 'flex', gap: 6 }}>
                    <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span> {s}
                  </li>
                ))}
              </ul>
            </GlassPanel>
          )}
          {weaknesses.length > 0 && (
            <GlassPanel style={{ padding: 16, background: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.15)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal', marginBottom: 10 }}>نقاط للتطوير</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {weaknesses.map((w, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.6, display: 'flex', gap: 6 }}>
                    <span style={{ color: '#fb923c', flexShrink: 0 }}>△</span> {w}
                  </li>
                ))}
              </ul>
            </GlassPanel>
          )}
        </div>
      )}

      {/* Transcripts + audio */}
      {transcripts.length > 0 && (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', letterSpacing: '0.04em', marginBottom: 14 }}>
            ما قلته — النص الكامل
          </p>
          {transcripts.map((t, i) => (
            <TranscriptCard
              key={i}
              idx={i}
              qText={questions[i] || ''}
              transcript={typeof t === 'string' ? t : t?.text || ''}
              audioPath={audioPaths[i] || null}
              isPartTwo={isPartTwo}
            />
          ))}
        </GlassPanel>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate(`/student/ielts/speaking/part/${partNum}`)}
          style={{ flex: 1, padding: '12px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          جلسة جديدة
        </button>
        <button
          onClick={() => navigate('/student/ielts/speaking')}
          style={{ flex: 1, padding: '12px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          لوحة Speaking
        </button>
      </div>
    </motion.div>
  )
}
