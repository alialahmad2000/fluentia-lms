import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

export default function AIWritingFeedback({ text, submissionId, assignmentType, existingFeedback }) {
  const [feedback, setFeedback] = useState(existingFeedback || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(!!existingFeedback)
  const [remaining, setRemaining] = useState(null)

  async function requestFeedback() {
    if (!text || text.trim().length < 10) {
      setError('النص قصير جداً للتحليل')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await invokeWithRetry('ai-writing-feedback', {
        body: { text, submission_id: submissionId, assignment_type: assignmentType },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.error) {
        const msg = typeof res.error === 'object' ? (res.error.message || JSON.stringify(res.error)) : String(res.error)
        throw new Error(msg)
      }
      const result = res.data

      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response')
      }

      if (result.error) {
        setError(result.error)
        return
      }
      if (result.feedback) {
        setFeedback(result.feedback)
        setExpanded(true)
      }
      if (result.remaining_this_month !== undefined) {
        setRemaining(result.remaining_this_month)
      }
    } catch (err) {
      console.error('[AIWritingFeedback]', err)
      setError('التقييم التلقائي غير متاح حالياً — سيراجع المدرب عملك مباشرة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Request button */}
      {!feedback && (
        <button
          onClick={requestFeedback}
          disabled={loading}
          className="btn-secondary text-sm py-2 flex items-center gap-2 w-full justify-center"
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
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Feedback display */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
          >
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-violet-400" />
                </div>
                <span className="text-sm font-semibold text-white">تقييم الذكاء الاصطناعي</span>
                {feedback.fluency_score && (
                  <span className="badge bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs">{feedback.fluency_score}/10</span>
                )}
              </div>
              {expanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
            </button>

            {expanded && (
              <div className="px-5 pb-5 space-y-4">
                {/* Overall feedback */}
                {feedback.overall_feedback && (
                  <p className="text-sm text-white/80">{feedback.overall_feedback}</p>
                )}

                {/* Grammar errors */}
                {feedback.grammar_errors?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-red-400 mb-2">أخطاء نحوية</h4>
                    <div className="space-y-2">
                      {feedback.grammar_errors.map((e, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="text-red-400 line-through" dir="ltr">{e.error}</span>
                            <span className="text-emerald-400" dir="ltr">{e.correction}</span>
                          </div>
                          {e.rule && <p className="text-muted mt-1">{e.rule}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vocabulary suggestions */}
                {feedback.vocabulary_suggestions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-sky-400 mb-2">اقتراحات مفردات</h4>
                    <div className="space-y-2">
                      {feedback.vocabulary_suggestions.map((v, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3 text-xs">
                          <span className="text-muted" dir="ltr">{v.original}</span>
                          {' → '}
                          <span className="text-sky-400 font-medium" dir="ltr">{v.better}</span>
                          {v.reason && <p className="text-muted mt-1">{v.reason}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structure */}
                {feedback.structure_assessment && (
                  <div>
                    <h4 className="text-xs font-medium text-gold-400 mb-1">تقييم البنية</h4>
                    <p className="text-xs text-muted">{feedback.structure_assessment}</p>
                  </div>
                )}

                {/* Tips */}
                {feedback.improvement_tips?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-emerald-400 mb-2">نصائح للتحسين</h4>
                    <ul className="space-y-1">
                      {feedback.improvement_tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted">
                          <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {remaining !== null && (
                  <p className="text-[10px] text-muted text-center">
                    متبقي {remaining} تحليل هذا الشهر
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
