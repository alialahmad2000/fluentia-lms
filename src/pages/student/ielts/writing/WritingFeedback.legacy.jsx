import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useWritingSubmission } from '@/hooks/ielts/useWritingLab'

const CRITERIA_MAP = {
  task1: [
    { key: 'task_achievement', label_ar: 'تحقيق المهمة', label_en: 'Task Achievement' },
    { key: 'coherence_cohesion', label_ar: 'التماسك والترابط', label_en: 'Coherence & Cohesion' },
    { key: 'lexical_resource', label_ar: 'الثروة المعجمية', label_en: 'Lexical Resource' },
    { key: 'grammatical_range', label_ar: 'الدقة النحوية', label_en: 'Grammatical Range & Accuracy' },
  ],
  task2: [
    { key: 'task_response', label_ar: 'الاستجابة للمهمة', label_en: 'Task Response' },
    { key: 'coherence_cohesion', label_ar: 'التماسك والترابط', label_en: 'Coherence & Cohesion' },
    { key: 'lexical_resource', label_ar: 'الثروة المعجمية', label_en: 'Lexical Resource' },
    { key: 'grammatical_range', label_ar: 'الدقة النحوية', label_en: 'Grammatical Range & Accuracy' },
  ],
}

function bandColor(b) {
  if (!b) return '#38bdf8'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

function BandBar({ label_ar, label_en, score }) {
  const b = score != null ? Number(score) : null
  const pct = b ? (b / 9) * 100 : 0
  const color = bandColor(b)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{label_ar}</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>{label_en}</p>
        </div>
        <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'Tajawal' }}>
          {b != null ? b.toFixed(1) : '—'}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6 }} />
      </div>
    </div>
  )
}

function CorrectionCard({ error, correction, rule_ar }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
        <XCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: '#ef4444', direction: 'ltr', textAlign: 'left', fontFamily: 'sans-serif' }}>
          {error}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: rule_ar ? 6 : 0 }}>
        <CheckCircle size={14} style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: '#4ade80', direction: 'ltr', textAlign: 'left', fontFamily: 'sans-serif' }}>
          {correction}
        </p>
      </div>
      {rule_ar && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 4 }}>
          💡 {rule_ar}
        </p>
      )}
    </div>
  )
}

function ModelAnswerAccordion({ task }) {
  const [open, setOpen] = useState(null)
  const answers = [
    task?.model_answer_band6 ? { label: 'Band 6 نموذج', body: task.model_answer_band6 } : null,
    task?.model_answer_band7 ? { label: 'Band 7 نموذج', body: task.model_answer_band7 } : null,
    task?.model_answer_band8 ? { label: 'Band 8 نموذج', body: task.model_answer_band8 } : null,
  ].filter(Boolean)

  if (answers.length === 0) return null

  return (
    <GlassPanel style={{ padding: 20, marginTop: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
        نماذج الإجابات
      </p>
      {answers.map((a, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {a.label}
            {open === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {open === i && (
            <div style={{ marginTop: 8, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <pre style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', fontFamily: 'sans-serif', margin: 0 }}>
                {a.body}
              </pre>
            </div>
          )}
        </div>
      ))}
    </GlassPanel>
  )
}

export default function WritingFeedback() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const { data: submission, isLoading, isError } = useWritingSubmission(studentId, submissionId)

  if (!studentId) return null
  if (isLoading) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }} dir="rtl">
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 100, background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }
  if (isError || !submission) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 40 }}>
          <p style={{ fontFamily: 'Tajawal', fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>لم يتم العثور على نتيجة التقييم</p>
          <button onClick={() => navigate('/student/ielts/writing')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>رجوع</button>
        </GlassPanel>
      </div>
    )
  }

  const fb = submission.ai_feedback || {}
  const band = submission.band_score != null ? Number(submission.band_score) : null
  const bColor = bandColor(band)
  const task = submission.task
  const taskType = submission.submission_type === 'writing_task2' ? 'task2' : 'task1'
  const criteria = CRITERIA_MAP[taskType]

  const grammarErrors = Array.isArray(fb.grammar_errors) ? fb.grammar_errors : []
  const vocabSuggestions = Array.isArray(fb.vocabulary_suggestions) ? fb.vocabulary_suggestions : []
  const improvementTips = Array.isArray(fb.improvement_tips_ar) ? fb.improvement_tips_ar : []
  const paragraphFeedback = Array.isArray(fb.paragraph_feedback) ? fb.paragraph_feedback : []

  const category = taskType === 'task2' ? 'task2'
    : submission.test_variant === 'general_training' ? 'task1-gt' : 'task1-academic'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/writing')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        معمل الكتابة
      </button>

      {/* Overall band */}
      <GlassPanel elevation={2} style={{ padding: 32, marginBottom: 16, textAlign: 'center', border: `1px solid ${bColor}22` }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
          {taskType === 'task2' ? '📝 Task 2' : '📊 Task 1'} — {task?.title || ''}
        </p>
        <div style={{ fontSize: 64, fontWeight: 900, color: bColor, fontFamily: 'Tajawal', lineHeight: 1, marginBottom: 8 }}>
          {band != null ? band.toFixed(1) : '—'}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 20 }}>
          Band Score · {submission.word_count ? `${submission.word_count} كلمة` : ''}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/student/ielts/writing/${category}/task/${submission.source_id}`)}
            style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.3)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            جرب مهمة أخرى →
          </button>
          <button
            onClick={() => navigate('/student/ielts/writing')}
            style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            معمل الكتابة
          </button>
        </div>
      </GlassPanel>

      {/* 4 criteria bars */}
      <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
          معايير التقييم
        </p>
        {criteria.map(c => (
          <BandBar
            key={c.key}
            label_ar={c.label_ar}
            label_en={c.label_en}
            score={fb[c.key]?.score}
          />
        ))}
      </GlassPanel>

      {/* Overall feedback */}
      {fb.overall_feedback_ar && (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
            التقييم العام
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1.9 }}>
            {fb.overall_feedback_ar}
          </p>
        </GlassPanel>
      )}

      {/* Paragraph feedback */}
      {paragraphFeedback.length > 0 && (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
            تقييم الفقرات
          </p>
          {paragraphFeedback.map((pf, i) => (
            <div key={i} style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', direction: 'ltr', textAlign: 'left' }}>
                  الفقرة {i + 1}
                </p>
                {pf.score_label && (
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Tajawal', padding: '2px 8px', borderRadius: 6, background: pf.score_label === 'ممتاز' ? 'rgba(74,222,128,0.15)' : pf.score_label === 'جيد' ? 'rgba(56,189,248,0.15)' : 'rgba(251,146,60,0.15)', color: pf.score_label === 'ممتاز' ? '#4ade80' : pf.score_label === 'جيد' ? '#38bdf8' : '#fb923c' }}>
                    {pf.score_label}
                  </span>
                )}
              </div>
              {pf.feedback_ar && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>
                  {pf.feedback_ar}
                </p>
              )}
            </div>
          ))}
        </GlassPanel>
      )}

      {/* Grammar errors */}
      {grammarErrors.length > 0 && (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
            تصحيحات نحوية ({grammarErrors.length})
          </p>
          {grammarErrors.map((g, i) => (
            <CorrectionCard key={i} error={g.error} correction={g.correction} rule_ar={g.rule_ar} />
          ))}
        </GlassPanel>
      )}

      {/* Vocabulary suggestions */}
      {vocabSuggestions.length > 0 && (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
            اقتراحات المفردات
          </p>
          {vocabSuggestions.map((v, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4, direction: 'ltr', textAlign: 'left' }}>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>{v.original}</span>
                <span style={{ color: '#a78bfa' }}>→</span>
                <span style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600, fontFamily: 'sans-serif' }}>{v.better}</span>
              </div>
              {v.reason_ar && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{v.reason_ar}</p>}
            </div>
          ))}
        </GlassPanel>
      )}

      {/* Improvement tips */}
      {improvementTips.length > 0 && (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
            خطوات التحسين
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {improvementTips.map((tip, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'Tajawal', display: 'flex', gap: 8, lineHeight: 1.7 }}>
                <span style={{ color: '#a78bfa', flexShrink: 0 }}>↗</span> {tip}
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      {/* Model answers */}
      {task && <ModelAnswerAccordion task={task} />}
    </motion.div>
  )
}
