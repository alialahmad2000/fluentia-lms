import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Loader2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Send, PenLine, Mic, BookOpen, FileText, Brain, Target,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

// Score → Grade mapping
function scoreToGrade(score) {
  if (score >= 9) return { grade: 'A+', numeric: 97 }
  if (score >= 8) return { grade: 'A', numeric: 92 }
  if (score >= 7) return { grade: 'B+', numeric: 87 }
  if (score >= 6) return { grade: 'B', numeric: 82 }
  if (score >= 5) return { grade: 'C', numeric: 75 }
  if (score >= 4) return { grade: 'D', numeric: 65 }
  return { grade: 'F', numeric: 45 }
}

function scoreColor(score) {
  if (score >= 8) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (score >= 6) return 'text-gold-400 border-gold-500/30 bg-gold-500/10'
  return 'text-red-400 border-red-500/30 bg-red-500/10'
}

const TYPE_ICONS = {
  writing: PenLine,
  speaking: Mic,
  listening: Mic,
  reading: BookOpen,
  grammar: FileText,
  vocabulary: Brain,
  custom: Target,
  irregular_verbs: Target,
}

export default function AISubmissionFeedback({
  submission,
  assignmentType,
  existingFeedback,
  onApproveAndSend,
  onApproveAndEdit,
}) {
  const [feedback, setFeedback] = useState(existingFeedback || null)
  const [transcript, setTranscript] = useState(submission?.content_voice_transcript || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(!!existingFeedback)
  const [approving, setApproving] = useState(false)

  async function requestFeedback() {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await invokeWithRetry('ai-submission-feedback', {
        body: { submission_id: submission.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }, { timeoutMs: 45000, retries: 1 })

      const result = res.data
      if (res.error) {
        const bodyError = result?.error
        if (bodyError) { setError(typeof bodyError === 'string' ? bodyError : 'خطأ في التحليل'); return }
        const msg = typeof res.error === 'object' ? (res.error.message || 'خطأ في الاتصال') : String(res.error)
        throw new Error(msg)
      }

      if (!result || typeof result !== 'object') throw new Error('Invalid response')
      if (result.error) { setError(typeof result.error === 'string' ? result.error : 'خطأ في التحليل'); return }

      let fb = result.feedback
      if (!fb) throw new Error('لم يتم استلام تقييم من الذكاء الاصطناعي')
      // Parse if it's a string (shouldn't happen but safety)
      if (typeof fb === 'string') {
        try {
          fb = JSON.parse(fb.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''))
        } catch {
          fb = { overall_score: 5, overall_feedback: fb, trainer_feedback_text: fb }
        }
      }

      setFeedback(fb)
      if (result.transcript) setTranscript(result.transcript)
      setExpanded(true)
    } catch (err) {
      console.error('[AISubmissionFeedback]', err)
      setError('التقييم التلقائي غير متاح حالياً — حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveAndSend() {
    if (!feedback) return
    setApproving(true)
    try {
      const { grade, numeric } = scoreToGrade(feedback.overall_score || 5)
      await onApproveAndSend({
        grade,
        gradeNumeric: numeric,
        trainerFeedback: feedback.trainer_feedback_text || feedback.overall_feedback || '',
        aiFeedback: feedback,
      })
    } finally {
      setApproving(false)
    }
  }

  function handleApproveAndEdit() {
    if (!feedback) return
    const { grade, numeric } = scoreToGrade(feedback.overall_score || 5)
    onApproveAndEdit({
      grade,
      gradeNumeric: numeric,
      trainerFeedback: feedback.trainer_feedback_text || feedback.overall_feedback || '',
      aiFeedback: feedback,
    })
  }

  const TypeIcon = TYPE_ICONS[assignmentType] || Target
  const score = feedback?.overall_score

  return (
    <div className="space-y-3">
      {/* Request button */}
      {!feedback && (
        <button
          onClick={requestFeedback}
          disabled={loading}
          className="btn-secondary text-sm py-2.5 flex items-center gap-2 w-full justify-center"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} className="text-violet-400" />
          )}
          {loading ? 'جاري التحليل بالذكاء الاصطناعي...' : 'تحليل بالذكاء الاصطناعي'}
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-3 py-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Transcript (for speaking/listening) */}
      {transcript && (
        <div className="glass-card p-4">
          <p className="text-sm text-muted mb-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Mic size={12} className="text-violet-400" />
            </div>
            التفريغ النصي
          </p>
          <p className="text-sm text-white leading-relaxed" dir="ltr">{transcript}</p>
        </div>
      )}

      {/* Feedback card */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
          >
            {/* Header with score */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-violet-400" />
                </div>
                <span className="text-sm font-semibold text-white">تقييم الذكاء الاصطناعي</span>
                {score && (
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${scoreColor(score)}`}>
                    {score}
                  </div>
                )}
              </div>
              {expanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
            </button>

            {expanded && (
              <div className="px-5 pb-5 space-y-4">
                {/* Overall feedback */}
                {feedback.overall_feedback && (
                  <p className="text-sm text-white/90 leading-relaxed">{feedback.overall_feedback}</p>
                )}

                {/* ── Writing-specific sections ── */}
                {feedback.grammar_errors?.length > 0 && (
                  <FeedbackSection title="أخطاء نحوية" color="red">
                    {feedback.grammar_errors.map((e, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-3 text-xs">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="text-red-400 line-through" dir="ltr">{e.error}</span>
                          <span className="text-emerald-400" dir="ltr">{e.correction}</span>
                        </div>
                        {e.rule && <p className="text-muted mt-1.5">{e.rule}</p>}
                      </div>
                    ))}
                  </FeedbackSection>
                )}

                {feedback.vocabulary_suggestions?.length > 0 && (
                  <FeedbackSection title="اقتراحات مفردات" color="sky">
                    {feedback.vocabulary_suggestions.map((v, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-3 text-xs">
                        <span className="text-muted" dir="ltr">{v.original}</span>
                        <span className="text-muted mx-1">←</span>
                        <span className="text-sky-400 font-medium" dir="ltr">{v.better}</span>
                        {v.reason && <p className="text-muted mt-1">{v.reason}</p>}
                      </div>
                    ))}
                  </FeedbackSection>
                )}

                {feedback.structure_assessment && (
                  <FeedbackSection title="تقييم البنية" color="gold" single>
                    <p className="text-xs text-muted">{feedback.structure_assessment}</p>
                  </FeedbackSection>
                )}

                {feedback.corrected_text && (
                  <FeedbackSection title="النص المصحح" color="emerald" single>
                    <p className="text-xs text-white/80 leading-relaxed" dir="ltr">{feedback.corrected_text}</p>
                  </FeedbackSection>
                )}

                {/* ── Speaking-specific sections ── */}
                {feedback.fluency_assessment && (
                  <FeedbackSection title="تقييم الطلاقة" color="sky" single>
                    <p className="text-xs text-muted">{feedback.fluency_assessment}</p>
                  </FeedbackSection>
                )}

                {feedback.confidence_level && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">مستوى الثقة:</span>
                    <span className={`text-sm font-medium ${
                      feedback.confidence_level === 'ممتازة' ? 'text-gold-400' :
                      feedback.confidence_level === 'جيدة' ? 'text-emerald-400' :
                      feedback.confidence_level === 'متوسطة' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {feedback.confidence_level}
                    </span>
                  </div>
                )}

                {feedback.vocabulary_range && (
                  <FeedbackSection title="تنوع المفردات" color="gold" single>
                    <p className="text-xs text-muted">{feedback.vocabulary_range}</p>
                  </FeedbackSection>
                )}

                {feedback.pronunciation_notes && (
                  <FeedbackSection title="ملاحظات النطق" color="violet" single>
                    <p className="text-xs text-muted">{feedback.pronunciation_notes}</p>
                  </FeedbackSection>
                )}

                {feedback.grammar_notes?.length > 0 && (
                  <FeedbackSection title="ملاحظات نحوية" color="red">
                    {feedback.grammar_notes.map((n, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-3 text-xs">
                        <p className="text-white">{n.issue}</p>
                        <p className="text-emerald-400 mt-1">{n.suggestion}</p>
                      </div>
                    ))}
                  </FeedbackSection>
                )}

                {/* ── Listening-specific ── */}
                {feedback.comprehension_assessment && (
                  <FeedbackSection title="تقييم الاستيعاب" color="sky" single>
                    <p className="text-xs text-muted">{feedback.comprehension_assessment}</p>
                  </FeedbackSection>
                )}

                {feedback.listening_tips?.length > 0 && (
                  <FeedbackSection title="نصائح الاستماع" color="violet">
                    {feedback.listening_tips.map((tip, i) => (
                      <TipItem key={i} text={tip} />
                    ))}
                  </FeedbackSection>
                )}

                {/* ── Reading-specific ── */}
                {feedback.completion_note && (
                  <FeedbackSection title="ملاحظة الإنجاز" color="emerald" single>
                    <p className="text-xs text-muted">{feedback.completion_note}</p>
                  </FeedbackSection>
                )}

                {feedback.reading_streak && (
                  <FeedbackSection title="سلسلة القراءة" color="gold" single>
                    <p className="text-xs text-muted">{feedback.reading_streak}</p>
                  </FeedbackSection>
                )}

                {feedback.next_level_suggestion && (
                  <FeedbackSection title="المستوى التالي" color="sky" single>
                    <p className="text-xs text-muted">{feedback.next_level_suggestion}</p>
                  </FeedbackSection>
                )}

                {/* ── Grammar-specific ── */}
                {feedback.grammar_focus && (
                  <FeedbackSection title="المحور النحوي" color="violet" single>
                    <p className="text-xs text-muted">{feedback.grammar_focus}</p>
                  </FeedbackSection>
                )}

                {feedback.consistency_note && (
                  <FeedbackSection title="ملاحظة الالتزام" color="gold" single>
                    <p className="text-xs text-muted">{feedback.consistency_note}</p>
                  </FeedbackSection>
                )}

                {/* ── Vocabulary-specific ── */}
                {feedback.word_usage_assessment && (
                  <FeedbackSection title="تقييم استخدام المفردات" color="sky" single>
                    <p className="text-xs text-muted">{feedback.word_usage_assessment}</p>
                  </FeedbackSection>
                )}

                {/* ── Universal: improvement tips ── */}
                {feedback.improvement_tips?.length > 0 && (
                  <FeedbackSection title="نصائح للتحسين" color="emerald">
                    {feedback.improvement_tips.map((tip, i) => (
                      <TipItem key={i} text={tip} />
                    ))}
                  </FeedbackSection>
                )}

                {feedback.suggestions?.length > 0 && !feedback.improvement_tips?.length && (
                  <FeedbackSection title="نصائح" color="emerald">
                    {feedback.suggestions.map((s, i) => (
                      <TipItem key={i} text={s} />
                    ))}
                  </FeedbackSection>
                )}

                {/* ── Approve buttons ── */}
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <button
                    onClick={handleApproveAndSend}
                    disabled={approving}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl transition-all duration-200 font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:translate-y-[-2px]"
                  >
                    {approving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    اعتماد وإرسال مباشرة
                  </button>
                  <button
                    onClick={handleApproveAndEdit}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl transition-all duration-200 font-medium hover:translate-y-[-2px]"
                  >
                    <PenLine size={14} />
                    اعتماد مع تعديل
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FeedbackSection({ title, color, single, children }) {
  const colors = {
    red: 'text-red-400',
    sky: 'text-sky-400',
    gold: 'text-gold-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
  }
  return (
    <div>
      <h4 className={`text-xs font-medium ${colors[color] || colors.sky} mb-2`}>{title}</h4>
      {single ? children : <div className="space-y-2">{children}</div>}
    </div>
  )
}

function TipItem({ text }) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted">
      <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}
