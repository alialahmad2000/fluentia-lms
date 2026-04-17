import { useEffect } from 'react'
import { X, Eye, EyeOff, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { VariantPill } from './VariantPill'

const diffLabel = (band) => {
  const map = { band_5_6: 'Band 5–6', band_6_7: 'Band 6–7', band_7_8: 'Band 7–8' }
  return map[band] || band || '—'
}

export default function PreviewModal({ contentType, contentData, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#0b1426', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
        >
          <X size={16} />
        </button>

        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
          معاينة كما يراه الطالب
        </p>

        {contentType === 'passage' && <ReadingPreview data={contentData} />}
        {contentType === 'writing' && <WritingPreview data={contentData} />}
        {contentType === 'listening' && <ListeningPreview data={contentData} />}
        {contentType === 'speaking' && <SpeakingPreview data={contentData} />}
      </div>
    </div>
  )
}

function ReadingPreview({ data }) {
  const [showAnswers, setShowAnswers] = useState(false)
  const questions = Array.isArray(data.questions) ? data.questions : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{data.title}</h2>
        <VariantPill variant={data.test_variant} />
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{diffLabel(data.difficulty_band)}</span>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>{data.topic_category} · {data.time_limit_minutes} دقيقة</p>
      <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }} dir="ltr">
        {data.content || 'لا يوجد نص'}
      </div>
      {questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>الأسئلة ({questions.length})</p>
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg p-3 text-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} dir="ltr">
              {typeof q === 'string' ? q : JSON.stringify(q)}
            </div>
          ))}
          <button onClick={() => setShowAnswers(s => !s)} className="flex items-center gap-2 text-xs mt-2" style={{ color: '#38bdf8', fontFamily: 'Tajawal' }}>
            {showAnswers ? <EyeOff size={12} /> : <Eye size={12} />}
            {showAnswers ? 'إخفاء الإجابات' : 'عرض الإجابات'}
          </button>
          {showAnswers && data.answer_key && (
            <pre className="text-xs rounded-lg p-3 overflow-auto" style={{ background: 'rgba(56,189,248,0.06)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }} dir="ltr">
              {JSON.stringify(data.answer_key, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function WritingPreview({ data }) {
  const [openBand, setOpenBand] = useState(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
          {data.task_type === 'task1' ? 'Task 1' : 'Task 2'}
        </span>
        <VariantPill variant={data.test_variant} />
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{diffLabel(data.difficulty_band)}</span>
      </div>
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{data.title || data.sub_type}</h2>
      {data.image_url && <img src={data.image_url} alt="chart" className="w-full rounded-xl" style={{ maxHeight: 240, objectFit: 'contain' }} />}
      <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }} dir="ltr">
        {data.prompt}
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الحد الأدنى: {data.word_count_target} كلمة · {data.time_limit_minutes} دقيقة</p>
      {[6, 7, 8].map(band => (
        <div key={band}>
          <button onClick={() => setOpenBand(openBand === band ? null : band)} className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
            إجابة نموذجية Band {band} {openBand === band ? '▲' : '▼'}
          </button>
          {openBand === band && (
            <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }} dir="ltr">
              {data[`model_answer_band${band}`] || '—'}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ListeningPreview({ data }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const questions = Array.isArray(data.questions) ? data.questions : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
          Section {data.section_number}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{data.accent}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{data.speaker_count} متحدث</span>
      </div>
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{data.title}</h2>
      {data.audio_url && (
        <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <Volume2 size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
          <audio controls src={data.audio_url} className="flex-1" style={{ height: 32 }} />
        </div>
      )}
      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>{data.context_description}</p>
      {questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>الأسئلة ({questions.length})</p>
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg p-3 text-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} dir="ltr">
              {typeof q === 'string' ? q : JSON.stringify(q)}
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setShowTranscript(s => !s)} className="flex items-center gap-2 text-xs" style={{ color: '#38bdf8', fontFamily: 'Tajawal' }}>
        {showTranscript ? <EyeOff size={12} /> : <Eye size={12} />}
        {showTranscript ? 'إخفاء النص' : 'عرض النص المكتوب'}
      </button>
      {showTranscript && data.transcript && (
        <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }} dir="ltr">
          {data.transcript}
        </div>
      )}
    </div>
  )
}

function SpeakingPreview({ data }) {
  const questions = Array.isArray(data.questions) ? data.questions : []
  const followUps = Array.isArray(data.follow_up_questions) ? data.follow_up_questions : []
  const phrases = Array.isArray(data.useful_phrases) ? data.useful_phrases : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
          Part {data.part}
        </span>
      </div>
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{data.topic}</h2>
      {questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>الأسئلة</p>
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg p-3 text-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} dir="ltr">
              {typeof q === 'string' ? q : (q.q || JSON.stringify(q))}
            </div>
          ))}
        </div>
      )}
      {data.part === 2 && data.cue_card && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <p className="text-xs font-bold mb-2" style={{ color: '#fbbf24', fontFamily: 'Tajawal' }}>بطاقة الموضوع</p>
          <pre className="text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }} dir="ltr">
            {typeof data.cue_card === 'object' ? JSON.stringify(data.cue_card, null, 2) : data.cue_card}
          </pre>
        </div>
      )}
      {followUps.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>أسئلة المتابعة</p>
          {followUps.map((q, i) => (
            <div key={i} className="rounded-lg p-2 text-sm mb-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} dir="ltr">
              {typeof q === 'string' ? q : JSON.stringify(q)}
            </div>
          ))}
        </div>
      )}
      {phrases.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>عبارات مفيدة</p>
          <div className="flex flex-wrap gap-2">
            {phrases.map((p, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(56,189,248,0.08)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }} dir="ltr">{p}</span>
            ))}
          </div>
        </div>
      )}
      {data.model_answer_audio_url && (
        <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <Volume2 size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
          <audio controls src={data.model_answer_audio_url} className="flex-1" style={{ height: 32 }} />
        </div>
      )}
    </div>
  )
}
