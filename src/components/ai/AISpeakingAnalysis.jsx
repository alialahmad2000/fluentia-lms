import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

export default function AISpeakingAnalysis({ voiceUrl, submissionId, durationSeconds, existingTranscript, existingAnalysis }) {
  const [transcript, setTranscript] = useState(existingTranscript || '')
  const [analysis, setAnalysis] = useState(existingAnalysis || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(!!existingAnalysis)

  async function requestAnalysis() {
    setLoading(true)
    setError('')
    try {
      const res = await invokeWithRetry('whisper-transcribe', {
        body: { voice_url: voiceUrl, submission_id: submissionId, duration_seconds: durationSeconds },
        
      })

      if (res.error) throw new Error(res.error.message)
      const result = res.data

      if (result.error) {
        setError(result.error)
        return
      }
      if (result.transcript) setTranscript(result.transcript)
      if (result.analysis) {
        setAnalysis(result.analysis)
        setExpanded(true)
      }
    } catch (err) {
      setError('التفريغ النصي غير متاح — صوتك محفوظ وسيراجعه المدرب')
    } finally {
      setLoading(false)
    }
  }

  const confidenceColors = {
    'منخفضة': 'text-red-400',
    'متوسطة': 'text-yellow-400',
    'جيدة': 'text-emerald-400',
    'ممتازة': 'text-gold-400',
  }

  return (
    <div className="space-y-3">
      {!analysis && !transcript && (
        <button
          onClick={requestAnalysis}
          disabled={loading}
          className="btn-secondary text-sm py-2 flex items-center gap-2 w-full justify-center"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <><Mic size={14} className="text-violet-400" /> <Sparkles size={14} className="text-violet-400" /></>
          )}
          {loading ? 'جاري التحليل...' : 'تفريغ + تحليل بالذكاء الاصطناعي'}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="glass-card p-4">
          <p className="text-sm text-muted mb-1.5">التفريغ النصي:</p>
          <p className="text-sm text-white" dir="ltr">{transcript}</p>
        </div>
      )}

      {/* Analysis */}
      <AnimatePresence>
        {analysis && (
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
                <span className="text-sm font-semibold text-white">تحليل المحادثة</span>
                {analysis.overall_score && (
                  <span className="badge-violet text-xs">{analysis.overall_score}/10</span>
                )}
              </div>
              {expanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
            </button>

            {expanded && (
              <div className="px-5 pb-5 space-y-4">
                {/* Confidence */}
                {analysis.confidence_level && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">مستوى الثقة:</span>
                    <span className={`text-sm font-medium ${confidenceColors[analysis.confidence_level] || 'text-white'}`}>
                      {analysis.confidence_level}
                    </span>
                  </div>
                )}

                {/* Fluency */}
                {analysis.fluency_assessment && (
                  <div>
                    <h4 className="text-xs font-medium text-sky-400 mb-1">تقييم الطلاقة</h4>
                    <p className="text-xs text-muted">{analysis.fluency_assessment}</p>
                  </div>
                )}

                {/* Vocabulary range */}
                {analysis.vocabulary_range && (
                  <div>
                    <h4 className="text-xs font-medium text-gold-400 mb-1">تنوع المفردات</h4>
                    <p className="text-xs text-muted">{analysis.vocabulary_range}</p>
                  </div>
                )}

                {/* Grammar notes */}
                {analysis.grammar_notes?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-red-400 mb-2">ملاحظات نحوية</h4>
                    <div className="space-y-1">
                      {analysis.grammar_notes.map((n, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3 text-xs">
                          <p className="text-white">{n.issue}</p>
                          <p className="text-emerald-400 mt-0.5">{n.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {analysis.suggestions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-emerald-400 mb-1">نصائح</h4>
                    <ul className="space-y-1">
                      {analysis.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-muted">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
