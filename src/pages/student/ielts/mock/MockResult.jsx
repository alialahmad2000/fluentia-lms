import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Volume2, AlertCircle, Loader } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useMockResult, useMockHistory } from '@/hooks/ielts/useMockCenter'
import { supabase } from '@/lib/supabase'

function bandColor(b) {
  if (b == null) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

function bandLabel(b) {
  if (b == null) return '–'
  return Number(b).toFixed(1)
}

function CriteriaBar({ label, value }) {
  const pct = Math.min(100, ((value || 0) / 9) * 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: bandColor(value), fontFamily: 'Tajawal' }}>{bandLabel(value)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: bandColor(value), borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function SkillCard({ label, icon, score, criteria, expandKey, expanded, onToggle }) {
  return (
    <GlassPanel style={{ padding: 18, border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: criteria ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>{label}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: bandColor(score), fontFamily: 'Tajawal', lineHeight: 1 }}>
            {score != null ? Number(score).toFixed(1) : '–'}
          </span>
          {criteria && (
            <button
              onClick={onToggle}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && criteria && (
          <motion.div
            key="crit"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {criteria.map(([k, lbl]) => (
                <CriteriaBar key={k} label={lbl} value={typeof k === 'number' ? k : criteria[k]} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  )
}

function WritingDetail({ writingFeedback }) {
  const [open, setOpen] = useState(false)
  if (!writingFeedback) return null
  const t1 = writingFeedback.task1 || writingFeedback
  const t2 = writingFeedback.task2 || {}
  return (
    <GlassPanel style={{ padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>تفاصيل الكتابة</p>
        {open ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div key="wd" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: 14 }}>
              {[['المهمة 1', t1], ['المهمة 2', t2]].map(([lbl, fb]) => (
                fb && (
                  <div key={lbl} style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 8, letterSpacing: '0.04em' }}>{lbl}</p>
                    {[
                      ['task_achievement', 'إنجاز المهمة'],
                      ['coherence_cohesion', 'التماسك والترابط'],
                      ['lexical_resource', 'الثروة اللغوية'],
                      ['grammatical_range', 'التنوع النحوي'],
                    ].map(([k, l]) => fb[k] != null && <CriteriaBar key={k} label={l} value={fb[k]} />)}
                    {fb.feedback_ar && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginTop: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        {fb.feedback_ar}
                      </p>
                    )}
                  </div>
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  )
}

function SpeakingDetail({ speakingFeedback }) {
  const [open, setOpen] = useState(false)
  if (!speakingFeedback) return null
  const parts = speakingFeedback.per_part || speakingFeedback
  const partKeys = Array.isArray(parts) ? parts.map((_, i) => `part${i + 1}`) : Object.keys(parts || {})
  return (
    <GlassPanel style={{ padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>تفاصيل المحادثة</p>
        {open ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div key="sd" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: 14 }}>
              {partKeys.map((pk, i) => {
                const fb = Array.isArray(parts) ? parts[i] : parts[pk]
                if (!fb) return null
                const label = pk === 'part1' ? 'الجزء الأول' : pk === 'part2' ? 'الجزء الثاني' : 'الجزء الثالث'
                return (
                  <div key={pk} style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 8, letterSpacing: '0.04em' }}>{label}</p>
                    {[
                      ['fluency_coherence', 'الطلاقة والتماسك'],
                      ['lexical_resource', 'الثروة اللغوية'],
                      ['grammatical_range', 'التنوع النحوي'],
                      ['pronunciation', 'النطق'],
                    ].map(([k, l]) => fb[k] != null && <CriteriaBar key={k} label={l} value={fb[k]} />)}
                    {fb.transcript && (
                      <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 4 }}>النص المحوّل</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.7 }}>{fb.transcript}</p>
                      </div>
                    )}
                    {fb.audio_path && <AudioPlayer path={fb.audio_path} />}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  )
}

function AudioPlayer({ path }) {
  const url = supabase.storage.from('ielts-speaking-submissions').getPublicUrl(path).data?.publicUrl
  if (!url) return null
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Volume2 size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      <audio controls src={url} style={{ flex: 1, height: 32, accentColor: '#38bdf8' }} />
    </div>
  )
}

function ComparisonBadge({ current, previous }) {
  if (previous == null || current == null) return null
  const diff = +(current - previous).toFixed(1)
  if (diff === 0) return (
    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
      نفس المستوى
    </span>
  )
  const up = diff > 0
  return (
    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: up ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', color: up ? '#4ade80' : '#ef4444', fontFamily: 'Tajawal', fontWeight: 700 }}>
      {up ? '+' : ''}{diff} {up ? '▲' : '▼'}
    </span>
  )
}

export default function MockResult() {
  const { resultId } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const resultQ = useMockResult(resultId, studentId)
  const historyQ = useMockHistory(studentId, 20)

  const [expanded, setExpanded] = useState({})
  const toggle = key => setExpanded(e => ({ ...e, [key]: !e[key] }))

  if (!studentId) return null

  if (resultQ.isLoading) {
    return (
      <div style={{ maxWidth: 700, margin: '80px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 48 }}>
          <Loader size={28} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري تحميل النتيجة…</p>
        </GlassPanel>
      </div>
    )
  }

  if (resultQ.isError || !resultQ.data) {
    return (
      <div style={{ maxWidth: 700, margin: '80px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', fontFamily: 'Tajawal', marginBottom: 12 }}>تعذّر تحميل النتيجة</p>
          <button onClick={() => navigate('/student/ielts/mock')} style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            مركز الاختبارات
          </button>
        </GlassPanel>
      </div>
    )
  }

  const result = resultQ.data
  const history = historyQ.data || []

  // Previous result (second most recent with result_type=mock)
  const sortedHistory = [...history].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
  const thisIdx = sortedHistory.findIndex(r => r.id === resultId)
  const prevResult = thisIdx >= 0 ? sortedHistory[thisIdx + 1] : sortedHistory[1]
  const isFirst = !prevResult || history.length === 1

  const overall = result.overall_band ? Number(result.overall_band) : null
  const prevOverall = prevResult?.overall_band ? Number(prevResult.overall_band) : null

  const celebrationEmoji = isFirst ? '🎓' : (overall != null && prevOverall != null && overall > prevOverall) ? '🎉' : '📊'
  const celebrationMsg = isFirst
    ? 'أول اختبار تجريبي لك!'
    : (overall != null && prevOverall != null && overall > prevOverall)
    ? `تحسّن ${+(overall - prevOverall).toFixed(1)} نقطة منذ آخر اختبار`
    : 'نتيجة اختبارك التجريبي'

  const wf = result.writing_feedback || {}
  const sf = result.speaking_feedback || {}

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

      {/* Hero */}
      <GlassPanel elevation={2} style={{ padding: 32, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>{celebrationEmoji}</div>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 4 }}>{celebrationMsg}</p>
        <div style={{ fontSize: 72, fontWeight: 900, color: bandColor(overall), fontFamily: 'Tajawal', lineHeight: 1, marginBottom: 6 }}>
          {overall != null ? overall.toFixed(1) : '–'}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: prevResult ? 12 : 0 }}>
          Band Score الإجمالي
        </p>
        {prevResult && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              آخر اختبار: {prevOverall?.toFixed(1)}
            </span>
            <ComparisonBadge current={overall} previous={prevOverall} />
          </div>
        )}
      </GlassPanel>

      {/* Skill cards */}
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 12, letterSpacing: '0.04em' }}>
        النتائج التفصيلية
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <SkillCard
          label="الاستماع" icon="🎧" score={result.listening_score}
          expandKey="listening" expanded={expanded.listening} onToggle={() => toggle('listening')}
        />
        <SkillCard
          label="القراءة" icon="📖" score={result.reading_score}
          expandKey="reading" expanded={expanded.reading} onToggle={() => toggle('reading')}
        />
        <SkillCard
          label="الكتابة" icon="✍️" score={result.writing_score}
          expandKey="writing" expanded={expanded.writing} onToggle={() => toggle('writing')}
          criteria={
            result.writing_score != null
              ? [
                  ['task_achievement', 'إنجاز المهمة'],
                  ['coherence_cohesion', 'التماسك'],
                  ['lexical_resource', 'المفردات'],
                  ['grammatical_range', 'النحو'],
                ].map(([k, l]) => [wf.task2?.[k] ?? wf[k], l])
              : null
          }
        />
        <SkillCard
          label="المحادثة" icon="🎙️" score={result.speaking_score}
          expandKey="speaking" expanded={expanded.speaking} onToggle={() => toggle('speaking')}
          criteria={
            result.speaking_score != null
              ? [
                  [sf.part1?.fluency_coherence ?? sf.fluency_coherence, 'الطلاقة'],
                  [sf.part1?.lexical_resource ?? sf.lexical_resource, 'المفردات'],
                  [sf.part1?.grammatical_range ?? sf.grammatical_range, 'النحو'],
                  [sf.part1?.pronunciation ?? sf.pronunciation, 'النطق'],
                ]
              : null
          }
        />
      </div>

      {/* Comparison with previous */}
      {prevResult && (
        <GlassPanel style={{ padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 12, letterSpacing: '0.04em' }}>
            مقارنة مع الاختبار السابق
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              ['listening_score', '🎧', 'استماع'],
              ['reading_score', '📖', 'قراءة'],
              ['writing_score', '✍️', 'كتابة'],
              ['speaking_score', '🎙️', 'محادثة'],
            ].map(([k, icon, lbl]) => {
              const cur = result[k] != null ? Number(result[k]) : null
              const prev = prevResult[k] != null ? Number(prevResult[k]) : null
              const diff = cur != null && prev != null ? +(cur - prev).toFixed(1) : null
              return (
                <div key={k} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: bandColor(cur), fontFamily: 'Tajawal' }}>{cur != null ? cur.toFixed(1) : '–'}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 2 }}>{lbl}</div>
                  {diff != null && (
                    <div style={{ fontSize: 10, color: diff > 0 ? '#4ade80' : diff < 0 ? '#ef4444' : 'var(--text-tertiary)', fontFamily: 'Tajawal', fontWeight: 700 }}>
                      {diff > 0 ? '+' : ''}{diff}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </GlassPanel>
      )}

      {/* Strengths / Weaknesses */}
      {(result.strengths?.length > 0 || result.weaknesses?.length > 0) && (
        <GlassPanel style={{ padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {result.strengths?.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal', marginBottom: 8 }}>نقاط القوة</p>
                {result.strengths.map((s, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.6, marginBottom: 4 }}>
                    • {s}
                  </p>
                ))}
              </div>
            )}
            {result.weaknesses?.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal', marginBottom: 8 }}>نقاط التحسين</p>
                {result.weaknesses.map((w, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.6, marginBottom: 4 }}>
                    • {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        </GlassPanel>
      )}

      {/* Expandable section details */}
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 12, letterSpacing: '0.04em' }}>
        التغذية الراجعة التفصيلية
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <WritingDetail writingFeedback={result.writing_feedback} />
        <SpeakingDetail speakingFeedback={result.speaking_feedback} />
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/student/ielts/mock')}
          style={{ flex: 1, minWidth: 140, padding: '13px 18px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1.5px solid rgba(56,189,248,0.35)', fontFamily: 'Tajawal', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
        >
          اختبار جديد
        </button>
        <button
          onClick={() => navigate('/student/ielts')}
          style={{ flex: 1, minWidth: 140, padding: '13px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          لوحة IELTS
        </button>
        <button
          disabled
          style={{ flex: 1, minWidth: 140, padding: '13px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', color: 'var(--text-tertiary)', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'default', opacity: 0.5 }}
        >
          تحديث خطتي
        </button>
      </div>
    </motion.div>
  )
}
